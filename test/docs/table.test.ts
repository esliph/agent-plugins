import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemTable } from '../../src/docs/table.ts';

const BODY = [
  '# Open Decisions',
  '',
  'Lacunas conhecidas que bloqueiam implementação.',
  '',
  '| ID | Lacuna | Status | Resolvida por |',
  '| --- | --- | --- | --- |',
  '| DA-0001 | Como cobrar reembolso parcial | open | — |',
  '| DA-0002 | Fuso do fechamento mensal | resolved | ADR-0007 |',
  '',
  'Outro parágrafo.',
].join('\n');

test('extrai id, status e linha de cada item', () => {
  const items = parseItemTable(BODY, 10);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    id: 'DA-0001',
    status: 'open',
    line: 16,
    fields: { id: 'DA-0001', lacuna: 'Como cobrar reembolso parcial', status: 'open', 'resolvida por': '—' },
  });
  assert.deepEqual(items[1], {
    id: 'DA-0002',
    status: 'resolved',
    line: 17,
    fields: { id: 'DA-0002', lacuna: 'Fuso do fechamento mensal', status: 'resolved', 'resolvida por': 'ADR-0007' },
  });
});

test('para de ler ao fim da tabela', () => {
  const items = parseItemTable(BODY, 1);
  assert.equal(items.length, 2);
});

test('devolve lista vazia quando não há tabela com colunas ID e Status', () => {
  assert.deepEqual(parseItemTable('| Termo | Definição |\n| --- | --- |\n| x | y |\n', 1), []);
  assert.deepEqual(parseItemTable('sem tabela nenhuma', 1), []);
});

test('ignora linhas cuja primeira célula não é um ID', () => {
  const source = '| ID | Status |\n| --- | --- |\n| DA-0001 | open |\n| total | 1 |\n';
  const items = parseItemTable(source, 1);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.id, 'DA-0001');
});

test('o item traz todas as colunas, normalizadas', () => {
  const items = parseItemTable(
    [
      '| ID | Lacuna | Status | Resolvida por |',
      '| --- | --- | --- | --- |',
      '| DA-0001 | X | resolved | ADR-0007 |',
    ].join('\n'),
    1,
  );
  assert.equal(items[0]?.fields['resolvida por'], 'ADR-0007');
  assert.equal(items[0]?.fields['lacuna'], 'X');
});
