import type { Check, CheckContext, Finding } from '../core/types.ts'
import { stripFences } from '../docs/markdown.ts'
import { parseId } from '../docs/schema.ts'
import type { Frontmatter } from '../frontmatter/parse.ts'
import { findCitations } from '../ids/citations.ts'

const RULE = 'living-docs/external-audience'

export interface ExternalText {
  file: string
  source: string
  frontmatter: Frontmatter | null
}

/**
 * The text that outsiders read: documents and artifacts declared
 * `audience: external` (`ADR-0017`).
 *
 * An artifact with broken frontmatter is left out: `living-docs/frontmatter` already fails it, and reading the
 * broken block as body would produce a second finding about the `id:` itself.
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
 * The text with the frontmatter erased **line by line**: the count stays, and the
 * finding line is the file's. The frontmatter is a machine contract and belongs to
 * `living-docs/frontmatter` (`RN-0030`).
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
 * `living-docs/external-audience` — external audience. Rule of origin: `RN-0030`.
 *
 * Carries no prefix list: internal is what `artifacts:` declares, and only
 * that. `CI-n`, `HK-n` and `EXIT-n` are not an artifact family — nobody
 * declares them there —, so they stay out without any exception having to be
 * written; and a project that has not yet declared `RN` is not charged for a loose
 * `RN-0001`, the same boundary as `living-docs/id-integrity` (`RN-0007`).
 *
 * `stripFences`, and not `stripCode`: the ID between backticks is exactly what is
 * sought, and the example inside a fence remains an example. The ID in a
 * link path is caught effortlessly, because the scan is of the raw text.
 *
 * Counts any citation of a declared prefix — the one that resolves, the retired one and the
 * one that does not resolve —: the rule is about what the reader sees. No exception label
 * (`ADR-0017`).
 */
export const livingDocsExternalAudience: Check = {
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
            `\`${citation.id}\` is an artifact ID, and \`${text.file}\` is read by people from outside ` +
            '(`audience: external`): that reader has no way to resolve the ID.',
          fix:
            'Write in plain prose what the item decides or requires, without pointing to it. The link still exists ' +
            // Rule of origin: RN-0030, ADR-0017.
            'and lives on the inside — in the artifact itself or in the commit message. ' +
            'There is no exception label.',
        })
      }
    }

    return findings
  },
}
