# kanon Slice 2a — the Delta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give kanon the deterministic spine of the change cycle: a change folder with its deltas, a validator inside `kanon lint`, and the commands that open a change, merge it into the current specs, drop it and list the open ones.

**Architecture:** A change is `changes/<id>/` with a `proposal.md` and one delta per capability, mirroring the path of the spec it changes. `src/changes/` reads it (`change.ts`, `delta.ts`) and merges it with a pure function (`apply.ts`); `src/checks/delta.ts` holds the new lint rules; `src/cli/` orchestrates — `lint.ts` loads the project once and brings the open changes into the lint, `change.ts` opens, syncs and drops, `status.ts` is a view. Nothing here needs a model, and no dependency comes in.

**Tech Stack:** Node 24 running TypeScript as written (no build, `erasableSyntaxOnly`), `node:test` + `node:assert/strict`, `tsc --noEmit`, ESLint, Prettier, and the vendored runner `../../spur` from `plugins/kanon/`.

**Spec:** `docs/superpowers/specs/2026-10-02-kanon-delta-design.md`

### Where this plan adds to the spec, and why

Every code block below was run before this plan was written: the files of Tasks 2 to 9, applied together on a copy of `plugins/kanon/`, give 116 passing tests, a clean type-check and a lint with no error.

- **Three test files the spec does not list**: `test/specs/parse.test.ts` (the block boundary is a change to an existing parser, and gets its own cycle), `test/changes/change.test.ts` (the change ID and `proposal.md`) and `test/cli/status.test.ts`.
- **Three existing files the spec does not list as changed**: `src/checks/ids.ts` (the format, the registered prefix and the counter move to `checkIdForm`, so a delta is held to them without the uniqueness and tombstone rules of a current spec), `src/cli/report.ts` (`plural` is exported for `status`) and `test/helpers/project.ts` (two fixtures and the fixed date).
- **`Requirement.endLine` is the last line of the block that is not blank.** The blank lines that follow belong to the block too (spec §6.1); `apply.ts` is the one that needs them, and it walks over them itself.

### Where the spec is silent, and what this plan does

These are behaviors the spec does not state. Task 1 puts them in front of the human owner with the draft requirements; any one they reject is changed in the requirement **and** in the task that implements it before that task starts.

1. **A `proposal.md` whose front matter does not parse is a `kanon/change-shape` error**, like a missing one — not an exit 2. One broken change does not stop the lint of the whole project.
2. **A delta is every `spec.md` under `changes/<id>/specs/`**, at any depth, as a spec is under `specs/`. Any other file there is ignored.
3. **A level-1 heading in a delta closes the section above it**: a requirement after it is outside a section.
4. **`Supersedes:` may share a metadata line** with other fields separated by `·`, and may name several IDs separated by commas.
5. **`sync` and `drop` refuse an argument that is not a change ID** (exit 1) before it reaches the disk — `../x` and `archive` included.
6. **`drop` on a change with no `proposal.md`, or with one that has no front matter, writes the front matter**, so an archived change always says how it ended.
7. **`drop` says every ID it skips**, including the ones that were never allocated (bad format, unregistered prefix, above the counter), not only the active ones and the tombstones.
8. **A REMOVED of a requirement whose prefix has no registry** takes the block out and writes no tombstone: there is no file to write it in. The current specs already fail `kanon/id-registered` for it.
9. **A spec keeps its line endings.** A spec written with Windows line endings gets the incoming blocks with Windows line endings.
10. **A delta for a registered capability whose spec file is gone** is applied to an empty text, and `sync` creates the file.
11. **The environment variable is `KANON_TODAY`**, a date as `YYYY-MM-DD`; any other value is exit 2.
12. **Output formats.** `sync` and `drop` print `written  <path>` per file and `moved  <from> -> <to>`; `drop` prints `tombstone  <ID>` and `skipped  <ID>  <why>` first. `status` prints `<id>  N errors, N warnings` and, indented under it, `<capability>  N added, N modified, N removed`; with no open change, `kanon: no open change.`

## Global Constraints

- **Two commits**, as the spec's §9 asks: the requirements alone (Task 1), then the code (Task 10). Tasks 2 to 9 end by **staging** their files, never by committing: `git diff` is the task under review, `git diff --cached` is what the earlier tasks delivered.
- **The rule comes before the code.** No task from 2 on starts before Task 1's requirements exist. A skill writes `draft`; promoting to `active` is the human owner's act and is never done by an agent.
- **IDs.** This plan uses `RN-0052` to `RN-0059` and `RF-0025` to `RF-0030`, the next free numbers of the repository's single ID space when it was written. Task 1 confirms they are still free; if one is not, every later task uses the numbers Task 1 actually took, in the same order.
- **Every test cites the ID of the rule it covers** in its name, as the existing tests do.
- **No new dependency.** The plugin directory copied alone runs on Node 24 or greater, with no build step (`RNF-0008`). What kanon writes in a project is Markdown or YAML (`RNF-0007`).
- **What the plugin ships stays free of this repository's IDs and spec sections**: nothing under `plugins/kanon/plugin/commands/`, `skills/` or `templates/` cites one, and under `plugin/src/` an ID appears only in a comment. `test/distribution/no-internal-trace.test.ts` enforces it.
- **`plugins/kanon/README.md` and `plugins/kanon/CHANGELOG.md` are for an outside reader**: no artifact ID in either.
- **Exit codes**: 0 done, 1 refused or an error found, 2 could not run. `kanon status` exits 0 even when a change has errors.
- **A finding is `file:line  rule  severity  message`**, two spaces between the fields; a finding about a file or a folder as a whole has line 0 and prints no `:line`.
- **Fixed paths**: `changes/` and `changes/archive/`. The lint never reads `changes/archive/`.
- **Change ID**: `YYYY-MM-DD-<slug>`, the slug matching `[a-z0-9]+(-[a-z0-9]+)*`; the date is the local date on which the change is opened.
- **`sync` and `drop` never commit**, and no code in this plan runs `git`.
- **Everything versioned is English.** Commit subjects are `type(ID): subject`; commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Commands run from `plugins/kanon/`** unless a step says otherwise, in a POSIX shell (Git Bash on Windows). One file: `node --test test/<path>.test.ts`. Everything: `../../spur check`.
- **Done when `../../spur check` passes from `plugins/kanon/`.**

## Review Focus

What a person using this is most likely to meet that the spec does not spell out. Each line names the task whose tests pin it.

1. **A spec with Windows line endings** — `sync` keeps them, in the blocks it brings in too, and leaves no line ending mixed. Pinned in Task 4 (`apply.test.ts`) and Task 7 (`change.test.ts`).
2. **An argument to `sync` or `drop` that is a path, not an ID** (`../outside`, `archive`, `..`) — refused before anything is read or moved. Pinned in Task 7.
3. **One broken change among several** — a missing, empty or unparsable `proposal.md`, or a folder with a name that is no ID, is a finding on that change; the lint still runs, and `sync` of another change is not stopped by it. Pinned in Tasks 5, 6 and 7.
4. **A heading inside a code fence**, in a spec or in a delta — it ends no block and opens no section, so an example quoted under a requirement leaves and stays with it. Pinned in Tasks 2, 3 and 4.
5. **`drop` of a change that never got valid** — no proposal, IDs typed by hand, the same ID added twice, a section that is no section — still archives it, and never turns a live requirement into a tombstone. Pinned in Task 7.

---

## File Structure

All paths are under `plugins/kanon/`.

| File                                    | Task | Responsibility                                                                                     |
| --------------------------------------- | ---- | -------------------------------------------------------------------------------------------------- |
| `docs/requirements/rules.md`            | 1    | `RN-0052` to `RN-0059`                                                                             |
| `docs/requirements/functional.md`       | 1    | `RF-0025` to `RF-0030`                                                                             |
| `plugin/src/specs/parse.ts`             | 2    | A requirement records the last line of its block; `findSpecs` walks any directory                  |
| `plugin/src/changes/delta.ts`           | 3    | Reads a delta into operations, each with its section, its lines and its text                       |
| `plugin/src/changes/apply.ts`           | 4    | The pure merge: the text of a spec and the operations give the new text and the tombstones         |
| `plugin/src/core/paths.ts`              | 5    | The `changes/` and `changes/archive/` paths                                                        |
| `plugin/src/changes/change.ts`          | 5    | The change ID, finding open and archived changes, reading and marking `proposal.md`                |
| `plugin/src/checks/ids.ts`              | 6    | `checkIdForm` split out of `checkIds`                                                              |
| `plugin/src/checks/delta.ts`            | 6    | The seven new rules                                                                                |
| `plugin/src/cli/lint.ts`                | 6    | `loadProject`, `lintProject`, and `runLint` over specs and open changes                            |
| `plugin/src/cli/change.ts`              | 7    | `openChange`, `syncChange`, `dropChange`                                                           |
| `plugin/templates/proposal.md`          | 7    | The seed of a `proposal.md`                                                                        |
| `plugin/src/cli/status.ts`              | 8    | `runStatus`, `formatStatus`                                                                        |
| `plugin/src/cli/report.ts`              | 8    | `plural` exported                                                                                  |
| `plugin/src/cli/index.ts`               | 6–8  | The usage text and the routing of `change` and `status`; the date                                  |
| `plugin/commands/change.md`, `status.md` | 9   | The two session commands                                                                           |
| `plugin/commands/ears-lint.md`          | 9    | Says the lint covers open changes                                                                  |
| `.ownership.yml`, `CHANGELOG.md`, `README.md` | 10 | The documents that travel with the code                                                       |
| `test/helpers/project.ts`               | 5, 7 | `proposal`, `change`, `TODAY`, and the fixed date of every run                                     |
| `test/specs/parse.test.ts`              | 2    |                                                                                                    |
| `test/changes/delta.test.ts`            | 3    |                                                                                                    |
| `test/changes/apply.test.ts`            | 4    |                                                                                                    |
| `test/changes/change.test.ts`           | 5    |                                                                                                    |
| `test/cli/lint.test.ts`                 | 6    | Extended                                                                                           |
| `test/cli/change.test.ts`               | 7    |                                                                                                    |
| `test/cli/status.test.ts`               | 8    |                                                                                                    |
| `test/distribution/session.test.ts`     | 9    | Extended                                                                                           |

---

### Task 1: The rules — `RN-0052` to `RN-0059` and `RF-0025` to `RF-0030`, as draft

**Files:**
- Modify: `plugins/kanon/docs/requirements/rules.md` (eight sections appended, `last-reviewed`)
- Modify: `plugins/kanon/docs/requirements/functional.md` (six sections appended, `last-reviewed`)

**Interfaces:**
- Consumes: nothing.
- Produces: the IDs every later task cites in its tests, its comments and the commit of Task 10.

- [ ] **Step 1: Load the requirements flow and confirm the IDs are free**

Invoke the `living-docs:requirements-keeper` skill and follow its procedure. Then, from the repository root:

```bash
for p in RN RF; do grep -rhoE "^## $p-[0-9]{4}" docs plugins/*/docs | sort -u | tail -1; done
grep -nE "RN-005[2-9]|RF-00(2[5-9]|30)" docs/ids-retired.txt
```

Expected: the first prints `## RN-0051` and `## RF-0024`, the last of each family; the second prints nothing. If either differs, take the next free numbers in the same order and use them everywhere this plan says `RN-0052`…`RN-0059` and `RF-0025`…`RF-0030`.

- [ ] **Step 2: Append the eight business rules to `plugins/kanon/docs/requirements/rules.md`**

At the end of the file, after `RN-0051`:

````markdown
## RN-0052 — A change has an ID of its own, a folder of its own, and a state that is where the folder is

- **status:** draft
- **relates-to:** RNF-0007
- **out of scope:** what the body of a proposal says, which no script reads; renaming a change, which never happens; a change that only lived in a branch never merged, which leaves nothing behind

A change ID is a date as `YYYY-MM-DD`, a hyphen and a slug in lowercase
kebab-case: lowercase letters and digits, in words joined by one hyphen. The
date is the local date on which the change is opened. The ID is the name of the
change's folder, is unique across the open and the archived changes, and never
changes. A change under `changes/` is open; under `changes/archive/` it is
closed — `changes/` is a fixed path. The `proposal.md` of a change has front
matter with `change`, equal to the name of the folder, and `status` — `open`,
`synced` or `dropped` — which tells the two endings apart once the folder is
archived. A change with only a proposal is a valid open change.

## RN-0053 — A delta mirrors the path of the spec it changes and has only the sections ADDED, MODIFIED and REMOVED

- **status:** draft
- **relates-to:** RN-0043, RN-0047, RN-0052
- **out of scope:** whether a MODIFIED changes the intent of a requirement, which is left to a reader; the metadata lines `Story`, `Status` and `Since`, which stay opaque

A delta is a file `changes/<id>/specs/<name>/spec.md`: its path below the change
folder is the path of the current spec it changes, and that spec is the spec of
a registered capability. The only level-2 headings of a delta are `## ADDED`,
`## MODIFIED` and `## REMOVED`, each at most once and in any order; a
requirement outside one of them is an error. Under ADDED and MODIFIED a
requirement has the format it has in the current specs and is held to every
rule a requirement of the current specs is held to. A MODIFIED carries the whole
requirement, not the fragment that changed. An ADDED may carry any registered
prefix.

## RN-0054 — A MODIFIED and a REMOVED name a requirement that is in that current spec, and a REMOVED says why

- **status:** draft
- **relates-to:** RN-0044, RN-0053
- **out of scope:** whether the reason is a good one, which is left to a reader

A MODIFIED or a REMOVED is written in the delta of the spec where the
requirement lives today. Naming an ID that is not in that spec is an error, and
when the ID lives in another spec the finding names it. Under REMOVED a
requirement is the heading `### <ID>` and a `Reason:` line, which is mandatory
and stays readable in the archived delta.

## RN-0055 — An ADDED reuses neither an active ID nor a tombstone, and an ID appears in one operation of a change

- **status:** draft
- **relates-to:** RN-0044, RN-0045, RF-0019
- **out of scope:** allocating the ID, which stays with `kanon id next <CAP>`

An ADDED whose ID is already the ID of a requirement of the current specs, or a
tombstone, is an error. Within one change, across all its deltas, the same ID in
two operations is an error. The ID of an ADDED comes from the counter, and the
incremented counter travels in the same branch as the delta.

## RN-0056 — A `Supersedes` names a requirement the same change removes

- **status:** draft
- **relates-to:** RN-0053, RN-0054
- **out of scope:** whether the new requirement really replaces the old one, which is left to a reader; a `Supersedes` carried by a MODIFIED, which an earlier change put there

A change of intent is a REMOVED of the old requirement and an ADDED of the new
one carrying `Supersedes: <old ID>`. A `Supersedes` under ADDED that names an ID
the same change does not remove is an error.

## RN-0057 — Two open changes are an error only where the second sync would break

- **status:** draft
- **relates-to:** RN-0054, RN-0055
- **out of scope:** which of the two changes must yield, which a script does not know; a conflict between branches not merged yet, which a later slice resolves by renumbering

The same ID under ADDED in two open changes is an error. A MODIFIED or a REMOVED
of an ID that another open change removes is an error. The same ID under
MODIFIED in two open changes is a warning. A conflict is reported on both
changes, each finding naming the other folder.

## RN-0058 — A delta is merged by requirement block, and everything outside the blocks is kept as it was

- **status:** draft
- **relates-to:** RN-0044, RN-0053
- **out of scope:** rewriting any line of a block — a block is copied as written, its metadata lines included; reordering the requirements of a spec

A block runs from the heading `### <ID>` to the line before the next heading of
any level, or to the end of the file, ignoring what is inside a code fence;
prose written right under a requirement belongs to it. A MODIFIED replaces the
block with the one in the delta, in the same position. A REMOVED takes the
block out of the spec, and the ID joins the tombstones in the registry of the
capability of its prefix. The ADDED blocks go to the end of the spec, in the
order of the delta. Everything outside the blocks stays byte for byte as it was.
Blocks are separated by one blank line, and the file ends with one newline.

## RN-0059 — The IDs a dropped change allocated become tombstones, and a live requirement never does

- **status:** draft
- **relates-to:** RN-0044, RN-0045
- **out of scope:** a change that died in a branch never merged — the branch is deleted, and the counter on the main branch never knew of it

Dropping a change turns into a tombstone every ID under ADDED that was really
allocated: a valid format, a registered prefix and a number at or below the
counter. The counter never goes back. An ID that is already an active
requirement, or already a tombstone, is skipped, and the skip is said. The
current specs are not touched.
````

- [ ] **Step 3: Append the six functional requirements to `plugins/kanon/docs/requirements/functional.md`**

At the end of the file, after `RF-0024`:

````markdown
## RF-0025 — `kanon change open <slug>` opens a change under the date of the day

- **status:** draft
- **relates-to:** RN-0052
- **out of scope:** writing the delta, which is done by hand until a later slice; committing

The command creates `changes/<date>-<slug>/proposal.md` from a template and
prints the ID of the change. It refuses a slug that is not lowercase kebab-case,
and an ID that already exists, open or archived. The date is the local date; an
environment variable fixes it for a run that must not depend on the clock.

## RF-0026 — `kanon change sync <id>` applies the deltas of a change and archives it, in one step

- **status:** draft
- **relates-to:** RN-0053, RN-0054, RN-0055, RN-0056, RN-0057, RN-0058, RF-0029
- **out of scope:** committing; recovering from a disk failure in the middle of the writes, which is left to `git`; an applied-but-open state, which does not exist

The command refuses a change that is not under `changes/`, that is already
archived, or that has no operation in any delta. It validates the change as the
lint does: with an error it prints the findings and exits 1 having written
nothing; a warning does not stop it. It computes the final text of every spec
and of every registry before touching the disk, writes the specs, the
registries and `status: synced` in the proposal, and last moves the folder to
`changes/archive/<id>/`. It prints one line per path written or moved.

## RF-0027 — `kanon change drop <id>` abandons a change without giving its IDs back

- **status:** draft
- **relates-to:** RN-0059
- **out of scope:** validating the delta — an abandoned change may well be broken; committing

The command refuses a change that is not open. It writes the tombstones
`RN-0059` asks for, says which IDs it skipped, writes `status: dropped` in the
proposal and moves the folder to `changes/archive/<id>/`.

## RF-0028 — `kanon status` lists the open changes

- **status:** draft
- **relates-to:** RN-0052, RF-0029
- **out of scope:** the findings themselves, which `kanon lint` prints; archived changes; the traceability view of a later slice

For each open change the command prints its ID, the count of ADDED, MODIFIED and
REMOVED per capability, and how many errors and warnings the validator sees in
it. It is a view: it writes nothing, exits 0 even when a change has errors, and
exits 2 only when it could not run.

## RF-0029 — `kanon lint` also checks the open changes

- **status:** draft
- **relates-to:** RF-0018, RN-0052, RN-0053, RN-0054, RN-0055, RN-0056, RN-0057
- **out of scope:** archived changes, which are never checked; a change with no delta, which is not an error; the projection of the specs after a change — the capacity warnings keep measuring the current specs

With no argument, `kanon lint` also checks every open change under `changes/`,
and never `changes/archive/`. Given paths, a path under `changes/` is read as a
delta. A finding in a change has the format of every other finding, and an
error in a change fails the run.

## RF-0030 — The change commands of the session run the command line and show its output as it came

- **status:** draft
- **relates-to:** RF-0022, RF-0024, RF-0025, RF-0026, RF-0027, RF-0028
- **out of scope:** writing the delta with the model's help, which belongs to a later slice; committing, which the session never does

`/kanon:change open` proposes a slug from the description and confirms it before
creating anything. `/kanon:change sync` and `/kanon:change drop` run the command
line; `drop` asks first, because a tombstone has no way back. `/kanon:status`
runs `kanon status`. Each shows the output of the command line as it came and
never commits. The lint command of the session says the lint covers the open
changes.
````

