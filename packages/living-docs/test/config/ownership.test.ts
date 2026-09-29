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
    owner: '@time'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]
`

const DA = `
  - path: docs/open-decisions.md
    owner: '@produto'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map: { resolved-by: 'Resolvida por' }
`

function yaml(owned: string, top = ''): string {
  return `${HEAD}${top}owned:${owned}`
}

test('ADR-0029: entrada com living-docs.id-prefix é artefato, com os campos do bloco e os do núcleo', () => {
  const config = configFrom(yaml(ADR + DA))
  const adr = config.artifacts.find(rule => rule.idPrefix === 'ADR')
  const da = config.artifacts.find(rule => rule.idPrefix === 'DA')

  assert.equal(adr?.path, 'docs/decisions/adr/')
  assert.equal(adr?.owner, '@time')
  assert.equal(adr?.skill, 'decision-recorder')
  assert.equal(adr?.appendOnly, true)
  assert.deepEqual(adr?.mutableFields, ['status', 'superseded-by', 'last-reviewed'])
  assert.deepEqual(adr?.states, ['draft', 'accepted', 'superseded'])
  assert.equal(adr?.collection, 'per-file')
  assert.equal(adr?.audience, 'internal')
  assert.equal(da?.collection, 'table')
  assert.deepEqual(da?.fieldMap, { 'resolved-by': 'resolvida por' })
  assert.equal(da?.core.format.key, 'ID')
})

test('ADR-0029: entrada com bloco living-docs sem id-prefix é documento; sem bloco, não é do living-docs', () => {
  const config = configFrom(
    yaml(`${ADR}
  - path: CLAUDE.md
    owner: '@time'
    skill: working-agreements-keeper
    living-docs: { role: agent-contract }
  - path: README.md
    owner: '@time'
    living-docs: { audience: external }
  - path: src/
    owner: '@time'
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

