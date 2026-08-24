import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ArtifactRule, OwnershipConfig } from '../config/ownership.ts';
import { parseFrontmatter, FrontmatterSyntaxError } from '../frontmatter/parse.ts';
import type { Frontmatter } from '../frontmatter/parse.ts';
import { parseItemTable } from './table.ts';
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

  const items =
    rule.collection === 'table' && frontmatter
      ? parseItemTable(frontmatter.body, frontmatter.bodyStartLine)
      : rule.collection === 'table'
        ? parseItemTable(source, 1)
        : [];

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
