import { problemsFor } from '../triggers/derives.ts'
import type { DerivationProblem } from '../triggers/derives.ts'
import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'
import type { Check, CheckContext, Finding } from './types.ts'

const RULE = 'ownership/derivation-resolves'

function messageFor(rule: ResolvedOwnedRule, problem: DerivationProblem): string {
  const source = rule.derivesFrom!.source
  const field = rule.derivesFrom!.field

  if (problem.reason === 'campo-ausente') {
    return `${problem.file} derives from \`${source}\` (declared in \`owned[]\`, ${rule.origin}) and does not declare the \`${field}\` field in its frontmatter.`
  }
  if (problem.reason === 'fora-da-fonte') {
    return `${problem.file}: the \`${field}\` field points to "${problem.field}", outside \`${source}\`.`
  }

  return `${problem.file}: the \`${field}\` field points to "${problem.field}", which does not exist in the repository.`
}

export function ownershipDerivationResolves(): Check {
  return {
    id: RULE,
    name: 'derivation resolves',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      for (const rule of context.config.owned) {
        if (rule.derivesFrom === null) {
          continue
        }
        for (const problem of problemsFor(context.root, rule)) {
          findings.push({
            ruleId: RULE,
            file: problem.file,
            line: problem.line,
            severity: 'error',
            message: messageFor(rule, problem),
            fix: `Declare \`${rule.derivesFrom.field}: <path under ${rule.derivesFrom.source}>\` in the frontmatter of ${problem.file}, pointing to a file that exists.`,
          })
        }
      }

      return findings
    },
  }
}
