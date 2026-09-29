# Phase 6 of the living documentation toolkit — historical trail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `SK-7` release-historian, `CM-7` (`/release`), `CI-6`
(changelog required) and `HK-7` (new shortcut without a TDR) — Phase 6 of the
spec (§10), which fills the `notInstalled` list of the `production` Stage and
gives the repository its first Artifact aimed at the **consumer**, not at the
team.

**Architecture:** Two new engine pieces, both small.
`src/git/diff.ts` is the first module that reads the **diff** instead of the
state of the tree: `changedPaths` and `commitMessages`, with an injectable
runner modeled on `src/exec/command.ts` and **without** fail-open — the
contract inverted relative to `src/git/staged.ts`, because the caller here is a
check that needs to show up, not a hook whose cost of failing closed is
blocking the agent.
`src/checks/ci6-changelog-required.ts` is a pure function of (diff, config,
file) → findings: the trigger comes from `consumer-visible-paths`, the target
doc comes from the `watches` rule marked `consumer-visible: true`, and the
escape hatch is a label with a reason in the commit message. `CI-6` runs in its
own subcommand, `living-docs changelog --base <ref>`, for the same reason
`CI-5` runs in `drift` (`ADR-0005`): it is the only check that needs a state
that `validate` does not have — the base of the diff. `src/hooks/hk7-shortcut-debt.ts`
is the sixth hook and the first that does **not** read `.ownership.yml`: a
shortcut marker is syntax, not configuration.

The dogfooding is real: this repository now gets `CHANGELOG.md`,
`docs/deprecations.md`, `docs/releases/` and `docs/migrations/`, and starts
declaring `consumer-visible-paths` — without that `CI-6` would be an installed
check that never fires, which is the dead wiki in the form of code.

**Tech Stack:** TypeScript (Node ≥ 24, run only in a container —
`RNF-0002`), `node:test`, `node:child_process` (`execFileSync`), `picomatch`,
Claude Code plugin (`SKILL.md`, `hooks.json`).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §3 (layout of `docs/releases/`,
`docs/migrations/`, `consumer-visible-paths`), §4 (lifecycle of the
CHANGELOG entry), §5 (`SK-7`), §7 (`HK-1` freezing a published release note,
`HK-7`), §9 (`CI-6`), §10 (Phase 6, `CM-7`), §13 (anti-requirements) —
`docs/superpowers/plans/BACKLOG-phases-3-7.md` (section "Phase 6") carries the
survey that this plan resolves.

## Global Constraints

- Nothing runs on the host except Docker — every command through
  `docker compose exec toolkit …` or `./bin/living-docs` (`RNF-0002`).
- Identifiers, file names and IDs in English/neutral; prose in Portuguese
  (spec §11).
- An ID is never recycled — check `docs/ids-retired.txt` before taking a new
  number (spec §2). The free numbers in this phase: `ADR-0006`, `RF-0008`,
  `RF-0009`, `RN-0013`, `RN-0014`, `RN-0015`. The `REL` prefix is new and is
  born with no items.
- Every requirement section is born `status: draft`; every new ADR is born
  `status: draft`. Promoting is a human act (`RN-0005`) — `HK-3` intercepts, and
  the answer is not yours.
- The commit message cites the affected ID, format `type(ID): subject`
  (`CONTRIBUTING.md`).
- A hook fails open within 5 s, no network (`RNF-0001`). `CI-6` does **not** fail
  open, for the same reason `CI-5` does not: a check is the enforcement that
  survives an absent agent.
- `CHANGELOG.md` and `docs/deprecations.md` do **not** go into `artifacts:` in
  `.ownership.yml` — same category as `CONTRIBUTING.md`, the DoD, the glossary,
  the charter and the written contracts (`ADR-0004`). `docs/releases/` **does**
  go in, with the `REL` prefix, and the reason is in Task 6. `DA-0002` stays open;
  no task in this plan resolves it.
- `init` does **not invent `consumer-visible-paths`**, for the same reason it does
  not invent `watches` or `generated[]` (`RF-0004`): an empty frame with a
  commented example, and the project fills it in.
- `CHANGELOG.md` **has no frontmatter.** It is the only Artifact in this phase
  written for whoever consumes the software, not for whoever maintains it;
  living-documentation frontmatter there is noise for the outside reader.
  `docs/deprecations.md`, which is internal, has it.
- The generator stays deterministic (`ADR-0005`): Task 4 adds one line to
  `CHECK_CATALOG` and **regenerates** `docs/contracts/checks.gen.md`; do not edit
  the generated file.

### What this plan decides differently from the backlog, and why

The backlog noted, in the Phase 6 section: _"the exception label that spec §5
(`SK-7`, rule 2) mentions without defining the format — this is a `DA` to open"_.

This plan does **not open a `DA`** for that. A `DA` exists to record that
nobody knows the rule and that **the implementation stops** (`CLAUDE.md`, policy).
Here the rule is decidable with what is already written: the toolkit has no
network (`RNF-0001`), so a PR label is out; the label has to survive the
merge, so it has to be in version control. That leaves one viable alternative
and two discardable ones, which is exactly the shape of an ADR — and a `DA`
opened and closed in the same commit is ceremony, not trail. `ADR-0006` (Task 1)
decides, with the alternatives recorded.

`DA-0002` — the one Phase 3 opened — stays open and remains a
precondition of `CI-7` (Phase 7). This plan does not touch it.

### `HK-5` will ask — read before committing any task

`docs/.ownership.yml` has had `watches` filled in since Phase 3. These entries
hit the commits of this plan:

| Watched path            | Owner doc required in the same commit | Affected tasks |
| ----------------------- | ------------------------------------- | -------------- |
| `src/checks/**`         | `docs/requirements/rules.md`          | 3, 4           |
| `src/checks/catalog.ts` | `docs/contracts/checks.gen.md`        | 4              |
| `src/hooks/**`          | `docs/requirements/rules.md`          | 5              |
| `src/cli/**`            | `docs/requirements/functional.md`     | 4, 6           |
| `plugin/skills/**`      | `CONTRIBUTING.md`                     | 8              |

`HK-5` **asks** (`ask`), never denies (`RN-0009`). In Tasks 3, 4, 5 and 6 the
answer is the same: the owner doc traveled in Task 1, with the rule that code
implements — it is the order that `CONTRIBUTING.md` §"The cycle" demands. In Task 4 there is
a second pending item, `docs/contracts/checks.gen.md`, and that one **travels in the commit**:
regenerate it and add it to `git add`. In Task 8, `CONTRIBUTING.md` gains a line and
goes along.

**From Task 7 on** a new `watches` entry pointing at
`CHANGELOG.md` comes in, marked `consumer-visible: true`. From then on, every commit that
touches `src/cli/**`, `src/checks/catalog.ts`, `src/config/ownership.ts`,
`plugin/**`, `templates/**` or `bin/living-docs` has `CHANGELOG.md` as a pending
owner doc — and the right answer is to add the `## [Unreleased]` line,
not to dismiss the question. Tasks 8 and 9 say which line.

### `HK-2` will deny — and that is how you know it works

`docs/contracts/checks.gen.md` has been declared in `generated[]` since Phase 5.
**Do not use `Edit` or `Write` on that file at any point.** When Task 4
adds `CI-6` to the catalog, the way is to regenerate:

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
```

The redirection happens **inside** the container on purpose: the host shell
would rewrite the file's encoding on Windows, and one extra CR would become
contract drift.

---

## Spec coverage

| Piece                                                                    | Task |
| ------------------------------------------------------------------------ | ---- |
| `ADR-0006` — where the diff comes from, the exception label, where `CI-6` runs | 1 |
| `RF-0008`, `RF-0009`, `RN-0013`, `RN-0014`, `RN-0015`                    | 1    |
| `src/git/diff.ts` — `changedPaths`, `commitMessages`, `GitError`         | 2    |
| `CI-6` (changelog required)                                              | 3    |
| `living-docs changelog --base <ref>` + pointer in `validate` + catalog   | 4    |
| `HK-7` (`PostToolUse`/`Edit\|Write`, `additionalContext`)                | 5    |
| `REL` in the lifecycle + templates + `init --stage production`           | 6    |
| Dogfooding: `CHANGELOG.md`, `consumer-visible-paths`, deprecations       | 7    |
| `SK-7` release-historian + `CM-7` `/release`                             | 8    |
| Indexes, public contract and end-to-end proof                            | 9    |
| Human promotion                                                          | 10   |

**No numbered acceptance criterion of spec §12 closes in this phase.** The ones
that remain are 7 (`CI-4`, TDR with an expired trigger) and 8 (`HK-6`, inventory at
`SessionStart`), both of Phase 7. The closest Phase 6 comes is
criterion **10** — "no piece produces a document that narrates code, nor a
document-volume metric" —, and it is easier to violate here than in
any earlier phase: a CHANGELOG written from `git log` is
exactly the document that narrates the code. `RN-0013` and `SK-7` exist for
that, and Task 9 plants the test that enforces it.

---

### Task 1: The rule before the code — `ADR-0006`, `RF-0008`, `RF-0009`, `RN-0013`, `RN-0014`, `RN-0015`

**Goal:** Before any code, record the decision the backlog
left open (where the diff comes from, what the exception label is, where `CI-6`
runs) and the five requirements the rest of the plan implements — in `draft`, for
human promotion in Task 10.

**Files:**

- Create: `docs/decisions/adr/ADR-0006-pr-diff-and-exception-label.md`
- Modify: `docs/requirements/functional.md` (`RF-0008`, `RF-0009`)
- Modify: `docs/requirements/rules.md` (`RN-0013`, `RN-0014`, `RN-0015`)

**Interfaces:**

- Produces: the IDs `ADR-0006`, `RF-0008`, `RF-0009`, `RN-0013`, `RN-0014`,
  `RN-0015`, cited by the code and the tests of Tasks 2–9.

**Requirements:**

- All six are born in the machine's initial state (`draft`) — promotion is
  Task 10, and it is human (`RN-0005`).
- `ADR-0006` does not resolve `DA-0002` and does not mention it as resolved.
- `relates-to` of `ADR-0006` is born already filled in: `accepted` freezes the file,
  and `relates-to` is not in `mutable-fields` — an accepted ADR with
  `relates-to: []` can only be fixed by superseding.

- [ ] **Step 1: Write `ADR-0006` in `draft`**

Create `docs/decisions/adr/ADR-0006-pr-diff-and-exception-label.md`:

```markdown
---
id: ADR-0006
title: Where CI-6 gets the diff, what counts as an exception label, and where it runs
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-26
relates-to: [RF-0008, RN-0013]
supersedes: null
superseded-by: null
---

# ADR-0006 — Where CI-6 gets the diff, what counts as an exception label, and where it runs

## Context

Phase 6 (spec §10) delivers `CI-6`: "diff touches `consumer-visible-paths`
without an entry in `Unreleased` or an exception label" (§9). It is the first check that is not
content with the state of the tree — it needs to know **what changed** relative to
something. Three questions were left without a written answer, and all three change the
engine:

1. **Where does the diff come from?** `git diff` against what, and what happens outside
   a CI, where there is no "PR base".
2. **What is the "exception label"?** Spec §5 (`SK-7`, rule 2) mentions it
   as a legitimate way out and **does not define the format**. Without a format, `CI-6` either
   has no escape — and then an internal change in a public path blocks the PR — or
   has an escape that nobody can trigger.
3. **Where does `CI-6` run?** `validate` receives no base at all, and inventing
   one would be guessing.

## Alternatives considered

### Where the diff comes from

**The working tree (`git status`) or the index (`git diff --cached`).**
Discarded: it is what `HK-5` already does, and at the right point — before the commit. A
CI check that looks at the working tree looks at a clean tree and sees nothing.

**`git diff <base>..HEAD` (two dots).** Discarded: it shows the difference between
the two states, so everything that entered the base after the branch left appears
as if the branch had changed it. A PR gets charged for a file it
did not touch.

**`git diff <base>...HEAD` (three dots), with the base received as an argument.
Chosen.** Three dots starts from the _merge-base_: it is exactly "what this
branch changed". The base comes from `--base <ref>` because no default is honest —
`origin/main` does not exist in every repository, and a wrong default produces a
check that fails the whole PR or fails nothing.

### The exception label

**PR label (GitHub, GitLab).** Discarded: it requires network, and the toolkit has no
network in any hook (`RNF-0001`); worse, it requires a specific provider, and the
toolkit does not know a provider. A label also **dies with the PR**: six months
later nobody knows why that change had no entry.

**A versioned exception file (`.changelog-skip`).** Discarded: a
file that has to be created and deleted on every PR becomes forgotten litter in the
tree, and the forgetting silently turns the check off.

**A line in the commit message, in the format `Changelog: none — <reason>`.
Chosen.** It is in version control, travels with the change forever, is
readable by `git log` with no network or provider, and is the same form of _trailer_ that
the repository itself already uses for commit attribution. The reason is
**mandatory**: a label without a reason is a ticked box, and a ticked box
is the beginning of the dead wiki.

### Where `CI-6` runs

**Inside `living-docs validate`, with an optional `--base`.** Discarded:
`validate` is the reading of the tree and is called in-process by the test suite;
a flag that changes the nature of the command makes the command lie about what it
verified when the flag is absent.

**Alongside `living-docs drift`.** Discarded: `drift` means drift of a
generated contract (`ADR-0005`). Pushing `CI-6` there would force `drift` to
carry a `--base` that it does not use.

**Its own subcommand, `living-docs changelog --base <ref>`. Chosen.**

## Decision

1. **The diff comes from `git diff --name-only -z <base>...HEAD`**, three dots, with
   `-c safe.directory=*` for the same reason as `src/git/staged.ts`: the hook and
   the check run in the container with a uid different from the owner of the mounted
   checkout (`ADR-0003`). `-z` because a path with an accent comes out escaped without it,
   and an escaped path matches no glob.
2. **The messages come from `git log --format=%B%x00 <base>..HEAD`**, two dots:
   here the question is "which commits did this branch add", and not "what is the
   content difference".
3. **`src/git/diff.ts` does not fail open.** A git error becomes `GitError`, and the
   caller decides. It is the inverse of `src/git/staged.ts` on purpose: there the caller
   is a hook, and the cost of failing closed is blocking the work; here the caller
   is a check, and the cost of failing open is a broken contract passing with the
   authority of a green CI.
4. **The exception label is `Changelog: none — <reason>`** in any commit of the
   range. The accepted separator is an em dash, a hyphen or a colon; the reason is
   mandatory and non-empty. `Changelog: none` alone does **not** count, and the
   check's message says so.
