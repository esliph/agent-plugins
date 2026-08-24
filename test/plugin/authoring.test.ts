import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../../src/frontmatter/parse.ts';

const ROOT = process.env.LIVING_DOCS_ROOT ?? '/app';
const SKILL = readFileSync(join(ROOT, 'plugin/skills/decision-recorder/SKILL.md'), 'utf8');

test('a skill tem frontmatter com name e description', () => {
  const frontmatter = parseFrontmatter(SKILL);
  assert.ok(frontmatter);
  assert.equal(frontmatter.data.name, 'decision-recorder');
  assert.equal(typeof frontmatter.data.description, 'string');
});

test('a description é escrita em linguagem de sintoma, não de categoria', () => {
  const description = String(parseFrontmatter(SKILL)?.data.description ?? '');
  assert.ok(description.length > 120, 'description curta demais para ser encontrada quando importa');
  assert.match(description, /Use quando/i);
  for (const sintoma of ['por que', 'lacuna', 'dívida']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`);
  }
});

test('as seções da spec §11 estão presentes e na ordem', () => {
  const secoes = [
    '## Overview',
    '## Do que você é dono',
    '## Quando usar / quando não',
    '## Procedimento',
    '## Fronteiras',
    '## Checklist',
  ];
  let cursor = -1;
  for (const secao of secoes) {
    const at = SKILL.indexOf(secao);
    assert.ok(at !== -1, `seção ausente: ${secao}`);
    assert.ok(at > cursor, `seção fora de ordem: ${secao}`);
    cursor = at;
  }
});

test('o checklist tem caixas marcáveis e cada uma nomeia sua verificação', () => {
  const checklist = SKILL.slice(SKILL.indexOf('## Checklist'));
  const itens = checklist.split('\n').filter((line) => line.trim().startsWith('- [ ]'));
  assert.ok(itens.length >= 6, `checklist com apenas ${itens.length} itens`);
  for (const item of itens) {
    // "human" casa tanto "humano" quanto "humana" — a concordância de gênero em
    // português ("verificação humana") não deve ser tratada como item sem verificação.
    assert.match(item, /CI-\d|HK-\d|human/i, `item sem verificação nomeada: ${item}`);
  }
});

test('a skill não duplica o conteúdo dos artefatos que governa', () => {
  assert.doesNotMatch(SKILL, /^## Contexto$/m, 'a skill não deve conter o template do ADR');
  assert.match(SKILL, /templates\/adr\.md/, 'ela deve apontar para o template, não copiá-lo');
});

test('os quatro comandos existem, têm description e não contêm lógica própria', () => {
  const esperados = ['adr.md', 'open-decision.md', 'debt.md', 'docs-setup.md'];
  const encontrados = readdirSync(join(ROOT, 'plugin/commands')).sort();
  assert.deepEqual(encontrados, esperados.sort());

  for (const nome of esperados) {
    const source = readFileSync(join(ROOT, 'plugin/commands', nome), 'utf8');
    const frontmatter = parseFrontmatter(source);
    assert.ok(frontmatter, `${nome} sem frontmatter`);
    assert.equal(typeof frontmatter.data.description, 'string');
    assert.ok(source.split('\n').length < 25, `${nome} é longo demais para um atalho fino`);
    assert.match(source, /decision-recorder|living-docs-bootstrap/, `${nome} deve apontar a skill que aciona`);
  }
});
