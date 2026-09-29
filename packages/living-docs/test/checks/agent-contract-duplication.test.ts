import { test } from 'node:test'
import assert from 'node:assert/strict'
import { duplicatedSentences, livingDocsAgentContractDuplication } from '../../src/checks/agent-contract-duplication.ts'
import { livingDocsDoneVerifiable } from '../../src/checks/done-verifiable.ts'
import { livingDocsOpenDecisionClaim } from '../../src/checks/open-decision-claim.ts'
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
  - path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
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
const CONTRATO = ['# Contrato do agente', '', 'Índice e política: a verdade mora no artefato dono.', ''].join('\n')
const REGRAS = ['# Regras', '', '## RN-0001 — Uma regra', '', '- **status:** draft', ''].join('\n')

const ARVORE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'docs/requirements/rules.md': REGRAS,
  'docs/definition-of-done.md': DOD,
  'CLAUDE.md': CONTRATO,
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

test('repositório sem nenhuma das três classes passa', () => {
  withTempRepo(ARVORE, root => {
    const context = contextFor(root)

    for (const check of [livingDocsAgentContractDuplication, livingDocsDoneVerifiable, livingDocsOpenDecisionClaim()]) {
      assert.deepEqual(check.run(context), [], check.id)
    }
  })
})

test('RN-0020: frase longa do contrato repetida num artefato dono reprova', () => {
  const frase = 'Toda regra de negócio deste projeto nasce com identificador estável antes de qualquer linha de código.'

  withTempRepo(
    {
      ...ARVORE,
      'CLAUDE.md': `# Contrato do agente\n\n${frase}\n`,
      'docs/requirements/rules.md': `${REGRAS}\n${frase}\n`,
    },
    root => {
      const findings = livingDocsAgentContractDuplication.run(contextFor(root))
      const achado = findings.find(finding => finding.file === 'CLAUDE.md')

      assert.ok(achado, 'living-docs/agent-contract-duplication deveria acusar a duplicata')
      assert.equal(achado.ruleId, 'living-docs/agent-contract-duplication')
      assert.match(achado.message, /docs\/requirements\/rules\.md/)
      assert.match(achado.fix, /ponteiro|apague/i)
    },
  )
})

test('ADR-0009: frase curta é vocabulário compartilhado, não duplicata', () => {
  const curta = 'O teste vem antes da implementação.'

  withTempRepo(
    {
      ...ARVORE,
      'CLAUDE.md': `# Contrato do agente\n\n${curta}\n`,
      'docs/requirements/rules.md': `${REGRAS}\n${curta}\n`,
    },
    root => {
      assert.deepEqual(livingDocsAgentContractDuplication.run(contextFor(root)), [])
    },
  )
})

test('duplicatedSentences ignora código e compara normalizado', () => {
  const frase = 'Uma frase suficientemente longa para passar do piso de doze palavras sem esforço nenhum'
  const contrato = `# Contrato\n\n**${frase}.**\n\n\`\`\`md\n${'outra frase longa '.repeat(4)}\n\`\`\`\n`
  const corpus = [{ file: 'docs/x.md', source: `prosa antes. ${frase.toLowerCase()}. prosa depois.` }]

  const found = duplicatedSentences(contrato, corpus)

  assert.equal(found.length, 1)
  assert.equal(found[0]?.source, 'docs/x.md')
  assert.equal(found[0]?.line, 3)
})
