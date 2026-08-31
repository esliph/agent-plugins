import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInit } from '../../src/cli/init.ts';
import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OPTIONS = {
  owner: '@time',
  dryRun: false,
  stage: 'production' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
};

const WORKFLOW = '.github/workflows/living-docs.yml';

test('RF-0013: o init escreve o workflow de CI do estágio', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, OPTIONS);

    assert.ok(result.created.includes(WORKFLOW), JSON.stringify(result.created, null, 2));
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8');
    assert.match(yaml, /npx living-docs validate/);
    assert.match(yaml, /npx living-docs drift/);
    assert.match(yaml, /npx living-docs changelog --base/);
  });
});

test('RF-0013: o workflow instalado não impõe Docker a quem instala', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8');
    assert.doesNotMatch(yaml, /docker/i, 'RNF-0002 é regra deste toolkit, não do consumidor');
  });
});

test('RN-0025: o estágio solo instala validate e nada além', () => {
  withTempRepo({}, (root) => {
    runInit(root, { ...OPTIONS, stage: 'solo' });
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8');
    assert.match(yaml, /living-docs validate/);
    assert.doesNotMatch(yaml, /living-docs drift/);
    assert.doesNotMatch(yaml, /living-docs changelog/);
  });
});

test('RF-0013: workflow preexistente é mantido, e rodar duas vezes não duplica', () => {
  const meu = 'name: meu-ci\non:\n  push:\n';
  withTempRepo({ '.github/workflows/ci.yml': meu }, (root) => {
    runInit(root, OPTIONS);
    assert.equal(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), meu);

    const depois = readFileSync(join(root, WORKFLOW), 'utf8');
    const segunda = runInit(root, OPTIONS);
    assert.ok(segunda.skipped.includes(WORKFLOW));
    assert.equal(readFileSync(join(root, WORKFLOW), 'utf8'), depois);
  });
});
