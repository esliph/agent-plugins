import type { Check, CheckContext, Finding } from '../core/types.ts'
import { stripFences } from '../docs/markdown.ts'
import { parseId } from '../docs/schema.ts'
import type { Frontmatter } from '../frontmatter/parse.ts'
import { findCitations } from '../ids/citations.ts'

const RULE = 'CI-11'

export interface ExternalText {
  file: string
  source: string
  frontmatter: Frontmatter | null
}

/**
 * O texto que quem vem de fora lê: documentos e artefatos declarados
 * `audience: external` (`ADR-0017`).
 *
 * Artefato com frontmatter quebrado fica de fora: `CI-1` já reprova, e ler o
 * bloco quebrado como corpo produziria um segundo achado sobre o próprio `id:`.
 */
export function externalTexts(context: CheckContext): ExternalText[] {
  const texts: ExternalText[] = []

  for (const doc of context.docs) {
    if (doc.rule.audience !== 'external' || doc.syntaxError !== null) {
      continue
    }
    texts.push({ file: doc.file, source: doc.source, frontmatter: doc.frontmatter })
  }

  for (const document of context.documents) {
    if (document.rule.audience !== 'external') {
      continue
    }
    texts.push({ file: document.file, source: document.source, frontmatter: document.frontmatter })
  }

  return texts
}

/**
 * O texto com o frontmatter apagado **linha a linha**: a contagem fica, e a
 * linha do achado é a do arquivo. O frontmatter é contrato de máquina e é de
 * `CI-1` (`RN-0030`).
 */
export function bodyOf(source: string, frontmatter: Frontmatter | null): string {
  const lines = source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .split('\n')

  if (frontmatter === null) {
    return lines.join('\n')
  }

  return lines.map((line, index) => (index < frontmatter.endLine ? '' : line)).join('\n')
}

/**
 * `CI-11` — external audience. Regra de origem: `RN-0030`.
 *
 * Não carrega lista de prefixos: interno é o que `artifacts:` declara, e só
 * isso. `CI-n`, `HK-n` e `EXIT-n` não são família de artefato — ninguém os
 * declara ali —, então ficam de fora sem que nenhuma exceção precise ser
 * escrita; e um projeto que ainda não declarou `RN` não é cobrado por um
 * `RN-0001` solto, a mesma fronteira de `CI-2` (`RN-0007`).
 *
 * `stripFences`, e não `stripCode`: o ID entre crases é exatamente o que se
 * procura, e o exemplo dentro de uma cerca continua sendo exemplo. O ID no
 * caminho de um link é pego sem esforço, porque a varredura é do texto cru.
 *
 * Conta qualquer citação a prefixo declarado — a que resolve, a retirada e a
 * que não resolve —: a regra é sobre o que o leitor vê. Sem rótulo de exceção
 * (`ADR-0017`).
 */
export const ci11ExternalAudience: Check = {
  id: RULE,
  name: 'external audience',
  run(context: CheckContext): Finding[] {
    const format = context.config.idFormat
    const internal = new Set(context.config.artifacts.map(artifact => artifact.idPrefix))
    const findings: Finding[] = []

    for (const text of externalTexts(context)) {
      for (const citation of findCitations(stripFences(bodyOf(text.source, text.frontmatter)), format)) {
        const parsed = parseId(citation.id, format)

        if (parsed === null || !internal.has(parsed.prefix)) {
          continue
        }

        findings.push({
          ruleId: RULE,
          file: text.file,
          line: citation.line,
          severity: 'error',
          message:
            `\`${citation.id}\` é ID de artefato, e \`${text.file}\` é lido por quem vem de fora ` +
            '(`audience: external`): esse leitor não tem como resolver o ID.',
          fix:
            'Escreva em texto corrido o que o item decide ou exige, sem apontá-lo. O vínculo continua existindo ' +
            // Regra de origem: RN-0030, ADR-0017.
            'e mora do lado de dentro — no próprio artefato ou na mensagem de commit. ' +
            'Não há rótulo de exceção.',
        })
      }
    }

    return findings
  },
}
