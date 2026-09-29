# Closing the living documentation toolkit — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the nine gaps `L-1`, `L-2`, `L-3`, `L-5`, `L-6`, `L-7`, `L-8`,
`L-9` and `L-10` of the closing spec — the written form of the ID stops
belonging to the toolkit and becomes the project's, `init` starts installing the
enforcement that `SK-0` always declared as its own, behavior without a rule gets
the deterministic piece it was missing (`HK-8` and the new half of `CI-7`), the
three rules written without a check get `CI-9` and `CI-10`, the enforcement
starts watching itself and fits under a measured ceiling, and a real consumer is
adopted without any file of theirs being rewritten.

**Architecture:** One engine piece is born before everything else and is the
reason the order is this one: `IdFormat` separates **identity** from **written
form**. The canonical key (`canonicalId`) remains internal, invariant and never
displayed — it is what compares, detects duplicates and closes a bidirectional
pair, and no check changes logic because of this. The written form is read from
`id-format` in `docs/.ownership.yml`, and becomes the pattern the parser
recognizes and the only function that prints an ID (`writeId`). No check goes
back to building an ID by concatenation.

On top of that base, three fronts. **`init` starts writing enforcement**: a
workflow template parameterized by invocation mode (never Docker imposed on
whoever installs), the plugin registration in the consumer's
`.claude/settings.json` and the marketplace manifest at the toolkit root — the
three installed by **merge**, never by overwrite, and the `multi-team` stage
comes to exist because it now has enforcement behind it. **The open decision
gains claimed paths**: an optional field in the machine contract, `HK-8` which
**asks** (never denies — a hook that judges is in the wrong place) and a sixth
finding in `CI-7`, in the half that already receives the diff. **Two rules
become checks**: `CI-9` enforces commit discipline (mass bump of `last-reviewed`
and a commit that changes an artifact without citing the ID), `CI-10` enforces
that the artifact's `trigger` and the owning skill's `description` speak of the
same event.

Dogfooding is mandatory and is the proof: this repository starts declaring
`.github/workflows/**` in `watches` and in `consumer-visible-paths`, the set of
checks starts being measured against a declared ceiling, and the last task adopts
a consumer with 97 rules written as `RN001` without touching any of their files.

**Tech Stack:** TypeScript (Node >= 24, run only in a container —
`RNF-0002`), `node:test`, `picomatch`, `yaml`, Claude Code plugin
(`SKILL.md`, `hooks.json`, `marketplace.json`), GitHub Actions in the template.

**Spec:** `docs/superpowers/specs/2026-08-28-toolkit-closing-design.md` —
and, as input it does not repeat: `LIVING-DOCUMENTATION-TOOLKIT.md` (§2
machine contract, §3 extension point, §5 `SK-0`, §7 hooks, §8 citation syntax, §9
checks and time budget, §10 phases and stages, §11 authoring and commit
conventions, §12 criterion 4, §13 anti-requirements),
`LIVING-DOCUMENTATION.md` (the research) and
`docs/superpowers/plans/BACKLOG-phases-3-7.md` (what each phase found).

## Global Constraints

- **Nothing runs on the host except Docker** (`RNF-0002`). Every command goes
  through `docker compose exec toolkit …` or `./bin/living-docs`. If a step asks
  for `node`, `npm` or `npx` outside the container, the step is wrong.
- **Docker is a rule of this toolkit, not of whoever installs it.** The workflow
  that `init` writes into the consumer receives the invocation mode as a
  parameter and does not mention Docker.
- Identifiers, file names and IDs in English/neutral; prose in Portuguese
  (spec §11). Commit message in Portuguese, in the format `type(ID): subject`.
- **An ID is never recycled** (spec §2). Check `docs/ids-retired.txt` before
  taking a number. The free numbers in this plan, and **no others**:
  `ADR-0011`, `ADR-0012`, `ADR-0013`; `DA-0003`; `RF-0013`, `RF-0014`;
  `RN-0024` to `RN-0029`; `RNF-0005`.
- **No agent promotes state.** Every artifact created here is born `draft` or
  `open`. Promotion is the last task and is a human act (`HK-3` intercepts).
- **No generated artifact is edited by hand.** `docs/contracts/checks.gen.md`
  only changes through the source (`src/checks/catalog.ts`) and the generator:
  `docker compose exec toolkit node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md`.
  `HK-2` denies the direct edit and `CI-5` enforces against drift.
- **A change in a consumer-visible path travels with a CHANGELOG entry.**
  The paths are `src/cli/**`, `src/checks/catalog.ts`, `src/config/ownership.ts`,
  `plugin/**`, `templates/**`, `bin/living-docs` — and, from Task 6 on,
  `.github/workflows/**`. `CI-6` enforces.
- **Test before implementation, citing the ID of the requirement it covers.** It
  is the citation that `CI-3` looks for.
- No check measures volume, counts documents or estimates documentation coverage
  (spec §13).
- After each task: `docker compose exec toolkit npm test`,
  `docker compose exec toolkit npm run typecheck` and `./bin/living-docs validate`
  pass. Do not deliver with an open finding.

## Coverage of the closing spec

| Spec item                                                                   | Where it closes |
| --------------------------------------------------------------------------- | --------------- |
| `L-10` — identity × written form                                            | Tasks 3, 4, 5   |
| `L-1` — `init` does not install enforcement                                 | Tasks 6, 8      |
| `L-2` — the plugin has no installation path                                 | Task 7          |
| `L-7` — `--stage multi-team` does not exist                                 | Task 8          |
| `L-3` — criterion 4 without a mechanism                                     | Tasks 9, 10     |
| `L-5` — mass bump is not detected                                           | Task 11         |
| `L-8` — ID in the commit message; time budget                               | Tasks 11, 13    |
| `L-6` — `trigger` × `description`                                           | Task 12         |
| `L-9` — the enforcement is not watched                                      | Task 6          |
| Acceptance criteria 1 and 2                                                 | Tasks 3, 4, 5   |
| Criteria 3, 4 and 5                                                         | Tasks 6, 7, 8   |
| Criterion 6                                                                 | Tasks 9, 10     |
| Criteria 7 and 8                                                            | Task 11         |
| Criterion 9                                                                 | Task 12         |
| Criterion 10                                                                | Task 13         |
| Criterion 11                                                                | Task 6          |
| Criterion 12                                                                | Task 15         |
| Criteria 9 and 10 of the **original** spec (out of scope, human line in DoD) | Task 14         |

---

### Task 1: The three decisions — `ADR-0011`, `ADR-0012`, `ADR-0013` — and `DA-0003`

**Objective:** Record, before any code, the three decisions this plan makes that
are not obvious, and open the gap it discovers and does **not** resolve. Each one
is born `draft`/`open`: promoting is a human act (Task 16).

**Files:**

- Create: `docs/decisions/adr/ADR-0011-id-identity-and-written-form.md`
- Create: `docs/decisions/adr/ADR-0012-what-the-stage-parameterizes.md`
- Create: `docs/decisions/adr/ADR-0013-the-two-closing-thresholds.md`
- Modify: `docs/open-decisions.md` (line of `DA-0003`)

**Interfaces:**

- Consumes: nothing. It is the first task.
- Produces: the IDs `ADR-0011`, `ADR-0012`, `ADR-0013` and `DA-0003`, citable by
  every following task. No other ADR is created in this plan.

**Requirements:**

- Complete frontmatter: `id`, `title`, `status: draft`, `owner: "@esliph/engineering"`,
  `trigger`, `last-reviewed`, `relates-to`, `supersedes`, `superseded-by`. The
  ADR `trigger` is always "Never. Immutable once accepted; a new decision
  supersedes it." — a cadence fails in `CI-1`.
- `relates-to` filled in **now**, not at acceptance: `accepted` freezes the file
  and `relates-to` is not in `mutable-fields`, so an accepted ADR with
  `relates-to: []` can only be fixed by superseding.
- `CI-2` requires that every citation resolve. The requirements cited here
  (`RN-0024`…) are born in Task 2 — so the two tasks travelling in the **same
  commit** is not mandatory, but `validate` only passes again after Task 2.
  Run `validate` at the end of Task 2, not at the end of this one.

**`HK-5`:** no watched path is touched — this task only writes documents.

- [ ] **Step 1: Write `ADR-0011`**

Create `docs/decisions/adr/ADR-0011-id-identity-and-written-form.md`:

```markdown
---
id: ADR-0011
title: The identity of an ID and its written form are different things
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-28
relates-to: [RN-0003, RN-0024]
supersedes: null
superseded-by: null
---

# ADR-0011 — The identity of an ID and its written form are different things

## Context

Spec §8 fixes a citation syntax — `<PREFIX>-<number>` — and justifies it:
"a single form, because it is the one that `CI-2` and `CI-3` recognize by
`grep`". The real requirement behind this is **one form per project**: it is the
`grep` that needs determinism, not the universe. The implementation encoded the
toolkit's form in `src/docs/schema.ts` and `src/ids/citations.ts` and treated it
as universal.

This collides with two demands of the same spec: step 1 of `SK-0` ("adopt what
exists … **never** create a parallel one") and acceptance criterion 1 ("no
pre-existing artifact was duplicated or overwritten"). A repository with 97 rules
numbered `RN001` has no way of being adopted without being rewritten, and
rewriting is what the criterion forbids.

## Alternatives considered

1. **Renumber the consumer.** Discarded, and it is a written anti-requirement: it
   is overwriting what pre-exists, in a diff of 97 rules that nobody reviews.
2. **Accept both forms everywhere** (`RN009` and `RN-0009` always valid).
   Discarded: it kills the determinism of the `grep` that spec §8 asks for, and
   makes the repository itself accept two spellings of the same item side by side.
3. **An alias table per ID.** Discarded: per-item configuration is the opposite
   of a single extension point, and rots at the first new rule.
4. **Separate identity from written form.** Chosen.

## Decision

**The canonical key is internal and invariant; the written form is declared by
the project.**

- **Canonical key** — `<PREFIX>-<4 digits>`, produced by `canonicalId`,
  **never displayed**. It is what compares, detects duplicates, closes a
  bidirectional pair and resolves a citation. No check changes logic.
- **Written form** — `id-format: { separator, padding }` in
  `docs/.ownership.yml`, with `separator: "-"` and `padding: 4` as the default.
  It is what the parser recognizes when reading and what the toolkit prints when
  suggesting a new ID.
- **Reading accepts the declared padding and one digit fewer.** With `padding: 4`
  that is 3 or 4 digits, which is exactly what the toolkit already did — `ADR-001`
  and `ADR-0001` are the same item (`RN-0003`), and repadding never created a new
  item.
- **Whoever writes an ID is a single function**: `writeId`. No check goes back
  to building an ID by concatenation — the sequence-gap message of `CI-2` was the
  only leak and now calls it.
- **Adopting a format is not silent.** The inventory reports the detected form and
  how many items it read in it; declaring is the act of whoever installs.

## Consequences

### What we gain

A real repository is adopted without any file of theirs being touched, which is
criterion 1 of the original spec holding for the world and not only for an empty
repository. And the format stops being written in five places: there is now one
source and one function that prints it.

### What we accept to lose

**A project has one form, not several.** A repository that today mixes `RN001`
and `RN-0001` has to choose one — and that is the same determinism demand spec §8
always made, now applied to the project instead of the universe.

**Reading is one digit wider than writing.** `RN09` is read as `RN009` in a
project with `padding: 3`. It is deliberate and it is the rule that already
existed: identity does not depend on leading zeros.

**The separator is a closed vocabulary** (`-`, `_`, `.`, `:` or empty). An
arbitrary separator would become a regular-expression pattern coming from
configuration, which is a surface this toolkit does not want.
```

- [ ] **Step 2: Write `ADR-0012`**

Create `docs/decisions/adr/ADR-0012-what-the-stage-parameterizes.md`:

```markdown
---
id: ADR-0012
title: The stage parameterizes the workflow checks; the hooks come in as a single piece
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-28
relates-to: [RF-0013, RN-0025]
supersedes: null
superseded-by: null
---

# ADR-0012 — The stage parameterizes the workflow checks; the hooks come in as a single piece

## Context

`SK-0` declares as its own "the installation of `HK-*` and `CI-*`" and step 4
says to install **in the order of the phases**. The rule that comes out of that is
"the installed set of enforcement is that of the phases of the stage, no more and
no less".

The `CI-*` fit that rule: each one is a step of the workflow, and a step is either
included or not. The `HK-*` do not fit: they reach the consumer through a plugin,
and a plugin registers the whole `hooks.json`. There is no "half a plugin".

## Alternatives considered

1. **One plugin per phase.** Discarded: seven plugins for seven hooks multiplies
   the installation path by seven and turns "installing the toolkit" into a
   procedure. The duplicate anti-requirement applies to an installation piece too.
2. **Rewrite the plugin's `hooks.json` at `init` time.** Discarded: `init` would
   start editing a **toolkit** file to configure the **consumer**, which is exactly
   the confusion of roots that `ADR-0003` closed.
3. **Register the hooks one by one in the consumer's `.claude/settings.json`.**
   Discarded: it duplicates the plugin's `hooks.json` in a second place, and the
   two copies diverge at the first new hook.
4. **Stage the checks and accept the hooks as a single piece.** Chosen.

## Decision

**The stage parameterizes the CI workflow. The plugin registration is
indivisible.**

- `solo` and `small-team` install the `validate` step.
- `production` adds `drift` (`CI-5`) and `changelog --base` (`CI-6`).
- `multi-team` adds `validate --base` — the half of `CI-7` that reads the diff,
  and `CI-9`.
- The plugin registration turns **all** the hooks on, at any stage. What stages a
  hook is not the installer: it is the configuration it reads. `HK-2` without
  `generated[]`, `HK-4` and `HK-5` without `watches`, `HK-8` without an open
  decision with a claimed path — all stay silent.
- `HK-6` and `HK-7` speak at any stage, and that is accepted: both return
  `additionalContext` and neither blocks anything.

## Consequences

### What we gain

`--stage multi-team` comes to exist with content — enforcement is a file, and from
here on a stage installs enforcement. `SK-0` stops telling you to choose a value
that the CLI rejects.

### What we accept to lose

**A `solo` project receives seven hooks and uses two.** The cost is zero as long as
the silence is real, and that is why the silence is tested: each hook has a test
that proves it stays quiet without its configuration. The day a hook speaks
without configuration, it is this decision that is wrong — not the test.
```

- [ ] **Step 3: Write `ADR-0013`**

Create `docs/decisions/adr/ADR-0013-the-two-closing-thresholds.md`:

```markdown
---
id: ADR-0013
title: The two closing thresholds — mass bump and trigger similarity
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-28
relates-to: [RN-0027, RN-0029]
supersedes: null
superseded-by: null
---

# ADR-0013 — The two closing thresholds — mass bump and trigger similarity

## Context

`CI-9` and `CI-10` are the first two checks after `CI-7` to compare things
without a binary answer: "several documents" is not a number, and "say the same
thing" is not an equality. `ADR-0009` already set the precedent for this kind of
piece — the threshold has to be **written** so that it can be discussed inside a
PR, and the fix for a false positive is a new ADR, never a local exception.

## Alternatives considered

1. **No threshold: any change to `last-reviewed` fails.** Discarded:
   reviewing a document and updating the date is the mechanism working.
2. **Statistical similarity for `trigger` × `description`.** Discarded for the
   same reason as `ADR-0009`: a number that nobody explains in the PR is a guess.
3. **Compare by sentence equality.** Discarded: `trigger` and `description` are
   written for different readers — one for whoever maintains the document, the
   other for the skill index. Demanding equality would be demanding a copy, which
   is the anti-requirement of `RN-0010` coming in through the back door.
4. **Two written numbers, calibrated against this repository.** Chosen.

## Decision

**Mass bump: three documents.** A diff in which **three or more** documents
change **only** the `last-reviewed` line, and nothing else in the body, fails. The
number is configurable in `last-reviewed-bump-limit` in `.ownership.yml`.

- **The unit is the branch diff, not the commit.** It is the unit the CI has, and
  splitting the bump into three commits does not make it a real review.
- **There is no escape label.** The escape is the very anti-requirement of spec
  §13. Whoever really reviewed changed more than the date; whoever did not review
  should not mark that they did.

**Trigger similarity: two shared roots.** The `trigger` of an artifact and the
`description` of the owning skill must share **at least two** word roots. A root
is a word of five letters or more, normalized as in `ADR-0009` (lowercase, no
markup, no punctuation), truncated to six characters — the truncation is what
makes "changed" find "change" without the toolkit learning the grammar of a
language.

- **Calibration:** against the eleven pairs of this repository. The tightest pair
  is `docs/deprecations.md` × `release-historian`, with exactly two roots
  (`announ`, `deprec`); the loosest is `docs/requirements/*.md` ×
  `requirements-keeper`, with four.
- **A collection item does not enter.** Only the **document's** trigger is
  compared: the `trigger` of an ADR is "Never. Immutable once accepted", which
  belongs to the item and not to the artifact.
- **An owning skill missing from the toolkit root warns and moves on.** It is the
  only exception to "only `CI-4` warns" in spec §9, and it exists because a
  project may declare a skill of its own — failing on that would be the check
  demanding that every owner come from the plugin.

## Consequences

### What we gain

Two rules that the spec wrote and never allocated to any piece start to have
enforcement, and the two numbers that sustain them are written where numbers are
discussed: in an ADR, with the calibration corpus named.

### What we accept to lose

**The two numbers are chosen, not derived.** Three documents and two roots are
calibration against one project. The first time either of them fails a legitimate
case, the path is a new ADR with the concrete case attached — not an exception
inside the check, and not lowering the number in silence.

**A full paraphrase passes `CI-10`.** A `trigger` rewritten with whole synonyms
shares no root and fails even though it says the same thing; a `trigger` that
shares two roots by chance passes while saying something else. It is the price of
a comparison that fits in one sentence of an error message.
```

- [ ] **Step 4: Open `DA-0003`**

The toolkit decides the two roots (`ADR-0003`) and does **not** decide how it
reaches the CI of whoever installs it — the installed workflow receives the
invocation mode as a parameter precisely because that answer does not exist. Add
the row to the table in `docs/open-decisions.md`, right below the `DA-0002` row:

```markdown
| DA-0003 | How the toolkit reaches the CI and the session of a consumer repository — published image, package, clone or submodule. `ADR-0003` separates the two roots and deliberately does not decide this one; while it is open, the workflow's invocation mode and the marketplace source are parameters of whoever installs | open | — | 2026-08-28 |
```

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0011-id-identity-and-written-form.md \
        docs/decisions/adr/ADR-0012-what-the-stage-parameterizes.md \
        docs/decisions/adr/ADR-0013-the-two-closing-thresholds.md \
        docs/open-decisions.md
git commit -m "docs(ADR-0011, ADR-0012, ADR-0013, DA-0003): the toolkit closing decisions

Docs: none — the three decisions and the gap are the owning doc of this change"
```

---

### Task 2: The requirements — `RF-0013`, `RF-0014`, `RN-0024`–`RN-0029`, `RNF-0005`

**Objective:** The rule before the code. Nine requirements with a citable ID, each
stating what the system must do, without describing implementation. They are born
`draft`; promotion is Task 16.

**Files:**

- Modify: `docs/requirements/functional.md` (adds `RF-0013`, `RF-0014`)
- Modify: `docs/requirements/rules.md` (adds `RN-0024`–`RN-0029`)
- Modify: `docs/requirements/non-functional.md` (adds `RNF-0005`)

**Interfaces:**

- Consumes: the IDs of `ADR-0011`, `ADR-0012` and `ADR-0013` from Task 1.
- Produces: `RF-0013`, `RF-0014`, `RN-0024`, `RN-0025`, `RN-0026`, `RN-0027`,
  `RN-0028`, `RN-0029`, `RNF-0005` — cited by every test in this plan.

**Requirements:**

- Each section follows the format of `templates/requirements.md`: heading
  `## <ID> — <short statement>`, then `- **status:** draft`, `- **relates-to:**`
  when there is one, `- **out of scope:**`, and the statement in running text.
- The statement says **what**, never **how**. "`init` merges" is a requirement;
  "`init` uses `JSON.parse`" is not.
- Contiguous numbering: `CI-2` fails a sequence gap.

**`HK-5`:** no watched path is touched.

- [ ] **Step 1: Append `RF-0013` and `RF-0014` to the end of `docs/requirements/functional.md`**

```markdown
## RF-0013 — `init` installs the stage's enforcement, merging with what already exists

- **status:** draft
- **relates-to:** ADR-0012
- **out of scope:** the CLI invocation mode inside the workflow, which is a parameter of whoever installs (`DA-0003`); and `.claude/settings.json` and the installed workflow, which are not documentation and therefore do not enter `documents:`

Besides the frame, `living-docs init` writes the two enforcement pieces: the
stage's CI workflow and the plugin registration that turns the hooks on in the
session. Both come in by **merge**: a repository with workflows of its own and
hooks already registered keeps everything it has, and the toolkit adds what is
missing and nothing more. Running twice does not duplicate an entry — idempotence
holds for enforcement just as it does for documents.

A repository with documents and no check running is the promise this toolkit
refuses: enforcement is what makes the rule hold.

## RF-0014 — The inventory reports the written form of the IDs, and does not adopt it in silence

- **status:** draft
- **relates-to:** ADR-0011, RN-0024
- **out of scope:** converting IDs from one form to another, which is rewriting what pre-exists

`living-docs init --dry-run` in a repository whose IDs are not in the default form
reports which form it found and how many items it read in that form. Declaring the
form is the act of whoever installs, not of the inventory: silent adoption of a
format is the same class of error as silent adoption of a path, and `SK-0`
already refuses the second.
```

- [ ] **Step 2: Append `RN-0024`–`RN-0029` to the end of `docs/requirements/rules.md`**

```markdown
## RN-0024 — The written form of an ID belongs to the project; identity does not depend on it

- **status:** draft
- **relates-to:** ADR-0011, RN-0003
- **out of scope:** which form a project should choose, which is its own decision

A project declares how its IDs are written — separator and number of digits — and
that form is what the toolkit recognizes when reading and prints when suggesting a
new ID. The identity of the item does not depend on the form: `RN009` and
`RN-0009` are the same item, for the same reason that `ADR-001` and `ADR-0001`
always were.

Whoever writes an ID is a single function. No check builds an ID by
concatenation — a format built by hand in two places is the guarantee that one of
them will diverge.

## RN-0025 — The installed enforcement is that of the stage's phases

- **status:** draft
- **relates-to:** ADR-0012, RF-0013
- **out of scope:** which phases each stage asks for, which is spec §10

The set of checks that the installed workflow runs is that of the stage's phases,
no more and no less. A stage that installs an empty frame is the dead wiki being
born at the factory; a stage that installs the check of a phase the project does
not have is enforcement that fails for something nobody asked for.

The hooks are a single piece, and what stages them is the configuration they
read: a hook without its configuration stays silent.

## RN-0026 — A path claimed by an open decision is reminded on edit and enforced in the diff

- **status:** draft
- **relates-to:** ADR-0010, RN-0009
- **out of scope:** judging whether an edit is the implementation of the missing rule — a hook that judges is in the wrong place

An open decision may name the paths it blocks. When it does, editing one of them
**asks**, naming the decision, what it blocks and the owning skill; and the diff
that carries them **fails**, with the written reason as the only way out.

The field is optional: an open decision with no declared path remains valid and
blocks nothing. What is not accepted is the opposite — declaring the path and not
being reminded.

## RN-0027 — Mass bump of `last-reviewed` fails

- **status:** draft
- **relates-to:** ADR-0013
- **out of scope:** updating the date of a document that really changed, which is the mechanism working

A diff in which several documents change the review date and nothing else in the
body fails, naming the anti-requirement. A document that was really reviewed
changes in more than the date; twenty documents that only changed the date are the
review mechanism being switched off while pretending to fulfil it.

The threshold is written and configurable, and there is no exception label: the
label would be the ticked box that the anti-requirement describes.

## RN-0028 — A commit that changes an artifact cites the affected ID

- **status:** draft
- **out of scope:** the format of the commit message, which is a working agreement and not a toolkit rule

When the diff changes an artifact file, some commit message in the same diff cites
at least one of the IDs declared in that file. This is what makes `git log`
navigable by rule: without the citation, the history answers "what changed" and
never "because of which rule".

## RN-0029 — The artifact's trigger and the owning skill's `description` speak of the same event

- **status:** draft
- **relates-to:** ADR-0013, RN-0010
- **out of scope:** the `trigger` of an item inside a collection, which belongs to the item and not to the artifact

The `trigger` field of a document and the `description` of the skill declared as
its owner describe the same event. If they diverge, the document declares a
trigger that nothing fires: the trigger mechanism and the skill routing stop
meeting, and the document comes to depend on someone remembering it.

When the declared owning skill does not exist at the toolkit root, the result is a
warning and not a failure — a project may declare a skill of its own, and failing
on that would be demanding that every owner come from the plugin.
```

- [ ] **Step 3: Append `RNF-0005` to the end of `docs/requirements/non-functional.md`**

```markdown
## RNF-0005 — The set of checks fits under a declared and measured time ceiling

- **status:** draft
- **out of scope:** the time of each isolated check, and the image build time

The spec requires the checks to run "in minutes, on the PR". The ceiling belongs
to the **set**, not to each check — it is the set that runs on the PR —, is
declared in code and is **measured** on every execution, never estimated. A budget
that nobody measures is an intention, and the first slow execution discovers it in
production.
```

- [ ] **Step 4: Run the checks**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate
```

Expected: no findings. If `CI-2` reports a citation that does not resolve, the ID
cited in Task 1 and the one created here diverged — fix the text, never the
number.

- [ ] **Step 5: Commit**

```bash
git add docs/requirements/functional.md docs/requirements/rules.md docs/requirements/non-functional.md
git commit -m "docs(RF-0013, RF-0014, RN-0024, RN-0025, RN-0026, RN-0027, RN-0028, RN-0029, RNF-0005): the closing requirements"
```

---

### Task 3: `IdFormat` — the written form enters the engine

**Objective:** Separate identity from written form in the two pieces that today
encode the format: `src/docs/schema.ts` (reading and canonical key) and
`src/ids/citations.ts` (citation scan). Plus the `id-format` key in
`.ownership.yml`. Nothing beyond these three files changes behavior in this
task — the parsers and the checks come in Task 4.

**Files:**

- Modify: `src/docs/schema.ts`
- Modify: `src/ids/citations.ts`
- Modify: `src/config/ownership.ts`
- Test: `test/docs/schema.test.ts` (adds cases)
- Test: `test/ids/citations.test.ts` (adds cases)
- Test: `test/config/ownership.test.ts` (adds cases)

**Interfaces:**

- Consumes: `OwnershipError` and `asRecord` from `src/config/ownership.ts`.
- Produces:
  - `IdFormat { separator: string; padding: number }`
  - `DEFAULT_ID_FORMAT: IdFormat` — `{ separator: '-', padding: 4 }`
  - `SEPARATORS_ALLOWED: readonly string[]` — `['-', '_', '.', ':', '']`
  - `PADDING_RANGE: { min: 2; max: 6 }`
  - `digitRange(format): { min: number; max: number }`
  - `idPatternSource(format?): string` — group 1 prefix, group 2 number
  - `parseId(value: unknown, format?): { prefix, number } | null`
  - `canonicalId(parsed): string` — **unchanged**
  - `writeId(prefix: string, number: number, format?): string`
  - `citationPattern(format?): RegExp`
  - `findCitations(source: string, format?): Citation[]`
  - `OwnershipConfig.idFormat: IdFormat`

**Requirements:**

- Every `format` parameter defaults to `DEFAULT_ID_FORMAT`. Without that, this
  task would break the five callers at once, and the value of making the change in
  two tasks is precisely that Task 3 breaks nothing.
- `canonicalId` **does not change**: four digits, hyphen, always. It is an internal
  key; changing it would change the identity of every item already registered.
- Reading accepts `padding` and `padding - 1` digits. With the default, that is 3
  or 4 — identical to today, and it is what keeps `test/docs/schema.test.ts`
  passing without editing the existing cases.
- The separator is a closed vocabulary (`ADR-0011`). A value outside the list is
  an `OwnershipError` with the list in the message — invalid configuration does
  not become a silent default.
- `padding` outside 2..6 is an `OwnershipError`. One digit does not distinguish an
  item from a year; seven digits is data, not an ID.
- `src/ids/citations.ts` loses the comment "if that format changes, change here
  too": it now **derives** from `idPatternSource`, and the comment stops being true
  about two copies to become true about one source.

**`HK-5`:** will remind about `docs/requirements/rules.md` (watched path
`src/checks/**` is not touched here, but `src/config/ownership.ts` is
consumer-visible) and will ask for the CHANGELOG entry for `src/config/ownership.ts`.
The answer: `RN-0024` travelled in Task 2, and the CHANGELOG entry goes in Step 6.

- [ ] **Step 1: Write the failing test — written form in the schema**

Add to `test/docs/schema.test.ts`:

```typescript
import { DEFAULT_ID_FORMAT, canonicalId, digitRange, idPatternSource, parseId, writeId } from '../../src/docs/schema.ts'

const SEM_HIFEN = { separator: '', padding: 3 } as const

test('RN-0024: parseId reads the form declared by the project', () => {
  assert.deepEqual(parseId('RN009', SEM_HIFEN), { prefix: 'RN', number: 9 })
  assert.deepEqual(parseId('RN097', SEM_HIFEN), { prefix: 'RN', number: 97 })
  assert.deepEqual(parseId('RN09', SEM_HIFEN), { prefix: 'RN', number: 9 }, 'one digit fewer is still the same item')
  assert.equal(parseId('RN-009', SEM_HIFEN), null, 'a project has one form, not two')
  assert.equal(parseId('RN0097', SEM_HIFEN), null, 'four digits is not the declared form')
})

test('RN-0024: the default form is today\'s — 3 or 4 digits with a hyphen', () => {
  assert.deepEqual(digitRange(DEFAULT_ID_FORMAT), { min: 3, max: 4 })
  assert.deepEqual(parseId('ADR-0042'), { prefix: 'ADR', number: 42 })
  assert.deepEqual(parseId('DA-007'), { prefix: 'DA', number: 7 })
  assert.equal(parseId('RN009'), null)
})

test('RN-0024: the canonical key does not depend on the written form', () => {
  const semHifen = parseId('RN009', SEM_HIFEN)
  const comHifen = parseId('RN-0009')
  assert.ok(semHifen && comHifen)
  assert.equal(canonicalId(semHifen), canonicalId(comHifen))
  assert.equal(canonicalId(semHifen), 'RN-0009')
})

test('RN-0024: writeId is the only function that prints an ID', () => {
  assert.equal(writeId('RN', 9), 'RN-0009')
  assert.equal(writeId('RN', 9, SEM_HIFEN), 'RN009')
  assert.equal(writeId('ADR', 142, { separator: '_', padding: 4 }), 'ADR_0142')
  assert.equal(writeId('RN', 1234, SEM_HIFEN), 'RN1234', 'a number larger than the padding is not truncated')
})

test('idPatternSource delivers prefix and number in two groups', () => {
  const match = new RegExp(`^${idPatternSource()}$`).exec('TDR-0003')
  assert.equal(match?.[1], 'TDR')
  assert.equal(match?.[2], '0003')
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0024"
```

Expected: FAILS with `digitRange is not a function` / `writeId is not a function`.

- [ ] **Step 3: Implement in `src/docs/schema.ts`**

Replace the final block of the file (from `const ID = …` to the end) with:

```typescript
/**
 * The **written** form of an ID in this project (`ADR-0011`, `RN-0024`).
 *
 * It is not the identity: the identity is `canonicalId`, which never changes and
 * is not displayed. This is the form the parser recognizes when reading and the
 * one `writeId` prints when suggesting a new ID — and it is what allows adopting
 * a repository whose IDs are already written another way without rewriting a
 * file of theirs.
 */
