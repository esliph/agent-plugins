import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemSections } from '../../src/docs/sections.ts';

const SOURCE = [
  '# Regras de negócio',
  '',
  '## RN-0001 — Todo artefato tem exatamente um dono',
  '',
  '- **status:** active',
  '- **relates-to:** ADR-0002',
  '',
  'Enunciado da regra.',
  '',
  '## RN-0002 — Regra revogada',
  '',
  '- **status:** revoked',
  '- **revoked-by:** RN-0001',
  '',
].join('\n');

test('lê id, título, status e campos de cada seção', () => {
  const items = parseItemSections(SOURCE, 1);
  assert.equal(items.length, 2);
  assert.equal(items[0]?.id, 'RN-0001');
  assert.equal(items[0]?.status, 'active');
  assert.equal(items[0]?.fields.title, 'Todo artefato tem exatamente um dono');
  assert.equal(items[0]?.fields['relates-to'], 'ADR-0002');
  assert.equal(items[1]?.fields['revoked-by'], 'RN-0001');
});

test('a linha aponta o título da seção, deslocada por startLine', () => {
  assert.equal(parseItemSections(SOURCE, 10)[0]?.line, 12);
});

test('seção sem status devolve status vazio — quem reclama é CI-1', () => {
  const items = parseItemSections('## RN-0009 — Sem metadados\n\nCorpo.\n', 1);
  assert.equal(items[0]?.status, '');
});

test('título que não começa com ID é ignorado', () => {
  assert.deepEqual(parseItemSections('## Introdução\n\n- **status:** active\n', 1), []);
});

test('exemplo dentro de bloco de código não declara requisito', () => {
  const source = [
    '# Regras',
    '',
    'Formato de uma seção:',
    '',
    '```',
    '## RN-0001 — Título afirmativo',
    '',
    '- **status:** draft',
    '```',
    '',
    '## RN-0001 — A regra de verdade',
    '',
    '- **status:** draft',
  ].join('\n');
  const items = parseItemSections(source, 1);
  assert.equal(items.length, 1, 'o exemplo cercado por ``` não pode virar um segundo RN-0001');
  assert.equal(items[0]?.line, 11);
});

test('RN-0024: o título com ID é lido na forma escrita do projeto', () => {
  const semHifen = ['## RN001 — Uma regra', '', '- **status:** active', ''].join('\n');
  const format = { separator: '', padding: 3 };

  const items = parseItemSections(semHifen, 1, format);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.id, 'RN001');
  assert.equal(items[0]?.status, 'active');
  assert.equal(items[0]?.fields.title, 'Uma regra');

  assert.deepEqual(parseItemSections(semHifen, 1), [], 'a forma padrão não reconhece a do projeto');
});
