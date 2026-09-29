# Phase 7 of the living documentation toolkit — continuous maintenance

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `CI-4` (staleness), `CI-7` (ownership coverage), `CI-8`
(links), `HK-6` (inventory at `SessionStart`), `AG-1` docs-divergence-auditor and
`CM-5` (`/docs-audit`) — Phase 7 of the spec (§10), which closes acceptance
criteria 7 and 8 of spec §12, closes the **second half** of criterion 5, and
resolves `DA-0002`.

**Architecture:** Three engine pieces are born before the checks, and each one
exists because a check is impossible without it. `src/core/dates.ts` is the
toolkit's only source of date: `CheckContext.today` comes in by value, and no
check reads the clock — without that `CI-4` would be the only check whose result
changes by itself with time, and a check that cannot be tested
deterministically cannot be trusted (`ADR-0007`). `src/core/files.ts` is the
file walker that `CI-4`, `CI-7` and `CI-8` share, extracted from
`src/ids/coverage.ts` instead of copied a fourth time. The `documents:` key in
`.ownership.yml` is the answer to `DA-0002` (`ADR-0008`): an artifact without an
ID family gets an owner without inventing a prefix, and `CI-1`/`CI-2`/`HK-1`
keep not reading it on purpose.

On top of them, three pure checks: `CI-4` compares `last-reviewed` with
`stale-after-months` (warning) and evaluates the `pay-when` of each `open` debt
(error); `CI-7` demands an owner in both places (`.ownership.yml` and CODEOWNERS),
demands that every `watches` link resolve, demands that the Definition of Done
name the verification of each item, and — when it receives the diff — flags the
watched path that traveled without its owning doc, closing the half of criterion
5 that Phase 3 left open; `CI-8` scans links and refuses binary attachments under
the documentation root. `HK-6` is the seventh hook and the first on
`SessionStart`: it reuses the `CI-4` functions and returns `additionalContext`,
never a permission decision. `AG-1` is the second agent — read, search and `git`,
without `Edit`/`Write`.

Dogfooding is mandatory and is what makes the phase exist: this repository
starts declaring its documents in `documents:`, `TDR-0001` gets a verifiable
`pay-when`, and CODEOWNERS starts covering everything under `docs/`. Without
that, `CI-7` would be an installed check that fails the repository itself —
which is worse than not existing.

**Tech Stack:** TypeScript (Node ≥ 24, run only in a container —
`RNF-0002`), `node:test`, `picomatch`, `yaml`, Claude Code plugin (`SKILL.md`,
`hooks.json`, `agents/`).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §2 (frontmatter), §3 (`.ownership.yml`
as the single extension point), §4 (`stale-after-months`, terminal states), §5
(`SK-3` rule 5 — observable payment trigger; `SK-6` rules 1 and 3 — the agent
contract and the DoD as the source of `CI-7`), §6 (`AG-1`), §7 (`HK-6`), §8
(traceability), §9 (`CI-4`, `CI-7`, `CI-8`), §10 (Phase 7, `CM-5`), §12
(criteria 5, 7 and 8), §13 (anti-requirements: binary attachment under `docs/`,
document without an owner, bulk bump of `last-reviewed`) —
`docs/superpowers/plans/BACKLOG-phases-3-7.md` ("Phase 7" section) holds the
survey that this plan resolves.

## Global Constraints

- Nothing runs on the host besides Docker — every command goes through
  `docker compose exec toolkit …` or `./bin/living-docs` (`RNF-0002`).
- Identifiers, file names and IDs in English/neutral; prose in Portuguese
  (spec §11).
- An ID is never recycled — check `docs/ids-retired.txt` before taking a new
  number (spec §2). The free numbers in this phase: `ADR-0007`, `ADR-0008`,
  `ADR-0009`, `ADR-0010`, `RF-0010`, `RF-0011`, `RF-0012`, `RNF-0004`,
  `RN-0016` to `RN-0023`. No new prefix is born in this phase.
- Every requirement section is born `status: draft`; every new ADR is born
  `status: draft`. Promoting is a human act (`RN-0005`) — `HK-3` intercepts, and
  the answer is not yours. This includes `DA-0002 → resolved`.
- The commit message cites the affected ID, format `type(ID): subject`
  (`CONTRIBUTING.md`).
- A hook fails open within 5 s, without network (`RNF-0001`). `HK-6` follows that
  policy. `CI-4`, `CI-7` and `CI-8` do **not** fail open: a check is the
  enforcement that survives an absent agent, and `RNF-0001` already says that CI
  fails closed on purpose.
- No new check and no new hook reads the clock directly. The date comes in
  through `CheckContext.today` or through a parameter (`ADR-0007`, `RNF-0004`).
- The generator stays deterministic (`ADR-0005`): Task 9 adds three lines to
  `CHECK_CATALOG` and **regenerates** `docs/contracts/checks.gen.md`; do not edit
  the generated file — `HK-2` denies and `CI-5` enforces.
- `CI-4` is the **only** check authorized to produce a `warning` (spec §9). No
  other check in this phase emits `severity: 'warning'`.

### What this plan decides differently from the backlog, and why

The backlog noted three things about Phase 7. Two were confirmed; one was not.

1. **Confirmed:** _"Plan a `CheckContext.today` **before** writing `CI-4`."_ It
   is Task 3, and `ADR-0007` records it.
2. **Confirmed:** _"`DA-0002` is a precondition of `CI-7`, not a consequence."_
   `ADR-0008` resolves it in Task 1, before any `CI-7` code.
3. **Not confirmed:** _"Add the `multi-team` stage together with the phase."_
   Phase 7 **installs no new artifact** — it installs enforcement, and
   enforcement is not a file that `init` writes: they are checks that already
   ship with the toolkit and hooks that already ship with the plugin. A
   `multi-team` stage would have exactly the same set of files as `production`,
   which is the definition of "stage that installs an empty frame" that the
   backlog itself refuses. What `CI-7` actually requires of `init` is something
   else, and it is real: that every installed document be **declared** in
   `documents:`. That is `RF-0012` and is Task 8, and it holds for every stage —
   because `RN-0016` has no stage. The absence of `multi-team` is written in the
   README and in the backlog, with this reason.

### `HK-5` will ask — read before committing any task

`docs/.ownership.yml` has had `watches` filled in since Phase 3. These entries
hit the commits of this plan:

| Watched path            | Owning doc required in the same commit | Affected tasks |
| ----------------------- | -------------------------------------- | -------------- |
| `src/core/**`           | `docs/requirements/non-functional.md`  | 3, 4           |
| `src/checks/**`         | `docs/requirements/rules.md`           | 5, 6, 7, 9     |
| `src/checks/catalog.ts` | `docs/contracts/checks.gen.md`         | 9              |
| `src/hooks/**`          | `docs/requirements/rules.md`           | 10             |
| `src/cli/**`            | `docs/requirements/functional.md`      | 3, 4, 8, 9     |
| `plugin/skills/**`      | `CONTRIBUTING.md`                      | 13             |

`HK-5` **asks** (`ask`), never denies (`RN-0009`). In Tasks 3 to 10 the answer
is the same: the owning doc traveled in Task 2, with the rule that this code
implements — that is the order that `CONTRIBUTING.md` §"The cycle" requires. In
Task 9 there is a second pending item, `docs/contracts/checks.gen.md`, and that
one **travels in the commit**: regenerate it and add it to `git add`. In Task 13,
`CONTRIBUTING.md` gains lines and goes along.

**Five `watches` entries are `consumer-visible: true`** and point to
`CHANGELOG.md`: `src/cli/**`, `src/checks/catalog.ts`,
`src/config/ownership.ts`, `plugin/**`, `templates/**` and `bin/living-docs`.
Every commit that touches one of these paths carries an entry under
`## [Unreleased]`, or `CI-6` fails the PR. Tasks 4, 8, 9, 10, 11 and 13 say
which line.

**From Task 9 on a new requirement comes in, and it belongs to this phase:** with
`--base`, `CI-7` demands the same link that `HK-5` asks about, and the written
way out is `Docs: none — <reason>` in the commit message (`ADR-0010`). While the
workflow does not pass `--base` (Task 13), that half only runs when someone asks
for it by hand.

### `HK-2` will deny — and that is how you know it works

`docs/contracts/checks.gen.md` is in `generated[]`. Any `Edit`/`Write` on it is
denied by `HK-2`, and that is the correct behavior. Task 9 changes
`src/checks/catalog.ts` and **runs the generator**:

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
```

If you catch yourself trying to edit the table by hand, the source is `catalog.ts`.

## Spec coverage

| Piece | Task |
| ----- | ---- |
| `ADR-0007` (injectable date + verifiable payment trigger), `ADR-0008` (`documents:`, resolves `DA-0002`), `ADR-0009` (duplication threshold), `ADR-0010` (severity of the `watches` signal in CI) | 1 |
| `RF-0010`, `RF-0011`, `RF-0012`, `RNF-0004`, `RN-0016`–`RN-0023` | 2 |
| `src/core/dates.ts`, `src/core/files.ts`, `CheckContext.today` | 3 |
| `documents:` in the parser, `collectDocuments`, `CheckContext.documents` | 4 |
| `CI-4` (staleness + overdue debt) | 5 |
| `CI-7` (ownership coverage) + `src/config/codeowners.ts`, `src/docs/corpus.ts`, `src/docs/markdown.ts`, `src/checks/exception-label.ts` | 6 |
| `CI-8` (links + binary attachment) | 7 |
| `RF-0012`: `init` declares `documents:`; templates and CODEOWNERS; `pay-when` in the TDR template | 8 |
| Registration in `validate` (+ `--base`), catalog, regenerated contract and the dogfooding of this repository | 9 |
| `HK-6` (`SessionStart`, inventory) | 10 |
| `AG-1` docs-divergence-auditor + `CM-5` `/docs-audit` | 11 |
| The end-to-end proof: criteria 5 (half 2), 7 and 8 | 12 |
| Indexes, public contract, workflow and backlog | 13 |
| Human promotion, including `DA-0002 → resolved` | 14 |

**Acceptance criteria of spec §12 that this phase closes:** **7** (a TDR with a
met trigger fails CI until it is paid or reclassified), **8** (the inventory
reaches the context at `SessionStart`) and the **second half of 5** ("and CI
flags it through `watches`"). With that, the ten criteria are covered — and that
is why Task 13 changes the README sentence that said only one half of 5
existed.

---

### Task 1: The four decisions — `ADR-0007`, `ADR-0008`, `ADR-0009`, `ADR-0010`

**Objective:** The rule comes before the code, and here it comes in the form of a
decision: each of the three checks in this phase depends on a choice that is not
obvious and that must leave a trail. Not a single line of code in this task.

**Files:**

- Create: `docs/decisions/adr/ADR-0007-injectable-date-and-verifiable-payment-trigger.md`
- Create: `docs/decisions/adr/ADR-0008-document-without-id-family.md`
- Create: `docs/decisions/adr/ADR-0009-textual-duplication-threshold.md`
- Create: `docs/decisions/adr/ADR-0010-severity-of-the-watches-signal-in-ci.md`

**Interfaces:**

- Consumes: `templates/adr.md` (format), `docs/ids-retired.txt` (none of the four
  numbers is there), and the existing IDs that each `relates-to` cites.
- Produces: the four IDs, citable by Tasks 2 to 14.

**Requirements:**

- All four are born `status: draft`. Promoting is a human act — Task 14.
- **`relates-to` only cites IDs that already exist**, and so the four cite
  requirements and decisions from earlier phases, never the requirements of
  Task 2: `CI-2` fails a citation that does not resolve (`RN-0007`), and an ADR
  that is born citing a requirement not yet written does not pass the
  repository's own CI. The inverse link (requirement → ADR) belongs to Task 2,
  and it is what closes the pair.
- `relates-to` filled in **before** acceptance is a precondition, not a
  consequence: after `accepted` the file freezes and `relates-to` is not in the
  `mutable-fields` (`docs/.ownership.yml`), so fixing it would require
  superseding. The backlog records this as the lesson of `ADR-0001`/`ADR-0002`.
- Each ADR brings at least two alternatives with the real reason for discarding
  them, and the "what we accept losing" section filled in. An ADR without a
  declared negative consequence is propaganda (spec §5, `SK-3`, rule 3).

- [ ] **Step 1: `ADR-0007` — the date source and the payment trigger**

Create `docs/decisions/adr/ADR-0007-injectable-date-and-verifiable-payment-trigger.md`:

````markdown
---
id: ADR-0007
title: The toolkit's date source, and how a payment trigger becomes verifiable
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-27
relates-to: [TDR-0001, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0007 — The toolkit's date source, and how a payment trigger becomes verifiable

## Context

Phase 7 delivers `CI-4`: "`last-reviewed` beyond `stale-after-months` (warning);
TDR with an overdue payment trigger (failure)" (spec §9). Both halves ask for
something the toolkit does not have.

The first asks for **today**. No check so far needed to know the date: `CI-1`
validates it as a format, and nothing more. A check that reads the clock inside
itself is a check whose test passes today and fails in six months, and whose
failure says nothing about the code.

The second asks for a **payment trigger that a machine can evaluate**. Spec §5
(`SK-3`, rule 5) already requires it to be observable — "when the volume goes
past X", "on the first PR that touches this module" —, but requires that of
whoever writes it, in prose. Prose cannot be evaluated. Today `TDR-0001` says
"on the first PR that revokes a requirement", and no tool can decide whether
that happened. Without a verifiable form, acceptance criterion 7 of spec §12
does not close: there is no way to "fail until the debt is paid".

## Alternatives considered

**For the date:**

1. **`new Date()` inside the check.** Discarded. The test would have two outcomes: either
   freezes the process clock — and `node --test` does not have that feature
   without a new dependency, which `ADR-0001` does not want —, or it passes today
   and breaks in the future, which is the same as not testing.
2. **A reference date in `.ownership.yml`.** Discarded. It is calendar cadence
   inside the configuration file: someone would bump it to silence the check,
   which is the anti-requirement of spec §13 moved elsewhere.
3. **`CheckContext.today`, filled in by the caller.** Chosen.

**For the trigger:**

1. **Prose only, as today.** Discarded: it is not verifiable, and criterion 7
   asks for a failure, not attentive reading.
2. **A due date (`due: 2027-01-01`).** Discarded for two reasons. It is the
   calendar cadence that spec §13 refuses; and it is false: debt does not expire
   on the calendar, it expires when the condition that made it acceptable stops
   holding.
3. **A glob of paths evaluated on the diff (`pay-when-paths`).** Discarded as the
   only form. The trigger of `TDR-0001` is a **state** ("a revoked requirement
   exists"), not a touched path; a trigger that only knows how to look at the
   diff forgets the condition in the next PR, and the debt becomes invisible
   again.
4. **Pattern + paths, evaluated on the state of the tree.** Chosen: it covers the
   state, and it covers "the PR that touches this module" from the side that
   survives the merge — what stayed written in the tree.

## Decision

**The date comes in by value, and the payment trigger has a machine form in
addition to prose.**

1. `src/core/dates.ts` is the toolkit's only source of date: `todayIso()`,
   `asIsoDate()` and `monthsBetween()`. The one who calls the clock is the CLI
   and the hook, once, at the edge.
2. `CheckContext.today` carries today in ISO (`YYYY-MM-DD`). No check reads the
   clock.
3. A debt declares, in the frontmatter:

   ```yaml
   pay-when:
     pattern: '^- \*\*status:\*\* revoked'
     paths: ['docs/requirements/**']
   ```

   `pattern` is a regular expression matched **line by line** in the files that
   match `paths`, and goes in **single quotes**: in YAML, single quotes do not
   process `\`, and a pattern in double quotes would require escaping each
   backslash twice — which is how the wrong pattern gets written without anyone
   noticing. The debt's own file is excluded from the scan: a TDR that quotes its
   own trigger is not an occurrence of it.

4. **A debt family is the one that declares `paid` in the state machine** (spec
   §4), not the `TDR` prefix. A project that calls its family something else is
   still covered, because `states` answers, not the name.
5. An `open` debt without a verifiable `pay-when` — missing, incomplete, or with
   a pattern that does not compile — is an **error** of `CI-4`. A trigger that
   is not verifiable is an orphan `TODO` with a number.
6. `last-reviewed` beyond `stale-after-months` is a **warning**, never an error:
   the fix is to read the document, and a red build pushes toward the bulk bump
   that spec §13 refuses.
7. **An item in a frozen state does not expire.** There is nothing to review in
   an item whose body is not edited, and warning about it would only teach people
   to bump `last-reviewed` on accepted ADRs — exactly the anti-requirement.

## Consequences

### What we gain

`CI-4` testable deterministically; acceptance criterion 7 closes; `HK-6` gets
the same two functions without duplicating logic; and the payment trigger stops
being a promise from whoever wrote it and becomes a condition that someone can
see happening.

### What we accept losing

The trigger now has **two forms** — prose, for people, and the pattern, for
machines — and they can diverge. No check verifies that the pattern is the same
trigger the prose describes; whoever keeps the two consistent is the
`decision-recorder`, and that is human verification.

A legacy TDR without `pay-when` fails on the first `validate` after this phase.
It is a conscious break: the alternative was to accept debt without a verifiable
trigger, and then the mechanism would not exist.

`monthsBetween` counts calendar months, not days: a document reviewed on January
31 is "a month old" on February 28. Day precision does not change any decision
that this warning provokes.
````

- [ ] **Step 2: `ADR-0008` — the `documents:` key (resolves `DA-0002`)**

Create `docs/decisions/adr/ADR-0008-document-without-id-family.md`:

````markdown
---
id: ADR-0008
title: How a document without an ID family gets a declared owner
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-27
relates-to: [DA-0002, RN-0001]
supersedes: null
superseded-by: null
---

# ADR-0008 — How a document without an ID family gets a declared owner

## Context

`DA-0002` has been open since Phase 3 and says: how to declare in
`.ownership.yml` an artifact **without an ID family**, so that `CI-7` can demand
an owner without inventing a prefix. The list grew with every phase —
`CONTRIBUTING.md`, the Definition of Done, the agent contract, `docs/glossary.md`,
`docs/charter/`, `docs/contracts/errors.md`, `docs/contracts/versioning-policy.md`,
`CHANGELOG.md`, `docs/deprecations.md` — and Phases 4, 5 and 6 inherited it
without resolving it, because none of them needed to.

`CI-7` does. "Artifact without an entry in CODEOWNERS or in `.ownership.yml`"
(spec §9) is not verifiable while these documents cannot be declared there. The
symptom is cheap to recognize: `parseArtifact` requires an `id-prefix` of 2 to 4
uppercase letters in every entry of `artifacts:`, and none of these documents has
one.

There is a second thing that `CI-7` needs and that nobody had noticed: it needs
to know **which** document is the agent contract (to demand that it does not
repeat text from an owning artifact, spec §5, `SK-6`, rule 1) and **which** is
the Definition of Done (because it is the source of `CI-7`, rule 3 of the same
section). The toolkit does not know `CLAUDE.md` or `docs/definition-of-done.md`
and cannot come to know them (spec §3).

## Alternatives considered

1. **Optional `id-prefix` in `artifacts:`.** Discarded. Every consumer of
   `ArtifactRule` — `CI-1` (state machine by prefix), `CI-2` (numbering and
   sequence), `HK-1` (freezing), `HK-3` (promotion) — would start handling a null
   prefix, and each would gain an `if` to say "this is not my business". The cost
   would fall precisely on Phase 0, which is the most delicate part and the one
   that should change the least.
2. **Inventing prefixes: `CTB`, `DOD`, `GLO`, `CHG`.** Discarded. An ID that
   nobody cites is decorative numbering, and `CI-2` would start demanding a
   sequence from a family of a single item. Worse: it would invite citing
   `CTB-0001` instead of `CONTRIBUTING.md`, trading a path that anyone
   understands for a code that requires a lookup.
3. **CODEOWNERS only.** Discarded. The toolkit's map would stop knowing the
   document: `CI-7` would have no way to say which skill is the owner, `CI-4`
   would have no way to demand review, and the `role` that `CI-7` needs would
   have no place at all.
4. **A new key, `documents:`.** Chosen.

## Decision

**`documents:` declares a document with an owner and without an ID family.**

```yaml
documents:
  - path: CONTRIBUTING.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
  - path: CLAUDE.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/superpowers/
    owner: '@esliph/engineering'
```

- `path` and `owner` are required; `owner` starts with `@` and mirrors
  CODEOWNERS, like `artifacts:`.
- `skill` is **optional**. Its absence is information, not an error: a document
  can have an owner and no owning skill — it is the case of a plan, a spec, a
  README.
- `role` is optional and has a closed vocabulary: `agent-contract` and
  `definition-of-done`. It is what lets `CI-7` find these two documents without
  knowing any path. A role can only be declared once.
- A `path` ending in `/` is a directory and covers what is inside it; without `/`
  it is a file and covers by equality. Same semantics as `artifacts:`.
- **`CI-1`, `CI-2`, `HK-1` and `HK-3` do not read `documents:`.** `CI-4` and
  `CI-7` do. `artifacts:` keeps requiring `id-prefix`.

## Consequences

### What we gain

`DA-0002` closes. `CI-7` can now demand an owner for every document without
inventing a prefix. The distinction between **artifact** (has an ID family, a
lifecycle and freezing) and **document** (has an owner, and maybe a skill)
becomes explicit in the file that is the toolkit's extension point, instead of
living in the head of whoever read the earlier phases.

### What we accept losing

A document declared in `documents:` does **not** have its frontmatter validated
by `CI-1`: a `trigger` with cadence inside `CONTRIBUTING.md` passes. Extending
`CI-1` to `documents:` is a separate decision, and it is not free —
`CHANGELOG.md` has no frontmatter by a Phase 6 decision, and a naive `CI-1`
would start failing it. This phase leaves that out and writes that it left it
out.

`role` is a closed vocabulary: a project that needs a new role waits for a
toolkit version. It is deliberate — an open role would be configuration that the
toolkit does not know how to use.

Two keys can now declare the same path (`artifacts:` and `documents:`). The
parser refuses duplicates within `documents:`, but does not cross the two lists;
`CI-7` treats either as "declared", so the effect of a mistake here is silence,
not an error.
````

- [ ] **Step 3: `ADR-0009` — the textual duplication threshold**

Create `docs/decisions/adr/ADR-0009-textual-duplication-threshold.md`:

```markdown
---
id: ADR-0009
title: The threshold that distinguishes shared vocabulary from copied content
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-27
relates-to: [RN-0010]
supersedes: null
superseded-by: null
---

# ADR-0009 — The threshold that distinguishes shared vocabulary from copied content

## Context

`CI-7` includes "agent contract repeating text from an owning artifact" (spec
§9), and spec §5 (`SK-6`, rule 1) says it is `CI-7` that flags this. `RN-0010`
already declares the rule and records, under "out of scope", that automatic
detection arrives in Phase 7.

It is the only check in the spec with a real risk of false positives. The agent
contract talks about the same things the owning artifacts talk about — pointing
to them is its function —, so it **will** share words. A check that confuses
shared vocabulary with copied content is turned off on the first day, and then
the rule it protected has no enforcement at all.

## Alternatives considered

1. **Any repeated line.** Discarded. It would fail "Nothing runs on the host
   besides Docker", which is legitimate policy, short, and whose presence in the
   agent contract is what makes the agent obey it.
2. **Statistical similarity (shingles, Jaccard, percentage threshold).**
   Discarded. A number that nobody can explain inside a PR is not enforcement,
   it is guessing; and the cost of a false positive here is not an adjustment, it
   is a discussion about the check itself.
3. **Only the requirement title**, which is what
   `test/docs/agent-contract.test.ts` has done since Phase 3. Discarded as the
   final form: it catches the easiest case and lets the copied paragraph through,
   which is the expensive case.
4. **A normalized sentence with a word floor, compared by equality within the
   corpus.** Chosen.

## Decision

**A sentence of twelve words or more from the agent contract that reappears,
word for word, in an artifact with an owning skill, is a duplicate and fails.**

- **Unit: the sentence.** Paragraph first (consecutive lines joined), cut
  afterwards: prose wrapped at eighty columns cannot escape the check just
  because of where the editor pressed enter.
