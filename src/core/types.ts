import type { OwnershipConfig } from '../config/ownership.ts';
import type { ArtifactDoc } from '../docs/collect.ts';

export type Severity = 'error' | 'warning';

export interface Finding {
  /** ID do check que produziu a finding, ex.: 'CI-1'. */
  ruleId: string;
  /** Caminho relativo à raiz do repositório. */
  file: string;
  /** Linha 1-indexed; 0 quando a finding não tem linha. */
  line: number;
  severity: Severity;
  /** O que está errado. */
  message: string;
  /** O caminho válido para corrigir. */
  fix: string;
}

export interface CheckContext {
  root: string;
  config: OwnershipConfig;
  docs: ArtifactDoc[];
}

export interface Check {
  id: string;
  name: string;
  run(context: CheckContext): Finding[];
}
