# kanon slice 2a, the delta — design

kanon's first slice delivered the foundation and the deterministic lint: a
project has a constitution, a glossary, capabilities and current specs, and
requirements are written into the specs by hand. The second slice of the scope
(`plugins/kanon/docs/research/2026-10-01-kanon-scope.md`) is the change cycle,
and it is too large for one spec. It is cut in three parts, each with its own
spec, plan and implementation:

| Part            | Holds                                                                                 | Depends on        |
| --------------- | ------------------------------------------------------------------------------------- | ----------------- |
| **2a, delta**   | The change folder, the delta validator, `sync`, `drop`, `status`, the lint on changes | slice 1           |
| **2b, proof**   | Test discovery by ID, the traceability matrix, `verify`, `trace`, tracks and budgets  | 2a, `DA-0012`     |
| **2c, session** | `propose` to `implement`, three skills, four subagents, gates and hooks               | 2a, 2b            |

This spec is **2a**: the deterministic spine that turns a change into the
cumulative truth. It comes first because the change folder and the meaning of a
delta are the interface 2b and 2c read, and because nothing in it needs a model.

**Nothing here is an accepted rule.** The requirements this spec calls for are
listed in section 9, to be written as `draft` and promoted by a human act.

## 1. Scope and boundary

In scope:

- The identity and the layout of a change folder.
- The format of a delta, and the validator that checks it.
- `kanon change open`, `kanon change sync`, `kanon change drop` and
  `kanon status`.
- `kanon lint` covering open changes.
- Two thin session commands, `/kanon:change` and `/kanon:status`.

Out of scope:

- Writing criteria with judgment: `propose`, `specify`, `clarify`, `analyze`,
  `plan`, `tasks`, `implement` (2c). In 2a a delta is written by hand, with each
  ID taken from `/kanon:capability next <CAP>`.
- Traceability, `verify`, `trace`, tracks and the criteria budget (2b).
- Hooks, gates, skills and subagents (2c).
- `renumber`, which resolves a counter conflict after a merge (slice 3).
- Any judgment a script cannot make: whether a MODIFIED changes the intent of a
  requirement, or whether a criterion carries implementation detail.

## 2. Decisions taken in the design conversation

| Topic                 | Decision                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Delta layout          | One delta file per capability touched, mirroring the path of the current spec                                    |
| End of the cycle      | One step: `sync` applies the delta and archives the folder; there is no applied-but-open state                   |
| Abandoned change      | `drop` turns the IDs the change allocated into tombstones; the counter never goes back                           |
| Concurrent changes    | An error only where the second sync would break; two MODIFIED of the same ID is a warning                        |
| Session surface       | Thin commands that run the command line and show its output as it came                                           |
| How a delta is merged | Structurally, by requirement block; everything outside the blocks is kept byte for byte                          |
| MODIFIED              | Carries the whole requirement, not the changed fragment                                                          |
| Change ID             | `YYYY-MM-DD-<slug>`, the date being the day the change is opened                                                 |
| REMOVED               | A heading with the ID and a mandatory `Reason:` line                                                             |
| Metadata lines        | `Story`, `Status` and `Since` stay opaque in 2a; `sync` copies a block as written and rewrites no line of it     |

The change ID differs from the scope's only example (`2026-10-coupon-redemption`).
The scope states no rule for it, and it is not updated after the rules; the new
rule says the format outright.

## 3. The change folder

```text
changes/
  2026-10-02-coupon-redemption/     # open
    proposal.md
    specs/
      checkout/spec.md              # the delta of specs/checkout/spec.md
      billing/spec.md
  archive/
    2026-09-14-guest-checkout/      # synced or dropped
```

- **Identity.** A change ID is a date `YYYY-MM-DD`, a hyphen and a slug in
  lowercase kebab-case (`[a-z0-9]+(-[a-z0-9]+)*`). The date is the local date on
  which the change is opened. The ID is the name of the folder, is unique across
  open and archived changes, and never changes.
