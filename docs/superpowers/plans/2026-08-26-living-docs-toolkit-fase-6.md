# Fase 6 do toolkit de documentação viva — rastro histórico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `SK-7` release-historian, `CM-7` (`/release`), `CI-6`
(changelog required) e `HK-7` (atalho novo sem TDR) — a Fase 6 da spec (§10),
que enche a lista `notInstalled` do estágio `production` e dá ao repositório o
primeiro artefato voltado ao **consumidor**, não ao time.

**Architecture:** Duas peças de engine novas, ambas pequenas.
`src/git/diff.ts` é o primeiro módulo que lê o **diff** em vez do estado da
árvore: `changedPaths` e `commitMessages`, com runner injetável no molde de
`src/exec/command.ts` e **sem** falha aberta — o contrato invertido em relação
a `src/git/staged.ts`, porque quem chama aqui é um check que precisa aparecer,
não um hook cujo custo de falhar fechado é travar o agente.
`src/checks/ci6-changelog-required.ts` é uma função pura de (diff, config,
arquivo) → achados: o gatilho vem de `consumer-visible-paths`, o doc alvo vem
da regra de `watches` marcada `consumer-visible: true`, e a saída de escape é
um rótulo com razão na mensagem de commit. `CI-6` roda num subcomando próprio,
`living-docs changelog --base <ref>`, pela mesma razão que `CI-5` roda em
`drift` (`ADR-0005`): é o único check que precisa de um estado que `validate`
não tem — a base do diff. `src/hooks/hk7-shortcut-debt.ts` é o sexto hook e o
primeiro que **não** lê o `.ownership.yml`: marcador de atalho é sintaxe, não
configuração.

O dogfooding é real: este repositório passa a ter `CHANGELOG.md`,
`docs/deprecations.md`, `docs/releases/` e `docs/migrations/`, e passa a
declarar `consumer-visible-paths` — sem isso `CI-6` seria um check instalado
que nunca dispara, que é a wiki morta na forma de código.

**Tech Stack:** TypeScript (Node ≥ 24, executado só em container —
`RNF-0002`), `node:test`, `node:child_process` (`execFileSync`), `picomatch`,
Claude Code plugin (`SKILL.md`, `hooks.json`).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §3 (layout de `docs/releases/`,
`docs/migrations/`, `consumer-visible-paths`), §4 (ciclo de vida da entrada de
CHANGELOG), §5 (`SK-7`), §7 (`HK-1` congelando release note publicada, `HK-7`),
§9 (`CI-6`), §10 (Fase 6, `CM-7`), §13 (anti-requisitos) —
`docs/superpowers/plans/BACKLOG-fases-3-7.md` (seção "Fase 6") traz o
levantamento que este plano resolve.

## Global Constraints

- Nada roda no host além de Docker — todo comando via
  `docker compose exec toolkit …` ou `./bin/living-docs` (`RNF-0002`).
- Identificadores, nomes de arquivo e IDs em inglês/neutro; prosa em português
  (spec §11).
- ID nunca reciclado — confira `docs/ids-retired.txt` antes de tomar um número
  novo (spec §2). Os números livres nesta fase: `ADR-0006`, `RF-0008`,
  `RF-0009`, `RN-0013`, `RN-0014`, `RN-0015`. O prefixo `REL` é novo e nasce
  sem nenhum item.
- Toda seção de requisito nasce `status: draft`; todo ADR novo nasce
  `status: draft`. Promover é ato humano (`RN-0005`) — `HK-3` intercepta, e a
  resposta não é sua.
- Mensagem de commit cita o ID afetado, formato `tipo(ID): assunto`
  (`CONTRIBUTING.md`).
- Hook falha aberta em até 5 s, sem rede (`RNF-0001`). `CI-6` **não** falha
  aberta, pela mesma razão que `CI-5` não falha: check é o enforcement que
  sobrevive a agente ausente.
- `CHANGELOG.md` e `docs/deprecations.md` **não** entram em `artifacts:` no
  `.ownership.yml` — mesma categoria de `CONTRIBUTING.md`, da DoD, do glossary,
  do charter e dos contratos escritos (`ADR-0004`). `docs/releases/` **entra**,
  com o prefixo `REL`, e a razão está na Task 6. `DA-0002` continua aberta;
  nenhuma task deste plano a resolve.
- O `init` **não inventa `consumer-visible-paths`**, pela mesma razão que não
  inventa `watches` nem `generated[]` (`RF-0004`): moldura vazia com exemplo
  comentado, e o projeto preenche.
- `CHANGELOG.md` **não tem frontmatter.** É o único artefato desta fase escrito
  para quem consome o software, não para quem o mantém; frontmatter de
  documentação viva ali é ruído para o leitor de fora. `docs/deprecations.md`,
  que é interno, tem.
- Gerador continua determinístico (`ADR-0005`): a Task 4 acrescenta uma linha ao
  `CHECK_CATALOG` e **regera** `docs/contracts/checks.gen.md`; não edite o
  arquivo gerado.

### O que este plano decide diferente do backlog, e por quê

O backlog anotou, na seção da Fase 6: _"o rótulo de exceção que a spec §5
(`SK-7`, regra 2) menciona sem definir o formato — isso é uma `DA` a abrir"_.

Este plano **não abre uma `DA`** para isso. Uma `DA` existe para registrar que
ninguém sabe a regra e que **a implementação para** (`CLAUDE.md`, política).
Aqui a regra é decidível com o que já está escrito: o toolkit não tem rede
(`RNF-0001`), então rótulo de PR está fora; o rótulo precisa sobreviver ao
merge, então precisa estar no controle de versão. Isso deixa uma alternativa
viável e duas descartáveis, que é exatamente a forma de um ADR — e um `DA`
aberto e fechado no mesmo commit é cerimônia, não rastro. `ADR-0006` (Task 1)
decide, com as alternativas registradas.

`DA-0002` — a que a Fase 3 abriu — continua aberta e continua sendo
pré-condição de `CI-7` (Fase 7). Este plano não a toca.

### `HK-5` vai perguntar — leia antes de commitar qualquer task

`docs/.ownership.yml` tem `watches` preenchido desde a Fase 3. Estas entradas
atingem os commits deste plano:

| Caminho vigiado         | Doc dono exigido no mesmo commit  | Tasks afetadas |
| ----------------------- | --------------------------------- | -------------- |
| `src/checks/**`         | `docs/requirements/rules.md`      | 3, 4           |
| `src/checks/catalog.ts` | `docs/contracts/checks.gen.md`    | 4              |
| `src/hooks/**`          | `docs/requirements/rules.md`      | 5              |
| `src/cli/**`            | `docs/requirements/functional.md` | 4, 6           |
| `plugin/skills/**`      | `CONTRIBUTING.md`                 | 8              |

`HK-5` **pergunta** (`ask`), nunca nega (`RN-0009`). Nas Tasks 3, 4, 5 e 6 a
resposta é a mesma: o doc dono viajou na Task 1, com a regra que aquele código
implementa — é a ordem que `CONTRIBUTING.md` §"O ciclo" exige. Na Task 4 há uma
segunda pendência, `docs/contracts/checks.gen.md`, e essa **viaja no commit**:
regere e adicione ao `git add`. Na Task 8, `CONTRIBUTING.md` ganha uma linha e
vai junto.

**A partir da Task 7** entra uma entrada nova de `watches` apontando
`CHANGELOG.md`, marcada `consumer-visible: true`. Daí em diante, todo commit que
toca `src/cli/**`, `src/checks/catalog.ts`, `src/config/ownership.ts`,
`plugin/**`, `templates/**` ou `bin/living-docs` tem `CHANGELOG.md` como doc
dono pendente — e a resposta certa é acrescentar a linha de `## [Unreleased]`,
não dispensar a pergunta. As Tasks 8 e 9 dizem qual linha.

### `HK-2` vai negar — e é assim que se sabe que ele funciona

`docs/contracts/checks.gen.md` está declarado em `generated[]` desde a Fase 5.
**Não use `Edit` nem `Write` nesse arquivo em nenhum momento.** Quando a Task 4
acrescentar `CI-6` ao catálogo, o caminho é regerar:

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
```

O redirecionamento acontece **dentro** do container de propósito: o shell do
host reescreveria o encoding do arquivo no Windows, e um CR a mais viraria
deriva de contrato.

---

## Cobertura da spec

| Peça                                                                     | Task |
| ------------------------------------------------------------------------ | ---- |
| `ADR-0006` — de onde vem o diff, o rótulo de exceção, onde `CI-6` roda   | 1    |
| `RF-0008`, `RF-0009`, `RN-0013`, `RN-0014`, `RN-0015`                    | 1    |
| `src/git/diff.ts` — `changedPaths`, `commitMessages`, `GitError`         | 2    |
| `CI-6` (changelog required)                                              | 3    |
| `living-docs changelog --base <ref>` + ponteiro em `validate` + catálogo | 4    |
| `HK-7` (`PostToolUse`/`Edit\|Write`, `additionalContext`)                | 5    |
| `REL` no ciclo de vida + templates + `init --stage production`           | 6    |
| Dogfooding: `CHANGELOG.md`, `consumer-visible-paths`, depreciações       | 7    |
| `SK-7` release-historian + `CM-7` `/release`                             | 8    |
| Índices, contrato público e prova de ponta a ponta                       | 9    |
| Promoção humana                                                          | 10   |

**Nenhum critério de aceite numerado da spec §12 fecha nesta fase.** Os que
restam são o 7 (`CI-4`, TDR com gatilho vencido) e o 8 (`HK-6`, inventário no
`SessionStart`), ambos da Fase 7. O que a Fase 6 tem de mais próximo é o
critério **10** — "nenhuma peça produz documento que narre código, nem métrica
de volume documental" —, e ele fica mais fácil de violar aqui do que em
qualquer fase anterior: um CHANGELOG escrito a partir do `git log` é
exatamente o documento que narra o código. `RN-0013` e a `SK-7` existem para
isso, e a Task 9 planta o teste que cobra.

---

### Task 1: A regra antes do código — `ADR-0006`, `RF-0008`, `RF-0009`, `RN-0013`, `RN-0014`, `RN-0015`

**Objetivo:** Antes de qualquer código, registrar a decisão que o backlog
deixou em aberto (de onde vem o diff, qual é o rótulo de exceção, onde `CI-6`
roda) e os cinco requisitos que o resto do plano implementa — em `draft`, para
promoção humana na Task 10.

**Files:**

- Create: `docs/decisions/adr/ADR-0006-diff-do-pr-e-rotulo-de-excecao.md`
- Modify: `docs/requirements/functional.md` (`RF-0008`, `RF-0009`)
- Modify: `docs/requirements/rules.md` (`RN-0013`, `RN-0014`, `RN-0015`)

**Interfaces:**

- Produz: os IDs `ADR-0006`, `RF-0008`, `RF-0009`, `RN-0013`, `RN-0014`,
  `RN-0015`, citados pelo código e pelos testes das Tasks 2–9.

**Requisitos:**

- Os seis nascem em estado inicial da máquina (`draft`) — a promoção é a
  Task 10, e é humana (`RN-0005`).
- `ADR-0006` não resolve `DA-0002` e não a menciona como resolvida.
- `relates-to` de `ADR-0006` já nasce preenchido: `accepted` congela o arquivo,
  e `relates-to` não está na `mutable-fields` — um ADR aceito com
  `relates-to: []` só se conserta supersedindo.

- [ ] **Step 1: Escrever `ADR-0006` em `draft`**

Crie `docs/decisions/adr/ADR-0006-diff-do-pr-e-rotulo-de-excecao.md`:

```markdown
---
id: ADR-0006
title: De onde CI-6 tira o diff, o que conta como rótulo de exceção, e onde ele roda
status: draft
owner: '@Danrley-Ruan-Saquetti'
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
Escolhida.** Três pontos parte do _merge-base_: é exatamente "o que esta
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
legível por `git log` sem rede nem provedor, e é a mesma forma de _trailer_ que
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
```

- [ ] **Step 2: Acrescentar `RF-0008` e `RF-0009` em `draft`**

No final de `docs/requirements/functional.md`, depois de `RF-0007`:

```markdown
## RF-0008 — `living-docs changelog --base <ref>` cobra a entrada de CHANGELOG

- **status:** draft
- **relates-to:** ADR-0006
- **fora de escopo:** escrever a entrada — o comando cobra, nunca redige

`living-docs changelog --base <ref>` compara `<ref>...HEAD`, e falha com código
1 quando algum caminho alterado casa com `consumer-visible-paths` e o mesmo
diff não traz o doc marcado `consumer-visible: true` em `watches` com ao menos
um item sob `## [Unreleased]`, nem o rótulo de exceção com razão em alguma
mensagem de commit do intervalo.

Sem `consumer-visible-paths` declarado, ele diz isso e sai com 0. Sem `--base`,
sai com 2 — a base do diff não se adivinha. `living-docs validate` não faz essa
comparação; quando há `consumer-visible-paths` declarado, ele aponta o
subcomando que a faz.

## RF-0009 — `init --stage production` instala a moldura de rastro histórico

- **status:** draft
- **relates-to:** RF-0007
- **fora de escopo:** declarar `consumer-visible-paths`, que nasce vazio com
  exemplo comentado pela mesma razão que `watches` e `generated[]` nascem
  vazios (`RF-0004`)

No estágio `production`, `living-docs init` cria, além de tudo que já criava,
`CHANGELOG.md`, `docs/deprecations.md`, `docs/releases/` e `docs/migrations/` a
partir dos templates, e declara o artefato `REL` em `artifacts:` — com a mesma
idempotência e a mesma política de adoção dos demais artefatos.

A lista do que o estágio pede e não instala fica vazia: `production` cobre as
Fases 5 e 6 da spec §10, e as duas existem.
```

- [ ] **Step 3: Acrescentar `RN-0013`, `RN-0014` e `RN-0015` em `draft`**

No final de `docs/requirements/rules.md`, depois de `RN-0012`:

```markdown
## RN-0013 — Mudança visível ao consumidor viaja com a entrada de CHANGELOG

- **status:** draft
- **relates-to:** ADR-0006
- **fora de escopo:** o formato da entrada, que é Keep a Changelog e mora no
  template, não nesta regra

Uma mudança que toca caminho declarado em `consumer-visible-paths` leva, no
mesmo diff, a entrada em `## [Unreleased]` do doc marcado
`consumer-visible: true` — ou uma razão escrita, no formato
`Changelog: none — <razão>`, em alguma mensagem de commit do intervalo. Rótulo
sem razão não é exceção: é a caixinha marcada.

A entrada é voltada a quem consome o software. Teste único: se ela só faz
sentido para quem escreveu o código, ela não pertence ao CHANGELOG — e um
CHANGELOG derivado do `git log` é o documento que narra o código, que a spec
§13 recusa.

## RN-0014 — Atalho consciente vira dívida registrada, e o lembrete nunca bloqueia

- **status:** draft
- **relates-to:** RN-0013
- **fora de escopo:** arquivos Markdown, onde `TODO` e `FIXME` são prosa sobre
  o marcador e não o marcador

Marcador de atalho novo — `TODO`, `FIXME`, `HACK`, `XXX`, supressão de tipo ou
de lint, teste ignorado — sem um `TDR-nnnn` a até duas linhas de distância
gera lembrete, com o caminho para registrar a dívida. Nunca bloqueio: um atalho
legítimo existe, e um hook que o proíbe ensina a escondê-lo com outro nome.

O que se cobra é o registro do atalho com gatilho de pagamento observável, não
a ausência do atalho.

## RN-0015 — Depreciação sem as quatro coisas não é depreciação

