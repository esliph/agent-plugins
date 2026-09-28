import picomatch from 'picomatch'
import { findArtifactRule } from './ownership.ts'
import type { LivingDocsConfig } from './ownership.ts'

export interface WatchMatch {
  /** Doc dono exigido, normalizado. */
  doc: string
  /** Por que o vínculo existe. O texto é do projeto; o toolkit só o transporta. */
  reason: string | null
  /** `consumer-visible: true` em alguma das regras que apontam para este doc (CI-6, Fase 6). */
  consumerVisible: boolean
  /** Caminhos do conjunto que dispararam a exigência, sem repetição e na ordem em que vieram. */
  matched: string[]
  /** Skill dona do doc, quando o doc é artefato declarado; null quando não é. */
  skill: string | null
  owner: string | null
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/**
 * O doc está coberto por algum destes caminhos? Doc declarado como diretório é
 * coberto pelo que está dentro dele; declarado como arquivo, só por igualdade.
 */
export function coversDoc(doc: string, paths: readonly string[]): boolean {
  const target = normalize(doc)

  return paths.some(path => {
    const candidate = normalize(path)

    return target.endsWith('/') ? candidate.startsWith(target) : candidate === target
  })
}

/**
 * Que docs este conjunto de caminhos exige, agrupado por doc.
 *
 * É a única pergunta que `watches` responde, e ela é feita por `HK-4` (com um
 * caminho), por `HK-5` (com o índice inteiro) e, na Fase 7, por `CI-7` (com o
 * diff). Nenhum deles conhece caminho de projeto: tudo vem do `.ownership.yml`.
 */
export function watchesFor(config: LivingDocsConfig, paths: readonly string[]): WatchMatch[] {
  const normalized = paths.map(normalize)
  const byDoc = new Map<string, WatchMatch>()

  for (const watch of config.watches) {
    const matches = picomatch(watch.code)
    const hits = normalized.filter(path => matches(path))

    if (hits.length === 0) {
      continue
    }

    const doc = normalize(watch.doc)
    const existing = byDoc.get(doc)

    if (existing) {
      existing.reason = existing.reason ?? watch.reason
      existing.consumerVisible = existing.consumerVisible || watch.consumerVisible
      for (const hit of hits) {
        if (!existing.matched.includes(hit)) {
          existing.matched.push(hit)
        }
      }
      continue
    }

    // Doc que não é artefato declarado continua sendo doc dono: quem responde por
    // ele é o CODEOWNERS. A ausência de skill é informação, não erro.
    const rule = findArtifactRule(config, doc)

    byDoc.set(doc, {
      doc,
      reason: watch.reason,
      consumerVisible: watch.consumerVisible,
      matched: [...hits],
      skill: rule?.skill ?? null,
      owner: rule?.owner ?? null,
    })
  }

  return [...byDoc.values()]
}

/** Docs que estes caminhos exigem e que eles não tocam — o mecanismo 1 (spec §7). */
export function pendingDocs(config: LivingDocsConfig, paths: readonly string[]): WatchMatch[] {
  return watchesFor(config, paths).filter(match => !coversDoc(match.doc, paths))
}
