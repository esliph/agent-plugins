# Fase 5 do toolkit de documentação viva — contratos gerados

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `SK-5` contract-keeper, `HK-2` (bloqueia editar artefato
gerado) e `CI-5` (regenerar produz diff ≠ 0) — a Fase 5 da spec (§10), que
fecha o critério de aceite 6 (§12) e abre o estágio `production`.

**Architecture:** Três peças de engine novas, todas pequenas.
`src/exec/command.ts` traz um `CommandRunner` injetável — o irmão do `GitRunner`
da Fase 3, com uma diferença deliberada: ele **não** falha aberta, porque um
gerador que não roda é achado, não silêncio. `src/checks/ci5-contract-drift.ts`
executa o comando de cada entrada de `generated[]` e compara a **saída padrão**
com o arquivo em disco. `src/hooks/hk2-generated-artifact.ts` é o quinto hook,
no mesmo molde de `HK-1`. `CI-5` **não** entra em `living-docs validate`: ele
roda num subcomando próprio, `living-docs drift` — é o único check que executa
um comando declarado pelo repositório validado, e o único que pode ser lento
(`ADR-0005`).

O dogfooding é real: este repositório passa a ter um contrato gerado de
verdade, `docs/contracts/checks.gen.md`, produzido a partir de
`src/checks/registry.ts`. Sem ele a fase não teria prova nenhuma — o backlog
já avisava.

**Tech Stack:** TypeScript (Node ≥ 24, executado só em container —
`RNF-0002`), `node:test`, `node:child_process` (`execSync`), Claude Code plugin
(`SKILL.md`, `hooks.json`).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §2 (marcador de gerado), §3 (layout
de `docs/contracts/`, `generated[]`), §5 (`SK-5`), §7 (`HK-2`), §9 (`CI-5`),
§10 (Fase 5), §12 (critério 6) —
`docs/superpowers/plans/BACKLOG-fases-3-7.md` (seção "Fase 5") traz o
levantamento que este plano resolve.

## Global Constraints

- Nada roda no host além de Docker — todo comando via
  `docker compose exec toolkit …` ou `./bin/living-docs` (`RNF-0002`).
- Identificadores, nomes de arquivo e IDs em inglês/neutro; prosa em
  português (spec §11).
- ID nunca reciclado — confira `docs/ids-retired.txt` antes de tomar um número
  novo (spec §2). Os números livres nesta fase: `ADR-0005`, `RF-0006`,
  `RF-0007`, `RN-0012`.
- Toda seção de requisito nasce `status: draft`; todo ADR novo nasce
  `status: draft`. Promover é ato humano (`RN-0005`) — `HK-3` intercepta, e a
  resposta não é sua.
- Mensagem de commit cita o ID afetado, formato `tipo(ID): assunto`
  (`CONTRIBUTING.md`).
- Hook falha aberta em até 5 s, sem rede (`RNF-0001`). `CI-5` **não** falha
  aberta: check é o enforcement que sobrevive a agente ausente, e um gerador
  quebrado precisa aparecer.
- `docs/contracts/errors.md` e `docs/contracts/versioning-policy.md` **não**
  entram em `artifacts:` no `.ownership.yml` — mesmo tratamento que
  `CONTRIBUTING.md`, a DoD, o glossary e o charter já recebem (`ADR-0004`).
  `DA-0002` continua aberta; nenhuma task deste plano a resolve.
- O `init` **não inventa gerador**, pela mesma razão que não inventa `watches`
  (`RF-0004`): moldura vazia ensina a ignorar o mecanismo.
- Gerador é **determinístico**: nenhuma data, nenhum caminho de máquina, nenhum
  contador na saída. Um gerador que imprime "gerado em `<hoje>`" produz deriva a
  cada execução e desliga `CI-5` no segundo dia.

### `HK-5` vai perguntar — leia antes de commitar qualquer task

`docs/.ownership.yml` tem `watches` preenchido desde a Fase 3. Três entradas
atingem os commits deste plano:

| Caminho vigiado | Doc dono exigido no mesmo commit | Tasks afetadas |
| --- | --- | --- |
| `src/hooks/**` | `docs/requirements/rules.md` | 2 |
| `src/checks/**` | `docs/requirements/rules.md` (+ `docs/contracts/checks.gen.md` a partir da Task 4) | 3, 4 |
| `src/cli/**` | `docs/requirements/functional.md` | 3, 5 |
| `plugin/skills/**` | `CONTRIBUTING.md` | 7 |

`HK-5` **pergunta** (`ask`), nunca nega (`RN-0009`) — mas a pergunta chega, e
responder no escuro é o hábito que o hook existe para não ensinar. Cada task
afetada traz um bloco **`HK-5`** dizendo o que responder e por quê. Nas Tasks 2,
3, 4 e 5 a resposta é a mesma: o doc dono viajou na Task 1, com a regra que
aquele código implementa — é a ordem que `CONTRIBUTING.md` §"O ciclo" exige.
Na Task 7 é "sim, está junto".

### `HK-2` vai negar — e é assim que se sabe que ele funciona

A partir da Task 4, `docs/contracts/checks.gen.md` está declarado em
`generated[]`. **Não use `Edit` nem `Write` nesse arquivo em nenhum momento** —
`HK-2` nega, e essa negativa é o critério de aceite 6 acontecendo. Toda vez que
o arquivo precisar mudar, o caminho é regerar:

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
```

O redirecionamento acontece **dentro** do container de propósito: o shell do
host reescreveria o encoding do arquivo no Windows, e um CR a mais viraria
deriva de contrato.

---

## Cobertura da spec

| Peça | Task |
| --- | --- |
| `ADR-0005` — contrato do gerador (stdout) e onde `CI-5` roda | 1 |
| `HK-2` (`PreToolUse`/`Edit\|Write`, `deny`) | 2 |
| `CI-5` (contract drift) + `CommandRunner` | 3 |
| `living-docs drift` + ponteiro em `validate` | 3 |
| Gerador real + `docs/contracts/checks.gen.md` + `generated[]` | 4 |
| `init --stage production` + templates de contrato | 5 |
| `docs/contracts/errors.md`, `versioning-policy.md` (deste repo) | 6 |
| `SK-5` contract-keeper | 7 |
| Critério de aceite 6 + índices (README, `CLAUDE.md`, DoD, workflow) | 8 |
| Promoção humana | 9 |

**Critério de aceite 6 da spec §12** — "dado um contrato gerado, quando alguém o
edita à mão, então `HK-2` nega — e, se passar por fora do agente, `CI-5` falha"
— é fechado **inteiro** por esta fase, diferente do critério 5 (que a Fase 3
fechou pela metade). As duas metades existem aqui: o hook na Task 2, o check na
Task 3, e o teste que exercita as duas na Task 8.

Nenhum comando novo (`CM-n`): a spec §10 não dá comando a `SK-5`. A skill é
selecionada pela `description`, como `requirements-keeper` e
`working-agreements-keeper`.

---

### Task 1: A regra antes do código — `ADR-0005`, `RF-0006`, `RF-0007`, `RN-0012`

**Objetivo:** Antes de qualquer código, registrar a decisão que o backlog
deixou em aberto (o contrato do gerador e onde `CI-5` roda) e os três
requisitos que o resto do plano implementa — em `draft`, para promoção humana
na Task 9.

**Files:**
- Create: `docs/decisions/adr/ADR-0005-contrato-do-gerador-e-onde-ci5-roda.md`
- Modify: `docs/requirements/functional.md` (`RF-0006`, `RF-0007`)
- Modify: `docs/requirements/rules.md` (`RN-0012`)

**Interfaces:**
- Produz: os IDs `ADR-0005`, `RF-0006`, `RF-0007`, `RN-0012`, citados pelo
  código e pelos testes das Tasks 2–8.

**Requisitos:**
- Os quatro nascem em estado inicial da máquina (`draft`) — a promoção é a
  Task 9, e é humana (`RN-0005`).
- `ADR-0005` não resolve `DA-0002` e não a menciona como resolvida.
- `relates-to` de `ADR-0005` já nasce preenchido: `accepted` congela o arquivo,
  e `relates-to` não está na `mutable-fields` — um ADR aceito com
  `relates-to: []` só se conserta supersedindo.

- [ ] **Step 1: Escrever `ADR-0005` em `draft`**

Crie `docs/decisions/adr/ADR-0005-contrato-do-gerador-e-onde-ci5-roda.md`:

```markdown
---
id: ADR-0005
title: O gerador imprime na saída padrão, e CI-5 roda num subcomando próprio
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-25
relates-to: [RF-0006, RN-0012]
supersedes: null
superseded-by: null
---

# ADR-0005 — O gerador imprime na saída padrão, e CI-5 roda num subcomando próprio

## Contexto

A Fase 5 (spec §10) entrega `CI-5`: "regenerar o contrato produz diff ≠ 0"
(§9). O `.ownership.yml` já declara a forma da configuração desde a Fase 0 —
`generated: [{ path, command }]` — mas nunca disse **o que `command` faz**, e
`generated` está vazio em todo repositório até hoje.

Duas perguntas ficaram em aberto, e as duas mudam a engine:

1. O comando **escreve o arquivo** ou **imprime o conteúdo**? É o contrato que
   todo projeto consumidor vai ter de cumprir.
2. `CI-5` roda dentro de `living-docs validate`, junto com `CI-1`–`CI-3`, ou
   num subcomando separado? `CI-5` é o primeiro check que executa subprocesso —
   e o comando que ele executa vem do repositório **validado**, não do toolkit.

## Alternativas consideradas

**O gerador escreve o arquivo e `CI-5` compara com `git diff --exit-code`.**
É como a maioria dos geradores do mercado funciona (OpenAPI, protobuf, ORM).
Descartada: o check passaria a **reescrever o arquivo que está checando**, o
que apaga a evidência no mesmo instante em que a reporta — quem lê a falha no
CI já não consegue ver o conteúdo antigo. Além disso, amarra `CI-5` ao `git`
(árvore limpa, `safe.directory`, repositório inicializado), e um check que
depende do estado da árvore não é reproduzível localmente.

**`CI-5` dentro de `validate`, junto com os demais.** É mais difícil de
esquecer, e a spec §9 lista os oito checks lado a lado. Descartada nesta fase:
`validate` hoje só **lê** arquivos, e `runValidate` é chamado in-process pela
suíte de testes. Passar a executar um comando arbitrário declarado pelo
repositório alvo muda a natureza do comando — um agente que valida um
repositório recém-clonado passaria a executar código dele sem pedir nada a
ninguém — e torna a suíte dependente do ambiente.

**`CI-5` só quando uma flag pede (`validate --generated`).** Descartada: uma
flag que ninguém digita é um check que nunca roda, com a agravante de parecer
instalado.

**O gerador imprime na saída padrão e não escreve nada; `CI-5` compara a saída
com o arquivo em disco; `CI-5` roda em `living-docs drift`. Escolhida.**

## Decisão

1. `generated[].command` **imprime na saída padrão o conteúdo esperado do
   artefato e não escreve arquivo nenhum.** `CI-5` captura essa saída e a
   compara com o arquivo versionado.
2. A comparação normaliza `\r\n` para `\n` e apara as quebras de linha finais.
   CR vem do checkout, não do gerador; uma quebra final a mais é
   redirecionamento de shell. Qualquer outra diferença é deriva.
3. `CI-5` **não** entra na lista de `living-docs validate`. Ele roda em
   `living-docs drift`, o único subcomando que executa comando do repositório
   validado.
4. `validate` não fica em silêncio sobre isso: quando `generated[]` não está
   vazio, ele imprime uma linha dizendo que a deriva de contrato é verificada
   por `living-docs drift`. É ponteiro, não achado — não altera o exit code.
5. Gerador que falha (exit ≠ 0, timeout) e artefato declarado e ausente são
   achados de severidade `error`, não silêncio. `CI-5` não falha aberta: essa
   é a política dos **hooks** (`RNF-0001`), e um check que se cala quando o
   gerador quebra mente com a autoridade de quem passou.

## Consequências

### O que se ganha

- `CI-5` é uma função pura de (comando, arquivo) → achados: sem git, sem
  mutação de árvore, testável com executor falso.
- `validate` continua sendo o que sempre foi — leitura — e continua chamável
  in-process pela suíte sem efeito colateral.
- O contrato do gerador é uma frase que cabe num template: "imprima o conteúdo,
  não escreva o arquivo".

### O que se aceita perder

- Geradores de mercado que só escrevem arquivo precisam de um invólucro que
  gere num diretório temporário e imprima o resultado. É trabalho a mais de
  quem instala, e está dito no comentário de `templates/ownership.yml`.
- Um projeto pode nunca rodar `living-docs drift` e não perceber. A mitigação é
  social e não é automática: o workflow deste repositório roda, a Definition of
  Done nomeia `CI-5`, e `validate` aponta o subcomando quando há o que checar.
