import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runLint } from '../../plugin/src/cli/lint.ts'
import { CONFIG, capability, change, kanon, project, proposal, requirement, withProject } from '../helpers/project.ts'

const VALID = requirement('CHK-001', 'Ubiquitous', 'THE Checkout SHALL show the total.')

function ruleIds(files: Record<string, string>): string[] {
  let ids: string[] = []

  withProject(files, root => {
    ids = runLint(root).findings.map(finding => finding.ruleId)
  })

  return ids
}

test('RN-0042: an ID that is not a prefix, a hyphen and three digits from 001 to 999 is an error', () => {
  for (const id of ['CHK-14', 'CHK-1000', 'CHK-000', 'chk-014', 'C-001', 'CHECKS-001']) {
    assert.deepEqual(ruleIds(project(requirement(id, 'Ubiquitous', 'THE Checkout SHALL show the total.'))), ['kanon/id-format'], id)
  }
  assert.deepEqual(ruleIds(project(VALID)), [])
})

test('RN-0043: an ID whose prefix has no registry file is an error', () => {
  assert.deepEqual(ruleIds(project(requirement('PAY-001', 'Ubiquitous', 'THE Checkout SHALL show the total.'))), ['kanon/id-registered'])
})

test('RN-0043: a registry whose prefix is not the name of its file does not parse', () => {
  withProject(project(VALID, { '.kanon/capabilities/PAY.md': capability('CHK', 'payment', 0) }), root => {
    assert.throws(() => runLint(root), /PAY\.md: `prefix` must be PAY/)
  })
})

test('RN-0044: the same ID in two requirements is an error, even across specs', () => {
  const files = project(VALID, { 'specs/payment/spec.md': VALID })

  withProject(files, root => {
    const findings = runLint(root).findings

    assert.deepEqual(
      findings.map(finding => [finding.file, finding.ruleId]),
      [['specs/payment/spec.md', 'kanon/id-unique']],
    )
    assert.match(findings[0]?.message ?? '', /specs\/checkout\/spec\.md:3/)
  })
})

