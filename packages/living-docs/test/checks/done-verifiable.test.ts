import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dodItemsWithoutVerification, livingDocsDoneVerifiable } from '../../src/checks/done-verifiable.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { OWNERSHIP_FILE, configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: .ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
    living-docs: {}
  - path: CLAUDE.md
    owner: "@time"
    skill: working-agreements-keeper
    living-docs: { role: agent-contract }
  - path: docs/definition-of-done.md
    owner: "@time"
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
`

const DOD = ['# Definition of Done', '', '- [ ] Os testes passam — verificação: `living-docs/frontmatter`.', ''].join('\n')

const ARVORE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'docs/definition-of-done.md': DOD,
  'CLAUDE.md': '# Contrato do agente\n',
}

function contextFor(root: string) {
  const config = configFrom(OWNERSHIP)

  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-27',
  }
}

test('RN-0017: item de DoD sem verificação nomeada reprova, com a linha e o nome do check', () => {
  const dodFraca = `${DOD}- [ ] O código está bonito.\n`

  withTempRepo({ ...ARVORE, 'docs/definition-of-done.md': dodFraca }, root => {
    const findings = livingDocsDoneVerifiable.run(contextFor(root))
    const achado = findings.find(finding => finding.file === 'docs/definition-of-done.md')

    assert.ok(achado)
    assert.equal(achado.ruleId, 'living-docs/done-verifiable')
    assert.equal(achado.line, 4)
    assert.match(achado.message, /verificação/)
    assert.match(achado.fix, /plugin\/nome/)
  })
})

test('dodItemsWithoutVerification aceita ID de check, de hook e a marca humana', () => {
  const source = [
    '- [ ] com check — verificação: `living-docs/citation-coverage`.',
    '- [x] com hook — verificação: `living-docs/append-only`.',
    '- [ ] com check do núcleo — verificação: `ownership/owner-coverage`.',
    '- [ ] com pessoa — verificação: human.',
    '- [ ] sem nada.',
    'não é item de caixa.',
  ].join('\n')

  assert.deepEqual(
    dodItemsWithoutVerification(source).map(item => item.line),
    [5],
  )
  // Sem alias de nome antigo: o número não é mais verificação.
  assert.equal(dodItemsWithoutVerification('- [ ] Algo — verificação: `CI-3`.').length, 1)
})

test('RN-0017: exemplo do formato dentro de cerca não é item — o item de fora ainda é', () => {
  const source = [
    '# Definition of Done',
    '',
    'O formato de cada caixa:',
    '',
    '```markdown',
    '- [ ] <o item> — verificação: <plugin/nome | humana>',
    '```',
    '',
    '- [ ] Os testes passam — verificação: `living-docs/frontmatter`.',
    '- [ ] O código está bonito.',
  ].join('\n')

  assert.deepEqual(
    dodItemsWithoutVerification(source).map(item => item.line),
    [10],
    'só o item de verdade, fora da cerca, é achado',
  )
})

test('RN-0017: a cerca sai e o ID entre crases fica — no check inteiro', () => {
  const dodComExemplo = [
    '# Definition of Done',
    '',
    '```markdown',
    '- [ ] <o item> — verificação: <plugin/nome | humana>',
    '```',
    '',
    '- [ ] Os testes passam — verificação: `living-docs/frontmatter`.',
    '',
  ].join('\n')

  withTempRepo({ ...ARVORE, 'docs/definition-of-done.md': dodComExemplo }, root => {
    assert.deepEqual(livingDocsDoneVerifiable.run(contextFor(root)), [])
  })
})

test('RN-0017, RN-0038: the human-verification marker is the fixed word `human`, in any case', () => {
  const source = [
    '- [ ] reviewed by a person — verification: human.',
    '- [ ] reviewed by a person — verification: Human.',
    '- [ ] reviewed by a person — verification: HUMAN, at the release.',
    '- [ ] reviewed by humans.',
  ].join('\n')

  assert.deepEqual(
    dodItemsWithoutVerification(source).map(item => item.line),
    [4],
  )
})

test('RN-0017: the old localized marker is no longer the marker', () => {
  // Built from parts so the repository keeps a single non-English fixture.
  const localized = ['hum', 'ana'].join('')

  assert.equal(dodItemsWithoutVerification(`- [ ] Something — verification: ${localized}.`).length, 1)
})