export interface IdFormat {
  separator: string
  padding: number
}

export const DEFAULT_ID_FORMAT: IdFormat = Object.freeze({
  separator: '-',
  padding: 4,
})

/**
 * Closed vocabulary (`ADR-0011`). An arbitrary separator would become a
 * regular-expression pattern coming from configuration — a surface this toolkit
 * refuses.
 */
export const SEPARATORS_ALLOWED: readonly string[] = Object.freeze(['-', '_', '.', ':', ''])

export const PADDING_RANGE = Object.freeze({ min: 2, max: 6 })

/** Padding of the canonical key. Internal, never displayed, never configurable. */
const CANONICAL_PADDING = 4

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * How many digits READING accepts: the declared padding and one fewer.
 *
 * It is the rule that already existed under another name — `ADR-001` and
 * `ADR-0001` are the same item (`RN-0003`), and repadding never created a new
 * item. With the default this gives 3 to 4 digits, which is exactly what the
 * toolkit has read since Phase 0.
 */
export function digitRange(format: IdFormat): { min: number; max: number } {
  return { min: Math.max(1, format.padding - 1), max: format.padding }
}

/** The body of an ID pattern: group 1 is the prefix, group 2 is the number. */
export function idPatternSource(format: IdFormat = DEFAULT_ID_FORMAT): string {
  const { min, max } = digitRange(format)
  return `([A-Z]{2,4})${escapeForRegExp(format.separator)}(\\d{${min},${max}})`
}

export function parseId(value: unknown, format: IdFormat = DEFAULT_ID_FORMAT): { prefix: string; number: number } | null {
  if (typeof value !== 'string') return null
  const match = new RegExp(`^${idPatternSource(format)}$`).exec(value.trim())
  if (!match?.[1] || !match[2]) return null
  return { prefix: match[1], number: Number.parseInt(match[2], 10) }
}

/**
 * Canonical form of an ID for identity comparison. **It does not change with the
 * project** (`ADR-0011`): it is an internal key, and changing it would change the
 * identity of every item already registered. `ADR-001`, `ADR-0001` and `ADR001`
 * are the same thing.
 */
export function canonicalId(parsed: { prefix: string; number: number }): string {
  return `${parsed.prefix}-${String(parsed.number).padStart(CANONICAL_PADDING, '0')}`
}

/**
 * The only function that writes an ID (`RN-0024`). No check builds an ID by
 * concatenation: a format built by hand in two places diverges at the first
 * project that declares another form.
 */
export function writeId(prefix: string, number: number, format: IdFormat = DEFAULT_ID_FORMAT): string {
  return `${prefix}${format.separator}${String(number).padStart(format.padding, '0')}`
}
```

- [ ] **Step 4: Implement in `src/ids/citations.ts`**

Replace the `CITATION` constant and the signature of `findCitations`:

```typescript
import { DEFAULT_ID_FORMAT, idPatternSource } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

/**
 * The project's citation syntax (spec §8, `ADR-0011`): the written form declared
 * in `id-format`, with the pattern `<PREFIX>-<number>`.
 *
 * Derived from `idPatternSource` — one source, not two copies that ask to be
 * changed together. A match with an undeclared prefix (a reference to "ISO-8601",
 * for example) is harmless: `ci2-ids.ts` only resolves citations whose prefix is
 * in `known`, and the others are silently ignored.
 *
 * Global and without anchors on purpose: it scans free text looking for several
 * citations per line.
 */
export function citationPattern(format: IdFormat = DEFAULT_ID_FORMAT): RegExp {
  return new RegExp(`\\b${idPatternSource(format)}\\b`, 'g')
}

export function findCitations(source: string, format: IdFormat = DEFAULT_ID_FORMAT): Citation[] {
  const pattern = citationPattern(format)
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const citations: Citation[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    for (const match of line.matchAll(pattern)) {
      citations.push({ id: match[0], line: i + 1 })
    }
  }

  return citations
}
```

- [ ] **Step 5: Implement `id-format` in `src/config/ownership.ts`**

Add the import, the reading function, the interface field and the return line:

```typescript
import { DEFAULT_ID_FORMAT, PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

/**
 * The written form of this project's IDs (`ADR-0011`, `RN-0024`). Absent, it is
 * the toolkit's — and the default exists so that no already-installed repository
 * needs to declare anything.
 */
function parseIdFormat(raw: unknown): IdFormat {
  if (raw === undefined || raw === null) return DEFAULT_ID_FORMAT
  const item = asRecord(raw, 'id-format')

  const separator = item.separator ?? DEFAULT_ID_FORMAT.separator
  if (typeof separator !== 'string' || !SEPARATORS_ALLOWED.includes(separator)) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: id-format.separator "${String(separator)}" is not accepted. ` +
        `Valid: ${SEPARATORS_ALLOWED.map(value => `"${value}"`).join(', ')} (ADR-0011).`,
    )
  }

  const padding = item.padding ?? DEFAULT_ID_FORMAT.padding
  if (typeof padding !== 'number' || !Number.isInteger(padding) || padding < PADDING_RANGE.min || padding > PADDING_RANGE.max) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: id-format.padding "${String(padding)}" must be an integer between ` + `${PADDING_RANGE.min} and ${PADDING_RANGE.max} (ADR-0011).`,
    )
  }

  return { separator, padding }
}
```

In the `OwnershipConfig` interface, right after `staleAfterMonths`:

```typescript
/** The written form of this project's IDs (`ADR-0011`). Never the identity. */
idFormat: IdFormat
```

And in the object that `parseOwnership` returns, right after `staleAfterMonths`:

```typescript
    idFormat: parseIdFormat(root['id-format']),
```

- [ ] **Step 6: Write the configuration test and the citation test**

Add to `test/config/ownership.test.ts`:

```typescript
test('RN-0024: absent id-format is the toolkit\'s form', () => {
  const config = parseOwnership(MINIMO)
  assert.deepEqual(config.idFormat, { separator: '-', padding: 4 })
})

test('RN-0024: a declared id-format is read, and an invalid one is an error and not a silent default', () => {
  const config = parseOwnership(`${MINIMO}\nid-format:\n  separator: ""\n  padding: 3\n`)
  assert.deepEqual(config.idFormat, { separator: '', padding: 3 })

  assert.throws(() => parseOwnership(`${MINIMO}\nid-format:\n  separator: "~"\n`), /separator "~" is not accepted/)
  assert.throws(() => parseOwnership(`${MINIMO}\nid-format:\n  padding: 9\n`), /padding "9"/)
})
```

`MINIMO` is the minimal configuration the test file already uses; if it does not
exist as a constant, extract it from the ones already there — do not write a new
one.

Add to `test/ids/citations.test.ts`:

```typescript
test('RN-0024: findCitations recognizes the form declared by the project', () => {
  const texto = 'RN009 says so, and RN-0009 is not a citation in this project.'
  const achadas = findCitations(texto, { separator: '', padding: 3 }).map(c => c.id)
  assert.deepEqual(achadas, ['RN009'])
})

test('RN-0024: with no declared format, the scan is the usual one', () => {
  const achadas = findCitations('cites ADR-0001 and DA-007').map(c => c.id)
  assert.deepEqual(achadas, ['ADR-0001', 'DA-007'])
})
```

- [ ] **Step 7: Run everything and watch it pass**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Expected: all tests pass, including the ones that already existed — this task's
default is literally the previous behavior.

- [ ] **Step 8: CHANGELOG entry and commit**

`src/config/ownership.ts` is a consumer-visible path. Add under
`## [Unreleased]`, in the `### Added` subsection of `CHANGELOG.md`:

```markdown
- `id-format` in `docs/.ownership.yml`: a project declares how its IDs are written (`separator`, `padding`). Absent, the form remains `<PREFIX>-<4 digits>`.
```

```bash
git add src/docs/schema.ts src/ids/citations.ts src/config/ownership.ts \
        test/docs/schema.test.ts test/ids/citations.test.ts test/config/ownership.test.ts CHANGELOG.md
git commit -m "feat(RN-0024, ADR-0011): separates the written form of the ID from its identity"
```

---

### Task 4: The written form crosses parsers, checks and hooks

**Objective:** Wire `config.idFormat` into every place that reads or writes an ID,
and erase the three format leaks that remained: the section-heading regex, the ID
building in `CI-2` and the fix messages of `CI-1`. At the end of this task,
**no check builds an ID by concatenation** — acceptance criterion 2.

**Files:**

- Modify: `src/docs/sections.ts` (the `HEADING` is now derived from the format)
- Modify: `src/docs/table.ts` (`parseItemTable` receives the format)
- Modify: `src/docs/collect.ts` (passes `config.idFormat` on to both parsers)
- Modify: `src/ids/coverage.ts` (`scanCitations` receives the format)
- Modify: `src/checks/ci1-structure.ts` (`parseId` with format; fixes via `writeId`)
- Modify: `src/checks/ci2-ids.ts` (`key`, citations and the sequence-gap message)
- Modify: `src/checks/ci3-traceability.ts` (citations and canonicalization with format)
- Modify: `src/hooks/hk3-state-promotion.ts` (passes the format to the parsers)
- Modify: `src/hooks/hk7-shortcut-debt.ts` (the debt citation stops requiring a hyphen)
- Test: `test/docs/sections.test.ts`, `test/docs/table.test.ts` (cases with another form)
- Test: `test/checks/ci2-ids.test.ts` (the gap message uses the project's form)
- Test: `test/acceptance/id-format.test.ts` (new — the whole of acceptance criterion 2)

**Interfaces:**

- Consumes: `IdFormat`, `parseId`, `writeId`, `idPatternSource`,
  `findCitations`, `citationPattern`, `OwnershipConfig.idFormat` (Task 3).
- Produces:
  - `parseItemTable(source, startLine, format?)`
  - `parseItemSections(source, startLine, format?)`
  - `scanCitations(root, globs, format?)`
  - No other public signature changes.

**Requirements:**

- Every check reads the format from `context.config.idFormat`. No check receives
  `IdFormat` by another path, and none uses the implicit default: the default
  exists for the functions, not for the checks.
- `src/hooks/hk7-shortcut-debt.ts` **still does not read `.ownership.yml`**. It
  recognizes the debt citation in any written form (`/\bTDR-?\d{2,}\b/`), because a
  shortcut marker is language syntax and not a project path — the reason the file's
  comment already gives remains valid.
- `src/docs/sections.ts` builds the `HEADING` from `idPatternSource`, with the
  whole ID in an outer group. The group numbering becomes: 1 the ID, 2 the
  prefix, 3 the number, 4 the title.
- The sequence-gap message of `CI-2` goes through `writeId`. It is the only place
  in the toolkit that built an ID by hand, and it is the test of criterion 2.
- Behavior with the default form is **identical** to before. The tests that
  already exist are the net: none of them is edited to pass.

**`HK-5`:** will ask for `docs/requirements/rules.md` (`src/checks/**`,
`src/hooks/**`). The answer: `RN-0024` travelled in Task 2.

- [ ] **Step 1: Write the failing acceptance test**

Create `test/acceptance/id-format.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runValidate } from '../../src/cli/validate.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 1
id-format:
  separator: ""
  padding: 3
artifacts:
  - id-prefix: RN
    path: docs/rules.md
    owner: "@time"
    skill: requirements-keeper
    collection: sections
    cited-by: ["test/**"]
documents:
  - path: docs/.ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
`

const CODEOWNERS = 'docs/rules.md    @time\ndocs/.ownership.yml    @time\n'

function regras(ids: readonly string[]): string {
  return [
    '---',
    'title: Rules',
    'owner: "@time"',
    'trigger: On every new or changed rule.',
    'last-reviewed: 2026-08-28',
    '---',
    '',
    '# Rules',
    '',
    ...ids.flatMap(id => [`## ${id} — A rule`, '', '- **status:** active', '']),
  ].join('\n')
}

function arvore(ids: readonly string[]): Record<string, string> {
  return {
    [OWNERSHIP_PATH]: CONFIG,
    CODEOWNERS,
    'docs/rules.md': regras(ids),
    'test/regras.test.ts': ids.map(id => `// covers ${id}`).join('\n') + '\n',
  }
}

test('criterion 2: identity, duplicate, sequence and citation work in the project\'s form', () => {
  withTempRepo(arvore(['RN001', 'RN002', 'RN003']), root => {
    const result = runValidate(root)
    assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2))
  })
})

test('criterion 2: a duplicate is detected even when written with different padding', () => {
  withTempRepo(arvore(['RN001', 'RN01']), root => {
    const result = runValidate(root)
    const duplicata = result.findings.find(f => f.ruleId === 'CI-2' && /duplicate/.test(f.message))
    assert.ok(duplicata, JSON.stringify(result.findings, null, 2))
  })
})

test('criterion 2: the sequence gap is reported in the project\'s written form', () => {
  withTempRepo(arvore(['RN001', 'RN003']), root => {
    const result = runValidate(root)
    const buraco = result.findings.find(f => f.ruleId === 'CI-2' && /gap/.test(f.message))
    assert.ok(buraco, JSON.stringify(result.findings, null, 2))
    assert.match(buraco.message, /RN002/, 'the suggested ID must come in the project\'s form')
    assert.doesNotMatch(buraco.message, /RN-0002/, 'no check builds an ID by concatenation')
  })
})

test('criterion 2: a citation that does not resolve keeps failing in the project\'s form', () => {
  const arvoreComCitacao = arvore(['RN001'])
  arvoreComCitacao['docs/rules.md'] += '\nThe statement cites RN042, which does not exist.\n'

  withTempRepo(arvoreComCitacao, root => {
    const result = runValidate(root)
    const citacao = result.findings.find(f => f.ruleId === 'CI-2' && /RN042/.test(f.message))
    assert.ok(citacao, JSON.stringify(result.findings, null, 2))
  })
})

