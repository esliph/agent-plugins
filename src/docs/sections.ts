import { parseId } from './schema.ts';
import { normalizeKey } from './item.ts';
import type { DocItem } from './item.ts';

const HEADING = /^#{2,4}\s+([A-Z]{2,4}-\d{3,4})\s*(?:[—–-]\s*(.*))?$/;
const FIELD = /^[-*]\s+\*\*([^*]+?)\*\*\s*:?\s*(.*)$/;
const FENCE = /^(?:```|~~~)/;

/**
 * Itens de um artefato mantido como seções com ID (spec §3 — requisitos).
 * `startLine` é a linha 1-indexed onde `source` começa no arquivo.
 *
 * Formato reconhecido:
 *
 *     ## RN-0001 — Título da regra
 *
 *     - **status:** active
 *     - **relates-to:** ADR-0002
 *
 *     Enunciado.
 *
 * Bloco de código é pulado inteiro: um exemplo de formato dentro de ``` mostra
 * um título com ID sem declarar requisito nenhum, e a semente que `init` escreve
 * é exatamente isso.
 */
export function parseItemSections(source: string, startLine: number): DocItem[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const items: DocItem[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test((lines[i] ?? '').trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = HEADING.exec((lines[i] ?? '').trim());
    if (!heading?.[1] || !parseId(heading[1])) continue;

    const fields: Record<string, string> = {};
    if (heading[2] !== undefined && heading[2].trim() !== '') {
      fields.title = heading[2].trim();
    }

    for (let j = i + 1; j < lines.length; j++) {
      const line = (lines[j] ?? '').trim();
      if (line === '') continue;
      if (HEADING.test(line) || line.startsWith('#') || FENCE.test(line)) break;
      const field = FIELD.exec(line);
      if (!field?.[1]) break;
      fields[normalizeKey(field[1])] = (field[2] ?? '').trim();
    }

    items.push({
      id: heading[1],
      status: fields.status ?? '',
      line: startLine + i,
      fields,
    });
  }

  return items;
}
