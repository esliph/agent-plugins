import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decideHk8 } from '../../src/hooks/hk8-open-decision-guard.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map:
        blocks: "Bloqueia"
        gap: "Lacuna"
`

const TABELA = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Lacuna | Status | Bloqueia | Aberta em |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | Como arredondar centavos | open | `src/cobranca/**` | 2026-08-28 |',
  '',
].join('\n')

const ARVORE = { [OWNERSHIP_FILE]: CONFIG, 'docs/open-decisions.md': TABELA }

test('RN-0026: editar caminho reivindicado pergunta, nomeando a decisão e a skill dona', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk8(
      { tool_name: 'Edit', tool_input: { file_path: 'src/cobranca/taxa.ts', old_string: 'a', new_string: 'b' } },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'ask')
    const reason = decision.action === 'ask' ? decision.reason : ''

    assert.match(reason, /DA-0001/)
    assert.match(reason, /centavos/, 'a lacuna precisa ser nomeada')
    assert.match(reason, /decision-recorder/)
    assert.match(reason, /docs\/open-decisions\.md/)
  })
})

test('RN-0026: caminho não reivindicado passa em silêncio', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk8({ tool_name: 'Write', tool_input: { file_path: 'src/relatorio/pdf.ts', content: 'x' } }, { root, hostRoots: [root] })

    assert.equal(decision.action, 'allow')
  })
})

test('RN-0026: escrever na própria decisão nunca é bloqueado', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk8(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'docs/open-decisions.md', old_string: 'open', new_string: 'resolved' },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'allow')
  })
})

test('RNF-0001: sem configuração legível, HK-8 falha aberta', () => {
  withTempRepo({}, root => {
    const decision = decideHk8({ tool_name: 'Edit', tool_input: { file_path: 'src/x.ts' } }, { root, hostRoots: [root] })

    assert.equal(decision.action, 'allow')
  })
})

test('RN-0026: HK-8 pergunta e não conhece a palavra deny', () => {
  const source = readFileSync(join(toolkitRoot(), 'src/hooks/hk8-open-decision-guard.ts'), 'utf8')

  assert.doesNotMatch(source, /\bdenyOutput\b/, 'hook que julga está no lugar errado (spec §1)')
})
