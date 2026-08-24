import type { ArtifactRule } from '../config/ownership.ts';

/** Campos obrigatórios de um artefato individual (spec §2). */
export const REQUIRED_FIELDS: readonly string[] = [
  'id',
  'title',
  'status',
  'owner',
  'trigger',
  'last-reviewed',
];

/** Campos obrigatórios do arquivo-container de uma coleção em tabela. */
export const CONTAINER_REQUIRED_FIELDS: readonly string[] = [
  'title',
  'owner',
  'trigger',
  'last-reviewed',
];

/** Allowlist padrão de mutação de item congelado (spec §2 e §7). */
export const MUTABLE_FIELDS_DEFAULT: readonly string[] = ['status', 'superseded-by', 'last-reviewed'];

/** Máquina de estados por prefixo (spec §4). Prefixos das fases 2+ vêm de `states` no .ownership.yml. */
export const STATUS_MACHINE: Readonly<Record<string, readonly string[]>> = Object.freeze({
  ADR: ['draft', 'accepted', 'superseded'],
  DA: ['open', 'resolved', 'dropped'],
  TDR: ['open', 'paid', 'accepted-permanently'],
});

/** "Nenhum estado terminal permite edição do corpo" (spec §4). */
export const FROZEN_STATUSES: ReadonlySet<string> = new Set([
  'accepted',
  'superseded',
  'deprecated',
  'published',
  'paid',
]);

/** "Nenhum agente promove estado sozinho" (spec §4); é o gatilho de HK-3. */
export const HUMAN_PROMOTIONS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'draft', to: 'accepted' },
  { from: 'open', to: 'resolved' },
]);

export function statesFor(rule: ArtifactRule): readonly string[] | null {
  if (rule.states !== null) return rule.states;
  return STATUS_MACHINE[rule.idPrefix] ?? null;
}

/**
 * Vocabulário de cadência proibido em `trigger` (spec §2 e anti-requisito §13).
 * Um gatilho válido nomeia um evento observável, não uma data de calendário.
 */
const CADENCE_PATTERNS: readonly RegExp[] = [
  /\b(?:tri|bi|se)?mestral(?:mente)?\b/i,
  /\bmensal(?:mente)?\b/i,
  /\bsemanal(?:mente)?\b/i,
  /\bdiariamente\b/i,
  /\banual(?:mente)?\b/i,
  /\bperi[oó]dic[ao](?:mente)?\b/i,
  /\bcad[êe]ncia\b/i,
  /\ba cada\b/i,
  /\bquarterly\b/i,
  /\bmonthly\b/i,
  /\bweekly\b/i,
  /\bdaily\b/i,
  /\bannually\b/i,
  /\bperiodically\b/i,
  /\bevery\s+\w+/i,
  /\bsprint\b/i,
  /\btod[oa]\s+(?:m[êe]s|ano|semana|sprint)\b/i,
];

/** Devolve o trecho que caracteriza cadência, ou null. */
export function findCadence(trigger: string): string | null {
  for (const pattern of CADENCE_PATTERNS) {
    const match = pattern.exec(trigger);
    if (match) return match[0];
  }
  return null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const ID = /^([A-Z]{2,4})-(\d{3,4})$/;

export function parseId(value: unknown): { prefix: string; number: number } | null {
  if (typeof value !== 'string') return null;
  const match = ID.exec(value);
  if (!match?.[1] || !match[2]) return null;
  return { prefix: match[1], number: Number.parseInt(match[2], 10) };
}