- **Normalization:** lowercase, without markup (`*`, `_`, `` ` ``, `~`), without
  punctuation, whitespace collapsed. A code block — fenced or inline — is removed
  beforehand.
- **Floor: 12 words.** Below that it is shared vocabulary.
- **Corpus: artifacts and declared documents that have an owning skill.** What
  quotes by trade stays out — plan, spec, README, backlog —, because there the
  repetition is the job, and failing the agent contract because of a plan that
  quoted it would invert who copied from whom.
- **Severity: error.** The fix is to delete the sentence from the contract and
  leave the pointer to the owning artifact — never to lower the threshold.

## Consequences

### What we gain

`RN-0010` gets automatic enforcement, and the most expensive duplicate there is —
the one that is reread in every agent session and therefore beats the new version
by repetition — starts being caught by a machine instead of by attentive review.

### What we accept losing

**A paraphrase passes.** A semantic duplicate is not detected, and will not be:
the check that detected it would be wrong more often than right, and its error
would be in a direction that nobody can argue against.

**The floor is a chosen number, not a derived one.** Twelve words is the point
where the policy sentences of this repository fall below and the copied
paragraphs fall above; it is a calibration made against one project's corpus. The
first time it fails a legitimate sentence, the path is a new ADR that changes it,
with the concrete case attached — not a local exception inside the check.

The corpus depends on `skill:` being declared. A document that should be in the
corpus and does not declare a skill stays out, and its duplicate passes. It is
the price of not having a second list of "who enters the corpus".
```

- [ ] **Step 4: `ADR-0010` — the severity of the `watches` signal in CI**

Create `docs/decisions/adr/ADR-0010-severity-of-the-watches-signal-in-ci.md`:

```markdown
---
id: ADR-0010
title: With what severity CI flags the watched path without an owning doc, and what the written way out is
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-27
relates-to: [RN-0008, RN-0009, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0010 — With what severity CI flags the watched path without an owning doc, and what the written way out is

## Context

Acceptance criterion 5 of spec §12 has two halves: "`HK-5` asks and lists the
pending ones; **and** CI flags it through `watches`". Phase 3 delivered the first
and wrote in the README that the second did not exist. `CI-7` is the second.

Three sentences written in different phases do not fit together without a
decision:

- spec §9: "`CI-4` is the only one authorized to merely warn — the others fail,
  because an ignored warning is the beginning of the dead wiki."
- `RN-0009`: "What links code to a document informs or asks. It never blocks."
- spec §12, criterion 5: CI "flags" — a word that serves both.

## Alternatives considered

1. **Warning.** Discarded. The hook half is already the gentle path; if both
   halves warn, mechanism 1 has no barrier at all, and spec §9 says exactly what
   happens to an ignored warning.
2. **Error with no way out.** Discarded. It contradicts `RN-0009` head-on and,
   worse, leaves no honest path for the change that really does not affect the
   doc — which exists, and whose denial is what makes someone turn the
   enforcement off.
3. **Error with an exception label with a written reason.** Chosen.
4. **Not implementing the CI half.** Discarded: criterion 5 would never close,
   and the README sentence would become permanent.

## Decision

**Error, with a written way out: `Docs: none — <reason>`.**

- The diff half of `CI-7` is `severity: 'error'`.
- The only way out is the label `Docs: none — <reason>` in some commit message of
  the range, with a separator and a non-empty reason. A label without a reason is
  not an exception: it is the ticked box.
- This half only runs with `living-docs validate --base <ref>`. Without `--base`,
  `validate` prints the pointer saying it did not run — the same honesty that
  `validate` already has about `drift` and `changelog`.
- The label holds for the whole range of the diff, not per document.

**`RN-0009` stays true within its scope.** Its vocabulary is that of a hook —
`additionalContext` and `ask` —, and what it protects is the moment of the
commit, where there is a person to answer. In CI there is not: `RNF-0001` already
said, under "out of scope", that "CI fails closed on purpose". And the precedent
has been in the repository since Phase 6: the rule `src/cli/** → CHANGELOG.md` is
a `watches` entry, and `CI-6` already fails on it with an escape label
(`ADR-0006`). This decision gives the general case the form that the particular
case already had. `RN-0021` writes the other side of the rule.

## Consequences

### What we gain

Criterion 5 closes entirely. Mechanism 1 gets the two ends that the spec drew:
the cheap question at commit time, and the barrier that survives a disabled hook,
a stopped container and a commit made by hand.

### What we accept losing

One more thing for whoever writes commit messages to remember, and one more label
to explain in `CONTRIBUTING.md`. Two labels (`Changelog: none` and `Docs: none`)
are the beginning of a family of labels, and a family of labels turns into
bureaucracy; the next addition needs its own ADR, precisely for that reason.

**The label is global to the range.** One reason releases all the pending docs of
the PR, not one by one. Per-document granularity would require longer syntax
(`Docs: none (CHANGELOG.md) — <reason>`), and longer syntax does not get used:
the cost of getting the syntax right becomes greater than that of updating the
doc, and then whoever writes does the wrong thing out of ergonomics.

`Docs: none — <reason>` also silences the watched path that **should** have
carried the doc. That is the same risk that `ADR-0006` accepted for the
`CHANGELOG`, and the defense is the same: the reason stays in the history, with
the name of whoever wrote it.
```

- [ ] **Step 5: Run the checks and see the four ADRs pass**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Expected: `validate=0`, no violation. If `CI-2` complains about a "citation that
does not resolve", some `relates-to` is citing an ID from Task 2 — fix it to cite
only existing IDs. If `CI-1` complains about a `status` outside the state machine,
the file was born with something other than `draft`.

- [ ] **Step 6: Commit**

```bash
git add docs/decisions/adr/ADR-0007-injectable-date-and-verifiable-payment-trigger.md docs/decisions/adr/ADR-0008-document-without-id-family.md docs/decisions/adr/ADR-0009-textual-duplication-threshold.md docs/decisions/adr/ADR-0010-severity-of-the-watches-signal-in-ci.md
git commit -m "docs(ADR-0007, ADR-0008, ADR-0009, ADR-0010): the four decisions of Phase 7"
```

---

### Task 2: The requirements — `RF-0010`–`RF-0012`, `RNF-0004`, `RN-0016`–`RN-0023`

**Objective:** The rule written before the code, and the inverse link with the
ADRs of Task 1. This is the commit that all the code tasks cite when `HK-5` asks
about the owning doc.

**Files:**

- Modify: `docs/requirements/functional.md` (adds `RF-0010`, `RF-0011`, `RF-0012`)
- Modify: `docs/requirements/non-functional.md` (adds `RNF-0004`)
- Modify: `docs/requirements/rules.md` (adds `RN-0016` to `RN-0023`)

**Interfaces:**

- Consumes: `ADR-0007`–`ADR-0010` (Task 1), and the section format of
  `templates/requirements.md`.
- Produces: twelve `draft` IDs, cited by the tests of Tasks 3 to 12 and promoted
  in Task 14.

**Requirements:**

- All are born `status: draft`. `CI-3` (rule 7) only demands a citation for an
  `active` item, so the commit passes without the tests existing yet.
- Each section enters **at the end** of the file, in number order. Existing
  sections are not touched.
- The container's `last-reviewed` goes up to `2026-08-27` in the three files —
  they were really reviewed now. This is not a bulk bump: they are the three
  files this commit changes.
- No statement narrates the code. "What **must** be", never "what
  `ci4-staleness.ts` does".

- [ ] **Step 1: Add `RF-0010`, `RF-0011` and `RF-0012`**

In `docs/requirements/functional.md`, update `last-reviewed: 2026-08-27` in the
frontmatter and add at the end:

```markdown
## RF-0010 — `validate` runs the tree-state checks, and a warning does not fail

- **status:** draft
- **relates-to:** ADR-0007, ADR-0008
- **out of scope:** the half of `CI-7` that depends on the diff, which comes in through `--base` and is `RF-0011`

One run of `validate` runs all the checks that make do with the state of the
tree — today `CI-1`, `CI-2`, `CI-3`, `CI-4`, `CI-7` and `CI-8` — and reports the
findings of the six together. An `error` finding leads to exit code 1; a
`warning` finding is reported and does **not** change the exit code.

When there is something that `validate` does not verify — a generated artifact, a
CHANGELOG entry, the branch diff —, it prints the pointer to the command that
does verify it. A check that does not run and does not say that it did not run is
faked coverage.

## RF-0011 — `validate --base <ref>` demands the owning doc of the watched path that changed

- **status:** draft
- **relates-to:** ADR-0010, RN-0021
- **out of scope:** the CHANGELOG entry, which is `CI-6` and has its own command

With `--base <ref>`, `validate` adds to `CI-7` the verification that depends on
the diff: a watched path changed between the base and `HEAD` without the owning
doc in the same diff fails, unless there is a reason written in the history.
Without `--base`, this verification does not run and the command says that it did
not run.

The base is not guessed. Without it, the command does not pick one on its own:
picking wrong would produce a finding about a change that is not from this branch.

## RF-0012 — `init` declares every document it installs

- **status:** draft
- **relates-to:** ADR-0008, RN-0016
- **out of scope:** the `watches` link, the generator and `consumer-visible-paths`, which `init` still does not invent (`RF-0004`)

Every document that `init` writes and that has no ID family is declared in
`documents:`, with an owner and — when there is one — the owning skill. An `init`
that creates a document without declaring it delivers, on the first run, a
repository that fails its own `CI-7`.

This holds in every stage: ownership is not a function of maturity. What changes
with the stage is **which** documents exist.
```

- [ ] **Step 2: Add `RNF-0004`**

In `docs/requirements/non-functional.md`, update `last-reviewed: 2026-08-27`
and add at the end:

```markdown
## RNF-0004 — The result of a check depends neither on the clock nor on the machine

- **status:** draft
- **relates-to:** ADR-0007
- **out of scope:** the value of `stale-after-months`, which is project configuration

Given the same tree, the same configuration and the same date, two runs of a
check produce the same result. The date comes in by value, from the caller; no
check and no hook reads the clock inside.

Without that, the only possible test for what depends on time is the one that
passes today and fails in six months — and a test that fails by itself is a test
that gets deleted.
```

- [ ] **Step 3: Add `RN-0016` to `RN-0023`**

In `docs/requirements/rules.md`, update `last-reviewed: 2026-08-27` and
add at the end:

```markdown
## RN-0016 — A document without a declared owner does not pass

- **status:** draft
- **relates-to:** ADR-0008, RN-0001
- **out of scope:** who the owner is, which belongs to the project and lives in `.ownership.yml` and in CODEOWNERS

Every file under the documentation root, and every declared path that lives
outside it, has an entry in `.ownership.yml` — in `artifacts:`, in `documents:` or
in `generated:` — **and** a line in CODEOWNERS. Both places, not one: the
`.ownership.yml` says which skill answers, CODEOWNERS says who reviews, and a
document with an owner in only one place is a document whose owner disappears at
the first doubt.

An artifact and a document are not the same thing. An artifact has an ID family,
a lifecycle and freezing; a document has an owner, and maybe a skill. Both have
an owner, and that is what this rule demands.

## RN-0017 — A Definition of Done item without a named verification is not an item

- **status:** draft
- **relates-to:** RN-0016
- **out of scope:** whether the named verification is good enough, which is human judgment

Each box of the Definition of Done names what verifies it: a check ID, a hook ID,
or the word that marks human verification. An item without a verification is
intent, and intent is not a definition of done.

It is the Definition of Done that gives authority to the enforcement: an item
that nobody verifies is an item that no check has a way to demand.

## RN-0018 — An overdue document warns; a debt with a met trigger fails

- **status:** draft
- **relates-to:** ADR-0007, RN-0002
- **out of scope:** the value of `stale-after-months`, which is project configuration

`last-reviewed` beyond the project's limit generates a **warning** and does not
fail the build: the fix is to read the document, and a red build pushes toward
the bulk bump that turns the mechanism off while pretending to fulfill it.

An `open` debt whose payment trigger has already happened **fails**, and keeps
failing until the debt is paid or reclassified. Both things are a human act.

An item in a frozen state does not expire. There is nothing to review in an item
whose body is not edited, and warning about it would teach precisely the bump
that the rule refuses.

## RN-0019 — An `open` debt declares the payment trigger in a verifiable way

- **status:** draft
- **relates-to:** ADR-0007, RN-0018
- **out of scope:** the prose wording of the trigger, which stays in the body, is for people to read, and is what explains the why

An `open` debt declares `pay-when` with a pattern and the paths where it is
searched. A trigger that only exists in prose is not verifiable, and a trigger
that is not verifiable is an orphan `TODO` with a number — the very thing the
registered debt existed to not be.

The pattern names a condition in the repository, not a date. Debt does not
expire on the calendar: it expires when the condition that made it acceptable
stops holding.

## RN-0020 — The agent contract does not repeat text from an owning artifact, and the threshold is written

- **status:** draft
- **relates-to:** RN-0010, ADR-0009
- **out of scope:** duplication by paraphrase, which no check detects and whose refusal is human

A sentence of twelve words or more from the agent contract that reappears, word
for word, in an artifact with an owning skill is a duplicate and fails. The fix
is to delete the sentence and leave the pointer to the owning artifact.

Below the threshold it is shared vocabulary, not copied content. The agent
contract talks about the same things the owning artifacts talk about — that is its
function — and a check that failed shared vocabulary would be turned off on the
first day, leaving the rule with no enforcement at all.

## RN-0021 — A watched path without an owning doc fails in CI, and the way out is the written reason

- **status:** draft
- **relates-to:** RN-0008, RN-0009, ADR-0010
- **out of scope:** the moment of the commit, where the enforcement asks instead of failing (`RN-0009`)

In CI, a diff that touches a watched path without the owning doc fails. The only
way out is a reason written in some commit message of the range, in the format
`Docs: none — <reason>`. A label without a reason is not an exception: it is the ticked box.

This does not loosen or contradict `RN-0009`: there, what enforces is a hook, at
the moment when there is a person to answer the question; here there is no person
at all, and the cost of silence is outdated documentation passing with the
authority of a green CI.

## RN-0022 — Session start delivers the inventory, and never blocks

- **status:** draft
- **relates-to:** RN-0009
- **out of scope:** what to do with the inventory, which is the judgment of whoever receives it

At the start of a session, what is present and absent, the open decisions, the
debts with a met trigger and the overdue documents reach the context without
anyone needing to look for them. It is context injection, never a permission
decision.

And it is short by obligation: an inventory that nobody reads is the dead wiki
arriving from the other side, with the aggravating factor of costing context in
every session.

## RN-0023 — A broken link and a binary attachment under the documentation root fail

- **status:** draft
- **relates-to:** RN-0016
- **out of scope:** an anchor inside the file (`#section`), which the enforcement does not resolve — and says that it does not resolve

A relative link that does not resolve to an existing file or directory, a
`[[wikilink]]` without a target, and a file in binary format under the
documentation root fail. A broken link is worse than the absence of a link: it
asserts a connection that does not exist. A binary attachment cannot be read in a
diff nor reviewed in a PR.

Code is not a link: what is inside a fenced block or inline markup is an
example, and demanding examples teaches people not to write examples.
```

- [ ] **Step 4: Run the checks**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec toolkit npm test
```

Expected: `validate=0` and tests passing. If `CI-1` complains about an item without
`status`, the `- **status:** draft` line is missing in some section. If `CI-2`
complains about an ID out of sequence, some number was skipped.

- [ ] **Step 5: Commit**

```bash
git add docs/requirements/functional.md docs/requirements/non-functional.md docs/requirements/rules.md
git commit -m "docs(RF-0010, RF-0011, RF-0012, RNF-0004, RN-0016, RN-0017, RN-0018, RN-0019, RN-0020, RN-0021, RN-0022, RN-0023): the rule before the code of Phase 7"
```

---

### Task 3: `src/core/dates.ts`, `src/core/files.ts` and `CheckContext.today`

**Objective:** The two pieces that Phase 7 presupposes and that no earlier phase
needed: an injectable date source and a shared file walker. Both are pure, small,
and exist because three checks use them — the second is **extracted** from
`src/ids/coverage.ts`, not copied.

**Files:**

- Create: `src/core/dates.ts`
- Create: `src/core/files.ts`
- Test: `test/core/dates.test.ts`
- Test: `test/core/files.test.ts`
- Modify: `src/core/types.ts` (adds `today` to `CheckContext`)
- Modify: `src/ids/coverage.ts` (starts using `listFiles`/`readTextFile`)
- Modify: `src/cli/validate.ts`, `src/cli/drift.ts`, `src/cli/changelog.ts` (fill in `today`)
- Modify: `src/cli/init.ts` (uses `todayIso` instead of the local function)
- Modify: `test/checks/ci1-structure.test.ts`, `test/checks/ci2-ids.test.ts`, `test/checks/ci5-contract-drift.test.ts`, `test/checks/ci6-changelog-required.test.ts` (the context gains `today`)

**Interfaces:**

- Consumes: `picomatch`; `node:fs`.
- Produces:
  - `todayIso(clock?: () => Date): string`
  - `asIsoDate(value: unknown): string | null`
  - `monthsBetween(from: string, to: string): number | null`
  - `listFiles(root: string, globs?: readonly string[]): string[]`
  - `readTextFile(root: string, file: string): string | null`
  - `isProbablyText(content: string): boolean`
  - `SKIP_DIRS: ReadonlySet<string>`, `MAX_BYTES: number`
  - `CheckContext.today: string`

**Requirements:**

- `monthsBetween` and `asIsoDate` return `null` for input that is not an ISO
  date. `null` means "I don't know", and whoever doesn't know stays quiet —
  `CI-1` already demands the format of `last-reviewed`, and two checks
  complaining about the same field is noise.
- `listFiles` without `globs` returns everything; with an empty list it returns
  nothing. The difference matters: "no filter" and "a filter that matches
  nothing" are different questions.
- `readTextFile` returns `null` for a large, binary or unreadable file — the
  three reasons collapse into "do not read", because no consumer in this phase
  treats the three differently.
- `src/ids/coverage.ts` leaves this task **with the same behavior**: the existing
  tests in `test/ids/coverage.test.ts` are the net. Do not change the signature
  of `scanCitations`.
- `CheckContext.today` is required, not optional. An optional field here would
  become a silent `undefined` inside a check, which is exactly the defect that
  `ADR-0007` avoids.

**`HK-5`:** it will ask about `docs/requirements/non-functional.md` (watched path
`src/core/**`) and about `docs/requirements/functional.md` (`src/cli/**`). The
answer: both traveled in Task 2, with `RNF-0004` and `RF-0010`.

- [ ] **Step 1: Write the failing test — dates**

Create `test/core/dates.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asIsoDate, monthsBetween, todayIso } from '../../src/core/dates.ts'

test('RNF-0004: todayIso reads the clock it receives, not the system one', () => {
  const fixo = () => new Date('2026-08-27T13:45:00Z')
  assert.equal(todayIso(fixo), '2026-08-27')
  // without a clock, it is still a ten-character ISO — the format is the contract
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/)
})

test('asIsoDate accepts an ISO string and a Date, and refuses the rest', () => {
  assert.equal(asIsoDate('2026-08-27'), '2026-08-27')
  assert.equal(asIsoDate('  2026-08-27  '), '2026-08-27')
  assert.equal(asIsoDate(new Date('2026-08-27T00:00:00Z')), '2026-08-27')
  assert.equal(asIsoDate('27/08/2026'), null)
  assert.equal(asIsoDate('coming soon'), null)
  assert.equal(asIsoDate(undefined), null)
  assert.equal(asIsoDate(42), null)
  assert.equal(asIsoDate(new Date('not a date')), null)
})

test('monthsBetween counts calendar months and respects the day', () => {
  assert.equal(monthsBetween('2026-01-15', '2026-07-15'), 6)
  assert.equal(monthsBetween('2026-01-15', '2026-07-14'), 5, 'one day short, six months have not passed yet')
  assert.equal(monthsBetween('2026-01-15', '2026-07-16'), 6)
  assert.equal(monthsBetween('2025-12-31', '2026-01-01'), 0)
  assert.equal(monthsBetween('2026-08-27', '2026-08-27'), 0)
})

test('monthsBetween returns negative for a future date and null for what is not a date', () => {
  assert.equal(monthsBetween('2027-01-01', '2026-08-27'), -4)
  assert.equal(monthsBetween('tomorrow', '2026-08-27'), null)
  assert.equal(monthsBetween('2026-08-27', ''), null)
})
```

- [ ] **Step 2: Write the failing test — files**

Create `test/core/files.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { listFiles, readTextFile, isProbablyText, MAX_BYTES } from '../../src/core/files.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const ARVORE = {
  'docs/um.md': '# one\n',
  'docs/sub/dois.md': '# two\n',
  'docs/tres.txt': 'text\n',
  'src/quatro.ts': 'export const x = 1;\n',
  'node_modules/pacote/cinco.md': '# do not read me\n',
  '.git/config': '[core]\n',
}

test('listFiles walks everything, always with `/`, and skips what never holds a document', () => {
  withTempRepo(ARVORE, root => {
    const files = listFiles(root)
    assert.ok(files.includes('docs/sub/dois.md'))
    assert.ok(files.includes('src/quatro.ts'))
    assert.equal(
      files.some(file => file.startsWith('node_modules/')),
      false,
    )
    assert.equal(
      files.some(file => file.startsWith('.git/')),
      false,
    )
    assert.equal(
      files.some(file => file.includes('\\')),
      false,
    )
  })
})

test('listFiles filters by glob; an empty list is not the absence of a filter', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(listFiles(root, ['docs/**/*.md']).sort(), ['docs/sub/dois.md', 'docs/um.md'])
    assert.deepEqual(listFiles(root, []), [], 'an empty filter matches nothing — it is not "everything"')
    assert.ok(listFiles(root, undefined).length > 3, 'no filter is everything')
  })
})

test('listFiles matches a file that starts with a dot — the corpus starts with `.ownership.yml`', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 1\n', 'docs/sub/.gitkeep': '' }, root => {
    assert.deepEqual(listFiles(root, ['docs/**']).sort(), ['docs/.ownership.yml', 'docs/sub/.gitkeep'])
  })
})

test('readTextFile returns the content, and null for binary, large or missing', () => {
  withTempRepo(ARVORE, root => {
    assert.equal(readTextFile(root, 'docs/um.md'), '# one\n')
    assert.equal(readTextFile(root, 'docs/nao-existe.md'), null)

    mkdirSync(join(root, 'docs/anexos'), { recursive: true })
    writeFileSync(join(root, 'docs/anexos/bin.dat'), Buffer.from([0x41, 0x00, 0x42]))
    assert.equal(readTextFile(root, 'docs/anexos/bin.dat'), null, 'a NUL byte is the binary signal')

    writeFileSync(join(root, 'docs/anexos/grande.md'), 'x'.repeat(MAX_BYTES + 1), 'utf8')
    assert.equal(readTextFile(root, 'docs/anexos/grande.md'), null, 'above the ceiling it is data, not text')
  })
})

test('isProbablyText separates text from data by the NUL byte', () => {
  assert.equal(isProbablyText('any prose'), true)
  assert.equal(isProbablyText(`with${String.fromCharCode(0)}nul`), false)
})
```

- [ ] **Step 3: Run and see it fail**

```bash
docker compose exec toolkit node --test test/core/dates.test.ts test/core/files.test.ts
```

Expected: FAIL — `Cannot find module '.../src/core/dates.ts'`.

- [ ] **Step 4: Write `src/core/dates.ts`**

```typescript
/**
 * The toolkit's only source of date (`ADR-0007`, `RNF-0004`).
 *
 * No check and no hook reads the clock inside: whoever reads it is the edge — the
 * CLI, the hook, or the test — and the date comes in by value. Without that, the
 * result of `CI-4` would change by itself as time passes, and the only possible
 * test would be the one that passes today and fails in six months.
 */
export type Clock = () => Date

/** Today, in ISO (`YYYY-MM-DD`), in UTC. */
export function todayIso(clock: Clock = () => new Date()): string {
  return clock().toISOString().slice(0, 10)
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * The value as an ISO date, or `null` when it is not a date.
 *
 * `Date` comes in because the YAML of some projects declares a real timestamp and
 * the parser materializes it. `null` means "I don't know", and whoever doesn't
 * know stays quiet: `CI-1` already demands the format of `last-reviewed`, and two
 * checks complaining about the same field is noise.
 */
export function asIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return ISO.test(trimmed) ? trimmed : null
}

/**
 * Calendar months from `from` to `to`; negative when `from` is in the future,
 * `null` when either is not ISO.
 *
 * Months, not days, on purpose: `stale-after-months` is the field the project
 * declares, and day precision does not change any decision the warning provokes.
 */
export function monthsBetween(from: string, to: string): number | null {
  const start = ISO.exec(from.trim())
  const end = ISO.exec(to.trim())
  if (!start || !end) return null

  const months = (Number(end[1]) - Number(start[1])) * 12 + (Number(end[2]) - Number(start[2]))
  return Number(end[3]) < Number(start[3]) ? months - 1 : months
}
```

- [ ] **Step 5: Write `src/core/files.ts`**

```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'

/**
 * Directories that never contain a document nor a citation written by people.
 *
 * They came from `src/ids/coverage.ts`, which was the only one walking the tree
 * until `CI-4`, `CI-7` and `CI-8` needed it too. A fourth copy of the same scan
 * is how the three diverge.
 */
export const SKIP_DIRS: ReadonlySet<string> = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.cache'])

/** Above this, it is data, not text — and reading costs more than it is worth. */
export const MAX_BYTES = 512 * 1024

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
 * Repository files, relative to the root and always with `/`.
 *
 * Without `globs`, everything. With an empty list, nothing — the two questions
 * are different, and confusing them would make a check with empty configuration
 * scan the whole repository.
 *
 * `dot: true` is not taste: without it, `docs/**` **does not match**
 * `docs/.ownership.yml` nor `docs/decisions/adr/.gitkeep`, because picomatch's
 * default is to ignore files that start with a dot. The corpus of `CI-7` starts
 * precisely with the ownership map, and a walker that hides it would make the
 * check pass by vacuity the one file it cannot leave without an owner. What is
 * really skipped is the `SKIP_DIRS` list, and it is explicit.
 */
export function listFiles(root: string, globs?: readonly string[]): string[] {
  const files: string[] = []
  walk(root, '', files)

  if (globs === undefined) return files
  if (globs.length === 0) return []

  const matches = picomatch([...globs], { dot: true })
  return files.filter(file => matches(file))
}

/** A NUL byte is the cheap signal for "this is binary data, not text". */
export function isProbablyText(content: string): boolean {
  return content.indexOf(String.fromCharCode(0)) === -1
}

/**
 * The file's content, or `null` when it is too large, binary or unreadable. The
 * three reasons collapse into one because no consumer treats them differently:
 * all of them mean "do not read this".
 */
export function readTextFile(root: string, file: string): string | null {
  try {
    if (statSync(join(root, file)).size > MAX_BYTES) return null
    const content = readFileSync(join(root, file), 'utf8')
    return isProbablyText(content) ? content : null
  } catch {
    return null
  }
}
```

- [ ] **Step 6: Run and see it pass**

```bash
docker compose exec toolkit node --test test/core/dates.test.ts test/core/files.test.ts
```

Expected: PASS.

- [ ] **Step 7: Extract the scan from `src/ids/coverage.ts`**

Replace the whole of `src/ids/coverage.ts` with:

```typescript
import { listFiles, readTextFile } from '../core/files.ts'
import { findCitations } from './citations.ts'

export interface CitationSite {
  /** Path relative to the repository root, always with `/`. */
  file: string
  /** 1-indexed line. */
  line: number
}

/**
 * Where each ID appears, restricted to the paths in `globs`.
 * Key: the ID exactly as written in the text — canonicalization belongs to
 * whoever compares.
 *
 * The tree scan and the safe read live in `src/core/files.ts` since Phase 7:
 * `CI-4`, `CI-7` and `CI-8` do the same walk.
 */
export function scanCitations(root: string, globs: readonly string[]): Map<string, CitationSite[]> {
  const sites = new Map<string, CitationSite[]>()
  if (globs.length === 0) return sites

  for (const file of listFiles(root, globs)) {
    const content = readTextFile(root, file)
    if (content === null) continue

    for (const citation of findCitations(content)) {
      const list = sites.get(citation.id) ?? []
      list.push({ file, line: citation.line })
      sites.set(citation.id, list)
    }
  }

  return sites
}
```

Run the safety net:

```bash
docker compose exec toolkit node --test test/ids/coverage.test.ts test/checks/ci3-traceability.test.ts
```

Expected: PASS, without any change in the tests. If any fails, the extraction
changed behavior — compare `SKIP_DIRS` and `MAX_BYTES` with what was there.

- [ ] **Step 8: Add `today` to `CheckContext`**

In `src/core/types.ts`, add to the `CheckContext` interface:

```typescript
/**
 * Today, in ISO. No check reads the clock inside (`ADR-0007`, `RNF-0004`):
 * the date comes in by value, and that is what makes `CI-4` testable.
 */
today: string
```

- [ ] **Step 9: Fill in `today` wherever a context is built**

In `src/cli/validate.ts`, add the import and the field:

```typescript
import { todayIso } from '../core/dates.ts'
```

```typescript
const context = { root, config, docs, today: todayIso() }
```

In `src/cli/drift.ts`, the same import and:

```typescript
// `docs: []` on purpose: CI-5 reads no artifact — it compares the generated file
// with the generator output. `today` comes in because the context is a single one.
const context = { root, config, docs: [], today: todayIso() }
```

In `src/cli/changelog.ts`, the same import and:

```typescript
const context = { root, config, docs: [], today: todayIso() }
```

In `src/cli/init.ts`, swap the local function for the single source — delete:

```typescript
function today(): string {
  return new Date().toISOString().slice(0, 10)
}
```

and start importing and using `todayIso`:

```typescript
import { todayIso } from '../core/dates.ts'
```

```typescript
    TODAY: todayIso(),