test('RN-0044: a requirement carrying a tombstone is an error', () => {
  assert.deepEqual(ruleIds(project(VALID, { '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 20, ['CHK-001']) })), ['kanon/id-tombstone'])
})

test('RN-0045: a requirement or a tombstone above the counter is an error', () => {
  assert.deepEqual(ruleIds(project(requirement('CHK-021', 'Ubiquitous', 'THE Checkout SHALL show the total.'))), ['kanon/id-counter'])

  withProject(project(VALID, { '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 20, ['CHK-030']) }), root => {
    assert.deepEqual(
      runLint(root).findings.map(finding => [finding.file, finding.line, finding.ruleId]),
      [['.kanon/capabilities/CHK.md', 5, 'kanon/id-counter']],
    )
  })
})

test('RN-0046: a counter at 900 or more is a warning, and a warning does not fail the run', () => {
  withProject(project(VALID, { '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 900) }), root => {
    const result = runLint(root)

    assert.deepEqual(
      result.findings.map(finding => [finding.ruleId, finding.severity]),
      [['kanon/capacity', 'warning']],
    )
    assert.equal(result.exitCode, 0)
  })
  assert.deepEqual(ruleIds(project(VALID, { '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 899) })), [])
})

test('RN-0046: a capability at the threshold of active requirements is a warning, and the project sets the threshold', () => {
  const spec = [1, 2, 3].map(number => requirement(`CHK-00${number}`, 'Ubiquitous', 'THE Checkout SHALL show the total.')).join('\n')
  const lowered = CONFIG.replace('active-requirements: 150', 'active-requirements: 3')

  assert.deepEqual(ruleIds(project(spec)), [])
  withProject(project(spec, { '.kanon/config.yml': lowered }), root => {
    const [finding, ...rest] = runLint(root).findings

    assert.deepEqual(rest, [])
    assert.equal(finding?.ruleId, 'kanon/capacity')
    assert.equal(finding?.severity, 'warning')
    assert.match(finding?.message ?? '', /3 active requirements/)
  })
})

test('RN-0047: the heading names the pattern its criterion has', () => {
  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Event', 'THE Checkout SHALL show the total.'))), ['kanon/ears-pattern'])
  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Sometimes', 'THE Checkout SHALL show the total.'))), ['kanon/ears-pattern'])
  assert.deepEqual(ruleIds(project('### CHK-001\n\nTHE Checkout SHALL show the total.\n')), ['kanon/ears-pattern'])
  assert.deepEqual(ruleIds(project('### CHK-001 [Ubiquitous]\n\n### CHK-002 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n')), ['kanon/ears-pattern'])
})

test('RN-0047: the metadata line under a criterion is not part of it', () => {
  const spec =
    '### CHK-001 [Unwanted]\nIF the coupon is expired, THEN THE Checkout\nSHALL reject it.\nStory: US-CHK-03 · Status: approved · Since: THE first change\n'

  assert.deepEqual(ruleIds(project(spec)), [])
})

test('RN-0048: a criterion with two responses is an error of shape, on the line of the criterion', () => {
  withProject(project(requirement('CHK-001', 'Ubiquitous', 'THE Checkout SHALL reject it and SHALL show a message.')), root => {
    assert.deepEqual(
      runLint(root).findings.map(finding => [finding.line, finding.ruleId]),
      [[5, 'kanon/ears-shape']],
    )
  })
})

test('RN-0049: a forbidden word in a criterion is an error, as a whole word and in any letter case', () => {
  const config = CONFIG.replace('forbidden-words: []', 'forbidden-words: [fast, "as needed"]')

  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Ubiquitous', 'THE Checkout SHALL be Fast.'), { '.kanon/config.yml': config })), [
    'kanon/forbidden-word',
  ])
  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Ubiquitous', 'THE Checkout SHALL retry as  needed.'), { '.kanon/config.yml': config })), [
    'kanon/forbidden-word',
  ])
  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Ubiquitous', 'THE Checkout SHALL fasten the order.'), { '.kanon/config.yml': config })), [])
})

test('RN-0050: a marked term and the system name must be glossary terms', () => {
  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Ubiquitous', 'THE Checkout SHALL apply the [[Coupon]].'))), [])
  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Ubiquitous', 'THE [[checkout]] SHALL apply the coupon.'))), [])
  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Ubiquitous', 'THE Checkout SHALL apply the [[gift card]].'))), ['kanon/glossary-term'])
  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Ubiquitous', 'THE Billing SHALL apply the coupon.'))), ['kanon/glossary-term'])
  assert.deepEqual(ruleIds(project(requirement('CHK-001', 'Ubiquitous', 'THE Checkout SHALL apply the gift card.'))), [])
})

test('RN-0050: a banned term is an error wherever it appears, pointing to its row in the glossary', () => {
  for (const criterion of ['THE Checkout SHALL apply the Voucher.', 'THE Checkout SHALL apply the [[voucher]].']) {
    withProject(project(requirement('CHK-001', 'Ubiquitous', criterion)), root => {
      const findings = runLint(root).findings

      assert.deepEqual(
        findings.map(finding => finding.ruleId),
        ['kanon/glossary-term'],
        criterion,
      )
      assert.match(findings[0]?.message ?? '', /specs\/glossary\.md:7/)
    })
  }
})

test('RN-0051: the glossary is read where the configuration points, in a table another tool keeps', () => {
  const config = CONFIG.replace('glossary: specs/glossary.md', 'glossary: docs/glossary.md')
  const foreign = [
    '| Term | Definition | Name in code | Do not confuse with | Source | Status |',
    '| --- | --- | --- | --- | --- | --- |',
    '| `Checkout` | The purchase flow | `checkout` | — | — | active |',
    '| basket | Old name | — | cart | — | banned |',
    '',
  ].join('\n')
  const files = project(requirement('CHK-001', 'Ubiquitous', 'THE Checkout SHALL empty the basket.'), {
    '.kanon/config.yml': config,
    'docs/glossary.md': foreign,
  })

  withProject(files, root => {
    const findings = runLint(root).findings

    assert.equal(findings.length, 1)
    assert.match(findings[0]?.message ?? '', /docs\/glossary\.md:4/)
  })
})

test('RF-0018: each finding names the file, the line, the rule and the severity, and an error exits 1', () => {
  withProject(project(requirement('CHK-14', 'Ubiquitous', 'THE Checkout SHALL show the total.')), root => {
    const run = kanon(root, 'lint')

    assert.equal(run.status, 1, run.stderr)
    assert.match(run.stdout, /^specs\/checkout\/spec\.md:3 {2}kanon\/id-format {2}error {2}/m)
    assert.match(run.stdout, /kanon: 1 error, 0 warnings\./)
  })
})

test('RF-0018: with no error the command exits 0, warnings included', () => {
  withProject(project(VALID, { '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 950) }), root => {
    const run = kanon(root, 'lint')

    assert.equal(run.status, 0, run.stderr)
    assert.match(run.stdout, /\.kanon\/capabilities\/CHK\.md:4 {2}kanon\/capacity {2}warning/)
  })
  withProject(project(VALID), root => {
    const run = kanon(root, 'lint')

    assert.equal(run.status, 0, run.stderr)
    assert.match(run.stdout, /kanon: no findings\./)
  })
})

test('RF-0018: given paths, only the findings of those specs are reported', () => {
  const broken = requirement('CHK-14', 'Ubiquitous', 'THE Checkout SHALL show the total.')

  withProject(project(broken, { 'specs/payment/spec.md': VALID }), root => {
    assert.equal(kanon(root, 'lint', 'specs/payment/spec.md').status, 0)
    assert.equal(kanon(root, 'lint', 'specs/checkout/spec.md').status, 1)
    assert.equal(kanon(root, 'lint', 'specs/nothing/spec.md').status, 2)
  })
})

test('RF-0018: with no configuration, or one that does not parse, the command exits 2', () => {
  withProject({}, root => {
    const run = kanon(root, 'lint')

    assert.equal(run.status, 2)
    assert.match(run.stderr, /kanon init/)
  })
  withProject(project(VALID, { '.kanon/config.yml': 'thresholds: [' }), root => {
    assert.equal(kanon(root, 'lint').status, 2)
  })
  withProject(project(VALID, { '.kanon/capabilities/CHK.md': '# no front matter\n' }), root => {
    assert.equal(kanon(root, 'lint').status, 2)
  })
})

// --- Open changes -----------------------------------------------------------

const CHANGE = '2026-10-02-coupon-redemption'
const OTHER = '2026-10-02-loyalty'
const DELTA_FILE = `changes/${CHANGE}/specs/checkout/spec.md`
const OTHER_FILE = `changes/${OTHER}/specs/checkout/spec.md`
const SHOWS = 'THE Checkout SHALL show the total.'

const CURRENT = [
  requirement('CHK-003', 'Ubiquitous', 'THE Checkout SHALL accept any coupon.'),
  requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`),
].join('\n')

const DELTA = [
  '## ADDED',
  '',
  `${requirement('CHK-015', 'Unwanted', 'IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.')}Supersedes: CHK-003\n`,
  '## MODIFIED',
  '',
  requirement('CHK-009', 'Event', 'WHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.'),
  '## REMOVED',
  '',
  '### CHK-003',
  '',
  'Reason: replaced by CHK-015, which names the expired case.',
  '',
].join('\n')

/** A delta with one section and the given blocks under it. */
function section(operation: string, ...blocks: string[]): string {
  return [`## ${operation}`, '', ...blocks].join('\n')
}

function removal(id: string): string {
  return `### ${id}\n\nReason: no longer needed.\n`
}

function found(files: Record<string, string>): [string, number, string, string][] {
  let findings: [string, number, string, string][] = []

  withProject(files, root => {
    findings = runLint(root).findings.map(finding => [finding.file, finding.line, finding.ruleId, finding.severity])
  })

  return findings
}

test('RF-0029: the lint covers every open change, and a change that breaks nothing has no finding', () => {
  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: DELTA }))), [])
  // RN-0052: a change with only a proposal is a valid open change.
  assert.deepEqual(found(project(CURRENT, change(CHANGE))), [])
})

test('RF-0029: an archived change is never checked', () => {
  const archived = { 'changes/archive/2026-09-14-guest-checkout/specs/payment/spec.md': section('Bogus', requirement('CHK-14', 'Nope', 'nothing')) }

  assert.deepEqual(found(project(CURRENT, archived)), [])
})

test('RF-0029: a requirement under ADDED or MODIFIED is held to every rule of a requirement, and one under REMOVED to none', () => {
  const delta = [
    section(
      'ADDED',
      requirement('CHK-14', 'Ubiquitous', SHOWS), // 3
      requirement('PAY-001', 'Ubiquitous', SHOWS), // 7
      requirement('CHK-021', 'Ubiquitous', SHOWS), // 11
      requirement('CHK-015', 'Event', SHOWS), // 15
      requirement('CHK-016', 'Ubiquitous', 'THE Checkout SHALL reject it and SHALL show a message.'), // 19, criterion at 21
      requirement('CHK-017', 'Ubiquitous', 'THE Checkout SHALL be fast.'), // 23, criterion at 25
      requirement('CHK-018', 'Ubiquitous', 'THE Billing SHALL show the total.'), // 27, criterion at 29
    ),
    section('MODIFIED', requirement('CHK-009', 'Event', 'WHEN the voucher is applied, THE Checkout SHALL show the total.')), // 31, heading 33, criterion at 35
    section('REMOVED', '### CHK-003', '', 'Reason: THE old rule SHALL not be read, and SHALL not be judged as a criterion.', ''),
  ].join('\n')
  const config = CONFIG.replace('forbidden-words: []', 'forbidden-words: [fast]')

  assert.deepEqual(found(project(CURRENT, { '.kanon/config.yml': config, ...change(CHANGE, { checkout: delta }) })), [
    [DELTA_FILE, 3, 'kanon/id-format', 'error'],
    [DELTA_FILE, 7, 'kanon/id-registered', 'error'],
    [DELTA_FILE, 11, 'kanon/id-counter', 'error'],
    [DELTA_FILE, 15, 'kanon/ears-pattern', 'error'],
    [DELTA_FILE, 21, 'kanon/ears-shape', 'error'],
    [DELTA_FILE, 25, 'kanon/forbidden-word', 'error'],
    [DELTA_FILE, 29, 'kanon/glossary-term', 'error'],
    [DELTA_FILE, 35, 'kanon/glossary-term', 'error'],
  ])
})

test('RF-0029: given paths, a path under changes/ is read as a delta, and only its findings are reported', () => {
  const files = project(CURRENT, {
    ...change(CHANGE, { checkout: section('ADDED', requirement('CHK-14', 'Ubiquitous', SHOWS)) }),
    'changes/archive/2026-09-14-guest-checkout/specs/checkout/spec.md': section('ADDED'),
  })

  withProject(files, root => {
    const delta = kanon(root, 'lint', DELTA_FILE)

    assert.equal(delta.status, 1, delta.stderr)
    assert.match(delta.stdout, new RegExp(`^${DELTA_FILE}:3 {2}kanon/id-format {2}error {2}`, 'm'))
    assert.equal(kanon(root, 'lint', 'specs/checkout/spec.md').status, 0)
    assert.equal(kanon(root, 'lint').status, 1)

    for (const path of [
      `changes/${CHANGE}/proposal.md`,
      `changes/${CHANGE}`,
      'changes/archive/2026-09-14-guest-checkout/specs/checkout/spec.md',
      `changes/${OTHER}/specs/checkout/spec.md`,
    ]) {
      const run = kanon(root, 'lint', path)

      assert.equal(run.status, 2, path)
      assert.match(run.stderr, /is not a delta of an open change/, path)
    }
  })
})

test('RN-0046: the capacity warnings measure the current specs, not what a change would make of them', () => {
  const lowered = CONFIG.replace('active-requirements: 150', 'active-requirements: 3')
  const delta = section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS))

  assert.deepEqual(found(project(CURRENT, { '.kanon/config.yml': lowered, ...change(CHANGE, { checkout: delta }) })), [])
})

