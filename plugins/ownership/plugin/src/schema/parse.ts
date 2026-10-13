import { isAlias, isMap, isNode, isScalar, isSeq, LineCounter, parseDocument } from 'yaml'
import type { Document } from 'yaml'
import type { Pair, YAMLMap } from 'yaml'

import { OwnershipError } from '../errors.ts'
import { literalProblem } from '../paths/paths.ts'
import type { Origin, PluginBlock, PluginBlocks, RawFile, RawGenerated, RawOwned, RawPath } from './types.ts'

export const SUPPORTED_VERSIONS: readonly number[] = [1]
export const PLUGIN_NAME = /^[a-z][a-z0-9-]*$/

const TOP_KEYS = ['version', 'plugins', 'basePath', 'owned', 'generated', 'ignore', 'include']
const OWNED_KEYS = ['path', 'owner', 'skill', 'plugins']
const GENERATED_KEYS = ['path', 'command']

class FileReader {
  readonly file: string
  readonly text: string
  readonly lines: LineCounter
  /** The document, so that an alias is resolved to what it stands for. */
  readonly doc: Document

  constructor(file: string, text: string, lines: LineCounter, doc: Document) {
    this.file = file
    this.text = text
    this.lines = lines
    this.doc = doc
  }

  line(node: unknown): number | undefined {
    return isNode(node) && node.range ? this.lines.linePos(node.range[0]).line : undefined
  }

  /** The value as written in the file, on one line, so a map shows as `{a: 1}` and never as `[object Object]`. */
  shown(node: unknown): string {
    if (!isNode(node) || !node.range) {
      return '(empty)'
    }

    const source = this.text.slice(node.range[0], node.range[1]).replace(/\s+/g, ' ').trim()

    return source === '' ? '(empty)' : source
  }

  /**
   * The node an alias stands for, or the node itself. Every value is read through
   * here before its type is checked, so that `*name` is accepted wherever the
   * value it names would be.
   */
  resolved(node: unknown): unknown {
    return isAlias(node) ? node.resolve(this.doc) : node
  }

  /** The value of `key` in `map`, with an alias resolved. */
  get(map: YAMLMap<unknown, unknown>, key: string): unknown {
    return this.resolved(map.get(key, true))
  }

  keyOf(pair: Pair<unknown, unknown>): string {
    return isScalar(pair.key) ? String(pair.key.value) : this.shown(pair.key)
  }

  fail(keyPath: string, node: unknown, message: string, fix?: string): never {
    const line = this.line(node)

    throw new OwnershipError([{ file: this.file, keyPath, ...(line === undefined ? {} : { line }), message, ...(fix === undefined ? {} : { fix }) }])
  }
}

function stringOf(node: unknown): string | undefined {
  return isScalar(node) && typeof node.value === 'string' ? node.value : undefined
}

function syntaxError(text: string, file: string, lines: LineCounter, error: { code: string; message: string; pos: [number, number] }): OwnershipError {
  const line = lines.linePos(error.pos[0]).line

  if (error.code === 'DUPLICATE_KEY') {
    const key =
      text
        .slice(error.pos[0])
        .split(/[:\r\n]/)[0]
        ?.trim() ?? ''

    return new OwnershipError([{ file, line, message: `duplicate key "${key}"; each key appears once in a map`, fix: 'remove or rename one of the two keys' }])
  }

  return new OwnershipError([{ file, line, message: `invalid YAML: ${error.message}`, fix: 'correct the YAML syntax' }])
}

