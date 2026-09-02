---
id: ADR-0004
title: Termo do glossary é identificado pelo nome, não por ID numerado
status: accepted
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-25
relates-to: [DA-0002, RN-0011]
supersedes: null
superseded-by: null
---

# ADR-0004 — Termo do glossary é identificado pelo nome, não por ID numerado

## Contexto

A Fase 4 (spec §10) entrega `SK-2` (`docs/glossary.md`) e `SK-1`
(`docs/charter/constitution.md`, `docs/charter/vision.md`). Os três são
artefatos com dono, mas nenhum tem uma família de IDs numerada como `ADR`,
`DA`, `TDR`, `RF`, `RNF` ou `RN` — a mesma categoria de `CONTRIBUTING.md`, da
Definition of Done e do contrato do agente, que a Fase 3 já tratou sem
declará-los em `artifacts:` no `.ownership.yml` (`DA-0002`, ainda aberta).

`docs/.ownership.yml` hoje exige `id-prefix` de 2 a 4 letras maiúsculas para
toda entrada de `artifacts:` (`src/config/ownership.ts`). Sem um prefixo, um
artefato não entra na lista — e sem entrar, `CI-1`/`CI-2`/`CI-3`
(`src/docs/collect.ts` varre só `config.artifacts`) não o processam.

A spec dá ao termo do glossary uma máquina de estados (`active → renamed(para
X) | banned`, §4) mas nunca lhe dá uma sintaxe de citação: o grafo de
rastreabilidade (§8) mostra "Glossary <──nomeia── RN, contrato, código" — o
glossary é **citado pelo nome**, nunca aparece do lado que resolve uma
citação `<PREFIXO>-<número>` (§8, `CI-2`). O formato de entrada que a spec
define (§5, `SK-2`) — `Termo | Definição | Nome no código | Não confundir com
| Fonte` — também não tem coluna de ID.

## Alternativas consideradas

**Inventar um prefixo (`TRM` para termo, `CST` para princípio da
Constitution) e declarar `docs/glossary.md`/`docs/charter/constitution.md`
em `artifacts:`.** Descartada: criaria uma segunda forma de identidade para
algo que a própria spec já identifica por outro eixo (o nome). Um `TRM-0001`
que ninguém cita — porque a citação real é `Invoice`, não o número — é
decoração que `CI-2` validaria e nenhum documento nunca escreveria.

**Resolver `DA-0002` agora**, generalizando `artifacts:` para aceitar entrada
sem `id-prefix` (um artefato "de índice", sem itens numerados). Descartada
nesta fase: `DA-0002` foi aberta pensando no requisito real que a motiva —
`CI-7` (ownership coverage, Fase 7) exigir dono para todo artefato sem
inventar prefixo. Resolvê-la agora, a partir de um único caso (o glossary),
arrisca uma generalização errada — desenhada para o que a Fase 4 precisa, não
para o que `CI-7` vai precisar depois.

**Manter `docs/glossary.md`, `docs/charter/constitution.md` e
`docs/charter/vision.md` fora de `artifacts:`**, com o mesmo tratamento que
`CONTRIBUTING.md` e a Definition of Done já recebem desde a Fase 3: dono via
CODEOWNERS, frontmatter no formato de container (`title`, `owner`, `trigger`,
`last-reviewed`), mas sem `CI-1`/`CI-2`/`CI-3` os processando. **Escolhida.**

## Decisão

Termo do glossary é identificado pelo seu nome — uma string única dentro de
`docs/glossary.md` — nunca por um ID numerado do tipo `<PREFIXO>-<número>`.
`docs/glossary.md`, `docs/charter/constitution.md` e `docs/charter/vision.md`
não entram em `artifacts:` no `.ownership.yml` nesta fase. `DA-0002` continua
aberta, sem ser resolvida por este ADR.

## Consequências

### O que se ganha

- Nenhuma mudança em `src/config/ownership.ts`, `src/docs/schema.ts` ou
  `src/docs/table.ts` — a engine da Fase 0–3 não precisa saber nada novo.
- O mesmo tratamento para os cinco artefatos sem família de ID
  (`CONTRIBUTING.md`, DoD, contrato do agente, glossary, Constitution/Vision)
  — um padrão só, não um por artefato.
- `DA-0002` permanece exatamente no escopo em que a Fase 3 a deixou: pré-
  condição de `CI-7`, Fase 7 — não um problema resolvido às pressas para
  destravar a Fase 4.

### O que se aceita perder

- `CI-1` não valida a estrutura de frontmatter de nenhum dos três arquivos —
  a mesma lacuna que já existe para `CONTRIBUTING.md` e a DoD.
- Se `watches` algum dia apontar para `docs/glossary.md` ou
  `docs/charter/constitution.md`, `HK-4`/`HK-5` lembram do doc dono mas sem
  nomear a skill (`findArtifactRule` não encontra regra — `skill: null`).
- A checagem "um termo, um significado" e "todo princípio tem enforcement
  nomeado" não tem check de CI genérico: fica inteiramente com a skill
  (`glossary-keeper`, `charter-keeper`) e, neste repositório, com um teste de
  dogfooding — não é um mecanismo que um projeto consumidor herda de graça.
