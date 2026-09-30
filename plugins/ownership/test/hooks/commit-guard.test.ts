import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideCommitGuard, isGitCommit } from '../../plugin/src/hooks/commit-guard.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const env = (root: string) => ({ root, hostRoots: [root] })
const CONFIG = 'version: 2\nowned: []\nwatches:\n  - code: "src/checks/**"\n    doc: docs/requirements/rules.md\n    reason: x\n'

test('isGitCommit recognizes "git commit" at the start and after a separator', () => {
  assert.equal(isGitCommit('git commit -m "x"'), true)
  assert.equal(isGitCommit('npm test && git commit -m "x"'), true)
  assert.equal(isGitCommit('git status'), false)
})

test('isGitCommit recognizes "git commit" in a multi-line Bash command', () => {
  assert.equal(isGitCommit('npm test\ngit commit -m "x"'), true)
})

test('not Bash, allow', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideCommitGuard({ tool_name: 'Edit', tool_input: { command: 'git commit -m x' } }, env(root)).action, 'allow')
  })
})

test('staged touches a watched path without the doc: ask', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

    assert.equal(decision.action, 'ask')
  })
})

test('staged brings both: allow', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard(
      { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } },
      env(root),
      () => 'src/checks/a.ts\0docs/requirements/rules.md\0',
    )

    assert.equal(decision.action, 'allow')
  })
})

test('git runner fails (no git): fails open, allow', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => {
      throw new Error('no git')
    })

    assert.equal(decision.action, 'allow')
  })
})

test('without an ownership file, the hook stays silent (fails open)', () => {
  withTempRepo({}, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

    assert.equal(decision.action, 'allow')
  })
})

test('the message teaches the two legitimate ways out: update the doc, or a human decision', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

    assert.ok(decision.action === 'ask')
    assert.match(decision.reason, /update the doc/i)
    assert.match(decision.reason, /human decision/i)
  })
})

test('a command that is not git commit passes without consulting git', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    let consulted = false
    const spy = () => {
      consulted = true

      return ''
    }

    for (const command of ['git status', 'npm test', 'git add -A', 'echo "git commit"']) {
      assert.equal(decideCommitGuard({ tool_name: 'Bash', tool_input: { command } }, env(root), spy).action, 'allow', command)
    }
    assert.equal(consulted, false)
  })
})

test('empty index passes', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => '').action, 'allow')
  })
})
