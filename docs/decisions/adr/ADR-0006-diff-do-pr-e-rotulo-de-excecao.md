---
id: ADR-0006
title: De onde CI-6 tira o diff, o que conta como rótulo de exceção, e onde ele roda
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-26
relates-to: [RF-0008, RN-0013]
supersedes: null
superseded-by: null
---

# ADR-0006 — De onde CI-6 tira o diff, o que conta como rótulo de exceção, e onde ele roda

## Contexto

A Fase 6 (spec §10) entrega `CI-6`: "diff toca `consumer-visible-paths` sem
entrada em `Unreleased` nem rótulo de exceção" (§9). É o primeiro check que não
se contenta com o estado da árvore — precisa saber **o que mudou** em relação a
alguma coisa. Três perguntas ficaram sem resposta escrita, e as três mudam a
engine:

1. **De onde vem o diff?** `git diff` contra o quê, e o que acontece fora de um
   CI, onde não existe "a base do PR".
2. **O que é o "rótulo de exceção"?** A spec §5 (`SK-7`, regra 2) o menciona
   como saída legítima e **não define o formato**. Sem formato, `CI-6` ou não
   tem escape — e então uma mudança interna em caminho público trava o PR — ou
   tem um escape que ninguém consegue acionar.
3. **Onde `CI-6` roda?** `validate` não recebe base nenhuma, e inventar uma
   seria adivinhar.

## Alternativas consideradas

### De onde vem o diff

**A árvore de trabalho (`git status`) ou o índice (`git diff --cached`).**
Descartada: é o que `HK-5` já faz, e no ponto certo — antes do commit. Um check
de CI que olha a árvore de trabalho olha uma árvore limpa e não vê nada.

**`git diff <base>..HEAD` (dois pontos).** Descartada: mostra a diferença entre
os dois estados, então tudo que entrou na base depois que a branch saiu aparece
como se a branch tivesse mudado. Um PR passa a ser cobrado por arquivo que ele
não tocou.

**`git diff <base>...HEAD` (três pontos), com a base recebida por argumento.
Escolhida.** Três pontos parte do *merge-base*: é exatamente "o que esta
branch mudou". A base vem de `--base <ref>` porque nenhum padrão é honesto —
`origin/main` não existe em todo repositório, e um padrão errado produz um
check que reprova o PR inteiro ou não reprova nada.

### O rótulo de exceção

**Label do PR (GitHub, GitLab).** Descartada: exige rede, e o toolkit não tem
rede em hook nenhum (`RNF-0001`); pior, exige um provedor específico, e o
toolkit não conhece provedor. Um label também **morre com o PR**: seis meses
depois ninguém sabe por que aquela mudança não teve entrada.

**Um arquivo de exceção versionado (`.changelog-skip`).** Descartada: um
arquivo que precisa ser criado e apagado a cada PR vira lixo esquecido na
árvore, e o esquecimento desliga o check em silêncio.

**Uma linha na mensagem de commit, no formato `Changelog: none — <razão>`.
Escolhida.** Está no controle de versão, viaja com a mudança para sempre, é
legível por `git log` sem rede nem provedor, e é a mesma forma de *trailer* que
o próprio repositório já usa para atribuição de commit. A razão é
**obrigatória**: um rótulo sem razão é uma caixinha marcada, e caixinha marcada
é o começo da wiki morta.

### Onde `CI-6` roda

**Dentro de `living-docs validate`, com `--base` opcional.** Descartada:
`validate` é a leitura da árvore e é chamado in-process pela suíte de testes;
uma flag que muda a natureza do comando faz o comando mentir sobre o que
verificou quando a flag não vem.

**Junto de `living-docs drift`.** Descartada: `drift` significa deriva de
contrato gerado (`ADR-0005`). Empurrar `CI-6` para lá obrigaria `drift` a
carregar um `--base` que ele não usa.

**Um subcomando próprio, `living-docs changelog --base <ref>`. Escolhida.**

## Decisão

1. **O diff vem de `git diff --name-only -z <base>...HEAD`**, três pontos, com
   `-c safe.directory=*` pelo mesmo motivo de `src/git/staged.ts`: o hook e o
   check rodam no container com uid diferente do dono do checkout montado
   (`ADR-0003`). `-z` porque caminho com acento sai escapado sem ele, e caminho
   escapado não casa com glob nenhum.
2. **As mensagens vêm de `git log --format=%B%x00 <base>..HEAD`**, dois pontos:
   aqui a pergunta é "quais commits esta branch acrescentou", e não "qual é a
   diferença de conteúdo".
3. **`src/git/diff.ts` não falha aberta.** Erro de git vira `GitError`, e quem
   chama decide. É o inverso de `src/git/staged.ts` de propósito: lá quem chama
   é um hook, e o custo de falhar fechado é travar o trabalho; aqui quem chama
   é um check, e o custo de falhar aberta é um contrato quebrado passando com a
   autoridade de um CI verde.
4. **O rótulo de exceção é `Changelog: none — <razão>`** em qualquer commit do
   intervalo. O separador aceito é travessão, hífen ou dois-pontos; a razão é
   obrigatória e não vazia. `Changelog: none` sozinho **não** conta, e a
   mensagem do check diz isso.
5. **O gatilho de `CI-6` é `consumer-visible-paths`** (spec §9). **O doc alvo
   vem de `watches`**, das regras marcadas `consumer-visible: true` — o toolkit
   não conhece o caminho `CHANGELOG.md` e não vai passar a conhecer (spec §3:
   "hooks e checks não conhecem caminho nenhum: leem daqui"). Declarar
   `consumer-visible-paths` sem nenhuma regra marcada é erro de configuração, e
   `CI-6` o reporta como achado em vez de ficar calado.
6. **A entrada precisa estar no mesmo diff.** Não basta `## [Unreleased]` estar
   preenchido: o doc alvo precisa estar entre os caminhos que mudaram **e** a
   seção precisa ter ao menos um item. Sem isso, a entrada que um PR anterior
   deixou lá satisfaria todos os PRs seguintes — é a mesma razão de `RN-0008`.
7. **`CI-6` roda em `living-docs changelog --base <ref>`.** Sem `--base`, o
   comando não adivinha: diz o que falta e sai com 2. `validate` imprime um
   ponteiro para o subcomando quando `consumer-visible-paths` não está vazio,
   pela mesma razão que já aponta `drift`.

## Consequências

### O que se ganha

- `CI-6` é uma função pura de (diff, configuração, arquivo) → achados: sem git
  dentro do check, testável com fatos de diff escritos à mão.
- O escape existe, está no histórico e carrega a razão. Quem auditar seis meses
  depois lê `git log` e sabe por que não houve entrada.
- `validate` continua sendo leitura, continua chamável in-process, e continua
  não executando nada.

### O que se aceita perder

- Quem roda o check precisa saber a base. Em CI isso é uma variável do
  provedor; localmente é `git merge-base` na mão. É o preço de não adivinhar.
- O `actions/checkout` precisa de `fetch-depth: 0` para que a base exista no
  clone. Um clone raso faz o comando sair com 2 em vez de mentir — é o
  comportamento certo, mas é uma pegadinha de instalação, e está escrito no
  workflow.
- `consumer-visible-paths` e as regras de `watches` marcadas
  `consumer-visible: true` são duas listas que precisam concordar. São dois
  momentos diferentes (o lembrete na edição e a barreira no PR) e um projeto
  pode legitimamente querer um sem o outro; neste repositório, um teste de
  dogfooding cobra a igualdade das duas em vez de deixá-las derivar.
