import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { runInit, WORKFLOW_PATH } from '../../src/cli/init.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { SETTINGS_PATH } from '../../src/config/claude-settings.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OPTIONS = {
  owner: '@consumidor',
  dryRun: false,
  stage: 'solo' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  marketplace: 'time/living-docs',
}

/** As 97 regras do consumidor, escritas como ele as escreve: `RN001`. */
const REGRAS_DO_CONSUMIDOR = [
  '---',
  'title: Regras de negocio',
  'owner: "@consumidor"',
  'trigger: >',
  '  Antes de implementar qualquer comportamento, e a toda regra nova ou alterada.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '# Regras de negocio',
  '',
  ...Array.from({ length: 97 }, (_, i) => {
    const id = `RN${String(i + 1).padStart(3, '0')}`

    // `draft`: o que este fixture exerce e a forma escrita e a contagem de IDs,
    // nao a maquina de estados. `active` so traria o ruido de CI-3 (regra sem
    // teste que a cite), que nao e o assunto do criterio 12.
    return [`## ${id} — Regra numero ${i + 1}`, '', '- **status:** draft', '', 'Prosa da regra.', ''].join('\n')
  }),
].join('\n')

const DECISOES_EM_PROSA = [
  '---',
  'title: Decisoes em aberto',
  'owner: "@consumidor"',
  'trigger: >',
  '  Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## DA001 — Como arredondar centavos',
  '',
  '- **status:** open',
  '',
  '**Contexto:** a cobranca arredonda hoje de tres jeitos.',
  '**Alternativas:** para cima, bancario, truncar.',
  '**Recomendacao:** bancario.',
  '**Situacao:** ainda em discussao com o financeiro.',
  '',
  '## DA002 — Fuso do fechamento',
  '',
  '- **status:** open',
  '',
  '**Contexto:** o fechamento roda em UTC e o relatorio sai em BRT.',
  '**Situacao:** aguardando o time de dados.',
  '',
].join('\n')

/** O `.claude/settings.json` que o consumidor ja tem, com hooks proprios. */
const SETTINGS_DO_CONSUMIDOR = JSON.stringify(
  {
    hooks: {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: './scripts/audita.sh' }] }],
    },
    extraKnownMarketplaces: { 'time-interno': { source: { source: 'github', repo: 'time/plugins' } } },
  },
  null,
  2,
)

const WORKFLOW_DO_CONSUMIDOR = [
  'name: api',
  'on:',
  '  pull_request:',
  '    paths: ["services/api/**"]',
  'jobs:',
  '  test:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: npm ci && npm test',
  '',
].join('\n')

const CONSUMIDOR = {
  'docs/regras-de-negocio.md': REGRAS_DO_CONSUMIDOR,
  'docs/decisoes-em-aberto.md': DECISOES_EM_PROSA,
  'docs/adr/.gitkeep': '',
  'docs/architecture/contexto.md': '# Contexto\n\nDesenho C4 nivel 1.\n',
  'docs/domains/cobranca.md': '# Cobranca\n\nInvariantes do dominio.\n',
  'test/cobranca.test.ts': "test('RN001: arredonda para cima', () => {});\n",
  '.claude/settings.json': SETTINGS_DO_CONSUMIDOR,
  '.github/workflows/api.yml': WORKFLOW_DO_CONSUMIDOR,
  'README.md': '# consumidor\n',
}

/** Impressao byte a byte da arvore, para provar que nada preexistente mudou. */
function impressao(root: string, arquivos: readonly string[]): Record<string, string> {
  const registro: Record<string, string> = {}

  for (const arquivo of arquivos) {
    registro[arquivo] = readFileSync(join(root, arquivo), 'utf8')
  }

  return registro
}

const OPCOES_DO_CONSUMIDOR = {
  owner: '@consumidor',
  dryRun: false,
  stage: 'production' as const,
  idFormat: { separator: '', padding: 3 },
  // O consumidor nao roda Docker: e assim que ele chama o CLI.
  invoke: 'npx living-docs',
  marketplace: 'time/living-docs',
}

