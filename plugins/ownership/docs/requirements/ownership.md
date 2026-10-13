# The `ownership` plugin — requirements specification

## 1. Purpose

A single declarative file, the **ownership file** (`.ownership.yml`), says, for each path of
a repository:

1. **who owns** the path;
2. **which files are generated** by a command and, therefore, are not edited by hand.

The plugin checks these promises at two moments: **in the agent session** (hook) and **in CI**
(CLI). It also exposes itself as a **library**, so that domain plugins (living documentation,
SDD and so on) can build on top of it without duplicating these responsibilities.

This specification describes a **rebuild** of the plugin. The schema starts at `version: 1`,
and nothing here guarantees compatibility with the files, options or exports of the previous
implementation.

## 2. Boundary

### 2.1 Inside the core

- Owner per path, owner coverage of the whole repository and agreement with CODEOWNERS.
- Generated artifacts and the drift between them and the generator.
- Reading, composing and resolving the ownership files.
- Transport, without interpretation, of the plugin blocks.
- The hook and the checks that enforce all of this.
- The initialization of the ownership file: the `ownership init` CLI command and the
  `/ownership:init` slash command (§9.6).

### 2.2 Outside the core

Lifecycle, item identity, code→doc and doc→doc triggers and consumer-visible change belong to
a **shared domain library**, separate from this package. The remaining items below belong to
each domain plugin. Checks and hooks that depend on any of them are registered by the domain
plugins, never by the core (REQ-NF-06).

- **Lifecycle:** vocabulary of states per path, the state of each item, detection of
  transitions, which transitions require a human act.
- **Item identity:** what an item is (file, table row, section) and how to read it inside a
  file.
- **ID family:** prefix, format, padding, sequence without gaps, retirement, citation
  coverage.
- **Freezing** of an accepted item (append-only).
- **Obsolescence and review trigger:** `last-reviewed`, `stale-after-months`, `trigger`.
- **Code→doc trigger:** which document has to change when a piece of code changes.
- **Doc→doc trigger:** which document derives from which.
- **Consumer-visible change:** which paths require a changelog entry when they change.
- **Interpretation of the content of the plugin blocks.**

**Why:** the core does not read the content of documents. It reads only the ownership files,
CODEOWNERS and the generated marker. Everything that depends on understanding what a document
says (state, identity, links between documents, change log) stays with whoever understands the
domain. Not every collection of artifacts wants a lifecycle, a formatted prefix, a link to code
or a changelog, and generalizing that without a real second consumer would be designing an
extension protocol blind.

## 3. Glossary

| Term                      | Meaning                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Ownership file**        | YAML file (`.ownership.yml` or a variant) that declares the rules of this core.                                                           |
| **Root file**             | The ownership file found by the candidate resolution; unique in the repository.                                                           |
| **Included file**         | Ownership file read because another one lists it in `include:`.                                                                           |
| **Repository file**       | File listed by the enumeration of REQ-RES-11; it is the universe of coverage and of the checks.                                           |
| **Base**                  | Directory against which the paths of a file are resolved.                                                                                 |
| **`owned` entry**         | Declaration of an owner for a path, optionally with a skill and plugin blocks.                                                            |
| **Generated artifact**    | File produced by a command declared in `generated[]`. It is always under an `owned` entry (REQ-RES-05).                                   |
| **Plugin block**          | Map under `plugins.<name>`, at the root (global block) or in an `owned` entry (entry block), which the core carries without interpreting. |
| **Shared domain library** | Package separate from the core that gathers what is in §2.2 for the use of the domain plugins.                                            |
| **Finding**               | Result of a check: file, line, check ID, severity, message and suggested fix.                                                             |

---

## 4. Ownership file — schema

### REQ-SCH-01 — Mandatory and single version

Every ownership file (root or included) declares `version: 1`.

- A missing value, or a value other than `1`, is a load error that states the value received
  (REQ-SCH-09).
- The version is checked **before** the keys, so that the real reason shows up.
- An included file whose version differs from the root's is an error: one repository, one
  schema.

### REQ-SCH-02 — Top-level keys are a closed list

| Key         | Root      | Included      | Type                                           |
| ----------- | --------- | ------------- | ---------------------------------------------- |
| `version`   | mandatory | mandatory     | integer                                        |
| `plugins`   | optional  | **forbidden** | map of plugin name → global block (REQ-PLG-01) |
| `basePath`  | optional  | optional      | string                                         |
| `owned`     | optional  | optional      | list of entries                                |
| `generated` | optional  | optional      | list of entries                                |
| `ignore`    | optional  | optional      | list of paths                                  |
| `include`   | optional  | optional      | list of paths                                  |

- Any other top-level key is an error that names the key.

### REQ-SCH-03 — A single `owned` list

There are no separate lists per artifact type. Each entry accepts exactly:

| Key       | Mandatory | Rule                                                                                                              |
| --------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `path`    | yes       | Non-empty string. Ending in `/` = directory; no slash = file. Literal (REQ-SCH-08).                               |
| `owner`   | yes       | String that starts with `@`. No inheritance and no cascade: every entry declares its own.                         |
| `skill`   | no        | Non-empty string, if present. Tells the agent which skill answers for the path; no mechanism of the core uses it. |
| `plugins` | no        | Map of plugin name → entry block (REQ-SCH-06).                                                                    |

An unknown key is an error, and the message suggests, if it is plugin configuration, moving it
to `plugins.<name>`.

### REQ-SCH-05 — `generated`, `ignore`, `include`

- `generated[]`: exactly `path` and `command`, both mandatory.
- `generated[].path` is always a file. A path ending in `/` is a load error.
- Two equal `generated[].path`, after the normalization of REQ-RES-08, are a load error that
  names the two declarations.
- `ignore[]` and `include[]`: lists of strings.

### REQ-SCH-07 — Load errors are readable

> REQ-SCH-06 (plugin blocks per entry) is in §5.

- Invalid YAML is an error that names the file and repeats the parser's message.
- A duplicate key in any map is an error, never "the last one wins".
- Every error names the file and the key path (`file: owned[3].owner`).
- Values shown in the message appear as they were written, never `[object Object]`.

