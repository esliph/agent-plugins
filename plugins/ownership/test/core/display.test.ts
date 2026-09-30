import { test } from 'node:test'
import assert from 'node:assert/strict'
import { display } from '../../plugin/src/core/display.ts'

test('a string shows as itself, a scalar as its text', () => {
  assert.equal(display('ADR'), 'ADR')
  assert.equal(display(9), '9')
  assert.equal(display(true), 'true')
  assert.equal(display(null), 'null')
  assert.equal(display(undefined), 'undefined')
})

test('a map or a list read from YAML shows as written, never as [object Object]', () => {
  assert.equal(display({ a: 1 }), '{"a":1}')
  assert.equal(display(['x', 'y']), '["x","y"]')
})

test('the stderr of a process arrives as a Buffer and shows as its text', () => {
  assert.equal(display(Buffer.from('boom\n')), 'boom\n')
})
