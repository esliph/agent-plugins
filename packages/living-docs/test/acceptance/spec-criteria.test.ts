import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { coreChecks, diffChecks, resolveOwnership } from '@esliph/ownership'
import { runInit } from '../../src/cli/init.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { decideAppendOnly } from '../../src/hooks/append-only.ts'
import { decideStatePromotion } from '../../src/hooks/state-promotion.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import { checkoutRoot } from '../helpers/checkout.ts'
import { decideShortcutDebt } from '../../src/hooks/shortcut-debt.ts'
import { decideSessionInventory } from '../../src/hooks/session-inventory.ts'
import { decideOpenDecisionGuard } from '../../src/hooks/open-decision-guard.ts'

const ROOT = checkoutRoot()
const OPTIONS = {
  owner: '@team',
  dryRun: false,
  stage: 'solo' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'team/living-docs',
}

function seedAdr(root: string, status: string): string {
  const file = 'docs/decisions/adr/ADR-0001-test.md'
  const content = [
    '---',
    'id: ADR-0001',
    'title: Test decision',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Never. Immutable once accepted.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    'original body',
  ].join('\n')

  mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
  writeFileSync(join(root, file), content, 'utf8')

  return file
}

test('criterion 1: SK-0 in a repository with no living documentation duplicates nothing', () => {
  withTempRepo({ 'docs/adr/0001-preexisting.md': '# old\n' }, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.adopted.some(entry => entry.path === 'docs/adr/'))
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false)
    assert.equal(readFileSync(join(root, 'docs/adr/0001-preexisting.md'), 'utf8'), '# old\n')
  })
})

test('criterion 2: living-docs/append-only denies changing the body of an accepted ADR and allows superseding', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = seedAdr(root, 'accepted')
    const env = { root, hostRoots: [root] }

    const denied = decideAppendOnly({ tool_name: 'Edit', tool_input: { file_path: file, old_string: 'original body', new_string: 'new body' } }, env)

    assert.equal(denied.action, 'deny')

    const current = readFileSync(join(root, file), 'utf8')
    const superseded = current
      .replace('status: accepted', 'status: superseded')
      .replace('last-reviewed: 2026-08-24', 'last-reviewed: 2026-08-24\nsuperseded-by: ADR-0002')
    const allowed = decideAppendOnly({ tool_name: 'Write', tool_input: { file_path: file, content: superseded } }, env)

    assert.equal(allowed.action, 'allow')
  })
})

test('criterion 3: a trigger left empty fails in CI naming the field', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = seedAdr(root, 'draft')

    writeFileSync(
      join(root, file),
      readFileSync(join(root, file), 'utf8').replace('trigger: Never. Immutable once accepted.', "trigger: ''"),
      'utf8',
    )

    const result = runValidate(root)

    assert.equal(result.exitCode, 1)
    const finding = result.findings.find(f => f.ruleId === 'living-docs/frontmatter' && /trigger/.test(f.message))

    assert.ok(finding, 'living-docs/frontmatter should flag the trigger field')
  })
})

test('living-docs/state-promotion asks when promoting a decision without a human act (spec §4 mechanism)', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = seedAdr(root, 'draft')
    const decision = decideStatePromotion(
      { tool_name: 'Edit', tool_input: { file_path: file, old_string: 'status: draft', new_string: 'status: accepted' } },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'ask')
  })
})

test('this repository passes its own checks', () => {
  assert.ok(existsSync(join(ROOT, OWNERSHIP_FILE)), 'run `living-docs init` first')
  const result = runValidate(ROOT)

  assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2))
  assert.equal(result.exitCode, 0)
})

test('this repository passes the core checks — including what only exists in the local checkout', () => {
  const root = checkoutRoot()
  const config = resolveOwnership(root)

  assert.ok(config !== null, 'the checkout declares the ownership file at the root')
  const findings = coreChecks().flatMap(check => check.run({ root, config, today: '2026-09-28' }))

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})

const NUL = String.fromCharCode(0)

const WATCHED_CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "new behavior requires a rule with an ID before the code"
`

const GENERATED_CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
generated:
  - path: docs/contracts/api.gen.md
    command: "node tools/gen.js"
`

