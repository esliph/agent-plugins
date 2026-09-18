import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipGeneratedDrift } from '../../src/checks/generated-drift.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('sem generated declarado, nenhum achado', () => {
  withTempRepo({}, root => {
    const findings = ownershipGeneratedDrift(() => '').run({ root, config: buildConfig({}), today: '2026-09-17' })

    assert.deepEqual(findings, [])
  })
})

test('artefato ausente é achado', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
    const findings = ownershipGeneratedDrift(() => 'x').run({ root, config, today: '2026-09-17' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /ausente/)
  })
})

test('divergência entre o gerador e o arquivo é achado, com a linha certa', () => {
  withTempRepo({ 'out.md': 'a\nb\nc\n' }, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
    const findings = ownershipGeneratedDrift(() => 'a\nX\nc\n').run({ root, config, today: '2026-09-17' })

    assert.equal(findings[0]?.line, 2)
  })
})

test('gerador que falha é achado, sem travar o check', () => {
  withTempRepo({ 'out.md': 'x' }, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
    const findings = ownershipGeneratedDrift(() => {
      throw new Error('boom')
    }).run({ root, config, today: '2026-09-17' })

    assert.match(findings[0]!.message, /falhou/)
  })
})

test('igual, sem achado', () => {
  withTempRepo({ 'out.md': 'a\nb\n' }, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })

    assert.deepEqual(ownershipGeneratedDrift(() => 'a\nb\n').run({ root, config, today: '2026-09-17' }), [])
  })
})
