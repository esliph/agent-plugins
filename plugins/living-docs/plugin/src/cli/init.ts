import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseCodeowners } from '@esliph/ownership'
import { loadLivingDocsConfig, primaryArtifact } from '../config/ownership.ts'
import type { Audience, DocumentRole, LivingDocsConfig } from '../config/ownership.ts'
import { SETTINGS_PATH, SettingsError, mergeSettings } from '../config/claude-settings.ts'
import { RETIRED_IDS_PATH } from '../ids/citations.ts'
import { detectIdFormat } from '../ids/detect.ts'
import type { DetectedFormat } from '../ids/detect.ts'
import type { IdFormat } from '../docs/schema.ts'
import { templatesDir } from '../core/roots.ts'
import { todayIso } from '../core/dates.ts'

const TEMPLATES_DIR = templatesDir()

/** Where `init` writes the ownership file: the installer's root. */
export const OWNERSHIP_FILE = '.ownership.yml'

/** The candidates the core reads, in its order. Only one may exist. */
const OWNERSHIP_CANDIDATES: readonly string[] = [OWNERSHIP_FILE, 'docs/.ownership.yml']

/**
 * Maturity stages (spec §10, `SK-0` step 2). Each stage installs the
 * minimum set it asks for — and nothing beyond. `multi-team` has existed since the
 * closing because it now has enforcement behind it: it is the stage that installs
 * Phase 7 (`RN-0025`, `ADR-0012`). A label with no content is a dead wiki
 * being born at the factory.
 */
export const STAGES = ['solo', 'small-team', 'production', 'multi-team'] as const
export type Stage = (typeof STAGES)[number]

type Kind = 'ADR' | 'DA' | 'TDR' | 'RF' | 'RNF' | 'RN' | 'REL'

/** Artifacts that only the `small-team` stage onward installs. */
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

/** Paths scanned by `cited-by` to prove requirement coverage (living-docs/citation-coverage). */
const REQUIREMENT_CITED_BY: Readonly<Record<'RF' | 'RNF' | 'RN', readonly string[]>> = Object.freeze({
  RF: ['test/**'],
  RNF: ['test/**'],
  RN: ['test/**', 'src/**'],
})

/** Working agreements (SK-6), installed from the `small-team` stage onward (spec §10). */
const WORKING_AGREEMENTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'CONTRIBUTING.md', template: 'contributing.md' },
  { path: 'docs/definition-of-done.md', template: 'definition-of-done.md' },
])

/** Language and intent (SK-1, SK-2), installed from the `small-team` stage onward (spec §10, Phase 4). */
const LANGUAGE_AND_INTENT: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/glossary.md', template: 'glossary.md' },
  { path: 'docs/charter/constitution.md', template: 'constitution.md' },
  { path: 'docs/charter/vision.md', template: 'vision.md' },
])

/** Contracts (SK-5), installed from the `production` stage onward (spec §10, Phase 5). */
const CONTRACTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/contracts/errors.md', template: 'errors.md' },
  { path: 'docs/contracts/versioning-policy.md', template: 'versioning-policy.md' },
])

/** Historical trail (SK-7), installed from the `production` stage onward (spec §10, Phase 6). */
const HISTORY: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'CHANGELOG.md', template: 'changelog.md' },
  { path: 'docs/deprecations.md', template: 'deprecations.md' },
])

/** Per-file item directories that the historical trail uses (spec §3). */
const HISTORY_DIRS: readonly string[] = Object.freeze(['docs/migrations/'])

/**
 * Document that `init` declares in `documents:` (`RF-0012`, `ADR-0008`).
 *
 * Every document `init` creates that has no ID family goes here: a
 * document that is created but not declared is a repository that fails its own
 * `ownership/owner-coverage` on the first run.
 */
interface DocumentSeed {
  path: string
  skill: string | null
  role: DocumentRole | null
  /** `external` for what is written for readers from the outside (`RF-0015`). */
  audience: Audience
}

