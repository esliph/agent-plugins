// RN-0041: the marketplace and each plugin's minimum governance.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { checkMarketplace } from './check-marketplace.mjs'

function repo(files) {
  const root = mkdtempSync(join(tmpdir(), 'marketplace-'))

  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), typeof content === 'string' ? content : JSON.stringify(content))
  }

  return root
}

function marketplace(plugins) {
  return { name: 'm', owner: { name: 'o' }, plugins }
}

const GOVERNED = {
  'plugins/a/plugin/.claude-plugin/plugin.json': { name: 'a', version: '1.0.0' },
  'plugins/a/README.md': '# a\n',
  'plugins/a/CHANGELOG.md': '# Changelog\n',
  'plugins/a/.ownership.yml': 'version: 2\nowned: []\n',
}

function check(files) {
  const root = repo(files)

  try {
    return checkMarketplace(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('RN-0041: a governed plugin passes', () => {
  assert.deepEqual(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', version: '1.0.0', source: './plugins/a/plugin' }]) }), [])
})

test('RN-0041: an unparsable manifest is reported', () => {
  assert.match(check({ '.claude-plugin/marketplace.json': '{' }).join('\n'), /marketplace\.json/)
  assert.match(
    check({ ...GOVERNED, 'plugins/a/plugin/.claude-plugin/plugin.json': '{', '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './plugins/a/plugin' }]) }).join('\n'),
    /plugin\.json/,
  )
})

test('RN-0041: a missing source, a missing plugin.json and a mismatched name or version are reported by plugin', () => {
  assert.match(check({ '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './plugins/a/plugin' }]) }).join('\n'), /^a: .*does not exist/m)

  const { 'plugins/a/plugin/.claude-plugin/plugin.json': _manifest, ...withoutManifest } = GOVERNED

  assert.match(
    check({ ...withoutManifest, 'plugins/a/plugin/x.md': 'x', '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './plugins/a/plugin' }]) }).join('\n'),
    /^a: .*\.claude-plugin\/plugin\.json is missing/m,
  )
  assert.match(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'b', source: './plugins/a/plugin' }]) }).join('\n'), /^b: .*name "a"/m)
  assert.match(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', version: '2.0.0', source: './plugins/a/plugin' }]) }).join('\n'), /^a: .*version/m)
})

test('RN-0041: each missing governance file of the project is reported', () => {
  const { 'plugins/a/CHANGELOG.md': _changelog, ...withoutChangelog } = GOVERNED

  assert.deepEqual(check({ ...withoutChangelog, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './plugins/a/plugin' }]) }), [
    'a: plugins/a/CHANGELOG.md is missing.',
  ])
})

test('RN-0041: a source outside the repository, or the repository root itself, is reported', () => {
  assert.match(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: '../elsewhere' }]) }).join('\n'), /^a: .*outside the repository/m)
  assert.match(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './' }]) }).join('\n'), /^a: .*is the repository root/m)
})
