import { existsSync } from 'node:fs'
import { join, posix } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { readTextFile } from '../core/files.ts'
import { documentationFiles } from '../docs/corpus.ts'
import { stripCode } from '../docs/markdown.ts'

const RULE = 'living-docs/links'

/**
 * Formatos que não se leem em diff nem se revisam em PR (spec §13).
 *
 * Denylist, não allowlist, de propósito: `.svg` é XML e diffável, `.json` e
 * `.csv` são texto, e reprovar formato de texto legítimo seria o check ensinando
 * estilo em vez de cobrar a regra. O que a spec recusa é o **binário**.
 */
export const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
  'ico',
  'tif',
  'tiff',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'zip',
  'gz',
  'tgz',
  'bz2',
  'xz',
  '7z',
  'rar',
  'jar',
  'mp3',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'wav',
  'ogg',
  'webm',
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',
  'drawio',
  'vsdx',
  'sketch',
  'fig',
  'psd',
  'ai',
])

export interface Link {
  target: string
  /** Linha 1-indexed. */
  line: number
  kind: 'link' | 'wikilink'
}

const INLINE = /\[[^\]\n]*\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)/g
const DEFINITION = /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*<?([^\s>]+)>?/g
const WIKILINK = /\[\[([^\]|\n]+?)(?:\|[^\]\n]*)?\]\]/g

/** Protocolo, ou raiz de rede: o alvo não é deste repositório. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

/** O alvo aponta para fora do repositório, ou para dentro do próprio arquivo. */
function isOutOfScope(target: string): boolean {
  return EXTERNAL.test(target) || target.startsWith('#')
}

/**
 * Links de um texto **já sem código** (`stripCode` é de quem chama).
 *
 * Só o que deveria resolver dentro do repositório: link externo e âncora pura
 * saem aqui, e não lá embaixo. Um verificador de link que tenta resolver
 * `https://` precisa de rede, e o toolkit não tem (`RNF-0001`).
 */
export function findLinks(source: string): Link[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const links: Link[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''

    for (const regex of [INLINE, DEFINITION]) {
      for (const match of line.matchAll(regex)) {
        const target = match[1]

        if (target && !isOutOfScope(target)) {
          links.push({ target, line: i + 1, kind: 'link' })
        }
      }
    }
    for (const match of line.matchAll(WIKILINK)) {
      const target = match[1]?.trim()

      if (target) {
        links.push({ target, line: i + 1, kind: 'wikilink' })
      }
    }
  }

  return links
}

/**
 * O alvo como caminho relativo à raiz do repositório, ou `null` quando não sobra
 * caminho nenhum depois de tirar fragmento e query.
 *
 * O fragmento é descartado e o **arquivo** é verificado: resolver âncora exigiria
 * reproduzir a regra de slug de cada renderizador, e uma regra reproduzida pela
 * metade reprova link que funciona.
 */
function resolveTarget(from: string, target: string): string | null {
  const withoutFragment = target.split('#')[0]?.split('?')[0] ?? ''

  if (withoutFragment === '') {
    return null
  }

  let decoded = withoutFragment

  try {
    decoded = decodeURIComponent(withoutFragment)
  } catch {
    // alvo com `%` que não é escape: verifica como veio
  }

  const base = decoded.startsWith('/') ? decoded.slice(1) : posix.join(posix.dirname(from), decoded)

  return posix.normalize(base).replace(/^\.\//, '')
}

/** Nome de arquivo (sem `.md`, minúsculo) → arquivos do corpus com aquele nome. */
function wikilinkIndex(files: readonly string[]): Map<string, string[]> {
  const index = new Map<string, string[]>()

  for (const file of files) {
    const name = posix.basename(file).replace(/\.md$/i, '').toLowerCase()

    index.set(name, [...(index.get(name) ?? []), file])
  }

  return index
}

function extensionOf(file: string): string | null {
  const base = posix.basename(file)
  const dot = base.lastIndexOf('.')

  // `dot <= 0` cobre "sem extensão" e ".gitkeep" — nome que começa com ponto.
  return dot <= 0 ? null : base.slice(dot + 1).toLowerCase()
}

/**
 * `living-docs/links` — links. Regra de origem: `RN-0023`.
 *
 * Começa apagando código, e essa ordem é o check: a primeira coisa que um
 * varredor de links ingênuo pega é o exemplo de link dentro de um bloco de
 * TypeScript — e cobrar exemplo ensina a não escrever exemplo.
 */
export const livingDocsLinks: Check = {
  id: RULE,
  name: 'links',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const files = documentationFiles(context.root, context.config)
    const corpus = new Set(files)
    const index = wikilinkIndex(files)

    // 1 — anexo binário no corpus da documentação (spec §13).
    for (const file of files) {
      const extension = extensionOf(file)

      if (extension === null || !BINARY_EXTENSIONS.has(extension)) {
        continue
      }

      findings.push(
        error(
          file,
          0,
          `Binary attachment in the documentation: \`.${extension}\` cannot be read in a diff nor reviewed in a PR.`,
          'Keep the source as text (Mermaid in a code block, SVG, or the `.puml`/`.dot` that generates it) and ' +
            // Rule of origin: spec §13, RN-0023.
            'keep the binary out of the versioned documentation.',
        ),
      )
    }

    // 2 — links.
    for (const file of files) {
      if (!file.endsWith('.md')) {
        continue
      }
      const source = readTextFile(context.root, file)

      if (source === null) {
        continue
      }

      for (const link of findLinks(stripCode(source))) {
        if (link.kind === 'wikilink') {
          const target = link.target.replace(/\.md$/i, '')
          const resolved = corpus.has(`${target}.md`) || corpus.has(target) || index.has(target.toLowerCase())

          if (!resolved) {
            findings.push(
              error(
                file,
                link.line,
                `Wikilink \`[[${link.target}]]\` has no target: no document in the corpus has that name.`,
                'Point to an existing document by file name, or replace it with a relative link. ' +
                  // Rule of origin: RN-0023.
                  'A wikilink with no target asserts a connection that does not exist.',
              ),
            )
          }
          continue
        }

        const resolved = resolveTarget(file, link.target)

        if (resolved === null) {
          continue
        }

        if (resolved.startsWith('..') || !existsSync(join(context.root, resolved))) {
          findings.push(
            error(
              file,
              link.line,
              `Broken internal link: \`${link.target}\` resolves to \`${resolved}\`, which does not exist.`,
              'Fix the path, or remove the link. The anchor (`#section`) is not checked — only the file —, ' +
                // Rule of origin: RN-0023.
                'so a link with an anchor only fails when the file does not exist.',
            ),
          )
        }
      }
    }

    return findings
  },
}
