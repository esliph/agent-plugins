import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyDelta } from '../../plugin/src/changes/apply.ts'
import { parseDelta } from '../../plugin/src/changes/delta.ts'

const SPEC = [
  '# checkout',
  '',
  'The current requirements of this capability.',
  '',
  '### CHK-003 [Ubiquitous]',
  '',
  'THE Checkout SHALL accept any coupon.',
  '',
  '### CHK-009 [Event]',
  '',
  'WHEN the coupon is applied, THE Checkout SHALL show the total.',
  'Story: US-CHK-02',
  '',
  'A note written under CHK-009.',
  '',
  '## Notes',
  '',
  'Closing prose.',
  '',
].join('\n')

const ADDED = '## ADDED\n\n### CHK-015 [Unwanted]\n\nIF the coupon is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003\n'
const MODIFIED = '## MODIFIED\n\n### CHK-009 [Event]\n\nWHEN the coupon is applied, THE Checkout SHALL show the discounted total.\n'
const REMOVED = '## REMOVED\n\n### CHK-003\n\nReason: replaced by CHK-015.\n'

function apply(spec: string, delta: string): ReturnType<typeof applyDelta> {
  return applyDelta(spec, parseDelta('changes/2026-10-02-coupon-redemption/specs/checkout/spec.md', delta).entries)
}

test('RN-0058: a MODIFIED replaces the block where it is, and what was written under the old one leaves with it', () => {
  const applied = apply(SPEC, MODIFIED)

  assert.equal(
    applied.text,
    [
      '# checkout',
      '',
      'The current requirements of this capability.',
      '',
      '### CHK-003 [Ubiquitous]',
      '',
      'THE Checkout SHALL accept any coupon.',
      '',
      '### CHK-009 [Event]',
      '',
      'WHEN the coupon is applied, THE Checkout SHALL show the discounted total.',
      '',
      '## Notes',
      '',
      'Closing prose.',
      '',
    ].join('\n'),
  )
  assert.deepEqual(applied.tombstones, [])
  assert.deepEqual(applied.missing, [])
})

test('RN-0058: a REMOVED takes the block out and gives its ID as a tombstone', () => {
  const applied = apply(SPEC, REMOVED)

  assert.equal(applied.text, SPEC.replace('### CHK-003 [Ubiquitous]\n\nTHE Checkout SHALL accept any coupon.\n\n', ''))
  assert.deepEqual(applied.tombstones, ['CHK-003'])
})

test('RN-0058: an ADDED goes to the end of the spec, in the order of the delta, one blank line apart', () => {
  const second = '\n### CHK-016 [Ubiquitous]\n\nTHE Checkout SHALL list the coupons in use.\n'
  const applied = apply(SPEC, `${ADDED}${second}`)

  assert.equal(
    applied.text,
    `${SPEC}\n### CHK-015 [Unwanted]\n\nIF the coupon is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003\n\n### CHK-016 [Ubiquitous]\n\nTHE Checkout SHALL list the coupons in use.\n`,
  )
})

test('RN-0058: the three operations of one delta are applied together', () => {
  const applied = apply(SPEC, `${ADDED}\n${MODIFIED}\n${REMOVED}`)

  assert.equal(
    applied.text,
    [
      '# checkout',
      '',
      'The current requirements of this capability.',
      '',
      '### CHK-009 [Event]',
      '',
      'WHEN the coupon is applied, THE Checkout SHALL show the discounted total.',
      '',
      '## Notes',
      '',
      'Closing prose.',
      '',
      '### CHK-015 [Unwanted]',
      '',
      'IF the coupon is expired, THEN THE Checkout SHALL reject it.',
      'Supersedes: CHK-003',
      '',
    ].join('\n'),
  )
  assert.deepEqual(applied.tombstones, ['CHK-003'])
  assert.deepEqual(applied.missing, [])
})

test('RN-0058: everything outside the blocks stays byte for byte', () => {
  const untidy =
    '#  checkout  \n\n\n\nProse with   odd spacing.\t\n\n\n### CHK-003 [Ubiquitous]\nTHE Checkout SHALL accept any coupon.\n## Notes\n\n\n- a list\n'
  const applied = apply(untidy, REMOVED)

  assert.equal(applied.text, '#  checkout  \n\n\n\nProse with   odd spacing.\t\n\n\n## Notes\n\n\n- a list\n')
})

test('RN-0058: a spec with Windows line endings keeps them, in the blocks that come in too', () => {
  const windows = SPEC.replaceAll('\n', '\r\n')
  const applied = apply(windows, `${ADDED}\n${MODIFIED}\n${REMOVED}`.replaceAll('\n', '\r\n'))

  assert.equal(applied.text.replaceAll('\r\n', ''), apply(SPEC, `${ADDED}\n${MODIFIED}\n${REMOVED}`).text.replaceAll('\n', ''))
  assert.equal(/[^\r]\n/.test(applied.text), false)
  assert.equal(applied.text.endsWith('Supersedes: CHK-003\r\n'), true)
})

test('RN-0058: the file ends with one line break, whether or not it did, and an empty spec takes the first block', () => {
  assert.equal(
    apply('# checkout\n\n### CHK-003 [Ubiquitous]\n\nTHE Checkout SHALL accept any coupon.', MODIFIED.replace('CHK-009', 'CHK-003')).text.endsWith('total.\n'),
    true,
  )
  assert.equal(
    apply('# checkout\n\n\n\n', ADDED).text,
    '# checkout\n\n### CHK-015 [Unwanted]\n\nIF the coupon is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003\n',
  )
  assert.equal(apply('', ADDED).text, '### CHK-015 [Unwanted]\n\nIF the coupon is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003\n')
})

test('RN-0058: a block inside a code fence is text, and is neither replaced nor removed', () => {
  const fenced = '# checkout\n\n```markdown\n### CHK-003 [Ubiquitous]\n```\n'
  const applied = apply(fenced, REMOVED)

  assert.equal(applied.text, fenced)
  assert.deepEqual(applied.tombstones, [])
  assert.deepEqual(applied.missing, ['CHK-003'])
})

test('RN-0054: an ID a MODIFIED or a REMOVED names that is not in the spec is reported, and nothing else changes', () => {
  const applied = apply(SPEC, `${MODIFIED.replace('CHK-009', 'CHK-099')}\n${REMOVED.replace('CHK-003', 'CHK-098')}`)

  assert.equal(applied.text, SPEC)
  assert.deepEqual(applied.missing, ['CHK-099', 'CHK-098'])
  assert.deepEqual(applied.tombstones, [])
})
