import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RETIRED_IDS_PATH = 'docs/ids-retired.txt';

/**
 * Sintaxe única de citação (spec §8): <PREFIXO>-<número>.
 * Um match coincidente com um prefixo não declarado (ex.: uma referência a um
 * padrão como "ISO-8601") é inofensivo: `ci2-ids.ts` só resolve citações cujo
 * prefixo está em `known` (`.ownership.yml`), então esses casos são ignorados
 * silenciosamente — mesma regra que permite instalar o toolkit por fases.
 */
const CITATION = /\b([A-Z]{2,4})-(\d{3,4})\b/g;

export interface Citation {
  id: string;
  /** Linha 1-indexed dentro de `source`. */
  line: number;
}

export function findCitations(source: string): Citation[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const citations: Citation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    for (const match of line.matchAll(CITATION)) {
      citations.push({ id: match[0], line: i + 1 });
    }
  }

  return citations;
}

/** IDs retirados — nunca podem reaparecer (spec §2). */
export function loadRetiredIds(root: string): Set<string> {
  let source: string;
  try {
    source = readFileSync(join(root, RETIRED_IDS_PATH), 'utf8');
  } catch {
    return new Set();
  }

  const retired = new Set<string>();
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    retired.add(line);
  }
  return retired;
}
