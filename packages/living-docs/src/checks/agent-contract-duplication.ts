import type { Check, CheckContext, Finding } from '../core/types.ts'
import { documentWithRole } from '../config/ownership.ts'
import { normalizeProse, sentencesOf, stripCode } from '../docs/markdown.ts'

const RULE = 'living-docs/agent-contract-duplication'

/** Piso de palavras da comparação de frases (`ADR-0009`). */
export const WORD_FLOOR = 12

export interface Duplication {
  /** A frase como está escrita no contrato. */
  sentence: string
  line: number
  /** O artefato dono onde ela reaparece. */
  source: string
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Frases do contrato do agente que reaparecem, palavra por palavra, num artefato dono. */
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
 * `living-docs/agent-contract-duplication` — o contrato do agente repete texto
 * de artefato dono (`RN-0010`, `RN-0020`). Um dos três pedaços do antigo check
 * de cobertura de propriedade (os outros são `living-docs/done-verifiable` e
 * `living-docs/open-decision-claim`): a cobertura de dono e o vínculo de
 * `watches` são do núcleo (`ownership/owner-coverage` e
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

    // Corpus: quem tem skill dona. Plano, spec e README citam por ofício, e
    // reprovar o contrato por causa de quem o citou inverteria quem copiou
    // de quem (`ADR-0009`).
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
          `O contrato do agente repete, palavra por palavra, uma frase de \`${duplication.source}\`: ` + `"${duplication.sentence.slice(0, 120)}".`,
          'Apague a frase e deixe o ponteiro para o artefato dono. O contrato do agente é índice e política, ' +
            // Regra de origem: RN-0010, RN-0020; o limiar é o de ADR-0009.
            'não conteúdo (skill dona: working-agreements-keeper). O limiar é do toolkit, não deste projeto: ' +
            'não se baixa aqui.',
        ),
      )
    }

    return findings
  },
}
