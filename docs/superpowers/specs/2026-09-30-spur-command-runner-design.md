# Spur as the command runner — design

The commands of this repository live in three places that must agree by hand:
the first `bash` block of `CONTRIBUTING.md` (which the `done-check` skill
executes line by line), the `scripts` of each plugin's `package.json`, and the
`run:` lines of the CI workflows. The container path adds a fourth
(`bin/dev npm test`). This spec makes [spur](https://github.com/esliph/spur) the
single place where each command is defined and the way every caller — a person,
an agent, CI — runs it.

**Nothing here is an accepted decision.** The decisions this spec requires are
listed in section 2, to be opened as `draft` and promoted by a human act.

## 1. Scope and boundary

In scope:

- The vendored runner, the root `Spurfile` and one `Spurfile` per plugin with a
  toolchain.
- Removing the `scripts` of each plugin's `package.json`.
- Every caller of those commands: `CONTRIBUTING.md`, the root `README.md`,
  `plugins/living-docs/CLAUDE.md`, the three workflows, the container path and
  the `new-plugin` skill.
- The requirement that states the contributor's toolchain.

Out of scope:

- What the plugins ship (`plugins/<name>/plugin/`). Nothing a consumer installs
  changes, so no CHANGELOG entry: the commits carry
  `Changelog: none — <reason>`.
- The hooks. The format hook formats one file and keeps calling `npx` directly;
  plugin hooks never go through the runner.
- A verified rule that a plugin has a `Spurfile`. It is a convention written in
  `CONTRIBUTING.md`, not a requirement checked by `check-marketplace.mjs`.

## 2. Decisions to record

1. **A new ADR (`ADR-0039`), `draft`, at the root:** spur, vendored and pinned to
   a tag, is the repository's command runner. It records the alternatives (npm
   scripts, make, just, Task), why spur (no runtime beyond `sh` and `awk`,
   verbatim argument passthrough, no dependency graph), composition by
   delegation because spur has no `include`, the `Spurfile` as the owner of each
   plugin's commands, and the consequence: a POSIX shell joins the toolchain —
   on Windows, Git Bash or WSL.
2. **A revision of `RNF-0002`** (`plugins/living-docs/docs/requirements/non-functional.md`):
   the required toolchain becomes Node 24 or greater with its npm, plus a POSIX
   shell with `awk` to run `./spur`. Written through the requirements flow; the
   status is the human's call.

## 3. The runner

- `./spur` at the root: the script from the spur repository at tag `v0.3.0`,
  executable, never edited by hand. Updating it is replacing the file with the
  one from another tag, in its own commit.
- `.gitattributes` forces `eol=lf` on `spur` and on every `Spurfile`: `sh` breaks
  on CRLF, and a Windows checkout may convert them.
- `spur` is declared in `.ownership.yml` (origin and tag in the entry's comment)
  and listed in `.prettierignore`.

## 4. The Spurfiles

Spur task names accept `[A-Za-z0-9_.-]`, so a colon becomes a hyphen
(`lint:check` → `lint-check`).

**Each plugin with a toolchain** (`plugins/<name>/Spurfile`) defines, calling the
tools directly (`node`, `npx --no-install tsc`, `npx --no-install eslint`,
`npx --no-install prettier --ignore-path ../../.prettierignore`):

| Task           | Does                                              |
| -------------- | ------------------------------------------------- |
| `install`      | `npm ci`                                          |
| `test`         | the Node test runner; extra arguments pass through |
| `typecheck`    | `tsc --noEmit`                                    |
| `lint`         | ESLint with `--fix`                               |
| `lint-check`   | ESLint without `--fix`                            |
| `format`       | Prettier with `--write`                           |
| `format-check` | Prettier with `--check`                           |
| `check`        | `test`, `typecheck`, `lint-check`, in that order  |

The `install` of living-docs runs the core's `install` first
(`spur -C ../ownership install`): the dependency by path (`TDR-0003`) is written
where it applies. The `scripts` of both `package.json` files are removed.

**The root `Spurfile`** delegates; the plugin order is explicit in the preamble
(`PLUGINS="ownership living-docs"`), never a glob:

| Task              | Does                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `install`         | each plugin's `install`, in order                                     |
| `plugins`         | each plugin's `check`, in order                                       |
| `validate [base]` | `ownership validate` then `living-docs validate`, with `--base` when given |
| `marketplace`     | `check-marketplace.mjs` and its tests                                 |
| `check [base]`    | `install`, `plugins`, `validate`, `validate <base>` when given, `marketplace` |

## 5. Callers

- **`CONTRIBUTING.md`, section "The environment":** the first `bash` block
  becomes `./spur install`, `./spur plugins`, `./spur validate`,
  `./spur validate origin/master`, `./spur marketplace`. The `done-check` skill
  reads that block and needs no change in logic. The container block becomes
  `bin/dev ../../spur <task>` — the container mounts the whole checkout and the
  alpine image has `sh` and `awk`. A new paragraph under "Adding a plugin"
  states the convention: a plugin with a toolchain has a `Spurfile` with the
  tasks of section 4, and the root `Spurfile` lists it in `PLUGINS`.
- **The `new-plugin` skill:** points to that convention instead of repeating it.
- **Workflows:** `plugin-ownership.yml` and `plugin-living-docs.yml` run the
  plugin tasks (`../../spur install`, `../../spur check`, or one step per task
  to keep failures attributable); the container job runs
  `bin/dev ../../spur test`; `marketplace.yml` runs `./spur validate`,
  `./spur validate <base sha>` and `./spur marketplace`.
- **Root `README.md` and `plugins/living-docs/CLAUDE.md`:** their toolchain
  blocks point to the tasks.
- **`.claude/hooks/format-ts.sh`:** only the comment that mentions "the scripts"
  is corrected.

## 6. Risks checked before the plan

A throwaway spike, not kept, answers:

1. Does spur's recursion guard (`SPUR_STACK`) flag a root `install` calling a
   plugin `install` of the same name? If it does, the root tasks take distinct
   names.
2. Does `node --test "test/**/*.test.ts"` still receive the glob unexpanded, so
   Node expands it and not `sh`?
3. Does `./spur` run under this machine's Git Bash and inside the alpine
   container?

## 7. Verification

- `./spur check origin/master` is green locally.
- For each task, `spur -n <task>` is compared side by side with the command it
  replaces; no step disappears in translation.
- The PR's workflows pass and run the same steps as before.
