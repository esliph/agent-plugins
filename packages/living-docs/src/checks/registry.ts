import type { Check } from '../core/types.ts'
import { livingDocsFrontmatter } from './frontmatter.ts'
import { livingDocsIdIntegrity } from './id-integrity.ts'
import { livingDocsCitationCoverage } from './citation-coverage.ts'
import { livingDocsStaleness } from './staleness.ts'
import { livingDocsAgentContractDuplication } from './agent-contract-duplication.ts'
import { livingDocsDoneVerifiable } from './done-verifiable.ts'
import { livingDocsOpenDecisionClaim } from './open-decision-claim.ts'
import { livingDocsLinks } from './links.ts'
import { livingDocsCommitDiscipline } from './commit-discipline.ts'
import type { CommitFacts } from './commit-discipline.ts'
import { livingDocsTriggerRouting } from './trigger-routing.ts'
import { livingDocsExternalAudience } from './external-audience.ts'
import { CHECK_CATALOG } from './catalog.ts'
import type { CatalogEntry } from './catalog.ts'

/**
 * Checks que `living-docs validate` roda, na ordem. Nenhum deles executa nada.
 *
 * Função, e não constante: `living-docs/open-decision-claim` e `living-docs/commit-discipline` recebem o diff por injeção. Sem diff,
 * a metade do diff simplesmente não roda (`ADR-0010`).
 */
export function validateChecks(diff: CommitFacts | null = null): readonly Check[] {
  return [
    livingDocsFrontmatter,
    livingDocsIdIntegrity,
    livingDocsCitationCoverage,
    livingDocsStaleness,
    livingDocsAgentContractDuplication,
    livingDocsDoneVerifiable,
    livingDocsOpenDecisionClaim(diff),
    livingDocsLinks,
    livingDocsCommitDiscipline(diff),
    livingDocsTriggerRouting(),
    livingDocsExternalAudience,
  ]
}

/**
 * Reexportado de `./catalog.ts` (fonte real, sem dependências) para não
 * quebrar quem já importa `CHECK_CATALOG`/`CatalogEntry` daqui.
 */
export type { CatalogEntry, CommitFacts }
export { CHECK_CATALOG }
