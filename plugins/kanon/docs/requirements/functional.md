---
title: Functional requirements
owner: '@esliph/engineering'
trigger: >
  Before implementing any behavior of this family, and on every new or changed
  rule.
last-reviewed: 2026-10-02
---

# Functional requirements

Each requirement is a section with a citable ID. Format: `templates/requirements.md`.

## RF-0018 — `kanon lint` reports what the current specs break, by file and line

- **status:** active
- **relates-to:** RN-0042, RN-0043, RN-0044, RN-0045, RN-0046, RN-0047, RN-0048, RN-0049, RN-0050
- **out of scope:** change folders, traceability and the criteria budget, which belong to a later slice; fixing anything — the command only reports

`kanon lint` checks every `specs/**/spec.md` and every capability registry of
the project; given paths, it checks only those specs. Each finding names the
file, the line, the rule it breaks and whether it is an error or a warning. The
command exits 0 when there is no error, 1 when there is at least one, and 2 when
it could not run — no configuration, or a configuration or registry that does not
parse.

## RF-0019 — `kanon id next <CAP>` allocates the next requirement ID of a capability

- **status:** active
- **relates-to:** RN-0045, RN-0046
- **out of scope:** allocating more than one ID per call; writing the requirement itself

The command prints the allocated ID and writes the new counter to the
capability's registry. It allocates nothing, and says why, when the prefix is not
registered or the counter is at 999. From 900 on, it allocates and warns.

## RF-0020 — `kanon capability add` registers a capability, and records a split when told its origin

- **status:** active
- **relates-to:** RN-0043, RN-0046
- **out of scope:** moving existing requirements to the new capability — they keep their IDs and stay where they are until someone moves them

`kanon capability add <CAP> <name>` creates the registry file with the counter
at zero and an empty `specs/<name>/spec.md`. It refuses a prefix that is not two
to five uppercase letters, a prefix already registered and a name already in
use. With `--split-from <CAP>`, it also records the relation in both registries:
the new capability takes the new requirements, and the origin keeps its own.

## RF-0021 — `kanon init` creates the foundation and overwrites nothing

- **status:** active
- **relates-to:** RN-0051
- **out of scope:** registering the first capability; any file outside `.kanon/` and `specs/` — the agent context files of the project are never written by the command line

`kanon init` writes `.kanon/config.yml`, a short constitution whose first
article says every criterion follows EARS and uses glossary terms, and a seed
glossary. Given `--glossary <path>` or `--constitution <path>`, it records that
path in the configuration and does not create that file. A file that already
exists is left as it is and reported as kept.

## RF-0022 — The foundation commands of the session leave the deciding to the command line and the judging to the person

- **status:** active
- **relates-to:** RF-0019, RF-0020, RF-0021
- **out of scope:** the commands of the change cycle, which belong to a later slice

`/kanon:init` runs `kanon init` and then offers — never forces — one short
pointer line for the project's `CLAUDE.md` or `AGENTS.md`, appended only on a
yes. `/kanon:constitution` and `/kanon:glossary` create and evolve those two
documents at the paths the configuration names, asking before changing a
principle or banning a term. `/kanon:capability` registers or splits a capability
through `kanon capability add`, never by writing the registry by hand.

## RF-0023 — The EARS utilities lint, convert and explain without writing to the specs

- **status:** active
- **relates-to:** RF-0018, RN-0047
- **out of scope:** allocating IDs and saving a converted criterion, which the change cycle of a later slice does

`/kanon:ears-lint` runs `kanon lint` and shows its findings as they came, without
softening or rewording them. `/kanon:ears-convert` turns free text into EARS
criteria, checks its own output against the lint rules, and marks with
`[NEEDS CLARIFICATION]` what the text does not say instead of inventing it.
`/kanon:ears-explain` explains one EARS pattern with an example and the mistake
most often made with it.

## RF-0024 — `/kanon:capability` allocates the next ID of a registered capability

- **status:** draft
- **relates-to:** RF-0019, RF-0022, DA-0013
- **out of scope:** writing the requirement that gets the ID; allocation by the change cycle of a later slice, which takes this over when it exists

Asked for the next ID of a capability, `/kanon:capability` runs
`kanon id next <CAP>` and gives back the ID it printed, with its warning or its
refusal as they came. An ID is never typed from memory or read off the last
requirement of a spec: the counter is the only source of one.

## RF-0025 — `kanon change open <slug>` opens a change under the date of the day

- **status:** active
- **relates-to:** RN-0052
- **out of scope:** writing the delta, which is done by hand until a later slice; committing

The command creates `changes/<date>-<slug>/proposal.md` from a template and
prints the ID of the change. It refuses a slug that is not lowercase kebab-case,
and an ID that already exists, open or archived. The date is the local date; an
environment variable fixes it for a run that must not depend on the clock.

## RF-0026 — `kanon change sync <id>` applies the deltas of a change and archives it, in one step

- **status:** active
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

- **status:** active
- **relates-to:** RN-0059
- **out of scope:** validating the delta — an abandoned change may well be broken; committing

The command refuses a change that is not open. It writes the tombstones
`RN-0059` asks for, says which IDs it skipped, writes `status: dropped` in the
proposal and moves the folder to `changes/archive/<id>/`.

## RF-0028 — `kanon status` lists the open changes

- **status:** active
- **relates-to:** RN-0052, RF-0029
- **out of scope:** the findings themselves, which `kanon lint` prints; archived changes; the traceability view of a later slice

For each open change the command prints its ID, the count of ADDED, MODIFIED and
REMOVED per capability, and how many errors and warnings the validator sees in
it. It is a view: it writes nothing, exits 0 even when a change has errors, and
exits 2 only when it could not run.

## RF-0029 — `kanon lint` also checks the open changes

- **status:** active
- **relates-to:** RF-0018, RN-0052, RN-0053, RN-0054, RN-0055, RN-0056, RN-0057
- **out of scope:** archived changes, which are never checked; a change with no delta, which is not an error; the projection of the specs after a change — the capacity warnings keep measuring the current specs

With no argument, `kanon lint` also checks every open change under `changes/`,
and never `changes/archive/`. Given paths, a path under `changes/` is read as a
delta. A finding in a change has the format of every other finding, and an
error in a change fails the run.

## RF-0030 — The change commands of the session run the command line and show its output as it came

- **status:** active
- **relates-to:** RF-0022, RF-0024, RF-0025, RF-0026, RF-0027, RF-0028
- **out of scope:** writing the delta with the model's help, which belongs to a later slice; committing, which the session never does

`/kanon:change open` proposes a slug from the description and confirms it before
creating anything. `/kanon:change sync` and `/kanon:change drop` run the command
line; `drop` asks first, because a tombstone has no way back. `/kanon:status`
runs `kanon status`. Each shows the output of the command line as it came and
never commits. The lint command of the session says the lint covers the open
changes.
