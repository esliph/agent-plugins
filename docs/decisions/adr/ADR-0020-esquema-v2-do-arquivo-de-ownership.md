---
id: ADR-0020
title: 'Esquema v2 do arquivo de ownership: owned único, blocos por plugin, format separado de governança'
status: accepted
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-28
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
- **O plugin reivindica caminhos por regra própria** (um glob ou um filtro
  sobre `format` no manifesto do plugin), ou por uma lista de caminhos sob o
  nome dele na raiz. Descartada: a regra no manifesto torna invisível, a quem
  lê o arquivo, quem lê o quê, e deixa dois plugins disputarem o mesmo
  caminho sem erro; a lista na raiz é uma segunda cópia dos caminhos de
  `owned`, a mesma duplicação de `consumer-visible-paths`.
- **`x: true` como opt-in sem configuração.** Descartada: o bloco passaria a
  ter dois tipos — booleano ou mapeamento — e todo plugin, em qualquer
  linguagem, teria de tratar os dois. `x: {}` diz o mesmo com um tipo só.
- **Validar o conteúdo do bloco contra um schema declarado pelo plugin.**
  Descartada por ora: o plugin pode ser escrito em qualquer linguagem, então
  o núcleo não tem como importá-lo para perguntar o schema; a saída seria
  `plugins:` passar de lista de nomes a mapa apontando para um schema, uma
  mudança de forma que o volume atual de configuração nos blocos não paga.

## Decisão

O esquema v2 declara uma lista só, `owned`, com `version` obrigatório em
todo arquivo e `plugins:` só na raiz — nome do bloco que o núcleo ignora, e
qualquer outro nome de bloco de primeiro nível não listado ali é erro.
Dentro de cada entrada, as chaves de leitura do parser descem para um bloco
`format:` (`collection`, `key`, `state-field`); o restante é política e fica
no nível da entrada. `consumer-visible-paths` deixa de existir: as regras de
`watches` marcadas `consumer-visible: true` são a lista.

A presença do bloco é a declaração: um caminho pertence ao plugin `x` se, e
somente se, a entrada de `owned` que o cobre traz a chave `x` — não há outra
forma de um plugin passar a cuidar de um caminho. O valor do bloco é sempre
um mapeamento: `x: {}` declara o vínculo sem configuração, e qualquer valor
que não seja mapeamento (`true`, `false`, nulo, lista, texto) é erro de
carga. O núcleo confere só esse tipo; o conteúdo do mapeamento é opaco a ele
e cabe ao plugin interpretá-lo. Um plugin listado em `plugins:` sem nenhuma
entrada que traga o seu bloco é aviso de `validate`, não erro.

## Consequências

### O que se ganha

Um plugin novo declara o próprio bloco sob o nome que listou em `plugins:`
sem que o núcleo precise conhecê-lo, e um nome de bloco digitado errado vira
erro visível em vez de silêncio. A lista de caminhos visíveis ao consumidor
para de ter uma segunda cópia para divergir. "Quais caminhos são do plugin
`x`" tem resposta única, lida do próprio arquivo, e vários plugins cuidam da
mesma entrada sem se conhecerem.

### O que se aceita perder

Todo arquivo de ownership existente — as 23 entradas deste repositório
incluídas — precisa de migração antes de validar sob v2; nenhum
`.ownership.yml` v1 lê como v2 sem o comando de migração (fora desta
decisão). E declarar `plugins:` corretamente na raiz passa a ser
pré-requisito para o bloco do plugin não virar erro — um passo a mais que a
v1 não cobrava. Uma chave digitada errado *dentro* de um bloco passa pela
carga em silêncio e só aparece quando o plugin roda — `validate` não a vê.
E todo caminho de um plugin precisa ser declarado entrada a entrada: não há
reivindicação por padrão.
