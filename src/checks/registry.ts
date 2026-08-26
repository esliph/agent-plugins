import type { Check } from '../core/types.ts';
import { ci1Structure } from './ci1-structure.ts';
import { ci2Ids } from './ci2-ids.ts';
import { ci3Traceability } from './ci3-traceability.ts';
import { ci5ContractDrift } from './ci5-contract-drift.ts';
import { runCommand } from '../exec/command.ts';
import type { CommandRunner } from '../exec/command.ts';

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

export interface CatalogEntry {
  id: string;
  name: string;
  /** O comando do CLI que roda este check. */
  command: string;
  /** A condição de falha — a coluna "Falha quando" da spec §9. */
  failsWhen: string;
}

/**
 * O contrato público dos checks: é isto que um projeto consumidor cita na
 * Definition of Done dele, e é a fonte anotada de `docs/contracts/checks.gen.md`
 * (`CI-5`). Para mudar o contrato, mude aqui e regere — nunca o contrário.
 */
export const CHECK_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: 'CI-1',
    name: 'structure lint',
    command: 'living-docs validate',
    failsWhen:
      'Frontmatter ausente ou inválido; `status` fora da máquina de estados; `owner` vazio ou sem `@`; `trigger` ausente ou descrevendo cadência.',
  },
  {
    id: 'CI-2',
    name: 'ID lint',
    command: 'living-docs validate',
    failsWhen:
      'ID duplicado, fora de sequência, ou reaproveitado de `docs/ids-retired.txt`; citação que não resolve para item existente.',
  },
  {
    id: 'CI-3',
    name: 'traceability',
    command: 'living-docs validate',
    failsWhen:
      'Par bidirecional aberto; requisito `active` sem citação nos caminhos de `cited-by`; ADR `accepted` sem `relates-to`; decisão aberta `resolved` sem o ADR que a fechou.',
  },
  {
    id: 'CI-5',
    name: 'contract drift',
    command: 'living-docs drift',
    failsWhen:
      'A saída do gerador difere do artefato versionado; o gerador falha; ou o artefato declarado em `generated[]` não existe.',
  },
]);
