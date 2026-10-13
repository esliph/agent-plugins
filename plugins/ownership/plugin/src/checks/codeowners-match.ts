import { ownersOf } from '../codeowners/match.ts'
import type { Check, CheckContext, Finding } from './types.ts'
import { finding } from './types.ts'

const ID = 'ownership/codeowners-match'

/**
 * One evaluation per declared path, by the path itself: a directory entry is
 * checked as `docs/`, never file by file, so the cost follows the number of
 * entries. Only inclusion is required — the line may list other owners.
 */
function agreement(ctx: CheckContext): Finding[] {
  const codeowners = ctx.codeowners()

  if (codeowners === null) {
    return []
  }

  const findings: Finding[] = []

  for (const rule of ctx.config.owned) {
    const result = ownersOf(codeowners, rule.path)
    const where = { file: rule.origin.file, line: rule.origin.line, checkId: ID, severity: 'error' as const }

    if (result.kind === 'unmatched') {
      findings.push(
        finding({
          ...where,
          message: `${rule.origin.keyPath}.path "${rule.path}" has no matching line in ${codeowners.file}`,
          fix: `add "/${rule.path} ${rule.owner}" to ${codeowners.file}`,
        }),
      )
    } else if (result.kind === 'matched' && !result.owners.some(owner => owner.toLowerCase() === rule.owner.toLowerCase())) {
      const assigned = result.owners.length === 0 ? 'no owner' : result.owners.join(' ')

      findings.push(
        finding({
          ...where,
          message: `${rule.origin.keyPath}.owner "${rule.owner}" is not on ${codeowners.file} line ${result.line}, which assigns ${assigned}`,
          fix: `add ${rule.owner} to ${codeowners.file} line ${result.line}, or correct the owner`,
        }),
      )
    }
  }

  return findings
}

export const codeownersMatch: Check = {
  id: ID,
  name: 'CODEOWNERS agreement',
  failsWhen: 'an owned path has no effective line in CODEOWNERS; the declared owner is not on its effective line',
  run: ctx => Promise.resolve(agreement(ctx)),
}
