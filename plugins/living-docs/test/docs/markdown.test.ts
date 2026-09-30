import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeProse, sentencesOf, stripCode, stripFences } from '../../plugin/src/docs/markdown.ts'

test('stripFences erases only the fenced block — inline code stays', () => {
  const source = ['item — verification: `living-docs/staleness`.', '```markdown', 'example with `CI-n`', '```', 'after'].join('\n')
  const stripped = stripFences(source)

  assert.equal(stripped.split('\n').length, source.split('\n').length, 'the finding line depends on this')
  assert.ok(stripped.includes('`living-docs/staleness`'), 'the ID between backticks is what whoever looks for a verification needs to see')
  assert.equal(stripped.includes('CI-n'), false, 'the example inside the fence is an example')
  assert.ok(stripped.includes('after'))
})

test('stripCode erases the fenced block and inline code, preserving the line count', () => {
  const source = ['prose with `[[wikilink]]` inside', '', '```ts', 'const x = /\\]\\(/;', '```', 'after'].join('\n')
  const stripped = stripCode(source)

  assert.equal(stripped.split('\n').length, source.split('\n').length, 'the finding line depends on this')
  assert.equal(stripped.includes('wikilink'), false, 'inline code is not a link')
  assert.equal(stripped.includes('const x'), false)
  assert.ok(stripped.includes('after'))
})

test('stripCode closes the block only with a fence of the same size or larger', () => {
  const source = ['````markdown', 'example', '```ts', 'const y = 1;', '```', 'still inside', '````', 'outside'].join('\n')
  const stripped = stripCode(source)

  assert.equal(stripped.includes('still inside'), false, 'the 3-backtick fence does not close the 4-backtick one')
  assert.ok(stripped.includes('outside'))
})

test('normalizeProse strips markup, punctuation and case', () => {
  assert.equal(normalizeProse('**The rule** comes before the `code`!'), 'the rule comes before the code')
  assert.equal(normalizeProse('  collapsed   spacing  '), 'collapsed spacing')
})

test('sentencesOf joins the paragraph before cutting, and cuts at lists and headings', () => {
  const source = ['# Title', '', 'A sentence that the prose', 'broke across two lines. And another after.', '', '- list item', '- another item'].join('\n')

  const sentences = sentencesOf(source).map(sentence => sentence.text)

  assert.deepEqual(sentences, ['Title', 'A sentence that the prose broke across two lines.', 'And another after.', 'list item', 'another item'])
  assert.equal(sentencesOf(source)[1]?.line, 3, 'the sentence starts on the line where the paragraph started')
})
