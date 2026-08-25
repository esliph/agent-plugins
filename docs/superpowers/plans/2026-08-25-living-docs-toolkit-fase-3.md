# Living Documentation Toolkit — Fase 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Amarrar código a documento no ponto mais barato — entregar a **Fase 3** da spec: o campo `watches` deixa de ser decorativo, `HK-4` lembra o doc dono depois de editar caminho vigiado, `HK-5` pergunta antes de um `git commit` que leva código sem o doc, e `SK-6` `working-agreements-keeper` passa a ser dona de `CONTRIBUTING.md`, `docs/definition-of-done.md` e do contrato do agente.

**Antecedente:** `docs/superpowers/plans/2026-08-24-living-docs-toolkit-fase-2.md` (`DA-0001` + Fase 2) e, antes dele, `docs/superpowers/plans/2026-08-24-living-docs-toolkit-core.md` (Fases 0–1). As Global Constraints dos dois valem aqui na íntegra e não são repetidas linha a linha. O insumo desta fase é `docs/superpowers/plans/BACKLOG-fases-3-7.md`, seção "Fase 3".

**Architecture:**

Três coisas de natureza diferente, nesta ordem porque cada uma consome a anterior.

1. **`watches` vira engine.** Hoje o campo é lido e validado por `src/config/ownership.ts` e **nenhuma regra o preenche** — ele existe no tipo e não existe no mundo. A Fase 3 introduz `src/config/watches.ts`, um módulo com uma pergunta só: *dado um conjunto de caminhos, que docs eles exigem, e quais desses docs eles não tocam*. `HK-4` faz essa pergunta com um caminho; `HK-5` faz com o índice inteiro do git; `CI-7`, na Fase 7, fará com o diff do PR. Nenhum dos três aprende caminho de projeto: a resposta inteira vem de `docs/.ownership.yml`.

2. **Dois hooks novos, e os dois são os primeiros do seu tipo.** `HK-4` é o primeiro `PostToolUse` — a saída não é `permissionDecision`, é `additionalContext`, e por isso `src/hooks/lib/io.ts` ganha um segundo formatador. `HK-5` é o primeiro `PreToolUse` com matcher `Bash`: não recebe `file_path`, recebe `command`, e para saber o que está no commit precisa perguntar ao git — o que traz `src/git/staged.ts`, o primeiro módulo do toolkit que executa subprocesso. Os dois obedecem a mesma regra: **nunca negam**. `HK-4` informa, `HK-5` pergunta. Um lembrete que bloqueia é desinstalado no primeiro atalho legítimo, e aí não sobra lembrete nenhum.

3. **`SK-6` fecha o loop no documento que as pessoas leem.** A Definition of Done é o mecanismo 1 escrito onde ele é consultado ("a atualização do doc dono cabe no mesmo PR"), e é ela que a Fase 7 vai transformar em `CI-7`. O contrato do agente (`CLAUDE.md`) nasce nesta fase e nasce **índice e política, não conteúdo** — o teste que o guarda existe porque a alternativa é ele apodrecer como qualquer outro documento duplicado.

**Tech Stack:** o mesmo — Node 24 com type-stripping nativo (imports com extensão `.ts`), `node:test`, TypeScript 5.9 só como type-checker (`erasableSyntaxOnly`), `yaml`, `picomatch`, `git` (novo consumidor, já presente na imagem), Docker + Compose como único runtime.

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` — §3 (`watches` no `.ownership.yml`), §5 (`SK-6`), §7 (`HK-4`, `HK-5`, requisitos não funcionais dos hooks), §10 (Fase 3 e o estágio `small-team`), §11 (convenções de autoria), §12 (critério de aceite 5 e 9).

## Global Constraints

Valem as dos planos anteriores — nada de `node`/`npm`/`npx` no host (só Docker), sem build step, imports com `.ts`, hook com timeout ≤ 5 s e falha aberta e zero rede, hook nunca julga intenção, identificadores em inglês e prosa em pt-BR, mensagem de commit citando o ID afetado, ID nunca reciclado, um artefato um dono, nenhum caminho absoluto de container em `src/` ou `test/`. Somam-se a elas:

- **O enforcement do mecanismo 1 nunca nega.** `HK-4` só emite `additionalContext`; `HK-5` só emite `permissionDecision: "ask"`. A palavra `deny` não aparece em `src/hooks/hk4-*.ts` nem em `src/hooks/hk5-*.ts`, e há teste que reprova a regressão (spec §7; `RN-0009`).
- **Nenhum caminho de projeto entra em `src/`.** Todo glob de código e todo caminho de doc vêm de `watches` no `.ownership.yml`. Um literal `'src/domain/**'` ou `'CHANGELOG.md'` dentro de `src/` é motivo de reprovar o passo — o lugar dele é `docs/.ownership.yml` (deste repositório) ou `templates/ownership.yml` (dos consumidores).
- **Falha aberta cobre o git também.** `git` ausente, índice vazio, repositório sem `.git`, `dubious ownership`, timeout: todos resultam em deixar passar em silêncio. `HK-5` nunca pergunta "por precaução".
- **`git` é lido, nunca escrito.** O toolkit não faz `add`, `commit`, `stash` nem `checkout` em nome de ninguém. `src/git/staged.ts` executa exatamente um comando de leitura.
- **Escopo travado na Fase 3:** `src/config/watches.ts`, `src/git/staged.ts`, `HK-4`, `HK-5`, `SK-6` + `CONTRIBUTING.md` + `docs/definition-of-done.md` + contrato do agente, e o que o estágio `small-team` do `init` passa a instalar. **Fora deste plano:** `SK-1`, `SK-2`, `SK-5`, `SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-6`, `HK-7`, `CI-4`–`CI-8`, `CM-4`, `CM-5`, `CM-7`, `src/git/diff.ts`, `CheckContext.today`. Não implemente nada dessa lista, nem "só o esqueleto".
- **A Fase 3 não ganha comando e não ganha check.** A spec §10 não define comando para `SK-6`: a skill é selecionada pela `description`. E nenhum `CI-*` novo entra aqui — o `CHECKS` de `src/checks/registry.ts` continua com três checks. Não invente `CM-8` nem `CI-9`.
- **O critério 5 fecha pela metade, e isso se diz em voz alta.** "Dado um PR que altera caminho vigiado sem tocar o doc dono, quando se tenta commitar, então `HK-5` pergunta e lista os pendentes" — isto é a Fase 3. "**e** o CI sinaliza pelo `watches`" é `CI-7`, Fase 7. O README diz qual metade está entregue; nenhum teste é escrito para fingir a outra.
- **Tudo roda no container.** `docker compose exec toolkit npm test`, `docker compose exec toolkit npm run typecheck`, `./bin/living-docs validate`. Nenhum comando `node` direto no host (`RNF-0002`).

---

## Estrutura de arquivos

Novo (`+`) e alterado (`~`). O que não aparece aqui não muda.

```
+ src/config/watches.ts                 # "que docs este conjunto de caminhos exige" — HK-4, HK-5 e, na Fase 7, CI-7
+ src/git/staged.ts                     # o índice do git, com falha aberta e runner injetável
+ src/hooks/hk4-watch-reminder.ts       # HK-4 — PostToolUse, additionalContext
+ src/hooks/hk5-commit-guard.ts         # HK-5 — PreToolUse/Bash, ask

~ src/hooks/lib/io.ts                   # contextOutput(): a saída que não é decisão de permissão
~ src/cli/init.ts                       # small-team instala os acordos de trabalho; notInstalled encolhe

+ templates/contributing.md             # semente de CONTRIBUTING.md
+ templates/definition-of-done.md       # semente de docs/definition-of-done.md
+ templates/agent-contract.md           # semente de CLAUDE.md (ou AGENTS.md, se já existir)
~ templates/CODEOWNERS                  # dono dos acordos de trabalho
~ templates/ownership.yml               # `watches` continua vazio, mas com exemplo comentado: o init não inventa vínculo

+ plugin/skills/working-agreements-keeper/SKILL.md   # SK-6
~ plugin/hooks/hooks.json               # + PostToolUse (Edit|Write) e + PreToolUse (Bash)
~ plugin/.claude-plugin/plugin.json     # descrição: Fases 0–3

+ test/config/watches.test.ts
+ test/git/staged.test.ts
+ test/hooks/hk4-watch-reminder.test.ts
+ test/hooks/hk5-commit-guard.test.ts
+ test/docs/agent-contract.test.ts
~ test/cli/init.test.ts                 # RF-0004
~ test/plugin/manifest.test.ts          # três grupos de hook, não um
~ test/plugin/authoring.test.ts         # asserções específicas de SK-6
~ test/acceptance/spec-criteria.test.ts # critério 5

+ CONTRIBUTING.md                       # dogfooding de SK-6
+ CLAUDE.md                             # dogfooding de SK-6 — índice e política, nunca conteúdo
+ docs/definition-of-done.md            # dogfooding de SK-6
~ docs/requirements/rules.md            # + RN-0008, RN-0009, RN-0010
~ docs/requirements/functional.md       # + RF-0004
~ docs/.ownership.yml                   # `watches` preenchido — o dogfooding do mecanismo 1
~ docs/open-decisions.md                # + DA-0002 (artefato sem família de IDs)
~ CODEOWNERS  README.md
```

**Por que estes arquivos e não outros.** `watches.ts` mora em `src/config/` porque responde a uma pergunta sobre configuração, não sobre documento — `src/docs/` lê artefato, `src/config/` lê o mapa. `staged.ts` mora em `src/git/` sozinho porque a Fase 6 vai pôr `diff.ts` ao lado dele: são a mesma família (o que o git sabe e o sistema de arquivos não), e separá-los agora evita um `src/git.ts` que cresce até ninguém conseguir ler. Os dois hooks são arquivos independentes porque é assim que `hooks.json` os invoca — um processo por hook.

---

### Task 1: Os requisitos da Fase 3, em `draft`

**Objetivo:** escrever a regra **antes** do código, que é a regra que o próprio toolkit impõe (`SK-4`, regra 1; critério de aceite 4). Nascem em `draft`; a promoção para `active` é ato humano e acontece na Task 9, depois que os testes já as citam — `CI-3` exige citação para requisito `active`, e um requisito `active` sem cobertura reprova o próprio repositório.

**Files:**
- Modify: `docs/requirements/rules.md` (acrescenta `RN-0008`, `RN-0009`, `RN-0010` ao final; atualiza `last-reviewed`)
- Modify: `docs/requirements/functional.md` (acrescenta `RF-0004`; atualiza `last-reviewed`)

**Interfaces:**
- Consome: o formato de seção de `templates/requirements.md`, já em uso nas Fases 0–2.
- Produz: os IDs `RN-0008`, `RN-0009`, `RN-0010` e `RF-0004`, citados pelos testes das Tasks 2 a 9. Nenhum outro ID novo nasce nesta fase.

**Requisitos:**
- Os quatro nascem `status: draft`. **Não promova.** `HK-3` devolve `ask`, e a resposta não é do agente.
- O ID vem em sequência: os últimos usados são `RN-0007` e `RF-0003`. Confira `docs/ids-retired.txt` antes (está vazio; confira mesmo assim — é o hábito que a regra protege).
- Cada requisito traz `fora de escopo`, que é o campo que impede o alargamento silencioso.
- Nenhum deles descreve o que o código faz. Descrevem o que o sistema **deve** ser.

- [ ] **Step 1: Acrescentar as três regras de negócio**

Ao final de `docs/requirements/rules.md`, depois de `RN-0007`:

```markdown
## RN-0008 — Caminho vigiado e doc dono viajam no mesmo commit

- **status:** draft
- **relates-to:** RN-0001
- **fora de escopo:** qual caminho exige qual doc, que é configuração do projeto e mora em `watches`

Um caminho de código declarado em `watches` tem um documento dono, e a mudança
dos dois cabe no mesmo commit. Documentação que espera um segundo PR é
documentação que não acontece: quem a adiaria já está com o contexto na cabeça
agora, e não estará depois.

Quando a mudança realmente não afeta o doc, quem decide isso é uma pessoa, no
momento em que o enforcement pergunta — não o agente, e não o silêncio.

## RN-0009 — O enforcement do vínculo código→doc lembra e pergunta, nunca nega

