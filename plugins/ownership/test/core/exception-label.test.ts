import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exceptionReasonFor } from '../../plugin/src/core/exception-label.ts'

test('recognizes the label with a reason and returns the reason', () => {
  assert.equal(exceptionReasonFor('Docs', ['fix: x', 'Docs: none — affects no doc']), 'affects no doc')
})

test('label without a reason does not count', () => {
  assert.equal(exceptionReasonFor('Docs', ['Docs: none —']), null)
})

test('without the label, returns null', () => {
  assert.equal(exceptionReasonFor('Docs', ['fix: x']), null)
})

test('accepts em dash, en dash, hyphen and colon as separator', () => {
  for (const separator of ['—', '–', '-', ':']) {
    assert.equal(exceptionReasonFor('Changelog', [`Changelog: none ${separator} test only`]), 'test only', separator)
  }
})
