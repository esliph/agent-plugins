import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

/**
 * Simulação do cache do marketplace: o Claude Code copia só o diretório do
 * plugin, instala dependências a partir do lockfile que está nele e roda os
 * hooks de lá. Nada do resto do checkout chega (achados 2 a 4 da pesquisa do
 * núcleo de ownership).
 */
const PACKAGE_ROOT = toolkitRoot()

/** Repositório validado mínimo: uma regra de `watches` que o HK-4 lembra. */
const OWNERSHIP = [
  'version: 2',
  'plugins: [living-docs]',
  'owned:',
  '  - path: docs/requirements/rules.md',
  "    owner: '@time'",
  '    skill: requirements-keeper',
  '    states: [draft, active, revoked]',
  '    format: { collection: sections, key: first-token }',
  '    living-docs: { id-prefix: RN }',
  'watches:',
  "  - code: 'src/domain/**'",
  '    doc: docs/requirements/rules.md',
  "    reason: 'comportamento novo exige regra antes do código'",
  '',
].join('\n')

const PAYLOAD = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'src/domain/reembolso.ts' } })

/**
 * No Windows, o `bash` do PATH pode ser o do WSL, que não enxerga `C:\…`. O
 * Claude Code roda hooks no bash do Git for Windows, e é esse que se usa aqui.
 */
function bashExecutable(): string | null {
  if (process.platform !== 'win32') {
    return 'bash'
  }
  const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')

  return existsSync(candidate) ? candidate : null
}

/** Copia só o que o git versiona no pacote, como o cache faz com o plugin. */
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

  // Nada do ambiente do checkout pode ajudar o hook a se achar.
  delete env.LIVING_DOCS_TOOLKIT_ROOT
  delete env.LIVING_DOCS_REPO_ROOT

  // Caminho absoluto com `/`: `dirname` do bash não entende `\`. O cwd é o
  // projeto, como no Claude Code, e não o cache: um wrapper que se achasse pelo
  // cwd reprovaria aqui.
  const script = join(cache, 'hooks', 'run-hook.sh').split(sep).join('/')
  const run = spawnSync(bash, [script, 'hk4-watch-reminder'], { cwd: project, env, input: PAYLOAD, encoding: 'utf8' })

  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

test('RNF-0002: o wrapper de hooks chega a quem instala como executável', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('RNF-0002: copiado sozinho para o cache, sem dependências o hook se cala e sai com 0', { timeout: 60_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('sem o bash do Git for Windows: o CI (ubuntu) roda esta prova')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'living-docs-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'living-docs-projeto-'))

  try {
    assert.ok(copyVersioned(cache) > 50, 'cópia vazia demais: o cache não recebeu o plugin')
    assert.equal(existsSync(join(cache, 'node_modules')), false)
    writeFileSync(join(project, '.ownership.yml'), OWNERSHIP, 'utf8')

    const semDependencias = runHook(bash, cache, project)

    assert.equal(semDependencias.status, 0, 'falha aberta: exit 0 mesmo quebrado')
    assert.equal(semDependencias.stdout.trim(), '', 'sem node_modules o hook deveria se calar')
  } finally {
    rmSync(cache, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})

// TDR-0003: no cache do marketplace o `file:../ownership` aponta para um
// diretório que não existe, o `npm ci` falha e o hook só pode falhar aberto.
// A prova de que ele responde volta quando @esliph/ownership estiver no npm e a
// dependência for uma faixa semver do registro.
test.todo('RNF-0002: copiado sozinho para o cache, o plugin instala e o hook responde de lá — espera a publicação do núcleo no npm')
