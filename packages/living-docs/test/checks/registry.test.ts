import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECK_CATALOG, validateChecks } from '../../src/checks/registry.ts'

test('RF-0006, RF-0008 and RF-0010: the catalog covers exactly the checks that exist', () => {
  const actual = validateChecks().map(check => `${check.id}|${check.name}`).sort()
  const cataloged = CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}`).sort()

  assert.deepEqual(cataloged, actual, 'catalog and registry diverged — the generated contract would lie')
})

test('the catalog is read by people: it follows the order the checks run in', () => {
  assert.deepEqual(
    CHECK_CATALOG.map(entry => entry.id),
    validateChecks().map(check => check.id),
  )
})

test('RF-0006: every catalog item says when it fails and by which command it runs', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} has no written failure condition`)
    assert.match(entry.command, /^living-docs validate( --base <ref>)?$/, `${entry.id} has a strange command`)
  }
})

test('ADR-0005, ADR-0006 and ADR-0010: each check runs in the command the catalog names', () => {
  const expected: Record<string, string> = {
    'living-docs/frontmatter': 'living-docs validate',
    'living-docs/id-integrity': 'living-docs validate',
    'living-docs/citation-coverage': 'living-docs validate',
    'living-docs/staleness': 'living-docs validate',
    'living-docs/agent-contract-duplication': 'living-docs validate',
    'living-docs/done-verifiable': 'living-docs validate',
    'living-docs/open-decision-claim': 'living-docs validate --base <ref>',
    'living-docs/links': 'living-docs validate',
    'living-docs/commit-discipline': 'living-docs validate',
    'living-docs/trigger-routing': 'living-docs validate',
    'living-docs/external-audience': 'living-docs validate',
  }

  for (const entry of CHECK_CATALOG) {
    assert.equal(entry.command, expected[entry.id], `${entry.id} is in the wrong command`)
  }
  assert.equal(CHECK_CATALOG.length, Object.keys(expected).length, 'a new check with no declared expected command')
})

test('RF-0011: validateChecks receives the diff by parameter, and without it the list is the same', () => {
  const withoutDiff = validateChecks().map(check => check.id)
  const withDiff = validateChecks({ base: 'origin/master', changed: [], messages: [], edits: [] }).map(check => check.id)

  assert.deepEqual(withoutDiff, withDiff, 'the diff half is behavior of living-docs/open-decision-claim and living-docs/commit-discipline, not an extra check')
  assert.deepEqual(withoutDiff, ['living-docs/frontmatter', 'living-docs/id-integrity', 'living-docs/citation-coverage', 'living-docs/staleness', 'living-docs/agent-contract-duplication', 'living-docs/done-verifiable', 'living-docs/open-decision-claim', 'living-docs/links', 'living-docs/commit-discipline', 'living-docs/trigger-routing', 'living-docs/external-audience'])
})
