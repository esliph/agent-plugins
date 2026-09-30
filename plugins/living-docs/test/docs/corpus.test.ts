import { test } from 'node:test'
import assert from 'node:assert/strict'
import { declaredPaths, documentationFiles } from '../../plugin/src/docs/corpus.ts'
import { OWNERSHIP_FILE, configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: docs/contracts/api.gen.md
    owner: "@team"
    living-docs: {}
  - path: CONTRIBUTING.md
    owner: "@team"
    living-docs: {}
  - path: outside/the/repo.md
    owner: "@team"
    living-docs: {}
  - path: .ownership.yml
    owner: "@team"
    living-docs: {}
  - path: docs/ids-retired.txt
    owner: "@team"
    living-docs: {}
  - path: src/
    owner: "@team"
generated:
  - path: docs/contracts/api.gen.md
    command: "node gen.js"
`

test('declaredPaths joins artifacts, documents and generated files', () => {
  assert.deepEqual(new Set(declaredPaths(configFrom(OWNERSHIP))), new Set(['CONTRIBUTING.md', 'docs/contracts/api.gen.md', 'docs/decisions/adr/', 'outside/the/repo.md', '.ownership.yml', 'docs/ids-retired.txt']))
})

test('documentationFiles = what the living-docs paths declare and exists; the rest of the repository does not get in', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: OWNERSHIP,
      'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
      'docs/contracts/api.gen.md': '# generated\n',
      'docs/ids-retired.txt': '\n',
      'docs/stray.md': '# nobody declared\n',
      'CONTRIBUTING.md': '# how\n',
      'README.md': '# read\n',
      'src/code.ts': 'export const x = 1;\n',
    },
    root => {
      const files = documentationFiles(root, configFrom(OWNERSHIP))

      assert.ok(files.includes('docs/decisions/adr/ADR-0001-x.md'))
      assert.ok(files.includes('.ownership.yml'), 'the map is also a document and also has an owner')
      assert.ok(files.includes('docs/ids-retired.txt'))
      assert.ok(files.includes('CONTRIBUTING.md'))
      assert.equal(files.includes('outside/the/repo.md'), false, 'declared and absent does not get in')
      assert.equal(files.includes('README.md'), false, 'undeclared is not part of the corpus')
      assert.equal(files.includes('docs/stray.md'), false, 'being under docs/ is not enough: the entry is what declares')
      assert.equal(files.includes('src/code.ts'), false, 'covered by an entry without a living-docs block: not documentation')
    },
  )
})
