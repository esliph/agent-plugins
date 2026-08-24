#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): intercepta promoção de estado que exige ato humano.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §4 — "nenhum agente promove
 * estado sozinho". Devolve `ask`, nunca `deny`: promover é legítimo, só não é
 * ato de agente.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findArtifactRule, loadOwnership } from '../config/ownership.ts';
import type { ArtifactRule } from '../config/ownership.ts';
import { parseFrontmatter } from '../frontmatter/parse.ts';
import { HUMAN_PROMOTIONS } from '../docs/schema.ts';
import { parseItemTable } from '../docs/table.ts';
import { parseItemSections } from '../docs/sections.ts';
import type { DocItem } from '../docs/item.ts';
import { applyToolInput } from './lib/edit.ts';
import { toRepoPath } from './lib/paths.ts';
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk3Decision = { action: 'allow' } | { action: 'ask'; reason: string };

const ALLOW: Hk3Decision = { action: 'allow' };

interface Promotion {
  id: string;
  from: string;
  to: string;
}

function isHumanPromotion(from: string, to: string): boolean {
  return HUMAN_PROMOTIONS.some((promotion) => promotion.from === from && promotion.to === to);
}

function statusOf(source: string): { id: string; status: string } | null {
  try {
    const frontmatter = parseFrontmatter(source);
    const id = frontmatter?.data.id;
    const status = frontmatter?.data.status;
    if (typeof id !== 'string' || typeof status !== 'string') return null;
    return { id, status };
  } catch {
    return null;
  }
}

function findPromotion(before: string, after: string, rule: ArtifactRule): Promotion | null {
  if (rule.collection !== 'per-file') {
    const parse = (source: string): DocItem[] =>
      rule.collection === 'table' ? parseItemTable(source, 1) : parseItemSections(source, 1);
    const previous = new Map(parse(before).map((item) => [item.id, item.status]));
    for (const item of parse(after)) {
      const from = previous.get(item.id);
      if (from !== undefined && isHumanPromotion(from, item.status)) {
        return { id: item.id, from, to: item.status };
      }
    }
    return null;
  }

  const from = statusOf(before);
  const to = statusOf(after);
  if (!from || !to) return null;
  return isHumanPromotion(from.status, to.status)
    ? { id: to.id, from: from.status, to: to.status }
    : null;
}

export function decideHk3(payload: HookPayload, env: HookEnv): Hk3Decision {
  const toolInput = payload.tool_input;
  if (!toolInput) return ALLOW;

  const filePath = toolInput.file_path;
  if (typeof filePath !== 'string') return ALLOW;

  const repoPath = toRepoPath(filePath, env.hostRoots);
  if (repoPath === null) return ALLOW;

  let rule;
  try {
    rule = findArtifactRule(loadOwnership(env.root), repoPath);
  } catch {
    return ALLOW; // falha aberta
  }
  if (!rule) return ALLOW;

  let current: string;
  try {
    current = readFileSync(join(env.root, repoPath), 'utf8');
  } catch {
    return ALLOW; // arquivo novo nasce em draft/open; nada a promover
  }

  const next = applyToolInput(current, toolInput);
  if (next === null) return ALLOW;

  const promotion = findPromotion(current, next, rule);
  if (!promotion) return ALLOW;

  return {
    action: 'ask',
    reason:
      `HK-3: esta edição promove ${promotion.id} de \`${promotion.from}\` para \`${promotion.to}\`. ` +
      'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §4 — nenhum agente promove estado sozinho; ' +
      'o máximo que uma skill escreve é `draft`/`open`, e a aceitação é ato humano. ' +
      `Confirme se a decisão foi realmente tomada por uma pessoa. Artefato dono: ${rule.path} (${rule.owner}); ` +
      `skill dona: ${rule.skill}.`,
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return;
  const decision = decideHk3(payload, hookEnv());
  emit(decision.action === 'ask' ? askOutput(decision.reason) : null);
}

if (process.argv[1]?.endsWith('hk3-state-promotion.ts')) {
  main().catch(() => process.exit(0));
}
