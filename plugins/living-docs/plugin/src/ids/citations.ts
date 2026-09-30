import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_ID_FORMAT, idPatternSource } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

export const RETIRED_IDS_PATH = 'docs/ids-retired.txt'

export interface Citation {
  id: string
  /** 1-indexed line within `source`. */
  line: number
}

/**
 * The project's citation syntax (spec §8, `ADR-0011`): the written form declared
 * in `id-format`, with the pattern `<PREFIX>-<number>`.
 *
 * Derived from `idPatternSource` — one source, not two copies that ask to be
 * changed together. A match with an undeclared prefix (a reference to "ISO-8601",
 * for example) is harmless: `id-integrity.ts` only resolves citations whose prefix is
 * in `known`, and the rest are silently ignored.
 *
 * Global and without anchors on purpose: it scans free text looking for several
 * citations per line.
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

/** Retired IDs — they can never reappear (spec §2). */
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
