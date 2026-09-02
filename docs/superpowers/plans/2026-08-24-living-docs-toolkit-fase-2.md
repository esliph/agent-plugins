# Living Documentation Toolkit — DA-0001 + Fase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar `DA-0001` — separar a raiz do toolkit da raiz do repositório validado, para que o toolkit seja instalável em um projeto que não seja este — e entregar a **Fase 2** da spec: `SK-4` requirements-keeper (requisitos com IDs estáveis) e `CI-3` traceability (pares bidirecionais fechados, `RN` `active` coberta por citação).

**Antecedente:** `docs/superpowers/plans/2026-08-24-living-docs-toolkit-core.md` (Fases 0–1), implementado nos commits `5462dd5`…`4b3468f`. Este plano **continua** aquele: as Global Constraints de lá valem aqui na íntegra e não são repetidas linha a linha.

**Architecture:**

Duas mudanças de natureza diferente, nesta ordem porque a segunda herda a primeira.

1. **`DA-0001` é um problema de empacotamento, não de engine.** A engine já é parametrizada por raiz: `runInit(root, …)`, `runValidate(root)` e `decideHk1/3(payload, { root, … })` recebem o repositório como argumento, e `init.ts` resolve `templates/` por `import.meta.dirname` — ou seja, já lê o toolkit de onde o toolkit está. O acoplamento mora em três lugares e só neles: os defaults `?? '/app'` (`src/hooks/lib/io.ts`, `src/cli/index.ts`, dois testes), o `compose.yaml` que monta um caminho só, e os wrappers `bin/living-docs` e `plugin/hooks/run-hook.sh` que fixam `/app` para as duas coisas. A correção é um módulo único — `src/core/roots.ts` — com **duas** funções (`toolkitRoot()`, `repoRoot()`) e um layout de container que separa `/opt/living-docs` (fonte do toolkit) de `/workspace` (repositório validado). No dogfooding, o mesmo checkout é montado nos dois caminhos: a separação passa a ser exercitada de verdade em todo teste, em vez de ficar acordada no papel.

2. **A Fase 2 introduz a terceira forma de coleção.** As Fases 0–1 conhecem duas: `per-file` (ADR, TDR — um arquivo por item, frontmatter próprio) e `table` (Open Decisions — linhas numa tabela). Requisitos são a terceira da regra de granularidade da spec §3 — _corpo longo mas vivo, seções com ID_ —, então entra `collection: sections`. Para que `CI-3` possa perguntar "esta DA `resolved` aponta qual ADR?" sem aprender o nome de uma coluna em português, `TableItem` vira `DocItem` com `fields` (todas as colunas/campos do item) e o `.ownership.yml` ganha `field-map`: o mapeamento nome-canônico → nome-real continua sendo o **único** arquivo específico do projeto. `CI-3` é também o primeiro check que lê **fora** de `docs/` — a cobertura de `RN` por teste exige varrer `cited-by` —, e por isso é o primeiro consumidor de `picomatch`, declarado na Fase 0 e até aqui sem uso.

**Tech Stack:** o mesmo — Node 24 com type-stripping nativo, `node:test`, TypeScript 5.9 só como type-checker (`erasableSyntaxOnly`), `yaml`, `picomatch` (agora usado), Docker + Compose como único runtime.

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §3 (layout, granularidade, `.ownership.yml`), §4 (ciclo de vida de requisito), §5 (`SK-4`), §8 (grafo de rastreabilidade), §9 (`CI-3`), §10 (Fase 2 e estágios de maturidade), §11 (convenções de autoria).

## Global Constraints

Valem as do plano das Fases 0–1 — nada de Node no host, sem build step, imports com `.ts`, hooks com timeout ≤ 5 s / falha aberta / zero rede, hook nunca julga, idioma (identificadores em inglês, prosa em pt-BR), commit citando o ID afetado, IDs nunca reciclados, um artefato um dono. Somam-se a elas:

- **Duas raízes, nunca uma.** Depois da Task 2, nenhum arquivo em `src/` ou `test/` contém o literal `/app`, `/workspace` ou `/opt/living-docs`. Caminho absoluto de container só existe em `Dockerfile`, `compose.yaml`, `bin/living-docs`, `plugin/hooks/run-hook.sh` e `.github/workflows/living-docs.yml`. Há um teste que reprova a regressão.
- **`LIVING_DOCS_ROOT` deixa de existir.** É substituída por `LIVING_DOCS_REPO_ROOT` (repositório validado) e `LIVING_DOCS_TOOLKIT_ROOT` (fonte do toolkit, só para teste — em uso normal o toolkit se acha sozinho). É quebra de compatibilidade deliberada, declarada em `ADR-0003`: manter um alias que significa "as duas coisas" preserva exatamente a ambiguidade que `DA-0001` existe para matar.
- **Nenhum check aprende um caminho ou um nome de campo.** Tudo que é específico de projeto entra em `docs/.ownership.yml`. Um `if` com `'Resolvida por'` dentro de `src/checks/` é motivo de reprovar o passo.
- **`CI-3` falha, não avisa.** A spec §9 autoriza aviso só para `CI-4`. Achado de `CI-3` é `severity: 'error'`.
- **Escopo travado em `DA-0001` + Fase 2:** `ADR-0003`, as duas raízes, `collection: sections`, `SK-4`, `CI-3`, `living-docs init --stage`. **Fora deste plano:** `SK-1`, `SK-2`, `SK-5`, `SK-6`, `SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-4`–`HK-7`, `CI-4`–`CI-8`, `CM-4`, `CM-5`, `CM-7`. Não implemente nada dessa lista, nem "só o esqueleto".
- **A Fase 2 não ganha comando.** A spec §10 não define `/requirement`: `SK-4` é selecionada pela `description`. Não invente `CM-8`.

---

## Estrutura de arquivos

Novo (`+`) e alterado (`~`). O que não aparece aqui não muda.

```
+ src/core/roots.ts                    # toolkitRoot() e repoRoot() — a decisão de ADR-0003
+ src/docs/item.ts                     # DocItem: id, status, line, fields — comum a table e sections
+ src/docs/sections.ts                 # collection: sections (requisitos)
+ src/checks/ci3-traceability.ts       # CI-3
+ src/ids/coverage.ts                  # varredura de citações nos caminhos de cited-by (picomatch)

~ src/config/ownership.ts              # collection 'sections', field-map
~ src/docs/table.ts                    # TableItem -> DocItem com fields
~ src/docs/collect.ts                  # coleta seções; items unificados
~ src/docs/schema.ts                   # RF/RNF/RN na máquina de estados, revoked congelado, promoções humanas
~ src/checks/ci1-structure.ts          # container = qualquer coleção; status de item de seção
~ src/checks/ci2-ids.ts                # IDs declarados em seções entram no lint
~ src/checks/registry.ts               # + ci3Traceability
~ src/cli/index.ts                     # repoRoot(); flag --stage no init
~ src/cli/init.ts                      # templatesDir(); moldura de requisitos por estágio
~ src/hooks/lib/io.ts                  # hookEnv() usa repoRoot()
~ src/hooks/hk3-state-promotion.ts     # promoção dentro de coleção de seções

+ templates/requirements.md            # semente parametrizada por prefixo (RF/RNF/RN)
~ templates/ownership.yml              # bloco de requisitos por estágio
~ templates/CODEOWNERS                 # dono dos requisitos

+ plugin/skills/requirements-keeper/SKILL.md   # SK-4

+ test/core/roots.test.ts
+ test/docs/sections.test.ts
+ test/ids/coverage.test.ts
+ test/checks/ci3-traceability.test.ts
+ test/acceptance/consumer-repo.test.ts        # DA-0001 verificado por teste
~ test/plugin/authoring.test.ts                # roda sobre todas as skills, não só uma
~ test/**                                      # nada de '/app' embutido

~ Dockerfile  compose.yaml  bin/living-docs  plugin/hooks/run-hook.sh
~ .github/workflows/living-docs.yml

+ docs/decisions/adr/ADR-0003-*.md             # a decisão de DA-0001
+ docs/decisions/debt/TDR-0001-*.md            # o que ADR-0003 e a Fase 2 aceitam dever
+ docs/requirements/{rules,functional,non-functional}.md   # dogfooding da Fase 2
~ docs/.ownership.yml  CODEOWNERS  docs/open-decisions.md  README.md
+ docs/superpowers/plans/BACKLOG-fases-3-7.md  # o que fica para o próximo plano
```

---

### Task 1: `ADR-0003` — decidir `DA-0001`

**Objetivo:** registrar a decisão de separar as raízes **antes** de implementá-la, e fechar a `DA-0001` que hoje bloqueia o assunto. É a regra que o próprio toolkit impõe (`SK-3`, regra 1: enquanto o item está em Open Decisions, ele não tem regra e não deve ser implementado).

**Requisitos:**

- O ADR nasce `draft`. **A promoção para `accepted` é ato humano** — `HK-3` vai perguntar, e a resposta não é do agente. Se o executor deste plano for um agente, ele para no `draft` e pede a aceitação; só depois segue para a Task 2.
- O ADR declara ao menos duas alternativas com o motivo real do descarte, e a seção "o que se aceita perder" preenchida.
- `DA-0001` só vira `resolved` **depois** que o ADR estiver `accepted`, e aponta o ADR; o ADR aponta de volta em `relates-to`.

- [ ] **Step 1: Escrever o ADR a partir de `templates/adr.md`**

`docs/decisions/adr/ADR-0003-duas-raizes-toolkit-e-repositorio.md`:

```markdown
---
id: ADR-0003
title: Raiz do toolkit e raiz do repositório validado são distintas
status: draft
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
```

- [ ] **Step 2: Rodar os checks com o ADR novo**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate; echo "exit=$?"
```

Esperado: `exit=0`. `CI-2` aceita `ADR-0003` porque a sequência está contígua; a citação a `DA-0001` resolve.

- [ ] **Step 3: PARAR e pedir a aceitação**

Diga em uma frase qual decisão falta e a quem cabe. **Não** edite `status: draft` para `accepted` por conta própria: `HK-3` devolve `ask` e a resposta é humana (spec §4). Depois de aceito por uma pessoa:

- [ ] **Step 4: Fechar `DA-0001`**

Em `docs/open-decisions.md`, a linha de `DA-0001` passa a:

```markdown
| DA-0001 | Separar a raiz do toolkit da raiz do repositório validado, para permitir instalação em outro projeto | resolved | ADR-0003 | 2026-08-24 |
```

Também é promoção humana (`open → resolved`): `HK-3` pergunta.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr docs/open-decisions.md
git commit -m "docs(ADR-0003): duas raízes, toolkit e repositório validado (fecha DA-0001)"
```

---

### Task 2: `src/core/roots.ts` — as duas raízes na engine

**Objetivo:** um único lugar que responde "onde está o toolkit" e "onde está o repositório validado", e nenhum caminho de container embutido em código.

**Requisitos:**

- `toolkitRoot()` se resolve sozinha por `import.meta.dirname`; a variável de ambiente existe só para teste.
- `repoRoot()` **nunca** deriva do toolkit. Sem `LIVING_DOCS_REPO_ROOT`, é `process.cwd()`.
- Nenhum default `'/app'` sobra. Um teste reprova a regressão.
- Mudança de comportamento observável zero para o dogfooding: `npm test` continua verde sem tocar em `compose.yaml` (a Task 3 é que muda o layout).

- [ ] **Step 1: Escrever `src/core/roots.ts`**

