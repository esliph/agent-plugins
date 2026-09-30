import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SettingsError, mergeSettings } from '../../plugin/src/config/claude-settings.ts'

test('RF-0013: without settings, the registration is born with the marketplace and the plugin', () => {
  const { text, added } = mergeSettings(null, 'team/living-docs')
  const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>

  assert.deepEqual(parsed.extraKnownMarketplaces?.['living-docs'], {
    source: { source: 'github', repo: 'team/living-docs' },
  })
  assert.equal(parsed.enabledPlugins?.['living-docs@living-docs'], true)
  assert.equal(parsed.enabledPlugins?.['ownership@living-docs'], true)
  assert.equal(added.length, 3)
  assert.ok(text.endsWith('\n'))
})

test('RF-0013: what the consumer already had is still there', () => {
  const mine = JSON.stringify(
    {
      hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: './my-hook.sh' }] }] },
      enabledPlugins: { 'other@store': true },
    },
    null,
    2,
  )

  const { text } = mergeSettings(mine, 'team/living-docs')
  const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>

  assert.ok(parsed.hooks, 'no consumer hook is lost')
  assert.equal(parsed.enabledPlugins?.['other@store'], true)
  assert.equal(parsed.enabledPlugins?.['living-docs@living-docs'], true)
})

test('RF-0013: merging twice neither duplicates nor changes a byte', () => {
  const first = mergeSettings(null, 'team/living-docs')
  const second = mergeSettings(first.text, 'team/living-docs')

  assert.equal(second.text, first.text)
  assert.deepEqual(second.added, [])
})

test('RF-0013: an entry the consumer wrote by hand is not rewritten', () => {
  const mine = JSON.stringify({ extraKnownMarketplaces: { 'living-docs': { source: { source: 'git', url: 'file:///opt/toolkit' } } } }, null, 2)

  const { text, added } = mergeSettings(mine, 'team/living-docs')
  const parsed = JSON.parse(text) as Record<string, Record<string, Record<string, unknown>>>

  assert.deepEqual(parsed.extraKnownMarketplaces?.['living-docs']?.source, {
    source: 'git',
    url: 'file:///opt/toolkit',
  })
  assert.deepEqual(added, ['enabledPlugins["living-docs@living-docs"]', 'enabledPlugins["ownership@living-docs"]'])
})

test('RF-0013: unreadable settings is an error, never overwritten', () => {
  assert.throws(() => mergeSettings('{ this is not json', 'team/living-docs'), SettingsError)
})
