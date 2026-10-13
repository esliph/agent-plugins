import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PLUGIN_ROOT } from '../helpers/roots.ts'
import { PUBLIC_NAMES } from '../helpers/surface.ts'

function npm(command: string, cwd: string): { status: number | null; stdout: string; stderr: string } {
  // `npm` is a .cmd on Windows, which only a shell can start.
  const result = spawnSync(`npm ${command}`, { cwd, encoding: 'utf8', shell: true })

  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

test('the packed package installs, exports its public names from the compiled code and runs its bin', { timeout: 300_000 }, () => {
  const pack = npm('pack --json', PLUGIN_ROOT)

  assert.equal(pack.status, 0, pack.stderr)

  const [packed] = JSON.parse(pack.stdout) as { filename: string; files: { path: string }[] }[]

  assert.ok(packed !== undefined)

  const tarball = join(PLUGIN_ROOT, packed.filename)
  const consumer = mkdtempSync(join(tmpdir(), 'ownership-pack-'))

  try {
    const shipped = packed.files.map(file => file.path)

    assert.ok(shipped.includes('ownership.schema.json'))
    assert.ok(shipped.includes('dist/index.js') && shipped.includes('dist/index.d.ts') && shipped.includes('dist/cli/index.js'))
    assert.deepEqual(
      shipped.filter(path => path.startsWith('src/') || path.startsWith('hooks/') || path.startsWith('commands/')),
      [],
      'the npm package carries the compiled code only',
    )

    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }))

    const install = npm(`install ${JSON.stringify(tarball)} --no-audit --no-fund`, consumer)

    assert.equal(install.status, 0, install.stderr)

    const names = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', 'import("@esliph/ownership").then(m => console.log(JSON.stringify(Object.keys(m).sort())))'],
      {
        cwd: consumer,
        encoding: 'utf8',
      },
    )

    assert.equal(names.status, 0, names.stderr)
    assert.deepEqual(JSON.parse(names.stdout), [...PUBLIC_NAMES])

    const manifest = JSON.parse(readFileSync(join(consumer, 'node_modules', '@esliph', 'ownership', 'package.json'), 'utf8')) as { bin: Record<string, string> }
    const bin = spawnSync(process.execPath, [join(consumer, 'node_modules', '@esliph', 'ownership', manifest.bin.ownership ?? ''), '--help'], {
      cwd: consumer,
      encoding: 'utf8',
    })

    assert.equal(bin.status, 0, bin.stderr)
    assert.match(bin.stdout, /^Usage: ownership <command>/)
  } finally {
    rmSync(consumer, { recursive: true, force: true })
    rmSync(tarball, { force: true })
    rmSync(join(PLUGIN_ROOT, 'dist'), { recursive: true, force: true })
  }

  assert.equal(existsSync(join(PLUGIN_ROOT, 'dist')), false, 'the compiled code exists only while packing')
})
