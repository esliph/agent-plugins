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
  /** Caminho relativo à raiz do repositório, sempre com `/`. */
  file: string
  rule: ArtifactRule
  source: string
  frontmatter: Frontmatter | null
  syntaxError: FrontmatterSyntaxError | null
  /** Itens da coleção (`table` ou `sections`); vazio para `per-file`. */
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
 * Os itens de um artefato de coleção, lidos pelo núcleo segundo o `format` da
 * entrada. A forma do ID é política do living-docs, não do parser: a chave
 * chega opaca e só vira item o que é ID na forma declarada pelo projeto
 * (`ADR-0011`). Título sem ID, e linha de tabela sem ID, não são item.
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
  /** Caminho relativo à raiz do repositório, sempre com `/`. */
  file: string
  rule: DocumentRule
  source: string
  /** `null` quando o documento não tem frontmatter — o que é legítimo (`CHANGELOG.md`). */
  frontmatter: Frontmatter | null
}

/**
 * Documentos declarados em `documents:` que existem no repositório (`ADR-0008`).
 *
 * Só markdown: `docs/.ownership.yml` e `docs/ids-retired.txt` têm dono e não têm
 * frontmatter, e nada nesta fase pergunta a eles a data de revisão. Frontmatter
 * com sintaxe inválida vira `null` em silêncio, porque `living-docs/frontmatter` não lê `documents:`
 * e derrubar o `validate` por causa disso seria pior do que não reportar.
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
        continue // declarado e ausente: quem cobra ausência é ownership/owner-coverage, não a coleta
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
