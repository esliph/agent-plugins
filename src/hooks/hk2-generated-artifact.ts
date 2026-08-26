#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): nega editar artefato gerado.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §5 (SK-5, regra 1) — "se
 * pode ser gerado, não escreva". O caminho vem de `generated[]` no
 * docs/.ownership.yml, ou do marcador que o próprio arquivo carrega (§2).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadOwnership } from '../config/ownership.ts';
import type { GeneratedRule } from '../config/ownership.ts';
import { toRepoPath } from './lib/paths.ts';
import { denyOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk2Decision = { action: 'allow' } | { action: 'deny'; reason: string };

const ALLOW: Hk2Decision = { action: 'allow' };

/**
 * Marcador da spec §2. Só o topo do arquivo conta: mais abaixo, a mesma frase é
 * prosa **sobre** o marcador — como esta linha aqui.
 */
const MARKER = /generated:\s*do not edit/i;
const MARKER_WINDOW = 4096;

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Regra de `generated[]` que cobre este caminho; diretório cobre o que está dentro. */
export function findGeneratedRule(
  rules: readonly GeneratedRule[],
  repoPath: string,
): GeneratedRule | null {
  const target = normalize(repoPath);
  for (const rule of rules) {
    const declared = normalize(rule.path);
    if (declared.endsWith('/') ? target.startsWith(declared) : target === declared) return rule;
  }
  return null;
}

export function decideHk2(payload: HookPayload, env: HookEnv): Hk2Decision {
  const filePath = payload.tool_input?.file_path;
  if (typeof filePath !== 'string') return ALLOW;

  const repoPath = toRepoPath(filePath, env.hostRoots);
  if (repoPath === null) return ALLOW;

  let config;
  try {
    config = loadOwnership(env.root);
  } catch {
    return ALLOW; // falha aberta (RNF-0001)
  }

  // Caminho declarado nega mesmo com o arquivo ausente: criar à mão o que um
  // gerador produz é exatamente o que RN-0012 proíbe.
  const rule = findGeneratedRule(config.generated, repoPath);
  if (rule) {
    return {
      action: 'deny',
      reason:
        `HK-2 bloqueou: \`${repoPath}\` é artefato gerado, declarado em \`generated[]\` no docs/.ownership.yml. ` +
        'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §5 (SK-5, regra 1) — se pode ser gerado, não se escreve; ' +
        'uma edição à mão vive até a próxima execução do gerador e mente até lá. ' +
        `Caminho válido: mude a fonte anotada e rode \`${rule.command} > ${rule.path}\`. ` +
        'Skill dona: contract-keeper; `living-docs drift` (CI-5) verifica a deriva no PR.',
    };
  }

  let head: string;
  try {
    head = readFileSync(join(env.root, repoPath), 'utf8').slice(0, MARKER_WINDOW);
  } catch {
    return ALLOW; // arquivo que não existe não carrega marcador
  }
  if (!MARKER.test(head)) return ALLOW;

  return {
    action: 'deny',
    reason:
      `HK-2 bloqueou: \`${repoPath}\` abre com o marcador \`generated: do not edit\` (spec §2). ` +
      'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §5 (SK-5, regra 1) — o que é gerado muda pela fonte, não pelo arquivo. ' +
      'Caminho válido: mude a fonte anotada e rode o gerador. ' +
      'Este arquivo não está em `generated[]` no docs/.ownership.yml — declare-o lá, com o comando do gerador, ' +
      'para que `CI-5` (`living-docs drift`) também o cubra. Skill dona: contract-keeper.',
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return; // falha aberta
  const decision = decideHk2(payload, hookEnv());
  emit(decision.action === 'deny' ? denyOutput(decision.reason) : null);
}

if (process.argv[1]?.endsWith('hk2-generated-artifact.ts')) {
  main().catch(() => process.exit(0)); // falha aberta, sempre
}
