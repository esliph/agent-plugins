# Execution on the host's Node — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the toolkit's execution from the container to the host's Node and npm, and leave no living document mentioning Docker.

**Architecture:** Nothing in `src/` changes — `toolkitRoot()` and `repoRoot()` are already container-independent. What changes is who invokes: the hook wrapper now calls `node` directly, deriving the toolkit root from its own path; CI swaps `docker compose` for `actions/setup-node` + `npm ci`; and the documents, tests and fixtures that **assert** the container now assert the host. Docker survives as an orphan wrapper registered as debt.

**Tech Stack:** Node ≥ 24 (native type-stripping, no build step), npm, `node:test`, TypeScript with `tsc --noEmit`, GitHub Actions, bash.

**Spec:** `docs/superpowers/specs/2026-09-01-host-execution-design.md`

## Global Constraints

- **Today's date: `2026-09-01`.** Every `last-reviewed` and every amendment-log line created by this plan uses that date.
- **`npm ci` at the checkout root is a prerequisite of every verification** (spec §4). `node_modules/` is empty because `compose.yaml` mounts it as a named volume. No failure may be interpreted before `npm ci` has run.
- **`src/` is not touched.** No file under `src/` changes in this plan. `ADR-0003` comes out intact, without supersession.
- **`Dockerfile`, `compose.yaml`, `.dockerignore` and `bin/living-docs` stay intact** (`E-1`, spec §3). They are not deleted, not edited.
- **Historical record is not rewritten** (`E-2`): `docs/superpowers/plans/` (except this new file), `docs/superpowers/research/`, the earlier ADRs in the body and the old `CHANGELOG.md` entries stay as they are.
- **`RNF-0002` is rewritten in place, keeping the ID** (`E-3`). No `RNF-0006` is created, nothing is marked `revoked`.
- **The new ADR is born `status: draft`.** Promoting to `accepted` is a human act; `HK-3` intercepts. No task in this plan promotes a state.
- **Commit message in English, in the format `type(ID): subject`**, citing the affected ID (`CI-9`).
- **Language:** identifiers, file names and IDs in English/neutral; prose and comments in English.
- **Occurrences of "container" in `src/` that name a _collection's container file_** (`CONTAINER_REQUIRED_FIELDS`, `isContainer`, the comments in `src/checks/ci1-structure.ts`, `src/checks/ci4-staleness.ts`, `src/checks/ci10-trigger-routing.ts`, `src/docs/schema.ts`) **are a different word and stay.**
- **`CI-6` compares `<base>...HEAD`**, the whole branch diff. The `CHANGELOG.md` entry of Task 11 covers the commits of all earlier tasks that touch `plugin/**` and `.github/workflows/**` — it does not need to come before them, it needs to come **on the same branch**.

## Baseline measured on the host (2026-09-01)

Before any change, with `npm ci` already run and the `npm test` glob fixed (Task 1):

```
ℹ tests 520
ℹ pass 516
ℹ fail 4
```

The four failures, and which task closes each one:

| Failing test                                                               | File                              | Closed by                                              |
| -------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| `RF-0006: this repository's generated contract has not drifted`                 | `test/contracts/drift.test.ts:11` | Task 5 (`M-6`)                                         |
| `RNF-0003: repoRoot honors LIVING_DOCS_REPO_ROOT and does not move toolkitRoot` | `test/core/roots.test.ts:12`      | Task 2 (platform failure, not foreseen by the spec)    |
| `RNF-0003: the container declares the two roots, and they are distinct`       | `test/core/roots.test.ts:53`      | Task 2 (`M-8`)                                         |
| `RNF-0002: the wrapper exists, is executable and fails open`                  | `test/plugin/manifest.test.ts:57` | Task 3 (`M-1`/`M-8`)                                   |

`npm run typecheck`, `node src/cli/index.ts validate` and `node src/cli/index.ts changelog --base origin/master` **already pass** on the host with no change. `node src/cli/index.ts drift` fails with `The generator failed: node /opt/living-docs/src/tools/gen-checks.ts`.

## Deviations from the spec, and why

Three items enter the plan without being in the table of the eleven changes. Each is isolated in a task or in a marked step, so that it can be rejected without bringing down the rest.

1. **`package.json`: the `npm test` glob** (Task 1). Measured: `node --test 'test/**/*.test.ts'` under `cmd.exe` matches no file and exits with `ℹ tests 0` and code 0 — it passes by vacuity. §5 requires `npm test` to pass on the host; without this the proof is empty, and worse than empty: it is green.
2. **`RNF-0001`: the phrase "container down"** (Task 7). §5, proof 1, sweeps the whole of `docs/requirements/`. `RNF-0001` is there and mentions container. The table of the eleven changes only names `RNF-0002`.
3. **`plugin/skills/working-agreements-keeper/SKILL.md` and `templates/workflow.yml`** (Task 12). Neither is in the sweep list of §5, and both assert the container: the skill teaches _"never run `npm` outside the container"_ as an example of a good line, and the template installed in the consumer's repository says _"the toolkit runs in a container in its repository"_. They are living documents that come to lie. A separate task, and the last one.

## File structure

**Created:**

| File                                                          | Responsibility                                                                          |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `docs/decisions/adr/ADR-0015-execution-on-the-host-node.md`   | The decision that supersedes `ADR-0001`, preserving its non-Docker half                 |
| `docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md`       | The shortcut of `E-1`: `bin/living-docs` with no invoker, with a machine payment trigger |

**Modified:**

| File                                                                                        | What changes                                                                    |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `package.json`                                                                              | The `npm test` glob now survives the Windows shell                              |
| `plugin/hooks/run-hook.sh`                                                                  | `docker exec` becomes `node`; the toolkit root comes from the script's path     |
| `.github/workflows/living-docs.yml`                                                         | `docker compose` becomes `actions/setup-node` + `npm ci`                        |
| `docs/.ownership.yml`                                                                       | `generated[].command` relative; the `reason` of the `bin/living-docs` watch     |
| `docs/requirements/non-functional.md`                                                       | `RNF-0001` without "container"; `RNF-0002` rewritten in place                   |
| `docs/decisions/adr/ADR-0001-runtime-in-a-container-without-build.md`                      | Only `status` and `superseded-by` — mutable fields, body intact                 |
| `docs/charter/constitution.md`                                                              | Principle 6, `version: 2`, line in the amendment log                            |
| `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `docs/definition-of-done.md`, `.gitattributes` | Host-first prose                                                                |
| `test/core/roots.test.ts`                                                                   | Two assertions move from the container to the host                              |
| `test/plugin/manifest.test.ts`                                                              | The wrapper test requires `node` and forbids `docker`; the execute bit comes from git |
| `test/checks/ci7-ownership-coverage.test.ts`                                                | The short-phrase fixture swaps the phrase                                       |
| `test/cli/init-enforcement.test.ts`                                                         | The error message stops attributing the rule to `RNF-0002`                      |
| `CHANGELOG.md`                                                                              | Entry under `## [Unreleased] / ### Changed`                                     |
| `plugin/skills/working-agreements-keeper/SKILL.md`, `templates/workflow.yml`                | Task 12, outside the eleven changes                                             |

