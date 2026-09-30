import type { ResolvedConfig } from '../resolve/hierarchy.ts'

export type Severity = 'error' | 'warning'

export interface Finding {
  ruleId: string
  file: string
  line: number
  severity: Severity
  message: string
  fix: string
}

export interface CheckContext {
  root: string
  config: ResolvedConfig
  today: string
}

export interface Check {
  id: string
  name: string
  run(context: CheckContext): Finding[]
}
