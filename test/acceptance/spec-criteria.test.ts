import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runInit } from '../../src/cli/init.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts';
import { decideHk3 } from '../../src/hooks/hk3-state-promotion.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import { repoRoot } from '../../src/core/roots.ts';

const ROOT = repoRoot();
const OPTIONS = { owner: '@team', dryRun: false };

function seedAdr(root: string, status: string): string {
  const file = 'docs/decisions/adr/ADR-0001-teste.md';
  const content = [
    '---',
    'id: ADR-0001',
    'title: Decisão de teste',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Nunca. Imutável após aceito.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    'corpo original',
  ].join('\n');
  mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true });
  writeFileSync(join(root, file), content, 'utf8');
  return file;
}

test('critério 1: SK-0 num repositório sem documentação viva não duplica nada', () => {
  withTempRepo({ 'docs/adr/0001-preexistente.md': '# antigo\n' }, (root) => {
    const result = runInit(root, OPTIONS);
    assert.ok(result.adopted.some((entry) => entry.path === 'docs/adr/'));
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false);
    assert.equal(readFileSync(join(root, 'docs/adr/0001-preexistente.md'), 'utf8'), '# antigo\n');
  });
});

test('critério 2: HK-1 nega alterar o corpo de um ADR accepted e permite supersedir', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    const file = seedAdr(root, 'accepted');
    const env = { root, hostRoots: [root] };

    const negado = decideHk1(
      { tool_name: 'Edit', tool_input: { file_path: file, old_string: 'corpo original', new_string: 'corpo novo' } },
      env,
    );
    assert.equal(negado.action, 'deny');

    const atual = readFileSync(join(root, file), 'utf8');
    const supersedido = atual
      .replace('status: accepted', 'status: superseded')
      .replace('last-reviewed: 2026-08-24', 'last-reviewed: 2026-08-24\nsuperseded-by: ADR-0002');
    const permitido = decideHk1({ tool_name: 'Write', tool_input: { file_path: file, content: supersedido } }, env);
    assert.equal(permitido.action, 'allow');
  });
});

test('critério 3: trigger com cadência falha no CI nomeando o campo', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    const file = seedAdr(root, 'draft');
    writeFileSync(
      join(root, file),
      readFileSync(join(root, file), 'utf8').replace(
        'trigger: Nunca. Imutável após aceito.',
        'trigger: revisar trimestralmente',
      ),
      'utf8',
    );

    const result = runValidate(root);
    assert.equal(result.exitCode, 1);
    const finding = result.findings.find((f) => f.ruleId === 'CI-1' && /trigger/.test(f.message));
    assert.ok(finding, 'CI-1 deveria acusar o campo trigger');
    assert.match(finding.message, /trimestral/i);
  });
});

test('HK-3 pergunta ao promover uma decisão sem ato humano (mecanismo do spec §4)', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    const file = seedAdr(root, 'draft');
    const decision = decideHk3(
      { tool_name: 'Edit', tool_input: { file_path: file, old_string: 'status: draft', new_string: 'status: accepted' } },
      { root, hostRoots: [root] },
    );
    assert.equal(decision.action, 'ask');
  });
});

test('este repositório passa nos próprios checks', () => {
  assert.ok(existsSync(join(ROOT, OWNERSHIP_PATH)), 'rode `living-docs init` antes');
  const result = runValidate(ROOT);
  assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2));
  assert.equal(result.exitCode, 0);
});
