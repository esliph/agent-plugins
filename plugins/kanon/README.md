# kanon

Spec-Driven Development in which EARS is the native format of acceptance
criteria. The requirement is the rule, and the test is the proof: every
requirement has a stable ID, is written in one of the six EARS patterns with
terms from a controlled glossary, and is checked by a script before a model is
asked anything.

It stands on its own: it is not an extension of Spec Kit, Kiro or OpenSpec, and
it needs no other plugin of this marketplace.

## Status

**Second slice, first part.** What exists today is the foundation — the
project's constitution, glossary and capabilities —, the deterministic lint, and
the spine of the change cycle: a change is a folder with its deltas, and three
commands open it, merge it into the current specs, or drop it. A delta is still
written by hand, each new requirement with an ID allocated by
`/kanon:capability next <CAP>`. Specifying a change with the model's help, and
tracing each requirement to its test, are not here yet.

## Install

```text
/plugin marketplace add esliph/agent-plugins
/plugin install kanon@esliph
```

Requires Node 24 or later on the machine, and nothing else: the commands run a
command line that ships inside the plugin and has no dependency to install.

## Commands

| Command               | What it does                                                                  |
| --------------------- | ----------------------------------------------------------------------------- |
| `/kanon:init`         | Creates the configuration, a constitution and a glossary. Overwrites nothing. |
| `/kanon:constitution` | Creates or evolves the principles the project does not negotiate.             |
| `/kanon:glossary`     | Records, unifies or bans a term of the controlled vocabulary.                 |
| `/kanon:capability`   | Registers or splits a capability, or allocates its next requirement ID.       |
| `/kanon:change`       | Opens a change, syncs its deltas into the current specs, or drops it.         |
| `/kanon:status`       | Lists the open changes, what each does to each capability, and its findings.  |
| `/kanon:ears-lint`    | Runs the lint over the specs and the open changes, as its findings came.      |
| `/kanon:ears-convert` | Turns free text into EARS criteria, marking what the text does not say.       |
| `/kanon:ears-explain` | Explains one EARS pattern with an example and its usual mistake.              |

Two skills are loaded when the work calls for them: writing acceptance criteria
in EARS, and keeping the glossary.

## What it keeps in your repository

```text
.kanon/
  config.yml              # paths, forbidden words, thresholds
  capabilities/
    CHK.md                # one file per capability: prefix, counter, removed IDs
specs/
  constitution.md
  glossary.md
  checkout/spec.md        # the current requirements of a capability
changes/
  2026-10-02-coupon-redemption/   # an open change
    proposal.md
    specs/
      checkout/spec.md            # the delta of specs/checkout/spec.md
  archive/                        # the changes that were synced or dropped
```

Everything is versioned text, readable without the plugin installed. A project
that already has a glossary or a constitution points kanon at it — `/kanon:init`
takes `--glossary <path>` and `--constitution <path>` — instead of getting a
second one. The glossary only has to be a Markdown table with a `Term` column; a
row whose `Status` column says `banned` is a term no criterion may use.

## A requirement

```markdown
### CHK-014 [Unwanted]

IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it and show "Coupon expired".
```

- **The ID** is a capability prefix and three digits, and never changes once it
  reaches the main branch. Each capability counts its own sequence and stops at
  999, which is when it has to be split. The ID of a removed requirement is
  never used again.
- **The pattern** in the heading is one of Ubiquitous, Event, State, Unwanted,
  Optional and Complex, and it is the one the sentence has.
- **The keywords** — `WHEN`, `WHILE`, `IF`, `THEN`, `WHERE`, `THE`, `SHALL` — are
  in uppercase English. Everything else is written in your project's language.
- **The system** after `THE` and every term marked as `[[term]]` must be in the
  glossary.

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

## The lint

`/kanon:ears-lint` checks the specs and every open change, reports one line per
finding — `file:line  rule  severity  message` — and decides nothing by judgment:

| Rule                     | It reports                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `kanon/id-format`        | An ID that is not a prefix, a hyphen and three digits from 001 to 999                                                 |
| `kanon/id-registered`    | An ID whose prefix is not a registered capability                                                                     |
| `kanon/id-unique`        | The same ID on two requirements                                                                                       |
| `kanon/id-tombstone`     | A requirement using the ID of a removed one                                                                           |
| `kanon/id-counter`       | An ID above the counter of its capability — typed by hand, or a badly resolved merge                                  |
| `kanon/ears-pattern`     | A criterion that follows none of the six patterns, or not the one its heading names                                   |
| `kanon/ears-shape`       | No system, more than one system, more than one trigger, or not exactly one `SHALL`                                    |
| `kanon/forbidden-word`   | A word from the project's forbidden list                                                                              |
| `kanon/glossary-term`    | A system or a marked term that is not in the glossary, or a banned term anywhere                                      |
| `kanon/change-shape`     | A folder under `changes/` not named by a change ID, or a proposal that is missing or names another change             |
| `kanon/delta-shape`      | A delta that mirrors no spec, a section other than the three, a requirement outside them, or a removal with no reason |
| `kanon/delta-target`     | A MODIFIED or a REMOVED of a requirement that is not in that spec                                                     |
| `kanon/delta-added`      | An ADDED using the ID of an existing requirement or of a removed one                                                  |
| `kanon/delta-duplicate`  | The same ID in two operations of one change                                                                           |
| `kanon/delta-supersedes` | A `Supersedes:` naming a requirement the same change does not remove                                                  |
| `kanon/delta-conflict`   | Two open changes that cannot both be synced; a warning when both modify one requirement                               |
| `kanon/capacity`         | A warning: a capability with many requirements, or near its last ID                                                   |

An error fails the run; a warning does not. The command line behind it exits 0
with no error, 1 with at least one, and 2 when it could not run.

The two warning thresholds — 150 active requirements and 900 on the counter —
are in `.kanon/config.yml`, together with the forbidden list, which starts empty
and is chosen for the language your criteria are written in.

## Working on kanon

From this directory, with the runner committed at the repository root:

```bash
../../spur install
../../spur check        # tests, type-check, lint
```
