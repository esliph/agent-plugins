---
name: glossary-keeper
description: >
  Use quando um termo de domínio novo aparecer em código, spec ou conversa,
  quando a mesma palavra estiver sendo usada para duas coisas diferentes,
  quando alguém perguntar "isso já tem um nome?", "que termo a gente usa pra
  isso?", "isso é sinônimo do que já existe?", "por que o código chama de X e
  o requisito chama de Y?" — ou quando um conceito for renomeado e o nome
  antigo continuar aparecendo no código.
---

# glossary-keeper — dono do vocabulário do domínio

## Overview

O glossary é a única fonte de nome para um conceito. Um termo é identificado
pelo **nome**, nunca por um ID numerado (`ADR-0004`, `RN-0011`) — divergência
entre o nome no código e o termo é bug, não sinônimo.

O caminho é `docs/glossary.md` — leia `docs/.ownership.yml` mesmo assim,
porque outros artefatos podem ter mudado de lugar.

## Do que você é dono

| Artefato           | O que é                                                                         | Forma                          |
| ------------------ | ------------------------------------------------------------------------------- | ------------------------------ |
| `docs/glossary.md` | O nome único de cada conceito do domínio, com definição, nome no código e fonte | Arquivo único, tabela, mutável |

Formato da linha: `templates/glossary.md`. Não o reproduza aqui.

## Quando usar / quando não

**Use** a cada termo de domínio novo, a cada ambiguidade de nome, e a cada
renomeação de conceito.

**Não use** para nomear detalhe de implementação sem significado de negócio
(nome de variável, de classe interna) — isso não é domínio, é escolha de
código.

**O custo de usar à toa:** um termo por escolha estilística infla a tabela que
`requirements-keeper` consulta antes de nomear qualquer requisito novo — e uma
tabela que ninguém consegue ler inteira deixa de ser a fonte única de nome.

## Procedimento

1. **Procure antes de criar.** Um `grep` pelo termo e por sinônimos
   prováveis em `docs/glossary.md`. Termo quase igual é sinal de que a
   palavra já existe sob outro nome — não de que precisa de uma segunda
   entrada.
2. **Um significado por termo, sem exceção.** Se a mesma palavra cobre dois
   conceitos, dois termos — um deles `status: banned`, apontando o
   substituto na coluna `Não confundir com`.
3. **Divergência entre nome no código e termo é bug.** Proponha o rename no
   código; não some uma segunda linha ao glossary para acomodar o hábito de
   quem escreveu.
4. **Toda definição aponta a fonte** — a `RN`/`ADR` que a origina. Sem fonte,
   a entrada nasce `status: draft` até que uma exista (spec SK-2, regra 3).
5. **Preencha "Não confundir com"** sempre que houver risco real de
   confusão — é ele que evita a próxima pergunta repetida.
6. **Nomeie pelo termo, não por ID**, em qualquer citação — glossary não tem
   sintaxe `<PREFIXO>-<número>` (`ADR-0004`, `RN-0011`).
7. **Rode `living-docs validate`** antes de encerrar — sabendo que hoje ele
   não varre `docs/glossary.md` (`DA-0002` aberta; `ADR-0004` explica por
   quê). A verificação de duplicidade e de fonte é sua, não do CI.
8. **Cite o termo (pelo nome) na mensagem de commit.**

## Fronteiras

| É seu                                                 | Não é seu                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Nomear um conceito de domínio, com um significado só  | Decidir a regra de negócio sobre esse conceito (→ `requirements-keeper`) |
| Detectar dois termos para a mesma coisa e banir um    | Aceitar a renomeação de um termo aceito (é do dono do termo, ato humano) |
| Propor o rename no código quando ele diverge do termo | Fazer o rename — isso é do agente que está no código                     |
| Apontar o formato da linha                            | Duplicar a tabela aqui                                                   |

## Checklist

- [ ] O termo não existe já sob outro nome — verificação humana
- [ ] Um significado só por termo; divergência virou `banned` + substituto, não uma segunda linha — verificação humana
- [ ] "Nome no código" preenchido, e sem divergência não resolvida com o termo — verificação humana
- [ ] "Fonte" aponta uma `RN`/`ADR` real, ou a entrada nasceu `draft` — verificação humana
- [ ] Nenhum termo ganhou um ID numerado — verificação humana (`RN-0011`)
- [ ] "Não confundir com" preenchido onde havia risco de confusão real — verificação humana
