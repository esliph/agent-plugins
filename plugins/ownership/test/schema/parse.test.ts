import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OwnershipError, parseOwnershipFile } from '../../plugin/src/schema/parse.ts'
import type { RootFile } from '../../plugin/src/schema/types.ts'

const ROOT = { isRoot: true, pluginNames: [] }
const CHILD = (pluginNames: string[] = []) => ({ isRoot: false, pluginNames })

test('root requires version: 2', () => {
  assert.throws(() => parseOwnershipFile('owned: []\n', '.ownership.yml', ROOT), /version.*2/)
})

test('root accepts version: 2 and empty plugins by default', () => {
  const parsed = parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT) as { plugins: string[] }

  assert.deepEqual(parsed.plugins, [])
})

test('child file requires version and refuses plugins', () => {
  assert.throws(() => parseOwnershipFile('owned: []\n', 'packages/api/.ownership.yml', CHILD()), /version/)
  assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nplugins: [x]\n', 'packages/api/.ownership.yml', CHILD()), /exclusive to the root file/)
})

test('unknown top-level key is an error', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nfoo: 1\n', '.ownership.yml', ROOT), /"foo"/)
})

test('version 1 is refused loudly, saying the schema changed', () => {
  assert.throws(() => parseOwnershipFile('version: 1\nartifacts: []\n', 'docs/.ownership.yml', ROOT), /schema v1.*not read.*rewrite/)
})

test('owned, generated and watches that are not a list are an error, not an empty list', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nowned: {}\n', '.ownership.yml', ROOT), /owned.*list/)
  assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nwatches: x\n', '.ownership.yml', ROOT), /watches.*list/)
})

test('owned requires owner starting with @', () => {
  const source = 'version: 2\nowned:\n  - path: docs/x/\n    owner: no-at-sign\n'

  assert.throws(() => parseOwnershipFile(source, '.ownership.yml', ROOT), /@/)
})

test('missing owner is an error — there is nowhere to inherit from', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nowned:\n  - path: ./\n    skill: other\n', 'packages/api/.ownership.yml', CHILD()), /owner/)
})

test('per-file accepts format only for state-field; key is an error', () => {
  const ok = 'version: 2\nowned:\n  - path: docs/adr/\n    owner: "@a"\n    format:\n      collection: per-file\n      state-field: Situation\n'
  const parsed = parseOwnershipFile(ok, '.ownership.yml', ROOT) as { owned: { format: { collection: string; stateField: string } }[] }

  assert.equal(parsed.owned[0]?.format.collection, 'per-file')
  assert.equal(parsed.owned[0]?.format.stateField, 'situation')

  const bad = 'version: 2\nowned:\n  - path: docs/adr/\n    owner: "@a"\n    format:\n      collection: per-file\n      key: ID\n'

  assert.throws(() => parseOwnershipFile(bad, '.ownership.yml', ROOT), /"key"/)
})

test('owned per-file does not declare format', () => {
  const source = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    skill: decision-recorder\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { collection: string } }[] }

  assert.equal(parsed.owned[0]?.format.collection, 'per-file')
})

test('owned with format: table requires key naming the column', () => {
  const source = 'version: 2\nowned:\n  - path: docs/open-decisions.md\n    owner: "@a"\n    format:\n      collection: table\n'

  assert.throws(() => parseOwnershipFile(source, '.ownership.yml', ROOT), /format: needs a non-empty `key` field/)
})

test('owned with format: sections accepts key: first-token (default) or heading', () => {
  const source =
    'version: 2\nowned:\n  - path: docs/requirements/rules.md\n    owner: "@a"\n    format:\n      collection: sections\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { keyMode: string | null } }[] }

  assert.equal(parsed.owned[0]?.format.keyMode, 'first-token')
})

test('state-field is optional, default "status", normalized', () => {
  const source =
    'version: 2\nowned:\n  - path: docs/open-decisions.md\n    owner: "@a"\n    format:\n      collection: table\n      key: ID\n      state-field: Situation\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { stateField: string } }[] }

  assert.equal(parsed.owned[0]?.format.stateField, 'situation')
})

test('derives-from requires source and field', () => {
  const source =
    'version: 2\nowned:\n  - path: docs/superpowers/plans/\n    owner: "@a"\n    derives-from:\n      source: docs/superpowers/specs/\n      field: spec\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { derivesFrom: { source: string; field: string } | null }[] }

  assert.deepEqual(parsed.owned[0]?.derivesFrom, { source: 'docs/superpowers/specs/', field: 'spec' })
})

