import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { SPECS_DIR, SPEC_FILE } from '../core/paths.ts'

export interface Requirement {
  file: string
  /** Line of the heading. */
  line: number
  /** The last line of the block that is not blank: the heading itself when nothing is under it. */
  endLine: number
  /** The ID as written in the heading, valid or not. */
  token: string
  /** The pattern named in the heading; null when the heading names none. */
  tag: string | null
  /** The criterion as one line; empty when the heading has nothing under it. */
  criterion: string
  criterionLine: number
}

// A level-3 heading that opens with something shaped like an ID is a
// requirement, so that `CHK-14` is caught instead of skipped.
const HEADING = /^###\s+([A-Za-z]+-\d+)\b\s*(.*)$/
const ANY_HEADING = /^#{1,6}(?:\s|$)/
const TAG = /^\[([^\]]*)\]$/
const FENCE = /^\s*(```|~~~)/
const METADATA = /^(Story|Status|Since|Supersedes)\s*:/

// A block runs from the heading of a requirement to the line before the next
// heading of any level, or to the end of the file; a heading inside a code
// fence is text (RN-0058).
export function parseSpec(file: string, source: string): Requirement[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const requirements: Requirement[] = []
  let fenced = false
  let open: Requirement | null = null

  const requirementAt = (index: number, token: string, rest: string): Requirement => {
    let start = index + 1

    while (start < lines.length && (lines[start] ?? '').trim() === '') {
      start++
    }

    const sentence: string[] = []

    for (let cursor = start; cursor < lines.length; cursor++) {
      const text = (lines[cursor] ?? '').trim()

      if (text === '' || text.startsWith('#') || METADATA.test(text) || FENCE.test(text)) {
        break
      }
      sentence.push(text)
    }

    return {
      file,
      line: index + 1,
      endLine: index + 1,
      token,
      tag: TAG.exec(rest.trim())?.[1]?.trim() ?? null,
      criterion: sentence.join(' '),
      criterionLine: sentence.length === 0 ? index + 1 : start + 1,
    }
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ''

    if (FENCE.test(line)) {
      fenced = !fenced
    } else if (!fenced && ANY_HEADING.test(line)) {
      const heading = HEADING.exec(line)

      open = heading?.[1] === undefined ? null : requirementAt(index, heading[1], heading[2] ?? '')

      if (open !== null) {
        requirements.push(open)
      }
    }
    if (open !== null && line.trim() !== '') {
      open.endLine = index + 1
    }
  }

  return requirements
}

// Every `spec.md` under a directory — `specs/` unless told otherwise — at any
// depth, relative to the project root and in a stable order.
export function findSpecs(root: string, dir: string = SPECS_DIR): string[] {
  const found: string[] = []

  const walk = (current: string): void => {
    for (const entry of readdirSync(join(root, current), { withFileTypes: true })) {
      const path = `${current}/${entry.name}`

      if (entry.isDirectory()) {
        walk(path)
      } else if (entry.name === SPEC_FILE) {
        found.push(path)
      }
    }
  }

  if (existsSync(join(root, dir))) {
    walk(dir)
  }

  return found.sort()
}
