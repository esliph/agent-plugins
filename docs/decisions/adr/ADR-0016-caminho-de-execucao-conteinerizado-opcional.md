---
id: ADR-0016
title: Caminho de execução conteinerizado opcional, paridade por delegação
status: accepted
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-01
relates-to: [ADR-0015, ADR-0003, RNF-0006]
supersedes: null
superseded-by: null
---

# ADR-0016 — Caminho de execução conteinerizado opcional, paridade por delegação

## Contexto

`ADR-0015` moveu a execução para o `node` do host e, ao fazê-lo, deixou
`Dockerfile`, `compose.yaml` e `bin/living-docs` no repositório sem nenhum
documento, teste ou passo de CI que os invocasse — atalho consciente, registrado
em `TDR-0002`. O gatilho de pagamento daquela dívida é verificável: quando o
wrapper voltar a ser ensinado ou executado, ele precisa ou funcionar, ou sair.

Existe uma razão para ele voltar a funcionar. Uma máquina sem Node, ou com Node
mais velho que 24, é exatamente o caso que `ADR-0001` comprava e que `ADR-0015`
declarou perder. Um ambiente previsível e portátil para **manutenção** — rodar os
testes, o type-check, o CLI — é conveniência real de quem desenvolve, e o
repositório já carrega tudo que ela exige.

O que não pode voltar é a dependência do enforcement local no estado de um
daemon. Esse é o núcleo de `ADR-0015`, e é ele que decide o desenho.

## Alternativas consideradas

- **Superseder `ADR-0015` e voltar o container a ser o caminho de registro.**
  Descartada: reabriria `ADR-0001` pela porta dos fundos, e `ADR-0001` continua
  superseiado pelos motivos que `ADR-0015` registrou — hook com teto de 5 s que
  falha aberta não pode depender de um daemon, sob pena de o enforcement local
  desaparecer em silêncio.
- **Um par de wrappers, bash e PowerShell, com a mesma lógica escrita duas
  vezes.** Descartada: duas cópias de uma lógica divergem, e a divergência
  aparece na máquina de quem menos consegue diagnosticá-la. O `git` já é exigido
  pelo toolkit, e o Git for Windows traz o bash junto — no Windows invoca-se pelo
  Git Bash, pelo WSL, ou com `bash bin/dev …` a partir do PowerShell.
- **Exercitar o caminho Docker em todo PR.** Descartada: devolveria ao CI a
  construção de imagem que `ADR-0015` tirou de lá, cobrando minutos de todo PR
  para verificar um caminho opcional. O filtro por caminho custa zero no PR comum
  e cobre o que de fato pode quebrar.
- **Generalizar `bin/living-docs` em vez de criar `bin/dev`.** Descartada: o
  wrapper do CLI tem um contrato público — invocá-lo roda o CLI — e transformá-lo
  num executor genérico quebraria esse contrato para ganhar um arquivo a menos.

## Decisão

Existe um segundo caminho de execução, **opcional**: `bin/dev` roda qualquer
comando de manutenção dentro do container, e `bin/living-docs` passa a ser uma
delegação de uma linha para ele.

**Este ADR não supersede `ADR-0015`, e o motivo é de substância, não de forma.**
O núcleo daquela decisão é que o enforcement local não pode depender do estado de
um daemon. Os hooks **nunca** entram no container: `plugin/hooks/run-hook.sh`
continua invocando `node` no host, sem tocar em Docker. Enquanto isso for
verdade, aquele núcleo fica intacto, e este caminho é acréscimo, não reversão.
Registrar isto como supersessão diria que `ADR-0015` deixou de valer — e ele
vale, inteiro.

A paridade entre os dois caminhos não é mantida por disciplina: `bin/dev` não tem
subcomando, não tem tabela de comandos suportados, não valida `argv` e não traduz
nada. Uma lista de comandos que funcionam no Docker não pode divergir da lista do
host porque essa lista não está escrita em lugar nenhum. Um comando de manutenção
novo passa a funcionar nos dois caminhos no mesmo commit que o cria.

`ADR-0003` não é tocado. As duas raízes continuam distintas e continuam vindo das
mesmas fontes: dentro do container elas chegam por variável de ambiente do
`compose.yaml`, nunca pelo diretório de trabalho.

## Consequências

### O que se ganha

Uma máquina sem Node, ou com Node velho, volta a conseguir rodar os testes, o
type-check e o CLI — que era precisamente o que `ADR-0015` declarou perder — sem
que o enforcement local passe a depender de um daemon. `TDR-0002` é pago por
conserto: o arquivo morto volta a funcionar em vez de sair.

### O que se aceita perder

**O daemon do Docker vira dependência de quem escolhe esse caminho**, e a
primeira invocação constrói uma imagem, o que não é rápido.

**I/O em bind mount de caminho Windows é lento**, e este repositório mora no
OneDrive, o que agrava. `bin/dev npm test` é sensivelmente mais lento que
`npm test` no host. Isso não invalida o caminho; invalida a ideia de que ele seja
o padrão, e é uma razão a mais para a documentação ensinar o host primeiro.

**Um caminho de execução público a mais para manter**, com cobertura de CI
deliberadamente parcial: o workflow que o exercita dispara por filtro de caminho,
então uma quebra causada por algo fora da lista vigiada só aparece na próxima vez
que alguém tocar naquela lista.
