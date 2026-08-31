import type { Check } from '../core/types.ts';
import { ci1Structure } from './ci1-structure.ts';
import { ci2Ids } from './ci2-ids.ts';
import { ci3Traceability } from './ci3-traceability.ts';
import { ci4Staleness } from './ci4-staleness.ts';
import { ci5ContractDrift } from './ci5-contract-drift.ts';
import { ci6ChangelogRequired } from './ci6-changelog-required.ts';
import type { DiffFacts } from './ci6-changelog-required.ts';
import { ci7OwnershipCoverage } from './ci7-ownership-coverage.ts';
import { ci8Links } from './ci8-links.ts';
import { ci9CommitDiscipline } from './ci9-commit-discipline.ts';
import type { CommitFacts } from './ci9-commit-discipline.ts';
import { runCommand } from '../exec/command.ts';
import type { CommandRunner } from '../exec/command.ts';
import { CHECK_CATALOG } from './catalog.ts';
import type { CatalogEntry } from './catalog.ts';

/**
 * Checks que `living-docs validate` roda, na ordem. Nenhum deles executa nada.
 *
 * Função, e não mais constante: `CI-7` recebe o diff por injeção, como `CI-5`
 * recebe o executor e `CI-6` os fatos do diff. Sem diff, a metade do diff de
 * `CI-7` simplesmente não roda (`ADR-0010`).
 */
export function validateChecks(diff: CommitFacts | null = null): readonly Check[] {
  return [
    ci1Structure,
    ci2Ids,
    ci3Traceability,
    ci4Staleness,
    ci7OwnershipCoverage(diff),
    ci8Links,
    ci9CommitDiscipline(diff),
  ];
}

/**
 * Checks que `living-docs drift` roda: os que executam o comando declarado pelo
 * repositório validado (ADR-0005). O executor entra por injeção para que o
 * teste não precise de um gerador de verdade.
 */
export function driftChecks(exec: CommandRunner = runCommand): readonly Check[] {
  return [ci5ContractDrift(exec)];
}

/** Diff vazio: só para enumerar o check quando ninguém tem fatos a dar. */
const NO_DIFF: DiffFacts = Object.freeze({ base: '', changed: [], messages: [] });

/**
 * Checks que `living-docs changelog` roda: os que precisam do diff da branch,
 * que `validate` não tem (ADR-0006). Os fatos entram por injeção para que o
 * teste não precise de um repositório git.
 */
export function changelogChecks(diff: DiffFacts = NO_DIFF): readonly Check[] {
  return [ci6ChangelogRequired(diff)];
}

/**
 * Reexportado de `./catalog.ts` (fonte real, sem dependências) para não
 * quebrar quem já importa `CHECK_CATALOG`/`CatalogEntry` daqui.
 */
export type { CatalogEntry, CommitFacts };
export { CHECK_CATALOG };
