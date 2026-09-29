import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'

/**
 * Simulação do cache do marketplace: o Claude Code copia só o diretório do
 * plugin, instala dependências a partir do lockfile que está nele e roda os
 * hooks de lá. O núcleo não depende de pacote irmão nenhum, e por isso
 * funciona sozinho no cache.
 */
const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

const OWNERSHIP = [
  'version: 2',
  'owned:',
  '  - path: docs/requirements/rules.md',
  "    owner: '@time'",
  'watches:',
  "  - code: 'src/domain/**'",
  '    doc: docs/requirements/rules.md',
  "    reason: 'comportamento novo exige regra antes do código'",
  '',
].join('\n')

const PAYLOAD = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'src/domain/reembolso.ts' } })

/** No Windows, o `bash` do PATH pode ser o do WSL; o Claude Code usa o do Git for Windows. */
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

test('o wrapper de hooks do núcleo chega a quem instala como executável', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('copiado sozinho para o cache, o plugin do núcleo instala e o hook responde de lá', { timeout: 180_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('sem o bash do Git for Windows: o CI (ubuntu) roda esta prova')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'ownership-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'ownership-projeto-'))

  try {
    assert.ok(copyVersioned(cache) > 30, 'cópia vazia demais: o cache não recebeu o plugin')
    assert.equal(existsSync(join(cache, 'node_modules')), false)
    writeFileSync(join(project, '.ownership.yml'), OWNERSHIP, 'utf8')

    // Controle: sem dependências o hook quebra e, por contrato, se cala.
    const semDependencias = runHook(bash, cache, project)

    assert.equal(semDependencias.status, 0, 'falha aberta: exit 0 mesmo quebrado')
    assert.equal(semDependencias.stdout.trim(), '', 'sem node_modules o hook deveria se calar')

    const install = spawnSync('npm', ['ci', '--ignore-scripts'], { cwd: cache, encoding: 'utf8', shell: true })

    assert.equal(install.status, 0, install.stderr)

    const run = runHook(bash, cache, project)

    assert.equal(run.status, 0, run.stderr)
    assert.notEqual(run.stdout.trim(), '', 'saída vazia é o que um hook quebrado também produz: não é sucesso')

    const output = JSON.parse(run.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } }

    assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse')
    assert.match(output.hookSpecificOutput.additionalContext, /docs\/requirements\/rules\.md/)
  } finally {
    rmSync(cache, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})