test('RN-0052: a folder under changes/ is named by a change ID, and its proposal says the same ID', () => {
  const files = project(CURRENT, {
    ...change('coupon-redemption'),
    'changes/2026-10-02-a/specs/checkout/spec.md': section('ADDED'),
    'changes/2026-10-02-b/proposal.md': '# only prose\n',
    'changes/2026-10-02-c/proposal.md': proposal('2026-10-02-other'),
    'changes/2026-10-02-d/proposal.md': '---\nstatus: open\n---\n',
    'changes/2026-10-02-e/proposal.md': '---\nchange: [\n---\n',
    'changes/notes.md': 'a file under changes/ is not a change\n',
  })

  assert.deepEqual(found(files), [
    ['changes/2026-10-02-a/proposal.md', 0, 'kanon/change-shape', 'error'],
    ['changes/2026-10-02-b/proposal.md', 0, 'kanon/change-shape', 'error'],
    ['changes/2026-10-02-c/proposal.md', 2, 'kanon/change-shape', 'error'],
    ['changes/2026-10-02-d/proposal.md', 0, 'kanon/change-shape', 'error'],
    ['changes/2026-10-02-e/proposal.md', 0, 'kanon/change-shape', 'error'],
    ['changes/coupon-redemption', 0, 'kanon/change-shape', 'error'],
  ])
})

