---
title: Business rules
owner: '@esliph/engineering'
trigger: >
  Before implementing any behavior of this family, and on every new or changed
  rule.
last-reviewed: 2026-10-02
---

# Business rules

Each requirement is a section with a citable ID. The ID is never recycled, and it
is what makes the blast radius computable by `grep`. Format: `templates/requirements.md`.

The origin of these rules is `../research/2026-10-01-kanon-scope.md`. "Project"
below is the repository of whoever uses kanon, never this one.

## RN-0042 — A requirement ID is a capability prefix, a hyphen and exactly three digits

- **status:** active
- **out of scope:** the namespaces of other artifacts, such as stories; the number of digits, which is not configurable

A requirement ID has the form `<CAP>-<NNN>`: two to five uppercase ASCII letters,
a hyphen, and exactly three digits from `001` to `999`, with leading zeros.
`CHK-14`, `CHK-1000`, `CHK-000` and `chk-014` are not requirement IDs. The full
ID is written everywhere, including inside its own capability; the digits alone
never stand for a requirement.

## RN-0043 — A capability is registered once, in a file of its own, under a prefix unique in the project

- **status:** active
- **relates-to:** RN-0042
- **out of scope:** renaming a prefix, which never happens; moving a requirement between capabilities, which keeps its ID

Each capability has one registry file, `.kanon/capabilities/<CAP>.md`, whose
front matter holds the prefix, the name of the capability, the counter, the
tombstones and the split relations. The prefix is the file's name and is unique
in the project. The current requirements of the capability live in
`specs/<name>/spec.md`. One file per capability is what keeps changes in
different capabilities from contending for the same file. A requirement ID whose
prefix has no registry file is an error.

## RN-0044 — A requirement ID appears once in the current specs, and is never a tombstone

- **status:** active
- **relates-to:** RN-0042, RN-0043
- **out of scope:** IDs inside a change folder, which the delta validator of a later slice judges

Within the current specs, no two requirements carry the same ID, and no
requirement carries an ID listed as a tombstone in its capability's registry. A
requirement lives under the capability it is written in or under another one —
the prefix says where it was born — and it is still one requirement, one ID.

## RN-0045 — The counter of a capability only grows, and every ID in use is at or below it

- **status:** active
- **relates-to:** RN-0043
- **out of scope:** returning the IDs of an abandoned change to the sequence, and renumbering after a merge conflict — both in a later slice

A new ID is the counter plus one, and allocating it writes the new counter to
the registry. Tombstones consume the sequence: the counter never goes back when
a requirement is removed. A requirement or a tombstone whose number is above the
counter of its capability is an error — it is how a counter edited by hand or a
badly resolved merge is noticed.

## RN-0046 — A capability stops at 999, and warns twice before

- **status:** active
- **relates-to:** RN-0045
- **out of scope:** how a capability is split, which is `RF-0020`

A capability with 150 or more active requirements gets a design warning that
suggests splitting it. A capability whose counter is at 900 or more gets a
capacity warning that says the split is about to become mandatory. At 999 no ID
is allocated, and the refusal says to split the capability. The two warning
thresholds are defaults the project may change in its configuration; 999 is not
configurable. A warning never fails a run.

## RN-0047 — An acceptance criterion follows one of the six EARS patterns, with the keywords in English

- **status:** active
- **relates-to:** DA-0010
- **out of scope:** whether the criterion is complete, unambiguous or free of implementation detail — judgments left to a reader; the language of the body, which is the project's

A criterion is one sentence in one of these shapes, with the keywords written in
uppercase English and everything else in the project's language:

- Ubiquitous: `THE <system> SHALL <response>`
- Event: `WHEN <trigger>, THE <system> SHALL <response>`
- State: `WHILE <state>, THE <system> SHALL <response>`
- Unwanted: `IF <condition>, THEN THE <system> SHALL <response>`
- Optional: `WHERE <feature>, THE <system> SHALL <response>`
- Complex: more than one of the clauses above before the system, in the order
  `WHERE`, `WHILE`, then `WHEN` or `IF … THEN`

In the current specs a requirement is a heading `### <ID> [<Pattern>]` followed
by its criterion. The pattern named in the heading is the one the sentence has.

## RN-0048 — A criterion names one system, has at most one trigger and exactly one response

- **status:** active
- **relates-to:** RN-0047
- **out of scope:** whether the response is one behavior or several joined by a conjunction in the body — the lint counts keywords, not meanings

A criterion has exactly one `SHALL`, with a non-empty response after it; "SHALL …
and SHALL …" is two requirements written as one. It names exactly one system
before the `SHALL`. It has at most one `WHEN` and at most one `IF`, and never
both: an unwanted condition is written with `IF … THEN`, not as a second
trigger.

## RN-0049 — A criterion uses no word from the project's forbidden list

- **status:** active
- **relates-to:** DA-0011
- **out of scope:** vagueness the list does not name, which is left to a reader

The configuration holds a list of forbidden words and phrases. One of them
appearing in a criterion, as a whole word and in any letter case, is an error.
The list belongs to the project. The command line writes it empty and never
fills it: the words are chosen in the session, in the language the project
writes its criteria in.

## RN-0050 — The system name and every marked term of a criterion are in the glossary

- **status:** active
- **relates-to:** RN-0051
- **out of scope:** a domain term that is neither marked nor banned — telling it from an ordinary word is not something a script decides

A term is marked in a criterion by writing it as `[[term]]`. Every marked term,
and the system name before the `SHALL`, must be a term of the glossary that is
not banned. A banned glossary term appearing anywhere in a criterion, marked or
not, is an error that points to its row in the glossary. Terms are compared as
whole words, in any letter case.

## RN-0051 — The glossary and the constitution are read where the configuration points

- **status:** active
- **out of scope:** the content of the constitution, which no script reads in this slice; who keeps a glossary that another tool already owns

The configuration names the path of the glossary and the path of the
constitution; by default, `specs/glossary.md` and `specs/constitution.md`. A
project that already has either one points to it, and kanon never creates a
second. The glossary kanon reads is a Markdown table with a `Term` column; a row
whose `Status` column says `banned` is a banned term. Every other column is
opaque to kanon.

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
