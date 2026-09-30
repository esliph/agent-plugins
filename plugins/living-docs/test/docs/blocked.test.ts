import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blockedClaims, claimsFor } from '../../plugin/src/docs/blocked.ts'
import { collectArtifacts } from '../../plugin/src/docs/collect.ts'
import { loadLivingDocsConfig } from '../../plugin/src/config/ownership.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: "@team"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map:
        resolved-by: "Resolved by"
        blocks: "Blocks"
        gap: "Gap"
`

const TABLE = [
  '---',
  'title: Open Decisions',
  'owner: "@team"',
  'trigger: Every time someone bumped into a gap.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Gap | Status | Resolved by | Blocks | Opened on |',
  '| --- | --- | --- | --- | --- | --- |',
  '| DA-0001 | How to round cents | open | — | `src/billing/**`, `src/api/checkout/**` | 2026-08-28 |',
  '| DA-0002 | Already resolved | resolved | ADR-0001 | `src/legacy/**` | 2026-08-20 |',
  '| DA-0003 | No declared path | open | — | — | 2026-08-28 |',
  '',
].join('\n')

function claims(root: string) {
  const config = loadLivingDocsConfig(root)

  return blockedClaims(collectArtifacts(root, config))
}

test('RN-0026: only an open decision with a declared path claims', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/open-decisions.md': TABLE }, root => {
    const found = claims(root)

    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.equal(found[0]?.id, 'DA-0001')
    assert.deepEqual(found[0]?.paths, ['src/billing/**', 'src/api/checkout/**'])
    assert.equal(found[0]?.skill, 'decision-recorder')
    assert.match(found[0]?.gap ?? '', /cents/)
  })
})

test('RN-0026: claimsFor returns what each claim matched', () => {
  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/open-decisions.md': TABLE }, root => {
    const hits = claimsFor(claims(root), ['src/billing/fee.ts', 'README.md'])

    assert.equal(hits.length, 1)
    assert.deepEqual(hits[0]?.matched, ['src/billing/fee.ts'])

    assert.deepEqual(claimsFor(claims(root), ['README.md']), [])
  })
})

test('RN-0038: a word in the Blocks column is a declared path, whatever the language', () => {
  const table = TABLE.replace('| DA-0003 | No declared path | open | — | — |', '| DA-0003 | No declared path | open | — | nenhum |')

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/open-decisions.md': table }, root => {
    const claim = claims(root).find(c => c.id === 'DA-0003')

    assert.deepEqual(claim?.paths, ['nenhum'])
  })
})
