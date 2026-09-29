# Living documentation toolkit — specification

Generic specification of the skills, agents, hooks, commands and CI checks needed to **set up** and **maintain** the subset of living documentation artifacts described in `docs/superpowers/research/2026-08-24-living-documentation.md`. It is not specific to any repository: the only thing that changes from project to project is the ownership map (`SK-0`, `docs/.ownership.yml`) and the paths declared in it.

Every piece of this spec has a stable, citable ID — `SK-n` (skill), `AG-n` (agent), `HK-n` (hook), `CI-n` (CI check), `CM-n` (command). The toolkit obeys the very rule it imposes.

## Scope

**Inside** — the artifacts highlighted as priorities:

| Layer                | Artifacts                                                  | Owner                          |
| -------------------- | ---------------------------------------------------------- | ------------------------------ |
| 1 — Intent           | Constitution, Product Vision                               | `SK-1`                         |
| 1 — Intent           | Glossary / ubiquitous language                             | `SK-2`                         |
| 2 — Decisions        | ADR, Open Decisions, Debt Register (TDR)                   | `SK-3`                         |
| 3 — Specification    | Requirements with stable IDs                               | `SK-4`                         |
| 5 — Contracts        | OpenAPI (generated), Error catalog, versioning policy      | `SK-5`                         |
| 7 — How we work      | CONTRIBUTING, Definition of Done, agent contract           | `SK-6`                         |
| 8 — Historical trail | CHANGELOG, release notes, migration guides, deprecations   | `SK-7`                         |
| —                    | The six mechanisms that make documentation alive           | encoded in `HK-*` and `CI-*`   |

**Outside** — deliberately not covered: C4/ERD/threat model (layer 4), runbooks/SLO/postmortems (layer 6), event catalog, long RFC, per-feature feature specs. The toolkit is extensible to them through the same mechanism (`docs/.ownership.yml` + an owning skill), but nothing here presupposes them.

**Not a goal**: generating documentation volume, creating a document that narrates code, measuring "documentation coverage", or replacing human judgment in accepting a decision (see `HK-3`).

---

## 1. Allocation principle: skill, agent, hook, command or CI

The wrong decision here is the cause of a toolkit nobody uses. The rule:

| The rule is…                                                                                                 | Piece                        | Why                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------- | --------------------------------------------------------------------- |
| **Semantic** — "does this deserve an ADR?", "does this term already exist under another name?", "does this rule cover the case?" | **Skill**                    | Requires reading and judgment; determinism is impossible              |
| **Semantic, but contaminated by whoever wrote it** — "what should this diff have updated and did not?"       | **Agent** (isolated context) | Whoever produced the code reviews it with the same reasoning that generated it |
| **Syntactic / structural** — missing field, duplicate ID, forbidden path, frozen file                        | **Hook**                     | Cheap, deterministic, non-negotiable, and it happens at the moment of the error |
| **Human entry point** — "open an ADR", "record this debt"                                                    | **Command**                  | Shortcut to the skill; contains no logic of its own                   |
| **Must hold without an agent present**                                                                       | **CI**                       | The only enforcement that survives someone editing in the browser     |

Corollaries:

1. **A hook never judges.** If the hook needs to decide whether a decision is "costly to reverse", it is in the wrong place — it becomes `additionalContext` suggesting the skill, never `deny`.
2. **A skill never duplicates the artifact.** The skill holds the procedure and the boundaries; the content lives in the document. A skill that repeats the rule is a second source of truth and violates mechanism 6.
3. **One artifact, one owner.** Two owners for the same file is guaranteed divergence. If two roles need to write to the same file, the file is wrong — break it up.
4. **Every CI check mirrors a rule written in a skill.** A check without a documented rule is bureaucracy; a rule without a check is a promise.

---

## 2. The machine contract: standardized frontmatter

This is the central piece. Without it, no hook and no check is generic — each would become an ad hoc parser. Every living documentation artifact opens with:

```yaml
---
id: ADR-0042 # stable, citable, never recycled
title: Event queue instead of synchronous call
status: accepted # see the state machine (§4)
owner: '@team-platform' # person or team; mirrors CODEOWNERS
trigger: > # WHEN to update — observable condition
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-21 # ISO date; feeds CI-4
relates-to: [RN-014, DA-0007] # bidirectional traceability
supersedes: ADR-0031
superseded-by: null
---
```

The six mechanisms of "what makes documentation alive" are all encoded in this block:

