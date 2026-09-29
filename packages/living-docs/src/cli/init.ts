import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseCodeowners } from '@esliph/ownership'
import { loadLivingDocsConfig } from '../config/ownership.ts'
import type { Audience, DocumentRole, LivingDocsConfig } from '../config/ownership.ts'
import { SETTINGS_PATH, SettingsError, mergeSettings } from '../config/claude-settings.ts'
import { RETIRED_IDS_PATH } from '../ids/citations.ts'
import { detectIdFormat } from '../ids/detect.ts'
import type { DetectedFormat } from '../ids/detect.ts'
import type { IdFormat } from '../docs/schema.ts'
import { templatesDir } from '../core/roots.ts'
import { todayIso } from '../core/dates.ts'

const TEMPLATES_DIR = templatesDir()

/** Onde o `init` escreve o arquivo de ownership: a raiz de quem instala. */
export const OWNERSHIP_FILE = '.ownership.yml'

/** Os candidatos que o núcleo lê, na ordem dele. Um só pode existir. */
const OWNERSHIP_CANDIDATES: readonly string[] = [OWNERSHIP_FILE, 'docs/.ownership.yml']

/**
 * Estágios de maturidade (spec §10, `SK-0` passo 2). Cada estágio instala o
 * conjunto mínimo que ele pede — e nada além. `multi-team` existe desde o
 * fechamento porque passa a ter enforcement atrás dele: é o estágio que instala
 * a Fase 7 (`RN-0025`, `ADR-0012`). Um rótulo sem conteúdo é a wiki morta
 * nascendo de fábrica.
 */
export const STAGES = ['solo', 'small-team', 'production', 'multi-team'] as const
export type Stage = (typeof STAGES)[number]

type Kind = 'ADR' | 'DA' | 'TDR' | 'RF' | 'RNF' | 'RN' | 'REL'

/** Artefatos que só o estágio `small-team` em diante instala. */
const REQUIREMENT_KINDS: readonly Kind[] = ['RF', 'RNF', 'RN']

export const DEFAULT_PATHS: Readonly<Record<Kind, string>> = Object.freeze({
  ADR: 'docs/decisions/adr/',
  DA: 'docs/open-decisions.md',
  TDR: 'docs/decisions/debt/',
  RF: 'docs/requirements/functional.md',
  RNF: 'docs/requirements/non-functional.md',
  RN: 'docs/requirements/rules.md',
  REL: 'docs/releases/',
})

const REQUIREMENT_TITLES: Readonly<Record<'RF' | 'RNF' | 'RN', string>> = Object.freeze({
  RF: 'Functional requirements',
  RNF: 'Non-functional requirements',
  RN: 'Business rules',
})

/** Caminhos varridos por `cited-by` para provar cobertura de requisito (living-docs/citation-coverage). */
const REQUIREMENT_CITED_BY: Readonly<Record<'RF' | 'RNF' | 'RN', readonly string[]>> = Object.freeze({
  RF: ['test/**'],
  RNF: ['test/**'],
  RN: ['test/**', 'src/**'],
})

/** Acordos de trabalho (SK-6), instalados a partir do estágio `small-team` (spec §10). */
const WORKING_AGREEMENTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'CONTRIBUTING.md', template: 'contributing.md' },
  { path: 'docs/definition-of-done.md', template: 'definition-of-done.md' },
])

/** Linguagem e intenção (SK-1, SK-2), instalados a partir do estágio `small-team` (spec §10, Fase 4). */
const LANGUAGE_AND_INTENT: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/glossary.md', template: 'glossary.md' },
  { path: 'docs/charter/constitution.md', template: 'constitution.md' },
  { path: 'docs/charter/vision.md', template: 'vision.md' },
])

/** Contratos (SK-5), instalados a partir do estágio `production` (spec §10, Fase 5). */
const CONTRACTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/contracts/errors.md', template: 'errors.md' },
  { path: 'docs/contracts/versioning-policy.md', template: 'versioning-policy.md' },
])

