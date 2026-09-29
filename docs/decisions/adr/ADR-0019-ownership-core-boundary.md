---
id: ADR-0019
title: 'Ownership core boundary: owner, lifecycle and trigger inside; IDs and freezing outside'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-18
relates-to: [ADR-0002, RN-0032, RN-0037]
supersedes: null
superseded-by: null
---

# ADR-0019 — Ownership core boundary: owner, lifecycle and trigger inside; IDs and freezing outside

## Context

living-docs today is a single engine (`ADR-0002`) that resolves owner, lifecycle,
trigger, ID family and freezing in the same package, for a single consumer. A
second artifact domain — an SDD plugin, with spec/plan/constitution — needs the
first three responsibilities and does not want the last two the way living-docs
defines them: a prefix of two to four letters, padding and a gap-free sequence
make no sense for a plan task, and "accepted is frozen" is decision semantics, not
that of every artifact. Extracting a core requires deciding the exact boundary
between what the second consumer inherits and what remains exclusive to
living-docs.

This decision covers §1 of
`docs/superpowers/specs/2026-09-17-ownership-core-design.md`, the spec of the
ownership core.

## Alternatives considered

- **Also moving the ID family and the freezing up into the core.** Discarded: not
  every artifact collection wants a formatted prefix, padding and a gap-free
  sequence, nor does every collection treat "accepted" as an immutable final
  state — the SDD plan itself is a dated record, not a decision to freeze.
  Generalizing those two pieces now, with one and a half consumers, is designing
  an extension protocol without the second consumer to test it.
- **Not extracting anything now and leaving living-docs as it is.** Discarded: it
  is the problem that motivates the extraction — a new plugin would duplicate
  owner, lifecycle and trigger whole to gain the three responsibilities that
  already exist, and the duplicate diverges at the first case not covered by
  both.

## Decision

The `@esliph/ownership` core takes on three responsibilities and only them: owner
per path, lifecycle by declared state with an opaque item identity, and the
code→doc and doc→doc trigger. The ID family (prefix, format, padding, sequence,
retirement, citation coverage) and the freezing of an accepted artifact remain
whole in `@esliph/living-docs`, which comes to depend on the core instead of
containing it.

## Consequences

### What we gain

A second domain plugin (SDD) reuses owner, lifecycle and trigger without
inheriting ID vocabulary or freezing semantics it did not ask for. The core is
born small enough to have a real consumer and a half before any extension
protocol.

### What we accept to lose

**Reopens `ADR-0002`** (one validation engine for the CLI and the hooks). The
engine stops being single: what today is `src/config`, `src/frontmatter`,
`src/docs` and `src/ids` in one package splits between the core (owner,
lifecycle, trigger) and living-docs (ID, freezing) — `ADR-0002` remains `draft`,
and a new decision covers the real split when the extraction happens.

Whoever wants to know "why does this artifact have this rule" now consults two
packages instead of one: if the question is about owner or state transition, the
answer is in the core; if it is about prefix or freezing, it is in living-docs.
