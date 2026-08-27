---
id: ADR-0009
title: O limiar que distingue vocabulário compartilhado de conteúdo copiado
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-27
relates-to: [RN-0010]
supersedes: null
superseded-by: null
---

# ADR-0009 — O limiar que distingue vocabulário compartilhado de conteúdo copiado

## Contexto

`CI-7` inclui "contrato do agente repetindo texto de um artefato dono" (spec
§9), e a spec §5 (`SK-6`, regra 1) diz que é `CI-7` quem sinaliza isso.
`RN-0010` já declara a regra e registra, em "fora de escopo", que a detecção
automática chega na Fase 7.

É o único check da spec com risco real de falso positivo. O contrato do agente
fala das mesmas coisas que os artefatos donos falam — é a função dele apontar
para elas —, então ele **vai** compartilhar palavras. Um check que confunda
vocabulário compartilhado com conteúdo copiado é desligado no primeiro dia, e
aí a regra que ele protegia deixa de ter enforcement nenhum.

## Alternativas consideradas

1. **Qualquer linha repetida.** Descartada. Reprovaria "Nada roda no host além
   de Docker", que é política legítima, curta, e cuja presença no contrato do
   agente é o que faz o agente obedecê-la.
2. **Similaridade estatística (shingles, Jaccard, limiar percentual).**
   Descartada. Um número que ninguém consegue explicar dentro de um PR não é
   enforcement, é adivinhação; e o custo do falso positivo aqui não é um ajuste,
   é uma discussão sobre o próprio check.
3. **Só o título de requisito**, que é o que `test/docs/agent-contract.test.ts`
   já faz desde a Fase 3. Descartada como forma final: pega o caso mais fácil e
   deixa passar o parágrafo copiado, que é o caso caro.
4. **Frase normalizada com piso de palavras, comparada por igualdade dentro do
   corpus.** Escolhida.

## Decisão

**Uma frase de doze palavras ou mais do contrato do agente que reapareça,
palavra por palavra, num artefato com skill dona, é duplicata e reprova.**

- **Unidade: a frase.** Parágrafo primeiro (linhas consecutivas juntadas), corte
  depois: prosa quebrada em oitenta colunas não pode escapar do check só por
  causa de onde o editor deu enter.
- **Normalização:** minúscula, sem marcação (`*`, `_`, `` ` ``, `~`), sem
  pontuação, espaço colapsado. Bloco de código — cercado ou inline — sai antes.
- **Piso: 12 palavras.** Abaixo disso é vocabulário compartilhado.
- **Corpus: artefatos e documentos declarados que têm skill dona.** Fica de
  fora o que cita por ofício — plano, spec, README, backlog —, porque ali a
  repetição é o trabalho, e reprovar o contrato do agente por causa de um plano
  que o citou seria inverter quem copiou de quem.
- **Severidade: erro.** A correção é apagar a frase do contrato e deixar o
  ponteiro para o artefato dono — nunca baixar o limiar.

## Consequências

### O que se ganha

`RN-0010` ganha enforcement automático, e a duplicata mais cara que existe — a
que é relida em toda sessão de agente e por isso vence a versão nova por
repetição — passa a ser pega por máquina em vez de por revisão atenta.

### O que se aceita perder

**Paráfrase passa.** Duplicata semântica não é detectada, e não vai ser: o
check que a detectasse erraria mais do que acertaria, e o erro dele seria numa
direção que ninguém consegue argumentar.

**O piso é um número escolhido, não derivado.** Doze palavras é o ponto onde as
frases de política deste repositório ficam abaixo e os parágrafos copiados ficam
acima; é uma calibração feita contra um corpus de um projeto. A primeira vez que
ele reprovar uma frase legítima, o caminho é um ADR novo que o mude, com o caso
concreto anexado — não uma exceção local dentro do check.

O corpus depende de `skill:` estar declarado. Um documento que devesse estar no
corpus e não declare skill fica fora, e a duplicata dele passa. É o preço de não
ter uma segunda lista de "quem entra no corpus".