```typescript
import { join, resolve } from 'node:path'

/**
 * Raiz do **toolkit**: onde moram `src/`, `templates/` e `plugin/`.
 *
 * Derivada do próprio arquivo — o toolkit sempre sabe onde ele mesmo está e por
 * isso não precisa de configuração para se achar. `LIVING_DOCS_TOOLKIT_ROOT`
 * existe para o teste que monta um layout artificial, não para uso normal.
 *
 * Regra de origem: ADR-0003.
 */
export function toolkitRoot(): string {
  const override = process.env.LIVING_DOCS_TOOLKIT_ROOT
  return resolve(override ?? join(import.meta.dirname, '..', '..'))
}

/**
 * Raiz do **repositório validado**: onde moram `docs/.ownership.yml` e os
 * artefatos. Nunca derivada do toolkit — é o outro lado de ADR-0003.
 */
export function repoRoot(): string {
  return resolve(process.env.LIVING_DOCS_REPO_ROOT ?? process.cwd())
}

/** Diretório dos templates que `living-docs init` escreve. Sempre do toolkit. */
export function templatesDir(): string {
  return join(toolkitRoot(), 'templates')
}
```

- [ ] **Step 2: Teste — `test/core/roots.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot, templatesDir, toolkitRoot } from '../../src/core/roots.ts'

test('toolkitRoot aponta para o checkout do toolkit', () => {
  assert.ok(existsSync(join(toolkitRoot(), 'package.json')))
  assert.ok(existsSync(join(templatesDir(), 'adr.md')))
})

test('repoRoot respeita LIVING_DOCS_REPO_ROOT e não move toolkitRoot', () => {
  const antes = toolkitRoot()
  const anterior = process.env.LIVING_DOCS_REPO_ROOT
  process.env.LIVING_DOCS_REPO_ROOT = '/tmp/outro-projeto'
  try {
    assert.equal(repoRoot(), '/tmp/outro-projeto')
    assert.equal(toolkitRoot(), antes, 'a raiz do toolkit não pode seguir a do repositório (ADR-0003)')
  } finally {
    if (anterior === undefined) delete process.env.LIVING_DOCS_REPO_ROOT
    else process.env.LIVING_DOCS_REPO_ROOT = anterior
  }
})

test('nenhum caminho absoluto de container está embutido em src/ ou test/', () => {
  const proibidos = ['/app', '/workspace', '/opt/living-docs']
  const ofensas: string[] = []

  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(toolkitRoot(), dir))) {
      const relative = `${dir}/${entry}`
      if (statSync(join(toolkitRoot(), relative)).isDirectory()) {
        walk(relative)
        continue
      }
      if (!entry.endsWith('.ts')) continue
      const source = readFileSync(join(toolkitRoot(), relative), 'utf8')
      for (const proibido of proibidos) {
        if (source.includes(`'${proibido}`) || source.includes(`"${proibido}`)) {
          ofensas.push(`${relative}: ${proibido}`)
        }
      }
    }
  }

  walk('src')
  walk('test')
  assert.deepEqual(ofensas, [], 'caminho de container só pode aparecer em Dockerfile, compose e wrappers (ADR-0003)')
})
```

> Atenção: este teste é auto-referente — ele contém os literais que proíbe, dentro do array `proibidos`. Escreva-os montados (`'/' + 'app'`) ou mantenha a checagem por aspas como acima, que só casa ocorrências **citadas** dentro de string de código. Se o próprio teste se reprovar, o array é a primeira coisa a olhar.

- [ ] **Step 3: Trocar os defaults em `src/hooks/lib/io.ts`**

```typescript
import { repoRoot } from '../../core/roots.ts'

export function hookEnv(): HookEnv {
  const root = repoRoot()
  const host = process.env.LIVING_DOCS_HOST_ROOT
  return { root, hostRoots: host ? [root, host] : [root] }
}
```

`LIVING_DOCS_HOST_ROOT` **não** muda de nome: ela sempre significou "o prefixo de caminho do lado do host", que não é ambíguo.

- [ ] **Step 4: Trocar em `src/cli/index.ts` e `src/cli/init.ts`**

Em `index.ts`: `const root = repoRoot();` no lugar de `process.env.LIVING_DOCS_ROOT ?? process.cwd()`.
Em `init.ts`: `const TEMPLATES_DIR = templatesDir();` — funcionalmente igual, mas passa a existir um nome para a decisão.

- [ ] **Step 5: Trocar nos testes que fixavam `'/app'`**

`test/plugin/authoring.test.ts` e `test/acceptance/spec-criteria.test.ts` usam `process.env.LIVING_DOCS_ROOT ?? '/app'` com dois sentidos diferentes:

- em `authoring.test.ts` a raiz é do **toolkit** (lê `plugin/skills/**`) → `toolkitRoot()`;
- em `spec-criteria.test.ts`, no teste "este repositório passa nos próprios checks", a raiz é do **repositório validado** → `repoRoot()`.

Essa é a prova de que as duas coisas eram uma só por acidente: o mesmo literal servia a dois papéis.

- [ ] **Step 6: Verificar**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Esperado: verde. O teste do Step 2 falha se alguém reintroduzir `'/app'`.

- [ ] **Step 7: Commit**

```bash
git add src test
git commit -m "refactor(ADR-0003): src/core/roots.ts separa raiz do toolkit e do repositório"
```

---

### Task 3: Container, wrappers e CI com as duas raízes

**Objetivo:** o layout que torna `ADR-0003` real: `/opt/living-docs` é o toolkit, `/workspace` é o repositório validado, e um consumidor troca só uma variável.

**Requisitos:**

- `docker compose up -d` sem variável nenhuma continua fazendo dogfooding: o mesmo checkout nos dois caminhos.
- `LIVING_DOCS_TARGET=/caminho docker compose up -d` valida outro projeto, sem editar arquivo nenhum.
- Os wrappers continuam **falhando abertos** (hooks) e com mensagem útil (CLI).
- `npm test`/`typecheck` rodam no toolkit; `validate` roda no repositório validado.

- [ ] **Step 1: `Dockerfile`**

```dockerfile
FROM node:24-alpine

RUN apk add --no-cache git bash

# A fonte do toolkit mora aqui. O repositório validado é montado em /workspace —
# são coisas distintas por ADR-0003, mesmo quando apontam para o mesmo checkout.
WORKDIR /opt/living-docs
RUN mkdir -p /opt/living-docs/node_modules /workspace \
 && chown -R node:node /opt/living-docs /workspace

USER node
ENV LIVING_DOCS_TOOLKIT_ROOT=/opt/living-docs \
    LIVING_DOCS_REPO_ROOT=/workspace
CMD ["sleep", "infinity"]
```

- [ ] **Step 2: `compose.yaml`**

```yaml
services:
  toolkit:
    build: .
    container_name: living-docs-toolkit
    working_dir: /opt/living-docs
    user: node
    init: true
    volumes:
      # A fonte do toolkit, sem build step (ADR-0001).
      - .:/opt/living-docs
      # O repositório validado. Sem LIVING_DOCS_TARGET, é este mesmo checkout:
      # dogfooding pelos dois caminhos, com a separação exercitada de verdade.
      - ${LIVING_DOCS_TARGET:-.}:/workspace
      - node_modules:/opt/living-docs/node_modules
    environment:
      LIVING_DOCS_TOOLKIT_ROOT: /opt/living-docs
      LIVING_DOCS_REPO_ROOT: /workspace
    command: ['sleep', 'infinity']

volumes:
  node_modules:
```

- [ ] **Step 3: `bin/living-docs`**

```bash
#!/usr/bin/env bash
# Ponte host -> container. O host não executa Node: todo trabalho acontece dentro
# de `living-docs-toolkit`. A fonte do toolkit está em /opt/living-docs e o
# repositório validado em /workspace — raízes distintas por ADR-0003.
set -euo pipefail

CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"

if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "living-docs: o container '$CONTAINER' não está rodando. Suba com: docker compose up -d" >&2
  echo "             para validar outro projeto: LIVING_DOCS_TARGET=/caminho docker compose up -d" >&2
  exit 2
fi

exec docker exec -i -w /workspace "$CONTAINER" node /opt/living-docs/src/cli/index.ts "$@"
```

- [ ] **Step 4: `plugin/hooks/run-hook.sh`**

```bash
#!/usr/bin/env bash
# Ponte host -> container para os hooks de documentação viva.
#
# Falha aberta por contrato (LIVING-DOCUMENTATION-TOOLKIT.md §7): container fora
# do ar, timeout ou erro de execução resultam em saída vazia e exit 0. Um hook
# quebrado não pode travar o trabalho.
#
# O hook lê o `.ownership.yml` do **repositório validado** (/workspace) e executa
# o código do **toolkit** (/opt/living-docs). ADR-0003.

HOOK="${1:-}"
CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"
HOST_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | timeout 5 docker exec -i \
  -e LIVING_DOCS_REPO_ROOT=/workspace \
  -e LIVING_DOCS_HOST_ROOT="$HOST_ROOT" \
  "$CONTAINER" node "/opt/living-docs/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
```

- [ ] **Step 5: `.github/workflows/living-docs.yml`**

O passo de `validate` passa a rodar com o diretório de trabalho no repositório validado:

```yaml
- name: CI-1, CI-2 e CI-3 — documentação viva
  run: >
    docker compose run --rm -w /workspace toolkit
    node /opt/living-docs/src/cli/index.ts validate
```

Os passos de `npm ci`, `npm test` e `npm run typecheck` continuam como estão: o `working_dir` do serviço já é `/opt/living-docs`.

- [ ] **Step 6: Verificar os dois modos**

```bash
docker compose down && docker compose up -d --build
docker compose exec toolkit npm ci
docker compose exec toolkit npm test
./bin/living-docs validate; echo "exit=$?"

# instalação em outro projeto — a prova de DA-0001
mkdir -p /tmp/projeto-alheio
LIVING_DOCS_TARGET=/tmp/projeto-alheio docker compose up -d
./bin/living-docs init --owner @alguem
./bin/living-docs validate; echo "exit=$?"
ls /tmp/projeto-alheio/docs
git status --porcelain            # nada novo no checkout do toolkit
docker compose down && docker compose up -d   # volta ao dogfooding
```

Esperado: no projeto alheio, `init` cria a moldura **lá** e `validate` sai `0`; `git status` no toolkit sai limpo.

- [ ] **Step 7: Commit**

```bash
git add Dockerfile compose.yaml bin plugin/hooks .github
git commit -m "feat(ADR-0003): container com /opt/living-docs e /workspace separados"
```

---

### Task 4: Aceitação — um repositório consumidor de verdade

**Objetivo:** transformar `DA-0001` de "acordo escrito" em invariante verificada. Sem este teste, a separação volta a apodrecer no primeiro atalho.

**Requisitos:**

- O teste roda com o repositório validado em um diretório temporário, **fora** do checkout do toolkit.
- Prova as três coisas que o consumidor precisa: `init` escreve lá, `validate` lê lá, e os hooks decidem pela configuração de lá.
- Prova a negativa que importa: **nada** é escrito dentro do toolkit.

- [ ] **Step 1: `test/acceptance/consumer-repo.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { runInit } from '../../src/cli/init.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OPTIONS = { owner: '@consumidor', dryRun: false, stage: 'solo' as const }

test('DA-0001: init escreve no repositório validado, nunca no toolkit', () => {
  const antes = readdirSync(toolkitRoot()).sort()

  withTempRepo({ 'README.md': '# projeto alheio\n' }, root => {
    assert.notEqual(root, toolkitRoot())

    const result = runInit(root, OPTIONS)
    assert.ok(result.created.includes('docs/.ownership.yml'))
    assert.ok(existsSync(join(root, 'docs/.ownership.yml')))
    assert.ok(existsSync(join(root, 'docs/open-decisions.md')))

    // os templates vieram do toolkit, e o toolkit não ganhou arquivo nenhum
    assert.ok(readFileSync(join(root, 'docs/.ownership.yml'), 'utf8').includes('@consumidor'))
    assert.deepEqual(readdirSync(toolkitRoot()).sort(), antes)
  })
})

test('DA-0001: validate roda contra a configuração do repositório validado', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    assert.equal(runValidate(root).exitCode, 0)

    // uma violação plantada lá aparece lá, com o caminho relativo àquele repo
    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
    writeFileSync(
      join(root, 'docs/decisions/adr/ADR-0001-x.md'),
      [
        '---',
        'id: ADR-0001',
        'title: X',
        'status: draft',
        'owner: "@consumidor"',
        'trigger: revisar trimestralmente',
        'last-reviewed: 2026-08-24',
        '---',
        '',
        'corpo',
      ].join('\n'),
      'utf8',
    )

    const result = runValidate(root)
    assert.equal(result.exitCode, 1)
    assert.ok(result.findings.some(f => f.file === 'docs/decisions/adr/ADR-0001-x.md'))
  })
})

test('DA-0001: o hook decide pela configuração do repositório validado', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = 'docs/decisions/adr/ADR-0001-congelado.md'
    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
    writeFileSync(
      join(root, file),
      [
        '---',
        'id: ADR-0001',
        'title: Congelado',
        'status: accepted',
        'owner: "@consumidor"',
        'trigger: Nunca.',
        'last-reviewed: 2026-08-24',
        '---',
        '',
        'corpo original',
      ].join('\n'),
      'utf8',
    )

    const decision = decideHk1(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: file,
          old_string: 'corpo original',
          new_string: 'outro',
        },
      },
      { root, hostRoots: [root] },
    )
    assert.equal(decision.action, 'deny')
  })
})
```

> `stage` entra em `InitOptions` na Task 11. Até lá, escreva o teste sem esse campo e adicione-o quando a flag existir — ou implemente a Task 11 antes desta. A ordem sugerida mantém a Task 4 como o marco de `DA-0001`; ajuste o objeto `OPTIONS` no momento em que a flag nascer.

- [ ] **Step 2: Verificar e commitar**

```bash
docker compose exec toolkit npm test
git add test/acceptance/consumer-repo.test.ts
git commit -m "test(DA-0001): repositório consumidor separado do checkout do toolkit"
```

---

### Task 5: `DocItem` — item de coleção com campos, e `field-map`

**Objetivo:** dar a `CI-3` acesso ao que um item declara (a coluna "Resolvida por" de uma DA, o `relates-to` de uma seção) **sem** que check nenhum aprenda o nome real do campo. O nome real é específico do projeto e por isso mora no `.ownership.yml`, junto com os caminhos.

**Requisitos:**

- `parseItemTable` passa a devolver todas as colunas do item, chaveadas pelo cabeçalho normalizado.
- `ArtifactRule` ganha `fieldMap: Record<string, string>` — canônico → real.
- `fieldOf(rule, item, 'resolved-by')` devolve o valor, ou `null` para célula vazia e para os marcadores de vazio (`—`, `-`, `n/a`).
- Compatibilidade: `hk3-state-promotion.ts` e `ci1-structure.ts` continuam funcionando sem mudança semântica (usam `id`, `status`, `line`).

- [ ] **Step 1: `src/docs/item.ts`**

```typescript
/**
 * Um item dentro de um artefato de coleção — uma linha de tabela (Open
 * Decisions) ou uma seção com ID (requisitos). Os dois têm a mesma forma para
 * que check e hook não precisem saber qual dos dois estão lendo.
 */
