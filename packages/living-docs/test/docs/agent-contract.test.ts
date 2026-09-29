import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
const CONTRACT = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')

test('RN-0010: the agent contract points to the owning artifacts', () => {
  const targets = [
    'docs/superpowers/research/2026-08-24-living-documentation-toolkit.md',
    '.ownership.yml',
    'CONTRIBUTING.md',
    'docs/definition-of-done.md',
    'docs/requirements/',
    'docs/glossary.md',
    'docs/charter/',
  ]

  for (const target of targets) {
    assert.ok(CONTRACT.includes(target), `the contract should point to ${target}`)
  }
})

test('RN-0010: the contract copies no requirement statement', () => {
  const titles = ['rules.md', 'functional.md', 'non-functional.md'].flatMap(file =>
    [...readFileSync(join(ROOT, 'docs/requirements', file), 'utf8').matchAll(/^## (R[NF]F?-\d{4} — .+)$/gm)].map(match => match[1] ?? ''),
  )

  assert.ok(titles.length >= 11, `expected the requirements of Phases 0 to 3, found ${titles.length}`)
  for (const title of titles) {
    assert.equal(CONTRACT.includes(title), false, `the contract copies the requirement "${title}"`)
  }
})

test('RN-0010: the contract is an index, not a manual — it fits on one screen', () => {
  const lines = CONTRACT.split('\n').length

  assert.ok(lines <= 60, `contract with ${lines} lines: an index that does not fit on one screen becomes a manual`)
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
