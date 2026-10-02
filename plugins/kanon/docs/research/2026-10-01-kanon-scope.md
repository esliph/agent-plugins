# kanon — scope of a Spec-Driven Development plugin with native EARS

Scope written by the author on 2026-10-01 and brought into the repository on
2026-10-02, with the decisions taken on that day. It says **what** the plugin
holds and how it fits into a project. **How** each part is built is not here.

**It is not a rule.** What kanon must do is in `../requirements/`; what is not
decided yet is in `../open-decisions.md`. This document is the origin of both
and is not updated after them.

## Overview

kanon is a standalone Spec-Driven Development tool in which EARS is the native
format of acceptance criteria. It is not an extension of Spec Kit, Kiro,
OpenSpec or any other tool.

The central thesis: **EARS is the rule, the test is the proof.** EARS acts as a
semantic lint of acceptance criteria. Gherkin scenarios, property-based tests
and ordinary tests prove the rule was fulfilled.

kanon is spec-anchored: it keeps a cumulative truth of the system and records
each change as a delta. It serves new projects and projects already under way.

## Decisions taken

| Topic                      | Decision                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Nature                     | Standalone, not an extension of an existing tool                                                             |
| EARS keywords              | Canonical in English (WHEN, WHILE, IF…THEN, WHERE, SHALL), with the body in the project's language           |
| Gherkin                    | Optional, never mandatory                                                                                    |
| Formalization (SMT, LTL)   | On the roadmap, outside the first version                                                                    |
| Requirement ID format      | Domain prefix `<CAP>-<NNN>`                                                                                  |
| ID digits                  | Exactly 3, not configurable                                                                                  |
| Limit per capability       | Hard at 999; reaching it forces splitting the capability                                                     |
| ID allocation              | A versioned counter per capability                                                                           |
| Host (2026-10-02)          | A Claude Code plugin on top of a deterministic CLI that also runs alone in CI                                |
| Name (2026-10-02)          | `kanon`, also the prefix of the commands                                                                     |
| Planguage (2026-10-02)     | On the roadmap, outside the first version                                                                    |
| Layout (2026-10-02)        | `.kanon/` for configuration and capability registries; `specs/` and `changes/` visible at the root           |
| Glossary lint (2026-10-02) | The system name and every marked term must be in the glossary; banned terms are flagged wherever they appear |
| Coexistence (2026-10-02)   | Glossary and constitution paths are configurable and point to existing files; `init` creates neither twice   |
| Delivery (2026-10-02)      | Three slices; the first is the foundation and the deterministic rule                                         |

## Design principles

Every component serves at least one of these.

1. **EARS is the rule, the test is the proof.** Every requirement has a stable
   ID and is linked to at least one scenario or test. Without the link, it
   counts as unverified.
2. **Proportionality by design.** Tracks with a criteria budget keep a one-line
   bug from becoming sixteen acceptance criteria.
3. **Deterministic first, LLM after.** Syntax, IDs, glossary and coverage are
   verified by script. The LLM is left with ambiguity, completeness and semantic
   conflict.
4. **Lean context, on demand.** EARS knowledge lives in skills loaded when
   needed, not in context files that are always loaded.
5. **Spec-anchored with delta specs.** A cumulative truth, each change a delta —
   the spec is not a disposable artifact.
6. **Brownfield as a first-class citizen.** kanon never requires specifying the
   whole system to start.
7. **Portable artifacts.** Everything is versioned text in the repository,
   readable without the plugin installed.

## Artifacts in the repository

| Artifact            | Role                                                                                                      | Required                            |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Constitution        | The project's non-negotiable principles, including "every criterion follows EARS and uses glossary terms" | Yes                                 |
| Controlled glossary | Domain vocabulary; terms used in requirements must exist in it                                            | Yes (strict in the Regulated track) |
| Capability registry | Prefix, ID counter, tombstones and split relations of each capability                                     | Yes                                 |
| Current specs       | The cumulative truth: EARS requirements with a stable ID, pattern tag, origin story and status            | Yes                                 |
| Change folder       | Proposal, delta (ADDED/MODIFIED/REMOVED in EARS), design with correctness properties, tasks citing IDs    | Yes, one per change                 |
| Gherkin scenarios   | Concrete examples linked to requirements by the ID tag                                                    | No                                  |
| Bugfix spec         | Current, expected and unchanged behavior, plus one criterion and one regression test                      | Bugfix track only                   |
| NFRs in Planguage   | Non-functional requirements with Scale, Meter and Goal, where EARS is weak                                | No (roadmap)                        |
| ADRs                | Durable architecture decisions that do not fit in the spec                                                | No                                  |
| Traceability matrix | Requirement × scenario × task × test, with coverage status; generated, never edited by hand               | Yes                                 |
| Configuration       | Tracks, budgets, severities, forbidden words and enforcement mode                                         | Yes                                 |

