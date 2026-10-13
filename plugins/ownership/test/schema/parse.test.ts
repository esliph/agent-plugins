import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { parseOwnershipFile } from '../../plugin/src/schema/parse.ts'

const FILE = '.ownership.yml'

function loadError(text: string, isRoot = true): OwnershipError {
  try {
    parseOwnershipFile(text, FILE, { isRoot })
  } catch (error) {
    assert.ok(error instanceof OwnershipError, `expected an OwnershipError, got ${String(error)}`)

    return error
  }
  assert.fail('expected a load error')
}

const FULL = [
  'version: 1',
  'basePath: sub/',
  'plugins:',
  '  plugin-example: {}',
  '  another-plugin:',
  '    prop1: Test',
  'owned:',
  '  - path: docs/',
  "    owner: '@team-docs'",
  '    skill: docs-keeper',
  '    plugins:',
  '      plugin-example:',
  '        prop2: Test 2',
  '      another-plugin: {}',
  '  - path: src/a.ts',
  "    owner: '@team-src'",
  'generated:',
  '  - path: docs/api.md',
  '    command: node gen.mjs',
  'ignore:',
  '  - docs/vendor/',
  'include:',
  '  - plugins/x/',
  '',
].join('\n')

test('a complete file is read with key paths, lines and separate plugin blocks', () => {
  assert.deepEqual(parseOwnershipFile(FULL, FILE, { isRoot: true }), {
    file: FILE,
    basePath: { path: 'sub/', origin: { file: FILE, keyPath: 'basePath', line: 2 } },
    plugins: { 'plugin-example': {}, 'another-plugin': { prop1: 'Test' } },
    owned: [
      {
        path: 'docs/',
        owner: '@team-docs',
        skill: 'docs-keeper',
        plugins: { 'plugin-example': { prop2: 'Test 2' }, 'another-plugin': {} },
        origin: { file: FILE, keyPath: 'owned[0]', line: 8 },
      },
      { path: 'src/a.ts', owner: '@team-src', plugins: {}, origin: { file: FILE, keyPath: 'owned[1]', line: 15 } },
    ],
    generated: [{ path: 'docs/api.md', command: 'node gen.mjs', origin: { file: FILE, keyPath: 'generated[0]', line: 18 } }],
    ignore: [{ path: 'docs/vendor/', origin: { file: FILE, keyPath: 'ignore[0]', line: 21 } }],
    include: [{ path: 'plugins/x/', origin: { file: FILE, keyPath: 'include[0]', line: 23 } }],
  })
})

test('a file with CRLF line ends reads the same as with LF', () => {
  assert.deepEqual(parseOwnershipFile(FULL.replace(/\n/g, '\r\n'), FILE, { isRoot: true }), parseOwnershipFile(FULL, FILE, { isRoot: true }))
})

test('invalid YAML names the file and repeats the parser message', () => {
  const error = loadError('version: 1\nowned: [a\n')

  assert.match(error.message, /^\.ownership\.yml:\d+: invalid YAML: /)
})

test('a duplicate key is an error, never "the last one wins"', () => {
  const error = loadError("version: 1\nowned:\n  - path: a\n    path: b\n    owner: '@t'\n")

  assert.equal(error.message, '.ownership.yml:4: duplicate key "path"; each key appears once in a map\n  → remove or rename one of the two keys')
})

test('an empty or comment-only file is missing its version', () => {
  for (const text of ['', '# only a comment\n']) {
    assert.equal(loadError(text).issues[0]?.message, 'version is missing; supported versions: 1')
  }
})

test('an unsupported version names the received value and the supported versions', () => {
  assert.equal(loadError('version: 2\n').issues[0]?.message, 'version 2 is not supported; supported versions: 1')
  assert.equal(loadError("version: '1'\n").issues[0]?.message, "version '1' is not supported; supported versions: 1")
})

test('the version is checked before the keys', () => {
  assert.equal(loadError('foo: 1\nversion: 3\n').issues[0]?.keyPath, 'version')
})

test('an unknown top-level key is named', () => {
  const issue = loadError('version: 1\nwatches: []\n').issues[0]

  assert.equal(issue?.message, 'unknown top-level key "watches"; the keys are version, plugins, basePath, owned, generated, ignore, include')
  assert.equal(issue?.line, 2)
})

test('plugins is forbidden in an included file', () => {
  assert.equal(loadError('version: 1\nplugins:\n  x: {}\n', false).issues[0]?.message, 'plugins is only allowed in the root ownership file')
})

test('a top-level list key with no value is an error that names the key', () => {
  assert.equal(loadError('version: 1\nowned:\n').issues[0]?.message, 'owned must be a list; got (empty)')
})

test('an unknown key in an owned entry suggests a plugin block', () => {
  const issue = loadError("version: 1\nowned:\n  - path: docs/\n    owner: '@t'\n    id-prefix: ADR\n").issues[0]

  assert.equal(issue?.keyPath, 'owned[0].id-prefix')
  assert.equal(issue?.message, 'owned[0] has an unknown key "id-prefix"')
  assert.equal(issue?.fix, 'if it configures a plugin, move it under owned[0].plugins.<name>; otherwise remove it')
})

