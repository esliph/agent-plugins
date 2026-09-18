---
id: ADR-0019
title: 'Fronteira do núcleo de ownership: dono, ciclo de vida e gatilho dentro; IDs e congelamento fora'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-18
relates-to: [ADR-0002, RN-0032, RN-0037]
supersedes: null
superseded-by: null
---

# ADR-0019 — Fronteira do núcleo de ownership: dono, ciclo de vida e gatilho dentro; IDs e congelamento fora

## Contexto

O living-docs hoje é uma engine única (`ADR-0002`) que resolve dono, ciclo de
vida, gatilho, família de IDs e congelamento no mesmo pacote, para um
consumidor só. Um segundo domínio de artefato — um plugin SDD, com
spec/plan/constitution — precisa das três primeiras responsabilidades e não
quer as duas últimas do jeito que o living-docs as define: prefixo de duas a
quatro letras, padding e sequência sem lacuna não fazem sentido para uma
tarefa de plan, e "aceito é congelado" é semântica de decisão, não de todo
artefato. Extrair um núcleo exige decidir a fronteira exata entre o que o
segundo consumidor herda e o que continua exclusivo do living-docs.

Esta decisão cobre o §1 de
`docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md`, a spec
do núcleo de ownership.

## Alternativas consideradas

- **Subir também a família de IDs e o congelamento para o núcleo.**
  Descartada: nem toda coleção de artefato quer prefixo formatado, padding e
  sequência sem lacuna, nem toda coleção trata "aceito" como estado final
  imutável — o próprio plan do SDD é registro datado, não decisão a congelar.
  Generalizar essas duas peças agora, com um consumidor e meio, é desenhar
  protocolo de extensão sem o segundo consumidor para testá-lo.
- **Não extrair nada agora e deixar o living-docs como está.** Descartada: é
  o problema que motiva a extração — um plugin novo duplicaria dono, ciclo de
  vida e gatilho inteiros para ganhar as três responsabilidades que já
  existem, e a duplicação diverge no primeiro caso não coberto pelos dois.

## Decisão

O núcleo `@esliph/ownership` assume três responsabilidades e só elas: dono
por caminho, ciclo de vida por estado declarado com identidade de item
opaca, e gatilho código→doc e doc→doc. Família de IDs (prefixo, formato,
padding, sequência, aposentadoria, cobertura de citação) e congelamento de
artefato aceito continuam inteiros no `@esliph/living-docs`, que passa a
depender do núcleo em vez de o conter.

## Consequências

### O que se ganha

Um segundo plugin de domínio (SDD) reaproveita dono, ciclo de vida e gatilho
sem herdar vocabulário de ID nem semântica de congelamento que não pediu. O
núcleo nasce pequeno o bastante para ter um consumidor real e meio antes de
qualquer protocolo de extensão.

### O que se aceita perder

**Reabre `ADR-0002`** (uma engine de validação para CLI e hooks). A engine
deixa de ser única: o que hoje é `src/config`, `src/frontmatter`, `src/docs`
e `src/ids` num pacote só se divide entre o núcleo (dono, ciclo, gatilho) e o
living-docs (ID, congelamento) — `ADR-0002` continua `draft`, e uma decisão
nova cobre a divisão real quando a extração acontecer.

Quem quer saber "por que este artefato tem esta regra" passa a consultar
dois pacotes em vez de um: se a pergunta é sobre dono ou transição de
estado, a resposta está no núcleo; se é sobre prefixo ou congelamento, está
no living-docs.