/** Rastro histórico (SK-7), instalado a partir do estágio `production` (spec §10, Fase 6). */
const HISTORY: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'CHANGELOG.md', template: 'changelog.md' },
  { path: 'docs/deprecations.md', template: 'deprecations.md' },
])

/** Diretórios de item por arquivo que o rastro histórico usa (spec §3). */
const HISTORY_DIRS: readonly string[] = Object.freeze(['docs/migrations/'])

/**
 * Documento que o `init` declara em `documents:` (`RF-0012`, `ADR-0008`).
 *
 * Todo documento que o `init` cria e que não tem família de IDs entra aqui: um
 * documento criado e não declarado é um repositório que reprova no próprio
 * `ownership/owner-coverage` na primeira execução.
 */
interface DocumentSeed {
  path: string
  skill: string | null
  role: DocumentRole | null
  /** `external` para o que é escrito para quem vem de fora (`RF-0015`). */
  audience: Audience
}

/** Declarados em todo estágio: os dois nascem já no `solo`. */
const BASE_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: OWNERSHIP_FILE, skill: 'living-docs-bootstrap', role: null, audience: 'internal' },
  { path: RETIRED_IDS_PATH, skill: 'living-docs-bootstrap', role: null, audience: 'internal' },
])

const SMALL_TEAM_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'CONTRIBUTING.md', skill: 'working-agreements-keeper', role: null, audience: 'internal' },
  { path: 'docs/definition-of-done.md', skill: 'working-agreements-keeper', role: 'definition-of-done', audience: 'internal' },
  { path: 'docs/glossary.md', skill: 'glossary-keeper', role: null, audience: 'internal' },
  { path: 'docs/charter/', skill: 'charter-keeper', role: null, audience: 'internal' },
])

/**
 * O rastro histórico nasce externo: é escrito para quem consome (`RF-0015`).
 * Os contratos não — citam as próprias fontes, e marcá-los é decisão de quem os
 * mantém.
 */
const PRODUCTION_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'docs/contracts/errors.md', skill: 'contract-keeper', role: null, audience: 'internal' },
  { path: 'docs/contracts/versioning-policy.md', skill: 'contract-keeper', role: null, audience: 'internal' },
  { path: 'CHANGELOG.md', skill: 'release-historian', role: null, audience: 'external' },
  { path: 'docs/deprecations.md', skill: 'release-historian', role: null, audience: 'external' },
  { path: 'docs/migrations/', skill: 'release-historian', role: null, audience: 'external' },
])

/** O contrato do agente: adota `AGENTS.md` quando ele já existe (`RF-0002`). */
function agentContractPath(root: string): string {
  return existsSync(join(root, 'AGENTS.md')) ? 'AGENTS.md' : 'CLAUDE.md'
}

function documentSeeds(root: string, stage: Stage): DocumentSeed[] {
  if (stage === 'solo') {
    return [...BASE_DOCUMENTS]
  }

  const seeds: DocumentSeed[] = [
    ...BASE_DOCUMENTS,
    ...SMALL_TEAM_DOCUMENTS,
    { path: agentContractPath(root), skill: 'working-agreements-keeper', role: 'agent-contract', audience: 'internal' },
  ]

  if (reaches(stage, 5)) {
    seeds.push(...PRODUCTION_DOCUMENTS)
  }

  return seeds
}

function documentEntry(seed: DocumentSeed, owner: string): string {
  const lines = [`  - path: ${seed.path}`, `    owner: "${owner}"`]
  const block: string[] = []

  if (seed.skill !== null) {
    lines.push(`    skill: ${seed.skill}`)
  }
  if (seed.role !== null) {
    block.push(`role: ${seed.role}`)
  }
  if (seed.audience === 'external') {
    block.push('audience: external')
  }
  lines.push(`    living-docs: {${block.length === 0 ? '' : ` ${block.join(', ')} `}}`)

  return lines.join('\n')
}

