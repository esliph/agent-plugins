<!-- generated: do not edit -->
<!-- fonte: src/checks/registry.ts (CHECK_CATALOG) — regerar: node /opt/living-docs/src/tools/gen-checks.ts -->

# Contrato dos checks

Os IDs abaixo são públicos e estáveis: aparecem na saída do CLI, são citados
pela Definition of Done de quem usa o toolkit, e não mudam de significado
(`docs/contracts/versioning-policy.md`).

| ID | Check | Falha quando | Comando |
| --- | --- | --- | --- |
| CI-1 | structure lint | Frontmatter ausente ou inválido; `status` fora da máquina de estados; `owner` vazio ou sem `@`; `trigger` ausente ou descrevendo cadência. | `living-docs validate` |
| CI-2 | ID lint | ID duplicado, fora de sequência, ou reaproveitado de `docs/ids-retired.txt`; citação que não resolve para item existente. | `living-docs validate` |
| CI-3 | traceability | Par bidirecional aberto; requisito `active` sem citação nos caminhos de `cited-by`; ADR `accepted` sem `relates-to`; decisão aberta `resolved` sem o ADR que a fechou. | `living-docs validate` |
| CI-5 | contract drift | A saída do gerador difere do artefato versionado; o gerador falha; ou o artefato declarado em `generated[]` não existe. | `living-docs drift` |
