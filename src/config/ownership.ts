import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { isEmptyValue, normalizeKey } from '../docs/item.ts';
import type { DocItem } from '../docs/item.ts';
import { DEFAULT_ID_FORMAT, PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';

export const OWNERSHIP_PATH = 'docs/.ownership.yml';

export type Collection = 'per-file' | 'table' | 'sections';

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

/**
 * Papéis que o toolkit reconhece num documento (`ADR-0008`).
 *
 * Vocabulário fechado de propósito: é o que permite a `CI-7` achar o contrato do
 * agente e a Definition of Done sem conhecer caminho nenhum (spec §3). Papel
 * aberto seria configuração que o toolkit não sabe usar.
 */
export const DOCUMENT_ROLES = ['agent-contract', 'definition-of-done'] as const;
export type DocumentRole = (typeof DOCUMENT_ROLES)[number];

/**
 * Documento com dono e **sem** família de IDs (`ADR-0008`, que resolve `DA-0002`).
 *
 * Não é artefato: não tem ciclo de vida, não é congelado por `HK-1`, e `CI-1`/
 * `CI-2` não o leem. O que ele tem é dono — e, quando existe uma, skill dona.
 */
export interface DocumentRule {
  path: string;
  owner: string;
  /** Skill dona, quando existe uma. `null` é informação, não erro. */
  skill: string | null;
  role: DocumentRole | null;
}

export interface OwnershipConfig {
  version: number;
  staleAfterMonths: number;
  /** Quantos documentos com bump de data seco reprovam (`ADR-0013`, `RN-0027`). */
  lastReviewedBumpLimit: number;
  /** A forma escrita dos IDs deste projeto (`ADR-0011`). Nunca a identidade. */
  idFormat: IdFormat;
  artifacts: ArtifactRule[];
  documents: DocumentRule[];
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

/**
 * A forma escrita dos IDs deste projeto (`ADR-0011`, `RN-0024`). Ausente, é a
 * do toolkit — e o padrão existe para que nenhum repositório já instalado
 * precise declarar nada.
 */
function parseIdFormat(raw: unknown): IdFormat {
  if (raw === undefined || raw === null) return DEFAULT_ID_FORMAT;
  const item = asRecord(raw, 'id-format');

  const separator = item.separator ?? DEFAULT_ID_FORMAT.separator;
  if (typeof separator !== 'string' || !SEPARATORS_ALLOWED.includes(separator)) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: id-format.separator "${String(separator)}" não é aceito. ` +
        `Válidos: ${SEPARATORS_ALLOWED.map((value) => `"${value}"`).join(', ')} (ADR-0011).`,
    );
  }

  const padding = item.padding ?? DEFAULT_ID_FORMAT.padding;
  if (
    typeof padding !== 'number' ||
    !Number.isInteger(padding) ||
    padding < PADDING_RANGE.min ||
    padding > PADDING_RANGE.max
  ) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: id-format.padding "${String(padding)}" precisa ser inteiro entre ` +
        `${PADDING_RANGE.min} e ${PADDING_RANGE.max} (ADR-0011).`,
    );
  }

  return { separator, padding };
}

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
  if (collectionRaw !== 'per-file' && collectionRaw !== 'table' && collectionRaw !== 'sections') {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: ${where}.collection precisa ser "per-file", "table" ou "sections".`,
    );
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

/**
 * O limiar de bump em massa (`ADR-0013`). Piso 2, e não 1: um documento revisado
 * de verdade atualiza a data, e limiar 1 reprovaria o mecanismo funcionando.
 */
export const DEFAULT_BUMP_LIMIT = 3;

function parseBumpLimit(raw: unknown): number {
  if (raw === undefined || raw === null) return DEFAULT_BUMP_LIMIT;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 2) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: last-reviewed-bump-limit "${String(raw)}" precisa ser inteiro maior ou igual a 2 ` +
        '(limiar 1 reprovaria a revisão legítima de um documento só — ADR-0013).',
    );
  }
  return raw;
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

  const documentsRaw = Array.isArray(root.documents) ? root.documents : [];
  const documents = documentsRaw.map(parseDocument);

  const seenDocuments = new Set<string>();
  const seenRoles = new Set<string>();
  for (const document of documents) {
    if (seenDocuments.has(document.path)) {
      throw new OwnershipError(
        `${OWNERSHIP_PATH}: documento "${document.path}" declarado duas vezes. Um documento, um dono.`,
      );
    }
    seenDocuments.add(document.path);

    if (document.role === null) continue;
    if (seenRoles.has(document.role)) {
      throw new OwnershipError(
        `${OWNERSHIP_PATH}: papel "${document.role}" declarado em dois documentos. Um papel, um documento.`,
      );
    }
    seenRoles.add(document.role);
  }

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
    lastReviewedBumpLimit: parseBumpLimit(root['last-reviewed-bump-limit']),
    idFormat: parseIdFormat(root['id-format']),
    artifacts,
    documents,
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

function normalizePath(repoPath: string): string {
  return repoPath.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** O caminho declarado cobre este caminho? Diretório por prefixo, arquivo por igualdade. */
function covers(declared: string, repoPath: string): boolean {
  const target = declared.replace(/\\/g, '/');
  return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target;
}

/** Regra dona de um caminho relativo à raiz do repositório, ou null. */
export function findArtifactRule(config: OwnershipConfig, repoPath: string): ArtifactRule | null {
  const normalized = normalizePath(repoPath);
  return config.artifacts.find((artifact) => covers(artifact.path, normalized)) ?? null;
}

function parseDocument(raw: unknown, index: number): DocumentRule {
  const where = `documents[${index}]`;
  const item = asRecord(raw, where);

  const owner = requireString(item, 'owner', where);
  if (!owner.startsWith('@')) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: ${where}.owner "${owner}" precisa começar com @ e espelhar o CODEOWNERS.`,
    );
  }

  const skill = item.skill;
  if (skill !== undefined && (typeof skill !== 'string' || skill.trim() === '')) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: ${where}.skill precisa ser uma string não vazia, ou ficar ausente — documento pode não ter skill dona.`,
    );
  }

  const role = item.role;
  if (role !== undefined && !DOCUMENT_ROLES.includes(role as DocumentRole)) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: ${where}.role "${String(role)}" desconhecido. Válidos: ${DOCUMENT_ROLES.join(', ')}.`,
    );
  }

  return {
    path: requireString(item, 'path', where),
    owner,
    skill: skill === undefined ? null : skill,
    role: role === undefined ? null : (role as DocumentRole),
  };
}

/** Documento dono de um caminho relativo, ou null. Mesma semântica de `findArtifactRule`. */
export function findDocumentRule(config: OwnershipConfig, repoPath: string): DocumentRule | null {
  const normalized = normalizePath(repoPath);
  return config.documents.find((document) => covers(document.path, normalized)) ?? null;
}

/** O documento que o projeto declarou com este papel, ou null. */
export function documentWithRole(config: OwnershipConfig, role: DocumentRole): DocumentRule | null {
  return config.documents.find((document) => document.role === role) ?? null;
}
