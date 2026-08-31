import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOwnership,
  loadOwnership,
  findArtifactRule,
  findDocumentRule,
  documentWithRole,
  fieldOf,
  OwnershipError,
  OWNERSHIP_PATH,
} from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const VALID = `
version: 1
stale-after-months: 6

artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team-platform"
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, superseded-by, last-reviewed]
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table

generated:
  - path: docs/contracts/openapi.gen.yaml
    command: npm run gen:openapi

watches:
  - code: "src/domain/**"
    doc: "docs/requirements/"
    reason: "comportamento novo exige regra com ID antes do código"
  - code: "src/**"
    doc: "CHANGELOG.md"
    consumer-visible: true

consumer-visible-paths: ["src/api/**"]
`;

test('normaliza kebab-case do YAML para camelCase tipado', () => {
  const config = parseOwnership(VALID);
  assert.equal(config.version, 1);
  assert.equal(config.staleAfterMonths, 6);
  assert.equal(config.artifacts.length, 2);

  const adr = config.artifacts[0];
  assert.ok(adr);
  assert.equal(adr.idPrefix, 'ADR');
  assert.equal(adr.path, 'docs/decisions/adr/');
  assert.equal(adr.owner, '@team-platform');
  assert.equal(adr.appendOnly, true);
  assert.deepEqual(adr.mutableFields, ['status', 'superseded-by', 'last-reviewed']);
  assert.equal(adr.collection, 'per-file');
  assert.equal(adr.states, null);
});

test('RN-0027: last-reviewed-bump-limit tem padrao 3 e piso 2', () => {
  const base = 'version: 1\nartifacts:\n  - id-prefix: ADR\n    path: docs/adr/\n    owner: "@t"\n    skill: s\n';
  assert.equal(parseOwnership(base).lastReviewedBumpLimit, 3);
  assert.equal(parseOwnership(`${base}last-reviewed-bump-limit: 5\n`).lastReviewedBumpLimit, 5);
  assert.throws(() => parseOwnership(`${base}last-reviewed-bump-limit: 1\n`), /maior ou igual a 2/);
});

test('aplica os defaults de collection, append-only e cited-by', () => {
  const config = parseOwnership(VALID);
  const da = config.artifacts[1];
  assert.ok(da);
  assert.equal(da.collection, 'table');
  assert.equal(da.appendOnly, false);
  assert.deepEqual(da.mutableFields, []);
  assert.deepEqual(da.citedBy, []);
});

test('lê watches e consumer-visible-paths', () => {
  const config = parseOwnership(VALID);
  assert.equal(config.watches.length, 2);
  assert.equal(config.watches[0]?.reason, 'comportamento novo exige regra com ID antes do código');
  assert.equal(config.watches[0]?.consumerVisible, false);
  assert.equal(config.watches[1]?.consumerVisible, true);
  assert.deepEqual(config.consumerVisiblePaths, ['src/api/**']);
  assert.equal(config.generated[0]?.command, 'npm run gen:openapi');
});

test('rejeita version diferente de 1 nomeando o campo', () => {
  assert.throws(
    () => parseOwnership('version: 2\nartifacts: []\n'),
    (err: unknown) => err instanceof OwnershipError && /version/.test(err.message),
  );
});

test('rejeita artifacts vazio', () => {
  assert.throws(
    () => parseOwnership('version: 1\nartifacts: []\n'),
    (err: unknown) => err instanceof OwnershipError && /artifacts/.test(err.message),
  );
});

test('rejeita id-prefix fora do formato', () => {
  const bad = 'version: 1\nartifacts:\n  - id-prefix: adr\n    path: docs/a/\n    owner: "@x"\n    skill: s\n';
  assert.throws(
    () => parseOwnership(bad),
    (err: unknown) => err instanceof OwnershipError && /id-prefix/.test(err.message),
  );
});

