import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideWatchReminder } from '../../src/hooks/watch-reminder.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const env = (root: string) => ({ root, hostRoots: [root] })
const CONFIG = 'version: 2\nowned: []\nwatches:\n  - code: "src/checks/**"\n    doc: docs/requirements/rules.md\n    reason: x\n'

test('editar caminho vigiado lembra do doc dono', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root))

    assert.equal(decision.action, 'remind')
  })
})

test('editar o próprio doc dono não lembra dele mesmo', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'docs/requirements/rules.md' } }, env(root))

    assert.equal(decision.action, 'silent')
  })
})

test('caminho não vigiado, silêncio', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideWatchReminder({ tool_input: { file_path: 'src/outro.ts' } }, env(root)).action, 'silent')
  })
})

test('sem arquivo de ownership, o hook se cala (falha aberta)', () => {
  withTempRepo({}, root => {
    assert.equal(decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root)).action, 'silent')
  })
})

test('o lembrete nomeia o doc, o motivo e a skill dona, e não carrega decisão de permissão', () => {
  const config = "version: 2\nowned:\n  - path: docs/requirements/rules.md\n    owner: '@time'\n    skill: requirements-keeper\nwatches:\n  - code: 'src/**'\n    doc: docs/requirements/rules.md\n    reason: regra antes do código\n"

  withTempRepo({ '.ownership.yml': config }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/a.ts' } }, env(root))

    assert.equal(decision.action, 'remind')
    assert.ok(decision.action === 'remind')
    assert.match(decision.context, /docs\/requirements\/rules\.md/)
    assert.match(decision.context, /regra antes do código/)
    assert.match(decision.context, /requirements-keeper/)
    assert.doesNotMatch(decision.context, /permissionDecision/)
  })
})

test('doc dono sem skill declarada ainda é lembrado, e a mensagem aponta o CODEOWNERS', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root))

    assert.ok(decision.action === 'remind')
    assert.match(decision.context, /No skill declared/)
  })
})

test('payload sem file_path é silêncio', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideWatchReminder({ tool_input: {} }, env(root)).action, 'silent')
  })
})
