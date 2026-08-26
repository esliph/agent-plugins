import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKS, CHECK_CATALOG, driftChecks } from '../../src/checks/registry.ts';

test('RF-0006: o catálogo cobre exatamente os checks que existem, com os mesmos nomes', () => {
  const reais = [...CHECKS, ...driftChecks(() => '')].map((check) => `${check.id}|${check.name}`);
  const catalogados = CHECK_CATALOG.map((entry) => `${entry.id}|${entry.name}`);
  assert.deepEqual(catalogados, reais, 'catálogo e registry divergiram — o contrato gerado mentiria');
});

test('RF-0006: todo item do catálogo diz quando falha e por qual comando roda', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} sem condição de falha escrita`);
    assert.match(entry.command, /^living-docs (validate|drift)$/, `${entry.id} com comando estranho`);
  }
});

test('ADR-0005: só CI-5 roda fora do validate', () => {
  for (const entry of CHECK_CATALOG) {
    const esperado = entry.id === 'CI-5' ? 'living-docs drift' : 'living-docs validate';
    assert.equal(entry.command, esperado, `${entry.id} no comando errado`);
  }
});
