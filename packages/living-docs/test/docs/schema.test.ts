import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FROZEN_STATUSES,
  HUMAN_PROMOTIONS,
  REQUIRED_FIELDS,
  DEFAULT_ID_FORMAT,
  isIsoDate,
  canonicalId,
  digitRange,
  idPatternSource,
  parseId,
  writeId,
} from '../../src/docs/schema.ts'

test('RN-0006: terminal states are frozen, revoked included', () => {
  for (const status of ['accepted', 'superseded', 'deprecated', 'published', 'paid', 'revoked']) {
    assert.ok(FROZEN_STATUSES.has(status), `${status} should be frozen`)
  }
  assert.equal(FROZEN_STATUSES.has('draft'), false)
  assert.equal(FROZEN_STATUSES.has('open'), false)
})

test('RN-0005: every promotion that means acceptance requires a human act', () => {
  assert.deepEqual(HUMAN_PROMOTIONS, [
    { from: 'draft', to: 'accepted' },
    { from: 'open', to: 'resolved' },
    { from: 'draft', to: 'active' },
    { from: 'active', to: 'revoked' },
    { from: 'draft', to: 'published' },
  ])
})

test('REQUIRED_FIELDS reflects the spec §2 frontmatter', () => {
  assert.deepEqual(REQUIRED_FIELDS, ['id', 'title', 'status', 'owner', 'trigger', 'last-reviewed'])
})

test('isIsoDate accepts an ISO string and Date, rejects the rest', () => {
  assert.equal(isIsoDate('2026-08-21'), true)
  assert.equal(isIsoDate(new Date('2026-08-21')), true)
  assert.equal(isIsoDate('21/08/2026'), false)
  assert.equal(isIsoDate('2026-13-01'), false)
  assert.equal(isIsoDate(undefined), false)
})

test('parseId splits prefix and number', () => {
  assert.deepEqual(parseId('ADR-0042'), { prefix: 'ADR', number: 42 })
  assert.deepEqual(parseId('DA-007'), { prefix: 'DA', number: 7 })
  assert.equal(parseId('adr-1'), null)
  assert.equal(parseId(42), null)
})

const NO_HYPHEN = { separator: '', padding: 3 } as const

test('RN-0024: parseId reads the form declared by the project', () => {
  assert.deepEqual(parseId('RN009', NO_HYPHEN), { prefix: 'RN', number: 9 })
  assert.deepEqual(parseId('RN097', NO_HYPHEN), { prefix: 'RN', number: 97 })
  assert.deepEqual(parseId('RN09', NO_HYPHEN), { prefix: 'RN', number: 9 }, 'one digit fewer is still the same item')
  assert.equal(parseId('RN-009', NO_HYPHEN), null, 'a project has one form, not two')
  assert.equal(parseId('RN0097', NO_HYPHEN), null, 'four digits is not the declared form')
})

test('RN-0024: the default form is the current one — 3 or 4 digits with a hyphen', () => {
  assert.deepEqual(digitRange(DEFAULT_ID_FORMAT), { min: 3, max: 4 })
  assert.deepEqual(parseId('ADR-0042'), { prefix: 'ADR', number: 42 })
  assert.deepEqual(parseId('DA-007'), { prefix: 'DA', number: 7 })
  assert.equal(parseId('RN009'), null)
})

test('RN-0024: the canonical key does not depend on the written form', () => {
  const noHyphen = parseId('RN009', NO_HYPHEN)
  const withHyphen = parseId('RN-0009')

  assert.ok(noHyphen && withHyphen)
  assert.equal(canonicalId(noHyphen), canonicalId(withHyphen))
  assert.equal(canonicalId(noHyphen), 'RN-0009')
})

test('RN-0024: writeId is the only function that prints an ID', () => {
  assert.equal(writeId('RN', 9), 'RN-0009')
  assert.equal(writeId('RN', 9, NO_HYPHEN), 'RN009')
  assert.equal(writeId('ADR', 142, { separator: '_', padding: 4 }), 'ADR_0142')
  assert.equal(writeId('RN', 1234, NO_HYPHEN), 'RN1234', 'a number larger than the padding is not truncated')
})

test('idPatternSource delivers prefix and number in two groups', () => {
  const match = new RegExp(`^${idPatternSource()}$`).exec('TDR-0003')

  assert.equal(match?.[1], 'TDR')
  assert.equal(match?.[2], '0003')
})
