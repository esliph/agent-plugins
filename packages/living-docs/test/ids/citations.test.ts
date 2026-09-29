import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findCitations, loadRetiredIds, RETIRED_IDS_PATH } from '../../src/ids/citations.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('finds citations with a 1-indexed line', () => {
  const source = ['# Title', '', 'Supersedes ADR-0031 and closes DA-0007.', 'Cites TDR-003 too.'].join('\n')

  assert.deepEqual(findCitations(source), [
    { id: 'ADR-0031', line: 3 },
    { id: 'DA-0007', line: 3 },
    { id: 'TDR-003', line: 4 },
  ])
})

test('ignores what is not citation syntax', () => {
  assert.deepEqual(findCitations('UTF-8 and adr-0001 and ADR-12'), [])
})

test('loadRetiredIds reads the registry ignoring comments and blanks', () => {
  withTempRepo({ [RETIRED_IDS_PATH]: '# retired\nADR-0002\n\nDA-0005\n' }, root => {
    const retired = loadRetiredIds(root)

    assert.equal(retired.has('ADR-0002'), true)
    assert.equal(retired.has('DA-0005'), true)
    assert.equal(retired.size, 2)
  })
})

test('an absent registry returns an empty set', () => {
  withTempRepo({ 'README.md': '' }, root => {
    assert.equal(loadRetiredIds(root).size, 0)
  })
})

test('RN-0024: findCitations recognizes the form declared by the project', () => {
  const text = 'RN009 says so, and RN-0009 is not a citation in this project.'
  const found = findCitations(text, { separator: '', padding: 3 }).map(c => c.id)

  assert.deepEqual(found, ['RN009'])
})

test('RN-0024: without a declared format, the scan is the usual one', () => {
  const found = findCitations('cites ADR-0001 and DA-007').map(c => c.id)

  assert.deepEqual(found, ['ADR-0001', 'DA-007'])
})
