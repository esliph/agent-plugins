#!/usr/bin/env node
/**
 * PreToolUse (Bash): pergunta quando o staged toca caminho vigiado e não traz o
 * doc dono.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 — o mecanismo 1 no ponto
 * mais barato possível. Devolve `ask`, nunca `deny`: um commit sem o doc pode
 * ser legítimo, e quem decide isso é uma pessoa.
 */
import { loadOwnership } from '../config/ownership.ts';
import { pendingDocs } from '../config/watches.ts';
import type { WatchMatch } from '../config/watches.ts';
import { stagedPaths } from '../git/staged.ts';
import type { GitRunner } from '../git/staged.ts';
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk5Decision = { action: 'allow' } | { action: 'ask'; reason: string };

const ALLOW: Hk5Decision = { action: 'allow' };

/**
 * `git … commit` no início do comando ou depois de um separador.
 *
 * Reconhecimento sintático, de propósito: um hook que interpreta intenção está
 * no lugar errado (spec §7). Ele erra para o lado de perguntar demais — a saída
 * é `ask`, e uma pergunta a mais custa uma tecla.
 */
const GIT_COMMIT = /(?:^|[;&|]\s*)git\b[^;&|]*\bcommit\b/;

export function isGitCommit(command: string): boolean {
  return GIT_COMMIT.test(command.trim());
}

function describe(match: WatchMatch): string {
  const parts = [`- \`${match.doc}\``];
  if (match.owner !== null) parts.push(`(dono: ${match.owner})`);
  parts.push(`— exigido por: ${match.matched.join(', ')}`);
  if (match.reason !== null) parts.push(`Motivo: ${match.reason}`);
  if (match.skill !== null) parts.push(`Skill dona: ${match.skill}.`);
  return parts.join(' ');
}

export function decideHk5(payload: HookPayload, env: HookEnv, run?: GitRunner): Hk5Decision {
  if (payload.tool_name !== undefined && payload.tool_name !== 'Bash') return ALLOW;

  const command = payload.tool_input?.command;
  if (typeof command !== 'string' || !isGitCommit(command)) return ALLOW;

  let config;
  try {
    config = loadOwnership(env.root);
  } catch {
    return ALLOW; // falha aberta
  }

  // Lista vazia significa "não sei": índice vazio, sem git, ou repositório recusado.
  const staged = stagedPaths(env.root, run);
  if (staged.length === 0) return ALLOW;

  const pending = pendingDocs(config, staged);
  if (pending.length === 0) return ALLOW;

  return {
    action: 'ask',
    reason:
      'HK-5: este commit leva código de caminho vigiado sem o doc dono. ' +
      'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 — se a atualização da documentação não cabe no ' +
      'PR que mudou o código, ela não acontece.\n' +
      `Pendente:\n${pending.map(describe).join('\n')}\n` +
      'Caminho válido: atualize o doc agora (skill dona acima) e refaça o `git add`. ' +
      'Se a mudança realmente não afeta o doc, isso é uma decisão humana — diga que é o caso e siga.',
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return; // falha aberta
  const decision = decideHk5(payload, hookEnv());
  emit(decision.action === 'ask' ? askOutput(decision.reason) : null);
}

if (process.argv[1]?.endsWith('hk5-commit-guard.ts')) {
  main().catch(() => process.exit(0)); // falha aberta, sempre
}
