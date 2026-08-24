import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot, templatesDir, toolkitRoot } from '../../src/core/roots.ts';

test('toolkitRoot aponta para o checkout do toolkit', () => {
  assert.ok(existsSync(join(toolkitRoot(), 'package.json')));
  assert.ok(existsSync(join(templatesDir(), 'adr.md')));
});

test('RNF-0003: repoRoot respeita LIVING_DOCS_REPO_ROOT e não move toolkitRoot', () => {
  const antes = toolkitRoot();
  const anterior = process.env.LIVING_DOCS_REPO_ROOT;
  process.env.LIVING_DOCS_REPO_ROOT = '/tmp/outro-projeto';
  try {
    assert.equal(repoRoot(), '/tmp/outro-projeto');
    assert.equal(toolkitRoot(), antes, 'a raiz do toolkit não pode seguir a do repositório (ADR-0003)');
  } finally {
    if (anterior === undefined) delete process.env.LIVING_DOCS_REPO_ROOT;
    else process.env.LIVING_DOCS_REPO_ROOT = anterior;
  }
});

test('RNF-0003: nenhum caminho absoluto de container está embutido em src/ ou test/', () => {
  // Montados por concatenação de propósito: escrito inteiro, este array
  // reprovaria o próprio arquivo que o contém.
  const proibidos = ['/' + 'app', '/' + 'workspace', '/' + 'opt/living-docs'];
  const ofensas: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(toolkitRoot(), dir))) {
      const relative = `${dir}/${entry}`;
      if (statSync(join(toolkitRoot(), relative)).isDirectory()) {
        walk(relative);
        continue;
      }
      if (!entry.endsWith('.ts')) continue;
      const source = readFileSync(join(toolkitRoot(), relative), 'utf8');
      for (const proibido of proibidos) {
        if (source.includes(`'${proibido}`) || source.includes(`"${proibido}`)) {
          ofensas.push(`${relative}: ${proibido}`);
        }
      }
    }
  };

  walk('src');
  walk('test');
  assert.deepEqual(ofensas, [], 'caminho de container só pode aparecer em Dockerfile, compose e wrappers (ADR-0003)');
});

test('RNF-0003: o container declara as duas raízes, e elas são distintas', () => {
  // Substitui a antiga asserção "o repositório está montado em /app", que
  // afirmava a raiz única que ADR-0003 aboliu. Nada roda no host (ADR-0001),
  // então estas variáveis sempre existem quando o teste roda.
  const toolkit = process.env.LIVING_DOCS_TOOLKIT_ROOT;
  const repo = process.env.LIVING_DOCS_REPO_ROOT;
  assert.equal(typeof toolkit, 'string');
  assert.equal(typeof repo, 'string');
  assert.notEqual(toolkit, repo, 'toolkit e repositório validado não podem compartilhar o caminho (ADR-0003)');
});
