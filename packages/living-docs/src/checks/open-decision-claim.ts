import type { Check, CheckContext, DiffFacts, Finding } from '../core/types.ts'
import { exceptionReasonFor } from './exception-label.ts'
import { blockedClaims, claimsFor } from '../docs/blocked.ts'

const RULE = 'living-docs/open-decision-claim'

/** The label that releases the check (`ADR-0010`). */
export function docsExceptionReason(messages: readonly string[]): string | null {
  return exceptionReasonFor('Docs', messages)
}

/**
 * `living-docs/open-decision-claim` — the diff touches a path claimed by an
 * open decision (`RN-0026`). It only runs with the diff (`ADR-0010`), and the label
 * `Docs: none — <reason>` releases it. It is the deterministic half of criterion 4 of
 * spec §12.
 */
export function livingDocsOpenDecisionClaim(diff: DiffFacts | null = null): Check {
  return {
    id: RULE,
    name: 'open decision claim',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      if (diff !== null && docsExceptionReason(diff.messages) === null) {
        for (const { claim, matched } of claimsFor(blockedClaims(context.docs), diff.changed)) {
          const levados = matched.slice(0, 5).join(', ') + (matched.length > 5 ? `, … (+${matched.length - 5})` : '')

          findings.push({
            ruleId: RULE,
            file: claim.doc,
            line: claim.line,
            severity: 'error',
            message:
              `The diff \`${diff.base}...HEAD\` touches a path claimed by ${claim.id}, which is \`open\`` +
              `${claim.gap === null ? '' : ` — "${claim.gap}"`}: ${levados}.`,
            // Rule of origin: RN-0026, ADR-0010.
            fix:
              `Resolve ${claim.id} before implementing (owning skill: ${claim.skill}) — while the decision is ` +
              'open there is no rule, and the way out is the ID, not the code. If this change is not the implementation of ' +
              'the missing rule, write the reason in a commit message, in the form `Docs: none — <reason>`.',
          })
        }
      }

      return findings
    },
  }
}