/** As entradas de documento de `owned` (o bloco `living-docs:` sem `id-prefix`). */
function documentsBlock(root: string, owner: string, stage: Stage): string {
  const entries = documentSeeds(root, stage).map(seed => documentEntry(seed, owner))

  return [
    // Regra de origem: ADR-0008 e ADR-0029.
    '  # Document: a `living-docs:` block without `id-prefix`. It has an owner and no ID family.',
    '  # `role` is a closed vocabulary: agent-contract, definition-of-done.',
    '  # `audience` says who reads it: absent means internal; external rejects artifact IDs in the text.',
    ...entries,
  ].join('\n')
}

/**
 * Caminhos onde um artefato equivalente pode já existir sob outro nome.
 * Adotar o que existe; nunca criar um paralelo (spec §5, SK-0 passo 1).
 *
 * As listas de requisito não se cruzam por acidente: `resolvePath` marca cada
 * caminho adotado, para que duas famílias nunca acabem donas do mesmo arquivo.
 */
const ADOPTION_CANDIDATES: Readonly<Record<Kind, readonly string[]>> = Object.freeze({
  ADR: ['docs/adr/', 'adr/', 'doc/adr/', 'docs/architecture/decisions/'],
  DA: ['docs/decisoes-abertas.md', 'docs/decisoes-em-aberto.md', 'docs/open-questions.md', 'docs/decision-backlog.md'],
  TDR: ['docs/debt/', 'docs/tech-debt/', 'docs/divida/'],
  RF: [
    'docs/requisitos-funcionais.md',
    'docs/functional-requirements.md',
    'docs/requisitos.md',
    'docs/requirements.md',
    'spec/functional.md',
    'docs/spec/functional.md',
  ],
  RNF: ['docs/requisitos-nao-funcionais.md', 'docs/non-functional-requirements.md', 'spec/non-functional.md', 'docs/spec/non-functional.md'],
  RN: ['docs/regras-de-negocio.md', 'docs/business-rules.md', 'spec/rules.md', 'docs/spec/rules.md'],
  REL: ['docs/release-notes/', 'releases/', 'docs/release/'],
})

export interface InitOptions {
  owner: string
  dryRun: boolean
  stage: Stage
  /** A forma escrita declarada por quem instala (`ADR-0011`). */
  idFormat: IdFormat
  /** Como o CLI é chamado no CI de quem instala (`DA-0003`). */
  invoke: string
  /** Como o CLI do núcleo é chamado no CI de quem instala. Padrão `npx ownership` (TDR-0003). */
  invokeOwnership: string
  /** Repositório do marketplace do plugin, ou `null` para não registrar (`DA-0003`). */
  marketplace: string | null
}

export interface InitResult {
  created: string[]
  skipped: string[]
  adopted: { idPrefix: string; path: string }[]
  stage: Stage
  /** O que este estágio pediria e esta versão do toolkit ainda não entrega. */
  notInstalled: string[]
  /** A forma escrita que o inventário achou, quando difere da declarada (`RF-0014`). */
  detected: DetectedFormat | null
}

/** Onde o workflow instalado mora no repositório de quem instala. */
export const WORKFLOW_PATH = '.github/workflows/living-docs.yml'

/**
 * As fases da spec §10 que cada estágio instala. É daqui que sai o conjunto de
 * enforcement do estágio — nem mais, nem menos (`RN-0025`, `ADR-0012`).
 */
const STAGE_PHASES: Readonly<Record<Stage, readonly number[]>> = Object.freeze({
  solo: [0, 1],
  'small-team': [0, 1, 2, 3, 4],
  production: [0, 1, 2, 3, 4, 5, 6],
  'multi-team': [0, 1, 2, 3, 4, 5, 6, 7],
})

/** Este estágio chega até a fase dada? É a pergunta que substitui comparar strings. */
function reaches(stage: Stage, phase: number): boolean {
  return STAGE_PHASES[stage].includes(phase)
}

/**
 * Os passos que este estágio acrescenta ao `validate`, que todo estágio roda.
 * Cada passo existe porque uma fase do estágio instalou o check que ele chama.
 */
