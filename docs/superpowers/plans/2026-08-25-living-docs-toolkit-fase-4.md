# Fase 4 do toolkit de documentação viva — linguagem e intenção

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `SK-2` glossary-keeper (`docs/glossary.md`, `CM-4` `/term`),
`SK-1` charter-keeper (`docs/charter/constitution.md`, `docs/charter/vision.md`)
e `AG-2` decision-adversary — a Fase 4 da spec (§10), que fecha o conjunto do
estágio `small-team`.

**Architecture:** Nenhuma peça de engine nova. `SK-1`/`SK-2` são skills puras
(procedimento + julgamento semântico, spec §1), `AG-2` é o primeiro agent do
plugin (contexto isolado, sem `Edit`/`Write`), e a única mudança em código é
`src/cli/init.ts` passar a semear `docs/glossary.md` e `docs/charter/` no
estágio `small-team` — o mesmo padrão que `SK-6` já usa desde a Fase 3.
Glossary e Constitution/Vision ficam **fora** de `artifacts:` no
`.ownership.yml` — mesmo tratamento que `CONTRIBUTING.md` e a Definition of
Done já recebem —, decisão registrada em `ADR-0004` para não reabrir a cada
fase.

**Tech Stack:** TypeScript (Node, executado só em container — `RNF-0002`),
`node:test`, Claude Code plugin (`SKILL.md`, comando `.md`, agent `.md`).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §5 (`SK-1`, `SK-2`), §6 (`AG-2`),
§10 (Fase 4), §11 (convenções de autoria) —
`docs/superpowers/plans/BACKLOG-fases-3-7.md` (seção "Fase 4") traz o
levantamento que este plano resolve.

## Global Constraints

- Nada roda no host além de Docker — todo comando via
  `docker compose exec toolkit …` ou `./bin/living-docs` (`RNF-0002`).
- Identificadores, nomes de arquivo e IDs em inglês/neutro; prosa em
  português (spec §11).
- ID nunca reciclado — confira `docs/ids-retired.txt` antes de tomar um
  número novo (spec §2).
- Toda seção de requisito nasce `status: draft`; todo ADR novo nasce
  `status: draft`. Promover é ato humano (`RN-0005`) — `HK-3` intercepta.
- Mensagem de commit cita o ID afetado, formato `tipo(ID): assunto`
  (`CONTRIBUTING.md`).
