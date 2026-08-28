import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideHk6 } from '../../src/hooks/hk6-session-inventory.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const HOJE = '2026-08-27';

const OWNERSHIP = `
version: 1
stale-after-months: 6
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
    field-map:
      resolved-by: "Resolvida por"
  - id-prefix: TDR
    path: docs/decisions/debt/
    owner: "@time"
    skill: decision-recorder
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
    collection: sections
documents:
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
`;

const DAS = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '| ID | Lacuna | Status | Resolvida por | Aberta em |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | Como declarar X | open | — | 2026-08-01 |',
  '',
].join('\n');

const REGRAS_REVOGADA = [
  '---',
  'title: Regras',
  'owner: "@time"',
  'trigger: A toda regra nova.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '## RN-0001 — Uma regra',
  '',
  '- **status:** revoked',
  '- **revoked-by:** RN-0002',
  '',
].join('\n');

const DIVIDA = [
  '---',
  'id: TDR-0001',
  'title: Atalho',
  'status: open',
  'owner: "@time"',
  'trigger: Quando o gatilho abaixo se cumprir.',
  'last-reviewed: 2026-08-01',
  'pay-when:',
  "  pattern: '^- \\*\\*status:\\*\\* revoked'",
  '  paths: ["docs/requirements/**"]',
  '---',
  '',
  '# TDR-0001 — Atalho',
  '',
].join('\n');

const ARVORE = {
  'docs/.ownership.yml': OWNERSHIP,
  'docs/open-decisions.md': DAS,
  'docs/requirements/rules.md': REGRAS_REVOGADA,
  'docs/decisions/debt/TDR-0001-x.md': DIVIDA,
  'CONTRIBUTING.md': '---\ntitle: Como\nowner: "@time"\ntrigger: quando muda o processo\nlast-reviewed: 2024-01-01\n---\n\n# Como\n',
};

test('critério 8: o inventário chega ao contexto sem ninguém procurar', () => {
  withTempRepo(ARVORE, (root) => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE);
    assert.equal(decision.action, 'inform');

    const context = decision.action === 'inform' ? decision.context : '';
    assert.match(context, /HK-6/);
    assert.match(context, /DA-0001/, 'decisão aberta');
    assert.match(context, /TDR-0001/, 'dívida com gatilho cumprido');
    assert.match(context, /CONTRIBUTING\.md/, 'documento vencido');
    assert.match(context, /docs\/decisions\/adr\//, 'artefato declarado e ausente');
  });
});

test('RN-0022: é injeção de contexto, nunca decisão de permissão', () => {
  withTempRepo(ARVORE, (root) => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE);
    const context = decision.action === 'inform' ? decision.context : '';

    assert.doesNotMatch(context, /\bdeny\b/);
    assert.doesNotMatch(context, /permissionDecision/);
    assert.match(context, /não bloqueia|contexto/i);
  });
});

test('RN-0022: o inventário é curto — lista longa aparece truncada com a contagem', () => {
  const muitas = [
    ...DAS.split('\n').slice(0, -1),
    ...Array.from({ length: 9 }, (_, i) => `| DA-${String(i + 2).padStart(4, '0')} | Lacuna ${i} | open | — | 2026-08-01 |`),
    '',
  ].join('\n');

  withTempRepo({ ...ARVORE, 'docs/open-decisions.md': muitas }, (root) => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE);
    const context = decision.action === 'inform' ? decision.context : '';

    assert.match(context, /\(10\)/, 'a contagem total aparece');
    assert.equal((context.match(/DA-\d{4}/g) ?? []).length <= 6, true, 'só os primeiros entram');
  });
});

test('RNF-0001: configuração ilegível cala o hook em vez de estourar', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 99\n' }, (root) => {
    assert.deepEqual(decideHk6({ root, hostRoots: [root] }, HOJE), { action: 'silent' });
  });
  withTempRepo({ 'README.md': '' }, (root) => {
    assert.deepEqual(decideHk6({ root, hostRoots: [root] }, HOJE), { action: 'silent' });
  });
});

test('HK-6 não reimplementa CI-4: sem dívida vencida e sem doc velho, as duas linhas não aparecem', () => {
  const semDivida = { ...ARVORE };
  delete (semDivida as Record<string, string>)['docs/decisions/debt/TDR-0001-x.md'];
  semDivida['CONTRIBUTING.md'] =
    '---\ntitle: Como\nowner: "@time"\ntrigger: quando muda o processo\nlast-reviewed: 2026-08-20\n---\n\n# Como\n';

  withTempRepo(semDivida, (root) => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE);
    const context = decision.action === 'inform' ? decision.context : '';

    assert.doesNotMatch(context, /gatilho de pagamento/);
    assert.doesNotMatch(context, /vencid/);
    assert.match(context, /DA-0001/, 'o resto do inventário continua');
  });
});
