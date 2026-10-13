import { test } from 'node:test'
import assert from 'node:assert/strict'

import fs, { readFileSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { join } from 'node:path'

import { checkGenerated, firstDifferentLine, generatedDrift } from '../../plugin/src/checks/generated-drift.ts'
import { createCheckContext } from '../../plugin/src/checks/run.ts'
import { listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'
import { runCheck } from '../helpers/check.ts'
import { git, tempRepo, writeFile } from '../helpers/repo.ts'

const TOOLS = {
  'tools/ok.mjs': "process.stdout.write('one\\ntwo\\n')\n",
  'tools/fail.mjs': "console.error('boom: cannot read input')\nprocess.exit(3)\n",
  'tools/fail-stdout.mjs': "console.log('only stdout here')\nprocess.exit(1)\n",
  'tools/noisy.mjs': "console.error('warning: deprecated option')\nprocess.stdout.write('one\\ntwo\\n')\n",
  'tools/big.mjs': "process.stdout.write('line\\n'.repeat(600000))\n",
}

/** An ownership file owning everything, with these generated entries; the first entry is on line 10, the second on line 12. */
function ownership(generated: [string, string][], extra: string[] = []): string {
  const lines = [
    'version: 1',
    'owned:',
    '  - path: .ownership.yml',
    "    owner: '@a'",
    '  - path: out/',
    "    owner: '@a'",
    '  - path: tools/',
    "    owner: '@a'",
  ]

  if (generated.length > 0) {
    lines.push('generated:', ...generated.flatMap(([path, command]) => [`  - path: ${path}`, `    command: ${command}`]))
  }

  return [...lines, ...extra, ''].join('\n')
}

test('the first different line is counted from 1', () => {
  assert.equal(firstDifferentLine(Buffer.from('a\nb\n'), Buffer.from('a\nb\n')), null)
  assert.equal(firstDifferentLine(Buffer.from('a\nb\n'), Buffer.from('a\nB\n')), 2)
  assert.equal(firstDifferentLine(Buffer.from('a\nb\n'), Buffer.from('a\nb\nc\n')), 3)
  assert.equal(firstDifferentLine(Buffer.from('x'), Buffer.from('')), 1)
})

test('a file equal to the output of its command passes', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/a.md', 'node tools/ok.mjs']]), 'out/a.md': 'one\ntwo\n' })

  assert.deepEqual(await runCheck(generatedDrift, root), [])
})

test('a different file is a finding at its first different line, fixed by running the command', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/a.md', 'node tools/ok.mjs']]), 'out/a.md': 'one\nTWO\n' })

  assert.deepEqual(await runCheck(generatedDrift, root), [
    {
      file: 'out/a.md',
      line: 2,
      checkId: 'ownership/generated-drift',
      severity: 'error',
      message: 'differs from the output of "node tools/ok.mjs" from this line on',
      fix: 'node tools/ok.mjs > out/a.md',
    },
  ])
})

test('a missing declared file is a finding on the generated entry', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/missing.md', 'node tools/ok.mjs']]), 'out/keep.md': '' })

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line, item.message, item.fix]),
    [['.ownership.yml', 10, 'generated[0].path "out/missing.md" does not exist', 'node tools/ok.mjs > out/missing.md']],
  )
})

test('a declared path that is a directory is a finding on the generated entry, not a crash', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/api', 'node tools/ok.mjs']]), 'out/api/v1.md': '' })

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line, item.message, item.fix]),
    [['.ownership.yml', 10, 'generated[0].path "out/api" is a directory, not a file', 'node tools/ok.mjs > out/api']],
  )
})

test('a failing command shows the first line of stderr, or of stdout when stderr is empty', async t => {
  const root = tempRepo(t, {
    ...TOOLS,
    '.ownership.yml': ownership([
      ['out/a.md', 'node tools/fail.mjs'],
      ['out/b.md', 'node tools/fail-stdout.mjs'],
    ]),
    'out/a.md': '',
    'out/b.md': '',
  })

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.line, item.message]),
    [
      [10, 'generated[0].command "node tools/fail.mjs" failed with exit code 3: boom: cannot read input'],
      [12, 'generated[1].command "node tools/fail-stdout.mjs" failed with exit code 1: only stdout here'],
    ],
  )
})

