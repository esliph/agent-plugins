import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { OWNERSHIP_FILE, configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
`

const ADR = [
  '---',
  'id: ADR-0001',
  'title: Primeira decisão',
  'status: accepted',
  'owner: "@team"',
  'trigger: Nunca. Imutável após aceito.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '## Contexto',
].join('\n')

const OPEN_DECISIONS = [
  '---',
  'title: Open Decisions',
  'owner: "@product"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '| ID | Lacuna | Status | Resolvida por |',
  '| --- | --- | --- | --- |',
  '| DA-0001 | Reembolso parcial | open | — |',
].join('\n')

test('coleta artefatos por diretório e por arquivo único', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0001-primeira.md': ADR,
      'docs/open-decisions.md': OPEN_DECISIONS,
      'README.md': '# fora do escopo',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))
      const files = docs.map(doc => doc.file).sort()

      assert.deepEqual(files, ['docs/decisions/adr/ADR-0001-primeira.md', 'docs/open-decisions.md'])

      const adr = docs.find(doc => doc.rule.idPrefix === 'ADR')

      assert.equal(adr?.frontmatter?.data.id, 'ADR-0001')
      assert.deepEqual(adr?.items, [])

      const da = docs.find(doc => doc.rule.idPrefix === 'DA')

      assert.equal(da?.items.length, 1)
      assert.equal(da?.items[0]?.key, 'DA-0001')
      assert.equal(da?.items[0]?.line, 10)
    },
  )
})

test('ignora artefatos gerados e arquivos não-markdown', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0001-x.md': ADR,
      'docs/decisions/adr/index.gen.md': '# gerado',
      'docs/decisions/adr/nota.txt': 'nada',
      'docs/open-decisions.md': OPEN_DECISIONS,
    },
    root => {
      const files = collectArtifacts(root, loadLivingDocsConfig(root)).map(doc => doc.file)

      assert.equal(files.includes('docs/decisions/adr/index.gen.md'), false)
      assert.equal(files.includes('docs/decisions/adr/nota.txt'), false)
    },
  )
})

test('caminho declarado mas ausente no disco não quebra a coleta', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG }, root => {
    assert.deepEqual(collectArtifacts(root, loadLivingDocsConfig(root)), [])
  })
})

test('frontmatter inválido vira syntaxError, não exceção', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0002-quebrado.md': '---\nid: ADR-0002\ntitle: "unterminated\n---\ncorpo\n',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))

      assert.equal(docs.length, 1)
      assert.equal(docs[0]?.frontmatter, null)
      assert.ok(docs[0]?.syntaxError)
    },
  )
})

const OWNERSHIP_COM_DOCUMENTOS = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
    living-docs: {}
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
    living-docs: {}
  - path: docs/ids-retired.txt
    owner: "@time"
    living-docs: {}
  - path: docs/superpowers/
    owner: "@time"
    living-docs: {}
`

test('ADR-0008: collectDocuments lê só markdown, e frontmatter ausente não é erro', () => {
  withTempRepo(
    {
      'CONTRIBUTING.md':
        '---\ntitle: Como se contribui\nowner: "@time"\ntrigger: quando muda o processo\nlast-reviewed: 2026-08-01\n---\n\n# Como se contribui\n',
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
      'docs/ids-retired.txt': '# nenhum\n',
      'docs/superpowers/plans/um.md': '# plano\n',
    },
    root => {
      const documents = collectDocuments(root, configFrom(OWNERSHIP_COM_DOCUMENTOS))

      assert.deepEqual(documents.map(document => document.file).sort(), ['CHANGELOG.md', 'CONTRIBUTING.md', 'docs/superpowers/plans/um.md'])

      const contributing = documents.find(document => document.file === 'CONTRIBUTING.md')

      assert.equal(contributing?.frontmatter?.data.owner, '@time')

      const changelog = documents.find(document => document.file === 'CHANGELOG.md')

      assert.equal(changelog?.frontmatter, null, 'CHANGELOG não tem frontmatter, e isso é decisão da Fase 6')

      const plano = documents.find(document => document.file === 'docs/superpowers/plans/um.md')

      assert.equal(plano?.rule.skill, null)
    },
  )
})

test('ADR-0008: documento declarado e ausente do repositório não vira entrada', () => {
  withTempRepo({}, root => {
    assert.deepEqual(collectDocuments(root, configFrom(OWNERSHIP_COM_DOCUMENTOS)), [])
  })
})

test('tabela de coleção sem coluna Status: os itens chegam sem estado, e quem reclama é o check de estrutura', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: '@time'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
`,
      // A linha `nota` não é ID: o núcleo a devolve como chave opaca, e é o
      // filtro de forma de ID do living-docs que a tira.
      'docs/open-decisions.md': '| ID | Lacuna |\n| --- | --- |\n| DA-0001 | x |\n| nota | y |\n',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))

      assert.deepEqual(
        docs[0]?.items.map(item => [item.key, item.state]),
        [['DA-0001', '']],
      )
    },
  )
})

test('requisito em título ### não é item — só ## declara requisito', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/requirements/rules.md
    owner: '@time'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
`,
      'docs/requirements/rules.md': '## RN-0001 — Regra\n\n- **status:** active\n\n### RN-0002 — Sub\n\n- **status:** active\n\n## Contexto\n',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))

      assert.deepEqual(
        docs[0]?.items.map(item => item.key),
        ['RN-0001'],
      )
    },
  )
})
