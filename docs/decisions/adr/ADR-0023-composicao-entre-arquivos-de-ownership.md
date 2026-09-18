---
id: ADR-0023
title: 'Composição entre arquivos de ownership: base por arquivo, caminhos disjuntos, include sem autoridade'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-18
relates-to: [ADR-0019, ADR-0020, RN-0034]
supersedes: null
superseded-by: null
---

# ADR-0023 — Composição entre arquivos de ownership: base por arquivo, caminhos disjuntos, include sem autoridade

## Contexto

Um monorepo — este mesmo repositório, depois da extração — quer mais de um
arquivo de ownership: um por pacote, ou um centralizado na raiz cobrindo
pacotes que não têm o próprio. O esquema v1 não tem noção de composição
nenhuma; um arquivo de ownership é sempre um só, e estender essa suposição
para vários arquivos exige decidir como a base de cada um se calcula, o que
acontece quando dois arquivos declaram o mesmo caminho, e o que um arquivo
incluído ganha de autoridade do arquivo que o inclui.

Esta decisão cobre o §5 de
`docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md`, a spec
do núcleo de ownership.

## Alternativas consideradas

- **Sobreposição resolvida por especificidade** (o caminho mais específico
  vence, como hierarquia de diretório). Descartada: é o que a v1 tolera
  hoje, e não por desenho — a busca de dono escolhe a primeira entrada
  declarada que casa, enquanto a coleta de documentos aplica todas as que
  casam, duas semânticas diferentes para a mesma sobreposição. `docs/` com
  dono geral e `docs/decisions/adr/` com `decision-recorder` deixa de ser
  expressável sob disjunção, e o custo é aceito: as 23 entradas deste
  repositório já são disjuntas.
- **`include` concede autoridade ao site de inclusão** (o arquivo que
  inclui pode restringir ou ampliar o que o incluído governa). Descartada:
  seria uma segunda declaração de escopo, capaz de divergir da primeira — o
  que o arquivo incluído governa é assunto da base dele, e `include` só diz
  "leia também este arquivo".
- **Confinar todo campo de caminho à base do arquivo, sem exceção.**
  Descartada para `watches[].doc`: um pacote vigiando `packages/api/src/**`
  e apontando para o `CHANGELOG.md` da raiz é caso real, e confinar esse
  campo obrigaria todo pacote a ter changelog próprio — decisão de projeto
  que o núcleo não tem por que impor. Os demais campos (`owned[].path`,
  `generated[].path`, `ignore[]`, `watches[].code`, `derives-from.source`)
  continuam confinados porque nomeiam caminho cuja edição dispara algo.

## Decisão

A base efetiva de um arquivo é o diretório dele mais o `basePath` opcional,
que não aceita `..` nem glob e só desce — com uma exceção: a base da raiz é
sempre a raiz do repositório. Resolvidos contra suas bases, todos os
`owned[].path` de todos os arquivos formam um conjunto disjunto — nenhum é
igual a outro, nenhum é prefixo de diretório de outro —, e colisão é erro de
carga que nomeia os dois arquivos e o caminho, esteja ela dentro de um
arquivo, entre irmãos ou entre um arquivo e outro que o inclui. `include:`
só diz "leia também este arquivo": não confere escopo nem autoridade.
`watches[].doc` é o único campo de caminho livre da base — os demais ficam
confinados a ela, pelo critério de "o caminho pode ser editado e disparar
alguma coisa".

## Consequências

### O que se ganha

"Qual regra cobre este caminho" passa a ter resposta única e independente
da ordem de declaração, e as duas semânticas divergentes de busca e coleta
que a v1 carrega hoje deixam de existir. Um monorepo consegue tanto
ownership centralizado (`basePath` deslocando a base) quanto um arquivo por
pacote, sem que nenhum alcance fora da própria base.

### O que se aceita perder

`docs/` com um dono geral e `docs/decisions/adr/` com a `decision-recorder`
deixa de ser expressável — quem quer as duas coisas declara os irmãos um a
um. Um arquivo cuja base não é ancestral do caminho resolvido é descartado
sem ser aberto (poda), o que é rápido mas significa que `validate` e
`explain`, que nunca podam, são os únicos lugares onde colisão e cobertura
são finalmente conferidas por inteiro.
