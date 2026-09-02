import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { repoRoot, templatesDir, toolkitRoot } from '../../src/core/roots.ts'

test('toolkitRoot aponta para o checkout do toolkit', () => {
  assert.ok(existsSync(join(toolkitRoot(), 'package.json')))
  assert.ok(existsSync(join(templatesDir(), 'adr.md')))
})

test('RNF-0003: repoRoot respeita LIVING_DOCS_REPO_ROOT e não move toolkitRoot', () => {
  const antes = toolkitRoot()
  const anterior = process.env.LIVING_DOCS_REPO_ROOT
  // Caminho derivado do sistema, não escrito à mão: `repoRoot()` resolve, e um
  // caminho POSIX literal vira `C:\...` no Windows.
  const outro = join(tmpdir(), 'outro-projeto')

  process.env.LIVING_DOCS_REPO_ROOT = outro
  try {
    assert.equal(repoRoot(), resolve(outro))
    assert.equal(toolkitRoot(), antes, 'a raiz do toolkit não pode seguir a do repositório (ADR-0003)')
  } finally {
    if (anterior === undefined) {
      delete process.env.LIVING_DOCS_REPO_ROOT
    } else {
      process.env.LIVING_DOCS_REPO_ROOT = anterior
    }
  }
})

test('RNF-0003: nenhum caminho absoluto de container está embutido em src/ ou test/', () => {
  // Montados por concatenação de propósito: escrito inteiro, este array
  // reprovaria o próprio arquivo que o contém.
  const proibidos = ['/' + 'app', '/' + 'workspace', '/' + 'opt/living-docs']
  const ofensas: string[] = []

  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(toolkitRoot(), dir))) {
      const relative = `${dir}/${entry}`

      if (statSync(join(toolkitRoot(), relative)).isDirectory()) {
        walk(relative)
        continue
      }
      if (!entry.endsWith('.ts')) {
        continue
      }
      const source = readFileSync(join(toolkitRoot(), relative), 'utf8')

      for (const proibido of proibidos) {
        if (source.includes(`'${proibido}`) || source.includes(`"${proibido}`)) {
          ofensas.push(`${relative}: ${proibido}`)
        }
      }
    }
  }

  walk('src')
  walk('test')
  assert.deepEqual(ofensas, [], 'caminho de container só pode aparecer em Dockerfile, compose e wrappers (ADR-0003)')
})

test('RNF-0003: sem variável nenhuma, cada raiz vem da sua própria fonte', () => {
  // Substitui a antiga asserção "o container declara as duas raízes", que lia
  // do ambiente duas variáveis que só existiam porque o compose as injetava.
  // O que ADR-0003 de fato exige sobrevive à saída do container: o toolkit se
  // acha pelo próprio arquivo, e o repositório validado é o cwd de quem chamou.
  const anteriorRepo = process.env.LIVING_DOCS_REPO_ROOT
  const anteriorToolkit = process.env.LIVING_DOCS_TOOLKIT_ROOT

  delete process.env.LIVING_DOCS_REPO_ROOT
  delete process.env.LIVING_DOCS_TOOLKIT_ROOT
  try {
    // Este arquivo está dois níveis abaixo da raiz, exatamente como
    // `src/core/roots.ts`: a derivação é a mesma, e é ela que se afirma.
    assert.equal(toolkitRoot(), resolve(join(import.meta.dirname, '..', '..')))
    assert.equal(repoRoot(), resolve(process.cwd()))
  } finally {
    if (anteriorRepo !== undefined) {
      process.env.LIVING_DOCS_REPO_ROOT = anteriorRepo
    }
    if (anteriorToolkit !== undefined) {
      process.env.LIVING_DOCS_TOOLKIT_ROOT = anteriorToolkit
    }
  }
})
