import { posix } from 'node:path'
import YAML from 'yaml'
import { OwnershipError } from './types.ts'
import type { DerivesFrom, FormatBlock, GeneratedRuleRaw, OwnedRuleRaw, ParsedFile, RootFile, WatchRuleRaw } from './types.ts'

export { OwnershipError } from './types.ts'
export type { Collection, DerivesFrom, FormatBlock, GeneratedRuleRaw, OwnedRuleRaw, ParsedFile, RootFile, SectionKeyMode, WatchRuleRaw } from './types.ts'

export interface ParseOptions {
  isRoot: boolean
  /** Nomes de plugin válidos como bloco dentro de `owned[]` — vêm de `plugins:` na raiz. */
  pluginNames: readonly string[]
}

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new OwnershipError(`${where}: precisa ser um mapa.`)
  }

  return value as Record<string, unknown>
}

function asStringList(value: unknown, where: string): string[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new OwnershipError(`${where}: precisa ser uma lista de strings.`)
  }

  return value as string[]
}

/** Ausente é lista vazia; presente e não-lista é erro — nunca vira `[]` em silêncio. */
function asList(value: unknown, where: string): unknown[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new OwnershipError(`${where}: precisa ser uma lista.`)
  }

  return value
}

function requireString(source: Record<string, unknown>, key: string, where: string): string {
  const value = source[key]

  if (typeof value !== 'string' || value.trim() === '') {
    throw new OwnershipError(`${where}: precisa do campo \`${key}\` não vazio.`)
  }

  return value
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase()
}

function dirOf(file: string): string {
  const dir = posix.dirname(file.replace(/\\/g, '/'))

  return dir === '.' ? '' : dir
}

function assertKnownKeys(item: Record<string, unknown>, allowed: ReadonlySet<string>, where: string, hint = ''): void {
  for (const key of Object.keys(item)) {
    if (!allowed.has(key)) {
      throw new OwnershipError(`${where}: chave "${key}" desconhecida.${hint}`)
    }
  }
}

function parseFormat(raw: unknown, where: string): FormatBlock {
  if (raw === undefined) {
    return { collection: 'per-file', key: null, keyMode: null, stateField: 'status' }
  }

  const item = asRecord(raw, `${where}.format`)
  const stateFieldRaw = item['state-field'] ?? 'status'

  if (typeof stateFieldRaw !== 'string' || stateFieldRaw.trim() === '') {
    throw new OwnershipError(`${where}.format.state-field: precisa ser uma string não vazia.`)
  }
  const stateField = normalizeKey(stateFieldRaw)

  // per-file não tem chave a localizar (a identidade é o arquivo), mas o
  // estado ainda mora num campo do frontmatter, e esse campo é configurável
  // (spec §3, `state-field`). O bloco existe só para isso: `key` é erro.
  if (item.collection === 'per-file') {
    assertKnownKeys(item, new Set(['collection', 'state-field']), `${where}.format`, ' Em per-file a identidade é o arquivo.')

    return { collection: 'per-file', key: null, keyMode: null, stateField }
  }
  if (item.collection === 'table') {
    assertKnownKeys(item, new Set(['collection', 'key', 'state-field']), `${where}.format`)
    const key = requireString(item, 'key', `${where}.format`)

    return { collection: 'table', key, keyMode: null, stateField }
  }
  if (item.collection === 'sections') {
    assertKnownKeys(item, new Set(['collection', 'key', 'state-field']), `${where}.format`)
    const keyMode = item.key ?? 'first-token'

    if (keyMode !== 'first-token' && keyMode !== 'heading') {
      throw new OwnershipError(`${where}.format.key: precisa ser "first-token" ou "heading" (recebido: ${String(keyMode)}).`)
    }

    return { collection: 'sections', key: null, keyMode, stateField }
  }

  throw new OwnershipError(`${where}.format.collection: precisa ser "per-file", "table" ou "sections".`)
}

function parseDerivesFrom(raw: unknown, where: string): DerivesFrom | null {
  if (raw === undefined) {
    return null
  }
  const item = asRecord(raw, `${where}.derives-from`)

  assertKnownKeys(item, new Set(['source', 'field']), `${where}.derives-from`)

  return {
    source: requireString(item, 'source', `${where}.derives-from`),
    field: requireString(item, 'field', `${where}.derives-from`),
  }
}

const OWNED_CORE_KEYS = new Set(['path', 'owner', 'skill', 'states', 'format', 'derives-from'])

