import { loadOwnership } from '../config/ownership.ts';
import { collectArtifacts } from '../docs/collect.ts';
import { CHECKS } from '../checks/registry.ts';
import type { Finding } from '../core/types.ts';

export interface ValidateResult {
  findings: Finding[];
  errors: number;
  warnings: number;
  exitCode: number;
}

export function runValidate(root: string): ValidateResult {
  const config = loadOwnership(root);
  const docs = collectArtifacts(root, config);
  const context = { root, config, docs };

  const findings = CHECKS.flatMap((check) => check.run(context));
  const errors = findings.filter((finding) => finding.severity === 'error').length;

  return {
    findings,
    errors,
    warnings: findings.length - errors,
    exitCode: errors > 0 ? 1 : 0,
  };
}