- Nenhum check de CI novo nesta fase. A verificação de "um significado por
  termo" e "todo princípio tem enforcement nomeado" é da skill e de teste de
  dogfooding — não vira `CI-9` (backlog: "resista a inventar `CI-9` para
  medi-la").
- Glossary e Constitution/Vision **não** entram em `artifacts:` no
  `.ownership.yml` — decisão de `ADR-0004` (Task 1). `DA-0002` continua
  aberta; nenhuma task deste plano a resolve.

### `HK-5` vai perguntar — leia antes de commitar qualquer task

`docs/.ownership.yml` já tem `watches` preenchido desde a Fase 3, e duas
entradas atingem quase todo commit deste plano:

| Caminho vigiado | Doc dono exigido no mesmo commit | Tasks afetadas |
| --- | --- | --- |
| `src/cli/**` | `docs/requirements/functional.md` | 2 |
| `plugin/skills/**` | `CONTRIBUTING.md` | 4, 5, 6 |

`HK-5` **pergunta** (`ask`), nunca nega (`RN-0009`) — mas a pergunta chega, e
responder no escuro é o hábito que o hook existe para não ensinar. Cada task
afetada abaixo diz, no bloco **`HK-5`**, o que responder e por quê. Nas Tasks 4
e 5 a resposta é "sim, está junto": a linha correspondente do `CONTRIBUTING.md`
viaja no mesmo commit da skill, de propósito.

---

## Cobertura da spec

| Peça | Task |
| --- | --- |
| `SK-2` glossary-keeper | 4 |
| `docs/glossary.md` (formato / conteúdo real) | 2 / 3 |
| `CM-4` `/term` | 4 |
| `SK-1` charter-keeper | 5 |
| `docs/charter/constitution.md`, `docs/charter/vision.md` (formato / conteúdo real) | 2 / 3 |
| `AG-2` decision-adversary | 6 |
| `init --stage small-team` semeando os três arquivos | 2 |
| CODEOWNERS: dono de glossary e charter (semente / este repo) | 2 / 3 |
| `CONTRIBUTING.md` aponta os artefatos novos | 4, 5 |
| Índice (`CLAUDE.md`, `README.md`, `plugin.json`) | 7 |
| Dogfooding + promoção humana | 3, 8 |

A Fase 4 não fecha nenhum dos critérios de aceite **cenarizados** da spec §12
(1 a 9): a tabela `Fases` da spec §10 não amarra critério a fase, e quem faz
essa amarração — `docs/superpowers/plans/BACKLOG-fases-3-7.md` — só a registra
para as Fases 3 (critério 5, metade) e 5 (critério 6). Não há, portanto, teste
novo em `test/acceptance/spec-criteria.test.ts` nesta fase, diferente da Fase 3.

O que a Fase 4 toca é o critério **10** — "nenhuma peça do toolkit produz
documento que narre código" —, que é transversal e não tem cenário próprio. O
que o protege aqui é o julgamento na Task 3 (termo e princípio são verdade do
domínio, não descrição de função) e as `Fronteiras` das duas skills, não um
check.

---

### Task 1: A regra antes do código — `ADR-0004`, `RF-0005`, `RN-0011`

**Objetivo:** Antes de qualquer código, registrar a decisão sobre identidade
do termo do glossary (por que ele não ganha um `TRM-nnnn`) e os dois
requisitos que o resto do plano implementa — em `draft`, para promoção humana
no final (Task 8).

**Files:**
- Create: `docs/decisions/adr/ADR-0004-termo-do-glossary-identificado-pelo-nome.md`
- Modify: `docs/requirements/functional.md` (`RF-0005`)
- Modify: `docs/requirements/rules.md` (`RN-0011`)

**Interfaces:**
- Produz: os IDs `ADR-0004`, `RF-0005`, `RN-0011`, citados pelo código e
  pelos testes das Tasks 2–7.

**Requisitos:**
- Os três nascem em estado inicial da máquina (`draft`) — a promoção é a
  Task 8, e é humana (`RN-0005`).
- `ADR-0004` não resolve `DA-0002`. Ela continua `open` em
  `docs/open-decisions.md` — nenhuma edição nesse arquivo nesta task.

- [ ] **Step 1: Escrever `ADR-0004` em `draft`**

Crie `docs/decisions/adr/ADR-0004-termo-do-glossary-identificado-pelo-nome.md`:

```markdown
---
id: ADR-0004
title: Termo do glossary é identificado pelo nome, não por ID numerado
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-25
relates-to: [DA-0002, RN-0011]
supersedes: null
superseded-by: null
---

# ADR-0004 — Termo do glossary é identificado pelo nome, não por ID numerado

## Contexto

A Fase 4 (spec §10) entrega `SK-2` (`docs/glossary.md`) e `SK-1`
(`docs/charter/constitution.md`, `docs/charter/vision.md`). Os três são
artefatos com dono, mas nenhum tem uma família de IDs numerada como `ADR`,
`DA`, `TDR`, `RF`, `RNF` ou `RN` — a mesma categoria de `CONTRIBUTING.md`, da
Definition of Done e do contrato do agente, que a Fase 3 já tratou sem
declará-los em `artifacts:` no `.ownership.yml` (`DA-0002`, ainda aberta).

`docs/.ownership.yml` hoje exige `id-prefix` de 2 a 4 letras maiúsculas para
toda entrada de `artifacts:` (`src/config/ownership.ts`). Sem um prefixo, um
artefato não entra na lista — e sem entrar, `CI-1`/`CI-2`/`CI-3`
(`src/docs/collect.ts` varre só `config.artifacts`) não o processam.

A spec dá ao termo do glossary uma máquina de estados (`active → renamed(para
X) | banned`, §4) mas nunca lhe dá uma sintaxe de citação: o grafo de
rastreabilidade (§8) mostra "Glossary <──nomeia── RN, contrato, código" — o
glossary é **citado pelo nome**, nunca aparece do lado que resolve uma
citação `<PREFIXO>-<número>` (§8, `CI-2`). O formato de entrada que a spec
define (§5, `SK-2`) — `Termo | Definição | Nome no código | Não confundir com
| Fonte` — também não tem coluna de ID.

## Alternativas consideradas

**Inventar um prefixo (`TRM` para termo, `CST` para princípio da
Constitution) e declarar `docs/glossary.md`/`docs/charter/constitution.md`
em `artifacts:`.** Descartada: criaria uma segunda forma de identidade para
algo que a própria spec já identifica por outro eixo (o nome). Um `TRM-0001`
que ninguém cita — porque a citação real é `Invoice`, não o número — é
decoração que `CI-2` validaria e nenhum documento nunca escreveria.

**Resolver `DA-0002` agora**, generalizando `artifacts:` para aceitar entrada
sem `id-prefix` (um artefato "de índice", sem itens numerados). Descartada
nesta fase: `DA-0002` foi aberta pensando no requisito real que a motiva —
`CI-7` (ownership coverage, Fase 7) exigir dono para todo artefato sem
inventar prefixo. Resolvê-la agora, a partir de um único caso (o glossary),
arrisca uma generalização errada — desenhada para o que a Fase 4 precisa, não
para o que `CI-7` vai precisar depois.

**Manter `docs/glossary.md`, `docs/charter/constitution.md` e
`docs/charter/vision.md` fora de `artifacts:`**, com o mesmo tratamento que
`CONTRIBUTING.md` e a Definition of Done já recebem desde a Fase 3: dono via
CODEOWNERS, frontmatter no formato de container (`title`, `owner`, `trigger`,
`last-reviewed`), mas sem `CI-1`/`CI-2`/`CI-3` os processando. **Escolhida.**

## Decisão

Termo do glossary é identificado pelo seu nome — uma string única dentro de
`docs/glossary.md` — nunca por um ID numerado do tipo `<PREFIXO>-<número>`.
`docs/glossary.md`, `docs/charter/constitution.md` e `docs/charter/vision.md`
não entram em `artifacts:` no `.ownership.yml` nesta fase. `DA-0002` continua
aberta, sem ser resolvida por este ADR.

## Consequências

### O que se ganha

- Nenhuma mudança em `src/config/ownership.ts`, `src/docs/schema.ts` ou
  `src/docs/table.ts` — a engine da Fase 0–3 não precisa saber nada novo.
- O mesmo tratamento para os cinco artefatos sem família de ID
  (`CONTRIBUTING.md`, DoD, contrato do agente, glossary, Constitution/Vision)
  — um padrão só, não um por artefato.
- `DA-0002` permanece exatamente no escopo em que a Fase 3 a deixou: pré-
  condição de `CI-7`, Fase 7 — não um problema resolvido às pressas para
  destravar a Fase 4.

### O que se aceita perder

- `CI-1` não valida a estrutura de frontmatter de nenhum dos três arquivos —
  a mesma lacuna que já existe para `CONTRIBUTING.md` e a DoD.
- Se `watches` algum dia apontar para `docs/glossary.md` ou
  `docs/charter/constitution.md`, `HK-4`/`HK-5` lembram do doc dono mas sem
  nomear a skill (`findArtifactRule` não encontra regra — `skill: null`).
- A checagem "um termo, um significado" e "todo princípio tem enforcement
  nomeado" não tem check de CI genérico: fica inteiramente com a skill
  (`glossary-keeper`, `charter-keeper`) e, neste repositório, com um teste de
  dogfooding — não é um mecanismo que um projeto consumidor herda de graça.
```

- [ ] **Step 2: Acrescentar `RF-0005` em `draft`**

No final de `docs/requirements/functional.md`, depois de `RF-0004`:

```markdown

## RF-0005 — `init --stage small-team` instala a moldura de linguagem e intenção

- **status:** draft
- **relates-to:** RF-0004
- **fora de escopo:** o conteúdo real dos termos e princípios — a semente é o formato, não o vocabulário deste ou de outro projeto

No estágio `small-team`, `living-docs init` cria `docs/glossary.md`,
`docs/charter/constitution.md` e `docs/charter/vision.md` a partir dos
templates, com a mesma idempotência e a mesma política de adoção dos demais
artefatos: não recria o que existe, não reescreve conteúdo do usuário.
```

- [ ] **Step 3: Acrescentar `RN-0011` em `draft`**

No final de `docs/requirements/rules.md`, depois de `RN-0010`:

```markdown

## RN-0011 — Termo do glossary tem um significado só, identificado pelo nome

- **status:** draft
- **relates-to:** ADR-0004
- **fora de escopo:** a declaração de `docs/glossary.md` em `artifacts:` no `.ownership.yml` — fica em aberto por `DA-0002` (`ADR-0004` não a resolve)

Um termo do glossary é identificado pelo nome — não por um ID numerado do
tipo `<PREFIXO>-<número>` — e cobre exatamente um significado. Duas coisas
com o mesmo nome não são a mesma entrada: criam-se dois termos, e um deles é
`banned`, apontando o substituto. Divergência entre o nome no código e o
termo é bug a corrigir no código, não um segundo termo no glossary.
```

- [ ] **Step 4: Rodar validate e confirmar que o `draft` passa limpo**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Esperado: `exit=0`, e é o `draft` que compra isso: `RF-0005` e `RN-0011` ainda
não são `active`, então a regra 7 de `CI-3` (cobertura por citação) não as
cobra, e nenhum teste as menciona até as Tasks 2 e 3. `ADR-0004` também passa:
a regra 6 (`accepted` sem `relates-to`) só olha item aceito, e o artefato `ADR`
não declara `cited-by`.

`CI-2` **é** exercitado aqui, e é o que importa checar: as citações a
`DA-0002` e `RN-0011` dentro de `ADR-0004`, e a `ADR-0004` dentro de
`RN-0011`, precisam resolver. `ADR-0004` também fecha o buraco de sequência do
prefixo `ADR` (0001–0004). Menções como `CI-7` ou `SK-2` são ignoradas: o
padrão de citação exige 3 ou 4 dígitos (`src/ids/citations.ts`).

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0004-termo-do-glossary-identificado-pelo-nome.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0004, RF-0005, RN-0011): a regra da Fase 4 em draft"
```

---

### Task 2: `init --stage small-team` instala a moldura de linguagem e intenção

**Objetivo:** Implementar `RF-0005` — os templates de glossary/Constitution/
Vision e a mudança em `src/cli/init.ts` que os semeia no estágio
`small-team`, do mesmo jeito que `WORKING_AGREEMENTS` já faz para
`CONTRIBUTING.md`/DoD desde a Fase 3.

**Files:**
- Create: `templates/glossary.md`
- Create: `templates/constitution.md`
- Create: `templates/vision.md`
- Modify: `src/cli/init.ts`
- Modify: `test/cli/init.test.ts`

**Interfaces:**
- Consome: `template()`, `writeIfAbsent()`, `InitOptions`, `InitResult` já
  existentes em `src/cli/init.ts`.
- Produz: `docs/glossary.md`, `docs/charter/constitution.md`,
  `docs/charter/vision.md` no repositório validado, quando `--stage
  small-team`.

**Requisitos:**
- Idempotente: segunda execução não recria nem reescreve (mesmo contrato de
  `WORKING_AGREEMENTS`).
- `NOT_INSTALLED['small-team']` deixa de prometer a Fase 4 — depois desta
  task, `small-team` não promete mais nada pendente.
- O `CODEOWNERS` **semeado** ganha as duas linhas novas, via
  `AGREEMENTS_CODEOWNERS` (`templates/CODEOWNERS` já interpola a variável; o
  arquivo de template não muda). Isso vale só para repositório que ainda não
  tem `CODEOWNERS` — `writeIfAbsent` pula o que existe, e é por isso que o
  `CODEOWNERS` **deste** repositório é editado à mão na Task 3.

- [ ] **Step 1: Escrever o teste que falha (`test/cli/init.test.ts`)**

Adicione ao final do arquivo:

```typescript
test('RF-0005: small-team instala glossary e charter', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' });
    for (const path of ['docs/glossary.md', 'docs/charter/constitution.md', 'docs/charter/vision.md']) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir`);
      assert.ok(result.created.includes(path), `${path} deveria constar como criado`);
    }
    assert.match(readFileSync(join(root, 'docs/glossary.md'), 'utf8'), /@time/);
  });
});

test('RF-0005: solo não instala glossary nem charter', () => {
  withTempRepo({}, (root) => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo' });
    for (const path of ['docs/glossary.md', 'docs/charter/constitution.md', 'docs/charter/vision.md']) {
      assert.equal(existsSync(join(root, path)), false, `${path} não deveria existir no estágio solo`);
    }
  });
});

test('RF-0005: glossary já escrito não é reescrito na segunda execução', () => {
  withTempRepo({ 'docs/glossary.md': '# do jeito deles\n' }, (root) => {
    const options = { owner: '@time', dryRun: false, stage: 'small-team' as const };
    runInit(root, options);
    const segunda = runInit(root, options);
    assert.equal(readFileSync(join(root, 'docs/glossary.md'), 'utf8'), '# do jeito deles\n');
    assert.ok(segunda.skipped.includes('docs/glossary.md'));
  });
});

test('RF-0005: o CODEOWNERS semeado dá dono a glossary e charter', () => {
  withTempRepo({}, (root) => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' });
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8');
    assert.match(codeowners, /docs\/glossary\.md\s+@time/);
    assert.match(codeowners, /docs\/charter\/\s+@time/);
  });
});
```

Agora os dois testes de `RF-0003` que a Fase 4 invalida. **Substitua** o teste
antigo `'RF-0003: o resultado lista o que não foi instalado, em vez de fingir o
estágio completo'` (hoje na linha ~199) pelos dois abaixo. O primeiro afirma o
fato novo; o segundo preserva a metade de `RF-0003` que ficaria sem prova
nenhuma quando `NOT_INSTALLED['small-team']` esvaziar — "**e diz o que não
instalou**" precisa continuar exercitada num caminho em que há algo a dizer, ou
o requisito passa a ser provado por uma asserção de lista vazia:

```typescript
test('RF-0003: small-team não deixa nada de fora nesta versão — Fases 2, 3 e 4 completas', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    const result = runInit(root, SMALL_TEAM);
    assert.deepEqual(result.notInstalled, []);
  });
});

test('RF-0003: quando algo realmente fica de fora, o resultado diz o que é', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    runInit(root, OPTIONS); // solo: o .ownership.yml nasce sem RF/RNF/RN
    const file = join(root, OWNERSHIP_PATH);
    // A linha some inteira, não vira outra chave: `generated` é opcional no
    // parser, e uma chave estranha testaria o parser em vez da honestidade.
    // Sem a âncora, subir de estágio não adivinha onde declarar os requisitos.
    const sem = readFileSync(file, 'utf8').replace(/\ngenerated: \[\]\n/, '\n');
    assert.notEqual(sem, readFileSync(file, 'utf8'), 'a âncora precisa ter sido removida de fato');
    writeFileSync(file, sem, 'utf8');

    const result = runInit(root, { ...SMALL_TEAM, owner: OPTIONS.owner });
    assert.ok(
      result.notInstalled.some((item) => item.includes(OWNERSHIP_PATH)),
      `o que ficou de fora precisa ser nomeado — ${JSON.stringify(result.notInstalled)}`,
    );
  });
});
```

**Remova** o teste `'RF-0003: small-team não promete mais a Fase 3 como
pendente'` (hoje na linha ~257, logo depois de `'RF-0004: acordo já escrito não
é reescrito na segunda execução'`). Ele afirma
`assert.ok(result.notInstalled.some((item) => /Fase 4/.test(item)))` — falso a
partir desta task, porque `notInstalled` fica vazio. A garantia que ele dava
está no primeiro dos dois testes acima, agora sem a lacuna.

Não acrescente um terceiro teste afirmando `notInstalled` vazio: os dois acima
já cobrem os dois lados, e um clone só faz a suíte crescer sem cobrir nada
novo.

- [ ] **Step 2: Rodar os testes novos e confirmar que falham**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0005|RF-0003"
```

Esperado: FAIL nos quatro testes de `RF-0005` (`docs/glossary.md` não existe,
`existsSync` retorna `false`) e no `'RF-0003: small-team não deixa nada de
fora'` (`notInstalled` ainda promete a Fase 4). O
`'RF-0003: quando algo realmente fica de fora…'` já deve **passar** neste
ponto — ele testa `declareRequirements`, que não muda nesta task; é a rede que
segura a metade de `RF-0003` que o Step 6 vai desligar.

- [ ] **Step 3: Criar `templates/glossary.md`**

```markdown
---
title: Glossary
owner: "{{OWNER}}"
trigger: >
  Termo de domínio novo em código, spec ou conversa; termo com dois
  significados; renomeação de conceito.
last-reviewed: {{TODAY}}
---

# Glossary

> Semente criada por `living-docs init`. Cada termo tem um significado só —
> se o negócio usa a mesma palavra para duas coisas, criam-se dois termos e
> um deles é banido (`status: banned`) apontando o substituto. Substitua o
> exemplo pelo vocabulário real deste projeto; apagar o que sobra é parte do
> trabalho.

| Termo | Definição | Nome no código | Não confundir com | Fonte | Status |
| --- | --- | --- | --- | --- | --- |
| Termo exemplo | Substitua pela definição real | `nomeNoCodigo` | O que parece sinônimo mas não é | RN-nnnn | active |

<!-- Termos entram como linhas acima. Skill dona: glossary-keeper. -->
```

- [ ] **Step 4: Criar `templates/constitution.md`**

```markdown
---
title: Constitution
owner: "{{OWNER}}"
trigger: >
  Emenda deliberada — nunca como efeito colateral de outra tarefa.
last-reviewed: {{TODAY}}
version: 1
---

# Constitution

> Semente criada por `living-docs init`. Cada princípio precisa ser testável
> e nomear o que o verifica — formato `<princípio> — verificado por <hook |
> lint | teste | revisão | check>`. Princípio sem enforcement nomeado é
> slogan; a skill `charter-keeper` recusa e pede a versão verificável.
> Substitua o exemplo pelos princípios reais deste projeto.

## Princípios

1. Substitua por um princípio real deste projeto — verificado por <nomeie aqui>.

## Log de emendas

- {{TODAY}} — v1 — Criação inicial — humana.

<!-- Skill dona: charter-keeper. -->
```

- [ ] **Step 5: Criar `templates/vision.md`**

```markdown
---
title: Product Vision
owner: "{{OWNER}}"
trigger: >
  Mudança de estratégia de produto — nunca como efeito colateral de outra
  tarefa.
last-reviewed: {{TODAY}}
---

# Product Vision

> Semente criada por `living-docs init`. Responde só três perguntas — se a
> alteração não muda nenhuma das três, não é mudança de Vision.

**Que problema:** substitua pelo problema real que este produto resolve.

**Para quem:** substitua por quem sente esse problema.

**Métrica de sucesso:** substitua pela métrica que prova que o problema foi resolvido.

<!-- Skill dona: charter-keeper. -->
```

- [ ] **Step 6: Estender `src/cli/init.ts`**

Depois da declaração de `WORKING_AGREEMENTS` (linha ~50), acrescente:

```typescript
/** Linguagem e intenção (SK-1, SK-2), instalados a partir do estágio `small-team` (spec §10, Fase 4). */
const LANGUAGE_AND_INTENT: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/glossary.md', template: 'glossary.md' },
  { path: 'docs/charter/constitution.md', template: 'constitution.md' },
  { path: 'docs/charter/vision.md', template: 'vision.md' },
]);
```

Troque a constante `NOT_INSTALLED` (ela deixa de prometer a Fase 4):

```typescript
/** O que este estágio pede. Vazio: `small-team` cobre as Fases 2, 3 e 4 por completo nesta versão. */
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
});
```

No objeto `values` dentro de `runInit`, troque o valor de `AGREEMENTS_CODEOWNERS`:

```typescript
    AGREEMENTS_CODEOWNERS:
      options.stage === 'solo'
        ? ''
        : `CONTRIBUTING.md    ${options.owner}\ndocs/definition-of-done.md    ${options.owner}\nCLAUDE.md    ${options.owner}\ndocs/glossary.md    ${options.owner}\ndocs/charter/    ${options.owner}\n`,
```

Logo depois do laço `for (const agreement of WORKING_AGREEMENTS) { ... }` dentro do
`if (options.stage !== 'solo') { ... }`, acrescente:

```typescript
    for (const agreement of LANGUAGE_AND_INTENT) {
      writeIfAbsent(root, agreement.path, template(agreement.template, values), options, result);
    }
```

- [ ] **Step 7: Rodar os testes e confirmar que passam**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Esperado: PASS na suíte inteira. Se `'RF-0003: small-team não deixa nada de
fora'` falhar com `notInstalled` não vazio, é `declareRequirements` disparando
— confira que o `.ownership.yml` do repositório temporário ainda tem a âncora
`\ngenerated:`.

- [ ] **Step 8: Commit**

**`HK-5`:** este commit toca `src/cli/**`, que `watches` liga a
`docs/requirements/functional.md`. O hook vai perguntar. A resposta é **sim,
pode seguir**: o doc dono viajou no commit imediatamente anterior (Task 1),
com a própria `RF-0005` que este código implementa — que é a ordem que
`CONTRIBUTING.md` §"O ciclo" exige (a regra antes do código). Diga isso à
pessoa que responde; não responda por ela.

```bash
git add templates/glossary.md templates/constitution.md templates/vision.md src/cli/init.ts test/cli/init.test.ts
git commit -m "feat(RF-0005): init --stage small-team instala glossary e charter"
```

---

### Task 3: Dogfooding — o glossary e a Constitution/Vision deste repositório

**Objetivo:** Rodar o `init` real contra este repositório para provar que a
Task 2 funciona de ponta a ponta, e então substituir a semente pelo
vocabulário e pelos princípios reais deste toolkit — a mesma instrução que o
próprio template deixa ("substitua o que não for verdade neste projeto").
Implementa `RN-0011` com um teste de dogfooding.

**Files:**
- Create: `docs/glossary.md` (conteúdo real, não a semente)
- Create: `docs/charter/constitution.md` (conteúdo real)
- Create: `docs/charter/vision.md` (conteúdo real)
- Create: `test/docs/language-and-intent.test.ts`
- Modify: `CODEOWNERS`

**Interfaces:**
- Consome: `docs/requirements/rules.md` (RN-0001 a RN-0011),
  `docs/requirements/non-functional.md` (RNF-0001 a RNF-0003) — fonte dos
  termos e dos princípios.
- Produz: os três arquivos que as Tasks 4 e 5 (skills) vão ler e citar.

**Requisitos:**
- Nenhum termo ou princípio narra código — cada um é a verdade do domínio do
  toolkit, não uma descrição de função.
- Todo termo tem `Fonte` preenchida — o ID (`RN`/`ADR`) que o origina, ou a
  skill dona quando o conceito nasce do procedimento e não de um requisito.
  Sem fonte nenhuma, a entrada nasceria `status: draft` (spec SK-2, regra 3);
  nenhuma das entradas abaixo precisa disso.
- Todo princípio da Constitution nomeia o que o verifica.
- O `CODEOWNERS` **deste** repositório não é reescrito pelo `init` — ele já
  existe, e `writeIfAbsent` o pula. As duas linhas de dono entram à mão, senão
  o princípio 1 da Constitution que esta task escreve nasce violado pela
  própria Constitution.

- [ ] **Step 1: Rodar `init --stage small-team` contra este repositório (dry-run primeiro)**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts init --owner @dan --stage small-team --dry-run
```

Esperado: `criado docs/glossary.md`, `criado docs/charter/constitution.md`,
`criado docs/charter/vision.md` na saída — os três ainda não existem neste
repositório. Nada mais deveria aparecer como `criado` (o resto já existe e
sai como `mantido`, `CODEOWNERS` inclusive — daí o Step 6).

- [ ] **Step 2: Rodar de verdade**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts init --owner @dan --stage small-team
```

Confirme que os três arquivos nasceram com o conteúdo da semente (Task 2,
Steps 3–5) e `@dan` no lugar de `{{OWNER}}`.

- [ ] **Step 3: Escrever `test/docs/language-and-intent.test.ts`**

O teste vem antes do conteúdo real, e a semente é o que o faz falhar: ela traz
**um** termo e **um** princípio, e o teste exige 5 e 3. É esse degrau que prova
que o teste mede o conteúdo, e não a existência do arquivo.

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toolkitRoot } from '../../src/core/roots.ts';

