# English-only Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every versioned text in this repository to English, and make the toolkit's checks independent of the language of a consumer's documents.

**Architecture:** Five phases on one branch (`ref/english-only`), in the order rules → behavior → shipped text → corpus → internal code, so a failure is attributable to one layer. Phase 2 is TDD over four checks and one core helper; phases 3–5 are translation, verified by the existing test suite, `living-docs validate` and `ownership validate`. Two human checkpoints gate the work: the decisions of phase 1 are reviewed before phase 2, and ADR-0033 is accepted before phase 4.

**Tech Stack:** Node ≥ 24 running TypeScript directly (`node --conditions=development`), `node:test`, npm workspaces (`packages/living-docs`, `packages/ownership`), `tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-09-29-english-only-repository-design.md`

## Global Constraints

- All versioned text is English from the first commit of this plan on: prose, code comments, test names, assertion messages, CLI/hook/check messages, commit messages.
- Commit messages: English, `type(ID): subject`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Git history is never rewritten. No `rebase`, no `commit --amend` on pushed commits, no `filter-branch`.
- No language guard: no test or check enforces "English only". The final accent search is a one-off command, not a test.
- No language setting: no `language:` key, no bundled translations, no instruction in any skill about which language to write in.
- The only non-English text left in the repository is the fixture in `packages/living-docs/test/acceptance/language-independence.test.ts` (Task 9).
- Checks read only structure — frontmatter, IDs, table keys through `field-map`, and fixed markers such as `human` and `Docs: none —` — never headings or prose.
- Skills write `draft`/`open`. Promoting a decision (`draft → accepted`, `draft → superseded`, `draft → revoked`, `active → revoked`) is a human act; the agent never writes those status values.
- Accepted/superseded ADRs, paid TDRs and published RELs are frozen. They change only under ADR-0033 (phase 4), using the mechanism ADR-0033 records. `living-docs/append-only` is never bypassed ad hoc.
- `last-reviewed` does not change when a document is translated. Translating is not reviewing.
- Generated files (`docs/contracts/checks.gen.md`) change only by running the generator:
  `node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md`
- Shipped text (seeds, skills, commands, agents, CLI and hook messages) cites no artifact ID, no spec section and no `docs/superpowers/` path of this repository (RN-0031). The reason goes into a code comment.
- Text marked `audience: external` (`CHANGELOG.md`, `README.md`, `docs/releases/`, `docs/deprecations.md`, `docs/migrations/`) cites no artifact ID.
- Commands, run from the repository root: `npm ci`, `npm test`, `npm run typecheck`,
  `node --conditions=development packages/living-docs/src/cli/index.ts validate`,
  `node --conditions=development packages/ownership/src/cli/index.ts validate`,
  and the diff halves: the same two commands with `--base master`.

## Translation Rules (phases 3, 4 and 5)

Every translation task follows these rules. They are part of each task's requirements.

1. **Translation, not rewriting.** IDs, frontmatter keys and values other than prose, states, dates, section order, list order, table rows and code identifiers do not change. No decision, rule or sentence is "improved" on the way. A sentence that is wrong in Portuguese stays wrong in English.
2. **Prose fields in frontmatter are translated** (`title`, `trigger`, `description`), machine fields are not (`id`, `status`, `owner`, `last-reviewed`, `relates-to`, `supersedes`, `superseded-by`, `revoked-by`, `pay-when`).
3. **Code blocks inside documents:** translate comments and string literals; never rename identifiers, file names or commands.
4. **Glossary vocabulary.** Use these English terms everywhere (they are the terms the code already uses):

   | Portuguese | English |
   | --- | --- |
   | Artefato | Artifact |
   | Documento | Document |
   | Dono | Owner |
   | Caminho vigiado | Watched path |
   | Gatilho | Trigger |
   | Gatilho de pagamento | Payment trigger |
   | Item congelado | Frozen item |
   | Lacuna | Gap |
   | Termo | Term |
   | Documento externo | External document |
   | Dívida | Debt |
   | Decisão aberta | Open decision |
   | Regra de negócio | Business rule |
   | Contrato do agente | Agent contract |
   | Definição de pronto / Definition of Done | Definition of Done |
   | Núcleo | Core |
   | Raiz do toolkit / do repositório | Toolkit root / repository root |
   | Fora de escopo | Out of scope |
   | Rastro interno | Internal trail |
   | Fronteira de leitor | Reader boundary |
   | Estágio | Stage |
   | Semente | Seed |

5. **Requirement sections keep their bullet keys machine-readable:** `- **status:**`, `- **relates-to:**`, `- **revoked-by:**` stay as they are; `- **fora de escopo:**` becomes `- **out of scope:**`.
6. **Human-verification marker** is the word `human` (Task 6). "verificação: humana" becomes "verification: human".
7. **Tests pin text.** Several tests assert on headings or phrases of the documents they read (for example `test/docs/language-and-intent.test.ts` looks for `| Termo |` and `## Princípios`; `test/plugin/authoring.test.ts` asserts the `decision-recorder` description contains `Use quando`). When a translation turns such a test red, update the pinned string to the English text of the same heading or phrase in the same commit. Never loosen an assertion to make it pass.
8. **Renames.** File slugs follow the Slug Map below exactly — other tasks link to these names.
9. **After each commit** run the verification block of the task; `living-docs/links` (inside `living-docs validate`) is the verifier for links.

## Slug Map

Paths are relative to the repository root. Files not listed keep their names.

| Old path | New path |
| --- | --- |
| `docs/decisions/adr/ADR-0001-runtime-em-container-sem-build.md` | `docs/decisions/adr/ADR-0001-runtime-in-a-container-without-build.md` |
| `docs/decisions/adr/ADR-0002-engine-unica-para-cli-e-hooks.md` | `docs/decisions/adr/ADR-0002-single-engine-for-cli-and-hooks.md` |
| `docs/decisions/adr/ADR-0003-duas-raizes-toolkit-e-repositorio.md` | `docs/decisions/adr/ADR-0003-two-roots-toolkit-and-repository.md` |
| `docs/decisions/adr/ADR-0004-termo-do-glossary-identificado-pelo-nome.md` | `docs/decisions/adr/ADR-0004-glossary-term-identified-by-name.md` |
| `docs/decisions/adr/ADR-0005-contrato-do-gerador-e-onde-ci5-roda.md` | `docs/decisions/adr/ADR-0005-generator-contract-and-where-ci5-runs.md` |
| `docs/decisions/adr/ADR-0006-diff-do-pr-e-rotulo-de-excecao.md` | `docs/decisions/adr/ADR-0006-pr-diff-and-exception-label.md` |
| `docs/decisions/adr/ADR-0007-data-injetavel-e-gatilho-de-pagamento-verificavel.md` | `docs/decisions/adr/ADR-0007-injectable-date-and-verifiable-payment-trigger.md` |
| `docs/decisions/adr/ADR-0008-documento-sem-familia-de-ids.md` | `docs/decisions/adr/ADR-0008-document-without-id-family.md` |
| `docs/decisions/adr/ADR-0009-limiar-de-duplicacao-textual.md` | `docs/decisions/adr/ADR-0009-textual-duplication-threshold.md` |
| `docs/decisions/adr/ADR-0010-severidade-do-sinal-de-watches-no-ci.md` | `docs/decisions/adr/ADR-0010-severity-of-the-watches-signal-in-ci.md` |
| `docs/decisions/adr/ADR-0011-identidade-e-forma-escrita-do-id.md` | `docs/decisions/adr/ADR-0011-id-identity-and-written-form.md` |
| `docs/decisions/adr/ADR-0012-o-que-o-estagio-parametriza.md` | `docs/decisions/adr/ADR-0012-what-the-stage-parameterizes.md` |
| `docs/decisions/adr/ADR-0013-os-dois-limiares-do-fechamento.md` | `docs/decisions/adr/ADR-0013-the-two-closing-thresholds.md` |
| `docs/decisions/adr/ADR-0014-nome-do-projeto-esliph-claude-plugins.md` | `docs/decisions/adr/ADR-0014-project-name-esliph-claude-plugins.md` |
| `docs/decisions/adr/ADR-0015-execucao-no-node-do-host.md` | `docs/decisions/adr/ADR-0015-execution-on-the-host-node.md` |
| `docs/decisions/adr/ADR-0016-caminho-de-execucao-conteinerizado-opcional.md` | `docs/decisions/adr/ADR-0016-optional-containerized-execution-path.md` |
| `docs/decisions/adr/ADR-0017-fronteira-de-leitor.md` | `docs/decisions/adr/ADR-0017-reader-boundary.md` |
| `docs/decisions/adr/ADR-0018-rastro-interno-do-toolkit.md` | `docs/decisions/adr/ADR-0018-toolkit-internal-trail.md` |
| `docs/decisions/adr/ADR-0019-fronteira-do-nucleo-de-ownership.md` | `docs/decisions/adr/ADR-0019-ownership-core-boundary.md` |
| `docs/decisions/adr/ADR-0020-esquema-v2-do-arquivo-de-ownership.md` | `docs/decisions/adr/ADR-0020-ownership-file-schema-v2.md` |
| `docs/decisions/adr/ADR-0021-identidade-de-item-no-nucleo.md` | `docs/decisions/adr/ADR-0021-item-identity-in-the-core.md` |
| `docs/decisions/adr/ADR-0022-gatilho-doc-para-doc.md` | `docs/decisions/adr/ADR-0022-doc-to-doc-trigger.md` |
| `docs/decisions/adr/ADR-0023-composicao-entre-arquivos-de-ownership.md` | `docs/decisions/adr/ADR-0023-composition-across-ownership-files.md` |
| `docs/decisions/adr/ADR-0024-resolucao-do-arquivo-de-ownership.md` | `docs/decisions/adr/ADR-0024-ownership-file-resolution.md` |
| `docs/decisions/adr/ADR-0025-distribuicao-do-nucleo-como-pacote.md` | `docs/decisions/adr/ADR-0025-distributing-the-core-as-a-package.md` |
| `docs/decisions/adr/ADR-0026-identificador-nomeado-para-check-e-hook.md` | `docs/decisions/adr/ADR-0026-named-identifier-for-checks-and-hooks.md` |
| `docs/decisions/adr/ADR-0027-nome-do-projeto-raiz-esliph.md` | `docs/decisions/adr/ADR-0027-root-project-name-esliph.md` |
| `docs/decisions/adr/ADR-0028-bloco-de-plugin-no-topo-da-raiz.md` | `docs/decisions/adr/ADR-0028-plugin-block-at-the-top-of-the-root.md` |
| `docs/decisions/adr/ADR-0029-living-docs-nasce-sobre-a-v2.md` | `docs/decisions/adr/ADR-0029-living-docs-built-on-v2.md` |
| `docs/decisions/adr/ADR-0030-hooks-do-nucleo-no-plugin-ownership.md` | `docs/decisions/adr/ADR-0030-core-hooks-in-the-ownership-plugin.md` |
| `docs/decisions/debt/TDR-0001-congelamento-por-secao.md` | `docs/decisions/debt/TDR-0001-per-section-freezing.md` |
| `docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md` | `docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md` |
| `docs/decisions/debt/TDR-0003-dependencia-local-do-nucleo.md` | `docs/decisions/debt/TDR-0003-local-dependency-on-the-core.md` |
| `docs/superpowers/plans/2026-08-24-living-docs-toolkit-fase-2.md` | `docs/superpowers/plans/2026-08-24-living-docs-toolkit-phase-2.md` |
| `docs/superpowers/plans/2026-08-25-living-docs-toolkit-fase-3.md` | `docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-3.md` |
| `docs/superpowers/plans/2026-08-25-living-docs-toolkit-fase-4.md` | `docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-4.md` |
| `docs/superpowers/plans/2026-08-25-living-docs-toolkit-fase-5.md` | `docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-5.md` |
| `docs/superpowers/plans/2026-08-26-living-docs-toolkit-fase-6.md` | `docs/superpowers/plans/2026-08-26-living-docs-toolkit-phase-6.md` |
| `docs/superpowers/plans/2026-08-27-living-docs-toolkit-fase-7.md` | `docs/superpowers/plans/2026-08-27-living-docs-toolkit-phase-7.md` |
| `docs/superpowers/plans/2026-08-28-fechamento-do-toolkit.md` | `docs/superpowers/plans/2026-08-28-toolkit-closing.md` |
| `docs/superpowers/plans/2026-09-01-execucao-no-host.md` | `docs/superpowers/plans/2026-09-01-host-execution.md` |
| `docs/superpowers/plans/2026-09-15-fronteira-de-leitor.md` | `docs/superpowers/plans/2026-09-15-reader-boundary.md` |
| `docs/superpowers/plans/2026-09-16-rastro-interno-do-toolkit.md` | `docs/superpowers/plans/2026-09-16-toolkit-internal-trail.md` |
| `docs/superpowers/plans/2026-09-17-nucleo-de-ownership.md` | `docs/superpowers/plans/2026-09-17-ownership-core.md` |
| `docs/superpowers/plans/2026-09-18-migracao-do-living-docs-para-packages.md` | `docs/superpowers/plans/2026-09-18-moving-living-docs-to-packages.md` |
| `docs/superpowers/plans/2026-09-28-living-docs-sobre-o-nucleo.md` | `docs/superpowers/plans/2026-09-28-living-docs-on-the-core.md` |
| `docs/superpowers/plans/BACKLOG-fases-3-7.md` | `docs/superpowers/plans/BACKLOG-phases-3-7.md` |
| `docs/superpowers/specs/2026-08-28-fechamento-do-toolkit-design.md` | `docs/superpowers/specs/2026-08-28-toolkit-closing-design.md` |
| `docs/superpowers/specs/2026-09-01-execucao-no-host-design.md` | `docs/superpowers/specs/2026-09-01-host-execution-design.md` |
| `docs/superpowers/specs/2026-09-10-fronteira-de-leitor-design.md` | `docs/superpowers/specs/2026-09-10-reader-boundary-design.md` |
| `docs/superpowers/specs/2026-09-15-rastro-interno-do-toolkit-design.md` | `docs/superpowers/specs/2026-09-15-toolkit-internal-trail-design.md` |
| `docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md` | `docs/superpowers/specs/2026-09-17-ownership-core-design.md` |
| `docs/superpowers/specs/2026-09-18-living-docs-sobre-o-nucleo-design.md` | `docs/superpowers/specs/2026-09-18-living-docs-on-the-core-design.md` |
| `docs/superpowers/specs/2026-09-18-migracao-do-living-docs-para-packages-design.md` | `docs/superpowers/specs/2026-09-18-moving-living-docs-to-packages-design.md` |
| `docs/superpowers/research/2026-09-16-nucleo-de-ownership-de-artefatos.md` | `docs/superpowers/research/2026-09-16-artifact-ownership-core.md` |

