---
id: ADR-0020
title: 'Ownership file schema v2: a single owned list, per-plugin blocks, format separated from governance'
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-28
relates-to: [ADR-0019, DA-0006, RN-0032]
supersedes: null
superseded-by: null
---

# ADR-0020 — Ownership file schema v2: a single owned list, per-plugin blocks, format separated from governance

## Context

Today's `.ownership.yml` declares `artifacts:` and `documents:` as two lists,
mixes file-reading keys (`collection`, `key`, `state-field`, implicit in the
parser) with policy keys at the same level, and duplicates the set of
consumer-visible paths as `consumer-visible-paths` and as the
`consumer-visible: true` mark on the `watches` entries themselves — a test exists
only to keep the two copies from diverging. The core, serving two domains, needs
a schema strict enough to refuse a wrong key and extensible enough for a domain
plugin to declare its own keys without the core knowing them.

This decision covers §2 of
`docs/superpowers/specs/2026-09-17-ownership-core-design.md`, the spec of the
ownership core.

## Alternatives considered

- **Keeping two lists, one per glossary term (`artifacts`/`documents`).**
  Discarded: the core does not know the difference between the two terms — who
  knows is `living-docs.id-prefix`, present or absent. Merging under either of the
  two names would redefine a glossary term by the list it lives in, when the real
  discriminator becomes another.
- **Plugin keys loose at the level of each entry, with no allowlist.** Discarded:
  a mistyped `living-doc:` key would be silently ignored by the core and never
  seen by the plugin, which does not know there is a block for it — the same
  failure that already led to refusing an unknown top-level key.
- **Keeping `consumer-visible-paths` as a separate list.** Discarded: it is
  exactly the duplication that today's sync test testifies exists; v2 derives the
  list from the `watches` entries that are marked, and there are no two copies to
  diverge.
- **Leaving `collection`/`key`/`state-field` at the same level as the policy
  keys.** Discarded: they are configuration of how the parser finds the item
  inside the markdown, not a governance decision, and at the same level they
  dominate the reading of whoever only wants to know who the owner is.
- **The plugin claims paths through a rule of its own** (a glob or a filter over
  `format` in the plugin's manifest), or through a list of paths under its name at
  the root. Discarded: the rule in the manifest makes it invisible, to whoever
  reads the file, who reads what, and lets two plugins fight over the same path
  without an error; the list at the root is a second copy of the `owned` paths,
  the same duplication as `consumer-visible-paths`.
- **`x: true` as an opt-in with no configuration.** Discarded: the block would
  have two types — boolean or mapping — and every plugin, in any language, would
  have to handle both. `x: {}` says the same with a single type.
- **Validating the content of the block against a schema declared by the plugin.**
  Discarded for now: the plugin can be written in any language, so the core has no
  way to import it to ask for the schema; the way out would be `plugins:` going
  from a list of names to a map pointing to a schema, a change of shape that the
  current volume of configuration in the blocks does not pay for.

## Decision

Schema v2 declares a single list, `owned`, with `version` mandatory in every file
and `plugins:` only at the root — a block name that the core ignores, and any
other top-level block name not listed there is an error. Inside each entry, the
parser's reading keys move down into a `format:` block (`collection`, `key`,
`state-field`); the rest is policy and stays at the entry level.
`consumer-visible-paths` ceases to exist: the `watches` rules marked
`consumer-visible: true` are the list.

The presence of the block is the declaration: a path belongs to plugin `x` if, and
only if, the `owned` entry that covers it carries the key `x` — there is no other
way for a plugin to come to take care of a path. The value of the block is always
a mapping: `x: {}` declares the link with no configuration, and any value that is
not a mapping (`true`, `false`, null, a list, text) is a load error. The core
checks only that type; the content of the mapping is opaque to it and it is up to
the plugin to interpret it. A plugin listed in `plugins:` with no entry carrying
its block is a `validate` warning, not an error.

## Consequences

### What we gain

A new plugin declares its own block under the name it listed in `plugins:` without
the core needing to know it, and a mistyped block name becomes a visible error
instead of silence. The list of consumer-visible paths stops having a second copy
to diverge. "Which paths belong to plugin `x`" has a single answer, read from the
file itself, and several plugins take care of the same entry without knowing one
another.

### What we accept to lose

Every existing ownership file — this repository's 23 entries included — needs
migration before validating under v2; no v1 `.ownership.yml` reads as v2 without
the migration command (outside this decision). And declaring `plugins:` correctly
at the root becomes a prerequisite for the plugin's block not becoming an error —
one more step that v1 did not charge. A mistyped key *inside* a block passes
through loading silently and only shows up when the plugin runs — `validate` does
not see it. And every path of a plugin has to be declared entry by entry: there is
no claiming by default.
