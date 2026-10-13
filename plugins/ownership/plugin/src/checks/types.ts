import type { Codeowners } from '../codeowners/types.ts'
import type { ResolvedOwnership } from '../resolve/types.ts'

export type Severity = 'error' | 'warning'

/** What every check returns and what the CLI prints. Renaming or removing a field breaks consumers. */
export interface Finding {
  file: string
  line?: number
  column?: number
  checkId: string
  severity: Severity
  message: string
  fix?: string
}

export interface CheckContext {
  readonly root: string
  readonly config: ResolvedOwnership
  /** The repository files, enumerated once per run. */
  readonly repoFiles: ReadonlySet<string>
  /** How many generators may run at the same time. */
  readonly jobs: number
  /** The CODEOWNERS, loaded on the first call. */
  codeowners(): Codeowners | null
}

export interface Check {
  readonly id: string
  readonly name: string
  readonly failsWhen: string
  run(ctx: CheckContext): Promise<Finding[]>
}

/** A finding without the optional fields left undefined, so it serializes to exactly its fields. */
export function finding(fields: Finding): Finding {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as unknown as Finding
}