New files created by this plan: `ADR-0031-repository-language.md`, `ADR-0032-toolkit-does-not-choose-document-language.md`, `ADR-0033-one-time-editorial-migration-of-frozen-artifacts.md`, `ADR-0034-retire-the-lexical-trigger-threshold.md` (all in `docs/decisions/adr/`).

**Frozen files** (the ADR-0033 mechanism applies to exactly these): ADR-0001 (`superseded`), ADR-0003, ADR-0004, ADR-0005, ADR-0007, ADR-0008, ADR-0009, ADR-0010, ADR-0014, ADR-0016, ADR-0020 (`accepted`), TDR-0002 (`paid`), plus any file a human promotes to a frozen state before phase 4 (re-check with `grep -m1 "^status:" docs/decisions/adr/*.md docs/decisions/debt/*.md` at the start of Task 15).

## Review Focus

1. **A consumer keeps Portuguese table columns but forgets `field-map`.** A `resolved` open decision then reads as "resolved without a resolver". The error must say the column is missing and point to `field-map`, not only that the value is empty — pinned in Task 8.
2. **The human marker in other casings, and look-alike words.** `Human`, `HUMAN` and `human` inside a longer clause must pass; `humans` and the Portuguese `humana` must not count as the marker — pinned in Task 6.
3. **A `trigger` that is present but blank.** A whitespace-only `trigger` must still fail as an empty required field once cadence detection is gone — pinned in Task 5.
4. **A consumer seeded by `living-docs init` after this change.** The seeded open-decisions table and `.ownership.yml` must work together with no `field-map`: a resolved row filled in the seeded columns validates clean — pinned in Task 14.
5. **Words that used to mean "empty".** A table cell reading `nenhum`/`nenhuma` is now an ordinary value; only structural empties (`—`, `-`, `n/a`, blank) are empty, in any language — pinned in Task 7.

---

## Phase 1 — Decisions

### Task 1: ADR-0031 and ADR-0032

**Files:**
- Create: `docs/decisions/adr/ADR-0031-repository-language.md`
- Create: `docs/decisions/adr/ADR-0032-toolkit-does-not-choose-document-language.md`

**Interfaces:**
- Consumes: the ADR template `packages/living-docs/templates/adr.md` (frontmatter shape: `id`, `title`, `status`, `owner`, `trigger`, `last-reviewed`, `relates-to`, `supersedes`, `superseded-by`; sections Context / Alternatives considered / Decision / Consequences → What we gain / What we accept to lose).
- Produces: ADR-0031 and ADR-0032 in `draft`, cited by later commits.

- [ ] **Step 1: Write ADR-0031**

```markdown
---
id: ADR-0031
title: Repository language
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [RN-0010]
supersedes: null
superseded-by: null
---

# ADR-0031 — Repository language

## Context

The repository is written in Portuguese — docs, decisions, requirements,
comments, test names and commit messages — while identifiers, file names and
IDs are English. The toolkit it builds is meant to be installed by teams that
do not read Portuguese, and every contributor or agent working here has to
switch languages between the code and the text that explains it.

## Alternatives considered

1. **Keep Portuguese prose.** Discarded: it keeps the repository closed to
   contributors who do not read Portuguese, and it keeps the toolkit's own
   shipped text in a language its consumers may not share.
2. **Bilingual text.** Discarded: two copies of every rule drift apart, and
   the older copy wins by repetition.
3. **English for everything versioned from now on.** Chosen.

## Decision

All versioned text in this repository is English: documents, decisions,
requirements, comments, test names, assertion messages, workflow step names
and commit messages. This replaces the language section of `CONTRIBUTING.md`,
which asked for prose and commits in Portuguese. No check enforces it; review
does.

## Consequences

### What we gain

One language between the code and the text that explains it, and a repository
readable by anyone who installs the toolkit.

### What we accept to lose

`git log` before this decision is in Portuguese and is not rewritten, so the
history reads in two languages.
```

- [ ] **Step 2: Write ADR-0032**

```markdown
---
id: ADR-0032
title: The toolkit does not choose the language of consumer documents
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0031, RN-0002, RN-0017]
supersedes: null
superseded-by: null
---

# ADR-0032 — The toolkit does not choose the language of consumer documents

## Context

Some checks read prose: `living-docs/frontmatter` rejects a `trigger` that
contains cadence vocabulary from a Portuguese and English word list,
`living-docs/trigger-routing` counts word roots shared between a `trigger` and
a skill `description`, and `living-docs/done-verifiable` accepts the
Portuguese `humana` as the human-verification marker. Each of these ties the
result of a check to the language the consumer writes in.

## Alternatives considered

1. **Word lists per language.** Discarded: every new language is a code change,
   and a list in two languages already misses the third.
2. **A `language:` setting and bundled translations of seeds and messages.**
   Discarded: it makes the toolkit own a decision that belongs to the team, and
   every translation is one more copy to keep in step.
3. **Checks read structure only; document content follows the session.**
   Chosen.

## Decision

Plugin output — CLI, hooks, check messages — is English. The content of a
consumer's documents follows the language of the user's session; the plugins
say nothing about it, and that silence is the decision. No skill carries an
instruction about which language to write in.

Checks read only structure: frontmatter, IDs, table keys through `field-map`,
and fixed markers such as `human` and `Docs: none —`. They never read headings
or prose. A seed written by `living-docs init` without an agent stays in
English until a keeper skill replaces it with real content; that is the
accepted degraded path.

## Consequences

### What we gain

A consumer can keep the whole corpus in any language without a check failing
because of that language, and no check needs a word list to be maintained.

### What we accept to lose

Checks can no longer judge wording: a `trigger` written as a calendar cadence
passes. Judging wording belongs to the agent and the reviewer.
```

- [ ] **Step 3: Verify**

Run: `node --conditions=development packages/living-docs/src/cli/index.ts validate`
Expected: no error finding for `ADR-0031` or `ADR-0032` (drafts need no `relates-to`; if the command fails for another, pre-existing reason, record the output and compare with the same command on `master` — it must not be new).

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/adr/ADR-0031-repository-language.md docs/decisions/adr/ADR-0032-toolkit-does-not-choose-document-language.md
git commit -m "docs(ADR-0031): record repository language and consumer document language as drafts

Opens ADR-0031 and ADR-0032 as draft.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: ADR-0033, after probing `living-docs/append-only`

**Files:**
- Create: `docs/decisions/adr/ADR-0033-one-time-editorial-migration-of-frozen-artifacts.md`
- Create (scratch, not committed): `<scratchpad>/probe-append-only.ts`

**Interfaces:**
- Consumes: `decideAppendOnly(payload: HookPayload, env: HookEnv): HookDecision` from `packages/living-docs/src/hooks/append-only.ts`; `hookEnv()` / `HookEnv` from `packages/living-docs/src/hooks/lib/io.ts`.
- Produces: ADR-0033 (`draft`), which records the mechanism phase 4 uses for frozen files.

- [ ] **Step 1: Write the probe**

Read `packages/living-docs/src/hooks/lib/io.ts` for the exact shape of `HookEnv` (it carries `root` and `hostRoots`). Write the probe in the scratchpad directory (absolute imports into the repository):

```ts
import { decideAppendOnly } from '<repo>/packages/living-docs/src/hooks/append-only.ts'
import { hookEnv } from '<repo>/packages/living-docs/src/hooks/lib/io.ts'

const env = { ...hookEnv(), root: '<repo>' }
const frozen = '<repo>/docs/decisions/adr/ADR-0003-duas-raizes-toolkit-e-repositorio.md'
const renamed = '<repo>/docs/decisions/adr/ADR-0003-two-roots-toolkit-and-repository.md'

// (a) editing the body of a frozen file in place
console.log('in place:', JSON.stringify(decideAppendOnly({ tool_name: 'Write', tool_input: { file_path: frozen, content: '---\nid: ADR-0003\nstatus: accepted\n---\n\ntranslated\n' } }, env)))
// (b) writing the translation at the new English slug, which does not exist yet
console.log('new path:', JSON.stringify(decideAppendOnly({ tool_name: 'Write', tool_input: { file_path: renamed, content: '---\nid: ADR-0003\nstatus: accepted\n---\n\ntranslated\n' } }, env)))
```

Replace `<repo>` with the absolute repository root (forward slashes).

- [ ] **Step 2: Run the probe**

Run: `node --conditions=development <scratchpad>/probe-append-only.ts` from the repository root.
Expected (from reading `append-only.ts`: a path that cannot be read is treated as a new item): `in place: {"action":"deny",...}` and `new path: {"action":"allow"}`. Also check whether the `living-docs` plugin hooks are active in this session at all (`.claude/settings.json` enables only `ownership@esliph`); note it in the ADR's context. If the output differs from the expectation, write the ADR from the actual output — the ADR records what the guard does, not what this plan expected.

- [ ] **Step 3: Write ADR-0033**

Fill the "How the commits pass the guard" paragraph from the probe output. With the expected output, the ADR reads:

```markdown
---
id: ADR-0033
title: One-time editorial migration of frozen artifacts
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0031, RN-0006]
supersedes: null
superseded-by: null
---

# ADR-0033 — One-time editorial migration of frozen artifacts

## Context

ADR-0031 moves every versioned text to English. Accepted and superseded ADRs
and paid TDRs are frozen: their body does not change, and
`living-docs/append-only` denies an edit to it. Translating them in place is
exactly the edit the guard exists to stop. Leaving them in Portuguese keeps
the decision history — the part of the corpus most often read to understand
why — in a language the rest of the repository no longer uses.

## Alternatives considered

1. **Leave frozen artifacts in Portuguese.** Discarded: the history of
   decisions is the asset, and a history nobody reads is not one.
2. **Supersede every frozen ADR with an English copy.** Discarded: it doubles
   the ADR count with decisions that decide nothing new, and every citation
   would have to choose between two IDs for one decision.
3. **Relax the guard in code for translations.** Discarded: a permanent
   exception for "translation" is an exception anyone can claim.
4. **One-time translation under this ADR, same ID and meaning.** Chosen.

## Decision

Accepted ADRs, paid TDRs, published RELs and `docs/superpowers/` specs and
plans may be translated to English **once**: same ID, same decision, same
meaning, same frontmatter values except prose fields, same `last-reviewed`,
slug renamed to English. This is valid only for the commits of the English
migration, each of which cites ADR-0033 and lists the IDs it touches. It does
not repeat: a later correction of a frozen artifact follows the normal path —
a new item that supersedes it.

**How the commits pass the guard.** The probe of `living-docs/append-only`
showed: an in-place write to a frozen file is denied; a write to a path that
does not exist yet is allowed, because the guard treats it as a new item. The
migration therefore writes each translated frozen file at its new English slug
and removes the Portuguese path with `git rm` in the same commit. No code
changes, and the guard is not disabled at any point.

## Consequences

### What we gain

The whole decision history reads in one language, under the IDs every citation
already uses.

### What we accept to lose

Git does not follow a translated file across the rename (the content differs
too much for rename detection), so `git log --follow` on a frozen artifact
stops at the migration commit; the Portuguese original is the parent of that
commit. A reviewer has to trust the translation against the original, per
family commit.
```

- [ ] **Step 4: Verify**

Run: `node --conditions=development packages/living-docs/src/cli/index.ts validate`
Expected: no new error finding for ADR-0033.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0033-one-time-editorial-migration-of-frozen-artifacts.md
git commit -m "docs(ADR-0033): record the one-time migration of frozen artifacts as draft

Records how living-docs/append-only reacts to translated frozen files,
from a probe of the guard.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: ADR-0034 and the requirements it touches

**Files:**
- Create: `docs/decisions/adr/ADR-0034-retire-the-lexical-trigger-threshold.md`
- Modify: `docs/decisions/adr/ADR-0013-os-dois-limiares-do-fechamento.md` (frontmatter `superseded-by` only — ADR-0013 is `draft`, not frozen)
- Modify: `docs/requirements/rules.md` (RN-0002, RN-0017, RN-0029; append RN-0038, RN-0039)

**Interfaces:**
- Produces: ADR-0034 (`draft`), RN-0038 and RN-0039 (`draft`). Phase 2 tests cite RN-0002, RN-0017, RN-0038, RN-0039 and ADR-0034.

- [ ] **Step 1: Write ADR-0034**

```markdown
---
id: ADR-0034
title: Retire the lexical trigger threshold
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0032, RN-0027, RN-0029]
supersedes: [ADR-0013]
superseded-by: null
revokes: [RN-0029]
---

# ADR-0034 — Retire the lexical trigger threshold

## Context

ADR-0013 holds two thresholds. The first — a branch diff in which three or
more documents change only `last-reviewed` fails — reads structure. The
second — a document's `trigger` and its owning skill's `description` must
share at least two word roots — reads prose, and only works when both are
written in the same language. Under ADR-0032 no check reads prose, so the
second threshold goes, and an accepted-or-draft ADR is not edited: it is
superseded.

## Alternatives considered

1. **Keep the root threshold and translate the skill descriptions.** Discarded:
   a consumer writing in any other language fails it by construction.
2. **Semantic similarity between trigger and description.** Discarded for the
   reason ADR-0009 gave: a number nobody can explain in a PR is guessing.
3. **Supersede ADR-0013 in full and restate the part that survives.** Chosen.

## Decision

**Mass `last-reviewed` bump: three documents.** Restated from ADR-0013
unchanged. A branch diff in which **three or more** documents change **only**
the `last-reviewed` line, and nothing else in their body, fails. The number is
configurable as `last-reviewed-bump-limit` in the ownership file. The unit is
the branch diff, not the commit, and there is no escape label.

**Trigger similarity: retired.** `living-docs/trigger-routing` no longer
compares a `trigger` with a skill `description`. It keeps only its structural
part: a document with a `trigger` whose declared owning skill does not exist
in the toolkit root produces a warning, never a failure. The `trigger` of a
collection item is still not examined.

RN-0029 is revoked by this decision.

## Consequences

### What we gain

A check result that no longer depends on the language of the `trigger` or of
the skill `description`.

### What we accept to lose

A document whose `trigger` and owning skill talk about different events is no
longer caught by any check; the mismatch is left to the agent and the
reviewer.
```

- [ ] **Step 2: Close the pairs on ADR-0013 and RN-0029**

`living-docs/citation-coverage` requires both sides of `supersedes`/`superseded-by` and `revokes`/`revoked-by` in the same tree. In `ADR-0013-os-dois-limiares-do-fechamento.md` change only the frontmatter line `superseded-by: null` to `superseded-by: ADR-0034`. Do not change `status` (moving it to `superseded` is the human's act at Checkpoint A) and do not change `last-reviewed`.

In `docs/requirements/rules.md`, under `## RN-0029`, add the bullet `- **revoked-by:** ADR-0034` directly below `- **status:** draft`. Leave `status` as it is (the human sets `revoked`).

- [ ] **Step 3: Update RN-0002 and RN-0017, add RN-0038 and RN-0039**

In `docs/requirements/rules.md`:

RN-0002 — replace the bullet `- **fora de escopo:** a redação do gatilho; o que se exige é a natureza dele` with:

```markdown
- **fora de escopo:** a redação do gatilho; o que se exige é a natureza dele. No check judges the wording: the check only requires `trigger` to be present and non-empty, and the nature of the event is judged by the agent and the reviewer
```

RN-0017 — in the body, replace `ou a palavra que marca verificação humana` with ``ou o marcador fixo `human` ``.

Append at the end of the file:

```markdown
## RN-0038 — No check depends on the language of a document's prose

- **status:** draft
- **relates-to:** ADR-0032, ADR-0034
- **fora de escopo:** the machine vocabulary a check reads — frontmatter keys, state names, IDs, the fixed markers `human` and `Docs: none —` — which is structure and is the same in every language

A check reads the structure of a document — frontmatter, IDs, table columns
through `field-map`, fixed markers — and never its headings or prose. A corpus
written entirely in another language produces exactly the findings the same
corpus would produce in English.

## RN-0039 — A missing canonical table column points to `field-map`

- **status:** draft
- **relates-to:** ADR-0032, RN-0038
- **fora de escopo:** a column that exists and is empty, which is reported as an empty value

When a check needs a canonical field of a collection item and the item has no
such column or bullet, the finding says the field is missing and tells how to
declare the project's own name for it under `field-map` in the ownership file.
```

(Bullet keys `fora de escopo` stay as the rest of the file writes them until Task 18 translates the file; the new prose is English.)

- [ ] **Step 4: Verify**

Run: `node --conditions=development packages/living-docs/src/cli/index.ts validate`
Expected: no `living-docs/citation-coverage` error about an open pair for ADR-0013/ADR-0034 or RN-0029/ADR-0034, and no `living-docs/id-integrity` error for RN-0038/RN-0039. If `citation-coverage` rejects `revokes` in ADR frontmatter, read `PAIRS` in `packages/living-docs/src/checks/citation-coverage.ts` and adjust the field name to the one it reads — do not change the check.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0034-retire-the-lexical-trigger-threshold.md docs/decisions/adr/ADR-0013-os-dois-limiares-do-fechamento.md docs/requirements/rules.md
git commit -m "docs(ADR-0034): retire the lexical trigger threshold and add the language rules

ADR-0034 supersedes ADR-0013 and revokes RN-0029 (states left to a human).
RN-0002 and RN-0017 updated; RN-0038 and RN-0039 opened as draft.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Checkpoint A — human review of the decisions

- [ ] **Stop and ask the human** to review ADR-0031, ADR-0032, ADR-0033, ADR-0034, the RN-0002/RN-0017 edits and RN-0038/RN-0039. Promotion is theirs: accepting ADRs, moving ADR-0013 to `superseded`, RN-0029 to `revoked`. Phase 2 may start once the human says the rules stand as written (acceptance is not required for phase 2). ADR-0033 must be **accepted** before phase 4 (Checkpoint B). If the human changes a decision, re-read it before continuing — later tasks follow the decision, not this plan.

---

## Phase 2 — Behavior

Every change starts with a failing test that cites the rule governing it. New test names and assertion messages are English; existing Portuguese tests in the touched files are translated in phase 5, not here.

Watched paths: editing `packages/living-docs/src/checks/**` makes `ownership/commit-guard` ask about `docs/requirements/rules.md` and `CHANGELOG.md`. The rules changed in Task 3 of this branch, and the CHANGELOG entry lands in Task 21; answer the prompt with that and continue.

### Task 4: `living-docs/trigger-routing` keeps only the structural part

**Files:**
- Modify: `packages/living-docs/src/checks/trigger-routing.ts`
- Modify: `packages/living-docs/src/checks/catalog.ts` (entry `living-docs/trigger-routing`)
- Regenerate: `docs/contracts/checks.gen.md`
- Test: `packages/living-docs/test/checks/trigger-routing.test.ts`

**Interfaces:**
- Consumes: `routedDocs(context: CheckContext): RoutedDoc[]`, `loadSkillDescriptions(root?: string): Map<string, string>` (unchanged).
- Produces: `livingDocsTriggerRouting(descriptions?: ReadonlyMap<string, string>): Check` — same signature; emits only `warning` findings. Removed exports: `ROOT_FLOOR`, `ROOT_LENGTH`, `SHARED_ROOTS_FLOOR`, `rootsOf`, `sharedRoots`.

- [ ] **Step 1: Write the failing test and drop the tests of the removed behavior**

In `trigger-routing.test.ts`:
- Change the import line to `import { livingDocsTriggerRouting, loadSkillDescriptions } from '../../src/checks/trigger-routing.ts'`.
- Delete the tests `'RN-0029: gatilho que fala de outro evento reprova, nomeando os dois'` and `'ADR-0013: a raiz e a palavra de cinco letras ou mais, truncada em seis'`.
- Replace the last test (`'ADR-0013: a raiz do toolkit e legivel, ...'`) with the dogfood test below.
- Add the new behavior test.

```ts
test('ADR-0034, RN-0038: a trigger in any wording passes when the owning skill exists', () => {
  const tree = {
    // Shares no word with the decision-recorder description, in any language.
    'docs/open-decisions.md': container('When the production deploy breaks.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  }

  withTempRepo(tree, root => {
    assert.deepEqual(livingDocsTriggerRouting(DESCRICOES).run(contextFor(root)), [])
  })
})

test('ADR-0034: the toolkit root is readable, and every pair of this repository has its owning skill', () => {
  const descriptions = loadSkillDescriptions(toolkitRoot())

  assert.ok(descriptions.size >= 8, `only ${descriptions.size} skills read from the toolkit root`)
  assert.ok((descriptions.get('release-historian') ?? '').length > 0, 'the release-historian description was not read')

  const findings = runValidate(checkoutRoot()).findings.filter(f => f.ruleId === 'living-docs/trigger-routing')

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})
```

Also change the name of the kept warning test from `'RN-0029: skill dona ausente da raiz do toolkit avisa e segue'` to `'ADR-0034: an owning skill missing from the toolkit root warns and moves on'`, and `'RN-0029: gatilho e description que falam do mesmo evento passam'` / `'RN-0029: documento sem trigger no frontmatter nao e achado'` to cite `ADR-0034` instead of `RN-0029` (RN-0029 is being revoked).

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/living-docs && node --conditions=development --test test/checks/trigger-routing.test.ts`
Expected: FAIL — the new "any wording" test gets one `error` finding ("falam de eventos diferentes").

- [ ] **Step 3: Implement**

In `trigger-routing.ts`:
- Delete `ROOT_FLOOR`, `ROOT_LENGTH`, `SHARED_ROOTS_FLOOR`, `rootsOf`, `sharedRoots` and the `normalizeProse` import.
- Replace the JSDoc of `livingDocsTriggerRouting` and its `run` with:

```ts
/**
 * `living-docs/trigger-routing` — trigger routing. A document with a `trigger`
 * names an owning skill; when the toolkit root has no skill by that name, the
 * trigger cannot be routed and the check warns. It never compares the wording
 * of the `trigger` with the skill `description`: that would tie the result to
 * the language both are written in (ADR-0034, RN-0038).
 *
 * Descriptions are injected, like the runner in `ownership/generated-drift`:
 * the default reads the toolkit root, and the test passes a map.
 */
export function livingDocsTriggerRouting(descriptions: ReadonlyMap<string, string> = loadSkillDescriptions()): Check {
  return {
    id: RULE,
    name: 'trigger routing',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      for (const routed of routedDocs(context)) {
        if (descriptions.has(routed.skill)) {
          continue
        }

        // A warning, not a failure: a project may declare its own skill, and
        // failing on that would demand that every owner come from the plugin.
        findings.push({
          ruleId: RULE,
          file: routed.file,
          line: routed.line,
          severity: 'warning',
          message:
            `\`${routed.file}\` declara \`${routed.skill}\` como skill dona, e a raiz do toolkit não tem uma ` +
            'skill com esse nome — o gatilho deste documento não pôde ser cruzado com o roteamento.',
          fix:
            `Se \`${routed.skill}\` é skill deste projeto, não há nada a fazer. Se era para ser do toolkit, ` +
            'confira o nome em `skills/`, na raiz do toolkit.',
        })
      }

      return findings
    },
  }
}
```

(The message stays Portuguese here; Task 10 translates every message of this package in one pass.)

In `catalog.ts`, replace the `failsWhen` of `living-docs/trigger-routing` with:

```ts
    failsWhen:
      'Never fails. Warns when a document with a `trigger` declares an owning skill that the toolkit root does not have; the `trigger` of a collection item is not examined.',
