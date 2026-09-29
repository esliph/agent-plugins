import type { Check, CheckContext, Finding } from '../core/types.ts'
import { documentWithRole } from '../config/ownership.ts'
import { normalizeProse, sentencesOf, stripCode } from '../docs/markdown.ts'

const RULE = 'living-docs/agent-contract-duplication'

/** Word floor of the sentence comparison (`ADR-0009`). */
export const WORD_FLOOR = 12

export interface Duplication {
  /** The sentence as written in the contract. */
  sentence: string
  line: number
  /** The owning artifact where it reappears. */
  source: string
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Sentences of the agent contract that reappear, word for word, in an owning artifact. */
export function duplicatedSentences(contract: string, corpus: readonly { file: string; source: string }[]): Duplication[] {
  const normalized = corpus.map(entry => ({
    file: entry.file,
    text: normalizeProse(stripCode(entry.source)),
  }))
  const found: Duplication[] = []

  for (const sentence of sentencesOf(contract)) {
    const prose = normalizeProse(sentence.text)

    if (prose.split(' ').filter(Boolean).length < WORD_FLOOR) {
      continue
    }

    const hit = normalized.find(entry => entry.text.includes(prose))

    if (hit) {
      found.push({ sentence: sentence.text, line: sentence.line, source: hit.file })
    }
  }

  return found
}

/**
 * `living-docs/agent-contract-duplication` — the agent contract repeats text
 * from an owning artifact (`RN-0010`, `RN-0020`). One of the three pieces of the former
 * ownership coverage check (the others are `living-docs/done-verifiable` and
 * `living-docs/open-decision-claim`): owner coverage and the
 * `watches` link belong to the core (`ownership/owner-coverage` and
 * `ownership/watch-satisfied`).
 */
export const livingDocsAgentContractDuplication: Check = {
  id: RULE,
  name: 'agent contract duplication',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const { config } = context
    const contract = documentWithRole(config, 'agent-contract')

    if (contract === null) {
      return findings
    }

    const contractPath = normalizePath(contract.path)
    const source = context.documents.find(document => document.file === contractPath)?.source ?? null

    if (source === null) {
      return findings
    }

    // Corpus: whatever has an owning skill. Plan, spec and README cite by duty, and
    // failing the contract because of who cites it would invert who copied
    // from whom (`ADR-0009`).
    const corpus = [
      ...context.docs.map(doc => ({ file: doc.file, source: doc.source, skill: doc.rule.skill })),
      ...context.documents.map(document => ({
        file: document.file,
        source: document.source,
        skill: document.rule.skill,
      })),
    ].filter(entry => entry.skill !== null && entry.file !== contractPath && entry.file.endsWith('.md'))

    for (const duplication of duplicatedSentences(source, corpus)) {
      findings.push(
        error(
          contractPath,
          duplication.line,
          `The agent contract repeats, word for word, a sentence from \`${duplication.source}\`: ` + `"${duplication.sentence.slice(0, 120)}".`,
          'Delete the sentence and leave a pointer to the owning artifact. The agent contract is an index and a policy, ' +
            // Rule of origin: RN-0010, RN-0020; the threshold is the one from ADR-0009.
            'not content (owning skill: working-agreements-keeper). The threshold belongs to the toolkit, not to this project: ' +
            'it is not lowered here.',
        ),
      )
    }

    return findings
  },
}
