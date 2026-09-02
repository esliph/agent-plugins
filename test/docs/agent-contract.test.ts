import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const ROOT = toolkitRoot()
const CONTRATO = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')

test('RN-0010: o contrato do agente aponta para os artefatos donos', () => {
  const alvos = [
    'docs/superpowers/research/2026-08-24-living-documentation-toolkit.md',
    'docs/.ownership.yml',
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
    assert.match(item, /CI-\d|HK-\d|human/i, `item sem verificação nomeada — ${item}`)
  }
})
