import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { ArtifactDoc } from '../docs/collect.ts'
import type { IdFormat } from '../docs/schema.ts'
import { REQUIRED_FIELDS, CONTAINER_REQUIRED_FIELDS, isIsoDate, parseId, writeId } from '../docs/schema.ts'

const RULE = 'living-docs/frontmatter'

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false
  }
  if (typeof value === 'string') {
    return value.trim() !== ''
  }

  return true
}

function checkDoc(doc: ArtifactDoc, format: IdFormat): Finding[] {
  const findings: Finding[] = []

  if (doc.syntaxError) {
    return [
      error(
        doc.file,
        doc.syntaxError.line,
        `Frontmatter com YAML inválido: ${doc.syntaxError.message}`,
        'Corrija o bloco YAML entre os `---` no topo do arquivo.',
      ),
    ]
  }

  const frontmatter = doc.frontmatter

  if (!frontmatter) {
    return [
      error(
        doc.file,
        1,
        'Frontmatter ausente — todo artefato de documentação viva abre com o bloco YAML padrão.',
        // Regra de origem: spec §2.
        'Adicione `id`, `title`, `status`, `owner`, `trigger` e `last-reviewed` entre `---` no topo.',
      ),
    ]
  }

  const { data, lines } = frontmatter
  const lineOf = (field: string): number => lines[field] ?? 1
  const isContainer = doc.rule.collection !== 'per-file'
  const required = isContainer ? CONTAINER_REQUIRED_FIELDS : REQUIRED_FIELDS

  for (const field of required) {
    if (!isFilled(data[field])) {
      findings.push(
        error(
          doc.file,
          frontmatter.endLine,
          `Campo obrigatório \`${field}\` ausente ou vazio.`,
          `Preencha \`${field}\` no frontmatter (skill dona: ${doc.rule.skill}).`,
        ),
      )
    }
  }

  if (!isContainer && isFilled(data.id)) {
    const parsed = parseId(data.id, format)

    if (!parsed) {
      findings.push(
        error(
          doc.file,
          lineOf('id'),
          `\`id\` "${String(data.id)}" fora do formato <PREFIXO>-<número>.`,
          // Regra de origem: spec §8.
          `Use ${writeId(doc.rule.idPrefix, 1, format)}.`,
        ),
      )
    } else if (parsed.prefix !== doc.rule.idPrefix) {
      findings.push(
        error(
          doc.file,
          lineOf('id'),
          `\`id\` usa o prefixo ${parsed.prefix}, mas ${doc.rule.path} é território de ${doc.rule.idPrefix}.`,
          `Renomeie para o território de ${doc.rule.idPrefix} (ex.: ${writeId(doc.rule.idPrefix, 1, format)}) ` + 'ou mova o arquivo para o artefato dono.',
        ),
      )
    }
  }

  const states = doc.rule.states

  if (!isContainer && isFilled(data.status)) {
    if (!states) {
      findings.push(
        error(
          doc.file,
          lineOf('status'),
          `Prefixo ${doc.rule.idPrefix} não tem máquina de estados declarada.`,
          'Declare `states:` na entrada deste artefato no arquivo de ownership.',
        ),
      )
    }
  }

  if (isFilled(data['last-reviewed']) && !isIsoDate(data['last-reviewed'])) {
    findings.push(
      error(
        doc.file,
        lineOf('last-reviewed'),
        `\`last-reviewed\` "${String(data['last-reviewed'])}" não é uma data ISO.`,
        // Regra de origem: spec §2.
        'Use YYYY-MM-DD, e só toque neste campo se você realmente reviu o documento.',
      ),
    )
  }

  if (isContainer && states) {
    for (const item of doc.items) {
      if (item.state === '') {
        findings.push(
          // Regra de origem: spec §4.
          error(doc.file, item.line, `Item ${item.key} não declara \`status\`.`, `Acrescente \`- **status:** ${states[0]}\` logo abaixo do título.`),
        )
      }
    }
  }

  return findings
}

export const livingDocsFrontmatter: Check = {
  id: RULE,
  name: 'structure lint',
  run(context: CheckContext): Finding[] {
    return context.docs.flatMap(doc => checkDoc(doc, context.config.idFormat))
  },
}
