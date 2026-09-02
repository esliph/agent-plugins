import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
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
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0001-primeira.md': ADR,
      'docs/open-decisions.md': OPEN_DECISIONS,
      'README.md': '# fora do escopo',
    },
    root => {
      const docs = collectArtifacts(root, parseOwnership(CONFIG))
      const files = docs.map(doc => doc.file).sort()

      assert.deepEqual(files, ['docs/decisions/adr/ADR-0001-primeira.md', 'docs/open-decisions.md'])

      const adr = docs.find(doc => doc.rule.idPrefix === 'ADR')

      assert.equal(adr?.frontmatter?.data.id, 'ADR-0001')
      assert.deepEqual(adr?.items, [])

      const da = docs.find(doc => doc.rule.idPrefix === 'DA')

      assert.equal(da?.items.length, 1)
      assert.equal(da?.items[0]?.id, 'DA-0001')
      assert.equal(da?.items[0]?.line, 10)
    },
  )
})

test('ignora artefatos gerados e arquivos não-markdown', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0001-x.md': ADR,
      'docs/decisions/adr/index.gen.md': '# gerado',
      'docs/decisions/adr/nota.txt': 'nada',
      'docs/open-decisions.md': OPEN_DECISIONS,
    },
    root => {
      const files = collectArtifacts(root, parseOwnership(CONFIG)).map(doc => doc.file)

      assert.equal(files.includes('docs/decisions/adr/index.gen.md'), false)
      assert.equal(files.includes('docs/decisions/adr/nota.txt'), false)
    },
  )
})

test('caminho declarado mas ausente no disco não quebra a coleta', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG }, root => {
    assert.deepEqual(collectArtifacts(root, parseOwnership(CONFIG)), [])
  })
})

test('frontmatter inválido vira syntaxError, não exceção', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0002-quebrado.md': '---\nid: ADR-0002\ntitle: "unterminated\n---\ncorpo\n',
    },
    root => {
      const docs = collectArtifacts(root, parseOwnership(CONFIG))

      assert.equal(docs.length, 1)
      assert.equal(docs[0]?.frontmatter, null)
      assert.ok(docs[0]?.syntaxError)
    },
  )
})

const OWNERSHIP_COM_DOCUMENTOS = `
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
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
  - path: docs/ids-retired.txt
    owner: "@time"
  - path: docs/superpowers/
    owner: "@time"
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
      const documents = collectDocuments(root, parseOwnership(OWNERSHIP_COM_DOCUMENTOS))

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
    assert.deepEqual(collectDocuments(root, parseOwnership(OWNERSHIP_COM_DOCUMENTOS)), [])
  })
})
