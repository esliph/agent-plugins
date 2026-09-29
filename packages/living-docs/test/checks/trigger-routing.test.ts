import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsTriggerRouting, loadSkillDescriptions } from '../../src/checks/trigger-routing.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'
import { configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
  - path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: docs/glossary.md
    owner: "@time"
    skill: glossary-keeper
    living-docs: {}
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
    living-docs: {}
`

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
  ].join('\n')

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
].join('\n')

const DESCRICOES = new Map([
  ['decision-recorder', 'Use quando alguem trombar numa lacuna — comportamento sem regra escrita — ou quando tomar decisao custosa de reverter.'],
  ['glossary-keeper', 'Use quando um termo de dominio novo aparecer em codigo, spec ou conversa.'],
])

function contextFor(root: string) {
  const config = configFrom(OWNERSHIP)

  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-31',
  }
}

test('ADR-0034: a trigger and description about the same event pass', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  }

  withTempRepo(arvore, root => {
    assert.deepEqual(livingDocsTriggerRouting(DESCRICOES).run(contextFor(root)), [])
  })
})

test('ADR-0013: o trigger de um item nunca entra — artefato per-file fica fora', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    // "Nunca. Imutavel apos aceito" nao compartilha raiz nenhuma com a
    // description da decision-recorder, e ainda assim nao e achado.
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  }

  withTempRepo(arvore, root => {
    const findings = livingDocsTriggerRouting(DESCRICOES).run(contextFor(root))

    assert.deepEqual(
      findings.filter(f => f.file.startsWith('docs/decisions/')),
      [],
    )
  })
})

test('ADR-0034: an owning skill missing from the toolkit root warns and moves on', () => {
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
  }

  // A description da glossary-keeper sai do mapa: e o repositorio que declarou
  // uma skill que a raiz do toolkit nao tem.
  const semGlossario = new Map([...DESCRICOES].filter(([name]) => name !== 'glossary-keeper'))

  withTempRepo(arvore, root => {
    const findings = livingDocsTriggerRouting(semGlossario).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.severity, 'warning')
    assert.equal(findings[0]?.file, 'docs/glossary.md')
    assert.match(findings[0]?.message ?? '', /glossary-keeper/)
  })
})

test('ADR-0034: a document with no trigger in its frontmatter is not a finding', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
    // CHANGELOG.md tem dono e skill e nao tem frontmatter. E legitimo.
    'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
  }

  withTempRepo(arvore, root => {
    assert.deepEqual(livingDocsTriggerRouting(DESCRICOES).run(contextFor(root)), [])
  })
})

test('ADR-0034, RN-0038: a trigger in any wording passes when the owning skill exists', () => {
  const tree = {
    // Shares no word with the decision-recorder description, in any language.
    'docs/open-decisions.md': container('When the production deploy breaks.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  }

  withTempRepo(tree, root => {
    assert.deepEqual(livingDocsTriggerRouting(DESCRICOES).run(contextFor(root)), [])
  })
})

test('ADR-0034: the toolkit root is readable, and every pair of this repository has its owning skill', () => {
  const descriptions = loadSkillDescriptions(toolkitRoot())

  assert.ok(descriptions.size >= 8, `only ${descriptions.size} skills read from the toolkit root`)
  assert.ok((descriptions.get('release-historian') ?? '').length > 0, 'the release-historian description was not read')

  const findings = runValidate(checkoutRoot()).findings.filter(f => f.ruleId === 'living-docs/trigger-routing')

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})
