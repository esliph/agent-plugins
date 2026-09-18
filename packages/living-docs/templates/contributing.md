---
title: Como se contribui aqui
owner: "{{OWNER}}"
trigger: >
  Quando muda como se trabalha aqui — e toda vez que uma pessoa ou um agente
  errou por falta de contexto que caberia nesta página.
last-reviewed: {{TODAY}}
---

# Como se contribui

## O ciclo

1. **A regra antes do código.** Comportamento novo começa por um requisito com
   ID em `docs/requirements/`. Se a regra não existe e ninguém sabe qual é, o
   resultado é uma `DA-nnnn` em `docs/open-decisions.md` e a implementação para.
2. **Teste citando o ID** do requisito que ele cobre — é a citação que `CI-3`
   procura.
3. **Implementação mínima.** O que não tem requisito não é escopo.
4. **Commit citando o ID afetado.**
5. **A Definition of Done** (`docs/definition-of-done.md`) diz quando acabou.

## Onde a verdade mora

| Pergunta | Artefato |
| --- | --- |
| Qual é a regra de X | `docs/requirements/` |
| Por que foi feito assim | `docs/decisions/adr/` |
| O que ainda não foi decidido | `docs/open-decisions.md` |
| O que se aceitou dever | `docs/decisions/debt/` |
| Quem é dono de cada caminho | `docs/.ownership.yml` e `CODEOWNERS` |
| Quando está pronto | `docs/definition-of-done.md` |

Nenhuma dessas respostas é copiada para outro lugar.

## Quando alguém erra por falta de contexto

Falta uma linha em algum destes documentos. A correção é acrescentá-la — no
contrato do agente se for política ou índice, no artefato dono se for regra.