- **State is where the folder is.** Under `changes/` a change is open; under
  `changes/archive/` it is closed. `archive` cannot collide with a change ID,
  which starts with a digit.
- **`proposal.md`** has front matter with `change` (the ID, equal to the folder
  name) and `status` (`open`, `synced` or `dropped`), which tells the two
  endings apart once the folder is archived. Its body is free prose that no
  script reads.
- **`changes/` is a fixed path**, like `specs/`. The scope makes only the
  glossary and the constitution configurable.
- A change with only a `proposal.md` is a valid open change.

## 4. The delta

A delta is a file `changes/<id>/specs/<name>/spec.md`. Its path below the change
folder is the path of the current spec it changes, and that spec must belong to
a registered capability: the path is what tells `sync` where to write.

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

- The only level-2 headings a delta may have are `## ADDED`, `## MODIFIED` and
  `## REMOVED`, each at most once and in any order. A requirement outside one of
  them is an error.
- Under ADDED and MODIFIED a requirement has exactly the format it has in the
  current specs: the heading `### <ID> [<Pattern>]`, the criterion, and metadata
  lines. Every lint rule of the first slice applies to it unchanged.
- **MODIFIED carries the whole requirement.** Whoever reads the delta sees the
  final text without opening the spec.
- Under REMOVED a requirement is the heading `### <ID>` and a `Reason:` line,
  which is mandatory. The reason stays readable in the archived delta.
- **A change of intent** is a REMOVED of the old requirement and an ADDED of the
  new one carrying `Supersedes: <old ID>`. The validator checks the mechanical
  half: a `Supersedes` under ADDED names an ID the same change removes.
- **A requirement may live outside the capability it was born in**, as the
  current specs already allow. An ADDED may carry any registered prefix; a
  MODIFIED or a REMOVED is written in the delta of the spec where the
  requirement lives today.

## 5. The validator

It is not a new command. `kanon lint` with no argument also checks every open
change under `changes/`, and never `changes/archive/`; given paths, a path under
`changes/` is read as a delta. `kanon change sync` runs the same validation over
its change. Findings keep today's format: `file:line  rule  severity  message`.

Every block under ADDED and MODIFIED goes through the existing rules:
`kanon/id-format`, `kanon/id-registered`, `kanon/id-counter`,
`kanon/ears-pattern`, `kanon/ears-shape`, `kanon/forbidden-word` and
`kanon/glossary-term`.

New rules:

| Rule                     | It reports                                                                                                                                                                     | Severity |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `kanon/change-shape`     | A folder under `changes/` whose name is not a change ID; a missing `proposal.md`, one with no front matter, or one whose `change` is not the folder name                       | error    |
| `kanon/delta-shape`      | A delta whose path is not the spec of a registered capability; a level-2 heading other than the three; a repeated section; a requirement outside a section; no `Reason:`       | error    |
| `kanon/delta-target`     | A MODIFIED or REMOVED of an ID that is not in that current spec. When the ID lives in another spec, the message names it                                                       | error    |
| `kanon/delta-added`      | An ADDED of an ID that is already an active requirement or a tombstone                                                                                                         | error    |
| `kanon/delta-duplicate`  | The same ID in two operations of the same change                                                                                                                               | error    |
| `kanon/delta-supersedes` | A `Supersedes:` naming an ID the same change does not remove                                                                                                                   | error    |
| `kanon/delta-conflict`   | The same ID under ADDED in two open changes; a MODIFIED or REMOVED of an ID that another open change removes                                                                   | error    |
| `kanon/delta-conflict`   | The same ID under MODIFIED in two open changes                                                                                                                                 | warning  |

- **A conflict is reported on both changes**, each finding naming the other
  folder: a script does not know which of the two must yield.
- **A change with no delta is not a lint error.** It is `sync` that refuses an
  empty change.
- Capacity warnings keep measuring the current specs only, not the projection
  after a change.