- **status:** draft
- **relates-to:** RN-0008
- **fora de escopo:** o congelamento de item imutável (`RN-0006`), que nega por outro motivo

O que liga código a documento informa (`additionalContext`) ou pergunta
(`ask`). Nunca bloqueia. Um atalho legítimo existe e precisa ser possível: o
enforcement que impede um commit honesto é desligado no primeiro dia, e um
enforcement desligado não protege nada.

Isto não afrouxa `RN-0006`: item congelado continua sendo `deny`. A diferença é
o que se protege — lá, uma história que não se reescreve; aqui, um hábito que se
ensina.

## RN-0010 — O contrato do agente é índice e política, não conteúdo

- **status:** draft
- **fora de escopo:** a detecção automática de duplicação textual, que é `CI-7` e chega na Fase 7

O documento que orienta agentes (`CLAUDE.md`, `AGENTS.md`) aponta onde a verdade
mora e declara o que nunca fazer. Toda afirmação factual vive no artefato dono e
é linkada de lá.

Conteúdo copiado para dentro dele apodrece igual a qualquer duplicata — com o
agravante de ser lido em toda sessão, o que faz a versão velha ganhar da nova
por repetição.
```

- [ ] **Step 2: Acrescentar o requisito funcional**

Ao final de `docs/requirements/functional.md`:

```markdown
## RF-0004 — `init --stage small-team` instala os acordos de trabalho

- **status:** draft
- **relates-to:** RF-0002
- **fora de escopo:** preencher `watches`, que exige conhecer o código do projeto e é ato humano

No estágio `small-team`, `living-docs init` cria `CONTRIBUTING.md`, a Definition
of Done e o contrato do agente. Encontrando `AGENTS.md`, adota-o como contrato em
vez de criar um `CLAUDE.md` paralelo; encontrando qualquer um deles já escrito,
mantém o conteúdo intacto.

O que o comando **não** faz é inventar `watches`: um vínculo código→doc que
ninguém reconhece é ruído que ensina a ignorar o lembrete.
```

- [ ] **Step 3: Atualizar `last-reviewed` dos dois arquivos**

Em `docs/requirements/rules.md` e `docs/requirements/functional.md`, o campo do frontmatter passa a `last-reviewed: 2026-08-25`. Não toque em `docs/requirements/non-functional.md` — ele não mudou, e bump de `last-reviewed` sem mudança é o anti-requisito nº 8 da spec §13.

- [ ] **Step 4: Rodar os checks**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```
Esperado: testes verdes e `exit=0`. Os requisitos novos estão em `draft`, então `CI-3` ainda não exige citação para eles. Se `CI-1` reclamar de `status`, confira que o valor é exatamente `draft`.

- [ ] **Step 5: Commit**

```bash
git add docs/requirements
git commit -m "docs(RN-0008..RN-0010, RF-0004): requisitos da Fase 3 em draft"
```

---

### Task 2: `src/config/watches.ts` — que docs este conjunto de caminhos exige

**Objetivo:** a peça de engine que falta. Uma pergunta, três consumidores (`HK-4`, `HK-5` e, na Fase 7, `CI-7`), zero caminhos embutidos.

**Files:**
- Create: `src/config/watches.ts`
- Test: `test/config/watches.test.ts`

**Interfaces:**
- Consome: `OwnershipConfig`, `WatchRule` e `findArtifactRule` de `src/config/ownership.ts` (já existem, sem alteração); `picomatch`.
- Produz, para as Tasks 4, 5 e 9:
  - `interface WatchMatch { doc: string; reason: string | null; consumerVisible: boolean; matched: string[]; skill: string | null; owner: string | null }`
  - `watchesFor(config: OwnershipConfig, paths: readonly string[]): WatchMatch[]`
  - `pendingDocs(config: OwnershipConfig, paths: readonly string[]): WatchMatch[]`
  - `coversDoc(doc: string, paths: readonly string[]): boolean`

**Requisitos:**
- Agrupa por **doc**, não por regra: duas entradas de `watches` que apontam para o mesmo doc produzem uma exigência só, com os caminhos somados.
- `skill` e `owner` vêm de `findArtifactRule` quando o doc é artefato declarado, e são `null` quando não é. **Não é erro:** `CONTRIBUTING.md` é doc dono legítimo e não tem família de IDs — é a lacuna que a Task 9 registra como `DA-0002`.
- Normaliza `\` para `/` e remove `./` antes de casar. O `file_path` de um hook chega no formato do host, que em Windows usa barra invertida.
- Um doc declarado como diretório (`docs/requirements/`) é coberto por qualquer arquivo dentro dele; declarado como arquivo, só por igualdade.
- `watches: []` devolve `[]`, sempre. É o estado das Fases 0–2 e não pode virar exceção no código.

- [ ] **Step 1: Escrever o teste que falha**

`test/config/watches.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOwnership } from '../../src/config/ownership.ts';
import { coversDoc, pendingDocs, watchesFor } from '../../src/config/watches.ts';

const CONFIG = parseOwnership(`
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "comportamento novo exige regra com ID antes do código"
  - code: "src/**/errors/**"
    doc: docs/contracts/errors.md
  - code: "src/domain/pedido/**"
    doc: docs/requirements/rules.md
    reason: "outro motivo, mesmo doc"
`);

const SEM_WATCHES = parseOwnership(`
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
`);

test('RN-0008: caminho vigiado nomeia o doc dono, com quem o mantém e por quê', () => {
  const matches = watchesFor(CONFIG, ['src/domain/reembolso.ts']);
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.doc, 'docs/requirements/rules.md');
  assert.equal(matches[0]?.skill, 'requirements-keeper');
  assert.equal(matches[0]?.owner, '@team');
  assert.match(String(matches[0]?.reason), /regra com ID antes do código/);
  assert.deepEqual(matches[0]?.matched, ['src/domain/reembolso.ts']);
});

test('RN-0008: caminho fora de watches não exige doc nenhum', () => {
  assert.deepEqual(watchesFor(CONFIG, ['README.md', 'test/helpers/tmp.ts']), []);
});

test('doc sem artefato declarado é exigido do mesmo jeito, só que sem skill', () => {
  const [match] = watchesFor(CONFIG, ['src/api/errors/not-found.ts']);
  assert.equal(match?.doc, 'docs/contracts/errors.md');
  assert.equal(match?.skill, null);
  assert.equal(match?.owner, null);
});

test('duas regras para o mesmo doc viram uma exigência só, com os caminhos somados', () => {
  const matches = watchesFor(CONFIG, ['src/domain/pedido/item.ts', 'src/domain/reembolso.ts']);
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0]?.matched, ['src/domain/pedido/item.ts', 'src/domain/reembolso.ts']);
});

test('RN-0008: o doc tocado no mesmo conjunto sai da lista de pendências', () => {
  const paths = ['src/domain/reembolso.ts', 'docs/requirements/rules.md'];
  assert.equal(watchesFor(CONFIG, paths).length, 1);
  assert.deepEqual(pendingDocs(CONFIG, paths), []);
});

test('RN-0008: sem o doc, a pendência permanece', () => {
  const pending = pendingDocs(CONFIG, ['src/domain/reembolso.ts']);
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.doc, 'docs/requirements/rules.md');
});

test('doc declarado como diretório é coberto por qualquer arquivo dentro dele', () => {
  assert.equal(coversDoc('docs/requirements/', ['docs/requirements/rules.md']), true);
  assert.equal(coversDoc('docs/requirements/', ['docs/glossary.md']), false);
  assert.equal(coversDoc('docs/requirements/rules.md', ['docs/requirements/rules.md']), true);
  assert.equal(coversDoc('docs/requirements/rules.md', ['docs/requirements/']), false);
});

test('caminho em formato de host é normalizado antes de casar', () => {
  assert.equal(watchesFor(CONFIG, ['src\\domain\\reembolso.ts']).length, 1);
  assert.equal(watchesFor(CONFIG, ['./src/domain/reembolso.ts']).length, 1);
});

