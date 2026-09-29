import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..')

test('com a condição development, @esliph/ownership resolve pelo código-fonte, sem dist', { timeout: 30_000 }, () => {
  const script = 'import("@esliph/ownership").then(m => { if (typeof m.resolveOwnership !== "function") throw new Error("não resolveu pelo source"); console.log("ok") })'
  const result = spawnSync('node', ['--input-type=module', '-e', script], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '--conditions=development' },
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /ok/)
})
