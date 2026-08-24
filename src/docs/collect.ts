import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ArtifactRule, OwnershipConfig } from '../config/ownership.ts';
import { parseFrontmatter, FrontmatterSyntaxError } from '../frontmatter/parse.ts';
import type { Frontmatter } from '../frontmatter/parse.ts';
import { parseItemTable } from './table.ts';
import { parseItemSections } from './sections.ts';
import type { DocItem } from './item.ts';

export interface ArtifactDoc {
  /** Caminho relativo à raiz do repositório, sempre com `/`. */
  file: string;
  rule: ArtifactRule;
  source: string;
  frontmatter: Frontmatter | null;
  syntaxError: FrontmatterSyntaxError | null;
  /** Itens da coleção (`table` ou `sections`); vazio para `per-file`. */
  items: DocItem[];
}

function listMarkdown(root: string, relativeDir: string): string[] {
  const absolute = join(root, relativeDir);
  let entries: string[];
  try {
    entries = readdirSync(absolute);
  } catch {
    return [];
  }

  const found: string[] = [];
  for (const entry of entries) {
    const relative = `${relativeDir.replace(/\/$/, '')}/${entry}`;
    if (statSync(join(root, relative)).isDirectory()) {
      found.push(...listMarkdown(root, `${relative}/`));
    } else if (entry.endsWith('.md') && !entry.includes('.gen.')) {
      found.push(relative);
    }
  }
  return found;
}

/**
 * Qual parser lê os itens deste artefato. A escolha é da configuração, não do
 * check: `per-file` não tem itens, `table` os lê em linhas e `sections` em
 * títulos com ID (spec §3).
 */
function parseItems(rule: ArtifactRule, source: string, body: string | null, bodyStart: number): DocItem[] {
  const text = body ?? source;
  const start = body === null ? 1 : bodyStart;
  if (rule.collection === 'table') return parseItemTable(text, start);
  if (rule.collection === 'sections') return parseItemSections(text, start);
  return [];
}

function readDoc(root: string, file: string, rule: ArtifactRule): ArtifactDoc | null {
  let source: string;
  try {
    source = readFileSync(join(root, file), 'utf8');
  } catch {
    return null;
  }

  let frontmatter: Frontmatter | null = null;
  let syntaxError: FrontmatterSyntaxError | null = null;
  try {
    frontmatter = parseFrontmatter(source);
  } catch (err) {
    if (!(err instanceof FrontmatterSyntaxError)) throw err;
    syntaxError = err;
  }

  const items = parseItems(
    rule,
    source,
    frontmatter ? frontmatter.body : null,
    frontmatter ? frontmatter.bodyStartLine : 1,
  );

  return { file, rule, source, frontmatter, syntaxError, items };
}

export function collectArtifacts(root: string, config: OwnershipConfig): ArtifactDoc[] {
  const docs: ArtifactDoc[] = [];

  for (const rule of config.artifacts) {
    const target = rule.path.replace(/\\/g, '/');
    const files = target.endsWith('/') ? listMarkdown(root, target) : [target];
    for (const file of files) {
      const doc = readDoc(root, file, rule);
      if (doc) docs.push(doc);
    }
  }

  return docs;
}
