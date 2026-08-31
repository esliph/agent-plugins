---
title: Open Decisions
owner: "@dan"
trigger: >
  Toda vez que alguém trombou numa lacuna — comportamento sem regra escrita.
last-reviewed: 2026-08-24
---

# Open Decisions

O que ainda **não** foi decidido. Enquanto um item está aqui, ele não tem regra
e **não deve ser implementado** — a saída é o ID, não o código.

| ID | Lacuna | Status | Resolvida por | Aberta em |
| --- | --- | --- | --- | --- |
| DA-0001 | Separar a raiz do toolkit da raiz do repositório validado, para permitir instalação em outro projeto | resolved | ADR-0003 | 2026-08-24 |
| DA-0002 | Como declarar no `.ownership.yml` um artefato sem família de IDs (CONTRIBUTING, Definition of Done, contrato do agente, glossary, Constitution/Vision, `docs/contracts/errors.md`, `docs/contracts/versioning-policy.md`), para que `CI-7` exija dono sem inventar prefixo | resolved | ADR-0008 | 2026-08-25 |
| DA-0003 | Como o toolkit chega ao CI e à sessão de um repositório consumidor — imagem publicada, pacote, clone ou submódulo. `ADR-0003` separa as duas raízes e deliberadamente não decide esta; enquanto ela estiver aberta, o modo de invocação do workflow e a fonte do marketplace são parâmetros de quem instala | open | — | 2026-08-28 |
