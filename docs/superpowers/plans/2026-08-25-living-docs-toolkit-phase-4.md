# Phase 4 of the living documentation toolkit — language and intent

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `SK-2` glossary-keeper (`docs/glossary.md`, `CM-4` `/term`),
`SK-1` charter-keeper (`docs/charter/constitution.md`, `docs/charter/vision.md`)
and `AG-2` decision-adversary — Phase 4 of the spec (§10), which closes the
`small-team` stage set.

**Architecture:** No new engine piece. `SK-1`/`SK-2` are pure skills
(procedure + semantic judgment, spec §1), `AG-2` is the plugin's first agent
(isolated context, no `Edit`/`Write`), and the only code change is
`src/cli/init.ts` starting to seed `docs/glossary.md` and `docs/charter/` in the
`small-team` stage — the same pattern `SK-6` has used since Phase 3.
Glossary and Constitution/Vision stay **outside** `artifacts:` in
`.ownership.yml` — the same treatment `CONTRIBUTING.md` and the Definition of
Done already get —, a decision recorded in `ADR-0004` so it is not reopened in
every phase.

**Tech Stack:** TypeScript (Node, run only in a container — `RNF-0002`),
`node:test`, Claude Code plugin (`SKILL.md`, `.md` command, `.md` agent).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §5 (`SK-1`, `SK-2`), §6 (`AG-2`),
§10 (Phase 4), §11 (authoring conventions) —
`docs/superpowers/plans/BACKLOG-phases-3-7.md` ("Phase 4" section) has the
survey that this plan resolves.

## Global Constraints

- Nothing runs on the host except Docker — every command via
  `docker compose exec toolkit …` or `./bin/living-docs` (`RNF-0002`).
- Identifiers, file names and IDs in English/neutral; prose in
  Portuguese (spec §11).
- An ID is never recycled — check `docs/ids-retired.txt` before taking a new
  number (spec §2).
- Every requirement section is born `status: draft`; every new ADR is born
  `status: draft`. Promoting is a human act (`RN-0005`) — `HK-3` intercepts.
- The commit message cites the affected ID, in the format `type(ID): subject`
  (`CONTRIBUTING.md`).
- No new CI check in this phase. Verifying "one meaning per
  term" and "every principle has a named enforcement" belongs to the skill and to a dogfooding test;
  it does not become `CI-9` (backlog: "resist inventing `CI-9` to
  measure it").
- Glossary and Constitution/Vision do **not** go into `artifacts:` in
  `.ownership.yml` — decision of `ADR-0004` (Task 1). `DA-0002` remains
  open; no task in this plan resolves it.

### `HK-5` will ask — read this before committing any task

`docs/.ownership.yml` has had `watches` filled in since Phase 3, and two
entries hit almost every commit in this plan:

| Watched path       | Owner doc required in the same commit | Affected tasks |
| ------------------ | ------------------------------------- | -------------- |
| `src/cli/**`       | `docs/requirements/functional.md`     | 2              |
| `plugin/skills/**` | `CONTRIBUTING.md`                     | 4, 5, 6        |

`HK-5` **asks** (`ask`), and never denies (`RN-0009`) — but the question arrives, and
answering in the dark is the habit the hook exists not to teach. Each affected task
below says, in the **`HK-5`** block, what to answer and why. In Tasks 4
and 5 the answer is "yes, it is together": the matching `CONTRIBUTING.md` line
travels in the same commit as the skill, on purpose.

---

## Spec coverage

| Piece                                                                              | Task  |
| ---------------------------------------------------------------------------------- | ----- |
| `SK-2` glossary-keeper                                                             | 4     |
| `docs/glossary.md` (format / real content)                                         | 2 / 3 |
| `CM-4` `/term`                                                                     | 4     |
| `SK-1` charter-keeper                                                              | 5     |
| `docs/charter/constitution.md`, `docs/charter/vision.md` (format / real content)   | 2 / 3 |
| `AG-2` decision-adversary                                                          | 6     |
| `init --stage small-team` seeding the three files                                  | 2     |
| CODEOWNERS: owner of glossary and charter (seed / this repo)                       | 2 / 3 |
| `CONTRIBUTING.md` points to the new artifacts                                      | 4, 5  |
| Index (`CLAUDE.md`, `README.md`, `plugin.json`)                                    | 7     |
| Dogfooding + human promotion                                                       | 3, 8  |

Phase 4 does not close any of the **scenario-based** acceptance criteria of spec §12
(1 to 9): the `Phases` table of spec §10 does not tie a criterion to a phase, and whoever makes
that tie — `docs/superpowers/plans/BACKLOG-phases-3-7.md` — only records it
for Phases 3 (criterion 5, half) and 5 (criterion 6). There is therefore no new test
in `test/acceptance/spec-criteria.test.ts` in this phase, unlike Phase 3.

What Phase 4 touches is criterion **10** — "no piece of the toolkit produces a
document that narrates code" —, which is cross-cutting and has no scenario of its own. What
protects it here is the judgment in Task 3 (term and principle are domain
truth, not a description of a function) and the `Boundaries` of the two skills, not a
check.

---

### Task 1: The rule before the code — `ADR-0004`, `RF-0005`, `RN-0011`

**Objective:** Before any code, record the decision about the identity
of the glossary term (why it does not get a `TRM-nnnn`) and the two
requirements that the rest of the plan implements — in `draft`, for human promotion
at the end (Task 8).

**Files:**

- Create: `docs/decisions/adr/ADR-0004-glossary-term-identified-by-name.md`
- Modify: `docs/requirements/functional.md` (`RF-0005`)
- Modify: `docs/requirements/rules.md` (`RN-0011`)

**Interfaces:**

- Produces: the IDs `ADR-0004`, `RF-0005`, `RN-0011`, cited by the code and
  by the tests of Tasks 2–7.

**Requirements:**

- All three are born in the initial state of the machine (`draft`) — promotion is
  Task 8, and it is human (`RN-0005`).
- `ADR-0004` does not resolve `DA-0002`. It stays `open` in
  `docs/open-decisions.md` — no edit to that file in this task.

- [ ] **Step 1: Write `ADR-0004` in `draft`**

Create `docs/decisions/adr/ADR-0004-glossary-term-identified-by-name.md`:

```markdown
---
id: ADR-0004
title: Glossary term is identified by name, not by a numbered ID
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-25
relates-to: [DA-0002, RN-0011]
supersedes: null
superseded-by: null
---

# ADR-0004 — Glossary term is identified by name, not by a numbered ID

## Context

Phase 4 (spec §10) delivers `SK-2` (`docs/glossary.md`) and `SK-1`
(`docs/charter/constitution.md`, `docs/charter/vision.md`). All three are
artifacts with an owner, but none has a numbered ID family like `ADR`,
`DA`, `TDR`, `RF`, `RNF` or `RN` — the same category as `CONTRIBUTING.md`, the
Definition of Done and the agent contract, which Phase 3 already handled without
declaring them in `artifacts:` in `.ownership.yml` (`DA-0002`, still open).

`docs/.ownership.yml` today requires an `id-prefix` of 2 to 4 uppercase letters for
every `artifacts:` entry (`src/config/ownership.ts`). Without a prefix, an
artifact does not enter the list — and without entering, `CI-1`/`CI-2`/`CI-3`
(`src/docs/collect.ts` scans only `config.artifacts`) do not process it.

The spec gives the glossary term a state machine (`active → renamed(to
X) | banned`, §4) but never gives it a citation syntax: the traceability
graph (§8) shows "Glossary <──names── RN, contract, code" — the
glossary is **cited by name**, and never appears on the side that resolves a
`<PREFIX>-<number>` citation (§8, `CI-2`). The entry format that the spec
defines (§5, `SK-2`) — `Term | Definition | Name in code | Do not confuse with
| Source` — also has no ID column.

## Alternatives considered

**Invent a prefix (`TRM` for term, `CST` for a Constitution
principle) and declare `docs/glossary.md`/`docs/charter/constitution.md`
in `artifacts:`.** Rejected: it would create a second form of identity for
something the spec itself already identifies along another axis (the name). A `TRM-0001`
that nobody cites — because the real citation is `Invoice`, not the number — is
decoration that `CI-2` would validate and no document would ever write.

**Resolve `DA-0002` now**, generalizing `artifacts:` to accept an entry
without `id-prefix` (an "index" artifact, with no numbered items). Rejected
in this phase: `DA-0002` was opened with the real requirement that motivates it in mind —
`CI-7` (ownership coverage, Phase 7) requiring an owner for every artifact without
inventing a prefix. Resolving it now, from a single case (the glossary),
risks a wrong generalization — designed for what Phase 4 needs, not
for what `CI-7` will need later.

**Keep `docs/glossary.md`, `docs/charter/constitution.md` and
`docs/charter/vision.md` outside `artifacts:`**, with the same treatment that
`CONTRIBUTING.md` and the Definition of Done have received since Phase 3: owner via
CODEOWNERS, frontmatter in the container format (`title`, `owner`, `trigger`,
`last-reviewed`), but without `CI-1`/`CI-2`/`CI-3` processing them. **Chosen.**

## Decision

A glossary term is identified by its name — a unique string within
`docs/glossary.md` — never by a numbered ID of the `<PREFIX>-<number>` kind.
`docs/glossary.md`, `docs/charter/constitution.md` and `docs/charter/vision.md`
do not go into `artifacts:` in `.ownership.yml` in this phase. `DA-0002` remains
open, not resolved by this ADR.

## Consequences

### What is gained

- No change to `src/config/ownership.ts`, `src/docs/schema.ts` or
  `src/docs/table.ts` — the Phase 0–3 engine does not need to know anything new.
- The same treatment for the five artifacts without an ID family
  (`CONTRIBUTING.md`, DoD, agent contract, glossary, Constitution/Vision)
  — a single pattern, not one per artifact.
- `DA-0002` stays exactly in the scope in which Phase 3 left it: a pre-
  condition of `CI-7`, Phase 7 — not a problem resolved in a hurry to
  unblock Phase 4.

### What is accepted as lost

- `CI-1` does not validate the frontmatter structure of any of the three files —
  the same gap that already exists for `CONTRIBUTING.md` and the DoD.
- If `watches` ever points to `docs/glossary.md` or
  `docs/charter/constitution.md`, `HK-4`/`HK-5` remind about the owner doc but without
  naming the skill (`findArtifactRule` finds no rule — `skill: null`).
- The check "one term, one meaning" and "every principle has a named
  enforcement" has no generic CI check: it stays entirely with the skill
  (`glossary-keeper`, `charter-keeper`) and, in this repository, with a
  dogfooding test — it is not a mechanism that a consuming project inherits for free.
```

- [ ] **Step 2: Add `RF-0005` in `draft`**

At the end of `docs/requirements/functional.md`, after `RF-0004`:

```markdown
## RF-0005 — `init --stage small-team` installs the language and intent frame

- **status:** draft
- **relates-to:** RF-0004
- **out of scope:** the real content of the terms and principles — the seed is the format, not the vocabulary of this or any other project

At the `small-team` stage, `living-docs init` creates `docs/glossary.md`,
`docs/charter/constitution.md` and `docs/charter/vision.md` from the
templates, with the same idempotency and the same adoption policy as the other
artifacts: it does not recreate what exists, it does not rewrite user content.
```

- [ ] **Step 3: Add `RN-0011` in `draft`**

At the end of `docs/requirements/rules.md`, after `RN-0010`:

```markdown
## RN-0011 — A glossary term has a single meaning, identified by name

- **status:** draft
- **relates-to:** ADR-0004
- **out of scope:** the declaration of `docs/glossary.md` in `artifacts:` in `.ownership.yml` — left open by `DA-0002` (`ADR-0004` does not resolve it)

A glossary term is identified by name — not by a numbered ID of the
`<PREFIX>-<number>` kind — and covers exactly one meaning. Two things
with the same name are not the same entry: two terms are created, and one of them is
`banned`, pointing to the replacement. A divergence between the name in the code and the
term is a bug to fix in the code, not a second term in the glossary.
```

- [ ] **Step 4: Run validate and confirm the `draft` passes clean**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: `exit=0`, and it is the `draft` that buys this: `RF-0005` and `RN-0011` are not
yet `active`, so rule 7 of `CI-3` (coverage by citation) does not charge them,
and no test mentions them until Tasks 2 and 3. `ADR-0004` also passes:
rule 6 (`accepted` without `relates-to`) only looks at accepted items, and the `ADR` artifact
does not declare `cited-by`.

`CI-2` **is** exercised here, and that is what matters to check: the citations to
`DA-0002` and `RN-0011` inside `ADR-0004`, and to `ADR-0004` inside
`RN-0011`, must resolve. `ADR-0004` also closes the sequence gap of the
`ADR` prefix (0001–0004). Mentions such as `CI-7` or `SK-2` are ignored: the
citation pattern requires 3 or 4 digits (`src/ids/citations.ts`).

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0004-glossary-term-identified-by-name.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0004, RF-0005, RN-0011): the Phase 4 rule in draft"
```

---

### Task 2: `init --stage small-team` installs the language and intent frame

**Objective:** Implement `RF-0005` — the glossary/Constitution/
Vision templates and the change in `src/cli/init.ts` that seeds them in the
`small-team` stage, the same way `WORKING_AGREEMENTS` already does for
`CONTRIBUTING.md`/DoD since Phase 3.

**Files:**

- Create: `templates/glossary.md`
- Create: `templates/constitution.md`
- Create: `templates/vision.md`
- Modify: `src/cli/init.ts`
- Modify: `test/cli/init.test.ts`

**Interfaces:**

- Consumes: `template()`, `writeIfAbsent()`, `InitOptions`, `InitResult` already
  existing in `src/cli/init.ts`.
- Produces: `docs/glossary.md`, `docs/charter/constitution.md`,
  `docs/charter/vision.md` in the validated repository, when `--stage
