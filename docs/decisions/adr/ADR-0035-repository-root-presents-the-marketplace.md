---
id: ADR-0035
title: The repository root presents the marketplace; the agent contract stays living-docs
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [DA-0008, ADR-0027, ADR-0017]
supersedes: null
superseded-by: null
---

# ADR-0035 — The repository root presents the marketplace; the agent contract stays living-docs

## Context

The repository is now `esliph/agent-plugins`: a marketplace meant to host plugins
that are not about documentation. `ADR-0027` named the root `esliph`, the same
name as the marketplace, and did not say what the root presents. The root
`README.md` and `CLAUDE.md` still present the whole repository as
`@esliph/living-docs`, and neither `packages/living-docs/` nor
`packages/ownership/` has a presentation of its own. `DA-0008` recorded the gap.

The two root files answer different readers. `README.md` is `audience: external`
(`ADR-0017`): whoever lands on the repository and wants to know what it offers
and how to install it. `CLAUDE.md` has the `agent-contract` role: the agent that
works inside this repository, which keeps its own documentation with the
living-docs toolkit whatever plugins the marketplace comes to host.

## Alternatives considered

- **The root presents only the marketplace, `CLAUDE.md` included, and the
  toolkit's agent contract moves to `packages/living-docs/`.** Discarded: the
  agent contract governs the repository's `docs/`, which is shared by every
  package, and not the toolkit's package. Moving it to a package directory would
  leave the root with no contract read at the start of a session, and would put
  a document with the `agent-contract` role outside the place the host looks
  for it.
- **The root keeps presenting living-docs until a second domain plugin
  exists.** Discarded: the repository's name already announces a marketplace,
  and `ownership` already runs on its own; a reader who arrives through
  `esliph/agent-plugins` finds a README that describes one plugin as if it were
  the whole repository. Waiting would also leave the rewrite to be done at the
  moment a new plugin lands, mixed into its change.

## Decision

The root `README.md` presents the marketplace — what it is, the plugins it
lists and how to install them — and each package under `packages/` gets its own
README with its presentation; `CLAUDE.md` stays at the root as the agent
contract of this repository, which keeps its documentation with living-docs.

## Consequences

### What we gain

Each reader finds the text written for them where they arrive: the marketplace
at the root, each plugin in its own directory, the agent contract where the
session reads it. A new plugin enters the marketplace with a line in the root
README and a README of its own, without rewriting what is already there.

### What we accept to lose

The root is no longer uniform: `README.md` speaks for the marketplace, while
`CLAUDE.md` speaks for the living-docs way of working, and whoever contributes a
plugin unrelated to documentation still follows that contract in this
repository. Each package README is a new document with an owner to declare in
`.ownership.yml` and, since it ships inside the plugin, it stays free of this
repository's artifact IDs — the toolkit's presentation, today in the root
README, has to be moved and trimmed, not only copied.