test('RN-0024: no check file builds an ID by concatenation', () => {
  const suspeito = /\$\{[A-Za-z.]*[Pp]refix\}[-_.:]?\$\{/
  for (const file of ['ci1-structure.ts', 'ci2-ids.ts', 'ci3-traceability.ts']) {
    const source = readFileSync(join(process.cwd(), 'src/checks', file), 'utf8')
    assert.doesNotMatch(source, suspeito, `${file} builds an ID by hand — use writeId (RN-0024)`)
  }
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="criterion 2"
```

Expected: FAILS — the `## RN001` headings are not recognized by the `HEADING` of
`src/docs/sections.ts`, so the document has no items at all.

- [ ] **Step 3: `src/docs/sections.ts` — the heading derives from the format**

Replace the `HEADING` constant with a function and adjust the group indices:

```typescript
import { DEFAULT_ID_FORMAT, idPatternSource, parseId } from './schema.ts'
import type { IdFormat } from './schema.ts'

/**
 * Groups: 1 is the whole ID, 2 the prefix, 3 the number, 4 the title.
 * The ID pattern comes from `idPatternSource` (`ADR-0011`) — a project that writes
 * `## RN001` is read without any file of theirs changing.
 */
function headingPattern(format: IdFormat): RegExp {
  return new RegExp(`^#{2,4}\\s+(${idPatternSource(format)})\\s*(?:[—–-]\\s*(.*))?$`)
}

export function parseItemSections(source: string, startLine: number, format: IdFormat = DEFAULT_ID_FORMAT): DocItem[] {
  const HEADING = headingPattern(format)
  // … the body stays the same, with two adjustments:
  //   const heading = HEADING.exec((lines[i] ?? '').trim());
  //   if (!heading?.[1] || !parseId(heading[1], format)) continue;
  //   … and the title becomes heading[4] instead of heading[2]:
  //   if (heading[4] !== undefined && heading[4].trim() !== '') fields.title = heading[4].trim();
}
```

Apply the three adjustments to the existing body; do not rewrite the whole
function. The inner `break` that tests `HEADING.test(line)` remains valid — it now
uses the project's pattern.

- [ ] **Step 4: `src/docs/table.ts` and `src/docs/collect.ts`**

In `src/docs/table.ts`:

```typescript
export function parseItemTable(source: string, startLine: number, format: IdFormat = DEFAULT_ID_FORMAT): DocItem[] {
  // … in the line loop, the only change:
  //   if (!parseId(id, format)) continue;
}
```

In `src/docs/collect.ts`, `parseItems` now receives the format:

```typescript
function parseItems(rule: ArtifactRule, source: string, body: string | null, bodyStart: number, format: IdFormat): DocItem[] {
  const text = body ?? source
  const start = body === null ? 1 : bodyStart
  if (rule.collection === 'table') return parseItemTable(text, start, format)
  if (rule.collection === 'sections') return parseItemSections(text, start, format)
  return []
}
```

`readDoc` gains a `format: IdFormat` parameter and passes it on; `collectArtifacts`
passes `config.idFormat`.

- [ ] **Step 5: `src/ids/coverage.ts`**

```typescript
export function scanCitations(root: string, globs: readonly string[], format: IdFormat = DEFAULT_ID_FORMAT): Map<string, CitationSite[]> {
  // … the only change: findCitations(content, format)
}
```

- [ ] **Step 6: The three checks**

`src/checks/ci1-structure.ts`:

```typescript
import { writeId } from '../docs/schema.ts'

// inside the check, where `parseId(data.id)` is today:
const format = context.config.idFormat
const parsed = parseId(data.id, format)

// and the two fixes that built the ID by hand:
;`Use ${writeId(doc.rule.idPrefix, 1, format)} (spec §8).``Rename to the territory of ${doc.rule.idPrefix} (e.g.: ${writeId(doc.rule.idPrefix, 1, format)}) ` +
  'or move the file to the owning artifact.'
```

`src/checks/ci2-ids.ts`:

```typescript
import { canonicalId, parseId, writeId } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';
function key(id: string, format: IdFormat): string {
  const parsed = parseId(id, format);
  return parsed ? canonicalId(parsed) : id;
}

// `collectDeclarations` receives the format and uses `parseId(id, format)`.
// In the body of the check:
const format = context.config.idFormat;
const retired = new Set([...loadRetiredIds(context.root)].map((id) => key(id, format)));
// … and the sequence-gap message:
const missing = writeId(prefix, n, format);
// … and the citations:
for (const citation of findCitations(doc.source, format)) {
  const parsed = parseId(citation.id, format);
  …
}
```

`src/checks/ci3-traceability.ts`: every `parseId(x)` becomes `parseId(x, format)`,
every `findCitations(x)` becomes `findCitations(x, format)`, and the call
`scanCitations(context.root, entry.rule.citedBy)` becomes
`scanCitations(context.root, entry.rule.citedBy, format)`, with
`const format = context.config.idFormat` at the top of `run`.

- [ ] **Step 7: The two hooks**

`src/hooks/hk3-state-promotion.ts` — keep the configuration to have the format:

```typescript
let config
try {
  config = loadOwnership(env.root)
} catch {
  return ALLOW // fail open
}
const rule = findArtifactRule(config, repoPath)
if (!rule) return ALLOW
// … and `findPromotion(current, next, rule, config.idFormat)`, which passes the
// format on to the two parsers.
```

`src/hooks/hk7-shortcut-debt.ts` — the debt citation stops requiring a hyphen:

```typescript
/**
 * Debt citation, in any written form (`ADR-0011`). This hook still does not read
 * `.ownership.yml`, on purpose: a shortcut marker is language syntax, not a
 * project path — and recognizing `TDR001` and `TDR-0001` requires no
 * configuration at all.
 */
const DEBT = /\bTDR-?\d{2,}\b/
```

- [ ] **Step 8: Run everything**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Expected: everything passes, including `test/acceptance/id-format.test.ts`. If any
old test broke, the change broke behavior in the default form — fix the code,
**not** the test.

- [ ] **Step 9: Commit**

```bash
git add src/docs/sections.ts src/docs/table.ts src/docs/collect.ts src/ids/coverage.ts \
        src/checks/ci1-structure.ts src/checks/ci2-ids.ts src/checks/ci3-traceability.ts \
        src/hooks/hk3-state-promotion.ts src/hooks/hk7-shortcut-debt.ts \
        test/acceptance/id-format.test.ts test/docs/sections.test.ts test/docs/table.test.ts \
        test/checks/ci2-ids.test.ts
git commit -m "feat(RN-0024, ADR-0011): parsers, checks and hooks read the project's written form

Changelog: none — behavior in the default form is identical; the new key has already been announced"
```

---

### Task 5: The inventory reports the detected form

**Objective:** `RF-0014` and acceptance criterion 1. `init` starts scanning the
paths it is going to adopt, reporting the written form it found and how many items
it read in it, and writing the `id-format` block into `.ownership.yml` from what
whoever installs declared. No file in the repository is changed in order to adopt
it.

**Files:**

- Create: `src/ids/detect.ts`
- Create: `test/ids/detect.test.ts`
- Modify: `src/cli/init.ts` (`InitOptions.idFormat`, `InitResult.detected`)
- Modify: `src/cli/index.ts` (`--id-separator`, `--id-padding`, the report line)
- Modify: `templates/ownership.yml` (`id-format` block)
- Modify: `plugin/skills/living-docs-bootstrap/SKILL.md` (step 1 and checklist)
- Modify: `test/cli/init.test.ts` (the new `InitOptions`)
- Modify: `test/acceptance/spec-criteria.test.ts` (criterion 1 gains the form half)

**Interfaces:**

- Consumes: `IdFormat`, `DEFAULT_ID_FORMAT` (Task 3); `listFiles`, `readTextFile`.
- Produces:
  - `detectIdFormat(root, paths): DetectedFormat | null`
  - `DetectedFormat { format: IdFormat; count: number; sample: string }`
  - `InitOptions.idFormat: IdFormat`
  - `InitResult.detected: DetectedFormat | null`

**Requirements:**

- The scan is **permissive on purpose**: it looks for `<2 to 4 capitals>`,
  optional separator, `2 to 6 digits` — because the question is "which form does
  this repository use?", and a detector that already knew the answer would detect
  nothing.
- The scan looks only at the paths `init` resolved (adopted or default), not at
  the whole repository. Detecting a format in `node_modules` is noise.
- `detectIdFormat` returns the **dominant** form and how many items it read in it.
  A tie is resolved by the first in order of appearance — and the report brings
  the example, which is what a person uses to decide.
- `init` reports when the detected form differs from the declared one. Equal, it
  stays quiet: there is nothing to confirm.
- `init` does **not** convert or rewrite anything. `RF-0014` out of scope.
- `--id-separator ""` is a valid value, not an absent flag.

**`HK-5`:** will ask for `docs/requirements/functional.md` (`src/cli/**`) and
`CHANGELOG.md` (`src/cli/**`, `templates/**`, `plugin/**` are consumer-visible).
The answer: `RF-0014` travelled in Task 2; the CHANGELOG goes in Step 7.

- [ ] **Step 1: Write the failing test — detection**

Create `test/ids/detect.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectIdFormat } from '../../src/ids/detect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const SEM_HIFEN = [
  '# Rules',
  '',
  '## RN001 — A rule',
  '- **status:** active',
  '',
  '## RN002 — Another',
  '- **status:** active',
  '',
  '## RN003 — Yet another',
  '- **status:** active',
  '',
].join('\n')

test('RF-0014: the scan reports the dominant form and how many items it read in it', () => {
  withTempRepo({ 'docs/business-rules.md': SEM_HIFEN }, root => {
    const detected = detectIdFormat(root, ['docs/business-rules.md'])
    assert.ok(detected)
    assert.deepEqual(detected.format, { separator: '', padding: 3 })
    assert.equal(detected.count, 3)
    assert.equal(detected.sample, 'RN001')
  })
})

test('RF-0014: a repository with no ID at all does not invent a form', () => {
  withTempRepo({ 'docs/vazio.md': '# nothing here\n' }, root => {
    assert.equal(detectIdFormat(root, ['docs/vazio.md']), null)
  })
})

test('RF-0014: the default form is detected as the default', () => {
  withTempRepo({ 'docs/adr/ADR-0001-x.md': '---\nid: ADR-0001\n---\n\n# ADR-0001\n' }, root => {
    const detected = detectIdFormat(root, ['docs/adr/'])
    assert.ok(detected)
    assert.deepEqual(detected.format, { separator: '-', padding: 4 })
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0014"
```

Expected: FAILS — `Cannot find module '../../src/ids/detect.ts'`.

- [ ] **Step 3: Implement `src/ids/detect.ts`**

```typescript
import { listFiles, readTextFile } from '../core/files.ts'
import { PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

export interface DetectedFormat {
  format: IdFormat
  /** How many occurrences were read in this form. */
  count: number
  /** A real occurrence, so that whoever installs recognizes what the toolkit saw. */
  sample: string
}

/**
 * A deliberately permissive scan: prefix of 2 to 4 capitals, optional
 * single-character separator, 2 to 6 digits. The question is "which form does this
 * repository use?", and a detector that already knew the answer would detect
 * nothing (`RF-0014`).
 */
const ANY_ID = /\b([A-Z]{2,4})([-_.:]?)(\d{2,6})\b/g

function keyOf(separator: string, digits: number): string {
  return `${separator}|${digits}`
}

/**
 * The dominant written form in the given paths, or `null` when there is no ID at
 * all. Only the paths that `init` resolved enter: detecting a format across the
 * whole repository is noise, not inventory.
 */
export function detectIdFormat(root: string, paths: readonly string[]): DetectedFormat | null {
  const globs = paths.map(path => (path.endsWith('/') ? `${path}**` : path))
  const tallies = new Map<string, { format: IdFormat; count: number; sample: string }>()

  for (const file of listFiles(root, globs)) {
    const content = readTextFile(root, file)
    if (content === null) continue

    for (const match of content.matchAll(ANY_ID)) {
      const separator = match[2] ?? ''
      const digits = (match[3] ?? '').length
      if (!SEPARATORS_ALLOWED.includes(separator)) continue
      if (digits < PADDING_RANGE.min || digits > PADDING_RANGE.max) continue

      const key = keyOf(separator, digits)
      const tally = tallies.get(key)
      if (tally) {
        tally.count += 1
        continue
      }
      tallies.set(key, {
        format: { separator, padding: digits },
        count: 1,
        sample: match[0],
      })
    }
  }

  let winner: DetectedFormat | null = null
  for (const tally of tallies.values()) {
    if (winner === null || tally.count > winner.count) winner = tally
  }
  return winner
}
```

- [ ] **Step 4: Wire it into `init`**

In `src/cli/init.ts`:

```typescript
import { detectIdFormat } from '../ids/detect.ts'
import type { DetectedFormat } from '../ids/detect.ts'
import { DEFAULT_ID_FORMAT } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

export interface InitOptions {
  owner: string
  dryRun: boolean
  stage: Stage
  /** The written form declared by whoever installs (`ADR-0011`). */
  idFormat: IdFormat
}

export interface InitResult {
  // … the fields that already exist
  /** The written form the inventory found, when it differs from the declared one (`RF-0014`). */
  detected: DetectedFormat | null
}
```

Inside `runInit`, after resolving `paths` and before writing any file:

```typescript
// Report, never adopt in silence (`RF-0014`): silent adoption of a format
// is the same class of error as silent adoption of a path.
const detected = detectIdFormat(root, Object.values(paths))
result.detected =
  detected !== null && (detected.format.separator !== options.idFormat.separator || detected.format.padding !== options.idFormat.padding) ? detected : null
```

And in the template `values`:

```typescript
    ID_SEPARATOR: options.idFormat.separator,
    ID_PADDING: String(options.idFormat.padding),
```

- [ ] **Step 5: The block in the template and the flags in the CLI**

In `templates/ownership.yml`, right after `stale-after-months: 6`:
```yaml
# The written form of an ID in this project (ADR-0011). The identity does NOT
# depend on it: `RN009` and `RN-0009` are the same item. Change this to adopt a
# repository whose IDs are already written another way — never renumber the
# repository to fit the default.
id-format:
  separator: '{{ID_SEPARATOR}}'
  padding: { { ID_PADDING } }
```

In `src/cli/index.ts`, in the reading of the `init` options:

```typescript
const separatorIndex = argv.indexOf('--id-separator')
const separator = separatorIndex === -1 ? DEFAULT_ID_FORMAT.separator : (argv[separatorIndex + 1] ?? '')
const paddingIndex = argv.indexOf('--id-padding')
const padding = paddingIndex === -1 ? DEFAULT_ID_FORMAT.padding : Number.parseInt(argv[paddingIndex + 1] ?? '', 10)
if (!SEPARATORS_ALLOWED.includes(separator) || !Number.isInteger(padding)) {
  process.stderr.write(
    `living-docs: invalid ID form. --id-separator accepts ${SEPARATORS_ALLOWED.map(s => `"${s}"`).join(', ')} ` +
      `and --id-padding an integer between ${PADDING_RANGE.min} and ${PADDING_RANGE.max} (ADR-0011).\n`,
  )
  return 2
}
```

And, in the output, after the `adopted` lines:

```typescript
if (result.detected !== null) {
  const { format, count, sample } = result.detected
  process.stdout.write(
    `format    ${sample}  (${count} occurrence(s) in this form) — the repository writes IDs another way.\n` +
      `          To adopt it: --id-separator "${format.separator}" --id-padding ${format.padding}. ` +
      'No file was changed (RF-0014).\n',
  )
}
```

Add the two options to the `USAGE` text:

```
  --id-separator <s>  ID separator: "-" (default), "_", ".", ":" or "" (empty)
  --id-padding <n>    ID digits: 4 (default), between 2 and 6
```

- [ ] **Step 6: The criterion 1 test**

Add to `test/acceptance/spec-criteria.test.ts` (and update the file's `OPTIONS`
constant to include `idFormat: DEFAULT_ID_FORMAT`):

```typescript
test('criterion 1 (closing): the inventory reports the detected form and touches no file', () => {
  const preexistente = [
    '---',
    'title: Rules',
    'owner: "@time"',
    'trigger: On every new or changed rule.',
    'last-reviewed: 2026-08-28',
    '---',
    '',
    '## RN001 — A rule',
    '- **status:** active',
    '',
    '## RN002 — Another',
    '- **status:** active',
    '',
  ].join('\n')

  withTempRepo({ 'docs/business-rules.md': preexistente }, root => {
    const antes = readFileSync(join(root, 'docs/business-rules.md'), 'utf8')

    const result = runInit(root, {
      ...OPTIONS,
      stage: 'small-team',
      dryRun: true,
    })

    assert.ok(result.adopted.some(entry => entry.path === 'docs/business-rules.md'))
    assert.ok(result.detected, 'the detected form must be reported')
    assert.deepEqual(result.detected.format, { separator: '', padding: 3 })
    assert.ok(result.detected.count >= 2)
    assert.equal(readFileSync(join(root, 'docs/business-rules.md'), 'utf8'), antes)
  })
})
```

- [ ] **Step 7: `SK-0` stops adopting a format in silence**

In `plugin/skills/living-docs-bootstrap/SKILL.md`, in step 1, after the sentence
about the `adopted` lines, add:

```markdown
Also read the `format` line: when the repository writes IDs another way
(`RN001` instead of `RN-0009`), the inventory says which form it found and
how many occurrences it read in it. **Confirm with whoever owns the repository** and
declare it with `--id-separator` and `--id-padding` — never renumber what already
exists to fit the toolkit's default (`ADR-0011`, `RF-0014`).
```

And in the checklist, after the `ids-retired.txt` line:

```markdown
- [ ] The written form of the IDs was confirmed with whoever owns the repository, and no pre-existing ID was rewritten — verification: human
```

- [ ] **Step 8: Run, note the CHANGELOG and commit**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

In `CHANGELOG.md`, under `### Added`:

```markdown
- `living-docs init --id-separator <s> --id-padding <n>`: declares the written form of the project's IDs. `--dry-run` reports the form the repository already uses, without changing any file.
```

```bash
git add src/ids/detect.ts test/ids/detect.test.ts src/cli/init.ts src/cli/index.ts \
        templates/ownership.yml plugin/skills/living-docs-bootstrap/SKILL.md \
        test/cli/init.test.ts test/acceptance/spec-criteria.test.ts CHANGELOG.md
git commit -m "feat(RF-0014, ADR-0011): the inventory reports the written form of the IDs"
```

---

### Task 6: The installed CI workflow, and the enforcement enters `watches`

**Objective:** `L-1` half 1 and `L-9`. `init` starts writing a CI workflow
parameterized by invocation mode — without imposing Docker on whoever installs —,
and this repository's enforcement gets a watched owning doc and counts as
visible to whoever consumes, because it is literally what the consumer installs.

**Files:**

- Create: `templates/workflow.yml`
- Create: `test/cli/init-enforcement.test.ts`
- Modify: `src/cli/init.ts` (`STAGE_PHASES`, `InitOptions.invoke`, workflow writing)
- Modify: `src/cli/index.ts` (`--invoke`, `USAGE`)
- Modify: `docs/.ownership.yml` (two `watches` rules and one `consumer-visible-paths`)
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `writeIfAbsent`, `template`, `InitResult` (Task 5).
- Produces:
  - `WORKFLOW_PATH = '.github/workflows/living-docs.yml'`
  - `STAGE_PHASES: Readonly<Record<Stage, readonly number[]>>`
  - `InitOptions.invoke: string`

**Requirements:**

- **The installed workflow does not mention Docker.** `RNF-0002` is a rule of this
  toolkit, not of whoever uses it. The command comes from `--invoke` and the
  default is `npx living-docs`.
- The template cites `DA-0003` in the header: how the toolkit reaches the
  consumer's CI is an open decision, and that is why the invocation mode is a
  parameter.
- Merge: the file is only written if it **does not exist**. A consumer with
  workflows of their own keeps all of them — the toolkit adds a file, never
  rewrites the ones that are there. Running twice reports `kept`.
- The steps are those of the stage's phases (`RN-0025`, `ADR-0012`): `validate`
  always; `drift` and `changelog --base` from `production` on. The
  `validate --base` step arrives in Task 8, with the stage that asks for it.
- `.github/workflows/**` enters `watches` **and** `consumer-visible-paths`. The two
  lists must remain identical — `test/docs/release-history.test.ts` fails if they
  drift apart.

**`HK-5`:** will ask for `docs/requirements/functional.md` (`src/cli/**`),
`CHANGELOG.md` (`src/cli/**`, `templates/**`) and, from this task on,
`docs/definition-of-done.md` for whoever touches `.github/workflows/**`. The answer:
`RF-0013` travelled in Task 2 and the CHANGELOG goes in Step 8.

- [ ] **Step 1: Write the failing test**

Create `test/cli/init-enforcement.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInit } from '../../src/cli/init.ts'
import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OPTIONS = {
  owner: '@time',
  dryRun: false,
  stage: 'production' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
}

const WORKFLOW = '.github/workflows/living-docs.yml'

test('RF-0013: init writes the stage\'s CI workflow', () => {
  withTempRepo({}, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.created.includes(WORKFLOW), JSON.stringify(result.created, null, 2))
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')
    assert.match(yaml, /npx living-docs validate/)
    assert.match(yaml, /npx living-docs drift/)
    assert.match(yaml, /npx living-docs changelog --base/)
  })
})

test('RF-0013: the installed workflow does not impose Docker on whoever installs', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')
    assert.doesNotMatch(yaml, /docker/i, 'RNF-0002 is a rule of this toolkit, not of the consumer')
  })
})

test('RN-0025: the solo stage installs validate and nothing else', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, stage: 'solo' })
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')
    assert.match(yaml, /living-docs validate/)
    assert.doesNotMatch(yaml, /living-docs drift/)
    assert.doesNotMatch(yaml, /living-docs changelog/)
  })
})

test('RF-0013: a pre-existing workflow is kept, and running twice does not duplicate', () => {
  const meu = 'name: meu-ci\non:\n  push:\n'
  withTempRepo({ '.github/workflows/ci.yml': meu }, root => {
    runInit(root, OPTIONS)
    assert.equal(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), meu)

    const depois = readFileSync(join(root, WORKFLOW), 'utf8')
    const segunda = runInit(root, OPTIONS)
    assert.ok(segunda.skipped.includes(WORKFLOW))
    assert.equal(readFileSync(join(root, WORKFLOW), 'utf8'), depois)
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0013"
```

Expected: FAILS — `init` does not know `invoke` and writes no workflow at all.

- [ ] **Step 3: Write `templates/workflow.yml`**

```yaml
# Living documentation enforcement, installed by `living-docs init`.
#
# The invocation mode is a parameter of whoever installs (`--invoke`): the toolkit
# runs in a container in its own repository, and imposing that on whoever installs
# it would turn a toolkit rule into a consumer rule. How the toolkit reaches this
# CI is an open decision — `DA-0003` in the toolkit repository.
#
# This file is yours: `init` only creates it when it does not exist, and never
# rewrites it.
name: living-docs

on:
  push:
  pull_request:

jobs:
  living-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          # The PR diff compares <base>...HEAD, and a shallow clone does not have the base.
          fetch-depth: 0

      - name: CI-1 to CI-4, CI-7 and CI-8 — state of the tree
        run: {{INVOKE}} validate
{{WORKFLOW_STEPS}}
```

- [ ] **Step 4: Implement in `init`**

In `src/cli/init.ts`:

```typescript
/** Where the installed workflow lives in the repository of whoever installs. */
export const WORKFLOW_PATH = '.github/workflows/living-docs.yml'

/**
 * The spec §10 phases that each stage installs. The stage's set of enforcement
 * comes from here — no more, no less (`RN-0025`, `ADR-0012`).
 */
const STAGE_PHASES: Readonly<Record<Stage, readonly number[]>> = Object.freeze({
  solo: [0, 1],
  'small-team': [0, 1, 2, 3, 4],
  production: [0, 1, 2, 3, 4, 5, 6],
})

/**
 * The steps this stage adds to `validate`, which every stage runs.
 * Each step exists because a phase of the stage installed the check it calls.
 */
function workflowSteps(stage: Stage, invoke: string): string {
  const phases = STAGE_PHASES[stage]
  const steps: string[] = []

  if (phases.includes(5)) {
    steps.push(['', '      - name: CI-5 — generated contract drift', `        run: ${invoke} drift`].join('\n'))
  }
  if (phases.includes(6)) {
    steps.push(
      [
        '',
        '      - name: CI-6 — CHANGELOG entry',
        "        if: github.event_name == 'pull_request'",
        `        run: ${invoke} changelog --base \${{ github.event.pull_request.base.sha }}`,
      ].join('\n'),
    )
  }

  return steps.length === 0 ? '' : `${steps.join('\n')}\n`
}
```

`InitOptions` gains `invoke: string`. In the `values`:

```typescript
    INVOKE: options.invoke,
    WORKFLOW_STEPS: workflowSteps(options.stage, options.invoke),
```

And, at the end of `runInit`, before `declareDocuments`:

```typescript
// The stage's enforcement (`RF-0013`). Merge, never overwrite: the workflow
// that already exists belongs to whoever wrote it.
writeIfAbsent(root, WORKFLOW_PATH, template('workflow.yml', values), options, result)
```

- [ ] **Step 5: The `--invoke` flag in the CLI**

In `src/cli/index.ts`, alongside the other `init` options:

```typescript
const invokeIndex = argv.indexOf('--invoke')
const invoke = invokeIndex === -1 ? 'npx living-docs' : (argv[invokeIndex + 1] ?? '')
if (invoke.trim() === '') {
  process.stderr.write('living-docs: `--invoke` needs the command that runs the CLI in your CI — it cannot be guessed (DA-0003).\n')
  return 2
}
```

And in `USAGE`:

```
  --invoke <command>  How the CLI is called in the CI of whoever installs (default: npx living-docs)
```

- [ ] **Step 6: This repository's enforcement enters `watches`**

In `docs/.ownership.yml`, add to the `watches:` block (the two rules together,
after the `plugin/skills/**` rule):

```yaml
- code: '.github/workflows/**'
  doc: docs/definition-of-done.md
  reason: "the last line of the Definition of Done names what the workflow runs — changing the workflow changes what 'done' means"

- code: '.github/workflows/**'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'the enforcement is literally what the consumer installs'
```

And in `consumer-visible-paths:`, at the end of the list:

```yaml
- '.github/workflows/**'
```

The two lists must remain identical: `test/docs/release-history.test.ts`
compares the `code` of the rules with `consumer-visible: true` against
`consumer-visible-paths` and fails if they drift apart.

- [ ] **Step 7: Run everything**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Expected: everything passes. `test/cli/init.test.ts` needs the `invoke` field in
the options — add it to the file's options constant, changing nothing else.

- [ ] **Step 8: CHANGELOG and commit**

Under `### Added` of `CHANGELOG.md`:

```markdown
- `living-docs init` starts installing the stage's CI workflow at `.github/workflows/living-docs.yml`, with the invocation command coming from `--invoke` (default `npx living-docs`). The installed workflow does not mention Docker, and a workflow that already exists is kept.
```

```bash
git add templates/workflow.yml src/cli/init.ts src/cli/index.ts \
        test/cli/init-enforcement.test.ts test/cli/init.test.ts docs/.ownership.yml CHANGELOG.md
git commit -m "feat(RF-0013, RN-0025): init installs the stage workflow and the enforcement enters watches"
```

---

### Task 7: The plugin registration and the marketplace manifest

**Objective:** `L-2`. The plugin gets an installation path: a marketplace manifest
at the toolkit root, and the entry in the consumer's `.claude/settings.json` that
turns the hooks on in the session — installed by merge, without losing any hook of
whoever already had their own.

**Files:**

- Create: `.claude-plugin/marketplace.json`
- Create: `src/config/claude-settings.ts`
- Create: `test/config/claude-settings.test.ts`
- Modify: `src/cli/init.ts` (writes the registration)
- Modify: `src/cli/index.ts` (`--marketplace`, `USAGE`)
- Modify: `test/plugin/manifest.test.ts` (the marketplace manifest)
- Modify: `test/cli/init-enforcement.test.ts` (criteria 3 and 4)
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `InitOptions`, `InitResult` (Task 6).
- Produces:
  - `SETTINGS_PATH = '.claude/settings.json'`
  - `MARKETPLACE_NAME = 'living-docs'`, `PLUGIN_REF = 'living-docs@living-docs'`
  - `mergeSettings(current: string | null, marketplace: string): { text: string; added: string[] }`
  - `SettingsError`
  - `InitOptions.marketplace: string | null`

**Requirements:**

- **Merge, never overwrite.** A key that already exists stays as it is — including
  a `living-docs` entry that the consumer wrote by hand. Only what is missing is
  added.
- Running twice produces **the same file, byte for byte**. It is the idempotence of
  `SK-0` holding for enforcement.
- An unreadable `.claude/settings.json` (invalid JSON) **is not overwritten**: it
  becomes a line in `notInstalled` saying what is left to declare. An installer that
  fixes someone else's configuration file erases someone's work.
- Without `--marketplace <owner/repo>`, the registration **is not written**: the
  source cannot be guessed (`DA-0003`), and the absence becomes a line in
  `notInstalled`. Same policy as `watches` and `generated[]` — `init` does not
  invent.
- The marketplace manifest and `plugin.json` declare the **same version**. Two
  versions is the guarantee that one of them is wrong.

**`HK-5`:** will ask for `CHANGELOG.md` (`plugin/**` and `src/cli/**` are
consumer-visible) and `docs/requirements/functional.md`. The answer: `RF-0013`
travelled in Task 2; the CHANGELOG goes in Step 7.

- [ ] **Step 1: Write the failing test — the merge**

Create `test/config/claude-settings.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SettingsError, mergeSettings } from '../../src/config/claude-settings.ts'

test('RF-0013: without settings, the registration is born with the marketplace and the plugin', () => {
  const { text, added } = mergeSettings(null, 'time/living-docs')
  const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>

  assert.deepEqual(parsed.extraKnownMarketplaces?.['living-docs'], {
    source: { source: 'github', repo: 'time/living-docs' },
  })
  assert.equal(parsed.enabledPlugins?.['living-docs@living-docs'], true)
  assert.equal(added.length, 2)
  assert.ok(text.endsWith('\n'))
})

test('RF-0013: what the consumer already had is still there', () => {
  const meu = JSON.stringify(
    {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Edit',
            hooks: [{ type: 'command', command: './my-hook.sh' }],
          },
        ],
      },
      enabledPlugins: { 'other@store': true },
    },
    null,
    2,
  )

  const { text } = mergeSettings(meu, 'time/living-docs')
  const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>

  assert.ok(parsed.hooks, 'no hook of the consumer is lost')
  assert.equal(parsed.enabledPlugins?.['other@store'], true)
  assert.equal(parsed.enabledPlugins?.['living-docs@living-docs'], true)
})

test('RF-0013: merging twice does not duplicate and does not change a byte', () => {
  const primeira = mergeSettings(null, 'time/living-docs')
  const segunda = mergeSettings(primeira.text, 'time/living-docs')

  assert.equal(segunda.text, primeira.text)
  assert.deepEqual(segunda.added, [])
})

test('RF-0013: an entry the consumer wrote by hand is not rewritten', () => {
  const meu = JSON.stringify(
    {
      extraKnownMarketplaces: {
        'living-docs': {
          source: { source: 'git', url: 'file:///opt/toolkit' },
        },
      },
    },
    null,
    2,
  )

  const { text, added } = mergeSettings(meu, 'time/living-docs')
  const parsed = JSON.parse(text) as Record<string, Record<string, Record<string, unknown>>>

  assert.deepEqual(parsed.extraKnownMarketplaces?.['living-docs']?.source, {
    source: 'git',
    url: 'file:///opt/toolkit',
  })
  assert.deepEqual(added, ['enabledPlugins["living-docs@living-docs"]'])
})

test('RF-0013: unreadable settings are an error, never an overwrite', () => {
  assert.throws(() => mergeSettings('{ this is not json', 'time/living-docs'), SettingsError)
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0013"
```

Expected: FAILS — `Cannot find module '../../src/config/claude-settings.ts'`.

- [ ] **Step 3: Implement `src/config/claude-settings.ts`**

```typescript
/**
 * The plugin registration in the repository of whoever installs (`RF-0013`).
 *
 * Merge, never overwrite: a consumer with hooks of their own and other plugins
 * keeps everything they have, and the toolkit adds only what is missing. It is the
 * same rule `init` already practices with CODEOWNERS — and it is step 1 of `SK-0`
 * ("never create a parallel one") seen from the enforcement side.
 */
export const SETTINGS_PATH = '.claude/settings.json'
export const MARKETPLACE_NAME = 'living-docs'
export const PLUGIN_REF = 'living-docs@living-docs'

export class SettingsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SettingsError'
  }
}

type Json = Record<string, unknown>

function objectAt(root: Json, key: string): Json {
  const value = root[key]
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value as Json
  const created: Json = {}
  root[key] = created
  return created
}

/**
 * The `.claude/settings.json` with the plugin registration added.
 *
 * `added` lists what went in — empty means "everything was already there", and it
 * is what makes the second execution quiet instead of lying.
 */
export function mergeSettings(current: string | null, marketplace: string): { text: string; added: string[] } {
  let root: Json = {}
  if (current !== null && current.trim() !== '') {
    let parsed: unknown
    try {
      parsed = JSON.parse(current)
    } catch (err) {
      throw new SettingsError(`${SETTINGS_PATH}: invalid JSON — ${err instanceof Error ? err.message : String(err)}`)
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new SettingsError(`${SETTINGS_PATH}: the content is not a JSON object.`)
    }
    root = parsed as Json
  }

  const added: string[] = []

  const marketplaces = objectAt(root, 'extraKnownMarketplaces')
  if (marketplaces[MARKETPLACE_NAME] === undefined) {
    marketplaces[MARKETPLACE_NAME] = {
      source: { source: 'github', repo: marketplace },
    }
    added.push(`extraKnownMarketplaces["${MARKETPLACE_NAME}"]`)
  }

  const plugins = objectAt(root, 'enabledPlugins')
  if (plugins[PLUGIN_REF] === undefined) {
    plugins[PLUGIN_REF] = true
    added.push(`enabledPlugins["${PLUGIN_REF}"]`)
  }

  return { text: `${JSON.stringify(root, null, 2)}\n`, added }
}
```

- [ ] **Step 4: The marketplace manifest**

Create `.claude-plugin/marketplace.json` at the toolkit root:

```json
{
  "name": "living-docs",
  "description": "Living documentation toolkit: ADRs, open decisions, recorded debt, requirements with stable IDs, generated contract and the enforcement that keeps them alive.",
  "owner": {
    "name": "Dan Ruan",
    "email": "danrsaquetti@gmail.com"
  },
  "plugins": [
    {
      "name": "living-docs",
      "description": "Seven skills that own artifacts, two agents, eight hooks and seven commands — the session side of the living documentation toolkit.",
      "version": "0.1.0",
      "source": "./plugin"
    }
  ]
}
```

Add to `test/plugin/manifest.test.ts`:

```typescript
test('the marketplace manifest points to this repository\'s plugin', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json')
  const plugins = marketplace.plugins as {
    name: string
    source: string
    version: string
  }[]

  assert.equal(marketplace.name, 'living-docs')
  assert.equal(plugins.length, 1)
  assert.equal(plugins[0]?.name, 'living-docs')
  assert.equal(plugins[0]?.source, './plugin')
  assert.ok(existsSync(join(ROOT, 'plugin/.claude-plugin/plugin.json')), 'the source must have a manifest')

  const plugin = readJson('plugin/.claude-plugin/plugin.json')
  assert.equal(plugins[0]?.version, plugin.version, 'two versions is the guarantee that one is wrong')
})
```

- [ ] **Step 5: Wire it into `init`**

In `src/cli/init.ts`:

```typescript
import { SETTINGS_PATH, SettingsError, mergeSettings } from '../config/claude-settings.ts'
```

`InitOptions` gains `marketplace: string | null`. And, right after writing the
workflow:

```typescript
declarePlugin(root, options, result)
```

with:

```typescript
/**
 * The registration that turns the hooks on in the session (`RF-0013`).
 *
 * Without `--marketplace`, nothing is written: the marketplace source cannot be
 * guessed (`DA-0003`), and init does not invent — same policy as `watches` and
 * `generated[]`. Unreadable settings are not touched either: fixing someone
 * else's configuration erases someone's work.
 */
function declarePlugin(root: string, options: InitOptions, result: InitResult): void {
  if (options.marketplace === null) {
    result.notInstalled.push(
      `plugin registration in ${SETTINGS_PATH} — without \`--marketplace <owner/repo>\` the source cannot be ` +
        'guessed (`DA-0003`); the hooks do not come up in the session until it is declared',
    )
    return
  }

  const file = join(root, SETTINGS_PATH)
  const current = existsSync(file) ? readFileSync(file, 'utf8') : null

  let merged
  try {
    merged = mergeSettings(current, options.marketplace)
  } catch (err) {
    result.notInstalled.push(
      `plugin registration in ${SETTINGS_PATH} — ${err instanceof SettingsError ? err.message : String(err)}; ` +
        'declare it by hand so as not to lose what is already there',
    )
    return
  }

  if (merged.added.length === 0) {
    result.skipped.push(SETTINGS_PATH)
    return
  }

  result.created.push(`${SETTINGS_PATH} (${merged.added.join(', ')})`)
  if (options.dryRun) return
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, merged.text, 'utf8')
}
```

In `src/cli/index.ts`:

```typescript
const marketplaceIndex = argv.indexOf('--marketplace')
const marketplace = marketplaceIndex === -1 ? null : (argv[marketplaceIndex + 1] ?? '')
if (marketplace !== null && !/^[\w.-]+\/[\w.-]+$/.test(marketplace)) {
  process.stderr.write('living-docs: `--marketplace` takes `<owner>/<repo>` — e.g.: time/living-docs.\n')
  return 2
}
```

And in `USAGE`:

```
  --marketplace <o/r>  Repository of the plugin marketplace; without it the hooks are not registered
