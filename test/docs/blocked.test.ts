import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blockedClaims, claimsFor } from '../../src/docs/blocked.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { loadOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
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
  const config = loadOwnership(root)

  return blockedClaims(collectArtifacts(root, config))
}

test('RN-0026: só decisão aberta com caminho declarado reivindica', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, 'docs/open-decisions.md': TABELA }, root => {
    const found = claims(root)

    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.equal(found[0]?.id, 'DA-0001')
    assert.deepEqual(found[0]?.paths, ['src/cobranca/**', 'src/api/checkout/**'])
    assert.equal(found[0]?.skill, 'decision-recorder')
    assert.match(found[0]?.gap ?? '', /centavos/)
  })
})

test('RN-0026: claimsFor devolve o que cada reivindicação pegou', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, 'docs/open-decisions.md': TABELA }, root => {
    const hits = claimsFor(claims(root), ['src/cobranca/taxa.ts', 'README.md'])

    assert.equal(hits.length, 1)
    assert.deepEqual(hits[0]?.matched, ['src/cobranca/taxa.ts'])

    assert.deepEqual(claimsFor(claims(root), ['README.md']), [])
  })
})