### REQ-SCH-08 — Paths are literal

- `owned[].path`, `generated[].path` and `ignore[]` are literal and relative to the base of the
  file (REQ-RES-02): no glob, no `**`, no negation.
- A trailing `/` indicates a directory in `ignore[]` as well. `docs/` is the directory `docs`
  in the base, never any directory `docs` at any level.
- A path with `*`, `?`, `[` or `!`, or starting with `/`, is a load error that names the file
  and the key path.

**Why:** the gitignore semantics used by CODEOWNERS (a pattern without a slash matches at any
level; `*` does not descend into subdirectories) are the most common source of a rule that
covers more or less than intended. A literal path eliminates that class of error and is what
makes the relations between declared paths (REQ-RES-05) verifiable at load time.

### REQ-SCH-09 — An unsupported version names the supported ones

The version error of REQ-SCH-01 states the value received **and** the versions supported by
this release of the core, so that a file of a future version does not look like a corrupted
file.

### REQ-SCH-10 — Published JSON Schema

- The package publishes `ownership.schema.json` (JSON Schema draft 2020-12) among the
  distributed files.
- Every object of the core (top level, `owned` entry, `generated` entry) has
  `additionalProperties: false`.
- Under `plugins`, at the root and in the entries, `propertyNames` applies the plugin-name
  pattern (REQ-SCH-06) and each value is `type: object`, with no internal restriction: the
  content belongs to the plugin.
- The documentation recommends the comment `# yaml-language-server: $schema=<url>` at the top
  of the file, and not a `$schema` key, which would violate the closed list of REQ-SCH-02.
- The schema is published at `https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json`; that is the `<url>` of the comment.

**Why:** it gives autocomplete and validation in the editor without changing the model. Rules
that depend on more than one file or on the repository (relation between paths, inclusion,
confinement to the base) remain only in the loader.

---

## 5. Plugin blocks

### REQ-SCH-06 — Link per entry: presence is the declaration

- An `owned` entry may have the key `plugins`: a map from plugin name to entry block.
- A path belongs to plugin `x` **if, and only if,** the `owned` entry that covers it has
  `plugins.x`. There is no other way for a plugin to claim a path.
- The block is always a **map**. `x: {}` declares the link with no configuration. `true`,
  `false`, null, a list or text are a load error, and the message suggests using `{}`.
- The plugin name follows `^[a-z][a-z0-9-]*$`, because it is the namespace of the check and
  hook IDs (REQ-ID-01). A name outside the pattern is an error.
- The core checks only the name and the type; the content is opaque and belongs to the plugin.
- Several plugins may have a block in the same entry without knowing each other.

Example:

```yaml
version: 1

plugins:
  plugin-example: {}
  another-plugin:
    prop1: Teste

owned:
  - path: docs/
    owner: '@time-docs'
    plugins:
      plugin-example:
        prop2: Teste 2
      another-plugin: {}
```

### REQ-PLG-01 — The root `plugins` is global configuration

- It is optional and exists only at the root. In an included file, it is an error that names
  the file.
- It is a map from plugin name to global block, with the same name and type rules as
  REQ-SCH-06.
- **It is not a registry.** A name being or not being at the root neither creates nor undoes a
  link; only the `owned` entry links (REQ-SCH-06).
- The core does not know which plugins exist: a mistyped name, at the root or in an entry, is
  not an error. The summary of `validate` (REQ-CLI-05) makes the names in use visible, and the
  plugin documentation says so explicitly.

### REQ-PLG-02 — Global block and entry block arrive separately

- The core passes on the global blocks and the entry blocks without interpreting them, both in
  the root file as read and in the resolved configuration.
- The core **never merges** a global block and an entry block, nor defines precedence between
  them. Precedence is the plugin's decision, and the plugin documentation declares it.

**Why:** with the same name at both levels, the intuitive reading is "the entry overrides the
root". The core cannot promise a merge rule that only the plugin knows to be valid.

### REQ-PLG-03 — Entries of a plugin, filtered by the core

The library exports a function that, given the resolved configuration and the name of a
plugin, returns the `owned` entries that link it.

- Each returned item carries the resolved path, the owner, the skill, the source file, the
  entry block (`entry`) and the plugin's global block (`global`, absent if the root does not
  configure it).
- The blocks have already passed the name and type checks of REQ-SCH-06; the content is not
  validated by the core (§11).
- A name outside the pattern of REQ-SCH-06 is an `OwnershipError`.
- A valid name with no linked entry returns an empty list. Since there is no registry of names
  (REQ-PLG-01), the core does not tell "plugin with no paths" from "wrong name".
- The function is `entriesForPlugin(config, name)`, and each item is `{ path, owner, skill, source, entry, global? }`.

---

## 6. Location and composition of the files

### REQ-RES-01 — Resolution of the root file by order of candidates

1. Explicit: the CLI option `--ownership <path>` or the environment variable
   `OWNERSHIP_CONFIG`. If the explicit one does not exist, it is an error.
2. `./.ownership.yml`
3. `./docs/.ownership.yml`

- No candidate present = **valid silence** (a repository without the plugin).
- Two candidates present at the same time = an error that names both and says how to resolve
  it. The system **never chooses on its own**.
- The base of the root is always the repository root, whichever candidate wins:
  `docs/.ownership.yml` governs `src/**` without declaring a base.

### REQ-RES-02 — Base of each file

- Base = directory of the file + optional `basePath`.
- `basePath` only descends: no `..`, no glob, no absolute path. A violation is an error.
- Exception: the base of the root is always the repository root.

### REQ-RES-03 — Paths confined to the base

`owned[].path`, `generated[].path`, `ignore[]` and `include[]` are resolved against the base
and **cannot escape it**. Escaping is an error that shows the resolved path and the base.

### REQ-RES-04 — `include` only says "also read this file"

- `include:` grants neither scope nor authority to the file that includes.
- An entry ending in `/` points to a directory, which must contain exactly one ownership file
  (named `ownership.yml`, `.ownership.yml` or a variant `.ownership.<x>.yml`/`.yaml`). No file
  is an error; more than one is an error that asks to name which one.
