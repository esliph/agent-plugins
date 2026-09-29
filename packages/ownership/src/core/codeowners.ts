import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'

export const CODEOWNERS_PATHS: readonly string[] = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']

export interface CodeownersEntry {
  pattern: string
  owners: string[]
  line: number
}

export interface Codeowners {
  file: string
  entries: CodeownersEntry[]
}

export function parseCodeowners(source: string): CodeownersEntry[] {
  const entries: CodeownersEntry[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim()

    if (line === '' || line.startsWith('#')) {
      continue
    }

    const [pattern, ...rest] = line.split(/\s+/)

    if (pattern === undefined) {
      continue
    }

    entries.push({ pattern, owners: rest.filter(owner => owner.startsWith('@')), line: i + 1 })
  }

  return entries
}

export function loadCodeowners(root: string): Codeowners | null {
  for (const candidate of CODEOWNERS_PATHS) {
    let source: string

    try {
      source = readFileSync(join(root, candidate), 'utf8')
    } catch {
      continue
    }

    return { file: candidate, entries: parseCodeowners(source) }
  }

  return null
}

function matcherFor(pattern: string): (repoPath: string) => boolean {
  const clean = pattern.replace(/\\/g, '/').replace(/^\//, '')

  if (clean === '*' || clean === '**') {
    return () => true
  }
  if (clean.endsWith('/')) {
    return repoPath => repoPath.startsWith(clean)
  }
  if (clean.includes('*')) {
    const isMatch = picomatch([clean, `${clean}/**`])

    return repoPath => isMatch(repoPath)
  }

  return repoPath => repoPath === clean || repoPath.startsWith(`${clean}/`)
}

export function ownersOf(codeowners: Codeowners, repoPath: string): string[] | null {
  const target = repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
  let owners: string[] | null = null

  for (const entry of codeowners.entries) {
    if (entry.owners.length === 0) {
      continue
    }
    if (matcherFor(entry.pattern)(target)) {
      owners = entry.owners
    }
  }

  return owners
}
