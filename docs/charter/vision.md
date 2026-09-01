---
title: Product Vision
owner: '@esliph/engineering'
trigger: >
    Mudança de estratégia de produto — nunca como efeito colateral de outra
    tarefa.
last-reviewed: 2026-08-25
---

# Product Vision

**Que problema:** Documentação que descola do código e apodrece em silêncio —
decisões, requisitos e dívidas técnicas viram conhecimento tribal que evapora
quando quem lembra sai do time.

**Para quem:** Quem mantém um repositório sozinho ou em time pequeno e
precisa que "por que foi feito assim" e "o que ainda não decidimos"
sobrevivam à rotatividade de quem lembra — sem depender de uma wiki paralela
que ninguém atualiza.

**Métrica de sucesso:** `living-docs validate` roda em minutos no PR e falha
antes de mesclar; toda `RN` `active` é citada por ao menos um teste (`CI-3`
sem achado); nenhum ADR aceito foi reescrito retroativamente.

