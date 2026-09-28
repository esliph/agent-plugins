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

test('isGitCommit reconhece "git commit" em comando Bash multi-linha', () => {
  assert.equal(isGitCommit('npm test\ngit commit -m "x"'), true)
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

test('a mensagem ensina as duas saídas legítimas: atualizar o doc, ou decisão humana', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

    assert.ok(decision.action === 'ask')
    assert.match(decision.reason, /atualize o doc/i)
    assert.match(decision.reason, /decisão humana/i)
  })
})

test('comando que não é git commit passa sem consultar o git', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    let consultado = false
    const spy = () => {
      consultado = true

      return ''
    }

    for (const command of ['git status', 'npm test', 'git add -A', 'echo "git commit"']) {
      assert.equal(decideCommitGuard({ tool_name: 'Bash', tool_input: { command } }, env(root), spy).action, 'allow', command)
    }
    assert.equal(consultado, false)
  })
})

test('índice vazio passa', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => '').action, 'allow')
  })
})