Set `last-reviewed` in the front matter of both files to the date of the edit.

- [ ] **Step 4: Validate**

Run, from the repository root: `./spur validate`
Expected: both validators exit 0. `living-docs/citation-coverage` does not complain about a `draft` rule with no test.

- [ ] **Step 5: Put the open questions and the promotion in front of the human owner**

Stop and ask. Three things, in this order:

1. **The twelve points of "Where the spec is silent"** at the top of this plan: does any of them have to read differently? An answer that changes one is applied to the requirement text now, and to the task that implements it before that task starts.
2. **The three active requirements that call this slice "a later slice"** — `RF-0018` ("change folders … belong to a later slice"), `RN-0044` ("IDs inside a change folder, which the delta validator of a later slice judges") and `RN-0045` ("returning the IDs of an abandoned change to the sequence … in a later slice"). The spec leaves this to the requirements flow. The recommendation: leave the three as they are — the new requirements already declare `relates-to` them, and an `out of scope` line that names a later slice stays true. If the human wants them revised, they say how, and only the lines they name are edited.
3. **Promotion.** Ask the human to promote `RN-0052` to `RN-0059` and `RF-0025` to `RF-0030` from `draft` to `active`. Do not edit a `status` line yourself; when the human asks you to make the edit they decided, `living-docs/state-promotion` will ask them to confirm.

- [ ] **Step 6: Commit — the first of the two**

From the repository root, after the human's answers are applied:

```bash
./spur validate
git add plugins/kanon/docs/requirements/rules.md plugins/kanon/docs/requirements/functional.md
git commit -m "$(cat <<'EOF'
docs(RN-0052): the rules of kanon's delta, the first part of the change cycle

The second slice of kanon is cut in three, and this is the first part: the change folder, the delta, and the commands that end a change. Its rules come before any code: RN-0052 to RN-0059 say what a change and a delta are, what a delta may name, how two open changes conflict, how a delta is merged and what a dropped change leaves behind; RF-0025 to RF-0030 are the commands — change open, sync and drop, status, the lint over open changes, and the two session commands.

Changelog: none — rules; what the plugin ships comes in the next commit.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

If the human left a requirement in `draft`, say so in the body, as the commit of the first slice did.

---

### Task 2: A requirement records the last line of its block

**Files:**
- Modify: `plugins/kanon/plugin/src/specs/parse.ts` (whole file)
- Test: `plugins/kanon/test/specs/parse.test.ts` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `Requirement.endLine: number` — 1-based, the last line of the block that is not blank; equal to `line` when nothing is under the heading.
  - `findSpecs(root: string, dir?: string): string[]` — `dir` defaults to `specs`; every `spec.md` under it, relative to the project root, sorted.
  - `parseSpec(file: string, source: string): Requirement[]` — unchanged signature.

- [ ] **Step 1: Write the failing test**

Create `test/specs/parse.test.ts`:

````ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSpec } from '../../plugin/src/specs/parse.ts'

function blocks(source: string): [string, number, number][] {
  return parseSpec('specs/checkout/spec.md', source).map(requirement => [requirement.token, requirement.line, requirement.endLine])
}

test('RN-0058: a block runs from its heading to the last line with text before the next heading', () => {
  const source = [
    '# checkout', // 1
    '', // 2
    '### CHK-001 [Ubiquitous]', // 3
    '', // 4
    'THE Checkout SHALL show the total.', // 5
    'Story: US-CHK-01', // 6
    '', // 7
    'A note that belongs to CHK-001.', // 8
    '', // 9
    '', // 10
    '### CHK-002 [Ubiquitous]', // 11
    '', // 12
    'THE Checkout SHALL show the tax.', // 13
    '', // 14
    '## Notes', // 15
    '', // 16
    'Prose under a heading of another level belongs to no requirement.', // 17
    '',
  ].join('\n')

  assert.deepEqual(blocks(source), [
    ['CHK-001', 3, 8],
    ['CHK-002', 11, 13],
  ])
})

test('RN-0058: the last block runs to the end of the file, and a bare heading is a block of one line', () => {
  assert.deepEqual(blocks('### CHK-001 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n\n\n'), [['CHK-001', 1, 3]])
  assert.deepEqual(blocks('### CHK-001 [Ubiquitous]\n### CHK-002 [Ubiquitous]\n'), [
    ['CHK-001', 1, 1],
    ['CHK-002', 2, 2],
  ])
})

test('RN-0058: a heading inside a code fence does not end a block', () => {
  const source = [
    '### CHK-001 [Ubiquitous]', // 1
    '', // 2
    'THE Checkout SHALL show the total.', // 3
    '', // 4
    '```markdown', // 5
    '## Not a heading', // 6
    '### CHK-999 [Ubiquitous]', // 7
    '```', // 8
    '', // 9
    '### CHK-002 [Ubiquitous]', // 10
    '', // 11
    'THE Checkout SHALL show the tax.', // 12
    '',
  ].join('\n')

  assert.deepEqual(blocks(source), [
    ['CHK-001', 1, 8],
    ['CHK-002', 10, 12],
  ])
})

test('RN-0058: lines are counted the same in a file with Windows line endings', () => {
  assert.deepEqual(blocks('# checkout\r\n\r\n### CHK-001 [Ubiquitous]\r\n\r\nTHE Checkout SHALL show the total.\r\n\r\n'), [['CHK-001', 3, 5]])
})
````

- [ ] **Step 2: Run it and see it fail**

Run: `node --test test/specs/parse.test.ts`
Expected: FAIL, 4 of 4 — each `deepEqual` gets `undefined` where it expects the last line of a block.

- [ ] **Step 3: Rewrite `plugin/src/specs/parse.ts`**

The loop now tracks the requirement whose block is open: any heading outside a code fence closes it, and every line with text moves its `endLine`. `findSpecs` takes the directory to walk. Replace the whole file with:

````ts
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { SPECS_DIR, SPEC_FILE } from '../core/paths.ts'

export interface Requirement {
  file: string
  /** Line of the heading. */
  line: number
  /** The last line of the block that is not blank: the heading itself when nothing is under it. */
  endLine: number
  /** The ID as written in the heading, valid or not. */
  token: string
  /** The pattern named in the heading; null when the heading names none. */
  tag: string | null
  /** The criterion as one line; empty when the heading has nothing under it. */
  criterion: string
  criterionLine: number
}

// A level-3 heading that opens with something shaped like an ID is a
// requirement, so that `CHK-14` is caught instead of skipped.
const HEADING = /^###\s+([A-Za-z]+-\d+)\b\s*(.*)$/
const ANY_HEADING = /^#{1,6}(?:\s|$)/
const TAG = /^\[([^\]]*)\]$/
const FENCE = /^\s*(```|~~~)/
const METADATA = /^(Story|Status|Since|Supersedes)\s*:/

// A block runs from the heading of a requirement to the line before the next
// heading of any level, or to the end of the file; a heading inside a code
// fence is text (RN-0058).
export function parseSpec(file: string, source: string): Requirement[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const requirements: Requirement[] = []
  let fenced = false
  let open: Requirement | null = null

  const requirementAt = (index: number, token: string, rest: string): Requirement => {
    let start = index + 1

    while (start < lines.length && (lines[start] ?? '').trim() === '') {
      start++
    }

    const sentence: string[] = []

    for (let cursor = start; cursor < lines.length; cursor++) {
      const text = (lines[cursor] ?? '').trim()

      if (text === '' || text.startsWith('#') || METADATA.test(text) || FENCE.test(text)) {
        break
      }
      sentence.push(text)
    }

    return {
      file,
      line: index + 1,
      endLine: index + 1,
      token,
      tag: TAG.exec(rest.trim())?.[1]?.trim() ?? null,
      criterion: sentence.join(' '),
      criterionLine: sentence.length === 0 ? index + 1 : start + 1,
    }
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ''

    if (FENCE.test(line)) {
      fenced = !fenced
    } else if (!fenced && ANY_HEADING.test(line)) {
      const heading = HEADING.exec(line)

      open = heading?.[1] === undefined ? null : requirementAt(index, heading[1], heading[2] ?? '')

      if (open !== null) {
        requirements.push(open)
      }
    }
    if (open !== null && line.trim() !== '') {
      open.endLine = index + 1
    }
  }

  return requirements
}

// Every `spec.md` under a directory — `specs/` unless told otherwise — at any
// depth, relative to the project root and in a stable order.
export function findSpecs(root: string, dir: string = SPECS_DIR): string[] {
  const found: string[] = []

  const walk = (current: string): void => {
    for (const entry of readdirSync(join(root, current), { withFileTypes: true })) {
      const path = `${current}/${entry.name}`

      if (entry.isDirectory()) {
        walk(path)
      } else if (entry.name === SPEC_FILE) {
        found.push(path)
      }
    }
  }

  if (existsSync(join(root, dir))) {
    walk(dir)
  }

  return found.sort()
}
````

- [ ] **Step 4: Run the tests**

Run: `node --test test/specs/parse.test.ts`
Expected: PASS, 4 of 4.

Run: `../../spur test`
Expected: PASS, 54 tests — the 50 that existed still pass, so the criterion of every requirement is read as before.

- [ ] **Step 5: Type-check and stage**

```bash
../../spur typecheck
git add plugin/src/specs/parse.ts test/specs/parse.test.ts
```

Expected: the type-check prints nothing.

---

### Task 3: The delta parser

**Files:**
- Create: `plugins/kanon/plugin/src/changes/delta.ts`
- Test: `plugins/kanon/test/changes/delta.test.ts`

**Interfaces:**
- Consumes: `parseSpec`, `Requirement` (with `endLine`) from `src/specs/parse.ts`; `SPECS_DIR`, `SPEC_FILE` from `src/core/paths.ts`.
- Produces:
  - `OPERATIONS: readonly ['ADDED', 'MODIFIED', 'REMOVED']`, `type Operation`.
  - `interface Reference { id: string; line: number }`.
  - `interface DeltaEntry { operation: Operation; requirement: Requirement; text: string; supersedes: Reference[]; reason: string | null }` — `text` is the block as written, its lines joined by `\n`, from the heading to `endLine`.
  - `interface DeltaProblem { line: number; message: string }`.
  - `interface Delta { file: string; target: string; name: string; entries: DeltaEntry[]; problems: DeltaProblem[] }` — `target` is the path of the current spec (`specs/checkout/spec.md`), `name` the capability the path names (`checkout`).
  - `parseDelta(file: string, source: string): Delta` — `file` is the path relative to the project root, `changes/<id>/specs/<name>/spec.md`. It never throws.

- [ ] **Step 1: Write the failing test**

Create `test/changes/delta.test.ts`:

````ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDelta } from '../../plugin/src/changes/delta.ts'

const FILE = 'changes/2026-10-02-coupon-redemption/specs/checkout/spec.md'

const DELTA = [
  '## ADDED', // 1
  '', // 2
  '### CHK-015 [Unwanted]', // 3
  '', // 4
  'IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.', // 5
  'Supersedes: CHK-003', // 6
  '', // 7
  '## MODIFIED', // 8
  '', // 9
  '### CHK-009 [Event]', // 10
  '', // 11
  'WHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.', // 12
  '', // 13
  '## REMOVED', // 14
  '', // 15
  '### CHK-003', // 16
  '', // 17
  'Reason: replaced by CHK-015, which names the expired case.', // 18
  '',
].join('\n')

function messages(source: string): [number, string][] {
  return parseDelta(FILE, source).problems.map(problem => [problem.line, problem.message])
}

test('RN-0053: a delta is read into its operations, each with its section and its lines', () => {
  const delta = parseDelta(FILE, DELTA)

  assert.equal(delta.target, 'specs/checkout/spec.md')
  assert.equal(delta.name, 'checkout')
  assert.deepEqual(delta.problems, [])
  assert.deepEqual(
    delta.entries.map(entry => [entry.operation, entry.requirement.token, entry.requirement.line, entry.requirement.endLine]),
    [
      ['ADDED', 'CHK-015', 3, 6],
      ['MODIFIED', 'CHK-009', 10, 12],
      ['REMOVED', 'CHK-003', 16, 18],
    ],
  )
  assert.equal(delta.entries[0]?.requirement.file, FILE)
  assert.equal(delta.entries[0]?.requirement.tag, 'Unwanted')
  assert.equal(delta.entries[0]?.text, '### CHK-015 [Unwanted]\n\nIF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003')
  assert.equal(delta.entries[2]?.reason, 'replaced by CHK-015, which names the expired case.')
})

test('RN-0053: the sections come in any order, and a delta under a title is still a delta', () => {
  const delta = parseDelta(
    FILE,
    '# checkout\n\n## REMOVED\n\n### CHK-003\n\nReason: gone.\n\n## ADDED\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n',
  )

  assert.deepEqual(delta.problems, [])
  assert.deepEqual(
    delta.entries.map(entry => [entry.operation, entry.requirement.token]),
    [
      ['REMOVED', 'CHK-003'],
      ['ADDED', 'CHK-015'],
    ],
  )
})

test('RN-0053: a level-2 heading other than the three is a problem, and so is a section written twice', () => {
  assert.deepEqual(messages('## Added\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n'), [
    [1, '"## Added" is not a section of a delta: the only ones are ## ADDED, ## MODIFIED and ## REMOVED.'],
  ])
  assert.deepEqual(parseDelta(FILE, '## Added\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n').entries, [])
  assert.deepEqual(messages('## ADDED\n\n## MODIFIED\n\n## ADDED\n'), [[5, 'the section ## ADDED appears twice: it is already at line 1.']])
})

test('RN-0053: a requirement outside a section is a problem and is no operation', () => {
  const before = '### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n\n## ADDED\n'
  const afterTitle = '## ADDED\n\n# Appendix\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n'

  assert.deepEqual(messages(before), [[1, 'CHK-015 is outside a section: write it under ## ADDED, ## MODIFIED or ## REMOVED.']])
  assert.deepEqual(parseDelta(FILE, before).entries, [])
  assert.deepEqual(
    messages(afterTitle).map(([line]) => line),
    [5],
  )
})

test('RN-0053: a heading inside a code fence is neither a section nor a requirement', () => {
  const delta = parseDelta(
    FILE,
    ['## ADDED', '', '### CHK-015 [Ubiquitous]', '', 'THE Checkout SHALL show the total.', '', '```markdown', '## REMOVED', '### CHK-003', '```', ''].join(
      '\n',
    ),
  )

  assert.deepEqual(delta.problems, [])
  assert.deepEqual(
    delta.entries.map(entry => [entry.operation, entry.requirement.token, entry.requirement.endLine]),
    [['ADDED', 'CHK-015', 10]],
  )
})

test('RN-0054: a REMOVED with no reason, or with an empty one, is a problem', () => {
  const problem: [number, string][] = [[3, 'the removal of CHK-003 gives no reason: write a "Reason:" line under its heading.']]

  assert.deepEqual(messages('## REMOVED\n\n### CHK-003\n'), problem)
  assert.deepEqual(messages('## REMOVED\n\n### CHK-003\n\nReason:\n'), problem)
  assert.deepEqual(messages('## REMOVED\n\n### CHK-003\n\nreplaced by CHK-015.\n'), problem)
  // The operation is still read: the other rules judge it too.
  assert.equal(parseDelta(FILE, '## REMOVED\n\n### CHK-003\n').entries.length, 1)
})

test('RN-0056: every ID a Supersedes names is read, alone on its line or among other metadata', () => {
  const supersedes = (metadata: string): [string, number][] =>
    (parseDelta(FILE, `## ADDED\n\n### CHK-015 [Ubiquitous]\n\nTHE Checkout SHALL show the total.\n${metadata}\n`).entries[0]?.supersedes ?? []).map(
      reference => [reference.id, reference.line],
    )

  assert.deepEqual(supersedes('Supersedes: CHK-003'), [['CHK-003', 6]])
  assert.deepEqual(supersedes('Supersedes: CHK-003, CHK-004'), [
    ['CHK-003', 6],
    ['CHK-004', 6],
  ])
  assert.deepEqual(supersedes('Story: US-CHK-03 · Supersedes: CHK-003 · Since: 2026-10-02-coupon-redemption'), [['CHK-003', 6]])
  assert.deepEqual(supersedes('Story: US-CHK-03'), [])
})

test('RN-0053: a delta with Windows line endings is read the same', () => {
  const delta = parseDelta(FILE, DELTA.replaceAll('\n', '\r\n'))

  assert.deepEqual(delta.problems, [])
  assert.deepEqual(
    delta.entries.map(entry => [entry.operation, entry.requirement.line, entry.requirement.endLine]),
    [
      ['ADDED', 3, 6],
      ['MODIFIED', 10, 12],
      ['REMOVED', 16, 18],
    ],
  )
  assert.equal(delta.entries[1]?.text, '### CHK-009 [Event]\n\nWHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.')
})
````

- [ ] **Step 2: Run it and see it fail**

Run: `node --test test/changes/delta.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `plugin/src/changes/delta.ts`.

- [ ] **Step 3: Write `plugin/src/changes/delta.ts`**

````ts
import { SPECS_DIR, SPEC_FILE } from '../core/paths.ts'
import { parseSpec, type Requirement } from '../specs/parse.ts'

export const OPERATIONS = ['ADDED', 'MODIFIED', 'REMOVED'] as const

export type Operation = (typeof OPERATIONS)[number]

export interface Reference {
  id: string
  line: number
}

export interface DeltaEntry {
  operation: Operation
  /** The heading and what is under it, read as a requirement of a spec is. */
  requirement: Requirement
  /** The block as written, from its heading to its last line with text. */
  text: string
  /** Every ID a `Supersedes:` of the block names, valid or not. */
  supersedes: Reference[]
  /** What the `Reason:` line says; null when there is none, or it says nothing. */
  reason: string | null
}

export interface DeltaProblem {
  line: number
  message: string
}

export interface Delta {
  /** Path of the delta, relative to the project root. */
  file: string
  /** The current spec the delta changes: its own path below the change folder. */
  target: string
  /** The capability the path names: `checkout` in `specs/checkout/spec.md`. */
  name: string
  entries: DeltaEntry[]
  /** What is wrong with the shape of the file, apart from any requirement in it. */
  problems: DeltaProblem[]
}

const FENCE = /^\s*(```|~~~)/
const TITLE = /^#(?:\s|$)/
const SECTION = /^##(?:\s+(.*?))?\s*$/
const REASON = /^Reason\s*:\s*(.*)$/
// A metadata line may hold more than one field, separated by a middle dot.
const SUPERSEDES = /(?:^|·)\s*Supersedes\s*:\s*([^·]*)/

function isOperation(name: string): name is Operation {
  return (OPERATIONS as readonly string[]).includes(name)
}

