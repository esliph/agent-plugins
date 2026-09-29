# Living documentation

A catalog of knowledge artifacts worth building and keeping under version control in a software project — generic, not specific to this repository. The last section applies the catalog to EsliphFinance.

## The organizing principle

Living documentation is not "up-to-date documentation". It is documentation with three properties:

1. It lives in the same repository as the code.
2. It has an **explicit update trigger** — not a calendar cadence.
3. It has an owner.

Anything without a trigger becomes a dead wiki within three months.

The second axis is to separate artifacts by **rate of change**. Mixing principles (which change yearly) with the state of the code (which changes per PR) in the same file is the most common cause of rotten documentation.

---

## Layer 1 — Intent

Changes rarely. It is the contract of values.

| Artifact | Answers | Update trigger |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **Constitution / Engineering Charter** | What is inviolable here: design principles, test policy, security policy, what we never do | Only by deliberate amendment, with an amendment log and a version |
| **Product Vision / North Star** | What problem, for whom, what success metric | Change of strategy |
| **Glossary / Ubiquitous Language** | What each domain term means — one meaning only | Every time a new term appears in code or spec |

The Constitution gained traction with _spec-driven development_ precisely because it is the document that AI agents read first. It is short — 1 to 2 pages — and each principle is testable ("monetary values are integers in cents", not "we value quality").

The Glossary is the most underrated item on the list. It is what makes the name in the code, the name in the spec and the name in the conversation with the business be the same name.

---

## Layer 2 — Decisions

Append-only, immutable.

| Artifact | Answers | Trigger |
| -------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| **ADR** (Architecture Decision Record) | Why this and not that, and what we accepted to lose | Every decision that is costly to reverse |
| **RFC / Design Doc** | The long proposal, before the decision | Before a large change; the ADR is the summary of the outcome |
| **Open Decisions / Decision Backlog** | What has **not** been decided yet | Every time someone bumped into a gap |
| **Debt Register (TDR)** | What debt we took on on purpose, with what payment trigger | When taking the shortcut consciously |

The golden rule of the ADR: **never edit an accepted ADR**. It gets the status `superseded by ADR-042`. The history of decisions is the asset; an ADR rewritten retroactively is worth zero. Use MADR or the Nygard format (Context / Decision / Status / Consequences), one per file, numbered.

**Open Decisions** is the artifact that almost nobody maintains and that avoids the most rework — especially with agents. Without it, the gap turns into silent invention: someone implements a rule that nobody approved. With it, the gap is an item with an ID that blocks implementation.

---

## Layer 3 — Specification

What the product **must** do.

| Artifact | Answers | Trigger |
| --------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| **Requirements with stable IDs** (RF/RNF/RN) | The canonical business rule | Before implementing any behavior |
| **Feature Spec** (per feature) | User stories, acceptance criteria in Given/When/Then, **out of scope** | Per feature, before the technical plan |
| **Quality Attribute Scenarios / NFR budget** | Latency, availability, cost — with numbers | When a number changes or is violated |
| **Domain model / invariants** | Aggregates, what can never be true | When modeling or remodeling a context |

The detail that makes the difference is **stable, citable IDs**. A requirement without an ID cannot be referenced by a test, by a commit, by an ADR. With an ID, there is bidirectional traceability — the test cites the rule, the rule knows which tests cover it, and a change has an impact radius computable by `grep`.

The **out of scope** field in the spec is worth as much as the scope. It is what prevents silent widening.

---

## Layer 4 — Architecture

What **is** built.

| Artifact | Answers | Trigger |
| ------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| **C4 (Context / Container / Component)** | How the system fits together, in 3 zooms | Structural change |
| **Arc42** (or an equivalent skeleton) | Canonical index of the architecture document | Serves as a frame, does not change |
| **Context Map / per-domain map** | Where each rule lives, boundaries between contexts, **what does not exist yet** | In the same PR that changes the context's code |
| **Data model / ERD + migration policy** | Shape of the data and how it evolves | Every migration |
| **Threat model (STRIDE)** | Attack surface and mitigation | Surface change: new endpoint, new integrator |

Hard rule: **diagrams are code**. Mermaid, PlantUML or Structurizr DSL versioned as text. A `.drawio`, a Figma or a PNG pasted into Confluence is not living documentation — it is an artifact that nobody can diff and therefore nobody updates.

Critical distinction between layers 3 and 4: the specification says what **must** be; the architecture says what **is**. Merging the two eliminates the ability to see the gap.

---

## Layer 5 — Contracts

Generated, not handwritten.

| Artifact | Answers | Trigger |
| ------------------------------------ | ---------------------------------------------------- | -------------------------------- |
| **OpenAPI / AsyncAPI / GraphQL SDL** | The exact contract of the interface | Generated from the code, in CI |
| **Error catalog** | Stable error codes and what each one means | New error code |
| **Event catalog / schema registry** | Which events exist, what the payload is, who consumes them | New event or schema change |
| **Versioning & deprecation policy** | How we break compatibility without breaking the client | Rarely |

If it can be generated, **do not write it**. A handwritten contract diverges from the code on day one. What is written by hand is the policy around it (versioning, deprecation), not the contract.

---

## Layer 6 — Operations

What sustains it in production.

