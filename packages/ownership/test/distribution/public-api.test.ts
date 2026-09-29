import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../../src/index.ts'

test('the public API exposes what living-docs imports', () => {
  for (const name of [
    'resolveOwnership',
    'findOwnedRule',
    'findTransitions',
    'coreChecks',
    'diffChecks',
    'OwnershipError',
    'parseItemsTable',
    'parseItemsSections',
    'normalizeFieldKey',
    'isEmptyValue',
    'parseCodeowners',
    'loadCodeowners',
    'ownersOf',
    'CORE_CHECK_CATALOG',
  ]) {
    assert.ok(name in api, `${name} should be exported`)
  }
})
