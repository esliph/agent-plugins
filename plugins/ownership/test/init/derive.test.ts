import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseCodeowners } from '../../plugin/src/codeowners/parse.ts'
import { deriveInit, markerFiles, rootChildren } from '../../plugin/src/init/derive.ts'
import { tempRepo } from '../helpers/repo.ts'

const FILES = new Set(['.ownership.yml', 'README.md', 'docs/a.md', 'docs/adr/1.md', 'src/a.ts', 'src/lib/b.ts'])

function fromCodeowners(files: string[], codeowners: string) {
  return deriveInit(new Set(files), { kind: 'codeowners', codeowners: parseCodeowners(codeowners) })
}

test('the root children are the first level, directories with a slash, sorted', () => {
  assert.deepEqual(rootChildren(FILES), ['.ownership.yml', 'README.md', 'docs/', 'src/'])
  assert.deepEqual(rootChildren([]), [])
})

test('skeleton mode writes no entry: a model per root child, and every file is still without an owner', () => {
  assert.deepEqual(deriveInit(FILES, { kind: 'skeleton' }), {
    mode: 'skeleton',
    entries: [],
    leftOut: [],
    templates: ['.ownership.yml', 'README.md', 'docs/', 'src/'],
    unowned: 6,
  })
})

test('single-owner mode gives every root child to that owner', () => {
  assert.deepEqual(deriveInit(FILES, { kind: 'owner', owner: '@me' }), {
    mode: 'owner',
    entries: [
      { path: '.ownership.yml', owner: '@me' },
      { path: 'README.md', owner: '@me' },
      { path: 'docs/', owner: '@me' },
      { path: 'src/', owner: '@me' },
    ],
    leftOut: [],
    templates: [],
    unowned: 0,
  })
})

test('a root child whose files all have the same owners, and that has them itself, is one entry', () => {
  const plan = fromCodeowners(['docs/a.md', 'docs/adr/1.md', 'src/a.ts'], 'docs/ @docs\nsrc/ @dev\n')

  assert.deepEqual(plan.entries, [
    { path: 'docs/', owner: '@docs' },
    { path: 'src/', owner: '@dev' },
  ])
  assert.equal(plan.unowned, 0)
})

test('a directory with mixed owners is split into the smallest disjoint cover', () => {
  const plan = fromCodeowners(['docs/a.md', 'docs/adr/1.md', 'docs/adr/2.md', 'docs/api/v1/x.md'], 'docs/ @docs\ndocs/adr/ @arch\n')

  assert.deepEqual(plan.entries, [
    { path: 'docs/a.md', owner: '@docs' },
    { path: 'docs/adr/', owner: '@arch' },
    { path: 'docs/api/', owner: '@docs' },
  ])
})

test('a directory whose files are covered by a line that does not match the directory itself is split', () => {
  const plan = fromCodeowners(['docs/a.md', 'docs/x/b.md'], 'docs/**/*.md @docs\n')

  assert.deepEqual(
    plan.entries.map(entry => entry.path),
    ['docs/a.md', 'docs/x/b.md'],
  )
})

test('the owner is the first of the effective line, and the others go in a note with the line number', () => {
  const plan = fromCodeowners(['src/a.ts'], '# owners\n\nsrc/ @a @b @c\n')

  assert.deepEqual(plan.entries, [{ path: 'src/', owner: '@a', note: 'CODEOWNERS line 3 also lists @b @c' }])
})

test('owner sets are compared without regard to case or order', () => {
  const plan = fromCodeowners(['src/a.ts', 'src/b.md'], 'src/ @A @b\n*.md @B @a\n')

  assert.deepEqual(
    plan.entries.map(entry => entry.path),
    ['src/'],
  )
})

