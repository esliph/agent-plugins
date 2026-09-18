import { problemsFor } from '../triggers/derives.ts'
import type { DerivationProblem } from '../triggers/derives.ts'
import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'
import type { Check, CheckContext, Finding } from './types.ts'

const RULE = 'ownership/derivation-resolves'

function messageFor(rule: ResolvedOwnedRule, problem: DerivationProblem): string {
  const source = rule.derivesFrom!.source
  const field = rule.derivesFrom!.field

  if (problem.reason === 'campo-ausente') {
    return `${problem.file} deriva de \`${source}\` (declarado em \`owned[]\`, ${rule.origin}) e não declara o campo \`${field}\` no frontmatter.`
  }
  if (problem.reason === 'fora-da-fonte') {
    return `${problem.file}: o campo \`${field}\` aponta para "${problem.field}", fora de \`${source}\`.`
  }

  return `${problem.file}: o campo \`${field}\` aponta para "${problem.field}", que não existe no repositório.`
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
            fix: `Declare \`${rule.derivesFrom.field}: <caminho sob ${rule.derivesFrom.source}>\` no frontmatter de ${problem.file}, apontando para um arquivo que existe.`,
          })
        }
      }

      return findings
    },
  }
}
