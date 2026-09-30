import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findDuplicateKeys, isEmptyValue, parseItemsSections, parseItemsTable } from '../../plugin/src/schema/item.ts'

test('parseItemsTable reads by the column named in format.key, opaque key', () => {
  const source = ['| ID | Gap | Status |', '| --- | ------ | ------ |', '| DA-01 | x | open |', '| T-9 | y | resolved |'].join('\n')
  const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['DA-01', 'T-9'],
  )
  assert.equal(items[0]?.state, 'open')
  assert.equal(items[0]?.fields.gap, 'x')
})

test('parseItemsTable: an empty cell or empty marker does not become an item', () => {
  const source = ['| ID | Status |', '| --- | ------ |', '| - | open |', '| DA-01 | open |'].join('\n')
  const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['DA-01'],
  )
})

test('parseItemsTable without the declared column returns an empty list', () => {
  const source = ['| Name | Status |', '| ---- | ------ |', '| x | open |'].join('\n')

  assert.deepEqual(parseItemsTable(source, 1, { key: 'ID', stateField: 'status' }), [])
})

test('parseItemsTable returns the duplicate key, and findDuplicateKeys points at the repetition', () => {
  const source = ['| ID | Status |', '| --- | ------ |', '| DA-01 | open |', '| DA-01 | resolved |'].join('\n')
  const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

  assert.equal(items.length, 2)
  assert.deepEqual(
    findDuplicateKeys(items).map(item => item.line),
    [4],
  )
})

test('parseItemsSections, keyMode first-token: first token is the key, the rest is the title', () => {
  const source = '## RN-0001 — Rule title\n\n- **status:** active\n- **relates-to:** ADR-0002\n\nBody.\n'
  const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

  assert.equal(items[0]?.key, 'RN-0001')
  assert.equal(items[0]?.fields.title, 'Rule title')
  assert.equal(items[0]?.state, 'active')
  assert.equal(items[0]?.fields['relates-to'], 'ADR-0002')
})

test('parseItemsSections, keyMode heading: the whole heading line is the key', () => {
  const source = '## Context\n\nText.\n\n## Decision\n\nOther text.\n'
  const items = parseItemsSections(source, 1, { keyMode: 'heading', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['Context', 'Decision'],
  )
})

test('parseItemsSections skips a fenced code block', () => {
  const source = '```\n## RN-9999 — format example\n```\n\n## RN-0001 — real\n\n- **status:** active\n'
  const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['RN-0001'],
  )
})

test('parseItemsSections: duplicate key shows up in findDuplicateKeys', () => {
  const source = '## X — one\n\n- **status:** active\n\n## X — two\n\n- **status:** active\n'

  assert.equal(findDuplicateKeys(parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })).length, 1)
})

test('parseItemsSections: only a level 2 heading is an item; a subheading is body', () => {
  const source = '## RN-0001 — a\n\n### Example\n\n## RN-0002 — b\n\n### Example\n'
  const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['RN-0001', 'RN-0002'],
  )
})

test('custom state-field is read in place of status', () => {
  const source = '## X — one\n\n- **situation:** open\n'
  const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'situation' })

  assert.equal(items[0]?.state, 'open')
})

test('parseItemsTable stops reading at the first line that is not part of the table', () => {
  const items = parseItemsTable('| ID | Status |\n| --- | --- |\n| A-1 | open |\n\n| A-2 | open |\n', 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['A-1'],
  )
})

test('parseItemsTable brings all columns into the item, by normalized key', () => {
  const items = parseItemsTable('| ID | Status | Resolved by: |\n| --- | --- | --- |\n| A-1 | open | B-2 |\n', 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(items[0]?.fields, { id: 'A-1', status: 'open', 'resolved by': 'B-2' })
})

test('parseItemsSections: the line is shifted by startLine, and a section with no state returns an empty state', () => {
  const items = parseItemsSections('## RN-0001 — Rule\n\nText.\n', 10, { keyMode: 'first-token', stateField: 'status' })

  assert.equal(items[0]?.line, 10)
  assert.equal(items[0]?.state, '')
})

test('RN-0038: an empty cell is structural — a word in any language is a value', () => {
  for (const empty of ['', '  ', '-', '—', '–', 'n/a', 'N/A', 'na', 'null']) {
    assert.equal(isEmptyValue(empty), true, `should be empty: "${empty}"`)
  }
  for (const word of ['nenhum', 'nenhuma', 'none', 'ninguno']) {
    assert.equal(isEmptyValue(word), false, `should be a value: "${word}"`)
  }
})