- A missing or unreadable included file is an error that names who included it.
- An inclusion cycle is an error that shows the chain.
- A file is included only once in the repository; the second inclusion is an error.

### REQ-RES-05 — Relation between declared paths

Resolved against their bases and normalized (REQ-RES-08), the paths of **all** the ownership
files obey the rules below. "Contains" means that a directory path is an ancestor of the other
path.

| Pair                      | Rule                                                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `owned` × `owned`         | Disjoint: none is equal to another and none contains another.                                                                                                                                  |
| `ignore` × `ignore`       | Disjoint, by the same rule.                                                                                                                                                                    |
| `generated` × `generated` | Distinct (REQ-SCH-05). Since every generated path is a file, there is no containment.                                                                                                          |
| `generated` × `owned`     | Every `generated[].path` is equal to an `owned[].path` of a file or is contained in an `owned[].path` of a directory.                                                                          |
| `ignore` × `owned`        | An `ignore` is not equal to an `owned[].path` and does not contain it. It may be contained in an `owned[].path` of a directory; in that case, the files under the `ignore` leave the coverage. |
| `ignore` × `generated`    | An `ignore` is not equal to a `generated[].path` and does not contain it.                                                                                                                      |

- Every violation is a load error that names the two paths and the two files, whether inside
  one file, between siblings or between included and includer.
- A `generated[].path` outside any `owned` is a load error that suggests declaring the path in
  `owned` or moving it inside an existing entry.
- An `ignore` that is equal to an `owned` or `generated` path, or that contains it, is a load
  error that suggests removing one of the two declarations.
- Generated is not a coverage class: it is an attribute of a file that already has an owner.
  The owner of a generated file is that of the `owned` entry that covers it.

**Accepted consequence:** `docs/` with a general owner and `docs/adr/` with another owner is
not expressible; whoever wants both declares the siblings one by one (REQ-RES-07). A directory
with an owner and a part of it with no owner, on the other hand, is expressible: `src/` in
`owned` and `src/vendor/` in `ignore`.

**Why:** the question "which rule covers this path" has a single answer, independent of the
order of declaration. An `ignore` inside an `owned` entry creates no ambiguity, because the rule
that applies is fixed by the type of the declaration, not by the order. Requiring disjointness
between generated and `owned` would force splitting the directory (REQ-RES-07) for every
generated file inside an area with an owner. And a generated file outside `owned` would be left
without an owner, contradicting REQ-OWN-01, even though CODEOWNERS would still assign it a
reviewer. An `ignore` that contains a declared path says, at the same time, that the path has
an owner and that it has none.

### REQ-RES-06 — Pruning in hooks, never in CI

- Hooks may read only the included files whose directory is an ancestor of the paths in
  question. The optimization is safe because `basePath` only descends.
- `validate` and `explain` **never prune**: they are the only places where collision and
  coverage are checked in full.

### REQ-RES-07 — Collision by containment suggests the split

When the disjointness between `owned` paths (REQ-RES-05) is violated by containment, the error
suggests the entries that replace the outer path.

- The core descends from the outer path to the inner one and, at each level, lists the children
  of that directory, except the one that leads to the inner path. Directories appear with a
  trailing `/`.
- The children come from the repository files (REQ-RES-11). A child equal to an `ignore`, or
  contained in one, does not appear: the `ignore` already takes it out of coverage.
- The list comes out sorted and truncated at 20 items, followed by `and N more`.
- The suggestion names the file that declares the outer path, which is where the edit happens.
- Equal paths have no siblings to suggest; the error only points at the duplicate.
- It is only a message: the core does not rewrite the file.

Example, with `docs/README.md`, `docs/guides/x.md`, `docs/adr/0001.md` and `docs/api/v1/y.md`
in the repository:

```
.ownership.yml: owned[0].path "docs/" contains owned[1].path "docs/adr/"; owned paths must be disjoint.
  → replace "docs/" with: docs/README.md, docs/api/, docs/guides/ (keep docs/adr/)
```

**Why:** it turns the restriction of disjointness into an error with a ready-made fix
(REQ-NF-03). The suggestion is a snapshot of the moment: a file created later under the
directory is born an orphan and is caught by `owner-coverage`. That is the permanent cost of
disjointness.

### REQ-RES-08 — Normalized paths and case collision

- Before the relations of REQ-RES-05 are checked, every declared path is normalized: no `./`,
  no duplicate slashes, in Unicode NFC.
- Every path comparison is case-sensitive (REQ-NF-08).
- Two declared paths that differ only in case are a load error that names the two paths and
  the two files.

**Why:** on case-insensitive file systems (macOS, Windows), `Docs/` and `docs/` are the same
directory; on GitHub, they are two. Without the error, the relations between paths hold in one
environment and are false in the other.

### REQ-RES-09 — Symbolic links

- In coverage and in the checks, a symbolic link is a file at the path of the link itself; the
  core does not follow the target.
- In the hook, the path of each write tool (REQ-HK-04) is resolved to the real path before
  judging. If the real path is a generated file (REQ-GEN-02), the write is denied, even if the
  payload path is not. A real path outside the roots follows REQ-HK-03.

**Why:** Git versions the link as a blob of its own, so coverage should not follow it. In the
hook, a link to a generated file would be a trivial bypass of the guard.

### REQ-RES-10 — Submodules

- A submodule counts as a single file, at the path of the submodule, for coverage purposes.
- The core does not descend into submodules.

**Why:** the content of a submodule belongs to another repository, with its own governance.

### REQ-RES-11 — Repository files

- The repository files are those versioned in Git plus the untracked ones that the
  repository's `.gitignore` files do not exclude, as long as they are present in the work tree.
- Only the repository's `.gitignore` files count. `.git/info/exclude` and `core.excludesFile`
  are not considered.
- A versioned file removed from the work tree does not enter. A versioned file that a
  `.gitignore` would exclude enters, because it is versioned.
- The same enumeration serves coverage (REQ-OWN-02), the split suggestion (REQ-RES-07) and the
  marker search (REQ-GEN-04), and happens only once per run (REQ-NF-07).
