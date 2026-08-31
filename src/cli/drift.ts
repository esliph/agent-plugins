import { loadOwnership } from '../config/ownership.ts';
import { driftChecks } from '../checks/registry.ts';
import { runCommand } from '../exec/command.ts';
import type { CommandRunner } from '../exec/command.ts';
import { todayIso } from '../core/dates.ts';
import type { Finding } from '../core/types.ts';

export interface DriftResult {
  findings: Finding[];
  /** Quantos artefatos gerados foram comparados. Zero significa "nada declarado". */
  checked: number;
  exitCode: number;
  /** Quanto o conjunto de checks levou, medido (RNF-0005). */
  elapsedMs: number;
}

export function runDrift(root: string, exec: CommandRunner = runCommand): DriftResult {
  const inicio = process.hrtime.bigint();
  const config = loadOwnership(root);
  // `docs: []` e `documents: []` de propósito: CI-5 não lê artefato nenhum — ele
  // compara o arquivo gerado com a saída do gerador. `today` entra porque o
  // contexto é um só.
  const context = { root, config, docs: [], documents: [], today: todayIso() };

  const findings = driftChecks(exec).flatMap((check) => check.run(context));

  return {
    findings,
    checked: config.generated.length,
    exitCode: findings.some((finding) => finding.severity === 'error') ? 1 : 0,
    elapsedMs: Number(process.hrtime.bigint() - inicio) / 1e6,
  };
}