- `CI-5` executa um comando declarado pelo repositório validado. Continua sendo
  execução de código de terceiro — o que muda é que ela acontece num comando
  que a pessoa digitou de propósito, não como efeito colateral de `validate`.
```

- [ ] **Step 2: Acrescentar `RF-0006` e `RF-0007` em `draft`**

No final de `docs/requirements/functional.md`, depois de `RF-0005`:

```markdown

## RF-0006 — `living-docs drift` compara o artefato gerado com a saída do gerador

- **status:** draft
- **relates-to:** ADR-0005
- **fora de escopo:** gerar o artefato — `drift` compara, nunca escreve

Para cada entrada de `generated[]` no `.ownership.yml`, `living-docs drift`
executa `command`, compara a saída padrão com o arquivo em `path` e sai com
código 1 se houver diferença, se o gerador falhar, ou se o arquivo declarado
não existir. Sem entrada nenhuma declarada, ele diz isso e sai com 0.

`living-docs validate` não roda essa comparação; quando há artefato gerado
declarado, ele aponta o subcomando que a faz.

## RF-0007 — `init --stage production` instala a moldura de contratos

- **status:** draft
- **relates-to:** RF-0005
- **fora de escopo:** declarar o gerador — `generated[]` nasce vazio, com
  exemplo comentado, pela mesma razão que `watches` nasce vazio (`RF-0004`)

No estágio `production`, `living-docs init` cria, além de tudo que
`small-team` cria, `docs/contracts/errors.md` e
`docs/contracts/versioning-policy.md` a partir dos templates, com a mesma
idempotência e a mesma política de adoção dos demais artefatos.

O estágio declara o que ainda não instala: a Fase 6 da spec §10 pertence a
`production` e não existe nesta versão.
```

- [ ] **Step 3: Acrescentar `RN-0012` em `draft`**

No final de `docs/requirements/rules.md`, depois de `RN-0011`:

```markdown

## RN-0012 — Artefato gerado não se edita: muda-se a fonte

- **status:** draft
- **relates-to:** ADR-0005
- **fora de escopo:** qual é a fonte de cada artefato gerado, que é
  configuração do projeto e mora em `generated[].command`

Um artefato declarado em `generated[]`, ou que carrega o marcador
`generated: do not edit`, só muda por execução do gerador. Uma edição à mão
sobrevive até a próxima execução e mente até lá — com o agravante de parecer
verdade assinada por uma ferramenta.

O que se escreve à mão é a política em volta do contrato — versionamento,
depreciação, catálogo de erros —, nunca o contrato.
```

- [ ] **Step 4: Rodar validate e confirmar que o `draft` passa limpo**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Esperado: `exit=0`. É o `draft` que compra isso: `RF-0006`, `RF-0007` e
`RN-0012` ainda não são `active`, então a regra 7 de `CI-3` (cobertura por
citação) não as cobra, e nenhum teste as menciona até as Tasks 2–5.
`ADR-0005` passa porque a regra 6 (`accepted` sem `relates-to`) só olha item
aceito.

`CI-2` **é** exercitado, e é o que importa checar: `ADR-0005` fecha a sequência
do prefixo `ADR` (0001–0005), `RF-0006`/`RF-0007` fecham a de `RF`, `RN-0012` a
de `RN`; e as citações a `RF-0006`, `RN-0012` e `ADR-0005` precisam resolver.
Menções como `CI-5`, `HK-2` ou `SK-5` são ignoradas: o padrão de citação exige
3 ou 4 dígitos (`src/ids/citations.ts`).

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0005-contrato-do-gerador-e-onde-ci5-roda.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0005, RF-0006, RF-0007, RN-0012): a regra da Fase 5 em draft"
```

---

### Task 2: `HK-2` — negar edição de artefato gerado

**Objetivo:** Implementar `RN-0012` no ponto mais barato: o hook que nega a
edição no instante em que ela é tentada, nomeando a fonte e o comando do
gerador.

**Files:**
- Create: `src/hooks/hk2-generated-artifact.ts`
- Create: `test/hooks/hk2-generated-artifact.test.ts`
- Modify: `plugin/hooks/hooks.json`
- Modify: `test/plugin/manifest.test.ts`

**Interfaces:**
- Consome: `loadOwnership`, `GeneratedRule` (`src/config/ownership.ts`);
  `toRepoPath` (`src/hooks/lib/paths.ts`); `denyOutput`, `emit`, `hookEnv`,
  `readPayload`, `HookEnv`, `HookPayload` (`src/hooks/lib/io.ts`).
- Produz:
  - `export type Hk2Decision = { action: 'allow' } | { action: 'deny'; reason: string }`
  - `export function decideHk2(payload: HookPayload, env: HookEnv): Hk2Decision`
  - `export function findGeneratedRule(rules: readonly GeneratedRule[], repoPath: string): GeneratedRule | null`

**Requisitos:**
- Nega por **duas** vias independentes: o caminho está em `generated[]`, ou o
  arquivo carrega o marcador `generated: do not edit` (spec §2). A segunda via
  existe porque, sem ela, bastaria não declarar o artefato para poder editá-lo.
- Nega mesmo quando o arquivo **não existe**, se o caminho está declarado:
  criar um artefato gerado à mão é exatamente o que a regra proíbe. `HK-1`
  permite criar item novo porque lá o item nasce de gente; aqui, de gerador.
- Falha aberta (`RNF-0001`): configuração ilegível, caminho fora do
  repositório, payload sem `file_path` → `allow`.
- A mensagem nomeia a regra de origem, o artefato dono, o comando do gerador e
  a skill (spec §7).

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/hooks/hk2-generated-artifact.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideHk2 } from '../../src/hooks/hk2-generated-artifact.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import type { HookEnv } from '../../src/hooks/lib/io.ts';
import type { Hk2Decision } from '../../src/hooks/hk2-generated-artifact.ts';

/** Narrowing tipado: sem isto, `decision.reason` não existe para o TypeScript. */
function assertDeny(decision: Hk2Decision): asserts decision is { action: 'deny'; reason: string } {
  assert.equal(decision.action, 'deny');
}

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/openapi.gen.yaml
    command: "node tools/gen-openapi.js"
`;

const GENERATED = 'docs/contracts/openapi.gen.yaml';

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): Hk2Decision {
  let decision: Hk2Decision = { action: 'allow' };
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, (root) => {
    const env: HookEnv = { root, hostRoots: [root] };
    decision = decideHk2({ tool_name: 'Edit', tool_input: toolInput }, env);
  });
  return decision;
}

test('RN-0012: nega editar artefato declarado em generated[] — critério de aceite 6', () => {
  const decision = decide(
    { [GENERATED]: 'openapi: 3.1.0\n' },
    { file_path: GENERATED, old_string: '3.1.0', new_string: '3.0.0' },
  );
  assertDeny(decision);
  assert.match(decision.reason, /node tools\/gen-openapi\.js/, 'a mensagem precisa nomear o comando do gerador');
  assert.match(decision.reason, /contract-keeper/, 'a mensagem precisa nomear a skill dona');
  assert.match(decision.reason, /openapi\.gen\.yaml/);
});

test('RN-0012: nega criar à mão o artefato gerado que ainda não existe', () => {
  const decision = decide({}, { file_path: GENERATED, content: 'openapi: 3.1.0\n' });
  assertDeny(decision);
});

test('RN-0012: o marcador vale sozinho — arquivo não declarado, mas autodeclarado gerado', () => {
  const file = 'docs/contracts/errors.gen.md';
  const decision = decide(
    { [file]: '<!-- generated: do not edit -->\n\n# Erros\n' },
    { file_path: file, old_string: '# Erros', new_string: '# Erros!' },
  );
  assertDeny(decision);
  assert.match(decision.reason, /generated\[\]/, 'a mensagem precisa pedir a declaração que falta');
});

test('o marcador só conta no topo do arquivo — prosa sobre o assunto não congela um doc', () => {
  const file = 'docs/requirements/rules.md';
  const corpo = `${'linha de prosa\n'.repeat(400)}o marcador \`generated: do not edit\` é da spec §2\n`;
  const decision = decide({ [file]: corpo }, { file_path: file, content: 'outra coisa' });
  assert.equal(decision.action, 'allow');
});

test('caminho comum passa — HK-2 só conhece o que é gerado', () => {
  assert.equal(decide({ 'src/index.ts': 'x' }, { file_path: 'src/index.ts', content: 'y' }).action, 'allow');
});

test('RNF-0001: falha aberta — .ownership.yml ilegível permite', () => {
  let decision: Hk2Decision = { action: 'deny', reason: 'não deveria' };
  withTempRepo({ [GENERATED]: 'openapi: 3.1.0\n' }, (root) => {
    decision = decideHk2(
      { tool_name: 'Write', tool_input: { file_path: GENERATED, content: 'x' } },
      { root, hostRoots: [root] },
    );
  });
  assert.equal(decision.action, 'allow');
});

test('payload sem file_path permite', () => {
  assert.equal(decide({ [GENERATED]: 'x' }, { content: 'y' }).action, 'allow');
});

test('aceita file_path absoluto do host', () => {
  let decision: Hk2Decision = { action: 'allow' };
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, [GENERATED]: 'openapi: 3.1.0\n' }, (root) => {
    decision = decideHk2(
      { tool_name: 'Write', tool_input: { file_path: `${root}/${GENERATED}`, content: 'x' } },
      { root, hostRoots: [root] },
    );
  });
  assert.equal(decision.action, 'deny');
});

test('diretório declarado em generated[] cobre o que está dentro dele', () => {
  const config = CONFIG.replace('path: docs/contracts/openapi.gen.yaml', 'path: docs/contracts/gen/');
  let decision: Hk2Decision = { action: 'allow' };
  withTempRepo({ [OWNERSHIP_PATH]: config }, (root) => {
    decision = decideHk2(
      { tool_name: 'Write', tool_input: { file_path: 'docs/contracts/gen/schema.json', content: '{}' } },
      { root, hostRoots: [root] },
    );
  });
  assert.equal(decision.action, 'deny');
});
```

E, em `test/plugin/manifest.test.ts`, atualize os dois testes que contam hooks.
Troque o objeto `esperado` e a contagem final:

```typescript
  const esperado: Record<string, string[]> = {
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk2-generated-artifact', 'hk3-state-promotion'],
    'PreToolUse:Bash': ['hk5-commit-guard'],
    'PostToolUse:Edit|Write': ['hk4-watch-reminder'],
  };
```

```typescript
  assert.equal(vistos, 5, 'a varredura deveria ver os cinco hooks das Fases 1, 3 e 5');
```

Renomeie também o título do primeiro: `'hooks.json registra os cinco hooks nos
eventos e matchers da spec §7'`.

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0012|marcador|HK-2|hooks"
```

Esperado: FAIL — `src/hooks/hk2-generated-artifact.ts` não existe (erro de
importação no arquivo de teste novo) e `hooks.json` ainda registra quatro hooks.

- [ ] **Step 3: Escrever `src/hooks/hk2-generated-artifact.ts`**

```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): nega editar artefato gerado.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §5 (SK-5, regra 1) — "se
 * pode ser gerado, não escreva". O caminho vem de `generated[]` no
 * docs/.ownership.yml, ou do marcador que o próprio arquivo carrega (§2).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadOwnership } from '../config/ownership.ts';