test('criterion 6: the generated contract edited from outside fails in the core', () => {
  const GENERATED = 'docs/contracts/api.gen.md'
  const TRUTH = '<!-- generated: do not edit -->\n\n# API\n\n- GET /orders\n'

  withTempRepo({ [OWNERSHIP_FILE]: GENERATED_CONFIG, [GENERATED]: TRUTH }, root => {
    // The guard that denies the agent's edit is now `ownership/generated-guard`
    // (ADR-0030); what stays here is the half that does not depend on a hook: edited from
    // outside, the drift is a core finding.
    const config = resolveOwnership(root)!
    const drift = coreChecks(() => TRUTH).find(check => check.id === 'ownership/generated-drift')!

    writeFileSync(join(root, GENERATED), TRUTH.replace('GET', 'POST'), 'utf8')
    const drifted = drift.run({ root, config, today: '2026-09-28' })

    assert.equal(drifted.length, 1)
    assert.equal(drifted[0]?.severity, 'error')

    // And with the file equal to the generator output, the path is clear.
    writeFileSync(join(root, GENERATED), TRUTH, 'utf8')
    assert.deepEqual(drift.run({ root, config, today: '2026-09-28' }), [])
  })
})

test('Phase 6 mechanism: a consumer-visible change is enforced, and the written reason releases it', () => {
  const OWNERSHIP = [
    'version: 2',
    'plugins: [living-docs]',
    'owned:',
    '  - path: docs/decisions/adr/',
    '    owner: "@team"',
    '    skill: decision-recorder',
    '    states: [draft, accepted, superseded]',
    '    living-docs: { id-prefix: ADR }',
    '  - path: CHANGELOG.md',
    '    owner: "@team"',
    'watches:',
    '  - code: "src/api/**"',
    '    doc: CHANGELOG.md',
    '    consumer-visible: true',
    '',
  ].join('\n')

  const CHANGELOG = '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- `GET /orders` responds in cents.\n'

  withTempRepo({ [OWNERSHIP_FILE]: OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, root => {
    const config = resolveOwnership(root)!
    const enforce = (changed: string[], messages: string[]) =>
      diffChecks({ base: 'base', changed, messages })
        .find(check => check.id === 'ownership/consumer-change-logged')!
        .run({ root, config, today: '2026-09-28' })

    // without the entry in the diff: fails, naming the file and the watched path
    const failed = enforce(['src/api/orders.ts'], ['feat: cents'])

    assert.equal(failed.length, 1)
    assert.equal(failed[0]?.file, 'CHANGELOG.md')

    // with the entry in the same diff: passes
    assert.deepEqual(enforce(['src/api/orders.ts', 'CHANGELOG.md'], ['feat: cents']), [])

    // with no entry, but with the reason written in the history: passes
    assert.deepEqual(enforce(['src/api/orders.ts'], ['refactor: rename internal\n\nChangelog: none — nothing changes for consumers']), [])
  })
})

test('Phase 6 mechanism: a new shortcut without a TDR is reminded about, never blocked', () => {
  withTempRepo({}, root => {
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src/billing.ts'), 'export const fee = 0.05;\n', 'utf8')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing.ts',
          old_string: 'export const fee = 0.05;',
          new_string: '// FIXME: wrong rounding in cents\nexport const fee = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'remind', 'living-docs/shortcut-debt is additionalContext: it reminds and hands control back')
    assert.match(decision.action === 'remind' ? decision.context : '', /TDR/)
  })
})

const DEBT_CONFIG = [
  'version: 2',
  'plugins: [living-docs]',
  'living-docs:',
  '  stale-after-months: 6',
  'owned:',
  '  - path: docs/decisions/debt/',
  '    owner: "@team"',
  '    skill: decision-recorder',
  '    states: [open, paid, accepted-permanently]',
  '    living-docs: { id-prefix: TDR, append-only: true }',
  '  - path: docs/requirements/rules.md',
  '    owner: "@team"',
  '    skill: requirements-keeper',
  '    states: [draft, active, revoked]',
  '    format: { collection: sections, key: first-token }',
  '    living-docs: { id-prefix: RN }',
  '  - path: .ownership.yml',
  '    owner: "@team"',
  '    skill: living-docs-bootstrap',
  '    living-docs: {}',
  '',
].join('\n')

function debt(status: string): string {
  return [
    '---',
    'id: TDR-0001',
    'title: Conscious shortcut',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: When the payment trigger below is met.',
    'last-reviewed: 2026-08-20',
    'pay-when:',
    "  pattern: '^- \\*\\*status:\\*\\* revoked'",
    '  paths: ["docs/requirements/**"]',
    '---',
    '',
    '# TDR-0001 — Conscious shortcut',
    '',
  ].join('\n')
}

function rules(status: string): string {
  return [
    '---',
    'title: Rules',
    'owner: "@team"',
    'trigger: Before implementing any behavior, and on every new or changed rule.',
    'last-reviewed: 2026-08-20',
    '---',
    '',
    '## RN-0001 — A rule',
    '',
    `- **status:** ${status}`,
    ...(status === 'revoked' ? ['- **revoked-by:** RN-0002', '', '## RN-0002 — New rule', '', '- **status:** active', '- **revokes:** RN-0001'] : []),
    '',
  ].join('\n')
}

test('criterion 7: a debt whose trigger is met fails until it is paid or reclassified', () => {
  const tree = (debtStatus: string, ruleStatus: string) => ({
    [OWNERSHIP_FILE]: DEBT_CONFIG,
    'docs/decisions/debt/TDR-0001-x.md': debt(debtStatus),
    'docs/requirements/rules.md': rules(ruleStatus),
  })

  // trigger did not happen: passes
  withTempRepo(tree('open', 'active'), root => {
    assert.equal(runValidate(root).exitCode, 0)
  })

  // trigger happened and the debt is still open: fails, naming the evidence
  withTempRepo(tree('open', 'revoked'), root => {
    const result = runValidate(root)

    assert.equal(result.exitCode, 1)

    const finding = result.findings.find(f => f.ruleId === 'living-docs/staleness' && f.severity === 'error')

    assert.ok(finding, JSON.stringify(result.findings, null, 2))
    assert.match(finding.message, /TDR-0001/)
    assert.match(finding.message, /docs\/requirements\/rules\.md/)
  })

  // reclassified: passes again
  withTempRepo(tree('paid', 'revoked'), root => {
    assert.equal(runValidate(root).exitCode, 0)
  })
})

test('criterion 8: at session start, the inventory and the pending items reach the context', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: DEBT_CONFIG,
      'docs/decisions/debt/TDR-0001-x.md': debt('open'),
      'docs/requirements/rules.md': rules('revoked'),
    },
    root => {
      const decision = decideSessionInventory({ root, hostRoots: [root] }, '2026-08-27')

      assert.equal(decision.action, 'inform', 'nobody has to look for it: the inventory arrives')
      const context = decision.action === 'inform' ? decision.context : ''

      assert.match(context, /TDR-0001/)
      assert.doesNotMatch(context, /permissionDecision/, 'it is context, not a permission decision')
    },
  )
})

