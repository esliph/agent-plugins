import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import picomatch from 'picomatch';
import { findCitations } from './citations.ts';

/** Diretórios que nunca contêm citação escrita por gente. */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.cache']);

/** Acima disto, é dado, não texto — e ler custa mais do que vale. */
const MAX_BYTES = 512 * 1024;

export interface CitationSite {
  /** Caminho relativo à raiz do repositório, sempre com `/`. */
  file: string;
  /** Linha 1-indexed. */
  line: number;
}

/** Byte NUL é o sinal barato de "isto é dado binário, não texto". */
function isProbablyText(content: string): boolean {
  return content.indexOf(String.fromCharCode(0)) === -1;
}

function walk(root: string, relative: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(join(root, relative));
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = relative === '' ? entry : `${relative}/${entry}`;
    let isDirectory: boolean;
    try {
      isDirectory = statSync(join(root, path)).isDirectory();
    } catch {
      continue;
    }
    if (isDirectory) walk(root, path, out);
    else out.push(path);
  }
}

/**
 * Onde cada ID aparece, restrito aos caminhos de `globs`.
 * Chave: o ID exatamente como escrito no texto — a canonização é de quem compara.
 */
export function scanCitations(root: string, globs: readonly string[]): Map<string, CitationSite[]> {
  const sites = new Map<string, CitationSite[]>();
  if (globs.length === 0) return sites;

  const matches = picomatch([...globs]);
  const files: string[] = [];
  walk(root, '', files);

  for (const file of files) {
    if (!matches(file)) continue;

    let content: string;
    try {
      if (statSync(join(root, file)).size > MAX_BYTES) continue;
      content = readFileSync(join(root, file), 'utf8');
    } catch {
      continue;
    }
    if (!isProbablyText(content)) continue;

    for (const citation of findCitations(content)) {
      const list = sites.get(citation.id) ?? [];
      list.push({ file, line: citation.line });
      sites.set(citation.id, list);
    }
  }

  return sites;
}
