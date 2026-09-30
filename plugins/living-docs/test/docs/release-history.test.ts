import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import { loadCodeowners, ownersOf } from '@esliph/ownership'
import { loadLivingDocsConfig } from '../../plugin/src/config/ownership.ts'
import { checkoutRoot, projectRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
const config = loadLivingDocsConfig(ROOT)

/** The items of `## [Unreleased]` — the same criterion as the core check, which does not export it. */
function unreleasedEntries(source: string): string[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(line => /^##\s+\[?unreleased\]?/i.test(line.trim()))

  if (start === -1) {
    return []
  }

  const entries: string[] = []

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? ''

    if (/^##\s/.test(line)) {
      break
    }
    if (/^\s*[-*]\s+\S/.test(line)) {
      entries.push(line.trim())
    }
  }

  return entries
}

test('RN-0013: this repository declares what is visible to the consumer', () => {
  const codes = config.watches.filter(watch => watch.consumerVisible).map(watch => watch.code)

  assert.ok(codes.length > 0, 'no watches rule marked consumer-visible: the CHANGELOG enforcer would be installed and inert')
  assert.ok(codes.includes('plugins/living-docs/bin/**'))
  assert.ok(codes.includes('plugins/living-docs/plugin/src/cli/**'))

  // The package is the plugin, but only the plugin surface is public: the list is
  // explicit, and a wildcard over the whole package would pull in src/ and test/.
  const isVisible = picomatch(codes)

  for (const path of [
    'plugins/living-docs/plugin/.claude-plugin/plugin.json',
    'plugins/living-docs/plugin/hooks/run-hook.sh',
    'plugins/living-docs/plugin/commands/adr.md',
    'plugins/living-docs/plugin/skills/decision-recorder/SKILL.md',
    'plugins/living-docs/plugin/agents/decision-adversary.md',
    'plugins/living-docs/plugin/templates/adr.md',
    'plugins/living-docs/plugin/src/cli/index.ts',
  ]) {
    assert.ok(isVisible(path), `${path} should be visible to the consumer`)
  }
  for (const path of ['plugins/living-docs/plugin/src/core/roots.ts', 'plugins/living-docs/test/smoke.test.ts', 'plugins/living-docs/package.json', 'plugins/living-docs/plugin/package.json']) {
    assert.equal(isVisible(path), false, `${path} is not public surface`)
  }
})

test('ADR-0006: some watches rule says where the entry should be', () => {
  const targets = [...new Set(config.watches.filter(watch => watch.consumerVisible).map(watch => watch.doc))].sort()

  // One CHANGELOG per project: each plugin answers to its own consumers.
  assert.deepEqual(targets, ['CHANGELOG.md', 'plugins/living-docs/CHANGELOG.md', 'plugins/ownership/CHANGELOG.md'])
})

test('RN-0013: the CHANGELOG is consumer-facing — Keep a Changelog, no frontmatter', () => {
  const source = readFileSync(join(projectRoot(), 'CHANGELOG.md'), 'utf8')

  assert.doesNotMatch(source, /^---$/m, 'living-documentation frontmatter does not belong in the CHANGELOG')
  assert.match(source, /^## \[Unreleased\]$/m)
  assert.ok(unreleasedEntries(source).length > 0, 'Phase 6 changes the public contract: Unreleased cannot be empty')
})

test('RN-0015: the deprecations table demands the four things', () => {
  const source = readFileSync(join(projectRoot(), 'docs/deprecations.md'), 'utf8')
  const header = source.split('\n').find(line => line.trim().startsWith('| What |'))

  assert.ok(header, 'docs/deprecations.md without the table')
  for (const column of ['Announced on', 'Removed in', 'Replacement', 'Migration guide']) {
    assert.ok(header.includes(column), `the table needs the column "${column}"`)
  }
})

test('RN-0001: the historical trail has an owner in CODEOWNERS, like every artifact', () => {
  const codeowners = loadCodeowners(ROOT)!

  for (const path of [
    'CHANGELOG.md',
    'plugins/living-docs/CHANGELOG.md',
    'plugins/living-docs/docs/deprecations.md',
    'plugins/living-docs/docs/releases/x.md',
    'plugins/living-docs/docs/migrations/x.md',
  ]) {
    assert.ok(ownersOf(codeowners, path), `${path} without an owner`)
  }
})

test('REL is declared, so that living-docs/append-only freezes a published release note', () => {
  const rel = config.artifacts.find(artifact => artifact.idPrefix === 'REL')

  assert.ok(rel)
  assert.equal(rel?.appendOnly, true)
  assert.equal(rel?.skill, 'release-historian')
})

test('RN-0030: this repository marks as external what it writes for outside readers', () => {
  for (const path of ['README.md', 'CHANGELOG.md', 'plugins/living-docs/CHANGELOG.md', 'plugins/living-docs/README.md', 'plugins/living-docs/docs/deprecations.md', 'plugins/living-docs/docs/migrations/']) {
    assert.equal(config.documents.find(document => document.path === path)?.audience, 'external', `${path} should be marked`)
  }
  assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')

  // docs/contracts/ stays out: it cites its own sources, and marking it is a decision of its own.
  for (const path of ['plugins/living-docs/docs/contracts/errors.md', 'plugins/living-docs/docs/contracts/versioning-policy.md']) {
    assert.equal(config.documents.find(document => document.path === path)?.audience, 'internal', `${path} is not marked by this delivery`)
  }
})