```

- [ ] **Step 4: Regenerate the contract and run the tests**

Run: `node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md` (from the repository root)
Run: `npm test && npm run typecheck`
Expected: PASS. `test/contracts/drift.test.ts` passes because the generated file matches the catalog.

- [ ] **Step 5: Commit**

```bash
git add packages/living-docs/src/checks/trigger-routing.ts packages/living-docs/src/checks/catalog.ts packages/living-docs/test/checks/trigger-routing.test.ts docs/contracts/checks.gen.md
git commit -m "feat(ADR-0034): trigger-routing only warns about a missing owning skill

Removes the shared-root comparison between trigger and skill description
(RN-0038). The catalog and the generated contract describe the new condition.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: `living-docs/frontmatter` stops judging cadence

**Files:**
- Modify: `packages/living-docs/src/docs/schema.ts` (remove `CADENCE_PATTERNS`, `findCadence`)
- Modify: `packages/living-docs/src/checks/frontmatter.ts`
- Modify: `packages/living-docs/src/checks/catalog.ts` (entry `living-docs/frontmatter`)
- Regenerate: `docs/contracts/checks.gen.md`
- Test: `packages/living-docs/test/checks/frontmatter.test.ts`, `packages/living-docs/test/docs/schema.test.ts`

**Interfaces:**
- Produces: `schema.ts` no longer exports `findCadence`. `livingDocsFrontmatter` unchanged in shape.

- [ ] **Step 1: Write the failing tests**

In `frontmatter.test.ts`, replace the test `'RN-0002: trigger com cadência falha nomeando o campo e o termo — critério de aceite 3'` with:

```ts
test('RN-0002, RN-0038: a trigger worded as a cadence is not judged by the check', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'review quarterly',
      'last-reviewed': '2026-08-21',
    }),
  })

  assert.deepEqual(findings, [])
})

test('RN-0002: a trigger that is only whitespace is an empty required field', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: "'   '",
      'last-reviewed': '2026-08-21',
    }),
  })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/frontmatter')
  assert.equal(findings[0]?.severity, 'error')
  assert.match(findings[0]?.message ?? '', /`trigger`/)
})
```

In `schema.test.ts`, remove `findCadence` from the import list and delete the two tests `'findCadence reprova ...'` and `'findCadence aprova ...'`.

- [ ] **Step 2: Run to verify the cadence test fails**

Run: `cd packages/living-docs && node --conditions=development --test test/checks/frontmatter.test.ts`
Expected: FAIL — `'review quarterly'` produces one finding (`quarterly` is in the word list). The whitespace test already passes; it pins the behavior that must survive.

- [ ] **Step 3: Implement**

In `schema.ts` delete the `CADENCE_PATTERNS` constant, its JSDoc and `findCadence`.

In `frontmatter.ts` remove `findCadence` from the import and delete the whole `if (isFilled(data.trigger)) { … }` block. The required-field loop already reports an empty `trigger`.

In `catalog.ts`, in the `failsWhen` of `living-docs/frontmatter`, replace ``; `trigger` ausente ou descrevendo cadência;`` with ``; `trigger` ausente ou vazio;``. (Task 10 translates the rest of the sentence.)

- [ ] **Step 4: Regenerate and run**

Run: `node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md`
Run: `npm test && npm run typecheck`
Expected: PASS. If another test imported `findCadence` (`grep -rn findCadence packages` must return nothing), remove that usage.

- [ ] **Step 5: Commit**

```bash
git add packages/living-docs/src/docs/schema.ts packages/living-docs/src/checks/frontmatter.ts packages/living-docs/src/checks/catalog.ts packages/living-docs/test/checks/frontmatter.test.ts packages/living-docs/test/docs/schema.test.ts docs/contracts/checks.gen.md
git commit -m "feat(RN-0002): frontmatter requires a trigger and no longer judges its wording

Removes the cadence word list (RN-0038, ADR-0032).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: `living-docs/done-verifiable` accepts only `human`

**Files:**
- Modify: `packages/living-docs/src/checks/done-verifiable.ts`
- Modify: `packages/living-docs/src/checks/catalog.ts` (entry `living-docs/done-verifiable`)
- Regenerate: `docs/contracts/checks.gen.md`
- Modify: `docs/definition-of-done.md` (marker word only)
- Modify: `packages/living-docs/templates/definition-of-done.md` (marker word only)
- Modify: `packages/living-docs/skills/working-agreements-keeper/SKILL.md` (the instruction that names the marker)
- Test: `packages/living-docs/test/checks/done-verifiable.test.ts`, `packages/living-docs/test/docs/maintenance.test.ts`, `packages/living-docs/test/distribution/single-rule.test.ts`

**Interfaces:**
- Produces: `dodItemsWithoutVerification(source: string): { text: string; line: number }[]` — unchanged signature; the marker is `\bhuman\b`, case-insensitive.

- [ ] **Step 1: Write the failing test**

Add to `done-verifiable.test.ts`:

```ts
test('RN-0017, RN-0038: the human-verification marker is the fixed word `human`, in any case', () => {
  const source = [
    '- [ ] reviewed by a person — verification: human.',
    '- [ ] reviewed by a person — verification: Human.',
    '- [ ] reviewed by a person — verification: HUMAN, at the release.',
    '- [ ] reviewed by humans.',
  ].join('\n')

  assert.deepEqual(
    dodItemsWithoutVerification(source).map(item => item.line),
    [4],
  )
})

test('RN-0017: the old localized marker is no longer the marker', () => {
  // Built from parts so the repository keeps a single non-English fixture.
  const localized = ['hum', 'ana'].join('')

  assert.equal(dodItemsWithoutVerification(`- [ ] Something — verification: ${localized}.`).length, 1)
})
```

In the existing test `'dodItemsWithoutVerification aceita ID de check, de hook e a marca humana'`, change the line `'- [ ] com pessoa — verificação: humana.',` to `'- [ ] com pessoa — verificação: human.',`.

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/living-docs && node --conditions=development --test test/checks/done-verifiable.test.ts`
Expected: FAIL — "the old localized marker" test gets 0 items instead of 1.

- [ ] **Step 3: Implement**

In `done-verifiable.ts`:

```ts
/**
 * Verification vocabulary of a Definition of Done item (RN-0017): the
 * identifier of a check or hook (`plugin/name`), of an agent or skill, or the
 * fixed marker `human`. The marker is a fixed word and not a language: a
 * Definition of Done in any language names human verification with it
 * (RN-0038). Numbered `CI-n`/`HK-n` no longer count.
 */
const VERIFICATION = /\b(?:AG|SK)-\d+\b|\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|\bhuman\b/i
```

In the `fix` of the finding, replace `ou a palavra que marca verificação humana.` with ``ou o marcador fixo `human`.``.

In `catalog.ts`, replace the `failsWhen` of `living-docs/done-verifiable` with:

```ts
    failsWhen: 'A Definition of Done item does not name what verifies it — the identifier of a check or hook, or the fixed marker `human`.',
```

- [ ] **Step 4: Move this repository and the seed to the marker**

- `docs/definition-of-done.md`: in each checkbox line, replace the word `humana` with `human` (lines 16, 19, 20, 31, 32 at the time of writing). Do not touch `last-reviewed` or anything else.
- `packages/living-docs/templates/definition-of-done.md`: same replacement (lines 16, 19, 20, 25).
- `packages/living-docs/skills/working-agreements-keeper/SKILL.md`: where the skill tells the agent to write `"humana"` explicitly (around line 65) and in the checklist line that lists `` `CI-n`, `HK-n`, ou "humana" explícita `` (around line 93), name the marker as `` `human` `` instead.
- `packages/living-docs/test/docs/maintenance.test.ts`: in `'spec §12 criterios 9 e 10: ...'`, change the regex `/verificacao: humana|verificação: humana/` to `/verificação: human\b/`.
- `packages/living-docs/test/distribution/single-rule.test.ts`: in the DoD fixture (around line 68), change `verificação: humana.` to `verificação: human.`.

- [ ] **Step 5: Regenerate and run**

Run: `node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md`
Run: `npm test && npm run typecheck`
Run: `node --conditions=development packages/living-docs/src/cli/index.ts validate`
Expected: PASS, and no `living-docs/done-verifiable` finding on this repository.

- [ ] **Step 6: Commit**

