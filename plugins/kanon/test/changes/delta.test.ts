import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDelta } from '../../plugin/src/changes/delta.ts'

const FILE = 'changes/2026-10-02-coupon-redemption/specs/checkout/spec.md'

const DELTA = [
  '## ADDED', // 1
  '', // 2
  '### CHK-015 [Unwanted]', // 3
  '', // 4
  'IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.', // 5
  'Supersedes: CHK-003', // 6
  '', // 7
  '## MODIFIED', // 8
  '', // 9
  '### CHK-009 [Event]', // 10
  '', // 11
  'WHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.', // 12
  '', // 13
  '## REMOVED', // 14
  '', // 15
  '### CHK-003', // 16
  '', // 17
  'Reason: replaced by CHK-015, which names the expired case.', // 18
  '',
].join('\n')

function messages(source: string): [number, string][] {
  return parseDelta(FILE, source).problems.map(problem => [problem.line, problem.message])
}

test('RN-0053: a delta is read into its operations, each with its section and its lines', () => {
  const delta = parseDelta(FILE, DELTA)

  assert.equal(delta.target, 'specs/checkout/spec.md')
  assert.equal(delta.name, 'checkout')
  assert.deepEqual(delta.problems, [])
  assert.deepEqual(
    delta.entries.map(entry => [entry.operation, entry.requirement.token, entry.requirement.line, entry.requirement.endLine]),
    [
      ['ADDED', 'CHK-015', 3, 6],
      ['MODIFIED', 'CHK-009', 10, 12],
      ['REMOVED', 'CHK-003', 16, 18],
    ],
  )
  assert.equal(delta.entries[0]?.requirement.file, FILE)
  assert.equal(delta.entries[0]?.requirement.tag, 'Unwanted')
  assert.equal(delta.entries[0]?.text, '### CHK-015 [Unwanted]\n\nIF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003')
  assert.equal(delta.entries[2]?.reason, 'replaced by CHK-015, which names the expired case.')
})

test('RN-0053: the sections come in any order, and a delta under a title is still a delta', () => {
  const delta = parseDelta(
    FILE,
    '# checkout\n\n## REMOVED\n\n### CHK-003\n\nReason: gone.\n\n## ADDED\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n',
  )

  assert.deepEqual(delta.problems, [])
  assert.deepEqual(
    delta.entries.map(entry => [entry.operation, entry.requirement.token]),
    [
      ['REMOVED', 'CHK-003'],
      ['ADDED', 'CHK-015'],
    ],
  )
})

test('RN-0053: a level-2 heading other than the three is a problem, and so is a section written twice', () => {
  assert.deepEqual(messages('## Added\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n'), [
    [1, '"## Added" is not a section of a delta: the only ones are ## ADDED, ## MODIFIED and ## REMOVED.'],
  ])
  assert.deepEqual(parseDelta(FILE, '## Added\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n').entries, [])
  assert.deepEqual(messages('## ADDED\n\n## MODIFIED\n\n## ADDED\n'), [[5, 'the section ## ADDED appears twice: it is already at line 1.']])
})

test('RN-0053: a requirement outside a section is a problem and is no operation', () => {
  const before = '### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n\n## ADDED\n'
  const afterTitle = '## ADDED\n\n# Appendix\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n'

  assert.deepEqual(messages(before), [[1, 'CHK-015 is outside a section: write it under ## ADDED, ## MODIFIED or ## REMOVED.']])
  assert.deepEqual(parseDelta(FILE, before).entries, [])
  assert.deepEqual(
    messages(afterTitle).map(([line]) => line),
    [5],
  )
})

test('RN-0053: a heading inside a code fence is neither a section nor a requirement', () => {
  const delta = parseDelta(
    FILE,
    ['## ADDED', '', '### CHK-015 [Ubiquitous]', '', 'THE Checkout SHALL show the total.', '', '```markdown', '## REMOVED', '### CHK-003', '```', ''].join(
      '\n',
    ),
  )

  assert.deepEqual(delta.problems, [])
  assert.deepEqual(
    delta.entries.map(entry => [entry.operation, entry.requirement.token, entry.requirement.endLine]),
    [['ADDED', 'CHK-015', 10]],
  )
})

test('RN-0054: a REMOVED with no reason, or with an empty one, is a problem', () => {
  const problem: [number, string][] = [[3, 'the removal of CHK-003 gives no reason: write a "Reason:" line under its heading.']]

  assert.deepEqual(messages('## REMOVED\n\n### CHK-003\n'), problem)
  assert.deepEqual(messages('## REMOVED\n\n### CHK-003\n\nReason:\n'), problem)
  assert.deepEqual(messages('## REMOVED\n\n### CHK-003\n\nreplaced by CHK-015.\n'), problem)
  // The operation is still read: the other rules judge it too.
  assert.equal(parseDelta(FILE, '## REMOVED\n\n### CHK-003\n').entries.length, 1)
})

test('RN-0056: every ID a Supersedes names is read, alone on its line or among other metadata', () => {
  const supersedes = (metadata: string): [string, number][] =>
    (parseDelta(FILE, `## ADDED\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n${metadata}\n`).entries[0]?.supersedes ?? []).map(
      reference => [reference.id, reference.line],
    )

  assert.deepEqual(supersedes('Supersedes: CHK-003'), [['CHK-003', 6]])
  assert.deepEqual(supersedes('Supersedes: CHK-003, CHK-004'), [
    ['CHK-003', 6],
    ['CHK-004', 6],
  ])
  assert.deepEqual(supersedes('Story: US-CHK-03 · Supersedes: CHK-003 · Since: 2026-10-02-coupon-redemption'), [['CHK-003', 6]])
  assert.deepEqual(supersedes('Story: US-CHK-03'), [])
})

test('RN-0053: a delta with Windows line endings is read the same', () => {
  const delta = parseDelta(FILE, DELTA.replaceAll('\n', '\r\n'))

  assert.deepEqual(delta.problems, [])
  assert.deepEqual(
    delta.entries.map(entry => [entry.operation, entry.requirement.line, entry.requirement.endLine]),
    [
      ['ADDED', 3, 6],
      ['MODIFIED', 10, 12],
      ['REMOVED', 16, 18],
    ],
  )
  assert.equal(delta.entries[1]?.text, '### CHK-009 [Event]\n\nWHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.')
})
