import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const CLI = 'node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts"'

function command(name: string): string {
  return readFileSync(join(PLUGIN_ROOT, 'commands', `${name}.md`), 'utf8')
}

test('RF-0022: the foundation commands go through the command line', () => {
  assert.ok(command('init').includes(`${CLI} init`))
  assert.ok(command('capability').includes(`${CLI} capability add`))
  assert.match(command('capability'), /never .*by hand/i)
  for (const name of ['constitution', 'glossary']) {
    assert.match(command(name), /^description: /m, name)
  }
})

test('RF-0022: the pointer to the agent context file is offered, and written only on a yes', () => {
  assert.match(command('init'), /CLAUDE\.md/)
  assert.match(command('init'), /only (?:if|when|on)/i)
})

test('RF-0024: the capability command allocates the next ID through the command line, never from memory', () => {
  assert.ok(command('capability').includes(`${CLI} id next <CAP>`))
  assert.match(command('capability'), /never type an ID from memory/i)
  assert.match(command('capability'), /^argument-hint: .*next <CAP>/m)
})

test('RF-0023: the EARS utilities exist, and the lint one runs the command line', () => {
  assert.ok(command('ears-lint').includes(`${CLI} lint`))
  assert.match(command('ears-convert'), /\[NEEDS CLARIFICATION\]/)
  assert.match(command('ears-explain'), /^description: /m)
})

test('RNF-0008: the plugin declares no dependency and no build output', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; engines?: { node?: string } }

  assert.equal(manifest.dependencies, undefined)
  assert.equal(manifest.engines?.node, '>=24')
  assert.equal(existsSync(join(PLUGIN_ROOT, 'dist')), false)
  assert.equal(existsSync(join(PLUGIN_ROOT, 'package-lock.json')), false)
})

// The marketplace cache receives the plugin directory alone, with no
// `node_modules` beside or above it.
test('RNF-0008: copied alone, with nothing installed, the command line runs', () => {
  const cache = mkdtempSync(join(tmpdir(), 'kanon-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'kanon-project-'))
  const env: NodeJS.ProcessEnv = { ...process.env }

  delete env.KANON_REPO_ROOT
  delete env.NODE_OPTIONS
  delete env.NODE_PATH

  try {
    cpSync(PLUGIN_ROOT, cache, { recursive: true, filter: source => !source.includes('node_modules') })

    const cli = join(cache, 'src', 'cli', 'index.ts')
    const run = (...args: string[]) => spawnSync('node', [cli, ...args], { cwd: project, env, encoding: 'utf8' })
    const init = run('init')

    assert.equal(init.status, 0, init.stderr)
    assert.equal(run('capability', 'add', 'CHK', 'checkout').status, 0)
    assert.equal(run('id', 'next', 'CHK').stdout, 'CHK-001\n')
    assert.match(run('lint').stdout, /kanon: no findings\./)
  } finally {
    rmSync(cache, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})
