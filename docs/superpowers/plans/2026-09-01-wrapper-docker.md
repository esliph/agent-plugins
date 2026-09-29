# Docker execution wrapper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a second, optional execution path that runs any toolkit maintenance command inside the container already described by `Dockerfile` and `compose.yaml` — without taking the recording execution or the hooks off the host.

**Architecture:** A generic bash wrapper (`bin/dev`) ensures the container, ensures the dependencies and forwards `"$@"` into it. It **knows no command at all**: there is no subcommand table capable of diverging from the host's list, and it is that ignorance — verified by a test — that makes the parity exist. `bin/living-docs` stops having logic of its own and becomes a one-line delegation to `bin/dev`, which fixes the dead file that `TDR-0002` recorded. The structure is verified on every PR, on the host, without Docker; the execution is verified by a path-conditional workflow.

**Tech Stack:** bash (bash only — no `.ps1`, no `.cmd`), Docker + Docker Compose (optional, on the side of whoever chooses the path), Node 24 + `node:test` for the structure tests, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-01-wrapper-docker-design.md`

**Mandatory inputs:** `docs/decisions/adr/ADR-0015-execution-on-the-host-node.md`, `docs/decisions/adr/ADR-0003-two-roots-toolkit-and-repository.md`, `docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md`, `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §7.

---

## Global Constraints

They hold for **every** task; each task's requirements implicitly include them.

- **The toolkit runs on the host's `node`** (`RNF-0002`). The commands in this plan are `npm ci`, `npm test`, `npm run typecheck` and `node src/cli/index.ts …`, run on the host. No step in this plan requires Docker to be installed — verifying the containerized path belongs to the workflow (Task 5), not to whoever implements.
- **The rule comes before the code** (`CLAUDE.md`). `RNF-0006` and `ADR-0016` are Task 1 and nothing depends on a different order.
- **Nothing is promoted by the agent.** `RNF-0006` and `ADR-0016` are born `draft`; Constitution v3 is a written proposal, human promotion; `TDR-0002` only goes to `paid` with the person's explicit confirmation (Task 7).
- **No build step.** TypeScript runs directly, restricted to erasable syntax: no `enum`, no `namespace`, no decorators. Imports carry the `.ts` extension.
- **Bash only.** No `.ps1`, no `.cmd` (`E-4`). On Windows, invoke through Git Bash, WSL, or `bash bin/dev …` from PowerShell.
- **No executable script carries CR.** `test/plugin/manifest.test.ts` already fails CRLF in `bin/**` — the shebang breaks with `bad interpreter`. If the editor converts line endings, the test warns.
- **The execute bit comes from git's index**, not from the file system: `git update-index --chmod=+x` is what reaches whoever clones. A Windows checkout has no POSIX mode.
- **`Dockerfile`, `compose.yaml` and `.dockerignore` do not change.** They are already correct for this design.
- **Language:** identifiers, file names and IDs in English/neutral; prose and commit message in Portuguese, in the format `type(ID): subject`.

### Two CI consequences that appear in the middle of the plan

They are not surprises: they are foreseen effects, and each task says what to expect.

1. **`CI-4` starts failing between Task 5 and Task 7.** The `pay-when` of `TDR-0002` is the pattern `bin/living-docs` in the paths `README.md`, `CONTRIBUTING.md`, `docs/definition-of-done.md` and `.github/workflows/**`. When Task 6 writes the prose, the trigger is met and `node src/cli/index.ts validate` fails with _"TDR-0002 is `open` and the payment trigger has already happened"_. It is **expected**, and it is Task 7 that resolves it. No earlier task should try to silence it.
2. **The whole branch must end at Task 7** before going to review. A branch delivered at Task 6 has red CI by construction.

### A deliberate divergence from the spec, and why

`M-6` says, literally: _"In `consumer-visible-paths`, `bin/dev` is added to `bin/living-docs`"_. That cannot be done to the letter, and the reason is already locked in a test that exists today — `test/docs/release-history.test.ts`:

```ts
test('ADR-0006: the mechanism\'s two lists agree, and a test keeps them from drifting', () => {
  const gatilhos = new Set(config.consumerVisiblePaths)
  const vigiados = new Set(config.watches.filter(watch => watch.consumerVisible).map(watch => watch.code))
  assert.deepEqual([...vigiados].sort(), [...gatilhos].sort(), '…')
})
```

The two lists are compared by **textual set equality**. If `watches` goes to `bin/**` (as `M-6` also commands) and `consumer-visible-paths` stays with `bin/living-docs` + `bin/dev`, the test fails.

**What this plan does:** both lists keep `bin/**`. It is the reading that satisfies the purpose of `M-6` and the wording of `M-8` (_"covers `bin/dev`"_ — coverage, not literal equality), because the two lists are matched by glob, with `picomatch`, both in `src/config/watches.ts` and in `src/checks/ci6-changelog-required.ts`. Verified:

```
picomatch('bin/**')('bin/dev')          → true
picomatch('bin/**')('bin/living-docs')  → true
```

The side effect is positive and worth recording: a future wrapper in `bin/` is born covered without anyone remembering to add it to the two lists — the same reasoning as §2 of the spec, applied to the ownership map.

---

## File Structure

