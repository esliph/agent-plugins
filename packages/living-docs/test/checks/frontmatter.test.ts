import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsFrontmatter } from '../../src/checks/frontmatter.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { Finding } from '../../src/core/types.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
`

function adr(fields: Record<string, string>, body = '\n## Contexto\n'): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`)

  return ['---', ...lines, '---', body].join('\n')
}

const GOOD_ADR = adr({
  id: 'ADR-0001',
  title: 'Fila de eventos',
  status: 'accepted',
  owner: '"@team"',
  trigger: 'Nunca. Imutável após aceito; uma decisão nova o supersede.',
  'last-reviewed': '2026-08-21',
})

const GOOD_DA = [
  '---',
  'title: Open Decisions',
  'owner: "@product"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '| ID | Lacuna | Status |',
  '| --- | --- | --- |',
  '| DA-0001 | Reembolso parcial | open |',
].join('\n')

function run(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, ...files }, root => {
    const config = loadLivingDocsConfig(root)

    findings = livingDocsFrontmatter.run({ root, config, docs: collectArtifacts(root, config), documents: [], today: '2026-08-27' })
  })

  return findings
}

test('artefatos bem formados não produzem finding', () => {
  assert.deepEqual(run({ 'docs/decisions/adr/ADR-0001-fila.md': GOOD_ADR, 'docs/open-decisions.md': GOOD_DA }), [])
})

test('frontmatter ausente falha na linha 1', () => {
  const findings = run({ 'docs/decisions/adr/ADR-0001-x.md': '# Sem frontmatter\n' })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/frontmatter')
  assert.equal(findings[0]?.line, 1)
  assert.equal(findings[0]?.severity, 'error')
  assert.match(findings[0]?.message ?? '', /frontmatter/i)
})

test('YAML inválido no bloco falha sem derrubar o check', () => {
  const findings = run({ 'docs/decisions/adr/ADR-0001-x.md': '---\nid: ADR-0001\ntitle: "unterminated\n---\n' })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /YAML|inválid/i)
})

test('cada campo obrigatório ausente vira uma finding', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({ id: 'ADR-0001', status: 'draft' }),
  })
  const faltando = findings.filter(f => /obrigatório/i.test(f.message)).map(f => f.message)

  for (const field of ['title', 'owner', 'trigger', 'last-reviewed']) {
    assert.ok(
      faltando.some(m => m.includes(field)),
      `deveria acusar ${field}`,
    )
  }
})

test('RN-0002: trigger com cadência falha nomeando o campo e o termo — critério de aceite 3', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'revisar trimestralmente',
      'last-reviewed': '2026-08-21',
    }),
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /trigger/)
  assert.match(findings[0]?.message ?? '', /trimestral/i)
  assert.equal(findings[0]?.line, 6)
})

test('last-reviewed fora do ISO falha', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'Nunca.',
      'last-reviewed': '21/08/2026',
    }),
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /last-reviewed/)
})

test('id que não bate com o prefixo do artefato falha', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'TDR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'Nunca.',
      'last-reviewed': '2026-08-21',
    }),
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR/)
})

test('coleção em tabela: container não exige id, mas cada item exige status', () => {
  const bad = GOOD_DA.replace('| DA-0001 | Reembolso parcial | open |', '| DA-0001 | Reembolso parcial |  |')
  const findings = run({ 'docs/open-decisions.md': bad })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.line, 10)
  assert.match(findings[0]?.message ?? '', /DA-0001.*status/)
})

test('prefixo sem máquina de estados declarada falha pedindo `states`', () => {
  const config = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/x/
    owner: "@team"
    skill: s
    living-docs: { id-prefix: XX }
`
  let findings: Finding[] = []

  withTempRepo(
    {
      [OWNERSHIP_FILE]: config,
      'docs/x/XX-0001-a.md': adr({
        id: 'XX-0001',
        title: 'x',
        status: 'draft',
        owner: '"@team"',
        trigger: 'Nunca.',
        'last-reviewed': '2026-08-21',
      }),
    },
    root => {
      const parsed = loadLivingDocsConfig(root)

      findings = livingDocsFrontmatter.run({ root, config: parsed, docs: collectArtifacts(root, parsed), documents: [], today: '2026-08-27' })
    },
  )
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.fix ?? '', /states/)
})