## 6. Ending a change

`kanon id next <CAP>` stays the only allocator. The author of an ADDED takes the
ID there, and the incremented counter travels in the same branch as the delta.

### 6.1 `kanon change sync <id>`

1. Refuses when the change is not under `changes/`, is already archived, or has
   no operation in any delta.
2. Validates with section 5. With an error it prints the findings and exits 1
   having written nothing. A warning does not stop it.
3. Computes the final text of every spec and every registry in memory, before
   touching the disk.
4. Writes the specs, the registries and `status: synced` in `proposal.md`, and
   last moves the folder to `changes/archive/<id>/`.
5. Prints one line per path written or moved. It never commits.

| Operation | Effect on the current spec                                                                          |
| --------- | --------------------------------------------------------------------------------------------------- |
| MODIFIED  | The block is replaced by the one in the delta, in the same position                                 |
| REMOVED   | The block leaves the spec; the ID joins `tombstones` in the registry of the capability of its prefix |
| ADDED     | The blocks go to the end of the spec, in the order of the delta                                     |

**A block** runs from the heading `### <ID>` to the line before the next heading
of any level, or to the end of the file, ignoring what is inside a code fence.
Prose written right under a requirement therefore belongs to it, and leaves with
it on a REMOVED or a MODIFIED. Everything outside the blocks stays byte for byte
as it was. Blocks are separated by one blank line and the file ends with one
newline.

**What "atomic" means here.** Nothing is written before everything is computed
and validated, so a validation error never leaves half a sync. A disk failure in
the middle of the writes can; the recovery is `git`, and the folder is moved
last so that an interrupted sync still shows as an open change.

### 6.2 `kanon change drop <id>`

1. Refuses when the change is not open.
2. Does not validate the delta: an abandoned change may well be broken.
3. Writes as a tombstone every ID under ADDED that was really allocated: a valid
   format, a registered prefix and a number at or below the counter.
4. Skips, and says so, an ID that is already an active requirement or already a
   tombstone. Turning a live requirement into a tombstone would be `drop`
   corrupting the cumulative truth.
5. Writes `status: dropped` and moves the folder to `changes/archive/<id>/`. The
   current specs are not touched.

A change that died in a branch never merged needs no `drop`: the branch is
deleted, and the counter on the main branch never knew of it. That is how the
IDs of an abandoned change become available again without the counter ever
going back.

## 7. Command line and session

| Command                    | Does                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kanon change open <slug>` | Creates `changes/<date>-<slug>/proposal.md` from a template and prints the ID. Refuses a slug that is not lowercase kebab-case and an ID that already exists, open or archived |
| `kanon change sync <id>`   | Section 6.1                                                                                                                                                                    |
| `kanon change drop <id>`   | Section 6.2                                                                                                                                                                    |
| `kanon status`             | Lists the open changes: the ID, the count of ADDED, MODIFIED and REMOVED per capability, and how many errors and warnings the validator sees in each                           |
| `kanon lint`               | Also covers the open changes (section 5)                                                                                                                                       |

- Exit codes are today's: 0 done, 1 refused or an error found, 2 could not run.
  `kanon status` is a view: it exits 0 even when a change has errors, and 2 only
  when it could not run.
- The date comes from the local clock. An environment variable fixes it for the
  tests, in the mould of the existing `KANON_REPO_ROOT`.

Session commands, both thin, in the mould of the first slice:

- `/kanon:change` with `open`, `sync` and `drop`. On `open` it proposes a slug
  from the description and confirms before creating. On `drop` it asks first,
  because a tombstone has no way back. It shows the command line's output as it
  came and never commits.
- `/kanon:status` runs `kanon status` and shows its output as it came.
- The text of `/kanon:ears-lint` says the lint now covers open changes.
  `/kanon:capability next <CAP>` stays the way to get an ID until 2c.

What the plugin ships stays free of this repository's IDs and spec sections.

## 8. Modules

| File                                                                | Role                                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/specs/parse.ts` (changed)                                      | A requirement also records the last line of its block                                        |
| `src/core/paths.ts` (changed)                                       | The `changes/` and `changes/archive/` paths                                                  |
| `src/changes/change.ts`                                             | The change ID format, finding open and archived changes, reading `proposal.md`               |
| `src/changes/delta.ts`                                              | Reads a delta into sections and operations, with their lines                                 |
| `src/changes/apply.ts`                                              | A pure function: the text of a spec and the operations give the new text and the tombstones  |
| `src/checks/delta.ts`                                               | The new rules of section 5                                                                   |
| `src/cli/change.ts`, `src/cli/status.ts`                            | Orchestrate reading, validating and writing                                                  |
| `src/cli/lint.ts`, `src/cli/index.ts` (changed)                     | Bring the open changes into the lint; route the new commands and extend the usage text       |
| `templates/proposal.md`, `commands/change.md`, `commands/status.md` | What ships to the project                                                                    |

