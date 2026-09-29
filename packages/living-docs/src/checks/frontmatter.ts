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
        `Frontmatter with invalid YAML: ${doc.syntaxError.message}`,
        'Fix the YAML block between the `---` at the top of the file.',
      ),
    ]
  }

  const frontmatter = doc.frontmatter

  if (!frontmatter) {
    return [
      error(
        doc.file,
        1,
        'Missing frontmatter — every living-documentation artifact opens with the standard YAML block.',
        // Rule of origin: spec §2.
        'Add `id`, `title`, `status`, `owner`, `trigger` and `last-reviewed` between `---` at the top.',
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
          `Required field \`${field}\` is missing or empty.`,
          `Fill in \`${field}\` in the frontmatter (owning skill: ${doc.rule.skill}).`,
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
          `\`id\` "${String(data.id)}" is not in the <PREFIX>-<number> format.`,
          // Rule of origin: spec §8.
          `Use ${writeId(doc.rule.idPrefix, 1, format)}.`,
        ),
      )
    } else if (parsed.prefix !== doc.rule.idPrefix) {
      findings.push(
        error(
          doc.file,
          lineOf('id'),
          `\`id\` uses the prefix ${parsed.prefix}, but ${doc.rule.path} is the territory of ${doc.rule.idPrefix}.`,
          `Rename it into the territory of ${doc.rule.idPrefix} (e.g. ${writeId(doc.rule.idPrefix, 1, format)}) ` + 'or move the file to the owning artifact.',
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
          `Prefix ${doc.rule.idPrefix} has no declared state machine.`,
          'Declare `states:` in this artifact\'s entry of the ownership file.',
        ),
      )
    }
  }

  if (isFilled(data['last-reviewed']) && !isIsoDate(data['last-reviewed'])) {
    findings.push(
      error(
        doc.file,
        lineOf('last-reviewed'),
        `\`last-reviewed\` "${String(data['last-reviewed'])}" is not an ISO date.`,
        // Rule of origin: spec §2.
        'Use YYYY-MM-DD, and only touch this field if you really reviewed the document.',
      ),
    )
  }

  if (isContainer && states) {
    for (const item of doc.items) {
      if (item.state === '') {
        findings.push(
          // Rule of origin: spec §4.
          error(doc.file, item.line, `Item ${item.key} does not declare \`status\`.`, `Add \`- **status:** ${states[0]}\` right below the title.`),
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
