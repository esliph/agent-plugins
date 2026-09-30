import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coreChecks, diffChecks, resolveOwnership } from '@esliph/ownership'
import type { Finding as CoreFinding } from '@esliph/ownership'
import { loadLivingDocsConfig } from '../../plugin/src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../plugin/src/docs/collect.ts'
import { validateChecks } from '../../plugin/src/checks/registry.ts'
import type { Finding } from '../../plugin/src/core/types.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const TODAY = '2026-09-28'

function coreFindings(root: string, diff: { base: string; changed: string[]; messages: string[] }): CoreFinding[] {
  const config = resolveOwnership(root)!
  const context = { root, config, today: TODAY }

  return [...coreChecks(() => 'generator output\n'), ...diffChecks(diff)].flatMap(check => check.run(context))
}

function livingDocsFindings(root: string, diff: { base: string; changed: string[]; messages: string[] }): Finding[] {
  const config = loadLivingDocsConfig(root)
  const context = { root, config, docs: collectArtifacts(root, config), documents: collectDocuments(root, config), today: TODAY }

  return validateChecks({ ...diff, edits: [] }).flatMap(check => check.run(context))
}

const BASE_OWNED = `version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: '@team'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: docs/definition-of-done.md
    owner: '@team'
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
  - path: CHANGELOG.md
    owner: '@team'
    living-docs: { audience: external }
  - path: .ownership.yml
    owner: '@team'
    living-docs: {}
  - path: CODEOWNERS
    owner: '@team'
  - path: out.md
    owner: '@team'
`

const ADR_OK = "---\nid: ADR-0001\ntitle: Decision\nstatus: draft\nowner: '@team'\ntrigger: Never.\nlast-reviewed: 2026-09-01\nrelates-to: []\n---\n\n# ADR-0001\n"

test('each moved rule is reported by the core, and living-docs stays silent about it', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `${BASE_OWNED}generated:
  - path: out.md
    command: gen
watches:
  - code: 'src/**'
    doc: CHANGELOG.md
    consumer-visible: true
`,
      CODEOWNERS: 'docs/ @team\nCHANGELOG.md @team\n.ownership.yml @team\nCODEOWNERS @team\nout.md @team\n',
      // declared-state: status outside states; owner without @.
      'docs/decisions/adr/ADR-0001-a.md': ADR_OK.replace('status: draft', 'status: approved').replace("owner: '@team'", 'owner: team'),
      'docs/definition-of-done.md': "---\ntitle: DoD\nowner: '@team'\ntrigger: When what counts as done changes.\nlast-reviewed: 2026-09-01\n---\n\n- [ ] Something — verification: human.\n",
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
      // generated-drift: diverges from the generator output.
      'out.md': 'hand-edited\n',
      // owner-coverage: file without an owner.
      'stray.txt': 'x\n',
      'src/a.ts': 'export {}\n',
    },
    root => {
      // watch-satisfied and consumer-change-logged: the diff touches src/ without the CHANGELOG.
      const diff = { base: 'main', changed: ['src/a.ts'], messages: ['feat: x'] }
      const core = new Set(coreFindings(root, diff).map(finding => finding.ruleId))

      for (const rule of ['ownership/declared-state', 'ownership/generated-drift', 'ownership/owner-coverage', 'ownership/watch-satisfied', 'ownership/consumer-change-logged']) {
        assert.ok(core.has(rule), `${rule} should report the planted violation`)
      }

      // living-docs may find other things in this fixture (it is not an
      // exemplary repository); it must find nothing where the moved violations
      // were planted. Lines 4 and 5 of the ADR are `status` and `owner`.
      const living = livingDocsFindings(root, diff)
      const planted = new Set(['out.md', 'stray.txt', 'src/a.ts', 'CHANGELOG.md'])

      assert.deepEqual(
        living.filter(finding => planted.has(finding.file)),
        [],
        'living-docs must not report what belongs to the core',
      )
      assert.deepEqual(
        living.filter(finding => finding.file === 'docs/decisions/adr/ADR-0001-a.md' && (finding.line === 4 || finding.line === 5)),
        [],
        'status outside states and owner without @ belong to ownership/declared-state',
      )
    },
  )
})

test('each rule that stayed is reported by living-docs, and the core stays silent about it', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `${BASE_OWNED}`,
      CODEOWNERS: 'docs/ @team\nCHANGELOG.md @team\n.ownership.yml @team\nCODEOWNERS @team\nout.md @team\n',
      'out.md': 'x\n',
      // frontmatter: empty trigger.
      'docs/decisions/adr/ADR-0001-a.md': ADR_OK.replace('trigger: Never.', "trigger: ''"),
      // done-verifiable: item with no named verification.
      'docs/definition-of-done.md': "---\ntitle: DoD\nowner: '@team'\ntrigger: When what counts as done changes.\nlast-reviewed: 2026-09-01\n---\n\n- [ ] Something with nobody to verify.\n",
      // external-audience and links: artifact ID and broken link in external text.
      'CHANGELOG.md': '# Changelog\n\nSee ADR-0001 and [this](does-not-exist.md).\n',
    },
    root => {
      const diff = { base: 'main', changed: [], messages: [] }
      const living = new Set(livingDocsFindings(root, diff).map(finding => finding.ruleId))

      for (const rule of ['living-docs/frontmatter', 'living-docs/done-verifiable', 'living-docs/links', 'living-docs/external-audience']) {
        assert.ok(living.has(rule), `${rule} should report the planted violation`)
      }
      assert.deepEqual(
        coreFindings(root, diff).map(finding => finding.ruleId),
        [],
        'the core must not report what belongs to living-docs',
      )
    },
  )
})

test('the only overlap is deliberate: a duplicate key in a collection belongs to the core and also to id-integrity', () => {
  // `living-docs/id-integrity` also covers sequence and citation, and is not among
  // the moved rules: the ID duplicate remains in both plugins. This test
  // pins the overlap so that it is seen, and not pruned by mistake.
  const table = [
    '| ID | Gap | Status |',
    '| --- | --- | --- |',
    '| DA-0001 | First | open |',
    '| DA-0001 | Repeated | open |',
    '',
  ].join('\n')

  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: '@team'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
  - path: .ownership.yml
    owner: '@team'
    living-docs: {}
  - path: CODEOWNERS
    owner: '@team'
`,
      CODEOWNERS: 'docs/ @team\n.ownership.yml @team\nCODEOWNERS @team\n',
      'docs/open-decisions.md': table,
    },
    root => {
      const diff = { base: 'main', changed: [], messages: [] }

      assert.ok(coreFindings(root, diff).some(finding => finding.ruleId === 'ownership/declared-state' && /DA-0001/.test(finding.message)))
      assert.ok(livingDocsFindings(root, diff).some(finding => finding.ruleId === 'living-docs/id-integrity' && /DA-0001/.test(finding.message)))
    },
  )
})
