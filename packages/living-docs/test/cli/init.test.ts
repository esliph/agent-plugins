import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { OWNERSHIP_FILE, runInit } from '../../src/cli/init.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { RETIRED_IDS_PATH } from '../../src/ids/citations.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { withTempRepo } from '../helpers/tmp.ts'

function ownershipOf(root: string) {
  return loadLivingDocsConfig(root)
}

/**
 * O que o init deixa de fora além do aviso fixo de que o resto do repositório
 * precisa ser declarado: aquele aviso é do arquivo recém-semeado, e não é o que
 * estes testes medem.
 */
function leftOut(items: readonly string[]): string[] {
  return items.filter(item => !/ownership validate/.test(item))
}

const OPTIONS = {
  owner: '@team-platform',
  dryRun: false,
  stage: 'solo' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'time/living-docs',
}

test('cria a moldura das fases 0–1 num repositório vazio — critério de aceite 1', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    const result = runInit(root, OPTIONS)

    for (const path of [OWNERSHIP_FILE, RETIRED_IDS_PATH, 'docs/open-decisions.md', 'CODEOWNERS']) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir`)
      assert.ok(result.created.includes(path))
    }
    assert.ok(existsSync(join(root, 'docs/decisions/adr')))
    assert.ok(existsSync(join(root, 'docs/decisions/debt')))

    const config = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    assert.match(config, /@team-platform/)
    assert.doesNotMatch(config, /\{\{/)
  })
})

test('o repositório recém-inicializado passa no próprio validate', () => {
  withTempRepo({ 'README.md': '' }, root => {
    runInit(root, OPTIONS)
    const result = runValidate(root)

    assert.deepEqual(result.findings, [])
    assert.equal(result.exitCode, 0)
  })
})

test('RF-0002: é idempotente — a segunda execução não recria nem reescreve nada', () => {
  withTempRepo({ 'README.md': '' }, root => {
    runInit(root, OPTIONS)
    writeFileSync(join(root, 'docs/open-decisions.md'), 'CONTEÚDO DO USUÁRIO\n', 'utf8')

    const second = runInit(root, OPTIONS)

    assert.deepEqual(second.created, [])
    assert.deepEqual(second.adopted, [], 'a segunda execução lê os caminhos do .ownership.yml, não readota')
    assert.ok(second.skipped.includes('docs/open-decisions.md'))
    assert.equal(readFileSync(join(root, 'docs/open-decisions.md'), 'utf8'), 'CONTEÚDO DO USUÁRIO\n')
  })
})

test('RF-0002: adota diretório de ADR preexistente em vez de criar um paralelo', () => {
  withTempRepo({ 'docs/adr/0001-antigo.md': '# antigo\n' }, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.adopted.some(entry => entry.idPrefix === 'ADR' && entry.path === 'docs/adr/'))
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false)
    assert.match(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), /path: docs\/adr\//)
  })
})

test('adoção + segunda execução: nada é readotado, duplicado nem reescrito', () => {
  withTempRepo({ 'docs/adr/0001-antigo.md': '# antigo\n', 'README.md': '' }, root => {
    const first = runInit(root, OPTIONS)

    assert.ok(first.adopted.some(entry => entry.idPrefix === 'ADR' && entry.path === 'docs/adr/'))

    const config = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    const second = runInit(root, OPTIONS)

    assert.deepEqual(second.adopted, [], 'os caminhos vêm do .ownership.yml, não de uma nova varredura')
    assert.deepEqual(second.created, [], 'a segunda execução não cria nada')
    assert.ok(second.skipped.includes('docs/adr/'), 'o diretório adotado é mantido, não recriado')

    // Nenhum paralelo criado, e nem o mapa nem o artefato preexistente reescritos.
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false)
    assert.equal(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), config)
    assert.equal(readFileSync(join(root, 'docs/adr/0001-antigo.md'), 'utf8'), '# antigo\n')
  })
})

test('RF-0002: adota arquivo de open decisions preexistente sob outro nome', () => {
  withTempRepo({ 'docs/decisoes-abertas.md': '# abertas\n', 'README.md': '' }, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.adopted.some(entry => entry.path === 'docs/decisoes-abertas.md'))
  })
})

test('dry-run não escreve nada mas relata o que faria', () => {
  withTempRepo({ 'README.md': '' }, root => {
    const result = runInit(root, {
      owner: '@team',
      dryRun: true,
      stage: 'solo' as const,
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })

    assert.ok(result.created.includes(OWNERSHIP_FILE))
    assert.equal(existsSync(join(root, OWNERSHIP_FILE)), false)
  })
})

const SMALL_TEAM = {
  owner: '@time',
  dryRun: false,
  stage: 'small-team' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'time/living-docs',
}
const REQUIREMENT_FILES = ['docs/requirements/functional.md', 'docs/requirements/non-functional.md', 'docs/requirements/rules.md']

test('RF-0003: --stage solo não cria requisitos', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    const result = runInit(root, OPTIONS)

    assert.equal(result.stage, 'solo')
    for (const file of REQUIREMENT_FILES) {
      assert.equal(existsSync(join(root, file)), false, `${file} não pertence ao estágio solo`)
    }
    assert.equal(readFileSync(join(root, OWNERSHIP_FILE), 'utf8').includes('id-prefix: RN'), false)
    assert.deepEqual(leftOut(result.notInstalled), [])
  })
})

test('RF-0003: --stage small-team cria os três arquivos e as três entradas no .ownership.yml', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    runInit(root, SMALL_TEAM)
    for (const file of REQUIREMENT_FILES) {
      assert.ok(existsSync(join(root, file)), `${file} deveria existir no estágio small-team`)
    }

    const ownership = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    for (const prefix of ['RF', 'RNF', 'RN']) {
      // A vírgula é o que impede `RN` de casar dentro de `RNF`.
      assert.ok(ownership.includes(`id-prefix: ${prefix},`), `${prefix} sem artefato declarado`)
    }
    assert.match(ownership, /collection: sections/)
    assert.match(ownership, /cited-by: \["test\/\*\*", "src\/\*\*"\]/)

    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.match(codeowners, /docs\/requirements\/rules\.md\s+@time/)

    // a moldura recém-criada passa nos próprios checks
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0002: --stage small-team é idempotente: a segunda execução não reescreve nem duplica', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    runInit(root, SMALL_TEAM)
    const antes = REQUIREMENT_FILES.map(file => readFileSync(join(root, file), 'utf8'))
    const ownershipAntes = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    const segunda = runInit(root, SMALL_TEAM)

    assert.deepEqual(segunda.created, [])
    assert.deepEqual(
      REQUIREMENT_FILES.map(file => readFileSync(join(root, file), 'utf8')),
      antes,
    )
    assert.equal(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), ownershipAntes)
  })
})

test('RF-0003: subir de solo para small-team declara os requisitos, sem tocar no que já existia', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    runInit(root, OPTIONS)
    const antes = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    runInit(root, { ...SMALL_TEAM, owner: OPTIONS.owner })
    const depois = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    assert.match(depois, /id-prefix: RN\b/)
    assert.ok(depois.includes('id-prefix: ADR'), 'o artefato que já existia não pode sumir')
    assert.ok(
      antes.split('\n').every(line => depois.includes(line)),
      'nenhuma linha preexistente pode ser reescrita',
    )
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0002: solo depois de small-team não remove os requisitos já criados', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    runInit(root, SMALL_TEAM)
    const result = runInit(root, { ...OPTIONS, owner: SMALL_TEAM.owner })

    assert.deepEqual(result.created, [])
    for (const file of REQUIREMENT_FILES) {
      assert.ok(existsSync(join(root, file)), `${file} não pode desaparecer ao rodar solo`)
    }
    assert.match(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), /id-prefix: RN\b/)
  })
})

test('adota docs/requisitos.md preexistente em vez de criar um paralelo', () => {
  withTempRepo({ 'docs/requisitos.md': '# requisitos antigos\n' }, root => {
    const result = runInit(root, SMALL_TEAM)

    assert.ok(
      result.adopted.some(entry => entry.path === 'docs/requisitos.md'),
      JSON.stringify(result.adopted),
    )
    assert.equal(readFileSync(join(root, 'docs/requisitos.md'), 'utf8'), '# requisitos antigos\n')
    assert.equal(existsSync(join(root, 'docs/requirements/functional.md')), false)
    assert.match(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), /path: docs\/requisitos\.md/)
  })
})

test('RF-0003: small-team não deixa nada de fora nesta versão — Fases 2, 3 e 4 completas', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    const result = runInit(root, SMALL_TEAM)

    assert.deepEqual(leftOut(result.notInstalled), [])
  })
})

test('RF-0003: quando algo realmente fica de fora, o resultado diz o que é', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    runInit(root, OPTIONS) // solo: o .ownership.yml nasce sem RF/RNF/RN
    const file = join(root, OWNERSHIP_FILE)
    // `owned:` continua sendo a chave, mas deixa de ser a linha inteira que o
    // init reconhece. Sem a âncora, subir de estágio não adivinha onde declarar
    // os requisitos.
    const sem = readFileSync(file, 'utf8').replace('\nowned:\n', '\nowned: # âncora removida\n')

    assert.notEqual(sem, readFileSync(file, 'utf8'), 'a âncora precisa ter sido removida de fato')
    writeFileSync(file, sem, 'utf8')

    const result = runInit(root, { ...SMALL_TEAM, owner: OPTIONS.owner })

    assert.ok(
      result.notInstalled.some(item => item.includes(OWNERSHIP_FILE)),
      `o que ficou de fora precisa ser nomeado — ${JSON.stringify(result.notInstalled)}`,
    )
  })
})

test('a semente de requisitos não declara requisito nenhum — o exemplo é literal', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    runInit(root, SMALL_TEAM)
    const rules = readFileSync(join(root, 'docs/requirements/rules.md'), 'utf8')

    assert.match(rules, /RN-nnnn/, 'o exemplo precisa usar o placeholder literal')
    assert.doesNotMatch(rules, /RN-\d{3,4}/, 'a semente não pode nascer com um requisito fantasma')
    assert.equal(runValidate(root).exitCode, 0)
  })
})

test('RF-0004: small-team instala os acordos de trabalho', () => {
  withTempRepo({}, root => {
    const result = runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })

    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md']) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir`)
      assert.ok(result.created.includes(path), `${path} deveria constar como criado`)
    }
    assert.match(readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8'), /@time/)
  })
})