/** Declared at every stage: both are born already at `solo`. */
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
 * The historical trail is born external: it is written for those who consume it (`RF-0015`).
 * Contracts are not — they cite their own sources, and marking them is the decision of whoever
 * maintains them.
 */
const PRODUCTION_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'docs/contracts/errors.md', skill: 'contract-keeper', role: null, audience: 'internal' },
  { path: 'docs/contracts/versioning-policy.md', skill: 'contract-keeper', role: null, audience: 'internal' },
  { path: 'CHANGELOG.md', skill: 'release-historian', role: null, audience: 'external' },
  { path: 'docs/deprecations.md', skill: 'release-historian', role: null, audience: 'external' },
  { path: 'docs/migrations/', skill: 'release-historian', role: null, audience: 'external' },
])

/** The agent contract: adopts `AGENTS.md` when it already exists (`RF-0002`). */
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

/** The document entries of `owned` (the `living-docs:` block without `id-prefix`). */
function documentsBlock(root: string, owner: string, stage: Stage): string {
  const entries = documentSeeds(root, stage).map(seed => documentEntry(seed, owner))

  return [
    // Rule of origin: ADR-0008 and ADR-0029.
    '  # Document: a `living-docs:` block without `id-prefix`. It has an owner and no ID family.',
    '  # `role` is a closed vocabulary: agent-contract, definition-of-done.',
    '  # `audience` says who reads it: absent means internal; external rejects artifact IDs in the text.',
    ...entries,
  ].join('\n')
}

/**
 * Paths where an equivalent artifact may already exist under another name.
 * Adopt what exists; never create a parallel one (spec §5, SK-0 step 1).
 *
 * The requirement lists do not cross by accident: `resolvePath` marks each
 * adopted path, so that two families never end up owning the same file.
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
  /** The written form declared by the installer (`ADR-0011`). */
  idFormat: IdFormat
  /** How the CLI is called in the installer's CI (`DA-0003`). */
  invoke: string
  /** How the core's CLI is called in the installer's CI. Defaults to `npx ownership` (TDR-0003). */
  invokeOwnership: string
  /** The plugin's marketplace repository, or `null` to not register (`DA-0003`). */
  marketplace: string | null
}

export interface InitResult {
  created: string[]
  skipped: string[]
  adopted: { idPrefix: string; path: string }[]
  stage: Stage
  /** What this stage would ask for and this toolkit version does not yet deliver. */
  notInstalled: string[]
  /** The written form the inventory found, when it differs from the declared one (`RF-0014`). */
  detected: DetectedFormat | null
}

/** Where the installed workflow lives in the installer's repository. */
export const WORKFLOW_PATH = '.github/workflows/living-docs.yml'

/**
 * The phases of spec §10 that each stage installs. The stage's enforcement set
 * comes from here — no more, no less (`RN-0025`, `ADR-0012`).
 */
const STAGE_PHASES: Readonly<Record<Stage, readonly number[]>> = Object.freeze({
  solo: [0, 1],
  'small-team': [0, 1, 2, 3, 4],
  production: [0, 1, 2, 3, 4, 5, 6],
  'multi-team': [0, 1, 2, 3, 4, 5, 6, 7],
})

/** Does this stage reach the given phase? It is the question that replaces comparing strings. */
function reaches(stage: Stage, phase: number): boolean {
  return STAGE_PHASES[stage].includes(phase)
}

/**
 * The steps this stage adds to `validate`, which every stage runs.
 * Each step exists because a phase of the stage installed the check it calls.
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
 * What this stage asks for and this version does not yet deliver. `solo` and `small-team`
 * come out empty: Phases 0–4 are complete.
 */
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
  // `production` covers Phases 5 and 6 of spec §10, and both exist.
  production: [],
  // `multi-team` covers Phase 7 of spec §10, and it exists.
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
 * Idempotence (spec §5): if `.ownership.yml` already exists, the paths come from it —
 * a second run must not reinterpret the structure the first one created.
 */