export interface DocItem {
  id: string
  status: string
  /** Linha 1-indexed no arquivo inteiro. */
  line: number
  /** Tudo que o item declara, por chave normalizada. */
  fields: Record<string, string>
}

/** Chave comparável: minúscula, sem espaço nas pontas, sem `:` final. */
export function normalizeKey(key: string): string {
  return key.trim().replace(/:$/, '').trim().toLowerCase()
}

/** Marcadores de "vazio" usados em tabela de markdown. */
const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'null', 'nenhum', 'nenhuma'])

export function isEmptyValue(value: string): boolean {
  return EMPTY.has(value.trim().toLowerCase())
}
```

- [ ] **Step 2: `src/docs/table.ts` devolve `DocItem`**

Troque `TableItem` por `DocItem` e preencha `fields` com **todas** as colunas:

```typescript
const items: DocItem[] = []
for (let j = i + 2; j < lines.length; j++) {
  const row = cells(lines[j] ?? '')
  if (row.length === 0) break
  const id = row[idColumn] ?? ''
  if (!parseId(id)) continue

  const fields: Record<string, string> = {}
  for (let c = 0; c < header.length; c++) {
    const key = normalizeKey(header[c] ?? '')
    if (key !== '') fields[key] = (row[c] ?? '').trim()
  }

  items.push({
    id,
    status: row[statusColumn] ?? '',
    line: startLine + j,
    fields,
  })
}
```

Mantenha `export type { DocItem as TableItem }`? **Não.** Renomeie os usos: um alias é uma segunda fonte de verdade para o mesmo tipo.

- [ ] **Step 3: `field-map` em `src/config/ownership.ts`**

Em `ArtifactRule`, acrescente:

```typescript
/** Canônico -> nome real do campo neste projeto. Ex.: { 'resolved-by': 'resolvida por' }. */
fieldMap: Record<string, string>
```

No `parseArtifact`:

```typescript
const fieldMapRaw = item['field-map']
const fieldMap: Record<string, string> = {}
if (fieldMapRaw !== undefined && fieldMapRaw !== null) {
  for (const [canonical, real] of Object.entries(asRecord(fieldMapRaw, `${where}.field-map`))) {
    if (typeof real !== 'string' || real.trim() === '') {
      throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.field-map.${canonical} precisa ser uma string não vazia.`)
    }
    fieldMap[normalizeKey(canonical)] = normalizeKey(real)
  }
}
```

E a leitura, no mesmo arquivo (é config, não check):

```typescript
/**
 * Valor de um campo canônico do item, respeitando o `field-map` do artefato.
 * Devolve null para célula vazia — `CI-3` trata "vazio" e "ausente" igual.
 */
export function fieldOf(rule: ArtifactRule, item: DocItem, canonical: string): string | null {
  const key = rule.fieldMap[normalizeKey(canonical)] ?? normalizeKey(canonical)
  const value = item.fields[key]
  if (value === undefined || isEmptyValue(value)) return null
  return value.trim()
}
```

- [ ] **Step 4: Declarar o mapeamento no `.ownership.yml` e no template**

Em `docs/.ownership.yml` e `templates/ownership.yml`, no artefato `DA`:

```yaml
- id-prefix: DA
  path: { { DA_PATH } }
  owner: '{{OWNER}}'
  skill: decision-recorder
  collection: table
  # A tabela é lida por gente, em português; o check pergunta pelo nome
  # canônico. O mapeamento mora aqui porque é a única coisa específica do
  # projeto (spec §3).
  field-map:
    resolved-by: 'Resolvida por'
```

- [ ] **Step 5: Testes — `test/docs/table.test.ts` e `test/config/ownership.test.ts`**

Acrescente:

```typescript
test('o item traz todas as colunas, normalizadas', () => {
  const items = parseItemTable(['| ID | Lacuna | Status | Resolvida por |', '| --- | --- | --- | --- |', '| DA-0001 | X | resolved | ADR-0007 |'].join('\n'), 1)
  assert.equal(items[0]?.fields['resolvida por'], 'ADR-0007')
  assert.equal(items[0]?.fields['lacuna'], 'X')
})

test('fieldOf traduz o nome canônico pelo field-map e trata vazio como ausente', () => {
  const config = parseOwnership(/* ... com field-map: { resolved-by: "Resolvida por" } ... */)
  const rule = config.artifacts[0]!
  assert.equal(
    fieldOf(
      rule,
      {
        id: 'DA-0001',
        status: 'resolved',
        line: 1,
        fields: { 'resolvida por': 'ADR-0007' },
      },
      'resolved-by',
    ),
    'ADR-0007',
  )
  assert.equal(
    fieldOf(
      rule,
      {
        id: 'DA-0002',
        status: 'open',
        line: 2,
        fields: { 'resolvida por': '—' },
      },
      'resolved-by',
    ),
    null,
  )
})
```

- [ ] **Step 6: Verificar e commitar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
git add src test docs/.ownership.yml templates
git commit -m "refactor: DocItem com campos e field-map no .ownership.yml"
```

---

### Task 6: `collection: sections` — requisitos como seções com ID

**Objetivo:** a terceira forma de granularidade da spec §3 — _corpo longo mas vivo, seções com ID_. Um arquivo por família de requisito (`RF`, `RNF`, `RN`), uma seção por requisito.

**Requisitos:**

- Uma seção é um título `## <ID> — <título>` seguido de uma lista de metadados em negrito. Tudo depois disso, até o próximo título, é corpo.
- Um requisito sem `status` é achado de `CI-1`, não erro de parser: o parser devolve `status: ''`.
- O parser não tem opinião sobre quais campos existem — devolve o que estiver escrito.
- `CI-1`, `CI-2` e `HK-3` passam a enxergar itens de seção do mesmo jeito que enxergam linhas de tabela.

- [ ] **Step 1: `src/docs/sections.ts`**

```typescript
import { parseId } from './schema.ts'
import { normalizeKey } from './item.ts'
import type { DocItem } from './item.ts'

const HEADING = /^#{2,4}\s+([A-Z]{2,4}-\d{3,4})\s*(?:[—–-]\s*(.*))?$/
const FIELD = /^[-*]\s+\*\*([^*]+?)\*\*\s*:?\s*(.*)$/

/**
 * Itens de um artefato mantido como seções com ID (spec §3 — requisitos).
 * `startLine` é a linha 1-indexed onde `source` começa no arquivo.
 *
 * Formato reconhecido:
 *
 *     ## RN-0001 — Título da regra
 *
 *     - **status:** active
 *     - **relates-to:** ADR-0002
 *
 *     Enunciado.
 */
export function parseItemSections(source: string, startLine: number): DocItem[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const items: DocItem[] = []

  for (let i = 0; i < lines.length; i++) {
    const heading = HEADING.exec((lines[i] ?? '').trim())
    if (!heading?.[1] || !parseId(heading[1])) continue

    const fields: Record<string, string> = {}
    if (heading[2] !== undefined && heading[2].trim() !== '') {
      fields.title = heading[2].trim()
    }

    for (let j = i + 1; j < lines.length; j++) {
      const line = (lines[j] ?? '').trim()
      if (line === '') continue
      if (HEADING.test(line) || line.startsWith('#')) break
      const field = FIELD.exec(line)
      if (!field?.[1]) break
      fields[normalizeKey(field[1])] = (field[2] ?? '').trim()
    }

    items.push({
      id: heading[1],
      status: fields.status ?? '',
      line: startLine + i,
      fields,
    })
  }

  return items
}
```

- [ ] **Step 2: Teste — `test/docs/sections.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseItemSections } from '../../src/docs/sections.ts'

const SOURCE = [
  '# Regras de negócio',
  '',
  '## RN-0001 — Todo artefato tem exatamente um dono',
  '',
  '- **status:** active',
  '- **relates-to:** ADR-0002',
  '',
  'Enunciado da regra.',
  '',
  '## RN-0002 — Regra revogada',
  '',
  '- **status:** revoked',
  '- **revoked-by:** RN-0001',
  '',
].join('\n')

test('lê id, título, status e campos de cada seção', () => {
  const items = parseItemSections(SOURCE, 1)
  assert.equal(items.length, 2)
  assert.equal(items[0]?.id, 'RN-0001')
  assert.equal(items[0]?.status, 'active')
  assert.equal(items[0]?.fields.title, 'Todo artefato tem exatamente um dono')
  assert.equal(items[0]?.fields['relates-to'], 'ADR-0002')
  assert.equal(items[1]?.fields['revoked-by'], 'RN-0001')
})

test('a linha aponta o título da seção, deslocada por startLine', () => {
  assert.equal(parseItemSections(SOURCE, 10)[0]?.line, 12)
})

test('seção sem status devolve status vazio — quem reclama é CI-1', () => {
  const items = parseItemSections('## RN-0009 — Sem metadados\n\nCorpo.\n', 1)
  assert.equal(items[0]?.status, '')
})

test('título que não começa com ID é ignorado', () => {
  assert.deepEqual(parseItemSections('## Introdução\n\n- **status:** active\n', 1), [])
})
```

- [ ] **Step 3: `collection: 'sections'` em `src/config/ownership.ts`**

```typescript
export type Collection = 'per-file' | 'table' | 'sections'
```

e a validação:

```typescript
const collectionRaw = item.collection ?? 'per-file'
if (collectionRaw !== 'per-file' && collectionRaw !== 'table' && collectionRaw !== 'sections') {
  throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.collection precisa ser "per-file", "table" ou "sections".`)
}
```

- [ ] **Step 4: `src/docs/collect.ts`**

A escolha de parser vira uma função, e `items` deixa de ser exclusivo de tabela:

```typescript
function parseItems(rule: ArtifactRule, source: string, body: string | null, bodyStart: number): DocItem[] {
  const text = body ?? source
  const start = body === null ? 1 : bodyStart
  if (rule.collection === 'table') return parseItemTable(text, start)
  if (rule.collection === 'sections') return parseItemSections(text, start)
  return []
}
```

e em `readDoc`:

```typescript
const items = parseItems(rule, source, frontmatter ? frontmatter.body : null, frontmatter ? frontmatter.bodyStartLine : 1)
```

- [ ] **Step 5: `CI-1` — container é qualquer coleção**

Em `src/checks/ci1-structure.ts`, troque as duas ocorrências:

```typescript
const isContainer = doc.rule.collection !== 'per-file'
```

O bloco final que valida `status` de item (`if (isContainer && states)`) passa a cobrir seções sem nenhuma outra mudança. Acrescente, no mesmo laço, o caso "item sem status":

```typescript
if (item.status === '') {
  findings.push(
    error(doc.file, item.line, `Item ${item.id} não declara \`status\`.`, `Acrescente \`- **status:** ${states[0]}\` logo abaixo do título (spec §4).`),
  )
  continue
}
```

- [ ] **Step 6: `CI-2` — IDs declarados em seção entram no lint**

Em `collectDeclarations`, a condição vira `doc.rule.collection !== 'per-file'`. Sem isso, um `RN` duplicado passaria batido e um ID reciclado voltaria pela porta dos fundos.

- [ ] **Step 7: `HK-3` — promoção dentro de coleção de seções**

Em `findPromotion`, generalize o ramo de tabela:

```typescript
if (rule.collection !== 'per-file') {
  const parse = (source: string): DocItem[] => (rule.collection === 'table' ? parseItemTable(source, 1) : parseItemSections(source, 1))
  const previous = new Map(parse(before).map(item => [item.id, item.status]))
  for (const item of parse(after)) {
    const from = previous.get(item.id)
    if (from !== undefined && isHumanPromotion(from, item.status)) {
      return { id: item.id, from, to: item.status }
    }
  }
  return null
}
```

- [ ] **Step 8: Verificar e commitar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
git add src test
git commit -m "feat(SK-4): collection sections para requisitos com ID"
```

---

### Task 7: Máquina de estados dos requisitos, e a dívida que ela cria

**Objetivo:** `RF`/`RNF`/`RN` com o ciclo `draft → active → revoked` da spec §4, promoção humana nos dois saltos, e o registro honesto do que fica devendo.

**Requisitos:**

- `STATUS_MACHINE` ganha os três prefixos.
- `HUMAN_PROMOTIONS` ganha `draft → active` e `active → revoked` (spec §4: "quem promove: humano").
- `revoked` entra em `FROZEN_STATUSES` — é estado terminal, e nenhum estado terminal permite edição do corpo.
- **O buraco é declarado, não escondido:** `HK-1` congela por arquivo, lendo `status` do frontmatter. Um requisito revogado vive numa **seção** dentro de um arquivo vivo, então `HK-1` não o congela. Isso vira `TDR-0001` com gatilho de pagamento observável — não um comentário `TODO`.

- [ ] **Step 1: `src/docs/schema.ts`**

```typescript
export const STATUS_MACHINE: Readonly<Record<string, readonly string[]>> = Object.freeze({
  ADR: ['draft', 'accepted', 'superseded'],
  DA: ['open', 'resolved', 'dropped'],
  TDR: ['open', 'paid', 'accepted-permanently'],
  RF: ['draft', 'active', 'revoked'],
  RNF: ['draft', 'active', 'revoked'],
  RN: ['draft', 'active', 'revoked'],
})

export const FROZEN_STATUSES: ReadonlySet<string> = new Set(['accepted', 'superseded', 'deprecated', 'published', 'paid', 'revoked'])

export const HUMAN_PROMOTIONS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'draft', to: 'accepted' },
  { from: 'open', to: 'resolved' },
  { from: 'draft', to: 'active' },
  { from: 'active', to: 'revoked' },
])
```

- [ ] **Step 2: Teste — a promoção de requisito também pergunta**

Em `test/hooks/hk3-state-promotion.test.ts`, acrescente um caso com um artefato `collection: sections` promovendo `RN-0001` de `draft` para `active`, e espere `action: 'ask'`.

- [ ] **Step 3: `TDR-0001` — o que `HK-1` ainda não congela**

`docs/decisions/debt/TDR-0001-congelamento-por-secao.md`:

```markdown
---
id: TDR-0001
title: HK-1 não congela seção revogada dentro de arquivo de coleção
status: open
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável enquanto a dívida existir; o pagamento a marca como paid.
last-reviewed: 2026-08-24
relates-to: [RN-0006]
---

# TDR-0001 — HK-1 não congela seção revogada dentro de arquivo de coleção

## O atalho

`HK-1` decide por arquivo: lê `status` do frontmatter e compara com
`FROZEN_STATUSES`. Um requisito `revoked` é uma **seção** dentro de
`docs/requirements/rules.md`, um arquivo que continua vivo porque outras seções
mudam. Resultado: `status: revoked` é estado terminal pela spec §4, mas nada
impede um agente de reescrever o corpo daquela seção.

## Por que foi aceito

Congelar por seção exige que `HK-1` projete a edição, faça o diff **por item** e
saiba qual item foi tocado — trabalho maior que toda a Fase 2, para proteger um
caso que hoje tem zero ocorrências (nenhum requisito revogado existe ainda).
`CI-3` fecha metade do buraco: uma revogação sem par bidirecional falha no CI.

## Gatilho de pagamento

No primeiro PR que **revogar** um requisito — isto é, que mude qualquer seção
para `status: revoked`. A partir daí existe corpo congelado para proteger, e o
custo de não proteger passa a ser real.

## Custo de continuar devendo

Um requisito revogado pode ser reescrito retroativamente sem que hook nenhum
reclame, e a única defesa vira a revisão humana do diff — exatamente a defesa
que o mecanismo 5 existe para não depender.
```

- [ ] **Step 4: Verificar e commitar**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate; echo "exit=$?"
git add src test docs/decisions/debt
git commit -m "feat(SK-4): ciclo de vida de requisito; TDR-0001 registra o congelamento por seção"
```

> `TDR-0001` cita `RN-0006`, que só existe depois da Task 12. Escreva o TDR **junto** com o dogfooding da Task 12, ou deixe `relates-to: []` aqui e feche a referência lá — `CI-2` reprova citação que não resolve, e essa reprovação é o comportamento correto.

---

### Task 8: `src/ids/coverage.ts` — quem cita cada ID, fora de `docs/`

**Objetivo:** responder "esta `RN` é citada por algum teste?" — a metade do mecanismo 3 que nenhum check anterior alcançava, porque todos liam só os artefatos.

**Requisitos:**

- Varredura guiada por `cited-by` do `.ownership.yml`. Sem `cited-by`, não varre nada.
- Uma varredura por **conjunto** distinto de globs, não uma por artefato: `["test/**","src/**"]` declarado em três artefatos percorre a árvore uma vez.
- Ignora `.git/`, `node_modules/` e arquivos grandes ou binários. Um check que trava em repositório grande não roda no PR, e spec §9 exige que rode em minutos.
- Zero opinião sobre o que é "citação suficiente": devolve os sítios, quem julga é `CI-3`.

- [ ] **Step 1: `src/ids/coverage.ts`**

```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import { findCitations } from './citations.ts'

/** Diretórios que nunca contêm citação escrita por gente. */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.cache'])

/** Acima disto, é dado, não texto — e ler custa mais do que vale. */
const MAX_BYTES = 512 * 1024

export interface CitationSite {
  /** Caminho relativo à raiz do repositório, sempre com `/`. */
  file: string
  /** Linha 1-indexed. */
  line: number
}

/** Byte NUL é o sinal barato de "isto é dado binário, não texto". */
function isProbablyText(content: string): boolean {
  return content.indexOf(String.fromCharCode(0)) === -1
}

function walk(root: string, relative: string, out: string[]): void {
  let entries: string[]
  try {
    entries = readdirSync(join(root, relative))
  } catch {
    return
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const path = relative === '' ? entry : `${relative}/${entry}`
    let isDirectory: boolean
    try {
      isDirectory = statSync(join(root, path)).isDirectory()
    } catch {
      continue
    }
    if (isDirectory) walk(root, path, out)
    else out.push(path)
  }
}

/**
 * Onde cada ID aparece, restrito aos caminhos de `globs`.
 * Chave: o ID exatamente como escrito no texto — a canonização é de quem compara.
 */
export function scanCitations(root: string, globs: readonly string[]): Map<string, CitationSite[]> {
  const sites = new Map<string, CitationSite[]>()
  if (globs.length === 0) return sites

  const matches = picomatch([...globs])
  const files: string[] = []
  walk(root, '', files)

  for (const file of files) {
    if (!matches(file)) continue

    let content: string
    try {
      if (statSync(join(root, file)).size > MAX_BYTES) continue
      content = readFileSync(join(root, file), 'utf8')
    } catch {
      continue
    }
    if (!isProbablyText(content)) continue

    for (const citation of findCitations(content)) {
      const list = sites.get(citation.id) ?? []
      list.push({ file, line: citation.line })
      sites.set(citation.id, list)
    }
  }

  return sites
}
```

- [ ] **Step 2: Teste — `test/ids/coverage.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanCitations } from '../../src/ids/coverage.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('encontra citações só nos caminhos declarados', () => {
  withTempRepo(
    {
      'test/regra.test.ts': "// cobre RN-0001\ntest('RN-0001', () => {});\n",
      'src/app.ts': 'export const x = 1; // RN-0002\n',
      'notas.md': 'RN-0003 mencionada fora do escopo\n',
    },
    root => {
      const sites = scanCitations(root, ['test/**', 'src/**'])
      assert.equal(sites.get('RN-0001')?.length, 2)
      assert.equal(sites.get('RN-0002')?.[0]?.file, 'src/app.ts')
      assert.equal(sites.has('RN-0003'), false)
    },
  )
})

