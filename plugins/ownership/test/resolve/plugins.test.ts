import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { entriesForPlugin } from '../../plugin/src/resolve/plugins.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'
import { tempRepo } from '../helpers/repo.ts'

const OWNERSHIP = [
  'version: 1',
  'plugins:',
  '  docs-kit:',
  '    lang: en',
  '    strict: true',
  'owned:',
  '  - path: docs/',
  "    owner: '@docs'",
  '    skill: docs-keeper',
  '    plugins:',
  '      docs-kit:',
  '        strict: false',
  '      sdd-kit: {}',
  '  - path: src/',
  "    owner: '@src'",
  '    plugins:',
  '      sdd-kit:',
  '        level: 2',
  '  - path: README.md',
  "    owner: '@docs'",
  '',
].join('\n')

function config(t: Parameters<typeof tempRepo>[0]) {
  const resolved = resolveOwnership(tempRepo(t, { '.ownership.yml': OWNERSHIP }))

  assert.ok(resolved !== null)

  return resolved
}

test('the entries of a plugin carry the entry block and the global block, never merged', t => {
  assert.deepEqual(entriesForPlugin(config(t), 'docs-kit'), [
    { path: 'docs/', owner: '@docs', skill: 'docs-keeper', source: '.ownership.yml', entry: { strict: false }, global: { lang: 'en', strict: true } },
  ])
})

test('a plugin without a global block has no global field', t => {
  assert.deepEqual(
    entriesForPlugin(config(t), 'sdd-kit').map(item => [item.path, item.entry, 'global' in item]),
    [
      ['docs/', {}, false],
      ['src/', { level: 2 }, false],
    ],
  )
})

test('a valid name with no entry gives an empty list; an invalid name is a load error', t => {
  assert.deepEqual(entriesForPlugin(config(t), 'docs-kti'), [])
  assert.throws(() => entriesForPlugin(config(t), 'Docs_Kit'), OwnershipError)
})
