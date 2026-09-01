import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ci7OwnershipCoverage,
  docsExceptionReason,
  dodItemsWithoutVerification,
  duplicatedSentences,
} from '../../src/checks/ci7-ownership-coverage.ts';
import { parseOwnership } from '../../src/config/ownership.ts';
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "comportamento novo exige regra com ID antes do código"
documents:
  - path: docs/.ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
  - path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
  - path: CLAUDE.md
    owner: "@time"
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/definition-of-done.md
    owner: "@time"
    skill: working-agreements-keeper
    role: definition-of-done
`;

const CODEOWNERS = [
  'docs/decisions/adr/    @time',
  'docs/.ownership.yml    @time',
  'docs/requirements/    @time',
  'docs/definition-of-done.md    @time',
  'CLAUDE.md    @time',
  '',
].join('\n');

const DOD = ['# Definition of Done', '', '- [ ] Os testes passam — verificação: `CI-1`.', ''].join('\n');
const CONTRATO = ['# Contrato do agente', '', 'Índice e política: a verdade mora no artefato dono.', ''].join('\n');
const REGRAS = ['# Regras', '', '## RN-0001 — Uma regra', '', '- **status:** draft', ''].join('\n');

const ARVORE = {
  'docs/.ownership.yml': OWNERSHIP,
  'CODEOWNERS': CODEOWNERS,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'docs/requirements/rules.md': REGRAS,
  'docs/definition-of-done.md': DOD,
  'CLAUDE.md': CONTRATO,
};

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = parseOwnership(ownership);
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-27',
  };
}

test('RN-0016: repositório com tudo declarado nos dois lugares passa', () => {
  withTempRepo(ARVORE, (root) => {
    assert.deepEqual(ci7OwnershipCoverage().run(contextFor(root)), []);
  });
});

test('RN-0016: documento sob a raiz sem entrada no .ownership.yml reprova, nomeando o arquivo', () => {
  withTempRepo({ ...ARVORE, 'docs/avulso.md': '# ninguém responde por mim\n' }, (root) => {
    const findings = ci7OwnershipCoverage().run(contextFor(root));
    const semDono = findings.filter((finding) => finding.file === 'docs/avulso.md');

    assert.equal(semDono.length, 2, 'falta nos dois lugares: .ownership.yml e CODEOWNERS');
    assert.ok(semDono.every((finding) => finding.ruleId === 'CI-7' && finding.severity === 'error'));
    assert.ok(semDono.some((finding) => /ownership\.yml/.test(finding.message)));
    assert.ok(semDono.some((finding) => /CODEOWNERS/.test(finding.message)));
    assert.ok(semDono.some((finding) => /documents:/.test(finding.fix)));
  });
});

test('RN-0016: CODEOWNERS ausente é uma finding, não uma por arquivo', () => {
  const semCodeowners = { ...ARVORE };
  delete (semCodeowners as Record<string, string>).CODEOWNERS;

  withTempRepo(semCodeowners, (root) => {
    const findings = ci7OwnershipCoverage().run(contextFor(root));
    assert.equal(findings.length, 1);
    assert.match(findings[0]?.message ?? '', /CODEOWNERS/);
    assert.equal(findings[0]?.file, 'docs/.ownership.yml');
  });
});

test('RN-0008 (config): vínculo de watches que aponta doc inexistente ou sem dono reprova', () => {
  const docInexistente = OWNERSHIP.replace('doc: docs/requirements/rules.md\n    reason', 'doc: docs/nao-existe.md\n    reason');
  withTempRepo(ARVORE, (root) => {
    const findings = ci7OwnershipCoverage().run(contextFor(root, docInexistente));
    const achado = findings.find((finding) => /não existe/.test(finding.message) && finding.file === 'docs/.ownership.yml');

    assert.ok(achado);
    // A regra citada é a do vínculo código→doc, não a da Definition of Done.
    assert.match(achado.fix, /RN-0008/);
    assert.doesNotMatch(achado.fix, /RN-0017/);
  });

  // O doc existe, mas ninguém o declarou: watches aponta para documento órfão.
  const semDeclaracao = OWNERSHIP.replace('  - path: docs/requirements/rules.md\n    owner: "@time"\n    skill: requirements-keeper\n', '');
  withTempRepo(ARVORE, (root) => {
    const findings = ci7OwnershipCoverage().run(contextFor(root, semDeclaracao));
    const achado = findings.find((finding) => /não tem dono declarado/.test(finding.message));

    assert.ok(achado);
    assert.match(achado.fix, /RN-0016/);
    assert.match(achado.fix, /RN-0008/);
    assert.doesNotMatch(achado.fix, /RN-0017/);
  });
});

test('RN-0017: item de DoD sem verificação nomeada reprova, com a linha', () => {
  const dodFraca = `${DOD}- [ ] O código está bonito.\n`;
  withTempRepo({ ...ARVORE, 'docs/definition-of-done.md': dodFraca }, (root) => {
    const findings = ci7OwnershipCoverage().run(contextFor(root));
    const achado = findings.find((finding) => finding.file === 'docs/definition-of-done.md');

    assert.ok(achado);
    assert.equal(achado.line, 4);
    assert.match(achado.message, /verificação/);
    assert.match(achado.fix, /CI-n|HK-n/);
  });
});

test('dodItemsWithoutVerification aceita ID de check, de hook e a marca humana', () => {
  const source = [
    '- [ ] com check — verificação: `CI-3`.',
    '- [x] com hook — verificação: `HK-1`.',
    '- [ ] com pessoa — verificação: humana.',
    '- [ ] sem nada.',
    'não é item de caixa.',
  ].join('\n');

  assert.deepEqual(
    dodItemsWithoutVerification(source).map((item) => item.line),
    [4],
  );
});

test('RN-0017: exemplo do formato dentro de cerca não é item — o item de fora ainda é', () => {
  const source = [
    '# Definition of Done',
    '',
    'O formato de cada caixa:',
    '',
    '```markdown',
    '- [ ] <o item> — verificação: <CI-n | HK-n | humana>',
    '```',
    '',
    '- [ ] Os testes passam — verificação: `CI-1`.',
    '- [ ] O código está bonito.',
  ].join('\n');

  assert.deepEqual(
    dodItemsWithoutVerification(source).map((item) => item.line),
    [10],
    'só o item de verdade, fora da cerca, é achado',
  );
});

