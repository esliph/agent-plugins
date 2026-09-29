# Artifact ownership core — design

Extracts from living-docs the mechanism that orchestrates artifacts by owner and
publishes it as `@esliph/ownership`: a plugin and a library at the same time. It
comes out of `docs/superpowers/research/2026-09-16-artifact-ownership-core.md`,
which surveyed the terrain and left six open points — all decided here.

**Scope of this spec: the core.** Contract, schema, composition and distribution.
The migration of living-docs and the SDD plugin are specs of their own, after this
one and in this order. The core is born with one real consumer before it gains the
second; that is what prevents a premature extension protocol.

**Nothing here is an accepted decision.** The decisions this spec obliges us to
record are in section 11, to be opened as `draft` and promoted by a human act.

## 1. What the core is

Three responsibilities, and nothing beyond them.

**Owner.** Each governed path has exactly one `owner` and, when there is one, an
owning `skill`. This is how the conflict between plugins is resolved: each plugin
offers artifact types and skills, the repository binds each path to a single
skill, and the core refuses two. The plugin that is not the owner reads the
artifact and may react to it through a trigger, but does not write.

**Lifecycle.** States declared per path, item identity inside the file, and the
promotion guard by human act. The core finds the items, pairs before and after by
the key, and asks when the transition requires a person. It does not know what the
states mean.

**Trigger.** Code → doc, which is today's `watches`. Doc → doc, which is new:
editing the source warns that the derived one fell behind.

### Outside the core, and this is a decision

**ID family governance** — prefix, format, padding, sequence with no gap, retired
IDs, citation coverage — and **freezing of an accepted artifact** stay entirely in
living-docs. They may move up later through the same extension path; today they do
not move up because they do not serve every artifact. A plan task does not want a
two-to-four-letter prefix or gap-free numbering.

### The split of what exists today

| Goes to the core                         | Stays in living-docs                               |
| ---------------------------------------- | -------------------------------------------------- |
| `path`, `owner`, `skill`                 | `id-prefix`, `id-format`                           |
| `states`                                 | `field-map`                                        |
| `collection`, `key`, `state-field`       | `append-only`, `mutable-fields`                    |
| `watches` and the consumer-visible       | `stale-after-months`, `last-reviewed-bump-limit`   |
| `derives-from`                           | `audience`, `role`                                 |
| `generated[]` and `command`              | `cited-by`                                         |
| owner coverage against CODEOWNERS        | the separation between `artifacts` and `documents` |

Two rows that may be surprising. `generated[]` belongs to the core because "this
file is produced by a command, editing it by hand is an error" has nothing to do
with documentation: it holds for a schema, a generated client, a lockfile. And
`audience`/`role` stay out because `agent-contract`, `definition-of-done` and
"external text does not cite an artifact ID" are documentation vocabulary, not
ownership vocabulary.

## 2. The v2 schema

### A single list, called `owned`

The glossary locks **Artifact** and **Document**, and defines Document as
"declared in `documents:`". Merging the two lists under either name would
redefine a term by way of a table. `owned` is a word no glossary has claimed, and
it is more honest: the file governs paths, and only some of them are artifacts —
`watches` and `generated` talk about `src/**`, `.github/**`, `plugin/**`.

Both terms survive in living-docs with the meaning they have. What changes is the
discriminator: it stops being "which list it is in" and becomes "has
`living-docs.id-prefix`". Adjusting the glossary is work for the migration spec.

### Blocks named after the plugin, and the declared name

The core is strict with every top-level and entry key, and ignores only blocks
whose name is in `plugins:`. Each plugin validates its own block with the same
rigor.

The `plugins:` list costs one line and exists for one reason: without it, a
mistyped `living-doc:` would be silently ignored by the core and never seen by the
plugin, which does not know a block exists for it. It is the same failure that
made us discard loose keys.

**The presence of the block is the declaration.** A path belongs to plugin `x` if,
and only if, the `owned` entry that covers it carries the key `x`. There is no
other way for a plugin to start taking care of a path: neither a rule in the
plugin manifest — a glob or a filter over `format` would make it invisible, to
whoever reads the file, who reads what, and would let two plugins contest the same
path without an error —, nor a list of paths under the plugin name at the root,
which would be a second copy of `owned`. Since the `owned` paths are disjoint
(section 5), "which paths belong to plugin `x`" has a single answer, and several
plugins take care of the same entry without knowing each other.