---

## Task 1: Dependencies on the host and an `npm test` that actually runs

**Files:**

- Modify: `package.json:9`

**Interfaces:**

- Consumes: nothing.
- Produces: `npm test` running the repository's 520 tests on the host, with the four baseline failures. Every following task depends on this.

`compose.yaml` mounts `node_modules` as a named volume, so the checkout's `node_modules/` is empty (spec §4). And the `test` script in `package.json` uses single quotes around the glob: in `sh` this works, because the shell strips them before `node` sees the argument; in `cmd.exe` — the shell npm uses on Windows — the single quotes reach `node` as part of the path, nothing matches, and `node --test` exits with `ℹ tests 0` and code **0**. A green build that ran no test at all.

- [ ] **Step 1: Install the dependencies on the host**

```bash
npm ci
```

Expected: finishes without error, and `node_modules/` stops being empty. Without this step, everything that follows fails with `ERR_MODULE_NOT_FOUND: Cannot find package 'yaml'` — and that is not a bug in the migration.

- [ ] **Step 2: Watch `npm test` lie**

```bash
npm test
```

Expected (on Windows): `ℹ tests 0`, `ℹ pass 0`, `ℹ fail 0`, exit code 0. On Linux/macOS this step already shows `ℹ tests 520` — in that case Step 3 is still correct (double quotes work in both shells), but there is nothing to observe here.

- [ ] **Step 3: Swap the glob's quotes**

In `package.json`, in the `scripts.test` key:

```json
    "test": "node --test \"test/**/*.test.ts\"",
```

Double quotes are stripped by both `sh` and `cmd.exe`; in both cases `node` receives `test/**/*.test.ts` and expands the glob itself. Measured: with double quotes via `cmd /c`, the tests run; with single quotes, zero.

- [ ] **Step 4: Confirm the baseline**

```bash
npm test
```

Expected: `ℹ tests 520`, `ℹ fail 4`, exit code 1. The four failures are exactly those in the baseline table above. **No others.** If a fifth appears, stop and investigate before continuing — the rest of the plan assumes this baseline.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "test(RNF-0002): make the npm test glob survive the Windows shell"
```

---

## Task 2: The two roots stop being asserted by the container

**Files:**

- Modify: `test/core/roots.test.ts:1-5` (imports), `:12-23` (variable test), `:53-62` (container test)
- Test: `test/core/roots.test.ts`

**Interfaces:**

- Consumes: `repoRoot()`, `toolkitRoot()`, `templatesDir()` from `src/core/roots.ts` — signatures unchanged, `() => string`.
- Produces: nothing that another task consumes.

Two assertions in this file fail on the host, for different reasons:

- The test at line 53 reads `LIVING_DOCS_TOOLKIT_ROOT` and `LIVING_DOCS_REPO_ROOT` **from the environment**. They only existed because `compose.yaml` injected them. Without a container, they are `undefined`. This is `M-8`: the test now asserts what remains true and is the heart of `ADR-0003` — `toolkitRoot()` derives from `import.meta.dirname`, `repoRoot()` falls back to the working directory.
- The test at line 12 fixes `/tmp/outro-projeto` and compares it with `repoRoot()`. `repoRoot()` calls `resolve()`, and on Windows `resolve('/tmp/outro-projeto')` returns `C:\tmp\outro-projeto`. The spec did not foresee this; it is a platform failure, not a container one, and without a fix the host never goes green.

The test "no absolute container path is embedded in `src/` or `test/`" (line 25) **stays as it is**: it is still `ADR-0003`'s guard against embedded paths, and the new code below introduces none.

- [ ] **Step 1: See the two failures**

```bash
node --test test/core/roots.test.ts
```

Expected: FAIL in two tests —
`RNF-0003: repoRoot honors LIVING_DOCS_REPO_ROOT and does not move toolkitRoot` with `actual: 'C:\tmp\outro-projeto'` against `expected: '/tmp/outro-projeto'` (on Linux this one passes), and
`RNF-0003: the container declares the two roots, and they are distinct` with `actual: 'undefined'` against `expected: 'string'`.

- [ ] **Step 2: Swap the imports**

Replace lines 1-5 of `test/core/roots.test.ts` with:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { repoRoot, templatesDir, toolkitRoot } from '../../src/core/roots.ts'
```

- [ ] **Step 3: Make the variable test platform-neutral**

Replace the whole test at lines 12-23 with:

```ts
test('RNF-0003: repoRoot honors LIVING_DOCS_REPO_ROOT and does not move toolkitRoot', () => {
  const antes = toolkitRoot()
  const anterior = process.env.LIVING_DOCS_REPO_ROOT
  // System-derived path, not hand-written: `repoRoot()` resolves, and a literal
  // POSIX path becomes `C:\...` on Windows.
  const outro = join(tmpdir(), 'outro-projeto')
  process.env.LIVING_DOCS_REPO_ROOT = outro
  try {
    assert.equal(repoRoot(), resolve(outro))
    assert.equal(toolkitRoot(), antes, 'the toolkit root must not follow the repository root (ADR-0003)')
  } finally {
    if (anterior === undefined) delete process.env.LIVING_DOCS_REPO_ROOT
    else process.env.LIVING_DOCS_REPO_ROOT = anterior
  }
})
```

- [ ] **Step 4: Swap the container assertion for the host assertion**

Replace the whole test at lines 53-62 (`RNF-0003: the container declares the two roots, and they are distinct`) with:

```ts
test('RNF-0003: with no variable at all, each root comes from its own source', () => {
  // Replaces the old "the container declares the two roots" assertion, which read
  // from the environment two variables that only existed because compose injected
  // them. What ADR-0003 really requires survives leaving the container: the
  // toolkit finds itself by its own file, and the validated repository is the
  // caller's cwd.
  const anteriorRepo = process.env.LIVING_DOCS_REPO_ROOT
  const anteriorToolkit = process.env.LIVING_DOCS_TOOLKIT_ROOT
  delete process.env.LIVING_DOCS_REPO_ROOT
  delete process.env.LIVING_DOCS_TOOLKIT_ROOT
  try {
    // This file is two levels below the root, exactly like
    // `src/core/roots.ts`: the derivation is the same, and it is what is asserted.
    assert.equal(toolkitRoot(), resolve(join(import.meta.dirname, '..', '..')))
    assert.equal(repoRoot(), resolve(process.cwd()))
  } finally {
    if (anteriorRepo !== undefined) process.env.LIVING_DOCS_REPO_ROOT = anteriorRepo
    if (anteriorToolkit !== undefined) process.env.LIVING_DOCS_TOOLKIT_ROOT = anteriorToolkit
  }
})
```