// A delta holds the three sections and nothing else at level 2. A requirement
// belongs to the section whose heading is the last one above it (RN-0053).
export function parseDelta(file: string, source: string): Delta {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  // `changes/<id>/` is two segments; the rest is the path of the current spec.
  const target = file.split('/').slice(2).join('/')
  const problems: DeltaProblem[] = []
  const first = new Map<Operation, number>()
  /** Line of each heading that opens or closes a section. `null`: a heading that is no section. */
  const marks: { line: number; operation: Operation | null | undefined }[] = []
  let fenced = false

  lines.forEach((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced

      return
    }
    if (fenced) {
      return
    }
    if (TITLE.test(line)) {
      marks.push({ line: index + 1, operation: undefined })

      return
    }

    const section = SECTION.exec(line)

    if (section === null) {
      return
    }

    const name = section[1] ?? ''

    if (!isOperation(name)) {
      problems.push({ line: index + 1, message: `"## ${name}" is not a section of a delta: the only ones are ## ADDED, ## MODIFIED and ## REMOVED.` })
      marks.push({ line: index + 1, operation: null })

      return
    }

    const before = first.get(name)

    if (before === undefined) {
      first.set(name, index + 1)
    } else {
      problems.push({ line: index + 1, message: `the section ## ${name} appears twice: it is already at line ${before}.` })
    }
    marks.push({ line: index + 1, operation: name })
  })

  const entries: DeltaEntry[] = []

  for (const requirement of parseSpec(file, source)) {
    const operation = marks.findLast(mark => mark.line < requirement.line)?.operation

    if (operation === undefined) {
      problems.push({ line: requirement.line, message: `${requirement.token} is outside a section: write it under ## ADDED, ## MODIFIED or ## REMOVED.` })
      continue
    }
    // Under a heading that is no section; the heading was reported already.
    if (operation === null) {
      continue
    }

    const supersedes: Reference[] = []
    let reason: string | null = null

    for (let index = requirement.line; index < requirement.endLine; index++) {
      const text = (lines[index] ?? '').trim()
      const said = REASON.exec(text)?.[1]?.trim()

      if (said !== undefined && said !== '' && reason === null) {
        reason = said
      }
      for (const id of (SUPERSEDES.exec(text)?.[1] ?? '').split(',')) {
        if (id.trim() !== '') {
          supersedes.push({ id: id.trim(), line: index + 1 })
        }
      }
    }
    if (operation === 'REMOVED' && reason === null) {
      problems.push({ line: requirement.line, message: `the removal of ${requirement.token} gives no reason: write a "Reason:" line under its heading.` })
    }

    entries.push({ operation, requirement, text: lines.slice(requirement.line - 1, requirement.endLine).join('\n'), supersedes, reason })
  }

  return {
    file,
    target,
    name: target.startsWith(`${SPECS_DIR}/`) && target.endsWith(`/${SPEC_FILE}`) ? target.slice(SPECS_DIR.length + 1, -(SPEC_FILE.length + 1)) : target,
    entries,
    problems,
  }
}
````

- [ ] **Step 4: Run the test**

Run: `node --test test/changes/delta.test.ts`
Expected: PASS, 8 of 8.

- [ ] **Step 5: Type-check and stage**

```bash
../../spur typecheck
git add plugin/src/changes/delta.ts test/changes/delta.test.ts
```

---

### Task 4: The pure merge

**Files:**
- Create: `plugins/kanon/plugin/src/changes/apply.ts`
- Test: `plugins/kanon/test/changes/apply.test.ts`

**Interfaces:**
- Consumes: `parseSpec` from `src/specs/parse.ts`; `DeltaEntry` and `parseDelta` (in the test) from `src/changes/delta.ts`.
- Produces:
  - `interface Applied { text: string; tombstones: string[]; missing: string[] }`.
  - `applyDelta(source: string, entries: readonly DeltaEntry[]): Applied` — touches no disk and never throws. `tombstones` are the IDs that left the spec; `missing` are the IDs a MODIFIED or a REMOVED names that are not in `source`.

- [ ] **Step 1: Write the failing test**

Create `test/changes/apply.test.ts`:

````ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyDelta } from '../../plugin/src/changes/apply.ts'
import { parseDelta } from '../../plugin/src/changes/delta.ts'

const SPEC = [
  '# checkout',
  '',
  'The current requirements of this capability.',
  '',
  '### CHK-003 [Ubiquitous]',
  '',
  'THE Checkout SHALL accept any coupon.',
  '',
  '### CHK-009 [Event]',
  '',
  'WHEN the coupon is applied, THE Checkout SHALL show the total.',
  'Story: US-CHK-02',
  '',
  'A note written under CHK-009.',
  '',
  '## Notes',
  '',
  'Closing prose.',
  '',
].join('\n')

const ADDED = '## ADDED\n\n### CHK-015 [Unwanted]\n\nIF the coupon is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003\n'
const MODIFIED = '## MODIFIED\n\n### CHK-009 [Event]\n\nWHEN the coupon is applied, THE Checkout SHALL show the discounted total.\n'
const REMOVED = '## REMOVED\n\n### CHK-003\n\nReason: replaced by CHK-015.\n'

function apply(spec: string, delta: string): ReturnType<typeof applyDelta> {
  return applyDelta(spec, parseDelta('changes/2026-10-02-coupon-redemption/specs/checkout/spec.md', delta).entries)
}

test('RN-0058: a MODIFIED replaces the block where it is, and what was written under the old one leaves with it', () => {
  const applied = apply(SPEC, MODIFIED)

  assert.equal(
    applied.text,
    [
      '# checkout',
      '',
      'The current requirements of this capability.',
      '',
      '### CHK-003 [Ubiquitous]',
      '',
      'THE Checkout SHALL accept any coupon.',
      '',
      '### CHK-009 [Event]',
      '',
      'WHEN the coupon is applied, THE Checkout SHALL show the discounted total.',
      '',
      '## Notes',
      '',
      'Closing prose.',
      '',
    ].join('\n'),
  )
  assert.deepEqual(applied.tombstones, [])
  assert.deepEqual(applied.missing, [])
})

test('RN-0058: a REMOVED takes the block out and gives its ID as a tombstone', () => {
  const applied = apply(SPEC, REMOVED)

  assert.equal(applied.text, SPEC.replace('### CHK-003 [Ubiquitous]\n\nTHE Checkout SHALL accept any coupon.\n\n', ''))
  assert.deepEqual(applied.tombstones, ['CHK-003'])
})

test('RN-0058: an ADDED goes to the end of the spec, in the order of the delta, one blank line apart', () => {
  const second = '\n### CHK-016 [Ubiquitous]\n\nTHE Checkout SHALL list the coupons in use.\n'
  const applied = apply(SPEC, `${ADDED}${second}`)

  assert.equal(
    applied.text,
    `${SPEC}\n### CHK-015 [Unwanted]\n\nIF the coupon is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003\n\n### CHK-016 [Ubiquitous]\n\nTHE Checkout SHALL list the coupons in use.\n`,
  )
})

test('RN-0058: the three operations of one delta are applied together', () => {
  const applied = apply(SPEC, `${ADDED}\n${MODIFIED}\n${REMOVED}`)

  assert.equal(
    applied.text,
    [
      '# checkout',
      '',
      'The current requirements of this capability.',
      '',
      '### CHK-009 [Event]',
      '',
      'WHEN the coupon is applied, THE Checkout SHALL show the discounted total.',
      '',
      '## Notes',
      '',
      'Closing prose.',
      '',
      '### CHK-015 [Unwanted]',
      '',
      'IF the coupon is expired, THEN THE Checkout SHALL reject it.',
      'Supersedes: CHK-003',
      '',
    ].join('\n'),
  )
  assert.deepEqual(applied.tombstones, ['CHK-003'])
  assert.deepEqual(applied.missing, [])
})

test('RN-0058: everything outside the blocks stays byte for byte', () => {
  const untidy =
    '#  checkout  \n\n\n\nProse with   odd spacing.\t\n\n\n### CHK-003 [Ubiquitous]\nTHE Checkout SHALL accept any coupon.\n## Notes\n\n\n- a list\n'
  const applied = apply(untidy, REMOVED)

  assert.equal(applied.text, '#  checkout  \n\n\n\nProse with   odd spacing.\t\n\n\n## Notes\n\n\n- a list\n')
})

test('RN-0058: a spec with Windows line endings keeps them, in the blocks that come in too', () => {
  const windows = SPEC.replaceAll('\n', '\r\n')
  const applied = apply(windows, `${ADDED}\n${MODIFIED}\n${REMOVED}`.replaceAll('\n', '\r\n'))

  assert.equal(applied.text.replaceAll('\r\n', ''), apply(SPEC, `${ADDED}\n${MODIFIED}\n${REMOVED}`).text.replaceAll('\n', ''))
  assert.equal(/[^\r]\n/.test(applied.text), false)
  assert.equal(applied.text.endsWith('Supersedes: CHK-003\r\n'), true)
})

test('RN-0058: the file ends with one line break, whether or not it did, and an empty spec takes the first block', () => {
  assert.equal(
    apply('# checkout\n\n### CHK-003 [Ubiquitous]\n\nTHE Checkout SHALL accept any coupon.', MODIFIED.replace('CHK-009', 'CHK-003')).text.endsWith('total.\n'),
    true,
  )
  assert.equal(
    apply('# checkout\n\n\n\n', ADDED).text,
    '# checkout\n\n### CHK-015 [Unwanted]\n\nIF the coupon is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003\n',
  )
  assert.equal(apply('', ADDED).text, '### CHK-015 [Unwanted]\n\nIF the coupon is expired, THEN THE Checkout SHALL reject it.\nSupersedes: CHK-003\n')
})

test('RN-0058: a block inside a code fence is text, and is neither replaced nor removed', () => {
  const fenced = '# checkout\n\n```markdown\n### CHK-003 [Ubiquitous]\n```\n'
  const applied = apply(fenced, REMOVED)

  assert.equal(applied.text, fenced)
  assert.deepEqual(applied.tombstones, [])
  assert.deepEqual(applied.missing, ['CHK-003'])
})

test('RN-0054: an ID a MODIFIED or a REMOVED names that is not in the spec is reported, and nothing else changes', () => {
  const applied = apply(SPEC, `${MODIFIED.replace('CHK-009', 'CHK-099')}\n${REMOVED.replace('CHK-003', 'CHK-098')}`)

  assert.equal(applied.text, SPEC)
  assert.deepEqual(applied.missing, ['CHK-099', 'CHK-098'])
  assert.deepEqual(applied.tombstones, [])
})
````

- [ ] **Step 2: Run it and see it fail**

Run: `node --test test/changes/apply.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `plugin/src/changes/apply.ts`.

- [ ] **Step 3: Write `plugin/src/changes/apply.ts`**

The source is split on `\n` alone, so each line keeps its `\r`: what is outside the blocks goes back out exactly as it came in.

````ts
import { parseSpec } from '../specs/parse.ts'
import type { DeltaEntry } from './delta.ts'

export interface Applied {
  /** The spec after the delta. */
  text: string
  /** The IDs that left the spec, in the order of the delta. */
  tombstones: string[]
  /** The IDs a MODIFIED or a REMOVED names that are not in the spec. */
  missing: string[]
}

function blank(line: string | undefined): boolean {
  return (line ?? '').trim() === ''
}

// The merge is by requirement block and touches no disk. A MODIFIED replaces
// the block where it is, a REMOVED takes it out, and an ADDED goes to the end
// in the order of the delta. The blank lines after a block belong to it;
// everything else stays byte for byte, line endings included (RN-0058).
export function applyDelta(source: string, entries: readonly DeltaEntry[]): Applied {
  // Split on the line feed alone: each line keeps its carriage return.
  const lines = source.split('\n')
  const cr = source.includes('\r\n') ? '\r' : ''
  const written = (text: string): string[] => text.split('\n').map(line => `${line}${cr}`)
  const modified = new Map<string, string>()
  const removed = new Set<string>()
  const added: string[] = []

  for (const { operation, requirement, text } of entries) {
    if (operation === 'MODIFIED') {
      modified.set(requirement.token, text)
    } else if (operation === 'REMOVED') {
      removed.add(requirement.token)
    } else {
      added.push(text)
    }
  }

  const found = new Set<string>()
  const result: string[] = []
  let cursor = 0

  for (const requirement of parseSpec('', source)) {
    const replacement = modified.get(requirement.token)

    if (replacement === undefined && !removed.has(requirement.token)) {
      continue
    }
    found.add(requirement.token)

    let end = requirement.endLine

    while (end < lines.length && blank(lines[end])) {
      end++
    }
    result.push(...lines.slice(cursor, requirement.line - 1))

    if (replacement !== undefined) {
      result.push(...written(replacement))

      if (end < lines.length) {
        result.push(cr)
      }
    }
    cursor = end
  }
  result.push(...lines.slice(cursor))

  while (result.length > 0 && blank(result.at(-1))) {
    result.pop()
  }
  for (const block of added) {
    if (result.length > 0) {
      result.push(cr)
    }
    result.push(...written(block))
  }

  const last = result.at(-1)

  // A file that ended without a line break ends with one now, in its own style.
  if (last !== undefined && !last.endsWith(cr)) {
    result[result.length - 1] = `${last}${cr}`
  }

  return {
    text: result.length === 0 ? '' : `${result.join('\n')}\n`,
    tombstones: [...removed].filter(id => found.has(id)),
    missing: [...modified.keys(), ...removed].filter(id => !found.has(id)),
  }
}
````

- [ ] **Step 4: Run the test**

Run: `node --test test/changes/apply.test.ts`
Expected: PASS, 9 of 9.

- [ ] **Step 5: Type-check and stage**

```bash
../../spur typecheck
git add plugin/src/changes/apply.ts test/changes/apply.test.ts
```

---

### Task 5: The change folder

**Files:**
- Modify: `plugins/kanon/plugin/src/core/paths.ts` (four constants)
- Create: `plugins/kanon/plugin/src/changes/change.ts`
- Modify: `plugins/kanon/test/helpers/project.ts` (two fixtures)
- Test: `plugins/kanon/test/changes/change.test.ts`

**Interfaces:**
- Consumes: `parseFrontmatter` from `src/core/frontmatter.ts`; `findSpecs(root, dir)` from Task 2; `parseDelta`, `Delta` from Task 3.
- Produces:
  - In `paths.ts`: `CHANGES_DIR = 'changes'`, `ARCHIVE_NAME = 'archive'`, `ARCHIVE_DIR = 'changes/archive'`, `PROPOSAL_FILE = 'proposal.md'`.
  - `SLUG`, `DATE`, `CHANGE_ID`: `RegExp`.
  - `type ChangeStatus = 'open' | 'synced' | 'dropped'`.
  - `interface Proposal { file: string; problem: string | null; change: string | null; line: number }`.
  - `interface OpenChange { id: string; dir: string; proposal: Proposal; deltas: Delta[] }`.
  - `changeDir(id: string): string` → `changes/<id>`; `archiveDir(id: string): string` → `changes/archive/<id>`.
  - `openChangeIds(root: string): string[]`, `archivedChangeIds(root: string): string[]` — folder names, sorted.
  - `loadChange(root: string, id: string): OpenChange`, `loadOpenChanges(root: string): OpenChange[]` — neither throws on a broken change.
  - `withStatus(source: string | null, id: string, status: ChangeStatus): string`.
  - In the test helpers: `proposal(id: string, status?: string): string` and `change(id: string, deltas?: Record<string, string>): Record<string, string>` — the files of an open change, the keys of `deltas` being capability names.

- [ ] **Step 1: Add the fixtures and write the failing test**

In `test/helpers/project.ts`, add above `export function kanon(`:

````ts
export function proposal(id: string, status: string = 'open'): string {
  return ['---', `change: ${id}`, `status: ${status}`, '---', '', `# ${id}`, ''].join('\n')
}

/** The files of an open change: its proposal, and one delta per capability name given. */
export function change(id: string, deltas: Record<string, string> = {}): Record<string, string> {
  return {
    [`changes/${id}/proposal.md`]: proposal(id),
    ...Object.fromEntries(Object.entries(deltas).map(([name, delta]) => [`changes/${id}/specs/${name}/spec.md`, delta])),
  }
}
````

Create `test/changes/change.test.ts`:

````ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHANGE_ID, SLUG, archivedChangeIds, loadChange, openChangeIds, withStatus } from '../../plugin/src/changes/change.ts'
import { change, proposal, withProject } from '../helpers/project.ts'

const ID = '2026-10-02-coupon-redemption'

test('RN-0052: a change ID is a date, a hyphen and a slug in lowercase with hyphens', () => {
  for (const id of [ID, '2026-10-02-x', '2026-10-02-v2-rollout']) {
    assert.equal(CHANGE_ID.test(id), true, id)
  }
  for (const id of [
    '2026-10-coupon-redemption',
    'coupon-redemption',
    '2026-10-02',
    '2026-10-02-Coupon',
    '2026-10-02-a--b',
    '2026-10-02-a-',
    '2026-10-02-a_b',
    'archive',
  ]) {
    assert.equal(CHANGE_ID.test(id), false, id)
  }
  assert.equal(SLUG.test('coupon-redemption'), true)
  assert.equal(SLUG.test('../coupon'), false)
})

test('RN-0052: a change is open under changes/ and closed under changes/archive/', () => {
  const files = {
    ...change(ID),
    ...change('not-a-change-id'),
    'changes/README.md': 'a file is not a change\n',
    'changes/archive/2026-09-14-guest-checkout/proposal.md': proposal('2026-09-14-guest-checkout', 'synced'),
  }

  withProject(files, root => {
    assert.deepEqual(openChangeIds(root), [ID, 'not-a-change-id'])
    assert.deepEqual(archivedChangeIds(root), ['2026-09-14-guest-checkout'])
  })
  withProject({}, root => {
    assert.deepEqual(openChangeIds(root), [])
    assert.deepEqual(archivedChangeIds(root), [])
  })
})

test('RN-0052: a change is read with its proposal and one delta per spec it mirrors', () => {
  const files = change(ID, { checkout: '## ADDED\n', billing: '## REMOVED\n' })

  withProject({ ...files, [`changes/${ID}/specs/checkout/notes.md`]: 'not a delta\n' }, root => {
    const loaded = loadChange(root, ID)

    assert.equal(loaded.dir, `changes/${ID}`)
    assert.deepEqual(loaded.proposal, { file: `changes/${ID}/proposal.md`, problem: null, change: ID, line: 2 })
    assert.deepEqual(
      loaded.deltas.map(delta => [delta.file, delta.target]),
      [
        [`changes/${ID}/specs/billing/spec.md`, 'specs/billing/spec.md'],
        [`changes/${ID}/specs/checkout/spec.md`, 'specs/checkout/spec.md'],
      ],
    )
  })
})

test('RN-0052: a proposal that is missing, has no front matter or does not parse says so instead of stopping the run', () => {
  const problem = (files: Record<string, string>): string | null => {
    let found: string | null = null

    withProject(files, root => {
      found = loadChange(root, ID).proposal.problem
    })

    return found
  }

  assert.equal(problem({ [`changes/${ID}/specs/checkout/spec.md`]: '## ADDED\n' }), 'the change has no proposal.md.')
  assert.equal(problem({ [`changes/${ID}/proposal.md`]: '# only prose\n' }), 'the proposal has no front matter.')
  assert.match(problem({ [`changes/${ID}/proposal.md`]: '---\nchange: [\n---\n' }) ?? '', /^the front matter does not parse — line 2/)
})

test('RN-0052: the status of a proposal is set in place, and every other line stays as it was', () => {
  const body = '\n# Coupons\n\nstatus: this line is prose, not front matter.\n'

  assert.equal(
    withStatus(`---\nchange: ${ID}\nstatus: open\nowner: someone\n---\n${body}`, ID, 'synced'),
    `---\nchange: ${ID}\nstatus: synced\nowner: someone\n---\n${body}`,
  )
  assert.equal(withStatus(`---\nchange: ${ID}\n---\n${body}`, ID, 'dropped'), `---\nchange: ${ID}\nstatus: dropped\n---\n${body}`)
  assert.equal(withStatus(`---\r\nchange: ${ID}\r\nstatus: open\r\n---\r\n`, ID, 'synced'), `---\r\nchange: ${ID}\r\nstatus: synced\r\n---\r\n`)
})

test('RN-0052: a proposal with no front matter, or no proposal at all, gets one that says how the change ended', () => {
  assert.equal(withStatus('# only prose\n', ID, 'dropped'), `---\nchange: ${ID}\nstatus: dropped\n---\n# only prose\n`)
  assert.equal(withStatus(null, ID, 'dropped'), `---\nchange: ${ID}\nstatus: dropped\n---\n\n# ${ID}\n`)
})
````

- [ ] **Step 2: Run it and see it fail**

