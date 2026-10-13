import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { runCli } from '../helpers/cli.ts'
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
  '      sdd-kit: {}',
  '      docs-kit:',
  '        id-prefix: ADR',
  '  - path: .gitignore',
  "    owner: '@Lead'",
  'generated:',
  '  - path: src/gen.ts',
  '    command: node gen.mjs',
  'ignore:',
  '  - src/vendor/',
  '',
].join('\n')

const FILES = {
  '.ownership.yml': OWNERSHIP,
  '.gitignore': 'dist/\n',
  'src/a.ts': '',
  'src/gen.ts': '',
  'src/marked.ts': '// generated: do not edit\n',
  'src/vendor/lib.js': '',
  'dist/out.js': '',
  'README.md': '',
}

const SRC_ENTRY = [
  'owned      src/  owner @team  skill src-keeper  (.ownership.yml:5)',
  '           plugin docs-kit: {"id-prefix":"ADR"}',
  '           plugin sdd-kit: {}',
]

function explain(root: string, ...args: string[]): string {
  const result = runCli(['explain', ...args], { cwd: root })

  assert.equal(result.stderr, '')
  assert.equal(result.status, 0)

  return result.stdout
}

test('a covered file shows every block, with — for what it does not have', t => {
  const root = tempRepo(t, FILES, { codeowners: '* @other\nsrc/ @team @lead\n' })

  assert.equal(
    explain(root, 'src/a.ts'),
    ['path       src/a.ts', ...SRC_ENTRY, 'generated  —', 'ignore     —', 'CODEOWNERS line 2: @team @lead — declared owner listed', ''].join('\n'),
  )
})

test('an entry without a skill shows —, and a declared owner missing from the line is said', t => {
  const root = tempRepo(t, FILES, { codeowners: '* @other\n' })

  assert.equal(
    explain(root, '.gitignore'),
    [
      'path       .gitignore',
      'owned      .gitignore  owner @Lead  skill —  (.ownership.yml:12)',
      'generated  —',
      'ignore     —',
      'CODEOWNERS line 1: @other — declared owner @Lead not listed',
      '',
    ].join('\n'),
  )
})

test('the declared owner is looked up on the CODEOWNERS line without regard to case', t => {
  assert.match(explain(tempRepo(t, FILES, { codeowners: '.gitignore @lead\n' }), '.gitignore'), /^CODEOWNERS line 1: @lead — declared owner listed$/m)
})

test('a line with a pattern and no owner, and a path no line matches, are told apart', t => {
  const root = tempRepo(t, FILES, { codeowners: 'src/\n' })

  assert.match(explain(root, 'src/a.ts'), /^CODEOWNERS line 1: no owner — declared owner @team not listed$/m)
  assert.match(explain(root, 'README.md'), /^CODEOWNERS no line matches this path$/m)
})

test('a declared generated file shows its command, its origin and the owned entry that covers it', t => {
  assert.equal(
    explain(tempRepo(t, FILES), 'src/gen.ts'),
    [
      'path       src/gen.ts',
      ...SRC_ENTRY,
      'generated  generated[]  command node gen.mjs  (.ownership.yml:15)',
      'ignore     —',
      'CODEOWNERS the repository has no CODEOWNERS',
      '',
    ].join('\n'),
  )
})

test('a file with the marker outside generated[] says the marker is the origin', t => {
  assert.match(explain(tempRepo(t, FILES), 'src/marked.ts'), /^generated {2}marker "generated: do not edit" on its first line; not declared in generated\[\]$/m)
})

test('a file under an ignore inside an owned directory shows both rules and is outside coverage', t => {
  assert.equal(
    explain(tempRepo(t, FILES), 'src/vendor/lib.js'),
    [
      'path       src/vendor/lib.js',
      ...SRC_ENTRY,
      'generated  —',
      'ignore     src/vendor/  (.ownership.yml:18)',
      'CODEOWNERS the repository has no CODEOWNERS',
      'coverage   outside coverage: the ignore leaves it out of src/',
      '',
    ].join('\n'),
  )
})