test('RN-0053: a delta sits at the path of the spec of a registered capability', () => {
  const files = project(CURRENT, change(CHANGE, { payment: section('ADDED'), 'checkout/drafts': section('ADDED') }))

  assert.deepEqual(found(files), [
    [`changes/${CHANGE}/specs/checkout/drafts/spec.md`, 0, 'kanon/delta-shape', 'error'],
    [`changes/${CHANGE}/specs/payment/spec.md`, 0, 'kanon/delta-shape', 'error'],
  ])
})

test('RN-0053: a delta has only the three sections, each at most once, and no requirement outside them', () => {
  const delta = [
    requirement('CHK-015', 'Ubiquitous', SHOWS), // 1
    '## Notes', // 5
    '',
    '## REMOVED', // 7
    '',
    '### CHK-003', // 9
    '',
    '## REMOVED', // 11
    '',
  ].join('\n')

  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: delta }))), [
    [DELTA_FILE, 1, 'kanon/delta-shape', 'error'],
    [DELTA_FILE, 5, 'kanon/delta-shape', 'error'],
    // RN-0054: a REMOVED says why.
    [DELTA_FILE, 9, 'kanon/delta-shape', 'error'],
    [DELTA_FILE, 11, 'kanon/delta-shape', 'error'],
  ])
})

