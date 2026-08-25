---
title: Constitution
owner: "@dan"
trigger: >
  Emenda deliberada — nunca como efeito colateral de outra tarefa.
last-reviewed: 2026-08-25
version: 1
---

# Constitution

O que é inviolável neste toolkit, e como cada princípio se verifica. Princípio
sem enforcement nomeado é slogan — nenhum entra aqui sem ele.

## Princípios

1. Um artefato tem exatamente um dono, declarado e espelhado no CODEOWNERS — verificado por `RN-0001` e `CI-1`.
2. `trigger` nomeia um evento observável, nunca uma cadência de calendário — verificado por `CI-1`.
3. Nenhum item aceito se corrige no corpo — supersede — verificado por `HK-1`.
4. Nenhum agente promove sozinho um estado que significa aceitação — verificado por `HK-3`.
5. Caminho vigiado e o doc dono viajam no mesmo commit — verificado por `HK-4` (lembra) e `HK-5` (pergunta).
6. Nada roda no host além de Docker — verificado por `test/plugin/manifest.test.ts` (`RNF-0002`) e por revisão humana de `Dockerfile`/`compose.yaml`.

## Log de emendas

- 2026-08-25 — v1 — Criação inicial, seis princípios refletindo `RN-0001`–`RN-0010` e `RNF-0002` — humana, dogfooding da Fase 4.
