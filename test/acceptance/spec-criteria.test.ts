import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runInit } from '../../src/cli/init.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts';
import { decideHk3 } from '../../src/hooks/hk3-state-promotion.ts';
import { decideHk4 } from '../../src/hooks/hk4-watch-reminder.ts';
import { decideHk5 } from '../../src/hooks/hk5-commit-guard.ts';
import { decideHk2 } from '../../src/hooks/hk2-generated-artifact.ts';
import { runDrift } from '../../src/cli/drift.ts';
import type { GitRunner } from '../../src/git/staged.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import { repoRoot } from '../../src/core/roots.ts';
import { runChangelog } from '../../src/cli/changelog.ts';
import { decideHk7 } from '../../src/hooks/hk7-shortcut-debt.ts';
import { decideHk6 } from '../../src/hooks/hk6-session-inventory.ts';

const ROOT = repoRoot();
const OPTIONS = { owner: '@team', dryRun: false, stage: 'solo' as const, idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', marketplace: 'time/living-docs' };

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

const NUL = String.fromCharCode(0);

const WATCHED_CONFIG = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "comportamento novo exige regra com ID antes do código"
`;

test('critério 5: alterar caminho vigiado sem tocar o doc dono é lembrado e perguntado', () => {
  withTempRepo({ [OWNERSHIP_PATH]: WATCHED_CONFIG }, (root) => {
    const env = { root, hostRoots: [root] };

    // Metade 1 — logo depois da edição, HK-4 lembra.
    const lembrete = decideHk4({ tool_name: 'Edit', tool_input: { file_path: 'src/domain/reembolso.ts' } }, env);
    assert.equal(lembrete.action, 'remind');

    // Metade 2 — na hora do commit, HK-5 lista os pendentes e pergunta.
    const staged: GitRunner = () => `src/domain/reembolso.ts${NUL}`;
    const pergunta = decideHk5({ tool_name: 'Bash', tool_input: { command: 'git commit -m "feat: reembolso"' } }, env, staged);
    assert.equal(pergunta.action, 'ask');
    assert.match(pergunta.action === 'ask' ? pergunta.reason : '', /docs\/requirements\/rules\.md/);

    // E com o doc no mesmo commit, o caminho fica livre.
    const comDoc: GitRunner = () => `src/domain/reembolso.ts${NUL}docs/requirements/rules.md${NUL}`;
    const livre = decideHk5({ tool_name: 'Bash', tool_input: { command: 'git commit -m "feat: reembolso"' } }, env, comDoc);
    assert.equal(livre.action, 'allow');
  });
});

const GENERATED_CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/api.gen.md
    command: "node tools/gen.js"
`;

test('critério 6: HK-2 nega editar o contrato gerado, e CI-5 falha se passar por fora', () => {
  const GERADO = 'docs/contracts/api.gen.md';
  const VERDADE = '<!-- generated: do not edit -->\n\n# API\n\n- GET /pedidos\n';

  withTempRepo({ [OWNERSHIP_PATH]: GENERATED_CONFIG, [GERADO]: VERDADE }, (root) => {
    const env = { root, hostRoots: [root] };

    // Metade 1 — pelo agente, HK-2 nega e ensina o caminho certo.
    const negado = decideHk2(
      { tool_name: 'Edit', tool_input: { file_path: GERADO, old_string: 'GET', new_string: 'POST' } },
      env,
    );
    assert.equal(negado.action, 'deny');
    assert.match(negado.action === 'deny' ? negado.reason : '', /node tools\/gen\.js/);

    // Metade 2 — editado por fora do agente, CI-5 falha.
    writeFileSync(join(root, GERADO), VERDADE.replace('GET', 'POST'), 'utf8');
    const derivou = runDrift(root, () => VERDADE);
    assert.equal(derivou.exitCode, 1);
    assert.equal(derivou.findings[0]?.ruleId, 'CI-5');

    // E com o arquivo igual à saída do gerador, o caminho fica livre.
    writeFileSync(join(root, GERADO), VERDADE, 'utf8');
    assert.equal(runDrift(root, () => VERDADE).exitCode, 0);
  });
});

test('mecanismo da Fase 6: mudança visível ao consumidor é cobrada, e a razão escrita libera', () => {
  const OWNERSHIP = [
    'version: 1',
    'artifacts:',
    '  - id-prefix: ADR',
    '    path: docs/decisions/adr/',
    '    owner: "@time"',
    '    skill: decision-recorder',
    'watches:',
    '  - code: "src/api/**"',
    '    doc: CHANGELOG.md',
    '    consumer-visible: true',
    'consumer-visible-paths: ["src/api/**"]',
    '',
  ].join('\n');

  const CHANGELOG = '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- `GET /pedidos` responde em centavos.\n';
  const NUL = String.fromCharCode(0);

  const git = (changed: string[], messages: string[]) => (args: readonly string[]): string =>
    args.includes('diff') ? changed.join(NUL) + NUL : messages.join(`${NUL}\n`) + NUL + '\n';

  withTempRepo({ 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, (root) => {
    // sem a entrada no diff: reprova, nomeando o arquivo e o caminho vigiado
    const reprovado = runChangelog(root, 'base', git(['src/api/pedidos.ts'], ['feat: centavos']));
    assert.equal(reprovado.exitCode, 1);
    assert.equal(reprovado.findings[0]?.file, 'CHANGELOG.md');

    // com a entrada no mesmo diff: aprova
    assert.equal(
      runChangelog(root, 'base', git(['src/api/pedidos.ts', 'CHANGELOG.md'], ['feat: centavos'])).exitCode,
      0,
    );

    // sem entrada, mas com a razão escrita no histórico: aprova
    assert.equal(
      runChangelog(
        root,
        'base',
        git(['src/api/pedidos.ts'], ['refactor: renomeia interno\n\nChangelog: none — nada muda para quem consome']),
      ).exitCode,
      0,
    );
  });
});

test('mecanismo da Fase 6: atalho novo sem TDR é lembrado, nunca bloqueado', () => {
  withTempRepo({}, (root) => {
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/cobranca.ts'), 'export const taxa = 0.05;\n', 'utf8');

    const decision = decideHk7(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/cobranca.ts',
          old_string: 'export const taxa = 0.05;',
          new_string: '// FIXME: arredondamento errado em centavos\nexport const taxa = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    );

    assert.equal(decision.action, 'remind', 'HK-7 é additionalContext: lembra e devolve o controle');
    assert.match(decision.action === 'remind' ? decision.context : '', /TDR/);
  });
});

const DIVIDA_CONFIG = [
  'version: 1',
  'stale-after-months: 6',
  'artifacts:',
  '  - id-prefix: TDR',
  '    path: docs/decisions/debt/',
  '    owner: "@team"',
  '    skill: decision-recorder',
  '    append-only: true',
  '  - id-prefix: RN',
  '    path: docs/requirements/rules.md',
  '    owner: "@team"',
  '    skill: requirements-keeper',
  '    collection: sections',
  'documents:',
  '  - path: docs/.ownership.yml',
  '    owner: "@team"',
  '    skill: living-docs-bootstrap',
  '',
].join('\n');

const DIVIDA_CODEOWNERS = 'docs/decisions/debt/    @team\ndocs/requirements/    @team\ndocs/.ownership.yml    @team\n';

function divida(status: string): string {
  return [
    '---',
    'id: TDR-0001',
    'title: Atalho consciente',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Quando o gatilho de pagamento abaixo se cumprir.',
    'last-reviewed: 2026-08-20',
    'pay-when:',
    "  pattern: '^- \\*\\*status:\\*\\* revoked'",
    '  paths: ["docs/requirements/**"]',
    '---',
    '',
    '# TDR-0001 — Atalho consciente',
    '',
  ].join('\n');
}

function regras(status: string): string {
  return [
    '---',
    'title: Regras',
    'owner: "@team"',
    'trigger: A toda regra nova ou alterada.',
    'last-reviewed: 2026-08-20',
    '---',
    '',
    '## RN-0001 — Uma regra',
    '',
    `- **status:** ${status}`,
    ...(status === 'revoked'
      ? ['- **revoked-by:** RN-0002', '', '## RN-0002 — Regra nova', '', '- **status:** active', '- **revokes:** RN-0001']
      : []),
    '',
  ].join('\n');
}

test('critério 7: dívida com gatilho cumprido reprova até ser paga ou reclassificada', () => {
  const arvore = (statusDivida: string, statusRegra: string) => ({
    [OWNERSHIP_PATH]: DIVIDA_CONFIG,
    CODEOWNERS: DIVIDA_CODEOWNERS,
    'docs/decisions/debt/TDR-0001-x.md': divida(statusDivida),
    'docs/requirements/rules.md': regras(statusRegra),
  });

  // gatilho não aconteceu: passa
  withTempRepo(arvore('open', 'active'), (root) => {
    assert.equal(runValidate(root).exitCode, 0);
  });

  // gatilho aconteceu e a dívida segue open: reprova, nomeando a evidência
  withTempRepo(arvore('open', 'revoked'), (root) => {
    const result = runValidate(root);
    assert.equal(result.exitCode, 1);

    const finding = result.findings.find((f) => f.ruleId === 'CI-4' && f.severity === 'error');
    assert.ok(finding, JSON.stringify(result.findings, null, 2));
    assert.match(finding.message, /TDR-0001/);
    assert.match(finding.message, /docs\/requirements\/rules\.md/);
  });

  // reclassificada: volta a passar
  withTempRepo(arvore('paid', 'revoked'), (root) => {
    assert.equal(runValidate(root).exitCode, 0);
  });
});

test('critério 8: no início da sessão, o inventário e as pendências chegam ao contexto', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: DIVIDA_CONFIG,
      CODEOWNERS: DIVIDA_CODEOWNERS,
      'docs/decisions/debt/TDR-0001-x.md': divida('open'),
      'docs/requirements/rules.md': regras('revoked'),
    },
    (root) => {
      const decision = decideHk6({ root, hostRoots: [root] }, '2026-08-27');

      assert.equal(decision.action, 'inform', 'ninguém precisa procurar: o inventário chega');
      const context = decision.action === 'inform' ? decision.context : '';
      assert.match(context, /TDR-0001/);
      assert.doesNotMatch(context, /permissionDecision/, 'é contexto, não decisão de permissão');
    },
  );
});

