import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { applyDelta } from '../changes/apply.ts'
import { CHANGE_ID, SLUG, archiveDir, changeDir, loadChange, openChangeIds, withStatus } from '../changes/change.ts'
import { loadConfig } from '../config/config.ts'
import { ARCHIVE_DIR, PROPOSAL_FILE } from '../core/paths.ts'
import { KanonError, type Finding } from '../core/types.ts'
import { parseId } from '../ids/id.ts'
import { loadRegistry, writeCapability, type Capability } from '../registry/registry.ts'
import { findSpecs, parseSpec } from '../specs/parse.ts'
import { lintProject, loadProject } from './lint.ts'
import { readTemplate } from './templates.ts'

export interface Opening {
  /** Null when nothing was created. */
  id: string | null
  refusal: string | null
}

export interface Ending {
  /** Why the change was left as it was; null when it was ended. */
  refusal: string | null
  /** What the validator sees in the change; `sync` only. */
  findings: Finding[]
  /** One line per ID that became a tombstone or was skipped; `drop` only. */
  notes: string[]
  /** The files written, relative to the project root. */
  written: string[]
  /** The folder as it was moved; null when nothing moved. */
  moved: { from: string; to: string } | null
}

function refuse(refusal: string, findings: Finding[] = []): Ending {
  return { refusal, findings, notes: [], written: [], moved: null }
}

/** Why a change cannot be ended; null when it is an open change. */
function notOpen(root: string, id: string): string | null {
  // The ID becomes a path: one that is not an ID never reaches the disk.
  if (!CHANGE_ID.test(id)) {
    return `"${id}" is not a change ID: a date as YYYY-MM-DD, a hyphen and a slug in lowercase with hyphens.`
  }
  if (existsSync(join(root, archiveDir(id)))) {
    return `${id} is already archived, in ${archiveDir(id)}.`
  }
  // Exactly as the folder is named: a file system that ignores case would let
  // another spelling through, and the lint would then report under the other one.
  if (!openChangeIds(root).includes(id)) {
    return `${id} is not an open change: there is no ${changeDir(id)}.`
  }

  return null
}

function write(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content, 'utf8')
}

/** The proposal gets its last status, and the folder moves last of all. */
function archive(root: string, id: string, status: 'synced' | 'dropped'): { proposal: string; moved: { from: string; to: string } } {
  const proposal = `${changeDir(id)}/${PROPOSAL_FILE}`
  const source = existsSync(join(root, proposal)) ? readFileSync(join(root, proposal), 'utf8') : null

  write(root, proposal, withStatus(source, id, status))
  mkdirSync(join(root, ARCHIVE_DIR), { recursive: true })
  renameSync(join(root, changeDir(id)), join(root, archiveDir(id)))

  return { proposal, moved: { from: changeDir(id), to: archiveDir(id) } }
}

// A change is opened under the date of the day and a slug, and its ID is
// unique across the open and the archived changes (RF-0025, RN-0052).
export function openChange(root: string, slug: string, date: string): Opening {
  loadConfig(root)

  if (!SLUG.test(slug)) {
    return { id: null, refusal: `"${slug}" is not a slug: lowercase letters and digits, in words joined by one hyphen.` }
  }

  const id = `${date}-${slug}`

  for (const dir of [changeDir(id), archiveDir(id)]) {
    if (existsSync(join(root, dir))) {
      return { id: null, refusal: `the change ${id} already exists, in ${dir}.` }
    }
  }
  write(root, `${changeDir(id)}/${PROPOSAL_FILE}`, readTemplate('proposal.md').replaceAll('{{CHANGE}}', id))

  return { id, refusal: null }
}

