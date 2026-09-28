import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runValidate } from '../../src/cli/validate.ts'
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
    living-docs: { id-prefix: ADR }
  - path: docs/open-decisions.md
    owner: "@team"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map:
        resolved-by: "Resolvida por"
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RN
      cited-by: ["test/**"]
`

/** A mesma configuração, mas com RN sem `cited-by` — instalação por fases. */
const CONFIG_SEM_CITED_BY = CONFIG.replace('      cited-by: ["test/**"]\n', '')

function adr(id: string, status: string, extra: readonly string[] = []): string {
  return [
    '---',
    `id: ${id}`,
    `title: Decisão ${id}`,
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Nunca. Imutável após aceito.',
    'last-reviewed: 2026-08-24',
    ...extra,
    '---',
    '',
    'corpo',
    '',
  ].join('\n')
}

function decisions(...rows: readonly string[]): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@team"',
    'trigger: Toda vez que alguém trombou numa lacuna.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    '| ID | Lacuna | Status | Resolvida por | Aberta em |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}

function rules(...sections: readonly string[]): string {
  return [
    '---',
    'title: Regras de negócio',
    'owner: "@team"',
    'trigger: A toda regra nova ou alterada.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    ...sections,
    '',
  ].join('\n')
}

function rn(id: string, status: string, extra: readonly string[] = []): string {
  return [`## ${id} — Regra ${id}`, '', `- **status:** ${status}`, ...extra, '', 'Enunciado.', ''].join('\n')
}

/** Só os achados de CI-3: o repositório de teste é mínimo de propósito. */
function ci3(root: string): Finding[] {
  return runValidate(root).findings.filter(finding => finding.ruleId === 'CI-3')
}

const BASE = { [OWNERSHIP_FILE]: CONFIG, [RETIRED_IDS_PATH]: '' }

test('CI-3: par supersedes/superseded-by aberto falha nomeando os dois lados', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft'),
      'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002', 'draft', ['supersedes: ADR-0001']),
    },
    root => {
      const findings = ci3(root)
      const aberto = findings.find(f => /Par aberto/.test(f.message))

      assert.ok(aberto, JSON.stringify(findings, null, 2))
      assert.match(aberto.message, /ADR-0002/)
      assert.match(aberto.message, /ADR-0001/)
      assert.equal(aberto.file, 'docs/decisions/adr/ADR-0001-a.md')
    },
  )
})

test('CI-3: par fechado nos dois lados passa', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['superseded-by: ADR-0002']),
      'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002', 'draft', ['supersedes: ADR-0001']),
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('CI-3: supersedes apontando ID inexistente falha', () => {
  withTempRepo({ ...BASE, 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['supersedes: ADR-0009']) }, root => {
    assert.ok(ci3(root).some(f => /ADR-0009.*não existe/.test(f.message)))
  })
})

test('CI-3: DA resolved sem resolved-by falha', () => {
  withTempRepo({ ...BASE, 'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | — | 2026-08-24 |') }, root => {
    const finding = ci3(root).find(f => /sem dizer o que a resolveu/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /DA-0001/)
  })
})

test('CI-3: DA resolved cujo ADR não a cita de volta falha, e a finding aponta o ADR', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | ADR-0001 | 2026-08-24 |'),
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['relates-to: []']),
    },
    root => {
      const finding = ci3(root).find(f => /não a cita em/.test(f.message))

      assert.ok(finding)
      assert.equal(finding.file, 'docs/decisions/adr/ADR-0001-a.md')
    },
  )
})

test('CI-3: DA resolved com o ADR citando de volta passa', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | ADR-0001 | 2026-08-24 |'),
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['relates-to: [DA-0001]']),
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('CI-3: ADR accepted sem relates-to falha', () => {
  withTempRepo({ ...BASE, 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'accepted', ['relates-to: []']) }, root => {
    const finding = ci3(root).find(f => /accepted.*sem/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /ADR-0001/)
  })
})

test('CI-3: RN active sem citação em cited-by falha nomeando os globs', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'active')) }, root => {
    const finding = ci3(root).find(f => /não é citada/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /test\/\*\*/)
  })
})

test('CI-3: RN active citada por um teste passa', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/requirements/rules.md': rules(rn('RN-0001', 'active')),
      'test/regra.test.ts': "test('RN-0001: a regra vale', () => {});\n",
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('CI-3: RN draft não é cobrada por citação — a cobrança começa em active', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'draft')) }, root => {
    assert.deepEqual(ci3(root), [])
  })
})

test('CI-3: RN active em artefato sem cited-by não é cobrada', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: CONFIG_SEM_CITED_BY,
      [RETIRED_IDS_PATH]: '',
      'docs/requirements/rules.md': rules(rn('RN-0001', 'active')),
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('CI-3: citação dentro do próprio arquivo do artefato não conta como cobertura', () => {
  withTempRepo(
    {
      ...BASE,
      // O artefato mora sob test/**, então ele mesmo casa com o glob de cited-by.
      [OWNERSHIP_FILE]: CONFIG.replace('docs/requirements/rules.md', 'test/rules.md'),
      'test/rules.md': rules(rn('RN-0001', 'active'), '', 'A própria RN-0001 se cita aqui.'),
    },
    root => {
      assert.ok(ci3(root).some(f => /não é citada/.test(f.message)))
    },
  )
})

test('CI-3: RN-014 e RN-0014 são o mesmo ID para efeito de cobertura', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/requirements/rules.md': rules(rn('RN-0014', 'active')),
      'test/regra.test.ts': "test('RN-014: repadding não cria outro ID', () => {});\n",
    },
    root => {
      assert.deepEqual(
        ci3(root).filter(f => /não é citada/.test(f.message)),
        [],
      )
    },
  )
})

test('CI-3: RN revoked sem revoked-by falha', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'revoked')) }, root => {
    const finding = ci3(root).find(f => /revoked-by/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /RN-0001/)
  })
})

test('CI-3: revogação com par fechado nos dois lados passa', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/requirements/rules.md': rules(rn('RN-0001', 'revoked', ['- **revoked-by:** RN-0002']), rn('RN-0002', 'draft', ['- **revokes:** RN-0001'])),
    },
    root => {
      assert.deepEqual(ci3(root), [])
    },
  )
})

test('CI-3: toda finding é error, nunca warning', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | — | 2026-08-24 |'),
      'docs/requirements/rules.md': rules(rn('RN-0001', 'active'), rn('RN-0002', 'revoked')),
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'accepted', ['relates-to: []']),
    },
    root => {
      const findings = ci3(root)

      assert.ok(findings.length >= 4, JSON.stringify(findings, null, 2))
      for (const finding of findings) {
        assert.equal(finding.severity, 'error', `CI-3 não avisa, falha: ${finding.message}`)
      }
    },
  )
})