test('RN-0054: a MODIFIED and a REMOVED name a requirement that is in the spec the delta mirrors', () => {
  const delta = [
    section('MODIFIED', requirement('CHK-010', 'Ubiquitous', SHOWS), requirement('BIL-001', 'Ubiquitous', SHOWS)), // 3, 7
    section('REMOVED', removal('CHK-011')), // 13
    // An ADDED may carry any registered prefix.
    section('ADDED', requirement('BIL-002', 'Ubiquitous', SHOWS)),
  ].join('\n')
  const files = project(CURRENT, {
    '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 5),
    'specs/billing/spec.md': requirement('BIL-001', 'Ubiquitous', SHOWS),
    ...change(CHANGE, { checkout: delta }),
  })

  withProject(files, root => {
    const findings = runLint(root).findings

    assert.deepEqual(
      findings.map(finding => [finding.file, finding.line, finding.ruleId]),
      [
        [DELTA_FILE, 3, 'kanon/delta-target'],
        [DELTA_FILE, 7, 'kanon/delta-target'],
        [DELTA_FILE, 13, 'kanon/delta-target'],
      ],
    )
    assert.equal(findings[0]?.message, 'CHK-010 is not a requirement of specs/checkout/spec.md.')
    assert.match(findings[1]?.message ?? '', /it lives in specs\/billing\/spec\.md/)
  })
})

