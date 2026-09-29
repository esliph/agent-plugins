import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toRepoPath } from '../../../src/hooks/lib/paths.ts'

test('caminho relativo passa direto', () => {
  assert.equal(toRepoPath('./src/a.ts', ['/repo']), 'src/a.ts')
})

test('caminho absoluto sob uma das raízes vira relativo', () => {
  assert.equal(toRepoPath('/repo/src/a.ts', ['/repo']), 'src/a.ts')
})

test('caminho absoluto fora de toda raiz devolve null', () => {
  assert.equal(toRepoPath('/outro/src/a.ts', ['/repo']), null)
})
