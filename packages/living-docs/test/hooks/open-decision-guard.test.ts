import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decideOpenDecisionGuard } from '../../src/hooks/open-decision-guard.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: "@team"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map:
        blocks: "Blocks"
        gap: "Gap"
`

const TABLE = [
  '---',
  'title: Open Decisions',
  'owner: "@team"',
  'trigger: Every time someone bumped into a gap.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Gap | Status | Blocks | Opened on |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | How to round cents | open | `src/billing/**` | 2026-08-28 |',
  '',
].join('\n')

const TREE = { [OWNERSHIP_FILE]: CONFIG, 'docs/open-decisions.md': TABLE }

test('RN-0026: editing a claimed path asks, naming the decision and the owning skill', () => {
  withTempRepo(TREE, root => {
    const decision = decideOpenDecisionGuard(
      { tool_name: 'Edit', tool_input: { file_path: 'src/billing/fee.ts', old_string: 'a', new_string: 'b' } },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'ask')
    const reason = decision.action === 'ask' ? decision.reason : ''

    assert.match(reason, /DA-0001/)
    assert.match(reason, /cents/, 'the gap must be named')
    assert.match(reason, /decision-recorder/)
    assert.match(reason, /docs\/open-decisions\.md/)
  })
})

test('RN-0026: an unclaimed path passes silently', () => {
  withTempRepo(TREE, root => {
    const decision = decideOpenDecisionGuard({ tool_name: 'Write', tool_input: { file_path: 'src/report/pdf.ts', content: 'x' } }, { root, hostRoots: [root] })

    assert.equal(decision.action, 'allow')
  })
})

test('RN-0026: writing to the decision itself is never blocked', () => {
  withTempRepo(TREE, root => {
    const decision = decideOpenDecisionGuard(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'docs/open-decisions.md', old_string: 'open', new_string: 'resolved' },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'allow')
  })
})

test('RNF-0001: without a readable configuration, living-docs/open-decision-guard fails open', () => {
  withTempRepo({}, root => {
    const decision = decideOpenDecisionGuard({ tool_name: 'Edit', tool_input: { file_path: 'src/x.ts' } }, { root, hostRoots: [root] })

    assert.equal(decision.action, 'allow')
  })
})

test('RN-0026: living-docs/open-decision-guard asks and does not know the word deny', () => {
  const source = readFileSync(join(toolkitRoot(), 'src/hooks/open-decision-guard.ts'), 'utf8')

  assert.doesNotMatch(source, /\bdenyOutput\b/, 'a hook that judges is in the wrong place (spec §1)')
})
