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
 * Checks that `living-docs validate` runs, in order. None of them executes anything.
 *
 * A function, not a constant: `living-docs/open-decision-claim` and `living-docs/commit-discipline` receive the diff by injection. Without a diff,
 * the diff half simply does not run (`ADR-0010`).
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
 * Re-exported from `./catalog.ts` (the real source, dependency-free) so as not to
 * break whoever already imports `CHECK_CATALOG`/`CatalogEntry` from here.
 */
export type { CatalogEntry, CommitFacts }
export { CHECK_CATALOG }
