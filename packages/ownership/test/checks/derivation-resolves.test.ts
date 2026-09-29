import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipDerivationResolves } from '../../src/checks/derivation-resolves.ts'
import { forgetTree } from '../../src/core/files.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('campo ausente, fora da fonte e alvo inexistente viram achados distintos', () => {
  withTempRepo(
    {
      'docs/plans/a.md': '---\ntitle: sem spec\n---\n',
      'docs/plans/b.md': '---\nspec: docs/outro/x.md\n---\n',
      'docs/plans/c.md': '---\nspec: docs/specs/nao-existe.md\n---\n',
    },
    root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [{ path: 'docs/plans/', owner: '@a', derivesFrom: { source: 'docs/specs/', field: 'spec' } }],
      })
      const findings = ownershipDerivationResolves().run({ root, config, today: '2026-09-17' })

      assert.equal(findings.length, 3)
    },
  )
})

test('derivação que resolve não gera achado', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/plans/', owner: '@a', derivesFrom: { source: 'docs/specs/', field: 'spec' } }] })

    assert.deepEqual(ownershipDerivationResolves().run({ root, config, today: '2026-09-17' }), [])
  })
})

test('caminho sem derives-from não é examinado', () => {
  withTempRepo({ 'docs/plans/a.md': '---\ntitle: x\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/plans/', owner: '@a' }] })

    assert.deepEqual(ownershipDerivationResolves().run({ root, config, today: '2026-09-17' }), [])
  })
})
