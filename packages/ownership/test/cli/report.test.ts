import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatFindings } from '../../src/cli/report.ts'

test('no findings, single message', () => {
  assert.equal(formatFindings([]), 'ownership: no violations found.')
})

test('with findings, lists location, rule, severity, message and fix, with the total at the end', () => {
  const text = formatFindings([{ ruleId: 'ownership/x', file: 'a.md', line: 3, severity: 'error', message: 'm', fix: 'f' }])

  assert.match(text, /a\.md:3/)
  assert.match(text, /ownership\/x/)
  assert.match(text, /1 error/)
})
