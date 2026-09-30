import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { OwnershipError } from '../schema/types.ts'

export interface LocateOptions {
  /** Comes from `--ownership <path>` in the CLI. */
  explicitPath?: string | null
  env?: Record<string, string | undefined>
}

/** Order of candidates when nothing is explicit (spec §8). */
const CANDIDATES: readonly string[] = ['.ownership.yml', 'docs/.ownership.yml']

/**
 * The root ownership file, or `null` — a repository without the toolkit, and that
 * is not an error. Two candidates present is an error that names both and never
 * picks: a freshly migrated file living next to a forgotten one would validate
 * through the forgotten one in silence.
 */
export function locateRootFile(root: string, opts: LocateOptions = {}): string | null {
  const explicit = opts.explicitPath ?? opts.env?.OWNERSHIP_CONFIG ?? null

  if (explicit !== null) {
    if (!existsSync(join(root, explicit))) {
      throw new OwnershipError(`${explicit}: not found — given explicitly and does not exist in the repository.`)
    }

    return explicit
  }

  const found = CANDIDATES.filter(candidate => existsSync(join(root, candidate)))

  if (found.length > 1) {
    throw new OwnershipError(
      `More than one ownership file found: ${found.join(', ')}. ` +
        'The ambiguity does not resolve itself — delete one of them, or point to the right one with `--ownership <path>`.',
    )
  }

  return found[0] ?? null
}
