import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const TRACE = /\b(?:ADR|RNF|RN|RF|DA|TDR|REL)-\d{4}\b|\bspec §/
const COMMENT = /^\s*(?:\/\/|\/\*|\*|#)/

function files(dir: string): string[] {
  return readdirSync(join(PLUGIN_ROOT, dir), { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`

    return entry.isDirectory() ? files(path) : [path]
  })
}

function traces(paths: readonly string[], commentsAllowed: boolean): string[] {
  return paths.flatMap(path =>
    readFileSync(join(PLUGIN_ROOT, path), 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        TRACE.test(line) && !(commentsAllowed && COMMENT.test(line)) ? [`${relative(PLUGIN_ROOT, join(PLUGIN_ROOT, path))}:${index + 1}: ${line.trim()}`] : [],
      ),
  )
}

test('code and manifests do not cite the internal trace outside a comment', () => {
  assert.deepEqual(traces([...files('src'), ...files('.claude-plugin'), 'package.json'], true), [])
})

test('commands, skills and seeds do not cite the internal trace at all', () => {
  const shipped = [...files('commands'), ...files('skills'), ...files('templates')]

  assert.ok(shipped.length >= 12, `scan too empty: ${shipped.length} file(s)`)
  assert.deepEqual(traces(shipped, false), [])
})