Run: `node --test test/changes/change.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `plugin/src/changes/change.ts`.

- [ ] **Step 3: Add the paths**

In `plugin/src/core/paths.ts`, right under `export const SPEC_FILE = 'spec.md'`:

````ts
export const CHANGES_DIR = 'changes'
/** The one name under `changes/` that is not a change: an ID starts with a digit. */
export const ARCHIVE_NAME = 'archive'
export const ARCHIVE_DIR = `${CHANGES_DIR}/${ARCHIVE_NAME}`
export const PROPOSAL_FILE = 'proposal.md'
````

- [ ] **Step 4: Write `plugin/src/changes/change.ts`**

A proposal that cannot be read is data, not an exception: `problem` says why, and the lint turns it into a finding in Task 6.

````ts
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontmatter } from '../core/frontmatter.ts'
import { ARCHIVE_DIR, ARCHIVE_NAME, CHANGES_DIR, PROPOSAL_FILE, SPECS_DIR } from '../core/paths.ts'
import { findSpecs } from '../specs/parse.ts'
import { parseDelta, type Delta } from './delta.ts'

// A change ID is the day the change was opened and a slug. It is the name of
// the folder and never changes; where the folder is says whether the change is
// open or closed (RN-0052).
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const DATE = /^\d{4}-\d{2}-\d{2}$/
export const CHANGE_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/

/** `open` while under `changes/`; the other two tell the endings apart in the archive. */
export type ChangeStatus = 'open' | 'synced' | 'dropped'

export interface Proposal {
  /** Path of `proposal.md`, relative to the project root. */
  file: string
  /** Why the proposal cannot be read; null when its front matter parses. */
  problem: string | null
  /** The `change` key as written; null when it is absent or is not text. */
  change: string | null
  /** Line of the `change` key; 0 when it is absent. */
  line: number
}

export interface OpenChange {
  /** The name of the folder, a change ID or not. */
  id: string
  /** Path of the folder, relative to the project root. */
  dir: string
  proposal: Proposal
  deltas: Delta[]
}

export function changeDir(id: string): string {
  return `${CHANGES_DIR}/${id}`
}

export function archiveDir(id: string): string {
  return `${ARCHIVE_DIR}/${id}`
}

function folders(root: string, dir: string): string[] {
  if (!existsSync(join(root, dir))) {
    return []
  }

  return readdirSync(join(root, dir), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
}

/** The name of every folder under `changes/` but the archive, a change ID or not. */
export function openChangeIds(root: string): string[] {
  return folders(root, CHANGES_DIR).filter(name => name !== ARCHIVE_NAME)
}

export function archivedChangeIds(root: string): string[] {
  return folders(root, ARCHIVE_DIR)
}

function readProposal(root: string, id: string): Proposal {
  const file = `${changeDir(id)}/${PROPOSAL_FILE}`
  const unreadable = (problem: string): Proposal => ({ file, problem, change: null, line: 0 })

  if (!existsSync(join(root, file))) {
    return unreadable('the change has no proposal.md.')
  }

  let frontmatter: ReturnType<typeof parseFrontmatter>

  try {
    frontmatter = parseFrontmatter(readFileSync(join(root, file), 'utf8'))
  } catch (error) {
    return unreadable(`the front matter does not parse — ${error instanceof Error ? error.message : String(error)}`)
  }
  if (frontmatter === null) {
    return unreadable('the proposal has no front matter.')
  }

  const { change } = frontmatter.data

  return { file, problem: null, change: typeof change === 'string' ? change : null, line: frontmatter.lines.change ?? 0 }
}

/** A change under `changes/`, read without judging it. */
export function loadChange(root: string, id: string): OpenChange {
  const dir = changeDir(id)

  return {
    id,
    dir,
    proposal: readProposal(root, id),
    deltas: findSpecs(root, `${dir}/${SPECS_DIR}`).map(file => parseDelta(file, readFileSync(join(root, file), 'utf8'))),
  }
}

export function loadOpenChanges(root: string): OpenChange[] {
  return openChangeIds(root).map(id => loadChange(root, id))
}

const DELIMITER = /^---\s*$/
const BYTE_ORDER_MARK = 0xfeff

// The text of a proposal with its `status` set, and every other line as it
// was. A proposal that is missing or has no front matter gets one, so that an
// archived change always says how it ended.
export function withStatus(source: string | null, id: string, status: ChangeStatus): string {
  const lines = (source ?? '').split('\n')
  const opening = lines[0] ?? ''
  const opens = DELIMITER.test(opening.charCodeAt(0) === BYTE_ORDER_MARK ? opening.slice(1) : opening)
  const end = opens ? lines.findIndex((line, index) => index > 0 && DELIMITER.test(line)) : -1

  if (end === -1) {
    return `---\nchange: ${id}\nstatus: ${status}\n---\n${source ?? `\n# ${id}\n`}`
  }

  const cr = opening.endsWith('\r') ? '\r' : ''
  const at = lines.findIndex((line, index) => index > 0 && index < end && /^status\s*:/.test(line))

  if (at === -1) {
    lines.splice(end, 0, `status: ${status}${cr}`)
  } else {
    lines[at] = `status: ${status}${cr}`
  }

  return lines.join('\n')
}
````

- [ ] **Step 5: Run the test**

Run: `node --test test/changes/change.test.ts`
Expected: PASS, 6 of 6.

- [ ] **Step 6: Type-check and stage**

```bash
../../spur typecheck
git add plugin/src/core/paths.ts plugin/src/changes/change.ts test/helpers/project.ts test/changes/change.test.ts
```

---

### Task 6: The lint covers the open changes

**Files:**
- Modify: `plugins/kanon/plugin/src/checks/ids.ts` (whole file)
- Create: `plugins/kanon/plugin/src/checks/delta.ts`
- Modify: `plugins/kanon/plugin/src/cli/lint.ts` (whole file)
- Modify: `plugins/kanon/plugin/src/cli/index.ts` (the `lint` lines of the usage text)
- Test: `plugins/kanon/test/cli/lint.test.ts` (extended)

**Interfaces:**
- Consumes: `OpenChange`, `CHANGE_ID`, `loadOpenChanges` from Task 5; `Delta`, `DeltaEntry` from Task 3; `CHANGES_DIR` from Task 5.
- Produces:
  - `checkIdForm(requirements: readonly Requirement[], registry: ReadonlyMap<string, Capability>): Finding[]` — `kanon/id-format`, `kanon/id-registered`, `kanon/id-counter` of each requirement. `checkIds` keeps its signature and its findings.
  - `checkChanges(changes: readonly OpenChange[], current: readonly Requirement[], registry: ReadonlyMap<string, Capability>): Finding[]` — the seven new rules. Also exported one by one: `checkChangeShape`, `checkDeltaShape`, `checkDeltaTarget`, `checkDeltaAdded`, `checkDeltaDuplicate`, `checkDeltaSupersedes`, `checkDeltaConflict`.
  - `interface Project { config: Config; registry: Map<string, Capability>; glossary: Glossary; specs: string[]; requirements: Requirement[]; changes: OpenChange[] }`.
  - `loadProject(root: string): Project` — throws `KanonError` when the project cannot be read.
  - `lintProject(project: Project): Finding[]` — every finding, sorted by file and line.
  - `runLint(root: string, only?: readonly string[]): LintResult` — unchanged signature.
- Rule IDs and where each finding sits:

| Rule                     | File of the finding           | Line                                  | Severity          |
| ------------------------ | ----------------------------- | ------------------------------------- | ----------------- |
| `kanon/change-shape`     | `changes/<name>`              | 0, for a folder name that is no ID    | error             |
| `kanon/change-shape`     | `changes/<id>/proposal.md`    | 0, or the line of the `change` key    | error             |
| `kanon/delta-shape`      | the delta                     | 0 for the path, else the heading      | error             |
| `kanon/delta-target`     | the delta                     | the heading of the requirement        | error             |
| `kanon/delta-added`      | the delta                     | the heading of the requirement        | error             |
| `kanon/delta-duplicate`  | the delta                     | the second place the ID is written    | error             |
| `kanon/delta-supersedes` | the delta                     | the `Supersedes:` line                | error             |
| `kanon/delta-conflict`   | the delta, in both changes    | the heading of the requirement        | error or warning  |

- [ ] **Step 1: Write the failing tests**

In `test/cli/lint.test.ts`, replace the import of the helpers:

````ts
import { CONFIG, capability, change, kanon, project, proposal, requirement, withProject } from '../helpers/project.ts'
````

and append to the end of the file:

````ts
// --- Open changes -----------------------------------------------------------

const CHANGE = '2026-10-02-coupon-redemption'
const OTHER = '2026-10-02-loyalty'
const DELTA_FILE = `changes/${CHANGE}/specs/checkout/spec.md`
const OTHER_FILE = `changes/${OTHER}/specs/checkout/spec.md`
const SHOWS = 'THE Checkout SHALL show the total.'

const CURRENT = [
  requirement('CHK-003', 'Ubiquitous', 'THE Checkout SHALL accept any coupon.'),
  requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`),
].join('\n')

const DELTA = [
  '## ADDED',
  '',
  `${requirement('CHK-015', 'Unwanted', 'IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.')}Supersedes: CHK-003\n`,
  '## MODIFIED',
  '',
  requirement('CHK-009', 'Event', 'WHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.'),
  '## REMOVED',
  '',
  '### CHK-003',
  '',
  'Reason: replaced by CHK-015, which names the expired case.',
  '',
].join('\n')

/** A delta with one section and the given blocks under it. */
function section(operation: string, ...blocks: string[]): string {
  return [`## ${operation}`, '', ...blocks].join('\n')
}

function removal(id: string): string {
  return `### ${id}\n\nReason: no longer needed.\n`
}

function found(files: Record<string, string>): [string, number, string, string][] {
  let findings: [string, number, string, string][] = []

  withProject(files, root => {
    findings = runLint(root).findings.map(finding => [finding.file, finding.line, finding.ruleId, finding.severity])
  })

  return findings
}

test('RF-0029: the lint covers every open change, and a change that breaks nothing has no finding', () => {
  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: DELTA }))), [])
  // RN-0052: a change with only a proposal is a valid open change.
  assert.deepEqual(found(project(CURRENT, change(CHANGE))), [])
})

test('RF-0029: an archived change is never checked', () => {
  const archived = { 'changes/archive/2026-09-14-guest-checkout/specs/payment/spec.md': section('Bogus', requirement('CHK-14', 'Nope', 'nothing')) }

  assert.deepEqual(found(project(CURRENT, archived)), [])
})

test('RF-0029: a requirement under ADDED or MODIFIED is held to every rule of a requirement, and one under REMOVED to none', () => {
  const delta = [
    section(
      'ADDED',
      requirement('CHK-14', 'Ubiquitous', SHOWS), // 3
      requirement('PAY-001', 'Ubiquitous', SHOWS), // 7
      requirement('CHK-021', 'Ubiquitous', SHOWS), // 11
      requirement('CHK-015', 'Event', SHOWS), // 15
      requirement('CHK-016', 'Ubiquitous', 'THE Checkout SHALL reject it and SHALL show a message.'), // 19, criterion at 21
      requirement('CHK-017', 'Ubiquitous', 'THE Checkout SHALL be fast.'), // 23, criterion at 25
      requirement('CHK-018', 'Ubiquitous', 'THE Billing SHALL show the total.'), // 27, criterion at 29
    ),
    section('MODIFIED', requirement('CHK-009', 'Event', 'WHEN the voucher is applied, THE Checkout SHALL show the total.')), // 31, heading 33, criterion at 35
    section('REMOVED', '### CHK-003', '', 'Reason: THE old rule SHALL not be read, and SHALL not be judged as a criterion.', ''),
  ].join('\n')
  const config = CONFIG.replace('forbidden-words: []', 'forbidden-words: [fast]')

  assert.deepEqual(found(project(CURRENT, { '.kanon/config.yml': config, ...change(CHANGE, { checkout: delta }) })), [
    [DELTA_FILE, 3, 'kanon/id-format', 'error'],
    [DELTA_FILE, 7, 'kanon/id-registered', 'error'],
    [DELTA_FILE, 11, 'kanon/id-counter', 'error'],
    [DELTA_FILE, 15, 'kanon/ears-pattern', 'error'],
    [DELTA_FILE, 21, 'kanon/ears-shape', 'error'],
    [DELTA_FILE, 25, 'kanon/forbidden-word', 'error'],
    [DELTA_FILE, 29, 'kanon/glossary-term', 'error'],
    [DELTA_FILE, 35, 'kanon/glossary-term', 'error'],
  ])
})

test('RF-0029: given paths, a path under changes/ is read as a delta, and only its findings are reported', () => {
  const files = project(CURRENT, {
    ...change(CHANGE, { checkout: section('ADDED', requirement('CHK-14', 'Ubiquitous', SHOWS)) }),
    'changes/archive/2026-09-14-guest-checkout/specs/checkout/spec.md': section('ADDED'),
  })

  withProject(files, root => {
    const delta = kanon(root, 'lint', DELTA_FILE)

    assert.equal(delta.status, 1, delta.stderr)
    assert.match(delta.stdout, new RegExp(`^${DELTA_FILE}:3 {2}kanon/id-format {2}error {2}`, 'm'))
    assert.equal(kanon(root, 'lint', 'specs/checkout/spec.md').status, 0)
    assert.equal(kanon(root, 'lint').status, 1)

    for (const path of [
      `changes/${CHANGE}/proposal.md`,
      `changes/${CHANGE}`,
      'changes/archive/2026-09-14-guest-checkout/specs/checkout/spec.md',
      `changes/${OTHER}/specs/checkout/spec.md`,
    ]) {
      const run = kanon(root, 'lint', path)

      assert.equal(run.status, 2, path)
      assert.match(run.stderr, /is not a delta of an open change/, path)
    }
  })
})

test('RN-0046: the capacity warnings measure the current specs, not what a change would make of them', () => {
  const lowered = CONFIG.replace('active-requirements: 150', 'active-requirements: 3')
  const delta = section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS))

  assert.deepEqual(found(project(CURRENT, { '.kanon/config.yml': lowered, ...change(CHANGE, { checkout: delta }) })), [])
})

test('RN-0052: a folder under changes/ is named by a change ID, and its proposal says the same ID', () => {
  const files = project(CURRENT, {
    ...change('coupon-redemption'),
    'changes/2026-10-02-a/specs/checkout/spec.md': section('ADDED'),
    'changes/2026-10-02-b/proposal.md': '# only prose\n',
    'changes/2026-10-02-c/proposal.md': proposal('2026-10-02-other'),
    'changes/2026-10-02-d/proposal.md': '---\nstatus: open\n---\n',
    'changes/2026-10-02-e/proposal.md': '---\nchange: [\n---\n',
    'changes/notes.md': 'a file under changes/ is not a change\n',
  })

  assert.deepEqual(found(files), [
    ['changes/2026-10-02-a/proposal.md', 0, 'kanon/change-shape', 'error'],
    ['changes/2026-10-02-b/proposal.md', 0, 'kanon/change-shape', 'error'],
    ['changes/2026-10-02-c/proposal.md', 2, 'kanon/change-shape', 'error'],
    ['changes/2026-10-02-d/proposal.md', 0, 'kanon/change-shape', 'error'],
    ['changes/2026-10-02-e/proposal.md', 0, 'kanon/change-shape', 'error'],
    ['changes/coupon-redemption', 0, 'kanon/change-shape', 'error'],
  ])
})

test('RN-0053: a delta sits at the path of the spec of a registered capability', () => {
  const files = project(CURRENT, change(CHANGE, { payment: section('ADDED'), 'checkout/drafts': section('ADDED') }))

  assert.deepEqual(found(files), [
    [`changes/${CHANGE}/specs/checkout/drafts/spec.md`, 0, 'kanon/delta-shape', 'error'],
    [`changes/${CHANGE}/specs/payment/spec.md`, 0, 'kanon/delta-shape', 'error'],
  ])
})

test('RN-0053: a delta has only the three sections, each at most once, and no requirement outside them', () => {
  const delta = [
    requirement('CHK-015', 'Ubiquitous', SHOWS), // 1
    '## Notes', // 5
    '',
    '## REMOVED', // 7
    '',
    '### CHK-003', // 9
    '',
    '## REMOVED', // 11
    '',
  ].join('\n')

  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: delta }))), [
    [DELTA_FILE, 1, 'kanon/delta-shape', 'error'],
    [DELTA_FILE, 5, 'kanon/delta-shape', 'error'],
    // RN-0054: a REMOVED says why.
    [DELTA_FILE, 9, 'kanon/delta-shape', 'error'],
    [DELTA_FILE, 11, 'kanon/delta-shape', 'error'],
  ])
})

test('RN-0054: a MODIFIED and a REMOVED name a requirement that is in the spec the delta mirrors', () => {
  const delta = [
    section('MODIFIED', requirement('CHK-010', 'Ubiquitous', SHOWS), requirement('BIL-001', 'Ubiquitous', SHOWS)), // 3, 7
    section('REMOVED', removal('CHK-011')), // 13
    // An ADDED may carry any registered prefix.
    section('ADDED', requirement('BIL-002', 'Ubiquitous', SHOWS)),
  ].join('\n')
  const files = project(CURRENT, {
    '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 5),
    'specs/billing/spec.md': requirement('BIL-001', 'Ubiquitous', SHOWS),
    ...change(CHANGE, { checkout: delta }),
  })

  withProject(files, root => {
    const findings = runLint(root).findings

    assert.deepEqual(
      findings.map(finding => [finding.file, finding.line, finding.ruleId]),
      [
        [DELTA_FILE, 3, 'kanon/delta-target'],
        [DELTA_FILE, 7, 'kanon/delta-target'],
        [DELTA_FILE, 13, 'kanon/delta-target'],
      ],
    )
    assert.equal(findings[0]?.message, 'CHK-010 is not a requirement of specs/checkout/spec.md.')
    assert.match(findings[1]?.message ?? '', /it lives in specs\/billing\/spec\.md/)
  })
})

test('RN-0055: an ADDED reuses neither the ID of an active requirement nor a tombstone', () => {
  const delta = section('ADDED', requirement('CHK-003', 'Ubiquitous', SHOWS), requirement('CHK-007', 'Ubiquitous', SHOWS))
  const files = project(CURRENT, { '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 20, ['CHK-007']), ...change(CHANGE, { checkout: delta }) })

  withProject(files, root => {
    const findings = runLint(root).findings

    assert.deepEqual(
      findings.map(finding => [finding.line, finding.ruleId]),
      [
        [3, 'kanon/delta-added'],
        [7, 'kanon/delta-added'],
      ],
    )
    assert.match(findings[0]?.message ?? '', /specs\/checkout\/spec\.md:3/)
    assert.match(findings[1]?.message ?? '', /tombstone/)
  })
})

test('RN-0055: an ID appears in one operation of a change, across all its deltas', () => {
  const checkout = [section('MODIFIED', requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`)), section('REMOVED', removal('CHK-009'))].join(
    '\n',
  )
  const twice = section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS), requirement('CHK-015', 'Ubiquitous', SHOWS))
  const billing = { '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 0), 'specs/billing/spec.md': '# billing\n' }

  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout }))), [[DELTA_FILE, 9, 'kanon/delta-duplicate', 'error']])
  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: twice }))), [[DELTA_FILE, 7, 'kanon/delta-duplicate', 'error']])
  // The delta of billing is read first, so the finding is on the second place the ID is written.
  assert.deepEqual(
    found(
      project(CURRENT, {
        ...billing,
        ...change(CHANGE, {
          billing: section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS)),
          checkout: section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS)),
        }),
      }),
    ),
    [[DELTA_FILE, 3, 'kanon/delta-duplicate', 'error']],
  )
})

test('RN-0056: a Supersedes under ADDED names a requirement the same change removes', () => {
  // The metadata line comes right under the criterion: line 6.
  const added = section('ADDED', `${requirement('CHK-015', 'Ubiquitous', SHOWS)}Supersedes: CHK-003\n`)
  const carried = section('MODIFIED', `${requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`)}Supersedes: CHK-001\n`)

  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: added }))), [[DELTA_FILE, 6, 'kanon/delta-supersedes', 'error']])
  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: [added, section('REMOVED', removal('CHK-003'))].join('\n') }))), [])
  // A MODIFIED carries the whole requirement, with the Supersedes an earlier change gave it.
  assert.deepEqual(found(project(CURRENT, change(CHANGE, { checkout: carried }))), [])
})