test('RN-0017: a cerca sai e o ID entre crases fica — no check inteiro', () => {
  const dodComExemplo = [
    '# Definition of Done',
    '',
    '```markdown',
    '- [ ] <o item> — verificação: <CI-n | HK-n | humana>',
    '```',
    '',
    '- [ ] Os testes passam — verificação: `CI-1`.',
    '',
  ].join('\n');

  withTempRepo({ ...ARVORE, 'docs/definition-of-done.md': dodComExemplo }, (root) => {
    assert.deepEqual(ci7OwnershipCoverage().run(contextFor(root)), []);
  });
});

test('RN-0020: frase longa do contrato repetida num artefato dono reprova', () => {
  const frase =
    'Toda regra de negócio deste projeto nasce com identificador estável antes de qualquer linha de código.';
  withTempRepo(
    {
      ...ARVORE,
      'CLAUDE.md': `# Contrato do agente\n\n${frase}\n`,
      'docs/requirements/rules.md': `${REGRAS}\n${frase}\n`,
    },
    (root) => {
      const findings = ci7OwnershipCoverage().run(contextFor(root));
      const achado = findings.find((finding) => finding.file === 'CLAUDE.md');

      assert.ok(achado, 'CI-7 deveria acusar a duplicata');
      assert.match(achado.message, /docs\/requirements\/rules\.md/);
      assert.match(achado.fix, /ponteiro|apague/i);
    },
  );
});

test('ADR-0009: frase curta é vocabulário compartilhado, não duplicata', () => {
  const curta = 'O teste vem antes da implementação.';
  withTempRepo(
    {
      ...ARVORE,
      'CLAUDE.md': `# Contrato do agente\n\n${curta}\n`,
      'docs/requirements/rules.md': `${REGRAS}\n${curta}\n`,
    },
    (root) => {
      assert.deepEqual(ci7OwnershipCoverage().run(contextFor(root)), []);
    },
  );
});

test('duplicatedSentences ignora código e compara normalizado', () => {
  const frase = 'Uma frase suficientemente longa para passar do piso de doze palavras sem esforço nenhum';
  const contrato = `# Contrato\n\n**${frase}.**\n\n\`\`\`md\n${'outra frase longa '.repeat(4)}\n\`\`\`\n`;
  const corpus = [{ file: 'docs/x.md', source: `prosa antes. ${frase.toLowerCase()}. prosa depois.` }];

  const found = duplicatedSentences(contrato, corpus);
  assert.equal(found.length, 1);
  assert.equal(found[0]?.source, 'docs/x.md');
  assert.equal(found[0]?.line, 3);
});

