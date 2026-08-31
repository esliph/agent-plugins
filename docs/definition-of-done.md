---
title: Definition of Done
owner: "@dan"
trigger: >
  Quando um item passa a ser exigido para considerar trabalho pronto, ou deixa
  de ser — e toda vez que algo foi dado como pronto faltando um passo desta lista.
last-reviewed: 2026-08-27
---

# Definition of Done

Uma mudança está pronta quando todas as caixas abaixo estão marcadas. Cada item
diz **o que o verifica**: um check, um hook, ou uma pessoa. Item que ninguém
verifica não pertence a esta lista — vira intenção, e intenção não é definição.

- [ ] O comportamento novo tem requisito com ID, escrito **antes** do código — verificação: `CI-1` (estrutura) e humana (a ordem).
- [ ] Toda regra `active` é citada por ao menos um teste — verificação: `CI-3`.
- [ ] Todo ID citado resolve para um item existente e não retirado — verificação: `CI-2`.
- [ ] A decisão que não era óbvia virou ADR, e a lacuna que apareceu virou `DA-nnnn` — verificação: humana (`HK-3` intercepta a aceitação).
- [ ] O atalho consciente virou `TDR-nnnn` com gatilho de pagamento observável — verificação: `HK-7` lembra; registrar é humana.
- [ ] O doc dono de todo caminho vigiado tocado pela mudança está no mesmo commit — verificação: `HK-4` lembra, `HK-5` pergunta.
- [ ] Nenhum item congelado foi editado no corpo — verificação: `HK-1`.
- [ ] Nenhum artefato gerado foi editado à mão, e o contrato regenerado está no mesmo commit — verificação: `HK-2` (bloqueia) e `CI-5` (`living-docs drift`).
- [ ] A mudança visível ao consumidor levou a entrada em `## [Unreleased]`, ou a razão escrita no commit — verificação: `CI-6` (`living-docs changelog --base <ref>`).
- [ ] A mensagem de commit cita o ID afetado — verificação: `CI-9` (`living-docs validate --base <ref>`).
- [ ] Todo documento novo foi declarado em `docs/.ownership.yml` e no CODEOWNERS — verificação: `CI-7`.
- [ ] Nenhum link interno ficou quebrado, e nenhum anexo binário entrou sob `docs/` — verificação: `CI-8`.
- [ ] A dívida registrada declara `pay-when`, e nenhuma dívida com gatilho cumprido continua `open` — verificação: `CI-4`.
- [ ] O caminho vigiado que mudou levou o doc dono, ou a razão escrita no commit — verificação: `HK-5` pergunta, `CI-7` reprova (`living-docs validate --base <ref>`).
- [ ] `npm test`, `npm run typecheck`, `living-docs validate --base <ref>`, `living-docs drift` e `living-docs changelog --base <ref>` passam no container — verificação: `CI-1` a `CI-10`, rodados pelo workflow do repositório.

## O que esta lista não é

Não é checklist de revisão de código, e não mede volume: nada aqui pede "documentar
o que foi feito". O que ela pede é que a **regra** e a **decisão** existam onde
alguém as encontre depois.
