import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDrift } from '../../src/cli/drift.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { OWNERSHIP_PATH, OwnershipError } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const BASE = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
`;

const WITH_GENERATED = `${BASE}generated:
  - path: docs/contracts/checks.gen.md
    command: "node tools/gen.js"
`;

test('RF-0006: sem artefato gerado declarado, drift sai com 0 e diz que não checou nada', () => {
  withTempRepo({ [OWNERSHIP_PATH]: BASE }, (root) => {
    const result = runDrift(root, () => '');
    assert.deepEqual(result.findings, []);
    assert.equal(result.checked, 0);
    assert.equal(result.exitCode, 0);
  });
});

test('RF-0006: deriva leva a exit 1', () => {
  withTempRepo(
    { [OWNERSHIP_PATH]: WITH_GENERATED, 'docs/contracts/checks.gen.md': 'antigo\n' },
    (root) => {
      const result = runDrift(root, () => 'novo\n');
      assert.equal(result.checked, 1);
      assert.equal(result.exitCode, 1);
      assert.equal(result.findings[0]?.ruleId, 'CI-5');
    },
  );
});

test('RF-0006: validate não roda o gerador, e conta o que deixou para o drift', () => {
  withTempRepo(
    { [OWNERSHIP_PATH]: WITH_GENERATED, 'docs/contracts/checks.gen.md': 'qualquer coisa\n' },
    (root) => {
      const result = runValidate(root);
      assert.equal(result.generated, 1, 'validate precisa saber que há o que checar em outro lugar');
      assert.equal(
        result.findings.some((finding) => finding.ruleId === 'CI-5'),
        false,
        'CI-5 não roda em validate (ADR-0005)',
      );
      assert.equal(result.exitCode, 0);
    },
  );
});

test('.ownership.yml ausente propaga OwnershipError', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    assert.throws(() => runDrift(root, () => ''), OwnershipError);
  });
});
