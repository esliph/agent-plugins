import type { Origin, PluginBlocks } from '../schema/types.ts'

export type RuleOrigin = Origin

export interface OwnedRule {
  readonly kind: 'owned'
  readonly path: string
  readonly owner: string
  readonly skill?: string
  readonly plugins: PluginBlocks
  readonly origin: RuleOrigin
}

export interface GeneratedRule {
  readonly kind: 'generated'
  readonly path: string
  readonly command: string
  readonly origin: RuleOrigin
}

export interface IgnoreRule {
  readonly kind: 'ignore'
  readonly path: string
  readonly origin: RuleOrigin
}

export type Rule = OwnedRule | GeneratedRule | IgnoreRule

/** One path segment. A node holds at most one rule of each kind. */
export interface TrieNode {
  readonly children: Readonly<Record<string, TrieNode>>
  readonly owned?: OwnedRule
  readonly generated?: GeneratedRule
  readonly ignore?: IgnoreRule
}

export interface OwnershipFileInfo {
  readonly path: string
  /** `''` for the repository root, otherwise a directory with a trailing `/`. */
  readonly base: string
  readonly includedBy?: string
}

/** Every ownership file of the repository, composed and checked. Deeply frozen. */
export interface ResolvedOwnership {
  readonly root: string
  readonly rootFile: string
  readonly files: readonly OwnershipFileInfo[]
  readonly plugins: PluginBlocks
  readonly owned: readonly OwnedRule[]
  readonly generated: readonly GeneratedRule[]
  readonly ignore: readonly IgnoreRule[]
  readonly index: TrieNode
}

export interface ResolveOptions {
  /** The repository files; when given, a containment error suggests the split. */
  repoFiles?: ReadonlySet<string>
  /** Follow only the includes whose directory is an ancestor of one of these paths. */
  prune?: readonly string[]
  /** An explicit root ownership file, relative to the repository root. */
  ownership?: string
}