| Mechanism                           | Field / piece that materializes it                                 | Enforcement            |
| ----------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| 1 — Docs-as-code, in the same PR    | `docs/.ownership.yml` maps code path → owning doc                  | `HK-4`, `HK-5`, `CI-7` |
| 2 — Trigger, not cadence            | `trigger:` — free text, but with cadence vocabulary forbidden      | `CI-1`                 |
| 3 — Traceability by ID              | `id:`, `relates-to:` and the citation syntax (§8)                  | `CI-2`, `CI-3`         |
| 4 — Automation in CI                | `last-reviewed:` + the checks                                      | `CI-1`…`CI-8`          |
| 5 — Lifecycle instead of deletion   | `status:`, `supersedes:`, `superseded-by:`                         | `HK-1`, `CI-3`         |
| 6 — Single source with an owner     | `owner:` + the "one artifact, one owner" rule                      | `CI-7`                 |

Frontmatter rules:

- **`trigger` is mandatory and is rejected if it describes a cadence.** `CI-1` rejects `quarterly`, `monthly`, `annually`, `periodically`, `review every`, `quarterly`, `sprint`. A valid trigger names an event: "in the same PR that changes `src/domain/billing`", "when a new error code is added", "when an agent errs for lack of context".
- **`id` is never recycled.** Retired IDs go to `docs/ids-retired.txt` and `CI-2` fails if one of them reappears.
- **`last-reviewed` is only touched by whoever actually reviewed.** An automatic bulk bump turns the field into noise and switches off mechanism 4.
- Generated artifacts (`*.gen.*`) have **no** editable frontmatter — they carry the marker `<!-- generated: do not edit -->` and are `HK-2` territory.

---

## 3. Layout and granularity

```
docs/
  .ownership.yml            # the only project-specific file
  ids-retired.txt
  charter/
    constitution.md         # SK-1
    vision.md               # SK-1
  glossary.md               # SK-2
  decisions/
    adr/ADR-0001-<slug>.md  # SK-3, one per file, append-only
    open-decisions.md       # SK-3, single file, mutable
    debt/TDR-0001-<slug>.md # SK-3, one per file
  requirements/             # SK-4 — a single file or one per context
  contracts/
    openapi.gen.yaml        # SK-5, GENERATED
    errors.md               # SK-5, written
    versioning-policy.md    # SK-5, written
  definition-of-done.md     # SK-6
  deprecations.md           # SK-7
  migrations/               # SK-7
  releases/                 # SK-7
CONTRIBUTING.md             # SK-6
CHANGELOG.md                # SK-7
AGENTS.md / CLAUDE.md       # SK-6 — index and policy, never content
```

**Granularity rule** (one file per item vs. a single file):

| Nature of the item                                      | Form                              | Examples                                              |
| ------------------------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| Append-only, immutable once accepted, with a long body  | **One file per item**, numbered   | ADR, TDR, release note                                |
| Mutable, short, read as a list/table                    | **Single file** with a table      | Open Decisions, Glossary, Error catalog, deprecations |
| Long body but alive, with stable sections               | **Single file**, sections with ID | Constitution, Requirements                            |

The criterion is not taste: an immutable item in its own file gives a clean diff and a readable history; a mutable item in its own file produces hundreds of files nobody sweeps — and "if nobody reads it, it is not alive".

### `docs/.ownership.yml` — the single extension point

It is what makes the toolkit generic. Hooks and checks know no path at all: they read from here.

```yaml
version: 1
stale-after-months: 6

artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: '@team-platform'
    skill: decision-recorder
    append-only: true # HK-1
    mutable-fields: [status, superseded-by, last-reviewed]
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: '@product'
    skill: decision-recorder
  - id-prefix: RN
    path: docs/requirements/
    owner: '@product'
    skill: requirements-keeper
    cited-by: ['test/**', 'src/**'] # CI-3

generated:
  - path: docs/contracts/openapi.gen.yaml # HK-2
    command: <generator command> # CI-5

watches: # mechanism 1: code → owning doc
  - code: 'src/domain/**'
    doc: 'docs/requirements/'
    reason: 'new behavior requires a rule with an ID before the code'
  - code: 'src/**/*.controller.*'
    doc: 'docs/contracts/'
  - code: 'src/**/errors/**'
    doc: 'docs/contracts/errors.md'
  - code: 'src/**'
    doc: 'CHANGELOG.md'
    consumer-visible: true # CI-6

consumer-visible-paths: ['src/api/**', 'src/public/**']
```

---

