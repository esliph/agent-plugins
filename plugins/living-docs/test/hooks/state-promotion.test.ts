import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideStatePromotion } from '../../plugin/src/hooks/state-promotion.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { StatePromotionDecision } from '../../plugin/src/hooks/state-promotion.ts'

function assertAsk(decision: StatePromotionDecision): asserts decision is { action: 'ask'; reason: string } {
  assert.equal(decision.action, 'ask')
}

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
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
`

const ADR_FILE = 'docs/decisions/adr/ADR-0001-queue.md'

function adr(status: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Event queue',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Never.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '## Context',
  ].join('\n')
}

function openDecisions(status: string, resolvedBy: string): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@product"',
    'trigger: Every time someone bumped into a gap.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '| ID | Gap | Status | Resolved by |',
    '| --- | --- | --- | --- |',
    `| DA-0001 | Partial refund | ${status} | ${resolvedBy} |`,
  ].join('\n')
}

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): StatePromotionDecision {
  let decision: StatePromotionDecision = { action: 'allow' }

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, ...files }, root => {
    decision = decideStatePromotion({ tool_name: 'Edit', tool_input: toolInput }, { root, hostRoots: [root] })
  })

  return decision
}

test('RN-0005: asks when promoting an ADR from draft to accepted', () => {
  const decision = decide(
    { [ADR_FILE]: adr('draft') },
    {
      file_path: ADR_FILE,
      old_string: 'status: draft',
      new_string: 'status: accepted',
    },
  )

  assertAsk(decision)
  assert.match(decision.reason, /ADR-0001/)
  assert.match(decision.reason, /human/i)
  assert.match(decision.reason, /decision-recorder/)
})

test('RN-0005: asks when resolving a DA in the table', () => {
  const decision = decide(
    { 'docs/open-decisions.md': openDecisions('open', '—') },
    {
      file_path: 'docs/open-decisions.md',
      content: openDecisions('resolved', 'ADR-0002'),
    },
  )

  assertAsk(decision)
  assert.match(decision.reason, /DA-0001/)
})

test('allows writing draft — it is the most a skill writes', () => {
  const decision = decide({}, { file_path: ADR_FILE, content: adr('draft') })

  assert.equal(decision.action, 'allow')
})

test('allows changes that are not a human promotion', () => {
  const decision = decide(
    { [ADR_FILE]: adr('accepted') },
    {
      file_path: ADR_FILE,
      old_string: 'status: accepted',
      new_string: 'status: superseded',
    },
  )

  assert.equal(decision.action, 'allow')
})

test('allows adding a new open row to the table', () => {
  const before = openDecisions('open', '—')
  const after = `${before}\n| DA-0002 | Another gap | open | — |`

  assert.equal(decide({ 'docs/open-decisions.md': before }, { file_path: 'docs/open-decisions.md', content: after }).action, 'allow')
})

test('RNF-0001: fail open — without configuration, allows', () => {
  let decision: StatePromotionDecision = { action: 'ask', reason: 'should not happen' }

  withTempRepo({ [ADR_FILE]: adr('draft') }, root => {
    decision = decideStatePromotion(
      { tool_name: 'Edit', tool_input: { file_path: ADR_FILE, old_string: 'status: draft', new_string: 'status: accepted' } },
      { root, hostRoots: [root] },
    )
  })
  assert.equal(decision.action, 'allow')
})

const RULES_FILE = 'docs/requirements/rules.md'

function rules(status: string): string {
  return [
    '---',
    'title: Business rules',
    'owner: "@team"',
    'trigger: On every new or changed rule.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    '## RN-0001 — Every artifact has an owner',
    '',
    `- **status:** ${status}`,
    '',
    'Statement.',
    '',
  ].join('\n')
}

test('RN-0005: promoting a requirement from draft to active asks', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, [RULES_FILE]: rules('draft') }, root => {
    const decision = decideStatePromotion(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: RULES_FILE,
          old_string: '- **status:** draft',
          new_string: '- **status:** active',
        },
      },
      { root, hostRoots: [root] },
    )

    assertAsk(decision)
    assert.match(decision.reason, /RN-0001/)
    assert.match(decision.reason, /active/)
  })
})

test('RN-0005: revoking a requirement also asks', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, [RULES_FILE]: rules('active') }, root => {
    const decision = decideStatePromotion(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: RULES_FILE,
          old_string: '- **status:** active',
          new_string: '- **status:** revoked',
        },
      },
      { root, hostRoots: [root] },
    )

    assertAsk(decision)
    assert.match(decision.reason, /revoked/)
  })
})

test('editing the statement of a draft requirement does not ask', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, [RULES_FILE]: rules('draft') }, root => {
    const decision = decideStatePromotion(
      {
        tool_name: 'Edit',
        tool_input: { file_path: RULES_FILE, old_string: 'Statement.', new_string: 'Another statement.' },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'allow')
  })
})
