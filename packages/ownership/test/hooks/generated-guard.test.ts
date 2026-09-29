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

test('o marcador só conta na primeira linha — prosa sobre ele, ou marcador na linha 20, não congela o arquivo', () => {
  const corpo = ['# Título', ...Array.from({ length: 18 }, () => 'linha'), 'generated: do not edit', 'fim'].join('\n')

  // Prosa sobre o marcador bem depois da primeira linha: é o caso da spec, e a
  // frase na primeira linha do arquivo seria, de fato, o marcador.
  const prosa = `${'linha de prosa\n'.repeat(400)}o marcador \`generated: do not edit\` é da spec\n`

  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': corpo, 'y.md': prosa }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'y.md' } }, env(root)).action, 'allow')
  })
})

test('payload sem file_path permite', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: {} }, env(root)).action, 'allow')
  })
})

test('file_path absoluto do host sob a raiz é traduzido e negado quando gerado', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out.md\n    command: gen\n' }, root => {
    const absolute = `${root.split('\\').join('/')}/out.md`

    assert.equal(decideGeneratedGuard({ tool_input: { file_path: absolute } }, env(root)).action, 'deny')
  })
})

test('generated[] exige caminho exato — diretório declarado não cobre o que está dentro dele', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out/\n    command: gen\n', 'out/a.md': 'corpo\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'out/a.md' } }, env(root)).action, 'allow')
  })
})