const ROOT = toolkitRoot();

/**
 * Linhas de uma tabela markdown, sem cabeçalho nem separador. Só o que começa
 * com `|` entra: prosa depois da tabela não pode virar um termo fantasma.
 */
function rows(source: string, header: string): string[][] {
  const start = source.indexOf(header);
  assert.ok(start !== -1, `tabela não encontrada — esperava o cabeçalho ${header}`);
  return source
    .slice(start)
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .slice(2) // cabeçalho + separador
    .map((line) =>
      line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()),
    );
}

const GLOSSARY_HEADER = '| Termo |';
const glossary = (): string => readFileSync(join(ROOT, 'docs/glossary.md'), 'utf8');

test('RN-0011: todo termo do glossary tem um nome único, e nenhum tem ID numerado', () => {
  const source = glossary();
  const entries = rows(source, GLOSSARY_HEADER);

  const nomes = entries.map((row) => row[0]);
  assert.ok(nomes.length >= 5, `esperava ao menos 5 termos, achei ${nomes.length}`);
  assert.equal(new Set(nomes).size, nomes.length, 'há termo com nome duplicado');

  const start = source.indexOf(GLOSSARY_HEADER);
  const header = source.slice(start, source.indexOf('\n', start));
  assert.doesNotMatch(
    header,
    /\|\s*ID\s*\|/i,
    'a tabela não tem coluna de ID — o termo é identificado pelo nome (RN-0011)',
  );

  for (const row of entries) {
    const status = row[row.length - 1] ?? '';
    // `renamed(para X)` é o estado com destino; a spec §4 o escreve assim.
    assert.match(
      status,
      /^(active|banned|renamed(\(para .+\))?)$/,
      `status "${status}" fora do ciclo de vida do termo (RN-0011)`,
    );
  }
});

