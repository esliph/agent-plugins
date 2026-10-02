import { loadConfig } from '../config/config.ts'
import { LIMIT, formatId } from '../ids/id.ts'
import { loadRegistry, writeCapability } from '../registry/registry.ts'

export interface Allocation {
  /** Null when nothing was allocated. */
  id: string | null
  /** Why nothing was allocated. */
  refusal: string | null
  warning: string | null
}

// A new ID is the counter plus one, and allocating writes the counter back
// (RN-0045). At the limit nothing is allocated; near it, the ID comes with a
// warning (RN-0046).
export function allocateId(root: string, prefix: string): Allocation {
  const { thresholds } = loadConfig(root)
  const capability = loadRegistry(root).get(prefix)

  if (capability === undefined) {
    return { id: null, refusal: `the prefix ${prefix} is not registered — register the capability first.`, warning: null }
  }
  if (capability.counter >= LIMIT) {
    return { id: null, refusal: `${prefix} is at ${LIMIT}, the last ID of a capability — split it and allocate under the new prefix.`, warning: null }
  }

  const counter = capability.counter + 1

  writeCapability(root, { ...capability, counter })

  return {
    id: formatId(prefix, counter),
    refusal: null,
    warning: counter >= thresholds.counter ? `the counter of ${prefix} is at ${counter} of ${LIMIT} — at ${LIMIT} the capability has to be split.` : null,
  }
}