function workflowSteps(stage: Stage, invoke: string, invokeOwnership: string): string {
  const phases = STAGE_PHASES[stage]
  const steps: string[] = []

  if (phases.includes(6)) {
    steps.push(
      [
        '',
        '      - name: Code→doc link and CHANGELOG entry in the PR diff',
        "        if: github.event_name == 'pull_request'",
        `        run: ${invokeOwnership} validate --base \${{ github.event.pull_request.base.sha }}`,
      ].join('\n'),
    )
  }

  if (phases.includes(7)) {
    steps.push(
      [
        '',
        '      - name: Living documentation in the PR diff',
        "        if: github.event_name == 'pull_request'",
        `        run: ${invoke} validate --base \${{ github.event.pull_request.base.sha }}`,
      ].join('\n'),
    )
  }

  return steps.length === 0 ? '' : `${steps.join('\n')}\n`
}

/**
 * O que este estágio pede e esta versão ainda não entrega. `solo` e `small-team`
 * saem vazios: as Fases 0–4 estão completas.
 */
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
  // `production` cobre as Fases 5 e 6 da spec §10, e as duas existem.
  production: [],
  // `multi-team` cobre a Fase 7 da spec §10, e ela existe.
  'multi-team': [],
})

function template(name: string, values: Record<string, string>): string {
  let source = readFileSync(join(TEMPLATES_DIR, name), 'utf8')

  for (const [key, value] of Object.entries(values)) {
    source = source.replaceAll(`{{${key}}}`, value)
  }

  return source
}

/**
 * Idempotência (spec §5): se já existe `.ownership.yml`, os caminhos vêm dele —
 * uma segunda execução não pode reinterpretar a estrutura que a primeira criou.
 */
function resolvePath(root: string, kind: Kind, existing: LivingDocsConfig | null, result: InitResult, claimed: Set<string>): string {
  const declared = existing?.artifacts.find(artifact => artifact.idPrefix === kind)

  if (declared) {
    claimed.add(declared.path)

    return declared.path
  }

  for (const candidate of ADOPTION_CANDIDATES[kind]) {
    if (claimed.has(candidate)) {
      continue
    }
    if (existsSync(join(root, candidate))) {
      result.adopted.push({ idPrefix: kind, path: candidate })
      claimed.add(candidate)

      return candidate
    }
  }
  claimed.add(DEFAULT_PATHS[kind])

  return DEFAULT_PATHS[kind]
}

function writeIfAbsent(root: string, relative: string, content: string, options: InitOptions, result: InitResult): void {
  if (existsSync(join(root, relative))) {
    result.skipped.push(relative)

    return
  }
  result.created.push(relative)
  if (options.dryRun) {
    return
  }

  const absolute = join(root, relative)

  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, content, 'utf8')
}

function ensureDirectory(root: string, relative: string, options: InitOptions, result: InitResult): void {
  if (existsSync(join(root, relative))) {
    result.skipped.push(relative)

    return
  }
  result.created.push(relative)
  if (options.dryRun) {
    return
  }

  mkdirSync(join(root, relative), { recursive: true })
  writeFileSync(join(root, relative, '.gitkeep'), '', 'utf8')
}

/** O bloco de artefatos de requisito do `.ownership.yml`, ou vazio no estágio solo. */
function requirementsBlock(owner: string, paths: Record<Kind, string>, stage: Stage): string {
  if (stage === 'solo') {
    return ''
  }

  const entries = REQUIREMENT_KINDS.map(kind => {
    const citedBy = REQUIREMENT_CITED_BY[kind as 'RF' | 'RNF' | 'RN'].map(glob => `"${glob}"`).join(', ')

    return [
      `  - path: ${paths[kind]}`,
      `    owner: "${owner}"`,
      '    skill: requirements-keeper',
      '    states: [draft, active, revoked]',
      '    format: { collection: sections, key: first-token }',
      `    living-docs: { id-prefix: ${kind}, cited-by: [${citedBy}] }`,
    ].join('\n')
  })

  return `\n${entries.join('\n\n')}\n`
}