| File                                                                         | Responsibility                                                                 | Task    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------- |
| `docs/requirements/non-functional.md`                                        | `RNF-0006` is born; `RNF-0002` gains a line in _out of scope_                  | 1       |
| `docs/decisions/adr/ADR-0016-optional-containerized-execution-path.md`       | The decision, carrying `ADR-0015` instead of superseding it                    | 1       |
| `bin/dev`                                                                    | Generic wrapper: ensures the container, ensures the dependencies, forwards `"$@"` | 2    |
| `bin/living-docs`                                                            | One-line delegation to `bin/dev` — no logic of its own                         | 3       |
| `test/plugin/wrapper-docker.test.ts`                                         | Locks the delegation and the invariant of §2, on the host, on every PR         | 2, 3, 4 |
| `test/plugin/manifest.test.ts`                                               | Starts covering `bin/dev` in the CRLF sweep that already exists                | 2       |
| `docs/.ownership.yml`                                                        | `bin/**` watched in both places                                                | 4       |
| `.github/workflows/wrapper-docker.yml`                                       | Exercises the Docker path when someone touches what can break it               | 5       |
| `docs/charter/constitution.md`                                               | Principle 6 amended; `version: 3`                                              | 6       |
| `README.md`, `CONTRIBUTING.md`                                               | The two paths, host first, Docker labeled as optional                          | 6       |
| `CHANGELOG.md`                                                               | The `## [Unreleased]` entry                                                    | 6       |
| `docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md`                      | `status: paid` — the last thing to change                                      | 7       |

`docs/definition-of-done.md` **does not change**: what CI reproduces on every PR is the host, and turning the Docker path into a done criterion would create a second bar that nobody measures. `CODEOWNERS` **does not change**: it mirrors the `owner` field of the documentation artifacts, and `bin/**` is a watched path, not an artifact.

---

## Task 1: The rule and the decision

The rule comes before the code (`CLAUDE.md`). Nothing in this task touches `bin/`.

**Files:**

- Modify: `docs/requirements/non-functional.md` (adds `RNF-0006` at the end; edits the _out of scope_ line of `RNF-0002`)
- Create: `docs/decisions/adr/ADR-0016-optional-containerized-execution-path.md`

**Interfaces:**

- Consumes: nothing.
- Produces: the IDs `RNF-0006` and `ADR-0016`, cited by all the following tasks — in the tests (Task 2–4), in the script comments (Task 2–3), in the workflow (Task 5) and in the charter (Task 6).

- [ ] **Step 1: Check that the IDs are free**

No ID is recycled. `docs/ids-retired.txt` is the list of retired ones, and the highest existing ADR is `0015`.

Run:

```bash
cat docs/ids-retired.txt
ls docs/decisions/adr/
grep -n '^## RNF-' docs/requirements/non-functional.md
```

Expected: `docs/ids-retired.txt` only has comments; the last ADR is `ADR-0015-execution-on-the-host-node.md`; the last non-functional requirement is `RNF-0005`. If any of the three does not match, **stop** — the next free number is another one, and this plan needs to be corrected before proceeding.

- [ ] **Step 2: Add `RNF-0006` at the end of `docs/requirements/non-functional.md`**

Add, after the `## RNF-0005 …` section, leaving a blank separating line:

```markdown
## RNF-0006 — There is an optional containerized execution path, in parity with the host

- **status:** draft
- **relates-to:** ADR-0016
- **out of scope:** the hooks, which always run on the host (`RNF-0001`)

Whoever does not want to install Node on the host can run any toolkit
maintenance command inside a container. The set of commands that works
through that path is the same one that works on the host, and it is so because the entry
point knows no command at all: it forwards what it received. A list of
supported commands does not exist, and what does not exist does not diverge.

The recording path remains the host (`RNF-0002`): it is what CI
reproduces on every PR and what the Definition of Done measures.
```

- [ ] **Step 3: Amend the _out of scope_ line of `RNF-0002`**

In `docs/requirements/non-functional.md`, inside the `## RNF-0002 …` section, replace **exactly** this line:

```markdown
- **out of scope:** `git`, and how the toolkit reaches the repository of whoever consumes it (`DA-0003`)
```

with:

```markdown
- **out of scope:** `git`; the optional containerized path of `RNF-0006`, which is an alternative and not a requirement; and how the toolkit reaches the repository of whoever consumes it (`DA-0003`)
```

The statement of `RNF-0002` is **not rewritten** and does not change meaning: the word that carries the sentence remains _required_.

- [ ] **Step 4: Write `docs/decisions/adr/ADR-0016-optional-containerized-execution-path.md`**

Complete content of the file:

