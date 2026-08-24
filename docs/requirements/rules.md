---
title: Regras de negócio
owner: "@dan"
trigger: >
  Antes de implementar qualquer comportamento desta família, e a toda regra nova
  ou alterada.
last-reviewed: 2026-08-24
---

# Regras de negócio

Cada requisito é uma seção com ID citável. O ID nunca é reciclado, e é ele que
torna o raio de impacto calculável por `grep`. Formato: `templates/requirements.md`.

## RN-0001 — Todo artefato tem exatamente um dono declarado

- **status:** active
- **relates-to:** ADR-0002
- **fora de escopo:** quem revisa o artefato; isto trata de propriedade, não de revisão

Um artefato de documentação viva pertence a um e apenas um dono, declarado em
`docs/.ownership.yml` e espelhado no CODEOWNERS. Dois donos para o mesmo caminho
é divergência garantida; zero donos torna o artefato órfão e não enforceável.

## RN-0002 — `trigger` nomeia um evento observável, nunca uma cadência

- **status:** active
- **fora de escopo:** a redação do gatilho; o que se exige é a natureza dele

O campo `trigger` declara **quando** o artefato deve ser atualizado, e a resposta
é sempre um evento que alguém pode observar acontecer. Data de calendário
("trimestral", "a cada sprint") descreve intenção de revisão, não necessidade de
mudança — e é o que transforma documento em ritual.

## RN-0003 — Um ID identifica um item, para sempre

- **status:** active
- **fora de escopo:** o formato do ID, que é contrato de máquina e não regra de negócio

Um ID nunca identifica dois itens, e nunca é reaproveitado depois que o item
deixa de existir. `ADR-001` e `ADR-0001` são o mesmo ID: repadding não cria um
item novo. Sem isso, uma citação antiga passa a apontar para outra coisa em
silêncio, que é pior do que apontar para nada.

## RN-0004 — Item congelado só muda nos campos da allowlist

- **status:** active
- **relates-to:** RN-0006
- **fora de escopo:** quem decide congelar; isso é a máquina de estados

Um item em estado terminal aceita mudança apenas nos campos que o `.ownership.yml`
declara mutáveis — tipicamente `status`, `superseded-by` e `last-reviewed`. É
essa allowlist que permite supersedir um ADR sem violar a imutabilidade dele.

## RN-0005 — Promoção de estado é ato humano

- **status:** active
- **fora de escopo:** a criação do item, que é ato de agente

Nenhum agente promove sozinho um item para um estado que significa aceitação
(`draft → accepted`, `open → resolved`, `draft → active`, `active → revoked`). O
máximo que uma skill escreve é `draft`/`open`. Aceitar é decidir, e decidir não
é do agente.

## RN-0006 — Estado terminal não permite edição do corpo

- **status:** active
- **relates-to:** TDR-0001
- **fora de escopo:** o congelamento por seção dentro de arquivo de coleção, que TDR-0001 registra como dívida

Um item que chegou ao estado terminal não se corrige: a história é o ativo. Um
ADR aceito que se revelou errado ganha `superseded`, e a decisão nova explica o
erro.

## RN-0007 — Toda citação resolve, ou o CI falha

- **status:** active
- **fora de escopo:** citação a prefixo não declarado no `.ownership.yml`, que é ignorada de propósito para permitir instalação por fases

Uma referência `<PREFIXO>-<número>` a um prefixo conhecido aponta para um item
existente e não retirado. Citação pendurada é pior que ausência de citação:
ela afirma uma rastreabilidade que não existe.
