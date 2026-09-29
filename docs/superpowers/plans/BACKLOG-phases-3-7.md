# Backlog — Phases 3 to 7 of the living documentation toolkit

Input for the next plan. Written when closing the plan for `DA-0001` + Phase 2
(`docs/superpowers/plans/2026-08-24-living-docs-toolkit-phase-2.md`), based on the
spec `LIVING-DOCUMENTATION-TOOLKIT.md` §10.

**State on 2026-08-24:** Phases 0–2 implemented (`CI-1`, `CI-2`, `CI-3`, `SK-0`
with `--stage`, `SK-3`, `SK-4`, `HK-1`, `HK-3`, `CM-1`–`CM-3`, `CM-6`), and the
separation of roots closed by `ADR-0003` (`DA-0001` resolved). Everything below
starts from there.

**State on 2026-08-25:** Phase 3 is **implemented** —
`docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-3.md`, the 9 tasks
executed and `RN-0008`–`RN-0010`/`RF-0004` promoted by human act. Phase 4
is **planned, not implemented** —
`docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-4.md`. The following
phases inherit the design decisions of the two (the `watches` API, the place
of `src/git/`, the `DA-0002` that Phase 3 discovered, and the identity by name of the
glossary term that Phase 4 recorded in `ADR-0004`). It is recorded in
each section below.

**State on 2026-08-25:** Phase 4 is **implemented** —
`docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-4.md`, the 8 tasks
executed and `ADR-0004`/`RF-0005`/`RN-0011` promoted by human act. The
`small-team` stage covers Phases 2, 3 and 4 in full in this version.

**State on 2026-08-25:** Phase 5 is **implemented** —
`docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-5.md`, the 9 tasks
executed; `ADR-0005` is `accepted` and `RF-0006`/`RF-0007`/`RN-0012` are
`active`, promoted by human act. The `production` stage already exists in this
version and installs the contracts frame.

**State on 2026-08-26:** Phase 6 is **implemented** —
`docs/superpowers/plans/2026-08-26-living-docs-toolkit-phase-6.md`, the 10 tasks
executed. Human promotion (Task 10): `RF-0008`, `RF-0009`, `RN-0013`,
`RN-0014` and `RN-0015` are `active`; `ADR-0006` remains `draft` by decision of
whoever reviewed — it has not been accepted yet. The `production` stage covers Phases 5 and
6 in full in this version, and `notInstalled` is empty.

**State on 2026-08-27:** Phase 7 is **implemented** —
`docs/superpowers/plans/2026-08-27-living-docs-toolkit-phase-7.md`, the 14 tasks
executed. The ten acceptance criteria of spec §12 are covered: the 7 (`CI-4`),
the 8 (`HK-6`) and the second half of the 5 (`CI-7` with `--base`) closed here.
`DA-0002` is `resolved` by `ADR-0008`. Human promotion (Task 14): record
here what was and what was not accepted — **do not assume**.

What the planning found out, and which holds for whoever continues:

- **There is no `--stage multi-team`, and the reason is structural.** Phase 7 does not
  install an artifact: it installs enforcement, which already ships with the toolkit and the
  plugin. The stage would have the same set of files as `production` — a label with
  nothing behind it, which is what the backlog itself called "a dead wiki born
  from the factory". What `CI-7` actually demanded of `init` was something else and holds
  for every stage: declare in `documents:` what it creates (`RF-0012`).
- **`DA-0002` became a new key, not a new prefix.** Making `id-prefix`
  optional in `artifacts:` would have pushed an `if` into `CI-1`, `CI-2`,
  `HK-1` and `HK-3` — the cost would fall on Phase 0, which is the part that should
  change the least (`ADR-0008`).
- **`role` in `documents:` is what lets `CI-7` find the agent contract and
  the Definition of Done without knowing any path.** This was not foreseen and
  is the piece without which two of the five classes of `CI-7` findings would not exist.
