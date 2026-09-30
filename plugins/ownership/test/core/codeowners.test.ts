import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadCodeowners, ownersOf, parseCodeowners } from '../../plugin/src/core/codeowners.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('the last matching rule wins', () => {
  const entries = parseCodeowners('docs/ @a\ndocs/x.md @b\n')
  const codeowners = { file: 'CODEOWNERS', entries }

  assert.deepEqual(ownersOf(codeowners, 'docs/x.md'), ['@b'])
  assert.deepEqual(ownersOf(codeowners, 'docs/y.md'), ['@a'])
  assert.equal(ownersOf(codeowners, 'other.md'), null)
})

const CODEOWNERS = `# Mirrors the owner of .ownership.yml
docs/decisions/adr/    @team
docs/open-decisions.md    @product @team
/CONTRIBUTING.md    @team
docs/contracts/*.md    @contracts
no-owner.md
`

test('parseCodeowners ignores comments and blank lines, and keeps only handles', () => {
  const entries = parseCodeowners(CODEOWNERS)

  assert.equal(entries.length, 5)
  assert.deepEqual(entries[1]?.owners, ['@product', '@team'])
  assert.equal(entries[1]?.line, 3)
  assert.deepEqual(entries[4]?.owners, [], 'pattern without a handle declares no owner')
})

test('ownersOf covers a directory by prefix, a file by equality, and ignores the leading slash', () => {
  const codeowners = { file: 'CODEOWNERS', entries: parseCodeowners(CODEOWNERS) }

  assert.deepEqual(ownersOf(codeowners, 'docs/decisions/adr/ADR-0001-x.md'), ['@team'])
  assert.deepEqual(ownersOf(codeowners, 'docs/open-decisions.md'), ['@product', '@team'])
  assert.deepEqual(ownersOf(codeowners, 'CONTRIBUTING.md'), ['@team'])
  assert.deepEqual(ownersOf(codeowners, 'docs/contracts/errors.md'), ['@contracts'])
  assert.equal(ownersOf(codeowners, 'docs/glossary.md'), null)
  assert.equal(ownersOf(codeowners, 'no-owner.md'), null, 'pattern without a handle covers nothing')
})

test('ownersOf: `*` covers everything, and the last matching rule wins', () => {
  const codeowners = { file: 'CODEOWNERS', entries: parseCodeowners('*    @everyone\ndocs/    @docs\n') }

  assert.deepEqual(ownersOf(codeowners, 'any/thing.ts'), ['@everyone'])
  assert.deepEqual(ownersOf(codeowners, 'docs/x.md'), ['@docs'])
})

test('loadCodeowners looks in the three places and returns null when there is none', () => {
  withTempRepo({ '.github/CODEOWNERS': 'docs/    @team\n' }, root => {
    assert.equal(loadCodeowners(root)?.file, '.github/CODEOWNERS')
  })
  withTempRepo({ 'CODEOWNERS': 'docs/    @team\n', '.github/CODEOWNERS': 'x    @other\n' }, root => {
    assert.equal(loadCodeowners(root)?.file, 'CODEOWNERS', 'the root comes first')
  })
  withTempRepo({ 'README.md': '' }, root => {
    assert.equal(loadCodeowners(root), null)
  })
})
