---
title: Como se contribui aqui
owner: '@esliph/engineering'
trigger: >
    Quando muda como se trabalha aqui — e toda vez que uma pessoa ou um agente
    errou por falta de contexto que caberia nesta página.
last-reviewed: 2026-08-27
---

# Como se contribui

Este repositório é o toolkit de documentação viva e é também o primeiro
consumidor dele. Tudo que ele exige de um projeto, ele cumpre.

## O ambiente

Nada roda no host além de Docker (`RNF-0002`). O container é a única forma
suportada de executar qualquer coisa:

```bash
docker compose up -d
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
./bin/living-docs validate --base origin/master
```

Se um comando pede `node`, `npm` ou `npx` fora do container, ele está errado —
não o ambiente.

## O ciclo

1. **A regra antes do código.** Comportamento novo começa por um requisito com
   ID em `docs/requirements/`. Se a regra não existe e ninguém sabe qual é, o
   resultado é uma `DA-nnnn` em `docs/open-decisions.md` e a implementação
   **para** — inventar a regra é o erro que este repositório existe para evitar.
2. **Teste antes da implementação**, citando o ID do requisito que ele cobre. É
   a citação que `CI-3` procura; teste sem ID deixa a regra descoberta.
3. **Implementação mínima.** O que não tem requisito não é escopo.
4. **Commit citando o ID afetado** — é o que torna `git log` navegável por regra.
5. **A Definition of Done** (`docs/definition-of-done.md`) diz quando acabou.
6. **Quando a mudança realmente não afeta o doc dono**, escreva a razão na
   mensagem de commit — `Docs: none — <razão>` —, e o CI aceita. Rótulo sem
   razão não vale: é a caixinha marcada. O mesmo formato vale para o CHANGELOG,
   com `Changelog: none — <razão>`.

## Onde a verdade mora

| Pergunta                                     | Artefato                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| O que o toolkit deve ser                     | `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` |
| Qual é a regra de X                          | `docs/requirements/`                                                   |
| Por que foi feito assim                      | `docs/decisions/adr/`                                                  |
| O que ainda não foi decidido                 | `docs/open-decisions.md`                                               |
| O que se aceitou dever                       | `docs/decisions/debt/`                                                 |
| Quem é dono de cada caminho                  | `docs/.ownership.yml` e `CODEOWNERS`                                   |
| Qual é o vocabulário do domínio              | `docs/glossary.md`                                                     |
| O que é inviolável, e a visão do produto     | `docs/charter/`                                                        |
| O que é público, e o que cada erro significa | `docs/contracts/`                                                      |
| O que mudou para quem usa                    | `CHANGELOG.md` e `docs/releases/`                                      |
| Quando está pronto                           | `docs/definition-of-done.md`                                           |
| Quem responde por cada documento sem ID      | `docs/.ownership.yml` (`documents:`)                                   |

Nenhuma dessas respostas é copiada para outro lugar. Duplicata apodrece, e a
versão velha ganha da nova por repetição.

## Idioma

Identificadores, nomes de arquivo e IDs em inglês/neutro; prosa em português.
Mensagem de commit em português, no formato `tipo(ID): assunto`.

## Quando um agente erra por falta de contexto

Isso não é acidente, é sintoma: falta uma linha em algum documento. A correção é
acrescentar essa linha — em `CLAUDE.md` se for política ou índice, no artefato
dono se for regra. A skill `working-agreements-keeper` é dona desse loop.