import type { GeneratedRule } from '../config/ownership.ts';
import { toRepoPath } from './lib/paths.ts';
import { denyOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk2Decision = { action: 'allow' } | { action: 'deny'; reason: string };

const ALLOW: Hk2Decision = { action: 'allow' };

/**
 * Marcador da spec §2. Só o topo do arquivo conta: mais abaixo, a mesma frase é
 * prosa **sobre** o marcador — como esta linha aqui.
 */
const MARKER = /generated:\s*do not edit/i;
const MARKER_WINDOW = 4096;

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Regra de `generated[]` que cobre este caminho; diretório cobre o que está dentro. */
export function findGeneratedRule(
  rules: readonly GeneratedRule[],
  repoPath: string,
): GeneratedRule | null {
  const target = normalize(repoPath);
  for (const rule of rules) {
    const declared = normalize(rule.path);
    if (declared.endsWith('/') ? target.startsWith(declared) : target === declared) return rule;
  }
  return null;
}

export function decideHk2(payload: HookPayload, env: HookEnv): Hk2Decision {
  const filePath = payload.tool_input?.file_path;
  if (typeof filePath !== 'string') return ALLOW;

  const repoPath = toRepoPath(filePath, env.hostRoots);
  if (repoPath === null) return ALLOW;

  let config;
  try {
    config = loadOwnership(env.root);
  } catch {
    return ALLOW; // falha aberta (RNF-0001)
  }

  // Caminho declarado nega mesmo com o arquivo ausente: criar à mão o que um
  // gerador produz é exatamente o que RN-0012 proíbe.
  const rule = findGeneratedRule(config.generated, repoPath);
  if (rule) {
    return {
      action: 'deny',
      reason:
        `HK-2 bloqueou: \`${repoPath}\` é artefato gerado, declarado em \`generated[]\` no docs/.ownership.yml. ` +
        'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §5 (SK-5, regra 1) — se pode ser gerado, não se escreve; ' +
        'uma edição à mão vive até a próxima execução do gerador e mente até lá. ' +
        `Caminho válido: mude a fonte anotada e rode \`${rule.command} > ${rule.path}\`. ` +
        'Skill dona: contract-keeper; `living-docs drift` (CI-5) verifica a deriva no PR.',
    };
  }

  let head: string;
  try {
    head = readFileSync(join(env.root, repoPath), 'utf8').slice(0, MARKER_WINDOW);
  } catch {
    return ALLOW; // arquivo que não existe não carrega marcador
  }
  if (!MARKER.test(head)) return ALLOW;

  return {
    action: 'deny',
    reason:
      `HK-2 bloqueou: \`${repoPath}\` abre com o marcador \`generated: do not edit\` (spec §2). ` +
      'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §5 (SK-5, regra 1) — o que é gerado muda pela fonte, não pelo arquivo. ' +
      'Caminho válido: mude a fonte anotada e rode o gerador. ' +
      'Este arquivo não está em `generated[]` no docs/.ownership.yml — declare-o lá, com o comando do gerador, ' +
      'para que `CI-5` (`living-docs drift`) também o cubra. Skill dona: contract-keeper.',
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return; // falha aberta
  const decision = decideHk2(payload, hookEnv());
  emit(decision.action === 'deny' ? denyOutput(decision.reason) : null);
}

if (process.argv[1]?.endsWith('hk2-generated-artifact.ts')) {
  main().catch(() => process.exit(0)); // falha aberta, sempre
}
```

- [ ] **Step 4: Registrar o hook em `plugin/hooks/hooks.json`**

No grupo `PreToolUse` / `Edit|Write`, entre `hk1-append-only` e
`hk3-state-promotion`:

```json
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk2-generated-artifact",
            "shell": "bash",
            "async": false
          },
```

`run-hook.sh` **não muda**: ele recebe o nome do hook como argumento e invoca um
arquivo por hook. Não "melhore" o wrapper de graça — é onde a falha aberta mora.

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

- [ ] **Step 6: Commit**

**`HK-5`:** este commit toca `src/hooks/**`, que `watches` liga a
`docs/requirements/rules.md`. O hook vai perguntar. A resposta é **sim, pode
seguir**: o doc dono viajou no commit anterior (Task 1), com a própria
`RN-0012` que este hook implementa — a ordem que `CONTRIBUTING.md` §"O ciclo"
exige. Diga isso à pessoa que responde; não responda por ela.

```bash
git add src/hooks/hk2-generated-artifact.ts test/hooks/hk2-generated-artifact.test.ts plugin/hooks/hooks.json test/plugin/manifest.test.ts
git commit -m "feat(HK-2, RN-0012): nega editar artefato gerado"
```

---

### Task 3: `CI-5` e `living-docs drift`

**Objetivo:** Implementar `RF-0006` — o executor injetável, o check que compara
a saída do gerador com o arquivo em disco, e o subcomando que o roda.

**Files:**
- Create: `src/exec/command.ts`
- Create: `src/checks/ci5-contract-drift.ts`
- Create: `src/cli/drift.ts`
- Create: `test/checks/ci5-contract-drift.test.ts`
- Create: `test/cli/drift.test.ts`
- Modify: `src/checks/registry.ts`
- Modify: `src/cli/validate.ts`
- Modify: `src/cli/index.ts`

**Interfaces:**
- Consome: `loadOwnership`, `OwnershipConfig` (`src/config/ownership.ts`);
  `Check`, `CheckContext`, `Finding` (`src/core/types.ts`); `formatFindings`
  (`src/cli/report.ts`).
- Produz:
  - `export type CommandRunner = (command: string, cwd: string) => string`
  - `export const runCommand: CommandRunner`
  - `export function ci5ContractDrift(exec: CommandRunner): Check`
  - `export function firstDifferentLine(actual: string, expected: string): number`
  - `export function driftChecks(exec?: CommandRunner): readonly Check[]`
  - `export interface DriftResult { findings: Finding[]; checked: number; exitCode: number }`
  - `export function runDrift(root: string, exec?: CommandRunner): DriftResult`
  - `ValidateResult` ganha o campo `generated: number`.

**Requisitos:**
- `src/core/types.ts` **não muda**. O executor é dependência do check, não do
  contexto: `ci5ContractDrift` é uma fábrica que o recebe por closure. Sem isso,
  `CheckContext` ganharia um campo que três dos quatro checks ignoram — e os
  testes de `CI-1`/`CI-2`/`CI-3`, que constroem o contexto à mão, quebrariam
  sem motivo.
- `CI-5` não falha aberta: gerador que quebra, artefato ausente e diferença de
  conteúdo são os três achados, todos `error`.
- A comparação normaliza `\r\n` e as quebras finais, e nada mais.
- `runDrift` passa `docs: []`: `CI-5` não lê artefato nenhum.

- [ ] **Step 1: Escrever os testes que falham**

Crie `test/checks/ci5-contract-drift.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ci5ContractDrift, firstDifferentLine } from '../../src/checks/ci5-contract-drift.ts';
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import type { CommandRunner } from '../../src/exec/command.ts';
import type { Finding } from '../../src/core/types.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/checks.gen.md
    command: "node tools/gen.js"
`;

const GENERATED = 'docs/contracts/checks.gen.md';
const CONTENT = '<!-- generated: do not edit -->\n\n| ID |\n| --- |\n| CI-1 |\n';

function run(files: Record<string, string>, exec: CommandRunner): Finding[] {
  let findings: Finding[] = [];
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, (root) => {
    const config = parseOwnership(CONFIG);
    findings = ci5ContractDrift(exec).run({ root, config, docs: [] });
  });
  return findings;
}

test('RF-0006: arquivo igual à saída do gerador não produz achado', () => {
  const findings = run({ [GENERATED]: CONTENT }, () => CONTENT);
  assert.deepEqual(findings, []);
});

test('RF-0006: diferença de conteúdo é erro, e a finding aponta a primeira linha divergente', () => {
  const findings = run({ [GENERATED]: CONTENT }, () => CONTENT.replace('CI-1', 'CI-9'));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, 'CI-5');
  assert.equal(findings[0]?.severity, 'error');
  assert.equal(findings[0]?.file, GENERATED);
  assert.equal(findings[0]?.line, 5, 'a linha da tabela que mudou');
  assert.match(findings[0]?.fix ?? '', /node tools\/gen\.js/);
});

test('RF-0006: CR do checkout e quebra final a mais não são deriva de contrato', () => {
  const findings = run({ [GENERATED]: CONTENT.replaceAll('\n', '\r\n') + '\n' }, () => CONTENT);
  assert.deepEqual(findings, []);
});

test('RF-0006: gerador que falha é erro — CI-5 não se cala como um hook', () => {
  const findings = run({ [GENERATED]: CONTENT }, () => {
    throw new Error('gen.js: Cannot find module');
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /Cannot find module/);
});

test('RF-0006: artefato declarado e ausente é erro, não silêncio', () => {
  const findings = run({}, () => CONTENT);
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /ausente/i);
});

test('firstDifferentLine devolve 0 quando não há divergência', () => {
  assert.equal(firstDifferentLine('a\nb\n', 'a\nb\n'), 0);
  assert.equal(firstDifferentLine('a\nb\n', 'a\nc\n'), 2);
  assert.equal(firstDifferentLine('a\n', 'a\nb\n'), 2, 'linha a mais na saída também é divergência');
});
```

Crie `test/cli/drift.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDrift } from '../../src/cli/drift.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { OWNERSHIP_PATH, OwnershipError } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const BASE = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
`;

const WITH_GENERATED = `${BASE}generated:
  - path: docs/contracts/checks.gen.md
    command: "node tools/gen.js"
`;

test('RF-0006: sem artefato gerado declarado, drift sai com 0 e diz que não checou nada', () => {
  withTempRepo({ [OWNERSHIP_PATH]: BASE }, (root) => {
    const result = runDrift(root, () => '');
    assert.deepEqual(result.findings, []);
    assert.equal(result.checked, 0);
    assert.equal(result.exitCode, 0);
  });
});

test('RF-0006: deriva leva a exit 1', () => {
  withTempRepo(
    { [OWNERSHIP_PATH]: WITH_GENERATED, 'docs/contracts/checks.gen.md': 'antigo\n' },
    (root) => {
      const result = runDrift(root, () => 'novo\n');
      assert.equal(result.checked, 1);
      assert.equal(result.exitCode, 1);
      assert.equal(result.findings[0]?.ruleId, 'CI-5');
    },
  );
});

test('RF-0006: validate não roda o gerador, e conta o que deixou para o drift', () => {
  withTempRepo(
    { [OWNERSHIP_PATH]: WITH_GENERATED, 'docs/contracts/checks.gen.md': 'qualquer coisa\n' },
    (root) => {
      const result = runValidate(root);
      assert.equal(result.generated, 1, 'validate precisa saber que há o que checar em outro lugar');
      assert.equal(
        result.findings.some((finding) => finding.ruleId === 'CI-5'),
        false,
        'CI-5 não roda em validate (ADR-0005)',
      );
      assert.equal(result.exitCode, 0);
    },
  );
});

test('.ownership.yml ausente propaga OwnershipError', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    assert.throws(() => runDrift(root, () => ''), OwnershipError);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0006|firstDifferentLine"
```

Esperado: FAIL — `src/exec/command.ts`, `src/checks/ci5-contract-drift.ts` e
`src/cli/drift.ts` não existem.

- [ ] **Step 3: Criar `src/exec/command.ts`**

```typescript
import { execSync } from 'node:child_process';

/**
 * Executor de comando do repositório validado, injetável: o teste prova `CI-5`
 * sem depender de um gerador real na máquina.
 *
 * Irmão de `GitRunner` (src/git/staged.ts) com uma diferença deliberada: este
 * **não** falha aberta. Falha aberta é política de hook (`RNF-0001`), onde o
 * custo do silêncio é uma pergunta a menos; aqui o custo é um contrato mentindo
 * com a autoridade de um check que passou. Quem trata o erro é `CI-5`.
 */
export type CommandRunner = (command: string, cwd: string) => string;

/** Teto de um gerador. Generoso: `CI-5` roda no PR, não dentro de um hook. */
export const TIMEOUT_MS = 60_000;

export const runCommand: CommandRunner = (command, cwd) =>
  execSync(command, {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    // stderr capturado, não herdado: ele vira a mensagem da finding.
    stdio: ['ignore', 'pipe', 'pipe'],
  });
```

- [ ] **Step 4: Criar `src/checks/ci5-contract-drift.ts`**

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Check, CheckContext, Finding } from '../core/types.ts';
import type { CommandRunner } from '../exec/command.ts';

const RULE = 'CI-5';

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix };
}

/**
 * `\r\n` vira `\n` porque o CR vem do checkout, não do gerador; as quebras
 * finais são aparadas porque um `\n` a mais é redirecionamento de shell.
 * Qualquer outra diferença é deriva de contrato (ADR-0005).
 */
function normalize(source: string): string {
  return source.replace(/\r\n/g, '\n').replace(/\n+$/, '\n');
}

/** Primeira linha 1-indexed em que os dois textos divergem; 0 se não divergem. */
export function firstDifferentLine(actual: string, expected: string): number {
  const a = normalize(actual).split('\n');
  const b = normalize(expected).split('\n');
  const limit = Math.max(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) return i + 1;
  }
  return 0;
}

/** A primeira linha útil do erro do gerador: stderr se houver, mensagem se não. */
function reasonOf(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr;
  const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err));
  return text.split('\n')[0] ?? text;
}

/**
 * `CI-5` — contract drift. Recebe o executor por injeção, e não pelo
 * `CheckContext`: o comando é dependência deste check, não do contexto que os
 * outros três compartilham (ADR-0005).
 */
export function ci5ContractDrift(exec: CommandRunner): Check {
  return {
    id: RULE,
    name: 'contract drift',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = [];

      for (const rule of context.config.generated) {
        let expected: string;
        try {
          expected = exec(rule.command, context.root);
        } catch (err) {
          findings.push(
            error(
              rule.path,
              0,
              `O gerador falhou: \`${rule.command}\` — ${reasonOf(err)}`,
              'Um gerador que não roda deixa o contrato sem fonte. Conserte o comando declarado em ' +
                '`generated[].command` no docs/.ownership.yml (skill dona: contract-keeper).',
            ),
          );
          continue;
        }

        let actual: string;
        try {
          actual = readFileSync(join(context.root, rule.path), 'utf8');
        } catch {
          findings.push(
            error(
              rule.path,
              0,
              'Artefato gerado declarado em `generated[]` e ausente do repositório.',
              `Gere-o e versione o resultado: \`${rule.command} > ${rule.path}\` (spec §3).`,
            ),
          );
          continue;
        }

        const line = firstDifferentLine(actual, expected);
        if (line !== 0) {
          findings.push(
            error(
              rule.path,
              line,
              'O artefato gerado diverge da saída do gerador — o contrato em disco não é o que a fonte produz.',
              `Regenere: \`${rule.command} > ${rule.path}\`. Nunca edite o arquivo à mão ` +
                '(`HK-2` bloqueia; regra de origem: spec §5, SK-5, regra 1).',
            ),
          );
        }
      }

      return findings;
    },
  };
}
```

- [ ] **Step 5: Estender `src/checks/registry.ts`**

Substitua o arquivo inteiro:

```typescript
import type { Check } from '../core/types.ts';
import { ci1Structure } from './ci1-structure.ts';
import { ci2Ids } from './ci2-ids.ts';
import { ci3Traceability } from './ci3-traceability.ts';
import { ci5ContractDrift } from './ci5-contract-drift.ts';
import { runCommand } from '../exec/command.ts';
import type { CommandRunner } from '../exec/command.ts';