test('RF-0004: solo não instala acordo de trabalho nenhum', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'time/living-docs' })
    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md']) {
      assert.equal(existsSync(join(root, path)), false, `${path} não deveria existir no estágio solo`)
    }
  })
})

test('RF-0004: AGENTS.md existente é adotado; nenhum CLAUDE.md paralelo nasce', () => {
  withTempRepo({ 'AGENTS.md': '# contrato antigo\n' }, root => {
    const result = runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })

    assert.equal(existsSync(join(root, 'CLAUDE.md')), false)
    assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), '# contrato antigo\n')
    assert.ok(result.adopted.some(entry => entry.path === 'AGENTS.md'))
  })
})

test('RF-0004: acordo já escrito não é reescrito na segunda execução', () => {
  withTempRepo({ 'CONTRIBUTING.md': '# do jeito deles\n' }, root => {
    const options = {
      owner: '@time',
      dryRun: false,
      stage: 'small-team' as const,
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    }

    runInit(root, options)
    const segunda = runInit(root, options)

    assert.equal(readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8'), '# do jeito deles\n')
    assert.ok(segunda.skipped.includes('CONTRIBUTING.md'))
    assert.deepEqual(segunda.created, [])
  })
})

test('o init não inventa `watches` — o vínculo código→doc é ato humano', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })
    const config = loadLivingDocsConfig(root)

    assert.deepEqual(config.watches, [])
  })
})

