import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { deepestOwnershipFile, findGeneratedRule, findIgnoreRule, findOwnedRule } from '../../plugin/src/resolve/lookup.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'
import { tempRepo } from '../helpers/repo.ts'

const ROOT_FILE = [
  'version: 1',
  'plugins:',
  '  docs-kit:',
  '    lang: en',
  'owned:',
  '  - path: README.md',
  "    owner: '@root'",
  '    plugins:',
  '      docs-kit: {}',
  'include:',
  '  - plugins/x/',
  '',
].join('\n')

const PLUGIN_FILE = [
  'version: 1',
  'owned:',
  '  - path: src/',
  "    owner: '@x'",
  '    skill: x-keeper',
  'generated:',
  '  - path: src/gen.ts',
  '    command: node gen.mjs',
  'ignore:',
  '  - src/vendor/',
  '',
].join('\n')

test('a repository without an ownership file resolves to null', t => {
  assert.equal(resolveOwnership(tempRepo(t, { 'a.txt': '' })), null)
})

test('an ownership file outside a Git work tree is a load error', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\n' }, { git: false })

  assert.throws(
    () => resolveOwnership(root),
    (error: unknown) => error instanceof OwnershipError && /is not inside a Git work tree/.test(error.message),
  )
})

test('the files are composed into one frozen configuration with separate plugin blocks', t => {
  const root = tempRepo(t, { '.ownership.yml': ROOT_FILE, 'plugins/x/.ownership.yml': PLUGIN_FILE })
  const config = resolveOwnership(root)

  assert.ok(config !== null)
  assert.equal(config.rootFile, '.ownership.yml')
  assert.deepEqual(config.files, [
    { path: '.ownership.yml', base: '' },
    { path: 'plugins/x/.ownership.yml', base: 'plugins/x/', includedBy: '.ownership.yml' },
  ])
  assert.deepEqual(config.plugins, { 'docs-kit': { lang: 'en' } })
  assert.deepEqual(
    config.owned.map(rule => [rule.path, rule.owner, rule.skill ?? null, rule.plugins, rule.origin.file]),
    [
      ['README.md', '@root', null, { 'docs-kit': {} }, '.ownership.yml'],
      ['plugins/x/src/', '@x', 'x-keeper', {}, 'plugins/x/.ownership.yml'],
    ],
  )
  assert.deepEqual(
    config.generated.map(rule => [rule.path, rule.command]),
    [['plugins/x/src/gen.ts', 'node gen.mjs']],
  )
  assert.deepEqual(
    config.ignore.map(rule => rule.path),
    ['plugins/x/src/vendor/'],
  )

  for (const value of [
    config,
    config.owned,
    config.owned[0],
    config.owned[0]?.plugins,
    config.plugins['docs-kit'],
    config.index,
    config.index.children,
    config.files,
  ]) {
    assert.ok(Object.isFrozen(value))
  }
})

test('lookups walk the index and normalize the path they receive', t => {
  const root = tempRepo(t, { '.ownership.yml': ROOT_FILE, 'plugins/x/.ownership.yml': PLUGIN_FILE })
  const config = resolveOwnership(root)

  assert.ok(config !== null)
  assert.equal(findOwnedRule(config, 'plugins/x/src/a.ts')?.owner, '@x')
  assert.equal(findOwnedRule(config, 'plugins\\x\\src\\a.ts')?.owner, '@x')
  assert.equal(findOwnedRule(config, './README.md')?.owner, '@root')
  assert.equal(findOwnedRule(config, 'other.md'), null)
  assert.equal(findGeneratedRule(config, 'plugins/x/src/gen.ts')?.command, 'node gen.mjs')
  assert.equal(findGeneratedRule(config, 'plugins/x/src/'), null)
  assert.equal(findIgnoreRule(config, 'plugins/x/src/vendor/lib.js')?.path, 'plugins/x/src/vendor/')
  assert.equal(deepestOwnershipFile(config, 'plugins/x/src/a.ts'), 'plugins/x/.ownership.yml')
  assert.equal(deepestOwnershipFile(config, 'docs/a.md'), '.ownership.yml')
})

test('a declared path in NFD matches the same name in NFC', t => {
  const root = tempRepo(t, { '.ownership.yml': "version: 1\nowned:\n  - path: café.md\n    owner: '@a'\n" })
  const config = resolveOwnership(root)

  assert.ok(config !== null)
  assert.equal(findOwnedRule(config, 'café.md')?.owner, '@a')
})

test('every relation error comes in one load error, with the split suggestion when the files are known', t => {
  const root = tempRepo(t, {
    '.ownership.yml':
      "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n  - path: docs/adr/\n    owner: '@b'\ngenerated:\n  - path: out.md\n    command: gen\n",
    'docs/README.md': '',
    'docs/adr/1.md': '',
  })

  assert.throws(
    () => resolveOwnership(root, { repoFiles: listRepoFiles(root) }),
    (error: unknown) =>
      error instanceof OwnershipError &&
      error.issues.length === 2 &&
      error.issues[0]?.fix === 'replace "docs/" with: docs/README.md (keep docs/adr/)' &&
      /out\.md" is not inside any owned path/.test(error.issues[1]?.message ?? ''),
  )
})

test('pruning skips the includes that cannot hold the paths in question', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/.ownership.yml': 'version: 2\n' })

  assert.ok(resolveOwnership(root, { prune: ['src/a.ts'] }) !== null)
  assert.throws(() => resolveOwnership(root), OwnershipError)
})

test('an explicit root file wins, from the option or from OWNERSHIP_CONFIG, and its base is the repository root', t => {
  const root = tempRepo(t, { 'config/own.yml': "version: 1\nowned:\n  - path: README.md\n    owner: '@a'\n" })

  assert.equal(resolveOwnership(root, { ownership: 'config/own.yml' })?.owned[0]?.path, 'README.md')

  process.env.OWNERSHIP_CONFIG = 'config/own.yml'

  try {
    assert.equal(resolveOwnership(root)?.rootFile, 'config/own.yml')
  } finally {
    delete process.env.OWNERSHIP_CONFIG
  }
})
