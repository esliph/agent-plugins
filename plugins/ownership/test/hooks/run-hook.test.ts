import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { bashExecutable, runHook } from '../helpers/hook.ts'
import { tempRepo } from '../helpers/repo.ts'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const OWNERSHIP = "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\ngenerated:\n  - path: docs/api.md\n    command: node tools/gen.mjs\n"
const FILES = { '.ownership.yml': OWNERSHIP, 'docs/api.md': 'api\n', 'docs/guide.md': '# Guide\n' }

const bash = bashExecutable()
const skip = bash === null ? 'no Git for Windows bash on this machine; CI (ubuntu) runs this proof' : false

function edit(root: string, file: string): unknown {
  return { tool_name: 'Edit', tool_input: { file_path: join(root, ...file.split('/')) } }
}

test('the hook is registered before every file tool, through the wrapper', () => {
  const hooks = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'hooks', 'hooks.json'), 'utf8')) as {
    hooks: Record<string, { matcher: string; hooks: { type: string; command: string }[] }[]>
  }

  assert.deepEqual(Object.keys(hooks.hooks), ['PreToolUse'])
  assert.equal(hooks.hooks.PreToolUse?.length, 1)
  assert.equal(hooks.hooks.PreToolUse?.[0]?.matcher, 'Edit|Write|MultiEdit|NotebookEdit')
  assert.deepEqual(
    hooks.hooks.PreToolUse?.[0]?.hooks.map(hook => [hook.type, hook.command]),
    [['command', '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh" generated-guard']],
  )
})

test('editing a generated file prints one deny decision and exits 0', { skip }, t => {
  const root = tempRepo(t, FILES)
  const run = runHook(bash ?? '', 'generated-guard', edit(root, 'docs/api.md'), { project: root })

  assert.equal(run.status, 0, run.stderr)
  assert.deepEqual(JSON.parse(run.stdout), {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'docs/api.md is a generated file, declared in .ownership.yml:6: do not edit it by hand. Change what it is generated from and run: node tools/gen.mjs > docs/api.md',
    },
  })
})

test('a payload path under the host root is judged against the project directory', { skip }, t => {
  const root = tempRepo(t, FILES)
  // A root in the form of the platform: on Windows, bash rewrites a POSIX-looking value before node sees it.
  const hostRoot = process.platform === 'win32' ? 'C:\\Host\\Checkout' : '/host/checkout'
  const payload = {
    tool_name: 'Edit',
    tool_input: { file_path: process.platform === 'win32' ? 'c:\\host\\checkout\\docs\\api.md' : '/host/checkout/docs/api.md' },
  }

  assert.equal(runHook(bash ?? '', 'generated-guard', payload, { project: root }).stdout, '')
  assert.match(runHook(bash ?? '', 'generated-guard', payload, { project: root, env: { OWNERSHIP_HOST_ROOT: hostRoot } }).stdout, /"permissionDecision":"deny"/)
})

test('the hook is silent and exits 0 whenever it has nothing to deny or cannot judge', { skip }, t => {
  const root = tempRepo(t, FILES)
  const broken = tempRepo(t, { ...FILES, '.ownership.yml': 'version: 2\n' })
  const empty = tempRepo(t, { 'docs/api.md': '' })
  const runs = [
    runHook(bash ?? '', 'generated-guard', edit(root, 'docs/guide.md'), { project: root }),
    runHook(bash ?? '', 'generated-guard', edit(broken, 'docs/api.md'), { project: broken }),
    runHook(bash ?? '', 'generated-guard', edit(empty, 'docs/api.md'), { project: empty }),
    runHook(bash ?? '', 'generated-guard', null, { project: root, input: 'this is not JSON' }),
    runHook(bash ?? '', 'generated-guard', null, { project: root, input: '' }),
    runHook(bash ?? '', 'no-such-hook', edit(root, 'docs/api.md'), { project: root }),
    runHook(bash ?? '', '', edit(root, 'docs/api.md'), { project: root }),
  ]

  for (const run of runs) {
    assert.equal(run.status, 0)
    assert.equal(run.stdout, '')
  }
})

test('without node on the PATH, the wrapper is silent and exits 0', { skip }, t => {
  const root = tempRepo(t, FILES)
  const run = runHook(bash ?? '', 'generated-guard', edit(root, 'docs/api.md'), { project: root, env: { PATH: '/nonexistent', Path: '/nonexistent' } })

  assert.equal(run.status, 0)
  assert.equal(run.stdout, '')
})

test('a git that hangs does not hold the hook past its five-second budget: it ends silent, with 0', t => {
  const root = tempRepo(t, FILES)
  // A stand-in for git: node itself, named git, which runs the script named by the
  // first argument git receives from the cwd it is given, the repository root.
  const bin = mkdtempSync(join(tmpdir(), 'ownership-bin-'))

  t.after(() => rmSync(bin, { recursive: true, force: true }))
  copyFileSync(process.execPath, join(bin, process.platform === 'win32' ? 'git.exe' : 'git'))
  writeFileSync(join(root, 'rev-parse'), 'setTimeout(() => {}, 30000)\n')

  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: root }
  const pathKey = Object.keys(env).find(key => key.toUpperCase() === 'PATH') ?? 'PATH'

  env[pathKey] = `${bin}${delimiter}${env[pathKey] ?? ''}`
  delete env.OWNERSHIP_HOST_ROOT
  delete env.OWNERSHIP_CONFIG
  delete env.NODE_OPTIONS

  const started = Date.now()
  const run = spawnSync(process.execPath, [join(PLUGIN_ROOT, 'src', 'hooks', 'main.ts'), 'generated-guard'], {
    cwd: root,
    env,
    input: JSON.stringify(edit(root, 'docs/api.md')),
    encoding: 'utf8',
    timeout: 25000,
  })
  const elapsed = Date.now() - started

  assert.equal(run.status, 0)
  assert.equal(run.stdout, '')
  assert.ok(elapsed < 10000, `the hook took ${elapsed} ms`)
})
