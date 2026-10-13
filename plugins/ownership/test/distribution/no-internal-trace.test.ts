import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SCHEMA_URL } from '../../plugin/src/init/render.ts'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

/** What a shipped file must not say: it would send whoever installs the plugin to a place they do not have. */
const TRACES: [string, RegExp][] = [
  ['a requirement ID', /\bREQ-[A-Z]+-\d+/],
  ['a section of the specification', /§\s*\d/],
  ['a document of this repository', /\bdocs\/(?:requirements|superpowers)\b/],
  ['a path of this repository', /\bplugins\/ownership\b/],
]

function shippedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.'], { cwd: PLUGIN_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(file => file !== '' && file !== 'package-lock.json')
}

test('nothing the plugin ships points inside the repository that develops it', () => {
  const files = shippedFiles()
  const found: string[] = []

  assert.ok(files.length > 30, `scan too empty: ${files.length} files`)

  for (const file of files) {
    readFileSync(join(PLUGIN_ROOT, file), 'utf8')
      .split('\n')
      .forEach((line, index) => {
        // The address the schema is published at is the one path of this repository a shipped file may carry.
        const text = line.replaceAll(SCHEMA_URL, '')

        for (const [what, pattern] of TRACES) {
          if (pattern.test(text)) {
            found.push(`${file}:${index + 1}: ${what}: ${line.trim()}`)
          }
        }
      })
  }

  assert.deepEqual(found, [])
})
