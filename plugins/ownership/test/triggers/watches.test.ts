import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coversDoc, pendingDocs, watchesFor } from '../../plugin/src/triggers/watches.ts'
import { buildConfig } from '../helpers/config.ts'

test('watchesFor groups by doc and accumulates the paths that matched', () => {
  const config = buildConfig({
    owned: [{ path: 'docs/requirements/rules.md', owner: '@a', skill: 'requirements-keeper' }],
    watches: [
      { code: 'src/checks/**', doc: 'docs/requirements/rules.md', reason: 'x' },
      { code: 'src/hooks/**', doc: 'docs/requirements/rules.md', reason: null },
    ],
  })

  const matches = watchesFor(config, ['src/checks/a.ts', 'src/hooks/b.ts', 'src/other.ts'])

  assert.equal(matches.length, 1)
  assert.equal(matches[0]?.doc, 'docs/requirements/rules.md')
  assert.deepEqual(matches[0]?.matched, ['src/checks/a.ts', 'src/hooks/b.ts'])
  assert.equal(matches[0]?.reason, 'x')
  assert.equal(matches[0]?.skill, 'requirements-keeper')
  assert.equal(matches[0]?.owner, '@a')
})

test('consumerVisible is true if ANY rule that points to the doc carries the mark', () => {
  const config = buildConfig({
    watches: [
      { code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true },
      { code: 'plugin/**', doc: 'CHANGELOG.md', consumerVisible: false },
    ],
  })

  assert.equal(watchesFor(config, ['src/cli/a.ts', 'plugin/b.md'])[0]?.consumerVisible, true)
})

test('a doc with no declared owned is still an owning doc — skill and owner stay null', () => {
  const config = buildConfig({ watches: [{ code: 'src/**', doc: 'README.md' }] })
  const matches = watchesFor(config, ['src/a.ts'])

  assert.equal(matches[0]?.skill, null)
  assert.equal(matches[0]?.owner, null)
})

test('coversDoc: directory by prefix, file by equality', () => {
  assert.equal(coversDoc('docs/', ['docs/x.md']), true)
  assert.equal(coversDoc('docs/x.md', ['docs/x.md']), true)
  assert.equal(coversDoc('docs/x.md', ['docs/y.md']), false)
})

test('pendingDocs drops what was already touched in the same set of paths', () => {
  const config = buildConfig({ watches: [{ code: 'src/**', doc: 'docs/x.md', reason: 'r' }] })

  assert.equal(pendingDocs(config, ['src/a.ts']).length, 1)
  assert.equal(pendingDocs(config, ['src/a.ts', 'docs/x.md']).length, 0)
})