```

Two date sources in a toolkit that has just decided to have only one is the
incoherence that `ADR-0007` exists to prevent from being born.

- [ ] **Step 10: Fix the contexts of the existing tests**

Four files build the context by hand. In each one, add
`today: '2026-08-27'`:

- `test/checks/ci1-structure.test.ts`, in both calls:
  `ci1Structure.run({ root, config, docs: collectArtifacts(root, config), today: '2026-08-27' })`
  and `ci1Structure.run({ root, config: parsed, docs: collectArtifacts(root, parsed), today: '2026-08-27' })`.
- `test/checks/ci2-ids.test.ts`:
  `ci2Ids.run({ root, config, docs: collectArtifacts(root, config), today: '2026-08-27' })`.
- `test/checks/ci5-contract-drift.test.ts`:
  `ci5ContractDrift(exec).run({ root, config, docs: [], today: '2026-08-27' })`.
- `test/checks/ci6-changelog-required.test.ts`, in the helper:

```typescript
function contextFor(root: string, ownership = OWNERSHIP) {
  return {
    root,
    config: parseOwnership(ownership),
    docs: [],
    today: '2026-08-27',
  }
}
```

A fixed date, not `todayIso()`: a test that reads the clock is the defect that
this task has just removed from the production code.

- [ ] **Step 11: Run everything**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Expected: PASS, clean type-check, `validate=0`.

- [ ] **Step 12: Commit**

```bash
git add src/core/dates.ts src/core/files.ts src/core/types.ts src/ids/coverage.ts src/cli/validate.ts src/cli/drift.ts src/cli/changelog.ts src/cli/init.ts test/core/dates.test.ts test/core/files.test.ts test/checks/ci1-structure.test.ts test/checks/ci2-ids.test.ts test/checks/ci5-contract-drift.test.ts test/checks/ci6-changelog-required.test.ts
git commit -m "feat(RNF-0004, ADR-0007): injectable date source and shared file scan"
```

`src/cli/**` is a watched path and `consumer-visible`, but nothing here changes
what the command does observably: `init` produces the same date, `validate` the
same output. If `CI-6` complains on the PR, the answer is the label with the
reason:
`Changelog: none — internal refactoring, no observable change`.

---

### Task 4: `documents:` — the document without an ID family gets an owner

**Objective:** Implement what `ADR-0008` decided. It is the piece that unlocks
`CI-7`, and it is the only point in this phase that changes the schema of
`.ownership.yml` — which is why it carries a CHANGELOG entry.

**Files:**

- Modify: `src/config/ownership.ts` (`DocumentRule`, `parseDocument`, `findDocumentRule`, `documentWithRole`)
- Modify: `src/docs/collect.ts` (`DocumentDoc`, `collectDocuments`)
- Modify: `src/core/types.ts` (`CheckContext.documents`)
- Modify: `src/cli/validate.ts`, `src/cli/drift.ts`, `src/cli/changelog.ts`
- Modify: `test/config/ownership.test.ts`, `test/docs/collect.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `asRecord`, `requireString`, `OwnershipError` (already in
  `src/config/ownership.ts`); `parseFrontmatter`; `listMarkdown` (private to
  `src/docs/collect.ts`).
- Produces:
  - `DOCUMENT_ROLES: readonly ['agent-contract', 'definition-of-done']`
  - `type DocumentRole = 'agent-contract' | 'definition-of-done'`
  - `interface DocumentRule { path: string; owner: string; skill: string | null; role: DocumentRole | null }`
  - `OwnershipConfig.documents: DocumentRule[]`
  - `findDocumentRule(config: OwnershipConfig, repoPath: string): DocumentRule | null`
  - `documentWithRole(config: OwnershipConfig, role: DocumentRole): DocumentRule | null`
  - `interface DocumentDoc { file: string; rule: DocumentRule; source: string; frontmatter: Frontmatter | null }`
  - `collectDocuments(root: string, config: OwnershipConfig): DocumentDoc[]`
  - `CheckContext.documents: DocumentDoc[]`

**Requirements:**

- `documents:` is optional and the default is an empty list: an `.ownership.yml`
  from earlier phases stays valid.
- `path` and `owner` required; `owner` starts with `@`. `skill` and `role`
  optional; a `skill` that is present and empty is an error, absent is not.
- A `role` outside the closed vocabulary is an error naming the valid ones. A role
  declared twice is an error: one role, one document.
- A duplicate `path` within `documents:` is an error. The two lists
  (`artifacts:` and `documents:`) are **not** crossed — `ADR-0008` records this
  as an accepted consequence.
- `collectDocuments` reads only `.md`: `docs/.ownership.yml` and
  `docs/ids-retired.txt` have an owner and no frontmatter. Frontmatter with
  invalid syntax in a document becomes `null`, without an exception — `CI-1` does
  not read `documents:`, so there is no one to report it, and bringing down the
  whole `validate` because of it would be worse.

**`HK-5`:** it will ask about `docs/requirements/non-functional.md`
(`src/core/**`, because of `types.ts`) and about
`docs/requirements/functional.md` (`src/cli/**`). Answer: they traveled in Task 2.
`src/config/ownership.ts` is `consumer-visible` — the CHANGELOG entry is in
Step 6 and **travels in this commit**.

- [ ] **Step 1: Write the failing test — parser**

Add to `test/config/ownership.test.ts` (and `findDocumentRule`,
`documentWithRole` to the import from `../../src/config/ownership.ts`):

```typescript
const COM_DOCUMENTOS = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
documents:
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
  - path: CLAUDE.md
    owner: "@team"
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/definition-of-done.md
    owner: "@team"
    skill: working-agreements-keeper
    role: definition-of-done
  - path: docs/superpowers/
    owner: "@team"
`

test('ADR-0008: documents declares path, owner, and optional skill/role', () => {
  const config = parseOwnership(COM_DOCUMENTOS)
  assert.equal(config.documents.length, 4)

  const contributing = config.documents[0]
  assert.equal(contributing?.path, 'CONTRIBUTING.md')
  assert.equal(contributing?.owner, '@team')
  assert.equal(contributing?.skill, 'working-agreements-keeper')
  assert.equal(contributing?.role, null)

  assert.equal(config.documents[3]?.skill, null, 'a document can have an owner and no skill')
})

test('ADR-0008: documents absent is an empty list — the configuration of earlier phases stays valid', () => {
  const config = parseOwnership(`
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
`)
  assert.deepEqual(config.documents, [])
})

test('ADR-0008: a document without a path, with an owner without @, or with an empty skill is refused', () => {
  const semCaminho = COM_DOCUMENTOS.replace('  - path: CONTRIBUTING.md\n', '  - ')
  assert.throws(() => parseOwnership(semCaminho), /documents\[0\]/)

  const donoSemArroba = COM_DOCUMENTOS.replace('  - path: CONTRIBUTING.md\n    owner: "@team"', '  - path: CONTRIBUTING.md\n    owner: "team"')
  assert.throws(() => parseOwnership(donoSemArroba), /must start with @/)

  const skillVazia = COM_DOCUMENTOS.replace('skill: working-agreements-keeper', 'skill: ""')
  assert.throws(() => parseOwnership(skillVazia), /skill/)
})

test('ADR-0008: a role outside the vocabulary names the valid ones; a repeated role is refused', () => {
  const roleEstranho = COM_DOCUMENTOS.replace('role: agent-contract', 'role: manifesto')
  assert.throws(() => parseOwnership(roleEstranho), /agent-contract, definition-of-done/)

  const repetido = COM_DOCUMENTOS.replace('role: definition-of-done', 'role: agent-contract')
  assert.throws(() => parseOwnership(repetido), /One role, one document/)
})

test('ADR-0008: a path declared twice in documents is refused', () => {
  const duplicado = COM_DOCUMENTOS.replace('  - path: docs/superpowers/\n    owner: "@team"', '  - path: CONTRIBUTING.md\n    owner: "@team"')
  assert.throws(() => parseOwnership(duplicado), /One document, one owner/)
})

test('findDocumentRule resolves a file by equality and a directory by prefix', () => {
  const config = parseOwnership(COM_DOCUMENTOS)
  assert.equal(findDocumentRule(config, 'CONTRIBUTING.md')?.owner, '@team')
  assert.equal(findDocumentRule(config, './CONTRIBUTING.md')?.owner, '@team')
  assert.equal(findDocumentRule(config, 'docs/superpowers/plans/x.md')?.path, 'docs/superpowers/')
  assert.equal(findDocumentRule(config, 'README.md'), null)
})

test('documentWithRole finds the document by role, without knowing any path', () => {
  const config = parseOwnership(COM_DOCUMENTOS)
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md')
  assert.equal(documentWithRole(config, 'definition-of-done')?.path, 'docs/definition-of-done.md')

  const semContrato = parseOwnership(COM_DOCUMENTOS.replace('    role: agent-contract\n', ''))
  assert.equal(documentWithRole(semContrato, 'agent-contract'), null)
})
```

- [ ] **Step 2: Write the failing test — collection**

Add to `test/docs/collect.test.ts` (`collectDocuments` to the import from
`../../src/docs/collect.ts`, `parseOwnership` to the one from
`../../src/config/ownership.ts`):

```typescript
const OWNERSHIP_COM_DOCUMENTOS = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
documents:
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
  - path: CHANGELOG.md
    owner: "@team"
    skill: release-historian
  - path: docs/ids-retired.txt
    owner: "@team"
  - path: docs/superpowers/
    owner: "@team"
`

test('ADR-0008: collectDocuments reads only markdown, and absent frontmatter is not an error', () => {
  withTempRepo(
    {
      'CONTRIBUTING.md':
        '---\ntitle: How to contribute\nowner: "@team"\ntrigger: when the process changes\nlast-reviewed: 2026-08-01\n---\n\n# How to contribute\n',
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
      'docs/ids-retired.txt': '# none\n',
      'docs/superpowers/plans/um.md': '# plan\n',
    },
    root => {
      const documents = collectDocuments(root, parseOwnership(OWNERSHIP_COM_DOCUMENTOS))
      assert.deepEqual(documents.map(document => document.file).sort(), ['CHANGELOG.md', 'CONTRIBUTING.md', 'docs/superpowers/plans/um.md'])

      const contributing = documents.find(document => document.file === 'CONTRIBUTING.md')
      assert.equal(contributing?.frontmatter?.data.owner, '@team')

      const changelog = documents.find(document => document.file === 'CHANGELOG.md')
      assert.equal(changelog?.frontmatter, null, 'CHANGELOG has no frontmatter, and that is a Phase 6 decision')

      const plano = documents.find(document => document.file === 'docs/superpowers/plans/um.md')
      assert.equal(plano?.rule.skill, null)
    },
  )
})

test('ADR-0008: a document declared and absent from the repository does not become an entry', () => {
  withTempRepo({}, root => {
    assert.deepEqual(collectDocuments(root, parseOwnership(OWNERSHIP_COM_DOCUMENTOS)), [])
  })
})
```

- [ ] **Step 3: Run and see it fail**

```bash
docker compose exec toolkit node --test test/config/ownership.test.ts test/docs/collect.test.ts
```

Expected: FAIL — `documents` does not exist in `OwnershipConfig`, `collectDocuments`
is not exported.

- [ ] **Step 4: Implement in `src/config/ownership.ts`**

Add, after `GeneratedRule`:

```typescript
/**
 * Roles that the toolkit recognizes in a document (`ADR-0008`).
 *
 * A closed vocabulary on purpose: it is what lets `CI-7` find the agent contract
 * and the Definition of Done without knowing any path (spec §3). An open role
 * would be configuration that the toolkit does not know how to use.
 */
export const DOCUMENT_ROLES = ['agent-contract', 'definition-of-done'] as const
export type DocumentRole = (typeof DOCUMENT_ROLES)[number]

/**
 * A document with an owner and **without** an ID family (`ADR-0008`, which resolves `DA-0002`).
 *
 * It is not an artifact: it has no lifecycle, it is not frozen by `HK-1`, and `CI-1`/
 * `CI-2` do not read it. What it has is an owner — and, when there is one, an owning skill.
 */
export interface DocumentRule {
  path: string
  owner: string
  /** Owning skill, when there is one. `null` is information, not an error. */
  skill: string | null
  role: DocumentRole | null
}
```

Add `documents: DocumentRule[];` to `OwnershipConfig`, after
`generated`.

Extract the normalization that `findArtifactRule` did inline, so that both
resolvers use the same one:

```typescript
function normalizePath(repoPath: string): string {
  return repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Does the declared path cover this path? A directory by prefix, a file by equality. */
function covers(declared: string, repoPath: string): boolean {
  const target = declared.replace(/\\/g, '/')
  return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target
}
```

and rewrite `findArtifactRule` using both:

```typescript
/** The rule that owns a path relative to the repository root, or null. */
export function findArtifactRule(config: OwnershipConfig, repoPath: string): ArtifactRule | null {
  const normalized = normalizePath(repoPath)
  return config.artifacts.find(artifact => covers(artifact.path, normalized)) ?? null
}
```

Add the parser and the two resolvers:

```typescript
function parseDocument(raw: unknown, index: number): DocumentRule {
  const where = `documents[${index}]`
  const item = asRecord(raw, where)

  const owner = requireString(item, 'owner', where)
  if (!owner.startsWith('@')) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.owner "${owner}" must start with @ and mirror CODEOWNERS.`)
  }

  const skill = item.skill
  if (skill !== undefined && (typeof skill !== 'string' || skill.trim() === '')) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.skill must be a non-empty string, or be absent — a document may have no owning skill.`)
  }

  const role = item.role
  if (role !== undefined && !DOCUMENT_ROLES.includes(role as DocumentRole)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.role "${String(role)}" unknown. Valid: ${DOCUMENT_ROLES.join(', ')}.`)
  }

  return {
    path: requireString(item, 'path', where),
    owner,
    skill: skill === undefined ? null : skill,
    role: role === undefined ? null : (role as DocumentRole),
  }
}

/** The document that owns a relative path, or null. Same semantics as `findArtifactRule`. */
export function findDocumentRule(config: OwnershipConfig, repoPath: string): DocumentRule | null {
  const normalized = normalizePath(repoPath)
  return config.documents.find(document => covers(document.path, normalized)) ?? null
}

/** The document that the project declared with this role, or null. */
export function documentWithRole(config: OwnershipConfig, role: DocumentRole): DocumentRule | null {
  return config.documents.find(document => document.role === role) ?? null
}
```

Inside `parseOwnership`, after the `generated` block:

```typescript
const documentsRaw = Array.isArray(root.documents) ? root.documents : []
const documents = documentsRaw.map(parseDocument)

const seenDocuments = new Set<string>()
const seenRoles = new Set<string>()
for (const document of documents) {
  if (seenDocuments.has(document.path)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: document "${document.path}" declared twice. One document, one owner.`)
  }
  seenDocuments.add(document.path)

  if (document.role === null) continue
  if (seenRoles.has(document.role)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: role "${document.role}" declared in two documents. One role, one document.`)
  }
  seenRoles.add(document.role)
}
```

and add `documents,` to the returned object.

- [ ] **Step 5: Implement `collectDocuments` in `src/docs/collect.ts`**

Add `DocumentRule` to the import from `../config/ownership.ts` and, at the end of
the file:

```typescript
export interface DocumentDoc {
  /** Path relative to the repository root, always with `/`. */
  file: string
  rule: DocumentRule
  source: string
  /** `null` when the document has no frontmatter — which is legitimate (`CHANGELOG.md`). */
  frontmatter: Frontmatter | null
}

/**
 * Documents declared in `documents:` that exist in the repository (`ADR-0008`).
 *
 * Markdown only: `docs/.ownership.yml` and `docs/ids-retired.txt` have an owner and
 * no frontmatter, and nothing in this phase asks them for the review date.
 * Frontmatter with invalid syntax becomes `null` silently, because `CI-1` does not
 * read `documents:` and bringing down `validate` because of it would be worse than
 * not reporting.
 */
export function collectDocuments(root: string, config: OwnershipConfig): DocumentDoc[] {
  const documents: DocumentDoc[] = []

  for (const rule of config.documents) {
    const target = rule.path.replace(/\\/g, '/')
    const files = target.endsWith('/') ? listMarkdown(root, target) : [target]

    for (const file of files) {
      if (!file.endsWith('.md')) continue

      let source: string
      try {
        source = readFileSync(join(root, file), 'utf8')
      } catch {
        continue // declared and absent: whoever demands presence is CI-7, not the collection
      }

      let frontmatter: Frontmatter | null = null
      try {
        frontmatter = parseFrontmatter(source)
      } catch {
        frontmatter = null
      }

      documents.push({ file, rule, source, frontmatter })
    }
  }

  return documents
}
```

- [ ] **Step 6: Wire it to `CheckContext` and to the CLI, and write the CHANGELOG entry**

In `src/core/types.ts`, add to `CheckContext`:

```typescript
  /** Documents without an ID family, declared in `documents:` (`ADR-0008`). */
  documents: DocumentDoc[];
```

and change the import to
`import type { ArtifactDoc, DocumentDoc } from '../docs/collect.ts';`

In `src/cli/validate.ts`:

```typescript
import { collectArtifacts, collectDocuments } from '../docs/collect.ts'
```

```typescript
const docs = collectArtifacts(root, config)
const context = {
  root,
  config,
  docs,
  documents: collectDocuments(root, config),
  today: todayIso(),
}
```

In `src/cli/drift.ts` and `src/cli/changelog.ts`, add `documents: []` to the
context — `CI-5` and `CI-6` read no document at all, and declaring that is more
honest than collecting out of habit.

In `CHANGELOG.md`, under `## [Unreleased]`, in the `### Added` subsection:

```markdown
- `documents:` in `docs/.ownership.yml`: declares a document with an owner and
  without an ID family (`CONTRIBUTING.md`, the Definition of Done, the agent
  contract, `CHANGELOG.md`) with `path`, `owner`, optional `skill` and optional
  `role` (`agent-contract`, `definition-of-done`). The key is optional:
  configuration written in earlier versions stays valid.
```

- [ ] **Step 7: Run everything**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Expected: PASS, clean type-check, `validate=0`.

- [ ] **Step 8: Commit**

```bash
git add src/config/ownership.ts src/docs/collect.ts src/core/types.ts src/cli/validate.ts src/cli/drift.ts src/cli/changelog.ts test/config/ownership.test.ts test/docs/collect.test.ts CHANGELOG.md
git commit -m "feat(ADR-0008, RN-0016): documents: in .ownership.yml — a document without an ID family gets an owner"
```

`DA-0002` does **not** change state here. Promoting `open → resolved` is a human
act (`RN-0005`) and is Task 14.

---

### Task 5: `CI-4` — staleness and overdue debt

**Objective:** The check that closes acceptance criterion 7 of spec §12, and the
only one authorized to produce a warning. Two independent halves: an overdue
document (warning) and a debt with a met trigger (error). The functions it
exports are the same ones that `HK-6` will use in Task 10 — the `SessionStart`
inventory reimplements nothing.

**Files:**

- Create: `src/checks/ci4-staleness.ts`
- Test: `test/checks/ci4-staleness.test.ts`

**Interfaces:**

- Consumes: `Check`, `CheckContext`, `Finding` from `src/core/types.ts`;
  `asIsoDate`, `monthsBetween` from `src/core/dates.ts`; `listFiles`,
  `readTextFile` from `src/core/files.ts`; `FROZEN_STATUSES`, `statesFor` from
  `src/docs/schema.ts`.
- Produces:
  - `interface StaleDoc { file: string; line: number; months: number; skill: string | null }`
  - `interface PayWhen { pattern: string; paths: string[] }`
  - `type PayWhenProblem = 'missing' | 'incomplete' | 'invalid pattern'`
  - `interface DebtWithoutTrigger { file: string; line: number; id: string; problem: PayWhenProblem }`
  - `interface DuePayment { file: string; line: number; id: string; pattern: string; evidence: string }`
  - `payWhenOf(data: Record<string, unknown>): PayWhen | PayWhenProblem`
  - `staleDocs(context: CheckContext): StaleDoc[]`
  - `debtsWithoutTrigger(context: CheckContext): DebtWithoutTrigger[]`
  - `duePayments(context: CheckContext): DuePayment[]`
  - `ci4Staleness: Check`

**Requirements:**

- Warning: `last-reviewed` with more months than `stale-after-months`. **An item
  in a frozen state never expires** (`ADR-0007`, decision 7): warning about an
  accepted ADR would only teach the bulk bump that spec §13 refuses.
- A document from `documents:` without frontmatter does not expire — there is no
  field. A document with `last-reviewed` outside ISO does not either: `CI-1`
  already demands the format for artifacts, and for a document there is no one to
  demand it; inventing a second reporter would be noise.
- Error: an `open` debt whose `pay-when` matches in some file of the `paths`. The
  finding points to the **debt's file** (that is where the fix lives) and brings
  the evidence (`file:line`) in the text.
- Error: an `open` debt without a verifiable `pay-when`, with the problem named —
  missing, incomplete, or a pattern that does not compile.
- A debt family is the one that declares `paid` in `statesFor` (spec §4), not the
  `TDR` prefix.
- The pattern is matched **line by line**, and the debt's own file leaves the scan:
  a TDR that quotes its own trigger is not an occurrence of it.
- `CI-4` writes nothing and executes no command. It reads the tree.

**`HK-5`:** it will ask about `docs/requirements/rules.md` (watched path
`src/checks/**`). Answer: the owning doc traveled in Task 2, with `RN-0018` and
`RN-0019`.

- [ ] **Step 1: Write the failing test**

Create `test/checks/ci4-staleness.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ci4Staleness, duePayments, debtsWithoutTrigger, payWhenOf, staleDocs } from '../../src/checks/ci4-staleness.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const HOJE = '2026-08-27'

const OWNERSHIP = `
version: 1
stale-after-months: 6
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, superseded-by, last-reviewed]
  - id-prefix: TDR
    path: docs/decisions/debt/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
documents:
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
  - path: CHANGELOG.md
    owner: "@team"
    skill: release-historian
`

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = parseOwnership(ownership)
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: HOJE,
  }
}

function adr(status: string, lastReviewed: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Test decision',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Never. Immutable once accepted.',
    `last-reviewed: ${lastReviewed}`,
    'relates-to: [RN-0001]',
    '---',
    '',
    'body',
  ].join('\n')
}

/** `pay-when` in YAML with single quotes: single quotes do not process `\`, and the pattern is a regex. */
const PAY_WHEN = ['pay-when:', "  pattern: '^- \\*\\*status:\\*\\* revoked'", '  paths: ["docs/requirements/**"]']

function debt(status: string, extra: readonly string[] = []): string {
  return [
    '---',
    'id: TDR-0001',
    'title: Test shortcut',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: When the payment trigger below is met.',
    'last-reviewed: 2026-08-01',
    ...extra,
    '---',
    '',
    '# TDR-0001 — Test shortcut',
    '',
    'The trigger is the first PR that revokes a requirement.',
  ].join('\n')
}

const RULES_ATIVA = [
  '---',
  'title: Rules',
  'owner: "@team"',
  'trigger: On every new rule.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '## RN-0001 — Any rule',
  '',
  '- **status:** active',
  '',
  'The statement.',
].join('\n')

const RULES_REVOGADA = RULES_ATIVA.replace('- **status:** active', '- **status:** revoked')

test('RN-0018: a document beyond the limit warns, and a warning is not an error', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('draft', '2026-01-01'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      const findings = ci4Staleness.run(contextFor(root))
      const aviso = findings.find(finding => finding.file === 'docs/decisions/adr/ADR-0001-a.md')

      assert.ok(aviso, 'an ADR reviewed in January should be overdue in August')
      assert.equal(aviso.ruleId, 'CI-4')
      assert.equal(aviso.severity, 'warning')
      assert.match(aviso.message, /7 months/)
      assert.match(aviso.message, /stale-after-months/)
      assert.match(aviso.fix, /bulk bump/i)
      assert.equal(
        findings.some(finding => finding.severity === 'error'),
        false,
      )
    },
  )
})

test('ADR-0007: a frozen item does not expire — warning about it would teach the bulk bump', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('accepted', '2020-01-01'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.deepEqual(staleDocs(contextFor(root)), [])
    },
  )
})

test('RN-0018: a document from `documents:` expires; without frontmatter, there is nothing to expire', () => {
  withTempRepo(
    {
      'docs/requirements/rules.md': RULES_ATIVA,
      'CONTRIBUTING.md':
        '---\ntitle: How to contribute\nowner: "@team"\ntrigger: when the process changes\nlast-reviewed: 2025-01-01\n---\n\n# How to contribute\n',
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
    },
    root => {
      const stale = staleDocs(contextFor(root))
      assert.deepEqual(
        stale.map(item => item.file),
        ['CONTRIBUTING.md'],
      )
      assert.equal(stale[0]?.skill, 'working-agreements-keeper')
    },
  )
})

test('RN-0019: an `open` debt without `pay-when` is an error, with the problem named', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      const semGatilho = debtsWithoutTrigger(contextFor(root))
      assert.deepEqual(
        semGatilho.map(item => [item.id, item.problem]),
        [['TDR-0001', 'missing']],
      )

      const findings = ci4Staleness.run(contextFor(root))
      const erro = findings.find(finding => finding.severity === 'error')
      assert.ok(erro)
      assert.equal(erro.file, 'docs/decisions/debt/TDR-0001-x.md')
      assert.match(erro.message, /TDR-0001/)
      assert.match(erro.fix, /pay-when/)
    },
  )
})

test('RN-0019: an incomplete `pay-when` and a pattern that does not compile are distinct errors', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', ['pay-when:', '  paths: ["docs/**"]']),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.equal(debtsWithoutTrigger(contextFor(root))[0]?.problem, 'incomplete')
    },
  )

  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', ['pay-when:', "  pattern: '([('", '  paths: ["docs/**"]']),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.equal(debtsWithoutTrigger(contextFor(root))[0]?.problem, 'invalid pattern')
    },
  )
})

test('criterion 7: a debt with a met trigger fails, and the evidence appears', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', PAY_WHEN),
      'docs/requirements/rules.md': RULES_REVOGADA,
    },
    root => {
      const due = duePayments(contextFor(root))
      assert.equal(due.length, 1)
      assert.equal(due[0]?.id, 'TDR-0001')
      assert.match(due[0]?.evidence ?? '', /^docs\/requirements\/rules\.md:\d+$/)

      const findings = ci4Staleness.run(contextFor(root))
      const erro = findings.find(finding => finding.severity === 'error')
      assert.ok(erro)
      assert.equal(erro.file, 'docs/decisions/debt/TDR-0001-x.md')
      assert.match(erro.message, /payment trigger has already happened/)
      assert.match(erro.message, /docs\/requirements\/rules\.md/)
      assert.match(erro.fix, /paid|accepted-permanently/)
    },
  )
})

test('criterion 7: without the condition in the repository, the `open` debt passes', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', PAY_WHEN),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.deepEqual(duePayments(contextFor(root)), [])
      assert.deepEqual(debtsWithoutTrigger(contextFor(root)), [])
    },
  )
})

test('criterion 7: a paid or permanently accepted debt leaves the count', () => {
  for (const status of ['paid', 'accepted-permanently']) {
    withTempRepo(
      {
        'docs/decisions/debt/TDR-0001-x.md': debt(status, PAY_WHEN),
        'docs/requirements/rules.md': RULES_REVOGADA,
      },
      root => {
        assert.deepEqual(duePayments(contextFor(root)), [], `status ${status} should not be due`)
        assert.deepEqual(debtsWithoutTrigger(contextFor(root)), [])
      },
    )
  }
})

test("ADR-0007: the debt's own file does not count as an occurrence of the trigger", () => {
  withTempRepo(
    {
      // The debt body contains, literally, the text that the pattern searches for.
      'docs/decisions/debt/TDR-0001-x.md': `${debt('open', [
        'pay-when:',
        "  pattern: 'status: revoked'",
        '  paths: ["docs/**"]',
      ])}\n\nThe trigger is any section that becomes \`status: revoked\`.\n`,
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.deepEqual(duePayments(contextFor(root)), [], 'quoting the trigger is not fulfilling it')
    },
  )
})

test('payWhenOf distinguishes missing, incomplete and valid', () => {
  assert.equal(payWhenOf({}), 'missing')
  assert.equal(payWhenOf({ 'pay-when': 'when there is time' }), 'incomplete')
  assert.equal(payWhenOf({ 'pay-when': { pattern: 'x' } }), 'incomplete')
  assert.equal(payWhenOf({ 'pay-when': { pattern: 'x', paths: [] } }), 'incomplete')
  assert.deepEqual(payWhenOf({ 'pay-when': { pattern: 'x', paths: ['src/**'] } }), {
    pattern: 'x',
    paths: ['src/**'],
  })
})