test('RN-0011: todo termo aponta a fonte que o define', () => {
  for (const row of rows(glossary(), GLOSSARY_HEADER)) {
    assert.notEqual(row[4] ?? '', '', `termo "${row[0]}" sem fonte`);
  }
});

test('a Constitution: todo princípio nomeia o que o verifica', () => {
  const source = readFileSync(join(ROOT, 'docs/charter/constitution.md'), 'utf8');
  const secao = source.slice(source.indexOf('## Princípios'), source.indexOf('## Log de emendas'));
  const principios = secao.split('\n').filter((line) => /^\d+\./.test(line.trim()));
  assert.ok(principios.length >= 3, `esperava ao menos 3 princípios, achei ${principios.length}`);
  for (const principio of principios) {
    assert.match(principio, /verificado por/, `princípio sem enforcement nomeado — ${principio}`);
  }
});

test('a Constitution tem log de emendas — emenda é append, nunca reescrita no lugar', () => {
  const source = readFileSync(join(ROOT, 'docs/charter/constitution.md'), 'utf8');
  assert.match(source, /## Log de emendas/);
});

test('a Vision responde só as três perguntas da spec §5', () => {
  const source = readFileSync(join(ROOT, 'docs/charter/vision.md'), 'utf8');
  for (const pergunta of ['Que problema', 'Para quem', 'Métrica de sucesso']) {
    assert.match(source, new RegExp(`\\*\\*${pergunta}:\\*\\*`), `Vision sem a pergunta "${pergunta}"`);
  }
});

test('RN-0001: glossary e charter têm dono no CODEOWNERS, como todo artefato', () => {
  const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8');
  assert.match(codeowners, /^docs\/glossary\.md\s+@\S+$/m);
  assert.match(codeowners, /^docs\/charter\/\s+@\S+$/m);
});
```

- [ ] **Step 4: Rodar e confirmar que falha**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0011|RN-0001: glossary|Constitution|Vision"
```

Esperado: dos seis testes, **três falham** — `esperava ao menos 5 termos, achei
1`, `esperava ao menos 3 princípios, achei 1`, e o do CODEOWNERS (o `init` não
reescreveu o arquivo existente). Os outros três (fonte preenchida, log de
emendas, três perguntas da Vision) já passam: a semente os satisfaz de fábrica,
e é assim que se quer — eles guardam o formato, não o conteúdo.

- [ ] **Step 5: Substituir `docs/glossary.md` pelo vocabulário real**

```markdown
---
title: Glossary
owner: "@dan"
trigger: >
  Termo de domínio novo em código, spec ou conversa; termo com dois
  significados; renomeação de conceito.
last-reviewed: 2026-08-25
---

# Glossary

Vocabulário do próprio toolkit — o domínio dele é documentação viva, e as
palavras abaixo são a verdade única para esse domínio dentro deste
repositório.

| Termo | Definição | Nome no código | Não confundir com | Fonte | Status |
| --- | --- | --- | --- | --- | --- |
| Artefato | Documento de documentação viva com dono, gatilho, frontmatter padrão e ciclo de vida | `ArtifactRule`, `ArtifactDoc` | "Arquivo" — nem todo arquivo markdown é artefato; só o que tem dono declarado | RN-0001 | active |
| Dono | Pessoa ou time que responde por um artefato, declarado em `owner:` e espelhado no CODEOWNERS | `owner` | "Autor" — quem escreveu o texto, não necessariamente quem responde por ele depois | RN-0001 | active |
| Caminho vigiado | Glob em `watches` cuja mudança exige o doc dono no mesmo commit | `WatchRule.code` | "Arquivo monitorado" por ferramenta de observabilidade externa — não é isso | RN-0008 | active |
| Gatilho | Evento observável que exige atualizar um artefato; nunca uma data de calendário | `trigger` | "Prazo de revisão" — cadência é o anti-requisito que `CI-1` reprova | RN-0002 | active |
| Item congelado | Item em estado terminal cujo corpo não aceita mais edição, salvo os campos da allowlist | `FROZEN_STATUSES`, `mutableFields` | "Arquivado" — sugere que não vale mais; item congelado continua sendo a verdade vigente | RN-0006 | active |
| Lacuna | Comportamento sem regra escrita; vira `DA-nnnn` e para a implementação até decidir | `DA-nnnn` | "Bug" — lacuna é ausência de regra, não erro de código rodando | decision-recorder (SK-3) | active |
| Termo | Entrada do glossary, identificada pelo nome — um significado só, nunca um ID numerado | linha da tabela em `docs/glossary.md` | "Requisito" (`RN`/`RF`/`RNF`) — o termo nomeia um conceito, o requisito afirma uma regra sobre ele | ADR-0004, RN-0011 | active |
```

- [ ] **Step 6: Substituir `docs/charter/constitution.md` pela Constitution real**

```markdown
---
title: Constitution
owner: "@dan"
trigger: >
  Emenda deliberada — nunca como efeito colateral de outra tarefa.
last-reviewed: 2026-08-25
version: 1
---

# Constitution

O que é inviolável neste toolkit, e como cada princípio se verifica. Princípio
sem enforcement nomeado é slogan — nenhum entra aqui sem ele.

## Princípios

1. Um artefato tem exatamente um dono, declarado e espelhado no CODEOWNERS — verificado por `RN-0001` e `CI-1`.
2. `trigger` nomeia um evento observável, nunca uma cadência de calendário — verificado por `CI-1`.
3. Nenhum item aceito se corrige no corpo — supersede — verificado por `HK-1`.
4. Nenhum agente promove sozinho um estado que significa aceitação — verificado por `HK-3`.
5. Caminho vigiado e o doc dono viajam no mesmo commit — verificado por `HK-4` (lembra) e `HK-5` (pergunta).
6. Nada roda no host além de Docker — verificado por `test/plugin/manifest.test.ts` (`RNF-0002`) e por revisão humana de `Dockerfile`/`compose.yaml`.

## Log de emendas

- 2026-08-25 — v1 — Criação inicial, seis princípios refletindo `RN-0001`–`RN-0010` e `RNF-0002` — humana, dogfooding da Fase 4.
```

- [ ] **Step 7: Substituir `docs/charter/vision.md` pela Vision real**

```markdown
---
title: Product Vision
owner: "@dan"
trigger: >
  Mudança de estratégia de produto — nunca como efeito colateral de outra
  tarefa.
last-reviewed: 2026-08-25
---

# Product Vision

**Que problema:** Documentação que descola do código e apodrece em silêncio —
decisões, requisitos e dívidas técnicas viram conhecimento tribal que evapora
quando quem lembra sai do time.

**Para quem:** Quem mantém um repositório sozinho ou em time pequeno e
precisa que "por que foi feito assim" e "o que ainda não decidimos"
sobrevivam à rotatividade de quem lembra — sem depender de uma wiki paralela
que ninguém atualiza.

**Métrica de sucesso:** `living-docs validate` roda em minutos no PR e falha
antes de mesclar; toda `RN` `active` é citada por ao menos um teste (`CI-3`
sem achado); nenhum ADR aceito foi reescrito retroativamente.
```

- [ ] **Step 8: Dar dono aos dois artefatos no `CODEOWNERS` deste repositório**

O `init` do Step 2 não tocou o `CODEOWNERS` — ele já existia, e `writeIfAbsent`
pula o que existe. Acrescente as duas linhas depois de `CLAUDE.md`, seguindo o
espaçamento que o arquivo já usa (quatro espaços):

```
docs/glossary.md    @dan
docs/charter/    @dan
```

O `docs/charter/` é declarado como diretório, do mesmo jeito que
`docs/requirements/` já é — um dono para os dois arquivos do charter, porque
quem responde por um responde pelo outro.

- [ ] **Step 9: Rodar tudo e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Esperado: PASS, `exit=0`. Os seis testes do Step 3 agora passam.
`docs/glossary.md` e `docs/charter/` não entram em `context.docs` (não estão em
`artifacts:`), então nenhum check de `CI-1`–`CI-3` os toca — quem os cobre é
`test/docs/language-and-intent.test.ts`, e só ele. É exatamente a perda que
`ADR-0004` registra em "o que se aceita perder".

- [ ] **Step 10: Commit**

```bash
git add docs/glossary.md docs/charter/constitution.md docs/charter/vision.md CODEOWNERS test/docs/language-and-intent.test.ts
git commit -m "feat(RN-0011): glossary e Constitution/Vision deste repositório, com teste de dogfooding"
```

---

### Task 4: `SK-2` glossary-keeper e `/term`

**Objetivo:** Escrever a skill dona de `docs/glossary.md` e o comando fino
que a aciona.

**Files:**
- Create: `plugin/skills/glossary-keeper/SKILL.md`
- Create: `plugin/commands/term.md`
- Modify: `test/plugin/authoring.test.ts`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consome: `templates/glossary.md` (Task 2), `docs/glossary.md` (Task 3).
- Produz: nada que outra task consuma — skill e comando são folha.

**Requisitos:**
- `description` > 120 caracteres, contém "Use" e os sintomas do gatilho da
  spec §5 (termo novo, dois significados, renomeação).
- Seções na ordem exata da spec §11 (`test/plugin/authoring.test.ts` varre
  todo diretório de `plugin/skills/` automaticamente).
- Checklist com ≥6 itens, cada um nomeando `CI-n`, `HK-n` ou "humana".
- Não duplica o formato da tabela (aponta `templates/glossary.md`).
- `CONTRIBUTING.md` viaja **neste** commit, não no da Task 7: `watches` liga
  `plugin/skills/**` a ele, e skill nova é exatamente "mudou como se trabalha
  aqui". A linha da tabela é o índice do artefato novo — o conteúdo continua só
  em `docs/glossary.md` (`RN-0010`).

- [ ] **Step 1: Escrever o teste que falha**

Em `test/plugin/authoring.test.ts`, troque a lista fixa de comandos e
acrescente as duas asserções de glossary-keeper:

```typescript
test('os cinco comandos existem, têm description e não contêm lógica própria', () => {
  const esperados = ['adr.md', 'open-decision.md', 'debt.md', 'docs-setup.md', 'term.md'];
  const encontrados = readdirSync(join(ROOT, 'plugin/commands')).sort();
  assert.deepEqual(encontrados, esperados.sort());

  for (const nome of esperados) {
    const source = readFileSync(join(ROOT, 'plugin/commands', nome), 'utf8');
    const frontmatter = parseFrontmatter(source);
    assert.ok(frontmatter, `${nome} sem frontmatter`);
    assert.equal(typeof frontmatter.data.description, 'string');
    assert.ok(source.split('\n').length < 25, `${nome} é longo demais para um atalho fino`);
    assert.match(source, /decision-recorder|living-docs-bootstrap|glossary-keeper/, `${nome} deve apontar a skill que aciona`);
  }
});

test('glossary-keeper: a description nomeia os sintomas de termo novo, ambíguo ou renomeado', () => {
  const description = String(parseFrontmatter(skillSource('glossary-keeper'))?.data.description ?? '');
  assert.match(description, /Use quando/i);
  for (const sintoma of ['termo', 'renome']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`);
  }
});

