import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runValidate } from '../../src/cli/validate.ts';
import { OWNERSHIP_PATH, OwnershipError } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
documents:
  - path: docs/.ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
`;

const CODEOWNERS = 'docs/decisions/adr/    @team\ndocs/.ownership.yml    @team\n';

const GOOD = [
  '---',
  'id: ADR-0001',
  'title: Fila de eventos',
  'status: draft',
  'owner: "@team"',
  'trigger: Nunca. Imutável após aceito.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '## Contexto',
].join('\n');

test('RF-0001: repositório conforme sai com 0', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, CODEOWNERS, 'docs/decisions/adr/ADR-0001-a.md': GOOD }, (root) => {
    const result = runValidate(root);
    assert.deepEqual(result.findings, []);
    assert.equal(result.exitCode, 0);
  });
});

test('RF-0001: erro de qualquer check leva a exit 1', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      CODEOWNERS,
      'docs/decisions/adr/ADR-0001-a.md': GOOD.replace('status: draft', 'status: aprovado'),
    },
    (root) => {
      const result = runValidate(root);
      assert.equal(result.errors, 1);
      assert.equal(result.exitCode, 1);
      assert.equal(result.findings[0]?.ruleId, 'CI-1');
    },
  );
});

test('roda todos os checks do registry, não só o primeiro', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      CODEOWNERS,
      'docs/decisions/adr/ADR-0001-a.md': GOOD,
      'docs/decisions/adr/ADR-0003-c.md': GOOD.replace('ADR-0001', 'ADR-0003'),
    },
    (root) => {
      const result = runValidate(root);
      assert.ok(result.findings.some((finding) => finding.ruleId === 'CI-2'));
    },
  );
});

test('.ownership.yml ausente propaga OwnershipError', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    assert.throws(() => runValidate(root), OwnershipError);
  });
});

test('RF-0010: aviso é reportado e não muda o código de saída', () => {
  const antigo = GOOD.replace('last-reviewed: 2026-08-21', 'last-reviewed: 2020-01-01');
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, CODEOWNERS, 'docs/decisions/adr/ADR-0001-a.md': antigo }, (root) => {
    const result = runValidate(root);

    assert.equal(result.warnings, 1, JSON.stringify(result.findings, null, 2));
    assert.equal(result.errors, 0);
    assert.equal(result.exitCode, 0, 'CI-4 avisa; aviso não reprova (spec §9)');
    assert.equal(result.findings[0]?.ruleId, 'CI-4');
  });
});

test('RF-0011: com --base, CI-7 cobra o doc dono do caminho vigiado que mudou', () => {
  const comWatch = `${CONFIG}watches:
  - code: "src/domain/**"
    doc: docs/decisions/adr/
    reason: "decisão antes do código"
`;
  const NUL = String.fromCharCode(0);
  const git = (args: readonly string[]): string =>
    args.includes('diff') ? `src/domain/x.ts${NUL}` : `feat: x${NUL}\n`;

  withTempRepo({ [OWNERSHIP_PATH]: comWatch, CODEOWNERS, 'docs/decisions/adr/ADR-0001-a.md': GOOD }, (root) => {
    assert.equal(runValidate(root).exitCode, 0, 'sem --base, a metade do diff não roda');

    const comBase = runValidate(root, 'origin/master', git);
    assert.equal(comBase.exitCode, 1);
    assert.ok(comBase.findings.some((finding) => finding.ruleId === 'CI-7' && /src\/domain\/x\.ts/.test(finding.message)));
  });
});
