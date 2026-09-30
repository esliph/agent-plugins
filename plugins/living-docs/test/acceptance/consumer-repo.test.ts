import { DEFAULT_ID_FORMAT } from '../../plugin/src/docs/schema.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { coreChecks, resolveOwnership } from '@esliph/ownership'
import { OWNERSHIP_FILE, runInit, WORKFLOW_PATH } from '../../plugin/src/cli/init.ts'
import { runValidate } from '../../plugin/src/cli/validate.ts'
import { decideAppendOnly } from '../../plugin/src/hooks/append-only.ts'
import { toolkitRoot } from '../../plugin/src/core/roots.ts'
import { SETTINGS_PATH } from '../../plugin/src/config/claude-settings.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OPTIONS = {
  owner: '@consumer',
  dryRun: false,
  stage: 'solo' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'team/living-docs',
}

/** The consumer's 97 rules, written the way it writes them: `RN001`. */
const CONSUMER_RULES = [
  '---',
  'title: Business rules',
  'owner: "@consumer"',
  'trigger: >',
  '  Before implementing any behavior, and on every new or changed rule.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '# Business rules',
  '',
  ...Array.from({ length: 97 }, (_, i) => {
    const id = `RN${String(i + 1).padStart(3, '0')}`

    // `draft`: what this fixture exercises is the written form and the ID count,
    // not the state machine. `active` would only bring the noise of living-docs/citation-coverage (a rule with no
    // test citing it), which is not the subject of criterion 12.
    return [`## ${id} — Rule number ${i + 1}`, '', '- **status:** draft', '', 'Rule prose.', ''].join('\n')
  }),
].join('\n')

const PROSE_DECISIONS = [
  '---',
  'title: Open decisions',
  'owner: "@consumer"',
  'trigger: >',
  '  Every time someone ran into a gap — behavior with no written rule.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## DA001 — How to round cents',
  '',
  '- **status:** open',
  '',
  '**Context:** billing rounds three different ways today.',
  '**Alternatives:** round up, banker\'s, truncate.',
  '**Recommendation:** banker\'s.',
  '**Status:** still under discussion with finance.',
  '',
  '## DA002 — Closing time zone',
  '',
  '- **status:** open',
  '',
  '**Context:** the closing runs in UTC and the report comes out in BRT.',
  '**Status:** waiting on the data team.',
  '',
].join('\n')

/** The `.claude/settings.json` the consumer already has, with its own hooks. */
const CONSUMER_SETTINGS = JSON.stringify(
  {
    hooks: {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: './scripts/audit.sh' }] }],
    },
    extraKnownMarketplaces: { 'internal-team': { source: { source: 'github', repo: 'time/plugins' } } },
  },
  null,
  2,
)

const CONSUMER_WORKFLOW = [
  'name: api',
  'on:',
  '  pull_request:',
  '    paths: ["services/api/**"]',
  'jobs:',
  '  test:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: npm ci && npm test',
  '',
].join('\n')

const CONSUMER = {
  'docs/business-rules.md': CONSUMER_RULES,
  'docs/open-questions.md': PROSE_DECISIONS,
  'docs/adr/.gitkeep': '',
  'docs/architecture/context.md': '# Context\n\nC4 level 1 drawing.\n',
  'docs/domains/billing.md': '# Billing\n\nDomain invariants.\n',
  'test/billing.test.ts': "test('RN001: rounds up', () => {});\n",
  '.claude/settings.json': CONSUMER_SETTINGS,
  '.github/workflows/api.yml': CONSUMER_WORKFLOW,
  'README.md': '# consumer\n',
}

/** Byte-for-byte fingerprint of the tree, to prove nothing pre-existing changed. */
function fingerprint(root: string, files: readonly string[]): Record<string, string> {
  const record: Record<string, string> = {}

  for (const file of files) {
    record[file] = readFileSync(join(root, file), 'utf8')
  }

  return record
}

const CONSUMER_OPTIONS = {
  owner: '@consumer',
  dryRun: false,
  stage: 'production' as const,
  idFormat: { separator: '', padding: 3 },
  // The consumer does not run Docker: this is how it calls the CLI.
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'team/living-docs',
}

test('DA-0001/RNF-0003: init writes to the validated repository, never to the toolkit', () => {
  const before = readdirSync(toolkitRoot()).sort()

  withTempRepo({ 'README.md': '# someone else\'s project\n' }, root => {
    assert.notEqual(root, toolkitRoot())

    const result = runInit(root, OPTIONS)

    assert.ok(result.created.includes(OWNERSHIP_FILE))
    assert.ok(existsSync(join(root, OWNERSHIP_FILE)))
    assert.ok(existsSync(join(root, 'docs/open-decisions.md')))

    // the templates came from the toolkit, and the toolkit gained no file
    assert.ok(readFileSync(join(root, OWNERSHIP_FILE), 'utf8').includes('@consumer'))
    assert.deepEqual(readdirSync(toolkitRoot()).sort(), before)
  })
})

