---
id: ADR-0030
title: 'Hooks do núcleo no plugin ownership: o living-docs depende dele e deixa de registrá-los'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-28
relates-to: [ADR-0012, ADR-0019, ADR-0026, ADR-0029]
supersedes: null
superseded-by: null
---

# ADR-0030 — Hooks do núcleo no plugin ownership: o living-docs depende dele e deixa de registrá-los

## Contexto

`ADR-0019` traçou a fronteira do núcleo: as regras de propriedade, deriva de
gerado, vigilância e cobertura do repositório são dele. O núcleo já implementa
os hooks e os checks correspondentes, e o living-docs ainda tem versões próprias
de três guardas: o de artefato gerado, o lembrete de arquivo vigiado e a guarda
de commit. Com os dois plugins instalados, o mesmo evento seria respondido duas
vezes.

`ADR-0012` decidiu que o estágio parametriza o workflow e que o registro do
plugin de hooks é indivisível. Ele foi escrito com um único plugin, e três de
suas frases deixam de ser verdade: `drift` e `changelog --base` não são mais
comandos do living-docs, e `validate --base` não cobra mais o doc dono do caminho
vigiado. Ele está em `draft` e não é editado aqui.

A adoção deixa dois pontos que nenhuma decisão anterior cobre: o que o `init`
faz num repositório consumidor, e o efeito de o núcleo rodar as suas regras em
todo estágio.

## Alternativas consideradas

- **Manter os três hooks nos dois plugins.** Descartada: o mesmo evento
  responderia duas vezes, com texto diferente, e a divergência entre as cópias
  seria inevitável. Contradiz a regra de que cada regra roda uma vez, num plugin
  só.
- **O living-docs embute o núcleo e registra os hooks dele.** Descartada: o
  consumidor que só quer ownership teria de instalar o living-docs, e os dois
  plugins deixariam de ser separáveis.
- **Um plugin único com tudo.** Descartada: desfaz `ADR-0019`.
- **Apagar os hooks do living-docs antes de o `ownership` ser instalável.**
  Descartada: o repositório ficaria um commit sem os guardas.

## Decisão

O `plugin.json` do living-docs declara `dependencies: ["ownership"]`, e o
`hooks.json` dele deixa de registrar os três hooks que o núcleo assume. Os
hooks saem no mesmo commit em que o plugin `ownership` passa a ser instalável a
partir do marketplace, para que o repositório não fique um commit sem os guardas.
Os hooks que ficam no living-docs são os de vocabulário próprio dele.

O estágio deixa de parametrizar as regras que foram para o núcleo:
`ownership validate` roda as quatro regras de árvore em todo estágio, e
`--base` roda as duas de diff juntas. No estágio `production`, isso liga a regra
de vigilância satisfeita, que antes só o `multi-team` ligava. O `init` de um
repositório consumidor semeia `ignore:` com `node_modules` e relata, em "não
instalado", que o resto do repositório precisa ser declarado em `owned`, porque a
regra de cobertura exige dono para todo arquivo e nenhum `init` sabe onde mora o
código de quem instala. Um `ownership validate` recém instalado reprova até que
isso seja feito.

## Consequências

### O que se ganha

Cada evento tem um responsável só, e os dois plugins podem evoluir sem se
copiar. O consumidor que só quer ownership instala só ele.

### O que se aceita perder

**Instalar o living-docs passa a exigir o `ownership`**, e o repositório fica sem
os guardas se a dependência não resolver. O estágio `production` fica mais
rígido do que era, e o primeiro `ownership validate` de um consumidor sempre
reprova, de propósito, até ele declarar o código. `ADR-0012` continua dizendo o
que dizia sobre estágio e sobre `drift`; quem o aceitar ou superseder precisa
tratar essas frases, e isso fica à pessoa que decide.
