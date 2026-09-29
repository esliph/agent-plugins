import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runValidate } from '../../src/cli/validate.ts'
import { OwnershipError } from '../../src/config/ownership.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: .ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
    living-docs: {}
`

const GOOD = [
  '---',
  'id: ADR-0001',
  'title: Fila de eventos',
  'status: draft',
  'owner: "@team"',
  'trigger: Nunca. Imutável após aceito.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '## Contexto',
].join('\n')

test('RF-0001: repositório conforme sai com 0', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/decisions/adr/ADR-0001-a.md': GOOD }, root => {
    const result = runValidate(root)

    assert.deepEqual(result.findings, [])
    assert.equal(result.exitCode, 0)
    // RNF-0005: o resultado traz o que mediu, e a medida não é estimada.
    assert.ok(result.elapsedMs > 0, 'elapsedMs veio zerado — o relógio não foi lido')
  })
})

test('RF-0001: erro de qualquer check leva a exit 1', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0001-a.md': GOOD.replace('trigger: Nunca. Imutável após aceito.', "trigger: ''"),
    },
    root => {
      const result = runValidate(root)

      assert.equal(result.errors, 1)
      assert.equal(result.exitCode, 1)
      assert.equal(result.findings[0]?.ruleId, 'living-docs/frontmatter')
    },
  )
})

test('roda todos os checks do registry, não só o primeiro', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG,
      'docs/decisions/adr/ADR-0001-a.md': GOOD,
      'docs/decisions/adr/ADR-0003-c.md': GOOD.replace('ADR-0001', 'ADR-0003'),
    },
    root => {
      const result = runValidate(root)

      assert.ok(result.findings.some(finding => finding.ruleId === 'living-docs/id-integrity'))
    },
  )
})

test('arquivo de ownership ausente propaga OwnershipError', () => {
  withTempRepo({ 'README.md': '' }, root => {
    assert.throws(() => runValidate(root), OwnershipError)
  })
})

test('RF-0010: aviso é reportado e não muda o código de saída', () => {
  const antigo = GOOD.replace('last-reviewed: 2026-08-21', 'last-reviewed: 2020-01-01')

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/decisions/adr/ADR-0001-a.md': antigo }, root => {
    const result = runValidate(root)

    assert.equal(result.warnings, 1, JSON.stringify(result.findings, null, 2))
    assert.equal(result.errors, 0)
    assert.equal(result.exitCode, 0, 'living-docs/staleness avisa; aviso não reprova (spec §9)')
    assert.equal(result.findings[0]?.ruleId, 'living-docs/staleness')
  })
})
