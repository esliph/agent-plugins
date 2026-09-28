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

Node 24 ou maior e o npm que vem com ele — nada além disso (`RNF-0002`). As
dependências entram com `npm ci`, e ele vem antes de qualquer outro comando:

```bash
npm ci
npm test
npm run typecheck
node --conditions=development packages/living-docs/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate --base origin/master
```

Comando que falha com `ERR_MODULE_NOT_FOUND` é comando rodado antes do
`npm ci` — não é o ambiente que está errado.

### Opcional: rodar pelo container

Quem não quiser instalar Node na máquina tem um segundo caminho (`RNF-0006`,
`ADR-0016`). `bin/dev` roda qualquer comando de manutenção dentro do container, e
sobe o container sozinho quando ele não está de pé:

```bash
bin/dev npm test
bin/dev npm run typecheck
bin/dev node --conditions=development packages/living-docs/src/cli/index.ts validate
bin/living-docs validate     # o mesmo, pelo wrapper do CLI
bin/dev                      # um shell dentro do container
```

Exige o daemon do Docker, e a primeira invocação constrói a imagem. No Windows,
invoque pelo Git Bash, pelo WSL, ou com `bash bin/dev …` a partir do PowerShell.

Duas coisas que este caminho **não** é. Ele não é a execução de registro: o que
o CI reproduz em todo PR e o que a Definition of Done mede continua sendo o host.
E ele não cobre os hooks, que rodam sempre no host (`RNF-0001`) — numa máquina
sem Node, o enforcement local não existe, e essa é a mesma perda que `ADR-0015`
já declarou.

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
