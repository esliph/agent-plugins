import { test } from 'node:test'
import assert from 'node:assert/strict'
import { declaredPaths, docsRoot, documentationFiles } from '../../src/docs/corpus.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
generated:
  - path: docs/contracts/api.gen.md
    command: "node gen.js"
documents:
  - path: CONTRIBUTING.md
    owner: "@time"
  - path: fora/do/repo.md
    owner: "@time"
`

test('docsRoot deriva da localização do .ownership.yml — nenhum literal `docs/` no check', () => {
  assert.equal(docsRoot(), 'docs')
})

test('declaredPaths junta artefatos, documentos e gerados', () => {
  assert.deepEqual(declaredPaths(parseOwnership(OWNERSHIP)).sort(), ['CONTRIBUTING.md', 'docs/contracts/api.gen.md', 'docs/decisions/adr/', 'fora/do/repo.md'])
})

test('documentationFiles = tudo sob a raiz + o que é declarado fora dela e existe', () => {
  withTempRepo(
    {
      'docs/.ownership.yml': OWNERSHIP,
      'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
      'docs/contracts/api.gen.md': '# gerado\n',
      'docs/ids-retired.txt': '\n',
      'CONTRIBUTING.md': '# como\n',
      'README.md': '# leia\n',
      'src/codigo.ts': 'export const x = 1;\n',
    },
    root => {
      const files = documentationFiles(root, parseOwnership(OWNERSHIP))

      assert.ok(files.includes('docs/decisions/adr/ADR-0001-x.md'))
      assert.ok(files.includes('docs/.ownership.yml'), 'o mapa também é documento e também tem dono')
      assert.ok(files.includes('docs/ids-retired.txt'))
      assert.ok(files.includes('CONTRIBUTING.md'), 'declarado fora da raiz e existe')
      assert.equal(files.includes('fora/do/repo.md'), false, 'declarado e ausente não entra')
      assert.equal(files.includes('README.md'), false, 'não declarado e fora da raiz não é do corpus')
      assert.equal(files.includes('src/codigo.ts'), false)
    },
  )
})