test('ADR-0028: o bloco de topo carrega stale-after-months, id-format e last-reviewed-bump-limit; ausente, valem os padrões', () => {
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

test('chave desconhecida no bloco de topo é erro', () => {
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  stale-after: 3\n')), /\.ownership\.yml\.living-docs.*"stale-after" desconhecida/)
})

test('chave desconhecida no bloco da entrada é erro que nomeia a entrada', () => {
  const extra = ADR.replace('append-only: true', 'append-only: true\n      apend-only: true')

  assert.throws(() => configFrom(yaml(extra)), /entrada "docs\/decisions\/adr\/".*"apend-only" desconhecida/)
})

test('chave de artefato em documento é erro, e a mensagem diz por quê', () => {
  assert.throws(
    () => configFrom(yaml(`${ADR}\n  - path: CLAUDE.md\n    owner: '@time'\n    living-docs: { append-only: true }\n`)),
    /"append-only" desconhecida.*só valem com `id-prefix`/,
  )
})

test('id-prefix fora da forma, duplicado, ou artefato sem skill são erro', () => {
  assert.throws(() => configFrom(yaml(ADR.replace('id-prefix: ADR', 'id-prefix: adr'))), /id-prefix "adr".*2 a 4 letras maiúsculas/)
  assert.throws(() => configFrom(yaml(ADR + ADR.replace('docs/decisions/adr/', 'docs/adr2/'))), /id-prefix "ADR" declarado duas vezes/)
  assert.throws(() => configFrom(yaml(ADR.replace('    skill: decision-recorder\n', ''))), /artefato precisa de `skill`/)
})

test('papel declarado em dois documentos é erro, e papel desconhecido também', () => {
  const doc = (path: string, role: string) => `\n  - path: ${path}\n    owner: '@time'\n    living-docs: { role: ${role} }\n`

  assert.throws(() => configFrom(yaml(ADR + doc('A.md', 'agent-contract') + doc('B.md', 'agent-contract'))), /papel "agent-contract" declarado em dois documentos/)
  assert.throws(() => configFrom(yaml(ADR + doc('A.md', 'manual'))), /role "manual" desconhecido/)
})

test('id-format e last-reviewed-bump-limit fora da faixa são erro', () => {
  assert.throws(() => configFrom(yaml(ADR, "living-docs:\n  id-format: { separator: '/' }\n")), /separator "\/" não é aceito/)
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  id-format: { padding: 9 }\n')), /padding "9" precisa ser inteiro entre 2 e 6/)
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  last-reviewed-bump-limit: 1\n')), /last-reviewed-bump-limit "1".*maior ou igual a 2/)
})

test('sem nenhum artefato, o erro ensina a declarar o plugin e o bloco', () => {
  assert.throws(() => configFrom("version: 2\nowned:\n  - path: a.md\n    owner: '@time'\n"), /nenhuma entrada de `owned` traz `living-docs\.id-prefix`.*plugins: \[living-docs\]/)
})

test('sem arquivo de ownership, OwnershipError que aponta o init', () => {
  withTempRepo({}, root => {
    assert.throws(() => loadLivingDocsConfig(root), (err: unknown) => err instanceof OwnershipError && /living-docs init/.test(err.message))
  })
})

test('ADR-0029: arquivo v1 não é lido — o erro do núcleo sobe como está', () => {
  withTempRepo({ '.ownership.yml': 'version: 1\nartifacts: []\n' }, root => {
    assert.throws(() => loadLivingDocsConfig(root), (err: unknown) => err instanceof OwnershipError && /esquema v1/.test(err.message))
  })
})

test('fieldOf traduz o campo canônico pelo field-map e trata vazio como ausente', () => {
  const config = configFrom(yaml(DA))
  const rule = config.artifacts[0]!
  const item = { key: 'DA-0001', state: 'resolved', line: 3, fields: { 'resolvida por': 'ADR-0001', lacuna: '—' } }

  assert.equal(fieldOf(rule, item, 'resolved-by'), 'ADR-0001')
  assert.equal(fieldOf(rule, item, 'lacuna'), null)
})

test('este repositório: o .ownership.yml da raiz declara states de toda família, e o documento de cada papel', () => {
  const config = loadLivingDocsConfig(checkoutRoot())

  assert.equal(config.rootFile, '.ownership.yml')
  assert.deepEqual(config.artifacts.map(rule => rule.idPrefix).sort(), ['ADR', 'DA', 'REL', 'RF', 'RN', 'RNF', 'TDR'])
  for (const rule of config.artifacts) {
    assert.ok(rule.states !== null && rule.states.length > 0, `${rule.idPrefix} precisa declarar states`)
  }
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md')
  assert.equal(documentWithRole(config, 'definition-of-done')?.path, 'docs/definition-of-done.md')
})

test('findArtifactRule e findDocumentRule casam arquivo por igualdade e diretório por prefixo', () => {
  const config = configFrom(
    yaml(`${ADR}${DA}
  - path: docs/charter/
    owner: '@time'
    living-docs: {}
  - path: CONTRIBUTING.md
    owner: '@time'
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

test('ADR-0017: audience external é lido no artefato e no documento; fora do vocabulário é erro que nomeia os válidos', () => {
  const config = configFrom(
    yaml(`${ADR.replace('append-only: true', 'append-only: true\n      audience: external')}
  - path: README.md
    owner: '@time'
    living-docs: { audience: external }
`),
  )

  assert.equal(config.artifacts[0]?.audience, 'external')
  assert.equal(config.documents[0]?.audience, 'external')
  assert.throws(() => configFrom(yaml(ADR.replace('append-only: true', 'audience: publico'))), /audience "publico" desconhecido.*internal, external/)
})

test('field-map normaliza as duas pontas, vale o nome canônico sem mapa, e valor vazio é erro', () => {
  const mapped = configFrom(yaml(ADR.replace('append-only: true', "field-map: { 'Resolved-By': ' Resolvida Por: ' }")))

  assert.deepEqual(mapped.artifacts[0]?.fieldMap, { 'resolved-by': 'resolvida por' })

  const plain = configFrom(yaml(ADR))
  const item = { key: 'ADR-0001', state: 'draft', line: 1, fields: { 'resolved-by': 'DA-0001' } }

  assert.equal(fieldOf(plain.artifacts[0]!, item, 'resolved-by'), 'DA-0001')
  assert.throws(() => configFrom(yaml(ADR.replace('append-only: true', "field-map: { resolved-by: '' }"))), /field-map\.resolved-by precisa ser uma string não vazia/)
})

test('RN-0039: hasField tells a missing column from an empty one, through field-map', () => {
  const rule = configFrom(yaml(DA)).artifacts[0]!
  const item = { key: 'DA-0001', state: 'resolved', line: 1, fields: { 'resolvida por': '' } }

  assert.equal(hasField(rule, item, 'resolved-by'), true)
  assert.equal(hasField(rule, item, 'blocks'), false)
})