The value of the block is always a mapping. `x: {}` declares the binding without
configuration; `true`, `false`, null, a list or text is a load error. `x: true`
would say the same as `x: {}`, but would give the block two types, and every
plugin — written in any language — would have to handle both. The core checks only
that type: the content of the mapping is opaque to it and it is up to the plugin
to interpret it. Validating the content against a plugin schema would require
`plugins:` to become a map pointing to that schema, because the core has no way to
import a plugin in an arbitrary language to ask it; the volume of configuration in
the blocks does not pay for that change of shape. The accepted cost is that a
mistyped key *inside* the block only shows up when the plugin runs.

A plugin listed in `plugins:` with no entry carrying its block is a warning, not
an error — an installation in progress passes through that state.

### Governance and reading do not mix at the same indentation

The keys that say **how to find things inside the file** — `collection`, `key`,
`state-field` — move down into a `format:` block. They exist only because the
governed items live inside markdown: it is parser configuration, not policy, and
at the same level as the others it dominates the reading. Since most entries are
`per-file`, they carry no block at all.

### The shape

```yaml
version: 2 # in every ownership file, not just the root
plugins: [living-docs] # root only; the core ignores these blocks, and any other name is an error
# basePath: packages/api  # optional: shifts the base of the paths below, always inward (section 5)

owned:
  # per-file: the identity is the file — no `format` block
  - path: docs/decisions/adr/
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [draft, proposed, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]

  - path: docs/open-decisions.md
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [open, resolved]
    format:
      collection: table
      key: ID # column name
      state-field: Status
    living-docs:
      id-prefix: DA
      field-map: { resolved-by: 'Resolved-by' }

  - path: docs/requirements/rules.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    format:
      collection: sections
      key: first-token # `## RN-0001 — Title` -> "RN-0001"
    living-docs:
      id-prefix: RN
      cited-by: ['test/**', 'src/**']

  # an owner with no owning skill is still information, not an error
  - path: docs/superpowers/plans/
    owner: '@esliph/engineering'
    derives-from:
      source: docs/superpowers/specs/
      field: spec

generated:
  - path: docs/contracts/checks.gen.md
    command: node src/tools/gen-checks.ts

watches:
  - code: 'src/hooks/**'
    doc: docs/requirements/rules.md
    reason: 'a hook blocks on behalf of a rule'

  # `consumer-visible: true` marks the set — there is no second list
  - code: 'src/cli/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'subcommand, option and exit code are public contract'

ignore:
  - 'node_modules/**'
  - 'vendor/**'
```

### `consumer-visible-paths` ceases to exist

Today the same set is declared twice: as `consumer-visible-paths` and as the
`code` of the rules marked `consumer-visible: true`. The file itself admits it
("they are the same set on purpose") and there is a test whose only job is to
prevent the two copies from diverging. A test that keeps two copies of a list in
sync is the definition of duplicated declaration.

In v2 the marked rules **are** the list, and the check that demands the entry
derives the globs from there. The only thing the separation would allow in theory
— a path that fails on the PR but does not remind on the edit — is exactly what
the test forbids today.

### `ignore:` takes paths out of governance

Without it, owner coverage would demand an owner for `node_modules/`, `vendor/`
and any generated directory. It is a top-level list, valid for the base of whoever
declares it, and what it covers disappears from coverage, not from reading.

## 3. Item identity

The key is the identifier of the item **inside the file**: it is what pairs before
with after in the promotion guard, and it is what stays after the `#` in the
`path#key` reference.

**What the core guarantees**, and only this: the key is not empty, it is unique
inside the file, and it is stable in the sense that changing it is
indistinguishable from deleting an item and creating another. The core observes;
it cannot tell whether there was a rename.

**What the core does not know**: format, prefix, sequence, retirement, uniqueness
across files. The owning plugin demands whatever it wants about the key it
receives. living-docs demands ID form and uniqueness in the repository — which
exists today and is **its** policy. An SDD plugin may demand something else, or
nothing.

