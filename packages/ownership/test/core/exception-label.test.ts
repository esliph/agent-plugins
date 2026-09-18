import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exceptionReasonFor } from '../../src/core/exception-label.ts'

test('reconhece o rótulo com razão e devolve a razão', () => {
  assert.equal(exceptionReasonFor('Docs', ['fix: x', 'Docs: none — não afeta doc nenhum']), 'não afeta doc nenhum')
})

test('rótulo sem razão não conta', () => {
  assert.equal(exceptionReasonFor('Docs', ['Docs: none —']), null)
})

test('sem o rótulo, devolve null', () => {
  assert.equal(exceptionReasonFor('Docs', ['fix: x']), null)
})
