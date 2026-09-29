import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

// Nomes da v1 que o toolkit entregue não pode mais ensinar: o arquivo mora na
// raiz, o vínculo com o consumidor é `watches` com `consumer-visible: true`, e
// `drift`/`changelog` são do `ownership validate`.
const STALE = [/docs\/\.ownership\.yml/, /consumer-visible-paths/, /living-docs (?:drift|changelog)/]
const SHIPPED = ['skills', 'templates', 'commands', 'agents']

function markdownUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? markdownUnder(path) : path.endsWith('.md') ? [path] : []
  })
}

test('texto entregue (skills, templates, comandos, agentes) não cita arquivo, chave nem comando que não existem mais', () => {
  const found: string[] = []

  for (const dir of SHIPPED) {
    for (const file of markdownUnder(join(toolkitRoot(), dir))) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          for (const pattern of STALE) {
            if (pattern.test(line)) {
              found.push(`${file.slice(toolkitRoot().length + 1)}:${index + 1} ${pattern}`)
            }
          }
        })
    }
  }

  assert.deepEqual(found, [])
})
