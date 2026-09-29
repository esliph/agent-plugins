import type { LivingDocsConfig } from '../config/ownership.ts'
import type { ArtifactDoc, DocumentDoc } from '../docs/collect.ts'

export type Severity = 'error' | 'warning'

export interface Finding {
  /** ID do check que produziu a finding, ex.: 'living-docs/frontmatter'. */
  ruleId: string
  /** Caminho relativo à raiz do repositório. */
  file: string
  /** Linha 1-indexed; 0 quando a finding não tem linha. */
  line: number
  severity: Severity
  /** O que está errado. */
  message: string
  /** O caminho válido para corrigir. */
  fix: string
}

export interface CheckContext {
  root: string
  config: LivingDocsConfig
  docs: ArtifactDoc[]
  /** Documentos sem família de IDs, declarados em `documents:` (`ADR-0008`). */
  documents: DocumentDoc[]
  /**
   * Hoje, em ISO. Nenhum check lê o relógio por dentro (`ADR-0007`, `RNF-0004`):
   * a data entra por valor, e é isso que torna `living-docs/staleness` testável.
   */
  today: string
}

/** Fatos do diff da branch, entregues por injeção a quem os lê (`ADR-0006`). */
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
