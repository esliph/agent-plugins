import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_MACHINE,
  FROZEN_STATUSES,
  HUMAN_PROMOTIONS,
  REQUIRED_FIELDS,
  statesFor,
  findCadence,
  isIsoDate,
  parseId,
} from '../../src/docs/schema.ts';
import type { ArtifactRule } from '../../src/config/ownership.ts';

function rule(overrides: Partial<ArtifactRule> = {}): ArtifactRule {
  return {
    idPrefix: 'ADR',
    path: 'docs/decisions/adr/',
    owner: '@team',
    skill: 'decision-recorder',
    appendOnly: true,
    mutableFields: ['status', 'superseded-by', 'last-reviewed'],
    citedBy: [],
    collection: 'per-file',
    fieldMap: {},
    states: null,
    ...overrides,
  };
}

test('a máquina de estados da spec §4 está codificada', () => {
  assert.deepEqual(STATUS_MACHINE.ADR, ['draft', 'accepted', 'superseded']);
  assert.deepEqual(STATUS_MACHINE.DA, ['open', 'resolved', 'dropped']);
  assert.deepEqual(STATUS_MACHINE.TDR, ['open', 'paid', 'accepted-permanently']);
});

test('os estados congelados incluem os cinco do esqueleto da spec §7', () => {
  for (const status of ['accepted', 'superseded', 'deprecated', 'published', 'paid']) {
    assert.ok(FROZEN_STATUSES.has(status), `${status} deveria ser congelado`);
  }
  assert.equal(FROZEN_STATUSES.has('draft'), false);
  assert.equal(FROZEN_STATUSES.has('open'), false);
});

test('as promoções que exigem ato humano são exatamente draft→accepted e open→resolved', () => {
  assert.deepEqual(HUMAN_PROMOTIONS, [
    { from: 'draft', to: 'accepted' },
    { from: 'open', to: 'resolved' },
  ]);
});

test('REQUIRED_FIELDS reflete o frontmatter da spec §2', () => {
  assert.deepEqual(REQUIRED_FIELDS, ['id', 'title', 'status', 'owner', 'trigger', 'last-reviewed']);
});

test('statesFor prefere o states declarado no .ownership.yml', () => {
  assert.deepEqual(statesFor(rule()), ['draft', 'accepted', 'superseded']);
  assert.deepEqual(statesFor(rule({ states: ['a', 'b'] })), ['a', 'b']);
  assert.equal(statesFor(rule({ idPrefix: 'XX', states: null })), null);
});

test('findCadence reprova o vocabulário de cadência da spec §2', () => {
  const rejeitados = [
    'revisar trimestralmente',
    'Mensal',
    'anualmente',
    'periodicamente',
    'revisar a cada release',
    'quarterly review',
    'toda sprint',
    'a cada 3 meses',
    'every 2 weeks',
  ];
  for (const trigger of rejeitados) {
    assert.ok(findCadence(trigger) !== null, `deveria reprovar: ${trigger}`);
  }
});

test('findCadence aprova gatilhos que nomeiam um evento observável', () => {
  const aceitos = [
    'no mesmo PR que altera `src/domain/billing`',
    'quando um código de erro novo é adicionado',
    'quando um agente errar por falta de contexto',
    'Nunca. Imutável após aceito; uma decisão nova o supersede.',
  ];
  for (const trigger of aceitos) {
    assert.equal(findCadence(trigger), null, `não deveria reprovar: ${trigger}`);
  }
});

test('isIsoDate aceita string ISO e Date, rejeita o resto', () => {
  assert.equal(isIsoDate('2026-08-21'), true);
  assert.equal(isIsoDate(new Date('2026-08-21')), true);
  assert.equal(isIsoDate('21/08/2026'), false);
  assert.equal(isIsoDate('2026-13-01'), false);
  assert.equal(isIsoDate(undefined), false);
});

test('parseId separa prefixo e número', () => {
  assert.deepEqual(parseId('ADR-0042'), { prefix: 'ADR', number: 42 });
  assert.deepEqual(parseId('DA-007'), { prefix: 'DA', number: 7 });
  assert.equal(parseId('adr-1'), null);
  assert.equal(parseId(42), null);
});