```

- [ ] **Step 6: The tests of criteria 3 and 4**

Add to `test/cli/init-enforcement.test.ts` (and pass
`marketplace: 'time/living-docs'` in the `OPTIONS` constant):

```typescript
test('criterion 3: without enforcement, init leaves the workflow and the plugin registration — and running again does not duplicate', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)

    assert.ok(existsSync(join(root, WORKFLOW)))
    const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<string, Record<string, unknown>>
    assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true)

    const antes = readFileSync(join(root, '.claude/settings.json'), 'utf8')
    const segunda = runInit(root, OPTIONS)
    assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), antes)
    assert.ok(segunda.skipped.includes('.claude/settings.json'))
  })
})

test('criterion 4: the consumer\'s own hooks and workflows are still there, and the toolkit\'s was added', () => {
  const meusHooks = JSON.stringify(
    {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write',
            hooks: [{ type: 'command', command: './format.sh' }],
          },
        ],
      },
    },
    null,
    2,
  )

  withTempRepo(
    {
      '.claude/settings.json': meusHooks,
      '.github/workflows/ci.yml': 'name: my-ci\non:\n  push:\n',
    },
    root => {
      runInit(root, OPTIONS)

      const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<string, Record<string, unknown>>
      assert.ok(settings.hooks, 'no hook of the consumer may be lost')
      assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true)
      assert.match(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), /my-ci/)
      assert.ok(existsSync(join(root, WORKFLOW)))
    },
  )
})

test('RF-0013: without --marketplace, the registration is not invented — it is reported', () => {
  withTempRepo({}, root => {
    const result = runInit(root, { ...OPTIONS, marketplace: null })
    assert.equal(existsSync(join(root, '.claude/settings.json')), false)
    assert.ok(result.notInstalled.some(linha => linha.includes('DA-0003')))
  })
})
```

- [ ] **Step 7: Run, note the CHANGELOG and commit**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Under `### Added` of `CHANGELOG.md`:

```markdown
- `.claude-plugin/marketplace.json`: the `living-docs` plugin gains an installation path.
- `living-docs init --marketplace <owner/repo>` registers the plugin in the repository's `.claude/settings.json`, by merge — hooks and plugins that were already there are preserved. Without the option, the registration is not written and `init` says what was left out.
```

```bash
git add .claude-plugin/marketplace.json src/config/claude-settings.ts src/cli/init.ts src/cli/index.ts \
        test/config/claude-settings.test.ts test/plugin/manifest.test.ts test/cli/init-enforcement.test.ts CHANGELOG.md
git commit -m "feat(RF-0013, DA-0003): the plugin gains a marketplace manifest and registration by merge"
```

---

### Task 8: `--stage multi-team` and the per-phase set

**Objective:** `L-7`. The stage that `SK-0` says to choose and that the CLI used to
reject comes to exist — and exists because it now has enforcement behind it: it is
the stage that installs Phase 7, with the half of `CI-7` that reads the diff.

**Files:**

- Modify: `src/cli/init.ts` (`STAGES`, `STAGE_PHASES`, `NOT_INSTALLED`, `workflowSteps`, the stage tests)
- Modify: `src/cli/index.ts` (`USAGE`)
- Modify: `plugin/skills/living-docs-bootstrap/SKILL.md` (step 2 and the ownership table)
- Modify: `test/cli/init-enforcement.test.ts` (criterion 5)
- Modify: `test/plugin/authoring.test.ts` (`SK-0` names a stage that exists)
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `STAGE_PHASES`, `workflowSteps` (Task 6).
- Produces: `Stage` now includes `'multi-team'`.

**Requirements:**

- `multi-team` installs **the same artifacts** as `production` and **one more
  enforcement step**: `validate --base`, which is the half of `CI-7` that reads the
  diff. That is what stops it from being a label without content.
- Every stage test that today compares with the string `'production'` now
  asks the phases (`STAGE_PHASES[stage].includes(5)` for contracts,
  `includes(6)` for the historical trail). Without that, `multi-team` would install
  **less** artifacts than `production`, which is the opposite of what the stage
  means. The points are: `kinds`, `CONTRACTS_CODEOWNERS`, `HISTORY_CODEOWNERS`,
  `releasesBlock`, `documentSeeds` and the `if (options.stage === 'production')`
  block inside `runInit`.
- `NOT_INSTALLED['multi-team']` is empty: the seven phases exist.
- No hook is staged (`ADR-0012`).

**`HK-5`:** `src/cli/**` asks for `docs/requirements/functional.md` and `CHANGELOG.md`;
`plugin/**` asks for `CHANGELOG.md`. The answer: `RN-0025` travelled in Task 2, and the
CHANGELOG goes in Step 5.

- [ ] **Step 1: Write the failing test**

Add to `test/cli/init-enforcement.test.ts`:

```typescript
test('criterion 5: multi-team installs the Phase 7 enforcement', () => {
  withTempRepo({}, root => {
    const result = runInit(root, { ...OPTIONS, stage: 'multi-team' })

    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')
    assert.match(yaml, /npx living-docs validate --base/, 'the half of CI-7 that reads the diff is Phase 7')
    assert.match(yaml, /npx living-docs drift/)
    assert.match(yaml, /npx living-docs changelog --base/)
    assert.deepEqual(result.notInstalled, [], 'the seven phases exist: nothing is left out')
  })
})

test('RN-0025: multi-team installs everything production installs', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, stage: 'multi-team' })
    for (const path of ['CHANGELOG.md', 'docs/contracts/errors.md', 'docs/deprecations.md']) {
      assert.ok(existsSync(join(root, path)), `${path} should exist in the multi-team stage`)
    }
  })
})

test('RN-0025: production does not install the Phase 7 step', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, stage: 'production' })
    assert.doesNotMatch(readFileSync(join(root, WORKFLOW), 'utf8'), /validate --base/)
  })
})
```

And to `test/plugin/authoring.test.ts`:

```typescript
test('SK-0 does not tell you to choose a stage that the CLI rejects', () => {
  const source = skillSource('living-docs-bootstrap')
  for (const stage of ['solo', 'small-team', 'production', 'multi-team']) {
    assert.ok(source.includes(stage), `SK-0 must name the stage \`${stage}\` as the CLI calls it`)
  }
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="criterion 5"
```

Expected: FAILS — `multi-team` is not a `Stage`.

- [ ] **Step 3: Implement in `init`**

```typescript
/**
 * Maturity stages (spec §10, `SK-0` step 2). Each stage installs the minimum set
 * it asks for — and nothing beyond. `multi-team` has existed since the closing
 * because it now has enforcement behind it: it is the stage that installs
 * Phase 7 (`RN-0025`, `ADR-0012`). A label without content is the dead wiki being
 * born at the factory.
 */
export const STAGES = ['solo', 'small-team', 'production', 'multi-team'] as const

const STAGE_PHASES: Readonly<Record<Stage, readonly number[]>> = Object.freeze({
  solo: [0, 1],
  'small-team': [0, 1, 2, 3, 4],
  production: [0, 1, 2, 3, 4, 5, 6],
  'multi-team': [0, 1, 2, 3, 4, 5, 6, 7],
})

const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
  production: [],
  // `multi-team` covers Phase 7 of spec §10, and it exists.
  'multi-team': [],
})

/** Does this stage reach the given phase? It is the question that replaces comparing strings. */
function reaches(stage: Stage, phase: number): boolean {
  return STAGE_PHASES[stage].includes(phase)
}
```

In `workflowSteps`, add at the end:

```typescript
if (phases.includes(7)) {
  steps.push(
    [
      '',
      '      - name: CI-7 — code→doc link in the PR diff',
      "        if: github.event_name == 'pull_request'",
      `        run: ${invoke} validate --base \${{ github.event.pull_request.base.sha }}`,
    ].join('\n'),
  )
}
```

And replace each `options.stage === 'production'` with `reaches(options.stage, 5)`
(contracts) or `reaches(options.stage, 6)` (historical trail and `REL`), and each
`stage === 'production'` inside `documentSeeds`, `releasesBlock` and the choice
of `kinds` with the same question.

- [ ] **Step 4: `SK-0` names the four stages**

In `plugin/skills/living-docs-bootstrap/SKILL.md`, step 2, replace the sentence
about the stages with:

```markdown
2. **Determine the stage** — `solo` (prototype), `small-team` (small team),
   `production` (production with users) or `multi-team` (multiple teams) — and
   derive the **minimum** set of phases (spec §10). The four names are the ones
   that `living-docs init --stage` accepts. Do not install what the stage does not
   ask for, and say out loud which stage you concluded and why.
```

And, in the "What you own" table, the installation row now says what it
actually installs:

```markdown
| Installation of `HK-*` and `CI-*` | The enforcement of the stage's phases | Workflow in `.github/workflows/` + plugin registration in `.claude/settings.json` |
```

- [ ] **Step 5: Run, note the CHANGELOG and commit**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Under `### Added` of `CHANGELOG.md`:

```markdown
- `living-docs init --stage multi-team`: the multiple-teams stage comes to exist and installs Phase 7 — the `validate --base <ref>` step in the workflow, besides everything `production` installs.
```

```bash
git add src/cli/init.ts src/cli/index.ts plugin/skills/living-docs-bootstrap/SKILL.md \
        test/cli/init-enforcement.test.ts test/plugin/authoring.test.ts CHANGELOG.md
git commit -m "feat(RN-0025, ADR-0012): --stage multi-team comes to exist, with Phase 7 behind it"
```

---

### Task 9: The `blocks` field and `HK-8` — the open decision claims paths

**Objective:** `L-3`, deterministic half 1. An open decision gains an optional
field that names the paths it blocks, and `HK-8` **asks** when one of them is
edited — naming the decision, the gap and the owning skill. A hook that judged
whether that edit is the implementation of the missing rule would be in the wrong
place (spec §1, corollary 1).

**Files:**

- Create: `src/docs/blocked.ts`
- Create: `src/hooks/hk8-open-decision-guard.ts`
- Create: `test/docs/blocked.test.ts`
- Create: `test/hooks/hk8-open-decision-guard.test.ts`
- Modify: `plugin/hooks/hooks.json` (the eighth hook)
- Modify: `templates/open-decisions.md` (the `Blocks` column)
- Modify: `templates/ownership.yml` (the DA `field-map`)
- Modify: `docs/open-decisions.md` (the column, with `—` in the existing rows)
- Modify: `docs/.ownership.yml` (the DA `field-map`)
- Modify: `test/plugin/manifest.test.ts` (eight hooks, not seven)
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `ArtifactDoc` (`src/docs/collect.ts`), `fieldOf`, `picomatch`,
  `toRepoPath`, `askOutput`, `hookEnv`, `readPayload`.
- Produces:
  - `BlockedClaim { id, doc, line, paths, skill, owner, gap }`
  - `blockedClaims(docs: readonly ArtifactDoc[]): BlockedClaim[]`
  - `claimsFor(claims, paths): { claim: BlockedClaim; matched: string[] }[]`
  - `decideHk8(payload, env): Hk8Decision`

**Requirements:**

- **`ask`, never `deny`.** The file `hk8-open-decision-guard.ts` does not know the
  word `deny`, and the test proves it by reading the source.
- The field is **optional**: an open decision with no declared path remains valid
  and blocks nothing. What the spec refuses is declaring the path and not being
  reminded.
- Only an item with `status: open` claims. A resolved decision blocks nothing.
- Editing the **decision's own document** is never blocked: whoever is going to
  resolve the decision has to be able to write in it.
- The canonical name of the field is `blocks`; the project-specific column
  (`Blocks`) arrives through `field-map`, which is where the project's specific
  name lives — no hook learns a project's vocabulary.
- Fail open: unreadable configuration, missing artifact or a read error
  return `allow` (`RNF-0001`).
- Applies to the three collection forms: table, sections and one file per decision.