/** O artefato REL do `.ownership.yml`, ou vazio fora do estágio `production`. */
function releasesBlock(owner: string, path: string, stage: Stage): string {
  if (!reaches(stage, 6)) {
    return ''
  }

  return (
    '\n' +
    [
      `  - path: ${path}`,
      `    owner: "${owner}"`,
      '    skill: release-historian',
      '    states: [draft, published]',
      '    # A release note is read by whoever consumes it: the text cites no artifact ID.',
      // Rule of origin: spec §5, SK-7, rule 4.
      '    # A published release note is frozen.',
      '    living-docs: { id-prefix: REL, audience: external, append-only: true, mutable-fields: [status, last-reviewed] }',
    ].join('\n') +
    '\n'
  )
}

export function runInit(root: string, options: InitOptions): InitResult {
  const result: InitResult = {
    created: [],
    skipped: [],
    adopted: [],
    stage: options.stage,
    notInstalled: [...NOT_INSTALLED[options.stage]],
    detected: null,
  }

  // Um arquivo de ownership já existe? Então é dele que vêm os caminhos, e o
  // init não escreve outro ao lado: dois candidatos travam toda leitura por
  // ambiguidade. Arquivo que não lê na v2 é relatado, nunca sobrescrito.
  const existingFile = OWNERSHIP_CANDIDATES.find(candidate => existsSync(join(root, candidate))) ?? null
  let existing: LivingDocsConfig | null = null

  if (existingFile !== null) {
    try {
      existing = loadLivingDocsConfig(root)
    } catch (err) {
      result.notInstalled.push(
        `${existingFile} — the file exists and does not read as v2 (${err instanceof Error ? err.message : String(err)}); ` +
          'rewrite it as v2 by hand, guided by the CHANGELOG. init neither overwrites it nor creates another next to it',
      )
    }
  }

  const claimed = new Set<string>()
  const kinds: Kind[] =
    options.stage === 'solo'
      ? ['ADR', 'DA', 'TDR']
      : reaches(options.stage, 6)
        ? ['ADR', 'DA', 'TDR', ...REQUIREMENT_KINDS, 'REL']
        : ['ADR', 'DA', 'TDR', ...REQUIREMENT_KINDS]
  const paths = Object.fromEntries(kinds.map(kind => [kind, resolvePath(root, kind, existing, result, claimed)])) as Record<Kind, string>

  // Relatar, nunca adotar em silêncio (`RF-0014`): adoção silenciosa de formato
  // é a mesma classe de erro que adoção silenciosa de caminho.
  const detected = detectIdFormat(root, Object.values(paths))

  result.detected =
    detected !== null && (detected.format.separator !== options.idFormat.separator || detected.format.padding !== options.idFormat.padding) ? detected : null

  const requirementsCodeowners = options.stage === 'solo' ? '' : REQUIREMENT_KINDS.map(kind => `${paths[kind]}    ${options.owner}\n`).join('')

  const values = {
    OWNER: options.owner,
    TODAY: todayIso(),
    ADR_PATH: paths.ADR,
    DA_PATH: paths.DA,
    TDR_PATH: paths.TDR,
    REQUIREMENTS_BLOCK: requirementsBlock(options.owner, paths, options.stage),
    REQUIREMENTS_CODEOWNERS: requirementsCodeowners,
    // O contrato do agente entra no CODEOWNERS pelo caminho **adotado**, o mesmo
    // que `documents:` declara: um repositório com `AGENTS.md` que recebesse a
    // linha de `CLAUDE.md` nasceria com o contrato sem dono do lado de quem
    // revisa — e reprovaria no próprio `ownership/owner-coverage` na primeira execução (`RF-0012`).
    AGREEMENTS_CODEOWNERS:
      options.stage === 'solo'
        ? ''
        : `CONTRIBUTING.md    ${options.owner}\ndocs/definition-of-done.md    ${options.owner}\n` +
          `${agentContractPath(root)}    ${options.owner}\ndocs/glossary.md    ${options.owner}\n` +
          `docs/charter/    ${options.owner}\n`,
    CONTRACTS_CODEOWNERS: reaches(options.stage, 5) ? `docs/contracts/    ${options.owner}\n` : '',
    RELEASES_BLOCK: releasesBlock(options.owner, paths.REL ?? DEFAULT_PATHS.REL, options.stage),
    HISTORY_CODEOWNERS: reaches(options.stage, 6)
      ? `CHANGELOG.md    ${options.owner}\ndocs/deprecations.md    ${options.owner}\ndocs/releases/    ${options.owner}\ndocs/migrations/    ${options.owner}\n`
      : '',
    DOCUMENTS_BLOCK: documentsBlock(root, options.owner, options.stage),
    RETIRED_CODEOWNERS: `${RETIRED_IDS_PATH}    ${options.owner}`,
    ID_SEPARATOR: options.idFormat.separator,
    ID_PADDING: String(options.idFormat.padding),
    INVOKE: options.invoke,
    INVOKE_OWNERSHIP: options.invokeOwnership,
    WORKFLOW_STEPS: workflowSteps(options.stage, options.invoke, options.invokeOwnership),
  }

  if (existingFile === null) {
    writeIfAbsent(root, OWNERSHIP_FILE, template('ownership.yml', values), options, result)
    // O init não sabe onde mora o código de quem instala, e `ownership validate`
    // exige dono para todo arquivo do repositório: dizer é o que resta a fazer.
    result.notInstalled.push(
      `the rest of the repository in \`owned\` of ${OWNERSHIP_FILE} — \`ownership validate\` requires an owner for every file, ` +
        'and init does not know where your code lives; declare it (or take it out of governance under `ignore`) before running it',
    )
  } else {
    result.skipped.push(existingFile)
  }
  writeIfAbsent(root, RETIRED_IDS_PATH, template('ids-retired.txt', values), options, result)
  writeIfAbsent(root, paths.DA, template('open-decisions.md', values), options, result)
  const codeowners = template('CODEOWNERS', values)

  if (existsSync(join(root, 'CODEOWNERS'))) {
    declareCodeowners(root, options, result, codeowners)
  } else {
    writeIfAbsent(root, 'CODEOWNERS', codeowners, options, result)
  }
  ensureDirectory(root, paths.ADR, options, result)
  ensureDirectory(root, paths.TDR, options, result)

  if (options.stage !== 'solo') {
    // Subir de estágio num repositório que já rodou `solo`: os três artefatos
    // precisam ser declarados, senão os arquivos nascem sem dono — e artefato
    // órfão não é enforceável (spec §3). Só entra o que ainda não está lá.
    const faltando = REQUIREMENT_KINDS.filter(kind => !existing?.artifacts.some(artifact => artifact.idPrefix === kind))

    if (existing && faltando.length > 0) {
      declareArtifacts(root, options, result, values.REQUIREMENTS_BLOCK, 'artefatos RF, RNF e RN', existing.rootFile)
    }

    for (const kind of REQUIREMENT_KINDS) {
      const title = REQUIREMENT_TITLES[kind as 'RF' | 'RNF' | 'RN']

      writeIfAbsent(root, paths[kind], template('requirements.md', { ...values, TITLE: title, PREFIX: kind }), options, result)
    }

    for (const agreement of WORKING_AGREEMENTS) {
      writeIfAbsent(root, agreement.path, template(agreement.template, values), options, result)
    }

    for (const agreement of LANGUAGE_AND_INTENT) {
      writeIfAbsent(root, agreement.path, template(agreement.template, values), options, result)
    }

    if (reaches(options.stage, 5)) {
      for (const contract of CONTRACTS) {
        writeIfAbsent(root, contract.path, template(contract.template, values), options, result)
      }

      // Subir de estágio: o REL precisa ser declarado num `.ownership.yml` que
      // já existe, senão a release note nasce sem dono — e artefato órfão não é
      // enforceável (spec §3), nem congelável por living-docs/append-only.
      if (existing && !existing.artifacts.some(artifact => artifact.idPrefix === 'REL')) {
        declareArtifacts(root, options, result, values.RELEASES_BLOCK, 'artefato REL', existing.rootFile)
      }

      for (const item of HISTORY) {
        writeIfAbsent(root, item.path, template(item.template, values), options, result)
      }
      ensureDirectory(root, paths.REL ?? DEFAULT_PATHS.REL, options, result)
      for (const dir of HISTORY_DIRS) {
        ensureDirectory(root, dir, options, result)
      }
    }

    // O contrato do agente pode já existir com outro nome. Adotar, nunca duplicar
    // (RF-0002): dois contratos é a garantia de que um deles está errado.
    const contract = agentContractPath(root)

    if (contract === 'AGENTS.md') {
      result.adopted.push({ idPrefix: 'contrato do agente', path: 'AGENTS.md' })
    } else {
      writeIfAbsent(root, contract, template('agent-contract.md', values), options, result)
    }
  }

  // O enforcement do estágio (`RF-0013`). Mesclar, nunca sobrescrever: o
  // workflow que já existe é de quem o escreveu.
  writeIfAbsent(root, WORKFLOW_PATH, template('workflow.yml', values), options, result)
  declarePlugin(root, options, result)

  // O bloco vai no template na primeira execução; aqui é o caso de quem já tinha
  // um `.ownership.yml` — de uma versão anterior, ou de um estágio menor.
  if (existing !== null) {
    declareDocuments(root, options, result, existing)
    reportUnmarkedExternal(root, options.stage, result, existing)
  }

  return result
}

