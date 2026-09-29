import { test } from 'node:test'
import assert from 'node:assert/strict'
import { explainPath } from '../../src/resolve/explain.ts'
import { resolveOwnership } from '../../src/resolve/hierarchy.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('with no rule covering the path, says so and points to where the entry would fit', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    const text = explainPath(resolveOwnership(root)!, 'x.md')

    assert.match(text, /no ownership rule/)
    assert.match(text, /would belong in \.ownership\.yml/)
  })
})

test('the file pointed to is the one with the deepest base that contains the path', () => {
  withTempRepo(
    {
      '.ownership.yml': 'version: 2\ninclude: [packages/api/]\nowned: []\n',
      'packages/api/.ownership.yml': 'version: 2\nowned: []\n',
    },
    root => {
      assert.match(explainPath(resolveOwnership(root)!, 'packages/api/x.md'), /would belong in packages\/api\/\.ownership\.yml/)
    },
  )
})

test('shows the covering rule and the file that declared it', () => {
  withTempRepo(
    {
      '.ownership.yml': 'version: 2\ninclude: [packages/api/]\nowned: []\n',
      'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: ./\n    owner: "@a"\n    skill: other\n',
    },
    root => {
      const text = explainPath(resolveOwnership(root)!, 'packages/api/x.md')

      assert.match(text, /declared in: packages\/api\/\.ownership\.yml/)
      assert.match(text, /owner: @a/)
      assert.match(text, /skill: other/)
      assert.match(text, /states: —/)
    },
  )
})

test('distinguishes "key mode" from "key" in the sections format', () => {
  withTempRepo(
    {
      '.ownership.yml': 'version: 2\ninclude: [packages/docs/]\nowned: []\n',
      'packages/docs/.ownership.yml': 'version: 2\nowned:\n  - path: ./\n    owner: "@owner"\n    format:\n      collection: sections\n',
    },
    root => {
      const text = explainPath(resolveOwnership(root)!, 'packages/docs/x.md')

      assert.match(text, /key mode: first-token/)
      assert.doesNotMatch(text, /\(key: first-token\)/)
    },
  )
})
