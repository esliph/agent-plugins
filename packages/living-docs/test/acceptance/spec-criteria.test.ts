import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { coreChecks, diffChecks, resolveOwnership } from '@esliph/ownership'
import { runInit } from '../../src/cli/init.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { decideAppendOnly } from '../../src/hooks/append-only.ts'
import { decideStatePromotion } from '../../src/hooks/state-promotion.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import { checkoutRoot } from '../helpers/checkout.ts'
import { decideShortcutDebt } from '../../src/hooks/shortcut-debt.ts'
import { decideSessionInventory } from '../../src/hooks/session-inventory.ts'
import { decideOpenDecisionGuard } from '../../src/hooks/open-decision-guard.ts'

const ROOT = checkoutRoot()
const OPTIONS = {
  owner: '@team',
  dryRun: false,
  stage: 'solo' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'time/living-docs',
}

function seedAdr(root: string, status: string): string {
  const file = 'docs/decisions/adr/ADR-0001-teste.md'
  const content = [
    '---',
    'id: ADR-0001',
    'title: Decisão de teste',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Nunca. Imutável após aceito.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    'corpo original',
  ].join('\n')

  mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
  writeFileSync(join(root, file), content, 'utf8')

  return file
}

test('critério 1: SK-0 num repositório sem documentação viva não duplica nada', () => {
  withTempRepo({ 'docs/adr/0001-preexistente.md': '# antigo\n' }, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.adopted.some(entry => entry.path === 'docs/adr/'))
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false)
    assert.equal(readFileSync(join(root, 'docs/adr/0001-preexistente.md'), 'utf8'), '# antigo\n')
  })
})

test('critério 2: living-docs/append-only nega alterar o corpo de um ADR accepted e permite supersedir', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = seedAdr(root, 'accepted')
    const env = { root, hostRoots: [root] }

    const negado = decideAppendOnly({ tool_name: 'Edit', tool_input: { file_path: file, old_string: 'corpo original', new_string: 'corpo novo' } }, env)

    assert.equal(negado.action, 'deny')

    const atual = readFileSync(join(root, file), 'utf8')
    const supersedido = atual
      .replace('status: accepted', 'status: superseded')
      .replace('last-reviewed: 2026-08-24', 'last-reviewed: 2026-08-24\nsuperseded-by: ADR-0002')
    const permitido = decideAppendOnly({ tool_name: 'Write', tool_input: { file_path: file, content: supersedido } }, env)

    assert.equal(permitido.action, 'allow')
  })
})

test('critério 3: a trigger left empty fails in CI naming the field', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = seedAdr(root, 'draft')

    writeFileSync(
      join(root, file),
      readFileSync(join(root, file), 'utf8').replace('trigger: Nunca. Imutável após aceito.', "trigger: ''"),
      'utf8',
    )

    const result = runValidate(root)

    assert.equal(result.exitCode, 1)
    const finding = result.findings.find(f => f.ruleId === 'living-docs/frontmatter' && /trigger/.test(f.message))

    assert.ok(finding, 'living-docs/frontmatter deveria acusar o campo trigger')
  })
})

test('living-docs/state-promotion pergunta ao promover uma decisão sem ato humano (mecanismo do spec §4)', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = seedAdr(root, 'draft')
    const decision = decideStatePromotion(
      { tool_name: 'Edit', tool_input: { file_path: file, old_string: 'status: draft', new_string: 'status: accepted' } },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'ask')
  })
})

test('este repositório passa nos próprios checks', () => {
  assert.ok(existsSync(join(ROOT, OWNERSHIP_FILE)), 'rode `living-docs init` antes')
  const result = runValidate(ROOT)

  assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2))
  assert.equal(result.exitCode, 0)
})

test('este repositório passa nos checks do núcleo — inclusive com o que só existe no checkout local', () => {
  const root = checkoutRoot()
  const config = resolveOwnership(root)

  assert.ok(config !== null, 'o checkout declara o arquivo de ownership na raiz')
  const findings = coreChecks().flatMap(check => check.run({ root, config, today: '2026-09-28' }))

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})

const NUL = String.fromCharCode(0)

const WATCHED_CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "comportamento novo exige regra com ID antes do código"
`

const GENERATED_CONFIG = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
generated:
  - path: docs/contracts/api.gen.md
    command: "node tools/gen.js"
`

