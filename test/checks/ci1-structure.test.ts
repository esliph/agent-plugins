import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ci1Structure } from '../../src/checks/ci1-structure.ts';
import { collectArtifacts } from '../../src/docs/collect.ts';
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import type { Finding } from '../../src/core/types.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`;

function adr(fields: Record<string, string>, body = '\n## Contexto\n'): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return ['---', ...lines, '---', body].join('\n');
}

const GOOD_ADR = adr({
  id: 'ADR-0001',
  title: 'Fila de eventos',
  status: 'accepted',
  owner: '"@team"',
  trigger: 'Nunca. Imutável após aceito; uma decisão nova o supersede.',
  'last-reviewed': '2026-08-21',
});

const GOOD_DA = [
  '---',
  'title: Open Decisions',
  'owner: "@product"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '| ID | Lacuna | Status |',
  '| --- | --- | --- |',
  '| DA-0001 | Reembolso parcial | open |',
].join('\n');

function run(files: Record<string, string>): Finding[] {
  let findings: Finding[] = [];
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, (root) => {
    const config = parseOwnership(CONFIG);
    findings = ci1Structure.run({ root, config, docs: collectArtifacts(root, config) });
  });
  return findings;
}

test('artefatos bem formados não produzem finding', () => {
  assert.deepEqual(
    run({ 'docs/decisions/adr/ADR-0001-fila.md': GOOD_ADR, 'docs/open-decisions.md': GOOD_DA }),
    [],
  );
});

test('frontmatter ausente falha na linha 1', () => {
  const findings = run({ 'docs/decisions/adr/ADR-0001-x.md': '# Sem frontmatter\n' });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, 'CI-1');
  assert.equal(findings[0]?.line, 1);
  assert.equal(findings[0]?.severity, 'error');
  assert.match(findings[0]?.message ?? '', /frontmatter/i);
});

test('YAML inválido no bloco falha sem derrubar o check', () => {
  const findings = run({ 'docs/decisions/adr/ADR-0001-x.md': '---\nid: ADR-0001\ntitle: "unterminated\n---\n' });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /YAML|inválid/i);
});

test('cada campo obrigatório ausente vira uma finding', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({ id: 'ADR-0001', status: 'draft' }),
  });
  const faltando = findings.filter((f) => /obrigatório/i.test(f.message)).map((f) => f.message);
  for (const field of ['title', 'owner', 'trigger', 'last-reviewed']) {
    assert.ok(faltando.some((m) => m.includes(field)), `deveria acusar ${field}`);
  }
});

test('status fora da máquina de estados falha na linha do campo', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'aprovado',
      owner: '"@team"',
      trigger: 'Nunca.',
      'last-reviewed': '2026-08-21',
    }),
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.line, 4);
  assert.match(findings[0]?.message ?? '', /status/);
  assert.match(findings[0]?.fix ?? '', /draft.*accepted.*superseded/);
});

test('RN-0002: trigger com cadência falha nomeando o campo e o termo — critério de aceite 3', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'revisar trimestralmente',
      'last-reviewed': '2026-08-21',
    }),
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /trigger/);
  assert.match(findings[0]?.message ?? '', /trimestral/i);
  assert.equal(findings[0]?.line, 6);
});

test('owner sem @ e last-reviewed fora do ISO falham', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: 'team',
      trigger: 'Nunca.',
      'last-reviewed': '21/08/2026',
    }),
  });
  assert.equal(findings.length, 2);
  assert.ok(findings.some((f) => /owner/.test(f.message)));
  assert.ok(findings.some((f) => /last-reviewed/.test(f.message)));
});

test('id que não bate com o prefixo do artefato falha', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'TDR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'Nunca.',
      'last-reviewed': '2026-08-21',
    }),
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /ADR/);
});

test('coleção em tabela: container não exige id, mas cada item exige status válido', () => {
  const bad = GOOD_DA.replace('| DA-0001 | Reembolso parcial | open |', '| DA-0001 | Reembolso parcial | pendente |');
  const findings = run({ 'docs/open-decisions.md': bad });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.line, 10);
  assert.match(findings[0]?.message ?? '', /DA-0001/);
  assert.match(findings[0]?.fix ?? '', /open.*resolved.*dropped/);
});

test('prefixo sem máquina de estados declarada falha pedindo `states`', () => {
  const config = `
version: 1
artifacts:
  - id-prefix: XX
    path: docs/x/
    owner: "@team"
    skill: s
`;
  let findings: Finding[] = [];
  withTempRepo(
    {
      [OWNERSHIP_PATH]: config,
      'docs/x/XX-0001-a.md': adr({
        id: 'XX-0001',
        title: 'x',
        status: 'draft',
        owner: '"@team"',
        trigger: 'Nunca.',
        'last-reviewed': '2026-08-21',
      }),
    },
    (root) => {
      const parsed = parseOwnership(config);
      findings = ci1Structure.run({ root, config: parsed, docs: collectArtifacts(root, parsed) });
    },
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.fix ?? '', /states/);
});
