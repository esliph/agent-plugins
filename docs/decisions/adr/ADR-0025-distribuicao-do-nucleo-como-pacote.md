---
id: ADR-0025
title: 'Distribuição do núcleo como pacote em packages/: build só no prepack'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-18
relates-to: [ADR-0015, ADR-0012, RNF-0002, RF-0016]
supersedes: null
superseded-by: null
---

# ADR-0025 — Distribuição do núcleo como pacote em packages/: build só no prepack

## Contexto

`ADR-0015` decidiu "sem passo de build" para o toolkit inteiro, quando ele
era um pacote só executado sempre do próprio checkout. A extração cria
`packages/ownership`, publicado como dependência de `packages/living-docs`
e potencialmente de um terceiro plugin: `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`
(medido em 2026-09-17, Node v24.18.0) impede o Node de apagar tipos de `.ts`
sob `node_modules`, então um `@esliph/ownership` publicado como fonte
TypeScript não executa quando instalado como dependência de outro pacote.

Esta decisão cobre o §7 de
`docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md`, a spec
do núcleo de ownership.

## Alternativas consideradas

- **Publicar `dist/` versionado no repositório.** Descartada pelo mesmo
  motivo que `ADR-0001` já registrou: um `dist/` desatualizado faz o hook
  rodar código velho em silêncio — o medo que motivou a fuga do build step
  em primeiro lugar.
- **Compilar sempre, inclusive em desenvolvimento.** Descartada: reabriria a
  mesma classe de risco — código gerado que pode divergir do fonte enquanto
  alguém edita — exatamente no caminho que os hooks percorrem a cada
  commit.
- **Não publicar como pacote npm; manter tudo dentro de um plugin só.**
  Descartada: é o problema que a extração resolve — um segundo plugin de
  domínio (SDD) precisa do núcleo como dependência instalável, não como
  código copiado.

## Decisão

O repositório vira um monorepo-marketplace: um diretório por plugin em
`packages/`, cada um com `package.json` e lockfile próprios. `packages/ownership`
roda de duas formas pela mesma fonte — TypeScript direto por type-stripping
quando é o próprio plugin (não está sob `node_modules`), e `dist/*.js`
quando é biblioteca de um plugin de domínio (está sob `node_modules`).
`dist/` nunca existe no repositório: é gerado só no `prepack` e só existe
dentro do tarball publicado. Em desenvolvimento, uma condição `development`
no `exports` resolve para `src/index.ts` via symlink de workspace, então o
checkout nunca compila e nunca tem `dist` para envelhecer.

## Consequências

### O que se ganha

Um segundo plugin de domínio instala `@esliph/ownership` como dependência
normal do npm, com o mesmo runtime que já executa o toolkit hoje. Nenhuma
máquina de desenvolvimento compila nada, e o medo de `dist` desatualizado
registrado em `ADR-0001` não volta, porque nenhum `dist` chega a existir
fora do tarball.

### O que se aceita perder

**Supersede, em parte, `ADR-0015`.** "Sem passo de build" deixa de ser
afirmação sobre o toolkit inteiro e passa a valer só para o checkout — o
pacote publicado é compilado no `prepack`, e essa metade da decisão anterior
não sobrevive sem qualificação. `ADR-0015` continua registrado como está; é
esta decisão nova que qualifica a parte que muda, e o requisito que a
expressava (`RNF-0002`) é reescrito para a mesma qualificação.

**Reabre `ADR-0012`** (o estágio parametriza os checks do workflow; os
hooks entram como peça única). Um registro de plugin indivisível deixa de
valer para um repositório com dois plugins: cada um — núcleo e
living-docs — passa a ter o próprio `hooks.json`, e "os hooks são peça
única" vira "os hooks são peça única por plugin". Como os dois conjuntos de
hooks convivem fica para quando a extração de fato divide os arquivos.

**Obriga uma decisão nova sobre o nome do projeto.** `ADR-0014`
(`@esliph/living-docs`) descrevia um repositório de um pacote só; com
`packages/ownership` e `packages/living-docs` como pacotes distintos do
mesmo monorepo, o nome do repositório e o nome do primeiro pacote deixam de
ser a mesma pergunta, e essa decisão não é tomada aqui.

**Ganha uma lacuna de prova**, fechada só quando o teste de empacotamento
existir: um `exports` mal escrito ou um arquivo faltando em `files` só
apareceria no primeiro consumidor real, porque nenhum desenvolvedor
exercita a forma empacotada no dia a dia.
