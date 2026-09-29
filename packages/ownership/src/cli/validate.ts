import { changedPaths, commitMessages } from '../core/exec.ts'
import type { GitRunner } from '../core/exec.ts'
import { forgetTree } from '../core/files.ts'
import { resolveOwnership } from '../resolve/hierarchy.ts'
import { coreChecks, diffChecks } from '../checks/registry.ts'
import type { Finding } from '../checks/types.ts'

export interface ValidateResult {
  findings: Finding[]
  errors: number
  warnings: number
  exitCode: number
  /** `false` quando não há arquivo de ownership — repositório sem o toolkit. */
  installed: boolean
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function runValidate(root: string, base: string | null = null, run?: GitRunner): ValidateResult {
  forgetTree(root)
  const config = resolveOwnership(root)

  if (config === null) {
    return { findings: [], errors: 0, warnings: 0, exitCode: 0, installed: false }
  }

  const context = { root, config, today: todayIso() }
  const checks = [...coreChecks()]

  if (base !== null) {
    checks.push(...diffChecks({ base, changed: changedPaths(root, base, run), messages: commitMessages(root, base, run) }))
  }

  const findings = checks.flatMap(check => check.run(context))
  const errors = findings.filter(finding => finding.severity === 'error').length

  return { findings, errors, warnings: findings.length - errors, exitCode: errors > 0 ? 1 : 0, installed: true }
}
