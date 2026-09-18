import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontmatter } from '../../src/frontmatter/parse.ts'
import { toolkitRoot } from '../../src/core/roots.ts'

const ROOT = toolkitRoot()

/**
 * Varredura, não lista fixa: uma skill nova precisa entrar nas convenções da
 * spec §11 no dia em que nasce, sem ninguém lembrar de acrescentá-la aqui.
 */
const SKILLS = readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

function skillSource(name: string): string {
  return readFileSync(join(ROOT, 'skills', name, 'SKILL.md'), 'utf8')
}

test('há skills para verificar', () => {
  assert.ok(SKILLS.length >= 3, `esperava ao menos 3 skills, achei ${SKILLS.length}`)
})

for (const name of SKILLS) {
  test(`${name}: frontmatter com name casando com o diretório e description`, () => {
    const frontmatter = parseFrontmatter(skillSource(name))

    assert.ok(frontmatter, `${name} sem frontmatter`)
    assert.equal(frontmatter.data.name, name)
    assert.equal(typeof frontmatter.data.description, 'string')
  })

  test(`${name}: a description é escrita em linguagem de sintoma, não de categoria`, () => {
    const description = String(parseFrontmatter(skillSource(name))?.data.description ?? '')

    assert.ok(description.length > 120, `${name}: description curta demais para ser encontrada quando importa`)
    assert.match(description, /\bUse\b/i, `${name}: a description precisa dizer quando usar`)
  })

  test(`${name}: as seções da spec §11 estão presentes e na ordem`, () => {
    const source = skillSource(name)
    const secoes = ['## Overview', '## Do que você é dono', '## Quando usar / quando não', '## Procedimento', '## Fronteiras', '## Checklist']
    let cursor = -1

    for (const secao of secoes) {
      const at = source.indexOf(secao)

      assert.ok(at !== -1, `${name}: seção ausente — ${secao}`)
      assert.ok(at > cursor, `${name}: seção fora de ordem — ${secao}`)
      cursor = at
    }
  })

  test(`${name}: o checklist tem caixas marcáveis e cada uma nomeia sua verificação`, () => {
    const source = skillSource(name)
    const checklist = source.slice(source.indexOf('## Checklist'))
    const itens = checklist.split('\n').filter(line => line.trim().startsWith('- [ ]'))

    assert.ok(itens.length >= 6, `${name}: checklist com apenas ${itens.length} itens`)
    for (const item of itens) {
      // "human" casa tanto "humano" quanto "humana" — a concordância de gênero em
      // português ("verificação humana") não deve ser tratada como item sem verificação.
      assert.match(item, /CI-\d|HK-\d|human/i, `${name}: item sem verificação nomeada — ${item}`)
    }
  })
}

test('decision-recorder: a description nomeia os sintomas de decisão, lacuna e dívida', () => {
  const description = String(parseFrontmatter(skillSource('decision-recorder'))?.data.description ?? '')

  assert.match(description, /Use quando/i)
  for (const sintoma of ['por que', 'lacuna', 'dívida']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`)
  }
})

test('decision-recorder não duplica o conteúdo dos artefatos que governa', () => {
  const source = skillSource('decision-recorder')

  assert.doesNotMatch(source, /^## Contexto$/m, 'a skill não deve conter o template do ADR')
  assert.match(source, /templates\/adr\.md/, 'ela deve apontar para o template, não copiá-lo')
})

test('requirements-keeper: a description fala em sintoma, não em categoria', () => {
  const description = String(parseFrontmatter(skillSource('requirements-keeper'))?.data.description ?? '')

  assert.ok(description.length > 120)
  for (const sintoma of ['qual é a regra', 'deve fazer', 'especificad']) {
    assert.ok(description.toLowerCase().includes(sintoma), `description sem o sintoma "${sintoma}"`)
  }
})

test('requirements-keeper não duplica o formato do requisito', () => {
  const source = skillSource('requirements-keeper')

  assert.match(source, /templates\/requirements\.md/)
  assert.doesNotMatch(source, /^- \*\*status:\*\*/m, 'a skill não deve conter o template do requisito')
})

test('os sete comandos existem, têm description e não contêm lógica própria', () => {
  const esperados = ['adr.md', 'open-decision.md', 'debt.md', 'docs-setup.md', 'docs-audit.md', 'term.md', 'release.md']
  const encontrados = readdirSync(join(ROOT, 'commands')).sort()

  assert.deepEqual(encontrados, esperados.sort())

  for (const nome of esperados) {
    const source = readFileSync(join(ROOT, 'commands', nome), 'utf8')
    const frontmatter = parseFrontmatter(source)

    assert.ok(frontmatter, `${nome} sem frontmatter`)
    assert.equal(typeof frontmatter.data.description, 'string')
    assert.ok(source.split('\n').length < 25, `${nome} é longo demais para um atalho fino`)
    // docs-audit invoca agent, não skill; outros invocam skill
    const pattern = nome === 'docs-audit.md' ? /docs-divergence-auditor/ : /decision-recorder|living-docs-bootstrap|glossary-keeper|release-historian/

    assert.match(source, pattern, `${nome} deve apontar ao agente ou skill que aciona`)
  }
})

test('glossary-keeper: a description nomeia os sintomas de termo novo, ambíguo ou renomeado', () => {
  const description = String(parseFrontmatter(skillSource('glossary-keeper'))?.data.description ?? '')

  assert.match(description, /Use quando/i)
  for (const sintoma of ['termo', 'renome']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`)
  }
})

