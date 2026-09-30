export type Collection = 'per-file' | 'table' | 'sections'
export type SectionKeyMode = 'first-token' | 'heading'

export interface FormatBlock {
  collection: Collection
  /** Column name, when `collection` is `table`. Null in the other two cases. */
  key: string | null
  /** Only when `collection` is `sections`. */
  keyMode: SectionKeyMode | null
  /** Normalized (lowercase, no surrounding whitespace). Default `'status'`. */
  stateField: string
}

export interface DerivesFrom {
  source: string
  field: string
}

export interface OwnedRuleRaw {
  path: string
  /** Required: no cascade, no entry inherits an owner from another file (spec §5). */
  owner: string
  skill: string | null
  /** Project vocabulary; `null` when the path declares no lifecycle. */
  states: string[] | null
  format: FormatBlock
  /** Whether the file wrote `format:` — the parser default is not a declaration. */
  formatDeclared: boolean
  derivesFrom: DerivesFrom | null
  /** By plugin name declared in `plugins:`. Always a map; the content is opaque to the core. */
  pluginBlocks: Record<string, Record<string, unknown>>
}

export interface GeneratedRuleRaw {
  path: string
  command: string
}

export interface WatchRuleRaw {
  code: string
  doc: string
  reason: string | null
  consumerVisible: boolean
}

export interface ParsedFile {
  /** Path of this ownership file, relative to the repository root. */
  file: string
  /** Directory of this file, relative to the root. `''` for the repository root. */
  dir: string
  version: 2
  /** Shifts the base into the file's directory; `null` when the base is the directory itself. */
  basePath: string | null
  owned: OwnedRuleRaw[]
  generated: GeneratedRuleRaw[]
  watches: WatchRuleRaw[]
  ignore: string[]
  include: string[]
}

export interface RootFile extends ParsedFile {
  plugins: string[]
  /** Top-level blocks, by plugin name — only the root has them (ADR-0028). */
  pluginBlocks: Record<string, Record<string, unknown>>
}

export class OwnershipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OwnershipError'
  }
}
