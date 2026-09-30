---
id: ADR-0025
title: 'Distributing the core as a package in packages/: build only on prepack'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-18
relates-to: [ADR-0015, ADR-0012, RNF-0002, RF-0016]
supersedes: null
superseded-by: null
---

# ADR-0025 — Distributing the core as a package in packages/: build only on prepack

## Context

`ADR-0015` decided "no build step" for the whole toolkit, when it was a single
package always run from its own checkout. The extraction creates
`packages/ownership`, published as a dependency of `packages/living-docs` and
potentially of a third plugin: `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`
(measured on 2026-09-17, Node v24.18.0) prevents Node from stripping the types of
`.ts` under `node_modules`, so an `@esliph/ownership` published as TypeScript
source does not run when installed as a dependency of another package.

This decision covers §7 of
`docs/superpowers/specs/2026-09-17-ownership-core-design.md`, the spec of the
ownership core.

## Alternatives considered

- **Publishing a versioned `dist/` in the repository.** Discarded for the same
  reason `ADR-0001` already recorded: a stale `dist/` makes the hook run old code
  silently — the fear that motivated fleeing the build step in the first place.
- **Always compiling, including in development.** Discarded: it would reopen the
  same class of risk — generated code that can diverge from the source while
  someone edits — exactly on the path the hooks walk on every commit.
- **Not publishing as an npm package; keeping everything inside a single
  plugin.** Discarded: it is the problem the extraction solves — a second domain
  plugin (SDD) needs the core as an installable dependency, not as copied code.

## Decision

The repository becomes a monorepo-marketplace: one directory per plugin in
`packages/`, each with its own `package.json` and lockfile. `packages/ownership`
runs in two ways from the same source — TypeScript directly through
type-stripping when it is the plugin itself (it is not under `node_modules`), and
`dist/*.js` when it is a library of a domain plugin (it is under
`node_modules`). `dist/` never exists in the repository: it is generated only on
`prepack` and only exists inside the published tarball. In development, a
`development` condition in `exports` resolves to `src/index.ts` through a
workspace symlink, so the checkout never compiles and never has a `dist` to go
stale.

## Consequences

### What we gain

A second domain plugin installs `@esliph/ownership` as an ordinary npm
dependency, with the same runtime that already runs the toolkit today. No
development machine compiles anything, and the fear of a stale `dist` recorded in
`ADR-0001` does not come back, because no `dist` ever exists outside the tarball.

### What we accept to lose

**Supersedes, in part, `ADR-0015`.** "No build step" stops being a statement about
the whole toolkit and holds only for the checkout — the published package is
compiled on `prepack`, and that half of the earlier decision does not survive
without qualification. `ADR-0015` remains recorded as it is; it is this new
decision that qualifies the part that changes, and the requirement that expressed
it (`RNF-0002`) is rewritten for the same qualification.

**Reopens `ADR-0012`** (the stage parameterizes the workflow checks; the hooks
come in as a single piece). An indivisible plugin registration stops holding for a
repository with two plugins: each one — core and living-docs — comes to have its
own `hooks.json`, and "the hooks are a single piece" becomes "the hooks are a
single piece per plugin". How the two sets of hooks coexist is left for when the
extraction actually splits the files.

**Requires a new decision about the project name.** `ADR-0014`
(`@esliph/living-docs`) described a single-package repository; with
`packages/ownership` and `packages/living-docs` as distinct packages of the same
monorepo, the name of the repository and the name of the first package stop being
the same question, and that decision is not taken here.

**Gains a proof gap**, closed only when the packaging test exists: a badly written
`exports` or a file missing from `files` would only show up at the first real
consumer, because no developer exercises the packaged form day to day.
