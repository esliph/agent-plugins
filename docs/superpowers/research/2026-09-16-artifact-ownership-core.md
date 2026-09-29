# Artifact ownership core — survey

Brainstorming survey about extracting from living-docs the mechanism that
orchestrates artifacts by owner, so that other plugins can use it. It records what
was observed in the code and in the Claude Code documentation, the directions the
author chose, and what remains open.

**It is not a decision.** The directions below were chosen by the author during
the brainstorming and have not yet become an ADR; none of them holds as a rule
until it is recorded and accepted. The spec and the ADRs that come out of this are
the owners of whatever is decided, and this document is not updated after them.

## Motivation

At its core, living-docs has an orchestrator: `.ownership.yml` links a path to an
owner, to the owning skill, to a lifecycle and to a trigger, and hooks and checks
read from there without knowing any path. This mechanism is not specific to living
documentation.

The concrete case that forces the extraction is **SDD** (spec-driven development):
spec, plan and constitution. They are living documents, but SDD needs a toolset of
its own that falls outside the scope of living-docs. The constitution already
exists in living-docs, which also makes SDD the first case of two plugins
competing for the same kind of artifact.

This repository already has SDD artifacts without a skill owner:
`docs/superpowers/specs/` and `docs/superpowers/plans/` appear in `.ownership.yml`
with an owner and without a keeper. It can be the first consumer of both plugins.

## What the code shows today

`src/config/ownership.ts` mixes, in the same schema, keys that hold for any
artifact and keys that only make sense in living documentation:

| Generic                                        | Specific to living documentation                            |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `path` → `owner` → `skill`                     | mandatory `id-prefix` (2 to 4 letters), `id-format`         |
| `states` (state machine per artifact)          | `field-map`                                                 |
| `watches` and `consumer-visible`               | `audience`, `role` (`agent-contract`, `definition-of-done`) |
| `generated[]` and `command`                    | `append-only` and `mutable-fields`                          |
| owner coverage against CODEOWNERS              | `stale-after-months`, `last-reviewed-bump-limit`            |
| `collection` (`per-file`, `table`, `sections`) | the split between `artifacts` (with IDs) and `documents` (without) |

`collection` appears in the generic column because of the finding about item
identity, further below.

## Findings in the Claude Code documentation

Source: plugins reference (`https://code.claude.com/docs/en/plugins-reference`),
consulted on 2026-09-16.

1. **Dependency between plugins exists.** `plugin.json` accepts
   `dependencies`, as a string (`"helper-lib"`) or as an object with a semver
   range (`{ "name": "...", "version": "~2.1.0" }`). Installing a plugin installs
   its dependencies; a dependency pulled in only by another plugin is removed
   when it is no longer needed.
2. **A marketplace plugin is copied to the cache**
   (`~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/`), except when the
   marketplace is a local directory and the plugin loads in place.
3. **A plugin cannot reference a file outside its own directory.** A path that
   escapes the plugin root is refused with `path escapes plugin directory`.
4. **Node dependencies are installed inside the copied plugin**, provided the
   plugin root has a `package.json` **and** a supported lockfile
   (`package-lock.json`, `npm-shrinkwrap.json`, `bun.lock`, `bun.lockb`).

### Consequence for the current state

`plugin/hooks/run-hook.sh` resolves the toolkit root by going up two levels from
the script itself and runs `src/hooks/*.ts` from there. By findings 2 and 3, this
only works with the marketplace loaded in place, as in this repository. Installed
from a remote marketplace, the cache receives only `./plugin`, with no `src/` and
no `node_modules`, and the hooks fail open in silence.

**Inferred from the documentation, not tested** with a remote installation. It is
the gap in `DA-0003` observed in practice, and the extraction resolves it anyway:
each plugin needs to be a self-contained package.

## Finding about TypeScript in `node_modules`