test('sem globs, não varre nada', () => {
  withTempRepo({ 'src/a.ts': 'RN-0001\n' }, root => {
    assert.equal(scanCitations(root, []).size, 0)
  })
})

test('ignora node_modules', () => {
  withTempRepo({ 'node_modules/pacote/index.js': 'RN-0001\n' }, root => {
    assert.equal(scanCitations(root, ['**/*.js']).size, 0)
  })
})
```

- [ ] **Step 3: Verificar e commitar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
git add src/ids/coverage.ts test/ids/coverage.test.ts
git commit -m "feat(CI-3): varredura de citações nos caminhos de cited-by"
```

---

### Task 9: `CI-3` — traceability

**Objetivo:** o check que mantém o grafo da spec §8 íntegro. Falha quando um par bidirecional fica aberto, quando uma `RN` `active` não é citada por ninguém, quando um ADR `accepted` não se liga a nada, e quando uma DA `resolved` não diz o que a resolveu.

**Requisitos (spec §8 e §9), um por regra:**

| #   | Falha quando                                                                    | Mensagem nomeia                   |
| --- | ------------------------------------------------------------------------------- | --------------------------------- |
| 1   | `A` declara `supersedes: B` e `B` não declara `superseded-by: A` (e vice-versa) | os dois arquivos e as duas linhas |
| 2   | `A` declara `revokes: B` e `B` não declara `revoked-by: A` (e vice-versa)       | idem                              |
| 3   | item com `status` terminal de revogação (`revoked`) sem `revoked-by`            | o campo que falta                 |
| 4   | DA `resolved` sem `resolved-by`, ou apontando ID que não existe                 | o ID que não resolve              |
| 5   | DA `resolved` cujo ADR não a cita de volta em `relates-to`                      | o ADR e o campo                   |
| 6   | ADR `accepted` sem `relates-to` preenchido                                      | o ADR                             |
| 7   | item `active` de artefato com `cited-by` sem nenhuma citação naqueles caminhos  | os globs onde procurou            |

