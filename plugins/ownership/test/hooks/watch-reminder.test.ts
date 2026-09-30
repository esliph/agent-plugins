import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideWatchReminder } from '../../plugin/src/hooks/watch-reminder.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const env = (root: string) => ({ root, hostRoots: [root] })
const CONFIG = 'version: 2\nowned: []\nwatches:\n  - code: "src/checks/**"\n    doc: docs/requirements/rules.md\n    reason: x\n'

test('editing a watched path reminds of the owning doc', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root))

    assert.equal(decision.action, 'remind')
  })
})

test('editing the owning doc itself does not remind of itself', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'docs/requirements/rules.md' } }, env(root))

    assert.equal(decision.action, 'silent')
  })
})

test('unwatched path, silence', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideWatchReminder({ tool_input: { file_path: 'src/other.ts' } }, env(root)).action, 'silent')
  })
})

test('without an ownership file, the hook stays silent (fails open)', () => {
  withTempRepo({}, root => {
    assert.equal(decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root)).action, 'silent')
  })
})

test('the reminder names the doc, the reason and the owning skill, and carries no permission decision', () => {
  const config = "version: 2\nowned:\n  - path: docs/requirements/rules.md\n    owner: '@team'\n    skill: requirements-keeper\nwatches:\n  - code: 'src/**'\n    doc: docs/requirements/rules.md\n    reason: rule before the code\n"

  withTempRepo({ '.ownership.yml': config }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/a.ts' } }, env(root))

    assert.equal(decision.action, 'remind')
    assert.ok(decision.action === 'remind')
    assert.match(decision.context, /docs\/requirements\/rules\.md/)
    assert.match(decision.context, /rule before the code/)
    assert.match(decision.context, /requirements-keeper/)
    assert.doesNotMatch(decision.context, /permissionDecision/)
  })
})

test('an owning doc with no declared skill is still reminded, and the message points to CODEOWNERS', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root))

    assert.ok(decision.action === 'remind')
    assert.match(decision.context, /No skill declared/)
  })
})

test('payload without file_path is silence', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideWatchReminder({ tool_input: {} }, env(root)).action, 'silent')
  })
})
