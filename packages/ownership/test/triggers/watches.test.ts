import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coversDoc, pendingDocs, watchesFor } from '../../src/triggers/watches.ts'
import { buildConfig } from '../helpers/config.ts'

test('watchesFor agrupa por doc e acumula os caminhos que bateram', () => {
  const config = buildConfig({
    owned: [{ path: 'docs/requirements/rules.md', owner: '@a', skill: 'requirements-keeper' }],
    watches: [
      { code: 'src/checks/**', doc: 'docs/requirements/rules.md', reason: 'x' },
      { code: 'src/hooks/**', doc: 'docs/requirements/rules.md', reason: null },
    ],
  })

  const matches = watchesFor(config, ['src/checks/a.ts', 'src/hooks/b.ts', 'src/outro.ts'])

  assert.equal(matches.length, 1)
  assert.equal(matches[0]?.doc, 'docs/requirements/rules.md')
  assert.deepEqual(matches[0]?.matched, ['src/checks/a.ts', 'src/hooks/b.ts'])
  assert.equal(matches[0]?.reason, 'x')
  assert.equal(matches[0]?.skill, 'requirements-keeper')
  assert.equal(matches[0]?.owner, '@a')
})

test('consumerVisible é true se QUALQUER regra que aponta pro doc trouxer a marca', () => {
  const config = buildConfig({
    watches: [
      { code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true },
      { code: 'plugin/**', doc: 'CHANGELOG.md', consumerVisible: false },
    ],
  })

  assert.equal(watchesFor(config, ['src/cli/a.ts', 'plugin/b.md'])[0]?.consumerVisible, true)
})

test('doc sem owned declarado ainda é doc dono — skill e owner ficam null', () => {
  const config = buildConfig({ watches: [{ code: 'src/**', doc: 'README.md' }] })
  const matches = watchesFor(config, ['src/a.ts'])

  assert.equal(matches[0]?.skill, null)
  assert.equal(matches[0]?.owner, null)
})

test('coversDoc: diretório por prefixo, arquivo por igualdade', () => {
  assert.equal(coversDoc('docs/', ['docs/x.md']), true)
  assert.equal(coversDoc('docs/x.md', ['docs/x.md']), true)
  assert.equal(coversDoc('docs/x.md', ['docs/y.md']), false)
})

test('pendingDocs tira o que já foi tocado no mesmo conjunto de caminhos', () => {
  const config = buildConfig({ watches: [{ code: 'src/**', doc: 'docs/x.md', reason: 'r' }] })

  assert.equal(pendingDocs(config, ['src/a.ts']).length, 1)
  assert.equal(pendingDocs(config, ['src/a.ts', 'docs/x.md']).length, 0)
})
