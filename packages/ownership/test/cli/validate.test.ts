import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { runValidate } from '../../src/cli/validate.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('sem arquivo de ownership, installed: false e exitCode 0', () => {
  withTempRepo({}, root => {
    const result = runValidate(root)

    assert.equal(result.installed, false)
    assert.equal(result.exitCode, 0)
  })
})

test('com achado de erro, exitCode 1', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/x.md\n    owner: "@a"\n' }, root => {
    const result = runValidate(root)

    assert.equal(result.exitCode, 1) // ownership/owner-coverage: CODEOWNERS ausente e caminho inexistente
    assert.ok(result.errors > 0)
  })
})

test('sem --base, os checks de diff não rodam', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: docs/x.md\n' }, root => {
    const result = runValidate(root)

    assert.ok(!result.findings.some(f => f.ruleId === 'ownership/watch-satisfied'))
  })
})

test('base que não resolve: sai com 2 e diz que o clone precisa conter a base', { timeout: 30_000 }, () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    spawnSync('git', ['init', '-q'], { cwd: root })
    const cli = join(import.meta.dirname, '..', '..', 'src', 'cli', 'index.ts')
    const run = spawnSync('node', [cli, 'validate', '--base', 'nao-existe'], { cwd: root, encoding: 'utf8', env: { ...process.env, OWNERSHIP_REPO_ROOT: root } })

    assert.equal(run.status, 2, run.stderr)
    assert.match(run.stderr, /fetch-depth/)
  })
})
