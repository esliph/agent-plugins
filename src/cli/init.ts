import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OWNERSHIP_PATH, loadOwnership } from '../config/ownership.ts';
import type { DocumentRole, OwnershipConfig } from '../config/ownership.ts';
import { parseCodeowners } from '../config/codeowners.ts';
import { SETTINGS_PATH, SettingsError, mergeSettings } from '../config/claude-settings.ts';
import { RETIRED_IDS_PATH } from '../ids/citations.ts';
import { detectIdFormat } from '../ids/detect.ts';
import type { DetectedFormat } from '../ids/detect.ts';
import type { IdFormat } from '../docs/schema.ts';
import { templatesDir } from '../core/roots.ts';
import { todayIso } from '../core/dates.ts';

const TEMPLATES_DIR = templatesDir();

/**
 * Estágios de maturidade (spec §10, `SK-0` passo 2). Cada estágio instala o
 * conjunto mínimo que ele pede — e nada além. `multi-team` existe desde o
 * fechamento porque passa a ter enforcement atrás dele: é o estágio que instala
 * a Fase 7 (`RN-0025`, `ADR-0012`). Um rótulo sem conteúdo é a wiki morta
 * nascendo de fábrica.
 */
export const STAGES = ['solo', 'small-team', 'production', 'multi-team'] as const;
export type Stage = (typeof STAGES)[number];

type Kind = 'ADR' | 'DA' | 'TDR' | 'RF' | 'RNF' | 'RN' | 'REL';

/** Artefatos que só o estágio `small-team` em diante instala. */
const REQUIREMENT_KINDS: readonly Kind[] = ['RF', 'RNF', 'RN'];

export const DEFAULT_PATHS: Readonly<Record<Kind, string>> = Object.freeze({
  ADR: 'docs/decisions/adr/',
  DA: 'docs/open-decisions.md',
  TDR: 'docs/decisions/debt/',
  RF: 'docs/requirements/functional.md',
  RNF: 'docs/requirements/non-functional.md',
  RN: 'docs/requirements/rules.md',
  REL: 'docs/releases/',
});

const REQUIREMENT_TITLES: Readonly<Record<'RF' | 'RNF' | 'RN', string>> = Object.freeze({
  RF: 'Requisitos funcionais',
  RNF: 'Requisitos não funcionais',
  RN: 'Regras de negócio',
});

/** Caminhos varridos por `cited-by` para provar cobertura de requisito (CI-3). */
const REQUIREMENT_CITED_BY: Readonly<Record<'RF' | 'RNF' | 'RN', readonly string[]>> = Object.freeze({
  RF: ['test/**'],
  RNF: ['test/**'],
  RN: ['test/**', 'src/**'],
});

/** Acordos de trabalho (SK-6), instalados a partir do estágio `small-team` (spec §10). */
const WORKING_AGREEMENTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'CONTRIBUTING.md', template: 'contributing.md' },
  { path: 'docs/definition-of-done.md', template: 'definition-of-done.md' },
]);

/** Linguagem e intenção (SK-1, SK-2), instalados a partir do estágio `small-team` (spec §10, Fase 4). */
const LANGUAGE_AND_INTENT: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/glossary.md', template: 'glossary.md' },
  { path: 'docs/charter/constitution.md', template: 'constitution.md' },
  { path: 'docs/charter/vision.md', template: 'vision.md' },
]);

/** Contratos (SK-5), instalados a partir do estágio `production` (spec §10, Fase 5). */
const CONTRACTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/contracts/errors.md', template: 'errors.md' },
  { path: 'docs/contracts/versioning-policy.md', template: 'versioning-policy.md' },
]);

/** Rastro histórico (SK-7), instalado a partir do estágio `production` (spec §10, Fase 6). */
const HISTORY: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'CHANGELOG.md', template: 'changelog.md' },
  { path: 'docs/deprecations.md', template: 'deprecations.md' },
]);

/** Diretórios de item por arquivo que o rastro histórico usa (spec §3). */
const HISTORY_DIRS: readonly string[] = Object.freeze(['docs/migrations/']);

/**
 * Documento que o `init` declara em `documents:` (`RF-0012`, `ADR-0008`).
 *
 * Todo documento que o `init` cria e que não tem família de IDs entra aqui: um
 * documento criado e não declarado é um repositório que reprova no próprio
 * `CI-7` na primeira execução.
 */
interface DocumentSeed {
  path: string;
  skill: string | null;
  role: DocumentRole | null;
}

