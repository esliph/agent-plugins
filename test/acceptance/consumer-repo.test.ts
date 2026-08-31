import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runInit } from '../../src/cli/init.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts';
import { toolkitRoot } from '../../src/core/roots.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OPTIONS = { owner: '@consumidor', dryRun: false, stage: 'solo' as const, idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', marketplace: 'time/living-docs' };

test('DA-0001/RNF-0003: init escreve no repositório validado, nunca no toolkit', () => {
  const antes = readdirSync(toolkitRoot()).sort();

  withTempRepo({ 'README.md': '# projeto alheio\n' }, (root) => {
    assert.notEqual(root, toolkitRoot());

    const result = runInit(root, OPTIONS);
    assert.ok(result.created.includes('docs/.ownership.yml'));
    assert.ok(existsSync(join(root, 'docs/.ownership.yml')));
    assert.ok(existsSync(join(root, 'docs/open-decisions.md')));

    // os templates vieram do toolkit, e o toolkit não ganhou arquivo nenhum
    assert.ok(readFileSync(join(root, 'docs/.ownership.yml'), 'utf8').includes('@consumidor'));
    assert.deepEqual(readdirSync(toolkitRoot()).sort(), antes);
  });
});

test('DA-0001/RNF-0003: validate roda contra a configuração do repositório validado', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    assert.equal(runValidate(root).exitCode, 0);

    // uma violação plantada lá aparece lá, com o caminho relativo àquele repo
    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true });
    writeFileSync(
      join(root, 'docs/decisions/adr/ADR-0001-x.md'),
      ['---', 'id: ADR-0001', 'title: X', 'status: draft', 'owner: "@consumidor"',
       'trigger: revisar trimestralmente', 'last-reviewed: 2026-08-24', '---', '', 'corpo'].join('\n'),
      'utf8',
    );

    const result = runValidate(root);
    assert.equal(result.exitCode, 1);
    assert.ok(result.findings.some((f) => f.file === 'docs/decisions/adr/ADR-0001-x.md'));
  });
});

test('DA-0001/RNF-0003: o hook decide pela configuração do repositório validado', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    const file = 'docs/decisions/adr/ADR-0001-congelado.md';
    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true });
    writeFileSync(
      join(root, file),
      ['---', 'id: ADR-0001', 'title: Congelado', 'status: accepted', 'owner: "@consumidor"',
       'trigger: Nunca.', 'last-reviewed: 2026-08-24', '---', '', 'corpo original'].join('\n'),
      'utf8',
    );

    const decision = decideHk1(
      { tool_name: 'Edit', tool_input: { file_path: file, old_string: 'corpo original', new_string: 'outro' } },
      { root, hostRoots: [root] },
    );
    assert.equal(decision.action, 'deny');
  });
});
