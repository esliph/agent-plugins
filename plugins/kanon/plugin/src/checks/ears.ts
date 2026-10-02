import type { Finding } from '../core/types.ts'
import { PATTERNS, type ParsedCriterion } from '../ears/parse.ts'
import type { Requirement } from '../specs/parse.ts'

const RULE = { pattern: 'kanon/ears-pattern', shape: 'kanon/ears-shape' } as const

/** The pattern of each criterion, the pattern its heading names, and its shape (RN-0047, RN-0048). */
export function checkEars(requirements: readonly Requirement[], parsed: ReadonlyMap<Requirement, ParsedCriterion>): Finding[] {
  const findings: Finding[] = []

  for (const requirement of requirements) {
    const { file, line, token, tag, criterion, criterionLine } = requirement
    const error = (at: number, ruleId: string, message: string): void => void findings.push({ file, line: at, ruleId, severity: 'error', message })

    if (tag === null) {
      error(line, RULE.pattern, `the heading of ${token} names no pattern: write \`### ${token} [<Pattern>]\`.`)
    } else if (!(PATTERNS as readonly string[]).includes(tag)) {
      error(line, RULE.pattern, `[${tag}] is not an EARS pattern: ${PATTERNS.join(', ')}.`)
    }
    if (criterion === '') {
      error(line, RULE.pattern, `${token} has no criterion under its heading.`)
      continue
    }

    const result = parsed.get(requirement)

    if (result === undefined) {
      continue
    }
    for (const problem of result.problems) {
      error(criterionLine, RULE[problem.rule], `the criterion of ${token} ${problem.message}`)
    }
    if (result.pattern !== null && tag !== null && (PATTERNS as readonly string[]).includes(tag) && tag !== result.pattern) {
      error(line, RULE.pattern, `the heading of ${token} says [${tag}] and its criterion is ${result.pattern}.`)
    }
  }

  return findings
}
