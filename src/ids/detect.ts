import { listFiles, readTextFile } from '../core/files.ts';
import { PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';

export interface DetectedFormat {
  format: IdFormat;
  /** Quantas ocorrências foram lidas nessa forma. */
  count: number;
  /** Uma ocorrência real, para quem instala reconhecer o que o toolkit viu. */
  sample: string;
}

/**
 * Varredura deliberadamente permissiva: prefixo de 2 a 4 maiúsculas, separador
 * opcional de um caractere, 2 a 6 dígitos. A pergunta é "que forma este
 * repositório usa?", e um detector que já soubesse a resposta não detectaria
 * nada (`RF-0014`).
 */
const ANY_ID = /\b([A-Z]{2,4})([-_.:]?)(\d{2,6})\b/g;

function keyOf(separator: string, digits: number): string {
  return `${separator}|${digits}`;
}

/**
 * A forma escrita dominante nos caminhos dados, ou `null` quando não há ID
 * nenhum. Só os caminhos que o `init` resolveu entram: detectar formato no
 * repositório inteiro é ruído, não inventário.
 */
export function detectIdFormat(root: string, paths: readonly string[]): DetectedFormat | null {
  const globs = paths.map((path) => (path.endsWith('/') ? `${path}**` : path));
  const tallies = new Map<string, { format: IdFormat; count: number; sample: string }>();

  for (const file of listFiles(root, globs)) {
    const content = readTextFile(root, file);
    if (content === null) continue;

    for (const match of content.matchAll(ANY_ID)) {
      const separator = match[2] ?? '';
      const digits = (match[3] ?? '').length;
      if (!SEPARATORS_ALLOWED.includes(separator)) continue;
      if (digits < PADDING_RANGE.min || digits > PADDING_RANGE.max) continue;

      const key = keyOf(separator, digits);
      const tally = tallies.get(key);
      if (tally) {
        tally.count += 1;
        continue;
      }
      tallies.set(key, { format: { separator, padding: digits }, count: 1, sample: match[0] });
    }
  }

  let winner: DetectedFormat | null = null;
  for (const tally of tallies.values()) {
    if (winner === null || tally.count > winner.count) winner = tally;
  }
  return winner;
}