/** Declarados em todo estágio: os dois nascem já no `solo`. */
const BASE_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: OWNERSHIP_PATH, skill: 'living-docs-bootstrap', role: null },
  { path: RETIRED_IDS_PATH, skill: 'living-docs-bootstrap', role: null },
]);

const SMALL_TEAM_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'CONTRIBUTING.md', skill: 'working-agreements-keeper', role: null },
  { path: 'docs/definition-of-done.md', skill: 'working-agreements-keeper', role: 'definition-of-done' },
  { path: 'docs/glossary.md', skill: 'glossary-keeper', role: null },
  { path: 'docs/charter/', skill: 'charter-keeper', role: null },
]);

const PRODUCTION_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'docs/contracts/errors.md', skill: 'contract-keeper', role: null },
  { path: 'docs/contracts/versioning-policy.md', skill: 'contract-keeper', role: null },
  { path: 'CHANGELOG.md', skill: 'release-historian', role: null },
  { path: 'docs/deprecations.md', skill: 'release-historian', role: null },
  { path: 'docs/migrations/', skill: 'release-historian', role: null },
]);

/** O contrato do agente: adota `AGENTS.md` quando ele já existe (`RF-0002`). */
function agentContractPath(root: string): string {
  return existsSync(join(root, 'AGENTS.md')) ? 'AGENTS.md' : 'CLAUDE.md';
}

function documentSeeds(root: string, stage: Stage): DocumentSeed[] {
  if (stage === 'solo') return [...BASE_DOCUMENTS];

  const seeds: DocumentSeed[] = [
    ...BASE_DOCUMENTS,
    ...SMALL_TEAM_DOCUMENTS,
    { path: agentContractPath(root), skill: 'working-agreements-keeper', role: 'agent-contract' },
  ];
  if (reaches(stage, 5)) seeds.push(...PRODUCTION_DOCUMENTS);
  return seeds;
}

function documentEntry(seed: DocumentSeed, owner: string): string {
  const lines = [`  - path: ${seed.path}`, `    owner: "${owner}"`];
  if (seed.skill !== null) lines.push(`    skill: ${seed.skill}`);
  if (seed.role !== null) lines.push(`    role: ${seed.role}`);
  return lines.join('\n');
}

/** O bloco `documents:` do `.ownership.yml` (`ADR-0008`). */
function documentsBlock(root: string, owner: string, stage: Stage): string {
  const entries = documentSeeds(root, stage).map((seed) => documentEntry(seed, owner));

  return [
    '# Documento com dono e SEM família de IDs (ADR-0008, que resolve DA-0002).',
    '# CI-4 cobra a revisão e CI-7 cobra o dono; CI-1, CI-2 e HK-1 não leem daqui.',
    '# `role` é vocabulário fechado: agent-contract, definition-of-done.',
    'documents:',
    ...entries,
    '',
  ].join('\n');
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
  DA: ['docs/decisoes-abertas.md', 'docs/open-questions.md', 'docs/decision-backlog.md'],
  TDR: ['docs/debt/', 'docs/tech-debt/', 'docs/divida/'],
  RF: [
    'docs/requisitos-funcionais.md',
    'docs/functional-requirements.md',
    'docs/requisitos.md',
    'docs/requirements.md',
    'spec/functional.md',
    'docs/spec/functional.md',
  ],
  RNF: [
    'docs/requisitos-nao-funcionais.md',
    'docs/non-functional-requirements.md',
    'spec/non-functional.md',
    'docs/spec/non-functional.md',
  ],
  RN: [
    'docs/regras-de-negocio.md',
    'docs/business-rules.md',
    'spec/rules.md',
    'docs/spec/rules.md',
  ],
  REL: ['docs/release-notes/', 'releases/', 'docs/release/'],
});

export interface InitOptions {
  owner: string;
  dryRun: boolean;
  stage: Stage;
  /** A forma escrita declarada por quem instala (`ADR-0011`). */
  idFormat: IdFormat;
  /** Como o CLI é chamado no CI de quem instala (`DA-0003`). */
  invoke: string;
  /** Repositório do marketplace do plugin, ou `null` para não registrar (`DA-0003`). */
  marketplace: string | null;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  adopted: { idPrefix: string; path: string }[];
  stage: Stage;
  /** O que este estágio pediria e esta versão do toolkit ainda não entrega. */
  notInstalled: string[];
  /** A forma escrita que o inventário achou, quando difere da declarada (`RF-0014`). */
  detected: DetectedFormat | null;
}