test('RF-0005: small-team instala glossary e charter', () => {
  withTempRepo({}, root => {
    const result = runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })

    for (const path of ['docs/glossary.md', 'docs/charter/constitution.md', 'docs/charter/vision.md']) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir`)
      assert.ok(result.created.includes(path), `${path} deveria constar como criado`)
    }
    assert.match(readFileSync(join(root, 'docs/glossary.md'), 'utf8'), /@time/)
  })
})

test('RF-0005: solo não instala glossary nem charter', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'time/living-docs' })
    for (const path of ['docs/glossary.md', 'docs/charter/constitution.md', 'docs/charter/vision.md']) {
      assert.equal(existsSync(join(root, path)), false, `${path} não deveria existir no estágio solo`)
    }
  })
})

test('RF-0005: glossary já escrito não é reescrito na segunda execução', () => {
  withTempRepo({ 'docs/glossary.md': '# do jeito deles\n' }, root => {
    const options = {
      owner: '@time',
      dryRun: false,
      stage: 'small-team' as const,
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    }

    runInit(root, options)
    const segunda = runInit(root, options)

    assert.equal(readFileSync(join(root, 'docs/glossary.md'), 'utf8'), '# do jeito deles\n')
    assert.ok(segunda.skipped.includes('docs/glossary.md'))
  })
})

test('RN-0016: subir de estágio acrescenta ao CODEOWNERS que já existe, sem reescrever o que estava lá', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'time/living-docs' })
    const antes = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    const segunda = runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })
    const depois = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.ok(
      antes.split('\n').every(line => depois.includes(line)),
      'nenhuma linha preexistente pode ser reescrita',
    )
    assert.match(depois, /docs\/glossary\.md\s+@time/)
    assert.match(depois, /CLAUDE\.md\s+@time/)
    assert.ok(
      segunda.created.some(entry => entry.startsWith('CODEOWNERS (')),
      'o que foi acrescentado ao CODEOWNERS precisa aparecer na saída',
    )

    // Sem as linhas novas, `ownership/owner-coverage` acusaria documento sem quem o revise.
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0002: rodar de novo no mesmo estágio não acrescenta linha ao CODEOWNERS', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })
    const antes = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    const segunda = runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })

    assert.equal(readFileSync(join(root, 'CODEOWNERS'), 'utf8'), antes)
    assert.ok(segunda.skipped.includes('CODEOWNERS'))
  })
})

test('RF-0005: o CODEOWNERS semeado dá dono a glossary e charter', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.match(codeowners, /docs\/glossary\.md\s+@time/)
    assert.match(codeowners, /docs\/charter\/\s+@time/)
  })
})

const PRODUCTION = {
  owner: '@time',
  dryRun: false,
  stage: 'production' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'time/living-docs',
}
const CONTRACT_FILES = ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md']

test('RF-0007: production instala a moldura de contratos, e tudo que small-team instala', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)

    for (const path of CONTRACT_FILES) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir`)
      assert.ok(result.created.includes(path), `${path} deveria constar como criado`)
    }
    // O estágio é cumulativo: nada do small-team pode ter sumido.
    for (const path of ['CONTRIBUTING.md', 'docs/glossary.md', 'docs/requirements/rules.md']) {
      assert.ok(existsSync(join(root, path)), `${path} pertence a production também`)
    }
    assert.match(readFileSync(join(root, 'docs/contracts/errors.md'), 'utf8'), /@time/)
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0007: small-team não instala contrato nenhum', () => {
  withTempRepo({}, root => {
    runInit(root, SMALL_TEAM)
    for (const path of CONTRACT_FILES) {
      assert.equal(existsSync(join(root, path)), false, `${path} não pertence ao estágio small-team`)
    }
  })
})

