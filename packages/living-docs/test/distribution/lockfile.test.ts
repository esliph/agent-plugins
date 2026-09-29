import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const PACKAGE_ROOT = toolkitRoot()
const CORE_ROOT = join(PACKAGE_ROOT, '..', 'ownership')

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

test('RNF-0002: o package-lock.json do pacote está em dia com o package.json', { timeout: 120_000 }, () => {
  // Os dois pacotes lado a lado, como no checkout: sem o irmão, `file:../ownership`
  // não resolve. O lockfile entra junto para o npm só mudar o que o package.json pede.
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))
  const pkg = join(isolated, 'packages', 'living-docs')
  const core = join(isolated, 'packages', 'ownership')

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
      'Lockfile desatualizado. Regere num diretório temporário com packages/living-docs e packages/ownership lado a lado (veja o passo 2.3 do plano de 2026-09-28).',
    )
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
})