test('sem `watches`, nada é exigido — é o estado das Fases 0 a 2', () => {
  assert.deepEqual(watchesFor(SEM_WATCHES, ['src/domain/reembolso.ts']), []);
  assert.deepEqual(pendingDocs(SEM_WATCHES, ['src/domain/reembolso.ts']), []);
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/config/watches.test.ts
```
Esperado: FAIL — `Cannot find module '.../src/config/watches.ts'`.

- [ ] **Step 3: Escrever `src/config/watches.ts`**

```typescript
import picomatch from 'picomatch';
import { findArtifactRule } from './ownership.ts';
import type { OwnershipConfig } from './ownership.ts';

export interface WatchMatch {
  /** Doc dono exigido, normalizado. */
  doc: string;
  /** Por que o vínculo existe. O texto é do projeto; o toolkit só o transporta. */
  reason: string | null;
  /** `consumer-visible: true` em alguma das regras que apontam para este doc (CI-6, Fase 6). */
  consumerVisible: boolean;
  /** Caminhos do conjunto que dispararam a exigência, sem repetição e na ordem em que vieram. */
  matched: string[];
  /** Skill dona do doc, quando o doc é artefato declarado; null quando não é. */
  skill: string | null;
  owner: string | null;
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * O doc está coberto por algum destes caminhos? Doc declarado como diretório é
 * coberto pelo que está dentro dele; declarado como arquivo, só por igualdade.
 */
export function coversDoc(doc: string, paths: readonly string[]): boolean {
  const target = normalize(doc);
  return paths.some((path) => {
    const candidate = normalize(path);
    return target.endsWith('/') ? candidate.startsWith(target) : candidate === target;
  });
}

/**
 * Que docs este conjunto de caminhos exige, agrupado por doc.
 *
 * É a única pergunta que `watches` responde, e ela é feita por `HK-4` (com um
 * caminho), por `HK-5` (com o índice inteiro) e, na Fase 7, por `CI-7` (com o
 * diff). Nenhum deles conhece caminho de projeto: tudo vem do `.ownership.yml`.
 */
export function watchesFor(config: OwnershipConfig, paths: readonly string[]): WatchMatch[] {
  const normalized = paths.map(normalize);
  const byDoc = new Map<string, WatchMatch>();

  for (const watch of config.watches) {
    const matches = picomatch(watch.code);
    const hits = normalized.filter((path) => matches(path));
    if (hits.length === 0) continue;

    const doc = normalize(watch.doc);
    const existing = byDoc.get(doc);
    if (existing) {
      existing.reason = existing.reason ?? watch.reason;
      existing.consumerVisible = existing.consumerVisible || watch.consumerVisible;
      for (const hit of hits) if (!existing.matched.includes(hit)) existing.matched.push(hit);
      continue;
    }

    // Doc que não é artefato declarado continua sendo doc dono: quem responde por
    // ele é o CODEOWNERS. A ausência de skill é informação, não erro.
    const rule = findArtifactRule(config, doc);
    byDoc.set(doc, {
      doc,
      reason: watch.reason,
      consumerVisible: watch.consumerVisible,
      matched: [...hits],
      skill: rule?.skill ?? null,
      owner: rule?.owner ?? null,
    });
  }

  return [...byDoc.values()];
}

/** Docs que estes caminhos exigem e que eles não tocam — o mecanismo 1 (spec §7). */
export function pendingDocs(config: OwnershipConfig, paths: readonly string[]): WatchMatch[] {
  return watchesFor(config, paths).filter((match) => !coversDoc(match.doc, paths));
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/config/watches.test.ts
docker compose exec toolkit npm run typecheck
```
Esperado: PASS nos dez testes; type-check limpo.

- [ ] **Step 5: Commit**

```bash
git add src/config/watches.ts test/config/watches.test.ts
git commit -m "feat(RN-0008): watches responde que docs um conjunto de caminhos exige"
```

---

### Task 3: `src/git/staged.ts` — o índice do git, com falha aberta

**Objetivo:** `HK-5` precisa saber o que está no commit antes de ele existir. É a única fonte dessa informação, e é a primeira vez que o toolkit executa subprocesso.

**Files:**
- Create: `src/git/staged.ts`
- Test: `test/git/staged.test.ts`

**Interfaces:**
- Consome: `node:child_process`.
- Produz, para a Task 5:
  - `type GitRunner = (args: readonly string[], cwd: string) => string`
  - `stagedPaths(root: string, run?: GitRunner): string[]`

**Requisitos:**
- Um comando, de leitura: `git -c safe.directory=* diff --cached --name-only -z`.
  - `-z` separa por byte NUL: sem ele, o git **escapa e envolve em aspas** caminho com acento ou espaço, e o caminho deixa de casar com os globs de `watches`.
  - `-c safe.directory=*` existe porque o hook roda dentro do container, com uid diferente do dono do checkout montado; sem isso o git recusa o repositório com `dubious ownership` e o hook silencia justamente quando deveria falar.
- Timeout de 3 s — o orçamento do hook inteiro é 5 s (spec §7), e ainda há a leitura do `.ownership.yml`.
- **Qualquer** erro devolve `[]`. Sem `.git`, sem `git` no PATH, timeout, exit ≠ 0: lista vazia. `HK-5` traduz lista vazia em "deixe passar".
- O runner é injetável para que o teste não dependa de um repositório real — e há um teste com repositório real mesmo assim, porque o formato da saída do git é a metade que um fake não prova.

- [ ] **Step 1: Escrever o teste que falha**

`test/git/staged.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { stagedPaths } from '../../src/git/staged.ts';
import type { GitRunner } from '../../src/git/staged.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const NUL = String.fromCharCode(0);

test('RN-0008: devolve os caminhos do índice, sem entrada vazia', () => {
  const fake: GitRunner = () => `src/domain/a.ts${NUL}docs/requirements/rules.md${NUL}`;
  assert.deepEqual(stagedPaths('/qualquer', fake), ['src/domain/a.ts', 'docs/requirements/rules.md']);
});

test('índice vazio devolve lista vazia', () => {
  assert.deepEqual(stagedPaths('/qualquer', () => ''), []);
});

test('RNF-0001: erro do git não trava o trabalho — devolve lista vazia', () => {
  const explode: GitRunner = () => {
    throw new Error('fatal: not a git repository');
  };
  assert.deepEqual(stagedPaths('/qualquer', explode), []);
});

test('o comando executado é de leitura, e só um', () => {
  const seen: string[][] = [];
  const spy: GitRunner = (args) => {
    seen.push([...args]);
    return '';
  };
  stagedPaths('/qualquer', spy);
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0]?.filter((arg) => ['add', 'commit', 'checkout', 'stash', 'reset'].includes(arg)), []);
  assert.ok(seen[0]?.includes('--cached'));
  assert.ok(seen[0]?.includes('-z'));
});

test('lê o índice de um repositório de verdade', () => {
  withTempRepo({ 'src/a.ts': 'export const a = 1;\n' }, (root) => {
    const git = (...args: string[]): void => {
      execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    };
    try {
      git('init', '-q');
    } catch {
      return; // sem git no ambiente: nada a provar aqui
    }
    git('-c', 'user.email=teste@exemplo.dev', '-c', 'user.name=Teste', 'commit', '-q', '-m', 'seed', '--allow-empty');
    git('add', 'src/a.ts');

    assert.deepEqual(stagedPaths(root), ['src/a.ts']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/git/staged.test.ts
```
Esperado: FAIL — `Cannot find module '.../src/git/staged.ts'`.

- [ ] **Step 3: Escrever `src/git/staged.ts`**

```typescript
import { execFileSync } from 'node:child_process';

/** Executor de git, injetável: o teste não precisa de um repositório para provar o resto. */
export type GitRunner = (args: readonly string[], cwd: string) => string;

/** Teto local; o orçamento do hook inteiro é 5 s (spec §7). */
const TIMEOUT_MS = 3_000;

const runGit: GitRunner = (args, cwd) =>
  execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    stdio: ['ignore', 'pipe', 'ignore'],
  });

/**
 * Caminhos no índice, relativos à raiz do repositório e sempre com `/`.
 *
 * `-z` porque o git envolve em aspas e escapa caminho com acento ou espaço, e um
 * caminho escapado não casa com glob nenhum. `safe.directory=*` porque o hook roda
 * no container com uid diferente do dono do checkout montado (`ADR-0003`), e sem
 * isso o git recusa o repositório.
 *
 * Falha aberta (`RNF-0001`): erro nenhum sobe daqui. Lista vazia significa "não
 * sei", e quem chama trata "não sei" como "deixe passar".
 */
export function stagedPaths(root: string, run: GitRunner = runGit): string[] {
  let output: string;
  try {
    output = run(['-c', 'safe.directory=*', 'diff', '--cached', '--name-only', '-z'], root);
  } catch {
    return [];
  }

  return output
    .split(String.fromCharCode(0))
    .map((path) => path.trim().replace(/\\/g, '/'))
    .filter((path) => path !== '');
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/git/staged.test.ts
docker compose exec toolkit npm run typecheck
```
Esperado: PASS nos cinco testes. Se o de repositório real falhar em `git commit --allow-empty`, confirme que o `git` da imagem é ≥ 2.35 (`docker compose exec toolkit git --version`) — abaixo disso `-c safe.directory=*` não é reconhecido, e a correção é o `Dockerfile`, não o teste.

- [ ] **Step 5: Commit**

```bash
git add src/git/staged.ts test/git/staged.test.ts
git commit -m "feat(RN-0008): stagedPaths lê o índice do git com falha aberta"
```

---

### Task 4: `HK-4` — lembrar o doc dono depois de editar caminho vigiado

**Objetivo:** o primeiro `PostToolUse` do toolkit. Não decide nada: injeta contexto no momento em que a informação é útil, que é logo depois da edição e não na véspera do commit.

**Files:**
- Create: `src/hooks/hk4-watch-reminder.ts`
- Modify: `src/hooks/lib/io.ts` (acrescenta `contextOutput`)
- Test: `test/hooks/hk4-watch-reminder.test.ts`

**Interfaces:**
- Consome: `watchesFor`, `coversDoc`, `WatchMatch` (Task 2); `toRepoPath` de `src/hooks/lib/paths.ts`; `loadOwnership`; `HookEnv`/`HookPayload`/`emit`/`readPayload`/`hookEnv` de `src/hooks/lib/io.ts`.
- Produz:
  - `contextOutput(event: 'PostToolUse' | 'SessionStart', context: string): string` em `src/hooks/lib/io.ts` — `HK-6` vai reusá-lo na Fase 7.
  - `type Hk4Decision = { action: 'silent' } | { action: 'remind'; context: string }`
  - `decideHk4(payload: HookPayload, env: HookEnv): Hk4Decision`

**Requisitos:**
- Saída é `hookSpecificOutput.additionalContext`. **Nenhum** `permissionDecision` sai deste hook (`RN-0009`).
- Editar o próprio doc dono não gera lembrete — lembrar alguém de fazer o que acabou de fazer é o começo do ruído que ensina a ignorar hook.
- A mensagem nomeia: o caminho editado, o doc dono, o motivo declarado, a skill dona (quando existe) e a regra de origem. E diz, com todas as letras, que não é bloqueio.
- Falha aberta: sem `file_path`, fora do repositório, `.ownership.yml` ilegível ou ausente → `silent`.

- [ ] **Step 1: Escrever o teste que falha**

`test/hooks/hk4-watch-reminder.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideHk4 } from '../../src/hooks/hk4-watch-reminder.ts';
import type { Hk4Decision } from '../../src/hooks/hk4-watch-reminder.ts';
import { contextOutput } from '../../src/hooks/lib/io.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "comportamento novo exige regra com ID antes do código"
  - code: "plugin/skills/**"
    doc: CONTRIBUTING.md
    reason: "skill nova muda como se trabalha aqui"
`;

function assertRemind(decision: Hk4Decision): asserts decision is { action: 'remind'; context: string } {
  assert.equal(decision.action, 'remind');
}

function decide(filePath: string, config: string | null = CONFIG): Hk4Decision {
  let decision: Hk4Decision = { action: 'silent' };
  const files = config === null ? {} : { [OWNERSHIP_PATH]: config };
  withTempRepo(files, (root) => {
    decision = decideHk4(
      { tool_name: 'Edit', tool_input: { file_path: filePath } },
      { root, hostRoots: [root] },
    );
  });
  return decision;
}

test('RN-0008: editar caminho vigiado lembra o doc dono, com motivo e skill', () => {
  const decision = decide('src/domain/reembolso.ts');
  assertRemind(decision);
  assert.match(decision.context, /docs\/requirements\/rules\.md/);
  assert.match(decision.context, /regra com ID antes do código/);
  assert.match(decision.context, /requirements-keeper/);
  assert.match(decision.context, /HK-4/);
});

test('RN-0009: HK-4 lembra e não bloqueia — a saída não carrega decisão de permissão', () => {
  const decision = decide('src/domain/reembolso.ts');
  assertRemind(decision);
  assert.match(decision.context, /não é bloqueio|lembrete/i);

  const emitted = JSON.parse(contextOutput('PostToolUse', decision.context)) as {
    hookSpecificOutput: Record<string, unknown>;
  };
  assert.equal(emitted.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.equal(typeof emitted.hookSpecificOutput.additionalContext, 'string');
  assert.equal('permissionDecision' in emitted.hookSpecificOutput, false);
});

test('doc dono sem skill declarada ainda é lembrado', () => {
  const decision = decide('plugin/skills/nova/SKILL.md');
  assertRemind(decision);
  assert.match(decision.context, /CONTRIBUTING\.md/);
});

test('editar o próprio doc dono não gera lembrete', () => {
  assert.equal(decide('docs/requirements/rules.md').action, 'silent');
});

test('caminho fora de watches é silêncio', () => {
  assert.equal(decide('README.md').action, 'silent');
});

test('RNF-0001: sem configuração legível, silêncio', () => {
  assert.equal(decide('src/domain/reembolso.ts', null).action, 'silent');
});

test('payload sem file_path é silêncio', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG }, (root) => {
    const decision = decideHk4({ tool_name: 'Edit', tool_input: {} }, { root, hostRoots: [root] });
    assert.equal(decision.action, 'silent');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/hooks/hk4-watch-reminder.test.ts
```
Esperado: FAIL — `Cannot find module '.../src/hooks/hk4-watch-reminder.ts'`.

- [ ] **Step 3: Acrescentar `contextOutput` a `src/hooks/lib/io.ts`**

Depois de `askOutput`, antes de `emit`:

```typescript
/**
 * Saída de hook que **não** decide permissão: injeta contexto e devolve o
 * controle. É a forma de HK-4 (PostToolUse) e, na Fase 7, de HK-6 (SessionStart).
 * Não existe variante com `permissionDecision` aqui de propósito — o mecanismo 1
 * lembra e pergunta, nunca nega (spec §7).
 */
export function contextOutput(event: 'PostToolUse' | 'SessionStart', context: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  });
}
```

- [ ] **Step 4: Escrever `src/hooks/hk4-watch-reminder.ts`**

```typescript
#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write): lembra o doc dono depois de editar caminho vigiado.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 — mecanismo 1 no momento
 * em que a informação ainda é útil. Lembrete, nunca bloqueio: a saída é
 * `additionalContext`, e este arquivo não conhece a palavra `deny`.
 */
import { loadOwnership } from '../config/ownership.ts';
import { coversDoc, watchesFor } from '../config/watches.ts';
import type { WatchMatch } from '../config/watches.ts';
import { toRepoPath } from './lib/paths.ts';
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk4Decision = { action: 'silent' } | { action: 'remind'; context: string };

const SILENT: Hk4Decision = { action: 'silent' };

function describe(match: WatchMatch): string {
  const parts = [`- \`${match.doc}\``];
  if (match.owner !== null) parts.push(`(dono: ${match.owner})`);
  if (match.reason !== null) parts.push(`— ${match.reason}`);
  parts.push(
    match.skill !== null
      ? `Skill dona: ${match.skill}.`
      : 'Sem skill declarada para este doc — o dono está no CODEOWNERS.',
  );
  return parts.join(' ');
}

export function decideHk4(payload: HookPayload, env: HookEnv): Hk4Decision {
  const filePath = payload.tool_input?.file_path;
  if (typeof filePath !== 'string') return SILENT;

  const repoPath = toRepoPath(filePath, env.hostRoots);
  if (repoPath === null) return SILENT;

  let config;
  try {
    config = loadOwnership(env.root);
  } catch {
    return SILENT; // falha aberta
  }

  // Quem acabou de editar o doc dono não precisa ser lembrado dele.
  const pending = watchesFor(config, [repoPath]).filter((match) => !coversDoc(match.doc, [repoPath]));
  if (pending.length === 0) return SILENT;

  return {
    action: 'remind',
    context:
      `HK-4: \`${repoPath}\` é caminho vigiado em \`docs/.ownership.yml\` (\`watches\`). ` +
      'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 — a atualização do doc dono cabe no mesmo PR; ' +
      'se não couber, ela não acontece.\n' +
      `Doc dono a atualizar:\n${pending.map(describe).join('\n')}\n` +
      'Isto é lembrete, não é bloqueio: se a mudança realmente não afeta o doc, siga em frente.',
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return; // falha aberta
  const decision = decideHk4(payload, hookEnv());
  emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null);
}

if (process.argv[1]?.endsWith('hk4-watch-reminder.ts')) {
  main().catch(() => process.exit(0)); // falha aberta, sempre
}
```

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/hooks/hk4-watch-reminder.test.ts
docker compose exec toolkit npm run typecheck
```
Esperado: PASS nos sete testes.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/hk4-watch-reminder.ts src/hooks/lib/io.ts test/hooks/hk4-watch-reminder.test.ts
git commit -m "feat(RN-0008, RN-0009): HK-4 lembra o doc dono de caminho vigiado"
```

---

### Task 5: `HK-5` — perguntar antes do commit que leva código sem o doc

**Objetivo:** o mecanismo 1 no ponto mais barato possível. É o primeiro hook com matcher `Bash`: não há `file_path` no payload, e a verdade sobre o que vai no commit está no índice do git.

**Files:**
- Create: `src/hooks/hk5-commit-guard.ts`
- Test: `test/hooks/hk5-commit-guard.test.ts`

**Interfaces:**
- Consome: `pendingDocs`, `WatchMatch` (Task 2); `stagedPaths`, `GitRunner` (Task 3); `askOutput`/`emit`/`hookEnv`/`readPayload` de `src/hooks/lib/io.ts`.
- Produz:
  - `isGitCommit(command: string): boolean`
  - `type Hk5Decision = { action: 'allow' } | { action: 'ask'; reason: string }`
  - `decideHk5(payload: HookPayload, env: HookEnv, run?: GitRunner): Hk5Decision`

**Requisitos:**
- Só age quando `tool_name` é `Bash` **e** o comando é um `git commit`. `git status`, `npm test`, `git log` passam sem tocar em disco.
- O reconhecimento de `git commit` é sintático e deliberadamente simples: `git` no início do comando ou depois de `;`, `&&`, `||`, com `commit` adiante. Um hook que interpreta intenção está no lugar errado (spec §7). Ele prefere perguntar demais a perguntar de menos — a saída é `ask`, e uma pergunta a mais custa uma tecla.
- Índice vazio → `allow`. É o mesmo caminho de "git indisponível", e é o que a falha aberta exige.
- A mensagem lista **cada** doc pendente com os caminhos que o exigiram, nomeia a skill dona e dá as duas saídas legítimas: atualizar o doc agora, ou decidir — como pessoa — que a mudança não o afeta.
- Este hook **não** roda `git add` nem nada que escreva. Ele pergunta e sai.

- [ ] **Step 1: Escrever o teste que falha**

`test/hooks/hk5-commit-guard.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideHk5, isGitCommit } from '../../src/hooks/hk5-commit-guard.ts';
import type { Hk5Decision } from '../../src/hooks/hk5-commit-guard.ts';
import type { GitRunner } from '../../src/git/staged.ts';
import { askOutput } from '../../src/hooks/lib/io.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const NUL = String.fromCharCode(0);

const CONFIG = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "comportamento novo exige regra com ID antes do código"
`;

const staged = (...paths: string[]): GitRunner => () => paths.map((path) => `${path}${NUL}`).join('');

function assertAsk(decision: Hk5Decision): asserts decision is { action: 'ask'; reason: string } {
  assert.equal(decision.action, 'ask');
}

function decide(command: string, run: GitRunner, config: string | null = CONFIG): Hk5Decision {
  let decision: Hk5Decision = { action: 'allow' };
  const files = config === null ? {} : { [OWNERSHIP_PATH]: config };
  withTempRepo(files, (root) => {
    decision = decideHk5({ tool_name: 'Bash', tool_input: { command } }, { root, hostRoots: [root] }, run);
  });
  return decision;
}

test('RN-0008: staged toca caminho vigiado sem o doc dono — pergunta e lista os pendentes', () => {
  const decision = decide('git commit -m "feat: reembolso parcial"', staged('src/domain/reembolso.ts'));
  assertAsk(decision);
  assert.match(decision.reason, /docs\/requirements\/rules\.md/);
  assert.match(decision.reason, /src\/domain\/reembolso\.ts/);
  assert.match(decision.reason, /requirements-keeper/);
  assert.match(decision.reason, /HK-5/);
});

test('RN-0008: staged que traz o doc dono passa', () => {
  const run = staged('src/domain/reembolso.ts', 'docs/requirements/rules.md');
  assert.equal(decide('git commit -m "feat: reembolso parcial"', run).action, 'allow');
});

test('RN-0009: HK-5 pergunta, nunca nega', () => {
  const decision = decide('git commit -m "x"', staged('src/domain/reembolso.ts'));
  assertAsk(decision);
  const emitted = JSON.parse(askOutput(decision.reason)) as {
    hookSpecificOutput: { permissionDecision: string };
  };
  assert.equal(emitted.hookSpecificOutput.permissionDecision, 'ask');
});

test('a mensagem ensina as duas saídas legítimas', () => {
  const decision = decide('git commit -m "x"', staged('src/domain/reembolso.ts'));
  assertAsk(decision);
  assert.match(decision.reason, /atualize o doc/i);
  assert.match(decision.reason, /decisão humana|uma pessoa/i);
});

test('comando que não é git commit passa sem consultar o git', () => {
  let consultado = false;
  const spy: GitRunner = () => {
    consultado = true;
    return '';
  };
  for (const command of ['git status', 'npm test', 'git add -A', 'echo "git commit"']) {
    assert.equal(decide(command, spy).action, 'allow', command);
  }
  assert.equal(consultado, false);
});

test('reconhece git commit em cadeia e com opções', () => {
  assert.equal(isGitCommit('git commit'), true);
  assert.equal(isGitCommit('git add -A && git commit -m "x"'), true);
  assert.equal(isGitCommit('git -c user.name=Teste commit --amend'), true);
  assert.equal(isGitCommit('git status'), false);
  assert.equal(isGitCommit('npm run commitlint'), false);
});

test('RNF-0001: git indisponível — passa', () => {
  const explode: GitRunner = () => {
    throw new Error('fatal: not a git repository');
  };
  assert.equal(decide('git commit -m "x"', explode).action, 'allow');
});

test('RNF-0001: sem .ownership.yml — passa', () => {
  assert.equal(decide('git commit -m "x"', staged('src/domain/reembolso.ts'), null).action, 'allow');
});

test('índice vazio — passa', () => {
  assert.equal(decide('git commit -m "x"', () => '').action, 'allow');
});

test('tool_name diferente de Bash não é assunto deste hook', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG }, (root) => {
    const decision = decideHk5(
      { tool_name: 'Edit', tool_input: { command: 'git commit -m "x"' } },
      { root, hostRoots: [root] },
      staged('src/domain/reembolso.ts'),
    );
    assert.equal(decision.action, 'allow');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/hooks/hk5-commit-guard.test.ts
```
Esperado: FAIL — `Cannot find module '.../src/hooks/hk5-commit-guard.ts'`.

- [ ] **Step 3: Escrever `src/hooks/hk5-commit-guard.ts`**

```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Bash): pergunta quando o staged toca caminho vigiado e não traz o
 * doc dono.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 — o mecanismo 1 no ponto
 * mais barato possível. Devolve `ask`, nunca `deny`: um commit sem o doc pode
 * ser legítimo, e quem decide isso é uma pessoa.
 */
import { loadOwnership } from '../config/ownership.ts';
import { pendingDocs } from '../config/watches.ts';
import type { WatchMatch } from '../config/watches.ts';
import { stagedPaths } from '../git/staged.ts';
import type { GitRunner } from '../git/staged.ts';
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk5Decision = { action: 'allow' } | { action: 'ask'; reason: string };

const ALLOW: Hk5Decision = { action: 'allow' };

/**
 * `git … commit` no início do comando ou depois de um separador.
 *
 * Reconhecimento sintático, de propósito: um hook que interpreta intenção está
 * no lugar errado (spec §7). Ele erra para o lado de perguntar demais — a saída
 * é `ask`, e uma pergunta a mais custa uma tecla.
 */
const GIT_COMMIT = /(?:^|[;&|]\s*)git\b[^;&|]*\bcommit\b/;

export function isGitCommit(command: string): boolean {
  return GIT_COMMIT.test(command.trim());
}

function describe(match: WatchMatch): string {
  const parts = [`- \`${match.doc}\``];
  if (match.owner !== null) parts.push(`(dono: ${match.owner})`);
  parts.push(`— exigido por: ${match.matched.join(', ')}`);
  if (match.reason !== null) parts.push(`Motivo: ${match.reason}`);
  if (match.skill !== null) parts.push(`Skill dona: ${match.skill}.`);
  return parts.join(' ');
}

