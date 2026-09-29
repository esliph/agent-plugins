# Marketplace structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each plugin into a self-contained project under `plugins/<name>/`, leave the root with the marketplace and the shared policy, and keep one ID space across the repository.

**Architecture:** Each plugin project holds a distributed directory (`plugin/`, the marketplace `source`) plus its tests, docs, toolchain and container outside it. The root keeps only language-neutral configuration, the marketplace manifest, the global governance workflow and the policy documents. Ownership files compose through `include:`; living-docs learns that one `id-prefix` may live in several entries while its sequence stays one per repository.

**Tech Stack:** Node 24 (TypeScript run directly with `--conditions=development`, `node:test`), npm, GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4` only), Docker Compose, YAML ownership files v2.

**Spec:** `docs/superpowers/specs/2026-09-29-marketplace-structure-design.md`

## Global Constraints

- Node floor: `engines.node` `>=24`; CI uses `setup-node` with `node-version: '24'`.
- The root has no language toolchain after Task 6: only `.editorconfig`, `.gitattributes`, `.prettierrc` (plus `.gitignore`, `.prettierignore`).
- No third-party GitHub Action: a per-job path filter is done in-house (`git diff`), never with a marketplace action (`ADR-0016`).
- Every versioned text is in English (`ADR-0031`).
- Text marked `audience: external` (every `README.md`, every `CHANGELOG.md`, `docs/deprecations.md`, `docs/migrations/`, `docs/releases/`) carries no artifact ID (`ADR-0017`, `living-docs/external-audience`).
- What a plugin ships (`plugins/<name>/plugin/**`: seeds, templates, skills, commands, agents, hooks, CLI and hook strings) cites no internal ID, no `spec §n`, no `docs/superpowers/` — only code comments may (`RN-0031`).
- The agent writes `draft`/`open` and never promotes. Every **HUMAN GATE** below stops execution until a person has acted.
- A frozen item (accepted/superseded ADR, paid/accepted-permanently TDR) changes only its path, and only under `ADR-0038`, in Task 7.
- A generated artifact (`checks.gen.md`) is never edited by hand; it is regenerated with its `generated[].command`.
- No bulk bump of `last-reviewed`. A moved document keeps its `last-reviewed`.
- Every commit that changes an artifact file cites an ID declared in it (`living-docs/commit-discipline`). A commit that touches a watched path without its doc carries `Docs: none — <reason>`; a consumer-visible change without a CHANGELOG item carries `Changelog: none — <reason>`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Commands in this plan are written for Git Bash from the checkout root unless a step says otherwise.

## Review Focus

1. **A `watches[].code` or `cited-by` glob left pointing at the old `packages/` layout** matches nothing and passes silently — a reasonable person expects a dead glob to fail. Pinned by `test/docs/ownership-globs.test.ts` (Task 4, Step 1).
2. **A fresh clone that runs `npm ci` only in `plugins/living-docs/`**: the core's source (`plugins/ownership/plugin/src`) imports `yaml` and resolves it from its own real path, not from living-docs' `node_modules`. Expected: the documented and CI order installs the core first, and the failure is loud. Pinned by the `dev-resolution` test importing the core and calling `resolveOwnership` (Task 5, Step 6).
3. **A marketplace entry whose `source` escapes the repository or points at the project instead of `plugin/`** — expected: `marketplace.yml` reports it by plugin name. Pinned in `check-marketplace.test.mjs` (Task 6, Step 1).
4. **A `cited-by` glob written in an included ownership file** is read from the repository root, not from the file's base — a requirement cited only by its own project's tests must pass, and a base-relative glob must not silently match. Pinned in `shared-prefix.test.ts` (Task 3, Step 1).
5. **Two projects taking the same number of a shared prefix** (e.g. `ADR-0040` written in root and in a plugin) — expected: `living-docs/id-integrity` reports the duplicate across entries. Pinned in `shared-prefix.test.ts` (Task 3, Step 1).

## Settled risks (spec §9) and interpretations

- **`cited-by` and the file base.** The core confines only its own path fields (`resolve/hierarchy.ts` `assertConfinement`); the `living-docs:` block is opaque to it, and `citation-coverage` passes `cited-by` straight to `scanCitations(context.root, …)`. So `cited-by` is **not** confined and is read **from the repository root**. Plugin ownership files write `cited-by` globs repository-relative (`plugins/ownership/test/**`). Task 3 pins it with a test.
- **Runtime dependencies from the project root.** Mechanism: the project `package.json` lists `"@esliph/<name>": "file:./plugin"` as a devDependency, so `npm ci` in the project installs the plugin's runtime dependencies into `plugins/<name>/node_modules`, an ancestor of `plugin/src`. `plugins/living-docs/package.json` also lists `"@esliph/ownership": "file:../ownership/plugin"` directly, so the resolution of the nested `file:` does not depend on how npm resolves a link's own `file:` specs.
- **Lockfiles.** "A single lockfile per project" is read as **one lockfile per `package.json`, and none at the root**: `plugins/<name>/package-lock.json` (development) and `plugins/<name>/plugin/package-lock.json` (runtime, only production packages — what the marketplace cache installs with `npm ci`; the ownership `plugin-cache` test needs it). The distributed directory carries no *development* lockfile, as §8 requires; a test asserts the runtime lockfile has no `dev: true` package. **Flag this to the human at the handoff.**
- **`claude plugin validate` in CI.** Not used. RN-0041 also requires `README.md`, `CHANGELOG.md` and `.ownership.yml` in the project, which the CLI does not check, and installing and authenticating the CLI in CI is a dependency the root cannot declare (it has no toolchain). A dependency-free Node script in `.github/scripts/` does it.
- **Living-docs installs the core first.** While the `file:` dependency exists (`TDR-0003`), `npm ci` runs in `plugins/ownership/` before `plugins/living-docs/` — in CI, in `bin/dev` and in the docs.
- **Order deviation from spec §6.** Each plugin's `.ownership.yml` (code paths only) and `CHANGELOG.md` are created in its move task (4, 5), not in step 6, so that RN-0041 already holds when `marketplace.yml` lands in Task 6. The documentation corpus still moves in Task 7.

## File map

Created (final layout):

- `plugins/ownership/plugin/` ← `packages/ownership/{.claude-plugin,hooks,src}` + runtime `package.json` + runtime `package-lock.json`
- `plugins/ownership/test/` ← `packages/ownership/test/`
- `plugins/ownership/{package.json,package-lock.json,tsconfig.json,tsconfig.build.json,eslint.config.mjs,.gitignore,README.md,CHANGELOG.md,.ownership.yml}`
- `plugins/ownership/docs/` (ADR, DA, RF, RN per spec §5)
- `plugins/living-docs/plugin/` ← `packages/living-docs/{.claude-plugin,agents,commands,hooks,skills,src,templates}` + runtime `package.json` + runtime `package-lock.json`
- `plugins/living-docs/test/` ← `packages/living-docs/test/`
- `plugins/living-docs/{package.json,package-lock.json,tsconfig.json,eslint.config.mjs,Dockerfile,compose.yaml,.dockerignore,bin/,README.md,CHANGELOG.md,CLAUDE.md,.ownership.yml}`
- `plugins/living-docs/docs/` (ADR, TDR, DA, RF, RNF, RN, REL, charter, glossary, contracts, deprecations, migrations, releases)
- `.github/workflows/{marketplace.yml,plugin-ownership.yml,plugin-living-docs.yml}`
- `.github/scripts/{check-marketplace.mjs,check-marketplace.test.mjs}`
- `.editorconfig`

Removed: `packages/`, root `package.json`, `package-lock.json`, `eslint.config.mjs`, `Dockerfile`, `compose.yaml`, `.dockerignore`, `bin/`, `.github/workflows/living-docs.yml`, `.github/workflows/wrapper-docker.yml`.

Modified: `.claude-plugin/marketplace.json`, `.ownership.yml`, `CODEOWNERS`, `.prettierignore`, `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/definition-of-done.md`, `docs/open-decisions.md`, `docs/requirements/rules.md`.

---

### Task 0: Pre-flight

**Files:** none.

- [ ] **Step 1: Check the working tree**

Run: `git status --short`

`docs/requirements/non-functional.md` may carry an uncommitted change that promotes `RNF-0006` from `draft` to `active`. That is a human promotion, not yours: **stop and ask the human to commit or discard it** before going on. Task 7 moves that file and Task 8 edits `RNF-0006`. Leave `.claude/settings.json` untracked and never stage it.

- [ ] **Step 2: Work on a branch, isolated**

Use superpowers:using-git-worktrees. Branch from the current `ref/marketplace-root`.

- [ ] **Step 3: Baseline**

```bash
npm ci
npm test
npm run typecheck
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
```

Expected: all pass; both validates print no violation. `npx eslint . --quiet` reports 28 errors today — Task 2 fixes them. Record the test count printed by `npm test` for comparison at the end.

---

### Task 1: Decisions and rules, as draft

**Files:**
- Create: `docs/decisions/adr/ADR-0036-each-plugin-a-self-contained-project.md`
- Create: `docs/decisions/adr/ADR-0037-an-id-prefix-in-several-ownership-entries.md`
- Create: `docs/decisions/adr/ADR-0038-one-time-relocation-of-frozen-artifacts.md`
- Modify: `docs/open-decisions.md` (append row `DA-0009`)
- Modify: `docs/requirements/rules.md` (append `RN-0040`, `RN-0041`)

**Interfaces:**
- Produces: the IDs `DA-0009`, `ADR-0036`, `ADR-0037`, `ADR-0038`, `RN-0040`, `RN-0041`, cited by every later task.

- [ ] **Step 1: Confirm the IDs are free**

Run: `grep -rhoE "\b(ADR-003[6-9]|DA-0009|RN-004[0-9])\b" docs/decisions docs/open-decisions.md docs/requirements docs/ids-retired.txt | sort -u`
Expected: no output. If any appears, take the next free number instead and carry the change through every task.

- [ ] **Step 2: Append `DA-0009` to `docs/open-decisions.md`**

Append this row at the end of the table (column alignment is cosmetic; do not realign the table):

```markdown
| DA-0009 | The repository structure is bound to one toolchain and one plugin: the root is an npm workspace, the container and `bin/` exist only for living-docs, the single workflow runs `npm ci` for everything, and the root `docs/` is living-docs' product documentation. A plugin that is not Node, or not about documentation, has no place of its own — its code would fall into the npm workspace, its CI into a workflow that runs `npm ci`, and its requirements into living-docs' requirement files. Options: each plugin a self-contained project under `plugins/<name>/`, with the root keeping the marketplace and the shared policy; keeping the workspace and adding plugins under `packages/`; or one repository per plugin | open | — | — | 2026-09-29 |
```

- [ ] **Step 3: Write `ADR-0036`**

```markdown
---
id: ADR-0036
title: Each plugin is a self-contained project under plugins/<name>/
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [DA-0009, ADR-0035, ADR-0023, ADR-0025, ADR-0016, TDR-0003, RN-0041]
supersedes: null
superseded-by: null
---

# ADR-0036 — Each plugin is a self-contained project under plugins/<name>/

## Context

`ADR-0035` made the root the marketplace's page. The structure still assumes one
toolchain and one plugin: the root is an npm workspace over `packages/*`, the
container and `bin/` exist only for living-docs, the single workflow runs
`npm ci` for everything, and the root `docs/` is living-docs' product
documentation. `DA-0009` recorded the gap: a plugin that is not Node, or not
about documentation, has no place of its own.

## Alternatives considered

1. **Keep the workspace and add plugins under `packages/`.** Discarded: a Python
   or Markdown-only plugin would still inherit the root `npm ci`, the root lint
   and a workflow that knows nothing about it.
2. **One repository per plugin.** Discarded: the marketplace manifest, the single
   ID space and the governance checks that compose the whole repository at once
   (ID uniqueness, links across projects, owner coverage) would split with it.
3. **A self-contained project per plugin under `plugins/<name>/`, whose
   distributed directory is `plugin/`.** Chosen.

## Decision

- Each plugin is a project under `plugins/<name>/`. What is distributed is
  `plugins/<name>/plugin/`, the `source` in `marketplace.json`. Tests,
  documentation, toolchain and container stay outside it.
- The root has no language toolchain; it keeps `.editorconfig`,
  `.gitattributes` and `.prettierrc`.
- CI: one workflow per plugin, filtered by `plugins/<name>/**`, plus
  `marketplace.yml`, which always runs and holds the global checks.
- Minimum governance of a plugin: `plugin/.claude-plugin/plugin.json`, a
  `README.md` for outside readers, a `CHANGELOG.md` and a `.ownership.yml`
  (`RN-0041`). `docs/` exists only when the plugin has something to record.
- One ID space across the repository; the documents of each project live in its
  own `docs/`.
- A Node plugin has two `package.json`: `plugin/package.json` with the runtime
  dependencies and its runtime lockfile (what the marketplace cache installs),
  and a private project `package.json` that links `file:./plugin` and holds the
  development dependencies, the scripts and the development lockfile. There is
  no lockfile at the root.
- A path inside a plugin's `living-docs:` block (`cited-by`) is read from the
  repository root, as before: the core confines only its own path fields
  (`ADR-0023`).

What moved: `packages/ownership/` → `plugins/ownership/{plugin,test}/`;
`packages/living-docs/` → `plugins/living-docs/{plugin,test}/`; `Dockerfile`,
`compose.yaml`, `.dockerignore` and `bin/` → `plugins/living-docs/`;
`living-docs.yml` → `marketplace.yml`; `wrapper-docker.yml` → a job of
`plugin-living-docs.yml`. Accepted ADRs that describe the old layout
(`ADR-0016`, `ADR-0025`, `ADR-0027`, among others) are not edited; this list is
where the new paths are named.

## Consequences

### What we gain

A new plugin — Node, Python or Markdown only — gets a directory, a workflow and a
documentation home without touching any root file other than `marketplace.json`
and `README.md`. What an installer receives is exactly `plugin/`, which a test
can check.

### What we accept to lose

There is no root `npm test` any more: each plugin is tested from its own project.
While living-docs depends on the core by path (`TDR-0003`), working on it needs
two `npm ci`, and its workflow also runs on core changes. `git log` without
`--follow` stops at the move. Each plugin's workflow repeats the setup lines.
```

- [ ] **Step 4: Write `ADR-0037`**

```markdown
---
id: ADR-0037
title: An ID prefix may be declared in several ownership entries; its sequence is one per repository
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0036, ADR-0011, ADR-0023, ADR-0029, RN-0040]
supersedes: null
superseded-by: null
---

# ADR-0037 — An ID prefix may be declared in several ownership entries; its sequence is one per repository

## Context

`ADR-0036` puts the documents of each project in its own `docs/`. The living-docs
configuration refuses an `id-prefix` declared in more than one `owned` entry, so
every ADR of the repository would have to stay in one directory, or each project
would need its own prefix. The composition across ownership files already exists
(`ADR-0023`), and `living-docs/id-integrity` already collects declarations from
every entry at once.

## Alternatives considered

1. **A prefix per project.** Discarded: IDs already cited across the corpus would
   change or split, and two families would mean the same kind of decision.
2. **An ID space per project, with qualified citations.** Discarded: every
   citation and the citation parser would change, and a citation without the
   qualifier would become ambiguous.
3. **One prefix in several entries, sharing one sequence.** Chosen.

## Decision

- The same `id-prefix` may appear in several `owned` entries, one per project.
  All entries of a prefix share a single contiguous sequence, checked across the
  repository.
- A new ID takes the next free number in the repository, whichever entry it is
  written in.
- `role` stays unique. A plugin's `CLAUDE.md` is a plain document, with no
  `role`; the agent-contract duplication check applies to the root contract only.
- When a tool needs one entry for a prefix (a second run of `init`), it takes the
  entry declared in the root ownership file, or else the first in resolution
  order.

## Consequences

### What we gain

Each project keeps its decisions next to its code under the IDs every citation
already uses.

### What we accept to lose

The prefix no longer says where an item lives: finding `ADR-0019` takes a search
across entries. Two people writing in two projects at the same time can take the
same number; `living-docs/id-integrity` catches it only when validate runs.
```

- [ ] **Step 5: Write `ADR-0038`**

```markdown
---
id: ADR-0038
title: One-time relocation of frozen artifacts into their project's docs/
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0033, ADR-0036, ADR-0037]
supersedes: null
superseded-by: null
---

# ADR-0038 — One-time relocation of frozen artifacts into their project's docs/

## Context

`ADR-0036` moves each document to the project whose code it governs. Accepted
ADRs and paid TDRs are frozen, and `living-docs/append-only` denies an edit to
one. `ADR-0033` already settled how a frozen file changes path once without
disabling the guard: a write to a path that does not exist yet is a new item for
the guard.

## Alternatives considered

1. **Leave frozen artifacts at the root.** Discarded: a project's decision
   history would live away from the project, and only the mutable half of it
   would move.
2. **Supersede each frozen ADR with a copy in its project.** Discarded: it
   doubles the ADR count with decisions that decide nothing.
3. **A one-time relocation under this ADR, same ID and content.** Chosen.

## Decision

Accepted ADRs and paid TDRs move to their project's `docs/` **once**: same ID,
same body, same frontmatter, same `last-reviewed`. Only the path changes. Each
commit writes the new path and removes the old one in the same commit, cites
`ADR-0038` and lists the IDs it moves. The guard is never disabled. This is valid
only for the commits of this migration; a later move of a frozen artifact needs a
decision of its own.

## Consequences

### What we gain

Every project carries its whole decision history, under the same IDs.

### What we accept to lose

Paths written in the prose of frozen artifacts (`docs/decisions/adr/`,
`packages/…`) keep describing the old layout and are not corrected. The
`pay-when` of `TDR-0001`, which is accepted permanently, names
`docs/requirements/**` and, after the move, covers only the root requirement
file.
```

- [ ] **Step 6: Append `RN-0040` and `RN-0041` to `docs/requirements/rules.md`**

Append at the end of the file, after `RN-0039`:

```markdown
## RN-0040 — An ID prefix may be declared in several ownership entries, and its sequence is one per repository

- **status:** draft
- **relates-to:** ADR-0037, ADR-0011
- **out of scope:** `role`, which stays unique across the repository

The same `id-prefix` may appear in more than one `owned` entry, in the root
ownership file or in the files it includes. Every item of the prefix, whichever
entry declares it, shares one sequence: a number is taken once in the repository,
the sequence has no gap across all entries together, and a new item takes the
next free number of the whole repository.

## RN-0041 — Every plugin in the marketplace has a distributed directory and the minimum governance

- **status:** draft
- **relates-to:** ADR-0036
- **out of scope:** what a plugin's own workflow verifies; the content of its README and CHANGELOG, which their owners judge

The marketplace manifest and every plugin manifest parse as JSON. Every plugin
listed in the marketplace has a `source` inside the repository that exists and
contains `.claude-plugin/plugin.json`, whose `name` is the entry's name and whose
`version` equals the entry's when the entry declares one. The directory above the
source is the plugin's project, and it holds `README.md`, `CHANGELOG.md` and
`.ownership.yml`.
```

- [ ] **Step 7: Validate**

Run:
```bash
node --conditions=development packages/living-docs/src/cli/index.ts validate
node --conditions=development packages/ownership/src/cli/index.ts validate
```
Expected: no violation. (A `draft` requirement is not charged for citations.)

- [ ] **Step 8: Commit**

```bash
git add docs/decisions/adr/ADR-0036-*.md docs/decisions/adr/ADR-0037-*.md docs/decisions/adr/ADR-0038-*.md docs/open-decisions.md docs/requirements/rules.md
git commit -m "docs(DA-0009, ADR-0036, ADR-0037, ADR-0038, RN-0040, RN-0041): the marketplace structure, as draft

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9: HUMAN GATE**

Stop. Ask the human to review and, if they agree, promote `ADR-0037` (and `RN-0040`) **before Task 3**, and `ADR-0036` and `ADR-0038` (and resolve `DA-0009` with `ADR-0036`) **before Task 4**. Task 2 may run while they decide. Do not edit the status fields yourself.

---

### Task 2: Lint clean before CI enforces it

The spec starts running `npm run lint:check` in CI (§4.1). Today `eslint .` reports 28 errors (884 warnings do not fail it). This task removes the errors without changing behavior, except that a map or list value now shows as JSON instead of `[object Object]` in a configuration error message.

**Files:**
- Create: `packages/living-docs/src/core/display.ts`, `packages/living-docs/test/core/display.test.ts`
- Create: `packages/ownership/src/core/display.ts`, `packages/ownership/test/core/display.test.ts`
- Modify (living-docs): `src/checks/citation-coverage.ts:90`, `src/config/ownership.ts` (every `String(` in a `fail(...)` message), `src/docs/blocked.ts:47`, `src/docs/collect.ts:149`, `src/frontmatter/parse.ts:30`, `src/git/diff.ts:33`, `src/hooks/append-only.ts:94`, `test/acceptance/language-independence.test.ts:176`, `test/plugin/authoring.test.ts` (8 lines)
- Modify (ownership): `src/checks/generated-drift.ts:32`, `src/core/exec.ts:22`, `src/core/frontmatter.ts:25`, `src/resolve/hierarchy.ts:177-180`, `src/schema/parse.ts:106`, `test/checks/declared-state.test.ts:78`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: `display(value: unknown): string` in each package's `src/core/display.ts`.

- [ ] **Step 1: Write the failing tests**

`packages/living-docs/test/core/display.test.ts` (and the same file, byte for byte, at `packages/ownership/test/core/display.test.ts`):

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { display } from '../../src/core/display.ts'

test('a string shows as itself, a scalar as its text', () => {
  assert.equal(display('ADR'), 'ADR')
  assert.equal(display(9), '9')
  assert.equal(display(true), 'true')
  assert.equal(display(null), 'null')
  assert.equal(display(undefined), 'undefined')
})

test('a map or a list read from YAML shows as written, never as [object Object]', () => {
  assert.equal(display({ a: 1 }), '{"a":1}')
  assert.equal(display(['x', 'y']), '["x","y"]')
})

test('the stderr of a process arrives as a Buffer and shows as its text', () => {
  assert.equal(display(Buffer.from('boom\n')), 'boom\n')
})
```

Add to `packages/living-docs/test/config/ownership.test.ts`, after the test `'id-format and last-reviewed-bump-limit out of range are errors'`:

```ts
test('a map where a scalar was expected is shown as written in the error', () => {
  assert.throws(() => configFrom(yaml(ADR, "living-docs:\n  id-format: { separator: { a: 1 } }\n")), /separator "\{"a":1\}" is not accepted/)
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd packages/living-docs && node --conditions=development --test test/core/display.test.ts test/config/ownership.test.ts; cd ../ownership && node --test test/core/display.test.ts`
Expected: FAIL — `Cannot find module '../../src/core/display.ts'`, and the separator test fails with `[object Object]`.

- [ ] **Step 3: Implement `display`**

`packages/living-docs/src/core/display.ts` and `packages/ownership/src/core/display.ts` (same content):

```ts
/**
 * How a value read from a file or from a process shows in a message. A string
 * is itself; a map or a list shows as written in JSON, never as
 * `[object Object]`; a Buffer (the stderr of a child process) is its text.
 */