test('critério 6: o contrato gerado editado por fora reprova no núcleo', () => {
  const GERADO = 'docs/contracts/api.gen.md'
  const VERDADE = '<!-- generated: do not edit -->\n\n# API\n\n- GET /pedidos\n'

  withTempRepo({ [OWNERSHIP_FILE]: GENERATED_CONFIG, [GERADO]: VERDADE }, root => {
    // O guarda que nega a edição pelo agente é hoje `ownership/generated-guard`
    // (ADR-0030); aqui fica a metade que independe de hook: editado por fora, a
    // deriva é achado do núcleo.
    const config = resolveOwnership(root)!
    const deriva = coreChecks(() => VERDADE).find(check => check.id === 'ownership/generated-drift')!

    writeFileSync(join(root, GERADO), VERDADE.replace('GET', 'POST'), 'utf8')
    const derivou = deriva.run({ root, config, today: '2026-09-28' })

    assert.equal(derivou.length, 1)
    assert.equal(derivou[0]?.severity, 'error')

    // E com o arquivo igual à saída do gerador, o caminho fica livre.
    writeFileSync(join(root, GERADO), VERDADE, 'utf8')
    assert.deepEqual(deriva.run({ root, config, today: '2026-09-28' }), [])
  })
})

test('mecanismo da Fase 6: mudança visível ao consumidor é cobrada, e a razão escrita libera', () => {
  const OWNERSHIP = [
    'version: 2',
    'plugins: [living-docs]',
    'owned:',
    '  - path: docs/decisions/adr/',
    '    owner: "@time"',
    '    skill: decision-recorder',
    '    states: [draft, accepted, superseded]',
    '    living-docs: { id-prefix: ADR }',
    '  - path: CHANGELOG.md',
    '    owner: "@time"',
    'watches:',
    '  - code: "src/api/**"',
    '    doc: CHANGELOG.md',
    '    consumer-visible: true',
    '',
  ].join('\n')

  const CHANGELOG = '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- `GET /pedidos` responde em centavos.\n'

  withTempRepo({ [OWNERSHIP_FILE]: OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, root => {
    const config = resolveOwnership(root)!
    const cobra = (changed: string[], messages: string[]) =>
      diffChecks({ base: 'base', changed, messages })
        .find(check => check.id === 'ownership/consumer-change-logged')!
        .run({ root, config, today: '2026-09-28' })

    // sem a entrada no diff: reprova, nomeando o arquivo e o caminho vigiado
    const reprovado = cobra(['src/api/pedidos.ts'], ['feat: centavos'])

    assert.equal(reprovado.length, 1)
    assert.equal(reprovado[0]?.file, 'CHANGELOG.md')

    // com a entrada no mesmo diff: aprova
    assert.deepEqual(cobra(['src/api/pedidos.ts', 'CHANGELOG.md'], ['feat: centavos']), [])

    // sem entrada, mas com a razão escrita no histórico: aprova
    assert.deepEqual(cobra(['src/api/pedidos.ts'], ['refactor: renomeia interno\n\nChangelog: none — nada muda para quem consome']), [])
  })
})

test('mecanismo da Fase 6: atalho novo sem TDR é lembrado, nunca bloqueado', () => {
  withTempRepo({}, root => {
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src/cobranca.ts'), 'export const taxa = 0.05;\n', 'utf8')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/cobranca.ts',
          old_string: 'export const taxa = 0.05;',
          new_string: '// FIXME: arredondamento errado em centavos\nexport const taxa = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'remind', 'living-docs/shortcut-debt é additionalContext: lembra e devolve o controle')
    assert.match(decision.action === 'remind' ? decision.context : '', /TDR/)
  })
})

const DIVIDA_CONFIG = [
  'version: 2',
  'plugins: [living-docs]',
  'living-docs:',
  '  stale-after-months: 6',
  'owned:',
  '  - path: docs/decisions/debt/',
  '    owner: "@team"',
  '    skill: decision-recorder',
  '    states: [open, paid, accepted-permanently]',
  '    living-docs: { id-prefix: TDR, append-only: true }',
  '  - path: docs/requirements/rules.md',
  '    owner: "@team"',
  '    skill: requirements-keeper',
  '    states: [draft, active, revoked]',
  '    format: { collection: sections, key: first-token }',
  '    living-docs: { id-prefix: RN }',
  '  - path: .ownership.yml',
  '    owner: "@team"',
  '    skill: living-docs-bootstrap',
  '    living-docs: {}',
  '',
].join('\n')

function divida(status: string): string {
  return [
    '---',
    'id: TDR-0001',
    'title: Atalho consciente',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Quando o gatilho de pagamento abaixo se cumprir.',
    'last-reviewed: 2026-08-20',
    'pay-when:',
    "  pattern: '^- \\*\\*status:\\*\\* revoked'",
    '  paths: ["docs/requirements/**"]',
    '---',
    '',
    '# TDR-0001 — Atalho consciente',
    '',
  ].join('\n')
}

function regras(status: string): string {
  return [
    '---',
    'title: Regras',
    'owner: "@team"',
    'trigger: Antes de implementar qualquer comportamento, e a toda regra nova ou alterada.',
    'last-reviewed: 2026-08-20',
    '---',
    '',
    '## RN-0001 — Uma regra',
    '',
    `- **status:** ${status}`,
    ...(status === 'revoked' ? ['- **revoked-by:** RN-0002', '', '## RN-0002 — Regra nova', '', '- **status:** active', '- **revokes:** RN-0001'] : []),
    '',
  ].join('\n')
}

test('critério 7: dívida com gatilho cumprido reprova até ser paga ou reclassificada', () => {
  const arvore = (statusDivida: string, statusRegra: string) => ({
    [OWNERSHIP_FILE]: DIVIDA_CONFIG,
    'docs/decisions/debt/TDR-0001-x.md': divida(statusDivida),
    'docs/requirements/rules.md': regras(statusRegra),
  })

  // gatilho não aconteceu: passa
  withTempRepo(arvore('open', 'active'), root => {
    assert.equal(runValidate(root).exitCode, 0)
  })

  // gatilho aconteceu e a dívida segue open: reprova, nomeando a evidência
  withTempRepo(arvore('open', 'revoked'), root => {
    const result = runValidate(root)

    assert.equal(result.exitCode, 1)

    const finding = result.findings.find(f => f.ruleId === 'living-docs/staleness' && f.severity === 'error')

    assert.ok(finding, JSON.stringify(result.findings, null, 2))
    assert.match(finding.message, /TDR-0001/)
    assert.match(finding.message, /docs\/requirements\/rules\.md/)
  })

  // reclassificada: volta a passar
  withTempRepo(arvore('paid', 'revoked'), root => {
    assert.equal(runValidate(root).exitCode, 0)
  })
})

test('critério 8: no início da sessão, o inventário e as pendências chegam ao contexto', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: DIVIDA_CONFIG,
      'docs/decisions/debt/TDR-0001-x.md': divida('open'),
      'docs/requirements/rules.md': regras('revoked'),
    },
    root => {
      const decision = decideSessionInventory({ root, hostRoots: [root] }, '2026-08-27')

      assert.equal(decision.action, 'inform', 'ninguém precisa procurar: o inventário chega')
      const context = decision.action === 'inform' ? decision.context : ''

      assert.match(context, /TDR-0001/)
      assert.doesNotMatch(context, /permissionDecision/, 'é contexto, não decisão de permissão')
    },
  )
})

