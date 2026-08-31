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
    id: 'CI-4',
    name: 'staleness',
    command: 'living-docs validate',
    failsWhen:
      'Uma dívida `open` não declara `pay-when` verificável, ou o gatilho declarado já aconteceu no repositório. `last-reviewed` além de `stale-after-months` produz aviso, não falha — e item em estado congelado não vence.',
  },
  {
    id: 'CI-5',
    name: 'contract drift',
    command: 'living-docs drift',
    failsWhen:
      'A saída do gerador difere do artefato versionado; o gerador falha; ou o artefato declarado em `generated[]` não existe.',
  },
  {
    id: 'CI-6',
    name: 'changelog required',
    command: 'living-docs changelog --base <ref>',
    failsWhen:
      'O diff entre a base e `HEAD` toca `consumer-visible-paths` e o doc marcado `consumer-visible: true` não vem no mesmo diff com item em `## [Unreleased]`, nem alguma mensagem de commit traz `Changelog: none — <razão>`.',
  },
  {
    id: 'CI-7',
    name: 'ownership coverage',
    command: 'living-docs validate',
    failsWhen:
      'Documento do corpus sem entrada no `.ownership.yml` ou sem linha no CODEOWNERS; regra de `watches` cujo `doc` não existe ou não tem dono; contrato do agente repetindo frase de artefato dono; item da Definition of Done sem verificação nomeada; e, com `--base <ref>`, caminho vigiado alterado sem o doc dono, ou caminho reivindicado por decisão aberta — os dois liberados por `Docs: none — <razão>`.',
  },
  {
    id: 'CI-8',
    name: 'links',
    command: 'living-docs validate',
    failsWhen:
      'Link interno relativo que não resolve para arquivo ou diretório existente; `[[wikilink]]` sem destino no corpus; arquivo em formato binário sob a raiz da documentação. Link dentro de bloco de código ou de marcação inline não conta.',
  },
  {
    id: 'CI-9',
    name: 'commit discipline',
    command: 'living-docs validate',
    failsWhen:
      'Com `--base <ref>`: o diff altera apenas a data de revisão de `last-reviewed-bump-limit` documentos ou mais, sem outra mudança no corpo de nenhum deles; ou altera um arquivo de artefato e nenhuma mensagem de commit do diff cita um dos IDs declarados nele.',
  },
  {
    id: 'CI-10',
    name: 'trigger routing',
    command: 'living-docs validate',
    failsWhen:
      'O `trigger` de um documento e a `description` da skill declarada como dona dele compartilham menos raízes de palavra do que o piso declarado. Skill dona ausente da raiz do toolkit produz aviso, não falha; e o `trigger` de um item de coleção não é comparado.',
  },
]);
