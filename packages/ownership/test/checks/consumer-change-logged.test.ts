import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipConsumerChangeLogged } from '../../src/checks/consumer-change-logged.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('sem watches consumer-visible, nenhum achado mesmo com diff grande', () => {
  const config = buildConfig({})

  assert.deepEqual(
    ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: [] }).run({ root: '/repo', config, today: '2026-09-17' }),
    [],
  )
})

test('diff toca caminho consumer-visible e o changelog não veio junto: achado', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: [] }).run({ root, config, today: '2026-09-17' })

    assert.equal(findings.length, 1)
  })
})

test('changelog veio junto mas sem item em Unreleased: achado', () => {
  withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n' }, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({
      root,
      config,
      today: '2026-09-17',
    })

    assert.equal(findings.length, 1)
  })
})

test('changelog veio junto com item em Unreleased: sem achado', () => {
  withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n- x\n' }, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })

    assert.deepEqual(
      ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-17' }),
      [],
    )
  })
})

test('cada doc visível só é cobrado pelos caminhos da própria regra', () => {
  withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n- x\n' }, root => {
    const config = buildConfig({
      watches: [
        { code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true },
        { code: 'plugin/**', doc: 'docs/plugin-changes.md', consumerVisible: true },
      ],
    })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({
      root,
      config,
      today: '2026-09-17',
    })

    assert.deepEqual(findings, [])
  })
})

test('Changelog: none — razão libera', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: ['Changelog: none — interno'] }).run({
      root,
      config,
      today: '2026-09-17',
    })

    assert.deepEqual(findings, [])
  })
})

test('item em Unreleased escrito com * conta como entrada', () => {
  withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n* algo novo\n' }, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })

    assert.deepEqual(
      ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-28' }),
      [],
    )
  })
})

test('doc declarado, no diff e ausente do repositório é achado, não silêncio', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-28' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /ausente/)
  })
})