test('glossary-keeper não duplica o formato da tabela que governa', () => {
  const source = skillSource('glossary-keeper')

  assert.doesNotMatch(source, /\| Termo exemplo \|/, 'a skill não deve conter a linha de exemplo do template')
  assert.match(source, /templates\/glossary\.md/, 'ela deve apontar para o template, não copiá-lo')
})

test('charter-keeper: a description nomeia princípio, visão e emenda', () => {
  const description = String(parseFrontmatter(skillSource('charter-keeper'))?.data.description ?? '')

  assert.match(description, /Use quando/i)
  for (const sintoma of ['princípio', 'visão']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`)
  }
})

test('charter-keeper não duplica o conteúdo dos artefatos que governa', () => {
  const source = skillSource('charter-keeper')

  // Título de seção, não menção em prosa: é o corpo da Constitution que não
  // pode ser copiado para cá, e é ele que começa a linha com `## `.
  assert.doesNotMatch(source, /^## Log de emendas/m, 'a skill não deve conter o corpo da Constitution')
  assert.doesNotMatch(source, /^## Princípios/m, 'a skill não deve conter os princípios deste repositório')
  assert.match(source, /templates\/constitution\.md/, 'ela deve apontar para o template, não copiá-lo')
  assert.match(source, /templates\/vision\.md/, 'os dois templates, porque são dois artefatos')
})

test('working-agreements-keeper: a description nomeia o erro por falta de contexto', () => {
  const description = String(parseFrontmatter(skillSource('working-agreements-keeper'))?.data.description ?? '')

  assert.match(description, /Use quando/i)
  for (const sintoma of ['falta de contexto', 'não estava escrito', 'pronto']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`)
  }
})

test('working-agreements-keeper não duplica o conteúdo dos acordos que governa', () => {
  const source = skillSource('working-agreements-keeper')

  assert.match(source, /templates\/definition-of-done\.md/, 'ela deve apontar para o template, não copiá-lo')
  assert.doesNotMatch(source, /^- \[ \] `npm test`/m, 'a skill não deve conter a DoD')
})

test('contract-keeper: a description nomeia interface pública, erro novo e versionamento', () => {
  const description = String(parseFrontmatter(skillSource('contract-keeper'))?.data.description ?? '')

  assert.match(description, /Use quando/i)
  for (const sintoma of ['contrato', 'erro', 'gerad']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`)
  }
})

test('contract-keeper não duplica o conteúdo dos artefatos que governa', () => {
  const source = skillSource('contract-keeper')

  assert.match(source, /templates\/errors\.md/, 'ela deve apontar para o template, não copiá-lo')
  assert.match(source, /templates\/versioning-policy\.md/, 'os dois templates, porque são dois artefatos')
  assert.doesNotMatch(source, /^\| EXIT-\d/m, 'a skill não deve conter o catálogo deste repositório')
  assert.doesNotMatch(source, /^## O que é público/m, 'nem a política deste repositório')
})

test('release-historian: a description nomeia os sintomas de mudança visível, versão e depreciação', () => {
  const description = String(parseFrontmatter(skillSource('release-historian'))?.data.description ?? '')

  assert.match(description, /Use quando/i)
  for (const sintoma of ['consome', 'versão', 'migr', 'depreci']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`)
  }
})

test('release-historian não duplica o conteúdo dos artefatos que governa', () => {
  const source = skillSource('release-historian')

  assert.match(source, /templates\/changelog\.md/, 'ela deve apontar para o template, não copiá-lo')
  assert.match(source, /templates\/migration\.md/, 'os quatro templates, porque são quatro artefatos')
  assert.doesNotMatch(source, /^## \[Unreleased\]$/m, 'a skill não deve conter o CHANGELOG deste repositório')
})

test('a SK-0 não manda escolher estágio que o CLI rejeita', () => {
  const source = skillSource('living-docs-bootstrap')

  for (const stage of ['solo', 'small-team', 'production', 'multi-team']) {
    assert.ok(source.includes(stage), `a SK-0 precisa nomear o estágio \`${stage}\` como o CLI o chama`)
  }
})

test('RN-0030: release-historian não pede que o guia de migração aponte o ADR pelo ID', () => {
  const source = skillSource('release-historian')

  assert.doesNotMatch(source, /apontando o ADR/, 'o guia é lido por quem vem de fora: o porquê vai em texto corrido')
  assert.match(source, /commit que cria o guia cita o ADR/, 'o vínculo passa a morar no commit')
  assert.match(source, /CI-11/, 'o checklist nomeia quem verifica')
})

test('RN-0030: o template de migração pede o porquê em texto corrido, não o ID do ADR', () => {
  const template = readFileSync(join(ROOT, 'templates/migration.md'), 'utf8')

  assert.doesNotMatch(template, /O ADR que decidiu\./)
  assert.match(template, /commit que cria o guia cita o ADR/)
})
