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
 *
 * Este arquivo não importa nada (nem `yaml`, `picomatch`, `node:child_process`,
 * nem os checks CI-1/2/3): é só tipos e dados, de propósito — `src/tools/gen-checks.ts`
 * importa daqui, e não de `registry.ts`, para não puxar transitivamente
 * dependências que um gerador não precisa.
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
