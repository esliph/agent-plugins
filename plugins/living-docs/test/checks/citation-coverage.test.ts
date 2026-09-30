import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runValidate } from '../../plugin/src/cli/validate.ts'
import { RETIRED_IDS_PATH } from '../../plugin/src/ids/citations.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { Finding } from '../../plugin/src/core/types.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: docs/open-decisions.md
    owner: "@team"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map:
        resolved-by: "Resolved by"
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RN
      cited-by: ["test/**"]
`

/** The same configuration, but with RN lacking `cited-by` — phased installation. */
const CONFIG_WITHOUT_CITED_BY = CONFIG.replace('      cited-by: ["test/**"]\n', '')

function adr(id: string, status: string, extra: readonly string[] = []): string {
  return [
    '---',
    `id: ${id}`,
    `title: Decision ${id}`,
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Never. Immutable once accepted.',
    'last-reviewed: 2026-08-24',
    ...extra,
    '---',
    '',
    'body',
    '',
  ].join('\n')
}

function decisions(...rows: readonly string[]): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@team"',
    'trigger: Every time someone ran into a gap.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    '| ID | Gap | Status | Resolved by | Opened on |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}

function rules(...sections: readonly string[]): string {
  return [
    '---',
    'title: Business rules',
    'owner: "@team"',
    'trigger: On every new or changed rule.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    ...sections,
    '',
  ].join('\n')
}

function rn(id: string, status: string, extra: readonly string[] = []): string {
  return [`## ${id} — Rule ${id}`, '', `- **status:** ${status}`, ...extra, '', 'Statement.', ''].join('\n')
}

/** Only the living-docs/citation-coverage findings: the test repository is minimal on purpose. */
function ci3(root: string): Finding[] {
  return runValidate(root).findings.filter(finding => finding.ruleId === 'living-docs/citation-coverage')
}

const BASE = { [OWNERSHIP_FILE]: CONFIG, [RETIRED_IDS_PATH]: '' }

test('living-docs/citation-coverage: an open supersedes/superseded-by pair fails naming both sides', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft'),
      'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002', 'draft', ['supersedes: ADR-0001']),
    },
    root => {
      const findings = ci3(root)
      const open = findings.find(f => /Open pair/.test(f.message))

      assert.ok(open, JSON.stringify(findings, null, 2))
      assert.match(open.message, /ADR-0002/)
      assert.match(open.message, /ADR-0001/)
      assert.equal(open.file, 'docs/decisions/adr/ADR-0001-a.md')
    },
  )
})

test('living-docs/citation-coverage: a pair closed on both sides passes', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['superseded-by: ADR-0002']),
      'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002', 'draft', ['supersedes: ADR-0001']),
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('living-docs/citation-coverage: supersedes pointing to a nonexistent ID fails', () => {
  withTempRepo({ ...BASE, 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['supersedes: ADR-0009']) }, root => {
    assert.ok(ci3(root).some(f => /ADR-0009.*does not exist/.test(f.message)))
  })
})

test('living-docs/citation-coverage: DA resolved without resolved-by fails', () => {
  withTempRepo({ ...BASE, 'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | — | 2026-08-24 |') }, root => {
    const finding = ci3(root).find(f => /without saying what resolved it/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /DA-0001/)
  })
})

test('living-docs/citation-coverage: DA resolved whose ADR does not cite it back fails, and the finding points at the ADR', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | ADR-0001 | 2026-08-24 |'),
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['relates-to: []']),
    },
    root => {
      const finding = ci3(root).find(f => /does not cite it in/.test(f.message))

      assert.ok(finding)
      assert.equal(finding.file, 'docs/decisions/adr/ADR-0001-a.md')
    },
  )
})

test('living-docs/citation-coverage: DA resolved with the ADR citing it back passes', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | ADR-0001 | 2026-08-24 |'),
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['relates-to: [DA-0001]']),
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('living-docs/citation-coverage: ADR accepted without relates-to fails', () => {
  withTempRepo({ ...BASE, 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'accepted', ['relates-to: []']) }, root => {
    const finding = ci3(root).find(f => /accepted.*without/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /ADR-0001/)
  })
})

test('living-docs/citation-coverage: RN active without a citation in cited-by fails naming the globs', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'active')) }, root => {
    const finding = ci3(root).find(f => /is not cited/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /test\/\*\*/)
  })
})

