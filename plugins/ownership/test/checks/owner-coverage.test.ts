import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { ownerCoverage } from '../../plugin/src/checks/owner-coverage.ts'
import { runCheck } from '../helpers/check.ts'
import { git, tempRepo, writeFile } from '../helpers/repo.ts'

const own = (...entries: [string, string][]): string =>
  ['version: 1', 'owned:', ...entries.flatMap(([path, owner]) => [`  - path: ${path}`, `    owner: '${owner}'`]), ''].join('\n')

test('a repository where every file has an owner passes', async t => {
  const root = tempRepo(t, { '.ownership.yml': own(['.ownership.yml', '@a'], ['src/', '@b']), 'src/a.ts': '', 'src/b/c.ts': '' })

  assert.deepEqual(await runCheck(ownerCoverage, root), [])
})

test('a file with no owned entry nor ignore is a finding whose fix names the ownership file with the deepest base', async t => {
  const root = tempRepo(t, {
    '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\ninclude:\n  - plugins/x/\n",
    'plugins/x/.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@x'\n",
    'plugins/x/src/a.ts': '',
    'README.md': '',
  })

  assert.deepEqual(await runCheck(ownerCoverage, root), [
    {
      file: 'README.md',
      checkId: 'ownership/owner-coverage',
      severity: 'error',
      message: 'no owned entry covers this file',
      fix: 'declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
    },
    {
      file: 'plugins/x/src/a.ts',
      checkId: 'ownership/owner-coverage',
      severity: 'error',
      message: 'no owned entry covers this file',
      fix: 'declare it in owned[] of plugins/x/.ownership.yml, or leave it out with ignore[]',
    },
  ])
})

test('an ignored file needs no owner, and a file a .gitignore excludes is not a repository file', async t => {
  const root = tempRepo(t, {
    '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n  - path: .gitignore\n    owner: '@a'\nignore:\n  - vendor/\n",
    '.gitignore': 'node_modules/\n',
    'vendor/lib.js': '',
    'node_modules/x/index.js': '',
  })

  assert.deepEqual(await runCheck(ownerCoverage, root), [])
})

test('an owned path that matches no file is a finding on its entry', async t => {
  const root = tempRepo(t, { '.ownership.yml': own(['.ownership.yml', '@a'], ['gone.md', '@a'], ['empty/', '@a']) })

  assert.deepEqual(
    (await runCheck(ownerCoverage, root)).map(item => [item.file, item.line, item.message]),
    [
      ['.ownership.yml', 5, 'owned[1].path "gone.md" does not exist in the repository'],
      ['.ownership.yml', 7, 'owned[2].path "empty/" does not exist in the repository'],
    ],
  )
})

test('an owned directory whose files are all ignored is told apart from a missing path', async t => {
  const root = tempRepo(t, {
    '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n  - path: src/\n    owner: '@a'\nignore:\n  - src/vendor/\n",
    'src/vendor/lib.js': '',
  })
  const findings = await runCheck(ownerCoverage, root)

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.message, 'owned[1].path "src/": all its files are ignored')
  assert.equal(findings[0]?.fix, 'remove the entry, or the ignore that leaves its files out')
})

test('an untracked nested repository counts as one file at its path', async t => {
  const root = tempRepo(t, { '.ownership.yml': own(['.ownership.yml', '@a']) })

  writeFile(root, 'vendor/lib/x.js', '')
  git(join(root, 'vendor', 'lib'), 'init', '-q')

  assert.deepEqual(
    (await runCheck(ownerCoverage, root)).map(item => item.file),
    ['vendor/lib'],
  )
})
