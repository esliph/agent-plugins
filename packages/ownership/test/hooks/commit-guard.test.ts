import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideCommitGuard, isGitCommit } from '../../src/hooks/commit-guard.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const env = (root: string) => ({ root, hostRoots: [root] })
const CONFIG = 'version: 2\nowned: []\nwatches:\n  - code: "src/checks/**"\n    doc: docs/requirements/rules.md\n    reason: x\n'

test('isGitCommit reconhece "git commit" no início e depois de separador', () => {
  assert.equal(isGitCommit('git commit -m "x"'), true)
  assert.equal(isGitCommit('npm test && git commit -m "x"'), true)
  assert.equal(isGitCommit('git status'), false)
})

test('não é Bash, allow', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideCommitGuard({ tool_name: 'Edit', tool_input: { command: 'git commit -m x' } }, env(root)).action, 'allow')
  })
})

test('staged toca vigiado sem o doc: pergunta', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

    assert.equal(decision.action, 'ask')
  })
})

test('staged traz os dois: allow', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard(
      { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } },
      env(root),
      () => 'src/checks/a.ts\0docs/requirements/rules.md\0',
    )

    assert.equal(decision.action, 'allow')
  })
})

test('git runner falha (sem git): falha aberta, allow', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => {
      throw new Error('sem git')
    })

    assert.equal(decision.action, 'allow')
  })
})

test('sem arquivo de ownership, o hook se cala (falha aberta)', () => {
  withTempRepo({}, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

    assert.equal(decision.action, 'allow')
  })
})
