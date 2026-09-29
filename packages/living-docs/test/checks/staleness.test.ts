import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsStaleness, duePayments, debtsWithoutTrigger, payWhenOf, staleDocs } from '../../src/checks/staleness.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const TODAY = '2026-08-27'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
living-docs:
  stale-after-months: 6
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]
  - path: docs/decisions/debt/
    owner: "@team"
    skill: decision-recorder
    states: [open, paid, accepted-permanently]
    living-docs: { id-prefix: TDR, append-only: true }
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: {}
  - path: CHANGELOG.md
    owner: "@team"
    skill: release-historian
    living-docs: {}
`

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = configFrom(ownership)

  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: TODAY,
  }
}

function adr(status: string, lastReviewed: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Test decision',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Never. Immutable once accepted.',
    `last-reviewed: ${lastReviewed}`,
    'relates-to: [RN-0001]',
    '---',
    '',
    'body',
  ].join('\n')
}

/** `pay-when` in YAML with single quotes: single quotes do not process `\`, and the pattern is a regex. */
const PAY_WHEN = ['pay-when:', "  pattern: '^- \\*\\*status:\\*\\* revoked'", '  paths: ["docs/requirements/**"]']

function debt(status: string, extra: readonly string[] = []): string {
  return [
    '---',
    'id: TDR-0001',
    'title: Test shortcut',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: When the payment trigger below is met.',
    'last-reviewed: 2026-08-01',
    ...extra,
    '---',
    '',
    '# TDR-0001 — Test shortcut',
    '',
    'The trigger is the first PR that revokes a requirement.',
  ].join('\n')
}

const RULES_ACTIVE = [
  '---',
  'title: Rules',
  'owner: "@team"',
  'trigger: On every new rule.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '## RN-0001 — Any rule',
  '',
  '- **status:** active',
  '',
  'The statement.',
].join('\n')

const RULES_REVOKED = RULES_ACTIVE.replace('- **status:** active', '- **status:** revoked')

test('RN-0018: a document past the limit warns, and a warning is not an error', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('draft', '2026-01-01'),
      'docs/requirements/rules.md': RULES_ACTIVE,
    },
    root => {
      const findings = livingDocsStaleness.run(contextFor(root))
      const warning = findings.find(finding => finding.file === 'docs/decisions/adr/ADR-0001-a.md')

      assert.ok(warning, 'an ADR reviewed in January should be stale by August')
      assert.equal(warning.ruleId, 'living-docs/staleness')
      assert.equal(warning.severity, 'warning')
      assert.match(warning.message, /7 months/)
      assert.match(warning.message, /stale-after-months/)
      assert.match(warning.fix, /mass bump/i)
      assert.equal(
        findings.some(finding => finding.severity === 'error'),
        false,
      )
    },
  )
})

test('ADR-0007: a frozen item does not go stale — warning about it would teach the mass bump', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('accepted', '2020-01-01'),
      'docs/requirements/rules.md': RULES_ACTIVE,
    },
    root => {
      assert.deepEqual(staleDocs(contextFor(root)), [])
    },
  )
})

test('RN-0018: a `documents:` document goes stale; without frontmatter, there is nothing to go stale', () => {
  withTempRepo(
    {
      'docs/requirements/rules.md': RULES_ACTIVE,
      'CONTRIBUTING.md':
        '---\ntitle: How to contribute\nowner: "@team"\ntrigger: when the process changes\nlast-reviewed: 2025-01-01\n---\n\n# How to contribute\n',
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
    },
    root => {
      const stale = staleDocs(contextFor(root))

      assert.deepEqual(
        stale.map(item => item.file),
        ['CONTRIBUTING.md'],
      )
      assert.equal(stale[0]?.skill, 'working-agreements-keeper')
    },
  )
})

test('RN-0018: `last-reviewed` outside the ISO format does not go stale — living-docs/frontmatter already enforces the format', () => {
  withTempRepo(
    {
      'docs/requirements/rules.md': RULES_ACTIVE,
      // A date old enough to go stale if it were parsed — but it is not ISO.
      'CONTRIBUTING.md':
        '---\ntitle: How to contribute\nowner: "@team"\ntrigger: when the process changes\nlast-reviewed: January 1st, 2020\n---\n\n# How to contribute\n',
    },
    root => {
      const stale = staleDocs(contextFor(root))

      assert.deepEqual(
        stale.map(item => item.file),
        [],
      )
    },
  )
})

test('RN-0019: an `open` debt without `pay-when` is an error, with the problem named', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open'),
      'docs/requirements/rules.md': RULES_ACTIVE,
    },
    root => {
      const withoutTrigger = debtsWithoutTrigger(contextFor(root))

      assert.deepEqual(
        withoutTrigger.map(item => [item.id, item.problem]),
        [['TDR-0001', 'missing']],
      )

      const findings = livingDocsStaleness.run(contextFor(root))
      const error = findings.find(finding => finding.severity === 'error')

      assert.ok(error)
      assert.equal(error.file, 'docs/decisions/debt/TDR-0001-x.md')
      assert.match(error.message, /TDR-0001/)
      assert.match(error.fix, /pay-when/)
    },
  )
})

test('RN-0019: an incomplete `pay-when` and a pattern that does not compile are distinct errors', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', ['pay-when:', '  paths: ["docs/**"]']),
      'docs/requirements/rules.md': RULES_ACTIVE,
    },
    root => {
      assert.equal(debtsWithoutTrigger(contextFor(root))[0]?.problem, 'incomplete')
    },
  )

  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', ['pay-when:', "  pattern: '([('", '  paths: ["docs/**"]']),
      'docs/requirements/rules.md': RULES_ACTIVE,
    },
    root => {
      assert.equal(debtsWithoutTrigger(contextFor(root))[0]?.problem, 'invalid pattern')
    },
  )
})

test('criterion 7: a debt with its trigger met fails, and the evidence shows up', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', PAY_WHEN),
      'docs/requirements/rules.md': RULES_REVOKED,
    },
    root => {
      const due = duePayments(contextFor(root))

      assert.equal(due.length, 1)
      assert.equal(due[0]?.id, 'TDR-0001')
      assert.match(due[0]?.evidence ?? '', /^docs\/requirements\/rules\.md:\d+$/)

      const findings = livingDocsStaleness.run(contextFor(root))
      const error = findings.find(finding => finding.severity === 'error')

      assert.ok(error)
      assert.equal(error.file, 'docs/decisions/debt/TDR-0001-x.md')
      assert.match(error.message, /payment trigger has already happened/)
      assert.match(error.message, /docs\/requirements\/rules\.md/)
      assert.match(error.fix, /paid|accepted-permanently/)
    },
  )
})

test('criterion 7: without the condition in the repository, the `open` debt passes', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', PAY_WHEN),
      'docs/requirements/rules.md': RULES_ACTIVE,
    },
    root => {
      assert.deepEqual(duePayments(contextFor(root)), [])
      assert.deepEqual(debtsWithoutTrigger(contextFor(root)), [])
    },
  )
})

test('criterion 7: a paid or permanently accepted debt leaves the count', () => {
  for (const status of ['paid', 'accepted-permanently']) {
    withTempRepo(
      {
        'docs/decisions/debt/TDR-0001-x.md': debt(status, PAY_WHEN),
        'docs/requirements/rules.md': RULES_REVOKED,
      },
      root => {
        assert.deepEqual(duePayments(contextFor(root)), [], `status ${status} should not fall due`)
        assert.deepEqual(debtsWithoutTrigger(contextFor(root)), [])
      },
    )
  }
})

test('ADR-0007: the debt file itself does not count as an occurrence of the trigger', () => {
  withTempRepo(
    {
      // The debt body contains, literally, the text the pattern looks for.
      'docs/decisions/debt/TDR-0001-x.md': `${debt('open', [
        'pay-when:',
        "  pattern: 'status: revoked'",
        '  paths: ["docs/**"]',
      ])}\n\nThe trigger is any section that becomes \`status: revoked\`.\n`,
      'docs/requirements/rules.md': RULES_ACTIVE,
    },
    root => {
      assert.deepEqual(duePayments(contextFor(root)), [], 'citing the trigger is not meeting it')
    },
  )
})

test('payWhenOf tells absent, incomplete and valid apart', () => {
  assert.equal(payWhenOf({}), 'missing')
  assert.equal(payWhenOf({ 'pay-when': 'when there is time' }), 'incomplete')
  assert.equal(payWhenOf({ 'pay-when': { pattern: 'x' } }), 'incomplete')
  assert.equal(payWhenOf({ 'pay-when': { pattern: 'x', paths: [] } }), 'incomplete')
  assert.deepEqual(payWhenOf({ 'pay-when': { pattern: 'x', paths: ['src/**'] } }), {
    pattern: 'x',
    paths: ['src/**'],
  })
})

test('living-docs/staleness is the only check that warns: nothing here fails for a stale document', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('draft', '2019-01-01'),
      'docs/requirements/rules.md': RULES_ACTIVE,
    },
    root => {
      const findings = livingDocsStaleness.run(contextFor(root))

      assert.ok(findings.length > 0)
      assert.ok(findings.every(finding => finding.severity === 'warning'))
    },
  )
})
