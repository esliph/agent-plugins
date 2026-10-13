import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SCHEMA_URL } from '../../plugin/src/init/render.ts'
import { runCli } from '../helpers/cli.ts'
import { tempRepo } from '../helpers/repo.ts'

const HEADER = `# yaml-language-server: $schema=${SCHEMA_URL}\nversion: 1\n`
const FILES = { 'README.md': '', 'docs/a.md': '', 'src/a.ts': '', 'src/lib/b.ts': '' }

function read(root: string, path = '.ownership.yml'): string {
  return readFileSync(join(root, path), 'utf8')
}

test('without an option, init writes the skeleton and says validate fails on purpose', t => {
  const root = tempRepo(t, FILES)
  const result = runCli(['init'], { cwd: root })

  assert.equal(result.stderr, '')
  assert.equal(result.status, 0)
  assert.equal(
    result.stdout,
    [
      'ownership: wrote .ownership.yml with 0 entries.',
      'ownership: 5 repository files have no owner.',
      'ownership: declare every path in owned[]; "ownership validate" fails on purpose until every file has an owner.',
      'ownership: next step: ownership validate',
      '',
    ].join('\n'),
  )
  assert.match(read(root), /^# owned:\n# {3}- path: \.ownership\.yml\n# {5}owner: "@owner"\n# {3}- path: README\.md\n/m)
  assert.equal(runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root }).status, 1)
})

test('skeleton mode never switches to the CODEOWNERS on its own; it mentions --from-codeowners', t => {
  const root = tempRepo(t, FILES, { codeowners: '* @all\n' })
  const result = runCli(['init'], { cwd: root })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /^ownership: wrote \.ownership\.yml with 0 entries\.$/m)
  assert.match(result.stdout, /^ownership: this repository has a CODEOWNERS; "ownership init --from-codeowners" derives the entries from it\.$/m)
})

test('--owner gives every root child to that owner, the new file included, and coverage passes', t => {
  const root = tempRepo(t, FILES)
  const result = runCli(['init', '--owner', '@me'], { cwd: root })

  assert.equal(result.status, 0)
  assert.equal(
    result.stdout,
    ['ownership: wrote .ownership.yml with 4 entries.', 'ownership: every repository file has an owner.', 'ownership: next step: ownership validate', ''].join(
      '\n',
    ),
  )
  assert.equal(
    read(root),
    `${HEADER}\nowned:\n  - path: .ownership.yml\n    owner: "@me"\n  - path: README.md\n    owner: "@me"\n  - path: docs/\n    owner: "@me"\n  - path: src/\n    owner: "@me"\n`,
  )

  const validate = runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root })

  assert.equal(validate.stdout, 'ownership: no violations found.\n')
  assert.equal(validate.status, 0)
})

test('--from-codeowners derives entries that pass codeowners-match by construction, and counts the files left without an owner', t => {
  const root = tempRepo(t, FILES, { codeowners: '.ownership.yml @docs\nCODEOWNERS @docs\ndocs/ @docs @lead\nsrc/ @dev\nsrc/lib/ @lib\n' })
  const result = runCli(['init', '--from-codeowners'], { cwd: root })

  assert.equal(result.status, 0)
  assert.equal(
    result.stdout,
    [
      'ownership: wrote .ownership.yml with 5 entries.',
      'ownership: 1 repository file has no owner.',
      'ownership: declare every path in owned[]; "ownership validate" fails on purpose until every file has an owner.',
      'ownership: next step: ownership validate',
      '',
    ].join('\n'),
  )
  assert.equal(
    read(root),
    [
      `# yaml-language-server: $schema=${SCHEMA_URL}`,
      'version: 1',
      '',
      'owned:',
      '  - path: .ownership.yml',
      '    owner: "@docs"',
      '  - path: CODEOWNERS',
      '    owner: "@docs"',
      '  # CODEOWNERS line 3 also lists @lead',
      '  - path: docs/',
      '    owner: "@docs"',
      '  - path: src/a.ts',
      '    owner: "@dev"',
      '  - path: src/lib/',
      '    owner: "@lib"',
      '',
    ].join('\n'),
  )
  assert.equal(runCli(['validate', '--check', 'ownership/codeowners-match'], { cwd: root }).stdout, 'ownership: no violations found.\n')
  assert.match(runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root }).stdout, /^README\.md {2}ownership\/owner-coverage/m)
})

test('--stdout prints the file, sends the summary to stderr and writes nothing', t => {
  const root = tempRepo(t, FILES)
  const printed = runCli(['init', '--owner', '@me', '--stdout'], { cwd: root })

  assert.equal(printed.status, 0)
  assert.equal(existsSync(join(root, '.ownership.yml')), false)
  assert.equal(
    printed.stderr,
    [
      'ownership: printed .ownership.yml with 4 entries; nothing was written.',
      'ownership: every repository file has an owner.',
      'ownership: next step: ownership validate',
      '',
    ].join('\n'),
  )

  runCli(['init', '--owner', '@me'], { cwd: root })

  assert.equal(printed.stdout, read(root))
})

test('the same tree and the same options give the same file, byte for byte', t => {
  const codeowners = 'docs/ @docs\n* @all\n'
  const one = runCli(['init', '--from-codeowners', '--stdout'], { cwd: tempRepo(t, FILES, { codeowners }) })
  const two = runCli(['init', '--from-codeowners', '--stdout'], { cwd: tempRepo(t, FILES, { codeowners, add: true }) })

  assert.equal(one.status, 0)
  assert.equal(one.stdout, two.stdout)
})

