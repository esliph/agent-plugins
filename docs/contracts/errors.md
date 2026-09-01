---
title: Catálogo de erros
owner: '@Danrley-Ruan-Saquetti'
trigger: >
    Código de saída novo ou com significado alterado; classe de falha nova na
    linha de comando; mudança no que um código significa para quem consome o CLI.
last-reviewed: 2026-08-25
---

# Catálogo de erros

O que um consumidor do `living-docs` observa quando algo dá errado. O código é
estável e imutável em significado; a mensagem exibível não é parte do contrato
e pode mudar a qualquer momento.

Os IDs dos checks (`CI-n`) **não** estão aqui: eles são gerados a partir do
registry e moram em `docs/contracts/checks.gen.md`. Um código em dois lugares é
um código que já divergiu.

| Código            | Significado                                           | Quando ocorre                                                                                                                                                                                     | Transporte                                              | Público | Status |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------- | ------ |
| EXIT-0            | Nada a corrigir                                       | `validate` sem achado de severidade `error`; `drift` sem deriva; `init` que rodou; `changelog` sem achado                                                                                         | exit 0                                                  | sim     | active |
| EXIT-1            | O repositório viola uma regra de documentação viva    | `validate` com ao menos um achado `error`, ou `drift` com deriva, gerador quebrado ou artefato gerado ausente; ou `changelog` com mudança visível ao consumidor sem entrada nem rótulo de exceção | exit 1                                                  | sim     | active |
| EXIT-2            | O comando não pôde nem começar                        | `docs/.ownership.yml` ausente ou inválido; comando desconhecido; `--stage` desconhecido; nenhum argumento                                                                                         | exit 2                                                  | sim     | active |
| OWNERSHIP-INVALID | O mapa de propriedade não é legível como configuração | YAML inválido, `version` diferente de 1, `artifacts` vazio, `id-prefix` fora de 2–4 maiúsculas, `owner` sem `@`                                                                                   | exit 2, mensagem em stderr começando por `living-docs:` | sim     | active |
| BASE-UNRESOLVED   | O diff do PR não pôde ser lido                        | `changelog` sem `--base`, com base que não resolve, ou em clone raso que não contém a base                                                                                                        | exit 2, mensagem em stderr começando por `living-docs:` | sim     | active |
| UNKNOWN-COMMAND   | O subcomando não existe nesta versão                  | Qualquer palavra que não seja `validate`, `drift`, `changelog` ou `init`                                                                                                                          | exit 2, mensagem em stderr + uso                        | sim     | active |

`EXIT-1` e `EXIT-2` são distintos de propósito: o primeiro é o repositório
falhando, o segundo é a ferramenta não tendo o que fazer. Um script de CI que
os confunde trata configuração quebrada como documentação errada, e manda
consertar o lugar errado.

<!-- Skill dona: contract-keeper. -->