test('DA-0001/RNF-0003: init escreve no repositório validado, nunca no toolkit', () => {
  const antes = readdirSync(toolkitRoot()).sort()

  withTempRepo({ 'README.md': '# projeto alheio\n' }, root => {
    assert.notEqual(root, toolkitRoot())

    const result = runInit(root, OPTIONS)

    assert.ok(result.created.includes('docs/.ownership.yml'))
    assert.ok(existsSync(join(root, 'docs/.ownership.yml')))
    assert.ok(existsSync(join(root, 'docs/open-decisions.md')))

    // os templates vieram do toolkit, e o toolkit não ganhou arquivo nenhum
    assert.ok(readFileSync(join(root, 'docs/.ownership.yml'), 'utf8').includes('@consumidor'))
    assert.deepEqual(readdirSync(toolkitRoot()).sort(), antes)
  })
})

test('DA-0001/RNF-0003: validate roda contra a configuração do repositório validado', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    assert.equal(runValidate(root).exitCode, 0)

    // uma violação plantada lá aparece lá, com o caminho relativo àquele repo
    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
    writeFileSync(
      join(root, 'docs/decisions/adr/ADR-0001-x.md'),
      [
        '---',
        'id: ADR-0001',
        'title: X',
        'status: draft',
        'owner: "@consumidor"',
        'trigger: revisar trimestralmente',
        'last-reviewed: 2026-08-24',
        '---',
        '',
        'corpo',
      ].join('\n'),
      'utf8',
    )

    const result = runValidate(root)

    assert.equal(result.exitCode, 1)
    assert.ok(result.findings.some(f => f.file === 'docs/decisions/adr/ADR-0001-x.md'))
  })
})

test('DA-0001/RNF-0003: o hook decide pela configuração do repositório validado', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = 'docs/decisions/adr/ADR-0001-congelado.md'

    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
    writeFileSync(
      join(root, file),
      [
        '---',
        'id: ADR-0001',
        'title: Congelado',
        'status: accepted',
        'owner: "@consumidor"',
        'trigger: Nunca.',
        'last-reviewed: 2026-08-24',
        '---',
        '',
        'corpo original',
      ].join('\n'),
      'utf8',
    )

    const decision = decideHk1(
      { tool_name: 'Edit', tool_input: { file_path: file, old_string: 'corpo original', new_string: 'outro' } },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'deny')
  })
})

test('criterio 12: o consumidor real e adotado, e nenhum arquivo dele e reescrito', () => {
  withTempRepo(CONSUMIDOR, root => {
    // `.claude/settings.json` fica de fora da impressao: e o unico arquivo que o
    // init funde (RF-0013, DA-0003) — nunca sobrescreve. As assercoes 4 e 8
    // provam que a fusao preservou o que o consumidor ja tinha.
    const preexistentes = Object.keys(CONSUMIDOR).filter(p => p !== 'docs/adr/.gitkeep' && p !== '.claude/settings.json')
    const antes = impressao(root, preexistentes)

    // --dry-run primeiro: o inventario relata a forma que ele achou, e nao a
    // adota em silencio (RF-0014).
    const seco = runInit(root, { ...OPCOES_DO_CONSUMIDOR, idFormat: DEFAULT_ID_FORMAT, dryRun: true })

    assert.ok(seco.detected, 'o inventario nao relatou a forma escrita do consumidor')
    assert.equal(seco.detected?.format.separator, '')
    assert.equal(seco.detected?.format.padding, 3)
    assert.ok((seco.detected?.count ?? 0) >= 97, `so ${seco.detected?.count} ocorrencias lidas`)
    assert.deepEqual(impressao(root, preexistentes), antes, '--dry-run escreveu no repositorio')

    // Agora a instalacao, com a forma declarada.
    const result = runInit(root, OPCOES_DO_CONSUMIDOR)

    // 1 — nada preexistente foi reescrito.
    assert.deepEqual(impressao(root, preexistentes), antes, 'o init reescreveu arquivo preexistente')

    // 2 — as regras e as decisoes foram ADOTADAS, nao recriadas.
    const adotados = result.adopted.map(e => e.path)

    assert.ok(adotados.includes('docs/regras-de-negocio.md'), JSON.stringify(result.adopted))
    assert.ok(adotados.includes('docs/decisoes-em-aberto.md'), JSON.stringify(result.adopted))
    assert.ok(!existsSync(join(root, 'docs/requirements/rules.md')), 'o init criou um paralelo')
    assert.ok(!existsSync(join(root, 'docs/open-decisions.md')), 'o init criou um paralelo')

    // 3 — o diretorio de ADRs vazio nasce adotado.
    assert.ok(adotados.includes('docs/adr/'), JSON.stringify(result.adopted))

    // 4 — os hooks e o workflow do consumidor continuam la, e o do toolkit entrou.
    const settings = JSON.parse(readFileSync(join(root, SETTINGS_PATH), 'utf8'))

    assert.ok(settings.hooks.PreToolUse.some((e: { matcher: string }) => e.matcher === 'Bash'))
    assert.ok(settings.extraKnownMarketplaces['time-interno'])
    assert.ok(settings.extraKnownMarketplaces['living-docs'])
    assert.ok(existsSync(join(root, '.github/workflows/api.yml')))
    assert.ok(existsSync(join(root, WORKFLOW_PATH)))

    // 5 — o workflow instalado nao impoe Docker a quem instala.
    const workflow = readFileSync(join(root, WORKFLOW_PATH), 'utf8')

    assert.doesNotMatch(workflow, /docker/i)
    assert.match(workflow, /npx living-docs validate/)

    // 6 — o CODEOWNERS, que ele nao tinha, foi escrito.
    assert.ok(existsSync(join(root, 'CODEOWNERS')))

    // 7 — a situacao em prosa continua prosa: virar estado e ato humano.
    assert.match(readFileSync(join(root, 'docs/decisoes-em-aberto.md'), 'utf8'), /ainda em discussao/)

    // 8 — rodar de novo nao duplica nada.
    const segunda = runInit(root, OPCOES_DO_CONSUMIDOR)

    assert.deepEqual(segunda.created, [], JSON.stringify(segunda.created))
    const settingsDepois = readFileSync(join(root, SETTINGS_PATH), 'utf8')

    assert.equal(settingsDepois.match(/living-docs@living-docs/g)?.length ?? 0, 1)
  })
})