```markdown
---
id: ADR-0016
title: Optional containerized execution path, parity by delegation
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-01
relates-to: [ADR-0015, ADR-0003, RNF-0006]
supersedes: null
superseded-by: null
---

# ADR-0016 — Optional containerized execution path, parity by delegation

## Context

`ADR-0015` moved execution to the host's `node` and, in doing so, left
`Dockerfile`, `compose.yaml` and `bin/living-docs` in the repository with no
document, test or CI step invoking them — a conscious shortcut, recorded
in `TDR-0002`. The payment trigger of that debt is verifiable: when the
wrapper is taught or executed again, it must either work, or go.

There is a reason for it to work again. A machine without Node, or with Node
older than 24, is exactly the case that `ADR-0001` bought and that `ADR-0015`
declared lost. A predictable and portable environment for **maintenance** — running the
tests, the type-check, the CLI — is a real convenience for whoever develops, and the
repository already carries everything it requires.

What cannot come back is the dependence of local enforcement on the state of a
daemon. That is the core of `ADR-0015`, and it is what decides the design.

## Alternatives considered

- **Supersede `ADR-0015` and make the container the recording path again.**
  Discarded: it would reopen `ADR-0001` through the back door, and `ADR-0001` remains
  superseded for the reasons that `ADR-0015` recorded — a hook with a 5 s ceiling that
  fails open cannot depend on a daemon, under penalty of local enforcement
  silently disappearing.
- **A pair of wrappers, bash and PowerShell, with the same logic written twice.**
  Discarded: two copies of a logic diverge, and the divergence
  shows up on the machine of whoever is least able to diagnose it. `git` is already required
  by the toolkit, and Git for Windows brings bash along — on Windows you invoke through
  Git Bash, through WSL, or with `bash bin/dev …` from PowerShell.
- **Exercise the Docker path on every PR.** Discarded: it would give CI back the
  image build that `ADR-0015` took away from it, charging minutes on every PR
  to verify an optional path. The path filter costs zero on the ordinary PR
  and covers what can actually break.
- **Generalize `bin/living-docs` instead of creating `bin/dev`.** Discarded: the
  CLI wrapper has a public contract — invoking it runs the CLI — and turning it
  into a generic executor would break that contract to gain one file fewer.

## Decision

There is a second execution path, **optional**: `bin/dev` runs any
maintenance command inside the container, and `bin/living-docs` becomes a
one-line delegation to it.

**This ADR does not supersede `ADR-0015`, and the reason is one of substance, not of form.**
The core of that decision is that local enforcement cannot depend on the state of
a daemon. The hooks **never** enter the container: `plugin/hooks/run-hook.sh`
keeps invoking `node` on the host, without touching Docker. As long as that is
true, that core stays intact, and this path is an addition, not a reversal.
Recording this as a supersession would say that `ADR-0015` stopped holding — and it
holds, in full.

The parity between the two paths is not kept by discipline: `bin/dev` has no
subcommand, has no table of supported commands, does not validate `argv` and does not translate
anything. A list of commands that work on Docker cannot diverge from the host's list
because that list is not written anywhere. A new maintenance command
starts working on both paths in the same commit that creates it.

`ADR-0003` is not touched. The two roots remain distinct and remain coming from the
same sources: inside the container they arrive through an environment variable of
`compose.yaml`, never through the working directory.

## Consequences

### What is gained

A machine without Node, or with old Node, becomes able again to run the tests, the
type-check and the CLI — which was precisely what `ADR-0015` declared lost — without
local enforcement coming to depend on a daemon. `TDR-0002` is paid by
repair: the dead file works again instead of going away.

### What is accepted as lost

**The Docker daemon becomes a dependency of whoever chooses that path**, and the
first invocation builds an image, which is not fast.

**I/O on a bind mount of a Windows path is slow**, and this repository lives on
OneDrive, which aggravates it. `bin/dev npm test` is noticeably slower than
`npm test` on the host. That does not invalidate the path; it invalidates the idea that it be
the default, and it is one more reason for the documentation to teach the host first.

**One more public execution path to maintain**, with deliberately partial CI
coverage: the workflow that exercises it fires on a path filter,
so a breakage caused by something outside the watched list only shows up the next time
someone touches that list.
```

- [ ] **Step 5: Run the tests and the validation**

Run:

```bash
npm test
npm run typecheck
node src/cli/index.ts validate
```

Expected: everything passes. In particular, `CI-2` resolves `RNF-0006`, `ADR-0016`, `ADR-0015` and `ADR-0003`; `CI-1` accepts the frontmatter of the new ADR; `CI-3` does not demand citation by a test, because `RNF-0006` is born `draft` and coverage by citation is only required of an `active` requirement.

If `CI-8` complains about a broken link, the cited target is wrong — check the ADR's file name.

- [ ] **Step 6: Commit**

```bash
git add docs/requirements/non-functional.md docs/decisions/adr/ADR-0016-optional-containerized-execution-path.md
git commit -m "docs(RNF-0006): records the optional containerized execution path and the decision ADR-0016, which carries ADR-0015 without superseding it

Docs: none — the rule and the decision are themselves the owning doc of this change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 2: `bin/dev` — the generic wrapper

**Files:**

- Create: `bin/dev`
- Create: `test/plugin/wrapper-docker.test.ts`
- Modify: `test/plugin/manifest.test.ts:147` (the CRLF sweep starts covering `bin/dev`)

**Interfaces:**

- Consumes: `RNF-0006` and `ADR-0016` (Task 1), cited in the comments and in the tests.
- Produces: the contract of `bin/dev` — `bin/dev <command> [args…]` runs `<command>` inside the container with working dir `/opt/living-docs`, and `bin/dev` with no arguments opens an interactive `bash`. The command's exit code is the wrapper's exit code. The environment variable `LIVING_DOCS_CONTAINER` chooses the container, with `esliph-living-docs` as the default. Task 3 depends on this contract.

- [ ] **Step 1: Write the first two structure tests**

Create `test/plugin/wrapper-docker.test.ts`. In this task it is born with **two** tests; the third arrives in Task 4.

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const ROOT = toolkitRoot()

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8')
}

/**
 * The execute bit comes from git's index, not from the file system: a
 * Windows checkout has no POSIX mode, and what reaches whoever clones is the
 * versioned mode. Same choice as `test/plugin/manifest.test.ts`.
 */
function gitMode(relative: string): string {
  const entry = execFileSync('git', ['ls-files', '-s', '--', relative], { cwd: ROOT, encoding: 'utf8' })
  return entry.split(/\s+/)[0] ?? ''
}

test('RNF-0006: bin/dev is executable and enumerates no command', () => {
  assert.equal(gitMode('bin/dev'), '100755', 'bin/dev must be versioned as executable')

  const wrapper = source('bin/dev')

  assert.match(wrapper, /"\$@"/, 'the wrapper forwards the arguments it received')
  assert.match(wrapper, /exec\s+docker\s+exec/, 'the command replaces the wrapper — that is how the exit code is the command\'s')

  // The invariant of spec §2, verified instead of promised: a subcommand
  // table is exactly what cannot exist here, because it is what would
  // diverge from the host's list.
  assert.doesNotMatch(wrapper, /\bcase\s+"?\$\{?[1@]/, 'subcommand table: the list that diverges from the host starts like this')
  assert.doesNotMatch(wrapper, /src\/cli\/index\.ts/, 'bin/dev does not know the CLI — the one that knows it is bin/living-docs')
})

test('RNF-0006: bin/dev derives the root from its own path and respects LIVING_DOCS_CONTAINER', () => {
  const wrapper = source('bin/dev')

  assert.match(wrapper, /LIVING_DOCS_CONTAINER:-esliph-living-docs/, 'the container name comes from the environment, with the default that bin/living-docs already publishes')
  assert.match(wrapper, /BASH_SOURCE\[0\]/, 'the repository root comes from the script\'s own path (ADR-0003), never from the working directory')
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test "test/plugin/wrapper-docker.test.ts"`

