import { posix } from 'node:path'

import { normalizePath, toPosix } from '../paths/paths.ts'

function clean(path: string): string {
  const normalized = posix.normalize(toPosix(path))

  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:\//.test(path)
}

/**
 * A path from a tool payload as the repository names it, or null when it is
 * outside every root. The root prefix is compared without regard to case,
 * because it comes from the operating system — a drive letter may arrive as
 * `c:` or `C:` — while the part inside the repository keeps its case.
 */
export function toRepoPath(filePath: string, roots: readonly string[]): string | null {
  const path = clean(filePath)

  if (!isAbsolutePath(path)) {
    return path === '.' || path === '..' || path.startsWith('../') ? null : normalizePath(path)
  }

  for (const root of roots) {
    const prefix = `${clean(root)}/`

    if (path.length > prefix.length && path.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase()) {
      return normalizePath(path.slice(prefix.length))
    }
  }

  return null
}
