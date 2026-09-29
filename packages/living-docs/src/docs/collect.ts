import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parseItemsSections, parseItemsTable } from '@esliph/ownership'
import type { DocItem } from '@esliph/ownership'
import type { ArtifactRule, DocumentRule, LivingDocsConfig } from '../config/ownership.ts'
import { parseFrontmatter, FrontmatterSyntaxError } from '../frontmatter/parse.ts'
import type { Frontmatter } from '../frontmatter/parse.ts'
import { parseId } from './schema.ts'
import type { IdFormat } from './schema.ts'

export interface ArtifactDoc {
  /** Path relative to the repository root, always with `/`. */
  file: string
  rule: ArtifactRule
  source: string
  frontmatter: Frontmatter | null
  syntaxError: FrontmatterSyntaxError | null
  /** Items of the collection (`table` or `sections`); empty for `per-file`. */
  items: DocItem[]
}

function listMarkdown(root: string, relativeDir: string): string[] {
  const absolute = join(root, relativeDir)
  let entries: string[]

  try {
    entries = readdirSync(absolute)
  } catch {
    return []
  }

  const found: string[] = []

  for (const entry of entries) {
    const relative = `${relativeDir.replace(/\/$/, '')}/${entry}`

    if (statSync(join(root, relative)).isDirectory()) {
      found.push(...listMarkdown(root, `${relative}/`))
    } else if (entry.endsWith('.md') && !entry.includes('.gen.')) {
      found.push(relative)
    }
  }

  return found
}

/**
 * The items of a collection artifact, read by the core according to the entry's
 * `format`. The ID form is living-docs policy, not the parser's: the key
 * arrives opaque and only what is an ID in the form declared by the project becomes an item
 * (`ADR-0011`). A heading without an ID, and a table row without an ID, are not items.
 */
function parseItems(rule: ArtifactRule, source: string, body: string | null, bodyStart: number, format: IdFormat): DocItem[] {
  const text = body ?? source
  const start = body === null ? 1 : bodyStart
  const { format: read } = rule.core
  const items =
    read.collection === 'table'
      ? parseItemsTable(text, start, { key: read.key!, stateField: read.stateField })
      : read.collection === 'sections'
        ? parseItemsSections(text, start, { keyMode: read.keyMode!, stateField: read.stateField })
        : []

  return items.filter(item => parseId(item.key, format) !== null)
}

function readDoc(root: string, file: string, rule: ArtifactRule, format: IdFormat): ArtifactDoc | null {
  let source: string

  try {
    source = readFileSync(join(root, file), 'utf8')
  } catch {
    return null
  }

  let frontmatter: Frontmatter | null = null
  let syntaxError: FrontmatterSyntaxError | null = null

  try {
    frontmatter = parseFrontmatter(source)
  } catch (err) {
    if (!(err instanceof FrontmatterSyntaxError)) {
      throw err
    }
    syntaxError = err
  }

  const items = parseItems(rule, source, frontmatter ? frontmatter.body : null, frontmatter ? frontmatter.bodyStartLine : 1, format)

  return { file, rule, source, frontmatter, syntaxError, items }
}

export function collectArtifacts(root: string, config: LivingDocsConfig): ArtifactDoc[] {
  const docs: ArtifactDoc[] = []

  for (const rule of config.artifacts) {
    const target = rule.path.replace(/\\/g, '/')
    const files = target.endsWith('/') ? listMarkdown(root, target) : [target]

    for (const file of files) {
      const doc = readDoc(root, file, rule, config.idFormat)

      if (doc) {
        docs.push(doc)
      }
    }
  }

  return docs
}

export interface DocumentDoc {
  /** Path relative to the repository root, always with `/`. */
  file: string
  rule: DocumentRule
  source: string
  /** `null` when the document has no frontmatter — which is legitimate (`CHANGELOG.md`). */
  frontmatter: Frontmatter | null
}

/**
 * Documents declared in `documents:` that exist in the repository (`ADR-0008`).
 *
 * Markdown only: `docs/.ownership.yml` and `docs/ids-retired.txt` have an owner and no
 * frontmatter, and nothing in this phase asks them for a review date. Frontmatter
 * with invalid syntax becomes `null` silently, because `living-docs/frontmatter` does not read `documents:`
 * and taking `validate` down because of it would be worse than not reporting.
 */
export function collectDocuments(root: string, config: LivingDocsConfig): DocumentDoc[] {
  const documents: DocumentDoc[] = []

  for (const rule of config.documents) {
    const target = rule.path.replace(/\\/g, '/')
    const files = target.endsWith('/') ? listMarkdown(root, target) : [target]

    for (const file of files) {
      if (!file.endsWith('.md')) {
        continue
      }

      let source: string

      try {
        source = readFileSync(join(root, file), 'utf8')
      } catch {
        continue // declared and absent: whoever charges for absence is ownership/owner-coverage, not the collection
      }

      let frontmatter: Frontmatter | null = null

      try {
        frontmatter = parseFrontmatter(source)
      } catch {
        frontmatter = null
      }

      documents.push({ file, rule, source, frontmatter })
    }
  }

  return documents
}
