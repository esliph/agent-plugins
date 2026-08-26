import type { Check } from '../core/types.ts';
import { ci1Structure } from './ci1-structure.ts';
import { ci2Ids } from './ci2-ids.ts';
import { ci3Traceability } from './ci3-traceability.ts';
import { ci5ContractDrift } from './ci5-contract-drift.ts';
import { runCommand } from '../exec/command.ts';
import type { CommandRunner } from '../exec/command.ts';
import { CHECK_CATALOG } from './catalog.ts';
import type { CatalogEntry } from './catalog.ts';

/** Checks que `living-docs validate` roda, na ordem. Nenhum deles executa nada. */
export const CHECKS: readonly Check[] = [ci1Structure, ci2Ids, ci3Traceability];

/**
 * Checks que `living-docs drift` roda: os que executam o comando declarado pelo
 * repositório validado (ADR-0005). O executor entra por injeção para que o
 * teste não precise de um gerador de verdade.
 */
export function driftChecks(exec: CommandRunner = runCommand): readonly Check[] {
  return [ci5ContractDrift(exec)];
}

/**
 * Reexportado de `./catalog.ts` (fonte real, sem dependências) para não
 * quebrar quem já importa `CHECK_CATALOG`/`CatalogEntry` daqui.
 */
export type { CatalogEntry };
export { CHECK_CATALOG };
