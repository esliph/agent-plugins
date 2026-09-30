import { listFiles, readTextFile } from '../core/files.ts'
import { PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

export interface DetectedFormat {
  format: IdFormat
  /** How many occurrences were read in this form. */
  count: number
  /** One real occurrence, so the installer can recognize what the toolkit saw. */
  sample: string
}

/**
 * Deliberately permissive scan: a prefix of 2 to 4 capital letters, an optional
 * one-character separator, 2 to 6 digits. The question is "what form does this
 * repository use?", and a detector that already knew the answer would detect
 * nothing (`RF-0014`).
 */
const ANY_ID = /\b([A-Z]{2,4})([-_.:]?)(\d{2,6})\b/g

function keyOf(separator: string, digits: number): string {
  return `${separator}|${digits}`
}

/**
 * The dominant written form in the given paths, or `null` when there is no ID
 * at all. Only the paths `init` resolved go in: detecting the format across the
 * whole repository is noise, not inventory.
 */
export function detectIdFormat(root: string, paths: readonly string[]): DetectedFormat | null {
  const globs = paths.map(path => (path.endsWith('/') ? `${path}**` : path))
  const tallies = new Map<string, { format: IdFormat; count: number; sample: string }>()

  for (const file of listFiles(root, globs)) {
    const content = readTextFile(root, file)

    if (content === null) {
      continue
    }

    for (const match of content.matchAll(ANY_ID)) {
      const separator = match[2] ?? ''
      const digits = (match[3] ?? '').length

      if (!SEPARATORS_ALLOWED.includes(separator)) {
        continue
      }
      if (digits < PADDING_RANGE.min || digits > PADDING_RANGE.max) {
        continue
      }

      const key = keyOf(separator, digits)
      const tally = tallies.get(key)

      if (tally) {
        tally.count += 1
        continue
      }
      tallies.set(key, { format: { separator, padding: digits }, count: 1, sample: match[0] })
    }
  }

  let winner: DetectedFormat | null = null

  for (const tally of tallies.values()) {
    if (winner === null || tally.count > winner.count) {
      winner = tally
    }
  }

  return winner
}