## 4. Lifecycle (mechanism 5)

Deleting erases the "why"; marking preserves it. Valid states per artifact:

| Artifact              | State machine                                     | Who promotes                            |
| --------------------- | ------------------------------------------------- | --------------------------------------- |
| ADR                   | `draft → accepted → superseded`                   | a human promotes to `accepted` (`HK-3`) |
| Constitution / Vision | `draft → accepted` + amendment log with `version` | human                                   |
| Open Decision (DA)    | `open → resolved(ADR-nnnn)` \| `open → dropped`   | human                                   |
| TDR                   | `open → paid` \| `accepted-permanently`           | human                                   |
| Requirement (RF/RNF/RN) | `draft → active → revoked(by RN-mmm)`           | human                                   |
| Glossary term         | `active → renamed(to X)` \| `banned`              | an agent may propose, a human accepts   |
| Error code            | `active → deprecated(use X) → removed(in vN)`     | follows the versioning policy           |
| CHANGELOG entry       | `Unreleased → <version>`                          | release                                 |

**No terminal state allows editing the body.** An accepted ADR that turned out to be wrong is not corrected: it gets `status: superseded` and `superseded-by`, and the new decision explains the error. The history of decisions is the asset.

**No agent promotes a state on its own.** The most a skill writes is `draft`/`open`. Promotion is a human act — `HK-3` intercepts with `permissionDecision: "ask"`.

---

## 5. Skills

Seven skills, one per artifact owner, separated by **rate of change and trigger** — not by layer. Constitution (deliberate amendment, very rare) and Glossary (every new term, weekly) are layer 1 but distinct skills precisely for that reason; ADR, Open Decisions and TDR are distinct artifacts but a single skill because they are **a single state machine** (gap → decision → accepted debt).

Authoring conventions in §11. Each skill declares, in the same order: what it owns, trigger, numbered procedure, boundaries ("is yours / is not yours" table) and final checklist.

### SK-0 `living-docs-bootstrap` — the setup

|                |                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **Owns**       | `docs/.ownership.yml`, the directory structure, the templates, the installation of `HK-*` and `CI-*` |
| **Trigger**    | Once per project; again at each change of maturity stage (§9)                                   |
| **Boundary**   | Does not write the content of any artifact — it creates the frame and the enforcement           |

Procedure:

1. **Take inventory before creating.** Sweep the repository for artifacts that already exist under another name or path (`decisions/`, `adr/`, `rfc/`, `requirements.md`, `spec/`, exported wiki). Adopt what exists by registering it in `.ownership.yml`; **never** create a parallel one — duplication is the most expensive anti-pattern on the list.
2. **Determine the stage** (solo, small team, production, multiple teams) and derive the minimum set (§9). Do not install what the stage does not call for.
3. **Write `docs/.ownership.yml`** with the real paths, the real owners and the `watches` that reflect the real structure of the code.
4. **Install in phase order** (§9). Frontmatter + `CI-1` first: without the machine contract, nothing else is enforceable.
5. **Register in the agent contract** (`AGENTS.md`/`CLAUDE.md`, via `SK-6`) the index: which artifact answers what and which skill owns it. Only the index — no copied content.
6. **Deliver in a single PR**, with the trigger matrix filled in and the explicit list of what was left out and why.

Idempotence is a requirement: running twice does not duplicate a file, does not rewrite existing content, does not renumber an ID.

### SK-1 `charter-keeper` — Constitution + Product Vision

|              |                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Owns**     | `docs/charter/constitution.md`, `docs/charter/vision.md`                                                         |
| **Trigger**  | Deliberate amendment of the Constitution; strategy change in the Vision. Never as a side effect of another task |

Rules:

1. **Every principle is testable and has a named enforcement.** The format is `<principle> — verified by <hook \| lint \| test \| review \| check>`. A principle without enforcement is a slogan: the skill refuses it and proposes the verifiable version. "Monetary values are integers in the smallest unit" passes; "we value quality" does not.
2. **1–2 page limit.** Overflowing is a symptom of a principle that became a requirement — move it to `SK-4`, do not expand the Constitution.
3. **An amendment is an append.** Never rewrite a principle in place: the `## Amendment log` section receives the date, what changed, why, and `version` goes up. A revoked principle stays with `status: revoked` and the amendment that revoked it.
4. **The Vision answers three things** and only those: what problem, for whom, what success metric. If the change alters none of the three, it is not a Vision change.