export function decideHk5(payload: HookPayload, env: HookEnv, run?: GitRunner): Hk5Decision {
  if (payload.tool_name !== undefined && payload.tool_name !== 'Bash') return ALLOW;

  const command = payload.tool_input?.command;
  if (typeof command !== 'string' || !isGitCommit(command)) return ALLOW;

  let config;
  try {
    config = loadOwnership(env.root);
  } catch {
    return ALLOW; // falha aberta
  }

  // Lista vazia significa "não sei": índice vazio, sem git, ou repositório recusado.
  const staged = stagedPaths(env.root, run);
  if (staged.length === 0) return ALLOW;

  const pending = pendingDocs(config, staged);
  if (pending.length === 0) return ALLOW;

  return {
    action: 'ask',
    reason:
      'HK-5: este commit leva código de caminho vigiado sem o doc dono. ' +
      'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 — se a atualização da documentação não cabe no ' +
      'PR que mudou o código, ela não acontece.\n' +
      `Pendente:\n${pending.map(describe).join('\n')}\n` +
      'Caminho válido: atualize o doc agora (skill dona acima) e refaça o `git add`. ' +
      'Se a mudança realmente não afeta o doc, isso é uma decisão humana — diga que é o caso e siga.',
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return; // falha aberta
  const decision = decideHk5(payload, hookEnv());
  emit(decision.action === 'ask' ? askOutput(decision.reason) : null);
}

if (process.argv[1]?.endsWith('hk5-commit-guard.ts')) {
  main().catch(() => process.exit(0)); // falha aberta, sempre
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/hooks/hk5-commit-guard.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```
Esperado: PASS na suíte inteira.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/hk5-commit-guard.ts test/hooks/hk5-commit-guard.test.ts
git commit -m "feat(RN-0008, RN-0009): HK-5 pergunta no commit que leva código sem o doc"
```

---

### Task 6: Registrar `HK-4` e `HK-5` no plugin

**Objetivo:** os dois hooks existem e ninguém os chama. Esta task liga os fios — e é a primeira vez que `hooks.json` declara mais de um evento.

**Files:**
- Modify: `plugin/hooks/hooks.json`
- Test: `test/plugin/manifest.test.ts:32-47` (o teste que hoje afirma "um grupo, dois hooks") e `test/plugin/manifest.test.ts:60-70` (o que varre só `PreToolUse`)

**Interfaces:**
- Consome: `plugin/hooks/run-hook.sh`, **sem alteração**. O wrapper passa o payload cru e recebe o nome do hook como argumento; cada hook sabe de que evento é. Verificado no Step 1.
- Produz: nada para tasks seguintes além do plugin funcionando.

**Requisitos:**
- `PreToolUse` passa a ter **dois** grupos: `Edit|Write` (com `HK-1` e `HK-3`) e `Bash` (com `HK-5`). `PostToolUse` ganha um grupo `Edit|Write` (com `HK-4`).
- Todo comando continua relocável (`${CLAUDE_PLUGIN_ROOT}`) e síncrono (`"async": false`) — um lembrete que chega depois da próxima ferramenta não é lembrete.
- O teste que varre "todo hook referenciado existe" passa a varrer **todos** os eventos, não só `PreToolUse`. É o mesmo motivo do teste de skills ser varredura e não lista: o próximo evento entra sem ninguém lembrar de acrescentá-lo aqui.

- [ ] **Step 1: Conferir o contrato do wrapper antes de mexer**

O `run-hook.sh` faz `docker exec … node /opt/living-docs/src/hooks/${HOOK}.ts` com o payload cru no stdin, e imprime o stdout do container quando ele não é vazio. Isso serve `PostToolUse` e `PreToolUse/Bash` sem mudança nenhuma: quem distingue o evento é o arquivo invocado.

Confirme lendo `plugin/hooks/run-hook.sh` e registre no commit que nada mudou ali. **Não** "melhore" o wrapper nesta task: ele é o ponto onde a falha aberta mora, e mexer nele sem necessidade é risco puro.

- [ ] **Step 2: Atualizar o teste do manifesto**

Em `test/plugin/manifest.test.ts`, substitua o teste `'hooks.json registra HK-1 e HK-3 em PreToolUse com matcher Edit|Write'` por:

```typescript
test('hooks.json registra os quatro hooks nos eventos e matchers da spec §7', () => {
  const config = readJson('plugin/hooks/hooks.json');
  const hooks = config.hooks as Record<string, { matcher: string; hooks: { command: string }[] }[]>;

  const grupos = new Map(
    Object.entries(hooks).flatMap(([evento, lista]) =>
      lista.map((grupo) => [`${evento}:${grupo.matcher}`, grupo.hooks.map((hook) => hook.command)] as const),
    ),
  );

  const esperado: Record<string, string[]> = {
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk3-state-promotion'],
    'PreToolUse:Bash': ['hk5-commit-guard'],
    'PostToolUse:Edit|Write': ['hk4-watch-reminder'],
  };

  assert.deepEqual([...grupos.keys()].sort(), Object.keys(esperado).sort());
  for (const [chave, nomes] of Object.entries(esperado)) {
    const comandos = grupos.get(chave) ?? [];
    assert.equal(comandos.length, nomes.length, `${chave}: ${comandos.length} hooks`);
    for (const nome of nomes) {
      assert.ok(comandos.some((comando) => comando.includes(nome)), `${chave} deveria invocar ${nome}`);
    }
    for (const comando of comandos) {
      assert.ok(comando.includes('${CLAUDE_PLUGIN_ROOT}'), 'o comando precisa ser relocável');
    }
  }
});
```

E o teste `'todo hook referenciado existe no repositório'` passa a varrer todos os eventos:

```typescript
test('todo hook referenciado existe no repositório', () => {
  const config = readJson('plugin/hooks/hooks.json');
  const hooks = config.hooks as Record<string, { hooks: { command: string }[] }[]>;
  let vistos = 0;

  for (const grupos of Object.values(hooks)) {
    for (const grupo of grupos) {
      for (const hook of grupo.hooks) {
        const name = hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? '';
        assert.ok(existsSync(join(ROOT, 'src/hooks', `${name}.ts`)), `src/hooks/${name}.ts deveria existir`);
        vistos += 1;
      }
    }
  }

  assert.equal(vistos, 4, 'a varredura deveria ver os quatro hooks das Fases 1 e 3');
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/plugin/manifest.test.ts
```
Esperado: FAIL — o `hooks.json` atual só tem `PreToolUse:Edit|Write`.

- [ ] **Step 4: Escrever `plugin/hooks/hooks.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk1-append-only",
            "shell": "bash",
            "async": false
          },
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk3-state-promotion",
            "shell": "bash",
            "async": false
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk5-commit-guard",
            "shell": "bash",
            "async": false
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk4-watch-reminder",
            "shell": "bash",
            "async": false
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec toolkit npm test
```
Esperado: PASS.

- [ ] **Step 6: Verificar os dois hooks à mão, pelo contrato real**

Com o container de pé, alimente cada hook com um payload como o Claude Code o entrega:

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/checks/ci1-structure.ts"}}' \
  | docker compose exec -T -e LIVING_DOCS_REPO_ROOT=/workspace toolkit \
    node /opt/living-docs/src/hooks/hk4-watch-reminder.ts

echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m teste"}}' \
  | docker compose exec -T -e LIVING_DOCS_REPO_ROOT=/workspace toolkit \
    node /opt/living-docs/src/hooks/hk5-commit-guard.ts
```

Esperado **nesta task**: saída vazia nos dois — `watches` deste repositório ainda é `[]`, e o hook que não tem o que dizer fica quieto. A Task 9 repete estes dois comandos com `watches` preenchido e espera JSON. Se sair alguma coisa agora, algo está lendo caminho de outro lugar que não o `.ownership.yml`.

- [ ] **Step 7: Commit**

```bash
git add plugin/hooks/hooks.json test/plugin/manifest.test.ts
git commit -m "feat(RN-0008): plugin registra HK-4 (PostToolUse) e HK-5 (PreToolUse/Bash)"
```

---

### Task 7: `SK-6` `working-agreements-keeper` e os três artefatos que ela governa

**Objetivo:** dar dono a "como se trabalha aqui". A Definition of Done é o mecanismo 1 escrito onde ele é lido, e é a fonte de `CI-7` na Fase 7; o contrato do agente nasce índice, não conteúdo.

**Files:**
- Create: `plugin/skills/working-agreements-keeper/SKILL.md`
- Create: `CONTRIBUTING.md`, `docs/definition-of-done.md`, `CLAUDE.md`
- Create: `test/docs/agent-contract.test.ts`
- Modify: `CODEOWNERS`
- Modify: `test/plugin/authoring.test.ts` (asserções específicas de `SK-6`)

**Interfaces:**
- Consome: as convenções de autoria da spec §11, já verificadas por `test/plugin/authoring.test.ts` sobre **todas** as skills — a skill nova entra na varredura no dia em que nasce.
- Produz: o nome `working-agreements-keeper`, citado por `watches`/CODEOWNERS na Task 9 e pelos templates na Task 8.

**Requisitos:**
- A skill obedece à varredura existente: seções na ordem `Overview` → `Do que você é dono` → `Quando usar / quando não` → `Procedimento` → `Fronteiras` → `Checklist`; `description` com mais de 120 caracteres, contendo "Use" e escrita em **sintoma** ("um agente errou por falta de contexto", "isso não estava escrito em lugar nenhum"); checklist com ao menos 6 caixas, cada uma nomeando `CI-n`, `HK-n` ou verificação humana.
- A skill **não** copia o conteúdo dos artefatos que governa. Ela aponta para `templates/`.
- `CLAUDE.md` é índice e política: cabe numa tela, linka os artefatos donos e não repete o enunciado de nenhum requisito (`RN-0010`).
- A DoD tem uma linha por item verificável, e cada linha nomeia **o que** verifica aquilo — um check existente, um hook, ou "humano". Item sem verificação nomeada não entra.

- [ ] **Step 1: Escrever o teste do contrato do agente**

`test/docs/agent-contract.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toolkitRoot } from '../../src/core/roots.ts';

const ROOT = toolkitRoot();
const CONTRATO = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');

test('RN-0010: o contrato do agente aponta para os artefatos donos', () => {
  const alvos = [
    'LIVING-DOCUMENTATION-TOOLKIT.md',
    'docs/.ownership.yml',
    'CONTRIBUTING.md',
    'docs/definition-of-done.md',
    'docs/requirements/',
  ];
  for (const alvo of alvos) {
    assert.ok(CONTRATO.includes(alvo), `o contrato deveria apontar para ${alvo}`);
  }
});

test('RN-0010: o contrato não copia o enunciado de requisito nenhum', () => {
  const titulos = ['rules.md', 'functional.md', 'non-functional.md'].flatMap((arquivo) =>
    [...readFileSync(join(ROOT, 'docs/requirements', arquivo), 'utf8').matchAll(/^## (R[NF]F?-\d{4} — .+)$/gm)].map(
      (match) => match[1] ?? '',
    ),
  );

  assert.ok(titulos.length >= 11, `esperava os requisitos das Fases 0 a 3, achei ${titulos.length}`);
  for (const titulo of titulos) {
    assert.equal(CONTRATO.includes(titulo), false, `o contrato copia o requisito "${titulo}"`);
  }
});

test('RN-0010: o contrato é índice, não manual — cabe numa tela', () => {
  const linhas = CONTRATO.split('\n').length;
  assert.ok(linhas <= 60, `contrato com ${linhas} linhas: índice que não cabe numa tela vira manual`);
});

test('a Definition of Done nomeia a verificação de cada item', () => {
  const dod = readFileSync(join(ROOT, 'docs/definition-of-done.md'), 'utf8');
  const itens = dod.split('\n').filter((linha) => linha.trim().startsWith('- [ ]'));
  assert.ok(itens.length >= 6, `DoD com apenas ${itens.length} itens`);
  for (const item of itens) {
    assert.match(item, /CI-\d|HK-\d|human/i, `item sem verificação nomeada — ${item}`);
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/docs/agent-contract.test.ts
```
Esperado: FAIL — `ENOENT` em `CLAUDE.md`.

- [ ] **Step 3: Escrever `docs/definition-of-done.md`**

```markdown
---
title: Definition of Done
owner: "@dan"
trigger: >
  Quando um item passa a ser exigido para considerar trabalho pronto, ou deixa
  de ser — e toda vez que algo foi dado como pronto faltando um passo desta lista.
last-reviewed: 2026-08-25
---

# Definition of Done

Uma mudança está pronta quando todas as caixas abaixo estão marcadas. Cada item
diz **o que o verifica**: um check, um hook, ou uma pessoa. Item que ninguém
verifica não pertence a esta lista — vira intenção, e intenção não é definição.

- [ ] O comportamento novo tem requisito com ID, escrito **antes** do código — verificação: `CI-1` (estrutura) e humana (a ordem).
- [ ] Toda regra `active` é citada por ao menos um teste — verificação: `CI-3`.
- [ ] Todo ID citado resolve para um item existente e não retirado — verificação: `CI-2`.
- [ ] A decisão que não era óbvia virou ADR, e a lacuna que apareceu virou `DA-nnnn` — verificação: humana (`HK-3` intercepta a aceitação).
- [ ] O atalho consciente virou `TDR-nnnn` com gatilho de pagamento observável — verificação: humana.
- [ ] O doc dono de todo caminho vigiado tocado pela mudança está no mesmo commit — verificação: `HK-4` lembra, `HK-5` pergunta.
- [ ] Nenhum item congelado foi editado no corpo — verificação: `HK-1`.
- [ ] A mensagem de commit cita o ID afetado — verificação: humana.
- [ ] `npm test`, `npm run typecheck` e `living-docs validate` passam no container — verificação: `CI-1`, `CI-2` e `CI-3`, rodados pelo workflow do repositório.

## O que esta lista não é

Não é checklist de revisão de código, e não mede volume: nada aqui pede "documentar
o que foi feito". O que ela pede é que a **regra** e a **decisão** existam onde
alguém as encontre depois.
```

- [ ] **Step 4: Escrever `CONTRIBUTING.md`**

```markdown
---
title: Como se contribui aqui
owner: "@dan"
trigger: >
  Quando muda como se trabalha aqui — e toda vez que uma pessoa ou um agente
  errou por falta de contexto que caberia nesta página.
last-reviewed: 2026-08-25
---

# Como se contribui

Este repositório é o toolkit de documentação viva e é também o primeiro
consumidor dele. Tudo que ele exige de um projeto, ele cumpre.

## O ambiente

Nada roda no host além de Docker (`RNF-0002`). O container é a única forma
suportada de executar qualquer coisa:

```bash
docker compose up -d
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Se um comando pede `node`, `npm` ou `npx` fora do container, ele está errado —
não o ambiente.

## O ciclo

1. **A regra antes do código.** Comportamento novo começa por um requisito com
   ID em `docs/requirements/`. Se a regra não existe e ninguém sabe qual é, o
   resultado é uma `DA-nnnn` em `docs/open-decisions.md` e a implementação
   **para** — inventar a regra é o erro que este repositório existe para evitar.
2. **Teste antes da implementação**, citando o ID do requisito que ele cobre. É
   a citação que `CI-3` procura; teste sem ID deixa a regra descoberta.
3. **Implementação mínima.** O que não tem requisito não é escopo.
4. **Commit citando o ID afetado** — é o que torna `git log` navegável por regra.
5. **A Definition of Done** (`docs/definition-of-done.md`) diz quando acabou.

## Onde a verdade mora

| Pergunta | Artefato |
| --- | --- |
| O que o toolkit deve ser | `LIVING-DOCUMENTATION-TOOLKIT.md` |
| Qual é a regra de X | `docs/requirements/` |
| Por que foi feito assim | `docs/decisions/adr/` |
| O que ainda não foi decidido | `docs/open-decisions.md` |
| O que se aceitou dever | `docs/decisions/debt/` |
| Quem é dono de cada caminho | `docs/.ownership.yml` e `CODEOWNERS` |
| Quando está pronto | `docs/definition-of-done.md` |

Nenhuma dessas respostas é copiada para outro lugar. Duplicata apodrece, e a
versão velha ganha da nova por repetição.

## Idioma

Identificadores, nomes de arquivo e IDs em inglês/neutro; prosa em português.
Mensagem de commit em português, no formato `tipo(ID): assunto`.

## Quando um agente erra por falta de contexto

Isso não é acidente, é sintoma: falta uma linha em algum documento. A correção é
acrescentar essa linha — em `CLAUDE.md` se for política ou índice, no artefato
dono se for regra. A skill `working-agreements-keeper` é dona desse loop.
```

- [ ] **Step 5: Escrever `CLAUDE.md`**

Máximo 60 linhas — o teste do Step 1 reprova acima disso.

```markdown
# Contrato do agente — living-docs-toolkit

Índice e política. **Nenhuma afirmação factual mora aqui**: cada uma vive no
artefato dono e é lida de lá (`RN-0010`).

## Antes de mexer em qualquer coisa

- A spec do toolkit é `LIVING-DOCUMENTATION-TOOLKIT.md`. Ela manda.
- O mapa de propriedade é `docs/.ownership.yml`. Nenhum caminho de documento se
  adivinha: lê-se de lá.
- Como se trabalha aqui: `CONTRIBUTING.md`. Quando algo está pronto:
  `docs/definition-of-done.md`.

## Política

- **Nada roda no host além de Docker.** Todo comando vai por
  `docker compose exec toolkit …` ou `./bin/living-docs`.
- **A regra vem antes do código.** O que o sistema deve fazer está em
  `docs/requirements/`; se a regra não existe, abra uma `DA` (`/open-decision`)
  e pare. Não invente a regra que falta.
- **Você não aceita decisão.** Skill escreve `draft`/`open`; promover é ato
  humano — `HK-3` pergunta, e a resposta não é sua.
- **Você não corrige item congelado.** ADR aceito ganha `superseded` e um ADR
  novo — `HK-1` bloqueia o resto.
- **Documento e código viajam juntos.** Caminho vigiado em `watches` tem doc
  dono; `HK-4` lembra depois da edição e `HK-5` pergunta antes do commit.
- **Atalho consciente vira `TDR`** (`/debt`) com gatilho de pagamento
  observável — não vira `TODO` órfão.

## Comandos

`/adr`, `/open-decision`, `/debt`, `/docs-setup`. As skills
`decision-recorder`, `requirements-keeper`, `working-agreements-keeper` e
`living-docs-bootstrap` são selecionadas pela `description`; não é preciso
invocá-las pelo nome.

## O que nunca fazer

- Escrever documento que narra o código.
- Criar artefato de documentação fora de `docs/` ou fora do controle de versão.
- Bumpar `last-reviewed` em massa.
- Copiar para cá o conteúdo de qualquer artefato acima.
```

- [ ] **Step 6: Escrever `plugin/skills/working-agreements-keeper/SKILL.md`**

```markdown
---
name: working-agreements-keeper
description: >
  Use quando um agente ou uma pessoa errou por falta de contexto — "ninguém me
  disse que era assim", "isso não estava escrito em lugar nenhum", "achei que
  podia rodar direto", "como é que se faz isso aqui?", "quando é que isso está
  pronto?" — e sempre que o processo de trabalho mudar: comando novo, passo
  obrigatório novo, regra de commit, política sobre o que agente pode ou não
  fazer sozinho. Também quando o contrato do agente (CLAUDE.md/AGENTS.md)
  estiver repetindo conteúdo que pertence a outro documento.
---

# working-agreements-keeper — dono de como se trabalha aqui

## Overview

Três artefatos respondem "como se trabalha neste repositório": `CONTRIBUTING.md`
(o processo), `docs/definition-of-done.md` (quando acabou) e o contrato do
agente (`CLAUDE.md` ou `AGENTS.md` — índice e política).

O segundo gatilho desta skill é o melhor do catálogo: **toda vez que alguém erra
por falta de contexto**, falta uma linha em um destes três. É isso que torna o
documento auto-corretivo em vez de decorativo.

Caminhos e donos vêm de `docs/.ownership.yml` e do `CODEOWNERS`; não assuma.

## Do que você é dono

| Artefato | O que é |
| --- | --- |
| `CONTRIBUTING.md` | O processo: ambiente, ciclo, idioma, onde a verdade mora |
| `docs/definition-of-done.md` | A lista do que precisa estar feito, com a verificação de cada item |
| `CLAUDE.md` / `AGENTS.md` | Contrato do agente: índice e política, nunca conteúdo |

As sementes estão em `templates/contributing.md`,
`templates/definition-of-done.md` e `templates/agent-contract.md`. Não reproduza
o conteúdo delas aqui.

## Quando usar / quando não

**Use** quando o processo mudar, e quando um erro por falta de contexto
acontecer — a correção é uma linha nova, e ela tem uma de duas formas: *onde
está a verdade* ou *o que nunca fazer*.

**Não use** para registrar regra de negócio (é `requirements-keeper`), decisão
técnica (é `decision-recorder`) ou o que o linter já pega — configuração de
ferramenta não é documento.

**O custo de usar à toa:** cada linha acrescentada é lida em toda sessão. Uma
lista que cresce sem parar é lida por ninguém, e "se ninguém lê, não está vivo".

## Procedimento

1. **Leia `docs/.ownership.yml`** e confirme quais dos três artefatos existem e
   onde. Se nenhum existir, rode `/docs-setup` com o estágio `small-team`.
2. **Classifique o que você tem em mãos**: processo → `CONTRIBUTING.md`;
   condição de pronto → Definition of Done; política ou índice para agente →
   contrato do agente.
3. **Procure a linha que já cobre isso.** Erro repetido costuma ser linha
   existente mal colocada, não linha faltando.
4. **Escreva uma linha, não um parágrafo.** Forma: *onde está a verdade* ("a
   regra de X mora em `docs/requirements/rules.md`") ou *o que nunca fazer*
   ("nunca rode `npm` fora do container").
5. **Item novo na DoD nomeia sua verificação**: um `CI-n`, um `HK-n`, ou
   explicitamente "humana". Item sem verificação não entra.
6. **No contrato do agente, linke — não copie.** Se a frase que você ia escrever
   é uma afirmação factual, ela pertence ao artefato dono; aqui fica o link.
7. **Se a mudança de processo alterou o vínculo código→doc**, atualize `watches`
   no `.ownership.yml`: é ele que `HK-4` e `HK-5` leem.

## Fronteiras

| É seu | Não é seu |
| --- | --- |
| Como se trabalha, e quando algo está pronto | A regra de negócio que o CONTRIBUTING referencia |
| Transformar erro por falta de contexto em linha nova | Duplicar conteúdo de outro artefato |
| A política sobre o que um agente pode fazer sozinho | Aceitar a decisão em si (é ato humano, `HK-3`) |
| O item da DoD e a verificação que o cobre | Escrever o check que verifica (é `CI-n`, na engine) |

## Checklist

- [ ] Cada afirmação factual do contrato do agente é um link para o artefato dono, não uma cópia — verificação: `CI-7` na Fase 7; até lá, humana.
- [ ] Todo item novo da DoD nomeia o que o verifica: `CI-n`, `HK-n`, ou "humana" explícita — verificação: humana.
- [ ] O caminho vigiado que a mudança criou está em `watches`, com doc dono — verificação: `HK-4` e `HK-5`.
- [ ] Nenhum dos três artefatos ganhou conteúdo que pertence a `docs/requirements/` ou a `docs/decisions/` — verificação: humana.
- [ ] O `trigger` do artefato alterado continua nomeando evento, não cadência — verificação: `CI-1`.
- [ ] A alteração nasceu de um erro observado ou de uma mudança real de processo, não de vontade de documentar — verificação: humana.
- [ ] `last-reviewed` foi atualizado só nos arquivos que mudaram de verdade — verificação: humana (bump em massa é anti-requisito da spec §13).
```

- [ ] **Step 7: Acrescentar as asserções de `SK-6` a `test/plugin/authoring.test.ts`**

Ao final do arquivo, no mesmo estilo das que já existem para `decision-recorder` e `requirements-keeper`:

```typescript
test('working-agreements-keeper: a description nomeia o erro por falta de contexto', () => {
  const description = String(parseFrontmatter(skillSource('working-agreements-keeper'))?.data.description ?? '');
  assert.match(description, /Use quando/i);
  for (const sintoma of ['falta de contexto', 'não estava escrito', 'pronto']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`);
  }
});

test('working-agreements-keeper não duplica o conteúdo dos acordos que governa', () => {
  const source = skillSource('working-agreements-keeper');
  assert.match(source, /templates\/definition-of-done\.md/, 'ela deve apontar para o template, não copiá-lo');
  assert.doesNotMatch(source, /^- \[ \] `npm test`/m, 'a skill não deve conter a DoD');
});
```

- [ ] **Step 8: Atualizar o `CODEOWNERS`**

```
# Espelha o campo `owner` de docs/.ownership.yml. Um artefato, um dono.
docs/decisions/adr/    @dan
docs/open-decisions.md    @dan
docs/decisions/debt/    @dan
docs/requirements/    @dan
CONTRIBUTING.md    @dan
docs/definition-of-done.md    @dan
CLAUDE.md    @dan
docs/.ownership.yml    @dan
```

- [ ] **Step 9: Rodar tudo**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```
Esperado: PASS e `exit=0`. A varredura de `test/plugin/authoring.test.ts` agora roda sobre quatro skills; se ela reclamar de seção fora de ordem ou de item de checklist sem verificação, o erro está no `SKILL.md`, não no teste.

- [ ] **Step 10: Commit**

```bash
git add plugin/skills/working-agreements-keeper CONTRIBUTING.md CLAUDE.md docs/definition-of-done.md CODEOWNERS test/docs/agent-contract.test.ts test/plugin/authoring.test.ts
git commit -m "feat(SK-6, RN-0010): working-agreements-keeper, DoD e contrato do agente"
```

---

### Task 8: `init --stage small-team` instala os acordos de trabalho

**Objetivo:** o que este repositório acabou de ganhar à mão, um consumidor ganha por comando. E o `init` para de prometer a Fase 3 como "não instalada".

**Files:**
- Create: `templates/contributing.md`, `templates/definition-of-done.md`, `templates/agent-contract.md`
- Modify: `templates/CODEOWNERS`, `templates/ownership.yml`
- Modify: `src/cli/init.ts`
- Test: `test/cli/init.test.ts`

**Interfaces:**
- Consome: `template()`, `writeIfAbsent()`, `InitResult` e `Stage` de `src/cli/init.ts` (já existem).
- Produz: nada para tasks seguintes; é folha.

**Requisitos:**
- Estágio `solo` continua sem instalar nada disso. A tabela da spec §10 põe a Fase 3 em "time pequeno / produto real".
- `AGENTS.md` existente é **adotado** (entra em `result.adopted`, e nenhum `CLAUDE.md` nasce ao lado). Qualquer um dos três já escrito é mantido intacto — `RF-0002` continua valendo.
- `NOT_INSTALLED['small-team']` perde a linha da Fase 3 e mantém a da Fase 4. Prometer honestamente o que falta é `RF-0003`.
- `templates/ownership.yml` passa a trazer `watches` **comentado com exemplo e vazio de verdade**: o `init` não inventa vínculo. Um `watches` chutado ensina a ignorar o lembrete no primeiro dia.
- Os templates são sementes parametrizadas por `{{OWNER}}` e `{{TODAY}}` — não cópias literais dos arquivos deste repositório, que falam do toolkit.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `test/cli/init.test.ts`:

```typescript
test('RF-0004: small-team instala os acordos de trabalho', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' });
    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md']) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir`);
      assert.ok(result.created.includes(path), `${path} deveria constar como criado`);
    }
    assert.match(readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8'), /@time/);
  });
});