/** Onde o workflow instalado mora no repositório de quem instala. */
export const WORKFLOW_PATH = '.github/workflows/living-docs.yml';

/**
 * As fases da spec §10 que cada estágio instala. É daqui que sai o conjunto de
 * enforcement do estágio — nem mais, nem menos (`RN-0025`, `ADR-0012`).
 */
const STAGE_PHASES: Readonly<Record<Stage, readonly number[]>> = Object.freeze({
  solo: [0, 1],
  'small-team': [0, 1, 2, 3, 4],
  production: [0, 1, 2, 3, 4, 5, 6],
  'multi-team': [0, 1, 2, 3, 4, 5, 6, 7],
});

/** Este estágio chega até a fase dada? É a pergunta que substitui comparar strings. */
function reaches(stage: Stage, phase: number): boolean {
  return STAGE_PHASES[stage].includes(phase);
}

/**
 * Os passos que este estágio acrescenta ao `validate`, que todo estágio roda.
 * Cada passo existe porque uma fase do estágio instalou o check que ele chama.
 */
function workflowSteps(stage: Stage, invoke: string): string {
  const phases = STAGE_PHASES[stage];
  const steps: string[] = [];

  if (phases.includes(5)) {
    steps.push(['', '      - name: CI-5 — deriva de contrato gerado', `        run: ${invoke} drift`].join('\n'));
  }
  if (phases.includes(6)) {
    steps.push(
      [
        '',
        '      - name: CI-6 — entrada de CHANGELOG',
        "        if: github.event_name == 'pull_request'",
        `        run: ${invoke} changelog --base \${{ github.event.pull_request.base.sha }}`,
      ].join('\n'),
    );
  }

  if (phases.includes(7)) {
    steps.push(
      [
        '',
        '      - name: CI-7 — vínculo código→doc no diff do PR',
        "        if: github.event_name == 'pull_request'",
        `        run: ${invoke} validate --base \${{ github.event.pull_request.base.sha }}`,
      ].join('\n'),
    );
  }

  return steps.length === 0 ? '' : `${steps.join('\n')}\n`;
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
});

function template(name: string, values: Record<string, string>): string {
  let source = readFileSync(join(TEMPLATES_DIR, name), 'utf8');
  for (const [key, value] of Object.entries(values)) {
    source = source.replaceAll(`{{${key}}}`, value);
  }
  return source;
}

/**
 * Idempotência (spec §5): se já existe `.ownership.yml`, os caminhos vêm dele —
 * uma segunda execução não pode reinterpretar a estrutura que a primeira criou.
 */
function resolvePath(
  root: string,
  kind: Kind,
  existing: OwnershipConfig | null,
  result: InitResult,
  claimed: Set<string>,
): string {
  const declared = existing?.artifacts.find((artifact) => artifact.idPrefix === kind);
  if (declared) {
    claimed.add(declared.path);
    return declared.path;
  }

  for (const candidate of ADOPTION_CANDIDATES[kind]) {
    if (claimed.has(candidate)) continue;
    if (existsSync(join(root, candidate))) {
      result.adopted.push({ idPrefix: kind, path: candidate });
      claimed.add(candidate);
      return candidate;
    }
  }
  claimed.add(DEFAULT_PATHS[kind]);
  return DEFAULT_PATHS[kind];
}

