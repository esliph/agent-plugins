---
id: ADR-0026
title: 'Identificador nomeado para check e hook: plugin/nome-descritivo substitui a numeração'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-18
relates-to: [ADR-0019]
supersedes: null
superseded-by: null
---

# ADR-0026 — Identificador nomeado para check e hook: plugin/nome-descritivo substitui a numeração

## Contexto

Checks e hooks de hoje são numerados por família (`CI-n`, `HK-n`), tabela
que quem lê precisa consultar para saber o que falhou — "falhou o check
sete" não diz nada sozinho. Um plugin novo (o núcleo, e depois o SDD)
precisa registrar os próprios checks e hooks sem colidir com a numeração de
quem já existe, e sem que o número do vizinho dependa da ordem de
instalação.

Esta decisão cobre o §6 de
`docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md`, a spec
do núcleo de ownership.

## Alternativas consideradas

- **Continuar numerando, com uma faixa reservada por plugin** (por exemplo
  `CI-100` a `CI-199` para o núcleo). Descartada: reserva de faixa é acordo
  que vive fora do código, e o problema de "o número não diz nada" continua
  — só passa a não colidir.
- **Numeração única e crescente entre todos os plugins instalados**,
  renumerando conforme a instalação. Descartada: o número de um check
  mudaria dependendo de quais plugins estão instalados, quebrando qualquer
  referência escrita antes — exatamente a instabilidade que um
  identificador deveria evitar.

## Decisão

Check e hook do núcleo — e de todo plugin novo — usam identificador
`plugin/nome-descritivo` (`ownership/generated-drift`,
`ownership/promotion-guard`) em vez de numeração `CI-n`/`HK-n`. O namespace
é o nome do plugin que publica: um plugin novo nunca colide com um nome
existente, e o nome diz o que o check verifica sem tabela de tradução. A
forma vale só para o que é novo; renomear os identificadores numerados que
o living-docs já expõe é trabalho da spec de migração, não desta decisão.

## Consequências

### O que se ganha

Uma falha reportada como `ownership/generated-drift` diz, sozinha, o que
verificar e onde — sem consultar uma tabela. Plugins instalados juntos nunca
colidem de nome, porque o namespace já é o nome de cada um.

### O que se aceita perder

O repositório passa a ter duas convenções de identificador ao mesmo tempo —
`CI-n`/`HK-n` no living-docs, `plugin/nome` no núcleo — até a spec de
migração renomear o lado antigo, e quem lê um relatório com os dois lados
aprende as duas formas antes de entender o que falhou. Referenciar um check
do núcleo em prosa fica mais longo de digitar do que `CI-3`.
