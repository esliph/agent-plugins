---
id: ADR-0038
title: One-time relocation of frozen artifacts into their project's docs/
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0033, ADR-0036, ADR-0037]
supersedes: null
superseded-by: null
---

# ADR-0038 — One-time relocation of frozen artifacts into their project's docs/

## Context

`ADR-0036` moves each document to the project whose code it governs. Accepted
ADRs and paid TDRs are frozen, and `living-docs/append-only` denies an edit to
one. `ADR-0033` already settled how a frozen file changes path once without
disabling the guard: a write to a path that does not exist yet is a new item for
the guard.

## Alternatives considered

1. **Leave frozen artifacts at the root.** Discarded: a project's decision
   history would live away from the project, and only the mutable half of it
   would move.
2. **Supersede each frozen ADR with a copy in its project.** Discarded: it
   doubles the ADR count with decisions that decide nothing.
3. **A one-time relocation under this ADR, same ID and content.** Chosen.

## Decision

Accepted ADRs and paid TDRs move to their project's `docs/` **once**: same ID,
same body, same frontmatter, same `last-reviewed`. Only the path changes. Each
commit writes the new path and removes the old one in the same commit, cites
`ADR-0038` and lists the IDs it moves. The guard is never disabled. This is valid
only for the commits of this migration; a later move of a frozen artifact needs a
decision of its own.

## Consequences

### What we gain

Every project carries its whole decision history, under the same IDs.

### What we accept to lose

Paths written in the prose of frozen artifacts (`docs/decisions/adr/`,
`packages/…`) keep describing the old layout and are not corrected. The
`pay-when` of `TDR-0001`, which is accepted permanently, names
`docs/requirements/**` and, after the move, covers only the root requirement
file.
