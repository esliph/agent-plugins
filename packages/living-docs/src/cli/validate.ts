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
  /** Artefatos gerados declarados — checados por `ownership validate`, não aqui (ADR-0005). */
  generated: number
  /** Vínculos código→doc declarados — a metade do diff é do núcleo e exige `--base` (ADR-0010). */
  watched: number
  base: string | null
  /** Quanto o conjunto de checks levou, medido (RNF-0005). */
  elapsedMs: number
}

/**
 * `living-docs validate [--base <ref>]`.
 *
 * Com `base`, fala com o git **aqui** e passa os fatos aos checks de diff — o check
 * continua sendo função pura de (fatos, configuração, árvore) → achados.
 */
export function runValidate(root: string, base: string | null = null, run?: GitRunner): ValidateResult {
  const inicio = process.hrtime.bigint()

  // A varredura é memoizada por raiz dentro do processo (`src/core/files.ts`).
  // Uma execução do `validate` é uma leitura só da árvore; duas execuções são
  // duas — senão a segunda responderia sobre o repositório de antes.
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
