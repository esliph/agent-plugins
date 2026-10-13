import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

import { OwnershipError } from '../errors.ts'
import { dirOf, literalProblem, normalizePath, resolveUnder, toPosix } from '../paths/paths.ts'
import { parseOwnershipFile } from '../schema/parse.ts'
import type { Origin, RawFile, RawPath } from '../schema/types.ts'

export const ROOT_CANDIDATES = ['.ownership.yml', 'docs/.ownership.yml'] as const

const INCLUDE_NAME = /^(?:ownership\.yml|\.ownership\.yml|\.ownership\.[^/]+\.ya?ml)$/

export interface LoadedFile {
  path: string
  base: string
  /** Paths already resolved against `base`, relative to the repository root. */
  raw: RawFile
  includedBy?: string
}

function errorAt(origin: Origin, keyPath: string, message: string, fix?: string): OwnershipError {
  return new OwnershipError([
    { file: origin.file, keyPath, ...(origin.line === undefined ? {} : { line: origin.line }), message, ...(fix === undefined ? {} : { fix }) },
  ])
}

function location(origin: Origin): string {
  return origin.line === undefined ? origin.file : `${origin.file}:${origin.line}`
}

function displayPath(root: string, absolute: string): string {
  const relativePath = relative(root, absolute)

  return relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath) ? toPosix(absolute) : toPosix(relativePath)
}

/** The root ownership file, relative to the repository root, or null when the repository has none. */
export function findRootFile(root: string, explicit?: string): string | null {
  if (explicit !== undefined && explicit !== '') {
    const absolute = resolve(root, explicit)

    if (!existsSync(absolute)) {
      throw new OwnershipError([
        { file: explicit, message: `the ownership file ${explicit} does not exist`, fix: 'correct the path given by --ownership or OWNERSHIP_CONFIG' },
      ])
    }

    return displayPath(root, absolute)
  }

  const present = ROOT_CANDIDATES.filter(candidate => existsSync(resolve(root, candidate)))

  if (present.length > 1) {
    throw new OwnershipError([
      {
        file: present[0] ?? ROOT_CANDIDATES[0],
        message: `two root ownership files: ${present.join(' and ')}; the root is one file`,
        fix: 'merge them into one, or point --ownership at the one to use',
      },
    ])
  }

  return present[0] ?? null
}

function baseOf(file: string, raw: RawFile): string {
  const dir = dirOf(file)

  if (raw.basePath === undefined) {
    return dir
  }

  const declared = raw.basePath.path
  const posix = toPosix(declared)
  const escapes = /(^|\/)\.\.(\/|$)/.test(posix) || /^[A-Za-z]:/.test(posix) || literalProblem(posix) !== null

  if (escapes) {
    throw errorAt(
      raw.basePath.origin,
      'basePath',
      `basePath "${declared}" must only descend from the directory of the file: no "..", no glob, no absolute path`,
      'write basePath as a directory below the directory of the file',
    )
  }

  return `${dir}${normalizePath(`${posix}/`)}`
}

function confine(raw: RawFile, base: string): RawFile {
  const place = (keyPath: string, origin: Origin, path: string, mayBeRoot: boolean): string => {
    const resolved = resolveUnder(base, path)

    if (!resolved.ok) {
      throw errorAt(
        origin,
        keyPath,
        `${keyPath} "${path}" resolves to "${resolved.resolved}", outside the base "${base === '' ? './' : base}" of ${raw.file}`,
        'declare the path in an ownership file whose base contains it',
      )
    }

    if (resolved.path === '' && !mayBeRoot) {
      throw errorAt(
        origin,
        keyPath,
        `${keyPath} "${path}" resolves to the repository root; an entry names a file or a directory inside it`,
        'declare the files and directories of the root one by one',
      )
    }

    return resolved.path
  }

  return {
    ...raw,
    owned: raw.owned.map(entry => ({ ...entry, path: place(`${entry.origin.keyPath}.path`, entry.origin, entry.path, false) })),
    generated: raw.generated.map(entry => ({ ...entry, path: place(`${entry.origin.keyPath}.path`, entry.origin, entry.path, false) })),
    ignore: raw.ignore.map(entry => ({ ...entry, path: place(entry.origin.keyPath, entry.origin, entry.path, false) })),
    include: raw.include.map(entry => ({ ...entry, path: place(entry.origin.keyPath, entry.origin, entry.path, true) })),
  }
}

function includeTarget(root: string, item: RawPath): string {
  const keyPath = item.origin.keyPath

  if (item.path !== '' && !item.path.endsWith('/')) {
    return item.path
  }

  let names: string[]

  try {
    names = readdirSync(resolve(root, item.path))
  } catch {
    throw errorAt(item.origin, keyPath, `${keyPath} names the directory ${item.path || './'}, which does not exist`, 'correct the include path')
  }

  const found = names.filter(name => INCLUDE_NAME.test(name)).sort()

  if (found.length === 0) {
    throw errorAt(
      item.origin,
      keyPath,
      `${keyPath} names the directory ${item.path || './'}, which holds no ownership file`,
      `add .ownership.yml to it, or name the file to include`,
    )
  }

  if (found.length > 1) {
    throw errorAt(
      item.origin,
      keyPath,
      `${keyPath} names the directory ${item.path || './'}, which holds ${found.length} ownership files: ${found.join(', ')}`,
      'name the file to include',
    )
  }

  return `${item.path}${found[0] ?? ''}`
}

function read(root: string, file: string, includer: Origin | undefined): string {
  try {
    return readFileSync(resolve(root, file), 'utf8')
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'does not exist' : 'cannot be read'

    if (includer === undefined) {
      throw new OwnershipError([{ file, message: `the ownership file ${reason}` }])
    }

    throw errorAt(includer, includer.keyPath, `${includer.keyPath} names ${file}, which ${reason}`, 'correct the include path, or create the file')
  }
}

/**
 * Reads the root file and every file it includes, depth-first. A file is read
 * once in the whole repository. With `prune`, only the includes whose
 * directory is an ancestor of a pruned path are followed — safe because a base
 * only descends.
 */
export function loadFiles(root: string, rootFile: string, prune?: readonly string[]): LoadedFile[] {
  const loaded: LoadedFile[] = []
  const includers = new Map<string, Origin>()

  const visit = (file: string, includer: Origin | undefined, chain: readonly string[]): void => {
    const raw = parseOwnershipFile(read(root, file, includer), file, { isRoot: includer === undefined })
    const base = includer === undefined ? '' : baseOf(file, raw)
    const confined = confine(raw, base)

    loaded.push({ path: file, base, raw: confined, ...(includer === undefined ? {} : { includedBy: includer.file }) })

    for (const item of confined.include) {
      const target = includeTarget(root, item)

      if (prune !== undefined && !prune.some(path => path.startsWith(dirOf(target)))) {
        continue
      }

      if (chain.includes(target)) {
        throw errorAt(item.origin, item.origin.keyPath, `include cycle: ${[...chain, target].join(' → ')}`, 'remove one of the includes of the cycle')
      }

      const previous = includers.get(target)

      if (previous !== undefined) {
        throw errorAt(
          item.origin,
          item.origin.keyPath,
          `${target} is included twice: by ${location(previous)} and by ${location(item.origin)}`,
          'include it once',
        )
      }

      includers.set(target, item.origin)
      visit(target, item.origin, [...chain, target])
    }
  }

  visit(rootFile, undefined, [rootFile])

  return loaded
}
