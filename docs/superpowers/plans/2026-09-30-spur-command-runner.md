# Spur as the Command Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the vendored `./spur` the single place where each command of this repository is defined, and the way a person, an agent and CI run it.

**Architecture:** `./spur` (one POSIX sh file from the esliph/spur repository, pinned to a tag) sits at the root. Each plugin with a toolchain owns its commands in `plugins/<name>/Spurfile`; the root `Spurfile` only delegates to them in an explicit order. Every caller — `CONTRIBUTING.md`, `README.md`, `plugins/living-docs/CLAUDE.md`, the workflows, the container path — runs tasks, and the `scripts` of each `package.json` go away.

**Tech Stack:** spur (POSIX `sh` + `awk`), Node 24 (`node --test`, `tsc`, ESLint, Prettier through `npx --no-install`), GitHub Actions, Docker (`node:24-alpine`) for the optional container path.

**Spec:** `docs/superpowers/specs/2026-09-30-spur-command-runner-design.md`

### Where this plan departs from the spec, and why

- **The tag is `v0.3.1`, not `v0.3.0`.** The spike of spec §6 found that spur v0.3.0's recursion guard keyed `SPUR_STACK` by task name only: a root `install` calling a plugin `install`, a root `check` reaching a plugin `check`, and living-docs' `install` calling `spur -C ../ownership install` all exited 68. The human decided to fix spur first. v0.3.1 was checked on 2026-09-30: same-name delegation across Spurfiles runs, a task calling itself and a cycle across Spurfiles still exit 68, and it runs in `node:24-alpine`.
- **Spike answers 2 and 3 are "yes".** `node --test "test/**/*.test.ts"` receives the glob unexpanded through spur, and `./spur` runs under this machine's Git Bash and inside `node:24-alpine`.
- **Test arguments go *before* the glob.** Node ignores test-runner options placed after the file pattern: `node --test "test/**/*.test.ts" --test-name-pattern x` runs every test (211 in ownership), while `node --test --test-name-pattern x "test/**/*.test.ts"` filters (40). The plugin `test` task puts `"$@"` first.
- **ADR-0039 overrides one clause of the accepted ADR-0036** ("a private project `package.json` that … holds the development dependencies, the scripts and the development lockfile"). ADR-0036 is frozen and is not edited; ADR-0039 names the clause it replaces, as ADR-0036 itself did for the ADRs it moved.

## Global Constraints