function resolvePath(root: string, kind: Kind, existing: LivingDocsConfig | null, result: InitResult, claimed: Set<string>): string {
  const declared = existing ? primaryArtifact(existing, kind) : null

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

/** The requirement-artifact block of `.ownership.yml`, or empty at the solo stage. */
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

/** The REL artifact of `.ownership.yml`, or empty outside the `production` stage. */
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

  // Does an ownership file already exist? Then the paths come from it, and
  // init writes no other beside it: two candidates block every read through
  // ambiguity. A file that does not read in v2 is reported, never overwritten.
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

  // Report, never adopt silently (`RF-0014`): silent adoption of a format
  // is the same class of error as silent adoption of a path.
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
    // The agent contract enters CODEOWNERS by the **adopted** path, the same one
    // that `documents:` declares: a repository with `AGENTS.md` that received the
    // `CLAUDE.md` line would be born with the contract unowned on the reviewer's
    // side — and would fail its own `ownership/owner-coverage` on the first run (`RF-0012`).
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
    // init does not know where the installer's code lives, and `ownership validate`
    // requires an owner for every file in the repository: saying so is what is left to do.
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
    // Moving up a stage in a repository that already ran `solo`: the three artifacts
    // need to be declared, otherwise the files are born without an owner — and an
    // orphan artifact is not enforceable (spec §3). Only what is not there yet goes in.
    const missing = REQUIREMENT_KINDS.filter(kind => !existing?.artifacts.some(artifact => artifact.idPrefix === kind))

    if (existing && missing.length > 0) {
      declareArtifacts(root, options, result, values.REQUIREMENTS_BLOCK, 'RF, RNF and RN artifacts', existing.rootFile)
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

      // Moving up a stage: the REL must be declared in an `.ownership.yml` that
      // already exists, otherwise the release note is born without an owner — and an orphan artifact is not
      // enforceable (spec §3), nor freezable by living-docs/append-only.
      if (existing && !existing.artifacts.some(artifact => artifact.idPrefix === 'REL')) {
        declareArtifacts(root, options, result, values.RELEASES_BLOCK, 'REL artifact', existing.rootFile)
      }

      for (const item of HISTORY) {
        writeIfAbsent(root, item.path, template(item.template, values), options, result)
      }
      ensureDirectory(root, paths.REL ?? DEFAULT_PATHS.REL, options, result)
      for (const dir of HISTORY_DIRS) {
        ensureDirectory(root, dir, options, result)
      }
    }

    // The agent contract may already exist under another name. Adopt, never duplicate
    // (RF-0002): two contracts is a guarantee that one of them is wrong.
    const contract = agentContractPath(root)

    if (contract === 'AGENTS.md') {
      result.adopted.push({ idPrefix: 'agent contract', path: 'AGENTS.md' })
    } else {
      writeIfAbsent(root, contract, template('agent-contract.md', values), options, result)
    }
  }

  // The stage's enforcement (`RF-0013`). Merge, never overwrite: the
  // workflow that already exists belongs to whoever wrote it.
  writeIfAbsent(root, WORKFLOW_PATH, template('workflow.yml', values), options, result)
  declarePlugin(root, options, result)

  // The block goes in the template on the first run; here is the case of whoever already had
  // an `.ownership.yml` — from an earlier version, or from a smaller stage.
  if (existing !== null) {
    declareDocuments(root, options, result, existing)
    reportUnmarkedExternal(root, options.stage, result, existing)
  }

  return result
}

/**
 * The registration that wires the hooks into the session (`RF-0013`).
 *
 * Without `--marketplace`, nothing is written: the marketplace source is not guessed
 * (`DA-0003`), and init does not invent — same policy as `watches` and
 * `generated[]`. Unreadable settings are not touched either: fixing someone
 * else's configuration erases someone's work.
 */