/** Checks que `living-docs validate` roda, na ordem. Nenhum deles executa nada. */
export const CHECKS: readonly Check[] = [ci1Structure, ci2Ids, ci3Traceability];

/**
 * Checks que `living-docs drift` roda: os que executam o comando declarado pelo
 * repositório validado (ADR-0005). O executor entra por injeção para que o
 * teste não precise de um gerador de verdade.
 */
export function driftChecks(exec: CommandRunner = runCommand): readonly Check[] {
  return [ci5ContractDrift(exec)];
}
```

- [ ] **Step 6: Criar `src/cli/drift.ts`**

```typescript
import { loadOwnership } from '../config/ownership.ts';
import { driftChecks } from '../checks/registry.ts';
import { runCommand } from '../exec/command.ts';
import type { CommandRunner } from '../exec/command.ts';
import type { Finding } from '../core/types.ts';

export interface DriftResult {
  findings: Finding[];
  /** Quantos artefatos gerados foram comparados. Zero significa "nada declarado". */
  checked: number;
  exitCode: number;
}

export function runDrift(root: string, exec: CommandRunner = runCommand): DriftResult {
  const config = loadOwnership(root);
  // `docs: []` de propósito: CI-5 não lê artefato nenhum — ele compara o arquivo
  // gerado com a saída do gerador.
  const context = { root, config, docs: [] };

  const findings = driftChecks(exec).flatMap((check) => check.run(context));

  return {
    findings,
    checked: config.generated.length,
    exitCode: findings.some((finding) => finding.severity === 'error') ? 1 : 0,
  };
}
```

- [ ] **Step 7: Fazer `validate` contar o que deixou para o `drift`**

Em `src/cli/validate.ts`, acrescente o campo à interface e ao retorno:

```typescript
export interface ValidateResult {
  findings: Finding[];
  errors: number;
  warnings: number;
  exitCode: number;
  /** Artefatos gerados declarados — checados por `living-docs drift`, não aqui (ADR-0005). */
  generated: number;
}
```

```typescript
  return {
    findings,
    errors,
    warnings: findings.length - errors,
    exitCode: errors > 0 ? 1 : 0,
    generated: config.generated.length,
  };
```

- [ ] **Step 8: Ligar o subcomando em `src/cli/index.ts`**

Acrescente o import:

```typescript
import { runDrift } from './drift.ts';
```

Troque o `USAGE`:

```typescript
const USAGE = `living-docs <comando>

  validate    Roda os checks de documentação viva (CI-1, CI-2, CI-3)
  drift       Compara cada artefato gerado com a saída do gerador (CI-5)
  init        Cria a moldura de documentação viva (skill dona: living-docs-bootstrap)

Opções de init:
  --owner <@handle>   Dono padrão dos artefatos criados
  --stage <estágio>   Conjunto mínimo a instalar: solo (padrão), small-team ou production
  --dry-run           Mostra o que faria, sem escrever
`;
```

No bloco `validate`, depois de escrever as findings:

```typescript
    if (command === 'validate') {
      const result = runValidate(root);
      process.stdout.write(`${formatFindings(result.findings)}\n`);
      // Ponteiro, não achado: validate não executa gerador nenhum (ADR-0005), e
      // ficar calado sobre isso seria fingir cobertura que ele não tem.
      if (result.generated > 0) {
        process.stdout.write(
          `living-docs: ${result.generated} artefato(s) gerado(s) declarado(s) — a deriva de contrato é verificada por \`living-docs drift\` (CI-5).\n`,
        );
      }
      return result.exitCode;
    }
```

E, logo depois desse bloco e **dentro do mesmo `try`** — é ele que traduz
`OwnershipError` em exit 2, e `drift` carrega os mesmos códigos de saída de
`validate` —, o subcomando novo:

```typescript
    if (command === 'drift') {
      const result = runDrift(root);
      if (result.checked === 0) {
        process.stdout.write(
          'living-docs: nenhum artefato gerado declarado em `generated[]` — nada a comparar.\n',
        );
        return 0;
      }
      process.stdout.write(`${formatFindings(result.findings)}\n`);
      return result.exitCode;
    }
```

- [ ] **Step 9: Rodar e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "exit=$?"
```

Esperado: PASS, e `drift` dizendo `nenhum artefato gerado declarado` com
`exit=0` — este repositório ainda não declarou nenhum. É a Task 4 que muda isso.

- [ ] **Step 10: Commit**

**`HK-5`:** este commit toca `src/checks/**` e `src/cli/**`, que `watches` liga
a `docs/requirements/rules.md` e `docs/requirements/functional.md`. O hook vai
perguntar pelos dois. A resposta é **sim, pode seguir**: os dois docs viajaram
na Task 1, com `RF-0006` e `RN-0012`. Diga isso; não responda por quem decide.

```bash
git add src/exec/command.ts src/checks/ci5-contract-drift.ts src/checks/registry.ts src/cli/drift.ts src/cli/validate.ts src/cli/index.ts test/checks/ci5-contract-drift.test.ts test/cli/drift.test.ts
git commit -m "feat(CI-5, RF-0006): living-docs drift compara contrato gerado com a saída do gerador"
```

---

### Task 4: O contrato gerado deste repositório

**Objetivo:** Dar a `CI-5` um alvo real. Este repositório não tinha contrato
gerado nenhum — sem um, a fase inteira ficaria sem prova. O contrato é o que o
toolkit publica de mais estável: os IDs dos checks, o que faz cada um falhar, e
por qual comando cada um roda.

**Files:**
- Create: `src/tools/gen-checks.ts`
- Create: `docs/contracts/checks.gen.md` (**pelo gerador, nunca pelo editor**)
- Create: `test/checks/registry.test.ts`
- Create: `test/contracts/drift.test.ts`
- Modify: `src/checks/registry.ts`
- Modify: `docs/.ownership.yml`

**Interfaces:**
- Consome: `CHECKS`, `driftChecks` (Task 3).
- Produz: `export interface CatalogEntry { id: string; name: string; command: string; failsWhen: string }`
  e `export const CHECK_CATALOG: readonly CatalogEntry[]` em
  `src/checks/registry.ts` — a fonte anotada do contrato.

**Requisitos:**
- O catálogo é a **única** fonte do arquivo gerado, e um teste amarra catálogo e
  registry: mesmos IDs, mesmos nomes, nem um a mais.
- Saída determinística: nenhuma data, nenhum caminho de máquina, nenhuma
  contagem que mude sozinha.
- `docs/contracts/checks.gen.md` nasce e muda **só** pela linha de comando.
  `HK-2` nega `Edit`/`Write` nesse caminho assim que o Step 3 declara a entrada
  em `generated[]` — e essa negativa é o comportamento correto, não um
  obstáculo a contornar.

- [ ] **Step 1: Escrever os testes que falham**

Crie `test/checks/registry.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKS, CHECK_CATALOG, driftChecks } from '../../src/checks/registry.ts';

test('RF-0006: o catálogo cobre exatamente os checks que existem, com os mesmos nomes', () => {
  const reais = [...CHECKS, ...driftChecks(() => '')].map((check) => `${check.id}|${check.name}`);
  const catalogados = CHECK_CATALOG.map((entry) => `${entry.id}|${entry.name}`);
  assert.deepEqual(catalogados, reais, 'catálogo e registry divergiram — o contrato gerado mentiria');
});

test('RF-0006: todo item do catálogo diz quando falha e por qual comando roda', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} sem condição de falha escrita`);
    assert.match(entry.command, /^living-docs (validate|drift)$/, `${entry.id} com comando estranho`);
  }
});

test('ADR-0005: só CI-5 roda fora do validate', () => {
  for (const entry of CHECK_CATALOG) {
    const esperado = entry.id === 'CI-5' ? 'living-docs drift' : 'living-docs validate';
    assert.equal(entry.command, esperado, `${entry.id} no comando errado`);
  }
});
```

Crie `test/contracts/drift.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runDrift } from '../../src/cli/drift.ts';
import { repoRoot } from '../../src/core/roots.ts';

const ROOT = repoRoot();
const GENERATED = 'docs/contracts/checks.gen.md';

test('RF-0006: o contrato gerado deste repositório não derivou — dogfooding com o gerador de verdade', () => {
  const result = runDrift(ROOT);
  assert.ok(result.checked >= 1, 'este repositório precisa declarar ao menos um artefato gerado');
  assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2));
  assert.equal(result.exitCode, 0);
});

test('RN-0012: o artefato gerado se declara gerado, e não finge ser artefato editável', () => {
  const source = readFileSync(join(ROOT, GENERATED), 'utf8');
  assert.match(source.split('\n')[0] ?? '', /generated: do not edit/, 'o marcador abre o arquivo (spec §2)');
  assert.doesNotMatch(source, /^---$/m, 'artefato gerado não tem frontmatter editável (spec §2)');
  assert.match(source, /src\/checks\/registry\.ts/, 'o arquivo precisa nomear a própria fonte');
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="catálogo|contrato gerado|RN-0012: o artefato|ADR-0005: só"
```

Esperado: FAIL — `CHECK_CATALOG` não existe, `docs/contracts/checks.gen.md`
não existe, e `runDrift` acha `checked === 0`.

- [ ] **Step 3: Acrescentar o catálogo a `src/checks/registry.ts`**

No final do arquivo, depois de `driftChecks`:

```typescript
export interface CatalogEntry {
  id: string;
  name: string;
  /** O comando do CLI que roda este check. */
  command: string;
  /** A condição de falha — a coluna "Falha quando" da spec §9. */
  failsWhen: string;
}

/**
 * O contrato público dos checks: é isto que um projeto consumidor cita na
 * Definition of Done dele, e é a fonte anotada de `docs/contracts/checks.gen.md`
 * (`CI-5`). Para mudar o contrato, mude aqui e regere — nunca o contrário.
 */
export const CHECK_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: 'CI-1',
    name: 'structure lint',
    command: 'living-docs validate',
    failsWhen:
      'Frontmatter ausente ou inválido; `status` fora da máquina de estados; `owner` vazio ou sem `@`; `trigger` ausente ou descrevendo cadência.',
  },
  {
    id: 'CI-2',
    name: 'ID lint',
    command: 'living-docs validate',
    failsWhen:
      'ID duplicado, fora de sequência, ou reaproveitado de `docs/ids-retired.txt`; citação que não resolve para item existente.',
  },
  {
    id: 'CI-3',
    name: 'traceability',
    command: 'living-docs validate',
    failsWhen:
      'Par bidirecional aberto; requisito `active` sem citação nos caminhos de `cited-by`; ADR `accepted` sem `relates-to`; decisão aberta `resolved` sem o ADR que a fechou.',
  },
  {
    id: 'CI-5',
    name: 'contract drift',
    command: 'living-docs drift',
    failsWhen:
      'A saída do gerador difere do artefato versionado; o gerador falha; ou o artefato declarado em `generated[]` não existe.',
  },
]);
```

- [ ] **Step 4: Criar `src/tools/gen-checks.ts`**

```typescript
#!/usr/bin/env node
/**
 * Gerador do contrato público dos checks (SK-5).
 *
 * Imprime o conteúdo esperado de `docs/contracts/checks.gen.md` na saída padrão
 * e **não escreve arquivo nenhum** — é o contrato de gerador que `ADR-0005`
 * fixa, e é o que permite a `CI-5` comparar sem reescrever o que está checando.
 *
 * A saída é determinística: nenhuma data, nenhum caminho de máquina, nenhuma
 * contagem. Um gerador que imprime "gerado em <hoje>" produz deriva a cada
 * execução e desliga `CI-5` no segundo dia.
 */