Node does not strip types from a `.ts` file that lives in `node_modules`. Verified
on 2026-09-16 with Node v24.18.0: a package in `node_modules` that exports
`index.ts`, imported by a `main.ts`, fails with
`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` ("Stripping types is currently
unsupported for files under node_modules").

This collides with direction 5 combined with `ADR-0015` (TypeScript run directly,
with no build step). An `@esliph/ownership` published as `.ts` does not run when
installed as a dependency. For direction 5 to hold, something has to give:
publish generated JavaScript (build step only at publication), publish `.ts` with
annotations only in JSDoc over `.js`, or keep the core outside `node_modules`.
None of these was discussed.

## Finding about item identity

The state-promotion guard depends on item identity
(`src/hooks/hk3-state-promotion.ts`, `findPromotion`). In `table` and `sections`,
several items live in a single file, and the guard only detects the promotion by
pairing the before item with the after item **by key**. In `per-file`, the
identity is the file itself.

SDD runs into the same case: the tasks of a plan are items with state in a single
file, and a trigger that points to a specific item needs a key.

"ID family" joins two things:

| Item identity (mechanics)                          | ID family governance (policy)            |
| -------------------------------------------------- | ---------------------------------------- |
| how to find the items in a file (`collection`)     | prefix, `id-format`, padding, separator  |
| where the key of each item is                      | numbering with no gap and no repetition  |
| pair before and after; reference `path#key`        | retired IDs, citation coverage           |

## Directions chosen by the author

1. **Core scope: owner, lifecycle and trigger.** Lifecycle includes the guard for
   promotion by human act. Trigger covers code → doc (today's `watches`) and
   doc → doc (editing the spec warns that the derived plan became outdated).
2. **Outside the core, for now: ID governance and freezing.** Both stay in
   living-docs. They may move up into the core in the future, through the same
   extension path.
3. **Owner conflict: the repository chooses.** Each plugin offers artifact types
   and skills; the repository's `.ownership.yml` links each path to exactly one
   skill, and the core refuses two. The plugin that is not the owner only reads
   the artifact and can react to it through a trigger.
4. **Execution: the core is a plugin and a library at the same time.** The core
   has its own hooks and CLI and runs only its own mechanisms; each rule runs
   once, regardless of which plugins are installed. The domain plugins import the
   core as a library and register only the hooks and checks of their own domain.
   - Discarded: core only as a library. The state guard and the trigger reminder
     would end up running in each plugin, and a trigger across plugins would have
     no owner.
   - Discarded for now: core as a host that loads extensions. It requires
     designing and versioning an extension protocol with one and a half
     consumers. It remains the destination if a third plugin makes having two
     hooks per event costly.
5. **Distribution: monorepo as marketplace, core published on npm.** One
   directory per plugin (core, living-docs, SDD), each with its own `package.json`
   and lockfile. living-docs depends on `@esliph/ownership` at a published
   version and declares the core plugin in `dependencies`.
   - Discarded: git dependency (a package in a subdirectory resolves badly).
   - Discarded as a publication form: npm workspaces, which leaves the lockfile
     only at the root and, by finding 4, nothing is installed in the copied
     plugin. It may serve local development if each plugin keeps its own
     lockfile.
   - Discarded now: separate repositories.
6. **`.ownership.yml` extension: blocks named after the plugin.** The core is
   strict about the top-level keys and ignores only blocks named after a plugin;
   each plugin validates its own block with the same rigor. The list becomes a
   single one, and "having an ID family" becomes "having `living-docs.id-prefix`".
   It requires a new version of the schema and a migration of the existing file.
   - Discarded: loose keys, because no validator would refuse a typo.
   - Discarded: one file per plugin, because the paths would then live in two
     places.

## Open

### Item identity in the core

Options raised:

1. **No identity in the core.** The core's state guard covers only `per-file`,
   and living-docs keeps a second guard for `table` and `sections`. The rule
   comes to exist in two places.
2. **Item identity in the core, governance in the plugin.** `collection` and the
   item key become the core's, with a `path#key` reference and a free key (ID,
   slug, task number). Prefix, format, sequence, retirement and traceability
   remain in living-docs.
3. **The whole ID family in the core.** Every plugin inherits a policy that does
   not suit every artifact.

Recommendation raised: **2**, for bringing into the core only what it cannot
leave out. Sketch:

```yaml
- path: docs/open-decisions.md
  owner: '@esliph/engineering'
  skill: decision-recorder
  collection: table # core: how to find the items
  key: ID # core: where the key of each item is
  states: [open, resolved]
  living-docs:
    id-prefix: DA # plugin: the family's policy
    field-map: { resolved-by: 'Resolvida por' }
```

### Not yet discussed

- How direction 5 coexists with `ADR-0015`, given that Node does not run `.ts` in
  `node_modules`.
- Name and shape of the doc → doc trigger in the schema, and whether the
  relation is declared per artifact type, per instance (the plan's frontmatter
  pointing to the spec) or both.
- Where the ownership file lives, since `docs/` is a place for documentation and
  the core is not.
- Three roots (core, domain plugin, validated repository) and how they resolve in
  the cache, in CI and on the host.
- Migration of whoever already has an `.ownership.yml` with `version: 1`.
- Decomposition of the work: core contract and distribution, living-docs
  migration, and the SDD plugin as its own spec.

## Affected artifacts

Record for whoever writes the spec and the ADRs, without anticipating what each
one decides:

- `ADR-0002` (one engine for CLI and hooks): the engine splits between the core
  and the domain plugins.
- `ADR-0003` (two roots): they become three.
- `ADR-0012` (hooks as a single piece, no plugin per phase): the refusal to
  multiply the installation path is reopened; `dependencies` is the new argument.
- `ADR-0014` (project name): the repository comes to contain more than one
  package.
- `ADR-0015` (host Node, no build step): collides with direction 5, because Node
  does not run `.ts` in `node_modules` (finding above). One of the two has to give.
- `DA-0003` (how the toolkit reaches the consumer): direction 5 answers it.
