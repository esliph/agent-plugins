import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { repoRoot, templatesDir, toolkitRoot } from '../../src/core/roots.ts'

test('toolkitRoot points at the toolkit checkout', () => {
  assert.ok(existsSync(join(toolkitRoot(), 'package.json')))
  assert.ok(existsSync(join(templatesDir(), 'adr.md')))
})

test('RNF-0003: repoRoot honors LIVING_DOCS_REPO_ROOT and does not move toolkitRoot', () => {
  const before = toolkitRoot()
  const previous = process.env.LIVING_DOCS_REPO_ROOT
  // Path derived from the system, not hand-written: `repoRoot()` resolves, and a
  // literal POSIX path becomes `C:\...` on Windows.
  const other = join(tmpdir(), 'other-project')

  process.env.LIVING_DOCS_REPO_ROOT = other
  try {
    assert.equal(repoRoot(), resolve(other))
    assert.equal(toolkitRoot(), before, 'the toolkit root must not follow the repository one (ADR-0003)')
  } finally {
    if (previous === undefined) {
      delete process.env.LIVING_DOCS_REPO_ROOT
    } else {
      process.env.LIVING_DOCS_REPO_ROOT = previous
    }
  }
})

test('RNF-0003: no absolute container path is embedded in src/ or test/', () => {
  // Built by concatenation on purpose: written whole, this array
  // would fail the very file that contains it.
  const forbidden = ['/' + 'app', '/' + 'workspace', '/' + 'opt/living-docs']
  const offenses: string[] = []

  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(toolkitRoot(), dir))) {
      const relative = `${dir}/${entry}`

      if (statSync(join(toolkitRoot(), relative)).isDirectory()) {
        walk(relative)
        continue
      }
      if (!entry.endsWith('.ts')) {
        continue
      }
      const source = readFileSync(join(toolkitRoot(), relative), 'utf8')

      for (const forbiddenPath of forbidden) {
        if (source.includes(`'${forbiddenPath}`) || source.includes(`"${forbiddenPath}`)) {
          offenses.push(`${relative}: ${forbiddenPath}`)
        }
      }
    }
  }

  walk('src')
  walk('test')
  assert.deepEqual(offenses, [], 'a container path may only appear in Dockerfile, compose and wrappers (ADR-0003)')
})

test('RNF-0003: with no variable at all, each root comes from its own source', () => {
  // Replaces the old assertion "the container declares both roots", which read
  // from the environment two variables that only existed because compose injected them.
  // What ADR-0003 actually demands survives leaving the container: the toolkit
  // finds itself through its own file, and the validated repository is the caller's cwd.
  const previousRepo = process.env.LIVING_DOCS_REPO_ROOT
  const previousToolkit = process.env.LIVING_DOCS_TOOLKIT_ROOT

  delete process.env.LIVING_DOCS_REPO_ROOT
  delete process.env.LIVING_DOCS_TOOLKIT_ROOT
  try {
    // This file is two levels below the root, exactly like
    // `src/core/roots.ts`: the derivation is the same, and it is what is asserted.
    assert.equal(toolkitRoot(), resolve(join(import.meta.dirname, '..', '..')))
    assert.equal(repoRoot(), resolve(process.cwd()))
  } finally {
    if (previousRepo !== undefined) {
      process.env.LIVING_DOCS_REPO_ROOT = previousRepo
    }
    if (previousToolkit !== undefined) {
      process.env.LIVING_DOCS_TOOLKIT_ROOT = previousToolkit
    }
  }
})