test('an uncovered path names the ownership file where its entry belongs', t => {
  const root = tempRepo(t, {
    ...FILES,
    '.ownership.yml': `${OWNERSHIP}include:\n  - plugins/x/\n`,
    'plugins/x/.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@x'\n",
    'plugins/x/a.ts': '',
  })

  assert.equal(
    explain(root, 'README.md'),
    [
      'path       README.md',
      'owned      —',
      'generated  —',
      'ignore     —',
      'CODEOWNERS the repository has no CODEOWNERS',
      'coverage   not covered: its entry belongs in owned[] of .ownership.yml',
      '',
    ].join('\n'),
  )
  assert.match(explain(root, 'plugins/x/a.ts'), /^coverage {3}not covered: its entry belongs in owned\[\] of plugins\/x\/\.ownership\.yml$/m)
  assert.match(explain(root, 'plugins/x/planned/new.ts'), /^coverage {3}not covered: its entry belongs in owned\[\] of plugins\/x\/\.ownership\.yml$/m)
})

test('a path a .gitignore excludes is said so, and its coverage is not evaluated', t => {
  assert.match(explain(tempRepo(t, FILES), 'dist/out.js'), /^coverage {3}not a repository file: a \.gitignore excludes it, so coverage is not evaluated$/m)
})

test('a directory is explained as a directory, with or without the trailing slash', t => {
  const root = tempRepo(t, FILES, { codeowners: 'src/ @team\n' })
  const expected = ['path       src/', ...SRC_ENTRY, 'generated  —', 'ignore     —', 'CODEOWNERS line 1: @team — declared owner listed', ''].join('\n')

  assert.equal(explain(root, 'src/'), expected)
  assert.equal(explain(root, 'src'), expected)
})

test('the path may be absolute or start with ./', t => {
  const root = tempRepo(t, FILES)
  const expected = explain(root, 'src/a.ts')

  assert.equal(explain(root, join(root, 'src', 'a.ts')), expected)
  assert.equal(explain(root, './src/a.ts'), expected)
})

test('a missing path, an extra path or a path outside the repository exits 2', t => {
  const root = tempRepo(t, FILES)
  const cases: [string[], RegExp][] = [
    [[], /^ownership: explain needs a path/],
    [['a.ts', 'b.ts'], /^ownership: explain takes one path; got 2/],
    [['../elsewhere.ts'], /^ownership: "\.\.\/elsewhere\.ts" is outside the repository/],
    [['.'], /^ownership: "\." is the repository itself/],
  ]

  for (const [args, message] of cases) {
    const result = runCli(['explain', ...args], { cwd: root })

    assert.equal(result.status, 2, args.join(' '))
    assert.equal(result.stdout, '')
    assert.match(result.stderr, message)
  }
})

test('a repository without an ownership file has nothing to explain, and a load error exits 2', t => {
  const none = runCli(['explain', 'a.txt'], { cwd: tempRepo(t, { 'a.txt': '' }) })
  const broken = runCli(['explain', 'a.txt'], { cwd: tempRepo(t, { '.ownership.yml': 'version: 2\n', 'a.txt': '' }) })

  assert.equal(none.status, 0)
  assert.equal(none.stdout, 'ownership: no ownership file found; nothing to explain.\n')
  assert.equal(broken.status, 2)
  assert.equal(broken.stdout, '')
  assert.match(broken.stderr, /version 2 is not supported/)
})

test('explain never prunes: an error in an include that cannot hold the path still shows', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/.ownership.yml': 'version: 2\n', 'README.md': '' })
  const result = runCli(['explain', 'README.md'], { cwd: root })

  assert.equal(result.status, 2)
  assert.match(result.stderr, /^plugins\/x\/\.ownership\.yml:1: version 2 is not supported/)
})