Expected: FAIL. Both die before any assertion, at the `readFileSync` of `bin/dev` — `ENOENT: no such file or directory`. That is expected: the file does not exist yet.

- [ ] **Step 3: Write `bin/dev`**

Complete content of the file:

```bash
#!/usr/bin/env bash
# Optional containerized execution path (RNF-0006, ADR-0016). Runs
# any maintenance command inside the container described by compose.yaml.
#
# This wrapper knows no command at all: it has no subcommand, does not validate argv and
# does not translate anything. It is that ignorance that makes parity with the host exist without
# a list of supported commands to maintain — the list does not exist.
#
# The recording path remains the host's node (RNF-0002, ADR-0015), and the
# hooks never pass through here: plugin/hooks/run-hook.sh invokes node directly.
set -euo pipefail

CONTAINER="${LIVING_DOCS_CONTAINER:-esliph-living-docs}"

# One level above bin/ — same derivation that plugin/hooks/run-hook.sh does with
# two levels, because that script is deeper (ADR-0003: the root comes from the
# path of the file itself, never from the caller's working directory).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Ensure the container. The first time this builds the image; on later ones it is
# almost instantaneous. The side effect is deliberate: in exchange for it the
# "stopped container" failure mode goes away, which returned exit 2 doing nothing.
if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" != "true" ]; then
  docker compose -f "$ROOT/compose.yaml" up -d >&2
fi

# `-t` only when stdin is a terminal: with a pipe on the input, docker exec
# refuses the allocation. The expansion with `+` is what keeps the empty array
# compatible with `set -u`.
TTY=()
if [ -t 0 ]; then TTY=(-t); fi

# With no arguments, the wrapper is the workspace: a shell inside the container.
if [ "$#" -eq 0 ]; then
  exec docker exec -i ${TTY[@]+"${TTY[@]}"} -w /opt/living-docs "$CONTAINER" bash
fi

# The bootstrap happens inside the same exec, with no extra round-trip: compose.yaml
# mounts node_modules as a named volume and nothing populates it, so even with the
# container up the CLI would break for lack of `yaml` and `picomatch`.
#
# The `>&2` is not cosmetic: the output of npm ci cannot contaminate the stdout of a
# command whose output someone reads.
#
# The working dir is /opt/living-docs because that is where npm makes sense. The CLI keeps
# validating /workspace because LIVING_DOCS_REPO_ROOT comes from compose.yaml — the
# separation of ADR-0003 keeps coming from an environment variable, never from the cwd.
exec docker exec -i ${TTY[@]+"${TTY[@]}"} -w /opt/living-docs "$CONTAINER" \
  bash -c '[ -d node_modules/yaml ] || npm ci >&2; exec "$@"' -- "$@"
```

- [ ] **Step 4: Mark the execute bit in git's index**

The test reads the versioned mode, not the file system's. On a Windows checkout, writing the file is not enough.

Run:

```bash
git add bin/dev
git update-index --chmod=+x bin/dev
git ls-files -s -- bin/dev
```

Expected: the output starts with `100755`.

- [ ] **Step 5: Add `bin/dev` to the CRLF sweep that already exists**

In `test/plugin/manifest.test.ts`, in the test `RNF-0002: no executable script carries CR`, replace **exactly** this line:

```ts
  for (const relative of ['bin/living-docs', 'plugin/hooks/run-hook.sh']) {
```

with:

```ts
  for (const relative of ['bin/dev', 'bin/living-docs', 'plugin/hooks/run-hook.sh']) {
```

- [ ] **Step 6: Run the tests to see them pass**

Run:

```bash
node --test "test/plugin/wrapper-docker.test.ts" "test/plugin/manifest.test.ts"
npm test
npm run typecheck
```

Expected: PASS on everything. If the CRLF test fails on `bin/dev`, the editor converted the line endings — rewrite the file with LF.

- [ ] **Step 7: Commit**

