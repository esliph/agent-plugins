---
id: TDR-0001
title: HK-1 não congela seção revogada dentro de arquivo de coleção
status: open
owner: "@dan"
trigger: >
  Nunca. Imutável enquanto a dívida existir; o pagamento a marca como paid.
last-reviewed: 2026-08-24
relates-to: []
---

# TDR-0001 — HK-1 não congela seção revogada dentro de arquivo de coleção

## O atalho

`HK-1` decide por arquivo: lê `status` do frontmatter e compara com
`FROZEN_STATUSES`. Um requisito revogado é uma **seção** dentro de
`docs/requirements/rules.md`, um arquivo que continua vivo porque outras seções
mudam. Resultado: `revoked` é estado terminal pela spec §4, mas nada impede um
agente de reescrever o corpo daquela seção.

## Por que foi aceito

Congelar por seção exige que `HK-1` projete a edição, faça o diff **por item** e
saiba qual item foi tocado — trabalho maior que toda a Fase 2, para proteger um
caso que hoje tem zero ocorrências (nenhum requisito revogado existe ainda).
`CI-3` fecha metade do buraco: uma revogação sem par bidirecional falha no CI.

## Gatilho de pagamento

No primeiro PR que **revogar** um requisito — isto é, que mude qualquer seção
para `status: revoked`. A partir daí existe corpo congelado para proteger, e o
custo de não proteger passa a ser real.

## Custo de continuar devendo

Um requisito revogado pode ser reescrito retroativamente sem que hook nenhum
reclame, e a única defesa vira a revisão humana do diff — exatamente a defesa
que o mecanismo 5 existe para não depender.