test('DA-0001/RNF-0003: validate runs against the configuration of the validated repository', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    assert.equal(runValidate(root).exitCode, 0)

    // a violation planted there shows up there, with the path relative to that repo
    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
    writeFileSync(
      join(root, 'docs/decisions/adr/ADR-0001-x.md'),
      [
        '---',
        'id: ADR-0001',
        'title: X',
        'status: draft',
        'owner: "@consumer"',
        "trigger: ''",
        'last-reviewed: 2026-08-24',
        '---',
        '',
        'body',
      ].join('\n'),
      'utf8',
    )

    const result = runValidate(root)

    assert.equal(result.exitCode, 1)
    assert.ok(result.findings.some(f => f.file === 'docs/decisions/adr/ADR-0001-x.md'))
  })
})

test('DA-0001/RNF-0003: the hook decides by the configuration of the validated repository', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = 'docs/decisions/adr/ADR-0001-frozen.md'

    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
    writeFileSync(
      join(root, file),
      [
        '---',
        'id: ADR-0001',
        'title: Frozen',
        'status: accepted',
        'owner: "@consumer"',
        'trigger: Never.',
        'last-reviewed: 2026-08-24',
        '---',
        '',
        'original body',
      ].join('\n'),
      'utf8',
    )

    const decision = decideAppendOnly(
      { tool_name: 'Edit', tool_input: { file_path: file, old_string: 'original body', new_string: 'other' } },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'deny')
  })
})

test('criterion 12: the real consumer is adopted, and none of its files is rewritten', () => {
  withTempRepo(CONSUMER, root => {
    // `.claude/settings.json` is left out of the fingerprint: it is the only file the
    // init merges (RF-0013, DA-0003) — it never overwrites. Assertions 4 and 8
    // prove the merge preserved what the consumer already had.
    const preexisting = Object.keys(CONSUMER).filter(p => p !== 'docs/adr/.gitkeep' && p !== '.claude/settings.json')
    const before = fingerprint(root, preexisting)

    // --dry-run first: the inventory reports the form it found, and does not
    // adopt it silently (RF-0014).
    const dry = runInit(root, { ...CONSUMER_OPTIONS, idFormat: DEFAULT_ID_FORMAT, dryRun: true })

    assert.ok(dry.detected, 'the inventory did not report the consumer\'s written form')
    assert.equal(dry.detected?.format.separator, '')
    assert.equal(dry.detected?.format.padding, 3)
    assert.ok((dry.detected?.count ?? 0) >= 97, `only ${dry.detected?.count} occurrences read`)
    assert.deepEqual(fingerprint(root, preexisting), before, '--dry-run wrote to the repository')

    // Now the installation, with the declared form.
    const result = runInit(root, CONSUMER_OPTIONS)

    // 1 — nothing pre-existing was rewritten.
    assert.deepEqual(fingerprint(root, preexisting), before, 'init rewrote a pre-existing file')

    // 2 — the rules and the decisions were ADOPTED, not recreated.
    const adopted = result.adopted.map(e => e.path)

    assert.ok(adopted.includes('docs/business-rules.md'), JSON.stringify(result.adopted))
    assert.ok(adopted.includes('docs/open-questions.md'), JSON.stringify(result.adopted))
    assert.ok(!existsSync(join(root, 'docs/requirements/rules.md')), 'init created a parallel one')
    assert.ok(!existsSync(join(root, 'docs/open-decisions.md')), 'init created a parallel one')

    // 3 — the empty ADR directory is born adopted.
    assert.ok(adopted.includes('docs/adr/'), JSON.stringify(result.adopted))

    // 4 — the consumer's hooks and workflow are still there, and the toolkit's came in.
    const settings = JSON.parse(readFileSync(join(root, SETTINGS_PATH), 'utf8'))

    assert.ok(settings.hooks.PreToolUse.some((e: { matcher: string }) => e.matcher === 'Bash'))
    assert.ok(settings.extraKnownMarketplaces['internal-team'])
    assert.ok(settings.extraKnownMarketplaces['living-docs'])
    assert.ok(existsSync(join(root, '.github/workflows/api.yml')))
    assert.ok(existsSync(join(root, WORKFLOW_PATH)))

    // 5 — the installed workflow does not impose Docker on whoever installs it.
    const workflow = readFileSync(join(root, WORKFLOW_PATH), 'utf8')

    assert.doesNotMatch(workflow, /docker/i)
    assert.match(workflow, /npx living-docs validate/)

    // 6 — the CODEOWNERS, which it did not have, was written.
    assert.ok(existsSync(join(root, 'CODEOWNERS')))

    // 7 — the status in prose stays prose: turning it into a state is a human act.
    assert.match(readFileSync(join(root, 'docs/open-questions.md'), 'utf8'), /still under discussion/)

    // 8 — running again duplicates nothing.
    const second = runInit(root, CONSUMER_OPTIONS)

    assert.deepEqual(second.created, [], JSON.stringify(second.created))
    const settingsAfter = readFileSync(join(root, SETTINGS_PATH), 'utf8')

    assert.equal(settingsAfter.match(/living-docs@living-docs/g)?.length ?? 0, 1)
  })
})

