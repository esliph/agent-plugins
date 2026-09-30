---
id: ADR-0036
title: Each plugin is a self-contained project under plugins/<name>/
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [DA-0009, ADR-0035, ADR-0023, ADR-0025, ADR-0016, TDR-0003, RN-0041]
supersedes: null
superseded-by: null
---

# ADR-0036 — Each plugin is a self-contained project under plugins/<name>/

## Context

`ADR-0035` made the root the marketplace's page. The structure still assumes one
toolchain and one plugin: the root is an npm workspace over `packages/*`, the
container and `bin/` exist only for living-docs, the single workflow runs
`npm ci` for everything, and the root `docs/` is living-docs' product
documentation. `DA-0009` recorded the gap: a plugin that is not Node, or not
about documentation, has no place of its own.

## Alternatives considered

1. **Keep the workspace and add plugins under `packages/`.** Discarded: a Python
   or Markdown-only plugin would still inherit the root `npm ci`, the root lint
   and a workflow that knows nothing about it.
2. **One repository per plugin.** Discarded: the marketplace manifest, the single
   ID space and the governance checks that compose the whole repository at once
   (ID uniqueness, links across projects, owner coverage) would split with it.
3. **A self-contained project per plugin under `plugins/<name>/`, whose
   distributed directory is `plugin/`.** Chosen.

## Decision

- Each plugin is a project under `plugins/<name>/`. What is distributed is
  `plugins/<name>/plugin/`, the `source` in `marketplace.json`. Tests,
  documentation, toolchain and container stay outside it.
- The root has no language toolchain; it keeps `.editorconfig`,
  `.gitattributes` and `.prettierrc`.
- CI: one workflow per plugin, filtered by `plugins/<name>/**`, plus
  `marketplace.yml`, which always runs and holds the global checks.
- Minimum governance of a plugin: `plugin/.claude-plugin/plugin.json`, a
  `README.md` for outside readers, a `CHANGELOG.md` and a `.ownership.yml`
  (`RN-0041`). `docs/` exists only when the plugin has something to record.
- One ID space across the repository; the documents of each project live in its
  own `docs/`.
- A Node plugin has two `package.json`: `plugin/package.json` with the runtime
  dependencies and its runtime lockfile (what the marketplace cache installs),
  and a private project `package.json` that links `file:./plugin` and holds the
  development dependencies, the scripts and the development lockfile. There is
  no lockfile at the root.
- A path inside a plugin's `living-docs:` block (`cited-by`) is read from the
  repository root, as before: the core confines only its own path fields
  (`ADR-0023`).

What moved: `packages/ownership/` → `plugins/ownership/{plugin,test}/`;
`packages/living-docs/` → `plugins/living-docs/{plugin,test}/`; `Dockerfile`,
`compose.yaml`, `.dockerignore` and `bin/` → `plugins/living-docs/`;
`living-docs.yml` → `marketplace.yml`; `wrapper-docker.yml` → a job of
`plugin-living-docs.yml`. Accepted ADRs that describe the old layout
(`ADR-0016`, `ADR-0025`, `ADR-0027`, among others) are not edited; this list is
where the new paths are named.

## Consequences

### What we gain

A new plugin — Node, Python or Markdown only — gets a directory, a workflow and a
documentation home without touching any root file other than `marketplace.json`
and `README.md`. What an installer receives is exactly `plugin/`, which a test
can check.

### What we accept to lose

There is no root `npm test` any more: each plugin is tested from its own project.
While living-docs depends on the core by path (`TDR-0003`), working on it needs
two `npm ci`, and its workflow also runs on core changes. `git log` without
`--follow` stops at the move. Each plugin's workflow repeats the setup lines.
