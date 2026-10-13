import { test } from 'node:test'
import assert from 'node:assert/strict'

import { firstDifferentLine, generatedDrift } from '../../plugin/src/checks/generated-drift.ts'
import { runCheck } from '../helpers/check.ts'
import { tempRepo } from '../helpers/repo.ts'

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

test('a checkout with CRLF line ends is not drift: Git stores the file with LF, and the content is what is compared', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/a.md', 'node tools/ok.mjs']]), 'out/a.md': 'one\r\ntwo\r\n' })

  assert.deepEqual(await runCheck(generatedDrift, root), [])
})

test('a CRLF checkout still reports a real difference, at the right line', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/a.md', 'node tools/ok.mjs']]), 'out/a.md': 'one\r\nTWO\r\n' })
  const findings = await runCheck(generatedDrift, root)

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.line, 2)
})