test('CI-4 is the only check that warns: nothing here fails for an overdue document', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('draft', '2019-01-01'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      const findings = ci4Staleness.run(contextFor(root))
      assert.ok(findings.length > 0)
      assert.ok(findings.every(finding => finding.severity === 'warning'))
    },
  )
})
```

- [ ] **Step 2: Run and see it fail**

```bash
docker compose exec toolkit node --test test/checks/ci4-staleness.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/checks/ci4-staleness.ts`**

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { asIsoDate, monthsBetween } from '../core/dates.ts'
import { listFiles, readTextFile } from '../core/files.ts'
import { FROZEN_STATUSES, statesFor } from '../docs/schema.ts'

const RULE = 'CI-4'

/**
 * The state that identifies a debt family (spec §4: `open → paid`).
 *
 * Identification is by the state machine, not by the `TDR` prefix: a project
 * that calls its family something else and declares `states:` is still covered,
 * and the check does not gain a list of prefixes to maintain (`ADR-0007`,
 * decision 4).
 */
const DEBT_STATE = 'paid'

export interface StaleDoc {
  file: string
  line: number
  months: number
  skill: string | null
}

export interface PayWhen {
  /** Regular expression matched line by line. */
  pattern: string
  paths: string[]
}

export type PayWhenProblem = 'missing' | 'incomplete' | 'invalid pattern'

export interface DebtWithoutTrigger {
  file: string
  line: number
  id: string
  problem: PayWhenProblem
}

export interface DuePayment {
  file: string
  line: number
  id: string
  pattern: string
  /** Where the condition was found, in the format `file:line`. */
  evidence: string
}

function finding(severity: 'error' | 'warning') {
  return (file: string, line: number, message: string, fix: string): Finding => ({
    ruleId: RULE,
    file,
    line,
    severity,
    message,
    fix,
  })
}

const warning = finding('warning')
const error = finding('error')

interface Reviewable {
  file: string
  line: number
  status: string | null
  lastReviewed: string | null
  skill: string | null
}

/** Everything that declares a review date: artifact, collection container and document. */
function reviewables(context: CheckContext): Reviewable[] {
  const found: Reviewable[] = []

  for (const doc of context.docs) {
    const frontmatter = doc.frontmatter
    if (!frontmatter) continue
    found.push({
      file: doc.file,
      line: frontmatter.lines['last-reviewed'] ?? 1,
      status: typeof frontmatter.data.status === 'string' ? frontmatter.data.status : null,
      lastReviewed: asIsoDate(frontmatter.data['last-reviewed']),
      skill: doc.rule.skill,
    })
  }

  for (const document of context.documents) {
    const frontmatter = document.frontmatter
    // A document without frontmatter has nothing to expire — it is the case of
    // CHANGELOG, which Phase 6 left without one on purpose.
    if (!frontmatter) continue
    found.push({
      file: document.file,
      line: frontmatter.lines['last-reviewed'] ?? 1,
      status: typeof frontmatter.data.status === 'string' ? frontmatter.data.status : null,
      lastReviewed: asIsoDate(frontmatter.data['last-reviewed']),
      skill: document.rule.skill,
    })
  }

  return found
}

/** Documents reviewed longer ago than the project accepts. */
export function staleDocs(context: CheckContext): StaleDoc[] {
  const limit = context.config.staleAfterMonths
  const stale: StaleDoc[] = []

  for (const item of reviewables(context)) {
    if (item.lastReviewed === null) continue
    // A frozen item is not reviewed (ADR-0007, decision 7).
    if (item.status !== null && FROZEN_STATUSES.has(item.status)) continue

    const months = monthsBetween(item.lastReviewed, context.today)
    if (months === null || months <= limit) continue

    stale.push({
      file: item.file,
      line: item.line,
      months,
      skill: item.skill,
    })
  }

  return stale
}

interface Debt {
  file: string
  line: number
  id: string
  data: Record<string, unknown>
}

function openDebts(context: CheckContext): Debt[] {
  const debts: Debt[] = []

  for (const doc of context.docs) {
    if (doc.rule.collection !== 'per-file') continue
    if (!statesFor(doc.rule)?.includes(DEBT_STATE)) continue

    const frontmatter = doc.frontmatter
    if (!frontmatter || frontmatter.data.status !== 'open') continue

    debts.push({
      file: doc.file,
      line: frontmatter.lines['pay-when'] ?? frontmatter.lines.status ?? 1,
      id: typeof frontmatter.data.id === 'string' ? frontmatter.data.id : doc.file,
      data: frontmatter.data,
    })
  }

  return debts
}

/** The `pay-when` of the frontmatter, or the problem that makes it useless. */
export function payWhenOf(data: Record<string, unknown>): PayWhen | PayWhenProblem {
  const raw = data['pay-when']
  if (raw === undefined || raw === null) return 'missing'
  if (typeof raw !== 'object' || Array.isArray(raw)) return 'incomplete'

  const record = raw as Record<string, unknown>
  const pattern = record.pattern
  const paths = record.paths

  if (typeof pattern !== 'string' || pattern.trim() === '') return 'incomplete'
  if (!Array.isArray(paths) || paths.length === 0) return 'incomplete'
  if (paths.some(path => typeof path !== 'string' || path.trim() === '')) return 'incomplete'

  try {
    new RegExp(pattern)
  } catch {
    return 'invalid pattern'
  }

  return { pattern, paths: paths as string[] }
}

/** `open` debts whose payment trigger is not verifiable (`RN-0019`). */
export function debtsWithoutTrigger(context: CheckContext): DebtWithoutTrigger[] {
  const found: DebtWithoutTrigger[] = []

  for (const debt of openDebts(context)) {
    const payWhen = payWhenOf(debt.data)
    if (typeof payWhen === 'string') {
      found.push({
        file: debt.file,
        line: debt.line,
        id: debt.id,
        problem: payWhen,
      })
    }
  }

  return found
}

/** `open` debts whose trigger has already happened, with the evidence (spec §12, criterion 7). */
export function duePayments(context: CheckContext): DuePayment[] {
  const due: DuePayment[] = []

  for (const debt of openDebts(context)) {
    const payWhen = payWhenOf(debt.data)
    if (typeof payWhen === 'string') continue // whoever reports is debtsWithoutTrigger

    const pattern = new RegExp(payWhen.pattern)

    for (const file of listFiles(context.root, payWhen.paths)) {
      // The debt's own file quotes the trigger in prose; quoting is not fulfilling.
      if (file === debt.file) continue

      const source = readTextFile(context.root, file)
      if (source === null) continue

      const at = source
        .replace(/\r\n/g, '\n')
        .split('\n')
        .findIndex(line => pattern.test(line))
      if (at === -1) continue

      due.push({
        file: debt.file,
        line: debt.line,
        id: debt.id,
        pattern: payWhen.pattern,
        evidence: `${file}:${at + 1}`,
      })
      break
    }
  }

  return due
}

/**
 * `CI-4` — staleness. The **only** check authorized to merely warn (spec §9), and
 * only in the `last-reviewed` half: the fix there is to read the document, and a
 * red build pushes toward the bulk bump that spec §13 refuses. The debt half
 * fails, because it is the one that closes acceptance criterion 7.
 *
 * Source rules: `RN-0018`, `RN-0019`.
 */
export const ci4Staleness: Check = {
  id: RULE,
  name: 'staleness',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const limit = context.config.staleAfterMonths

    for (const stale of staleDocs(context)) {
      findings.push(
        warning(
          stale.file,
          stale.line,
          `\`last-reviewed\` is ${stale.months} months old and this project's limit is ${limit} (\`stale-after-months\`).`,
          `Reread the document and, if it is still true, update \`last-reviewed\`${
            stale.skill === null ? '' : ` (owning skill: ${stale.skill})`
          }. A bump without reading, or a bulk bump, is an anti-requirement of spec §13: it turns the mechanism off while pretending to fulfill it.`,
        ),
      )
    }

    for (const debt of debtsWithoutTrigger(context)) {
      findings.push(
        error(
          debt.file,
          debt.line,
          `${debt.id} is \`open\` and the payment trigger is not verifiable: \`pay-when\` ${debt.problem}.`,
          'Declare `pay-when` with `pattern` (regex, in single quotes) and `paths` (globs where to search for it) — ' +
            'a condition that someone can point at happening (`RN-0019`, `ADR-0007`; owning skill: decision-recorder). ' +
            'A debt without a verifiable trigger is an orphan `TODO` with a number.',
        ),
      )
    }

    for (const payment of duePayments(context)) {
      findings.push(
        error(
          payment.file,
          payment.line,
          `${payment.id} is \`open\` and the payment trigger has already happened: ${payment.evidence} matches \`${payment.pattern}\`.`,
          'Pay the debt, or reclassify it (`paid`, `accepted-permanently`) — both are a human act ' +
            '(`RN-0005`, and `HK-3` intercepts). While it stays `open` with the trigger met, CI fails ' +
            '(spec §12, criterion 7).',
        ),
      )
    }

    return findings
  },
}
```

- [ ] **Step 4: Run and see it pass**

```bash
docker compose exec toolkit node --test test/checks/ci4-staleness.test.ts
docker compose exec toolkit npm run typecheck
```

Expected: PASS and clean type-check. `CI-4` is **not** yet registered in
`validate` — that is Task 9, and that is where the dogfooding happens.

- [ ] **Step 5: Commit**

```bash
git add src/checks/ci4-staleness.ts test/checks/ci4-staleness.test.ts
git commit -m "feat(RN-0018, RN-0019, ADR-0007): CI-4 — staleness warns, overdue debt fails"
```

---

### Task 6: `CI-7` — ownership coverage

**Objective:** The check with the most parts in this phase, and the one that closes
the second half of criterion 5. Four classes of finding, and none of them knows a
project path: an owner in both places, a `watches` link that resolves, an agent
contract without copied text, and a DoD item with a named verification. The
fifth — the diff — comes in by injection, as in `CI-5` and `CI-6`.

**Files:**

- Create: `src/config/codeowners.ts`
- Create: `src/docs/corpus.ts`
- Create: `src/docs/markdown.ts`
- Create: `src/checks/exception-label.ts`
- Create: `src/checks/ci7-ownership-coverage.ts`
- Modify: `src/checks/ci6-changelog-required.ts` (starts using `exceptionReasonFor`)
- Test: `test/config/codeowners.test.ts`
- Test: `test/docs/markdown.test.ts`
- Test: `test/docs/corpus.test.ts`
- Test: `test/checks/ci7-ownership-coverage.test.ts`

**Interfaces:**

- Consumes: `findArtifactRule`, `findDocumentRule`, `documentWithRole`,
  `OWNERSHIP_PATH` from `src/config/ownership.ts`; `pendingDocs` from
  `src/config/watches.ts`; `listFiles` from `src/core/files.ts` (inside
  `src/docs/corpus.ts`); `DiffFacts` from `src/checks/ci6-changelog-required.ts`.
- Produces:
  - `src/config/codeowners.ts`: `CODEOWNERS_PATHS`, `interface CodeownersEntry`,
    `interface Codeowners`, `parseCodeowners(source: string): CodeownersEntry[]`,
    `loadCodeowners(root: string): Codeowners | null`,
    `ownersOf(codeowners: Codeowners, repoPath: string): string[] | null`
  - `src/docs/corpus.ts`: `docsRoot(): string`,
    `declaredPaths(config: OwnershipConfig): string[]`,
    `documentationFiles(root: string, config: OwnershipConfig): string[]`
  - `src/docs/markdown.ts`: `stripCode(source: string): string`,
    `normalizeProse(text: string): string`,
    `sentencesOf(source: string): { text: string; line: number }[]`
  - `src/checks/exception-label.ts`:
    `exceptionReasonFor(label: string, messages: readonly string[]): string | null`
  - `src/checks/ci7-ownership-coverage.ts`: `WORD_FLOOR`,
    `duplicatedSentences(contract, corpus)`,
    `dodItemsWithoutVerification(source: string)`,
    `docsExceptionReason(messages: readonly string[]): string | null`,
    `ci7OwnershipCoverage(diff?: DiffFacts | null): Check`

**Requirements:**

- The documentation root comes from `OWNERSHIP_PATH`, not from a `docs/` literal.
  It is the only path the toolkit has known since Phase 0, and deriving from it is
  what keeps spec §3 true.
- Corpus = everything under the documentation root **plus** every declared path
  that lives outside it and exists. `CONTRIBUTING.md`, `CHANGELOG.md` and the
  agent contract come in that way; `README.md` only comes in if the project
  declares it.
- An owner in **both** places: an entry in `.ownership.yml` (`artifacts:`,
  `documents:` or `generated:`) and a line in CODEOWNERS. A missing CODEOWNERS is
  **one** finding, not one per file.
- A `watches` link whose `doc` does not exist, or exists and has no declared
  owner, is a configuration error — reported on `docs/.ownership.yml`.
- Duplication: only the document with `role: agent-contract`, against the corpus
  of artifacts and documents **with an owning skill**, with a floor of
  `WORD_FLOOR` words (`ADR-0009`). Without a declared role, the class does not
  run.
- DoD: only the document with `role: definition-of-done`. An item is a checkbox
  line (`- [ ]` / `- [x]`) and must cite `CI-n`, `HK-n`, `AG-n`, `SK-n`, or the
  word that marks human verification.
- Diff: only when `diff` is not `null`. `Docs: none — <reason>` in any message of
  the range releases everything (`ADR-0010`).
- CODEOWNERS recognition is deliberately narrow: directory prefix, file equality,
  `*` and simple glob. `CI-7` answers "is there a declared owner?", not "which
  owner would GitHub pick" — imitating the full rules by half would assert a
  precision that the check does not have.

**`HK-5`:** it will ask about `docs/requirements/rules.md` (`src/checks/**`).
Answer: the owning doc traveled in Task 2, with `RN-0016`, `RN-0017`, `RN-0020` and
`RN-0021`.

- [ ] **Step 1: The failing test — CODEOWNERS**

Create `test/config/codeowners.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadCodeowners, ownersOf, parseCodeowners } from '../../src/config/codeowners.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CODEOWNERS = `# Mirrors the owner of docs/.ownership.yml
docs/decisions/adr/    @team
docs/open-decisions.md    @product @team
/CONTRIBUTING.md    @team
docs/contracts/*.md    @contracts
no-owner.md
`

test('parseCodeowners ignores comments and blank lines, and keeps only handles', () => {
  const entries = parseCodeowners(CODEOWNERS)
  assert.equal(entries.length, 5)
  assert.deepEqual(entries[1]?.owners, ['@product', '@team'])
  assert.equal(entries[1]?.line, 3)
  assert.deepEqual(entries[4]?.owners, [], 'a pattern without a handle does not declare an owner')
})

test('ownersOf covers a directory by prefix, a file by equality, and ignores the leading slash', () => {
  const codeowners = {
    file: 'CODEOWNERS',
    entries: parseCodeowners(CODEOWNERS),
  }

  assert.deepEqual(ownersOf(codeowners, 'docs/decisions/adr/ADR-0001-x.md'), ['@team'])
  assert.deepEqual(ownersOf(codeowners, 'docs/open-decisions.md'), ['@product', '@team'])
  assert.deepEqual(ownersOf(codeowners, 'CONTRIBUTING.md'), ['@team'])
  assert.deepEqual(ownersOf(codeowners, 'docs/contracts/errors.md'), ['@contracts'])
  assert.equal(ownersOf(codeowners, 'docs/glossary.md'), null)
  assert.equal(ownersOf(codeowners, 'no-owner.md'), null, 'a pattern without a handle covers nothing')
})

test('ownersOf: `*` covers everything, and the last matching rule wins', () => {
  const codeowners = {
    file: 'CODEOWNERS',
    entries: parseCodeowners('*    @everyone\ndocs/    @docs\n'),
  }
  assert.deepEqual(ownersOf(codeowners, 'any/thing.ts'), ['@everyone'])
  assert.deepEqual(ownersOf(codeowners, 'docs/x.md'), ['@docs'])
})

test('loadCodeowners looks in the three places and returns null when there is none', () => {
  withTempRepo({ '.github/CODEOWNERS': 'docs/    @team\n' }, root => {
    assert.equal(loadCodeowners(root)?.file, '.github/CODEOWNERS')
  })
  withTempRepo(
    {
      'CODEOWNERS': 'docs/    @team\n',
      '.github/CODEOWNERS': 'x    @other\n',
    },
    root => {
      assert.equal(loadCodeowners(root)?.file, 'CODEOWNERS', 'the root comes first')
    },
  )
  withTempRepo({ 'README.md': '' }, root => {
    assert.equal(loadCodeowners(root), null)
  })
})
```

- [ ] **Step 2: The failing test — markdown and corpus**

Create `test/docs/markdown.test.ts`:

`````typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeProse, sentencesOf, stripCode } from '../../src/docs/markdown.ts'

test('stripCode erases a fenced block and inline code, preserving the line count', () => {
  const source = ['prose with `[[wikilink]]` inside', '', '```ts', 'const x = /\\]\\(/;', '```', 'after'].join('\n')
  const stripped = stripCode(source)

  assert.equal(stripped.split('\n').length, source.split('\n').length, 'the finding line depends on this')
  assert.equal(stripped.includes('wikilink'), false, 'inline code is not a link')
  assert.equal(stripped.includes('const x'), false)
  assert.ok(stripped.includes('after'))
})

test('stripCode closes the block only with a fence of the same size or larger', () => {
  const source = ['````markdown', 'example', '```ts', 'const y = 1;', '```', 'still inside', '````', 'outside'].join('\n')
  const stripped = stripCode(source)

  assert.equal(stripped.includes('still inside'), false, 'a fence of 3 does not close one of 4')
  assert.ok(stripped.includes('outside'))
})

test('normalizeProse strips markup, punctuation and case', () => {
  assert.equal(normalizeProse('**The rule** comes before the `code`!'), 'the rule comes before the code')
  assert.equal(normalizeProse('  whitespace   collapsed  '), 'whitespace collapsed')
})

test('sentencesOf joins the paragraph before cutting, and cuts at lists and headings', () => {
  const source = ['# Title', '', 'A sentence that the prose', 'broke over two lines. And another after.', '', '- list item', '- another item'].join('\n')

  const sentences = sentencesOf(source).map(sentence => sentence.text)
  assert.deepEqual(sentences, ['Title', 'A sentence that the prose broke over two lines.', 'And another after.', 'list item', 'another item'])
  assert.equal(sentencesOf(source)[1]?.line, 3, 'the sentence starts on the line where the paragraph started')
})
`````

Create `test/docs/corpus.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { declaredPaths, docsRoot, documentationFiles } from '../../src/docs/corpus.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/api.gen.md
    command: "node gen.js"
documents:
  - path: CONTRIBUTING.md
    owner: "@team"
  - path: outside/the/repo.md
    owner: "@team"
`

test('docsRoot derives from the location of .ownership.yml — no `docs/` literal in the check', () => {
  assert.equal(docsRoot(), 'docs')
})

test('declaredPaths joins artifacts, documents and generated', () => {
  assert.deepEqual(declaredPaths(parseOwnership(OWNERSHIP)).sort(), ['CONTRIBUTING.md', 'docs/contracts/api.gen.md', 'docs/decisions/adr/', 'outside/the/repo.md'])
})

test('documentationFiles = everything under the root + what is declared outside it and exists', () => {
  withTempRepo(
    {
      'docs/.ownership.yml': OWNERSHIP,
      'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
      'docs/contracts/api.gen.md': '# generated\n',
      'docs/ids-retired.txt': '\n',
      'CONTRIBUTING.md': '# how\n',
      'README.md': '# read\n',
      'src/code.ts': 'export const x = 1;\n',
    },
    root => {
      const files = documentationFiles(root, parseOwnership(OWNERSHIP))

      assert.ok(files.includes('docs/decisions/adr/ADR-0001-x.md'))
      assert.ok(files.includes('docs/.ownership.yml'), 'the map is also a document and also has an owner')
      assert.ok(files.includes('docs/ids-retired.txt'))
      assert.ok(files.includes('CONTRIBUTING.md'), 'declared outside the root and exists')
      assert.equal(files.includes('outside/the/repo.md'), false, 'declared and absent does not come in')
      assert.equal(files.includes('README.md'), false, 'not declared and outside the root is not part of the corpus')
      assert.equal(files.includes('src/code.ts'), false)
    },
  )
})
```

- [ ] **Step 3: The failing test — `CI-7`**

Create `test/checks/ci7-ownership-coverage.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci7OwnershipCoverage, docsExceptionReason, dodItemsWithoutVerification, duplicatedSentences } from '../../src/checks/ci7-ownership-coverage.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "new behavior requires a rule with an ID before the code"
documents:
  - path: docs/.ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
  - path: CLAUDE.md
    owner: "@team"
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/definition-of-done.md
    owner: "@team"
    skill: working-agreements-keeper
    role: definition-of-done
`

const CODEOWNERS = [
  'docs/decisions/adr/    @team',
  'docs/.ownership.yml    @team',
  'docs/requirements/    @team',
  'docs/definition-of-done.md    @team',
  'CLAUDE.md    @team',
  '',
].join('\n')

const DOD = ['# Definition of Done', '', '- [ ] The tests pass — verification: `CI-1`.', ''].join('\n')
const CONTRATO = ['# Agent contract', '', 'Index and policy: the truth lives in the owning artifact.', ''].join('\n')
const REGRAS = ['# Rules', '', '## RN-0001 — A rule', '', '- **status:** draft', ''].join('\n')

const ARVORE = {
  'docs/.ownership.yml': OWNERSHIP,
  'CODEOWNERS': CODEOWNERS,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'docs/requirements/rules.md': REGRAS,
  'docs/definition-of-done.md': DOD,
  'CLAUDE.md': CONTRATO,
}

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = parseOwnership(ownership)
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-27',
  }
}

test('RN-0016: a repository with everything declared in both places passes', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(ci7OwnershipCoverage().run(contextFor(root)), [])
  })
})

test('RN-0016: a document under the root without an entry in .ownership.yml fails, naming the file', () => {
  withTempRepo({ ...ARVORE, 'docs/stray.md': '# nobody answers for me\n' }, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root))
    const semDono = findings.filter(finding => finding.file === 'docs/stray.md')

    assert.equal(semDono.length, 2, 'missing in both places: .ownership.yml and CODEOWNERS')
    assert.ok(semDono.every(finding => finding.ruleId === 'CI-7' && finding.severity === 'error'))
    assert.ok(semDono.some(finding => /ownership\.yml/.test(finding.message)))
    assert.ok(semDono.some(finding => /CODEOWNERS/.test(finding.message)))
    assert.ok(semDono.some(finding => /documents:/.test(finding.fix)))
  })
})

test('RN-0016: a missing CODEOWNERS is one finding, not one per file', () => {
  const semCodeowners = { ...ARVORE }
  delete (semCodeowners as Record<string, string>).CODEOWNERS

  withTempRepo(semCodeowners, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root))
    assert.equal(findings.length, 1)
    assert.match(findings[0]?.message ?? '', /CODEOWNERS/)
    assert.equal(findings[0]?.file, 'docs/.ownership.yml')
  })
})

test('RN-0017 (config): a watches link that points to a nonexistent doc or one without an owner fails', () => {
  const docInexistente = OWNERSHIP.replace('doc: docs/requirements/rules.md\n    reason', 'doc: docs/does-not-exist.md\n    reason')
  withTempRepo(ARVORE, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root, docInexistente))
    assert.ok(findings.some(finding => /does not exist/.test(finding.message) && finding.file === 'docs/.ownership.yml'))
  })

  // The doc exists, but nobody declared it: watches points to an orphan document.
  const semDeclaracao = OWNERSHIP.replace('  - path: docs/requirements/rules.md\n    owner: "@team"\n    skill: requirements-keeper\n', '')
  withTempRepo(ARVORE, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root, semDeclaracao))
    assert.ok(findings.some(finding => /has no declared owner/.test(finding.message)))
  })
})

test('RN-0017: a DoD item without a named verification fails, with the line', () => {
  const dodFraca = `${DOD}- [ ] The code is pretty.\n`
  withTempRepo({ ...ARVORE, 'docs/definition-of-done.md': dodFraca }, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root))
    const achado = findings.find(finding => finding.file === 'docs/definition-of-done.md')

    assert.ok(achado)
    assert.equal(achado.line, 4)
    assert.match(achado.message, /verification/)
    assert.match(achado.fix, /CI-n|HK-n/)
  })
})

test('dodItemsWithoutVerification accepts a check ID, a hook ID and the human mark', () => {
  const source = [
    '- [ ] with check — verification: `CI-3`.',
    '- [x] with hook — verification: `HK-1`.',
    '- [ ] with person — verification: human.',
    '- [ ] with nothing.',
    'not a checkbox item.',
  ].join('\n')

  assert.deepEqual(
    dodItemsWithoutVerification(source).map(item => item.line),
    [4],
  )
})

test('RN-0020: a long sentence of the contract repeated in an owning artifact fails', () => {
  const frase = 'Every business rule of this project is born with a stable identifier before any line of code.'
  withTempRepo(
    {
      ...ARVORE,
      'CLAUDE.md': `# Agent contract\n\n${frase}\n`,
      'docs/requirements/rules.md': `${REGRAS}\n${frase}\n`,
    },
    root => {
      const findings = ci7OwnershipCoverage().run(contextFor(root))
      const achado = findings.find(finding => finding.file === 'CLAUDE.md')

      assert.ok(achado, 'CI-7 should flag the duplicate')
      assert.match(achado.message, /docs\/requirements\/rules\.md/)
      assert.match(achado.fix, /pointer|delete/i)
    },
  )
})

test('ADR-0009: a short sentence is shared vocabulary, not a duplicate', () => {
  const curta = 'Nothing runs on the host besides Docker.'
  withTempRepo(
    {
      ...ARVORE,
      'CLAUDE.md': `# Agent contract\n\n${curta}\n`,
      'docs/requirements/rules.md': `${REGRAS}\n${curta}\n`,
    },
    root => {
      assert.deepEqual(ci7OwnershipCoverage().run(contextFor(root)), [])
    },
  )
})

test('duplicatedSentences ignores code and compares normalized', () => {
  const frase = 'A sufficiently long sentence to get past the floor of twelve words without any effort at all'
  const contrato = `# Contract\n\n**${frase}.**\n\n\`\`\`md\n${'another long sentence '.repeat(4)}\n\`\`\`\n`
  const corpus = [
    {
      file: 'docs/x.md',
      source: `prose before. ${frase.toLowerCase()}. prose after.`,
    },
  ]

  const found = duplicatedSentences(contrato, corpus)
  assert.equal(found.length, 1)
  assert.equal(found[0]?.source, 'docs/x.md')
  assert.equal(found[0]?.line, 3)
})

test('criterion 5, half 2: the diff that carries a watched path without the owning doc fails', () => {
  withTempRepo(ARVORE, root => {
    const diff = {
      base: 'origin/master',
      changed: ['src/domain/refund.ts'],
      messages: ['feat: refund'],
    }
    const findings = ci7OwnershipCoverage(diff).run(contextFor(root))
    const achado = findings.find(finding => finding.file === 'docs/requirements/rules.md')

    assert.ok(achado)
    assert.equal(achado.severity, 'error')
    assert.match(achado.message, /src\/domain\/refund\.ts/)
    assert.match(achado.fix, /Docs: none/)
  })
})

test('criterion 5, half 2: with the doc in the same diff, or with the written reason, it passes', () => {
  withTempRepo(ARVORE, root => {
    const comDoc = {
      base: 'origin/master',
      changed: ['src/domain/refund.ts', 'docs/requirements/rules.md'],
      messages: ['feat: refund'],
    }
    assert.deepEqual(ci7OwnershipCoverage(comDoc).run(contextFor(root)), [])

    const comRazao = {
      base: 'origin/master',
      changed: ['src/domain/refund.ts'],
      messages: ['refactor: renames internal\n\nDocs: none — only a rename, the rule did not change'],
    }
    assert.deepEqual(ci7OwnershipCoverage(comRazao).run(contextFor(root)), [])
  })
})

test('ADR-0010: a label without a reason is not an exception', () => {
  assert.equal(docsExceptionReason(['Docs: none — the rule did not change']), 'the rule did not change')
  assert.equal(docsExceptionReason(['Docs: none']), null)
  assert.equal(docsExceptionReason(['docs: NONE — lowercase too']), 'lowercase too')
  assert.equal(docsExceptionReason(['Changelog: none — another label']), null)
})

test('without a diff, the diff half does not run', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(ci7OwnershipCoverage(null).run(contextFor(root)), [])
  })
})
```

- [ ] **Step 4: Run and see it fail**

```bash
docker compose exec toolkit node --test test/config/codeowners.test.ts test/docs/markdown.test.ts test/docs/corpus.test.ts test/checks/ci7-ownership-coverage.test.ts
```

Expected: FAIL — four modules not found.

- [ ] **Step 5: Write `src/config/codeowners.ts`**

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'

/** Where CODEOWNERS can live, in the order it is searched for. */
export const CODEOWNERS_PATHS: readonly string[] = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']

export interface CodeownersEntry {
  pattern: string
  /** Handles only (`@…`); a pattern without a handle does not declare an owner. */
  owners: string[]
  /** 1-indexed line. */
  line: number
}

export interface Codeowners {
  /** Path of the file found, relative to the root. */
  file: string
  entries: CodeownersEntry[]
}

export function parseCodeowners(source: string): CodeownersEntry[] {
  const entries: CodeownersEntry[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim()
    if (line === '' || line.startsWith('#')) continue

    const [pattern, ...rest] = line.split(/\s+/)
    if (pattern === undefined) continue

    entries.push({
      pattern,
      owners: rest.filter(owner => owner.startsWith('@')),
      line: i + 1,
    })
  }

  return entries
}

export function loadCodeowners(root: string): Codeowners | null {
  for (const candidate of CODEOWNERS_PATHS) {
    let source: string
    try {
      source = readFileSync(join(root, candidate), 'utf8')
    } catch {
      continue
    }
    return { file: candidate, entries: parseCodeowners(source) }
  }
  return null
}