```bash
git add packages/living-docs/src/checks/done-verifiable.ts packages/living-docs/src/checks/catalog.ts docs/contracts/checks.gen.md docs/definition-of-done.md packages/living-docs/templates/definition-of-done.md packages/living-docs/skills/working-agreements-keeper/SKILL.md packages/living-docs/test/checks/done-verifiable.test.ts packages/living-docs/test/docs/maintenance.test.ts packages/living-docs/test/distribution/single-rule.test.ts
git commit -m "feat(RN-0017): done-verifiable accepts only the fixed marker human

This repository's Definition of Done, the seed and the working-agreements
skill move to the marker (RN-0038).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Empty values are structural, not words

The spec's section 4 table does not list this, but it falls under "every check that reads prose in a specific language stops doing so": the core and `blocked.ts` treat the Portuguese words `nenhum`/`nenhuma` as an empty cell.

**Files:**
- Modify: `packages/ownership/src/schema/item.ts` (`EMPTY`)
- Modify: `packages/living-docs/src/docs/blocked.ts` (`EMPTY`)
- Test: `packages/ownership/test/schema/item.test.ts`, `packages/living-docs/test/docs/blocked.test.ts`

**Interfaces:**
- Produces: `isEmptyValue(value: string): boolean` (exported by `@esliph/ownership`) — true only for `''`, `-`, `—`, `–`, `n/a`, `na`, `null` (case-insensitive, trimmed).

- [ ] **Step 1: Write the failing tests**

In `packages/ownership/test/schema/item.test.ts` (import `isEmptyValue` from `'../../src/schema/item.ts'` if it is not imported yet):

```ts
test('RN-0038: an empty cell is structural — a word in any language is a value', () => {
  for (const empty of ['', '  ', '-', '—', '–', 'n/a', 'N/A', 'na', 'null']) {
    assert.equal(isEmptyValue(empty), true, `should be empty: "${empty}"`)
  }
  for (const word of ['nenhum', 'nenhuma', 'none', 'ninguno']) {
    assert.equal(isEmptyValue(word), false, `should be a value: "${word}"`)
  }
})
```

In `packages/living-docs/test/docs/blocked.test.ts`:

```ts
test('RN-0038: a word in the Blocks column is a declared path, whatever the language', () => {
  const table = TABELA.replace('| DA-0003 | Sem caminho declarado | open | — | — |', '| DA-0003 | Sem caminho declarado | open | — | nenhum |')

  withTempRepo({ [OWNERSHIP_FILE]: CONFIG, 'docs/open-decisions.md': table }, root => {
    const config = loadLivingDocsConfig(root)
    const claim = blockedClaims(collectArtifacts(root, config)).find(c => c.id === 'DA-0003')

    assert.deepEqual(claim?.paths, ['nenhum'])
  })
})
```

(`nenhum` is the exact word this task stops treating as special; it stays in these two tests as a literal value, not as prose. Phase 5 keeps it.)

- [ ] **Step 2: Run to verify they fail**

Run: `cd packages/ownership && node --conditions=development --test test/schema/item.test.ts`
Run: `cd packages/living-docs && node --conditions=development --test test/docs/blocked.test.ts`
Expected: both FAIL (`nenhum` is empty today).

- [ ] **Step 3: Implement**

`packages/ownership/src/schema/item.ts`:

```ts
// Empty is structural: a dash, a placeholder or nothing. A word meaning "none"
// is a value, because which word means "none" depends on the language (RN-0038).
const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'null'])
```

`packages/living-docs/src/docs/blocked.ts`:

```ts
const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na'])
```

- [ ] **Step 4: Run all tests**

Run: `npm test && npm run typecheck`
Expected: PASS. If a test elsewhere relied on `nenhum` being empty, change its fixture to `—` (the structural empty) — do not restore the word.

- [ ] **Step 5: Commit**

```bash
git add packages/ownership/src/schema/item.ts packages/ownership/test/schema/item.test.ts packages/living-docs/src/docs/blocked.ts packages/living-docs/test/docs/blocked.test.ts
git commit -m "fix(RN-0038): empty cells are structural, not Portuguese words

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: A missing canonical column points to `field-map`

**Files:**
- Modify: `packages/living-docs/src/config/ownership.ts` (add `hasField`)
- Modify: `packages/living-docs/src/checks/citation-coverage.ts`
- Test: `packages/living-docs/test/checks/citation-coverage.test.ts`, `packages/living-docs/test/config/ownership.test.ts`

**Interfaces:**
- Consumes: `fieldOf(rule: ArtifactRule, item: DocItem, canonical: string): string | null`.
- Produces: `hasField(rule: ArtifactRule, item: DocItem, canonical: string): boolean` exported from `packages/living-docs/src/config/ownership.ts` — true when the item carries the field (column or bullet, even empty), after `field-map`.

- [ ] **Step 1: Write the failing tests**

In `test/config/ownership.test.ts` (next to the `fieldOf` test; reuse that test's way of building a rule and an item — read it first):

```ts
test('RN-0039: hasField tells a missing column from an empty one, through field-map', () => {
  const mapped = configFrom(yaml(ADR.replace('append-only: true', "field-map: { resolved-by: 'Resolvida por' }")))
  const rule = mapped.artifacts[0]!
  const item = { key: 'X-1', state: 'resolved', line: 1, fields: { 'resolvida por': '' } }

  assert.equal(hasField(rule, item, 'resolved-by'), true)
  assert.equal(hasField(rule, item, 'blocks'), false)
})
```

In `test/checks/citation-coverage.test.ts`:

```ts
const CONFIG_WITHOUT_FIELD_MAP = CONFIG.replace('      field-map:\n        resolved-by: "Resolvida por"\n', '')

test('RN-0039: a resolved decision in a table without the canonical column points to field-map', () => {
  const tree = {
    [OWNERSHIP_FILE]: CONFIG_WITHOUT_FIELD_MAP,
    'docs/open-decisions.md': decisions('| DA-0001 | Gap | resolved | ADR-0001 | 2026-08-24 |'),
    'docs/decisions/adr/ADR-0001-x.md': adr('ADR-0001', 'accepted', ['relates-to: [DA-0001]']),
  }

  withTempRepo(tree, root => {
    const found = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === 'docs/open-decisions.md')

    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.match(found[0]?.fix ?? '', /field-map/)
    assert.match(found[0]?.fix ?? '', /resolved-by/)
  })
})

test('RN-0039: an existing but empty column is an empty value, with no field-map hint', () => {
  const tree = {
    [OWNERSHIP_FILE]: CONFIG,
    'docs/open-decisions.md': decisions('| DA-0001 | Gap | resolved | — | 2026-08-24 |'),
  }

  withTempRepo(tree, root => {
    const found = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === 'docs/open-decisions.md')

    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.doesNotMatch(found[0]?.fix ?? '', /field-map/)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd packages/living-docs && node --conditions=development --test test/config/ownership.test.ts test/checks/citation-coverage.test.ts`
Expected: FAIL — `hasField` is not exported; the first citation test finds no `field-map` in the fix.

- [ ] **Step 3: Implement `hasField`**

In `packages/living-docs/src/config/ownership.ts`, directly below `fieldOf`:

```ts
/**
 * Whether the item carries a canonical field at all — a column or a bullet,
 * even an empty one — honouring the artifact's `field-map`. Tells "the table
 * has no such column" apart from "the cell is empty" (RN-0039).
 */
export function hasField(rule: ArtifactRule, item: DocItem, canonical: string): boolean {
  const key = rule.fieldMap[normalizeFieldKey(canonical)] ?? normalizeFieldKey(canonical)

  return item.fields[key] !== undefined
}
```

- [ ] **Step 4: Use it in `citation-coverage`**

In `citation-coverage.ts`:
- Import: `import { fieldOf, hasField } from '../config/ownership.ts'`.
- Add to `interface Entry`:

```ts
  /** True when a collection item has no such field at all; per-file entries never lack one here. */
  lacks(canonical: string): boolean
```

- In `entriesOf`, per-file entries get `lacks: () => false`; collection items get `lacks: canonical => !hasField(doc.rule, item, canonical)`.
- Add the helper:

```ts
/**
 * The hint for a field the item does not carry at all: the project may name
 * the column in its own words, and `field-map` is where it says so (RN-0039).
 */
function missingFieldHint(entry: Entry, canonical: string): string {
  if (!entry.lacks(canonical)) {
    return ''
  }

  return (
    ` ${entry.file} has no \`${canonical}\` field. If the project names it differently, declare it under ` +
    `\`field-map\` in this artifact's entry of the ownership file: \`field-map: { ${canonical}: '<your column>' }\`.`
  )
}
```

- Append `missingFieldHint(entry, 'revoked-by')` to the `fix` of the "revoked without `revoked-by`" finding, and `missingFieldHint(entry, 'resolved-by')` to the `fix` of the "`resolved` without saying what resolved it" finding (string concatenation at the end of each existing `fix`).

- [ ] **Step 5: Run all tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/living-docs/src/config/ownership.ts packages/living-docs/src/checks/citation-coverage.ts packages/living-docs/test/config/ownership.test.ts packages/living-docs/test/checks/citation-coverage.test.ts
git commit -m "feat(RN-0039): a missing canonical column points to field-map

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Acceptance — a Portuguese corpus fails nothing because of its language

**Files:**
- Create: `packages/living-docs/test/acceptance/language-independence.test.ts`

**Interfaces:**
- Consumes: `runValidate(root: string): ValidateResult` (`findings: Finding[]`), `withTempRepo`, `OWNERSHIP_FILE`.

This file is the only non-English text the repository keeps (spec section 4). Its header comment says so in English.

- [ ] **Step 1: Write the test**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runValidate } from '../../src/cli/validate.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

/**
 * RN-0038: no check depends on the language of a document's prose.
 *
 * The corpus below is written entirely in Portuguese — headings, prose,
 * triggers (one of them worded as a cadence), a Definition of Done, and an
 * open-decisions table whose columns reach the checks through `field-map`.
 * It is the only non-English text in this repository, and it exists to prove
 * the rule: every finding it produces would be produced in English too.
 */
const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisoes/adr/
    owner: "@equipe"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: docs/decisoes-em-aberto.md
    owner: "@equipe"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Situação }
    living-docs:
      id-prefix: DA
      field-map:
        resolved-by: "Resolvida por"
        blocks: "Bloqueia"
        gap: "Lacuna"
  - path: docs/requisitos/regras.md
    owner: "@equipe"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
  - path: docs/definicao-de-pronto.md
    owner: "@equipe"
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
  - path: docs/glossario.md
    owner: "@equipe"
    skill: glossary-keeper
    living-docs: {}
`

const ADR = [
  '---',
  'id: ADR-0001',
  'title: Arredondamento bancário de centavos',
  'status: accepted',
  'owner: "@equipe"',
  'trigger: >',
  '  Nunca. Imutável após aceito; uma decisão nova o supersede.',
  'last-reviewed: 2026-09-01',
  'relates-to: [DA-0001]',
  'supersedes: null',
  'superseded-by: null',
  '---',
  '',
  '# ADR-0001 — Arredondamento bancário de centavos',
  '',
  '## Contexto',
  '',
  'A cobrança arredondava de três jeitos diferentes.',
  '',
  '## Decisão',
  '',
  'Todo valor monetário usa arredondamento bancário.',
  '',
].join('\n')

const DECISOES = [
  '---',
  'title: Decisões em aberto',
  'owner: "@equipe"',
  'trigger: >',
  '  Revisar mensalmente, e toda vez que alguém trombar numa lacuna.',
  'last-reviewed: 2026-09-01',
  '---',
  '',
  '# Decisões em aberto',
  '',
  '| ID | Lacuna | Situação | Resolvida por | Bloqueia | Aberta em |',
  '| --- | --- | --- | --- | --- | --- |',
  '| DA-0001 | Como arredondar centavos | resolved | ADR-0001 | — | 2026-08-28 |',
  '| DA-0002 | Fuso horário do fechamento | open | — | `src/fechamento/**` | 2026-08-30 |',
  '',
].join('\n')

const REGRAS = [
  '---',
  'title: Regras de negócio',
  'owner: "@equipe"',
  'trigger: >',
  '  Antes de implementar qualquer comportamento, e a cada regra nova ou alterada.',
  'last-reviewed: 2026-09-01',
  '---',
  '',
  '# Regras de negócio',
  '',
  '## RN-0001 — Valor monetário nunca é ponto flutuante',
  '',
  '- **status:** draft',
  '',
  'Todo valor em reais é guardado em centavos inteiros.',
  '',
].join('\n')

const PRONTO = [
  '---',
  'title: Definição de pronto',
  'owner: "@equipe"',
  'trigger: >',
  '  Quando muda o que significa estar pronto.',
  'last-reviewed: 2026-09-01',
  '---',
  '',
  '# Definição de pronto',
  '',
  '- [ ] O frontmatter está completo — verificação: `living-docs/frontmatter`.',
  '- [ ] A regra veio antes do código — verificação: human.',
  '',
].join('\n')

const GLOSSARIO = [
  '---',
  'title: Glossário',
  'owner: "@equipe"',
  'trigger: >',
  '  Termo novo do domínio em código, especificação ou conversa.',
  'last-reviewed: 2026-09-01',
  '---',
  '',
  '# Glossário',
  '',
  '| Termo | Definição |',
  '| --- | --- |',
  '| Centavo | A menor unidade de valor guardada |',
  '',
].join('\n')