function writeIfAbsent(
  root: string,
  relative: string,
  content: string,
  options: InitOptions,
  result: InitResult,
): void {
  if (existsSync(join(root, relative))) {
    result.skipped.push(relative);
    return;
  }
  result.created.push(relative);
  if (options.dryRun) return;

  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

function ensureDirectory(root: string, relative: string, options: InitOptions, result: InitResult): void {
  if (existsSync(join(root, relative))) {
    result.skipped.push(relative);
    return;
  }
  result.created.push(relative);
  if (options.dryRun) return;

  mkdirSync(join(root, relative), { recursive: true });
  writeFileSync(join(root, relative, '.gitkeep'), '', 'utf8');
}

/** O bloco de artefatos de requisito do `.ownership.yml`, ou vazio no estágio solo. */
function requirementsBlock(owner: string, paths: Record<Kind, string>, stage: Stage): string {
  if (stage === 'solo') return '';

  const entries = REQUIREMENT_KINDS.map((kind) => {
    const citedBy = REQUIREMENT_CITED_BY[kind as 'RF' | 'RNF' | 'RN']
      .map((glob) => `"${glob}"`)
      .join(', ');
    return [
      `  - id-prefix: ${kind}`,
      `    path: ${paths[kind]}`,
      `    owner: "${owner}"`,
      '    skill: requirements-keeper',
      '    collection: sections',
      `    cited-by: [${citedBy}]`,
    ].join('\n');
  });

  return `\n${entries.join('\n\n')}\n`;
}

/** O artefato REL do `.ownership.yml`, ou vazio fora do estágio `production`. */
function releasesBlock(owner: string, path: string, stage: Stage): string {
  if (!reaches(stage, 6)) return '';

  return (
    '\n' +
    [
      '  - id-prefix: REL',
      `    path: ${path}`,
      `    owner: "${owner}"`,
      '    skill: release-historian',
      '    # Release note publicada é congelada por HK-1 (spec §5, SK-7, regra 4).',
      '    append-only: true',
      '    mutable-fields: [status, last-reviewed]',
    ].join('\n') +
    '\n'
  );
}

export function runInit(root: string, options: InitOptions): InitResult {
  const result: InitResult = {
    created: [],
    skipped: [],
    adopted: [],
    stage: options.stage,
    notInstalled: [...NOT_INSTALLED[options.stage]],
    detected: null,
  };

  let existing: OwnershipConfig | null = null;
  try {
    existing = loadOwnership(root);
  } catch {
    existing = null; // primeira execução, ou configuração ilegível
  }

  const claimed = new Set<string>();
  const kinds: Kind[] =
    options.stage === 'solo'
      ? ['ADR', 'DA', 'TDR']
      : reaches(options.stage, 6)
        ? ['ADR', 'DA', 'TDR', ...REQUIREMENT_KINDS, 'REL']
        : ['ADR', 'DA', 'TDR', ...REQUIREMENT_KINDS];
  const paths = Object.fromEntries(
    kinds.map((kind) => [kind, resolvePath(root, kind, existing, result, claimed)]),
  ) as Record<Kind, string>;

  // Relatar, nunca adotar em silêncio (`RF-0014`): adoção silenciosa de formato
  // é a mesma classe de erro que adoção silenciosa de caminho.
  const detected = detectIdFormat(root, Object.values(paths));
  result.detected =
    detected !== null &&
    (detected.format.separator !== options.idFormat.separator ||
      detected.format.padding !== options.idFormat.padding)
      ? detected
      : null;

  const requirementsCodeowners =
    options.stage === 'solo'
      ? ''
      : REQUIREMENT_KINDS.map((kind) => `${paths[kind]}    ${options.owner}\n`).join('');

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
    // revisa — e reprovaria no próprio `CI-7` na primeira execução (`RF-0012`).
    AGREEMENTS_CODEOWNERS:
      options.stage === 'solo'
        ? ''
        : `CONTRIBUTING.md    ${options.owner}\ndocs/definition-of-done.md    ${options.owner}\n` +
          `${agentContractPath(root)}    ${options.owner}\ndocs/glossary.md    ${options.owner}\n` +
          `docs/charter/    ${options.owner}\n`,
    CONTRACTS_CODEOWNERS:
      reaches(options.stage, 5) ? `docs/contracts/    ${options.owner}\n` : '',
    RELEASES_BLOCK: releasesBlock(options.owner, paths.REL ?? DEFAULT_PATHS.REL, options.stage),
    HISTORY_CODEOWNERS:
      reaches(options.stage, 6)
        ? `CHANGELOG.md    ${options.owner}\ndocs/deprecations.md    ${options.owner}\ndocs/releases/    ${options.owner}\ndocs/migrations/    ${options.owner}\n`
        : '',
    DOCUMENTS_BLOCK: documentsBlock(root, options.owner, options.stage),
    RETIRED_CODEOWNERS: `${RETIRED_IDS_PATH}    ${options.owner}`,
    ID_SEPARATOR: options.idFormat.separator,
    ID_PADDING: String(options.idFormat.padding),
    INVOKE: options.invoke,
    WORKFLOW_STEPS: workflowSteps(options.stage, options.invoke),
  };

  writeIfAbsent(root, OWNERSHIP_PATH, template('ownership.yml', values), options, result);
  writeIfAbsent(root, RETIRED_IDS_PATH, template('ids-retired.txt', values), options, result);
  writeIfAbsent(root, paths.DA, template('open-decisions.md', values), options, result);
  const codeowners = template('CODEOWNERS', values);
  if (existsSync(join(root, 'CODEOWNERS'))) {
    declareCodeowners(root, options, result, codeowners);
  } else {
    writeIfAbsent(root, 'CODEOWNERS', codeowners, options, result);
  }
  ensureDirectory(root, paths.ADR, options, result);
  ensureDirectory(root, paths.TDR, options, result);

  if (options.stage !== 'solo') {
    // Subir de estágio num repositório que já rodou `solo`: os três artefatos
    // precisam ser declarados, senão os arquivos nascem sem dono — e artefato
    // órfão não é enforceável (spec §3). Só entra o que ainda não está lá.
    const faltando = REQUIREMENT_KINDS.filter(
      (kind) => !existing?.artifacts.some((artifact) => artifact.idPrefix === kind),
    );
    if (existing && faltando.length > 0) {
      declareArtifacts(root, options, result, values.REQUIREMENTS_BLOCK, 'artefatos RF, RNF e RN');
    }

    for (const kind of REQUIREMENT_KINDS) {
      const title = REQUIREMENT_TITLES[kind as 'RF' | 'RNF' | 'RN'];
      writeIfAbsent(
        root,
        paths[kind],
        template('requirements.md', { ...values, TITLE: title, PREFIX: kind }),
        options,
        result,
      );
    }

    for (const agreement of WORKING_AGREEMENTS) {
      writeIfAbsent(root, agreement.path, template(agreement.template, values), options, result);
    }

    for (const agreement of LANGUAGE_AND_INTENT) {
      writeIfAbsent(root, agreement.path, template(agreement.template, values), options, result);
    }

    if (reaches(options.stage, 5)) {
      for (const contract of CONTRACTS) {
        writeIfAbsent(root, contract.path, template(contract.template, values), options, result);
      }

      // Subir de estágio: o REL precisa ser declarado num `.ownership.yml` que
      // já existe, senão a release note nasce sem dono — e artefato órfão não é
      // enforceável (spec §3), nem congelável por HK-1.
      if (existing && !existing.artifacts.some((artifact) => artifact.idPrefix === 'REL')) {
        declareArtifacts(root, options, result, values.RELEASES_BLOCK, 'artefato REL');
      }

      for (const item of HISTORY) {
        writeIfAbsent(root, item.path, template(item.template, values), options, result);
      }
      ensureDirectory(root, paths.REL ?? DEFAULT_PATHS.REL, options, result);
      for (const dir of HISTORY_DIRS) ensureDirectory(root, dir, options, result);
    }

    // O contrato do agente pode já existir com outro nome. Adotar, nunca duplicar
    // (RF-0002): dois contratos é a garantia de que um deles está errado.
    const contract = agentContractPath(root);
    if (contract === 'AGENTS.md') {
      result.adopted.push({ idPrefix: 'contrato do agente', path: 'AGENTS.md' });
    } else {
      writeIfAbsent(root, contract, template('agent-contract.md', values), options, result);
    }
  }

  // O enforcement do estágio (`RF-0013`). Mesclar, nunca sobrescrever: o
  // workflow que já existe é de quem o escreveu.
  writeIfAbsent(root, WORKFLOW_PATH, template('workflow.yml', values), options, result);
  declarePlugin(root, options, result);

  // O bloco vai no template na primeira execução; aqui é o caso de quem já tinha
  // um `.ownership.yml` — de uma versão anterior, ou de um estágio menor.
  if (existing !== null) declareDocuments(root, options, result, existing);

  return result;
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
      `registro do plugin em ${SETTINGS_PATH} — sem \`--marketplace <owner/repo>\` a fonte não se ` +
        'adivinha (`DA-0003`); os hooks não sobem na sessão até ele ser declarado',
    );
    return;
  }

  const file = join(root, SETTINGS_PATH);
  const current = existsSync(file) ? readFileSync(file, 'utf8') : null;

  let merged;
  try {
    merged = mergeSettings(current, options.marketplace);
  } catch (err) {
    result.notInstalled.push(
      `registro do plugin em ${SETTINGS_PATH} — ${err instanceof SettingsError ? err.message : String(err)}; ` +
        'declare-o à mão para não perder o que já está lá',
    );
    return;
  }

  if (merged.added.length === 0) {
    result.skipped.push(SETTINGS_PATH);
    return;
  }

  result.created.push(`${SETTINGS_PATH} (${merged.added.join(', ')})`);
  if (options.dryRun) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, merged.text, 'utf8');
}