The glossary is a first-class artifact because that is where the real ambiguity
lives ("valid coupon", "active user"). Without it, EARS only moves the problem.

## Lifecycle and commands

Work happens in change cycles: each change is specified, validated, planned and
executed, and ends by merging its delta into the cumulative truth.

| Group      | Command               | Role                                                                                | Slice |
| ---------- | --------------------- | ----------------------------------------------------------------------------------- | ----- |
| Entry      | `init`                | Creates the foundation in a new project                                             | 1     |
| Entry      | `onboard`             | Adoption in an existing project, without requiring a spec of the whole system       | 3     |
| Foundation | `constitution`        | Create and evolve the project's principles                                          | 1     |
| Foundation | `glossary`            | Create and evolve the controlled vocabulary                                         | 1     |
| Foundation | `capability`          | Register a capability and its prefix; split a capability                            | 1     |
| Change     | `propose` / `specify` | Opens a change, writes user stories with EARS criteria and allocates IDs            | 2     |
| Change     | `clarify`             | EARS conformance pass with questions guided by pattern                              | 2     |
| Change     | `analyze`             | Consistency across requirements: conflicts, gaps, implementation detail in the spec | 2     |
| Change     | `plan`                | Design, correctness properties and test strategy per EARS pattern                   | 2     |
| Change     | `tasks`               | Task plan with a mandatory reference to a requirement ID                            | 2     |
| Change     | `implement`           | Execution, task by task                                                             | 2     |
| Change     | `verify`              | Two-way coverage: requirement without test and test without requirement             | 2     |
| Change     | `sync` / `archive`    | Merges the delta into the current specs and archives the change                     | 2     |
| Utility    | `ears-lint`           | Deterministic validation of syntax, IDs and glossary                                | 1     |
| Utility    | `ears-convert`        | Converts free text into EARS                                                        | 1     |
| Utility    | `ears-explain`        | Explains an EARS pattern with an example                                            | 1     |
| Utility    | `renumber`            | Resolves an ID conflict in a change not merged yet                                  | 3     |
| Utility    | `drift`               | Compares code with the current specs and points out divergence                      | 3     |
| Utility    | `import`              | Brings specs from Kiro, Spec Kit or OpenSpec                                        | 3     |
| Utility    | `status` / `trace`    | View of the active change and of the traceability matrix                            | 2     |

EARS pattern to test type, used by `plan` and `verify` (a heuristic, not a norm):

| Pattern            | Suggested test type                       |
| ------------------ | ----------------------------------------- |
| Ubiquitous         | Invariant or property-based               |
| Event (WHEN)       | Integration or e2e triggered by the event |
| State (WHILE)      | State machine                             |
| Unwanted (IF…THEN) | Negative test, fault injection, fuzzing   |
| Optional (WHERE)   | Test parameterized by feature flag        |
| Complex            | Matrix of precondition combinations       |

## Proportionality tracks

Five tracks fit the discipline to the size and risk of the change. kanon
suggests the track from the request, the decision is human, and it warns when a
change exceeds the budget of its track.

| Track     | When                             | What changes                                                                             |
| --------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| Bugfix    | A point fix                      | Bugfix spec, at most 1 criterion, a regression test, no gates                            |
| Quick     | A well-understood feature        | Requirements and tasks with no approval gates, lint on                                   |
| Standard  | A medium or multi-module feature | The full flow, with gates between phases                                                 |
| Regulated | A critical or audited domain     | Strict glossary, auditable matrix, PBT mandatory on the Ubiquitous and Unwanted patterns |
| Spike     | Exploration                      | Outside SDD; records only the intent, no EARS                                            |

The criteria budget per story starts from the reference of 3 to 8 criteria.
Above that, kanon proposes splitting the story.

## Skills and subagents

Skills carry knowledge on demand; subagents separate roles that must not be
played by the same agent.

