const ID_CELL = /^[A-Z]{2,4}-\d{3,4}$/;

export interface TableItem {
  id: string;
  status: string;
  /** Linha 1-indexed no arquivo inteiro. */
  line: number;
}

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
 */
export function parseItemTable(source: string, startLine: number): TableItem[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const header = cells(lines[i] ?? '');
    const idColumn = header.findIndex((cell) => cell.toLowerCase() === 'id');
    const statusColumn = header.findIndex((cell) => cell.toLowerCase() === 'status');
    if (idColumn === -1 || statusColumn === -1) continue;
    if (!isSeparator(lines[i + 1] ?? '')) continue;

    const items: TableItem[] = [];
    for (let j = i + 2; j < lines.length; j++) {
      const row = cells(lines[j] ?? '');
      if (row.length === 0) break;
      const id = row[idColumn] ?? '';
      if (!ID_CELL.test(id)) continue;
      items.push({ id, status: row[statusColumn] ?? '', line: startLine + j });
    }
    return items;
  }

  return [];
}
