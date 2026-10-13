import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { ownersOf } from '../codeowners/match.ts'
import type { Codeowners, OwnersResult } from '../codeowners/types.ts'
import { isGeneratedByMarker, readHead } from '../generated/marker.ts'
import { normalizePath, toPosix } from '../paths/paths.ts'
import { deepestOwnershipFile, findGeneratedRule, findIgnoreRule, findOwnedRule } from './lookup.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, ResolvedOwnership } from './types.ts'

export type GeneratedOrigin = { readonly source: 'declared'; readonly rule: GeneratedRule } | { readonly source: 'marker' }

export type Coverage =
  { readonly kind: 'covered' } | { readonly kind: 'ignored' } | { readonly kind: 'uncovered'; readonly file: string | null } | { readonly kind: 'gitignored' }

export interface PathExplanation {
  readonly path: string
  readonly owned: OwnedRule | null
  readonly generated: GeneratedOrigin | null
  readonly ignore: IgnoreRule | null
  readonly coverage: Coverage
  readonly codeowners: OwnersResult
}

export interface ExplainContext {
  readonly repoFiles: ReadonlySet<string>
  readonly codeowners: Codeowners | null
}

function inRepository(path: string, repoFiles: ReadonlySet<string>): boolean {
  if (!path.endsWith('/')) {
    return repoFiles.has(path)
  }

  for (const file of repoFiles) {
    if (file.startsWith(path)) {
      return true
    }
  }

  return false
}

/** Every rule that reaches `path`, its coverage and its CODEOWNERS line, as data for the CLI to format. */
export function explainPath(config: ResolvedOwnership, path: string, ctx: ExplainContext): PathExplanation {
  const target = normalizePath(toPosix(path))
  const owned = findOwnedRule(config, target)
  const ignore = findIgnoreRule(config, target)
  const declared = findGeneratedRule(config, target)
  const head = declared === null && !target.endsWith('/') ? readHead(join(config.root, target)) : null
  const generated: GeneratedOrigin | null =
    declared !== null ? { source: 'declared', rule: declared } : head !== null && isGeneratedByMarker(head) ? { source: 'marker' } : null
  const gitignored = existsSync(join(config.root, target)) && !inRepository(target, ctx.repoFiles)

  let coverage: Coverage

  if (gitignored) {
    coverage = { kind: 'gitignored' }
  } else if (ignore !== null) {
    coverage = { kind: 'ignored' }
  } else if (owned !== null) {
    coverage = { kind: 'covered' }
  } else {
    coverage = { kind: 'uncovered', file: deepestOwnershipFile(config, target) }
  }

  return { path: target, owned, generated, ignore, coverage, codeowners: ownersOf(ctx.codeowners, target) }
}