5. **The trigger of `CI-6` is `consumer-visible-paths`** (spec §9). **The target
   doc comes from `watches`**, from the rules marked `consumer-visible: true` — the
   toolkit does not know the path `CHANGELOG.md` and will not come to know it (spec §3:
   "hooks and checks know no path at all: they read it from here"). Declaring
   `consumer-visible-paths` with no rule marked is a configuration error, and
   `CI-6` reports it as a finding instead of staying silent.
6. **The entry has to be in the same diff.** It is not enough for `## [Unreleased]` to be
   filled in: the target doc has to be among the paths that changed **and** the
   section has to have at least one item. Without that, the entry that an earlier PR
   left there would satisfy every following PR — it is the same reason as `RN-0008`.
7. **`CI-6` runs in `living-docs changelog --base <ref>`.** Without `--base`, the
   command does not guess: it says what is missing and exits with 2. `validate` prints a
   pointer to the subcommand when `consumer-visible-paths` is not empty,
   for the same reason it already points to `drift`.

## Consequences

### What is gained

- `CI-6` is a pure function of (diff, configuration, file) → findings: no git
  inside the check, testable with hand-written diff facts.
- The escape exists, is in the history and carries the reason. Whoever audits six months
  later reads `git log` and knows why there was no entry.
- `validate` remains a read, remains callable in-process, and remains
  executing nothing.

### What is accepted as lost

- Whoever runs the check needs to know the base. In CI that is a provider
  variable; locally it is `git merge-base` by hand. It is the price of not guessing.
- `actions/checkout` needs `fetch-depth: 0` so that the base exists in the
  clone. A shallow clone makes the command exit with 2 instead of lying — it is the
  right behavior, but it is an installation gotcha, and it is written in the
  workflow.
- `consumer-visible-paths` and the `watches` rules marked
  `consumer-visible: true` are two lists that need to agree. They are two
  different moments (the reminder at edit time and the barrier at the PR) and a
  project may legitimately want one without the other; in this repository, a
  dogfooding test enforces the equality of the two instead of letting them drift.
```

- [ ] **Step 2: Add `RF-0008` and `RF-0009` in `draft`**

At the end of `docs/requirements/functional.md`, after `RF-0007`:

```markdown
## RF-0008 — `living-docs changelog --base <ref>` enforces the CHANGELOG entry

- **status:** draft
- **relates-to:** ADR-0006
- **out of scope:** writing the entry — the command enforces, never drafts

`living-docs changelog --base <ref>` compares `<ref>...HEAD`, and fails with code
1 when some changed path matches `consumer-visible-paths` and the same
diff does not bring the doc marked `consumer-visible: true` in `watches` with at least
one item under `## [Unreleased]`, nor the exception label with a reason in some
commit message of the range.

Without `consumer-visible-paths` declared, it says so and exits with 0. Without `--base`,
it exits with 2 — the base of the diff is not guessed. `living-docs validate` does not do that
comparison; when there are `consumer-visible-paths` declared, it points to the
subcommand that does.

## RF-0009 — `init --stage production` installs the historical-trail frame

- **status:** draft
- **relates-to:** RF-0007
- **out of scope:** declaring `consumer-visible-paths`, which is born empty
  with a commented example for the same reason that `watches` and `generated[]` are born
  empty (`RF-0004`)

In the `production` Stage, `living-docs init` creates, besides everything it already created,
`CHANGELOG.md`, `docs/deprecations.md`, `docs/releases/` and `docs/migrations/` from
the templates, and declares the `REL` Artifact in `artifacts:` — with the same
idempotence and the same adoption policy as the other Artifacts.

The list of what the Stage asks for and does not install stays empty: `production` covers
Phases 5 and 6 of spec §10, and both exist.
```

- [ ] **Step 3: Add `RN-0013`, `RN-0014` and `RN-0015` in `draft`**

At the end of `docs/requirements/rules.md`, after `RN-0012`:

```markdown
## RN-0013 — A consumer-visible change travels with the CHANGELOG entry

- **status:** draft
- **relates-to:** ADR-0006
- **out of scope:** the format of the entry, which is Keep a Changelog and lives
  in the template, not in this rule

A change that touches a path declared in `consumer-visible-paths` carries, in the
same diff, the entry in `## [Unreleased]` of the doc marked
`consumer-visible: true` — or a written reason, in the format
`Changelog: none — <reason>`, in some commit message of the range. A label
without a reason is not an exception: it is the ticked box.

The entry is aimed at whoever consumes the software. The single test: if it only makes
sense to whoever wrote the code, it does not belong in the CHANGELOG — and a
CHANGELOG derived from `git log` is the document that narrates the code, which spec
§13 refuses.

## RN-0014 — A conscious shortcut becomes registered debt, and the reminder never blocks

- **status:** draft
- **relates-to:** RN-0013
- **out of scope:** Markdown files, where `TODO` and `FIXME` are prose about
  the marker and not the marker

A new shortcut marker — `TODO`, `FIXME`, `HACK`, `XXX`, a type or lint
suppression, an ignored test — without a `TDR-nnnn` within two lines of distance
generates a reminder, with the path to register the debt. Never a block: a legitimate
shortcut exists, and a hook that forbids it teaches hiding it under another name.

What is enforced is the registration of the shortcut with an observable payment trigger, not
the absence of the shortcut.

## RN-0015 — A deprecation without the four things is not a deprecation

- **status:** draft
- **relates-to:** RN-0013
- **out of scope:** the period between announcement and removal, which is the project's
  versioning policy and lives in `docs/contracts/versioning-policy.md`

A deprecation entry records four things: the announcement date, the removal version
or date, the replacement, and the link to the migration guide. If any one is missing,
it is not a deprecation — it is an announced compatibility break, and it
goes through an ADR.

Announcing a removal without a place for the migration guide is the deprecation that nobody
can follow.
```

- [ ] **Step 4: Run validate and confirm that `draft` passes clean**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: PASS and `exit=0`. It is `draft` that buys this: the five requirements
are not yet `active`, so rule 7 of `CI-3` (coverage by citation) does not
enforce them, and no test mentions them until Tasks 2–9. `ADR-0006` passes because
rule 6 (`accepted` without `relates-to`) only looks at an accepted item.

`CI-2` **is** exercised, and that is what matters to check: `ADR-0006` closes the sequence
of the `ADR` prefix (0001–0006), `RF-0008`/`RF-0009` close that of `RF`,
`RN-0013`–`RN-0015` that of `RN`; and the citations to `RF-0008`, `RN-0013` and
`ADR-0006` need to resolve. Mentions such as `CI-6`, `HK-7` or `SK-7` are
ignored: the citation pattern requires 3 or 4 digits (`src/ids/citations.ts`).

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0006-pr-diff-and-exception-label.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0006, RF-0008, RF-0009, RN-0013, RN-0014, RN-0015): the rule before the code for Phase 6"
```

---

### Task 2: `src/git/diff.ts` — the first module that reads the diff

**Goal:** An injectable diff reader, with the contract **inverted** relative to
`src/git/staged.ts`: an error propagates, it does not become an empty list.

**Files:**

- Create: `src/git/diff.ts`
- Test: `test/git/diff.test.ts`

**Interfaces:**

- Consumes: `GitRunner` from `src/git/staged.ts` — the same type, two policies.
  `export type GitRunner = (args: readonly string[], cwd: string) => string`.
- Produces:
  - `changedPaths(root: string, base: string, run?: GitRunner): string[]`
  - `commitMessages(root: string, base: string, run?: GitRunner): string[]`
  - `class GitError extends Error`
  - `const TIMEOUT_MS: number`
  - `const runGitDiff: GitRunner`

**Requirements:**

- `changedPaths` uses **three dots** (`<base>...HEAD`); `commitMessages` uses
  **two** (`<base>..HEAD`). `ADR-0006`, decisions 1 and 2.
- `-c safe.directory=*` in both, and `-z` in the diff.
- No `catch` that returns empty. An error becomes `GitError` with the first useful
  line of `stderr`.

- [ ] **Step 1: Write the failing test**

Create `test/git/diff.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changedPaths, commitMessages, GitError } from '../../src/git/diff.ts'

const NUL = String.fromCharCode(0)

/** Fake runner: records the arguments received and returns the combined output. */
function fake(output: string): {
  run: (args: readonly string[], cwd: string) => string
  calls: string[][]
} {
  const calls: string[][] = []
  return {
    calls,
    run: args => {
      calls.push([...args])
      return output
    },
  }
}

test('ADR-0006: changedPaths uses three dots, -z and safe.directory', () => {
  const git = fake(`src/cli/index.ts${NUL}CHANGELOG.md${NUL}`)
  const paths = changedPaths('/workspace', 'origin/master', git.run)

  assert.deepEqual(paths, ['src/cli/index.ts', 'CHANGELOG.md'])
  assert.deepEqual(git.calls[0], ['-c', 'safe.directory=*', 'diff', '--name-only', '-z', 'origin/master...HEAD'])
})

test('ADR-0006: a path with an accent comes back whole, with no quotes or escape', () => {
  const git = fake(`docs/caf\u00e9.md${NUL}`)
  assert.deepEqual(changedPaths('/workspace', 'base', git.run), ['docs/caf\u00e9.md'])
})

test('changedPaths normalizes the slash and drops empty entries', () => {
  const git = fake(`src\\cli\\index.ts${NUL}${NUL}`)
  assert.deepEqual(changedPaths('/workspace', 'base', git.run), ['src/cli/index.ts'])
})

test('ADR-0006: commitMessages uses two dots and splits on NUL', () => {
  const git = fake(`feat: one${NUL}\nfix: two\n\nChangelog: none — reason${NUL}\n`)
  const messages = commitMessages('/workspace', 'origin/master', git.run)

  assert.deepEqual(messages, ['feat: one', 'fix: two\n\nChangelog: none — reason'])
  assert.deepEqual(git.calls[0], ['-c', 'safe.directory=*', 'log', '--format=%B%x00', 'origin/master..HEAD'])
})

test('ADR-0006: a git error becomes GitError — this module does not fail open', () => {
  const run = () => {
    const err = new Error('Command failed') as Error & { stderr: string }
    err.stderr = "fatal: bad revision 'origin/does-not-exist'\n"
    throw err
  }

  assert.throws(
    () => changedPaths('/workspace', 'origin/does-not-exist', run),
    (err: unknown) => err instanceof GitError && /bad revision/.test((err as Error).message),
  )
  assert.throws(() => commitMessages('/workspace', 'x', run), GitError)
})

test('GitError names the command that failed, not just the cause', () => {
  const run = () => {
    throw new Error('spawn git ENOENT')
  }
  assert.throws(
    () => changedPaths('/workspace', 'base', run),
    (err: unknown) => err instanceof GitError && /git diff base\.\.\.HEAD/.test((err as Error).message),
  )
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/git/diff.test.ts
```

Expected: FAIL — `Cannot find module '.../src/git/diff.ts'`.

- [ ] **Step 3: Write `src/git/diff.ts`**

```typescript
import { execFileSync } from 'node:child_process'
import type { GitRunner } from './staged.ts'

/**
 * Ceiling of a read-only git command. Generous next to the 3 s of `staged.ts`:
 * `CI-6` runs on the PR, not inside the 5 s budget of a hook (spec §7).
 */
export const TIMEOUT_MS = 10_000

/** A git failure the caller needs to see. There is no shortcut for "I don't know". */
export class GitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitError'
  }
}

const NUL = String.fromCharCode(0)

export const runGitDiff: GitRunner = (args, cwd) =>
  execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    // stderr captured, not inherited: it becomes the GitError message.
    stdio: ['ignore', 'pipe', 'pipe'],
  })

/** The first useful line of the error: stderr if there is any, the message if not. */
function reasonOf(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr
  const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))
  return text.split('\n')[0] ?? text
}

/**
 * `safe.directory=*` for the same reason as `src/git/staged.ts`: the container runs
 * with a uid different from the owner of the mounted checkout (`ADR-0003`), and without it git
 * refuses the repository.
 *
 * Unlike `staged.ts`, here **the error propagates**. There the caller is a hook, and
 * silence costs one question less; here the caller is a check, and silence
 * costs a broken contract passing with the authority of a green CI
 * (`ADR-0006`, decision 3).
 */
function git(args: readonly string[], root: string, run: GitRunner, what: string): string {
  try {
    return run(['-c', 'safe.directory=*', ...args], root)
  } catch (err) {
    throw new GitError(`${what} failed: ${reasonOf(err)}`)
  }
}

/**
 * Paths this branch changed relative to the base, always with `/`.
 *
 * Three dots, not two: it starts from the merge-base, so what entered the base
 * after the branch left does **not** count as a change of the branch (`ADR-0006`).
 * `-z` because without it git wraps in quotes and escapes a path with an accent, and
 * an escaped path matches no glob.
 */
export function changedPaths(root: string, base: string, run: GitRunner = runGitDiff): string[] {
  const output = git(['diff', '--name-only', '-z', `${base}...HEAD`], root, run, `git diff ${base}...HEAD`)

  return output
    .split(NUL)
    .map(path => path.trim().replace(/\\/g, '/'))
    .filter(path => path !== '')
}

/**
 * Full messages of the commits this branch added.
 *
 * Two dots here, on purpose: the question is "which commits belong to this
 * branch", not "what is the content difference". `%x00` separates the messages
 * because they have blank lines inside — the exception label is a
 * trailer, and a trailer lives after a blank line.
 */
export function commitMessages(root: string, base: string, run: GitRunner = runGitDiff): string[] {
  const output = git(['log', '--format=%B%x00', `${base}..HEAD`], root, run, `git log ${base}..HEAD`)

  return output
    .split(NUL)
    .map(message => message.trim())
    .filter(message => message !== '')
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
docker compose exec toolkit node --test test/git/diff.test.ts
docker compose exec toolkit npm run typecheck
```

Expected: PASS on both.

- [ ] **Step 5: Commit**

`src/git/**` is not in `watches`, so `HK-5` does not ask in this task.

```bash
git add src/git/diff.ts test/git/diff.test.ts
git commit -m "feat(ADR-0006): src/git/diff.ts reads the branch diff and does not fail open"
```

---

### Task 3: `CI-6` — changelog required

**Goal:** The pure check. It receives the diff facts by injection, reads the
configuration and the file, and returns findings. It does not talk to git.

**Files:**

- Create: `src/checks/ci6-changelog-required.ts`
- Test: `test/checks/ci6-changelog-required.test.ts`

**Interfaces:**

- Consumes: `Check`, `CheckContext`, `Finding` from `src/core/types.ts`;
  `OWNERSHIP_PATH` from `src/config/ownership.ts`; `picomatch`.