| Skill                  | Content                                                                                                       | Slice   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ------- |
| EARS writing           | Mavin's ruleset, the six patterns and the anti-patterns: EARS-washing, WHEN for an error, "SHALL… and SHALL…" | 1       |
| Glossary management    | When to create, unify or deprecate terms                                                                      | 1       |
| EARS to test           | The pattern → test type mapping                                                                               | 2       |
| EARS → Gherkin bridge  | How to derive scenarios from requirements, when the team opts for Gherkin                                     | 2       |
| Properties for PBT     | How to extract correctness properties from requirements                                                       | 2       |
| Brownfield archaeology | Extracting observed requirements from existing code and tests                                                 | 3       |
| Planguage for NFRs     | Writing Scale, Meter and Goal                                                                                 | Roadmap |

| Subagent             | Role                                                                                                                                                      | Restriction                                           | Slice |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----- |
| Requirements analyst | Writes and refines criteria, working backwards from success; generates the Unwanted siblings (invalid input, dependency down, permission denied, timeout) | —                                                     | 2     |
| EARS critic          | Adversarial review: false precision, vague terms, conflicts, a MODIFIED that changes intent                                                               | Reviews only, never writes                            | 2     |
| Architect            | Produces design and tasks                                                                                                                                 | Refuses requirements that carry implementation        | 2     |
| Test verifier        | Writes tests from the criteria                                                                                                                            | Separate from the implementer, against circular tests | 2     |
| Archaeologist        | Extracts existing behavior as requirements with inferred status                                                                                           | Acts in onboarding and in drift                       | 3     |

## Validators, hooks and gates

Everything a script can check stays outside the LLM; gates keep a phase from
advancing over a known problem.

| Validator            | What it checks                                                                                                                 | Slice |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----- |
| EARS linter          | Valid pattern, one system per sentence, at most one trigger, response after SHALL, forbidden words, terms outside the glossary | 1     |
| ID linter            | Exact format `^[A-Z]{2,5}-\d{3}$`, duplicates, registered prefix                                                               | 1     |
| Capacity checker     | Active requirements and counter consumption against the alert thresholds and the limit of 999                                  | 1     |
| Delta validator      | MODIFIED and REMOVED reference an existing ID; ADDED reuses neither an active ID nor a tombstone                               | 2     |
| Traceability checker | Requirement without test (behavior debt) and test without requirement (untraced)                                               | 2     |
| Budget checker       | Criteria per story against the budget of the track                                                                             | 2     |

- **Phase gates:** human approval between specifying, planning and executing,
  configurable per track.
- **Quality gates:** a CRITICAL finding in `analyze` blocks the next phase.
  Severities: CRITICAL, HIGH, MEDIUM, LOW.

Hooks (slice 2): lint on saving a spec; traceability check on changing a spec or
a test; minimal load of the active change's status at session start; a check, at
the end of the turn, that completed tasks have a linked test.

## CI integration and metrics (slice 3)

Workflow templates for a pull request, with five checks: EARS and ID lint over
the changed specs; the two-way coverage gate; a failure when a spec changes with
no matching code or test; a requirement ID required in the title or description;
the traceability report posted as a comment.

CI has two modes: **warning** (reports without blocking) and **enforcing**
(blocks). Projects under way start in warning and tighten as a ratchet.

| Metric                                | What it indicates                             |
| ------------------------------------- | --------------------------------------------- |
| Requirement coverage                  | Share of requirements with a linked test      |
| Behavior debt                         | Requirements without a test                   |
| Open `[NEEDS CLARIFICATION]`          | Pending ambiguity                             |
| Share of Unwanted criteria per story  | Whether failure handling is being specified   |
| Criteria per story against the budget | Whether the discipline is proportional        |
| Token cost per phase (if feasible)    | Whether the process is too heavy for the gain |

## Requirement ID scheme

Every requirement has an ID `<CAP>-<NNN>`, immutable, numbered locally to the
capability, with a hard limit of 999.

**Format and scope**

- `CAP`: 2 to 5 uppercase letters, registered when the capability is created and
  unique in the project.
- `NNN`: exactly 3 digits with leading zeros (`CHK-001`, `CHK-014`), not
  configurable.
- Each capability has its own sequence starting at `001`; the prefix makes the
  full ID unique in the project.
- The full ID is written everywhere, including inside the capability itself.
  Never the short form (`014`).
