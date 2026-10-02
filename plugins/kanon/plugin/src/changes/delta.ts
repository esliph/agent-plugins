import { SPECS_DIR, SPEC_FILE } from '../core/paths.ts'
import { parseSpec, type Requirement } from '../specs/parse.ts'

export const OPERATIONS = ['ADDED', 'MODIFIED', 'REMOVED'] as const

export type Operation = (typeof OPERATIONS)[number]

export interface Reference {
  id: string
  line: number
}

export interface DeltaEntry {
  operation: Operation
  /** The heading and what is under it, read as a requirement of a spec is. */
  requirement: Requirement
  /** The block as written, from its heading to its last line with text. */
  text: string
  /** Every ID a `Supersedes:` of the block names, valid or not. */
  supersedes: Reference[]
  /** What the `Reason:` line says; null when there is none, or it says nothing. */
  reason: string | null
}

export interface DeltaProblem {
  line: number
  message: string
}

export interface Delta {
  /** Path of the delta, relative to the project root. */
  file: string
  /** The current spec the delta changes: its own path below the change folder. */
  target: string
  /** The capability the path names: `checkout` in `specs/checkout/spec.md`. */
  name: string
  entries: DeltaEntry[]
  /** What is wrong with the shape of the file, apart from any requirement in it. */
  problems: DeltaProblem[]
}

const FENCE = /^\s*(```|~~~)/
const TITLE = /^#(?:\s|$)/
const SECTION = /^##(?:\s+(.*?))?\s*$/
const REASON = /^Reason\s*:\s*(.*)$/
// A metadata line may hold more than one field, separated by a middle dot.
const SUPERSEDES = /(?:^|·)\s*Supersedes\s*:\s*([^·]*)/

function isOperation(name: string): name is Operation {
  return (OPERATIONS as readonly string[]).includes(name)
}

// A delta holds the three sections and nothing else at level 2. A requirement
// belongs to the section whose heading is the last one above it (RN-0053).
export function parseDelta(file: string, source: string): Delta {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  // `changes/<id>/` is two segments; the rest is the path of the current spec.
  const target = file.split('/').slice(2).join('/')
  const problems: DeltaProblem[] = []
  const first = new Map<Operation, number>()
  /** Line of each heading that opens or closes a section. `null`: a heading that is no section. */
  const marks: { line: number; operation: Operation | null | undefined }[] = []
  let fenced = false

  lines.forEach((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced

      return
    }
    if (fenced) {
      return
    }
    if (TITLE.test(line)) {
      marks.push({ line: index + 1, operation: undefined })

      return
    }

    const section = SECTION.exec(line)

    if (section === null) {
      return
    }

    const name = section[1] ?? ''

    if (!isOperation(name)) {
      problems.push({ line: index + 1, message: `"## ${name}" is not a section of a delta: the only ones are ## ADDED, ## MODIFIED and ## REMOVED.` })
      marks.push({ line: index + 1, operation: null })

      return
    }

    const before = first.get(name)

    if (before === undefined) {
      first.set(name, index + 1)
    } else {
      problems.push({ line: index + 1, message: `the section ## ${name} appears twice: it is already at line ${before}.` })
    }
    marks.push({ line: index + 1, operation: name })
  })

  const entries: DeltaEntry[] = []

  for (const requirement of parseSpec(file, source)) {
    const operation = marks.findLast(mark => mark.line < requirement.line)?.operation

    if (operation === undefined) {
      problems.push({ line: requirement.line, message: `${requirement.token} is outside a section: write it under ## ADDED, ## MODIFIED or ## REMOVED.` })
      continue
    }
    // Under a heading that is no section; the heading was reported already.
    if (operation === null) {
      continue
    }

    const supersedes: Reference[] = []
    let reason: string | null = null

    for (let index = requirement.line; index < requirement.endLine; index++) {
      const text = (lines[index] ?? '').trim()
      const said = REASON.exec(text)?.[1]?.trim()

      if (said !== undefined && said !== '' && reason === null) {
        reason = said
      }
      for (const id of (SUPERSEDES.exec(text)?.[1] ?? '').split(',')) {
        if (id.trim() !== '') {
          supersedes.push({ id: id.trim(), line: index + 1 })
        }
      }
    }
    if (operation === 'REMOVED' && reason === null) {
      problems.push({ line: requirement.line, message: `the removal of ${requirement.token} gives no reason: write a "Reason:" line under its heading.` })
    }

    entries.push({ operation, requirement, text: lines.slice(requirement.line - 1, requirement.endLine).join('\n'), supersedes, reason })
  }

  return {
    file,
    target,
    name: target.startsWith(`${SPECS_DIR}/`) && target.endsWith(`/${SPEC_FILE}`) ? target.slice(SPECS_DIR.length + 1, -(SPEC_FILE.length + 1)) : target,
    entries,
    problems,
  }
}
