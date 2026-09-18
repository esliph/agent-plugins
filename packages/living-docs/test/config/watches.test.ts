import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseOwnership } from '../../src/config/ownership.ts'
import { coversDoc, pendingDocs, watchesFor } from '../../src/config/watches.ts'

const CONFIG = parseOwnership(`
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "comportamento novo exige regra com ID antes do código"
  - code: "src/**/errors/**"
    doc: docs/contracts/errors.md
  - code: "src/domain/pedido/**"
    doc: docs/requirements/rules.md
    reason: "outro motivo, mesmo doc"
`)

const SEM_WATCHES = parseOwnership(`
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
`)

test('RN-0008: caminho vigiado nomeia o doc dono, com quem o mantém e por quê', () => {
  const matches = watchesFor(CONFIG, ['src/domain/reembolso.ts'])

  assert.equal(matches.length, 1)
  assert.equal(matches[0]?.doc, 'docs/requirements/rules.md')
  assert.equal(matches[0]?.skill, 'requirements-keeper')
  assert.equal(matches[0]?.owner, '@team')
  assert.match(String(matches[0]?.reason), /regra com ID antes do código/)
  assert.deepEqual(matches[0]?.matched, ['src/domain/reembolso.ts'])
})

test('RN-0008: caminho fora de watches não exige doc nenhum', () => {
  assert.deepEqual(watchesFor(CONFIG, ['README.md', 'test/helpers/tmp.ts']), [])
})

test('doc sem artefato declarado é exigido do mesmo jeito, só que sem skill', () => {
  const [match] = watchesFor(CONFIG, ['src/api/errors/not-found.ts'])

  assert.equal(match?.doc, 'docs/contracts/errors.md')
  assert.equal(match?.skill, null)
  assert.equal(match?.owner, null)
})

test('duas regras para o mesmo doc viram uma exigência só, com os caminhos somados', () => {
  const matches = watchesFor(CONFIG, ['src/domain/pedido/item.ts', 'src/domain/reembolso.ts'])

  assert.equal(matches.length, 1)
  assert.deepEqual(matches[0]?.matched, ['src/domain/pedido/item.ts', 'src/domain/reembolso.ts'])
})

test('RN-0008: o doc tocado no mesmo conjunto sai da lista de pendências', () => {
  const paths = ['src/domain/reembolso.ts', 'docs/requirements/rules.md']

  assert.equal(watchesFor(CONFIG, paths).length, 1)
  assert.deepEqual(pendingDocs(CONFIG, paths), [])
})

test('RN-0008: sem o doc, a pendência permanece', () => {
  const pending = pendingDocs(CONFIG, ['src/domain/reembolso.ts'])

  assert.equal(pending.length, 1)
  assert.equal(pending[0]?.doc, 'docs/requirements/rules.md')
})

test('doc declarado como diretório é coberto por qualquer arquivo dentro dele', () => {
  assert.equal(coversDoc('docs/requirements/', ['docs/requirements/rules.md']), true)
  assert.equal(coversDoc('docs/requirements/', ['docs/glossary.md']), false)
  assert.equal(coversDoc('docs/requirements/rules.md', ['docs/requirements/rules.md']), true)
  assert.equal(coversDoc('docs/requirements/rules.md', ['docs/requirements/']), false)
})

test('caminho em formato de host é normalizado antes de casar', () => {
  assert.equal(watchesFor(CONFIG, ['src\\domain\\reembolso.ts']).length, 1)
  assert.equal(watchesFor(CONFIG, ['./src/domain/reembolso.ts']).length, 1)
})

test('sem `watches`, nada é exigido — é o estado das Fases 0 a 2', () => {
  assert.deepEqual(watchesFor(SEM_WATCHES, ['src/domain/reembolso.ts']), [])
  assert.deepEqual(pendingDocs(SEM_WATCHES, ['src/domain/reembolso.ts']), [])
})