function matcherFor(pattern: string): (repoPath: string) => boolean {
  const clean = pattern.replace(/\\/g, '/').replace(/^\//, '')
  if (clean === '*' || clean === '**') return () => true
  if (clean.endsWith('/')) return repoPath => repoPath.startsWith(clean)
  if (clean.includes('*')) {
    const isMatch = picomatch([clean, `${clean}/**`])
    return repoPath => isMatch(repoPath)
  }
  return repoPath => repoPath === clean || repoPath.startsWith(`${clean}/`)
}

/**
 * Owners declared for this path, or `null` when no pattern covers it.
 *
 * Deliberately narrow recognition — directory prefix, file equality, `*` and
 * simple glob —, instead of the full gitignore rules. `CI-7` answers "is there a
 * declared owner?", not "which owner would GitHub pick?"; the second question
 * belongs to GitHub, and imitating it by half would be asserting a precision that
 * this check does not have.
 */
export function ownersOf(codeowners: Codeowners, repoPath: string): string[] | null {
  const target = repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
  let owners: string[] | null = null

  // The last matching rule wins — that is how CODEOWNERS is read.
  for (const entry of codeowners.entries) {
    if (entry.owners.length === 0) continue
    if (matcherFor(entry.pattern)(target)) owners = entry.owners
  }

  return owners
}
```

- [ ] **Step 6: Write `src/docs/markdown.ts`**

```typescript
/** Opens or closes a fenced code block. The group holds the size of the fence. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/

/**
 * The text without code: fenced block and inline markup go away, and the lines stay.
 *
 * Preserving the line count is not a detail — it is what allows reporting the
 * line of the finding. And the fence must close with one of the **same size or
 * larger** (CommonMark): without that, a block opened with four backticks closes
 * at the first three-backtick fence inside it, and the rest of the file goes back
 * to being read as prose — which is exactly how a code example becomes a false
 * positive.
 */
export function stripCode(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let fence: string | null = null

  for (const line of lines) {
    const mark = FENCE.exec(line)?.[1]
    if (fence === null) {
      if (mark !== undefined) {
        fence = mark
        out.push('')
        continue
      }
      out.push(line.replace(/`[^`\n]*`/g, ''))
      continue
    }

    if (mark !== undefined && mark[0] === fence[0] && mark.length >= fence.length) {
      fence = null
    }
    out.push('')
  }

  return out.join('\n')
}

/** Comparable prose: lowercase, without markup, without punctuation, whitespace collapsed. */
export function normalizeProse(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`~]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const BLOCK_START = /^\s*(?:[-*+]\s+|#{1,6}\s+|>\s?|\d+[.)]\s+|\|)/
const MARKER = /^\s*(?:[-*+]\s+|#{1,6}\s+|>\s?|\d+[.)]\s+)/

/**
 * Sentences of the document, already without code, with the line where each one starts.
 *
 * The paragraph is joined **before** the cut into sentences: prose wrapped at
 * eighty columns cannot escape a sentence comparison just because of where the
 * editor pressed enter (`ADR-0009`). A list item, heading, quote and table row
 * start a new sentence — joining them to the previous paragraph would invent a
 * sentence that nobody wrote.
 */
export function sentencesOf(source: string): { text: string; line: number }[] {
  const lines = stripCode(source).split('\n')
  const sentences: { text: string; line: number }[] = []

  let buffer: string[] = []
  let start = 0

  const flush = (): void => {
    if (buffer.length === 0) return
    const paragraph = buffer.join(' ').replace(/\s+/g, ' ').trim()
    buffer = []
    for (const piece of paragraph.split(/(?<=[.!?])\s+/)) {
      const text = piece.trim()
      if (text !== '') sentences.push({ text, line: start })
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    if (raw.trim() === '') {
      flush()
      continue
    }
    if (BLOCK_START.test(raw)) flush()
    if (buffer.length === 0) start = i + 1
    buffer.push(raw.replace(MARKER, '').trim())
  }
  flush()

  return sentences
}
```

- [ ] **Step 7: Write `src/docs/corpus.ts`**

```typescript
import { existsSync } from 'node:fs'
import { join, posix } from 'node:path'
import { OWNERSHIP_PATH } from '../config/ownership.ts'
import type { OwnershipConfig } from '../config/ownership.ts'
import { listFiles } from '../core/files.ts'

/**
 * The documentation root: the directory where `.ownership.yml` lives.
 *
 * It is the only path the toolkit knows, and it has known it since Phase 0
 * (`OWNERSHIP_PATH`). Deriving from here, instead of writing `docs/` inside a
 * check, is what keeps spec §3 true: "hooks and checks do not know any path".
 */
export function docsRoot(): string {
  return posix.dirname(OWNERSHIP_PATH.replace(/\\/g, '/'))
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Every path that `.ownership.yml` declares, in any of the three keys. */
export function declaredPaths(config: OwnershipConfig): string[] {
  return [
    ...config.artifacts.map(artifact => artifact.path),
    ...config.documents.map(document => document.path),
    ...config.generated.map(generated => generated.path),
  ].map(normalize)
}

/**
 * The documentation corpus: everything that lives under the documentation root,
 * plus every declared path that lives outside it and exists.
 *
 * It is the set for which `CI-7` demands an owner and which `CI-8` scans.
 * `CONTRIBUTING.md`, `CHANGELOG.md` and the agent contract come in by being
 * declared; a `README.md` that nobody declared stays out, and that is deliberate —
 * the toolkit does not decide that the repository root is documentation.
 */
export function documentationFiles(root: string, config: OwnershipConfig): string[] {
  const files = new Set(listFiles(root, [`${docsRoot()}/**`]))
  const prefix = `${docsRoot()}/`

  for (const declared of declaredPaths(config)) {
    if (declared.startsWith(prefix)) continue
    if (declared.endsWith('/')) {
      for (const file of listFiles(root, [`${declared}**`])) files.add(file)
      continue
    }
    if (existsSync(join(root, declared))) files.add(declared)
  }

  return [...files].sort()
}
```

- [ ] **Step 8: Write `src/checks/exception-label.ts` and wire `CI-6` to it**

Create `src/checks/exception-label.ts`:

```typescript
/**
 * Exception label in a commit message: `<Label>: none — <reason>`.
 *
 * `Changelog` by `ADR-0006`, `Docs` by `ADR-0010`. The separator is mandatory and
 * so is the reason: a label without a reason is a ticked box, and a ticked box
 * turns the mechanism off while pretending to fulfill it. Two labels are already
 * the beginning of a family — the third needs its own ADR.
 */
export function exceptionReasonFor(label: string, messages: readonly string[]): string | null {
  const pattern = new RegExp(`^[ \\t]*${label}:[ \\t]*none[ \\t]*[—–:-][ \\t]*(\\S.*)$`, 'im')

  for (const message of messages) {
    const reason = pattern.exec(message)?.[1]?.trim()
    if (reason) return reason
  }

  return null
}
```

In `src/checks/ci6-changelog-required.ts`, delete the constant
`EXCEPTION_LABEL` and rewrite the function, keeping the public signature — the
`CI-6` tests are the net:

```typescript
import { exceptionReasonFor } from './exception-label.ts'
```

```typescript
/**
 * The CHANGELOG exception label (`ADR-0006`, decision 4). The form is shared
 * with `CI-7` since Phase 7 (`src/checks/exception-label.ts`).
 */
export function exceptionReason(messages: readonly string[]): string | null {
  return exceptionReasonFor('Changelog', messages)
}
```

```bash
docker compose exec toolkit node --test test/checks/ci6-changelog-required.test.ts
```

Expected: PASS, without touching the test. If it fails, the extraction changed the
semantics of the label — compare the regex with the one that was there.

- [ ] **Step 9: Write `src/checks/ci7-ownership-coverage.ts`**

```typescript
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { DiffFacts } from './ci6-changelog-required.ts'
import { exceptionReasonFor } from './exception-label.ts'
import { OWNERSHIP_PATH, documentWithRole, findArtifactRule, findDocumentRule } from '../config/ownership.ts'
import { loadCodeowners, ownersOf } from '../config/codeowners.ts'
import { pendingDocs } from '../config/watches.ts'
import { documentationFiles } from '../docs/corpus.ts'
import { normalizeProse, sentencesOf, stripCode } from '../docs/markdown.ts'

const RULE = 'CI-7'

/** Word floor of the sentence comparison (`ADR-0009`). */
export const WORD_FLOOR = 12

/**
 * Verification vocabulary of a Definition of Done item (`RN-0017`).
 * A toolkit ID, or the word that marks human verification — in Portuguese or
 * in English, because a generic check cannot demand the project's language.
 */
const VERIFICATION = /\b(?:CI|HK|AG|SK)-\d+\b|\bhumana?\b|\bhuman\b/i

const DOD_ITEM = /^\s*[-*+]\s+\[[ xX]\]\s+\S/

export interface Duplication {
  /** The sentence as it is written in the contract. */
  sentence: string
  line: number
  /** The owning artifact where it reappears. */
  source: string
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** The label that releases the diff half (`ADR-0010`). */
export function docsExceptionReason(messages: readonly string[]): string | null {
  return exceptionReasonFor('Docs', messages)
}

/** Sentences of the agent contract that reappear, word for word, in an owning artifact. */
export function duplicatedSentences(contract: string, corpus: readonly { file: string; source: string }[]): Duplication[] {
  const normalized = corpus.map(entry => ({
    file: entry.file,
    text: normalizeProse(stripCode(entry.source)),
  }))
  const found: Duplication[] = []

  for (const sentence of sentencesOf(contract)) {
    const prose = normalizeProse(sentence.text)
    if (prose.split(' ').filter(Boolean).length < WORD_FLOOR) continue

    const hit = normalized.find(entry => entry.text.includes(prose))
    if (hit)
      found.push({
        sentence: sentence.text,
        line: sentence.line,
        source: hit.file,
      })
  }

  return found
}

/** Definition of Done items that do not name what verifies them (`RN-0017`). */
export function dodItemsWithoutVerification(source: string): { text: string; line: number }[] {
  const lines = stripCode(source).split('\n')
  const found: { text: string; line: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (!DOD_ITEM.test(line)) continue
    if (VERIFICATION.test(line)) continue
    found.push({ text: line.trim(), line: i + 1 })
  }

  return found
}

/**
 * `CI-7` — ownership coverage. Five classes of finding, all read from
 * `.ownership.yml`: a document without an owner, a `watches` link that does not
 * resolve, an agent contract repeating an owning artifact, a DoD item without a
 * named verification, and — when the diff is given — a watched path that
 * traveled without the owning doc.
 *
 * The last is the second half of acceptance criterion 5 of spec §12, and is the
 * reason the diff comes in by injection: `validate` does not have it, and
 * `validate --base` does (`ADR-0010`).
 *
 * Source rules: `RN-0016`, `RN-0017`, `RN-0020`, `RN-0021`, and `RN-0010`
 * for the duplication.
 */
export function ci7OwnershipCoverage(diff: DiffFacts | null = null): Check {
  return {
    id: RULE,
    name: 'ownership coverage',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []
      const { config, root } = context

      const isDeclared = (file: string): boolean =>
        findArtifactRule(config, file) !== null ||
        findDocumentRule(config, file) !== null ||
        config.generated.some(generated => normalizePath(generated.path) === file)

      const codeowners = loadCodeowners(root)
      if (codeowners === null) {
        findings.push(
          error(
            OWNERSHIP_PATH,
            0,
            "CODEOWNERS is missing: no document in this repository has a declared owner on the reviewer's side.",
            'Create `CODEOWNERS` at the root (or in `.github/`), mirroring the `owner` field of each entry in ' +
              '`docs/.ownership.yml` (`RN-0016`; `living-docs init` writes it).',
          ),
        )
      }

      // 1 — every document in the corpus has an owner in both places.
      for (const file of documentationFiles(root, config)) {
        if (!isDeclared(file)) {
          findings.push(
            error(
              file,
              0,
              `\`${file}\` has no entry in \`${OWNERSHIP_PATH}\`.`,
              'Declare it in `artifacts:` (if it has an ID family and a lifecycle), in `documents:` (if it has an owner and ' +
                'no IDs) or in `generated:` (if it is generated) — `RN-0016`, `ADR-0008`. A document without an owner is the ' +
                'anti-requirement of spec §13.',
            ),
          )
        }

        if (codeowners !== null && ownersOf(codeowners, file) === null) {
          findings.push(
            error(
              file,
              0,
              `\`${file}\` has no line in \`${codeowners.file}\`.`,
              `Add \`${file}    @owner\` (or a directory pattern that covers it) mirroring the \`owner\` of the ` +
                '`.ownership.yml` — both places, because one of them says which skill answers and the other who reviews.',
            ),
          )
        }
      }

      // 2 — every watches link points to a doc that exists and has an owner.
      for (const watch of config.watches) {
        const doc = normalizePath(watch.doc)
        if (!existsSync(join(root, doc))) {
          findings.push(
            error(
              OWNERSHIP_PATH,
              0,
              `\`watches\` requires \`${doc}\` for \`${watch.code}\`, and that path does not exist in the repository.`,
              'Create the document, or fix the `doc` of the rule. A link that points to nothing makes `HK-4` and `HK-5` ' +
                'ask for a document that nobody can update (`RN-0017`).',
            ),
          )
          continue
        }
        if (!isDeclared(doc)) {
          findings.push(
            error(
              OWNERSHIP_PATH,
              0,
              `\`watches\` requires \`${doc}\` for \`${watch.code}\`, and that document has no declared owner.`,
              `Declare \`${doc}\` in \`artifacts:\` or \`documents:\` — the code→doc link can only be enforced if the doc ` + 'has an owner (`RN-0016`, `RN-0017`).',
            ),
          )
        }
      }

      // 3 — the agent contract repeating text from an owning artifact.
      const contract = documentWithRole(config, 'agent-contract')
      if (contract !== null) {
        const contractPath = normalizePath(contract.path)
        const source = context.documents.find(document => document.file === contractPath)?.source ?? null

        if (source !== null) {
          // Corpus: whoever has an owning skill. Plan, spec and README quote by trade, and
          // failing the contract because of whoever quoted it would invert who copied
          // from whom (`ADR-0009`).
          const corpus = [
            ...context.docs.map(doc => ({
              file: doc.file,
              source: doc.source,
              skill: doc.rule.skill,
            })),
            ...context.documents.map(document => ({
              file: document.file,
              source: document.source,
              skill: document.rule.skill,
            })),
          ].filter(entry => entry.skill !== null && entry.file !== contractPath && entry.file.endsWith('.md'))

          for (const duplication of duplicatedSentences(source, corpus)) {
            findings.push(
              error(
                contractPath,
                duplication.line,
                `The agent contract repeats, word for word, a sentence from \`${duplication.source}\`: ` + `"${duplication.sentence.slice(0, 120)}".`,
                'Delete the sentence and leave the pointer to the owning artifact. The agent contract is index and policy, ' +
                  'not content (`RN-0010`, `RN-0020`; owning skill: working-agreements-keeper) — and the threshold is not ' +
                  'lowered: changing it is a new `ADR-0009`.',
              ),
            )
          }
        }
      }

      // 4 — a Definition of Done item without a named verification.
      const dod = documentWithRole(config, 'definition-of-done')
      if (dod !== null) {
        const dodPath = normalizePath(dod.path)
        const source = context.documents.find(document => document.file === dodPath)?.source ?? null

        if (source !== null) {
          for (const item of dodItemsWithoutVerification(source)) {
            findings.push(
              error(
                dodPath,
                item.line,
                `Definition of Done item without a named verification: "${item.text.slice(0, 120)}".`,
                'Name what verifies the item — a `CI-n`, an `HK-n`, or the word that marks human verification. ' +
                  'An item that nobody verifies is intent, and intent is not a definition of done (`RN-0017`).',
              ),
            )
          }
        }
      }

      // 5 — the diff half (criterion 5, half 2; `ADR-0010`).
      if (diff !== null && docsExceptionReason(diff.messages) === null) {
        for (const pending of pendingDocs(config, diff.changed)) {
          const gatilho = pending.matched.slice(0, 5).join(', ') + (pending.matched.length > 5 ? `, … (+${pending.matched.length - 5})` : '')

          findings.push(
            error(
              pending.doc,
              0,
              `The diff \`${diff.base}...HEAD\` touches a watched path (${gatilho}) and \`${pending.doc}\` is not among ` + 'the changed paths.',
              `Update \`${pending.doc}\`${
                pending.skill === null ? '' : ` (owning skill: ${pending.skill})`
              } in the same PR — or write the reason in a commit message, in the format \`Docs: none — <reason>\` ` + '(`RN-0021`, `ADR-0010`).',
            ),
          )
        }
      }

      return findings
    },
  }
}
```

- [ ] **Step 10: Run and see it pass**

```bash
docker compose exec toolkit node --test test/config/codeowners.test.ts test/docs/markdown.test.ts test/docs/corpus.test.ts test/checks/ci7-ownership-coverage.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: PASS on everything. `CI-7` is not yet registered in `validate` — Task 9.

- [ ] **Step 11: Commit**

```bash
git add src/config/codeowners.ts src/docs/corpus.ts src/docs/markdown.ts src/checks/exception-label.ts src/checks/ci7-ownership-coverage.ts src/checks/ci6-changelog-required.ts test/config/codeowners.test.ts test/docs/markdown.test.ts test/docs/corpus.test.ts test/checks/ci7-ownership-coverage.test.ts
git commit -m "feat(RN-0016, RN-0017, RN-0020, RN-0021, ADR-0009, ADR-0010): CI-7 — ownership coverage"
```

---

### Task 7: `CI-8` — links and binary attachment

**Objective:** The simplest check of the phase, and the one with the easiest false
positive to produce: a link inside a code block. That is why it starts by erasing
the code.

**Files:**

- Create: `src/checks/ci8-links.ts`
- Test: `test/checks/ci8-links.test.ts`

**Interfaces:**

- Consumes: `readTextFile` from `src/core/files.ts`; `docsRoot`,
  `documentationFiles` from `src/docs/corpus.ts`; `stripCode` from
  `src/docs/markdown.ts`.
- Produces:
  - `interface Link { target: string; line: number; kind: 'link' | 'wikilink' }`
  - `BINARY_EXTENSIONS: ReadonlySet<string>`
  - `findLinks(source: string): Link[]`
  - `ci8Links: Check`

**Requirements:**

- A fenced block and inline markup go away **before** looking for links (`RN-0023`).
  The proof is the repository itself: `docs/superpowers/plans/2026-08-24-living-docs-toolkit-core.md`
  has `](?:mente)` inside a TypeScript block, and that is not a link.
- Three forms of link: inline `[text](target)`, reference definition
  `[id]: target`, and `[[wikilink]]`. An external link (`http:`, `mailto:`, `//`)
  and a pure anchor (`#section`) are ignored.
- The fragment (`#anchor`) is **discarded** and the file is verified. An anchor is
  not resolved, and the check says so in the message instead of pretending.
- A resolved target is an existing file **or** directory: a link to
  `docs/requirements/` is valid.
- `[[wikilink]]` resolves by exact path (with or without `.md`) or by file name
  within the corpus. Ambiguity is not an error: one destination is enough.
- A binary attachment fails **by extension**, and only under the documentation
  root. A denylist, not an allowlist: `.svg` is text and diffable, `.json` and
  `.csv` too, and failing a legitimate text format would be the check teaching
  style. A file without an extension (`.gitkeep`) is never an attachment.
- `CI-8` emits no warning. All findings are `error`.

**`HK-5`:** `docs/requirements/rules.md` (`src/checks/**`) — traveled in Task 2,
with `RN-0023`.

- [ ] **Step 1: Write the failing test**

Create `test/checks/ci8-links.test.ts`:

````typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ci8Links, findLinks } from '../../src/checks/ci8-links.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
documents:
  - path: docs/.ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
  - path: docs/guide.md
    owner: "@team"
    skill: working-agreements-keeper
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
`

function contextFor(root: string) {
  const config = parseOwnership(OWNERSHIP)
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-27',
  }
}

const BASE = {
  'docs/.ownership.yml': OWNERSHIP,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'CONTRIBUTING.md': '# how to contribute\n',
}

test('RN-0023: a relative link that resolves passes; file, directory and anchor included', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': [
        '# Guide',
        '',
        'See [the ADR](decisions/adr/ADR-0001-x.md) and [the folder](decisions/adr/).',
        'The anchor [inside it](decisions/adr/ADR-0001-x.md#context) also resolves.',
        'And [from the root](/CONTRIBUTING.md) the same.',
        'External passes: [site](https://example.com) and [mail](mailto:a@b.c).',
        'A pure anchor passes: [here](#guide).',
        '',
      ].join('\n'),
    },
    root => {
      assert.deepEqual(ci8Links.run(contextFor(root)), [])
    },
  )
})

test('RN-0023: a link that does not resolve fails, with the line and the target', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': ['# Guide', '', 'See [what does not exist](decisions/adr/ADR-9999-x.md).', ''].join('\n'),
    },
    root => {
      const findings = ci8Links.run(contextFor(root))
      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.ruleId, 'CI-8')
      assert.equal(findings[0]?.severity, 'error')
      assert.equal(findings[0]?.file, 'docs/guide.md')
      assert.equal(findings[0]?.line, 3)
      assert.match(findings[0]?.message ?? '', /ADR-9999-x\.md/)
    },
  )
})

test('RN-0023: a link inside a fenced block or inline markup is not a link', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': [
        '# Guide',
        '',
        'Inline regex: `/\\]\\(?:mente\\)/` is not a link.',
        '',
        '```ts',
        'const CADENCE = /\\b(?:tri|bi)?mestral(?:mente)?\\b/i;',
        'const link = "[text](does-not-exist.md)";',
        '```',
        '',
        'And `[[wikilink]]` between backticks is the name of the format, not a destination.',
        '',
      ].join('\n'),
    },
    root => {
      assert.deepEqual(ci8Links.run(contextFor(root)), [])
    },
  )
})

test('RN-0023: a wikilink resolves by file name, and without a destination fails', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': ['# Guide', '', 'See [[ADR-0001-x]] and [[CONTRIBUTING]].', 'But [[none-of-it]] does not exist.', ''].join('\n'),
    },
    root => {
      const findings = ci8Links.run(contextFor(root))
      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 4)
      assert.match(findings[0]?.message ?? '', /none-of-it/)
      assert.match(findings[0]?.message ?? '', /wikilink/i)
    },
  )
})

test('RN-0023: a reference definition is also a link', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': ['# Guide', '', 'See [the adr][adr].', '', '[adr]: decisions/adr/ADR-0000-nonexistent.md', ''].join('\n'),
    },
    root => {
      const findings = ci8Links.run(contextFor(root))
      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 5)
    },
  )
})

test('RN-0023: a binary attachment under the documentation root fails; text and .gitkeep do not', () => {
  withTempRepo({ ...BASE, 'docs/guide.md': '# Guide\n' }, root => {
    mkdirSync(join(root, 'docs/attachments'), { recursive: true })
    writeFileSync(join(root, 'docs/attachments/diagram.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    writeFileSync(join(root, 'docs/attachments/diagram.svg'), '<svg></svg>\n', 'utf8')
    writeFileSync(join(root, 'docs/attachments/data.json'), '{}\n', 'utf8')
    writeFileSync(join(root, 'docs/attachments/.gitkeep'), '', 'utf8')

    const findings = ci8Links.run(contextFor(root))
    assert.equal(findings.length, 1, JSON.stringify(findings, null, 2))
    assert.equal(findings[0]?.file, 'docs/attachments/diagram.png')
    assert.match(findings[0]?.message ?? '', /binary/)
    assert.match(findings[0]?.fix ?? '', /text|SVG/i)
  })
})

test('RN-0023: a binary outside the documentation root is not a matter for CI-8', () => {
  withTempRepo({ ...BASE, 'docs/guide.md': '# Guide\n' }, root => {
    mkdirSync(join(root, 'assets'), { recursive: true })
    writeFileSync(join(root, 'assets/logo.png'), Buffer.from([0x89, 0x50]))
    assert.deepEqual(ci8Links.run(contextFor(root)), [])
  })
})

test('findLinks recognizes the three forms and ignores external and pure anchor', () => {
  const source = [
    'inline [a](x.md) and image ![b](y.png)',
    '[ref]: z.md',
    'wiki [[w]] and [[w|with title]]',
    'external [c](https://x.y) [d](mailto:a@b.c) [e](//cdn.x)',
    'anchor [f](#section)',
  ].join('\n')

  assert.deepEqual(findLinks(source), [
    { target: 'x.md', line: 1, kind: 'link' },
    { target: 'y.png', line: 1, kind: 'link' },
    { target: 'z.md', line: 2, kind: 'link' },
    { target: 'w', line: 3, kind: 'wikilink' },
    { target: 'w', line: 3, kind: 'wikilink' },
  ])
})
````

- [ ] **Step 2: Run and see it fail**

```bash
docker compose exec toolkit node --test test/checks/ci8-links.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/checks/ci8-links.ts`**

```typescript
import { existsSync } from 'node:fs'
import { join, posix } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { readTextFile } from '../core/files.ts'
import { docsRoot, documentationFiles } from '../docs/corpus.ts'
import { stripCode } from '../docs/markdown.ts'

const RULE = 'CI-8'

/**
 * Formats that cannot be read in a diff nor reviewed in a PR (spec §13).
 *
 * A denylist, not an allowlist, on purpose: `.svg` is XML and diffable, `.json` and
 * `.csv` are text, and failing a legitimate text format would be the check teaching
 * style instead of enforcing the rule. What the spec refuses is the **binary**.
 */
export const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
  'ico',
  'tif',
  'tiff',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'zip',
  'gz',
  'tgz',
  'bz2',
  'xz',
  '7z',
  'rar',
  'jar',
  'mp3',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'wav',
  'ogg',
  'webm',
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',
  'drawio',
  'vsdx',
  'sketch',
  'fig',
  'psd',
  'ai',
])

export interface Link {
  target: string
  /** 1-indexed line. */
  line: number
  kind: 'link' | 'wikilink'
}

const INLINE = /\[[^\]\n]*\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)/g
const DEFINITION = /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*<?([^\s>]+)>?/g
const WIKILINK = /\[\[([^\]|\n]+?)(?:\|[^\]\n]*)?\]\]/g

/** A protocol, or a network root: the target is not from this repository. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

/** The target points outside the repository, or inside the file itself. */
function isOutOfScope(target: string): boolean {
  return EXTERNAL.test(target) || target.startsWith('#')
}

/**
 * Links of a text **already without code** (`stripCode` is the caller's job).
 *
 * Only what should resolve inside the repository: an external link and a pure
 * anchor leave here, and not further down. A link checker that tries to resolve
 * `https://` needs a network, and the toolkit has none (`RNF-0001`).
 */
export function findLinks(source: string): Link[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const links: Link[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    for (const regex of [INLINE, DEFINITION]) {
      for (const match of line.matchAll(regex)) {
        const target = match[1]
        if (target && !isOutOfScope(target)) links.push({ target, line: i + 1, kind: 'link' })
      }
    }
    for (const match of line.matchAll(WIKILINK)) {
      const target = match[1]?.trim()
      if (target) links.push({ target, line: i + 1, kind: 'wikilink' })
    }
  }

  return links
}

/**
 * The target as a path relative to the repository root, or `null` when no path
 * is left after removing fragment and query.
 *
 * The fragment is discarded and the **file** is verified: resolving an anchor
 * would require reproducing the slug rule of each renderer, and a rule reproduced
 * by half fails a link that works.
 */
function resolveTarget(from: string, target: string): string | null {
  const withoutFragment = target.split('#')[0]?.split('?')[0] ?? ''
  if (withoutFragment === '') return null

  let decoded = withoutFragment
  try {
    decoded = decodeURIComponent(withoutFragment)
  } catch {
    // a target with a `%` that is not an escape: verify it as it came
  }

  const base = decoded.startsWith('/') ? decoded.slice(1) : posix.join(posix.dirname(from), decoded)

  return posix.normalize(base).replace(/^\.\//, '')
}

/** File name (without `.md`, lowercase) → corpus files with that name. */
function wikilinkIndex(files: readonly string[]): Map<string, string[]> {
  const index = new Map<string, string[]>()

  for (const file of files) {
    const name = posix.basename(file).replace(/\.md$/i, '').toLowerCase()
    index.set(name, [...(index.get(name) ?? []), file])
  }

  return index
}

function extensionOf(file: string): string | null {
  const base = posix.basename(file)
  const dot = base.lastIndexOf('.')
  // `dot <= 0` covers "no extension" and ".gitkeep" — a name that starts with a dot.
  return dot <= 0 ? null : base.slice(dot + 1).toLowerCase()
}

/**
 * `CI-8` — links. Source rule: `RN-0023`.
 *
 * It starts by erasing code, and that order is the check: the first thing a naive
 * link scanner catches is the link example inside a TypeScript block — and
 * demanding examples teaches people not to write examples.
 */
export const ci8Links: Check = {
  id: RULE,
  name: 'links',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const files = documentationFiles(context.root, context.config)
    const prefix = `${docsRoot()}/`
    const corpus = new Set(files)
    const index = wikilinkIndex(files)

    // 1 — a binary attachment under the documentation root (spec §13).
    for (const file of files) {
      if (!file.startsWith(prefix)) continue
      const extension = extensionOf(file)
      if (extension === null || !BINARY_EXTENSIONS.has(extension)) continue

      findings.push(
        error(
          file,
          0,
          `Attachment in binary format under \`${prefix}\`: \`.${extension}\` cannot be read in a diff nor reviewed in a PR.`,
          'Keep the source as text (Mermaid in a code block, SVG, or the `.puml`/`.dot` that generates it) and ' +
            'keep the binary out of the versioned documentation (spec §13, `RN-0023`).',
        ),
      )
    }

    // 2 — links.
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const source = readTextFile(context.root, file)
      if (source === null) continue

      for (const link of findLinks(stripCode(source))) {
        if (link.kind === 'wikilink') {
          const target = link.target.replace(/\.md$/i, '')
          const resolved = corpus.has(`${target}.md`) || corpus.has(target) || index.has(target.toLowerCase())

          if (!resolved) {
            findings.push(
              error(
                file,
                link.line,
                `\`[[${link.target}]]\` has no destination: no document in the corpus has that name.`,
                'Point to an existing document by file name, or swap it for a relative link. ' +
                  'A wikilink without a destination asserts a connection that does not exist (`RN-0023`).',
              ),
            )
          }
          continue
        }

        const resolved = resolveTarget(file, link.target)
        if (resolved === null) continue

        if (resolved.startsWith('..') || !existsSync(join(context.root, resolved))) {
          findings.push(
            error(
              file,
              link.line,
              `Broken internal link: \`${link.target}\` resolves to \`${resolved}\`, which does not exist.`,
              'Fix the path, or remove the link. The anchor (`#section`) is not verified — only the file —, ' +
                'so a link with an anchor only fails when the file does not exist (`RN-0023`).',
            ),
          )
        }
      }
    }

    return findings
  },
}
```

- [ ] **Step 4: Run and see it pass**

```bash
docker compose exec toolkit node --test test/checks/ci8-links.test.ts
docker compose exec toolkit npm run typecheck
```

Expected: PASS and clean type-check.

- [ ] **Step 5: Commit**

```bash
git add src/checks/ci8-links.ts test/checks/ci8-links.test.ts
git commit -m "feat(RN-0023): CI-8 — broken internal link and binary attachment under docs/"
```

---

### Task 8: What `init` writes — `documents:`, CODEOWNERS and the TDR's `pay-when`

**Objective:** `RF-0012`. Without this task, registering `CI-7` in `validate`
(Task 9) would make `init` deliver, on the first run, a repository that fails its
own check — and the tests in `test/acceptance/consumer-repo.test.ts` would say so
to its face. That is why it comes **before** the registration.

**Files:**

- Modify: `src/cli/init.ts`
- Modify: `templates/ownership.yml`
- Modify: `templates/CODEOWNERS`
- Modify: `templates/tdr.md`
- Modify: `test/cli/init.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `OWNERSHIP_PATH`, `RETIRED_IDS_PATH`, `DOCUMENT_ROLES`; the template
  mechanism that already exists (`{{KEY}}`).
- Produces: `documents:` in the `.ownership.yml` that `init` writes, and
  `declareDocuments` for the repository that goes up a stage.

**Requirements:**

- Every stage declares `docs/.ownership.yml` and `docs/ids-retired.txt` — both
  are born in `solo`, and both are under the documentation root.
- `small-team` adds `CONTRIBUTING.md`, the Definition of Done (with
  `role: definition-of-done`), the agent contract (with
  `role: agent-contract`), `docs/glossary.md` and `docs/charter/`.
- `production` adds `docs/contracts/errors.md`,
  `docs/contracts/versioning-policy.md`, `CHANGELOG.md`,
  `docs/deprecations.md` and `docs/migrations/`.
- The agent contract path is the **adopted** one: `AGENTS.md` when it exists,
  `CLAUDE.md` when it does not. Declaring `CLAUDE.md` in a repository that has
  `AGENTS.md` would be declaring a file that `init` did not create.
- `documents:` comes **after** `generated:` in the template. It is not taste:
  `declareArtifacts` inserts the artifact block immediately before
  `\ngenerated:`, and a `documents:` between `artifacts:` and `generated:` would
  make the artifact entry be born inside the list of documents.
- A repository that goes up a stage: `declareDocuments` inserts the missing
  entries right after the `documents:` line, when it exists; creates the whole
  block before `\nwatches:` when it does not exist; and, with neither anchor,
  writes a line in `notInstalled` instead of guessing. Same policy as
  `declareArtifacts`.
- Idempotence (`RF-0002`): running twice does not duplicate an entry.
- `templates/tdr.md` gains the `pay-when` **commented out**, with an example.
  `init` and the skill do not invent a trigger, for the same reason they do not
  invent `watches`: the new TDR is born without it and `CI-4` demands it on the
  spot, naming what is missing — which is exactly the conversation that needs to
  happen.

**`HK-5`:** `docs/requirements/functional.md` (`src/cli/**`) — traveled in Task 2,
with `RF-0012`. `src/cli/**` and `templates/**` are `consumer-visible`: the
CHANGELOG entry is in Step 5 and travels in this commit.

- [ ] **Step 1: Write the failing test**

Add to `test/cli/init.test.ts`:

```typescript
import { parseOwnership } from '../../src/config/ownership.ts'

function ownershipOf(root: string) {
  return parseOwnership(readFileSync(join(root, 'docs/.ownership.yml'), 'utf8'))
}

test('RF-0012: solo declares the map and the retired IDs in documents:', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo' })
    const documents = ownershipOf(root).documents

    assert.deepEqual(documents.map(document => document.path).sort(), ['docs/.ownership.yml', 'docs/ids-retired.txt'])
    assert.ok(documents.every(document => document.owner === '@team'))

    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')
    assert.match(codeowners, /docs\/ids-retired\.txt\s+@team/)
    assert.match(codeowners, /docs\/\.ownership\.yml\s+@team/)
  })
})

test('RF-0012: small-team declares the agreements, the language and the two roles', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'small-team' })
    const documents = ownershipOf(root).documents
    const byPath = new Map(documents.map(document => [document.path, document]))

    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md', 'docs/glossary.md', 'docs/charter/']) {
      assert.ok(byPath.has(path), `${path} should be declared`)
    }
    assert.equal(byPath.get('CLAUDE.md')?.role, 'agent-contract')
    assert.equal(byPath.get('docs/definition-of-done.md')?.role, 'definition-of-done')
    assert.equal(byPath.get('docs/glossary.md')?.skill, 'glossary-keeper')
    assert.equal(byPath.get('docs/charter/')?.skill, 'charter-keeper')
  })
})

test('RF-0012: production declares contracts and the historical trail', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'production' })
    const paths = ownershipOf(root).documents.map(document => document.path)

    for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md', 'CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
      assert.ok(paths.includes(path), `${path} should be declared`)
    }
  })
})

test('RF-0012: the declared agent contract is the adopted one, not the default', () => {
  withTempRepo({ 'AGENTS.md': '# preexisting contract\n' }, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'small-team' })
    const documents = ownershipOf(root).documents

    assert.ok(documents.some(document => document.path === 'AGENTS.md' && document.role === 'agent-contract'))
    assert.equal(
      documents.some(document => document.path === 'CLAUDE.md'),
      false,
    )
  })
})

test('RF-0002 and RF-0012: going up a stage adds the missing entries, without duplicating', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo' })
    runInit(root, { owner: '@team', dryRun: false, stage: 'small-team' })

    const paths = ownershipOf(root).documents.map(document => document.path)
    assert.ok(paths.includes('CONTRIBUTING.md'), 'the second run declared what it created')
    assert.equal(new Set(paths).size, paths.length, 'no duplicated entry')

    // and a third run changes nothing more
    const antes = readFileSync(join(root, 'docs/.ownership.yml'), 'utf8')
    runInit(root, { owner: '@team', dryRun: false, stage: 'small-team' })
    assert.equal(readFileSync(join(root, 'docs/.ownership.yml'), 'utf8'), antes)
  })
})

test('RF-0012: without an anchor in .ownership.yml, init says what is missing instead of guessing', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo' })
    // file reorganized by hand: neither `documents:` nor `watches:` at the start of a line
    writeFileSync(
      join(root, 'docs/.ownership.yml'),
      'version: 1\nartifacts:\n  - id-prefix: ADR\n    path: docs/decisions/adr/\n    owner: "@team"\n    skill: decision-recorder\n',
      'utf8',
    )

    const result = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
    })
    assert.ok(result.notInstalled.some(item => /documents/.test(item)))
  })
})

test('RN-0019: the TDR template brings `pay-when` as a commented example, not invented', () => {
  const template = readFileSync(join(toolkitRoot(), 'templates/tdr.md'), 'utf8')
  assert.match(template, /# pay-when:/, 'the example is commented out — init does not invent a trigger')
  assert.doesNotMatch(template, /^pay-when:/m, 'a trigger filled in from the factory would pass CI-4 without meaning anything')
})
```

Add `toolkitRoot` to the import from `../../src/core/roots.ts` in the file, if it
is not there yet.

- [ ] **Step 2: Run and see it fail**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts
```

Expected: FAIL — `documents` comes out empty.

- [ ] **Step 3: Implement in `src/cli/init.ts`**

Add, after `HISTORY_DIRS`:

```typescript
/**
 * A document that `init` declares in `documents:` (`RF-0012`, `ADR-0008`).
 *
 * Every document that `init` creates and that has no ID family goes in here: a
 * document created and not declared is a repository that fails its own `CI-7` on
 * the first run.
 */
interface DocumentSeed {
  path: string
  skill: string | null
  role: 'agent-contract' | 'definition-of-done' | null
}

/** Declared in every stage: both are born already in `solo`. */
const BASE_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: OWNERSHIP_PATH, skill: 'living-docs-bootstrap', role: null },
  { path: RETIRED_IDS_PATH, skill: 'living-docs-bootstrap', role: null },
])

