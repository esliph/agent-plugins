import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideStatePromotion } from '../../src/hooks/state-promotion.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { StatePromotionDecision } from '../../src/hooks/state-promotion.ts'

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

const ADR_FILE = 'docs/decisions/adr/ADR-0001-fila.md'

function adr(status: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Fila de eventos',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Nunca.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '## Contexto',
  ].join('\n')
}

function openDecisions(status: string, resolvedBy: string): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@product"',
    'trigger: Toda vez que alguém trombou numa lacuna.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '| ID | Lacuna | Status | Resolvida por |',
    '| --- | --- | --- | --- |',
    `| DA-0001 | Reembolso parcial | ${status} | ${resolvedBy} |`,
  ].join('\n')
}

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): StatePromotionDecision {
  let decision: StatePromotionDecision = { action: 'allow' }

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, ...files }, root => {
    decision = decideStatePromotion({ tool_name: 'Edit', tool_input: toolInput }, { root, hostRoots: [root] })
  })

  return decision
}

test('RN-0005: pergunta ao promover ADR de draft para accepted', () => {
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

test('RN-0005: pergunta ao resolver uma DA na tabela', () => {
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

test('permite escrever draft — é o máximo que uma skill escreve', () => {
  const decision = decide({}, { file_path: ADR_FILE, content: adr('draft') })

  assert.equal(decision.action, 'allow')
})

test('permite alterações que não são promoção humana', () => {
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

test('permite adicionar linha nova em open na tabela', () => {
  const before = openDecisions('open', '—')
  const after = `${before}\n| DA-0002 | Outra lacuna | open | — |`

  assert.equal(decide({ 'docs/open-decisions.md': before }, { file_path: 'docs/open-decisions.md', content: after }).action, 'allow')
})

test('RNF-0001: falha aberta — sem configuração, permite', () => {
  let decision: StatePromotionDecision = { action: 'ask', reason: 'não deveria' }

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
    'title: Regras de negócio',
    'owner: "@team"',
    'trigger: A toda regra nova ou alterada.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    '## RN-0001 — Todo artefato tem um dono',
    '',
    `- **status:** ${status}`,
    '',
    'Enunciado.',
    '',
  ].join('\n')
}

test('RN-0005: promover um requisito de draft para active pergunta', () => {
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

test('RN-0005: revogar um requisito também pergunta', () => {
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

test('editar o enunciado de um requisito em draft não pergunta', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, [RULES_FILE]: rules('draft') }, root => {
    const decision = decideStatePromotion(
      {
        tool_name: 'Edit',
        tool_input: { file_path: RULES_FILE, old_string: 'Enunciado.', new_string: 'Outro enunciado.' },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'allow')
  })
})
