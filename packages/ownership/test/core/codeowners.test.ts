import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownersOf, parseCodeowners } from '../../src/core/codeowners.ts'

test('a última regra que casa ganha', () => {
  const entries = parseCodeowners('docs/ @a\ndocs/x.md @b\n')
  const codeowners = { file: 'CODEOWNERS', entries }

  assert.deepEqual(ownersOf(codeowners, 'docs/x.md'), ['@b'])
  assert.deepEqual(ownersOf(codeowners, 'docs/y.md'), ['@a'])
  assert.equal(ownersOf(codeowners, 'other.md'), null)
})
