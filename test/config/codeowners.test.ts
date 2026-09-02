import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadCodeowners, ownersOf, parseCodeowners } from '../../src/config/codeowners.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CODEOWNERS = `# Espelha o owner de docs/.ownership.yml
docs/decisions/adr/    @time
docs/open-decisions.md    @produto @time
/CONTRIBUTING.md    @time
docs/contracts/*.md    @contratos
sem-dono.md
`

test('parseCodeowners ignora comentário e linha vazia, e guarda só handles', () => {
  const entries = parseCodeowners(CODEOWNERS)

  assert.equal(entries.length, 5)
  assert.deepEqual(entries[1]?.owners, ['@produto', '@time'])
  assert.equal(entries[1]?.line, 3)
  assert.deepEqual(entries[4]?.owners, [], 'padrão sem handle não declara dono')
})

test('ownersOf cobre diretório por prefixo, arquivo por igualdade, e ignora a barra inicial', () => {
  const codeowners = { file: 'CODEOWNERS', entries: parseCodeowners(CODEOWNERS) }

  assert.deepEqual(ownersOf(codeowners, 'docs/decisions/adr/ADR-0001-x.md'), ['@time'])
  assert.deepEqual(ownersOf(codeowners, 'docs/open-decisions.md'), ['@produto', '@time'])
  assert.deepEqual(ownersOf(codeowners, 'CONTRIBUTING.md'), ['@time'])
  assert.deepEqual(ownersOf(codeowners, 'docs/contracts/errors.md'), ['@contratos'])
  assert.equal(ownersOf(codeowners, 'docs/glossary.md'), null)
  assert.equal(ownersOf(codeowners, 'sem-dono.md'), null, 'padrão sem handle não cobre nada')
})

test('ownersOf: `*` cobre tudo, e a última regra que casa ganha', () => {
  const codeowners = { file: 'CODEOWNERS', entries: parseCodeowners('*    @todos\ndocs/    @docs\n') }

  assert.deepEqual(ownersOf(codeowners, 'qualquer/coisa.ts'), ['@todos'])
  assert.deepEqual(ownersOf(codeowners, 'docs/x.md'), ['@docs'])
})

test('loadCodeowners procura nos três lugares e devolve null quando não há nenhum', () => {
  withTempRepo({ '.github/CODEOWNERS': 'docs/    @time\n' }, root => {
    assert.equal(loadCodeowners(root)?.file, '.github/CODEOWNERS')
  })
  withTempRepo({ 'CODEOWNERS': 'docs/    @time\n', '.github/CODEOWNERS': 'x    @outro\n' }, root => {
    assert.equal(loadCodeowners(root)?.file, 'CODEOWNERS', 'a raiz vem primeiro')
  })
  withTempRepo({ 'README.md': '' }, root => {
    assert.equal(loadCodeowners(root), null)
  })
})
