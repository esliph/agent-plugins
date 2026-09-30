import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runValidate } from '../../src/cli/validate.ts'
import { loadLivingDocsConfig, primaryArtifact } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const ADR_ENTRY = `  - path: docs/decisions/adr/
    owner: '@team'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
`

const ROOT_FILE = `version: 2
plugins: [living-docs]
include: [plugins/core/]
owned:
${ADR_ENTRY}  - path: .ownership.yml
    owner: '@team'
    living-docs: {}
`

function childFile(citedBy: string): string {
  return `version: 2
owned:
${ADR_ENTRY}  - path: docs/requirements/rules.md
    owner: '@team'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN, cited-by: ['${citedBy}'] }
  - path: .ownership.yml
    owner: '@team'
    living-docs: {}
`
}

const RULES = '# Rules\n\n## RN-0001 — A rule\n\n- **status:** active\n\nThe rule.\n'

function adr(id: string): string {
  return `---\nid: ${id}\ntitle: Decision\nstatus: draft\nowner: '@team'\ntrigger: Never.\nlast-reviewed: 2026-09-29\nrelates-to: []\nsupersedes: null\nsuperseded-by: null\n---\n\n# ${id} — Decision\n`
}

function base(extra: Record<string, string>): Record<string, string> {
  return {
    '.ownership.yml': ROOT_FILE,
    'plugins/core/.ownership.yml': childFile('plugins/core/test/**'),
    'plugins/core/docs/requirements/rules.md': RULES,
    'plugins/core/test/a.test.ts': '// RN-0001\nexport {}\n',
    ...extra,
  }
}

function findings(root: string, ruleId: string) {
  return runValidate(root).findings.filter(finding => finding.ruleId === ruleId)
}

test('RN-0040: the same id-prefix in the root file and in an included file is accepted, one rule per entry', () => {
  withTempRepo(base({}), root => {
    const config = loadLivingDocsConfig(root)

    assert.deepEqual(
      config.artifacts.filter(artifact => artifact.idPrefix === 'ADR').map(artifact => artifact.path),
      ['docs/decisions/adr/', 'plugins/core/docs/decisions/adr/'],
    )
  })
})

test('RN-0040: numbers of one prefix split across two entries form one sequence with no gap', () => {
  withTempRepo(
    base({ 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'), 'plugins/core/docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002') }),
    root => {
      assert.deepEqual(findings(root, 'living-docs/id-integrity'), [])
    },
  )
})

test('RN-0040: a gap is judged across the entries of a prefix', () => {
  withTempRepo(
    base({ 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'), 'plugins/core/docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003') }),
    root => {
      assert.ok(findings(root, 'living-docs/id-integrity').some(finding => /ADR-0002/.test(finding.message)))
    },
  )
})

test('RN-0040: the same number taken in two entries is a duplicate', () => {
  withTempRepo(
    base({ 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'), 'plugins/core/docs/decisions/adr/ADR-0001-b.md': adr('ADR-0001') }),
    root => {
      assert.ok(findings(root, 'living-docs/id-integrity').some(finding => /Duplicate ID ADR-0001/.test(finding.message)))
    },
  )
})

test('RN-0040: role stays unique across ownership files', () => {
  const root = ROOT_FILE.replace('    living-docs: {}\n', "    living-docs: {}\n  - path: CLAUDE.md\n    owner: '@team'\n    living-docs: { role: agent-contract }\n")
  const child = childFile('plugins/core/test/**') + "  - path: CLAUDE.md\n    owner: '@team'\n    living-docs: { role: agent-contract }\n"

  withTempRepo({ '.ownership.yml': root, 'plugins/core/.ownership.yml': child }, dir => {
    assert.throws(() => loadLivingDocsConfig(dir), /role "agent-contract" declared in two documents/)
  })
})

test('RN-0040: primaryArtifact prefers the entry of the root file, then the first entry, then none', () => {
  withTempRepo(base({}), root => {
    const config = loadLivingDocsConfig(root)

    assert.equal(primaryArtifact(config, 'ADR')?.path, 'docs/decisions/adr/')
    assert.equal(primaryArtifact(config, 'RN')?.path, 'plugins/core/docs/requirements/rules.md')
    assert.equal(primaryArtifact(config, 'TDR'), null)
  })
})

test('RN-0040: a cited-by glob in an included file is read from the repository root', () => {
  withTempRepo(base({}), root => {
    assert.deepEqual(findings(root, 'living-docs/citation-coverage'), [], 'repository-relative glob finds plugins/core/test/a.test.ts')
  })
  withTempRepo(base({ 'plugins/core/.ownership.yml': childFile('test/**') }), root => {
    assert.ok(
      findings(root, 'living-docs/citation-coverage').some(finding => /RN-0001/.test(finding.message)),
      'a base-relative glob must not silently reach plugins/core/test/',
    )
  })
})
