import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, posix } from 'node:path'
import { locateRootFile } from './candidates.ts'
import { parseOwnershipFile } from '../schema/parse.ts'
import { OwnershipError } from '../schema/types.ts'
import type { DerivesFrom, FormatBlock, GeneratedRuleRaw, ParsedFile, RootFile, WatchRuleRaw } from '../schema/types.ts'

export interface ResolvedOwnedRule {
  path: string
  owner: string
  skill: string | null
  states: string[] | null
  format: FormatBlock
  derivesFrom: DerivesFrom | null
  pluginBlocks: Record<string, Record<string, unknown>>
  /** Arquivo de ownership que declarou esta entrada. */
  origin: string
}

export interface ResolvedGeneratedRule extends GeneratedRuleRaw {
  origin: string
}

export interface ResolvedWatchRule extends WatchRuleRaw {
  origin: string
}

/** Cada arquivo lido e a base dele — é o que deixa o `explain` dizer quem deveria governar um caminho sem dono. */
export interface ResolvedFile {
  file: string
  base: string
}

export interface ResolvedConfig {
  version: 2
  plugins: string[]
  /** Blocos de topo do arquivo raiz, por nome de plugin — opacos ao núcleo. */
  pluginBlocks: Record<string, Record<string, unknown>>
  owned: ResolvedOwnedRule[]
  generated: ResolvedGeneratedRule[]
  watches: ResolvedWatchRule[]
  ignore: string[]
  files: ResolvedFile[]
  rootDir: string
  rootFile: string
}

export interface ResolveOptions {
  explicitPath?: string | null
  env?: Record<string, string | undefined>
  /** Poda: só lê arquivos incluídos cujo diretório é ancestral de algum destes caminhos. */
  onlyFor?: readonly string[]
}

function joinRel(base: string, entry: string): string {
  const combined = base === '' ? entry : `${base}/${entry}`
  const normalized = posix.normalize(combined.replace(/\\/g, '/'))

  return entry.endsWith('/') && !normalized.endsWith('/') ? `${normalized}/` : normalized
}

function withinBase(base: string, resolvedPath: string): boolean {
  if (resolvedPath === '..' || resolvedPath.startsWith('../')) {
    return false
  }

  return base === '' || resolvedPath === base || resolvedPath === `${base}/` || resolvedPath.startsWith(`${base}/`)
}

/** Diretório do arquivo mais o `basePath` — que o parser já garantiu não subir nem ter glob. */
function baseOf(file: ParsedFile): string {
  const base = file.basePath === null ? file.dir : joinRel(file.dir, file.basePath)

  return base.replace(/\/$/, '')
}

/**
 * `watches[].doc` fica de fora: é o único campo que nunca é caminho editado, e é o
 * que deixa um pacote apontar para o CHANGELOG da raiz (spec §5).
 */
function assertConfinement(file: ParsedFile, base: string): void {
  const declared: string[] = [
    ...file.owned.flatMap(rule => (rule.derivesFrom === null ? [rule.path] : [rule.path, rule.derivesFrom.source])),
    ...file.generated.map(rule => rule.path),
    ...file.watches.map(rule => rule.code),
    ...file.ignore,
    ...file.include,
  ]

  for (const entry of declared) {
    const resolved = joinRel(base, entry)

    if (!withinBase(base, resolved)) {
      throw new OwnershipError(
        `${file.file}: "${entry}" resolves to "${resolved}", outside the file base ("${base || '.'}"). ` +
          'A path that can be edited never escapes the base of the file that declares it.',
      )
    }
  }
}

const OWNERSHIP_FILE_NAME = /^\.?ownership(?:\.[^/.]+)?\.ya?ml$/

function listOwnershipFilesIn(repoRoot: string, dir: string): string[] {
  let entries: string[]

  try {
    entries = readdirSync(join(repoRoot, dir))
  } catch {
    return []
  }

  return entries.filter(entry => OWNERSHIP_FILE_NAME.test(entry) && statSync(join(repoRoot, dir, entry)).isFile()).map(entry => joinRel(dir, entry))
}

function dirOf(file: string): string {
  const dir = posix.dirname(file)

  return dir === '.' ? '' : dir
}

function isAncestorOfAny(dir: string, paths: readonly string[] | undefined): boolean {
  if (paths === undefined || dir === '') {
    return true
  }

  return paths.some(path => path.replace(/\\/g, '/').startsWith(`${dir}/`))
}

function readOwnershipFile(repoRoot: string, file: string, referencedBy: string): string {
  try {
    return readFileSync(join(repoRoot, file), 'utf8')
  } catch {
    throw new OwnershipError(`${referencedBy}: include points to "${file}", which does not exist or cannot be read.`)
  }
}