export function display(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8')
  }
  if (value === undefined || typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    // A cyclic structure (YAML aliases) cannot be written as JSON.
    return Object.prototype.toString.call(value)
  }
}
```

- [ ] **Step 4: Replace the flagged sites**

living-docs (`packages/living-docs/`), each file importing `{ display }` from its relative `core/display.ts`:

- `src/checks/citation-coverage.ts:90`: `const text = Array.isArray(value) ? value.join(', ') : String(value)` → `const text = Array.isArray(value) ? value.map(display).join(', ') : display(value)`
- `src/config/ownership.ts`: replace every `String(` inside a `fail(...)` message by `display(` (lines 140, 147, 159, 170, 188, 230).
- `src/docs/blocked.ts:47`: `String(raw ?? '')` → `display(raw ?? '')`
- `src/docs/collect.ts:149`: `let frontmatter: Frontmatter | null = null` → `let frontmatter: Frontmatter | null` (both branches of the `try` assign it).
- `src/frontmatter/parse.ts:30`: the literal BOM in `/^﻿/` → `/^﻿/`
- `src/git/diff.ts:33`: `String(stderr ?? '')` → `display(stderr ?? '')` (leave `String(err)` as is).
- `src/hooks/append-only.ts:94`: `String(parseFrontmatter(current)?.data.id ?? '')` → `display(parseFrontmatter(current)?.data.id ?? '')`
- `test/acceptance/language-independence.test.ts:176`: `/      field-map:\n(?:        .*\n)+/` → `/ {6}field-map:\n(?: {8}.*\n)+/`
- `test/plugin/authoring.test.ts` lines 37, 70, 86, 122, 138, 158, 174, 192: `String(parseFrontmatter(…)?.data.description ?? '')` → `display(parseFrontmatter(…)?.data.description ?? '')`, importing `display` from `'../../src/core/display.ts'`.

ownership (`packages/ownership/`):

- `src/checks/generated-drift.ts:32` and `src/core/exec.ts:22`: `String(stderr ?? '')` → `display(stderr ?? '')`
- `src/core/frontmatter.ts:25`: `/^﻿/` → `/^﻿/`
- `src/schema/parse.ts:106`: `String(keyMode)` → `display(keyMode)`
- `src/resolve/hierarchy.ts:177-180`, replace:

```ts
      const parsed = parseOwnershipFile(readOwnershipFile(repoRoot, includedFile, file.file), includedFile, { isRoot: false, pluginNames: root.plugins }) as ParsedFile

      if (parsed.version !== root.version) {
        throw new OwnershipError(`${includedFile}: version ${parsed.version} differs from ${root.file} (version ${root.version}). One repository, one schema.`)
```

with:

```ts
      const parsed = parseOwnershipFile(readOwnershipFile(repoRoot, includedFile, file.file), includedFile, { isRoot: false, pluginNames: root.plugins })
      // Widened on purpose: the type admits only the accepted version, and this comparison is what rejects another.
      const childVersion: number = parsed.version

      if (childVersion !== root.version) {
        throw new OwnershipError(`${includedFile}: version ${childVersion} differs from ${root.file} (version ${root.version}). One repository, one schema.`)
```

- `test/checks/declared-state.test.ts:78`: `findings[0]!.message` → `findings[0].message`

- [ ] **Step 5: Run tests, typecheck and lint**

Run:
```bash
npm test
npm run typecheck
npx eslint . --quiet
```
Expected: tests pass (count = baseline + 7), typecheck clean, eslint prints nothing (0 errors). If `hierarchy.ts` still reports `restrict-template-expressions`, use `${String(root.version)}`.

- [ ] **Step 6: CHANGELOG entry**

Under `## [Unreleased]` in `CHANGELOG.md`, in a `### Fixed` subsection (create it after the existing subsections if absent):

```markdown
- An ownership file value that is a map or a list where a single value was
  expected is now shown as written in the error message, instead of
  `[object Object]`.
```

- [ ] **Step 7: Commit**

```bash
git add packages CHANGELOG.md
git commit -m "fix: lint errors, and messages that showed [object Object]

Docs: none — lint fixes; no rule, command or requirement changes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: One ID prefix in several entries (ADR-0037, RN-0040)

**Precondition:** HUMAN GATE of Task 1 — `ADR-0037` is `accepted`. If not, stop.

**Files:**
- Create: `packages/living-docs/test/config/shared-prefix.test.ts`
- Modify: `packages/living-docs/src/config/ownership.ts` (drop the duplicate-prefix failure; add `primaryArtifact`)
- Modify: `packages/living-docs/src/cli/init.ts:312` and `:752`
- Modify: `packages/living-docs/test/config/ownership.test.ts:115`
- Modify: `packages/living-docs/skills/decision-recorder/SKILL.md` (Procedure steps 1 and 4), `packages/living-docs/skills/requirements-keeper/SKILL.md` (Procedure steps 1 and 5)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: `primaryArtifact(config: LivingDocsConfig, idPrefix: string): ArtifactRule | null` exported from `src/config/ownership.ts`.
- `adaptConfig(core: ResolvedConfig): LivingDocsConfig` keeps its signature; `config.artifacts` may now hold several rules with the same `idPrefix`.

- [ ] **Step 1: Write the failing tests**

`packages/living-docs/test/config/shared-prefix.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runValidate } from '../../src/cli/validate.ts'
import { loadLivingDocsConfig, primaryArtifact } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const ADR_ENTRY = `  - path: docs/decisions/adr/
    owner: '@team'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
`

const ROOT_FILE = `version: 2
plugins: [living-docs]
include: [plugins/core/]
owned:
${ADR_ENTRY}  - path: .ownership.yml
    owner: '@team'
    living-docs: {}
`

function childFile(citedBy: string): string {
  return `version: 2
owned:
${ADR_ENTRY}  - path: docs/requirements/rules.md
    owner: '@team'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN, cited-by: ['${citedBy}'] }
  - path: .ownership.yml
    owner: '@team'
    living-docs: {}
`
}

const RULES = '# Rules\n\n## RN-0001 — A rule\n\n- **status:** active\n\nThe rule.\n'

function adr(id: string): string {
  return `---\nid: ${id}\ntitle: Decision\nstatus: draft\nowner: '@team'\ntrigger: Never.\nlast-reviewed: 2026-09-29\nrelates-to: []\nsupersedes: null\nsuperseded-by: null\n---\n\n# ${id} — Decision\n`
}

function base(extra: Record<string, string>): Record<string, string> {
  return {
    '.ownership.yml': ROOT_FILE,
    'plugins/core/.ownership.yml': childFile('plugins/core/test/**'),
    'plugins/core/docs/requirements/rules.md': RULES,
    'plugins/core/test/a.test.ts': "// RN-0001\nexport {}\n",
    ...extra,
  }
}

function findings(root: string, ruleId: string) {
  return runValidate(root).findings.filter(finding => finding.ruleId === ruleId)
}

test('RN-0040: the same id-prefix in the root file and in an included file is accepted, one rule per entry', () => {
  withTempRepo(base({}), root => {
    const config = loadLivingDocsConfig(root)

    assert.deepEqual(
      config.artifacts.filter(artifact => artifact.idPrefix === 'ADR').map(artifact => artifact.path),
      ['docs/decisions/adr/', 'plugins/core/docs/decisions/adr/'],
    )
  })
})

test('RN-0040: numbers of one prefix split across two entries form one sequence with no gap', () => {
  withTempRepo(
    base({ 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'), 'plugins/core/docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002') }),
    root => {
      assert.deepEqual(findings(root, 'living-docs/id-integrity'), [])
    },
  )
})

test('RN-0040: a gap is judged across the entries of a prefix', () => {
  withTempRepo(
    base({ 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'), 'plugins/core/docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003') }),
    root => {
      assert.ok(findings(root, 'living-docs/id-integrity').some(finding => /ADR-0002/.test(finding.message)))
    },
  )
})

test('RN-0040: the same number taken in two entries is a duplicate', () => {
  withTempRepo(
    base({ 'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'), 'plugins/core/docs/decisions/adr/ADR-0001-b.md': adr('ADR-0001') }),
    root => {
      assert.ok(findings(root, 'living-docs/id-integrity').some(finding => /Duplicate ID ADR-0001/.test(finding.message)))
    },
  )
})

test('RN-0040: role stays unique across ownership files', () => {
  const root = ROOT_FILE.replace('    living-docs: {}\n', '    living-docs: {}\n  - path: CLAUDE.md\n    owner: \'@team\'\n    living-docs: { role: agent-contract }\n')
  const child = childFile('plugins/core/test/**') + "  - path: CLAUDE.md\n    owner: '@team'\n    living-docs: { role: agent-contract }\n"

  withTempRepo({ '.ownership.yml': root, 'plugins/core/.ownership.yml': child }, dir => {
    assert.throws(() => loadLivingDocsConfig(dir), /role "agent-contract" declared in two documents/)
  })
})

test('ADR-0037: primaryArtifact prefers the entry of the root file, then the first entry, then none', () => {
  withTempRepo(base({}), root => {
    const config = loadLivingDocsConfig(root)

    assert.equal(primaryArtifact(config, 'ADR')?.path, 'docs/decisions/adr/')
    assert.equal(primaryArtifact(config, 'RN')?.path, 'plugins/core/docs/requirements/rules.md')
    assert.equal(primaryArtifact(config, 'TDR'), null)
  })
})

test('ADR-0036: a cited-by glob in an included file is read from the repository root', () => {
  withTempRepo(base({}), root => {
    assert.deepEqual(findings(root, 'living-docs/citation-coverage'), [], 'repository-relative glob finds plugins/core/test/a.test.ts')
  })
  withTempRepo(base({ 'plugins/core/.ownership.yml': childFile('test/**') }), root => {
    assert.ok(
      findings(root, 'living-docs/citation-coverage').some(finding => /RN-0001/.test(finding.message)),
      'a base-relative glob must not silently reach plugins/core/test/',
    )
  })
})
```

Change `packages/living-docs/test/config/ownership.test.ts:115` from

```ts
  assert.throws(() => configFrom(yaml(ADR + ADR.replace('docs/decisions/adr/', 'docs/adr2/'))), /id-prefix "ADR" declared twice/)
```

to

```ts
  assert.deepEqual(
    configFrom(yaml(ADR + ADR.replace('docs/decisions/adr/', 'docs/adr2/'))).artifacts.map(artifact => artifact.path),
    ['docs/decisions/adr/', 'docs/adr2/'],
    'RN-0040: a prefix may be declared in several entries',
  )
```

- [ ] **Step 2: Run to see them fail**

Run: `cd packages/living-docs && node --conditions=development --test test/config/shared-prefix.test.ts test/config/ownership.test.ts`
Expected: FAIL — `primaryArtifact` is not exported, and loading throws `id-prefix "ADR" declared twice`. The two `cited-by` assertions and the `role` test may already pass: they pin current behavior.

- [ ] **Step 3: Implement**

In `packages/living-docs/src/config/ownership.ts`, delete this block from `adaptConfig`:

```ts
  const prefixes = new Set<string>()

  for (const artifact of artifacts) {
    if (prefixes.has(artifact.idPrefix)) {
      fail(core.rootFile, `id-prefix "${artifact.idPrefix}" declared twice. One artifact, one owner.`)
    }
    prefixes.add(artifact.idPrefix)
  }

```

Put in its place this comment, so the absence reads as a decision:

```ts
  // A prefix may be declared in several entries — one per project — and all of
  // them share one sequence, which `living-docs/id-integrity` checks across the
  // repository (ADR-0037). `role` stays unique: below.
```

Add after `documentWithRole`:

```ts
/**
 * The entry a tool takes when it needs one place for a prefix (a second run of
 * `init`): the one the root ownership file declares, or else the first in
 * resolution order. A prefix may live in several entries (ADR-0037).
 */
export function primaryArtifact(config: LivingDocsConfig, idPrefix: string): ArtifactRule | null {
  const entries = config.artifacts.filter(artifact => artifact.idPrefix === idPrefix)

  return entries.find(artifact => artifact.core.origin === config.rootFile) ?? entries[0] ?? null
}
```

In `packages/living-docs/src/cli/init.ts`, import `primaryArtifact` from `'../config/ownership.ts'` and replace:

- line 312: `const declared = existing?.artifacts.find(artifact => artifact.idPrefix === kind)` → `const declared = existing ? primaryArtifact(existing, kind) : null`
- line 752: `const rel = existing.artifacts.find(artifact => artifact.idPrefix === 'REL')` → `const rel = primaryArtifact(existing, 'REL')`

(`?? undefined` is not needed: both call sites only test truthiness and read `.path`/fields.)

- [ ] **Step 4: Teach the skills**

`packages/living-docs/skills/decision-recorder/SKILL.md`, Procedure:

Step 1 becomes:
```markdown
1. **Read `.ownership.yml`**, and every ownership file it `include`s, and find
   the path, the owner and the prefix of each artifact. A prefix may be declared
   in more than one entry — one per project: write in the entry of the project
   whose code the decision governs. If the file does not exist, stop and run
   `/docs-setup`.
```
Step 4 becomes:
```markdown
4. **Take the next free ID** of the prefix across the whole repository — every
   entry that declares it — also checking `docs/ids-retired.txt`. Never recycle.
   Never skip.
```

`packages/living-docs/skills/requirements-keeper/SKILL.md`, Procedure:

Step 1 becomes:
```markdown
1. **Read `.ownership.yml`**, and every ownership file it `include`s, and find
   the path, owner and prefix of each family. A prefix may be declared in more
   than one entry — one per project: write in the entry of the project whose
   tests will cite the requirement. If it does not exist, stop and run
   `/docs-setup`.
```
Step 5 becomes:
```markdown
5. **Take the next free ID** of the prefix across the whole repository — every
   entry that declares it — checking `docs/ids-retired.txt`. Never recycle, never
   skip. The new section goes at the end of the file, after the existing ones.
```

- [ ] **Step 5: Run everything**

Run:
```bash
npm test
npm run typecheck
npx eslint . --quiet
node --conditions=development packages/living-docs/src/cli/index.ts validate
```
Expected: all pass; eslint silent; validate clean. The distribution test `internal-trail` must stay green (the skill text names no internal ID).

- [ ] **Step 6: CHANGELOG entry**

Under `## [Unreleased]` → `### Changed` (create if absent):

```markdown
- The same `id-prefix` may now be declared in more than one `owned` entry — for
  instance one per project, in files that the root ownership file includes. All
  entries of a prefix share one numbering: no number repeats and no gap is
  allowed across them, and a new item takes the next free number of the whole
  repository. `role` stays unique.
```

- [ ] **Step 7: Commit**

```bash
git add packages/living-docs CHANGELOG.md
git commit -m "feat(RN-0040): an ID prefix may be declared in several ownership entries (ADR-0037)

Docs: none — the skills only learn where the next ID comes from; how we work here and what init does are unchanged

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Move `ownership` to `plugins/ownership/`

**Precondition:** HUMAN GATE of Task 1 — `ADR-0036` and `ADR-0038` are `accepted`. If not, stop.

**Files:**
- Move: `packages/ownership/{.claude-plugin,hooks,src}` → `plugins/ownership/plugin/`; `packages/ownership/test` → `plugins/ownership/test`; `packages/ownership/{README.md,tsconfig.json,tsconfig.build.json,.gitignore}` → `plugins/ownership/`
- Create: `plugins/ownership/plugin/package.json`, `plugins/ownership/plugin/package-lock.json`, `plugins/ownership/package.json`, `plugins/ownership/package-lock.json`, `plugins/ownership/eslint.config.mjs`, `plugins/ownership/CHANGELOG.md`, `plugins/ownership/.ownership.yml`, `plugins/ownership/test/helpers/roots.ts`, `plugins/ownership/test/distribution/distributed-dir.test.ts`, `.github/workflows/plugin-ownership.yml`, `packages/living-docs/test/docs/ownership-globs.test.ts`
- Modify: `plugins/ownership/test/distribution/{dev-resolution,lockfile,no-internal-trace,packaging,plugin-cache}.test.ts`, `plugins/ownership/test/cli/validate.test.ts:37`, `plugins/ownership/plugin/hooks/run-hook.sh` (comment), `plugins/ownership/README.md:96-97`
- Modify: `packages/living-docs/package.json`, `packages/living-docs/package-lock.json`, `packages/living-docs/test/distribution/{dev-resolution,lockfile}.test.ts`, `packages/living-docs/test/plugin/manifest.test.ts`
- Modify: `.claude-plugin/marketplace.json`, `.ownership.yml`, `CODEOWNERS`, `CHANGELOG.md`, `README.md`, `docs/open-decisions.md` (DA-0004 `Blocks`), `.github/workflows/living-docs.yml`, root `package-lock.json`

**Interfaces:**
- Produces: `PROJECT_ROOT`, `PLUGIN_ROOT` (absolute paths) from `plugins/ownership/test/helpers/roots.ts`.
- Produces: the core resolvable as `@esliph/ownership` from `plugins/ownership/node_modules` (→ `./plugin`, `development` → `./src/index.ts`).

- [ ] **Step 1: Pin live globs first (Review Focus 1)**

`packages/living-docs/test/docs/ownership-globs.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import picomatch from 'picomatch'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

test('every watches code glob and every cited-by glob of this repository matches a versioned file', () => {
  const root = checkoutRoot()
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(file => file !== '')
  const config = loadLivingDocsConfig(root)
  const globs = [...new Set([...config.watches.map(watch => watch.code), ...config.artifacts.flatMap(artifact => artifact.citedBy)])]
  const dead = globs.filter(glob => !files.some(picomatch(glob)))

  assert.ok(globs.length > 10, `scan too empty: ${globs.length} glob(s)`)
  assert.deepEqual(dead, [], 'a glob that matches nothing checks nothing — it still points at a path that moved')
})
```

Run: `cd packages/living-docs && node --conditions=development --test test/docs/ownership-globs.test.ts`
Expected: PASS (baseline). It must stay green through Tasks 4–7.

- [ ] **Step 2: Move the files**

```bash
mkdir -p plugins/ownership/plugin
git mv packages/ownership/.claude-plugin plugins/ownership/plugin/.claude-plugin
git mv packages/ownership/hooks plugins/ownership/plugin/hooks
git mv packages/ownership/src plugins/ownership/plugin/src
git mv packages/ownership/test plugins/ownership/test
git mv packages/ownership/README.md plugins/ownership/README.md
git mv packages/ownership/tsconfig.json plugins/ownership/tsconfig.json
git mv packages/ownership/tsconfig.build.json plugins/ownership/tsconfig.build.json
git mv packages/ownership/.gitignore plugins/ownership/.gitignore
git rm -q packages/ownership/package.json packages/ownership/package-lock.json
git ls-files packages/ownership
```
Expected: the last command prints nothing. `hooks/run-hook.sh` keeps mode `100755` (`git ls-files -s plugins/ownership/plugin/hooks/run-hook.sh`).

- [ ] **Step 3: The two `package.json`**

`plugins/ownership/plugin/package.json`:

```json
{
  "name": "@esliph/ownership",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "bin": {
    "ownership": "./dist/cli/index.js"
  },
  "scripts": {
    "prepack": "tsc -p ../tsconfig.build.json"
  },
  "dependencies": {
    "picomatch": "^4.0.2",
    "yaml": "^2.6.0"
  }
}
```

`plugins/ownership/package.json`:

```json
{
  "name": "@esliph/ownership-project",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "test": "node --test \"test/**/*.test.ts\"",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --fix",
    "lint:check": "eslint .",
    "format": "prettier --ignore-path ../../.prettierignore --write .",
    "format:check": "prettier --ignore-path ../../.prettierignore --check ."
  },
  "devDependencies": {
    "@esliph/ownership": "file:./plugin",
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.0.0",
    "@types/picomatch": "^3.0.1",
    "eslint": "^10.9.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.6",
    "globals": "^17.12.0",
    "prettier": "^3.9.6",
    "typescript": "^5.9.0",
    "typescript-eslint": "^8.69.0"
  }
}
```

`plugins/ownership/tsconfig.json`: change `"include"` to `["plugin/src/**/*.ts", "test/**/*.ts"]`.

`plugins/ownership/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "rootDir": "plugin/src",
    "outDir": "plugin/dist",
    "declaration": true,
    "rewriteRelativeImportExtensions": true
  },
  "include": ["plugin/src/**/*.ts"]
}
```

`plugins/ownership/.gitignore`:

```gitignore
plugin/dist/
node_modules/
*.tgz
```

`plugins/ownership/eslint.config.mjs`: copy the root `eslint.config.mjs` byte for byte (its `tsconfigRootDir: import.meta.dirname` now resolves to the project).

- [ ] **Step 4: Lockfiles and install**

```bash
cd plugins/ownership/plugin && npm install --package-lock-only --ignore-scripts && cd ..
npm install
npm ci
ls plugin/node_modules 2>/dev/null; echo "plugin/node_modules absent: $?"
node --conditions=development --input-type=module -e 'import("@esliph/ownership").then(m => console.log(typeof m.resolveOwnership, import.meta.resolve("@esliph/ownership")))'
cd ../..
```
Expected: `plugin/node_modules absent: 2` (or non-zero); the last node line prints `function` and a URL ending in `plugins/ownership/plugin/src/index.ts`.

- [ ] **Step 5: Test path helper and path fixes**

`plugins/ownership/test/helpers/roots.ts`:

```ts
import { join } from 'node:path'

/** The ownership project: toolchain, tests and documentation (ADR-0036). */
export const PROJECT_ROOT = join(import.meta.dirname, '..', '..')

/** The distributed directory: what the marketplace cache copies and `npm pack` packs. */
export const PLUGIN_ROOT = join(PROJECT_ROOT, 'plugin')
```

Rewrite the relative imports of the source in every test file — only on import lines, so YAML fixtures such as `../../src/**` stay intact:

```bash
cd plugins/ownership
grep -rlE "from '(\.\./)+src/|import\('(\.\./)+src/" test | xargs sed -i -E "/^(import|export) .* from '|import\('/ s#'((\.\./)+)src/#'\1plugin/src/#g"
cd ../..
```

Then, by hand:

- `test/cli/validate.test.ts:37`: `join(import.meta.dirname, '..', '..', 'src', 'cli', 'index.ts')` → `join(PLUGIN_ROOT, 'src', 'cli', 'index.ts')` (import `PLUGIN_ROOT` from `'../helpers/roots.ts'`).
- `test/distribution/no-internal-trace.test.ts`, `packaging.test.ts`, `plugin-cache.test.ts`: replace `const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')` by `import { PLUGIN_ROOT as PACKAGE_ROOT } from '../helpers/roots.ts'` (keep the rest of each file; drop `join` from the `node:path` import when unused).
- `test/distribution/dev-resolution.test.ts`: replace `const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..')` by `import { PROJECT_ROOT } from '../helpers/roots.ts'`, use `cwd: PROJECT_ROOT`, and after `assert.match(result.stdout, /ok/)` nothing else changes. The project's `node_modules/@esliph/ownership` links `./plugin`, which is what this proves.
- `test/distribution/lockfile.test.ts`, replace the whole file:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { PROJECT_ROOT } from '../helpers/roots.ts'

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

/**
 * Copies `files` (paths relative to the project) into a throwaway directory,
 * re-locks in `cwd` and returns the lockfile packages as re-locked. The lockfile
 * goes along: npm then only changes what package.json asks for.
 */
function relock(files: readonly string[], cwd: string, lockfile: string): { expected: unknown; actual: unknown } {
  const isolated = mkdtempSync(join(tmpdir(), 'ownership-lock-'))

  try {
    for (const file of files) {
      mkdirSync(dirname(join(isolated, file)), { recursive: true })
      copyFileSync(join(PROJECT_ROOT, file), join(isolated, file))
    }
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: join(isolated, cwd), encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)

    return { expected: packagesOf(join(PROJECT_ROOT, lockfile)), actual: packagesOf(join(isolated, lockfile)) }
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
}

test('the runtime lockfile of the distributed directory is in sync with its package.json', { timeout: 120_000 }, () => {
  const { expected, actual } = relock(['plugin/package.json', 'plugin/package-lock.json'], 'plugin', 'plugin/package-lock.json')

  assert.deepEqual(actual, expected, 'Runtime lockfile out of date. Regenerate it: `cd plugin && npm install --package-lock-only --ignore-scripts`.')
})

test('the development lockfile of the project is in sync with package.json and the plugin it links', { timeout: 120_000 }, () => {
  const { expected, actual } = relock(['package.json', 'package-lock.json', 'plugin/package.json'], '.', 'package-lock.json')

  assert.deepEqual(actual, expected, 'Development lockfile out of date. Regenerate it with `npm install` in plugins/ownership.')
})
```

- [ ] **Step 6: The distributed-directory test**

`plugins/ownership/test/distribution/distributed-dir.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const OUTSIDE = [/^test\//, /^docs\//, /^node_modules\//, /^bin\//, /^(Dockerfile|compose\.yaml|\.dockerignore)$/, /^tsconfig(\..+)?\.json$/, /^eslint\.config\.mjs$/]

test('ADR-0036: the distributed directory carries no test, documentation, toolchain or container file', () => {
  const files = execFileSync('git', ['ls-files', '-z', '--', '.'], { cwd: PLUGIN_ROOT, encoding: 'utf8' }).split('\0').filter(file => file !== '')

  assert.ok(files.length > 30, `scan too empty: ${files.length} file(s)`)
  assert.deepEqual(files.filter(file => OUTSIDE.some(pattern => pattern.test(file))), [])
})

test('ADR-0036: the distributed manifest declares no development dependency, and its lockfile carries none', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package.json'), 'utf8')) as Record<string, unknown>
  const lock = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package-lock.json'), 'utf8')) as { packages: Record<string, { dev?: boolean }> }

  assert.equal(manifest.devDependencies, undefined)
  assert.deepEqual(
    Object.entries(lock.packages).filter(([path, entry]) => path !== '' && entry.dev === true).map(([path]) => path),
    [],
  )
})
```

- [ ] **Step 7: Run the ownership project**

```bash
cd plugins/ownership && npm test && npm run typecheck && npm run lint:check && cd ../..
```
Expected: all pass (the ownership test count grows by 3: two lockfile tests replace one, plus two distributed-dir tests). `packaging.test.ts` runs `npm pack` inside `plugin/`, whose `prepack` finds `tsc` in `plugins/ownership/node_modules/.bin` (npm adds every ancestor `node_modules/.bin` to `PATH`); after it, `git status --short plugins/ownership` shows nothing new (no `dist/`, no `.tgz`). If `prepack` cannot find `tsc`, stop and report — do not add TypeScript to the runtime manifest.

- [ ] **Step 8: Living-docs follows the core's new path (interim layout)**

`packages/living-docs/package.json`: `"@esliph/ownership": "file:../ownership"` → `"@esliph/ownership": "file:../../plugins/ownership/plugin"`.

Regenerate its lockfile outside the workspace (inside it, npm would rewrite the root lockfile instead), in the layout the lockfile test reproduces, then the root workspace lock:

```bash
T=$(mktemp -d) && mkdir -p "$T/packages/living-docs" "$T/plugins/ownership/plugin"
cp packages/living-docs/package.json packages/living-docs/package-lock.json "$T/packages/living-docs/"
cp plugins/ownership/plugin/package.json "$T/plugins/ownership/plugin/"
(cd "$T/packages/living-docs" && npm install --package-lock-only --ignore-scripts)
cp "$T/packages/living-docs/package-lock.json" packages/living-docs/package-lock.json && rm -rf "$T"
npm install
npm ci
```

(`plugins/ownership` and, in Task 5, `plugins/living-docs` are not matched by the root `workspaces: ["packages/*"]`, so npm treats them as standalone projects.)

`packages/living-docs/test/distribution/lockfile.test.ts`: the sibling now sits at `../../plugins/ownership/plugin` from the package. Replace the body of the test with:

```ts
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))
  const pkg = join(isolated, 'packages', 'living-docs')
  const core = join(isolated, 'plugins', 'ownership', 'plugin')

  try {
    mkdirSync(pkg, { recursive: true })
    mkdirSync(core, { recursive: true })
    copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(pkg, 'package.json'))
    copyFileSync(join(PACKAGE_ROOT, 'package-lock.json'), join(pkg, 'package-lock.json'))
    copyFileSync(join(CORE_ROOT, 'package.json'), join(core, 'package.json'))
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: pkg, encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(
      packagesOf(join(pkg, 'package-lock.json')),
      packagesOf(join(PACKAGE_ROOT, 'package-lock.json')),
      'Outdated lockfile. Regenerate it with `npm install --package-lock-only --ignore-scripts` in the package.',
    )
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
```

and `const CORE_ROOT = join(PACKAGE_ROOT, '..', '..', 'plugins', 'ownership', 'plugin')`.

`packages/living-docs/test/distribution/dev-resolution.test.ts`: `/packages\/ownership\/src\/index\.ts/` → `/plugins\/ownership\/plugin\/src\/index\.ts/`.

`packages/living-docs/test/plugin/manifest.test.ts`:
- `hookNames(join(ROOT, '..', 'ownership'))` → `hookNames(join(CHECKOUT, 'plugins', 'ownership', 'plugin'))`
- `join(ROOT, '..', 'ownership', '.claude-plugin/plugin.json')` → `join(CHECKOUT, 'plugins', 'ownership', 'plugin', '.claude-plugin/plugin.json')`
- `assert.equal(entry.source, './packages/ownership')` → `assert.equal(entry.source, './plugins/ownership/plugin')`

- [ ] **Step 9: Marketplace, ownership files, CODEOWNERS**

`.claude-plugin/marketplace.json`: the `ownership` entry's `"source": "./packages/ownership"` → `"source": "./plugins/ownership/plugin"`.

`plugins/ownership/.ownership.yml`:

```yaml
# Paths of the ownership plugin project, relative to this directory. The root
# .ownership.yml includes this file; paths are disjoint across files.
version: 2

owned:
  - path: .ownership.yml
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
    living-docs: {}
  - path: README.md
    owner: '@esliph/engineering'
    living-docs: { audience: external }
  - path: CHANGELOG.md
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }

  # --- Owner only: code and toolchain.
  - path: plugin/
    owner: '@esliph/engineering'
  - path: test/
    owner: '@esliph/engineering'
  - path: package.json
    owner: '@esliph/engineering'
  - path: package-lock.json
    owner: '@esliph/engineering'
  - path: tsconfig.json
    owner: '@esliph/engineering'
  - path: tsconfig.build.json
    owner: '@esliph/engineering'
  - path: eslint.config.mjs
    owner: '@esliph/engineering'
  - path: .gitignore
    owner: '@esliph/engineering'