test('RF-0007: o init não inventa gerador — `generated[]` nasce vazio', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)
    assert.deepEqual(loadLivingDocsConfig(root).generated, [])
    // ...e o exemplo comentado precisa estar lá, senão ninguém descobre o formato.
    assert.match(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), /#\s+- path: docs\/contracts\/openapi\.gen\.yaml/)
  })
})

test('RF-0007: contrato já escrito não é reescrito na segunda execução', () => {
  withTempRepo({ 'docs/contracts/errors.md': '# do jeito deles\n' }, root => {
    runInit(root, PRODUCTION)
    const segunda = runInit(root, PRODUCTION)

    assert.equal(readFileSync(join(root, 'docs/contracts/errors.md'), 'utf8'), '# do jeito deles\n')
    assert.ok(segunda.skipped.includes('docs/contracts/errors.md'))
    assert.deepEqual(segunda.created, [])
  })
})

test('RF-0007: o CODEOWNERS semeado dá dono aos contratos', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)
    assert.match(readFileSync(join(root, 'CODEOWNERS'), 'utf8'), /docs\/contracts\/\s+@time/)
  })
})

test('RF-0009: production instala a moldura de rastro histórico', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/releases/.gitkeep', 'docs/migrations/.gitkeep']) {
      assert.ok(existsSync(join(root, path)), `${path} pertence a production`)
    }

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')

    assert.match(changelog, /^## \[Unreleased\]$/m, 'o CHANGELOG precisa abrir com Unreleased')
    assert.doesNotMatch(changelog, /^---$/m, 'CHANGELOG é voltado ao consumidor: sem frontmatter')
  })
})

test('RF-0009: production declara o artefato REL, para que living-docs/append-only congele release note publicada', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    const config = loadLivingDocsConfig(root)
    const rel = config.artifacts.find(artifact => artifact.idPrefix === 'REL')

    assert.ok(rel, 'sem REL declarado, living-docs/append-only não tem como congelar release note')
    assert.equal(rel?.path, 'docs/releases/')
    assert.equal(rel?.appendOnly, true)
    assert.equal(rel?.skill, 'release-historian')
  })
})