**`HK-5`:** `src/hooks/**` asks for `docs/requirements/rules.md`; `plugin/**` and
`templates/**` ask for `CHANGELOG.md`. The answer: `RN-0026` travelled in Task 2, and the
CHANGELOG goes in Step 7.

- [ ] **Step 1: Write the failing test — reading the claims**

Create `test/docs/blocked.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blockedClaims, claimsFor } from '../../src/docs/blocked.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { loadOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
    field-map:
      resolved-by: "Resolved-by"
      blocks: "Blocks"
      gap: "Gap"
`

const TABELA = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Whenever someone bumped into a gap.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Gap | Status | Resolved-by | Blocks | Opened |',
  '| --- | --- | --- | --- | --- | --- |',
  '| DA-0001 | How to round cents | open | — | `src/billing/**`, `src/api/checkout/**` | 2026-08-28 |',
  '| DA-0002 | Already resolved | resolved | ADR-0001 | `src/legacy/**` | 2026-08-20 |',
  '| DA-0003 | No declared path | open | — | — | 2026-08-28 |',
  '',
].join('\n')

function claims(root: string) {
  const config = loadOwnership(root)
  return blockedClaims(collectArtifacts(root, config))
}

test('RN-0026: only an open decision with a declared path claims', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, 'docs/open-decisions.md': TABELA }, root => {
    const found = claims(root)
    assert.equal(found.length, 1, JSON.stringify(found, null, 2))
    assert.equal(found[0]?.id, 'DA-0001')
    assert.deepEqual(found[0]?.paths, ['src/billing/**', 'src/api/checkout/**'])
    assert.equal(found[0]?.skill, 'decision-recorder')
    assert.match(found[0]?.gap ?? '', /cents/)
  })
})

test('RN-0026: claimsFor returns what each claim caught', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, 'docs/open-decisions.md': TABELA }, root => {
    const hits = claimsFor(claims(root), ['src/billing/fee.ts', 'README.md'])
    assert.equal(hits.length, 1)
    assert.deepEqual(hits[0]?.matched, ['src/billing/fee.ts'])

    assert.deepEqual(claimsFor(claims(root), ['README.md']), [])
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0026"
```

Expected: FAILS — `Cannot find module '../../src/docs/blocked.ts'`.

- [ ] **Step 3: Implement `src/docs/blocked.ts`**

```typescript
import picomatch from 'picomatch'
import { fieldOf } from '../config/ownership.ts'
import type { ArtifactDoc } from './collect.ts'

/**
 * An open decision that named the paths it blocks (`RN-0026`).
 *
 * The field is optional on purpose: an open decision with no declared path remains
 * valid and blocks nothing. What the spec refuses is the opposite — declaring the
 * path and not being reminded.
 */
export interface BlockedClaim {
  id: string
  /** The document where the decision lives. */
  doc: string
  line: number
  /** The declared globs, as the project wrote them. */
  paths: string[]
  skill: string
  owner: string
  /** The statement of the gap, when the item carries it. */
  gap: string | null
}

const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'none'])

/** One path per comma or space; backticks are markdown decoration. */
function splitPaths(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map(path => path.replace(/`/g, '').trim())
    .filter(path => path !== '' && !EMPTY.has(path.toLowerCase()))
}

/** The claims declared by `open` decisions, in any collection form. */
export function blockedClaims(docs: readonly ArtifactDoc[]): BlockedClaim[] {
  const claims: BlockedClaim[] = []

  for (const doc of docs) {
    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data
      if (data?.status !== 'open' || typeof data.id !== 'string') continue
      const raw = data.blocks
      const paths = splitPaths(Array.isArray(raw) ? raw.join(' ') : String(raw ?? ''))
      if (paths.length === 0) continue

      claims.push({
        id: data.id,
        doc: doc.file,
        line: doc.frontmatter?.lines.id ?? 1,
        paths,
        skill: doc.rule.skill,
        owner: doc.rule.owner,
        gap: typeof data.title === 'string' ? data.title : null,
      })
      continue
    }

    for (const item of doc.items) {
      if (item.status !== 'open') continue
      const raw = fieldOf(doc.rule, item, 'blocks')
      if (raw === null) continue
      const paths = splitPaths(raw)
      if (paths.length === 0) continue

      claims.push({
        id: item.id,
        doc: doc.file,
        line: item.line,
        paths,
        skill: doc.rule.skill,
        owner: doc.rule.owner,
        gap: fieldOf(doc.rule, item, 'gap') ?? item.fields.title ?? null,
      })
    }
  }

  return claims
}

/** Which claims this set of paths touches, and what each one caught. */
export function claimsFor(claims: readonly BlockedClaim[], paths: readonly string[]): { claim: BlockedClaim; matched: string[] }[] {
  const normalized = paths.map(path => path.replace(/\\/g, '/').replace(/^\.\//, ''))
  const hits: { claim: BlockedClaim; matched: string[] }[] = []

  for (const claim of claims) {
    const matches = picomatch(claim.paths)
    // The decision's own document is never blocked: whoever is going to resolve it
    // has to be able to write in it.
    const matched = normalized.filter(path => path !== claim.doc && matches(path))
    if (matched.length > 0) hits.push({ claim, matched })
  }

  return hits
}
```

- [ ] **Step 4: Write the failing test — `HK-8`**

Create `test/hooks/hk8-open-decision-guard.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decideHk8 } from '../../src/hooks/hk8-open-decision-guard.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
    field-map:
      blocks: "Blocks"
      gap: "Gap"
`

const TABELA = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Whenever someone bumped into a gap.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Gap | Status | Blocks | Opened |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | How to round cents | open | `src/billing/**` | 2026-08-28 |',
  '',
].join('\n')

const ARVORE = { [OWNERSHIP_PATH]: CONFIG, 'docs/open-decisions.md': TABELA }

test('RN-0026: editing a claimed path asks, naming the decision and the owning skill', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk8(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing/fee.ts',
          old_string: 'a',
          new_string: 'b',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'ask')
    const reason = decision.action === 'ask' ? decision.reason : ''
    assert.match(reason, /DA-0001/)
    assert.match(reason, /cents/, 'the gap must be named')
    assert.match(reason, /decision-recorder/)
    assert.match(reason, /docs\/open-decisions\.md/)
  })
})

test('RN-0026: an unclaimed path passes in silence', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk8(
      {
        tool_name: 'Write',
        tool_input: { file_path: 'src/report/pdf.ts', content: 'x' },
      },
      { root, hostRoots: [root] },
    )
    assert.equal(decision.action, 'allow')
  })
})

test('RN-0026: writing in the decision itself is never blocked', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk8(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'docs/open-decisions.md',
          old_string: 'open',
          new_string: 'resolved',
        },
      },
      { root, hostRoots: [root] },
    )
    assert.equal(decision.action, 'allow')
  })
})

test('RNF-0001: without readable configuration, HK-8 fails open', () => {
  withTempRepo({}, root => {
    const decision = decideHk8({ tool_name: 'Edit', tool_input: { file_path: 'src/x.ts' } }, { root, hostRoots: [root] })
    assert.equal(decision.action, 'allow')
  })
})

test('RN-0026: HK-8 asks and does not know the word deny', () => {
  const source = readFileSync(join(toolkitRoot(), 'src/hooks/hk8-open-decision-guard.ts'), 'utf8')
  assert.doesNotMatch(source, /\bdenyOutput\b/, 'a hook that judges is in the wrong place (spec §1)')
})
```

- [ ] **Step 5: Implement `src/hooks/hk8-open-decision-guard.ts`**

```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): asks when the edit touches a path that an open
 * decision claimed.
 *
 * Source rule: `RN-0026`, and acceptance criterion 4 of spec §12 —
 * behavior without a written rule becomes an open decision **and the
 * implementation does not happen**. It returns `ask`, never `deny`: denying would
 * require judging whether that edit is the implementation of the missing rule or
 * something else entirely on the same path, and a hook that judges is in the wrong
 * place (spec §1, corollary 1).
 */
import { loadOwnership } from '../config/ownership.ts'
import { collectArtifacts } from '../docs/collect.ts'
import { blockedClaims, claimsFor } from '../docs/blocked.ts'
import { toRepoPath } from './lib/paths.ts'
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type Hk8Decision = { action: 'allow' } | { action: 'ask'; reason: string }

const ALLOW: Hk8Decision = { action: 'allow' }

export function decideHk8(payload: HookPayload, env: HookEnv): Hk8Decision {
  const filePath = payload.tool_input?.file_path
  if (typeof filePath !== 'string') return ALLOW

  const repoPath = toRepoPath(filePath, env.hostRoots)
  if (repoPath === null) return ALLOW

  let hits
  try {
    const config = loadOwnership(env.root)
    hits = claimsFor(blockedClaims(collectArtifacts(env.root, config)), [repoPath])
  } catch {
    return ALLOW // fail open (`RNF-0001`)
  }

  const hit = hits[0]
  if (hit === undefined) return ALLOW

  const { claim } = hit
  return {
    action: 'ask',
    reason:
      `HK-8: \`${repoPath}\` is claimed by ${claim.id}, an **open** decision in ${claim.doc}` +
      `${claim.gap === null ? '' : ` — "${claim.gap}"`}. ` +
      `It blocks: ${claim.paths.join(', ')}. ` +
      'Source rule: `RN-0026` and acceptance criterion 4 of spec §12 — behavior without a written rule becomes an ' +
      'open decision, and the implementation does not happen while it is open. ' +
      `Resolve the decision first (owning skill: ${claim.skill}; owner: ${claim.owner}), or confirm that this edit ` +
      'is not the implementation of the missing rule.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()
  if (!payload) return
  const decision = decideHk8(payload, hookEnv())
  emit(decision.action === 'ask' ? askOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('hk8-open-decision-guard.ts')) {
  main().catch(() => process.exit(0))
}
```

- [ ] **Step 6: Register the hook and the column**

In `plugin/hooks/hooks.json`, in the `PreToolUse` / `Edit|Write` group, after
`hk3-state-promotion`:

```json
{
  "type": "command",
  "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk8-open-decision-guard",
  "shell": "bash",
  "async": false
}
```

In `test/plugin/manifest.test.ts`, the expected value becomes:

```typescript
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk2-generated-artifact', 'hk3-state-promotion', 'hk8-open-decision-guard'],
```

and `assert.equal(vistos, 8, 'the scan should see the eight hooks')`.

In `templates/open-decisions.md`, the table gains the column, with the note right
above it:

```markdown
The **Blocks** column is optional: when filled in with the paths that the gap
prevents from being implemented, `HK-8` asks on edit and `CI-7` fails in the diff
(`RN-0026`). Empty (`—`), the decision remains valid and blocks nothing.

| ID  | Gap | Status | Resolved-by | Blocks | Opened |
| --- | --- | ------ | ----------- | ------ | ------ |
```

In `templates/ownership.yml` and in `docs/.ownership.yml`, the `field-map` of the
DA artifact gains the two lines:

```yaml
field-map:
  resolved-by: 'Resolved-by'
  blocks: 'Blocks'
  gap: 'Gap'
```

And in `docs/open-decisions.md`, add the column to the header, to the separator and
to the three existing rows (`DA-0001`, `DA-0002` and `DA-0003`, all with `—`).

- [ ] **Step 7: Run, note the CHANGELOG and commit**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Under `### Added` of `CHANGELOG.md`:

```markdown
- `HK-8`: editing a path claimed by an open decision now asks, naming the decision, the gap and the owning skill. The field is optional — the `Blocks` column (canonical `blocks`) in the list of open decisions.
```

```bash
git add src/docs/blocked.ts src/hooks/hk8-open-decision-guard.ts plugin/hooks/hooks.json \
        templates/open-decisions.md templates/ownership.yml docs/open-decisions.md docs/.ownership.yml \
        test/docs/blocked.test.ts test/hooks/hk8-open-decision-guard.test.ts test/plugin/manifest.test.ts CHANGELOG.md
git commit -m "feat(RN-0026): an open decision claims paths, and HK-8 asks"
```

---

### Task 10: `CI-7` enforces the blocked path in the diff — and criterion 4 gains proof

**Objective:** `L-3`, deterministic half 2. The diff that touches a path claimed by
an open decision fails, with the same written way out that the other halves of
`CI-7` already accept. And acceptance criterion 4 of the original spec — which
never had a test — comes to have one.

**Files:**

- Modify: `src/checks/ci7-ownership-coverage.ts` (sixth class of finding)
- Modify: `src/checks/catalog.ts` (`failsWhen` of `CI-7`)
- Modify: `docs/contracts/checks.gen.md` (**regenerated**, never edited)
- Modify: `test/checks/ci7-ownership-coverage.test.ts`
- Modify: `test/acceptance/spec-criteria.test.ts` (criterion 4 of the original spec)
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `blockedClaims`, `claimsFor` (Task 9); `docsExceptionReason`,
  `DiffFacts`.
- Produces: no new signature — `ci7OwnershipCoverage(diff)` gains a class of
  finding.

**Requirements:**

- The new class only exists **with a diff** (`validate --base`), like the fifth.
  Without a base there is no diff, and inventing one would produce a finding about
  a change that is not from this branch.
- The written way out is the same: `Docs: none — <reason>` releases both classes of
  the diff at once. Two labels are already the beginning of a family; a third
  would need an ADR of its own (`src/checks/exception-label.ts`).
- The message names the decision, the gap, the paths the diff carried and the
  owning skill. A blocking message that does not teach the right path is noise.
- `CI-5` enforces against catalog drift: **regenerate** `docs/contracts/checks.gen.md`
  with the generator. Editing it by hand is denied by `HK-2`.

**`HK-5`:** `src/checks/**` asks for `docs/requirements/rules.md`;
`src/checks/catalog.ts` asks for `docs/contracts/checks.gen.md` and `CHANGELOG.md`. The
answer: `RN-0026` travelled in Task 2, the contract is regenerated in Step 4 and the
CHANGELOG goes in Step 6.

- [ ] **Step 1: Write the failing test**

Add to `test/acceptance/spec-criteria.test.ts` (and the import
`import { decideHk8 } from '../../src/hooks/hk8-open-decision-guard.ts';`):

```typescript
const DECISAO_BLOQUEANTE = [
  'version: 1',
  'artifacts:',
  '  - id-prefix: DA',
  '    path: docs/open-decisions.md',
  '    owner: "@time"',
  '    skill: decision-recorder',
  '    collection: table',
  '    field-map:',
  '      blocks: "Blocks"',
  '      gap: "Gap"',
  'documents:',
  '  - path: docs/.ownership.yml',
  '    owner: "@time"',
  '    skill: living-docs-bootstrap',
  '',
].join('\n')

const DECISOES = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Whenever someone bumped into a gap.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Gap | Status | Blocks | Opened |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | How to round cents | open | `src/billing/**` | 2026-08-28 |',
  '',
].join('\n')

test('criterion 4 of spec §12: behavior without a rule is asked about on edit and fails in the diff', () => {
  const arvore = {
    [OWNERSHIP_PATH]: DECISAO_BLOQUEANTE,
    CODEOWNERS: 'docs/    @time\n',
    'docs/open-decisions.md': DECISOES,
  }

  const git =
    (changed: string[], messages: string[]) =>
    (args: readonly string[]): string =>
      args.includes('diff') ? changed.join(NUL) + NUL : messages.join(`${NUL}\n`) + NUL + '\n'

  withTempRepo(arvore, root => {
    // Half 1 — on edit, HK-8 asks, naming the decision.
    const pergunta = decideHk8(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing/fee.ts',
          old_string: 'a',
          new_string: 'b',
        },
      },
      { root, hostRoots: [root] },
    )
    assert.equal(pergunta.action, 'ask')
    assert.match(pergunta.action === 'ask' ? pergunta.reason : '', /DA-0001/)

    // Half 2 — in the diff, CI-7 fails.
    const reprovado = runValidate(root, 'origin/master', git(['src/billing/fee.ts'], ['feat: cents']))
    const finding = reprovado.findings.find(f => f.ruleId === 'CI-7' && /DA-0001/.test(f.message))
    assert.ok(finding, JSON.stringify(reprovado.findings, null, 2))
    assert.equal(reprovado.exitCode, 1)

    // And the written reason is the only way out.
    const comRazao = git(['src/billing/fee.ts'], ['refactor: rename internal\n\nDocs: none — this is not the implementation of the missing rule'])
    assert.equal(runValidate(root, 'origin/master', comRazao).exitCode, 0)

    // Without a base, this half does not run.
    assert.equal(runValidate(root).exitCode, 0)
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="criterion 4"
```

Expected: FAILS on half 2 — `CI-7` does not know claims.

- [ ] **Step 3: Implement the sixth class in `CI-7`**

In `src/checks/ci7-ownership-coverage.ts`, inside the same
`if (diff !== null && docsExceptionReason(diff.messages) === null)`, right after
the `pendingDocs` loop:

```typescript
// 6 — path claimed by an open decision (`RN-0026`).
for (const { claim, matched } of claimsFor(blockedClaims(context.docs), diff.changed)) {
  const levados = matched.slice(0, 5).join(', ') + (matched.length > 5 ? `, … (+${matched.length - 5})` : '')

  findings.push(
    error(
      claim.doc,
      claim.line,
      `The diff \`${diff.base}...HEAD\` touches a path claimed by ${claim.id}, which is \`open\`` +
        `${claim.gap === null ? '' : ` — "${claim.gap}"`}: ${levados}.`,
      `Resolve ${claim.id} before implementing (owning skill: ${claim.skill}) — while the decision is ` +
        'open there is no rule, and the way out is the ID, not the code. If this change is not the implementation of ' +
        'the missing rule, write the reason in a commit message, in the format `Docs: none — <reason>` ' +
        '(`RN-0026`, `ADR-0010`).',
    ),
  )
}
```

With the import `import { blockedClaims, claimsFor } from '../docs/blocked.ts';` and
the function's header comment updated: there are now **six** classes of
finding, and the sixth is `RN-0026`.

- [ ] **Step 4: Catalog and regenerated contract**

In `src/checks/catalog.ts`, the `failsWhen` of `CI-7` gains the final clause:

```typescript
      'Corpus document with no entry in `.ownership.yml` or no line in CODEOWNERS; `watches` rule whose `doc` does not exist or has no owner; agent contract repeating a sentence of an owning artifact; Definition of Done item with no named verification; and, with `--base <ref>`, a watched path changed without the owning doc, or a path claimed by an open decision — both released by `Docs: none — <reason>`.',
```

Regenerate the contract (never edit it by hand — `HK-2` denies):

```bash
docker compose exec toolkit node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
./bin/living-docs drift
```

Expected: `drift` with no finding.

- [ ] **Step 5: Run everything**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
```

- [ ] **Step 6: CHANGELOG and commit**

Under `### Changed` of `CHANGELOG.md`:

```markdown
- `CI-7` gains a sixth class of finding: with `--base <ref>`, the diff that touches a path claimed by an open decision fails. The way out remains `Docs: none — <reason>`.
```

```bash
git add src/checks/ci7-ownership-coverage.ts src/checks/catalog.ts docs/contracts/checks.gen.md \
        test/checks/ci7-ownership-coverage.test.ts test/acceptance/spec-criteria.test.ts CHANGELOG.md
git commit -m "feat(RN-0026): the diff that touches an open decision's path fails in CI-7"
```

---

### Task 11: `CI-9` — commit discipline becomes a check

**Objective:** `L-5` and the first half of `L-8`. Two rules that the original spec
wrote and did not allocate to any piece come to have enforcement: the mass bump of
`last-reviewed` (§2 rule 3, §13) and the commit that changes an artifact without
citing the affected ID (§11). Closes acceptance criteria 7 and 8.

**Files:**

- Modify: `src/git/diff.ts` (`FileEdit`, `changedLines`)
- Modify: `src/config/ownership.ts` (`last-reviewed-bump-limit`)
- Create: `src/checks/ci9-commit-discipline.ts`
- Modify: `src/checks/registry.ts` (`CommitFacts`, `ci9` in the `validate` list)
- Modify: `src/cli/validate.ts` (the third diff fact)
- Modify: `src/checks/catalog.ts` (`CI-9` entry)
- Modify: `docs/contracts/checks.gen.md` (**regenerated**, never edited)
- Modify: `docs/definition-of-done.md` (the citation line stops being human)
- Create: `test/checks/ci9-commit-discipline.test.ts`
- Modify: `test/git/diff.test.ts`, `test/config/ownership.test.ts`,
  `test/checks/registry.test.ts`
- Modify: `test/acceptance/spec-criteria.test.ts` (criteria 7 and 8)
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `DiffFacts` (`src/checks/ci6-changelog-required.ts`), `git()` and
  `runGitDiff` (`src/git/diff.ts`), `findArtifactRule`, `parseId`,
  `canonicalId`, `findCitations`.
- Produces:
  - `interface FileEdit { path: string; added: string[]; removed: string[] }`
  - `changedLines(root: string, base: string, run?: GitRunner): FileEdit[]`
  - `interface CommitFacts extends DiffFacts { edits: readonly FileEdit[] }`
  - `isPureDateBump(edit: FileEdit): boolean`
  - `declaredIds(doc: ArtifactDoc, format: IdFormat): string[]` — canonical
  - `ci9CommitDiscipline(facts: CommitFacts | null): Check`
  - `OwnershipConfig.lastReviewedBumpLimit: number` and `DEFAULT_BUMP_LIMIT`
  - `validateChecks(diff: CommitFacts | null)` — the narrowed signature

**Requirements:**

- **The check only exists with a diff.** Without `--base` there is no commit to
  read, and inventing one would produce a finding about a change that is not from
  this branch — the same rule as the two halves of the diff in `CI-7` (`ADR-0010`).
- **The unit is the branch diff, not the commit** (`ADR-0013`). Splitting the bump
  into three commits does not make it a real review.
- **The bump half has no exception label** (`ADR-0013`, `RN-0027`). A label here
  would be the ticked box that the anti-requirement of §13 describes.
- **No ID is built by concatenation** (`RN-0024`): the citation is compared by
  `canonicalId`, and whoever reads the written form is `findCitations(source, idFormat)`.
- The threshold enters `docs/.ownership.yml` as `last-reviewed-bump-limit`, an
  integer **greater than or equal to 2**, default 3. A threshold of 1 would fail the
  legitimate review of a single document, which is the mechanism working.
- `CI-9` enters the catalog, and the catalog is a generated contract: **regenerate**
  `docs/contracts/checks.gen.md` with the generator. `HK-2` denies hand editing.

**`HK-5`:** `src/checks/**` and `src/git/**` ask for `docs/requirements/rules.md`
(`RN-0027` and `RN-0028` travelled in Task 2); `src/checks/catalog.ts` asks for
`docs/contracts/checks.gen.md` and `CHANGELOG.md`; `src/cli/**` and
`src/config/ownership.ts` ask for `docs/requirements/functional.md` and
`CHANGELOG.md`. The contract is regenerated in Step 9 and the CHANGELOG goes in Step 13.

- [x] **Step 1: Write the line parser test (fails)**

Add to `test/git/diff.test.ts`, and to the import at the top add
`changedLines`:

```typescript
const PATCH = [
  'diff --git a/docs/glossary.md b/docs/glossary.md',
  'index 1111111..2222222 100644',
  '--- a/docs/glossary.md',
  '+++ b/docs/glossary.md',
  '@@ -6 +6 @@',
  '-last-reviewed: 2026-01-01',
  '+last-reviewed: 2026-08-31',
  'diff --git a/docs/deleted.md b/docs/deleted.md',
  'deleted file mode 100644',
  '--- a/docs/deleted.md',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
  '-title',
  '--- this is removed content, not a header',
  '',
].join('\n')

test('RN-0027: changedLines separates by file and does not confuse content with a header', () => {
  const git = fake(PATCH)
  const edits = changedLines('/repo', 'origin/master', git.run)

  // The deleted file does not become an edit: `+++ /dev/null` does not open a
  // section, and its removed lines do not leak into the previous file.
  assert.deepEqual(edits, [
    {
      path: 'docs/glossary.md',
      added: ['last-reviewed: 2026-08-31'],
      removed: ['last-reviewed: 2026-01-01'],
    },
  ])

  assert.deepEqual(git.calls[0], [
    '-c',
    'safe.directory=*',
    '-c',
    'core.quotePath=false',
    'diff',
    '--unified=0',
    '--no-color',
    '--no-renames',
    'origin/master...HEAD',
  ])
})
```

- [x] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="changedLines"
```

Expected: FAILS — `changedLines` is not exported.

- [x] **Step 3: Implement `changedLines`**

At the end of `src/git/diff.ts`:

```typescript
/** What a file gained and lost in this diff. Reading order, no context. */
export interface FileEdit {
  /** Path relative to the root, always with `/`. */
  path: string
  added: string[]
  removed: string[]
}

/** Only the destination header opens a section — `+++ /dev/null` (removal) does not. */
const FILE_HEADER = /^\+\+\+ b\/(.+)$/

/**
 * The diff line by line, per file (`RN-0027`).
 *
 * `--unified=0` because the question is "what changed", not "around what":
 * a context line here would only increase the text to go through on the PR (`RNF-0005`).
 * `--no-renames` so that a rename does not become a pair of phantom files, and
 * `core.quotePath=false` for the same reason as the `-z` of `changedPaths` — a path
 * with an escaped accent matches no path at all.
 *
 * The `inHunk` state is not zeal: a **removed** line whose content starts with
 * `--` is written as `--- ...`, identical to a source header. Only after
 * a `@@` is a line content.
 */
export function changedLines(root: string, base: string, run: GitRunner = runGitDiff): FileEdit[] {
  const output = git(
    ['-c', 'core.quotePath=false', 'diff', '--unified=0', '--no-color', '--no-renames', `${base}...HEAD`],
    root,
    run,
    `git diff --unified=0 ${base}...HEAD`,
  )

  const edits: FileEdit[] = []
  let current: FileEdit | null = null
  let inHunk = false

  for (const line of output.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = null
      inHunk = false
      continue
    }
    if (line.startsWith('@@')) {
      inHunk = true
      continue
    }
    if (!inHunk) {
      const path = FILE_HEADER.exec(line)?.[1]
      if (path !== undefined) {
        current = {
          path: path.replace(/\\/g, '/'),
          added: [],
          removed: [],
        }
        edits.push(current)
      }
      continue
    }
    if (current === null) continue
    if (line.startsWith('+')) current.added.push(line.slice(1))
    else if (line.startsWith('-')) current.removed.push(line.slice(1))
  }

  return edits
}
```

- [x] **Step 4: Run and watch it pass**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="changedLines"
```

Expected: PASSES.

- [x] **Step 5: Write the `CI-9` test (fails)**

Create `test/checks/ci9-commit-discipline.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci9CommitDiscipline, isPureDateBump } from '../../src/checks/ci9-commit-discipline.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
    collection: sections
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
`

const REGRAS = [
  '---',
  'title: Rules',
  'owner: "@time"',
  'trigger: Before implementing new behavior.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## RN-0001 — Cents round up',
  '',
  '- **status:** active',
  '',
  'Prose.',
  '',
].join('\n')

const ARVORE = { 'docs/requirements/rules.md': REGRAS }

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = parseOwnership(ownership)
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: [],
    today: '2026-08-31',
  }
}

