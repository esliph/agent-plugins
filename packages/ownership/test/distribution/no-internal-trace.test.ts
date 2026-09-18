import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')
const TRACE = /\b(?:ADR|RNF|RN|RF|DA|TDR|REL)-\d{4}\b|\bspec §/
const COMMENT = /^\s*(?:\/\/|\/\*|\*|#)/

function shipped(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? shipped(path) : /\.(?:ts|sh|json)$/.test(entry.name) ? [path] : []
  })
}

test('código, hooks e manifesto do plugin não citam o rastro interno fora de comentário', () => {
  const found: string[] = []

  for (const file of [...shipped(join(PACKAGE_ROOT, 'src')), ...shipped(join(PACKAGE_ROOT, 'hooks'))]) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (!COMMENT.test(line) && TRACE.test(line)) {
          found.push(`${relative(PACKAGE_ROOT, file)}:${index + 1}: ${line.trim()}`)
        }
      })
  }

  assert.deepEqual(found, [])
})