ignore:
  - 'plugin/dist/**'

watches:
  - code: 'plugin/src/cli/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'subcommand, option and exit code of the core are public contract'

  - code: 'plugin/{.claude-plugin,hooks}/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'the core plugin is what whoever installs receives in the session'
```

Root `.ownership.yml`:
- Add, after `living-docs:` block and before `owned:`:
  ```yaml
  # Each plugin project declares its own paths (ADR-0036).
  include:
    - plugins/ownership/
  ```
- Delete the owned entry `- path: packages/ownership/` (with its `owner` line).
- In `cited-by` of RF, RNF and RN: `'packages/ownership/test/**'` → `'plugins/ownership/test/**'`; `'packages/ownership/src/**'` → `'plugins/ownership/plugin/src/**'`.
- Watch `code: 'packages/ownership/src/{checks,hooks}/**'` → `code: 'plugins/ownership/plugin/src/{checks,hooks}/**'`.
- Delete the two consumer-visible watches whose `code` is `packages/ownership/src/cli/**` and `packages/ownership/{.claude-plugin,hooks}/**` (they now live in the plugin's file, pointing at its own CHANGELOG).

`CODEOWNERS`: `packages/ownership/ @esliph/engineering` → `plugins/ownership/ @esliph/engineering`.

`docs/open-decisions.md`, row `DA-0004`, column `Blocks`: `` `packages/ownership/src/hooks/promotion-guard.ts` `` → `` `plugins/ownership/plugin/src/hooks/promotion-guard.ts` ``.

- [ ] **Step 10: CHANGELOG split for `ownership`**

Create `plugins/ownership/CHANGELOG.md`:

```markdown
# Changelog

This file is aimed at whoever **consumes** the `ownership` plugin. Single test:
if an entry only makes sense to whoever wrote the code, it does not belong here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

An entry is born in the PR that causes the change, not on the eve of the release.

## [Unreleased]
```

Move from the root `CHANGELOG.md` every entry whose subject is the `ownership` plugin or its CLI (it names `ownership validate`, `ownership explain`, the core's hooks, the root ownership file schema, `owner-coverage`, `generated-drift`, `watches`, or "the core"), keeping each under the same `### Added` / `### Changed` / … subsection and in the same order; delete them from the root file. An entry that mixes both plugins stays in the root for now (Task 5 splits the rest). List the moved first lines in the commit body.

- [ ] **Step 11: READMEs and the old workflow**

- `README.md` (root): `packages/ownership/README.md` → `plugins/ownership/README.md`.
- `plugins/ownership/README.md:96-97`: `` `node packages/ownership/src/cli/index.ts` `` → `` `node plugins/ownership/plugin/src/cli/index.ts` ``.
- `plugins/ownership/plugin/hooks/run-hook.sh` comment line 7: `hooks/ and src/ live side by side in packages/ownership/` → `hooks/ and src/ live side by side in the plugin directory`.
- `.github/workflows/living-docs.yml`: every `packages/ownership/src/cli/index.ts` → `plugins/ownership/plugin/src/cli/index.ts`. The root `npm ci`/`npm test` stay (they now cover living-docs only).

- [ ] **Step 12: The ownership workflow**

`.github/workflows/plugin-ownership.yml`:

```yaml
name: plugin-ownership

on:
  push:
    paths: &paths
      - 'plugins/ownership/**'
      - '.github/workflows/plugin-ownership.yml'
  pull_request:
    paths: *paths

defaults:
  run:
    working-directory: plugins/ownership

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          # The floor is `engines.node` in package.json (RNF-0002).
          node-version: '24'
          cache: npm
          cache-dependency-path: plugins/ownership/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Tests
        run: npm test

      - name: Type-check
        run: npm run typecheck

      - name: Lint
        run: npm run lint:check
```

- [ ] **Step 13: Run everything**

```bash
npm test
npm run typecheck
(cd plugins/ownership && npm test && npm run typecheck && npm run lint:check)
node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
```
Expected: all pass, both validates clean, `ownership-globs.test.ts` green. If `living-docs/external-audience` reports an ID in `plugins/ownership/README.md`, rewrite that sentence in running text.

- [ ] **Step 14: Commit**

```bash
git add -A plugins/ownership packages .claude-plugin CODEOWNERS .ownership.yml CHANGELOG.md README.md docs/open-decisions.md .github/workflows package-lock.json
git status --short   # nothing unintended; .claude/settings.json stays untracked
git commit -m "refactor(ADR-0036): move ownership to plugins/ownership/{plugin,test}

DA-0004 blocks the promotion guard at its new path.
Moved CHANGELOG entries: <first line of each>

Docs: none — relocation, no behavior change; the Definition of Done line follows with the agent contracts (ADR-0036)
Changelog: none — relocation; the marketplace entry is written with the living-docs move

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Move `living-docs` to `plugins/living-docs/`

**Files:**
- Move: `packages/living-docs/{.claude-plugin,agents,commands,hooks,skills,src,templates}` → `plugins/living-docs/plugin/`; `packages/living-docs/test` → `plugins/living-docs/test`; `packages/living-docs/{README.md,tsconfig.json}` → `plugins/living-docs/`; `Dockerfile`, `compose.yaml`, `.dockerignore`, `bin/` → `plugins/living-docs/`
- Create: `plugins/living-docs/plugin/package.json`, `plugins/living-docs/plugin/package-lock.json`, `plugins/living-docs/package.json`, `plugins/living-docs/package-lock.json`, `plugins/living-docs/eslint.config.mjs`, `plugins/living-docs/CHANGELOG.md`, `plugins/living-docs/.ownership.yml`, `plugins/living-docs/test/distribution/distributed-dir.test.ts`, `.github/workflows/plugin-living-docs.yml`
- Delete: `.github/workflows/wrapper-docker.yml`, `packages/`
- Modify: `plugins/living-docs/test/helpers/checkout.ts`, tests listed in Step 6, `plugins/living-docs/plugin/hooks/run-hook.sh` (comment), `plugins/living-docs/bin/{dev,living-docs}`, `plugins/living-docs/{Dockerfile,compose.yaml}`, `plugins/living-docs/README.md:101-103`
- Modify: `.claude-plugin/marketplace.json`, `.ownership.yml`, `CODEOWNERS`, `CHANGELOG.md`, `README.md`, `.prettierignore`, `.github/workflows/living-docs.yml`, `docs/decisions/debt/TDR-0003-local-dependency-on-the-core.md` (`pay-when.paths` — the TDR is `open`, not frozen)

**Interfaces:**
- Consumes: the core at `plugins/ownership/plugin` (Task 4).
- Produces: `checkoutRoot(): string` and `projectRoot(): string` from `plugins/living-docs/test/helpers/checkout.ts`; `toolkitRoot()` (unchanged code) now resolves to `plugins/living-docs/plugin`.

- [ ] **Step 1: Move the files**

```bash
mkdir -p plugins/living-docs/plugin
for d in .claude-plugin agents commands hooks skills src templates; do git mv "packages/living-docs/$d" "plugins/living-docs/plugin/$d"; done
git mv packages/living-docs/test plugins/living-docs/test
git mv packages/living-docs/README.md plugins/living-docs/README.md
git mv packages/living-docs/tsconfig.json plugins/living-docs/tsconfig.json
git mv Dockerfile compose.yaml .dockerignore plugins/living-docs/
git mv bin plugins/living-docs/bin
git rm -q packages/living-docs/package.json packages/living-docs/package-lock.json
git ls-files packages
```
Expected: the last command prints nothing. `git ls-files -s plugins/living-docs/bin plugins/living-docs/plugin/hooks/run-hook.sh` shows `100755` for all three scripts.

- [ ] **Step 2: The two `package.json`, tsconfig, eslint**

`plugins/living-docs/plugin/package.json`:

```json
{
  "name": "@esliph/living-docs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "dependencies": {
    "@esliph/ownership": "file:../../ownership/plugin",
    "picomatch": "^4.0.2",
    "yaml": "^2.6.0"
  }
}
```

`plugins/living-docs/package.json`:

```json
{
  "name": "@esliph/living-docs-project",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "test": "node --conditions=development --test \"test/**/*.test.ts\"",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --fix",
    "lint:check": "eslint .",
    "format": "prettier --ignore-path ../../.prettierignore --write .",
    "format:check": "prettier --ignore-path ../../.prettierignore --check ."
  },
  "devDependencies": {
    "@esliph/living-docs": "file:./plugin",
    "@esliph/ownership": "file:../ownership/plugin",
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.0.0",
    "@types/picomatch": "^3.0.1",
    "eslint": "^10.9.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.6",
    "globals": "^17.12.0",
    "prettier": "^3.9.6",
    "typescript": "^5.9.0",
    "typescript-eslint": "^8.69.0"
  }
}
```

`plugins/living-docs/tsconfig.json`: `"include"` → `["plugin/src/**/*.ts", "test/**/*.ts"]`.

`plugins/living-docs/eslint.config.mjs`: copy the root `eslint.config.mjs` byte for byte.

- [ ] **Step 3: Lockfiles and install (core first)**

```bash
(cd plugins/ownership && npm ci)
cd plugins/living-docs/plugin && npm install --package-lock-only --ignore-scripts && cd ..
npm install
npm ci
ls plugin/node_modules 2>/dev/null; echo "plugin/node_modules absent: $?"
cd ../..
```
Expected: `plugin/node_modules absent:` non-zero.

- [ ] **Step 4: Rewrite source imports in tests**

```bash
cd plugins/living-docs
grep -rlE "from '(\.\./)+src/|import\('(\.\./)+src/" test | xargs sed -i -E "/^(import|export) .* from '|import\('/ s#'((\.\./)+)src/#'\1plugin/src/#g"
grep -rnE "from '(\.\./)+src/" test; echo "left: $?"
cd ../..
```
Expected: `left: 1` (no import still points at `src/` without `plugin/`).

- [ ] **Step 5: Roots helper**

`plugins/living-docs/test/helpers/checkout.ts`, replace the whole file:

```ts
import { join, resolve } from 'node:path'
import { toolkitRoot } from '../../plugin/src/core/roots.ts'

