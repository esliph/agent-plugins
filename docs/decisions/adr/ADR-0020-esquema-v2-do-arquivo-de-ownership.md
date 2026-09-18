---
id: ADR-0020
title: 'Esquema v2 do arquivo de ownership: owned único, blocos por plugin, format separado de governança'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-18
relates-to: [ADR-0019, RN-0032]
supersedes: null
superseded-by: null
---

# ADR-0020 — Esquema v2 do arquivo de ownership: owned único, blocos por plugin, format separado de governança

## Contexto

O `.ownership.yml` de hoje declara `artifacts:` e `documents:` como duas
listas, mistura chaves de leitura de arquivo (`collection`, `key`,
`state-field` implícitos no parser) com chaves de política no mesmo nível, e
duplica o conjunto de caminhos visíveis ao consumidor como
`consumer-visible-paths` e como a marca `consumer-visible: true` nas
próprias entradas de `watches` — um teste existe só para impedir as duas
cópias de divergir. O núcleo, servindo dois domínios, precisa de um esquema
estrito o bastante para recusar chave errada e extensível o bastante para um
plugin de domínio declarar as próprias chaves sem que o núcleo as conheça.

Esta decisão cobre o §2 de
`docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md`, a spec
do núcleo de ownership.

## Alternativas consideradas

- **Manter duas listas, uma por termo do glossário (`artifacts`/`documents`).**
  Descartada: o núcleo não sabe a diferença entre os dois termos — quem sabe
  é o `living-docs.id-prefix`, presente ou ausente. Fundir sob qualquer um
  dos dois nomes redefiniria um termo do glossário pela lista em que mora,
  quando o discriminador real passa a ser outro.
- **Chaves de plugin soltas no nível de cada entrada, sem allowlist.**
  Descartada: uma chave `living-doc:` digitada errado seria ignorada em
  silêncio pelo núcleo e nunca vista pelo plugin, que não sabe que existe
  bloco para ele — a mesma falha que já levou a recusar chave de primeiro
  nível desconhecida.
- **Manter `consumer-visible-paths` como lista separada.** Descartada: é
  exatamente a duplicação que o teste de sincronia de hoje testemunha
  existir; a v2 deriva a lista das entradas de `watches` marcadas, e não há
  duas cópias para divergir.
- **Deixar `collection`/`key`/`state-field` no mesmo nível das chaves de
  política.** Descartada: são configuração de como o parser encontra o item
  dentro do markdown, não decisão de governança, e no mesmo nível dominam a
  leitura de quem só quer saber quem é o dono.

## Decisão

O esquema v2 declara uma lista só, `owned`, com `version` obrigatório em
todo arquivo e `plugins:` só na raiz — nome do bloco que o núcleo ignora, e
qualquer outro nome de bloco de primeiro nível não listado ali é erro.
Dentro de cada entrada, as chaves de leitura do parser descem para um bloco
`format:` (`collection`, `key`, `state-field`); o restante é política e fica
no nível da entrada. `consumer-visible-paths` deixa de existir: as regras de
`watches` marcadas `consumer-visible: true` são a lista.

## Consequências

### O que se ganha

Um plugin novo declara o próprio bloco sob o nome que listou em `plugins:`
sem que o núcleo precise conhecê-lo, e um nome de bloco digitado errado vira
erro visível em vez de silêncio. A lista de caminhos visíveis ao consumidor
para de ter uma segunda cópia para divergir.

### O que se aceita perder

Todo arquivo de ownership existente — as 23 entradas deste repositório
incluídas — precisa de migração antes de validar sob v2; nenhum
`.ownership.yml` v1 lê como v2 sem o comando de migração (fora desta
decisão). E declarar `plugins:` corretamente na raiz passa a ser
pré-requisito para o bloco do plugin não virar erro — um passo a mais que a
v1 não cobrava.
