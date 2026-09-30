import { listFiles, readTextFile } from '../core/files.ts'
import { DEFAULT_ID_FORMAT } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'
import { findCitations } from './citations.ts'

export interface CitationSite {
  /** Path relative to the repository root, always with `/`. */
  file: string
  /** 1-indexed line. */
  line: number
}

/**
 * Where each ID appears, restricted to the paths of `globs`.
 * Key: the ID exactly as written in the text — canonicalization is up to whoever compares.
 *
 * The tree scan and the safe read have lived in `src/core/files.ts` since
 * Phase 7: `living-docs/staleness`, `ownership/owner-coverage` and `living-docs/links` do the same walk.
 */
export function scanCitations(root: string, globs: readonly string[], format: IdFormat = DEFAULT_ID_FORMAT): Map<string, CitationSite[]> {
  const sites = new Map<string, CitationSite[]>()

  if (globs.length === 0) {
    return sites
  }

  for (const file of listFiles(root, globs)) {
    const content = readTextFile(root, file)

    if (content === null) {
      continue
    }

    for (const citation of findCitations(content, format)) {
      const list = sites.get(citation.id) ?? []

      list.push({ file, line: citation.line })
      sites.set(citation.id, list)
    }
  }

  return sites
}