- [ ] **Step 5: Run the file**

```bash
node --test test/core/roots.test.ts
```

Expected: PASS in the file's four tests.

- [ ] **Step 6: Commit**

```bash
git add test/core/roots.test.ts
git commit -m "test(RNF-0003): assert the two roots by derivation, not by the container environment"
```

---

## Task 3: The hook wrapper calls the host's Node (`M-1`)

**Files:**

- Modify: `test/plugin/manifest.test.ts:1-5` (imports), `:57-66` (wrapper test), `:137-142` (comment and message of the CRLF test)
- Modify: `plugin/hooks/run-hook.sh` (whole file)
- Test: `test/plugin/manifest.test.ts`

**Interfaces:**

- Consumes: `toolkitRoot()` from `src/core/roots.ts`.
- Produces: `plugin/hooks/run-hook.sh <hook-name>`, reading the hook payload on stdin and writing the decision to stdout. Contract unchanged: 5 s ceiling, empty output and `exit 0` on any error. `plugin/hooks/hooks.json` keeps invoking `"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh" <hook>` and **does not change**.

The wrapper's contract does not change (`RNF-0001`, spec §7). What changes is who executes: the toolkit root comes from the script's own path — `plugin/hooks/run-hook.sh` is two levels below it — and the validated repository's root comes from `CLAUDE_PROJECT_DIR`. The two stay distinct, which is what `ADR-0003` requires.

`LIVING_DOCS_HOST_ROOT` is no longer passed: it existed so the hook could recognize, in a payload `file_path`, the prefix from outside the container. Outside the container the two prefixes are the same, and `hookEnv()` in `src/hooks/lib/io.ts` already handles the absence (`host ? [root, host] : [root]`). That is why `src/` does not need to change.

The execute-bit test changes source: `statSync(...).mode & 0o111` is always false on a Windows checkout, because the file system has no POSIX mode. What matters is the **versioned** mode — it is what the consumer receives —, and `git ls-files -s` returns it the same on any system. Measured: `100755` for `plugin/hooks/run-hook.sh` and `bin/living-docs`.

- [ ] **Step 1: Add the `execFileSync` import**

Replace lines 1-5 of `test/plugin/manifest.test.ts` with:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'
```

`statSync` stays imported: other tests in the file use it.

- [ ] **Step 2: Write the failing test**

Replace the whole test at lines 57-66 (`RNF-0002: the wrapper exists, is executable and fails open — the host only lends Docker`) with:

```ts
test('RNF-0002: the wrapper exists, is executable and runs the host node, failing open', () => {
  const relative = 'plugin/hooks/run-hook.sh'
  const wrapper = join(ROOT, relative)
  assert.ok(existsSync(wrapper))

  // The execute bit comes from git's index, not from the file system: a Windows
  // checkout has no POSIX mode, and what reaches whoever installs is the
  // versioned mode.
  const entry = execFileSync('git', ['ls-files', '-s', '--', relative], { cwd: ROOT, encoding: 'utf8' })
  assert.equal(entry.split(/\s+/)[0], '100755', `${relative} must be versioned as executable`)

  const source = readFileSync(wrapper, 'utf8')
  assert.match(source, /\bnode\b/, 'the hook runs on the host node (RNF-0002)')
  assert.doesNotMatch(source, /docker/i, 'there is no bridge to any container anymore')
  assert.match(source, /timeout 5/, 'it must respect the 5s ceiling of the spec §7')
  assert.match(source, /exit 0/, 'it must fail open')
  assert.doesNotMatch(source, /set -e\b/, 'set -e would kill the fail-open')
})
```

- [ ] **Step 3: Run it to see it fail**

```bash
node --test test/plugin/manifest.test.ts
```

Expected: FAIL in `RNF-0002: the wrapper exists, is executable and runs the host node, failing open`, with the message `there is no bridge to any container anymore` — the current wrapper still says `docker exec`.

- [ ] **Step 4: Rewrite the wrapper**

Full content of `plugin/hooks/run-hook.sh`:

```bash
#!/usr/bin/env bash
# Living-documentation hook wrapper: runs the toolkit on the host's node.
#
# Fails open by contract (docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7):
# missing node, missing dependency, timeout or execution error result in
# empty output and exit 0. A broken hook must not block work.
#
# Two roots, and they are not confused (ADR-0003): the **toolkit** code comes
# from this script's path, two levels above it; the `.ownership.yml` that is read
# is the one from the **validated repository**, which comes from CLAUDE_PROJECT_DIR.

HOOK="${1:-}"
TOOLKIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | LIVING_DOCS_REPO_ROOT="$REPO_ROOT" \
  timeout 5 node "${TOOLKIT_ROOT}/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
```

Three things that must not be lost in the rewrite, and that the Step 2 test verifies: `timeout 5`, `exit 0` and the **absence** of `set -e`. They are what keeps a broken hook from blocking work.

- [ ] **Step 5: Confirm the versioned mode survived the edit**

```bash
git ls-files -s -- plugin/hooks/run-hook.sh
```

Expected: the line starts with `100755`. If it comes back `100644`, run `git update-index --chmod=+x plugin/hooks/run-hook.sh` and repeat.

- [ ] **Step 6: Fix the CRLF test comment**

The CRLF test **stays**: `run-hook.sh` runs in bash and a CR in the shebang still breaks the interpreter. Only the text that attributed the reason to the container changes. Replace lines 137-142 with:

```ts
test('RNF-0002: no executable script carries CR — the wrapper runs in bash', () => {
  for (const relative of ['bin/living-docs', 'plugin/hooks/run-hook.sh']) {
    const source = readFileSync(join(ROOT, relative), 'utf8')
    assert.equal(source.includes('\r'), false, `${relative} with CRLF: the shebang breaks with "bad interpreter"`)
  }
})
```

- [ ] **Step 7: Run it to see it pass**

```bash
node --test test/plugin/manifest.test.ts
```

Expected: PASS in all the file's tests.

- [ ] **Step 8: Commit**

```bash
git add plugin/hooks/run-hook.sh test/plugin/manifest.test.ts
git commit -m "feat(RNF-0002): the hook wrapper now runs on the host node"
```

---

## Task 4: CI swaps Docker for Node (`M-2`)

**Files:**

- Modify: `.github/workflows/living-docs.yml` (whole file)

**Interfaces:**

- Consumes: `npm test` fixed by Task 1; the `validate`, `drift` and `changelog` subcommands of `node src/cli/index.ts`, unchanged.
- Produces: nothing that another task consumes.

The four CLI steps now invoke `node src/cli/index.ts` with the working directory at the checkout root — which is the runner's default, so no `-w` is needed.

Two things stay, for a written reason: `fetch-depth: 0`, because `CI-6` compares `<base>...HEAD` and a shallow clone does not have the base (`ADR-0006`); and the `if: github.event_name == 'pull_request'` condition on the steps that read the diff, for the reason recorded in `ADR-0010`.

- [ ] **Step 1: Rewrite the workflow**

Full content of `.github/workflows/living-docs.yml`:

```yaml
name: living-docs