small-team`.

**Requirements:**

- Idempotent: a second run neither recreates nor rewrites (same contract as
  `WORKING_AGREEMENTS`).
- `NOT_INSTALLED['small-team']` stops promising Phase 4 — after this
  task, `small-team` no longer promises anything pending.
- The **seeded** `CODEOWNERS` gains the two new lines, via
  `AGREEMENTS_CODEOWNERS` (`templates/CODEOWNERS` already interpolates the variable; the
  template file does not change). This holds only for a repository that does not yet
  have a `CODEOWNERS` — `writeIfAbsent` skips what exists, and that is why the
  `CODEOWNERS` of **this** repository is edited by hand in Task 3.

- [ ] **Step 1: Write the failing test (`test/cli/init.test.ts`)**

Add to the end of the file:

```typescript
test('RF-0005: small-team installs glossary and charter', () => {
  withTempRepo({}, root => {
    const result = runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
    })
    for (const path of ['docs/glossary.md', 'docs/charter/constitution.md', 'docs/charter/vision.md']) {
      assert.ok(existsSync(join(root, path)), `${path} should exist`)
      assert.ok(result.created.includes(path), `${path} should be listed as created`)
    }
    assert.match(readFileSync(join(root, 'docs/glossary.md'), 'utf8'), /@time/)
  })
})

test('RF-0005: solo does not install glossary nor charter', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo' })
    for (const path of ['docs/glossary.md', 'docs/charter/constitution.md', 'docs/charter/vision.md']) {
      assert.equal(existsSync(join(root, path)), false, `${path} should not exist in the solo stage`)
    }
  })
})

test('RF-0005: an already written glossary is not rewritten on the second run', () => {
  withTempRepo({ 'docs/glossary.md': '# their way\n' }, root => {
    const options = {
      owner: '@time',
      dryRun: false,
      stage: 'small-team' as const,
    }
    runInit(root, options)
    const segunda = runInit(root, options)
    assert.equal(readFileSync(join(root, 'docs/glossary.md'), 'utf8'), '# their way\n')
    assert.ok(segunda.skipped.includes('docs/glossary.md'))
  })
})

test('RF-0005: the seeded CODEOWNERS gives glossary and charter an owner', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' })
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')
    assert.match(codeowners, /docs\/glossary\.md\s+@time/)
    assert.match(codeowners, /docs\/charter\/\s+@time/)
  })
})
```

Now the two `RF-0003` tests that Phase 4 invalidates. **Replace** the old test
`'RF-0003: the result lists what was not installed, instead of pretending the
stage is complete'` (today at line ~199) with the two below. The first asserts the
new fact; the second preserves the half of `RF-0003` that would be left with no proof
at all when `NOT_INSTALLED['small-team']` empties — "**and says what it did not
install**" must remain exercised on a path where there is something to say, or
the requirement ends up proved by an empty-list assertion:

