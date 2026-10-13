import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { findRootFile, loadFiles } from '../../plugin/src/resolve/load.ts'
import { tempRepo } from '../helpers/repo.ts'

function errorOf(fn: () => unknown): OwnershipError {
  try {
    fn()
  } catch (error) {
    assert.ok(error instanceof OwnershipError, `expected an OwnershipError, got ${String(error)}`)

    return error
  }
  assert.fail('expected a load error')
}

const V1 = 'version: 1\n'

test('the root file is the explicit one, then .ownership.yml, then docs/.ownership.yml', t => {
  assert.equal(findRootFile(tempRepo(t, {}, { git: false })), null)
  assert.equal(findRootFile(tempRepo(t, { '.ownership.yml': V1 }, { git: false })), '.ownership.yml')
  assert.equal(findRootFile(tempRepo(t, { 'docs/.ownership.yml': V1 }, { git: false })), 'docs/.ownership.yml')
  assert.equal(findRootFile(tempRepo(t, { '.ownership.yml': V1, 'config/own.yml': V1 }, { git: false }), 'config/own.yml'), 'config/own.yml')
})

test('two root candidates are an error that names both; the system never picks one', t => {
  const root = tempRepo(t, { '.ownership.yml': V1, 'docs/.ownership.yml': V1 }, { git: false })

  assert.equal(
    errorOf(() => findRootFile(root)).message,
    '.ownership.yml: two root ownership files: .ownership.yml and docs/.ownership.yml; the root is one file\n  → merge them into one, or point --ownership at the one to use',
  )
})

test('an explicit root file that does not exist is an error', t => {
  assert.match(errorOf(() => findRootFile(tempRepo(t, {}, { git: false }), 'missing.yml')).message, /the ownership file missing\.yml does not exist/)
})

test('the base of the root is the repository root, whichever candidate won', t => {
  const root = tempRepo(t, { 'docs/.ownership.yml': "version: 1\nowned:\n  - path: src/\n    owner: '@a'\n" }, { git: false })

  assert.deepEqual(
    loadFiles(root, 'docs/.ownership.yml').map(file => [file.path, file.base, file.raw.owned.map(entry => entry.path)]),
    [['docs/.ownership.yml', '', ['src/']]],
  )
})

test('an included file resolves its paths against its directory plus basePath', t => {
  const root = tempRepo(
    t,
    {
      '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n  - plugins/y/.ownership.yml\n',
      'plugins/x/.ownership.yml': "version: 1\nowned:\n  - path: src/\n    owner: '@x'\n",
      'plugins/y/.ownership.yml': "version: 1\nbasePath: sub\nowned:\n  - path: a.ts\n    owner: '@y'\nignore:\n  - vendor/\n",
    },
    { git: false },
  )

  assert.deepEqual(
    loadFiles(root, '.ownership.yml').map(file => [
      file.path,
      file.base,
      file.includedBy ?? null,
      file.raw.owned.map(entry => entry.path),
      file.raw.ignore.map(entry => entry.path),
    ]),
    [
      ['.ownership.yml', '', null, [], []],
      ['plugins/x/.ownership.yml', 'plugins/x/', '.ownership.yml', ['plugins/x/src/'], []],
      ['plugins/y/.ownership.yml', 'plugins/y/sub/', '.ownership.yml', ['plugins/y/sub/a.ts'], ['plugins/y/sub/vendor/']],
    ],
  )
})

test('basePath only descends', t => {
  const root = tempRepo(
    t,
    { '.ownership.yml': 'version: 1\ninclude:\n  - x/.ownership.yml\n', 'x/.ownership.yml': 'version: 1\nbasePath: ../y\n' },
    { git: false },
  )

  assert.equal(
    errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]?.message,
    'basePath "../y" must only descend from the directory of the file: no "..", no glob, no absolute path',
  )
})

test('a path that escapes its base shows the resolved path and the base', t => {
  const root = tempRepo(
    t,
    { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/.ownership.yml': "version: 1\nowned:\n  - path: ../y/a.ts\n    owner: '@x'\n" },
    { git: false },
  )

  assert.equal(
    errorOf(() => loadFiles(root, '.ownership.yml')).message,
    'plugins/x/.ownership.yml:3: owned[0].path "../y/a.ts" resolves to "plugins/y/a.ts", outside the base "plugins/x/" of plugins/x/.ownership.yml\n  → declare the path in an ownership file whose base contains it',
  )
})

test('an owned entry that resolves to the repository root is an error', t => {
  const root = tempRepo(t, { '.ownership.yml': "version: 1\nowned:\n  - path: ./\n    owner: '@a'\n" }, { git: false })

  assert.equal(
    errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]?.message,
    'owned[0].path "./" resolves to the repository root; an entry names a file or a directory inside it',
  )
})

test('a directory include needs exactly one ownership file', t => {
  const none = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/README.md': '' }, { git: false })
  const two = tempRepo(
    t,
    { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/ownership.yml': V1, 'plugins/x/.ownership.a.yml': V1 },
    { git: false },
  )

  assert.equal(errorOf(() => loadFiles(none, '.ownership.yml')).issues[0]?.message, 'include[0] names the directory plugins/x/, which holds no ownership file')
  assert.equal(
    errorOf(() => loadFiles(two, '.ownership.yml')).issues[0]?.message,
    'include[0] names the directory plugins/x/, which holds 2 ownership files: .ownership.a.yml, ownership.yml',
  )
})

test('a missing included file names who included it', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/own.yml\n' }, { git: false })
  const issue = errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]

  assert.equal(issue?.file, '.ownership.yml')
  assert.equal(issue?.line, 3)
  assert.equal(issue?.message, 'include[0] names plugins/x/own.yml, which does not exist')
})

test('an include cycle shows the chain', t => {
  const root = tempRepo(
    t,
    {
      '.ownership.yml': 'version: 1\ninclude:\n  - a/.ownership.yml\n',
      'a/.ownership.yml': 'version: 1\ninclude:\n  - .ownership.b.yml\n',
      'a/.ownership.b.yml': 'version: 1\ninclude:\n  - .ownership.yml\n',
    },
    { git: false },
  )
  const issue = errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]

  assert.equal(issue?.file, 'a/.ownership.b.yml')
  assert.equal(issue?.message, 'include cycle: .ownership.yml → a/.ownership.yml → a/.ownership.b.yml → a/.ownership.yml')
})

test('a file included twice names both includers', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - a/.ownership.yml\n  - a/\n', 'a/.ownership.yml': V1 }, { git: false })

  assert.equal(
    errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]?.message,
    'a/.ownership.yml is included twice: by .ownership.yml:3 and by .ownership.yml:4',
  )
})

test('pruning follows only the includes whose directory is an ancestor of a pruned path', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/.ownership.yml': 'version: 2\n' }, { git: false })

  assert.deepEqual(
    loadFiles(root, '.ownership.yml', ['src/a.ts']).map(file => file.path),
    ['.ownership.yml'],
  )
  assert.match(errorOf(() => loadFiles(root, '.ownership.yml', ['plugins/x/a.ts'])).message, /version 2 is not supported/)
})

test('plugins in an included file is an error that names that file', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - x/\n', 'x/.ownership.yml': 'version: 1\nplugins:\n  a: {}\n' }, { git: false })

  assert.equal(errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]?.file, 'x/.ownership.yml')
})