function parseOwned(raw: unknown, index: number, file: string, pluginNames: readonly string[]): OwnedRuleRaw {
  const where = `${file}: owned[${index}]`
  const item = asRecord(raw, where)

  for (const key of Object.keys(item)) {
    if (OWNED_CORE_KEYS.has(key) || pluginNames.includes(key)) {
      continue
    }
    throw new OwnershipError(`${where}: chave "${key}" desconhecida. Se é de um plugin, declare-o em \`plugins:\` na raiz.`)
  }

  const ownerRaw = item.owner

  if (typeof ownerRaw !== 'string' || !ownerRaw.startsWith('@')) {
    throw new OwnershipError(`${where}.owner "${String(ownerRaw)}" precisa ser uma string começando com @. Toda entrada declara o próprio dono.`)
  }

  const owner = ownerRaw

  const skill = item.skill

  if (skill !== undefined && (typeof skill !== 'string' || skill.trim() === '')) {
    throw new OwnershipError(`${where}.skill: precisa ser uma string não vazia, ou ficar ausente.`)
  }

  const pluginBlocks: Record<string, unknown> = {}

  for (const name of pluginNames) {
    if (item[name] !== undefined) {
      pluginBlocks[name] = item[name]
    }
  }

  return {
    path: requireString(item, 'path', where),
    owner,
    skill: skill === undefined ? null : skill,
    states: item.states === undefined ? null : asStringList(item.states, `${where}.states`),
    format: parseFormat(item.format, where),
    formatDeclared: item.format !== undefined,
    derivesFrom: parseDerivesFrom(item['derives-from'], where),
    pluginBlocks,
  }
}

function parseGenerated(raw: unknown, index: number, file: string): GeneratedRuleRaw {
  const where = `${file}: generated[${index}]`
  const item = asRecord(raw, where)

  assertKnownKeys(item, new Set(['path', 'command']), where)

  return { path: requireString(item, 'path', where), command: requireString(item, 'command', where) }
}

function parseWatch(raw: unknown, index: number, file: string): WatchRuleRaw {
  const where = `${file}: watches[${index}]`
  const item = asRecord(raw, where)

  assertKnownKeys(item, new Set(['code', 'doc', 'reason', 'consumer-visible']), where)
  const reason = item.reason

  return {
    code: requireString(item, 'code', where),
    doc: requireString(item, 'doc', where),
    reason: typeof reason === 'string' ? reason : null,
    consumerVisible: item['consumer-visible'] === true,
  }
}

const ROOT_KEYS = new Set(['version', 'plugins', 'basePath', 'owned', 'generated', 'watches', 'ignore', 'include'])
const CHILD_KEYS = new Set(['version', 'basePath', 'owned', 'generated', 'watches', 'ignore', 'include'])

/** Só desce: sem `..`, sem glob, sem caminho absoluto — é o que mantém a poda correta sem abrir o arquivo (spec §5). */
function parseBasePath(value: unknown, file: string): string | null {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new OwnershipError(`${file}: \`basePath\` precisa ser uma string não vazia.`)
  }

  const normalized = value.replace(/\\/g, '/').replace(/\/$/, '')

  if (normalized.startsWith('/') || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../') || normalized.includes('*')) {
    throw new OwnershipError(`${file}: \`basePath\` "${value}" precisa apontar para dentro do diretório do arquivo — sem \`..\`, sem glob e sem caminho absoluto.`)
  }

  return normalized
}

export function parseOwnershipFile(source: string, file: string, opts: ParseOptions): ParsedFile | RootFile {
  let raw: unknown

  try {
    raw = YAML.parse(source)
  } catch (err) {
    throw new OwnershipError(`${file}: YAML inválido — ${err instanceof Error ? err.message : String(err)}`)
  }

  const root = asRecord(raw, file)

  let pluginNames = opts.pluginNames
  let plugins: string[] | undefined

  // A versão vem antes da checagem de chaves, e vale para todo arquivo, não só a
  // raiz: um arquivo v1 tem `artifacts`/`documents`, e "chave desconhecida"
  // esconderia o motivo real.
  if (root.version === 1) {
    throw new OwnershipError(
      `${file}: esquema v1 — o núcleo só lê a v2 (lista \`owned\`, blocos por plugin). ` +
        'Migre o arquivo antes de usar `ownership`; a migração ainda não tem comando próprio.',
    )
  }
  if (root.version !== 2) {
    throw new OwnershipError(`${file}: campo \`version\` precisa ser 2 (recebido: ${String(root.version)}).`)
  }

  assertKnownKeys(root, opts.isRoot ? ROOT_KEYS : CHILD_KEYS, file, opts.isRoot ? '' : ' `plugins` é exclusivo do arquivo raiz.')

  if (opts.isRoot) {
    plugins = asStringList(root.plugins, `${file}.plugins`)
    pluginNames = plugins
  }

  const ownedRaw = asList(root.owned, `${file}.owned`)
  const generatedRaw = asList(root.generated, `${file}.generated`)
  const watchesRaw = asList(root.watches, `${file}.watches`)

  const parsed: ParsedFile = {
    file,
    dir: dirOf(file),
    version: 2,
    basePath: parseBasePath(root.basePath, file),
    owned: ownedRaw.map((entry, i) => parseOwned(entry, i, file, pluginNames)),
    generated: generatedRaw.map((entry, i) => parseGenerated(entry, i, file)),
    watches: watchesRaw.map((entry, i) => parseWatch(entry, i, file)),
    ignore: asStringList(root.ignore, `${file}.ignore`),
    include: asStringList(root.include, `${file}.include`),
  }

  return opts.isRoot ? { ...parsed, plugins: plugins ?? [] } : parsed
}
