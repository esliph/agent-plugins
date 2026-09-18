import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findTransitions } from '../../src/lifecycle/transitions.ts'
import type { ResolvedOwnedRule } from '../../src/resolve/hierarchy.ts'

function rule(format: ResolvedOwnedRule['format']): ResolvedOwnedRule {
  return {
    path: 'docs/x/',
    owner: '@a',
    skill: null,
    states: ['draft', 'accepted', 'open', 'resolved'],
    format,
    derivesFrom: null,
    pluginBlocks: {},
    origin: 'o',
  }
}

const PER_FILE = rule({ collection: 'per-file', key: null, keyMode: null, stateField: 'status' })
const TABLE = rule({ collection: 'table', key: 'ID', keyMode: null, stateField: 'status' })

test('per-file: mudança de status no frontmatter é transição, com a chave sendo o arquivo', () => {
  assert.deepEqual(findTransitions('---\nstatus: draft\n---\ncorpo\n', '---\nstatus: accepted\n---\ncorpo\n', PER_FILE, 'docs/x/a.md'), [
    { key: 'docs/x/a.md', from: 'draft', to: 'accepted' },
  ])
})

test('per-file: editar o corpo sem mudar o status não é transição', () => {
  assert.deepEqual(findTransitions('---\nstatus: draft\n---\ncorpo\n', '---\nstatus: draft\n---\noutro\n', PER_FILE, 'docs/x/a.md'), [])
})

test('per-file: state-field customizado é o campo lido', () => {
  const custom = rule({ collection: 'per-file', key: null, keyMode: null, stateField: 'situação' })

  assert.equal(findTransitions('---\nsituação: draft\n---\n', '---\nsituação: accepted\n---\n', custom, 'a.md').length, 1)
})

test('table: pareia pela chave e devolve cada item que mudou', () => {
  const before = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-02 | open |\n'
  const after = '| ID | Status |\n| --- | ------ |\n| DA-02 | resolved |\n| DA-01 | resolved |\n'

  assert.deepEqual(
    findTransitions(before, after, TABLE, 'docs/open.md').map(t => t.key),
    ['DA-02', 'DA-01'],
  )
})

test('item novo não é transição — não há antes com que parear', () => {
  const before = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n'
  const after = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-02 | resolved |\n'

  assert.deepEqual(findTransitions(before, after, TABLE, 'docs/open.md'), [])
})
