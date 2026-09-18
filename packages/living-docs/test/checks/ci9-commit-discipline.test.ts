import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci9CommitDiscipline, isPureDateBump } from '../../src/checks/ci9-commit-discipline.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
    collection: sections
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
`

const REGRAS = [
  '---',
  'title: Regras',
  'owner: "@time"',
  'trigger: Antes de implementar comportamento novo.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## RN-0001 — Centavos arredondam para cima',
  '',
  '- **status:** active',
  '',
  'Prosa.',
  '',
].join('\n')

const ARVORE = { 'docs/requirements/rules.md': REGRAS }

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = parseOwnership(ownership)

  return { root, config, docs: collectArtifacts(root, config), documents: [], today: '2026-08-31' }
}

/** Uma edição que só mexeu na data de revisão. */
function bump(path: string) {
  return { path, added: ['last-reviewed: 2026-08-31'], removed: ['last-reviewed: 2026-01-01'] }
}

test('RN-0027: tres documentos que so mudaram a data reprovam, nomeando o anti-requisito', () => {
  withTempRepo(ARVORE, root => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      messages: ['chore: revisao da documentacao'],
      edits: [bump('docs/a.md'), bump('docs/b.md'), bump('docs/c.md')],
    }).run(contextFor(root))

    const bumpFinding = findings.find(f => /last-reviewed/.test(f.message))

    assert.ok(bumpFinding, JSON.stringify(findings, null, 2))
    assert.equal(bumpFinding?.ruleId, 'CI-9')
    assert.equal(bumpFinding?.severity, 'error')
    assert.match(bumpFinding?.message ?? '', /docs\/a\.md/)
    assert.match(bumpFinding?.message ?? '', /docs\/c\.md/)
  })
})

test('RN-0027: dois bumps passam, e documento que mudou de verdade nunca conta', () => {
  withTempRepo(ARVORE, root => {
    const doisBumps = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md'],
      messages: ['docs: revisao'],
      edits: [bump('docs/a.md'), bump('docs/b.md')],
    }).run(contextFor(root))

    assert.deepEqual(
      doisBumps.filter(f => /last-reviewed/.test(f.message)),
      [],
    )

    // Tres documentos tocados, mas um deles mudou no corpo: revisao de verdade.
    const comCorpo = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      messages: ['docs: revisao'],
      edits: [
        bump('docs/a.md'),
        bump('docs/b.md'),
        {
          path: 'docs/c.md',
          added: ['last-reviewed: 2026-08-31', 'paragrafo novo'],
          removed: ['last-reviewed: 2026-01-01'],
        },
      ],
    }).run(contextFor(root))

    assert.deepEqual(
      comCorpo.filter(f => /last-reviewed/.test(f.message)),
      [],
    )
  })
})

test('RN-0027: o limiar e configuravel, e o padrao e tres', () => {
  withTempRepo(ARVORE, root => {
    const facts = {
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md'],
      messages: ['docs: revisao'],
      edits: [bump('docs/a.md'), bump('docs/b.md')],
    }
    const comLimiar2 = ci9CommitDiscipline(facts).run(contextFor(root, `${OWNERSHIP}last-reviewed-bump-limit: 2\n`))

    assert.ok(comLimiar2.some(f => /last-reviewed/.test(f.message)))
  })
})

test('RN-0028: commit que altera artefato sem citar o ID declarado nele reprova', () => {
  withTempRepo(ARVORE, root => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['docs: ajusta a prosa da regra'],
      edits: [],
    }).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.file, 'docs/requirements/rules.md')
    assert.match(findings[0]?.message ?? '', /RN-0001/)
    assert.match(findings[0]?.fix ?? '', /mensagem de commit/)
  })
})

test('RN-0028: basta uma mensagem do diff citar um dos IDs do arquivo', () => {
  withTempRepo(ARVORE, root => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['chore: mexe em outra coisa', 'docs(RN-0001): a regra ganha o caso do negativo'],
      edits: [],
    }).run(contextFor(root))

    assert.deepEqual(findings, [])
  })
})

test('RN-0028: arquivo que nao e artefato, e artefato ausente, nao sao cobrados', () => {
  withTempRepo(ARVORE, root => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['src/cli/index.ts', 'docs/decisions/adr/ADR-0001-apagado.md'],
      messages: ['refactor: renomeia interno'],
      edits: [],
    }).run(contextFor(root))

    assert.deepEqual(findings, [])
  })
})

test('RN-0024: a citacao e comparada por identidade, nao pela forma escrita', () => {
  withTempRepo({ 'docs/requirements/rules.md': REGRAS.replace('## RN-0001', '## RN001') }, root => {
    // O projeto escreve `RN001`; o commit cita `RN001`. Mesma identidade que
    // `RN-0001` teria — e quem compara e `canonicalId`, nao a forma escrita.
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['docs(RN001): a regra ganha o caso do negativo'],
      edits: [],
    }).run(contextFor(root, `${OWNERSHIP}id-format:\n  separator: ""\n  padding: 3\n`))

    assert.deepEqual(findings, [])
  })
})

test('ADR-0010: sem diff, CI-9 nao tem o que dizer', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(ci9CommitDiscipline(null).run(contextFor(root)), [])
  })
})

test('RN-0027: isPureDateBump e so a data, e nada mais', () => {
  assert.equal(isPureDateBump(bump('docs/a.md')), true)
  assert.equal(isPureDateBump({ path: 'docs/a.md', added: ['last-reviewed: x', 'outra'], removed: ['last-reviewed: y'] }), false)
  assert.equal(isPureDateBump({ path: 'docs/a.md', added: ['titulo'], removed: ['titulo antigo'] }), false)
})
