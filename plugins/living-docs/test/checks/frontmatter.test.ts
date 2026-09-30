import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsFrontmatter } from '../../plugin/src/checks/frontmatter.ts'
import { collectArtifacts } from '../../plugin/src/docs/collect.ts'
import { loadLivingDocsConfig } from '../../plugin/src/config/ownership.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { Finding } from '../../plugin/src/core/types.ts'

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

function adr(fields: Record<string, string>, body = '\n## Context\n'): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`)

  return ['---', ...lines, '---', body].join('\n')
}

const GOOD_ADR = adr({
  id: 'ADR-0001',
  title: 'Event queue',
  status: 'accepted',
  owner: '"@team"',
  trigger: 'Never. Immutable once accepted; a new decision supersedes it.',
  'last-reviewed': '2026-08-21',
})

const GOOD_DA = [
  '---',
  'title: Open Decisions',
  'owner: "@product"',
  'trigger: Every time someone ran into a gap.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '| ID | Gap | Status |',
  '| --- | --- | --- |',
  '| DA-0001 | Partial refund | open |',
].join('\n')

function run(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, ...files }, root => {
    const config = loadLivingDocsConfig(root)

    findings = livingDocsFrontmatter.run({ root, config, docs: collectArtifacts(root, config), documents: [], today: '2026-08-27' })
  })

  return findings
}

test('well-formed artifacts produce no finding', () => {
  assert.deepEqual(run({ 'docs/decisions/adr/ADR-0001-queue.md': GOOD_ADR, 'docs/open-decisions.md': GOOD_DA }), [])
})

test('missing frontmatter fails on line 1', () => {
  const findings = run({ 'docs/decisions/adr/ADR-0001-x.md': '# No frontmatter\n' })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/frontmatter')
  assert.equal(findings[0]?.line, 1)
  assert.equal(findings[0]?.severity, 'error')
  assert.match(findings[0]?.message ?? '', /frontmatter/i)
})

test('invalid YAML in the block fails without taking the check down', () => {
  const findings = run({ 'docs/decisions/adr/ADR-0001-x.md': '---\nid: ADR-0001\ntitle: "unterminated\n---\n' })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /YAML|invalid/i)
})

test('each missing required field becomes a finding', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({ id: 'ADR-0001', status: 'draft' }),
  })
  const missing = findings.filter(f => /required field/i.test(f.message)).map(f => f.message)

  for (const field of ['title', 'owner', 'trigger', 'last-reviewed']) {
    assert.ok(
      missing.some(m => m.includes(field)),
      `should flag ${field}`,
    )
  }
})

test('RN-0002, RN-0038: a trigger worded as a cadence is not judged by the check', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'review quarterly',
      'last-reviewed': '2026-08-21',
    }),
  })

  assert.deepEqual(findings, [])
})

test('RN-0002: a trigger that is only whitespace is an empty required field', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: "'   '",
      'last-reviewed': '2026-08-21',
    }),
  })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/frontmatter')
  assert.equal(findings[0]?.severity, 'error')
  assert.match(findings[0]?.message ?? '', /`trigger`/)
})

test('last-reviewed outside ISO fails', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'Never.',
      'last-reviewed': '21/08/2026',
    }),
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /last-reviewed/)
})

test('an id that does not match the artifact prefix fails', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'TDR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'Never.',
      'last-reviewed': '2026-08-21',
    }),
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR/)
})

test('table collection: the container needs no id, but each item needs a status', () => {
  const bad = GOOD_DA.replace('| DA-0001 | Partial refund | open |', '| DA-0001 | Partial refund |  |')
  const findings = run({ 'docs/open-decisions.md': bad })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.line, 10)
  assert.match(findings[0]?.message ?? '', /DA-0001.*status/)
})

test('a prefix with no declared state machine fails asking for `states`', () => {
  const config = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/x/
    owner: "@team"
    skill: s
    living-docs: { id-prefix: XX }
`
  let findings: Finding[] = []

  withTempRepo(
    {
      [OWNERSHIP_FILE]: config,
      'docs/x/XX-0001-a.md': adr({
        id: 'XX-0001',
        title: 'x',
        status: 'draft',
        owner: '"@team"',
        trigger: 'Never.',
        'last-reviewed': '2026-08-21',
      }),
    },
    root => {
      const parsed = loadLivingDocsConfig(root)

      findings = livingDocsFrontmatter.run({ root, config: parsed, docs: collectArtifacts(root, parsed), documents: [], today: '2026-08-27' })
    },
  )
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.fix ?? '', /states/)
})