- **status:** draft
- **relates-to:** RN-0013
- **fora de escopo:** o prazo entre anúncio e remoção, que é política de
  versionamento do projeto e mora em `docs/contracts/versioning-policy.md`

Uma entrada de depreciação registra quatro coisas: a data do anúncio, a versão
ou data de remoção, o substituto, e o link para o guia de migração. Faltando
qualquer uma, não é depreciação — é quebra de compatibilidade anunciada, e
passa por ADR.

Anunciar remoção sem lugar para o guia de migração é a depreciação que ninguém
consegue seguir.
```

- [ ] **Step 4: Rodar validate e confirmar que o `draft` passa limpo**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Esperado: PASS e `exit=0`. É o `draft` que compra isso: os cinco requisitos
ainda não são `active`, então a regra 7 de `CI-3` (cobertura por citação) não os
cobra, e nenhum teste os menciona até as Tasks 2–9. `ADR-0006` passa porque a
regra 6 (`accepted` sem `relates-to`) só olha item aceito.

`CI-2` **é** exercitado, e é o que importa checar: `ADR-0006` fecha a sequência
do prefixo `ADR` (0001–0006), `RF-0008`/`RF-0009` fecham a de `RF`,
`RN-0013`–`RN-0015` a de `RN`; e as citações a `RF-0008`, `RN-0013` e
`ADR-0006` precisam resolver. Menções como `CI-6`, `HK-7` ou `SK-7` são
ignoradas: o padrão de citação exige 3 ou 4 dígitos (`src/ids/citations.ts`).

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0006-diff-do-pr-e-rotulo-de-excecao.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0006, RF-0008, RF-0009, RN-0013, RN-0014, RN-0015): a regra antes do código da Fase 6"
```

---

### Task 2: `src/git/diff.ts` — o primeiro módulo que lê o diff

**Objetivo:** Um leitor de diff injetável, com o contrato **invertido** em
relação a `src/git/staged.ts`: erro sobe, não vira lista vazia.

**Files:**

- Create: `src/git/diff.ts`
- Test: `test/git/diff.test.ts`

**Interfaces:**

- Consome: `GitRunner` de `src/git/staged.ts` — o mesmo tipo, duas políticas.
  `export type GitRunner = (args: readonly string[], cwd: string) => string`.
- Produz:
    - `changedPaths(root: string, base: string, run?: GitRunner): string[]`
    - `commitMessages(root: string, base: string, run?: GitRunner): string[]`
    - `class GitError extends Error`
    - `const TIMEOUT_MS: number`
    - `const runGitDiff: GitRunner`

**Requisitos:**

- `changedPaths` usa **três pontos** (`<base>...HEAD`); `commitMessages` usa
  **dois** (`<base>..HEAD`). `ADR-0006`, decisões 1 e 2.
- `-c safe.directory=*` nos dois, e `-z` no diff.
- Nenhum `catch` que devolva vazio. Erro vira `GitError` com a primeira linha
  útil do `stderr`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/git/diff.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changedPaths, commitMessages, GitError } from '../../src/git/diff.ts'

const NUL = String.fromCharCode(0)

/** Runner falso: grava os argumentos recebidos e devolve a saída combinada. */
function fake(output: string): {
    run: (args: readonly string[], cwd: string) => string
    calls: string[][]
} {
    const calls: string[][] = []
    return {
        calls,
        run: args => {
            calls.push([...args])
            return output
        }
    }
}

test('ADR-0006: changedPaths usa três pontos, -z e safe.directory', () => {
    const git = fake(`src/cli/index.ts${NUL}CHANGELOG.md${NUL}`)
    const paths = changedPaths('/workspace', 'origin/master', git.run)

    assert.deepEqual(paths, ['src/cli/index.ts', 'CHANGELOG.md'])
    assert.deepEqual(git.calls[0], [
        '-c',
        'safe.directory=*',
        'diff',
        '--name-only',
        '-z',
        'origin/master...HEAD'
    ])
})

test('ADR-0006: caminho com acento volta inteiro, sem aspas nem escape', () => {
    const git = fake(`docs/decisões.md${NUL}`)
    assert.deepEqual(changedPaths('/workspace', 'base', git.run), [
        'docs/decisões.md'
    ])
})

test('changedPaths normaliza a barra e descarta entrada vazia', () => {
    const git = fake(`src\\cli\\index.ts${NUL}${NUL}`)
    assert.deepEqual(changedPaths('/workspace', 'base', git.run), [
        'src/cli/index.ts'
    ])
})

test('ADR-0006: commitMessages usa dois pontos e separa por NUL', () => {
    const git = fake(
        `feat: um${NUL}\nfix: dois\n\nChangelog: none — razão${NUL}\n`
    )
    const messages = commitMessages('/workspace', 'origin/master', git.run)

    assert.deepEqual(messages, [
        'feat: um',
        'fix: dois\n\nChangelog: none — razão'
    ])
    assert.deepEqual(git.calls[0], [
        '-c',
        'safe.directory=*',
        'log',
        '--format=%B%x00',
        'origin/master..HEAD'
    ])
})

test('ADR-0006: erro de git vira GitError — este módulo não falha aberta', () => {
    const run = () => {
        const err = new Error('Command failed') as Error & { stderr: string }
        err.stderr = "fatal: bad revision 'origem/nao-existe'\n"
        throw err
    }

    assert.throws(
        () => changedPaths('/workspace', 'origem/nao-existe', run),
        (err: unknown) =>
            err instanceof GitError &&
            /bad revision/.test((err as Error).message)
    )
    assert.throws(() => commitMessages('/workspace', 'x', run), GitError)
})

test('GitError nomeia o comando que falhou, não só a causa', () => {
    const run = () => {
        throw new Error('spawn git ENOENT')
    }
    assert.throws(
        () => changedPaths('/workspace', 'base', run),
        (err: unknown) =>
            err instanceof GitError &&
            /git diff base\.\.\.HEAD/.test((err as Error).message)
    )
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/git/diff.test.ts
```

Esperado: FAIL — `Cannot find module '.../src/git/diff.ts'`.

- [ ] **Step 3: Escrever `src/git/diff.ts`**

```typescript
import { execFileSync } from 'node:child_process'
import type { GitRunner } from './staged.ts'

/**
 * Teto de um comando git de leitura. Generoso perto dos 3 s de `staged.ts`:
 * `CI-6` roda no PR, não dentro do orçamento de 5 s de um hook (spec §7).
 */
export const TIMEOUT_MS = 10_000

/** Falha de git que o chamador precisa ver. Não existe atalho para "não sei". */
export class GitError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'GitError'
    }
}

const NUL = String.fromCharCode(0)

export const runGitDiff: GitRunner = (args, cwd) =>
    execFileSync('git', [...args], {
        cwd,
        encoding: 'utf8',
        timeout: TIMEOUT_MS,
        maxBuffer: 16 * 1024 * 1024,
        // stderr capturado, não herdado: ele vira a mensagem do GitError.
        stdio: ['ignore', 'pipe', 'pipe']
    })

/** A primeira linha útil do erro: stderr se houver, mensagem se não. */
function reasonOf(err: unknown): string {
    const stderr = (err as { stderr?: unknown }).stderr
    const text =
        String(stderr ?? '').trim() ||
        (err instanceof Error ? err.message : String(err))
    return text.split('\n')[0] ?? text
}

/**
 * `safe.directory=*` pelo mesmo motivo de `src/git/staged.ts`: o container roda
 * com uid diferente do dono do checkout montado (`ADR-0003`), e sem isso o git
 * recusa o repositório.
 *
 * Ao contrário de `staged.ts`, aqui **erro sobe**. Lá quem chama é um hook, e
 * silêncio custa uma pergunta a menos; aqui quem chama é um check, e silêncio
 * custa um contrato quebrado passando com a autoridade de um CI verde
 * (`ADR-0006`, decisão 3).
 */
function git(
    args: readonly string[],
    root: string,
    run: GitRunner,
    what: string
): string {
    try {
        return run(['-c', 'safe.directory=*', ...args], root)
    } catch (err) {
        throw new GitError(`${what} falhou: ${reasonOf(err)}`)
    }
}

/**
 * Caminhos que esta branch mudou em relação à base, sempre com `/`.
 *
 * Três pontos, e não dois: parte do merge-base, então o que entrou na base
 * depois que a branch saiu **não** conta como mudança da branch (`ADR-0006`).
 * `-z` porque sem ele o git envolve em aspas e escapa caminho com acento, e
 * caminho escapado não casa com glob nenhum.
 */
export function changedPaths(
    root: string,
    base: string,
    run: GitRunner = runGitDiff
): string[] {
    const output = git(
        ['diff', '--name-only', '-z', `${base}...HEAD`],
        root,
        run,
        `git diff ${base}...HEAD`
    )

    return output
        .split(NUL)
        .map(path => path.trim().replace(/\\/g, '/'))
        .filter(path => path !== '')
}

/**
 * Mensagens completas dos commits que esta branch acrescentou.
 *
 * Dois pontos aqui, de propósito: a pergunta é "quais commits são desta
 * branch", não "qual é a diferença de conteúdo". `%x00` separa as mensagens
 * porque elas têm linhas em branco por dentro — o rótulo de exceção é um
 * trailer, e trailer mora depois de uma linha em branco.
 */
