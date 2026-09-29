import picomatch from 'picomatch'
import { fieldOf } from '../config/ownership.ts'
import type { ArtifactDoc } from './collect.ts'

/**
 * An open decision that named the paths it blocks (`RN-0026`).
 *
 * The field is optional on purpose: an open decision without a declared path remains
 * valid and blocks nothing. What the spec refuses is the opposite — declaring the
 * path and not being reminded.
 */
export interface BlockedClaim {
  id: string
  /** The document where the decision lives. */
  doc: string
  line: number
  /** The declared globs, as the project wrote them. */
  paths: string[]
  skill: string
  owner: string
  /** The statement of the gap, when the item carries it. */
  gap: string | null
}

const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na'])

/** One path per comma or space; backticks are markdown decoration. */
function splitPaths(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map(path => path.replace(/`/g, '').trim())
    .filter(path => path !== '' && !EMPTY.has(path.toLowerCase()))
}

/** The claims declared by `open` decisions, in any collection form. */
export function blockedClaims(docs: readonly ArtifactDoc[]): BlockedClaim[] {
  const claims: BlockedClaim[] = []

  for (const doc of docs) {
    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data

      if (data?.status !== 'open' || typeof data.id !== 'string') {
        continue
      }
      const raw = data.blocks
      const paths = splitPaths(Array.isArray(raw) ? raw.join(' ') : String(raw ?? ''))

      if (paths.length === 0) {
        continue
      }

      claims.push({
        id: data.id,
        doc: doc.file,
        line: doc.frontmatter?.lines.id ?? 1,
        paths,
        skill: doc.rule.skill,
        owner: doc.rule.owner,
        gap: typeof data.title === 'string' ? data.title : null,
      })
      continue
    }

    for (const item of doc.items) {
      if (item.state !== 'open') {
        continue
      }
      const raw = fieldOf(doc.rule, item, 'blocks')

      if (raw === null) {
        continue
      }
      const paths = splitPaths(raw)

      if (paths.length === 0) {
        continue
      }

      claims.push({
        id: item.key,
        doc: doc.file,
        line: item.line,
        paths,
        skill: doc.rule.skill,
        owner: doc.rule.owner,
        gap: fieldOf(doc.rule, item, 'gap') ?? item.fields.title ?? null,
      })
    }
  }

  return claims
}

/** Which claims this set of paths touches, and what each one caught. */
export function claimsFor(claims: readonly BlockedClaim[], paths: readonly string[]): { claim: BlockedClaim; matched: string[] }[] {
  const normalized = paths.map(path => path.replace(/\\/g, '/').replace(/^\.\//, ''))
  const hits: { claim: BlockedClaim; matched: string[] }[] = []

  for (const claim of claims) {
    const matches = picomatch(claim.paths)
    // The decision's own document is never blocked: whoever is going to resolve it
    // needs to be able to write in it.
    const matched = normalized.filter(path => path !== claim.doc && matches(path))

    if (matched.length > 0) {
      hits.push({ claim, matched })
    }
  }

  return hits
}