```typescript
test('RF-0003: small-team leaves nothing out in this version — Phases 2, 3 and 4 complete', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    const result = runInit(root, SMALL_TEAM)
    assert.deepEqual(result.notInstalled, [])
  })
})

test('RF-0003: when something really is left out, the result says what it is', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    runInit(root, OPTIONS) // solo: .ownership.yml is born without RF/RNF/RN
    const file = join(root, OWNERSHIP_PATH)
    // The line disappears entirely, it does not become another key: `generated` is optional in the
    // parser, and a strange key would test the parser instead of the honesty.
    // Without the anchor, moving up a stage does not guess where to declare the requirements.
    const sem = readFileSync(file, 'utf8').replace(/\ngenerated: \[\]\n/, '\n')
    assert.notEqual(sem, readFileSync(file, 'utf8'), 'the anchor must have actually been removed')
    writeFileSync(file, sem, 'utf8')

    const result = runInit(root, { ...SMALL_TEAM, owner: OPTIONS.owner })
    assert.ok(
      result.notInstalled.some(item => item.includes(OWNERSHIP_PATH)),
      `what was left out must be named — ${JSON.stringify(result.notInstalled)}`,
    )
  })
})
```

**Remove** the test `'RF-0003: small-team no longer promises Phase 3 as
pending'` (today at line ~257, right after `'RF-0004: an already written agreement is not
rewritten on the second run'`). It asserts
`assert.ok(result.notInstalled.some((item) => /Phase 4/.test(item)))` — false from
this task on, because `notInstalled` becomes empty. The guarantee it gave
is in the first of the two tests above, now without the gap.

Do not add a third test asserting `notInstalled` empty: the two above
already cover both sides, and a clone only makes the suite grow without covering anything
new.

- [ ] **Step 2: Run the new tests and confirm they fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0005|RF-0003"
```

Expected: FAIL in the four `RF-0005` tests (`docs/glossary.md` does not exist,
`existsSync` returns `false`) and in `'RF-0003: small-team leaves nothing out'`
(`notInstalled` still promises Phase 4). The
`'RF-0003: when something really is left out…'` should already **pass** at this
point — it tests `declareRequirements`, which does not change in this task; it is the net that
holds the half of `RF-0003` that Step 6 will switch off.

- [ ] **Step 3: Create `templates/glossary.md`**

```markdown
---
title: Glossary
owner: '{{OWNER}}'
trigger: >
  New domain term in code, spec or conversation; term with two
  meanings; renaming of a concept.
last-reviewed: { { TODAY } }
---

# Glossary

> Seed created by `living-docs init`. Each term has a single meaning —
> if the business uses the same word for two things, two terms are created and
> one of them is banned (`status: banned`) pointing to the replacement. Replace the
> example with the real vocabulary of this project; deleting what is left over is part of the
> work.

| Term         | Definition                     | Name in code | Do not confuse with               | Source   | Status |
| ------------- | ----------------------------- | -------------- | ------------------------------- | ------- | ------ |
| Example term | Replace with the real definition | `nameInCode` | What looks like a synonym but is not | RN-nnnn | active |

<!-- Terms enter as rows above. Owning skill: glossary-keeper. -->
```

- [ ] **Step 4: Create `templates/constitution.md`**

```markdown
---
title: Constitution
owner: '{{OWNER}}'
trigger: >
  Deliberate amendment — never as a side effect of another task.
last-reviewed: { { TODAY } }
version: 1
---

# Constitution

> Seed created by `living-docs init`. Each principle must be testable
> and name what verifies it — format `<principle> — verified by <hook |
lint | test | review | check>`. A principle without a named enforcement is a
> slogan; the `charter-keeper` skill refuses it and asks for the verifiable version.
> Replace the example with the real principles of this project.

## Principles

1. Replace with a real principle of this project — verified by <name here>.

## Amendment log

- {{TODAY}} — v1 — Initial creation — human.

<!-- Owning skill: charter-keeper. -->
```

- [ ] **Step 5: Create `templates/vision.md`**

```markdown
---
title: Product Vision
owner: '{{OWNER}}'
trigger: >
  Change of product strategy — never as a side effect of another
  task.
last-reviewed: { { TODAY } }
---
# Product Vision

> Seed created by `living-docs init`. It answers only three questions — if the
> change alters none of the three, it is not a Vision change.

**What problem:** replace with the real problem this product solves.

**For whom:** replace with whoever feels this problem.

**Success metric:** replace with the metric that proves the problem was solved.

<!-- Owning skill: charter-keeper. -->
```

- [ ] **Step 6: Extend `src/cli/init.ts`**

After the `WORKING_AGREEMENTS` declaration (line ~50), add:

```typescript
/** Language and intent (SK-1, SK-2), installed from the `small-team` stage on (spec §10, Phase 4). */
const LANGUAGE_AND_INTENT: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/glossary.md', template: 'glossary.md' },
  { path: 'docs/charter/constitution.md', template: 'constitution.md' },
  { path: 'docs/charter/vision.md', template: 'vision.md' },
])
```

Replace the `NOT_INSTALLED` constant (it stops promising Phase 4):

```typescript
/** What this stage asks for. Empty: `small-team` covers Phases 2, 3 and 4 in full in this version. */
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
})
```

In the `values` object inside `runInit`, replace the value of `AGREEMENTS_CODEOWNERS`:

```typescript
    AGREEMENTS_CODEOWNERS:
      options.stage === 'solo'
        ? ''
        : `CONTRIBUTING.md    ${options.owner}\ndocs/definition-of-done.md    ${options.owner}\nCLAUDE.md    ${options.owner}\ndocs/glossary.md    ${options.owner}\ndocs/charter/    ${options.owner}\n`,
```

Right after the `for (const agreement of WORKING_AGREEMENTS) { ... }` loop inside the
`if (options.stage !== 'solo') { ... }`, add:

```typescript
for (const agreement of LANGUAGE_AND_INTENT) {
  writeIfAbsent(root, agreement.path, template(agreement.template, values), options, result)
}
```

- [ ] **Step 7: Run the tests and confirm they pass**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: PASS on the whole suite. If `'RF-0003: small-team leaves nothing out'`
fails with a non-empty `notInstalled`, it is `declareRequirements` firing
— check that the `.ownership.yml` of the temporary repository still has the anchor
`\ngenerated:`.

- [ ] **Step 8: Commit**

**`HK-5`:** this commit touches `src/cli/**`, which `watches` links to
`docs/requirements/functional.md`. The hook will ask. The answer is **yes,
go ahead**: the owner doc traveled in the immediately preceding commit (Task 1),
with the very `RF-0005` that this code implements — which is the order that
`CONTRIBUTING.md` §"The cycle" requires (the rule before the code). Say this to the
person answering; do not answer for them.

```bash
git add templates/glossary.md templates/constitution.md templates/vision.md src/cli/init.ts test/cli/init.test.ts
git commit -m "feat(RF-0005): init --stage small-team installs glossary and charter"
```

---

### Task 3: Dogfooding — the glossary and Constitution/Vision of this repository

**Objective:** Run the real `init` against this repository to prove that
Task 2 works end to end, and then replace the seed with the
real vocabulary and principles of this toolkit — the same instruction the
template itself leaves ("replace what is not true in this project").
It implements `RN-0011` with a dogfooding test.

**Files:**

- Create: `docs/glossary.md` (real content, not the seed)
- Create: `docs/charter/constitution.md` (real content)
- Create: `docs/charter/vision.md` (real content)
- Create: `test/docs/language-and-intent.test.ts`
- Modify: `CODEOWNERS`

**Interfaces:**

- Consumes: `docs/requirements/rules.md` (RN-0001 to RN-0011),
  `docs/requirements/non-functional.md` (RNF-0001 to RNF-0003) — source of the
  terms and the principles.
- Produces: the three files that Tasks 4 and 5 (skills) will read and cite.

**Requirements:**

- No term or principle narrates code — each one is domain truth of the
  toolkit, not a description of a function.
- Every term has `Source` filled in — the ID (`RN`/`ADR`) that originates it, or the
  owning skill when the concept is born from the procedure and not from a requirement.
  With no source at all, the entry would be born `status: draft` (spec SK-2, rule 3);
  none of the entries below needs that.
- Every principle of the Constitution names what verifies it.
- The `CODEOWNERS` of **this** repository is not rewritten by `init` — it already
  exists, and `writeIfAbsent` skips it. The two owner lines go in by hand, otherwise
  principle 1 of the Constitution that this task writes is born violated by the
  Constitution itself.

- [ ] **Step 1: Run `init --stage small-team` against this repository (dry-run first)**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts init --owner @esliph/engineering --stage small-team --dry-run
```

Expected: `created docs/glossary.md`, `created docs/charter/constitution.md`,
`created docs/charter/vision.md` in the output — the three do not yet exist in this
repository. Nothing else should appear as `created` (the rest already exists and
comes out as `kept`, `CODEOWNERS` included — hence Step 6).

- [ ] **Step 2: Run for real**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts init --owner @esliph/engineering --stage small-team
```

Confirm that the three files were born with the seed content (Task 2,
Steps 3–5) and `@esliph/engineering` in place of `{{OWNER}}`.

- [ ] **Step 3: Write `test/docs/language-and-intent.test.ts`**

The test comes before the real content, and the seed is what makes it fail: it brings
**one** term and **one** principle, and the test demands 5 and 3. That step is what proves
that the test measures the content, and not the existence of the file.

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const ROOT = toolkitRoot()

/**
 * Rows of a markdown table, without header or separator. Only what starts
 * with `|` gets in: prose after the table cannot become a phantom term.
 */
