# The `ownership` plugin — design

The rebuild of the `ownership` plugin from its requirements specification. The
requirements are the source of truth; this document says how the plugin meets
them and what changes in the repository around it.

## Intent

- **Outcome:** one plugin, `plugins/ownership/`, that covers every requirement
  of the ownership specification: the ownership file schema, its resolution and
  composition, owner coverage, CODEOWNERS agreement, generated artifacts, the
  `validate`/`explain`/`init` CLI, the `generated-guard` hook, the
  `/ownership:init` slash command, the published JSON Schema and the library
  surface for domain plugins.
- **Starting point:** commit `dff9409` left the repository with 12 versioned
  files. The previous implementation (schema `version: 2`) is reference for
  packaging only; the specification declares no compatibility with it.
- **Done when:** every requirement is implemented and tested, the repository
  passes its own `ownership validate`, and the plugin is installable from the
  marketplace.

## Decisions taken while designing

| Decision | Choice |
| --- | --- |
| Language of the versioned specification | English translation; the Portuguese original is not versioned. |
| Requirement IDs (`REQ-*`) | Used only for cross-references inside the specification. Tests, code, comments and commit messages do not cite them. Commits use `type(scope): subject`. |
| Package shape | One package, `@esliph/ownership`, holding library, CLI, hook and slash command. |
| CODEOWNERS patterns | Own matcher, compiled per line to a RegExp with GitHub's semantics. |
| Repository files enumeration | One `git ls-files` call, minus `--deleted`. |
| Runtime dependency | `yaml` only. |
| JSON Schema URL | `https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json` |
| Owner comparison against CODEOWNERS | Case-insensitive. |
| Scope in the repository | Marketplace registration, toolchain and CI, dogfooding, and the fix of `CLAUDE.md` and `CONTRIBUTING.md`. |

### Amendments folded into the translated specification

These are rules the specification left open. They go into the translation, in
the requirement they belong to, and are listed in the commit that versions it.

- **Schema URL** (schema publication, init file content): the URL above.
- **Owner comparison** (CODEOWNERS agreement): the declared owner is looked up
  in the effective line without regard to case.
- **Plugin filter name** (entries of a plugin): `entriesForPlugin(config, name)`.
- **`ownersOf` signature** (effective owner): `ownersOf(codeowners, path)`,
  returning `{ kind: 'no-codeowners' } | { kind: 'unmatched' } |
  { kind: 'matched', owners, line }`. Lines whose pattern uses syntax GitHub
  does not support (`!`, `[ ]`) are dropped, as GitHub drops them.
- **`init --stdout`**: the file goes to stdout and the summary to stderr.
- **Init target covered**: the target path is added to the repository files
  before deriving entries, so the ownership file is born covered.
- **Host root** (hook payload paths): the extra root comes from
  `OWNERSHIP_HOST_ROOT`.

## Architecture

```
plugins/ownership/
├── docs/requirements/ownership.md     the specification, in English
├── .ownership.yml  README.md  CHANGELOG.md  Spurfile
├── package.json  package-lock.json  tsconfig.json  tsconfig.build.json  eslint.config.mjs
├── test/                              mirrors plugin/src/
└── plugin/                            what is installed
    ├── .claude-plugin/plugin.json
    ├── hooks/hooks.json  hooks/run-hook.sh
    ├── commands/init.md               /ownership:init
    ├── ownership.schema.json          hand-written; a test keeps it in agreement with the loader
    ├── package.json  package-lock.json
    └── src/
        ├── paths/       NFC normalization, literal validation, containment, case collision
        ├── schema/      YAML → typed raw file, with key path and line per node
        ├── repo/        single Git enumeration; work-tree detection
        ├── resolve/     root candidates, includes and bases, path relations,
        │                split suggestion, trie index, explainPath, entriesForPlugin
        ├── codeowners/  location, parser, matcher, ownersOf
        ├── generated/   isGeneratedByMarker
        ├── checks/      types, catalog, the three checks, runner and ordering
        ├── init/        three modes, CODEOWNERS derivation, deterministic rendering
        ├── cli/         argv, validate, explain, init, text/json/github formats
        ├── hooks/       generated-guard, payload io, path conversion
        └── index.ts     the public surface
```