test('critério 5, metade 2: o CI sinaliza pelo `watches`, e a razão escrita libera', () => {
  const config = `${WATCHED_CONFIG}documents:
  - path: docs/.ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
`;
  const codeowners = 'docs/requirements/    @team\ndocs/.ownership.yml    @team\n';
  const arvore = {
    [OWNERSHIP_PATH]: config,
    CODEOWNERS: codeowners,
    'docs/requirements/rules.md': regras('draft'),
  };

  const git = (changed: string[], messages: string[]) => (args: readonly string[]): string =>
    args.includes('diff') ? changed.join(NUL) + NUL : messages.join(`${NUL}\n`) + NUL + '\n';

  withTempRepo(arvore, (root) => {
    // sem o doc dono no diff: reprova, nomeando o caminho vigiado
    const reprovado = runValidate(root, 'origin/master', git(['src/domain/reembolso.ts'], ['feat: reembolso']));
    assert.equal(reprovado.exitCode, 1);
    const finding = reprovado.findings.find((f) => f.ruleId === 'CI-7');
    assert.ok(finding);
    assert.match(finding.message, /src\/domain\/reembolso\.ts/);

    // com o doc no mesmo diff: passa
    const comDoc = git(['src/domain/reembolso.ts', 'docs/requirements/rules.md'], ['feat: reembolso']);
    assert.equal(runValidate(root, 'origin/master', comDoc).exitCode, 0);

    // com a razão escrita no histórico: passa
    assert.equal(
      runValidate(
        root,
        'origin/master',
        git(['src/domain/reembolso.ts'], ['refactor: renomeia interno\n\nDocs: none — só renomeação, a regra não mudou']),
      ).exitCode,
      0,
    );

    // e sem base, essa metade não roda
    assert.equal(runValidate(root).exitCode, 0);
  });
});

test('critério 1 (fechamento): o inventário relata a forma detectada e não toca em arquivo nenhum', () => {
  const preexistente = [
    '---',
    'title: Regras',
    'owner: "@time"',
    'trigger: A toda regra nova ou alterada.',
    'last-reviewed: 2026-08-28',
    '---',
    '',
    '## RN001 — Uma regra',
    '- **status:** active',
    '',
    '## RN002 — Outra',
    '- **status:** active',
    '',
  ].join('\n');

  withTempRepo({ 'docs/business-rules.md': preexistente }, (root) => {
    const antes = readFileSync(join(root, 'docs/business-rules.md'), 'utf8');

    const result = runInit(root, { ...OPTIONS, stage: 'small-team', dryRun: true });

    assert.ok(result.adopted.some((entry) => entry.path === 'docs/business-rules.md'));
    assert.ok(result.detected, 'a forma detectada precisa ser relatada');
    assert.deepEqual(result.detected.format, { separator: '', padding: 3 });
    assert.ok(result.detected.count >= 2);
    assert.equal(readFileSync(join(root, 'docs/business-rules.md'), 'utf8'), antes);
  });
});
