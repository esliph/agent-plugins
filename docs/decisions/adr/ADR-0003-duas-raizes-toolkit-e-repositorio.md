---
id: ADR-0003
title: Raiz do toolkit e raiz do repositório validado são distintas
status: accepted
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-24
relates-to: [DA-0001, ADR-0002]
supersedes: null
superseded-by: null
---

# ADR-0003 — Raiz do toolkit e raiz do repositório validado são distintas

## Contexto

As Fases 0–1 fixaram `LIVING_DOCS_ROOT=/app` como raiz única: o mesmo caminho
serve para achar `docs/.ownership.yml` e para executar `src/hooks/*.ts`. Isso
funciona porque este repositório valida a si mesmo, e não funciona para mais
nada — um projeto consumidor não tem `src/hooks/` dentro dele. `DA-0001`
registrou a lacuna.

A engine já está pronta para a separação: `runInit`, `runValidate` e
`decideHk1/3` recebem a raiz do repositório como argumento, e `init.ts` resolve
`templates/` por `import.meta.dirname`. O que confunde as duas coisas são os
defaults `?? '/app'`, o `compose.yaml` de um volume só e os dois wrappers bash.

## Alternativas consideradas

**Uma raiz, com o toolkit copiado para dentro do projeto consumidor.** Descartada:
transforma toda atualização do toolkit em um merge manual no repositório de quem
o usa, e produz N cópias divergentes da engine — a mesma doença que o toolkit
existe para combater, aplicada a ele mesmo.

**Uma raiz, com o toolkit publicado em npm e instalado como dependência.**
Descartada nesta fase: contradiz `ADR-0001` ("nada roda no host além de Docker"),
já que `npm install` no projeto consumidor exige toolchain no host. Continua
sendo o caminho natural quando `ADR-0001` for supersedido.

**`LIVING_DOCS_ROOT` mantida como alias de `LIVING_DOCS_REPO_ROOT`.** Descartada:
o nome ambíguo é a causa do problema. Um alias que resolve para "a raiz certa na
maior parte dos casos" reintroduz a confusão exatamente onde ela é mais cara —
um hook lendo o `.ownership.yml` do toolkit em vez do `.ownership.yml` do
projeto validado bloqueia ou libera edição pela regra errada, em silêncio.

## Decisão

O toolkit passa a conhecer **duas** raízes independentes: a sua própria, derivada
de `import.meta.dirname` (`toolkitRoot()`), e a do repositório validado, vinda de
`LIVING_DOCS_REPO_ROOT` ou do diretório de trabalho (`repoRoot()`). No container,
a fonte do toolkit mora em `/opt/living-docs` e o repositório validado é montado
em `/workspace`. `LIVING_DOCS_ROOT` é removida.

## Consequências

### O que se ganha

- O toolkit é instalável em qualquer projeto: `LIVING_DOCS_TARGET=/caminho/do/projeto docker compose up -d`.
- A separação é exercitada em todo teste do próprio repositório, porque o
  dogfooding monta o mesmo checkout nos dois caminhos — em vez de ficar acordada
  no papel e quebrar no primeiro consumidor.
- Hooks e CLI param de embutir caminho absoluto; a única fonte de caminho é
  `src/core/roots.ts`.

### O que se aceita perder

- **Quebra de compatibilidade.** `LIVING_DOCS_ROOT` deixa de ser lida. Quem
  tiver script apontando para ela precisa renomear. É barato agora (versão
  `0.1.0`, um único consumidor: este repositório) e caro depois.
- **Um volume a mais no `compose.yaml`** e um caminho a mais para explicar no
  README. O custo de leitura sobe um pouco para todo mundo, inclusive para quem
  só faz dogfooding e nunca vai instalar o toolkit em outro lugar.
- **A distribuição continua sendo o checkout do repositório**, não um pacote
  versionado. Um consumidor ainda precisa clonar este repositório e apontar o
  `LIVING_DOCS_TARGET`. Publicar imagem ou pacote é decisão futura, e este ADR
  não a toma.