- With an ownership file present, a directory that is not in a Git work tree is a load error.

**Why:** what `.gitignore` excludes (installed dependencies, build output, caches) is not part
of the repository and should not require an owner or an `ignore`, whether or not it exists on
the machine. A new file not yet added to the index enters, so that pre-commit sees it before
the commit. Local excludes vary per machine, and with them the same commit would give different
results in CI and on the developer's machine. Enumerating through Git dispenses with `stat` per
file and agrees with the treatment of links (REQ-RES-09) and submodules (REQ-RES-10).

---

## 7. Owner coverage

### REQ-OWN-01 — Exactly one owner per path

Every repository file (REQ-RES-11) outside `ignore` is covered by exactly one `owned` entry,
which declares its owner. Uniqueness comes from REQ-RES-05 and existence from REQ-OWN-02. A
generated file is no exception: the owner is that of the `owned` entry that covers it. Zero
owners is an orphan (REQ-OWN-02). Agreement between the declared owner and CODEOWNERS is
checked by REQ-OWN-03.

### REQ-OWN-02 — Coverage reaches the whole repository

- Every repository file (REQ-RES-11) is covered by an `owned` entry or by an `ignore`. Being in
  `generated[]` does not count as coverage. A file with neither is an error.
- Every `owned[].path` exists: a file path is a repository file, and a directory path contains
  at least one repository file outside `ignore`. Otherwise it is an error, and the message
  tells a nonexistent path from a directory whose files are all ignored.
- An `ignore` path does not need to exist. An `ignore` that matches no file is not an error.

**Why:** an `ignore` describes what stays out when it shows up, not what exists now. A path that
exists only on some machines or that was removed remains a valid declaration. An `owned` entry
with no file at all, on the other hand, declares the owner of nothing, almost always because of
a mistyped path or one forgotten after a removal.

### REQ-OWN-03 — The declared owner reviews the path in CODEOWNERS

- The `CODEOWNERS` file is optional (REQ-OWN-04). Without it, the core requires nothing of it,
  and `codeowners-match` produces no findings.
- When `CODEOWNERS` exists, for each `owned[].path`, the effective line evaluated by `ownersOf`
  (REQ-API-04) exists and includes the declared `owner`.
- A directory path is evaluated by the declared path itself (`docs/`), not file by file.
- These are distinct errors, and both point at the entry in the ownership file:
  - a path with no effective line;
  - the declared owner absent from the effective line. The message names the line number and
    the owners it assigns.
- The requirement is inclusion, not equality: the line may assign owners other than the
  declared one.
- More specific lines that change the reviewer of part of a declared directory are not checked
  (§11).
- The declared owner is looked up in the effective line without regard to case: `@Team` and `@team` are the same owner.

**Why:** the ownership says who is the owner and, optionally, which skill answers; CODEOWNERS
says who reviews. An owner declared in only one of the two places disappears at the first
doubt. Not every repository uses mandatory review by owner, and requiring the file would force
creating a CODEOWNERS just to satisfy the check. The effective line, and not any line that
mentions the path, is the one GitHub uses to request review: `docs/ @time-docs` followed by
`docs/ @outro` requests review from `@outro`. Evaluating by declared path keeps the cost
proportional to the number of entries, not of files.

### REQ-OWN-04 — Location of CODEOWNERS

- The core looks for `CODEOWNERS` in the same places as GitHub: `.github/CODEOWNERS`,
  `CODEOWNERS` and `docs/CODEOWNERS`.
- None present = a repository without CODEOWNERS (REQ-OWN-03).
- More than one present is a load error that names the files found (REQ-NF-02).
- `loadCodeowners`, `ownersOf`, `explain` and `codeowners-match` use this same location.

**Why:** GitHub uses the first one it finds and ignores the others without warning. A second
file edited by mistake would have no effect, and the core should not repeat that choice in
silence.

---

## 8. Generated artifacts

### REQ-GEN-01 — The versioned file equals the generator output

For each `generated[]`, the output of `command` (run at the repository root) equals the content
of the versioned file. It is an error when:

- the content differs: the finding points at the **first different line**;
- the command fails: the finding shows the first line of the error;
- the declared file does not exist, or the path is a directory;
- the declared file exists but cannot be read (no permission, or any other read error): the
  finding names the path and the reason. It is a finding, not an error that keeps `validate`
  from running.

The suggested fix is always `<command> > <path>`.

### REQ-GEN-02 — A generated file is not edited by hand

In the session, an attempt to edit or write a generated file is **denied** with a message that
names the origin of the declaration and the command that produces it.

The rule also applies to a file whose first line contains the marker `generated: do not edit`
(case-insensitive, searched in the first 512 bytes), even if it is outside `generated[]`. In
that case the message asks to declare it there.

### REQ-GEN-03 — A Write with the marker in the content is denied

- In the Write, besides the current file, the hook applies the marker rule (REQ-GEN-02) to the
  payload content (`content`).
- A Write whose content carries the marker is **denied**, whether or not the file exists at the
  path: creating by hand a file that declares itself generated is the same as editing it.
- The message asks to declare the path in `generated[]` and to produce the file with the
  command, in the form `<command> > <path>`.
- If the path is already in `generated[]`, the message of REQ-GEN-02 applies, which already
  names the command.
- Edit, MultiEdit and NotebookEdit are judged only by the current file: a marker that the edit
  introduces into a file that does not have it yet is not detected (§11).

**Why:** without this rule, the agent creates by hand a file that calls itself generated and
that no command produces. The guard would only catch it on the next edit, and `generated-drift`
never would, because the file is not in `generated[]`. The Write is the only tool whose payload
carries the whole final content, so it is the only one where the check is cheap and exact.

### REQ-GEN-04 — A marker outside `generated[]` is a finding

- `generated-drift` looks for the marker of REQ-GEN-02, by the rule of `isGeneratedByMarker`
  (REQ-API-04), in every repository file (REQ-RES-11) that is neither in `generated[]` nor in
  `ignore`.