export function commitMessages(
    root: string,
    base: string,
    run: GitRunner = runGitDiff
): string[] {
    const output = git(
        ['log', '--format=%B%x00', `${base}..HEAD`],
        root,
        run,
        `git log ${base}..HEAD`
    )

    return output
        .split(NUL)
        .map(message => message.trim())
        .filter(message => message !== '')
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/git/diff.test.ts
docker compose exec toolkit npm run typecheck
```

Esperado: PASS nos dois.

- [ ] **Step 5: Commit**

`src/git/**` não está em `watches`, então `HK-5` não pergunta nesta task.

```bash
git add src/git/diff.ts test/git/diff.test.ts
git commit -m "feat(ADR-0006): src/git/diff.ts lê o diff da branch e não falha aberta"
```

---

### Task 3: `CI-6` — changelog required

**Objetivo:** O check puro. Recebe os fatos do diff por injeção, lê a
configuração e o arquivo, e devolve achados. Não fala com o git.

**Files:**

- Create: `src/checks/ci6-changelog-required.ts`
- Test: `test/checks/ci6-changelog-required.test.ts`

**Interfaces:**

- Consome: `Check`, `CheckContext`, `Finding` de `src/core/types.ts`;
  `OWNERSHIP_PATH` de `src/config/ownership.ts`; `picomatch`.
- Produz:
    - `interface DiffFacts { base: string; changed: readonly string[]; messages: readonly string[] }`
    - `ci6ChangelogRequired(diff: DiffFacts): Check`
    - `exceptionReason(messages: readonly string[]): string | null`
    - `unreleasedEntries(source: string): string[]`

**Requisitos:**

- Gatilho: `config.consumerVisiblePaths`. Vazio → nenhum achado (`ADR-0006`,
  decisão 5).
- Alvo: docs distintos das regras de `watches` com `consumerVisible === true`.
  Nenhum, com `consumer-visible-paths` declarado → achado de configuração.
- Rótulo de exceção: `Changelog: none` **com** separador e razão não vazia.
- A entrada precisa estar no diff **e** a seção `## [Unreleased]` precisa ter
  ao menos um item (`ADR-0006`, decisão 6).

**`HK-5`:** vai perguntar por `docs/requirements/rules.md` (caminho vigiado
`src/checks/**`). A resposta é: o doc dono viajou na Task 1, com `RN-0013`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/checks/ci6-changelog-required.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
    ci6ChangelogRequired,
    exceptionReason,
    unreleasedEntries
} from '../../src/checks/ci6-changelog-required.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
watches:
  - code: "src/api/**"
    doc: CHANGELOG.md
    consumer-visible: true
    reason: "mudança visível ao consumidor nasce com a entrada no mesmo PR"
consumer-visible-paths: ["src/api/**"]
`

const CHANGELOG_COM_ENTRADA = `# Changelog

## [Unreleased]

### Added

- \`GET /pedidos\` devolve o total em centavos.
`

const CHANGELOG_VAZIO = `# Changelog

## [Unreleased]

### Added

## [1.0.0] - 2026-01-01

- primeira versão
`

function contextFor(root: string, ownership = OWNERSHIP) {
    return { root, config: parseOwnership(ownership), docs: [] }
}

function seedChangelog(root: string, content: string): void {
    mkdirSync(root, { recursive: true })
    writeFileSync(join(root, 'CHANGELOG.md'), content, 'utf8')
}

test('RN-0013: a entrada precisa viajar no mesmo diff, não só existir no arquivo', () => {
    withTempRepo({}, root => {
        // O arquivo TEM entrada, mas o diff não o toca: é a entrada de um PR
        // anterior satisfazendo este. É exatamente o que a decisão 6 recusa.
        seedChangelog(root, CHANGELOG_COM_ENTRADA)
        const findings = ci6ChangelogRequired({
            base: 'origin/master',
            changed: ['src/api/pedidos.ts'],
            messages: ['feat: total em centavos']
        }).run(contextFor(root))

        assert.equal(findings.length, 1)
        assert.equal(findings[0]?.ruleId, 'CI-6')
        assert.equal(findings[0]?.severity, 'error')
        assert.equal(findings[0]?.file, 'CHANGELOG.md')
        assert.match(
            findings[0]?.message ?? '',
            /não está entre os caminhos alterados/
        )
        assert.match(findings[0]?.message ?? '', /src\/api\/pedidos\.ts/)
        assert.match(findings[0]?.fix ?? '', /Changelog: none/)
    })
})

test('RN-0013: entrada no mesmo diff e Unreleased preenchido aprova', () => {
    withTempRepo({}, root => {
        seedChangelog(root, CHANGELOG_COM_ENTRADA)
        const findings = ci6ChangelogRequired({
            base: 'origin/master',
            changed: ['src/api/pedidos.ts', 'CHANGELOG.md'],
            messages: ['feat: total em centavos']
        }).run(contextFor(root))

        assert.deepEqual(findings, [])
    })
})

test('RN-0013: CHANGELOG no diff com Unreleased vazio não conta', () => {
    withTempRepo({}, root => {
        seedChangelog(root, CHANGELOG_VAZIO)
        const findings = ci6ChangelogRequired({
            base: 'origin/master',
            changed: ['src/api/pedidos.ts', 'CHANGELOG.md'],
            messages: ['feat: total em centavos']
        }).run(contextFor(root))

        assert.equal(findings.length, 1)
        assert.match(findings[0]?.message ?? '', /\[Unreleased\]/)
    })
})

test('ADR-0006: o rótulo com razão libera; sem razão, não', () => {
    withTempRepo({}, root => {
        seedChangelog(root, CHANGELOG_COM_ENTRADA)
        const diff = { base: 'origin/master', changed: ['src/api/pedidos.ts'] }

        assert.deepEqual(
            ci6ChangelogRequired({
                ...diff,
                messages: [
                    'refactor: renomeia interno\n\nChangelog: none — nada muda para quem consome'
                ]
            }).run(contextFor(root)),
            []
        )

        const semRazao = ci6ChangelogRequired({
            ...diff,
            messages: ['refactor: renomeia interno\n\nChangelog: none']
        }).run(contextFor(root))
        assert.equal(
            semRazao.length,
            1,
            'rótulo sem razão é caixinha marcada, não exceção'
        )
    })
})

test('caminho fora de consumer-visible-paths não dispara nada', () => {
    withTempRepo({}, root => {
        seedChangelog(root, CHANGELOG_COM_ENTRADA)
        const findings = ci6ChangelogRequired({
            base: 'origin/master',
            changed: ['src/interno/cache.ts', 'test/interno/cache.test.ts'],
            messages: ['refactor: cache']
        }).run(contextFor(root))

        assert.deepEqual(findings, [])
    })
})

test('consumer-visible-paths vazio: o check não tem gatilho e se cala', () => {
    withTempRepo({}, root => {
        seedChangelog(root, CHANGELOG_COM_ENTRADA)
        const semGatilho = OWNERSHIP.replace(
            'consumer-visible-paths: ["src/api/**"]',
            'consumer-visible-paths: []'
        )
        const findings = ci6ChangelogRequired({
            base: 'origin/master',
            changed: ['src/api/pedidos.ts'],
            messages: ['feat: x']
        }).run(contextFor(root, semGatilho))

        assert.deepEqual(findings, [])
    })
})

test('ADR-0006: gatilho declarado sem doc marcado consumer-visible é erro de configuração', () => {
    withTempRepo({}, root => {
        const semAlvo = OWNERSHIP.replace('    consumer-visible: true\n', '')
        const findings = ci6ChangelogRequired({
            base: 'origin/master',
            changed: ['src/api/pedidos.ts'],
            messages: ['feat: x']
        }).run(contextFor(root, semAlvo))

        assert.equal(findings.length, 1)
        assert.equal(findings[0]?.file, 'docs/.ownership.yml')
        assert.match(findings[0]?.fix ?? '', /consumer-visible: true/)
    })
})

test('doc alvo declarado e ausente do repositório é achado, não silêncio', () => {
    withTempRepo({}, root => {
        const findings = ci6ChangelogRequired({
            base: 'origin/master',
            changed: ['src/api/pedidos.ts', 'CHANGELOG.md'],
            messages: ['feat: x']
        }).run(contextFor(root))

        assert.equal(findings.length, 1)
        assert.match(findings[0]?.message ?? '', /ausente/)
    })
})

test('unreleasedEntries lê só a seção Unreleased, e reconhece - e *', () => {
    assert.deepEqual(unreleasedEntries(CHANGELOG_COM_ENTRADA), [
        '- `GET /pedidos` devolve o total em centavos.'
    ])
    assert.deepEqual(unreleasedEntries(CHANGELOG_VAZIO), [])
    assert.deepEqual(
        unreleasedEntries('# Changelog\n\n## Unreleased\n\n* item\n'),
        ['* item']
    )
    assert.deepEqual(
        unreleasedEntries('# Changelog\n\n## [1.0.0]\n\n- item\n'),
        []
    )
})

test('exceptionReason aceita travessão, hífen e dois-pontos, e recusa razão vazia', () => {
    assert.equal(exceptionReason(['Changelog: none — só teste']), 'só teste')
    assert.equal(exceptionReason(['Changelog: none - só teste']), 'só teste')
    assert.equal(exceptionReason(['Changelog: none: só teste']), 'só teste')
    assert.equal(exceptionReason(['Changelog: none']), null)
    assert.equal(exceptionReason(['Changelog: none —   ']), null)
    assert.equal(
        exceptionReason([
            'feat: x',
            'fix: y\n\nchangelog: NONE — minúscula também'
        ]),
        'minúscula também'
    )
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/checks/ci6-changelog-required.test.ts
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever `src/checks/ci6-changelog-required.ts`**

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { OWNERSHIP_PATH } from '../config/ownership.ts'

const RULE = 'CI-6'

/** O que o check precisa saber sobre o diff. Quem fala com o git é o CLI. */
export interface DiffFacts {
    base: string
    changed: readonly string[]
    messages: readonly string[]
}

/**
 * O rótulo de exceção (`ADR-0006`, decisão 4). O separador é obrigatório e a
 * razão também: `Changelog: none` sozinho é caixinha marcada, e caixinha
 * marcada desliga o mecanismo fingindo cumpri-lo.
 */
const EXCEPTION_LABEL = /^[ \t]*Changelog:[ \t]*none[ \t]*[—–:-][ \t]*(\S.*)$/im

export function exceptionReason(messages: readonly string[]): string | null {
    for (const message of messages) {
        const match = EXCEPTION_LABEL.exec(message)
        const reason = match?.[1]?.trim()
        if (reason) return reason
    }
    return null
}

/**
 * Itens sob `## [Unreleased]`, no formato Keep a Changelog. Aceita
 * `## Unreleased` sem colchetes porque as duas formas circulam, e recusar uma
 * delas seria o check ensinando estilo em vez de cobrar a entrada.
 */
export function unreleasedEntries(source: string): string[] {
    const lines = source.replace(/\r\n/g, '\n').split('\n')
    const start = lines.findIndex(line =>
        /^##\s+\[?unreleased\]?/i.test(line.trim())
    )
    if (start === -1) return []

    const entries: string[] = []
    for (let i = start + 1; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (/^##\s/.test(line)) break
        if (/^\s*[-*]\s+\S/.test(line)) entries.push(line.trim())
    }
    return entries
}

function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function error(file: string, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
}

/**
 * `CI-6` — changelog required. Recebe os fatos do diff por injeção, e não pelo
 * `CheckContext`: o diff é dependência deste check, não do contexto que os
 * outros compartilham — mesma escolha de `CI-5` com o executor (`ADR-0005`).
 *
 * Regra de origem: `RN-0013`.
 */
export function ci6ChangelogRequired(diff: DiffFacts): Check {
    return {
        id: RULE,
        name: 'changelog required',
        run(context: CheckContext): Finding[] {
            const globs = context.config.consumerVisiblePaths
            if (globs.length === 0) return []

            const changed = diff.changed.map(normalize)
            const matches = picomatch(globs)
            const hits = changed.filter(path => matches(path))
            if (hits.length === 0) return []

            // O toolkit não conhece o caminho `CHANGELOG.md` e não vai passar a
            // conhecer: o alvo vem da configuração (spec §3, ADR-0006 decisão 5).
            const targets = [
                ...new Set(
                    context.config.watches
                        .filter(watch => watch.consumerVisible)
                        .map(watch => normalize(watch.doc))
                )
            ]

            if (targets.length === 0) {
                return [
                    error(
                        OWNERSHIP_PATH,
                        '`consumer-visible-paths` está declarado e nenhuma regra de `watches` traz `consumer-visible: true` — ' +
                            'CI-6 não sabe onde a entrada deveria estar.',
                        'Marque com `consumer-visible: true` a regra de `watches` cujo `doc` é o changelog do projeto ' +
                            '(skill dona: release-historian).'
                    )
                ]
            }

            // Razão escrita no histórico libera — é a exceção da spec §5, SK-7, regra 2.
            if (exceptionReason(diff.messages) !== null) return []

            const gatilho =
                hits.slice(0, 5).join(', ') +
                (hits.length > 5 ? `, … (+${hits.length - 5})` : '')
            const findings: Finding[] = []

            for (const target of targets) {
                if (!changed.includes(target)) {
                    findings.push(
                        error(
                            target,
                            `O diff \`${diff.base}...HEAD\` toca caminho visível ao consumidor (${gatilho}) e ` +
                                `\`${target}\` não está entre os caminhos alterados.`,
                            `Acrescente a entrada em \`## [Unreleased]\` de \`${target}\`, voltada a quem consome — ou escreva a razão ` +
                                'na mensagem de commit, no formato `Changelog: none — <razão>` (RN-0013; skill dona: release-historian).'
                        )
                    )
                    continue
                }

                let source: string
                try {
                    source = readFileSync(join(context.root, target), 'utf8')
                } catch {
                    findings.push(
                        error(
                            target,
                            `\`${target}\` está declarado como doc de mudança visível ao consumidor e está ausente do repositório.`,
                            `Crie \`${target}\` no formato Keep a Changelog, com \`## [Unreleased]\` no topo ` +
                                '(`living-docs init --stage production` o instala; skill dona: release-historian).'
                        )
                    )
                    continue
                }

                if (unreleasedEntries(source).length === 0) {
                    findings.push(
                        error(
                            target,
                            `O diff toca caminho visível ao consumidor (${gatilho}) e \`## [Unreleased]\` de \`${target}\` não tem nenhum item.`,
                            'Escreva a entrada sob a subseção certa (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`). ' +
                                'Se a entrada só faz sentido para quem escreveu o código, ela não pertence ao CHANGELOG — nesse caso o ' +
                                'caminho é `Changelog: none — <razão>` (RN-0013).'
                        )
                    )
                }
            }

            return findings
        }
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/checks/ci6-changelog-required.test.ts
docker compose exec toolkit npm run typecheck
```

Esperado: PASS nos dois.

- [ ] **Step 5: Commit**

```bash
git add src/checks/ci6-changelog-required.ts test/checks/ci6-changelog-required.test.ts
git commit -m "feat(RN-0013): CI-6 cobra a entrada de CHANGELOG no mesmo diff"
```

`HK-5` vai perguntar por `docs/requirements/rules.md`. Responda que o doc dono
viajou na Task 1, com `RN-0013` — a regra veio antes do código, que é a ordem
que `CONTRIBUTING.md` exige.

---

### Task 4: `living-docs changelog --base <ref>`, o catálogo e o contrato regerado

**Objetivo:** O subcomando que roda `CI-6`, o ponteiro em `validate`, a entrada
`CI-6` no `CHECK_CATALOG` e a regeneração de `docs/contracts/checks.gen.md`.

**Files:**

- Create: `src/cli/changelog.ts`
- Modify: `src/cli/index.ts`
- Modify: `src/cli/validate.ts`
- Modify: `src/checks/registry.ts`
- Modify: `src/checks/catalog.ts`
- Regenerate: `docs/contracts/checks.gen.md` (nunca `Edit`/`Write` — `HK-2` nega)
- Test: `test/cli/changelog.test.ts`
- Modify: `test/checks/registry.test.ts`

**Interfaces:**

- Consome: `changedPaths`, `commitMessages`, `GitError` (Task 2);
  `ci6ChangelogRequired`, `DiffFacts` (Task 3); `loadOwnership`,
  `formatFindings`.
- Produz:
    - `runChangelog(root: string, base: string, run?: GitRunner): ChangelogResult`
    - `interface ChangelogResult { findings: Finding[]; declared: number; exitCode: number }`
    - `changelogChecks(diff?: DiffFacts): readonly Check[]` em `src/checks/registry.ts`
    - `ValidateResult.consumerVisible: number`

**Requisitos:**

- Sem `--base`: stderr + exit 2. Sem `consumer-visible-paths`: mensagem + exit 0.
- `GitError` vira exit 2 com mensagem em stderr — o comando não pôde começar,
  que é `EXIT-2` do catálogo de erros, não `EXIT-1`.
- A ordem de `CHECK_CATALOG` precisa continuar igual à de
  `[...CHECKS, ...driftChecks(), ...changelogChecks()]`; o teste do registry
  compara as duas listas item a item.

**`HK-5`:** duas pendências. `docs/requirements/functional.md` (por
`src/cli/**`) e `docs/requirements/rules.md` (por `src/checks/**`) viajaram na
Task 1. `docs/contracts/checks.gen.md` (por `src/checks/catalog.ts`) **viaja
neste commit** — regere e adicione ao `git add`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/cli/changelog.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runChangelog } from '../../src/cli/changelog.ts'
import { GitError } from '../../src/git/diff.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const NUL = String.fromCharCode(0)

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
watches:
  - code: "src/api/**"
    doc: CHANGELOG.md
    consumer-visible: true
consumer-visible-paths: ["src/api/**"]
`

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- \`GET /pedidos\` devolve o total em centavos.
`

/** Runner falso: responde ao `diff` e ao `log` pela subposição do verbo. */
function gitFake(changed: string[], messages: string[]) {
    return (args: readonly string[]): string => {
        if (args.includes('diff')) return changed.join(NUL) + NUL
        if (args.includes('log')) return messages.join(`${NUL}\n`) + NUL + '\n'
        throw new Error(`comando git inesperado: ${args.join(' ')}`)
    }
}

test('RF-0008: o comando reprova quando a entrada não viaja no diff', () => {
    withTempRepo(
        { 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG },
        root => {
            const result = runChangelog(
                root,
                'origin/master',
                gitFake(['src/api/pedidos.ts'], ['feat: total'])
            )

            assert.equal(result.exitCode, 1)
            assert.equal(result.declared, 1)
            assert.equal(result.findings[0]?.ruleId, 'CI-6')
        }
    )
})

test('RF-0008: com a entrada no diff, sai com 0', () => {
    withTempRepo(
        { 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG },
        root => {
            const result = runChangelog(
                root,
                'origin/master',
                gitFake(['src/api/pedidos.ts', 'CHANGELOG.md'], ['feat: total'])
            )

            assert.equal(result.exitCode, 0)
            assert.deepEqual(result.findings, [])
        }
    )
})

test('RF-0008: sem consumer-visible-paths declarado, não há o que checar', () => {
    const semGatilho = OWNERSHIP.replace(
        'consumer-visible-paths: ["src/api/**"]',
        'consumer-visible-paths: []'
    )
    withTempRepo(
        { 'docs/.ownership.yml': semGatilho, 'CHANGELOG.md': CHANGELOG },
        root => {
            const result = runChangelog(root, 'origin/master', () => {
                throw new Error(
                    'não deveria falar com o git sem gatilho declarado'
                )
            })

            assert.equal(result.declared, 0)
            assert.equal(result.exitCode, 0)
            assert.deepEqual(result.findings, [])
        }
    )
})

test('RF-0008: base que não resolve vira GitError — o comando não inventa diff vazio', () => {
    withTempRepo(
        { 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG },
        root => {
            assert.throws(
                () =>
                    runChangelog(root, 'origem/inexistente', () => {
                        const err = new Error('Command failed') as Error & {
                            stderr: string
                        }
                        err.stderr =
                            "fatal: bad revision 'origem/inexistente'\n"
                        throw err
                    }),
                GitError
            )
        }
    )
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/cli/changelog.test.ts
```

Esperado: FAIL — `src/cli/changelog.ts` não existe.

- [ ] **Step 3: Escrever `src/cli/changelog.ts`**

```typescript
import { loadOwnership } from '../config/ownership.ts'
import { changelogChecks } from '../checks/registry.ts'
import { changedPaths, commitMessages } from '../git/diff.ts'
import type { GitRunner } from '../git/staged.ts'
import type { Finding } from '../core/types.ts'

export interface ChangelogResult {
    findings: Finding[]
    /** Globs de `consumer-visible-paths` declarados. Zero significa "sem gatilho". */
    declared: number
    exitCode: number
}

/**
 * `living-docs changelog --base <ref>` — roda `CI-6` (`ADR-0006`, decisão 7).
 *
 * Fala com o git aqui, e não dentro do check: o check continua sendo uma
 * função pura de (fatos, configuração, arquivo) → achados.
 */
export function runChangelog(
    root: string,
    base: string,
    run?: GitRunner
): ChangelogResult {
    const config = loadOwnership(root)

    // Sem gatilho declarado não se toca no git: falar com o repositório para
    // depois descobrir que não havia o que checar é custo sem resposta.
    if (config.consumerVisiblePaths.length === 0) {
        return { findings: [], declared: 0, exitCode: 0 }
    }

    const diff = {
        base,
        changed: changedPaths(root, base, run),
        messages: commitMessages(root, base, run)
    }

    // `docs: []` de propósito: CI-6 não lê artefato nenhum — ele lê o diff, a
    // configuração e o doc alvo.
    const context = { root, config, docs: [] }
    const findings = changelogChecks(diff).flatMap(check => check.run(context))

    return {
        findings,
        declared: config.consumerVisiblePaths.length,
        exitCode: findings.some(finding => finding.severity === 'error') ? 1 : 0
    }
}
```

- [ ] **Step 4: Registrar `CI-6` no registry**

Em `src/checks/registry.ts`, acrescente os imports e a função:

```typescript
import { ci6ChangelogRequired } from './ci6-changelog-required.ts'
import type { DiffFacts } from './ci6-changelog-required.ts'
```

E, depois de `driftChecks`:

```typescript
/** Diff vazio: só para enumerar o check quando ninguém tem fatos a dar. */
const NO_DIFF: DiffFacts = Object.freeze({
    base: '',
    changed: [],
    messages: []
})

/**
 * Checks que `living-docs changelog` roda: os que precisam do diff da branch,
 * que `validate` não tem (ADR-0006). Os fatos entram por injeção para que o
 * teste não precise de um repositório git.
 */
export function changelogChecks(diff: DiffFacts = NO_DIFF): readonly Check[] {
    return [ci6ChangelogRequired(diff)]
}
```

- [ ] **Step 5: Acrescentar `CI-6` ao `CHECK_CATALOG`**

Em `src/checks/catalog.ts`, no **final** do array (a ordem precisa casar com
`[...CHECKS, ...driftChecks(), ...changelogChecks()]`):

```typescript
  {
    id: 'CI-6',
    name: 'changelog required',
    command: 'living-docs changelog --base <ref>',
    failsWhen:
      'O diff entre a base e `HEAD` toca `consumer-visible-paths` e o doc marcado `consumer-visible: true` não vem no mesmo diff com item em `## [Unreleased]`, nem alguma mensagem de commit traz `Changelog: none — <razão>`.',
  },
```

- [ ] **Step 6: Atualizar `test/checks/registry.test.ts`**

Troque o corpo dos três testes por:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    CHECKS,
    CHECK_CATALOG,
    changelogChecks,
    driftChecks
} from '../../src/checks/registry.ts'

test('RF-0006 e RF-0008: o catálogo cobre exatamente os checks que existem, com os mesmos nomes', () => {
    const reais = [
        ...CHECKS,
        ...driftChecks(() => ''),
        ...changelogChecks()
    ].map(check => `${check.id}|${check.name}`)
    const catalogados = CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}`)
    assert.deepEqual(
        catalogados,
        reais,
        'catálogo e registry divergiram — o contrato gerado mentiria'
    )
})

test('RF-0006: todo item do catálogo diz quando falha e por qual comando roda', () => {
    for (const entry of CHECK_CATALOG) {
        assert.ok(
            entry.failsWhen.length > 20,
            `${entry.id} sem condição de falha escrita`
        )
        assert.match(
            entry.command,
            /^living-docs (validate|drift|changelog --base <ref>)$/,
            `${entry.id} com comando estranho`
        )
    }
})

test('ADR-0005 e ADR-0006: cada check roda no comando que o catálogo nomeia', () => {
    const esperado: Record<string, string> = {
        'CI-1': 'living-docs validate',
        'CI-2': 'living-docs validate',
        'CI-3': 'living-docs validate',
        'CI-5': 'living-docs drift',
        'CI-6': 'living-docs changelog --base <ref>'
    }

    for (const entry of CHECK_CATALOG) {
        assert.equal(
            entry.command,
            esperado[entry.id],
            `${entry.id} no comando errado`
        )
    }
    assert.equal(
        CHECK_CATALOG.length,
        Object.keys(esperado).length,
        'check novo sem comando esperado declarado'
    )
})
```

- [ ] **Step 7: Ligar o subcomando e o ponteiro no CLI**

Em `src/cli/validate.ts`, acrescente o campo à interface e ao retorno:

```typescript
/** Globs de `consumer-visible-paths` — checados por `living-docs changelog`, não aqui (ADR-0006). */
consumerVisible: number
```

```typescript
    consumerVisible: config.consumerVisiblePaths.length,
```

Em `src/cli/index.ts`, acrescente o import e o bloco. Primeiro os imports:

```typescript
import { runChangelog } from './changelog.ts'
import { GitError } from '../git/diff.ts'
```

Depois, na `USAGE`, entre `drift` e `init`:

```
  changelog   Cobra a entrada de CHANGELOG do diff da branch (CI-6)
```

e, no bloco de opções, uma seção nova depois das opções de `init`:

```
Opções de changelog:
  --base <ref>        Base do diff (obrigatório) — ex.: origin/master
```

Dentro de `validate`, depois do ponteiro de `drift`:

```typescript
if (result.consumerVisible > 0) {
    process.stdout.write(
        `living-docs: ${result.consumerVisible} caminho(s) visível(is) ao consumidor declarado(s) — a entrada de CHANGELOG é verificada por \`living-docs changelog --base <ref>\` (CI-6).\n`
    )
}
```

E o comando novo, depois do bloco de `drift`:

```typescript
if (command === 'changelog') {
    const baseIndex = argv.indexOf('--base')
    const base = baseIndex === -1 ? '' : (argv[baseIndex + 1] ?? '')
    if (base === '') {
        process.stderr.write(
            'living-docs: `changelog` precisa de `--base <ref>` — a base do diff não se adivinha (CI-6, ADR-0006).\n'
        )
        return 2
    }

    const result = runChangelog(root, base)
    if (result.declared === 0) {
        process.stdout.write(
            'living-docs: `consumer-visible-paths` vazio em docs/.ownership.yml — nada a checar (CI-6).\n'
        )
        return 0
    }
    process.stdout.write(`${formatFindings(result.findings)}\n`)
    return result.exitCode
}
```

E, no `catch` do `main`, antes do `throw err`:

```typescript
if (err instanceof GitError) {
    process.stderr.write(
        `living-docs: ${err.message}\n` +
            '             o clone precisa conter a base (em CI: `actions/checkout` com `fetch-depth: 0`).\n'
    )
    return 2
}
```

- [ ] **Step 8: Rodar os testes e regerar o contrato**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Esperado: PASS, **exceto** `test/contracts/drift.test.ts` e/ou
`living-docs drift`, que agora acusam deriva — o catálogo tem `CI-6` e o
arquivo gerado não. É `CI-5` fazendo exatamente o trabalho dele. Regere:

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
docker compose exec toolkit npm test
```

Esperado: `drift=0` e PASS. **Não** use `Edit` nem `Write` em
`docs/contracts/checks.gen.md`: `HK-2` nega, e essa negativa é o mecanismo
funcionando.

- [ ] **Step 9: Provar o comando na mão**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts changelog; echo "exit=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts changelog --base HEAD; echo "exit=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Esperado: `exit=2` no primeiro (falta `--base`); no segundo, `exit=0` com a
mensagem de `consumer-visible-paths` vazio — este repositório só o preenche na
Task 7. No terceiro, `exit=0` **sem** a linha nova do ponteiro, pela mesma
razão. Se o ponteiro aparecer agora, `consumer-visible-paths` foi preenchido
fora de hora.

- [ ] **Step 10: Commit**

```bash
git add src/cli/changelog.ts src/cli/index.ts src/cli/validate.ts src/checks/registry.ts src/checks/catalog.ts docs/contracts/checks.gen.md test/cli/changelog.test.ts test/checks/registry.test.ts
git commit -m "feat(RF-0008): living-docs changelog --base roda CI-6, e o contrato dos checks é regerado"
```

`HK-5` vai perguntar por três docs. `docs/requirements/functional.md` e
`docs/requirements/rules.md` viajaram na Task 1; `docs/contracts/checks.gen.md`
está no `git add` acima. Diga isso e siga.

---

### Task 5: `HK-7` — atalho novo sem TDR

**Objetivo:** O sexto hook. `PostToolUse` em `Edit|Write`, `additionalContext`,
nunca `deny`. É o primeiro hook que não lê o `.ownership.yml`.

**Files:**

- Create: `src/hooks/hk7-shortcut-debt.ts`
- Modify: `plugin/hooks/hooks.json`
- Test: `test/hooks/hk7-shortcut-debt.test.ts`
- Modify: `test/plugin/manifest.test.ts`

**Interfaces:**

- Consome: `applyToolInput` de `src/hooks/lib/edit.ts`; `toRepoPath` de
  `src/hooks/lib/paths.ts`; `contextOutput`, `emit`, `hookEnv`, `readPayload`,
  `HookEnv`, `HookPayload` de `src/hooks/lib/io.ts`.
- Produz:
    - `type Hk7Decision = { action: 'silent' } | { action: 'remind'; context: string }`
    - `decideHk7(payload: HookPayload, env: HookEnv): Hk7Decision`
    - `shortcutsWithoutDebt(source: string): string[]`

**Requisitos:**

- Só **atalho novo**: o que já estava no arquivo antes da edição não conta.
- `TDR-nnnn` a até duas linhas de distância silencia o marcador.
- Arquivos `.md` são ignorados (`RN-0014`, fora de escopo): ali `TODO` é prosa
  **sobre** o marcador — inclusive na própria `RN-0014`.
- Nunca `deny`. Este arquivo não conhece a palavra.

**`HK-5`:** vai perguntar por `docs/requirements/rules.md` (caminho vigiado
`src/hooks/**`). O doc dono viajou na Task 1, com `RN-0014`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/hooks/hk7-shortcut-debt.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import {
    decideHk7,
    shortcutsWithoutDebt
} from '../../src/hooks/hk7-shortcut-debt.ts'
import { withTempRepo } from '../helpers/tmp.ts'

function seed(root: string, relative: string, content: string): void {
    const absolute = join(root, relative)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, content, 'utf8')
}

test('RN-0014: marcador novo sem TDR por perto vira lembrete', () => {
    withTempRepo({}, root => {
        seed(root, 'src/cobranca.ts', 'export const taxa = 0.05;\n')

        const decision = decideHk7(
            {
                tool_name: 'Edit',
                tool_input: {
                    file_path: 'src/cobranca.ts',
                    old_string: 'export const taxa = 0.05;',
                    new_string:
                        '// TODO: a taxa deveria vir da configuração\nexport const taxa = 0.05;'
                }
            },
            { root, hostRoots: [root] }
        )

        assert.equal(decision.action, 'remind')
        assert.match(
            decision.action === 'remind' ? decision.context : '',
            /HK-7/
        )
        assert.match(
            decision.action === 'remind' ? decision.context : '',
            /TODO: a taxa/
        )
        assert.match(
            decision.action === 'remind' ? decision.context : '',
            /\/debt/
        )
        assert.doesNotMatch(
            decision.action === 'remind' ? decision.context : '',
            /deny|bloque/i
        )
    })
})

test('RN-0014: marcador com TDR a duas linhas de distância é silêncio', () => {
    withTempRepo({}, root => {
        seed(root, 'src/cobranca.ts', 'export const taxa = 0.05;\n')

        const decision = decideHk7(
            {
                tool_name: 'Edit',
                tool_input: {
                    file_path: 'src/cobranca.ts',
                    old_string: 'export const taxa = 0.05;',
                    new_string:
                        '// Atalho registrado em TDR-0002.\n//\n// TODO: ler da configuração\nexport const taxa = 0.05;'
                }
            },
            { root, hostRoots: [root] }
        )

        assert.equal(decision.action, 'silent')
    })
})

test('RN-0014: marcador que já existia não é atalho novo', () => {
    withTempRepo({}, root => {
        seed(
            root,
            'src/cobranca.ts',
            '// TODO: antigo\nexport const taxa = 0.05;\n'
        )

        const decision = decideHk7(
            {
                tool_name: 'Edit',
                tool_input: {
                    file_path: 'src/cobranca.ts',
                    old_string: 'export const taxa = 0.05;',
                    new_string: 'export const taxa = 0.07;'
                }
            },
            { root, hostRoots: [root] }
        )

        assert.equal(decision.action, 'silent')
    })
})

test('RN-0014: supressão de tipo e teste ignorado também contam', () => {
    withTempRepo({}, root => {
        seed(root, 'src/cobranca.ts', 'const x = 1;\n')

        const decision = decideHk7(
            {
                tool_name: 'Write',
                tool_input: {
                    file_path: 'src/cobranca.ts',
                    content:
                        '// @ts-expect-error contorno temporário\nconst x: string = 1;\n'
                }
            },
            { root, hostRoots: [root] }
        )

        assert.equal(decision.action, 'remind')
    })

    assert.deepEqual(
        shortcutsWithoutDebt('test.skip("cobra taxa", () => {});'),
        ['test.skip("cobra taxa", () => {});']
    )
    assert.deepEqual(
        shortcutsWithoutDebt('// eslint-disable-next-line no-console'),
        ['// eslint-disable-next-line no-console']
    )
    assert.deepEqual(
        shortcutsWithoutDebt('const x = 1; // TODO_LIST não é marcador'),
        []
    )
})

test('RN-0014: arquivo Markdown é ignorado — ali TODO é prosa sobre o marcador', () => {
    withTempRepo({}, root => {
        seed(root, 'docs/requirements/rules.md', '# regras\n')

        const decision = decideHk7(
            {
                tool_name: 'Edit',
                tool_input: {
                    file_path: 'docs/requirements/rules.md',
                    old_string: '# regras',
                    new_string:
                        '# regras\n\nMarcador de atalho: TODO, FIXME, teste ignorado.'
                }
            },
            { root, hostRoots: [root] }
        )

        assert.equal(decision.action, 'silent')
    })
})

test('RNF-0001: arquivo fora do repositório e edição imprevisível são silêncio', () => {
    withTempRepo({}, root => {
        const env = { root, hostRoots: [root] }

        assert.equal(
            decideHk7(
                {
                    tool_name: 'Edit',
                    tool_input: {
                        file_path: '/fora/x.ts',
                        content: '// TODO: x'
                    }
                },
                env
            ).action,
            'silent'
        )
        assert.equal(
            decideHk7(
                {
                    tool_name: 'Edit',
                    tool_input: {
                        file_path: 'src/x.ts',
                        old_string: 'nada-disso'
                    }
                },
                env
            ).action,
            'silent'
        )
        assert.equal(decideHk7({ tool_name: 'Edit' }, env).action, 'silent')
    })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/hooks/hk7-shortcut-debt.test.ts
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever `src/hooks/hk7-shortcut-debt.ts`**

```typescript
#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write): sugere registrar a dívida quando um atalho novo
 * aparece sem `TDR-` por perto.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 — "um atalho legítimo não
 * pode ser bloqueado". A saída é `additionalContext`, e este arquivo não
 * conhece a palavra `deny`. Regra do projeto: `RN-0014`.
 *
 * É o primeiro hook que **não** lê o `docs/.ownership.yml`: marcador de atalho
 * é sintaxe da linguagem, não caminho de projeto. Não há o que configurar, e
 * inventar configuração aqui seria pedir ao projeto que declarasse o óbvio.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyToolInput } from './lib/edit.ts'
import { toRepoPath } from './lib/paths.ts'
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type Hk7Decision =
    | { action: 'silent' }
    | { action: 'remind'; context: string }

const SILENT: Hk7Decision = { action: 'silent' }

/**
 * Lista fechada, de propósito: um hook que precisa interpretar intenção está no
 * lugar errado (spec §7). Estes são os marcadores que a spec nomeia — atalho de
 * prosa, supressão de tipo ou de lint, e teste ignorado.
 */
const SHORTCUT_MARKERS: readonly RegExp[] = Object.freeze([
    /\bTODO\b/,
    /\bFIXME\b/,
    /\bHACK\b/,
    /\bXXX\b/,
    /@ts-ignore\b/,
    /@ts-expect-error\b/,
    /eslint-disable/,
    /\b(?:test|it|describe)\.(?:skip|todo)\b/,
    /\bskip:\s*true\b/
])

/** Citação de dívida. Mesmo formato da spec §8, restrito ao prefixo TDR. */
const DEBT = /\bTDR-\d{3,4}\b/

/** Janela de vizinhança: o comentário que registra a dívida costuma estar colado. */
const NEAR_LINES = 2

/** Linhas com marcador de atalho e sem `TDR-` na vizinhança, já aparadas. */
export function shortcutsWithoutDebt(source: string): string[] {
    const lines = source.replace(/\r\n/g, '\n').split('\n')
    const found: string[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (!SHORTCUT_MARKERS.some(marker => marker.test(line))) continue

        const window = lines
            .slice(Math.max(0, i - NEAR_LINES), i + NEAR_LINES + 1)
            .join('\n')
        if (DEBT.test(window)) continue

        found.push(line.trim())
    }

    return found
}

/** O que `after` tem e `before` não — contando repetição, não só presença. */
function onlyInAfter(
    before: readonly string[],
    after: readonly string[]
): string[] {
    const remaining = [...before]
    const novos: string[] = []

    for (const line of after) {
        const at = remaining.indexOf(line)
        if (at === -1) novos.push(line)
        else remaining.splice(at, 1)
    }

    return novos
}

export function decideHk7(payload: HookPayload, env: HookEnv): Hk7Decision {
    const toolInput = payload.tool_input
    if (!toolInput) return SILENT

    const filePath = toolInput.file_path
    if (typeof filePath !== 'string') return SILENT

    const repoPath = toRepoPath(filePath, env.hostRoots)
    if (repoPath === null) return SILENT

    // Em Markdown, `TODO` é prosa **sobre** o marcador — a própria RN-0014 o
    // escreve. Um lembrete a cada edição de doc ensina a ignorar o lembrete.
    if (repoPath.toLowerCase().endsWith('.md')) return SILENT

    let current: string
    try {
        current = readFileSync(join(env.root, repoPath), 'utf8')
    } catch {
        current = '' // arquivo novo: tudo que vier é novo
    }

    const next = applyToolInput(current, toolInput)
    if (next === null) return SILENT // não dá para prever o resultado

    const novos = onlyInAfter(
        shortcutsWithoutDebt(current),
        shortcutsWithoutDebt(next)
    )
    if (novos.length === 0) return SILENT

    return {
        action: 'remind',
        context:
            `HK-7: \`${repoPath}\` ganhou marcador de atalho sem dívida registrada por perto.\n` +
            `${novos.map(line => `- \`${line}\``).join('\n')}\n` +
            'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 e `RN-0014` — atalho consciente vira `TDR-nnnn` ' +
            'com gatilho de pagamento observável, não `TODO` órfão. Caminho válido: `/debt <o atalho>` ' +
            '(skill dona: decision-recorder), e cite o `TDR-nnnn` na linha do marcador.\n' +
            'Isto é lembrete, não é bloqueio: um atalho legítimo existe, e a decisão de registrá-lo ou não é humana.'
    }
}

async function main(): Promise<void> {
    const payload = await readPayload()
    if (!payload) return // falha aberta
    const decision = decideHk7(payload, hookEnv())
    emit(
        decision.action === 'remind'
            ? contextOutput('PostToolUse', decision.context)
            : null
    )
}

if (process.argv[1]?.endsWith('hk7-shortcut-debt.ts')) {
    main().catch(() => process.exit(0)) // falha aberta, sempre
}
```

- [ ] **Step 4: Registrar o hook em `plugin/hooks/hooks.json`**

No grupo `PostToolUse` / `Edit|Write`, depois de `hk4-watch-reminder`:

```json
{
    "type": "command",
    "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk7-shortcut-debt",
    "shell": "bash",
    "async": false
}
```

`run-hook.sh` **não muda**: ele recebe o nome do hook como argumento e invoca um
arquivo por hook. Quem distingue o evento é o arquivo, não o wrapper.

- [ ] **Step 5: Atualizar `test/plugin/manifest.test.ts`**

Duas mudanças. No teste dos matchers, o valor de `PostToolUse:Edit|Write`:

```typescript
    'PostToolUse:Edit|Write': ['hk4-watch-reminder', 'hk7-shortcut-debt'],
```

e o título dele passa a ser `'hooks.json registra os seis hooks nos eventos e matchers da spec §7'`.

No teste de existência dos arquivos, a contagem final:

```typescript
assert.equal(
    vistos,
    6,
    'a varredura deveria ver os seis hooks das Fases 1, 3, 5 e 6'
)
```

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Esperado: PASS nos dois.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/hk7-shortcut-debt.ts plugin/hooks/hooks.json test/hooks/hk7-shortcut-debt.test.ts test/plugin/manifest.test.ts
git commit -m "feat(RN-0014): HK-7 lembra de registrar o atalho novo, e nunca bloqueia"
```

`HK-5` pergunta por `docs/requirements/rules.md` — viajou na Task 1, com
`RN-0014`.

---

### Task 6: `REL` no ciclo de vida, templates e `init --stage production`

**Objetivo:** O estágio `production` passa a instalar a moldura de rastro
histórico, e a lista `notInstalled` dele fica vazia. Release note ganha família
de IDs para que `HK-1` possa congelá-la depois de publicada.

**Files:**

- Modify: `src/docs/schema.ts`
- Create: `templates/changelog.md`
- Create: `templates/deprecations.md`
- Create: `templates/release-note.md`
- Create: `templates/migration.md`
- Modify: `templates/ownership.yml`
- Modify: `templates/CODEOWNERS`
- Modify: `src/cli/init.ts`
- Test: `test/cli/init.test.ts` (acrescentar)

**Interfaces:**

- Consome: `STATUS_MACHINE`, `HUMAN_PROMOTIONS` de `src/docs/schema.ts`;
  `runInit`, `InitOptions`, `Stage` de `src/cli/init.ts`.
- Produz: o prefixo `REL` com estados `['draft', 'published']`; o placeholder
  `{{RELEASES_BLOCK}}` e `{{HISTORY_CODEOWNERS}}` nos templates;
  `NOT_INSTALLED.production === []`.

**Requisitos:**

- **`REL` entra em `artifacts:`, ao contrário de `CHANGELOG.md` e
  `docs/deprecations.md`.** A razão não é gosto: `HK-1` só congela caminho que
  `findArtifactRule` resolve, e a spec §7 exige que ele congele release note
  publicada. Sem prefixo, essa metade do `HK-1` não existe. Os outros dois
  seguem na categoria de `DA-0002`, fora de `artifacts:`.
- `production` continua idempotente e continua adotando o que já existe.
- O `init` **não** preenche `consumer-visible-paths` (`RF-0009`, fora de
  escopo).

**`HK-5`:** `src/cli/**` pede `docs/requirements/functional.md`, que viajou na
Task 1 com `RF-0009`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao final de `test/cli/init.test.ts`:

```typescript
test('RF-0009: production instala a moldura de rastro histórico', () => {
    withTempRepo({}, root => {
        runInit(root, PRODUCTION)

        for (const path of [
            'CHANGELOG.md',
            'docs/deprecations.md',
            'docs/releases/.gitkeep',
            'docs/migrations/.gitkeep'
        ]) {
            assert.ok(
                existsSync(join(root, path)),
                `${path} pertence a production`
            )
        }

        const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
        assert.match(
            changelog,
            /^## \[Unreleased\]$/m,
            'o CHANGELOG precisa abrir com Unreleased'
        )
        assert.doesNotMatch(
            changelog,
            /^---$/m,
            'CHANGELOG é voltado ao consumidor: sem frontmatter'
        )
    })
})

test('RF-0009: production declara o artefato REL, para que HK-1 congele release note publicada', () => {
    withTempRepo({}, root => {
        runInit(root, PRODUCTION)

        const config = loadOwnership(root)
        const rel = config.artifacts.find(
            artifact => artifact.idPrefix === 'REL'
        )
        assert.ok(
            rel,
            'sem REL em artifacts:, HK-1 não tem como congelar release note'
        )
        assert.equal(rel?.path, 'docs/releases/')
        assert.equal(rel?.appendOnly, true)
        assert.equal(rel?.skill, 'release-historian')
    })
})

test('RF-0009: production não inventa consumer-visible-paths', () => {
    withTempRepo({}, root => {
        runInit(root, PRODUCTION)
        assert.deepEqual(loadOwnership(root).consumerVisiblePaths, [])
    })
})

test('RF-0009: production não deixa nada da spec §10 de fora', () => {
    withTempRepo({}, root => {
        const result = runInit(root, PRODUCTION)
        assert.deepEqual(
            result.notInstalled,
            [],
            `production deveria estar completo — ${JSON.stringify(result.notInstalled)}`
        )
    })
})

test('RF-0009: subir de small-team para production declara REL no .ownership.yml existente', () => {
    withTempRepo({}, root => {
        runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' })
        assert.equal(
            loadOwnership(root).artifacts.some(
                artifact => artifact.idPrefix === 'REL'
            ),
            false,
            'small-team não instala rastro histórico'
        )

        runInit(root, PRODUCTION)
        assert.ok(
            loadOwnership(root).artifacts.some(
                artifact => artifact.idPrefix === 'REL'
            )
        )
        assert.equal(
            runValidate(root).exitCode,
            0,
            'o repositório recém-subido de estágio precisa passar limpo'
        )
    })
})
```

Confira o topo do arquivo: `PRODUCTION`, `existsSync`, `readFileSync`, `join`,
`runValidate` e `loadOwnership` precisam estar importados. `PRODUCTION` já
existe (linha 322); acrescente ao import de `node:fs` o que faltar, e
`import { loadOwnership } from '../../src/config/ownership.ts';` e
`import { runValidate } from '../../src/cli/validate.ts';` se ainda não
estiverem lá.

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts
```

Esperado: FAIL — `CHANGELOG.md` não existe, `REL` não está declarado, e
`notInstalled` ainda nomeia a Fase 6.

- [ ] **Step 3: Acrescentar `REL` ao ciclo de vida**

Em `src/docs/schema.ts`, dentro de `STATUS_MACHINE`, depois de `RN`:

```typescript
  REL: ['draft', 'published'],
```

E em `HUMAN_PROMOTIONS`, depois de `{ from: 'active', to: 'revoked' }`:

```typescript
  { from: 'draft', to: 'published' },
```

`published` já está em `FROZEN_STATUSES` desde a Fase 0 — é o que faz `HK-1`
congelar a release note assim que ela sai (spec §7).

- [ ] **Step 4: Escrever os quatro templates**

`templates/changelog.md` — **sem frontmatter**, de propósito:

```markdown
# Changelog

Este arquivo é voltado a quem **consome** este software. Teste único: se a
entrada só faz sentido para quem escreveu o código, ela não pertence aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

A entrada nasce no PR que causa a mudança, não na véspera da release.

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security
```

`templates/deprecations.md`:

```markdown
---
title: Depreciações
owner: '{{OWNER}}'
trigger: >
    Quando algo publicado é anunciado para remoção, e quando uma depreciação
    anunciada é de fato removida.
last-reviewed: { { TODAY } }
---

# Depreciações

Uma depreciação registra quatro coisas, sem exceção: a data do anúncio, a
versão ou data de remoção, o substituto, e o link para o guia de migração.
Faltando qualquer uma, não é depreciação — é quebra de compatibilidade, e passa
por um ADR.

| O que | Anunciado em | Removido em | Substituto | Guia de migração | Status |
| ----- | ------------ | ----------- | ---------- | ---------------- | ------ |

<!-- Skill dona: release-historian. -->
```

`templates/release-note.md`:

```markdown
---
id: REL-0001
title: v0.0.0
status: draft
owner: '{{OWNER}}'
trigger: >
    Nunca. Congelada depois de publicada; uma versão nova nasce ao lado.
last-reviewed: { { TODAY } }
relates-to: []
---

# v0.0.0 — <data>

Derivada do `CHANGELOG.md`, não escrita de novo. O que muda aqui é a moldura:
o destaque da versão, o que exige atenção de quem atualiza, e os links.

## Destaques

## Atenção ao atualizar

## Depreciações anunciadas nesta versão

## Entradas

<!-- Copiadas da seção da versão em CHANGELOG.md. -->
```

`templates/migration.md`:

```markdown
---
title: Migração — <de> para <para>
owner: '{{OWNER}}'
trigger: >
    Quando uma mudança quebra compatibilidade, no mesmo PR que a decide.
last-reviewed: { { TODAY } }
---

# Migração — <de> para <para>

## O que quebrou

## Por que

<!-- O ADR que decidiu. Migração sem decisão registrada é quebra sem porquê. -->

## Como migrar

1.

## Como saber que terminou
```

- [ ] **Step 5: Acrescentar os blocos aos templates de configuração**

Em `templates/ownership.yml`, logo depois de `{{REQUIREMENTS_BLOCK}}`:

```
{{RELEASES_BLOCK}}
```

E troque o comentário de `consumer-visible-paths` no final do arquivo:

```yaml
# Gatilho de CI-6: quais caminhos, quando mudam, são visíveis a quem consome
# este software. O init não os inventa, pela mesma razão que não inventa
# `watches`. A regra de `watches` que aponta o CHANGELOG precisa trazer
# `consumer-visible: true` — é ela que diz a CI-6 onde a entrada deveria estar.
# Exemplo:
#
# watches:
#   - code: "src/api/**"
#     doc: CHANGELOG.md
#     consumer-visible: true
#     reason: "mudança visível ao consumidor nasce com a entrada no mesmo PR"
#
# consumer-visible-paths: ["src/api/**"]
consumer-visible-paths: []
```

Em `templates/CODEOWNERS`, os placeholders são inline numa linha só. Acrescente
`{{HISTORY_CODEOWNERS}}` logo depois de `{{CONTRACTS_CODEOWNERS}}`, sem quebra
de linha entre eles — a última linha do arquivo passa a ser:

```
{{REQUIREMENTS_CODEOWNERS}}{{AGREEMENTS_CODEOWNERS}}{{CONTRACTS_CODEOWNERS}}{{HISTORY_CODEOWNERS}}docs/.ownership.yml    {{OWNER}}
```

- [ ] **Step 6: Ensinar o `init`**

Em `src/cli/init.ts`:

1. `Kind` ganha `'REL'`:

```typescript
type Kind = 'ADR' | 'DA' | 'TDR' | 'RF' | 'RNF' | 'RN' | 'REL'
```

2. `DEFAULT_PATHS` ganha a linha `REL: 'docs/releases/',` e
   `ADOPTION_CANDIDATES` ganha:

```typescript
  REL: ['docs/release-notes/', 'releases/', 'docs/release/'],
```

3. Depois de `CONTRACTS`, o conjunto novo:

```typescript
/** Rastro histórico (SK-7), instalado a partir do estágio `production` (spec §10, Fase 6). */
const HISTORY: readonly { path: string; template: string }[] = Object.freeze([
    { path: 'CHANGELOG.md', template: 'changelog.md' },
    { path: 'docs/deprecations.md', template: 'deprecations.md' }
])

/** Diretórios de item por arquivo que o rastro histórico usa (spec §3). */
const HISTORY_DIRS: readonly string[] = Object.freeze(['docs/migrations/'])
```

4. `NOT_INSTALLED.production` passa a `[]`:

```typescript
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze(
    {
        solo: [],
        'small-team': [],
        // `production` cobre as Fases 5 e 6 da spec §10, e as duas existem.
        production: []
    }
)
```

5. O bloco de `REL` do `.ownership.yml`, ao lado de `requirementsBlock`:

```typescript
/** O artefato REL do `.ownership.yml`, ou vazio fora do estágio `production`. */
function releasesBlock(owner: string, path: string, stage: Stage): string {
    if (stage !== 'production') return ''

    return (
        '\n' +
        [
            '  - id-prefix: REL',
            `    path: ${path}`,
            `    owner: "${owner}"`,
            '    skill: release-historian',
            '    # Release note publicada é congelada por HK-1 (spec §5, SK-7, regra 4).',
            '    append-only: true',
            '    mutable-fields: [status, last-reviewed]'
        ].join('\n') +
        '\n'
    )
}
```

6. Em `runInit`, `kinds` passa a incluir `REL` no estágio `production`:

```typescript
const kinds: Kind[] =
    options.stage === 'solo'
        ? ['ADR', 'DA', 'TDR']
        : options.stage === 'production'
          ? ['ADR', 'DA', 'TDR', ...REQUIREMENT_KINDS, 'REL']
          : ['ADR', 'DA', 'TDR', ...REQUIREMENT_KINDS]
```

7. Em `values`, dois campos novos. O `??` não é enfeite: `paths` só ganha a
   chave `REL` no estágio `production`, então fora dele `paths.REL` é
   `undefined` em tempo de execução mesmo o tipo dizendo `string`.

```typescript
    RELEASES_BLOCK: releasesBlock(options.owner, paths.REL ?? DEFAULT_PATHS.REL, options.stage),
    HISTORY_CODEOWNERS:
      options.stage === 'production'
        ? `CHANGELOG.md    ${options.owner}\ndocs/deprecations.md    ${options.owner}\ndocs/releases/    ${options.owner}\ndocs/migrations/    ${options.owner}\n`
        : '',
```

8. Generalize a função que insere bloco no `.ownership.yml` existente. Troque
   `declareRequirements` por:

```typescript
/**
 * Acrescenta um bloco de artefatos a um `.ownership.yml` que já existe.
 * Nada é reescrito: o bloco entra imediatamente antes de `generated:`, que é a
 * primeira chave depois de `artifacts:` no template. Sem essa âncora — um
 * arquivo reorganizado à mão — o init não adivinha: ele diz o que falta e
 * deixa a edição para quem é dono do arquivo.
 */
function declareArtifacts(
    root: string,
    options: InitOptions,
    result: InitResult,
    block: string,
    what: string
): void {
    const file = join(root, OWNERSHIP_PATH)
    const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
    const anchor = '\ngenerated:'

    if (!source.includes(anchor)) {
        result.notInstalled.push(
            `${what} em ${OWNERSHIP_PATH} — âncora \`generated:\` não encontrada; ` +
                'declare-os à mão para que os artefatos tenham dono'
        )
        return
    }

    result.created.push(`${OWNERSHIP_PATH} (${what})`)
    if (options.dryRun) return
    writeFileSync(file, source.replace(anchor, `${block}\ngenerated:`), 'utf8')
}
```

E a chamada que existia vira:

```typescript
if (existing && faltando.length > 0) {
    declareArtifacts(
        root,
        options,
        result,
        values.REQUIREMENTS_BLOCK,
        'artefatos RF, RNF e RN'
    )
}
```

9. No bloco `if (options.stage === 'production')`, depois dos contratos:

```typescript
if (options.stage === 'production') {
    for (const contract of CONTRACTS) {
        writeIfAbsent(
            root,
            contract.path,
            template(contract.template, values),
            options,
            result
        )
    }

    // Subir de estágio: o REL precisa ser declarado num `.ownership.yml` que
    // já existe, senão a release note nasce sem dono — e artefato órfão não é
    // enforceável (spec §3), nem congelável por HK-1.
    if (
        existing &&
        !existing.artifacts.some(artifact => artifact.idPrefix === 'REL')
    ) {
        declareArtifacts(
            root,
            options,
            result,
            values.RELEASES_BLOCK,
            'artefato REL'
        )
    }

    for (const item of HISTORY) {
        writeIfAbsent(
            root,
            item.path,
            template(item.template, values),
            options,
            result
        )
    }
    ensureDirectory(root, paths.REL ?? DEFAULT_PATHS.REL, options, result)
    for (const dir of HISTORY_DIRS) ensureDirectory(root, dir, options, result)
}
```

- [ ] **Step 7: Rodar e ver passar**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Esperado: PASS. Se `test/cli/init.test.ts` acusar `notInstalled` não vazio no
teste antigo da linha 350 (`production diz que a Fase 6 ainda não vem junto`),
**apague esse teste**: ele afirmava exatamente o que esta task desfaz, e os
testes novos do Step 1 cobrem o lugar dele.

Prove também num repositório descartável, sem inventar nada:

```bash
docker compose exec toolkit sh -c 'rm -rf /tmp/prova && mkdir -p /tmp/prova && cd /tmp/prova && LIVING_DOCS_REPO_ROOT=/tmp/prova node /opt/living-docs/src/cli/index.ts init --stage production --owner @prova && LIVING_DOCS_REPO_ROOT=/tmp/prova node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"'
```

Esperado: a lista de criados inclui `CHANGELOG.md`, `docs/deprecations.md`,
`docs/releases/` e `docs/migrations/`; **nenhuma** linha `não instalado`; e
`validate=0`.

- [ ] **Step 8: Commit**

```bash
git add src/docs/schema.ts src/cli/init.ts templates/ test/cli/init.test.ts
git commit -m "feat(RF-0009): production instala o rastro histórico e declara REL"
```

`HK-5` pergunta por `docs/requirements/functional.md` — viajou na Task 1, com
`RF-0009`.

---

### Task 7: Dogfooding — este repositório ganha rastro histórico

**Objetivo:** O toolkit passa a cumprir o que exige. `CHANGELOG.md` real,
`consumer-visible-paths` real, `watches` apontando o changelog, `REL`
declarado, e um teste que impede as duas listas de derivarem.

**Files:**

- Create: `CHANGELOG.md`
- Create: `docs/deprecations.md`
- Create: `docs/releases/.gitkeep`
- Create: `docs/migrations/.gitkeep`
- Modify: `docs/.ownership.yml`
- Modify: `CODEOWNERS`
- Test: `test/docs/release-history.test.ts`

**Interfaces:**

- Consome: `loadOwnership` e `toolkitRoot`.
- Produz: `consumer-visible-paths` não vazio neste repositório — o que faz
  `CI-6` sair do estado inerte.

**Requisitos:**

- Os globs de `consumer-visible-paths` e os `code` das regras marcadas
  `consumer-visible: true` são **o mesmo conjunto**, e um teste cobra isso
  (`ADR-0006`, "o que se aceita perder").
- Nada aqui é adivinhado: a lista de caminhos públicos vem da seção "O que é
  público" de `docs/contracts/versioning-policy.md`.
- `CHANGELOG.md` sem frontmatter; `docs/deprecations.md` com.

**`HK-5`:** este commit toca `docs/**` e a raiz, nenhum caminho vigiado de
código. A pergunta não deve aparecer. Se aparecer, algum arquivo de `src/`
entrou no `git add` por engano.

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/docs/release-history.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadOwnership } from '../../src/config/ownership.ts'
import { unreleasedEntries } from '../../src/checks/ci6-changelog-required.ts'
import { toolkitRoot } from '../../src/core/roots.ts'

const ROOT = toolkitRoot()
const config = loadOwnership(ROOT)

test('RN-0013: este repositório declara o que é visível ao consumidor', () => {
    assert.ok(
        config.consumerVisiblePaths.length > 0,
        'consumer-visible-paths vazio: CI-6 estaria instalado e inerte'
    )
})

test('ADR-0006: as duas listas do mecanismo concordam, e um teste as impede de derivar', () => {
    const gatilhos = new Set(config.consumerVisiblePaths)
    const vigiados = new Set(
        config.watches
            .filter(watch => watch.consumerVisible)
            .map(watch => watch.code)
    )

    assert.deepEqual(
        [...vigiados].sort(),
        [...gatilhos].sort(),
        'consumer-visible-paths e as regras `consumer-visible: true` derivaram — CI-6 e HK-5 passariam a cobrar coisas diferentes'
    )
})

test('ADR-0006: alguma regra de watches diz onde a entrada deveria estar', () => {
    const alvos = new Set(
        config.watches
            .filter(watch => watch.consumerVisible)
            .map(watch => watch.doc)
    )
    assert.deepEqual([...alvos], ['CHANGELOG.md'])
})

test('RN-0013: o CHANGELOG é voltado ao consumidor — Keep a Changelog, sem frontmatter', () => {
    const source = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8')

    assert.doesNotMatch(
        source,
        /^---$/m,
        'frontmatter de documentação viva não pertence ao CHANGELOG'
    )
    assert.match(source, /^## \[Unreleased\]$/m)
    assert.ok(
        unreleasedEntries(source).length > 0,
        'a Fase 6 muda o contrato público: Unreleased não pode estar vazio'
    )
})

test('RN-0015: a tabela de depreciações cobra as quatro coisas', () => {
    const source = readFileSync(join(ROOT, 'docs/deprecations.md'), 'utf8')
    const header = source
        .split('\n')
        .find(line => line.trim().startsWith('| O que |'))

    assert.ok(header, 'docs/deprecations.md sem a tabela')
    for (const coluna of [
        'Anunciado em',
        'Removido em',
        'Substituto',
        'Guia de migração'
    ]) {
        assert.ok(
            header.includes(coluna),
            `a tabela precisa da coluna "${coluna}"`
        )
    }
})

test('RN-0001: o rastro histórico tem dono no CODEOWNERS, como todo artefato', () => {
    const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8')
    for (const path of [
        'CHANGELOG.md',
        'docs/deprecations.md',
        'docs/releases/',
        'docs/migrations/'
    ]) {
        assert.match(
            codeowners,
            new RegExp(
                `^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+@\\S+$`,
                'm'
            ),
            `${path} sem dono`
        )
    }
})

test('REL está declarado, para que HK-1 congele release note publicada', () => {
    const rel = config.artifacts.find(artifact => artifact.idPrefix === 'REL')
    assert.ok(rel)
    assert.equal(rel?.appendOnly, true)
    assert.equal(rel?.skill, 'release-historian')
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/docs/release-history.test.ts
```

Esperado: FAIL — `CHANGELOG.md` não existe e `consumer-visible-paths` está
vazio.

- [ ] **Step 3: Escrever `CHANGELOG.md`**

Na raiz. As entradas descrevem o que a Fase 6 já mudou no contrato público até
aqui — nada de "adicionado `src/git/diff.ts`", que é narrativa de código:

```markdown
# Changelog

Este arquivo é voltado a quem **consome** o `living-docs`. Teste único: se a
entrada só faz sentido para quem escreveu o código, ela não pertence aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

A entrada nasce no PR que causa a mudança, não na véspera da release.

## [Unreleased]

### Added

- Subcomando `living-docs changelog --base <ref>`: falha quando o diff da
  branch toca um caminho declarado em `consumer-visible-paths` e a entrada de
  `## [Unreleased]` não viaja junto (`CI-6`).
- Rótulo de exceção `Changelog: none — <razão>` na mensagem de commit, para a
  mudança que de fato não é visível a quem consome. Sem razão, não conta.
- Hook `HK-7`: marcador de atalho novo (`TODO`, `FIXME`, supressão de tipo ou
  de lint, teste ignorado) sem `TDR-nnnn` por perto gera lembrete. Nunca
  bloqueio.
- `living-docs init --stage production` passa a instalar `CHANGELOG.md`,
  `docs/deprecations.md`, `docs/releases/` e `docs/migrations/`, e a declarar o
  artefato `REL` no `docs/.ownership.yml`.
- Prefixo de ID `REL` para release note, com os estados `draft` e `published`.
  Publicada, ela é congelada por `HK-1`.

### Changed

- `living-docs validate` passa a apontar `living-docs changelog` quando o
  repositório declara `consumer-visible-paths` — ponteiro, não achado: o código
  de saída não muda.
- A lista de "não instalado" de `--stage production` fica vazia: o estágio
  passa a cobrir as Fases 5 e 6 da spec por completo.
```

- [ ] **Step 4: Escrever `docs/deprecations.md`**

```markdown
---
title: Depreciações
owner: '@Danrley-Ruan-Saquetti'
trigger: >
    Quando algo publicado é anunciado para remoção, e quando uma depreciação
    anunciada é de fato removida.
last-reviewed: 2026-08-26
---

# Depreciações

Uma depreciação registra quatro coisas, sem exceção: a data do anúncio, a
versão ou data de remoção, o substituto, e o link para o guia de migração
(`RN-0015`). Faltando qualquer uma, não é depreciação — é quebra de
compatibilidade, e passa por um ADR.

O que é público, e portanto pode ser depreciado, está em
`docs/contracts/versioning-policy.md`.

| O que | Anunciado em | Removido em | Substituto | Guia de migração | Status |
| ----- | ------------ | ----------- | ---------- | ---------------- | ------ |

Nenhuma depreciação anunciada até aqui. A tabela vazia é informação: nada do
que é público mudou de significado desde a primeira versão.

<!-- Skill dona: release-historian. -->
```

- [ ] **Step 5: Criar os diretórios e declarar tudo**

```bash
docker compose exec -w /workspace toolkit sh -c 'mkdir -p docs/releases docs/migrations && : > docs/releases/.gitkeep && : > docs/migrations/.gitkeep'
```

Em `docs/.ownership.yml`, acrescente o artefato `REL` depois do bloco de `RN`:

```yaml
- id-prefix: REL
  path: docs/releases/
  owner: '@Danrley-Ruan-Saquetti'
  skill: release-historian
  # Release note publicada é congelada por HK-1 (spec §5, SK-7, regra 4).
  # É por isso que REL tem família de IDs e CHANGELOG.md não: HK-1 só
  # congela caminho que `findArtifactRule` resolve.
  append-only: true
  mutable-fields: [status, last-reviewed]
```

Em `watches`, depois da última regra existente:

```yaml
# CI-6 (mecanismo 1 na fronteira com quem consome). Os `code` daqui e a lista
# `consumer-visible-paths` abaixo são o mesmo conjunto de propósito, e
# test/docs/release-history.test.ts impede que derivem: são dois momentos —
# o lembrete na edição e a barreira no PR.
- code: 'src/cli/**'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'subcomando, opção e código de saída são contrato público (docs/contracts/versioning-policy.md)'

- code: 'src/checks/catalog.ts'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'os IDs dos checks são públicos e não mudam de significado'

- code: 'src/config/ownership.ts'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'o esquema do .ownership.yml com version 1 é contrato de quem instala'

- code: 'plugin/**'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'IDs de skill, hook e comando são públicos'

- code: 'templates/**'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'é o que `init` escreve no repositório de quem instala'

- code: 'bin/living-docs'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'a ponte host→container é como o toolkit é invocado'
```

E troque a última linha do arquivo:

```yaml
consumer-visible-paths:
    - 'src/cli/**'
    - 'src/checks/catalog.ts'
    - 'src/config/ownership.ts'
    - 'plugin/**'
    - 'templates/**'
    - 'bin/living-docs'
```

Em `CODEOWNERS`, acrescente:

```
CHANGELOG.md    @Danrley-Ruan-Saquetti
docs/deprecations.md    @Danrley-Ruan-Saquetti
docs/releases/    @Danrley-Ruan-Saquetti
docs/migrations/    @Danrley-Ruan-Saquetti
```

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Esperado: PASS, `validate=0` (agora **com** a linha do ponteiro para
`living-docs changelog`) e `drift=0`.

- [ ] **Step 7: Commit**

```bash
git add CHANGELOG.md docs/deprecations.md docs/releases/.gitkeep docs/migrations/.gitkeep docs/.ownership.yml CODEOWNERS test/docs/release-history.test.ts
git commit -m "docs(RN-0013, RN-0015): o toolkit passa a cumprir o rastro histórico que exige"
```

---

### Task 8: `SK-7` release-historian e `CM-7` `/release`

**Objetivo:** A skill dona dos quatro artefatos e o comando que a aciona.

**Files:**

- Create: `plugin/skills/release-historian/SKILL.md`
- Create: `plugin/commands/release.md`
- Modify: `plugin/.claude-plugin/plugin.json`
- Modify: `test/plugin/manifest.test.ts`
- Modify: `test/plugin/authoring.test.ts`
- Modify: `CONTRIBUTING.md`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consome: as convenções da spec §11, verificadas por
  `test/plugin/authoring.test.ts` (varredura automática de `plugin/skills/`).
- Produz: a skill `release-historian`, referenciada por `docs/.ownership.yml`
  (Task 7) — sem ela, `test/plugin/manifest.test.ts` já estaria falhando.

**Requisitos:**

- Estrutura obrigatória da spec §11, na ordem: `## Overview`,
  `## Do que você é dono`, `## Quando usar / quando não`, `## Procedimento`,
  `## Fronteiras`, `## Checklist`.
- `description` > 120 caracteres, contendo "Use", em linguagem de sintoma.
- Checklist com ≥ 6 caixas, cada uma nomeando `CI-n`, `HK-n` ou "humana".
- **Nada do conteúdo dos artefatos dentro da skill** — aponte os templates.
- `plugin/commands/release.md` com menos de 25 linhas.

**`HK-5`:** `plugin/skills/**` pede `CONTRIBUTING.md`, e `plugin/**` agora pede
`CHANGELOG.md` (Task 7). Os dois estão no `git add` deste commit.

- [ ] **Step 1: Escrever `plugin/skills/release-historian/SKILL.md`**

```markdown
---
name: release-historian
description: >
    Use quando algo mudar para quem consome este software — endpoint, opção de
    linha de comando, formato de saída, comportamento observável —, quando for
    hora de publicar uma versão, quando alguém perguntar "o que mudou na versão
    X?", "isso quebra quem já usa?", "quando isso vai ser removido?", "por onde
    eu migro?", "isso precisa de entrada no CHANGELOG?", ou quando o CI reclamar
    que falta a entrada. Também ao anunciar ou concluir uma depreciação, e ao
    escrever o guia de migração de uma mudança quebra-compatibilidade.
---

# release-historian — dono do rastro histórico

## Overview

Quatro artefatos, um público só: quem está do lado de fora. O `CHANGELOG.md`
diz o que mudou, a release note dá a moldura de uma versão, `docs/deprecations.md`
avisa o que vai sair, e `docs/migrations/` ensina a atravessar.

O erro caro aqui tem nome: derivar o CHANGELOG do `git log`. O resultado é o
documento que narra o código — exatamente o que a spec §13 recusa — e ele
apodrece rápido, porque ninguém de fora consegue usá-lo para decidir se
atualiza.

Os caminhos vêm de `docs/.ownership.yml`; não assuma. `consumer-visible-paths`
diz o que é visível ao consumidor neste projeto, e a regra de `watches` marcada
`consumer-visible: true` diz onde a entrada mora.

## Do que você é dono

| Artefato               | O que é                            | Forma                                                            |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `CHANGELOG.md`         | O que mudou, para quem consome     | Arquivo único, Keep a Changelog, `Unreleased` no topo            |
| `docs/releases/`       | A moldura de cada versão publicada | Um arquivo por versão, `REL-nnnn`, congelado depois de publicado |
| `docs/deprecations.md` | O que foi anunciado para remoção   | Arquivo único, tabela, mutável                                   |
| `docs/migrations/`     | Como atravessar cada quebra        | Um arquivo por migração                                          |

As sementes estão em `templates/changelog.md`, `templates/release-note.md`,
`templates/deprecations.md` e `templates/migration.md`. Não reproduza o
conteúdo delas aqui.

## Quando usar / quando não

**Use** quando o diff toca `consumer-visible-paths`; quando uma versão vai ser
publicada; quando algo publicado é anunciado para remoção; quando uma mudança
quebra compatibilidade.

**Não use** para registrar mudança interna. Refatoração, renomeação de arquivo,
teste novo e ajuste de mensagem não têm entrada — o caminho ali é o rótulo
`Changelog: none — <razão>`, e a razão é obrigatória.

**O custo de usar à toa** é a entrada que ninguém consegue ler: um CHANGELOG
com trinta linhas de detalhe interno esconde a única linha que importava, e o
consumidor para de ler. `CI-6` cobra a existência da entrada; que ela seja
legível é humano.

## Procedimento

1. **Descubra o que é visível ao consumidor neste projeto.** Leia
   `consumer-visible-paths` no `docs/.ownership.yml`. Se estiver vazio, o
   projeto ainda não declarou a fronteira: essa é a primeira conversa, e ela é
   humana.
2. **Escreva a entrada no PR que causa a mudança**, sob `## [Unreleased]`, na
   subseção certa (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
   `Security`). Uma frase, do ponto de vista de quem usa.
3. **Aplique o teste único:** se a entrada só faz sentido para quem escreveu o
   código, apague-a e use `Changelog: none — <razão>` na mensagem de commit.
4. **Depreciação exige quatro coisas** — data do anúncio, versão ou data de
   remoção, substituto, link para o guia de migração. Faltando qualquer uma,
   **pare** e traga a lacuna: não registre depreciação pela metade.
5. **Guia de migração por mudança quebra-compatibilidade**, em
   `docs/migrations/`, apontando o ADR que a decidiu. Quebra sem ADR é decisão
   sem porquê — o caminho é `/adr` antes.
6. **Release note é derivada do CHANGELOG**, não escrita de novo: mova as
   entradas de `Unreleased` para a seção da versão, e escreva só a moldura.
7. **Nasce `draft`.** Publicar é ato humano — `HK-3` intercepta, e a resposta
   não é sua. Depois de `published`, `HK-1` congela o arquivo.

## Fronteiras

| É seu                                    | Não é seu                                                            |
| ---------------------------------------- | -------------------------------------------------------------------- |
| A entrada de CHANGELOG e a subseção dela | Decidir o que é público (é `contract-keeper`)                        |
| A release note e o congelamento dela     | Promover para `published` (é humano)                                 |
| A tabela de depreciações                 | A política de versionamento (é `contract-keeper`)                    |
| O guia de migração                       | O ADR que decidiu a quebra (é `decision-recorder`)                   |
| Recusar depreciação incompleta           | Bloquear a mudança que não tem entrada (`CI-6` falha, você não nega) |
| Apontar `Changelog: none` como saída     | Escrever a razão no lugar de quem decidiu                            |

## Checklist

- [ ] A entrada nasceu no PR que causou a mudança, não depois — verificação: `CI-6`.
- [ ] O doc marcado `consumer-visible: true` viajou no mesmo diff — verificação: `CI-6` (e `HK-5` pergunta antes).
- [ ] A entrada é legível por quem consome, e não narra o código — verificação: humana.
- [ ] Quando não há entrada, existe `Changelog: none — <razão>` com razão escrita — verificação: `CI-6`.
- [ ] Toda depreciação registrada tem as quatro coisas — verificação: humana (`RN-0015`).
- [ ] Toda quebra de compatibilidade tem guia de migração apontando o ADR — verificação: humana.
- [ ] A release note nasceu `draft` e foi promovida por uma pessoa — verificação: `HK-3`.
- [ ] Nenhuma release note publicada foi editada no corpo — verificação: `HK-1`.
- [ ] Nenhum atalho novo ficou sem `TDR-nnnn` — verificação: `HK-7` lembra; registrar é humano.
```

- [ ] **Step 2: Escrever `plugin/commands/release.md`**

```markdown
---
description: Prepara uma versão — deriva a release note do CHANGELOG e move as entradas de Unreleased.
argument-hint: '[versão]'
---

Acione a skill `release-historian` para preparar a versão `$ARGUMENTS`.

A release note é **derivada** do `CHANGELOG.md`, nunca escrita de novo: as
entradas de `## [Unreleased]` viram a seção da versão, e a nota fica com a
moldura — destaques, o que exige atenção de quem atualiza, depreciações
anunciadas.

Ela nasce `status: draft`. Publicar é ato humano: `HK-3` intercepta a promoção
e a resposta não é sua. Depois de `published`, `HK-1` congela o arquivo.
```

- [ ] **Step 3: Atualizar os testes do plugin**

Em `test/plugin/manifest.test.ts`, no teste dos comandos:

```typescript
const esperados = [
    'adr.md',
    'open-decision.md',
    'debt.md',
    'docs-setup.md',
    'term.md',
    'release.md'
]
```

e, no laço, a expressão que exige o apontamento de skill:

```typescript
assert.match(
    source,
    /decision-recorder|living-docs-bootstrap|glossary-keeper|release-historian/,
    `${nome} deve apontar a skill que aciona`
)
```

Troque também o título do teste, de "os cinco comandos" para "os seis comandos".

Em `test/plugin/authoring.test.ts`, acrescente ao final:

```typescript
test('release-historian: a description nomeia os sintomas de mudança visível, versão e depreciação', () => {
    const description = String(
        parseFrontmatter(skillSource('release-historian'))?.data.description ??
            ''
    )
    assert.match(description, /Use quando/i)
    for (const sintoma of ['consome', 'versão', 'migr', 'depreci']) {
        assert.ok(
            description.toLowerCase().includes(sintoma),
            `a description deveria conter o sintoma "${sintoma}"`
        )
    }
})

test('release-historian não duplica o conteúdo dos artefatos que governa', () => {
    const source = skillSource('release-historian')
    assert.match(
        source,
        /templates\/changelog\.md/,
        'ela deve apontar para o template, não copiá-lo'
    )
    assert.match(
        source,
        /templates\/migration\.md/,
        'os quatro templates, porque são quatro artefatos'
    )
    assert.doesNotMatch(
        source,
        /^## \[Unreleased\]$/m,
        'a skill não deve conter o CHANGELOG deste repositório'
    )
})
```

- [ ] **Step 4: Atualizar o manifesto do plugin**

Em `plugin/.claude-plugin/plugin.json`, na `description`, troque "Fases 0–5" por
"Fases 0–6" e acrescente "rastro histórico voltado a quem consome" à
enumeração. `version` não muda: a política de versionamento não amarra a versão
do plugin a fase de implantação.

- [ ] **Step 5: Acrescentar a linha em `CONTRIBUTING.md`**

Na tabela "Onde a verdade mora", depois da linha dos contratos:

```markdown
| O que mudou para quem usa | `CHANGELOG.md` e `docs/releases/` |
```

- [ ] **Step 6: Acrescentar a entrada de CHANGELOG**

Em `## [Unreleased]` / `### Added` de `CHANGELOG.md`:

```markdown
- Skill `release-historian` e comando `/release [versão]`, donos do
  `CHANGELOG.md`, das release notes, das depreciações e dos guias de migração.
```

- [ ] **Step 7: Rodar e ver passar**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Esperado: PASS e `validate=0`.

- [ ] **Step 8: Commit**

```bash
git add plugin/skills/release-historian/SKILL.md plugin/commands/release.md plugin/.claude-plugin/plugin.json test/plugin/manifest.test.ts test/plugin/authoring.test.ts CONTRIBUTING.md CHANGELOG.md
git commit -m "feat(SK-7, CM-7): release-historian e /release, donos do rastro histórico"
```

`HK-5` vai perguntar por `CONTRIBUTING.md` e `CHANGELOG.md`. Os dois estão no
`git add`. Diga isso e siga.

---

### Task 9: Índices, contrato público e a prova de ponta a ponta

**Objetivo:** Fechar a fase onde ela é lida — README, Definition of Done,
workflow, contrato de erros, política de versionamento, contrato do agente e
backlog — e provar `CI-6` contra o git de verdade, não só contra fatos
inventados.

**Files:**

- Modify: `README.md`
- Modify: `docs/definition-of-done.md`
- Modify: `templates/definition-of-done.md`
- Modify: `.github/workflows/living-docs.yml`
- Modify: `docs/contracts/errors.md`
- Modify: `docs/contracts/versioning-policy.md`
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`
- Modify: `test/acceptance/spec-criteria.test.ts`
- Modify: `docs/superpowers/plans/BACKLOG-fases-3-7.md`

**Interfaces:**

- Consome: tudo que as Tasks 2–8 produziram.
- Produz: nenhuma API nova.

**Requisitos:**

- O workflow precisa de `fetch-depth: 0` no `actions/checkout`, senão a base do
  diff não existe no clone e o passo sai com 2 (`ADR-0006`).
- Nenhum critério de aceite numerado fecha aqui; o teste novo cobre o
  **mecanismo**, não um critério.
- `docs/contracts/checks.gen.md` não se edita — ele já foi regerado na Task 4 e
  não muda nesta.

**`HK-5`:** `templates/**` pede `CHANGELOG.md` (Task 7), e ele está no
`git add`.

- [ ] **Step 1: Escrever o teste do mecanismo**

Acrescente ao final de `test/acceptance/spec-criteria.test.ts`:

```typescript
test('mecanismo da Fase 6: mudança visível ao consumidor é cobrada, e a razão escrita libera', () => {
    const OWNERSHIP = [
        'version: 1',
        'artifacts:',
        '  - id-prefix: ADR',
        '    path: docs/decisions/adr/',
        '    owner: "@time"',
        '    skill: decision-recorder',
        'watches:',
        '  - code: "src/api/**"',
        '    doc: CHANGELOG.md',
        '    consumer-visible: true',
        'consumer-visible-paths: ["src/api/**"]',
        ''
    ].join('\n')

    const CHANGELOG =
        '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- `GET /pedidos` responde em centavos.\n'
    const NUL = String.fromCharCode(0)

    const git =
        (changed: string[], messages: string[]) =>
        (args: readonly string[]): string =>
            args.includes('diff')
                ? changed.join(NUL) + NUL
                : messages.join(`${NUL}\n`) + NUL + '\n'

    withTempRepo(
        { 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG },
        root => {
            // sem a entrada no diff: reprova, nomeando o arquivo e o caminho vigiado
            const reprovado = runChangelog(
                root,
                'base',
                git(['src/api/pedidos.ts'], ['feat: centavos'])
            )
            assert.equal(reprovado.exitCode, 1)
            assert.equal(reprovado.findings[0]?.file, 'CHANGELOG.md')

            // com a entrada no mesmo diff: aprova
            assert.equal(
                runChangelog(
                    root,
                    'base',
                    git(
                        ['src/api/pedidos.ts', 'CHANGELOG.md'],
                        ['feat: centavos']
                    )
                ).exitCode,
                0
            )

            // sem entrada, mas com a razão escrita no histórico: aprova
            assert.equal(
                runChangelog(
                    root,
                    'base',
                    git(
                        ['src/api/pedidos.ts'],
                        [
                            'refactor: renomeia interno\n\nChangelog: none — nada muda para quem consome'
                        ]
                    )
                ).exitCode,
                0
            )
        }
    )
})

test('mecanismo da Fase 6: atalho novo sem TDR é lembrado, nunca bloqueado', () => {
    withTempRepo({}, root => {
        mkdirSync(join(root, 'src'), { recursive: true })
        writeFileSync(
            join(root, 'src/cobranca.ts'),
            'export const taxa = 0.05;\n',
            'utf8'
        )

        const decision = decideHk7(
            {
                tool_name: 'Edit',
                tool_input: {
                    file_path: 'src/cobranca.ts',
                    old_string: 'export const taxa = 0.05;',
                    new_string:
                        '// FIXME: arredondamento errado em centavos\nexport const taxa = 0.05;'
                }
            },
            { root, hostRoots: [root] }
        )

        assert.equal(
            decision.action,
            'remind',
            'HK-7 é additionalContext: lembra e devolve o controle'
        )
        assert.match(
            decision.action === 'remind' ? decision.context : '',
            /TDR/
        )
    })
})
```

Acrescente ao topo do arquivo os imports que faltam:

```typescript
import { runChangelog } from '../../src/cli/changelog.ts'
import { decideHk7 } from '../../src/hooks/hk7-shortcut-debt.ts'
```

- [ ] **Step 2: Atualizar a Definition of Done**

São três edições em `docs/definition-of-done.md`, e as **mesmas três** em
`templates/definition-of-done.md`.

Uma caixa nova, depois da de artefato gerado:

```markdown
- [ ] A mudança visível ao consumidor levou a entrada em `## [Unreleased]`, ou a razão escrita no commit — verificação: `CI-6` (`living-docs changelog --base <ref>`).
```

A caixa de atalho consciente, que já existe na linha 20 dos dois arquivos,
passa a nomear o hook que a lembra — **não crie uma caixa nova para isso**:

```markdown
- [ ] O atalho consciente virou `TDR-nnnn` com gatilho de pagamento observável — verificação: `HK-7` lembra; registrar é humana.
```

E a última caixa passa a nomear o comando novo:

```markdown
- [ ] `npm test`, `npm run typecheck`, `living-docs validate`, `living-docs drift` e `living-docs changelog --base <ref>` passam no container — verificação: `CI-1`, `CI-2`, `CI-3`, `CI-5` e `CI-6`, rodados pelo workflow do repositório.
```

- [ ] **Step 3: Atualizar o workflow**

Em `.github/workflows/living-docs.yml`, o checkout ganha profundidade:

```yaml
- uses: actions/checkout@v4
  with:
      # CI-6 compara <base>...HEAD; um clone raso não tem a base (ADR-0006).
      fetch-depth: 0
```

E um passo novo, depois do de `drift`:

```yaml
- name: CI-6 — entrada de CHANGELOG
  if: github.event_name == 'pull_request'
  run: >
      docker compose run --rm -w /workspace toolkit
      node /opt/living-docs/src/cli/index.ts changelog
      --base ${{ github.event.pull_request.base.sha }}
```

O `if` não é preguiça: em `push` não existe "a base do PR", e inventar uma
seria o check medindo o que consegue em vez do que deve.

- [ ] **Step 4: Atualizar o contrato público**

Em `docs/contracts/errors.md`, três linhas mudam e uma nasce:

- `EXIT-0`: acrescente "; `changelog` sem achado" à coluna "Quando ocorre".
- `EXIT-1`: acrescente "; ou `changelog` com mudança visível ao consumidor sem
  entrada nem rótulo de exceção".
- `UNKNOWN-COMMAND`: a lista passa a ser "`validate`, `drift`, `changelog` ou
  `init`".
- Uma linha nova, antes de `UNKNOWN-COMMAND`:

```markdown
| BASE-UNRESOLVED | O diff do PR não pôde ser lido | `changelog` sem `--base`, com base que não resolve, ou em clone raso que não contém a base | exit 2, mensagem em stderr começando por `living-docs:` | sim | active |
```

Em `docs/contracts/versioning-policy.md`:

- Na seção "O que é público", a linha dos subcomandos passa a listar
  `validate`, `drift`, `changelog` e `init`, e acrescente um item:

```markdown
- O rótulo de exceção `Changelog: none — <razão>` e as chaves
  `consumer-visible-paths` e `watches[].consumer-visible` do
  `docs/.ownership.yml` (`ADR-0006`).
```

- Substitua inteiro o parágrafo que começa com "Enquanto a Fase 6 não existir"
  por:

```markdown
O rastro está completo: `CHANGELOG.md` registra o anúncio, `docs/deprecations.md`
guarda as quatro coisas exigidas, `docs/migrations/` recebe o guia, e
`docs/releases/` a nota da versão que removeu. Skill dona: `release-historian`.
```

- [ ] **Step 5: Atualizar o README**

- O parágrafo de abertura passa a dizer "Fases 0–6", e acrescenta ao rol: os
  checks `CI-6`, os hooks `HK-7`, e o rastro histórico (`SK-7`).
- Em "Uso", uma linha nova depois de `drift`:

```bash
./bin/living-docs changelog --base origin/master   # roda CI-6: a mudança visível ao consumidor levou entrada?
```

- Em "Estágios de maturidade", `production` passa a acrescentar "a moldura de
  contratos **e** o rastro histórico (CHANGELOG, release notes, depreciações e
  guias de migração)", e some a frase "e diz que a Fase 6 ainda não vem junto".
- Em "Plugin do Claude Code", acrescente `release-historian` (`/release`) e
  `HK-7`.
- Em "O que está fora", a lista passa a ser: `AG-1`, `HK-6`, `CI-4`, `CI-7`,
  `CI-8`, `CM-5` — Fase 7 da spec.
- No parágrafo do critério 5, nada muda: a segunda metade continua sendo
  `CI-7`, Fase 7.

- [ ] **Step 6: Atualizar o contrato do agente**

Em `CLAUDE.md`, na seção `## Política`, depois da linha "Documento e código
viajam juntos":

```markdown
- **Mudança visível a quem consome viaja com a entrada de `CHANGELOG.md`** —
  ou com a razão escrita no commit. `CI-6` cobra; o formato do rótulo está no
  contrato.
```

E na seção `## Comandos`, acrescente `/release` à lista e `release-historian`
ao rol de skills selecionadas pela `description`.

Duas linhas, só índice e política — nenhuma afirmação factual mora ali
(`RN-0010`).

- [ ] **Step 7: Acrescentar a entrada de CHANGELOG**

Em `## [Unreleased]` / `### Changed`:

```markdown
- O workflow do repositório passa a rodar `CI-6` em pull request, e o
  `actions/checkout` passa a exigir `fetch-depth: 0` — um clone raso não
  contém a base do diff.
```

E em `### Added`:

```markdown
- Código de erro `BASE-UNRESOLVED`: `changelog` sem `--base`, com base que não
  resolve, ou em clone raso.
```

- [ ] **Step 8: Provar `CI-6` contra o git de verdade**

Os testes provam o check com fatos escritos à mão. Este passo prova o caminho
inteiro — git, CLI, configuração — numa branch **descartável**. Nada em
`master` muda.

```bash
git switch -c prova-ci6
printf '\n' >> bin/living-docs
git add bin/living-docs
git commit -m "test(CI-6): commit de prova, descartável"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts changelog --base master; echo "exit=$?"
```

Esperado: `exit=1`, com achado em `CHANGELOG.md` nomeando `bin/living-docs`.
Agora o rótulo:

```bash
git commit --allow-empty -m "$(printf 'test(CI-6): rotulo de excecao\n\nChangelog: none — commit descartável de verificação')"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts changelog --base master; echo "exit=$?"
```

Esperado: `exit=0`. E o descarte:

```bash
git switch master
git branch -D prova-ci6
git status --short
```

Esperado: `git status` limpo. Se `bin/living-docs` aparecer modificado, a
mudança escapou da branch — reverta com `git checkout -- bin/living-docs`.

- [ ] **Step 9: Atualizar o backlog**

Em `docs/superpowers/plans/BACKLOG-fases-3-7.md`:

1. Acrescente um bloco de estado no topo, no formato dos anteriores: a Fase 6
   está **implementada**, o plano é este arquivo, `ADR-0006` está `accepted` e
   `RF-0008`/`RF-0009`/`RN-0013`/`RN-0014`/`RN-0015` estão `active`, promovidos
   por ato humano (escreva isto **depois** da Task 10; se ela não acontecer,
   escreva o estado real).
2. Marque a seção "Fase 6" como **IMPLEMENTADA** e acrescente "O que o
   planejamento apurou", com pelo menos: (a) por que o rótulo de exceção virou
   `ADR-0006` em vez da `DA` que o backlog previa; (b) três pontos no diff e
   dois no log, e a razão de cada; (c) o gatilho vindo de
   `consumer-visible-paths` e o alvo de `watches`, com o teste que impede as
   duas listas de derivarem; (d) `REL` ganhou família de IDs **porque** `HK-1`
   só congela caminho que `findArtifactRule` resolve — e `CHANGELOG.md` não
   ganhou, pelo mesmo critério de `ADR-0004`.
3. Na seção "Fase 7", registre a herança: `src/git/diff.ts` existe e
   `CI-7` pode lê-lo se precisar do diff; `changelogChecks` é o terceiro
   agrupamento de checks e `CI-4` provavelmente entra em `validate`, não num
   subcomando, porque não precisa de estado externo — o que ele precisa é de
   `CheckContext.today`, e isso continua sendo pré-requisito a resolver
   **antes** de escrever o check.
4. Em "Dívidas e decisões abertas herdadas": `--stage production` passa a estar
   completo (`notInstalled` vazio); `--stage multi-team` continua não existindo
   e continua devendo nascer junto com a Fase 7; `DA-0002` continua aberta e
   continua sendo pré-condição de `CI-7`.
5. Em "Ordem sugerida daqui", risque a Fase 6 e promova a Fase 7 a próximo
   passo.

- [ ] **Step 10: Rodar tudo e commitar**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Esperado: PASS, `validate=0`, `drift=0`.

```bash
git add README.md docs/definition-of-done.md templates/definition-of-done.md .github/workflows/living-docs.yml docs/contracts/errors.md docs/contracts/versioning-policy.md CLAUDE.md CHANGELOG.md test/acceptance/spec-criteria.test.ts docs/superpowers/plans/BACKLOG-fases-3-7.md
git commit -m "docs(CI-6, HK-7, SK-7): o rastro histórico nos índices e no contrato público"
```

---

### Task 10: Promoção humana

**Objetivo:** Levar `ADR-0006` a `accepted` e `RF-0008`, `RF-0009`, `RN-0013`,
`RN-0014`, `RN-0015` a `active`. **Isto não é seu.** A skill escreve `draft`;
promover é ato humano (`RN-0005`), e `HK-3` intercepta com `ask`.

**Files:**

- Modify: `docs/decisions/adr/ADR-0006-diff-do-pr-e-rotulo-de-excecao.md`
- Modify: `docs/requirements/functional.md`
- Modify: `docs/requirements/rules.md`

**Interfaces:**

- Consome: os IDs da Task 1 e as citações plantadas pelas Tasks 2–9.
- Produz: os seis itens em estado final, exigíveis por `CI-3`.

**Requisitos:**

- Antes de propor a promoção, confira que cada item **já** tem quem o cite:
  `RF-0008` em `test/cli/changelog.test.ts` e `test/checks/registry.test.ts`;
  `RF-0009` em `test/cli/init.test.ts`; `RN-0013` em
  `test/checks/ci6-changelog-required.test.ts`,
  `test/docs/release-history.test.ts` e `src/checks/ci6-changelog-required.ts`;
  `RN-0014` em `test/hooks/hk7-shortcut-debt.test.ts` e
  `src/hooks/hk7-shortcut-debt.ts`; `RN-0015` em
  `test/docs/release-history.test.ts`. Sem citação, promover para `active` faz
  `CI-3` (regra 7) reprovar na hora.
- `ADR-0006` já nasceu com `relates-to` preenchido (Task 1). Depois de
  `accepted` o arquivo congela e `relates-to` não está na `mutable-fields`:
  consertar exigiria supersedir.
- `last-reviewed` só muda em arquivo que foi realmente revisto. Bump em massa é
  anti-requisito da spec §13.

- [ ] **Step 1: Confirmar que as citações existem**

```bash
docker compose exec toolkit sh -c 'grep -rn "RF-0008\|RF-0009\|RN-0013\|RN-0014\|RN-0015" test/ src/'
```

Esperado: ao menos uma ocorrência de cada, em arquivo **diferente** do
requisito. Citação dentro do próprio artefato não cobre nada (`CI-3`, regra 7).

- [ ] **Step 2: Propor a promoção — e deixar a resposta com quem decide**

Edite os seis estados: `status: draft` → `status: accepted` em `ADR-0006`;
`- **status:** draft` → `- **status:** active` em `RF-0008`, `RF-0009`,
`RN-0013`, `RN-0014` e `RN-0015`.

`HK-3` vai interceptar cada uma dessas edições com `ask`. **A resposta não é
sua.** Apresente o que a pessoa precisa para decidir — o que o ADR decide (de
onde vem o diff, qual é o rótulo, onde o check roda), o que se aceita perder
(as duas listas que precisam concordar, o `fetch-depth: 0`), e que os
requisitos já têm cobertura — e espere.

Se a pessoa recusar qualquer um deles, isso é um resultado legítimo: o item
continua `draft`, a Fase 6 continua entregue, e o backlog registra o estado
real. Não force, não contorne, e não "adiante" a promoção porque o plano
termina aqui.

- [ ] **Step 3: Rodar tudo e confirmar que o estado final passa**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Esperado: PASS, `validate=0`, `drift=0`. Se `CI-3` acusar `RN-0013 está active
e não é citada`, o Step 1 mentiu — a citação está no próprio arquivo, ou num
caminho fora de `cited-by`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/adr/ADR-0006-diff-do-pr-e-rotulo-de-excecao.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0006, RF-0008, RF-0009, RN-0013, RN-0014, RN-0015): promoção por ato humano"
```

Se a promoção não aconteceu, não invente o commit: volte à Task 9, Step 9, e
escreva no backlog o estado real ("`ADR-0006` segue `draft`").

---

## O que esta fase deliberadamente não faz

- **Não resolve `DA-0002`.** `CHANGELOG.md` e `docs/deprecations.md` entram na
  mesma categoria de `CONTRIBUTING.md`, da DoD, do glossary, do charter e dos
  contratos escritos: artefato com dono e sem família de IDs, fora de
  `artifacts:`. `docs/releases/` é a exceção, e a razão é mecânica, não
  estética — `HK-1` só congela caminho que `findArtifactRule` resolve, e a spec
  §7 exige que ele congele release note publicada. `DA-0002` continua aberta,
  pré-condição de `CI-7` (Fase 7).
- **Não cria `AG-1` nem `/docs-audit`.** É Fase 7, e é o agent que responde "o
  que este diff deveria ter atualizado e não atualizou" — pergunta diferente da
  que `CI-6` faz.
- **Não cria `CI-4` nem `CheckContext.today`.** O toolkit continua sem fonte de
  data injetável, e continua sendo pré-requisito da Fase 7. Nenhum código desta
  fase lê a data do sistema.
- **Não mede volume nem escreve entrada de CHANGELOG a partir do `git log`.**
  `CI-6` cobra a **existência** da entrada; que ela seja legível por quem
  consome é da `SK-7` e é humano. Contar entradas seria a métrica de volume
  documental que a spec §13 recusa.
- **Não paga `TDR-0001`.** `HK-1` continua congelando por arquivo, não por
  seção. O gatilho de pagamento segue sendo o primeiro PR que revogar um
  requisito — e a Task 6 acrescenta `REL` ao `HK-1` sem mudar isso.
- **Não muda `run-hook.sh`, `src/git/staged.ts` nem `src/exec/command.ts`.** O
  wrapper já distribui por nome de hook; `staged.ts` falha aberta porque quem o
  chama é hook; `command.ts` não falha aberta porque quem o chama é check.
  `diff.ts` nasce ao lado com a política do segundo. Mexer nos três seria
  melhoria de graça em código que funciona.
- **Não cria `--stage multi-team`.** Ele nasce junto com a Fase 7, não antes:
  estágio que instala moldura vazia é a wiki morta nascendo de fábrica.

