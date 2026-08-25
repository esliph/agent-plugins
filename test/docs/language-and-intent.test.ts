import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toolkitRoot } from '../../src/core/roots.ts';

const ROOT = toolkitRoot();

/**
 * Linhas de uma tabela markdown, sem cabeçalho nem separador. Só o que começa
 * com `|` entra: prosa depois da tabela não pode virar um termo fantasma.
 */
function rows(source: string, header: string): string[][] {
  const start = source.indexOf(header);
  assert.ok(start !== -1, `tabela não encontrada — esperava o cabeçalho ${header}`);
  return source
    .slice(start)
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .slice(2) // cabeçalho + separador
    .map((line) =>
      line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()),
    );
}

const GLOSSARY_HEADER = '| Termo |';
const glossary = (): string => readFileSync(join(ROOT, 'docs/glossary.md'), 'utf8');

test('RN-0011: todo termo do glossary tem um nome único, e nenhum tem ID numerado', () => {
  const source = glossary();
  const entries = rows(source, GLOSSARY_HEADER);

  const nomes = entries.map((row) => row[0]);
  assert.ok(nomes.length >= 5, `esperava ao menos 5 termos, achei ${nomes.length}`);
  assert.equal(new Set(nomes).size, nomes.length, 'há termo com nome duplicado');

  const start = source.indexOf(GLOSSARY_HEADER);
  const header = source.slice(start, source.indexOf('\n', start));
  assert.doesNotMatch(
    header,
    /\|\s*ID\s*\|/i,
    'a tabela não tem coluna de ID — o termo é identificado pelo nome (RN-0011)',
  );

  for (const row of entries) {
    const status = row[row.length - 1] ?? '';
    // `renamed(para X)` é o estado com destino; a spec §4 o escreve assim.
    assert.match(
      status,
      /^(active|banned|renamed(\(para .+\))?)$/,
      `status "${status}" fora do ciclo de vida do termo (RN-0011)`,
    );
  }
});

test('RN-0011: todo termo aponta a fonte que o define', () => {
  for (const row of rows(glossary(), GLOSSARY_HEADER)) {
    assert.notEqual(row[4] ?? '', '', `termo "${row[0]}" sem fonte`);
  }
});

test('a Constitution: todo princípio nomeia o que o verifica', () => {
  const source = readFileSync(join(ROOT, 'docs/charter/constitution.md'), 'utf8');
  const secao = source.slice(source.indexOf('## Princípios'), source.indexOf('## Log de emendas'));
  const principios = secao.split('\n').filter((line) => /^\d+\./.test(line.trim()));
  assert.ok(principios.length >= 3, `esperava ao menos 3 princípios, achei ${principios.length}`);
  for (const principio of principios) {
    assert.match(principio, /verificado por/, `princípio sem enforcement nomeado — ${principio}`);
  }
});

test('a Constitution tem log de emendas — emenda é append, nunca reescrita no lugar', () => {
  const source = readFileSync(join(ROOT, 'docs/charter/constitution.md'), 'utf8');
  assert.match(source, /## Log de emendas/);
});

test('a Vision responde só as três perguntas da spec §5', () => {
  const source = readFileSync(join(ROOT, 'docs/charter/vision.md'), 'utf8');
  for (const pergunta of ['Que problema', 'Para quem', 'Métrica de sucesso']) {
    assert.match(source, new RegExp(`\\*\\*${pergunta}:\\*\\*`), `Vision sem a pergunta "${pergunta}"`);
  }
});

test('RN-0001: glossary e charter têm dono no CODEOWNERS, como todo artefato', () => {
  const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8');
  assert.match(codeowners, /^docs\/glossary\.md\s+@\S+$/m);
  assert.match(codeowners, /^docs\/charter\/\s+@\S+$/m);
});
