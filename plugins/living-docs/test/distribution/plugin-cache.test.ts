import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { toolkitRoot } from '../../plugin/src/core/roots.ts'

/**
 * Simulation of the marketplace cache: Claude Code copies only the plugin
 * directory, installs dependencies from the lockfile that is in it and runs the
 * hooks from there. Nothing from the rest of the checkout arrives (findings 2 to 4
 * of the ownership core research).
 */
const PACKAGE_ROOT = toolkitRoot()

/** Minimal validated repository: an append-only family that living-docs/append-only guards. */
const OWNERSHIP = [
  'version: 2',
  'plugins: [living-docs]',
  'owned:',
  '  - path: docs/decisions/adr/',
  "    owner: '@team'",
  '    skill: decision-recorder',
  '    states: [draft, accepted, superseded]',
  '    living-docs: { id-prefix: ADR, append-only: true, mutable-fields: [status, superseded-by, last-reviewed] }',
  '',
].join('\n')

const PAYLOAD = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'docs/decisions/adr/ADR-0001.md' } })

/**
 * On Windows, the `bash` on PATH may be the WSL one, which does not see `C:\…`.
 * Claude Code runs hooks in the Git for Windows bash, and that is the one used here.
 */
function bashExecutable(): string | null {
  if (process.platform !== 'win32') {
    return 'bash'
  }
  const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')

  return existsSync(candidate) ? candidate : null
}

/** Copies only what git versions in the package, as the cache does with the plugin. */
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

  // Nothing from the checkout environment may help the hook find itself.
  delete env.LIVING_DOCS_TOOLKIT_ROOT
  delete env.LIVING_DOCS_REPO_ROOT

  // Absolute path with `/`: bash `dirname` does not understand `\`. The cwd is the
  // project, as in Claude Code, and not the cache: a wrapper that found itself through the
  // cwd would fail here.
  const script = join(cache, 'hooks', 'run-hook.sh').split(sep).join('/')
  const run = spawnSync(bash, [script, 'append-only'], { cwd: project, env, input: PAYLOAD, encoding: 'utf8' })

  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

test('RNF-0002: the hooks wrapper reaches whoever installs it as executable', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('RNF-0002: copied alone into the cache, without dependencies the hook stays silent and exits with 0', { timeout: 60_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('without the Git for Windows bash: CI (ubuntu) runs this proof')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'living-docs-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'living-docs-project-'))

  try {
    assert.ok(copyVersioned(cache) > 50, 'copy too empty: the cache did not receive the plugin')
    assert.equal(existsSync(join(cache, 'node_modules')), false)
    writeFileSync(join(project, '.ownership.yml'), OWNERSHIP, 'utf8')

    const withoutDependencies = runHook(bash, cache, project)

    assert.equal(withoutDependencies.status, 0, 'fail open: exit 0 even when broken')
    assert.equal(withoutDependencies.stdout.trim(), '', 'without node_modules the hook should stay silent')
  } finally {
    rmSync(cache, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})

// TDR-0003: in the marketplace cache `file:../../ownership/plugin` points at a
// directory that does not exist, `npm ci` fails and the hook can only fail open.
// The proof that it responds returns when @esliph/ownership is on npm and the
// dependency is a semver range from the registry.
test.todo('RNF-0002: copied alone into the cache, the plugin installs and the hook responds from there — waits for the core to be published on npm')
