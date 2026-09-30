import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadCodeowners, ownersOf } from '@esliph/ownership'
import { checkoutRoot, projectRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()

/**
 * Index of the header line of a markdown table whose first column is called
 * `column`. Tolerates the padding alignment a formatter inserts
 * (`| Term | ` becomes `| Term                | `); the `^` ties it to a real
 * table line, not to prose that cites the column name.
 */
function headerIndex(source: string, column: string): number {
  const match = source.match(new RegExp(`^\\|\\s*${column}\\s*\\|`, 'm'))

  assert.ok(match, `table not found — expected the header | ${column} |`)

  return match.index!
}

/**
 * Rows of a markdown table, without the header or the separator. Only what
 * starts with `|` gets in: prose after the table cannot become a phantom term.
 */
function rows(source: string, column: string): string[][] {
  return source
    .slice(headerIndex(source, column))
    .split('\n')
    .filter(line => line.trim().startsWith('|'))
    .slice(2) // header + separator
    .map(line =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cell => cell.trim()),
    )
}

const GLOSSARY_HEADER = 'Term'
const glossary = (): string => readFileSync(join(projectRoot(), 'docs/glossary.md'), 'utf8')

test('RN-0011: every glossary term has a unique name, and none has a numbered ID', () => {
  const source = glossary()
  const entries = rows(source, GLOSSARY_HEADER)

  const names = entries.map(row => row[0])

  assert.ok(names.length >= 5, `expected at least 5 terms, found ${names.length}`)
  assert.equal(new Set(names).size, names.length, 'a term has a duplicate name')

  const start = headerIndex(source, GLOSSARY_HEADER)
  const header = source.slice(start, source.indexOf('\n', start))

  assert.doesNotMatch(header, /\|\s*ID\s*\|/i, 'the table has no ID column — the term is identified by its name (RN-0011)')

  for (const row of entries) {
    const status = row[row.length - 1] ?? ''

    // `renamed(to X)` is the state with a target; spec §4 writes it that way.
    assert.match(status, /^(active|banned|renamed(\(to .+\))?)$/, `status "${status}" outside the term lifecycle (RN-0011)`)
  }
})

test('RN-0011: every term points to the source that defines it', () => {
  for (const row of rows(glossary(), GLOSSARY_HEADER)) {
    assert.notEqual(row[4] ?? '', '', `term "${row[0]}" without a source`)
  }
})

test('the Constitution: every principle names what verifies it', () => {
  const source = readFileSync(join(projectRoot(), 'docs/charter/constitution.md'), 'utf8')
  const section = source.slice(source.indexOf('## Principles'), source.indexOf('## Amendment log'))
  const principles = section.split('\n').filter(line => /^\d+\./.test(line.trim()))

  assert.ok(principles.length >= 3, `expected at least 3 principles, found ${principles.length}`)
  for (const principle of principles) {
    assert.match(principle, /verified by/, `principle without a named enforcement — ${principle}`)
  }
})

test('the Constitution has an amendment log — an amendment is an append, never an in-place rewrite', () => {
  const source = readFileSync(join(projectRoot(), 'docs/charter/constitution.md'), 'utf8')

  assert.match(source, /## Amendment log/)
})

test('the Vision answers only the three questions of spec §5', () => {
  const source = readFileSync(join(projectRoot(), 'docs/charter/vision.md'), 'utf8')

  for (const question of ['What problem', 'For whom', 'Success metric']) {
    assert.match(source, new RegExp(`\\*\\*${question}:\\*\\*`), `Vision without the question "${question}"`)
  }
})

test('RN-0001: glossary and charter have an owner in CODEOWNERS, like every artifact', () => {
  const codeowners = loadCodeowners(ROOT)!

  assert.ok(ownersOf(codeowners, 'plugins/living-docs/docs/glossary.md'))
  assert.ok(ownersOf(codeowners, 'plugins/living-docs/docs/charter/vision.md'))
})