test('stderr output from a command that succeeds is not a failure', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/a.md', 'node tools/noisy.mjs']]), 'out/a.md': 'one\ntwo\n' })

  assert.deepEqual(await runCheck(generatedDrift, root), [])
})

test('a multi-megabyte output is compared byte for byte', async t => {
  const equal = 'line\n'.repeat(600000)
  const changed = `${'line\n'.repeat(399999)}LINE\n${'line\n'.repeat(200000)}`
  const root = tempRepo(t, {
    ...TOOLS,
    '.ownership.yml': ownership([
      ['out/equal.md', 'node tools/big.mjs'],
      ['out/changed.md', 'node tools/big.mjs'],
    ]),
    'out/equal.md': equal,
    'out/changed.md': changed,
  })

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line]),
    [['out/changed.md', 400000]],
  )
})

test('a file with the marker outside generated[] is a finding; under an ignore or declared, it is not', async t => {
  const root = tempRepo(t, {
    ...TOOLS,
    '.ownership.yml': ownership([['out/a.md', 'node tools/marked.mjs']], ['ignore:', '  - out/vendor/']),
    'tools/marked.mjs': "// writes a file that says it is generated\nprocess.stdout.write('<!-- generated: do not edit -->\\n')\n",
    'out/a.md': '<!-- generated: do not edit -->\n',
    'out/stray.md': '<!-- GENERATED: DO NOT EDIT -->\nhand-written\n',
    'out/vendor/lib.md': 'generated: do not edit\n',
  })

  assert.deepEqual(await runCheck(generatedDrift, root), [
    {
      file: 'out/stray.md',
      line: 1,
      checkId: 'ownership/generated-drift',
      severity: 'error',
      message: 'carries the "generated: do not edit" marker but is not declared in generated[]',
      fix: 'declare it in generated[] of .ownership.yml with the command that produces it',
    },
  ])
})

test('the findings do not depend on how many generators run at once', async t => {
  const root = tempRepo(t, {
    ...TOOLS,
    '.ownership.yml': ownership([
      ['out/a.md', 'node tools/ok.mjs'],
      ['out/b.md', 'node tools/fail.mjs'],
      ['out/c.md', 'node tools/ok.mjs'],
    ]),
    'out/a.md': 'x\n',
    'out/b.md': '',
    'out/c.md': 'one\ntwo\n',
  })

  assert.deepEqual(await runCheck(generatedDrift, root, 1), await runCheck(generatedDrift, root, 4))
})

/** The files of a repository whose .gitattributes says `attributes`; the .gitattributes itself is ignored. */
function withAttributes(attributes: string, file: string, command = 'node tools/ok.mjs'): Record<string, string> {
  return {
    ...TOOLS,
    'tools/crlf.mjs': "process.stdout.write('one\\r\\ntwo\\r\\n')\n",
    '.gitattributes': attributes,
    '.ownership.yml': ownership([['out/a.md', command]], ['ignore:', '  - .gitattributes']),
    'out/a.md': file,
  }
}

test('with "* text=auto" and a CRLF checkout, a generator printing the same lines with LF is not drift', async t => {
  const root = tempRepo(t, withAttributes('* text=auto\n', 'one\r\ntwo\r\n'))

  assert.deepEqual(await runCheck(generatedDrift, root), [])
})

test('with "* text=auto" and a CRLF checkout, a real difference is reported at its line', async t => {
  const root = tempRepo(t, withAttributes('* text=auto\n', 'one\r\nTWO\r\n'))

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line]),
    [['out/a.md', 2]],
  )
})

