import { codeownersMatch } from './codeowners-match.ts'
import { ownerCoverage } from './owner-coverage.ts'
import type { Check } from './types.ts'

export interface CatalogEntry {
  readonly id: string
  readonly name: string
  readonly command: string
  readonly failsWhen: string
}

/** The checks of the core, in the order of the public catalog. */
export const coreChecks: readonly Check[] = Object.freeze([ownerCoverage, codeownersMatch])

export const coreCheckCatalog: readonly CatalogEntry[] = Object.freeze(
  coreChecks.map(check => Object.freeze({ id: check.id, name: check.name, command: `ownership validate --check ${check.id}`, failsWhen: check.failsWhen })),
)