/**
 * O registro que liga os hooks na sessão (`RF-0013`).
 *
 * Sem `--marketplace`, nada é escrito: a fonte do marketplace não se adivinha
 * (`DA-0003`), e o init não inventa — mesma política de `watches` e
 * `generated[]`. Settings ilegível também não é tocado: consertar configuração
 * alheia apaga trabalho de alguém.
 */
function declarePlugin(root: string, options: InitOptions, result: InitResult): void {
  if (options.marketplace === null) {
    result.notInstalled.push(
      // Regra de origem: DA-0003.
      `plugin registration in ${SETTINGS_PATH} — without \`--marketplace <owner/repo>\` the source cannot be ` +
        'guessed; the hooks do not come up in the session until it is declared',
    )

    return
  }

  const file = join(root, SETTINGS_PATH)
  const current = existsSync(file) ? readFileSync(file, 'utf8') : null

  let merged

  try {
    merged = mergeSettings(current, options.marketplace)
  } catch (err) {
    result.notInstalled.push(
      `plugin registration in ${SETTINGS_PATH} — ${err instanceof SettingsError ? err.message : String(err)}; ` +
        'declare it by hand so as not to lose what is already there',
    )

    return
  }

  if (merged.added.length === 0) {
    result.skipped.push(SETTINGS_PATH)

    return
  }

  result.created.push(`${SETTINGS_PATH} (${merged.added.join(', ')})`)
  if (options.dryRun) {
    return
  }
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, merged.text, 'utf8')
}