test('RN-0021: criterion 5, half 2 — CI flags through `watches`, and the written reason releases it', () => {
  const tree = {
    [OWNERSHIP_FILE]: WATCHED_CONFIG,
    'docs/requirements/rules.md': rules('draft'),
  }

  withTempRepo(tree, root => {
    const config = resolveOwnership(root)!
    const enforce = (changed: string[], messages: string[]) =>
      diffChecks({ base: 'origin/master', changed, messages })
        .find(check => check.id === 'ownership/watch-satisfied')!
        .run({ root, config, today: '2026-09-28' })

    // without the owning doc in the diff: fails, naming the watched path
    const failed = enforce(['src/domain/refund.ts'], ['feat: refund'])

    assert.equal(failed.length, 1)
    assert.match(failed[0]?.message ?? '', /src\/domain\/refund\.ts/)

    // with the doc in the same diff: passes
    assert.deepEqual(enforce(['src/domain/refund.ts', 'docs/requirements/rules.md'], ['feat(RN-0001): refund']), [])

    // with the reason written in the history: passes
    assert.deepEqual(enforce(['src/domain/refund.ts'], ['refactor: rename internal\n\nDocs: none — rename only, the rule did not change']), [])

    // and without a base, living-docs `validate` finds none of this
    assert.equal(runValidate(root).exitCode, 0)
  })
})