test('RF-0004: solo não instala acordo de trabalho nenhum', () => {
  withTempRepo({}, (root) => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo' });
    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md']) {
      assert.equal(existsSync(join(root, path)), false, `${path} não deveria existir no estágio solo`);
    }
  });
});

test('RF-0004: AGENTS.md existente é adotado; nenhum CLAUDE.md paralelo nasce', () => {
  withTempRepo({ 'AGENTS.md': '# contrato antigo\n' }, (root) => {
    const result = runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' });
    assert.equal(existsSync(join(root, 'CLAUDE.md')), false);
    assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), '# contrato antigo\n');
    assert.ok(result.adopted.some((entry) => entry.path === 'AGENTS.md'));
  });
});

test('RF-0004: acordo já escrito não é reescrito na segunda execução', () => {
  withTempRepo({ 'CONTRIBUTING.md': '# do jeito deles\n' }, (root) => {
    const options = { owner: '@time', dryRun: false, stage: 'small-team' as const };
    runInit(root, options);
    const segunda = runInit(root, options);
    assert.equal(readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8'), '# do jeito deles\n');
    assert.ok(segunda.skipped.includes('CONTRIBUTING.md'));
    assert.deepEqual(segunda.created, []);
  });
});

test('RF-0003: small-team não promete mais a Fase 3 como pendente', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' });
    assert.equal(result.notInstalled.some((item) => /Fase 3/.test(item)), false);
    assert.ok(result.notInstalled.some((item) => /Fase 4/.test(item)));
  });
});

