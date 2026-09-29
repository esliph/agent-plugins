---
id: ADR-0027
title: Project name — root esliph, package @esliph/living-docs
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-18
relates-to: [ADR-0014, ADR-0025, RNF-0002]
supersedes: null
superseded-by: null
---

# ADR-0027 — Project name — root esliph, package @esliph/living-docs

## Context

`ADR-0014` made `@esliph/living-docs` the name of the project and of the package
at the same time, when the repository had a single package. `ADR-0025` placed
`packages/ownership` beside it, and the physical slice of the migration moves
living-docs to `packages/living-docs`. The root stops being a package and becomes
the workspace that gathers the two. An npm package name is unique per
`package.json`, and the root and the package cannot have the same name.

This decision supersedes `ADR-0014` once it is accepted. While it is `draft`, the
`supersedes` field stays `null`: `ADR-0014` is accepted and frozen, and closing
the pair (`supersedes` here and `superseded-by` there) is part of the promotion,
which is human.

## Alternatives considered

- **The root stays `@esliph/living-docs`, and the package gets another name.**
  Discarded: the package name is what whoever consumes installs and cites, and
  renaming it would break a public contract only to accommodate a root that is not
  published.
- **The root with no `name`.** Discarded: npm accepts it, but the lockfile and the
  workspace error messages start showing an anonymous project, and the marketplace
  is already called `esliph`.
- **The root `@esliph/monorepo` or `@esliph/root`.** Discarded: a scope suggests
  publication, and the root is `private: true`, never published.

## Decision

The repository root becomes `esliph`, private and unscoped, with the same name as
the marketplace; `@esliph/living-docs` remains the name of the toolkit's package,
now in `packages/living-docs/`, and the container `esliph-living-docs` and the
command `living-docs` do not change.

## Consequences

### What we gain

One name for what is distributed (`esliph`, the marketplace and the workspace) and
one for each thing that is installed (`@esliph/living-docs`, `@esliph/ownership`),
with no overlap.

### What we accept to lose

`ADR-0014` and the earlier plans describe the root as `@esliph/living-docs`. They
stay as a record, and whoever reads them needs to know that this identity moved to
`packages/living-docs/`.