Today this is not separable: `parseItemSections` builds the heading regex from the
ID format and `parseItemTable` requires a `Status` column in code. Both parsers
lose the dependence on the ID format; the key becomes opaque.

### `key` always answers the same question, with a different shape

| `collection` | `key`                                       | Example                            |
| ------------ | ------------------------------------------- | ---------------------------------- |
| `per-file`   | declaring it is an error — the identity is the file | —                          |
| `table`      | column name                                 | `key: ID`                          |
| `sections`   | `first-token` (default) or `heading`        | `## RN-0001 — Title` → `RN-0001`   |

The question is always "where is the key"; the answer depends on how the file
stores the items, and pretending there is a single format would hide that. There
is no regex: `first-token` covers `RN-0001 — Title` and `T-003 — Write the parser`,
and a regex in a configuration file is a trap nobody has asked for yet.

### `state-field`

Names where the state lives: the column in `table`, the block field in `sections`,
the frontmatter key in `per-file`. Optional, default `status`, case-insensitive. It
exists because `states` belongs to the core — if where the state lives stayed on
the other side, a project that writes "Situation" would be left with no lifecycle
and no one saying anything.

## 4. Trigger

**Code → doc** is today's `watches`, unchanged in shape: a watched-path glob, owner
doc, reason, and the `consumer-visible` mark that makes it also the boundary with
whoever consumes.

**Doc → doc** is new and has two halves. The ownership file declares that the
artifacts of one path derive from artifacts of another and by which field; each
instance declares from which.

```yaml
- path: docs/superpowers/plans/
  derives-from:
    source: docs/superpowers/specs/
    field: spec
```

```yaml
---
spec: docs/superpowers/specs/2026-09-17-ownership-core-design.md
---
```

The type gives scope and validation — does the field exist? does it point inside
`source`? does the target exist? The instance gives the exact target, and it is
what makes the reminder precise instead of noise: editing a spec warns about the
plan that derives from it, not about every plan in the directory.

By type alone would be too coarse to serve SDD. By instance alone would let the
field name become an unvalidated convention — the same problem `field-map` exists
to solve — and a mistyped field would vanish silently.

## 5. Composition across files

An ownership file is a self-contained unit of governance: it says by which schema
it is read, against which base its paths are written, and it governs a set of paths
that no other file declares.

### Base

The effective base is the **directory of the file plus the `basePath`**. The
`basePath` is optional, accepts neither `..` nor a glob, and only goes down.
Without it the base is the directory of the file — with one exception: the base of
the root is the repository root, whether it lives in `.ownership.yml` or in
`docs/.ownership.yml`. The root is found by the candidate order in section 8; the
other files are not candidates, they are included.

```yaml
# packages/api/.ownership.yml — base: packages/api/
version: 2

# ownership.api.yml, at the root — base: packages/api/
version: 2
basePath: packages/api
```

Both govern the same subtree. Where the file lives becomes organization, not
semantics, and a monorepo that prefers centralized ownership can have it without
any file reaching outside its own base.

### `version` in all, `plugins` only at the root

`version:` is mandatory in every file, and a divergence between two is an error
that names both. It costs one line and pays for the file identifying itself: to
know by which schema a subproject is read there is no need to find the root, and a
subproject that becomes a repository of its own already leaves ready.

`plugins:` stays only at the root. A list per file would reopen the failure it
exists to close — a mistyped `plugins: [living-dcos]` in a child would make the
`living-docs:` block of that file an error in one place and pass in another, with
no one reviewing everyone's list. Concentrating it at the root keeps the decision
at a point reviewed once.

### Governed paths are disjoint

Resolved against their bases, all the `owned[].path` of all the files form a
disjoint set: none is equal to another, and none is a directory prefix of another
— `docs/` and `docs/adr/x.md` collide, `docs/adr/` and `docs/specs/` do not. A
collision is an error that names the two files and the path, whether it is inside
one file, between siblings, or between a file and another that includes it.

