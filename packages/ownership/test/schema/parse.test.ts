import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OwnershipError, parseOwnershipFile } from '../../src/schema/parse.ts'
import type { RootFile } from '../../src/schema/types.ts'

const ROOT = { isRoot: true, pluginNames: [] }
const CHILD = (pluginNames: string[] = []) => ({ isRoot: false, pluginNames })

test('raiz exige version: 2', () => {
  assert.throws(() => parseOwnershipFile('owned: []\n', '.ownership.yml', ROOT), /version.*2/)
})

test('raiz aceita version: 2 e plugins: vazio por padrão', () => {
  const parsed = parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT) as { plugins: string[] }

  assert.deepEqual(parsed.plugins, [])
})

test('arquivo filho exige version e recusa plugins', () => {
  assert.throws(() => parseOwnershipFile('owned: []\n', 'packages/api/.ownership.yml', CHILD()), /version/)
  assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nplugins: [x]\n', 'packages/api/.ownership.yml', CHILD()), /exclusive to the root file/)
})

test('chave de topo desconhecida é erro', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nfoo: 1\n', '.ownership.yml', ROOT), /"foo"/)
})

test('versão 1 é recusada em voz alta, dizendo que o esquema mudou', () => {
  assert.throws(() => parseOwnershipFile('version: 1\nartifacts: []\n', 'docs/.ownership.yml', ROOT), /schema v1.*not read.*rewrite/)
})

test('owned, generated e watches que não são lista são erro, não lista vazia', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nowned: {}\n', '.ownership.yml', ROOT), /owned.*list/)
  assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nwatches: x\n', '.ownership.yml', ROOT), /watches.*list/)
})

test('owned exige owner começando com @', () => {
  const source = 'version: 2\nowned:\n  - path: docs/x/\n    owner: sem-arroba\n'

  assert.throws(() => parseOwnershipFile(source, '.ownership.yml', ROOT), /@/)
})

test('owner ausente é erro — não há de onde herdar', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nowned:\n  - path: ./\n    skill: outro\n', 'packages/api/.ownership.yml', CHILD()), /owner/)
})

test('per-file aceita format só para state-field; key é erro', () => {
  const ok = 'version: 2\nowned:\n  - path: docs/adr/\n    owner: "@a"\n    format:\n      collection: per-file\n      state-field: Situação\n'
  const parsed = parseOwnershipFile(ok, '.ownership.yml', ROOT) as { owned: { format: { collection: string; stateField: string } }[] }

  assert.equal(parsed.owned[0]?.format.collection, 'per-file')
  assert.equal(parsed.owned[0]?.format.stateField, 'situação')

  const bad = 'version: 2\nowned:\n  - path: docs/adr/\n    owner: "@a"\n    format:\n      collection: per-file\n      key: ID\n'

  assert.throws(() => parseOwnershipFile(bad, '.ownership.yml', ROOT), /"key"/)
})

test('owned per-file não declara format', () => {
  const source = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    skill: decision-recorder\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { collection: string } }[] }

  assert.equal(parsed.owned[0]?.format.collection, 'per-file')
})

test('owned com format: table exige key nomeando a coluna', () => {
  const source = 'version: 2\nowned:\n  - path: docs/open-decisions.md\n    owner: "@a"\n    format:\n      collection: table\n'

  assert.throws(() => parseOwnershipFile(source, '.ownership.yml', ROOT), /format: needs a non-empty `key` field/)
})

test('owned com format: sections aceita key: first-token (padrão) ou heading', () => {
  const source =
    'version: 2\nowned:\n  - path: docs/requirements/rules.md\n    owner: "@a"\n    format:\n      collection: sections\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { keyMode: string | null } }[] }

  assert.equal(parsed.owned[0]?.format.keyMode, 'first-token')
})

test('state-field é opcional, default "status", normalizado', () => {
  const source =
    'version: 2\nowned:\n  - path: docs/open-decisions.md\n    owner: "@a"\n    format:\n      collection: table\n      key: ID\n      state-field: Situação\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { stateField: string } }[] }

  assert.equal(parsed.owned[0]?.format.stateField, 'situação')
})

test('derives-from exige source e field', () => {
  const source =
    'version: 2\nowned:\n  - path: docs/superpowers/plans/\n    owner: "@a"\n    derives-from:\n      source: docs/superpowers/specs/\n      field: spec\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { derivesFrom: { source: string; field: string } | null }[] }

  assert.deepEqual(parsed.owned[0]?.derivesFrom, { source: 'docs/superpowers/specs/', field: 'spec' })
})