test('criterion 1 (closing): the inventory reports the detected form and touches no file', () => {
  const preexisting = [
    '---',
    'title: Rules',
    'owner: "@team"',
    'trigger: On every new or changed rule.',
    'last-reviewed: 2026-08-28',
    '---',
    '',
    '## RN001 — A rule',
    '- **status:** active',
    '',
    '## RN002 — Another',
    '- **status:** active',
    '',
  ].join('\n')

  withTempRepo({ 'docs/business-rules.md': preexisting }, root => {
    const before = readFileSync(join(root, 'docs/business-rules.md'), 'utf8')

    const result = runInit(root, { ...OPTIONS, stage: 'small-team', dryRun: true })

    assert.ok(result.adopted.some(entry => entry.path === 'docs/business-rules.md'))
    assert.ok(result.detected, 'the detected form must be reported')
    assert.deepEqual(result.detected.format, { separator: '', padding: 3 })
    assert.ok(result.detected.count >= 2)
    assert.equal(readFileSync(join(root, 'docs/business-rules.md'), 'utf8'), before)
  })
})

const BLOCKING_DECISION = [
  'version: 2',
  'plugins: [living-docs]',
  'owned:',
  '  - path: docs/open-decisions.md',
  '    owner: "@team"',
  '    skill: decision-recorder',
  '    states: [open, resolved, dropped]',
  '    format: { collection: table, key: ID, state-field: Status }',
  '    living-docs:',
  '      id-prefix: DA',
  '      field-map:',
  '        blocks: "Blocks"',
  '        gap: "Gap"',
  '  - path: .ownership.yml',
  '    owner: "@team"',
  '    skill: living-docs-bootstrap',
  '    living-docs: {}',
  '',
].join('\n')

const DECISIONS = [
  '---',
  'title: Open Decisions',
  'owner: "@team"',
  'trigger: Every time someone ran into a gap.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Gap | Status | Blocks | Opened on |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | How to round cents | open | `src/billing/**` | 2026-08-28 |',
  '',
].join('\n')

test('criterion 4 of spec §12: behavior with no rule is asked about on edit and failed on the diff', () => {
  const tree = {
    [OWNERSHIP_FILE]: BLOCKING_DECISION,
    'docs/open-decisions.md': DECISIONS,
  }

  const git =
    (changed: string[], messages: string[]) =>
    (args: readonly string[]): string =>
      args.includes('diff') ? changed.join(NUL) + NUL : messages.join(`${NUL}\n`) + NUL + '\n'

  withTempRepo(tree, root => {
    // Half 1 — on edit, living-docs/open-decision-guard asks, naming the decision.
    const question = decideOpenDecisionGuard(
      { tool_name: 'Edit', tool_input: { file_path: 'src/billing/fee.ts', old_string: 'a', new_string: 'b' } },
      { root, hostRoots: [root] },
    )

    assert.equal(question.action, 'ask')
    assert.match(question.action === 'ask' ? question.reason : '', /DA-0001/)

    // Half 2 — on the diff, living-docs/open-decision-claim fails.
    const failed = runValidate(root, 'origin/master', git(['src/billing/fee.ts'], ['feat: cents']))
    const finding = failed.findings.find(f => f.ruleId === 'living-docs/open-decision-claim' && /DA-0001/.test(f.message))

    assert.ok(finding, JSON.stringify(failed.findings, null, 2))
    assert.equal(failed.exitCode, 1)

    // And the written reason is the only way out.
    const withReason = git(['src/billing/fee.ts'], ['refactor: rename internal\n\nDocs: none — this is not the implementation of the missing rule'])

    assert.equal(runValidate(root, 'origin/master', withReason).exitCode, 0)

    // Without a base, this half does not run.
    assert.equal(runValidate(root).exitCode, 0)
  })
})

const fakeGit =
  (changed: string[], messages: string[], patch = '') =>
  (args: readonly string[]): string => {
    if (args.includes('log')) {
      return messages.join(`${NUL}\n`) + NUL + '\n'
    }
    if (args.includes('--unified=0')) {
      return patch
    }

    return changed.join(NUL) + NUL
  }

const bumpPatch = (paths: string[]): string =>
  paths
    .flatMap(path => [
      `diff --git a/${path} b/${path}`,
      `--- a/${path}`,
      `+++ b/${path}`,
      '@@ -5 +5 @@',
      '-last-reviewed: 2026-01-01',
      '+last-reviewed: 2026-08-31',
    ])
    .join('\n')

