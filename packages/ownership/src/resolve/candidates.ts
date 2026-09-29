import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { OwnershipError } from '../schema/types.ts'

export interface LocateOptions {
  /** Vem de `--ownership <caminho>` no CLI. */
  explicitPath?: string | null
  env?: Record<string, string | undefined>
}

/** Ordem de candidatos quando nada é explícito (spec §8). */
const CANDIDATES: readonly string[] = ['.ownership.yml', 'docs/.ownership.yml']

/**
 * O arquivo de ownership raiz, ou `null` — repositório sem o toolkit, e isso
 * não é erro. Dois candidatos presentes é erro que nomeia os dois e nunca
 * escolhe: um arquivo recém-migrado convivendo com um esquecido validaria
 * pelo esquecido em silêncio.
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
