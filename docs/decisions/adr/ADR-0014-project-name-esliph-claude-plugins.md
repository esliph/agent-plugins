---
id: ADR-0014
title: Project name — @esliph/living-docs
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-01
relates-to: [RN-0010]
supersedes: null
superseded-by: null
---

# ADR-0014 — Project name — @esliph/living-docs

## Context

The name `living-docs-toolkit` was spread across five layers that have to agree
with one another: `package.json` and `package-lock.json` (package identity),
`compose.yaml` (`container_name`), and the default of `LIVING_DOCS_CONTAINER` in
`bin/living-docs` and `plugin/hooks/run-hook.sh` — the wrappers only find the
container that `docker compose up` brought up if the two names match. The
decision to adopt the `@esliph` scope and the name `living-docs` forces touching
all five at once; a half-renamed state is a broken state, not an intermediate
step.

## Alternatives considered

- **Keep `living-docs-toolkit` and add `@esliph/living-docs` as an alias or
  secondary field.** Discarded: two names for the same thing is the ambiguity
  `RN-0010` fights — a `grep` for the name would start returning two, and neither
  would be "the" name.
- **Rename only the npm package and leave container, wrappers and docs under the
  old name.** Discarded: the default of the wrappers has to match the compose
  `container_name`; leaving that half under the old name makes
  `./bin/living-docs` look for a container that does not exist.
- **Use `@esliph/living-docs` literally as the `container_name` too.**
  Discarded: `@` and `/` are not valid characters in a Docker container name.
  `esliph-living-docs` is the closest form Docker accepts.
- **Rename everything, including ADR-0001 and the plans in
  `docs/superpowers/plans/`.** Discarded: ADR-0001 is frozen by convention
  (`trigger`: "Immutable once accepted") and the plans are a dated record.
  Rewriting the name inside them would falsify what was written when they were
  produced; the divergence there is historical and expected.

## Decision

The name of the project and of the package becomes **`@esliph/living-docs`**. The
Docker container and the default of `LIVING_DOCS_CONTAINER` become
**`esliph-living-docs`**. The CLI command remains `living-docs` (the
`bin/living-docs` file and the `bin` key of `package.json` intact). A frozen
artifact (ADR-0001) and a historical record (plans) keep the old name.

## Consequences

### What we gain

A single name, under the `@esliph` scope, resolved from a single point in each
layer. The `living-docs` command does not change, so nothing breaks for whoever
already invokes it or for the installed CI workflow, which does not mention
Docker.

### What we accept to lose

The identity of the repository is tied to the `@esliph` scope: changing scope
again repeats this work across the same five layers. ADR-0001 and the plans now
cite a name (`living-docs-toolkit`) that no longer exists anywhere executable —
whoever reads those documents needs to know it corresponds to
`esliph-living-docs` in the container. And `package-lock.json` had its `name`
field edited by hand; the next `npm install` inside the container rewrites the
file, and it is the source of truth for the lock.
