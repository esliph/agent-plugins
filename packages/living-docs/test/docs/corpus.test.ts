import { test } from 'node:test'
import assert from 'node:assert/strict'
import { declaredPaths, documentationFiles } from '../../src/docs/corpus.ts'
import { OWNERSHIP_FILE, configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: docs/contracts/api.gen.md
    owner: "@time"
    living-docs: {}
  - path: CONTRIBUTING.md
    owner: "@time"
    living-docs: {}
  - path: fora/do/repo.md
    owner: "@time"
    living-docs: {}
  - path: .ownership.yml
    owner: "@time"
    living-docs: {}
  - path: docs/ids-retired.txt
    owner: "@time"
    living-docs: {}
  - path: src/
    owner: "@time"
generated:
  - path: docs/contracts/api.gen.md
    command: "node gen.js"
`

test('declaredPaths junta artefatos, documentos e gerados', () => {
  assert.deepEqual(new Set(declaredPaths(configFrom(OWNERSHIP))), new Set(['CONTRIBUTING.md', 'docs/contracts/api.gen.md', 'docs/decisions/adr/', 'fora/do/repo.md', '.ownership.yml', 'docs/ids-retired.txt']))
})

test('documentationFiles = o que os caminhos do living-docs declaram e existe; o resto do repositório não entra', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: OWNERSHIP,
      'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
      'docs/contracts/api.gen.md': '# gerado\n',
      'docs/ids-retired.txt': '\n',
      'docs/avulso.md': '# ninguém declarou\n',
      'CONTRIBUTING.md': '# como\n',
      'README.md': '# leia\n',
      'src/codigo.ts': 'export const x = 1;\n',
    },
    root => {
      const files = documentationFiles(root, configFrom(OWNERSHIP))

      assert.ok(files.includes('docs/decisions/adr/ADR-0001-x.md'))
      assert.ok(files.includes('.ownership.yml'), 'o mapa também é documento e também tem dono')
      assert.ok(files.includes('docs/ids-retired.txt'))
      assert.ok(files.includes('CONTRIBUTING.md'))
      assert.equal(files.includes('fora/do/repo.md'), false, 'declarado e ausente não entra')
      assert.equal(files.includes('README.md'), false, 'não declarado não é do corpus')
      assert.equal(files.includes('docs/avulso.md'), false, 'estar sob docs/ não basta: quem declara é a entrada')
      assert.equal(files.includes('src/codigo.ts'), false, 'coberto por entrada sem bloco living-docs: não é documentação')
    },
  )
})
