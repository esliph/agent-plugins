import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const PACKAGE_ROOT = toolkitRoot()
const CORE_ROOT = join(PACKAGE_ROOT, '..', '..', 'plugins', 'ownership', 'plugin')

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

test('RNF-0002: the package-lock.json of the package is up to date with package.json', { timeout: 120_000 }, () => {
  // The two projects side by side, as in the checkout: without the core, `file:../../plugins/ownership/plugin`
  // does not resolve. The lockfile goes along so npm only changes what package.json asks for.
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))
  const pkg = join(isolated, 'packages', 'living-docs')
  const core = join(isolated, 'plugins', 'ownership', 'plugin')

  try {
    mkdirSync(pkg, { recursive: true })
    mkdirSync(core, { recursive: true })
    copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(pkg, 'package.json'))
    copyFileSync(join(PACKAGE_ROOT, 'package-lock.json'), join(pkg, 'package-lock.json'))
    copyFileSync(join(CORE_ROOT, 'package.json'), join(core, 'package.json'))
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: pkg, encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(
      packagesOf(join(pkg, 'package-lock.json')),
      packagesOf(join(PACKAGE_ROOT, 'package-lock.json')),
      'Outdated lockfile. Regenerate it in a temporary directory with packages/living-docs and plugins/ownership/plugin side by side.',
    )
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
})
