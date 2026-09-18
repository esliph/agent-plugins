---
id: ADR-0021
title: 'Identidade de item no núcleo: chave opaca por coleção, sem regex de ID'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-18
relates-to: [ADR-0019, RN-0033]
supersedes: null
superseded-by: null
---

# ADR-0021 — Identidade de item no núcleo: chave opaca por coleção, sem regex de ID

## Contexto

Hoje `parseItemSections` monta a regex do heading a partir do formato de ID
declarado no living-docs, e `parseItemTable` exige uma coluna `Status` fixa
em código — os dois parsers do núcleo conhecem forma de ID e nome de campo
de um domínio só. Um segundo plugin (SDD) guarda itens em coleções com
heading tipo `T-003 — Escrever o parser` ou campo de estado com outro nome,
e o núcleo precisa parear item antes/depois pela chave sem saber o que ela
significa.

Esta decisão cobre o §3 de
`docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md`, a spec
do núcleo de ownership.

## Alternativas consideradas

- **Manter a chave amarrada ao formato de ID do living-docs** (regex de
  prefixo mais número). Descartada: é exatamente o acoplamento que impede o
  segundo consumidor — um heading `T-003 — Escrever o parser` não casa com
  uma regex pensada para `RN-0001`.
- **Cravar `state-field` como `status`, sem configuração.** Descartada: um
  projeto que escreve "Situação" em vez de "status" ficaria sem ciclo de
  vida sem nenhum erro — silêncio no lugar exato em que o guarda de
  promoção depende do campo existir.
- **Deixar `key` livre por regex configurável por projeto.** Descartada:
  regex em arquivo de configuração é a armadilha que a spec nomeia —
  `first-token` já cobre `RN-0001 — Título` e `T-003 — Escrever o parser`
  sem que ninguém escreva um padrão.

## Decisão

A chave de um item é opaca para o núcleo: ele garante que ela não é vazia,
é única dentro do arquivo e serve para parear antes/depois no guarda de
promoção — nada além disso. Quem interpreta forma, prefixo, sequência e
aposentadoria é o plugin dono. `key` responde sempre "onde está a chave",
com resposta por `collection`: declarar é erro em `per-file` (a identidade é
o arquivo), nome da coluna em `table`, e `first-token` (padrão) ou `heading`
em `sections`. `state-field` nomeia onde o estado mora, com padrão `status`,
sem distinção de maiúscula.

## Consequências

### O que se ganha

O núcleo passa a servir qualquer coleção cuja identidade caiba em "arquivo",
"coluna" ou "primeiro token do heading", sem regex nenhuma em configuração.
Um plugin de domínio ganha o guarda de promoção e o pareamento antes/depois
sem herdar a forma de ID de outro domínio.

### O que se aceita perder

O núcleo deixa de detectar um ID malformado ou uma sequência com lacuna —
isso volta a ser responsabilidade do plugin dono, que precisa escrever a
própria verificação em vez de herdá-la de graça. E dois arquivos diferentes
podem usar a mesma chave textual sem o núcleo notar: unicidade entre
arquivos também é política do plugin, não garantia do núcleo.
