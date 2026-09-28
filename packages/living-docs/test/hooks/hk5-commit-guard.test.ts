import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideHk5, isGitCommit } from '../../src/hooks/hk5-commit-guard.ts'
import type { Hk5Decision } from '../../src/hooks/hk5-commit-guard.ts'
import type { GitRunner } from '../../src/git/staged.ts'
import { askOutput } from '../../src/hooks/lib/io.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const NUL = String.fromCharCode(0)

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
`

const staged =
  (...paths: string[]): GitRunner =>
  () =>
    paths.map(path => `${path}${NUL}`).join('')

function assertAsk(decision: Hk5Decision): asserts decision is { action: 'ask'; reason: string } {
  assert.equal(decision.action, 'ask')
}

function decide(command: string, run: GitRunner, config: string | null = CONFIG): Hk5Decision {
  let decision: Hk5Decision = { action: 'allow' }
  const files: Record<string, string> = config === null ? {} : { [OWNERSHIP_FILE]: config }

  withTempRepo(files, root => {
    decision = decideHk5({ tool_name: 'Bash', tool_input: { command } }, { root, hostRoots: [root] }, run)
  })

  return decision
}

test('RN-0008: staged toca caminho vigiado sem o doc dono — pergunta e lista os pendentes', () => {
  const decision = decide('git commit -m "feat: reembolso parcial"', staged('src/domain/reembolso.ts'))

  assertAsk(decision)
  assert.match(decision.reason, /docs\/requirements\/rules\.md/)
  assert.match(decision.reason, /src\/domain\/reembolso\.ts/)
  assert.match(decision.reason, /requirements-keeper/)
  assert.match(decision.reason, /HK-5/)
})

test('RN-0008: staged que traz o doc dono passa', () => {
  const run = staged('src/domain/reembolso.ts', 'docs/requirements/rules.md')

  assert.equal(decide('git commit -m "feat: reembolso parcial"', run).action, 'allow')
})

test('RN-0009: HK-5 pergunta, nunca nega', () => {
  const decision = decide('git commit -m "x"', staged('src/domain/reembolso.ts'))

  assertAsk(decision)
  const emitted = JSON.parse(askOutput(decision.reason)) as {
    hookSpecificOutput: { permissionDecision: string }
  }

  assert.equal(emitted.hookSpecificOutput.permissionDecision, 'ask')
})

test('a mensagem ensina as duas saídas legítimas', () => {
  const decision = decide('git commit -m "x"', staged('src/domain/reembolso.ts'))

  assertAsk(decision)
  assert.match(decision.reason, /atualize o doc/i)
  assert.match(decision.reason, /decisão humana|uma pessoa/i)
})

test('comando que não é git commit passa sem consultar o git', () => {
  let consultado = false
  const spy: GitRunner = () => {
    consultado = true

    return ''
  }

  for (const command of ['git status', 'npm test', 'git add -A', 'echo "git commit"']) {
    assert.equal(decide(command, spy).action, 'allow', command)
  }
  assert.equal(consultado, false)
})

test('reconhece git commit em cadeia e com opções', () => {
  assert.equal(isGitCommit('git commit'), true)
  assert.equal(isGitCommit('git add -A && git commit -m "x"'), true)
  assert.equal(isGitCommit('git -c user.name=Teste commit --amend'), true)
  assert.equal(isGitCommit('git status'), false)
  assert.equal(isGitCommit('npm run commitlint'), false)
})

test('RNF-0001: git indisponível — passa', () => {
  const explode: GitRunner = () => {
    throw new Error('fatal: not a git repository')
  }

  assert.equal(decide('git commit -m "x"', explode).action, 'allow')
})

test('RNF-0001: sem .ownership.yml — passa', () => {
  assert.equal(decide('git commit -m "x"', staged('src/domain/reembolso.ts'), null).action, 'allow')
})

test('índice vazio — passa', () => {
  assert.equal(decide('git commit -m "x"', () => '').action, 'allow')
})

test('tool_name diferente de Bash não é assunto deste hook', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG }, root => {
    const decision = decideHk5(
      { tool_name: 'Edit', tool_input: { command: 'git commit -m "x"' } },
      { root, hostRoots: [root] },
      staged('src/domain/reembolso.ts'),
    )

    assert.equal(decision.action, 'allow')
  })
})
