import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyToolInput, diffDocument } from '../../../src/hooks/lib/edit.ts';

const DOC = [
  '---',
  'id: ADR-0001',
  'status: accepted',
  'superseded-by: null',
  '---',
  '',
  '## Contexto',
  'texto original',
].join('\n');

test('Write devolve o conteúdo inteiro', () => {
  assert.equal(applyToolInput(DOC, { content: 'novo' }), 'novo');
});

test('Edit projeta a substituição sobre o conteúdo atual', () => {
  const result = applyToolInput(DOC, { old_string: 'texto original', new_string: 'texto novo' });
  assert.match(result ?? '', /texto novo/);
  assert.doesNotMatch(result ?? '', /texto original/);
});

test('Edit com replace_all substitui todas as ocorrências', () => {
  const result = applyToolInput('a a a', { old_string: 'a', new_string: 'b', replace_all: true });
  assert.equal(result, 'b b b');
});

test('Edit cujo old_string não existe devolve null — não dá para prever', () => {
  assert.equal(applyToolInput(DOC, { old_string: 'inexistente', new_string: 'x' }), null);
});

test('tool_input sem content nem old_string devolve null', () => {
  assert.equal(applyToolInput(DOC, {}), null);
});

test('diffDocument isola campos alterados do corpo alterado', () => {
  const after = DOC.replace('status: accepted', 'status: superseded').replace(
    'superseded-by: null',
    'superseded-by: ADR-0002',
  );
  assert.deepEqual(diffDocument(DOC, after), {
    changedFields: ['status', 'superseded-by'],
    bodyChanged: false,
  });
});

test('diffDocument detecta alteração de corpo', () => {
  const after = DOC.replace('texto original', 'texto adulterado');
  const diff = diffDocument(DOC, after);
  assert.deepEqual(diff.changedFields, []);
  assert.equal(diff.bodyChanged, true);
});

test('campo adicionado ou removido conta como campo alterado', () => {
  const added = DOC.replace('status: accepted', 'status: accepted\nlast-reviewed: 2026-08-24');
  assert.deepEqual(diffDocument(DOC, added).changedFields, ['last-reviewed']);
  const removed = DOC.replace('superseded-by: null\n', '');
  assert.deepEqual(diffDocument(DOC, removed).changedFields, ['superseded-by']);
});

test('diferença só de espaço em branco no fim do corpo não conta', () => {
  assert.equal(diffDocument(DOC, `${DOC}\n\n`).bodyChanged, false);
});

test('perder o frontmatter conta como corpo alterado', () => {
  assert.equal(diffDocument(DOC, '# sem frontmatter').bodyChanged, true);
});