on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          # CI-6 compares <base>...HEAD; a shallow clone does not have the base (ADR-0006).
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          # The floor is `engines.node` in package.json (RNF-0002).
          node-version: '24'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Tests
        run: npm test

      - name: Type-check
        run: npm run typecheck

      - name: CI-1 to CI-4, CI-7 and CI-8 — living documentation
        run: node src/cli/index.ts validate

      # The half of CI-7 that reads the diff only exists with a base (ADR-0010).
      # On `push` there is no base, and inventing one would produce a finding about
      # a change that is not from this branch.
      - name: CI-7 — code→doc link in the PR diff
        if: github.event_name == 'pull_request'
        run: node src/cli/index.ts validate --base ${{ github.event.pull_request.base.sha }}

      - name: CI-5 — generated-contract drift
        run: node src/cli/index.ts drift

      - name: CI-6 — CHANGELOG entry
        if: github.event_name == 'pull_request'
        run: node src/cli/index.ts changelog --base ${{ github.event.pull_request.base.sha }}
```

`cache: npm` requires `package-lock.json` at the root — it exists (it is what Task 1's `npm ci` consumed).

- [ ] **Step 2: Check that the YAML is valid and does not mention Docker**

```bash
node -e "const {parse}=require('yaml');const s=require('fs').readFileSync('.github/workflows/living-docs.yml','utf8');parse(s);if(/docker/i.test(s))throw new Error('still mentions Docker');console.log('ok')"
```

Expected: `ok`.

- [ ] **Step 3: Run on the host what the workflow runs**

```bash
npm test
npm run typecheck
node src/cli/index.ts validate
```

Expected: `npm test` with `ℹ fail 2` (`RF-0006` and the `drift` remain, which Task 5 closes); `typecheck` silent; `validate` with `no violation found`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/living-docs.yml
git commit -m "ci(RNF-0002): the workflow installs Node and npm instead of building the image"
```

---

## Task 5: The generator command stops being a container path (`M-6`)

**Files:**

- Modify: `docs/.ownership.yml:71`
- Test: `test/contracts/drift.test.ts` (already exists; currently fails)

**Interfaces:**

- Consumes: `runCommand` from `src/exec/command.ts`, which executes with `cwd` at the validated repository's root — that is why a relative path resolves.
- Produces: `generated[].command` equal to `node src/tools/gen-checks.ts`.

`generated[].command` currently points to `/opt/living-docs/src/tools/gen-checks.ts`, which does not exist on the host. The generator's output does not contain the command, so `CI-5` should not report content drift — but that is **proved** by running `drift`, not presumed.

- [ ] **Step 1: See the failure**

```bash
node --test test/contracts/drift.test.ts
```

Expected: FAIL in `RF-0006: this repository's generated contract has not drifted`, with `The generator failed: \`node /opt/living-docs/src/tools/gen-checks.ts\``.

- [ ] **Step 2: Swap the command**

In `docs/.ownership.yml`, under the `generated` key, replace line 71:

```yaml
command: node src/tools/gen-checks.ts
```

The block ends up like this (the comments above it do not change):

```yaml
generated:
  # The command PRINTS the expected content to standard output and writes no file:
  # a check that rewrites what it is checking erases the evidence at the very
  # moment it reports it (ADR-0005). HK-2 blocks editing `path` by hand;
  # CI-5 (`living-docs drift`) compares.
  - path: docs/contracts/checks.gen.md
    command: node src/tools/gen-checks.ts
```

- [ ] **Step 3: Prove there is no drift**

```bash
node --test test/contracts/drift.test.ts
node src/cli/index.ts drift
```

Expected: PASS in the file's two tests, and `living-docs: no violation found.` from `drift`. If `drift` reports content drift, **do not edit `docs/contracts/checks.gen.md`** — `HK-2` blocks it, and the source is `src/checks/catalog.ts`.

- [ ] **Step 4: The whole suite goes green**

```bash
npm test
```

Expected: `ℹ tests 520`, `ℹ fail 0`. The four baseline failures are over.

- [ ] **Step 5: Commit**

```bash
git add docs/.ownership.yml
git commit -m "fix(CI-5): the generator command becomes relative to the validated repository's root"
```

---

## Task 6: `ADR-0015` is born and supersedes `ADR-0001` (`M-3`)

**Files:**

- Create: `docs/decisions/adr/ADR-0015-execution-on-the-host-node.md`
- Modify: `docs/decisions/adr/ADR-0001-runtime-in-a-container-without-build.md:4` (`status`), `:11` (`superseded-by`)

**Interfaces:**

- Consumes: nothing.
- Produces: the ID `ADR-0015`, citable by `RNF-0002` (Task 7), by the Constitution (Task 8) and by `TDR-0002` (Task 10).

`status` and `superseded-by` are mutable fields declared in `docs/.ownership.yml` (`mutable-fields: [status, superseded-by, last-reviewed]`), so `HK-1` allows editing `ADR-0001`'s frontmatter and **its body stays intact**. `CI-3` closes the `supersedes`/`superseded-by` pair on both sides.

The ADR must say what is **gained** — local enforcement stops vanishing when the container is stopped, which was the loss declared in `ADR-0001` — and what is **lost**: the host now needs Node ≥ 24. And it must say explicitly that `ADR-0001`'s non-Docker half survives, otherwise the supersession looks like it also revokes what was not revoked.

- [ ] **Step 1: Write the ADR**

Full content of `docs/decisions/adr/ADR-0015-execution-on-the-host-node.md`:

```markdown
---
id: ADR-0015
title: Execution on the host's Node, TypeScript without a build step
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-01
relates-to: [RNF-0002, RNF-0003]
supersedes: ADR-0001
superseded-by: null
---

# ADR-0015 — Execution on the host's Node, TypeScript without a build step

## Context

`ADR-0001` decided on the container starting from a premise about the machine of
whoever develops: that it does not have Node and should not come to have it. The
premise stopped holding, and the loss that ADR declared and accepted started to be
charged every day: with the container stopped, the CLI exits with code 2 and the
hooks fail open, so **local enforcement disappears in silence** — exactly in the
component whose failure needs to be visible.

Node 24 is the same runtime the container carried. Bringing it to the host does not
change what executes; it only changes who hosts it.

## Alternatives considered

- **Keep the container and detect when it is stopped.** Discarded: the hook has a
  5 s ceiling and fails open by contract (`RNF-0001`); a warning emitted from inside
  a path that must stay silent on error either becomes noise on every invocation,
  or does not appear precisely when it matters.
- **Publish the toolkit on npm and install it as a dependency of the repository
  itself.** Discarded in this decision: it is `DA-0003`, and it is about how the
  toolkit reaches a **consumer** repository. Solving local execution does not
  require solving it, and mixing the two stalls the one that is already mature.
- **Compile TypeScript to `dist/` now that there is no container.** Discarded for
  the same reason as `ADR-0001`, which still holds: a stale `dist/` makes the hook
  silently run old code.

## Decision

The toolkit executes on the host's `node`, version 24 or greater, with dependencies
installed by `npm ci`. `plugin/hooks/run-hook.sh` invokes `node` directly,
deriving the toolkit root from the script's own path; the workflow installs
Node with `actions/setup-node` and runs `node src/cli/index.ts`.

**The non-Docker half of `ADR-0001` survives intact and is now carried
by this decision:** the code remains TypeScript executed directly
by native type-stripping, with no build step, with `tsc --noEmit` as the
type-checker — and we remain restricted to erasable TypeScript syntax: no
`enum`, no `namespace`, no decorators.

`ADR-0003` is not touched. The two roots remain distinct and remain coming from
the same sources: `import.meta.dirname` for the toolkit's, working
directory for the validated repository's.

## Consequences

### What is gained

Local enforcement stops depending on the state of a daemon: there is no longer a window
in which the hooks go quiet because someone did not bring up the container. The CI
image build goes away and the layer of indirection between editing and executing goes
away — the command the documentation teaches is the command that runs.

### What is accepted as lost

**The host now needs Node ≥ 24.** A machine with older Node, or
without Node, can no longer run the toolkit without installing anything — which was
precisely what `ADR-0001` bought. Whoever clones on such a machine finds out
from `node`'s error, not from a message of ours.

The reproducibility the image gave is also lost: the exact runtime version
becomes each machine's responsibility, and a patch difference between someone's
host and CI's `ubuntu-latest` becomes a class of divergence that did not
exist before.

`compose.yaml`, `Dockerfile` and `bin/living-docs` stay in the repository with no
document, test or CI step that invokes them. It is a conscious shortcut, recorded
in `TDR-0002`.
```

- [ ] **Step 2: Mark `ADR-0001` as superseded**

In `docs/decisions/adr/ADR-0001-runtime-in-a-container-without-build.md`, **only in the frontmatter**:

Line 4:

```yaml
status: superseded
```

Line 11:

```yaml
superseded-by: ADR-0015
```

The body is not touched — not a comma. It is what `HK-1` protects and what `E-2` preserves.

- [ ] **Step 3: Prove the pair closes on both sides**

```bash
node src/cli/index.ts validate
```