**Flow.** The CLI takes the target directory (cwd, or `OWNERSHIP_REPO_ROOT`),
enumerates the repository files once, and calls
`resolveOwnership(root, { repoFiles })`. The resolved configuration is deeply
frozen and carries the files read, every rule with its origin (file, key path,
line), the plugin blocks and a trie keyed by path segment. A `CheckContext`
(configuration, repository files, CODEOWNERS loaded on demand, `jobs`) goes
through each selected check; the findings are sorted and formatted.

**Errors.** Every load error is an `OwnershipError` carrying `issues[]`, each
with file, key path, line when there is one, message and fix. The CLI turns it
into exit code 2; the hook swallows it. A load error is never a `Finding`.

**Public surface** (`index.ts`): `resolveOwnership`, `findOwnedRule`,
`findGeneratedRule`, `explainPath`, `entriesForPlugin` and the resolved
configuration types; `coreChecks`, `Check`, `CheckContext`, `Finding`,
`Severity` and the public catalog; `parseCodeowners`, `loadCodeowners`,
`ownersOf`; `isGeneratedByMarker`; `OwnershipError`. A test pins this exact
list.

## Loading and resolution

Each step runs only if the previous one passed.

1. **Root candidates.** Explicit (`--ownership`, `OWNERSHIP_CONFIG`) must exist.
   Then `./.ownership.yml` and `./docs/.ownership.yml`. None present →
   `resolveOwnership` returns `null`. Two present → error naming both.
2. **Git work tree.** Checked only when a root file exists, with
   `git rev-parse --is-inside-work-tree`.
3. **Parse each file** with `yaml.parseDocument`, in this order: invalid YAML or
   duplicate key; `version` (received value and supported versions, `1`); top
   keys (closed list; `plugins` forbidden in an included file); `owned` and
   `generated` entries (unknown key suggests `plugins.<name>`); plugin blocks
   (name `^[a-z][a-z0-9-]*$`, value a map, otherwise suggest `{}`); literal
   paths (no `*`, `?`, `[`, `!`, no leading `/`). Each error names
   `file: owned[3].owner` and the node's line, and shows the value from the
   node's source text, never `[object Object]`.
4. **Base and confinement.** Base = directory of the file + `basePath` (only
   descends); the root's base is always the repository root. Every path is
   normalized (NFC, no `./`, no `//`) and resolved; escaping the base is an
   error showing the resolved path and the base.
5. **Includes.** Depth-first, keeping the chain to show a cycle. A directory
   include must hold exactly one of `ownership.yml`, `.ownership.yml`,
   `.ownership.<x>.yml`, `.ownership.<x>.yaml`. A missing or unreadable file
   names who included it. A second inclusion of the same file names both
   includers.
6. **Path relations.** A map keyed by lowercased path catches case collisions
   first. Then insertion into the trie catches equality and containment for
   every pair: `owned` × `owned` and `ignore` × `ignore` disjoint; `generated`
   distinct; every `generated` inside an `owned`; no `ignore` equal to or
   containing an `owned` or `generated` path. Errors name both paths and both
   files.

A file with a parse error stops at its first error. Relation errors are all
collected and sorted into one `OwnershipError`, so one run shows every collision.

**Split suggestion.** For an `owned` containment, the error lists, level by
level from the outer path to the inner one, the children of each directory
except the one that leads inward, directories with a trailing `/`, children
under an `ignore` left out, sorted, truncated at 20 with `and N more`, naming
the file that declares the outer path. It needs the repository files, so it is
computed only when `repoFiles` is passed — always in the CLI, never in the hook,
which is silent on a load error anyway.

**Pruning.** `resolveOwnership(root, { prune: [paths] })` follows only the
includes whose directory is an ancestor of a pruned path. `validate` and
`explain` never prune.

**Trie.** A node per segment, holding at most one `owned` rule (file or
directory), one `generated` rule and one `ignore` rule, each with its origin.
`findOwnedRule` and `findGeneratedRule` walk down segment by segment, in time
proportional to the path depth.

**`explainPath(config, path, ctx)`** returns a structure — rules reaching the
path, coverage, CODEOWNERS result — that the CLI only formats.
**`entriesForPlugin(config, name)`** returns
`{ path, owner, skill, source, entry, global? }` for each `owned` rule that has
`plugins.<name>`; a name outside the pattern is an `OwnershipError`.

## Repository files, CODEOWNERS and checks