function topMap(reader: FileReader, top: unknown): YAMLMap<unknown, unknown> {
  const missing = `version is missing; supported versions: ${SUPPORTED_VERSIONS.join(', ')}`

  if (top === null || top === undefined || (isScalar(top) && top.value === null)) {
    reader.fail('version', top, missing, 'add "version: 1" at the top of the file')
  }

  if (!isMap(top)) {
    reader.fail('', top, `the file must be a map of keys; got ${reader.shown(top)}`, 'start the file with "version: 1"')
  }

  const pair = top.items.find(item => reader.keyOf(item) === 'version')

  if (pair === undefined) {
    reader.fail('version', top, missing, 'add "version: 1" at the top of the file')
  }

  const versionNode = reader.resolved(pair.value)
  const value = isScalar(versionNode) ? versionNode.value : undefined

  if (typeof value !== 'number' || !SUPPORTED_VERSIONS.includes(value)) {
    reader.fail(
      'version',
      pair.value ?? pair.key,
      `version ${reader.shown(pair.value)} is not supported; supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
      'declare "version: 1"',
    )
  }

  return top
}

function sequence(reader: FileReader, top: YAMLMap<unknown, unknown>, key: string): unknown[] {
  const node = reader.get(top, key)

  if (node === undefined) {
    return []
  }

  if (!isSeq(node)) {
    reader.fail(key, node, `${key} must be a list; got ${reader.shown(node)}`, `write ${key} as a YAML list, one "- " item per line`)
  }

  return node.items.map(item => reader.resolved(item))
}

function requiredString(reader: FileReader, map: YAMLMap<unknown, unknown>, keyPath: string, key: string): string {
  const node = reader.get(map, key)

  if (node === undefined) {
    reader.fail(`${keyPath}.${key}`, map, `${keyPath}.${key} is missing`, `add ${key} to the entry`)
  }

  const value = stringOf(node)

  if (value === undefined || value === '') {
    reader.fail(`${keyPath}.${key}`, node, `${keyPath}.${key} must be a non-empty string; got ${reader.shown(node)}`, `write ${key} as text`)
  }

  return value
}

function closedKeys(
  reader: FileReader,
  map: YAMLMap<unknown, unknown>,
  keyPath: string,
  allowed: readonly string[],
  fix: (key: string) => [string, string],
): void {
  for (const pair of map.items) {
    const key = reader.keyOf(pair)

    if (!allowed.includes(key)) {
      const [message, suggestion] = fix(key)

      reader.fail(`${keyPath}.${key}`, pair.key, message, suggestion)
    }
  }
}

function pluginBlocks(reader: FileReader, node: unknown, keyPath: string): PluginBlocks {
  if (node === undefined) {
    return {}
  }

  if (!isMap(node)) {
    reader.fail(
      keyPath,
      node,
      `${keyPath} must be a map of plugin name to block; got ${reader.shown(node)}`,
      `write each plugin as "<name>: {}" under ${keyPath}`,
    )
  }

  const blocks: Record<string, PluginBlock> = {}

  for (const pair of node.items) {
    const name = reader.keyOf(pair)
    const blockPath = `${keyPath}.${name}`

    if (!PLUGIN_NAME.test(name)) {
      reader.fail(blockPath, pair.key, `plugin name "${name}" must match ^[a-z][a-z0-9-]*$`, 'use lowercase letters, digits and "-", starting with a letter')
    }

    const block = reader.resolved(pair.value)

    if (!isMap(block)) {
      reader.fail(
        blockPath,
        pair.value ?? pair.key,
        `${blockPath} must be a map; got ${reader.shown(pair.value)}`,
        `use "${name}: {}" to declare the link without configuration`,
      )
    }

    blocks[name] = block.toJS(reader.doc) as PluginBlock
  }

  return blocks
}

interface PendingOwned {
  path: string
  pathNode: unknown
  owner: string
  skill?: string
  pluginsNode: unknown
  origin: Origin
}

function readOwned(reader: FileReader, node: unknown, index: number): PendingOwned {
  const keyPath = `owned[${index}]`

  if (!isMap(node)) {
    reader.fail(
      keyPath,
      node,
      `${keyPath} must be a map with path and owner; got ${reader.shown(node)}`,
      'write the entry as "- path: <path>" with "owner: <@owner>" below it',
    )
  }

  closedKeys(reader, node, keyPath, OWNED_KEYS, key => [
    `${keyPath} has an unknown key "${key}"`,
    `if it configures a plugin, move it under ${keyPath}.plugins.<name>; otherwise remove it`,
  ])

  const path = requiredString(reader, node, keyPath, 'path')
  const owner = requiredString(reader, node, keyPath, 'owner')

  if (!owner.startsWith('@')) {
    const ownerNode = reader.get(node, 'owner')

    reader.fail(`${keyPath}.owner`, ownerNode, `${keyPath}.owner must start with "@"; got ${reader.shown(ownerNode)}`, 'write the owner as @user or @org/team')
  }

  const skill = reader.get(node, 'skill') === undefined ? undefined : requiredString(reader, node, keyPath, 'skill')
  const line = reader.line(node)

  return {
    path,
    pathNode: reader.get(node, 'path'),
    owner,
    ...(skill === undefined ? {} : { skill }),
    pluginsNode: reader.get(node, 'plugins'),
    origin: { file: reader.file, keyPath, ...(line === undefined ? {} : { line }) },
  }
}

function readGenerated(reader: FileReader, node: unknown, index: number): RawGenerated & { pathNode: unknown } {
  const keyPath = `generated[${index}]`

  if (!isMap(node)) {
    reader.fail(
      keyPath,
      node,
      `${keyPath} must be a map with path and command; got ${reader.shown(node)}`,
      'write the entry as "- path: <file>" with "command: <command>" below it',
    )
  }

  closedKeys(reader, node, keyPath, GENERATED_KEYS, key => [
    `${keyPath} has an unknown key "${key}"; a generated entry has only path and command`,
    'remove the key',
  ])

  const path = requiredString(reader, node, keyPath, 'path')
  const pathNode = reader.get(node, 'path')

  if (path.endsWith('/')) {
    reader.fail(
      `${keyPath}.path`,
      pathNode,
      `${keyPath}.path ${reader.shown(pathNode)} ends with "/"; a generated path is a file`,
      'name the generated file, not its directory',
    )
  }

  const command = requiredString(reader, node, keyPath, 'command')
  const line = reader.line(node)

  return { path, pathNode, command, origin: { file: reader.file, keyPath, ...(line === undefined ? {} : { line }) } }
}

function readPaths(reader: FileReader, nodes: unknown[], key: 'ignore' | 'include'): (RawPath & { pathNode: unknown })[] {
  return nodes.map((node, index) => {
    const keyPath = `${key}[${index}]`
    const value = stringOf(node)

    if (value === undefined || value === '') {
      reader.fail(keyPath, node, `${keyPath} must be a non-empty string; got ${reader.shown(node)}`, 'write the path as text')
    }

    const line = reader.line(node)

    return { path: value, pathNode: node, origin: { file: reader.file, keyPath, ...(line === undefined ? {} : { line }) } }
  })
}

/** Reads one ownership file. Throws an OwnershipError with the first error found. */
export function parseOwnershipFile(text: string, file: string, options: { isRoot: boolean }): RawFile {
  const lines = new LineCounter()
  const doc = parseDocument(text, { lineCounter: lines, prettyErrors: false })
  const syntax = doc.errors[0]

  if (syntax !== undefined) {
    throw syntaxError(text, file, lines, syntax)
  }

  const reader = new FileReader(file, text, lines, doc)
  const top = topMap(reader, doc.contents)

  for (const pair of top.items) {
    const key = reader.keyOf(pair)

    if (!TOP_KEYS.includes(key)) {
      reader.fail(key, pair.key, `unknown top-level key "${key}"; the keys are ${TOP_KEYS.join(', ')}`, 'remove the key or correct its name')
    }

    if (key === 'plugins' && !options.isRoot) {
      reader.fail('plugins', pair.key, 'plugins is only allowed in the root ownership file', 'move this block to the plugins of the root ownership file')
    }
  }

  const baseNode = reader.get(top, 'basePath')
  const baseValue = stringOf(baseNode)

  if (baseNode !== undefined && baseValue === undefined) {
    reader.fail('basePath', baseNode, `basePath must be a string; got ${reader.shown(baseNode)}`, 'write basePath as a directory path')
  }

  const owned = sequence(reader, top, 'owned').map((node, index) => readOwned(reader, node, index))
  const generated = sequence(reader, top, 'generated').map((node, index) => readGenerated(reader, node, index))
  const ignore = readPaths(reader, sequence(reader, top, 'ignore'), 'ignore')
  const include = readPaths(reader, sequence(reader, top, 'include'), 'include')

  const rootPlugins = pluginBlocks(reader, reader.get(top, 'plugins'), 'plugins')
  const entryPlugins = owned.map(entry => pluginBlocks(reader, entry.pluginsNode, `${entry.origin.keyPath}.plugins`))

  const literal = (keyPath: string, node: unknown, path: string): void => {
    const problem = literalProblem(path)

    if (problem !== null) {
      reader.fail(keyPath, node, `${keyPath} ${reader.shown(node)} ${problem}`, 'write the literal path of the file or directory')
    }
  }

  owned.forEach(entry => literal(`${entry.origin.keyPath}.path`, entry.pathNode, entry.path))
  generated.forEach(entry => literal(`${entry.origin.keyPath}.path`, entry.pathNode, entry.path))
  ignore.forEach(entry => literal(entry.origin.keyPath, entry.pathNode, entry.path))

  const baseLine = reader.line(baseNode)

  return {
    file,
    ...(baseValue === undefined
      ? {}
      : { basePath: { path: baseValue, origin: { file, keyPath: 'basePath', ...(baseLine === undefined ? {} : { line: baseLine }) } } }),
    plugins: rootPlugins,
    owned: owned.map((entry, index): RawOwned => ({
      path: entry.path,
      owner: entry.owner,
      ...(entry.skill === undefined ? {} : { skill: entry.skill }),
      plugins: entryPlugins[index] ?? {},
      origin: entry.origin,
    })),
    generated: generated.map(({ path, command, origin }) => ({ path, command, origin })),
    ignore: ignore.map(({ path, origin }) => ({ path, origin })),
    include: include.map(({ path, origin }) => ({ path, origin })),
  }
}
