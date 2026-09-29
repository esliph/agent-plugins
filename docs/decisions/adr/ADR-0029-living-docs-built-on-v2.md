---
id: ADR-0029
title: 'living-docs is born on v2: no migration command, no dual reading, no alias'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-28
relates-to: [ADR-0020, ADR-0025, ADR-0028]
supersedes: null
superseded-by: null
---

# ADR-0029 — living-docs is born on v2: no migration command, no dual reading, no alias

## Context

living-docs today reads the v1 schema with a parser of its own. `ADR-0020` defined
the v2 schema, and the ownership core's spec also asked for a command that would
convert v1 files into v2. For living-docs to adopt the core, it has to start
reading v2 through the core's library, and it has to be decided what happens to
whoever still has a v1 file.

Today only the author uses the plugin, and nothing has been released: `CHANGELOG.md`
only has `[Unreleased]`. Writing, testing and maintaining forever a converter or a
second reading path costs more than rewriting by hand a file that, in this
repository, exists once.

The adoption also forces two things to be fixed that v1 answered without writing
them: what a living-docs document is, and what the documentation corpus is.

## Alternatives considered

- **A `migrate` command in the CLI.** Discarded: it is what the core's spec asked
  for, but it would create a public surface, with a test and an error message, for
  a file only the author has. The cost of maintaining the converter exceeds that of
  rewriting.
- **Dual reading (v1 and v2) in living-docs.** Discarded: two schemas in the same
  reading would double every test case and leave v1 alive with no deadline, and the
  core already refuses v1 by design.
- **An alias for the old rule names.** Discarded: the alias would hide that the
  identifier changed, and the old → new map fits in one CHANGELOG entry.

## Decision

living-docs reads only the v2 schema, through the core's library. There is no
migration command, dual reading or alias of an old name, neither public nor
internal. This repository's `.ownership.yml` is rewritten by hand in v2, and whoever
already had a v1 file rewrites it guided by the CHANGELOG. This diverges from the
core's spec, which asked for the command.

living-docs decides that a **document** is the `owned` entry that carries the
`living-docs:` block without `id-prefix`, and an **artifact** is the one that
carries `id-prefix` in the block. A path is only the plugin's if the entry carries
its block, as `ADR-0020` already established: without that, `packages/living-docs/`,
`bin/` and `.github/` would become documents.

The **documentation corpus** is the union of the paths of the entries with a
`living-docs:` block and the paths of `generated[]`. Deriving it from the directory
of the ownership file, as v1 did, would make the whole root documentation, since the
file now lives at the root. The binary attachment is now charged on any path of the
corpus.

The open decision declares `states: [open, resolved, dropped]`, which is the state
machine the code already implements, and not the abbreviation `[open, resolved]`.

## Consequences

### What we gain

living-docs loses a parser, a schema and a set of error messages of its own, and
starts treating as one every ownership file it reads. Nothing is left to migrate on
the day the toolkit is published.

### What we accept to lose

**Whoever cloned the toolkit and has a v1 `docs/.ownership.yml` is left with no
automatic path:** the plugin refuses the file, and the only help is the CHANGELOG.
This is accepted because only the author is in that situation today, and it stops
holding at the first external consumer, when this decision needs to be reopened. The
requirements that spoke of "under the documentation root" and of `artifacts:` have
to be rewritten, and the document discriminator stops being visible in a list: one
has to look at the block of each entry.
