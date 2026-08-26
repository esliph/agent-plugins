import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runChangelog } from '../../src/cli/changelog.ts';
import { GitError } from '../../src/git/diff.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const NUL = String.fromCharCode(0);

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
watches:
  - code: "src/api/**"
    doc: CHANGELOG.md
    consumer-visible: true
consumer-visible-paths: ["src/api/**"]
`;

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- \`GET /pedidos\` devolve o total em centavos.
`;

/** Runner falso: responde ao `diff` e ao `log` pela subposição do verbo. */
function gitFake(changed: string[], messages: string[]) {
  return (args: readonly string[]): string => {
    if (args.includes('diff')) return changed.join(NUL) + NUL;
    if (args.includes('log')) return messages.join(`${NUL}\n`) + NUL + '\n';
    throw new Error(`comando git inesperado: ${args.join(' ')}`);
  };
}

test('RF-0008: o comando reprova quando a entrada não viaja no diff', () => {
  withTempRepo({ 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, (root) => {
    const result = runChangelog(root, 'origin/master', gitFake(['src/api/pedidos.ts'], ['feat: total']));

    assert.equal(result.exitCode, 1);
    assert.equal(result.declared, 1);
    assert.equal(result.findings[0]?.ruleId, 'CI-6');
  });
});

test('RF-0008: com a entrada no diff, sai com 0', () => {
  withTempRepo({ 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, (root) => {
    const result = runChangelog(
      root,
      'origin/master',
      gitFake(['src/api/pedidos.ts', 'CHANGELOG.md'], ['feat: total']),
    );

    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.findings, []);
  });
});

test('RF-0008: sem consumer-visible-paths declarado, não há o que checar', () => {
  const semGatilho = OWNERSHIP.replace('consumer-visible-paths: ["src/api/**"]', 'consumer-visible-paths: []');
  withTempRepo({ 'docs/.ownership.yml': semGatilho, 'CHANGELOG.md': CHANGELOG }, (root) => {
    const result = runChangelog(root, 'origin/master', () => {
      throw new Error('não deveria falar com o git sem gatilho declarado');
    });

    assert.equal(result.declared, 0);
    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.findings, []);
  });
});

test('RF-0008: base que não resolve vira GitError — o comando não inventa diff vazio', () => {
  withTempRepo({ 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, (root) => {
    assert.throws(
      () =>
        runChangelog(root, 'origem/inexistente', () => {
          const err = new Error('Command failed') as Error & { stderr: string };
          err.stderr = "fatal: bad revision 'origem/inexistente'\n";
          throw err;
        }),
      GitError,
    );
  });
});
