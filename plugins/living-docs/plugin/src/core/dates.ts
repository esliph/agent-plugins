/**
 * The toolkit's only source of date (`ADR-0007`, `RNF-0004`).
 *
 * No check and no hook reads the clock internally: whoever reads it is the edge — the CLI,
 * the hook, or the test — and the date comes in by value. Without that, the result of `living-docs/staleness`
 * would change on its own as time passes, and the only possible test would be one that
 * passes today and fails in six months.
 */
export type Clock = () => Date

/** Today, as ISO (`YYYY-MM-DD`), in UTC. */
export function todayIso(clock: Clock = () => new Date()): string {
  return clock().toISOString().slice(0, 10)
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * The value as an ISO date, or `null` when it is not a date.
 *
 * `Date` comes in because some projects' YAML declares a real timestamp and the
 * parser materializes it. `null` means "I don't know", and whoever doesn't know stays quiet:
 * `living-docs/frontmatter` already enforces the format of `last-reviewed`, and two checks complaining about the same
 * field is noise.
 */
export function asIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()

  return ISO.test(trimmed) ? trimmed : null
}

/**
 * Calendar months from `from` to `to`; negative when `from` is in the future,
 * `null` when either is not ISO.
 *
 * Months, not days, on purpose: `stale-after-months` is the field the project
 * declares, and day precision changes no decision the warning triggers.
 */
export function monthsBetween(from: string, to: string): number | null {
  const start = ISO.exec(from.trim())
  const end = ISO.exec(to.trim())

  if (!start || !end) {
    return null
  }

  let months = (Number(end[1]) - Number(start[1])) * 12 + (Number(end[2]) - Number(start[2]))
  const startDay = Number(start[3])
  const endDay = Number(end[3])

  if (months > 0 && endDay < startDay) {
    months -= 1
  } else if (months < 0 && endDay > startDay) {
    months += 1
  }

  return months
}