const TREE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/decisoes/adr/ADR-0001-arredondamento-bancario.md': ADR,
  'docs/decisoes-em-aberto.md': DECISOES,
  'docs/requisitos/regras.md': REGRAS,
  'docs/definicao-de-pronto.md': PRONTO,
  'docs/glossario.md': GLOSSARIO,
}

test('RN-0038: a corpus written entirely in Portuguese fails no check', () => {
  withTempRepo(TREE, root => {
    const errors = runValidate(root).findings.filter(finding => finding.severity === 'error')

    assert.deepEqual(errors, [], JSON.stringify(errors, null, 2))
  })
})

test('RN-0038: the Portuguese triggers route to their owning skills without a warning', () => {
  withTempRepo(TREE, root => {
    const routing = runValidate(root).findings.filter(finding => finding.ruleId === 'living-docs/trigger-routing')

    assert.deepEqual(routing, [], JSON.stringify(routing, null, 2))
  })
})

test('RN-0038: the resolved decision is read through field-map, in its own column names', () => {
  // Without the map the same corpus fails, and the failure names field-map —
  // structure, not language, decides the result (RN-0039).
  const unmapped = OWNERSHIP.replace(/      field-map:\n(?:        .*\n)+/, '')

  withTempRepo({ ...TREE, [OWNERSHIP_FILE]: unmapped }, root => {
    const coverage = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === 'docs/decisoes-em-aberto.md')

    assert.equal(coverage.length, 1, JSON.stringify(coverage, null, 2))
    assert.match(coverage[0]?.fix ?? '', /field-map/)
  })
})
```

- [ ] **Step 2: Run it**

Run: `cd packages/living-docs && node --conditions=development --test test/acceptance/language-independence.test.ts`
Expected: PASS (tasks 4–8 are in). If an error appears, read it: a finding caused by language (cadence, roots, `humana`, a Portuguese word read as a value) is a bug in tasks 4–8 — fix the check, never the fixture. A finding caused by structure (a missing required field, a malformed ID) is a fixture mistake — fix the fixture's structure and keep its Portuguese.

(Tasks 4–8 each showed their own failing test first; this file is the proof over a whole corpus, so it is expected to pass on arrival.)

- [ ] **Step 3: Run all tests and commit**

Run: `npm test && npm run typecheck`
Expected: PASS.

```bash
git add packages/living-docs/test/acceptance/language-independence.test.ts
git commit -m "test(RN-0038): a Portuguese corpus fails no check because of its language

The only non-English text kept in the repository.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 3 — What the plugins ship

Apply the Translation Rules. In this phase "translate" means the text a consumer sees: `message`, `fix` and `reason` strings of findings and hook decisions, CLI output, thrown error messages (`OwnershipError` and friends), skill/command/agent/template text, manifests. Code comments stay for phase 5 unless they sit inside a string. Every test assertion that pinned a Portuguese message is updated in the same commit to the English text it now pins (same specificity: a regex on a Portuguese phrase becomes a regex on its English translation).

RN-0031 applies to every string translated here: no artifact ID, no `spec §n`, no `docs/superpowers/` path.

### Task 10: `living-docs` check, docs and config messages

**Files:**
- Modify: every `message`/`fix` string and thrown error text in `packages/living-docs/src/checks/*.ts`, `packages/living-docs/src/docs/*.ts`, `packages/living-docs/src/ids/*.ts`, `packages/living-docs/src/config/*.ts`, `packages/living-docs/src/frontmatter/*.ts`, `packages/living-docs/src/git/*.ts`, `packages/living-docs/src/core/*.ts`
- Modify: `packages/living-docs/src/checks/catalog.ts` (`failsWhen` of every entry), then regenerate `docs/contracts/checks.gen.md`
- Test: every test under `packages/living-docs/test/` whose assertion pins one of these strings

- [ ] **Step 1: List the strings**

Run: `grep -rnE "message:|fix:|reason:|new [A-Za-z]*Error\(|fail\(" packages/living-docs/src/checks packages/living-docs/src/docs packages/living-docs/src/ids packages/living-docs/src/config packages/living-docs/src/frontmatter packages/living-docs/src/git packages/living-docs/src/core`
Every hit whose text is Portuguese is in scope, including multi-line concatenations below the hit.

- [ ] **Step 2: Translate the strings and the catalog**

Translate each string in place. Keep interpolations, backticks and the `(skill dona: …)` suffix as `(owning skill: …)`. Translate every `failsWhen` in `catalog.ts` (the `CatalogEntry.failsWhen` JSDoc "A coluna 'Falha quando'" becomes "The 'Fails when' column"). Example of the expected shape:

```ts
error(doc.file, 1, 'Missing frontmatter — every living-documentation artifact opens with the standard YAML block.', 'Add `id`, `title`, `status`, `owner`, `trigger` and `last-reviewed` between `---` at the top.')
```

- [ ] **Step 3: Run tests and fix the pinned assertions**

Run: `npm test`
Expected: failures only in assertions that pinned Portuguese text. Update each to the English text. Re-run until PASS.

- [ ] **Step 4: Regenerate, typecheck, validate**

Run: `node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md`
Run: `npm test && npm run typecheck && node --conditions=development packages/living-docs/src/cli/index.ts validate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/living-docs/src packages/living-docs/test docs/contracts/checks.gen.md
git commit -m "feat(ADR-0032): living-docs check and configuration messages in English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: `living-docs` hook, CLI and generator output

**Files:**
- Modify: `packages/living-docs/src/hooks/*.ts`, `packages/living-docs/src/hooks/lib/*.ts`, `packages/living-docs/src/cli/*.ts`, `packages/living-docs/src/tools/gen-checks.ts` (`HEADER` and the table header `| ID | Check | Falha quando | Comando |` → `| ID | Check | Fails when | Command |`), `packages/living-docs/src/exec/*.ts`
- Modify: `packages/living-docs/hooks/run-hook.sh` (any echoed text)
- Regenerate: `docs/contracts/checks.gen.md`
- Test: tests under `packages/living-docs/test/hooks`, `test/cli`, `test/contracts`, `test/acceptance` that pin these strings

- [ ] **Step 1: List the strings**

Run: `grep -rnE "reason:|message:|fix:|console\.|process\.std(out|err)\.write|Error\(|echo " packages/living-docs/src/hooks packages/living-docs/src/cli packages/living-docs/src/tools packages/living-docs/src/exec packages/living-docs/hooks`

- [ ] **Step 2: Translate**

Translate every user-facing string, including CLI `--help` text, report headings in `src/cli/report.ts`, and the denial text of `append-only`, `state-promotion`, `open-decision-guard`, `shortcut-debt`, `session-inventory`. Example (`append-only.ts`):

```ts
const what = diff.bodyChanged ? 'the body of the document' : `the field ${forbidden.map(field => `\`${field}\``).join(', ')}`
```

- [ ] **Step 3: Run tests and fix the pinned assertions**

Run: `npm test` — update Portuguese pins to the English text until PASS.

- [ ] **Step 4: Regenerate, typecheck, validate**

Run: `node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md`
Run: `npm test && npm run typecheck && node --conditions=development packages/living-docs/src/cli/index.ts validate && node --conditions=development packages/ownership/src/cli/index.ts validate`
Expected: PASS; `ownership/generated-drift` sees no drift.

- [ ] **Step 5: Commit**

```bash
git add packages/living-docs/src packages/living-docs/hooks packages/living-docs/test docs/contracts/checks.gen.md
git commit -m "feat(ADR-0032): living-docs hook, CLI and generator output in English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: `ownership` messages

**Files:**
- Modify: user-facing strings in `packages/ownership/src/**` (`checks`, `hooks`, `cli`, `core`, `schema`, `resolve`, `triggers`, `lifecycle`), `packages/ownership/src/checks/catalog.ts` (`CORE_CHECK_CATALOG` `failsWhen`), `packages/ownership/hooks/run-hook.sh`
- Regenerate: `docs/contracts/checks.gen.md` (it includes the core catalog)
- Test: tests under `packages/ownership/test/**` that pin these strings (e.g. `test/hooks/commit-guard.test.ts` pins `/decisão humana/i`)

- [ ] **Step 1: List the strings**

Run: `grep -rnE "reason:|message:|fix:|console\.|process\.std(out|err)\.write|Error\(|fail\(|echo " packages/ownership/src packages/ownership/hooks`

- [ ] **Step 2: Translate**, keeping interpolations. Example (`commit-guard.ts`):

```ts
'Update the doc now and run `git add` again — or, if the change really does not affect the doc, say it is a human decision and go on.',
```

- [ ] **Step 3: Run tests and fix the pinned assertions** (`npm test` until PASS; `/decisão humana/i` becomes `/human decision/i`).

- [ ] **Step 4: Regenerate, typecheck, validate**

Run: `node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md`
Run: `npm test && npm run typecheck && node --conditions=development packages/ownership/src/cli/index.ts validate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ownership/src packages/ownership/hooks packages/ownership/test docs/contracts/checks.gen.md
git commit -m "feat(ADR-0032): ownership check, hook and CLI messages in English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: Skills

**Files:**
- Modify: `packages/living-docs/skills/*/SKILL.md` (8 files: body and frontmatter `description`)
- Test: `packages/living-docs/test/plugin/authoring.test.ts` and any test that reads a skill

- [ ] **Step 1: Translate each SKILL.md**, body and `description`. Section headings keep their order; the checklist items end in "— verification: human" or a `plugin/name` identifier. Do **not** add any sentence about which language to write documents in (ADR-0032). The `description` keeps every trigger symptom it lists today, translated (for `decision-recorder`: "why", "gap", "debt").

- [ ] **Step 2: Update the pins in `authoring.test.ts`**

The required section headings the test lists become their English translations as written in Step 1. The `decision-recorder` description test becomes:

```ts
test('decision-recorder: the description names the symptoms of decision, gap and debt', () => {
  const description = String(parseFrontmatter(skillSource('decision-recorder'))?.data.description ?? '')

  assert.match(description, /Use when/i)
  for (const symptom of ['why', 'gap', 'debt']) {
    assert.ok(description.toLowerCase().includes(symptom), `the description should contain the symptom "${symptom}"`)
  }
})
```

The checklist regex drops the gender comment and becomes `/\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|\bhuman\b/i`.

- [ ] **Step 3: Verify**

Run: `npm test && node --conditions=development packages/living-docs/src/cli/index.ts validate`
Expected: PASS; `test/distribution/internal-trail.test.ts` passes (no ID or spec section introduced).

- [ ] **Step 4: Commit**

```bash
git add packages/living-docs/skills packages/living-docs/test
git commit -m "feat(ADR-0032): skills in English, with no instruction about document language

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 14: Commands, agents, templates and manifests

