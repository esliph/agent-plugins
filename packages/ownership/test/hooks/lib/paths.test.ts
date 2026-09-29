import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toRepoPath } from '../../../src/hooks/lib/paths.ts'

test('a relative path passes straight through', () => {
  assert.equal(toRepoPath('./src/a.ts', ['/repo']), 'src/a.ts')
})

test('an absolute path under one of the roots becomes relative', () => {
  assert.equal(toRepoPath('/repo/src/a.ts', ['/repo']), 'src/a.ts')
})

test('an absolute path outside every root returns null', () => {
  assert.equal(toRepoPath('/other/src/a.ts', ['/repo']), null)
})
