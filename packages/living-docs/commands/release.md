---
description: Prepara uma versão — deriva a release note do CHANGELOG e move as entradas de Unreleased.
argument-hint: '[versão]'
---

Acione a skill `release-historian` para preparar a versão `$ARGUMENTS`.

A release note é **derivada** do `CHANGELOG.md`, nunca escrita de novo: as
entradas de `## [Unreleased]` viram a seção da versão, e a nota fica com a
moldura — destaques, o que exige atenção de quem atualiza, depreciações
anunciadas.

Ela nasce `status: draft`. Publicar é ato humano: `HK-3` intercepta a promoção
e a resposta não é sua. Depois de `published`, `HK-1` congela o arquivo.