test('o init não inventa `watches` — o vínculo código→doc é ato humano', () => {
  withTempRepo({}, (root) => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' });
    const config = loadOwnership(root);
    assert.deepEqual(config.watches, []);
  });
});
```

Se `loadOwnership`, `readFileSync` ou `existsSync` ainda não estiverem importados no arquivo, acrescente os imports.

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts
```
Esperado: FAIL — `CONTRIBUTING.md deveria existir`.

- [ ] **Step 3: Escrever os três templates**

`templates/definition-of-done.md`:

```markdown
---
title: Definition of Done
owner: "{{OWNER}}"
trigger: >
  Quando um item passa a ser exigido para considerar trabalho pronto, ou deixa
  de ser — e toda vez que algo foi dado como pronto faltando um passo desta lista.
last-reviewed: {{TODAY}}
---

# Definition of Done

Uma mudança está pronta quando todas as caixas abaixo estão marcadas. Cada item
diz **o que o verifica**: um check, um hook, ou uma pessoa. Item que ninguém
verifica não pertence a esta lista.

- [ ] O comportamento novo tem requisito com ID, escrito antes do código — verificação: `CI-1` e humana.
- [ ] Toda regra `active` é citada por ao menos um teste — verificação: `CI-3`.
- [ ] Todo ID citado resolve para um item existente e não retirado — verificação: `CI-2`.
- [ ] A decisão que não era óbvia virou ADR; a lacuna virou `DA-nnnn` — verificação: humana (`HK-3` intercepta a aceitação).
- [ ] O atalho consciente virou `TDR-nnnn` com gatilho de pagamento observável — verificação: humana.
- [ ] O doc dono de todo caminho vigiado tocado está no mesmo commit — verificação: `HK-4` e `HK-5`.
- [ ] Nenhum item congelado teve o corpo editado — verificação: `HK-1`.
- [ ] A mensagem de commit cita o ID afetado — verificação: humana.

Acrescente aqui os passos do seu projeto (build, lint, deploy), **cada um com a
verificação que o cobre**. Item sem verificação vira intenção, e intenção não é
definição de pronto.
```