test('glossary-keeper não duplica o formato da tabela que governa', () => {
  const source = skillSource('glossary-keeper');
  assert.doesNotMatch(source, /\| Termo exemplo \|/, 'a skill não deve conter a linha de exemplo do template');
  assert.match(source, /templates\/glossary\.md/, 'ela deve apontar para o template, não copiá-lo');
});
```

Remova o teste antigo `'os quatro comandos existem...'` (substituído pelo de
cima).

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="comandos existem|glossary-keeper"
```

Esperado: FAIL — `plugin/skills/glossary-keeper/SKILL.md` e
`plugin/commands/term.md` não existem.

- [ ] **Step 3: Escrever `plugin/skills/glossary-keeper/SKILL.md`**

```markdown
---
name: glossary-keeper
description: >
  Use quando um termo de domínio novo aparecer em código, spec ou conversa,
  quando a mesma palavra estiver sendo usada para duas coisas diferentes,
  quando alguém perguntar "isso já tem um nome?", "que termo a gente usa pra
  isso?", "isso é sinônimo do que já existe?", "por que o código chama de X e
  o requisito chama de Y?" — ou quando um conceito for renomeado e o nome
  antigo continuar aparecendo no código.
---

# glossary-keeper — dono do vocabulário do domínio

## Overview

O glossary é a única fonte de nome para um conceito. Um termo é identificado
pelo **nome**, nunca por um ID numerado (`ADR-0004`, `RN-0011`) — divergência
entre o nome no código e o termo é bug, não sinônimo.

O caminho é `docs/glossary.md` — leia `docs/.ownership.yml` mesmo assim,
porque outros artefatos podem ter mudado de lugar.

## Do que você é dono

| Artefato | O que é | Forma |
| --- | --- | --- |
| `docs/glossary.md` | O nome único de cada conceito do domínio, com definição, nome no código e fonte | Arquivo único, tabela, mutável |

Formato da linha: `templates/glossary.md`. Não o reproduza aqui.

## Quando usar / quando não

**Use** a cada termo de domínio novo, a cada ambiguidade de nome, e a cada
renomeação de conceito.

**Não use** para nomear detalhe de implementação sem significado de negócio
(nome de variável, de classe interna) — isso não é domínio, é escolha de
código.

**O custo de usar à toa:** um termo por escolha estilística infla a tabela que
`requirements-keeper` consulta antes de nomear qualquer requisito novo — e uma
tabela que ninguém consegue ler inteira deixa de ser a fonte única de nome.

## Procedimento

1. **Procure antes de criar.** Um `grep` pelo termo e por sinônimos
   prováveis em `docs/glossary.md`. Termo quase igual é sinal de que a
   palavra já existe sob outro nome — não de que precisa de uma segunda
   entrada.
2. **Um significado por termo, sem exceção.** Se a mesma palavra cobre dois
   conceitos, dois termos — um deles `status: banned`, apontando o
   substituto na coluna `Não confundir com`.
3. **Divergência entre nome no código e termo é bug.** Proponha o rename no
   código; não some uma segunda linha ao glossary para acomodar o hábito de
   quem escreveu.
4. **Toda definição aponta a fonte** — a `RN`/`ADR` que a origina. Sem fonte,
   a entrada nasce `status: draft` até que uma exista (spec SK-2, regra 3).
5. **Preencha "Não confundir com"** sempre que houver risco real de
   confusão — é ele que evita a próxima pergunta repetida.
6. **Nomeie pelo termo, não por ID**, em qualquer citação — glossary não tem
   sintaxe `<PREFIXO>-<número>` (`ADR-0004`, `RN-0011`).
7. **Rode `living-docs validate`** antes de encerrar — sabendo que hoje ele
   não varre `docs/glossary.md` (`DA-0002` aberta; `ADR-0004` explica por
   quê). A verificação de duplicidade e de fonte é sua, não do CI.
8. **Cite o termo (pelo nome) na mensagem de commit.**

## Fronteiras

| É seu | Não é seu |
| --- | --- |
| Nomear um conceito de domínio, com um significado só | Decidir a regra de negócio sobre esse conceito (→ `requirements-keeper`) |
| Detectar dois termos para a mesma coisa e banir um | Aceitar a renomeação de um termo aceito (é do dono do termo, ato humano) |
| Propor o rename no código quando ele diverge do termo | Fazer o rename — isso é do agente que está no código |
| Apontar o formato da linha | Duplicar a tabela aqui |

## Checklist

- [ ] O termo não existe já sob outro nome — verificação humana
- [ ] Um significado só por termo; divergência virou `banned` + substituto, não uma segunda linha — verificação humana
- [ ] "Nome no código" preenchido, e sem divergência não resolvida com o termo — verificação humana
- [ ] "Fonte" aponta uma `RN`/`ADR` real, ou a entrada nasceu `draft` — verificação humana
- [ ] Nenhum termo ganhou um ID numerado — verificação humana (`RN-0011`)
- [ ] "Não confundir com" preenchido onde havia risco de confusão real — verificação humana
```

- [ ] **Step 4: Escrever `plugin/commands/term.md`**

```markdown
---
description: Registra ou atualiza um termo do glossary
argument-hint: "[termo]"
---

Use a skill `glossary-keeper` para registrar ou atualizar em `docs/glossary.md` o termo: $ARGUMENTS

Um significado por termo. Se a palavra já cobre outra coisa, marque o termo
antigo como `banned` e aponte o substituto — não crie uma segunda linha para
a mesma palavra.
```

