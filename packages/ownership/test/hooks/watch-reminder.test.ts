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