`templates/contributing.md`:

```markdown
---
title: Como se contribui aqui
owner: "{{OWNER}}"
trigger: >
  Quando muda como se trabalha aqui — e toda vez que uma pessoa ou um agente
  errou por falta de contexto que caberia nesta página.
last-reviewed: {{TODAY}}
---

# Como se contribui

> Semente criada por `living-docs init`. Substitua o que não for verdade neste
> projeto; apagar o que sobra é parte do trabalho.

## O ciclo

1. **A regra antes do código.** Comportamento novo começa por um requisito com
   ID em `docs/requirements/`. Se a regra não existe e ninguém sabe qual é, o
   resultado é uma `DA-nnnn` em `docs/open-decisions.md` e a implementação para.
2. **Teste citando o ID** do requisito que ele cobre — é a citação que `CI-3`
   procura.
3. **Implementação mínima.** O que não tem requisito não é escopo.
4. **Commit citando o ID afetado.**
5. **A Definition of Done** (`docs/definition-of-done.md`) diz quando acabou.

## Onde a verdade mora

| Pergunta | Artefato |
| --- | --- |
| Qual é a regra de X | `docs/requirements/` |
| Por que foi feito assim | `docs/decisions/adr/` |
| O que ainda não foi decidido | `docs/open-decisions.md` |
| O que se aceitou dever | `docs/decisions/debt/` |
| Quem é dono de cada caminho | `docs/.ownership.yml` e `CODEOWNERS` |
| Quando está pronto | `docs/definition-of-done.md` |

Nenhuma dessas respostas é copiada para outro lugar.

## Quando alguém erra por falta de contexto

Falta uma linha em algum destes documentos. A correção é acrescentá-la — no
contrato do agente se for política ou índice, no artefato dono se for regra.
```

`templates/agent-contract.md`:

```markdown
# Contrato do agente

Índice e política. **Nenhuma afirmação factual mora aqui**: cada uma vive no
artefato dono e é lida de lá.

## Antes de mexer em qualquer coisa

- O mapa de propriedade é `docs/.ownership.yml`. Nenhum caminho de documento se
  adivinha: lê-se de lá.
- Como se trabalha aqui: `CONTRIBUTING.md`. Quando algo está pronto:
  `docs/definition-of-done.md`.

## Política

- **A regra vem antes do código.** O que o sistema deve fazer está em
  `docs/requirements/`; se a regra não existe, abra uma `DA` (`/open-decision`)
  e pare. Não invente a regra que falta.
- **Você não aceita decisão.** Skill escreve `draft`/`open`; promover é ato
  humano — `HK-3` pergunta.
- **Você não corrige item congelado.** ADR aceito ganha `superseded` e um ADR
  novo — `HK-1` bloqueia o resto.
- **Documento e código viajam juntos.** Caminho vigiado em `watches` tem doc
  dono; `HK-4` lembra e `HK-5` pergunta.
- **Atalho consciente vira `TDR`** (`/debt`) com gatilho de pagamento observável.

## O que nunca fazer

- Escrever documento que narra o código.
- Criar artefato de documentação fora do controle de versão.
- Bumpar `last-reviewed` em massa.
- Copiar para cá o conteúdo de qualquer artefato acima.
```

- [ ] **Step 4: Atualizar `templates/CODEOWNERS` e `templates/ownership.yml`**

`templates/CODEOWNERS` — acrescente o marcador antes da última linha:

```
# Espelha o campo `owner` de docs/.ownership.yml. Um artefato, um dono.
{{ADR_PATH}}    {{OWNER}}
{{DA_PATH}}    {{OWNER}}
{{TDR_PATH}}    {{OWNER}}
{{REQUIREMENTS_CODEOWNERS}}{{AGREEMENTS_CODEOWNERS}}docs/.ownership.yml    {{OWNER}}
```

`templates/ownership.yml` — substitua o bloco de `watches`:

```yaml
generated: []

# Mecanismo 1: código → doc dono. HK-4 lembra depois da edição, HK-5 pergunta
# antes do commit, e na Fase 7 CI-7 verifica. Preencha com os caminhos do SEU
# código — o init não inventa vínculo, porque vínculo que ninguém reconhece
# ensina a ignorar o lembrete. Exemplo:
#
# watches:
#   - code: "src/domain/**"
#     doc: docs/requirements/rules.md
#     reason: "comportamento novo exige regra com ID antes do código"
watches: []

consumer-visible-paths: []
```

- [ ] **Step 5: Alterar `src/cli/init.ts`**

Depois de `REQUIREMENT_CITED_BY`, acrescente:

```typescript
/** Acordos de trabalho (SK-6), instalados a partir do estágio `small-team` (spec §10). */
const WORKING_AGREEMENTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'CONTRIBUTING.md', template: 'contributing.md' },
  { path: 'docs/definition-of-done.md', template: 'definition-of-done.md' },
]);
```

Troque `NOT_INSTALLED` por:

```typescript
/** O que este estágio pede e a Fase 4 é que vai entregar (spec §10). */
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': ['SK-1, SK-2, AG-2 (Fase 4) — não implementados nesta versão'],
});
```

Dentro de `runInit`, no bloco `if (options.stage !== 'solo')`, **depois** da escrita dos arquivos de requisito:

```typescript
    for (const agreement of WORKING_AGREEMENTS) {
      writeIfAbsent(root, agreement.path, template(agreement.template, values), options, result);
    }

    // O contrato do agente pode já existir com outro nome. Adotar, nunca duplicar
    // (RF-0002): dois contratos é a garantia de que um deles está errado.
    if (existsSync(join(root, 'AGENTS.md'))) {
      result.adopted.push({ idPrefix: 'contrato do agente', path: 'AGENTS.md' });
    } else {
      writeIfAbsent(root, 'CLAUDE.md', template('agent-contract.md', values), options, result);
    }
```

E, em `values`, acrescente a chave nova:

```typescript
    AGREEMENTS_CODEOWNERS:
      options.stage === 'solo'
        ? ''
        : `CONTRIBUTING.md    ${options.owner}\ndocs/definition-of-done.md    ${options.owner}\nCLAUDE.md    ${options.owner}\n`,
```

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```
Esperado: PASS. Se um teste antigo de `init` quebrar por causa de `notInstalled`, ele estava afirmando que a Fase 3 não existia — atualize a asserção, é o ponto da task.

- [ ] **Step 7: Conferir o comando de ponta a ponta num repositório descartável**

```bash
docker compose exec toolkit sh -c 'rm -rf /tmp/demo && mkdir -p /tmp/demo && cd /tmp/demo && \
  LIVING_DOCS_REPO_ROOT=/tmp/demo node /opt/living-docs/src/cli/index.ts init --stage small-team --owner @time && \
  ls -1 && cat docs/.ownership.yml | tail -20'
