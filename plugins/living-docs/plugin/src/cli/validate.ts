import { loadLivingDocsConfig } from '../config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../docs/collect.ts'
import { validateChecks } from '../checks/registry.ts'
import { changedLines, changedPaths, commitMessages } from '../git/diff.ts'
import type { GitRunner } from '../git/staged.ts'
import { todayIso } from '../core/dates.ts'
import { forgetTree } from '../core/files.ts'
import type { Finding } from '../core/types.ts'

export interface ValidateResult {
  findings: Finding[]
  errors: number
  warnings: number
  exitCode: number
  /** Declared generated artifacts — checked by `ownership validate`, not here (ADR-0005). */
  generated: number
  /** Declared code→doc links — half of the diff belongs to the core and requires `--base` (ADR-0010). */
  watched: number
  base: string | null
  /** How long the set of checks took, measured (RNF-0005). */
  elapsedMs: number
}

/**
 * `living-docs validate [--base <ref>]`.
 *
 * With `base`, it talks to git **here** and passes the facts to the diff checks — the check
 * remains a pure function of (facts, configuration, tree) → findings.
 */
export function runValidate(root: string, base: string | null = null, run?: GitRunner): ValidateResult {
  const inicio = process.hrtime.bigint()

  // The scan is memoized per root within the process (`src/core/files.ts`).
  // One `validate` run is a single read of the tree; two runs are
  // two — otherwise the second would answer about the repository as it was before.
  forgetTree(root)

  const config = loadLivingDocsConfig(root)
  const context = {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: todayIso(),
  }

  const diff =
    base === null
      ? null
      : {
          base,
          changed: changedPaths(root, base, run),
          messages: commitMessages(root, base, run),
          edits: changedLines(root, base, run),
        }

  const findings = validateChecks(diff).flatMap(check => check.run(context))
  const errors = findings.filter(finding => finding.severity === 'error').length

  return {
    findings,
    errors,
    warnings: findings.length - errors,
    exitCode: errors > 0 ? 1 : 0,
    generated: config.generated.length,
    watched: config.watches.length,
    base,
    elapsedMs: Number(process.hrtime.bigint() - inicio) / 1e6,
  }
}
