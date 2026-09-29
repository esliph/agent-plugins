import { test } from 'node:test'
import assert from 'node:assert/strict'
import { docsExceptionReason, livingDocsOpenDecisionClaim } from '../../src/checks/open-decision-claim.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { OWNERSHIP_FILE, configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

/** O mapa de propriedade, com o artefato DA declarado em `owned`. */
const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: .ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
    living-docs: {}
  - path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map:
        blocks: "Bloqueia"
        gap: "Lacuna"
`

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
].join('\n')

const ARVORE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/open-decisions.md': DECISOES,
}

function contextFor(root: string) {
  const config = configFrom(OWNERSHIP)

  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-27',
  }
}

test('ADR-0010: rótulo sem razão não é exceção', () => {
  assert.equal(docsExceptionReason(['Docs: none — a regra não mudou']), 'a regra não mudou')
  assert.equal(docsExceptionReason(['Docs: none']), null)
  assert.equal(docsExceptionReason(['docs: NONE — minúscula também']), 'minúscula também')
  assert.equal(docsExceptionReason(['Changelog: none — outro rótulo']), null)
})

test('RN-0026: o diff que toca caminho reivindicado por decisão aberta reprova', () => {
  withTempRepo(ARVORE, root => {
    const diff = { base: 'origin/master', changed: ['src/cobranca/taxa.ts'], messages: ['feat: centavos'] }
    const findings = livingDocsOpenDecisionClaim(diff).run(contextFor(root))
    const achado = findings.find(finding => /DA-0001/.test(finding.message))

    assert.ok(achado, JSON.stringify(findings, null, 2))
    assert.equal(achado.ruleId, 'living-docs/open-decision-claim')
    assert.equal(achado.severity, 'error')
    assert.equal(achado.file, 'docs/open-decisions.md')
    assert.match(achado.message, /src\/cobranca\/taxa\.ts/)
    assert.match(achado.message, /centavos/, 'a lacuna precisa ser nomeada')
    assert.match(achado.fix, /decision-recorder/)
    assert.match(achado.fix, /Docs: none/)
  })
})

test('RN-0026: sem diff, o check não roda — inventar diff seria achado sobre outra branch', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(livingDocsOpenDecisionClaim().run(contextFor(root)), [])
  })
})

test('RN-0026: a razão escrita libera o diff', () => {
  withTempRepo(ARVORE, root => {
    const comRazao = {
      base: 'origin/master',
      changed: ['src/cobranca/taxa.ts'],
      messages: ['refactor: renomeia interno\n\nDocs: none — não é a implementação da regra que falta'],
    }

    assert.deepEqual(livingDocsOpenDecisionClaim(comRazao).run(contextFor(root)), [])
  })
})
