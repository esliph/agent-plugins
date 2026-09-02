---
id: ADR-0001
title: Runtime em container Docker, TypeScript sem build step
status: superseded
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-24
relates-to: [RNF-0002, RNF-0003]
supersedes: null
superseded-by: ADR-0015
---

# ADR-0001 — Runtime em container Docker, TypeScript sem build step

## Contexto

O host de desenvolvimento não tem Node instalado e não deve passar a ter: a
premissa do projeto é que nada além de Docker seja exigido de quem clona o
repositório. Ao mesmo tempo, os hooks rodam a cada `Edit`/`Write` do agente e
têm teto de 5 s (docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7), o que descarta qualquer
solução que crie um container por invocação.

## Alternativas consideradas

- **`docker compose run --rm` por invocação** — descartada: paga a criação de um
  container a cada hook, e o custo cresce com o tamanho da imagem.
- **TypeScript compilado para `dist/`** — descartada: exige build antes de
  qualquer execução, e um `dist/` desatualizado faz o hook rodar código velho
  silenciosamente. O erro seria invisível justamente no componente que não pode
  falhar de forma invisível.
- **JavaScript puro com JSDoc** — descartada: as interfaces entre os módulos
  (`Finding`, `ArtifactRule`, `HookDecision`) são o contrato que mantém CLI e
  hooks sincronizados; verificá-lo por comentário é mais frágil.

## Decisão

Um container long-running (`living-docs-toolkit`) com o repositório montado em
`/app`; wrappers bash finos (`bin/living-docs`, `plugin/hooks/run-hook.sh`)
fazem `docker exec` para dentro dele. O código é TypeScript executado
diretamente pelo type-stripping nativo do Node 24, com `tsc --noEmit` como
type-checker. Medido: `docker exec` responde em ~160 ms.

## Consequências

### O que se ganha

Zero toolchain no host; nenhum passo de build entre editar e executar; nenhuma
possibilidade de artefato compilado divergir da fonte.

### O que se aceita perder

O container precisa estar de pé — quando não está, o CLI sai com código 2 e os
hooks falham abertos, o que significa que **o enforcement do agente desaparece
silenciosamente enquanto o container estiver parado**. É uma perda real, mitigada
apenas pelo CI, que roda o mesmo código sem depender do estado da máquina de
ninguém. Além disso, ficamos restritos à sintaxe TypeScript apagável: sem `enum`,
sem `namespace`, sem decorators.
