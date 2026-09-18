import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_ID_FORMAT, idPatternSource } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

export const RETIRED_IDS_PATH = 'docs/ids-retired.txt'

export interface Citation {
  id: string
  /** Linha 1-indexed dentro de `source`. */
  line: number
}

/**
 * Sintaxe de citação do projeto (spec §8, `ADR-0011`): a forma escrita declarada
 * em `id-format`, com o padrão `<PREFIXO>-<número>`.
 *
 * Derivada de `idPatternSource` — uma fonte, não duas cópias que se pedem para
 * mudar juntas. Um match com prefixo não declarado (uma referência a "ISO-8601",
 * por exemplo) é inofensivo: `ci2-ids.ts` só resolve citações cujo prefixo está
 * em `known`, e os demais são ignorados em silêncio.
 *
 * Global e sem âncoras de propósito: varre texto livre em busca de várias
 * citações por linha.
 */
export function citationPattern(format: IdFormat = DEFAULT_ID_FORMAT): RegExp {
  return new RegExp(`\\b${idPatternSource(format)}\\b`, 'g')
}

export function findCitations(source: string, format: IdFormat = DEFAULT_ID_FORMAT): Citation[] {
  const pattern = citationPattern(format)
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const citations: Citation[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''

    for (const match of line.matchAll(pattern)) {
      citations.push({ id: match[0], line: i + 1 })
    }
  }

  return citations
}

/** IDs retirados — nunca podem reaparecer (spec §2). */
export function loadRetiredIds(root: string): Set<string> {
  let source: string

  try {
    source = readFileSync(join(root, RETIRED_IDS_PATH), 'utf8')
  } catch {
    return new Set()
  }

  const retired = new Set<string>()

  for (const raw of source.split('\n')) {
    const line = raw.trim()

    if (line === '' || line.startsWith('#')) {
      continue
    }
    retired.add(line)
  }

  return retired
}
