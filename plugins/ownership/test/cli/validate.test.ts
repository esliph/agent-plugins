import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { runCli } from '../helpers/cli.ts'
import { tempRepo } from '../helpers/repo.ts'

const WITH_PLUGINS = [
  'version: 1',
  'plugins:',
  '  docs-kit:',
  '    lang: en',
  '  other-kit: {}',
  'owned:',
  '  - path: .ownership.yml',
  "    owner: '@a'",
  '  - path: docs/',
  "    owner: '@a'",
  '    plugins:',
  '      docs-kit: {}',
  '  - path: gone.md',
  "    owner: '@a'",
  '',
].join('\n')

const FILES = { '.ownership.yml': WITH_PLUGINS, 'docs/a.md': '', 'README.md': '' }

const PLUGIN_BLOCK = ['ownership: plugins in use:', '  docs-kit   1 entry  global config', '  other-kit  0 entries  global config']

test('a repository without an ownership file has nothing to validate', t => {
  const root = tempRepo(t, { 'a.txt': '' })
  const text = runCli(['validate'], { cwd: root })
  const json = runCli(['validate', '--format', 'json'], { cwd: root })

  assert.equal(text.status, 0)
  assert.equal(text.stdout, 'ownership: no ownership file found; nothing to validate.\n')
  assert.equal(json.status, 0)
  assert.deepEqual(JSON.parse(json.stdout), { findings: [], plugins: [], errors: 0, warnings: 0 })
})

test('a clean repository prints the final line and exits 0', t => {
  const root = tempRepo(t, { '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n" })
  const result = runCli(['validate'], { cwd: root })

  assert.equal(result.status, 0)
  assert.equal(result.stdout, 'ownership: no violations found.\n')
})

test('text output: findings, the plugins block and the counts, exit 1', t => {
  const result = runCli(['validate'], { cwd: tempRepo(t, FILES) })

  assert.equal(result.status, 1)
  assert.equal(
    result.stdout,
    [
      '.ownership.yml:13  ownership/owner-coverage  error  owned[2].path "gone.md" does not exist in the repository',
      '  → correct the path, or remove the entry',
      'README.md  ownership/owner-coverage  error  no owned entry covers this file',
      '  → declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
      ...PLUGIN_BLOCK,
      'ownership: 2 errors, 0 warnings.',
      '',
    ].join('\n'),
  )
})

test('json output: one object with the findings, the plugins and the counts', t => {
  const result = runCli(['validate', '--format', 'json'], { cwd: tempRepo(t, FILES) })

  assert.equal(result.status, 1)
  assert.deepEqual(JSON.parse(result.stdout), {
    findings: [
      {
        file: '.ownership.yml',
        line: 13,
        checkId: 'ownership/owner-coverage',
        severity: 'error',
        message: 'owned[2].path "gone.md" does not exist in the repository',
        fix: 'correct the path, or remove the entry',
      },
      {
        file: 'README.md',
        checkId: 'ownership/owner-coverage',
        severity: 'error',
        message: 'no owned entry covers this file',
        fix: 'declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
      },
    ],
    plugins: [
      { name: 'docs-kit', entries: 1, globalConfig: true },
      { name: 'other-kit', entries: 0, globalConfig: true },
    ],
    errors: 2,
    warnings: 0,
  })
})

test('github output: workflow commands, then the plugins block and the counts as in text', t => {
  const result = runCli(['validate', '--format', 'github'], { cwd: tempRepo(t, FILES) })

  assert.equal(result.status, 1)
  assert.equal(
    result.stdout,
    [
      '::error file=.ownership.yml,line=13,title=ownership/owner-coverage::owned[2].path "gone.md" does not exist in the repository → correct the path, or remove the entry',
      '::error file=README.md,title=ownership/owner-coverage::no owned entry covers this file → declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
      ...PLUGIN_BLOCK,
      'ownership: 2 errors, 0 warnings.',
      '',
    ].join('\n'),
  )
})

test('github output escapes %, CR and LF', t => {
  const root = tempRepo(t, { '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n  - path: 100%.md\n    owner: '@a'\n" })
  const result = runCli(['validate', '--format', 'github'], { cwd: root })

  assert.match(result.stdout, /owned\[1\]\.path "100%25\.md" does not exist/)
})

test('--check runs only the named checks, over the whole repository, and keeps the plugins block', t => {
  const root = tempRepo(t, FILES, { codeowners: 'docs/ @other\n' })
  const all = runCli(['validate'], { cwd: root })
  const coverage = runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root })

  assert.match(all.stdout, /ownership\/codeowners-match/)
  assert.doesNotMatch(coverage.stdout, /ownership\/codeowners-match/)
  assert.match(coverage.stdout, /ownership: plugins in use:/)
  assert.match(coverage.stdout, /CODEOWNERS {2}ownership\/owner-coverage/)
})

test('an unknown check, a bad format or a bad --jobs exits 2', t => {
  const root = tempRepo(t, FILES)
  const check = runCli(['validate', '--check', 'ownership/nope'], { cwd: root })

  assert.equal(check.status, 2)
  assert.equal(
    check.stderr,
    'ownership: unknown check "ownership/nope"; the checks are ownership/owner-coverage, ownership/codeowners-match, ownership/generated-drift\n',
  )

  for (const args of [['--format', 'xml'], ['--jobs', '0'], ['--jobs', 'two'], ['--jobs']]) {
    const result = runCli(['validate', ...args], { cwd: root })

    assert.equal(result.status, 2, args.join(' '))
    assert.match(result.stderr, /^ownership: /)
    assert.equal(result.stdout, '')
  }
})

test('a load error exits 2 with the message on stderr and nothing on stdout', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 2\n' })

  for (const format of ['text', 'json', 'github']) {
    const result = runCli(['validate', '--format', format], { cwd: root })

    assert.equal(result.status, 2)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /^\.ownership\.yml:1: version 2 is not supported; supported versions: 1/)
  }
})

