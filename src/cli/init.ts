import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OWNERSHIP_PATH, loadOwnership } from '../config/ownership.ts';
import type { OwnershipConfig } from '../config/ownership.ts';
import { RETIRED_IDS_PATH } from '../ids/citations.ts';
import { templatesDir } from '../core/roots.ts';

const TEMPLATES_DIR = templatesDir();

/**
 * Estágios de maturidade (spec §10, SK-0 passo 2). Cada estágio instala o
 * conjunto mínimo que ele pede — e nada além. Um estágio que instala moldura
 * vazia é a wiki morta nascendo de fábrica, por isso `production` e `multi-team`
 * só entram junto com as fases que os preenchem.
 */
export const STAGES = ['solo', 'small-team', 'production'] as const;
export type Stage = (typeof STAGES)[number];

type Kind = 'ADR' | 'DA' | 'TDR' | 'RF' | 'RNF' | 'RN';

/** Artefatos que só o estágio `small-team` em diante instala. */
const REQUIREMENT_KINDS: readonly Kind[] = ['RF', 'RNF', 'RN'];

export const DEFAULT_PATHS: Readonly<Record<Kind, string>> = Object.freeze({
  ADR: 'docs/decisions/adr/',
  DA: 'docs/open-decisions.md',
  TDR: 'docs/decisions/debt/',
  RF: 'docs/requirements/functional.md',
  RNF: 'docs/requirements/non-functional.md',
  RN: 'docs/requirements/rules.md',
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
});

export interface InitOptions {
  owner: string;
  dryRun: boolean;
  stage: Stage;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  adopted: { idPrefix: string; path: string }[];
  stage: Stage;
  /** O que este estágio pediria e esta versão do toolkit ainda não entrega. */
  notInstalled: string[];
}

/**
 * O que este estágio pede e esta versão ainda não entrega. `solo` e `small-team`
 * saem vazios: as Fases 0–4 estão completas. `production` cobre as Fases 5 e 6
 * na spec §10, e a 6 não existe aqui.
 */
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
  production: [
    'Fase 6 — CHANGELOG, release notes, depreciações e guias de migração (SK-7, CI-6, HK-7)',
  ],
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

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

export function runInit(root: string, options: InitOptions): InitResult {
  const result: InitResult = {
    created: [],
    skipped: [],
    adopted: [],
    stage: options.stage,
    notInstalled: [...NOT_INSTALLED[options.stage]],
  };

  let existing: OwnershipConfig | null = null;
  try {
    existing = loadOwnership(root);
  } catch {
    existing = null; // primeira execução, ou configuração ilegível
  }

  const claimed = new Set<string>();
  const kinds: Kind[] =
    options.stage === 'solo' ? ['ADR', 'DA', 'TDR'] : ['ADR', 'DA', 'TDR', ...REQUIREMENT_KINDS];
  const paths = Object.fromEntries(
    kinds.map((kind) => [kind, resolvePath(root, kind, existing, result, claimed)]),
  ) as Record<Kind, string>;

  const requirementsCodeowners =
    options.stage === 'solo'
      ? ''
      : REQUIREMENT_KINDS.map((kind) => `${paths[kind]}    ${options.owner}\n`).join('');

  const values = {
    OWNER: options.owner,
    TODAY: today(),
    ADR_PATH: paths.ADR,
    DA_PATH: paths.DA,
    TDR_PATH: paths.TDR,
    REQUIREMENTS_BLOCK: requirementsBlock(options.owner, paths, options.stage),
    REQUIREMENTS_CODEOWNERS: requirementsCodeowners,
    AGREEMENTS_CODEOWNERS:
      options.stage === 'solo'
        ? ''
        : `CONTRIBUTING.md    ${options.owner}\ndocs/definition-of-done.md    ${options.owner}\nCLAUDE.md    ${options.owner}\ndocs/glossary.md    ${options.owner}\ndocs/charter/    ${options.owner}\n`,
    CONTRACTS_CODEOWNERS:
      options.stage === 'production' ? `docs/contracts/    ${options.owner}\n` : '',
  };

  writeIfAbsent(root, OWNERSHIP_PATH, template('ownership.yml', values), options, result);
  writeIfAbsent(root, RETIRED_IDS_PATH, template('ids-retired.txt', values), options, result);
  writeIfAbsent(root, paths.DA, template('open-decisions.md', values), options, result);
  writeIfAbsent(root, 'CODEOWNERS', template('CODEOWNERS', values), options, result);
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
      declareRequirements(root, options, result, values.REQUIREMENTS_BLOCK);
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

    if (options.stage === 'production') {
      for (const contract of CONTRACTS) {
        writeIfAbsent(root, contract.path, template(contract.template, values), options, result);
      }
    }

    // O contrato do agente pode já existir com outro nome. Adotar, nunca duplicar
    // (RF-0002): dois contratos é a garantia de que um deles está errado.
    if (existsSync(join(root, 'AGENTS.md'))) {
      result.adopted.push({ idPrefix: 'contrato do agente', path: 'AGENTS.md' });
    } else {
      writeIfAbsent(root, 'CLAUDE.md', template('agent-contract.md', values), options, result);
    }
  }

  return result;
}

/**
 * Acrescenta o bloco de requisitos a um `.ownership.yml` que já existe.
 * Nada é reescrito: o bloco entra imediatamente antes de `generated:`, que é a
 * primeira chave depois de `artifacts:` no template. Sem essa âncora — um
 * arquivo reorganizado à mão — o init não adivinha: ele diz o que falta e
 * deixa a edição para quem é dono do arquivo.
 */
function declareRequirements(
  root: string,
  options: InitOptions,
  result: InitResult,
  block: string,
): void {
  const file = join(root, OWNERSHIP_PATH);
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const anchor = '\ngenerated:';

  if (!source.includes(anchor)) {
    result.notInstalled.push(
      `artefatos RF/RNF/RN em ${OWNERSHIP_PATH} — âncora \`generated:\` não encontrada; ` +
        'declare-os à mão para que os requisitos tenham dono',
    );
    return;
  }

  result.created.push(`${OWNERSHIP_PATH} (artefatos RF, RNF e RN)`);
  if (options.dryRun) return;
  writeFileSync(file, source.replace(anchor, `${block}\ngenerated:`), 'utf8');
}
