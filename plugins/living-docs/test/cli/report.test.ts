import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatFindings } from '../../plugin/src/cli/report.ts'
import type { Finding } from '../../plugin/src/core/types.ts'

const FINDING: Finding = {
  ruleId: 'living-docs/frontmatter',
  file: 'docs/decisions/adr/ADR-0001-x.md',
  line: 6,
  severity: 'error',
  message: '`trigger` describes a cadence ("quarterly").',
  fix: 'Name the observable event.',
}

test('names file, line, rule and fix', () => {
  const output = formatFindings([FINDING])

  assert.match(output, /docs\/decisions\/adr\/ADR-0001-x\.md:6/)
  assert.match(output, /living-docs\/frontmatter/)
  assert.match(output, /error/)
  assert.match(output, /quarterly/)
  assert.match(output, /Name the observable event\./)
})

test('omits the line when it is 0', () => {
  const output = formatFindings([{ ...FINDING, line: 0 }])

  assert.match(output, /ADR-0001-x\.md\s/)
  assert.doesNotMatch(output, /ADR-0001-x\.md:0/)
})

test('summarizes the count by severity', () => {
  const output = formatFindings([FINDING, { ...FINDING, severity: 'warning' }])

  assert.match(output, /1 error/)
  assert.match(output, /1 warning/)
})

test('with no findings, reports that everything is fine', () => {
  assert.match(formatFindings([]), /no violation/i)
})
