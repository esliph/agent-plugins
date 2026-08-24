import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, FrontmatterSyntaxError } from '../../src/frontmatter/parse.ts';

const DOC = [
  '---',
  'id: ADR-0042',
  'title: Fila de eventos',
  'status: accepted',
  'relates-to: [RN-014, DA-0007]',
  '---',
  '',
  '## Contexto',
  'texto',
  '',
].join('\n');

test('extrai os dados do bloco YAML', () => {
  const fm = parseFrontmatter(DOC);
  assert.ok(fm);
  assert.equal(fm.data.id, 'ADR-0042');
  assert.equal(fm.data.status, 'accepted');
  assert.deepEqual(fm.data['relates-to'], ['RN-014', 'DA-0007']);
});

test('mapeia cada chave de topo para sua linha 1-indexed no arquivo', () => {
  const fm = parseFrontmatter(DOC);
  assert.ok(fm);
  assert.equal(fm.lines.id, 2);
  assert.equal(fm.lines.status, 4);
  assert.equal(fm.lines['relates-to'], 5);
});

test('marca o fim do bloco e devolve o corpo separado', () => {
  const fm = parseFrontmatter(DOC);
  assert.ok(fm);
  assert.equal(fm.endLine, 6);
  assert.equal(fm.bodyStartLine, 7);
  assert.match(fm.body, /## Contexto/);
  assert.doesNotMatch(fm.body, /ADR-0042/);
});

test('devolve null quando o arquivo não abre com ---', () => {
  assert.equal(parseFrontmatter('# Só um título\n'), null);
});

test('devolve null quando o bloco nunca fecha', () => {
  assert.equal(parseFrontmatter('---\nid: ADR-1\nsem fechamento\n'), null);
});

test('aceita CRLF e BOM', () => {
  const fm = parseFrontmatter('﻿---\r\nid: ADR-1\r\n---\r\ncorpo\r\n');
  assert.ok(fm);
  assert.equal(fm.data.id, 'ADR-1');
  assert.equal(fm.lines.id, 2);
});

test('lança FrontmatterSyntaxError com a linha quando o YAML é inválido', () => {
  const bad = '---\nid: "unterminated\nstatus: accepted\n---\ncorpo\n';
  assert.throws(
    () => parseFrontmatter(bad),
    (err: unknown) => err instanceof FrontmatterSyntaxError && err.line >= 1,
  );
});

test('bloco vazio produz data vazio, não erro', () => {
  const fm = parseFrontmatter('---\n---\ncorpo\n');
  assert.ok(fm);
  assert.deepEqual(fm.data, {});
  assert.equal(fm.endLine, 2);
});
