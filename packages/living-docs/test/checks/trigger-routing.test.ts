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
    owner: "@team"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: docs/glossary.md
    owner: "@team"
    skill: glossary-keeper
    living-docs: {}
  - path: CHANGELOG.md
    owner: "@team"
    skill: release-historian
    living-docs: {}
`

const container = (trigger: string): string =>
  [
    '---',
    'title: Open Decisions',
    'owner: "@team"',
    `trigger: ${trigger}`,
    'last-reviewed: 2026-08-31',
    '---',
    '',
    '| ID | Gap | Status | Opened on |',
    '| --- | --- | --- | --- |',
    '',
  ].join('\n')

const FROZEN_ADR = [
  '---',
  'id: ADR-0001',
  'title: X',
  'status: draft',
  'owner: "@team"',
  'trigger: Never. Immutable once accepted; a new decision supersedes it.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  'body',
  '',
].join('\n')

const DESCRIPTIONS = new Map([
  ['decision-recorder', 'Use when someone runs into a gap — behavior with no written rule — or when making a decision that is costly to reverse.'],
  ['glossary-keeper', 'Use when a new domain term shows up in code, spec or conversation.'],
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
  const tree = {
    'docs/open-decisions.md': container('Every time someone ran into a gap — behavior with no written rule.'),
    'docs/decisions/adr/ADR-0001-x.md': FROZEN_ADR,
  }

  withTempRepo(tree, root => {
    assert.deepEqual(livingDocsTriggerRouting(DESCRIPTIONS).run(contextFor(root)), [])
  })
})

test('ADR-0013: the trigger of an item never enters — a per-file artifact stays out', () => {
  const tree = {
    'docs/open-decisions.md': container('Every time someone ran into a gap — behavior with no written rule.'),
    // "Never. Immutable once accepted" shares no root with the
    // decision-recorder description, and is still not a finding.
    'docs/decisions/adr/ADR-0001-x.md': FROZEN_ADR,
  }

  withTempRepo(tree, root => {
    const findings = livingDocsTriggerRouting(DESCRIPTIONS).run(contextFor(root))

    assert.deepEqual(
      findings.filter(f => f.file.startsWith('docs/decisions/')),
      [],
    )
  })
})

test('ADR-0034: an owning skill missing from the toolkit root warns and moves on', () => {
  const tree = {
    'docs/open-decisions.md': container('Every time someone ran into a gap — behavior with no written rule.'),
    'docs/decisions/adr/ADR-0001-x.md': FROZEN_ADR,
    'docs/glossary.md': [
      '---',
      'title: Glossary',
      'owner: "@team"',
      'trigger: New domain term in code, spec or conversation.',
      'last-reviewed: 2026-08-31',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  }

  // The glossary-keeper description leaves the map: it is the repository that declared
  // a skill the toolkit root does not have.
  const withoutGlossary = new Map([...DESCRIPTIONS].filter(([name]) => name !== 'glossary-keeper'))

  withTempRepo(tree, root => {
    const findings = livingDocsTriggerRouting(withoutGlossary).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.severity, 'warning')
    assert.equal(findings[0]?.file, 'docs/glossary.md')
    assert.match(findings[0]?.message ?? '', /glossary-keeper/)
  })
})

test('ADR-0034: a document with no trigger in its frontmatter is not a finding', () => {
  const tree = {
    'docs/open-decisions.md': container('Every time someone ran into a gap — behavior with no written rule.'),
    'docs/decisions/adr/ADR-0001-x.md': FROZEN_ADR,
    // CHANGELOG.md has an owner and a skill and no frontmatter. That is legitimate.
    'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
  }

  withTempRepo(tree, root => {
    assert.deepEqual(livingDocsTriggerRouting(DESCRIPTIONS).run(contextFor(root)), [])
  })
})

test('ADR-0034, RN-0038: a trigger in any wording passes when the owning skill exists', () => {
  const tree = {
    // Shares no word with the decision-recorder description, in any language.
    'docs/open-decisions.md': container('When the production deploy breaks.'),
    'docs/decisions/adr/ADR-0001-x.md': FROZEN_ADR,
  }

  withTempRepo(tree, root => {
    assert.deepEqual(livingDocsTriggerRouting(DESCRIPTIONS).run(contextFor(root)), [])
  })
})

test('ADR-0034: the toolkit root is readable, and every pair of this repository has its owning skill', () => {
  const descriptions = loadSkillDescriptions(toolkitRoot())

  assert.ok(descriptions.size >= 8, `only ${descriptions.size} skills read from the toolkit root`)
  assert.ok((descriptions.get('release-historian') ?? '').length > 0, 'the release-historian description was not read')

  const findings = runValidate(checkoutRoot()).findings.filter(f => f.ruleId === 'living-docs/trigger-routing')

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})
