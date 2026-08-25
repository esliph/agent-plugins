import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../../src/frontmatter/parse.ts';
import { toolkitRoot } from '../../src/core/roots.ts';

const ROOT = toolkitRoot();

/**
 * Varredura, não lista fixa: uma skill nova precisa entrar nas convenções da
 * spec §11 no dia em que nasce, sem ninguém lembrar de acrescentá-la aqui.
 */
const SKILLS = readdirSync(join(ROOT, 'plugin/skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function skillSource(name: string): string {
  return readFileSync(join(ROOT, 'plugin/skills', name, 'SKILL.md'), 'utf8');
}

test('há skills para verificar', () => {
  assert.ok(SKILLS.length >= 3, `esperava ao menos 3 skills, achei ${SKILLS.length}`);
});

for (const name of SKILLS) {
  test(`${name}: frontmatter com name casando com o diretório e description`, () => {
    const frontmatter = parseFrontmatter(skillSource(name));
    assert.ok(frontmatter, `${name} sem frontmatter`);
    assert.equal(frontmatter.data.name, name);
    assert.equal(typeof frontmatter.data.description, 'string');
  });

  test(`${name}: a description é escrita em linguagem de sintoma, não de categoria`, () => {
    const description = String(parseFrontmatter(skillSource(name))?.data.description ?? '');
    assert.ok(description.length > 120, `${name}: description curta demais para ser encontrada quando importa`);
    assert.match(description, /\bUse\b/i, `${name}: a description precisa dizer quando usar`);
  });

  test(`${name}: as seções da spec §11 estão presentes e na ordem`, () => {
    const source = skillSource(name);
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
      const at = source.indexOf(secao);
      assert.ok(at !== -1, `${name}: seção ausente — ${secao}`);
      assert.ok(at > cursor, `${name}: seção fora de ordem — ${secao}`);
      cursor = at;
    }
  });

  test(`${name}: o checklist tem caixas marcáveis e cada uma nomeia sua verificação`, () => {
    const source = skillSource(name);
    const checklist = source.slice(source.indexOf('## Checklist'));
    const itens = checklist.split('\n').filter((line) => line.trim().startsWith('- [ ]'));
    assert.ok(itens.length >= 6, `${name}: checklist com apenas ${itens.length} itens`);
    for (const item of itens) {
      // "human" casa tanto "humano" quanto "humana" — a concordância de gênero em
      // português ("verificação humana") não deve ser tratada como item sem verificação.
      assert.match(item, /CI-\d|HK-\d|human/i, `${name}: item sem verificação nomeada — ${item}`);
    }
  });
}

test('decision-recorder: a description nomeia os sintomas de decisão, lacuna e dívida', () => {
  const description = String(parseFrontmatter(skillSource('decision-recorder'))?.data.description ?? '');
  assert.match(description, /Use quando/i);
  for (const sintoma of ['por que', 'lacuna', 'dívida']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`);
  }
});

test('decision-recorder não duplica o conteúdo dos artefatos que governa', () => {
  const source = skillSource('decision-recorder');
  assert.doesNotMatch(source, /^## Contexto$/m, 'a skill não deve conter o template do ADR');
  assert.match(source, /templates\/adr\.md/, 'ela deve apontar para o template, não copiá-lo');
});

test('requirements-keeper: a description fala em sintoma, não em categoria', () => {
  const description = String(parseFrontmatter(skillSource('requirements-keeper'))?.data.description ?? '');
  assert.ok(description.length > 120);
  for (const sintoma of ['qual é a regra', 'deve fazer', 'especificad']) {
    assert.ok(description.toLowerCase().includes(sintoma), `description sem o sintoma "${sintoma}"`);
  }
});

test('requirements-keeper não duplica o formato do requisito', () => {
  const source = skillSource('requirements-keeper');
  assert.match(source, /templates\/requirements\.md/);
  assert.doesNotMatch(source, /^- \*\*status:\*\*/m, 'a skill não deve conter o template do requisito');
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

test('working-agreements-keeper: a description nomeia o erro por falta de contexto', () => {
  const description = String(parseFrontmatter(skillSource('working-agreements-keeper'))?.data.description ?? '');
  assert.match(description, /Use quando/i);
  for (const sintoma of ['falta de contexto', 'não estava escrito', 'pronto']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`);
  }
});

test('working-agreements-keeper não duplica o conteúdo dos acordos que governa', () => {
  const source = skillSource('working-agreements-keeper');
  assert.match(source, /templates\/definition-of-done\.md/, 'ela deve apontar para o template, não copiá-lo');
  assert.doesNotMatch(source, /^- \[ \] `npm test`/m, 'a skill não deve conter a DoD');
});
