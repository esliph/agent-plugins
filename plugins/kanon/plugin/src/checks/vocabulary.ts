import type { Finding } from '../core/types.ts'
import { termKey, wholeWord } from '../core/words.ts'
import type { ParsedCriterion } from '../ears/parse.ts'
import type { Glossary } from '../glossary/glossary.ts'
import type { Requirement } from '../specs/parse.ts'

const MARKED = /\[\[([^\]]+)\]\]/g
const WHOLLY_MARKED = /^\[\[([^\]]+)\]\]$/

/** No word of the project's forbidden list appears in a criterion (RN-0049). */
export function checkForbiddenWords(requirements: readonly Requirement[], forbidden: readonly string[]): Finding[] {
  const findings: Finding[] = []

  for (const { file, token, criterion, criterionLine } of requirements) {
    for (const word of forbidden) {
      if (wholeWord(word).test(criterion)) {
        findings.push({
          file,
          line: criterionLine,
          ruleId: 'kanon/forbidden-word',
          severity: 'error',
          message: `the criterion of ${token} uses "${word}", which is on the forbidden list of the configuration.`,
        })
      }
    }
  }

  return findings
}

// The system name and every marked term are in the glossary, and a banned term
// appears nowhere (RN-0050). A term that is neither marked nor banned is not
// checked: telling it from an ordinary word is not something a script decides.
export function checkGlossary(requirements: readonly Requirement[], parsed: ReadonlyMap<Requirement, ParsedCriterion>, glossary: Glossary): Finding[] {
  const findings: Finding[] = []
  const known = new Map(glossary.terms.map(term => [termKey(term.term), term]))
  const banned = glossary.terms.filter(term => term.banned)

  for (const requirement of requirements) {
    const { file, token, criterion, criterionLine } = requirement
    const error = (message: string): void => void findings.push({ file, line: criterionLine, ruleId: 'kanon/glossary-term', severity: 'error', message })
    const marked = new Set([...criterion.matchAll(MARKED)].map(match => (match[1] ?? '').trim()))
    const system = parsed.get(requirement)?.system ?? null

    for (const term of marked) {
      if (!known.has(termKey(term))) {
        error(`the criterion of ${token} marks [[${term}]], which is not a term of ${glossary.file}.`)
      }
    }
    // A system written as a marked term was judged above.
    if (system !== null && !WHOLLY_MARKED.test(system) && !known.has(termKey(system))) {
      error(`the system of ${token}, "${system}", is not a term of ${glossary.file}.`)
    }

    const unmarked = criterion.replace(/\[\[|\]\]/g, '')

    for (const term of banned) {
      if (wholeWord(term.term).test(unmarked)) {
        error(`the criterion of ${token} uses "${term.term}", a banned term — see ${glossary.file}:${term.line}.`)
      }
    }
  }

  return findings
}
