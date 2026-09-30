import { existsSync } from 'node:fs'
import { join, posix } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { readTextFile } from '../core/files.ts'
import { documentationFiles } from '../docs/corpus.ts'
import { stripCode } from '../docs/markdown.ts'

const RULE = 'living-docs/links'

/**
 * Formats that are neither read in a diff nor reviewed in a PR (spec §13).
 *
 * Denylist, not allowlist, on purpose: `.svg` is XML and diffable, `.json` and
 * `.csv` are text, and failing a legitimate text format would be the check teaching
 * style instead of enforcing the rule. What the spec refuses is the **binary**.
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
  /** 1-indexed line. */
  line: number
  kind: 'link' | 'wikilink'
}

const INLINE = /\[[^\]\n]*\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)/g
const DEFINITION = /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*<?([^\s>]+)>?/g
const WIKILINK = /\[\[([^\]|\n]+?)(?:\|[^\]\n]*)?\]\]/g

/** Protocol, or network root: the target is not from this repository. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

/** The target points outside the repository, or inside the file itself. */
function isOutOfScope(target: string): boolean {
  return EXTERNAL.test(target) || target.startsWith('#')
}

/**
 * Links of a text **already without code** (`stripCode` is the caller's job).
 *
 * Only what should resolve inside the repository: external links and pure anchors
 * leave here, and not further down. A link checker that tries to resolve
 * `https://` needs a network, and the toolkit has none (`RNF-0001`).
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
 * The target as a path relative to the repository root, or `null` when no
 * path is left after removing fragment and query.
 *
 * The fragment is discarded and the **file** is verified: resolving an anchor would require
 * reproducing each renderer's slug rule, and a rule reproduced
 * halfway fails a link that works.
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
    // target with a `%` that is not an escape: verify as it came
  }

  const base = decoded.startsWith('/') ? decoded.slice(1) : posix.join(posix.dirname(from), decoded)

  return posix.normalize(base).replace(/^\.\//, '')
}

/** File name (without `.md`, lowercase) → corpus files with that name. */
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

  // `dot <= 0` covers "no extension" and ".gitkeep" — a name that starts with a dot.
  return dot <= 0 ? null : base.slice(dot + 1).toLowerCase()
}

/**
 * `living-docs/links` — links. Rule of origin: `RN-0023`.
 *
 * It starts by erasing code, and that order is the check: the first thing a naive
 * link scanner catches is the link example inside a TypeScript
 * block — and charging for an example teaches not to write examples.
 */
export const livingDocsLinks: Check = {
  id: RULE,
  name: 'links',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const files = documentationFiles(context.root, context.config)
    const corpus = new Set(files)
    const index = wikilinkIndex(files)

    // 1 — binary attachment in the documentation corpus (spec §13).
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