test('RN-0057: two open changes that add the same ID, or touch a requirement the other removes, are an error on both', () => {
  const pairs: [string, string][] = [
    [section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS)), section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS))],
    [section('MODIFIED', requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`)), section('REMOVED', removal('CHK-009'))],
    [section('REMOVED', removal('CHK-003')), section('REMOVED', removal('CHK-003'))],
  ]

  for (const [mine, theirs] of pairs) {
    withProject(project(CURRENT, { ...change(CHANGE, { checkout: mine }), ...change(OTHER, { checkout: theirs }) }), root => {
      const result = runLint(root)

      assert.deepEqual(
        result.findings.map(finding => [finding.file, finding.line, finding.ruleId, finding.severity]),
        [
          [DELTA_FILE, 3, 'kanon/delta-conflict', 'error'],
          [OTHER_FILE, 3, 'kanon/delta-conflict', 'error'],
        ],
        mine,
      )
      // Each finding names the other folder.
      assert.match(result.findings[0]?.message ?? '', new RegExp(OTHER))
      assert.match(result.findings[1]?.message ?? '', new RegExp(CHANGE))
    })
  }
})

test('RN-0057: two open changes that modify the same requirement are warned, and a warning does not fail the run', () => {
  const modified = section('MODIFIED', requirement('CHK-009', 'Event', `WHEN the coupon is applied, ${SHOWS}`))

  withProject(project(CURRENT, { ...change(CHANGE, { checkout: modified }), ...change(OTHER, { checkout: modified }) }), root => {
    const result = runLint(root)

    assert.deepEqual(
      result.findings.map(finding => [finding.file, finding.ruleId, finding.severity]),
      [
        [DELTA_FILE, 'kanon/delta-conflict', 'warning'],
        [OTHER_FILE, 'kanon/delta-conflict', 'warning'],
      ],
    )
    assert.equal(result.exitCode, 0)
  })
})

test('RN-0057: an ADDED in one change and a MODIFIED of the same ID in another are not a conflict between them', () => {
  const files = project(CURRENT, {
    ...change(CHANGE, { checkout: section('ADDED', requirement('CHK-015', 'Ubiquitous', SHOWS)) }),
    ...change(OTHER, { checkout: section('MODIFIED', requirement('CHK-015', 'Ubiquitous', SHOWS)) }),
  })

  // The MODIFIED is wrong on its own: the requirement is not in the current spec yet.
  assert.deepEqual(found(files), [[OTHER_FILE, 3, 'kanon/delta-target', 'error']])
})
````

- [ ] **Step 2: Run them and see them fail**

Run: `node --test test/cli/lint.test.ts`
Expected: FAIL. The 19 tests that existed pass. Of the 15 new ones, every test that expects a finding from a change gets `[]`, and the one about paths gets "is not a spec of this project" instead of "is not a delta of an open change"; the ones that expect no finding pass already, because nothing reads `changes/` yet.

- [ ] **Step 3: Split `plugin/src/checks/ids.ts`**

A requirement in a delta is held to the format, the registered prefix and the counter — not to uniqueness across the current specs and not to the tombstone rule, which `kanon/delta-duplicate` and `kanon/delta-added` say in a delta's own terms. Replace the whole file with:

````ts
import type { Finding } from '../core/types.ts'
import { parseId } from '../ids/id.ts'
import type { Capability } from '../registry/registry.ts'
import type { Requirement } from '../specs/parse.ts'

// What holds for a requirement wherever it is written, in a current spec or in
// a delta: the format, a registered prefix and the counter (RN-0042, RN-0043,
// RN-0045).
export function checkIdForm(requirements: readonly Requirement[], registry: ReadonlyMap<string, Capability>): Finding[] {
  const findings: Finding[] = []

  for (const { file, line, token } of requirements) {
    const error = (ruleId: string, message: string): void => void findings.push({ file, line, ruleId, severity: 'error', message })
    const id = parseId(token)

    if (id === null) {
      error('kanon/id-format', `"${token}" is not a requirement ID: two to five uppercase letters, a hyphen and three digits from 001 to 999.`)
      continue
    }

    const capability = registry.get(id.prefix)

    if (capability === undefined) {
      error('kanon/id-registered', `the prefix ${id.prefix} has no registry file — register the capability before using its IDs.`)
      continue
    }
    if (id.number > capability.counter) {
      error(
        'kanon/id-counter',
        `${token} is above the counter of ${id.prefix}, which is at ${capability.counter} — an ID comes from the counter, never from hand.`,
      )
    }
  }

  return findings
}

/** Format, registered prefix, uniqueness, tombstones and the counter (RN-0042 to RN-0045). */
export function checkIds(requirements: readonly Requirement[], registry: ReadonlyMap<string, Capability>): Finding[] {
  const findings = checkIdForm(requirements, registry)
  const seen = new Map<string, Requirement>()

  for (const requirement of requirements) {
    const { file, line, token } = requirement
    const error = (ruleId: string, message: string): void => void findings.push({ file, line, ruleId, severity: 'error', message })
    const id = parseId(token)

    if (id === null) {
      continue
    }

    const first = seen.get(token)

    if (first === undefined) {
      seen.set(token, requirement)
    } else {
      error('kanon/id-unique', `${token} is already the ID of the requirement at ${first.file}:${first.line}.`)
    }

    const capability = registry.get(id.prefix)

    if (capability?.tombstones.includes(token) === true) {
      error('kanon/id-tombstone', `${token} is a tombstone in ${capability.file}: the ID of a removed requirement is never used again.`)
    }
  }

  for (const capability of registry.values()) {
    for (const tombstone of capability.tombstones) {
      if ((parseId(tombstone)?.number ?? 0) > capability.counter) {
        findings.push({
          file: capability.file,
          line: capability.lines.tombstones ?? 0,
          ruleId: 'kanon/id-counter',
          severity: 'error',
          message: `the tombstone ${tombstone} is above the counter, which is at ${capability.counter}.`,
        })
      }
    }
  }

  return findings
}
````

- [ ] **Step 4: Write `plugin/src/checks/delta.ts`**

````ts
import { CHANGE_ID, type OpenChange } from '../changes/change.ts'
import type { Delta, DeltaEntry } from '../changes/delta.ts'
import { SPECS_DIR, SPEC_FILE } from '../core/paths.ts'
import type { Finding, Severity } from '../core/types.ts'
import { parseId } from '../ids/id.ts'
import type { Capability } from '../registry/registry.ts'
import type { Requirement } from '../specs/parse.ts'

type Registry = ReadonlyMap<string, Capability>

interface Placed {
  change: OpenChange
  delta: Delta
  entry: DeltaEntry
}

function placed(changes: readonly OpenChange[]): Placed[] {
  return changes.flatMap(change => change.deltas.flatMap(delta => delta.entries.map(entry => ({ change, delta, entry }))))
}

function at({ entry }: Placed, ruleId: string, severity: Severity, message: string): Finding {
  return { file: entry.requirement.file, line: entry.requirement.line, ruleId, severity, message }
}

/** Whether a path is the current spec of a registered capability. */
function registered(target: string, registry: Registry): boolean {
  return [...registry.values()].some(capability => target === `${SPECS_DIR}/${capability.name}/${SPEC_FILE}`)
}

// A change is a folder named by its ID, with a proposal that says the same ID
// (RN-0052).
export function checkChangeShape(changes: readonly OpenChange[]): Finding[] {
  const findings: Finding[] = []

  for (const { id, dir, proposal } of changes) {
    const error = (file: string, line: number, message: string): void =>
      void findings.push({ file, line, ruleId: 'kanon/change-shape', severity: 'error', message })

    if (!CHANGE_ID.test(id)) {
      error(dir, 0, `"${id}" is not a change ID: a date as YYYY-MM-DD, a hyphen and a slug in lowercase with hyphens.`)
    }
    if (proposal.problem !== null) {
      error(proposal.file, 0, proposal.problem)
    } else if (proposal.change !== id) {
      error(proposal.file, proposal.line, `\`change\` must be ${id}, the name of the folder.`)
    }
  }

  return findings
}

// A delta mirrors the path of the spec it changes, and holds the three
// sections and nothing else (RN-0053).
export function checkDeltaShape(changes: readonly OpenChange[], registry: Registry): Finding[] {
  const findings: Finding[] = []

  for (const delta of changes.flatMap(change => change.deltas)) {
    const error = (line: number, message: string): void =>
      void findings.push({ file: delta.file, line, ruleId: 'kanon/delta-shape', severity: 'error', message })

    if (!registered(delta.target, registry)) {
      error(0, `${delta.target} is not the spec of a registered capability: a delta sits at the path of the spec it changes.`)
    }
    for (const problem of delta.problems) {
      error(problem.line, problem.message)
    }
  }

  return findings
}

// A MODIFIED and a REMOVED name a requirement that is in the spec the delta
// mirrors (RN-0054).
export function checkDeltaTarget(changes: readonly OpenChange[], current: readonly Requirement[], registry: Registry): Finding[] {
  const findings: Finding[] = []

  for (const item of placed(changes)) {
    const { delta, entry } = item
    const { token } = entry.requirement

    // A delta that mirrors no spec has no target to look into; its shape was reported.
    if (entry.operation === 'ADDED' || !registered(delta.target, registry)) {
      continue
    }
    if (current.some(requirement => requirement.token === token && requirement.file === delta.target)) {
      continue
    }

    const elsewhere = current.find(requirement => requirement.token === token)

    findings.push(
      at(
        item,
        'kanon/delta-target',
        'error',
        elsewhere === undefined
          ? `${token} is not a requirement of ${delta.target}.`
          : `${token} is not a requirement of ${delta.target}: it lives in ${elsewhere.file}, and that is the spec whose delta changes it.`,
      ),
    )
  }

  return findings
}

// An ADDED takes an ID nobody has: neither a requirement of the current specs
// nor a tombstone (RN-0055).
export function checkDeltaAdded(changes: readonly OpenChange[], current: readonly Requirement[], registry: Registry): Finding[] {
  const findings: Finding[] = []

  for (const item of placed(changes)) {
    const { token } = item.entry.requirement

    if (item.entry.operation !== 'ADDED') {
      continue
    }

    const active = current.find(requirement => requirement.token === token)
    const capability = registry.get(parseId(token)?.prefix ?? '')

    if (active !== undefined) {
      findings.push(at(item, 'kanon/delta-added', 'error', `${token} is already the ID of the requirement at ${active.file}:${active.line}.`))
    }
    if (capability?.tombstones.includes(token) === true) {
      findings.push(
        at(item, 'kanon/delta-added', 'error', `${token} is a tombstone in ${capability.file}: the ID of a removed requirement is never used again.`),
      )
    }
  }

  return findings
}

// An ID appears in one operation of a change (RN-0055).
export function checkDeltaDuplicate(changes: readonly OpenChange[]): Finding[] {
  const findings: Finding[] = []

  for (const change of changes) {
    const seen = new Map<string, Requirement>()

    for (const item of placed([change])) {
      const { requirement } = item.entry
      const first = seen.get(requirement.token)

      if (first === undefined) {
        seen.set(requirement.token, requirement)
      } else {
        findings.push(
          at(item, 'kanon/delta-duplicate', 'error', `${requirement.token} is already in an operation of this change, at ${first.file}:${first.line}.`),
        )
      }
    }
  }

  return findings
}

// The mechanical half of a change of intent: the new requirement supersedes
// one that the same change removes (RN-0056).
export function checkDeltaSupersedes(changes: readonly OpenChange[]): Finding[] {
  const findings: Finding[] = []

  for (const change of changes) {
    const items = placed([change])
    const removed = new Set(items.filter(item => item.entry.operation === 'REMOVED').map(item => item.entry.requirement.token))

    for (const { entry } of items) {
      for (const { id, line } of entry.operation === 'ADDED' ? entry.supersedes : []) {
        if (!removed.has(id)) {
          findings.push({
            file: entry.requirement.file,
            line,
            ruleId: 'kanon/delta-supersedes',
            severity: 'error',
            message: `${entry.requirement.token} supersedes ${id}, which this change does not remove.`,
          })
        }
      }
    }
  }

  return findings
}

/** What two operations on one ID, in two open changes, amount to; null when they can both be synced. */
function clash(mine: DeltaEntry, theirs: DeltaEntry, other: string): { severity: Severity; message: string } | null {
  const { token } = mine.requirement

  if (mine.operation === 'ADDED' && theirs.operation === 'ADDED') {
    return { severity: 'error', message: `${token} is also added by the open change ${other}.` }
  }
  if (mine.operation === 'ADDED' || theirs.operation === 'ADDED') {
    return null
  }
  if (theirs.operation === 'REMOVED') {
    return { severity: 'error', message: `${token} is removed by the open change ${other}: whichever is synced second would break.` }
  }
  if (mine.operation === 'REMOVED') {
    return {
      severity: 'error',
      message: `${token} is modified by the open change ${other}, and this change removes it: whichever is synced second would break.`,
    }
  }

  return { severity: 'warning', message: `${token} is also modified by the open change ${other}: the one synced second replaces the text of the first.` }
}

// Two open changes are an error only where the second sync would break. Each
// side gets the finding, naming the other: a script does not know which yields
// (RN-0057).
export function checkDeltaConflict(changes: readonly OpenChange[]): Finding[] {
  const findings: Finding[] = []
  const items = placed(changes)

  for (const mine of items) {
    for (const theirs of items) {
      if (mine.change === theirs.change || mine.entry.requirement.token !== theirs.entry.requirement.token) {
        continue
      }

      const found = clash(mine.entry, theirs.entry, theirs.change.id)

      if (found !== null) {
        findings.push(at(mine, 'kanon/delta-conflict', found.severity, found.message))
      }
    }
  }

  return findings
}

/** Every rule of a change and of its deltas that is not a rule of a requirement. */
export function checkChanges(changes: readonly OpenChange[], current: readonly Requirement[], registry: Registry): Finding[] {
  return [
    ...checkChangeShape(changes),
    ...checkDeltaShape(changes, registry),
    ...checkDeltaTarget(changes, current, registry),
    ...checkDeltaAdded(changes, current, registry),
    ...checkDeltaDuplicate(changes),
    ...checkDeltaSupersedes(changes),
    ...checkDeltaConflict(changes),
  ]
}
````

- [ ] **Step 5: Rewrite `plugin/src/cli/lint.ts`**

The project is read once into a `Project`, so that `sync` and `status` can run the same validation without reading it again. Replace the whole file with:

````ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadOpenChanges, type OpenChange } from '../changes/change.ts'
import { checkCapacity } from '../checks/capacity.ts'
import { checkChanges } from '../checks/delta.ts'
import { checkEars } from '../checks/ears.ts'
import { checkIdForm, checkIds } from '../checks/ids.ts'
import { checkForbiddenWords, checkGlossary } from '../checks/vocabulary.ts'
import { loadConfig, type Config } from '../config/config.ts'
import { CHANGES_DIR, insideRoot } from '../core/paths.ts'
import { KanonError, type Finding } from '../core/types.ts'
import { parseCriterion, type ParsedCriterion } from '../ears/parse.ts'
import { loadGlossary, type Glossary } from '../glossary/glossary.ts'
import { loadRegistry, type Capability } from '../registry/registry.ts'
import { findSpecs, parseSpec, type Requirement } from '../specs/parse.ts'

export interface LintResult {
  findings: Finding[]
  errors: number
  warnings: number
  exitCode: 0 | 1
}

/** Everything the lint reads, read once. */
export interface Project {
  config: Config
  registry: Map<string, Capability>
  glossary: Glossary
  /** Path of every current spec. */
  specs: string[]
  /** The requirements of the current specs. */
  requirements: Requirement[]
  /** The changes under `changes/`, never the archived ones. */
  changes: OpenChange[]
}

export function loadProject(root: string): Project {
  const config = loadConfig(root)
  const specs = findSpecs(root)

  return {
    config,
    registry: loadRegistry(root),
    glossary: loadGlossary(root, config.glossary),
    specs,
    requirements: specs.flatMap(file => parseSpec(file, readFileSync(join(root, file), 'utf8'))),
    changes: loadOpenChanges(root),
  }
}