**Files:**
- Modify: `packages/living-docs/commands/*.md` (7), `packages/living-docs/agents/*.md` (2), `packages/living-docs/templates/*` (20, including `CODEOWNERS`, `ids-retired.txt`, `workflow.yml` step names and comments, `ownership.yml` comments)
- Modify: `packages/living-docs/templates/open-decisions.md` — canonical English columns
- Modify: `packages/living-docs/templates/ownership.yml` — remove the `field-map` block and its comment
- Modify: `packages/living-docs/.claude-plugin/plugin.json`, `packages/ownership/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (`description` fields)
- Test: `packages/living-docs/test/cli/*` (init), `test/acceptance/consumer-repo.test.ts`, `test/plugin/manifest.test.ts`, `test/distribution/*` — whatever pins these texts

**Interfaces:**
- Produces: seeded open-decisions header `| ID | Gap | Status | Resolved-by | Blocks | Opened |`, which the checks read without `field-map` (`normalizeFieldKey` lowercases `Resolved-by` to the canonical `resolved-by`).

- [ ] **Step 1: Write the failing test (Review Focus 4)**

In `packages/living-docs/test/acceptance/consumer-repo.test.ts` (reuse its `OPTIONS`, `runInit`, `runValidate`, `withTempRepo`; read how the other tests there call `runInit` and locate the seeded open-decisions path through the seeded `.ownership.yml`):

```ts
test('RN-0039: a freshly seeded repository reads a resolved decision without field-map', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)

    const ownership = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    assert.doesNotMatch(ownership, /field-map/)

    const decisionsPath = /- path: (\S*open-decisions\.md)/.exec(ownership)?.[1]

    assert.ok(decisionsPath, 'the seeded ownership file declares the open-decisions table')

    const decisions = join(root, decisionsPath)
    const seeded = readFileSync(decisions, 'utf8')
    const newline = seeded.endsWith('\n') ? '' : '\n'

    writeFileSync(decisions, `${seeded}${newline}| DA-0001 | A gap | resolved | — | — | 2026-09-29 |\n`)

    const coverage = runValidate(root).findings.filter(f => f.ruleId === 'living-docs/citation-coverage' && f.file === decisionsPath)

    // The row names no resolver: the finding is about the empty value, and it
    // must not claim the column is missing.
    assert.equal(coverage.length, 1, JSON.stringify(coverage, null, 2))
    assert.doesNotMatch(coverage[0]?.fix ?? '', /field-map/)
  })
})
```

Run: `cd packages/living-docs && node --conditions=development --test test/acceptance/consumer-repo.test.ts`
Expected: FAIL — the seed still has `field-map` (and Portuguese columns).

- [ ] **Step 2: Translate and restructure the templates**

`templates/open-decisions.md` becomes (frontmatter placeholders unchanged):

```markdown
---
title: Open Decisions
owner: "{{OWNER}}"
trigger: >
  Every time someone runs into a gap — behavior with no written rule.
last-reviewed: {{TODAY}}
---

# Open Decisions

What has **not** been decided yet. While an item is here it has no rule and
**must not be implemented** — the way out is the ID, not the code.

The **Blocks** column is optional: when it lists the paths the gap prevents
from being implemented, `living-docs/open-decision-guard` asks on edit and
`living-docs/open-decision-claim` fails on the diff. Empty (`—`), the decision
is still valid and blocks nothing.

| ID | Gap | Status | Resolved-by | Blocks | Opened |
| --- | --- | --- | --- | --- | --- |
```

In `templates/ownership.yml`, delete the three comment lines and the `field-map:` block under the DA entry (lines 36–41 at the time of writing), then translate the remaining comments. Translate every other template, command and agent per the Translation Rules; placeholders (`{{ID}}`, `{{OWNER}}`, …) are untouched. Translate the three manifest `description` fields.

- [ ] **Step 3: Run the tests and fix the pins**

Run: `npm test` — the new test passes; update other pins (template headings, init output) to the English text until PASS.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && node --conditions=development packages/living-docs/src/cli/index.ts validate && node --conditions=development packages/ownership/src/cli/index.ts validate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/living-docs/commands packages/living-docs/agents packages/living-docs/templates packages/living-docs/.claude-plugin packages/ownership/.claude-plugin .claude-plugin packages/living-docs/test
git commit -m "feat(ADR-0032): commands, agents, seeds and manifests in English

The seeded open-decisions table uses canonical column names, so the seeded
ownership file needs no field-map (RN-0039).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Checkpoint B — ADR-0033 accepted

- [ ] **Stop and ask the human** to accept ADR-0033 (and whichever of ADR-0031/0032/0034 they choose). Do not start phase 4 until `grep -m1 "^status:" docs/decisions/adr/ADR-0033-*.md` prints `status: accepted`. Re-read ADR-0033 as accepted: if the human changed the mechanism for frozen files, Tasks 15–17 follow the ADR, not this plan.

---

## Phase 4 — This repository's corpus

Apply the Translation Rules and the Slug Map. Each commit is one family; its body lists every ID it touches and cites ADR-0033, so `living-docs/commit-discipline` finds a cited ID for every changed artifact.

**Renaming mechanics.**
- Non-frozen file: `git mv <old> <new>`, then edit the file at `<new>`.
- Frozen file (list in the Slug Map section, re-checked at the start of Task 15): write the translated content at `<new>` with the Write tool (a new path), then `git rm <old>`, in the same commit — the mechanism ADR-0033 records.

**After every commit in this phase:**

```bash
node --conditions=development packages/living-docs/src/cli/index.ts validate
node --conditions=development packages/ownership/src/cli/index.ts validate
npm test
```

and for every renamed file, `git grep -n "<old file name without directory>"` must print nothing (it catches references from code comments, tests and documents that `living-docs/links` does not read). Fix every hit in the same commit.

### Task 15: ADR-0001 to ADR-0015

**Files:** the 15 ADR files ADR-0001…ADR-0015 (renamed per the Slug Map), plus every file whose link or path reference to them breaks.

- [ ] **Step 1: Re-check the frozen list**

Run: `grep -m1 -H "^status:" docs/decisions/adr/*.md docs/decisions/debt/*.md`
Every `accepted`/`superseded`/`paid` file is frozen for this phase.

- [ ] **Step 2: Translate and rename** ADR-0001…ADR-0015 per the rules and the mechanics above. ADR-0013 keeps its frontmatter values as they are now (including `superseded-by: ADR-0034` and whatever `status` the human set).

- [ ] **Step 3: Fix references** (`git grep` for each old file name; update links in docs, code comments and tests).

- [ ] **Step 4: Verify** with the phase block. Expected: all green, no `living-docs/links` finding.

- [ ] **Step 5: Commit**

```bash
git add -A docs/decisions/adr packages docs CLAUDE.md CONTRIBUTING.md README.md
git commit -m "docs(ADR-0033): translate ADR-0001 to ADR-0015 to English

One-time editorial migration under ADR-0033. IDs, decisions, states and
last-reviewed unchanged; slugs renamed to English.
IDs: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0007,
ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0015.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 16: ADR-0016 to ADR-0030

Same procedure as Task 15 — repeated here in full because tasks may be read out of order.

- [ ] **Step 1: Translate and rename** ADR-0016…ADR-0030 per the Translation Rules, the Slug Map and the renaming mechanics (ADR-0016 and ADR-0020 are frozen: Write at the new path, then `git rm` the old one). ADR-0031…ADR-0034 are already English; only fix their links to renamed files, and if one of them changes, add its ID to the commit body's list.
- [ ] **Step 2: Fix references** — `git grep -n "<old file name>"` for each of the 15 renamed files must print nothing.
- [ ] **Step 3: Verify** with the phase block. Expected: all green.
- [ ] **Step 4: Commit**

```bash
git add -A docs/decisions/adr packages docs CLAUDE.md CONTRIBUTING.md README.md
git commit -m "docs(ADR-0033): translate ADR-0016 to ADR-0030 to English

One-time editorial migration under ADR-0033. IDs, decisions, states and
last-reviewed unchanged; slugs renamed to English.
IDs: ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0020, ADR-0021, ADR-0022,
ADR-0023, ADR-0024, ADR-0025, ADR-0026, ADR-0027, ADR-0028, ADR-0029, ADR-0030.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 17: TDR family

- [ ] **Step 1: Translate and rename** TDR-0001, TDR-0002 (frozen, `paid`: Write at the new path, then `git rm`), TDR-0003 per the Translation Rules and the Slug Map. `pay-when` values are machine-readable (patterns and paths) and do not change.
- [ ] **Step 2: Fix references** — `git grep -n "<old file name>"` for each must print nothing.
- [ ] **Step 3: Verify** with the phase block; `living-docs/staleness` must produce the same findings as before the commit.
- [ ] **Step 4: Commit**

```bash
git add -A docs/decisions/debt packages docs CLAUDE.md CONTRIBUTING.md README.md
git commit -m "docs(ADR-0033): translate TDR-0001 to TDR-0003 to English

One-time editorial migration under ADR-0033.
IDs: TDR-0001, TDR-0002, TDR-0003.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 18: Requirements

**Files:** `docs/requirements/rules.md`, `docs/requirements/functional.md`, `docs/requirements/non-functional.md`

- [ ] **Step 1: Translate** the three files. Bullet `- **fora de escopo:**` becomes `- **out of scope:**` (Rule 5); machine bullets stay. Titles of sections keep the `ID — title` form.
- [ ] **Step 2: Fix test pins** — `npm test`; tests that quote a requirement heading or phrase get the English text.
- [ ] **Step 3: Verify** with the phase block. Expected: `living-docs/citation-coverage` findings unchanged.
- [ ] **Step 4: Commit** with a body listing every RN, RF and RNF ID in the three files (`grep -oE "^## (RN|RF|RNF)-[0-9]+" docs/requirements/*.md` produces the list) and citing ADR-0033:

```bash
git add docs/requirements packages
git commit -m "docs(ADR-0033): translate business rules, functional and non-functional requirements

IDs: <paste the list from the grep above, comma-separated>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 19: Open decisions table, without `field-map`

The spec puts the `field-map` removal in phase 5, but the English columns and the map cannot coexist: the map would send the check to a column (`resolvida por`) that no longer exists and DA-0001 would fail. Both change in this commit.

**Files:** `docs/open-decisions.md`, `.ownership.yml` (DA entry)

- [ ] **Step 1: Translate** `docs/open-decisions.md`: frontmatter prose, intro, and the header `| ID | Lacuna | Status | Resolvida por | Bloqueia | Aberta em |` → `| ID | Gap | Status | Resolved-by | Blocks | Opened |`; translate the Gap cells. Row order, IDs, states, resolver IDs and paths unchanged.
- [ ] **Step 2: Remove the map** — in `.ownership.yml`, delete from the DA entry the two comment lines above `field-map:` and the `field-map:` block with its three keys.
- [ ] **Step 3: Verify** with the phase block. Expected: DA-0001, DA-0002 and DA-0006 still resolve to their ADRs; DA-0004 still claims `packages/ownership/src/hooks/promotion-guard.ts`.
- [ ] **Step 4: Commit**

```bash
git add docs/open-decisions.md .ownership.yml
git commit -m "docs(ADR-0033): open decisions table in English with canonical columns

The canonical column names make this repository's field-map unnecessary.
IDs: DA-0001, DA-0002, DA-0003, DA-0004, DA-0005, DA-0006, DA-0007.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 20: Plain documents

**Files:** `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `docs/glossary.md`, `docs/charter/constitution.md`, `docs/charter/vision.md`, `docs/contracts/errors.md`, `docs/contracts/versioning-policy.md`, `docs/definition-of-done.md`, `docs/deprecations.md`, `docs/ids-retired.txt` (comments), `CODEOWNERS` (comments), `.ownership.yml` (comments and `reason:` strings)

- [ ] **Step 1: Translate** each file. Specifics:
  - `CONTRIBUTING.md` — the section `## Idioma` becomes:

    ```markdown
    ## Language

    Everything versioned here is English: prose, comments, test names and
    commit messages. Commit messages use the form `type(ID): subject`.
    ```
  - `docs/glossary.md` — header `| Term | Definition | Name in code | Not to be confused with | Source | Status |`; term names per the vocabulary table in the Translation Rules.
  - `docs/charter/constitution.md` — `## Princípios` → `## Principles`, `## Log de emendas` → `## Amendment log`; amendment entries ending in `— humana` end in `— human`.
  - `README.md` and `docs/deprecations.md` are `audience: external`: no artifact IDs.
  - `CLAUDE.md` — translate; it stays an index (no content copied in).
- [ ] **Step 2: Fix test pins** — `npm test`; `test/docs/language-and-intent.test.ts` pins `Termo`, `## Princípios`, `## Log de emendas` and other headings: set them to the English headings.
- [ ] **Step 3: Verify** with the phase block. Expected: no `living-docs/agent-contract-duplication`, `living-docs/external-audience` or `living-docs/links` finding.
- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md CONTRIBUTING.md README.md docs/glossary.md docs/charter docs/contracts/errors.md docs/contracts/versioning-policy.md docs/definition-of-done.md docs/deprecations.md docs/ids-retired.txt CODEOWNERS .ownership.yml packages
git commit -m "docs(ADR-0031): working agreements, glossary, charter and contracts in English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 21: CHANGELOG

**Files:** `CHANGELOG.md`

- [ ] **Step 1: Translate the existing entries** (link to Keep a Changelog becomes `https://keepachangelog.com/en/1.1.0/`). Existing entries that cite internal IDs (`CI-9`, `CI-10`) keep what they say but — being `audience: external` — must not cite a declared artifact prefix; `CI-n` is not a declared prefix, keep them as they are translated.
- [ ] **Step 2: Add the entry** under `## [Unreleased]`, in the sections it belongs to:

```markdown
### Changed

- Every message of the CLI, the hooks and the checks, and every seed written
  by `living-docs init`, is now in English. The content of your documents
  stays in whatever language you write it in: no check reads headings or
  prose, and the toolkit has no language setting.
- `living-docs/done-verifiable` accepts only the fixed marker `human` for a
  Definition of Done item verified by a person.
- The seeded open-decisions table uses the canonical column names
  (`Resolved-by`, `Blocks`, `Gap`), so a new ownership file needs no
  `field-map`. A table without a canonical column now says so and points to
  `field-map`.

### Removed

- `living-docs/frontmatter` no longer rejects a `trigger` worded as a calendar
  cadence; it only requires `trigger` to be present and non-empty.
- `living-docs/trigger-routing` no longer compares the words of a `trigger`
  with the owning skill's description; it only warns when the owning skill
  does not exist.
- Table cells reading `nenhum` or `nenhuma` are no longer treated as empty;
  use `—`, `-` or `n/a`.
```

- [ ] **Step 3: Verify** with the phase block. Expected: no `living-docs/external-audience` finding; `ownership validate --base master` reports no missing CHANGELOG entry for consumer-visible paths.
- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(ADR-0032): changelog in English, with the language-independence entry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 22: `docs/superpowers/` specs and research

**Files:** the 8 Portuguese specs in `docs/superpowers/specs/` and the 3 research documents in `docs/superpowers/research/` (the spec of this plan is already English).

- [ ] **Step 1: Translate and rename** per the Slug Map (`git mv`, then edit — these are documents, not frozen artifacts). `2026-08-24-living-documentation-toolkit.md` keeps its name: `CLAUDE.md` and many code comments point to it.
- [ ] **Step 2: Fix references** — `git grep -n "<old file name>"` for each renamed file must print nothing.
- [ ] **Step 3: Verify** with the phase block.
- [ ] **Step 4: Commit**

```bash
git add -A docs/superpowers packages docs CLAUDE.md
git commit -m "docs(ADR-0033): translate the superpowers specs and research to English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 23: Plans, batch 1

Files: `2026-08-24-living-docs-toolkit-core.md` (keeps its name), `2026-08-24-living-docs-toolkit-fase-2.md`, `2026-08-25-living-docs-toolkit-fase-3.md` (all in `docs/superpowers/plans/`).

- [ ] **Step 1: Translate and rename** per the Translation Rules and the Slug Map (`git mv`, then edit). Code blocks: comments and string literals only (Rule 3). Checkbox states (`- [x]` / `- [ ]`) unchanged.
- [ ] **Step 2: Fix references** — `git grep -n "<old file name>"` for each renamed file must print nothing.
- [ ] **Step 3: Verify** with the phase block.
- [ ] **Step 4: Commit**

```bash
git add -A docs/superpowers packages docs
git commit -m "docs(ADR-0033): translate the toolkit core and phase 2-3 plans to English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 24: Plans, batch 2

Files: `2026-08-25-living-docs-toolkit-fase-4.md`, `2026-08-25-living-docs-toolkit-fase-5.md`, `2026-08-26-living-docs-toolkit-fase-6.md`, `BACKLOG-fases-3-7.md`.

- [ ] **Step 1: Translate and rename** per the Translation Rules and the Slug Map (`git mv`, then edit; code blocks: comments and string literals only; checkbox states unchanged).
- [ ] **Step 2: Fix references** — `git grep -n "<old file name>"` for each must print nothing.
- [ ] **Step 3: Verify** with the phase block.
- [ ] **Step 4: Commit**

```bash
git add -A docs/superpowers packages docs
git commit -m "docs(ADR-0033): translate the phase 4-6 plans and the backlog to English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 25: Plans, batch 3

Files: `2026-08-27-living-docs-toolkit-fase-7.md`, `2026-08-28-fechamento-do-toolkit.md`.

- [ ] **Step 1: Translate and rename** per the Translation Rules and the Slug Map (`git mv`, then edit; code blocks: comments and string literals only; checkbox states unchanged).
- [ ] **Step 2: Fix references** — `git grep -n "<old file name>"` for each must print nothing.
- [ ] **Step 3: Verify** with the phase block.
- [ ] **Step 4: Commit**

```bash
git add -A docs/superpowers packages docs
git commit -m "docs(ADR-0033): translate the phase 7 and toolkit closing plans to English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 26: Plans, batch 4

Files: `2026-09-01-execucao-no-host.md`, `2026-09-01-wrapper-docker.md` (keeps its name), `2026-09-15-fronteira-de-leitor.md`, `2026-09-16-rastro-interno-do-toolkit.md`, `2026-09-18-migracao-do-living-docs-para-packages.md`.

- [ ] **Step 1: Translate and rename** per the Translation Rules and the Slug Map (`git mv`, then edit; code blocks: comments and string literals only; checkbox states unchanged).
- [ ] **Step 2: Fix references** — `git grep -n "<old file name>"` for each must print nothing.
- [ ] **Step 3: Verify** with the phase block.
- [ ] **Step 4: Commit**

```bash
git add -A docs/superpowers packages docs
git commit -m "docs(ADR-0033): translate the host execution, wrapper, reader boundary, trail and migration plans

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 27: Plans, batch 5

Files: `2026-09-17-nucleo-de-ownership.md`, `2026-09-28-living-docs-sobre-o-nucleo.md`.

- [ ] **Step 1: Translate and rename** per the Translation Rules and the Slug Map (`git mv`, then edit; code blocks: comments and string literals only; checkbox states unchanged).
- [ ] **Step 2: Fix references** — `git grep -n "<old file name>"` for each must print nothing.
- [ ] **Step 3: Verify** with the phase block.
- [ ] **Step 4: Commit**

```bash
git add -A docs/superpowers packages docs
git commit -m "docs(ADR-0033): translate the ownership core and living-docs-on-the-core plans

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 5 — Internal code and closing

Comments, JSDoc, `test()` names, assertion messages and fixture prose become English. Behavior does not change: the full suite is the verifier, and the test count must be identical before and after each task (`npm test 2>&1 | grep -E "^# (tests|pass|fail)"`). Fixture strings are translated too, except the `language-independence.test.ts` fixture and the literal `nenhum` values of Task 7.

### Task 28: `living-docs` source comments

**Files:** every `.ts` under `packages/living-docs/src/`, `packages/living-docs/hooks/run-hook.sh` comments.

- [ ] **Step 1: Record the test count** — `npm test 2>&1 | grep -E "^# (tests|pass|fail)"`.
- [ ] **Step 2: Translate** comments and JSDoc. References such as `(`ADR-0013`)` in comments stay as IDs; references to superseded rules keep the ID the comment is about.
- [ ] **Step 3: Verify** — `npm test && npm run typecheck`; same test count; `node --conditions=development packages/living-docs/src/cli/index.ts validate` green.
- [ ] **Step 4: Commit**

```bash
git add packages/living-docs/src packages/living-docs/hooks
git commit -m "chore(ADR-0031): living-docs source comments in English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 29: `living-docs` tests

**Files:** every `.ts` under `packages/living-docs/test/` except `test/acceptance/language-independence.test.ts`.

- [ ] **Step 1: Record the test count.**
- [ ] **Step 2: Translate** `test()` names, assertion messages, comments, identifiers named in Portuguese inside tests (`arvore` → `tree`, `DESCRICOES` → `DESCRIPTIONS`, `ADR_CONGELADO` → `FROZEN_ADR`, …) and fixture prose. Test names keep the rule ID prefix they have (`'RN-0017: …'`).
- [ ] **Step 3: Verify** — same test count, all green, `npm run typecheck` green.
- [ ] **Step 4: Commit**

```bash
git add packages/living-docs/test
git commit -m "test(ADR-0031): living-docs test names, messages and fixtures in English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 30: `ownership` source and tests

**Files:** every `.ts` under `packages/ownership/src/` and `packages/ownership/test/`, `packages/ownership/hooks/run-hook.sh` comments.

- [ ] **Step 1: Record the test count.**
- [ ] **Step 2: Translate** per Tasks 28–29's rules.
- [ ] **Step 3: Verify** — same count, `npm test && npm run typecheck` green, `node --conditions=development packages/ownership/src/cli/index.ts validate` green.
- [ ] **Step 4: Commit**

```bash
git add packages/ownership
git commit -m "chore(ADR-0031): ownership source and tests in English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 31: `bin/`, workflows and remaining files

**Files:** `bin/dev`, `bin/living-docs`, `.github/workflows/living-docs.yml`, `.github/workflows/wrapper-docker.yml`, and any other tracked file the search below lists (`Dockerfile`, `compose.yaml`, `eslint.config.mjs`, `.gitattributes`, `.gitignore`, `.prettierignore`, `.dockerignore`, `packages/*/package.json` descriptions).

- [ ] **Step 1: Find the remaining Portuguese**

Run: `git grep -nP "[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÇ]" -- . ':!packages/living-docs/test/acceptance/language-independence.test.ts' ':!docs/superpowers/plans/2026-09-29-english-only-repository.md'`
Every hit is in scope for this task.

- [ ] **Step 2: Translate** workflow step names (for example `Instalar dependências` → `Install dependencies`, `Testes` → `Tests`), comments, echoed messages in `bin/`. `bin/living-docs` and the workflow are consumer-visible: the CHANGELOG entry of Task 21 already covers "messages are English".
- [ ] **Step 3: Verify** — `npm test && npm run typecheck`; `bash -n bin/dev bin/living-docs` (syntax); the phase block commands.
- [ ] **Step 4: Commit**

```bash
git add bin .github Dockerfile compose.yaml eslint.config.mjs .gitattributes .gitignore .prettierignore .dockerignore packages/living-docs/package.json packages/ownership/package.json
git commit -m "chore(ADR-0031): bin, workflows and repository configuration in English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 32: Final verification