| Is yours                               | Is not yours                       |
| -------------------------------------- | ---------------------------------- |
| What is inviolable, and how it is verified | A one-off technical decision (→ `SK-3`) |
| The product's success metric           | Business rule (→ `SK-4`)           |
| Rejecting a non-testable principle     | Accepting the amendment — that is human |

### SK-2 `glossary-keeper` — ubiquitous language

|             |                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| **Owns**    | `docs/glossary.md`                                                                                     |
| **Trigger** | New domain term in code, spec or conversation; a term with two meanings; renaming of a concept         |

Entry format: `Term \| Definition \| Name in code \| Do not confuse with \| Source (RN/ADR)`.

Rules:

1. **One meaning per term, no exception.** If the business uses the same word for two things, two terms are created and one of the two is **banned from the code** (`status: banned`), with the substitute pointed out.
2. **A divergence between the name in code and the term is a bug, not a synonym.** When it finds one, the skill proposes the rename in the code — it does not add a second row to the glossary.
3. **A definition without a source is a draft.** Every term points to the RN/ADR that defines it, or is born `draft` until one exists.
4. The skill is the most frequent input to the others: `SK-4` and `SK-5` name things by the glossary, not by habit.

### SK-3 `decision-recorder` — ADR + Open Decisions + TDR

The most important skill in the toolkit. ADR and Open Decisions capture the only information that is **not** reconstructible from the code: the "why" and the "we don't know yet".

|             |                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------- |
| **Owns**    | `docs/decisions/adr/`, `docs/open-decisions.md`, `docs/decisions/debt/`                           |
| **Trigger** | (a) a decision costly to reverse; (b) someone stumbled on a gap; (c) a shortcut taken on purpose  |

The three artifacts are states of a flow:

```
gap found ──> DA-nnn (open)
                │
                └─ decided ──> ADR-nnn (draft ──human act──> accepted)
                                  │
                                  └─ accepts deliberate loss ──> TDR-nnn
```

Rules:

1. **Never invent a rule silently.** When implementing and finding behavior with no written rule: open `DA-nnn` and **stop**. The skill's output is the ID, not the code. While the item is in Open Decisions, it has no rule and must not be implemented.
2. **An accepted ADR is immutable.** Only `status`, `superseded-by` and `last-reviewed` change (`HK-1` enforces the allowlist). An ADR rewritten retroactively is worth zero.
3. **Nygard/MADR format**: Context / Decision / Status / Consequences, with **alternatives considered and what is accepted as lost**. An ADR without a declared negative consequence is propaganda — the skill demands the cost.
4. **The skill does not decide.** It raises the alternatives and the trade-off, writes `draft` and asks for the decision. `accepted` is a human act.
5. **A TDR requires an observable payment trigger** — not a vague date. "When the volume exceeds X" or "in the first PR that touches this module" pass; "when there is time" is not a trigger and the skill rejects it. `CI-4` fails on a TDR with an expired trigger.
6. **Sequential numbering, never recycled** (`docs/ids-retired.txt`).
7. **Every closed DA points to the ADR that closed it**, and the ADR points back (`CI-3` verifies both sides).

| Is yours                                              | Is not yours                  |
| ----------------------------------------------------- | ----------------------------- |
| Recording why this and not that, and what is lost     | Making the decision           |
| Turning a gap into a blocking item with an ID         | Implementing the missing rule |
| Recording the debt with a payment trigger             | Paying the debt               |

### SK-4 `requirements-keeper` — requirements with stable IDs

|             |                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| **Owns**    | `docs/requirements/` — `RF-nnn` (functional), `RNF-nnn` (non-functional), `RN-nnn` (business rules)    |
| **Trigger** | Before implementing any behavior; every new or changed rule                                            |

Rules:

1. **It does not look at the code, and that is deliberate.** The spec says what **must** be; justifying a rule by what the code does today inverts the relationship and erases the gap that layer 4 exists to show.
2. **Stable, citable ID, never recycled.** A requirement without an ID cannot be referenced by a test, commit or ADR — and without that there is no blast radius computable by `grep`.
3. **A removed rule is `revoked`, not deleted**, with the ID of what replaced it.
4. **"Out of scope" is a first-class field** wherever there is ambiguity. It is what prevents silent widening.
5. **Missing requirement → `SK-3`, not invention.** It is the same rule seen from the other side.
6. **Every `active` RN is cited by at least one test** (`CI-3`). Bidirectional traceability: the test cites the rule, and the rule knows who covers it.
7. Terms come from the glossary (`SK-2`), not from the writer's habit.

