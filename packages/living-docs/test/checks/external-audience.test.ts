import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsExternalAudience } from '../../src/checks/external-audience.ts'
import type { Finding } from '../../src/core/types.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

// ADR, RN e REL são internos porque estão declarados. TDR, de propósito, não
// está: é o caso do projeto que ainda não instalou a família.
const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
  - path: docs/releases/
    owner: "@time"
    skill: release-historian
    states: [draft, published]
    living-docs: { id-prefix: REL, audience: external }
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
    living-docs: { audience: external }
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
    living-docs: {}
`

function findingsFor(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []

  withTempRepo(files, root => {
    const config = configFrom(OWNERSHIP)

    findings = livingDocsExternalAudience.run({
      root,
      config,
      docs: collectArtifacts(root, config),
      documents: collectDocuments(root, config),
      today: '2026-09-15',
    })
  })

  return findings
}

const changelog = (...entries: string[]): string => ['# Changelog', '', '## [Unreleased]', '', ...entries, ''].join('\n')

const releaseNote = (frontmatterExtra: string[], body: string[]): string =>
  [
    '---',
    'id: REL-0001',
    'title: v1.0.0',
    'status: draft',
    'owner: "@time"',
    'trigger: Nunca. Congelada depois de publicada.',
    ...frontmatterExtra,
    'last-reviewed: 2026-09-15',
    '---',
    '',
    ...body,
    '',
  ].join('\n')

test('RN-0030: ID de artefato em prosa, em documento externo, reprova na linha certa', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- A regra RN-0001 passa a valer.') })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/external-audience')
  assert.equal(findings[0]?.severity, 'error')
  assert.equal(findings[0]?.file, 'CHANGELOG.md')
  assert.equal(findings[0]?.line, 5)
  assert.match(findings[0]?.message ?? '', /RN-0001/)
})

test('RN-0030: ID entre crases reprova — marcação inline não esconde o que o leitor vê', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- Decidido em `ADR-0003`.') })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0003/)
})

test('RN-0030: ID só no caminho de um link reprova, mesmo fora do texto renderizado', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- Veja [a decisão](docs/decisions/adr/ADR-0003-duas-raizes.md).') })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0003/)
})

test('RN-0030: ID dentro de bloco de código cercado passa — é exemplo', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('```text', 'RN-0001', '```') }), [])
})

test('RN-0030: ID só no frontmatter de um artefato externo passa — é contrato de máquina', () => {
  const nota = releaseNote(['relates-to: [ADR-0003]'], ['# v1.0.0', '', 'Nada muda para quem usa.'])

  assert.deepEqual(findingsFor({ 'docs/releases/REL-0001-v1.md': nota }), [])
})

test('RN-0030: identificador da interface pública citado em documento externo passa', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('- `living-docs/external-audience` reprova, `living-docs/session-inventory` avisa, e o código de saída é `EXIT-2`.') }), [])
})

test('RN-0030: o mesmo ID em documento interno passa', () => {
  assert.deepEqual(findingsFor({ 'CONTRIBUTING.md': '# Como se contribui\n\nA regra RN-0001 e o `ADR-0003`.\n' }), [])
})

test('RN-0030: ID de prefixo não declarado em artifacts: passa — o check não conhece prefixo nenhum', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('- Paga a `TDR-0001` e segue a ISO-8601.') }), [])
})

test('RN-0030: num documento com frontmatter, a linha reportada é a do arquivo', () => {
  const nota = releaseNote([], ['# v1.0.0', '', 'Corrige o que RN-0001 exigia.'])
  const findings = findingsFor({ 'docs/releases/REL-0001-v1.md': nota })

  // 8 linhas de frontmatter, uma em branco, o título, outra em branco: linha 12.
  assert.equal(findings.length, 1, 'o id: REL-0001 do frontmatter não pode virar achado')
  assert.equal(findings[0]?.file, 'docs/releases/REL-0001-v1.md')
  assert.equal(findings[0]?.line, 12)
})

test('RN-0030: artefato com frontmatter quebrado é pulado — living-docs/frontmatter já reprova', () => {
  const quebrada = ['---', 'id: [REL-0001', 'title: v1.0.0', '---', '', 'Corrige RN-0001.', ''].join('\n')

  assert.deepEqual(findingsFor({ 'docs/releases/REL-0001-v1.md': quebrada }), [])
})
