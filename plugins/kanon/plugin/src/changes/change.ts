import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontmatter } from '../core/frontmatter.ts'
import { ARCHIVE_DIR, ARCHIVE_NAME, CHANGES_DIR, PROPOSAL_FILE, SPECS_DIR } from '../core/paths.ts'
import { findSpecs } from '../specs/parse.ts'
import { parseDelta, type Delta } from './delta.ts'

// A change ID is the day the change was opened and a slug. It is the name of
// the folder and never changes; where the folder is says whether the change is
// open or closed (RN-0052).
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const DATE = /^\d{4}-\d{2}-\d{2}$/
export const CHANGE_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/

/** `open` while under `changes/`; the other two tell the endings apart in the archive. */
export type ChangeStatus = 'open' | 'synced' | 'dropped'

export interface Proposal {
  /** Path of `proposal.md`, relative to the project root. */
  file: string
  /** Why the proposal cannot be read; null when its front matter parses. */
  problem: string | null
  /** The `change` key as written; null when it is absent or is not text. */
  change: string | null
  /** Line of the `change` key; 0 when it is absent. */
  line: number
}

export interface OpenChange {
  /** The name of the folder, a change ID or not. */
  id: string
  /** Path of the folder, relative to the project root. */
  dir: string
  proposal: Proposal
  deltas: Delta[]
}

export function changeDir(id: string): string {
  return `${CHANGES_DIR}/${id}`
}

export function archiveDir(id: string): string {
  return `${ARCHIVE_DIR}/${id}`
}

function folders(root: string, dir: string): string[] {
  if (!existsSync(join(root, dir))) {
    return []
  }

  return readdirSync(join(root, dir), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
}

/** The name of every folder under `changes/` but the archive, a change ID or not. */
export function openChangeIds(root: string): string[] {
  return folders(root, CHANGES_DIR).filter(name => name !== ARCHIVE_NAME)
}

export function archivedChangeIds(root: string): string[] {
  return folders(root, ARCHIVE_DIR)
}

function readProposal(root: string, id: string): Proposal {
  const file = `${changeDir(id)}/${PROPOSAL_FILE}`
  const unreadable = (problem: string): Proposal => ({ file, problem, change: null, line: 0 })

  if (!existsSync(join(root, file))) {
    return unreadable('the change has no proposal.md.')
  }

  let frontmatter: ReturnType<typeof parseFrontmatter>

  try {
    frontmatter = parseFrontmatter(readFileSync(join(root, file), 'utf8'))
  } catch (error) {
    return unreadable(`the front matter does not parse — ${error instanceof Error ? error.message : String(error)}`)
  }
  if (frontmatter === null) {
    return unreadable('the proposal has no front matter.')
  }

  const { change } = frontmatter.data

  return { file, problem: null, change: typeof change === 'string' ? change : null, line: frontmatter.lines.change ?? 0 }
}

/** A change under `changes/`, read without judging it. */
export function loadChange(root: string, id: string): OpenChange {
  const dir = changeDir(id)

  return {
    id,
    dir,
    proposal: readProposal(root, id),
    deltas: findSpecs(root, `${dir}/${SPECS_DIR}`).map(file => parseDelta(file, readFileSync(join(root, file), 'utf8'))),
  }
}

export function loadOpenChanges(root: string): OpenChange[] {
  return openChangeIds(root).map(id => loadChange(root, id))
}

const DELIMITER = /^---\s*$/
const BYTE_ORDER_MARK = 0xfeff

// The text of a proposal with its `status` set, and every other line as it
// was. A proposal that is missing or has no front matter gets one, so that an
// archived change always says how it ended.
export function withStatus(source: string | null, id: string, status: ChangeStatus): string {
  const lines = (source ?? '').split('\n')
  const opening = lines[0] ?? ''
  const opens = DELIMITER.test(opening.charCodeAt(0) === BYTE_ORDER_MARK ? opening.slice(1) : opening)
  const end = opens ? lines.findIndex((line, index) => index > 0 && DELIMITER.test(line)) : -1

  if (end === -1) {
    return `---\nchange: ${id}\nstatus: ${status}\n---\n${source ?? `\n# ${id}\n`}`
  }

  const cr = opening.endsWith('\r') ? '\r' : ''
  const at = lines.findIndex((line, index) => index > 0 && index < end && /^status\s*:/.test(line))

  if (at === -1) {
    lines.splice(end, 0, `status: ${status}${cr}`)
  } else {
    lines[at] = `status: ${status}${cr}`
  }

  return lines.join('\n')
}
