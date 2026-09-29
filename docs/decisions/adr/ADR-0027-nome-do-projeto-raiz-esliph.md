---
id: ADR-0027
title: Nome do projeto — raiz esliph, pacote @esliph/living-docs
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-18
relates-to: [ADR-0014, ADR-0025, RNF-0002]
supersedes: null
superseded-by: null
---

# ADR-0027 — Nome do projeto — raiz esliph, pacote @esliph/living-docs

## Contexto

O `ADR-0014` fez `@esliph/living-docs` ser o nome do projeto e do pacote ao mesmo
tempo, quando o repositório tinha um pacote só. O `ADR-0025` colocou
`packages/ownership` ao lado, e a fatia física da migração move o living-docs para
`packages/living-docs`. A raiz deixa de ser um pacote e passa a ser o workspace
que reúne os dois. Nome de pacote npm é único por `package.json`, e a raiz e o
pacote não podem se chamar igual.

Esta decisão supersede o `ADR-0014` quando for aceita. Enquanto é `draft`, o
campo `supersedes` fica `null`: o `ADR-0014` está aceito e congelado, e fechar o
par (`supersedes` aqui e `superseded-by` lá) faz parte da promoção, que é humana.

## Alternativas consideradas

- **A raiz continua `@esliph/living-docs`, e o pacote ganha outro nome.**
  Descartada: o nome do pacote é o que quem consome instala e cita, e renomeá-lo
  quebraria contrato público só para acomodar uma raiz que não se publica.
- **A raiz sem `name`.** Descartada: o npm aceita, mas o lockfile e as mensagens de
  erro de workspace passam a mostrar um projeto anônimo, e o marketplace já se
  chama `esliph`.
- **A raiz `@esliph/monorepo` ou `@esliph/root`.** Descartada: escopo sugere
  publicação, e a raiz é `private: true`, nunca publicada.

## Decisão

A raiz do repositório passa a ser `esliph`, privada e sem escopo, com o mesmo nome
do marketplace; `@esliph/living-docs` continua sendo o nome do pacote do toolkit,
agora em `packages/living-docs/`, e o container `esliph-living-docs` e o comando
`living-docs` não mudam.

## Consequências

### O que se ganha

Um nome para o que se distribui (`esliph`, o marketplace e o workspace) e um para
cada coisa que se instala (`@esliph/living-docs`, `@esliph/ownership`), sem
sobreposição.

### O que se aceita perder

O `ADR-0014` e os planos anteriores descrevem a raiz como `@esliph/living-docs`.
Ficam como registro, e quem os lê precisa saber que essa identidade passou para
`packages/living-docs/`.
