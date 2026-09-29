import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsCommitDiscipline, isPureDateBump } from '../../src/checks/commit-discipline.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
`

const RULES = [
  '---',
  'title: Rules',
  'owner: "@team"',
  'trigger: Before implementing new behavior.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## RN-0001 — Cents round up',
  '',
  '- **status:** active',
  '',
  'Prose.',
  '',
].join('\n')

const TREE = { 'docs/requirements/rules.md': RULES }

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = configFrom(ownership)

  return { root, config, docs: collectArtifacts(root, config), documents: [], today: '2026-08-31' }
}

/** An edit that only touched the review date. */
function bump(path: string) {
  return { path, added: ['last-reviewed: 2026-08-31'], removed: ['last-reviewed: 2026-01-01'] }
}

test('RN-0027: three documents that only changed the date fail, naming the anti-requirement', () => {
  withTempRepo(TREE, root => {
    const findings = livingDocsCommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      messages: ['chore: documentation review'],
      edits: [bump('docs/a.md'), bump('docs/b.md'), bump('docs/c.md')],
    }).run(contextFor(root))

    const bumpFinding = findings.find(f => /last-reviewed/.test(f.message))

    assert.ok(bumpFinding, JSON.stringify(findings, null, 2))
    assert.equal(bumpFinding?.ruleId, 'living-docs/commit-discipline')
    assert.equal(bumpFinding?.severity, 'error')
    assert.match(bumpFinding?.message ?? '', /docs\/a\.md/)
    assert.match(bumpFinding?.message ?? '', /docs\/c\.md/)
  })
})

test('RN-0027: two bumps pass, and a document that really changed never counts', () => {
  withTempRepo(TREE, root => {
    const twoBumps = livingDocsCommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md'],
      messages: ['docs: review'],
      edits: [bump('docs/a.md'), bump('docs/b.md')],
    }).run(contextFor(root))

    assert.deepEqual(
      twoBumps.filter(f => /last-reviewed/.test(f.message)),
      [],
    )

    // Three documents touched, but one of them changed in the body: a real review.
    const withBody = livingDocsCommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      messages: ['docs: review'],
      edits: [
        bump('docs/a.md'),
        bump('docs/b.md'),
        {
          path: 'docs/c.md',
          added: ['last-reviewed: 2026-08-31', 'new paragraph'],
          removed: ['last-reviewed: 2026-01-01'],
        },
      ],
    }).run(contextFor(root))

    assert.deepEqual(
      withBody.filter(f => /last-reviewed/.test(f.message)),
      [],
    )
  })
})

test('RN-0027: the threshold is configurable, and the default is three', () => {
  withTempRepo(TREE, root => {
    const facts = {
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md'],
      messages: ['docs: review'],
      edits: [bump('docs/a.md'), bump('docs/b.md')],
    }
    const withLimit2 = livingDocsCommitDiscipline(facts).run(contextFor(root, OWNERSHIP.replace('owned:', 'living-docs:\n  last-reviewed-bump-limit: 2\nowned:')))

    assert.ok(withLimit2.some(f => /last-reviewed/.test(f.message)))
  })
})

test('RN-0028: a commit that changes an artifact without citing the ID declared in it fails', () => {
  withTempRepo(TREE, root => {
    const findings = livingDocsCommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['docs: adjust the rule prose'],
      edits: [],
    }).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.file, 'docs/requirements/rules.md')
    assert.match(findings[0]?.message ?? '', /RN-0001/)
    assert.match(findings[0]?.fix ?? '', /commit message/)
  })
})

test('RN-0028: it is enough for one message of the diff to cite one of the IDs in the file', () => {
  withTempRepo(TREE, root => {
    const findings = livingDocsCommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['chore: touch something else', 'docs(RN-0001): the rule gains the negative case'],
      edits: [],
    }).run(contextFor(root))

    assert.deepEqual(findings, [])
  })
})

test('RN-0028: a file that is not an artifact, and an absent artifact, are not enforced', () => {
  withTempRepo(TREE, root => {
    const findings = livingDocsCommitDiscipline({
      base: 'origin/master',
      changed: ['src/cli/index.ts', 'docs/decisions/adr/ADR-0001-deleted.md'],
      messages: ['refactor: rename internal'],
      edits: [],
    }).run(contextFor(root))

    assert.deepEqual(findings, [])
  })
})

test('RN-0024: the citation is compared by identity, not by written form', () => {
  withTempRepo({ 'docs/requirements/rules.md': RULES.replace('## RN-0001', '## RN001') }, root => {
    // The project writes `RN001`; the commit cites `RN001`. The same identity
    // `RN-0001` would have — and what compares is `canonicalId`, not the written form.
    const findings = livingDocsCommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['docs(RN001): the rule gains the negative case'],
      edits: [],
    }).run(contextFor(root, OWNERSHIP.replace('owned:', 'living-docs:\n  id-format: { separator: "", padding: 3 }\nowned:')))

    assert.deepEqual(findings, [])
  })
})

test('ADR-0010: without a diff, living-docs/commit-discipline has nothing to say', () => {
  withTempRepo(TREE, root => {
    assert.deepEqual(livingDocsCommitDiscipline(null).run(contextFor(root)), [])
  })
})

test('RN-0027: isPureDateBump is only the date, and nothing more', () => {
  assert.equal(isPureDateBump(bump('docs/a.md')), true)
  assert.equal(isPureDateBump({ path: 'docs/a.md', added: ['last-reviewed: x', 'other'], removed: ['last-reviewed: y'] }), false)
  assert.equal(isPureDateBump({ path: 'docs/a.md', added: ['title'], removed: ['old title'] }), false)
})