test('criterio 12: a camada 4 entra com dono e sem skill, sem que nenhum check mude', () => {
  withTempRepo(CONSUMIDOR, root => {
    runInit(root, OPCOES_DO_CONSUMIDOR)

    // Antes de declarar: os documentos de arquitetura caem no corpus de CI-7 e
    // reprovam por falta de dono. E o comportamento correto — o corpus e tudo
    // que vive sob a raiz da documentacao, e nao uma lista de tipos conhecidos.
    const semDono = runValidate(root)

    assert.ok(
      semDono.findings.some(f => f.ruleId === 'CI-7' && f.file.startsWith('docs/architecture/')),
      JSON.stringify(semDono.findings, null, 2),
    )

    // A declaracao: dono, sem skill. Nada alem disso. As duas entradas caem
    // DENTRO do bloco `documents:` — concatenar ao fim do arquivo as penduraria
    // em `consumer-visible-paths` e viraria OwnershipError.
    const ownership = readFileSync(join(root, OWNERSHIP_PATH), 'utf8')
    const camada4 = '  - path: docs/architecture/\n    owner: "@consumidor"\n' + '  - path: docs/domains/\n    owner: "@consumidor"\n'

    writeFileSync(join(root, OWNERSHIP_PATH), ownership.replace('documents:\n', `documents:\n${camada4}`), 'utf8')
    // E o CODEOWNERS, que CI-7 tambem cobra.
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    writeFileSync(join(root, 'CODEOWNERS'), `${codeowners}docs/architecture/    @consumidor\ndocs/domains/    @consumidor\n`, 'utf8')

    const result = runValidate(root)

    // O teste binario: declarar a camada 4 foi dono + linha no CODEOWNERS, e
    // nada mais. Nenhum check precisou mudar para ela passar.
    assert.deepEqual(
      result.findings.filter(f => f.file.startsWith('docs/architecture/') || f.file.startsWith('docs/domains/')),
      [],
      'a camada 4 exigiu mais do que dono e linha no CODEOWNERS',
    )

    // Sem skill dona, CI-10 nao tem par a cruzar: documento sem skill nao e achado.
    assert.deepEqual(
      result.findings.filter(f => f.ruleId === 'CI-10'),
      [],
    )

    // O que resta e a situacao em prosa das decisoes abertas: virar estado da
    // maquina e ato humano (spec §12), e o init nao a converteu. Nao ha achado
    // fora desse, e nenhum deles vem da camada 4.
    for (const finding of result.findings) {
      assert.equal(finding.file, 'docs/decisoes-em-aberto.md', JSON.stringify(finding))
    }
  })
})
