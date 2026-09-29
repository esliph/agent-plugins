import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blockedClaims, claimsFor } from '../../src/docs/blocked.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map:
        resolved-by: "Resolvida por"
        blocks: "Bloqueia"
        gap: "Lacuna"
`

const TABELA = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Lacuna | Status | Resolvida por | Bloqueia | Aberta em |',
  '| --- | --- | --- | --- | --- | --- |',
  '| DA-0001 | Como arredondar centavos | open | — | `src/cobranca/**`, `src/api/checkout/**` | 2026-08-28 |',
  '| DA-0002 | Já resolvida | resolved | ADR-0001 | `src/legado/**` | 2026-08-20 |',
  '| DA-0003 | Sem caminho declarado | open | — | — | 2026-08-28 |',
  '',
].join('\n')

function claims(root: string) {
  const config = loadLivingDocsConfig(root)

  return blockedClaims(collectArtifacts(root, config))
}

test('RN-0026: só decisão aberta com caminho declarado reivindica', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/open-decisions.md': TABELA }, root => {
    const found = claims(root)

    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.equal(found[0]?.id, 'DA-0001')
    assert.deepEqual(found[0]?.paths, ['src/cobranca/**', 'src/api/checkout/**'])
    assert.equal(found[0]?.skill, 'decision-recorder')
    assert.match(found[0]?.gap ?? '', /centavos/)
  })
})

test('RN-0026: claimsFor devolve o que cada reivindicação pegou', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/open-decisions.md': TABELA }, root => {
    const hits = claimsFor(claims(root), ['src/cobranca/taxa.ts', 'README.md'])

    assert.equal(hits.length, 1)
    assert.deepEqual(hits[0]?.matched, ['src/cobranca/taxa.ts'])

    assert.deepEqual(claimsFor(claims(root), ['README.md']), [])
  })
})

test('RN-0038: a word in the Blocks column is a declared path, whatever the language', () => {
  const table = TABELA.replace('| DA-0003 | Sem caminho declarado | open | — | — |', '| DA-0003 | Sem caminho declarado | open | — | nenhum |')

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/open-decisions.md': table }, root => {
    const claim = claims(root).find(c => c.id === 'DA-0003')

    assert.deepEqual(claim?.paths, ['nenhum'])
  })
})
