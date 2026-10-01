import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadLivingDocsConfig } from '../../plugin/src/config/ownership.ts'
import { toolkitRoot } from '../../plugin/src/core/roots.ts'
import { checkoutRoot, projectRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
const CONTRACT = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')
const PLUGIN_CONTRACT = readFileSync(join(projectRoot(), 'CLAUDE.md'), 'utf8')

test('RN-0010: the root agent contract points to the owning artifacts of the whole repository', () => {
  for (const target of ['.ownership.yml', 'CONTRIBUTING.md', 'docs/definition-of-done.md', 'docs/requirements/', 'plugins/<name>/CLAUDE.md']) {
    assert.ok(CONTRACT.includes(target), `the root contract should point to ${target}`)
  }
  assert.doesNotMatch(CONTRACT, /npm (ci|test)|node --conditions/, 'the root contract names no toolchain (ADR-0036)')
})

test('RN-0010: the living-docs contract points to its spec, vocabulary, principles and toolchain', () => {
  for (const target of [
    'docs/superpowers/research/2026-08-24-living-documentation-toolkit.md',
    'docs/glossary.md',
    'docs/charter/',
    'docs/requirements/',
    'Spurfile',
  ]) {
    assert.ok(PLUGIN_CONTRACT.includes(target), `the living-docs contract should point to ${target}`)
  }
})

test('RN-0010: the contract copies no requirement statement', () => {
  const config = loadLivingDocsConfig(ROOT)
  const files = config.artifacts.filter(rule => ['RF', 'RNF', 'RN'].includes(rule.idPrefix)).map(rule => rule.path)
  const titles = files.flatMap(file => [...readFileSync(join(ROOT, file), 'utf8').matchAll(/^## (R[NF]F?-\d{4} — .+)$/gm)].map(match => match[1] ?? ''))

  assert.ok(titles.length >= 11, `expected the requirements of Phases 0 to 3, found ${titles.length}`)
  for (const [name, contract] of [
    ['CLAUDE.md', CONTRACT],
    ['plugins/living-docs/CLAUDE.md', PLUGIN_CONTRACT],
  ] as const) {
    for (const title of titles) {
      assert.equal(contract.includes(title), false, `${name} copies the requirement "${title}"`)
    }
  }
})

test('RN-0010: the contract is an index, not a manual — it fits on one screen', () => {
  for (const [name, contract] of [
    ['CLAUDE.md', CONTRACT],
    ['plugins/living-docs/CLAUDE.md', PLUGIN_CONTRACT],
  ] as const) {
    const lines = contract.split('\n').length

    assert.ok(lines <= 60, `${name} with ${lines} lines: an index that does not fit on one screen becomes a manual`)
  }
})

test('the Definition of Done names the verification of each item', () => {
  const dod = readFileSync(join(ROOT, 'docs/definition-of-done.md'), 'utf8')
  const items = dod.split('\n').filter(line => line.trim().startsWith('- [ ]'))

  assert.ok(items.length >= 6, `DoD with only ${items.length} items`)
  for (const item of items) {
    assert.match(item, /\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|human/i, `item without a named verification — ${item}`)
  }
})

test('RN-0030: the agent contract and its template say that outward-facing text carries no ID, and who enforces it', () => {
  const template = readFileSync(join(toolkitRoot(), 'templates/agent-contract.md'), 'utf8')

  for (const [name, source] of [
    ['CLAUDE.md', CONTRACT],
    ['templates/agent-contract.md', template],
  ] as const) {
    assert.match(source, /readers on the outside/, `${name} without the reader-boundary policy`)
    assert.match(source, /living-docs\/external-audience/, `${name} without naming who enforces it`)
  }
})
