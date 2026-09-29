import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECK_CATALOG, validateChecks } from '../../src/checks/registry.ts'

test('RF-0006, RF-0008 e RF-0010: o catálogo cobre exatamente os checks que existem', () => {
  const reais = validateChecks().map(check => `${check.id}|${check.name}`).sort()
  const catalogados = CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}`).sort()

  assert.deepEqual(catalogados, reais, 'catálogo e registry divergiram — o contrato gerado mentiria')
})

test('o catálogo é lido por gente: segue a ordem em que os checks rodam', () => {
  assert.deepEqual(
    CHECK_CATALOG.map(entry => entry.id),
    validateChecks().map(check => check.id),
  )
})

test('RF-0006: todo item do catálogo diz quando falha e por qual comando roda', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} sem condição de falha escrita`)
    assert.match(entry.command, /^living-docs validate( --base <ref>)?$/, `${entry.id} com comando estranho`)
  }
})

test('ADR-0005, ADR-0006 e ADR-0010: cada check roda no comando que o catálogo nomeia', () => {
  const esperado: Record<string, string> = {
    'living-docs/frontmatter': 'living-docs validate',
    'living-docs/id-integrity': 'living-docs validate',
    'living-docs/citation-coverage': 'living-docs validate',
    'living-docs/staleness': 'living-docs validate',
    'living-docs/agent-contract-duplication': 'living-docs validate',
    'living-docs/done-verifiable': 'living-docs validate',
    'living-docs/open-decision-claim': 'living-docs validate --base <ref>',
    'living-docs/links': 'living-docs validate',
    'living-docs/commit-discipline': 'living-docs validate',
    'living-docs/trigger-routing': 'living-docs validate',
    'living-docs/external-audience': 'living-docs validate',
  }

  for (const entry of CHECK_CATALOG) {
    assert.equal(entry.command, esperado[entry.id], `${entry.id} no comando errado`)
  }
  assert.equal(CHECK_CATALOG.length, Object.keys(esperado).length, 'check novo sem comando esperado declarado')
})

test('RF-0011: validateChecks recebe o diff por parâmetro, e sem ele a lista é a mesma', () => {
  const semDiff = validateChecks().map(check => check.id)
  const comDiff = validateChecks({ base: 'origin/master', changed: [], messages: [], edits: [] }).map(check => check.id)

  assert.deepEqual(semDiff, comDiff, 'a metade do diff é comportamento de living-docs/open-decision-claim e living-docs/commit-discipline, não um check a mais')
  assert.deepEqual(semDiff, ['living-docs/frontmatter', 'living-docs/id-integrity', 'living-docs/citation-coverage', 'living-docs/staleness', 'living-docs/agent-contract-duplication', 'living-docs/done-verifiable', 'living-docs/open-decision-claim', 'living-docs/links', 'living-docs/commit-discipline', 'living-docs/trigger-routing', 'living-docs/external-audience'])
})
