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
  marketplace: 'time/living-docs' as string | null,
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

test('critério 3: sem enforcement, o init deixa workflow e registro de plugin — e rodar de novo não duplica', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);

    assert.ok(existsSync(join(root, WORKFLOW)));
    const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<
      string,
      Record<string, unknown>
    >;
    assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true);

    const antes = readFileSync(join(root, '.claude/settings.json'), 'utf8');
    const segunda = runInit(root, OPTIONS);
    assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), antes);
    assert.ok(segunda.skipped.includes('.claude/settings.json'));
  });
});

test('critério 4: hooks e workflows próprios continuam lá, e o do toolkit foi acrescentado', () => {
  const meusHooks = JSON.stringify(
    { hooks: { PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: './formata.sh' }] }] } },
    null,
    2,
  );

  withTempRepo(
    { '.claude/settings.json': meusHooks, '.github/workflows/ci.yml': 'name: meu-ci\non:\n  push:\n' },
    (root) => {
      runInit(root, OPTIONS);

      const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<
        string,
        Record<string, unknown>
      >;
      assert.ok(settings.hooks, 'nenhum hook do consumidor pode ser perdido');
      assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true);
      assert.match(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), /meu-ci/);
      assert.ok(existsSync(join(root, WORKFLOW)));
    },
  );
});

test('RF-0013: sem --marketplace, o registro não é inventado — é relatado', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, { ...OPTIONS, marketplace: null });
    assert.equal(existsSync(join(root, '.claude/settings.json')), false);
    assert.ok(result.notInstalled.some((linha) => linha.includes('DA-0003')));
  });
});