// Every finding of the project, by file and line. A requirement under ADDED or
// MODIFIED is held to the rules of a requirement of a current spec; the
// capacity warnings measure the current specs alone (RF-0029).
export function lintProject({ config, registry, glossary, requirements, changes }: Project): Finding[] {
  const written = changes.flatMap(change =>
    change.deltas.flatMap(delta => delta.entries.filter(entry => entry.operation !== 'REMOVED').map(entry => entry.requirement)),
  )
  const everywhere = [...requirements, ...written]
  const parsed = new Map<Requirement, ParsedCriterion>()

  for (const requirement of everywhere) {
    if (requirement.criterion !== '') {
      parsed.set(requirement, parseCriterion(requirement.criterion))
    }
  }

  return [
    ...checkIds(requirements, registry),
    ...checkIdForm(written, registry),
    ...checkCapacity(requirements, registry, config.thresholds),
    ...checkEars(everywhere, parsed),
    ...checkForbiddenWords(everywhere, config.forbiddenWords),
    ...checkGlossary(everywhere, parsed, glossary),
    ...checkChanges(changes, requirements, registry),
  ].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

/**
 * Checks the current specs, the capability registries and the open changes.
 * With `only`, the whole project is still read — a duplicate ID lives in two
 * files — and only the findings of those specs and deltas are reported.
 */
export function runLint(root: string, only: readonly string[] = []): LintResult {
  const project = loadProject(root)
  const deltas = project.changes.flatMap(change => change.deltas.map(delta => delta.file))
  const selected = only.map(path => insideRoot(root, path))

  for (const path of selected) {
    if (path.startsWith(`${CHANGES_DIR}/`) ? !deltas.includes(path) : !project.specs.includes(path)) {
      throw new KanonError(path.startsWith(`${CHANGES_DIR}/`) ? `${path} is not a delta of an open change.` : `${path} is not a spec of this project.`)
    }
  }

  const findings = lintProject(project).filter(finding => selected.length === 0 || selected.includes(finding.file))
  const errors = findings.filter(finding => finding.severity === 'error').length

  return { findings, errors, warnings: findings.length - errors, exitCode: errors === 0 ? 0 : 1 }
}
````

- [ ] **Step 6: Update the usage text**

In `plugin/src/cli/index.ts`, replace

````text
  lint [<spec>...]
      Checks the current specs and the capability registries; given specs, only those.
````

with

````text
  lint [<path>...]
      Checks the current specs, the capability registries and the open changes;
      given paths, only those specs and deltas.
````

- [ ] **Step 7: Run the tests**

Run: `node --test test/cli/lint.test.ts`
Expected: PASS, 34 of 34.

Run: `../../spur test`
Expected: PASS, every test of the project.

- [ ] **Step 8: Type-check, lint and stage**

```bash
../../spur typecheck
../../spur lint-check
git add plugin/src/checks/ids.ts plugin/src/checks/delta.ts plugin/src/cli/lint.ts plugin/src/cli/index.ts test/cli/lint.test.ts
```

Expected: the type-check prints nothing; ESLint reports warnings (the `no-floating-promises` of every `test(` call, as before) and **0 errors**.

---

### Task 7: `kanon change open`, `sync` and `drop`

**Files:**
- Create: `plugins/kanon/plugin/templates/proposal.md`
- Create: `plugins/kanon/plugin/src/cli/change.ts`
- Modify: `plugins/kanon/plugin/src/cli/index.ts` (imports, usage text, `today`, `report`, routing)
- Modify: `plugins/kanon/test/helpers/project.ts` (the fixed date)
- Test: `plugins/kanon/test/cli/change.test.ts`

**Interfaces:**
- Consumes: `applyDelta` (Task 4); `CHANGE_ID`, `SLUG`, `DATE`, `archiveDir`, `changeDir`, `loadChange`, `withStatus` (Task 5); `loadProject`, `lintProject` (Task 6); `loadRegistry`, `writeCapability`, `Capability` from `src/registry/registry.ts`; `readTemplate` from `src/cli/templates.ts`; `formatFindings` from `src/cli/report.ts`.
- Produces:
  - `interface Opening { id: string | null; refusal: string | null }`.
  - `interface Ending { refusal: string | null; findings: Finding[]; notes: string[]; written: string[]; moved: { from: string; to: string } | null }`.
  - `openChange(root: string, slug: string, date: string): Opening`.
  - `syncChange(root: string, id: string): Ending`.
  - `dropChange(root: string, id: string): Ending`.
  - The command line: `kanon change open <slug>` prints the ID; `kanon change sync <id>` and `kanon change drop <id>` print the findings (if any), then `written  <path>` per file and `moved  <from> -> <to>`. A refusal goes to stderr as `kanon: <refusal>` with exit 1.
  - `KANON_TODAY` — the environment variable that fixes the date.
  - In the test helpers: `TODAY = '2026-10-02'`, and `kanon()` runs every command with `KANON_TODAY` set to it.

- [ ] **Step 1: Fix the date of every test run, and write the failing test**

In `test/helpers/project.ts`, add above `export function proposal(`:

````ts
/** The day every test run of the command line happens on. */
export const TODAY = '2026-10-02'
````

and in `kanon()`, replace the line that builds `env` with:

````ts
  const env: NodeJS.ProcessEnv = { ...process.env, KANON_REPO_ROOT: root, KANON_TODAY: TODAY }
````

Create `test/cli/change.test.ts`:

````ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { loadRegistry } from '../../plugin/src/registry/registry.ts'
import { CONFIG, TODAY, capability, change, kanon, project, proposal, requirement, withProject } from '../helpers/project.ts'
import { CLI } from '../helpers/roots.ts'

const ID = `${TODAY}-coupon-redemption`
const DIR = `changes/${ID}`
const ARCHIVED = `changes/archive/${ID}`

const SPEC = [
  requirement('CHK-003', 'Ubiquitous', 'THE Checkout SHALL accept any coupon.'),
  requirement('CHK-009', 'Event', 'WHEN the coupon is applied, THE Checkout SHALL show the total.'),
].join('\n')

const DELTA = [
  '## ADDED',
  '',
  '### CHK-015 [Unwanted]',
  '',
  'IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.',
  'Supersedes: CHK-003',
  '',
  '## MODIFIED',
  '',
  '### CHK-009 [Event]',
  '',
  'WHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.',
  '',
  '## REMOVED',
  '',
  '### CHK-003',
  '',
  'Reason: replaced by CHK-015, which names the expired case.',
  '',
].join('\n')

function read(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

/** Every file of the project with its content, to tell whether a run wrote anything. */
function snapshot(root: string, dir = ''): Record<string, string> {
  return Object.fromEntries(
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const path = dir === '' ? entry.name : `${dir}/${entry.name}`

      return entry.isDirectory() ? Object.entries(snapshot(root, path)) : [[path, read(root, path)]]
    }),
  )
}

test('RF-0025: change open creates the folder under the date of the day and prints the ID', () => {
  withProject(project(SPEC), root => {
    const run = kanon(root, 'change', 'open', 'coupon-redemption')

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, `${ID}\n`)
    assert.equal(run.stderr, '')
    assert.match(read(root, `${DIR}/proposal.md`), new RegExp(`^---\\nchange: ${ID}\\nstatus: open\\n---\\n\\n# ${ID}\\n`))
    // RN-0052: a change with only a proposal is a valid open change.
    assert.equal(kanon(root, 'lint').stdout, 'kanon: no findings.\n')
  })
})

test('RF-0025: the date is the local date of the day, and a fixed date that is no date stops the run', () => {
  const localDate = (): string => {
    const now = new Date()

    return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(part => String(part).padStart(2, '0')).join('-')
  }

  withProject({ '.kanon/config.yml': CONFIG }, root => {
    const open = (slug: string, today?: string): ReturnType<typeof kanon> => {
      const env: NodeJS.ProcessEnv = { ...process.env, KANON_REPO_ROOT: root }

      delete env.KANON_TODAY
      if (today !== undefined) {
        env.KANON_TODAY = today
      }

      const run = spawnSync('node', [CLI, 'change', 'open', slug], { cwd: root, env, encoding: 'utf8' })

      return { status: run.status, stdout: run.stdout, stderr: run.stderr }
    }
    const before = localDate()
    const run = open('by-the-clock')

    // Two candidates, for a run that crosses midnight.
    assert.ok([`${before}-by-the-clock\n`, `${localDate()}-by-the-clock\n`].includes(run.stdout), run.stdout)

    for (const today of ['yesterday', '2026-10-2', '02/10/2026', '']) {
      const fixed = open('fixed', today)

      assert.equal(fixed.status, 2, today)
      assert.match(fixed.stderr, /KANON_TODAY/, today)
    }
    assert.deepEqual(readdirSync(join(root, 'changes')), [run.stdout.trim()])
  })
})

test('RF-0025: a slug that is not lowercase kebab-case is refused, and nothing is created', () => {
  withProject({ '.kanon/config.yml': CONFIG }, root => {
    for (const slug of ['Coupon', 'coupon_redemption', 'coupon--redemption', '-coupon', 'coupon-', '../coupon', 'a/b', 'coupon redemption']) {
      const run = kanon(root, 'change', 'open', slug)

      assert.equal(run.status, 1, slug)
      assert.match(run.stderr, /is not a slug/, slug)
    }
    assert.equal(existsSync(join(root, 'changes')), false)
  })
})

test('RF-0025: an ID that already exists, open or archived, is refused (RN-0052)', () => {
  withProject(
    { '.kanon/config.yml': CONFIG, ...change(ID), [`changes/archive/${TODAY}-guest-checkout/proposal.md`]: proposal(`${TODAY}-guest-checkout`, 'synced') },
    root => {
      const open = kanon(root, 'change', 'open', 'coupon-redemption')
      const archived = kanon(root, 'change', 'open', 'guest-checkout')

      assert.equal(open.status, 1)
      assert.match(open.stderr, new RegExp(`already exists, in ${DIR}\\.`))
      assert.equal(archived.status, 1)
      assert.match(archived.stderr, /already exists, in changes\/archive\//)
      assert.equal(existsSync(join(root, `changes/${TODAY}-guest-checkout`)), false)
    },
  )
})

test('RF-0025: with no configuration, or with a subcommand that does not exist, the command cannot run', () => {
  withProject({}, root => {
    assert.equal(kanon(root, 'change', 'open', 'coupon-redemption').status, 2)
    assert.equal(existsSync(join(root, 'changes')), false)
  })
  withProject({ '.kanon/config.yml': CONFIG }, root => {
    assert.equal(kanon(root, 'change').status, 2)
    assert.equal(kanon(root, 'change', 'open').status, 2)
    assert.equal(kanon(root, 'change', 'close', ID).status, 2)
  })
})

test('RF-0026: sync applies the delta, writes the tombstone, marks the proposal and archives the folder', () => {
  withProject(project(SPEC, change(ID, { checkout: DELTA })), root => {
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 0, run.stderr + run.stdout)
    assert.equal(
      run.stdout,
      ['written  specs/checkout/spec.md', 'written  .kanon/capabilities/CHK.md', `written  ${DIR}/proposal.md`, `moved  ${DIR} -> ${ARCHIVED}`, ''].join('\n'),
    )
    // RN-0058: the block is replaced in place, the removed one leaves, the added one goes to the end.
    assert.equal(
      read(root, 'specs/checkout/spec.md'),
      [
        '# checkout',
        '',
        '### CHK-009 [Event]',
        '',
        'WHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.',
        '',
        '### CHK-015 [Unwanted]',
        '',
        'IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.',
        'Supersedes: CHK-003',
        '',
      ].join('\n'),
    )
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, ['CHK-003'])
    assert.equal(loadRegistry(root).get('CHK')?.counter, 20)
    assert.equal(existsSync(join(root, DIR)), false)
    assert.equal(read(root, `${ARCHIVED}/proposal.md`), proposal(ID, 'synced'))
    // The archived delta is kept as written, reason included.
    assert.equal(read(root, `${ARCHIVED}/specs/checkout/spec.md`), DELTA)
    // The project is clean after the sync, and the archive is not linted.
    assert.equal(kanon(root, 'lint').stdout, 'kanon: no findings.\n')
  })
})

test('RF-0026: a tombstone goes to the registry of the prefix of the ID, whatever spec the requirement lived in', () => {
  const files = project(requirement('BIL-002', 'Ubiquitous', 'THE Checkout SHALL show the total.'), {
    '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 5, ['BIL-001']),
    'specs/billing/spec.md': '# billing\n',
    ...change(ID, { checkout: '## REMOVED\n\n### BIL-002\n\nReason: billing took it over.\n' }),
  })

  withProject(files, root => {
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 0, run.stderr + run.stdout)
    assert.match(run.stdout, /^written {2}\.kanon\/capabilities\/BIL\.md$/m)
    assert.deepEqual(loadRegistry(root).get('BIL')?.tombstones, ['BIL-001', 'BIL-002'])
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, [])
  })
})

test('RF-0026: a change with an error is refused with its findings, and nothing is written', () => {
  const broken = DELTA.replace('### CHK-009 [Event]', '### CHK-010 [Event]')

  withProject(project(SPEC, change(ID, { checkout: broken })), root => {
    const before = snapshot(root)
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 1)
    assert.match(run.stdout, new RegExp(`^${DIR}/specs/checkout/spec\\.md:10 {2}kanon/delta-target {2}error {2}`, 'm'))
    assert.match(run.stderr, /nothing was written/)
    assert.deepEqual(snapshot(root), before)
  })
})

test('RF-0026: an error in another change or in the current specs does not stop the sync, and a warning is shown and does not stop it', () => {
  const other = `${TODAY}-other`
  const files = project(SPEC, {
    'specs/payment/spec.md': requirement('CHK-14', 'Ubiquitous', 'THE Checkout SHALL show the total.'),
    ...change(ID, { checkout: DELTA }),
    ...change(other, {
      checkout: '## MODIFIED\n\n### CHK-009 [Event]\n\nWHEN the coupon is applied, THE Checkout SHALL show the tax.\n\n## ADDED\n\n### CHK-99 [Ubiquitous]\n',
    }),
  })

  withProject(files, root => {
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 0, run.stderr + run.stdout)
    assert.match(run.stdout, new RegExp(`^${DIR}/specs/checkout/spec\\.md:10 {2}kanon/delta-conflict {2}warning {2}`, 'm'))
    assert.match(run.stdout, /kanon: 0 errors, 1 warning\./)
    assert.equal(existsSync(join(root, ARCHIVED)), true)
    assert.equal(existsSync(join(root, `changes/${other}`)), true)
  })
})

test('RF-0026: a change that is not open, is archived, has no operation or is no change ID is refused', () => {
  const files = project(SPEC, {
    ...change(ID),
    [`changes/${TODAY}-empty/proposal.md`]: proposal(`${TODAY}-empty`),
    [`changes/${TODAY}-empty/specs/checkout/spec.md`]: '## ADDED\n',
    [`changes/archive/${TODAY}-done/proposal.md`]: proposal(`${TODAY}-done`, 'synced'),
    'outside/proposal.md': 'not a change\n',
  })

  withProject(files, root => {
    const before = snapshot(root)
    const refusal = (id: string): string => {
      const run = kanon(root, 'change', 'sync', id)

      assert.equal(run.status, 1, id)

      return run.stderr
    }

    assert.match(refusal(`${TODAY}-nowhere`), /is not an open change/)
    assert.match(refusal(`${TODAY}-done`), /is already archived/)
    assert.match(refusal(ID), /has no operation in any delta/)
    assert.match(refusal(`${TODAY}-empty`), /has no operation in any delta/)
    assert.match(refusal('../outside'), /is not a change ID/)
    assert.match(refusal('archive'), /is not a change ID/)
    assert.deepEqual(snapshot(root), before)
  })
})

test('RF-0026: sync writes a spec with Windows line endings in its own line endings (RN-0058)', () => {
  const files = project('', { 'specs/checkout/spec.md': `# checkout\n\n${SPEC}`.replaceAll('\n', '\r\n'), ...change(ID, { checkout: DELTA }) })

  withProject(files, root => {
    assert.equal(kanon(root, 'change', 'sync', ID).status, 0)

    const spec = read(root, 'specs/checkout/spec.md')

    assert.equal(/[^\r]\n/.test(spec), false)
    assert.match(spec, /### CHK-015 \[Unwanted\]\r\n\r\nIF the/)
  })
})

test('RF-0026: a registered capability whose spec file is gone gets it back from the first ADDED', () => {
  const files = project(SPEC, {
    '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 1),
    ...change(ID, { billing: `## ADDED\n\n${requirement('BIL-001', 'Ubiquitous', 'THE Checkout SHALL show the total.')}` }),
  })

  withProject(files, root => {
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 0, run.stderr + run.stdout)
    assert.equal(read(root, 'specs/billing/spec.md'), requirement('BIL-001', 'Ubiquitous', 'THE Checkout SHALL show the total.'))
  })
})

test('RF-0027: drop turns the IDs the change allocated into tombstones, marks the proposal and archives the folder', () => {
  const delta = [
    '## ADDED',
    '',
    requirement('CHK-015', 'Ubiquitous', 'THE Checkout SHALL show the total.'),
    requirement('CHK-016', 'Ubiquitous', 'THE Checkout SHALL show the tax.'),
    '## REMOVED',
    '',
    '### CHK-003',
    '',
  ].join('\n')

  withProject(project(SPEC, change(ID, { checkout: delta })), root => {
    const spec = read(root, 'specs/checkout/spec.md')
    const run = kanon(root, 'change', 'drop', ID)

    assert.equal(run.status, 0, run.stderr)
    assert.equal(
      run.stdout,
      [
        'tombstone  CHK-015',
        'tombstone  CHK-016',
        'written  .kanon/capabilities/CHK.md',
        `written  ${DIR}/proposal.md`,
        `moved  ${DIR} -> ${ARCHIVED}`,
        '',
      ].join('\n'),
    )
    // RN-0059: the counter does not go back, and the current specs are not touched.
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, ['CHK-015', 'CHK-016'])
    assert.equal(loadRegistry(root).get('CHK')?.counter, 20)
    assert.equal(read(root, 'specs/checkout/spec.md'), spec)
    assert.equal(read(root, `${ARCHIVED}/proposal.md`), proposal(ID, 'dropped'))
    assert.equal(existsSync(join(root, DIR)), false)
    assert.equal(kanon(root, 'lint').stdout, 'kanon: no findings.\n')
  })
})

test('RF-0027: drop skips a live requirement, a tombstone and an ID that was never allocated, and says so (RN-0059)', () => {
  const delta = ['## ADDED', '']
    .concat(
      ['CHK-003', 'CHK-007', 'CHK-021', 'PAY-001', 'CHK-14', 'CHK-015', 'CHK-015'].map(id =>
        requirement(id, 'Ubiquitous', 'THE Checkout SHALL show the total.'),
      ),
    )
    .join('\n')
  const files = project(SPEC, { '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 20, ['CHK-007']), ...change(ID, { checkout: delta }) })

  withProject(files, root => {
    const run = kanon(root, 'change', 'drop', ID)

    assert.equal(run.status, 0, run.stderr)
    assert.deepEqual(run.stdout.split('\n').slice(0, 6), [
      'skipped  CHK-003  an active requirement, at specs/checkout/spec.md:3',
      'skipped  CHK-007  already a tombstone',
      'skipped  CHK-021  above the counter of CHK, so never allocated',
      'skipped  PAY-001  the prefix PAY is not registered, so never allocated',
      'skipped  CHK-14  not a requirement ID, so never allocated',
      'tombstone  CHK-015',
    ])
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, ['CHK-007', 'CHK-015'])
    assert.equal(kanon(root, 'lint').stdout, 'kanon: no findings.\n')
  })
})

test('RF-0027: drop does not validate — a broken change with no proposal is still archived, and says how it ended', () => {
  const files = project(SPEC, { [`${DIR}/specs/nowhere/spec.md`]: '## Whatever\n\n### CHK-015 [Nope]\n\n## ADDED\n\n### CHK-016\n' })

  withProject(files, root => {
    const run = kanon(root, 'change', 'drop', ID)

    assert.equal(run.status, 0, run.stderr)
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, ['CHK-016'])
    assert.equal(read(root, `${ARCHIVED}/proposal.md`), `---\nchange: ${ID}\nstatus: dropped\n---\n\n# ${ID}\n`)
  })
  withProject(project(SPEC, change(ID)), root => {
    const run = kanon(root, 'change', 'drop', ID)

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, `written  ${DIR}/proposal.md\nmoved  ${DIR} -> ${ARCHIVED}\n`)
  })
})

test('RF-0027: a change that is not open is not dropped', () => {
  const files = project(SPEC, { [`changes/archive/${TODAY}-done/proposal.md`]: proposal(`${TODAY}-done`, 'synced') })

  withProject(files, root => {
    const before = snapshot(root)

    for (const [id, why] of [
      [`${TODAY}-nowhere`, /is not an open change/],
      [`${TODAY}-done`, /is already archived/],
      ['..', /is not a change ID/],
      ['archive', /is not a change ID/],
    ] as const) {
      const run = kanon(root, 'change', 'drop', id)

      assert.equal(run.status, 1, id)
      assert.match(run.stderr, why, id)
    }
    assert.deepEqual(snapshot(root), before)
  })
})

test('RNF-0007: everything a change writes is Markdown inside the project', () => {
  withProject(project(SPEC), root => {
    const opened = kanon(root, 'change', 'open', 'coupon-redemption').stdout.trim()

    assert.equal(opened, ID)
    assert.deepEqual(Object.keys(snapshot(root, 'changes')), [`${DIR}/proposal.md`])
  })
})
````

- [ ] **Step 2: Run it and see it fail**

Run: `node --test test/cli/change.test.ts`
Expected: FAIL — `kanon change …` exits 2 with "unknown or incomplete command". The one test that expects exit 2 passes for the wrong reason; the other 16 fail.

- [ ] **Step 3: Write the template `plugin/templates/proposal.md`**

````markdown
---
change: {{CHANGE}}
status: open
---

# {{CHANGE}}

## Why

What is wrong or missing today, and for whom.

## What changes

What will be different once this change is synced. The requirements themselves
go in the delta of each capability it touches, under `specs/` in this folder,
at the path of the spec they change.
````

- [ ] **Step 4: Write `plugin/src/cli/change.ts`**

`sync` reads, validates and computes everything before its first write, and moves the folder last: a refusal leaves the project untouched, and an interrupted run still shows as an open change. `drop` reads the change without judging it.

````ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { applyDelta } from '../changes/apply.ts'
import { CHANGE_ID, SLUG, archiveDir, changeDir, loadChange, withStatus } from '../changes/change.ts'
import { loadConfig } from '../config/config.ts'
import { ARCHIVE_DIR, PROPOSAL_FILE } from '../core/paths.ts'
import { KanonError, type Finding } from '../core/types.ts'
import { parseId } from '../ids/id.ts'
import { loadRegistry, writeCapability, type Capability } from '../registry/registry.ts'
import { findSpecs, parseSpec } from '../specs/parse.ts'
import { lintProject, loadProject } from './lint.ts'
import { readTemplate } from './templates.ts'

