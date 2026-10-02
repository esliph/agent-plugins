import type { Config } from '../config/config.ts'
import type { Finding } from '../core/types.ts'
import { LIMIT, parseId } from '../ids/id.ts'
import type { Capability } from '../registry/registry.ts'
import type { Requirement } from '../specs/parse.ts'

/** The two warnings before a capability stops at the limit (RN-0046). A warning never fails a run. */
export function checkCapacity(requirements: readonly Requirement[], registry: ReadonlyMap<string, Capability>, thresholds: Config['thresholds']): Finding[] {
  const findings: Finding[] = []
  const active = new Map<string, Set<string>>()

  for (const { token } of requirements) {
    const prefix = parseId(token)?.prefix

    if (prefix !== undefined) {
      active.set(prefix, (active.get(prefix) ?? new Set()).add(token))
    }
  }

  for (const capability of registry.values()) {
    const count = active.get(capability.prefix)?.size ?? 0
    const warning = (line: number, message: string): void =>
      void findings.push({ file: capability.file, line, ruleId: 'kanon/capacity', severity: 'warning', message })

    if (count >= thresholds.activeRequirements) {
      warning(0, `${capability.prefix} has ${count} active requirements — a capability this large is a candidate for a split.`)
    }
    if (capability.counter >= thresholds.counter) {
      warning(
        capability.lines.counter ?? 0,
        `the counter of ${capability.prefix} is at ${capability.counter} of ${LIMIT} — at ${LIMIT} the capability has to be split.`,
      )
    }
  }

  return findings
}
