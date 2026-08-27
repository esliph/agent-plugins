import { loadOwnership } from '../config/ownership.ts';
import { collectArtifacts, collectDocuments } from '../docs/collect.ts';
import { CHECKS } from '../checks/registry.ts';
import { todayIso } from '../core/dates.ts';
import type { Finding } from '../core/types.ts';

export interface ValidateResult {
  findings: Finding[];
  errors: number;
  warnings: number;
  exitCode: number;
  /** Artefatos gerados declarados — checados por `living-docs drift`, não aqui (ADR-0005). */
  generated: number;
  /** Globs de `consumer-visible-paths` — checados por `living-docs changelog`, não aqui (ADR-0006). */
  consumerVisible: number;
}

export function runValidate(root: string): ValidateResult {
  const config = loadOwnership(root);
  const docs = collectArtifacts(root, config);
  const context = { root, config, docs, documents: collectDocuments(root, config), today: todayIso() };

  const findings = CHECKS.flatMap((check) => check.run(context));
  const errors = findings.filter((finding) => finding.severity === 'error').length;

  return {
    findings,
    errors,
    warnings: findings.length - errors,
    exitCode: errors > 0 ? 1 : 0,
    generated: config.generated.length,
    consumerVisible: config.consumerVisiblePaths.length,
  };
}