test('plugin block passes opaque when the name is in plugins:, and fails when it is not', () => {
  const withBlock = 'version: 2\nplugins: [living-docs]\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    living-docs:\n      id-prefix: ADR\n'
  const parsed = parseOwnershipFile(withBlock, '.ownership.yml', ROOT) as { owned: { pluginBlocks: Record<string, unknown> }[] }

  assert.deepEqual(parsed.owned[0]?.pluginBlocks, { 'living-docs': { 'id-prefix': 'ADR' } })

  const withoutDeclared = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    living-docs:\n      id-prefix: ADR\n'

  assert.throws(() => parseOwnershipFile(withoutDeclared, '.ownership.yml', ROOT), /"living-docs"/)
})

test('generated and watches are strict about unknown keys', () => {
  assert.throws(
    () => parseOwnershipFile('version: 2\nowned: []\ngenerated:\n  - path: a.md\n    command: x\n    extra: 1\n', '.ownership.yml', ROOT),
    /"extra"/,
  )
  assert.throws(
    () => parseOwnershipFile('version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: a.md\n    extra: 1\n', '.ownership.yml', ROOT),
    /"extra"/,
  )
})

test('watches reads optional consumer-visible and reason', () => {
  const source = 'version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: CHANGELOG.md\n    consumer-visible: true\n    reason: "x"\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { watches: { consumerVisible: boolean; reason: string | null }[] }

  assert.equal(parsed.watches[0]?.consumerVisible, true)
  assert.equal(parsed.watches[0]?.reason, 'x')
})

test('ignore and include are lists of strings', () => {
  const source = 'version: 2\nowned: []\nignore: ["node_modules/**"]\ninclude: ["packages/api/"]\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { ignore: string[]; include: string[] }

  assert.deepEqual(parsed.ignore, ['node_modules/**'])
  assert.deepEqual(parsed.include, ['packages/api/'])
})

test('file dir is derived from its own path', () => {
  const rootParsed = parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT)
  const childParsed = parseOwnershipFile('version: 2\nowned: []\n', 'packages/api/.ownership.yml', CHILD())

  assert.equal(rootParsed.dir, '')
  assert.equal(childParsed.dir, 'packages/api')
})

test('basePath is normalized, and only descends', () => {
  const parsed = parseOwnershipFile('version: 2\nbasePath: packages/api/\nowned: []\n', 'ownership.api.yml', ROOT) as { basePath: string | null }

  assert.equal(parsed.basePath, 'packages/api')
  assert.equal((parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT) as { basePath: string | null }).basePath, null)

  for (const bad of ['../web', '/abs', 'packages/*', 'packages/../../web']) {
    assert.throws(() => parseOwnershipFile(`version: 2\nbasePath: ${bad}\nowned: []\n`, '.ownership.yml', ROOT), /basePath/)
  }
})

test('invalid YAML is OwnershipError', () => {
  assert.throws(() => parseOwnershipFile('version: [2\n', '.ownership.yml', ROOT), OwnershipError)
})

test('the root accepts a top-level block with a name listed in plugins, and passes it on opaque', () => {
  const parsed = parseOwnershipFile(
    'version: 2\nplugins: [living-docs]\nliving-docs:\n  stale-after-months: 6\nowned: []\n',
    '.ownership.yml',
    ROOT,
  ) as RootFile

  assert.deepEqual(parsed.pluginBlocks, { 'living-docs': { 'stale-after-months': 6 } })
})

test('without a top-level block, the root pluginBlocks is empty', () => {
  const parsed = parseOwnershipFile('version: 2\nplugins: [living-docs]\nowned: []\n', '.ownership.yml', ROOT) as RootFile

  assert.deepEqual(parsed.pluginBlocks, {})
})

test('top-level block in a child file is an error, even with the name listed in the root', () => {
  assert.throws(
    () => parseOwnershipFile('version: 2\nliving-docs:\n  stale-after-months: 6\nowned: []\n', 'pkg/.ownership.yml', CHILD(['living-docs'])),
    /pkg\/\.ownership\.yml.*living-docs.*exclusive to the root file/,
  )
})

test('plugin block that is not a map is an error, at the top and in the entry', () => {
  assert.throws(
    () => parseOwnershipFile('version: 2\nplugins: [living-docs]\nliving-docs: true\nowned: []\n', '.ownership.yml', ROOT),
    /\.ownership\.yml\.living-docs.*must be a map/,
  )
  assert.throws(
    () =>
      parseOwnershipFile(
        "version: 2\nplugins: [living-docs]\nowned:\n  - path: a.md\n    owner: '@x'\n    living-docs:\n",
        '.ownership.yml',
        ROOT,
      ),
    /owned\[0\]\.living-docs.*must be a map/,
  )
})

test('plugin named after a core key is an error', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nplugins: [owned]\nowned: []\n', '.ownership.yml', ROOT), /plugins.*"owned".*core key/)
})