```bash
git add bin/dev test/plugin/wrapper-docker.test.ts test/plugin/manifest.test.ts
git commit -m "feat(RNF-0006): creates bin/dev, the generic wrapper that forwards any command into the container

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 3: `bin/living-docs` becomes a delegation

It is by repair, not by removal, that `TDR-0002` will be paid: the wrapper stops requiring a previously started container, stops exiting with code 2, and becomes invocable again.

**Files:**

- Modify: `bin/living-docs` (the whole file is replaced)
- Modify: `test/plugin/wrapper-docker.test.ts` (adds the delegation test)

**Interfaces:**

- Consumes: the contract of `bin/dev` from Task 2 — `bin/dev <command> [args…]` runs inside the container, with working dir `/opt/living-docs`.
- Produces: `bin/living-docs [args…]` runs `node src/cli/index.ts [args…]` inside the container. The public contract does not change; what changes is what happens when the container is not up.

- [ ] **Step 1: Write the delegation test**

Add to the end of `test/plugin/wrapper-docker.test.ts`:

```ts
test('RNF-0006: bin/living-docs delegates to bin/dev, with no container logic of its own', () => {
  assert.equal(gitMode('bin/living-docs'), '100755', 'bin/living-docs must remain executable')

  const wrapper = source('bin/living-docs')

  assert.match(wrapper, /\/dev\b/, 'the CLI wrapper invokes bin/dev')
  assert.match(wrapper, /node\s+src\/cli\/index\.ts/, 'and it is it, not bin/dev, that knows the CLI')

  // The test that keeps the duplication of logic from coming back: every
  // conversation with the daemon lives in bin/dev, and a second place that has it
  // is a second place to diverge.
  assert.doesNotMatch(wrapper, /docker\s+(exec|inspect|compose)/, 'duplicated container logic — it belongs to bin/dev (ADR-0016)')

  // The failure mode that TDR-0002 described: exiting 2 because the container is not
  // up. bin/dev starts the container; nobody else needs to refuse to run.
  assert.doesNotMatch(wrapper, /exit\s+2\b/, 'the missing container is no longer a failure mode (E-2)')
})
```

- [ ] **Step 2: Run the test to see it fail**

Run: `node --test "test/plugin/wrapper-docker.test.ts"`

Expected: FAIL in `RNF-0006: bin/living-docs delegates to bin/dev, with no container logic of its own`, with the message `duplicated container logic — it belongs to bin/dev (ADR-0016)` — the current file still has its own `docker inspect` and `docker exec`. The Task 2 tests keep passing.

- [ ] **Step 3: Rewrite `bin/living-docs`**

Replace the **entire** content of the file with:

```bash
#!/usr/bin/env bash
# Runs the toolkit CLI through the optional containerized path (RNF-0006).
# Delegation, not implementation: every conversation with the daemon lives in bin/dev, and
# a second place that had it would be a second place to diverge (ADR-0016).
#
# On the host, the equivalent command is `node src/cli/index.ts …`, and it is what CI
# reproduces on every PR (RNF-0002).
exec "$(dirname "${BASH_SOURCE[0]}")/dev" node src/cli/index.ts "$@"
```

No `set -euo pipefail`: the line is an `exec`, and there is nothing after it to protect.

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
node --test "test/plugin/wrapper-docker.test.ts"
npm test
npm run typecheck
```

Expected: PASS. Also check that the mode is still `100755`:

```bash
git ls-files -s -- bin/living-docs
```

Expected: starts with `100755`. If the file lost the bit, `git update-index --chmod=+x bin/living-docs`.

- [ ] **Step 5: Commit**

