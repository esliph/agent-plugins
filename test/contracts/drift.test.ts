import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runDrift } from '../../src/cli/drift.ts';
import { repoRoot } from '../../src/core/roots.ts';

const ROOT = repoRoot();
const GENERATED = 'docs/contracts/checks.gen.md';

test('RF-0006: o contrato gerado deste repositório não derivou — dogfooding com o gerador de verdade', () => {
  const result = runDrift(ROOT);
  assert.ok(result.checked >= 1, 'este repositório precisa declarar ao menos um artefato gerado');
  assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2));
  assert.equal(result.exitCode, 0);
});

test('RN-0012: o artefato gerado se declara gerado, e não finge ser artefato editável', () => {
  const source = readFileSync(join(ROOT, GENERATED), 'utf8');
  assert.match(source.split('\n')[0] ?? '', /generated: do not edit/, 'o marcador abre o arquivo (spec §2)');
  assert.doesNotMatch(source, /^---$/m, 'artefato gerado não tem frontmatter editável (spec §2)');
  assert.match(source, /src\/checks\/registry\.ts/, 'o arquivo precisa nomear a própria fonte');
});