test('a file with no effective line, or on a line without owners, gets no entry and is counted', () => {
  const plan = fromCodeowners(['a.md', 'vendor/x.js', 'vendor/y.js', 'src/a.ts'], '* @all\nvendor/\nsrc/ @dev\n')

  assert.deepEqual(
    plan.entries.map(entry => entry.path),
    ['a.md', 'src/'],
  )
  assert.equal(plan.unowned, 2)
  assert.equal(fromCodeowners(['a.md', 'b.md'], 'a.md @a\n').unowned, 1)
})

test('paths that differ only in case are left out, in every mode that writes entries', () => {
  const files = new Set(['Docs/a.md', 'docs/b.md', 'src/a.ts'])
  const expected = [
    { path: 'Docs/', owner: '@me', reason: 'differs from another path only in case' },
    { path: 'docs/', owner: '@me', reason: 'differs from another path only in case' },
  ]
  const owner = deriveInit(files, { kind: 'owner', owner: '@me' })
  const codeowners = deriveInit(files, { kind: 'codeowners', codeowners: parseCodeowners('* @me\n') })

  assert.deepEqual(owner.leftOut, expected)
  assert.deepEqual(owner.entries, [{ path: 'src/', owner: '@me' }])
  assert.equal(owner.unowned, 2)
  assert.deepEqual(codeowners.leftOut, expected)
  assert.equal(codeowners.unowned, 2)
})

test('a path an ownership file cannot declare is left out with the reason', () => {
  const plan = fromCodeowners(['app/[slug]/page.tsx', 'app/layout.tsx'], '* @routes\napp/layout.tsx @web\n')

  assert.deepEqual(plan.entries, [{ path: 'app/layout.tsx', owner: '@web' }])
  assert.deepEqual(plan.leftOut, [{ path: 'app/[slug]/', owner: '@routes', reason: 'contains "["; paths are literal, without glob or negation' }])
  assert.equal(plan.unowned, 1)
})

test('the same files and the same mode give the same plan, whatever the order of the files', () => {
  const shuffled = new Set([...FILES].reverse())
  const mode = { kind: 'codeowners', codeowners: parseCodeowners('docs/ @docs\n* @all\n') } as const

  assert.deepEqual(deriveInit(shuffled, mode), deriveInit(FILES, mode))
})

test('the files whose first line carries the marker are found, sorted; a missing file is not one', t => {
  const root = tempRepo(
    t,
    { 'b.md': '<!-- generated: do not edit -->\n', 'a/x.ts': '// GENERATED: DO NOT EDIT\n', 'c.md': '# Title\ngenerated: do not edit\n' },
    { git: false },
  )

  assert.deepEqual(markerFiles(root, ['b.md', 'c.md', 'a/x.ts', 'missing.md']), ['a/x.ts', 'b.md'])
})

test('an owner that is not an @handle, such as an email, is never the declared owner: the first @handle is, the email goes in the note', () => {
  const plan = fromCodeowners(['src/a.ts', 'lib/b.ts', 'docs/c.md'], 'src/ dev@example.com @team\nlib/ dev@example.com\ndocs/ @docs\n')

  assert.deepEqual(plan.entries, [
    { path: 'docs/', owner: '@docs' },
    { path: 'src/', owner: '@team', note: 'CODEOWNERS line 1 also lists dev@example.com' },
  ])
  assert.equal(plan.unowned, 1)
})

test('a CODEOWNERS line that lists only emails is listed as left out with the reason, once, at the level an entry would have', () => {
  const plan = fromCodeowners(['lib/a.ts', 'lib/deep/b.ts', 'docs/c.md', 'tmp/d.txt'], 'lib/ dev@example.com ops@example.com\ndocs/ @docs\ntmp/\n')

  assert.deepEqual(plan.entries, [{ path: 'docs/', owner: '@docs' }])
  assert.deepEqual(plan.leftOut, [
    { path: 'lib/', owner: '@owner', reason: 'CODEOWNERS line 1 lists only emails (dev@example.com ops@example.com); an owner must start with "@"' },
  ])
  assert.equal(plan.unowned, 3)
})
