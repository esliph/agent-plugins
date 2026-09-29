import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
const CONTRATO = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')

test('RN-0010: o contrato do agente aponta para os artefatos donos', () => {
  const alvos = [
    'docs/superpowers/research/2026-08-24-living-documentation-toolkit.md',
    '.ownership.yml',
    'CONTRIBUTING.md',
    'docs/definition-of-done.md',
    'docs/requirements/',
    'docs/glossary.md',
    'docs/charter/',
  ]

  for (const alvo of alvos) {
    assert.ok(CONTRATO.includes(alvo), `o contrato deveria apontar para ${alvo}`)
  }
})

test('RN-0010: o contrato não copia o enunciado de requisito nenhum', () => {
  const titulos = ['rules.md', 'functional.md', 'non-functional.md'].flatMap(arquivo =>
    [...readFileSync(join(ROOT, 'docs/requirements', arquivo), 'utf8').matchAll(/^## (R[NF]F?-\d{4} — .+)$/gm)].map(match => match[1] ?? ''),
  )

  assert.ok(titulos.length >= 11, `esperava os requisitos das Fases 0 a 3, achei ${titulos.length}`)
  for (const titulo of titulos) {
    assert.equal(CONTRATO.includes(titulo), false, `o contrato copia o requisito "${titulo}"`)
  }
})

test('RN-0010: o contrato é índice, não manual — cabe numa tela', () => {
  const linhas = CONTRATO.split('\n').length

  assert.ok(linhas <= 60, `contrato com ${linhas} linhas: índice que não cabe numa tela vira manual`)
})

test('a Definition of Done nomeia a verificação de cada item', () => {
  const dod = readFileSync(join(ROOT, 'docs/definition-of-done.md'), 'utf8')
  const itens = dod.split('\n').filter(linha => linha.trim().startsWith('- [ ]'))

  assert.ok(itens.length >= 6, `DoD com apenas ${itens.length} itens`)
  for (const item of itens) {
    assert.match(item, /\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|human/i, `item sem verificação nomeada — ${item}`)
  }
})

test('RN-0030: o contrato do agente e o template dele dizem que texto para fora não carrega ID, e quem cobra', () => {
  const template = readFileSync(join(toolkitRoot(), 'templates/agent-contract.md'), 'utf8')

  // The repository contract keeps its Portuguese phrase until the corpus is translated.
  for (const [nome, fonte, frase] of [
    ['CLAUDE.md', CONTRATO, /quem lê de fora/],
    ['templates/agent-contract.md', template, /readers on the outside/],
  ] as const) {
    assert.match(fonte, frase, `${nome} sem a política de fronteira de leitor`)
    assert.match(fonte, /living-docs\/external-audience/, `${nome} sem nomear quem cobra`)
  }
})
