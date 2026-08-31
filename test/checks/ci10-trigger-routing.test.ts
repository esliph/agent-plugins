import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ci10TriggerRouting,
  loadSkillDescriptions,
  rootsOf,
  sharedRoots,
  SHARED_ROOTS_FLOOR,
} from '../../src/checks/ci10-trigger-routing.ts';
import { parseOwnership } from '../../src/config/ownership.ts';
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { toolkitRoot } from '../../src/core/roots.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
documents:
  - path: docs/glossary.md
    owner: "@time"
    skill: glossary-keeper
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
`;

const container = (trigger: string): string =>
  [
    '---',
    'title: Open Decisions',
    'owner: "@time"',
    `trigger: ${trigger}`,
    'last-reviewed: 2026-08-31',
    '---',
    '',
    '| ID | Lacuna | Status | Aberta em |',
    '| --- | --- | --- | --- |',
    '',
  ].join('\n');

const ADR_CONGELADO = [
  '---',
  'id: ADR-0001',
  'title: X',
  'status: draft',
  'owner: "@time"',
  'trigger: Nunca. Imutavel apos aceito; uma decisao nova o supersede.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  'corpo',
  '',
].join('\n');

const DESCRICOES = new Map([
  [
    'decision-recorder',
    'Use quando alguem trombar numa lacuna — comportamento sem regra escrita — ou quando tomar decisao custosa de reverter.',
  ],
  ['glossary-keeper', 'Use quando um termo de dominio novo aparecer em codigo, spec ou conversa.'],
]);

function contextFor(root: string) {
  const config = parseOwnership(OWNERSHIP);
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-31',
  };
}

test('RN-0029: gatilho e description que falam do mesmo evento passam', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  };

  withTempRepo(arvore, (root) => {
    assert.deepEqual(ci10TriggerRouting(DESCRICOES).run(contextFor(root)), []);
  });
});

test('RN-0029: gatilho que fala de outro evento reprova, nomeando os dois', () => {
  const arvore = {
    'docs/open-decisions.md': container('Quando o deploy quebrar em producao.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  };

  withTempRepo(arvore, (root) => {
    const findings = ci10TriggerRouting(DESCRICOES).run(contextFor(root));

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.ruleId, 'CI-10');
    assert.equal(findings[0]?.severity, 'error');
    assert.equal(findings[0]?.file, 'docs/open-decisions.md');
    assert.match(findings[0]?.message ?? '', /decision-recorder/);
    assert.match(findings[0]?.message ?? '', /deploy quebrar/);
  });
});

test('ADR-0013: o trigger de um item nunca entra — artefato per-file fica fora', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    // "Nunca. Imutavel apos aceito" nao compartilha raiz nenhuma com a
    // description da decision-recorder, e ainda assim nao e achado.
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  };

  withTempRepo(arvore, (root) => {
    const findings = ci10TriggerRouting(DESCRICOES).run(contextFor(root));
    assert.deepEqual(findings.filter((f) => f.file.startsWith('docs/decisions/')), []);
  });
});

test('RN-0029: skill dona ausente da raiz do toolkit avisa e segue', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
    'docs/glossary.md': [
      '---',
      'title: Glossario',
      'owner: "@time"',
      'trigger: Termo de dominio novo em codigo, spec ou conversa.',
      'last-reviewed: 2026-08-31',
      '---',
      '',
      'corpo',
      '',
    ].join('\n'),
  };

  // A description da glossary-keeper sai do mapa: e o repositorio que declarou
  // uma skill que a raiz do toolkit nao tem.
  const semGlossario = new Map([...DESCRICOES].filter(([name]) => name !== 'glossary-keeper'));

  withTempRepo(arvore, (root) => {
    const findings = ci10TriggerRouting(semGlossario).run(contextFor(root));

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.severity, 'warning');
    assert.equal(findings[0]?.file, 'docs/glossary.md');
    assert.match(findings[0]?.message ?? '', /glossary-keeper/);
  });
});

test('RN-0029: documento sem trigger no frontmatter nao e achado', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
    // CHANGELOG.md tem dono e skill e nao tem frontmatter. E legitimo.
    'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
  };

  withTempRepo(arvore, (root) => {
    assert.deepEqual(ci10TriggerRouting(DESCRICOES).run(contextFor(root)), []);
  });
});

test('ADR-0013: a raiz e a palavra de cinco letras ou mais, truncada em seis', () => {
  const raizes = rootsOf('Toda alterada de **regra**, com pontuacao!');
  assert.ok(raizes.has('altera'), [...raizes].join(', '));
  assert.ok(raizes.has('regra'));
  // "Toda" e "com" tem menos de cinco letras: nao sao raiz.
  assert.ok(!raizes.has('toda'));
  assert.ok(!raizes.has('com'));
  // O truncamento e o que faz "alterada" encontrar "alterar".
  assert.deepEqual(sharedRoots('regra alterada', 'a regra vai alterar'), ['regra', 'altera']);
});

test('ADR-0013: a raiz do toolkit e legivel, e os pares dela cabem no piso', () => {
  // Dogfooding, e e a calibracao do ADR-0013: se um par do proprio toolkit
  // ficar abaixo do piso, o numero esta errado — nao o documento.
  const descricoes = loadSkillDescriptions(toolkitRoot());
  assert.ok(descricoes.size >= 8, `so ${descricoes.size} skills lidas da raiz do toolkit`);
  assert.ok((descricoes.get('release-historian') ?? '').length > 0, 'description da release-historian nao foi lida');
  assert.ok(SHARED_ROOTS_FLOOR >= 2, 'o piso e escrito, e esta abaixo do que o ADR-0013 fixou');

  // Os doze pares deste repositorio, medidos pelo check e nao repetidos aqui:
  // repetir o `trigger` num teste seria a copia que RN-0010 recusa.
  const findings = runValidate(toolkitRoot()).findings.filter((f) => f.ruleId === 'CI-10');
  assert.deepEqual(
    findings.filter((f) => f.severity === 'error'),
    [],
    JSON.stringify(findings, null, 2),
  );
});
