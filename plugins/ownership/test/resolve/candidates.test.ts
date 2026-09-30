import { test } from 'node:test'
import assert from 'node:assert/strict'
import { locateRootFile } from '../../plugin/src/resolve/candidates.ts'
import { OwnershipError } from '../../plugin/src/schema/types.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('with no candidate at all, returns null (silence)', () => {
  withTempRepo({}, root => {
    assert.equal(locateRootFile(root), null)
  })
})

test('finds ./.ownership.yml', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(locateRootFile(root), '.ownership.yml')
  })
})

test('finds ./docs/.ownership.yml when the first does not exist', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(locateRootFile(root), 'docs/.ownership.yml')
  })
})

test('both candidates present is an error that names both', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'docs/.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.throws(() => locateRootFile(root), (err: unknown) => {
      assert.ok(err instanceof OwnershipError)
      assert.match(err.message, /\.ownership\.yml/)
      assert.match(err.message, /docs\/\.ownership\.yml/)

      return true
    })
  })
})

test('explicit --ownership beats everything, even when not among the default candidates', () => {
  withTempRepo({ 'custom/o.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(locateRootFile(root, { explicitPath: 'custom/o.yml' }), 'custom/o.yml')
  })
})

test('explicit --ownership that does not exist is an error', () => {
  withTempRepo({}, root => {
    assert.throws(() => locateRootFile(root, { explicitPath: 'nope.yml' }), OwnershipError)
  })
})

test('the OWNERSHIP_CONFIG environment variable has the same priority as the explicit one', () => {
  withTempRepo({ 'custom/o.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(locateRootFile(root, { env: { OWNERSHIP_CONFIG: 'custom/o.yml' } }), 'custom/o.yml')
  })
})
