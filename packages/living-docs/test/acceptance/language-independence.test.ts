import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runValidate } from '../../src/cli/validate.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

/**
 * RN-0038: no check depends on the language of a document's prose.
 *
 * The corpus below is written entirely in Portuguese — headings, prose,
 * triggers (one of them worded as a cadence), a Definition of Done, and an
 * open-decisions table whose columns reach the checks through `field-map`.
 * It is the only non-English text in this repository, and it exists to prove
 * the rule: every finding it produces would be produced in English too.
 */
const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisoes/adr/
    owner: "@equipe"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: docs/decisoes-em-aberto.md
    owner: "@equipe"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Situação }
    living-docs:
      id-prefix: DA
      field-map:
        resolved-by: "Resolvida por"
        blocks: "Bloqueia"
        gap: "Lacuna"
  - path: docs/requisitos/regras.md
    owner: "@equipe"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
  - path: docs/definicao-de-pronto.md
    owner: "@equipe"
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
  - path: docs/glossario.md
    owner: "@equipe"
    skill: glossary-keeper
    living-docs: {}
`

const ADR = [
  '---',
  'id: ADR-0001',
  'title: Arredondamento bancário de centavos',
  'status: accepted',
  'owner: "@equipe"',
  'trigger: >',
  '  Nunca. Imutável após aceito; uma decisão nova o supersede.',
  'last-reviewed: 2026-09-01',
  'relates-to: [DA-0001]',
  'supersedes: null',
  'superseded-by: null',
  '---',
  '',
  '# ADR-0001 — Arredondamento bancário de centavos',
  '',
  '## Contexto',
  '',
  'A cobrança arredondava de três jeitos diferentes.',
  '',
  '## Decisão',
  '',
  'Todo valor monetário usa arredondamento bancário.',
  '',
].join('\n')

const DECISOES = [
  '---',
  'title: Decisões em aberto',
  'owner: "@equipe"',
  'trigger: >',
  '  Revisar mensalmente, e toda vez que alguém trombar numa lacuna.',
  'last-reviewed: 2026-09-01',
  '---',
  '',
  '# Decisões em aberto',
  '',
  '| ID | Lacuna | Situação | Resolvida por | Bloqueia | Aberta em |',
  '| --- | --- | --- | --- | --- | --- |',
  '| DA-0001 | Como arredondar centavos | resolved | ADR-0001 | — | 2026-08-28 |',
  '| DA-0002 | Fuso horário do fechamento | open | — | `src/fechamento/**` | 2026-08-30 |',
  '',
].join('\n')

const REGRAS = [
  '---',
  'title: Regras de negócio',
  'owner: "@equipe"',
  'trigger: >',
  '  Antes de implementar qualquer comportamento, e a cada regra nova ou alterada.',
  'last-reviewed: 2026-09-01',
  '---',
  '',
  '# Regras de negócio',
  '',
  '## RN-0001 — Valor monetário nunca é ponto flutuante',
  '',
  '- **status:** draft',
  '',
  'Todo valor em reais é guardado em centavos inteiros.',
  '',
].join('\n')

const PRONTO = [
  '---',
  'title: Definição de pronto',
  'owner: "@equipe"',
  'trigger: >',
  '  Quando muda o que significa estar pronto.',
  'last-reviewed: 2026-09-01',
  '---',
  '',
  '# Definição de pronto',
  '',
  '- [ ] O frontmatter está completo — verificação: `living-docs/frontmatter`.',
  '- [ ] A regra veio antes do código — verificação: human.',
  '',
].join('\n')

const GLOSSARIO = [
  '---',
  'title: Glossário',
  'owner: "@equipe"',
  'trigger: >',
  '  Termo novo do domínio em código, especificação ou conversa.',
  'last-reviewed: 2026-09-01',
  '---',
  '',
  '# Glossário',
  '',
  '| Termo | Definição |',
  '| --- | --- |',
  '| Centavo | A menor unidade de valor guardada |',
  '',
].join('\n')

const TREE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/decisoes/adr/ADR-0001-arredondamento-bancario.md': ADR,
  'docs/decisoes-em-aberto.md': DECISOES,
  'docs/requisitos/regras.md': REGRAS,
  'docs/definicao-de-pronto.md': PRONTO,
  'docs/glossario.md': GLOSSARIO,
}

test('RN-0038: a corpus written entirely in Portuguese fails no check', () => {
  withTempRepo(TREE, root => {
    const errors = runValidate(root).findings.filter(finding => finding.severity === 'error')

    assert.deepEqual(errors, [], JSON.stringify(errors, null, 2))
  })
})

test('RN-0038: the Portuguese triggers route to their owning skills without a warning', () => {
  withTempRepo(TREE, root => {
    const routing = runValidate(root).findings.filter(finding => finding.ruleId === 'living-docs/trigger-routing')

    assert.deepEqual(routing, [], JSON.stringify(routing, null, 2))
  })
})

test('RN-0038: the resolved decision is read through field-map, in its own column names', () => {
  // Without the map the same corpus fails, and the failure names field-map —
  // structure, not language, decides the result (RN-0039).
  const unmapped = OWNERSHIP.replace(/ {6}field-map:\n(?: {8}.*\n)+/, '')

  withTempRepo({ ...TREE, [OWNERSHIP_FILE]: unmapped }, root => {
    const coverage = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === 'docs/decisoes-em-aberto.md')

    assert.equal(coverage.length, 1, JSON.stringify(coverage, null, 2))
    assert.match(coverage[0]?.fix ?? '', /field-map/)
  })
})
