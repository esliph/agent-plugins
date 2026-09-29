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

/** Só os achados de living-docs/citation-coverage: o repositório de teste é mínimo de propósito. */
function ci3(root: string): Finding[] {
  return runValidate(root).findings.filter(finding => finding.ruleId === 'living-docs/citation-coverage')
}

const BASE = { [OWNERSHIP_FILE]: CONFIG, [RETIRED_IDS_PATH]: '' }

test('living-docs/citation-coverage: par supersedes/superseded-by aberto falha nomeando os dois lados', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft'),
      'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002', 'draft', ['supersedes: ADR-0001']),
    },
    root => {
      const findings = ci3(root)
      const aberto = findings.find(f => /Open pair/.test(f.message))

      assert.ok(aberto, JSON.stringify(findings, null, 2))
      assert.match(aberto.message, /ADR-0002/)
      assert.match(aberto.message, /ADR-0001/)
      assert.equal(aberto.file, 'docs/decisions/adr/ADR-0001-a.md')
    },
  )
})

test('living-docs/citation-coverage: par fechado nos dois lados passa', () => {
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

test('living-docs/citation-coverage: supersedes apontando ID inexistente falha', () => {
  withTempRepo({ ...BASE, 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['supersedes: ADR-0009']) }, root => {
    assert.ok(ci3(root).some(f => /ADR-0009.*does not exist/.test(f.message)))
  })
})

test('living-docs/citation-coverage: DA resolved sem resolved-by falha', () => {
  withTempRepo({ ...BASE, 'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | — | 2026-08-24 |') }, root => {
    const finding = ci3(root).find(f => /without saying what resolved it/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /DA-0001/)
  })
})

test('living-docs/citation-coverage: DA resolved cujo ADR não a cita de volta falha, e a finding aponta o ADR', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/open-decisions.md': decisions('| DA-0001 | X | resolved | ADR-0001 | 2026-08-24 |'),
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'draft', ['relates-to: []']),
    },
    root => {
      const finding = ci3(root).find(f => /does not cite it in/.test(f.message))

      assert.ok(finding)
      assert.equal(finding.file, 'docs/decisions/adr/ADR-0001-a.md')
    },
  )
})

test('living-docs/citation-coverage: DA resolved com o ADR citando de volta passa', () => {
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

test('living-docs/citation-coverage: ADR accepted sem relates-to falha', () => {
  withTempRepo({ ...BASE, 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'accepted', ['relates-to: []']) }, root => {
    const finding = ci3(root).find(f => /accepted.*without/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /ADR-0001/)
  })
})

test('living-docs/citation-coverage: RN active sem citação em cited-by falha nomeando os globs', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'active')) }, root => {
    const finding = ci3(root).find(f => /is not cited/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /test\/\*\*/)
  })
})

test('living-docs/citation-coverage: RN active citada por um teste passa', () => {
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

test('living-docs/citation-coverage: RN draft não é cobrada por citação — a cobrança começa em active', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'draft')) }, root => {
    assert.deepEqual(ci3(root), [])
  })
})

test('living-docs/citation-coverage: RN active em artefato sem cited-by não é cobrada', () => {
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

test('living-docs/citation-coverage: citação dentro do próprio arquivo do artefato não conta como cobertura', () => {
  withTempRepo(
    {
      ...BASE,
      // O artefato mora sob test/**, então ele mesmo casa com o glob de cited-by.
      [OWNERSHIP_FILE]: CONFIG.replace('docs/requirements/rules.md', 'test/rules.md'),
      'test/rules.md': rules(rn('RN-0001', 'active'), '', 'A própria RN-0001 se cita aqui.'),
    },
    root => {
      assert.ok(ci3(root).some(f => /is not cited/.test(f.message)))
    },
  )
})

test('living-docs/citation-coverage: RN-014 e RN-0014 são o mesmo ID para efeito de cobertura', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/requirements/rules.md': rules(rn('RN-0014', 'active')),
      'test/regra.test.ts': "test('RN-014: repadding não cria outro ID', () => {});\n",
    },
    root => {
      assert.deepEqual(
        ci3(root).filter(f => /is not cited/.test(f.message)),
        [],
      )
    },
  )
})

test('living-docs/citation-coverage: RN revoked sem revoked-by falha', () => {
  withTempRepo({ ...BASE, 'docs/requirements/rules.md': rules(rn('RN-0001', 'revoked')) }, root => {
    const finding = ci3(root).find(f => /revoked-by/.test(f.message))

    assert.ok(finding)
    assert.match(finding.message, /RN-0001/)
  })
})

test('living-docs/citation-coverage: revogação com par fechado nos dois lados passa', () => {
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

test('living-docs/citation-coverage: toda finding é error, nunca warning', () => {
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
        assert.equal(finding.severity, 'error', `living-docs/citation-coverage não avisa, falha: ${finding.message}`)
      }
    },
  )
})

const CONFIG_WITHOUT_FIELD_MAP = CONFIG.replace('      field-map:\n        resolved-by: "Resolvida por"\n', '')

test('RN-0039: a resolved decision in a table without the canonical column points to field-map', () => {
  const tree = {
    [OWNERSHIP_FILE]: CONFIG_WITHOUT_FIELD_MAP,
    'docs/open-decisions.md': decisions('| DA-0001 | Gap | resolved | ADR-0001 | 2026-08-24 |'),
    'docs/decisions/adr/ADR-0001-x.md': adr('ADR-0001', 'accepted', ['relates-to: [DA-0001]']),
  }

  withTempRepo(tree, root => {
    const found = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === 'docs/open-decisions.md')

    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.match(found[0]?.fix ?? '', /field-map/)
    assert.match(found[0]?.fix ?? '', /resolved-by/)
  })
})

test('RN-0039: an existing but empty column is an empty value, with no field-map hint', () => {
  const tree = {
    [OWNERSHIP_FILE]: CONFIG,
    'docs/open-decisions.md': decisions('| DA-0001 | Gap | resolved | — | 2026-08-24 |'),
  }

  withTempRepo(tree, root => {
    const found = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === 'docs/open-decisions.md')

    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.doesNotMatch(found[0]?.fix ?? '', /field-map/)
  })
})
