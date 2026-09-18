import { loadOwnership } from '../config/ownership.ts'
import { changelogChecks } from '../checks/registry.ts'
import { changedPaths, commitMessages } from '../git/diff.ts'
import type { GitRunner } from '../git/staged.ts'
import { todayIso } from '../core/dates.ts'
import type { Finding } from '../core/types.ts'

export interface ChangelogResult {
  findings: Finding[]
  /** Globs de `consumer-visible-paths` declarados. Zero significa "sem gatilho". */
  declared: number
  exitCode: number
  /** Quanto o conjunto de checks levou, medido (RNF-0005). */
  elapsedMs: number
}

/**
 * `living-docs changelog --base <ref>` — roda `CI-6` (`ADR-0006`, decisão 7).
 *
 * Fala com o git aqui, e não dentro do check: o check continua sendo uma
 * função pura de (fatos, configuração, arquivo) → achados.
 */
export function runChangelog(root: string, base: string, run?: GitRunner): ChangelogResult {
  const inicio = process.hrtime.bigint()
  const config = loadOwnership(root)

  // Sem gatilho declarado não se toca no git: falar com o repositório para
  // depois descobrir que não havia o que checar é custo sem resposta.
  if (config.consumerVisiblePaths.length === 0) {
    return { findings: [], declared: 0, exitCode: 0, elapsedMs: Number(process.hrtime.bigint() - inicio) / 1e6 }
  }

  const diff = {
    base,
    changed: changedPaths(root, base, run),
    messages: commitMessages(root, base, run),
  }

  // `docs: []` e `documents: []` de propósito: CI-6 não lê artefato nenhum — ele
  // lê o diff, a configuração e o doc alvo.
  const context = { root, config, docs: [], documents: [], today: todayIso() }
  const findings = changelogChecks(diff).flatMap(check => check.run(context))

  return {
    findings,
    declared: config.consumerVisiblePaths.length,
    exitCode: findings.some(finding => finding.severity === 'error') ? 1 : 0,
    elapsedMs: Number(process.hrtime.bigint() - inicio) / 1e6,
  }
}
