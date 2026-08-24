import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatFindings } from '../../src/cli/report.ts';
import type { Finding } from '../../src/core/types.ts';

const FINDING: Finding = {
  ruleId: 'CI-1',
  file: 'docs/decisions/adr/ADR-0001-x.md',
  line: 6,
  severity: 'error',
  message: '`trigger` descreve cadência ("trimestral").',
  fix: 'Nomeie o evento observável.',
};

test('nomeia arquivo, linha, regra e correção', () => {
  const output = formatFindings([FINDING]);
  assert.match(output, /docs\/decisions\/adr\/ADR-0001-x\.md:6/);
  assert.match(output, /CI-1/);
  assert.match(output, /error/);
  assert.match(output, /trimestral/);
  assert.match(output, /Nomeie o evento observável\./);
});

test('omite a linha quando ela é 0', () => {
  const output = formatFindings([{ ...FINDING, line: 0 }]);
  assert.match(output, /ADR-0001-x\.md\s/);
  assert.doesNotMatch(output, /ADR-0001-x\.md:0/);
});

test('resume a contagem por severidade', () => {
  const output = formatFindings([FINDING, { ...FINDING, severity: 'warning' }]);
  assert.match(output, /1 erro/);
  assert.match(output, /1 aviso/);
});

test('sem findings, informa que está tudo certo', () => {
  assert.match(formatFindings([]), /nenhuma/i);
});
