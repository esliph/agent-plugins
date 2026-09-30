import picomatch from 'picomatch'
import { findOwnedRule } from '../resolve/hierarchy.ts'
import type { ResolvedConfig } from '../resolve/hierarchy.ts'

export interface WatchMatch {
  doc: string
  reason: string | null
  consumerVisible: boolean
  matched: string[]
  skill: string | null
  owner: string | null
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

export function coversDoc(doc: string, paths: readonly string[]): boolean {
  const target = normalize(doc)

  return paths.some(path => {
    const candidate = normalize(path)

    return target.endsWith('/') ? candidate.startsWith(target) : candidate === target
  })
}

export function watchesFor(config: ResolvedConfig, paths: readonly string[]): WatchMatch[] {
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

    const rule = findOwnedRule(config, doc)

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

export function pendingDocs(config: ResolvedConfig, paths: readonly string[]): WatchMatch[] {
  return watchesFor(config, paths).filter(match => !coversDoc(match.doc, paths))
}