| Artifact | Answers | Trigger |
| ----------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| **Runbooks** (one per alert/procedure) | What to do at 3 a.m. | Every new alert; every incident that revealed a missing step |
| **SLO/SLI + error budget policy** | What "good enough" is and what we do when it is blown | Quarterly or on violation |
| **Postmortems** (blameless, append-only) | What happened, why, which actions | Every relevant incident |
| **On-call handbook / escalation** | Whom to call, when | Team change |
| **DR / restore drill log** | Does the backup actually restore? When did we last test it? | Every drill |
| **Feature flag registry** | Which flags exist, who owns them, when they die | New flag |

A postmortem is only alive if the actions become tracked items with an owner and a deadline — otherwise it is documented catharsis. The flag registry is what prevents invisible debt: temporary flags that become permanent because nobody knows whether they are still in use.

---

## Layer 7 — How we work here

| Artifact | Answers | Trigger |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| **CONTRIBUTING + Definition of Done** | When a task is really done | Process change |
| **CLAUDE.md / AGENTS.md** | The contract with AI agents: where the truth is, what never to do, how to run | When an agent errs for lack of context |
| **Style guide** (only what the linter misses) | Naming, language, granularity | New style decision |
| **Test strategy** | What is unit, what is e2e, what gets mocked | Change of strategy |
| **Onboarding path** | First day, first week | Every time a newcomer stumbles |

`CLAUDE.md`/`AGENTS.md` has become a first-class artifact. The pattern that works is for it to be an **index and policy**, not content: it says _where_ the truth is and _which_ rules are never broken, and delegates the rest. Duplicated content in it rots like in any other.

Its trigger is the best there is: every time an agent or a newcomer errs for lack of context, it is a sign of a missing line. This makes the document self-correcting.

---

## Layer 8 — Historical trail

- **CHANGELOG.md** in the Keep a Changelog format, aimed at the consumer — it is not `git log`.
- **Release notes**.
- **Migration / upgrade guides**.
- **Deprecation register**, with removal date and replacement.

---

## What really makes documentation alive

The artifacts are the easy part. What separates living documentation from a dead wiki is six mechanisms:

1. **Docs-as-code, in the same PR.** If the documentation update does not fit in the PR that changed the code, it does not happen. This implies the same repository, plain text, review in the same review.
2. **Trigger, not cadence.** Each document says at the top _when_ it must be updated. "Review quarterly" is a promise nobody keeps; "update in the same PR that changes `src/domain/billing`" is executable.
3. **Traceability by ID.** Code → rule, test → rule, ADR → requirement, incident → runbook. It is what makes it possible to answer "what breaks if I change this rule" without reading everything.
4. **Automation in CI.** Link checker, structure lint, generated diagrams and contracts, and a `last-reviewed` field that makes CI warn when it passes N months.
5. **Lifecycle instead of deletion.** `draft → accepted → superseded/deprecated`. Deleting erases the "why"; marking preserves it.
6. **Single source with an owner.** Each fact lives in exactly one file; the others link. Duplication is a guarantee of divergence.

Sanity test: **if nobody reads it, it is not alive**. Twenty documents of 400 lines each is a dead system. Prefer few short documents, generated where possible, with a clear index.

---

## Anti-patterns that kill

- A wiki (Confluence/Notion) parallel to the repository — diverges by construction.
- A diagram in a binary format.
- An ADR edited retroactively.
- A document that narrates the code line by line — the code already does that better.
- "Documentation coverage" as a goal — produces volume, not truth.
- A document with no owner in CODEOWNERS.
- A requirement without an ID.

---

## Minimum set per stage

| Stage | Start with |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| **Solo / prototype** | README, `AGENTS.md`/`CLAUDE.md`, ADRs, Open Decisions |
| **Small team / real product** | + Constitution, Requirements with IDs, Glossary, C4 level 1–2, CHANGELOG, Test strategy |
| **Production with users** | + SLOs, Runbooks, Postmortems, Threat model, generated contracts, deprecation policy |
| **Multiple teams** | + Context Map, RFC process, Debt Register, Event catalog |

The order matters: **ADR and Open Decisions before everything**. They cost almost nothing and are the only ones that capture information that is truly lost — the "why" and the "we don't know yet". The rest can be reconstructed from the code; these two cannot.

---

## Current state of EsliphFinance

| Layer | Situation |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Intent | **Partial.** The inviolable principles are scattered in `CLAUDE.md`, with no Constitution of their own. No Glossary. |
| 2 — Decisions | **Partial.** `docs/open-decisions.md` (DA0xx) covers the "not yet decided" well, but there are no ADRs: the "why" of the technical decisions only exists in the commit history. |
| 3 — Specification | **Covered.** `docs/requirements.md` with stable IDs (RF/RNF/RN). |
| 4 — Architecture | **Covered.** `docs/domains/` per context and `docs/architecture/` per cross-cutting axis. |
| 5 — Contracts | **Absent.** No generated OpenAPI nor error-code catalog. |
| 6 — Operations | **Absent.** There is no production yet. |
| 7 — How we work here | **Covered.** `CLAUDE.md`, `server/CLAUDE.md` and the skills in `.claude/skills/`. |
| 8 — Historical trail | **Absent.** No CHANGELOG. |

Most relevant holes today, in order: **ADRs**, **Glossary**, **CHANGELOG**.
