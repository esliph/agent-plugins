import { test } from 'node:test'
import assert from 'node:assert/strict'

test('o pacote carrega sem erro de import', async () => {
  const mod = await import('../src/index.ts')

  assert.equal(typeof mod, 'object')
})
