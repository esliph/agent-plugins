import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsIdIntegrity } from '../../src/checks/id-integrity.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { RETIRED_IDS_PATH } from '../../src/ids/citations.ts'
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

function adr(id: string, body = ''): string {
  return ['---', `id: ${id}`, 'title: Decisão', 'status: draft', 'owner: "@team"', 'trigger: Nunca.', 'last-reviewed: 2026-08-21', '---', '', body].join('\n')
}

function openDecisions(rows: string[]): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@product"',
    'trigger: Toda vez que alguém trombou numa lacuna.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '| ID | Lacuna | Status | Resolvida por |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n')
}

function run(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, ...files }, root => {
    const config = loadLivingDocsConfig(root)

    findings = livingDocsIdIntegrity.run({ root, config, docs: collectArtifacts(root, config), documents: [], today: '2026-08-27' })
  })

  return findings
}

test('sequência íntegra e citações que resolvem não produzem finding', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Fecha DA-0001.'),
      'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002'),
      'docs/open-decisions.md': openDecisions(['| DA-0001 | Lacuna | resolved | ADR-0001 |']),
    }),
    [],
  )
})

test('ID duplicado falha nomeando os dois arquivos', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0001-b.md': adr('ADR-0001'),
    'docs/open-decisions.md': openDecisions([]),
  })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/id-integrity')
  assert.match(findings[0]?.message ?? '', /ADR-0001/)
  assert.match(findings[0]?.message ?? '', /ADR-0001-a\.md/)
})

test('ID presente em ids-retired.txt reaparecendo falha', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'ADR-0001\n',
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /reciclado|retirado/i)
})

test('RN-0003: ADR-001 e ADR-0001 são o mesmo ID lógico — duplicata, não dois artefatos', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-001-b.md': adr('ADR-001'),
    'docs/open-decisions.md': openDecisions([]),
  })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/id-integrity')
  assert.match(findings[0]?.message ?? '', /duplicado/)
  // A mensagem mostra o ID como a pessoa escreveu, não a forma canônica.
  assert.match(findings[0]?.message ?? '', /ID ADR-001 duplicado/)
  assert.match(findings[0]?.message ?? '', /ADR-0001-a\.md/)
})

test('RN-0003: repadding não recicla um ID retirado — ADR-0002 retirado barra ADR-002', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-002-b.md': adr('ADR-002'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'ADR-0002\n',
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ID ADR-002 está em/)
  assert.match(findings[0]?.message ?? '', /reciclado/i)
})

test('ID retirado sem padding canônico ainda barra a forma padded', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'ADR-002\n',
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ID ADR-0002 está em/)
})

test('buraco na sequência falha apontando o registro de retirados', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003'),
    'docs/open-decisions.md': openDecisions([]),
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0002/)
  assert.equal(findings[0]?.file, RETIRED_IDS_PATH)
})

test('buraco explicado por ids-retired.txt não falha', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
      'docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003'),
      'docs/open-decisions.md': openDecisions([]),
      [RETIRED_IDS_PATH]: 'ADR-0002\n',
    }),
    [],
  )
})

test('RN-0007: citação que não resolve falha na linha da citação', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Supersede ADR-0099.'),
    'docs/open-decisions.md': openDecisions([]),
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0099/)
  assert.equal(findings[0]?.file, 'docs/decisions/adr/ADR-0001-a.md')
})

test('RN-0007: citação para um ID retirado falha', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Ver DA-0001.'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'DA-0001\n',
  })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /DA-0001/)
  assert.match(findings[0]?.message ?? '', /retirado/i)
})

test('citação de prefixo não declarado é ignorada — instalação por fases', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Implementa RN-014 e RF-002.'),
      'docs/open-decisions.md': openDecisions([]),
    }),
    [],
  )
})

test('RN-0024: a mensagem de buraco de sequência sai na forma escrita do projeto', () => {
  const config = CONFIG.replace('owned:', 'living-docs:\n  id-format: { separator: "", padding: 3 }\nowned:')
  let findings: Finding[] = []

  withTempRepo(
    {
      [OWNERSHIP_FILE]: config,
      'docs/decisions/adr/ADR001-a.md': adr('ADR001'),
      'docs/decisions/adr/ADR003-c.md': adr('ADR003'),
      'docs/open-decisions.md': openDecisions([]),
    },
    root => {
      const parsed = loadLivingDocsConfig(root)

      findings = livingDocsIdIntegrity.run({
        root,
        config: parsed,
        docs: collectArtifacts(root, parsed),
        documents: [],
        today: '2026-08-27',
      })
    },
  )

  assert.equal(findings.length, 1, JSON.stringify(findings, null, 2))
  assert.match(findings[0]?.message ?? '', /ADR002/, 'o ID sugerido vem de writeId, na forma do projeto')
  assert.doesNotMatch(findings[0]?.message ?? '', /ADR-0002/, 'nenhum check monta ID por concatenação')
})
