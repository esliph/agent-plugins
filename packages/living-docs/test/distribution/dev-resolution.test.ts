import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { toolkitRoot } from '../../src/core/roots.ts'

test('RNF-0002: do pacote do living-docs, @esliph/ownership resolve pelo código-fonte, sem dist', { timeout: 30_000 }, () => {
  const script = 'import("@esliph/ownership").then(m => { if (typeof m.resolveOwnership !== "function") throw new Error("não resolveu pelo source"); console.log(import.meta.resolve("@esliph/ownership")) })'
  const result = spawnSync('node', ['--conditions=development', '--input-type=module', '-e', script], { cwd: toolkitRoot(), encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /packages\/ownership\/src\/index\.ts/)
})

test('RNF-0002: o próprio runner de testes carrega @esliph/ownership pela condição development', async () => {
  // Sem a condição, a resolução cai em `default` (dist/), que não existe no
  // checkout: este import só passa se o worker do `node --test` herdou a flag.
  const core = await import('@esliph/ownership')

  assert.equal(typeof core.resolveOwnership, 'function')
})