function collectTree(repoRoot: string, root: RootFile, onlyFor: readonly string[] | undefined): ParsedFile[] {
  const files: ParsedFile[] = [root]
  const seen = new Set<string>([root.file])

  function walk(file: ParsedFile, base: string, ancestors: readonly string[]): void {
    for (const entry of file.include) {
      const target = joinRel(base, entry)
      // Poda pelo diretório: como `basePath` só desce, a base do incluído é
      // descendente dele, e um diretório que não alcança também não alcança por ela.
      const targetDir = entry.endsWith('/') ? target.replace(/\/$/, '') : dirOf(target)

      if (!isAncestorOfAny(targetDir, onlyFor)) {
        continue
      }

      let includedFile: string

      if (entry.endsWith('/')) {
        const candidates = listOwnershipFilesIn(repoRoot, target)

        if (candidates.length === 0) {
          throw new OwnershipError(`${file.file}: include "${entry}" has no ownership file inside.`)
        }
        if (candidates.length > 1) {
          throw new OwnershipError(`${file.file}: include "${entry}" is ambiguous — ${candidates.join(', ')}. Name the file explicitly.`)
        }
        includedFile = candidates[0]!
      } else {
        includedFile = target
      }

      if (ancestors.includes(includedFile)) {
        throw new OwnershipError(`Include cycle: ${[...ancestors, includedFile].join(' → ')}.`)
      }
      if (seen.has(includedFile)) {
        throw new OwnershipError(`${file.file}: "${includedFile}" was already included by another file. An ownership file is included only once.`)
      }
      seen.add(includedFile)

      const parsed = parseOwnershipFile(readOwnershipFile(repoRoot, includedFile, file.file), includedFile, { isRoot: false, pluginNames: root.plugins }) as ParsedFile

      if (parsed.version !== root.version) {
        throw new OwnershipError(`${includedFile}: version ${parsed.version} differs from ${root.file} (version ${root.version}). One repository, one schema.`)
      }

      const childBase = baseOf(parsed)

      assertConfinement(parsed, childBase)
      files.push(parsed)
      walk(parsed, childBase, [...ancestors, includedFile])
    }
  }

  walk(root, baseOf(root), [root.file])

  return files
}

/** Contenção de diretório: `docs/` contém `docs/adr/x.md`; dois arquivos só colidem se forem o mesmo. */
function collides(a: string, b: string): boolean {
  if (a === b) {
    return true
  }

  return (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b))
}

interface Declared {
  path: string
  file: string
}

function assertDisjoint(declared: readonly Declared[], what: string): void {
  for (let i = 0; i < declared.length; i += 1) {
    for (let j = i + 1; j < declared.length; j += 1) {
      const a = declared[i]!
      const b = declared[j]!

      if (collides(a.path, b.path)) {
        throw new OwnershipError(
          `${what}: "${a.path}" (${a.file}) collides with "${b.path}" (${b.file}). ` + 'A path is governed by a single declaration — none contains another.',
        )
      }
    }
  }
}

function collectOwned(files: readonly ParsedFile[]): ResolvedOwnedRule[] {
  const resolved: ResolvedOwnedRule[] = []

  for (const file of files) {
    const base = baseOf(file)

    for (const rule of file.owned) {
      resolved.push({
        path: joinRel(base, rule.path),
        owner: rule.owner,
        skill: rule.skill,
        states: rule.states,
        format: rule.format,
        derivesFrom: rule.derivesFrom === null ? null : { ...rule.derivesFrom, source: joinRel(base, rule.derivesFrom.source) },
        pluginBlocks: rule.pluginBlocks,
        origin: file.file,
      })
    }
  }

  assertDisjoint(
    resolved.map(rule => ({ path: rule.path, file: rule.origin })),
    'owned',
  )

  return resolved
}

export function resolveOwnership(repoRoot: string, opts: ResolveOptions = {}): ResolvedConfig | null {
  const rootFile = locateRootFile(repoRoot, opts)

  if (rootFile === null) {
    return null
  }

  const parsedRoot = parseOwnershipFile(readFileSync(join(repoRoot, rootFile), 'utf8'), rootFile, { isRoot: true, pluginNames: [] }) as RootFile
  // A base da raiz é a raiz do repositório, more o arquivo onde morar (spec §5).
  const root: RootFile = { ...parsedRoot, dir: '' }
  const rootBase = baseOf(root)

  assertConfinement(root, rootBase)
  const files = collectTree(repoRoot, root, opts.onlyFor)

  const generated: ResolvedGeneratedRule[] = files.flatMap(file =>
    file.generated.map(rule => ({ ...rule, path: joinRel(baseOf(file), rule.path), origin: file.file })),
  )
  const watches: ResolvedWatchRule[] = files.flatMap(file =>
    file.watches.map(rule => ({ ...rule, code: joinRel(baseOf(file), rule.code), doc: joinRel(baseOf(file), rule.doc), origin: file.file })),
  )
  const ignore = files.flatMap(file => file.ignore.map(entry => joinRel(baseOf(file), entry)))

  assertDisjoint(
    generated.map(rule => ({ path: rule.path, file: rule.origin })),
    'generated',
  )

  return {
    version: 2,
    plugins: root.plugins,
    pluginBlocks: root.pluginBlocks,
    owned: collectOwned(files),
    generated,
    watches,
    ignore,
    files: files.map(file => ({ file: file.file, base: baseOf(file) })),
    rootDir: repoRoot,
    rootFile,
  }
}

function normalize(repoPath: string): string {
  return repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
}

function covers(declared: string, repoPath: string): boolean {
  const target = declared.replace(/\\/g, '/')

  return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target
}

/** A regra de `owned[]` que governa este caminho — a disjunção garante que é uma só. */
export function findOwnedRule(config: ResolvedConfig, repoPath: string): ResolvedOwnedRule | null {
  const target = normalize(repoPath)

  return config.owned.find(rule => covers(rule.path, target)) ?? null
}

export function findGeneratedRule(config: ResolvedConfig, repoPath: string): ResolvedGeneratedRule | null {
  const target = normalize(repoPath)

  return config.generated.find(rule => normalize(rule.path) === target) ?? null
}
