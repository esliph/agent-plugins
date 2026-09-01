---
id: ADR-0005
title: O gerador imprime na saída padrão, e CI-5 roda num subcomando próprio
status: accepted
owner: '@esliph/engineering'
trigger: >
    Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-25
relates-to: [RF-0006, RN-0012]
supersedes: null
superseded-by: null
---

# ADR-0005 — O gerador imprime na saída padrão, e CI-5 roda num subcomando próprio

## Contexto

A Fase 5 (spec §10) entrega `CI-5`: "regenerar o contrato produz diff ≠ 0"
(§9). O `.ownership.yml` já declara a forma da configuração desde a Fase 0 —
`generated: [{ path, command }]` — mas nunca disse **o que `command` faz**, e
`generated` está vazio em todo repositório até hoje.

Duas perguntas ficaram em aberto, e as duas mudam a engine:

1. O comando **escreve o arquivo** ou **imprime o conteúdo**? É o contrato que
   todo projeto consumidor vai ter de cumprir.
2. `CI-5` roda dentro de `living-docs validate`, junto com `CI-1`–`CI-3`, ou
   num subcomando separado? `CI-5` é o primeiro check que executa subprocesso —
   e o comando que ele executa vem do repositório **validado**, não do toolkit.

## Alternativas consideradas

**O gerador escreve o arquivo e `CI-5` compara com `git diff --exit-code`.**
É como a maioria dos geradores do mercado funciona (OpenAPI, protobuf, ORM).
Descartada: o check passaria a **reescrever o arquivo que está checando**, o
que apaga a evidência no mesmo instante em que a reporta — quem lê a falha no
CI já não consegue ver o conteúdo antigo. Além disso, amarra `CI-5` ao `git`
(árvore limpa, `safe.directory`, repositório inicializado), e um check que
depende do estado da árvore não é reproduzível localmente.

**`CI-5` dentro de `validate`, junto com os demais.** É mais difícil de
esquecer, e a spec §9 lista os oito checks lado a lado. Descartada nesta fase:
`validate` hoje só **lê** arquivos, e `runValidate` é chamado in-process pela
suíte de testes. Passar a executar um comando arbitrário declarado pelo
repositório alvo muda a natureza do comando — um agente que valida um
repositório recém-clonado passaria a executar código dele sem pedir nada a
ninguém — e torna a suíte dependente do ambiente.

**`CI-5` só quando uma flag pede (`validate --generated`).** Descartada: uma
flag que ninguém digita é um check que nunca roda, com a agravante de parecer
instalado.

**O gerador imprime na saída padrão e não escreve nada; `CI-5` compara a saída
com o arquivo em disco; `CI-5` roda em `living-docs drift`. Escolhida.**

## Decisão

1. `generated[].command` **imprime na saída padrão o conteúdo esperado do
   artefato e não escreve arquivo nenhum.** `CI-5` captura essa saída e a
   compara com o arquivo versionado.
2. A comparação normaliza `\r\n` para `\n` e apara as quebras de linha finais.
   CR vem do checkout, não do gerador; uma quebra final a mais é
   redirecionamento de shell. Qualquer outra diferença é deriva.
3. `CI-5` **não** entra na lista de `living-docs validate`. Ele roda em
   `living-docs drift`, o único subcomando que executa comando do repositório
   validado.
4. `validate` não fica em silêncio sobre isso: quando `generated[]` não está
   vazio, ele imprime uma linha dizendo que a deriva de contrato é verificada
   por `living-docs drift`. É ponteiro, não achado — não altera o exit code.
5. Gerador que falha (exit ≠ 0, timeout) e artefato declarado e ausente são
   achados de severidade `error`, não silêncio. `CI-5` não falha aberta: essa
   é a política dos **hooks** (`RNF-0001`), e um check que se cala quando o
   gerador quebra mente com a autoridade de quem passou.

## Consequências

### O que se ganha

- `CI-5` é uma função pura de (comando, arquivo) → achados: sem git, sem
  mutação de árvore, testável com executor falso.
- `validate` continua sendo o que sempre foi — leitura — e continua chamável
  in-process pela suíte sem efeito colateral.
- O contrato do gerador é uma frase que cabe num template: "imprima o conteúdo,
  não escreva o arquivo".

### O que se aceita perder

- Geradores de mercado que só escrevem arquivo precisam de um invólucro que
  gere num diretório temporário e imprima o resultado. É trabalho a mais de
  quem instala, e está dito no comentário de `templates/ownership.yml`.
- Um projeto pode nunca rodar `living-docs drift` e não perceber. A mitigação é
  social e não é automática: o workflow deste repositório roda, a Definition of
  Done nomeia `CI-5`, e `validate` aponta o subcomando quando há o que checar.
- `CI-5` executa um comando declarado pelo repositório validado. Continua sendo
  execução de código de terceiro — o que muda é que ela acontece num comando
  que a pessoa digitou de propósito, não como efeito colateral de `validate`.

