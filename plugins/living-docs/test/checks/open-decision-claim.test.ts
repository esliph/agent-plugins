import { test } from 'node:test'
import assert from 'node:assert/strict'
import { docsExceptionReason, livingDocsOpenDecisionClaim } from '../../plugin/src/checks/open-decision-claim.ts'
import { collectArtifacts, collectDocuments } from '../../plugin/src/docs/collect.ts'
import { OWNERSHIP_FILE, configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

/** The ownership map, with the DA artifact declared in `owned`. */
const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: .ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
    living-docs: {}
  - path: docs/open-decisions.md
    owner: "@team"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map:
        blocks: "Blocks"
        gap: "Gap"
`

const DECISIONS = [
  '---',
  'title: Open Decisions',
  'owner: "@team"',
  'trigger: Every time someone ran into a gap.',
  'last-reviewed: 2026-08-27',
  '---',
  '',
  '| ID | Gap | Status | Blocks | Opened on |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | How to round cents | open | `src/billing/**` | 2026-08-27 |',
  '',
].join('\n')

const TREE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/open-decisions.md': DECISIONS,
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

test('ADR-0010: a label with no reason is not an exception', () => {
  assert.equal(docsExceptionReason(['Docs: none — the rule did not change']), 'the rule did not change')
  assert.equal(docsExceptionReason(['Docs: none']), null)
  assert.equal(docsExceptionReason(['docs: NONE — lowercase too']), 'lowercase too')
  assert.equal(docsExceptionReason(['Changelog: none — another label']), null)
})

test('RN-0026: a diff that touches a path claimed by an open decision fails', () => {
  withTempRepo(TREE, root => {
    const diff = { base: 'origin/master', changed: ['src/billing/fee.ts'], messages: ['feat: cents'] }
    const findings = livingDocsOpenDecisionClaim(diff).run(contextFor(root))
    const found = findings.find(finding => /DA-0001/.test(finding.message))

    assert.ok(found, JSON.stringify(findings, null, 2))
    assert.equal(found.ruleId, 'living-docs/open-decision-claim')
    assert.equal(found.severity, 'error')
    assert.equal(found.file, 'docs/open-decisions.md')
    assert.match(found.message, /src\/billing\/fee\.ts/)
    assert.match(found.message, /cents/, 'the gap must be named')
    assert.match(found.fix, /decision-recorder/)
    assert.match(found.fix, /Docs: none/)
  })
})

test('RN-0026: without a diff, the check does not run — inventing a diff would be a finding about another branch', () => {
  withTempRepo(TREE, root => {
    assert.deepEqual(livingDocsOpenDecisionClaim().run(contextFor(root)), [])
  })
})

test('RN-0026: the written reason releases the diff', () => {
  withTempRepo(TREE, root => {
    const withReason = {
      base: 'origin/master',
      changed: ['src/billing/fee.ts'],
      messages: ['refactor: rename internal\n\nDocs: none — this is not the implementation of the missing rule'],
    }

    assert.deepEqual(livingDocsOpenDecisionClaim(withReason).run(contextFor(root)), [])
  })
})
