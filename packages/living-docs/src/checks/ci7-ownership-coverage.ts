import type { Check, CheckContext, DiffFacts, Finding } from '../core/types.ts'
import { exceptionReasonFor } from './exception-label.ts'
import { documentWithRole } from '../config/ownership.ts'
import { blockedClaims, claimsFor } from '../docs/blocked.ts'
import { normalizeProse, sentencesOf, stripCode, stripFences } from '../docs/markdown.ts'

const RULE = 'CI-7'

/** Piso de palavras da comparação de frases (`ADR-0009`). */
export const WORD_FLOOR = 12

/**
 * Vocabulário de verificação de um item de Definition of Done (`RN-0017`).
 * Um ID do toolkit, ou a palavra que marca verificação humana — em português ou
 * em inglês, porque um check genérico não pode exigir o idioma do projeto.
 */
const VERIFICATION = /\b(?:CI|HK|AG|SK)-\d+\b|\bhumana?\b|\bhuman\b/i

const DOD_ITEM = /^\s*[-*+]\s+\[[ xX]\]\s+\S/

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

/** O rótulo que libera a metade do diff (`ADR-0010`). */
export function docsExceptionReason(messages: readonly string[]): string | null {
  return exceptionReasonFor('Docs', messages)
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
 * Itens de Definition of Done que não nomeiam o que os verifica (`RN-0017`).
 *
 * `stripFences`, não `stripCode`: o vocabulário de verificação (`CI-n`, `HK-n`,
 * …) é normalmente escrito entre crases, e apagar código inline apagaria o
 * próprio ID que este check procura. A cerca, essa sai — a Definition of Done
 * que documenta o próprio formato num bloco de exemplo não pode reprovar por
 * causa do exemplo.
 */
export function dodItemsWithoutVerification(source: string): { text: string; line: number }[] {
  const lines = stripFences(source).split('\n')
  const found: { text: string; line: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''

    if (!DOD_ITEM.test(line)) {
      continue
    }
    if (VERIFICATION.test(line)) {
      continue
    }
    found.push({ text: line.trim(), line: i + 1 })
  }

  return found
}

/**
 * `CI-7` — ownership coverage. Três classes de achado: contrato do agente
 * repetindo artefato dono, item de Definition of Done sem verificação nomeada e,
 * quando o diff é dado, caminho reivindicado por decisão aberta (`RN-0026`).
 *
 * A cobertura de dono e o vínculo de `watches` passaram para o núcleo
 * (`ownership/owner-coverage` e `ownership/watch-satisfied`).
 *
 * A última classe lê o diff, e é a razão pela qual ele entra por injeção:
 * `validate` não o tem, e `validate --base` tem (`ADR-0010`). É a metade
 * determinística do critério 4 da spec §12.
 *
 * Regras de origem: `RN-0017`, `RN-0020`, `RN-0026`, `RN-0010` para a duplicação.
 */
export function ci7OwnershipCoverage(diff: DiffFacts | null = null): Check {
  return {
    id: RULE,
    name: 'ownership coverage',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []
      const { config } = context

      // 1 — o contrato do agente repetindo texto de artefato dono.
      const contract = documentWithRole(config, 'agent-contract')

      if (contract !== null) {
        const contractPath = normalizePath(contract.path)
        const source = context.documents.find(document => document.file === contractPath)?.source ?? null

        if (source !== null) {
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
        }
      }

      // 2 — item de Definition of Done sem verificação nomeada.
      const dod = documentWithRole(config, 'definition-of-done')

      if (dod !== null) {
        const dodPath = normalizePath(dod.path)
        const source = context.documents.find(document => document.file === dodPath)?.source ?? null

        if (source !== null) {
          for (const item of dodItemsWithoutVerification(source)) {
            findings.push(
              error(
                dodPath,
                item.line,
                `Item da Definition of Done sem verificação nomeada: "${item.text.slice(0, 120)}".`,
                'Nomeie o que verifica o item — um `CI-n`, um `HK-n`, ou a palavra que marca verificação humana. ' +
                  // Regra de origem: RN-0017.
                  'Item que ninguém verifica é intenção, e intenção não é definição de pronto.',
              ),
            )
          }
        }
      }

      // 3 — a metade do diff (`ADR-0010`).
      if (diff !== null && docsExceptionReason(diff.messages) === null) {
        // Caminho reivindicado por decisão aberta (`RN-0026`).
        for (const { claim, matched } of claimsFor(blockedClaims(context.docs), diff.changed)) {
          const levados = matched.slice(0, 5).join(', ') + (matched.length > 5 ? `, … (+${matched.length - 5})` : '')

          findings.push(
            error(
              claim.doc,
              claim.line,
              `O diff \`${diff.base}...HEAD\` toca caminho reivindicado por ${claim.id}, que está \`open\`` +
                `${claim.gap === null ? '' : ` — "${claim.gap}"`}: ${levados}.`,
              // Regra de origem: RN-0026, ADR-0010.
              `Resolva ${claim.id} antes de implementar (skill dona: ${claim.skill}) — enquanto a decisão está ` +
                'aberta não há regra, e a saída é o ID, não o código. Se esta mudança não é a implementação da ' +
                'regra que falta, escreva a razão numa mensagem de commit, no formato `Docs: none — <razão>`.',
            ),
          )
        }
      }

      return findings
    },
  }
}
