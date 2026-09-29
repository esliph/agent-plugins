import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideSessionInventory } from '../../src/hooks/session-inventory.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const TODAY = '2026-08-27'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
living-docs:
  stale-after-months: 6
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
  - path: docs/decisions/debt/
    owner: "@team"
    skill: decision-recorder
    states: [open, paid, accepted-permanently]
    living-docs: { id-prefix: TDR }
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: {}
`

const OPEN_DECISIONS = [
  '---',
  'title: Open Decisions',
  'owner: "@team"',
  'trigger: Every time someone bumped into a gap.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '| ID | Gap | Status | Resolved by | Opened on |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | How to declare X | open | — | 2026-08-01 |',
  '',
].join('\n')

const REVOKED_RULES = [
  '---',
  'title: Rules',
  'owner: "@team"',
  'trigger: On every new rule.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '## RN-0001 — A rule',
  '',
  '- **status:** revoked',
  '- **revoked-by:** RN-0002',
  '',
].join('\n')

const DEBT = [
  '---',
  'id: TDR-0001',
  'title: Shortcut',
  'status: open',
  'owner: "@team"',
  'trigger: When the trigger below is met.',
  'last-reviewed: 2026-08-01',
  'pay-when:',
  "  pattern: '^- \\*\\*status:\\*\\* revoked'",
  '  paths: ["docs/requirements/**"]',
  '---',
  '',
  '# TDR-0001 — Shortcut',
  '',
].join('\n')

const TREE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/open-decisions.md': OPEN_DECISIONS,
  'docs/requirements/rules.md': REVOKED_RULES,
  'docs/decisions/debt/TDR-0001-x.md': DEBT,
  'CONTRIBUTING.md': '---\ntitle: How\nowner: "@team"\ntrigger: when the process changes\nlast-reviewed: 2024-01-01\n---\n\n# How\n',
}

test('criterion 8: the inventory reaches the context without anyone looking for it', () => {
  withTempRepo(TREE, root => {
    const decision = decideSessionInventory({ root, hostRoots: [root] }, TODAY)

    assert.equal(decision.action, 'inform')

    const context = decision.action === 'inform' ? decision.context : ''

    assert.match(context, /living-docs\/session-inventory/)
    assert.match(context, /DA-0001/, 'open decision')
    assert.match(context, /TDR-0001/, 'debt with its trigger met')
    assert.match(context, /CONTRIBUTING\.md/, 'expired document')
    assert.match(context, /docs\/decisions\/adr\//, 'artifact declared and absent')
  })
})

test('RN-0022: it is context injection, never a permission decision', () => {
  withTempRepo(TREE, root => {
    const decision = decideSessionInventory({ root, hostRoots: [root] }, TODAY)
    const context = decision.action === 'inform' ? decision.context : ''

    assert.doesNotMatch(context, /\bdeny\b/)
    assert.doesNotMatch(context, /permissionDecision/)
    assert.match(context, /blocks|context/i)
  })
})

test('RN-0022: the inventory is short — a long list shows up truncated with the count', () => {
  const many = [
    ...OPEN_DECISIONS.split('\n').slice(0, -1),
    ...Array.from({ length: 9 }, (_, i) => `| DA-${String(i + 2).padStart(4, '0')} | Gap ${i} | open | — | 2026-08-01 |`),
    '',
  ].join('\n')

  withTempRepo({ ...TREE, 'docs/open-decisions.md': many }, root => {
    const decision = decideSessionInventory({ root, hostRoots: [root] }, TODAY)
    const context = decision.action === 'inform' ? decision.context : ''

    assert.match(context, /\(10\)/, 'the total count shows up')
    assert.equal((context.match(/DA-\d{4}/g) ?? []).length <= 6, true, 'only the first ones get in')
  })
})

test('RNF-0001: an unreadable configuration silences the hook instead of blowing up', () => {
  withTempRepo({ [OWNERSHIP_FILE]: 'version: 99\n' }, root => {
    assert.deepEqual(decideSessionInventory({ root, hostRoots: [root] }, TODAY), { action: 'silent' })
  })
  withTempRepo({ 'README.md': '' }, root => {
    assert.deepEqual(decideSessionInventory({ root, hostRoots: [root] }, TODAY), { action: 'silent' })
  })
})

test('living-docs/session-inventory does not reimplement living-docs/staleness: with no due debt and no old doc, the two lines do not show up', () => {
  const withoutDebt = { ...TREE }

  delete (withoutDebt as Record<string, string>)['docs/decisions/debt/TDR-0001-x.md']
  withoutDebt['CONTRIBUTING.md'] = '---\ntitle: How\nowner: "@team"\ntrigger: when the process changes\nlast-reviewed: 2026-08-20\n---\n\n# How\n'

  withTempRepo(withoutDebt, root => {
    const decision = decideSessionInventory({ root, hostRoots: [root] }, TODAY)
    const context = decision.action === 'inform' ? decision.context : ''

    assert.doesNotMatch(context, /payment trigger met/)
    assert.doesNotMatch(context, /Expired document/)
    assert.match(context, /DA-0001/, 'the rest of the inventory carries on')
  })
})
