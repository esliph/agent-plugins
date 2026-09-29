import { exceptionReasonFor } from '../core/exception-label.ts'
import { pendingDocs } from '../triggers/watches.ts'
import type { Check, CheckContext, Finding } from './types.ts'

export interface DiffFacts {
  base: string
  changed: readonly string[]
  messages: readonly string[]
}

const RULE = 'ownership/watch-satisfied'

function error(file: string, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
}

// Regra de origem: RN-0021 e ADR-0010 do repositório que hospeda o toolkit.
export function ownershipWatchSatisfied(diff: DiffFacts): Check {
  return {
    id: RULE,
    name: 'watch satisfied',
    run(context: CheckContext): Finding[] {
      if (exceptionReasonFor('Docs', diff.messages) !== null) {
        return []
      }

      return pendingDocs(context.config, diff.changed).map(pending => {
        const trigger = pending.matched.slice(0, 5).join(', ') + (pending.matched.length > 5 ? `, … (+${pending.matched.length - 5})` : '')

        return error(
          pending.doc,
          `O diff \`${diff.base}...HEAD\` toca caminho vigiado (${trigger}) e \`${pending.doc}\` não está entre os caminhos alterados.`,
          `Atualize \`${pending.doc}\`${pending.skill === null ? '' : ` (skill dona: ${pending.skill})`} no mesmo PR — ou escreva \`Docs: none — <razão>\` numa mensagem de commit.`,
        )
      })
    },
  }
}
