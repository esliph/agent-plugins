import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { findCodeowners, loadCodeowners } from '../../plugin/src/codeowners/locate.ts'
import { ownersOf } from '../../plugin/src/codeowners/match.ts'
import { parseCodeowners } from '../../plugin/src/codeowners/parse.ts'
import { tempRepo } from '../helpers/repo.ts'

test('each line keeps its pattern, owners and line number; comments and blank lines are skipped', () => {
  const parsed = parseCodeowners('# owners\n\ndocs/ @team @lead # the docs\n*.js @js\nvendor/\n', 'CODEOWNERS')

  assert.equal(parsed.file, 'CODEOWNERS')
  assert.deepEqual(
    parsed.lines.map(line => [line.pattern, line.owners, line.line]),
    [
      ['docs/', ['@team', '@lead'], 3],
      ['*.js', ['@js'], 4],
      ['vendor/', [], 5],
    ],
  )
})

test('a CODEOWNERS with CRLF line ends gives the same owners, without a carriage return', () => {
  const parsed = parseCodeowners('docs/ @team\r\nsrc/ @dev @lead\r\n')

  assert.deepEqual(
    parsed.lines.map(line => [line.pattern, line.owners]),
    [
      ['docs/', ['@team']],
      ['src/', ['@dev', '@lead']],
    ],
  )
})

test('a line with syntax GitHub does not support is dropped, as GitHub drops it', () => {
  const parsed = parseCodeowners('!docs/ @a\n[ab].md @b\nsrc/ @c\n')

  assert.deepEqual(
    parsed.lines.map(line => line.pattern),
    ['src/'],
  )
})

const MATCHES: [string, string, boolean][] = [
  ['*', 'a/b.js', true],
  ['*', 'docs/', true],
  ['*.js', 'a/b.js', true],
  ['*.js', 'b.ts', false],
  ['docs/*', 'docs/a.md', true],
  ['docs/*', 'docs/x/a.md', false],
  ['/docs/', 'docs/a/b.md', true],
  ['/docs/', 'docs/', true],
  ['/docs/', 'docs', false],
  ['apps/', 'x/apps/a.js', true],
  ['apps/', 'apps', false],
  ['docs', 'x/docs/a', true],
  ['**/logs', 'a/b/logs/x', true],
  ['**/logs', 'logs', true],
  ['docs/**', 'docs/a/b', true],
  ['docs/**', 'docs/', false],
  ['docs/**/*.md', 'docs/x/y/a.md', true],
  ['docs/**/*.md', 'docs/', false],
  ['a/**/b', 'a/b', true],
  ['a/**/b', 'a/x/y/b', true],
  ['build/logs/', 'x/build/logs/a', false],
  ['plugins/ownership/', 'plugins/ownership/', true],
  ['plugins/ownership/', 'plugins/', false],
  ['a?c', 'abc', true],
  ['a?c', 'a/c', false],
  ['docs/a.md', 'docs/a.md', true],
]

for (const [pattern, path, expected] of MATCHES) {
  test(`pattern ${pattern} ${expected ? 'matches' : 'does not match'} ${path}`, () => {
    assert.equal(ownersOf(parseCodeowners(`${pattern} @x\n`), path).kind, expected ? 'matched' : 'unmatched')
  })
}

test('the last matching line wins', () => {
  assert.deepEqual(ownersOf(parseCodeowners('docs/ @team\ndocs/ @other\n'), 'docs/a.md'), { kind: 'matched', owners: ['@other'], line: 2 })
})

test('a pattern without owners unsets the owner', () => {
  assert.deepEqual(ownersOf(parseCodeowners('* @all\nvendor/\n'), 'vendor/x.js'), { kind: 'matched', owners: [], line: 2 })
})

test('no CODEOWNERS is told apart from a path no line matches', () => {
  assert.deepEqual(ownersOf(null, 'docs/a.md'), { kind: 'no-codeowners' })
  assert.deepEqual(ownersOf(parseCodeowners('src/ @a\n'), 'docs/a.md'), { kind: 'unmatched' })
})

test('the CODEOWNERS is found where GitHub looks for it', t => {
  assert.equal(findCodeowners(tempRepo(t, {}, { git: false })), null)
  assert.equal(loadCodeowners(tempRepo(t, {}, { git: false })), null)

  const loaded = loadCodeowners(tempRepo(t, { '.github/CODEOWNERS': 'docs/ @team\n' }, { git: false }))

  assert.equal(loaded?.file, '.github/CODEOWNERS')
  assert.equal(loaded?.lines.length, 1)
})

test('more than one CODEOWNERS is an error naming them', t => {
  const root = tempRepo(t, { CODEOWNERS: '* @a\n', 'docs/CODEOWNERS': '* @b\n' }, { git: false })

  assert.throws(
    () => loadCodeowners(root),
    (error: unknown) => error instanceof OwnershipError && error.message.startsWith('CODEOWNERS: more than one CODEOWNERS: CODEOWNERS, docs/CODEOWNERS'),
  )
})