import { CHECK_CATALOG } from '../checks/registry.ts';

const HEADER = `<!-- generated: do not edit -->
<!-- fonte: src/checks/registry.ts (CHECK_CATALOG) — regerar: node /opt/living-docs/src/tools/gen-checks.ts -->

# Contrato dos checks

Os IDs abaixo são públicos e estáveis: aparecem na saída do CLI, são citados
pela Definition of Done de quem usa o toolkit, e não mudam de significado
(\`docs/contracts/versioning-policy.md\`).

| ID | Check | Falha quando | Comando |
| --- | --- | --- | --- |
`;

/** `|` numa célula quebraria a tabela — escapar é do gerador, não de quem escreve. */
function cell(value: string): string {
  return value.replaceAll('|', '\\|');
}

const rows = CHECK_CATALOG.map(
  (entry) =>
    `| ${cell(entry.id)} | ${cell(entry.name)} | ${cell(entry.failsWhen)} | \`${cell(entry.command)}\` |`,
).join('\n');

process.stdout.write(`${HEADER}${rows}\n`);
```

- [ ] **Step 5: Declarar o artefato gerado em `docs/.ownership.yml`**

Troque a linha `generated: []` por:

```yaml
generated:
  # O comando IMPRIME o conteúdo esperado na saída padrão e não escreve arquivo
  # nenhum: um check que reescreve o que está checando apaga a evidência no
  # mesmo instante em que a reporta (ADR-0005). HK-2 bloqueia editar `path` à
  # mão; CI-5 (`living-docs drift`) compara.
  - path: docs/contracts/checks.gen.md
    command: node /opt/living-docs/src/tools/gen-checks.ts
```

E acrescente, no bloco `watches`, logo depois da entrada de `src/checks/**` que
já existe:

```yaml
  - code: "src/checks/**"
    doc: docs/contracts/checks.gen.md
    reason: "o contrato público dos checks deriva do registry — regerar faz parte da mudança, e editar à mão é bloqueado por HK-2"
```

Duas entradas com o mesmo `code` são legítimas: `watchesFor` agrupa por **doc**,
não por glob, e a partir daqui todo commit que toca `src/checks/**` é lembrado
dos dois docs. É o mecanismo 1 fazendo exatamente o que deve.

- [ ] **Step 6: Gerar o arquivo — pela linha de comando, nunca pelo editor**

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
```

Confira o resultado com `git diff --stat` e leia o arquivo. Esperado — quatro
linhas de tabela, `CI-1` a `CI-3` em `living-docs validate` e `CI-5` em
`living-docs drift`, precedidas pelo marcador e pelo comentário de fonte:

```
<!-- generated: do not edit -->
<!-- fonte: src/checks/registry.ts (CHECK_CATALOG) — regerar: node /opt/living-docs/src/tools/gen-checks.ts -->

# Contrato dos checks
...
| ID | Check | Falha quando | Comando |
| --- | --- | --- | --- |
| CI-1 | structure lint | ... | `living-docs validate` |
```

Se você sentir vontade de "arrumar" uma linha do arquivo: essa vontade é o
sintoma que `HK-2` existe para interceptar. Arrume o `CHECK_CATALOG` e regere.

- [ ] **Step 7: Rodar tudo e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Esperado: PASS; `validate=0` com a linha nova de ponteiro (`1 artefato(s)
gerado(s) declarado(s)`); `drift=0` com `nenhuma violação encontrada`.

- [ ] **Step 8: Provar que `CI-5` pega a deriva de verdade (e desfazer)**

Vale um minuto: é a metade do critério 6 que nenhum teste unitário observa em
campo.

```bash
docker compose exec -w /workspace toolkit sh -c 'printf "| CI-9 | inventado |\n" >> docs/contracts/checks.gen.md'
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
git checkout -- docs/contracts/checks.gen.md
```

Esperado: `drift=1`, com a finding apontando `docs/contracts/checks.gen.md` e a
linha acrescentada, e o `fix` mandando regerar. Depois do `git checkout`, rode
`drift` de novo e confirme `drift=0`.

- [ ] **Step 9: Commit**

**`HK-5`:** este commit toca `src/checks/**`, ligado a **dois** docs:
`docs/contracts/checks.gen.md` (que está no commit ✓) e
`docs/requirements/rules.md` (que não está). A resposta é **sim, pode seguir**:
`RN-0012` viajou na Task 1. O hook listar os dois e um deles já estar resolvido
é o comportamento correto — ele lista o pendente, não o resolvido.

```bash
git add src/tools/gen-checks.ts src/checks/registry.ts docs/.ownership.yml docs/contracts/checks.gen.md test/checks/registry.test.ts test/contracts/drift.test.ts
git commit -m "feat(CI-5, RF-0006): contrato gerado dos checks, com dogfooding de drift"
```

---

### Task 5: `init --stage production` instala a moldura de contratos

**Objetivo:** Implementar `RF-0007` — o estágio que a spec §10 mapeia para as
Fases 5 e 6, instalando o que a Fase 5 entrega e **dizendo** que a Fase 6 falta.

**Files:**
- Create: `templates/errors.md`
- Create: `templates/versioning-policy.md`
- Modify: `templates/CODEOWNERS`
- Modify: `templates/ownership.yml`
- Modify: `src/cli/init.ts`
- Modify: `test/cli/init.test.ts`

**Interfaces:**
- Consome: `template()`, `writeIfAbsent()`, `InitOptions`, `InitResult`,
  `STAGES`, `Stage` já existentes em `src/cli/init.ts`.
- Produz: `Stage` passa a incluir `'production'`; `docs/contracts/errors.md` e
  `docs/contracts/versioning-policy.md` no repositório validado.

**Requisitos:**
- Idempotente: segunda execução não recria nem reescreve (mesmo contrato de
  `WORKING_AGREEMENTS` e `LANGUAGE_AND_INTENT`).
- `production` instala **tudo** que `small-team` instala, mais os contratos —
  as condições existentes usam `stage !== 'solo'` e continuam valendo.
- `NOT_INSTALLED['production']` nomeia a Fase 6. Estágio que promete conjunto
  completo sem entregar é a wiki morta nascendo de fábrica; estágio honesto
  diz o que falta, como `small-team` fazia antes da Fase 4.
- O `init` **não inventa gerador**: `generated:` continua nascendo vazio, com
  exemplo comentado.
- O comentário sobre `generated` vai **depois** da linha `generated: []` no
  template. Não é gosto: `declareRequirements` ancora na linha `\ngenerated:`
  para inserir o bloco de requisitos ao subir de estágio, e um comentário
  acima da âncora seria separado da chave que ele explica.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao final de `test/cli/init.test.ts`:

```typescript
const PRODUCTION = { owner: '@time', dryRun: false, stage: 'production' as const };
const CONTRACT_FILES = ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md'];

test('RF-0007: production instala a moldura de contratos, e tudo que small-team instala', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, PRODUCTION);
    for (const path of CONTRACT_FILES) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir`);
      assert.ok(result.created.includes(path), `${path} deveria constar como criado`);
    }
    // O estágio é cumulativo: nada do small-team pode ter sumido.
    for (const path of ['CONTRIBUTING.md', 'docs/glossary.md', 'docs/requirements/rules.md']) {
      assert.ok(existsSync(join(root, path)), `${path} pertence a production também`);
    }
    assert.match(readFileSync(join(root, 'docs/contracts/errors.md'), 'utf8'), /@time/);
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2));
  });
});

test('RF-0007: small-team não instala contrato nenhum', () => {
  withTempRepo({}, (root) => {
    runInit(root, SMALL_TEAM);
    for (const path of CONTRACT_FILES) {
      assert.equal(existsSync(join(root, path)), false, `${path} não pertence ao estágio small-team`);
    }
  });
});

test('RF-0007: production diz que a Fase 6 ainda não vem junto', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, PRODUCTION);
    assert.ok(
      result.notInstalled.some((item) => /Fase 6/.test(item)),
      `o que ficou de fora precisa ser nomeado — ${JSON.stringify(result.notInstalled)}`,
    );
  });
});

test('RF-0007: o init não inventa gerador — `generated[]` nasce vazio', () => {
  withTempRepo({}, (root) => {
    runInit(root, PRODUCTION);
    assert.deepEqual(loadOwnership(root).generated, []);
    // ...e o exemplo comentado precisa estar lá, senão ninguém descobre o formato.
    assert.match(readFileSync(join(root, OWNERSHIP_PATH), 'utf8'), /#\s+- path: docs\/contracts\/openapi\.gen\.yaml/);
  });
});

test('RF-0007: contrato já escrito não é reescrito na segunda execução', () => {
  withTempRepo({ 'docs/contracts/errors.md': '# do jeito deles\n' }, (root) => {
    runInit(root, PRODUCTION);
    const segunda = runInit(root, PRODUCTION);
    assert.equal(readFileSync(join(root, 'docs/contracts/errors.md'), 'utf8'), '# do jeito deles\n');
    assert.ok(segunda.skipped.includes('docs/contracts/errors.md'));
    assert.deepEqual(segunda.created, []);
  });
});

test('RF-0007: o CODEOWNERS semeado dá dono aos contratos', () => {
  withTempRepo({}, (root) => {
    runInit(root, PRODUCTION);
    assert.match(readFileSync(join(root, 'CODEOWNERS'), 'utf8'), /docs\/contracts\/\s+@time/);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0007"
```

Esperado: FAIL nos seis testes, com `TypeError` — `node --test` apaga os tipos
e executa, então `NOT_INSTALLED['production']` é `undefined` e
`[...NOT_INSTALLED[options.stage]]` em `runInit` quebra na primeira linha.
`docker compose exec toolkit npm run typecheck` acusa a mesma coisa antes:
`'production'` não pertence a `Stage`.

- [ ] **Step 3: Criar `templates/errors.md`**

```markdown
---
title: Catálogo de erros
owner: "{{OWNER}}"
trigger: >
  Código de erro novo; código que muda de status; mudança no que um código
  significa para quem consome a interface pública.
last-reviewed: {{TODAY}}
---

# Catálogo de erros

> Semente criada por `living-docs init`. Um código, uma vez publicado, **nunca
> muda de significado**: ganha `deprecated` e um substituto. Depreciação sem
> substituto não é depreciação, é quebra de compatibilidade — e passa pela
> política de versionamento e por um ADR. Substitua o exemplo pelos códigos
> reais; apagar o que sobra é parte do trabalho.

| Código | Significado | Quando ocorre | Transporte | Público | Status |
| --- | --- | --- | --- | --- | --- |
| CODIGO-EXEMPLO | Substitua pelo significado estável, não pela mensagem exibível | A condição observável que o dispara | HTTP 400 / exit 2 / evento | sim | active |

<!-- O código é estável e imutável em significado; a mensagem exibível não é
parte do contrato. Skill dona: contract-keeper. -->
```

- [ ] **Step 4: Criar `templates/versioning-policy.md`**

```markdown
---
title: Política de versionamento
owner: "{{OWNER}}"
trigger: >
  Mudança de interface pública; decisão de depreciar algo publicado; mudança
  na própria política.
last-reviewed: {{TODAY}}
---

# Política de versionamento

> Semente criada por `living-docs init`. É a política **em volta** do contrato,
> não o contrato: o que é gerado não se escreve aqui. Substitua o que não for
> verdade neste projeto.

## O que é público

Liste aqui, explicitamente, o que os consumidores podem depender: caminhos,
códigos de erro, formatos, IDs estáveis. O que não estiver nesta lista pode
mudar sem aviso — e é isso que impede o alargamento silencioso do contrato.

## O que nunca muda de significado

Um identificador publicado (código de erro, ID de regra, nome de campo) não é
reaproveitado nem redefinido. Corrigir o significado de um código publicado
quebra quem já tratava dele em silêncio.

## Como se deprecia

Depreciação exige quatro coisas: data do anúncio, versão ou data de remoção,
substituto, e o guia de migração. Faltando qualquer uma, não é depreciação.

## Quem decide

Mudança quebra-compatibilidade passa por um ADR — a decisão e o que se aceita
perder ficam registrados, não na cabeça de quem estava na sala.

<!-- Skill dona: contract-keeper. -->
```

- [ ] **Step 5: Estender `templates/CODEOWNERS`**

Troque a última linha para intercalar a variável nova:

```
{{REQUIREMENTS_CODEOWNERS}}{{AGREEMENTS_CODEOWNERS}}{{CONTRACTS_CODEOWNERS}}docs/.ownership.yml    {{OWNER}}
```

- [ ] **Step 6: Estender `templates/ownership.yml`**

Troque a linha `generated: []` pelo bloco abaixo (a chave continua na mesma
posição; o comentário vem **depois**, pela razão anotada em "Requisitos"):

```yaml
generated: []
# Artefato gerado: HK-2 bloqueia editá-lo à mão, e CI-5 (`living-docs drift`)
# compara o arquivo versionado com a saída do gerador.
#
# O `command` IMPRIME o conteúdo esperado na saída padrão e NÃO escreve arquivo
# nenhum — um check que reescreve o que está checando apaga a evidência no mesmo
# instante em que a reporta. Gerador que só sabe escrever arquivo ganha um
# invólucro: gere num diretório temporário e imprima o resultado.
#
# O init não inventa gerador, pela mesma razão que não inventa `watches`.
# Declare o seu. Exemplo:
#
# generated:
#   - path: docs/contracts/openapi.gen.yaml
#     command: "node tools/gen-openapi.js"
```

- [ ] **Step 7: Estender `src/cli/init.ts`**

Troque a lista de estágios:

```typescript
export const STAGES = ['solo', 'small-team', 'production'] as const;
```

Depois da declaração de `LANGUAGE_AND_INTENT` (linha ~57), acrescente:

```typescript
/** Contratos (SK-5), instalados a partir do estágio `production` (spec §10, Fase 5). */
const CONTRACTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/contracts/errors.md', template: 'errors.md' },
  { path: 'docs/contracts/versioning-policy.md', template: 'versioning-policy.md' },
]);
```

Troque a constante `NOT_INSTALLED`:

```typescript
/**
 * O que este estágio pede e esta versão ainda não entrega. `solo` e `small-team`
 * saem vazios: as Fases 0–4 estão completas. `production` cobre as Fases 5 e 6
 * na spec §10, e a 6 não existe aqui.
 */
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
  production: [
    'Fase 6 — CHANGELOG, release notes, depreciações e guias de migração (SK-7, CI-6, HK-7)',
  ],
});
```

No objeto `values` dentro de `runInit`, acrescente a chave nova depois de
`AGREEMENTS_CODEOWNERS`:

```typescript
    CONTRACTS_CODEOWNERS:
      options.stage === 'production' ? `docs/contracts/    ${options.owner}\n` : '',
