import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { runValidate } from '../../plugin/src/cli/validate.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

test('with no ownership file, installed: false and exitCode 0', () => {
  withTempRepo({}, root => {
    const result = runValidate(root)

    assert.equal(result.installed, false)
    assert.equal(result.exitCode, 0)
  })
})

test('with an error finding, exitCode 1', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/x.md\n    owner: "@a"\n' }, root => {
    const result = runValidate(root)

    assert.equal(result.exitCode, 1) // ownership/owner-coverage: CODEOWNERS missing and nonexistent path
    assert.ok(result.errors > 0)
  })
})

test('without --base, the diff checks do not run', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: docs/x.md\n' }, root => {
    const result = runValidate(root)

    assert.ok(!result.findings.some(f => f.ruleId === 'ownership/watch-satisfied'))
  })
})

test('base that does not resolve: exits with 2 and says the clone must contain the base', { timeout: 30_000 }, () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    spawnSync('git', ['init', '-q'], { cwd: root })
    const cli = join(PLUGIN_ROOT, 'src', 'cli', 'index.ts')
    const run = spawnSync('node', [cli, 'validate', '--base', 'does-not-exist'], { cwd: root, encoding: 'utf8', env: { ...process.env, OWNERSHIP_REPO_ROOT: root } })

    assert.equal(run.status, 2, run.stderr)
    assert.match(run.stderr, /fetch-depth/)
  })
})