`apply.ts` touches no disk. That is what lets the validator and `sync` share one
computation, and what lets the merge be tested without a file system. No new
dependency comes in: the plugin keeps running on the host's Node as copied.

## 9. Rules to write first

Two commits, as in the first slice: the requirements alone, then the code. The
requirements are written as `draft` through the requirements flow, take the next
free numbers of the repository's single ID space, and are promoted by the human
owner.

Business rules:

1. A change has an ID `YYYY-MM-DD-<slug>`, a folder of its own, and a state that
   is where the folder is.
2. A delta mirrors the path of the spec it changes and has only the sections
   ADDED, MODIFIED and REMOVED.
3. A MODIFIED and a REMOVED name a requirement that is in that current spec; a
   REMOVED says why.
4. An ADDED reuses neither an active ID nor a tombstone, and an ID appears in
   one operation of a change.
5. A `Supersedes` names a requirement the same change removes.
6. Two open changes do not add the same ID, and none touches a requirement
   another one removes; two that modify the same requirement are warned.
7. A delta is merged by requirement block, and everything outside the blocks is
   kept as it was.
8. The IDs a dropped change allocated become tombstones, and a live requirement
   never does.

Functional requirements: `kanon change open`; `kanon change sync`;
`kanon change drop`; `kanon status`; `kanon lint` covering open changes; the two
session commands.

`RNF-0007` and `RNF-0008` already cover 2a unchanged. `RF-0018` and `RN-0045`
say today that change folders and the IDs of an abandoned change belong to "a
later slice"; how the new rules relate to them, and whether either is revised,
is decided in the requirements flow, not here. `RF-0024` stays as it is until 2c
takes allocation over.

## 10. Documents that travel with the code

- `plugins/kanon/.ownership.yml`: `plugin/src/changes/**` joins the watch whose
  owning doc is `docs/requirements/rules.md`.
- `plugins/kanon/CHANGELOG.md`: an entry for the new commands, the new lint
  rules and the lint's wider reach.
- `plugins/kanon/README.md`: the status section, the commands, the layout with
  `changes/`, a section on a change and its delta, and the new rows of the lint
  table. Both are for an outside reader and carry no artifact ID.

## 11. Testing

Tests come before the implementation, and each one cites the ID of the rule it
covers.

- `test/changes/delta.test.ts`: the delta parser — sections, operations, lines,
  code fences.
- `test/changes/apply.test.ts`: the pure merge — each operation, the order of
  ADDED, a MODIFIED in place, and the bytes outside the blocks kept.
- `test/cli/change.test.ts`: `open`, `sync` and `drop` end to end over a
  temporary project, with the existing helpers; a refused sync writes nothing;
  `drop` skips a live requirement.
- `test/cli/lint.test.ts` (extended): each new rule, including a conflict
  between two open changes reported on both.
- The existing distribution tests already reach the new commands and template.

Done when `../../spur check` passes from `plugins/kanon/`.
