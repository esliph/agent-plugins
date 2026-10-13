import { normalizePath, toPosix } from '../paths/paths.ts'
import { coveringIgnore, coveringOwned, nodeAt } from './trie.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, OwnershipFileInfo, ResolvedOwnership } from './types.ts'

function clean(path: string): string {
  return normalizePath(toPosix(path))
}

/** The owned rule that covers `path` — a file, or a directory when it ends with `/` — or null. */
export function findOwnedRule(config: ResolvedOwnership, path: string): OwnedRule | null {
  return coveringOwned(config.index, clean(path))
}

/** The generated rule declared for exactly this file, or null. */
export function findGeneratedRule(config: ResolvedOwnership, path: string): GeneratedRule | null {
  const target = clean(path)

  if (target === '' || target.endsWith('/')) {
    return null
  }

  return nodeAt(config.index, target)?.generated ?? null
}

export function findIgnoreRule(config: ResolvedOwnership, path: string): IgnoreRule | null {
  return coveringIgnore(config.index, clean(path))
}

/** The ownership file with the deepest base that contains `path`: where a missing entry for it belongs. */
export function deepestOwnershipFile(config: ResolvedOwnership, path: string): string | null {
  const target = clean(path)
  let best: OwnershipFileInfo | null = null

  for (const file of config.files) {
    if (target.startsWith(file.base) && (best === null || file.base.length > best.base.length)) {
      best = file
    }
  }

  return best?.path ?? null
}
