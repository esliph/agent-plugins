import { test } from 'node:test'
import assert from 'node:assert/strict'
import { derivedFilesOf, instancesOf, problemsFor } from '../../src/triggers/derives.ts'
import { forgetTree } from '../../src/core/files.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const RULE = {
  path: 'docs/plans/',
  owner: '@a',
  skill: null,
  states: null,
  format: { collection: 'per-file' as const, key: null, keyMode: null, stateField: 'status' },
  derivesFrom: { source: 'docs/specs/', field: 'spec' },
  pluginBlocks: {},
  origin: 'x',
}

test('instancesOf lê o campo declarado do frontmatter de cada arquivo sob o path', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    const [instance] = instancesOf(root, RULE)

    assert.equal(instance?.file, 'docs/plans/a.md')
    assert.equal(instance?.field, 'docs/specs/s1.md')
  })
})

test('problemsFor: campo ausente é achado', () => {
  withTempRepo({ 'docs/plans/a.md': '---\ntitle: sem spec\n---\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['campo-ausente'])
  })
})

test('problemsFor: campo fora de source é achado', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/outra-coisa/x.md\n---\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['fora-da-fonte'])
  })
})

test('problemsFor: prefix check respects directory boundary (source sem trailing slash)', () => {
  const ruleWithoutTrailingSlash = {
    ...RULE,
    derivesFrom: { source: 'docs/specs', field: 'spec' },
  }
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs-legacy/x.md\n---\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, ruleWithoutTrailingSlash).map(p => p.reason), ['fora-da-fonte'])
  })
})

test('problemsFor: alvo que não existe é achado', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/nao-existe.md\n---\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['alvo-inexistente'])
  })
})

test('problemsFor: campo correto não é achado', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, RULE), [])
  })
})

test('derivedFilesOf acha só os arquivos que apontam para o alvo exato editado', () => {
  withTempRepo(
    {
      'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n',
      'docs/plans/b.md': '---\nspec: docs/specs/s2.md\n---\n',
      'docs/specs/s1.md': '# s1\n',
      'docs/specs/s2.md': '# s2\n',
    },
    root => {
      forgetTree(root)
      assert.deepEqual(derivedFilesOf(root, RULE, 'docs/specs/s1.md'), ['docs/plans/a.md'])
    },
  )
})
