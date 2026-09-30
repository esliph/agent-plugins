import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { PROJECT_ROOT } from '../helpers/roots.ts'

test('with the development condition, @esliph/ownership resolves from the source code, without dist', { timeout: 30_000 }, () => {
  const script = 'import("@esliph/ownership").then(m => { if (typeof m.resolveOwnership !== "function") throw new Error("did not resolve from source"); console.log("ok") })'
  const result = spawnSync('node', ['--input-type=module', '-e', script], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '--conditions=development' },
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /ok/)
})