test('RF-0009: production não inventa regra de watches visível ao consumidor', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)
    assert.deepEqual(loadLivingDocsConfig(root).watches, [])
  })
})

test('RF-0009: production não deixa nada da spec §10 de fora', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)

    assert.deepEqual(leftOut(result.notInstalled), [], `production deveria estar completo — ${JSON.stringify(result.notInstalled)}`)
  })
})

test('RF-0009: subir de small-team para production declara REL no .ownership.yml existente', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })
    assert.equal(
      loadLivingDocsConfig(root).artifacts.some(artifact => artifact.idPrefix === 'REL'),
      false,
      'small-team não instala rastro histórico',
    )

    runInit(root, PRODUCTION)
    assert.ok(loadLivingDocsConfig(root).artifacts.some(artifact => artifact.idPrefix === 'REL'))
    assert.equal(runValidate(root).exitCode, 0, 'o repositório recém-subido de estágio precisa passar limpo')
  })
})

test('RF-0012: solo declara o mapa e os IDs retirados como documentos', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'time/living-docs' })
    const documents = ownershipOf(root).documents

    assert.deepEqual(documents.map(document => document.path).sort(), ['.ownership.yml', 'docs/ids-retired.txt'])
    assert.ok(documents.every(document => document.owner === '@time'))

    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.match(codeowners, /docs\/ids-retired\.txt\s+@time/)
    assert.match(codeowners, /^\.ownership\.yml\s+@time/m)
  })
})

test('RF-0012: small-team declara os acordos, a linguagem e os dois papéis', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })
    const documents = ownershipOf(root).documents
    const byPath = new Map(documents.map(document => [document.path, document]))

    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md', 'docs/glossary.md', 'docs/charter/']) {
      assert.ok(byPath.has(path), `${path} deveria estar declarado`)
    }
    assert.equal(byPath.get('CLAUDE.md')?.role, 'agent-contract')
    assert.equal(byPath.get('docs/definition-of-done.md')?.role, 'definition-of-done')
    assert.equal(byPath.get('docs/glossary.md')?.skill, 'glossary-keeper')
    assert.equal(byPath.get('docs/charter/')?.skill, 'charter-keeper')
  })
})

test('RF-0012: production declara contratos e rastro histórico', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'production',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })
    const paths = ownershipOf(root).documents.map(document => document.path)

    for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md', 'CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
      assert.ok(paths.includes(path), `${path} deveria estar declarado`)
    }
  })
})

test('RF-0012: o contrato do agente declarado é o adotado, não o padrão', () => {
  withTempRepo({ 'AGENTS.md': '# contrato preexistente\n' }, root => {
    runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })
    const documents = ownershipOf(root).documents

    assert.ok(documents.some(document => document.path === 'AGENTS.md' && document.role === 'agent-contract'))
    assert.equal(
      documents.some(document => document.path === 'CLAUDE.md'),
      false,
    )

    // O CODEOWNERS segue o mesmo caminho adotado: a linha é de `AGENTS.md`, e
    // nenhuma linha aponta o `CLAUDE.md` que este repositório não tem.
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.match(codeowners, /^AGENTS\.md\s+@time$/m)
    assert.doesNotMatch(codeowners, /CLAUDE\.md/)

    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0002 e RF-0012: subir de estágio acrescenta as entradas que faltam, sem duplicar', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'time/living-docs' })
    runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })

    const paths = ownershipOf(root).documents.map(document => document.path)

    assert.ok(paths.includes('CONTRIBUTING.md'), 'a segunda execução declarou o que criou')
    assert.equal(new Set(paths).size, paths.length, 'nenhuma entrada duplicada')

    // e uma terceira execução não muda mais nada
    const antes = readFileSync(join(root, '.ownership.yml'), 'utf8')

    runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })
    assert.equal(readFileSync(join(root, '.ownership.yml'), 'utf8'), antes)
  })
})

