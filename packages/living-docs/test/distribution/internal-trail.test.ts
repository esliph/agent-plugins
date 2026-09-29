import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'
import { runInit, STAGES } from '../../src/cli/init.ts'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { DEFAULT_ID_FORMAT, parseId } from '../../src/docs/schema.ts'
import { findCitations } from '../../src/ids/citations.ts'
import { checkoutRoot } from '../helpers/checkout.ts'
import { withTempRepo } from '../helpers/tmp.ts'

/**
 * RN-0031: what the toolkit delivers to whoever installs it — the files `init`
 * seeds, the templates, the plugin text and the code strings — does not cite the
 * toolkit's internal trail (ADR-0018).
 *
 * Internal trail is the `id-prefix` declared in the toolkit's `.ownership.yml`,
 * plus `spec §<n>` and the path `docs/superpowers/`. No list of
 * prefixes lives here: `CI-n`, `HK-n`, `SK-n`, `CM-n` and `EXIT-n` stay out
 * because nobody declares them as an artifact family — the same design as living-docs/external-audience.
 */
const ROOT = toolkitRoot()
const CONFIG = loadLivingDocsConfig(checkoutRoot())
const INTERNAL = new Set(CONFIG.artifacts.map(artifact => artifact.idPrefix))

interface Trail {
  file: string
  line: number
  excerpt: string
}

/** The internal trail occurrences in `text`, with the 1-indexed line. */
function trailIn(file: string, text: string): Trail[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const found: Trail[] = []

  for (const citation of findCitations(text, CONFIG.idFormat)) {
    const parsed = parseId(citation.id, CONFIG.idFormat)

    if (parsed !== null && INTERNAL.has(parsed.prefix)) {
      found.push({ file, line: citation.line, excerpt: citation.id })
    }
  }
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/spec §\d+|docs\/superpowers\//g)) {
      found.push({ file, line: index + 1, excerpt: match[0] })
    }
  })

  return found
}

function report(found: readonly Trail[]): string {
  return found.map(trail => `${trail.file}:${trail.line} — ${trail.excerpt}`).join('\n')
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)],
  )
}

function toolkitPath(absolute: string): string {
  return relative(ROOT, absolute).split(sep).join('/')
}

test('RN-0031: the detector finds the internal trail and leaves the public interface and the placeholder alone', () => {
  const text = [
    'Rule of origin: ADR-0011 and spec §3, in docs/superpowers/research/x.md.',
    'living-docs/done-verifiable fails, ownership/generated-guard blocks, SK-7 and EXIT-2 are public.',
    '| Term | Source | RN-nnnn |',
  ].join('\n')

  assert.deepEqual(
    trailIn('x', text).map(trail => `${trail.line}:${trail.excerpt}`),
    ['1:ADR-0011', '1:spec §3', '1:docs/superpowers/'],
  )
  assert.ok(INTERNAL.has('ADR') && INTERNAL.has('RN'), 'the set comes from the toolkit .ownership.yml')
})

test('RN-0031: what init seeds, in every stage, and the raw templates do not cite the internal trail of the toolkit', () => {
  const found: Trail[] = []
  const comments: string[] = []
  let scanned = 0

  for (const stage of STAGES) {
    withTempRepo({}, root => {
      const result = runInit(root, {
        owner: '@team',
        dryRun: false,
        stage,
        idFormat: DEFAULT_ID_FORMAT,
        invoke: 'npx living-docs',
        invokeOwnership: 'npx living-docs',
        marketplace: 'team/living-docs',
      })

      for (const entry of result.created) {
        // `created` carries a directory (`docs/decisions/adr/`) and the settings line
        // with an explanatory suffix after the path.
        const path = entry.split(' ')[0] ?? entry
        const absolute = join(root, path)

        if (!existsSync(absolute) || statSync(absolute).isDirectory()) {
          continue
        }
        const source = readFileSync(absolute, 'utf8')

        scanned++
        found.push(...trailIn(`[${stage}] ${path}`, source))
        // No stage seeds a per-file artifact: everything init writes is a
        // collection document or an external document, and neither keeps
        // a comment for whoever writes.
        if (path.endsWith('.md') && source.includes('<!--')) {
          comments.push(`[${stage}] ${path}`)
        }
      }
    })
  }

  // The templates that init does not seed (adr, tdr, migration, release-note) are
  // only covered by this raw scan.
  for (const absolute of filesUnder(join(ROOT, 'templates'))) {
    scanned++
    found.push(...trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))
  }

  assert.ok(scanned > 20, `scan too empty: ${scanned} file(s)`)
  assert.deepEqual(comments, [], `seed with an HTML comment:\n${comments.join('\n')}`)
  assert.equal(found.length, 0, `toolkit internal trail in what init delivers:\n${report(found)}`)
})

/** The plugin text that the marketplace cache delivers — `src/` and `test/` have their own scan or none. */
const PLUGIN_DIRS = ['.claude-plugin', 'hooks', 'commands', 'skills', 'agents'] as const
/** The package README travels in the same cache: it is the plugin's presentation (ADR-0035). */
const PLUGIN_FILES = ['README.md'] as const

test('RN-0031: the plugin text does not cite the internal trail of the toolkit', () => {
  const files = [...PLUGIN_DIRS.flatMap(dir => filesUnder(join(ROOT, dir))), ...PLUGIN_FILES.map(file => join(ROOT, file))]
  const found = files.flatMap(absolute => trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))

  assert.ok(files.length > 10, `scan too empty: ${files.length} file(s)`)
  assert.equal(found.length, 0, `toolkit internal trail in the plugin:\n${report(found)}`)
})

test('RN-0031: the code strings do not cite the internal trail of the toolkit — a comment may', () => {
  const files = filesUnder(join(ROOT, 'src')).filter(absolute => absolute.endsWith('.ts'))
  const found: Trail[] = []

  for (const absolute of files) {
    const file = toolkitPath(absolute)
    const source = ts.createSourceFile(absolute, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true)

    const visit = (node: ts.Node): void => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line

        for (const trail of trailIn(file, node.text)) {
          found.push({ ...trail, line: start + trail.line })
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(source)
  }

  assert.ok(files.length > 20, `scan too empty: ${files.length} file(s)`)
  assert.equal(found.length, 0, `toolkit internal trail in a src/ string:\n${report(found)}`)
})
