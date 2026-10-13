import { test } from 'node:test'
import assert from 'node:assert/strict'

import { toRepoPath } from '../../plugin/src/hooks/paths.ts'

test('an absolute path under the root becomes relative to it', () => {
  assert.equal(toRepoPath('/work/proj/docs/a.md', ['/work/proj']), 'docs/a.md')
  assert.equal(toRepoPath('/work/proj/docs/a.md', ['/work/proj/']), 'docs/a.md')
  assert.equal(toRepoPath('/work/proj/docs/../src//a.ts', ['/work/proj']), 'src/a.ts')
})

test('backslashes are normalized and the drive letter may differ in case', () => {
  assert.equal(toRepoPath('C:\\Users\\Dan\\proj\\docs\\a.md', ['C:\\Users\\Dan\\proj']), 'docs/a.md')
  assert.equal(toRepoPath('c:\\users\\dan\\proj\\docs\\a.md', ['C:\\Users\\Dan\\proj']), 'docs/a.md')
  assert.equal(toRepoPath('c:/Users/Dan/proj/docs/a.md', ['C:\\Users\\Dan\\proj\\']), 'docs/a.md')
})

test('only the root prefix ignores case: the path inside the repository keeps its own', () => {
  assert.equal(toRepoPath('/WORK/Proj/Docs/A.md', ['/work/proj']), 'Docs/A.md')
})

test('a second root is accepted, in the order given', () => {
  assert.equal(toRepoPath('/host/proj/out.md', ['/workspace', '/host/proj']), 'out.md')
})

test('a path outside every root, or the root itself, is no repository path', () => {
  assert.equal(toRepoPath('/work/other/a.md', ['/work/proj']), null)
  assert.equal(toRepoPath('/work/proj-two/a.md', ['/work/proj']), null)
  assert.equal(toRepoPath('/work/proj/../other/a.md', ['/work/proj']), null)
  assert.equal(toRepoPath('/work/proj', ['/work/proj']), null)
  assert.equal(toRepoPath('D:\\proj\\a.md', ['C:\\proj']), null)
})

test('a relative path is already relative to the repository, unless it leaves it', () => {
  assert.equal(toRepoPath('docs\\a.md', ['/work/proj']), 'docs/a.md')
  assert.equal(toRepoPath('./docs/a.md', ['/work/proj']), 'docs/a.md')
  assert.equal(toRepoPath('../a.md', ['/work/proj']), null)
  assert.equal(toRepoPath('docs/../../a.md', ['/work/proj']), null)
})

test('a decomposed name comes back in NFC', () => {
  assert.equal(toRepoPath('/work/proj/cafe\u0301.md', ['/work/proj']), 'caf\u00e9.md')
})
