---
id: ADR-0028
title: 'Plugin block at the top of the root: the plugin''s global configuration lives in the root file'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-28
relates-to: [ADR-0020, ADR-0025]
supersedes: null
superseded-by: null
---

# ADR-0028 — Plugin block at the top of the root: the plugin's global configuration lives in the root file

## Context

v1 of the ownership file carries three living-docs values that belong to no
entry: `stale-after-months`, `id-format` and `last-reviewed-bump-limit`.
`ADR-0020` decided that a plugin declares its link to a path through the presence
of its block in an `owned[]` entry, and only foresaw a block inside an entry. When
living-docs starts reading v2, these three values have no place.

The core also starts exporting to living-docs utilities it already had inside
(reading of table and section items, reading of CODEOWNERS and the catalog of its
own checks). That grows the public API beyond what the core's spec listed, and
this decision is the place to record the criterion.

## Alternatives considered

- **Repeating the configuration in every entry.** Discarded: there are about
  twenty entries with the same global value, and nothing would stop two entries
  from disagreeing on `id-format`, which would open ID families with different
  formats in the same repository.
- **A configuration file of the plugin's own.** Discarded: it is the "one file per
  plugin" that the core's research had already refused. Whoever wants to know a
  repository's policy would have to read two places, and the root's `plugins:`
  would stop being the complete list of who has a say in it.
- **Accepting a top-level key with any name.** Discarded for the same reason
  `ADR-0020` refused an unknown top-level key: a mistyped block name would be
  silently ignored.

## Decision

The root file accepts, at the top, a key for each name listed in `plugins:`. The
core passes on the value of each one, without interpreting it, in
`RootFile.pluginBlocks` and in `ResolvedConfig.pluginBlocks`. The value follows the
rule of `ADR-0020`: it is always a mapping, `{}` declares participation with no
configuration, and any other value is a load error that names the file and the
block. A plugin block at the top of an included file is an error, for the same
reason `plugins:` is exclusive to the root, and a plugin cannot have the name of a
core key. This refines `ADR-0020` without editing it.

The core's public API grows only in what living-docs imports: `parseItemsTable`,
`parseItemsSections`, `normalizeFieldKey`, `isEmptyValue`, `DocItem`,
`parseCodeowners`, `loadCodeowners`, `ownersOf` and the public catalog of the
checks. The three CODEOWNERS utilities come in because `init` and two living-docs
tests depend on them.

## Consequences

### What we gain

The plugin's global configuration lives once, in the only file that lists who the
plugins are. The core keeps not knowing any plugin key, and a mistyped top-level
block name becomes a visible error.

### What we accept to lose

The core now has two places where a plugin block can appear (top of the root and
entry), with the same type rule but different scopes, and whoever reads the file
needs to know the difference. The content of the top-level block remains opaque: a
wrong key *inside* it only shows up when the plugin runs. And the core's public API
is now a surface that living-docs consumes: renaming any of these names breaks the
plugin, and not only whoever imported the core from outside.
