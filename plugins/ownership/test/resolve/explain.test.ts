import { test } from 'node:test'
import assert from 'node:assert/strict'

import { loadCodeowners } from '../../plugin/src/codeowners/locate.ts'
import { listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { explainPath } from '../../plugin/src/resolve/explain.ts'
import type { PathExplanation } from '../../plugin/src/resolve/explain.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'
import { tempRepo } from '../helpers/repo.ts'

const OWNERSHIP = [
  'version: 1',
  'owned:',
  '  - path: .ownership.yml',
  "    owner: '@team'",
  '  - path: src/',
  "    owner: '@team'",
  '    skill: src-keeper',
  '    plugins:',
  '      docs-kit:',
  '        id-prefix: ADR',
  '  - path: .gitignore',
  "    owner: '@team'",
  'generated:',
  '  - path: src/gen.ts',
  '    command: node gen.mjs',
  'ignore:',
  '  - src/vendor/',
  '',
].join('\n')

function explain(root: string, path: string): PathExplanation {
  const repoFiles = listRepoFiles(root)
  const config = resolveOwnership(root, { repoFiles })

  assert.ok(config !== null)

  return explainPath(config, path, { repoFiles, codeowners: loadCodeowners(root) })
}

function repo(t: Parameters<typeof tempRepo>[0], codeowners?: string): string {
  return tempRepo(
    t,
    {
      '.ownership.yml': OWNERSHIP,
      '.gitignore': 'dist/\n',
      'src/a.ts': '',
      'src/gen.ts': '',
      'src/marked.ts': '// generated: do not edit\n',
      'src/vendor/lib.js': '',
      'dist/out.js': '',
      'README.md': '',
    },
    codeowners === undefined ? {} : { codeowners },
  )
}

test('a covered file shows its owned entry and the CODEOWNERS line', t => {
  const explanation = explain(repo(t, '* @team @lead\n'), 'src/a.ts')

  assert.equal(explanation.path, 'src/a.ts')
  assert.equal(explanation.owned?.path, 'src/')
  assert.deepEqual(explanation.owned?.plugins, { 'docs-kit': { 'id-prefix': 'ADR' } })
  assert.equal(explanation.generated, null)
  assert.equal(explanation.ignore, null)
  assert.deepEqual(explanation.coverage, { kind: 'covered' })
  assert.deepEqual(explanation.codeowners, { kind: 'matched', owners: ['@team', '@lead'], line: 1 })
})

test('a generated file shows where it is declared, its command and the owned entry that covers it', t => {
  const explanation = explain(repo(t), 'src/gen.ts')

  assert.equal(explanation.generated?.source, 'declared')
  assert.equal(explanation.generated?.source === 'declared' ? explanation.generated.rule.command : null, 'node gen.mjs')
  assert.equal(explanation.owned?.path, 'src/')
})

test('a file with the marker outside generated[] says the marker is the origin', t => {
  assert.deepEqual(explain(repo(t), 'src/marked.ts').generated, { source: 'marker' })
})

test('a file under an ignore inside an owned directory shows both rules and is outside coverage', t => {
  const explanation = explain(repo(t), 'src/vendor/lib.js')

  assert.equal(explanation.owned?.path, 'src/')
  assert.equal(explanation.ignore?.path, 'src/vendor/')
  assert.deepEqual(explanation.coverage, { kind: 'ignored' })
})

test('an uncovered path names the ownership file where its entry belongs', t => {
  assert.deepEqual(explain(repo(t), 'README.md').coverage, { kind: 'uncovered', file: '.ownership.yml' })
  assert.deepEqual(explain(repo(t), 'planned/new.md').coverage, { kind: 'uncovered', file: '.ownership.yml' })
})

test('a path a .gitignore excludes is said so and its coverage is not evaluated', t => {
  assert.deepEqual(explain(repo(t), 'dist/out.js').coverage, { kind: 'gitignored' })
})

test('without CODEOWNERS, the explanation says so', t => {
  assert.deepEqual(explain(repo(t), 'src/a.ts').codeowners, { kind: 'no-codeowners' })
})

test('a directory path is evaluated as a directory', t => {
  const explanation = explain(repo(t, 'src/ @team\n'), 'src/')

  assert.equal(explanation.owned?.path, 'src/')
  assert.deepEqual(explanation.coverage, { kind: 'covered' })
  assert.deepEqual(explanation.codeowners, { kind: 'matched', owners: ['@team'], line: 1 })
})
