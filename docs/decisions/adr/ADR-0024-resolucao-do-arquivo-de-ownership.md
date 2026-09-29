---
id: ADR-0024
title: 'Resolução do arquivo de ownership: ordem de candidatos, ambiguidade é erro'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-18
relates-to: [ADR-0019, ADR-0023, RN-0035]
supersedes: null
superseded-by: null
---

# ADR-0024 — Resolução do arquivo de ownership: ordem de candidatos, ambiguidade é erro

## Contexto

O caminho do `.ownership.yml` raiz é hoje fixo em `docs/.ownership.yml`. O
núcleo serve um projeto que pode não ter artefatos em `docs/` — quem instala
escolhe onde eles moram — e precisa de uma ordem de candidatos para achar a
raiz sem ambiguidade, inclusive no caso de um projeto recém-migrado que
ainda tem os dois lugares ocupados.

Esta decisão cobre o §8 de
`docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md`, a spec
do núcleo de ownership.

## Alternativas consideradas

- **Escolher o primeiro candidato encontrado em silêncio, quando mais de um
  existe.** Descartada: um arquivo recém-migrado convivendo com um
  esquecido significaria validar pelo esquecido sem aviso nenhum — a mesma
  classe de enforcement que some em silêncio que motivou reorganizações
  anteriores deste repositório.
- **Um único caminho fixo, sem lista de candidatos.** Descartada: obrigaria
  todo projeto a colocar o arquivo exatamente em `docs/.ownership.yml` ou
  exatamente na raiz, sem meio-termo — e um repositório migrando de
  `docs/.ownership.yml` (v1) para uma raiz mais enxuta perderia a passagem
  gradual.

## Decisão

A raiz é achada por ordem de candidatos: explícito (`--ownership <caminho>`
ou variável de ambiente), depois `./.ownership.yml`, depois
`./docs/.ownership.yml`, e nenhum candidato presente é silêncio válido —
repositório sem o toolkit. Dois candidatos presentes ao mesmo tempo é erro
que nomeia os dois, nunca escolha. A regra vale só para a raiz: os demais
arquivos de um repositório com composição (`ADR-0023`) não são candidatos,
são incluídos — e a base da raiz é sempre a raiz do repositório, qualquer
que seja o candidato que venceu.

## Consequências

### O que se ganha

Um projeto migrando de `docs/.ownership.yml` para a raiz, ou o inverso,
nunca valida pelo arquivo errado em silêncio — a ambiguidade vira erro
visível em vez de escolha arbitrária. `docs/.ownership.yml` continua
podendo governar `src/**` e `CLAUDE.md` sem declarar base nenhuma, porque a
base da raiz nunca é o diretório do arquivo.

### O que se aceita perder

Um repositório com os dois candidatos presentes por engano — por exemplo,
um merge que trouxe de volta um `docs/.ownership.yml` esquecido — para de
validar até alguém remover um dos dois; não há resolução automática
possível sem arriscar o silêncio que esta decisão recusa.