```

E, logo depois do laço `for (const agreement of LANGUAGE_AND_INTENT) { ... }`,
dentro do `if (options.stage !== 'solo') { ... }`:

```typescript
    if (options.stage === 'production') {
      for (const contract of CONTRACTS) {
        writeIfAbsent(root, contract.path, template(contract.template, values), options, result);
      }
    }
```

- [ ] **Step 8: Rodar e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts --help
```

Esperado: PASS na suíte inteira, e o `--help` listando `drift` e os três
estágios. Se `'RF-0003: small-team não deixa nada de fora nesta versão'` falhar,
alguém pôs a Fase 6 na lista errada — `small-team` continua vazio.

- [ ] **Step 9: Commit**

**`HK-5`:** este commit toca `src/cli/**`, ligado a
`docs/requirements/functional.md`. A resposta é **sim, pode seguir**:
`RF-0007` viajou na Task 1.

```bash
git add templates/errors.md templates/versioning-policy.md templates/CODEOWNERS templates/ownership.yml src/cli/init.ts test/cli/init.test.ts
git commit -m "feat(RF-0007): init --stage production instala a moldura de contratos"
```

---

### Task 6: Dogfooding — os contratos escritos deste repositório

**Objetivo:** Rodar o `init --stage production` real contra este repositório
para provar a Task 5 de ponta a ponta, e então substituir a semente pelo
catálogo de erros e pela política de versionamento **reais** do toolkit.

**Files:**
- Create: `docs/contracts/errors.md` (conteúdo real, não a semente)
- Create: `docs/contracts/versioning-policy.md` (conteúdo real)
- Create: `test/docs/contracts.test.ts`
- Modify: `CODEOWNERS`

**Interfaces:**
- Consome: `src/cli/index.ts` (os exit codes reais), `src/checks/registry.ts`
  (os IDs), `docs/contracts/checks.gen.md` (Task 4).
- Produz: os dois artefatos que a skill da Task 7 declara possuir.

**Requisitos:**
- Nenhum código de erro narra código: cada um é o que um consumidor observa
  (um exit code, uma classe de falha), não uma função interna.
- Os dois arquivos **não** entram em `artifacts:` — `ADR-0004` já decidiu esse
  tratamento para artefato sem família de IDs, e `DA-0002` continua aberta.
- O `CODEOWNERS` **deste** repositório não é reescrito pelo `init` — ele já
  existe, e `writeIfAbsent` o pula. A linha de dono entra à mão, senão o
  princípio 1 da Constitution nasce violado.
- `errors.md` não repete a tabela de `checks.gen.md`: os IDs de check moram lá,
  e duplicá-los aqui seria uma segunda fonte de verdade para a mesma coisa.

- [ ] **Step 1: Rodar `init --stage production` contra este repositório (dry-run primeiro)**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts init --owner @dan --stage production --dry-run
```

Esperado: `criado docs/contracts/errors.md` e
`criado docs/contracts/versioning-policy.md`; todo o resto como `mantido`
(`CODEOWNERS` inclusive — daí o Step 6); e a linha
`não instalado  Fase 6 — …`.

- [ ] **Step 2: Rodar de verdade**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts init --owner @dan --stage production
```

Confirme que os dois arquivos nasceram com o conteúdo da semente e `@dan` no
lugar de `{{OWNER}}`.

- [ ] **Step 3: Escrever `test/docs/contracts.test.ts`**

O teste vem antes do conteúdo real, e a semente é o que o faz falhar: ela traz
**uma** linha de exemplo, e o teste exige quatro códigos reais.

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toolkitRoot } from '../../src/core/roots.ts';

const ROOT = toolkitRoot();

/** Linhas de uma tabela markdown, sem cabeçalho nem separador. */
function rows(source: string, header: string): string[][] {
  const start = source.indexOf(header);
  assert.ok(start !== -1, `tabela não encontrada — esperava o cabeçalho ${header}`);
  return source
    .slice(start)
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .slice(2)
    .map((line) =>
      line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()),
    );
}

const errors = (): string => readFileSync(join(ROOT, 'docs/contracts/errors.md'), 'utf8');

test('o catálogo de erros lista códigos reais, cada um com significado, gatilho e status', () => {
  const entries = rows(errors(), '| Código |');
  assert.ok(entries.length >= 4, `esperava ao menos 4 códigos, achei ${entries.length}`);

  const codigos = entries.map((row) => row[0]);
  assert.equal(new Set(codigos).size, codigos.length, 'há código duplicado — um código, um significado');

  for (const row of entries) {
    assert.notEqual(row[1] ?? '', '', `código "${row[0]}" sem significado`);
    assert.notEqual(row[2] ?? '', '', `código "${row[0]}" sem "quando ocorre"`);
    const status = row[row.length - 1] ?? '';
    assert.match(status, /^(active|deprecated|removed)/, `status "${status}" fora do ciclo de vida (spec §4)`);
  }
});

test('o catálogo de erros não duplica a tabela de checks — ela é gerada e mora em outro arquivo', () => {
  assert.doesNotMatch(errors(), /\bCI-1\b.*\bstructure lint\b/, 'os IDs de check moram em docs/contracts/checks.gen.md');
  assert.match(errors(), /checks\.gen\.md/, 'e este arquivo deve apontar para lá');
});

test('a política de versionamento responde o que é público, o que não muda e como se deprecia', () => {
  const source = readFileSync(join(ROOT, 'docs/contracts/versioning-policy.md'), 'utf8');
  for (const secao of ['## O que é público', '## O que nunca muda de significado', '## Como se deprecia']) {
    assert.ok(source.includes(secao), `política sem a seção "${secao}"`);
  }
});

test('RN-0001: os contratos têm dono no CODEOWNERS, como todo artefato', () => {
  const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8');
  assert.match(codeowners, /^docs\/contracts\/\s+@\S+$/m);
});
```

Os três títulos de seção são comparados por `includes`, letra a letra: eles
precisam bater **exatamente** com os do template (Task 5, Step 4) e com os do
conteúdo real (Step 6). Um acento ou uma letra de diferença faz o teste falhar
por motivo errado.

- [ ] **Step 4: Rodar e confirmar que falha**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="catálogo de erros|política de versionamento|RN-0001: os contratos"
```

Esperado: dos quatro testes, **três falham** — `esperava ao menos 4 códigos,
achei 1`; o de não duplicar (a semente não aponta `checks.gen.md`); e o do
CODEOWNERS (o `init` não reescreveu o arquivo existente). O da política já
passa: a semente traz as três seções, e é assim que se quer — ela guarda o
formato, não o conteúdo.

- [ ] **Step 5: Substituir `docs/contracts/errors.md` pelo catálogo real**

```markdown
---
title: Catálogo de erros
owner: "@dan"
trigger: >
  Código de saída novo ou com significado alterado; classe de falha nova na
  linha de comando; mudança no que um código significa para quem consome o CLI.
last-reviewed: 2026-08-25
---

# Catálogo de erros

O que um consumidor do `living-docs` observa quando algo dá errado. O código é
estável e imutável em significado; a mensagem exibível não é parte do contrato
e pode mudar a qualquer momento.

Os IDs dos checks (`CI-n`) **não** estão aqui: eles são gerados a partir do
registry e moram em `docs/contracts/checks.gen.md`. Um código em dois lugares é
um código que já divergiu.

| Código | Significado | Quando ocorre | Transporte | Público | Status |
| --- | --- | --- | --- | --- | --- |
| EXIT-0 | Nada a corrigir | `validate` sem achado de severidade `error`; `drift` sem deriva; `init` que rodou | exit 0 | sim | active |
| EXIT-1 | O repositório viola uma regra de documentação viva | `validate` com ao menos um achado `error`, ou `drift` com deriva, gerador quebrado ou artefato gerado ausente | exit 1 | sim | active |
| EXIT-2 | O comando não pôde nem começar | `docs/.ownership.yml` ausente ou inválido; comando desconhecido; `--stage` desconhecido; nenhum argumento | exit 2 | sim | active |
| OWNERSHIP-INVALID | O mapa de propriedade não é legível como configuração | YAML inválido, `version` diferente de 1, `artifacts` vazio, `id-prefix` fora de 2–4 maiúsculas, `owner` sem `@` | exit 2, mensagem em stderr começando por `living-docs:` | sim | active |
| UNKNOWN-COMMAND | O subcomando não existe nesta versão | Qualquer palavra que não seja `validate`, `drift` ou `init` | exit 2, mensagem em stderr + uso | sim | active |

`EXIT-1` e `EXIT-2` são distintos de propósito: o primeiro é o repositório
falhando, o segundo é a ferramenta não tendo o que fazer. Um script de CI que
os confunde trata configuração quebrada como documentação errada, e manda
consertar o lugar errado.

<!-- Skill dona: contract-keeper. -->
```

- [ ] **Step 6: Substituir `docs/contracts/versioning-policy.md` pela política real**

```markdown
---
title: Política de versionamento
owner: "@dan"
trigger: >
  Mudança na interface pública do CLI, dos checks ou do `.ownership.yml`;
  decisão de depreciar algo publicado; mudança na própria política.
last-reviewed: 2026-08-25
---

# Política de versionamento

A política em volta do contrato. O contrato em si — a tabela dos checks — é
gerado (`docs/contracts/checks.gen.md`) e não se escreve à mão.

## O que é público

- Os IDs dos checks (`CI-n`), dos hooks (`HK-n`), das skills (`SK-n`) e dos
  comandos (`CM-n`), e o que cada um significa.
- Os subcomandos do CLI (`validate`, `drift`, `init`), suas opções, e os
  códigos de saída de `docs/contracts/errors.md`.
- O esquema de `docs/.ownership.yml` com `version: 1`: os nomes das chaves e o
  que cada uma exige.
- O contrato do gerador: `generated[].command` imprime na saída padrão e não
  escreve arquivo (`ADR-0005`).

O que não está nesta lista pode mudar sem aviso — a estrutura de `src/`, o
texto das mensagens, o formato exato da saída de `validate`.

## O que nunca muda de significado

Um identificador publicado não é reaproveitado nem redefinido. `CI-4` nunca
passa a medir outra coisa; `EXIT-2` nunca vira "falhou a validação". Quando o
significado precisa mudar, o identificador antigo ganha `deprecated` e um
substituto nasce ao lado — é a mesma regra que `docs/ids-retired.txt` impõe aos
artefatos, aplicada à interface.

## Como se deprecia

Quatro coisas, sem exceção: data do anúncio, versão ou data de remoção,
substituto, e o link para o guia de migração. Faltando qualquer uma, não é
depreciação — é quebra de compatibilidade, e passa por um ADR.

Enquanto a Fase 6 não existir, este repositório não tem `CHANGELOG.md` nem
`docs/migrations/`: uma depreciação de verdade aqui **bloqueia** até que a
Fase 6 entre, e isso é deliberado — anunciar remoção sem lugar para o guia de
migração é a depreciação que ninguém consegue seguir.

## Quem decide

Mudança quebra-compatibilidade passa por um ADR, com as alternativas e o que se
aceita perder. Aceitar é ato humano (`RN-0005`).

<!-- Skill dona: contract-keeper. -->
```

