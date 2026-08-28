---
id: ADR-0010
title: Com que severidade o CI sinaliza o caminho vigiado sem doc dono, e qual é a saída escrita
status: accepted
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-27
relates-to: [RN-0008, RN-0009, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0010 — Com que severidade o CI sinaliza o caminho vigiado sem doc dono, e qual é a saída escrita

## Contexto

O critério de aceite 5 da spec §12 tem duas metades: "`HK-5` pergunta e lista os
pendentes; **e** o CI sinaliza pelo `watches`". A Fase 3 entregou a primeira e
escreveu no README que a segunda não existia. `CI-7` é a segunda.

Três frases escritas em fases diferentes não cabem juntas sem uma decisão:

- spec §9: "`CI-4` é o único autorizado a apenas avisar — os demais falham,
  porque aviso ignorado é o começo da wiki morta."
- `RN-0009`: "O que liga código a documento informa ou pergunta. Nunca
  bloqueia."
- spec §12, critério 5: o CI "sinaliza" — palavra que serve para os dois.

## Alternativas consideradas

1. **Aviso.** Descartada. A metade do hook já é o caminho gentil; se as duas
   metades avisam, o mecanismo 1 não tem barreira nenhuma, e a spec §9 diz
   exatamente o que acontece com aviso ignorado.
2. **Erro sem saída.** Descartada. Contradiz `RN-0009` de frente e, pior, não
   deixa caminho honesto para a mudança que realmente não afeta o doc — que
   existe, e cuja negação é o que faz alguém desligar o enforcement.
3. **Erro com rótulo de exceção com razão escrita.** Escolhida.
4. **Não implementar a metade do CI.** Descartada: o critério 5 nunca fecharia,
   e a frase do README ficaria permanente.

## Decisão

**Erro, com uma saída escrita: `Docs: none — <razão>`.**

- A metade do diff de `CI-7` é `severity: 'error'`.
- A única saída é o rótulo `Docs: none — <razão>` em alguma mensagem de commit
  do intervalo, com separador e razão não vazia. Rótulo sem razão não é
  exceção: é a caixinha marcada.
- Essa metade só roda com `living-docs validate --base <ref>`. Sem `--base`,
  `validate` imprime o ponteiro dizendo que ela não rodou — mesma honestidade
  que `validate` já tem sobre `drift` e `changelog`.
- O rótulo vale para o intervalo inteiro do diff, não por documento.

**`RN-0009` continua verdadeira no escopo dela.** O vocabulário dela é de hook
— `additionalContext` e `ask` —, e o que ela protege é o momento do commit, onde
existe uma pessoa para responder. No CI não existe: `RNF-0001` já dizia, em
"fora de escopo", que "o CI falha fechado de propósito". E o precedente está no
repositório desde a Fase 6: a regra `src/cli/** → CHANGELOG.md` é uma entrada de
`watches`, e `CI-6` já falha por ela com um rótulo de escape (`ADR-0006`). Esta
decisão dá ao caso geral a forma que o caso particular já tinha.

## Consequências

### O que se ganha

O critério 5 fecha inteiro. O mecanismo 1 passa a ter as duas pontas que a spec
desenhou: a pergunta barata no commit, e a barreira que sobrevive a hook
desligado, container parado e commit feito na mão.

### O que se aceita perder

Mais uma coisa para quem escreve mensagem de commit lembrar, e um rótulo a mais
para explicar em `CONTRIBUTING.md`. Dois rótulos (`Changelog: none` e
`Docs: none`) é o começo de uma família de rótulos, e família de rótulo vira
burocracia; a próxima adição precisa de ADR próprio, justamente por isso.

**O rótulo é global ao intervalo.** Uma razão libera todos os docs pendentes do
PR, não um a um. Granularidade por documento exigiria sintaxe maior
(`Docs: none (CHANGELOG.md) — <razão>`), e sintaxe maior não se usa: o custo de
acertar a sintaxe passa a ser maior que o de atualizar o doc, e aí quem escreve
faz a coisa errada por ergonomia.

`Docs: none — <razão>` também silencia o caminho vigiado que **deveria** ter
levado o doc. Isso é o mesmo risco que `ADR-0006` aceitou para o `CHANGELOG`, e
a defesa é a mesma: a razão fica no histórico, com nome de quem a escreveu.