function rows(source: string, header: string): string[][] {
  const start = source.indexOf(header)
  assert.ok(start !== -1, `table not found — expected the header ${header}`)
  return source
    .slice(start)
    .split('\n')
    .filter(line => line.trim().startsWith('|'))
    .slice(2) // header + separator
    .map(line =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cell => cell.trim()),
    )
}

const GLOSSARY_HEADER = '| Term |'
const glossary = (): string => readFileSync(join(ROOT, 'docs/glossary.md'), 'utf8')

test('RN-0011: every glossary term has a unique name, and none has a numbered ID', () => {
  const source = glossary()
  const entries = rows(source, GLOSSARY_HEADER)

  const nomes = entries.map(row => row[0])
  assert.ok(nomes.length >= 5, `expected at least 5 terms, found ${nomes.length}`)
  assert.equal(new Set(nomes).size, nomes.length, 'there is a term with a duplicated name')

  const start = source.indexOf(GLOSSARY_HEADER)
  const header = source.slice(start, source.indexOf('\n', start))
  assert.doesNotMatch(header, /\|\s*ID\s*\|/i, 'the table has no ID column — the term is identified by name (RN-0011)')

  for (const row of entries) {
    const status = row[row.length - 1] ?? ''
    // `renamed(to X)` is the state with a destination; spec §4 writes it this way.
    assert.match(status, /^(active|banned|renamed(\(to .+\))?)$/, `status "${status}" outside the term lifecycle (RN-0011)`)
  }
})

test('RN-0011: every term points to the source that defines it', () => {
  for (const row of rows(glossary(), GLOSSARY_HEADER)) {
    assert.notEqual(row[4] ?? '', '', `term "${row[0]}" without a source`)
  }
})

test('the Constitution: every principle names what verifies it', () => {
  const source = readFileSync(join(ROOT, 'docs/charter/constitution.md'), 'utf8')
  const secao = source.slice(source.indexOf('## Principles'), source.indexOf('## Amendment log'))
  const principios = secao.split('\n').filter(line => /^\d+\./.test(line.trim()))
  assert.ok(principios.length >= 3, `expected at least 3 principles, found ${principios.length}`)
  for (const principio of principios) {
    assert.match(principio, /verified by/, `principle without a named enforcement — ${principio}`)
  }
})