- [ ] **Step 5: Apontar o glossary em `CONTRIBUTING.md`**

Na tabela `## Onde a verdade mora`, acrescente uma linha imediatamente antes de
`| Quando está pronto |`:

```markdown
| Qual é o vocabulário do domínio | `docs/glossary.md` |
```

Só o ponteiro. Nenhum termo é copiado para cá (`RN-0010`).

- [ ] **Step 6: Rodar e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

- [ ] **Step 7: Commit**

**`HK-5`:** este commit toca `plugin/skills/**`, que `watches` liga a
`CONTRIBUTING.md` — e ele está no `git add` abaixo. A resposta ao hook é "sim,
está junto".

```bash
git add plugin/skills/glossary-keeper plugin/commands/term.md CONTRIBUTING.md test/plugin/authoring.test.ts
git commit -m "feat(SK-2, RN-0011): glossary-keeper e /term"
```

---

### Task 5: `SK-1` charter-keeper

**Objetivo:** Escrever a skill dona de `docs/charter/constitution.md` e
`docs/charter/vision.md`.

**Files:**
- Create: `plugin/skills/charter-keeper/SKILL.md`
- Modify: `test/plugin/authoring.test.ts`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consome: `templates/constitution.md`, `templates/vision.md` (Task 2),
  `docs/charter/` real (Task 3).
- Produz: nada consumido por outra task.

**Requisitos:** os mesmos da Task 4 (seções §11, checklist ≥6, `description`
> 120 caracteres com "Use"), incluindo a linha de `CONTRIBUTING.md` no mesmo
commit — `plugin/skills/**` é caminho vigiado.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `test/plugin/authoring.test.ts`:

```typescript
test('charter-keeper: a description nomeia princípio, visão e emenda', () => {
  const description = String(parseFrontmatter(skillSource('charter-keeper'))?.data.description ?? '');
  assert.match(description, /Use quando/i);
  for (const sintoma of ['princípio', 'visão']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`);
  }
});

