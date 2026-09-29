---
id: TDR-0003
title: '@esliph/ownership como file:../ownership quebra a instalação remota do living-docs'
status: open
owner: '@esliph/engineering'
trigger: >
  Quando o gatilho de pagamento abaixo se cumprir.
last-reviewed: 2026-09-28
relates-to: [ADR-0025, ADR-0029, RNF-0002]
# Aspas simples: em YAML, aspas simples não processam `\`, e o padrão é regex.
pay-when:
  pattern: '"@esliph/ownership":\s*"[\^~]?\d'
  paths:
    - packages/living-docs/package.json
---

# TDR-0003 — @esliph/ownership como file:../ownership quebra a instalação remota do living-docs

## O atalho

O living-docs declara `@esliph/ownership` como `file:../ownership` e o resolve
pelo código-fonte, com a condição `development`. No checkout isso funciona sem
`dist/`, e é isso que impede código velho de rodar em silêncio. Fora do checkout
não funciona: no cache do marketplace o `../ownership` não existe, o `npm ci` do
living-docs falha e, sem `node_modules`, todo hook dele falha aberto. O padrão de
`--invoke-ownership` (`npx ownership`) também não funciona fora deste
repositório.

## Por que foi aceito

O núcleo ainda não está publicado no npm, e publicá-lo é outra entrega, com
decisão própria sobre nome, versão e canal. Hoje só o autor usa o plugin, e
todos os consumidores estão no checkout. Esperar a publicação para adotar o
núcleo travaria a remoção das regras duplicadas por um passo que não depende
delas.

## Gatilho de pagamento

`@esliph/ownership` publicado no npm. Sinal observável: a dependência em
`packages/living-docs/package.json` deixa de ser `file:` e passa a ser uma faixa
semver do registro. Nesse momento, a dependência vira essa faixa, o
`plugin-cache.test.ts` do living-docs volta a exigir que o hook responda do
cache, e o padrão de `--invoke-ownership` passa a funcionar fora daqui.

## Custo de continuar devendo

A instalação remota do living-docs fica quebrada, e quem a tentar não recebe
nenhum hook, sem aviso: o hook falha aberto e se cala. Enquanto o `todo` do
`plugin-cache.test.ts` estiver ali, nenhum teste prova que o plugin funciona
instalado, só que ele se cala quando não funciona.