Expected: `living-docs: no violation found.` An open pair would produce a `CI-3` finding naming `supersedes`/`superseded-by`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/adr/ADR-0015-execution-on-the-host-node.md docs/decisions/adr/ADR-0001-runtime-in-a-container-without-build.md
git commit -m "docs(ADR-0015): record execution on the host node and supersede ADR-0001"
```

`ADR-0015` stays `draft`. **Do not promote it to `accepted`** — `HK-3` intercepts, and the answer is not yours.

---

## Task 7: `RNF-0002` rewritten in place, and `RNF-0001` without "container" (`M-4`)

**Files:**

- Modify: `docs/requirements/non-functional.md:19-21` (body of `RNF-0001`), `:24-31` (whole `RNF-0002`)

**Interfaces:**

- Consumes: the ID `ADR-0015` created in Task 6.
- Produces: `RNF-0002` with a new statement and the same ID, cited by `test/plugin/manifest.test.ts`.

`RNF-0002` keeps its ID and changes its statement (`E-3`). `CI-3` rule 7 requires an `active` requirement to be cited by at least one test in `test/**`: the citation exists in `test/plugin/manifest.test.ts` (two test names start with `RNF-0002:`) and Task 3 preserved it.

`RNF-0001` also changes, and is not in the table of the eleven changes: its body says "container down" as an example of an error, and §5 sweeps the whole of `docs/requirements/`. The ID, the `status` and the meaning of the rule do not change — only the example.

- [ ] **Step 1: Swap `RNF-0001`'s example**

Replace lines 19-21 (the paragraph of `RNF-0001`'s body) with:

```markdown
Any error in running a hook — unreadable configuration, missing dependency,
timeout — results in letting it pass. The enforcement that survives a broken hook
is CI; a broken hook that blocks work is removed by the user on the first day,
and then there is no enforcement at all.
```

The section title (`## RNF-0001 — A hook fails open, within 5 seconds, with no network`) and the `status` and `out of scope` bullets **do not change**.

- [ ] **Step 2: Rewrite `RNF-0002`**

Replace lines 24-31 (from the `## RNF-0002 — ...` line to the line before `## RNF-0003`) with:

```markdown
## RNF-0002 — The toolkit runs on the host's Node, without a build step

- **status:** active
- **relates-to:** ADR-0015
- **out of scope:** `git`, and how the toolkit reaches the repository of whoever consumes it (`DA-0003`)

Node 24 or greater, and the npm that comes with it, are the only toolchain required
of whoever clones this repository. `npm ci` installs the dependencies; `node` runs
the TypeScript source directly, with no compiled artifact in between.
```

The `out of scope` of the previous text already exempted `git`, and that did not change.

- [ ] **Step 3: Prove the rule is still covered**

```bash
node src/cli/index.ts validate
```

Expected: `no violation found`. An `active` `RNF-0002` with no citation in `test/**` would produce a `CI-3` finding.

- [ ] **Step 4: Confirm no mention is left in the requirements**

```bash
grep -rniE "docker|container" docs/requirements/ ; echo "exit: $?"
```

Expected: no line, `exit: 1` (grep with no match).

- [ ] **Step 5: Commit**

```bash
git add docs/requirements/non-functional.md
git commit -m "docs(RNF-0002): the rule now states execution on the host node"
```

---

## Task 8: Principle 6 of the Constitution is amended (`M-5`)

**Files:**

- Modify: `docs/charter/constitution.md:7` (`version`), `:22` (principle 6), `:26` (amendment log)

**Interfaces:**

- Consumes: `ADR-0015` (Task 6) and the new `RNF-0002` (Task 7).
- Produces: nothing that another task consumes.

Principle 6 asserts what stopped being true. The amendment is a deliberate act — it is what the document's `trigger` says —, so: new text, `version: 2`, and a line in the amendment log dated 2026-09-01. `test/docs/language-and-intent.test.ts` requires every principle to contain "verified by": the rewritten principle **names** what verifies it, it does not merely assert.

- [ ] **Step 1: Bump the version**

Line 7 of the frontmatter:

```yaml
version: 2
```

`last-reviewed` also becomes `2026-09-01`, because the document was in fact re-read in this change:

```yaml
last-reviewed: 2026-09-01
```

- [ ] **Step 2: Rewrite principle 6**

Replace line 22 with:

```markdown
6. The toolkit runs on the host's Node, without a build step — verified by `test/plugin/manifest.test.ts` (`RNF-0002`) and by the workflow, which installs Node and npm and nothing else.
```

- [ ] **Step 3: Add the amendment line**

At the end of the `## Amendment log` section, **after** the v1 line (which does not change):

```markdown
- 2026-09-01 — v2 — Principle 6 now asserts execution on the host's Node, following `ADR-0015`, which supersedes `ADR-0001` — human, migration of execution to the host.
```

- [ ] **Step 4: Run the charter tests**

```bash
node --test test/docs/language-and-intent.test.ts
node src/cli/index.ts validate
```

Expected: PASS in all, including `the Constitution: every principle names what verifies it`; `validate` with no violation.

- [ ] **Step 5: Commit**

```bash
git add docs/charter/constitution.md
git commit -m "docs(ADR-0015): amend principle 6 of the Constitution for host execution"
```

---

## Task 9: The prose and fixtures become host-first (`M-7` and `M-9`)

**Files:**

- Modify: `CLAUDE.md`, `CONTRIBUTING.md:15-30`, `README.md`, `docs/definition-of-done.md:30`, `.gitattributes:1-2`, `docs/.ownership.yml:196`
- Modify: `test/checks/ci7-ownership-coverage.test.ts:217`, `test/cli/init-enforcement.test.ts:36`
- Test: `test/docs/agent-contract.test.ts`, `test/checks/ci7-ownership-coverage.test.ts`, `test/cli/init-enforcement.test.ts`

**Interfaces:**

- Consumes: rewritten `RNF-0002` (Task 7).
- Produces: `CONTRIBUTING.md` and `README.md` with no mention of `bin/living-docs` — a precondition of `TDR-0002`'s `pay-when` (Task 10). If you change the wording below, check that trigger's `paths`.

Verified constraints that must not break:

- `CLAUDE.md` has at most 60 lines (`test/docs/agent-contract.test.ts`) — today it is 52 — and cannot contain, literally, the title of any requirement. The policy bullet states the rule **without repeating** `RNF-0002`'s statement; `CI-7` also rejects a long phrase duplicated between the agent contract and the owning artifact (floor of twelve words, `ADR-0009`).
- Every Definition of Done item names its verification (`CI-\d`, `HK-\d` or human) — the rewrite of the second-to-last item preserves that.

- [ ] **Step 1: `CLAUDE.md` — the policy bullet**

In the `## Policy` section, replace the whole first bullet:

```markdown
- **The toolkit runs on the host's `node`.** `npm ci` before anything; then
  `npm test`, `npm run typecheck` and `node src/cli/index.ts …`. The governing rule is
  `RNF-0002`.
```

(was: `- **Nothing runs on the host except Docker.** Every command goes through / \`docker compose exec toolkit …\` or \`./bin/living-docs\`.`)

- [ ] **Step 2: `CONTRIBUTING.md` — the environment section**

Replace the whole `## The environment` section (lines 15-30) with:

````markdown
## The environment

Node 24 or greater and the npm that comes with it — nothing beyond that (`RNF-0002`). The
dependencies come in with `npm ci`, and it comes before any other command:

```bash
npm ci
npm test
npm run typecheck
node src/cli/index.ts validate
node src/cli/index.ts validate --base origin/master
```

A command that fails with `ERR_MODULE_NOT_FOUND` is a command run before
`npm ci` — it is not the environment that is wrong.
````

- [ ] **Step 3: `README.md` — the four passages**

**3a.** In the `## How it works` section, replace the final paragraph (lines 20-21):

```markdown
The toolkit runs on the host's Node: `npm ci` once, and `node src/cli/index.ts` from
then on. There is no build step between editing and executing.
```

**3b.** Replace the whole `## Prerequisites` section:

```markdown
## Prerequisites

- Node 24 or greater, with npm.
- Claude Code, to use the plugin part (skills, commands and hooks).
```

**3c.** Replace the `## Installation and first use` section — the code block, the following paragraph and the `Command` column of the table:

````markdown
## Installation and first use

```bash
npm ci                                          # installs the dependencies
node src/cli/index.ts init --stage solo         # creates the initial structure of folders and files
node src/cli/index.ts validate                  # checks the repository's documentation
```

Without `LIVING_DOCS_REPO_ROOT`, the CLI validates the **working directory** — run
from the root of this checkout, it validates itself: the toolkit uses itself as a test.

Available commands:

| Command                                        | What it does                                                                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node src/cli/index.ts init --stage <stage>`   | Creates the stage's initial structure and declares in `docs/.ownership.yml` what it created.                                                        |
| `node src/cli/index.ts validate`               | Checks frontmatter, unique IDs, traceability between documents, expired documents and owner coverage.                                               |
| `node src/cli/index.ts validate --base <ref>`  | In addition to the above, compares with the branch diff: code that changed without the owning document, and a consumer-visible change without a `CHANGELOG.md` entry. |
| `node src/cli/index.ts drift`                  | Checks that each generated document still matches the command that generates it.                                                                    |
| `node src/cli/index.ts changelog --base <ref>` | Checks that every consumer-visible change got a `CHANGELOG.md` entry, or a reason written in the commit.                                            |
````

**3d.** Replace the whole `## Validating another project` section:

````markdown
## Validating another project

The toolkit's source and the validated repository are independent roots
(`ADR-0003`): the first comes from the path of the code itself, the second from the
working directory or from `LIVING_DOCS_REPO_ROOT`.

```bash
LIVING_DOCS_REPO_ROOT=/path/to/project node src/cli/index.ts init --stage small-team --owner @team
LIVING_DOCS_REPO_ROOT=/path/to/project node src/cli/index.ts validate
```
````

**3e.** In the `**Hooks:**` paragraph (`## The Claude Code plugin` section), the final sentence attributes the fail-open to the stopped container. Replace the final sentence with:

```markdown
The hooks that remind and ask never block; when the toolkit cannot
run, no hook blocks anything — the layer that survives that is
CI.
```

**3f.** Replace the whole `## Development` section:

````markdown
## Development

```bash
npm ci
npm test
npm run typecheck
```

To contribute, see `CONTRIBUTING.md`.
````

- [ ] **Step 4: `docs/definition-of-done.md` — the second-to-last item**

Replace line 30:

```markdown
- [ ] `npm test`, `npm run typecheck`, `living-docs validate --base <ref>`, `living-docs drift` and `living-docs changelog --base <ref>` pass on the host — verification: `CI-1` to `CI-10`, run by the repository's workflow.
```

Also update `last-reviewed` in the frontmatter to `2026-09-01`.

- [ ] **Step 5: `.gitattributes` — the comment**

Replace the first two lines:

```
# The hook wrapper runs in bash (RNF-0002). A CR in the shebang breaks it with
# "bad interpreter", and whoever clones on Windows does not see the reason.
```

The rest of the file (`* text=auto eol=lf` and the `binary` lines) does not change.

- [ ] **Step 6: `docs/.ownership.yml` — the `reason` of the `bin/living-docs` watch**

Replace line 196:

```yaml
reason: 'the wrapper is a public entry point of the toolkit — changing how it is invoked changes what whoever consumes it uses'
```

The `code`, the `doc` and the `consumer-visible: true` of that entry **do not change**.

- [ ] **Step 7: `test/checks/ci7-ownership-coverage.test.ts` — the short-phrase fixture**

The phrase is arbitrary: it exists to demonstrate that a short phrase is shared vocabulary and **not** a duplicate (`ADR-0009`). Replace line 217:

```ts
const curta = 'The test comes before the implementation.'
```

The rest of the test does not change — the assertion is still `assert.deepEqual(ci7OwnershipCoverage().run(contextFor(root)), [])`.

- [ ] **Step 8: `test/cli/init-enforcement.test.ts` — the error message**

The assertion is still correct and gains value: now not even this repository's workflow mentions Docker. Only the message, which attributed the rule to `RNF-0002`, changes. Replace line 36:

```ts
assert.doesNotMatch(yaml, /docker/i, 'how the toolkit reaches the CI of whoever installs it is DA-0003, not something we impose')
```

- [ ] **Step 9: Run the suite and the checks**

```bash
npm test
node src/cli/index.ts validate
```

Expected: `ℹ fail 0`, and `no violation found`. If `CI-7` reports a phrase duplicated between `CLAUDE.md` and an owning artifact, the fix is to **delete the phrase from the contract and leave the pointer** — never touch `ADR-0009`'s threshold.

- [ ] **Step 10: Check the contract's line ceiling**

```bash
node -e "console.log(require('fs').readFileSync('CLAUDE.md','utf8').split('\n').length)"
```

Expected: a number ≤ 60.

- [ ] **Step 11: Commit**

```bash
git add CLAUDE.md CONTRIBUTING.md README.md docs/definition-of-done.md .gitattributes docs/.ownership.yml test/checks/ci7-ownership-coverage.test.ts test/cli/init-enforcement.test.ts
git commit -m "docs(RNF-0002): the prose and fixtures now assert the host"
```

---

## Task 10: The orphan wrapper becomes debt with an observable trigger (`M-11`)

**Files:**

- Create: `docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md`

**Interfaces:**

- Consumes: `ADR-0015` (Task 6); and Task 9, which took `bin/living-docs` out of `CONTRIBUTING.md` and `README.md` — without that the trigger below fires immediately.
- Produces: the ID `TDR-0002`.

`E-1` leaves `bin/living-docs` as a `docker exec` bridge with no document, test or CI step that invokes it. A conscious shortcut becomes a `TDR` with an **observable** payment trigger — `CI-4` rejects a `pay-when` that nobody can verify.

The trigger the spec proposes in prose ("when someone invokes `bin/living-docs` and it fails for lack of the container") is not observable by file, and `CI-4` only knows how to look for a `pattern` inside `paths`. The machine form below captures the same moment from the side that leaves a trace: the day a living document or CI goes back to **teaching** the wrapper, it needs to work.

Two cautions in `paths`:

- **`test/**` stays out.** `test/plugin/manifest.test.ts` cites `bin/living-docs` in the CRLF test, which the spec says to keep. Including it would fire the trigger in the same commit in which it is born.
- **`CHANGELOG.md` and `docs/.ownership.yml` stay out** for the same reason: both cite the wrapper today, and `E-2` preserves them.

- [ ] **Step 1: Write the TDR**

Full content of `docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md`:

```markdown
---
id: TDR-0002
title: bin/living-docs still requires Docker with nobody to invoke it
status: open
owner: '@esliph/engineering'
trigger: >
  When the payment trigger below is met.
last-reviewed: 2026-09-01
relates-to: [ADR-0015, RNF-0002]
# Single quotes: in YAML, single quotes do not process `\`, and the pattern is a regex.
pay-when:
  pattern: 'bin/living-docs'
  paths:
    - CONTRIBUTING.md
    - README.md
    - docs/definition-of-done.md
    - '.github/workflows/**'
---

# TDR-0002 — bin/living-docs still requires Docker with nobody to invoke it

## The shortcut

The migration to the host's Node removed every invoker of `bin/living-docs`:
no living document teaches it, no test executes it, no CI step
calls it. The file remains in the repository, remains a `docker exec` bridge
to a container that nobody brings up anymore, and remains declared in
`consumer-visible-paths` — that is, it is still treated as a public contract.

`Dockerfile`, `compose.yaml` and `.dockerignore` stay for the same reason: the
build that is left needs them.

## Why it was accepted

Deleting them along with the migration would mix two changes with different risks: the
one that swaps who executes, verifiable by running the five commands, and the one that removes an
execution path that someone may be using without having said so. The first is the
scope of this delivery; the second calls for a release and a deprecation line.

While the wrapper is invoked by nothing, the cost of the delay is a dead file
— cheap, and visible to whoever opens it.

## Payment trigger

When `bin/living-docs` goes back to being taught or executed: a mention in
`CONTRIBUTING.md`, `README.md`, `docs/definition-of-done.md` or in any
workflow. It is the verifiable form of "someone tried to use it": from then on it
stops being a dead file and becomes an execution path — and an execution
path that fails for a missing container needs either to work, or to go.

## Cost of remaining in debt

A public execution path that fails with a Docker message in a
repository whose entire documentation says Docker is not needed. Whoever
stumbles on it has no way to know whether the wrong one is the wrapper or the documentation — and
`RNF-0002` says it is the wrapper.
```

- [ ] **Step 2: Prove the trigger is not met**

```bash
node src/cli/index.ts validate
```

Expected: `no violation found`. If `CI-4` reports `TDR-0002` with the trigger already met, it names the file and the line of the evidence: it is a mention of `bin/living-docs` that Task 9 let through. Fix the mention, not the `pay-when`.

- [ ] **Step 3: Confirm the sweep by hand**

```bash
grep -n "bin/living-docs" CONTRIBUTING.md README.md docs/definition-of-done.md .github/workflows/living-docs.yml ; echo "exit: $?"
```

Expected: no line, `exit: 1`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/debt/TDR-0002-orphan-docker-wrapper.md
git commit -m "docs(TDR-0002): record the orphan Docker wrapper with a verifiable payment trigger"
```

---

## Task 11: The CHANGELOG and the two proofs that no check makes (`M-10`, §5)

**Files:**

- Modify: `CHANGELOG.md` (new entry in `## [Unreleased]` / `### Changed`)

**Interfaces:**

- Consumes: everything Tasks 3 to 10 produced.
- Produces: the closed delivery.

`.github/workflows/**` and `plugin/**` are in `consumer-visible-paths`, and `CI-6` rejects the branch diff that touches them without an entry in `## [Unreleased]`. The entry is written for whoever **consumes** the toolkit — the file's test is the one declared in its own header: if the entry only makes sense to whoever wrote the code, it does not belong there.

- [ ] **Step 1: Write the entry**

In `CHANGELOG.md`, as the **first** item of `### Changed` inside `## [Unreleased]` (above the entry that starts with "The package name becomes `@esliph/living-docs`"):

```markdown
- The toolkit now runs on the host's Node: the plugin hooks invoke `node`
  directly, and this repository's CI workflow installs Node and npm instead of
  building an image. Whoever clones needs Node 24 or greater and an `npm ci`
  before the first command; in exchange, the hooks stop going quiet when the
  container is not up. `compose.yaml`, `Dockerfile` and `./bin/living-docs`
  remain in the repository, but nothing invokes them anymore — recorded in `ADR-0015` and
  `TDR-0002`.
```

- [ ] **Step 2: Run `CI-6`**

```bash
node src/cli/index.ts changelog --base origin/master
```

Expected: `living-docs: no violation found.`

- [ ] **Step 3: The five commands of §5, in order**

```bash
npm ci
npm test
npm run typecheck
node src/cli/index.ts validate --base origin/master
node src/cli/index.ts drift
node src/cli/index.ts changelog --base origin/master
```

Expected: `npm test` with `ℹ tests 520` and `ℹ fail 0`; `typecheck` with no output; the three subcommands with `no violation found`. It is their **execution**, not reading the diff, that closes the migration.

- [ ] **Step 4: Proof 1 — no living document mentions Docker**

```bash
grep -rniE "docker|container" CLAUDE.md CONTRIBUTING.md README.md docs/definition-of-done.md docs/.ownership.yml docs/requirements/ docs/charter/ .gitattributes ; echo "exit: $?"
```

Expected: no line, `exit: 1`. Any occurrence here is unfinished work from Tasks 7, 8 or 9.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(ADR-0015): record the migration to the host node in the CHANGELOG"
```

- [ ] **Step 6: Proof 2 — a hook really runs**

`M-1` rewrote the path that no test executes end to end: `test/hooks/` exercises the decisions by payload, not the wrapper. The proof is a session in which a hook really responds, **with Docker stopped**.

First, make sure the container is not up:

```bash
docker compose down 2>/dev/null || true
```

Then, invoke the wrapper the way Claude Code invokes it — payload on stdin, hook name as argument:

```bash
CLAUDE_PROJECT_DIR="$PWD" printf '%s' '{"tool_name":"Edit","tool_input":{"file_path":"src/checks/ci1-structure.ts"}}' | bash plugin/hooks/run-hook.sh hk4-watch-reminder
```

Expected: a JSON with `hookSpecificOutput.additionalContext` citing `docs/requirements/rules.md` — the owning doc of `src/checks/**` according to `watches`. `HK-4` reminds, it does not block.

And the fail-open, with a hook that does not exist:

```bash
printf '%s' '{}' | bash plugin/hooks/run-hook.sh hk99-nonexistent ; echo "exit: $?"
```

Expected: empty output and `exit: 0`.

If the first command produces no output, **do not conclude the wrapper is wrong before checking whether `npm ci` ran** (spec §4): without `node_modules/`, `node` exits with `ERR_MODULE_NOT_FOUND`, the wrapper goes quiet by contract, and the symptom is identical to that of a broken wrapper.

---

## Task 12: The two living documents that §5 did not sweep

**Files:**

- Modify: `plugin/skills/working-agreements-keeper/SKILL.md:63`
- Modify: `templates/workflow.yml:1-9` (the header comment)

**Interfaces:**

- Consumes: rewritten `RNF-0002` (Task 7).
- Produces: nothing.

**This task is outside the spec's eleven changes.** It is separable on purpose: rejecting it brings nothing down. What it fixes is that two living documents would come to assert the container after the migration — one of them installed in the repository of whoever consumes.

- [ ] **Step 1: The skill that teaches writing agreements**

`working-agreements-keeper` uses, as an **example** of a well-written line in the "what to never do" format, the phrase `"never run \`npm\` outside the container"`. The example came to teach the opposite of the current rule. Replace line 63:

```markdown
("never promote a decision without human review").
```

Item 4 in full ends up like this (the rest does not change):

```markdown
4. **Write one line, not a paragraph.** Form: _where the truth is_ ("the
   rule of X lives in `docs/requirements/rules.md`") or _what to never do_
   ("never promote a decision without human review").
```

- [ ] **Step 2: The workflow template that `init` installs**

The header comment asserts that the toolkit runs in a container. Replace lines 1-9 of `templates/workflow.yml`:

```yaml
# Living-documentation enforcement, installed by `living-docs init`.
#
# The invocation mode is a parameter of whoever installs (`--invoke`): how the toolkit
# reaches this CI is an open decision — `DA-0003` in the toolkit's repository —, and
# fixing an answer here would turn the toolkit's choice into the
# consumer's rule.
#
# This file is yours: `init` only creates it when it does not exist, and never
# rewrites it.
```

The rest of the file (from `name: living-docs` on) **does not change** — `test/cli/init-enforcement.test.ts` and `test/acceptance/consumer-repo.test.ts` assert the content of the steps.

- [ ] **Step 3: Run the suite and the checks**

```bash
npm test
node src/cli/index.ts validate
node src/cli/index.ts changelog --base origin/master
```

Expected: `ℹ fail 0` and `no violation found` in both. `templates/**` and `plugin/**` are consumer-visible, and Task 11's `CHANGELOG.md` entry already covers the whole branch.

- [ ] **Step 4: Commit**

```bash
git add plugin/skills/working-agreements-keeper/SKILL.md templates/workflow.yml
git commit -m "docs(RNF-0002): fix the skill's example and the workflow template's header"
```

---

## What this plan deliberately does not do

- **Does not touch `src/`.** `toolkitRoot()` and `repoRoot()` are already container-independent; `hookEnv()` already handles the absence of `LIVING_DOCS_HOST_ROOT`. `ADR-0003` comes out intact, without supersession.
- **Does not delete `Dockerfile`, `compose.yaml`, `.dockerignore` or `bin/living-docs`.** `.dockerignore` serves the `Dockerfile` that was left: deleting it would break the build that is left.
- **Does not rewrite the historical record.** `docs/superpowers/plans/`, `research/`, the body of earlier ADRs and the old `CHANGELOG` entries stay as they are.
- **Does not revoke the non-Docker half of `ADR-0001`** — TypeScript without a build step remains in force, now carried by `ADR-0015`.
- **Does not promote `ADR-0015` to `accepted`.** It is a human act; `HK-3` intercepts.
- **Does not publish a package or an image.** How the toolkit reaches a consumer's CI remains `DA-0003`, open.
- **Does not remove `bin/living-docs` from `consumer-visible-paths` or from `watches`.** It remains a public contract until `TDR-0002` is paid.
