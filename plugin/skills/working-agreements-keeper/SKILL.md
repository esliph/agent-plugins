---
name: working-agreements-keeper
description: >
  Use quando um agente ou uma pessoa errou por falta de contexto — "ninguém me
  disse que era assim", "isso não estava escrito em lugar nenhum", "achei que
  podia rodar direto", "como é que se faz isso aqui?", "quando é que isso está
  pronto?" — e sempre que o processo de trabalho mudar: comando novo, passo
  obrigatório novo, regra de commit, política sobre o que agente pode ou não
  fazer sozinho. Também quando o contrato do agente (CLAUDE.md/AGENTS.md)
  estiver repetindo conteúdo que pertence a outro documento.
---

# working-agreements-keeper — dono de como se trabalha aqui

## Overview

Três artefatos respondem "como se trabalha neste repositório": `CONTRIBUTING.md`
(o processo), `docs/definition-of-done.md` (quando acabou) e o contrato do
agente (`CLAUDE.md` ou `AGENTS.md` — índice e política).

O segundo gatilho desta skill é o melhor do catálogo: **toda vez que alguém erra
por falta de contexto**, falta uma linha em um destes três. É isso que torna o
documento auto-corretivo em vez de decorativo.

Caminhos e donos vêm de `docs/.ownership.yml` e do `CODEOWNERS`; não assuma.

## Do que você é dono

| Artefato                     | O que é                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `CONTRIBUTING.md`            | O processo: ambiente, ciclo, idioma, onde a verdade mora           |
| `docs/definition-of-done.md` | A lista do que precisa estar feito, com a verificação de cada item |
| `CLAUDE.md` / `AGENTS.md`    | Contrato do agente: índice e política, nunca conteúdo              |

As sementes estão em `templates/contributing.md`,
`templates/definition-of-done.md` e `templates/agent-contract.md`. Não reproduza
o conteúdo delas aqui.

## Quando usar / quando não

**Use** quando o processo mudar, e quando um erro por falta de contexto
acontecer — a correção é uma linha nova, e ela tem uma de duas formas: _onde
está a verdade_ ou _o que nunca fazer_.

**Não use** para registrar regra de negócio (é `requirements-keeper`), decisão
técnica (é `decision-recorder`) ou o que o linter já pega — configuração de
ferramenta não é documento.

**O custo de usar à toa:** cada linha acrescentada é lida em toda sessão. Uma
lista que cresce sem parar é lida por ninguém, e "se ninguém lê, não está vivo".

## Procedimento

1. **Leia `docs/.ownership.yml`** e confirme quais dos três artefatos existem e
   onde. Se nenhum existir, rode `/docs-setup` com o estágio `small-team`.
2. **Classifique o que você tem em mãos**: processo → `CONTRIBUTING.md`;
   condição de pronto → Definition of Done; política ou índice para agente →
   contrato do agente.
3. **Procure a linha que já cobre isso.** Erro repetido costuma ser linha
   existente mal colocada, não linha faltando.
4. **Escreva uma linha, não um parágrafo.** Forma: _onde está a verdade_ ("a
   regra de X mora em `docs/requirements/rules.md`") ou _o que nunca fazer_
   ("nunca promova uma decisão sem revisão humana").
5. **Item novo na DoD nomeia sua verificação**: um `CI-n`, um `HK-n`, ou
   explicitamente "humana". Item sem verificação não entra.
6. **No contrato do agente, linke — não copie.** Se a frase que você ia escrever
   é uma afirmação factual, ela pertence ao artefato dono; aqui fica o link.
7. **Se a mudança de processo alterou o vínculo código→doc**, atualize `watches`
   no `.ownership.yml`: é ele que `HK-4` e `HK-5` leem.
8. **O contrato do agente não repete texto de artefato dono, e isso agora é
   verificado.** `CI-7` compara frase por frase (piso de doze palavras,
   `ADR-0009`) contra os artefatos com skill dona. Quando ele acusa, a correção é
   apagar a frase e deixar o ponteiro — nunca mexer no limiar.
9. **Documento novo é declarado nos dois lugares:** `documents:` no
   `docs/.ownership.yml` (com a skill dona, e o `role` quando for o contrato do
   agente ou a Definition of Done) e uma linha no CODEOWNERS.
10. **A semente não é conteúdo.** Na primeira escrita sobre o que o `init`
    semeou, o que não for verdade neste projeto sai — apagar o que sobra é parte
    do trabalho.

## Fronteiras

| É seu                                                | Não é seu                                           |
| ---------------------------------------------------- | --------------------------------------------------- |
| Como se trabalha, e quando algo está pronto          | A regra de negócio que o CONTRIBUTING referencia    |
| Transformar erro por falta de contexto em linha nova | Duplicar conteúdo de outro artefato                 |
| A política sobre o que um agente pode fazer sozinho  | Aceitar a decisão em si (é ato humano, `HK-3`)      |
| O item da DoD e a verificação que o cobre            | Escrever o check que verifica (é `CI-n`, na engine) |

## Checklist

- [ ] Cada afirmação factual do contrato do agente é um link para o artefato dono, não uma cópia — verificação: `CI-7` na Fase 7; até lá, humana.
- [ ] Todo item novo da DoD nomeia o que o verifica: `CI-n`, `HK-n`, ou "humana" explícita — verificação: humana.
- [ ] O caminho vigiado que a mudança criou está em `watches`, com doc dono — verificação: `HK-4` e `HK-5`.
- [ ] Nenhum dos três artefatos ganhou conteúdo que pertence a `docs/requirements/` ou a `docs/decisions/` — verificação: humana.
- [ ] O `trigger` do artefato alterado continua nomeando evento, não cadência — verificação: `CI-1`.
- [ ] A alteração nasceu de um erro observado ou de uma mudança real de processo, não de vontade de documentar — verificação: humana.
- [ ] `last-reviewed` foi atualizado só nos arquivos que mudaram de verdade — verificação: humana (bump em massa é anti-requisito da spec §13).
- [ ] Nenhuma frase do contrato do agente repete artefato dono — verificação: `CI-7`.
- [ ] Cada item novo da Definition of Done nomeia o que o verifica — verificação: `CI-7`.