const OWNED_ANCHOR = '\nowned:\n'

function insertAfterOwned(source: string, entries: string): string | null {
  return source.includes(OWNED_ANCHOR) ? source.replace(OWNED_ANCHOR, `${OWNED_ANCHOR}${entries.replace(/^\n+/, '').replace(/\n*$/, '\n')}`) : null
}

/**
 * Acrescenta um bloco de artefatos ao arquivo de ownership que já existe.
 * Nada é reescrito: as entradas entram logo depois de `owned:`, porque a ordem
 * de uma lista YAML não significa nada. Sem essa âncora — um arquivo
 * reorganizado à mão — o init não adivinha: ele diz o que falta e deixa a edição
 * para quem é dono do arquivo.
 */
function declareArtifacts(root: string, options: InitOptions, result: InitResult, block: string, what: string, file: string): void {
  const path = join(root, file)
  const source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  const next = insertAfterOwned(source, block)

  if (next === null) {
    result.notInstalled.push(`${what} in ${file} — \`owned:\` anchor not found; ` + 'declare them by hand so the artifacts have an owner')

    return
  }

  result.created.push(`${file} (${what})`)
  if (options.dryRun) {
    return
  }
  writeFileSync(path, next, 'utf8')
}

/**
 * Acrescenta ao CODEOWNERS que já existe as linhas que este estágio pede e que
 * não estão lá.
 *
 * O CODEOWNERS nasce inteiro na primeira execução, mas quem sobe de estágio já
 * tem um — e `writeIfAbsent` sozinho o deixaria congelado na forma do estágio
 * anterior, com os documentos novos nascendo sem quem os revise. `ownership/owner-coverage` cobra o
 * dono nos dois lugares, então o `documents:` sem a linha correspondente é
 * meio dono (`RN-0016`).
 *
 * Nada é reescrito: só se acrescenta, e a comparação é por padrão — a linha que
 * já existe fica como o dono do arquivo a escreveu, mesmo com outro `@handle`.
 */