- Runner: `./spur` at the root, the file from https://github.com/esliph/spur at tag `v0.3.1`, versioned executable (`100755`), never edited by hand; updating it is replacing the file from another tag, in its own commit.
- `.gitattributes` forces `eol=lf` on `spur` and on every `Spurfile`.
- `spur` is declared in `.ownership.yml` (origin and tag in the entry's comment) and listed in `.prettierignore`.
- Task names use `[A-Za-z0-9_.-]`; a colon becomes a hyphen (`lint:check` → `lint-check`).
- Plugin Spurfiles call the tools directly: `node`, `npx --no-install tsc`, `npx --no-install eslint`, `npx --no-install prettier --ignore-path ../../.prettierignore`.
- Plugin tasks: `install`, `test`, `typecheck`, `lint`, `lint-check`, `format`, `format-check`, `check` (= `test`, `typecheck`, `lint-check`, in that order).
- Root tasks: `install`, `plugins`, `validate [base]`, `marketplace`, `check [base]`. The plugin order is `PLUGINS="ownership living-docs"` in the preamble, never a glob.
- **No test targets the runner or a Spurfile.** spur and the Spurfiles only centralize commands; running them — locally and in CI — is what exercises them.
- The hooks never go through the runner; `.claude/hooks/format-ts.sh` keeps calling `npx` and only its comment changes.
- Nothing under `plugins/<name>/plugin/` changes. No CHANGELOG entry: every commit carries `Changelog: none — <reason>`.
- A skill writes `draft`; accepting ADR-0039 and the status of RNF-0002 are the human's call.
- Everything versioned is English. Commit subjects are `type(ID): subject`; commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- The root `README.md` is `audience: external`: no artifact ID in it.
- Node 24 or greater.

## Review Focus

No test pins these, by decision: they are what a reviewer looks at in the Spurfiles and what Task 7's run shows once.

1. **Extra arguments to a plugin's `test`** (`../../spur test --test-name-pattern owner`) filter the run — `"$@"` sits before the glob.
2. **A plugin failing in the middle of a root delegation** stops the run there with its exit code: the delegation is plain lines under `set -e`, never inside a condition or behind `|| true`.
3. **Same-name delegation** (root `install` → plugin `install`, living-docs `install` → core `install`, root `check` → plugin `check`) runs without `recursion detected`.
4. **A Windows checkout** keeps `spur` and every `Spurfile` in LF (`.gitattributes`).
5. **The container path** (`bin/dev ../../spur test`) runs the same tests as the host.

---

### Task 1: Record the decisions — ADR-0039 (draft) and the revision of RNF-0002

**Files:**
- Create: `docs/decisions/adr/ADR-0039-spur-is-the-repository-command-runner.md`
- Modify: `plugins/living-docs/docs/requirements/non-functional.md` (section `RNF-0002` and `last-reviewed`)

**Interfaces:**
- Consumes: nothing.
- Produces: the IDs `ADR-0039` and `RNF-0002` that the commits of Tasks 2–7 cite.

- [ ] **Step 1: Write ADR-0039 through the ADR skill**

Invoke the `living-docs:adr` skill (`/adr`) to create ADR-0039 as `draft`. Confirm first that `ADR-0039` is free: `grep -rl "id: ADR-0039" docs plugins/*/docs` prints nothing. Give the skill this content; keep whatever frontmatter fields its template adds, but the body and these values must survive:

```markdown
---
id: ADR-0039
title: spur, vendored and pinned to a tag, is the repository's command runner
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-30
relates-to: [ADR-0036, RNF-0002, TDR-0003, ADR-0016]
supersedes: null
superseded-by: null
---

# ADR-0039 — spur, vendored and pinned to a tag, is the repository's command runner

## Context

The commands of this repository live in places that must agree by hand: the
first `bash` block of `CONTRIBUTING.md`, which the local Definition of Done run
executes line by line; the `scripts` of each plugin's project `package.json`;
the `run:` lines of the workflows; and the container path (`bin/dev npm test`).
A command changed in one place and not in the others is found by CI, or not at
all. `ADR-0036` gave each plugin its own toolchain and left the root with none,
so there is no root place where a command could be defined once.

## Alternatives considered

1. **npm scripts.** Discarded: they exist only for a Node plugin and there is no
   root `package.json` (`ADR-0036`), so the root commands would stay in prose.
   Extra arguments land after the script's own, where `node --test` ignores
   options that follow the file pattern.
2. **make.** Discarded: a build system used as a task runner — the timestamp
   graph is dead weight, each recipe line runs in its own shell, and there is no
   argument passthrough.
3. **just or Task.** Discarded: a binary per platform to install on every
   machine, CI runner and container image, for features (parameters, a
   dependency graph) these commands do not need.
4. **spur, vendored.** Chosen: one POSIX `sh` script that needs only `sh` and
   `awk`, committed at the root, so whoever clones runs `./spur <task>` with
   nothing to install; it passes arguments verbatim as `"$@"` and has no
   dependency graph.

## Decision

- `./spur` at the root is the spur runner, copied from its repository at a tag
  and never edited by hand. Updating it is replacing the file with the one from
  another tag, in its own commit. The pinned tag must tell a task of one
  Spurfile from a task of the same name in another: the delegation below
  depends on it, and v0.3.0 did not.
- Each plugin with a toolchain owns its commands in `plugins/<name>/Spurfile`,
  calling its tools directly. The root `Spurfile` owns no tool call of a plugin:
  it delegates (`spur -C plugins/<name> <task>`), in an order written in its
  preamble, because spur has no `include`.
- Every caller runs tasks: people, the agent's local Definition of Done run, the
  workflows and the container path.
- The runner and the Spurfiles only centralize commands: no test checks them.
  Running the tasks, locally and in CI, is what exercises them.
- This replaces one clause of `ADR-0036`: the private project `package.json` no
  longer holds the scripts. It keeps the development dependencies and the
  development lockfile. `ADR-0036` is not edited.
- The hooks never go through the runner: a hook calls `node` (or `npx`)
  directly, on every tool call, where a shell layer would only add latency and
  a way to fail.

## Consequences

### What we gain

One definition per command. `./spur --list` answers what can be run, from the
root or from a plugin project, and CI runs exactly what a person runs. A plugin
that is not Node gets the same interface as the ones that are.

### What we accept to lose

A POSIX shell with `awk` joins the contributor's toolchain — on Windows, Git
Bash or WSL; `./spur` does not run from PowerShell. spur has no dependency
graph, so a task can run twice: the root `install` installs the core, and
living-docs' `install` installs it again because it depends on it by path
(`TDR-0003`). A runner in the repository is one more file to keep current.
```

Expected: the file exists with `status: draft`. Do not change the status afterwards — accepting is a human act.

- [ ] **Step 2: Revise RNF-0002 through the requirements flow**

Invoke the `living-docs:requirements-keeper` skill to revise `RNF-0002` in `plugins/living-docs/docs/requirements/non-functional.md`. The revision it must produce (title unchanged):

```markdown
## RNF-0002 — The toolkit runs on the host's Node, with no build step in the checkout

- **status:** active
- **relates-to:** ADR-0015, ADR-0025, ADR-0039
- **out of scope:** `git`; the optional containerized path of `RNF-0006`, which is an alternative and not a requirement; how the toolkit reaches the repository of whoever consumes it (`DA-0003`); the published package, which is compiled on `prepack` (`ADR-0025`) and is not what runs from the checkout; and the hooks, which run `node` directly and never the command runner

Node 24 or greater with the npm that comes with it, and a POSIX shell with
`awk` to run the command runner vendored at the repository root (`./spur`), are
the only toolchain required of whoever works on the toolkit — on Windows, Git
Bash or WSL provides the shell. `../../spur install`, run from the plugin
project (`plugins/living-docs/`), installs the dependencies with `npm ci` —
after the core's project (`plugins/ownership/`) while the toolkit depends on it
by path; `node` runs the TypeScript source straight from the checkout, with no
compiled artifact in the middle. The package published on npm is compiled on
`prepack` — that compilation exists only inside the tarball and never reaches a
development checkout.
```

The status line is the human's call: if the skill proposes anything other than keeping `active`, stop and ask. Set `last-reviewed: 2026-09-30` in that file's frontmatter only.

- [ ] **Step 3: Validate**

Run (repository root, Git Bash):
```bash
node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate
node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate
```
Expected: both exit 0.

- [ ] **Step 4: Commit, one per record**

```bash
git add docs/decisions/adr/ADR-0039-spur-is-the-repository-command-runner.md
git commit -m "docs(ADR-0039): spur, vendored and pinned to a tag, is the command runner (draft)" -m "Records the choice and the alternatives (npm scripts, make, just, Task), composition by delegation, and the clause of ADR-0036 it replaces: the project package.json no longer holds the scripts. Draft; acceptance is a human act." -m "Changelog: none — a decision record; nothing a plugin ships changes." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add plugins/living-docs/docs/requirements/non-functional.md
git commit -m "docs(RNF-0002): the toolchain includes a POSIX shell with awk to run ./spur" -m "Follows ADR-0039: dependencies come in through ../../spur install, and the hooks stay outside the runner." -m "Changelog: none — a requirement of whoever works on the toolkit, not of whoever installs it." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Vendor the runner

**Files:**
- Create: `spur` (downloaded, never written by hand)
- Modify: `.gitattributes`, `.prettierignore`, `.ownership.yml`, `CODEOWNERS`

**Interfaces:**
- Consumes: nothing.
- Produces: `./spur` at the root, executable and LF.

- [ ] **Step 1: Vendor the runner**

From the repository root (Git Bash):
```bash
curl -fsSL https://raw.githubusercontent.com/esliph/spur/v0.3.1/spur -o spur
chmod +x spur
git add spur
git update-index --chmod=+x spur
sh spur -v
git ls-files -s spur
```
Expected: `spur 0.3.1`, and the index entry starts with `100755`. Do not open the file in an editor: it is never edited by hand.

- [ ] **Step 2: Pin line endings, keep Prettier out, declare the owner**

Append to `.gitattributes`:
```gitattributes

# spur runs itself and every Spurfile through sh, which breaks on CR
# (ADR-0039). The `*` rule above already says LF; this keeps it for these files
# even if that rule changes.
spur text eol=lf
Spurfile text eol=lf
```

Append to `.prettierignore`:
```gitignore

# Vendored runner: replaced whole from its upstream tag, never reformatted (ADR-0039).
/spur
```

In `.ownership.yml`, under `# --- Owner only: outside living documentation.`, after the `.editorconfig` entry, add:
```yaml
  # Vendored from https://github.com/esliph/spur at tag v0.3.1. Replaced whole
  # from another tag, never edited by hand (ADR-0039).
  - path: spur
    owner: '@esliph/engineering'
```

In `CODEOWNERS`, after the `.prettierrc` line, add:
```text
spur @esliph/engineering
```

Then renormalize so the index holds LF: `git add --renormalize spur .gitattributes`.

- [ ] **Step 3: Owner coverage**

Run (root): `node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate`
Expected: exit 0 (`ownership/owner-coverage` sees `spur` owned in `.ownership.yml` and `CODEOWNERS`).

- [ ] **Step 4: Commit**

```bash
git add spur .gitattributes .prettierignore .ownership.yml CODEOWNERS
git commit -m "chore(ADR-0039): vendor spur v0.3.1 as the repository's command runner" -m "The file is the upstream one at the tag, executable and LF, owned in .ownership.yml and CODEOWNERS, and outside Prettier." -m "Changelog: none — repository tooling; nothing a plugin ships changes." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: One Spurfile per plugin

**Files:**
- Create: `plugins/ownership/Spurfile`, `plugins/living-docs/Spurfile`
- Modify: `plugins/ownership/.ownership.yml`, `plugins/living-docs/.ownership.yml`

**Interfaces:**
- Consumes: `./spur` from Task 2.
- Produces: in each plugin project, the tasks `install`, `test`, `typecheck`, `lint`, `lint-check`, `format`, `format-check`, `check`, run as `../../spur <task>` from the project or `./spur -C plugins/<name> <task>` from the root. Task 4 delegates to `install` and `check`; Tasks 5–7 call all of them by these names.

- [ ] **Step 1: Write `plugins/ownership/Spurfile`**

```sh
# Commands of the ownership plugin project (ADR-0039). The runner is the one
# vendored at the repository root: `../../spur <task>` from here, or
# `./spur -C plugins/ownership <task>` from the root.

install: ## install the development dependencies from the lockfile
  npm ci

## Arguments are Node test-runner options. They go before the file pattern,
## because Node ignores the options that come after it:
##   ../../spur test --test-name-pattern owner-coverage
test: ## run the tests
  node --test "$@" "test/**/*.test.ts"

typecheck: ## type-check without emitting
  npx --no-install tsc --noEmit

lint: ## lint, fixing what ESLint can fix
  npx --no-install eslint . --fix

lint-check: ## lint without fixing
  npx --no-install eslint .

format: ## format with Prettier
  npx --no-install prettier --ignore-path ../../.prettierignore --write .

format-check: ## check the formatting without writing
  npx --no-install prettier --ignore-path ../../.prettierignore --check .

check: ## tests, type-check and lint, in that order
  spur test
  spur typecheck
  spur lint-check
```

- [ ] **Step 2: Write `plugins/living-docs/Spurfile`**

```sh
# Commands of the living-docs plugin project (ADR-0039). The runner is the one
# vendored at the repository root: `../../spur <task>` from here, or
# `./spur -C plugins/living-docs <task>` from the root.

## The core's dependencies come first: living-docs depends on the core by path
## (TDR-0003), and the core's source resolves them from its own directory.
install: ## install the core's development dependencies, then this project's
  spur -C ../ownership install
  npm ci

## Arguments are Node test-runner options. They go before the file pattern,
## because Node ignores the options that come after it:
##   ../../spur test --test-name-pattern RN-0010
test: ## run the tests
  node --conditions=development --test "$@" "test/**/*.test.ts"

typecheck: ## type-check without emitting
  npx --no-install tsc --noEmit

lint: ## lint, fixing what ESLint can fix
  npx --no-install eslint . --fix

lint-check: ## lint without fixing
  npx --no-install eslint .

format: ## format with Prettier
  npx --no-install prettier --ignore-path ../../.prettierignore --write .

format-check: ## check the formatting without writing
  npx --no-install prettier --ignore-path ../../.prettierignore --check .

check: ## tests, type-check and lint, in that order
  spur test
  spur typecheck
  spur lint-check
```

- [ ] **Step 3: Declare the owner in each project**

In `plugins/ownership/.ownership.yml`, under `# --- Owner only: code and toolchain.`, after the `eslint.config.mjs` entry:
```yaml
  - path: Spurfile
    owner: '@esliph/engineering'
```
In `plugins/living-docs/.ownership.yml`, under `# --- Owner only: code, toolchain and container.`, after the `eslint.config.mjs` entry, the same two lines. (`CODEOWNERS` already covers `plugins/ownership/` and `plugins/living-docs/` whole.)

- [ ] **Step 4: Run each plugin through its own tasks**

```bash
cd plugins/ownership && ../../spur install && ../../spur check
cd ../living-docs && ../../spur install && ../../spur check
```
Expected: both `check` runs end green (tests, then `tsc` silent, then ESLint silent); living-docs' `install` runs `npm ci` for the core, then for itself.

- [ ] **Step 5: Owner coverage, then commit**

Run (root): `node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate` — expected exit 0.

```bash
git add plugins/ownership/Spurfile plugins/living-docs/Spurfile plugins/ownership/.ownership.yml plugins/living-docs/.ownership.yml
git commit -m "chore(ADR-0039): each plugin owns its commands in a Spurfile" -m "install, test, typecheck, lint, lint-check, format, format-check and check, calling node, tsc, ESLint and Prettier directly. test puts its arguments before the file pattern, where Node reads them. living-docs' install installs the core first (TDR-0003)." -m "Changelog: none — repository tooling; nothing a plugin ships changes." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The root Spurfile

**Files:**
- Create: `Spurfile`
- Modify: `.ownership.yml`, `CODEOWNERS`

**Interfaces:**
- Consumes: the plugin tasks `install` and `check` from Task 3.
- Produces: root tasks `install`, `plugins`, `validate [base-ref]`, `marketplace`, `check [base-ref]`, run as `./spur <task>`. Tasks 5–7 call them by these names.

- [ ] **Step 1: Write `Spurfile` at the root**

```sh
# The repository's commands (ADR-0039). Each plugin with a toolchain owns its
# commands in plugins/<name>/Spurfile; this file only delegates to them. The
# order is load-bearing — the core first, while living-docs depends on it by
# path — so it is written here and never taken from a glob.
PLUGINS="ownership living-docs"

# Runs one task in every plugin, in order. `set -e` stops at the first plugin
# that fails, with its exit code.
each() {
  for plugin in $PLUGINS; do
    spur -C "plugins/$plugin" "$1"
  done
}

install: ## install every plugin's development dependencies, in order
  each install

plugins: ## run every plugin's tests, type-check and lint, in order
  each check

## Without an argument, the state of the tree. With a base ref, both validators
## also check the diff against it:
##   ./spur validate origin/master
validate: ## validate ownership, then the living documentation
  if [ -n "${1:-}" ]; then set -- --base "$1"; fi
  node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate "$@"
  node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate "$@"

marketplace: ## check the marketplace and plugin manifests, and test that check
  node .github/scripts/check-marketplace.mjs
  node --test ".github/scripts/*.test.mjs"

## What CONTRIBUTING.md runs before a change is done, in that order. With a
## base ref, the diff checks run too:
##   ./spur check origin/master
check: ## install, every plugin's checks, validation and the marketplace
  spur install
  spur plugins
  spur validate
  if [ -n "${1:-}" ]; then spur validate "$1"; fi
  spur marketplace
```

- [ ] **Step 2: Declare the owner**

In `.ownership.yml`, right after the `spur` entry added in Task 2:
```yaml
  - path: Spurfile
    owner: '@esliph/engineering'
```
In `CODEOWNERS`, after the `spur` line:
```text
Spurfile @esliph/engineering
```

- [ ] **Step 3: Run the root tasks**

From the root (Git Bash):
```bash
./spur --list
./spur validate
./spur marketplace
```
Expected: `--list` shows the five tasks with their descriptions; `validate` runs both validators and exits 0 (owner coverage included); `marketplace` prints the manifest check's success and the `node --test` summary with 0 failures.

- [ ] **Step 4: Commit**

```bash
git add Spurfile .ownership.yml CODEOWNERS
git commit -m "chore(ADR-0039): the root Spurfile delegates to the plugins in an explicit order" -m "install, plugins, validate [base-ref], marketplace and check [base-ref]. PLUGINS names the order, the core first." -m "Changelog: none — repository tooling; nothing a plugin ships changes." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Point the written callers at the tasks

**Files:**
- Modify: `CONTRIBUTING.md` (section "The environment", its container subsection, and "Adding a plugin")
- Modify: `README.md` (section "Contributing")
- Modify: `plugins/living-docs/CLAUDE.md` (section "Toolchain")
- Modify: `plugins/living-docs/test/docs/agent-contract.test.ts:21`
- Modify: `.claude/skills/new-plugin/SKILL.md` (the out-of-bounds toolchain bullet and the report bullet)
- Modify: `.claude/hooks/format-ts.sh:3-4` (comment only)

**Interfaces:**
- Consumes: the root tasks (Task 4) and plugin tasks (Task 3), by name.
- Produces: the first `bash` block of `CONTRIBUTING.md` "The environment" as exactly five `./spur` lines — the `done-check` skill executes it line by line.

- [ ] **Step 1: The agent-contract test follows the contract's new wording**

This is an existing test about `plugins/living-docs/CLAUDE.md`, not about spur: it requires the contract to point to its toolchain, and today it looks for the string `npm ci`, which the new wording no longer has. In `plugins/living-docs/test/docs/agent-contract.test.ts`, the second test's target list: replace `'npm ci'` with `'Spurfile'`:
```ts
  for (const target of ['docs/superpowers/research/2026-08-24-living-documentation-toolkit.md', 'docs/glossary.md', 'docs/charter/', 'docs/requirements/', 'Spurfile']) {
```

- [ ] **Step 2: `plugins/living-docs/CLAUDE.md`, section "Toolchain"**

Replace the section's prose and block (from `It runs on the host's` through the closing fence) with:

````markdown
It runs on the host's `node` (`RNF-0002`). Every command is a task of this
project's `Spurfile`, run by the runner vendored at the repository root
(`ADR-0039`); `../../spur --list` shows them. `install` installs the core's
dependencies first, while living-docs depends on it by path (`TDR-0003`):

```bash
../../spur install
../../spur check        # tests, type-check, lint
```
````

Keep the paragraph that follows (`The validated repository is the checkout root: …`) unchanged.

Run: `cd plugins/living-docs && ../../spur test --test-name-pattern "RN-0010"`
Expected: PASS, including `the living-docs contract points to…` and `the contract is an index, not a manual — it fits on one screen`.

- [ ] **Step 3: `CONTRIBUTING.md`, section "The environment"**

Replace the paragraph and block that open the section (from `Each plugin is a project under` through the closing fence of the first `bash` block) with:

````markdown
Each plugin is a project under `plugins/<name>/`, with its own toolchain. The
root has none. For the two current plugins, Node 24 or greater with its npm, and
a POSIX shell with `awk` to run `./spur` — on Windows, Git Bash or WSL
(`RNF-0002`). Every command is a task of `./spur`, the runner vendored at the
root (`ADR-0039`): `./spur --list` shows the root's tasks, and `../../spur --list`
from a plugin project shows that plugin's. Dependencies come in with
`./spur install`, which installs the core first while living-docs depends on it
by path:

```bash
./spur install
./spur plugins
./spur validate
./spur validate origin/master
./spur marketplace
```
````

In the next paragraph, replace `` is a command run before `npm ci` `` with `` is a command run before `./spur install` ``.

In "Optional: running living-docs through the container", replace the block with:
```bash
bin/dev ../../spur test
bin/dev ../../spur typecheck
bin/dev node --conditions=development plugin/src/cli/index.ts validate
bin/living-docs validate     # the same, through the CLI wrapper
bin/dev                      # a shell inside the container
```

- [ ] **Step 4: `CONTRIBUTING.md`, section "Adding a plugin"**

Split the paragraph that begins `A plugin in plain Markdown needs no workflow` right before `Its documents live in`, and insert between the two halves:

```markdown
A plugin with a toolchain has a `Spurfile` in its project with the tasks
`install`, `test`, `typecheck`, `lint`, `lint-check`, `format`, `format-check`
and `check` — the last running `test`, `typecheck` and `lint-check`, in that
order — each calling its tools directly; its workflow runs them through
`../../spur`. The root `Spurfile` lists the plugin in `PLUGINS`, after any
plugin it depends on. An existing plugin's `Spurfile` is the model.
```

- [ ] **Step 5: `README.md`, section "Contributing"**

Replace the block and the sentence after it with (no artifact ID — the file is for outside readers):

````markdown
```bash
./spur install
./spur plugins
```

`./spur` is the command runner committed at the root; it needs a POSIX shell
with `awk` (on Windows, Git Bash or WSL), and `./spur --list` shows every task.
`install` installs `ownership` first, since `living-docs` depends on it by path.
````

- [ ] **Step 6: The `new-plugin` skill points to the convention**

In `.claude/skills/new-plugin/SKILL.md`:
- Out of bounds bullet — replace `(package manifest, compiler and linter configuration, its CI workflow)` with ``(package manifest, compiler and linter configuration, its `Spurfile` and its line in the root one, its CI workflow)``.
- Report bullet — replace `the toolchain and the plugin's own CI workflow, as` with ``the toolchain, its `Spurfile` and the plugin's own CI workflow, as``.

Nothing else in the skill changes: the convention itself lives in `CONTRIBUTING.md`.

- [ ] **Step 7: The format hook's comment**

In `.claude/hooks/format-ts.sh`, replace lines 3–4:
```sh
# from inside its plugin project, because the scripts there pass
# `--ignore-path ../../.prettierignore` relative to plugins/<name>/.
```
with:
```sh
# from inside its plugin project, because the plugin's Spurfile passes
# `--ignore-path ../../.prettierignore` relative to plugins/<name>/ too.
```
No command in the hook changes.

- [ ] **Step 8: Check the prose and run the local Definition of Done**

Run: `cd plugins/living-docs && npx --no-install prettier --ignore-path ../../.prettierignore --check ../../CONTRIBUTING.md ../../README.md CLAUDE.md`
Expected: all files use Prettier code style. (If not, run the same with `--write` on the named files only.)

Then run each line of the new first `bash` block of `CONTRIBUTING.md`, top to bottom, from the root in Git Bash, stopping at the first failure (`origin/master` must resolve: `git rev-parse --verify origin/master`; if it does not, ask before fetching).
Expected: all five exit 0.

- [ ] **Step 9: Commit**

```bash
git add CONTRIBUTING.md README.md plugins/living-docs/CLAUDE.md plugins/living-docs/test/docs/agent-contract.test.ts .claude/skills/new-plugin/SKILL.md .claude/hooks/format-ts.sh
git commit -m "docs(ADR-0039): CONTRIBUTING, README and the living-docs contract run ./spur tasks" -m "The Definition of Done block is five ./spur lines, which the done-check skill executes unchanged. The container path runs bin/dev ../../spur <task>. Adding a plugin states the Spurfile convention, and the new-plugin skill points to it. The format hook's comment no longer mentions scripts." -m "Changelog: none — contributor documentation; nothing a plugin ships changes." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The workflows run the tasks

**Files:**
- Modify: `.github/workflows/plugin-ownership.yml`
- Modify: `.github/workflows/plugin-living-docs.yml`
- Modify: `.github/workflows/marketplace.yml`

**Interfaces:**
- Consumes: plugin tasks (Task 3) and root tasks (Task 4), by name.
- Produces: CI running the same steps as before, one step per task.

- [ ] **Step 1: `plugin-ownership.yml`**

Add to `paths`, after `'.github/workflows/plugin-ownership.yml'`:
```yaml
      # The runner every step goes through (ADR-0039).
      - 'spur'
```
Replace the four `run:` steps of the `test` job:

```yaml
      - name: Install dependencies
        run: ../../spur install

      - name: Tests
        run: ../../spur test

      - name: Type-check
        run: ../../spur typecheck

      - name: Lint
        run: ../../spur lint-check
```

- [ ] **Step 2: `plugin-living-docs.yml`**

Add to `paths`, after `'.github/workflows/plugin-living-docs.yml'`:
```yaml
      # The runner every step goes through (ADR-0039).
      - 'spur'
```

In the `test` job, replace the two install steps (`Install the core's dependencies` with its comment, and `Install dependencies`) and the three check steps with:
```yaml
      # The core's dependencies first: its source resolves them from its real
      # path. The task does both.
      - name: Install dependencies
        run: ../../spur install

      - name: Tests
        run: ../../spur test

      - name: Type-check
        run: ../../spur typecheck

      - name: Lint
        run: ../../spur lint-check
```

In `container-changes`, add to the `git diff --name-only` path list: `plugins/living-docs/Spurfile` on the line with `plugins/living-docs/bin/`, `plugins/ownership/Spurfile` on the line with `plugins/ownership/package.json`, and `spur` next to `.github/workflows/plugin-living-docs.yml` — the container job now runs through them.

In the `container` job, replace `run: bin/dev npm test` with `run: bin/dev ../../spur test`.

- [ ] **Step 3: `marketplace.yml`**

`manifests` job — replace its two steps after `setup-node` with:
```yaml
      - name: Marketplace and plugin manifests, each plugin's governance, and the tests of that check
        run: ./spur marketplace
```

`governance` job — replace the two install steps and the four validation steps with:
```yaml
      - name: Install the plugins, the core first
        run: ./spur install

      - name: Ownership and living documentation — tree state
        run: ./spur validate

      # The diff only exists with a base. On `push` there is no base, and inventing one
      # would produce findings about a change that is not this branch's.
      - name: Ownership and living documentation in the PR diff
        if: github.event_name == 'pull_request'
        run: ./spur validate ${{ github.event.pull_request.base.sha }}
```

- [ ] **Step 4: Check the YAML and run the steps locally**

Run: `cd plugins/living-docs && npx --no-install prettier --ignore-path ../../.prettierignore --check ../../.github/workflows/`
Expected: all files use Prettier code style.

Run from the root the commands the workflows now run, in their order: `./spur install`, `./spur validate`, `./spur marketplace`; then `cd plugins/ownership && ../../spur test && ../../spur typecheck && ../../spur lint-check`; then the same in `plugins/living-docs`; then `cd plugins/living-docs && bin/dev ../../spur test` (Docker running).
Expected: every command exits 0; `bin/dev ../../spur test` ends with the same pass count as the host run.

- [ ] **Step 5: Commit**

`.github/workflows/**` is watched by `docs/definition-of-done.md` and by the root `CHANGELOG.md`; `ownership/commit-guard` will ask — both reasons go in the message.

```bash
git add .github/workflows/plugin-ownership.yml .github/workflows/plugin-living-docs.yml .github/workflows/marketplace.yml
git commit -m "ci(ADR-0039): the workflows run ./spur tasks, one step per task" -m "Same checks as before: install, test, type-check and lint per plugin; the container job through bin/dev ../../spur test; the marketplace check with its tests, and both validators with and without the PR base. The runner and the plugin Spurfiles trigger the workflows and the container job." -m "Docs: none — the Definition of Done names checks, not commands, and the checks are the same." -m "Changelog: none — CI of this repository; nothing a plugin ships changes." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Remove the npm scripts and verify the translation

**Files:**
- Modify: `plugins/ownership/package.json`, `plugins/living-docs/package.json` (remove the `scripts` object)

**Interfaces:**
- Consumes: every task above.
- Produces: no `package.json` script left; every caller on `./spur`.

- [ ] **Step 1: Nothing left calls a script**

Run:
```bash
git grep -nE "npm (run|test)|lint:check|format:check" -- . ':!docs/superpowers' ':!**/CHANGELOG.md' ':!**/docs/decisions/**' ':!docs/open-decisions.md'
```
Expected: only these test fixtures, which are strings about *other* repositories or about git commands, not callers: `plugins/living-docs/test/acceptance/consumer-repo.test.ts` (`npm ci && npm test`), `plugins/living-docs/test/plugin/authoring.test.ts` (`` `npm test` ``), `plugins/ownership/test/hooks/commit-guard.test.ts` (three lines), and the two `package.json` `scripts` about to go. Any other hit is a caller Task 5 or 6 missed: fix it there before continuing.

- [ ] **Step 2: Compare each task with the script it replaces**

Before deleting, for each plugin run `../../spur -n <task>` and compare its last lines with the script:

| Script (`package.json`)                                                              | Task           | The `-n` body must end with                                                                          |
| ------------------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------- |
| `test` — `node --test "test/**/*.test.ts"` (living-docs: `--conditions=development`) | `test`         | `node --test "$@" "test/**/*.test.ts"` (living-docs: `node --conditions=development --test "$@" …`) |
| `typecheck` — `tsc --noEmit`                                                         | `typecheck`    | `npx --no-install tsc --noEmit`                                                                      |
| `lint` — `eslint . --fix`                                                            | `lint`         | `npx --no-install eslint . --fix`                                                                    |
| `lint:check` — `eslint .`                                                            | `lint-check`   | `npx --no-install eslint .`                                                                          |
| `format` — `prettier --ignore-path ../../.prettierignore --write .`                  | `format`       | `npx --no-install prettier --ignore-path ../../.prettierignore --write .`                            |
| `format:check` — `prettier --ignore-path ../../.prettierignore --check .`            | `format-check` | `npx --no-install prettier --ignore-path ../../.prettierignore --check .`                            |

And the old `CONTRIBUTING.md` block against the new one: its two plugin lines are `./spur install` + `./spur plugins` (`npm ci`, `test`, `typecheck`, `lint-check` per plugin, core first); its four `validate` lines are `./spur validate` and `./spur validate origin/master`; `check-marketplace.mjs` is in `./spur marketplace`, which also runs that script's tests, as `marketplace.yml` does. No step disappears.

Expected: every row matches. A mismatch is fixed in the Spurfile (Task 3), not here.

- [ ] **Step 3: Delete the `scripts` objects**

In both `plugins/ownership/package.json` and `plugins/living-docs/package.json`, delete the `"scripts": { … },` block (8 lines each), leaving `engines` followed directly by `devDependencies`. Nothing else changes, and the lockfiles do not change (`scripts` is not in them).

Run: `git diff --stat -- plugins/*/package-lock.json`
Expected: no output.

- [ ] **Step 4: The whole sequence, as the Definition of Done runs it**

Make sure `origin/master` resolves (`git rev-parse --verify origin/master`; ask before fetching). Then, from the root in Git Bash:
```bash
./spur check origin/master
```
Expected: exit 0 — both installs without `recursion detected`, both plugins' tests/type-check/lint (the lockfile tests read `package.json`), both validators with and without the base, and the marketplace check with its tests. Then, once, the Review Focus by use: from `plugins/ownership`, `../../spur test --test-name-pattern owner-coverage` runs far fewer tests than the full run; and from `plugins/living-docs`, `bin/dev ../../spur test` exits 0.

- [ ] **Step 5: Commit**

```bash
git add plugins/ownership/package.json plugins/living-docs/package.json
git commit -m "chore(ADR-0039): the project package.json files no longer hold scripts" -m "Each command is a task of the plugin's Spurfile, and every caller runs the task. Compared one by one with spur -n: no step was lost in translation. The development dependencies and lockfiles are unchanged." -m "Changelog: none — repository tooling; nothing a plugin ships changes." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: What is left for the human**

Report, without doing it: ADR-0039 is `draft` and waits for acceptance; the status of RNF-0002 was kept `active` (say so if the skill proposed otherwise); the PR's workflows are the last line of spec §7 and run only when the branch is pushed — push and PR only when the user asks.
