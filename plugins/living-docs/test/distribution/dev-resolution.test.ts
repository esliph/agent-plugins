import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { toolkitRoot } from '../../plugin/src/core/roots.ts'

test('RNF-0002: from the living-docs package, @esliph/ownership resolves through the source code, without dist', { timeout: 30_000 }, () => {
  const script = 'import("@esliph/ownership").then(m => { if (typeof m.resolveOwnership !== "function") throw new Error("did not resolve through the source"); m.resolveOwnership(process.cwd()); console.log(import.meta.resolve("@esliph/ownership")) })'
  const result = spawnSync('node', ['--conditions=development', '--input-type=module', '-e', script], { cwd: toolkitRoot(), encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /plugins\/ownership\/plugin\/src\/index\.ts/)
})

test('RNF-0002: the test runner itself loads @esliph/ownership through the development condition', async () => {
  // Without the condition, resolution falls to `default` (dist/), which does not exist in the
  // checkout: this import only passes if the `node --test` worker inherited the flag.
  const core = await import('@esliph/ownership')

  assert.equal(typeof core.resolveOwnership, 'function')
})
