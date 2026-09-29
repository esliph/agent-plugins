import { test } from 'node:test'
import assert from 'node:assert/strict'
import { forgetTree, listFiles, readTextFile } from '../../src/core/files.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('listFiles sem globs devolve tudo, com globs filtra', () => {
  withTempRepo({ 'a.md': 'x', 'docs/b.md': 'y', 'node_modules/c.md': 'z' }, root => {
    forgetTree(root)
    assert.deepEqual(listFiles(root).sort(), ['a.md', 'docs/b.md'])
    assert.deepEqual(listFiles(root, ['docs/**']), ['docs/b.md'])
    assert.deepEqual(listFiles(root, []), [])
  })
})

test('readTextFile devolve null para arquivo ausente', () => {
  withTempRepo({}, root => {
    assert.equal(readTextFile(root, 'nope.md'), null)
  })
})
