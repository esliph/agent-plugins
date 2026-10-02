import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSpec } from '../../plugin/src/specs/parse.ts'

function blocks(source: string): [string, number, number][] {
  return parseSpec('specs/checkout/spec.md', source).map(requirement => [requirement.token, requirement.line, requirement.endLine])
}

test('RN-0058: a block runs from its heading to the last line with text before the next heading', () => {
  const source = [
    '# checkout', // 1
    '', // 2
    '### CHK-001 [Ubiquitous]', // 3
    '', // 4
    'THE Checkout SHALL show the total.', // 5
    'Story: US-CHK-01', // 6
    '', // 7
    'A note that belongs to CHK-001.', // 8
    '', // 9
    '', // 10
    '### CHK-002 [Ubiquitous]', // 11
    '', // 12
    'THE Checkout SHALL show the tax.', // 13
    '', // 14
    '## Notes', // 15
    '', // 16
    'Prose under a heading of another level belongs to no requirement.', // 17
    '',
  ].join('\n')

  assert.deepEqual(blocks(source), [
    ['CHK-001', 3, 8],
    ['CHK-002', 11, 13],
  ])
})

test('RN-0058: the last block runs to the end of the file, and a bare heading is a block of one line', () => {
  assert.deepEqual(blocks('### CHK-001 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n\n\n'), [['CHK-001', 1, 3]])
  assert.deepEqual(blocks('### CHK-001 [Ubiquitous]\n### CHK-002 [Ubiquitous]\n'), [
    ['CHK-001', 1, 1],
    ['CHK-002', 2, 2],
  ])
})

test('RN-0058: a heading inside a code fence does not end a block', () => {
  const source = [
    '### CHK-001 [Ubiquitous]', // 1
    '', // 2
    'THE Checkout SHALL show the total.', // 3
    '', // 4
    '```markdown', // 5
    '## Not a heading', // 6
    '### CHK-999 [Ubiquitous]', // 7
    '```', // 8
    '', // 9
    '### CHK-002 [Ubiquitous]', // 10
    '', // 11
    'THE Checkout SHALL show the tax.', // 12
    '',
  ].join('\n')

  assert.deepEqual(blocks(source), [
    ['CHK-001', 1, 8],
    ['CHK-002', 10, 12],
  ])
})

test('RN-0058: lines are counted the same in a file with Windows line endings', () => {
  assert.deepEqual(blocks('# checkout\r\n\r\n### CHK-001 [Ubiquitous]\r\n\r\nTHE Checkout SHALL show the total.\r\n\r\n'), [['CHK-001', 3, 5]])
})