- [ ] **Step 1: Clean install and the full suite**

```bash
npm ci
npm test
npm run typecheck
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
node --conditions=development packages/ownership/src/cli/index.ts validate --base master
node --conditions=development packages/living-docs/src/cli/index.ts validate --base master
```

Expected: every command exits 0. `living-docs/commit-discipline` over the branch diff finds a cited ID for every changed artifact, and no mass `last-reviewed` bump.

- [ ] **Step 2: One-off accent search** (not kept as a guard)

Run: `git grep -nP "[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÇ]"`
Expected: hits only in `packages/living-docs/test/acceptance/language-independence.test.ts` and in this plan, which quotes the Portuguese it replaces (the vocabulary table, the fixture, the old strings). The plan is a record of the migration, not text the repository speaks in; ask the human whether to keep the quotes or reduce them to the Slug Map before merging.

- [ ] **Step 3: One-off unaccented spot check** — Portuguese without accents slips past Step 2.

Run: `git grep -niwE "nao|voce|tambem|entao|quando|porque|nenhum|arquivo|regra|documento|gatilho" -- ':!packages/living-docs/test/acceptance/language-independence.test.ts' ':!docs/superpowers/plans/2026-09-29-english-only-repository.md'`
Expected: only the literal `nenhum` values of Task 7 (`packages/ownership/test/schema/item.test.ts`, `packages/living-docs/test/docs/blocked.test.ts`, the CHANGELOG line that names the retired word) and English words that happen to match (none of these are English words, so any other hit is untranslated text — translate it and commit as `chore(ADR-0031): translate remaining text`).

- [ ] **Step 4: Report** the command outputs to the human. Nothing is claimed done without them.