test('an ownership file outside a Git work tree exits 2', t => {
  const result = runCli(['validate'], { cwd: tempRepo(t, { '.ownership.yml': 'version: 1\n' }, { git: false }) })

  assert.equal(result.status, 2)
  assert.match(result.stderr, /is not inside a Git work tree/)
})

test('OWNERSHIP_REPO_ROOT points at another repository, and --ownership at another root file', t => {
  const target = tempRepo(t, { 'config/own.yml': "version: 1\nowned:\n  - path: config/\n    owner: '@a'\n" })
  const elsewhere = tempRepo(t, {}, { git: false })

  mkdirSync(join(elsewhere, 'sub'))

  const result = runCli(['validate', '--ownership', 'config/own.yml'], { cwd: join(elsewhere, 'sub'), env: { OWNERSHIP_REPO_ROOT: target } })

  assert.equal(result.stderr, '')
  assert.equal(result.status, 0)
  assert.equal(result.stdout, 'ownership: no violations found.\n')
})

test('the output is the same whatever --jobs is', t => {
  const generators = Array.from({ length: 6 }, (_, i) => `  - path: out/${i}.md\n    command: node gen.mjs ${i}\n`).join('')
  const root = tempRepo(t, {
    '.ownership.yml': `version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n  - path: out/\n    owner: '@a'\n  - path: gen.mjs\n    owner: '@a'\ngenerated:\n${generators}`,
    'gen.mjs': "const n = Number(process.argv[2])\nif (n % 3 === 0) { console.error('fail ' + n); process.exit(1) }\nprocess.stdout.write('v' + n + '\\n')\n",
    ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`out/${i}.md`, i % 2 === 0 ? 'stale\n' : `v${i}\n`])),
  })

  assert.equal(runCli(['validate', '--jobs', '1'], { cwd: root }).stdout, runCli(['validate', '--jobs', '4'], { cwd: root }).stdout)
})
