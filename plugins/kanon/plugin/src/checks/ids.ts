import type { Finding } from '../core/types.ts'
import { parseId } from '../ids/id.ts'
import type { Capability } from '../registry/registry.ts'
import type { Requirement } from '../specs/parse.ts'

// What holds for a requirement wherever it is written, in a current spec or in
// a delta: the format, a registered prefix and the counter (RN-0042, RN-0043,
// RN-0045).
export function checkIdForm(requirements: readonly Requirement[], registry: ReadonlyMap<string, Capability>): Finding[] {
  const findings: Finding[] = []

  for (const { file, line, token } of requirements) {
    const error = (ruleId: string, message: string): void => void findings.push({ file, line, ruleId, severity: 'error', message })
    const id = parseId(token)

    if (id === null) {
      error('kanon/id-format', `"${token}" is not a requirement ID: two to five uppercase letters, a hyphen and three digits from 001 to 999.`)
      continue
    }

    const capability = registry.get(id.prefix)

    if (capability === undefined) {
      error('kanon/id-registered', `the prefix ${id.prefix} has no registry file — register the capability before using its IDs.`)
      continue
    }
    if (id.number > capability.counter) {
      error(
        'kanon/id-counter',
        `${token} is above the counter of ${id.prefix}, which is at ${capability.counter} — an ID comes from the counter, never from hand.`,
      )
    }
  }

  return findings
}

/** Format, registered prefix, uniqueness, tombstones and the counter (RN-0042 to RN-0045). */
export function checkIds(requirements: readonly Requirement[], registry: ReadonlyMap<string, Capability>): Finding[] {
  const findings = checkIdForm(requirements, registry)
  const seen = new Map<string, Requirement>()

  for (const requirement of requirements) {
    const { file, line, token } = requirement
    const error = (ruleId: string, message: string): void => void findings.push({ file, line, ruleId, severity: 'error', message })
    const id = parseId(token)

    if (id === null) {
      continue
    }

    const first = seen.get(token)

    if (first === undefined) {
      seen.set(token, requirement)
    } else {
      error('kanon/id-unique', `${token} is already the ID of the requirement at ${first.file}:${first.line}.`)
    }

    const capability = registry.get(id.prefix)

    if (capability?.tombstones.includes(token) === true) {
      error('kanon/id-tombstone', `${token} is a tombstone in ${capability.file}: the ID of a removed requirement is never used again.`)
    }
  }

  for (const capability of registry.values()) {
    for (const tombstone of capability.tombstones) {
      if ((parseId(tombstone)?.number ?? 0) > capability.counter) {
        findings.push({
          file: capability.file,
          line: capability.lines.tombstones ?? 0,
          ruleId: 'kanon/id-counter',
          severity: 'error',
          message: `the tombstone ${tombstone} is above the counter, which is at ${capability.counter}.`,
        })
      }
    }
  }

  return findings
}
