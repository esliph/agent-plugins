import { parseSpec } from '../specs/parse.ts'
import type { DeltaEntry } from './delta.ts'

export interface Applied {
  /** The spec after the delta. */
  text: string
  /** The IDs that left the spec, in the order of the delta. */
  tombstones: string[]
  /** The IDs a MODIFIED or a REMOVED names that are not in the spec. */
  missing: string[]
}

function blank(line: string | undefined): boolean {
  return (line ?? '').trim() === ''
}

// The merge is by requirement block and touches no disk. A MODIFIED replaces
// the block where it is, a REMOVED takes it out, and an ADDED goes to the end
// in the order of the delta. The blank lines after a block belong to it;
// everything else stays byte for byte, line endings included (RN-0058).
export function applyDelta(source: string, entries: readonly DeltaEntry[]): Applied {
  // Split on the line feed alone: each line keeps its carriage return.
  const lines = source.split('\n')
  const cr = source.includes('\r\n') ? '\r' : ''
  const written = (text: string): string[] => text.split('\n').map(line => `${line}${cr}`)
  const modified = new Map<string, string>()
  const removed = new Set<string>()
  const added: string[] = []

  for (const { operation, requirement, text } of entries) {
    if (operation === 'MODIFIED') {
      modified.set(requirement.token, text)
    } else if (operation === 'REMOVED') {
      removed.add(requirement.token)
    } else {
      added.push(text)
    }
  }

  const found = new Set<string>()
  const result: string[] = []
  let cursor = 0

  for (const requirement of parseSpec('', source)) {
    const replacement = modified.get(requirement.token)

    if (replacement === undefined && !removed.has(requirement.token)) {
      continue
    }
    found.add(requirement.token)

    let end = requirement.endLine

    while (end < lines.length && blank(lines[end])) {
      end++
    }
    result.push(...lines.slice(cursor, requirement.line - 1))

    if (replacement !== undefined) {
      result.push(...written(replacement))

      if (end < lines.length) {
        result.push(cr)
      }
    }
    cursor = end
  }
  result.push(...lines.slice(cursor))

  while (result.length > 0 && blank(result.at(-1))) {
    result.pop()
  }
  for (const block of added) {
    if (result.length > 0) {
      result.push(cr)
    }
    result.push(...written(block))
  }

  const last = result.at(-1)

  // A file that ended without a line break ends with one now, in its own style.
  if (last !== undefined && !last.endsWith(cr)) {
    result[result.length - 1] = `${last}${cr}`
  }

  return {
    text: result.length === 0 ? '' : `${result.join('\n')}\n`,
    tombstones: [...removed].filter(id => found.has(id)),
    missing: [...modified.keys(), ...removed].filter(id => !found.has(id)),
  }
}
