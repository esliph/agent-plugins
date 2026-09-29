import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coreChecks, diffChecks, resolveOwnership } from '@esliph/ownership'
import type { Finding as CoreFinding } from '@esliph/ownership'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { validateChecks } from '../../src/checks/registry.ts'
import type { Finding } from '../../src/core/types.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const TODAY = '2026-09-28'

function coreFindings(root: string, diff: { base: string; changed: string[]; messages: string[] }): CoreFinding[] {
  const config = resolveOwnership(root)!
  const context = { root, config, today: TODAY }

  return [...coreChecks(() => 'saída do gerador\n'), ...diffChecks(diff)].flatMap(check => check.run(context))
}

function livingDocsFindings(root: string, diff: { base: string; changed: string[]; messages: string[] }): Finding[] {
  const config = loadLivingDocsConfig(root)
  const context = { root, config, docs: collectArtifacts(root, config), documents: collectDocuments(root, config), today: TODAY }

  return validateChecks({ ...diff, edits: [] }).flatMap(check => check.run(context))
}

const BASE_OWNED = `version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: '@time'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: docs/definition-of-done.md
    owner: '@time'
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
  - path: CHANGELOG.md
    owner: '@time'
    living-docs: { audience: external }
  - path: .ownership.yml
    owner: '@time'
    living-docs: {}
  - path: CODEOWNERS
    owner: '@time'
  - path: out.md
    owner: '@time'
`

const ADR_OK = "---\nid: ADR-0001\ntitle: Decisão\nstatus: draft\nowner: '@time'\ntrigger: Nunca.\nlast-reviewed: 2026-09-01\nrelates-to: []\n---\n\n# ADR-0001\n"

test('cada regra movida é reportada pelo núcleo, e o living-docs fica calado sobre ela', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `${BASE_OWNED}generated:
  - path: out.md
    command: gen
watches:
  - code: 'src/**'
    doc: CHANGELOG.md
    consumer-visible: true
`,
      CODEOWNERS: 'docs/ @time\nCHANGELOG.md @time\n.ownership.yml @time\nCODEOWNERS @time\nout.md @time\n',
      // declared-state: status fora de states; owner sem @.
      'docs/decisions/adr/ADR-0001-a.md': ADR_OK.replace('status: draft', 'status: aceito').replace("owner: '@time'", 'owner: time'),
      'docs/definition-of-done.md': "---\ntitle: DoD\nowner: '@time'\ntrigger: Quando muda o que é pronto.\nlast-reviewed: 2026-09-01\n---\n\n- [ ] Algo — verificação: human.\n",
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
      // generated-drift: diverge da saída do gerador.
      'out.md': 'editado à mão\n',
      // owner-coverage: arquivo sem dono.
      'solto.txt': 'x\n',
      'src/a.ts': 'export {}\n',
    },
    root => {
      // watch-satisfied e consumer-change-logged: o diff toca src/ sem o CHANGELOG.
      const diff = { base: 'main', changed: ['src/a.ts'], messages: ['feat: x'] }
      const core = new Set(coreFindings(root, diff).map(finding => finding.ruleId))

      for (const rule of ['ownership/declared-state', 'ownership/generated-drift', 'ownership/owner-coverage', 'ownership/watch-satisfied', 'ownership/consumer-change-logged']) {
        assert.ok(core.has(rule), `${rule} deveria reportar a violação plantada`)
      }

      // O living-docs pode achar outras coisas nesta fixture (ela não é um
      // repositório exemplar); não pode achar nada onde as violações movidas
      // foram plantadas. As linhas 4 e 5 do ADR são `status` e `owner`.
      const living = livingDocsFindings(root, diff)
      const plantados = new Set(['out.md', 'solto.txt', 'src/a.ts', 'CHANGELOG.md'])

      assert.deepEqual(
        living.filter(finding => plantados.has(finding.file)),
        [],
        'o living-docs não pode reportar o que é do núcleo',
      )
      assert.deepEqual(
        living.filter(finding => finding.file === 'docs/decisions/adr/ADR-0001-a.md' && (finding.line === 4 || finding.line === 5)),
        [],
        'status fora de states e owner sem @ são do ownership/declared-state',
      )
    },
  )
})

test('cada regra que ficou é reportada pelo living-docs, e o núcleo fica calado sobre ela', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `${BASE_OWNED}`,
      CODEOWNERS: 'docs/ @time\nCHANGELOG.md @time\n.ownership.yml @time\nCODEOWNERS @time\nout.md @time\n',
      'out.md': 'x\n',
      // frontmatter: empty trigger.
      'docs/decisions/adr/ADR-0001-a.md': ADR_OK.replace('trigger: Nunca.', "trigger: ''"),
      // done-verifiable: item sem verificação nomeada.
      'docs/definition-of-done.md': "---\ntitle: DoD\nowner: '@time'\ntrigger: Quando muda o que é pronto.\nlast-reviewed: 2026-09-01\n---\n\n- [ ] Algo sem quem verifique.\n",
      // external-audience e links: ID de artefato e link quebrado em texto externo.
      'CHANGELOG.md': '# Changelog\n\nVeja ADR-0001 e [isto](nao-existe.md).\n',
    },
    root => {
      const diff = { base: 'main', changed: [], messages: [] }
      const living = new Set(livingDocsFindings(root, diff).map(finding => finding.ruleId))

      for (const rule of ['living-docs/frontmatter', 'living-docs/done-verifiable', 'living-docs/links', 'living-docs/external-audience']) {
        assert.ok(living.has(rule), `${rule} deveria reportar a violação plantada`)
      }
      assert.deepEqual(
        coreFindings(root, diff).map(finding => finding.ruleId),
        [],
        'o núcleo não pode reportar o que é do living-docs',
      )
    },
  )
})

test('a única sobreposição é de propósito: chave duplicada numa coleção é do núcleo e também do id-integrity', () => {
  // `living-docs/id-integrity` cobre também sequência e citação, e não está entre
  // as regras movidas: a duplicata de ID continua nos dois plugins. Este teste
  // fixa a sobreposição para que ela seja vista, e não podada por engano.
  const tabela = [
    '| ID | Lacuna | Status |',
    '| --- | --- | --- |',
    '| DA-0001 | Primeira | open |',
    '| DA-0001 | Repetida | open |',
    '',
  ].join('\n')

  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: '@time'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
  - path: .ownership.yml
    owner: '@time'
    living-docs: {}
  - path: CODEOWNERS
    owner: '@time'
`,
      CODEOWNERS: 'docs/ @time\n.ownership.yml @time\nCODEOWNERS @time\n',
      'docs/open-decisions.md': tabela,
    },
    root => {
      const diff = { base: 'main', changed: [], messages: [] }

      assert.ok(coreFindings(root, diff).some(finding => finding.ruleId === 'ownership/declared-state' && /DA-0001/.test(finding.message)))
      assert.ok(livingDocsFindings(root, diff).some(finding => finding.ruleId === 'living-docs/id-integrity' && /DA-0001/.test(finding.message)))
    },
  )
})
