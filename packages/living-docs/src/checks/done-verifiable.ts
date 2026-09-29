import type { Check, CheckContext, Finding } from '../core/types.ts'
import { documentWithRole } from '../config/ownership.ts'
import { stripFences } from '../docs/markdown.ts'

const RULE = 'living-docs/done-verifiable'

/**
 * Vocabulário de verificação de um item de Definition of Done (`RN-0017`): o
 * identificador de um check ou hook (`plugin/nome`), o de agente ou skill, ou a
 * palavra que marca verificação humana — em português ou em inglês. Os
 * numerados `CI-n`/`HK-n` não valem mais, sem alias de nome antigo.
 */
const VERIFICATION = /\b(?:AG|SK)-\d+\b|\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|\bhumana?\b|\bhuman\b/i

const DOD_ITEM = /^\s*[-*+]\s+\[[ xX]\]\s+\S/

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/**
 * Itens de Definition of Done que não nomeiam o que os verifica (`RN-0017`).
 *
 * `stripFences`, não `stripCode`: o vocabulário de verificação (`plugin/nome`,
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
 * `living-docs/done-verifiable` — item de Definition of Done sem verificação
 * nomeada (`RN-0017`). Um dos três pedaços do antigo check de cobertura de
 * propriedade: nomes separados porque "falhou o check sete" nunca disse qual
 * parte falhou (§7 da spec de 2026-09-18).
 */
export const livingDocsDoneVerifiable: Check = {
  id: RULE,
  name: 'done verifiable',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const dod = documentWithRole(context.config, 'definition-of-done')

    if (dod === null) {
      return findings
    }

    const dodPath = normalizePath(dod.path)
    const source = context.documents.find(document => document.file === dodPath)?.source ?? null

    if (source === null) {
      return findings
    }

    for (const item of dodItemsWithoutVerification(source)) {
      findings.push(
        error(
          dodPath,
          item.line,
          `Item da Definition of Done sem verificação nomeada: "${item.text.slice(0, 120)}".`,
          'Nomeie o que verifica o item — o identificador de um check ou de um hook (`plugin/nome`), ou a palavra que marca verificação humana. ' +
            // Regra de origem: RN-0017.
            'Item que ninguém verifica é intenção, e intenção não é definição de pronto.',
        ),
      )
    }

    return findings
  },
}
