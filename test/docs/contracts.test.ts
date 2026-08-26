import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toolkitRoot } from '../../src/core/roots.ts';

const ROOT = toolkitRoot();

/** Linhas de uma tabela markdown, sem cabeçalho nem separador. */
function rows(source: string, header: string): string[][] {
  const start = source.indexOf(header);
  assert.ok(start !== -1, `tabela não encontrada — esperava o cabeçalho ${header}`);
  return source
    .slice(start)
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .slice(2)
    .map((line) =>
      line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()),
    );
}

const errors = (): string => readFileSync(join(ROOT, 'docs/contracts/errors.md'), 'utf8');

test('o catálogo de erros lista códigos reais, cada um com significado, gatilho e status', () => {
  const entries = rows(errors(), '| Código |');
  assert.ok(entries.length >= 4, `esperava ao menos 4 códigos, achei ${entries.length}`);

  const codigos = entries.map((row) => row[0]);
  assert.equal(new Set(codigos).size, codigos.length, 'há código duplicado — um código, um significado');

  for (const row of entries) {
    assert.notEqual(row[1] ?? '', '', `código "${row[0]}" sem significado`);
    assert.notEqual(row[2] ?? '', '', `código "${row[0]}" sem "quando ocorre"`);
    const status = row[row.length - 1] ?? '';
    assert.match(status, /^(active|deprecated|removed)/, `status "${status}" fora do ciclo de vida (spec §4)`);
  }
});

test('o catálogo de erros não duplica a tabela de checks — ela é gerada e mora em outro arquivo', () => {
  assert.doesNotMatch(errors(), /\bCI-1\b.*\bstructure lint\b/, 'os IDs de check moram em docs/contracts/checks.gen.md');
  assert.match(errors(), /checks\.gen\.md/, 'e este arquivo deve apontar para lá');
});

test('a política de versionamento responde o que é público, o que não muda e como se deprecia', () => {
  const source = readFileSync(join(ROOT, 'docs/contracts/versioning-policy.md'), 'utf8');
  for (const secao of ['## O que é público', '## O que nunca muda de significado', '## Como se deprecia']) {
    assert.ok(source.includes(secao), `política sem a seção "${secao}"`);
  }
});

test('RN-0001: os contratos têm dono no CODEOWNERS, como todo artefato', () => {
  const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8');
  assert.match(codeowners, /^docs\/contracts\/\s+@\S+$/m);
});