/** An edit that only touched the review date. */
function bump(path: string) {
  return {
    path,
    added: ['last-reviewed: 2026-08-31'],
    removed: ['last-reviewed: 2026-01-01'],
  }
}

test('RN-0027: three documents that only changed the date fail, naming the anti-requirement', () => {
  withTempRepo(ARVORE, root => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      messages: ['chore: documentation review'],
      edits: [bump('docs/a.md'), bump('docs/b.md'), bump('docs/c.md')],
    }).run(contextFor(root))

    const bumpFinding = findings.find(f => /last-reviewed/.test(f.message))
    assert.ok(bumpFinding, JSON.stringify(findings, null, 2))
    assert.equal(bumpFinding?.ruleId, 'CI-9')
    assert.equal(bumpFinding?.severity, 'error')
    assert.match(bumpFinding?.message ?? '', /docs\/a\.md/)
    assert.match(bumpFinding?.message ?? '', /docs\/c\.md/)
  })
})

test('RN-0027: two bumps pass, and a document that really changed never counts', () => {
  withTempRepo(ARVORE, root => {
    const doisBumps = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md'],
      messages: ['docs: review'],
      edits: [bump('docs/a.md'), bump('docs/b.md')],
    }).run(contextFor(root))
    assert.deepEqual(
      doisBumps.filter(f => /last-reviewed/.test(f.message)),
      [],
    )

    // Three documents touched, but one of them changed in the body: a real review.
    const comCorpo = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      messages: ['docs: review'],
      edits: [
        bump('docs/a.md'),
        bump('docs/b.md'),
        {
          path: 'docs/c.md',
          added: ['last-reviewed: 2026-08-31', 'new paragraph'],
          removed: ['last-reviewed: 2026-01-01'],
        },
      ],
    }).run(contextFor(root))
    assert.deepEqual(
      comCorpo.filter(f => /last-reviewed/.test(f.message)),
      [],
    )
  })
})

test('RN-0027: the threshold is configurable, and the default is three', () => {
  withTempRepo(ARVORE, root => {
    const facts = {
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md'],
      messages: ['docs: review'],
      edits: [bump('docs/a.md'), bump('docs/b.md')],
    }
    const comLimiar2 = ci9CommitDiscipline(facts).run(contextFor(root, `${OWNERSHIP}last-reviewed-bump-limit: 2\n`))
    assert.ok(comLimiar2.some(f => /last-reviewed/.test(f.message)))
  })
})

test('RN-0028: a commit that changes an artifact without citing the ID declared in it fails', () => {
  withTempRepo(ARVORE, root => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['docs: adjust the prose of the rule'],
      edits: [],
    }).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.file, 'docs/requirements/rules.md')
    assert.match(findings[0]?.message ?? '', /RN-0001/)
    assert.match(findings[0]?.fix ?? '', /commit message/)
  })
})

test('RN-0028: it is enough for one message of the diff to cite one of the file\'s IDs', () => {
  withTempRepo(ARVORE, root => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['chore: touches something else', 'docs(RN-0001): the rule gains the negative case'],
      edits: [],
    }).run(contextFor(root))

    assert.deepEqual(findings, [])
  })
})

test('RN-0028: a file that is not an artifact, and a missing artifact, are not enforced', () => {
  withTempRepo(ARVORE, root => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['src/cli/index.ts', 'docs/decisions/adr/ADR-0001-deleted.md'],
      messages: ['refactor: rename internal'],
      edits: [],
    }).run(contextFor(root))

    assert.deepEqual(findings, [])
  })
})

test('RN-0024: the citation is compared by identity, not by written form', () => {
  withTempRepo(
    {
      'docs/requirements/rules.md': REGRAS.replace('## RN-0001', '## RN001'),
    },
    root => {
      // The project writes `RN001`; the commit cites `RN001`. Same identity that
      // `RN-0001` would have — and what compares is `canonicalId`, not the written form.
      const findings = ci9CommitDiscipline({
        base: 'origin/master',
        changed: ['docs/requirements/rules.md'],
        messages: ['docs(RN001): the rule gains the negative case'],
        edits: [],
      }).run(contextFor(root, `${OWNERSHIP}id-format:\n  separator: ""\n  padding: 3\n`))

      assert.deepEqual(findings, [])
    },
  )
})

test('ADR-0010: without a diff, CI-9 has nothing to say', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(ci9CommitDiscipline(null).run(contextFor(root)), [])
  })
})

test('RN-0027: isPureDateBump is only the date, and nothing else', () => {
  assert.equal(isPureDateBump(bump('docs/a.md')), true)
  assert.equal(
    isPureDateBump({
      path: 'docs/a.md',
      added: ['last-reviewed: x', 'another'],
      removed: ['last-reviewed: y'],
    }),
    false,
  )
  assert.equal(
    isPureDateBump({
      path: 'docs/a.md',
      added: ['title'],
      removed: ['old title'],
    }),
    false,
  )
})
```

- [x] **Step 6: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0027|RN-0028"
```

Expected: FAILS — `src/checks/ci9-commit-discipline.ts` does not exist.

- [x] **Step 7: Add the threshold to `.ownership.yml`**

In `src/config/ownership.ts`, in `OwnershipConfig`, right below
`staleAfterMonths`:

```typescript
/** How many documents with a bare date bump fail (`ADR-0013`, `RN-0027`). */
lastReviewedBumpLimit: number
```

Before `parseOwnership`:

```typescript
/**
 * The mass bump threshold (`ADR-0013`). Floor 2, not 1: a document that was really
 * reviewed updates the date, and a threshold of 1 would fail the mechanism working.
 */
export const DEFAULT_BUMP_LIMIT = 3

function parseBumpLimit(raw: unknown): number {
  if (raw === undefined || raw === null) return DEFAULT_BUMP_LIMIT
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 2) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: last-reviewed-bump-limit "${String(raw)}" must be an integer greater than or equal to 2 ` +
        '(a threshold of 1 would fail the legitimate review of a single document — ADR-0013).',
    )
  }
  return raw
}
```

And in the `return` of `parseOwnership`, next to `staleAfterMonths`:

```typescript
    lastReviewedBumpLimit: parseBumpLimit(root['last-reviewed-bump-limit']),
```

Add to `test/config/ownership.test.ts`:

```typescript
test('RN-0027: last-reviewed-bump-limit has default 3 and floor 2', () => {
  const base = 'version: 1\nartifacts:\n  - id-prefix: ADR\n    path: docs/adr/\n    owner: "@t"\n    skill: s\n'
  assert.equal(parseOwnership(base).lastReviewedBumpLimit, 3)
  assert.equal(parseOwnership(`${base}last-reviewed-bump-limit: 5\n`).lastReviewedBumpLimit, 5)
  assert.throws(() => parseOwnership(`${base}last-reviewed-bump-limit: 1\n`), /greater than or equal to 2/)
})
```

- [x] **Step 8: Implement `CI-9`**

Create `src/checks/ci9-commit-discipline.ts`:

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { DiffFacts } from './ci6-changelog-required.ts'
import type { FileEdit } from '../git/diff.ts'
import type { ArtifactDoc } from '../docs/collect.ts'
import { findArtifactRule } from '../config/ownership.ts'
import { canonicalId, parseId } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'
import { findCitations } from '../ids/citations.ts'

const RULE = 'CI-9'

/**
 * The diff with the lines, and not only the paths. It is the extra fact that `CI-9`
 * asks for and that `CI-6` and `CI-7` do not need — hence a type of its own, and not an
 * optional field in `DiffFacts`: an optional field that someone forgets to fill in becomes
 * a check that goes quiet without saying it went quiet.
 */
export interface CommitFacts extends DiffFacts {
  edits: readonly FileEdit[]
}

const LAST_REVIEWED = /^\s*last-reviewed\s*:/i

/** The edit touched the review date and nothing else (`RN-0027`). */
export function isPureDateBump(edit: FileEdit): boolean {
  return edit.added.length === 1 && edit.removed.length === 1 && LAST_REVIEWED.test(edit.added[0] ?? '') && LAST_REVIEWED.test(edit.removed[0] ?? '')
}

/**
 * The IDs this file declares, in canonical form (`RN-0024`). An individual artifact
 * declares one in the frontmatter; a collection declares one per item.
 */
export function declaredIds(doc: ArtifactDoc, format: IdFormat): string[] {
  const raw: unknown[] = doc.rule.collection === 'per-file' ? [doc.frontmatter?.data?.id] : doc.items.map(item => item.id)

  const ids: string[] = []
  for (const value of raw) {
    const parsed = parseId(value, format)
    if (parsed !== null) ids.push(canonicalId(parsed))
  }
  return ids
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function error(file: string, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
}

/**
 * `CI-9` — commit discipline. Two halves, both read from the branch diff: the
 * mass bump of `last-reviewed` (`RN-0027`, anti-requirement of spec §13) and the
 * commit that changes an artifact without citing the affected ID (`RN-0028`, spec §11).
 *
 * It runs in the group that already receives the diff by injection, for the same reason as `CI-6`
 * and the diff half of `CI-7`: without a base there is no commit to read, and inventing one
 * would produce a finding about a change that is not from this branch (`ADR-0010`).
 *
 * The unit of both halves is the **branch diff**, not the commit: it is the unit
 * the CI has, and splitting a bump into three commits does not make it a real review
 * (`ADR-0013`).
 */
export function ci9CommitDiscipline(facts: CommitFacts | null): Check {
  return {
    id: RULE,
    name: 'commit discipline',
    run(context: CheckContext): Finding[] {
      if (facts === null) return []
      const findings: Finding[] = []
      const { config } = context

      // 1 — mass bump of `last-reviewed` (`RN-0027`).
      // No exception label, on purpose: the label would be the ticked box
      // that the anti-requirement of spec §13 describes (`ADR-0013`).
      const bumps = facts.edits.filter(isPureDateBump).map(edit => normalizePath(edit.path))
      if (bumps.length >= config.lastReviewedBumpLimit) {
        const lista = bumps.slice(0, 5).join(', ') + (bumps.length > 5 ? `, … (+${bumps.length - 5})` : '')
        findings.push(
          error(
            bumps[0] ?? '',
            `The diff \`${facts.base}...HEAD\` changes the review date of ${bumps.length} documents and nothing else ` +
              `in the body of any of them (threshold: ${config.lastReviewedBumpLimit}): ${lista}.`,
            'A document that was really reviewed changes in more than the date — mass bump is the review mechanism ' +
              'being switched off while pretending to fulfil it. Revert the date of those that were not reviewed, or review them ' +
              '(`RN-0027`, `ADR-0013`; the threshold is `last-reviewed-bump-limit` in `.ownership.yml`).',
          ),
        )
      }

      // 2 — commit that changes an artifact without citing the affected ID (`RN-0028`).
      const citados = new Set<string>()
      for (const message of facts.messages) {
        for (const citation of findCitations(message, config.idFormat)) {
          const parsed = parseId(citation.id, config.idFormat)
          if (parsed !== null) citados.add(canonicalId(parsed))
        }
      }

      for (const path of facts.changed.map(normalizePath)) {
        if (findArtifactRule(config, path) === null) continue
        const doc = context.docs.find(candidate => candidate.file === path)
        if (doc === undefined) continue // deleted in the diff: there is no ID to cite

        const ids = declaredIds(doc, config.idFormat)
        if (ids.length === 0) continue // artifact file with no item: nothing to cite
        if (ids.some(id => citados.has(id))) continue

        const lista = ids.slice(0, 5).join(', ') + (ids.length > 5 ? `, … (+${ids.length - 5})` : '')
        findings.push(
          error(
            path,
            `The diff \`${facts.base}...HEAD\` changes \`${path}\` and no commit message cites one of the IDs ` + `declared in it (${lista}).`,
            'Cite the affected ID in the commit message — this project\'s format is in `CONTRIBUTING.md`. It is the ' +
              'citation that makes `git log` navigable by rule: without it the history answers "what changed" and ' +
              `never "because of which rule" (\`RN-0028\`; owning skill: ${doc.rule.skill}).`,
          ),
        )
      }

      return findings
    },
  }
}
```

- [x] **Step 9: Wire it into `validate`, into the catalog and regenerate the contract**

In `src/checks/registry.ts`, import `ci9CommitDiscipline` and the type
`CommitFacts`, change the parameter type and add the check:

```typescript
export function validateChecks(diff: CommitFacts | null = null): readonly Check[] {
  return [ci1Structure, ci2Ids, ci3Traceability, ci4Staleness, ci7OwnershipCoverage(diff), ci8Links, ci9CommitDiscipline(diff)]
}
```

And re-export the type next to `CatalogEntry`:

```typescript
export type { CatalogEntry, CommitFacts }
```

In `src/cli/validate.ts`, import `changedLines` and add the third fact:

```typescript
const diff =
  base === null
    ? null
    : {
        base,
        changed: changedPaths(root, base, run),
        messages: commitMessages(root, base, run),
        edits: changedLines(root, base, run),
      }
```

In `src/checks/catalog.ts`, at the end of the array:

```typescript
  {
    id: 'CI-9',
    name: 'commit discipline',
    command: 'living-docs validate',
    failsWhen:
      'With `--base <ref>`: the diff changes only the review date of `last-reviewed-bump-limit` documents or more, with no other change in the body of any of them; or it changes an artifact file and no commit message of the diff cites one of the IDs declared in it.',
  },
```

Update the three tests of `test/checks/registry.test.ts` that enumerate the
checks: the `esperado` map gains `'CI-9': 'living-docs validate'`, the two
ID `assert.deepEqual`s now expect
`['CI-1', 'CI-2', 'CI-3', 'CI-4', 'CI-7', 'CI-8', 'CI-9']`, and in the
`RF-0011` test the example diff gains `edits: []`.

Regenerate the contract (never edit it by hand — `HK-2` denies):

```bash
docker compose exec toolkit node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
./bin/living-docs drift
```

Expected: `drift` with no finding.

- [x] **Step 10: The acceptance test of criteria 7 and 8**

Add to `test/acceptance/spec-criteria.test.ts`. Note the shape of the fake git:
it now dispatches **three** commands, because `validate --base` asks git
three questions — paths, messages and lines.

```typescript
const fakeGit =
  (changed: string[], messages: string[], patch = '') =>
  (args: readonly string[]): string => {
    if (args.includes('log')) return messages.join(`${NUL}\n`) + NUL + '\n'
    if (args.includes('--unified=0')) return patch
    return changed.join(NUL) + NUL
  }

const bumpPatch = (paths: string[]): string =>
  paths
    .flatMap(path => [
      `diff --git a/${path} b/${path}`,
      `--- a/${path}`,
      `+++ b/${path}`,
      '@@ -5 +5 @@',
      '-last-reviewed: 2026-01-01',
      '+last-reviewed: 2026-08-31',
    ])
    .join('\n')

const REGRAS_COM_RN_0001 = [
  '---',
  'title: Rules',
  'owner: "@time"',
  'trigger: Before implementing new behavior.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## RN-0001 — Cents round up',
  '',
  '- **status:** draft',
  '',
  'Prose.',
  '',
].join('\n')

const OWNERSHIP_COM_REGRAS = [
  'version: 1',
  'artifacts:',
  '  - id-prefix: RN',
  '    path: docs/requirements/rules.md',
  '    owner: "@time"',
  '    skill: requirements-keeper',
  '    collection: sections',
  'documents:',
  '  - path: docs/.ownership.yml',
  '    owner: "@time"',
  '    skill: living-docs-bootstrap',
  '',
].join('\n')

test('criteria 7 and 8 of spec §12: commit discipline is enforced in the CI', () => {
  const arvore = {
    [OWNERSHIP_PATH]: OWNERSHIP_COM_REGRAS,
    CODEOWNERS: 'docs/    @time\n',
    'docs/requirements/rules.md': REGRAS_COM_RN_0001,
  }

  withTempRepo(arvore, root => {
    // Criterion 7 — three documents that only changed the date.
    const bumps = ['docs/a.md', 'docs/b.md', 'docs/c.md']
    const massa = runValidate(root, 'origin/master', fakeGit(bumps, ['chore: general review'], bumpPatch(bumps)))
    const bumpFinding = massa.findings.find(f => f.ruleId === 'CI-9' && /last-reviewed/.test(f.message))
    assert.ok(bumpFinding, JSON.stringify(massa.findings, null, 2))
    assert.equal(massa.exitCode, 1)

    // Criterion 8 — artifact changed without the ID in the message.
    const semCitacao = runValidate(root, 'origin/master', fakeGit(['docs/requirements/rules.md'], ['docs: adjust the prose']))
    assert.ok(
      semCitacao.findings.some(f => f.ruleId === 'CI-9' && /RN-0001/.test(f.message)),
      JSON.stringify(semCitacao.findings, null, 2),
    )

    // And citing the ID in any commit of the diff is enough.
    const comCitacao = runValidate(root, 'origin/master', fakeGit(['docs/requirements/rules.md'], ['docs(RN-0001): the negative case']))
    assert.deepEqual(
      comCitacao.findings.filter(f => f.ruleId === 'CI-9'),
      [],
    )

    // Without a base, CI-9 does not run.
    assert.deepEqual(
      runValidate(root).findings.filter(f => f.ruleId === 'CI-9'),
      [],
    )
  })
})
```

If `OWNERSHIP_PATH`, `NUL` or `withTempRepo` are already imported in the file,
do not duplicate them.

- [x] **Step 11: Run everything and fix what the change revealed**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
```

Two expected effects, and both are the check working:

1. Every test that called `runValidate(root, base, fake)` with a single-output
   runner now receives that same output on the `--unified=0` question. Change them
   to the `fakeGit` shape of Step 10 — dispatch by argument, not by
   position.
2. If `validate --base origin/master` reports `CI-9` on an artifact of this branch,
   **do not** loosen the check or lower the threshold: the message of that commit is
   the one that did not cite the ID, and the way out is to cite it in the next commit.

- [x] **Step 12: The Definition of Done stops calling this human**

In `docs/definition-of-done.md`, change the citation line:

```markdown
- [ ] The commit message cites the affected ID — verification: `CI-9` (`living-docs validate --base <ref>`).
```

And in the last line of the list, change the named set to
``verification: `CI-1` to `CI-9`, run by the repository's workflow.``

- [x] **Step 13: CHANGELOG and commit**

Under `### Added` of `CHANGELOG.md`:

```markdown
- `CI-9` (`living-docs validate --base <ref>`): fails the diff that only changes the
  review date of several documents, and the one that changes an artifact file without
  any commit message citing an ID declared in it.
- `last-reviewed-bump-limit` in `docs/.ownership.yml`: how many documents with a
  bare date bump fail. Default 3, floor 2.
```

```bash
git add src/git/diff.ts src/config/ownership.ts src/checks/ci9-commit-discipline.ts \
        src/checks/registry.ts src/checks/catalog.ts src/cli/validate.ts \
        docs/contracts/checks.gen.md docs/definition-of-done.md \
        test/checks/ci9-commit-discipline.test.ts test/checks/registry.test.ts \
        test/git/diff.test.ts test/config/ownership.test.ts \
        test/acceptance/spec-criteria.test.ts CHANGELOG.md
git commit -m "feat(RN-0027, RN-0028): CI-9 enforces mass bump and the ID in the commit message"
```

---

### Task 12: `CI-10` — the artifact's trigger and the owning skill's `description` say the same thing

**Objective:** `L-6`. §11 of the original spec says the two "say the same
thing" and nothing compares them: `test/plugin/authoring.test.ts` validates the `description`,
`CI-1` validates the `trigger`, and nothing crosses the two. Closes acceptance criterion 9.

**Files:**

- Create: `src/checks/ci10-trigger-routing.ts`
- Modify: `src/checks/registry.ts` (`ci10` in the `validate` list)
- Modify: `src/checks/catalog.ts` (`CI-10` entry)
- Modify: `docs/contracts/checks.gen.md` (**regenerated**, never edited)
- Modify: `docs/decisions/adr/ADR-0013-the-two-closing-thresholds.md`
  (the calibration, now measured)
- Modify: `docs/definition-of-done.md` (the named set in the last line)
- Create: `test/checks/ci10-trigger-routing.test.ts`
- Modify: `test/checks/registry.test.ts`
- Modify: `test/acceptance/spec-criteria.test.ts` (criterion 9)
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `normalizeProse` (`src/docs/markdown.ts`), `parseFrontmatter`,
  `toolkitRoot`, `ArtifactDoc`/`DocumentDoc`.