### SK-5 `contract-keeper` — OpenAPI + Error catalog

|             |                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| **Owns**    | the _pipeline_ that generates `docs/contracts/openapi.gen.yaml`; and, written by hand, `errors.md` and `versioning-policy.md` |
| **Trigger** | Change to a public interface; new error code; change to the versioning policy                                    |

Rules:

1. **If it can be generated, do not write it.** The skill never edits the generated file (`HK-2` blocks it). To change the contract, change the annotated source and run the generator; `CI-5` regenerates and fails if there is a diff.
2. **What is written by hand is the policy around it**, not the contract: versioning, deprecation, stability.
3. **Error catalog**: a code that is stable and immutable in meaning, separate from the displayable message. Once published, a code never changes meaning — it gets `deprecated` and a substitute. Each entry declares: code, meaning, when it occurs, HTTP/transport status, and whether it is public.
4. **A new error code on a consumer-visible path generates a CHANGELOG entry** (`SK-7`, `CI-6`).
5. **Deprecation requires a substitute**. Without a substitute it is not a deprecation, it is a compatibility break and goes through the versioning policy — and through an ADR.

### SK-6 `working-agreements-keeper` — CONTRIBUTING + DoD + agent contract

|             |                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **Owns**    | `CONTRIBUTING.md`, `docs/definition-of-done.md`, `AGENTS.md`/`CLAUDE.md`                        |
| **Trigger** | Process change; **and every time an agent or a new person errs for lack of context**           |

This second trigger is the best one in the catalog: it makes the document self-correcting. The skill formalizes the loop — an observed error becomes one line, and the line takes one of two forms: _where the truth is_ or _what to never do_.

Rules:

1. **The agent contract is index and policy, not content.** Every factual claim lives in the owning artifact and is linked. Content duplicated in it rots like any other — and `CI-7` flags when it repeats text from an owning artifact.
2. **The DoD is executable and includes updating the owning doc in the same PR.** It is mechanism 1 encoded where it is read: if the documentation update does not fit in the PR that changed the code, it does not happen.
3. **The DoD is the source of `CI-7`**: each verifiable item in it has a check, or is explicitly marked as human verification.
4. A style guide enters here **only with what the linter does not catch** (naming, language, granularity). The rest is tool configuration, not a document.

| Is yours                                             | Is not yours                                     |
| ---------------------------------------------------- | ------------------------------------------------ |
| How we work and when something is done               | The business rule that CONTRIBUTING references   |
| Turning an error from lack of context into a new line | Duplicating content from another artifact       |

### SK-7 `release-historian` — CHANGELOG, releases, deprecations

|             |                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| **Owns**    | `CHANGELOG.md`, `docs/releases/`, `docs/deprecations.md`, `docs/migrations/`                           |
| **Trigger** | Every consumer-visible change (in the same PR, under `## [Unreleased]`); every release; every deprecation |

Rules:

1. **CHANGELOG is consumer-facing — it is not `git log`.** Single test: if the entry only makes sense to whoever wrote the code, it does not belong in the CHANGELOG. Keep a Changelog format (`Added`/`Changed`/`Deprecated`/`Removed`/`Fixed`/`Security`), `Unreleased` at the top.
2. **The entry is born in the PR that causes the change**, not on the eve of the release. `CI-6` requires the entry when the diff touches `consumer-visible-paths`, or an explicit exception label.
3. **A deprecation requires four things**: announcement date, removal version/date, substitute, and a link to the migration guide. Missing any one, it does not go into the register.
4. **A release note is derived from the CHANGELOG**, not written anew — and is frozen once published (`HK-1`).
5. **A migration guide per compatibility-breaking change**, pointing to the ADR that decided it.

---

## 6. Agents (isolated context)

Two, and both exist for the same reason: distance from whoever produced the material.

### AG-1 `docs-divergence-auditor`

Receives a diff (or a list of paths) and answers a question no generic tool answers: **what this diff should have updated and did not.** It runs isolated because whoever just wrote the code reviews it with the same reasoning that generated it, and does not see their own blind spots.

- Tools: read + search + `git`. **No `Edit`/`Write`, by design** — it points and stops.
- Mandatory input: `docs/.ownership.yml` (the `watches`) and the artifacts they point to.
- Three classes of finding, and only these three:
  1. **Outdated doc** — the code changed and the owning doc did not (with the path, the `watches` rule and the passage of the doc that became false).
  2. **Lying doc** — the document asserts a behavior that the code no longer has.
  3. **Behavior without a rule** — code that decides something no requirement covers. Output: open `DA-nnn` via `SK-3`.