export interface Opening {
  /** Null when nothing was created. */
  id: string | null
  refusal: string | null
}

export interface Ending {
  /** Why the change was left as it was; null when it was ended. */
  refusal: string | null
  /** What the validator sees in the change; `sync` only. */
  findings: Finding[]
  /** One line per ID that became a tombstone or was skipped; `drop` only. */
  notes: string[]
  /** The files written, relative to the project root. */
  written: string[]
  /** The folder as it was moved; null when nothing moved. */
  moved: { from: string; to: string } | null
}

function refuse(refusal: string, findings: Finding[] = []): Ending {
  return { refusal, findings, notes: [], written: [], moved: null }
}

/** Why a change cannot be ended; null when it is an open change. */
function notOpen(root: string, id: string): string | null {
  // The ID becomes a path: one that is not an ID never reaches the disk.
  if (!CHANGE_ID.test(id)) {
    return `"${id}" is not a change ID: a date as YYYY-MM-DD, a hyphen and a slug in lowercase with hyphens.`
  }
  if (existsSync(join(root, archiveDir(id)))) {
    return `${id} is already archived, in ${archiveDir(id)}.`
  }
  if (!existsSync(join(root, changeDir(id)))) {
    return `${id} is not an open change: there is no ${changeDir(id)}.`
  }

  return null
}

function write(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content, 'utf8')
}

/** The proposal gets its last status, and the folder moves last of all. */
function archive(root: string, id: string, status: 'synced' | 'dropped'): { proposal: string; moved: { from: string; to: string } } {
  const proposal = `${changeDir(id)}/${PROPOSAL_FILE}`
  const source = existsSync(join(root, proposal)) ? readFileSync(join(root, proposal), 'utf8') : null

  write(root, proposal, withStatus(source, id, status))
  mkdirSync(join(root, ARCHIVE_DIR), { recursive: true })
  renameSync(join(root, changeDir(id)), join(root, archiveDir(id)))

  return { proposal, moved: { from: changeDir(id), to: archiveDir(id) } }
}

// A change is opened under the date of the day and a slug, and its ID is
// unique across the open and the archived changes (RF-0025, RN-0052).
export function openChange(root: string, slug: string, date: string): Opening {
  loadConfig(root)

  if (!SLUG.test(slug)) {
    return { id: null, refusal: `"${slug}" is not a slug: lowercase letters and digits, in words joined by one hyphen.` }
  }

  const id = `${date}-${slug}`

  for (const dir of [changeDir(id), archiveDir(id)]) {
    if (existsSync(join(root, dir))) {
      return { id: null, refusal: `the change ${id} already exists, in ${dir}.` }
    }
  }
  write(root, `${changeDir(id)}/${PROPOSAL_FILE}`, readTemplate('proposal.md').replaceAll('{{CHANGE}}', id))

  return { id, refusal: null }
}

// The one step that ends a change: its deltas become the current specs and the
// folder is archived. Everything is computed before the first write, so a
// refusal leaves the project as it was (RF-0026, RN-0058).
export function syncChange(root: string, id: string): Ending {
  const project = loadProject(root)
  const refusal = notOpen(root, id)

  if (refusal !== null) {
    return refuse(refusal)
  }

  const change = project.changes.find(candidate => candidate.id === id) ?? loadChange(root, id)

  if (change.deltas.every(delta => delta.entries.length === 0)) {
    return refuse(`${id} has no operation in any delta: there is nothing to sync.`)
  }

  const findings = lintProject(project).filter(finding => finding.file === change.dir || finding.file.startsWith(`${change.dir}/`))

  if (findings.some(finding => finding.severity === 'error')) {
    return refuse(`${id} has errors, and nothing was written.`, findings)
  }

  const specs = new Map<string, string>()
  const registry = new Map(project.registry)
  const touched = new Set<string>()

  for (const delta of change.deltas) {
    if (delta.entries.length === 0) {
      continue
    }

    const path = join(root, delta.target)
    const applied = applyDelta(existsSync(path) ? readFileSync(path, 'utf8') : '', delta.entries)

    if (applied.missing.length > 0) {
      throw new KanonError(`${delta.file}: ${applied.missing.join(', ')} left ${delta.target} while the change was being synced.`)
    }
    specs.set(delta.target, applied.text)

    for (const tombstone of applied.tombstones) {
      const capability = registry.get(parseId(tombstone)?.prefix ?? '')

      // A requirement whose prefix has no registry leaves the spec and has no file to be a tombstone in.
      if (capability !== undefined && !capability.tombstones.includes(tombstone)) {
        registry.set(capability.prefix, { ...capability, tombstones: [...capability.tombstones, tombstone] })
        touched.add(capability.prefix)
      }
    }
  }

  const capabilities = [...touched].sort().flatMap(prefix => registry.get(prefix) ?? [])

  for (const [path, text] of specs) {
    write(root, path, text)
  }
  for (const capability of capabilities) {
    writeCapability(root, capability)
  }

  const { proposal, moved } = archive(root, id, 'synced')

  return { refusal: null, findings, notes: [], written: [...specs.keys(), ...capabilities.map(capability => capability.file), proposal], moved }
}

// An abandoned change gives nothing back: the IDs it allocated become
// tombstones. Its delta is not validated — it may well be broken — and the
// current specs are not touched (RF-0027, RN-0059).
export function dropChange(root: string, id: string): Ending {
  loadConfig(root)

  const refusal = notOpen(root, id)

  if (refusal !== null) {
    return refuse(refusal)
  }

  const registry = loadRegistry(root)
  const current = findSpecs(root).flatMap(file => parseSpec(file, readFileSync(join(root, file), 'utf8')))
  const added = loadChange(root, id).deltas.flatMap(delta => delta.entries.filter(entry => entry.operation === 'ADDED'))
  const touched = new Map<string, Capability>()
  const notes: string[] = []

  for (const token of new Set(added.map(entry => entry.requirement.token))) {
    const parsed = parseId(token)
    const capability = touched.get(parsed?.prefix ?? '') ?? registry.get(parsed?.prefix ?? '')
    const active = current.find(requirement => requirement.token === token)
    const skip = (why: string): void => void notes.push(`skipped  ${token}  ${why}`)

    if (parsed === null) {
      skip('not a requirement ID, so never allocated')
    } else if (capability === undefined) {
      skip(`the prefix ${parsed.prefix} is not registered, so never allocated`)
    } else if (parsed.number > capability.counter) {
      skip(`above the counter of ${parsed.prefix}, so never allocated`)
    } else if (active !== undefined) {
      // Turning a live requirement into a tombstone would corrupt the current specs.
      skip(`an active requirement, at ${active.file}:${active.line}`)
    } else if (capability.tombstones.includes(token)) {
      skip('already a tombstone')
    } else {
      touched.set(capability.prefix, { ...capability, tombstones: [...capability.tombstones, token] })
      notes.push(`tombstone  ${token}`)
    }
  }

  const capabilities = [...touched.values()].sort((a, b) => a.prefix.localeCompare(b.prefix))

  for (const capability of capabilities) {
    writeCapability(root, capability)
  }

  const { proposal, moved } = archive(root, id, 'dropped')

  return { refusal: null, findings: [], notes, written: [...capabilities.map(capability => capability.file), proposal], moved }
}
````

- [ ] **Step 5: Route the command in `plugin/src/cli/index.ts`**

Replace the imports at the top of the file with:

````ts
import { resolve } from 'node:path'
import { DATE } from '../changes/change.ts'
import { KanonError } from '../core/types.ts'
import { addCapability } from './capability.ts'
import { dropChange, openChange, syncChange, type Ending } from './change.ts'
import { allocateId } from './id.ts'
import { runInit } from './init.ts'
import { runLint } from './lint.ts'
import { formatFindings } from './report.ts'
````

In `USAGE`, right under the two lines of `capability add`, add:

````text
  change open <slug>
      Opens a change under today's date and prints its ID.
  change sync <id>
      Applies the deltas of a change to the current specs and archives it.
  change drop <id>
      Abandons a change: the IDs it allocated become tombstones, and it is archived.
````

Right under the function `repoRoot`, add:

````ts
/** The local date, as YYYY-MM-DD. `KANON_TODAY` fixes it, for a run that must not depend on the clock. */
function today(): string {
  const fixed = process.env.KANON_TODAY

  if (fixed !== undefined) {
    if (!DATE.test(fixed)) {
      throw new KanonError(`KANON_TODAY must be a date as YYYY-MM-DD, and it is "${fixed}".`)
    }

    return fixed
  }

  const now = new Date()
  const two = (value: number): string => String(value).padStart(2, '0')

  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
}

/** Prints how a change ended, or why it did not. */
function report(ending: Ending): number {
  if (ending.findings.length > 0) {
    process.stdout.write(`${formatFindings(ending.findings)}\n`)
  }
  if (ending.refusal !== null) {
    process.stderr.write(`kanon: ${ending.refusal}\n`)

    return 1
  }
  for (const note of ending.notes) {
    process.stdout.write(`${note}\n`)
  }
  for (const path of ending.written) {
    process.stdout.write(`written  ${path}\n`)
  }
  if (ending.moved !== null) {
    process.stdout.write(`moved  ${ending.moved.from} -> ${ending.moved.to}\n`)
  }

  return 0
}
````

In the function `run`, right above its last statement — the one that writes `kanon: unknown or incomplete command.` —, add:

````ts
  if (command === 'change' && args[1] !== undefined) {
    if (args[0] === 'open') {
      const opening = openChange(root, args[1], today())

      if (opening.id === null) {
        process.stderr.write(`kanon: ${opening.refusal}\n`)

        return 1
      }
      process.stdout.write(`${opening.id}\n`)

      return 0
    }
    if (args[0] === 'sync') {
      return report(syncChange(root, args[1]))
    }
    if (args[0] === 'drop') {
      return report(dropChange(root, args[1]))
    }
  }

````

- [ ] **Step 6: Run the tests**

Run: `node --test test/cli/change.test.ts`
Expected: PASS, 17 of 17.

Run: `../../spur test`
Expected: PASS, every test of the project — the distribution tests included, which now scan `templates/proposal.md` and `src/cli/change.ts`.

- [ ] **Step 7: Type-check, lint and stage**

```bash
../../spur typecheck
../../spur lint-check
git add plugin/templates/proposal.md plugin/src/cli/change.ts plugin/src/cli/index.ts test/helpers/project.ts test/cli/change.test.ts
```

Expected: no type error and 0 ESLint errors.

---

### Task 8: `kanon status`

**Files:**
- Create: `plugins/kanon/plugin/src/cli/status.ts`
- Modify: `plugins/kanon/plugin/src/cli/report.ts` (`plural` exported)
- Modify: `plugins/kanon/plugin/src/cli/index.ts` (import, usage text, routing)
- Test: `plugins/kanon/test/cli/status.test.ts`

**Interfaces:**
- Consumes: `loadProject`, `lintProject` (Task 6); `Operation` (Task 3); `plural(count: number, singular: string, pluralForm: string): string` from `src/cli/report.ts`.
- Produces:
  - `interface ChangeSummary { id: string; errors: number; warnings: number; deltas: { name: string; added: number; modified: number; removed: number }[] }`.
  - `runStatus(root: string): ChangeSummary[]` — one per open change, in the order of the folder names.
  - `formatStatus(summaries: readonly ChangeSummary[]): string` — no trailing newline.
  - The command line: `kanon status`, exit 0 whatever the changes hold.

- [ ] **Step 1: Write the failing test**

Create `test/cli/status.test.ts`:

````ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { capability, change, kanon, project, proposal, requirement, withProject } from '../helpers/project.ts'

const CHANGE = '2026-10-02-coupon-redemption'
const OTHER = '2026-10-02-loyalty'
const SHOWS = 'THE Checkout SHALL show the total.'

const CURRENT = [requirement('CHK-003', 'Ubiquitous', SHOWS), requirement('CHK-009', 'Ubiquitous', SHOWS)].join('\n')

const DELTA = [
  '## ADDED',
  '',
  requirement('CHK-015', 'Ubiquitous', SHOWS),
  requirement('CHK-016', 'Ubiquitous', SHOWS),
  '## MODIFIED',
  '',
  requirement('CHK-009', 'Ubiquitous', SHOWS),
  '## REMOVED',
  '',
  '### CHK-003',
  '',
  'Reason: no longer needed.',
  '',
].join('\n')

test('RF-0028: status lists each open change with its operations per capability and what the validator sees', () => {
  const files = project(CURRENT, {
    '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 5),
    'specs/billing/spec.md': '# billing\n',
    ...change(CHANGE, { checkout: DELTA, billing: `## ADDED\n\n${requirement('BIL-001', 'Ubiquitous', SHOWS)}` }),
    ...change(OTHER, { checkout: `## MODIFIED\n\n${requirement('CHK-009', 'Ubiquitous', SHOWS)}\n## ADDED\n\n${requirement('CHK-14', 'Ubiquitous', SHOWS)}` }),
    'changes/archive/2026-09-14-guest-checkout/proposal.md': proposal('2026-09-14-guest-checkout', 'synced'),
  })

  withProject(files, root => {
    const run = kanon(root, 'status')

    // A view: it exits 0 even when a change has errors.
    assert.equal(run.status, 0, run.stderr)
    assert.equal(
      run.stdout,
      [
        `${CHANGE}  0 errors, 1 warning`,
        '  billing  1 added, 0 modified, 0 removed',
        '  checkout  2 added, 1 modified, 1 removed',
        `${OTHER}  1 error, 1 warning`,
        '  checkout  1 added, 1 modified, 0 removed',
        '',
      ].join('\n'),
    )
  })
})

test('RF-0028: a change with no delta is listed alone, and a project with no open change says so', () => {
  withProject(project(CURRENT, change(CHANGE)), root => {
    assert.equal(kanon(root, 'status').stdout, `${CHANGE}  0 errors, 0 warnings\n`)
  })
  withProject(project(CURRENT, { 'changes/archive/2026-09-14-guest-checkout/proposal.md': proposal('2026-09-14-guest-checkout', 'dropped') }), root => {
    const run = kanon(root, 'status')

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, 'kanon: no open change.\n')
  })
})

test('RF-0028: status writes nothing, and exits 2 only when it could not run', () => {
  withProject({}, root => {
    const run = kanon(root, 'status')

    assert.equal(run.status, 2)
    assert.match(run.stderr, /kanon init/)
  })
})
````

- [ ] **Step 2: Run it and see it fail**

Run: `node --test test/cli/status.test.ts`
Expected: FAIL, 3 of 3 — `kanon status` exits 2 with "unknown or incomplete command".

- [ ] **Step 3: Export `plural`**

In `plugin/src/cli/report.ts`, change `function plural(` to `export function plural(`.

- [ ] **Step 4: Write `plugin/src/cli/status.ts`**

````ts
import type { Operation } from '../changes/delta.ts'
import { lintProject, loadProject } from './lint.ts'
import { plural } from './report.ts'

export interface ChangeSummary {
  id: string
  errors: number
  warnings: number
  /** One row per delta, named by the capability its path says. */
  deltas: { name: string; added: number; modified: number; removed: number }[]
}

// A view of the open changes: what each one does to each capability, and what
// the validator sees in it. It reports and never fails on a finding (RF-0028).
export function runStatus(root: string): ChangeSummary[] {
  const project = loadProject(root)
  const findings = lintProject(project)

  return project.changes.map(change => {
    const mine = findings.filter(finding => finding.file === change.dir || finding.file.startsWith(`${change.dir}/`))
    const errors = mine.filter(finding => finding.severity === 'error').length

    return {
      id: change.id,
      errors,
      warnings: mine.length - errors,
      deltas: change.deltas.map(delta => {
        const count = (operation: Operation): number => delta.entries.filter(entry => entry.operation === operation).length

        return { name: delta.name, added: count('ADDED'), modified: count('MODIFIED'), removed: count('REMOVED') }
      }),
    }
  })
}

export function formatStatus(summaries: readonly ChangeSummary[]): string {
  if (summaries.length === 0) {
    return 'kanon: no open change.'
  }

  return summaries
    .flatMap(({ id, errors, warnings, deltas }) => [
      `${id}  ${plural(errors, 'error', 'errors')}, ${plural(warnings, 'warning', 'warnings')}`,
      ...deltas.map(({ name, added, modified, removed }) => `  ${name}  ${added} added, ${modified} modified, ${removed} removed`),
    ])
    .join('\n')
}
````

- [ ] **Step 5: Route the command in `plugin/src/cli/index.ts`**

Under the import of `./report.ts`, add:

````ts
import { formatStatus, runStatus } from './status.ts'
````

In `USAGE`, right under the two lines of `change drop`, add:

````text
  status
      Lists the open changes, what each does to each capability and its findings.
````

In the function `run`, right above its last statement — the one that writes `kanon: unknown or incomplete command.` —, add:

````ts
  if (command === 'status') {
    process.stdout.write(`${formatStatus(runStatus(root))}\n`)

    return 0
  }

````

The whole of `plugin/src/cli/index.ts` now reads:

````ts
#!/usr/bin/env node
import { resolve } from 'node:path'
import { DATE } from '../changes/change.ts'
import { KanonError } from '../core/types.ts'
import { addCapability } from './capability.ts'
import { dropChange, openChange, syncChange, type Ending } from './change.ts'
import { allocateId } from './id.ts'
import { runInit } from './init.ts'
import { runLint } from './lint.ts'
import { formatFindings } from './report.ts'
import { formatStatus, runStatus } from './status.ts'

const USAGE = `kanon <command>

  init [--glossary <path>] [--constitution <path>]
      Creates the configuration, the constitution and the glossary. Overwrites nothing.
  lint [<path>...]
      Checks the current specs, the capability registries and the open changes;
      given paths, only those specs and deltas.
  id next <CAP>
      Allocates the next requirement ID of a capability and prints it.
  capability add <CAP> <name> [--split-from <CAP>]
      Registers a capability; with --split-from, records it as a split of another.
  change open <slug>
      Opens a change under today's date and prints its ID.
  change sync <id>
      Applies the deltas of a change to the current specs and archives it.
  change drop <id>
      Abandons a change: the IDs it allocated become tombstones, and it is archived.
  status
      Lists the open changes, what each does to each capability and its findings.

Exit codes: 0 done, 1 an error was found or the request was refused, 2 could not run.
`

/** Removes `--name <value>` from the arguments and returns the value; null when absent. */
function takeOption(args: string[], name: string): string | null {
  const index = args.indexOf(name)

  if (index === -1) {
    return null
  }

  const value = args[index + 1]

  if (value === undefined || value.startsWith('--')) {
    throw new KanonError(`\`${name}\` needs a value.`)
  }
  args.splice(index, 2)

  return value
}

function repoRoot(): string {
  return resolve(process.env.KANON_REPO_ROOT ?? process.cwd())
}

/** The local date, as YYYY-MM-DD. `KANON_TODAY` fixes it, for a run that must not depend on the clock. */
function today(): string {
  const fixed = process.env.KANON_TODAY

  if (fixed !== undefined) {
    if (!DATE.test(fixed)) {
      throw new KanonError(`KANON_TODAY must be a date as YYYY-MM-DD, and it is "${fixed}".`)
    }

    return fixed
  }

  const now = new Date()
  const two = (value: number): string => String(value).padStart(2, '0')

  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
}

