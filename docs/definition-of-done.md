---
title: Definition of Done
owner: '@esliph/engineering'
trigger: >
  Quando um item passa a ser exigido para considerar trabalho pronto, ou deixa
  de ser — e toda vez que algo foi dado como pronto faltando um passo desta lista.
last-reviewed: 2026-09-15
---

# Definition of Done

Uma mudança está pronta quando todas as caixas abaixo estão marcadas. Cada item
diz **o que o verifica**: um check, um hook, ou uma pessoa. Item que ninguém
verifica não pertence a esta lista — vira intenção, e intenção não é definição.

- [ ] O comportamento novo tem requisito com ID, escrito **antes** do código — verificação: `living-docs/frontmatter` (estrutura) e human (a ordem).
- [ ] Toda regra `active` é citada por ao menos um teste — verificação: `living-docs/citation-coverage`.
- [ ] Todo ID citado resolve para um item existente e não retirado — verificação: `living-docs/id-integrity`.
- [ ] A decisão que não era óbvia virou ADR, e a lacuna que apareceu virou `DA-nnnn` — verificação: human (`living-docs/state-promotion` intercepta a aceitação).
- [ ] O atalho consciente virou `TDR-nnnn` com gatilho de pagamento observável — verificação: `living-docs/shortcut-debt` lembra; registrar é human.
- [ ] O doc dono de todo caminho vigiado tocado pela mudança está no mesmo commit — verificação: `ownership/watch-reminder` lembra, `ownership/commit-guard` pergunta.
- [ ] Nenhum item congelado foi editado no corpo — verificação: `living-docs/append-only`.
- [ ] Nenhum artefato gerado foi editado à mão, e o contrato regenerado está no mesmo commit — verificação: `ownership/generated-guard` (bloqueia) e `ownership/generated-drift` (`ownership validate`).
- [ ] A mudança visível ao consumidor levou a entrada em `## [Unreleased]`, ou a razão escrita no commit — verificação: `ownership/consumer-change-logged` (`ownership validate --base <ref>`).
- [ ] A mensagem de commit cita o ID afetado — verificação: `living-docs/commit-discipline` (`living-docs validate --base <ref>`).
- [ ] Todo documento novo foi declarado em `.ownership.yml` e no CODEOWNERS — verificação: `ownership/owner-coverage`.
- [ ] Nenhum link interno ficou quebrado, e nenhum anexo binário entrou sob `docs/` — verificação: `living-docs/links`.
- [ ] A dívida registrada declara `pay-when`, e nenhuma dívida com gatilho cumprido continua `open` — verificação: `living-docs/staleness`.
- [ ] O caminho vigiado que mudou levou o doc dono, ou a razão escrita no commit — verificação: `ownership/commit-guard` pergunta, `ownership/watch-satisfied` reprova (`ownership validate --base <ref>`).
- [ ] `npm test`, `npm run typecheck`, `ownership validate [--base <ref>]` e `living-docs validate [--base <ref>]` passam no host — verificação: os checks do núcleo e do living-docs (`ownership/owner-coverage`, `living-docs/frontmatter`, …), rodados pelo workflow do repositório.
- [ ] Nenhum agente e nenhuma pessoa errou por falta de contexto que caberia num artefato existente — e, quando errou, o artefato dono ganhou a linha que faltava — verificação: human (spec §12, critério 9).
- [ ] Nenhuma métrica de volume documental foi usada como sinal de qualidade: nem contagem de páginas, nem cobertura, nem "documentar o que foi feito" — verificação: human (spec §12, critério 10).

## O que esta lista não é

Não é checklist de revisão de código, e não mede volume: nada aqui pede "documentar
o que foi feito". O que ela pede é que a **regra** e a **decisão** existam onde
alguém as encontre depois.