- Produces:
  - `interface DiffFacts { base: string; changed: readonly string[]; messages: readonly string[] }`
  - `ci6ChangelogRequired(diff: DiffFacts): Check`
  - `exceptionReason(messages: readonly string[]): string | null`
  - `unreleasedEntries(source: string): string[]`

**Requirements:**

- Trigger: `config.consumerVisiblePaths`. Empty → no finding (`ADR-0006`,
  decision 5).
- Target: distinct docs of the `watches` rules with `consumerVisible === true`.
  None, with `consumer-visible-paths` declared → configuration finding.
- Exception label: `Changelog: none` **with** a separator and a non-empty reason.
- The entry has to be in the diff **and** the `## [Unreleased]` section has to have
  at least one item (`ADR-0006`, decision 6).

**`HK-5`:** will ask about `docs/requirements/rules.md` (watched path
`src/checks/**`). The answer is: the owner doc traveled in Task 1, with `RN-0013`.

- [ ] **Step 1: Write the failing test**

Create `test/checks/ci6-changelog-required.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ci6ChangelogRequired, exceptionReason, unreleasedEntries } from '../../src/checks/ci6-changelog-required.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
watches:
  - code: "src/api/**"
    doc: CHANGELOG.md
    consumer-visible: true
    reason: "a consumer-visible change is born with the entry in the same PR"
consumer-visible-paths: ["src/api/**"]
`

const CHANGELOG_WITH_ENTRY = `# Changelog

## [Unreleased]

### Added

- \`GET /orders\` returns the total in cents.
`

const CHANGELOG_EMPTY = `# Changelog

## [Unreleased]

### Added

## [1.0.0] - 2026-01-01

- first version
`

function contextFor(root: string, ownership = OWNERSHIP) {
  return { root, config: parseOwnership(ownership), docs: [] }
}

function seedChangelog(root: string, content: string): void {
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'CHANGELOG.md'), content, 'utf8')
}

test('RN-0013: the entry has to travel in the same diff, not just exist in the file', () => {
  withTempRepo({}, root => {
    // The file HAS an entry, but the diff does not touch it: it is the entry of an
    // earlier PR satisfying this one. It is exactly what decision 6 refuses.
    seedChangelog(root, CHANGELOG_WITH_ENTRY)
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/orders.ts'],
      messages: ['feat: total in cents'],
    }).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.ruleId, 'CI-6')
    assert.equal(findings[0]?.severity, 'error')
    assert.equal(findings[0]?.file, 'CHANGELOG.md')
    assert.match(findings[0]?.message ?? '', /is not among the changed paths/)
    assert.match(findings[0]?.message ?? '', /src\/api\/orders\.ts/)
    assert.match(findings[0]?.fix ?? '', /Changelog: none/)
  })
})

test('RN-0013: an entry in the same diff and a filled-in Unreleased passes', () => {
  withTempRepo({}, root => {
    seedChangelog(root, CHANGELOG_WITH_ENTRY)
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/orders.ts', 'CHANGELOG.md'],
      messages: ['feat: total in cents'],
    }).run(contextFor(root))

    assert.deepEqual(findings, [])
  })
})

test('RN-0013: CHANGELOG in the diff with an empty Unreleased does not count', () => {
  withTempRepo({}, root => {
    seedChangelog(root, CHANGELOG_EMPTY)
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/orders.ts', 'CHANGELOG.md'],
      messages: ['feat: total in cents'],
    }).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.match(findings[0]?.message ?? '', /\[Unreleased\]/)
  })
})

test('ADR-0006: the label with a reason releases; without a reason, it does not', () => {
  withTempRepo({}, root => {
    seedChangelog(root, CHANGELOG_WITH_ENTRY)
    const diff = { base: 'origin/master', changed: ['src/api/orders.ts'] }

    assert.deepEqual(
      ci6ChangelogRequired({
        ...diff,
        messages: ['refactor: renames internal\n\nChangelog: none — nothing changes for whoever consumes it'],
      }).run(contextFor(root)),
      [],
    )

    const withoutReason = ci6ChangelogRequired({
      ...diff,
      messages: ['refactor: renames internal\n\nChangelog: none'],
    }).run(contextFor(root))
    assert.equal(withoutReason.length, 1, 'a label without a reason is a ticked box, not an exception')
  })
})

test('a path outside consumer-visible-paths triggers nothing', () => {
  withTempRepo({}, root => {
    seedChangelog(root, CHANGELOG_WITH_ENTRY)
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/internal/cache.ts', 'test/internal/cache.test.ts'],
      messages: ['refactor: cache'],
    }).run(contextFor(root))

    assert.deepEqual(findings, [])
  })
})

test('empty consumer-visible-paths: the check has no trigger and stays quiet', () => {
  withTempRepo({}, root => {
    seedChangelog(root, CHANGELOG_WITH_ENTRY)
    const withoutTrigger = OWNERSHIP.replace('consumer-visible-paths: ["src/api/**"]', 'consumer-visible-paths: []')
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/orders.ts'],
      messages: ['feat: x'],
    }).run(contextFor(root, withoutTrigger))

    assert.deepEqual(findings, [])
  })
})

test('ADR-0006: a declared trigger without a doc marked consumer-visible is a configuration error', () => {
  withTempRepo({}, root => {
    const withoutTarget = OWNERSHIP.replace('    consumer-visible: true\n', '')
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/orders.ts'],
      messages: ['feat: x'],
    }).run(contextFor(root, withoutTarget))

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.file, 'docs/.ownership.yml')
    assert.match(findings[0]?.fix ?? '', /consumer-visible: true/)
  })
})

test('a declared target doc that is absent from the repository is a finding, not silence', () => {
  withTempRepo({}, root => {
    const findings = ci6ChangelogRequired({
      base: 'origin/master',
      changed: ['src/api/orders.ts', 'CHANGELOG.md'],
      messages: ['feat: x'],
    }).run(contextFor(root))

    assert.equal(findings.length, 1)
    assert.match(findings[0]?.message ?? '', /absent/)
  })
})

test('unreleasedEntries reads only the Unreleased section, and recognizes - and *', () => {
  assert.deepEqual(unreleasedEntries(CHANGELOG_WITH_ENTRY), ['- `GET /orders` returns the total in cents.'])
  assert.deepEqual(unreleasedEntries(CHANGELOG_EMPTY), [])
  assert.deepEqual(unreleasedEntries('# Changelog\n\n## Unreleased\n\n* item\n'), ['* item'])
  assert.deepEqual(unreleasedEntries('# Changelog\n\n## [1.0.0]\n\n- item\n'), [])
})

