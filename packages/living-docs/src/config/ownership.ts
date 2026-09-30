import { OwnershipError, isEmptyValue, normalizeFieldKey, resolveOwnership } from '@esliph/ownership'
import type { DocItem, ResolvedConfig, ResolvedOwnedRule } from '@esliph/ownership'
import { DEFAULT_ID_FORMAT, PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'
import { display } from '../core/display.ts'

export { OwnershipError }

/**
 * The name of this plugin's block in the ownership file. A path belongs to
 * living-docs if, and only if, the `owned` entry that covers it carries this
 * block (ADR-0020); with `id-prefix` it is an artifact, without it a document (ADR-0029).
 */
export const PLUGIN = 'living-docs'

export type Collection = 'per-file' | 'table' | 'sections'

/**
 * Who reads a document or artifact (`ADR-0017`). When absent, `internal` applies.
 */
export const AUDIENCES = ['internal', 'external'] as const
export type Audience = (typeof AUDIENCES)[number]

/**
 * Roles the toolkit recognizes on a document (`ADR-0008`). Closed
 * vocabulary: it is what allows finding the agent contract and the Definition of Done
 * without knowing any path.
 */
export const DOCUMENT_ROLES = ['agent-contract', 'definition-of-done'] as const
export type DocumentRole = (typeof DOCUMENT_ROLES)[number]

export interface ArtifactRule {
  idPrefix: string
  path: string
  owner: string
  skill: string
  appendOnly: boolean
  mutableFields: string[]
  citedBy: string[]
  collection: Collection
  /** Canonical -> real field name in this project. E.g.: { 'resolved-by': 'fixed by' }. */
  fieldMap: Record<string, string>
  /** The entry's `states`, which belongs to the core; `null` when the entry does not declare it. */
  states: string[] | null
  audience: Audience
  /** The entry as resolved by the core — it is what `findTransitions` receives. */
  core: ResolvedOwnedRule
}

/** Document with an owner and no ID family (`ADR-0008`). */
export interface DocumentRule {
  path: string
  owner: string
  /** Owning skill, when there is one. `null` is information, not an error. */
  skill: string | null
  role: DocumentRole | null
  audience: Audience
  core: ResolvedOwnedRule
}

export interface GeneratedRule {
  path: string
  command: string
}

export interface WatchRule {
  code: string
  doc: string
  reason: string | null
  consumerVisible: boolean
}

export interface LivingDocsConfig {
  /** The root ownership file, relative to the repository (e.g. `.ownership.yml`). */
  rootFile: string
  staleAfterMonths: number
  /** How many documents with a bare date bump fail (`ADR-0013`, `RN-0027`). */
  lastReviewedBumpLimit: number
  /** The written form of this project's IDs (`ADR-0011`). Never the identity. */
  idFormat: IdFormat
  artifacts: ArtifactRule[]
  documents: DocumentRule[]
  generated: GeneratedRule[]
  watches: WatchRule[]
  /** The whole configuration, as the core resolved it. */
  core: ResolvedConfig
}

const ID_PREFIX = /^[A-Z]{2,4}$/
const TOP_KEYS: ReadonlySet<string> = new Set(['stale-after-months', 'id-format', 'last-reviewed-bump-limit'])
const ARTIFACT_KEYS: ReadonlySet<string> = new Set(['id-prefix', 'append-only', 'mutable-fields', 'cited-by', 'field-map', 'audience'])
const DOCUMENT_KEYS: ReadonlySet<string> = new Set(['role', 'audience'])
const DEFAULT_STALE_AFTER_MONTHS = 6

/**
 * The mass-bump threshold (`ADR-0013`). Floor 2, not 1: a document that was genuinely reviewed
 * updates its date, and threshold 1 would fail the mechanism working.
 */
export const DEFAULT_BUMP_LIMIT = 3

function fail(where: string, message: string): never {
  throw new OwnershipError(`${where}: ${message}`)
}

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(where, 'must be a map.')
  }

  return value as Record<string, unknown>
}

function asStringList(value: unknown, where: string): string[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    fail(where, 'must be a list of strings.')
  }

  return value as string[]
}

function assertKnown(block: Record<string, unknown>, allowed: ReadonlySet<string>, where: string, hint = ''): void {
  for (const key of Object.keys(block)) {
    if (!allowed.has(key)) {
      fail(where, `unknown key "${key}".${hint}`)
    }
  }
}

