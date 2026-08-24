import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OWNERSHIP_PATH, loadOwnership } from '../config/ownership.ts';
import type { OwnershipConfig } from '../config/ownership.ts';
import { RETIRED_IDS_PATH } from '../ids/citations.ts';
import { templatesDir } from '../core/roots.ts';

const TEMPLATES_DIR = templatesDir();

export const DEFAULT_PATHS: Readonly<Record<'ADR' | 'DA' | 'TDR', string>> = Object.freeze({
  ADR: 'docs/decisions/adr/',
  DA: 'docs/open-decisions.md',
  TDR: 'docs/decisions/debt/',
});

/**
 * Caminhos onde um artefato equivalente pode já existir sob outro nome.
 * Adotar o que existe; nunca criar um paralelo (spec §5, SK-0 passo 1).
 */
const ADOPTION_CANDIDATES: Readonly<Record<'ADR' | 'DA' | 'TDR', readonly string[]>> = Object.freeze({
  ADR: ['docs/adr/', 'adr/', 'doc/adr/', 'docs/architecture/decisions/'],
  DA: ['docs/decisoes-abertas.md', 'docs/open-questions.md', 'docs/decision-backlog.md'],
  TDR: ['docs/debt/', 'docs/tech-debt/', 'docs/divida/'],
});

export interface InitOptions {
  owner: string;
  dryRun: boolean;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  adopted: { idPrefix: string; path: string }[];
}

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
  kind: 'ADR' | 'DA' | 'TDR',
  existing: OwnershipConfig | null,
  result: InitResult,
): string {
  const declared = existing?.artifacts.find((artifact) => artifact.idPrefix === kind);
  if (declared) return declared.path;

  for (const candidate of ADOPTION_CANDIDATES[kind]) {
    if (existsSync(join(root, candidate))) {
      result.adopted.push({ idPrefix: kind, path: candidate });
      return candidate;
    }
  }
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

export function runInit(root: string, options: InitOptions): InitResult {
  const result: InitResult = { created: [], skipped: [], adopted: [] };

  let existing: OwnershipConfig | null = null;
  try {
    existing = loadOwnership(root);
  } catch {
    existing = null; // primeira execução, ou configuração ilegível
  }

  const adrPath = resolvePath(root, 'ADR', existing, result);
  const daPath = resolvePath(root, 'DA', existing, result);
  const tdrPath = resolvePath(root, 'TDR', existing, result);

  const values = {
    OWNER: options.owner,
    TODAY: today(),
    ADR_PATH: adrPath,
    DA_PATH: daPath,
    TDR_PATH: tdrPath,
  };

  writeIfAbsent(root, OWNERSHIP_PATH, template('ownership.yml', values), options, result);
  writeIfAbsent(root, RETIRED_IDS_PATH, template('ids-retired.txt', values), options, result);
  writeIfAbsent(root, daPath, template('open-decisions.md', values), options, result);
  writeIfAbsent(root, 'CODEOWNERS', template('CODEOWNERS', values), options, result);
  ensureDirectory(root, adrPath, options, result);
  ensureDirectory(root, tdrPath, options, result);

  return result;
}
