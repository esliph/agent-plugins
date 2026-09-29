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

test('RN-0006: os estados terminais são congelados, revoked incluído', () => {
  for (const status of ['accepted', 'superseded', 'deprecated', 'published', 'paid', 'revoked']) {
    assert.ok(FROZEN_STATUSES.has(status), `${status} deveria ser congelado`)
  }
  assert.equal(FROZEN_STATUSES.has('draft'), false)
  assert.equal(FROZEN_STATUSES.has('open'), false)
})

test('RN-0005: toda promoção que significa aceitação exige ato humano', () => {
  assert.deepEqual(HUMAN_PROMOTIONS, [
    { from: 'draft', to: 'accepted' },
    { from: 'open', to: 'resolved' },
    { from: 'draft', to: 'active' },
    { from: 'active', to: 'revoked' },
    { from: 'draft', to: 'published' },
  ])
})

test('REQUIRED_FIELDS reflete o frontmatter da spec §2', () => {
  assert.deepEqual(REQUIRED_FIELDS, ['id', 'title', 'status', 'owner', 'trigger', 'last-reviewed'])
})

test('isIsoDate aceita string ISO e Date, rejeita o resto', () => {
  assert.equal(isIsoDate('2026-08-21'), true)
  assert.equal(isIsoDate(new Date('2026-08-21')), true)
  assert.equal(isIsoDate('21/08/2026'), false)
  assert.equal(isIsoDate('2026-13-01'), false)
  assert.equal(isIsoDate(undefined), false)
})

test('parseId separa prefixo e número', () => {
  assert.deepEqual(parseId('ADR-0042'), { prefix: 'ADR', number: 42 })
  assert.deepEqual(parseId('DA-007'), { prefix: 'DA', number: 7 })
  assert.equal(parseId('adr-1'), null)
  assert.equal(parseId(42), null)
})

const SEM_HIFEN = { separator: '', padding: 3 } as const

test('RN-0024: parseId lê a forma declarada pelo projeto', () => {
  assert.deepEqual(parseId('RN009', SEM_HIFEN), { prefix: 'RN', number: 9 })
  assert.deepEqual(parseId('RN097', SEM_HIFEN), { prefix: 'RN', number: 97 })
  assert.deepEqual(parseId('RN09', SEM_HIFEN), { prefix: 'RN', number: 9 }, 'um dígito a menos ainda é o mesmo item')
  assert.equal(parseId('RN-009', SEM_HIFEN), null, 'um projeto tem uma forma, não duas')
  assert.equal(parseId('RN0097', SEM_HIFEN), null, 'quatro dígitos não é a forma declarada')
})

test('RN-0024: a forma padrão é a de hoje — 3 ou 4 dígitos com hífen', () => {
  assert.deepEqual(digitRange(DEFAULT_ID_FORMAT), { min: 3, max: 4 })
  assert.deepEqual(parseId('ADR-0042'), { prefix: 'ADR', number: 42 })
  assert.deepEqual(parseId('DA-007'), { prefix: 'DA', number: 7 })
  assert.equal(parseId('RN009'), null)
})

test('RN-0024: a chave canônica não depende da forma escrita', () => {
  const semHifen = parseId('RN009', SEM_HIFEN)
  const comHifen = parseId('RN-0009')

  assert.ok(semHifen && comHifen)
  assert.equal(canonicalId(semHifen), canonicalId(comHifen))
  assert.equal(canonicalId(semHifen), 'RN-0009')
})

test('RN-0024: writeId é a única função que imprime um ID', () => {
  assert.equal(writeId('RN', 9), 'RN-0009')
  assert.equal(writeId('RN', 9, SEM_HIFEN), 'RN009')
  assert.equal(writeId('ADR', 142, { separator: '_', padding: 4 }), 'ADR_0142')
  assert.equal(writeId('RN', 1234, SEM_HIFEN), 'RN1234', 'o número maior que o padding não é truncado')
})

test('idPatternSource entrega prefixo e número em dois grupos', () => {
  const match = new RegExp(`^${idPatternSource()}$`).exec('TDR-0003')

  assert.equal(match?.[1], 'TDR')
  assert.equal(match?.[2], '0003')
})