function declarePlugin(root: string, options: InitOptions, result: InitResult): void {
  if (options.marketplace === null) {
    result.notInstalled.push(
      // Rule of origin: DA-0003.
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
 * Appends an artifact block to the ownership file that already exists.
 * Nothing is rewritten: the entries go in right after `owned:`, because the order
 * of a YAML list means nothing. Without that anchor — a file
 * reorganized by hand — init does not guess: it says what is missing and leaves the edit
 * to whoever owns the file.
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
 * Appends to the CODEOWNERS that already exists the lines this stage asks for and that
 * are not there.
 *
 * CODEOWNERS is born whole on the first run, but whoever moves up a stage already
 * has one — and `writeIfAbsent` alone would leave it frozen in the shape of the previous
 * stage, with the new documents born without anyone to review them. `ownership/owner-coverage` requires the
 * owner in both places, so `documents:` without the matching line is
 * half an owner (`RN-0016`).
 *
 * Nothing is rewritten: only appended, and the comparison is by pattern — the line that
 * already exists stays as the file's owner wrote it, even with another `@handle`.
 */
function declareCodeowners(root: string, options: InitOptions, result: InitResult, rendered: string): void {
  const file = join(root, 'CODEOWNERS')
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const known = new Set(parseCodeowners(source).map(entry => entry.pattern))

  const missing = parseCodeowners(rendered)
    .filter(entry => !known.has(entry.pattern))
    .map(entry => `${entry.pattern}    ${entry.owners.join(' ')}`)

  if (missing.length === 0) {
    result.skipped.push('CODEOWNERS')

    return
  }

  result.created.push(`CODEOWNERS (${missing.length} line(s))`)
  if (options.dryRun) {
    return
  }
  writeFileSync(file, `${source.replace(/\n*$/, '\n')}${missing.join('\n')}\n`, 'utf8')
}

/**
 * Declares in `owned` the document that is not there yet, in an ownership file
 * that already exists. The anchor is only one, `owned:`: without it — a file reorganized by
 * hand — init **does not guess**: it says what is missing and leaves the edit to whoever
 * owns the file. Same policy as `declareArtifacts`.
 */
function declareDocuments(root: string, options: InitOptions, result: InitResult, existing: LivingDocsConfig): void {
  const declared = new Set(existing.documents.map(document => document.path))
  const missing = documentSeeds(root, options.stage).filter(seed => !declared.has(seed.path))

  if (missing.length === 0) {
    return
  }

  const file = existing.rootFile
  const path = join(root, file)
  const source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  const entries = missing.map(seed => documentEntry(seed, options.owner)).join('\n')
  const next = insertAfterOwned(source, entries)

  if (next === null) {
    result.notInstalled.push(`documents in ${file} — \`owned:\` anchor not found; ` + 'declare the documents by hand so they have an owner')

    return
  }

  result.created.push(`${file} (${missing.length} document(s))`)
  if (options.dryRun) {
    return
  }
  writeFileSync(path, next, 'utf8')
}

/**
 * Reports the already-declared entry that this stage would mark as external and that
 * is not marked (`RF-0015`).
 *
 * It does not rewrite the line: same policy as `declareDocuments`,
 * `declareArtifacts` and `declareCodeowners`. The entry belongs to whoever wrote it, and
 * marking it turns on `living-docs/external-audience` over a text that may still cite an ID — the decision belongs to
 * whoever answers for it.
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

  const rel = primaryArtifact(existing, 'REL')

  if (reaches(stage, 6) && rel !== null && rel.audience !== 'external') {
    result.notInstalled.push(unmarkedExternal('the REL artifact', existing.rootFile))
  }
}

function unmarkedExternal(what: string, file: string): string {
  return (
    `audience: external for ${what}, in ${file} — the entry was already declared without the mark, ` +
    'and init does not rewrite a line already written; marking it is what turns on the external-text check for it'
  )
}
