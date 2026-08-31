---
id: ADR-0012
title: O estágio parametriza os checks do workflow; os hooks entram como peça única
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-28
relates-to: [RF-0013, RN-0025]
supersedes: null
superseded-by: null
---

# ADR-0012 — O estágio parametriza os checks do workflow; os hooks entram como peça única

## Contexto

A `SK-0` declara como sua "a instalação de `HK-*` e `CI-*`" e o passo 4 manda
instalar **na ordem das fases**. A regra que sai disso é "o conjunto de
enforcement instalado é o das fases do estágio, nem mais nem menos".

Os `CI-*` cabem nessa regra: cada um é um passo do workflow, e um passo se
inclui ou não se inclui. Os `HK-*` não cabem: eles chegam ao consumidor por um
plugin, e um plugin registra o `hooks.json` inteiro. Não existe "meio plugin".

## Alternativas consideradas

1. **Um plugin por fase.** Descartada: sete plugins para sete hooks multiplica o
   caminho de instalação por sete e transforma "instalar o toolkit" num
   procedimento. O anti-requisito de duplicata vale para peça de instalação
   também.
2. **Reescrever o `hooks.json` do plugin no momento do `init`.** Descartada: o
   `init` passaria a editar um arquivo do **toolkit** para configurar o
   **consumidor**, que é exatamente a confusão de raízes que `ADR-0003` fechou.
3. **Registrar os hooks um a um no `.claude/settings.json` do consumidor.**
   Descartada: duplica o `hooks.json` do plugin num segundo lugar, e as duas
   cópias divergem no primeiro hook novo.
4. **Estagiar os checks e aceitar os hooks como peça única.** Escolhida.

## Decisão

**O estágio parametriza o workflow de CI. O registro do plugin é indivisível.**

- `solo` e `small-team` instalam o passo `validate`.
- `production` acrescenta `drift` (`CI-5`) e `changelog --base` (`CI-6`).
- `multi-team` acrescenta `validate --base` — a metade de `CI-7` que lê o diff, e
  `CI-9`.
- O registro do plugin liga os hooks **todos**, em qualquer estágio. O que
  estagia um hook não é o instalador: é a configuração que ele lê. `HK-2` sem
  `generated[]`, `HK-4` e `HK-5` sem `watches`, `HK-8` sem decisão aberta com
  caminho reivindicado — todos ficam em silêncio.
- `HK-6` e `HK-7` falam em qualquer estágio, e isso é aceito: os dois devolvem
  `additionalContext` e nenhum dos dois bloqueia nada.

## Consequências

### O que se ganha

`--stage multi-team` passa a existir com conteúdo — enforcement é arquivo, e a
partir daqui um estágio instala enforcement. A `SK-0` deixa de mandar escolher um
valor que o CLI rejeita.

### O que se aceita perder

**Um projeto `solo` recebe sete hooks e usa dois.** O custo é zero enquanto o
silêncio for real, e é por isso que o silêncio é testado: cada hook tem teste que
prova que ele se cala sem a configuração dele. No dia em que um hook falar sem
configuração, esta decisão é que está errada — não o teste.
