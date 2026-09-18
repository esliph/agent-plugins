import { test } from 'node:test'
import assert from 'node:assert/strict'
import { locateRootFile } from '../../src/resolve/candidates.ts'
import { OwnershipError } from '../../src/schema/types.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('sem candidato nenhum, devolve null (silêncio)', () => {
  withTempRepo({}, root => {
    assert.equal(locateRootFile(root), null)
  })
})

test('acha ./.ownership.yml', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(locateRootFile(root), '.ownership.yml')
  })
})

test('acha ./docs/.ownership.yml quando o primeiro não existe', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(locateRootFile(root), 'docs/.ownership.yml')
  })
})

test('os dois candidatos presentes é erro que nomeia os dois', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'docs/.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.throws(() => locateRootFile(root), (err: unknown) => {
      assert.ok(err instanceof OwnershipError)
      assert.match(err.message, /\.ownership\.yml/)
      assert.match(err.message, /docs\/\.ownership\.yml/)

      return true
    })
  })
})

test('--ownership explícito ganha de tudo, mesmo sem existir nos candidatos padrão', () => {
  withTempRepo({ 'custom/o.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(locateRootFile(root, { explicitPath: 'custom/o.yml' }), 'custom/o.yml')
  })
})

test('--ownership explícito que não existe é erro', () => {
  withTempRepo({}, root => {
    assert.throws(() => locateRootFile(root, { explicitPath: 'nope.yml' }), OwnershipError)
  })
})

test('variável de ambiente OWNERSHIP_CONFIG tem a mesma prioridade que o explícito', () => {
  withTempRepo({ 'custom/o.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(locateRootFile(root, { env: { OWNERSHIP_CONFIG: 'custom/o.yml' } }), 'custom/o.yml')
  })
})
