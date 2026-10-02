import { CHANGE_ID, type OpenChange } from '../changes/change.ts'
import type { Delta, DeltaEntry } from '../changes/delta.ts'
import { SPECS_DIR, SPEC_FILE } from '../core/paths.ts'
import type { Finding, Severity } from '../core/types.ts'
import { parseId } from '../ids/id.ts'
import type { Capability } from '../registry/registry.ts'
import type { Requirement } from '../specs/parse.ts'

type Registry = ReadonlyMap<string, Capability>

interface Placed {
  change: OpenChange
  delta: Delta
  entry: DeltaEntry
}

function placed(changes: readonly OpenChange[]): Placed[] {
  return changes.flatMap(change => change.deltas.flatMap(delta => delta.entries.map(entry => ({ change, delta, entry }))))
}

function at({ entry }: Placed, ruleId: string, severity: Severity, message: string): Finding {
  return { file: entry.requirement.file, line: entry.requirement.line, ruleId, severity, message }
}

/** Whether a path is the current spec of a registered capability. */
function registered(target: string, registry: Registry): boolean {
  return [...registry.values()].some(capability => target === `${SPECS_DIR}/${capability.name}/${SPEC_FILE}`)
}

// A change is a folder named by its ID, with a proposal that says the same ID
// (RN-0052).
export function checkChangeShape(changes: readonly OpenChange[]): Finding[] {
  const findings: Finding[] = []

  for (const { id, dir, proposal } of changes) {
    const error = (file: string, line: number, message: string): void =>
      void findings.push({ file, line, ruleId: 'kanon/change-shape', severity: 'error', message })

    if (!CHANGE_ID.test(id)) {
      error(dir, 0, `"${id}" is not a change ID: a date as YYYY-MM-DD, a hyphen and a slug in lowercase with hyphens.`)
    }
    if (proposal.problem !== null) {
      error(proposal.file, 0, proposal.problem)
    } else if (proposal.change !== id) {
      error(proposal.file, proposal.line, `\`change\` must be ${id}, the name of the folder.`)
    }
  }

  return findings
}

// A delta mirrors the path of the spec it changes, and holds the three
// sections and nothing else (RN-0053).
export function checkDeltaShape(changes: readonly OpenChange[], registry: Registry): Finding[] {
  const findings: Finding[] = []

  for (const delta of changes.flatMap(change => change.deltas)) {
    const error = (line: number, message: string): void =>
      void findings.push({ file: delta.file, line, ruleId: 'kanon/delta-shape', severity: 'error', message })

    if (!registered(delta.target, registry)) {
      error(0, `${delta.target} is not the spec of a registered capability: a delta sits at the path of the spec it changes.`)
    }
    for (const problem of delta.problems) {
      error(problem.line, problem.message)
    }
  }

  return findings
}

// A MODIFIED and a REMOVED name a requirement that is in the spec the delta
// mirrors (RN-0054).
export function checkDeltaTarget(changes: readonly OpenChange[], current: readonly Requirement[], registry: Registry): Finding[] {
  const findings: Finding[] = []

  for (const item of placed(changes)) {
    const { delta, entry } = item
    const { token } = entry.requirement

    // A delta that mirrors no spec has no target to look into; its shape was reported.
    if (entry.operation === 'ADDED' || !registered(delta.target, registry)) {
      continue
    }
    if (current.some(requirement => requirement.token === token && requirement.file === delta.target)) {
      continue
    }

    const elsewhere = current.find(requirement => requirement.token === token)

    findings.push(
      at(
        item,
        'kanon/delta-target',
        'error',
        elsewhere === undefined
          ? `${token} is not a requirement of ${delta.target}.`
          : `${token} is not a requirement of ${delta.target}: it lives in ${elsewhere.file}, and that is the spec whose delta changes it.`,
      ),
    )
  }

  return findings
}

