---
id: ADR-0013
title: Os dois limiares do fechamento — bump em massa e semelhança de gatilho
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-28
relates-to: [RN-0027, RN-0029]
supersedes: null
superseded-by: ADR-0034
---

# ADR-0013 — Os dois limiares do fechamento — bump em massa e semelhança de gatilho

## Contexto

`CI-9` e `CI-10` são os dois primeiros checks depois de `CI-7` a comparar coisas
sem resposta binária: "vários documentos" não é um número, e "dizem a mesma
coisa" não é uma igualdade. `ADR-0009` já fixou o precedente para esse tipo de
peça — o limiar precisa estar **escrito** para poder ser discutido dentro de um
PR, e a correção de um falso positivo é um ADR novo, nunca uma exceção local.

## Alternativas consideradas

1. **Nenhum limiar: qualquer mudança de `last-reviewed` reprova.** Descartada:
   revisar um documento e atualizar a data é o mecanismo funcionando.
2. **Similaridade estatística para o `trigger` × `description`.** Descartada pela
   mesma razão de `ADR-0009`: um número que ninguém explica no PR é adivinhação.
3. **Comparar por igualdade de frase.** Descartada: `trigger` e `description` são
   escritos para leitores diferentes — um para quem mantém o documento, outro
   para o índice de skills. Exigir igualdade seria exigir cópia, que é o
   anti-requisito de `RN-0010` vindo pela porta dos fundos.
4. **Dois números escritos, calibrados contra este repositório.** Escolhida.

## Decisão

**Bump em massa: três documentos.** Um diff em que **três ou mais** documentos
mudam **apenas** a linha de `last-reviewed`, e nada mais no corpo, reprova. O
número é configurável em `last-reviewed-bump-limit` no `.ownership.yml`.

- **A unidade é o diff da branch, não o commit.** É a unidade que o CI tem, e
  dividir o bump em três commits não o torna revisão de verdade.
- **Não há rótulo de escape.** O escape é o próprio anti-requisito da spec §13.
  Quem revisou de verdade mudou mais do que a data; quem não revisou não deve
  marcar que revisou.

**Semelhança de gatilho: duas raízes compartilhadas.** O `trigger` de um artefato
e a `description` da skill dona precisam compartilhar **ao menos duas** raízes de
palavra. Raiz é a palavra de cinco letras ou mais, normalizada como em
`ADR-0009` (minúscula, sem marcação, sem pontuação), truncada em seis
caracteres — o truncamento é o que faz "alterada" encontrar "alterar" sem que o
toolkit aprenda português.

- **Calibração:** contra os doze pares deste repositório. O par mais apertado é
  `docs/contracts/errors.md` × `contract-keeper`, com três raízes (`código`,
  `saída`, `signif`); o mais folgado é `CONTRIBUTING.md` ×
  `working-agreements-keeper`, com sete. O piso é dois, e a margem de um é
  deliberada: um par que já nasce no piso é um par que qualquer reescrita
  quebra.
- **Item de coleção não entra.** Só o gatilho do **documento** é comparado: o
  `trigger` de um ADR é "Nunca. Imutável após aceito", que é do item e não do
  artefato.
- **Skill dona ausente da raiz do toolkit avisa e segue.** É a única exceção ao
  "só `CI-4` avisa" da spec §9, e existe porque um projeto pode declarar skill
  própria — reprovar por isso seria o check exigindo que todo dono fosse do
  plugin.

## Consequências

### O que se ganha

Duas regras que a spec escreveu e nunca alocou a peça nenhuma passam a ter
enforcement, e os dois números que as sustentam estão escritos onde se discute
número: num ADR, com o corpus da calibração nomeado.

### O que se aceita perder

**Os dois números são escolhidos, não derivados.** Três documentos e duas raízes
são calibração contra um projeto. A primeira vez que qualquer um deles reprovar
um caso legítimo, o caminho é um ADR novo com o caso concreto anexado — não uma
exceção dentro do check, e não baixar o número em silêncio.

**Paráfrase completa passa no `CI-10`.** Um `trigger` reescrito com sinônimos
inteiros não compartilha raiz nenhuma e reprova mesmo dizendo a mesma coisa; um
`trigger` que compartilha duas raízes por acaso passa dizendo outra. É o preço de
uma comparação que cabe numa frase de mensagem de erro.