test('living-docs/citation-coverage: RN active cited by a test passes', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/requirements/rules.md': rules(rn('RN-0001', 'active')),
      'test/rule.test.ts': "test('RN-0001: the rule holds', () => {});\n",
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('living-docs/citation-coverage: RN draft is not required to be cited — enforcement starts at active', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'draft')) }, root => {
    assert.deepEqual(ci3(root), [])
  })
})

test('living-docs/citation-coverage: RN active in an artifact without cited-by is not enforced', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG_WITHOUT_CITED_BY,
      [RETIRED_IDS_PATH]: '',
      'docs/requirements/rules.md': rules(rn('RN-0001', 'active')),
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('living-docs/citation-coverage: a citation inside the own file of the artifact does not count as coverage', () => {
  withTempRepo(
    {
      ...BASE,
      // The artifact lives under test/**, so it matches the cited-by glob itself.
      [OWNERSHIP_FILE]: CONFIG.replace('docs/requirements/rules.md', 'test/rules.md'),
      'test/rules.md': rules(rn('RN-0001', 'active'), '', 'RN-0001 itself is cited here.'),
    },
    root => {
      assert.ok(ci3(root).some(f => /is not cited/.test(f.message)))
    },
  )
})

test('living-docs/citation-coverage: RN-014 and RN-0014 are the same ID for coverage purposes', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/requirements/rules.md': rules(rn('RN-0014', 'active')),
      'test/rule.test.ts': "test('RN-014: repadding does not create another ID', () => {});\n",
    },
    root => {
      assert.deepEqual(
        ci3(root).filter(f => /is not cited/.test(f.message)),
        [],
      )
    },
  )
})

test('living-docs/citation-coverage: RN revoked without revoked-by fails', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'revoked')) }, root => {
    const finding = ci3(root).find(f => /revoked-by/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /RN-0001/)
  })
})

test('living-docs/citation-coverage: a revocation with a pair closed on both sides passes', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/requirements/rules.md': rules(rn('RN-0001', 'revoked', ['- **revoked-by:** RN-0002']), rn('RN-0002', 'draft', ['- **revokes:** RN-0001'])),
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('living-docs/citation-coverage: every finding is an error, never a warning', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | — | 2026-08-24 |'),
      'docs/requirements/rules.md': rules(rn('RN-0001', 'active'), rn('RN-0002', 'revoked')),
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'accepted', ['relates-to: []']),
    },
    root => {
      const findings = ci3(root)

      assert.ok(findings.length >= 4, JSON.stringify(findings, null, 2))
      for (const finding of findings) {
        assert.equal(finding.severity, 'error', `living-docs/citation-coverage does not warn, it fails: ${finding.message}`)
      }
    },
  )
})

const CONFIG_WITHOUT_FIELD_MAP = CONFIG.replace('      field-map:\n        resolved-by: "Resolved by"\n', '')

test('RN-0039: a resolved decision in a table without the canonical column points to field-map', () => {
  const tree = {
    [OWNERSHIP_FILE]: CONFIG_WITHOUT_FIELD_MAP,
    'docs/open-decisions.md': decisions('| DA-0001 | Gap | resolved | ADR-0001 | 2026-08-24 |'),
    'docs/decisions/adr/ADR-0001-x.md': adr('ADR-0001', 'accepted', ['relates-to: [DA-0001]']),
  }

  withTempRepo(tree, root => {
    const found = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === 'docs/open-decisions.md')

    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.match(found[0]?.fix ?? '', /field-map/)
    assert.match(found[0]?.fix ?? '', /resolved-by/)
  })
})

test('RN-0039: a revoked rule in a sections file without the bullet gets no field-map hint', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'revoked')) }, root => {
    const finding = ci3(root).find(f => /revoked-by/.test(f.message))

    assert.ok(finding, JSON.stringify(ci3(root), null, 2))
    assert.doesNotMatch(finding.fix, /field-map/)
  })
})

test('RN-0039: an existing but empty column is an empty value, with no field-map hint', () => {
  const tree = {
    [OWNERSHIP_FILE]: CONFIG,
    'docs/open-decisions.md': decisions('| DA-0001 | Gap | resolved | — | 2026-08-24 |'),
  }

  withTempRepo(tree, root => {
    const found = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === 'docs/open-decisions.md')

    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.doesNotMatch(found[0]?.fix ?? '', /field-map/)
  })
})
