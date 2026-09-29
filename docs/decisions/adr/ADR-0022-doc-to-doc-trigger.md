---
id: ADR-0022
title: 'Doc→doc trigger: derives-from declared by type in ownership and by instance in the frontmatter'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-18
relates-to: [ADR-0019, RN-0036]
supersedes: null
superseded-by: null
---

# ADR-0022 — Doc→doc trigger: derives-from declared by type in ownership and by instance in the frontmatter

## Context

Today the core only knows how to watch code→doc (`watches`): a glob of code paths
points to an owning document, and editing the code without the doc in the same
commit raises a warning. An SDD plugin needs a trigger the spec calls doc→doc:
editing a spec warns about the plan that derives from it, without warning about
all the plans in the directory — the reminder must be precise per instance, not
per whole directory.

This decision covers §4 of
`docs/superpowers/specs/2026-09-17-ownership-core-design.md`, the spec of the
ownership core.

## Alternatives considered

- **Declaring the derivation by type only** (every file in `docs/…/plans/`
  derives from `docs/…/specs/`). Discarded: too coarse — editing any spec would
  warn about all the plans in the directory, and the reminder becomes noise
  instead of pointing to the right document.
- **Declaring the derivation by instance only**, with no type in the ownership
  file. Discarded: the name of the field that points to the origin would become an
  unvalidated convention — the same problem that made `field-map` exist — and a
  mistyped field in the frontmatter would vanish silently, without the core
  knowing it should exist there.

## Decision

The doc→doc trigger has two halves. The ownership file declares, by type, that
artifacts of one path derive from artifacts of another and through which
frontmatter field (`derives-from: { source, field }`); each instance declares, in
its own frontmatter, which specific file it derives from. The type gives reach and
validation — the field exists, points inside `source`, the target exists —, and
the instance gives the exact target that makes the reminder precise.

## Consequences

### What we gain

Editing a spec warns about the right plan, not the whole directory. SDD gains the
same reminder mechanism that code→doc already has, without rewriting the trigger
logic.

### What we accept to lose

Every instance that derives from another document has to declare the field in its
own frontmatter — a document without the declaration simply is not watched, and
nothing warns that it should be. `derives-from.source` is confined to the base of
the file that declares it: pointing outside the base is an error, and a consumer
who wants derivation between distinct packages of the monorepo cannot declare it
in a single ownership file.
