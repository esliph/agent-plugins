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
  'title: First decision',
  'status: accepted',
  'owner: "@team"',
  'trigger: Never. Immutable once accepted.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '## Context',
].join('\n')

const OPEN_DECISIONS = [
  '---',
  'title: Open Decisions',
  'owner: "@product"',
  'trigger: Every time someone bumped into a gap.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '| ID | Gap | Status | Resolved by |',
  '| --- | --- | --- | --- |',
  '| DA-0001 | Partial refund | open | — |',
].join('\n')

test('collects artifacts by directory and by single file', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0001-first.md': ADR,
      'docs/open-decisions.md': OPEN_DECISIONS,
      'README.md': '# out of scope',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))
      const files = docs.map(doc => doc.file).sort()

      assert.deepEqual(files, ['docs/decisions/adr/ADR-0001-first.md', 'docs/open-decisions.md'])

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

test('ignores generated artifacts and non-markdown files', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0001-x.md': ADR,
      'docs/decisions/adr/index.gen.md': '# generated',
      'docs/decisions/adr/note.txt': 'nothing',
      'docs/open-decisions.md': OPEN_DECISIONS,
    },
    root => {
      const files = collectArtifacts(root, loadLivingDocsConfig(root)).map(doc => doc.file)

      assert.equal(files.includes('docs/decisions/adr/index.gen.md'), false)
      assert.equal(files.includes('docs/decisions/adr/note.txt'), false)
    },
  )
})

test('a declared path that is missing on disk does not break the collection', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG }, root => {
    assert.deepEqual(collectArtifacts(root, loadLivingDocsConfig(root)), [])
  })
})

test('invalid frontmatter becomes syntaxError, not an exception', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0002-broken.md': '---\nid: ADR-0002\ntitle: "unterminated\n---\nbody\n',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))

      assert.equal(docs.length, 1)
      assert.equal(docs[0]?.frontmatter, null)
      assert.ok(docs[0]?.syntaxError)
    },
  )
})

const OWNERSHIP_WITH_DOCUMENTS = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: {}
  - path: CHANGELOG.md
    owner: "@team"
    skill: release-historian
    living-docs: {}
  - path: docs/ids-retired.txt
    owner: "@team"
    living-docs: {}
  - path: docs/superpowers/
    owner: "@team"
    living-docs: {}
`

test('ADR-0008: collectDocuments reads only markdown, and absent frontmatter is not an error', () => {
  withTempRepo(
    {
      'CONTRIBUTING.md':
        '---\ntitle: How to contribute\nowner: "@team"\ntrigger: when the process changes\nlast-reviewed: 2026-08-01\n---\n\n# How to contribute\n',
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
      'docs/ids-retired.txt': '# none\n',
      'docs/superpowers/plans/one.md': '# plan\n',
    },
    root => {
      const documents = collectDocuments(root, configFrom(OWNERSHIP_WITH_DOCUMENTS))

      assert.deepEqual(documents.map(document => document.file).sort(), ['CHANGELOG.md', 'CONTRIBUTING.md', 'docs/superpowers/plans/one.md'])

      const contributing = documents.find(document => document.file === 'CONTRIBUTING.md')

      assert.equal(contributing?.frontmatter?.data.owner, '@team')

      const changelog = documents.find(document => document.file === 'CHANGELOG.md')

      assert.equal(changelog?.frontmatter, null, 'CHANGELOG has no frontmatter, and that is a Phase 6 decision')

      const plan = documents.find(document => document.file === 'docs/superpowers/plans/one.md')

      assert.equal(plan?.rule.skill, null)
    },
  )
})

test('ADR-0008: a document that is declared and absent from the repository does not become an entry', () => {
  withTempRepo({}, root => {
    assert.deepEqual(collectDocuments(root, configFrom(OWNERSHIP_WITH_DOCUMENTS)), [])
  })
})

test('collection table without a Status column: the items arrive without state, and the structure check is what complains', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: '@team'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
`,
      // The `note` row is not an ID: the core returns it as an opaque key, and it is
      // the living-docs ID-shape filter that drops it.
      'docs/open-decisions.md': '| ID | Gap |\n| --- | --- |\n| DA-0001 | x |\n| note | y |\n',
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

test('a requirement under a ### heading is not an item — only ## declares a requirement', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/requirements/rules.md
    owner: '@team'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
`,
      'docs/requirements/rules.md': '## RN-0001 — Rule\n\n- **status:** active\n\n### RN-0002 — Sub\n\n- **status:** active\n\n## Context\n',
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
