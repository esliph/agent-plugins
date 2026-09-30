---
id: ADR-0003
title: The toolkit root and the validated repository root are distinct
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-24
relates-to: [DA-0001, ADR-0002]
supersedes: null
superseded-by: null
---

# ADR-0003 — The toolkit root and the validated repository root are distinct

## Context

Phases 0–1 fixed `LIVING_DOCS_ROOT=/app` as the single root: the same path is
used to find `docs/.ownership.yml` and to run `src/hooks/*.ts`. That works
because this repository validates itself, and works for nothing else — a
consumer project has no `src/hooks/` inside it. `DA-0001` recorded the gap.

The engine is already ready for the separation: `runInit`, `runValidate` and
`decideHk1/3` receive the repository root as an argument, and `init.ts` resolves
`templates/` through `import.meta.dirname`. What confuses the two things are the
`?? '/app'` defaults, the single-volume `compose.yaml` and the two bash wrappers.

## Alternatives considered

**One root, with the toolkit copied into the consumer project.** Discarded:
it turns every toolkit update into a manual merge in the repository of whoever
uses it, and produces N diverging copies of the engine — the same disease the
toolkit exists to fight, applied to itself.

**One root, with the toolkit published on npm and installed as a dependency.**
Discarded in this phase: it contradicts `ADR-0001` ("nothing runs on the host
beyond Docker"), since `npm install` in the consumer project requires a
toolchain on the host. It remains the natural path once `ADR-0001` is
superseded.

**`LIVING_DOCS_ROOT` kept as an alias of `LIVING_DOCS_REPO_ROOT`.** Discarded:
the ambiguous name is the cause of the problem. An alias that resolves to "the
right root in most cases" reintroduces the confusion exactly where it is most
expensive — a hook reading the toolkit's `.ownership.yml` instead of the
validated project's `.ownership.yml` blocks or allows an edit by the wrong rule,
silently.

## Decision

The toolkit now knows **two** independent roots: its own, derived from
`import.meta.dirname` (`toolkitRoot()`), and that of the validated repository,
coming from `LIVING_DOCS_REPO_ROOT` or from the working directory
(`repoRoot()`). In the container, the toolkit source lives at `/opt/living-docs`
and the validated repository is mounted at `/workspace`. `LIVING_DOCS_ROOT` is
removed.

## Consequences

### What we gain

- The toolkit is installable in any project: `LIVING_DOCS_TARGET=/path/to/project docker compose up -d`.
- The separation is exercised in every test of the repository itself, because
  dogfooding mounts the same checkout at both paths — instead of staying agreed
  on paper and breaking at the first consumer.
- Hooks and CLI stop embedding an absolute path; the only source of paths is
  `src/core/roots.ts`.

### What we accept to lose

- **A compatibility break.** `LIVING_DOCS_ROOT` is no longer read. Whoever has a
  script pointing to it needs to rename it. It is cheap now (version `0.1.0`, a
  single consumer: this repository) and expensive later.
- **One more volume in `compose.yaml`** and one more path to explain in the
  README. The reading cost goes up a little for everyone, including whoever only
  does dogfooding and will never install the toolkit anywhere else.
- **Distribution is still the repository checkout**, not a versioned package. A
  consumer still needs to clone this repository and point `LIVING_DOCS_TARGET`.
  Publishing an image or package is a future decision, and this ADR does not
  take it.