There is no "level", there is no cascade and there is no more specific path winning
over a less specific one. "Which rule covers this path" has a single answer,
independent of declaration order: prefix when the entry ends in `/`, equality when
it does not. And since no property can come from another file, `owner` is mandatory
in every entry.

The alternative — overlap resolved by specificity — is what v1 has today, and not
by design: the lookup picks the **first** declared entry that matches, while the
document collection applies **all** the ones that match. That is two semantics for
the same overlap, and a file judged twice by rules that could diverge. Disjunction
is what makes the two coincide.

**What this denies on purpose.** `docs/` with a general owner and
`docs/decisions/adr/` with the `decision-recorder` ceases to be expressible — the
two entries contain each other. Whoever wants both declares the siblings one by
one. The cost is real and accepted: the 23 entries of this repository are already
disjoint, apart from one accidental overlap that section 10 removes, and governance
by inheritance is exactly what makes "who answers for this file" a question that
requires rebuilding a tree to answer.

**Outside the count.** `generated[].path` is not a governed path: it already
satisfies owner coverage by itself, and a generated file inside a governed
directory has an owner and has a generator, which makes sense together. Disjunction
demands of it only itself — two commands producing the same file is an error.
`watches` overlaps freely: two documents watching `src/cli/**` for different
reasons is the design working.

**Collision is a load error, not a check.** It is raised on resolution, like any
configuration defect: `validate` fails naming both sides, and the hook goes quiet
and lets it through, by the fail-open policy. A pruned hook may not see a collision
that CI sees, and that is right — a hook is not where one discovers that the
configuration is broken.

### `include:`

A list of paths relative to the file that declares it, pointing at a directory
when there is a single ownership file inside it, or at a file when there are
several. Nested inclusion is allowed; a cycle is an error; including the same file
twice is an error.

```yaml
# .ownership.yml, at the root
include:
  - ownership.docs.yml # file: there is more than one in this directory
  - packages/api/ # directory: there is a single one inside
```

What `include` does **not** do is confer scope or authority: it says "also read
this file", and what the file governs is a matter of its own base. That is why the
grant of authority declared at the inclusion site was discarded — it would be a
second declaration of scope, able to diverge from the first.

### Confinement

A field is confined to the base when the path it names **can be an edited path**.
That is the criterion, and it exists to keep pruning correct.

| Field                                                                                  | Reach                         |
| -------------------------------------------------------------------------------------- | ----------------------------- |
| `owned[].path`, `generated[].path`, `ignore[]`, `watches[].code`, `derives-from.source` | inside the base               |
| `watches[].doc`                                                                        | anywhere in the repository    |

The first five name paths whose edit triggers something: generated guard,
promotion guard, watched-path reminder, derivation reminder. A `derives-from.source`
pointing outside is the most treacherous case — editing the spec would stop warning
about the plan, because the file that declares the derivation would have been
pruned, and the reminder would vanish silently.

`watches[].doc` is the only field that is never a trigger: nothing fires by editing
it, it is always the target pointed at, and pruning is driven by `code`. Leaving it
free serves a real case — `packages/api/.ownership.yml` watching
`packages/api/src/**` and pointing at the root `CHANGELOG.md`. Under strict
confinement, a package would be forced to have its own changelog, a project
decision the core has no reason to impose.

### Pruning

Resolving for a set of paths (`onlyFor`), a file whose base is not an ancestor of
any of them is discarded without being opened — a directory-path comparison, with
no reading. Since the `basePath` only goes down, the base is always a descendant of
the directory of the file, and pruning stays correct knowing only the place of the
file. It is what keeps the hook within the five-second ceiling with fail-open.

Hooks prune. `validate` and `explain` do not — and owner coverage in particular
never prunes, because stating that a path has no owner requires having read all the
files.

### `ownership explain <path>`

A mandatory deliverable, not a convenience. It answers which entry covers the path,
from which file; when none covers it, it answers which file has a base that contains
it — which is exactly what is missing to know when owner coverage fails.

The included ownership file is itself a governed path and needs an owner like any
other.

## 6. Hooks and checks

Each rule runs once, in a single plugin.

