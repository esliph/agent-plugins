import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runValidate } from '../../src/cli/validate.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
living-docs:
  id-format: { separator: "", padding: 3 }
owned:
  - path: docs/rules.md
    owner: "@time"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN, cited-by: ["test/**"] }
  - path: .ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
    living-docs: {}
`

function regras(ids: readonly string[]): string {
  return [
    '---',
    'title: Regras',
    'owner: "@time"',
    'trigger: Antes de implementar qualquer comportamento, e a toda regra nova ou alterada.',
    'last-reviewed: 2026-08-28',
    '---',
    '',
    '# Regras',
    '',
    ...ids.flatMap(id => [`## ${id} — Uma regra`, '', '- **status:** active', '']),
  ].join('\n')
}

function arvore(ids: readonly string[]): Record<string, string> {
  return {
    [OWNERSHIP_FILE]: CONFIG,
    'docs/rules.md': regras(ids),
    'test/regras.test.ts': ids.map(id => `// cobre ${id}`).join('\n') + '\n',
  }
}

test('critério 2: identidade, duplicata, sequência e citação funcionam na forma do projeto', () => {
  withTempRepo(arvore(['RN001', 'RN002', 'RN003']), root => {
    const result = runValidate(root)

    assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2))
  })
})

test('critério 2: duplicata é detectada mesmo escrita com padding diferente', () => {
  withTempRepo(arvore(['RN001', 'RN01']), root => {
    const result = runValidate(root)
    const duplicata = result.findings.find(f => f.ruleId === 'CI-2' && /duplicad/.test(f.message))

    assert.ok(duplicata, JSON.stringify(result.findings, null, 2))
  })
})

test('critério 2: o buraco de sequência é relatado na forma escrita do projeto', () => {
  withTempRepo(arvore(['RN001', 'RN003']), root => {
    const result = runValidate(root)
    const buraco = result.findings.find(f => f.ruleId === 'CI-2' && /buraco/.test(f.message))

    assert.ok(buraco, JSON.stringify(result.findings, null, 2))
    assert.match(buraco.message, /RN002/, 'o ID sugerido precisa vir na forma do projeto')
    assert.doesNotMatch(buraco.message, /RN-0002/, 'nenhum check monta ID por concatenação')
  })
})

test('critério 2: citação que não resolve continua reprovando na forma do projeto', () => {
  const arvoreComCitacao = arvore(['RN001'])

  arvoreComCitacao['docs/rules.md'] += '\nO enunciado cita RN042, que não existe.\n'

  withTempRepo(arvoreComCitacao, root => {
    const result = runValidate(root)
    const citacao = result.findings.find(f => f.ruleId === 'CI-2' && /RN042/.test(f.message))

    assert.ok(citacao, JSON.stringify(result.findings, null, 2))
  })
})

test('RN-0024: nenhum arquivo de check monta um ID por concatenação', () => {
  const suspeito = /\$\{[A-Za-z.]*[Pp]refix\}[-_.:]?\$\{/

  for (const file of ['ci1-structure.ts', 'ci2-ids.ts', 'ci3-traceability.ts']) {
    const source = readFileSync(join(toolkitRoot(), 'src/checks', file), 'utf8')

    assert.doesNotMatch(source, suspeito, `${file} monta ID à mão — use writeId (RN-0024)`)
  }
})
