import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'
import { runInit, STAGES } from '../../src/cli/init.ts'
import { loadOwnership } from '../../src/config/ownership.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { DEFAULT_ID_FORMAT, parseId } from '../../src/docs/schema.ts'
import { findCitations } from '../../src/ids/citations.ts'
import { checkoutRoot } from '../helpers/checkout.ts'
import { withTempRepo } from '../helpers/tmp.ts'

/**
 * RN-0031: o que o toolkit entrega a quem instala — os arquivos que o `init`
 * semeia, os templates, o texto do plugin e as strings do código — não cita o
 * rastro interno do toolkit (ADR-0018).
 *
 * Rastro interno é o prefixo declarado em `artifacts:` do `.ownership.yml` do
 * toolkit, mais `spec §<n>` e o caminho `docs/superpowers/`. Nenhuma lista de
 * prefixos mora aqui: `CI-n`, `HK-n`, `SK-n`, `CM-n` e `EXIT-n` ficam de fora
 * porque ninguém os declara como família de artefato — o mesmo desenho de CI-11.
 */
const ROOT = toolkitRoot()
const CONFIG = loadOwnership(checkoutRoot())
const INTERNAL = new Set(CONFIG.artifacts.map(artifact => artifact.idPrefix))

interface Trail {
  file: string
  line: number
  excerpt: string
}

/** As ocorrências de rastro interno em `text`, com a linha 1-indexed. */
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

test('RN-0031: o detector acha o rastro interno e deixa a interface pública e o placeholder', () => {
  const texto = [
    'Regra de origem: ADR-0011 e spec §3, em docs/superpowers/research/x.md.',
    'CI-7 reprova, HK-2 bloqueia, SK-7 e EXIT-2 são públicos.',
    '| Termo | Fonte | RN-nnnn |',
  ].join('\n')

  assert.deepEqual(
    trailIn('x', texto).map(trail => `${trail.line}:${trail.excerpt}`),
    ['1:ADR-0011', '1:spec §3', '1:docs/superpowers/'],
  )
  assert.ok(INTERNAL.has('ADR') && INTERNAL.has('RN'), 'o conjunto vem do .ownership.yml do toolkit')
})

test('RN-0031: o que o init semeia, em todo estágio, e os templates crus não citam o rastro interno do toolkit', () => {
  const found: Trail[] = []
  const comments: string[] = []
  let scanned = 0

  for (const stage of STAGES) {
    withTempRepo({}, root => {
      const result = runInit(root, {
        owner: '@time',
        dryRun: false,
        stage,
        idFormat: DEFAULT_ID_FORMAT,
        invoke: 'npx living-docs',
        marketplace: 'time/living-docs',
      })

      for (const entry of result.created) {
        // `created` traz diretório (`docs/decisions/adr/`) e a linha do settings
        // com um sufixo explicativo depois do caminho.
        const path = entry.split(' ')[0] ?? entry
        const absolute = join(root, path)

        if (!existsSync(absolute) || statSync(absolute).isDirectory()) {
          continue
        }
        const source = readFileSync(absolute, 'utf8')

        scanned++
        found.push(...trailIn(`[${stage}] ${path}`, source))
        // Nenhum estágio semeia artefato por arquivo: tudo que o init escreve é
        // documento-coleção ou documento externo, e nenhum dos dois guarda
        // comentário para quem escreve.
        if (path.endsWith('.md') && source.includes('<!--')) {
          comments.push(`[${stage}] ${path}`)
        }
      }
    })
  }

  // Os templates que o init não semeia (adr, tdr, migration, release-note) só
  // são cobertos por esta varredura crua.
  for (const absolute of filesUnder(join(ROOT, 'templates'))) {
    scanned++
    found.push(...trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))
  }

  assert.ok(scanned > 20, `varredura vazia demais: ${scanned} arquivo(s)`)
  assert.deepEqual(comments, [], `semente com comentário HTML:\n${comments.join('\n')}`)
  assert.equal(found.length, 0, `rastro interno do toolkit no que o init entrega:\n${report(found)}`)
})

/** O que o cache do marketplace entrega de texto do plugin — `src/` e `test/` têm varredura própria ou nenhuma. */
const PLUGIN_DIRS = ['.claude-plugin', 'hooks', 'commands', 'skills', 'agents'] as const

test('RN-0031: o texto do plugin não cita o rastro interno do toolkit', () => {
  const files = PLUGIN_DIRS.flatMap(dir => filesUnder(join(ROOT, dir)))
  const found = files.flatMap(absolute => trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))

  assert.ok(files.length > 10, `varredura vazia demais: ${files.length} arquivo(s)`)
  assert.equal(found.length, 0, `rastro interno do toolkit no plugin:\n${report(found)}`)
})

test('RN-0031: as strings do código não citam o rastro interno do toolkit — comentário pode', () => {
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

  assert.ok(files.length > 20, `varredura vazia demais: ${files.length} arquivo(s)`)
  assert.equal(found.length, 0, `rastro interno do toolkit em string de src/:\n${report(found)}`)
})
