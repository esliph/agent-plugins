---
id: ADR-0014
title: Nome do projeto — @esliph/living-docs
status: accepted
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-01
relates-to: [RN-0010]
supersedes: null
superseded-by: null
---

# ADR-0014 — Nome do projeto — @esliph/living-docs

## Contexto

O nome `living-docs-toolkit` estava espalhado por cinco camadas que precisam
concordar entre si: `package.json` e `package-lock.json` (identidade do pacote),
`compose.yaml` (`container_name`), e o default de `LIVING_DOCS_CONTAINER` em
`bin/living-docs` e `plugin/hooks/run-hook.sh` — os wrappers só acham o container
que `docker compose up` subiu se os dois nomes baterem. A decisão de adotar o
escopo `@esliph` e o nome `living-docs` obriga a mexer nas cinco de uma vez;
metade renomeada é um estado quebrado, não um passo intermediário.

## Alternativas consideradas

- **Manter `living-docs-toolkit` e adicionar `@esliph/living-docs` como alias
  ou campo secundário.** Descartada: dois nomes para a mesma coisa é a
  ambiguidade que `RN-0010` combate — um `grep` pelo nome passaria a devolver
  dois, e nenhum seria "o" nome.
- **Renomear só o pacote npm e deixar container, wrappers e docs no nome
  antigo.** Descartada: o default dos wrappers tem de casar com o `container_name`
  do compose; deixar essa metade no nome velho faz `./bin/living-docs` procurar
  um container que não existe.
- **Usar `@esliph/living-docs` literalmente também como `container_name`.**
  Descartada: `@` e `/` não são caracteres válidos em nome de container Docker.
  `esliph-living-docs` é a forma mais próxima que o Docker aceita.
- **Renomear tudo, inclusive ADR-0001 e os planos em `docs/superpowers/plans/`.**
  Descartada: ADR-0001 é congelado por convenção (`trigger`: "Imutável após
  aceito") e os planos são registro datado. Reescrever o nome dentro deles
  falsearia o que estava escrito quando foram produzidos; a divergência ali é
  histórica e esperada.

## Decisão

O nome do projeto e do pacote passa a ser **`@esliph/living-docs`**. O
container Docker e o default de `LIVING_DOCS_CONTAINER` passam a ser
**`esliph-living-docs`**. O comando de CLI continua `living-docs` (arquivo
`bin/living-docs` e a chave `bin` do `package.json` intactos). Artefato congelado
(ADR-0001) e registro histórico (planos) mantêm o nome antigo.

## Consequências

### O que se ganha

Um nome só, no escopo `@esliph`, resolvido de um único ponto em cada camada. O
comando `living-docs` não muda, então nada quebra para quem já o invoca ou para
o workflow de CI instalado, que não menciona Docker.

### O que se aceita perder

A identidade do repositório fica presa ao escopo `@esliph`: trocar de escopo de
novo repete este trabalho nas mesmas cinco camadas. ADR-0001 e os planos passam a
citar um nome (`living-docs-toolkit`) que não existe mais em nenhum lugar
executável — quem lê esses documentos precisa saber que ele corresponde a
`esliph-living-docs` no container. E `package-lock.json` teve o campo `name`
editado à mão; o próximo `npm install` dentro do container reescreve o arquivo, e
é ele a fonte de verdade do lock.