| Today's hook                     | Goes to      |
| -------------------------------- | ------------ |
| append-only (freezing)           | living-docs  |
| generated artifact               | **core**     |
| state promotion                  | **core**     |
| watched-path reminder            | **core**     |
| commit guard                     | **core**     |
| session inventory                | living-docs  |
| shortcut becomes debt            | living-docs  |
| open-decision guard              | living-docs  |
| **new** — derivation reminder    | **core**     |

| Today's check                                                                                                     | Goes to                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| generated drift, changelog required                                                                               | **core**, whole                                                                                                                                                                                                                                                |
| IDs, traceability, staleness, links, commit discipline, trigger routing, external audience                        | living-docs, whole                                                                                                                                                                                                                                             |
| structural lint                                                                                                   | **splits**: valid `owner` and `status` within `states` go to the core; complete frontmatter and a `trigger` that is not a cadence stay                                                                                                                         |
| ownership coverage                                                                                                | **splits**: entry in ownership, line in CODEOWNERS, `watches` with an existing `doc` that has an owner, and a watched path changed without the owner doc go to the core; agent contract repeating a sentence, Definition of Done without verification and a path claimed by an open decision stay |

Trigger routing stays in living-docs even though it compares with the owning
`skill`, which is a core key — because what it reads on the other side is the
frontmatter `trigger`, and standardized frontmatter is a contract of living
documentation.

### Named and qualified identifier

Checks and hooks stop being numbered. The ID becomes `plugin/descriptive-name`:
`ownership/generated-drift`, `living-docs/id-sequence`. Numbered, the ID forces
whoever reads it to consult a table to know what failed; named, it says.

The namespace belongs to the publishing plugin, so a new plugin — SDD, or the third
one that comes along — never collides with an existing name and breaks the
Definition of Done of someone who has already installed. And it says which command
reproduces the failure.

| Core piece                                 | Name                              |
| ------------------------------------------ | --------------------------------- |
| valid `owner`, `status` within `states`, plugin declared with no entry (warning) | `ownership/declared-state`        |
| generated drift                            | `ownership/generated-drift`       |
| visible change without an entry            | `ownership/consumer-change-logged` |
| owner coverage and CODEOWNERS              | `ownership/owner-coverage`        |
| watched path changed without the owner doc | `ownership/watch-satisfied`       |
| declared derivation resolves               | `ownership/derivation-resolves`   |
| generated artifact (hook)                  | `ownership/generated-guard`       |
| state promotion (hook)                     | `ownership/promotion-guard`       |
| watched-path reminder (hook)               | `ownership/watch-reminder`        |
| commit guard (hook)                        | `ownership/commit-guard`          |
| derivation reminder (hook)                 | `ownership/derivation-reminder`   |

Ownership coverage becomes **two** names. Today it demands owner coverage and a
watched path without a doc under the same ID because a number is expensive and a
name is not — and "check seven failed" never said which of the two.

The form holds for living-docs too: numbered alongside named, whoever reads the
report learns two conventions. Renaming there is a break of public contract and is
work for the migration spec; what this spec fixes is the form.

## 7. Distribution and execution

### Layout

The repository becomes the marketplace. One directory per plugin, each
self-contained with its own `package.json` and lockfile — which is what Node
requires to install a dependency inside the plugin copied to the cache.

```
esliph/
  .claude-plugin/marketplace.json     # source: ./packages/ownership, ./packages/living-docs
  .ownership.yml                      # governance of this repository
  docs/
  packages/
    ownership/                        # @esliph/ownership — plugin AND library
      .claude-plugin/plugin.json
      hooks/{hooks.json,run-hook.sh}
      src/**.ts                       # source; dist/ only exists in the tarball
      package.json + package-lock.json
    living-docs/
      .claude-plugin/plugin.json      # dependencies: [{ name: ownership, version: ~1.0 }]
      hooks/{hooks.json,run-hook.sh}
      {commands,skills,agents,templates}/
      src/**.ts
      package.json + package-lock.json   # dependencies: @esliph/ownership
```

### Build only at publication

**Measured on 2026-09-17, Node v24.18.0:** Node refuses to strip types from `.ts`
under `node_modules` with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, and there
is no way out by flag — `--experimental-transform-types` and `NODE_OPTIONS` fail
the same. An `@esliph/ownership` published as `.ts` does not execute when installed
as a dependency.

