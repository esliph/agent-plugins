import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFrontmatter, FrontmatterSyntaxError } from '../../src/frontmatter/parse.ts'

const DOC = ['---', 'id: ADR-0042', 'title: Event queue', 'status: accepted', 'relates-to: [RN-014, DA-0007]', '---', '', '## Context', 'text', ''].join(
  '\n',
)

test('extracts the data from the YAML block', () => {
  const fm = parseFrontmatter(DOC)

  assert.ok(fm)
  assert.equal(fm.data.id, 'ADR-0042')
  assert.equal(fm.data.status, 'accepted')
  assert.deepEqual(fm.data['relates-to'], ['RN-014', 'DA-0007'])
})

test('maps each top-level key to its 1-indexed line in the file', () => {
  const fm = parseFrontmatter(DOC)

  assert.ok(fm)
  assert.equal(fm.lines.id, 2)
  assert.equal(fm.lines.status, 4)
  assert.equal(fm.lines['relates-to'], 5)
})

test('marks the end of the block and returns the body separately', () => {
  const fm = parseFrontmatter(DOC)

  assert.ok(fm)
  assert.equal(fm.endLine, 6)
  assert.equal(fm.bodyStartLine, 7)
  assert.match(fm.body, /## Context/)
  assert.doesNotMatch(fm.body, /ADR-0042/)
})

test('returns null when the file does not open with ---', () => {
  assert.equal(parseFrontmatter('# Just a title\n'), null)
})

test('returns null when the block never closes', () => {
  assert.equal(parseFrontmatter('---\nid: ADR-1\nno closing\n'), null)
})

test('accepts CRLF and BOM', () => {
  const fm = parseFrontmatter('﻿---\r\nid: ADR-1\r\n---\r\ncorpo\r\n')

  assert.ok(fm)
  assert.equal(fm.data.id, 'ADR-1')
  assert.equal(fm.lines.id, 2)
})

test('throws FrontmatterSyntaxError with the line when the YAML is invalid', () => {
  const bad = '---\nid: "unterminated\nstatus: accepted\n---\nbody\n'

  assert.throws(
    () => parseFrontmatter(bad),
    (err: unknown) => err instanceof FrontmatterSyntaxError && err.line >= 1,
  )
})

test('an empty block produces empty data, not an error', () => {
  const fm = parseFrontmatter('---\n---\nbody\n')

  assert.ok(fm)
  assert.deepEqual(fm.data, {})
  assert.equal(fm.endLine, 2)
})