test('a file marked -text and committed with CRLF is drift when the generator prints LF', async t => {
  const root = tempRepo(t, withAttributes('out/a.md -text\n', 'one\r\ntwo\r\n'), { add: true })

  git(root, 'commit', '-q', '-m', 'files')

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line, item.message]),
    [['out/a.md', 1, 'differs from the output of "node tools/ok.mjs" from this line on']],
  )
})

test('under default attributes Git keeps the CR of a generator that starts printing CRLF, so an LF file is drift', async t => {
  const root = tempRepo(t, withAttributes('', 'one\ntwo\n', 'node tools/crlf.mjs'))

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line]),
    [['out/a.md', 1]],
  )
})

test('an uncommitted edit of a committed generated file is drift: the work tree is compared, not the commit', async t => {
  const root = tempRepo(t, withAttributes('* text=auto\n', 'one\ntwo\n'), { add: true })

  git(root, 'commit', '-q', '-m', 'files')
  writeFile(root, 'out/a.md', 'one\r\nedited\r\n')

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line]),
    [['out/a.md', 2]],
  )
})

test('when Git cannot compute how it would store the file, the finding names the reason', async t => {
  // The file differs from the output, so Git is asked how it would store both.
  const root = tempRepo(t, withAttributes('out/a.md filter=broken\n', 'one\nTWO\n'))

  // A clean filter that always fails.
  git(root, 'config', 'filter.broken.clean', 'exit 1')
  git(root, 'config', 'filter.broken.required', 'true')

  const findings = await runCheck(generatedDrift, root)

  assert.deepEqual(
    findings.map(item => [item.file, item.line, item.fix]),
    [['.ownership.yml', 10, 'node tools/ok.mjs > out/a.md']],
  )
  assert.match(findings[0]?.message ?? '', /^generated\[0\]\.path "out\/a\.md" could not be hashed by git: \S/)
})

test('a generator that does not finish in time is stopped and reported as a failed command', async t => {
  const root = tempRepo(t, {
    ...TOOLS,
    '.ownership.yml': ownership([['out/a.md', 'node tools/hang.mjs']]),
    'tools/hang.mjs': "import { writeFileSync } from 'node:fs'\nwriteFileSync('hang.pid', String(process.pid))\nsetInterval(() => {}, 1000)\n",
    'out/a.md': '',
  })
  const repoFiles = listRepoFiles(root)
  const config = resolveOwnership(root, { repoFiles })

  assert.ok(config !== null)

  const [rule] = config.generated

  assert.ok(rule !== undefined)
  assert.deepEqual(
    (await checkGenerated(createCheckContext(config, repoFiles, 1), rule, 1500)).map(item => [item.file, item.line, item.message, item.fix]),
    [['.ownership.yml', 10, 'generated[0].command "node tools/hang.mjs" did not finish within 1.5 s and was stopped', 'node tools/hang.mjs > out/a.md']],
  )

  const pid = Number(readFileSync(join(root, 'hang.pid'), 'utf8'))

  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' })
})

test('a declared file that cannot be read is a finding on the generated entry that names the reason', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/a.md', 'node tools/ok.mjs']]), 'out/a.md': 'one\ntwo\n' })
  const unreadable = join(root, 'out', 'a.md')
  const original = fs.readFileSync

  // Permissions cannot make a file unreadable on every platform, so the read itself fails here.
  t.mock.method(fs, 'readFileSync', (...args: Parameters<typeof fs.readFileSync>) => {
    if (args[0] === unreadable) {
      throw Object.assign(new Error(`EACCES: permission denied, open '${unreadable}'`), { code: 'EACCES' })
    }

    return original(...args)
  })
  syncBuiltinESMExports()
  t.after(() => {
    t.mock.restoreAll()
    syncBuiltinESMExports()
  })

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line, item.message, item.fix]),
    [['.ownership.yml', 10, 'generated[0].path "out/a.md" cannot be read: EACCES', 'node tools/ok.mjs > out/a.md']],
  )
})
