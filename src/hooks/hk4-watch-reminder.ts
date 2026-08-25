#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write): lembra o doc dono depois de editar caminho vigiado.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 — mecanismo 1 no momento
 * em que a informação ainda é útil. Lembrete, nunca bloqueio: a saída é
 * `additionalContext`, e este arquivo não conhece a palavra `deny`.
 */
import { loadOwnership } from '../config/ownership.ts';
import { coversDoc, watchesFor } from '../config/watches.ts';
import type { WatchMatch } from '../config/watches.ts';
import { toRepoPath } from './lib/paths.ts';
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk4Decision = { action: 'silent' } | { action: 'remind'; context: string };

const SILENT: Hk4Decision = { action: 'silent' };

function describe(match: WatchMatch): string {
  const parts = [`- \`${match.doc}\``];
  if (match.owner !== null) parts.push(`(dono: ${match.owner})`);
  if (match.reason !== null) parts.push(`— ${match.reason}`);
  parts.push(
    match.skill !== null
      ? `Skill dona: ${match.skill}.`
      : 'Sem skill declarada para este doc — o dono está no CODEOWNERS.',
  );
  return parts.join(' ');
}

export function decideHk4(payload: HookPayload, env: HookEnv): Hk4Decision {
  const filePath = payload.tool_input?.file_path;
  if (typeof filePath !== 'string') return SILENT;

  const repoPath = toRepoPath(filePath, env.hostRoots);
  if (repoPath === null) return SILENT;

  let config;
  try {
    config = loadOwnership(env.root);
  } catch {
    return SILENT; // falha aberta
  }

  // Quem acabou de editar o doc dono não precisa ser lembrado dele.
  const pending = watchesFor(config, [repoPath]).filter((match) => !coversDoc(match.doc, [repoPath]));
  if (pending.length === 0) return SILENT;

  return {
    action: 'remind',
    context:
      `HK-4: \`${repoPath}\` é caminho vigiado em \`docs/.ownership.yml\` (\`watches\`). ` +
      'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 — a atualização do doc dono cabe no mesmo PR; ' +
      'se não couber, ela não acontece.\n' +
      `Doc dono a atualizar:\n${pending.map(describe).join('\n')}\n` +
      'Isto é lembrete, não é bloqueio: se a mudança realmente não afeta o doc, siga em frente.',
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return; // falha aberta
  const decision = decideHk4(payload, hookEnv());
  emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null);
}

if (process.argv[1]?.endsWith('hk4-watch-reminder.ts')) {
  main().catch(() => process.exit(0)); // falha aberta, sempre
}
