import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECK_CATALOG, changelogChecks, driftChecks, validateChecks } from '../../src/checks/registry.ts'

test('RF-0006, RF-0008 e RF-0010: o catálogo cobre exatamente os checks que existem', () => {
  const reais = [...validateChecks(), ...driftChecks(() => ''), ...changelogChecks()].map(check => `${check.id}|${check.name}`).sort()
  const catalogados = CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}`).sort()

  assert.deepEqual(catalogados, reais, 'catálogo e registry divergiram — o contrato gerado mentiria')
})

test('o catálogo é lido por gente: fica ordenado por ID', () => {
  const ids = CHECK_CATALOG.map(entry => Number(entry.id.replace('CI-', '')))

  assert.deepEqual(
    ids,
    [...ids].sort((a, b) => a - b),
  )
})

test('RF-0006: todo item do catálogo diz quando falha e por qual comando roda', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} sem condição de falha escrita`)
    assert.match(entry.command, /^living-docs (validate|drift|changelog --base <ref>)$/, `${entry.id} com comando estranho`)
  }
})

test('ADR-0005, ADR-0006 e ADR-0010: cada check roda no comando que o catálogo nomeia', () => {
  const esperado: Record<string, string> = {
    'CI-1': 'living-docs validate',
    'CI-2': 'living-docs validate',
    'CI-3': 'living-docs validate',
    'CI-4': 'living-docs validate',
    'CI-5': 'living-docs drift',
    'CI-6': 'living-docs changelog --base <ref>',
    'CI-7': 'living-docs validate',
    'CI-8': 'living-docs validate',
    'CI-9': 'living-docs validate',
    'CI-10': 'living-docs validate',
  }

  for (const entry of CHECK_CATALOG) {
    assert.equal(entry.command, esperado[entry.id], `${entry.id} no comando errado`)
  }
  assert.equal(CHECK_CATALOG.length, Object.keys(esperado).length, 'check novo sem comando esperado declarado')
})

test('RF-0011: validateChecks recebe o diff por parâmetro, e sem ele a lista é a mesma', () => {
  const semDiff = validateChecks().map(check => check.id)
  const comDiff = validateChecks({ base: 'origin/master', changed: [], messages: [], edits: [] }).map(check => check.id)

  assert.deepEqual(semDiff, comDiff, 'a metade do diff é comportamento de CI-7, não um check a mais')
  assert.deepEqual(semDiff, ['CI-1', 'CI-2', 'CI-3', 'CI-4', 'CI-7', 'CI-8', 'CI-9', 'CI-10'])
})
