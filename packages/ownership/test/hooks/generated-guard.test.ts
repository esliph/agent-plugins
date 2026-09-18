import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideGeneratedGuard } from '../../src/hooks/generated-guard.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const env = (root: string) => ({ root, hostRoots: [root] })

test('caminho declarado em generated[] é negado, mesmo se o arquivo ainda não existe', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out.md\n    command: gen\n' }, root => {
    const decision = decideGeneratedGuard({ tool_input: { file_path: 'out.md' } }, env(root))

    assert.equal(decision.action, 'deny')
  })
})

test('arquivo com o marcador na primeira linha é negado', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': 'generated: do not edit\ncorpo\n' }, root => {
    const decision = decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root))

    assert.equal(decision.action, 'deny')
  })
})

test('arquivo comum é permitido', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': 'corpo comum\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
  })
})

test('sem .ownership.yml, falha aberta', () => {
  withTempRepo({}, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
  })
})
