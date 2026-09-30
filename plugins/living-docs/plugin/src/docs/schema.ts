/** Required fields of an individual artifact (spec §2). */
export const REQUIRED_FIELDS: readonly string[] = ['id', 'title', 'status', 'owner', 'trigger', 'last-reviewed']

/** Required fields of the container file of a table collection. */
export const CONTAINER_REQUIRED_FIELDS: readonly string[] = ['title', 'owner', 'trigger', 'last-reviewed']

/** Default allowlist for mutating a frozen item (spec §2 and §7). */
export const MUTABLE_FIELDS_DEFAULT: readonly string[] = ['status', 'superseded-by', 'last-reviewed']

/** "No terminal state allows editing the body" (spec §4). */
export const FROZEN_STATUSES: ReadonlySet<string> = new Set(['accepted', 'superseded', 'deprecated', 'published', 'paid', 'revoked'])

/** "No agent promotes state on its own" (spec §4); it is the trigger of living-docs/state-promotion. */
export const HUMAN_PROMOTIONS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'draft', to: 'accepted' },
  { from: 'open', to: 'resolved' },
  { from: 'draft', to: 'active' },
  { from: 'active', to: 'revoked' },
  { from: 'draft', to: 'published' },
])

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime())
  }
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    return false
  }
  const date = new Date(`${value}T00:00:00Z`)

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/**
 * The **written** form of an ID in this project (`ADR-0011`, `RN-0024`).
 *
 * It is not the identity: the identity is `canonicalId`, which never changes and is not
 * displayed. This is the form the parser recognizes when reading and the one `writeId`
 * prints when suggesting a new ID — and it is what allows adopting a repository whose
 * IDs are already written another way without rewriting a file of its own.
 */
export interface IdFormat {
  separator: string
  padding: number
}

export const DEFAULT_ID_FORMAT: IdFormat = Object.freeze({ separator: '-', padding: 4 })

/**
 * Closed vocabulary (`ADR-0011`). An arbitrary separator would become a regular
 * expression pattern coming from configuration — a surface this toolkit refuses.
 */
export const SEPARATORS_ALLOWED: readonly string[] = Object.freeze(['-', '_', '.', ':', ''])

export const PADDING_RANGE = Object.freeze({ min: 2, max: 6 })

/** Padding of the canonical key. Internal, never displayed, never configurable. */
const CANONICAL_PADDING = 4

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * How many digits READING accepts: the declared padding and one fewer.
 *
 * It is the rule that already existed under another name — `ADR-001` and `ADR-0001` are the same
 * item (`RN-0003`), and repadding never created a new item. With the default this gives 3 to
 * 4 digits, which is exactly what the toolkit has read since Phase 0.
 */
export function digitRange(format: IdFormat): { min: number; max: number } {
  return { min: Math.max(1, format.padding - 1), max: format.padding }
}

/** The body of an ID pattern: group 1 is the prefix, group 2 is the number. */
export function idPatternSource(format: IdFormat = DEFAULT_ID_FORMAT): string {
  const { min, max } = digitRange(format)

  return `([A-Z]{2,4})${escapeForRegExp(format.separator)}(\\d{${min},${max}})`
}

export function parseId(value: unknown, format: IdFormat = DEFAULT_ID_FORMAT): { prefix: string; number: number } | null {
  if (typeof value !== 'string') {
    return null
  }
  const match = new RegExp(`^${idPatternSource(format)}$`).exec(value.trim())

  if (!match?.[1] || !match[2]) {
    return null
  }

  return { prefix: match[1], number: Number.parseInt(match[2], 10) }
}

/**
 * Canonical form of an ID for identity comparison. **It does not change with the
 * project** (`ADR-0011`): it is an internal key, and changing it would change the identity of
 * every item already registered. `ADR-001`, `ADR-0001` and `ADR001` are the same thing —
 * without canonicalizing, repadding would defeat "an ID is never recycled" (spec §2).
 */
export function canonicalId(parsed: { prefix: string; number: number }): string {
  return `${parsed.prefix}-${String(parsed.number).padStart(CANONICAL_PADDING, '0')}`
}

/**
 * The only function that writes an ID (`RN-0024`). No check builds an ID by
 * concatenation: a format assembled by hand in two places diverges in the first
 * project that declares another form.
 */
export function writeId(prefix: string, number: number, format: IdFormat = DEFAULT_ID_FORMAT): string {
  return `${prefix}${format.separator}${String(number).padStart(format.padding, '0')}`
}
