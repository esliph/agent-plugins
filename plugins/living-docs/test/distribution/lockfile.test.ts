import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { checkoutRoot } from '../helpers/checkout.ts'

const CHECKOUT = checkoutRoot()

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

/**
 * Rebuilds, in a throwaway directory, the part of the checkout that npm reads
 * (the core sits beside living-docs, as `file:` expects), re-locks in `cwd` and
 * returns the re-locked packages. Paths are relative to the checkout.
 */
function relock(files: readonly string[], cwd: string, lockfile: string): { expected: unknown; actual: unknown } {
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))

  try {
    for (const file of files) {
      mkdirSync(dirname(join(isolated, file)), { recursive: true })
      copyFileSync(join(CHECKOUT, file), join(isolated, file))
    }
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: join(isolated, cwd), encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)

    return { expected: packagesOf(join(CHECKOUT, lockfile)), actual: packagesOf(join(isolated, lockfile)) }
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
}

const CORE = 'plugins/ownership/plugin/package.json'

test('RNF-0002: the runtime lockfile of the distributed directory is in sync with its package.json', { timeout: 120_000 }, () => {
  const { expected, actual } = relock(
    ['plugins/living-docs/plugin/package.json', 'plugins/living-docs/plugin/package-lock.json', CORE],
    'plugins/living-docs/plugin',
    'plugins/living-docs/plugin/package-lock.json',
  )

  assert.deepEqual(actual, expected, 'Runtime lockfile out of date. Regenerate it: `cd plugins/living-docs/plugin && npm install --package-lock-only --ignore-scripts`.')
})

test('RNF-0002: the development lockfile of the project is in sync with package.json and what it links', { timeout: 120_000 }, () => {
  const { expected, actual } = relock(
    ['plugins/living-docs/package.json', 'plugins/living-docs/package-lock.json', 'plugins/living-docs/plugin/package.json', CORE],
    'plugins/living-docs',
    'plugins/living-docs/package-lock.json',
  )

  assert.deepEqual(actual, expected, 'Development lockfile out of date. Regenerate it with `npm install` in plugins/living-docs.')
})