test('bloco de plugin passa opaco quando o nome está em plugins:, e reprova quando não está', () => {
  const withBlock = 'version: 2\nplugins: [living-docs]\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    living-docs:\n      id-prefix: ADR\n'
  const parsed = parseOwnershipFile(withBlock, '.ownership.yml', ROOT) as { owned: { pluginBlocks: Record<string, unknown> }[] }

  assert.deepEqual(parsed.owned[0]?.pluginBlocks, { 'living-docs': { 'id-prefix': 'ADR' } })

  const withoutDeclared = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    living-docs:\n      id-prefix: ADR\n'

  assert.throws(() => parseOwnershipFile(withoutDeclared, '.ownership.yml', ROOT), /"living-docs"/)
})

test('generated e watches são estritos em chave desconhecida', () => {
  assert.throws(
    () => parseOwnershipFile('version: 2\nowned: []\ngenerated:\n  - path: a.md\n    command: x\n    extra: 1\n', '.ownership.yml', ROOT),
    /"extra"/,
  )
  assert.throws(
    () => parseOwnershipFile('version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: a.md\n    extra: 1\n', '.ownership.yml', ROOT),
    /"extra"/,
  )
})

test('watches lê consumer-visible e reason opcionais', () => {
  const source = 'version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: CHANGELOG.md\n    consumer-visible: true\n    reason: "x"\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { watches: { consumerVisible: boolean; reason: string | null }[] }

  assert.equal(parsed.watches[0]?.consumerVisible, true)
  assert.equal(parsed.watches[0]?.reason, 'x')
})

test('ignore e include são listas de string', () => {
  const source = 'version: 2\nowned: []\nignore: ["node_modules/**"]\ninclude: ["packages/api/"]\n'
  const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { ignore: string[]; include: string[] }

  assert.deepEqual(parsed.ignore, ['node_modules/**'])
  assert.deepEqual(parsed.include, ['packages/api/'])
})

test('dir do arquivo é derivado do próprio caminho', () => {
  const rootParsed = parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT)
  const childParsed = parseOwnershipFile('version: 2\nowned: []\n', 'packages/api/.ownership.yml', CHILD())

  assert.equal(rootParsed.dir, '')
  assert.equal(childParsed.dir, 'packages/api')
})

test('basePath é normalizado, e só desce', () => {
  const parsed = parseOwnershipFile('version: 2\nbasePath: packages/api/\nowned: []\n', 'ownership.api.yml', ROOT) as { basePath: string | null }

  assert.equal(parsed.basePath, 'packages/api')
  assert.equal((parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT) as { basePath: string | null }).basePath, null)

  for (const bad of ['../web', '/abs', 'packages/*', 'packages/../../web']) {
    assert.throws(() => parseOwnershipFile(`version: 2\nbasePath: ${bad}\nowned: []\n`, '.ownership.yml', ROOT), /basePath/)
  }
})

test('YAML inválido é OwnershipError', () => {
  assert.throws(() => parseOwnershipFile('version: [2\n', '.ownership.yml', ROOT), OwnershipError)
})

test('a raiz aceita bloco de topo com nome listado em plugins, e o repassa opaco', () => {
  const parsed = parseOwnershipFile(
    'version: 2\nplugins: [living-docs]\nliving-docs:\n  stale-after-months: 6\nowned: []\n',
    '.ownership.yml',
    ROOT,
  ) as RootFile

  assert.deepEqual(parsed.pluginBlocks, { 'living-docs': { 'stale-after-months': 6 } })
})

test('sem bloco de topo, pluginBlocks da raiz é vazio', () => {
  const parsed = parseOwnershipFile('version: 2\nplugins: [living-docs]\nowned: []\n', '.ownership.yml', ROOT) as RootFile

  assert.deepEqual(parsed.pluginBlocks, {})
})

test('bloco de topo num arquivo filho é erro, mesmo com o nome listado na raiz', () => {
  assert.throws(
    () => parseOwnershipFile('version: 2\nliving-docs:\n  stale-after-months: 6\nowned: []\n', 'pkg/.ownership.yml', CHILD(['living-docs'])),
    /pkg\/\.ownership\.yml.*living-docs.*exclusive to the root file/,
  )
})

test('bloco de plugin que não é mapa é erro, no topo e na entrada', () => {
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

test('plugin com o nome de uma core key é erro', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nplugins: [owned]\nowned: []\n', '.ownership.yml', ROOT), /plugins.*"owned".*core key/)
})
