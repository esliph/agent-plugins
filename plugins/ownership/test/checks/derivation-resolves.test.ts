import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipDerivationResolves } from '../../plugin/src/checks/derivation-resolves.ts'
import { forgetTree } from '../../plugin/src/core/files.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('missing field, outside the source and nonexistent target become distinct findings', () => {
  withTempRepo(
    {
      'docs/plans/a.md': '---\ntitle: no spec\n---\n',
      'docs/plans/b.md': '---\nspec: docs/other/x.md\n---\n',
      'docs/plans/c.md': '---\nspec: docs/specs/does-not-exist.md\n---\n',
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

test('derivation that resolves yields no finding', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/plans/', owner: '@a', derivesFrom: { source: 'docs/specs/', field: 'spec' } }] })

    assert.deepEqual(ownershipDerivationResolves().run({ root, config, today: '2026-09-17' }), [])
  })
})

test('path without derives-from is not examined', () => {
  withTempRepo({ 'docs/plans/a.md': '---\ntitle: x\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/plans/', owner: '@a' }] })

    assert.deepEqual(ownershipDerivationResolves().run({ root, config, today: '2026-09-17' }), [])
  })
})
