import { listFiles, readTextFile } from '../core/files.ts'
import { DEFAULT_ID_FORMAT } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'
import { findCitations } from './citations.ts'

export interface CitationSite {
  /** Caminho relativo à raiz do repositório, sempre com `/`. */
  file: string
  /** Linha 1-indexed. */
  line: number
}

/**
 * Onde cada ID aparece, restrito aos caminhos de `globs`.
 * Chave: o ID exatamente como escrito no texto — a canonização é de quem compara.
 *
 * A varredura da árvore e a leitura segura moram em `src/core/files.ts` desde a
 * Fase 7: `living-docs/staleness`, `ownership/owner-coverage` e `living-docs/links` fazem a mesma caminhada.
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