test('RF-0012: sem âncora no .ownership.yml, o init diz o que falta em vez de adivinhar', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'time/living-docs' })
    // arquivo reorganizado à mão: `owned` em fluxo, sem a linha `owned:` sozinha
    writeFileSync(
      join(root, '.ownership.yml'),
      'version: 2\nplugins: [living-docs]\nowned: [{ path: docs/decisions/adr/, owner: "@time", skill: decision-recorder, states: [draft, accepted, superseded], living-docs: { id-prefix: ADR } }]\n',
      'utf8',
    )

    const result = runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'time/living-docs',
    })

    assert.ok(result.notInstalled.some(item => /documents.*owned/.test(item)))
  })
})

test('RN-0019: o template de TDR traz o `pay-when` como exemplo comentado, não inventado', () => {
  const template = readFileSync(join(toolkitRoot(), 'templates/tdr.md'), 'utf8')

  assert.match(template, /# pay-when:/, 'o exemplo é comentado — o init não inventa gatilho')
  assert.doesNotMatch(template, /^pay-when:/m, 'gatilho preenchido de fábrica passaria em living-docs/staleness sem significar nada')
})

test('RF-0015: production declara o rastro histórico como externo, e só ele', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)
    const config = loadLivingDocsConfig(root)
    const byPath = new Map(config.documents.map(document => [document.path, document]))

    for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
      assert.equal(byPath.get(path)?.audience, 'external', `${path} é escrito para quem consome`)
    }
    assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')

    for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md', 'CONTRIBUTING.md', '.ownership.yml']) {
      assert.equal(byPath.get(path)?.audience, 'internal', `${path} não é marcado pelo init`)
    }
    assert.ok(
      config.artifacts.filter(artifact => artifact.idPrefix !== 'REL').every(artifact => artifact.audience === 'internal'),
      'só REL nasce externo',
    )

    assert.deepEqual(leftOut(result.notInstalled), [])
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0015: small-team não declara nada como externo', () => {
  withTempRepo({}, root => {
    runInit(root, SMALL_TEAM)
    const config = loadLivingDocsConfig(root)

    assert.ok(config.documents.every(document => document.audience === 'internal'))
    assert.ok(config.artifacts.every(artifact => artifact.audience === 'internal'))
  })
})

test('RF-0015: entrada já declarada sem a marca vira aviso, e o .ownership.yml não é reescrito', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    // O repositório instalado por uma versão anterior: as mesmas entradas, sem a chave.
    const file = join(root, OWNERSHIP_FILE)
    const semMarca = readFileSync(file, 'utf8').replaceAll('{ audience: external }', '{}').replaceAll(', audience: external', '')

    writeFileSync(file, semMarca, 'utf8')
    assert.ok(
      loadLivingDocsConfig(root).documents.every(document => document.audience === 'internal'),
      'o cenário precisa estar sem marca',
    )

    const changelogAntes = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
    const result = runInit(root, PRODUCTION)

    assert.equal(readFileSync(file, 'utf8'), semMarca, 'o init não reescreve linha já declarada')
    assert.equal(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), changelogAntes)

    for (const alvo of [/CHANGELOG\.md/, /docs\/deprecations\.md/, /docs\/migrations\//, /REL/]) {
      assert.ok(
        result.notInstalled.some(item => alvo.test(item) && /audience: external/.test(item)),
        `esperava aviso para ${alvo} — ${JSON.stringify(result.notInstalled)}`,
      )
    }
  })
})

test('arquivo de ownership v1 existente: o init não cria outro na raiz, e diz que ele precisa ser reescrito', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 1\nartifacts: []\n' }, root => {
    const result = runInit(root, { owner: '@time', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: null })

    assert.equal(existsSync(join(root, '.ownership.yml')), false)
    assert.ok(result.skipped.includes('docs/.ownership.yml'))
    assert.ok(result.notInstalled.some(item => /docs\/\.ownership\.yml.*does not read as v2.*rewrite/.test(item)))
  })
})

test('o init semeia a v2 na raiz e avisa que o resto do repositório precisa de dono', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, root => {
    const result = runInit(root, OPTIONS)
    const source = readFileSync(join(root, '.ownership.yml'), 'utf8')

    assert.match(source, /^version: 2$/m)
    assert.match(source, /^plugins: \[living-docs\]$/m)
    assert.match(source, /^ignore: \["node_modules\/\*\*", "\*\*\/node_modules\/\*\*"\]$/m)
    assert.equal(existsSync(join(root, 'docs/.ownership.yml')), false)
    assert.ok(
      result.notInstalled.some(item => /owned/.test(item) && /ownership validate/.test(item)),
      `esperava o aviso do resto do repositório — ${JSON.stringify(result.notInstalled)}`,
    )
  })
})
