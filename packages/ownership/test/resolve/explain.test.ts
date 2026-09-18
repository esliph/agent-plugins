import { test } from 'node:test'
import assert from 'node:assert/strict'
import { explainPath } from '../../src/resolve/explain.ts'
import { resolveOwnership } from '../../src/resolve/hierarchy.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('sem regra cobrindo o caminho, diz isso e aponta onde a entrada caberia', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    const text = explainPath(resolveOwnership(root)!, 'x.md')

    assert.match(text, /nenhuma regra/)
    assert.match(text, /caberia em \.ownership\.yml/)
  })
})

test('o arquivo apontado é o de base mais profunda que contém o caminho', () => {
  withTempRepo(
    {
      '.ownership.yml': 'version: 2\ninclude: [packages/api/]\nowned: []\n',
      'packages/api/.ownership.yml': 'version: 2\nowned: []\n',
    },
    root => {
      assert.match(explainPath(resolveOwnership(root)!, 'packages/api/x.md'), /caberia em packages\/api\/\.ownership\.yml/)
    },
  )
})

test('mostra a regra que cobre e o arquivo que a declarou', () => {
  withTempRepo(
    {
      '.ownership.yml': 'version: 2\ninclude: [packages/api/]\nowned: []\n',
      'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: ./\n    owner: "@a"\n    skill: outro\n',
    },
    root => {
      const text = explainPath(resolveOwnership(root)!, 'packages/api/x.md')

      assert.match(text, /declarado em: packages\/api\/\.ownership\.yml/)
      assert.match(text, /owner: @a/)
      assert.match(text, /skill: outro/)
      assert.match(text, /states: —/)
    },
  )
})