/**
 * Root of this repository's checkout: where the root `.ownership.yml`, `CLAUDE.md`,
 * `CODEOWNERS` and `.claude-plugin/marketplace.json` live, and what the
 * dogfooding tests validate as a whole.
 *
 * It is not `toolkitRoot()`: the toolkit is the distributed directory
 * `plugins/living-docs/plugin/`, three levels below the checkout (RNF-0003).
 * And it is not `repoRoot()`: that reads the working directory, and `npm test`
 * runs with the cwd in the project.
 */
export function checkoutRoot(): string {
  return resolve(join(toolkitRoot(), '..', '..', '..'))
}

/** Root of the living-docs project: its tests, its documentation, its container and `bin/` (ADR-0036). */
export function projectRoot(): string {
  return resolve(join(toolkitRoot(), '..'))
}
```

- [ ] **Step 6: Path fixes in tests**

In `plugins/living-docs/test/`:

- `core/roots.test.ts:78`: `resolve(join(import.meta.dirname, '..', '..'))` → `resolve(join(import.meta.dirname, '..', '..', 'plugin'))`; the comment above becomes `// src/core/roots.ts sits two levels below plugin/, and this file two levels below the project: the derivation is the same, and it is what is asserted.`
- `distribution/dev-resolution.test.ts`: the first test's `script` becomes (Review Focus 2 — importing the core loads `yaml` from the core's own real path):
  ```ts
  const script = 'import("@esliph/ownership").then(m => { if (typeof m.resolveOwnership !== "function") throw new Error("did not resolve through the source"); m.resolveOwnership(process.cwd()); console.log(import.meta.resolve("@esliph/ownership")) })'
  ```
  and the regex stays `/plugins\/ownership\/plugin\/src\/index\.ts/`.
