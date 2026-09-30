import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadCodeowners, ownersOf } from '@esliph/ownership'
import { checkoutRoot, projectRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()

/**
 * Rows of a markdown table, without the header or the separator. Finds the table
 * by its first column, tolerating the padding alignment a formatter adds
 * (`| Code | ` becomes `| Code            | `); the `^` ties it to a real
 * table line.
 */
function rows(source: string, column: string): string[][] {
  const match = source.match(new RegExp(`^\\|\\s*${column}\\s*\\|`, 'm'))

  assert.ok(match, `table not found — expected the header | ${column} |`)

  return source
    .slice(match.index)
    .split('\n')
    .filter(line => line.trim().startsWith('|'))
    .slice(2)
    .map(line =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cell => cell.trim()),
    )
}

const errors = (): string => readFileSync(join(projectRoot(), 'docs/contracts/errors.md'), 'utf8')

test('the error catalog lists real codes, each with a meaning, trigger and status', () => {
  const entries = rows(errors(), 'Code')

  assert.ok(entries.length >= 4, `expected at least 4 codes, found ${entries.length}`)

  const codes = entries.map(row => row[0])

  assert.equal(new Set(codes).size, codes.length, 'duplicate code — one code, one meaning')

  for (const row of entries) {
    assert.notEqual(row[1] ?? '', '', `code "${row[0]}" without a meaning`)
    assert.notEqual(row[2] ?? '', '', `code "${row[0]}" without "when it occurs"`)
    const status = row[row.length - 1] ?? ''

    assert.match(status, /^(active|deprecated|removed)/, `status "${status}" outside the lifecycle (spec §4)`)
  }
})

test('the error catalog does not duplicate the checks table — it is generated and lives in another file', () => {
  assert.doesNotMatch(errors(), /\bCI-1\b.*\bstructure lint\b/, 'check IDs live in docs/contracts/checks.gen.md')
  assert.match(errors(), /checks\.gen\.md/, 'and this file must point there')
})

test('the versioning policy answers what is public, what never changes and how to deprecate', () => {
  const source = readFileSync(join(projectRoot(), 'docs/contracts/versioning-policy.md'), 'utf8')

  for (const section of ['## What is public', '## What never changes meaning', '## How to deprecate']) {
    assert.ok(source.includes(section), `policy without the section "${section}"`)
  }
})

test('RN-0001: the contracts have an owner in CODEOWNERS, like every artifact', () => {
  const codeowners = loadCodeowners(ROOT)!

  assert.ok(ownersOf(codeowners, 'plugins/living-docs/docs/contracts/errors.md'))
})
