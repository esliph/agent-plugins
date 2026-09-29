import type { Check, CheckContext, Finding } from '../core/types.ts'
import { documentWithRole } from '../config/ownership.ts'
import { stripFences } from '../docs/markdown.ts'

const RULE = 'living-docs/done-verifiable'

/**
 * Verification vocabulary of a Definition of Done item (RN-0017): the
 * identifier of a check or hook (`plugin/name`), of an agent or skill, or the
 * fixed marker `human`. The marker is a fixed word and not a language: a
 * Definition of Done in any language names human verification with it
 * (RN-0038). Numbered `CI-n`/`HK-n` no longer count.
 */
const VERIFICATION = /\b(?:AG|SK)-\d+\b|\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|\bhuman\b/i

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
          `Definition of Done item with no named verification: "${item.text.slice(0, 120)}".`,
          'Name what verifies the item — the identifier of a check or a hook (`plugin/name`), or the fixed marker `human`. ' +
            // Rule of origin: RN-0017.
            'An item nobody verifies is an intention, and an intention is not a definition of done.',
        ),
      )
    }

    return findings
  },
}
