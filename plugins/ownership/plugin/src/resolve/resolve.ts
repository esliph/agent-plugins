import { resolve } from 'node:path'

import { OwnershipError } from '../errors.ts'
import { toPosix } from '../paths/paths.ts'
import { isInsideWorkTree } from '../repo/repo.ts'
import { findRootFile, loadFiles } from './load.ts'
import { buildIndex } from './relations.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, ResolveOptions, ResolvedOwnership } from './types.ts'

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)

    for (const key of Reflect.ownKeys(value)) {
      deepFreeze((value as Record<PropertyKey, unknown>)[key])
    }
  }

  return value
}

/**
 * Reads every ownership file of the repository at `root` and checks it. Null
 * when the repository has no ownership file; an OwnershipError for anything
 * wrong in the files, with every broken relation between paths at once.
 */
export function resolveOwnership(root: string, options: ResolveOptions = {}): ResolvedOwnership | null {
  const absoluteRoot = resolve(root)
  const rootFile = findRootFile(absoluteRoot, options.ownership ?? process.env.OWNERSHIP_CONFIG)

  if (rootFile === null) {
    return null
  }

  if (!isInsideWorkTree(absoluteRoot)) {
    throw new OwnershipError([
      {
        file: rootFile,
        message: `${toPosix(absoluteRoot)} is not inside a Git work tree; the ownership files need one`,
        fix: 'run git init, or point OWNERSHIP_REPO_ROOT at the repository',
      },
    ])
  }

  const files = loadFiles(absoluteRoot, rootFile, options.prune)
  const owned: OwnedRule[] = files.flatMap(file =>
    file.raw.owned.map(entry => ({
      kind: 'owned' as const,
      path: entry.path,
      owner: entry.owner,
      ...(entry.skill === undefined ? {} : { skill: entry.skill }),
      plugins: entry.plugins,
      origin: entry.origin,
    })),
  )
  const generated: GeneratedRule[] = files.flatMap(file =>
    file.raw.generated.map(entry => ({ kind: 'generated' as const, path: entry.path, command: entry.command, origin: entry.origin })),
  )
  const ignore: IgnoreRule[] = files.flatMap(file => file.raw.ignore.map(entry => ({ kind: 'ignore' as const, path: entry.path, origin: entry.origin })))
  const { index, issues } = buildIndex({ owned, generated, ignore }, options.repoFiles)

  if (issues.length > 0) {
    throw new OwnershipError(issues)
  }

  return deepFreeze({
    root: absoluteRoot,
    rootFile,
    files: files.map(file => ({ path: file.path, base: file.base, ...(file.includedBy === undefined ? {} : { includedBy: file.includedBy }) })),
    plugins: files[0]?.raw.plugins ?? {},
    owned,
    generated,
    ignore,
    index,
  })
}
