import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

import { isInsideWorkTree, listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { git, tempRepo, writeFile } from '../helpers/repo.ts'

test('a directory outside Git is not a work tree', t => {
  assert.equal(isInsideWorkTree(tempRepo(t, {}, { git: false })), false)
  assert.equal(isInsideWorkTree(tempRepo(t, {})), true)
})

test('tracked and untracked files enter; what a .gitignore excludes does not', t => {
  const root = tempRepo(t, { '.gitignore': 'build/\n*.log\n', 'src/a.ts': '', 'build/out.js': '', 'debug.log': '', 'docs/x.md': '' }, { add: true })

  writeFile(root, 'new.ts', '')
  writeFile(root, 'other.log', '')

  assert.deepEqual([...listRepoFiles(root)], ['.gitignore', 'docs/x.md', 'new.ts', 'src/a.ts'])
})

test('a tracked file that a .gitignore would exclude enters; a tracked file deleted from the work tree does not', t => {
  const root = tempRepo(t, { '.gitignore': '*.log\n', 'keep.log': '', 'gone.txt': '' })

  git(root, 'add', '-f', 'keep.log', 'gone.txt', '.gitignore')
  rmSync(join(root, 'gone.txt'))

  assert.deepEqual([...listRepoFiles(root)], ['.gitignore', 'keep.log'])
})

test('local excludes do not count: only the .gitignore files do', t => {
  const root = tempRepo(t, { 'a.txt': '', 'secret.txt': '' })

  writeFile(root, '.git/info/exclude', 'secret.txt\n')

  assert.deepEqual([...listRepoFiles(root)], ['a.txt', 'secret.txt'])
})

test('an untracked nested repository is one entry at its path without the slash', t => {
  const root = tempRepo(t, { 'a.txt': '' })
  const nested = join(root, 'vendor', 'lib')

  writeFile(root, 'vendor/lib/x.txt', '')
  git(nested, 'init', '-q')

  assert.deepEqual([...listRepoFiles(root)], ['a.txt', 'vendor/lib'])
})

test('a symbolic link is one entry at the path of the link', t => {
  if (process.platform === 'win32') {
    t.skip('Git for Windows does not keep symbolic links by default; CI (ubuntu) runs this proof')

    return
  }

  const root = tempRepo(t, { 'target/a.txt': '' })

  try {
    symlinkSync(join(root, 'target'), join(root, 'link'), 'dir')
  } catch {
    t.skip('this machine cannot create symbolic links')

    return
  }

  assert.deepEqual([...listRepoFiles(root)], ['link', 'target/a.txt'])
})

test('names with spaces and accents come back unquoted and in NFC', t => {
  const root = tempRepo(t, { 'sp ace/café.md': '' })

  assert.deepEqual([...listRepoFiles(root)], ['sp ace/café.md'])
})
