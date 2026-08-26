import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKS, CHECK_CATALOG, changelogChecks, driftChecks } from '../../src/checks/registry.ts';

test('RF-0006 e RF-0008: o catálogo cobre exatamente os checks que existem, com os mesmos nomes', () => {
  const reais = [...CHECKS, ...driftChecks(() => ''), ...changelogChecks()].map(
    (check) => `${check.id}|${check.name}`,
  );
  const catalogados = CHECK_CATALOG.map((entry) => `${entry.id}|${entry.name}`);
  assert.deepEqual(catalogados, reais, 'catálogo e registry divergiram — o contrato gerado mentiria');
});

test('RF-0006: todo item do catálogo diz quando falha e por qual comando roda', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} sem condição de falha escrita`);
    assert.match(
      entry.command,
      /^living-docs (validate|drift|changelog --base <ref>)$/,
      `${entry.id} com comando estranho`,
    );
  }
});

test('ADR-0005 e ADR-0006: cada check roda no comando que o catálogo nomeia', () => {
  const esperado: Record<string, string> = {
    'CI-1': 'living-docs validate',
    'CI-2': 'living-docs validate',
    'CI-3': 'living-docs validate',
    'CI-5': 'living-docs drift',
    'CI-6': 'living-docs changelog --base <ref>',
  };

  for (const entry of CHECK_CATALOG) {
    assert.equal(entry.command, esperado[entry.id], `${entry.id} no comando errado`);
  }
  assert.equal(CHECK_CATALOG.length, Object.keys(esperado).length, 'check novo sem comando esperado declarado');
});
