---
id: ADR-0026
title: 'Named identifier for checks and hooks: plugin/descriptive-name replaces numbering'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-18
relates-to: [ADR-0019]
supersedes: null
superseded-by: null
---

# ADR-0026 — Named identifier for checks and hooks: plugin/descriptive-name replaces numbering

## Context

Today's checks and hooks are numbered by family (`CI-n`, `HK-n`), a table the
reader has to consult to know what failed — "check seven failed" says nothing on
its own. A new plugin (the core, and later SDD) needs to register its own checks
and hooks without colliding with the numbering of those that already exist, and
without the number of a neighbor depending on installation order.

This decision covers §6 of
`docs/superpowers/specs/2026-09-17-ownership-core-design.md`, the spec of the
ownership core.

## Alternatives considered

- **Continuing to number, with a range reserved per plugin** (for example
  `CI-100` to `CI-199` for the core). Discarded: reserving a range is an agreement
  that lives outside the code, and the problem of "the number says nothing"
  remains — it just stops colliding.
- **A single increasing numbering across all installed plugins**, renumbering
  according to installation. Discarded: the number of a check would change
  depending on which plugins are installed, breaking any reference written
  earlier — exactly the instability an identifier should avoid.

## Decision

Checks and hooks of the core — and of every new plugin — use the identifier
`plugin/descriptive-name` (`ownership/generated-drift`,
`ownership/promotion-guard`) instead of `CI-n`/`HK-n` numbering. The namespace is
the name of the publishing plugin: a new plugin never collides with an existing
name, and the name says what the check verifies without a translation table. The
form applies only to what is new; renaming the numbered identifiers that
living-docs already exposes is work for the migration spec, not for this decision.

## Consequences

### What we gain

A failure reported as `ownership/generated-drift` says, on its own, what to verify
and where — without consulting a table. Plugins installed together never collide
on name, because the namespace is already the name of each.

### What we accept to lose

The repository comes to have two identifier conventions at the same time —
`CI-n`/`HK-n` in living-docs, `plugin/name` in the core — until the migration spec
renames the old side, and whoever reads a report with both sides learns both forms
before understanding what failed. Referencing a core check in prose becomes longer
to type than `CI-3`.
