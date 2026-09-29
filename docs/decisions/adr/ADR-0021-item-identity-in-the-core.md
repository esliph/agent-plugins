---
id: ADR-0021
title: 'Item identity in the core: an opaque key per collection, no ID regex'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-18
relates-to: [ADR-0019, RN-0033]
supersedes: null
superseded-by: null
---

# ADR-0021 — Item identity in the core: an opaque key per collection, no ID regex

## Context

Today `parseItemSections` builds the heading regex from the ID format declared in
living-docs, and `parseItemTable` requires a `Status` column fixed in code — the
core's two parsers know the ID shape and field name of a single domain. A second
plugin (SDD) keeps items in collections with a heading like `T-003 — Write the
parser` or a state field with another name, and the core needs to pair an item
before/after by its key without knowing what it means.

This decision covers §3 of
`docs/superpowers/specs/2026-09-17-ownership-core-design.md`, the spec of the
ownership core.

## Alternatives considered

- **Keeping the key tied to living-docs' ID format** (prefix plus number regex).
  Discarded: it is exactly the coupling that prevents the second consumer — a
  heading `T-003 — Write the parser` does not match a regex designed for
  `RN-0001`.
- **Fixing `state-field` as `status`, with no configuration.** Discarded: a
  project that writes "Situation" instead of "status" would be left with no
  lifecycle and no error — silence in the exact place where the promotion guard
  depends on the field existing.
- **Leaving `key` free through a per-project configurable regex.** Discarded: a
  regex in a configuration file is the trap the spec names — `first-token`
  already covers `RN-0001 — Title` and `T-003 — Write the parser` without anyone
  writing a pattern.

## Decision

The key of an item is opaque to the core: it guarantees that it is not empty, is
unique within the file and serves to pair before/after in the promotion guard —
nothing more. Whoever interprets shape, prefix, sequence and retirement is the
owning plugin. `key` always answers "where is the key", with an answer per
`collection`: declaring it is an error in `per-file` (the identity is the file),
the column name in `table`, and `first-token` (default) or `heading` in
`sections`. `state-field` names where the state lives, with a default of
`status`, case-insensitive.

## Consequences

### What we gain

The core comes to serve any collection whose identity fits in "file", "column" or
"first token of the heading", with no regex in configuration. A domain plugin
gains the promotion guard and the before/after pairing without inheriting another
domain's ID shape.

### What we accept to lose

The core stops detecting a malformed ID or a sequence with a gap — that goes back
to being the responsibility of the owning plugin, which has to write its own
verification instead of inheriting it for free. And two different files can use
the same textual key without the core noticing: uniqueness across files is also
plugin policy, not a guarantee of the core.