test('the Constitution has an amendment log — an amendment is an append, never a rewrite in place', () => {
  const source = readFileSync(join(ROOT, 'docs/charter/constitution.md'), 'utf8')
  assert.match(source, /## Amendment log/)
})

test('the Vision answers only the three questions of spec §5', () => {
  const source = readFileSync(join(ROOT, 'docs/charter/vision.md'), 'utf8')
  for (const pergunta of ['What problem', 'For whom', 'Success metric']) {
    assert.match(source, new RegExp(`\\*\\*${pergunta}:\\*\\*`), `Vision without the question "${pergunta}"`)
  }
})

test('RN-0001: glossary and charter have an owner in CODEOWNERS, like every artifact', () => {
  const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8')
  assert.match(codeowners, /^docs\/glossary\.md\s+@\S+$/m)
  assert.match(codeowners, /^docs\/charter\/\s+@\S+$/m)
})
```

- [ ] **Step 4: Run and confirm it fails**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0011|RN-0001: glossary|Constitution|Vision"
```

Expected: of the six tests, **three fail** — `expected at least 5 terms, found
1`, `expected at least 3 principles, found 1`, and the CODEOWNERS one (`init` did not
rewrite the existing file). The other three (source filled in, amendment
log, three Vision questions) already pass: the seed satisfies them out of the box,
and that is as intended — they guard the format, not the content.

- [ ] **Step 5: Replace `docs/glossary.md` with the real vocabulary**

```markdown
---
title: Glossary
owner: '@esliph/engineering'
trigger: >
  New domain term in code, spec or conversation; term with two
  meanings; renaming of a concept.
last-reviewed: 2026-08-25
---

# Glossary

Vocabulary of the toolkit itself — its domain is living documentation, and the
words below are the single truth for that domain inside this
repository.

| Term           | Definition                                                                                    | Name in code                        | Do not confuse with                                                                                  | Source                    | Status |
| --------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ | ------ |
| Artifact        | Living documentation document with an owner, trigger, standard frontmatter and lifecycle         | `ArtifactRule`, `ArtifactDoc`         | "File" — not every markdown file is an artifact; only what has a declared owner                      | RN-0001                  | active |
| Owner            | Person or team that answers for an artifact, declared in `owner:` and mirrored in CODEOWNERS | `owner`                               | "Author" — whoever wrote the text, not necessarily whoever answers for it afterwards                  | RN-0001                  | active |
| Watched path | Glob in `watches` whose change requires the owner doc in the same commit                              | `WatchRule.code`                      | "Monitored file" by an external observability tool — it is not that                        | RN-0008                  | active |
| Trigger         | Observable event that requires updating an artifact; never a calendar date              | `trigger`                             | "Review deadline" — cadence is the anti-requirement that `CI-1` rejects                                | RN-0002                  | active |
| Frozen item  | Item in a terminal state whose body no longer accepts editing, except the allowlist fields      | `FROZEN_STATUSES`, `mutableFields`    | "Archived" — suggests it is no longer valid; a frozen item remains the current truth            | RN-0006                  | active |
| Gap          | Behavior without a written rule; becomes `DA-nnnn` and stops the implementation until decided           | `DA-nnnn`                             | "Bug" — a gap is the absence of a rule, not an error in running code                                     | decision-recorder (SK-3) | active |
| Term           | Glossary entry, identified by name — a single meaning, never a numbered ID        | row of the table in `docs/glossary.md` | "Requirement" (`RN`/`RF`/`RNF`) — the term names a concept, the requirement states a rule about it | ADR-0004, RN-0011        | active |
```

- [ ] **Step 6: Replace `docs/charter/constitution.md` with the real Constitution**

```markdown
---
title: Constitution
owner: '@esliph/engineering'
trigger: >
  Deliberate amendment — never as a side effect of another task.
last-reviewed: 2026-08-25
version: 1
---

# Constitution

What is inviolable in this toolkit, and how each principle is verified. A principle
without a named enforcement is a slogan — none enters here without one.

## Principles

1. An artifact has exactly one owner, declared and mirrored in CODEOWNERS — verified by `RN-0001` and `CI-1`.
2. `trigger` names an observable event, never a calendar cadence — verified by `CI-1`.
3. No accepted item is fixed in the body — supersede — verified by `HK-1`.
4. No agent promotes on its own a state that means acceptance — verified by `HK-3`.
5. A watched path and the owner doc travel in the same commit — verified by `HK-4` (reminds) and `HK-5` (asks).
6. Nothing runs on the host except Docker — verified by `test/plugin/manifest.test.ts` (`RNF-0002`) and by human review of `Dockerfile`/`compose.yaml`.

## Amendment log

- 2026-08-25 — v1 — Initial creation, six principles reflecting `RN-0001`–`RN-0010` and `RNF-0002` — human, Phase 4 dogfooding.
```

- [ ] **Step 7: Replace `docs/charter/vision.md` with the real Vision**

```markdown
---
title: Product Vision
owner: '@esliph/engineering'
trigger: >
  Change of product strategy — never as a side effect of another
  task.
last-reviewed: 2026-08-25
---

# Product Vision

**What problem:** Documentation that drifts away from the code and rots in silence —
decisions, requirements and technical debts become tribal knowledge that evaporates
when whoever remembers leaves the team.

**For whom:** Whoever maintains a repository alone or in a small team and
needs "why was it done this way" and "what have we not decided yet"
to survive the turnover of whoever remembers — without depending on a parallel wiki
that nobody updates.

**Success metric:** `living-docs validate` runs in minutes on the PR and fails
before merging; every `active` `RN` is cited by at least one test (`CI-3`
with no finding); no accepted ADR was rewritten retroactively.
```

- [ ] **Step 8: Give the two artifacts an owner in the `CODEOWNERS` of this repository**

The `init` of Step 2 did not touch the `CODEOWNERS` — it already existed, and `writeIfAbsent`
skips what exists. Add the two lines after `CLAUDE.md`, following the
spacing the file already uses (four spaces):

```
docs/glossary.md    @esliph/engineering
docs/charter/    @esliph/engineering
```

`docs/charter/` is declared as a directory, the same way
`docs/requirements/` already is — one owner for both charter files, because
whoever answers for one answers for the other.

- [ ] **Step 9: Run everything and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: PASS, `exit=0`. The six tests of Step 3 now pass.
`docs/glossary.md` and `docs/charter/` do not enter `context.docs` (they are not in
`artifacts:`), so no `CI-1`–`CI-3` check touches them — what covers them is
`test/docs/language-and-intent.test.ts`, and only it. It is exactly the loss that
`ADR-0004` records in "what is accepted as lost".

- [ ] **Step 10: Commit**

```bash
git add docs/glossary.md docs/charter/constitution.md docs/charter/vision.md CODEOWNERS test/docs/language-and-intent.test.ts
git commit -m "feat(RN-0011): glossary and Constitution/Vision of this repository, with a dogfooding test"
```

---

### Task 4: `SK-2` glossary-keeper and `/term`

**Objective:** Write the skill that owns `docs/glossary.md` and the thin command
that triggers it.

**Files:**

- Create: `plugin/skills/glossary-keeper/SKILL.md`
- Create: `plugin/commands/term.md`
- Modify: `test/plugin/authoring.test.ts`
- Modify: `CONTRIBUTING.md`

**Interfaces:**

- Consumes: `templates/glossary.md` (Task 2), `docs/glossary.md` (Task 3).
- Produces: nothing that another task consumes — skill and command are leaves.

**Requirements:**

- `description` > 120 characters, contains "Use" and the trigger symptoms of
  spec §5 (new term, two meanings, renaming).
- Sections in the exact order of spec §11 (`test/plugin/authoring.test.ts` sweeps
  every directory of `plugin/skills/` automatically).
- Checklist with ≥6 items, each naming `CI-n`, `HK-n` or "human".
- Does not duplicate the table format (points to `templates/glossary.md`).
- `CONTRIBUTING.md` travels in **this** commit, not in that of Task 7: `watches` links
  `plugin/skills/**` to it, and a new skill is exactly "changed how we work
  here". The table line is the index of the new artifact — the content stays only
  in `docs/glossary.md` (`RN-0010`).

- [ ] **Step 1: Write the failing test**

In `test/plugin/authoring.test.ts`, replace the fixed list of commands and
add the two glossary-keeper assertions:

```typescript
test('the five commands exist, have a description and contain no logic of their own', () => {
  const esperados = ['adr.md', 'open-decision.md', 'debt.md', 'docs-setup.md', 'term.md']
  const encontrados = readdirSync(join(ROOT, 'plugin/commands')).sort()
  assert.deepEqual(encontrados, esperados.sort())

  for (const nome of esperados) {
    const source = readFileSync(join(ROOT, 'plugin/commands', nome), 'utf8')
    const frontmatter = parseFrontmatter(source)
    assert.ok(frontmatter, `${nome} without frontmatter`)
    assert.equal(typeof frontmatter.data.description, 'string')
    assert.ok(source.split('\n').length < 25, `${nome} is too long for a thin shortcut`)
    assert.match(source, /decision-recorder|living-docs-bootstrap|glossary-keeper/, `${nome} must point to the skill it triggers`)
  }
})

test('glossary-keeper: the description names the symptoms of a new, ambiguous or renamed term', () => {
  const description = String(parseFrontmatter(skillSource('glossary-keeper'))?.data.description ?? '')
  assert.match(description, /Use when/i)
  for (const sintoma of ['term', 'renam']) {
    assert.ok(description.toLowerCase().includes(sintoma), `the description should contain the symptom "${sintoma}"`)
  }
})

test('glossary-keeper does not duplicate the table format that it governs', () => {
  const source = skillSource('glossary-keeper')
  assert.doesNotMatch(source, /\| Example term \|/, 'the skill must not contain the example row of the template')
  assert.match(source, /templates\/glossary\.md/, 'it must point to the template, not copy it')
})
```

Remove the old test `'the four commands exist...'` (replaced by the one
above).

- [ ] **Step 2: Run and confirm it fails**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="commands exist|glossary-keeper"
```

Expected: FAIL — `plugin/skills/glossary-keeper/SKILL.md` and
`plugin/commands/term.md` do not exist.

- [ ] **Step 3: Write `plugin/skills/glossary-keeper/SKILL.md`**

```markdown
---
name: glossary-keeper
description: >
  Use when a new domain term appears in code, spec or conversation,
  when the same word is being used for two different things,
  when someone asks "does this already have a name?", "what term do we use for
  this?", "is this a synonym of what already exists?", "why does the code call it X and
  the requirement call it Y?" — or when a concept is renamed and the old
  name keeps appearing in the code.
---

# glossary-keeper — owner of the domain vocabulary

## Overview

The glossary is the single source of a name for a concept. A term is identified
by **name**, never by a numbered ID (`ADR-0004`, `RN-0011`) — a divergence
between the name in the code and the term is a bug, not a synonym.

The path is `docs/glossary.md` — read `docs/.ownership.yml` anyway,
because other artifacts may have moved.

## What you own

| Artifact           | What it is                                                                         | Form                          |
| ------------------ | ------------------------------------------------------------------------------- | ------------------------------ |
| `docs/glossary.md` | The unique name of each domain concept, with definition, name in code and source | Single file, table, mutable |

Row format: `templates/glossary.md`. Do not reproduce it here.

## When to use / when not to

**Use** for every new domain term, every name ambiguity, and every
renaming of a concept.

**Do not use** to name an implementation detail with no business meaning
(variable name, internal class name) — that is not domain, it is a code
choice.

**The cost of using it for nothing:** a term added by stylistic choice inflates the table that
`requirements-keeper` consults before naming any new requirement — and a
table that nobody can read in full stops being the single source of a name.

## Procedure

1. **Search before creating.** A `grep` for the term and for likely synonyms
   in `docs/glossary.md`. A nearly identical term is a sign that the
   word already exists under another name — not that it needs a second
   entry.
2. **One meaning per term, no exception.** If the same word covers two
   concepts, two terms — one of them `status: banned`, pointing to the
   replacement in the `Do not confuse with` column.
3. **A divergence between the name in the code and the term is a bug.** Propose the rename in the
   code; do not add a second row to the glossary to accommodate the habit of
   whoever wrote it.
4. **Every definition points to the source** — the `RN`/`ADR` that originates it. Without a source,
   the entry is born `status: draft` until one exists (spec SK-2, rule 3).
5. **Fill in "Do not confuse with"** whenever there is a real risk of
   confusion — it is what prevents the next repeated question.
6. **Name by the term, not by ID**, in any citation — the glossary has no
   `<PREFIX>-<number>` syntax (`ADR-0004`, `RN-0011`).
7. **Run `living-docs validate`** before finishing — knowing that today it
   does not scan `docs/glossary.md` (`DA-0002` open; `ADR-0004` explains
   why). The check for duplication and for source is yours, not the CI's.
8. **Cite the term (by name) in the commit message.**

## Boundaries

| Yours                                                 | Not yours                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Naming a domain concept, with a single meaning        | Deciding the business rule about that concept (→ `requirements-keeper`) |
| Detecting two terms for the same thing and banning one | Accepting the renaming of an accepted term (it belongs to the term's owner, a human act) |
| Proposing the rename in the code when it diverges from the term | Doing the rename — that belongs to the agent that is in the code                     |
| Pointing to the row format                            | Duplicating the table here                                                   |

## Checklist

- [ ] The term does not already exist under another name — human verification
- [ ] A single meaning per term; a divergence became `banned` + replacement, not a second row — human verification
- [ ] "Name in code" filled in, and no unresolved divergence from the term — human verification
- [ ] "Source" points to a real `RN`/`ADR`, or the entry was born `draft` — human verification
- [ ] No term got a numbered ID — human verification (`RN-0011`)
- [ ] "Do not confuse with" filled in where there was a real risk of confusion — human verification
```

- [ ] **Step 4: Write `plugin/commands/term.md`**

```markdown
---
description: Records or updates a glossary term
argument-hint: '[term]'
---

Use the `glossary-keeper` skill to record or update in `docs/glossary.md` the term: $ARGUMENTS

One meaning per term. If the word already covers something else, mark the old
term as `banned` and point to the replacement — do not create a second row for
the same word.
```

- [ ] **Step 5: Point to the glossary in `CONTRIBUTING.md`**

In the `## Where the truth lives` table, add a row immediately before
`| When it is done |`:

```markdown
| What is the domain vocabulary | `docs/glossary.md` |
```

Only the pointer. No term is copied here (`RN-0010`).

- [ ] **Step 6: Run and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

- [ ] **Step 7: Commit**

**`HK-5`:** this commit touches `plugin/skills/**`, which `watches` links to
`CONTRIBUTING.md` — and it is in the `git add` below. The answer to the hook is "yes,
it is together".

```bash
git add plugin/skills/glossary-keeper plugin/commands/term.md CONTRIBUTING.md test/plugin/authoring.test.ts
git commit -m "feat(SK-2, RN-0011): glossary-keeper and /term"
```

---

### Task 5: `SK-1` charter-keeper

**Objective:** Write the skill that owns `docs/charter/constitution.md` and
`docs/charter/vision.md`.

**Files:**

- Create: `plugin/skills/charter-keeper/SKILL.md`
- Modify: `test/plugin/authoring.test.ts`
- Modify: `CONTRIBUTING.md`

**Interfaces:**

- Consumes: `templates/constitution.md`, `templates/vision.md` (Task 2),
  the real `docs/charter/` (Task 3).
- Produces: nothing consumed by another task.

**Requirements:** the same as Task 4 (§11 sections, checklist ≥6, `description`

> 120 characters with "Use"), including the `CONTRIBUTING.md` line in the same
> commit — `plugin/skills/**` is a watched path.

- [ ] **Step 1: Write the failing test**

Add to `test/plugin/authoring.test.ts`:

```typescript
test('charter-keeper: the description names principle, vision and amendment', () => {
  const description = String(parseFrontmatter(skillSource('charter-keeper'))?.data.description ?? '')
  assert.match(description, /Use when/i)
  for (const sintoma of ['principle', 'vision']) {
    assert.ok(description.toLowerCase().includes(sintoma), `the description should contain the symptom "${sintoma}"`)
  }
})

test('charter-keeper does not duplicate the content of the artifacts it governs', () => {
  const source = skillSource('charter-keeper')
  // Section title, not a mention in prose: it is the body of the Constitution that cannot
  // be copied here, and it is what starts the line with `## `.
  assert.doesNotMatch(source, /^## Amendment log/m, 'the skill must not contain the body of the Constitution')
  assert.doesNotMatch(source, /^## Principles/m, 'the skill must not contain the principles of this repository')
  assert.match(source, /templates\/constitution\.md/, 'it must point to the template, not copy it')
  assert.match(source, /templates\/vision\.md/, 'both templates, because they are two artifacts')
})
```

The `SKILL.md` of Step 3 speaks of "the **Amendment log** section" in bold, not with
`##`, exactly so that this assertion measures content duplication and not where
the line broke.

- [ ] **Step 2: Run and confirm it fails**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="charter-keeper"
```

- [ ] **Step 3: Write `plugin/skills/charter-keeper/SKILL.md`**

```markdown
---
name: charter-keeper
description: >
  Use when someone wants to amend the Constitution or the Product Vision, when
  asking "is this a principle of ours?", "is this in our product
  vision?", "what are the inviolable values here?", "who is this
  product for and what problem does it solve?" — never as a side effect of
  another task. Also when a proposed principle has no named
  enforcement, or an amendment tries to rewrite a principle in place instead of
  recording the change in the amendment log.
---

# charter-keeper — owner of the Constitution and the Product Vision

## Overview

Two artifacts, a very rare and deliberate trigger: the Constitution changes by
amendment (never in the middle of another task), the Vision changes by a real change of
strategy. Neither has a numbered ID family (`ADR-0004`) —
change in them is rare enough not to need one.

## What you own

| Artifact                       | What it is                                               | Form                                                          |
| ------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------- |
| `docs/charter/constitution.md` | What is inviolable, and how each principle is verified | Single file, stable sections, with an append-only amendment log |
| `docs/charter/vision.md`       | What problem, for whom, and the success metric       | Single file, three answers                                  |

Seeds: `templates/constitution.md` and `templates/vision.md`. Do not reproduce
the format here.

## When to use / when not to

**Use** for a deliberate amendment of a principle, and for a real change of
product strategy.

**Do not use** for a one-off technical decision (→ `decision-recorder`) or a business
rule (→ `requirements-keeper`) — the Constitution is what is inviolable, not the
rule of the domain.

**Never** accept the amendment on your own. That is human.

## Procedure

1. **Classify**: inviolable principle and its enforcement → Constitution;
   problem/audience/success metric → Vision. If the change alters
   none of the Vision's three questions, it is not a Vision change.
2. **Every principle needs a named enforcement.** Format: `<principle> —
verified by <hook | lint | test | review | check>`. Without it, it is a
   slogan — refuse and ask for the verifiable version.
3. **An amendment is an append, never a rewrite in place.** The **Amendment log**
   section receives the date, what changed, why, and the version goes up. A revoked principle
   stays recorded with what revoked it, not erased.
4. **Before proposing the amendment as ready**, consider running the agent
   `decision-adversary` on it — it tries to refute, and the verdict helps
   decide whether an alternative considered or a consequence is missing.
5. **1–2 page limit on the Constitution.** Exceeding it is a symptom of a
   principle that became a requirement — move it to `requirements-keeper`.
6. **Stop after writing the amendment.** Accepting is a human act — do not alter
   the published body on your own.

## Boundaries

| Yours                                  | Not yours                                       |
| -------------------------------------- | ----------------------------------------------- |
| What is inviolable, and how it is verified | One-off technical decision (→ `decision-recorder`) |
| The product's success metric          | Business rule (→ `requirements-keeper`)      |
| Rejecting a non-testable principle        | Accepting the amendment — that is human                |
| Recording the amendment as an append in the log  | Rewriting an existing principle in place      |

## Checklist

- [ ] Every principle ends in "— verified by" a real mechanism — human verification
- [ ] The amendment went in as a new line in "Amendment log", not as a rewrite — human verification
- [ ] The Constitution's `version` went up together with the amendment — human verification
- [ ] The Vision, if altered, still answers only the three questions — human verification
- [ ] The Constitution remains at 1–2 pages — human verification
- [ ] `decision-adversary` was considered before proposing the amendment as ready — human verification
```

- [ ] **Step 4: Point to the charter in `CONTRIBUTING.md`**

In the `## Where the truth lives` table, right below the glossary row
(added in Task 4) and still before `| When it is done |`:

```markdown
| What is inviolable, and the product vision | `docs/charter/` |
```

- [ ] **Step 5: Run and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

- [ ] **Step 6: Commit**

**`HK-5`:** once more `plugin/skills/**` → `CONTRIBUTING.md`, and once more it is
in the `git add`.

```bash
git add plugin/skills/charter-keeper CONTRIBUTING.md test/plugin/authoring.test.ts
git commit -m "feat(SK-1): charter-keeper"
```

---
### Task 6: `AG-2` decision-adversary, and where it enters the flow

**Objective:** Create the plugin's first agent — isolated context, without
`Edit`/`Write`, that tries to refute a proposal — and point `decision-recorder`
to it. `charter-keeper` has cited it since Task 5, in step 4 of the
`## Procedure`: the reference is born before the file on purpose, because
no test resolves an agent name (the sweep of
`test/plugin/manifest.test.ts` only demands that a cited **skill** exists), and
inverting the order would force Task 5 to go back.

**Files:**

- Create: `plugin/agents/decision-adversary.md`
- Modify: `plugin/skills/decision-recorder/SKILL.md`
- Modify: `test/plugin/manifest.test.ts`

**Interfaces:**

- Consumes: no code — it is a prompt file read by the Claude Code
  runtime, through the same mechanism that discovers `plugin/skills/*/SKILL.md` and
  `plugin/commands/*.md` (no entry in `plugin.json` — confirmed against
  real marketplace plugins: `pr-review-toolkit`, `feature-dev`).
- Produces: nothing that another task consumes.

**Requirements:**

- Frontmatter `name: decision-adversary`, `description` (the trigger),
  `tools:` without `Edit` or `Write` (spec §6: "points and stops").
- `decision-recorder` gains a step/checklist item citing the agent — spec
  §6 does not define who invokes it, and the only coherent place is where ADR/TDR are
  prepared for acceptance.

- [ ] **Step 1: Write the failing test**

Add to `test/plugin/manifest.test.ts`:

```typescript
/**
 * A sweep, not a fixed list — the same choice that `authoring.test.ts` makes for the
 * skills: a new agent enters the conventions on the day it is born, without anyone
 * remembering to add it here.
 */
const AGENTS = readdirSync(join(ROOT, 'plugin/agents')).filter(name => name.endsWith('.md'))

test('AG-2: the agents directory exists and contains decision-adversary', () => {
  assert.ok(AGENTS.includes('decision-adversary.md'), `plugin/agents: ${AGENTS.join(', ') || 'empty'}`)
})

for (const file of AGENTS) {
  test(`${file}: frontmatter with name matching the file, description and declared tools`, () => {
    const source = readFileSync(join(ROOT, 'plugin/agents', file), 'utf8')
    const name = file.replace(/\.md$/, '')

    assert.match(source, new RegExp(`^name:\\s*${name}\\s*$`, 'm'), `${file} declares another name`)
    assert.match(source, /^description:/m, `${file} without description — it is what says when to use`)
    assert.notEqual(source.match(/^tools:\s*(.+)$/m)?.[1] ?? '', '', `${file} must declare tools explicitly — an agent without an allowlist inherits everything`)
  })
}

test('AG-2: decision-adversary points and stops — no Edit or Write', () => {
  const source = readFileSync(join(ROOT, 'plugin/agents/decision-adversary.md'), 'utf8')
  const toolsLine = source.match(/^tools:\s*(.+)$/m)?.[1] ?? ''
  assert.doesNotMatch(toolsLine, /\bEdit\b/, 'AG-2 points and stops — it never rewrites (spec §6)')
  assert.doesNotMatch(toolsLine, /\bWrite\b/, 'AG-2 points and stops — it never rewrites (spec §6)')
})

test('decision-recorder references the decision-adversary agent before acceptance', () => {
  const source = readFileSync(join(ROOT, 'plugin/skills/decision-recorder/SKILL.md'), 'utf8')
  assert.match(source, /decision-adversary/)
})
```

- [ ] **Step 2: Run and confirm it fails**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="AG-2|decision-adversary"
```

Expected: `ENOENT ... plugin/agents` — the `readdirSync` at the top of the module runs on
load, so the whole `manifest.test.ts` fails, not just the new tests. It is expected
noise at this point and goes away in Step 3; if you prefer to see assertions instead of
a load error, create the empty directory before running. Do not swap the
`readdirSync` for a version tolerant of a missing directory: `plugin/agents/`
existing is part of what the test guarantees.

- [ ] **Step 3: Write `plugin/agents/decision-adversary.md`**

```markdown
---
name: decision-adversary
description: >
  Use this agent to try to refute ONE proposal — an ADR in draft, a
  Constitution amendment, or a TDR — before asking for its human
  acceptance. Isolated on purpose: whoever proposed should not review with the same
  reasoning that produced the proposal.
tools: Glob, Grep, Read
model: inherit
---

You are a technical adversary. You receive a single proposal — a `draft` ADR, a
Constitution amendment, or a TDR — and genuinely try to bring it down. You do not
rewrite the proposal, do not suggest phrases, and do not decide for anyone: your
output is a verdict and a list of what is missing.

## Fixed adversarial checklist

Apply the five questions below, in this order, and do not skip any:

1. **Was the discarded alternative really evaluated?** Or is it a straw-man alternative,
   listed only to look as if there was a comparison?
2. **Which negative consequence is omitted?** Every decision loses something.
   If the "what is accepted as lost" section is empty or generic, that is
   the omission.
3. **Is this principle testable, or is it a slogan?** (Only applies to a Constitution
   amendment.) If it does not end in "verified by" a real mechanism,
   fail it.
4. **Is this payment trigger observable?** (Only applies to a TDR.) "When
   there is time" and vague variants fail; a condition that someone can
   point to happening passes.
5. **Is there a prior decision that this contradicts without superseding?** Search
   in `docs/decisions/adr/` and `docs/charter/constitution.md` before
   answering — do not trust the memory of the context.

## What you do not do

- You do not use `Edit` or `Write` — you do not have those tools, and even if you
  had them, rewriting the proposal is not your role.
- You do not decide whether the proposal is accepted. That is a human act in all cases
  (spec §4).
- You do not widen the scope to proposals other than the one you received.

## Output

A binary verdict — **ready for acceptance** or **what is missing** — never
a rewrite of the proposal. When the verdict is "what is missing", list each item
as one of the five questions above, with the exact excerpt of the proposal that
prompted it.
```

- [ ] **Step 4: Reference `decision-adversary` in `plugin/skills/decision-recorder/SKILL.md`**

In the `## Procedure`, between step 7 (close both sides of the reference) and
step 8 (stop at `draft`/`open`), insert a new step 7.5:

```markdown
7. **Close both sides of the reference.** A resolved DA points to the ADR that closed it;
   the ADR points back in `relates-to`. Superseding fills in `supersedes` on the
   new one and `superseded-by` on the old one.
8. **Before asking for acceptance of an important ADR or TDR**, consider running
   the `decision-adversary` agent on the proposal — it tries to refute with a
   fixed checklist, and the verdict helps decide whether an alternative
   considered or a consequence is missing before spending the time of whoever accepts.
9. **Stop at `draft`/`open`.** Say which decision is missing and whose it is. If
   you try to promote, `HK-3` will ask — and the answer is not yours.
10. **Run `living-docs validate`** before finishing.
11. **Cite the ID in the commit message.**
```

(Renumber the old steps 8–10 to 9–11, as above — their content
does not change, only the number.)

In the `## Checklist`, add:

```markdown
- [ ] For a weighty decision, `decision-adversary` was considered before asking for acceptance — human verification
```

- [ ] **Step 5: Run and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

- [ ] **Step 6: Commit**

**`HK-5`:** this commit touches `plugin/skills/decision-recorder/SKILL.md`, and
`plugin/skills/**` is linked to `CONTRIBUTING.md`. Here, unlike Tasks 4
and 5, there is **no** new line to add: `CONTRIBUTING.md` does not index internal
skill steps, and `decision-adversary` already enters the README through Task 7. The
answer to the hook is "it does not affect the working agreements" — and that answer belongs to
a person, not to you.

```bash
git add plugin/agents/decision-adversary.md plugin/skills/decision-recorder/SKILL.md test/plugin/manifest.test.ts
git commit -m "feat(AG-2): decision-adversary, referenced by decision-recorder"
```

---

### Task 7: Index — `CLAUDE.md`, `README.md`, `plugin.json`

**Objective:** Point to the new artifacts from the three existing indexes
— never copy content (`RN-0010`).

**Files:**

- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `plugin/.claude-plugin/plugin.json`
- Modify: `test/docs/agent-contract.test.ts`

`CONTRIBUTING.md` is **not** here: its two lines traveled together with the
skills, in Tasks 4 and 5, because `plugin/skills/**` is a watched path.

**Interfaces:**

- Consumes: no code.
- Produces: nothing consumed by another task — it is the last visible piece before
  Task 8.

**Requirements:**

- `CLAUDE.md` stays ≤60 lines (`RN-0010`, already tested) and does not copy
  any sentence from `docs/glossary.md` or `docs/charter/`.
- The README cannot keep asserting what stopped being true: the sentence about
  `--stage` promises that the command "prints what the stage asks for and this version
  does not install", and from Task 2 on `notInstalled` comes out empty for both
  stages.

- [ ] **Step 1: Extend `test/docs/agent-contract.test.ts`**

In the test `'RN-0010: the agent contract points to the owning artifacts'`,
add to the `alvos` array:

```typescript
const alvos = [
  'LIVING-DOCUMENTATION-TOOLKIT.md',
  'docs/.ownership.yml',
  'CONTRIBUTING.md',
  'docs/definition-of-done.md',
  'docs/requirements/',
  'docs/glossary.md',
  'docs/charter/',
]
```

- [ ] **Step 2: Run and confirm it fails**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0010"
```

- [ ] **Step 3: Edit `CLAUDE.md`**

In the `## Before touching anything` section, add a line:

```markdown
- Domain vocabulary: `docs/glossary.md`. Inviolable principles and product vision:
  `docs/charter/`.
```

In the `## Commands` section, replace the paragraph with:

```markdown
`/adr`, `/open-decision`, `/debt`, `/docs-setup`, `/term`. The skills
`decision-recorder`, `requirements-keeper`, `working-agreements-keeper`,
`glossary-keeper` and `charter-keeper` are selected by their `description`; there
is no need to invoke them by name.
```

Run `wc -l CLAUDE.md` (or count the lines) and confirm ≤60.

- [ ] **Step 4: Edit `README.md`**

Four passages. **Opening paragraph** — replace the whole paragraph with:

```markdown
Living documentation with owner, trigger and enforcement — Phases 0–4 of the spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions, Debt Register and
requirements with stable IDs; the `CI-1`/`CI-2`/`CI-3` checks; the hooks
`HK-1`/`HK-3`/`HK-4`/`HK-5`; the working agreements (`SK-6`); the domain
vocabulary and the inviolable principles (`SK-2`, `SK-1`).
```

**"Maturity stages" paragraph** — the second sentence stops being true
when `notInstalled` empties. Replace the paragraph with:

```markdown
Maturity stages (`--stage`): `solo` installs decisions, gaps and debt;
`small-team` adds the requirements frame (`RF`, `RNF`, `RN`), the working
agreements, the glossary and the charter. In this version, `small-team` installs the
whole set of the stage — when something in the stage is left out, the command
says what it is instead of pretending the set is complete.
```

**"The Claude Code plugin" section** — add to the end of the existing paragraph:

```markdown
The skills `glossary-keeper` (`/term`) and `charter-keeper` complete the
`small-team` stage, and `plugin/agents/decision-adversary.md` (`AG-2`) is the first
agent of the plugin — isolated context, without `Edit`/`Write`, that tries to refute an
ADR, a Constitution amendment or a TDR before human acceptance.
```

**"What is left out" section** — replace the list, removing `SK-1`, `SK-2`, `AG-2`
and `CM-4`:

```markdown
`SK-5`, `SK-7`, `AG-1`, `HK-2`, `HK-6`, `HK-7`, `CI-4`–`CI-8`, `CM-5`, `CM-7`
— Phases 5 to 7 of the spec. What is missing and in what order:
`docs/superpowers/plans/BACKLOG-phases-3-7.md`.
```

- [ ] **Step 5: Edit `plugin/.claude-plugin/plugin.json`**

```json
  "description": "Living documentation: ADR, Open Decisions, Debt Register, requirements with stable IDs, working agreements, domain vocabulary and inviolable principles — with owner, trigger and enforcement. Phases 0–4.",
```

- [ ] **Step 6: Run everything**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: PASS, `exit=0`. Also check that `'RN-0010: the contract is an index,
not a manual — fits on one screen'` passed: the two edits of Step 3 add
two lines to `CLAUDE.md`, and the ceiling is 60.

- [ ] **Step 7: Commit**

No watched path is touched here — `HK-5` stays quiet.

```bash
git add CLAUDE.md README.md plugin/.claude-plugin/plugin.json test/docs/agent-contract.test.ts
git commit -m "docs(RN-0010): index points to glossary, charter and the new agents/skills"
```

---

### Task 8: Final dogfooding — validate, human promotion, commit

**Objective:** Run everything one last time over the whole repository and ask for the
human promotion of `ADR-0004`, `RF-0005` and `RN-0011` — closing the phase the
same way Phase 3 closed its own.

**Files:**

- Modify: `docs/decisions/adr/ADR-0004-glossary-term-identified-by-name.md` (`status: accepted`)
- Modify: `docs/requirements/functional.md` (`RF-0005` → `active`)
- Modify: `docs/requirements/rules.md` (`RN-0011` → `active`)
- Modify: `docs/superpowers/plans/BACKLOG-phases-3-7.md`

**Interfaces:**

- Consumes: everything that Tasks 1–7 produced.
- Produces: the repository validating itself with Phase 4 active.

**Requirements:**

- Promotion is the **last** step, and it is human (`RN-0005`; `HK-3` intercepts
  any attempt to do it alone).
- `CI-3` demands a citation for an `active` item; the citations of `RN-0011` have existed
  since Task 3 (`test/docs/language-and-intent.test.ts`), and those of
  `RF-0005` since Task 2 (`test/cli/init.test.ts`).

- [ ] **Step 1: Run everything one last time**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: PASS, `exit=0`. `ADR-0004`, `RF-0005` and `RN-0011` are still in
`draft`, so `CI-3` does not charge them yet.

- [ ] **Step 2: STOP and ask for promotion**

Say in one sentence what is being asked — "`ADR-0004` is written, and
`RF-0005`/`RN-0011` are implemented and covered by tests; what is missing is accepting
the ADR and promoting the two requirements to `active`" — and **wait**. Do not edit
`status:` on your own.

- [ ] **Step 3: Promote `ADR-0004` to `accepted`**

After it is accepted by a person, in
`docs/decisions/adr/ADR-0004-glossary-term-identified-by-name.md`,
replace `status: draft` with `status: accepted` in the frontmatter — and **only** that.
`HK-3` will ask again on this edit; it is the same request as Step 2, now
with the answer already given.

No other field goes in the same edit because, a second later, none can go in
anymore: `accepted` is terminal, `HK-1` starts denying body edits, and the
allowlist of the `ADR` artifact (`mutable-fields: [status, superseded-by,
last-reviewed]`) does not include `relates-to`. A wrong `relates-to` in an accepted ADR
can only be fixed by superseding — it is the same precondition that the backlog notes for
`ADR-0001`/`ADR-0002`.

- [ ] **Step 4: Promote `RF-0005` and `RN-0011` to `active`**

In `docs/requirements/functional.md` and `docs/requirements/rules.md`, replace
`- **status:** draft` with `- **status:** active` in the two sections. `HK-3`
asks on both — same answer.

- [ ] **Step 5: Run everything again**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: `exit=0`. The two findings that the promotion can unlock, and the answer
to each:

- **`CI-3`, "`ADR-0004` is `accepted` without `relates-to`"** — it is rule 6 of the
  check, and only fires after `accepted`. The frontmatter written in Task 1 already
  carries `relates-to: [DA-0002, RN-0011]`; if the finding appears, the field
  was lost in an edit. (`CI-2` does not have this rule: it demands that every citation
  _resolve_, never that a minimum of them exist.)
- **`CI-3`, "`RN-0011` is `active` and is not cited in `test/**`, `src/**`"** —
  the citation is in the name of the tests of `test/docs/language-and-intent.test.ts`
  (Task 3). Confirm that the text `RN-0011` appears literally there: the
  sweep matches the string, not the intention. The same holds for `RF-0005` in
  `test/cli/init.test.ts`, whose `cited-by` is only `test/**`.

`ADR-0004` does not need to be cited from outside: `cited-by` is empty for the `ADR`
artifact, and rule 7 of `CI-3` only charges coverage to whoever declares the field.

- [ ] **Step 6: Mark Phase 4 as implemented in the backlog**

In `docs/superpowers/plans/BACKLOG-phases-3-7.md`, three edits — the backlog is the
index of "what is missing and in what order", and an index that still promises what has already
been delivered is the duplicate rotting:

1. Header: add a "**State as of <execution date>**" saying that
   Phase 4 is implemented, in the same format as the two state lines that are
   already there.
2. Section title: `### Phase 4 — language and intent — **IMPLEMENTED**`, and
   replace "Not executed so far" with how many tasks were executed and what
   was promoted by human act (`ADR-0004`, `RF-0005`, `RN-0011`).
3. "Suggested order from here": strike through item 2 (`~~Execute the Phase 4 plan~~`),
   as item 1 already is, and promote Phase 5 to the next step.

While at it, fix the `DA-0002` line in "Inherited debts and open decisions":
it still says that the `DA` "does not yet exist in
`docs/open-decisions.md`" and "is born when the phase is executed" — Phase 3 was
executed, and `DA-0002` is already there, `open`.

- [ ] **Step 7: Final commit**

```bash
git add docs/decisions/adr/ADR-0004-glossary-term-identified-by-name.md docs/requirements docs/superpowers/plans/BACKLOG-phases-3-7.md
git commit -m "docs(ADR-0004, RF-0005, RN-0011): Phase 4 decision and requirements promoted by human act"
```

---

## What this plan deliberately does not do

- **It does not resolve `DA-0002`.** It remains open, exactly as Phase 3 left
  it — a precondition of `CI-7`, Phase 7.
- **It does not declare `docs/glossary.md` nor `docs/charter/*` in `artifacts:`** in
  `.ownership.yml` — `ADR-0004` explains why, and it is reversible: if `DA-0002`
  is resolved later in a way that fits glossary/charter, it is a new ADR
  that supersedes this one, not an edit.
- **It does not add new `watches`.** No code path of this
  repository structurally points to glossary or charter — the trigger of
  `SK-1`/`SK-2` is semantic (new term, deliberate amendment), not a file
  glob.
- **It does not invent `CI-9`** to measure "one meaning per term" or "principle
  with named enforcement" — both stay with the skill and with the
  dogfooding test of Task 3, as the backlog recommended.
