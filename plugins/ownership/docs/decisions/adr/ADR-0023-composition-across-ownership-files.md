---
id: ADR-0023
title: 'Composition across ownership files: a base per file, disjoint paths, include without authority'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-18
relates-to: [ADR-0019, ADR-0020, RN-0034]
supersedes: null
superseded-by: null
---

# ADR-0023 — Composition across ownership files: a base per file, disjoint paths, include without authority

## Context

A monorepo — this very repository, after the extraction — wants more than one
ownership file: one per package, or one centralized at the root covering packages
that have none of their own. The v1 schema has no notion of composition at all; an
ownership file is always a single one, and extending that assumption to several
files requires deciding how each one's base is computed, what happens when two
files declare the same path, and how much authority an included file gets from the
file that includes it.

This decision covers §5 of
`docs/superpowers/specs/2026-09-17-ownership-core-design.md`, the spec of the
ownership core.

## Alternatives considered

- **Overlap resolved by specificity** (the most specific path wins, like a
  directory hierarchy). Discarded: it is what v1 tolerates today, and not by
  design — the owner lookup picks the first declared entry that matches, while the
  document collection applies all that match, two different semantics for the same
  overlap. `docs/` with a general owner and `docs/decisions/adr/` with
  `decision-recorder` stops being expressible under disjointness, and the cost is
  accepted: this repository's 23 entries are already disjoint.
- **`include` grants authority to the including site** (the including file can
  restrict or widen what the included one governs). Discarded: it would be a
  second declaration of scope, able to diverge from the first — what the included
  file governs is a matter for its base, and `include` only says "also read this
  file".
- **Confining every path field to the file's base, with no exception.** Discarded
  for `watches[].doc`: a package watching `packages/api/src/**` and pointing to the
  root's `CHANGELOG.md` is a real case, and confining that field would force every
  package to have its own changelog — a project decision the core has no reason to
  impose. The other fields (`owned[].path`, `generated[].path`, `ignore[]`,
  `watches[].code`, `derives-from.source`) remain confined because they name a
  path whose editing triggers something.

## Decision

The effective base of a file is its directory plus the optional `basePath`, which
accepts neither `..` nor a glob and only descends — with one exception: the root's
base is always the repository root. Resolved against their bases, all the
`owned[].path` of all files form a disjoint set — none equals another, none is a
directory prefix of another —, and a collision is a load error that names the two
files and the path, whether it is inside a file, between siblings or between a
file and another that includes it. `include:` only says "also read this file": it
confers neither scope nor authority. `watches[].doc` is the only path field free
of the base — the others stay confined to it, by the criterion of "the path can be
edited and trigger something".

## Consequences

### What we gain

"Which rule covers this path" gets a single answer independent of declaration
order, and the two diverging semantics of lookup and collection that v1 carries
today cease to exist. A monorepo can have both centralized ownership (`basePath`
shifting the base) and one file per package, with none reaching outside its own
base.

### What we accept to lose

`docs/` with a general owner and `docs/decisions/adr/` with the
`decision-recorder` stops being expressible — whoever wants both declares the
siblings one by one. A file whose base is not an ancestor of the resolved path is
discarded without being opened (pruning), which is fast but means that `validate`
and `explain`, which never prune, are the only places where collision and coverage
are finally checked in full.
