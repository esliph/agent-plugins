import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runLint } from '../../plugin/src/cli/lint.ts'
import { CONFIG, capability, kanon, project, requirement, withProject } from '../helpers/project.ts'

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
