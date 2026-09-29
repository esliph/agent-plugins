import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

test('the package-lock.json of the package is in sync with package.json', { timeout: 120_000 }, () => {
  const isolated = mkdtempSync(join(tmpdir(), 'ownership-lock-'))

  try {
    copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(isolated, 'package.json'))
    // The lockfile goes along: without it npm resolves the newest version of each
    // range, and the test would fail on every publication to the registry, with
    // package.json untouched. With it, npm only changes what package.json asks for.
    copyFileSync(join(PACKAGE_ROOT, 'package-lock.json'), join(isolated, 'package-lock.json'))
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: isolated, encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(
      packagesOf(join(isolated, 'package-lock.json')),
      packagesOf(join(PACKAGE_ROOT, 'package-lock.json')),
      'Lockfile out of date. Regenerate it outside the workspace: copy package.json to a temporary directory, run `npm install --package-lock-only` and bring package-lock.json back.',
    )
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
})