test('critério 5, metade 2: o diff que leva caminho vigiado sem o doc dono reprova', () => {
  withTempRepo(ARVORE, (root) => {
    const diff = { base: 'origin/master', changed: ['src/domain/reembolso.ts'], messages: ['feat: reembolso'] };
    const findings = ci7OwnershipCoverage(diff).run(contextFor(root));
    const achado = findings.find((finding) => finding.file === 'docs/requirements/rules.md');

    assert.ok(achado);
    assert.equal(achado.severity, 'error');
    assert.match(achado.message, /src\/domain\/reembolso\.ts/);
    assert.match(achado.fix, /Docs: none/);
  });
});

test('critério 5, metade 2: com o doc no mesmo diff, ou com a razão escrita, passa', () => {
  withTempRepo(ARVORE, (root) => {
    const comDoc = {
      base: 'origin/master',
      changed: ['src/domain/reembolso.ts', 'docs/requirements/rules.md'],
      messages: ['feat: reembolso'],
    };
    assert.deepEqual(ci7OwnershipCoverage(comDoc).run(contextFor(root)), []);

    const comRazao = {
      base: 'origin/master',
      changed: ['src/domain/reembolso.ts'],
      messages: ['refactor: renomeia interno\n\nDocs: none — só renomeação, a regra não mudou'],
    };
    assert.deepEqual(ci7OwnershipCoverage(comRazao).run(contextFor(root)), []);
  });
});

test('ADR-0010: rótulo sem razão não é exceção', () => {
  assert.equal(docsExceptionReason(['Docs: none — a regra não mudou']), 'a regra não mudou');
  assert.equal(docsExceptionReason(['Docs: none']), null);
  assert.equal(docsExceptionReason(['docs: NONE — minúscula também']), 'minúscula também');
  assert.equal(docsExceptionReason(['Changelog: none — outro rótulo']), null);
});

test('sem diff, a metade do diff não roda', () => {
  withTempRepo(ARVORE, (root) => {
    assert.deepEqual(ci7OwnershipCoverage(null).run(contextFor(root)), []);
  });
});

/** O mesmo mapa de propriedade, com o artefato DA acrescentado a `artifacts:`. */
const COM_DECISAO = OWNERSHIP.replace(
  '    skill: decision-recorder\nwatches:',
  [
    '    skill: decision-recorder',
    '  - id-prefix: DA',
    '    path: docs/open-decisions.md',
    '    owner: "@time"',
    '    skill: decision-recorder',
    '    collection: table',
    '    field-map:',
    '      blocks: "Bloqueia"',
    '      gap: "Lacuna"',
    'watches:',
  ].join('\n'),
);

const DECISOES = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-27',
  '---',
  '',
  '| ID | Lacuna | Status | Bloqueia | Aberta em |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | Como arredondar centavos | open | `src/cobranca/**` | 2026-08-27 |',
  '',
].join('\n');

const ARVORE_COM_DECISAO = {
  ...ARVORE,
  CODEOWNERS: `${CODEOWNERS}docs/open-decisions.md    @time\n`,
  'docs/open-decisions.md': DECISOES,
};

test('RN-0026: o diff que toca caminho reivindicado por decisão aberta reprova', () => {
  withTempRepo(ARVORE_COM_DECISAO, (root) => {
    const diff = { base: 'origin/master', changed: ['src/cobranca/taxa.ts'], messages: ['feat: centavos'] };
    const findings = ci7OwnershipCoverage(diff).run(contextFor(root, COM_DECISAO));
    const achado = findings.find((finding) => /DA-0001/.test(finding.message));

    assert.ok(achado, JSON.stringify(findings, null, 2));
    assert.equal(achado.severity, 'error');
    assert.equal(achado.file, 'docs/open-decisions.md');
    assert.match(achado.message, /src\/cobranca\/taxa\.ts/);
    assert.match(achado.message, /centavos/, 'a lacuna precisa ser nomeada');
    assert.match(achado.fix, /decision-recorder/);
    assert.match(achado.fix, /Docs: none/);
  });
});

test('RN-0026: sem diff, a sexta classe não roda — inventar diff seria achado sobre outra branch', () => {
  withTempRepo(ARVORE_COM_DECISAO, (root) => {
    const findings = ci7OwnershipCoverage().run(contextFor(root, COM_DECISAO));
    assert.deepEqual(
      findings.filter((finding) => /DA-0001/.test(finding.message)),
      [],
    );
  });
});

test('RN-0026: a razão escrita libera a sexta classe junto com a quinta', () => {
  withTempRepo(ARVORE_COM_DECISAO, (root) => {
    const comRazao = {
      base: 'origin/master',
      changed: ['src/cobranca/taxa.ts'],
      messages: ['refactor: renomeia interno\n\nDocs: none — não é a implementação da regra que falta'],
    };
    assert.deepEqual(ci7OwnershipCoverage(comRazao).run(contextFor(root, COM_DECISAO)), []);
  });
});
