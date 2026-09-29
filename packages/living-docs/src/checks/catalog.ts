export interface CatalogEntry {
  id: string
  name: string
  /** O comando do CLI que roda este check. */
  command: string
  /** A condição de falha — a coluna "Falha quando" da spec §9. */
  failsWhen: string
}

/**
 * O contrato público dos checks: é isto que um projeto consumidor cita na
 * Definition of Done dele, e é a fonte anotada de `docs/contracts/checks.gen.md`
 * (`ownership/generated-drift` a compara com a saída do gerador). Para mudar o
 * contrato, mude aqui e regere — nunca o contrário. O catálogo do núcleo mora em
 * `@esliph/ownership` (`CORE_CHECK_CATALOG`).
 *
 * Este arquivo não importa nada (nem `yaml`, `picomatch`, `node:child_process`,
 * nem os checks living-docs/frontmatter/2/3): é só tipos e dados, de propósito — `src/tools/gen-checks.ts`
 * importa daqui, e não de `registry.ts`, para não puxar transitivamente
 * dependências que um gerador não precisa.
 */
export const CHECK_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: 'living-docs/frontmatter',
    name: 'structure lint',
    command: 'living-docs validate',
    failsWhen:
      'Frontmatter ausente ou inválido; campo obrigatório vazio; `id` fora do formato ou do território do artefato; `status` num artefato sem `states` declarado; item de coleção sem `status`; `trigger` ausente ou descrevendo cadência; `last-reviewed` fora do formato ISO.',
  },
  {
    id: 'living-docs/id-integrity',
    name: 'ID lint',
    command: 'living-docs validate',
    failsWhen: 'ID duplicado, fora de sequência, ou reaproveitado de `docs/ids-retired.txt`; citação que não resolve para item existente.',
  },
  {
    id: 'living-docs/citation-coverage',
    name: 'traceability',
    command: 'living-docs validate',
    failsWhen:
      'Par bidirecional aberto; requisito `active` sem citação nos caminhos de `cited-by`; ADR `accepted` sem `relates-to`; decisão aberta `resolved` sem o ADR que a fechou.',
  },
  {
    id: 'living-docs/staleness',
    name: 'staleness',
    command: 'living-docs validate',
    failsWhen:
      'Uma dívida `open` não declara `pay-when` verificável, ou o gatilho declarado já aconteceu no repositório. `last-reviewed` além de `stale-after-months` produz aviso, não falha — e item em estado congelado não vence.',
  },
  {
    id: 'living-docs/agent-contract-duplication',
    name: 'agent contract duplication',
    command: 'living-docs validate',
    failsWhen: 'O contrato do agente repete, palavra por palavra, uma frase de artefato ou documento com skill dona, acima do piso de palavras do toolkit.',
  },
  {
    id: 'living-docs/done-verifiable',
    name: 'done verifiable',
    command: 'living-docs validate',
    failsWhen: 'Item da Definition of Done não nomeia o que o verifica — um identificador de check ou de hook, ou a marca de verificação humana.',
  },
  {
    id: 'living-docs/open-decision-claim',
    name: 'open decision claim',
    command: 'living-docs validate --base <ref>',
    failsWhen: 'O diff entre a base e `HEAD` toca caminho reivindicado por uma decisão aberta, sem `Docs: none — <razão>` em alguma mensagem de commit.',
  },
  {
    id: 'living-docs/links',
    name: 'links',
    command: 'living-docs validate',
    failsWhen:
      'Link interno relativo que não resolve para arquivo ou diretório existente; `[[wikilink]]` sem destino no corpus; arquivo em formato binário na documentação. Link dentro de bloco de código ou de marcação inline não conta.',
  },
  {
    id: 'living-docs/commit-discipline',
    name: 'commit discipline',
    command: 'living-docs validate',
    failsWhen:
      'Com `--base <ref>`: o diff altera apenas a data de revisão de `last-reviewed-bump-limit` documentos ou mais, sem outra mudança no corpo de nenhum deles; ou altera um arquivo de artefato e nenhuma mensagem de commit do diff cita um dos IDs declarados nele.',
  },
  {
    id: 'living-docs/trigger-routing',
    name: 'trigger routing',
    command: 'living-docs validate',
    failsWhen:
      'O `trigger` de um documento e a `description` da skill declarada como dona dele compartilham menos raízes de palavra do que o piso declarado. Skill dona ausente da raiz do toolkit produz aviso, não falha; e o `trigger` de um item de coleção não é comparado.',
  },
  {
    id: 'living-docs/external-audience',
    name: 'external audience',
    command: 'living-docs validate',
    failsWhen:
      'Documento ou artefato declarado `audience: external` cita, fora do frontmatter e de bloco de código cercado, um ID cujo prefixo tem família declarada (`id-prefix`) — em prosa, entre crases ou no caminho de um link.',
  },
])