- A file with the marker outside `generated[]` is an error. The fix suggests declaring it in
  `generated[]` with the command that produces it.
- A symbolic link is not followed (REQ-RES-09) and a submodule is not read (REQ-RES-10).

**Why:** the hook already denies the edit of that file (REQ-GEN-02), but, with no declared
command, no check verifies whether the content matches a generator. The search lives in
`generated-drift`, and not in `owner-coverage`, because reading the start of every file would
blow the budget of REQ-NF-07. `generated-drift` is already the expensive check.

---

## 9. Interfaces

### 9.1 Checks

#### REQ-CHK-01 — Catalog of the core checks

| ID                           | Requirements           | Fails when                                                                                                           | Cost                                                                              |
| ---------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `ownership/owner-coverage`   | REQ-OWN-01, REQ-OWN-02 | a file without coverage; an `owned[].path` that does not exist or has all its files ignored                          | a single enumeration of the repository files (REQ-RES-11, REQ-NF-07)              |
| `ownership/codeowners-match` | REQ-OWN-03             | an `owned[].path` without an effective line in CODEOWNERS; the declared owner outside the effective line             | parsing CODEOWNERS and one evaluation per declared path                           |
| `ownership/generated-drift`  | REQ-GEN-01, REQ-GEN-04 | content diverges from the generator; the command fails; the declared file is missing; a marker outside `generated[]` | running the generators (REQ-CLI-09) and reading the start of the undeclared files |

- This table is the content of the public catalog exported by the library (REQ-API-01).
- Every finding of these checks is `error` (REQ-API-05).

**Why:** coverage and agreement with CODEOWNERS are different questions: a repository without
CODEOWNERS runs the first and has nothing to check in the second. Separated, `--check`
(REQ-CLI-08) allows running only coverage in a pre-commit, and the goal of REQ-NF-07 is tied to
a check of defined scope.

### 9.2 CLI

#### REQ-CLI-01 — `ownership validate`

- Runs the checks of the catalog (REQ-CHK-01), always over the whole repository. `--check`
  (REQ-CLI-08) restricts which checks run, never the scope.
- It accepts neither `--base` nor any diff option: the core has no diff check.
- The checks run the same at any stage of project maturity.

#### REQ-CLI-02 — `ownership explain <path>`

- Covered path: shows each rule that reaches it (`owned`, `generated` or `ignore`) and the
  ownership file that declares it.
  - `owned` entry: owner, skill and each plugin block of the entry.
  - Generated: whether the origin is `generated[]` or the marker (REQ-GEN-02) and, when
    declared, the command. A generated file also shows the `owned` entry that covers it.
  - A file under an `ignore` contained in an `owned` directory: shows both rules and says that
    the file is outside coverage (REQ-RES-05).
- When there is a `CODEOWNERS`, it shows the owners that it assigns to the path, evaluated as
  GitHub evaluates (the last matching line wins), the number of that line and, for an `owned`
  entry, whether the declared owner is among them (REQ-OWN-03). Without `CODEOWNERS`, it says
  that the repository does not have the file.
- A missing field appears as `—`.
- Uncovered path: says which ownership file has the deepest base that contains the path, which
  is where the missing entry should be written, or says that no file contains it.
- A path present in the work tree but outside the repository files (REQ-RES-11), because a
  `.gitignore` excludes it: says so and does not evaluate coverage.

#### REQ-CLI-03 — Output and exit codes

| Situation                                                                                     | Output                                                                 | Code |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---- |
| No violations                                                                                 | plugins block (REQ-CLI-05), if any + `ownership: no violations found.` | 0    |
| Warnings only                                                                                 | list of findings + plugins block + summary                             | 0    |
| Some error                                                                                    | list of findings + plugins block + summary                             | 1    |
| Repository without an ownership file                                                          | message saying there is nothing to validate                            | 0    |
| Load error, unknown command, unknown option or option with an invalid value, missing argument | message on stderr                                                      | 2    |
| No command                                                                                    | usage                                                                  | 2    |
| `--help` / `-h`                                                                               | usage                                                                  | 0    |

The output follows the order: findings, plugins block (REQ-CLI-05), final line.

In the `text` format (the default), each finding is
`<file>[:<line>]  <check-id>  <severity>  <message>`, followed by `  → <fix>`. At the end comes
`ownership: N errors, M warnings.`, with correct singular and plural. The `json` and `github`
formats are in REQ-CLI-06.

The usage lists `validate`, `explain` and `init`. `ownership init` produces no findings: it
exits with 0 on success and with 2 on error, never with 1 (REQ-INIT-01).

#### REQ-CLI-04 — Target directory

The CLI operates on the current directory; `OWNERSHIP_REPO_ROOT` points to another repository.

#### REQ-CLI-05 — Plugin summary in `validate`

- `validate` prints a block with all the plugin names present in the whole repository, at the
  root and in the entries, without pruning (REQ-RES-06).
- Each line carries the name, the number of `owned` entries that link it and `global config`
  when there is a block at the root.
- A plugin that appears only at the root is listed with `0 entries`.
- Lines sorted by name, with correct singular and plural (`1 entry`, `12 entries`).
- With no plugin name at all, the block is omitted.
- The block is informative: it is not a finding, does not enter the count of errors and
  warnings and does not change the exit code.
- The block does not appear on a load error (code 2) nor in a repository without an ownership
  file.

```
ownership: plugins in use:
  another-plugin   3 entries  global config
  plugin-example  12 entries
  plugin-exmple    1 entry
ownership: no violations found.
```

**Why:** the core does not know which plugins exist (REQ-PLG-01), so it does not point at a
wrong name; showing all the names in use makes the typo show up when reading.

#### REQ-CLI-06 — Output formats

- `validate` accepts `--format text|json|github`. The default is `text` (REQ-CLI-03).
- `json`: a single object on stdout with:
  - `findings`: list of findings with the fields of `Finding` (REQ-API-05);
  - `plugins`: the summary of REQ-CLI-05, as a list of `{ name, entries, globalConfig }`;
  - `errors` and `warnings`: the counts.