- A regra 7 só roda para artefato que **declara** `cited-by`. Artefato sem `cited-by` não é cobrado — instalar por fases continua possível.
- Uma citação **dentro do próprio arquivo do artefato** não conta como cobertura: a `RN` precisa ser citada de fora.
- Toda comparação de ID passa por `canonicalId` — `RN-014` e `RN-0014` são o mesmo ID (`CI-2` já estabeleceu isso).
- Nenhum `if` com nome de campo em português: tudo via `fieldOf`.

- [ ] **Step 1: `src/checks/ci3-traceability.ts`**

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { ArtifactRule } from '../config/ownership.ts'
import { fieldOf } from '../config/ownership.ts'
import type { DocItem } from '../docs/item.ts'
import { canonicalId, parseId } from '../docs/schema.ts'
import { findCitations } from '../ids/citations.ts'
import { scanCitations } from '../ids/coverage.ts'

const RULE = 'CI-3'

/** Pares que precisam fechar dos dois lados (spec §8). */
const PAIRS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'supersedes', to: 'superseded-by' },
  { from: 'revokes', to: 'revoked-by' },
])

interface Entry {
  id: string
  file: string
  line: number
  status: string
  rule: ArtifactRule
  /** Leitura de um campo canônico, seja frontmatter ou item de coleção. */
  read(canonical: string): string | null
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

/** IDs canônicos citados dentro de um valor, qualquer que seja a forma dele. */
function idsIn(value: string | null): string[] {
  if (value === null) return []
  return findCitations(value)
    .map(citation => parseId(citation.id))
    .filter((parsed): parsed is { prefix: string; number: number } => parsed !== null)
    .map(canonicalId)
}

function entriesOf(context: CheckContext): Entry[] {
  const entries: Entry[] = []

  for (const doc of context.docs) {
    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data
      const id = data?.id
      if (typeof id !== 'string' || !parseId(id)) continue
      entries.push({
        id,
        file: doc.file,
        line: doc.frontmatter?.lines.id ?? 1,
        status: typeof data?.status === 'string' ? data.status : '',
        rule: doc.rule,
        read: canonical => {
          const value = data?.[canonical]
          if (value === undefined || value === null) return null
          const text = Array.isArray(value) ? value.join(', ') : String(value)
          return text.trim() === '' || text === 'null' ? null : text
        },
      })
      continue
    }

    for (const item of doc.items) {
      entries.push({
        id: item.id,
        file: doc.file,
        line: item.line,
        status: item.status,
        rule: doc.rule,
        read: canonical => fieldOf(doc.rule, item, canonical),
      })
    }
  }

  return entries
}

export const ci3Traceability: Check = {
  id: RULE,
  name: 'traceability',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const entries = entriesOf(context)
    const byId = new Map(entries.map(entry => [canonicalId(parseId(entry.id)!), entry]))

    // 1 e 2 — pares bidirecionais.
    for (const entry of entries) {
      for (const pair of PAIRS) {
        for (const side of [pair, { from: pair.to, to: pair.from }]) {
          for (const targetId of idsIn(entry.read(side.from))) {
            const target = byId.get(targetId)
            if (!target) {
              findings.push(
                error(
                  entry.file,
                  entry.line,
                  `${entry.id} declara \`${side.from}: ${targetId}\`, que não existe.`,
                  'Cite um ID existente, ou remova o campo (spec §8).',
                ),
              )
              continue
            }
            const back = idsIn(target.read(side.to))
            if (!back.includes(canonicalId(parseId(entry.id)!))) {
              findings.push(
                error(
                  target.file,
                  target.line,
                  `Par aberto: ${entry.id} declara \`${side.from}: ${target.id}\`, mas ${target.id} não declara \`${side.to}: ${entry.id}\`.`,
                  `Acrescente \`${side.to}: ${entry.id}\` em ${target.file}:${target.line} — o par fecha dos dois lados (spec §8).`,
                ),
              )
            }
          }
        }
      }

      // 3 — revogação sem quem revogou.
      if (entry.status === 'revoked' && entry.read('revoked-by') === null) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} está \`revoked\` sem declarar \`revoked-by\`.`,
            'Regra removida é revogada, não deletada — aponte o ID que a substituiu (spec §5, SK-4).',
          ),
        )
      }

      // 4 e 5 — DA resolvida aponta o ADR, e o ADR aponta de volta.
      if (entry.status === 'resolved') {
        const resolvers = idsIn(entry.read('resolved-by'))
        if (resolvers.length === 0) {
          findings.push(
            error(
              entry.file,
              entry.line,
              `${entry.id} está \`resolved\` sem dizer o que a resolveu.`,
              'Toda decisão aberta fechada aponta o ADR que a fechou (spec §5, SK-3, regra 7).',
            ),
          )
        }
        for (const resolverId of resolvers) {
          const resolver = byId.get(resolverId)
          if (!resolver) {
            findings.push(error(entry.file, entry.line, `${entry.id} aponta ${resolverId}, que não existe.`, 'Crie o ADR ou corrija a referência.'))
            continue
          }
          if (!idsIn(resolver.read('relates-to')).includes(canonicalId(parseId(entry.id)!))) {
            findings.push(
              error(
                resolver.file,
                resolver.line,
                `${resolver.id} resolve ${entry.id}, mas não a cita em \`relates-to\`.`,
                `Acrescente ${entry.id} a \`relates-to\` — CI-3 verifica os dois lados (spec §5, SK-3, regra 7).`,
              ),
            )
          }
        }
      }

      // 6 — ADR aceito sem ligação.
      if (entry.status === 'accepted' && idsIn(entry.read('relates-to')).length === 0) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} está \`accepted\` sem \`relates-to\`.`,
            'Um ADR aceito cita ao menos um requisito, decisão aberta ou princípio — decisão que não se liga a nada é sinal de contexto faltando (spec §8).',
          ),
        )
      }
    }

    // 7 — cobertura por citação, uma varredura por conjunto distinto de globs.
    const scans = new Map<string, Map<string, { file: string; line: number }[]>>()
    for (const entry of entries) {
      if (entry.status !== 'active' || entry.rule.citedBy.length === 0) continue

      const key = entry.rule.citedBy.join('0000')
      let sites = scans.get(key)
      if (!sites) {
        sites = scanCitations(context.root, entry.rule.citedBy)
        scans.set(key, sites)
      }

      const canonical = canonicalId(parseId(entry.id)!)
      const found = [...sites.entries()].some(([id, places]) => {
        const parsed = parseId(id)
        return parsed !== null && canonicalId(parsed) === canonical && places.some(place => place.file !== entry.file)
      })

      if (!found) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} está \`active\` e não é citada em nenhum de ${entry.rule.citedBy.join(', ')}.`,
            `Cite ${entry.id} no teste que a cobre — rastreabilidade fecha nos dois lados (spec §5, SK-4, regra 6).`,
          ),
        )
      }
    }

    return findings
  },
}
```

- [ ] **Step 2: Registrar em `src/checks/registry.ts`**

```typescript
export const CHECKS: readonly Check[] = [ci1Structure, ci2Ids, ci3Traceability]
```

- [ ] **Step 3: Teste — `test/checks/ci3-traceability.test.ts`**

Um caso por regra da tabela de requisitos, cada um montando um repositório temporário com `docs/.ownership.yml` mínimo e rodando `runValidate(root)` — ou `ci3Traceability.run(context)` direto, se preferir isolar. Os casos obrigatórios:

```typescript
test('par supersedes/superseded-by aberto falha nomeando os dois lados', …);
test('par fechado nos dois lados passa', …);
test('DA resolved sem resolved-by falha', …);
test('DA resolved cujo ADR não a cita de volta falha, e a finding aponta o ADR', …);
test('ADR accepted sem relates-to falha', …);
test('RN active sem citação em cited-by falha nomeando os globs', …);
test('RN active citada por um teste passa', …);
test('RN active em artefato sem cited-by não é cobrada', …);
test('citação dentro do próprio arquivo do artefato não conta como cobertura', …);
test('RN-014 e RN-0014 são o mesmo ID para efeito de cobertura', …);
test('RN revoked sem revoked-by falha', …);
test('toda finding de CI-3 é error, nunca warning', …);
```

- [ ] **Step 4: Verificar e commitar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
./bin/living-docs validate; echo "exit=$?"
git add src test
git commit -m "feat(CI-3): traceability — pares bidirecionais e cobertura de RN por citação"
```

> Ao ligar `CI-3` neste repositório, a regra 6 **não** dispara: `ADR-0001` e `ADR-0002` estão em `status: draft` — nenhum ADR daqui foi aceito por uma pessoa até hoje. Isso é sorte, não folga. `ADR-0001` tem `relates-to: []`, e no dia em que alguém o aceitar ele passa a violar a regra 6 **estando congelado**, com `relates-to` fora da `mutable-fields` — beco sem saída que só se resolve supersedindo o próprio ADR. Por isso a Task 12, Step 1 preenche `relates-to` **antes** de qualquer aceitação, e não depois.

---

### Task 10: `SK-4` `requirements-keeper`

**Objetivo:** a skill dona de `docs/requirements/`, escrita segundo as convenções da spec §11, com `description` em linguagem de sintoma.