const RULES_WITH_RN_0001 = [
  '---',
  'title: Rules',
  'owner: "@team"',
  'trigger: Before implementing new behavior.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## RN-0001 — Cents round up',
  '',
  '- **status:** draft',
  '',
  'Prose.',
  '',
].join('\n')

const OWNERSHIP_WITH_RULES = [
  'version: 2',
  'plugins: [living-docs]',
  'owned:',
  '  - path: docs/requirements/rules.md',
  '    owner: "@team"',
  '    skill: requirements-keeper',
  '    states: [draft, active, revoked]',
  '    format: { collection: sections, key: first-token }',
  '    living-docs: { id-prefix: RN }',
  '  - path: .ownership.yml',
  '    owner: "@team"',
  '    skill: living-docs-bootstrap',
  '    living-docs: {}',
  '',
].join('\n')

test('criteria 7 and 8 of spec §12: commit discipline is enforced in CI', () => {
  const tree = {
    [OWNERSHIP_FILE]: OWNERSHIP_WITH_RULES,
    'docs/requirements/rules.md': RULES_WITH_RN_0001,
  }

  withTempRepo(tree, root => {
    // Criterion 7 — three documents that only changed the date.
    const bumps = ['docs/a.md', 'docs/b.md', 'docs/c.md']
    const bulk = runValidate(root, 'origin/master', fakeGit(bumps, ['chore: general review'], bumpPatch(bumps)))
    const bumpFinding = bulk.findings.find(f => f.ruleId === 'living-docs/commit-discipline' && /last-reviewed/.test(f.message))

    assert.ok(bumpFinding, JSON.stringify(bulk.findings, null, 2))
    assert.equal(bulk.exitCode, 1)

    // Criterion 8 — artifact changed without the ID in the message.
    const noCitation = runValidate(root, 'origin/master', fakeGit(['docs/requirements/rules.md'], ['docs: adjust the prose']))

    assert.ok(
      noCitation.findings.some(f => f.ruleId === 'living-docs/commit-discipline' && /RN-0001/.test(f.message)),
      JSON.stringify(noCitation.findings, null, 2),
    )

    // And citing the ID in any commit of the diff is enough.
    const withCitation = runValidate(root, 'origin/master', fakeGit(['docs/requirements/rules.md'], ['docs(RN-0001): the negative case']))

    assert.deepEqual(
      withCitation.findings.filter(f => f.ruleId === 'living-docs/commit-discipline'),
      [],
    )

    // Without a base, living-docs/commit-discipline does not run.
    assert.deepEqual(
      runValidate(root).findings.filter(f => f.ruleId === 'living-docs/commit-discipline'),
      [],
    )
  })
})

test('ADR-0034: the owning skill of a trigger is checked in CI, its wording is not', () => {
  const ownership = [
    'version: 2',
    'plugins: [living-docs]',
    'owned:',
    '  - path: docs/open-decisions.md',
    '    owner: "@team"',
    '    skill: decision-recorder',
    '    states: [open, resolved, dropped]',
    '    format: { collection: table, key: ID, state-field: Status }',
    '    living-docs: { id-prefix: DA }',
    '  - path: .ownership.yml',
    '    owner: "@team"',
    '    skill: living-docs-bootstrap',
    '    living-docs: {}',
    '',
  ].join('\n')

  const decisions = (trigger: string): string =>
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

  // A trigger that shares no word with the skill description is no finding: the
  // check never compares wording (ADR-0034, RN-0038).
  withTempRepo(
    {
      [OWNERSHIP_FILE]: ownership,
      'docs/open-decisions.md': decisions('When the deploy breaks in production.'),
    },
    root => {
      const result = runValidate(root)

      assert.equal(
        result.findings.find(f => f.ruleId === 'living-docs/trigger-routing'),
        undefined,
        JSON.stringify(result.findings, null, 2),
      )
    },
  )

  // A skill the toolkit root does not have: warns and moves on.
  withTempRepo(
    {
      [OWNERSHIP_FILE]: ownership.replace('skill: decision-recorder', 'skill: team-decisions'),
      'docs/open-decisions.md': decisions('When the deploy breaks in production.'),
    },
    root => {
      const result = runValidate(root)
      const finding = result.findings.find(f => f.ruleId === 'living-docs/trigger-routing')

      assert.equal(finding?.severity, 'warning')
      assert.equal(result.exitCode, 0)
    },
  )
})