test('an owner without @ names the key path and the line', () => {
  const issue = loadError('version: 1\nowned:\n  - path: docs/\n    owner: team\n').issues[0]

  assert.equal(issue?.keyPath, 'owned[0].owner')
  assert.equal(issue?.line, 4)
  assert.equal(issue?.message, 'owned[0].owner must start with "@"; got team')
})

test('a value is shown as written, never as [object Object]', () => {
  const issue = loadError('version: 1\nowned:\n  - path: docs/\n    owner: {a: 1}\n').issues[0]

  assert.equal(issue?.message, 'owned[0].owner must be a non-empty string; got {a: 1}')
})

test('a missing owner is named', () => {
  assert.equal(loadError('version: 1\nowned:\n  - path: docs/\n').issues[0]?.message, 'owned[0].owner is missing')
})

test('a generated path ending in / is an error', () => {
  assert.equal(
    loadError('version: 1\ngenerated:\n  - path: out/\n    command: gen\n').issues[0]?.message,
    'generated[0].path out/ ends with "/"; a generated path is a file',
  )
})

test('a generated entry needs its command and has no other key', () => {
  assert.equal(loadError('version: 1\ngenerated:\n  - path: out.md\n').issues[0]?.message, 'generated[0].command is missing')
  assert.equal(
    loadError('version: 1\ngenerated:\n  - path: out.md\n    command: gen\n    owner: x\n').issues[0]?.message,
    'generated[0] has an unknown key "owner"; a generated entry has only path and command',
  )
})

test('a plugin block that is not a map suggests {}', () => {
  const issue = loadError("version: 1\nowned:\n  - path: docs/\n    owner: '@t'\n    plugins:\n      living-docs: true\n").issues[0]

  assert.equal(issue?.keyPath, 'owned[0].plugins.living-docs')
  assert.equal(issue?.message, 'owned[0].plugins.living-docs must be a map; got true')
  assert.equal(issue?.fix, 'use "living-docs: {}" to declare the link without configuration')
})

test('a plugin name outside the pattern is an error, at the root and in an entry', () => {
  assert.equal(loadError('version: 1\nplugins:\n  Living_Docs: {}\n').issues[0]?.message, 'plugin name "Living_Docs" must match ^[a-z][a-z0-9-]*$')
  assert.equal(loadError('version: 1\nplugins:\n  x: []\n').issues[0]?.message, 'plugins.x must be a map; got []')
})

test('declared paths are literal', () => {
  assert.equal(
    loadError("version: 1\nowned:\n  - path: docs/*.md\n    owner: '@t'\n").issues[0]?.message,
    'owned[0].path docs/*.md contains "*"; paths are literal, without glob or negation',
  )
  assert.equal(
    loadError('version: 1\nignore:\n  - /vendor/\n').issues[0]?.message,
    'ignore[0] /vendor/ starts with "/"; paths are relative to the base of the file',
  )
})

test('a file stops at its first error', () => {
  assert.equal(loadError('version: 1\nowned:\n  - path: docs/*\n    owner: team\n').issues.length, 1)
})

test('a YAML alias inside a plugin block reaches the plugin as the value it stands for', () => {
  const file = parseOwnershipFile(['version: 1', 'plugins:', '  docs-kit:', '    base: &dir', '      path: x', '    other: *dir', ''].join('\n'), FILE, {
    isRoot: true,
  })

  assert.deepEqual(file.plugins, { 'docs-kit': { base: { path: 'x' }, other: { path: 'x' } } })
})

test('a plugin block that is itself an alias is read as the block it stands for', () => {
  const file = parseOwnershipFile(['version: 1', 'plugins:', '  a: &d', '    x: 1', '  b: *d', ''].join('\n'), FILE, { isRoot: true })

  assert.deepEqual(file.plugins, { a: { x: 1 }, b: { x: 1 } })
})

test('a whole plugins map given by an alias is read as the map it stands for', () => {
  const file = parseOwnershipFile(
    ['version: 1', 'plugins: &common', '  docs-kit: {}', 'owned:', '  - path: docs/', "    owner: '@team'", '    plugins: *common', ''].join('\n'),
    FILE,
    { isRoot: true },
  )

  assert.deepEqual(file.owned[0]?.plugins, { 'docs-kit': {} })
})

test('an owned entry and its values given by aliases are read as what they stand for', () => {
  const file = parseOwnershipFile(
    ['version: 1', 'owned:', '  - &entry', '    path: docs/', "    owner: &team '@team'", '  - *entry', '  - path: src/', '    owner: *team', ''].join('\n'),
    FILE,
    { isRoot: true },
  )

  assert.deepEqual(
    file.owned.map(entry => [entry.path, entry.owner]),
    [
      ['docs/', '@team'],
      ['docs/', '@team'],
      ['src/', '@team'],
    ],
  )
})
