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

test('per-file: a status change in the frontmatter is a transition, with the key being the file', () => {
  assert.deepEqual(findTransitions('---\nstatus: draft\n---\nbody\n', '---\nstatus: accepted\n---\nbody\n', PER_FILE, 'docs/x/a.md'), [
    { key: 'docs/x/a.md', from: 'draft', to: 'accepted' },
  ])
})

test('per-file: editing the body without changing the status is not a transition', () => {
  assert.deepEqual(findTransitions('---\nstatus: draft\n---\nbody\n', '---\nstatus: draft\n---\nother\n', PER_FILE, 'docs/x/a.md'), [])
})

test('per-file: a custom state-field is the field read', () => {
  const custom = rule({ collection: 'per-file', key: null, keyMode: null, stateField: 'situation' })

  assert.equal(findTransitions('---\nsituation: draft\n---\n', '---\nsituation: accepted\n---\n', custom, 'a.md').length, 1)
})

test('table: pairs by key and returns each item that changed', () => {
  const before = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-02 | open |\n'
  const after = '| ID | Status |\n| --- | ------ |\n| DA-02 | resolved |\n| DA-01 | resolved |\n'

  assert.deepEqual(
    findTransitions(before, after, TABLE, 'docs/open.md').map(t => t.key),
    ['DA-02', 'DA-01'],
  )
})

test('a new item is not a transition — there is no before to pair with', () => {
  const before = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n'
  const after = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-02 | resolved |\n'

  assert.deepEqual(findTransitions(before, after, TABLE, 'docs/open.md'), [])
})
