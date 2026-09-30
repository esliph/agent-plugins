import { test } from 'node:test'
import assert from 'node:assert/strict'
import { forgetTree, listFiles, readTextFile } from '../../plugin/src/core/files.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('listFiles without globs returns everything, with globs filters', () => {
  withTempRepo({ 'a.md': 'x', 'docs/b.md': 'y', 'node_modules/c.md': 'z' }, root => {
    forgetTree(root)
    assert.deepEqual(listFiles(root).sort(), ['a.md', 'docs/b.md'])
    assert.deepEqual(listFiles(root, ['docs/**']), ['docs/b.md'])
    assert.deepEqual(listFiles(root, []), [])
  })
})

test('readTextFile returns null for a missing file', () => {
  withTempRepo({}, root => {
    assert.equal(readTextFile(root, 'nope.md'), null)
  })
})