test('--ownership creates the file elsewhere in the repository, and that file is covered too', t => {
  const root = tempRepo(t, FILES)
  const result = runCli(['init', '--owner', '@me', '--ownership', 'config/own.yml'], { cwd: root })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /^ownership: wrote config\/own\.yml with 4 entries\.$/m)
  assert.match(read(root, 'config/own.yml'), /^ {2}- path: config\/\n {4}owner: "@me"$/m)
  assert.equal(runCli(['validate', '--ownership', 'config/own.yml', '--check', 'ownership/owner-coverage'], { cwd: root }).status, 0)
})

test('files with the marker go into a commented generated block, and the file still loads', t => {
  const root = tempRepo(t, { 'src/gen.ts': '// generated: do not edit\n', 'src/a.ts': '' })

  assert.equal(runCli(['init', '--owner', '@me'], { cwd: root }).status, 0)
  assert.match(read(root), /^# generated:\n# {3}- path: src\/gen\.ts\n# {5}command: <command that prints this file>$/m)
  assert.equal(runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root }).status, 0)
})

test('paths that differ only in case are left out, listed, and the file still loads', t => {
  const root = tempRepo(t, { 'Docs/a.md': '', 'docs/b.md': '', 'src/a.ts': '' })

  if (existsSync(join(root, 'Docs', 'b.md'))) {
    t.skip('this file system does not tell Docs/ from docs/; CI (ubuntu) runs this proof')

    return
  }

  const result = runCli(['init', '--owner', '@me'], { cwd: root })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /^ownership: left out 2 paths an ownership file cannot declare: Docs\/, docs\/$/m)
  assert.match(result.stdout, /^ownership: 2 repository files have no owner\.$/m)
  assert.equal(runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root }).status, 1)
})

test('init never overwrites: the target or any root candidate already there is an error that names it', t => {
  const cases: [Record<string, string>, string[], string][] = [
    [{ '.ownership.yml': 'version: 1\n' }, [], 'ownership: .ownership.yml already exists; ownership init never overwrites an ownership file\n'],
    [{ 'docs/.ownership.yml': 'version: 1\n' }, [], 'ownership: docs/.ownership.yml already exists; ownership init never overwrites an ownership file\n'],
    [
      { '.ownership.yml': 'keep me\n' },
      ['--ownership', 'config/own.yml'],
      'ownership: .ownership.yml already exists; ownership init never overwrites an ownership file\n',
    ],
    [
      { 'config/own.yml': 'keep me\n' },
      ['--ownership', 'config/own.yml', '--stdout'],
      'ownership: config/own.yml already exists; ownership init never overwrites an ownership file\n',
    ],
  ]

  for (const [files, args, message] of cases) {
    const root = tempRepo(t, files)
    const before = Object.entries(files).map(([path]) => read(root, path))
    const result = runCli(['init', '--owner', '@me', ...args], { cwd: root })

    assert.equal(result.status, 2)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr, message)
    assert.deepEqual(
      Object.entries(files).map(([path]) => read(root, path)),
      before,
    )
  }
})

test('every other refusal exits 2, never 1, and creates nothing', t => {
  const root = tempRepo(t, FILES)
  const cases: [string[], RegExp][] = [
    [['--owner', '@me', '--from-codeowners'], /^ownership: --owner and --from-codeowners cannot be used together; pick one mode\n$/],
    [['--owner', 'me'], /^ownership: --owner must start with "@"; got "me"\n$/],
    [
      ['--from-codeowners'],
      /^ownership: --from-codeowners needs a CODEOWNERS, and the repository has none in \.github\/CODEOWNERS, CODEOWNERS, docs\/CODEOWNERS\n$/,
    ],
    [['--ownership', '../own.yml'], /^ownership: --ownership "\.\.\/own\.yml" is outside the repository; the root ownership file lives inside it\n$/],
    [['--ownership', 'docs'], /^ownership: --ownership "docs" is a directory; name the file to create\n$/],
    [['--force'], /^ownership: Unknown option '--force'/],
    [['--owner'], /^ownership: /],
  ]

  for (const [args, message] of cases) {
    const result = runCli(['init', ...args], { cwd: root })

    assert.equal(result.status, 2, args.join(' '))
    assert.equal(result.stdout, '')
    assert.match(result.stderr, message)
    assert.equal(existsSync(join(root, '.ownership.yml')), false)
  }
})

test('outside a Git work tree, init exits 2', t => {
  const result = runCli(['init', '--owner', '@me'], { cwd: tempRepo(t, FILES, { git: false }) })

  assert.equal(result.status, 2)
  assert.match(result.stderr, /is not inside a Git work tree; ownership init needs one\n$/)
})

test('more than one CODEOWNERS refuses --from-codeowners but not the skeleton', t => {
  const root = tempRepo(t, { ...FILES, '.github/CODEOWNERS': '* @a\n' }, { codeowners: '* @b\n' })
  const derived = runCli(['init', '--from-codeowners'], { cwd: root })

  assert.equal(derived.status, 2)
  assert.match(derived.stderr, /more than one CODEOWNERS: \.github\/CODEOWNERS, CODEOWNERS/)
  assert.equal(runCli(['init'], { cwd: root }).status, 0)
})