// The one step that ends a change: its deltas become the current specs and the
// folder is archived. Everything is computed before the first write, so a
// refusal leaves the project as it was (RF-0026, RN-0058).
export function syncChange(root: string, id: string): Ending {
  const project = loadProject(root)
  const refusal = notOpen(root, id)

  if (refusal !== null) {
    return refuse(refusal)
  }

  const change = project.changes.find(candidate => candidate.id === id) ?? loadChange(root, id)

  if (change.deltas.every(delta => delta.entries.length === 0)) {
    return refuse(`${id} has no operation in any delta: there is nothing to sync.`)
  }

  const findings = lintProject(project).filter(finding => finding.file === change.dir || finding.file.startsWith(`${change.dir}/`))

  if (findings.some(finding => finding.severity === 'error')) {
    return refuse(`${id} has errors, and nothing was written.`, findings)
  }

  const specs = new Map<string, string>()
  const registry = new Map(project.registry)
  const touched = new Set<string>()

  for (const delta of change.deltas) {
    if (delta.entries.length === 0) {
      continue
    }

    const path = join(root, delta.target)
    const applied = applyDelta(existsSync(path) ? readFileSync(path, 'utf8') : '', delta.entries)

    if (applied.missing.length > 0) {
      throw new KanonError(`${delta.file}: ${applied.missing.join(', ')} left ${delta.target} while the change was being synced.`)
    }
    specs.set(delta.target, applied.text)

    for (const tombstone of applied.tombstones) {
      const capability = registry.get(parseId(tombstone)?.prefix ?? '')

      // A requirement whose prefix has no registry leaves the spec and has no file to be a tombstone in.
      if (capability !== undefined && !capability.tombstones.includes(tombstone)) {
        registry.set(capability.prefix, { ...capability, tombstones: [...capability.tombstones, tombstone] })
        touched.add(capability.prefix)
      }
    }
  }

  const capabilities = [...touched].sort().flatMap(prefix => registry.get(prefix) ?? [])

  for (const [path, text] of specs) {
    write(root, path, text)
  }
  for (const capability of capabilities) {
    writeCapability(root, capability)
  }

  const { proposal, moved } = archive(root, id, 'synced')

  return { refusal: null, findings, notes: [], written: [...specs.keys(), ...capabilities.map(capability => capability.file), proposal], moved }
}

// An abandoned change gives nothing back: the IDs it allocated become
// tombstones. Its delta is not validated — it may well be broken — and the
// current specs are not touched (RF-0027, RN-0059).
export function dropChange(root: string, id: string): Ending {
  loadConfig(root)

  const refusal = notOpen(root, id)

  if (refusal !== null) {
    return refuse(refusal)
  }

  const registry = loadRegistry(root)
  const current = findSpecs(root).flatMap(file => parseSpec(file, readFileSync(join(root, file), 'utf8')))
  const added = loadChange(root, id).deltas.flatMap(delta => delta.entries.filter(entry => entry.operation === 'ADDED'))
  const touched = new Map<string, Capability>()
  const notes: string[] = []

  for (const token of new Set(added.map(entry => entry.requirement.token))) {
    const parsed = parseId(token)
    const capability = touched.get(parsed?.prefix ?? '') ?? registry.get(parsed?.prefix ?? '')
    const active = current.find(requirement => requirement.token === token)
    const skip = (why: string): void => void notes.push(`skipped  ${token}  ${why}`)

    if (parsed === null) {
      skip('not a requirement ID, so never allocated')
    } else if (capability === undefined) {
      skip(`the prefix ${parsed.prefix} is not registered, so never allocated`)
    } else if (parsed.number > capability.counter) {
      skip(`above the counter of ${parsed.prefix}, so never allocated`)
    } else if (active !== undefined) {
      // Turning a live requirement into a tombstone would corrupt the current specs.
      skip(`an active requirement, at ${active.file}:${active.line}`)
    } else if (capability.tombstones.includes(token)) {
      skip('already a tombstone')
    } else {
      touched.set(capability.prefix, { ...capability, tombstones: [...capability.tombstones, token] })
      notes.push(`tombstone  ${token}`)
    }
  }

  const capabilities = [...touched.values()].sort((a, b) => a.prefix.localeCompare(b.prefix))

  for (const capability of capabilities) {
    writeCapability(root, capability)
  }

  const { proposal, moved } = archive(root, id, 'dropped')

  return { refusal: null, findings: [], notes, written: [...capabilities.map(capability => capability.file), proposal], moved }
}
