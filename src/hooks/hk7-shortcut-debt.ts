#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write): sugere registrar a dívida quando um atalho novo
 * aparece sem `TDR-` por perto.
 *
 * Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 — "um atalho legítimo não
 * pode ser bloqueado". A saída é `additionalContext`, e este arquivo não
 * conhece a palavra `deny`. Regra do projeto: `RN-0014`.
 *
 * É o primeiro hook que **não** lê o `docs/.ownership.yml`: marcador de atalho
 * é sintaxe da linguagem, não caminho de projeto. Não há o que configurar, e
 * inventar configuração aqui seria pedir ao projeto que declarasse o óbvio.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyToolInput } from './lib/edit.ts';
import { toRepoPath } from './lib/paths.ts';
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk7Decision = { action: 'silent' } | { action: 'remind'; context: string };

const SILENT: Hk7Decision = { action: 'silent' };

/**
 * Lista fechada, de propósito: um hook que precisa interpretar intenção está no
 * lugar errado (spec §7). Estes são os marcadores que a spec nomeia — atalho de
 * prosa, supressão de tipo ou de lint, e teste ignorado.
 */
const SHORTCUT_MARKERS: readonly RegExp[] = Object.freeze([
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bHACK\b/,
  /\bXXX\b/,
  /@ts-ignore\b/,
  /@ts-expect-error\b/,
  /eslint-disable/,
  /\b(?:test|it|describe)\.(?:skip|todo)\b/,
  /\bskip:\s*true\b/,
]);

/**
 * Citação de dívida, em qualquer forma escrita (`ADR-0011`). Este hook continua
 * sem ler o `.ownership.yml` de propósito: marcador de atalho é sintaxe da
 * linguagem, não caminho de projeto — e reconhecer `TDR001` e `TDR-0001` não
 * exige configuração nenhuma.
 */
const DEBT = /\bTDR-?\d{2,}\b/;

/** Janela de vizinhança: o comentário que registra a dívida costuma estar colado. */
const NEAR_LINES = 2;

/** Linhas com marcador de atalho e sem `TDR-` na vizinhança, já aparadas. */
export function shortcutsWithoutDebt(source: string): string[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const found: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (!SHORTCUT_MARKERS.some((marker) => marker.test(line))) continue;

    const window = lines.slice(Math.max(0, i - NEAR_LINES), i + NEAR_LINES + 1).join('\n');
    if (DEBT.test(window)) continue;

    found.push(line.trim());
  }

  return found;
}

/** O que `after` tem e `before` não — contando repetição, não só presença. */
function onlyInAfter(before: readonly string[], after: readonly string[]): string[] {
  const remaining = [...before];
  const novos: string[] = [];

  for (const line of after) {
    const at = remaining.indexOf(line);
    if (at === -1) novos.push(line);
    else remaining.splice(at, 1);
  }

  return novos;
}

export function decideHk7(payload: HookPayload, env: HookEnv): Hk7Decision {
  const toolInput = payload.tool_input;
  if (!toolInput) return SILENT;

  const filePath = toolInput.file_path;
  if (typeof filePath !== 'string') return SILENT;

  const repoPath = toRepoPath(filePath, env.hostRoots);
  if (repoPath === null) return SILENT;

  // Em Markdown, `TODO` é prosa **sobre** o marcador — a própria RN-0014 o
  // escreve. Um lembrete a cada edição de doc ensina a ignorar o lembrete.
  if (repoPath.toLowerCase().endsWith('.md')) return SILENT;

  let current: string;
  try {
    current = readFileSync(join(env.root, repoPath), 'utf8');
  } catch {
    current = ''; // arquivo novo: tudo que vier é novo
  }

  const next = applyToolInput(current, toolInput);
  if (next === null) return SILENT; // não dá para prever o resultado

  const novos = onlyInAfter(shortcutsWithoutDebt(current), shortcutsWithoutDebt(next));
  if (novos.length === 0) return SILENT;

  return {
    action: 'remind',
    context:
      `HK-7: \`${repoPath}\` ganhou marcador de atalho sem dívida registrada por perto.\n` +
      `${novos.map((line) => `- \`${line}\``).join('\n')}\n` +
      'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 e `RN-0014` — atalho consciente vira `TDR-nnnn` ' +
      'com gatilho de pagamento observável, não `TODO` órfão. Caminho válido: `/debt <o atalho>` ' +
      '(skill dona: decision-recorder), e cite o `TDR-nnnn` na linha do marcador.\n' +
      'Isto é lembrete e devolve o controle: um atalho legítimo existe, e a decisão de registrá-lo ou não é humana.',
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return; // falha aberta
  const decision = decideHk7(payload, hookEnv());
  emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null);
}

if (process.argv[1]?.endsWith('hk7-shortcut-debt.ts')) {
  main().catch(() => process.exit(0)); // falha aberta, sempre
}