const SMALL_TEAM_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'CONTRIBUTING.md', skill: 'working-agreements-keeper', role: null },
  {
    path: 'docs/definition-of-done.md',
    skill: 'working-agreements-keeper',
    role: 'definition-of-done',
  },
  { path: 'docs/glossary.md', skill: 'glossary-keeper', role: null },
  { path: 'docs/charter/', skill: 'charter-keeper', role: null },
])

const PRODUCTION_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'docs/contracts/errors.md', skill: 'contract-keeper', role: null },
  {
    path: 'docs/contracts/versioning-policy.md',
    skill: 'contract-keeper',
    role: null,
  },
  { path: 'CHANGELOG.md', skill: 'release-historian', role: null },
  { path: 'docs/deprecations.md', skill: 'release-historian', role: null },
  { path: 'docs/migrations/', skill: 'release-historian', role: null },
])

/** The agent contract: adopts `AGENTS.md` when it already exists (`RF-0002`). */
function agentContractPath(root: string): string {
  return existsSync(join(root, 'AGENTS.md')) ? 'AGENTS.md' : 'CLAUDE.md'
}

function documentSeeds(root: string, stage: Stage): DocumentSeed[] {
  if (stage === 'solo') return [...BASE_DOCUMENTS]

  const seeds: DocumentSeed[] = [
    ...BASE_DOCUMENTS,
    ...SMALL_TEAM_DOCUMENTS,
    {
      path: agentContractPath(root),
      skill: 'working-agreements-keeper',
      role: 'agent-contract',
    },
  ]
  if (stage === 'production') seeds.push(...PRODUCTION_DOCUMENTS)
  return seeds
}

function documentEntry(seed: DocumentSeed, owner: string): string {
  const lines = [`  - path: ${seed.path}`, `    owner: "${owner}"`]
  if (seed.skill !== null) lines.push(`    skill: ${seed.skill}`)
  if (seed.role !== null) lines.push(`    role: ${seed.role}`)
  return lines.join('\n')
}

/** The `documents:` block of `.ownership.yml` (`ADR-0008`). */
function documentsBlock(root: string, owner: string, stage: Stage): string {
  const entries = documentSeeds(root, stage).map(seed => documentEntry(seed, owner))

  return [
    '# Document with an owner and WITHOUT an ID family (ADR-0008, which resolves DA-0002).',
    '# CI-4 demands the review and CI-7 demands the owner; CI-1, CI-2 and HK-1 do not read from here.',
    '# `role` is a closed vocabulary: agent-contract, definition-of-done.',
    'documents:',
    ...entries,
    '',
  ].join('\n')
}
```

Add `DOCUMENTS_BLOCK: documentsBlock(root, options.owner, options.stage),`
to the `values` object, and `docs/ids-retired.txt    ${options.owner}\n` to the
CODEOWNERS value that the template consumes — the simplest is to add a new key,
`RETIRED_CODEOWNERS`, and use it in the template.

Change the agent contract adoption check to reuse
`agentContractPath`, keeping the behavior:

```typescript
// The agent contract may already exist under another name. Adopt, never duplicate
// (RF-0002): two contracts is the guarantee that one of them is wrong.
const contract = agentContractPath(root)
if (contract === 'AGENTS.md') {
  result.adopted.push({ idPrefix: 'agent contract', path: 'AGENTS.md' })
} else {
  writeIfAbsent(root, contract, template('agent-contract.md', values), options, result)
}
```

And, for the repository that goes up a stage, add at the end of the file:

```typescript
/**
 * Declares in `documents:` what is not there yet, in an `.ownership.yml` that
 * already exists.
 *
 * Two anchors, in order: the `documents:` line (the entries go in right after
 * it, because YAML list order means nothing) and `\nwatches:` (the whole block
 * goes in before it). With neither — a file reorganized by hand — init **does not
 * guess**: it says what is missing and leaves the edit to whoever owns the file.
 * Same policy as `declareArtifacts`.
 */
function declareDocuments(root: string, options: InitOptions, result: InitResult, existing: OwnershipConfig): void {
  const declared = new Set(existing.documents.map(document => document.path))
  const faltando = documentSeeds(root, options.stage).filter(seed => !declared.has(seed.path))
  if (faltando.length === 0) return

  const file = join(root, OWNERSHIP_PATH)
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const entries = faltando.map(seed => documentEntry(seed, options.owner)).join('\n')

  result.created.push(`${OWNERSHIP_PATH} (${faltando.length} document(s) in documents:)`)

  if (source.includes('\ndocuments:')) {
    if (options.dryRun) return
    writeFileSync(file, source.replace('\ndocuments:', `\ndocuments:\n${entries}`), 'utf8')
    return
  }

  if (source.includes('\nwatches:')) {
    if (options.dryRun) return
    writeFileSync(file, source.replace('\nwatches:', `\ndocuments:\n${entries}\n\nwatches:`), 'utf8')
    return
  }

  result.created.pop()
  result.notInstalled.push(
    `documents: in ${OWNERSHIP_PATH} — \`documents:\` or \`watches:\` anchor not found; ` + 'declare the documents by hand so that they have an owner (CI-7)',
  )
}
```

and call it at the end of `runInit`, before the `return`:

```typescript
// The block goes in the template on the first run; here is the case of whoever already had
// an `.ownership.yml` — from an earlier version, or from a smaller stage.
if (existing !== null) declareDocuments(root, options, result, existing)
```

- [ ] **Step 4: Adjust the templates**

In `templates/ownership.yml`, immediately **after** the comment block of
`generated:` and **before** the comment of mechanism 1, add one line:

```
{{DOCUMENTS_BLOCK}}
```

In `templates/CODEOWNERS`, add `{{RETIRED_CODEOWNERS}}` next to the other
keys on the last line:

```
{{REQUIREMENTS_CODEOWNERS}}{{AGREEMENTS_CODEOWNERS}}{{CONTRACTS_CODEOWNERS}}{{HISTORY_CODEOWNERS}}docs/.ownership.yml    {{OWNER}}
{{RETIRED_CODEOWNERS}}
```

with `RETIRED_CODEOWNERS: \`${RETIRED_IDS_PATH} ${options.owner}\``.

In `templates/tdr.md`, add to the frontmatter, after `relates-to: []`:

```yaml
# Payment trigger in machine form (RN-0019, ADR-0007). Uncomment and
# fill in: `pattern` is a regex (single quotes, so the `\` is not a YAML escape)
# and `paths` says where to search for it. CI-4 fails while it does not exist, and it is that
# failure that forces the conversation about what the real trigger is.
#
# pay-when:
#   pattern: '^- \*\*status:\*\* revoked'
#   paths: ["docs/requirements/**"]
```

- [ ] **Step 5: Write the CHANGELOG entry**

Under `## [Unreleased]` → `### Added`:

```markdown
- `living-docs init` declares in `documents:` every document it installs, with
  an owner, an owning skill and — for the agent contract and the Definition of
  Done — the `role` that `CI-7` uses to find them. A repository that goes up a
  stage receives only the missing entries; without an anchor in the file, the
  command says what is missing instead of rewriting.
- The TDR template brings the machine payment trigger (`pay-when`) as a
  commented-out example.
```

Under `### Changed`:

```markdown
- The `CODEOWNERS` written by `init` now covers `docs/ids-retired.txt`.
```

- [ ] **Step 6: Run everything**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts test/acceptance/consumer-repo.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Expected: PASS, `validate=0`. The `.ownership.yml` of **this** repository does not
have `documents:` yet — that is Task 9, and `CI-7` is not yet registered.

- [ ] **Step 7: Commit**

```bash
git add src/cli/init.ts templates/ownership.yml templates/CODEOWNERS templates/tdr.md test/cli/init.test.ts CHANGELOG.md
git commit -m "feat(RF-0012, ADR-0008): init declares documents: and the TDR template asks for pay-when"
```

---

### Task 9: Registration in `validate`, catalog, regenerated contract and the dogfooding

**Objective:** The pivot task. The three checks enter `validate`, `--base` turns
on the diff half, the catalog and the generated contract start telling the truth,
and **this repository** starts satisfying what the three demand. The two things
travel together by necessity: the instant `CI-7` enters `CHECKS`, the test "this
repository passes its own checks" starts to apply.

**Files:**

- Modify: `src/checks/registry.ts` (`validateChecks` in place of `CHECKS`)
- Modify: `src/checks/catalog.ts` (`CI-4`, `CI-7`, `CI-8`)
- Modify: `src/cli/validate.ts` (`--base`, pointer, `watched`)
- Modify: `src/cli/index.ts` (`--base` option in `validate`, `USAGE`)
- Modify: `docs/contracts/checks.gen.md` (**regenerated**, never edited)
- Modify: `docs/.ownership.yml` (`documents:`)
- Modify: `CODEOWNERS`
- Modify: `docs/decisions/debt/TDR-0001-per-section-freezing.md` (`pay-when`)
- Modify: `test/checks/registry.test.ts`, `test/cli/validate.test.ts`, `test/checks/ci2-ids.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `ci4Staleness`, `ci7OwnershipCoverage`, `ci8Links`; `changedPaths`,
  `commitMessages` from `src/git/diff.ts`; `GitRunner` from `src/git/staged.ts`.
- Produces:
  - `validateChecks(diff?: DiffFacts | null): readonly Check[]` (replaces `CHECKS`)
  - `runValidate(root: string, base?: string | null, run?: GitRunner): ValidateResult`
  - `ValidateResult.watched: number` and `ValidateResult.base: string | null`

**Requirements:**

- `CHECKS` ceases to exist. A static constant no longer works: `CI-7` needs the
  diff, and the diff is a parameter. Three files import it today —
  `src/cli/validate.ts`, `test/checks/registry.test.ts` and
  `test/checks/ci2-ids.test.ts`; the last one has a test of the **registry**
  living in the `CI-2` file ("the registry exposes CI-1, CI-2 and CI-3 in that
  order"), and its place is `test/checks/registry.test.ts`, where the new
  assertion already covers the whole list. Delete it from there, along with the
  import.
- The catalog stays **ordered by ID** (`CI-1` to `CI-8`) — it is a public contract
  read by people. The registry test compares sorted sets, not the execution order.
- `runValidate(root)` without a base: `CI-7` runs without the diff half, and the
  command prints the pointer when there is a declared `watches`.
- `GitError` is already handled in `src/cli/index.ts` — do not handle it again.
- **Dogfooding, and it is the proof:** at the end of this task,
  `living-docs validate` **and** `npm test` pass in this repository. If `CI-7`
  flags a duplicate in `CLAUDE.md`, the fix is to rewrite the sentence through the
  `working-agreements-keeper`, never to lower `WORD_FLOOR`. If `CI-8` flags a
  broken link in an old plan, first confirm it is not a false positive from a code
  block: if it is, the defect is in the check, and the fix is in the check with
  the case becoming a test.

**`HK-5`:** it will ask about `docs/requirements/rules.md` (`src/checks/**`),
`docs/requirements/functional.md` (`src/cli/**`) and
`docs/contracts/checks.gen.md` (`src/checks/catalog.ts`). The first two
traveled in Task 2; the third **travels in this commit**, regenerated. `src/cli/**` and
`src/checks/catalog.ts` are `consumer-visible`: the CHANGELOG entry is in
Step 6.

- [ ] **Step 1: Update the tests first**

In `test/checks/registry.test.ts`, replace the file with:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECK_CATALOG, changelogChecks, driftChecks, validateChecks } from '../../src/checks/registry.ts'

test('RF-0006, RF-0008 and RF-0010: the catalog covers exactly the checks that exist', () => {
  const reais = [...validateChecks(), ...driftChecks(() => ''), ...changelogChecks()].map(check => `${check.id}|${check.name}`).sort()
  const catalogados = CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}`).sort()

  assert.deepEqual(catalogados, reais, 'catalog and registry diverged — the generated contract would lie')
})

test('the catalog is read by people: it stays ordered by ID', () => {
  const ids = CHECK_CATALOG.map(entry => Number(entry.id.replace('CI-', '')))
  assert.deepEqual(
    ids,
    [...ids].sort((a, b) => a - b),
  )
})

test('RF-0006: every catalog item says when it fails and by which command it runs', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} without a written failure condition`)
    assert.match(entry.command, /^living-docs (validate|drift|changelog --base <ref>)$/, `${entry.id} with a strange command`)
  }
})

test('ADR-0005, ADR-0006 and ADR-0010: each check runs in the command that the catalog names', () => {
  const esperado: Record<string, string> = {
    'CI-1': 'living-docs validate',
    'CI-2': 'living-docs validate',
    'CI-3': 'living-docs validate',
    'CI-4': 'living-docs validate',
    'CI-5': 'living-docs drift',
    'CI-6': 'living-docs changelog --base <ref>',
    'CI-7': 'living-docs validate',
    'CI-8': 'living-docs validate',
  }

  for (const entry of CHECK_CATALOG) {
    assert.equal(entry.command, esperado[entry.id], `${entry.id} in the wrong command`)
  }
  assert.equal(CHECK_CATALOG.length, Object.keys(esperado).length, 'new check without a declared expected command')
})

test('RF-0011: validateChecks receives the diff by parameter, and without it the list is the same', () => {
  const semDiff = validateChecks().map(check => check.id)
  const comDiff = validateChecks({
    base: 'origin/master',
    changed: [],
    messages: [],
  }).map(check => check.id)

  assert.deepEqual(semDiff, comDiff, 'the diff half is behavior of CI-7, not one more check')
  assert.deepEqual(semDiff, ['CI-1', 'CI-2', 'CI-3', 'CI-4', 'CI-7', 'CI-8'])
})
```

In `test/cli/validate.test.ts`, the test repository needs to satisfy
`CI-7`. Replace `CONFIG` and add CODEOWNERS to the fixture:

```typescript
const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
documents:
  - path: docs/.ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
`

const CODEOWNERS = 'docs/decisions/adr/    @team\ndocs/.ownership.yml    @team\n'
```

and add `CODEOWNERS` to every `withTempRepo({ ... })` in this file:

```typescript
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, CODEOWNERS, 'docs/decisions/adr/ADR-0001-a.md': GOOD }, (root) => {
```

In `test/checks/ci2-ids.test.ts`, delete the test that is not from `CI-2` and the
import it used:

```typescript
test('the registry exposes CI-1, CI-2 and CI-3 in that order', () => {
  assert.deepEqual(
    CHECKS.map(check => check.id),
    ['CI-1', 'CI-2', 'CI-3'],
  )
})
```

(and the line `import { CHECKS } from '../../src/checks/registry.ts';`).

Also add two new tests to `test/cli/validate.test.ts`:

```typescript
test('RF-0010: a warning is reported and does not change the exit code', () => {
  const antigo = GOOD.replace('last-reviewed: 2026-08-21', 'last-reviewed: 2020-01-01')
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      CODEOWNERS,
      'docs/decisions/adr/ADR-0001-a.md': antigo,
    },
    root => {
      const result = runValidate(root)

      assert.equal(result.warnings, 1, JSON.stringify(result.findings, null, 2))
      assert.equal(result.errors, 0)
      assert.equal(result.exitCode, 0, 'CI-4 warns; a warning does not fail (spec §9)')
      assert.equal(result.findings[0]?.ruleId, 'CI-4')
    },
  )
})

test('RF-0011: with --base, CI-7 demands the owning doc of the watched path that changed', () => {
  const comWatch = `${CONFIG}watches:
  - code: "src/domain/**"
    doc: docs/decisions/adr/
    reason: "decision before the code"
`
  const NUL = String.fromCharCode(0)
  const git = (args: readonly string[]): string => (args.includes('diff') ? `src/domain/x.ts${NUL}` : `feat: x${NUL}\n`)

  withTempRepo(
    {
      [OWNERSHIP_PATH]: comWatch,
      CODEOWNERS,
      'docs/decisions/adr/ADR-0001-a.md': GOOD,
    },
    root => {
      assert.equal(runValidate(root).exitCode, 0, 'without --base, the diff half does not run')

      const comBase = runValidate(root, 'origin/master', git)
      assert.equal(comBase.exitCode, 1)
      assert.ok(comBase.findings.some(finding => finding.ruleId === 'CI-7' && /src\/domain\/x\.ts/.test(finding.message)))
    },
  )
})
```

- [ ] **Step 2: Run and see it fail**

```bash
docker compose exec toolkit node --test test/checks/registry.test.ts test/cli/validate.test.ts
```

Expected: FAIL — `validateChecks` does not exist, `runValidate` does not accept a base.

- [ ] **Step 3: Register the checks and add them to the catalog**

In `src/checks/registry.ts`, replace the `CHECKS` constant:

```typescript
import { ci4Staleness } from './ci4-staleness.ts'
import { ci7OwnershipCoverage } from './ci7-ownership-coverage.ts'
import { ci8Links } from './ci8-links.ts'
```

```typescript
/**
 * Checks that `living-docs validate` runs, in order. None of them executes anything.
 *
 * A function, and no longer a constant: `CI-7` receives the diff by injection, as `CI-5`
 * receives the executor and `CI-6` the facts of the diff. Without a diff, the diff half of
 * `CI-7` simply does not run (`ADR-0010`).
 */
export function validateChecks(diff: DiffFacts | null = null): readonly Check[] {
  return [ci1Structure, ci2Ids, ci3Traceability, ci4Staleness, ci7OwnershipCoverage(diff), ci8Links]
}
```

In `src/checks/catalog.ts`, add the three entries **at the position of the ID**
(`CI-4` after `CI-3`; `CI-7` and `CI-8` at the end):

```typescript
  {
    id: 'CI-4',
    name: 'staleness',
    command: 'living-docs validate',
    failsWhen:
      'An `open` debt does not declare a verifiable `pay-when`, or the declared trigger has already happened in the repository. `last-reviewed` beyond `stale-after-months` produces a warning, not a failure — and an item in a frozen state does not expire.',
  },
```

```typescript
  {
    id: 'CI-7',
    name: 'ownership coverage',
    command: 'living-docs validate',
    failsWhen:
      'A corpus document without an entry in `.ownership.yml` or without a line in CODEOWNERS; a `watches` rule whose `doc` does not exist or has no owner; an agent contract repeating a sentence from an owning artifact; a Definition of Done item without a named verification; and, with `--base <ref>`, a watched path changed without the owning doc and without `Docs: none — <reason>`.',
  },
  {
    id: 'CI-8',
    name: 'links',
    command: 'living-docs validate',
    failsWhen:
      'A relative internal link that does not resolve to an existing file or directory; a `[[wikilink]]` without a destination in the corpus; a file in binary format under the documentation root. A link inside a code block or inline markup does not count.',
  },
```

- [ ] **Step 4: Wire `--base` to `validate`**

`src/cli/validate.ts` in full:

```typescript
import { loadOwnership } from '../config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../docs/collect.ts'
import { validateChecks } from '../checks/registry.ts'
import { changedPaths, commitMessages } from '../git/diff.ts'
import type { GitRunner } from '../git/staged.ts'
import { todayIso } from '../core/dates.ts'
import type { Finding } from '../core/types.ts'

export interface ValidateResult {
  findings: Finding[]
  errors: number
  warnings: number
  exitCode: number
  /** Declared generated artifacts — checked by `living-docs drift`, not here (ADR-0005). */
  generated: number
  /** `consumer-visible-paths` globs — checked by `living-docs changelog`, not here (ADR-0006). */
  consumerVisible: number
  /** Declared code→doc links — the diff half requires `--base` (ADR-0010). */
  watched: number
  base: string | null
}

/**
 * `living-docs validate [--base <ref>]`.
 *
 * With `base`, it talks to git **here** and passes the facts to `CI-7` — the check
 * remains a pure function of (facts, configuration, tree) → findings, like
 * `CI-5` and `CI-6`.
 */
export function runValidate(root: string, base: string | null = null, run?: GitRunner): ValidateResult {
  const config = loadOwnership(root)
  const context = {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: todayIso(),
  }

  const diff =
    base === null
      ? null
      : {
          base,
          changed: changedPaths(root, base, run),
          messages: commitMessages(root, base, run),
        }

  const findings = validateChecks(diff).flatMap(check => check.run(context))
  const errors = findings.filter(finding => finding.severity === 'error').length

  return {
    findings,
    errors,
    warnings: findings.length - errors,
    exitCode: errors > 0 ? 1 : 0,
    generated: config.generated.length,
    consumerVisible: config.consumerVisiblePaths.length,
    watched: config.watches.length,
    base,
  }
}
```

In `src/cli/index.ts`, update the `USAGE` and the `validate` branch:

```
  validate    Runs the tree-state checks (CI-1, CI-2, CI-3, CI-4, CI-7, CI-8)
```

```
validate options:
  --base <ref>        Diff base — turns on the half of CI-7 that reads the branch diff
```

```typescript
if (command === 'validate') {
  const baseIndex = argv.indexOf('--base')
  const base = baseIndex === -1 ? null : (argv[baseIndex + 1] ?? '')
  if (base === '') {
    process.stderr.write('living-docs: `--base` needs a ref — the diff base is not guessed (CI-7, ADR-0010).\n')
    return 2
  }

  const result = runValidate(root, base)
  process.stdout.write(`${formatFindings(result.findings)}\n`)

  if (result.generated > 0) {
    process.stdout.write(
      `living-docs: ${result.generated} generated artifact(s) declared — contract drift is verified by \`living-docs drift\` (CI-5).\n`,
    )
  }
  if (result.consumerVisible > 0) {
    process.stdout.write(
      `living-docs: ${result.consumerVisible} consumer-visible path(s) declared — the CHANGELOG entry is verified by \`living-docs changelog --base <ref>\` (CI-6).\n`,
    )
  }
  // A pointer, not a finding: without a base there is no diff, and staying quiet about the
  // half that did not run would be faking the coverage that criterion 5 asks for in full.
  if (result.base === null && result.watched > 0) {
    process.stdout.write(
      `living-docs: ${result.watched} code→doc link(s) declared — the watched path that changed without the owning doc is verified by \`living-docs validate --base <ref>\` (CI-7).\n`,
    )
  }
  return result.exitCode
}
```

- [ ] **Step 5: The dogfooding — this repository declares its documents**

In `docs/.ownership.yml`, add after the `generated:` block and before
`watches:`:

```yaml
# Document with an owner and WITHOUT an ID family (ADR-0008, which resolves DA-0002).
# CI-4 demands the review and CI-7 demands the owner; CI-1, CI-2 and HK-1 do not read from here.
documents:
  - path: docs/.ownership.yml
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
  - path: docs/ids-retired.txt
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
  - path: CONTRIBUTING.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
  - path: docs/definition-of-done.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    role: definition-of-done
  - path: CLAUDE.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/glossary.md
    owner: '@esliph/engineering'
    skill: glossary-keeper
  - path: docs/charter/
    owner: '@esliph/engineering'
    skill: charter-keeper
  - path: docs/contracts/errors.md
    owner: '@esliph/engineering'
    skill: contract-keeper
  - path: docs/contracts/versioning-policy.md
    owner: '@esliph/engineering'
    skill: contract-keeper
  - path: CHANGELOG.md
    owner: '@esliph/engineering'
    skill: release-historian
  - path: docs/deprecations.md
    owner: '@esliph/engineering'
    skill: release-historian
  - path: docs/migrations/
    owner: '@esliph/engineering'
    skill: release-historian

  # Without an owning skill, and that is information: plan, spec and README have an owner and no
  # keeper. They stay out of the duplication corpus of CI-7 (ADR-0009) because they quote the
  # artifacts by trade — failing the agent contract because of a plan
  # that quoted it would invert who copied from whom.
  - path: docs/superpowers/
    owner: '@esliph/engineering'
  - path: LIVING-DOCUMENTATION-TOOLKIT.md
    owner: '@esliph/engineering'
  - path: LIVING-DOCUMENTATION.md
    owner: '@esliph/engineering'
  - path: README.md
    owner: '@esliph/engineering'
```

In `CODEOWNERS`, add the missing lines:

```
docs/ids-retired.txt    @esliph/engineering
docs/superpowers/    @esliph/engineering
LIVING-DOCUMENTATION-TOOLKIT.md    @esliph/engineering
LIVING-DOCUMENTATION.md    @esliph/engineering
README.md    @esliph/engineering
```

In `docs/decisions/debt/TDR-0001-per-section-freezing.md`, add to the
frontmatter, after `relates-to: [RN-0006]`:

```yaml
# Single quotes: in YAML, single quotes do not process `\`, and the pattern is a regex.
pay-when:
  pattern: '^- \*\*status:\*\* revoked'
  paths: ['docs/requirements/**']
```

The prose trigger stays in the body, and it is what explains the why — the
`pay-when` is the form that the machine reads. `TDR-0001` is `open`, not frozen:
`HK-1` allows the edit.

- [ ] **Step 6: Regenerate the contract and write the CHANGELOG entry**

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Expected: `drift=0`. If `HK-2` denies an edit to this file, you tried to edit it
by hand — the source is `src/checks/catalog.ts`.

In `CHANGELOG.md`, under `## [Unreleased]` → `### Added`:

```markdown
- `CI-4` (staleness), `CI-7` (ownership coverage) and `CI-8` (links) now run
  in `living-docs validate`. `CI-4` is the only one that produces a warning: a
  warning is reported and does not change the exit code.
- `living-docs validate --base <ref>` turns on the half of `CI-7` that reads the
  branch diff: a watched path changed without the owning doc fails, and the
  written way out is `Docs: none — <reason>` in a commit message of the range.
```

Under `### Changed`:

```markdown
- `docs/contracts/checks.gen.md` now lists eight checks, ordered by ID.
```