test('charter-keeper não duplica o conteúdo dos artefatos que governa', () => {
  const source = skillSource('charter-keeper');
  // Título de seção, não menção em prosa: é o corpo da Constitution que não
  // pode ser copiado para cá, e é ele que começa a linha com `## `.
  assert.doesNotMatch(source, /^## Log de emendas/m, 'a skill não deve conter o corpo da Constitution');
  assert.doesNotMatch(source, /^## Princípios/m, 'a skill não deve conter os princípios deste repositório');
  assert.match(source, /templates\/constitution\.md/, 'ela deve apontar para o template, não copiá-lo');
  assert.match(source, /templates\/vision\.md/, 'os dois templates, porque são dois artefatos');
});
```

O `SKILL.md` do Step 3 fala em "a seção **Log de emendas**" em negrito, não com
`##`, exatamente para que essa asserção meça duplicação de conteúdo e não onde
a linha quebrou.

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="charter-keeper"
```

- [ ] **Step 3: Escrever `plugin/skills/charter-keeper/SKILL.md`**

```markdown
---
name: charter-keeper
description: >
  Use quando alguém quiser emendar a Constitution ou a Product Vision, quando
  perguntar "isso é um princípio nosso?", "isso está na nossa visão de
  produto?", "quais são os valores invioláveis daqui?", "pra quem é esse
  produto e qual problema ele resolve?" — nunca como efeito colateral de
  outra tarefa. Também quando um princípio proposto não tiver enforcement
  nomeado, ou uma emenda tentar reescrever um princípio no lugar em vez de
  registrar a mudança no log de emendas.
---

# charter-keeper — dono da Constitution e da Product Vision

## Overview

Dois artefatos, gatilho raríssimo e deliberado: a Constitution muda por
emenda (nunca no meio de outra tarefa), a Vision muda por mudança real de
estratégia. Nenhum dos dois tem família de ID numerada (`ADR-0004`) —
mudança neles é rara o bastante para não precisar.

## Do que você é dono

| Artefato | O que é | Forma |
| --- | --- | --- |
| `docs/charter/constitution.md` | O que é inviolável, e como se verifica cada princípio | Arquivo único, seções estáveis, com log de emendas append-only |
| `docs/charter/vision.md` | Que problema, para quem, e a métrica de sucesso | Arquivo único, três respostas |

Sementes: `templates/constitution.md` e `templates/vision.md`. Não reproduza
o formato aqui.

## Quando usar / quando não

**Use** para emenda deliberada de princípio, e para mudança real de
estratégia de produto.

**Não use** para decisão técnica pontual (→ `decision-recorder`) ou regra de
negócio (→ `requirements-keeper`) — Constitution é o que é inviolável, não a
regra do domínio.

**Nunca** aceite a emenda sozinho. Isso é humano.

## Procedimento

1. **Classifique**: princípio inviolável e seu enforcement → Constitution;
   problema/público/métrica de sucesso → Vision. Se a mudança não altera
   nenhuma das três perguntas da Vision, não é mudança de Vision.
2. **Todo princípio precisa de enforcement nomeado.** Formato: `<princípio> —
   verificado por <hook | lint | teste | revisão | check>`. Sem isso, é
   slogan — recuse e peça a versão verificável.
3. **Emenda é append, nunca reescrita no lugar.** A seção **Log de emendas**
   recebe data, o que mudou, o porquê, e a versão sobe. Um princípio revogado
   fica registrado com o que o revogou, não apagado.
4. **Antes de propor a emenda como pronta**, considere rodar o agent
   `decision-adversary` sobre ela — ele tenta refutar, e o veredito ajuda a
   decidir se falta alternativa considerada ou consequência omitida.
5. **Limite de 1–2 páginas na Constitution.** Estourar é sintoma de
   princípio que virou requisito — mova para `requirements-keeper`.
6. **Pare depois de escrever a emenda.** Aceitar é ato humano — não altere
   o corpo publicado por conta própria.

## Fronteiras

| É seu | Não é seu |
| --- | --- |
| O que é inviolável, e como se verifica | Decisão técnica pontual (→ `decision-recorder`) |
| Métrica de sucesso do produto | Regra de negócio (→ `requirements-keeper`) |
| Rejeitar princípio não testável | Aceitar a emenda — isso é humano |
| Registrar a emenda como append no log | Reescrever um princípio existente no lugar |

## Checklist

- [ ] Todo princípio termina em "— verificado por" um mecanismo real — verificação humana
- [ ] A emenda entrou como linha nova em "Log de emendas", não como reescrita — verificação humana
- [ ] A `version` da Constitution subiu junto com a emenda — verificação humana
- [ ] A Vision, se alterada, ainda responde só as três perguntas — verificação humana
- [ ] A Constitution segue com 1–2 páginas — verificação humana
- [ ] `decision-adversary` foi considerado antes de propor a emenda como pronta — verificação humana
```

- [ ] **Step 4: Apontar o charter em `CONTRIBUTING.md`**

Na tabela `## Onde a verdade mora`, logo abaixo da linha do glossary
(acrescentada na Task 4) e ainda antes de `| Quando está pronto |`:

```markdown
| O que é inviolável, e a visão do produto | `docs/charter/` |
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

- [ ] **Step 6: Commit**

**`HK-5`:** de novo `plugin/skills/**` → `CONTRIBUTING.md`, e de novo ele está
no `git add`.

```bash
git add plugin/skills/charter-keeper CONTRIBUTING.md test/plugin/authoring.test.ts
git commit -m "feat(SK-1): charter-keeper"
```

---

### Task 6: `AG-2` decision-adversary, e onde ele entra no fluxo

**Objetivo:** Criar o primeiro agent do plugin — contexto isolado, sem
`Edit`/`Write`, que tenta refutar uma proposta — e apontar `decision-recorder`
para ele. `charter-keeper` já o cita desde a Task 5, no passo 4 do
`## Procedimento`: a referência nasce antes do arquivo de propósito, porque
nenhum teste resolve nome de agent (a varredura de
`test/plugin/manifest.test.ts` só cobra que **skill** citada exista), e
inverter a ordem obrigaria a Task 5 a voltar atrás.

**Files:**
- Create: `plugin/agents/decision-adversary.md`
- Modify: `plugin/skills/decision-recorder/SKILL.md`
- Modify: `test/plugin/manifest.test.ts`

**Interfaces:**
- Consome: nenhum código — é um arquivo de prompt lido pelo runtime do
  Claude Code, no mesmo mecanismo que descobre `plugin/skills/*/SKILL.md` e
  `plugin/commands/*.md` (sem entrada em `plugin.json` — confirmado contra
  plugins reais do marketplace: `pr-review-toolkit`, `feature-dev`).
- Produz: nada que outra task consuma.

**Requisitos:**
- Frontmatter `name: decision-adversary`, `description` (o gatilho),
  `tools:` sem `Edit` nem `Write` (spec §6: "aponta e para").
- `decision-recorder` ganha um passo/checklist item citando o agent — spec
  §6 não define quem o invoca, e o único lugar coerente é onde ADR/TDR são
  preparados para aceitação.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `test/plugin/manifest.test.ts`:

```typescript
/**
 * Varredura, não lista fixa — mesma escolha que `authoring.test.ts` faz para as
 * skills: um agent novo entra nas convenções no dia em que nasce, sem ninguém
 * lembrar de acrescentá-lo aqui.
 */
const AGENTS = readdirSync(join(ROOT, 'plugin/agents')).filter((name) => name.endsWith('.md'));

test('AG-2: o diretório de agents existe e traz decision-adversary', () => {
  assert.ok(AGENTS.includes('decision-adversary.md'), `plugin/agents: ${AGENTS.join(', ') || 'vazio'}`);
});

for (const file of AGENTS) {
  test(`${file}: frontmatter com name casando o arquivo, description e tools declaradas`, () => {
    const source = readFileSync(join(ROOT, 'plugin/agents', file), 'utf8');
    const name = file.replace(/\.md$/, '');

    assert.match(source, new RegExp(`^name:\\s*${name}\\s*$`, 'm'), `${file} declara outro name`);
    assert.match(source, /^description:/m, `${file} sem description — é ela que diz quando usar`);
    assert.notEqual(
      source.match(/^tools:\s*(.+)$/m)?.[1] ?? '',
      '',
      `${file} precisa declarar tools explicitamente — agent sem allowlist herda tudo`,
    );
  });
}

test('AG-2: decision-adversary aponta e para — sem Edit nem Write', () => {
  const source = readFileSync(join(ROOT, 'plugin/agents/decision-adversary.md'), 'utf8');
  const toolsLine = source.match(/^tools:\s*(.+)$/m)?.[1] ?? '';
  assert.doesNotMatch(toolsLine, /\bEdit\b/, 'AG-2 aponta e para — nunca reescreve (spec §6)');
  assert.doesNotMatch(toolsLine, /\bWrite\b/, 'AG-2 aponta e para — nunca reescreve (spec §6)');
});

test('decision-recorder referencia o agent decision-adversary antes da aceitação', () => {
  const source = readFileSync(join(ROOT, 'plugin/skills/decision-recorder/SKILL.md'), 'utf8');
  assert.match(source, /decision-adversary/);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="AG-2|decision-adversary"
```

Esperado: `ENOENT ... plugin/agents` — o `readdirSync` do topo do módulo roda na
carga, então `manifest.test.ts` inteiro falha, não só os testes novos. É ruído
esperado neste ponto e some no Step 3; se você preferir ver asserções em vez de
um erro de carga, crie o diretório vazio antes de rodar. Não troque o
`readdirSync` por uma versão tolerante a diretório ausente: `plugin/agents/`
existir é parte do que o teste garante.

- [ ] **Step 3: Escrever `plugin/agents/decision-adversary.md`**

```markdown
---
name: decision-adversary
description: >
  Use este agent para tentar refutar UMA proposta — um ADR em draft, uma
  emenda de Constitution, ou um TDR — antes de pedir a aceitação humana
  dela. Isolado de propósito: quem propôs não deve revisar com o mesmo
  raciocínio que produziu a proposta.
tools: Glob, Grep, Read
model: inherit
---

Você é um adversário técnico. Recebe uma única proposta — um ADR `draft`, uma
emenda de Constitution, ou um TDR — e tenta genuinamente derrubá-la. Você não
reescreve a proposta, não sugere frases, e não decide por ninguém: seu
resultado é um veredito e uma lista do que falta.

## Checklist adversarial fixo

Aplique as cinco perguntas abaixo, nesta ordem, e não pule nenhuma:

1. **A alternativa descartada foi realmente avaliada?** Ou é uma alternativa
   de palha, listada só para parecer que houve comparação?
2. **Qual consequência negativa está omitida?** Toda decisão perde alguma
   coisa. Se a seção "o que se aceita perder" está vazia ou genérica, essa é
   a omissão.
3. **Esse princípio é testável, ou é slogan?** (Só se aplica a emenda de
   Constitution.) Se não termina em "verificado por" um mecanismo real,
   reprove.
4. **Esse gatilho de pagamento é observável?** (Só se aplica a TDR.) "Quando
   der tempo" e variantes vagas reprovam; uma condição que alguém consegue
   apontar acontecendo passa.
5. **Existe uma decisão anterior que isto contradiz sem supersedir?** Busque
   por `docs/decisions/adr/` e `docs/charter/constitution.md` antes de
   responder — não confie na memória do contexto.

## O que você não faz

- Não usa `Edit` nem `Write` — você não tem essas ferramentas, e mesmo que
  tivesse, reescrever a proposta não é o seu papel.
- Não decide se a proposta é aceita. Isso é ato humano em todos os casos
  (spec §4).
- Não amplia o escopo para outras propostas além da que recebeu.

## Saída

Um veredito binário — **pronto para aceitação** ou **o que falta** — nunca
uma reescrita da proposta. Quando o veredito é "o que falta", liste cada item
como uma das cinco perguntas acima, com o trecho exato da proposta que a
motivou.
```

- [ ] **Step 4: Referenciar `decision-adversary` em `plugin/skills/decision-recorder/SKILL.md`**

No `## Procedimento`, entre o step 7 (fechar os dois lados da referência) e o
step 8 (parar em `draft`/`open`), insira um novo step 7.5:

```markdown
7. **Feche os dois lados da referência.** DA resolvida aponta o ADR que a fechou;
   o ADR aponta de volta em `relates-to`. Superseder preenche `supersedes` no
   novo e `superseded-by` no antigo.
8. **Antes de pedir aceitação de um ADR ou TDR importante**, considere rodar
   o agent `decision-adversary` sobre a proposta — ele tenta refutar com um
   checklist fixo, e o veredito ajuda a decidir se falta alternativa
   considerada ou consequência omitida antes de gastar o tempo de quem aceita.
9. **Pare em `draft`/`open`.** Diga qual decisão falta e a quem ela cabe. Se
   você tentar promover, `HK-3` vai perguntar — e a resposta não é sua.
10. **Rode `living-docs validate`** antes de encerrar.
11. **Cite o ID na mensagem de commit.**
```

(Renumere os steps antigos 8–10 para 9–11, como acima — o conteúdo deles não
muda, só o número.)

No `## Checklist`, acrescente:

```markdown
- [ ] Para decisão de peso, `decision-adversary` foi considerado antes de pedir aceitação — verificação humana
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

- [ ] **Step 6: Commit**

**`HK-5`:** este commit toca `plugin/skills/decision-recorder/SKILL.md`, e
`plugin/skills/**` está ligado a `CONTRIBUTING.md`. Aqui, diferente das Tasks 4
e 5, **não** há linha nova a acrescentar: o `CONTRIBUTING.md` não indexa passos
internos de skill, e `decision-adversary` já entra no README pela Task 7. A
resposta ao hook é "não afeta os acordos de trabalho" — e essa resposta é de
uma pessoa, não sua.

```bash
git add plugin/agents/decision-adversary.md plugin/skills/decision-recorder/SKILL.md test/plugin/manifest.test.ts
git commit -m "feat(AG-2): decision-adversary, referenciado por decision-recorder"
```

---

### Task 7: Índice — `CLAUDE.md`, `README.md`, `plugin.json`

**Objetivo:** Apontar os artefatos novos a partir dos três índices existentes
— nunca copiar conteúdo (`RN-0010`).

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `plugin/.claude-plugin/plugin.json`
- Modify: `test/docs/agent-contract.test.ts`

`CONTRIBUTING.md` **não** está aqui: as duas linhas dele viajaram junto com as
skills, nas Tasks 4 e 5, porque `plugin/skills/**` é caminho vigiado.

**Interfaces:**
- Consome: nada de código.
- Produz: nada consumido por outra task — é a última peça visível antes da
  Task 8.

**Requisitos:**
- `CLAUDE.md` continua ≤60 linhas (`RN-0010`, já testado) e não copia
  nenhuma frase de `docs/glossary.md` ou `docs/charter/`.
- O README não pode ficar afirmando o que deixou de ser verdade: a frase sobre
  `--stage` promete que o comando "imprime o que o estágio pede e esta versão
  não instala", e a partir da Task 2 `notInstalled` sai vazio para os dois
  estágios.

- [ ] **Step 1: Estender `test/docs/agent-contract.test.ts`**

No teste `'RN-0010: o contrato do agente aponta para os artefatos donos'`,
acrescente ao array `alvos`:

```typescript
  const alvos = [
    'LIVING-DOCUMENTATION-TOOLKIT.md',
    'docs/.ownership.yml',
    'CONTRIBUTING.md',
    'docs/definition-of-done.md',
    'docs/requirements/',
    'docs/glossary.md',
    'docs/charter/',
  ];
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0010"
```

- [ ] **Step 3: Editar `CLAUDE.md`**

Na seção `## Antes de mexer em qualquer coisa`, acrescente uma linha:

```markdown
- Vocabulário do domínio: `docs/glossary.md`. Princípios invioláveis e visão
  de produto: `docs/charter/`.
```

Na seção `## Comandos`, troque o parágrafo por:

```markdown
`/adr`, `/open-decision`, `/debt`, `/docs-setup`, `/term`. As skills
`decision-recorder`, `requirements-keeper`, `working-agreements-keeper`,
`glossary-keeper` e `charter-keeper` são selecionadas pela `description`; não
é preciso invocá-las pelo nome.
```

Rode `wc -l CLAUDE.md` (ou conte as linhas) e confirme ≤60.

- [ ] **Step 4: Editar `README.md`**

Quatro trechos. **Parágrafo de abertura** — substitua o parágrafo inteiro por:

```markdown
Documentação viva com dono, gatilho e enforcement — Fases 0–4 da spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions, Debt Register e
requisitos com ID estável; os checks `CI-1`/`CI-2`/`CI-3`; os hooks
`HK-1`/`HK-3`/`HK-4`/`HK-5`; os acordos de trabalho (`SK-6`); o vocabulário do
domínio e os princípios invioláveis (`SK-2`, `SK-1`).
```

**Parágrafo "Estágios de maturidade"** — a segunda frase deixa de ser verdade
quando `notInstalled` esvazia. Substitua o parágrafo por:

```markdown
Estágios de maturidade (`--stage`): `solo` instala decisões, lacunas e dívida;
`small-team` acrescenta a moldura de requisitos (`RF`, `RNF`, `RN`), os acordos
de trabalho, o glossary e o charter. Nesta versão, `small-team` instala o
conjunto inteiro do estágio — quando algo do estágio ficar de fora, o comando
diz o que é em vez de fingir o conjunto completo.
```

**Seção "Plugin do Claude Code"** — acrescente ao final do parágrafo existente:

```markdown
As skills `glossary-keeper` (`/term`) e `charter-keeper` completam o estágio
`small-team`, e `plugin/agents/decision-adversary.md` (`AG-2`) é o primeiro
agent do plugin — contexto isolado, sem `Edit`/`Write`, que tenta refutar um
ADR, uma emenda de Constitution ou um TDR antes da aceitação humana.
```

**Seção "O que está fora"** — troque a lista, removendo `SK-1`, `SK-2`, `AG-2`
e `CM-4`:

```markdown
`SK-5`, `SK-7`, `AG-1`, `HK-2`, `HK-6`, `HK-7`, `CI-4`–`CI-8`, `CM-5`, `CM-7`
— Fases 5 a 7 da spec. O que falta e em que ordem:
`docs/superpowers/plans/BACKLOG-fases-3-7.md`.
```

- [ ] **Step 5: Editar `plugin/.claude-plugin/plugin.json`**

```json
  "description": "Documentação viva: ADR, Open Decisions, Debt Register, requisitos com ID estável, acordos de trabalho, vocabulário do domínio e princípios invioláveis — com dono, gatilho e enforcement. Fases 0–4.",
```

- [ ] **Step 6: Rodar tudo**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Esperado: PASS, `exit=0`. Confira também que `'RN-0010: o contrato é índice,
não manual — cabe numa tela'` passou: as duas edições do Step 3 acrescentam
duas linhas ao `CLAUDE.md`, e o teto é 60.

- [ ] **Step 7: Commit**

Nenhum caminho vigiado é tocado aqui — `HK-5` fica quieto.

```bash
git add CLAUDE.md README.md plugin/.claude-plugin/plugin.json test/docs/agent-contract.test.ts
git commit -m "docs(RN-0010): índice aponta glossary, charter e os agents/skills novos"
```

---

### Task 8: Dogfooding final — validate, promoção humana, commit

**Objetivo:** Rodar tudo uma última vez sobre o repositório inteiro e pedir a
promoção humana de `ADR-0004`, `RF-0005` e `RN-0011` — encerrando a fase do
mesmo jeito que a Fase 3 encerrou a dela.

**Files:**
- Modify: `docs/decisions/adr/ADR-0004-termo-do-glossary-identificado-pelo-nome.md` (`status: accepted`)
- Modify: `docs/requirements/functional.md` (`RF-0005` → `active`)
- Modify: `docs/requirements/rules.md` (`RN-0011` → `active`)
- Modify: `docs/superpowers/plans/BACKLOG-fases-3-7.md`

**Interfaces:**
- Consome: tudo que as Tasks 1–7 produziram.
- Produz: o repositório validando a si mesmo com a Fase 4 ativa.

**Requisitos:**
- A promoção é o **último** passo, e é humana (`RN-0005`; `HK-3` intercepta
  qualquer tentativa de fazê-la sozinho).
- `CI-3` exige citação para item `active`; as citações de `RN-0011` já
  existem desde a Task 3 (`test/docs/language-and-intent.test.ts`), e de
  `RF-0005` desde a Task 2 (`test/cli/init.test.ts`).

- [ ] **Step 1: Rodar tudo uma última vez**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Esperado: PASS, `exit=0`. `ADR-0004`, `RF-0005` e `RN-0011` ainda estão em
`draft`, então `CI-3` não os cobra ainda.

- [ ] **Step 2: PARAR e pedir a promoção**

Diga em uma frase o que está sendo pedido — "`ADR-0004` está escrito, e
`RF-0005`/`RN-0011` estão implementados e cobertos por teste; falta aceitar
o ADR e promover os dois requisitos para `active`" — e **espere**. Não edite
`status:` por conta própria.

- [ ] **Step 3: Promover `ADR-0004` para `accepted`**

Depois de aceito por uma pessoa, em
`docs/decisions/adr/ADR-0004-termo-do-glossary-identificado-pelo-nome.md`,
troque `status: draft` por `status: accepted` no frontmatter — e **só** isso.
`HK-3` vai perguntar de novo nesta edição; é o mesmo pedido do Step 2, agora
com a resposta já dada.

Nenhum outro campo entra na mesma edição porque, um segundo depois, não entra
mais nenhum: `accepted` é terminal, `HK-1` passa a negar edição de corpo, e a
allowlist do artefato `ADR` (`mutable-fields: [status, superseded-by,
last-reviewed]`) não inclui `relates-to`. Um `relates-to` errado num ADR aceito
só se conserta supersedindo — é a mesma pré-condição que o backlog anota para
`ADR-0001`/`ADR-0002`.

- [ ] **Step 4: Promover `RF-0005` e `RN-0011` para `active`**

Em `docs/requirements/functional.md` e `docs/requirements/rules.md`, troque
`- **status:** draft` por `- **status:** active` nas duas seções. `HK-3`
pergunta nas duas — mesma resposta.

- [ ] **Step 5: Rodar tudo de novo**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Esperado: `exit=0`. Os dois achados que a promoção pode destravar, e a resposta
de cada um:

- **`CI-3`, "`ADR-0004` está `accepted` sem `relates-to`"** — é a regra 6 do
  check, e só dispara depois do `accepted`. O frontmatter escrito na Task 1 já
  traz `relates-to: [DA-0002, RN-0011]`; se o achado aparecer, o campo se
  perdeu numa edição. (`CI-2` não tem essa regra: ele cobra que toda citação
  *resolva*, nunca que exista um mínimo delas.)
- **`CI-3`, "`RN-0011` está `active` e não é citada em `test/**`, `src/**`"** —
  a citação está no nome dos testes de `test/docs/language-and-intent.test.ts`
  (Task 3). Confirme que o texto `RN-0011` aparece literalmente ali: a
  varredura casa a string, não a intenção. O mesmo vale para `RF-0005` em
  `test/cli/init.test.ts`, cujo `cited-by` é só `test/**`.

`ADR-0004` não precisa ser citado de fora: `cited-by` é vazio para o artefato
`ADR`, e a regra 7 de `CI-3` só cobra cobertura de quem declara o campo.

- [ ] **Step 6: Marcar a Fase 4 como implementada no backlog**

Em `docs/superpowers/plans/BACKLOG-fases-3-7.md`, três edições — o backlog é o
índice de "o que falta e em que ordem", e um índice que ainda promete o que já
foi entregue é a duplicata apodrecendo:

1. Cabeçalho: acrescente um "**Estado em <data da execução>**" dizendo que a
   Fase 4 está implementada, no mesmo formato das duas linhas de estado que já
   estão lá.
2. Título da seção: `### Fase 4 — linguagem e intenção — **IMPLEMENTADA**`, e
   troque "Não executado até aqui" por quantas tasks foram executadas e o que
   foi promovido por ato humano (`ADR-0004`, `RF-0005`, `RN-0011`).
3. "Ordem sugerida daqui": risque o item 2 (`~~Executar o plano da Fase 4~~`),
   como o item 1 já está, e promova a Fase 5 a próximo passo.

Corrija de passagem a linha de `DA-0002` em "Dívidas e decisões abertas
herdadas": ela ainda diz que a `DA` "ainda não existe em
`docs/open-decisions.md`" e "nasce quando a fase for executada" — a Fase 3 foi
executada, e `DA-0002` já está lá, `open`.

- [ ] **Step 7: Commit final**

```bash
git add docs/decisions/adr/ADR-0004-termo-do-glossary-identificado-pelo-nome.md docs/requirements docs/superpowers/plans/BACKLOG-fases-3-7.md
git commit -m "docs(ADR-0004, RF-0005, RN-0011): decisão e requisitos da Fase 4 promovidos por ato humano"
```

---

## O que este plano deliberadamente não faz

- **Não resolve `DA-0002`.** Continua aberta, exatamente como a Fase 3 a
  deixou — pré-condição de `CI-7`, Fase 7.
- **Não declara `docs/glossary.md` nem `docs/charter/*` em `artifacts:`** no
  `.ownership.yml` — `ADR-0004` explica por quê, e é reversível: se `DA-0002`
  se resolver mais tarde de um jeito que caiba glossary/charter, é um ADR
  novo que supersede este, não uma edição.
- **Não acrescenta `watches` novos.** Nenhum caminho de código deste
  repositório aponta estruturalmente para glossary ou charter — o gatilho de
  `SK-1`/`SK-2` é semântico (termo novo, emenda deliberada), não um glob de
  arquivo.
- **Não inventa `CI-9`** para medir "um significado por termo" ou "princípio
  com enforcement nomeado" — ambos ficam com a skill e com o teste de
  dogfooding da Task 3, como o backlog recomendou.
