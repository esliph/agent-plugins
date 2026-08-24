import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { isEmptyValue, normalizeKey } from '../docs/item.ts';
import type { DocItem } from '../docs/item.ts';

export const OWNERSHIP_PATH = 'docs/.ownership.yml';

export type Collection = 'per-file' | 'table';

export interface ArtifactRule {
  idPrefix: string;
  path: string;
  owner: string;
  skill: string;
  appendOnly: boolean;
  mutableFields: string[];
  citedBy: string[];
  collection: Collection;
  /** Canônico -> nome real do campo neste projeto. Ex.: { 'resolved-by': 'resolvida por' }. */
  fieldMap: Record<string, string>;
  /** Máquina de estados declarada pelo projeto; null usa a embutida em src/docs/schema.ts. */
  states: string[] | null;
}

export interface GeneratedRule {
  path: string;
  command: string;
}

export interface WatchRule {
  code: string;
  doc: string;
  reason: string | null;
  consumerVisible: boolean;
}

export interface OwnershipConfig {
  version: number;
  staleAfterMonths: number;
  artifacts: ArtifactRule[];
  generated: GeneratedRule[];
  watches: WatchRule[];
  consumerVisiblePaths: string[];
}

export class OwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OwnershipError';
  }
}

const ID_PREFIX = /^[A-Z]{2,4}$/;

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where} precisa ser um mapa.`);
  }
  return value as Record<string, unknown>;
}

function asStringList(value: unknown, where: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where} precisa ser uma lista de strings.`);
  }
  return value as string[];
}

function requireString(source: Record<string, unknown>, key: string, where: string): string {
  const value = source[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where} precisa do campo \`${key}\` não vazio.`);
  }
  return value;
}

function parseArtifact(raw: unknown, index: number): ArtifactRule {
  const where = `artifacts[${index}]`;
  const item = asRecord(raw, where);

  const idPrefix = requireString(item, 'id-prefix', where);
  if (!ID_PREFIX.test(idPrefix)) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: ${where}.id-prefix "${idPrefix}" precisa ser 2 a 4 letras maiúsculas (ex.: ADR, DA, TDR).`,
    );
  }

  const owner = requireString(item, 'owner', where);
  if (!owner.startsWith('@')) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: ${where}.owner "${owner}" precisa começar com @ e espelhar o CODEOWNERS.`,
    );
  }

  const collectionRaw = item.collection ?? 'per-file';
  if (collectionRaw !== 'per-file' && collectionRaw !== 'table') {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.collection precisa ser "per-file" ou "table".`);
  }

  const fieldMapRaw = item['field-map'];
  const fieldMap: Record<string, string> = {};
  if (fieldMapRaw !== undefined && fieldMapRaw !== null) {
    for (const [canonical, real] of Object.entries(asRecord(fieldMapRaw, `${where}.field-map`))) {
      if (typeof real !== 'string' || real.trim() === '') {
        throw new OwnershipError(
          `${OWNERSHIP_PATH}: ${where}.field-map.${canonical} precisa ser uma string não vazia.`,
        );
      }
      fieldMap[normalizeKey(canonical)] = normalizeKey(real);
    }
  }

  const states = item.states === undefined ? null : asStringList(item.states, `${where}.states`);

  return {
    idPrefix,
    path: requireString(item, 'path', where),
    owner,
    skill: requireString(item, 'skill', where),
    appendOnly: item['append-only'] === true,
    mutableFields: asStringList(item['mutable-fields'], `${where}.mutable-fields`),
    citedBy: asStringList(item['cited-by'], `${where}.cited-by`),
    collection: collectionRaw,
    fieldMap,
    states,
  };
}

export function parseOwnership(source: string): OwnershipConfig {
  let raw: unknown;
  try {
    raw = YAML.parse(source);
  } catch (err) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: YAML inválido — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const root = asRecord(raw, 'raiz');

  if (root.version !== 1) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: campo \`version\` precisa ser 1 (recebido: ${String(root.version)}).`);
  }

  const artifactsRaw = root.artifacts;
  if (!Array.isArray(artifactsRaw) || artifactsRaw.length === 0) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: \`artifacts\` precisa listar ao menos um artefato — sem dono declarado nada é enforceável.`,
    );
  }

  const artifacts = artifactsRaw.map(parseArtifact);

  const seen = new Set<string>();
  for (const artifact of artifacts) {
    if (seen.has(artifact.idPrefix)) {
      throw new OwnershipError(
        `${OWNERSHIP_PATH}: id-prefix "${artifact.idPrefix}" declarado duas vezes. Um artefato, um dono.`,
      );
    }
    seen.add(artifact.idPrefix);
  }

  const generatedRaw = Array.isArray(root.generated) ? root.generated : [];
  const generated: GeneratedRule[] = generatedRaw.map((item, index) => {
    const entry = asRecord(item, `generated[${index}]`);
    return {
      path: requireString(entry, 'path', `generated[${index}]`),
      command: requireString(entry, 'command', `generated[${index}]`),
    };
  });

  const watchesRaw = Array.isArray(root.watches) ? root.watches : [];
  const watches: WatchRule[] = watchesRaw.map((item, index) => {
    const entry = asRecord(item, `watches[${index}]`);
    const reason = entry.reason;
    return {
      code: requireString(entry, 'code', `watches[${index}]`),
      doc: requireString(entry, 'doc', `watches[${index}]`),
      reason: typeof reason === 'string' ? reason : null,
      consumerVisible: entry['consumer-visible'] === true,
    };
  });

  const staleAfterMonths = root['stale-after-months'];

  return {
    version: 1,
    staleAfterMonths: typeof staleAfterMonths === 'number' ? staleAfterMonths : 6,
    artifacts,
    generated,
    watches,
    consumerVisiblePaths: asStringList(root['consumer-visible-paths'], 'consumer-visible-paths'),
  };
}

export function loadOwnership(root: string): OwnershipConfig {
  const file = join(root, OWNERSHIP_PATH);
  let source: string;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    throw new OwnershipError(
      `${OWNERSHIP_PATH} não encontrado em ${root}. Rode \`living-docs init\` (skill dona: living-docs-bootstrap).`,
    );
  }
  return parseOwnership(source);
}

/**
 * Valor de um campo canônico do item, respeitando o `field-map` do artefato.
 * Devolve null para célula vazia — `CI-3` trata "vazio" e "ausente" igual.
 *
 * Mora aqui, e não em `src/checks/`, porque traduzir "resolved-by" para o nome
 * real da coluna é configuração do projeto: nenhum check aprende português.
 */
export function fieldOf(rule: ArtifactRule, item: DocItem, canonical: string): string | null {
  const key = rule.fieldMap[normalizeKey(canonical)] ?? normalizeKey(canonical);
  const value = item.fields[key];
  if (value === undefined || isEmptyValue(value)) return null;
  return value.trim();
}

/** Regra dona de um caminho relativo à raiz do repositório, ou null. */
export function findArtifactRule(config: OwnershipConfig, repoPath: string): ArtifactRule | null {
  const normalized = repoPath.replace(/\\/g, '/').replace(/^\.\//, '');
  for (const artifact of config.artifacts) {
    const target = artifact.path.replace(/\\/g, '/');
    if (target.endsWith('/') ? normalized.startsWith(target) : normalized === target) {
      return artifact;
    }
  }
  return null;
}
