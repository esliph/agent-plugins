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

// Source rule: RN-0021 and ADR-0010 of the repository that hosts the toolkit.
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
          `The diff \`${diff.base}...HEAD\` touches a watched path (${trigger}) and \`${pending.doc}\` is not among the changed paths.`,
          `Update \`${pending.doc}\`${pending.skill === null ? '' : ` (owning skill: ${pending.skill})`} in the same PR — or write \`Docs: none — <reason>\` in a commit message.`,
        )
      })
    },
  }
}
