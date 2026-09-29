import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipConsumerChangeLogged } from '../../src/checks/consumer-change-logged.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('without consumer-visible watches, no finding even with a big diff', () => {
  const config = buildConfig({})

  assert.deepEqual(
    ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: [] }).run({ root: '/repo', config, today: '2026-09-17' }),
    [],
  )
})

test('diff touches a consumer-visible path and the changelog did not come along: finding', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: [] }).run({ root, config, today: '2026-09-17' })

    assert.equal(findings.length, 1)
  })
})

test('changelog came along but with no item in Unreleased: finding', () => {
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

test('changelog came along with an item in Unreleased: no finding', () => {
  withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n- x\n' }, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })

    assert.deepEqual(
      ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-17' }),
      [],
    )
  })
})

test('each visible doc is only charged for the paths of its own rule', () => {
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

test('Changelog: none — reason releases', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: ['Changelog: none — internal'] }).run({
      root,
      config,
      today: '2026-09-17',
    })

    assert.deepEqual(findings, [])
  })
})

test('item in Unreleased written with * counts as an entry', () => {
  withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n* something new\n' }, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })

    assert.deepEqual(
      ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-28' }),
      [],
    )
  })
})

test('doc declared, in the diff and absent from the repository is a finding, not silence', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-28' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /missing/)
  })
})