- Produces:
  - `SHARED_ROOTS_FLOOR`, `ROOT_FLOOR`, `ROOT_LENGTH` — the three numbers of
    `ADR-0013`, exported so the test cites them instead of repeating them
  - `rootsOf(text: string): Set<string>`
  - `sharedRoots(trigger: string, description: string): string[]`
  - `loadSkillDescriptions(root?: string): Map<string, string>`
  - `routedDocs(context: CheckContext): RoutedDoc[]`
  - `ci10TriggerRouting(descriptions?: ReadonlyMap<string, string>): Check`

**Requirements:**

- **Only the document's trigger enters** (`ADR-0013`). A `per-file` artifact stays
  out: each file of it is an **item**, and the `trigger` of an ADR is "Never.
  Immutable once accepted", which belongs to the item and not to the artifact. The
  collection containers (`table`, `sections`) and the `documents:` entries that
  declare a skill enter.
- **A document without a `trigger` is not a finding.** `CI-1` does not read `documents:`, and
  `CHANGELOG.md` and `CLAUDE.md` legitimately have no frontmatter with a trigger.
- **An owning skill missing from the toolkit root warns and moves on** (`RN-0029`). It is the only
  exception to "only `CI-4` warns" in spec §9, and it exists because a project may
  declare a skill of its own: failing on that would be the check demanding that every owner
  come from the plugin.
- **No volume count.** The check counts **divergence between two things
  that should agree**, not documents, lines or coverage (spec §13).
- The threshold lives in the code, exported and citing `ADR-0013` — it is the precedent of
  the `WORD_FLOOR` of `CI-7`.
- The `SKILL.md` reader lives **inside** `src/checks/ci10-trigger-routing.ts`,
  and not in a new directory: `src/checks/**` is already a watched path with an owning doc
  (`docs/requirements/rules.md`), and creating `src/plugin/` would inaugurate
  production code that no `watches` rule covers.

**`HK-5`:** `src/checks/**` asks for `docs/requirements/rules.md` (`RN-0029` travelled
in Task 2); `src/checks/catalog.ts` asks for `docs/contracts/checks.gen.md` and
`CHANGELOG.md`. The contract is regenerated in Step 5 and the CHANGELOG goes in Step 8.

- [x] **Step 1: Write the test (fails)**

Create `test/checks/ci10-trigger-routing.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci10TriggerRouting, loadSkillDescriptions, rootsOf, sharedRoots, SHARED_ROOTS_FLOOR } from '../../src/checks/ci10-trigger-routing.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
documents:
  - path: docs/glossary.md
    owner: "@time"
    skill: glossary-keeper
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
`

const container = (trigger: string): string =>
  [
    '---',
    'title: Open Decisions',
    'owner: "@time"',
    `trigger: ${trigger}`,
    'last-reviewed: 2026-08-31',
    '---',
    '',
    '| ID | Gap | Status | Opened |',
    '| --- | --- | --- | --- |',
    '',
  ].join('\n')

const ADR_CONGELADO = [
  '---',
  'id: ADR-0001',
  'title: X',
  'status: draft',
  'owner: "@time"',
  'trigger: Never. Immutable once accepted; a new decision supersedes it.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  'body',
  '',
].join('\n')

const DESCRICOES = new Map([
  ['decision-recorder', 'Use when someone bumps into a gap — behavior without a written rule — or when making a decision that is costly to reverse.'],
  ['glossary-keeper', 'Use when a new domain term appears in code, spec or conversation.'],
])

function contextFor(root: string) {
  const config = parseOwnership(OWNERSHIP)
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-31',
  }
}

test('RN-0029: a trigger and a description that speak of the same event pass', () => {
  const arvore = {
    'docs/open-decisions.md': container('Whenever someone bumped into a gap — behavior without a written rule.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  }

  withTempRepo(arvore, root => {
    assert.deepEqual(ci10TriggerRouting(DESCRICOES).run(contextFor(root)), [])
  })
})

test('RN-0029: a trigger that speaks of another event fails, naming both', () => {
  const arvore = {
    'docs/open-decisions.md': container('When the deploy breaks in production.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  }

  withTempRepo(arvore, root => {
    const findings = ci10TriggerRouting(DESCRICOES).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.ruleId, 'CI-10')
    assert.equal(findings[0]?.severity, 'error')
    assert.equal(findings[0]?.file, 'docs/open-decisions.md')
    assert.match(findings[0]?.message ?? '', /decision-recorder/)
    assert.match(findings[0]?.message ?? '', /deploy breaks/)
  })
})

test('ADR-0013: the trigger of an item never enters — a per-file artifact stays out', () => {
  const arvore = {
    'docs/open-decisions.md': container('Whenever someone bumped into a gap — behavior without a written rule.'),
    // "Never. Immutable once accepted" shares no root at all with the
    // description of decision-recorder, and it is still not a finding.
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  }

  withTempRepo(arvore, root => {
    const findings = ci10TriggerRouting(DESCRICOES).run(contextFor(root))
    assert.deepEqual(
      findings.filter(f => f.file.startsWith('docs/decisions/')),
      [],
    )
  })
})

test('RN-0029: an owning skill missing from the toolkit root warns and moves on', () => {
  const arvore = {
    'docs/open-decisions.md': container('Whenever someone bumped into a gap — behavior without a written rule.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
    'docs/glossary.md': [
      '---',
      'title: Glossary',
      'owner: "@time"',
      'trigger: New domain term in code, spec or conversation.',
      'last-reviewed: 2026-08-31',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  }

  // The description of glossary-keeper leaves the map: it is the repository that declared
  // a skill that the toolkit root does not have.
  const semGlossario = new Map([...DESCRICOES].filter(([name]) => name !== 'glossary-keeper'))

  withTempRepo(arvore, root => {
    const findings = ci10TriggerRouting(semGlossario).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.severity, 'warning')
    assert.equal(findings[0]?.file, 'docs/glossary.md')
    assert.match(findings[0]?.message ?? '', /glossary-keeper/)
  })
})

test('RN-0029: a document with no trigger in the frontmatter is not a finding', () => {
  const arvore = {
    'docs/open-decisions.md': container('Whenever someone bumped into a gap — behavior without a written rule.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
    // CHANGELOG.md has an owner and a skill and has no frontmatter. It is legitimate.
    'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
  }

  withTempRepo(arvore, root => {
    assert.deepEqual(ci10TriggerRouting(DESCRICOES).run(contextFor(root)), [])
  })
})

test('ADR-0013: the root is the word of five letters or more, truncated to six', () => {
  const raizes = rootsOf('Each changed **entry**, with punctuation!')
  assert.ok(raizes.has('change'), [...raizes].join(', '))
  assert.ok(raizes.has('entry'))
  // "Each" and "with" have fewer than five letters: they are not roots.
  assert.ok(!raizes.has('each'))
  assert.ok(!raizes.has('with'))
  // The truncation is what makes "changed" find "change".
  assert.deepEqual(sharedRoots('entry changed', 'the entry will change'), ['entry', 'change'])
})

test('ADR-0013: the toolkit root is readable, and its pairs fit the floor', () => {
  // Dogfooding, and it is the calibration of ADR-0013: if a pair of the toolkit's
  // own falls below the floor, the number is wrong — not the document.
  const descricoes = loadSkillDescriptions(toolkitRoot())
  assert.ok(descricoes.size >= 8, `only ${descricoes.size} skills read from the toolkit root`)
  assert.ok((descricoes.get('release-historian') ?? '').length > 0, 'the description of release-historian was not read')
  assert.ok(SHARED_ROOTS_FLOOR >= 2, 'the floor is written, and it is below what ADR-0013 set')

  // The twelve pairs of this repository, measured by the check and not repeated here:
  // repeating the `trigger` in a test would be the copy that RN-0010 refuses.
  const findings = runValidate(toolkitRoot()).findings.filter(f => f.ruleId === 'CI-10')
  assert.deepEqual(
    findings.filter(f => f.severity === 'error'),
    [],
    JSON.stringify(findings, null, 2),
  )
})
```

- [x] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0029"
```

Expected: FAILS — `src/checks/ci10-trigger-routing.ts` does not exist.

- [x] **Step 3: Implement `CI-10`**

Create `src/checks/ci10-trigger-routing.ts`:

```typescript
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { normalizeProse } from '../docs/markdown.ts'
import { parseFrontmatter } from '../frontmatter/parse.ts'
import { toolkitRoot } from '../core/roots.ts'

const RULE = 'CI-10'

/** A short word is not a root: "every", "with" and "that" would match everything (`ADR-0009`). */
export const ROOT_FLOOR = 5

/**
 * The truncation is what makes "changed" find "change" without the toolkit
 * learning the grammar of a language (`ADR-0013`).
 */
export const ROOT_LENGTH = 6

/**
 * How many roots the `trigger` and the `description` need to share
 * (`ADR-0013`). Written here, and not hidden in a comparison, because it is a
 * calibrated number: the fix for a false positive is a new ADR, never a local
 * exception.
 */
export const SHARED_ROOTS_FLOOR = 2

export function rootsOf(text: string): Set<string> {
  return new Set(
    normalizeProse(text)
      .split(' ')
      .filter(word => word.length >= ROOT_FLOOR)
      .map(word => word.slice(0, ROOT_LENGTH)),
  )
}

/** The roots the two texts have in common, in the order of the first. */
export function sharedRoots(trigger: string, description: string): string[] {
  const other = rootsOf(description)
  return [...rootsOf(trigger)].filter(root => other.has(root))
}

/**
 * The `description` of each skill at the **toolkit** root (`ADR-0003`).
 *
 * It is the only check that crosses the two roots: the artifact lives in the
 * validated repository and the skill lives in the toolkit. A missing directory returns an
 * empty map, and an empty map becomes a warning — never a failure.
 */
export function loadSkillDescriptions(root: string = toolkitRoot()): Map<string, string> {
  const dir = join(root, 'plugin', 'skills')
  const found = new Map<string, string>()

  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return found
  }

  for (const name of names) {
    let source: string
    try {
      source = readFileSync(join(dir, name, 'SKILL.md'), 'utf8')
    } catch {
      continue
    }

    let description: unknown
    try {
      description = parseFrontmatter(source)?.data.description
    } catch {
      continue // a SKILL.md with broken frontmatter is a finding of `authoring`, not of this check
    }
    if (typeof description === 'string') found.set(name, description)
  }

  return found
}

export interface RoutedDoc {
  file: string
  line: number
  skill: string
  trigger: string
}

function triggerOf(
  frontmatter: {
    data: Record<string, unknown>
    lines: Record<string, number>
  } | null,
): {
  trigger: string
  line: number
} | null {
  const value = frontmatter?.data.trigger
  if (typeof value !== 'string' || value.trim() === '') return null
  return { trigger: value, line: frontmatter?.lines.trigger ?? 1 }
}

/**
 * The (document, owning skill) pairs this check compares.
 *
 * A `per-file` artifact stays out on purpose: each file of it is an **item**,
 * and the `trigger` of an ADR — "Never. Immutable once accepted" — belongs to the item, not to the
 * artifact (`ADR-0013`). The collection containers and the entries of
 * `documents:` that declare a skill enter.
 */
export function routedDocs(context: CheckContext): RoutedDoc[] {
  const routed: RoutedDoc[] = []

  for (const doc of context.docs) {
    if (doc.rule.collection === 'per-file') continue
    const found = triggerOf(doc.frontmatter)
    if (found === null) continue
    routed.push({
      file: doc.file,
      line: found.line,
      skill: doc.rule.skill,
      trigger: found.trigger,
    })
  }

  for (const document of context.documents) {
    if (document.rule.skill === null) continue
    const found = triggerOf(document.frontmatter)
    if (found === null) continue
    routed.push({
      file: document.file,
      line: found.line,
      skill: document.rule.skill,
      trigger: found.trigger,
    })
  }

  return routed
}

/**
 * `CI-10` — trigger routing. The `trigger:` of a document and the `description:` of the
 * skill declared as its owner describe the same event (`RN-0029`). If they
 * diverge, the document declares a trigger that nothing fires: the trigger
 * mechanism and the skill routing stop meeting (spec §11).
 *
 * It does not count documents, lines or coverage: it counts **divergence between two
 * things that should agree** (spec §13).
 *
 * The descriptions come in by injection, like the executor in `CI-5` and the diff in
 * `CI-7`: the default reads the toolkit root, and the test passes a map.
 */
export function ci10TriggerRouting(descriptions: ReadonlyMap<string, string> = loadSkillDescriptions()): Check {
  return {
    id: RULE,
    name: 'trigger routing',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      for (const routed of routedDocs(context)) {
        const description = descriptions.get(routed.skill)

        // Warning, not failure: a project may declare a skill of its own, and failing
        // on that would be demanding that every owner come from the plugin (`RN-0029`).
        if (description === undefined) {
          findings.push({
            ruleId: RULE,
            file: routed.file,
            line: routed.line,
            severity: 'warning',
            message:
              `\`${routed.file}\` declares \`${routed.skill}\` as its owning skill, and the toolkit root has no ` +
              'skill with that name — the trigger of this document could not be crossed with the routing.',
            fix:
              `If \`${routed.skill}\` is a skill of this project, there is nothing to do. If it was meant to be the toolkit's, ` +
              'check the name in `plugin/skills/` (`RN-0029`).',
          })
          continue
        }

        const shared = sharedRoots(routed.trigger, description)
        if (shared.length >= SHARED_ROOTS_FLOOR) continue

        findings.push({
          ruleId: RULE,
          file: routed.file,
          line: routed.line,
          severity: 'error',
          message:
            `The \`trigger\` of \`${routed.file}\` ("${routed.trigger.trim().replace(/\s+/g, ' ').slice(0, 120)}") and the ` +
            `\`description\` of \`${routed.skill}\` speak of different events: ` +
            `${shared.length} root(s) in common, minimum ${SHARED_ROOTS_FLOOR}.`,
          fix:
            'Rewrite one of the two to name the same event — whoever maintains the document and whoever routes the skill ' +
            'need to be talking about the same thing, otherwise the document declares a trigger that nothing fires ' +
            `(\`RN-0029\`, \`ADR-0013\`; owning skill: ${routed.skill}).`,
        })
      }

      return findings
    },
  }
}
```

- [x] **Step 4: Run and watch it pass**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0029|ADR-0013"
```

Expected: PASSES.

- [x] **Step 5: Wire it into `validate`, into the catalog and regenerate the contract**

In `src/checks/registry.ts`, import `ci10TriggerRouting` and add it to the end
of the `validateChecks` list:

```typescript
    ci9CommitDiscipline(diff),
    ci10TriggerRouting(),
```

In `src/checks/catalog.ts`, at the end of the array:

```typescript
  {
    id: 'CI-10',
    name: 'trigger routing',
    command: 'living-docs validate',
    failsWhen:
      'The `trigger` of a document and the `description` of the skill declared as its owner share fewer word roots than the declared floor. An owning skill missing from the toolkit root produces a warning, not a failure; and the `trigger` of a collection item is not compared.',
  },
```

Update `test/checks/registry.test.ts`: the `esperado` map gains
`'CI-10': 'living-docs validate'`, and the two ID `assert.deepEqual`s now
expect `['CI-1', 'CI-2', 'CI-3', 'CI-4', 'CI-7', 'CI-8', 'CI-9', 'CI-10']`.

The test "the catalog is read by people: it stays sorted by ID" remains valid:
`CI-10` comes after `CI-9` because the sorting is numeric, not textual.

Regenerate the contract:

```bash
docker compose exec toolkit node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
./bin/living-docs drift
```

- [x] **Step 6: Run against this repository and fix the calibration of `ADR-0013`**

```bash
./bin/living-docs validate
```

Expected: no finding from `CI-10`. The twelve pairs of this repository were
measured and the tightest is `docs/contracts/errors.md` × `contract-keeper`, with
**three** roots (the Portuguese roots of "code", "output" and "meaning").

`ADR-0013` is `draft` — promotion is Task 16 —, and the calibration written
in it names the wrong pair. Fix the calibration block of the similarity
decision to what was measured:

```markdown
- **Calibration:** against the twelve pairs of this repository. The tightest pair
  is `docs/contracts/errors.md` × `contract-keeper`, with three roots (the
  Portuguese roots of "code", "output" and "meaning"); the loosest is `CONTRIBUTING.md` ×
  `working-agreements-keeper`, with seven. The floor is two, and the margin of one is
  deliberate: a pair that is born at the floor is a pair that any rewrite
  breaks.
```

This is **not** editing a frozen item: `HK-1` freezes `accepted`, and this ADR is
`draft`. If it has already been promoted, stop — the path is `superseded` and a new
ADR, and the number is not in this Task's list.

- [x] **Step 7: The acceptance test of criterion 9**

Add to `test/acceptance/spec-criteria.test.ts`:

```typescript
test('criterion 9 of the closing spec: trigger and routing are crossed in the CI', () => {
  const ownership = [
    'version: 1',
    'artifacts:',
    '  - id-prefix: DA',
    '    path: docs/open-decisions.md',
    '    owner: "@time"',
    '    skill: decision-recorder',
    '    collection: table',
    'documents:',
    '  - path: docs/.ownership.yml',
    '    owner: "@time"',
    '    skill: living-docs-bootstrap',
    '',
  ].join('\n')

  const decisoes = (trigger: string): string =>
    [
      '---',
      'title: Open Decisions',
      'owner: "@time"',
      `trigger: ${trigger}`,
      'last-reviewed: 2026-08-31',
      '---',
      '',
      '| ID | Gap | Status | Opened |',
      '| --- | --- | --- | --- |',
      '',
    ].join('\n')

  // Divergent: fails, naming both.
  withTempRepo(
    {
      [OWNERSHIP_PATH]: ownership,
      CODEOWNERS: 'docs/    @time\n',
      'docs/open-decisions.md': decisoes('When the deploy breaks in production.'),
    },
    root => {
      const result = runValidate(root)
      const finding = result.findings.find(f => f.ruleId === 'CI-10')
      assert.ok(finding, JSON.stringify(result.findings, null, 2))
      assert.equal(finding?.severity, 'error')
      assert.match(finding?.message ?? '', /decision-recorder/)
      assert.equal(result.exitCode, 1)
    },
  )

  // A skill the toolkit root does not have: warns and moves on.
  withTempRepo(
    {
      [OWNERSHIP_PATH]: ownership.replace('skill: decision-recorder', 'skill: team-decisions'),
      CODEOWNERS: 'docs/    @time\n',
      'docs/open-decisions.md': decisoes('When the deploy breaks in production.'),
    },
    root => {
      const result = runValidate(root)
      const finding = result.findings.find(f => f.ruleId === 'CI-10')
      assert.equal(finding?.severity, 'warning')
      assert.equal(result.exitCode, 0)
    },
  )
})
```

- [x] **Step 8: Run everything, CHANGELOG and commit**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
./bin/living-docs drift
```

In `docs/definition-of-done.md`, the last line now names
``verification: `CI-1` to `CI-10`, run by the repository's workflow.``

Under `### Added` of `CHANGELOG.md`:

```markdown
- `CI-10` (`living-docs validate`): the `trigger` of a document and the
  `description` of the skill declared as its owner must speak of the same
  event. An owning skill that does not exist at the toolkit root produces a warning, not a failure.
```

```bash
git add src/checks/ci10-trigger-routing.ts src/checks/registry.ts src/checks/catalog.ts \
        docs/contracts/checks.gen.md docs/definition-of-done.md \
        docs/decisions/adr/ADR-0013-the-two-closing-thresholds.md \
        test/checks/ci10-trigger-routing.test.ts test/checks/registry.test.ts \
        test/acceptance/spec-criteria.test.ts CHANGELOG.md
git commit -m "feat(RN-0029, ADR-0013): CI-10 crosses the artifact's trigger with the owning skill's description"
```

---

### Task 13: The set of checks fits under a declared ceiling — and measured

**Objective:** The second half of `L-8`. §9 of the spec requires the checks to run
"in minutes, on the PR" and nothing measures. `RNF-0001` covers the hook's 5 s ceiling and
says nothing about the check. Closes acceptance criterion 10.

**Files:**

- Create: `src/checks/budget.ts`
- Modify: `src/cli/validate.ts`, `src/cli/drift.ts`, `src/cli/changelog.ts`
  (each result now carries what it measured)
- Modify: `src/cli/index.ts` (the report, and the `--stage` text)
- Create: `test/checks/budget.test.ts` — it is the acceptance test of criterion 10:
  the measurement is of the set, against the real corpus, and it is what enforces the ceiling
- Modify: `test/cli/validate.test.ts` (the new field in the result)
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: `runValidate`, `runDrift`, `runChangelog`.
- Produces:
  - `CHECK_BUDGET_MS` (`src/checks/budget.ts`)
  - `formatElapsed(ms: number): string`
  - `ValidateResult.elapsedMs`, `DriftResult.elapsedMs`,
    `ChangelogResult.elapsedMs`

**Requirements:**

- **The ceiling belongs to the set, not to each check** (`RNF-0005`): it is the set
  that runs on the PR. A ceiling per check would approve eight slow checks.
- **Measured, never estimated.** The CLI measures the real execution and prints what it measured,
  on every execution. A budget that nobody measures is an intention.
- **What fails is the test, not `validate`.** A `validate` that exited with 1
  for slowness would trade an enforcement for an unstable test: the consumer's
  runner is not the toolkit's, and failing a correct PR because the machine
  was loaded is worse than not measuring. The CLI **reports** — and says so loudly when
  it went over the ceiling; it is the test that **enforces**, against the real corpus of this
  repository.
- **The ceiling does not count volume** (spec §13): it measures execution time, which is a
  property of the system, not the size of the documentation.
- The declared ceiling is **120 000 ms** for the set. It is "minutes, on the PR" with an
  order of magnitude of slack over the real measurement — and that is what it needs to
  catch: an order-of-magnitude regression, not machine noise.

**`HK-5`:** `src/checks/**` asks for `docs/requirements/rules.md`; `src/cli/**` asks for
`docs/requirements/functional.md` and `CHANGELOG.md`. `RNF-0005` travelled in Task 2
and the CHANGELOG goes in Step 6.

- [x] **Step 1: Write the budget test (fails)**

Create `test/checks/budget.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECK_BUDGET_MS, formatElapsed } from '../../src/checks/budget.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { runDrift } from '../../src/cli/drift.ts'
import { runChangelog } from '../../src/cli/changelog.ts'
import { toolkitRoot } from '../../src/core/roots.ts'

const NUL = String.fromCharCode(0)

/** This test's fake git: the measured cost is the checks', not git's. */
const git = (args: readonly string[]): string => {
  if (args.includes('log')) return `docs(RN-0001): x${NUL}\n`
  if (args.includes('--unified=0')) return ''
  return `src/cli/index.ts${NUL}CHANGELOG.md${NUL}`
}

test('RNF-0005: the complete set of checks fits under the declared ceiling, measured', () => {
  const root = toolkitRoot()
  const inicio = process.hrtime.bigint()

  // The set is what runs on the PR: the two executions of `validate`, `drift`
  // with the real generator, and `changelog`. It is not the time of one check.
  runValidate(root)
  runValidate(root, 'origin/master', git)
  runDrift(root)
  runChangelog(root, 'origin/master', git)

  const decorrido = Number(process.hrtime.bigint() - inicio) / 1e6

  assert.ok(
    decorrido < CHECK_BUDGET_MS,
    `the set took ${formatElapsed(decorrido)}, and the declared ceiling is ${formatElapsed(CHECK_BUDGET_MS)} ` + '(RNF-0005) — measure before raising the ceiling',
  )
})

test('RNF-0005: each command returns what it measured, and the measurement is not estimated', () => {
  const root = toolkitRoot()

  const validado = runValidate(root)
  assert.equal(typeof validado.elapsedMs, 'number')
  assert.ok(validado.elapsedMs >= 0)
  // A scan of the whole tree does not cost zero: a zeroed measurement is a
  // measurement that nobody took.
  assert.ok(validado.elapsedMs > 0, 'elapsedMs came back zeroed — the clock was not read')

  assert.equal(typeof runDrift(root).elapsedMs, 'number')
})

test('RNF-0005: formatElapsed is readable by whoever reads the PR log', () => {
  assert.equal(formatElapsed(842), '842 ms')
  assert.equal(formatElapsed(1500), '1.5 s')
  assert.equal(formatElapsed(120_000), '120.0 s')
})
```

