import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideAppendOnly } from '../../src/hooks/append-only.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { HookEnv } from '../../src/hooks/lib/io.ts'
import type { HookDecision } from '../../src/hooks/append-only.ts'

/** Narrowing tipado: sem isto, `decision.reason` não existe para o TypeScript. */
function assertDeny(decision: HookDecision): asserts decision is { action: 'deny'; reason: string } {
  assert.equal(decision.action, 'deny')
}

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]
  - path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
`

function adr(status: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Fila de eventos',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Nunca.',
    'last-reviewed: 2026-08-21',
    'superseded-by: null',
    '---',
    '',
    '## Contexto',
    'texto original',
  ].join('\n')
}

const FILE = 'docs/decisions/adr/ADR-0001-fila.md'

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): HookDecision {
  let decision: HookDecision = { action: 'allow' }

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, ...files }, root => {
    const env: HookEnv = { root, hostRoots: [root] }

    decision = decideAppendOnly({ tool_name: 'Edit', tool_input: toolInput }, env)
  })

  return decision
}

test('RN-0006: nega alterar o corpo de um ADR accepted — critério de aceite 2', () => {
  const decision = decide(
    { [FILE]: adr('accepted') },
    {
      file_path: FILE,
      old_string: 'texto original',
      new_string: 'texto corrigido',
    },
  )

  assertDeny(decision)
  assert.match(decision.reason, /superseded|supersed/i)
  assert.match(decision.reason, /decision-recorder/)
  assert.match(decision.reason, /ADR-0001-fila\.md/)
})

test('RN-0004: permite alterar só status + superseded-by — é assim que se supersede', () => {
  const after = adr('superseded').replace('superseded-by: null', 'superseded-by: ADR-0002')
  const decision = decide({ [FILE]: adr('accepted') }, { file_path: FILE, content: after })

  assert.equal(decision.action, 'allow')
})

test('RN-0004: nega mudar um campo fora da allowlist mesmo sem tocar no corpo', () => {
  const after = adr('accepted').replace('title: Fila de eventos', 'title: Outro título')
  const decision = decide({ [FILE]: adr('accepted') }, { file_path: FILE, content: after })

  assertDeny(decision)
  assert.match(decision.reason, /title/)
})

test('permite editar ADR em draft — draft não é estado congelado', () => {
  const decision = decide(
    { [FILE]: adr('draft') },
    {
      file_path: FILE,
      old_string: 'texto original',
      new_string: 'texto novo',
    },
  )

  assert.equal(decision.action, 'allow')
})

test('permite criar item novo — arquivo inexistente sempre passa', () => {
  const decision = decide(
    {},
    {
      file_path: 'docs/decisions/adr/ADR-0002-nova.md',
      content: adr('draft'),
    },
  )

  assert.equal(decision.action, 'allow')
})

test('ignora caminho fora de qualquer artefato append-only', () => {
  assert.equal(decide({ 'src/index.ts': 'x' }, { file_path: 'src/index.ts', content: 'y' }).action, 'allow')
  assert.equal(decide({ 'docs/open-decisions.md': 'x' }, { file_path: 'docs/open-decisions.md', content: 'y' }).action, 'allow')
})

test('RNF-0001: falha aberta — .ownership.yml ilegível permite', () => {
  let decision: HookDecision = { action: 'deny', reason: 'não deveria' }

  withTempRepo({ [FILE]: adr('accepted') }, root => {
    decision = decideAppendOnly({ tool_name: 'Edit', tool_input: { file_path: FILE, old_string: 'texto original', new_string: 'x' } }, { root, hostRoots: [root] })
  })
  assert.equal(decision.action, 'allow')
})

test('RNF-0001: falha aberta — edição não projetável permite', () => {
  const decision = decide(
    { [FILE]: adr('accepted') },
    {
      file_path: FILE,
      old_string: 'trecho que não existe',
      new_string: 'x',
    },
  )

  assert.equal(decision.action, 'allow')
})

test('payload sem file_path permite', () => {
  assert.equal(decide({ [FILE]: adr('accepted') }, { content: 'x' }).action, 'allow')
})

test('aceita file_path absoluto do host', () => {
  let decision: HookDecision = { action: 'allow' }

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, [FILE]: adr('accepted') }, root => {
    decision = decideAppendOnly(
      {
        tool_name: 'Edit',
        tool_input: { file_path: `${root}/${FILE}`, old_string: 'texto original', new_string: 'x' },
      },
      { root, hostRoots: [root] },
    )
  })
  assert.equal(decision.action, 'deny')
})
