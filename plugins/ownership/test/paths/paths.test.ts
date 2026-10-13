import { test } from 'node:test'
import assert from 'node:assert/strict'

import { caseCollisions, contains, dirOf, literalProblem, normalizePath, resolveUnder, segmentsOf, toPosix } from '../../plugin/src/paths/paths.ts'

test('normalization drops ./ and empty segments and keeps the directory slash', () => {
  assert.equal(normalizePath('./docs//adr/'), 'docs/adr/')
  assert.equal(normalizePath('docs/./a.md'), 'docs/a.md')
  assert.equal(normalizePath('./'), '')
  assert.equal(normalizePath('a/../b'), 'a/../b')
})

test('normalization turns a decomposed name into NFC', () => {
  const decomposed = 'café.md'

  assert.equal(normalizePath(decomposed), 'café.md')
})

test('backslashes become forward slashes', () => {
  assert.equal(toPosix('docs\\adr\\x.md'), 'docs/adr/x.md')
})

test('a literal path has no glob, no negation and no leading slash', () => {
  assert.equal(literalProblem('docs/adr/'), null)
  assert.match(literalProblem('docs/*.md') ?? '', /contains "\*"/)
  assert.match(literalProblem('docs/?.md') ?? '', /contains "\?"/)
  assert.match(literalProblem('docs/[ab].md') ?? '', /contains "\["/)
  assert.match(literalProblem('!docs/') ?? '', /contains "!"/)
  assert.match(literalProblem('/docs/') ?? '', /starts with "\/"/)
})

test('a path resolves against the base and may not escape it', () => {
  assert.deepEqual(resolveUnder('', 'docs/'), { ok: true, path: 'docs/' })
  assert.deepEqual(resolveUnder('plugins/x/', 'src/a.ts'), { ok: true, path: 'plugins/x/src/a.ts' })
  assert.deepEqual(resolveUnder('plugins/x/', '../x/a.ts'), { ok: true, path: 'plugins/x/a.ts' })
  assert.deepEqual(resolveUnder('plugins/x/', '../y/a.ts'), { ok: false, resolved: 'plugins/y/a.ts' })
  assert.deepEqual(resolveUnder('', '../a.ts'), { ok: false, resolved: '../a.ts' })
  assert.deepEqual(resolveUnder('plugins/x/', './'), { ok: true, path: 'plugins/x/' })
  assert.deepEqual(resolveUnder('', './'), { ok: true, path: '' })
})

test('only a directory contains, and never itself', () => {
  assert.equal(contains('docs/', 'docs/adr/x.md'), true)
  assert.equal(contains('docs/', 'docs/'), false)
  assert.equal(contains('docs', 'docs/x.md'), false)
  assert.equal(contains('docs/', 'docsx/a.md'), false)
})

test('segments and parent directory', () => {
  assert.deepEqual(segmentsOf('docs/adr/'), ['docs', 'adr'])
  assert.deepEqual(segmentsOf(''), [])
  assert.equal(dirOf('plugins/x/.ownership.yml'), 'plugins/x/')
  assert.equal(dirOf('.ownership.yml'), '')
})

test('paths that differ only in case are grouped', () => {
  assert.deepEqual(caseCollisions(['Docs/', 'docs/', 'src/', 'DOCS/', 'src/']), [['Docs/', 'docs/', 'DOCS/']])
  assert.deepEqual(caseCollisions(['a', 'b']), [])
})
