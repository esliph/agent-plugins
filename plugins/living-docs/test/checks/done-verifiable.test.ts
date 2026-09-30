import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dodItemsWithoutVerification, livingDocsDoneVerifiable } from '../../plugin/src/checks/done-verifiable.ts'
import { collectArtifacts, collectDocuments } from '../../plugin/src/docs/collect.ts'
import { OWNERSHIP_FILE, configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: .ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
    living-docs: {}
  - path: CLAUDE.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: { role: agent-contract }
  - path: docs/definition-of-done.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
`

const DOD = ['# Definition of Done', '', '- [ ] Tests pass — verification: `living-docs/frontmatter`.', ''].join('\n')

const TREE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'docs/definition-of-done.md': DOD,
  'CLAUDE.md': '# Agent contract\n',
}

function contextFor(root: string) {
  const config = configFrom(OWNERSHIP)

  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-27',
  }
}

test('RN-0017: a DoD item with no named verification fails, with the line and the check name', () => {
  const weakDod = `${DOD}- [ ] The code looks nice.\n`

  withTempRepo({ ...TREE, 'docs/definition-of-done.md': weakDod }, root => {
    const findings = livingDocsDoneVerifiable.run(contextFor(root))
    const found = findings.find(finding => finding.file === 'docs/definition-of-done.md')

    assert.ok(found)
    assert.equal(found.ruleId, 'living-docs/done-verifiable')
    assert.equal(found.line, 4)
    assert.match(found.message, /verification/)
    assert.match(found.fix, /plugin\/name/)
  })
})

test('dodItemsWithoutVerification accepts a check ID, a hook ID and the human mark', () => {
  const source = [
    '- [ ] with check — verification: `living-docs/citation-coverage`.',
    '- [x] with hook — verification: `living-docs/append-only`.',
    '- [ ] with core check — verification: `ownership/owner-coverage`.',
    '- [ ] with person — verification: human.',
    '- [ ] with nothing.',
    'not a checkbox item.',
  ].join('\n')

  assert.deepEqual(
    dodItemsWithoutVerification(source).map(item => item.line),
    [5],
  )
  // No alias for the old name: the number is no longer a verification.
  assert.equal(dodItemsWithoutVerification('- [ ] Something — verification: `CI-3`.').length, 1)
})

test('RN-0017: a format example inside a fence is not an item — the item outside still is', () => {
  const source = [
    '# Definition of Done',
    '',
    'The format of each checkbox:',
    '',
    '```markdown',
    '- [ ] <the item> — verification: <plugin/name | human>',
    '```',
    '',
    '- [ ] Tests pass — verification: `living-docs/frontmatter`.',
    '- [ ] The code looks nice.',
  ].join('\n')

  assert.deepEqual(
    dodItemsWithoutVerification(source).map(item => item.line),
    [10],
    'only the real item, outside the fence, is a finding',
  )
})

test('RN-0017: the fence goes and the ID in backticks stays — in the whole check', () => {
  const dodWithExample = [
    '# Definition of Done',
    '',
    '```markdown',
    '- [ ] <the item> — verification: <plugin/name | human>',
    '```',
    '',
    '- [ ] Tests pass — verification: `living-docs/frontmatter`.',
    '',
  ].join('\n')

  withTempRepo({ ...TREE, 'docs/definition-of-done.md': dodWithExample }, root => {
    assert.deepEqual(livingDocsDoneVerifiable.run(contextFor(root)), [])
  })
})

test('RN-0017, RN-0038: the human-verification marker is the fixed word `human`, in any case', () => {
  const source = [
    '- [ ] reviewed by a person — verification: human.',
    '- [ ] reviewed by a person — verification: Human.',
    '- [ ] reviewed by a person — verification: HUMAN, at the release.',
    '- [ ] reviewed by humans.',
  ].join('\n')

  assert.deepEqual(
    dodItemsWithoutVerification(source).map(item => item.line),
    [4],
  )
})

test('RN-0017: the old localized marker is no longer the marker', () => {
  // Built from parts so the repository keeps a single non-English fixture.
  const localized = ['hum', 'ana'].join('')

  assert.equal(dodItemsWithoutVerification(`- [ ] Something — verification: ${localized}.`).length, 1)
})
