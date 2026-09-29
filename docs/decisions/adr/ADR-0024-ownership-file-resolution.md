---
id: ADR-0024
title: 'Ownership file resolution: candidate order, ambiguity is an error'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-18
relates-to: [ADR-0019, ADR-0023, RN-0035]
supersedes: null
superseded-by: null
---

# ADR-0024 — Ownership file resolution: candidate order, ambiguity is an error

## Context

The path of the root `.ownership.yml` is today fixed at `docs/.ownership.yml`. The
core serves a project that may have no artifacts in `docs/` — whoever installs
chooses where they live — and needs a candidate order to find the root without
ambiguity, including the case of a freshly migrated project that still has both
places occupied.

This decision covers §8 of
`docs/superpowers/specs/2026-09-17-ownership-core-design.md`, the spec of the
ownership core.

## Alternatives considered

- **Silently picking the first candidate found, when more than one exists.**
  Discarded: a freshly migrated file living alongside a forgotten one would mean
  validating by the forgotten one with no warning at all — the same class of
  enforcement that disappears silently that motivated earlier reorganizations of
  this repository.
- **A single fixed path, with no list of candidates.** Discarded: it would force
  every project to put the file exactly at `docs/.ownership.yml` or exactly at the
  root, with no middle ground — and a repository migrating from
  `docs/.ownership.yml` (v1) to a leaner root would lose the gradual passage.

## Decision

The root is found by candidate order: explicit (`--ownership <path>` or an
environment variable), then `./.ownership.yml`, then `./docs/.ownership.yml`, and
no candidate present is valid silence — a repository without the toolkit. Two
candidates present at the same time is an error that names both, never a choice.
The rule applies only to the root: the other files of a repository with
composition (`ADR-0023`) are not candidates, they are included — and the root's
base is always the repository root, whichever candidate won.

## Consequences

### What we gain

A project migrating from `docs/.ownership.yml` to the root, or the reverse, never
validates by the wrong file silently — the ambiguity becomes a visible error
instead of an arbitrary choice. `docs/.ownership.yml` can still govern `src/**`
and `CLAUDE.md` without declaring any base, because the root's base is never the
file's directory.

### What we accept to lose

A repository with both candidates present by mistake — for example, a merge that
brought back a forgotten `docs/.ownership.yml` — stops validating until someone
removes one of the two; there is no possible automatic resolution without risking
the silence this decision refuses.
