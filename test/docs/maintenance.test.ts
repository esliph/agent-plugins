import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { documentWithRole, loadOwnership } from '../../src/config/ownership.ts';
import { loadCodeowners, ownersOf } from '../../src/config/codeowners.ts';
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts';
import { debtsWithoutTrigger, duePayments } from '../../src/checks/ci4-staleness.ts';
import { documentationFiles } from '../../src/docs/corpus.ts';
import { repoRoot } from '../../src/core/roots.ts';
import { todayIso } from '../../src/core/dates.ts';

const ROOT = repoRoot();
const CONFIG = loadOwnership(ROOT);

function contextFor() {
  return {
    root: ROOT,
    config: CONFIG,
    docs: collectArtifacts(ROOT, CONFIG),
    documents: collectDocuments(ROOT, CONFIG),
    today: todayIso(),
  };
}

test('RN-0016: todo documento deste repositório tem dono nos dois lugares', () => {
  const codeowners = loadCodeowners(ROOT);
  assert.ok(codeowners, 'CODEOWNERS deveria existir');

  const semDono: string[] = [];
  for (const file of documentationFiles(ROOT, CONFIG)) {
    if (ownersOf(codeowners, file) === null) semDono.push(file);
  }

  assert.deepEqual(semDono, [], `sem linha no CODEOWNERS: ${semDono.join(', ')}`);
});

test('RN-0016: `documents:` e CODEOWNERS declaram o mesmo dono', () => {
  const codeowners = loadCodeowners(ROOT);
  assert.ok(codeowners);

  for (const document of CONFIG.documents) {
    const owners = ownersOf(codeowners, document.path.replace(/\/$/, '/x'));
    assert.ok(owners, `${document.path} sem dono no CODEOWNERS`);
    assert.ok(
      owners.includes(document.owner),
      `${document.path}: .ownership.yml diz ${document.owner}, CODEOWNERS diz ${owners.join(', ')}`,
    );
  }
});

test('RN-0019: toda dívida `open` deste repositório tem gatilho verificável e não vencido', () => {
  const context = contextFor();
  assert.deepEqual(
    debtsWithoutTrigger(context).map((debt) => debt.id),
    [],
    'dívida sem `pay-when` é `TODO` órfão com número',
  );
  assert.deepEqual(
    duePayments(context).map((payment) => `${payment.id} — ${payment.evidence}`),
    [],
    'se aparecer aqui, a dívida venceu: pague ou reclassifique (ato humano)',
  );
});

test('ADR-0008: os dois papéis estão declarados e apontam para arquivos que existem', () => {
  for (const role of ['agent-contract', 'definition-of-done'] as const) {
    const document = documentWithRole(CONFIG, role);
    assert.ok(document, `nenhum documento declara role: ${role} — CI-7 não teria como achá-lo`);
    assert.ok(existsSync(join(ROOT, document.path)), `${document.path} declarado e ausente`);
  }
});

test('RN-0020: o contrato do agente continua sendo índice — sem frase copiada de artefato dono', () => {
  // A prova real é CI-7 rodando em `validate`; este teste existe para que a
  // falha aponte o contrato em vez de se perder no meio dos outros achados.
  const contract = documentWithRole(CONFIG, 'agent-contract');
  assert.ok(contract);

  const context = contextFor();
  const source = context.documents.find((document) => document.file === contract.path)?.source;
  assert.ok(source, `${contract.path} deveria estar coletado`);
});

test('spec §12 criterios 9 e 10: o que so gente verifica entra como linha humana', () => {
  const documento = documentWithRole(CONFIG, 'definition-of-done');
  assert.ok(documento);
  const dod = readFileSync(join(ROOT, documento.path), 'utf8');

  const humanos = [/falta de contexto/i, /volume documental/i];
  for (const padrao of humanos) {
    const linha = dod.split('\n').find((l) => padrao.test(l));
    assert.ok(linha, `a Definition of Done nao tem a linha de ${padrao}`);
    assert.match(linha ?? '', /^- \[ \] /, 'precisa ser item de checklist');
    assert.match(
      linha ?? '',
      /verificacao: humana|verificação: humana/,
      'estes dois sao verificacao humana por natureza — um check que fingisse medi-los seria pior que a ausencia dele',
    );
    assert.doesNotMatch(linha ?? '', /\bCI-\d+\b/, 'nenhum check mede estes dois');
  }
});