**Requisitos:**

- Seções na ordem da spec §11, checklist com uma caixa por invariante, cada caixa nomeando `CI-n`, `HK-n` ou "verificação humana".
- **Não** duplica o formato do requisito — aponta `templates/requirements.md`.
- **Não** ganha comando: a spec §10 não define `/requirement`.
- O teste de autoria passa a rodar sobre **todas** as skills do plugin, não sobre uma lista fixa.

- [ ] **Step 1: `plugin/skills/requirements-keeper/SKILL.md`**

```markdown
---
name: requirements-keeper
description: >
  Use antes de implementar qualquer comportamento, e sempre que alguém
  perguntar "qual é a regra disso?", "o que o sistema deve fazer quando…",
  "isso está especificado?", "esse caso está previsto?", "pode arredondar?",
  "e se o valor for negativo?" — ou quando uma regra de negócio mudar, for
  revogada, ou precisar de um ID para ser citada por teste, commit ou ADR.
  Também quando um requisito existente estiver ambíguo e alguém estiver prestes
  a decidir por conta própria o que ele quis dizer.
---

# requirements-keeper — dono dos requisitos com ID estável

## Overview

Requisitos dizem o que o sistema **deve** ser. Três famílias, um arquivo cada:
`RF` (funcionais), `RNF` (não funcionais) e `RN` (regras de negócio). Cada
requisito é uma seção com ID citável, e é o ID que torna o raio de impacto de
uma mudança calculável por `grep`.

Os caminhos, donos e prefixos vêm de `docs/.ownership.yml` — leia-o primeiro,
nunca assuma caminho.

## Do que você é dono

| Artefato   | O que é                                                                 | Forma                               |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------- |
| `RF-nnnn`  | Comportamento que o sistema deve ter                                    | Seção com ID em `functional.md`     |
| `RNF-nnnn` | Propriedade que o sistema deve exibir (latência, custo, operação)       | Seção com ID em `non-functional.md` |
| `RN-nnnn`  | Regra de negócio — a verdade do domínio, independente de tela e de rota | Seção com ID em `rules.md`          |

Formato da seção: `templates/requirements.md`. Não o reproduza aqui.

## Quando usar / quando não

**Use** antes de implementar comportamento, e a cada regra nova ou alterada.

**Não use** para descrever o que o código já faz. Isso não é requisito, é
narração — e narração de código é o anti-requisito nº 4 da spec §13.

**Nunca** invente a regra que falta. Comportamento sem regra escrita é lacuna:
o caminho é `decision-recorder` (`/open-decision`), que abre uma `DA-nnnn` e
**para** a implementação.

## Procedimento

1. **Leia `docs/.ownership.yml`** e descubra caminho, dono e prefixo de cada
   família. Se não existir, pare e rode `/docs-setup`.
2. **Não olhe o código, e isso é deliberado.** A spec diz o que deve ser;
   justificar a regra pelo que o código faz hoje inverte a relação e apaga o gap.
3. **Classifique**: comportamento observável → `RF`; propriedade de qualidade →
   `RNF`; verdade do domínio → `RN`. Em dúvida entre `RF` e `RN`, pergunte se a
   regra sobreviveria a uma reescrita completa da interface: se sim, é `RN`.
4. **Procure antes de criar.** Um requisito quase igual é sinal de que o certo é
   editar o existente ou revogá-lo, não somar um segundo.
5. **Tome o próximo ID livre** do prefixo, conferindo `docs/ids-retired.txt`.
   Nunca recicle, nunca pule.
6. **Nomeie pelo glossary**, quando ele existir. Termo do hábito de quem escreve
   é como duas regras passam a falar de coisas diferentes com a mesma palavra.
7. **Preencha "fora de escopo"** onde houver ambiguidade. É esse campo que
   impede o alargamento silencioso do requisito.
8. **Escreva `status: draft`.** Promover para `active` é ato humano — `HK-3`
   pergunta.
9. **Regra removida é `revoked`, nunca deletada**, com `revoked-by` apontando a
   regra que a substituiu — e a substituta declarando `revokes` de volta.
10. **Peça o teste que cita o ID.** Toda `RN` `active` precisa de ao menos uma
    citação nos caminhos de `cited-by`, ou `CI-3` falha. Você não escreve o
    teste; você diz qual ID ele precisa citar.
11. **Rode `living-docs validate`** antes de encerrar.
12. **Cite o ID na mensagem de commit.**

## Fronteiras

| É seu                                            | Não é seu                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Dizer o que o sistema deve fazer, com ID citável | Dizer como implementar                                           |
| Marcar ambiguidade e delimitar o fora de escopo  | Resolver a ambiguidade por conta própria (→ `decision-recorder`) |
| Revogar regra apontando a substituta             | Deletar regra                                                    |
| Exigir que exista teste citando a regra          | Escrever o teste                                                 |
| Recusar requisito sem ID                         | Promover para `active` — isso é humano                           |

## Checklist

- [ ] A família certa (`RF` / `RNF` / `RN`) para a natureza do item — verificação humana
- [ ] ID sequencial, não reciclado, conferido contra `docs/ids-retired.txt` — `CI-2`
- [ ] `status` é `draft`; a promoção ficou para uma pessoa — `HK-3`
- [ ] Frontmatter do arquivo com `trigger` de evento, não de cadência — `CI-1`
- [ ] `status` de cada seção dentro da máquina de estados — `CI-1`
- [ ] Toda citação a outro ID resolve — `CI-2`
- [ ] Requisito revogado aponta a substituta, e ela aponta de volta — `CI-3`
- [ ] Toda `RN` `active` é citada por ao menos um teste — `CI-3`
- [ ] "Fora de escopo" preenchido onde havia ambiguidade — verificação humana
- [ ] Nenhuma regra foi inventada para destravar implementação — verificação humana
```

- [ ] **Step 2: Generalizar `test/plugin/authoring.test.ts`**

Troque a constante `SKILL` por uma varredura de `plugin/skills/*/SKILL.md`, e rode as asserções de estrutura (frontmatter, ordem das seções, checklist com verificação nomeada) para **cada** skill encontrada, via `describe`/loop. Mantenha as asserções específicas de `decision-recorder` (sintomas da `description`, "não duplica o template") no bloco dela, e acrescente as equivalentes para `requirements-keeper`:

```typescript
test('requirements-keeper: a description fala em sintoma, não em categoria', () => {
  const description = String(parseFrontmatter(skillSource('requirements-keeper'))?.data.description ?? '')
  assert.ok(description.length > 120)
  for (const sintoma of ['qual é a regra', 'deve fazer', 'especificad']) {
    assert.ok(description.toLowerCase().includes(sintoma), `description sem o sintoma "${sintoma}"`)
  }
})

test('requirements-keeper não duplica o formato do requisito', () => {
  const source = skillSource('requirements-keeper')
  assert.match(source, /templates\/requirements\.md/)
  assert.doesNotMatch(source, /^- \*\*status:\*\*/m, 'a skill não deve conter o template do requisito')
})
```

O assert de que `plugin/commands` tem exatamente quatro arquivos **fica como está**: a Fase 2 não adiciona comando, e o teste é o que garante isso.

- [ ] **Step 3: Verificar e commitar**

```bash
docker compose exec toolkit npm test
git add plugin test/plugin
git commit -m "feat(SK-4): skill requirements-keeper e teste de autoria sobre todas as skills"
```

---

### Task 11: `living-docs init --stage` — a moldura por estágio de maturidade

**Objetivo:** `SK-0` passo 2 da spec — "determinar o estágio e derivar o conjunto mínimo; não instalar o que o estágio não pede". Até aqui só existia um conjunto; com a Fase 2 pronta, passam a existir dois.

**Requisitos:**

- `--stage solo` (default) instala o que as Fases 0–1 instalavam. Nada muda para quem já rodou.
- `--stage small-team` acrescenta a moldura de requisitos: os três arquivos, as três entradas em `.ownership.yml` (com `cited-by`), e as linhas do CODEOWNERS.
- Idempotência preservada: rodar duas vezes não duplica, não reescreve, não renumera. Rodar `solo` depois de `small-team` **não** remove nada.
- Estágio desconhecido é erro com mensagem que lista os válidos.
- Honestidade: `small-team` imprime o que ainda **não** existe (Fases 3 e 4), em vez de fingir que instalou o estágio inteiro.

- [ ] **Step 1: `templates/requirements.md`**

```markdown
---
title: { { TITLE } }
owner: '{{OWNER}}'
trigger: >
  Antes de implementar qualquer comportamento desta família, e a toda regra nova
  ou alterada.
last-reviewed: { { TODAY } }
---

# {{TITLE}}

Cada requisito é uma seção com ID citável. O ID nunca é reciclado, e é ele que
torna o raio de impacto calculável por `grep`.

Formato de uma seção:
```

## {{PREFIX}}-0001 — Título afirmativo da regra

- **status:** draft
- **relates-to:** ADR-0001
- **fora de escopo:** o que esta regra deliberadamente não cobre

O enunciado, em uma ou duas frases. O que **deve** ser — nunca o que o código faz.

```

<!-- As seções entram abaixo. Skill dona: requirements-keeper. -->
```

Um template só, parametrizado por `{{PREFIX}}`/`{{TITLE}}`, para os três arquivos: três templates quase idênticos são três lugares para divergir.

- [ ] **Step 2: `templates/ownership.yml` ganha o bloco condicional**

Acrescente `{{REQUIREMENTS_BLOCK}}` logo depois do artefato `TDR`, e nada mais. Para `--stage solo` a substituição é a string vazia; para `small-team`:

```yaml
- id-prefix: RF
  path: docs/requirements/functional.md
  owner: '{{OWNER}}'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**']

- id-prefix: RNF
  path: docs/requirements/non-functional.md
  owner: '{{OWNER}}'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**']

- id-prefix: RN
  path: docs/requirements/rules.md
  owner: '{{OWNER}}'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**', 'src/**']
```

- [ ] **Step 3: `src/cli/init.ts`**

```typescript
export const STAGES = ['solo', 'small-team'] as const
export type Stage = (typeof STAGES)[number]

export interface InitOptions {
  owner: string
  dryRun: boolean
  stage: Stage
}
```

- `resolvePath` ganha os três prefixos novos, com `ADOPTION_CANDIDATES` para requisitos preexistentes sob outro nome: `docs/requisitos.md`, `docs/requirements.md`, `spec/`, `docs/spec/`. **Adotar, nunca criar paralelo** — é o passo 1 de `SK-0` e o anti-padrão mais caro da lista.
- O bloco de requisitos só é renderizado quando `stage === 'small-team'`.
- `InitResult` ganha `stage: Stage` e `notInstalled: string[]`, para o CLI imprimir o que ficou fora.

- [ ] **Step 4: `src/cli/index.ts`**

```typescript
const stageIndex = argv.indexOf('--stage')
const stage = stageIndex === -1 ? 'solo' : (argv[stageIndex + 1] ?? '')
if (stageIndex !== -1 && !STAGES.includes(stage as Stage)) {
  process.stderr.write(`living-docs: estágio "${stage}" desconhecido. Válidos: ${STAGES.join(', ')}.\n`)
  return 2
}
```

E, ao final, a lista honesta:

```typescript
for (const item of result.notInstalled) {
  process.stdout.write(`não instalado  ${item}\n`)
}
```

com `notInstalled` trazendo, para `small-team`, algo como `SK-6 + DoD + HK-4/HK-5 (Fase 3) — não implementados nesta versão` e `SK-1, SK-2, AG-2 (Fase 4) — não implementados nesta versão`. Atualize o `USAGE`.

