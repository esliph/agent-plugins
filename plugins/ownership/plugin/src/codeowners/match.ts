import { normalizePath, toPosix } from '../paths/paths.ts'
import type { Codeowners, CodeownersLine, OwnersResult } from './types.ts'

/**
 * Compiles a CODEOWNERS pattern with GitHub's semantics: a `/` at the start
 * or in the middle anchors it at the root, a pattern without one matches at
 * any level, a trailing `/` means a directory, `*` and `?` do not cross `/`,
 * `**` works at the start, in the middle and at the end, and a pattern that
 * matches a directory matches everything under it — except when its last
 * segment is a wildcard, as in `docs/*`, which GitHub stops at direct children.
 * Group 1 of the expression is the part under the matched directory.
 */
export function compilePattern(pattern: string): { regex: RegExp; dirOnly: boolean } {
  let body = pattern
  const dirOnly = body.endsWith('/')

  if (dirOnly) {
    body = body.slice(0, -1)
  }

  const anchored = body.includes('/')

  if (body.startsWith('/')) {
    body = body.slice(1)
  }

  const segments = body.split('/')
  let source = ''

  segments.forEach((segment, i) => {
    const last = i === segments.length - 1

    if (segment === '**') {
      source += last ? '.*' : '(?:[^/]+/)*'

      return
    }

    source += segment
      .replace(/[.+^${}()|\\]/g, '\\$&')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')

    if (!last) {
      source += '/'
    }
  })

  const lastSegment = segments[segments.length - 1]
  const descendants = lastSegment !== '*' && lastSegment !== '**'

  return { regex: new RegExp(`^${anchored ? '' : '(?:[^/]+/)*'}${source}${descendants ? '(/.*)?' : ''}$`), dirOnly }
}

/** Whether a line matches `path`; a path ending in `/` is a directory. */
export function lineMatches(line: Pick<CodeownersLine, 'regex' | 'dirOnly'>, path: string): boolean {
  const isDirectory = path.endsWith('/')
  const match = line.regex.exec(isDirectory ? path.slice(0, -1) : path)

  if (match === null) {
    return false
  }

  return !line.dirOnly || isDirectory || match[1] !== undefined
}

/** The owners the CODEOWNERS assigns to `path`, as GitHub decides them: the last matching line wins. */
export function ownersOf(codeowners: Codeowners | null, path: string): OwnersResult {
  if (codeowners === null) {
    return { kind: 'no-codeowners' }
  }

  const target = normalizePath(toPosix(path))

  for (let i = codeowners.lines.length - 1; i >= 0; i--) {
    const line = codeowners.lines[i]

    if (line !== undefined && lineMatches(line, target)) {
      return { kind: 'matched', owners: line.owners, line: line.line }
    }
  }

  return { kind: 'unmatched' }
}