/**
 * Acrescenta um bloco de artefatos a um `.ownership.yml` que já existe.
 * Nada é reescrito: o bloco entra imediatamente antes de `generated:`, que é a
 * primeira chave depois de `artifacts:` no template. Sem essa âncora — um
 * arquivo reorganizado à mão — o init não adivinha: ele diz o que falta e
 * deixa a edição para quem é dono do arquivo.
 */
function declareArtifacts(
  root: string,
  options: InitOptions,
  result: InitResult,
  block: string,
  what: string,
): void {
  const file = join(root, OWNERSHIP_PATH);
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const anchor = '\ngenerated:';

  if (!source.includes(anchor)) {
    result.notInstalled.push(
      `${what} em ${OWNERSHIP_PATH} — âncora \`generated:\` não encontrada; ` +
        'declare-os à mão para que os artefatos tenham dono',
    );
    return;
  }

  result.created.push(`${OWNERSHIP_PATH} (${what})`);
  if (options.dryRun) return;
  writeFileSync(file, source.replace(anchor, `${block}\ngenerated:`), 'utf8');
}

/**
 * Acrescenta ao CODEOWNERS que já existe as linhas que este estágio pede e que
 * não estão lá.
 *
 * O CODEOWNERS nasce inteiro na primeira execução, mas quem sobe de estágio já
 * tem um — e `writeIfAbsent` sozinho o deixaria congelado na forma do estágio
 * anterior, com os documentos novos nascendo sem quem os revise. `CI-7` cobra o
 * dono nos dois lugares, então o `documents:` sem a linha correspondente é
 * meio dono (`RN-0016`).
 *
 * Nada é reescrito: só se acrescenta, e a comparação é por padrão — a linha que
 * já existe fica como o dono do arquivo a escreveu, mesmo com outro `@handle`.
 */
