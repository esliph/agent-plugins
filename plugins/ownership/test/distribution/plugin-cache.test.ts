import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { runCli } from '../helpers/cli.ts'
import { bashExecutable, runHook } from '../helpers/hook.ts'
import { tempRepo } from '../helpers/repo.ts'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const OWNERSHIP = "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\ngenerated:\n  - path: docs/api.md\n    command: node tools/gen.mjs\n"

/** What Git would hand over of the distributed directory: tracked files and new ones no .gitignore excludes. */
function distributedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.'], { cwd: PLUGIN_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(file => file !== '')
}

test('the hooks wrapper is versioned as executable', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PLUGIN_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('the distributed directory carries the plugin and nothing of the project around it', () => {
  const files = distributedFiles()

  for (const needed of [
    '.claude-plugin/plugin.json',
    'hooks/hooks.json',
    'hooks/run-hook.sh',
    'commands/init.md',
    'ownership.schema.json',
    'package.json',
    'package-lock.json',
    'src/index.ts',
  ]) {
    assert.ok(files.includes(needed), `${needed} is missing from the distributed directory`)
  }

  assert.deepEqual(
    files.filter(file => /^(?:test|docs|dist|node_modules)\//.test(file) || /\.test\.ts$/.test(file)),
    [],
  )
})

test('copied alone into the plugin cache, the plugin installs from its lockfile and the hook and the CLI answer from there', { timeout: 300_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('no Git for Windows bash on this machine; CI (ubuntu) runs this proof')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'ownership-cache-'))
  const project = tempRepo(t, { '.ownership.yml': OWNERSHIP, 'docs/api.md': 'api\n' })
  const payload = { tool_name: 'Edit', tool_input: { file_path: join(project, 'docs', 'api.md') } }

  t.after(() => rmSync(cache, { recursive: true, force: true }))

  for (const file of distributedFiles()) {
    mkdirSync(dirname(join(cache, file)), { recursive: true })
    copyFileSync(join(PLUGIN_ROOT, file), join(cache, file))
  }

  assert.equal(existsSync(join(cache, 'node_modules')), false)

  // Control: without its dependency the hook cannot run and, by contract, stays silent.
  const before = runHook(bash, 'generated-guard', payload, { project, pluginRoot: cache })

  assert.equal(before.status, 0)
  assert.equal(before.stdout, '')

  const install = spawnSync('npm ci --ignore-scripts --omit=dev --no-audit --no-fund', { cwd: cache, encoding: 'utf8', shell: true })

  assert.equal(install.status, 0, install.stderr)

  const after = runHook(bash, 'generated-guard', payload, { project, pluginRoot: cache })

  assert.equal(after.status, 0, after.stderr)
  assert.equal((JSON.parse(after.stdout) as { hookSpecificOutput: { permissionDecision: string } }).hookSpecificOutput.permissionDecision, 'deny')

  const cli = spawnSync(process.execPath, [join(cache, 'src', 'cli', 'index.ts'), 'explain', 'docs/api.md'], { cwd: project, encoding: 'utf8' })

  assert.equal(cli.status, 0, cli.stderr)
  assert.equal(cli.stdout, runCli(['explain', 'docs/api.md'], { cwd: project }).stdout)
})
