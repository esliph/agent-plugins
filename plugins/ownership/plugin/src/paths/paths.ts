import { isAbsolute, posix, relative } from 'node:path'

/** NFC, no `.` or empty segment; the trailing `/` of a directory stays. `..` is left for resolveUnder. */
export function normalizePath(path: string): string {
  const nfc = path.normalize('NFC')
  const joined = nfc
    .split('/')
    .filter(segment => segment !== '' && segment !== '.')
    .join('/')

  return nfc.endsWith('/') && joined !== '' ? `${joined}/` : joined
}

export function toPosix(path: string): string {
  return path.replace(/\\/g, '/')
}

/** `absolute` relative to `root`, with `/`: `''` for the root itself, null when it lies outside. */
export function relativeTo(root: string, absolute: string): string | null {
  const fromRoot = relative(root, absolute)

  return fromRoot.startsWith('..') || isAbsolute(fromRoot) ? null : toPosix(fromRoot)
}

const NOT_LITERAL = /[*?[!]/

/** Why a declared path is not a literal path relative to its base, or null when it is one. */
export function literalProblem(path: string): string | null {
  if (path.startsWith('/')) {
    return 'starts with "/"; paths are relative to the base of the file'
  }

  const found = NOT_LITERAL.exec(path)

  return found === null ? null : `contains "${found[0]}"; paths are literal, without glob or negation`
}

export type Resolved = { ok: true; path: string } | { ok: false; resolved: string }

/** Resolves `path` against `base` (`''` or a directory with a trailing `/`). Leaving the base is reported with the resolved path. */
export function resolveUnder(base: string, path: string): Resolved {
  let joined = posix.normalize(`${base}${normalizePath(path)}`)

  if (joined === '.' || joined === './') {
    joined = ''
  }

  if (path.endsWith('/') && joined !== '' && !joined.endsWith('/')) {
    joined = `${joined}/`
  }

  const escapes = joined === '..' || joined.startsWith('../') || !joined.startsWith(base)

  return escapes ? { ok: false, resolved: joined } : { ok: true, path: joined }
}

/** True when `outer` is a directory path and a strict ancestor of `inner`. */
export function contains(outer: string, inner: string): boolean {
  return outer.endsWith('/') && inner !== outer && inner.startsWith(outer)
}

export function segmentsOf(path: string): string[] {
  return path.split('/').filter(segment => segment !== '')
}

/** The parent directory with a trailing `/`, or `''` at the repository root. */
export function dirOf(path: string): string {
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path
  const slash = trimmed.lastIndexOf('/')

  return slash === -1 ? '' : trimmed.slice(0, slash + 1)
}

/** Groups of distinct paths that differ only in case, in order of first appearance. */
export function caseCollisions(paths: readonly string[]): string[][] {
  const groups = new Map<string, string[]>()

  for (const path of paths) {
    const key = path.toLowerCase()
    const group = groups.get(key) ?? []

    if (!group.includes(path)) {
      group.push(path)
    }

    groups.set(key, group)
  }

  return [...groups.values()].filter(group => group.length > 1)
}
