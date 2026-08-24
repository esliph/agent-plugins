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
`;

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

test('repositório conforme sai com 0', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, 'docs/decisions/adr/ADR-0001-a.md': GOOD }, (root) => {
    const result = runValidate(root);
    assert.deepEqual(result.findings, []);
    assert.equal(result.exitCode, 0);
  });
});

test('erro de qualquer check leva a exit 1', () => {
  withTempRepo(
    { [OWNERSHIP_PATH]: CONFIG, 'docs/decisions/adr/ADR-0001-a.md': GOOD.replace('status: draft', 'status: aprovado') },
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
