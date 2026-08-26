---
title: Catálogo de erros
owner: "{{OWNER}}"
trigger: >
  Código de erro novo; código que muda de status; mudança no que um código
  significa para quem consome a interface pública.
last-reviewed: {{TODAY}}
---

# Catálogo de erros

> Semente criada por `living-docs init`. Um código, uma vez publicado, **nunca
> muda de significado**: ganha `deprecated` e um substituto. Depreciação sem
> substituto não é depreciação, é quebra de compatibilidade — e passa pela
> política de versionamento e por um ADR. Substitua o exemplo pelos códigos
> reais; apagar o que sobra é parte do trabalho.

| Código | Significado | Quando ocorre | Transporte | Público | Status |
| --- | --- | --- | --- | --- | --- |
| CODIGO-EXEMPLO | Substitua pelo significado estável, não pela mensagem exibível | A condição observável que o dispara | HTTP 400 / exit 2 / evento | sim | active |

<!-- O código é estável e imutável em significado; a mensagem exibível não é
parte do contrato. Skill dona: contract-keeper. -->
