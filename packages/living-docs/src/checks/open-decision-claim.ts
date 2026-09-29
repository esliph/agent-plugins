import type { Check, CheckContext, DiffFacts, Finding } from '../core/types.ts'
import { exceptionReasonFor } from './exception-label.ts'
import { blockedClaims, claimsFor } from '../docs/blocked.ts'

const RULE = 'living-docs/open-decision-claim'

/** O rótulo que libera o check (`ADR-0010`). */
export function docsExceptionReason(messages: readonly string[]): string | null {
  return exceptionReasonFor('Docs', messages)
}

/**
 * `living-docs/open-decision-claim` — o diff toca caminho reivindicado por
 * decisão aberta (`RN-0026`). Só roda com o diff (`ADR-0010`), e o rótulo
 * `Docs: none — <razão>` o libera. É a metade determinística do critério 4 da
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
              `O diff \`${diff.base}...HEAD\` toca caminho reivindicado por ${claim.id}, que está \`open\`` +
              `${claim.gap === null ? '' : ` — "${claim.gap}"`}: ${levados}.`,
            // Regra de origem: RN-0026, ADR-0010.
            fix:
              `Resolva ${claim.id} antes de implementar (skill dona: ${claim.skill}) — enquanto a decisão está ` +
              'aberta não há regra, e a saída é o ID, não o código. Se esta mudança não é a implementação da ' +
              'regra que falta, escreva a razão numa mensagem de commit, no formato `Docs: none — <razão>`.',
          })
        }
      }

      return findings
    },
  }
}