- [ ] **Step 7: Run everything, and this is where the dogfooding charges**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate --base origin/master; echo "validate --base=$?"
```

Expected: PASS, `validate=0`, `drift=0`. For `validate --base origin/master`, the
expected result depends on what the branch changed: if it touched `src/checks/**`
without `docs/requirements/rules.md`, the right answer is the one this plan already gives — the
owning doc traveled in Task 2, and the way out is `Docs: none — <reason>` in the message of this
commit, or the doc itself in the branch diff.

**If `validate` flags a finding, read before fixing:**

| Finding | Probable cause | Fix |
| ------- | -------------- | --- |
| `CI-7`: document without an entry | a file under `docs/` that Step 5 did not declare | declare it in `documents:` **and** in CODEOWNERS |
| `CI-7`: duplicate in `CLAUDE.md` | a sentence of 12+ words of the contract exists identically in an owning artifact | rewrite the contract sentence leaving the pointer (skill: working-agreements-keeper). Do **not** lower `WORD_FLOOR` |
| `CI-7`: DoD item without verification | a DoD item of this repository does not cite `CI-n`/`HK-n`/human | add the verification, or remove the item |
| `CI-8`: broken link in an old plan | either the link is really broken, or it is inside a code block | confirm in the file. If it is in a block, the defect is in `stripCode`: fix it and add the case to `test/docs/markdown.test.ts` |
| `CI-4`: `last-reviewed` warning | a document went past 6 months | really read it and update the date, or leave the warning — it does not fail |
| `CI-4`: `TDR-0001` without `pay-when` | Step 5 was not applied | apply it |

- [ ] **Step 8: Commit**

```bash
git add src/checks/registry.ts src/checks/catalog.ts src/cli/validate.ts src/cli/index.ts docs/contracts/checks.gen.md docs/.ownership.yml CODEOWNERS docs/decisions/debt/TDR-0001-per-section-freezing.md test/checks/registry.test.ts test/cli/validate.test.ts CHANGELOG.md
git commit -m "feat(RF-0010, RF-0011, RN-0016): CI-4, CI-7 and CI-8 in validate, and the dogfooding they require"
```

---

### Task 10: `HK-6` — the inventory at `SessionStart`

**Objective:** Close acceptance criterion 8 of spec §12. It is the seventh hook,
the first on an event that is not a tool event, and the first that **reuses** the
functions of a check instead of reimplementing them.

**Files:**

- Create: `src/hooks/hk6-session-inventory.ts`
- Test: `test/hooks/hk6-session-inventory.test.ts`
- Modify: `plugin/hooks/hooks.json`
- Modify: `test/plugin/manifest.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `contextOutput('SessionStart', …)`, `emit`, `hookEnv`, `readPayload`
  from `src/hooks/lib/io.ts`; `loadOwnership`; `collectArtifacts`,
  `collectDocuments`; `duePayments`, `staleDocs` from
  `src/checks/ci4-staleness.ts`; `statesFor`; `todayIso`.
- Produces:
  - `type Hk6Decision = { action: 'silent' } | { action: 'inform'; context: string }`
  - `decideHk6(env: HookEnv, today: string): Hk6Decision`

**Requirements:**

- The output is `additionalContext`, always. This file does not know the word
  `deny` nor the word `ask` (`RN-0022`, spec §7).
- Fail open (`RNF-0001`): unreadable configuration, a collection that blows up, any
  error → `silent`. `main` ends with `.catch(() => process.exit(0))`, like the
  other six.
- `today` comes in by parameter. The hook reads the clock once, in `main`
  (`RNF-0004`).
- Short by obligation: at most `MAX_ITEMS` items per list, with the total count
  beside it. An inventory that nobody reads costs context in every session and is
  the dead wiki arriving from the other side (`RN-0022`).
- It does not reimplement staleness nor debt expiry: it calls `staleDocs` and
  `duePayments`. If the inventory and `CI-4` disagreed, one of the two would be
  lying, and nobody would know which.

**`HK-5`:** `docs/requirements/rules.md` (`src/hooks/**`) — traveled in Task 2,
with `RN-0022`. `plugin/**` is `consumer-visible`: CHANGELOG entry in Step 5.

- [ ] **Step 1: Write the failing test**

Create `test/hooks/hk6-session-inventory.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideHk6 } from '../../src/hooks/hk6-session-inventory.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const HOJE = '2026-08-27'

const OWNERSHIP = `
version: 1
stale-after-months: 6
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@team"
    skill: decision-recorder
    collection: table
    field-map:
      resolved-by: "Resolved by"
  - id-prefix: TDR
    path: docs/decisions/debt/
    owner: "@team"
    skill: decision-recorder
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
documents:
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
`

const DAS = [
  '---',
  'title: Open Decisions',
  'owner: "@team"',
  'trigger: Whenever someone bumped into a gap.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '| ID | Gap | Status | Resolved by | Opened on |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | How to declare X | open | — | 2026-08-01 |',
  '',
].join('\n')

const REGRAS_REVOGADA = [
  '---',
  'title: Rules',
  'owner: "@team"',
  'trigger: On every new rule.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '## RN-0001 — A rule',
  '',
  '- **status:** revoked',
  '- **revoked-by:** RN-0002',
  '',
].join('\n')

const DIVIDA = [
  '---',
  'id: TDR-0001',
  'title: Shortcut',
  'status: open',
  'owner: "@team"',
  'trigger: When the trigger below is met.',
  'last-reviewed: 2026-08-01',
  'pay-when:',
  "  pattern: '^- \\*\\*status:\\*\\* revoked'",
  '  paths: ["docs/requirements/**"]',
  '---',
  '',
  '# TDR-0001 — Shortcut',
  '',
].join('\n')

const ARVORE = {
  'docs/.ownership.yml': OWNERSHIP,
  'docs/open-decisions.md': DAS,
  'docs/requirements/rules.md': REGRAS_REVOGADA,
  'docs/decisions/debt/TDR-0001-x.md': DIVIDA,
  'CONTRIBUTING.md': '---\ntitle: How\nowner: "@team"\ntrigger: when the process changes\nlast-reviewed: 2024-01-01\n---\n\n# How\n',
}

test('criterion 8: the inventory reaches the context without anyone looking for it', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE)
    assert.equal(decision.action, 'inform')

    const context = decision.action === 'inform' ? decision.context : ''
    assert.match(context, /HK-6/)
    assert.match(context, /DA-0001/, 'open decision')
    assert.match(context, /TDR-0001/, 'debt with a met trigger')
    assert.match(context, /CONTRIBUTING\.md/, 'overdue document')
    assert.match(context, /docs\/decisions\/adr\//, 'declared and absent artifact')
  })
})

test('RN-0022: it is context injection, never a permission decision', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE)
    const context = decision.action === 'inform' ? decision.context : ''

    assert.doesNotMatch(context, /\bdeny\b/)
    assert.doesNotMatch(context, /permissionDecision/)
    assert.match(context, /does not block|context/i)
  })
})

test('RN-0022: the inventory is short — a long list appears truncated with the count', () => {
  const muitas = [...DAS.split('\n').slice(0, -1), ...Array.from({ length: 9 }, (_, i) => `| DA-000${i + 2} | Gap ${i} | open | — | 2026-08-01 |`), ''].join(
    '\n',
  )

  withTempRepo({ ...ARVORE, 'docs/open-decisions.md': muitas }, root => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE)
    const context = decision.action === 'inform' ? decision.context : ''
    assert.match(context, /\(10\)/, 'the total count appears')
    assert.equal((context.match(/DA-\d{4}/g) ?? []).length <= 6, true, 'only the first ones come in')
  })
})

test('RNF-0001: unreadable configuration silences the hook instead of blowing up', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 99\n' }, root => {
    assert.deepEqual(decideHk6({ root, hostRoots: [root] }, HOJE), {
      action: 'silent',
    })
  })
  withTempRepo({ 'README.md': '' }, root => {
    assert.deepEqual(decideHk6({ root, hostRoots: [root] }, HOJE), {
      action: 'silent',
    })
  })
})

test('HK-6 does not reimplement CI-4: without an overdue debt and without an old doc, the two lines do not appear', () => {
  const semDivida = { ...ARVORE }
  delete (semDivida as Record<string, string>)['docs/decisions/debt/TDR-0001-x.md']
  semDivida['CONTRIBUTING.md'] = '---\ntitle: How\nowner: "@team"\ntrigger: when the process changes\nlast-reviewed: 2026-08-20\n---\n\n# How\n'

  withTempRepo(semDivida, root => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE)
    const context = decision.action === 'inform' ? decision.context : ''

    assert.doesNotMatch(context, /payment trigger/)
    assert.doesNotMatch(context, /overdue/)
    assert.match(context, /DA-0001/, 'the rest of the inventory continues')
  })
})
```

- [ ] **Step 2: Run and see it fail**

```bash
docker compose exec toolkit node --test test/hooks/hk6-session-inventory.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/hooks/hk6-session-inventory.ts`**

```typescript
#!/usr/bin/env node
/**
 * SessionStart: injects the living documentation inventory into the context.
 *
 * Source rule: LIVING-DOCUMENTATION-TOOLKIT.md §7 and `RN-0022` — "solves 'if
 * nobody reads it, it isn't alive' at the source". The output is `additionalContext`, and this
 * file does not know `deny` nor `ask`.
 *
 * It does not reimplement `CI-4`: it calls `staleDocs` and `duePayments`. An inventory that
 * disagreed with the check would give two different numbers for the same question, and
 * nobody would know which to believe.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadOwnership } from '../config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../docs/collect.ts'
import type { ArtifactDoc } from '../docs/collect.ts'
import { duePayments, staleDocs } from '../checks/ci4-staleness.ts'
import { statesFor } from '../docs/schema.ts'
import { todayIso } from '../core/dates.ts'
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv } from './lib/io.ts'

export type Hk6Decision = { action: 'silent' } | { action: 'inform'; context: string }

const SILENT: Hk6Decision = { action: 'silent' }

/**
 * How many items of each list go into the context. The inventory is read in every
 * session: a long list costs context always and teaches people to skip the whole block.
 */
const MAX_ITEMS = 5

/** The state that identifies an open-decision family (spec §4: `open → resolved`). */
const DECISION_STATE = 'resolved'

function shorten(items: readonly string[]): string {
  const shown = items.slice(0, MAX_ITEMS).join('; ')
  return items.length > MAX_ITEMS ? `${shown}; … (+${items.length - MAX_ITEMS})` : shown
}

/** Open decisions: `open` items of a family whose state machine has `resolved`. */
function openDecisions(docs: readonly ArtifactDoc[]): string[] {
  const found: string[] = []

  for (const doc of docs) {
    if (!statesFor(doc.rule)?.includes(DECISION_STATE)) continue

    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data
      if (data?.status === 'open') found.push(`${String(data.id)} (${doc.file})`)
      continue
    }

    for (const item of doc.items) {
      if (item.status === 'open') found.push(`${item.id} (${doc.file}:${item.line})`)
    }
  }

  return found
}

export function decideHk6(env: HookEnv, today: string): Hk6Decision {
  let inventory: { lines: string[] }
  try {
    const config = loadOwnership(env.root)
    const docs = collectArtifacts(env.root, config)
    const documents = collectDocuments(env.root, config)
    const context = { root: env.root, config, docs, documents, today }

    const ausentes = [
      ...config.artifacts.filter(artifact => !existsSync(join(env.root, artifact.path))).map(artifact => `${artifact.idPrefix} (${artifact.path})`),
      ...config.documents.filter(document => !existsSync(join(env.root, document.path))).map(document => document.path),
    ]

    const abertas = openDecisions(docs)
    const vencidas = duePayments(context)
    const velhos = staleDocs(context)

    const lines = [
      'HK-6: living documentation inventory (source: `docs/.ownership.yml`).',
      `Declared: ${config.artifacts.length} artifact(s) and ${config.documents.length} document(s).`,
    ]

    if (ausentes.length > 0) {
      lines.push(`Declared and absent (${ausentes.length}): ${shorten(ausentes)}.`)
    }
    if (abertas.length > 0) {
      lines.push(
        `Open decision (${abertas.length}): ${shorten(abertas)}. While it is open, the rule does not exist and the ` + 'implementation stops (`/open-decision`).',
      )
    }
    if (vencidas.length > 0) {
      lines.push(
        `Debt with a met payment trigger (${vencidas.length}): ${shorten(
          vencidas.map(payment => `${payment.id} — ${payment.evidence}`),
        )}. \`living-docs validate\` fails until it is paid or reclassified (spec §12, criterion 7).`,
      )
    }
    if (velhos.length > 0) {
      lines.push(
        `Overdue document (${velhos.length}): ${shorten(
          velhos.map(stale => `${stale.file} (${stale.months} months)`),
        )}. It is a warning: reread before touching \`last-reviewed\`.`,
      )
    }

    lines.push('Nothing here blocks — it is context. Enforcement is `living-docs validate` and the hooks HK-1 to HK-5 and HK-7.')

    inventory = { lines }
  } catch {
    return SILENT // fail open (RNF-0001)
  }

  return { action: 'inform', context: inventory.lines.join('\n') }
}

async function main(): Promise<void> {
  // The SessionStart payload does not carry `tool_input`; reading it is only the
  // stdin contract, and an unreadable payload silences the hook like any other error.
  const payload = await readPayload()
  if (!payload) return

  const decision = decideHk6(hookEnv(), todayIso())
  emit(decision.action === 'inform' ? contextOutput('SessionStart', decision.context) : null)
}

if (process.argv[1]?.endsWith('hk6-session-inventory.ts')) {
  main().catch(() => process.exit(0)) // fail open, always
}
```

- [ ] **Step 4: Register in `plugin/hooks/hooks.json` and in the manifest test**

Add, to the `hooks` object, a new event — `SessionStart` has no matcher:

```json
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk6-session-inventory",
            "shell": "bash",
            "async": false
          }
        ]
      }
    ]
```

`run-hook.sh` **does not change**: it receives the hook name as an argument and
whoever distinguishes the event is the file. Touching the wrapper here would be a
free improvement to code that works — and it is where the fail-open lives.

In `test/plugin/manifest.test.ts`, the group without a matcher needs its own key:

```typescript
test('hooks.json registers the seven hooks in the events and matchers of spec §7', () => {
  const config = readJson('plugin/hooks/hooks.json')
  const hooks = config.hooks as Record<string, { matcher?: string; hooks: { command: string }[] }[]>

  const grupos = new Map<string, string[]>(
    Object.entries(hooks).flatMap(([evento, lista]) =>
      lista.map(grupo => [grupo.matcher === undefined ? evento : `${evento}:${grupo.matcher}`, grupo.hooks.map(hook => hook.command)] as const),
    ),
  )

  const esperado: Record<string, string[]> = {
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk2-generated-artifact', 'hk3-state-promotion'],
    'PreToolUse:Bash': ['hk5-commit-guard'],
    'PostToolUse:Edit|Write': ['hk4-watch-reminder', 'hk7-shortcut-debt'],
    // SessionStart has no matcher: the event is not a tool event (spec §7).
    SessionStart: ['hk6-session-inventory'],
  }

  assert.deepEqual([...grupos.keys()].sort(), Object.keys(esperado).sort())
  for (const [chave, nomes] of Object.entries(esperado)) {
    const comandos = grupos.get(chave) ?? []
    assert.equal(comandos.length, nomes.length, `${chave}: ${comandos.length} hooks`)
    for (const nome of nomes) {
      assert.ok(
        comandos.some(comando => comando.includes(nome)),
        `${chave} should invoke ${nome}`,
      )
    }
    for (const comando of comandos) {
      assert.ok(comando.includes('${CLAUDE_PLUGIN_ROOT}'), 'the command must be relocatable')
    }
  }
})
```

and, in the test "every referenced hook exists in the repository", change the count:

```typescript
assert.equal(vistos, 7, 'the scan should see the seven hooks of Phases 1, 3, 5, 6 and 7')
```

- [ ] **Step 5: Write the CHANGELOG entry**

Under `## [Unreleased]` → `### Added`:

```markdown
- `HK-6`: at session start, the inventory reaches the context — declared and
  absent artifacts and documents, open decisions, debts with a met trigger and
  overdue documents. It is context injection, never blocking.
```

- [ ] **Step 6: Run everything**

```bash
docker compose exec toolkit node --test test/hooks/hk6-session-inventory.test.ts test/plugin/manifest.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Expected: PASS, `validate=0`.

- [ ] **Step 7: See the hook really speak, with the real repository**

```bash
echo '{}' | docker compose exec -T -w /workspace toolkit node /opt/living-docs/src/hooks/hk6-session-inventory.ts
```

Expected: a JSON with `hookEventName: "SessionStart"` and `additionalContext`
citing `DA-0002` (if it is still `open`) and no blocking. It is the only way to
see criterion 8 happening before installing the plugin.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/hk6-session-inventory.ts test/hooks/hk6-session-inventory.test.ts plugin/hooks/hooks.json test/plugin/manifest.test.ts CHANGELOG.md
git commit -m "feat(RN-0022): HK-6 — inventory at SessionStart"
```

---

### Task 11: `AG-1` docs-divergence-auditor and `CM-5` `/docs-audit`

**Objective:** The plugin's second agent, and the only one that answers the
question that no check answers: **what this diff should have updated and did not
update**. No new requirement — an agent is judgment in an isolated context, not an
executable rule, and inventing a `CI-n` to measure it would be the mistake that
Phase 4 already refused once.

**Files:**

