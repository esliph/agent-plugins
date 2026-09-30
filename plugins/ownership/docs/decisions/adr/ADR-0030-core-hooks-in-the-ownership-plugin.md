---
id: ADR-0030
title: 'Core hooks in the ownership plugin: living-docs depends on it and stops registering them'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-28
relates-to: [ADR-0012, ADR-0019, ADR-0026, ADR-0029]
supersedes: null
superseded-by: null
---

# ADR-0030 — Core hooks in the ownership plugin: living-docs depends on it and stops registering them

## Context

`ADR-0019` drew the core's boundary: the rules of ownership, generated drift,
watching and repository coverage are its own. The core already implements the
corresponding hooks and checks, and living-docs still has versions of its own of
three guards: the generated-artifact one, the watched-file reminder and the commit
guard. With both plugins installed, the same event would be answered twice.

`ADR-0012` decided that the stage parameterizes the workflow and that the
registration of the hooks plugin is indivisible. It was written with a single
plugin, and three of its sentences stop being true: `drift` and `changelog --base`
are no longer living-docs commands, and `validate --base` no longer charges the
owning doc of the watched path. It is in `draft` and is not edited here.

The adoption leaves two points that no earlier decision covers: what `init` does in
a consumer repository, and the effect of the core running its rules at every stage.

## Alternatives considered

- **Keeping the three hooks in both plugins.** Discarded: the same event would be
  answered twice, with different text, and divergence between the copies would be
  inevitable. It contradicts the rule that each rule runs once, in a single plugin.
- **living-docs embeds the core and registers its hooks.** Discarded: the consumer
  who only wants ownership would have to install living-docs, and the two plugins
  would stop being separable.
- **A single plugin with everything.** Discarded: it undoes `ADR-0019`.
- **Deleting living-docs' hooks before `ownership` is installable.** Discarded: the
  repository would spend a commit without the guards.

## Decision

The living-docs `plugin.json` declares `dependencies: ["ownership"]`, and its
`hooks.json` stops registering the three hooks the core takes over. The hooks go
out in the same commit in which the `ownership` plugin becomes installable from the
marketplace, so the repository does not spend a commit without the guards. The hooks
that stay in living-docs are those of its own vocabulary.

The stage stops parameterizing the rules that went to the core: `ownership validate`
runs the four tree rules at every stage, and `--base` runs the two diff ones
together. At the `production` stage, this turns on the satisfied-watch rule, which
before only `multi-team` turned on. The `init` of a consumer repository seeds
`ignore:` with `node_modules` and reports, under "not installed", that the rest of
the repository needs to be declared in `owned`, because the coverage rule demands an
owner for every file and no `init` knows where the installer's code lives. A freshly
installed `ownership validate` fails until that is done.

## Consequences

### What we gain

Each event has a single responsible party, and the two plugins can evolve without
copying each other. The consumer who only wants ownership installs only it.

### What we accept to lose

**Installing living-docs now requires `ownership`**, and the repository is left
without the guards if the dependency does not resolve. The `production` stage
becomes stricter than it was, and a consumer's first `ownership validate` always
fails, on purpose, until they declare their code. `ADR-0012` keeps saying what it
said about the stage and about `drift`; whoever accepts or supersedes it needs to
handle those sentences, and that is left to the person who decides.