// An ADDED takes an ID nobody has: neither a requirement of the current specs
// nor a tombstone (RN-0055).
export function checkDeltaAdded(changes: readonly OpenChange[], current: readonly Requirement[], registry: Registry): Finding[] {
  const findings: Finding[] = []

  for (const item of placed(changes)) {
    const { token } = item.entry.requirement

    if (item.entry.operation !== 'ADDED') {
      continue
    }

    const active = current.find(requirement => requirement.token === token)
    const capability = registry.get(parseId(token)?.prefix ?? '')

    if (active !== undefined) {
      findings.push(at(item, 'kanon/delta-added', 'error', `${token} is already the ID of the requirement at ${active.file}:${active.line}.`))
    }
    if (capability?.tombstones.includes(token) === true) {
      findings.push(
        at(item, 'kanon/delta-added', 'error', `${token} is a tombstone in ${capability.file}: the ID of a removed requirement is never used again.`),
      )
    }
  }

  return findings
}

// An ID appears in one operation of a change (RN-0055).
export function checkDeltaDuplicate(changes: readonly OpenChange[]): Finding[] {
  const findings: Finding[] = []

  for (const change of changes) {
    const seen = new Map<string, Requirement>()

    for (const item of placed([change])) {
      const { requirement } = item.entry
      const first = seen.get(requirement.token)

      if (first === undefined) {
        seen.set(requirement.token, requirement)
      } else {
        findings.push(
          at(item, 'kanon/delta-duplicate', 'error', `${requirement.token} is already in an operation of this change, at ${first.file}:${first.line}.`),
        )
      }
    }
  }

  return findings
}

// The mechanical half of a change of intent: the new requirement supersedes
// one that the same change removes (RN-0056).
export function checkDeltaSupersedes(changes: readonly OpenChange[]): Finding[] {
  const findings: Finding[] = []

  for (const change of changes) {
    const items = placed([change])
    const removed = new Set(items.filter(item => item.entry.operation === 'REMOVED').map(item => item.entry.requirement.token))

    for (const { entry } of items) {
      for (const { id, line } of entry.operation === 'ADDED' ? entry.supersedes : []) {
        if (!removed.has(id)) {
          findings.push({
            file: entry.requirement.file,
            line,
            ruleId: 'kanon/delta-supersedes',
            severity: 'error',
            message: `${entry.requirement.token} supersedes ${id}, which this change does not remove.`,
          })
        }
      }
    }
  }

  return findings
}

/** What two operations on one ID, in two open changes, amount to; null when they can both be synced. */
function clash(mine: DeltaEntry, theirs: DeltaEntry, other: string): { severity: Severity; message: string } | null {
  const { token } = mine.requirement

  if (mine.operation === 'ADDED' && theirs.operation === 'ADDED') {
    return { severity: 'error', message: `${token} is also added by the open change ${other}.` }
  }
  if (mine.operation === 'ADDED' || theirs.operation === 'ADDED') {
    return null
  }
  if (theirs.operation === 'REMOVED') {
    return { severity: 'error', message: `${token} is removed by the open change ${other}: whichever is synced second would break.` }
  }
  if (mine.operation === 'REMOVED') {
    return {
      severity: 'error',
      message: `${token} is modified by the open change ${other}, and this change removes it: whichever is synced second would break.`,
    }
  }

  return { severity: 'warning', message: `${token} is also modified by the open change ${other}: the one synced second replaces the text of the first.` }
}

// Two open changes are an error only where the second sync would break. Each
// side gets the finding, naming the other: a script does not know which yields
// (RN-0057).
export function checkDeltaConflict(changes: readonly OpenChange[]): Finding[] {
  const findings: Finding[] = []
  const items = placed(changes)

  for (const mine of items) {
    for (const theirs of items) {
      if (mine.change === theirs.change || mine.entry.requirement.token !== theirs.entry.requirement.token) {
        continue
      }

      const found = clash(mine.entry, theirs.entry, theirs.change.id)

      if (found !== null) {
        findings.push(at(mine, 'kanon/delta-conflict', found.severity, found.message))
      }
    }
  }

  return findings
}

/** Every rule of a change and of its deltas that is not a rule of a requirement. */
export function checkChanges(changes: readonly OpenChange[], current: readonly Requirement[], registry: Registry): Finding[] {
  return [
    ...checkChangeShape(changes),
    ...checkDeltaShape(changes, registry),
    ...checkDeltaTarget(changes, current, registry),
    ...checkDeltaAdded(changes, current, registry),
    ...checkDeltaDuplicate(changes),
    ...checkDeltaSupersedes(changes),
    ...checkDeltaConflict(changes),
  ]
}