**Enumeration.** `git -c core.quotePath=false ls-files -z --cached --others
--exclude-per-directory=.gitignore`, minus `git ls-files -z --deleted`, into a
sorted set. Applying only `.gitignore` leaves out `.git/info/exclude` and
`core.excludesFile`; a versioned file that a `.gitignore` would exclude still
enters through `--cached`. A submodule and a symbolic link are one entry each;
an untracked nested repository (`dir/`) is one entry at its path without the
slash. No `stat`.

**CODEOWNERS.** `loadCodeowners(root)` looks at `.github/CODEOWNERS`,
`CODEOWNERS` and `docs/CODEOWNERS`; none → `null`; more than one →
`OwnershipError` naming them. `parseCodeowners(text)` keeps, per line, the
pattern, the owners and the line number; a pattern with no owners is valid and
unsets the owner. The matcher: a `/` at the start or in the middle anchors at
the root; a pattern without `/` matches at any level; a trailing `/` means
directory; `*` and `?` do not cross `/`; `**` at the start, middle and end; a
pattern matching a directory matches everything under it. `ownersOf` takes the
last matching line; a directory path (`docs/`) is evaluated as a directory.

**Checks.** `Check = { id, name, failsWhen, run(ctx): Promise<Finding[]> }`; the
public catalog adds `command: "ownership validate --check <id>"`. Every core
finding is `error`.

- **`ownership/owner-coverage`.** One pass over the repository files: under an
  `ignore` → skip; no `owned` rule → finding on the file, whose fix names the
  ownership file with the deepest base; otherwise count it on the rule. Then
  every `owned` rule with a zero count is a finding on the entry's line,
  saying "does not exist" or "all its files are ignored", told apart by a
  second count that includes ignored files.
- **`ownership/codeowners-match`.** No CODEOWNERS → nothing. For each `owned`,
  `ownersOf` of the declared path: `unmatched` → finding; declared owner absent
  from the line (case-insensitive) → finding naming the line number and its
  owners. Both point at the entry.
- **`ownership/generated-drift`.** Commands run in a pool of `--jobs` (default
  `os.availableParallelism()`), with `shell: true` and `cwd` at the repository
  root. Byte comparison; on a difference, the finding is `path:line` of the
  first different line. A non-zero exit shows the first line of stderr, or of
  stdout when stderr is empty. A declared file that is missing is a finding on
  the `generated` entry's line. The fix is always `<command> > <path>`. Then,
  for every repository file outside `generated` and `ignore`, `lstat` (regular
  files only, so links and submodules are left out) and read 512 bytes;
  `isGeneratedByMarker(content)` looks for `generated: do not edit`,
  case-insensitive, in the first line within the first 512 bytes. A hit is a
  finding whose fix is to declare it in `generated[]`.

**Ordering.** By file, then line (no line first), then `checkId`, then message,
applied after every check has run, so it does not depend on `--jobs`.

## CLI

`node:util.parseArgs` with `strict: true`. Unknown command or option, invalid
value or missing argument → message on stderr, exit 2. No command → usage, exit
2. `-h`/`--help` → usage, exit 0. Usage lists `validate`, `explain` and `init`.

- `validate [--check <id>]… [--format text|json|github] [--jobs <n>] [--ownership <path>]`
- `explain <path> [--ownership <path>]`
- `init [--owner <@x> | --from-codeowners] [--stdout] [--ownership <path>]`

**`validate`.** No root file → `ownership: no ownership file found; nothing to
validate.`, exit 0 (in `json`, the object with empty lists and zero counts).
Otherwise: findings, then the `ownership: plugins in use:` block (every plugin
name in the root and the entries, with entry count and `global config`, sorted,
correct plurals, omitted when empty), then the final line —
`ownership: no violations found.` or `ownership: N errors, M warnings.` Exit 1
when there is an error. `text` lines are
`<file>[:<line>]  <check-id>  <severity>  <message>` followed by
`  → <fix>`. `json` is `{ findings, plugins: [{ name, entries, globalConfig }],
errors, warnings }`. `github` is
`::error file=…,line=…,title=<check-id>::<message> → <fix>` with `%`, CR and LF
escaped, then the plugins block and final line as in `text`. `--check` with an
unknown ID is exit 2 listing the valid IDs. `--jobs` that is not a positive
integer is exit 2.

**`explain`.** Fixed blocks, `—` for what is missing:

```
path       docs/adr/0001.md
owned      docs/adr/  owner @team  skill —  (.ownership.yml:12)
           plugin living-docs: {"id-prefix":"ADR"}
generated  —
ignore     —
CODEOWNERS line 4: @team @lead — declared owner listed
```

Generated shows whether the origin is `generated[]` or the marker and, when
declared, the command. A file under an `ignore` inside an `owned` directory
shows both rules and says it is outside coverage. An uncovered path names the
ownership file with the deepest base that contains it, or says none does. A
path excluded by a `.gitignore` says so and does not evaluate coverage. Without
CODEOWNERS, it says the repository has none.

## Init

**Checks, in order:** inside a Git work tree; explicit target inside the
repository; neither the target nor any root candidate exists (no `--force`);
`--owner` and `--from-codeowners` not together; `--owner` starts with `@`;
`--from-codeowners` has a CODEOWNERS. Any failure → exit 2. Success → exit 0;
`init` never exits 1.

**Modes.** "Root children" are the first level of the repository files,
directories with a trailing `/`, sorted. The target path is added to the
repository files before deriving.

- **Skeleton** (no option): no entries, one commented template per root child;
  when a CODEOWNERS exists, the output mentions `--from-codeowners`.
- **Single owner** (`--owner @x`): one entry per root child, all `@x`.
- **CODEOWNERS** (`--from-codeowners`): recursive from each root child. A node
  becomes an entry when every repository file under it has the same owner set
  (case-insensitive) by `ownersOf` **and** `ownersOf` of the node's own path
  returns that set; otherwise descend. The entry's owner is the first of the
  effective line; the others go in a comment on the entry
  (`# CODEOWNERS line 12 also lists @b @c`). A file without an effective line
  gets no entry and is counted. Paths differing only in case are commented out
  and listed in the output.

**Rendering.** Hand-written, not the `yaml` serializer, so the output is stable
byte for byte: the `# yaml-language-server: $schema=<url>` comment,
`version: 1`, entries in order with owners in double quotes, and the marker
files in a commented `generated:` block with `command:` to fill. No `ignore:`,
`plugins:` or `include:`. A test loads the result of all three modes without a
load error.

**Output.** The file written, the number of entries, the number of files
without an owner, and the next step (`ownership validate`). In skeleton mode,
and whenever files are left without an owner, it warns that the repository must
be declared in `owned` and that `validate` fails on purpose until then. With
`--stdout`, the file goes to stdout, the summary to stderr, and nothing is
written.

## Hook `generated-guard`

`hooks.json` registers `PreToolUse` with matcher
`Edit|Write|MultiEdit|NotebookEdit`. `run-hook.sh`: no `node` → exit 0; uses
`timeout 5` when present, and the process also ends itself after 5 s with an
`unref` timer, since macOS has no `timeout`; any output that is not valid JSON
is dropped; always exit 0.

1. Take the path from `file_path` (or `notebook_path`); convert it to
   repository-relative against `CLAUDE_PROJECT_DIR` and, when set,
   `OWNERSHIP_HOST_ROOT`, comparing the prefix case-insensitively and
   normalizing backslashes. Outside the roots → silence.
2. Resolve the real path — `realpath` of the file, or of its parent when the
   file does not exist — and convert it the same way. Both paths are judged; a
   real path outside the roots is ignored.
3. `resolveOwnership` pruned by both paths; `null` or any error → silence.
4. Either path matches a `generated` rule → deny, naming the origin
   (`file:line`) and the command.
5. Otherwise, the current file carries the marker → deny, asking to declare it
   in `generated[]`.
6. Otherwise, a Write whose `content` carries the marker → deny, asking to
   declare the path in `generated[]` and produce it with `<command> > <path>`.

The decision is `hookSpecificOutput.permissionDecision: "deny"` with the reason.

## Slash command `/ownership:init`

`plugin/commands/init.md` scripts the agent:

1. Ask which mode to use; offer `--from-codeowners` when a CODEOWNERS exists.
   Never pick the mode alone.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" init …` — the only way the
   file is created.
3. When files are left without an owner, or the human wants to split a single
   owner, propose a split into disjoint `owned` entries from the root children
   and the repository structure, ask the owner of each path, never invent one,
   and edit only after an explicit yes.
4. Never create or change the CODEOWNERS; show which paths would make
   `codeowners-match` fail.
5. Finish with
   `ownership validate --check ownership/owner-coverage --check ownership/codeowners-match`
   and show the result.

