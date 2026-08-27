import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ci6ChangelogRequired,
  exceptionReason,
  unreleasedEntries,
} from '../../src/checks/ci6-changelog-required.ts';
import { parseOwnership } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

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
    reason: "mudança visível ao consumidor nasce com a entrada no mesmo PR"
consumer-visible-paths: ["src/api/**"]
`;

const CHANGELOG_COM_ENTRADA = `# Changelog

## [Unreleased]

### Added

- \`GET /pedidos\` devolve o total em centavos.
`;

const CHANGELOG_VAZIO = `# Changelog

## [Unreleased]

### Added

## [1.0.0] - 2026-01-01

- primeira versão
`;

function contextFor(root: string, ownership = OWNERSHIP) {
  return { root, config: parseOwnership(ownership), docs: [], documents: [], today: '2026-08-27' };
}

function seedChangelog(root: string, content: string): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'CHANGELOG.md'), content, 'utf8');
}

test('RN-0013: a entrada precisa viajar no mesmo diff, não só existir no arquivo', () => {
  withTempRepo({}, (root) => {
    // O arquivo TEM entrada, mas o diff não o toca: é a entrada de um PR
    // anterior satisfazendo este. É exatamente o que a decisão 6 recusa.
    seedChangelog(root, CHANGELOG_COM_ENTRADA);
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/pedidos.ts'],
      messages: ['feat: total em centavos'],
    }).run(contextFor(root));

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.ruleId, 'CI-6');
    assert.equal(findings[0]?.severity, 'error');
    assert.equal(findings[0]?.file, 'CHANGELOG.md');
    assert.match(findings[0]?.message ?? '', /não está entre os caminhos alterados/);
    assert.match(findings[0]?.message ?? '', /src\/api\/pedidos\.ts/);
    assert.match(findings[0]?.fix ?? '', /Changelog: none/);
  });
});

test('RN-0013: entrada no mesmo diff e Unreleased preenchido aprova', () => {
  withTempRepo({}, (root) => {
    seedChangelog(root, CHANGELOG_COM_ENTRADA);
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/pedidos.ts', 'CHANGELOG.md'],
      messages: ['feat: total em centavos'],
    }).run(contextFor(root));

    assert.deepEqual(findings, []);
  });
});

test('RN-0013: CHANGELOG no diff com Unreleased vazio não conta', () => {
  withTempRepo({}, (root) => {
    seedChangelog(root, CHANGELOG_VAZIO);
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/pedidos.ts', 'CHANGELOG.md'],
      messages: ['feat: total em centavos'],
    }).run(contextFor(root));

    assert.equal(findings.length, 1);
    assert.match(findings[0]?.message ?? '', /\[Unreleased\]/);
  });
});

test('ADR-0006: o rótulo com razão libera; sem razão, não', () => {
  withTempRepo({}, (root) => {
    seedChangelog(root, CHANGELOG_COM_ENTRADA);
    const diff = { base: 'origin/master', changed: ['src/api/pedidos.ts'] };

    assert.deepEqual(
      ci6ChangelogRequired({
        ...diff,
        messages: ['refactor: renomeia interno\n\nChangelog: none — nada muda para quem consome'],
      }).run(contextFor(root)),
      [],
    );

    const semRazao = ci6ChangelogRequired({
      ...diff,
      messages: ['refactor: renomeia interno\n\nChangelog: none'],
    }).run(contextFor(root));
    assert.equal(semRazao.length, 1, 'rótulo sem razão é caixinha marcada, não exceção');
  });
});

test('caminho fora de consumer-visible-paths não dispara nada', () => {
  withTempRepo({}, (root) => {
    seedChangelog(root, CHANGELOG_COM_ENTRADA);
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/interno/cache.ts', 'test/interno/cache.test.ts'],
      messages: ['refactor: cache'],
    }).run(contextFor(root));

    assert.deepEqual(findings, []);
  });
});

test('consumer-visible-paths vazio: o check não tem gatilho e se cala', () => {
  withTempRepo({}, (root) => {
    seedChangelog(root, CHANGELOG_COM_ENTRADA);
    const semGatilho = OWNERSHIP.replace('consumer-visible-paths: ["src/api/**"]', 'consumer-visible-paths: []');
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/pedidos.ts'],
      messages: ['feat: x'],
    }).run(contextFor(root, semGatilho));

    assert.deepEqual(findings, []);
  });
});

test('ADR-0006: gatilho declarado sem doc marcado consumer-visible é erro de configuração', () => {
  withTempRepo({}, (root) => {
    const semAlvo = OWNERSHIP.replace('    consumer-visible: true\n', '');
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/pedidos.ts'],
      messages: ['feat: x'],
    }).run(contextFor(root, semAlvo));

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.file, 'docs/.ownership.yml');
    assert.match(findings[0]?.fix ?? '', /consumer-visible: true/);
  });
});

test('doc alvo declarado e ausente do repositório é achado, não silêncio', () => {
  withTempRepo({}, (root) => {
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/pedidos.ts', 'CHANGELOG.md'],
      messages: ['feat: x'],
    }).run(contextFor(root));

    assert.equal(findings.length, 1);
    assert.match(findings[0]?.message ?? '', /ausente/);
  });
});

test('unreleasedEntries lê só a seção Unreleased, e reconhece - e *', () => {
  assert.deepEqual(unreleasedEntries(CHANGELOG_COM_ENTRADA), [
    '- `GET /pedidos` devolve o total em centavos.',
  ]);
  assert.deepEqual(unreleasedEntries(CHANGELOG_VAZIO), []);
  assert.deepEqual(unreleasedEntries('# Changelog\n\n## Unreleased\n\n* item\n'), ['* item']);
  assert.deepEqual(unreleasedEntries('# Changelog\n\n## [1.0.0]\n\n- item\n'), []);
});

test('exceptionReason aceita travessão, hífen e dois-pontos, e recusa razão vazia', () => {
  assert.equal(exceptionReason(['Changelog: none — só teste']), 'só teste');
  assert.equal(exceptionReason(['Changelog: none - só teste']), 'só teste');
  assert.equal(exceptionReason(['Changelog: none: só teste']), 'só teste');
  assert.equal(exceptionReason(['Changelog: none']), null);
  assert.equal(exceptionReason(['Changelog: none —   ']), null);
  assert.equal(exceptionReason(['feat: x', 'fix: y\n\nchangelog: NONE — minúscula também']), 'minúscula também');
});
