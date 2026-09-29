import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'

/**
 * Simulation of the marketplace cache: Claude Code copies only the plugin
 * directory, installs dependencies from the lockfile inside it and runs the
 * hooks from there. The core depends on no sibling package, and that is why
 * it works on its own in the cache.
 */
const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

const OWNERSHIP = [
  'version: 2',
  'owned:',
  '  - path: docs/requirements/rules.md',
  "    owner: '@team'",
  'watches:',
  "  - code: 'src/domain/**'",
  '    doc: docs/requirements/rules.md',
  "    reason: 'new behavior requires a rule before the code'",
  '',
].join('\n')

const PAYLOAD = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'src/domain/refund.ts' } })

/** On Windows, the `bash` on PATH may be the WSL one; Claude Code uses the Git for Windows one. */
function bashExecutable(): string | null {
  if (process.platform !== 'win32') {
    return 'bash'
  }
  const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')

  return existsSync(candidate) ? candidate : null
}

function copyVersioned(to: string): number {
  const files = execFileSync('git', ['ls-files', '-z', '--', '.'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(file => file !== '')

  for (const file of files) {
    mkdirSync(dirname(join(to, file)), { recursive: true })
    copyFileSync(join(PACKAGE_ROOT, file), join(to, file))
  }

  return files.length
}

function runHook(bash: string, cache: string, project: string): { status: number | null; stdout: string; stderr: string } {
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: project }

  delete env.OWNERSHIP_REPO_ROOT
  delete env.NODE_OPTIONS

  const script = join(cache, 'hooks', 'run-hook.sh').split(sep).join('/')
  const run = spawnSync(bash, [script, 'watch-reminder'], { cwd: project, env, input: PAYLOAD, encoding: 'utf8' })

  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

test('the core hooks wrapper reaches whoever installs it as executable', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('copied alone into the cache, the core plugin installs and the hook answers from there', { timeout: 180_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('no Git for Windows bash: the CI (ubuntu) runs this proof')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'ownership-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'ownership-project-'))

  try {
    assert.ok(copyVersioned(cache) > 30, 'copy too empty: the cache did not receive the plugin')
    assert.equal(existsSync(join(cache, 'node_modules')), false)
    writeFileSync(join(project, '.ownership.yml'), OWNERSHIP, 'utf8')

    // Control: without dependencies the hook breaks and, by contract, stays silent.
    const withoutDependencies = runHook(bash, cache, project)

    assert.equal(withoutDependencies.status, 0, 'fails open: exit 0 even when broken')
    assert.equal(withoutDependencies.stdout.trim(), '', 'without node_modules the hook should stay silent')

    const install = spawnSync('npm', ['ci', '--ignore-scripts'], { cwd: cache, encoding: 'utf8', shell: true })

    assert.equal(install.status, 0, install.stderr)

    const run = runHook(bash, cache, project)

    assert.equal(run.status, 0, run.stderr)
    assert.notEqual(run.stdout.trim(), '', 'empty output is what a broken hook also produces: it is not success')

    const output = JSON.parse(run.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } }

    assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse')
    assert.match(output.hookSpecificOutput.additionalContext, /docs\/requirements\/rules\.md/)
  } finally {
    rmSync(cache, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})