- `github`: each finding becomes a workflow command,
  `::error file=<file>,line=<line>,title=<check-id>::<message> → <fix>`, or `::warning` for a
  warning. `%`, CR and LF are escaped. The plugins block and the final line come out as in
  `text`.
- The exit codes are the same in every format. Messages of code 2 come out as text on stderr,
  in any format.
- A repository without an ownership file produces, in `json`, the object with empty lists and
  zero counts and, in `github`, the same message as `text`.
- Renaming or removing a field of the `json` is a breaking change.

**Why:** annotations show up on the PR line with no extra integration; the JSON makes the CLI
contract testable and consumable by other tools.

#### REQ-CLI-07 — Deterministic order

Findings come out sorted by file, line (a finding without a line before those that have one),
check ID and message, in any format and with any value of `--jobs` (REQ-CLI-09).

**Why:** the same tree produces the same output, which allows comparing logs between runs and
testing the CLI with fixed output.

#### REQ-CLI-08 — Check selection

- `validate --check <id>`, repeatable, runs only the named checks, still over the whole
  repository.
- Without `--check`, all the core checks run.
- An unknown ID is a code 2 error that lists the valid IDs.
- The plugins block (REQ-CLI-05) appears with any selection.
- It is not a diff option: the scope remains the whole repository (REQ-CLI-01).

**Why:** `generated-drift` runs generators and is expensive; `owner-coverage` alone fits in a
pre-commit.

#### REQ-CLI-09 — Generators in parallel

- `generated-drift` runs the commands in parallel, by default up to the number of CPUs.
- `--jobs <n>` changes the limit, and `--jobs 1` runs one command at a time. A value that is
  not a positive integer is a code 2 error.
- No pair of commands competes for the same declared artifact, because a repeated
  `generated[].path` is a load error (REQ-SCH-05).
- The documentation warns that the commands run at the same time: generators that share state
  on disk (cache, temporary directory) need to be independent or run with `--jobs 1`.

**Why:** in a repository with many generators, serial execution dominates the time of
`validate`.

### 9.3 Session hooks

#### REQ-HK-01 — Set of hooks

| Hook                        | Event           | Tools                                            | Decision                            |
| --------------------------- | --------------- | ------------------------------------------------ | ----------------------------------- |
| `ownership/generated-guard` | before the tool | Edit, Write, MultiEdit, NotebookEdit (REQ-HK-04) | **denies** (REQ-GEN-02, REQ-GEN-03) |

There is no hook on commit.

#### REQ-HK-02 — Fail open

In any of these situations the hook stays **silent** and exits with 0: Node missing, a
dependency missing, an invalid payload, a timeout (5 s), an ownership file missing or with a
load error, or any exception. A hook never prevents work because of its own defect.

#### REQ-HK-03 — Payload paths

- The repository judged is the project directory of the session.
- An absolute path is converted to relative to the root, also accepting an extra host root. The
  comparison of the prefix is case-insensitive. A path outside the roots is ignored.
- Backslashes are normalized.
- The extra host root comes from the `OWNERSHIP_HOST_ROOT` environment variable.

#### REQ-HK-04 — All the file-editing tools

- `generated-guard` answers to Edit, Write, MultiEdit and NotebookEdit.
- The path judged comes from `file_path` or, in NotebookEdit, from `notebook_path`.
- In Write, the hook also reads `content`, for the rule of REQ-GEN-03.
- A write through Bash or through a tool outside this list is not judged by the hook (§11).

**Why:** a guard only for Edit and Write lets MultiEdit and NotebookEdit through, which change
the same file through the same kind of payload.

### 9.4 Identifiers

#### REQ-ID-01 — `plugin/descriptive-name`

Every check and hook identifies itself as `<plugin>/<descriptive-name>`
(`ownership/generated-drift`), never by number. The name says what it checks without a
translation table, and the plugin namespace prevents collision between plugins installed
together.

### 9.5 Library

#### REQ-API-01 — Public surface

The package exports, for domain plugins:

- **resolution:** `resolveOwnership` (with an option to prune by paths), `findOwnedRule`,
  `findGeneratedRule`, `explainPath`, the plugin filter function of REQ-PLG-03 and the types of
  the resolved configuration;
- **checks:** `coreChecks`, the types `Check`, `CheckContext`, `Finding`, `Severity`, and the
  **public catalog** of the checks (ID, name, command, when it fails), with the content of
  REQ-CHK-01;
- **CODEOWNERS:** `parseCodeowners`, `loadCodeowners`, `ownersOf` (REQ-API-04);
- **generated marker:** `isGeneratedByMarker` (REQ-API-04);
- **errors:** `OwnershipError`.

The surface grows only by what a real consumer imports. Renaming or removing any exported name
is a breaking change. Reading items, detecting transitions and the other names of §2.2 are
exported by the shared domain library, not by this package.

#### REQ-API-02 — Accessible plugin blocks

The resolved configuration carries the `plugins` map of the root and, in each rule, the
`plugins` map of the entry, both indexed by plugin name. A plugin obtains the entries that link
it, with the global block and the entry block separate, through the function of REQ-PLG-03.

#### REQ-API-03 — Rule lookup proportional to the depth of the path

- `resolveOwnership` returns an immutable configuration, indexed by path prefix.
- `findOwnedRule` and `findGeneratedRule` answer in time proportional to the depth of the path,
  and not to the number of declared entries.

**Why:** the hook runs at every edit, with a budget of 5 s (REQ-HK-02). In a repository with
thousands of entries, a linear lookup becomes noticeable.

#### REQ-API-04 — Effective owner and marker as public functions

- `ownersOf(path)` returns the owners that CODEOWNERS assigns to the path, evaluated as GitHub
  evaluates (CODEOWNERS patterns, the last matching line wins), and the number of that line.
  `explain` (REQ-CLI-02) and `codeowners-match` (REQ-OWN-03) use this same evaluation, over the
  file located by REQ-OWN-04. Without `CODEOWNERS`, it returns no owner and no line, in a way
  distinguishable from a path that no line matches.
- `isGeneratedByMarker(content)` says whether the content carries the marker of REQ-GEN-02, by
  the same rule that the hook applies to the current file and to the `content` of the Write
  (REQ-GEN-03).
