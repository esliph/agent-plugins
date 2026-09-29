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
      throw new OwnershipError(`${explicit}: não encontrado — indicado explicitamente e não existe no repositório.`)
    }

    return explicit
  }

  const found = CANDIDATES.filter(candidate => existsSync(join(root, candidate)))

  if (found.length > 1) {
    throw new OwnershipError(
      `Mais de um arquivo de ownership encontrado: ${found.join(', ')}. ` +
        'A ambiguidade não se resolve sozinha — apague um dos dois, ou aponte o certo com `--ownership <caminho>`.',
    )
  }

  return found[0] ?? null
}
