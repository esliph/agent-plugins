---
title: Definition of Done
owner: "@dan"
trigger: >
  Quando um item passa a ser exigido para considerar trabalho pronto, ou deixa
  de ser — e toda vez que algo foi dado como pronto faltando um passo desta lista.
last-reviewed: 2026-08-25
---

# Definition of Done

Uma mudança está pronta quando todas as caixas abaixo estão marcadas. Cada item
diz **o que o verifica**: um check, um hook, ou uma pessoa. Item que ninguém
verifica não pertence a esta lista — vira intenção, e intenção não é definição.

- [ ] O comportamento novo tem requisito com ID, escrito **antes** do código — verificação: `CI-1` (estrutura) e humana (a ordem).
- [ ] Toda regra `active` é citada por ao menos um teste — verificação: `CI-3`.
- [ ] Todo ID citado resolve para um item existente e não retirado — verificação: `CI-2`.
- [ ] A decisão que não era óbvia virou ADR, e a lacuna que apareceu virou `DA-nnnn` — verificação: humana (`HK-3` intercepta a aceitação).
- [ ] O atalho consciente virou `TDR-nnnn` com gatilho de pagamento observável — verificação: humana.
- [ ] O doc dono de todo caminho vigiado tocado pela mudança está no mesmo commit — verificação: `HK-4` lembra, `HK-5` pergunta.
- [ ] Nenhum item congelado foi editado no corpo — verificação: `HK-1`.
- [ ] Nenhum artefato gerado foi editado à mão, e o contrato regenerado está no mesmo commit — verificação: `HK-2` (bloqueia) e `CI-5` (`living-docs drift`).
- [ ] A mensagem de commit cita o ID afetado — verificação: humana.
- [ ] `npm test`, `npm run typecheck`, `living-docs validate` e `living-docs drift` passam no container — verificação: `CI-1`, `CI-2`, `CI-3` e `CI-5`, rodados pelo workflow do repositório.

## O que esta lista não é

Não é checklist de revisão de código, e não mede volume: nada aqui pede "documentar
o que foi feito". O que ela pede é que a **regra** e a **decisão** existam onde
alguém as encontre depois.
