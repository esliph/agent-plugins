import { DEFAULT_ID_FORMAT, parseId } from './schema.ts';
import type { IdFormat } from './schema.ts';
import { normalizeKey } from './item.ts';
import type { DocItem } from './item.ts';

function cells(row: string): string[] {
  const trimmed = row.trim();
  if (!trimmed.startsWith('|')) return [];
  return trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparator(row: string): boolean {
  const parts = cells(row);
  return parts.length > 0 && parts.every((cell) => /^:?-{3,}:?$/.test(cell));
}

/**
 * Itens de um artefato mantido como tabela (spec §3 — Open Decisions).
 * `startLine` é a linha 1-indexed onde `source` começa no arquivo.
 *
 * `fields` traz **todas** as colunas, pela chave normalizada do cabeçalho. Quem
 * pergunta por um campo canônico ("resolved-by") passa pelo `field-map` do
 * artefato — nome de coluna em português é do projeto, não do check.
 */
export function parseItemTable(
  source: string,
  startLine: number,
  format: IdFormat = DEFAULT_ID_FORMAT,
): DocItem[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const header = cells(lines[i] ?? '');
    const idColumn = header.findIndex((cell) => cell.toLowerCase() === 'id');
    const statusColumn = header.findIndex((cell) => cell.toLowerCase() === 'status');
    if (idColumn === -1 || statusColumn === -1) continue;
    if (!isSeparator(lines[i + 1] ?? '')) continue;

    const items: DocItem[] = [];
    for (let j = i + 2; j < lines.length; j++) {
      const row = cells(lines[j] ?? '');
      if (row.length === 0) break;
      const id = row[idColumn] ?? '';
      if (!parseId(id, format)) continue;

      const fields: Record<string, string> = {};
      for (let c = 0; c < header.length; c++) {
        const key = normalizeKey(header[c] ?? '');
        if (key !== '') fields[key] = (row[c] ?? '').trim();
      }

      items.push({ id, status: row[statusColumn] ?? '', line: startLine + j, fields });
    }
    return items;
  }

  return [];
}
