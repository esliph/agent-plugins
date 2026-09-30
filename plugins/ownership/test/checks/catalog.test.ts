import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CORE_CHECK_CATALOG } from '../../plugin/src/checks/catalog.ts'
import { coreChecks, diffChecks } from '../../plugin/src/checks/registry.ts'

const NO_DIFF = { base: '', changed: [], messages: [] }

test('the catalog covers exactly the registered checks, with id, name and command', () => {
  const tree = coreChecks(() => '').map(check => `${check.id}|${check.name}|ownership validate`)
  const diff = diffChecks(NO_DIFF).map(check => `${check.id}|${check.name}|ownership validate --base <ref>`)
  const catalog = CORE_CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}|${entry.command}`)

  assert.deepEqual(catalog.sort(), [...tree, ...diff].sort())
  for (const entry of CORE_CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} must say when it fails`)
  }
})
