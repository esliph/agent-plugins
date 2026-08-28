import { loadOwnership } from '../config/ownership.ts';
import { collectArtifacts, collectDocuments } from '../docs/collect.ts';
import { validateChecks } from '../checks/registry.ts';
import { changedPaths, commitMessages } from '../git/diff.ts';
import type { GitRunner } from '../git/staged.ts';
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
  /** Vínculos código→doc declarados — a metade do diff exige `--base` (ADR-0010). */
  watched: number;
  base: string | null;
}

/**
 * `living-docs validate [--base <ref>]`.
 *
 * Com `base`, fala com o git **aqui** e passa os fatos ao `CI-7` — o check
 * continua sendo função pura de (fatos, configuração, árvore) → achados, como
 * `CI-5` e `CI-6`.
 */
export function runValidate(root: string, base: string | null = null, run?: GitRunner): ValidateResult {
  const config = loadOwnership(root);
  const context = {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: todayIso(),
  };

  const diff =
    base === null
      ? null
      : { base, changed: changedPaths(root, base, run), messages: commitMessages(root, base, run) };

  const findings = validateChecks(diff).flatMap((check) => check.run(context));
  const errors = findings.filter((finding) => finding.severity === 'error').length;

  return {
    findings,
    errors,
    warnings: findings.length - errors,
    exitCode: errors > 0 ? 1 : 0,
    generated: config.generated.length,
    consumerVisible: config.consumerVisiblePaths.length,
    watched: config.watches.length,
    base,
  };
}
