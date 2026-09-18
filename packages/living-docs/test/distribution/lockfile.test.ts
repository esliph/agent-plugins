import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const PACKAGE_ROOT = toolkitRoot()

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

test('RNF-0002: o package-lock.json do pacote está em dia com o package.json', { timeout: 120_000 }, () => {
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))

  try {
    copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(isolated, 'package.json'))
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: isolated, encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(
      packagesOf(join(isolated, 'package-lock.json')),
      packagesOf(join(PACKAGE_ROOT, 'package-lock.json')),
      'Lockfile desatualizado. Regere fora do workspace: copie package.json para um diretório temporário, rode `npm install --package-lock-only` e traga o package-lock.json de volta.',
    )
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
})