- Each finding carries file, line, severity and the **owning artifact** that should change. No aesthetic preference, no audit of the whole repository outside the received scope.
- It declares the scope on the first line of the report; if the diff is too large for an honest reading, it states the size and reviews by slice — it does not sample while pretending to have read everything.

### AG-2 `decision-adversary`

Receives **one** proposal — a `draft` ADR, a Constitution amendment, or a TDR — and tries to refute it. Isolated so as not to inherit the reasoning of whoever proposed it.

Fixed adversarial checklist: was the discarded alternative really evaluated? which negative consequence is omitted? is this principle testable or a slogan? is this payment trigger observable? is there a prior ADR that this contradicts without superseding? Binary verdict — `ready for acceptance` or `what is missing` —, never a rewrite of the proposal.

---

## 7. Hooks

Deterministic, without judgment. A hook that needs to interpret intent is in the wrong place. Contract: JSON on stdin; response in `hookSpecificOutput` with `permissionDecision` (`deny`/`ask`) or `additionalContext`; every blocking message names **the source rule, the owning artifact and the valid path to do what was intended**.

| ID     | Event / matcher                      | Decision            | What it does                                                                                                                                                                                                                                               |
| ------ | ------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HK-1` | `PreToolUse` / `Edit\|Write`         | `deny`              | Blocks changing an append-only item in a frozen state (ADR `accepted`/`superseded`, published release note, TDR `paid`). **Allows** a change restricted to the `mutable-fields` of `.ownership.yml` — that is how an ADR is superseded without violating immutability. |
| `HK-2` | `PreToolUse` / `Edit\|Write`         | `deny`              | Blocks editing a generated artifact (`generated[].path` or the marker `generated: do not edit`). Points to the annotated source and the generator command.                                                                                                |
| `HK-3` | `PreToolUse` / `Edit\|Write`         | `ask`               | Intercepts a state promotion that requires a human act (`draft → accepted`, `open → resolved`). No agent accepts a decision on its own.                                                                                                                   |
| `HK-4` | `PostToolUse` / `Edit\|Write`        | `additionalContext` | Edited a watched path in `watches` → injects the owning doc, the trigger and the responsible skill. Reminder, never a block.                                                                                                                              |
| `HK-5` | `PreToolUse` / `Bash` (`git commit`) | `ask`               | The staged changes touch a watched path and the owning doc is not in the commit → lists the pending ones and asks. It is mechanism 1 at the cheapest possible point.                                                                                      |
| `HK-6` | `SessionStart`                       | `additionalContext` | Injects the inventory: artifacts present and missing, open DAs, TDRs with an expired trigger, docs with an overdue `last-reviewed`. Solves "if nobody reads it, it is not alive" at the source.                                                            |
| `HK-7` | `PostToolUse` / `Edit\|Write`        | `additionalContext` | New shortcut marker (`TODO`, `FIXME`, type/lint suppression, ignored test) without a nearby `TDR-` → suggests recording the debt. Warning: a legitimate shortcut cannot be blocked.                                                                       |

Reference skeleton (`HK-1`), in the runtime the project already uses for hooks:

```python
#!/usr/bin/env python3
"""PreToolUse (Edit|Write): denies changes to a frozen append-only item.

Source rule: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §4 — "no terminal state
allows editing the body". The field allowlist comes from docs/.ownership.yml.
"""
import json, os, re, sys

FROZEN = {"accepted", "superseded", "deprecated", "published", "paid"}

def main() -> int:
    payload = json.load(sys.stdin)
    tool_input = payload.get("tool_input", {})
    path = tool_input.get("file_path", "")
    norm = path.replace("\\", "/")

    rule = match_append_only(norm)          # reads docs/.ownership.yml
    if rule is None or not os.path.isfile(path):
        return 0                            # creating a new item is always allowed

    if read_status(path) not in FROZEN:
        return 0

    if touches_only(tool_input, rule["mutable-fields"]):
        return 0                            # superseding is the legitimate mutation

    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            f"Blocked: `{os.path.basename(path)}` is in a frozen state. "
            "An accepted item is not corrected — create a new one with `supersedes:` and "
            "mark this one as `superseded`. Owning skill: decision-recorder."
        ),
    }}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

Non-functional requirements of the hooks: **short timeout** (≤5 s), **fail open** (an error reading the configuration returns 0 and lets it through — a broken hook cannot block the work), **zero network**, and a message that teaches the right path instead of just denying.

