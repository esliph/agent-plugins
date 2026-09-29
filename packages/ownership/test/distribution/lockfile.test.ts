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

test('o package-lock.json do pacote está em dia com o package.json', { timeout: 120_000 }, () => {
  const isolated = mkdtempSync(join(tmpdir(), 'ownership-lock-'))

  try {
    copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(isolated, 'package.json'))
    // O lockfile entra junto: sem ele o npm resolve a versão mais nova de cada
    // faixa, e o teste reprovaria a cada publicação no registro, com o
    // package.json intocado. Com ele, o npm só muda o que o package.json pede.
    copyFileSync(join(PACKAGE_ROOT, 'package-lock.json'), join(isolated, 'package-lock.json'))
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