- [ ] **Step 5: Testes — `test/cli/init.test.ts`**

```typescript
test('--stage solo não cria requisitos', …);
test('--stage small-team cria os três arquivos e as três entradas no .ownership.yml', …);
test('--stage small-team é idempotente: a segunda execução não reescreve nem duplica', …);
test('solo depois de small-team não remove os requisitos já criados', …);
test('adota docs/requisitos.md preexistente em vez de criar um paralelo', …);
test('o resultado lista o que não foi instalado, em vez de fingir o estágio completo', …);
```

- [ ] **Step 6: Verificar e commitar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
git add src test templates
git commit -m "feat(SK-0): living-docs init --stage instala a moldura de requisitos"
```

---

### Task 12: Dogfooding da Fase 2 — requisitos reais, citados por teste

**Objetivo:** o toolkit obedece a própria regra que impõe. Sem isto, `CI-3` está implementado e nunca foi exercido contra conteúdo de verdade — e a Fase 2 fica com a mesma falha que a spec §13 chama de wiki morta.

**Requisitos:**

- Os requisitos descrevem **o que o toolkit deve ser**, não o que o código faz. Um requisito que só se entende lendo `src/` é narração de código e deve ser recusado (spec §13).
- Toda `RN` `active` ganha citação em pelo menos um teste. A citação vai no **nome do teste** ou num comentário na linha da asserção — o lugar onde alguém que quebrou a regra vai ler.
- Nenhum ADR é editado: `ADR-0001` e `ADR-0002` estão em `draft`, então acrescentar `relates-to` é legítimo. Depois de aceitos, não seria.

- [ ] **Step 1: Fechar `relates-to` dos ADRs existentes — antes de qualquer aceitação**

`ADR-0001` está `accepted`? Não: hoje ele está `draft`, e é por isso que este passo é possível. `CI-3` regra 6 exige `relates-to` preenchido em ADR `accepted` — e `accepted` é congelado, com `relates-to` **fora** da `mutable-fields`. Ou seja: um ADR aceito com `relates-to: []` é um beco sem saída que só se resolve supersedindo.

Portanto, ainda em `draft`, `ADR-0001` passa a citar os requisitos que ele decide:

```yaml
relates-to: [RNF-0002, RNF-0003]
```

e `ADR-0003` passa a citar também `RNF-0003`. Registre isso no procedimento de `decision-recorder` se ainda não estiver óbvio na skill: **preencher `relates-to` é pré-condição de aceitação, não consequência dela.**

- [ ] **Step 2: `docs/.ownership.yml` — os três artefatos de requisito e o `field-map`**

```yaml
- id-prefix: RF
  path: docs/requirements/functional.md
  owner: '@esliph/engineering'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**']

- id-prefix: RNF
  path: docs/requirements/non-functional.md
  owner: '@esliph/engineering'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**']