test('RN-0021: critério 5, metade 2 — o CI sinaliza pelo `watches`, e a razão escrita libera', () => {
  const arvore = {
    [OWNERSHIP_FILE]: WATCHED_CONFIG,
    'docs/requirements/rules.md': regras('draft'),
  }

  withTempRepo(arvore, root => {
    const config = resolveOwnership(root)!
    const cobra = (changed: string[], messages: string[]) =>
      diffChecks({ base: 'origin/master', changed, messages })
        .find(check => check.id === 'ownership/watch-satisfied')!
        .run({ root, config, today: '2026-09-28' })

    // sem o doc dono no diff: reprova, nomeando o caminho vigiado
    const reprovado = cobra(['src/domain/reembolso.ts'], ['feat: reembolso'])

    assert.equal(reprovado.length, 1)
    assert.match(reprovado[0]?.message ?? '', /src\/domain\/reembolso\.ts/)

    // com o doc no mesmo diff: passa
    assert.deepEqual(cobra(['src/domain/reembolso.ts', 'docs/requirements/rules.md'], ['feat(RN-0001): reembolso']), [])

    // com a razão escrita no histórico: passa
    assert.deepEqual(cobra(['src/domain/reembolso.ts'], ['refactor: renomeia interno\n\nDocs: none — só renomeação, a regra não mudou']), [])

    // e sem base, o `validate` do living-docs não acha nada disso
    assert.equal(runValidate(root).exitCode, 0)
  })
})

