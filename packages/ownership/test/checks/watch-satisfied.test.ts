import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipWatchSatisfied } from '../../src/checks/watch-satisfied.ts'
import { buildConfig } from '../helpers/config.ts'

const config = buildConfig({ watches: [{ code: 'src/checks/**', doc: 'docs/requirements/rules.md', reason: 'x' }] })

test('diff touches the watched code without the owning doc: finding', () => {
  const diff = { base: 'main', changed: ['src/checks/a.ts'], messages: [] }
  const findings = ownershipWatchSatisfied(diff).run({ root: '/repo', config, today: '2026-09-17' })

  assert.equal(findings.length, 1)
  assert.match(findings[0]!.message, /rules\.md/)
})

test('diff brings both: no finding', () => {
  const diff = { base: 'main', changed: ['src/checks/a.ts', 'docs/requirements/rules.md'], messages: [] }

  assert.deepEqual(ownershipWatchSatisfied(diff).run({ root: '/repo', config, today: '2026-09-17' }), [])
})

test('Docs: none — reason in the commit message releases', () => {
  const diff = { base: 'main', changed: ['src/checks/a.ts'], messages: ['fix: x', 'Docs: none — affects nothing'] }

  assert.deepEqual(ownershipWatchSatisfied(diff).run({ root: '/repo', config, today: '2026-09-17' }), [])
})
