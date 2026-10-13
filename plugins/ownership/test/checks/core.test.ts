import { test } from 'node:test'
import assert from 'node:assert/strict'

import { coreCheckCatalog, coreChecks } from '../../plugin/src/checks/core.ts'

test('the public catalog lists the core checks with their command', () => {
  assert.deepEqual(
    coreCheckCatalog.map(entry => [entry.id, entry.command]),
    [
      ['ownership/owner-coverage', 'ownership validate --check ownership/owner-coverage'],
      ['ownership/codeowners-match', 'ownership validate --check ownership/codeowners-match'],
    ],
  )
  assert.deepEqual(
    coreChecks.map(check => check.id),
    coreCheckCatalog.map(entry => entry.id),
  )
  assert.ok(coreCheckCatalog.every(entry => entry.name !== '' && entry.failsWhen !== ''))
})