- `distribution/lockfile.test.ts`: replace the whole file with the two-lockfile version below.
- `distribution/plugin-cache.test.ts:108` comment: `` `file:../ownership` `` → `` `file:../../ownership/plugin` ``.
- `distribution/internal-trail.test.ts`: the README moved to the project. Replace
  ```ts
  const PLUGIN_FILES = ['README.md'] as const
  ```
  by
  ```ts
  const PLUGIN_FILES = [join('..', 'README.md')] as const
  ```
  and update its comment: `/** The project README presents the plugin to whoever installs it (ADR-0035); it sits beside the distributed directory. */`
- `plugin/manifest.test.ts`:
  - `hookNames(join(CHECKOUT, 'plugins', 'ownership', 'plugin'))` stays (Task 4).
  - `assert.equal(entry?.source, './packages/living-docs')` → `assert.equal(entry?.source, './plugins/living-docs/plugin')`; the comment above it becomes `// The plugin directory is the distributed directory: src/, templates/ and the runtime lockfile are inside what the cache copies; tests and docs are not (ADR-0036).`
- `plugin/wrapper-docker.test.ts`: import `projectRoot` too; `const ROOT = checkoutRoot()` → `const ROOT = projectRoot()` and add `const CHECKOUT = checkoutRoot()`; `gitMode` keeps `cwd: ROOT` (paths `bin/dev` are project-relative); in the bin/living-docs regex `packages\/living-docs\/src\/cli\/index\.ts` → `plugin\/src\/cli\/index\.ts`; in the watches test use `loadLivingDocsConfig(CHECKOUT)`, match `'plugins/living-docs/bin/dev'` and `'plugins/living-docs/bin/living-docs'`, and expect `['plugins/living-docs/CHANGELOG.md']` as the doc list.
- `docs/release-history.test.ts`: `'bin/**'` → `'plugins/living-docs/bin/**'`; `'packages/living-docs/src/cli/**'` → `'plugins/living-docs/plugin/src/cli/**'`; each `'packages/living-docs/<x>'` in the visible list → `'plugins/living-docs/plugin/<x>'`; the not-public list becomes `['plugins/living-docs/plugin/src/core/roots.ts', 'plugins/living-docs/test/smoke.test.ts', 'plugins/living-docs/package.json', 'plugins/living-docs/plugin/package.json']`; the `ADR-0006` test expects the set `['CHANGELOG.md', 'plugins/ownership/CHANGELOG.md', 'plugins/living-docs/CHANGELOG.md']` (compare sorted); `RN-0013: the CHANGELOG is consumer-facing` reads `join(projectRoot(), 'CHANGELOG.md')`.
- `checks/budget.test.ts:18`: `packages/living-docs/src/cli/index.ts` → `plugins/living-docs/plugin/src/cli/index.ts`.

New `distribution/lockfile.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { checkoutRoot } from '../helpers/checkout.ts'

const CHECKOUT = checkoutRoot()

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

/**
 * Rebuilds, in a throwaway directory, the part of the checkout that npm reads
 * (the core sits beside living-docs, as `file:` expects), re-locks in `cwd` and
 * returns the re-locked packages. Paths are relative to the checkout.
 */
function relock(files: readonly string[], cwd: string, lockfile: string): { expected: unknown; actual: unknown } {
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))

  try {
    for (const file of files) {
      mkdirSync(dirname(join(isolated, file)), { recursive: true })
      copyFileSync(join(CHECKOUT, file), join(isolated, file))
    }
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: join(isolated, cwd), encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)

    return { expected: packagesOf(join(CHECKOUT, lockfile)), actual: packagesOf(join(isolated, lockfile)) }
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
}

const CORE = 'plugins/ownership/plugin/package.json'

test('RNF-0002: the runtime lockfile of the distributed directory is in sync with its package.json', { timeout: 120_000 }, () => {
  const { expected, actual } = relock(
    ['plugins/living-docs/plugin/package.json', 'plugins/living-docs/plugin/package-lock.json', CORE],
    'plugins/living-docs/plugin',
    'plugins/living-docs/plugin/package-lock.json',
  )

  assert.deepEqual(actual, expected, 'Runtime lockfile out of date. Regenerate it: `cd plugins/living-docs/plugin && npm install --package-lock-only --ignore-scripts`.')
})

test('RNF-0002: the development lockfile of the project is in sync with package.json and what it links', { timeout: 120_000 }, () => {
  const { expected, actual } = relock(
    ['plugins/living-docs/package.json', 'plugins/living-docs/package-lock.json', 'plugins/living-docs/plugin/package.json', CORE],
    'plugins/living-docs',
    'plugins/living-docs/package-lock.json',
  )

  assert.deepEqual(actual, expected, 'Development lockfile out of date. Regenerate it with `npm install` in plugins/living-docs.')
})
```

New `distribution/distributed-dir.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../plugin/src/core/roots.ts'

const PLUGIN_ROOT = toolkitRoot()
const OUTSIDE = [/^test\//, /^docs\//, /^node_modules\//, /^bin\//, /^(Dockerfile|compose\.yaml|\.dockerignore)$/, /^tsconfig(\..+)?\.json$/, /^eslint\.config\.mjs$/]

test('ADR-0036: the distributed directory carries no test, documentation, toolchain or container file', () => {
  const files = execFileSync('git', ['ls-files', '-z', '--', '.'], { cwd: PLUGIN_ROOT, encoding: 'utf8' }).split('\0').filter(file => file !== '')

  assert.ok(files.length > 50, `scan too empty: ${files.length} file(s)`)
  assert.deepEqual(files.filter(file => OUTSIDE.some(pattern => pattern.test(file))), [])
})

test('ADR-0036: the distributed manifest declares no development dependency, and its lockfile carries none', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package.json'), 'utf8')) as Record<string, unknown>
  const lock = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package-lock.json'), 'utf8')) as { packages: Record<string, { dev?: boolean }> }

  assert.equal(manifest.devDependencies, undefined)
  assert.deepEqual(
    Object.entries(lock.packages).filter(([path, entry]) => path !== '' && entry.dev === true).map(([path]) => path),
    [],
  )
})
```

Any other test that fails on a path follows the same rule: a file of the living-docs project is read from `projectRoot()`, a repository-wide file from `checkoutRoot()`, and a file of the distributed directory from `toolkitRoot()`.

- [ ] **Step 7: Hooks, container, wrappers**

`plugins/living-docs/plugin/hooks/run-hook.sh`, lines 78-81 comment become:

```bash
# The `development` condition resolves @esliph/ownership through the core's src/
# (file:../../ownership/plugin): a checkout has no dist/, and that is what keeps
# stale code from running silently. Outside the checkout (marketplace cache) that
# path does not exist, and the hook fails open until the core is published on npm.
```

`plugins/living-docs/Dockerfile`, replace from `WORKDIR` to the `ENV` block:

```dockerfile
# The whole checkout is mounted at /opt/esliph: living-docs depends on the core by
# path (plugins/ownership/plugin). The validated repository is mounted at
# /workspace — distinct things per ADR-0003, even when they are the same checkout.
WORKDIR /opt/esliph/plugins/living-docs
RUN mkdir -p /opt/esliph/plugins/living-docs/node_modules /opt/esliph/plugins/ownership/node_modules /workspace \
 && chown -R node:node /opt/esliph /workspace

USER node
ENV LIVING_DOCS_TOOLKIT_ROOT=/opt/esliph/plugins/living-docs/plugin \
    LIVING_DOCS_REPO_ROOT=/workspace
```

`plugins/living-docs/compose.yaml`:

```yaml
services:
  toolkit:
    build: .
    container_name: esliph-living-docs
    working_dir: /opt/esliph/plugins/living-docs
    user: node
    init: true
    volumes:
      # The whole checkout, with no build step (ADR-0001): living-docs needs the
      # core beside it while it depends on it by path.
      - ../..:/opt/esliph
      # The validated repository. Without LIVING_DOCS_TARGET, it is this same checkout:
      # dogfooding through both paths, with the separation truly exercised.
      - ${LIVING_DOCS_TARGET:-../..}:/workspace
      - node_modules:/opt/esliph/plugins/living-docs/node_modules
      - ownership_node_modules:/opt/esliph/plugins/ownership/node_modules
    environment:
      LIVING_DOCS_TOOLKIT_ROOT: /opt/esliph/plugins/living-docs/plugin
      LIVING_DOCS_REPO_ROOT: /workspace
    command: ['sleep', 'infinity']

volumes:
  node_modules:
  ownership_node_modules:
```

`plugins/living-docs/bin/dev`:
- Header comment line `packages/living-docs/hooks/run-hook.sh invokes node directly.` → `plugin/hooks/run-hook.sh invokes node directly.`
- The derivation comment (`# One level above bin/ — …`) → `# One level above bin/ — the living-docs project, where compose.yaml lives (ADR-0003: the root comes from the file's own path, never from the caller's working directory).`
- Both `-w /opt/living-docs` → `-w /opt/esliph/plugins/living-docs`.
- Comment `# The working dir is /opt/living-docs because …` → `# The working dir is the living-docs project because that is where npm makes sense.` (rest of the paragraph unchanged).
- The last line's bootstrap becomes (core first, as on the host):
  ```bash
  exec docker exec -i ${TTY[@]+"${TTY[@]}"} -w /opt/esliph/plugins/living-docs "$CONTAINER" \
    bash -c '[ -d ../ownership/node_modules/yaml ] || (cd ../ownership && npm ci >&2); [ -d node_modules/yaml ] || npm ci >&2; exec "$@"' -- "$@"
  ```

`plugins/living-docs/bin/living-docs`:

```bash
#!/usr/bin/env bash
# Runs the toolkit CLI through the optional containerized path (RNF-0006).
# Delegation, not implementation: all the conversation with the daemon lives in bin/dev, and
# a second place holding it would be a second place to diverge (ADR-0016).
#
# On the host, the equivalent command is `node --conditions=development plugin/src/cli/index.ts …`,
# run from plugins/living-docs/ (RNF-0002).
exec "$(dirname "${BASH_SOURCE[0]}")/dev" node --conditions=development plugin/src/cli/index.ts "$@"
```

`plugins/living-docs/README.md:101-103` (its contributing block): replace the `npm ci` / `node --conditions=development packages/living-docs/src/cli/index.ts validate` lines with:

```bash
(cd plugins/ownership && npm ci)
cd plugins/living-docs && npm ci && npm test
node --conditions=development plugin/src/cli/index.ts validate
```

- [ ] **Step 8: Marketplace, ownership files, CODEOWNERS, prettierignore, TDR-0003**

`.claude-plugin/marketplace.json`: living-docs `"source": "./packages/living-docs"` → `"source": "./plugins/living-docs/plugin"`.

`plugins/living-docs/.ownership.yml`:

```yaml
# Paths of the living-docs plugin project, relative to this directory. The root
# .ownership.yml includes this file; paths are disjoint across files.
version: 2

owned:
  - path: .ownership.yml
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
    living-docs: {}
  - path: README.md
    owner: '@esliph/engineering'
    living-docs: { audience: external }
  - path: CHANGELOG.md
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }

  # --- Owner only: code, toolchain and container.
  - path: plugin/
    owner: '@esliph/engineering'
  - path: test/
    owner: '@esliph/engineering'
  - path: bin/
    owner: '@esliph/engineering'
  - path: package.json
    owner: '@esliph/engineering'
  - path: package-lock.json
    owner: '@esliph/engineering'
  - path: tsconfig.json
    owner: '@esliph/engineering'
  - path: eslint.config.mjs
    owner: '@esliph/engineering'
  - path: Dockerfile
    owner: '@esliph/engineering'
  - path: compose.yaml
    owner: '@esliph/engineering'
  - path: .dockerignore
    owner: '@esliph/engineering'

watches:
  - code: 'plugin/src/cli/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'subcommand, option and exit code are public contract (the versioning policy)'

  - code: 'plugin/src/checks/catalog.ts'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'the identifiers of the checks are public and do not change meaning'

  - code: 'plugin/src/config/ownership.ts'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'the living-docs block of the ownership file is the contract of whoever installs'

  - code: 'plugin/{.claude-plugin,hooks,commands,skills,agents}/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'skill, hook and command identifiers are public'

  - code: 'plugin/templates/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'it is what `init` writes in the repository of whoever installs'

  - code: 'bin/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'the wrapper is a public entry point of the toolkit — changing how it is invoked changes what whoever consumes uses'
```

Root `.ownership.yml`:
- `include:` gains `- plugins/living-docs/`.
- Delete the owned entries `packages/living-docs/`, `bin/`, `.dockerignore`, `Dockerfile`, `compose.yaml`.
- `cited-by`: `'packages/living-docs/test/**'` → `'plugins/living-docs/test/**'`; `'packages/living-docs/src/**'` → `'plugins/living-docs/plugin/src/**'`.
- `generated[0].command` → `node --conditions=development plugins/living-docs/plugin/src/tools/gen-checks.ts`.
- Watches that stay in the root (their docs are still at the root until Task 7), with the new code paths:
  - `packages/living-docs/src/checks/**` → `plugins/living-docs/plugin/src/checks/**` (doc `docs/requirements/rules.md`)
  - `packages/living-docs/src/checks/catalog.ts` → `plugins/living-docs/plugin/src/checks/catalog.ts` (doc `docs/contracts/checks.gen.md`)
  - `packages/living-docs/src/hooks/**` → `plugins/living-docs/plugin/src/hooks/**` (doc `docs/requirements/rules.md`)
  - `packages/living-docs/src/cli/**` → `plugins/living-docs/plugin/src/cli/**` (doc `docs/requirements/functional.md`)
  - `packages/living-docs/src/core/**` → `plugins/living-docs/plugin/src/core/**` (doc `docs/requirements/non-functional.md`)
  - `packages/living-docs/skills/**` → `plugins/living-docs/plugin/skills/**` (doc `CONTRIBUTING.md`)
- Delete the root consumer-visible watches whose code is under `packages/living-docs/` or `bin/**` (they moved to the plugin file). The root keeps `.github/workflows/** → docs/definition-of-done.md` and `.github/workflows/** → CHANGELOG.md` (consumer-visible).

`CODEOWNERS`: `packages/living-docs/ @esliph/engineering` → `plugins/living-docs/ @esliph/engineering`; delete the lines `bin/`, `.dockerignore`, `Dockerfile`, `compose.yaml`.

`.prettierignore`: `packages/living-docs/templates/` → `plugins/living-docs/plugin/templates/`.

`docs/decisions/debt/TDR-0003-local-dependency-on-the-core.md`: `pay-when.paths` item `packages/living-docs/package.json` → `plugins/living-docs/plugin/package.json` (the TDR is `open`, and a trigger on a path that no longer exists can never fire).

- [ ] **Step 9: CHANGELOG split for `living-docs`, and the marketplace's own**

Create `plugins/living-docs/CHANGELOG.md` with the same header as the ownership one, but `the \`living-docs\` plugin`, and move into it every entry left in the root `CHANGELOG.md` that is about living-docs (the rest). An entry that named both plugins is split into one entry per file.

Then replace the root `CHANGELOG.md` with:

```markdown
# Changelog

This file is aimed at whoever installs plugins from this marketplace. Each
plugin keeps its own changelog in its directory under `plugins/`.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

An entry is born in the PR that causes the change, not on the eve of the release.

## [Unreleased]

### Changed

- Each plugin now lives in its own directory under `plugins/`, and the
  marketplace installs it from that directory's `plugin/` folder. Installing by
  name (`/plugin install living-docs@esliph`) does not change.
```

`README.md` (root): `packages/living-docs/README.md` → `plugins/living-docs/README.md`.

- [ ] **Step 10: Workflows**

Create `.github/workflows/plugin-living-docs.yml`:

```yaml
name: plugin-living-docs

on:
  push:
    paths: &paths
      - 'plugins/living-docs/**'
      # While living-docs depends on the core by path (TDR-0003), a change in
      # the core can break it.
      - 'plugins/ownership/**'
      - '.github/workflows/plugin-living-docs.yml'
  pull_request:
    paths: *paths

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: plugins/living-docs
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          # The floor is `engines.node` in package.json (RNF-0002).
          node-version: '24'
          cache: npm
          cache-dependency-path: plugins/*/package-lock.json

      # The core's source resolves its own dependencies from its real path.
      - name: Install the core's dependencies
        working-directory: plugins/ownership
        run: npm ci

      - name: Install dependencies
        run: npm ci

      - name: Tests
        run: npm test

      - name: Type-check
        run: npm run typecheck

      - name: Lint
        run: npm run lint:check

  # The `paths` filter is per workflow and not per job, and a third-party action
  # for it is not an option (ADR-0016): the diff decides here.
  container-changes:
    runs-on: ubuntu-latest
    outputs:
      container: ${{ steps.diff.outputs.container }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - id: diff
        env:
          BASE: ${{ github.event_name == 'pull_request' && github.event.pull_request.base.sha || github.event.before }}
        run: |
          # A new branch has no `before`: run the container job rather than guess.
          if [ -z "$BASE" ] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
            echo container=true >> "$GITHUB_OUTPUT"
            exit 0
          fi
          if git diff --name-only "$BASE" HEAD -- \
              plugins/living-docs/Dockerfile plugins/living-docs/compose.yaml plugins/living-docs/.dockerignore \
              plugins/living-docs/bin/ plugins/living-docs/package.json plugins/living-docs/package-lock.json \
              plugins/living-docs/plugin/package.json plugins/living-docs/plugin/package-lock.json \
              plugins/ownership/package.json plugins/ownership/package-lock.json plugins/ownership/plugin/package.json \
              .github/workflows/plugin-living-docs.yml | grep -q .; then
            echo container=true >> "$GITHUB_OUTPUT"
          else
            echo container=false >> "$GITHUB_OUTPUT"
          fi

  container:
    needs: container-changes
    if: needs.container-changes.outputs.container == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: plugins/living-docs
    steps:
      - uses: actions/checkout@v4

      # The container runs as `node` (uid 1000), and the runner's checkout belongs
      # to another uid.
      - name: Hand the checkout to the container user
        working-directory: .
        run: sudo chown -R 1000:1000 "$GITHUB_WORKSPACE"

      # Bringing the container up in its own step keeps build time attributable:
      # an image failure does not disguise itself as a test failure.
      - name: Start the container
        run: docker compose up -d

      # Through the wrapper, what the host already runs (RNF-0006 parity).
      - name: Tests, through the wrapper
        run: bin/dev npm test

      - name: Living documentation, through the wrapper
        run: bin/dev node --conditions=development plugin/src/cli/index.ts validate
```

`git rm .github/workflows/wrapper-docker.yml`.

`.github/workflows/living-docs.yml`: replace the steps from `Install dependencies` through `Type-check` with:

```yaml
      - name: Install the core
        working-directory: plugins/ownership
        run: npm ci

      - name: Install living-docs
        working-directory: plugins/living-docs
        run: npm ci
```

and every `packages/living-docs/src/cli/index.ts` → `plugins/living-docs/plugin/src/cli/index.ts`. Change `cache: npm` to add `cache-dependency-path: plugins/*/package-lock.json`.

- [ ] **Step 11: Run everything**

```bash
(cd plugins/ownership && npm test && npm run typecheck && npm run lint:check)
(cd plugins/living-docs && npm test && npm run typecheck && npm run lint:check)
node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate
node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate
```
Expected: all pass; both validates clean. If Docker is available: `cd plugins/living-docs && bin/dev npm test && bin/living-docs validate`; otherwise say so in the report — CI's `container` job covers it.

- [ ] **Step 12: Commit**

```bash
git add -A plugins packages .claude-plugin CODEOWNERS .ownership.yml CHANGELOG.md README.md .prettierignore .github docs/decisions/debt/TDR-0003-local-dependency-on-the-core.md Dockerfile compose.yaml .dockerignore bin
git status --short
git commit -m "refactor(ADR-0036): move living-docs to plugins/living-docs/{plugin,test}

TDR-0003 watches the dependency at its new path.
The container, bin/ and the wrapper job move with the plugin.

Docs: none — relocation, no behavior change; the Definition of Done line follows with the agent contracts (ADR-0036)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Strip the root toolchain; `marketplace.yml` (RN-0041)

**Files:**
- Create: `.github/scripts/check-marketplace.mjs`, `.github/scripts/check-marketplace.test.mjs`, `.github/workflows/marketplace.yml`, `.editorconfig`
- Delete: `package.json`, `package-lock.json`, `eslint.config.mjs`, `.github/workflows/living-docs.yml`, root `node_modules/` (untracked)
- Modify: `.ownership.yml`, `CODEOWNERS`, `README.md` (Contributing), `docs/requirements/rules.md` (entry `cited-by` only, via `.ownership.yml`)

**Interfaces:**
- Produces: `checkMarketplace(root: string): string[]` exported from `.github/scripts/check-marketplace.mjs` — each string is one problem, prefixed by the plugin name.

- [ ] **Step 1: Write the failing test**

`.github/scripts/check-marketplace.test.mjs`:

```js
// RN-0041: the marketplace and each plugin's minimum governance.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { checkMarketplace } from './check-marketplace.mjs'

function repo(files) {
  const root = mkdtempSync(join(tmpdir(), 'marketplace-'))

  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), typeof content === 'string' ? content : JSON.stringify(content))
  }

  return root
}

function marketplace(plugins) {
  return { name: 'm', owner: { name: 'o' }, plugins }
}

const GOVERNED = {
  'plugins/a/plugin/.claude-plugin/plugin.json': { name: 'a', version: '1.0.0' },
  'plugins/a/README.md': '# a\n',
  'plugins/a/CHANGELOG.md': '# Changelog\n',
  'plugins/a/.ownership.yml': 'version: 2\nowned: []\n',
}

function check(files) {
  const root = repo(files)

  try {
    return checkMarketplace(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('RN-0041: a governed plugin passes', () => {
  assert.deepEqual(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', version: '1.0.0', source: './plugins/a/plugin' }]) }), [])
})

test('RN-0041: an unparsable manifest is reported', () => {
  assert.match(check({ '.claude-plugin/marketplace.json': '{' }).join('\n'), /marketplace\.json/)
  assert.match(
    check({ ...GOVERNED, 'plugins/a/plugin/.claude-plugin/plugin.json': '{', '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './plugins/a/plugin' }]) }).join('\n'),
    /plugin\.json/,
  )
})

test('RN-0041: a missing source, a missing plugin.json and a mismatched name or version are reported by plugin', () => {
  assert.match(check({ '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './plugins/a/plugin' }]) }).join('\n'), /^a: .*does not exist/m)

  const { 'plugins/a/plugin/.claude-plugin/plugin.json': _manifest, ...withoutManifest } = GOVERNED

  assert.match(
    check({ ...withoutManifest, 'plugins/a/plugin/x.md': 'x', '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './plugins/a/plugin' }]) }).join('\n'),
    /^a: .*\.claude-plugin\/plugin\.json is missing/m,
  )
  assert.match(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'b', source: './plugins/a/plugin' }]) }).join('\n'), /^b: .*name "a"/m)
  assert.match(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', version: '2.0.0', source: './plugins/a/plugin' }]) }).join('\n'), /^a: .*version/m)
})

test('RN-0041: each missing governance file of the project is reported', () => {
  const { 'plugins/a/CHANGELOG.md': _changelog, ...withoutChangelog } = GOVERNED

  assert.deepEqual(check({ ...withoutChangelog, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './plugins/a/plugin' }]) }), [
    'a: plugins/a/CHANGELOG.md is missing.',
  ])
})

test('RN-0041: a source outside the repository, or the repository root itself, is reported', () => {
  assert.match(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: '../elsewhere' }]) }).join('\n'), /^a: .*outside the repository/m)
  assert.match(check({ ...GOVERNED, '.claude-plugin/marketplace.json': marketplace([{ name: 'a', source: './' }]) }).join('\n'), /^a: .*is the repository root/m)
})
```

Run: `node --test ".github/scripts/*.test.mjs"`
Expected: FAIL — `Cannot find module …/check-marketplace.mjs`.

- [ ] **Step 2: Implement**

`.github/scripts/check-marketplace.mjs`:

```js
// The marketplace manifest and the minimum governance of each plugin (RN-0041).
// Plain Node with no dependency: the root has no toolchain (ADR-0036).
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const GOVERNANCE = ['README.md', 'CHANGELOG.md', '.ownership.yml']

function posix(path) {
  return path.split(sep).join('/')
}

function readJson(root, path, problems, who) {
  try {
    return JSON.parse(readFileSync(join(root, path), 'utf8'))
  } catch (error) {
    problems.push(`${who}: ${path} does not parse — ${error instanceof Error ? error.message : String(error)}`)

    return null
  }
}

/** Every problem found, one string each, prefixed by the plugin name. Empty when all holds. */
export function checkMarketplace(root) {
  const problems = []
  const manifest = readJson(root, '.claude-plugin/marketplace.json', problems, 'marketplace')

  if (manifest === null) {
    return problems
  }
  if (!Array.isArray(manifest.plugins) || manifest.plugins.length === 0) {
    return ['marketplace: `plugins` must be a non-empty list.']
  }

  for (const entry of manifest.plugins) {
    const name = typeof entry?.name === 'string' ? entry.name : '(unnamed)'

    if (typeof entry?.source !== 'string') {
      problems.push(`${name}: \`source\` must be a path.`)
      continue
    }

    const source = resolve(root, entry.source)
    const inside = posix(relative(root, source))

    if (inside === '..' || inside.startsWith('../') || resolve(inside) === inside) {
      problems.push(`${name}: source ${entry.source} is outside the repository.`)
      continue
    }
    if (inside === '') {
      problems.push(`${name}: source ${entry.source} is the repository root; it must be the plugin's distributed directory.`)
      continue
    }
    if (!existsSync(source)) {
      problems.push(`${name}: source ${entry.source} does not exist.`)
      continue
    }

    const pluginJson = `${inside}/.claude-plugin/plugin.json`

    if (!existsSync(join(root, pluginJson))) {
      problems.push(`${name}: ${pluginJson} is missing.`)
    } else {
      const plugin = readJson(root, pluginJson, problems, name)

      if (plugin !== null && plugin.name !== entry.name) {
        problems.push(`${name}: ${pluginJson} declares name "${plugin.name}".`)
      }
      if (plugin !== null && entry.version !== undefined && plugin.version !== entry.version) {
        problems.push(`${name}: the marketplace says version ${entry.version} and ${pluginJson} says ${plugin.version}.`)
      }
    }

    const project = posix(relative(root, dirname(source)))

    for (const file of GOVERNANCE) {
      const path = project === '' ? file : `${project}/${file}`

      if (!existsSync(join(root, path))) {
        problems.push(`${name}: ${path} is missing.`)
      }
    }
  }

  return problems
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkMarketplace(resolve(process.argv[2] ?? '.'))

  for (const problem of problems) {
    process.stderr.write(`${problem}\n`)
  }
  if (problems.length === 0) {
    process.stdout.write('marketplace: manifests and plugin governance hold.\n')
  }
  process.exit(problems.length === 0 ? 0 : 1)
}
```

- [ ] **Step 3: Run the test and the script against the repository**

```bash
node --test ".github/scripts/*.test.mjs"
node .github/scripts/check-marketplace.mjs
```
Expected: 5 tests pass; the script prints `marketplace: manifests and plugin governance hold.`

- [ ] **Step 4: `marketplace.yml`, and the old workflow goes**

`.github/workflows/marketplace.yml`:

```yaml
name: marketplace

# Runs on every push and pull request: what only makes sense for the whole
# repository at once — the manifests, ID uniqueness, links across projects and
# owner coverage (ADR-0036).
on:
  push:
  pull_request:

jobs:
  manifests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Marketplace and plugin manifests, and each plugin's governance
        run: node .github/scripts/check-marketplace.mjs

      - name: Tests of the marketplace scripts
        run: node --test ".github/scripts/*.test.mjs"

  governance:
    runs-on: ubuntu-latest
    env:
      # The validated repository is the checkout root (RNF-0003).
      OWNERSHIP_REPO_ROOT: ${{ github.workspace }}
      LIVING_DOCS_REPO_ROOT: ${{ github.workspace }}
    steps:
      - uses: actions/checkout@v4
        with:
          # The diff half compares <base>...HEAD; a shallow clone lacks the base.
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: plugins/*/package-lock.json

      - name: Install the core
        working-directory: plugins/ownership
        run: npm ci

      - name: Install living-docs
        working-directory: plugins/living-docs
        run: npm ci

      - name: Owner, lifecycle and generated artifact
        run: node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate

      - name: Living documentation — tree state
        run: node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate

      # The diff only exists with a base. On `push` there is no base, and inventing one
      # would produce findings about a change that is not this branch's.
      - name: Code→doc link and CHANGELOG entry in the PR diff
        if: github.event_name == 'pull_request'
        run: node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate --base ${{ github.event.pull_request.base.sha }}

      - name: Living documentation in the PR diff
        if: github.event_name == 'pull_request'
        run: node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate --base ${{ github.event.pull_request.base.sha }}
```

`git rm .github/workflows/living-docs.yml`

- [ ] **Step 5: Strip the root toolchain**

```bash
git rm package.json package-lock.json eslint.config.mjs
rm -rf node_modules
```

`.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Root `.ownership.yml`: delete the owned entries `package.json`, `package-lock.json`, `eslint.config.mjs`; add

```yaml
  - path: .editorconfig
    owner: '@esliph/engineering'
```

in the owner-only group; in the RN entry (`docs/requirements/rules.md`) `cited-by` add `'.github/scripts/**'`; add the watch:

```yaml
  - code: '.github/scripts/**'
    doc: docs/requirements/rules.md
    reason: 'a marketplace check is an executable rule — the RN comes first, and it is what the script verifies'
```

`CODEOWNERS`: delete `package.json`, `package-lock.json`, `eslint.config.mjs`; add `.editorconfig @esliph/engineering`.

`README.md` (root), replace the `## Contributing` section with:

````markdown
## Contributing

Each plugin is a project under `plugins/<name>/`, with its own toolchain and
tests; its README says how to work on it. For the two current plugins:

```bash
(cd plugins/ownership && npm ci && npm test)
(cd plugins/living-docs && npm ci && npm test)
```

`living-docs` depends on `ownership` by path, so the first line comes first.
````

- [ ] **Step 6: Run everything from the stripped root**

```bash
(cd plugins/ownership && npm ci && npm test && npm run typecheck && npm run lint:check)
(cd plugins/living-docs && npm ci && npm test && npm run typecheck && npm run lint:check)
node .github/scripts/check-marketplace.mjs
node --test ".github/scripts/*.test.mjs"
node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate
node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate
```
Expected: all pass; no root `node_modules` is needed by any of them.

- [ ] **Step 7: Commit**

```bash
git add -A .github .editorconfig .ownership.yml CODEOWNERS README.md package.json package-lock.json eslint.config.mjs
git commit -m "ci(RN-0041): marketplace.yml checks manifests and governance; the root has no toolchain (ADR-0036)

Docs: none — the Definition of Done line follows with the agent contracts
Changelog: none — the marketplace entry for the restructuring is already under Unreleased

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Redistribute the corpus (ADR-0038)

Three commits, each with every workflow green. Frozen files move with `git mv` — the new path is written and the old one removed in the same commit, content identical.

**Files:**
- Create: `plugins/ownership/docs/…`, `plugins/living-docs/docs/…` (per spec §5)
- Modify: root and plugin `.ownership.yml`, `docs/open-decisions.md`, `docs/requirements/{functional,non-functional,rules}.md` (split), `.prettierignore`
- Modify tests: `plugins/living-docs/test/config/ownership.test.ts` ("this repository" test), `test/docs/agent-contract.test.ts`, `test/docs/contracts.test.ts`, `test/docs/language-and-intent.test.ts`, `test/docs/release-history.test.ts`, `test/contracts/drift.test.ts`

**Interfaces:**
- Consumes: `projectRoot()`, `checkoutRoot()` (Task 5); `loadCodeowners`, `ownersOf` from `@esliph/ownership`.

- [ ] **Step 1: Check the placement against real citations**

Save as `$SCRATCH/citers.mjs` (scratchpad, not committed) and run it from the checkout root with `node --conditions=development $SCRATCH/citers.mjs` after `cd plugins/living-docs && npm ci` (it imports from there):

```js
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const files = execFileSync('git', ['ls-files', '-z', 'plugins/*/test', 'plugins/*/plugin/src', '.github/scripts'], { encoding: 'utf8' }).split('\0').filter(Boolean)
const by = new Map()

for (const file of files) {
  const project = file.startsWith('.github/') ? 'root' : file.split('/')[1]

  for (const [id] of readFileSync(file, 'utf8').matchAll(/\bR(?:NF|N|F)-\d{4}\b/g)) {
    by.set(id, new Set([...(by.get(id) ?? []), project]))
  }
}
for (const [id, projects] of [...by].sort()) console.log(id, [...projects].sort().join(','))
```

Compare with spec §5: an ID cited by `ownership` (alone or with living-docs) belongs to ownership; cited only by living-docs, to living-docs; `RN-0041` to the root. If any ID disagrees with the table, **stop and report the list** — the table is the spec's, and a disagreement is the human's to settle.

- [ ] **Step 2: Commit 7.1 — ADRs and TDRs**

Frozen and draft ADRs move with `git mv` (content identical):

```bash
mkdir -p plugins/ownership/docs/decisions/adr plugins/living-docs/docs/decisions/adr plugins/living-docs/docs/decisions/debt
for n in 0019 0020 0021 0022 0023 0024 0025 0026 0028 0030; do git mv docs/decisions/adr/ADR-$n-*.md plugins/ownership/docs/decisions/adr/; done
for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0013 0015 0016 0017 0018 0029 0032 0034 0037; do git mv docs/decisions/adr/ADR-$n-*.md plugins/living-docs/docs/decisions/adr/; done
git mv docs/decisions/debt/TDR-000*.md plugins/living-docs/docs/decisions/debt/
git rm -q docs/decisions/debt/.gitkeep
ls docs/decisions/adr
```
Expected: the root keeps `ADR-0014, 0027, 0031, 0033, 0035, 0036, 0038` and `.gitkeep`.

Ownership entries: add to `plugins/ownership/.ownership.yml` `owned:` (at the top, before `.ownership.yml`):

```yaml
  # --- Artifacts. The prefix is shared with the other projects; the sequence is one per repository (ADR-0037).
  - path: docs/decisions/adr/
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]
```

and to `plugins/living-docs/.ownership.yml` the same ADR entry plus:

```yaml
  - path: docs/decisions/debt/
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [open, paid, accepted-permanently]
    living-docs:
      id-prefix: TDR
      append-only: true
      mutable-fields: [status, last-reviewed]
```

Root `.ownership.yml`: delete the `docs/decisions/debt/` entry. `CODEOWNERS`: delete the `docs/decisions/debt/` line (the plugin lines already cover their projects).

`plugins/living-docs/test/config/ownership.test.ts`, test `'this repository: …'`: replace

```ts
  assert.deepEqual(config.artifacts.map(rule => rule.idPrefix).sort(), ['ADR', 'DA', 'REL', 'RF', 'RN', 'RNF', 'TDR'])
```

with

```ts
  assert.deepEqual([...new Set(config.artifacts.map(rule => rule.idPrefix))].sort(), ['ADR', 'DA', 'REL', 'RF', 'RN', 'RNF', 'TDR'])
  assert.deepEqual(
    config.artifacts.filter(rule => rule.idPrefix === 'ADR').map(rule => rule.path).sort(),
    ['docs/decisions/adr/', 'plugins/living-docs/docs/decisions/adr/', 'plugins/ownership/docs/decisions/adr/'],
    'ADR-0036: each project keeps its decisions; RN-0040: one prefix, several entries',
  )
```

Run the Task 6 Step 6 block. Expected: green.

```bash
git add -A docs/decisions plugins .ownership.yml CODEOWNERS
git commit -m "docs(ADR-0038): move frozen and draft ADRs and the TDRs to their project

ownership: ADR-0019, ADR-0020, ADR-0021, ADR-0022, ADR-0023, ADR-0024, ADR-0025, ADR-0026, ADR-0028, ADR-0030
living-docs: ADR-0001 to ADR-0013, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0029, ADR-0032, ADR-0034, ADR-0037; TDR-0001, TDR-0002, TDR-0003
Same ID, body, frontmatter and last-reviewed; only the path changes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Commit 7.2 — requirements and open decisions**

Save as `$SCRATCH/move-items.mjs`:

```js
// node move-items.mjs <sections|table> <source> <target> <ID...>
// Moves the named items (a `## ID` section, or a `| ID |` table row) from source
// to the end of target, keeping their order. The target must exist with its preamble.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const [mode, source, target, ...ids] = process.argv.slice(2)
const wanted = new Set(ids)
const read = path => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')

if (!existsSync(target)) {
  console.error(`${target} must exist with its preamble first`)
  process.exit(1)
}

let moved = []
let kept

if (mode === 'sections') {
  const [preamble, ...sections] = read(source).split(/^(?=## )/m)
  const idOf = section => section.match(/^## (\S+)/)[1]

  moved = sections.filter(section => wanted.has(idOf(section)))
  kept = preamble + sections.filter(section => !wanted.has(idOf(section))).join('')
  writeFileSync(target, `${read(target).replace(/\n*$/, '\n\n')}${moved.join('').replace(/\n*$/, '\n')}`)
} else {
  const lines = read(source).split('\n')
  const idOf = line => line.match(/^\|\s*(\S+)\s*\|/)?.[1]

  moved = lines.filter(line => wanted.has(idOf(line)))
  kept = lines.filter(line => !wanted.has(idOf(line))).join('\n')
  writeFileSync(target, `${read(target).replace(/\n*$/, '\n')}${moved.join('\n')}\n`)
}

const found = moved.map(item => item.match(/^(?:## |\|\s*)(\S+)/)[1])
const missing = ids.filter(id => !found.includes(id))

if (missing.length > 0) {
  console.error(`not found in ${source}: ${missing.join(', ')}`)
  process.exit(1)
}
writeFileSync(source, kept.replace(/\n*$/, '\n'))
console.log(`moved ${found.length} item(s) to ${target}`)
```

Create each target file with the **preamble of its source copied verbatim** (frontmatter, `# Title`, intro paragraph — same `last-reviewed`), and for `open-decisions.md` also the table header and separator lines:

```bash
mkdir -p plugins/ownership/docs/requirements plugins/living-docs/docs/requirements
pre() { awk '/^## /{exit} {print}' "$1"; }
pre docs/requirements/functional.md > plugins/ownership/docs/requirements/functional.md
pre docs/requirements/functional.md > plugins/living-docs/docs/requirements/functional.md
pre docs/requirements/rules.md > plugins/ownership/docs/requirements/rules.md
pre docs/requirements/rules.md > plugins/living-docs/docs/requirements/rules.md
tbl() { awk '/^\| DA-/{exit} {print}' "$1"; }
tbl docs/open-decisions.md > plugins/ownership/docs/open-decisions.md
tbl docs/open-decisions.md > plugins/living-docs/docs/open-decisions.md
M="node $SCRATCH/move-items.mjs"
$M sections docs/requirements/functional.md plugins/ownership/docs/requirements/functional.md RF-0016 RF-0017
$M sections docs/requirements/functional.md plugins/living-docs/docs/requirements/functional.md $(printf 'RF-%04d ' $(seq 1 15))
git mv docs/requirements/non-functional.md plugins/living-docs/docs/requirements/non-functional.md
$M sections docs/requirements/rules.md plugins/ownership/docs/requirements/rules.md RN-0001 RN-0002 RN-0021 RN-0032 RN-0033 RN-0034 RN-0035 RN-0036 RN-0037 RN-0038
$M sections docs/requirements/rules.md plugins/living-docs/docs/requirements/rules.md $(printf 'RN-%04d ' $(seq 3 20) $(seq 22 31)) RN-0039 RN-0040
$M table docs/open-decisions.md plugins/ownership/docs/open-decisions.md DA-0004 DA-0005 DA-0006 DA-0007
$M table docs/open-decisions.md plugins/living-docs/docs/open-decisions.md DA-0001 DA-0002 DA-0003
git rm -q docs/requirements/functional.md
grep -c '^## ' docs/requirements/rules.md; grep -c '^| DA-' docs/open-decisions.md
```
Expected: root `rules.md` has 1 section (`RN-0041`), root `open-decisions.md` has 2 rows (`DA-0008`, `DA-0009`); root `functional.md` and `non-functional.md` are gone. (If Step 1 moved an ID, use its list here.)

Ownership files — artifact entries:

Root `.ownership.yml`: delete the RF and RNF entries; the DA and RN entries stay (root `docs/open-decisions.md`, `docs/requirements/rules.md` with `cited-by: ['.github/scripts/**']` only). Move the watches whose doc is a requirement file into the plugin files (below) and delete them from the root; the root keeps the `.github/scripts/**` watch.

`plugins/ownership/.ownership.yml`, add to the artifacts group:

```yaml
  - path: docs/open-decisions.md
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA

  - path: docs/requirements/functional.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RF
      # Read from the repository root, not from this file's base (ADR-0036).
      cited-by: ['plugins/ownership/test/**']

  - path: docs/requirements/rules.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RN
      cited-by: ['plugins/ownership/test/**', 'plugins/ownership/plugin/src/**']
```

and to its `watches:`:

```yaml
  - code: 'plugin/src/{checks,hooks}/**'
    doc: docs/requirements/rules.md
    reason: 'a check and a hook of the core are an executable rule like those of living-docs'
```

`plugins/living-docs/.ownership.yml`, add to the artifacts group the DA entry (same as ownership's) and:

```yaml
  - path: docs/requirements/functional.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RF
      cited-by: ['plugins/living-docs/test/**']

  - path: docs/requirements/non-functional.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RNF
      cited-by: ['plugins/living-docs/test/**']

  - path: docs/requirements/rules.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RN
      cited-by: ['plugins/living-docs/test/**', 'plugins/living-docs/plugin/src/**']
```

and to its `watches:`:

```yaml
  - code: 'plugin/src/checks/**'
    doc: docs/requirements/rules.md
    reason: 'a check is an executable rule — the RN comes first, and it is what the check verifies'

  - code: 'plugin/src/hooks/**'
    doc: docs/requirements/rules.md
    reason: 'a hook blocks or asks on behalf of a rule; with no RN cited, the block has no origin'

  - code: 'plugin/src/cli/**'
    doc: docs/requirements/functional.md
    reason: 'what the command does that is observable is an RF, not an implementation detail'

  - code: 'plugin/src/core/**'
    doc: docs/requirements/non-functional.md
    reason: 'the two roots are a property of the system (ADR-0003), not command behavior'

  - code: 'plugin/skills/**'
    doc: ../../CONTRIBUTING.md
    reason: 'a new or changed skill changes how we work here'
```

(`watches[].doc` may leave the base; `CONTRIBUTING.md` stays at the root.)

`plugins/living-docs/test/docs/agent-contract.test.ts`, test `'RN-0010: the contract copies no requirement statement'`: read every requirement file the configuration declares instead of three fixed root paths:

```ts
test('RN-0010: the contract copies no requirement statement', () => {
  const config = loadLivingDocsConfig(ROOT)
  const files = config.artifacts.filter(rule => ['RF', 'RNF', 'RN'].includes(rule.idPrefix)).map(rule => rule.path)
  const titles = files.flatMap(file => [...readFileSync(join(ROOT, file), 'utf8').matchAll(/^## (R[NF]F?-\d{4} — .+)$/gm)].map(match => match[1] ?? ''))

  assert.ok(titles.length >= 11, `expected the requirements of Phases 0 to 3, found ${titles.length}`)
  for (const title of titles) {
    assert.equal(CONTRACT.includes(title), false, `the contract copies the requirement "${title}"`)
  }
})
```

(import `loadLivingDocsConfig` from `'../../plugin/src/config/ownership.ts'`).

Run the Task 6 Step 6 block, plus `node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate` — expected zero findings. A `citation-coverage` finding means an ID is in the wrong project: move it per Step 1, never widen a `cited-by` to the other project.

```bash
git add -A docs plugins .ownership.yml CODEOWNERS
git commit -m "docs(ADR-0036): requirements and open decisions move to their project

ownership: RF-0016, RF-0017; RN-0001, RN-0002, RN-0021, RN-0032 to RN-0038; DA-0004 to DA-0007
living-docs: RF-0001 to RF-0015; RNF-0001 to RNF-0006; RN-0003 to RN-0020, RN-0022 to RN-0031, RN-0039, RN-0040; DA-0001 to DA-0003
root: RN-0041; DA-0008, DA-0009

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Commit 7.3 — documents, contracts and releases**

```bash
mkdir -p plugins/living-docs/docs
git mv docs/charter plugins/living-docs/docs/charter
git mv docs/glossary.md plugins/living-docs/docs/glossary.md
git mv docs/contracts plugins/living-docs/docs/contracts
git mv docs/deprecations.md plugins/living-docs/docs/deprecations.md
git mv docs/migrations plugins/living-docs/docs/migrations
git mv docs/releases plugins/living-docs/docs/releases
ls docs
```
Expected root `docs/`: `decisions/`, `definition-of-done.md`, `ids-retired.txt`, `open-decisions.md`, `requirements/`, `superpowers/`.

Root `.ownership.yml`: delete the entries `docs/releases/`, `docs/glossary.md`, `docs/charter/`, `docs/contracts/errors.md`, `docs/contracts/versioning-policy.md`, `docs/contracts/checks.gen.md`, `docs/deprecations.md`, `docs/migrations/`; delete the whole `generated:` block; delete the watch `plugins/living-docs/plugin/src/checks/catalog.ts → docs/contracts/checks.gen.md`.

`plugins/living-docs/.ownership.yml`, add to the artifacts group:

```yaml
  - path: docs/releases/
    owner: '@esliph/engineering'
    skill: release-historian
    states: [draft, published]
    living-docs:
      id-prefix: REL
      # Read by whoever consumes: the text cites no artifact ID (ADR-0017).
      audience: external
      # A published release note is frozen: that is why REL has an ID family
      # and CHANGELOG.md does not.
      append-only: true
      mutable-fields: [status, last-reviewed]
```

to the documents group:

```yaml
  - path: docs/glossary.md
    owner: '@esliph/engineering'
    skill: glossary-keeper
    living-docs: {}
  - path: docs/charter/
    owner: '@esliph/engineering'
    skill: charter-keeper
    living-docs: {}
  - path: docs/contracts/errors.md
    owner: '@esliph/engineering'
    skill: contract-keeper
    living-docs: {}
  - path: docs/contracts/versioning-policy.md
    owner: '@esliph/engineering'
    skill: contract-keeper
    living-docs: {}
  # Generated: the generated-artifact guard blocks editing it by hand, and
  # `ownership/generated-drift` compares it with the generator output.
  - path: docs/contracts/checks.gen.md
    owner: '@esliph/engineering'
    living-docs: {}
  - path: docs/deprecations.md
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }
  - path: docs/migrations/
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }
```

and, as top-level keys:

```yaml
generated:
  # The command PRINTS the expected content and writes no file at all (ADR-0005).
  # It runs from the repository root.
  - path: docs/contracts/checks.gen.md
    command: node --conditions=development plugins/living-docs/plugin/src/tools/gen-checks.ts
```

and the watch:

```yaml
  - code: 'plugin/src/checks/catalog.ts'
    doc: docs/contracts/checks.gen.md
    reason: 'the public contract of the checks derives from the catalog — regenerating is part of the change, and editing by hand is blocked. Owning skill: contract-keeper'
```

`CODEOWNERS`: delete `docs/glossary.md`, `docs/charter/`, `docs/contracts/`, `docs/deprecations.md`, `docs/releases/`, `docs/migrations/`. Final `CODEOWNERS`:

```text
# Mirrors the `owner` field of the ownership files. One path, one owner.
# Each plugin project is covered as a whole; its own .ownership.yml details it.

docs/decisions/adr/ @esliph/engineering
docs/open-decisions.md @esliph/engineering
docs/requirements/ @esliph/engineering
docs/definition-of-done.md @esliph/engineering
docs/ids-retired.txt @esliph/engineering
docs/superpowers/ @esliph/engineering
CONTRIBUTING.md @esliph/engineering
CLAUDE.md @esliph/engineering
CHANGELOG.md @esliph/engineering
README.md @esliph/engineering
.ownership.yml @esliph/engineering
plugins/ownership/ @esliph/engineering
plugins/living-docs/ @esliph/engineering
.github/ @esliph/engineering
.claude-plugin/ @esliph/engineering
CODEOWNERS @esliph/engineering
.editorconfig @esliph/engineering
.gitattributes @esliph/engineering
.gitignore @esliph/engineering
.prettierignore @esliph/engineering
.prettierrc @esliph/engineering
```

`.prettierignore`: `docs/contracts/checks.gen.md` → `plugins/living-docs/docs/contracts/checks.gen.md`.

Tests in `plugins/living-docs/test/` (import `projectRoot` from `'../helpers/checkout.ts'`, and `loadCodeowners`, `ownersOf` from `'@esliph/ownership'`):

- `contracts/drift.test.ts`: `const GENERATED = 'docs/contracts/checks.gen.md'` → `'plugins/living-docs/docs/contracts/checks.gen.md'` (ROOT stays `checkoutRoot()`).
- `docs/contracts.test.ts`: `errors()` and the versioning-policy test read from `join(projectRoot(), 'docs/contracts/…')`; the CODEOWNERS test becomes:
  ```ts
  test('RN-0001: the contracts have an owner in CODEOWNERS, like every artifact', () => {
    const codeowners = loadCodeowners(ROOT)!

    assert.ok(ownersOf(codeowners, 'plugins/living-docs/docs/contracts/errors.md'))
  })
  ```
- `docs/language-and-intent.test.ts`: glossary and charter read from `join(projectRoot(), 'docs/…')`; the CODEOWNERS test asserts `ownersOf(loadCodeowners(ROOT)!, 'plugins/living-docs/docs/glossary.md')` and `'plugins/living-docs/docs/charter/vision.md'` are non-null.
- `docs/release-history.test.ts`: `docs/deprecations.md` read from `projectRoot()`; the `RN-0001` CODEOWNERS test checks `ownersOf(loadCodeowners(ROOT)!, p)` for `'CHANGELOG.md'`, `'plugins/living-docs/CHANGELOG.md'`, `'plugins/living-docs/docs/deprecations.md'`, `'plugins/living-docs/docs/releases/x.md'`, `'plugins/living-docs/docs/migrations/x.md'`; the `RN-0030` test's paths become `['README.md', 'CHANGELOG.md', 'plugins/living-docs/CHANGELOG.md', 'plugins/living-docs/README.md', 'plugins/living-docs/docs/deprecations.md', 'plugins/living-docs/docs/migrations/']` and `['plugins/living-docs/docs/contracts/errors.md', 'plugins/living-docs/docs/contracts/versioning-policy.md']`.

Run the Task 6 Step 6 block. Expected: all green, both validates with zero findings, `generated-drift` silent (the generator's output did not change — its source comment names `src/checks/catalog.ts`, still true relative to `plugin/`).

```bash
git add -A docs plugins .ownership.yml CODEOWNERS .prettierignore
git commit -m "docs(ADR-0036): living-docs' charter, glossary, contracts and release history move to its project

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Agent contracts, contributing and the requirement text

**Files:**
- Modify: `CLAUDE.md`, `CONTRIBUTING.md`, `docs/definition-of-done.md`
- Create: `plugins/living-docs/CLAUDE.md`
- Modify: `plugins/living-docs/.ownership.yml` (declare `CLAUDE.md`), `plugins/living-docs/docs/requirements/non-functional.md` (`RNF-0002`, `RNF-0006`), `plugins/living-docs/docs/requirements/rules.md` (`RN-0031`)
- Modify: `plugins/living-docs/test/docs/agent-contract.test.ts`

- [ ] **Step 1: Update the contract test first**

`plugins/living-docs/test/docs/agent-contract.test.ts`: add `const PLUGIN_CONTRACT = readFileSync(join(projectRoot(), 'CLAUDE.md'), 'utf8')` and replace the first test with:

```ts
test('RN-0010: the root agent contract points to the owning artifacts of the whole repository', () => {
  for (const target of ['.ownership.yml', 'CONTRIBUTING.md', 'docs/definition-of-done.md', 'docs/requirements/', 'plugins/<name>/CLAUDE.md']) {
    assert.ok(CONTRACT.includes(target), `the root contract should point to ${target}`)
  }
  assert.doesNotMatch(CONTRACT, /npm (ci|test)|node --conditions/, 'the root contract names no toolchain (ADR-0036)')
})

test('RN-0010: the living-docs contract points to its spec, vocabulary, principles and toolchain', () => {
  for (const target of ['docs/superpowers/research/2026-08-24-living-documentation-toolkit.md', 'docs/glossary.md', 'docs/charter/', 'docs/requirements/', 'npm ci']) {
    assert.ok(PLUGIN_CONTRACT.includes(target), `the living-docs contract should point to ${target}`)
  }
})
```

In `'RN-0010: the contract copies no requirement statement'` and `'RN-0010: the contract is an index, not a manual'`, loop over both contracts:

```ts
  for (const [name, contract] of [['CLAUDE.md', CONTRACT], ['plugins/living-docs/CLAUDE.md', PLUGIN_CONTRACT]] as const) {
    // … the existing assertions, with `contract` for `CONTRACT` and `name` in the messages
  }
```

Run: `cd plugins/living-docs && npm test -- --test-name-pattern RN-0010`
Expected: FAIL — `plugins/living-docs/CLAUDE.md` does not exist; the root contract still names `npm ci`.

- [ ] **Step 2: Root `CLAUDE.md`**

Replace the whole file:

```markdown
# Agent contract — esliph agent plugins

Index and policy for every plugin in this marketplace. **No factual claim lives
here**: each one lives in the owning artifact and is read from there (`RN-0010`).
A plugin's toolchain and commands are in `plugins/<name>/CLAUDE.md`, when it has
one.

## Before touching anything

- The ownership map is `.ownership.yml` and the files it includes, one per
  plugin project under `plugins/<name>/`. No document path is guessed: it is
  read from there.
- How we work here: `CONTRIBUTING.md`. When something is done:
  `docs/definition-of-done.md`.
- What the marketplace must do is in `docs/requirements/`; what a plugin must do
  is in its own `docs/requirements/`. The ID space is one for the whole
  repository (`ADR-0037`).

## Policy

- **The rule comes before the code.** What the system must do is in a
  `docs/requirements/`; if the rule does not exist, open a `DA`
  (`/open-decision`) and stop. Do not invent the rule that is missing.
- **You do not accept decisions.** A skill writes `draft`/`open`; promoting is a
  human act — `living-docs/state-promotion` asks, and the answer is not yours.
- **You do not fix a frozen item.** An accepted ADR gets `superseded` and a new
  ADR — `living-docs/append-only` blocks the rest.
- **You do not edit a generated artifact.** What is in `generated[]` (or carries
  the marker) changes through the source and the generator —
  `ownership/generated-guard` denies and `ownership/generated-drift` enforces.
- **Document and code travel together.** A path watched in `watches` has an
  owning doc; `ownership/watch-reminder` reminds after the edit and
  `ownership/commit-guard` asks before the commit.
- **A conscious shortcut becomes a `TDR`** (`/debt`) with an observable payment
  trigger — it does not become an orphan `TODO`.
- **A change visible to whoever consumes travels with an entry in the
  `CHANGELOG.md` of the plugin it changes** — or with the reason written in the
  commit. `ownership/consumer-change-logged` enforces it; the format of the label
  is in the contract.
- **Text for readers on the outside carries no artifact ID.** What is marked
  `audience: external` explains in running text; the link stays in the artifact
  or in the commit — `living-docs/external-audience` enforces it.
- **What a plugin ships does not point inside this repository.** A seed, a skill
  and a CLI or hook message stay free of the ID and of the spec section from
  here; the why goes into the code comment — the distribution test enforces it.
- **Every document has a declared owner.** An ownership file says which skill
  answers; CODEOWNERS, who reviews — `ownership/owner-coverage` enforces both.

## What to never do

- Write a document that narrates the code.
- Create a documentation artifact outside a `docs/` or outside version control.
- Bump `last-reviewed` in bulk.
- Copy the content of any artifact above into here.
```

- [ ] **Step 3: `plugins/living-docs/CLAUDE.md`**

```markdown
# Agent contract — living-docs plugin

What holds when working in `plugins/living-docs/`. The policy for every plugin is
the root `CLAUDE.md`; this file adds the toolchain, the commands and where this
plugin's truth lives. **No factual claim lives here** (`RN-0010`).

## Before touching anything

- The toolkit's spec is
  `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md`, at the
  repository root. It rules.
- This project's ownership map is `.ownership.yml`, in this directory.
- Requirements: `docs/requirements/`. Decisions: `docs/decisions/` and
  `docs/open-decisions.md`. Domain vocabulary: `docs/glossary.md`. Inviolable
  principles and product vision: `docs/charter/`.

## Toolchain

It runs on the host's `node` (`RNF-0002`). While living-docs depends on the core
by path (`TDR-0003`), the core's dependencies come first:

```bash
(cd ../ownership && npm ci)
npm ci
npm test
npm run typecheck
npm run lint:check
```

The validated repository is the checkout root: from there,
`node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate`
(or set `LIVING_DOCS_REPO_ROOT`, `RNF-0003`). The optional container path is
`bin/dev` (`RNF-0006`).

## Commands

`/adr`, `/open-decision`, `/debt`, `/docs-setup`, `/term`, `/release`,
`/docs-audit`. The skills `decision-recorder`, `requirements-keeper`,
`working-agreements-keeper`, `glossary-keeper`, `charter-keeper`,
`contract-keeper` and `release-historian` are selected by their `description`;
there is no need to invoke them by name.
```

Declare it in `plugins/living-docs/.ownership.yml`, documents group (no `role` — `ADR-0037`):

```yaml
  - path: CLAUDE.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    living-docs: {}
```

- [ ] **Step 4: `CONTRIBUTING.md`**

Replace the `## The environment` section (up to, not including, `## The cycle`) with:

````markdown
## The environment

Each plugin is a project under `plugins/<name>/`, with its own toolchain. The
root has none. For the two current plugins, Node 24 or greater and the npm that
comes with it — nothing beyond that (`RNF-0002`). Dependencies come in with
`npm ci`, and the core comes first while living-docs depends on it by path:

```bash
(cd plugins/ownership && npm ci && npm test && npm run typecheck && npm run lint:check)
(cd plugins/living-docs && npm ci && npm test && npm run typecheck && npm run lint:check)
node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate
node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate
node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate --base origin/master
node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate --base origin/master
node .github/scripts/check-marketplace.mjs
```

A command that fails with `ERR_MODULE_NOT_FOUND` is a command run before
`npm ci` — it is not the environment that is wrong.

### Optional: running living-docs through the container

Whoever does not want to install Node on the machine has a second path (`RNF-0006`,
`ADR-0016`). From `plugins/living-docs/`, `bin/dev` runs any maintenance command
inside the container, and brings the container up by itself when it is not up:

```bash
bin/dev npm test
bin/dev npm run typecheck
bin/dev node --conditions=development plugin/src/cli/index.ts validate
bin/living-docs validate     # the same, through the CLI wrapper
bin/dev                      # a shell inside the container
```

It requires the Docker daemon, and the first invocation builds the image. On
Windows, invoke it through Git Bash, through WSL, or with `bash bin/dev …` from
PowerShell.

Two things this path is **not**. It is not the execution of record: what CI
reproduces on every PR and what the Definition of Done measures remains the host.
And it does not cover the hooks, which always run on the host (`RNF-0001`) — on a
machine with no Node, local enforcement does not exist, and that is the same loss
`ADR-0015` already declared.

## Adding a plugin

A plugin is a project under `plugins/<name>/`, and what is installed is its
`plugin/` directory (`ADR-0036`). The minimum (`RN-0041`):

- `plugins/<name>/plugin/.claude-plugin/plugin.json`, and what the plugin ships
  (`skills/`, `commands/`, `agents/`, `hooks/`) beside it, inside `plugin/`;
- `plugins/<name>/README.md` for whoever installs, `CHANGELOG.md`, and
  `.ownership.yml` declaring the project's paths relative to its directory;
- one entry in `.claude-plugin/marketplace.json` with
  `source: ./plugins/<name>/plugin`, one `include:` line in the root
  `.ownership.yml`, one line in `CODEOWNERS` and one row in the root `README.md`.

A plugin in plain Markdown needs no workflow: `marketplace.yml` covers it. A
plugin with code adds its own toolchain in the project (a `package.json`, a
`pyproject.toml`) and a `.github/workflows/plugin-<name>.yml` filtered by
`plugins/<name>/**`. Tests, documentation and toolchain stay outside `plugin/`.
Its documents live in `plugins/<name>/docs/`, under the repository's single ID
space: take the next free number across every project (`RN-0040`).
````

- [ ] **Step 5: Definition of Done, last verification line**

`docs/definition-of-done.md`, replace the line starting `- [ ] \`npm test\`, \`npm run typecheck\`, \`ownership validate` with:

```markdown
- [ ] Each changed plugin's workflow (`plugin-<name>.yml`: tests, type-check, lint) and `marketplace.yml` (manifests, `ownership validate [--base <ref>]`, `living-docs validate [--base <ref>]`) pass — verification: the checks of the core and of living-docs (`ownership/owner-coverage`, `living-docs/frontmatter`, …), run by those workflows.
```

- [ ] **Step 6: Requirement text**

`plugins/living-docs/docs/requirements/non-functional.md`, `RNF-0002` body becomes:

```markdown
Node 24 or greater, and the npm that comes with it, are the only toolchain
required of whoever works on the toolkit. `npm ci`, run from the plugin project
(`plugins/living-docs/`), installs the dependencies — after the core's project
(`plugins/ownership/`) while the toolkit depends on it by path; `node` runs the
TypeScript source straight from the checkout, with no compiled artifact in the
middle. The package published on npm is compiled on `prepack` — that compilation
exists only inside the tarball and never reaches a development checkout.
```

`RNF-0006` first paragraph becomes:

```markdown
Whoever does not want to install Node on the host can run any toolkit maintenance
command inside a container, described in the plugin project (`plugins/living-docs/`:
`compose.yaml` and `bin/dev`). The set of commands that works through that path
is the same that works on the host, and that is so because the entry point knows
no command at all: it passes on what it received. A list of supported commands
does not exist, and what does not exist does not diverge.
```

(Keep the `status` line exactly as it is in the file — do not promote or demote.)

`plugins/living-docs/docs/requirements/rules.md`, `RN-0031` body becomes:

```markdown
What is delivered is the plugin's distributed directory
(`plugins/living-docs/plugin/`), and nothing above it. The files `init` seeds,
the templates, the plugin's text and the output of the CLI and of the hooks do
not cite a prefix declared in the toolkit's `living-docs.id-prefix`, a section of
the toolkit's spec or a path of an internal document of it. Whoever installs does
not resolve the citation — or resolves it to an item of their own, with another
meaning.
```

- [ ] **Step 7: Run everything**

Run the Task 6 Step 6 block. Expected: all green; `living-docs validate` with zero findings (`living-docs/agent-contract-duplication` judges the root contract; `living-docs/done-verifiable` accepts the new DoD line).

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md CONTRIBUTING.md docs/definition-of-done.md plugins/living-docs
git commit -m "docs(RNF-0002, RNF-0006, RN-0031): agent contracts and contributing for a marketplace of projects (ADR-0036)

The root contract keeps the policy for every plugin; plugins/living-docs/CLAUDE.md
takes the toolchain and the commands.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Final verification

**Files:** none (report only).

- [ ] **Step 1: Clean-clone run**

```bash
git clone --quiet . "$SCRATCH/clone" && cd "$SCRATCH/clone"
(cd plugins/ownership && npm ci && npm test && npm run typecheck && npm run lint:check)
(cd plugins/living-docs && npm ci && npm test && npm run typecheck && npm run lint:check)
node .github/scripts/check-marketplace.mjs && node --test ".github/scripts/*.test.mjs"
node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate
node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate
node --conditions=development plugins/ownership/plugin/src/cli/index.ts validate --base master
node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate --base master
test ! -e package.json && test ! -e node_modules && echo "root has no toolchain"
cd - && rm -rf "$SCRATCH/clone"
```
Expected: everything passes; both `--base master` runs have no finding (or only findings that the commit labels already answer — report them verbatim). Compare the test totals with the Task 0 baseline; the difference must be the tests this plan added.

- [ ] **Step 2: Push the branch and watch CI**

Only with the human's go-ahead. The three workflows must pass: `marketplace`, `plugin-ownership`, `plugin-living-docs` (including its `container` job, which runs because the branch changes the container files).

- [ ] **Step 3: HUMAN GATE — smoke test of installation**

Ask the human to run, in a Claude Code session outside this repository:

```text
/plugin marketplace add <path to this checkout>
/plugin install ownership@esliph
/plugin install living-docs@esliph
```

and to confirm that a living-docs hook runs from the plugin cache and fails open (no output, nothing blocked) while the core is not published on npm, and that an ownership hook answers. Record the answer in the final report.
