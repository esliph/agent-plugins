import picomatch from 'picomatch';
import { fieldOf } from '../config/ownership.ts';
import type { ArtifactDoc } from './collect.ts';

/**
 * Uma decisão aberta que nomeou os caminhos que ela bloqueia (`RN-0026`).
 *
 * O campo é opcional de propósito: decisão aberta sem caminho declarado continua
 * válida e não bloqueia nada. O que a spec recusa é o contrário — declarar o
 * caminho e não ser lembrado.
 */
export interface BlockedClaim {
  id: string;
  /** O documento onde a decisão mora. */
  doc: string;
  line: number;
  /** Os globs declarados, como o projeto os escreveu. */
  paths: string[];
  skill: string;
  owner: string;
  /** O enunciado da lacuna, quando o item o traz. */
  gap: string | null;
}

const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'nenhum', 'nenhuma']);

/** Um caminho por vírgula ou por espaço; crase é decoração de markdown. */
function splitPaths(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((path) => path.replace(/`/g, '').trim())
    .filter((path) => path !== '' && !EMPTY.has(path.toLowerCase()));
}

/** As reivindicações declaradas por decisões `open`, em qualquer forma de coleção. */
export function blockedClaims(docs: readonly ArtifactDoc[]): BlockedClaim[] {
  const claims: BlockedClaim[] = [];

  for (const doc of docs) {
    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data;
      if (data?.status !== 'open' || typeof data.id !== 'string') continue;
      const raw = data.blocks;
      const paths = splitPaths(Array.isArray(raw) ? raw.join(' ') : String(raw ?? ''));
      if (paths.length === 0) continue;

      claims.push({
        id: data.id,
        doc: doc.file,
        line: doc.frontmatter?.lines.id ?? 1,
        paths,
        skill: doc.rule.skill,
        owner: doc.rule.owner,
        gap: typeof data.title === 'string' ? data.title : null,
      });
      continue;
    }

    for (const item of doc.items) {
      if (item.status !== 'open') continue;
      const raw = fieldOf(doc.rule, item, 'blocks');
      if (raw === null) continue;
      const paths = splitPaths(raw);
      if (paths.length === 0) continue;

      claims.push({
        id: item.id,
        doc: doc.file,
        line: item.line,
        paths,
        skill: doc.rule.skill,
        owner: doc.rule.owner,
        gap: fieldOf(doc.rule, item, 'gap') ?? item.fields.title ?? null,
      });
    }
  }

  return claims;
}

/** Que reivindicações este conjunto de caminhos toca, e o que cada uma pegou. */
export function claimsFor(
  claims: readonly BlockedClaim[],
  paths: readonly string[],
): { claim: BlockedClaim; matched: string[] }[] {
  const normalized = paths.map((path) => path.replace(/\\/g, '/').replace(/^\.\//, ''));
  const hits: { claim: BlockedClaim; matched: string[] }[] = [];

  for (const claim of claims) {
    const matches = picomatch(claim.paths);
    // O próprio documento da decisão nunca é bloqueado: quem vai resolvê-la
    // precisa poder escrever nela.
    const matched = normalized.filter((path) => path !== claim.doc && matches(path));
    if (matched.length > 0) hits.push({ claim, matched });
  }

  return hits;
}