function declareCodeowners(root: string, options: InitOptions, result: InitResult, rendered: string): void {
  const file = join(root, 'CODEOWNERS')
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const known = new Set(parseCodeowners(source).map(entry => entry.pattern))

  const faltando = parseCodeowners(rendered)
    .filter(entry => !known.has(entry.pattern))
    .map(entry => `${entry.pattern}    ${entry.owners.join(' ')}`)

  if (faltando.length === 0) {
    result.skipped.push('CODEOWNERS')

    return
  }

  result.created.push(`CODEOWNERS (${faltando.length} linha(s))`)
  if (options.dryRun) {
    return
  }
  writeFileSync(file, `${source.replace(/\n*$/, '\n')}${faltando.join('\n')}\n`, 'utf8')
}

/**
 * Declara em `owned` o documento que ainda não está lá, num arquivo de ownership
 * que já existe. A âncora é uma só, `owned:`: sem ela — arquivo reorganizado à
 * mão — o init **não adivinha**: ele diz o que falta e deixa a edição para quem é
 * dono do arquivo. Mesma política de `declareArtifacts`.
 */
function declareDocuments(root: string, options: InitOptions, result: InitResult, existing: LivingDocsConfig): void {
  const declared = new Set(existing.documents.map(document => document.path))
  const faltando = documentSeeds(root, options.stage).filter(seed => !declared.has(seed.path))

  if (faltando.length === 0) {
    return
  }

  const file = existing.rootFile
  const path = join(root, file)
  const source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  const entries = faltando.map(seed => documentEntry(seed, options.owner)).join('\n')
  const next = insertAfterOwned(source, entries)

  if (next === null) {
    result.notInstalled.push(`documents in ${file} — \`owned:\` anchor not found; ` + 'declare the documents by hand so they have an owner')

    return
  }

  result.created.push(`${file} (${faltando.length} documento(s))`)
  if (options.dryRun) {
    return
  }
  writeFileSync(path, next, 'utf8')
}

/**
 * Relata a entrada já declarada que este estágio marcaria como externa e que
 * não está marcada (`RF-0015`).
 *
 * Não reescreve a linha: mesma política de `declareDocuments`,
 * `declareArtifacts` e `declareCodeowners`. A entrada é de quem a escreveu, e
 * marcá-la liga `living-docs/external-audience` sobre um texto que talvez ainda cite ID — a decisão é de
 * quem responde por ele.
 */
function reportUnmarkedExternal(root: string, stage: Stage, result: InitResult, existing: LivingDocsConfig): void {
  for (const seed of documentSeeds(root, stage)) {
    if (seed.audience !== 'external') {
      continue
    }
    const declared = existing.documents.find(document => document.path === seed.path)

    if (declared !== undefined && declared.audience !== 'external') {
      result.notInstalled.push(unmarkedExternal(`\`${seed.path}\``, existing.rootFile))
    }
  }

  const rel = existing.artifacts.find(artifact => artifact.idPrefix === 'REL')

  if (reaches(stage, 6) && rel !== undefined && rel.audience !== 'external') {
    result.notInstalled.push(unmarkedExternal('o artefato REL', existing.rootFile))
  }
}

function unmarkedExternal(what: string, file: string): string {
  return (
    `audience: external for ${what}, in ${file} — the entry was already declared without the mark, ` +
    'and init does not rewrite a line already written; marking it is what turns on the external-text check for it'
  )
}