- [ ] **Step 7: Dar dono aos contratos no `CODEOWNERS` deste repositório**

Acrescente a linha depois de `docs/charter/`, seguindo o espaçamento que o
arquivo já usa (quatro espaços):

```
docs/contracts/    @dan
```

Um dono para o diretório inteiro, como `docs/requirements/` e `docs/charter/`
já são: quem responde pelo contrato responde pela política em volta dele — e
pelo arquivo gerado, que ninguém edita mas alguém precisa responder por.

- [ ] **Step 8: Rodar tudo e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Esperado: PASS, `validate=0`, `drift=0`. `docs/contracts/errors.md` e
`versioning-policy.md` não entram em `context.docs` (não estão em `artifacts:`),
então nenhum check de `CI-1`–`CI-3` os toca — quem os cobre é
`test/docs/contracts.test.ts`, e só ele. É a mesma perda que `ADR-0004`
registrou para o glossary e o charter.

- [ ] **Step 9: Commit**

```bash
git add docs/contracts/errors.md docs/contracts/versioning-policy.md CODEOWNERS test/docs/contracts.test.ts
git commit -m "feat(RN-0012): catálogo de erros e política de versionamento deste repositório"
```

---

### Task 7: `SK-5` contract-keeper

**Objetivo:** Escrever a skill dona da pipeline que gera o contrato e dos dois
artefatos escritos à mão em volta dele.

**Files:**
- Create: `plugin/skills/contract-keeper/SKILL.md`
- Modify: `test/plugin/authoring.test.ts`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consome: `templates/errors.md`, `templates/versioning-policy.md` (Task 5);
  `docs/contracts/` real (Tasks 4 e 6).
- Produz: nada consumido por outra task — skill é folha.

**Requisitos:**
- `description` > 120 caracteres, contendo "Use" e os sintomas do gatilho da
  spec §5 (interface pública mudou, código de erro novo, política de
  versionamento).
- Seções na ordem exata da spec §11 — `test/plugin/authoring.test.ts` varre
  todo diretório de `plugin/skills/` automaticamente, então a skill nova já
  nasce dentro das convenções ou a suíte reprova.
- Checklist com ≥6 itens, cada um nomeando `CI-n`, `HK-n` ou "humana".
- Não duplica o formato dos artefatos: aponta `templates/errors.md` e
  `templates/versioning-policy.md`.
- `CONTRIBUTING.md` viaja **neste** commit: `watches` liga `plugin/skills/**`
  a ele, e skill nova é exatamente "mudou como se trabalha aqui".

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `test/plugin/authoring.test.ts`:

```typescript
test('contract-keeper: a description nomeia interface pública, erro novo e versionamento', () => {
  const description = String(parseFrontmatter(skillSource('contract-keeper'))?.data.description ?? '');
  assert.match(description, /Use quando/i);
  for (const sintoma of ['contrato', 'erro', 'gerad']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`);
  }
});

