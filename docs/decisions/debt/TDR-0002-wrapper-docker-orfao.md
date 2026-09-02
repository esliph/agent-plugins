---
id: TDR-0002
title: bin/living-docs continua exigindo Docker sem ninguém que o invoque
status: paid
owner: '@esliph/engineering'
trigger: >
  Quando o gatilho de pagamento abaixo se cumprir.
last-reviewed: 2026-09-01
relates-to: [ADR-0015, RNF-0002]
# Aspas simples: em YAML, aspas simples não processam `\`, e o padrão é regex.
pay-when:
  pattern: 'bin/living-docs'
  paths:
    - CONTRIBUTING.md
    - README.md
    - docs/definition-of-done.md
    - '.github/workflows/**'
---

# TDR-0002 — bin/living-docs continua exigindo Docker sem ninguém que o invoque

## O atalho

A migração para o Node do host tirou todos os invocadores de `bin/living-docs`:
nenhum documento vivo o ensina, nenhum teste o executa, nenhum passo de CI o
chama. O arquivo continua no repositório, continua sendo uma ponte `docker exec`
para um container que ninguém mais sobe, e continua declarado em
`consumer-visible-paths` — ou seja, ainda é tratado como contrato público.

`Dockerfile`, `compose.yaml` e `.dockerignore` ficam pelo mesmo motivo: o build
que sobrou precisa deles.

## Por que foi aceito

Apagá-los junto com a migração misturaria duas mudanças com riscos diferentes: a
que troca quem executa, verificável rodando os cinco comandos, e a que remove um
caminho de execução que alguém pode estar usando sem ter dito. A primeira é o
escopo desta entrega; a segunda pede uma release e uma linha de depreciação.

Enquanto o wrapper não é invocado por nada, o custo do atraso é um arquivo morto
— barato, e visível para quem o abrir.

## Gatilho de pagamento

Quando `bin/living-docs` voltar a ser ensinado ou executado: uma menção em
`CONTRIBUTING.md`, `README.md`, `docs/definition-of-done.md` ou em qualquer
workflow. É a forma verificável de "alguém tentou usá-lo": a partir daí ele
deixa de ser arquivo morto e passa a ser caminho de execução — e um caminho de
execução que falha por container ausente precisa ou funcionar, ou sair.

## Custo de continuar devendo

Um caminho de execução público que falha com uma mensagem de Docker num
repositório cuja documentação inteira diz que Docker não é necessário. Quem
tropeçar nele não tem como saber se o errado é o wrapper ou a documentação — e
`RNF-0002` diz que é o wrapper.