```bash
git add bin/living-docs test/plugin/wrapper-docker.test.ts
git commit -m "fix(RNF-0006): bin/living-docs becomes a one-line delegation to bin/dev and stops requiring a previously started container

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 4: The ownership map

**Files:**

- Modify: `docs/.ownership.yml:193` (the `watches` rule) and `:204` (the `consumer-visible-paths` list)
- Modify: `test/plugin/wrapper-docker.test.ts` (the third test)

**Interfaces:**

- Consumes: `bin/dev` (Task 2) and `bin/living-docs` (Task 3), which need to exist for the coverage to mean anything.
- Produces: `bin/**` watched in both places — which makes `HK-4`, `HK-5`, `CI-6` and `CI-7` demand `CHANGELOG.md` for any change in `bin/`. Task 6 depends on this: it is this rule that requires the `## [Unreleased]` entry.

**Read first:** the section _"A deliberate divergence from the spec, and why"_, at the top of this plan. Both lists go to `bin/**`, not to `bin/living-docs` + `bin/dev`.

- [ ] **Step 1: Write the coverage test**

Add to the end of `test/plugin/wrapper-docker.test.ts`. Note the new imports at the top of the file — add them together:

```ts
import picomatch from 'picomatch'
import { loadOwnership } from '../../src/config/ownership.ts'
import { watchesFor } from '../../src/config/watches.ts'
```

And the test:

```ts
test('RNF-0006: docs/.ownership.yml covers bin/dev in watches and in consumer-visible-paths', () => {
  const config = loadOwnership(ROOT)

  // Mechanism 1: whoever touches bin/dev brings the owning doc in the same commit.
  const matches = watchesFor(config, ['bin/dev'])
  assert.deepEqual(
    matches.map(match => match.doc),
    ['CHANGELOG.md'],
    'bin/dev is a public entry point and needs a declared owning doc',
  )
  assert.equal(matches[0]?.consumerVisible, true, 'the change is visible to whoever consumes (CI-6)')

  // The same coverage from CI-6's side, which reads the glob list.
  assert.ok(picomatch(config.consumerVisiblePaths)('bin/dev'), 'bin/dev outside consumer-visible-paths: CI-6 would not demand the CHANGELOG entry')

  // And the wrapper that already existed cannot have been dropped along the way.
  assert.ok(picomatch(config.consumerVisiblePaths)('bin/living-docs'))
})
```

- [ ] **Step 2: Run the test to see it fail**

Run: `node --test "test/plugin/wrapper-docker.test.ts"`

Expected: FAIL in `RNF-0006: docs/.ownership.yml covers bin/dev …`, with `AssertionError` on the first assertion — `watchesFor(config, ['bin/dev'])` returns `[]`, because the current rule is the literal path `bin/living-docs`.

- [ ] **Step 3: Widen the `watches` rule**

In `docs/.ownership.yml`, replace **exactly** this block:

```yaml
- code: 'bin/living-docs'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'the wrapper is a public entry point of the toolkit — changing how it is invoked changes what whoever consumes uses'
```

with:

```yaml
- code: 'bin/**'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'the wrapper is a public entry point of the toolkit — changing how it is invoked changes what whoever consumes uses'
```

The `reason` does not change: the reason written there holds equally for `bin/dev`.

- [ ] **Step 4: Widen `consumer-visible-paths`**

In the same file, in the `consumer-visible-paths` list, replace **exactly**:

```yaml
- 'bin/living-docs'
```

with:

```yaml
- 'bin/**'
```

The two lists must be the same set, word for word: `test/docs/release-history.test.ts` compares `consumer-visible-paths` with the `code` of the rules marked `consumer-visible: true` by set equality, and it is that test that keeps them from drifting.

- [ ] **Step 5: Run the tests to see them pass**

Run:

```bash
node --test "test/plugin/wrapper-docker.test.ts" "test/docs/release-history.test.ts" "test/config/ownership.test.ts"
npm test
npm run typecheck
node src/cli/index.ts validate
```

Expected: PASS on everything, and `validate` clean. If `ADR-0006: the mechanism's two lists agree` fails, Steps 3 and 4 did not write the same glob — fix it before proceeding.

- [ ] **Step 6: Commit**

```bash
git add docs/.ownership.yml test/plugin/wrapper-docker.test.ts
git commit -m "docs(RNF-0006): the watched path becomes bin/**, covering bin/dev on both sides of the mechanism

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 5: The workflow that exercises the Docker path

The tests of tasks 2 to 4 cover the **structure**, on the host, on every PR. This workflow covers the **execution**, and only when it may have broken. The two complete each other.

**Files:**

- Create: `.github/workflows/wrapper-docker.yml`

**Interfaces:**

- Consumes: `bin/dev` (Task 2) and its contract — working dir `/opt/living-docs`, `LIVING_DOCS_REPO_ROOT=/workspace` coming from `compose.yaml`.
- Produces: nothing that another task consumes. But it fulfills half of the payment trigger of `TDR-0002` (`.github/workflows/**` is one of the paths of the `pay-when`) — which Task 7 closes.

- [ ] **Step 1: Write `.github/workflows/wrapper-docker.yml`**

Complete content of the file:

```yaml
name: wrapper-docker

# A file separate from living-docs.yml on purpose: the `paths` filter of GitHub
# Actions is per workflow and not per job, and conditioning a job inside the
# existing workflow would require a third-party action for nothing (ADR-0016).
#
# The effect on the ordinary PR is zero: no image build, not one extra minute. The
# containerized path is only exercised when someone touches what can
# break it (RNF-0006).
on:
  push:
    paths: &wrapper-paths
      - 'Dockerfile'
      - 'compose.yaml'
      - '.dockerignore'
      - 'bin/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/wrapper-docker.yml'
  pull_request:
    paths: *wrapper-paths

jobs:
  wrapper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # The first invocation of bin/dev would start the container by itself (E-2). Starting
      # it here, in its own step, keeps the build time attributable: an image
      # failure does not disguise itself as a test failure.
      - name: Start the container
        run: docker compose up -d

      # Through the wrapper, what the host already runs. Neither of the two commands is written
      # inside bin/dev — that is the parity RNF-0006 states.
      - name: Tests, through the wrapper
        run: bin/dev npm test

      - name: CI-1 to CI-4, CI-7, CI-8 and CI-10 — living documentation, through the wrapper
        run: bin/dev node src/cli/index.ts validate
```

If the YAML anchor (`&wrapper-paths` / `*wrapper-paths`) is refused by the GitHub Actions parser on the first push, write the list twice, literally — the duplication is annoying but harmless, and this is not the time to spend the delivery on it.

- [ ] **Step 2: Check that the workflow is valid YAML and that the path list matches**

Run:

```bash
node -e "const {parse}=require('yaml');const {readFileSync}=require('fs');const w=parse(readFileSync('.github/workflows/wrapper-docker.yml','utf8'));console.log(JSON.stringify(w.on,null,2));console.log(w.jobs.wrapper.steps.map(s=>s.run??s.uses));"
```

Expected: `on.push.paths` and `on.pull_request.paths` come out with the same six entries plus the workflow's own file, and the steps come out as `actions/checkout@v4`, `docker compose up -d`, `bin/dev npm test`, `bin/dev node src/cli/index.ts validate`.

- [ ] **Step 3: Run the tests and the validation**

Run:

```bash
npm test
npm run typecheck
node src/cli/index.ts validate
```

Expected: PASS, and `validate` still clean. **`CI-4` does not fail here yet**: the `pay-when` of `TDR-0002` looks for the literal pattern `bin/living-docs`, and this workflow uses `bin/dev`. The trigger is met in Task 6, with the prose.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/wrapper-docker.yml
git commit -m "ci(RNF-0006): adds the path-conditional workflow that exercises the Docker path through the wrapper

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 6: The charter, the prose and the `CHANGELOG`

**Files:**

- Modify: `docs/charter/constitution.md` (principle 6, `version: 3`, amendment log)
- Modify: `CONTRIBUTING.md` (sibling block under `## The environment`)
- Modify: `README.md` (sibling block under `## Development`)
- Modify: `CHANGELOG.md` (`## [Unreleased]`: one entry in `### Added`, one in `### Changed`, and the correction of an entry that this change made false)

**Interfaces:**

- Consumes: `bin/dev` and `bin/living-docs` (Tasks 2–3), `RNF-0006` and `ADR-0016` (Task 1), and the `bin/**` rule of `watches` (Task 4), which is what requires the `CHANGELOG.md` entry.
- Produces: the payment trigger of `TDR-0002` met — the pattern `bin/living-docs` starts appearing in `README.md` and `CONTRIBUTING.md`. Task 7 depends on this.

**Expected at the end of this task:** `node src/cli/index.ts validate` **fails** with the `CI-4` finding about `TDR-0002`. Do not silence it, do not work around it: it is Task 7.

- [ ] **Step 1: Amend principle 6 of the Constitution**

In `docs/charter/constitution.md`, replace **exactly** this line:

```markdown
6. The toolkit runs on the host's Node, with no build step — verified by `test/plugin/manifest.test.ts` (`RNF-0002`) and by the workflow, which installs Node and npm and nothing else.
```

with:

```markdown
6. The toolkit runs on the host's Node, with no build step — verified by `test/plugin/manifest.test.ts` (`RNF-0002`) and by the `living-docs` workflow, which installs Node and npm and nothing else. The containerized path of `RNF-0006` is optional, and is not the recording execution.
```

The claim does not change — the recording execution is the host, and there is no build step. What the amendment does is remove the ambiguity that a second workflow, which builds an image, would create in the final clause. Every principle must keep matching `/verified by/`: `test/docs/language-and-intent.test.ts` demands this.

- [ ] **Step 2: Raise `version` to 3 and add the line to the amendment log**

In the frontmatter of the same file, replace:

```yaml
version: 2
```

with:

```yaml
version: 3
```

And update `last-reviewed` to `2026-09-01` if it is not already.

At the end of `## Amendment log`, add:

```markdown
- 2026-09-01 — v3 — Principle 6 names the `living-docs` workflow as the recording verification and declares the containerized path of `RNF-0006` optional — human, accompanying `ADR-0016`, which carries `ADR-0015` without superseding it.
```

**A charter amendment is a human act.** The agent writes the proposal and stops here: whoever promotes it is whoever asked. If you are an agent executing this plan, write the change, say out loud that it needs human approval, and move on — but do not present it as accepted.

- [ ] **Step 3: Add the sibling block to `CONTRIBUTING.md`**

In `CONTRIBUTING.md`, in the section `## The environment`, **below** the paragraph that ends in _"it is not the environment that is wrong."_ and **above** `## The cycle`, add:

````markdown
### Optional: run through the container

Whoever does not want to install Node on the machine has a second path (`RNF-0006`,
`ADR-0016`). `bin/dev` runs any maintenance command inside the container, and
starts the container by itself when it is not up:

```bash
bin/dev npm test
bin/dev npm run typecheck
bin/dev node src/cli/index.ts validate
bin/living-docs validate     # the same, through the CLI wrapper
bin/dev                      # a shell inside the container
```

It requires the Docker daemon, and the first invocation builds the image. On Windows,
invoke through Git Bash, through WSL, or with `bash bin/dev …` from PowerShell.

Two things this path is **not**. It is not the recording execution: what
CI reproduces on every PR and what the Definition of Done measures remains the host.
And it does not cover the hooks, which always run on the host (`RNF-0001`) — on a machine
without Node, local enforcement does not exist, and that is the same loss that `ADR-0015`
already declared.
````

- [ ] **Step 4: Add the sibling block to `README.md`**

In `README.md`, in the section `## Development`, **below** the line _"To contribute, see `CONTRIBUTING.md`."_, add:

````markdown
### Optional: without Node on the host

There is a second execution path, for whoever prefers a predictable environment to
installing Node (`RNF-0006`). `bin/dev` takes a command and runs it inside the
container, starting it when needed:

```bash
bin/dev npm test
bin/dev node src/cli/index.ts validate
bin/living-docs validate     # the same, through the CLI wrapper
```

The default remains the host: the bind mount is noticeably slower, and the plugin's
hooks always run on the machine's `node` — on a machine without Node, the
plugin blocks nothing.
````

- [ ] **Step 5: Write the `CHANGELOG.md` entries**

In `## [Unreleased]`, at the end of `### Added`, add:

```markdown
- `bin/dev`: optional entry point that runs any maintenance command
  inside the repository's container, starting it and installing the dependencies
  when needed — `bin/dev npm test`, `bin/dev node src/cli/index.ts validate`,
  or `bin/dev` alone for a shell. It requires the Docker daemon; the recording
  path remains the host's Node (`RNF-0006`, `ADR-0016`).
```

At the end of `### Changed`, add:

```markdown
- `bin/living-docs` stops requiring the container to be up already and stops
  exiting with code 2 when it is not: it now delegates to `bin/dev`, which starts the
  container before executing. What is invoked did not change; what happens with a
  stopped environment did.
```

- [ ] **Step 6: Fix the `### Changed` entry that this change made false**

Still in `## [Unreleased]`, in the entry that begins with _"The toolkit now runs on the host's Node"_, replace **exactly** this passage:

```markdown
container is not up. `compose.yaml`, `Dockerfile` and `./bin/living-docs`
remain in the repository, but nothing invokes them any more — recorded in `ADR-0015` and
`TDR-0002`.
```

with:

```markdown
container is not up. `compose.yaml`, `Dockerfile` and `./bin/living-docs`
remain in the repository, now as the optional execution path described
above — recorded in `ADR-0015` and `ADR-0016`.
```

The entry is still in `## [Unreleased]`, so correcting it is not rewriting published history: it is keeping the same release from asserting two contradictory things about the same file.

- [ ] **Step 7: Run the tests and the validation, and confirm the expected finding**

Run:

```bash
npm test
npm run typecheck
node src/cli/index.ts validate
```

Expected: `npm test` and `npm run typecheck` **pass**. `validate` **fails**, with a `CI-4` finding whose message is of the form:

```
TDR-0002 is `open` and the payment trigger has already happened: <file>:<line> matches `bin/living-docs`.
```

It is this finding that confirms that Task 6 did what it should. If it does **not** appear, the pattern `bin/living-docs` did not reach `README.md` or `CONTRIBUTING.md` — reread Steps 3 and 4 before proceeding.

If **any other** finding appears, it is not expected: resolve it before the commit.

- [ ] **Step 8: Commit**

```bash
git add docs/charter/constitution.md CONTRIBUTING.md README.md CHANGELOG.md
git commit -m "docs(ADR-0016): teaches the two paths with the host first, amends principle 6 to v3 and records the change in the CHANGELOG

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 7: `TDR-0002` to `paid`

**This is the last change, and it is deliberately the last.** Marking the debt as paid before the wrapper works would be recording as fact something that is not yet so.

**Files:**

- Modify: `docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md` (frontmatter only)

**Interfaces:**

- Consumes: everything. The wrapper works (Tasks 2–3), is taught (Task 6) and is executed by a workflow (Task 5).
- Produces: `validate` clean — the state in which the branch can go to review.

- [ ] **Step 1: Stop and ask for human confirmation**

`paid` is a frozen state (`FROZEN_STATUSES` in `src/docs/schema.ts`), and `CLAUDE.md` is explicit: _"You do not accept decisions. A skill writes `draft`/`open`; promoting is a human act."_

If you are an agent executing this plan, **stop here** and ask, in text, something with this content:

> `TDR-0002` is `open` and the trigger it itself declared has been met: `bin/living-docs` is taught again in `README.md` and `CONTRIBUTING.md`, and the path is exercised by `.github/workflows/wrapper-docker.yml`. The wrapper is no longer a dead file — it works, by repair and not by removal. May I mark it as `paid`?

A note about the mechanism, so you are not fooled by the silence of the hooks: `HK-3` **will not** intercept this edit. The `HUMAN_PROMOTIONS` allowlist covers `draft → accepted`, `open → resolved`, `draft → active`, `active → revoked` and `draft → published`; `open → paid` is not there. `HK-1` does not block either, because `status` is a mutable field of `TDR` and the current state is not yet frozen. The absence of a hook asking is **not** permission — the policy of `CLAUDE.md` holds the same, and it is what rules here.

Only proceed to Step 2 with the person's explicit answer.

- [ ] **Step 2: Change `status` and `last-reviewed`**

In `docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md`, in the frontmatter, replace:

```yaml
status: open
```

with:

```yaml
status: paid
```

And check that `last-reviewed: 2026-09-01` is there.

**Only the frontmatter changes.** The body of the TDR — the shortcut, why it was accepted, the trigger, the cost of continuing to owe — is the historical record of what was accepted as owed, and it remains true about the period in which the debt existed. Do not rewrite it.

The `relates-to` fields do not change either: `[ADR-0015, RNF-0002]` describes the context in which the debt was born. `ADR-0016` cites `TDR-0002` by text, not by bidirectional pair, and `CI-3` only closes pairs for `supersedes`/`superseded-by` and `revokes`/`revoked-by`.

- [ ] **Step 3: Run everything and confirm that the finding is gone**

Run:

```bash
npm test
npm run typecheck
node src/cli/index.ts validate
node src/cli/index.ts drift
node src/cli/index.ts changelog --base origin/master
node src/cli/index.ts validate --base origin/master
```

Expected: **all pass**. The `CI-4` finding about `TDR-0002` disappeared, because the debt is no longer `open`. `CI-6` is satisfied by the entries written in Task 6, and `CI-7` by the ownership map of Task 4.

If `CI-9` complains about a commit message with no cited ID, the commit of Step 4 is where that is fixed — cite `TDR-0002`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md
git commit -m "docs(TDR-0002): marks the debt as paid — the wrapper works again, by repair

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

- [ ] **Step 5: Check the Definition of Done**

Read `docs/definition-of-done.md` from end to end and check each box against what this branch did. The ones that demand human judgment — the rule-before-code order, the decision that became an ADR, nobody having erred for lack of context — are for the person to tick, not for the agent to assert.

---

## What this plan deliberately does not do

- **Does not supersede `ADR-0015`**, and does not reopen `ADR-0001`. The hooks never enter the container, and that is what guarantees the rest.
- **Does not touch `ADR-0003`.** The two roots remain distinct and remain coming from the same sources.
- **Does not resolve `DA-0003`** (how the toolkit reaches a consuming repository). Publishing an image remains a future decision.
- **Does not change `docs/definition-of-done.md`.** Docker is a convenience for whoever develops, it is not the recording verification.
- **Does not change `Dockerfile`, `compose.yaml` or `.dockerignore`.** They are already correct for this design, and that is the reason the delivery is small.
- **Does not change `CODEOWNERS`.** It mirrors the `owner` field of the documentation artifacts, and `bin/**` is a watched path, not an artifact.
- **Does not promote anything.** `RNF-0006` and `ADR-0016` are born `draft`, Constitution v3 is a written proposal and `TDR-0002` only goes to `paid` with a person's explicit answer.
