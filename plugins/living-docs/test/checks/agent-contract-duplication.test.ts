import { test } from 'node:test'
import assert from 'node:assert/strict'
import { duplicatedSentences, livingDocsAgentContractDuplication } from '../../plugin/src/checks/agent-contract-duplication.ts'
import { livingDocsDoneVerifiable } from '../../plugin/src/checks/done-verifiable.ts'
import { livingDocsOpenDecisionClaim } from '../../plugin/src/checks/open-decision-claim.ts'
import { collectArtifacts, collectDocuments } from '../../plugin/src/docs/collect.ts'
import { OWNERSHIP_FILE, configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: .ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
    living-docs: {}
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    living-docs: {}
  - path: CLAUDE.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: { role: agent-contract }
  - path: docs/definition-of-done.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
`

const DOD = ['# Definition of Done', '', '- [ ] Tests pass — verification: `living-docs/frontmatter`.', ''].join('\n')
const CONTRACT = ['# Agent contract', '', 'Index and policy: the truth lives in the owning artifact.', ''].join('\n')
const RULES = ['# Rules', '', '## RN-0001 — A rule', '', '- **status:** draft', ''].join('\n')

const TREE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'docs/requirements/rules.md': RULES,
  'docs/definition-of-done.md': DOD,
  'CLAUDE.md': CONTRACT,
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

test('a repository with none of the three classes passes', () => {
  withTempRepo(TREE, root => {
    const context = contextFor(root)

    for (const check of [livingDocsAgentContractDuplication, livingDocsDoneVerifiable, livingDocsOpenDecisionClaim()]) {
      assert.deepEqual(check.run(context), [], check.id)
    }
  })
})

test('RN-0020: a long contract sentence repeated in an owning artifact fails', () => {
  const sentence = 'Every business rule of this project is born with a stable identifier before any line of code.'

  withTempRepo(
    {
      ...TREE,
      'CLAUDE.md': `# Agent contract\n\n${sentence}\n`,
      'docs/requirements/rules.md': `${RULES}\n${sentence}\n`,
    },
    root => {
      const findings = livingDocsAgentContractDuplication.run(contextFor(root))
      const found = findings.find(finding => finding.file === 'CLAUDE.md')

      assert.ok(found, 'living-docs/agent-contract-duplication should flag the duplicate')
      assert.equal(found.ruleId, 'living-docs/agent-contract-duplication')
      assert.match(found.message, /docs\/requirements\/rules\.md/)
      assert.match(found.fix, /pointer|delete/i)
    },
  )
})

test('ADR-0009: a short sentence is shared vocabulary, not a duplicate', () => {
  const short = 'The test comes before the implementation.'

  withTempRepo(
    {
      ...TREE,
      'CLAUDE.md': `# Agent contract\n\n${short}\n`,
      'docs/requirements/rules.md': `${RULES}\n${short}\n`,
    },
    root => {
      assert.deepEqual(livingDocsAgentContractDuplication.run(contextFor(root)), [])
    },
  )
})

test('duplicatedSentences ignores code and compares normalized', () => {
  const sentence = 'A sentence long enough to clear the twelve word floor without any effort at all'
  const contract = `# Contrato\n\n**${sentence}.**\n\n\`\`\`md\n${'another long sentence '.repeat(4)}\n\`\`\`\n`
  const corpus = [{ file: 'docs/x.md', source: `prose before. ${sentence.toLowerCase()}. prose after.` }]

  const found = duplicatedSentences(contract, corpus)

  assert.equal(found.length, 1)
  assert.equal(found[0]?.source, 'docs/x.md')
  assert.equal(found[0]?.line, 3)
})