The same source executes in two ways. When the core is the plugin, it runs from its
own directory as `.ts`, by type-stripping — it is not under `node_modules`. When it
is a library of a domain plugin, it runs as `dist/*.js` from inside
`node_modules`. **No `dist` in the repository**: it is generated at `prepack` and
only exists inside the tarball.

This supersedes the decision to execute without a build step, but only in the half
that needs to give way: what is executed from the checkout remains TypeScript
directly. The fear recorded there — a stale `dist` making the hook run old code
silently — does not return, because no `dist` exists on a development machine.

### Development without a build

**Measured on 2026-09-17:** with a workspace symlink and a `development` condition
in `exports`, Node resolves the real path (`packages/ownership/src/index.ts`),
which is not under `node_modules`, and type-stripping works.

```jsonc
// packages/ownership/package.json
"exports": { ".": { "development": "./src/index.ts", "default": "./dist/index.js" } },
"files": ["dist"]   // src/ never goes in the tarball
```

The monorepo turns the condition on for itself through a variable that the hook
wrapper reads; in a consumer it does not exist and resolution falls to `dist`. No
build in development and no `dist` that can age.

The gap is a single one: the developer never exercises the packaged form, so a
badly written `exports` or a file missing from `files` would only show up at the
first consumer. The packaging test in section 9 closes it, and it is mandatory.

### Two roots, not three

The survey predicted that the two roots would become three. They do not. Every
process needs two things: where I am, derived from `import.meta.dirname` and
specific to each plugin, and which repository I am judging, coming from the
environment or the working directory. The third — where the core is — stops being a
path someone computes and becomes Node resolution.

That is why the plugin's refusal to reference a file outside its own directory stops
hurting: nothing leaves the plugin directory. And that is why the decision about the
two roots survives intact.

### Versions that disagree

The core plugin at one version and a living-docs depending on another would read the
same file with different schemas. Two layers against this: `dependencies` in the
`plugin.json` with a semver range, with the npm dependency pinned to the same major;
and `version: 2` in the file, with **every reader refusing out loud** a version it
does not know. Skew becomes an error, not a divergent interpretation.

### Two CLIs

`ownership validate` covers owner, lifecycle, trigger and generated; `living-docs
validate` covers ID family, freezing, staleness and citation. CI calls both. `init`
does not split this way because it is not a rule: the setup command remains a single
one and writes the skeleton of the ownership file by calling the core as a library.

## 8. Where the file lives

The path is configurable — a project's artifacts do not necessarily live in
`docs/`, and whoever installs chooses. Resolution is by candidate order:

1. explicit: `--ownership <path>` or environment variable;
2. `./.ownership.yml`;
3. `./docs/.ownership.yml`;
4. none — silence, because it is a repository without the toolkit.

**Two candidates present is an error that names both, never a choice.** A
freshly-migrated file coexisting with a forgotten one would mean validating by the
forgotten one without warning — and enforcement that vanishes silently is the
failure this repository has already paid an entire reorganization to kill.

The rule holds only for the root: the other files are not candidates, they are
included (section 5). And the base of the root is the repository root whichever
candidate won — it is what keeps a `docs/.ownership.yml` governing `src/**` and
`CLAUDE.md` without declaring any base.

## 9. Proof

The findings about the cache and the plugin boundary are marked in the survey as
inferred from the documentation and not tested, and the design of the distribution
rests on them. Three proofs that do not exist today:

- **packaging** — `npm pack`, install the tarball in a temporary directory, import
  and assert that it works. Closes the gap of the `development` condition.
- **real remote installation** — install the marketplace from a remote repository
  and watch the hooks run from the cache. Turns the inferred finding into fact, and
  is what the open decision about how the toolkit reaches the consumer never had.
- **single rule** — assert that the two CLIs do not report the same thing twice.

Plus what the repository already practices, extended to what is new:

- each core hook goes quiet without its configuration;
- the migration is exercised against the real file of this repository, with the 23
  entries of `artifacts` and `documents`;
