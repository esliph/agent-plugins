import { test } from 'node:test'
import assert from 'node:assert/strict'

test('the runtime runs TypeScript without a build step', () => {
  const value: { ok: boolean } = { ok: true }

  assert.equal(value.ok, true)
})