- **The severity of the `watches` signal in CI needed an ADR.** Spec §9 ("only
  `CI-4` warns"), `RN-0009` ("never blocks") and criterion 5 ("CI signals")
  did not fit together. `ADR-0010` decided error with an escape label, and the
  precedent was already in the repository since Phase 6: `CI-6` fails on an
  entry of `watches` with `Changelog: none — <reason>` as the way out.
- **`CI-4` needed two things, not one.** `CheckContext.today` was the
  expected one; the second was `pay-when`, because "observable payment trigger"
  in prose cannot be evaluated. A frozen item does not expire — without that rule, every accepted
  ADR would become a permanent warning and the way to silence the warning would be the bulk
  bump that spec §13 refuses.
- **The most likely false positive of `CI-8` is a link inside a code block**,
  and this repository has one (`](?:mente)` in a Phase 0 plan). `stripCode`
  exists because of it, and it closes the fence by length because a plan uses a fence of
  four backticks.

Each phase below carries: what it delivers, what it depends on, which engine piece does
not exist yet, and the risk that only shows up when someone tries to implement. The order is
that of spec §10 and it matters: each phase uses the enforcement that the previous one installed.

### Phase 3 — tie doc to the PR (mechanism 1) — **IMPLEMENTED**

`SK-6` working-agreements-keeper (`CONTRIBUTING.md`, `docs/definition-of-done.md`,
`CLAUDE.md`), `HK-4` (`PostToolUse` → injects the doc that owns the watched path) and
`HK-5` (`PreToolUse` on `git commit` → asks when the staged set touches a watched path
without the owning doc).

**Plan:** `docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-3.md`
(9 tasks, all executed). `RN-0008`, `RN-0009`, `RN-0010` and `RF-0004`
are `active`, promoted by human act.

**Depends on:** `watches` ceasing to be `[]` in `.ownership.yml` — today the field is
read and validated, and no rule fills it. It is the first work of the phase.
**Engine piece that is missing:** a `src/config/watches.ts` that answers "which docs
this set of paths requires", used by both hooks and, in Phase 7, by `CI-7`.
**Known risk:** `HK-5` intercepts `Bash`, not `Edit|Write` — it is the first
hook with a different matcher, and the current `run-hook.sh` passes the raw payload without
distinguishing the event. Check the `PreToolUse` contract for `Bash` beforehand.
**Acceptance criterion of spec §12 that the phase closes:** the 5.

**What the planning found out** (holds for whoever is going to execute, and for the following
phases that inherit):

- `run-hook.sh` **does not need to change**. It receives the hook name as an argument and
  invokes one file per hook; the file distinguishes the event, not the wrapper.
  The risk noted above dissolved — do not "improve" the wrapper for free: it is where
  the fail-open lives.
- `src/git/staged.ts` runs `git -c safe.directory=* diff --cached --name-only -z`.
  The `-z` is not a taste: without it git wraps in quotes and escapes paths with accents,
  and an escaped path matches no glob. The `safe.directory` is not either:
  the hook runs in the container with a uid different from the owner of the mounted checkout, and without
  it git refuses the repository and the hook goes silent precisely when it should speak.
- **Criterion 5 closes by half.** "`HK-5` asks and lists the pending ones" is
  Phase 3; "**and** CI signals through `watches`" is `CI-7`, Phase 7. The README now says
  this; no test pretends the other half.

### Phase 4 — language and intent — **IMPLEMENTED**

`SK-2` glossary-keeper (`docs/glossary.md`, `CM-4` `/term`), `SK-1` charter-keeper
(`docs/charter/constitution.md`, `vision.md`) and `AG-2` decision-adversary.

**Plan:** `docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-4.md`
(8 tasks, all executed). `ADR-0004` is `accepted`; `RF-0005` and `RN-0011`
are `active`, promoted by human act.

**Note:** the Constitution demands "every principle has a named enforcement".
That is a skill rule, not a check — the plan resists inventing `CI-9` to
measure it; the verification stays with the skill and with a dogfooding test.

**What the planning found out** (answers to the two questions that this backlog
had left open — holds for whoever is going to execute, and for the following phases
that inherit):

1. **The term states do not enter `STATUS_MACHINE`.** Spec §8 shows the
   glossary being **cited by name** ("Glossary <──names── RN, contract,
   code"), never on the side that resolves a `<PREFIX>-<number>` citation — and the
   entry format (§5) has no ID column. A term is identified by
   name, not by an invented `TRM-nnnn`; `active`/`renamed`/`banned` becomes a
   table column read by the skill, without `STATUS_MACHINE` or `CI-1`
   validating it. Decision recorded in `ADR-0004`.
2. **The format of `agents/` in the plugin, confirmed against real marketplace
   plugins** (`pr-review-toolkit`, `feature-dev`): `plugin/agents/<name>.md`,
   frontmatter `name`, `description` (the trigger), `tools:` (allowlist —
   `AG-2` stays without `Edit`/`Write`, spec §6), `model:`. Discovered by
   directory, like skills and commands — **without** an entry in `plugin.json`.

**Inheritance from Phase 3, resolved by `ADR-0004`:** glossary and Constitution/Vision
are artifacts with an owner and **without a numbered ID family**, like
`CONTRIBUTING.md` — same category as `DA-0002`. Phase 4 **does not** resolve
`DA-0002` nor invent a prefix: it keeps the three out of `artifacts:` in
`.ownership.yml`, with the same treatment that `CONTRIBUTING.md` has received since
Phase 3. `DA-0002` remains open, exactly where Phase 3 left it — a pre-
condition of `CI-7`, Phase 7.

### Phase 5 — generated contracts — **IMPLEMENTED**

`SK-5` contract-keeper, `HK-2` (blocks editing a generated artifact) and `CI-5`
(regenerating produces diff ≠ 0).

**Depends on:** `generated[]` in `.ownership.yml` ceasing to be `[]`, and on a real
generator existing. **This repository has no generated contract at all** — the
dogfooding of the phase needs to invent a real target (for example, generating the checks table
of the README from `src/checks/registry.ts`) or the phase stays without proof.
**Engine piece that is missing:** `CI-5` needs to **run** the generator command
inside the container and compare the output — it is the first check that runs a subprocess,
and the first that can be slow. It is worth deciding by ADR whether it runs in `validate`
or in a separate subcommand.
**Acceptance criterion of spec §12 that the phase closes:** the 6.

**Plan:** `docs/superpowers/plans/2026-08-25-living-docs-toolkit-phase-5.md`
(9 tasks, all executed). `ADR-0005` is `accepted`; `RF-0006`, `RF-0007`
and `RN-0012` are `active`, promoted by human act.

**Same category as `DA-0002`:** `docs/contracts/errors.md` and
`docs/contracts/versioning-policy.md` (installed by `--stage production`) are
artifacts with an owner and **without a numbered ID family**, like `CONTRIBUTING.md`,
glossary and Constitution/Vision (`ADR-0004`). Phase 5 **does not** resolve `DA-0002`
nor invent a prefix: it keeps the two out of `artifacts:` in `.ownership.yml`,
the same treatment that the previous artifacts of this family already receive.
`DA-0002` remains open — a pre-condition of `CI-7`, Phase 7.

**What the planning found out** (holds for whoever is going to execute again, and for
Phase 6 that inherits):

- **The dogfooding target is the checks contract**, `docs/contracts/checks.gen.md`,
  generated from `src/checks/registry.ts`. This repository had no generated
  contract at all before this phase — without a real target, the phase would have no
  proof, only theory.
- **The generator contract is to print to standard output, not write a file**
  (`ADR-0005`). A check that rewrites what it is checking erases the evidence
  of the drift before reporting it: `CI-5` compares the output of the command with the
  file on disk, and it is that comparison — not a write — that detects the
  divergence.
- **`CI-5` stays out of `living-docs validate`**, running only in
  `living-docs drift`: it is the only check that runs a command declared by the
  validated repository, and the only one that can be slow. `validate` prints the
  pointer to `drift` when there is a declared generated artifact, so the mechanism
  does not stay silent.

### Phase 6 — historical trail — **IMPLEMENTED**

`SK-7` release-historian (`CHANGELOG.md`, `docs/releases/`, `docs/deprecations.md`,
`docs/migrations/`), `CI-6` (changelog required) and `HK-7` (new shortcut without TDR).

**Depends on:** `consumer-visible-paths` filled in, and on `CI-6` being able to read the
**diff** — it is the first check that is not satisfied with the state of the tree.
Decide by ADR where the diff comes from (`git diff` against the base of the PR) and how that
behaves outside CI.
**Engine piece that is missing:** `src/git/diff.ts`, and the exception label that spec
§5 (`SK-7`, rule 2) mentions without defining the format — that is a `DA` to open.
**Note:** `HK-7` is `additionalContext`, never `deny` — a legitimate shortcut
cannot be blocked (spec §7).

**What the planning found out** (`docs/superpowers/plans/2026-08-26-living-docs-toolkit-phase-6.md`):

- **The exception label became `ADR-0006`, not the `DA` that this backlog foresaw.**
  A `DA` records that nobody knows the rule and the implementation stops; here the
  rule was already decidable with what was written — the toolkit has no network
  (`RNF-0001`), so a PR label was out, and the label needs to survive
  the merge, so it needs to be in version control. That leaves one viable
  alternative and two discardable ones, which is the shape of an ADR, not of a `DA`
  opened and closed in the same commit.
- **`changedPaths` uses three dots (`<base>...HEAD`); `commitMessages` uses
  two (`<base>..HEAD`).** Three dots start from the merge-base — "what this
  branch changed", without blaming the branch for commits that entered the base after
  it left. Two dots for the messages because there the question is "which
  commits this branch added", not "what is the content difference".
- **The trigger comes from `consumer-visible-paths`; the target, from `watches` marked
  `consumer-visible: true`.** The toolkit does not know the path `CHANGELOG.md` and
  did not come to know it (spec §3). `test/docs/release-history.test.ts` demands
  that the two lists be the same set in this repository, so that `CI-6`
  and `HK-5` do not start demanding different things.
- **`REL` gained an ID family; `CHANGELOG.md` and `docs/deprecations.md`
  did not.** `HK-1` only freezes a path that `findArtifactRule` resolves, and spec §7
  demands that it freeze a published release note — without a prefix, that half of
  `HK-1` would not exist. `CHANGELOG.md` and `docs/deprecations.md` remain in the
  same category as `CONTRIBUTING.md`, the DoD and the written contracts
  (`ADR-0004`): artifact with an owner and without an ID family, out of `artifacts:`,
  still under `DA-0002`.

**Inheritance from Phase 3:** once Phase 3 is executed, `src/git/` will exist with `staged.ts` —
`diff.ts` is born beside it, with the same contract: injectable runner (`GitRunner`), short timeout,
fail-open returning empty. Copy the pattern instead of inventing another; the
5 s ceiling of the hook is divided between reading `.ownership.yml` and talking to git.
`consumer-visible: true` in `watches` and `consumer-visible-paths` remain without any
consumer until `CI-6` — Phase 3 deliberately did not touch them.

**Inheritance from Phase 5:** `src/exec/command.ts` exists — an injectable
`CommandRunner` — and it is the mold for the `src/git/diff.ts` of this phase, but with the
contract **inverted** in relation to the paragraph above: the note inherited from Phase 3 assumed
the same contract as `GitRunner` (fail-open). `CommandRunner` does **not** fail
open, on purpose — it was designed for `CI-5`, a check, not a hook — and
`CI-6` is also a check, not a hook. `diff.ts` copies the injectable form of
`command.ts`, not the fail-open of `staged.ts`; the cost of silence changes
side when the caller is a check that needs to show up, not a hook whose
cost of failing closed is locking the agent. `docs/contracts/versioning-policy.md`
already points to the `CHANGELOG.md` that this phase delivers and that does not exist yet.

### Phase 7 — continuous maintenance

`AG-1` docs-divergence-auditor (`CM-5` `/docs-audit`), `HK-6` (inventory at
`SessionStart`), `CI-4` (staleness — the **only** check authorized to just warn),
`CI-7` (ownership coverage) and `CI-8` (links).

**Depends on:** everything above; it is the phase that closes acceptance criteria 7 and 8 of
spec §12.
**Engine piece that is missing:** `CI-4` needs "today" — and the toolkit today has
no injectable source of date, which makes the check impossible to test
deterministically. Plan a `CheckContext.today` **before** writing
`CI-4`. `CI-8` needs a relative link resolver and the rule "binary attachment under
`docs/` fails" (spec §13).
**Note:** `CI-7` includes "agent contract repeating text from an owning
artifact" — textual duplication detection, which is the only check in the spec with real
risk of false positive. An ADR about the threshold is worthwhile before implementing.

**Inheritance from Phase 3** (it is the phase that inherits the most):

- `CI-7` does **not** reimplement the code→doc matching: it calls
  `watchesFor`/`pendingDocs` of `src/config/watches.ts`, the same function that
  `HK-4` and `HK-5` use. If `CI-7` needs a question that the module does not
  answer, the new answer goes in there — not in an `if` inside `src/checks/`.
- `CI-7` closes the **second half of acceptance criterion 5** ("and CI signals
  through `watches`"). The first will already be delivered by Phase 3; the README says
  explicitly that only one of them exists, and it is here that this sentence changes.
- **`DA-0002` is a pre-condition of `CI-7`, not a consequence.** "Artifact without an entry
  in `.ownership.yml`" is not verifiable while `CONTRIBUTING.md`, the DoD and the
  agent contract cannot be declared there — today they cannot, because every
  entry of `artifacts:` requires `id-prefix`. Resolve the `DA` with an ADR before
  writing the check, or the check is born measuring what it can instead of what it should.
- `docs/definition-of-done.md` will already exist with **one named verification per
  item** (`CI-n`, `HK-n` or "human"). It is this column that becomes `CI-7`, and that is
  why the DoD refuses an item without verification: an item without verification is an item that
  `CI-7` has no way to enforce.
- `HK-6` (`SessionStart`) reuses `contextOutput('SessionStart', …)` from
  `src/hooks/lib/io.ts`, created for `HK-4`. There is no variant with
  `permissionDecision` there on purpose.

**Inheritance from Phase 6:** `src/git/diff.ts` exists — `changedPaths` and
`commitMessages`, with a `GitError` that rises instead of failing open — and `CI-7`
can reuse it if it needs the diff of the branch. `changelogChecks` in
`src/checks/registry.ts` is the third grouping of checks (after
`CHECKS` and `driftChecks`); `CI-4` probably goes into `living-docs
validate`, not into its own subcommand, because staleness does not need
external state like the diff — what `CI-4` lacks is
`CheckContext.today`, and that remains a prerequisite to be resolved **before**
writing the check, not after.

### Inherited debts and open decisions

- **`TDR-0001`** — `HK-1` does not freeze a revoked section inside a collection
  file. Payment trigger: the first PR that revokes a requirement.
- **`DA-0002`** — how to declare in `.ownership.yml` an artifact **without an ID
  family** (`CONTRIBUTING.md`, Definition of Done, agent contract, glossary and
  Constitution, and later `docs/contracts/errors.md` and
  `docs/contracts/versioning-policy.md`), so that `CI-7` demands an owner without
  inventing a prefix. Opened by Task 9 of the Phase 3 plan and it is already in
  `docs/open-decisions.md`, `open`. It blocks `CI-7` (Phase 7); Phase 4 and
  Phase 5 inherited it without resolving it (`ADR-0004`). A symptom that is cheap to recognize:
  the parser of `artifacts:` demands an `id-prefix` of 2 to 4 capital letters in every
  entry, and these documents have none.
- **`ADR-0001` and `ADR-0002` remain `draft`** — only `ADR-0003` and `ADR-0004` were
  accepted by a person so far. The `relates-to` of both **is already
  filled in**, which makes acceptance a cheap act: `accepted` freezes the
  file and `relates-to` is not in the `mutable-fields`, so an accepted ADR with
  `relates-to: []` can only be fixed by superseding. Filling in before accepting is
  a pre-condition, not a consequence.
- **Toolkit distribution.** `ADR-0003` decides the two roots and does **not** decide
  how the toolkit reaches a consuming project (clone? published image? package?).
  It is worth opening a `DA` at the first real consumer.
- **`--stage production`** is complete since Phase 6: besides
  `docs/contracts/errors.md` and `docs/contracts/versioning-policy.md`, it installs
  `CHANGELOG.md`, `docs/releases/`, `docs/deprecations.md` and
  `docs/migrations/`, and declares `REL` in `artifacts:`. `notInstalled` is
  empty — it covers Phases 5 and 6 of spec §10 in full.
- **`--stage multi-team`** does not exist because the phase that would install it (Phase 7)
  did not exist. Add the stage together with the phase, not before: a stage that
  installs an empty frame is the "dead wiki" born from the factory. A rule that
  applies to every stage: **`init` does not invent `watches`.** The template brings the
  field empty with a commented example, because a code→doc link that nobody
  recognizes teaches ignoring the reminder on the first day. The same rule holds
  for `generated[]`, which Phase 5 also does not invent.

### Suggested order from here

The seven phases of spec §10 are implemented. What remains is not a phase:

1. **Accept `ADR-0001`, `ADR-0002` and `ADR-0006`** (today `draft`). It does not depend
   on anything and remains a cheap act — with the pre-condition already noted: the
   `relates-to` needs to be filled in **beforehand**, because `accepted` freezes the
   file.
2. **`TDR-0001`** remains `open`, now with a verifiable trigger: `CI-4` fails on the
   first PR that revokes a requirement. There is nothing to do before that.
3. **Toolkit distribution.** `ADR-0003` decides the two roots and does not decide
   how the toolkit reaches a consuming project. It is worth opening a `DA` at the first real
   consumer — and it is there that the rupture of `CI-7` (a document without an owner starts
   to fail) will be felt first.
4. **Extending to the out-of-scope layers** (C4, runbooks, event catalog) is the real
   test of the extension point: one entry in `docs/.ownership.yml` and an
   owning skill, without touching any check. If it needs to touch one, the extension point
   was not what the spec said it was.
