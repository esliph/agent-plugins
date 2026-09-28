import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
const config = loadLivingDocsConfig(ROOT)

/** Os itens de `## [Unreleased]` — o mesmo critério do check do núcleo, que não o exporta. */
function unreleasedEntries(source: string): string[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(line => /^##\s+\[?unreleased\]?/i.test(line.trim()))

  if (start === -1) {
    return []
  }

  const entries: string[] = []

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? ''

    if (/^##\s/.test(line)) {
      break
    }
    if (/^\s*[-*]\s+\S/.test(line)) {
      entries.push(line.trim())
    }
  }

  return entries
}

test('RN-0013: este repositório declara o que é visível ao consumidor', () => {
  const codigos = config.watches.filter(watch => watch.consumerVisible).map(watch => watch.code)

  assert.ok(codigos.length > 0, 'nenhuma regra de watches marcada consumer-visible: o cobrador do CHANGELOG estaria instalado e inerte')
  assert.ok(codigos.includes('bin/**'))
  assert.ok(codigos.includes('packages/living-docs/src/cli/**'))

  // O pacote é o plugin, mas só a superfície do plugin é pública: a lista é
  // explícita, e um curinga no pacote inteiro puxaria src/ e test/.
  const visivel = picomatch(codigos)

  for (const path of [
    'packages/living-docs/.claude-plugin/plugin.json',
    'packages/living-docs/hooks/run-hook.sh',
    'packages/living-docs/commands/adr.md',
    'packages/living-docs/skills/decision-recorder/SKILL.md',
    'packages/living-docs/agents/decision-adversary.md',
    'packages/living-docs/templates/adr.md',
    'packages/living-docs/src/cli/index.ts',
  ]) {
    assert.ok(visivel(path), `${path} deveria ser visível ao consumidor`)
  }
  for (const path of ['packages/living-docs/src/core/roots.ts', 'packages/living-docs/test/smoke.test.ts', 'packages/living-docs/package.json']) {
    assert.equal(visivel(path), false, `${path} não é superfície pública`)
  }
})

test('ADR-0006: alguma regra de watches diz onde a entrada deveria estar', () => {
  const alvos = new Set(config.watches.filter(watch => watch.consumerVisible).map(watch => watch.doc))

  assert.deepEqual([...alvos], ['CHANGELOG.md'])
})

test('RN-0013: o CHANGELOG é voltado ao consumidor — Keep a Changelog, sem frontmatter', () => {
  const source = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8')

  assert.doesNotMatch(source, /^---$/m, 'frontmatter de documentação viva não pertence ao CHANGELOG')
  assert.match(source, /^## \[Unreleased\]$/m)
  assert.ok(unreleasedEntries(source).length > 0, 'a Fase 6 muda o contrato público: Unreleased não pode estar vazio')
})

test('RN-0015: a tabela de depreciações cobra as quatro coisas', () => {
  const source = readFileSync(join(ROOT, 'docs/deprecations.md'), 'utf8')
  const header = source.split('\n').find(line => line.trim().startsWith('| O que |'))

  assert.ok(header, 'docs/deprecations.md sem a tabela')
  for (const coluna of ['Anunciado em', 'Removido em', 'Substituto', 'Guia de migração']) {
    assert.ok(header.includes(coluna), `a tabela precisa da coluna "${coluna}"`)
  }
})

test('RN-0001: o rastro histórico tem dono no CODEOWNERS, como todo artefato', () => {
  const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8')

  for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/releases/', 'docs/migrations/']) {
    assert.match(codeowners, new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+@\\S+$`, 'm'), `${path} sem dono`)
  }
})

test('REL está declarado, para que HK-1 congele release note publicada', () => {
  const rel = config.artifacts.find(artifact => artifact.idPrefix === 'REL')

  assert.ok(rel)
  assert.equal(rel?.appendOnly, true)
  assert.equal(rel?.skill, 'release-historian')
})

test('RN-0030: este repositório marca como externo o que escreve para quem vem de fora', () => {
  for (const path of ['README.md', 'CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
    assert.equal(config.documents.find(document => document.path === path)?.audience, 'external', `${path} deveria estar marcado`)
  }
  assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')

  // docs/contracts/ fica de fora: cita as próprias fontes, e marcá-lo é decisão própria.
  for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md']) {
    assert.equal(config.documents.find(document => document.path === path)?.audience, 'internal', `${path} não é marcado por esta entrega`)
  }
})
