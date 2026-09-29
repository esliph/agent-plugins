---
id: ADR-0022
title: 'Gatilho doc→doc: derives-from declarado por tipo no ownership e por instância no frontmatter'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-18
relates-to: [ADR-0019, RN-0036]
supersedes: null
superseded-by: null
---

# ADR-0022 — Gatilho doc→doc: derives-from declarado por tipo no ownership e por instância no frontmatter

## Contexto

O núcleo hoje só sabe vigiar código→doc (`watches`): um glob de caminho de
código aponta um documento dono, e editar o código sem o doc no mesmo commit
dispara aviso. Um plugin SDD precisa de um gatilho que a spec chama de
doc→doc: editar uma spec avisa sobre o plan que deriva dela, sem avisar
sobre todos os plans do diretório — o lembrete precisa ser preciso por
instância, não por diretório inteiro.

Esta decisão cobre o §4 de
`docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md`, a spec
do núcleo de ownership.

## Alternativas consideradas

- **Declarar a derivação só por tipo** (todo arquivo de
  `docs/…/plans/` deriva de `docs/…/specs/`). Descartada: grosseiro demais —
  editar qualquer spec avisaria sobre todos os plans do diretório, e o
  lembrete vira ruído em vez de apontar o documento certo.
- **Declarar a derivação só por instância**, sem tipo no arquivo de
  ownership. Descartada: o nome do campo que aponta a origem viraria
  convenção não validada — o mesmo problema que motivou `field-map` a
  existir — e um campo digitado errado no frontmatter sumiria em silêncio,
  sem o núcleo saber que deveria existir ali.

## Decisão

O gatilho doc→doc tem duas metades. O arquivo de ownership declara, por
tipo, que artefatos de um caminho derivam de artefatos de outro e por qual
campo do frontmatter (`derives-from: { source, field }`); cada instância
declara, no próprio frontmatter, de qual arquivo específico deriva. O tipo
dá alcance e validação — o campo existe, aponta para dentro de `source`, o
alvo existe —, e a instância dá o alvo exato que torna o lembrete preciso.

## Consequências

### O que se ganha

Editar uma spec avisa sobre o plan certo, não sobre o diretório inteiro. O
SDD ganha o mesmo mecanismo de lembrete que código→doc já tem, sem
reescrever a lógica de gatilho.

### O que se aceita perder

Toda instância que deriva de outro documento precisa declarar o campo no
próprio frontmatter — um documento sem a declaração simplesmente não é
vigiado, e nada avisa que ele deveria estar. `derives-from.source` fica
confinado à base do arquivo que o declara: apontar para fora da base é
erro, e um consumidor que quer derivação entre pacotes distintos do
monorepo não consegue declará-la num arquivo de ownership só.