```
Esperado: `CONTRIBUTING.md`, `CLAUDE.md`, `docs/` na listagem; `watches: []` com o bloco de comentário acima dele; a linha `não instalado  SK-1, SK-2, AG-2 (Fase 4)…` na saída, e **nenhuma** menção à Fase 3.

- [ ] **Step 8: Commit**

```bash
git add templates src/cli/init.ts test/cli/init.test.ts
git commit -m "feat(RF-0004): init --stage small-team instala os acordos de trabalho"
```

---

### Task 9: Dogfooding — `watches` preenchido, `DA-0002`, critério 5 e a promoção humana

**Objetivo:** a fase só está entregue quando o próprio repositório vive sob ela. Aqui `watches` deixa de ser `[]`, o critério de aceite 5 ganha teste, a lacuna que a fase descobriu vira `DA-0002`, e os requisitos da Task 1 são promovidos — por uma pessoa.

**Files:**
- Modify: `docs/.ownership.yml` (preenche `watches`)
- Modify: `docs/open-decisions.md` (acrescenta `DA-0002`)
- Modify: `test/acceptance/spec-criteria.test.ts` (critério 5)
- Modify: `README.md`, `plugin/.claude-plugin/plugin.json`
- Modify: `docs/requirements/rules.md`, `docs/requirements/functional.md` (promoção `draft → active`)

**Interfaces:**
- Consome: tudo que as Tasks 2 a 8 produziram.
- Produz: o repositório validando a si mesmo com a Fase 3 ativa.

**Requisitos:**
- Cada `watch` deste repositório aponta para um doc que **existe** e tem motivo escrito. Vínculo sem motivo é ruído — o `reason` é o que aparece na mensagem do hook.
- `DA-0002` nasce `open` e **não** é resolvida aqui. Resolver exige um ADR, e o ADR exige a decisão, que é da Fase 7 (`CI-7`).
- A promoção dos quatro requisitos para `active` é o **último** passo, e é humana. `CI-3` exige citação para requisito `active`; as citações já existem desde as Tasks 2 a 8.
- O README diz qual metade do critério 5 está entregue. Não escreva que o CI sinaliza pelo `watches`: ele ainda não sinaliza.

- [ ] **Step 1: Preencher `watches` em `docs/.ownership.yml`**

Substitua o bloco `watches: []`:

```yaml
# Mecanismo 1: código → doc dono. HK-4 lembra depois da edição, HK-5 pergunta
# antes do commit. Na Fase 7, CI-7 lê daqui também.
watches:
  - code: "src/checks/**"
    doc: docs/requirements/rules.md
    reason: "check é regra executável — a RN vem antes, e é ela que o check verifica"

  - code: "src/hooks/**"
    doc: docs/requirements/rules.md
    reason: "hook bloqueia ou pergunta em nome de uma regra; sem RN citada, o bloqueio não tem origem"

  - code: "src/cli/**"
    doc: docs/requirements/functional.md
    reason: "o que o comando faz de observável é RF, não detalhe de implementação"

  - code: "src/core/**"
    doc: docs/requirements/non-functional.md
    reason: "as duas raízes são propriedade do sistema (ADR-0003), não comportamento de comando"

  - code: "plugin/skills/**"
    doc: CONTRIBUTING.md
    reason: "skill nova ou alterada muda como se trabalha aqui"
```

- [ ] **Step 2: Abrir `DA-0002`**

A Task 2 descobriu a lacuna: `CONTRIBUTING.md`, a DoD e o contrato do agente são docs donos legítimos e **não cabem em `artifacts:`**, que exige `id-prefix` de 2 a 4 letras maiúsculas. Hoje isso só custa uma linha a menos na mensagem do hook; na Fase 7, `CI-7` vai querer exigir dono para todo artefato e vai tropeçar nisso.

Acrescente a linha em `docs/open-decisions.md`:

```markdown
| DA-0002 | Como declarar no `.ownership.yml` um artefato sem família de IDs (CONTRIBUTING, Definition of Done, contrato do agente), para que `CI-7` exija dono sem inventar prefixo | open | — | 2026-08-25 |
```

**Não resolva.** Enquanto ela está aberta, o assunto não tem regra — e é `CI-7`, na Fase 7, que vai precisar dela.

- [ ] **Step 3: Escrever o teste do critério de aceite 5**

Em `test/acceptance/spec-criteria.test.ts`, acrescente ao final (e importe `decideHk4`, `decideHk5` e `GitRunner`):

```typescript
const NUL = String.fromCharCode(0);

const WATCHED_CONFIG = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "comportamento novo exige regra com ID antes do código"
`;

test('critério 5: alterar caminho vigiado sem tocar o doc dono é lembrado e perguntado', () => {
  withTempRepo({ [OWNERSHIP_PATH]: WATCHED_CONFIG }, (root) => {
    const env = { root, hostRoots: [root] };

    // Metade 1 — logo depois da edição, HK-4 lembra.
    const lembrete = decideHk4({ tool_name: 'Edit', tool_input: { file_path: 'src/domain/reembolso.ts' } }, env);
    assert.equal(lembrete.action, 'remind');

    // Metade 2 — na hora do commit, HK-5 lista os pendentes e pergunta.
    const staged: GitRunner = () => `src/domain/reembolso.ts${NUL}`;
    const pergunta = decideHk5({ tool_name: 'Bash', tool_input: { command: 'git commit -m "feat: reembolso"' } }, env, staged);
    assert.equal(pergunta.action, 'ask');
    assert.match(pergunta.action === 'ask' ? pergunta.reason : '', /docs\/requirements\/rules\.md/);

    // E com o doc no mesmo commit, o caminho fica livre.
    const comDoc: GitRunner = () => `src/domain/reembolso.ts${NUL}docs/requirements/rules.md${NUL}`;
    const livre = decideHk5({ tool_name: 'Bash', tool_input: { command: 'git commit -m "feat: reembolso"' } }, env, comDoc);
    assert.equal(livre.action, 'allow');
  });
});
```

- [ ] **Step 4: Rodar tudo, incluindo o próprio repositório**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```
Esperado: PASS e `exit=0`. Os requisitos da Task 1 ainda estão em `draft`, então `CI-3` não os cobra.

- [ ] **Step 5: Verificar os hooks com o `watches` real**

Repita os dois comandos do Step 6 da Task 6. Agora eles **devem** produzir JSON:

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/checks/ci1-structure.ts"}}' \
  | docker compose exec -T -e LIVING_DOCS_REPO_ROOT=/workspace toolkit \
    node /opt/living-docs/src/hooks/hk4-watch-reminder.ts
```
Esperado: JSON com `"hookEventName":"PostToolUse"`, `additionalContext` citando `docs/requirements/rules.md` e `requirements-keeper`, e **sem** `permissionDecision`.

```bash
docker compose exec -w /workspace toolkit git add -N . >/dev/null 2>&1 || true
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m teste"}}' \
  | docker compose exec -T -e LIVING_DOCS_REPO_ROOT=/workspace toolkit \
    node /opt/living-docs/src/hooks/hk5-commit-guard.ts
```
Esperado: ou JSON com `"permissionDecision":"ask"` listando os docs pendentes, ou saída vazia se o índice estiver limpo. Se sair `deny` em qualquer um dos dois, pare: é violação de `RN-0009` e o código precisa voltar à Task 4/5.

- [ ] **Step 6: Atualizar README e a descrição do plugin**

Em `README.md`, três trechos:

1. O parágrafo de abertura passa a `Fases 0–3`, citando `HK-4`/`HK-5` e `SK-6`.
2. A seção "Plugin do Claude Code" ganha as duas linhas novas:

```markdown
`plugin/` traz as skills `decision-recorder` (`/adr`, `/open-decision`, `/debt`),
`living-docs-bootstrap` (`/docs-setup`), `requirements-keeper` e
`working-agreements-keeper` (as duas sem comando: são selecionadas pela
`description`), e os hooks `HK-1` (bloqueia editar item congelado), `HK-3`
(promoção de estado exige ato humano), `HK-4` (lembra o doc dono depois de
editar caminho vigiado) e `HK-5` (pergunta antes do commit que leva código sem
o doc). `HK-4` e `HK-5` nunca negam: lembram e perguntam.
```

3. A seção "O que está fora" perde `HK-4`, `HK-5` e `SK-6`, e ganha a honestidade sobre o critério 5:

```markdown
`SK-1`, `SK-2`, `SK-5`, `SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-6`, `HK-7`,
`CI-4`–`CI-8`, `CM-4`, `CM-5`, `CM-7` — Fases 4 a 7 da spec.

Do critério de aceite 5 da spec §12, a Fase 3 entrega a metade do hook: o commit
que leva caminho vigiado sem o doc dono é perguntado. A outra metade — "e o CI
sinaliza pelo `watches`" — é `CI-7`, Fase 7.
```

Em `plugin/.claude-plugin/plugin.json`, a descrição passa a:

```json
  "description": "Documentação viva: ADR, Open Decisions, Debt Register, requisitos com ID estável e acordos de trabalho — com dono, gatilho e enforcement. Fases 0–3.",
```

- [ ] **Step 7: Commit do dogfooding**

```bash
git add docs/.ownership.yml docs/open-decisions.md test/acceptance/spec-criteria.test.ts README.md plugin/.claude-plugin/plugin.json
git commit -m "feat(DA-0002, RN-0008): watches preenchido e critério 5 coberto por teste"
```

> A partir daqui, `HK-5` passa a perguntar nos commits deste repositório que tocarem `src/**` sem o doc dono. É o mecanismo funcionando. Responda honestamente: se a mudança tem regra, atualize `docs/requirements/`; se não tem, essa é a decisão de uma pessoa.

- [ ] **Step 8: PARAR e pedir a promoção dos requisitos**

Os quatro requisitos da Task 1 estão em `draft` e já são citados por teste. Promovê-los é `draft → active`: ato humano (`RN-0005`), e `HK-3` devolve `ask`.

Diga em uma frase o que está sendo pedido — "`RN-0008`, `RN-0009`, `RN-0010` e `RF-0004` estão escritos, implementados e cobertos por teste; falta aceitá-los" — e **espere**. Não edite `status:` por conta própria.

Depois de aceito por uma pessoa, troque `- **status:** draft` por `- **status:** active` nas quatro seções e rode:

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```
Esperado: `exit=0`. Se `CI-3` acusar requisito `active` sem citação, o ID não aparece em nenhum arquivo sob `test/**` (ou `src/**`, para `RN`) — acrescente a citação ao teste que já cobre o comportamento, em vez de criar um teste só para satisfazer o check.

- [ ] **Step 9: Commit final**

```bash
git add docs/requirements
git commit -m "docs(RN-0008..RN-0010, RF-0004): requisitos da Fase 3 promovidos por ato humano"
```

---

## Cobertura da spec

| Peça da spec | Onde | Estado ao fim do plano |
| --- | --- | --- |
| `SK-6` `working-agreements-keeper` | Task 7 | Entregue, com os três artefatos e a semente para consumidores (Task 8) |
| `HK-4` `PostToolUse` / `additionalContext` | Tasks 4 e 6 | Entregue |
| `HK-5` `PreToolUse` / `Bash` / `ask` | Tasks 5 e 6 | Entregue |
| `watches` deixa de ser `[]` | Tasks 2 e 9 | Entregue, com engine reutilizável por `CI-7` |
| Definition of Done executável, fonte de `CI-7` | Task 7 | Escrita; o check que a lê é Fase 7 |
| Critério de aceite 5 | Task 9 | Metade do hook entregue e testada; a metade do CI é `CI-7`, Fase 7 (declarado no README) |
| Critério de aceite 9 | Tasks 7 e 9 | Contrato do agente existe e é índice; a verificação automática de duplicação é `CI-7` |
| Estágio `small-team` da spec §10 | Task 8 | Passa a instalar as Fases 2 **e** 3; a Fase 4 continua declarada como não instalada |

## O que este plano deliberadamente não faz

- **Não cria `CI-7`.** Ele precisa de detecção de duplicação textual, que é o único check da spec com risco real de falso positivo — e o backlog pede um ADR sobre o limiar antes de implementá-lo.
- **Não cria `src/git/diff.ts`.** `HK-5` precisa do índice, não do diff contra a base do PR. O diff é `CI-6` (Fase 6) e traz junto a pergunta "de onde vem a base fora do CI", que é decisão por ADR.
- **Não toca em `consumer-visible-paths` nem em `consumer-visible: true`.** Os dois só têm consumidor a partir de `CI-6`.
- **Não resolve `DA-0002`.** Ela nasce aqui porque a fase a descobriu; resolvê-la é trabalho da Fase 7, com ADR.
- **Não paga `TDR-0001`.** O gatilho de pagamento continua sendo "o primeiro PR que revogar um requisito", e este não é.

## Próximo plano

`docs/superpowers/plans/BACKLOG-fases-3-7.md`, seção "Fase 4" — `SK-2`
glossary-keeper (`CM-4` `/term`), `SK-1` charter-keeper e `AG-2`
decision-adversary. Duas dependências a verificar antes de planejar: os estados
`banned`/`renamed` de termo na máquina de estados de `src/docs/schema.ts`, e o
formato de `agents/` num plugin do Claude Code — `AG-2` é o primeiro agent do
toolkit.
