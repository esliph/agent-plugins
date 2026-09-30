import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { PROJECT_ROOT } from '../helpers/roots.ts'

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

/**
 * Copies `files` (paths relative to the project) into a throwaway directory,
 * re-locks in `cwd` and returns the lockfile packages as re-locked. The lockfile
 * goes along: npm then only changes what package.json asks for.
 */
function relock(files: readonly string[], cwd: string, lockfile: string): { expected: unknown; actual: unknown } {
  const isolated = mkdtempSync(join(tmpdir(), 'ownership-lock-'))

  try {
    for (const file of files) {
      mkdirSync(dirname(join(isolated, file)), { recursive: true })
      copyFileSync(join(PROJECT_ROOT, file), join(isolated, file))
    }
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: join(isolated, cwd), encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)

    return { expected: packagesOf(join(PROJECT_ROOT, lockfile)), actual: packagesOf(join(isolated, lockfile)) }
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
}

test('the runtime lockfile of the distributed directory is in sync with its package.json', { timeout: 120_000 }, () => {
  const { expected, actual } = relock(['plugin/package.json', 'plugin/package-lock.json'], 'plugin', 'plugin/package-lock.json')

  assert.deepEqual(actual, expected, 'Runtime lockfile out of date. Regenerate it: `cd plugin && npm install --package-lock-only --ignore-scripts`.')
})

test('the development lockfile of the project is in sync with package.json and the plugin it links', { timeout: 120_000 }, () => {
  const { expected, actual } = relock(['package.json', 'package-lock.json', 'plugin/package.json'], '.', 'package-lock.json')

  assert.deepEqual(actual, expected, 'Development lockfile out of date. Regenerate it with `npm install` in plugins/ownership.')
})
