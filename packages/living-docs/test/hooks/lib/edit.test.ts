import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyToolInput, diffDocument } from '../../../src/hooks/lib/edit.ts'

const DOC = ['---', 'id: ADR-0001', 'status: accepted', 'superseded-by: null', '---', '', '## Context', 'original text'].join('\n')

test('Write returns the whole content', () => {
  assert.equal(applyToolInput(DOC, { content: 'new' }), 'new')
})

test('Edit projects the replacement onto the current content', () => {
  const result = applyToolInput(DOC, { old_string: 'original text', new_string: 'new text' })

  assert.match(result ?? '', /new text/)
  assert.doesNotMatch(result ?? '', /original text/)
})

test('Edit with replace_all replaces every occurrence', () => {
  const result = applyToolInput('a a a', { old_string: 'a', new_string: 'b', replace_all: true })

  assert.equal(result, 'b b b')
})

test('Edit whose old_string does not exist returns null — it cannot be predicted', () => {
  assert.equal(applyToolInput(DOC, { old_string: 'nonexistent', new_string: 'x' }), null)
})

test('tool_input without content or old_string returns null', () => {
  assert.equal(applyToolInput(DOC, {}), null)
})

test('diffDocument isolates changed fields from the changed body', () => {
  const after = DOC.replace('status: accepted', 'status: superseded').replace('superseded-by: null', 'superseded-by: ADR-0002')

  assert.deepEqual(diffDocument(DOC, after), {
    changedFields: ['status', 'superseded-by'],
    bodyChanged: false,
  })
})

test('diffDocument detects a body change', () => {
  const after = DOC.replace('original text', 'tampered text')
  const diff = diffDocument(DOC, after)

  assert.deepEqual(diff.changedFields, [])
  assert.equal(diff.bodyChanged, true)
})

test('an added or removed field counts as a changed field', () => {
  const added = DOC.replace('status: accepted', 'status: accepted\nlast-reviewed: 2026-08-24')

  assert.deepEqual(diffDocument(DOC, added).changedFields, ['last-reviewed'])
  const removed = DOC.replace('superseded-by: null\n', '')

  assert.deepEqual(diffDocument(DOC, removed).changedFields, ['superseded-by'])
})

test('a difference of only trailing whitespace in the body does not count', () => {
  assert.equal(diffDocument(DOC, `${DOC}\n\n`).bodyChanged, false)
})

test('losing the frontmatter counts as a changed body', () => {
  assert.equal(diffDocument(DOC, '# no frontmatter').bodyChanged, true)
})
