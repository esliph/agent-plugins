import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coreChecks, diffChecks } from '../../src/checks/registry.ts'

test('coreChecks devolve os quatro checks que não dependem de diff', () => {
  const ids = coreChecks(() => '').map(check => check.id)

  assert.deepEqual(ids.sort(), ['ownership/declared-state', 'ownership/derivation-resolves', 'ownership/generated-drift', 'ownership/owner-coverage'].sort())
})

test('diffChecks devolve os dois que dependem de diff', () => {
  const ids = diffChecks({ base: 'main', changed: [], messages: [] }).map(check => check.id)

  assert.deepEqual(ids.sort(), ['ownership/consumer-change-logged', 'ownership/watch-satisfied'].sort())
})
