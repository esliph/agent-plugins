<!-- generated: do not edit -->
<!-- fonte: src/checks/catalog.ts (CHECK_CATALOG) — regerar: rode este arquivo com node -->

# Contrato dos checks

Os IDs abaixo são públicos e estáveis: aparecem na saída do CLI, são citados
pela Definition of Done de quem usa o toolkit, e não mudam de significado
(`docs/contracts/versioning-policy.md`).

| ID | Check | Falha quando | Comando |
| --- | --- | --- | --- |
| CI-1 | structure lint | Frontmatter ausente ou inválido; `status` fora da máquina de estados; `owner` vazio ou sem `@`; `trigger` ausente ou descrevendo cadência. | `living-docs validate` |
| CI-2 | ID lint | ID duplicado, fora de sequência, ou reaproveitado de `docs/ids-retired.txt`; citação que não resolve para item existente. | `living-docs validate` |
| CI-3 | traceability | Par bidirecional aberto; requisito `active` sem citação nos caminhos de `cited-by`; ADR `accepted` sem `relates-to`; decisão aberta `resolved` sem o ADR que a fechou. | `living-docs validate` |
| CI-4 | staleness | Uma dívida `open` não declara `pay-when` verificável, ou o gatilho declarado já aconteceu no repositório. `last-reviewed` além de `stale-after-months` produz aviso, não falha — e item em estado congelado não vence. | `living-docs validate` |
| CI-5 | contract drift | A saída do gerador difere do artefato versionado; o gerador falha; ou o artefato declarado em `generated[]` não existe. | `living-docs drift` |
| CI-6 | changelog required | O diff entre a base e `HEAD` toca `consumer-visible-paths` e o doc marcado `consumer-visible: true` não vem no mesmo diff com item em `## [Unreleased]`, nem alguma mensagem de commit traz `Changelog: none — <razão>`. | `living-docs changelog --base <ref>` |
| CI-7 | ownership coverage | Documento do corpus sem entrada no `.ownership.yml` ou sem linha no CODEOWNERS; regra de `watches` cujo `doc` não existe ou não tem dono; contrato do agente repetindo frase de artefato dono; item da Definition of Done sem verificação nomeada; e, com `--base <ref>`, caminho vigiado alterado sem o doc dono, ou caminho reivindicado por decisão aberta — os dois liberados por `Docs: none — <razão>`. | `living-docs validate` |
| CI-8 | links | Link interno relativo que não resolve para arquivo ou diretório existente; `[[wikilink]]` sem destino no corpus; arquivo em formato binário sob a raiz da documentação. Link dentro de bloco de código ou de marcação inline não conta. | `living-docs validate` |
