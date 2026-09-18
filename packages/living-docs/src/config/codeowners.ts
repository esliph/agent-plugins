import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'

/** Onde o CODEOWNERS pode morar, na ordem em que se procura por ele. */
export const CODEOWNERS_PATHS: readonly string[] = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']

export interface CodeownersEntry {
  pattern: string
  /** Só handles (`@…`); um padrão sem handle não declara dono. */
  owners: string[]
  /** Linha 1-indexed. */
  line: number
}

export interface Codeowners {
  /** Caminho do arquivo encontrado, relativo à raiz. */
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

/**
 * Donos declarados para este caminho, ou `null` quando nenhum padrão o cobre.
 *
 * Reconhecimento deliberadamente estreito — prefixo de diretório, igualdade de
 * arquivo, `*` e glob simples —, em vez das regras completas de gitignore.
 * `CI-7` responde "tem dono declarado?", não "qual dono o GitHub escolheria?";
 * a segunda pergunta é do GitHub, e imitá-la pela metade seria afirmar uma
 * precisão que este check não tem.
 */
export function ownersOf(codeowners: Codeowners, repoPath: string): string[] | null {
  const target = repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
  let owners: string[] | null = null

  // A última regra que casa ganha — é assim que o CODEOWNERS é lido.
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
