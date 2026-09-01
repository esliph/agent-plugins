---
id: ADR-0011
title: Identidade de um ID e a forma escrita dele são coisas diferentes
status: draft
owner: '@Danrley-Ruan-Saquetti'
trigger: >
    Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-28
relates-to: [RN-0003, RN-0024]
supersedes: null
superseded-by: null
---

# ADR-0011 — Identidade de um ID e a forma escrita dele são coisas diferentes

## Contexto

A spec §8 fixa uma sintaxe de citação — `<PREFIXO>-<número>` — e justifica:
"uma única forma, porque é ela que `CI-2` e `CI-3` reconhecem por `grep`". O
requisito real por trás disso é **uma forma por projeto**: é o `grep` que precisa
de determinismo, não o universo. A implementação codificou a forma do toolkit em
`src/docs/schema.ts` e `src/ids/citations.ts` e a tratou como universal.

Isso colide com duas exigências da mesma spec: o passo 1 da `SK-0` ("adotar o
que existe … **nunca** criar um paralelo") e o critério de aceite 1 ("nenhum
artefato preexistente foi duplicado ou sobrescrito"). Um repositório com 97
regras numeradas `RN001` não tem como ser adotado sem ser reescrito, e reescrever
é o que o critério proíbe.

## Alternativas consideradas

1. **Renumerar o consumidor.** Descartada, e é anti-requisito escrito: é
   sobrescrever preexistente, num diff de 97 regras que ninguém revisa.
2. **Aceitar as duas formas em todo lugar** (`RN009` e `RN-0009` sempre válidos).
   Descartada: mata o determinismo do `grep` que a spec §8 pede, e faz o próprio
   repositório aceitar duas grafias do mesmo item lado a lado.
3. **Uma tabela de apelidos por ID.** Descartada: configuração por item é o
   oposto de ponto de extensão único, e apodrece na primeira regra nova.
4. **Separar identidade de forma escrita.** Escolhida.

## Decisão

**A chave canônica é interna e invariável; a forma escrita é declarada pelo
projeto.**

- **Chave canônica** — `<PREFIXO>-<4 dígitos>`, produzida por `canonicalId`,
  **nunca exibida**. É o que compara, detecta duplicata, fecha par bidirecional e
  resolve citação. Nenhum check muda de lógica.
- **Forma escrita** — `id-format: { separator, padding }` em
  `docs/.ownership.yml`, com `separator: "-"` e `padding: 4` como padrão. É o que
  o parser reconhece ao ler e o que o toolkit imprime ao sugerir um ID novo.
- **A leitura aceita o padding declarado e um dígito a menos.** Com `padding: 4`
  são 3 ou 4 dígitos, que é exatamente o que o toolkit já fazia — `ADR-001` e
  `ADR-0001` são o mesmo item (`RN-0003`), e repadding nunca criou item novo.
- **Quem escreve ID é uma função só**: `writeId`. Nenhum check volta a montar um
  ID por concatenação — a mensagem de buraco de sequência do `CI-2` era o único
  vazamento e passa a chamá-la.
- **Adoção de formato não é silenciosa.** O inventário relata a forma detectada e
  quantos itens leu nela; declarar é ato de quem instala.

## Consequências

### O que se ganha

Um repositório real é adotado sem que nenhum arquivo dele seja tocado, que é o
critério 1 da spec original valendo para o mundo e não só para um repositório
vazio. E o formato deixa de estar escrito em cinco lugares: passa a existir uma
fonte e uma função que o imprime.

### O que se aceita perder

**Um projeto tem uma forma, não várias.** Um repositório que hoje mistura `RN001`
e `RN-0001` precisa escolher uma — e essa é a mesma exigência de determinismo que
a spec §8 sempre fez, agora aplicada ao projeto em vez de ao universo.

**A leitura fica um dígito mais larga do que a escrita.** `RN09` é lido como
`RN009` num projeto com `padding: 3`. É deliberado e é a regra que já existia:
identidade não depende de zeros à esquerda.

**Separador é vocabulário fechado** (`-`, `_`, `.`, `:` ou vazio). Separador
arbitrário viraria um padrão de expressão regular vindo de configuração, que é
uma superfície que este toolkit não quer.