test('exceptionReason accepts em dash, hyphen and colon, and refuses an empty reason', () => {
  assert.equal(exceptionReason(['Changelog: none — tests only']), 'tests only')
  assert.equal(exceptionReason(['Changelog: none - tests only']), 'tests only')
  assert.equal(exceptionReason(['Changelog: none: tests only']), 'tests only')
  assert.equal(exceptionReason(['Changelog: none']), null)
  assert.equal(exceptionReason(['Changelog: none —   ']), null)
  assert.equal(exceptionReason(['feat: x', 'fix: y\n\nchangelog: NONE — lowercase too']), 'lowercase too')
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/checks/ci6-changelog-required.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/checks/ci6-changelog-required.ts`**

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { OWNERSHIP_PATH } from '../config/ownership.ts'

const RULE = 'CI-6'

/** What the check needs to know about the diff. Whoever talks to git is the CLI. */
export interface DiffFacts {
  base: string
  changed: readonly string[]
  messages: readonly string[]
}

/**
 * The exception label (`ADR-0006`, decision 4). The separator is mandatory and so is the
 * reason: `Changelog: none` alone is a ticked box, and a ticked box
 * turns the mechanism off while pretending to comply with it.
 */
const EXCEPTION_LABEL = /^[ \t]*Changelog:[ \t]*none[ \t]*[—–:-][ \t]*(\S.*)$/im

export function exceptionReason(messages: readonly string[]): string | null {
  for (const message of messages) {
    const match = EXCEPTION_LABEL.exec(message)
    const reason = match?.[1]?.trim()
    if (reason) return reason
  }
  return null
}

/**
 * Items under `## [Unreleased]`, in the Keep a Changelog format. Accepts
 * `## Unreleased` without brackets because both forms circulate, and refusing one
 * of them would be the check teaching style instead of enforcing the entry.
 */
export function unreleasedEntries(source: string): string[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(line => /^##\s+\[?unreleased\]?/i.test(line.trim()))
  if (start === -1) return []

  const entries: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (/^##\s/.test(line)) break
    if (/^\s*[-*]\s+\S/.test(line)) entries.push(line.trim())
  }
  return entries
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function error(file: string, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
}

/**
 * `CI-6` — changelog required. Receives the diff facts by injection, and not through
 * `CheckContext`: the diff is a dependency of this check, not of the context that the
 * others share — same choice as `CI-5` with the executor (`ADR-0005`).
 *
 * Source rule: `RN-0013`.
 */
export function ci6ChangelogRequired(diff: DiffFacts): Check {
  return {
    id: RULE,
    name: 'changelog required',
    run(context: CheckContext): Finding[] {
      const globs = context.config.consumerVisiblePaths
      if (globs.length === 0) return []

      const changed = diff.changed.map(normalize)
      const matches = picomatch(globs)
      const hits = changed.filter(path => matches(path))
      if (hits.length === 0) return []

      // The toolkit does not know the path `CHANGELOG.md` and will not come to
      // know it: the target comes from the configuration (spec §3, ADR-0006 decision 5).
      const targets = [...new Set(context.config.watches.filter(watch => watch.consumerVisible).map(watch => normalize(watch.doc)))]

      if (targets.length === 0) {
        return [
          error(
            OWNERSHIP_PATH,
            '`consumer-visible-paths` is declared and no `watches` rule carries `consumer-visible: true` — ' +
              'CI-6 does not know where the entry should be.',
            'Mark with `consumer-visible: true` the `watches` rule whose `doc` is the project changelog ' + '(owning skill: release-historian).',
          ),
        ]
      }

      // A reason written in the history releases — it is the exception of spec §5, SK-7, rule 2.
      if (exceptionReason(diff.messages) !== null) return []

      const trigger = hits.slice(0, 5).join(', ') + (hits.length > 5 ? `, … (+${hits.length - 5})` : '')
      const findings: Finding[] = []

      for (const target of targets) {
        if (!changed.includes(target)) {
          findings.push(
            error(
              target,
              `The diff \`${diff.base}...HEAD\` touches a consumer-visible path (${trigger}) and ` + `\`${target}\` is not among the changed paths.`,
              `Add the entry under \`## [Unreleased]\` of \`${target}\`, aimed at whoever consumes it — or write the reason ` +
                'in the commit message, in the format `Changelog: none — <reason>` (RN-0013; owning skill: release-historian).',
            ),
          )
          continue
        }

        let source: string
        try {
          source = readFileSync(join(context.root, target), 'utf8')
        } catch {
          findings.push(
            error(
              target,
              `\`${target}\` is declared as the consumer-visible change doc and is absent from the repository.`,
              `Create \`${target}\` in the Keep a Changelog format, with \`## [Unreleased]\` at the top ` +
                '(`living-docs init --stage production` installs it; owning skill: release-historian).',
            ),
          )
          continue
        }

        if (unreleasedEntries(source).length === 0) {
          findings.push(
            error(
              target,
              `The diff touches a consumer-visible path (${trigger}) and \`## [Unreleased]\` of \`${target}\` has no items.`,
              'Write the entry under the right subsection (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`). ' +
                'If the entry only makes sense to whoever wrote the code, it does not belong in the CHANGELOG — in that case the ' +
                'way is `Changelog: none — <reason>` (RN-0013).',
            ),
          )
        }
      }

      return findings
    },
  }
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
docker compose exec toolkit node --test test/checks/ci6-changelog-required.test.ts
docker compose exec toolkit npm run typecheck
```

Expected: PASS on both.

- [ ] **Step 5: Commit**

```bash
git add src/checks/ci6-changelog-required.ts test/checks/ci6-changelog-required.test.ts
git commit -m "feat(RN-0013): CI-6 enforces the CHANGELOG entry in the same diff"
```

`HK-5` will ask about `docs/requirements/rules.md`. Answer that the owner doc
traveled in Task 1, with `RN-0013` — the rule came before the code, which is the order
that `CONTRIBUTING.md` demands.

---

### Task 4: `living-docs changelog --base <ref>`, the catalog and the regenerated contract

**Goal:** The subcommand that runs `CI-6`, the pointer in `validate`, the `CI-6` entry
in `CHECK_CATALOG` and the regeneration of `docs/contracts/checks.gen.md`.

**Files:**

- Create: `src/cli/changelog.ts`
- Modify: `src/cli/index.ts`
- Modify: `src/cli/validate.ts`
- Modify: `src/checks/registry.ts`
- Modify: `src/checks/catalog.ts`
- Regenerate: `docs/contracts/checks.gen.md` (never `Edit`/`Write` — `HK-2` denies)
- Test: `test/cli/changelog.test.ts`
- Modify: `test/checks/registry.test.ts`

**Interfaces:**

- Consumes: `changedPaths`, `commitMessages`, `GitError` (Task 2);
  `ci6ChangelogRequired`, `DiffFacts` (Task 3); `loadOwnership`,
  `formatFindings`.
- Produces:
  - `runChangelog(root: string, base: string, run?: GitRunner): ChangelogResult`
  - `interface ChangelogResult { findings: Finding[]; declared: number; exitCode: number }`
  - `changelogChecks(diff?: DiffFacts): readonly Check[]` in `src/checks/registry.ts`
  - `ValidateResult.consumerVisible: number`

**Requirements:**

- Without `--base`: stderr + exit 2. Without `consumer-visible-paths`: message + exit 0.
- `GitError` becomes exit 2 with a message on stderr — the command could not start,
  which is `EXIT-2` of the error catalog, not `EXIT-1`.
- The order of `CHECK_CATALOG` must stay the same as that of
  `[...CHECKS, ...driftChecks(), ...changelogChecks()]`; the registry test
  compares the two lists item by item.

**`HK-5`:** two pending items. `docs/requirements/functional.md` (by
`src/cli/**`) and `docs/requirements/rules.md` (by `src/checks/**`) traveled in
Task 1. `docs/contracts/checks.gen.md` (by `src/checks/catalog.ts`) **travels
in this commit** — regenerate it and add it to `git add`.

- [ ] **Step 1: Write the failing test**

Create `test/cli/changelog.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runChangelog } from '../../src/cli/changelog.ts'
import { GitError } from '../../src/git/diff.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const NUL = String.fromCharCode(0)

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
watches:
  - code: "src/api/**"
    doc: CHANGELOG.md
    consumer-visible: true
consumer-visible-paths: ["src/api/**"]
`

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- \`GET /orders\` returns the total in cents.
`

/** Fake runner: answers `diff` and `log` by the verb's position. */
function gitFake(changed: string[], messages: string[]) {
  return (args: readonly string[]): string => {
    if (args.includes('diff')) return changed.join(NUL) + NUL
    if (args.includes('log')) return messages.join(`${NUL}\n`) + NUL + '\n'
    throw new Error(`unexpected git command: ${args.join(' ')}`)
  }
}

test('RF-0008: the command fails when the entry does not travel in the diff', () => {
  withTempRepo({ 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, root => {
    const result = runChangelog(root, 'origin/master', gitFake(['src/api/orders.ts'], ['feat: total']))

    assert.equal(result.exitCode, 1)
    assert.equal(result.declared, 1)
    assert.equal(result.findings[0]?.ruleId, 'CI-6')
  })
})

test('RF-0008: with the entry in the diff, it exits with 0', () => {
  withTempRepo({ 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, root => {
    const result = runChangelog(root, 'origin/master', gitFake(['src/api/orders.ts', 'CHANGELOG.md'], ['feat: total']))

    assert.equal(result.exitCode, 0)
    assert.deepEqual(result.findings, [])
  })
})

test('RF-0008: without consumer-visible-paths declared, there is nothing to check', () => {
  const withoutTrigger = OWNERSHIP.replace('consumer-visible-paths: ["src/api/**"]', 'consumer-visible-paths: []')
  withTempRepo({ 'docs/.ownership.yml': withoutTrigger, 'CHANGELOG.md': CHANGELOG }, root => {
    const result = runChangelog(root, 'origin/master', () => {
      throw new Error('should not talk to git without a declared trigger')
    })

    assert.equal(result.declared, 0)
    assert.equal(result.exitCode, 0)
    assert.deepEqual(result.findings, [])
  })
})

test('RF-0008: a base that does not resolve becomes GitError — the command does not invent an empty diff', () => {
  withTempRepo({ 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, root => {
    assert.throws(
      () =>
        runChangelog(root, 'origin/nonexistent', () => {
          const err = new Error('Command failed') as Error & {
            stderr: string
          }
          err.stderr = "fatal: bad revision 'origin/nonexistent'\n"
          throw err
        }),
      GitError,
    )
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/cli/changelog.test.ts
```

Expected: FAIL — `src/cli/changelog.ts` does not exist.

- [ ] **Step 3: Write `src/cli/changelog.ts`**

```typescript
import { loadOwnership } from '../config/ownership.ts'
import { changelogChecks } from '../checks/registry.ts'
import { changedPaths, commitMessages } from '../git/diff.ts'
import type { GitRunner } from '../git/staged.ts'
import type { Finding } from '../core/types.ts'

export interface ChangelogResult {
  findings: Finding[]
  /** Globs of `consumer-visible-paths` declared. Zero means "no trigger". */
  declared: number
  exitCode: number
}

/**
 * `living-docs changelog --base <ref>` — runs `CI-6` (`ADR-0006`, decision 7).
 *
 * It talks to git here, and not inside the check: the check remains a
 * pure function of (facts, configuration, file) → findings.
 */
export function runChangelog(root: string, base: string, run?: GitRunner): ChangelogResult {
  const config = loadOwnership(root)

  // Without a declared trigger git is not touched: talking to the repository only
  // to discover that there was nothing to check is a cost with no answer.
  if (config.consumerVisiblePaths.length === 0) {
    return { findings: [], declared: 0, exitCode: 0 }
  }

  const diff = {
    base,
    changed: changedPaths(root, base, run),
    messages: commitMessages(root, base, run),
  }

  // `docs: []` on purpose: CI-6 reads no Artifact — it reads the diff, the
  // configuration and the target doc.
  const context = { root, config, docs: [] }
  const findings = changelogChecks(diff).flatMap(check => check.run(context))

  return {
    findings,
    declared: config.consumerVisiblePaths.length,
    exitCode: findings.some(finding => finding.severity === 'error') ? 1 : 0,
  }
}
```

- [ ] **Step 4: Register `CI-6` in the registry**

In `src/checks/registry.ts`, add the imports and the function:

```typescript
import { ci6ChangelogRequired } from './ci6-changelog-required.ts'
import type { DiffFacts } from './ci6-changelog-required.ts'
```

And, after `driftChecks`:

```typescript
/** Empty diff: only to enumerate the check when nobody has facts to give. */
const NO_DIFF: DiffFacts = Object.freeze({
  base: '',
  changed: [],
  messages: [],
})

/**
 * Checks that `living-docs changelog` runs: the ones that need the branch diff,
 * which `validate` does not have (ADR-0006). The facts come in by injection so that
 * the test does not need a git repository.
 */
export function changelogChecks(diff: DiffFacts = NO_DIFF): readonly Check[] {
  return [ci6ChangelogRequired(diff)]
}
```

- [ ] **Step 5: Add `CI-6` to `CHECK_CATALOG`**

In `src/checks/catalog.ts`, at the **end** of the array (the order must match
`[...CHECKS, ...driftChecks(), ...changelogChecks()]`):

```typescript
  {
    id: 'CI-6',
    name: 'changelog required',
    command: 'living-docs changelog --base <ref>',
    failsWhen:
      'The diff between the base and `HEAD` touches `consumer-visible-paths` and the doc marked `consumer-visible: true` does not come in the same diff with an item under `## [Unreleased]`, nor does any commit message carry `Changelog: none — <reason>`.',
  },
```

- [ ] **Step 6: Update `test/checks/registry.test.ts`**

Replace the body of the three tests with:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECKS, CHECK_CATALOG, changelogChecks, driftChecks } from '../../src/checks/registry.ts'

test('RF-0006 and RF-0008: the catalog covers exactly the checks that exist, with the same names', () => {
  const real = [...CHECKS, ...driftChecks(() => ''), ...changelogChecks()].map(check => `${check.id}|${check.name}`)
  const cataloged = CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}`)
  assert.deepEqual(cataloged, real, 'catalog and registry diverged — the generated contract would lie')
})

test('RF-0006: every catalog item says when it fails and by which command it runs', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} has no written failure condition`)
    assert.match(entry.command, /^living-docs (validate|drift|changelog --base <ref>)$/, `${entry.id} has a strange command`)
  }
})

test('ADR-0005 and ADR-0006: each check runs in the command the catalog names', () => {
  const expected: Record<string, string> = {
    'CI-1': 'living-docs validate',
    'CI-2': 'living-docs validate',
    'CI-3': 'living-docs validate',
    'CI-5': 'living-docs drift',
    'CI-6': 'living-docs changelog --base <ref>',
  }

  for (const entry of CHECK_CATALOG) {
    assert.equal(entry.command, expected[entry.id], `${entry.id} in the wrong command`)
  }
  assert.equal(CHECK_CATALOG.length, Object.keys(expected).length, 'new check without a declared expected command')
})
```

- [ ] **Step 7: Wire the subcommand and the pointer into the CLI**

In `src/cli/validate.ts`, add the field to the interface and to the return:

```typescript
/** Globs of `consumer-visible-paths` — checked by `living-docs changelog`, not here (ADR-0006). */
consumerVisible: number
```

```typescript
    consumerVisible: config.consumerVisiblePaths.length,
```

In `src/cli/index.ts`, add the import and the block. First the imports:

```typescript
import { runChangelog } from './changelog.ts'
import { GitError } from '../git/diff.ts'
```

Then, in `USAGE`, between `drift` and `init`:

```
  changelog   Enforces the CHANGELOG entry of the branch diff (CI-6)
```

and, in the options block, a new section after the `init` options:

```
Changelog options:
  --base <ref>        Base of the diff (required) — e.g.: origin/master
```

Inside `validate`, after the `drift` pointer:

```typescript
if (result.consumerVisible > 0) {
  process.stdout.write(
    `living-docs: ${result.consumerVisible} consumer-visible path(s) declared — the CHANGELOG entry is verified by \`living-docs changelog --base <ref>\` (CI-6).\n`,
  )
}
```

And the new command, after the `drift` block:

```typescript
if (command === 'changelog') {
  const baseIndex = argv.indexOf('--base')
  const base = baseIndex === -1 ? '' : (argv[baseIndex + 1] ?? '')
  if (base === '') {
    process.stderr.write('living-docs: `changelog` needs `--base <ref>` — the base of the diff is not guessed (CI-6, ADR-0006).\n')
    return 2
  }

  const result = runChangelog(root, base)
  if (result.declared === 0) {
    process.stdout.write('living-docs: `consumer-visible-paths` empty in docs/.ownership.yml — nothing to check (CI-6).\n')
    return 0
  }
  process.stdout.write(`${formatFindings(result.findings)}\n`)
  return result.exitCode
}
```

And, in the `catch` of `main`, before the `throw err`:

```typescript
if (err instanceof GitError) {
  process.stderr.write(`living-docs: ${err.message}\n` + '             the clone must contain the base (in CI: `actions/checkout` with `fetch-depth: 0`).\n')
  return 2
}
```

- [ ] **Step 8: Run the tests and regenerate the contract**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: PASS, **except** `test/contracts/drift.test.ts` and/or
`living-docs drift`, which now report drift — the catalog has `CI-6` and the
generated file does not. It is `CI-5` doing exactly its job. Regenerate:

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
docker compose exec toolkit npm test
```

Expected: `drift=0` and PASS. Do **not** use `Edit` or `Write` on
`docs/contracts/checks.gen.md`: `HK-2` denies, and that denial is the mechanism
working.

- [ ] **Step 9: Prove the command by hand**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts changelog; echo "exit=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts changelog --base HEAD; echo "exit=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: `exit=2` on the first (missing `--base`); on the second, `exit=0` with the
empty `consumer-visible-paths` message — this repository only fills it in in
Task 7. On the third, `exit=0` **without** the new pointer line, for the same
reason. If the pointer appears now, `consumer-visible-paths` was filled in
out of turn.

- [ ] **Step 10: Commit**

```bash
git add src/cli/changelog.ts src/cli/index.ts src/cli/validate.ts src/checks/registry.ts src/checks/catalog.ts docs/contracts/checks.gen.md test/cli/changelog.test.ts test/checks/registry.test.ts
git commit -m "feat(RF-0008): living-docs changelog --base runs CI-6, and the checks contract is regenerated"
```

`HK-5` will ask about three docs. `docs/requirements/functional.md` and
`docs/requirements/rules.md` traveled in Task 1; `docs/contracts/checks.gen.md`
is in the `git add` above. Say so and move on.

---

### Task 5: `HK-7` — new shortcut without a TDR

**Goal:** The sixth hook. `PostToolUse` on `Edit|Write`, `additionalContext`,
never `deny`. It is the first hook that does not read `.ownership.yml`.

**Files:**

- Create: `src/hooks/hk7-shortcut-debt.ts`
- Modify: `plugin/hooks/hooks.json`
- Test: `test/hooks/hk7-shortcut-debt.test.ts`
- Modify: `test/plugin/manifest.test.ts`

**Interfaces:**

- Consumes: `applyToolInput` from `src/hooks/lib/edit.ts`; `toRepoPath` from
  `src/hooks/lib/paths.ts`; `contextOutput`, `emit`, `hookEnv`, `readPayload`,
  `HookEnv`, `HookPayload` from `src/hooks/lib/io.ts`.
- Produces:
  - `type Hk7Decision = { action: 'silent' } | { action: 'remind'; context: string }`
  - `decideHk7(payload: HookPayload, env: HookEnv): Hk7Decision`
  - `shortcutsWithoutDebt(source: string): string[]`

**Requirements:**

- Only a **new shortcut**: what was already in the file before the edit does not count.
- A `TDR-nnnn` within two lines of distance silences the marker.
- `.md` files are ignored (`RN-0014`, out of scope): there `TODO` is prose
  **about** the marker — including in `RN-0014` itself.
- Never `deny`. This file does not know the word.

**`HK-5`:** will ask about `docs/requirements/rules.md` (watched path
`src/hooks/**`). The owner doc traveled in Task 1, with `RN-0014`.

- [ ] **Step 1: Write the failing test**

Create `test/hooks/hk7-shortcut-debt.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { decideHk7, shortcutsWithoutDebt } from '../../src/hooks/hk7-shortcut-debt.ts'
import { withTempRepo } from '../helpers/tmp.ts'

function seed(root: string, relative: string, content: string): void {
  const absolute = join(root, relative)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, content, 'utf8')
}

test('RN-0014: a new marker without a TDR nearby becomes a reminder', () => {
  withTempRepo({}, root => {
    seed(root, 'src/billing.ts', 'export const rate = 0.05;\n')

    const decision = decideHk7(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing.ts',
          old_string: 'export const rate = 0.05;',
          new_string: '// TODO: the rate should come from configuration\nexport const rate = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'remind')
    assert.match(decision.action === 'remind' ? decision.context : '', /HK-7/)
    assert.match(decision.action === 'remind' ? decision.context : '', /TODO: the rate/)
    assert.match(decision.action === 'remind' ? decision.context : '', /\/debt/)
    assert.doesNotMatch(decision.action === 'remind' ? decision.context : '', /deny|block/i)
  })
})

test('RN-0014: a marker with a TDR two lines away is silence', () => {
  withTempRepo({}, root => {
    seed(root, 'src/billing.ts', 'export const rate = 0.05;\n')

    const decision = decideHk7(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing.ts',
          old_string: 'export const rate = 0.05;',
          new_string: '// Shortcut registered in TDR-0002.\n//\n// TODO: read from configuration\nexport const rate = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'silent')
  })
})

test('RN-0014: a marker that already existed is not a new shortcut', () => {
  withTempRepo({}, root => {
    seed(root, 'src/billing.ts', '// TODO: old\nexport const rate = 0.05;\n')

    const decision = decideHk7(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing.ts',
          old_string: 'export const rate = 0.05;',
          new_string: 'export const rate = 0.07;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'silent')
  })
})

test('RN-0014: a type suppression and an ignored test also count', () => {
  withTempRepo({}, root => {
    seed(root, 'src/billing.ts', 'const x = 1;\n')

    const decision = decideHk7(
      {
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/billing.ts',
          content: '// @ts-expect-error temporary workaround\nconst x: string = 1;\n',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'remind')
  })

  assert.deepEqual(shortcutsWithoutDebt('test.skip("charges rate", () => {});'), ['test.skip("charges rate", () => {});'])
  assert.deepEqual(shortcutsWithoutDebt('// eslint-disable-next-line no-console'), ['// eslint-disable-next-line no-console'])
  assert.deepEqual(shortcutsWithoutDebt('const x = 1; // TODO_LIST is not a marker'), [])
})

test('RN-0014: a Markdown file is ignored — there TODO is prose about the marker', () => {
  withTempRepo({}, root => {
    seed(root, 'docs/requirements/rules.md', '# rules\n')

    const decision = decideHk7(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'docs/requirements/rules.md',
          old_string: '# rules',
          new_string: '# rules\n\nShortcut marker: TODO, FIXME, ignored test.',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'silent')
  })
})

test('RNF-0001: a file outside the repository and an unpredictable edit are silence', () => {
  withTempRepo({}, root => {
    const env = { root, hostRoots: [root] }

    assert.equal(
      decideHk7(
        {
          tool_name: 'Edit',
          tool_input: {
            file_path: '/outside/x.ts',
            content: '// TODO: x',
          },
        },
        env,
      ).action,
      'silent',
    )
    assert.equal(
      decideHk7(
        {
          tool_name: 'Edit',
          tool_input: {
            file_path: 'src/x.ts',
            old_string: 'none-of-that',
          },
        },
        env,
      ).action,
      'silent',
    )
    assert.equal(decideHk7({ tool_name: 'Edit' }, env).action, 'silent')
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/hooks/hk7-shortcut-debt.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/hooks/hk7-shortcut-debt.ts`**

```typescript
#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write): suggests registering the debt when a new shortcut
 * appears without a `TDR-` nearby.
 *
 * Source rule: LIVING-DOCUMENTATION-TOOLKIT.md §7 — "a legitimate shortcut cannot
 * be blocked". The output is `additionalContext`, and this file does not
 * know the word `deny`. Project rule: `RN-0014`.
 *
 * It is the first hook that does **not** read `docs/.ownership.yml`: a shortcut marker
 * is language syntax, not a project path. There is nothing to configure, and
 * inventing configuration here would be asking the project to declare the obvious.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyToolInput } from './lib/edit.ts'
import { toRepoPath } from './lib/paths.ts'
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type Hk7Decision = { action: 'silent' } | { action: 'remind'; context: string }

const SILENT: Hk7Decision = { action: 'silent' }

/**
 * A closed list, on purpose: a hook that needs to interpret intent is in the
 * wrong place (spec §7). These are the markers the spec names — a prose shortcut,
 * a type or lint suppression, and an ignored test.
 */
const SHORTCUT_MARKERS: readonly RegExp[] = Object.freeze([
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bHACK\b/,
  /\bXXX\b/,
  /@ts-ignore\b/,
  /@ts-expect-error\b/,
  /eslint-disable/,
  /\b(?:test|it|describe)\.(?:skip|todo)\b/,
  /\bskip:\s*true\b/,
])

/** Debt citation. Same format as spec §8, restricted to the TDR prefix. */
const DEBT = /\bTDR-\d{3,4}\b/

/** Neighborhood window: the comment that registers the debt is usually right next to it. */
const NEAR_LINES = 2

/** Lines with a shortcut marker and no `TDR-` in the neighborhood, already trimmed. */
export function shortcutsWithoutDebt(source: string): string[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const found: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (!SHORTCUT_MARKERS.some(marker => marker.test(line))) continue

    const window = lines.slice(Math.max(0, i - NEAR_LINES), i + NEAR_LINES + 1).join('\n')
    if (DEBT.test(window)) continue

    found.push(line.trim())
  }

  return found
}

/** What `after` has and `before` does not — counting repetition, not just presence. */
function onlyInAfter(before: readonly string[], after: readonly string[]): string[] {
  const remaining = [...before]
  const added: string[] = []

  for (const line of after) {
    const at = remaining.indexOf(line)
    if (at === -1) added.push(line)
    else remaining.splice(at, 1)
  }

  return added
}

export function decideHk7(payload: HookPayload, env: HookEnv): Hk7Decision {
  const toolInput = payload.tool_input
  if (!toolInput) return SILENT

  const filePath = toolInput.file_path
  if (typeof filePath !== 'string') return SILENT

  const repoPath = toRepoPath(filePath, env.hostRoots)
  if (repoPath === null) return SILENT

  // In Markdown, `TODO` is prose **about** the marker — RN-0014 itself
  // writes it. A reminder on every doc edit teaches ignoring the reminder.
  if (repoPath.toLowerCase().endsWith('.md')) return SILENT

  let current: string
  try {
    current = readFileSync(join(env.root, repoPath), 'utf8')
  } catch {
    current = '' // new file: everything that comes in is new
  }

  const next = applyToolInput(current, toolInput)
  if (next === null) return SILENT // the result cannot be predicted

  const added = onlyInAfter(shortcutsWithoutDebt(current), shortcutsWithoutDebt(next))
  if (added.length === 0) return SILENT

  return {
    action: 'remind',
    context:
      `HK-7: \`${repoPath}\` gained a shortcut marker with no debt registered nearby.\n` +
      `${added.map(line => `- \`${line}\``).join('\n')}\n` +
      'Source rule: LIVING-DOCUMENTATION-TOOLKIT.md §7 and `RN-0014` — a conscious shortcut becomes `TDR-nnnn` ' +
      'with an observable payment trigger, not an orphan `TODO`. Valid path: `/debt <the shortcut>` ' +
      '(owning skill: decision-recorder), and cite the `TDR-nnnn` on the marker line.\n' +
      'This is a reminder, not a block: a legitimate shortcut exists, and the decision to register it or not is human.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()
  if (!payload) return // fail open
  const decision = decideHk7(payload, hookEnv())
  emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null)
}

if (process.argv[1]?.endsWith('hk7-shortcut-debt.ts')) {
  main().catch(() => process.exit(0)) // fail open, always
}
```

- [ ] **Step 4: Register the hook in `plugin/hooks/hooks.json`**

In the `PostToolUse` / `Edit|Write` group, after `hk4-watch-reminder`:

```json
{
  "type": "command",
  "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk7-shortcut-debt",
  "shell": "bash",
  "async": false
}
```

`run-hook.sh` **does not change**: it receives the hook name as an argument and invokes one
file per hook. What distinguishes the event is the file, not the wrapper.

- [ ] **Step 5: Update `test/plugin/manifest.test.ts`**

Two changes. In the matchers test, the value of `PostToolUse:Edit|Write`:

```typescript
    'PostToolUse:Edit|Write': ['hk4-watch-reminder', 'hk7-shortcut-debt'],
```

and its title becomes `'hooks.json registers the six hooks on the events and matchers of spec §7'`.

In the file-existence test, the final count:

```typescript
assert.equal(seen, 6, 'the scan should see the six hooks of Phases 1, 3, 5 and 6')
```

- [ ] **Step 6: Run and watch it pass**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: PASS on both.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/hk7-shortcut-debt.ts plugin/hooks/hooks.json test/hooks/hk7-shortcut-debt.test.ts test/plugin/manifest.test.ts
git commit -m "feat(RN-0014): HK-7 reminds to register the new shortcut, and never blocks"
```

`HK-5` asks about `docs/requirements/rules.md` — it traveled in Task 1, with
`RN-0014`.

---

### Task 6: `REL` in the lifecycle, templates and `init --stage production`

**Goal:** The `production` Stage now installs the historical-trail
frame, and its `notInstalled` list becomes empty. A release note gets an ID
family so that `HK-1` can freeze it after it is published.

**Files:**

- Modify: `src/docs/schema.ts`
- Create: `templates/changelog.md`
- Create: `templates/deprecations.md`
- Create: `templates/release-note.md`
- Create: `templates/migration.md`
- Modify: `templates/ownership.yml`
- Modify: `templates/CODEOWNERS`
- Modify: `src/cli/init.ts`
- Test: `test/cli/init.test.ts` (append)

**Interfaces:**

- Consumes: `STATUS_MACHINE`, `HUMAN_PROMOTIONS` from `src/docs/schema.ts`;
  `runInit`, `InitOptions`, `Stage` from `src/cli/init.ts`.
- Produces: the `REL` prefix with states `['draft', 'published']`; the placeholders
  `{{RELEASES_BLOCK}}` and `{{HISTORY_CODEOWNERS}}` in the templates;
  `NOT_INSTALLED.production === []`.

**Requirements:**

- **`REL` goes into `artifacts:`, unlike `CHANGELOG.md` and
  `docs/deprecations.md`.** The reason is not taste: `HK-1` only freezes a path that
  `findArtifactRule` resolves, and spec §7 requires it to freeze a published
  release note. Without a prefix, that half of `HK-1` does not exist. The other two
  stay in the category of `DA-0002`, outside `artifacts:`.
- `production` remains idempotent and remains adopting what already exists.
- `init` does **not** fill in `consumer-visible-paths` (`RF-0009`, out of
  scope).

**`HK-5`:** `src/cli/**` asks for `docs/requirements/functional.md`, which traveled in
Task 1 with `RF-0009`.

- [ ] **Step 1: Write the failing test**

Append to the end of `test/cli/init.test.ts`:

```typescript
test('RF-0009: production installs the historical-trail frame', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/releases/.gitkeep', 'docs/migrations/.gitkeep']) {
      assert.ok(existsSync(join(root, path)), `${path} belongs to production`)
    }

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
    assert.match(changelog, /^## \[Unreleased\]$/m, 'the CHANGELOG has to open with Unreleased')
    assert.doesNotMatch(changelog, /^---$/m, 'CHANGELOG is aimed at the consumer: no frontmatter')
  })
})

test('RF-0009: production declares the REL Artifact, so that HK-1 freezes a published release note', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    const config = loadOwnership(root)
    const rel = config.artifacts.find(artifact => artifact.idPrefix === 'REL')
    assert.ok(rel, 'without REL in artifacts:, HK-1 has no way to freeze a release note')
    assert.equal(rel?.path, 'docs/releases/')
    assert.equal(rel?.appendOnly, true)
    assert.equal(rel?.skill, 'release-historian')
  })
})

test('RF-0009: production does not invent consumer-visible-paths', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)
    assert.deepEqual(loadOwnership(root).consumerVisiblePaths, [])
  })
})

test('RF-0009: production leaves nothing of spec §10 out', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)
    assert.deepEqual(result.notInstalled, [], `production should be complete — ${JSON.stringify(result.notInstalled)}`)
  })
})

test('RF-0009: moving up from small-team to production declares REL in the existing .ownership.yml', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'small-team' })
    assert.equal(
      loadOwnership(root).artifacts.some(artifact => artifact.idPrefix === 'REL'),
      false,
      'small-team does not install the historical trail',
    )

    runInit(root, PRODUCTION)
    assert.ok(loadOwnership(root).artifacts.some(artifact => artifact.idPrefix === 'REL'))
    assert.equal(runValidate(root).exitCode, 0, 'the repository just moved up a Stage has to pass clean')
  })
})
```

Check the top of the file: `PRODUCTION`, `existsSync`, `readFileSync`, `join`,
`runValidate` and `loadOwnership` have to be imported. `PRODUCTION` already
exists (line 322); add to the `node:fs` import whatever is missing, and
`import { loadOwnership } from '../../src/config/ownership.ts';` and
`import { runValidate } from '../../src/cli/validate.ts';` if they are not
there yet.

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts
```

Expected: FAIL — `CHANGELOG.md` does not exist, `REL` is not declared, and
`notInstalled` still names Phase 6.

- [ ] **Step 3: Add `REL` to the lifecycle**

In `src/docs/schema.ts`, inside `STATUS_MACHINE`, after `RN`:

```typescript
  REL: ['draft', 'published'],
```

And in `HUMAN_PROMOTIONS`, after `{ from: 'active', to: 'revoked' }`:

```typescript
  { from: 'draft', to: 'published' },
```

`published` has been in `FROZEN_STATUSES` since Phase 0 — it is what makes `HK-1`
freeze the release note as soon as it goes out (spec §7).

- [ ] **Step 4: Write the four templates**

`templates/changelog.md` — **without frontmatter**, on purpose:

```markdown
# Changelog

This file is aimed at whoever **consumes** this software. The single test: if the
entry only makes sense to whoever wrote the code, it does not belong here.
Format: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

The entry is born in the PR that causes the change, not on the eve of the release.

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security
```

`templates/deprecations.md`:

```markdown
---
title: Deprecations
owner: '{{OWNER}}'
trigger: >
  When something published is announced for removal, and when an announced
  deprecation is actually removed.
last-reviewed: { { TODAY } }
---

# Deprecations

A deprecation records four things, without exception: the announcement date, the
removal version or date, the replacement, and the link to the migration guide.
If any one is missing, it is not a deprecation — it is a compatibility break, and it goes
through an ADR.

| What | Announced on | Removed on | Replacement | Migration guide | Status |
| ---- | ------------ | ---------- | ----------- | --------------- | ------ |

<!-- Owning skill: release-historian. -->
```

`templates/release-note.md`:

```markdown
---
id: REL-0001
title: v0.0.0
status: draft
owner: '{{OWNER}}'
trigger: >
  Never. Frozen once published; a new version is born alongside.
last-reviewed: { { TODAY } }
relates-to: []
---

# v0.0.0 — <date>

Derived from `CHANGELOG.md`, not written anew. What changes here is the frame:
the highlight of the version, what demands attention from whoever upgrades, and the links.

## Highlights

## Attention when upgrading

## Deprecations announced in this version

## Entries

<!-- Copied from the version's section in CHANGELOG.md. -->
```

`templates/migration.md`:

```markdown
---
title: Migration — <from> to <to>
owner: '{{OWNER}}'
trigger: >
  When a change breaks compatibility, in the same PR that decides it.
last-reviewed: { { TODAY } }
---

# Migration — <from> to <to>

## What broke

## Why

<!-- The ADR that decided. A migration without a recorded decision is a break without a why. -->

## How to migrate

1.

## How to know it is finished
```

- [ ] **Step 5: Add the blocks to the configuration templates**

In `templates/ownership.yml`, right after `{{REQUIREMENTS_BLOCK}}`:

```
{{RELEASES_BLOCK}}
```

And replace the `consumer-visible-paths` comment at the end of the file:

```yaml
# Trigger of CI-6: which paths, when they change, are visible to whoever consumes
# this software. init does not invent them, for the same reason it does not invent
# `watches`. The `watches` rule that points at the CHANGELOG has to carry
# `consumer-visible: true` — it is what tells CI-6 where the entry should be.
# Example:
#
# watches:
#   - code: "src/api/**"
#     doc: CHANGELOG.md
#     consumer-visible: true
#     reason: "a consumer-visible change is born with the entry in the same PR"
#
# consumer-visible-paths: ["src/api/**"]
consumer-visible-paths: []
```

In `templates/CODEOWNERS`, the placeholders are inline on a single line. Add
`{{HISTORY_CODEOWNERS}}` right after `{{CONTRACTS_CODEOWNERS}}`, with no line break
between them — the last line of the file becomes:

```
{{REQUIREMENTS_CODEOWNERS}}{{AGREEMENTS_CODEOWNERS}}{{CONTRACTS_CODEOWNERS}}{{HISTORY_CODEOWNERS}}docs/.ownership.yml    {{OWNER}}
```

- [ ] **Step 6: Teach `init`**

In `src/cli/init.ts`:

1. `Kind` gains `'REL'`:

```typescript
type Kind = 'ADR' | 'DA' | 'TDR' | 'RF' | 'RNF' | 'RN' | 'REL'
```

2. `DEFAULT_PATHS` gains the line `REL: 'docs/releases/',` and
   `ADOPTION_CANDIDATES` gains:

```typescript
  REL: ['docs/release-notes/', 'releases/', 'docs/release/'],
```

3. After `CONTRACTS`, the new set:

```typescript
/** Historical trail (SK-7), installed from the `production` Stage on (spec §10, Phase 6). */
const HISTORY: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'CHANGELOG.md', template: 'changelog.md' },
  { path: 'docs/deprecations.md', template: 'deprecations.md' },
])

/** Per-item-file directories that the historical trail uses (spec §3). */
const HISTORY_DIRS: readonly string[] = Object.freeze(['docs/migrations/'])
```

4. `NOT_INSTALLED.production` becomes `[]`:

```typescript
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
  // `production` covers Phases 5 and 6 of spec §10, and both exist.
  production: [],
})
```

5. The `REL` block of `.ownership.yml`, next to `requirementsBlock`:

```typescript
/** The REL Artifact of `.ownership.yml`, or empty outside the `production` Stage. */
function releasesBlock(owner: string, path: string, stage: Stage): string {
  if (stage !== 'production') return ''

  return (
    '\n' +
    [
      '  - id-prefix: REL',
      `    path: ${path}`,
      `    owner: "${owner}"`,
      '    skill: release-historian',
      '    # A published release note is frozen by HK-1 (spec §5, SK-7, rule 4).',
      '    append-only: true',
      '    mutable-fields: [status, last-reviewed]',
    ].join('\n') +
    '\n'
  )
}
```

6. In `runInit`, `kinds` now includes `REL` in the `production` Stage:

```typescript
const kinds: Kind[] =
  options.stage === 'solo'
    ? ['ADR', 'DA', 'TDR']
    : options.stage === 'production'
      ? ['ADR', 'DA', 'TDR', ...REQUIREMENT_KINDS, 'REL']
      : ['ADR', 'DA', 'TDR', ...REQUIREMENT_KINDS]
