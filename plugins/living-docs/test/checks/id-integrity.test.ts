import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsIdIntegrity } from '../../plugin/src/checks/id-integrity.ts'
import { collectArtifacts } from '../../plugin/src/docs/collect.ts'
import { loadLivingDocsConfig } from '../../plugin/src/config/ownership.ts'
import { RETIRED_IDS_PATH } from '../../plugin/src/ids/citations.ts'
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

function adr(id: string, body = ''): string {
  return ['---', `id: ${id}`, 'title: Decision', 'status: draft', 'owner: "@team"', 'trigger: Never.', 'last-reviewed: 2026-08-21', '---', '', body].join('\n')
}

function openDecisions(rows: string[]): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@product"',
    'trigger: Every time someone ran into a gap.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '| ID | Gap | Status | Resolved by |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n')
}

function run(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, ...files }, root => {
    const config = loadLivingDocsConfig(root)

    findings = livingDocsIdIntegrity.run({ root, config, docs: collectArtifacts(root, config), documents: [], today: '2026-08-27' })
  })

  return findings
}

test('an intact sequence and citations that resolve produce no finding', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Closes DA-0001.'),
      'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002'),
      'docs/open-decisions.md': openDecisions(['| DA-0001 | Gap | resolved | ADR-0001 |']),
    }),
    [],
  )
})

test('a duplicate ID fails naming both files', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0001-b.md': adr('ADR-0001'),
    'docs/open-decisions.md': openDecisions([]),
  })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/id-integrity')
  assert.match(findings[0]?.message ?? '', /ADR-0001/)
  assert.match(findings[0]?.message ?? '', /ADR-0001-a\.md/)
})

test('an ID present in ids-retired.txt reappearing fails', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'ADR-0001\n',
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /recycled|retired/i)
})

test('RN-0003: ADR-001 and ADR-0001 are the same logical ID — a duplicate, not two artifacts', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-001-b.md': adr('ADR-001'),
    'docs/open-decisions.md': openDecisions([]),
  })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/id-integrity')
  assert.match(findings[0]?.message ?? '', /Duplicate/)
  // The message shows the ID as the person wrote it, not the canonical form.
  assert.match(findings[0]?.message ?? '', /Duplicate ID ADR-001/)
  assert.match(findings[0]?.message ?? '', /ADR-0001-a\.md/)
})

test('RN-0003: repadding does not recycle a retired ID — retired ADR-0002 blocks ADR-002', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-002-b.md': adr('ADR-002'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'ADR-0002\n',
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ID ADR-002 is in/)
  assert.match(findings[0]?.message ?? '', /recycled/i)
})

test('a retired ID without canonical padding still blocks the padded form', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'ADR-002\n',
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ID ADR-0002 is in/)
})

test('a sequence gap fails pointing at the retired registry', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003'),
    'docs/open-decisions.md': openDecisions([]),
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0002/)
  assert.equal(findings[0]?.file, RETIRED_IDS_PATH)
})

test('a gap explained by ids-retired.txt does not fail', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
      'docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003'),
      'docs/open-decisions.md': openDecisions([]),
      [RETIRED_IDS_PATH]: 'ADR-0002\n',
    }),
    [],
  )
})

test('RN-0007: a citation that does not resolve fails on the citation line', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Supersedes ADR-0099.'),
    'docs/open-decisions.md': openDecisions([]),
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0099/)
  assert.equal(findings[0]?.file, 'docs/decisions/adr/ADR-0001-a.md')
})

test('RN-0007: a citation to a retired ID fails', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'See DA-0001.'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'DA-0001\n',
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /DA-0001/)
  assert.match(findings[0]?.message ?? '', /retired/i)
})

test('a citation of an undeclared prefix is ignored — phased installation', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Implements RN-014 and RF-002.'),
      'docs/open-decisions.md': openDecisions([]),
    }),
    [],
  )
})

test('RN-0024: the sequence gap message comes out in the written form of the project', () => {
  const config = CONFIG.replace('owned:', 'living-docs:\n  id-format: { separator: "", padding: 3 }\nowned:')
  let findings: Finding[] = []

  withTempRepo(
    {
      [OWNERSHIP_FILE]: config,
      'docs/decisions/adr/ADR001-a.md': adr('ADR001'),
      'docs/decisions/adr/ADR003-c.md': adr('ADR003'),
      'docs/open-decisions.md': openDecisions([]),
    },
    root => {
      const parsed = loadLivingDocsConfig(root)

      findings = livingDocsIdIntegrity.run({
        root,
        config: parsed,
        docs: collectArtifacts(root, parsed),
        documents: [],
        today: '2026-08-27',
      })
    },
  )

  assert.equal(findings.length, 1, JSON.stringify(findings, null, 2))
  assert.match(findings[0]?.message ?? '', /ADR002/, 'the suggested ID comes from writeId, in the form of the project')
  assert.doesNotMatch(findings[0]?.message ?? '', /ADR-0002/, 'no check builds an ID by concatenation')
})
