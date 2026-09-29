import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { listFiles, readTextFile, isProbablyText, forgetTree, MAX_BYTES } from '../../src/core/files.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const TREE = {
  'docs/one.md': '# one\n',
  'docs/sub/two.md': '# two\n',
  'docs/three.txt': 'text\n',
  'src/four.ts': 'export const x = 1;\n',
  'node_modules/package/five.md': '# do not read me\n',
  '.git/config': '[core]\n',
}

test('listFiles scans everything, always with `/`, and skips what never holds a document', () => {
  withTempRepo(TREE, root => {
    const files = listFiles(root)

    assert.ok(files.includes('docs/sub/two.md'))
    assert.ok(files.includes('src/four.ts'))
    assert.equal(
      files.some(file => file.startsWith('node_modules/')),
      false,
    )
    assert.equal(
      files.some(file => file.startsWith('.git/')),
      false,
    )
    assert.equal(
      files.some(file => file.includes('\\')),
      false,
    )
  })
})

test('listFiles filters by glob; an empty list is not the absence of a filter', () => {
  withTempRepo(TREE, root => {
    assert.deepEqual(listFiles(root, ['docs/**/*.md']).sort(), ['docs/one.md', 'docs/sub/two.md'])
    assert.deepEqual(listFiles(root, []), [], 'an empty filter matches nothing — it is not "everything"')
    assert.ok(listFiles(root, undefined).length > 3, 'no filter means everything')
  })
})

test('listFiles matches a file that starts with a dot — the corpus starts with `.ownership.yml`', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 2\n', 'docs/sub/.gitkeep': '' }, root => {
    assert.deepEqual(listFiles(root, ['docs/**']).sort(), ['docs/.ownership.yml', 'docs/sub/.gitkeep'])
  })
})

test('the scan is memoized per root, and `forgetTree` forgets it', () => {
  withTempRepo(TREE, root => {
    forgetTree(root)
    assert.equal(listFiles(root, ['docs/**/*.md']).length, 2)

    writeFileSync(join(root, 'docs/three.md'), '# three\n', 'utf8')
    assert.equal(listFiles(root, ['docs/**/*.md']).length, 2, 'within the same run, the tree is the earlier one')

    forgetTree(root)
    assert.equal(listFiles(root, ['docs/**/*.md']).length, 3, 'new run, new tree')
  })
})

test('the glob is applied on each call — the cache holds the raw scan', () => {
  withTempRepo(TREE, root => {
    forgetTree(root)
    const everything = listFiles(root)

    assert.deepEqual(listFiles(root, []), [], 'an empty list still matches nothing, even with the tree in memory')
    assert.deepEqual(listFiles(root, undefined), everything)

    // The returned list is a copy: sorting the result does not reorder the cache.
    listFiles(root).sort().reverse()
    assert.deepEqual(listFiles(root), everything)
  })
})

test('readTextFile returns the content, and null for binary, large or missing', () => {
  withTempRepo(TREE, root => {
    assert.equal(readTextFile(root, 'docs/one.md'), '# one\n')
    assert.equal(readTextFile(root, 'docs/does-not-exist.md'), null)

    mkdirSync(join(root, 'docs/attachments'), { recursive: true })
    writeFileSync(join(root, 'docs/attachments/bin.dat'), Buffer.from([0x41, 0x00, 0x42]))
    assert.equal(readTextFile(root, 'docs/attachments/bin.dat'), null, 'a NUL byte is the binary signal')

    writeFileSync(join(root, 'docs/attachments/large.md'), 'x'.repeat(MAX_BYTES + 1), 'utf8')
    assert.equal(readTextFile(root, 'docs/attachments/large.md'), null, 'above the ceiling it is data, not text')
  })
})

test('isProbablyText separates text from data by the NUL byte', () => {
  assert.equal(isProbablyText('any prose'), true)
  assert.equal(isProbablyText(`with${String.fromCharCode(0)}nul`), false)
})
