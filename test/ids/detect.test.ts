import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectIdFormat } from '../../src/ids/detect.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const SEM_HIFEN = [
  '# Regras',
  '',
  '## RN001 — Uma regra',
  '- **status:** active',
  '',
  '## RN002 — Outra',
  '- **status:** active',
  '',
  '## RN003 — Mais uma',
  '- **status:** active',
  '',
].join('\n');

test('RF-0014: a varredura relata a forma dominante e quantos itens leu nela', () => {
  withTempRepo({ 'docs/business-rules.md': SEM_HIFEN }, (root) => {
    const detected = detectIdFormat(root, ['docs/business-rules.md']);
    assert.ok(detected);
    assert.deepEqual(detected.format, { separator: '', padding: 3 });
    assert.equal(detected.count, 3);
    assert.equal(detected.sample, 'RN001');
  });
});

test('RF-0014: repositório sem ID nenhum não inventa forma', () => {
  withTempRepo({ 'docs/vazio.md': '# nada aqui\n' }, (root) => {
    assert.equal(detectIdFormat(root, ['docs/vazio.md']), null);
  });
});

test('RF-0014: a forma padrão é detectada como padrão', () => {
  withTempRepo({ 'docs/adr/ADR-0001-x.md': '---\nid: ADR-0001\n---\n\n# ADR-0001\n' }, (root) => {
    const detected = detectIdFormat(root, ['docs/adr/']);
    assert.ok(detected);
    assert.deepEqual(detected.format, { separator: '-', padding: 4 });
  });
});