/** Prints how a change ended, or why it did not. */
function report(ending: Ending): number {
  if (ending.findings.length > 0) {
    process.stdout.write(`${formatFindings(ending.findings)}\n`)
  }
  if (ending.refusal !== null) {
    process.stderr.write(`kanon: ${ending.refusal}\n`)

    return 1
  }
  for (const note of ending.notes) {
    process.stdout.write(`${note}\n`)
  }
  for (const path of ending.written) {
    process.stdout.write(`written  ${path}\n`)
  }
  if (ending.moved !== null) {
    process.stdout.write(`moved  ${ending.moved.from} -> ${ending.moved.to}\n`)
  }

  return 0
}

function run(root: string, command: string, args: string[]): number {
  if (command === 'lint') {
    const result = runLint(root, args)

    process.stdout.write(`${formatFindings(result.findings)}\n`)

    return result.exitCode
  }

  if (command === 'init') {
    const glossary = takeOption(args, '--glossary') ?? undefined
    const constitution = takeOption(args, '--constitution') ?? undefined

    for (const { path, outcome } of runInit(root, { glossary, constitution })) {
      process.stdout.write(`${outcome}  ${path}\n`)
    }

    return 0
  }

  if (command === 'id' && args[0] === 'next' && args[1] !== undefined) {
    const allocation = allocateId(root, args[1])

    if (allocation.warning !== null) {
      process.stderr.write(`kanon: ${allocation.warning}\n`)
    }
    if (allocation.id === null) {
      process.stderr.write(`kanon: ${allocation.refusal}\n`)

      return 1
    }
    process.stdout.write(`${allocation.id}\n`)

    return 0
  }

  if (command === 'capability' && args[0] === 'add') {
    const splitFrom = takeOption(args, '--split-from')
    const [, prefix, name] = args

    if (prefix !== undefined && name !== undefined) {
      const registration = addCapability(root, prefix, name, splitFrom)

      if (registration.refusal !== null) {
        process.stderr.write(`kanon: ${registration.refusal}\n`)

        return 1
      }
      for (const path of registration.written) {
        process.stdout.write(`written  ${path}\n`)
      }

      return 0
    }
  }

  if (command === 'change' && args[1] !== undefined) {
    if (args[0] === 'open') {
      const opening = openChange(root, args[1], today())

      if (opening.id === null) {
        process.stderr.write(`kanon: ${opening.refusal}\n`)

        return 1
      }
      process.stdout.write(`${opening.id}\n`)

      return 0
    }
    if (args[0] === 'sync') {
      return report(syncChange(root, args[1]))
    }
    if (args[0] === 'drop') {
      return report(dropChange(root, args[1]))
    }
  }

  if (command === 'status') {
    process.stdout.write(`${formatStatus(runStatus(root))}\n`)

    return 0
  }

  process.stderr.write(`kanon: unknown or incomplete command.\n\n${USAGE}`)

  return 2
}

function main(argv: readonly string[]): number {
  const [command, ...args] = argv

  if (command === undefined || command === '--help' || command === '-h') {
    process.stdout.write(USAGE)

    return command === undefined ? 2 : 0
  }

  try {
    return run(repoRoot(), command, args)
  } catch (error) {
    if (error instanceof KanonError) {
      process.stderr.write(`kanon: ${error.message}\n`)

      return 2
    }
    throw error
  }
}

process.exitCode = main(process.argv.slice(2))
````

- [ ] **Step 6: Run the tests**

Run: `node --test test/cli/status.test.ts`
Expected: PASS, 3 of 3.

Run: `../../spur test`
Expected: PASS, every test of the project.

- [ ] **Step 7: Type-check, lint and stage**

```bash
../../spur typecheck
../../spur lint-check
git add plugin/src/cli/status.ts plugin/src/cli/report.ts plugin/src/cli/index.ts test/cli/status.test.ts
```

---

### Task 9: The session commands

**Files:**
- Create: `plugins/kanon/plugin/commands/change.md`
- Create: `plugins/kanon/plugin/commands/status.md`
- Modify: `plugins/kanon/plugin/commands/ears-lint.md` (whole file)
- Test: `plugins/kanon/test/distribution/session.test.ts` (extended)

**Interfaces:**
- Consumes: the command line of Tasks 6 to 8, as `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" …`.
- Produces: `/kanon:change` (`open`, `sync`, `drop`) and `/kanon:status`.

These three files ship to whoever installs the plugin: no ID of this repository and no section of a spec of this repository appears in them, and they are written in English.

- [ ] **Step 1: Write the failing tests**

In `test/distribution/session.test.ts`, add right above the comment `// The marketplace cache receives the plugin directory alone, with no`:

````ts
test('RF-0030: the change command goes through the command line to open, sync and drop', () => {
  for (const subcommand of ['open <slug>', 'sync <id>', 'drop <id>']) {
    assert.ok(command('change').includes(`${CLI} change ${subcommand}`), subcommand)
  }
  assert.match(command('change'), /^argument-hint: .*open .*sync .*drop /m)
  assert.match(command('change'), /as it came/)
  assert.match(command('change'), /never commit/i)
})

test('RF-0030: opening confirms the slug first, and dropping asks first', () => {
  assert.match(command('change'), /Confirm it with the person before creating/)
  assert.match(command('change'), /Ask before running it/)
  assert.match(command('change'), /\/kanon:capability next <CAP>/)
})

test('RF-0030: the status command runs the command line and shows its output as it came', () => {
  assert.ok(command('status').includes(`${CLI} status`))
  assert.match(command('status'), /as it came/)
})

test('RF-0029: the lint command says it covers the open changes', () => {
  assert.match(command('ears-lint'), /every open change/)
  assert.match(command('ears-lint'), /read as a delta/)
})
````

In the last test of the file, add `delete env.KANON_TODAY` under `delete env.KANON_REPO_ROOT`, and right under `assert.match(run('lint').stdout, /kanon: no findings\./)` add:

````ts
    // The proposal comes from a template that travels with the plugin, and the date from the clock.
    assert.match(run('change', 'open', 'first-change').stdout, /^\d{4}-\d{2}-\d{2}-first-change\n$/)
    assert.match(run('status').stdout, /-first-change {2}0 errors, 0 warnings\n$/)
````

- [ ] **Step 2: Run them and see them fail**

Run: `node --test test/distribution/session.test.ts`
Expected: FAIL, 4 of 10 — three with `ENOENT` for `commands/change.md` or `commands/status.md`, and the one about the lint command because `ears-lint.md` does not say "every open change". The copied-alone test passes: the command line of Tasks 7 and 8 already travels with the plugin.

- [ ] **Step 3: Write `plugin/commands/change.md`**

````markdown
---
description: Opens a change, syncs its deltas into the current specs, or drops it
argument-hint: 'open <description> | sync <id> | drop <id>'
---

Open, sync or drop a change: $ARGUMENTS

A change is a folder `changes/<id>/` holding a `proposal.md` and one delta per
capability it touches, at `changes/<id>/specs/<name>/spec.md` — the path of the
spec it changes. Its ID is the date it was opened and a slug, and never changes.
A delta has three sections and nothing else at that level: `## ADDED`,
`## MODIFIED` with the whole requirement as it will read, and `## REMOVED` with
the heading of the requirement and a `Reason:` line.

Run every command below from the repository root, show its output as it came,
and never commit: the person reads the result and commits it.

## open

1. From the description, propose a slug: lowercase words joined by hyphens,
   short enough to say aloud. Confirm it with the person before creating
   anything — the ID is the name of the folder and never changes.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" change open <slug>`. It
   creates the folder with a `proposal.md` and prints the ID, or refuses and
   says why.
3. Say where the deltas go. Each new requirement gets its ID from
   `/kanon:capability next <CAP>`, never typed from memory.

## sync

Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" change sync <id>`. It checks
the change first: with an error it prints the findings and writes nothing. With
none, it applies every delta to the current specs, records each removed ID as
used for good, and moves the folder to `changes/archive/`.

When it refuses, fix the delta and never the rule: a finding is not silenced by
editing a registry, the glossary or the configuration.

## drop

Dropping has no way back: every ID the change allocated is recorded as used for
good and is never given to another requirement. Ask before running it, saying
which change will be dropped.

On a yes, run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" change drop <id>`.
It lists each ID it retired and each one it skipped, with the reason, and moves
the folder to `changes/archive/`. The current specs are not touched.

A change that only ever lived in a branch that was never merged needs no drop:
deleting the branch is enough.
````

- [ ] **Step 4: Write `plugin/commands/status.md`**

````markdown
---
description: Lists the open changes, what each does to each capability, and what the lint sees in it
---

Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" status` from the repository
root and show its output as it came — same order, same wording, nothing left
out.

Each open change is one line with its ID and its count of errors and warnings,
followed by one line per capability it touches, with how many requirements it
adds, modifies and removes. An archived change is not listed.

The command is a view: it writes nothing, and it exits 0 even when a change has
errors. To read the findings themselves, run `/kanon:ears-lint`. Exit code 2
means it could not run: say what it reported and stop.
````

- [ ] **Step 5: Rewrite `plugin/commands/ears-lint.md`**

````markdown
---
description: Runs the deterministic lint of EARS criteria, requirement IDs, glossary terms and open changes
argument-hint: '[spec or delta paths]'
---

Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" lint` from the repository
root and show its findings as they came — same order, same wording, nothing
softened and nothing left out.

Paths to restrict the run to, if any: $ARGUMENTS

Pass each path as its own quoted argument, so that a path with a space stays
one path. With no path, every spec of the project and every open change under
`changes/` is checked; an archived change never is. A path under `changes/` is
read as a delta.

Each line is `file:line  rule  severity  message`. An error fails the run; a
warning does not. Exit code 2 means the lint could not run: say what it reported
and stop, instead of guessing what the findings would have been.

Fix nothing unless asked. When asked, fix the criterion or the delta and never
the rule: a finding is not silenced by editing the configuration, the glossary
or a registry so that it stops matching.
````

- [ ] **Step 6: Run the tests**

Run: `node --test test/distribution/session.test.ts test/distribution/no-internal-trace.test.ts`
Expected: PASS, 12 of 12.

- [ ] **Step 7: Review what ships, and stage**

Dispatch the `shipped-content-reviewer` agent with the list of paths under `plugins/kanon/plugin/` this plan created or changed (`commands/change.md`, `commands/status.md`, `commands/ears-lint.md`, `templates/proposal.md`, and every file under `src/`). Fix what it reports — a string in `src/` that points back inside this repository is fixed in the string, never by moving it into a comment.

```bash
git add plugin/commands/change.md plugin/commands/status.md plugin/commands/ears-lint.md test/distribution/session.test.ts
```

---

### Task 10: The documents that travel with the code, and the second commit

**Files:**
- Modify: `plugins/kanon/.ownership.yml` (one watch)
- Modify: `plugins/kanon/CHANGELOG.md`
- Modify: `plugins/kanon/README.md`

**Interfaces:**
- Consumes: everything staged by Tasks 2 to 9.
- Produces: the second commit.

`README.md` and `CHANGELOG.md` are read by whoever installs the plugin: neither carries an artifact ID.

- [ ] **Step 1: Watch `plugin/src/changes/**`**

In `plugins/kanon/.ownership.yml`, replace

````yaml
  - code: 'plugin/src/{checks,ears,ids,glossary,registry,specs}/**'
````

with

````yaml
  - code: 'plugin/src/{changes,checks,ears,ids,glossary,registry,specs}/**'
````

The `doc` and the `reason` of that watch stay as they are: what a delta may name and how it is merged are executable rules too.

- [ ] **Step 2: Write the CHANGELOG entries**

In `plugins/kanon/CHANGELOG.md`, under `## [Unreleased]`, add at the end of the `### Added` list:

````markdown
- `/kanon:change` opens a change, syncs it and drops it. A change is a folder
  `changes/<date>-<slug>/` with a proposal and one delta per capability, in the
  sections `ADDED`, `MODIFIED` and `REMOVED`. Syncing merges the deltas into the
  current specs requirement by requirement, leaves everything else in a spec as
  it was, and archives the folder; dropping retires the IDs the change
  allocated and archives it.
- `/kanon:status` lists the open changes, with what each one adds, modifies and
  removes per capability and how many errors and warnings it has.
- Seven lint rules for changes: `kanon/change-shape`, `kanon/delta-shape`,
  `kanon/delta-target`, `kanon/delta-added`, `kanon/delta-duplicate`,
  `kanon/delta-supersedes` and `kanon/delta-conflict`.
````

and, after that list, a new section:

````markdown
### Changed

- `/kanon:ears-lint` also checks every open change under `changes/`, and a path
  under `changes/` is read as a delta. A project with an open change that
  breaks a rule now fails the lint; archived changes are never checked.
````

- [ ] **Step 3: Update the README**

In `plugins/kanon/README.md`:

**The `## Status` section** — replace its paragraph with:

````markdown
**Second slice, first part.** What exists today is the foundation — the
project's constitution, glossary and capabilities —, the deterministic lint, and
the spine of the change cycle: a change is a folder with its deltas, and three
commands open it, merge it into the current specs, or drop it. A delta is still
written by hand, each new requirement with an ID allocated by
`/kanon:capability next <CAP>`. Specifying a change with the model's help, and
tracing each requirement to its test, are not here yet.
````

**The `## Commands` table** — replace the row of `/kanon:ears-lint` and add two rows after `/kanon:capability`:

````markdown
| `/kanon:change`       | Opens a change, syncs its deltas into the current specs, or drops it.         |
| `/kanon:status`       | Lists the open changes, what each does to each capability, and its findings.  |
| `/kanon:ears-lint`    | Runs the lint over the specs and the open changes, as its findings came.      |
````

**The layout under `## What it keeps in your repository`** — add to the end of the `text` block:

````text
changes/
  2026-10-02-coupon-redemption/   # an open change
    proposal.md
    specs/
      checkout/spec.md            # the delta of specs/checkout/spec.md
  archive/                        # the changes that were synced or dropped
````

**A new section**, between `## A requirement` and `## The lint`:

````markdown
## A change and its delta

A change is a folder under `changes/`, named by the day it was opened and a
slug — `2026-10-02-coupon-redemption`. It holds a `proposal.md` and one delta
per capability it touches, at the path of the spec it changes:
`changes/<id>/specs/checkout/spec.md` is the delta of `specs/checkout/spec.md`.

```markdown
## ADDED

### CHK-015 [Unwanted]

IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.
Supersedes: CHK-003

## MODIFIED

### CHK-009 [Event]

WHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.

## REMOVED

### CHK-003

Reason: replaced by CHK-015, which names the expired case.
```

- **ADDED** and **MODIFIED** hold requirements exactly as a spec does, and the
  lint holds them to the same rules. A MODIFIED carries the whole requirement,
  so the delta reads without opening the spec.
- **REMOVED** is the heading of the requirement and a `Reason:` line.
- **A change of intent** is a REMOVED of the old requirement and an ADDED of
  the new one with `Supersedes: <old ID>`.

`/kanon:change sync <id>` checks the change and, with no error, merges it: a
modified requirement is replaced where it is, a removed one leaves the spec and
its ID is never used again, and the added ones go to the end. Everything else in
the spec stays as it was. The folder then moves to `changes/archive/`, and
nothing is committed for you.

`/kanon:change drop <id>` abandons a change: the IDs it allocated are retired,
the specs are not touched, and the folder is archived. A change that only lived
in a branch that was never merged needs no drop — delete the branch.

`/kanon:status` lists the open changes. The lint checks them together: two open
changes that add the same ID, or one that touches a requirement another removes,
are an error on both.
````

**The `## The lint` section** — replace its first sentence with:

````markdown
`/kanon:ears-lint` checks the specs and every open change, reports one line per
finding — `file:line  rule  severity  message` — and decides nothing by judgment:
````

and add these rows to the table, right above the row of `kanon/capacity`:

````markdown
| `kanon/change-shape`     | A folder under `changes/` not named by a change ID, or a proposal that is missing or names another change |
| `kanon/delta-shape`      | A delta that mirrors no spec, a section other than the three, a requirement outside them, or a removal with no reason |
| `kanon/delta-target`     | A MODIFIED or a REMOVED of a requirement that is not in that spec |
| `kanon/delta-added`      | An ADDED using the ID of an existing requirement or of a removed one |
| `kanon/delta-duplicate`  | The same ID in two operations of one change |
| `kanon/delta-supersedes` | A `Supersedes:` naming a requirement the same change does not remove |
| `kanon/delta-conflict`   | Two open changes that cannot both be synced; a warning when both modify one requirement |
````

- [ ] **Step 4: Format, and run the whole check**

```bash
../../spur format
../../spur check
```

Expected: `format` realigns the two README tables and changes nothing else — `git diff --stat` (the unstaged changes) shows only the three files of this task. `check` runs 116 tests with 0 failures, a type-check that prints nothing, and ESLint with 0 errors.

- [ ] **Step 5: Run the command line once, by hand, on a throwaway project**

No test replaces seeing it. From any empty directory outside the repository, with `K` set to the absolute path of `plugins/kanon/plugin/src/cli/index.ts`:

```bash
node "$K" init
node "$K" capability add CHK checkout
node "$K" id next CHK
node "$K" change open first-change
node "$K" status
```

Expected: three `created` lines, two `written` lines, `CHK-001`, then an ID `<today>-first-change`, then `<today>-first-change  0 errors, 0 warnings`. Write `changes/<id>/specs/checkout/spec.md` with

````markdown
## ADDED

### CHK-001 [Ubiquitous]

THE Checkout SHALL show the total.
````

and run `node "$K" lint`. Expected: one `kanon/glossary-term` error on line 5 of the delta — the seed glossary has no term yet. Add the row `| Checkout | The purchase flow | active |` to the table of `specs/glossary.md`, and run:

```bash
node "$K" lint
node "$K" change sync <id>
node "$K" lint
```

Expected: `kanon: no findings.`; then `written  specs/checkout/spec.md`, `written  changes/<id>/proposal.md` and `moved  changes/<id> -> changes/archive/<id>`; then `kanon: no findings.` again, with `CHK-001` at the end of `specs/checkout/spec.md` and nothing left under `changes/` but `archive/`.

- [ ] **Step 6: Validate the repository**

From the repository root:

```bash
./spur validate
./spur validate origin/master
```

Expected: both exit 0. With the rules of Task 1 `active`, `living-docs/citation-coverage` finds a test citing each of `RN-0052` to `RN-0059` and `RF-0025` to `RF-0030`. A complaint from `ownership/watch-satisfied` or `ownership/consumer-change-logged` is answered by the commit message of the next step, not by an edit.

- [ ] **Step 7: Commit — the second of the two**

From the repository root:

```bash
git add plugins/kanon
git status --short
git commit -m "$(cat <<'EOF'
feat(RF-0026): kanon — the change folder, the delta and the commands that end a change

The first part of kanon's change cycle, with nothing that needs a model. A change is a folder named by the day it was opened and a slug, open under changes/ and closed under changes/archive/ (RN-0052); its deltas mirror the path of the spec they change and hold only ADDED, MODIFIED and REMOVED (RN-0053). kanon lint now reads the open changes too (RF-0029): a requirement in a delta is held to every rule of a requirement, and seven new rules say what a delta may name (RN-0054, RN-0055, RN-0056) and where two open changes cannot both be synced (RN-0057).

kanon change sync (RF-0026) validates, computes every spec and registry in memory and only then writes: the merge is by requirement block and leaves everything outside the blocks byte for byte, line endings included (RN-0058). kanon change drop (RF-0027) turns the IDs a change allocated into tombstones and never a live requirement (RN-0059). kanon change open (RF-0025) and kanon status (RF-0028) open a change and list the open ones, and two thin session commands run them (RF-0030).

Docs: none — the rules this code implements, RN-0052 to RN-0059 and RF-0025 to RF-0030, were written in the commit before this one.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

`git status --short` before the commit shows only paths under `plugins/kanon/`. When `ownership/commit-guard` asks, the answer is the `Docs:` line above and the CHANGELOG entries of Step 2.