test('critério 1 (fechamento): o inventário relata a forma detectada e não toca em arquivo nenhum', () => {
  const preexistente = [
    '---',
    'title: Regras',
    'owner: "@time"',
    'trigger: A toda regra nova ou alterada.',
    'last-reviewed: 2026-08-28',
    '---',
    '',
    '## RN001 — Uma regra',
    '- **status:** active',
    '',
    '## RN002 — Outra',
    '- **status:** active',
    '',
  ].join('\n')

  withTempRepo({ 'docs/business-rules.md': preexistente }, root => {
    const antes = readFileSync(join(root, 'docs/business-rules.md'), 'utf8')

    const result = runInit(root, { ...OPTIONS, stage: 'small-team', dryRun: true })

    assert.ok(result.adopted.some(entry => entry.path === 'docs/business-rules.md'))
    assert.ok(result.detected, 'a forma detectada precisa ser relatada')
    assert.deepEqual(result.detected.format, { separator: '', padding: 3 })
    assert.ok(result.detected.count >= 2)
    assert.equal(readFileSync(join(root, 'docs/business-rules.md'), 'utf8'), antes)
  })
})

const DECISAO_BLOQUEANTE = [
  'version: 2',
  'plugins: [living-docs]',
  'owned:',
  '  - path: docs/open-decisions.md',
  '    owner: "@time"',
  '    skill: decision-recorder',
  '    states: [open, resolved, dropped]',
  '    format: { collection: table, key: ID, state-field: Status }',
  '    living-docs:',
  '      id-prefix: DA',
  '      field-map:',
  '        blocks: "Bloqueia"',
  '        gap: "Lacuna"',
  '  - path: .ownership.yml',
  '    owner: "@time"',
  '    skill: living-docs-bootstrap',
  '    living-docs: {}',
  '',
].join('\n')

const DECISOES = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Lacuna | Status | Bloqueia | Aberta em |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | Como arredondar centavos | open | `src/cobranca/**` | 2026-08-28 |',
  '',
].join('\n')

test('critério 4 da spec §12: comportamento sem regra é perguntado na edição e reprovado no diff', () => {
  const arvore = {
    [OWNERSHIP_FILE]: DECISAO_BLOQUEANTE,
    'docs/open-decisions.md': DECISOES,
  }

  const git =
    (changed: string[], messages: string[]) =>
    (args: readonly string[]): string =>
      args.includes('diff') ? changed.join(NUL) + NUL : messages.join(`${NUL}\n`) + NUL + '\n'

  withTempRepo(arvore, root => {
    // Metade 1 — na edição, living-docs/open-decision-guard pergunta nomeando a decisão.
    const pergunta = decideOpenDecisionGuard(
      { tool_name: 'Edit', tool_input: { file_path: 'src/cobranca/taxa.ts', old_string: 'a', new_string: 'b' } },
      { root, hostRoots: [root] },
    )

    assert.equal(pergunta.action, 'ask')
    assert.match(pergunta.action === 'ask' ? pergunta.reason : '', /DA-0001/)

    // Metade 2 — no diff, living-docs/open-decision-claim reprova.
    const reprovado = runValidate(root, 'origin/master', git(['src/cobranca/taxa.ts'], ['feat: centavos']))
    const finding = reprovado.findings.find(f => f.ruleId === 'living-docs/open-decision-claim' && /DA-0001/.test(f.message))

    assert.ok(finding, JSON.stringify(reprovado.findings, null, 2))
    assert.equal(reprovado.exitCode, 1)

    // E a razão escrita é a única saída.
    const comRazao = git(['src/cobranca/taxa.ts'], ['refactor: renomeia interno\n\nDocs: none — não é a implementação da regra que falta'])

    assert.equal(runValidate(root, 'origin/master', comRazao).exitCode, 0)

    // Sem base, esta metade não roda.
    assert.equal(runValidate(root).exitCode, 0)
  })
})

const fakeGit =
  (changed: string[], messages: string[], patch = '') =>
  (args: readonly string[]): string => {
    if (args.includes('log')) {
      return messages.join(`${NUL}\n`) + NUL + '\n'
    }
    if (args.includes('--unified=0')) {
      return patch
    }

    return changed.join(NUL) + NUL
  }

const bumpPatch = (paths: string[]): string =>
  paths
    .flatMap(path => [
      `diff --git a/${path} b/${path}`,
      `--- a/${path}`,
      `+++ b/${path}`,
      '@@ -5 +5 @@',
      '-last-reviewed: 2026-01-01',
      '+last-reviewed: 2026-08-31',
    ])
    .join('\n')

const REGRAS_COM_RN_0001 = [
  '---',
  'title: Regras',
  'owner: "@time"',
  'trigger: Antes de implementar comportamento novo.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## RN-0001 — Centavos arredondam para cima',
  '',
  '- **status:** draft',
  '',
  'Prosa.',
  '',
].join('\n')

