import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../plugin/src/core/roots.ts'

// v1 names that the shipped toolkit can no longer teach: the file lives at the
// root, the link to the consumer is `watches` with `consumer-visible: true`, and
// `drift`/`changelog` belong to `ownership validate`.
const STALE = [/docs\/\.ownership\.yml/, /consumer-visible-paths/, /living-docs (?:drift|changelog)/]
const SHIPPED = ['skills', 'templates', 'commands', 'agents']

function markdownUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? markdownUnder(path) : path.endsWith('.md') ? [path] : []
  })
}

test('shipped text (skills, templates, commands, agents) cites no file, key or command that no longer exists', () => {
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
