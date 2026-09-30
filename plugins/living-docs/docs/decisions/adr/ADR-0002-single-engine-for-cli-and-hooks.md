---
id: ADR-0002
title: One validation engine for the CLI and the hooks
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-24
relates-to: [ADR-0001, RN-0001, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0002 — One validation engine for the CLI and the hooks

## Context

The toolkit has to hold in two contexts with opposite demands: in CI, with no
agent present, where enforcement has to fail closed; and during editing by the
agent, where it has to fail open and answer in milliseconds. The natural
temptation is to write two implementations.

## Alternatives considered

- **Two independent implementations** — discarded: it violates corollary 4 of
  the spec ("every CI check mirrors a rule written in a skill") at the root. Two
  implementations of the same rule diverge, and the divergence shows up exactly
  when someone trusts one of them.
- **Hooks calling the CLI as a subprocess** — discarded: it adds a process per
  hook and forces the decision to be serialized into text to be reinterpreted.

## Decision

`src/config`, `src/frontmatter`, `src/docs` and `src/ids` form a single engine.
`src/cli/` and `src/hooks/` are thin front-ends over it: no rule is written
twice. The asymmetry between the contexts is isolated in two lines — the CLI
exits with 1 on error, the hook wrapper always exits with 0.

## Consequences

### What we gain

One rule, one place. A new check is a file in `src/checks/` plus a line in the
registry, and it starts to hold in both contexts.

### What we accept to lose

The hooks carry more code than they would need to (`loadOwnership` parses the
whole `.ownership.yml` to answer about one file), and changes to the engine
affect CI and hooks at the same time — there is no way to evolve one without
revalidating the other.
