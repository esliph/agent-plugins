import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asIsoDate, monthsBetween, todayIso } from '../../src/core/dates.ts';

test('RNF-0004: todayIso lê o relógio que recebe, não o do sistema', () => {
  const fixo = () => new Date('2026-08-27T13:45:00Z');
  assert.equal(todayIso(fixo), '2026-08-27');
  // sem clock, ainda é ISO de dez caracteres — o formato é o contrato
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/);
});

test('asIsoDate aceita string ISO e Date, e recusa o resto', () => {
  assert.equal(asIsoDate('2026-08-27'), '2026-08-27');
  assert.equal(asIsoDate('  2026-08-27  '), '2026-08-27');
  assert.equal(asIsoDate(new Date('2026-08-27T00:00:00Z')), '2026-08-27');
  assert.equal(asIsoDate('27/08/2026'), null);
  assert.equal(asIsoDate('em breve'), null);
  assert.equal(asIsoDate(undefined), null);
  assert.equal(asIsoDate(42), null);
  assert.equal(asIsoDate(new Date('não é data')), null);
});

test('monthsBetween conta meses de calendário e respeita o dia', () => {
  assert.equal(monthsBetween('2026-01-15', '2026-07-15'), 6);
  assert.equal(monthsBetween('2026-01-15', '2026-07-14'), 5, 'faltando um dia, ainda não fez seis meses');
  assert.equal(monthsBetween('2026-01-15', '2026-07-16'), 6);
  assert.equal(monthsBetween('2025-12-31', '2026-01-01'), 0);
  assert.equal(monthsBetween('2026-08-27', '2026-08-27'), 0);
});

test('monthsBetween devolve negativo para data no futuro e null para o que não é data', () => {
  assert.equal(monthsBetween('2027-01-01', '2026-08-27'), -4);
  assert.equal(monthsBetween('amanhã', '2026-08-27'), null);
  assert.equal(monthsBetween('2026-08-27', ''), null);
});
