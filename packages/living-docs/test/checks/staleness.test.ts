import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsStaleness, duePayments, debtsWithoutTrigger, payWhenOf, staleDocs } from '../../src/checks/staleness.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const HOJE = '2026-08-27'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
living-docs:
  stale-after-months: 6
owned:
  - path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]
  - path: docs/decisions/debt/
    owner: "@time"
    skill: decision-recorder
    states: [open, paid, accepted-permanently]
    living-docs: { id-prefix: TDR, append-only: true }
  - path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
    living-docs: {}
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
    living-docs: {}
`

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = configFrom(ownership)

  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: HOJE,
  }
}

function adr(status: string, lastReviewed: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Decisão de teste',
    `status: ${status}`,
    'owner: "@time"',
    'trigger: Nunca. Imutável após aceito.',
    `last-reviewed: ${lastReviewed}`,
    'relates-to: [RN-0001]',
    '---',
    '',
    'corpo',
  ].join('\n')
}

/** `pay-when` em YAML com aspas simples: aspas simples não processam `\`, e o padrão é regex. */
const PAY_WHEN = ['pay-when:', "  pattern: '^- \\*\\*status:\\*\\* revoked'", '  paths: ["docs/requirements/**"]']

function debt(status: string, extra: readonly string[] = []): string {
  return [
    '---',
    'id: TDR-0001',
    'title: Atalho de teste',
    `status: ${status}`,
    'owner: "@time"',
    'trigger: Quando o gatilho de pagamento abaixo se cumprir.',
    'last-reviewed: 2026-08-01',
    ...extra,
    '---',
    '',
    '# TDR-0001 — Atalho de teste',
    '',
    'O gatilho é o primeiro PR que revogar um requisito.',
  ].join('\n')
}

const RULES_ATIVA = [
  '---',
  'title: Regras',
  'owner: "@time"',
  'trigger: A toda regra nova.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '## RN-0001 — Uma regra qualquer',
  '',
  '- **status:** active',
  '',
  'O enunciado.',
].join('\n')

const RULES_REVOGADA = RULES_ATIVA.replace('- **status:** active', '- **status:** revoked')

test('RN-0018: documento além do limite avisa, e aviso não é erro', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('draft', '2026-01-01'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      const findings = livingDocsStaleness.run(contextFor(root))
      const aviso = findings.find(finding => finding.file === 'docs/decisions/adr/ADR-0001-a.md')

      assert.ok(aviso, 'ADR revisado em janeiro deveria vencer em agosto')
      assert.equal(aviso.ruleId, 'living-docs/staleness')
      assert.equal(aviso.severity, 'warning')
      assert.match(aviso.message, /7 meses/)
      assert.match(aviso.message, /stale-after-months/)
      assert.match(aviso.fix, /bump em massa/i)
      assert.equal(
        findings.some(finding => finding.severity === 'error'),
        false,
      )
    },
  )
})

test('ADR-0007: item congelado não vence — avisar sobre ele ensinaria o bump em massa', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('accepted', '2020-01-01'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.deepEqual(staleDocs(contextFor(root)), [])
    },
  )
})

test('RN-0018: documento de `documents:` vence; sem frontmatter, não tem o que vencer', () => {
  withTempRepo(
    {
      'docs/requirements/rules.md': RULES_ATIVA,
      'CONTRIBUTING.md':
        '---\ntitle: Como se contribui\nowner: "@time"\ntrigger: quando muda o processo\nlast-reviewed: 2025-01-01\n---\n\n# Como se contribui\n',
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
    },
    root => {
      const stale = staleDocs(contextFor(root))

      assert.deepEqual(
        stale.map(item => item.file),
        ['CONTRIBUTING.md'],
      )
      assert.equal(stale[0]?.skill, 'working-agreements-keeper')
    },
  )
})

test('RN-0018: `last-reviewed` fora do formato ISO não vence — living-docs/frontmatter já cobra o formato', () => {
  withTempRepo(
    {
      'docs/requirements/rules.md': RULES_ATIVA,
      // Data velha o bastante para vencer se fosse parseada — mas não é ISO.
      'CONTRIBUTING.md':
        '---\ntitle: Como se contribui\nowner: "@time"\ntrigger: quando muda o processo\nlast-reviewed: 1 de janeiro de 2020\n---\n\n# Como se contribui\n',
    },
    root => {
      const stale = staleDocs(contextFor(root))

      assert.deepEqual(
        stale.map(item => item.file),
        [],
      )
    },
  )
})

test('RN-0019: dívida `open` sem `pay-when` é erro, com o problema nomeado', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      const semGatilho = debtsWithoutTrigger(contextFor(root))

      assert.deepEqual(
        semGatilho.map(item => [item.id, item.problem]),
        [['TDR-0001', 'ausente']],
      )

      const findings = livingDocsStaleness.run(contextFor(root))
      const erro = findings.find(finding => finding.severity === 'error')

      assert.ok(erro)
      assert.equal(erro.file, 'docs/decisions/debt/TDR-0001-x.md')
      assert.match(erro.message, /TDR-0001/)
      assert.match(erro.fix, /pay-when/)
    },
  )
})

test('RN-0019: `pay-when` incompleto e padrão que não compila são erros distintos', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', ['pay-when:', '  paths: ["docs/**"]']),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.equal(debtsWithoutTrigger(contextFor(root))[0]?.problem, 'incompleto')
    },
  )

  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', ['pay-when:', "  pattern: '([('", '  paths: ["docs/**"]']),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.equal(debtsWithoutTrigger(contextFor(root))[0]?.problem, 'padrão inválido')
    },
  )
})

test('critério 7: dívida com gatilho cumprido reprova, e a evidência aparece', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', PAY_WHEN),
      'docs/requirements/rules.md': RULES_REVOGADA,
    },
    root => {
      const due = duePayments(contextFor(root))

      assert.equal(due.length, 1)
      assert.equal(due[0]?.id, 'TDR-0001')
      assert.match(due[0]?.evidence ?? '', /^docs\/requirements\/rules\.md:\d+$/)

      const findings = livingDocsStaleness.run(contextFor(root))
      const erro = findings.find(finding => finding.severity === 'error')

      assert.ok(erro)
      assert.equal(erro.file, 'docs/decisions/debt/TDR-0001-x.md')
      assert.match(erro.message, /gatilho de pagamento já aconteceu/)
      assert.match(erro.message, /docs\/requirements\/rules\.md/)
      assert.match(erro.fix, /paid|accepted-permanently/)
    },
  )
})

test('critério 7: sem a condição no repositório, a dívida `open` passa', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', PAY_WHEN),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.deepEqual(duePayments(contextFor(root)), [])
      assert.deepEqual(debtsWithoutTrigger(contextFor(root)), [])
    },
  )
})

test('critério 7: dívida paga ou aceita permanentemente sai da conta', () => {
  for (const status of ['paid', 'accepted-permanently']) {
    withTempRepo(
      {
        'docs/decisions/debt/TDR-0001-x.md': debt(status, PAY_WHEN),
        'docs/requirements/rules.md': RULES_REVOGADA,
      },
      root => {
        assert.deepEqual(duePayments(contextFor(root)), [], `status ${status} não deveria vencer`)
        assert.deepEqual(debtsWithoutTrigger(contextFor(root)), [])
      },
    )
  }
})

test('ADR-0007: o próprio arquivo da dívida não conta como ocorrência do gatilho', () => {
  withTempRepo(
    {
      // O corpo da dívida contém, literalmente, o texto que o padrão procura.
      'docs/decisions/debt/TDR-0001-x.md': `${debt('open', [
        'pay-when:',
        "  pattern: 'status: revoked'",
        '  paths: ["docs/**"]',
      ])}\n\nO gatilho é qualquer seção que vire \`status: revoked\`.\n`,
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.deepEqual(duePayments(contextFor(root)), [], 'citar o gatilho não é cumpri-lo')
    },
  )
})

test('payWhenOf distingue ausente, incompleto e válido', () => {
  assert.equal(payWhenOf({}), 'ausente')
  assert.equal(payWhenOf({ 'pay-when': 'quando der tempo' }), 'incompleto')
  assert.equal(payWhenOf({ 'pay-when': { pattern: 'x' } }), 'incompleto')
  assert.equal(payWhenOf({ 'pay-when': { pattern: 'x', paths: [] } }), 'incompleto')
  assert.deepEqual(payWhenOf({ 'pay-when': { pattern: 'x', paths: ['src/**'] } }), {
    pattern: 'x',
    paths: ['src/**'],
  })
})

test('living-docs/staleness é o único check que avisa: nada aqui reprova por documento vencido', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('draft', '2019-01-01'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      const findings = livingDocsStaleness.run(contextFor(root))

      assert.ok(findings.length > 0)
      assert.ok(findings.every(finding => finding.severity === 'warning'))
    },
  )
})
