import type { LivingDocsConfig } from '../config/ownership.ts'
import type { ArtifactDoc, DocumentDoc } from '../docs/collect.ts'

export type Severity = 'error' | 'warning'

export interface Finding {
  /** ID of the check that produced the finding, e.g. 'living-docs/frontmatter'. */
  ruleId: string
  /** Path relative to the repository root. */
  file: string
  /** 1-indexed line; 0 when the finding has no line. */
  line: number
  severity: Severity
  /** What is wrong. */
  message: string
  /** The valid path to fix it. */
  fix: string
}

export interface CheckContext {
  root: string
  config: LivingDocsConfig
  docs: ArtifactDoc[]
  /** Documents without an ID family, declared in `documents:` (`ADR-0008`). */
  documents: DocumentDoc[]
  /**
   * Today, as ISO. No check reads the clock internally (`ADR-0007`, `RNF-0004`):
   * the date comes in by value, and that is what makes `living-docs/staleness` testable.
   */
  today: string
}

/** Facts of the branch diff, handed by injection to whoever reads them (`ADR-0006`). */
export interface DiffFacts {
  base: string
  changed: string[]
  messages: string[]
}

export interface Check {
  id: string
  name: string
  run(context: CheckContext): Finding[]
}