---

## 8. Traceability by ID (mechanism 3)

Citation syntax, uniform in code, test, doc and commit message: `<PREFIX>-<number>` (`RN-014`, `ADR-0042`, `DA-0007`, `TDR-0003`). A single form, because it is the one `CI-2` and `CI-3` recognize by `grep`.

The graph the checks keep intact:

```
Constitution ──principle──> ADR ──decides──> RN ──verified by──> test
     ^                       │                │
     │                       │                └──> CHANGELOG entry (if public)
  amendment                  v
                            TDR ──payment trigger──> observable condition
DA ──resolved by──> ADR
Glossary <──names── RN, contract, code
Error catalog ──code──> generated contract
```

Verified requirements:

- Every citation resolves to an existing, non-`retired` ID (`CI-2`).
- Every bidirectional pair closes on both sides: `supersedes`/`superseded-by`, DA `resolved`/ADR, RN `revoked`/substitute RN (`CI-3`).
- Every `active` RN has ≥1 citation in the `cited-by` paths (`CI-3`).
- Every `accepted` ADR cites ≥1 requirement, DA or principle — a decision that links to nothing is a sign of missing context.

---

## 9. CI checks

| ID     | Check                  | Fails when                                                                                                                                                |
| ------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CI-1` | **Structure lint**     | Frontmatter missing/invalid; `status` outside the state machine; empty `owner`; `trigger` missing **or describing a cadence**                             |
| `CI-2` | **ID lint**            | Duplicate ID, out of sequence, or reused from `ids-retired.txt`; a citation that does not resolve                                                         |
| `CI-3` | **Traceability**       | Open bidirectional pair; `active` RN without a citation; `accepted` ADR without `relates-to`; `resolved` DA without an ADR                                |
| `CI-4` | **Staleness**          | `last-reviewed` beyond `stale-after-months` (warning); TDR with an expired payment trigger (failure)                                                      |
| `CI-5` | **Contract drift**     | Regenerating the contract produces a diff ≠ 0                                                                                                             |
| `CI-6` | **Changelog required** | Diff touches `consumer-visible-paths` with no entry under `Unreleased` and no exception label                                                             |
| `CI-7` | **Ownership coverage** | Artifact with no entry in CODEOWNERS or in `.ownership.yml`; watched code path without an owning doc; agent contract repeating text from an owning artifact |
| `CI-8` | **Links**              | Broken internal link; `[[wikilink]]` without a target; attachment in binary format under `docs/`                                                          |

Design rules for the checks: they run **in minutes, on the PR**, and the output names the file, the line and the fix. `CI-4` is the only one authorized to merely warn — the others fail, because an ignored warning is the beginning of the dead wiki. No check measures volume or "documentation coverage": it produces a number, not truth.

---

## 10. Commands and rollout order

### Commands (thin shortcuts, no logic of their own)

| ID     | Command                   | Triggers                                              |
| ------ | ------------------------- | ----------------------------------------------------- |
| `CM-1` | `/adr [subject]`          | `SK-3` — new `draft` ADR, or supersede an existing one |
| `CM-2` | `/open-decision [gap]`    | `SK-3` — records `DA-nnn` and **stops** the implementation |
| `CM-3` | `/debt [shortcut]`        | `SK-3` — records `TDR-nnn` with a payment trigger     |
| `CM-4` | `/term [term]`            | `SK-2`                                                |
| `CM-5` | `/docs-audit [scope]`     | `AG-1`                                                |
| `CM-6` | `/docs-setup`             | `SK-0`                                                |
| `CM-7` | `/release [version]`      | `SK-7`                                                |

### Phases

The order matters more than the content: **ADR and Open Decisions before everything** — they cost almost nothing and capture the only information that is really lost. The rest is reconstructed from the code; these two are not.

| Phase | Deliverable                                                           | Why here                                                      |
| ----- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| **0** | `docs/.ownership.yml`, standard frontmatter, `CI-1`, `CI-2`, CODEOWNERS | Without the machine contract nothing is enforceable         |
| **1** | `SK-3`, `HK-1`, `HK-3`, `CM-1`–`CM-3`                                 | The core: "why" and "we don't know yet"                       |
| **2** | `SK-4`, `CI-3`                                                        | The citable spec, and the traceability it enables             |
| **3** | `SK-6`, DoD, `HK-4`, `HK-5`                                           | Ties doc to the PR — mechanism 1                              |
| **4** | `SK-2`, `SK-1`, `AG-2`                                                | Language and intent, once there are decisions to distill      |
| **5** | `SK-5`, `HK-2`, `CI-5`                                                | Generated contracts; requires a mature build pipeline         |
| **6** | `SK-7`, `CI-6`, `HK-7`                                                | Historical trail, once there is an external consumer          |
| **7** | `AG-1`, `HK-6`, `CI-4`, `CI-7`, `CI-8`                                | Continuous maintenance and rot detection                      |

Mapping by maturity stage — install only what the stage calls for:

| Stage                       | Phases    |
| --------------------------- | --------- |
| Solo / prototype            | 0, 1      |
| Small team / real product   | + 2, 3, 4 |
| Production with users       | + 5, 6    |
| Multiple teams              | + 7       |

---

## 11. Authoring conventions

### SKILL.md

```markdown
---
name: decision-recorder
description: >
  Use when ... <trigger in symptom language, not category language>