function parseIdFormat(raw: unknown, where: string): IdFormat {
  if (raw === undefined || raw === null) {
    return DEFAULT_ID_FORMAT
  }
  const item = asRecord(raw, `${where}.id-format`)
  const separator = item.separator ?? DEFAULT_ID_FORMAT.separator

  if (typeof separator !== 'string' || !SEPARATORS_ALLOWED.includes(separator)) {
    // Rule of origin: ADR-0011.
    fail(where, `id-format.separator "${display(separator)}" is not accepted. Valid: ${SEPARATORS_ALLOWED.map(value => `"${value}"`).join(', ')}.`)
  }

  const padding = item.padding ?? DEFAULT_ID_FORMAT.padding

  if (typeof padding !== 'number' || !Number.isInteger(padding) || padding < PADDING_RANGE.min || padding > PADDING_RANGE.max) {
    // Rule of origin: ADR-0011.
    fail(where, `id-format.padding "${display(padding)}" must be an integer between ${PADDING_RANGE.min} and ${PADDING_RANGE.max}.`)
  }

  return { separator, padding }
}

function parseBumpLimit(raw: unknown, where: string): number {
  if (raw === undefined || raw === null) {
    return DEFAULT_BUMP_LIMIT
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 2) {
    // Rule of origin: ADR-0013.
    fail(where, `last-reviewed-bump-limit "${display(raw)}" must be an integer greater than or equal to 2 (a threshold of 1 would fail the legitimate review of a single document).`)
  }

  return raw
}

function parseAudience(raw: unknown, where: string): Audience {
  if (raw === undefined) {
    return 'internal'
  }
  if (!AUDIENCES.includes(raw as Audience)) {
    fail(where, `unknown audience "${display(raw)}". Valid: ${AUDIENCES.join(', ')}.`)
  }

  return raw as Audience
}

function whereOf(rule: ResolvedOwnedRule): string {
  return `${rule.origin}: entry "${rule.path}", block ${PLUGIN}`
}

function toArtifact(rule: ResolvedOwnedRule, block: Record<string, unknown>): ArtifactRule {
  const where = whereOf(rule)

  assertKnown(block, ARTIFACT_KEYS, where)

  const idPrefix = block['id-prefix']

  if (typeof idPrefix !== 'string' || !ID_PREFIX.test(idPrefix)) {
    fail(where, `id-prefix "${display(idPrefix)}" must be 2 to 4 uppercase letters (e.g. ADR, DA, TDR).`)
  }
  if (rule.skill === null) {
    fail(where, 'an artifact needs a `skill` in its entry — the owning skill is the one that writes its items.')
  }

  const fieldMap: Record<string, string> = {}
  const fieldMapRaw = block['field-map']

  if (fieldMapRaw !== undefined && fieldMapRaw !== null) {
    for (const [canonical, real] of Object.entries(asRecord(fieldMapRaw, `${where}.field-map`))) {
      if (typeof real !== 'string' || real.trim() === '') {
        fail(where, `field-map.${canonical} must be a non-empty string.`)
      }
      fieldMap[normalizeFieldKey(canonical)] = normalizeFieldKey(real)
    }
  }

  return {
    idPrefix,
    path: rule.path,
    owner: rule.owner,
    skill: rule.skill,
    appendOnly: block['append-only'] === true,
    mutableFields: asStringList(block['mutable-fields'], `${where}.mutable-fields`),
    citedBy: asStringList(block['cited-by'], `${where}.cited-by`),
    collection: rule.format.collection,
    fieldMap,
    states: rule.states,
    audience: parseAudience(block.audience, where),
    core: rule,
  }
}

function toDocument(rule: ResolvedOwnedRule, block: Record<string, unknown>): DocumentRule {
  const where = whereOf(rule)

  assertKnown(block, DOCUMENT_KEYS, where, ' Artifact keys only apply with `id-prefix`.')

  const role = block.role

  if (role !== undefined && !DOCUMENT_ROLES.includes(role as DocumentRole)) {
    fail(where, `unknown role "${display(role)}". Valid: ${DOCUMENT_ROLES.join(', ')}.`)
  }

  return {
    path: rule.path,
    owner: rule.owner,
    skill: rule.skill,
    role: role === undefined ? null : (role as DocumentRole),
    audience: parseAudience(block.audience, where),
    core: rule,
  }
}

