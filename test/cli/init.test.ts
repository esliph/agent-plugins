import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInit } from '../../src/cli/init.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { RETIRED_IDS_PATH } from '../../src/ids/citations.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OPTIONS = { owner: '@team-platform', dryRun: false, stage: 'solo' as const };

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

test('adoção + segunda execução: nada é readotado, duplicado nem reescrito', () => {
  withTempRepo({ 'docs/adr/0001-antigo.md': '# antigo\n', 'README.md': '' }, (root) => {
    const first = runInit(root, OPTIONS);
    assert.ok(first.adopted.some((entry) => entry.idPrefix === 'ADR' && entry.path === 'docs/adr/'));

    const config = readFileSync(join(root, OWNERSHIP_PATH), 'utf8');

    const second = runInit(root, OPTIONS);
    assert.deepEqual(second.adopted, [], 'os caminhos vêm do .ownership.yml, não de uma nova varredura');
    assert.deepEqual(second.created, [], 'a segunda execução não cria nada');
    assert.ok(second.skipped.includes('docs/adr/'), 'o diretório adotado é mantido, não recriado');

    // Nenhum paralelo criado, e nem o mapa nem o artefato preexistente reescritos.
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false);
    assert.equal(readFileSync(join(root, OWNERSHIP_PATH), 'utf8'), config);
    assert.equal(readFileSync(join(root, 'docs/adr/0001-antigo.md'), 'utf8'), '# antigo\n');
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
    const result = runInit(root, { owner: '@team', dryRun: true, stage: 'solo' as const });
    assert.ok(result.created.includes(OWNERSHIP_PATH));
    assert.equal(existsSync(join(root, OWNERSHIP_PATH)), false);
  });
});

const SMALL_TEAM = { owner: '@time', dryRun: false, stage: 'small-team' as const };
const REQUIREMENT_FILES = [
  'docs/requirements/functional.md',
  'docs/requirements/non-functional.md',
  'docs/requirements/rules.md',
];

test('RF-0003: --stage solo não cria requisitos', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    const result = runInit(root, OPTIONS);
    assert.equal(result.stage, 'solo');
    for (const file of REQUIREMENT_FILES) {
      assert.equal(existsSync(join(root, file)), false, `${file} não pertence ao estágio solo`);
    }
    assert.equal(readFileSync(join(root, OWNERSHIP_PATH), 'utf8').includes('id-prefix: RN'), false);
    assert.deepEqual(result.notInstalled, []);
  });
});

test('RF-0003: --stage small-team cria os três arquivos e as três entradas no .ownership.yml', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    runInit(root, SMALL_TEAM);
    for (const file of REQUIREMENT_FILES) {
      assert.ok(existsSync(join(root, file)), `${file} deveria existir no estágio small-team`);
    }

    const ownership = readFileSync(join(root, OWNERSHIP_PATH), 'utf8');
    for (const prefix of ['RF', 'RNF', 'RN']) {
      // O terminador de linha é o que impede `RN` de casar dentro de `RNF`.
      assert.ok(ownership.includes(`id-prefix: ${prefix}\n`), `${prefix} sem artefato declarado`);
    }
    assert.match(ownership, /collection: sections/);
    assert.match(ownership, /cited-by: \["test\/\*\*", "src\/\*\*"\]/);

    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8');
    assert.match(codeowners, /docs\/requirements\/rules\.md\s+@time/);

    // a moldura recém-criada passa nos próprios checks
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2));
  });
});

test('RF-0002: --stage small-team é idempotente: a segunda execução não reescreve nem duplica', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    runInit(root, SMALL_TEAM);
    const antes = REQUIREMENT_FILES.map((file) => readFileSync(join(root, file), 'utf8'));
    const ownershipAntes = readFileSync(join(root, OWNERSHIP_PATH), 'utf8');

    const segunda = runInit(root, SMALL_TEAM);
    assert.deepEqual(segunda.created, []);
    assert.deepEqual(
      REQUIREMENT_FILES.map((file) => readFileSync(join(root, file), 'utf8')),
      antes,
    );
    assert.equal(readFileSync(join(root, OWNERSHIP_PATH), 'utf8'), ownershipAntes);
  });
});

test('RF-0003: subir de solo para small-team declara os requisitos, sem tocar no que já existia', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    runInit(root, OPTIONS);
    const antes = readFileSync(join(root, OWNERSHIP_PATH), 'utf8');

    runInit(root, { ...SMALL_TEAM, owner: OPTIONS.owner });
    const depois = readFileSync(join(root, OWNERSHIP_PATH), 'utf8');

    assert.match(depois, /id-prefix: RN\b/);
    assert.ok(depois.includes('id-prefix: ADR'), 'o artefato que já existia não pode sumir');
    assert.ok(
      antes.split('\n').every((line) => depois.includes(line)),
      'nenhuma linha preexistente pode ser reescrita',
    );
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2));
  });
});

test('RF-0002: solo depois de small-team não remove os requisitos já criados', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    runInit(root, SMALL_TEAM);
    const result = runInit(root, { ...OPTIONS, owner: SMALL_TEAM.owner });

    assert.deepEqual(result.created, []);
    for (const file of REQUIREMENT_FILES) {
      assert.ok(existsSync(join(root, file)), `${file} não pode desaparecer ao rodar solo`);
    }
    assert.match(readFileSync(join(root, OWNERSHIP_PATH), 'utf8'), /id-prefix: RN\b/);
  });
});

test('adota docs/requisitos.md preexistente em vez de criar um paralelo', () => {
  withTempRepo({ 'docs/requisitos.md': '# requisitos antigos\n' }, (root) => {
    const result = runInit(root, SMALL_TEAM);

    assert.ok(
      result.adopted.some((entry) => entry.path === 'docs/requisitos.md'),
      JSON.stringify(result.adopted),
    );
    assert.equal(readFileSync(join(root, 'docs/requisitos.md'), 'utf8'), '# requisitos antigos\n');
    assert.equal(existsSync(join(root, 'docs/requirements/functional.md')), false);
    assert.match(readFileSync(join(root, OWNERSHIP_PATH), 'utf8'), /path: docs\/requisitos\.md/);
  });
});

test('RF-0003: o resultado lista o que não foi instalado, em vez de fingir o estágio completo', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    const result = runInit(root, SMALL_TEAM);
    assert.ok(result.notInstalled.length >= 2, JSON.stringify(result.notInstalled));
    assert.ok(result.notInstalled.some((item) => /Fase 3/.test(item)));
    assert.ok(result.notInstalled.some((item) => /Fase 4/.test(item)));
  });
});

test('a semente de requisitos não declara requisito nenhum — o exemplo é literal', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    runInit(root, SMALL_TEAM);
    const rules = readFileSync(join(root, 'docs/requirements/rules.md'), 'utf8');
    assert.match(rules, /RN-nnnn/, 'o exemplo precisa usar o placeholder literal');
    assert.doesNotMatch(rules, /RN-\d{3,4}/, 'a semente não pode nascer com um requisito fantasma');
    assert.equal(runValidate(root).exitCode, 0);
  });
});