- id-prefix: RN
  path: docs/requirements/rules.md
  owner: '@esliph/engineering'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**', 'src/**']
```

E o `field-map` de `DA` (Task 5, Step 4), se ainda não tiver entrado.

- [ ] **Step 3: `CODEOWNERS`**

```
docs/requirements/    @esliph/engineering
```

- [ ] **Step 4: `docs/requirements/rules.md` — as regras de negócio do toolkit**

Frontmatter a partir de `templates/requirements.md`, e as seções:

```markdown
## RN-0001 — Todo artefato tem exatamente um dono declarado

- **status:** draft
- **relates-to:** ADR-0002
- **fora de escopo:** quem revisa o artefato; isto trata de propriedade, não de revisão

Um artefato de documentação viva pertence a um e apenas um dono, declarado em
`docs/.ownership.yml` e espelhado no CODEOWNERS. Dois donos para o mesmo caminho
é divergência garantida; zero donos torna o artefato órfão e não enforceável.

## RN-0002 — `trigger` nomeia um evento observável, nunca uma cadência

- **status:** draft
- **fora de escopo:** a redação do gatilho; o que se exige é a natureza dele

O campo `trigger` declara **quando** o artefato deve ser atualizado, e a resposta
é sempre um evento que alguém pode observar acontecer. Data de calendário
("trimestral", "a cada sprint") descreve intenção de revisão, não necessidade de
mudança — e é o que transforma documento em ritual.

## RN-0003 — Um ID identifica um item, para sempre

- **status:** draft
- **fora de escopo:** o formato do ID, que é contrato de máquina e não regra de negócio

Um ID nunca identifica dois itens, e nunca é reaproveitado depois que o item
deixa de existir. `ADR-001` e `ADR-0001` são o mesmo ID: repadding não cria um
item novo. Sem isso, uma citação antiga passa a apontar para outra coisa em
silêncio, que é pior do que apontar para nada.

## RN-0004 — Item congelado só muda nos campos da allowlist

- **status:** draft
- **relates-to:** RN-0006
- **fora de escopo:** quem decide congelar; isso é a máquina de estados

Um item em estado terminal aceita mudança apenas nos campos que o `.ownership.yml`
declara mutáveis — tipicamente `status`, `superseded-by` e `last-reviewed`. É
essa allowlist que permite supersedir um ADR sem violar a imutabilidade dele.

## RN-0005 — Promoção de estado é ato humano

- **status:** draft
- **fora de escopo:** a criação do item, que é ato de agente

Nenhum agente promove sozinho um item para um estado que significa aceitação
(`draft → accepted`, `open → resolved`, `draft → active`, `active → revoked`). O
máximo que uma skill escreve é `draft`/`open`. Aceitar é decidir, e decidir não
é do agente.

## RN-0006 — Estado terminal não permite edição do corpo

- **status:** draft
- **relates-to:** TDR-0001
- **fora de escopo:** o congelamento por seção dentro de arquivo de coleção, que TDR-0001 registra como dívida

Um item que chegou ao estado terminal não se corrige: a história é o ativo. Um
ADR aceito que se revelou errado ganha `superseded`, e a decisão nova explica o
erro.

## RN-0007 — Toda citação resolve, ou o CI falha

- **status:** draft
- **fora de escopo:** citação a prefixo não declarado no `.ownership.yml`, que é ignorada de propósito para permitir instalação por fases

Uma referência `<PREFIXO>-<número>` a um prefixo conhecido aponta para um item
existente e não retirado. Citação pendurada é pior que ausência de citação:
ela afirma uma rastreabilidade que não existe.
```

- [ ] **Step 5: `docs/requirements/non-functional.md`**

```markdown
## RNF-0001 — Hook falha aberta, em até 5 segundos, sem rede

- **status:** draft
- **fora de escopo:** o CI, que falha fechado de propósito

Qualquer erro na execução de um hook — configuração ilegível, container fora do
ar, timeout — resulta em deixar passar. O enforcement que sobrevive a hook
quebrado é o CI; hook quebrado que trava o trabalho é removido pelo usuário no
primeiro dia, e aí não há enforcement nenhum.

## RNF-0002 — Nada roda no host além de Docker

- **status:** draft
- **relates-to:** ADR-0001
- **fora de escopo:** o próprio Docker e o `git`

Nenhum comando `node`, `npm` ou `npx` é executado fora do container. O host
empresta apenas o daemon.

## RNF-0003 — A raiz do toolkit e a do repositório validado são independentes

- **status:** draft
- **relates-to:** ADR-0003
- **fora de escopo:** o mecanismo de distribuição do toolkit, que ADR-0003 deliberadamente não decide

Descobrir onde o toolkit está e descobrir qual repositório validar são duas
perguntas distintas, com respostas que podem coincidir e não podem se confundir.
```

- [ ] **Step 6: `docs/requirements/functional.md`**

```markdown
## RF-0001 — `validate` falha o build quando há erro, e só então

- **status:** draft
- **fora de escopo:** o formato da saída

`living-docs validate` sai com código 1 se qualquer check produziu achado de
severidade `error`, e 0 caso contrário. Aviso não falha o build — aviso ignorado
é o começo da wiki morta, e por isso quase nada é aviso.

## RF-0002 — `init` é idempotente e adota o que já existe

- **status:** draft
- **fora de escopo:** migrar o conteúdo do artefato adotado para outro formato

Rodar `living-docs init` duas vezes não duplica arquivo, não reescreve conteúdo
existente e não renumera ID. Encontrando artefato equivalente sob outro caminho,
adota-o no `.ownership.yml` em vez de criar um paralelo.

## RF-0003 — `init` instala o conjunto do estágio, e diz o que não instalou

- **status:** draft
- **fora de escopo:** escolher o estágio, que é julgamento humano

`living-docs init --stage <estágio>` instala apenas a moldura que o estágio pede,
e lista explicitamente o que ficou fora.
```

- [ ] **Step 7: Citar os IDs nos testes que já os cobrem**

Uma citação por regra, no nome do teste — é lá que quem quebrou a regra lê:

| ID                   | Arquivo                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `RN-0001`            | `test/config/ownership.test.ts` (dois donos para o mesmo prefixo é erro) |
| `RN-0002`            | `test/checks/ci1-structure.test.ts` (cadência reprovada)                 |
| `RN-0003`, `RN-0007` | `test/checks/ci2-ids.test.ts` (duplicado, retirado, citação pendurada)   |
| `RN-0004`, `RN-0006` | `test/hooks/hk1-append-only.test.ts`                                     |
| `RN-0005`            | `test/hooks/hk3-state-promotion.test.ts`                                 |
| `RNF-0001`           | `test/hooks/lib/*.test.ts` e o caso de configuração ilegível em `hk1`    |
| `RNF-0003`           | `test/core/roots.test.ts` e `test/acceptance/consumer-repo.test.ts`      |
| `RF-0001`            | `test/cli/validate.test.ts`                                              |
| `RF-0002`            | `test/cli/init.test.ts`                                                  |
| `RF-0003`            | `test/cli/init.test.ts` (casos de `--stage`)                             |

Exemplo:

```typescript
test('RN-0002: trigger com cadência é reprovado nomeando o campo', () => { … });
```

- [ ] **Step 8: PARAR — a promoção para `active` é humana**

Os requisitos nascem `draft`. Enquanto estiverem `draft`, `CI-3` regra 7 **não**
os cobra (ela só olha `active`), e o repositório passa. Peça a promoção a uma
pessoa; `HK-3` vai perguntar. Depois de promovidos, `validate` passa a exigir a
citação de cada um — e é aí que o Step 7 se prova.

- [ ] **Step 9: Verificar**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate; echo "exit=$?"
```

Esperado: `exit=0` com os requisitos em `draft`; e `exit=0` também depois de promovidos, porque o Step 7 fechou a cobertura. Se algum `RN` `active` acusar falta de citação, **o certo é acrescentar a citação**, não relaxar `cited-by`.

- [ ] **Step 10: Commit**

```bash
git add docs CODEOWNERS test
git commit -m "docs(RN-0001..RN-0007, RNF-0001..RNF-0003, RF-0001..RF-0003): requisitos do toolkit citados por teste"
```

---

### Task 13: Fechamento — README, cobertura da spec e o backlog

**Objetivo:** deixar o repositório dizendo a verdade sobre o que ele é agora, e o próximo plano com insumo em vez de arqueologia.

- [ ] **Step 1: `README.md`**

Reescreva as seções afetadas:

````markdown
## Uso

```bash
docker compose up -d                    # dogfooding: valida este próprio repositório
./bin/living-docs init --stage solo     # cria a moldura (SK-0)
./bin/living-docs validate              # roda CI-1, CI-2 e CI-3
```
````

Para validar **outro** projeto — a fonte do toolkit e o repositório validado são
raízes distintas (`ADR-0003`):

```bash
LIVING_DOCS_TARGET=/caminho/do/projeto docker compose up -d
./bin/living-docs init --stage small-team --owner @time
./bin/living-docs validate
```

Desenvolvimento:

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

## Plugin do Claude Code

`plugin/` traz as skills `decision-recorder` (`/adr`, `/open-decision`, `/debt`),
`living-docs-bootstrap` (`/docs-setup`) e `requirements-keeper` (sem comando: é
selecionada pela `description`), e os hooks `HK-1` (bloqueia editar item
congelado) e `HK-3` (promoção de estado exige ato humano). Os hooks falham
abertos: com o container parado, eles não bloqueiam nada — o enforcement que
sobrevive a isso é o CI.

## O que está fora

`SK-1`, `SK-2`, `SK-5`–`SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-4`–`HK-7`,
`CI-4`–`CI-8`, `CM-4`, `CM-5`, `CM-7` — Fases 3 a 7 da spec. O que falta e em
que ordem: `docs/superpowers/plans/BACKLOG-fases-3-7.md`.

````

A seção **"Limitações desta fase"** do README atual — a que descreve a raiz única — sai inteira: ela deixou de ser verdade em `ADR-0003`. Deixar limitação vencida no README é a mesma doença que `AG-1` procura ("doc mentiroso").

- [ ] **Step 2: Atualizar a tabela de cobertura do plano das Fases 0–1**

Em `docs/superpowers/plans/2026-08-24-living-docs-toolkit-core.md`, a linha de §8 dizia "Parcial — pares bidirecionais são `CI-3`, Fase 2". Marque como coberta por este plano, com o link. Um plano antigo que continua declarando pendência já resolvida é a mesma mentira, em outro arquivo.

- [ ] **Step 3: Escrever `docs/superpowers/plans/BACKLOG-fases-3-7.md`**

O conteúdo está na seção final deste plano ("O que fica para o próximo plano"). Copie-o para o arquivo, que é o insumo de quem escrever o plano seguinte.

- [ ] **Step 4: Rodar tudo**

```bash
docker compose down && docker compose up -d --build
docker compose exec toolkit npm ci
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate; echo "exit=$?"

LIVING_DOCS_TARGET=/tmp/projeto-alheio docker compose up -d
./bin/living-docs init --stage small-team --owner @alguem
./bin/living-docs validate; echo "exit=$?"
docker compose down && docker compose up -d
````

Esperado: tudo verde; `exit=0` nos dois repositórios; nenhum arquivo novo no checkout do toolkit depois do teste com o projeto alheio.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/plans
git commit -m "docs: README e cobertura da spec após ADR-0003 e Fase 2; backlog das Fases 3-7"
```

---

## Cobertura da spec e o que ficou fora

| Peça da spec                                                     | Onde                                                   | Situação                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| §3 `collection: sections` (granularidade "seções com ID")        | Task 6                                                 | Implementado                                                                      |
| §3 `.ownership.yml` como único ponto de extensão (`field-map`)   | Task 5                                                 | Implementado                                                                      |
| §4 Ciclo de vida de requisito (`draft → active → revoked`)       | Task 7                                                 | Implementado                                                                      |
| §4 "Nenhum agente promove estado sozinho" para requisitos        | Task 7 (`HUMAN_PROMOTIONS`), Task 6 (`HK-3` em seções) | Implementado                                                                      |
| §4 "Nenhum estado terminal permite edição do corpo"              | Task 7                                                 | **Parcial** — por arquivo, não por seção; `TDR-0001`                              |
| §5 `SK-4` requirements-keeper                                    | Task 10                                                | Implementado                                                                      |
| §8 Pares bidirecionais fechados nos dois lados                   | Task 9 (`CI-3` regras 1–5)                             | Implementado                                                                      |
| §8 Toda `RN` `active` citada em `cited-by`                       | Tasks 8, 9 (regra 7)                                   | Implementado                                                                      |
| §8 ADR `accepted` cita ao menos um item                          | Task 9 (regra 6)                                       | Implementado                                                                      |
| §9 `CI-3` traceability                                           | Task 9                                                 | Implementado                                                                      |
| §10 Fase 2                                                       | Tasks 5–12                                             | Implementado                                                                      |
| §10 Estágios de maturidade (`SK-0` passo 2)                      | Task 11                                                | **Parcial** — `solo` e `small-team`; `production` e `multi-team` exigem Fases 5–7 |
| §11 Convenções de autoria para `SK-4`                            | Task 10 (com teste sobre todas as skills)              | Implementado                                                                      |
| §12 Critério de aceite 4 (comportamento sem regra → `DA` e para) | `SK-4` procedimento 2 e fronteiras                     | Declarado na skill; segue não afirmável por teste unitário                        |
| — `DA-0001` (raiz única toolkit/repo)                            | Tasks 1–4                                              | Resolvida por `ADR-0003`, verificada por teste                                    |

**Deliberadamente fora deste plano**, cada um com plano próprio: `SK-1`
charter-keeper, `SK-2` glossary-keeper, `SK-5` contract-keeper, `SK-6`
working-agreements-keeper, `SK-7` release-historian, `AG-1`
docs-divergence-auditor, `AG-2` decision-adversary, `HK-2` (artefato gerado),
`HK-4` (lembrete de doc dono), `HK-5` (`git commit` com doc pendente), `HK-6`
(inventário no `SessionStart`), `HK-7` (atalho sem TDR), `CI-4` staleness, `CI-5`
contract drift, `CI-6` changelog required, `CI-7` ownership coverage, `CI-8`
links, `CM-4` `/term`, `CM-5` `/docs-audit`, `CM-7` `/release`.

## O que fica para o próximo plano

Isto é o insumo de `docs/superpowers/plans/BACKLOG-fases-3-7.md` (Task 13, Step 3).

### Fase 3 — amarrar doc ao PR (o mecanismo 1)

`SK-6` working-agreements-keeper (`CONTRIBUTING.md`, `docs/definition-of-done.md`,
`CLAUDE.md`), `HK-4` (`PostToolUse` → injeta o doc dono do caminho vigiado) e
`HK-5` (`PreToolUse` em `git commit` → pergunta quando o staged toca caminho
vigiado sem o doc dono).

**Depende de:** `watches` deixar de ser `[]` no `.ownership.yml` — hoje o campo é
lido e validado, e nenhuma regra o preenche. É o primeiro trabalho da fase.
**Peça de engine que falta:** um `src/config/watches.ts` que responda "que docs
este conjunto de caminhos exige", usado pelos dois hooks e, na Fase 7, por `CI-7`.
**Risco conhecido:** `HK-5` intercepta `Bash`, não `Edit|Write` — é o primeiro
hook com matcher diferente, e o `run-hook.sh` atual passa o payload cru sem
distinguir evento. Verifique o contrato de `PreToolUse` para `Bash` antes.
**Critério de aceite da spec §12 que a fase fecha:** o 5.

### Fase 4 — linguagem e intenção

`SK-2` glossary-keeper (`docs/glossary.md`, `CM-4` `/term`), `SK-1` charter-keeper
(`docs/charter/constitution.md`, `vision.md`) e `AG-2` decision-adversary.

**Depende de:** `collection: table` para o glossary (já existe) e de um estado
`banned`/`renamed` na máquina de estados — a spec §4 os define para termo.
**Peça de engine que falta:** nenhuma grande; é sobretudo autoria de skill.
`AG-2` é o primeiro agent, então é também a primeira vez que o plugin declara
`agents/` — verifique o formato antes de planejar.
**Observação:** a Constitution exige "todo princípio tem enforcement nomeado".
Isso é regra de skill, não check — resista a inventar `CI-9` para medi-la.

### Fase 5 — contratos gerados

`SK-5` contract-keeper, `HK-2` (bloqueia editar artefato gerado) e `CI-5`
(regenerar produz diff ≠ 0).

**Depende de:** `generated[]` no `.ownership.yml` deixar de ser `[]`, e de existir
um gerador de verdade. **Este repositório não tem contrato gerado nenhum** — o
dogfooding da fase precisa inventar um alvo real (por exemplo, gerar a tabela de
checks do README a partir de `src/checks/registry.ts`) ou a fase fica sem prova.
**Peça de engine que falta:** `CI-5` precisa **executar** o comando do gerador
dentro do container e comparar a saída — é o primeiro check que roda subprocesso,
e o primeiro que pode ser lento. Vale decidir por ADR se ele roda em `validate`
ou num subcomando separado.
**Critério de aceite da spec §12 que a fase fecha:** o 6.

### Fase 6 — rastro histórico

`SK-7` release-historian (`CHANGELOG.md`, `docs/releases/`, `docs/deprecations.md`,
`docs/migrations/`), `CI-6` (changelog required) e `HK-7` (atalho novo sem TDR).

**Depende de:** `consumer-visible-paths` preenchido, e de `CI-6` conseguir ler o
**diff** — é o primeiro check que não se contenta com o estado da árvore.
Decidir por ADR de onde vem o diff (`git diff` contra a base do PR) e como isso
se comporta fora de CI.
**Peça de engine que falta:** `src/git/diff.ts`, e o rótulo de exceção que a spec
§5 (`SK-7`, regra 2) menciona sem definir o formato — isso é uma `DA` a abrir.
**Observação:** `HK-7` é `additionalContext`, nunca `deny` — um atalho legítimo
não pode ser bloqueado (spec §7).

### Fase 7 — manutenção contínua

`AG-1` docs-divergence-auditor (`CM-5` `/docs-audit`), `HK-6` (inventário no
`SessionStart`), `CI-4` (staleness — o **único** check autorizado a só avisar),
`CI-7` (ownership coverage) e `CI-8` (links).

**Depende de:** tudo acima; é a fase que fecha os critérios de aceite 7 e 8 da
spec §12.
**Peça de engine que falta:** `CI-4` precisa de "hoje" — e o toolkit hoje não tem
nenhuma fonte de data injetável, o que torna o check impossível de testar de
forma determinística. Planeje um `CheckContext.today` **antes** de escrever
`CI-4`. `CI-8` precisa de um resolvedor de link relativo e da regra "anexo
binário sob `docs/` reprova" (spec §13).
**Observação:** `CI-7` inclui "contrato do agente repetindo texto de um artefato
dono" — detecção de duplicação textual, que é o único check da spec com risco
real de falso positivo. Vale um ADR sobre o limiar antes de implementar.

### Dívidas e decisões abertas herdadas

- **`TDR-0001`** — `HK-1` não congela seção revogada dentro de arquivo de
  coleção. Gatilho de pagamento: o primeiro PR que revogar um requisito.
- **`ADR-0001` e `ADR-0002` seguem `draft`.** Nenhum ADR deste repositório foi
  aceito por uma pessoa até aqui. Enquanto estiverem em `draft`, `CI-3` regra 6
  não os cobra; ao aceitá-los, `relates-to` precisa já estar preenchido, porque
  `accepted` é congelado e `relates-to` não está na `mutable-fields`.
- **Distribuição do toolkit.** `ADR-0003` decide as duas raízes e **não** decide
  como o toolkit chega a um projeto consumidor (clone? imagem publicada? pacote?).
  Vale abrir uma `DA` no primeiro consumidor real.
- **`--stage production` e `--stage multi-team`** não existem porque as fases que
  eles instalariam não existem. Acrescente cada estágio junto com a fase, não
  antes: estágio que instala moldura vazia é a "wiki morta" nascendo de fábrica.