- Origin story, EARS pattern, type and status are metadata, not parts of the ID.
- Other artifacts have their own namespaces: `US-CHK-03` for stories.

Example in the current specs:

```markdown
### CHK-014 [Unwanted]

IF the coupon is expired, THEN THE Checkout SHALL reject it and show "Coupon expired".
Story: US-CHK-03 · Status: approved · Since: 2026-10-coupon-redemption
```

References: tasks use `Requirements: CHK-014`; tests use
`test_CHK_014_rejects_expired_coupon`; Gherkin scenarios, when used, carry the
tag `@CHK-014`.

**Limit and capability split**

- The lint accepts only three digits; `CHK-1000` is an error.
- Tombstones count towards the limit, because they consume the sequence.
- First alert, of design: near 150 active requirements, kanon suggests splitting
  the capability.
- Second alert, of capacity: from 900 on the counter, it warns that the split
  will become mandatory.
- At 999, the allocator refuses new IDs and directs the split.
- On a split, the new capability gets its own prefix for new requirements; the
  existing ones keep their IDs. The registry keeps the relation between the two.

**Lifecycle**

1. **Immutable.** Fixing wording, a threshold value or a message keeps the ID
   (MODIFIED).
2. **A change of intent creates a new ID.** The delta records REMOVED of the old
   one and ADDED of the new one with `Supersedes: CHK-009`.
3. **Never reuse an ID that reached the main branch.** A removed requirement
   becomes a tombstone. IDs of abandoned changes, never merged, become available
   again.
4. **Moving does not renumber.** The prefix says where the requirement was born,
   not where it lives.
5. **Requirements inferred in brownfield** use the same scheme, with
   `Status: inferred` until human approval.

**Allocation**

- A versioned counter per capability, in the capability's registry. Changes in
  different capabilities never contend for the same file.
- The ID is allocated at `propose`/`specify`, already final; tasks and tests cite
  it from the start.
- On a merge conflict in the counter, the change that arrives later renumbers its
  new IDs with `renumber`, which updates spec, tasks, scenarios and test names.
- No automatic merge driver: resolving by taking the larger value would produce
  duplicate IDs silently.
- The duplicate lint in CI is the safety net for a counter edited by hand or a
  badly resolved conflict.

## Fitting into the project

**New project.** `init` creates the foundation: a short constitution, a seed
glossary, the capability registry and the configuration. The first capability is
already born through the change cycle. CI starts in enforcing mode.

**Project under way without SDD.** Spec on touch: specs are born only for the
areas touched by changes. Reverse extraction is optional and per capability.
The requirement status tells inferred from approved. Existing tests get ID tags
little by little. Enforcement is a ratchet.

**Project that already uses Kiro, Spec Kit or OpenSpec.** `import` maps the
existing artifacts to kanon's format. kanon can coexist during the transition.

**Existing context files.** kanon adds at most one short pointer to `CLAUDE.md`
or `AGENTS.md` and never overwrites them. The rest of the knowledge stays in the
skills.

## Layout in the consuming repository

```text
.kanon/
  config.yml              # paths, forbidden words, thresholds
  capabilities/
    CHK.md                # prefix, counter, tombstones, split relations
specs/
  constitution.md
  glossary.md
  checkout/spec.md        # the current requirements of the capability
changes/                  # slice 2
```

One registry file per capability is what keeps changes in different
capabilities from contending for the same file.

## Out of scope and roadmap

| Item                                 | Situation | Reason                                                                   |
| ------------------------------------ | --------- | ------------------------------------------------------------------------ |
| Formalization (SMT, LTL)             | Roadmap   | A natural candidate for the Regulated track, supported by the stable IDs |
| Planguage for NFRs                   | Roadmap   | Optional artifact, and no validator depends on it                        |
| Adapters for other agents            | Roadmap   | The CLI and the artifacts are already agent-agnostic                     |
| Spec-as-source and code regeneration | Out       | Still experimental and non-deterministic                                 |
| Gherkin runner                       | Out       | kanon links scenarios; the project's test framework runs them            |
| Issue management                     | Out       | At most an optional export in the future                                 |
| A visual interface of its own        | Out       | Markdown artifacts and CI reports cover the need                         |

## What was left open

The exact criteria budget per track, and what the lint needs that this scope
does not say. Each one is a row in `../open-decisions.md`.