test('RN-0001: rejeita id-prefix duplicado — um artefato, um dono', () => {
  const dup = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/a/
    owner: "@x"
    skill: s
  - id-prefix: ADR
    path: docs/b/
    owner: "@y"
    skill: s
`;
  assert.throws(
    () => parseOwnership(dup),
    (err: unknown) => err instanceof OwnershipError && /ADR/.test(err.message),
  );
});

test('rejeita owner que não começa com @', () => {
  const bad = 'version: 1\nartifacts:\n  - id-prefix: ADR\n    path: docs/a/\n    owner: platform\n    skill: s\n';
  assert.throws(
    () => parseOwnership(bad),
    (err: unknown) => err instanceof OwnershipError && /owner/.test(err.message),
  );
});

test('aceita states declarado pelo projeto', () => {
  const src = 'version: 1\nartifacts:\n  - id-prefix: RN\n    path: docs/requirements/\n    owner: "@product"\n    skill: requirements-keeper\n    states: [draft, active, revoked]\n';
  assert.deepEqual(parseOwnership(src).artifacts[0]?.states, ['draft', 'active', 'revoked']);
});

test('loadOwnership lê do disco e erra com caminho quando ausente', () => {
  withTempRepo({ [OWNERSHIP_PATH]: VALID }, (root) => {
    assert.equal(loadOwnership(root).artifacts.length, 2);
  });
  withTempRepo({ 'README.md': '' }, (root) => {
    assert.throws(
      () => loadOwnership(root),
      (err: unknown) => err instanceof OwnershipError && err.message.includes(OWNERSHIP_PATH),
    );
  });
});

test('findArtifactRule casa arquivo dentro de diretório e arquivo exato', () => {
  const config = parseOwnership(VALID);
  assert.equal(findArtifactRule(config, 'docs/decisions/adr/ADR-0001-x.md')?.idPrefix, 'ADR');
  assert.equal(findArtifactRule(config, 'docs/open-decisions.md')?.idPrefix, 'DA');
  assert.equal(findArtifactRule(config, 'src/index.ts'), null);
});

const COM_FIELD_MAP = `
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
    field-map:
      resolved-by: "Resolvida por"
`;

test('RN-0001: field-map traduz o nome canônico e normaliza as duas pontas', () => {
  const rule = parseOwnership(COM_FIELD_MAP).artifacts[0]!;
  assert.equal(rule.fieldMap['resolved-by'], 'resolvida por');
});

test('fieldOf traduz pelo field-map e trata vazio como ausente', () => {
  const rule = parseOwnership(COM_FIELD_MAP).artifacts[0]!;
  assert.equal(
    fieldOf(rule, { id: 'DA-0001', status: 'resolved', line: 1, fields: { 'resolvida por': 'ADR-0007' } }, 'resolved-by'),
    'ADR-0007',
  );
  assert.equal(
    fieldOf(rule, { id: 'DA-0002', status: 'open', line: 2, fields: { 'resolvida por': '—' } }, 'resolved-by'),
    null,
  );
  assert.equal(
    fieldOf(rule, { id: 'DA-0003', status: 'open', line: 3, fields: {} }, 'resolved-by'),
    null,
  );
});

test('sem field-map, o nome canônico é o próprio nome do campo', () => {
  const rule = parseOwnership(VALID).artifacts[1]!;
  assert.equal(
    fieldOf(rule, { id: 'DA-0001', status: 'open', line: 1, fields: { 'relates-to': 'ADR-0001' } }, 'relates-to'),
    'ADR-0001',
  );
});

test('field-map com valor vazio é erro de configuração, não silêncio', () => {
  assert.throws(
    () =>
      parseOwnership(`
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
    field-map:
      resolved-by: ""
`),
    (err: unknown) => err instanceof OwnershipError && err.message.includes('field-map'),
  );
});

const COM_DOCUMENTOS = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
documents:
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
  - path: CLAUDE.md
    owner: "@time"
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/definition-of-done.md
    owner: "@time"
    skill: working-agreements-keeper
    role: definition-of-done
  - path: docs/superpowers/
    owner: "@time"
`;

test('ADR-0008: documents declara caminho, dono, e skill/role opcionais', () => {
  const config = parseOwnership(COM_DOCUMENTOS);
  assert.equal(config.documents.length, 4);

  const contributing = config.documents[0];
  assert.equal(contributing?.path, 'CONTRIBUTING.md');
  assert.equal(contributing?.owner, '@time');
  assert.equal(contributing?.skill, 'working-agreements-keeper');
  assert.equal(contributing?.role, null);

  assert.equal(config.documents[3]?.skill, null, 'documento pode ter dono e não ter skill');
});

test('ADR-0008: documents ausente é lista vazia — configuração das fases anteriores continua válida', () => {
  const config = parseOwnership(`
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
`);
  assert.deepEqual(config.documents, []);
});

test('ADR-0008: documento sem caminho, com dono sem @, ou com skill vazia é recusado', () => {
  const semCaminho = COM_DOCUMENTOS.replace('  - path: CONTRIBUTING.md\n    owner: "@time"', '  - owner: "@time"');
  assert.throws(() => parseOwnership(semCaminho), /documents\[0\]/);

  const donoSemArroba = COM_DOCUMENTOS.replace(
    '  - path: CONTRIBUTING.md\n    owner: "@time"',
    '  - path: CONTRIBUTING.md\n    owner: "time"',
  );
  assert.throws(() => parseOwnership(donoSemArroba), /precisa começar com @/);

  const skillVazia = COM_DOCUMENTOS.replace('skill: working-agreements-keeper', 'skill: ""');
  assert.throws(() => parseOwnership(skillVazia), /skill/);
});

test('ADR-0008: role fora do vocabulário nomeia os válidos; papel repetido é recusado', () => {
  const roleEstranho = COM_DOCUMENTOS.replace('role: agent-contract', 'role: manifesto');
  assert.throws(() => parseOwnership(roleEstranho), /agent-contract, definition-of-done/);

  const repetido = COM_DOCUMENTOS.replace('role: definition-of-done', 'role: agent-contract');
  assert.throws(() => parseOwnership(repetido), /Um papel, um documento/);
});

test('ADR-0008: caminho declarado duas vezes em documents é recusado', () => {
  const duplicado = COM_DOCUMENTOS.replace(
    '  - path: docs/superpowers/\n    owner: "@time"',
    '  - path: CONTRIBUTING.md\n    owner: "@time"',
  );
  assert.throws(() => parseOwnership(duplicado), /Um documento, um dono/);
});

test('findDocumentRule resolve arquivo por igualdade e diretório por prefixo', () => {
  const config = parseOwnership(COM_DOCUMENTOS);
  assert.equal(findDocumentRule(config, 'CONTRIBUTING.md')?.owner, '@time');
  assert.equal(findDocumentRule(config, './CONTRIBUTING.md')?.owner, '@time');
  assert.equal(findDocumentRule(config, 'docs/superpowers/plans/x.md')?.path, 'docs/superpowers/');
  assert.equal(findDocumentRule(config, 'README.md'), null);
});

test('documentWithRole acha o documento pelo papel, sem conhecer caminho nenhum', () => {
  const config = parseOwnership(COM_DOCUMENTOS);
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md');
  assert.equal(documentWithRole(config, 'definition-of-done')?.path, 'docs/definition-of-done.md');

  const semContrato = parseOwnership(COM_DOCUMENTOS.replace('    role: agent-contract\n', ''));
  assert.equal(documentWithRole(semContrato, 'agent-contract'), null);
});

/** A configuração mínima válida que este arquivo já usa (`ADR-0011`). */
const MINIMO = VALID;

test('RN-0024: id-format ausente é a forma do toolkit', () => {
  const config = parseOwnership(MINIMO);
  assert.deepEqual(config.idFormat, { separator: '-', padding: 4 });
});

test('RN-0024: id-format declarado é lido, e o inválido é erro e não padrão silencioso', () => {
  const config = parseOwnership(`${MINIMO}\nid-format:\n  separator: ""\n  padding: 3\n`);
  assert.deepEqual(config.idFormat, { separator: '', padding: 3 });

  assert.throws(
    () => parseOwnership(`${MINIMO}\nid-format:\n  separator: "~"\n`),
    /separator "~" não é aceito/,
  );
  assert.throws(() => parseOwnership(`${MINIMO}\nid-format:\n  padding: 9\n`), /padding "9"/);
});
