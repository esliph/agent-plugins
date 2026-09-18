import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findDuplicateKeys, parseItemsSections, parseItemsTable } from '../../src/schema/item.ts'

test('parseItemsTable lê pela coluna nomeada em format.key, chave opaca', () => {
  const source = ['| ID | Lacuna | Status |', '| --- | ------ | ------ |', '| DA-01 | x | open |', '| T-9 | y | resolved |'].join('\n')
  const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['DA-01', 'T-9'],
  )
  assert.equal(items[0]?.state, 'open')
  assert.equal(items[0]?.fields.lacuna, 'x')
})

test('parseItemsTable: célula vazia ou marcador de vazio não vira item', () => {
  const source = ['| ID | Status |', '| --- | ------ |', '| - | open |', '| DA-01 | open |'].join('\n')
  const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['DA-01'],
  )
})

test('parseItemsTable sem a coluna declarada devolve lista vazia', () => {
  const source = ['| Nome | Status |', '| ---- | ------ |', '| x | open |'].join('\n')

  assert.deepEqual(parseItemsTable(source, 1, { key: 'ID', stateField: 'status' }), [])
})

test('parseItemsTable devolve a chave duplicada, e findDuplicateKeys aponta a repetição', () => {
  const source = ['| ID | Status |', '| --- | ------ |', '| DA-01 | open |', '| DA-01 | resolved |'].join('\n')
  const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

  assert.equal(items.length, 2)
  assert.deepEqual(
    findDuplicateKeys(items).map(item => item.line),
    [4],
  )
})

test('parseItemsSections, keyMode first-token: primeiro token é a chave, resto é título', () => {
  const source = '## RN-0001 — Título da regra\n\n- **status:** active\n- **relates-to:** ADR-0002\n\nCorpo.\n'
  const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

  assert.equal(items[0]?.key, 'RN-0001')
  assert.equal(items[0]?.fields.title, 'Título da regra')
  assert.equal(items[0]?.state, 'active')
  assert.equal(items[0]?.fields['relates-to'], 'ADR-0002')
})

test('parseItemsSections, keyMode heading: a linha inteira do heading é a chave', () => {
  const source = '## Contexto\n\nTexto.\n\n## Decisão\n\nOutro texto.\n'
  const items = parseItemsSections(source, 1, { keyMode: 'heading', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['Contexto', 'Decisão'],
  )
})

test('parseItemsSections pula bloco de código cercado', () => {
  const source = '```\n## RN-9999 — exemplo de formato\n```\n\n## RN-0001 — real\n\n- **status:** active\n'
  const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['RN-0001'],
  )
})

test('parseItemsSections: chave duplicada aparece em findDuplicateKeys', () => {
  const source = '## X — um\n\n- **status:** active\n\n## X — dois\n\n- **status:** active\n'

  assert.equal(findDuplicateKeys(parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })).length, 1)
})

test('parseItemsSections: só heading de nível 2 é item; subtítulo é corpo', () => {
  const source = '## RN-0001 — a\n\n### Exemplo\n\n## RN-0002 — b\n\n### Exemplo\n'
  const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['RN-0001', 'RN-0002'],
  )
})

test('state-field customizado é lido no lugar de status', () => {
  const source = '## X — um\n\n- **situação:** aberta\n'
  const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'situação' })

  assert.equal(items[0]?.state, 'aberta')
})
