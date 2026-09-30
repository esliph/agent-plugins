import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runValidate } from '../../plugin/src/cli/validate.ts'
import { OwnershipError } from '../../plugin/src/config/ownership.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: .ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
    living-docs: {}
`

const GOOD = [
  '---',
  'id: ADR-0001',
  'title: Event queue',
  'status: draft',
  'owner: "@team"',
  'trigger: Never. Immutable once accepted.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '## Context',
].join('\n')

test('RF-0001: a conforming repository exits with 0', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/decisions/adr/ADR-0001-a.md': GOOD }, root => {
    const result = runValidate(root)

    assert.deepEqual(result.findings, [])
    assert.equal(result.exitCode, 0)
    // RNF-0005: the result carries what it measured, and the measure is not estimated.
    assert.ok(result.elapsedMs > 0, 'elapsedMs came back zeroed — the clock was not read')
  })
})

test('RF-0001: an error from any check leads to exit 1', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0001-a.md': GOOD.replace('trigger: Never. Immutable once accepted.', "trigger: ''"),
    },
    root => {
      const result = runValidate(root)

      assert.equal(result.errors, 1)
      assert.equal(result.exitCode, 1)
      assert.equal(result.findings[0]?.ruleId, 'living-docs/frontmatter')
    },
  )
})

test('runs every check in the registry, not just the first', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0001-a.md': GOOD,
      'docs/decisions/adr/ADR-0003-c.md': GOOD.replace('ADR-0001', 'ADR-0003'),
    },
    root => {
      const result = runValidate(root)

      assert.ok(result.findings.some(finding => finding.ruleId === 'living-docs/id-integrity'))
    },
  )
})

test('a missing ownership file propagates OwnershipError', () => {
  withTempRepo({ 'README.md': '' }, root => {
    assert.throws(() => runValidate(root), OwnershipError)
  })
})

test('RF-0010: a warning is reported and does not change the exit code', () => {
  const old = GOOD.replace('last-reviewed: 2026-08-21', 'last-reviewed: 2020-01-01')

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/decisions/adr/ADR-0001-a.md': old }, root => {
    const result = runValidate(root)

    assert.equal(result.warnings, 1, JSON.stringify(result.findings, null, 2))
    assert.equal(result.errors, 0)
    assert.equal(result.exitCode, 0, 'living-docs/staleness warns; a warning does not fail (spec §9)')
    assert.equal(result.findings[0]?.ruleId, 'living-docs/staleness')
  })
})
