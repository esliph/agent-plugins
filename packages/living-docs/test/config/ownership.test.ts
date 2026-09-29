import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OwnershipError, documentWithRole, fieldOf, hasField, findArtifactRule, findDocumentRule, loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { checkoutRoot } from '../helpers/checkout.ts'
import { configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const HEAD = 'version: 2\nplugins: [living-docs]\n'

const ADR = `
  - path: docs/decisions/adr/
    owner: '@team'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]
`

const DA = `
  - path: docs/open-decisions.md
    owner: '@product'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map: { resolved-by: 'Resolved by' }
`

function yaml(owned: string, top = ''): string {
  return `${HEAD}${top}owned:${owned}`
}

test('ADR-0029: an entry with living-docs.id-prefix is an artifact, with the block fields and the core ones', () => {
  const config = configFrom(yaml(ADR + DA))
  const adr = config.artifacts.find(rule => rule.idPrefix === 'ADR')
  const da = config.artifacts.find(rule => rule.idPrefix === 'DA')

  assert.equal(adr?.path, 'docs/decisions/adr/')
  assert.equal(adr?.owner, '@team')
  assert.equal(adr?.skill, 'decision-recorder')
  assert.equal(adr?.appendOnly, true)
  assert.deepEqual(adr?.mutableFields, ['status', 'superseded-by', 'last-reviewed'])
  assert.deepEqual(adr?.states, ['draft', 'accepted', 'superseded'])
  assert.equal(adr?.collection, 'per-file')
  assert.equal(adr?.audience, 'internal')
  assert.equal(da?.collection, 'table')
  assert.deepEqual(da?.fieldMap, { 'resolved-by': 'resolved by' })
  assert.equal(da?.core.format.key, 'ID')
})

test('ADR-0029: an entry with a living-docs block and no id-prefix is a document; with no block, it is not living-docs', () => {
  const config = configFrom(
    yaml(`${ADR}
  - path: CLAUDE.md
    owner: '@team'
    skill: working-agreements-keeper
    living-docs: { role: agent-contract }
  - path: README.md
    owner: '@team'
    living-docs: { audience: external }
  - path: src/
    owner: '@team'
`),
  )

  assert.deepEqual(
    config.documents.map(document => [document.path, document.skill, document.role, document.audience]),
    [
      ['CLAUDE.md', 'working-agreements-keeper', 'agent-contract', 'internal'],
      ['README.md', null, null, 'external'],
    ],
  )
  assert.equal(findDocumentRule(config, 'src/a.ts'), null)
  assert.equal(findArtifactRule(config, 'src/a.ts'), null)
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md')
})

test('ADR-0028: the top-level block carries stale-after-months, id-format and last-reviewed-bump-limit; when absent, the defaults apply', () => {
  const declared = configFrom(
    yaml(ADR, "living-docs:\n  stale-after-months: 3\n  id-format: { separator: '_', padding: 3 }\n  last-reviewed-bump-limit: 5\n"),
  )
  const defaults = configFrom(yaml(ADR))

  assert.equal(declared.staleAfterMonths, 3)
  assert.deepEqual(declared.idFormat, { separator: '_', padding: 3 })
  assert.equal(declared.lastReviewedBumpLimit, 5)
  assert.equal(defaults.staleAfterMonths, 6)
  assert.deepEqual(defaults.idFormat, DEFAULT_ID_FORMAT)
  assert.equal(defaults.lastReviewedBumpLimit, 3)
})

test('an unknown key in the top-level block is an error', () => {
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  stale-after: 3\n')), /\.ownership\.yml\.living-docs.*unknown key "stale-after"/)
})

test('an unknown key in the entry block is an error that names the entry', () => {
  const extra = ADR.replace('append-only: true', 'append-only: true\n      apend-only: true')

  assert.throws(() => configFrom(yaml(extra)), /entry "docs\/decisions\/adr\/".*unknown key "apend-only"/)
})

test('an artifact key in a document is an error, and the message says why', () => {
  assert.throws(
    () => configFrom(yaml(`${ADR}\n  - path: CLAUDE.md\n    owner: '@team'\n    living-docs: { append-only: true }\n`)),
    /unknown key "append-only".*only apply with `id-prefix`/,
  )
})

test('an id-prefix out of shape, duplicated, or an artifact without a skill are errors', () => {
  assert.throws(() => configFrom(yaml(ADR.replace('id-prefix: ADR', 'id-prefix: adr'))), /id-prefix "adr".*2 to 4 uppercase letters/)
  assert.throws(() => configFrom(yaml(ADR + ADR.replace('docs/decisions/adr/', 'docs/adr2/'))), /id-prefix "ADR" declared twice/)
  assert.throws(() => configFrom(yaml(ADR.replace('    skill: decision-recorder\n', ''))), /an artifact needs a `skill`/)
})

test('a role declared in two documents is an error, and an unknown role too', () => {
  const doc = (path: string, role: string) => `\n  - path: ${path}\n    owner: '@team'\n    living-docs: { role: ${role} }\n`

  assert.throws(() => configFrom(yaml(ADR + doc('A.md', 'agent-contract') + doc('B.md', 'agent-contract'))), /role "agent-contract" declared in two documents/)
  assert.throws(() => configFrom(yaml(ADR + doc('A.md', 'manual'))), /unknown role "manual"/)
})

test('id-format and last-reviewed-bump-limit out of range are errors', () => {
  assert.throws(() => configFrom(yaml(ADR, "living-docs:\n  id-format: { separator: '/' }\n")), /separator "\/" is not accepted/)
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  id-format: { padding: 9 }\n')), /padding "9" must be an integer between 2 and 6/)
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  last-reviewed-bump-limit: 1\n')), /last-reviewed-bump-limit "1".*greater than or equal to 2/)
})

test('with no artifact, the error teaches how to declare the plugin and the block', () => {
  assert.throws(() => configFrom("version: 2\nowned:\n  - path: a.md\n    owner: '@team'\n"), /no `owned` entry carries `living-docs\.id-prefix`.*plugins: \[living-docs\]/)
})

test('without an ownership file, an OwnershipError that points at init', () => {
  withTempRepo({}, root => {
    assert.throws(() => loadLivingDocsConfig(root), (err: unknown) => err instanceof OwnershipError && /living-docs init/.test(err.message))
  })
})

test('ADR-0029: a v1 file is not read — the core error surfaces as is', () => {
  withTempRepo({ '.ownership.yml': 'version: 1\nartifacts: []\n' }, root => {
    assert.throws(() => loadLivingDocsConfig(root), (err: unknown) => err instanceof OwnershipError && /schema v1/.test(err.message))
  })
})

test('fieldOf translates the canonical field through the field-map and treats empty as absent', () => {
  const config = configFrom(yaml(DA))
  const rule = config.artifacts[0]!
  const item = { key: 'DA-0001', state: 'resolved', line: 3, fields: { 'resolved by': 'ADR-0001', gap: '—' } }

  assert.equal(fieldOf(rule, item, 'resolved-by'), 'ADR-0001')
  assert.equal(fieldOf(rule, item, 'gap'), null)
})

test('this repository: the root .ownership.yml declares states for every family, and the document of each role', () => {
  const config = loadLivingDocsConfig(checkoutRoot())

  assert.equal(config.rootFile, '.ownership.yml')
  assert.deepEqual(config.artifacts.map(rule => rule.idPrefix).sort(), ['ADR', 'DA', 'REL', 'RF', 'RN', 'RNF', 'TDR'])
  for (const rule of config.artifacts) {
    assert.ok(rule.states !== null && rule.states.length > 0, `${rule.idPrefix} must declare states`)
  }
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md')
  assert.equal(documentWithRole(config, 'definition-of-done')?.path, 'docs/definition-of-done.md')
})

test('findArtifactRule and findDocumentRule match a file by equality and a directory by prefix', () => {
  const config = configFrom(
    yaml(`${ADR}${DA}
  - path: docs/charter/
    owner: '@team'
    living-docs: {}
  - path: CONTRIBUTING.md
    owner: '@team'
    living-docs: {}
`),
  )

  assert.equal(findArtifactRule(config, 'docs/decisions/adr/ADR-0001-x.md')?.idPrefix, 'ADR')
  assert.equal(findArtifactRule(config, './docs/open-decisions.md')?.idPrefix, 'DA')
  assert.equal(findArtifactRule(config, 'docs/open-decisions.md.bak'), null)
  assert.equal(findDocumentRule(config, 'docs/charter/vision.md')?.path, 'docs/charter/')
  assert.equal(findDocumentRule(config, 'CONTRIBUTING.md')?.path, 'CONTRIBUTING.md')
  assert.equal(findDocumentRule(config, 'CONTRIBUTING.md.bak'), null)
})

test('ADR-0017: audience external is read on the artifact and on the document; outside the vocabulary is an error that names the valid ones', () => {
  const config = configFrom(
    yaml(`${ADR.replace('append-only: true', 'append-only: true\n      audience: external')}
  - path: README.md
    owner: '@team'
    living-docs: { audience: external }
`),
  )

  assert.equal(config.artifacts[0]?.audience, 'external')
  assert.equal(config.documents[0]?.audience, 'external')
  assert.throws(() => configFrom(yaml(ADR.replace('append-only: true', 'audience: public'))), /unknown audience "public".*internal, external/)
})

test('field-map normalizes both ends, the canonical name applies without a map, and an empty value is an error', () => {
  const mapped = configFrom(yaml(ADR.replace('append-only: true', "field-map: { 'Resolved-By': ' Resolved By: ' }")))

  assert.deepEqual(mapped.artifacts[0]?.fieldMap, { 'resolved-by': 'resolved by' })

  const plain = configFrom(yaml(ADR))
  const item = { key: 'ADR-0001', state: 'draft', line: 1, fields: { 'resolved-by': 'DA-0001' } }

  assert.equal(fieldOf(plain.artifacts[0]!, item, 'resolved-by'), 'DA-0001')
  assert.throws(() => configFrom(yaml(ADR.replace('append-only: true', "field-map: { resolved-by: '' }"))), /field-map\.resolved-by must be a non-empty string/)
})

test('RN-0039: hasField tells a missing column from an empty one, through field-map', () => {
  const rule = configFrom(yaml(DA)).artifacts[0]!
  const item = { key: 'DA-0001', state: 'resolved', line: 1, fields: { 'resolved by': '' } }

  assert.equal(hasField(rule, item, 'resolved-by'), true)
  assert.equal(hasField(rule, item, 'blocks'), false)
})
