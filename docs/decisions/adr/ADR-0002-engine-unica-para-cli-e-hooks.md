---
id: ADR-0002
title: Uma engine de validação para CLI e hooks
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-24
relates-to: [ADR-0001, RN-0001, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0002 — Uma engine de validação para CLI e hooks

## Contexto

O toolkit precisa valer em dois contextos com exigências opostas: no CI, sem
agente presente, onde o enforcement precisa falhar fechado; e durante a edição
pelo agente, onde ele precisa falhar aberto e responder em milissegundos. A
tentação natural é escrever duas implementações.

## Alternativas consideradas

- **Duas implementações independentes** — descartada: viola o corolário 4 da
  spec ("todo check de CI espelha uma regra escrita numa skill") pela raiz. Duas
  implementações da mesma regra divergem, e a divergência aparece exatamente
  quando alguém confia numa delas.
- **Hooks chamando o CLI como subprocesso** — descartada: acrescenta um processo
  por hook e obriga a serializar decisão em texto para reinterpretá-la.

## Decisão

`src/config`, `src/frontmatter`, `src/docs` e `src/ids` formam uma engine única.
`src/cli/` e `src/hooks/` são front-ends finos sobre ela: nenhuma regra é escrita
duas vezes. A assimetria entre os contextos fica isolada em duas linhas — o CLI
sai com 1 em erro, o wrapper de hook sempre sai com 0.

## Consequências

### O que se ganha

Uma regra, um lugar. Um check novo é um arquivo em `src/checks/` mais uma linha
no registry, e ele passa a valer nos dois contextos.

### O que se aceita perder

Os hooks carregam mais código do que precisariam (`loadOwnership` parseia o
`.ownership.yml` inteiro para responder sobre um arquivo), e mudanças na engine
afetam simultaneamente CI e hooks — não há como evoluir um sem revalidar o outro.
