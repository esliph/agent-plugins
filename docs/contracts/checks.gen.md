<!-- generated: do not edit -->
<!-- fonte: src/checks/catalog.ts (CHECK_CATALOG) e o catálogo do núcleo (CORE_CHECK_CATALOG) — regerar: rode este arquivo com node --conditions=development -->

# Contrato dos checks

Os identificadores abaixo são públicos e estáveis: aparecem na saída do CLI, são
citados pela Definition of Done de quem usa o toolkit, e não mudam de significado
(`docs/contracts/versioning-policy.md`). Cada regra roda num plugin só.

## living-docs

| ID | Check | Falha quando | Comando |
| --- | --- | --- | --- |
| CI-1 | structure lint | Frontmatter ausente ou inválido; campo obrigatório vazio; `id` fora do formato ou do território do artefato; `status` num artefato sem `states` declarado; item de coleção sem `status`; `trigger` ausente ou descrevendo cadência; `last-reviewed` fora do formato ISO. | `living-docs validate` |
| CI-2 | ID lint | ID duplicado, fora de sequência, ou reaproveitado de `docs/ids-retired.txt`; citação que não resolve para item existente. | `living-docs validate` |
| CI-3 | traceability | Par bidirecional aberto; requisito `active` sem citação nos caminhos de `cited-by`; ADR `accepted` sem `relates-to`; decisão aberta `resolved` sem o ADR que a fechou. | `living-docs validate` |
| CI-4 | staleness | Uma dívida `open` não declara `pay-when` verificável, ou o gatilho declarado já aconteceu no repositório. `last-reviewed` além de `stale-after-months` produz aviso, não falha — e item em estado congelado não vence. | `living-docs validate` |
| CI-7 | ownership coverage | Contrato do agente repetindo frase de artefato dono; item da Definition of Done sem verificação nomeada; e, com `--base <ref>`, caminho reivindicado por decisão aberta — liberado por `Docs: none — <razão>`. | `living-docs validate` |
| CI-8 | links | Link interno relativo que não resolve para arquivo ou diretório existente; `[[wikilink]]` sem destino no corpus; arquivo em formato binário na documentação. Link dentro de bloco de código ou de marcação inline não conta. | `living-docs validate` |
| CI-9 | commit discipline | Com `--base <ref>`: o diff altera apenas a data de revisão de `last-reviewed-bump-limit` documentos ou mais, sem outra mudança no corpo de nenhum deles; ou altera um arquivo de artefato e nenhuma mensagem de commit do diff cita um dos IDs declarados nele. | `living-docs validate` |
| CI-10 | trigger routing | O `trigger` de um documento e a `description` da skill declarada como dona dele compartilham menos raízes de palavra do que o piso declarado. Skill dona ausente da raiz do toolkit produz aviso, não falha; e o `trigger` de um item de coleção não é comparado. | `living-docs validate` |
| CI-11 | external audience | Documento ou artefato declarado `audience: external` cita, fora do frontmatter e de bloco de código cercado, um ID cujo prefixo tem família declarada (`id-prefix`) — em prosa, entre crases ou no caminho de um link. | `living-docs validate` |

## ownership

| ID | Check | Falha quando | Comando |
| --- | --- | --- | --- |
| ownership/declared-state | declared state | O estado de um arquivo ou item (o campo de `state-field`, `status` por padrão) está fora de `states` declarado para o caminho; a mesma chave aparece duas vezes no mesmo arquivo; ou o `owner` do frontmatter não começa com `@`. | `ownership validate` |
| ownership/generated-drift | generated drift | A saída do comando declarado em `generated[]` difere do arquivo versionado; o comando falha; ou o arquivo declarado não existe. | `ownership validate` |
| ownership/owner-coverage | owner coverage | Um arquivo do repositório não é coberto por `owned[]` nem por `ignore`; um caminho de `owned[]` não existe ou não tem linha no CODEOWNERS; o CODEOWNERS não existe; ou o `doc` de uma regra de `watches` não existe ou não tem entrada em `owned[]`. | `ownership validate` |
| ownership/derivation-resolves | derivation resolves | Um documento que deriva de uma fonte não declara o campo de derivação, ou o campo aponta para fora da fonte ou para arquivo inexistente. | `ownership validate` |
| ownership/watch-satisfied | watch satisfied | O diff entre a base e `HEAD` toca um caminho de `watches` e o `doc` da regra não está no mesmo diff, sem `Docs: none — <razão>` em alguma mensagem de commit. | `ownership validate --base <ref>` |
| ownership/consumer-change-logged | consumer change logged | O diff toca um caminho de `watches` marcado `consumer-visible: true` e o `doc` da regra não vem no mesmo diff com item em `## [Unreleased]`, sem `Changelog: none — <razão>` em alguma mensagem de commit. | `ownership validate --base <ref>` |