The text does not point inside this repository.

## Distribution

`plugin/package.json`: `@esliph/ownership`, version `0.1.0`, `type: module`,
Node ≥ 24, exports `development → ./src/index.ts`, `default → ./dist/index.js`,
`files: [dist, ownership.schema.json]`, `bin: { ownership: ./dist/cli/index.js }`,
`prepack: tsc -p ../tsconfig.build.json`, dependency `yaml`. `plugin/dist/` is
ignored by Git. Inside the plugin, everything runs from TypeScript with type
stripping.

## Testing

- `node --test` over TypeScript; `test/` mirrors `src/`. Test names describe
  behavior and cite no ID.
- A helper builds temporary Git repositories (files, optional `git add`,
  optional CODEOWNERS).
- The CLI is tested by spawning it and comparing exact output; the hook by
  spawning `run-hook.sh` with a payload (on Windows, Git for Windows' bash).
- The JSON Schema is checked against a corpus of valid and invalid fixtures
  with `ajv` (dev only), and the same corpus goes through the loader: both must
  agree on what the schema can express.
- Performance — `validate --check ownership/owner-coverage` under 2 s on
  100,000 files — is a separate `perf` task, run in CI but not in `check`,
  because building the fixture is slow.
- Distribution: `npm pack`, install the tarball, import the exact export list
  and run the `bin`; simulate the plugin cache (copy the versioned files of
  `plugin/`, `npm ci`, run the hook); `run-hook.sh` is versioned as `100755`;
  shipped files mention no `REQ-` ID, no `docs/` path and no path of this
  repository.

## Repository changes

1. **Specification.** `plugins/ownership/docs/requirements/ownership.md`: the
   English translation with the amendments above.
2. **Marketplace.** An entry in `.claude-plugin/marketplace.json` with
   `source: ./plugins/ownership/plugin`; the row of the root `README.md`
   rewritten (no code→doc trigger); an `Added` entry in the root
   `CHANGELOG.md`; the plugin's own `README.md` and `CHANGELOG.md`. The README
   documents the schema comment, that plugin names are not checked and the
   plugins block makes typos visible, that global and entry blocks are never
   merged, and that generators run in parallel.
3. **Toolchain and CI.** The plugin `Spurfile` (`install`, `test`, `typecheck`,
   `lint`, `lint-check`, `format`, `format-check`, `perf`, `check`); the root
   `Spurfile` with `PLUGINS="ownership"` and `install`, `plugins`, `validate`
   (the plugin's CLI over the repository), `check`;
   `.github/workflows/plugin-ownership.yml` on Node 24 running `check`, `perf`
   and the repository `validate`.
4. **Dogfooding.** The root `.ownership.yml` comes from
   `ownership init --from-codeowners`; its `plugins/ownership/` entry is then
   replaced by hand with `include: [plugins/ownership/]`, since `init` does not
   create includes. `plugins/ownership/.ownership.yml` declares the plugin's
   paths. The `CODEOWNERS` lines for paths that no longer exist
   (`docs/decisions/adr/`, `docs/open-decisions.md`, `docs/requirements/`,
   `docs/definition-of-done.md`, `docs/ids-retired.txt`) are removed;
   `docs/superpowers/` stays, since it holds this design. Done when
   `./spur validate` passes.
5. **`CLAUDE.md` and `CONTRIBUTING.md`.** Remove dead references without adding
   policy.
   - Removed: artifact IDs (`RN-0010`, `ADR-0037`, …),
     `docs/definition-of-done.md`, `DA` and `/open-decision`, frozen ADRs,
     `watches` and the `watch-reminder`/`commit-guard` hooks, `TDR` and
     `/debt`, `last-reviewed`, `audience: external`, the
     `working-agreements-keeper` skill, the dead rows of "Where the truth
     lives".
   - Kept without the mechanism that is gone: the rule comes before the code
     (if it is missing, stop and ask); a change visible to consumers travels
     with a CHANGELOG entry or `Changelog: none — <reason>`; text for outside
     readers carries no ID; what a plugin ships does not point inside the
     repository (enforced by the distribution test); a generated artifact is
     not edited by hand (`generated-guard`, `generated-drift`).
   - Changed: document ownership is enforced by `owner-coverage` and
     `codeowners-match`; tests do not cite IDs; commits use
     `type(scope): subject`.
