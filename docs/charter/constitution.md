---
title: Constitution
owner: '@esliph/engineering'
trigger: >
  Emenda deliberada — nunca como efeito colateral de outra tarefa.
last-reviewed: 2026-09-01
version: 3
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
6. O toolkit roda no Node do host, sem passo de build — verificado por `test/plugin/manifest.test.ts` (`RNF-0002`) e pelo workflow `living-docs`, que instala Node e npm e nada além. O caminho conteinerizado de `RNF-0006` é opcional, e não é a execução de registro.

## Log de emendas

- 2026-08-25 — v1 — Criação inicial, seis princípios refletindo `RN-0001`–`RN-0010` e `RNF-0002` — humana, dogfooding da Fase 4.
- 2026-09-01 — v2 — Princípio 6 passa a afirmar a execução no Node do host, acompanhando `ADR-0015`, que supersede `ADR-0001` — humana, migração da execução para o host.
- 2026-09-01 — v3 — O princípio 6 nomeia o workflow `living-docs` como a verificação de registro e declara opcional o caminho conteinerizado de `RNF-0006` — humana, acompanhando `ADR-0016`, que carrega `ADR-0015` sem supersedê-lo.