test('criterion 12: layer 4 comes in with an owner and no skill, without any check changing', () => {
  withTempRepo(CONSUMER, root => {
    runInit(root, CONSUMER_OPTIONS)

    // Before declaring: the architecture documents have no owner, and whoever
    // complains is the core — owner coverage is of the whole repository's files,
    // not of a list of known types.
    const config = resolveOwnership(root)!
    const coverage = coreChecks().find(check => check.id === 'ownership/owner-coverage')!
    const noOwner = coverage.run({ root, config, today: '2026-09-28' })

    assert.ok(
      noOwner.some(f => f.file.startsWith('docs/architecture/')),
      JSON.stringify(noOwner, null, 2),
    )

    // The declaration: owner, no skill. Nothing beyond that. Both entries go
    // into `owned`, with living-docs' empty block so that layer 4 is also
    // living documentation.
    const ownership = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')
    const layer4 =
      '  - path: docs/architecture/\n    owner: "@consumer"\n    living-docs: {}\n' + '  - path: docs/domains/\n    owner: "@consumer"\n    living-docs: {}\n'

    writeFileSync(join(root, OWNERSHIP_FILE), ownership.replace('\nowned:\n', `\nowned:\n${layer4}`), 'utf8')

    // And the CODEOWNERS, which the core also enforces.
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    writeFileSync(join(root, 'CODEOWNERS'), `${codeowners}docs/architecture/    @consumer\ndocs/domains/    @consumer\n`, 'utf8')

    const result = runValidate(root)

    // The binary test: declaring layer 4 took an owner + a CODEOWNERS line, and
    // nothing else. No check needed to change for it to pass.
    const stillNoOwner = coverage.run({ root, config: resolveOwnership(root)!, today: '2026-09-28' })

    assert.deepEqual(
      stillNoOwner.filter(f => f.file.startsWith('docs/architecture/') || f.file.startsWith('docs/domains/')),
      [],
      'layer 4 required more than an owner and a CODEOWNERS line',
    )
    assert.deepEqual(
      result.findings.filter(f => f.file.startsWith('docs/architecture/') || f.file.startsWith('docs/domains/')),
      [],
      'layer 4 required more than an owner and a CODEOWNERS line',
    )

    // With no owning skill, living-docs/trigger-routing has no pair to cross: a document with no skill is not a finding.
    assert.deepEqual(
      result.findings.filter(f => f.ruleId === 'living-docs/trigger-routing'),
      [],
    )

    // What remains is the status in prose of the open decisions: turning it into
    // a machine state is a human act (spec §12), and init did not convert it. There is no finding
    // outside that one, and none of them comes from layer 4.
    for (const finding of result.findings) {
      assert.equal(finding.file, 'docs/open-questions.md', JSON.stringify(finding))
    }
  })
})

test('RN-0039: a freshly seeded repository reads a resolved decision without field-map', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)

    const ownership = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    assert.doesNotMatch(ownership, /field-map/)

    const decisionsPath = /- path: (\S*open-decisions\.md)/.exec(ownership)?.[1]

    assert.ok(decisionsPath, 'the seeded ownership file declares the open-decisions table')

    const decisions = join(root, decisionsPath)
    const seeded = readFileSync(decisions, 'utf8')
    const newline = seeded.endsWith('\n') ? '' : '\n'

    writeFileSync(decisions, `${seeded}${newline}| DA-0001 | A gap | resolved | — | — | 2026-09-29 |\n`)

    const coverage = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === decisionsPath)

    // The row names no resolver: the finding is about the empty value, and it
    // must not claim the column is missing.
    assert.equal(coverage.length, 1, JSON.stringify(coverage, null, 2))
    assert.doesNotMatch(coverage[0]?.fix ?? '', /field-map/)
  })
})
