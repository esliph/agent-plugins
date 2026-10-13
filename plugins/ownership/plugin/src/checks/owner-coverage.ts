import { deepestOwnershipFile, findIgnoreRule, findOwnedRule } from '../resolve/lookup.ts'
import type { OwnedRule } from '../resolve/types.ts'
import type { Check, CheckContext, Finding } from './types.ts'
import { finding } from './types.ts'

const ID = 'ownership/owner-coverage'

function coverage(ctx: CheckContext): Finding[] {
  const findings: Finding[] = []
  const covered = new Map<OwnedRule, number>()
  const existing = new Map<OwnedRule, number>()

  for (const file of ctx.repoFiles) {
    const rule = findOwnedRule(ctx.config, file)

    if (rule !== null) {
      existing.set(rule, (existing.get(rule) ?? 0) + 1)
    }

    if (findIgnoreRule(ctx.config, file) !== null) {
      continue
    }

    if (rule === null) {
      findings.push(
        finding({
          file,
          checkId: ID,
          severity: 'error',
          message: 'no owned entry covers this file',
          fix: `declare it in owned[] of ${deepestOwnershipFile(ctx.config, file) ?? ctx.config.rootFile}, or leave it out with ignore[]`,
        }),
      )
      continue
    }

    covered.set(rule, (covered.get(rule) ?? 0) + 1)
  }

  for (const rule of ctx.config.owned) {
    if ((covered.get(rule) ?? 0) > 0) {
      continue
    }

    const missing = (existing.get(rule) ?? 0) === 0

    findings.push(
      finding({
        file: rule.origin.file,
        line: rule.origin.line,
        checkId: ID,
        severity: 'error',
        message: missing
          ? `${rule.origin.keyPath}.path "${rule.path}" does not exist in the repository`
          : `${rule.origin.keyPath}.path "${rule.path}": all its files are ignored`,
        fix: missing ? 'correct the path, or remove the entry' : 'remove the entry, or the ignore that leaves its files out',
      }),
    )
  }

  return findings
}

/** One pass over the repository files against the index: no file is read or stat'ed. */
export const ownerCoverage: Check = {
  id: ID,
  name: 'Owner coverage',
  failsWhen: 'a repository file has no owned entry nor ignore; an owned path does not exist, or all its files are ignored',
  run: ctx => Promise.resolve(coverage(ctx)),
}
