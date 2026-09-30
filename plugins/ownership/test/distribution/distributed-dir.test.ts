import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const OUTSIDE = [/^test\//, /^docs\//, /^node_modules\//, /^bin\//, /^(Dockerfile|compose\.yaml|\.dockerignore)$/, /^tsconfig(\..+)?\.json$/, /^eslint\.config\.mjs$/]

test('ADR-0036: the distributed directory carries no test, documentation, toolchain or container file', () => {
  const files = execFileSync('git', ['ls-files', '-z', '--', '.'], { cwd: PLUGIN_ROOT, encoding: 'utf8' }).split('\0').filter(file => file !== '')

  assert.ok(files.length > 30, `scan too empty: ${files.length} file(s)`)
  assert.deepEqual(files.filter(file => OUTSIDE.some(pattern => pattern.test(file))), [])
})

test('ADR-0036: the distributed manifest declares no development dependency, and its lockfile carries none', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package.json'), 'utf8')) as Record<string, unknown>
  const lock = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package-lock.json'), 'utf8')) as { packages: Record<string, { dev?: boolean }> }

  assert.equal(manifest.devDependencies, undefined)
  assert.deepEqual(
    Object.entries(lock.packages).filter(([path, entry]) => path !== '' && entry.dev === true).map(([path]) => path),
    [],
  )
})
