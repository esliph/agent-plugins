import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInit } from '../../src/cli/init.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { RETIRED_IDS_PATH } from '../../src/ids/citations.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OPTIONS = { owner: '@team-platform', dryRun: false };

test('cria a moldura das fases 0–1 num repositório vazio — critério de aceite 1', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    const result = runInit(root, OPTIONS);

    for (const path of [OWNERSHIP_PATH, RETIRED_IDS_PATH, 'docs/open-decisions.md', 'CODEOWNERS']) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir`);
      assert.ok(result.created.includes(path));
    }
    assert.ok(existsSync(join(root, 'docs/decisions/adr')));
    assert.ok(existsSync(join(root, 'docs/decisions/debt')));

    const config = readFileSync(join(root, OWNERSHIP_PATH), 'utf8');
    assert.match(config, /@team-platform/);
    assert.doesNotMatch(config, /\{\{/);
  });
});

test('o repositório recém-inicializado passa no próprio validate', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    runInit(root, OPTIONS);
    const result = runValidate(root);
    assert.deepEqual(result.findings, []);
    assert.equal(result.exitCode, 0);
  });
});

test('é idempotente: a segunda execução não recria nem reescreve nada', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    runInit(root, OPTIONS);
    writeFileSync(join(root, 'docs/open-decisions.md'), 'CONTEÚDO DO USUÁRIO\n', 'utf8');

    const second = runInit(root, OPTIONS);
    assert.deepEqual(second.created, []);
    assert.deepEqual(second.adopted, [], 'a segunda execução lê os caminhos do .ownership.yml, não readota');
    assert.ok(second.skipped.includes('docs/open-decisions.md'));
    assert.equal(readFileSync(join(root, 'docs/open-decisions.md'), 'utf8'), 'CONTEÚDO DO USUÁRIO\n');
  });
});

test('adota diretório de ADR preexistente em vez de criar um paralelo', () => {
  withTempRepo({ 'docs/adr/0001-antigo.md': '# antigo\n' }, (root) => {
    const result = runInit(root, OPTIONS);

    assert.ok(result.adopted.some((entry) => entry.idPrefix === 'ADR' && entry.path === 'docs/adr/'));
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false);
    assert.match(readFileSync(join(root, OWNERSHIP_PATH), 'utf8'), /path: docs\/adr\//);
  });
});

test('adota arquivo de open decisions preexistente sob outro nome', () => {
  withTempRepo({ 'docs/decisoes-abertas.md': '# abertas\n', 'README.md': '' }, (root) => {
    const result = runInit(root, OPTIONS);
    assert.ok(result.adopted.some((entry) => entry.path === 'docs/decisoes-abertas.md'));
  });
});

test('dry-run não escreve nada mas relata o que faria', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    const result = runInit(root, { owner: '@team', dryRun: true });
    assert.ok(result.created.includes(OWNERSHIP_PATH));
    assert.equal(existsSync(join(root, OWNERSHIP_PATH)), false);
  });
});
