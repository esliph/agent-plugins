export type Severity = 'error' | 'warning'

export interface Finding {
  file: string
  /** 1-based; 0 when the finding is about the file as a whole. */
  line: number
  ruleId: string
  severity: Severity
  message: string
}

/** The command could not run: no configuration, or a file kanon reads does not parse. */
export class KanonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KanonError'
  }
}
