import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asIsoDate, monthsBetween, todayIso } from '../../plugin/src/core/dates.ts'

test('RNF-0004: todayIso reads the clock it receives, not the system one', () => {
  const fixed = () => new Date('2026-08-27T13:45:00Z')

  assert.equal(todayIso(fixed), '2026-08-27')
  // without a clock, it is still a ten-character ISO — the format is the contract
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/)
})

test('asIsoDate accepts an ISO string and a Date, and refuses the rest', () => {
  assert.equal(asIsoDate('2026-08-27'), '2026-08-27')
  assert.equal(asIsoDate('  2026-08-27  '), '2026-08-27')
  assert.equal(asIsoDate(new Date('2026-08-27T00:00:00Z')), '2026-08-27')
  assert.equal(asIsoDate('27/08/2026'), null)
  assert.equal(asIsoDate('coming soon'), null)
  assert.equal(asIsoDate(undefined), null)
  assert.equal(asIsoDate(42), null)
  assert.equal(asIsoDate(new Date('not a date')), null)
})

test('monthsBetween counts calendar months and respects the day', () => {
  assert.equal(monthsBetween('2026-01-15', '2026-07-15'), 6)
  assert.equal(monthsBetween('2026-01-15', '2026-07-14'), 5, 'one day short, six months have not yet passed')
  assert.equal(monthsBetween('2026-01-15', '2026-07-16'), 6)
  assert.equal(monthsBetween('2025-12-31', '2026-01-01'), 0)
  assert.equal(monthsBetween('2026-08-27', '2026-08-27'), 0)
})

test('monthsBetween returns negative for a future date and null for what is not a date', () => {
  assert.equal(monthsBetween('2027-01-01', '2026-08-27'), -4)
  assert.equal(monthsBetween('tomorrow', '2026-08-27'), null)
  assert.equal(monthsBetween('2026-08-27', ''), null)
})