- composition is exercised with a root plus a subproject, proving accumulation of
  `watches`, `basePath` shifting the base, `basePath` with `..` refused, a path
  outside the base refused, `watches[].doc` outside the base accepted, a divergent
  version between two files refused, an inclusion cycle refused, and a path
  collision refused in the three forms — inside one file, between siblings, and
  between a file and another that includes it;
- the plugin block accepts `x: {}` and a mapping with keys, refuses at load `true`,
  `false`, null, a list and text, and reaches the plugin with the content intact; a
  plugin listed in `plugins:` with no entry yields a warning and does not fail;
- pruning discards a file without opening it, and no rule of a pruned file would
  reach the resolved paths;
- `ownership explain` points to the file of the entry that covers the path,
  and to the base file when none covers it.

## 10. Migration

A command reads v1 and writes v2: it moves the file if needed, merges `artifacts`
and `documents` into a single list, nests the specific keys under the plugin block
and moves the reading keys down to `format:`. Upon finding v1 after that, the core
fails with an error that names the command. One schema alive in the code.

The command also needs to **undo overlap**, because v1 tolerates it and v2 refuses
it. This repository has one: `docs/superpowers/` and two files inside it, entered
by accident when the two were moved into an already-declared directory, with the
same `owner` and no `skill`. The migrator removes the contained entries when they
say nothing that the entry containing them does not already say, and stops naming
both when they do — mixing removal with loss of a rule would be a migration that
silently erases governance. Here the removal also fixes a latent defect: today those
two files enter the document collection twice and are judged twice by the checks
that walk it.

Composition does not enter the migration: a v1 file is always single and migrates to
a single root, which gains `version: 2` and no `basePath` — the base of the root is
already the repository root. Splitting into several files is opt-in afterwards, and
no existing consumer is obliged to.

## 11. Decisions to record

As `draft`, for human promotion. The decision about the project name is `accepted`
and therefore gets a new decision instead of an edit. The other affected ones —
single engine, hooks as a single piece, execution without a build step — are `draft`
and also go by a new decision, because the content changes instead of being
refined. The decision about the two roots is `accepted` and is **not** affected:
section 7 shows that the third root does not materialize.

| Decision to open       | About                                                                                                        | Effect                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core boundary          | owner, lifecycle and trigger inside; IDs and freezing outside                                                | reopens the single-engine decision — it splits                                                                                                                                                                                                     |
| v2 schema              | `owned` list, blocks per plugin (the presence of the block declares the binding, value always a mapping, content opaque to the core), `plugins:` at the root, `version` in every file, `basePath`, `format:`, end of the duplicated list of visible paths | —                                                                                                                                                                                                             |
| item identity          | opaque key, `key` per collection, `state-field`                                                              | —                                                                                                                                                                                                                                                  |
| doc → doc trigger      | type in the ownership, instance in the frontmatter                                                           | —                                                                                                                                                                                                                                                  |
| composition across files | base per file with `basePath` only going down, disjoint governed paths, explicit inclusion without grant of authority, confinement by the trigger criterion | —                                                                                                                                                                                       |
| file resolution        | candidate order, ambiguity is an error                                                                       | —                                                                                                                                                                                                                                                  |
| distribution           | monorepo-marketplace, npm, build at publication                                                              | supersedes the decision to execute without a build step, resolves the open decision about how the toolkit reaches the consumer, reopens the one about hooks as a single piece, and obliges a new decision about the project name — the repository now has more than one package |
| named identifier       | `plugin/descriptive-name` for check and hook                                                                 | —                                                                                                                                                                                                                                                  |

## 12. Outside this spec

- **Migration of living-docs**: renaming the checks, adjusting the glossary, moving
  the file, adopting the core as a dependency. A spec of its own, right after this
  one.
- **SDD plugin**: spec, plan and constitution as artifact types of their own. A spec
  of its own, after the migration.
- **Extension protocol** — the core as a host that loads extensions instead of an
  imported library. It remains the destination if a third plugin makes having two
  hooks per event expensive; today it would be designing and versioning a protocol
  with one and a half consumers.
- **ID governance and freezing in the core**: they may move up through the same
  extension path, when there is a second domain that wants them the same.
