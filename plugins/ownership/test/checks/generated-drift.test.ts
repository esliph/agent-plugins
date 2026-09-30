import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipGeneratedDrift } from '../../plugin/src/checks/generated-drift.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('no generated declared, no finding', () => {
  withTempRepo({}, root => {
    const findings = ownershipGeneratedDrift(() => '').run({ root, config: buildConfig({}), today: '2026-09-17' })

    assert.deepEqual(findings, [])
  })
})

test('missing artifact is a finding', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
    const findings = ownershipGeneratedDrift(() => 'x').run({ root, config, today: '2026-09-17' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /missing/)
  })
})

test('divergence between the generator and the file is a finding, with the right line', () => {
  withTempRepo({ 'out.md': 'a\nb\nc\n' }, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
    const findings = ownershipGeneratedDrift(() => 'a\nX\nc\n').run({ root, config, today: '2026-09-17' })

    assert.equal(findings[0]?.line, 2)
  })
})

test('generator that fails is a finding, without hanging the check', () => {
  withTempRepo({ 'out.md': 'x' }, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
    const findings = ownershipGeneratedDrift(() => {
      throw new Error('boom')
    }).run({ root, config, today: '2026-09-17' })

    assert.match(findings[0]!.message, /failed/)
  })
})

test('equal, no finding', () => {
  withTempRepo({ 'out.md': 'a\nb\n' }, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })

    assert.deepEqual(ownershipGeneratedDrift(() => 'a\nb\n').run({ root, config, today: '2026-09-17' }), [])
  })
})

test('checkout CR and an extra trailing break are not drift', () => {
  withTempRepo({ 'out.md': 'a\r\nb\r\n\n\n' }, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })

    assert.deepEqual(ownershipGeneratedDrift(() => 'a\nb\n').run({ root, config, today: '2026-09-28' }), [])
  })
})