```

7. In `values`, two new fields. The `??` is not decoration: `paths` only gains the
   `REL` key in the `production` Stage, so outside it `paths.REL` is
   `undefined` at run time even though the type says `string`.

```typescript
    RELEASES_BLOCK: releasesBlock(options.owner, paths.REL ?? DEFAULT_PATHS.REL, options.stage),
    HISTORY_CODEOWNERS:
      options.stage === 'production'
        ? `CHANGELOG.md    ${options.owner}\ndocs/deprecations.md    ${options.owner}\ndocs/releases/    ${options.owner}\ndocs/migrations/    ${options.owner}\n`
        : '',
```

8. Generalize the function that inserts a block into the existing `.ownership.yml`. Replace
   `declareRequirements` with:

```typescript
/**
 * Appends a block of Artifacts to a `.ownership.yml` that already exists.
 * Nothing is rewritten: the block goes in immediately before `generated:`, which is the
 * first key after `artifacts:` in the template. Without that anchor — a
 * hand-reorganized file — init does not guess: it says what is missing and
 * leaves the edit to whoever owns the file.
 */
function declareArtifacts(root: string, options: InitOptions, result: InitResult, block: string, what: string): void {
  const file = join(root, OWNERSHIP_PATH)
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const anchor = '\ngenerated:'

  if (!source.includes(anchor)) {
    result.notInstalled.push(`${what} in ${OWNERSHIP_PATH} — anchor \`generated:\` not found; ` + 'declare them by hand so that the Artifacts have an owner')
    return
  }

  result.created.push(`${OWNERSHIP_PATH} (${what})`)
  if (options.dryRun) return
  writeFileSync(file, source.replace(anchor, `${block}\ngenerated:`), 'utf8')
}
```

And the call that existed becomes:

```typescript
if (existing && missing.length > 0) {
  declareArtifacts(root, options, result, values.REQUIREMENTS_BLOCK, 'RF, RNF and RN Artifacts')
}
```

9. In the `if (options.stage === 'production')` block, after the contracts:

```typescript
if (options.stage === 'production') {
  for (const contract of CONTRACTS) {
    writeIfAbsent(root, contract.path, template(contract.template, values), options, result)
  }

  // Moving up a Stage: REL has to be declared in a `.ownership.yml` that
  // already exists, otherwise the release note is born without an owner — and an orphan
  // Artifact is not enforceable (spec §3), nor freezable by HK-1.
  if (existing && !existing.artifacts.some(artifact => artifact.idPrefix === 'REL')) {
    declareArtifacts(root, options, result, values.RELEASES_BLOCK, 'REL Artifact')
  }

  for (const item of HISTORY) {
    writeIfAbsent(root, item.path, template(item.template, values), options, result)
  }
  ensureDirectory(root, paths.REL ?? DEFAULT_PATHS.REL, options, result)
  for (const dir of HISTORY_DIRS) ensureDirectory(root, dir, options, result)
}
```

- [ ] **Step 7: Run and watch it pass**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: PASS. If `test/cli/init.test.ts` reports a non-empty `notInstalled` in
the old test at line 350 (`production says that Phase 6 does not come along yet`),
**delete that test**: it asserted exactly what this task undoes, and the new
tests from Step 1 cover its place.

Also prove it in a throwaway repository, without inventing anything:

```bash
docker compose exec toolkit sh -c 'rm -rf /tmp/proof && mkdir -p /tmp/proof && cd /tmp/proof && LIVING_DOCS_REPO_ROOT=/tmp/proof node /opt/living-docs/src/cli/index.ts init --stage production --owner @proof && LIVING_DOCS_REPO_ROOT=/tmp/proof node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"'
```

Expected: the list of created items includes `CHANGELOG.md`, `docs/deprecations.md`,
`docs/releases/` and `docs/migrations/`; **no** `not installed` line; and
`validate=0`.

- [ ] **Step 8: Commit**

```bash
git add src/docs/schema.ts src/cli/init.ts templates/ test/cli/init.test.ts
git commit -m "feat(RF-0009): production installs the historical trail and declares REL"
```

`HK-5` asks about `docs/requirements/functional.md` — it traveled in Task 1, with
`RF-0009`.

---

### Task 7: Dogfooding — this repository gains a historical trail

**Goal:** The toolkit starts to fulfill what it demands. A real `CHANGELOG.md`,
real `consumer-visible-paths`, `watches` pointing at the changelog, `REL`
declared, and a test that keeps the two lists from drifting.

**Files:**

- Create: `CHANGELOG.md`
- Create: `docs/deprecations.md`
- Create: `docs/releases/.gitkeep`
- Create: `docs/migrations/.gitkeep`
- Modify: `docs/.ownership.yml`
- Modify: `CODEOWNERS`
- Test: `test/docs/release-history.test.ts`

**Interfaces:**

- Consumes: `loadOwnership` and `toolkitRoot`.
- Produces: non-empty `consumer-visible-paths` in this repository — which is what takes
  `CI-6` out of the inert state.

**Requirements:**

- The globs of `consumer-visible-paths` and the `code` of the rules marked
  `consumer-visible: true` are **the same set**, and a test enforces that
  (`ADR-0006`, "what is accepted as lost").
- Nothing here is guessed: the list of public paths comes from the "What is
  public" section of `docs/contracts/versioning-policy.md`.
- `CHANGELOG.md` without frontmatter; `docs/deprecations.md` with.

**`HK-5`:** this commit touches `docs/**` and the root, no watched code path.
The question should not appear. If it does, some `src/` file
entered `git add` by mistake.

- [ ] **Step 1: Write the failing test**

Create `test/docs/release-history.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadOwnership } from '../../src/config/ownership.ts'
import { unreleasedEntries } from '../../src/checks/ci6-changelog-required.ts'
import { toolkitRoot } from '../../src/core/roots.ts'

const ROOT = toolkitRoot()
const config = loadOwnership(ROOT)

test('RN-0013: this repository declares what is visible to the consumer', () => {
  assert.ok(config.consumerVisiblePaths.length > 0, 'consumer-visible-paths empty: CI-6 would be installed and inert')
})

test('ADR-0006: the two lists of the mechanism agree, and a test keeps them from drifting', () => {
  const triggers = new Set(config.consumerVisiblePaths)
  const watched = new Set(config.watches.filter(watch => watch.consumerVisible).map(watch => watch.code))

  assert.deepEqual(
    [...watched].sort(),
    [...triggers].sort(),
    'consumer-visible-paths and the `consumer-visible: true` rules drifted — CI-6 and HK-5 would start enforcing different things',
  )
})

test('ADR-0006: some watches rule says where the entry should be', () => {
  const targets = new Set(config.watches.filter(watch => watch.consumerVisible).map(watch => watch.doc))
  assert.deepEqual([...targets], ['CHANGELOG.md'])
})

test('RN-0013: the CHANGELOG is aimed at the consumer — Keep a Changelog, no frontmatter', () => {
  const source = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8')

  assert.doesNotMatch(source, /^---$/m, 'living-documentation frontmatter does not belong in the CHANGELOG')
  assert.match(source, /^## \[Unreleased\]$/m)
  assert.ok(unreleasedEntries(source).length > 0, 'Phase 6 changes the public contract: Unreleased cannot be empty')
})

test('RN-0015: the deprecations table enforces the four things', () => {
  const source = readFileSync(join(ROOT, 'docs/deprecations.md'), 'utf8')
  const header = source.split('\n').find(line => line.trim().startsWith('| What |'))

  assert.ok(header, 'docs/deprecations.md without the table')
  for (const column of ['Announced on', 'Removed on', 'Replacement', 'Migration guide']) {
    assert.ok(header.includes(column), `the table needs the column "${column}"`)
  }
})

test('RN-0001: the historical trail has an owner in CODEOWNERS, like every Artifact', () => {
  const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8')
  for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/releases/', 'docs/migrations/']) {
    assert.match(codeowners, new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+@\\S+$`, 'm'), `${path} without an owner`)
  }
})

test('REL is declared, so that HK-1 freezes a published release note', () => {
  const rel = config.artifacts.find(artifact => artifact.idPrefix === 'REL')
  assert.ok(rel)
  assert.equal(rel?.appendOnly, true)
  assert.equal(rel?.skill, 'release-historian')
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/docs/release-history.test.ts
```

Expected: FAIL — `CHANGELOG.md` does not exist and `consumer-visible-paths` is
empty.

- [ ] **Step 3: Write `CHANGELOG.md`**

At the root. The entries describe what Phase 6 has changed in the public contract so
far — nothing like "added `src/git/diff.ts`", which is code narrative:

```markdown
# Changelog

This file is aimed at whoever **consumes** `living-docs`. The single test: if the
entry only makes sense to whoever wrote the code, it does not belong here.
Format: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

The entry is born in the PR that causes the change, not on the eve of the release.

## [Unreleased]

### Added

- Subcommand `living-docs changelog --base <ref>`: fails when the branch diff
  touches a path declared in `consumer-visible-paths` and the entry under
  `## [Unreleased]` does not travel along (`CI-6`).
- Exception label `Changelog: none — <reason>` in the commit message, for the
  change that is in fact not visible to whoever consumes. Without a reason, it does not count.
- Hook `HK-7`: a new shortcut marker (`TODO`, `FIXME`, type or lint
  suppression, ignored test) without a `TDR-nnnn` nearby generates a reminder. Never
  a block.
- `living-docs init --stage production` now installs `CHANGELOG.md`,
  `docs/deprecations.md`, `docs/releases/` and `docs/migrations/`, and declares the
  `REL` Artifact in `docs/.ownership.yml`.
- ID prefix `REL` for release notes, with the states `draft` and `published`.
  Once published, it is frozen by `HK-1`.

### Changed

- `living-docs validate` now points at `living-docs changelog` when the
  repository declares `consumer-visible-paths` — a pointer, not a finding: the exit
  code does not change.
- The "not installed" list of `--stage production` becomes empty: the Stage
  now covers Phases 5 and 6 of the spec in full.
```

- [ ] **Step 4: Write `docs/deprecations.md`**

```markdown
---
title: Deprecations
owner: '@esliph/engineering'
trigger: >
  When something published is announced for removal, and when an announced
  deprecation is actually removed.
last-reviewed: 2026-08-26
---

# Deprecations

A deprecation records four things, without exception: the announcement date, the
removal version or date, the replacement, and the link to the migration guide
(`RN-0015`). If any one is missing, it is not a deprecation — it is a compatibility
break, and it goes through an ADR.

What is public, and therefore can be deprecated, is in
`docs/contracts/versioning-policy.md`.

| What | Announced on | Removed on | Replacement | Migration guide | Status |
| ---- | ------------ | ---------- | ----------- | --------------- | ------ |

No deprecation announced so far. The empty table is information: nothing that
is public has changed meaning since the first version.

<!-- Owning skill: release-historian. -->
```

- [ ] **Step 5: Create the directories and declare everything**

```bash
docker compose exec -w /workspace toolkit sh -c 'mkdir -p docs/releases docs/migrations && : > docs/releases/.gitkeep && : > docs/migrations/.gitkeep'
```

In `docs/.ownership.yml`, add the `REL` Artifact after the `RN` block:

```yaml
- id-prefix: REL
  path: docs/releases/
  owner: '@esliph/engineering'
  skill: release-historian
  # A published release note is frozen by HK-1 (spec §5, SK-7, rule 4).
  # That is why REL has an ID family and CHANGELOG.md does not: HK-1 only
  # freezes a path that `findArtifactRule` resolves.
  append-only: true
  mutable-fields: [status, last-reviewed]
```

In `watches`, after the last existing rule:

```yaml
# CI-6 (mechanism 1 at the boundary with whoever consumes). The `code` entries here and the list
# `consumer-visible-paths` below are the same set on purpose, and
# test/docs/release-history.test.ts keeps them from drifting: they are two moments —
# the reminder at edit time and the barrier at the PR.
- code: 'src/cli/**'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'subcommand, option and exit code are public contract (docs/contracts/versioning-policy.md)'

- code: 'src/checks/catalog.ts'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'the check IDs are public and do not change meaning'

- code: 'src/config/ownership.ts'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'the schema of .ownership.yml with version 1 is the contract of whoever installs'

- code: 'plugin/**'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'skill, hook and command IDs are public'

- code: 'templates/**'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'it is what `init` writes into the repository of whoever installs'

- code: 'bin/living-docs'
  doc: CHANGELOG.md
  consumer-visible: true
  reason: 'the host→container bridge is how the toolkit is invoked'
```

And replace the last line of the file:

```yaml
consumer-visible-paths:
  - 'src/cli/**'
  - 'src/checks/catalog.ts'
  - 'src/config/ownership.ts'
  - 'plugin/**'
  - 'templates/**'
  - 'bin/living-docs'
```

In `CODEOWNERS`, add:

```
CHANGELOG.md    @esliph/engineering
docs/deprecations.md    @esliph/engineering
docs/releases/    @esliph/engineering
docs/migrations/    @esliph/engineering
```

- [ ] **Step 6: Run and watch it pass**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Expected: PASS, `validate=0` (now **with** the pointer line to
`living-docs changelog`) and `drift=0`.

- [ ] **Step 7: Commit**

```bash
git add CHANGELOG.md docs/deprecations.md docs/releases/.gitkeep docs/migrations/.gitkeep docs/.ownership.yml CODEOWNERS test/docs/release-history.test.ts
git commit -m "docs(RN-0013, RN-0015): the toolkit starts fulfilling the historical trail it demands"
```

---

### Task 8: `SK-7` release-historian and `CM-7` `/release`

**Goal:** The skill that owns the four Artifacts and the command that triggers it.

**Files:**

- Create: `plugin/skills/release-historian/SKILL.md`
- Create: `plugin/commands/release.md`
- Modify: `plugin/.claude-plugin/plugin.json`
- Modify: `test/plugin/manifest.test.ts`
- Modify: `test/plugin/authoring.test.ts`
- Modify: `CONTRIBUTING.md`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: the conventions of spec §11, verified by
  `test/plugin/authoring.test.ts` (automatic scan of `plugin/skills/`).
- Produces: the `release-historian` skill, referenced by `docs/.ownership.yml`
  (Task 7) — without it, `test/plugin/manifest.test.ts` would already be failing.

**Requirements:**

- Mandatory structure of spec §11, in order: `## Overview`,
  `## What you own`, `## When to use / when not to`, `## Procedure`,
  `## Boundaries`, `## Checklist`.
- `description` > 120 characters, containing "Use", in symptom language.
- Checklist with ≥ 6 boxes, each naming `CI-n`, `HK-n` or "human".
- **None of the content of the Artifacts inside the skill** — point at the templates.
- `plugin/commands/release.md` with fewer than 25 lines.

**`HK-5`:** `plugin/skills/**` asks for `CONTRIBUTING.md`, and `plugin/**` now asks
`CHANGELOG.md` (Task 7). Both are in the `git add` of this commit.

- [ ] **Step 1: Write `plugin/skills/release-historian/SKILL.md`**

```markdown
---
name: release-historian
description: >
  Use when something changes for whoever consumes this software — an endpoint, a
  command-line option, an output format, observable behavior —, when it is
  time to publish a version, when someone asks "what changed in version
  X?", "does this break whoever already uses it?", "when will this be removed?", "where
  do I migrate to?", "does this need a CHANGELOG entry?", or when CI complains
  that the entry is missing. Also when announcing or concluding a deprecation, and when
  writing the migration guide for a compatibility-breaking change.
---

# release-historian — owner of the historical trail

## Overview

Four Artifacts, a single audience: whoever is on the outside. `CHANGELOG.md`
says what changed, the release note gives the frame of a version, `docs/deprecations.md`
warns what is going away, and `docs/migrations/` teaches how to cross over.

The costly mistake here has a name: deriving the CHANGELOG from `git log`. The result is the
document that narrates the code — exactly what spec §13 refuses — and it
rots fast, because nobody on the outside can use it to decide whether to
upgrade.

The paths come from `docs/.ownership.yml`; do not assume. `consumer-visible-paths`
says what is visible to the consumer in this project, and the `watches` rule marked
`consumer-visible: true` says where the entry lives.

## What you own

| Artifact               | What it is                          | Form                                                             |
| ---------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `CHANGELOG.md`         | What changed, for whoever consumes  | Single file, Keep a Changelog, `Unreleased` at the top           |
| `docs/releases/`       | The frame of each published version | One file per version, `REL-nnnn`, frozen once published          |
| `docs/deprecations.md` | What was announced for removal      | Single file, table, mutable                                      |
| `docs/migrations/`     | How to cross over each break        | One file per migration                                           |

The seeds are in `templates/changelog.md`, `templates/release-note.md`,
`templates/deprecations.md` and `templates/migration.md`. Do not reproduce their
content here.

## When to use / when not to

**Use** when the diff touches `consumer-visible-paths`; when a version is going to be
published; when something published is announced for removal; when a change
breaks compatibility.

**Do not use** to record an internal change. Refactoring, renaming a file,
a new test and a message tweak have no entry — the way there is the label
`Changelog: none — <reason>`, and the reason is mandatory.

**The cost of using it needlessly** is the entry that nobody can read: a CHANGELOG
with thirty lines of internal detail hides the one line that mattered, and the
consumer stops reading. `CI-6` enforces that the entry exists; that it is
readable is human.

## Procedure

1. **Find out what is visible to the consumer in this project.** Read
   `consumer-visible-paths` in `docs/.ownership.yml`. If it is empty, the
   project has not yet declared the boundary: that is the first conversation, and it is
   human.
2. **Write the entry in the PR that causes the change**, under `## [Unreleased]`, in the
   right subsection (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
   `Security`). One sentence, from the point of view of whoever uses it.
3. **Apply the single test:** if the entry only makes sense to whoever wrote the
   code, delete it and use `Changelog: none — <reason>` in the commit message.
4. **A deprecation requires four things** — announcement date, removal version or
   date, replacement, link to the migration guide. If any is missing,
   **stop** and bring the gap: do not register a half deprecation.
5. **A migration guide per compatibility-breaking change**, in
   `docs/migrations/`, pointing at the ADR that decided it. A break without an ADR is a decision
   without a why — the way is `/adr` first.
6. **The release note is derived from the CHANGELOG**, not written anew: move the
   entries from `Unreleased` to the version's section, and write only the frame.
7. **It is born `draft`.** Publishing is a human act — `HK-3` intercepts, and the answer
   is not yours. After `published`, `HK-1` freezes the file.

## Boundaries

| Yours                                    | Not yours                                                           |
| ---------------------------------------- | ------------------------------------------------------------------- |
| The CHANGELOG entry and its subsection   | Deciding what is public (that is `contract-keeper`)                 |
| The release note and its freezing        | Promoting to `published` (that is human)                            |
| The deprecations table                   | The versioning policy (that is `contract-keeper`)                   |
| The migration guide                      | The ADR that decided the break (that is `decision-recorder`)        |
| Refusing an incomplete deprecation       | Blocking the change that has no entry (`CI-6` fails, you do not deny) |
| Pointing at `Changelog: none` as the way out | Writing the reason in place of whoever decided                  |

## Checklist

- [ ] The entry was born in the PR that caused the change, not afterwards — verification: `CI-6`.
- [ ] The doc marked `consumer-visible: true` traveled in the same diff — verification: `CI-6` (and `HK-5` asks beforehand).
- [ ] The entry is readable by whoever consumes, and does not narrate the code — verification: human.
- [ ] When there is no entry, there is a `Changelog: none — <reason>` with a written reason — verification: `CI-6`.
- [ ] Every registered deprecation has the four things — verification: human (`RN-0015`).
- [ ] Every compatibility break has a migration guide pointing at the ADR — verification: human.
- [ ] The release note was born `draft` and was promoted by a person — verification: `HK-3`.
- [ ] No published release note had its body edited — verification: `HK-1`.
- [ ] No new shortcut was left without a `TDR-nnnn` — verification: `HK-7` reminds; registering is human.
```

- [ ] **Step 2: Write `plugin/commands/release.md`**

```markdown
---
description: Prepares a version — derives the release note from the CHANGELOG and moves the Unreleased entries.
argument-hint: '[version]'
---

Trigger the `release-historian` skill to prepare version `$ARGUMENTS`.

The release note is **derived** from `CHANGELOG.md`, never written anew: the
entries under `## [Unreleased]` become the version's section, and the note keeps the
frame — highlights, what demands attention from whoever upgrades, announced
deprecations.

It is born `status: draft`. Publishing is a human act: `HK-3` intercepts the promotion
and the answer is not yours. After `published`, `HK-1` freezes the file.
```

- [ ] **Step 3: Update the plugin tests**

In `test/plugin/manifest.test.ts`, in the commands test:

```typescript
const expected = ['adr.md', 'open-decision.md', 'debt.md', 'docs-setup.md', 'term.md', 'release.md']
```

and, in the loop, the expression that demands the skill pointer:

```typescript
assert.match(source, /decision-recorder|living-docs-bootstrap|glossary-keeper|release-historian/, `${name} must point at the skill it triggers`)
```

Also change the test title, from "the five commands" to "the six commands".

In `test/plugin/authoring.test.ts`, append at the end:

```typescript
test('release-historian: the description names the symptoms of visible change, version and deprecation', () => {
  const description = String(parseFrontmatter(skillSource('release-historian'))?.data.description ?? '')
  assert.match(description, /Use when/i)
  for (const symptom of ['consum', 'version', 'migrat', 'deprecat']) {
    assert.ok(description.toLowerCase().includes(symptom), `the description should contain the symptom "${symptom}"`)
  }
})

test('release-historian does not duplicate the content of the Artifacts it governs', () => {
  const source = skillSource('release-historian')
  assert.match(source, /templates\/changelog\.md/, 'it must point at the template, not copy it')
  assert.match(source, /templates\/migration\.md/, 'all four templates, because there are four Artifacts')
  assert.doesNotMatch(source, /^## \[Unreleased\]$/m, 'the skill must not contain the CHANGELOG of this repository')
})
```

- [ ] **Step 4: Update the plugin manifest**

In `plugin/.claude-plugin/plugin.json`, in the `description`, replace "Phases 0–5" with
"Phases 0–6" and add "historical trail aimed at whoever consumes" to the
enumeration. `version` does not change: the versioning policy does not tie the plugin
version to the rollout phase.

- [ ] **Step 5: Add the line to `CONTRIBUTING.md`**

In the "Where the truth lives" table, after the contracts line:

```markdown
| What changed for whoever uses it | `CHANGELOG.md` and `docs/releases/` |
```

- [ ] **Step 6: Add the CHANGELOG entry**

Under `## [Unreleased]` / `### Added` of `CHANGELOG.md`:

```markdown
- Skill `release-historian` and command `/release [version]`, owners of
  `CHANGELOG.md`, release notes, deprecations and migration guides.
```

- [ ] **Step 7: Run and watch it pass**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Expected: PASS and `validate=0`.

- [ ] **Step 8: Commit**

```bash
git add plugin/skills/release-historian/SKILL.md plugin/commands/release.md plugin/.claude-plugin/plugin.json test/plugin/manifest.test.ts test/plugin/authoring.test.ts CONTRIBUTING.md CHANGELOG.md
git commit -m "feat(SK-7, CM-7): release-historian and /release, owners of the historical trail"
```

`HK-5` will ask about `CONTRIBUTING.md` and `CHANGELOG.md`. Both are in the
`git add`. Say so and move on.

---

### Task 9: Indexes, public contract and the end-to-end proof

**Goal:** Close the phase where it is read — README, Definition of Done,
workflow, error contract, versioning policy, agent contract and
backlog — and prove `CI-6` against real git, not only against made-up
facts.

**Files:**

- Modify: `README.md`
- Modify: `docs/definition-of-done.md`
- Modify: `templates/definition-of-done.md`
- Modify: `.github/workflows/living-docs.yml`
- Modify: `docs/contracts/errors.md`
- Modify: `docs/contracts/versioning-policy.md`
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`
- Modify: `test/acceptance/spec-criteria.test.ts`
- Modify: `docs/superpowers/plans/BACKLOG-phases-3-7.md`

**Interfaces:**

- Consumes: everything Tasks 2–8 produced.
- Produces: no new API.

**Requirements:**

- The workflow needs `fetch-depth: 0` on `actions/checkout`, otherwise the base of the
  diff does not exist in the clone and the step exits with 2 (`ADR-0006`).
- No numbered acceptance criterion closes here; the new test covers the
  **mechanism**, not a criterion.
- `docs/contracts/checks.gen.md` is not edited — it was already regenerated in Task 4 and
  does not change in this one.

**`HK-5`:** `templates/**` asks for `CHANGELOG.md` (Task 7), and it is in the
`git add`.

- [ ] **Step 1: Write the mechanism test**

Append to the end of `test/acceptance/spec-criteria.test.ts`:

```typescript
test('Phase 6 mechanism: a consumer-visible change is enforced, and a written reason releases', () => {
  const OWNERSHIP = [
    'version: 1',
    'artifacts:',
    '  - id-prefix: ADR',
    '    path: docs/decisions/adr/',
    '    owner: "@team"',
    '    skill: decision-recorder',
    'watches:',
    '  - code: "src/api/**"',
    '    doc: CHANGELOG.md',
    '    consumer-visible: true',
    'consumer-visible-paths: ["src/api/**"]',
    '',
  ].join('\n')

  const CHANGELOG = '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- `GET /orders` responds in cents.\n'
  const NUL = String.fromCharCode(0)

  const git =
    (changed: string[], messages: string[]) =>
    (args: readonly string[]): string =>
      args.includes('diff') ? changed.join(NUL) + NUL : messages.join(`${NUL}\n`) + NUL + '\n'

  withTempRepo({ 'docs/.ownership.yml': OWNERSHIP, 'CHANGELOG.md': CHANGELOG }, root => {
    // without the entry in the diff: fails, naming the file and the watched path
    const failed = runChangelog(root, 'base', git(['src/api/orders.ts'], ['feat: cents']))
    assert.equal(failed.exitCode, 1)
    assert.equal(failed.findings[0]?.file, 'CHANGELOG.md')

    // with the entry in the same diff: passes
    assert.equal(runChangelog(root, 'base', git(['src/api/orders.ts', 'CHANGELOG.md'], ['feat: cents'])).exitCode, 0)

    // without an entry, but with the reason written in the history: passes
    assert.equal(
      runChangelog(root, 'base', git(['src/api/orders.ts'], ['refactor: renames internal\n\nChangelog: none — nothing changes for whoever consumes it'])).exitCode,
      0,
    )
  })
})

test('Phase 6 mechanism: a new shortcut without a TDR is reminded, never blocked', () => {
  withTempRepo({}, root => {
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src/billing.ts'), 'export const rate = 0.05;\n', 'utf8')

    const decision = decideHk7(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing.ts',
          old_string: 'export const rate = 0.05;',
          new_string: '// FIXME: wrong rounding in cents\nexport const rate = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'remind', 'HK-7 is additionalContext: it reminds and hands control back')
    assert.match(decision.action === 'remind' ? decision.context : '', /TDR/)
  })
})
```

Add the missing imports to the top of the file:

```typescript
import { runChangelog } from '../../src/cli/changelog.ts'
import { decideHk7 } from '../../src/hooks/hk7-shortcut-debt.ts'
```

- [ ] **Step 2: Update the Definition of Done**

There are three edits in `docs/definition-of-done.md`, and the **same three** in
`templates/definition-of-done.md`.

One new box, after the generated-Artifact one:

```markdown
- [ ] The consumer-visible change carried the entry under `## [Unreleased]`, or the reason written in the commit — verification: `CI-6` (`living-docs changelog --base <ref>`).
```

The conscious-shortcut box, which already exists on line 20 of both files,
now names the hook that reminds about it — **do not create a new box for this**:

```markdown
- [ ] The conscious shortcut became a `TDR-nnnn` with an observable payment trigger — verification: `HK-7` reminds; recording it is human.
```

And the last box now names the new command:

```markdown
- [ ] `npm test`, `npm run typecheck`, `living-docs validate`, `living-docs drift` and `living-docs changelog --base <ref>` pass in the container — verification: `CI-1`, `CI-2`, `CI-3`, `CI-5` and `CI-6`, run by the repository workflow.
```

- [ ] **Step 3: Update the workflow**

In `.github/workflows/living-docs.yml`, the checkout gains depth:

```yaml
- uses: actions/checkout@v4
  with:
    # CI-6 compares <base>...HEAD; a shallow clone does not have the base (ADR-0006).
    fetch-depth: 0
```

And a new step, after the `drift` one:

```yaml
- name: CI-6 — CHANGELOG entry
  if: github.event_name == 'pull_request'
  run: >
    docker compose run --rm -w /workspace toolkit
    node /opt/living-docs/src/cli/index.ts changelog
    --base ${{ github.event.pull_request.base.sha }}
```

The `if` is not laziness: on `push` there is no "PR base", and inventing one
would be the check measuring what it can instead of what it should.

- [ ] **Step 4: Update the public contract**

In `docs/contracts/errors.md`, three lines change and one is born:

- `EXIT-0`: add "; `changelog` with no finding" to the "When it occurs" column.
- `EXIT-1`: add "; or `changelog` with a consumer-visible change without an
  entry or exception label".
- `UNKNOWN-COMMAND`: the list becomes "`validate`, `drift`, `changelog` or
  `init`".
- A new line, before `UNKNOWN-COMMAND`:

```markdown
| BASE-UNRESOLVED | The PR diff could not be read | `changelog` without `--base`, with a base that does not resolve, or in a shallow clone that does not contain the base | exit 2, message on stderr starting with `living-docs:` | yes | active |
```

In `docs/contracts/versioning-policy.md`:

- In the "What is public" section, the subcommands line now lists
  `validate`, `drift`, `changelog` and `init`, and add an item:

```markdown
- The exception label `Changelog: none — <reason>` and the keys
  `consumer-visible-paths` and `watches[].consumer-visible` of
  `docs/.ownership.yml` (`ADR-0006`).
```

- Replace in full the paragraph that begins with "While Phase 6 does not exist"
  with:

```markdown
The trail is complete: `CHANGELOG.md` records the announcement, `docs/deprecations.md`
keeps the four required things, `docs/migrations/` receives the guide, and
`docs/releases/` the note of the version that removed it. Owning skill: `release-historian`.
```

- [ ] **Step 5: Update the README**

- The opening paragraph now says "Phases 0–6", and adds to the list: the
  `CI-6` checks, the `HK-7` hooks, and the historical trail (`SK-7`).
- In "Usage", a new line after `drift`:

```bash
./bin/living-docs changelog --base origin/master   # runs CI-6: did the consumer-visible change carry an entry?
```

- In "Maturity stages", `production` now adds "the frame of
  contracts **and** the historical trail (CHANGELOG, release notes, deprecations and
  migration guides)", and the sentence "and says that Phase 6 does not come along yet" goes away.
- In "Claude Code plugin", add `release-historian` (`/release`) and
  `HK-7`.
- In "What is left out", the list becomes: `AG-1`, `HK-6`, `CI-4`, `CI-7`,
  `CI-8`, `CM-5` — Phase 7 of the spec.
- In the paragraph on criterion 5, nothing changes: the second half remains
  `CI-7`, Phase 7.

- [ ] **Step 6: Update the agent contract**

In `CLAUDE.md`, in the `## Policy` section, after the line "Document and code
travel together":

```markdown
- **A change visible to whoever consumes travels with an entry in `CHANGELOG.md`** —
  or with the reason written in the commit. `CI-6` enforces; the format of the label is in the
  contract.
```

And in the `## Commands` section, add `/release` to the list and `release-historian`
to the list of skills selected by `description`.

Two lines, only index and policy — no factual claim lives there
(`RN-0010`).

- [ ] **Step 7: Add the CHANGELOG entry**

Under `## [Unreleased]` / `### Changed`:

```markdown
- The repository workflow now runs `CI-6` on pull requests, and
  `actions/checkout` now requires `fetch-depth: 0` — a shallow clone does not
  contain the base of the diff.
```

And under `### Added`:

```markdown
- Error code `BASE-UNRESOLVED`: `changelog` without `--base`, with a base that does not
  resolve, or in a shallow clone.
```

- [ ] **Step 8: Prove `CI-6` against real git**

The tests prove the check with hand-written facts. This step proves the whole
path — git, CLI, configuration — on a **throwaway** branch. Nothing on
`master` changes.

```bash
git switch -c proof-ci6
printf '\n' >> bin/living-docs
git add bin/living-docs
git commit -m "test(CI-6): proof commit, throwaway"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts changelog --base master; echo "exit=$?"
```

Expected: `exit=1`, with a finding in `CHANGELOG.md` naming `bin/living-docs`.
Now the label:

```bash
git commit --allow-empty -m "$(printf 'test(CI-6): exception label\n\nChangelog: none — throwaway verification commit')"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts changelog --base master; echo "exit=$?"
```

Expected: `exit=0`. And the discard:

```bash
git switch master
git branch -D proof-ci6
git status --short
```

Expected: clean `git status`. If `bin/living-docs` shows up modified, the
change escaped the branch — revert with `git checkout -- bin/living-docs`.

- [ ] **Step 9: Update the backlog**

In `docs/superpowers/plans/BACKLOG-phases-3-7.md`:

1. Add a status block at the top, in the format of the previous ones: Phase 6
   is **implemented**, the plan is this file, `ADR-0006` is `accepted` and
   `RF-0008`/`RF-0009`/`RN-0013`/`RN-0014`/`RN-0015` are `active`, promoted
   by human act (write this **after** Task 10; if it does not happen,
   write the real state).
2. Mark the "Phase 6" section as **IMPLEMENTED** and add "What the
   planning found out", with at least: (a) why the exception label became
   `ADR-0006` instead of the `DA` the backlog foresaw; (b) three dots in the diff and
   two in the log, and the reason for each; (c) the trigger coming from
   `consumer-visible-paths` and the target from `watches`, with the test that keeps the
   two lists from drifting; (d) `REL` got an ID family **because** `HK-1`
   only freezes a path that `findArtifactRule` resolves — and `CHANGELOG.md` did not
   get one, by the same criterion as `ADR-0004`.
3. In the "Phase 7" section, record the inheritance: `src/git/diff.ts` exists and
   `CI-7` can read it if it needs the diff; `changelogChecks` is the third
   grouping of checks and `CI-4` probably goes into `validate`, not into a
   subcommand, because it needs no external state — what it needs is
   `CheckContext.today`, and that remains a prerequisite to resolve
   **before** writing the check.
4. In "Inherited debts and open decisions": `--stage production` is now
   complete (`notInstalled` empty); `--stage multi-team` still does not exist
   and still must be born together with Phase 7; `DA-0002` stays open and
   remains a precondition of `CI-7`.
5. In "Suggested order from here", strike Phase 6 and promote Phase 7 to next
   step.

- [ ] **Step 10: Run everything and commit**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Expected: PASS, `validate=0`, `drift=0`.

```bash
git add README.md docs/definition-of-done.md templates/definition-of-done.md .github/workflows/living-docs.yml docs/contracts/errors.md docs/contracts/versioning-policy.md CLAUDE.md CHANGELOG.md test/acceptance/spec-criteria.test.ts docs/superpowers/plans/BACKLOG-phases-3-7.md
git commit -m "docs(CI-6, HK-7, SK-7): the historical trail in the indexes and in the public contract"
```

---

### Task 10: Human promotion

**Goal:** Take `ADR-0006` to `accepted` and `RF-0008`, `RF-0009`, `RN-0013`,
`RN-0014`, `RN-0015` to `active`. **This is not yours.** The skill writes `draft`;
promoting is a human act (`RN-0005`), and `HK-3` intercepts with `ask`.

**Files:**

- Modify: `docs/decisions/adr/ADR-0006-pr-diff-and-exception-label.md`
- Modify: `docs/requirements/functional.md`
- Modify: `docs/requirements/rules.md`

**Interfaces:**

- Consumes: the IDs of Task 1 and the citations planted by Tasks 2–9.
- Produces: the six items in their final state, enforceable by `CI-3`.

**Requirements:**

- Before proposing the promotion, check that each item **already** has someone citing it:
  `RF-0008` in `test/cli/changelog.test.ts` and `test/checks/registry.test.ts`;
  `RF-0009` in `test/cli/init.test.ts`; `RN-0013` in
  `test/checks/ci6-changelog-required.test.ts`,
  `test/docs/release-history.test.ts` and `src/checks/ci6-changelog-required.ts`;
  `RN-0014` in `test/hooks/hk7-shortcut-debt.test.ts` and
  `src/hooks/hk7-shortcut-debt.ts`; `RN-0015` in
  `test/docs/release-history.test.ts`. Without a citation, promoting to `active` makes
  `CI-3` (rule 7) fail on the spot.
- `ADR-0006` was already born with `relates-to` filled in (Task 1). After
  `accepted` the file freezes and `relates-to` is not in `mutable-fields`:
  fixing it would require superseding.
- `last-reviewed` only changes on a file that was actually reviewed. A bulk bump is
  an anti-requirement of spec §13.

- [ ] **Step 1: Confirm that the citations exist**

```bash
docker compose exec toolkit sh -c 'grep -rn "RF-0008\|RF-0009\|RN-0013\|RN-0014\|RN-0015" test/ src/'
```

Expected: at least one occurrence of each, in a file **different** from the
requirement. A citation inside the Artifact itself covers nothing (`CI-3`, rule 7).

- [ ] **Step 2: Propose the promotion — and leave the answer to whoever decides**

Edit the six states: `status: draft` → `status: accepted` in `ADR-0006`;
`- **status:** draft` → `- **status:** active` in `RF-0008`, `RF-0009`,
`RN-0013`, `RN-0014` and `RN-0015`.

`HK-3` will intercept each of those edits with `ask`. **The answer is not
yours.** Present what the person needs to decide — what the ADR decides (where
the diff comes from, what the label is, where the check runs), what is accepted as lost
(the two lists that need to agree, the `fetch-depth: 0`), and that the
requirements already have coverage — and wait.

If the person refuses any of them, that is a legitimate outcome: the item
stays `draft`, Phase 6 stays delivered, and the backlog records the real
state. Do not force, do not work around, and do not "advance" the promotion because the plan
ends here.

- [ ] **Step 3: Run everything and confirm that the final state passes**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Expected: PASS, `validate=0`, `drift=0`. If `CI-3` reports `RN-0013 is active
and is not cited`, Step 1 lied — the citation is in the file itself, or in a
path outside `cited-by`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/adr/ADR-0006-pr-diff-and-exception-label.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0006, RF-0008, RF-0009, RN-0013, RN-0014, RN-0015): promotion by human act"
```

If the promotion did not happen, do not invent the commit: go back to Task 9, Step 9, and
write the real state in the backlog ("`ADR-0006` remains `draft`").

---

## What this phase deliberately does not do

- **It does not resolve `DA-0002`.** `CHANGELOG.md` and `docs/deprecations.md` go into the
  same category as `CONTRIBUTING.md`, the DoD, the glossary, the charter and the written
  contracts: an Artifact with an owner and no ID family, outside
  `artifacts:`. `docs/releases/` is the exception, and the reason is mechanical, not
  aesthetic — `HK-1` only freezes a path that `findArtifactRule` resolves, and spec
  §7 requires it to freeze a published release note. `DA-0002` stays open, a
  precondition of `CI-7` (Phase 7).
- **It does not create `AG-1` or `/docs-audit`.** That is Phase 7, and it is the agent that answers "what
  should this diff have updated and did not" — a different question from the
  one `CI-6` asks.
- **It does not create `CI-4` or `CheckContext.today`.** The toolkit still has no injectable
  date source, and it remains a prerequisite of Phase 7. No code in this
  phase reads the system date.
- **It does not measure volume or write a CHANGELOG entry from `git log`.**
  `CI-6` enforces the **existence** of the entry; that it is readable by whoever
  consumes is for `SK-7` and is human. Counting entries would be the
  document-volume metric that spec §13 refuses.
- **It does not pay `TDR-0001`.** `HK-1` still freezes per file, not per
  section. The payment trigger remains the first PR that revokes a
  requirement — and Task 6 adds `REL` to `HK-1` without changing that.
- **It does not change `run-hook.sh`, `src/git/staged.ts` or `src/exec/command.ts`.** The
  wrapper already dispatches by hook name; `staged.ts` fails open because its caller
  is a hook; `command.ts` does not fail open because its caller is a check.
  `diff.ts` is born alongside with the policy of the second. Touching the three would be
  free improvement on code that works.
- **It does not create `--stage multi-team`.** It is born together with Phase 7, not before:
  a Stage that installs an empty frame is the dead wiki being born at the factory.
