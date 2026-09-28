import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideHk4 } from '../../src/hooks/hk4-watch-reminder.ts'
import type { Hk4Decision } from '../../src/hooks/hk4-watch-reminder.ts'
import { contextOutput } from '../../src/hooks/lib/io.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
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
    reason: "comportamento novo exige regra com ID antes do código"
  - code: "plugin/skills/**"
    doc: CONTRIBUTING.md
    reason: "skill nova muda como se trabalha aqui"
`

function assertRemind(decision: Hk4Decision): asserts decision is { action: 'remind'; context: string } {
  assert.equal(decision.action, 'remind')
}

function decide(filePath: string, config: string | null = CONFIG): Hk4Decision {
  let decision: Hk4Decision = { action: 'silent' }
  const files: Record<string, string> = config === null ? {} : { [OWNERSHIP_FILE]: config }

  withTempRepo(files, root => {
    decision = decideHk4({ tool_name: 'Edit', tool_input: { file_path: filePath } }, { root, hostRoots: [root] })
  })

  return decision
}

test('RN-0008: editar caminho vigiado lembra o doc dono, com motivo e skill', () => {
  const decision = decide('src/domain/reembolso.ts')

  assertRemind(decision)
  assert.match(decision.context, /docs\/requirements\/rules\.md/)
  assert.match(decision.context, /regra com ID antes do código/)
  assert.match(decision.context, /requirements-keeper/)
  assert.match(decision.context, /HK-4/)
})

test('RN-0009: HK-4 lembra e não bloqueia — a saída não carrega decisão de permissão', () => {
  const decision = decide('src/domain/reembolso.ts')

  assertRemind(decision)
  assert.match(decision.context, /não é bloqueio|lembrete/i)

  const emitted = JSON.parse(contextOutput('PostToolUse', decision.context)) as {
    hookSpecificOutput: Record<string, unknown>
  }

  assert.equal(emitted.hookSpecificOutput.hookEventName, 'PostToolUse')
  assert.equal(typeof emitted.hookSpecificOutput.additionalContext, 'string')
  assert.equal('permissionDecision' in emitted.hookSpecificOutput, false)
})

test('doc dono sem skill declarada ainda é lembrado', () => {
  const decision = decide('plugin/skills/nova/SKILL.md')

  assertRemind(decision)
  assert.match(decision.context, /CONTRIBUTING\.md/)
})

test('editar o próprio doc dono não gera lembrete', () => {
  assert.equal(decide('docs/requirements/rules.md').action, 'silent')
})

test('caminho fora de watches é silêncio', () => {
  assert.equal(decide('README.md').action, 'silent')
})

test('RNF-0001: sem configuração legível, silêncio', () => {
  assert.equal(decide('src/domain/reembolso.ts', null).action, 'silent')
})

test('payload sem file_path é silêncio', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG }, root => {
    const decision = decideHk4({ tool_name: 'Edit', tool_input: {} }, { root, hostRoots: [root] })

    assert.equal(decision.action, 'silent')
  })
})
