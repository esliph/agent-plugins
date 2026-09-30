import { test } from 'node:test'
import assert from 'node:assert/strict'
import { derivedFilesOf, instancesOf, problemsFor } from '../../plugin/src/triggers/derives.ts'
import { forgetTree } from '../../plugin/src/core/files.ts'
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

test('instancesOf reads the declared field from the frontmatter of each file under the path', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    const [instance] = instancesOf(root, RULE)

    assert.equal(instance?.file, 'docs/plans/a.md')
    assert.equal(instance?.field, 'docs/specs/s1.md')
  })
})

test('problemsFor: missing field is a finding', () => {
  withTempRepo({ 'docs/plans/a.md': '---\ntitle: no spec\n---\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['missing-field'])
  })
})

test('problemsFor: field outside source is a finding', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/other-thing/x.md\n---\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['outside-source'])
  })
})

test('problemsFor: prefix check respects directory boundary (source without trailing slash)', () => {
  const ruleWithoutTrailingSlash = {
    ...RULE,
    derivesFrom: { source: 'docs/specs', field: 'spec' },
  }
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs-legacy/x.md\n---\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, ruleWithoutTrailingSlash).map(p => p.reason), ['outside-source'])
  })
})

test('problemsFor: target that does not exist is a finding', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/does-not-exist.md\n---\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['missing-target'])
  })
})

test('problemsFor: correct field is not a finding', () => {
  withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    assert.deepEqual(problemsFor(root, RULE), [])
  })
})

test('derivedFilesOf finds only the files that point to the exact edited target', () => {
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
