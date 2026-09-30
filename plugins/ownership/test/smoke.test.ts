import { test } from 'node:test'
import assert from 'node:assert/strict'

test('the package loads without an import error', async () => {
  const mod = await import('../plugin/src/index.ts')

  assert.equal(typeof mod, 'object')
})