test('contract-keeper não duplica o conteúdo dos artefatos que governa', () => {
  const source = skillSource('contract-keeper');
  assert.match(source, /templates\/errors\.md/, 'ela deve apontar para o template, não copiá-lo');
  assert.match(source, /templates\/versioning-policy\.md/, 'os dois templates, porque são dois artefatos');
  assert.doesNotMatch(source, /^\| EXIT-\d/m, 'a skill não deve conter o catálogo deste repositório');
  assert.doesNotMatch(source, /^## O que é público/m, 'nem a política deste repositório');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="contract-keeper"
```

Esperado: FAIL — `plugin/skills/contract-keeper/SKILL.md` não existe. Além dos
dois testes acima, os quatro testes gerados pela varredura (`frontmatter`,
`description`, `seções`, `checklist`) também acusam a ausência assim que o
diretório nascer vazio ou incompleto.

- [ ] **Step 3: Escrever `plugin/skills/contract-keeper/SKILL.md`**

```markdown
---
name: contract-keeper
description: >
  Use quando a interface pública mudar — endpoint, payload, formato de saída,
  código de saída, nome de campo —, quando aparecer um código de erro novo, ou
  quando alguém perguntar "isso é público?", "posso mudar esse campo?", "esse
  erro significa o quê?", "quem depende disso?", "posso editar esse arquivo
  gerado?", "por que o CI reclamou de contrato?". Também quando for preciso
  depreciar algo publicado, ou decidir o que um consumidor pode ou não assumir
  como estável.
---

# contract-keeper — dono do contrato público

## Overview

O contrato tem duas metades, e elas se escrevem de formas opostas. A metade
**gerada** nunca se escreve: ela sai de uma fonte anotada, e editá-la à mão é
bloqueado por `HK-2`. A metade **escrita** é a política em volta —
versionamento, depreciação, catálogo de erros —, e essa nenhum gerador produz.

Confundir as duas é o erro caro: um contrato editado à mão vive até a próxima
execução do gerador e mente até lá, com a autoridade de um arquivo que parece
oficial.

Os caminhos vêm de `docs/.ownership.yml` (`generated[]` e o dono de
`docs/contracts/`); não assuma.

## Do que você é dono

| Artefato | O que é | Forma |
| --- | --- | --- |
| A *pipeline* que gera o contrato | A fonte anotada + o comando declarado em `generated[].command` | Código, não documento |
| O artefato gerado (`*.gen.*`) | O contrato em si | Gerado; nunca editado à mão (`HK-2`) |
| `docs/contracts/errors.md` | Catálogo de erros: código, significado, quando ocorre, transporte, se é público | Arquivo único, tabela, mutável |
| `docs/contracts/versioning-policy.md` | O que é público, o que nunca muda de significado, como se deprecia | Arquivo único, seções |

As sementes estão em `templates/errors.md` e
`templates/versioning-policy.md`. Não reproduza o conteúdo delas aqui.

## Quando usar / quando não

**Use** a cada mudança de interface pública, a cada código de erro novo, e a
cada mudança da política de versionamento.

**Não use** para documentar comportamento interno: o que não é observável por
um consumidor não é contrato, é implementação — e implementação não vira
documento (spec §13). Regra de negócio é `requirements-keeper`; o "por quê" da
mudança é `decision-recorder`.

**O custo de usar à toa:** um campo declarado público não pode mais mudar sem
depreciação. Cada linha do contrato é um compromisso que alguém vai cobrar —
publicar o que não precisava ser público é dívida que ninguém registrou.

## Procedimento

1. **Descubra se o artefato é gerado.** Consulte `generated[]` no
   `docs/.ownership.yml` e procure o marcador `generated: do not edit` no topo
   do arquivo. Se for gerado, **pare de pensar em editá-lo**.
2. **Para mudar o que é gerado, mude a fonte anotada** e rode o comando
   declarado em `generated[].command`. O comando imprime na saída padrão e não
   escreve arquivo (`ADR-0005`) — redirecione você mesmo para o `path`.
3. **Rode `living-docs drift`** e confirme exit 0. É `CI-5`, e ele é o que
   sobrevive a alguém editando pelo navegador.
4. **Artefato gerado novo entra em `generated[]`** com o comando que o produz.
   Sem a declaração, `HK-2` só o pega pelo marcador e `CI-5` não o vê.
5. **Código de erro novo entra no catálogo** com código, significado (não a
   mensagem exibível), quando ocorre, transporte, se é público e status.
6. **Código publicado nunca muda de significado**: ganha `deprecated` e um
   substituto apontado. Sem substituto não é depreciação — é quebra de
   compatibilidade, e passa pela política de versionamento e por um ADR
   (`decision-recorder`).
7. **Nomeie pelo glossary** (`glossary-keeper`), não pelo hábito de quem
   escreveu o endpoint.
8. **Mudança visível ao consumidor gera entrada no CHANGELOG** — quando a
   Fase 6 (`release-historian`, `CI-6`) existir. Até lá, isso é verificação
   humana, e a política de versionamento diz o que fazer.
9. **Cite o ID afetado na mensagem de commit.**

## Fronteiras

| É seu | Não é seu |
| --- | --- |
| A pipeline que gera o contrato, e a fonte anotada | Editar o arquivo gerado — `HK-2` nega, e ele está certo |
| A política em volta: versionamento, depreciação, estabilidade | O contrato em si, quando ele pode ser gerado |
| O catálogo de erros: código, significado, status | A mensagem exibível, que não é contrato |
| Declarar o que é público | Decidir quebrar compatibilidade (é ADR, e ato humano) |
| Exigir substituto antes de depreciar | Escrever o guia de migração (é `release-historian`, Fase 6) |

## Checklist

- [ ] Nenhum artefato gerado foi editado à mão — verificação: `HK-2` (bloqueia) e `CI-5` (`living-docs drift`)
- [ ] O artefato gerado no commit é a saída atual do gerador — verificação: `CI-5`
- [ ] Todo artefato gerado está declarado em `generated[]`, com o comando que o produz — verificação: humana
- [ ] O gerador imprime na saída padrão e não escreve arquivo — verificação: humana (`ADR-0005`)
- [ ] Todo código de erro novo tem significado, gatilho, transporte e status — verificação: humana
- [ ] Nenhum código publicado mudou de significado; o que mudou ganhou `deprecated` + substituto — verificação: humana
- [ ] A mudança que quebra compatibilidade tem ADR — verificação: humana (`HK-3` intercepta a aceitação)
- [ ] O que virou público estava previsto na política, e não alargou o contrato em silêncio — verificação: humana
```

- [ ] **Step 4: Apontar os contratos em `CONTRIBUTING.md`**

Na tabela `## Onde a verdade mora`, acrescente uma linha imediatamente antes de
`| Quando está pronto |`:

```markdown
| O que é público, e o que cada erro significa | `docs/contracts/` |
```

Só o ponteiro. Nenhum código de erro é copiado para cá (`RN-0010`).

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Esperado: PASS, incluindo os quatro testes que a varredura gera para a skill
nova. Se `'contract-keeper: as seções da spec §11 estão presentes e na ordem'`
falhar, o título de alguma seção está diferente do esperado — a lista fixa está
em `test/plugin/authoring.test.ts`.

- [ ] **Step 6: Commit**

**`HK-5`:** este commit toca `plugin/skills/**`, que `watches` liga a
`CONTRIBUTING.md` — e ele está no `git add` abaixo. A resposta ao hook é "sim,
está junto".

```bash
git add plugin/skills/contract-keeper CONTRIBUTING.md test/plugin/authoring.test.ts
git commit -m "feat(SK-5): contract-keeper, dono do contrato público"
```

---

### Task 8: Critério de aceite 6, e os índices

**Objetivo:** Provar o critério 6 da spec §12 num teste único que exercita as
duas metades, e atualizar tudo que indexa o toolkit — sem copiar conteúdo para
nenhum deles.

**Files:**
- Modify: `test/acceptance/spec-criteria.test.ts`
- Modify: `docs/definition-of-done.md`
- Modify: `templates/definition-of-done.md`
- Modify: `.github/workflows/living-docs.yml`
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `plugin/.claude-plugin/plugin.json`
- Modify: `docs/superpowers/plans/BACKLOG-fases-3-7.md`

**Interfaces:**
- Consome: `decideHk2` (Task 2), `runDrift` (Task 3).
- Produz: nada.

**Requisitos:**
- O teste do critério 6 exercita **as duas** metades num cenário só, como o
  teste do critério 5 faz para `HK-4`/`HK-5`.
- Nenhum índice ganha conteúdo: `CLAUDE.md` e `README.md` apontam
  (`RN-0010`).
- A DoD ganha item **com verificação nomeada** — item sem verificação não
  entra (regra da própria DoD).

- [ ] **Step 1: Escrever o teste do critério 6**

Em `test/acceptance/spec-criteria.test.ts`, acrescente os dois imports ao bloco
de imports do topo, junto dos de `decideHk1`…`decideHk5`:

```typescript
import { decideHk2 } from '../../src/hooks/hk2-generated-artifact.ts';
import { runDrift } from '../../src/cli/drift.ts';
```

E o cenário ao final do arquivo:

```typescript
const GENERATED_CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/api.gen.md
    command: "node tools/gen.js"
`;

test('critério 6: HK-2 nega editar o contrato gerado, e CI-5 falha se passar por fora', () => {
  const GERADO = 'docs/contracts/api.gen.md';
  const VERDADE = '<!-- generated: do not edit -->\n\n# API\n\n- GET /pedidos\n';

  withTempRepo({ [OWNERSHIP_PATH]: GENERATED_CONFIG, [GERADO]: VERDADE }, (root) => {
    const env = { root, hostRoots: [root] };

    // Metade 1 — pelo agente, HK-2 nega e ensina o caminho certo.
    const negado = decideHk2(
      { tool_name: 'Edit', tool_input: { file_path: GERADO, old_string: 'GET', new_string: 'POST' } },
      env,
    );
    assert.equal(negado.action, 'deny');
    assert.match(negado.action === 'deny' ? negado.reason : '', /node tools\/gen\.js/);

    // Metade 2 — editado por fora do agente, CI-5 falha.
    writeFileSync(join(root, GERADO), VERDADE.replace('GET', 'POST'), 'utf8');
    const derivou = runDrift(root, () => VERDADE);
    assert.equal(derivou.exitCode, 1);
    assert.equal(derivou.findings[0]?.ruleId, 'CI-5');

    // E com o arquivo igual à saída do gerador, o caminho fica livre.
    writeFileSync(join(root, GERADO), VERDADE, 'utf8');
    assert.equal(runDrift(root, () => VERDADE).exitCode, 0);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que passa**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="critério 6"
```

Esperado: PASS de primeira — o código das Tasks 2 e 3 já existe. É um teste de
aceite, não um teste de TDD: ele confirma que as duas peças, escritas
separadamente, fecham o cenário da spec.

- [ ] **Step 3: Acrescentar o item à Definition of Done deste repositório**

Em `docs/definition-of-done.md`, acrescente depois do item de `HK-1`:

```markdown
- [ ] Nenhum artefato gerado foi editado à mão, e o contrato regenerado está no mesmo commit — verificação: `HK-2` (bloqueia) e `CI-5` (`living-docs drift`).
```

E troque o último item, para que ele nomeie os quatro comandos que o workflow
roda:

```markdown
- [ ] `npm test`, `npm run typecheck`, `living-docs validate` e `living-docs drift` passam no container — verificação: `CI-1`, `CI-2`, `CI-3` e `CI-5`, rodados pelo workflow do repositório.
```

- [ ] **Step 4: Acrescentar o mesmo item ao template da DoD**

Em `templates/definition-of-done.md`, depois do item de `HK-1`:

```markdown
- [ ] Nenhum artefato gerado foi editado à mão — verificação: `HK-2` e `CI-5` (`living-docs drift`).
```

O item é vacuamente verdadeiro num projeto sem artefato gerado, e é isso mesmo:
ele nasce junto com o primeiro `generated[]` declarado, sem ninguém lembrar de
voltar aqui.

- [ ] **Step 5: Rodar `drift` no CI**

Em `.github/workflows/living-docs.yml`, depois do passo de `validate`:

```yaml
      - name: CI-5 — deriva de contrato gerado
        run: >
          docker compose run --rm -w /workspace toolkit
          node /opt/living-docs/src/cli/index.ts drift
```

É o passo que impede `ADR-0005` de virar promessa: um check que só roda quando
alguém lembra não é enforcement.

- [ ] **Step 6: Atualizar o `README.md`**

Troque o parágrafo de abertura inteiro por:

```markdown
Documentação viva com dono, gatilho e enforcement — Fases 0–5 da spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions, Debt Register e
requisitos com ID estável; os checks `CI-1`/`CI-2`/`CI-3`/`CI-5`; os hooks
`HK-1`/`HK-2`/`HK-3`/`HK-4`/`HK-5`; os acordos de trabalho (`SK-6`); o
vocabulário do domínio e os princípios invioláveis (`SK-2`, `SK-1`); e o
contrato público, com a metade gerada que ninguém edita à mão (`SK-5`).
```

No bloco de uso, depois da linha de `validate`:

```bash
./bin/living-docs drift                 # roda CI-5: o contrato gerado ainda bate com o gerador?
```

Na seção de estágios, acrescente ao final do parágrafo:

```markdown
`production` acrescenta a moldura de contratos (catálogo de erros e política de
versionamento) e diz que a Fase 6 ainda não vem junto.
```

Na seção do plugin, acrescente:

```markdown
`contract-keeper` (`SK-5`) é dona do contrato público, e `HK-2` nega editar
artefato gerado à mão apontando a fonte e o comando do gerador.
```

Em "O que está fora", troque a lista e o parágrafo do critério 5:

```markdown
`SK-7`, `AG-1`, `HK-6`, `HK-7`, `CI-4`, `CI-6`, `CI-7`, `CI-8`, `CM-5`, `CM-7`
— Fases 6 e 7 da spec. O que falta e em que ordem:
`docs/superpowers/plans/BACKLOG-fases-3-7.md`.

Do critério de aceite 5 da spec §12, a Fase 3 entrega a metade do hook: o commit
que leva caminho vigiado sem o doc dono é perguntado. A outra metade — "e o CI
sinaliza pelo `watches`" — é `CI-7`, Fase 7. O critério 6 está fechado inteiro:
`HK-2` nega a edição e `CI-5` (`living-docs drift`) pega quem passou por fora.
```

- [ ] **Step 7: Atualizar `CLAUDE.md`**

Duas linhas, só índice e política. Na seção `## Política`, depois da linha de
"Você não corrige item congelado":

```markdown
- **Você não edita artefato gerado.** O que está em `generated[]` (ou traz o
  marcador) muda pela fonte e pelo gerador — `HK-2` nega e `CI-5` cobra.
```

E na seção `## Comandos`, acrescente `contract-keeper` à lista de skills
selecionadas pela `description`.

- [ ] **Step 8: Atualizar `plugin/.claude-plugin/plugin.json`**

Na `description`, troque "Fases 0–4" por "Fases 0–5" e acrescente "contrato
público gerado" à enumeração. `version` não muda: a política de versionamento
que a Task 6 escreveu não amarra a versão do plugin a fase de implantação.

- [ ] **Step 9: Atualizar o backlog**

Em `docs/superpowers/plans/BACKLOG-fases-3-7.md`:

1. Acrescente um bloco de estado no topo, no formato dos anteriores: a Fase 5
   está **implementada**, o plano é este arquivo, `ADR-0005` está `accepted` e
   `RF-0006`/`RF-0007`/`RN-0012` estão `active`, promovidos por ato humano
   (escreva isto **depois** da Task 9; se ela não acontecer, escreva o estado
   real).
2. Marque a seção "Fase 5" como **IMPLEMENTADA** e acrescente "O que o
   planejamento apurou", com pelo menos: (a) o alvo de dogfooding escolhido e
   por quê; (b) o contrato de gerador por stdout e a razão (check que reescreve
   apaga a evidência); (c) `CI-5` fora do `validate`, e o ponteiro que evita o
   silêncio.
3. Na seção "Fase 6", registre a herança: `src/exec/command.ts` existe e é o
   molde para `src/git/diff.ts` (runner injetável) — mas com o contrato
   invertido, porque `CI-6` é check e não hook; e `docs/contracts/errors.md`
   já aponta o CHANGELOG que ainda não existe.
4. Em "Dívidas e decisões abertas herdadas", atualize a nota sobre
   `--stage production`: ele passa a existir, com `notInstalled` nomeando a
   Fase 6; quem executar a Fase 6 esvazia essa lista.
5. Em "Ordem sugerida daqui", risque a Fase 5 e promova a Fase 6 a próximo
   passo.

- [ ] **Step 10: Rodar tudo e commitar**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

```bash
git add test/acceptance/spec-criteria.test.ts docs/definition-of-done.md templates/definition-of-done.md .github/workflows/living-docs.yml README.md CLAUDE.md plugin/.claude-plugin/plugin.json docs/superpowers/plans/BACKLOG-fases-3-7.md
git commit -m "docs(CI-5, HK-2): critério de aceite 6 fechado, e os índices da Fase 5"
```

---

### Task 9: Promoção humana

**Objetivo:** Levar `ADR-0005` a `accepted` e `RF-0006`, `RF-0007`, `RN-0012` a
`active`. **Isto não é seu.** A skill escreve `draft`; promover é ato humano
(`RN-0005`), e `HK-3` intercepta com `ask`.

**Files:**
- Modify: `docs/decisions/adr/ADR-0005-contrato-do-gerador-e-onde-ci5-roda.md`
- Modify: `docs/requirements/functional.md`
- Modify: `docs/requirements/rules.md`

**Interfaces:**
- Consome: os IDs da Task 1 e as citações plantadas pelas Tasks 2–8.
- Produz: os quatro itens em estado final, exigíveis por `CI-3`.

**Requisitos:**
- Antes de propor a promoção, confira que cada item **já** tem quem o cite:
  `RF-0006` em `test/checks/ci5-contract-drift.test.ts`,
  `test/cli/drift.test.ts`, `test/checks/registry.test.ts` e
  `test/contracts/drift.test.ts`; `RF-0007` em `test/cli/init.test.ts`;
  `RN-0012` em `test/hooks/hk2-generated-artifact.test.ts` e
  `test/contracts/drift.test.ts`. Sem citação, promover para `active` faz
  `CI-3` (regra 7) reprovar na hora.
- `ADR-0005` já nasceu com `relates-to` preenchido (Task 1). Depois de
  `accepted` o arquivo congela e `relates-to` não está na `mutable-fields`:
  consertar exigiria supersedir.
- `last-reviewed` só muda em arquivo que foi realmente revisto. Bump em massa é
  anti-requisito da spec §13.

- [ ] **Step 1: Confirmar que as citações existem**

```bash
docker compose exec toolkit sh -c 'grep -rn "RF-0006\|RF-0007\|RN-0012" test/ src/ | grep -v "^docs/"'
```

Esperado: ao menos uma ocorrência de cada, em arquivo **diferente** do
requisito. Citação dentro do próprio artefato não cobre nada (`CI-3`, regra 7).

- [ ] **Step 2: Propor a promoção — e deixar a resposta com quem decide**

Edite os quatro estados: `status: draft` → `status: accepted` em `ADR-0005`;
`- **status:** draft` → `- **status:** active` em `RF-0006`, `RF-0007` e
`RN-0012`.

`HK-3` vai interceptar cada uma dessas edições com `ask`. **A resposta não é
sua.** Apresente o que a pessoa precisa para decidir — o que o ADR decide, o
que se aceita perder, e que os requisitos já têm cobertura — e espere.

Se a pessoa recusar qualquer um deles, isso é um resultado legítimo: o item
continua `draft`, a Fase 5 continua entregue, e o backlog registra o estado
real. Não force, não contorne, e não "adiante" a promoção porque o plano
termina aqui.

- [ ] **Step 3: Rodar tudo e confirmar que o estado final passa**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Esperado: PASS, `validate=0`, `drift=0`. Se `CI-3` acusar `RF-0006 está active
e não é citada`, o Step 1 mentiu — a citação está no próprio arquivo, ou num
caminho fora de `cited-by`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/adr/ADR-0005-contrato-do-gerador-e-onde-ci5-roda.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0005, RF-0006, RF-0007, RN-0012): promoção por ato humano"
```

Se a promoção não aconteceu, não invente o commit: volte à Task 8, Step 9, e
escreva no backlog o estado real ("`ADR-0005` segue `draft`").

---

## O que esta fase deliberadamente não faz

- **Não resolve `DA-0002`.** `docs/contracts/errors.md` e
  `versioning-policy.md` entram na mesma categoria de `CONTRIBUTING.md`, da
  DoD, do glossary e do charter: artefato com dono e sem família de IDs, fora
  de `artifacts:`. `ADR-0004` já decidiu esse tratamento; `DA-0002` continua
  aberta, pré-condição de `CI-7` (Fase 7).
- **Não cria `CM-7` (`/release`) nem toca em CHANGELOG.** É Fase 6. A política
  de versionamento aponta a lacuna de propósito, em vez de fingir que o guia de
  migração existe.
- **Não paga `TDR-0001`.** `HK-1` continua congelando por arquivo, não por
  seção. O gatilho de pagamento segue sendo o primeiro PR que revogar um
  requisito.
- **Não cria `CI-9` para medir o catálogo de erros.** A verificação de "código
  publicado não muda de significado" é da skill e do teste de dogfooding —
  medir isso automaticamente exigiria comparar contra a versão publicada
  anterior, que é `CI-6` (Fase 6) e depende do diff.
- **Não muda `run-hook.sh` nem `src/core/types.ts`.** O wrapper já distribui por
  nome de hook, e o executor de comando é dependência do check, não do
  contexto. Mexer nos dois seria melhoria de graça em código que funciona.
