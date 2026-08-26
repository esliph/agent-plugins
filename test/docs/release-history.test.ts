import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadOwnership } from '../../src/config/ownership.ts';
import { unreleasedEntries } from '../../src/checks/ci6-changelog-required.ts';
import { toolkitRoot } from '../../src/core/roots.ts';

const ROOT = toolkitRoot();
const config = loadOwnership(ROOT);

test('RN-0013: este repositório declara o que é visível ao consumidor', () => {
  assert.ok(
    config.consumerVisiblePaths.length > 0,
    'consumer-visible-paths vazio: CI-6 estaria instalado e inerte',
  );
});

test('ADR-0006: as duas listas do mecanismo concordam, e um teste as impede de derivar', () => {
  const gatilhos = new Set(config.consumerVisiblePaths);
  const vigiados = new Set(
    config.watches.filter((watch) => watch.consumerVisible).map((watch) => watch.code),
  );

  assert.deepEqual(
    [...vigiados].sort(),
    [...gatilhos].sort(),
    'consumer-visible-paths e as regras `consumer-visible: true` derivaram — CI-6 e HK-5 passariam a cobrar coisas diferentes',
  );
});

test('ADR-0006: alguma regra de watches diz onde a entrada deveria estar', () => {
  const alvos = new Set(
    config.watches.filter((watch) => watch.consumerVisible).map((watch) => watch.doc),
  );
  assert.deepEqual([...alvos], ['CHANGELOG.md']);
});

test('RN-0013: o CHANGELOG é voltado ao consumidor — Keep a Changelog, sem frontmatter', () => {
  const source = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');

  assert.doesNotMatch(source, /^---$/m, 'frontmatter de documentação viva não pertence ao CHANGELOG');
  assert.match(source, /^## \[Unreleased\]$/m);
  assert.ok(unreleasedEntries(source).length > 0, 'a Fase 6 muda o contrato público: Unreleased não pode estar vazio');
});

test('RN-0015: a tabela de depreciações cobra as quatro coisas', () => {
  const source = readFileSync(join(ROOT, 'docs/deprecations.md'), 'utf8');
  const header = source.split('\n').find((line) => line.trim().startsWith('| O que |'));

  assert.ok(header, 'docs/deprecations.md sem a tabela');
  for (const coluna of ['Anunciado em', 'Removido em', 'Substituto', 'Guia de migração']) {
    assert.ok(header.includes(coluna), `a tabela precisa da coluna "${coluna}"`);
  }
});

test('RN-0001: o rastro histórico tem dono no CODEOWNERS, como todo artefato', () => {
  const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8');
  for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/releases/', 'docs/migrations/']) {
    assert.match(
      codeowners,
      new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+@\\S+$`, 'm'),
      `${path} sem dono`,
    );
  }
});

test('REL está declarado, para que HK-1 congele release note publicada', () => {
  const rel = config.artifacts.find((artifact) => artifact.idPrefix === 'REL');
  assert.ok(rel);
  assert.equal(rel?.appendOnly, true);
  assert.equal(rel?.skill, 'release-historian');
});
