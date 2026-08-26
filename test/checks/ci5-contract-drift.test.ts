import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ci5ContractDrift, firstDifferentLine } from '../../src/checks/ci5-contract-drift.ts';
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import type { CommandRunner } from '../../src/exec/command.ts';
import type { Finding } from '../../src/core/types.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/checks.gen.md
    command: "node tools/gen.js"
`;

const GENERATED = 'docs/contracts/checks.gen.md';
const CONTENT = '<!-- generated: do not edit -->\n\n| ID |\n| --- |\n| CI-1 |\n';

function run(files: Record<string, string>, exec: CommandRunner): Finding[] {
  let findings: Finding[] = [];
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, (root) => {
    const config = parseOwnership(CONFIG);
    findings = ci5ContractDrift(exec).run({ root, config, docs: [] });
  });
  return findings;
}

test('RF-0006: arquivo igual à saída do gerador não produz achado', () => {
  const findings = run({ [GENERATED]: CONTENT }, () => CONTENT);
  assert.deepEqual(findings, []);
});

test('RF-0006: diferença de conteúdo é erro, e a finding aponta a primeira linha divergente', () => {
  const findings = run({ [GENERATED]: CONTENT }, () => CONTENT.replace('CI-1', 'CI-9'));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, 'CI-5');
  assert.equal(findings[0]?.severity, 'error');
  assert.equal(findings[0]?.file, GENERATED);
  assert.equal(findings[0]?.line, 5, 'a linha da tabela que mudou');
  assert.match(findings[0]?.fix ?? '', /node tools\/gen\.js/);
});

test('RF-0006: CR do checkout e quebra final a mais não são deriva de contrato', () => {
  const findings = run({ [GENERATED]: CONTENT.replaceAll('\n', '\r\n') + '\n' }, () => CONTENT);
  assert.deepEqual(findings, []);
});

test('RF-0006: gerador que falha é erro — CI-5 não se cala como um hook', () => {
  const findings = run({ [GENERATED]: CONTENT }, () => {
    throw new Error('gen.js: Cannot find module');
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /Cannot find module/);
});

test('RF-0006: artefato declarado e ausente é erro, não silêncio', () => {
  const findings = run({}, () => CONTENT);
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /ausente/i);
});

test('firstDifferentLine devolve 0 quando não há divergência', () => {
  assert.equal(firstDifferentLine('a\nb\n', 'a\nb\n'), 0);
  assert.equal(firstDifferentLine('a\nb\n', 'a\nc\n'), 2);
  assert.equal(firstDifferentLine('a\n', 'a\nb\n'), 2, 'linha a mais na saída também é divergência');
});