- The signature is `ownersOf(codeowners, path)`, where `codeowners` is the result of `loadCodeowners` or `parseCodeowners`, or `null`. It returns `{ kind: 'no-codeowners' }`, `{ kind: 'unmatched' }` or `{ kind: 'matched', owners, line }`. A line whose pattern uses syntax GitHub does not support (`!`, `[ ]`) is dropped, as GitHub drops it.

**Why:** domain plugins need exactly these two facts and should not reimplement the semantics
of CODEOWNERS patterns or the marker rule.

#### REQ-API-05 — `Finding` is a stable contract

- `Finding` has the fields `file`, `line` (optional), `column` (optional), `checkId`,
  `severity` (`error` or `warning`), `message` and `fix` (optional), all serializable.
- The `json` of the CLI (REQ-CLI-06) uses exactly these fields.
- Renaming or removing a field is a breaking change.
- Every finding of the core checks has `severity: error`. `warning` exists for checks of domain
  plugins: the CLI counts and formats it, and it does not change the exit code (REQ-CLI-03).

**Why:** the core checks, the domain plugin checks and the CLI produce the same type. A stable
contract prevents the `json` and the library from diverging.

### 9.6 Initialization

> This section absorbs the former REQ-NF-05 (installation in a consumer repository).

#### REQ-INIT-01 — `ownership init`

- Creates the root file at `./.ownership.yml` or at the path given by `--ownership <path>`. An
  explicit path stays inside the repository; outside it is a code 2 error.
- If the target or any candidate of REQ-RES-01 already exists, it is a code 2 error that names
  the file. There is no `--force`: init never overwrites.
- A directory outside a Git work tree is a code 2 error (REQ-RES-11).
- `--stdout` prints the file and writes nothing.
- init exits with 0 on success and with 2 on error, never with 1 (REQ-CLI-03).
- With `--stdout`, the file goes to stdout and the summary to stderr.

**Why:** overwriting would erase owner decisions. Whoever wants to start over deletes the file
by hand.

#### REQ-INIT-02 — Three modes, chosen explicitly

| Mode         | Option              | `owned` entries generated                      |
| ------------ | ------------------- | ---------------------------------------------- |
| Skeleton     | none                | none, only a commented template per root child |
| Single owner | `--owner <@x>`      | one per root child, all with `@x`              |
| CODEOWNERS   | `--from-codeowners` | derived by REQ-INIT-03                         |

- "Root children" is the first level of the repository files (REQ-RES-11), with directories
  ending in `/` and in order.
- `--owner` and `--from-codeowners` together are a code 2 error. Also a code 2 error:
  `--owner` with a value that does not start with `@` and `--from-codeowners` without
  CODEOWNERS (REQ-OWN-04).
- With neither option, the mode is skeleton, even if CODEOWNERS exists. In that case the output
  mentions `--from-codeowners`.
- The target path is added to the repository files before the entries are derived, so the ownership file is born covered.

**Why:** only a human supplies an owner, whether on the command line or in CODEOWNERS. The
skeleton mode preserves the deliberate failure of `validate` (REQ-INIT-05). init does not switch
modes on its own just because CODEOWNERS exists (REQ-NF-02).

#### REQ-INIT-03 — Derivation from CODEOWNERS

init produces the smallest disjoint coverage that passes `codeowners-match` by construction. It
starts from each root child and, if needed, descends:

- A node becomes an entry when all the repository files under it have the same set of owners by
  `ownersOf` (REQ-API-04) **and** `ownersOf` of the declared path itself returns that set.
  Otherwise, init descends to the children of the node.
- The owner of the entry is the first one on the effective line. The others go in a comment on
  the entry (`# CODEOWNERS line 12 also lists @b @c`).
- A file without an effective line generates no entry. This includes a line with a pattern and
  no owners, which on GitHub unsets the owner. The output says how many files ended up in that
  situation, and `owner-coverage` fails on them.
- Paths that differ only in case (REQ-RES-08) do not become entries. They appear commented out
  and listed in the output.

**Why:** converting line by line does not work, because CODEOWNERS patterns have glob and match
at any level (REQ-SCH-08), and the rule "the last line wins" produces overlap. The second
condition exists because `codeowners-match` evaluates the declared path, not the files
(REQ-OWN-03): a line like `docs/**/*.md @x` may cover every file of `docs/` and not match
`docs/` itself.

#### REQ-INIT-04 — Content of the file

- The file starts with the comment `# yaml-language-server: $schema=<url>` (REQ-SCH-10) and with
  `version: 1`.
- It seeds no `ignore:`, `plugins:` or `include:`.
- The files with the marker (REQ-GEN-02) appear in a commented `generated:` block, with
  `command:` to be filled in.
- The same tree with the same options produces the same file, byte for byte.
- The written file loads with no load error, and a test proves that in the three modes.

**Why:** what `.gitignore` excludes, such as `node_modules/` at any level and build output, is
already outside the repository files (REQ-RES-11) and needs no `ignore`. The `generated:` block
stays commented because `command` is mandatory (REQ-SCH-05) and init does not know it;
`generated-drift` already points at those files (REQ-GEN-04).

#### REQ-INIT-05 — Output

- Says which file was written, how many entries it has, how many files were left without an
  owner and what the next step is (`ownership validate`).
- In skeleton mode, and whenever files are left without an owner, it warns that the repository
  has to be declared in `owned` and that `validate` **fails on purpose** until that is done.

**Why:** coverage requires an owner for every file (REQ-OWN-02). An initial file that passed
`validate` without anyone having said who owns what would hide the decision that the plugin
exists to make explicit.

#### REQ-INIT-06 — Slash command `/ownership:init`

The plugin ships the slash command `/ownership:init`, which leads the initialization in the
agent session. The `ownership init` of the CLI continues to exist and is the only way to create
the file.

- The slash command creates the file only by running `ownership init`; it never writes the
  initial file on its own. Refusals, errors and initial content are those of REQ-INIT-01 to
  REQ-INIT-05.
