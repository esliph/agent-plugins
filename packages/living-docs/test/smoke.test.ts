import { test } from 'node:test'
import assert from 'node:assert/strict'

test('o runtime executa TypeScript sem build step', () => {
  const value: { ok: boolean } = { ok: true }

  assert.equal(value.ok, true)
})