test('RN-0055: an ADDED reuses neither the ID of an active requirement nor a tombstone', () => {
  const delta = section('ADDED', requirement('CHK-003', 'Ubiquitous', SHOWS), requirement('CHK-007', 'Ubiquitous', SHOWS))
  const files = project(CURRENT, { '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 20, ['CHK-007']), ...change(CHANGE, { checkout: delta }) })

  withProject(files, root => {
    const findings = runLint(root).findings

    assert.deepEqual(
      findings.map(finding => [finding.line, finding.ruleId]),
      [
        [3, 'kanon/delta-added'],
        [7, 'kanon/delta-added'],
      ],
    )
    assert.match(findings[0]?.message ?? '', /specs\/checkout\/spec\.md:3/)
    assert.match(findings[1]?.message ?? '', /tombstone/)
  })
})

test('RN-0055: an ID appears in one operation of a change, across all its deltas', () => {
  const checkout = [section('MODIFIED', requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`)), section('REMOVED', removal('CHK-009'))].join(
    '\n',
  )
  const twice = section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS), requirement('CHK-015', 'Ubiquitous', SHOWS))
  const billing = { '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 0), 'specs/billing/spec.md': '# billing\n' }

  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout }))), [[DELTA_FILE, 9, 'kanon/delta-duplicate', 'error']])
  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: twice }))), [[DELTA_FILE, 7, 'kanon/delta-duplicate', 'error']])
  // The delta of billing is read first, so the finding is on the second place the ID is written.
  assert.deepEqual(
    found(
      project(CURRENT, {
        ...billing,
        ...change(CHANGE, {
          billing: section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS)),
          checkout: section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS)),
        }),
      }),
    ),
    [[DELTA_FILE, 3, 'kanon/delta-duplicate', 'error']],
  )
})

test('RN-0056: a Supersedes under ADDED names a requirement the same change removes', () => {
  // The metadata line comes right under the criterion: line 6.
  const added = section('ADDED', `${requirement('CHK-015', 'Ubiquitous', SHOWS)}Supersedes: CHK-003\n`)
  const carried = section('MODIFIED', `${requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`)}Supersedes: CHK-001\n`)

  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: added }))), [[DELTA_FILE, 6, 'kanon/delta-supersedes', 'error']])
  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: [added, section('REMOVED', removal('CHK-003'))].join('\n') }))), [])
  // A MODIFIED carries the whole requirement, with the Supersedes an earlier change gave it.
  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: carried }))), [])
})

test('RN-0057: two open changes that add the same ID, or touch a requirement the other removes, are an error on both', () => {
  const pairs: [string, string][] = [
    [section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS)), section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS))],
    [section('MODIFIED', requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`)), section('REMOVED', removal('CHK-009'))],
    [section('REMOVED', removal('CHK-003')), section('REMOVED', removal('CHK-003'))],
  ]

  for (const [mine, theirs] of pairs) {
    withProject(project(CURRENT, { ...change(CHANGE, { checkout: mine }), ...change(OTHER, { checkout: theirs }) }), root => {
      const result = runLint(root)

      assert.deepEqual(
        result.findings.map(finding => [finding.file, finding.line, finding.ruleId, finding.severity]),
        [
          [DELTA_FILE, 3, 'kanon/delta-conflict', 'error'],
          [OTHER_FILE, 3, 'kanon/delta-conflict', 'error'],
        ],
        mine,
      )
      // Each finding names the other folder.
      assert.match(result.findings[0]?.message ?? '', new RegExp(OTHER))
      assert.match(result.findings[1]?.message ?? '', new RegExp(CHANGE))
    })
  }
})

test('RN-0057: two open changes that modify the same requirement are warned, and a warning does not fail the run', () => {
  const modified = section('MODIFIED', requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`))

  withProject(project(CURRENT, { ...change(CHANGE, { checkout: modified }), ...change(OTHER, { checkout: modified }) }), root => {
    const result = runLint(root)

    assert.deepEqual(
      result.findings.map(finding => [finding.file, finding.ruleId, finding.severity]),
      [
        [DELTA_FILE, 'kanon/delta-conflict', 'warning'],
        [OTHER_FILE, 'kanon/delta-conflict', 'warning'],
      ],
    )
    assert.equal(result.exitCode, 0)
  })
})

test('RN-0057: an ADDED in one change and a MODIFIED of the same ID in another are not a conflict between them', () => {
  const files = project(CURRENT, {
    ...change(CHANGE, { checkout: section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS)) }),
    ...change(OTHER, { checkout: section('MODIFIED', requirement('CHK-015', 'Ubiquitous', SHOWS)) }),
  })

  // The MODIFIED is wrong on its own: the requirement is not in the current spec yet.
  assert.deepEqual(found(files), [[OTHER_FILE, 3, 'kanon/delta-target', 'error']])
})