---

# <Name> — owner of <artifacts>

## Overview — what exists today and what this skill decides

## What you own — table artifact → what it is

## When to use / when not to — including the cost of using it needlessly

## Procedure — numbered, verifiable steps

## Boundaries — "is yours / is not yours" table

## Checklist — checkable boxes, one per invariant
```

The `description` **is the document's trigger translated into the skill index** — selection happens by similarity to this sentence, so it needs to contain the symptoms the person actually types ("what is the rule for X", "is this documented?", "why was this done this way?"), the synonyms and the domain terms. A categorical `description` ("manages ADRs") is not found when it matters.

The sentence in the `trigger:` field of the artifact and the `description:` of the owning skill **say the same thing**. It is what links mechanism 2 to routing: if they diverge, the document declares a trigger that nothing fires.

Other rules: one skill = one owner; no artifact content inside the skill; long references in `references/*.md`, loaded on demand; every skill ends in a checklist, and every checklist item corresponds to an invariant that `CI-*` verifies or that only a human can verify (stated explicitly).

### Language and commits

Identifiers, file names, error codes and IDs in English/neutral; document prose in the project's language. A commit message that changes an artifact cites the affected ID — it is what makes `git log` navigable by rule.

---

## 12. Acceptance criteria of the toolkit

1. **Given** a repository without living documentation, **when** `SK-0` runs, **then** `.ownership.yml` exists, the structure of the stage's phases exists, and no preexisting artifact was duplicated or overwritten.
2. **Given** an `accepted` ADR, **when** an attempt is made to change the body, **then** `HK-1` denies and indicates superseding; **when** only `status`+`superseded-by` are changed, **then** it allows.
3. **Given** a doc with `trigger: review quarterly`, **when** CI runs, **then** `CI-1` fails naming the field.
4. **Given** a behavior with no written rule, **when** an agent is about to implement it, **then** the result is a `DA-nnn` and the implementation does **not** happen.
5. **Given** a PR that changes a watched path without touching the owning doc, **when** a commit is attempted, **then** `HK-5` asks and lists the pending ones; **and** CI flags it through `watches`.
6. **Given** a generated contract, **when** someone edits it by hand, **then** `HK-2` denies — and, if it gets through outside the agent, `CI-5` fails.
7. **Given** a TDR whose payment trigger has been met, **when** CI runs, **then** it fails until the debt is paid or the TDR reclassified.
8. **Given** the start of a session, **when** `HK-6` runs, **then** the inventory and the pending items reach the context without anyone having to look for them.
9. **Given** an agent that erred for lack of context, **when** `SK-6` acts, **then** there is a new line in the agent contract — and it is index or policy, not copied content.
10. **No** piece of the toolkit produces a document that narrates code, nor a documentation-volume metric.

---

## 13. Anti-requirements

The toolkit fails if it produces any of these, and each piece must be refused when it leads to them:

- A wiki parallel to the repository, or an artifact outside version control.
- A diagram or attachment in binary format under `docs/` (`CI-8` rejects it).
- An ADR edited retroactively, even "just to fix it".
- A document that narrates the code line by line — the code already does that better.
- A `trigger` with a calendar cadence.
- A document without an owner, or with two.
- A requirement, decision or debt without an ID.
- Automatic bulk bump of `last-reviewed` — it switches off mechanism 4 while pretending to fulfill it.
- A skill that decides and accepts on its own what is a human act (`HK-3` is the safety net, not the policy).
- Twenty documents of four hundred lines: **if nobody reads it, it is not alive.**
