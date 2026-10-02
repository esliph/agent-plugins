import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { SPECS_DIR, SPEC_FILE } from '../core/paths.ts'

export interface Requirement {
  file: string
  /** Line of the heading. */
  line: number
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
const TAG = /^\[([^\]]*)\]$/
const FENCE = /^\s*(```|~~~)/
const METADATA = /^(Story|Status|Since|Supersedes)\s*:/

export function parseSpec(file: string, source: string): Requirement[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const requirements: Requirement[] = []
  let fenced = false

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ''

    if (FENCE.test(line)) {
      fenced = !fenced
      continue
    }

    const heading = fenced ? null : HEADING.exec(line)

    if (heading?.[1] === undefined) {
      continue
    }

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

    requirements.push({
      file,
      line: index + 1,
      token: heading[1],
      tag: TAG.exec((heading[2] ?? '').trim())?.[1]?.trim() ?? null,
      criterion: sentence.join(' '),
      criterionLine: sentence.length === 0 ? index + 1 : start + 1,
    })
  }

  return requirements
}

// Every `spec.md` under `specs/`, at any depth, relative to the project root
// and in a stable order.
export function findSpecs(root: string): string[] {
  const found: string[] = []

  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`

      if (entry.isDirectory()) {
        walk(path)
      } else if (entry.name === SPEC_FILE) {
        found.push(path)
      }
    }
  }

  if (existsSync(join(root, SPECS_DIR))) {
    walk(SPECS_DIR)
  }

  return found.sort()
}
