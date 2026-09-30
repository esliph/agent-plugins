---
id: ADR-0037
title: An ID prefix may be declared in several ownership entries; its sequence is one per repository
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0036, ADR-0011, ADR-0023, ADR-0029, RN-0040]
supersedes: null
superseded-by: null
---

# ADR-0037 — An ID prefix may be declared in several ownership entries; its sequence is one per repository

## Context

`ADR-0036` puts the documents of each project in its own `docs/`. The living-docs
configuration refuses an `id-prefix` declared in more than one `owned` entry, so
every ADR of the repository would have to stay in one directory, or each project
would need its own prefix. The composition across ownership files already exists
(`ADR-0023`), and `living-docs/id-integrity` already collects declarations from
every entry at once.

## Alternatives considered

1. **A prefix per project.** Discarded: IDs already cited across the corpus would
   change or split, and two families would mean the same kind of decision.
2. **An ID space per project, with qualified citations.** Discarded: every
   citation and the citation parser would change, and a citation without the
   qualifier would become ambiguous.
3. **One prefix in several entries, sharing one sequence.** Chosen.

## Decision

- The same `id-prefix` may appear in several `owned` entries, one per project.
  All entries of a prefix share a single contiguous sequence, checked across the
  repository.
- A new ID takes the next free number in the repository, whichever entry it is
  written in.
- `role` stays unique. A plugin's `CLAUDE.md` is a plain document, with no
  `role`; the agent-contract duplication check applies to the root contract only.
- When a tool needs one entry for a prefix (a second run of `init`), it takes the
  entry declared in the root ownership file, or else the first in resolution
  order.

## Consequences

### What we gain

Each project keeps its decisions next to its code under the IDs every citation
already uses.

### What we accept to lose

The prefix no longer says where an item lives: finding `ADR-0019` takes a search
across entries. Two people writing in two projects at the same time can take the
same number; `living-docs/id-integrity` catches it only when validate runs.
