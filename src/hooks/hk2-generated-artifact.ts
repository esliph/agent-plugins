#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): nega editar artefato gerado.
 *
 * Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §5 (SK-5, regra 1) — "se
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
 * Marcador da spec §2. Só a PRIMEIRA LINHA do arquivo conta: mais abaixo, a
 * mesma frase é prosa **sobre** o marcador — como esta linha aqui. A janela é
 * pequena de propósito (não milhares de bytes): existe só para tolerar BOM
 * antes da quebra de linha, nunca para varrer o corpo do arquivo — do
 * contrário o hook trava prosa que apenas *menciona* o marcador, inclusive o
 * próprio código-fonte deste hook.
 */
const MARKER = /generated:\s*do not edit/i;
const MARKER_WINDOW = 512;

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Regra de `generated[]` que cobre este caminho. Um artefato, um comando: sem
 * suporte a diretório — `CI-5` lê `rule.path` com `readFileSync`, que não sabe
 * comparar um diretório com a saída de um gerador, então as duas metades
 * precisam concordar em exigir caminho de arquivo exato.
 */
export function findGeneratedRule(
  rules: readonly GeneratedRule[],
  repoPath: string,
): GeneratedRule | null {
  const target = normalize(repoPath);
  for (const rule of rules) {
    if (normalize(rule.path) === target) return rule;
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
        'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §5 (SK-5, regra 1) — se pode ser gerado, não se escreve; ' +
        'uma edição à mão vive até a próxima execução do gerador e mente até lá. ' +
        `Caminho válido: mude a fonte anotada e rode \`${rule.command} > ${rule.path}\`. ` +
        'Skill dona: contract-keeper; `living-docs drift` (CI-5) verifica a deriva no PR.',
    };
  }

  let firstLine: string;
  try {
    const window = readFileSync(join(env.root, repoPath), 'utf8').slice(0, MARKER_WINDOW);
    firstLine = window.split('\n')[0] ?? '';
  } catch {
    return ALLOW; // arquivo que não existe não carrega marcador
  }
  if (!MARKER.test(firstLine)) return ALLOW;

  return {
    action: 'deny',
    reason:
      `HK-2 bloqueou: \`${repoPath}\` abre com o marcador \`generated: do not edit\` (spec §2). ` +
      'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §5 (SK-5, regra 1) — o que é gerado muda pela fonte, não pelo arquivo. ' +
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