- Before running, it asks the human which mode to use (REQ-INIT-02). If CODEOWNERS exists, it
  offers `--from-codeowners`. It does not choose the mode on its own.
- After init, when files are left without an owner (skeleton mode or the orphans of
  REQ-INIT-03), or when the human wants to split a single owner, the agent proposes a split into
  `owned` entries that respects REQ-RES-05, from the root children and the structure of the
  repository.
- The agent never invents an owner: it proposes the paths and asks the owner of each. It only
  edits the ownership file after explicit confirmation from the human.
- It neither creates nor changes CODEOWNERS. When the split would make `codeowners-match` fail,
  it shows which paths would be left without an effective line or without the declared owner.
- It ends by running
  `ownership validate --check ownership/owner-coverage --check ownership/codeowners-match` and
  shows the result. `generated-drift` is left out because it runs generators (REQ-CLI-08).
- The name follows the plugin namespace, like the IDs of REQ-ID-01.

**Why:** the CLI is what runs in CI, in scripts and outside an agent session, and it needs to be
deterministic (REQ-INIT-04). Splitting owners is a conversation: someone needs to say who owns
what, and that part does not fit in a non-interactive CLI. Always creating the file through the
CLI guarantees that both entry points produce the same initial file.

---

## 10. Non-functional requirements

### REQ-NF-01 — Language independence

A check reads structure and never prose. Structure here means the keys of the ownership file,
the lines of CODEOWNERS and the fixed marker `generated: do not edit`. A corpus entirely in
another language produces exactly the same findings. The machine vocabulary (the keys of the
ownership file) is the same in any language.

### REQ-NF-02 — Never choose in silence

Every ambiguity is a visible error: two root candidates, an included directory with two files, a
path covered by two `owned` entries, two overlapping `ignore`, two `generated[]` with the same
path, an `ignore` that contains a path declared in `owned` or `generated`, paths that differ
only in case, a duplicate key in a map, more than one `CODEOWNERS` (REQ-OWN-04). The core never
resolves by order of declaration or of discovery.

### REQ-NF-03 — Actionable messages

Every finding and every error says what is wrong, where (file and, when there is one, line) and
what to do. What the plugin ships (CLI and hook messages) is in English and does not point at
internal artifacts of the repository that develops it.

### REQ-NF-04 — Distribution

- Plugin installable from the marketplace; Node 24 or later.
- When it is the plugin itself, it runs straight from TypeScript (type stripping).
- As an npm dependency of another plugin, it runs from the compiled JavaScript.
- The compiled output is generated **only** at packaging and is never versioned, so that there
  is no stale `dist/` in which the hook runs old code.
- A packaging test proves that the exports and the published files work.

### REQ-NF-05 — Absorbed by §9.6

Installation in a consumer repository is in REQ-INIT-01 to REQ-INIT-06.

### REQ-NF-06 — One rule, one owner

Each event is answered by a single plugin. A domain plugin that depends on the core declares
the dependency and does **not** register its own versions of these hooks.

### REQ-NF-07 — Performance

- `validate --check ownership/owner-coverage` (REQ-CLI-08) finishes in under 2 s on a
  repository with 100 thousand files, on a standard CI machine.
- For that, the repository files are enumerated only once, by Git (REQ-RES-11), and matched
  against the prefix index (REQ-API-03), with no `stat` per file.

**Why:** it makes the check viable in pre-commit and in monorepos.

### REQ-NF-08 — Paths are case-sensitive

- Every comparison between paths relative to the repository root is case-sensitive, like
  GitHub, even on case-insensitive file systems. Case collision between declared paths is
  detected by REQ-RES-08.
- Exception: when converting an absolute path to relative, the hook compares the root prefix
  case-insensitively (REQ-HK-03), because that prefix comes from the operating system, not from
  the repository.

**Why:** CODEOWNERS is evaluated by GitHub, which is case-sensitive. A path that matches on
macOS and does not match on GitHub gives a different result in each environment.

---

## 11. Explicitly out of scope

- Migration of ownership files from the previous implementation (`version: 2`) to this rebuild.
- Validation of the content of plugin blocks: a wrong key **inside** the block only shows up
  when the plugin runs.
- Detection of a plugin that is configured or linked but not installed.
- Detection of a mistyped plugin name, at the root or in an entry: a wrong name only shows up
  as a plugin that does not see the path (REQ-PLG-01, REQ-CLI-05).
- Merge or precedence between a global block and an entry block (REQ-PLG-02).
- Diff checks and any CLI option that compares with a base ref.
- Reading the content of documents beyond the marker listed in REQ-NF-01.
- Owner inheritance between entries or files.
- Specificity as a tie-breaker between overlapping `owned` entries.
- Glob or negation in declared paths (REQ-SCH-08).
- Untracked files that a `.gitignore` excludes: they stay outside every check (REQ-RES-11).
- `.git/info/exclude` and `core.excludesFile` in the enumeration (REQ-RES-11).
- Repositories outside Git (REQ-RES-11).
- Requiring that an `ignore` path exists (REQ-OWN-02).
- A write to a generated file through Bash or through a tool outside REQ-HK-04: the hook does
  not judge it, and the drift of a file declared in `generated[]` shows up in `generated-drift`.
- A marker introduced by Edit, MultiEdit or NotebookEdit in a file that does not have it yet:
  the hook judges the current content of the file, not the result of the edit (REQ-GEN-03).
- Requiring the presence of `CODEOWNERS` (REQ-OWN-03).
- `CODEOWNERS` lines more specific than a directory `owned[].path` and that change the reviewer
  of part of it: `codeowners-match` evaluates only the declared path (REQ-OWN-03).
- Equality between the declared owner and the owners of the effective line: only inclusion is
  checked (REQ-OWN-03).
- Inferring an owner from Git history (authorship, blame), in `init` or in `/ownership:init`:
  an owner is a human's decision (REQ-INIT-02, REQ-INIT-06).
- Creating or changing `CODEOWNERS` through `init` or `/ownership:init`.
- Re-running `init` over an existing ownership file to complete or rewrite it (REQ-INIT-01).
- Creating included files (`include:`) through `init`.