function declareCodeowners(root: string, options: InitOptions, result: InitResult, rendered: string): void {
  const file = join(root, 'CODEOWNERS');
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const known = new Set(parseCodeowners(source).map((entry) => entry.pattern));

  const faltando = parseCodeowners(rendered)
    .filter((entry) => !known.has(entry.pattern))
    .map((entry) => `${entry.pattern}    ${entry.owners.join(' ')}`);

  if (faltando.length === 0) {
    result.skipped.push('CODEOWNERS');
    return;
  }

  result.created.push(`CODEOWNERS (${faltando.length} linha(s))`);
  if (options.dryRun) return;
  writeFileSync(file, `${source.replace(/\n*$/, '\n')}${faltando.join('\n')}\n`, 'utf8');
}

/**
 * Declara em `documents:` o que ainda não está lá, num `.ownership.yml` que já
 * existe.
 *
 * Duas âncoras, na ordem: a linha `documents:` (as entradas entram logo depois
 * dela, porque ordem de lista YAML não significa nada) e `\nwatches:` (o bloco
 * inteiro entra antes dela). Sem nenhuma das duas — arquivo reorganizado à mão —
 * o init **não adivinha**: ele diz o que falta e deixa a edição para quem é dono
 * do arquivo. Mesma política de `declareArtifacts`.
 */
function declareDocuments(root: string, options: InitOptions, result: InitResult, existing: OwnershipConfig): void {
  const declared = new Set(existing.documents.map((document) => document.path));
  const faltando = documentSeeds(root, options.stage).filter((seed) => !declared.has(seed.path));
  if (faltando.length === 0) return;

  const file = join(root, OWNERSHIP_PATH);
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const entries = faltando.map((seed) => documentEntry(seed, options.owner)).join('\n');

  result.created.push(`${OWNERSHIP_PATH} (${faltando.length} documento(s) em documents:)`);

  if (source.includes('\ndocuments:')) {
    if (options.dryRun) return;
    writeFileSync(file, source.replace('\ndocuments:', `\ndocuments:\n${entries}`), 'utf8');
    return;
  }

  if (source.includes('\nwatches:')) {
    if (options.dryRun) return;
    writeFileSync(file, source.replace('\nwatches:', `\ndocuments:\n${entries}\n\nwatches:`), 'utf8');
    return;
  }

  result.created.pop();
  result.notInstalled.push(
    `documents: em ${OWNERSHIP_PATH} — âncora \`documents:\` ou \`watches:\` não encontrada; ` +
      'declare os documentos à mão para que eles tenham dono (CI-7)',
  );
}