- [x] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RNF-0005"
```

Expected: FAILS — `src/checks/budget.ts` does not exist.

- [x] **Step 3: Declare the ceiling**

Create `src/checks/budget.ts`:

```typescript
/**
 * The time ceiling of the **set** of checks (`RNF-0005`, spec §9).
 *
 * Of the set, and not of each check: it is the set that runs on the PR, and a ceiling per
 * check would approve eight slow checks. The three known candidates to blow through it
 * are `CI-5` (runs a subprocess), `CI-7` (compares sentence with sentence) and `CI-8`
 * (scans the whole corpus).
 *
 * Two minutes is "minutes, on the PR" with an order of magnitude of slack over the real
 * measurement of this repository — and that is what a budget needs to catch:
 * an order-of-magnitude regression, not the noise of a loaded machine. Raising this
 * number without a new measurement beside it is turning it back into an intention.
 */
export const CHECK_BUDGET_MS = 120_000

/** Milliseconds the way whoever reads the PR log reads them. */
export function formatElapsed(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}
```

- [x] **Step 4: Measure in each command**

In the three CLIs, the pattern is the same — mark the start, measure the end, return.

In `src/cli/validate.ts`: add `elapsedMs: number;` to `ValidateResult`
(with the comment `/** How long the set of checks took, measured (RNF-0005). */`),
and inside `runValidate`:

```typescript
const inicio = process.hrtime.bigint()
```

right before `forgetTree(root);`, and in the `return`:

```typescript
    elapsedMs: Number(process.hrtime.bigint() - inicio) / 1e6,
```

Repeat in `src/cli/drift.ts` (`DriftResult`) and in `src/cli/changelog.ts`
(`ChangelogResult`) — including the short return of `changelog` when
`consumerVisiblePaths` is empty, otherwise the field lies when the command
does nothing.

- [x] **Step 5: Report the measurement, and fix the `--stage` text**

In `src/cli/index.ts`, import `CHECK_BUDGET_MS` and `formatElapsed`, and write
a single function, used by the three commands:

```typescript
/**
 * The report of the measurement (`RNF-0005`). It comes out on every execution: a budget that only
 * shows up when it blows is a budget that nobody knows exists.
 *
 * It does not change the exit code. What fails for slowness is the budget test,
 * against this repository's corpus — a `validate` that exited with 1 because the
 * machine was loaded would trade an enforcement for an unstable test.
 */
function reportElapsed(elapsedMs: number): void {
  process.stdout.write(`living-docs: set of checks in ${formatElapsed(elapsedMs)} ` + `(declared ceiling: ${formatElapsed(CHECK_BUDGET_MS)} — RNF-0005).\n`)
  if (elapsedMs > CHECK_BUDGET_MS) {
    process.stderr.write('living-docs: the set went over the declared ceiling. Measure what got slow before raising the number ' + '(RNF-0005).\n')
  }
}
```

Call `reportElapsed(result.elapsedMs)` right before each `return
result.exitCode;` of `validate`, `drift` and `changelog` — including the short
returns, which also measured.

And, in `USAGE`, the `--stage` line still lists three stages while the CLI
has accepted four since Task 8. Change it to:

```
  --stage <stage>     Minimum set to install: solo (default), small-team, production or multi-team
```

- [x] **Step 6: Run everything, CHANGELOG and commit**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Expected: the last line of `validate` carries the measurement. Note the number in the body of the
commit — it is the first recorded measurement, and it is what the next one is compared against.

If any test in `test/cli/` compares the whole `ValidateResult` with
`assert.deepEqual`, it breaks because of the new field: compare field by field,
never pin the measured value.

Under `### Added` of `CHANGELOG.md`:

```markdown
- `validate`, `drift` and `changelog` now report how long the set of checks
  took and what the declared ceiling is (`RNF-0005`). The measurement does not change the exit
  code.
```

Under `### Fixed`:

```markdown
- `living-docs --help` now lists `multi-team` among the `--stage` stages; the CLI
  already accepted it.
```

```bash
git add src/checks/budget.ts src/cli/validate.ts src/cli/drift.ts src/cli/changelog.ts \
        src/cli/index.ts test/checks/budget.test.ts test/cli/validate.test.ts CHANGELOG.md
git commit -m "feat(RNF-0005): the set of checks gains a declared ceiling and a measurement on every execution"
```

---

### Task 14: The Definition of Done receives what only people verify

**Objective:** Acceptance criteria 9 and 10 of the **original** spec — the two that
§2 of this spec left **out** of scope for being human verification by
nature. They do not gain a check: they gain a line marked human, said as such. A
check that pretended to measure them would be worse than its absence (§11,
anti-requirements).

**Files:**

- Modify: `docs/definition-of-done.md`
- Modify: `test/docs/maintenance.test.ts`

**Interfaces:**

- Consumes: nothing. It is a document and the test that reads it.
- Produces: no signature.

**Requirements:**

- Each item of the Definition of Done **names what verifies it** — it is `RN-0017`, and
  `CI-7` fails an item that does not name one. "verification: human" satisfies the rule: the accepted
  vocabulary includes the word, and that is deliberate.
- **Do not invent `CI-11`.** "An agent went wrong for lack of context" is not
  observable by machine, and "no document-volume metric" is the absence
  of a thing. Counting either would be the check that the spec refuses.
- The test guarantees that the two items remain **marked as human** — if
  someone swaps them for a check ID in the future, the test says what happened.

**`HK-5`:** no watched path is touched.

- [x] **Step 1: Write the test (fails)**

Add to `test/docs/maintenance.test.ts`, which already has `ROOT`, `CONFIG` and
`documentWithRole` at the top. The path comes from the **role**, never guessed — it is the
same rule the rest of the file already practices:

```typescript
test('spec §12 criteria 9 and 10: what only people verify enters as a human line', () => {
  const documento = documentWithRole(CONFIG, 'definition-of-done')
  assert.ok(documento)
  const dod = readFileSync(join(ROOT, documento.path), 'utf8')

  const humanos = [/lack of context/i, /document-volume/i]
  for (const padrao of humanos) {
    const linha = dod.split('\n').find(l => padrao.test(l))
    assert.ok(linha, `the Definition of Done does not have the line for ${padrao}`)
    assert.match(linha ?? '', /^- \[ \] /, 'must be a checklist item')
    assert.match(
      linha ?? '',
      /verification: human/,
      'these two are human verification by nature — a check that pretended to measure them would be worse than its absence',
    )
    assert.doesNotMatch(linha ?? '', /\bCI-\d+\b/, 'no check measures these two')
  }
})
```

- [x] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="criteria 9 and 10"
```

Expected: FAILS — the lines do not exist.

- [x] **Step 3: Write the two lines**

In `docs/definition-of-done.md`, at the end of the list of items, before the
`## What this list is not` section:

```markdown
- [ ] No agent and no person went wrong for lack of context that would have fit in an existing artifact — and, when they did, the owning artifact gained the missing line — verification: human (spec §12, criterion 9).
- [ ] No document-volume metric was used as a quality signal: neither page counts, nor coverage, nor "documenting what was done" — verification: human (spec §12, criterion 10).
```

Both name what verifies them, as `RN-0017` requires, and what verifies them is
people. It is not an enforcement gap: it is the only honest enforcement these two
admit, and §11 of the original spec already admits a checklist item verifiable only
by people, said explicitly.

- [x] **Step 4: Run everything**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate
```

Expected: no finding. If `CI-7` reports an item without a named verification, the word
"verification" left the line — put it back; do not invent a check ID.

- [x] **Step 5: Commit**

```bash
git add docs/definition-of-done.md test/docs/maintenance.test.ts
git commit -m "docs(RN-0017): criteria 9 and 10 of the spec enter as a human line in the Definition of Done

Docs: none — the Definition of Done is the owning doc of this change"
```

---

### Task 15: Adopting the real consumer — the proof, not the experiment

**Objective:** Acceptance criterion 12, which is the only item whose result can
**invalidate** a decision of this spec. The consumer has 97 rules with IDs without
a hyphen already cited in their tests, two open decisions in prose, an empty `docs/adr/`,
hooks of their own registered, CI per directory and no Docker,
`docs/architecture/` and `docs/domains/` (layer 4), and no CODEOWNERS. The
installation crosses all of that **without rewriting a file of theirs**.

And the layer 4 test is binary: **if adopting it requires touching any check, the
extension point was not what the spec said it was**. That result is a
deliverable, whichever it is.

**Files:**

- Modify: `test/acceptance/consumer-repo.test.ts`
- Modify: `CHANGELOG.md` (only if something public changes — see Step 6)

**Interfaces:**

- Consumes: `runInit`, `runValidate`, `mergeSettings`, `WORKFLOW_PATH`,
  `SETTINGS_PATH`, `DetectedFormat`.
- Produces: no signature. It produces a **proof**.

**Requirements:**

- **No pre-existing file is rewritten.** The test takes a fingerprint
  (byte-for-byte content) of everything that existed before `init` and compares afterwards.
  Any difference fails — it is criterion 1 of the original spec.
- **No check changes in this task.** This task's commit cannot touch
  `src/checks/**`. If making layer 4 pass requires changing a check, **stop
  and write down the finding**: it is the result that invalidates §8 of the closing spec, and
  it is worth more than the green test.
- **Layer 4 enters with an owner and without a skill** — the category this repository
  already uses for plans, spec and README. It gains an owner, a verified link and enforcement of
  review; it does not gain a keeper, a state machine or an ID family.
- **The prose status of the open decisions is not converted automatically.**
  Turning it into a state of the machine is a human act. The test pins that `init` does **not**
  rewrite it.
- The consumer does not run Docker: the installed workflow receives `--invoke` and does not
  mention Docker (`RNF-0002` is a rule of this toolkit, not of whoever installs it).

**`HK-5`:** no watched path is touched, and that is how it has to be — this
task only writes tests.

- [x] **Step 1: Assemble the consumer, with everything they have today**

The file already imports `runInit`, `runValidate`, `toolkitRoot`, `withTempRepo`,
`DEFAULT_ID_FORMAT` and the `node:fs` utilities. Add to the imports block
what is missing:

```typescript
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { SETTINGS_PATH } from '../../src/config/claude-settings.ts'
import { WORKFLOW_PATH } from '../../src/cli/init.ts'
```

And, at the top of the file:

```typescript
/** The consumer's 97 rules, written the way they write them: `RN001`. */
const REGRAS_DO_CONSUMIDOR = [
  '---',
  'title: Business rules',
  'owner: "@consumer"',
  'trigger: >',
  '  Before implementing any behavior, and on every new or changed rule.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '# Business rules',
  '',
  ...Array.from({ length: 97 }, (_, i) => {
    const id = `RN${String(i + 1).padStart(3, '0')}`
    return [`## ${id} — Rule number ${i + 1}`, '', '- **status:** active', '', 'Prose of the rule.', ''].join('\n')
  }),
].join('\n')

const DECISOES_EM_PROSA = [
  '---',
  'title: Open decisions',
  'owner: "@consumer"',
  'trigger: >',
  '  Whenever someone bumped into a gap — behavior without a written rule.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## DA001 — How to round cents',
  '',
  '- **status:** open',
  '',
  '**Context:** billing rounds today in three ways.',
  '**Alternatives:** up, banker\'s, truncate.',
  '**Recommendation:** banker\'s.',
  '**Situation:** still under discussion with finance.',
  '',
  '## DA002 — Closing time zone',
  '',
  '- **status:** open',
  '',
  '**Context:** the closing runs in UTC and the report goes out in BRT.',
  '**Situation:** waiting for the data team.',
  '',
].join('\n')

/** The `.claude/settings.json` the consumer already has, with hooks of their own. */
const SETTINGS_DO_CONSUMIDOR = JSON.stringify(
  {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [{ type: 'command', command: './scripts/audit.sh' }],
        },
      ],
    },
    extraKnownMarketplaces: {
      'internal-team': {
        source: { source: 'github', repo: 'time/plugins' },
      },
    },
  },
  null,
  2,
)

const WORKFLOW_DO_CONSUMIDOR = [
  'name: api',
  'on:',
  '  pull_request:',
  '    paths: ["services/api/**"]',
  'jobs:',
  '  test:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: npm ci && npm test',
  '',
].join('\n')

const CONSUMIDOR = {
  'docs/regras-de-negocio.md': REGRAS_DO_CONSUMIDOR,
  'docs/decisoes-em-aberto.md': DECISOES_EM_PROSA,
  'docs/adr/.gitkeep': '',
  'docs/architecture/context.md': '# Context\n\nC4 level 1 design.\n',
  'docs/domains/billing.md': '# Billing\n\nInvariants of the domain.\n',
  'test/billing.test.ts': "test('RN001: rounds up', () => {});\n",
  '.claude/settings.json': SETTINGS_DO_CONSUMIDOR,
  '.github/workflows/api.yml': WORKFLOW_DO_CONSUMIDOR,
  'README.md': '# consumer\n',
}

/** Byte-for-byte fingerprint of the tree, to prove that nothing pre-existing changed. */
function impressao(root: string, arquivos: readonly string[]): Record<string, string> {
  const registro: Record<string, string> = {}
  for (const arquivo of arquivos) registro[arquivo] = readFileSync(join(root, arquivo), 'utf8')
  return registro
}

const OPCOES_DO_CONSUMIDOR = {
  owner: '@consumer',
  dryRun: false,
  stage: 'production' as const,
  idFormat: { separator: '', padding: 3 },
  // The consumer does not run Docker: this is how they call the CLI.
  invoke: 'npx living-docs',
  marketplace: 'time/living-docs',
}
```

- [x] **Step 2: Write the criterion 12 test (fails)**

Still in `test/acceptance/consumer-repo.test.ts`:

```typescript
test('criterion 12: the real consumer is adopted, and no file of theirs is rewritten', () => {
  withTempRepo(CONSUMIDOR, root => {
    const preexistentes = Object.keys(CONSUMIDOR).filter(p => p !== 'docs/adr/.gitkeep')
    const antes = impressao(root, preexistentes)

    // --dry-run first: the inventory reports the form it found, and does not
    // adopt it in silence (RF-0014).
    const seco = runInit(root, {
      ...OPCOES_DO_CONSUMIDOR,
      idFormat: DEFAULT_ID_FORMAT,
      dryRun: true,
    })
    assert.ok(seco.detected, 'the inventory did not report the consumer\'s written form')
    assert.equal(seco.detected?.format.separator, '')
    assert.equal(seco.detected?.format.padding, 3)
    assert.ok((seco.detected?.count ?? 0) >= 97, `only ${seco.detected?.count} occurrences read`)
    assert.deepEqual(impressao(root, preexistentes), antes, '--dry-run wrote to the repository')

    // Now the installation, with the form declared.
    const result = runInit(root, OPCOES_DO_CONSUMIDOR)

    // 1 — nothing pre-existing was rewritten.
    assert.deepEqual(impressao(root, preexistentes), antes, 'init rewrote a pre-existing file')

    // 2 — the rules and the decisions were ADOPTED, not recreated.
    const adotados = result.adopted.map(e => e.path)
    assert.ok(adotados.includes('docs/regras-de-negocio.md'), JSON.stringify(result.adopted))
    assert.ok(adotados.includes('docs/decisoes-em-aberto.md'), JSON.stringify(result.adopted))
    assert.ok(!existsSync(join(root, 'docs/requirements/rules.md')), 'init created a parallel one')
    assert.ok(!existsSync(join(root, 'docs/open-decisions.md')), 'init created a parallel one')

    // 3 — the empty ADR directory is born adopted.
    assert.ok(adotados.includes('docs/adr/'), JSON.stringify(result.adopted))

    // 4 — the consumer's hooks and workflow are still there, and the toolkit's came in.
    const settings = JSON.parse(readFileSync(join(root, SETTINGS_PATH), 'utf8'))
    assert.ok(settings.hooks.PreToolUse.some((e: { matcher: string }) => e.matcher === 'Bash'))
    assert.ok(settings.extraKnownMarketplaces['internal-team'])
    assert.ok(settings.extraKnownMarketplaces['living-docs'])
    assert.ok(existsSync(join(root, '.github/workflows/api.yml')))
    assert.ok(existsSync(join(root, WORKFLOW_PATH)))

    // 5 — the installed workflow does not impose Docker on whoever installs.
    const workflow = readFileSync(join(root, WORKFLOW_PATH), 'utf8')
    assert.doesNotMatch(workflow, /docker/i)
    assert.match(workflow, /npx living-docs validate/)

    // 6 — CODEOWNERS, which they did not have, was written.
    assert.ok(existsSync(join(root, 'CODEOWNERS')))

    // 7 — the prose status remains prose: turning it into a state is a human act.
    assert.match(readFileSync(join(root, 'docs/decisoes-em-aberto.md'), 'utf8'), /still under discussion/)

    // 8 — running again does not duplicate anything.
    const segunda = runInit(root, OPCOES_DO_CONSUMIDOR)
    assert.deepEqual(segunda.created, [], JSON.stringify(segunda.created))
    const settingsDepois = readFileSync(join(root, SETTINGS_PATH), 'utf8')
    assert.equal(settingsDepois.match(/living-docs@living-docs/g)?.length ?? 0, 1)
  })
})
```

- [x] **Step 3: Run and see what fails**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="criterion 12"
```

Expect failures of **path adoption**: `init` looks for the known paths
of each family, and `docs/regras-de-negocio.md` is already in the `RN` list
(`src/cli/init.ts`), but `docs/decisoes-em-aberto.md` and `docs/adr/` may not
be in those of `DA` and `ADR`.

If missing, add the path to that family's adoption list in
`src/cli/init.ts` — **that is adoption data, not a check**, and it is exactly what
`SK-0` step 1 says to do. If passing requires changing a **check**, stop:
see Step 6.

- [x] **Step 4: Layer 4 enters with an owner and without a skill**

Still in the same file, the second test — the binary one:

```typescript
test('criterion 12: layer 4 enters with an owner and without a skill, without any check changing', () => {
  withTempRepo(CONSUMIDOR, root => {
    runInit(root, OPCOES_DO_CONSUMIDOR)

    // Before declaring: the architecture documents fall into the CI-7 corpus and
    // fail for lack of an owner. It is the correct behavior — the corpus is everything
    // that lives under the documentation root, and not a list of known types.
    const semDono = runValidate(root)
    assert.ok(
      semDono.findings.some(f => f.ruleId === 'CI-7' && f.file.startsWith('docs/architecture/')),
      JSON.stringify(semDono.findings, null, 2),
    )

    // The declaration: owner, no skill. Nothing beyond that.
    const ownership = readFileSync(join(root, OWNERSHIP_PATH), 'utf8')
    writeFileSync(
      join(root, OWNERSHIP_PATH),
      `${ownership}\n  - path: docs/architecture/\n    owner: "@consumer"\n  - path: docs/domains/\n    owner: "@consumer"\n`,
      'utf8',
    )
    // And CODEOWNERS, which CI-7 also enforces.
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')
    writeFileSync(join(root, 'CODEOWNERS'), `${codeowners}docs/architecture/    @consumer\ndocs/domains/    @consumer\n`, 'utf8')

    const result = runValidate(root)
    assert.deepEqual(
      result.findings.filter(f => f.file.startsWith('docs/architecture/') || f.file.startsWith('docs/domains/')),
      [],
      'layer 4 required more than an owner and a line in CODEOWNERS',
    )
    assert.equal(result.exitCode, 0, JSON.stringify(result.findings, null, 2))

    // Without an owning skill, CI-10 has no pair to cross: a document without a skill is not a finding.
    assert.deepEqual(
      result.findings.filter(f => f.ruleId === 'CI-10'),
      [],
    )
  })
})
```

Note the order in which `.ownership.yml` receives the two entries: they need to
fall **inside** the `documents:` block that `init` wrote. If the block is not the
last in the file, insert the lines in the right place instead of appending at the end —
misplaced YAML becomes an `OwnershipError`, and the finding would be about the test, not
about the toolkit.

- [x] **Step 5: Run everything**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
```

And the proof that no check changed:

```bash
git status --porcelain src/checks/
```

Expected: **empty output**. If there is any file there, go to Step 6.

- [x] **Step 6: If any check had to change, the finding is the deliverable**

Do not fix it in silence. Open the decision and stop:

```bash
./bin/living-docs validate    # confirm the finding that forced the change
```

Write the concrete case — which check, which document, what it demanded — and open
a `DA` through `decision-recorder` (`/open-decision`), citing §8 of the closing
spec: _"if adopting layer 4 requires touching any check, the extension
point was not what the spec said it was"_. The number comes from the skill, not from this
plan. That result invalidates a decision of the spec, and it is more valuable than a
green test.

- [x] **Step 7: Commit**

Only touch `CHANGELOG.md` if Step 3 added an adoption path in
`src/cli/init.ts` — then the change is visible to whoever installs:

```markdown
- `living-docs init` now recognizes `docs/decisoes-em-aberto.md` and `docs/adr/`
  among the paths it adopts when they already exist.
```

```bash
git add test/acceptance/consumer-repo.test.ts
git commit -m "test(RF-0001, RN-0024): the real consumer is adopted without rewriting any file"
```

---

### Task 16: The promotion — and it is not yours

**Objective:** Everything this plan wrote was born `draft`/`open`. Promoting is a
human act: `HK-3` intercepts, and the answer is not the agent's (spec §4, `CLAUDE.md`).
This task **promotes nothing**. It delivers the list, with what supports each
item, so that a person decides.

**Files:**

- None, by the agent. The files that the **person** may promote:
  `docs/decisions/adr/ADR-0011-*.md`, `ADR-0012-*.md`, `ADR-0013-*.md`,
  `docs/requirements/functional.md`, `docs/requirements/rules.md`,
  `docs/requirements/non-functional.md`.

**Interfaces:**

- Consumes: everything. It is the last task.
- Produces: a human decision, or the record that it has not yet been made.

**Requirements:**

- **No agent promotes state** (spec §4). If you are the agent executing this
  plan, Step 3 is where you stop.
- `DA-0003` remains `open` — it is a real gap, not a leftover of the
  process: how the toolkit reaches the CI and the session of whoever installs it was not
  decided, and `--invoke` and `--marketplace` are the consequence of that.

- [x] **Step 1: Confirm that everything is standing**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
./bin/living-docs drift
./bin/living-docs changelog --base origin/master
```

Expected: all five with no finding. Do not deliver with an open finding.

- [x] **Step 2: Assemble the list for whoever decides**

```bash
./bin/living-docs validate | tail -5
git log --oneline origin/master..HEAD
```

Write, in the PR description:

- **`ADR-0011`** — identity and written form of the ID. Supported by Task 15: a
  repository with 97 rules in `RN001` was adopted without a rewritten file.
- **`ADR-0012`** — what the stage parameterizes. Supported by Task 8:
  `multi-team` installs Phase 7, and nothing more.
- **`ADR-0013`** — the two thresholds. Supported by the measurement of Task 12: twelve
  pairs, the tightest with three roots over a floor of two.
- **`RF-0013`, `RF-0014`, `RN-0024` to `RN-0029`, `RNF-0005`** — each with the
  test that cites it, findable by `CI-3`.
- **`DA-0003`** — remains `open`, and it is meant to remain.

- [x] **Step 3: Stop**

The promotion from `draft` to `accepted`/`active` belongs to the human. `HK-3` intercepts the
edit of the `status` field and asks; the answer is not yours.

If you are a person reading this: promote what you accept, one item at a time, and
leave as `draft` what you have not yet decided. A promoted ADR is frozen — `HK-1`
blocks its body from then on, and the fix becomes `superseded` plus a new
ADR. It is that cost that makes promotion a decision, and not a step of the
process.
