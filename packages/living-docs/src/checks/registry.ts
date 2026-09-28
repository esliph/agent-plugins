import type { Check } from '../core/types.ts'
import { ci1Structure } from './ci1-structure.ts'
import { ci2Ids } from './ci2-ids.ts'
import { ci3Traceability } from './ci3-traceability.ts'
import { ci4Staleness } from './ci4-staleness.ts'
import { ci7OwnershipCoverage } from './ci7-ownership-coverage.ts'
import { ci8Links } from './ci8-links.ts'
import { ci9CommitDiscipline } from './ci9-commit-discipline.ts'
import type { CommitFacts } from './ci9-commit-discipline.ts'
import { ci10TriggerRouting } from './ci10-trigger-routing.ts'
import { ci11ExternalAudience } from './ci11-external-audience.ts'
import { CHECK_CATALOG } from './catalog.ts'
import type { CatalogEntry } from './catalog.ts'

/**
 * Checks que `living-docs validate` roda, na ordem. Nenhum deles executa nada.
 *
 * Função, e não constante: `CI-7` e `CI-9` recebem o diff por injeção. Sem diff,
 * a metade do diff simplesmente não roda (`ADR-0010`).
 */
export function validateChecks(diff: CommitFacts | null = null): readonly Check[] {
  return [
    ci1Structure,
    ci2Ids,
    ci3Traceability,
    ci4Staleness,
    ci7OwnershipCoverage(diff),
    ci8Links,
    ci9CommitDiscipline(diff),
    ci10TriggerRouting(),
    ci11ExternalAudience,
  ]
}

/**
 * Reexportado de `./catalog.ts` (fonte real, sem dependências) para não
 * quebrar quem já importa `CHECK_CATALOG`/`CatalogEntry` daqui.
 */
export type { CatalogEntry, CommitFacts }
export { CHECK_CATALOG }