/** The living-docs configuration on top of what the core resolved. Pure function. */
export function adaptConfig(core: ResolvedConfig): LivingDocsConfig {
  const top = core.pluginBlocks[PLUGIN] ?? {}
  const topWhere = `${core.rootFile}.${PLUGIN}`

  assertKnown(top, TOP_KEYS, topWhere)

  const artifacts: ArtifactRule[] = []
  const documents: DocumentRule[] = []

  for (const rule of core.owned) {
    const block = rule.pluginBlocks[PLUGIN]

    if (block === undefined) {
      continue
    }
    if (block['id-prefix'] !== undefined) {
      artifacts.push(toArtifact(rule, block))
    } else {
      documents.push(toDocument(rule, block))
    }
  }

  if (artifacts.length === 0) {
    fail(
      core.rootFile,
      `no \`owned\` entry carries \`${PLUGIN}.id-prefix\` — with no declared artifact nothing is enforceable. ` +
        `Declare \`plugins: [${PLUGIN}]\` at the root and the \`${PLUGIN}:\` block in the entries.`,
    )
  }

  const prefixes = new Set<string>()

  for (const artifact of artifacts) {
    if (prefixes.has(artifact.idPrefix)) {
      fail(core.rootFile, `id-prefix "${artifact.idPrefix}" declared twice. One artifact, one owner.`)
    }
    prefixes.add(artifact.idPrefix)
  }

  const roles = new Set<string>()

  for (const document of documents) {
    if (document.role === null) {
      continue
    }
    if (roles.has(document.role)) {
      fail(core.rootFile, `role "${document.role}" declared in two documents. One role, one document.`)
    }
    roles.add(document.role)
  }

  const stale = top['stale-after-months']

  return {
    rootFile: core.rootFile,
    staleAfterMonths: typeof stale === 'number' ? stale : DEFAULT_STALE_AFTER_MONTHS,
    lastReviewedBumpLimit: parseBumpLimit(top['last-reviewed-bump-limit'], topWhere),
    idFormat: parseIdFormat(top['id-format'], topWhere),
    artifacts,
    documents,
    generated: core.generated.map(rule => ({ path: rule.path, command: rule.command })),
    watches: core.watches.map(rule => ({ code: rule.code, doc: rule.doc, reason: rule.reason, consumerVisible: rule.consumerVisible })),
    core,
  }
}

/**
 * Finds the ownership file by the core's candidate order, validates the
 * schema, the disjunction and the bases (the core), and then the `living-docs:` block
 * with the usual rigor: an unknown key is an error. `OwnershipError` bubbles up as is.
 */
export function loadLivingDocsConfig(root: string): LivingDocsConfig {
  const core = resolveOwnership(root)

  if (core === null) {
    throw new OwnershipError(`no ownership file found in ${root}. Run \`living-docs init\` (owning skill: living-docs-bootstrap).`)
  }

  return adaptConfig(core)
}

/**
 * Value of a canonical field of the item, honouring the artifact's `field-map`.
 * Returns null for an empty cell — absent and empty are the same thing here.
 */
export function fieldOf(rule: ArtifactRule, item: DocItem, canonical: string): string | null {
  const key = rule.fieldMap[normalizeFieldKey(canonical)] ?? normalizeFieldKey(canonical)
  const value = item.fields[key]

  if (value === undefined || isEmptyValue(value)) {
    return null
  }

  return value.trim()
}

/**
 * Whether the item carries a canonical field at all — a column or a bullet,
 * even an empty one — honouring the artifact's `field-map`. Tells "the table
 * has no such column" apart from "the cell is empty" (RN-0039).
 */
export function hasField(rule: ArtifactRule, item: DocItem, canonical: string): boolean {
  const key = rule.fieldMap[normalizeFieldKey(canonical)] ?? normalizeFieldKey(canonical)

  return item.fields[key] !== undefined
}

function normalizePath(repoPath: string): string {
  return repoPath.split('\\').join('/').replace(/^\.\//, '')
}

/** Does the declared path cover this path? Directory by prefix, file by equality. */
function covers(declared: string, repoPath: string): boolean {
  const target = declared.split('\\').join('/')

  return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target
}

/** Artifact rule that owns a path relative to the repository root, or null. */
export function findArtifactRule(config: LivingDocsConfig, repoPath: string): ArtifactRule | null {
  const normalized = normalizePath(repoPath)

  return config.artifacts.find(artifact => covers(artifact.path, normalized)) ?? null
}

/** Document that owns a relative path, or null. Same semantics as `findArtifactRule`. */
export function findDocumentRule(config: LivingDocsConfig, repoPath: string): DocumentRule | null {
  const normalized = normalizePath(repoPath)

  return config.documents.find(document => covers(document.path, normalized)) ?? null
}

/** The document the project declared with this role, or null. */
export function documentWithRole(config: LivingDocsConfig, role: DocumentRole): DocumentRule | null {
  return config.documents.find(document => document.role === role) ?? null
}
