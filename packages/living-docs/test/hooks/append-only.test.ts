import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideAppendOnly } from '../../src/hooks/append-only.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { HookEnv } from '../../src/hooks/lib/io.ts'
import type { HookDecision } from '../../src/hooks/append-only.ts'

/** Typed narrowing: without this, `decision.reason` does not exist for TypeScript. */
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
    'title: Event queue',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Never.',
    'last-reviewed: 2026-08-21',
    'superseded-by: null',
    '---',
    '',
    '## Context',
    'original text',
  ].join('\n')
}

const FILE = 'docs/decisions/adr/ADR-0001-queue.md'

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): HookDecision {
  let decision: HookDecision = { action: 'allow' }

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, ...files }, root => {
    const env: HookEnv = { root, hostRoots: [root] }

    decision = decideAppendOnly({ tool_name: 'Edit', tool_input: toolInput }, env)
  })

  return decision
}

test('RN-0006: denies changing the body of an accepted ADR — acceptance criterion 2', () => {
  const decision = decide(
    { [FILE]: adr('accepted') },
    {
      file_path: FILE,
      old_string: 'original text',
      new_string: 'corrected text',
    },
  )

  assertDeny(decision)
  assert.match(decision.reason, /superseded|supersed/i)
  assert.match(decision.reason, /decision-recorder/)
  assert.match(decision.reason, /ADR-0001-queue\.md/)
})

test('RN-0004: allows changing only status + superseded-by — that is how one supersedes', () => {
  const after = adr('superseded').replace('superseded-by: null', 'superseded-by: ADR-0002')
  const decision = decide({ [FILE]: adr('accepted') }, { file_path: FILE, content: after })

  assert.equal(decision.action, 'allow')
})

test('RN-0004: denies changing a field outside the allowlist even without touching the body', () => {
  const after = adr('accepted').replace('title: Event queue', 'title: Another title')
  const decision = decide({ [FILE]: adr('accepted') }, { file_path: FILE, content: after })

  assertDeny(decision)
  assert.match(decision.reason, /title/)
})

test('allows editing a draft ADR — draft is not a frozen state', () => {
  const decision = decide(
    { [FILE]: adr('draft') },
    {
      file_path: FILE,
      old_string: 'original text',
      new_string: 'new text',
    },
  )

  assert.equal(decision.action, 'allow')
})

test('allows creating a new item — a nonexistent file always passes', () => {
  const decision = decide(
    {},
    {
      file_path: 'docs/decisions/adr/ADR-0002-new.md',
      content: adr('draft'),
    },
  )

  assert.equal(decision.action, 'allow')
})

test('ignores a path outside any append-only artifact', () => {
  assert.equal(decide({ 'src/index.ts': 'x' }, { file_path: 'src/index.ts', content: 'y' }).action, 'allow')
  assert.equal(decide({ 'docs/open-decisions.md': 'x' }, { file_path: 'docs/open-decisions.md', content: 'y' }).action, 'allow')
})

test('RNF-0001: fail open — an unreadable .ownership.yml allows', () => {
  let decision: HookDecision = { action: 'deny', reason: 'should not happen' }

  withTempRepo({ [FILE]: adr('accepted') }, root => {
    decision = decideAppendOnly({ tool_name: 'Edit', tool_input: { file_path: FILE, old_string: 'original text', new_string: 'x' } }, { root, hostRoots: [root] })
  })
  assert.equal(decision.action, 'allow')
})

test('RNF-0001: fail open — an edit that cannot be projected allows', () => {
  const decision = decide(
    { [FILE]: adr('accepted') },
    {
      file_path: FILE,
      old_string: 'snippet that does not exist',
      new_string: 'x',
    },
  )

  assert.equal(decision.action, 'allow')
})

test('a payload without file_path allows', () => {
  assert.equal(decide({ [FILE]: adr('accepted') }, { content: 'x' }).action, 'allow')
})

test('accepts an absolute host file_path', () => {
  let decision: HookDecision = { action: 'allow' }

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, [FILE]: adr('accepted') }, root => {
    decision = decideAppendOnly(
      {
        tool_name: 'Edit',
        tool_input: { file_path: `${root}/${FILE}`, old_string: 'original text', new_string: 'x' },
      },
      { root, hostRoots: [root] },
    )
  })
  assert.equal(decision.action, 'deny')
})
