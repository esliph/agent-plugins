---
id: ADR-0029
title: 'O living-docs nasce sobre a v2: sem comando de migração, sem leitura dupla, sem alias'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-28
relates-to: [ADR-0020, ADR-0025, ADR-0028]
supersedes: null
superseded-by: null
---

# ADR-0029 — O living-docs nasce sobre a v2: sem comando de migração, sem leitura dupla, sem alias

## Contexto

O living-docs lê hoje o esquema v1 com um parser próprio. `ADR-0020` definiu o
esquema v2, e a spec do núcleo de ownership pedia, além disso, um comando que
convertesse arquivos v1 em v2. Para o living-docs adotar o núcleo, ele precisa
passar a ler a v2 pela biblioteca do núcleo, e é preciso decidir o que acontece
com quem ainda tem um arquivo v1.

Hoje só o autor usa o plugin, e nada foi lançado: o `CHANGELOG.md` só tem
`[Unreleased]`. Escrever, testar e manter para sempre um conversor ou uma segunda
via de leitura custa mais do que reescrever à mão um arquivo que, neste
repositório, existe uma vez.

A adoção também obriga a fixar duas coisas que a v1 respondia sem escrever:
o que é um documento do living-docs, e o que é o corpus de documentação.

## Alternativas consideradas

- **Comando `migrate` na CLI.** Descartada: é o que a spec do núcleo pedia, mas
  criaria uma superfície pública, com teste e mensagem de erro, para um arquivo
  que só o autor tem. O custo de manter o conversor supera o de reescrever.
- **Leitura dupla (v1 e v2) no living-docs.** Descartada: dois esquemas na mesma
  leitura dobrariam todo caso de teste e deixariam a v1 viva sem prazo, e o
  núcleo já recusa a v1 por desenho.
- **Alias dos nomes antigos de regra.** Descartada: o alias esconderia que o
  identificador mudou, e o mapa antigo → novo cabe numa entrada do CHANGELOG.

## Decisão

O living-docs lê apenas o esquema v2, pela biblioteca do núcleo. Não há comando
de migração, leitura dupla nem alias de nome antigo, nem público nem interno. O
`.ownership.yml` deste repositório é reescrito à mão na v2, e quem já tinha um
arquivo v1 o reescreve guiado pelo CHANGELOG. Isto diverge da spec do núcleo, que
pedia o comando.

O living-docs decide que **documento** é a entrada de `owned` que traz o bloco
`living-docs:` sem `id-prefix`, e **artefato** é a que traz `id-prefix` no
bloco. Um caminho só é do plugin se a entrada traz o bloco dele, como
`ADR-0020` já estabeleceu: sem isso, `packages/living-docs/`, `bin/` e
`.github/` virariam documentos.

O **corpus de documentação** é a união dos caminhos das entradas com bloco
`living-docs:` e dos caminhos de `generated[]`. Derivá-lo do diretório do
arquivo de ownership, como a v1 fazia, faria da raiz inteira documentação, já
que o arquivo passa a morar na raiz. O anexo binário passa a ser cobrado em
qualquer caminho do corpus.

A decisão aberta declara `states: [open, resolved, dropped]`, que é a máquina
de estados que o código já implementa, e não a abreviação `[open, resolved]`.

## Consequências

### O que se ganha

O living-docs perde um parser, um esquema e um conjunto de mensagens de erro
próprios, e passa a tratar como um só todo arquivo de ownership que ele lê. Nada
fica para migrar no dia em que o toolkit for publicado.

### O que se aceita perder

**Quem clonou o toolkit e tem um `docs/.ownership.yml` v1 fica sem caminho
automático:** o plugin recusa o arquivo, e a única ajuda é o CHANGELOG. Isso é
aceito porque só o autor está nessa situação hoje, e deixa de valer no primeiro
consumidor externo, quando esta decisão precisa ser reaberta. Os requisitos que
falavam de "sob a raiz da documentação" e de `artifacts:` têm de ser reescritos,
e o discriminador de documento deixa de ser visível numa lista: é preciso olhar
o bloco de cada entrada.
