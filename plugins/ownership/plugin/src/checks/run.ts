import { loadCodeowners } from '../codeowners/locate.ts'
import type { Codeowners } from '../codeowners/types.ts'
import type { ResolvedOwnership } from '../resolve/types.ts'
import type { Check, CheckContext, Finding } from './types.ts'

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** By file, then line (a finding without a line first), then check, then message. */
export function compareFindings(a: Finding, b: Finding): number {
  if (a.file !== b.file) {
    return compareText(a.file, b.file)
  }

  if (a.line !== b.line) {
    if (a.line === undefined) {
      return -1
    }

    if (b.line === undefined) {
      return 1
    }

    return a.line - b.line
  }

  return compareText(a.checkId, b.checkId) || compareText(a.message, b.message)
}

/** Runs the checks and sorts what they found once every check is done, so the order never depends on timing. */
export async function runChecks(checks: readonly Check[], ctx: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = []

  for (const check of checks) {
    findings.push(...(await check.run(ctx)))
  }

  return findings.sort(compareFindings)
}

export function createCheckContext(config: ResolvedOwnership, repoFiles: ReadonlySet<string>, jobs: number): CheckContext {
  let loaded = false
  let codeowners: Codeowners | null = null

  return {
    root: config.root,
    config,
    repoFiles,
    jobs,
    codeowners() {
      if (!loaded) {
        codeowners = loadCodeowners(config.root)
        loaded = true
      }

      return codeowners
    },
  }
}