- Create: `plugin/agents/docs-divergence-auditor.md`
- Create: `plugin/commands/docs-audit.md`
- Modify: `test/plugin/manifest.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: the format of `plugin/agents/*.md` confirmed in Phase 4 — frontmatter
  with `name`, `description` (the trigger), `tools` (allowlist) and `model`,
  discovered by directory, **without** an entry in `plugin.json`.
- Produces: the agent `docs-divergence-auditor` and the command `/docs-audit`.

**Requirements:**

- `tools` includes read, search and `Bash` (spec §6 asks for `git`), and does **not**
  include `Edit` nor `Write`: `AG-1` points and stops. The manifest test enforces it.
- Three classes of finding, and only these three (spec §6): outdated doc, lying
  doc, behavior without a rule. The third comes out as `DA-nnnn` via `SK-3`.
- Each finding brings file, line, severity and the **owning artifact** that should
  change. No aesthetic preference.
- It declares the scope on the first line of the report. A diff too large: it says
  the size and reviews by slice, **never** a sample pretending it read everything.
- Mandatory input: `docs/.ownership.yml` (the `watches`) and the artifacts they
  point to. No hardcoded path in the agent's prose.

**`HK-5`:** `plugin/**` is `consumer-visible` — CHANGELOG entry in Step 3.
`plugin/agents/**` and `plugin/commands/**` are not in `watches` like
`plugin/skills/**`, so `CONTRIBUTING.md` is not required here.

- [ ] **Step 1: Write `plugin/agents/docs-divergence-auditor.md`**

````markdown
---
name: docs-divergence-auditor
description: >
  Use this agent when you want to know what a set of changes should have
  updated in the documentation and did not — before opening the PR, after a
  long sequence of commits, or when someone asks "does the documentation
  still describe this?". It receives a scope (diff, ref, list of paths or
  `staged`) and returns findings with the owning artifact of each one. Isolated
  on purpose: whoever wrote the code reviews with the same reasoning that
  produced it, and does not see their own blind spots.
tools: Glob, Grep, Read, Bash
model: inherit
---

You audit divergence between code and documentation in a given scope. You
**point and stop**: you have no `Edit` nor `Write`, and even if you did, fixing is
not your role — the fix belongs to whoever owns the artifact.

`Bash` is here for `git` (`git diff`, `git log`, `git show`) and for nothing
else. Do not install, do not build, do not run tests, do not write a file by
redirection.

## Mandatory input

1. **`docs/.ownership.yml`** — read it before anything else. It is where it comes
   from which code path has which owning document (`watches`), who answers for
   each artifact, and what is visible to whoever consumes. **Do not guess a
   path**: if a document is not declared there, the finding is a different one,
   and it belongs to `CI-7`.
2. **The artifacts that the `watches` point to** — read the relevant excerpts, not
   the whole file out of habit.

## Scope

The first line of the report declares the scope, always, in this form:

`Scope: <what was read> — <N> files, <M> lines of diff.`

If the diff is too large for an honest reading, **say the size and review by
slice** (by directory, by owning artifact, by commit), naming what was left for
the next slice. Sampling and writing as if you had read everything is the worst
possible result: it produces confidence without coverage.

## The three classes of finding, and only these three

1. **Outdated doc** — the code changed and the owning document did not. Bring the
   code path, the `watches` rule that created the link, and the excerpt of the
   document that became false.
2. **Lying doc** — the document asserts a behavior that the code no longer has.
   Bring the sentence and the line of code that contradicts it.
3. **Behavior without a rule** — the code decides something that no requirement
   covers. The way out is to open `DA-nnnn` (`/open-decision`, skill
   `decision-recorder`) and **stop** — not to write the missing rule.

Nothing outside these three. Aesthetic preference, refactoring suggestion,
opinion about a variable name: out of scope, and including them makes the whole
report be discarded.

## Format of each finding

```
[<class>] <file>:<line> — <severity: high|medium|low>
  What diverged: <one sentence>
  Owning artifact: <path from .ownership.yml> (skill: <owning skill>)
  Evidence: <code excerpt> vs <document excerpt>
```

## What you do not do

- You do not use `Edit` nor `Write`, and you do not write a file through `Bash`.
- You do not audit the whole repository when you received a scope. Outside the
  scope is outside the scope, even if you saw something interesting — if it is
  serious, record it in one line at the end, under "outside the received scope".
- You do not count documents, you do not measure documentation coverage, you do
  not suggest creating a new document to narrate code. All three are
  anti-requirements (spec §13).
- You do not decide anything. Accepting, promoting, writing the rule: all human.

## Final output

The findings grouped by owning artifact, and a last line saying what was **not**
verified. Zero findings is a legitimate result, and in that case the last line is
the only one that matters.
````

- [ ] **Step 2: Write `plugin/commands/docs-audit.md`**

```markdown
---
description: Audits the divergence between code and documentation in a scope — what the diff should have updated and did not.
argument-hint: '[scope: diff ref, path, or staged]'
---

Invoke the `docs-divergence-auditor` agent with the scope: $ARGUMENTS

Without a scope, use what is in the index (`git diff --cached --name-only`) and
say so on the first line of the report.

The agent points and stops: it has no `Edit` nor `Write`. Each finding names the
owning artifact that should change — the fix belongs to whoever owns it, through
the owning skill that `docs/.ownership.yml` declares.

Behavior without a written rule does not become code: it becomes `DA-nnnn`
(`/open-decision`) and the implementation stops.
```

- [ ] **Step 3: Enforce the format in the manifest test, and write the CHANGELOG**

In `test/plugin/manifest.test.ts`, replace the test that names `AG-2` with one
that names both, and add the assertion for `AG-1`:

```typescript
test('AG-1 and AG-2: the two agents of spec §6 exist', () => {
  assert.ok(AGENTS.includes('decision-adversary.md'), `plugin/agents: ${AGENTS.join(', ') || 'empty'}`)
  assert.ok(AGENTS.includes('docs-divergence-auditor.md'), `plugin/agents: ${AGENTS.join(', ') || 'empty'}`)
})

test('AG-1 and AG-2 point and stop — without Edit nor Write (spec §6)', () => {
  for (const file of ['decision-adversary.md', 'docs-divergence-auditor.md']) {
    const source = readFileSync(join(ROOT, 'plugin/agents', file), 'utf8')
    const toolsLine = source.match(/^tools:\s*(.+)$/m)?.[1] ?? ''
    assert.doesNotMatch(toolsLine, /\bEdit\b/, `${file}: an agent that points does not rewrite`)
    assert.doesNotMatch(toolsLine, /\bWrite\b/, `${file}: an agent that points does not rewrite`)
  }
})

test('AG-1 reads the ownership map instead of guessing a path', () => {
  const source = readFileSync(join(ROOT, 'plugin/agents/docs-divergence-auditor.md'), 'utf8')
  assert.match(source, /docs\/\.ownership\.yml/)
  assert.match(source, /DA-nnnn|open-decision/, 'behavior without a rule becomes an open decision, not code')
})
```

In `CHANGELOG.md`, under `## [Unreleased]` → `### Added`:

```markdown
- `AG-1` `docs-divergence-auditor` and the `/docs-audit` command: a code→document
  divergence audit in a given scope, in an isolated context, without
  `Edit` nor `Write`.
```

- [ ] **Step 4: Run everything**

```bash
docker compose exec toolkit node --test test/plugin/manifest.test.ts test/plugin/authoring.test.ts
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Expected: PASS, `validate=0`. If `CI-8` flags a link in the agent's file, it is the
finding-format block — confirm that it is fenced by ```and that`stripCode` erases it.

- [ ] **Step 5: Commit**

```bash
git add plugin/agents/docs-divergence-auditor.md plugin/commands/docs-audit.md test/plugin/manifest.test.ts CHANGELOG.md
git commit -m "feat(CM-5): AG-1 docs-divergence-auditor and /docs-audit"
```

---

### Task 12: The end-to-end proof — criteria 5 (half 2), 7 and 8

**Objective:** Acceptance criteria are not proof until there is a test that
executes them through the outside path. And the invariants of the dogfooding —
an owner in both places, a debt with a verifiable trigger — need a test that
prevents them from drifting apart in the very next PR, as
`test/docs/release-history.test.ts` did for Phase 6.

**Files:**

- Modify: `test/acceptance/spec-criteria.test.ts`
- Create: `test/docs/maintenance.test.ts`

**Interfaces:**

- Consumes: `runValidate`, `decideHk6`, `loadOwnership`, `loadCodeowners`,
  `ownersOf`, `documentationFiles`, `debtsWithoutTrigger`, `duePayments`,
  `documentWithRole`, `repoRoot`.
- Produces: the tests that cite `RF-0010`, `RF-0011`, `RN-0016`, `RN-0019`,
  `RN-0022` — the citations that Task 14 needs to exist.

**Requirements:**

- The criteria tests run against a temporary repository, not against this one.
  "This repository passes its own checks" already exists and remains the other
  side.
- `test/docs/maintenance.test.ts` runs against **this** repository: it is
  dogfooding, and its failure is the information.
- No new test reads the clock: a fixed `today`, or `todayIso()` only where the
  date does not change the result.

- [ ] **Step 1: Add the three criteria to `test/acceptance/spec-criteria.test.ts`**

Add to the imports:

```typescript
import { decideHk6 } from '../../src/hooks/hk6-session-inventory.ts'
```

and at the end of the file:

```typescript
const DIVIDA_CONFIG = [
  'version: 1',
  'stale-after-months: 6',
  'artifacts:',
  '  - id-prefix: TDR',
  '    path: docs/decisions/debt/',
  '    owner: "@team"',
  '    skill: decision-recorder',
  '    append-only: true',
  '  - id-prefix: RN',
  '    path: docs/requirements/rules.md',
  '    owner: "@team"',
  '    skill: requirements-keeper',
  '    collection: sections',
  'documents:',
  '  - path: docs/.ownership.yml',
  '    owner: "@team"',
  '    skill: living-docs-bootstrap',
  '',
].join('\n')

const DIVIDA_CODEOWNERS = 'docs/decisions/debt/    @team\ndocs/requirements/    @team\ndocs/.ownership.yml    @team\n'

function divida(status: string): string {
  return [
    '---',
    'id: TDR-0001',
    'title: Conscious shortcut',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: When the payment trigger below is met.',
    'last-reviewed: 2026-08-20',
    'pay-when:',
    "  pattern: '^- \\*\\*status:\\*\\* revoked'",
    '  paths: ["docs/requirements/**"]',
    '---',
    '',
    '# TDR-0001 — Conscious shortcut',
    '',
  ].join('\n')
}

function regras(status: string): string {
  return [
    '---',
    'title: Rules',
    'owner: "@team"',
    'trigger: On every new or changed rule.',
    'last-reviewed: 2026-08-20',
    '---',
    '',
    '## RN-0001 — A rule',
    '',
    `- **status:** ${status}`,
    ...(status === 'revoked' ? ['- **revoked-by:** RN-0002'] : []),
    '',
  ].join('\n')
}

test('criterion 7: a debt with a met trigger fails until it is paid or reclassified', () => {
  const arvore = (statusDivida: string, statusRegra: string) => ({
    [OWNERSHIP_PATH]: DIVIDA_CONFIG,
    CODEOWNERS: DIVIDA_CODEOWNERS,
    'docs/decisions/debt/TDR-0001-x.md': divida(statusDivida),
    'docs/requirements/rules.md': regras(statusRegra),
  })

  // the trigger did not happen: passes
  withTempRepo(arvore('open', 'active'), root => {
    assert.equal(runValidate(root).exitCode, 0)
  })

  // the trigger happened and the debt is still open: fails, naming the evidence
  withTempRepo(arvore('open', 'revoked'), root => {
    const result = runValidate(root)
    assert.equal(result.exitCode, 1)

    const finding = result.findings.find(f => f.ruleId === 'CI-4' && f.severity === 'error')
    assert.ok(finding, JSON.stringify(result.findings, null, 2))
    assert.match(finding.message, /TDR-0001/)
    assert.match(finding.message, /docs\/requirements\/rules\.md/)
  })

  // reclassified: passes again
  withTempRepo(arvore('paid', 'revoked'), root => {
    assert.equal(runValidate(root).exitCode, 0)
  })
})

test('criterion 8: at session start, the inventory and the pending items reach the context', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: DIVIDA_CONFIG,
      CODEOWNERS: DIVIDA_CODEOWNERS,
      'docs/decisions/debt/TDR-0001-x.md': divida('open'),
      'docs/requirements/rules.md': regras('revoked'),
    },
    root => {
      const decision = decideHk6({ root, hostRoots: [root] }, '2026-08-27')

      assert.equal(decision.action, 'inform', 'nobody needs to look: the inventory arrives')
      const context = decision.action === 'inform' ? decision.context : ''
      assert.match(context, /TDR-0001/)
      assert.doesNotMatch(context, /permissionDecision/, 'it is context, not a permission decision')
    },
  )
})

test('criterion 5, half 2: CI flags through `watches`, and the written reason releases', () => {
  const config = `${WATCHED_CONFIG}documents:
  - path: docs/.ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
`
  const codeowners = 'docs/requirements/    @team\ndocs/.ownership.yml    @team\n'
  const arvore = {
    [OWNERSHIP_PATH]: config,
    CODEOWNERS: codeowners,
    'docs/requirements/rules.md': regras('draft'),
  }

  const git =
    (changed: string[], messages: string[]) =>
    (args: readonly string[]): string =>
      args.includes('diff') ? changed.join(NUL) + NUL : messages.join(`${NUL}\n`) + NUL + '\n'

  withTempRepo(arvore, root => {
    // without the owning doc in the diff: fails, naming the watched path
    const reprovado = runValidate(root, 'origin/master', git(['src/domain/refund.ts'], ['feat: refund']))
    assert.equal(reprovado.exitCode, 1)
    const finding = reprovado.findings.find(f => f.ruleId === 'CI-7')
    assert.ok(finding)
    assert.match(finding.message, /src\/domain\/refund\.ts/)

    // with the doc in the same diff: passes
    const comDoc = git(['src/domain/refund.ts', 'docs/requirements/rules.md'], ['feat: refund'])
    assert.equal(runValidate(root, 'origin/master', comDoc).exitCode, 0)

    // with the reason written in the history: passes
    assert.equal(
      runValidate(root, 'origin/master', git(['src/domain/refund.ts'], ['refactor: renames internal\n\nDocs: none — only a rename, the rule did not change']))
        .exitCode,
      0,
    )

    // and without a base, this half does not run
    assert.equal(runValidate(root).exitCode, 0)
  })
})
```

`WATCHED_CONFIG` and `NUL` have existed in the file since Phase 3 — reuse them,
do not declare them again.

- [ ] **Step 2: Create `test/docs/maintenance.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { documentWithRole, loadOwnership } from '../../src/config/ownership.ts'
import { loadCodeowners, ownersOf } from '../../src/config/codeowners.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { debtsWithoutTrigger, duePayments } from '../../src/checks/ci4-staleness.ts'
import { documentationFiles } from '../../src/docs/corpus.ts'
import { repoRoot } from '../../src/core/roots.ts'
import { todayIso } from '../../src/core/dates.ts'

const ROOT = repoRoot()
const CONFIG = loadOwnership(ROOT)

function contextFor() {
  return {
    root: ROOT,
    config: CONFIG,
    docs: collectArtifacts(ROOT, CONFIG),
    documents: collectDocuments(ROOT, CONFIG),
    today: todayIso(),
  }
}

test('RN-0016: every document of this repository has an owner in both places', () => {
  const codeowners = loadCodeowners(ROOT)
  assert.ok(codeowners, 'CODEOWNERS should exist')

  const semDono: string[] = []
  for (const file of documentationFiles(ROOT, CONFIG)) {
    if (ownersOf(codeowners, file) === null) semDono.push(file)
  }

  assert.deepEqual(semDono, [], `without a line in CODEOWNERS: ${semDono.join(', ')}`)
})

test('RN-0016: `documents:` and CODEOWNERS declare the same owner', () => {
  const codeowners = loadCodeowners(ROOT)
  assert.ok(codeowners)

  for (const document of CONFIG.documents) {
    const owners = ownersOf(codeowners, document.path.replace(/\/$/, '/x'))
    assert.ok(owners, `${document.path} without an owner in CODEOWNERS`)
    assert.ok(owners.includes(document.owner), `${document.path}: .ownership.yml says ${document.owner}, CODEOWNERS says ${owners.join(', ')}`)
  }
})

test('RN-0019: every `open` debt of this repository has a verifiable trigger that is not overdue', () => {
  const context = contextFor()
  assert.deepEqual(
    debtsWithoutTrigger(context).map(debt => debt.id),
    [],
    'a debt without `pay-when` is an orphan `TODO` with a number',
  )
  assert.deepEqual(
    duePayments(context).map(payment => `${payment.id} — ${payment.evidence}`),
    [],
    'if it shows up here, the debt is due: pay it or reclassify it (a human act)',
  )
})

test('ADR-0008: the two roles are declared and point to files that exist', () => {
  for (const role of ['agent-contract', 'definition-of-done'] as const) {
    const document = documentWithRole(CONFIG, role)
    assert.ok(document, `no document declares role: ${role} — CI-7 would have no way to find it`)
    assert.ok(existsSync(join(ROOT, document.path)), `${document.path} declared and absent`)
  }
})

test('RN-0020: the agent contract remains an index — without a sentence copied from an owning artifact', () => {
  // The real proof is CI-7 running in `validate`; this test exists so that the
  // failure points at the contract instead of getting lost among the other findings.
  const contract = documentWithRole(CONFIG, 'agent-contract')
  assert.ok(contract)

  const context = contextFor()
  const source = context.documents.find(document => document.file === contract.path)?.source
  assert.ok(source, `${contract.path} should be collected`)
})
```

- [ ] **Step 3: Run everything**

```bash
docker compose exec toolkit node --test test/acceptance/spec-criteria.test.ts test/docs/maintenance.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: PASS. If `test/docs/maintenance.test.ts` flags a document without an owner,
the fix is to declare it — not to loosen the test.

- [ ] **Step 4: Commit**

```bash
git add test/acceptance/spec-criteria.test.ts test/docs/maintenance.test.ts
git commit -m "test(RF-0010, RF-0011, RN-0016, RN-0019, RN-0022): criteria 5, 7 and 8 and the dogfooding invariants"
```

---

### Task 13: Indexes, public contract, workflow and backlog

**Objective:** Make the documents that point to the rest tell the new truth. It is
the task in which the README sentence about "only half of criterion 5" changes, and
in which the vocabulary gains the distinction that `ADR-0008` created.

**Files:**

- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `docs/definition-of-done.md`
- Modify: `CLAUDE.md`
- Modify: `docs/glossary.md`
- Modify: `plugin/skills/decision-recorder/SKILL.md`
- Modify: `plugin/skills/working-agreements-keeper/SKILL.md`
- Modify: `plugin/skills/living-docs-bootstrap/SKILL.md`
- Modify: `plugin/.claude-plugin/plugin.json`
- Modify: `.github/workflows/living-docs.yml`
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/plans/BACKLOG-phases-3-7.md`

**Interfaces:**

- Consumes: everything that Tasks 1 to 12 delivered.
- Produces: coherent indexes, the workflow that runs `validate --base` on the PR,
  and the backlog with the real state.

**Requirements:**

- `CLAUDE.md` remains **index and policy**: no new factual claim, and
  the 60-line test remains in force. `CI-7` now enforces duplication — if
  it flags a sentence, rewrite the sentence, not the threshold.
- The Definition of Done gains one item per new check, each with the verification
  named (`RN-0017`, and `CI-7` enforces it).
- The glossary gains **Document** and **Payment trigger**, and the
  **Artifact** row starts pointing to Document in "do not confuse with" — because
  since `ADR-0008` there are two things with an owner, and only one of them has an
  ID family.
- The workflow runs `validate --base` **only** on `pull_request`: on `push` there is
  no base, and inventing one would produce a finding about a change that is not
  the branch's.
- The backlog records the real state, including what was **not** promoted. If
  Task 14 does not happen, this task does not lie about it.

**`HK-5`:** `plugin/skills/**` requires `CONTRIBUTING.md` in the same commit — it is
here. `plugin/**` is `consumer-visible`: CHANGELOG entry in Step 9.

- [ ] **Step 1: README**

Replace the opening paragraph:

```markdown
# living-docs-toolkit

Living documentation with an owner, a trigger and enforcement — Phases 0–7 of the spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions, Debt Register and
requirements with a stable ID; the eight checks `CI-1` to `CI-8`; the seven hooks `HK-1`
to `HK-7`; the working agreements (`SK-6`); the domain vocabulary and the
inviolable principles (`SK-2`, `SK-1`); the public contract, with the generated half
that nobody edits by hand (`SK-5`); the historical trail aimed at whoever consumes
(`SK-7`); and continuous maintenance — inventory at session start, staleness,
ownership coverage, links, and the divergence auditor in an isolated context.

**Nothing runs on the host besides Docker.**
```

In the usage block, add the `--base` line:

```bash
./bin/living-docs validate              # runs CI-1, CI-2, CI-3, CI-4, CI-7 and CI-8
./bin/living-docs validate --base origin/master   # + the half of CI-7 that reads the branch diff
```

Replace the stages paragraph:

```markdown
Maturity stages (`--stage`): `solo` installs decisions, gaps and debt;
`small-team` adds the requirements frame (`RF`, `RNF`, `RN`), the working
agreements, the glossary and the charter; `production` adds the contracts frame
(error catalog and versioning policy) **and** the historical trail
(CHANGELOG, release notes, deprecations and migration guides). In all of
them, `init` declares in `documents:` what it created — a document without an owner fails
in `CI-7`.

**There is no `--stage multi-team`**, and the reason is that Phase 7 installs no
artifact at all: it installs enforcement, and enforcement is not a file that
`init` writes — they are the checks that already ship with the toolkit and the hooks that already ship
with the plugin. A stage with the same set of files as `production` would be
a label with nothing behind it.
```

In the plugin section, add at the end:

```markdown
`HK-6` injects the inventory at session start — what is declared and absent,
the open decisions, the debts with a met trigger and the overdue documents —,
and never blocks. `plugin/agents/docs-divergence-auditor.md` (`AG-1`, command
`/docs-audit`) is the second agent: it receives a scope, answers what that diff
should have updated and did not, and points to the owning artifact of each finding.
Like `AG-2`, it has no `Edit` nor `Write`.
```

Replace the whole "What is left out" section:

```markdown
## What is left out

Nothing from Phases 0–7 of the spec. The layers that spec §"Scope" leaves
deliberately out — C4/ERD/threat model, runbooks/SLO/postmortems, event
catalog, long RFC, feature specs — remain out, and the path to them is the
same extension point: an entry in `docs/.ownership.yml` and an owning skill.

The ten acceptance criteria of spec §12 are covered. Criterion 5 closes in
both halves since Phase 7: `HK-5` asks before the commit, and
`living-docs validate --base <ref>` fails on the PR, with `Docs: none — <reason>`
as the only written way out.

Known debt: `TDR-0001` — `HK-1` freezes per file, not per section, so
a `revoked` requirement inside `docs/requirements/` does not have its body protected
by the hook. `CI-3` closes the other half, and the payment trigger is now
verifiable: the `pay-when` of the TDR searches for `status: revoked` in
`docs/requirements/**`, and `CI-4` fails the day that happens.
```

- [ ] **Step 2: CONTRIBUTING**

Update `last-reviewed: 2026-08-27` and add, at the end of "The cycle", an item:

```markdown
6. **When the change really does not affect the owning doc**, write the reason in the
   commit message — `Docs: none — <reason>` —, and CI accepts it. A label without a
   reason does not count: it is the ticked box. The same format holds for the CHANGELOG,
   with `Changelog: none — <reason>`.
```

In the "Where the truth lives" table, add a row:

```markdown
| Who answers for each document without an ID | `docs/.ownership.yml` (`documents:`) |
```

And, in the "The environment" section, add to the commands block:

```bash
./bin/living-docs validate --base origin/master
```

- [ ] **Step 3: Definition of Done**

Update `last-reviewed: 2026-08-27` and add three items before the
`npm test` item:

```markdown
- [ ] Every new document was declared in `docs/.ownership.yml` and in CODEOWNERS — verification: `CI-7`.
- [ ] No internal link was left broken, and no binary attachment came in under `docs/` — verification: `CI-8`.
- [ ] The registered debt declares `pay-when`, and no debt with a met trigger remains `open` — verification: `CI-4`.
- [ ] The watched path that changed carried the owning doc, or the reason written in the commit — verification: `HK-5` asks, `CI-7` fails (`living-docs validate --base <ref>`).
```

and change the last item to cite the eight checks:

```markdown
- [ ] `npm test`, `npm run typecheck`, `living-docs validate --base <ref>`, `living-docs drift` and `living-docs changelog --base <ref>` pass in the container — verification: `CI-1` to `CI-8`, run by the repository workflow.
```

- [ ] **Step 4: `CLAUDE.md`**

In the "Policy" section, add an item:

```markdown
- **Every document has a declared owner.** `docs/.ownership.yml` says which skill
  answers; CODEOWNERS, who reviews — `CI-7` enforces both.
```

In the "Commands" section, replace the list:

```markdown
`/adr`, `/open-decision`, `/debt`, `/docs-setup`, `/term`, `/release`,
`/docs-audit`. The skills `decision-recorder`, `requirements-keeper`,
`working-agreements-keeper`, `glossary-keeper`, `charter-keeper`,
`contract-keeper` and `release-historian` are selected by their `description`; there
is no need to invoke them by name.
```

(`/release` and `release-historian` had been missing since Phase 6 — the index
had fallen behind the plugin.)

```bash
docker compose exec toolkit node --test test/docs/agent-contract.test.ts
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Expected: PASS and `validate=0`. If the 60-line test fails, remove a line instead
of adding one. If `CI-7` flags a duplicate, **rewrite the sentence of the
contract** — the threshold is not lowered (`ADR-0009`).

- [ ] **Step 5: Glossary**

Update `last-reviewed: 2026-08-27`. In the **Artifact** row, change the
"Do not confuse with" column:

```markdown
| Artifact | A living-documentation document with an owner, a trigger, standard frontmatter and a lifecycle | `ArtifactRule`, `ArtifactDoc` | "Document" — which has an owner and has **no** ID family nor lifecycle (`ADR-0008`) | RN-0001 | active |
```

Add two rows at the end of the table:

```markdown
| Document | A file with a declared owner and without an ID family, declared in `documents:` | `DocumentRule`, `DocumentDoc` | "Artifact" — which has an ID, a state and freezing; and "any file", which has no owner at all | ADR-0008, RN-0016 | active |
| Payment trigger | An observable condition in the repository that makes a debt due, declared in `pay-when` | `PayWhen`, `duePayments` | "Deadline" — a debt does not expire on the calendar, it expires when the condition appears | ADR-0007, RN-0019 | active |
```

- [ ] **Step 6: The three skills**

In `plugin/skills/decision-recorder/SKILL.md`, add to the procedure, in the
item that deals with TDR (or as a new item right after it):

```markdown
- **Every debt is born with the payment trigger in both forms:** the prose, in
  `## Payment trigger`, which explains the why; and `pay-when` in the frontmatter,
  with `pattern` (regex in single quotes) and `paths` (where to search for it), which is
  what `CI-4` evaluates. If you cannot write the second, the trigger is not
  observable — and then the debt is not ready to be registered. Do not invent a
  pattern that matches nothing just to make the check pass: that is the ticked box.
```

And to the checklist:

```markdown
- [ ] Every `open` debt declares a verifiable `pay-when` — verification: `CI-4`.
```

In `plugin/skills/working-agreements-keeper/SKILL.md`, add to the
procedure:

```markdown
- **The agent contract does not repeat text from an owning artifact, and this is now
  verified.** `CI-7` compares sentence by sentence (floor of twelve words,
  `ADR-0009`) against the artifacts with an owning skill. When it flags, the fix is to
  delete the sentence and leave the pointer — never to touch the threshold.
- **A new document is declared in both places:** `documents:` in
  `docs/.ownership.yml` (with the owning skill, and the `role` when it is the agent
  contract or the Definition of Done) and a line in CODEOWNERS.
```

and to the checklist:

```markdown
- [ ] No sentence of the agent contract repeats an owning artifact — verification: `CI-7`.
- [ ] Each new Definition of Done item names what verifies it — verification: `CI-7`.
```

In `plugin/skills/living-docs-bootstrap/SKILL.md`, add to the ownership table
or to the procedure, where `.ownership.yml` is described:

```markdown
- **`documents:`** declares what has an owner and no ID family
  (`CONTRIBUTING.md`, the Definition of Done, the agent contract, the glossary, the
  charter, the CHANGELOG, and whatever else the project has). `artifacts:` keeps
  requiring `id-prefix`; `CI-1`, `CI-2` and `HK-1` do not read `documents:`, and `CI-4` and
  `CI-7` do (`ADR-0008`).
```

- [ ] **Step 7: `plugin.json`**

```json
  "description": "Living documentation: ADR, Open Decisions, Debt Register, requirements with a stable ID, working agreements, domain vocabulary, inviolable principles, generated public contract, historical trail aimed at whoever consumes, and continuous maintenance — session inventory, staleness, ownership coverage, links and divergence audit. Phases 0–7.",
```

- [ ] **Step 8: Workflow**

In `.github/workflows/living-docs.yml`, rename the validate step and
add the step with a base:

```yaml
- name: CI-1 to CI-4, CI-7 and CI-8 — living documentation
  run: >
    docker compose run --rm -w /workspace toolkit
    node /opt/living-docs/src/cli/index.ts validate

# The half of CI-7 that reads the diff only exists with a base (ADR-0010). On
# `push` there is no base, and inventing one would produce a finding about a change that
# is not from this branch.
- name: CI-7 — code→doc link in the PR diff
  if: github.event_name == 'pull_request'
  run: >
    docker compose run --rm -w /workspace toolkit
    node /opt/living-docs/src/cli/index.ts validate
    --base ${{ github.event.pull_request.base.sha }}
```

- [ ] **Step 9: CHANGELOG**

Under `## [Unreleased]` → `### Changed`:

```markdown
- `living-docs validate` now requires that every document under the documentation
  root have an entry in `docs/.ownership.yml` and a line in CODEOWNERS
  (`CI-7`). A repository installed by an earlier version needs to run
  `living-docs init` again, or declare the documents by hand, to keep
  passing.
```

- [ ] **Step 10: Backlog**

In `docs/superpowers/plans/BACKLOG-phases-3-7.md`, add to the state block,
after the Phase 6 paragraph:

```markdown
**State on 2026-08-27:** Phase 7 is **implemented** —
`docs/superpowers/plans/2026-08-27-living-docs-toolkit-phase-7.md`, the 14 tasks
executed. The ten acceptance criteria of spec §12 are covered: 7 (`CI-4`),
8 (`HK-6`) and the second half of 5 (`CI-7` with `--base`) closed here.
`DA-0002` is `resolved` by `ADR-0008`. Human promotion (Task 14): record
here what was and what was not accepted — **do not assume**.

What the planning found out, and which holds for whoever continues:

- **There is no `--stage multi-team`, and the reason is structural.** Phase 7 does not
  install an artifact: it installs enforcement, which already ships in the toolkit and the plugin. The
  stage would have the same set of files as `production` — a label with
  nothing behind it, which is what the backlog itself called "dead wiki born
  from the factory". What `CI-7` actually required of `init` was something else and holds for
  every stage: declaring in `documents:` what it creates (`RF-0012`).
- **`DA-0002` became a new key, not a new prefix.** Making `id-prefix`
  optional in `artifacts:` would have pushed an `if` inside `CI-1`,
  `CI-2`, `HK-1` and `HK-3` — the cost would have fallen on Phase 0, which is the part that
  should change the least (`ADR-0008`).
- **`role` in `documents:` is what lets `CI-7` find the agent contract and
  the Definition of Done without knowing any path.** This was not foreseen and
  is the piece without which two of the five classes of finding of `CI-7` would not exist.
- **The severity of the `watches` signal in CI needed an ADR.** Spec §9 ("only
  `CI-4` warns"), `RN-0009` ("never blocks") and criterion 5 ("CI flags")
  did not fit together. `ADR-0010` decided error with an escape label, and the
  precedent had been in the repository since Phase 6: `CI-6` fails on a
  `watches` entry with `Changelog: none — <reason>` as the way out.
- **`CI-4` needed two things, not one.** `CheckContext.today` was the
  foreseen one; the second was `pay-when`, because an "observable payment trigger"
  in prose cannot be evaluated. A frozen item does not expire — without that rule, every accepted
  ADR would become a permanent warning and the way to silence the warning would be the bulk
  bump that spec §13 refuses.
- **The most likely false positive of `CI-8` is a link inside a code block**,
  and this repository has one (`](?:mente)` in a Phase 0 plan). `stripCode`
  exists because of it, and closes the fence by size because a plan uses a fence of
  four backticks.
```

Replace the "Suggested order from here" section with the new state:

```markdown
### Suggested order from here

The seven phases of spec §10 are implemented. What remains is not a phase:

1. **Accept `ADR-0001`, `ADR-0002` and `ADR-0006`** (today `draft`). It depends
   on nothing and remains a cheap act — with the precondition already noted: the
   `relates-to` must be filled in **before**, because `accepted` freezes the
   file.
2. **`TDR-0001`** stays `open`, now with a verifiable trigger: `CI-4` fails on the
   first PR that revokes a requirement. There is nothing to do before that.
3. **Distribution of the toolkit.** `ADR-0003` decides the two roots and does not decide
   how the toolkit reaches a consuming project. It is worth opening a `DA` on the first
   real consumer — and that is where the rupture of `CI-7` (a document without an owner starts
   to fail) will be felt first.
4. **Extending to the layers out of scope** (C4, runbooks, event catalog) is the
   real test of the extension point: an entry in `docs/.ownership.yml` and an
   owning skill, without touching any check. If it needs to touch one, the extension point
   was not what the spec said it was.
```

- [ ] **Step 11: Run everything**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Expected: PASS, `validate=0`, `drift=0`.

- [ ] **Step 12: Commit**

```bash
git add README.md CONTRIBUTING.md docs/definition-of-done.md CLAUDE.md docs/glossary.md plugin/skills/decision-recorder/SKILL.md plugin/skills/working-agreements-keeper/SKILL.md plugin/skills/living-docs-bootstrap/SKILL.md plugin/.claude-plugin/plugin.json .github/workflows/living-docs.yml CHANGELOG.md docs/superpowers/plans/BACKLOG-phases-3-7.md
git commit -m "docs(RN-0016, RN-0017, RN-0020, RN-0023): indexes, DoD, glossary and workflow of Phase 7"
```

---

### Task 14: Human promotion

**Objective:** Take `ADR-0007`–`ADR-0010` to `accepted`, `DA-0002` to `resolved`,
and `RF-0010`–`RF-0012`, `RNF-0004` and `RN-0016`–`RN-0023` to `active`. **This is not
yours.** The skill writes `draft`/`open`; promoting is a human act (`RN-0005`), and
`HK-3` intercepts with `ask`.

**Files:**

- Modify: `docs/decisions/adr/ADR-0007-injectable-date-and-verifiable-payment-trigger.md`
- Modify: `docs/decisions/adr/ADR-0008-document-without-id-family.md`
- Modify: `docs/decisions/adr/ADR-0009-textual-duplication-threshold.md`
- Modify: `docs/decisions/adr/ADR-0010-severity-of-the-watches-signal-in-ci.md`
- Modify: `docs/open-decisions.md` (`DA-0002 → resolved`)
- Modify: `docs/requirements/functional.md`
- Modify: `docs/requirements/non-functional.md`
- Modify: `docs/requirements/rules.md`

**Interfaces:**

- Consumes: the IDs of Task 1 and Task 2, and the citations planted by Tasks 3 to 13.
- Produces: sixteen items in final state, enforceable by `CI-3`.

**Requirements:**

- Before proposing the promotion, check that each requirement **already** has
  someone citing it, outside its own file:
  - `RF-0010`: `test/cli/validate.test.ts`, `test/checks/registry.test.ts`
  - `RF-0011`: `test/cli/validate.test.ts`, `test/acceptance/spec-criteria.test.ts`
  - `RF-0012`: `test/cli/init.test.ts`
  - `RNF-0004`: `test/core/dates.test.ts`, `src/core/dates.ts`
  - `RN-0016`: `test/checks/ci7-ownership-coverage.test.ts`, `test/docs/maintenance.test.ts`
  - `RN-0017`: `test/checks/ci7-ownership-coverage.test.ts`
  - `RN-0018`: `test/checks/ci4-staleness.test.ts`, `src/checks/ci4-staleness.ts`
  - `RN-0019`: `test/checks/ci4-staleness.test.ts`, `test/docs/maintenance.test.ts`
  - `RN-0020`: `test/checks/ci7-ownership-coverage.test.ts`, `test/docs/maintenance.test.ts`
  - `RN-0021`: `test/checks/ci7-ownership-coverage.test.ts`, `test/acceptance/spec-criteria.test.ts`
  - `RN-0022`: `test/hooks/hk6-session-inventory.test.ts`
  - `RN-0023`: `test/checks/ci8-links.test.ts`
    Without a citation, promoting to `active` makes `CI-3` (rule 7) fail on the spot.
- `DA-0002 → resolved` requires `Resolved-by: ADR-0008` in the table, and `ADR-0008`
  was already born with `relates-to: [DA-0002, RN-0001]` (Task 1). `CI-3` verifies
  both sides.
- The four ADRs were already born with `relates-to` filled in. After `accepted` the
  file freezes and `relates-to` is not in the `mutable-fields`: fixing it would require
  superseding.
- `last-reviewed` only changes in a file that was really reviewed. A bulk bump is an
  anti-requirement of spec §13 — and, since this phase, the `CI-4` that warns about
  staleness is precisely the mechanism that a bulk bump would turn off.

- [ ] **Step 1: Confirm that the citations exist**

```bash
docker compose exec toolkit sh -c 'for id in RF-0010 RF-0011 RF-0012 RNF-0004 RN-0016 RN-0017 RN-0018 RN-0019 RN-0020 RN-0021 RN-0022 RN-0023; do echo "== $id"; grep -rln "$id" test/ src/ || echo "  NO CITATION"; done'
```

Expected: at least one file per ID, and no `NO CITATION`. A citation inside the
artifact itself covers nothing (`CI-3`, rule 7) — that is why the scan is only in
`test/` and `src/`.

- [ ] **Step 2: Propose the promotion — and leave the answer with whoever decides**

Edit the sixteen states:

- `status: draft` → `status: accepted` in `ADR-0007`, `ADR-0008`, `ADR-0009` and
  `ADR-0010`.
- In the table of `docs/open-decisions.md`, on the `DA-0002` row:
  `| open | — |` → `| resolved | ADR-0008 |`.
- `- **status:** draft` → `- **status:** active` in `RF-0010`, `RF-0011`,
  `RF-0012`, `RNF-0004`, and `RN-0016` to `RN-0023`.

`HK-3` will intercept each of these edits with `ask`. **The answer is not
yours.** Present what the person needs to decide, and wait:

- `ADR-0007`: the toolkit now has a single date source, and a debt now
  declares the trigger in two forms — the prose and the `pay-when`. What is lost is
  the possibility of the two diverging without anything flagging it.
- `ADR-0008`: `DA-0002` closes with a new key instead of an invented prefix.
  What is lost is the validation of `CI-1` over these documents.
- `ADR-0009`: twelve words is a number chosen against one project's corpus.
  What is lost is duplication by paraphrase, which no check catches.
- `ADR-0010`: CI now fails on a watched path without an owning doc, with
  `Docs: none — <reason>` as the way out. It is the decision with the greatest effect on the day to day
  of whoever writes commits, and the one that most deserves the question.

If the person refuses any of them, that is a legitimate result: the item
stays `draft`, Phase 7 stays delivered, and the backlog records the real
state. Do not force, do not work around, and do not "advance" the promotion because the plan ends
here.

- [ ] **Step 3: Run everything and confirm that the final state passes**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Expected: PASS, `validate=0`, `drift=0`. If `CI-3` flags
`RN-00nn is active and is not cited`, Step 1 lied — the citation is in the artifact
itself, or in a path outside `cited-by`. If it flags
`DA-0002 points to ADR-0008, which does not cite it in relates-to`, the `relates-to` of
`ADR-0008` was touched after Task 1 — and, if the ADR is already `accepted`,
fixing it now requires superseding.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/adr/ADR-0007-injectable-date-and-verifiable-payment-trigger.md docs/decisions/adr/ADR-0008-document-without-id-family.md docs/decisions/adr/ADR-0009-textual-duplication-threshold.md docs/decisions/adr/ADR-0010-severity-of-the-watches-signal-in-ci.md docs/open-decisions.md docs/requirements/functional.md docs/requirements/non-functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0007, ADR-0008, ADR-0009, ADR-0010, DA-0002, RF-0010, RF-0011, RF-0012, RNF-0004, RN-0016, RN-0017, RN-0018, RN-0019, RN-0020, RN-0021, RN-0022, RN-0023): promotion by human act"
```

If the promotion did not happen, do not invent the commit: go back to Task 13, Step 10, and
write in the backlog the real state ("`ADR-0009` stays `draft`", "`DA-0002` stays
`open`").

---

## What this phase deliberately does not do

- **It does not create `--stage multi-team`.** Phase 7 installs no artifact at all, and a
  stage with the same set of files as `production` is the empty label that
  the backlog said to avoid. What `CI-7` required of `init` was to declare what it
  creates, and that holds for every stage (`RF-0012`).
- **It does not extend `CI-1` to `documents:`.** A document declared there does not have its
  frontmatter validated: a `trigger` with cadence inside `CONTRIBUTING.md`
  passes. Extending it is not free — `CHANGELOG.md` has no frontmatter by a decision
  of Phase 6, and a naive `CI-1` would start failing it. It is a separate decision, and
  `ADR-0008` records that it was left out.
- **It does not resolve link anchors.** `CI-8` verifies the file, not the `#fragment`.
  Resolving an anchor would require reproducing the slug rule of each renderer, and a
  rule reproduced by half fails a link that works.
- **It does not detect duplication by paraphrase.** `CI-7` compares a normalized sentence by
  equality, with a floor of twelve words. The check that caught paraphrase would be wrong
  more often than right, and would be wrong in a direction indefensible inside a PR
  (`ADR-0009`).
- **It does not pay `TDR-0001`.** `HK-1` still freezes per file, not per
  section. What changes is that the payment trigger became verifiable: on the
  first PR that revokes a requirement, `CI-4` fails until the debt is
  paid or reclassified — both human acts.
- **It does not accept `ADR-0001`, `ADR-0002` nor `ADR-0006`.** The three stay `draft`,
  and promoting them is not for this phase nor for this agent.
- **It does not measure documentation volume and does not count documents.** `CI-7` demands an owner and
  duplication; `CI-4` demands review and debt; `CI-8` demands links. None of them
  produces a number about "how much documentation exists", which is the anti-requirement of
  spec §13 — and `AG-1` explicitly refuses to suggest a new document.
- **It does not change `run-hook.sh`, `src/git/staged.ts`, `src/git/diff.ts` nor
  `src/exec/command.ts`.** The wrapper already dispatches by hook name, and `HK-6`
  enters it without change; the three execution policies (fail open for a hook,
  an error that goes up for a check) stay as they were. `src/ids/coverage.ts` is the
  only extraction of this phase, and it has an existing test as its net.
- **It does not create a check for "every principle of the Constitution has a named
  enforcement".** It remains a skill rule (`charter-keeper`) and a dogfooding test,
  for the same reason as Phase 4: measuring it by a check would require the
  toolkit to understand the text of the principle.