const OWNERSHIP_COM_REGRAS = [
  'version: 2',
  'plugins: [living-docs]',
  'owned:',
  '  - path: docs/requirements/rules.md',
  '    owner: "@time"',
  '    skill: requirements-keeper',
  '    states: [draft, active, revoked]',
  '    format: { collection: sections, key: first-token }',
  '    living-docs: { id-prefix: RN }',
  '  - path: .ownership.yml',
  '    owner: "@time"',
  '    skill: living-docs-bootstrap',
  '    living-docs: {}',
  '',
].join('\n')

test('criterios 7 e 8 da spec §12: a disciplina do commit e cobrada no CI', () => {
  const arvore = {
    [OWNERSHIP_FILE]: OWNERSHIP_COM_REGRAS,
    'docs/requirements/rules.md': REGRAS_COM_RN_0001,
  }

  withTempRepo(arvore, root => {
    // Criterio 7 — tres documentos que so mudaram a data.
    const bumps = ['docs/a.md', 'docs/b.md', 'docs/c.md']
    const massa = runValidate(root, 'origin/master', fakeGit(bumps, ['chore: revisao geral'], bumpPatch(bumps)))
    const bumpFinding = massa.findings.find(f => f.ruleId === 'living-docs/commit-discipline' && /last-reviewed/.test(f.message))

    assert.ok(bumpFinding, JSON.stringify(massa.findings, null, 2))
    assert.equal(massa.exitCode, 1)

    // Criterio 8 — artefato alterado sem o ID na mensagem.
    const semCitacao = runValidate(root, 'origin/master', fakeGit(['docs/requirements/rules.md'], ['docs: ajusta a prosa']))

    assert.ok(
      semCitacao.findings.some(f => f.ruleId === 'living-docs/commit-discipline' && /RN-0001/.test(f.message)),
      JSON.stringify(semCitacao.findings, null, 2),
    )

    // E citar o ID em qualquer commit do diff basta.
    const comCitacao = runValidate(root, 'origin/master', fakeGit(['docs/requirements/rules.md'], ['docs(RN-0001): o caso do negativo']))

    assert.deepEqual(
      comCitacao.findings.filter(f => f.ruleId === 'living-docs/commit-discipline'),
      [],
    )

    // Sem base, living-docs/commit-discipline nao roda.
    assert.deepEqual(
      runValidate(root).findings.filter(f => f.ruleId === 'living-docs/commit-discipline'),
      [],
    )
  })
})

test('ADR-0034: the owning skill of a trigger is checked in CI, its wording is not', () => {
  const ownership = [
    'version: 2',
    'plugins: [living-docs]',
    'owned:',
    '  - path: docs/open-decisions.md',
    '    owner: "@time"',
    '    skill: decision-recorder',
    '    states: [open, resolved, dropped]',
    '    format: { collection: table, key: ID, state-field: Status }',
    '    living-docs: { id-prefix: DA }',
    '  - path: .ownership.yml',
    '    owner: "@time"',
    '    skill: living-docs-bootstrap',
    '    living-docs: {}',
    '',
  ].join('\n')

  const decisoes = (trigger: string): string =>
    [
      '---',
      'title: Open Decisions',
      'owner: "@time"',
      `trigger: ${trigger}`,
      'last-reviewed: 2026-08-31',
      '---',
      '',
      '| ID | Lacuna | Status | Aberta em |',
      '| --- | --- | --- | --- |',
      '',
    ].join('\n')

  // A trigger that shares no word with the skill description is no finding: the
  // check never compares wording (ADR-0034, RN-0038).
  withTempRepo(
    {
      [OWNERSHIP_FILE]: ownership,
      'docs/open-decisions.md': decisoes('Quando o deploy quebrar em producao.'),
    },
    root => {
      const result = runValidate(root)

      assert.equal(
        result.findings.find(f => f.ruleId === 'living-docs/trigger-routing'),
        undefined,
        JSON.stringify(result.findings, null, 2),
      )
    },
  )

  // Skill que a raiz do toolkit nao tem: avisa e segue.
  withTempRepo(
    {
      [OWNERSHIP_FILE]: ownership.replace('skill: decision-recorder', 'skill: decisoes-do-time'),
      'docs/open-decisions.md': decisoes('Quando o deploy quebrar em producao.'),
    },
    root => {
      const result = runValidate(root)
      const finding = result.findings.find(f => f.ruleId === 'living-docs/trigger-routing')

      assert.equal(finding?.severity, 'warning')
      assert.equal(result.exitCode, 0)
    },
  )
})
