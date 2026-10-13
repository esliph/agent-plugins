/** One problem found while loading the ownership files or the CODEOWNERS. */
export interface Issue {
  file: string
  keyPath?: string
  line?: number
  message: string
  fix?: string
}

/** `file:line`, or the file alone when there is no line. */
export function location(place: { readonly file: string; readonly line?: number }): string {
  return place.line === undefined ? place.file : `${place.file}:${place.line}`
}

export function formatIssue(issue: Issue): string {
  const head = `${location(issue)}: ${issue.message}`

  return issue.fix === undefined ? head : `${head}\n  → ${issue.fix}`
}

/**
 * Every load error. It is never a finding: the CLI turns it into exit code 2
 * and the hook stays silent on it.
 */
export class OwnershipError extends Error {
  readonly issues: readonly Issue[]

  constructor(issues: readonly Issue[]) {
    super(issues.map(formatIssue).join('\n'))
    this.name = 'OwnershipError'
    this.issues = Object.freeze(issues.map(issue => Object.freeze({ ...issue })))
  }
}
