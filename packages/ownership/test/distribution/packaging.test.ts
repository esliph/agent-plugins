import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

test('npm pack produz um tarball instalável cujo dist roda de verdade', { timeout: 120_000 }, () => {
  const packResult = spawnSync('npm', ['pack', '--json'], { cwd: PACKAGE_ROOT, encoding: 'utf8', shell: true })

  assert.equal(packResult.status, 0, packResult.stderr)
  const { filename } = (JSON.parse(packResult.stdout) as { filename: string }[])[0]!
  const tarball = join(PACKAGE_ROOT, filename)
  const installDir = mkdtempSync(join(tmpdir(), 'ownership-pack-'))

  try {
    const install = spawnSync('npm', ['install', tarball, '--no-save'], { cwd: installDir, encoding: 'utf8', shell: true })

    assert.equal(install.status, 0, install.stderr)

    const run = spawnSync('node', ['node_modules/@esliph/ownership/dist/cli/index.js', '--help'], { cwd: installDir, encoding: 'utf8' })

    assert.equal(run.status, 0, run.stderr)
    assert.match(run.stdout, /ownership <comando>/)
  } finally {
    rmSync(installDir, { recursive: true, force: true })
    rmSync(tarball, { force: true })
    rmSync(join(PACKAGE_ROOT, 'dist'), { recursive: true, force: true })
  }

  assert.equal(existsSync(join(PACKAGE_ROOT, 'dist')), false)
})
