---
title: Business rules
owner: '@esliph/engineering'
trigger: >
  Before implementing any behavior of this family, and on every new or changed
  rule.
last-reviewed: 2026-09-18
---

# Business rules

Each requirement is a section with a citable ID. The ID is never recycled, and it
is what makes the blast radius computable by `grep`. Format: `templates/requirements.md`.

## RN-0001 — Every artifact has exactly one declared owner

- **status:** active
- **relates-to:** ADR-0002
- **out of scope:** who reviews the artifact; this is about ownership, not review

A living-documentation artifact belongs to one and only one owner, declared in
`.ownership.yml`, at the repository root, and mirrored in CODEOWNERS. Two owners for the same path
is guaranteed divergence; zero owners makes the artifact an orphan and not enforceable.

## RN-0002 — `trigger` names an observable event, never a cadence

- **status:** active
- **out of scope:** the wording of the trigger; what is required is its nature. No check judges the wording: the check only requires `trigger` to be present and non-empty, and the nature of the event is judged by the agent and the reviewer

The `trigger` field declares **when** the artifact must be updated, and the answer
is always an event someone can observe happening. A calendar date
("quarterly", "every sprint") describes an intention to review, not a need to
change — and it is what turns a document into a ritual.

## RN-0021 — A watched path without an owning doc fails in CI, and the way out is the written reason

- **status:** active
- **relates-to:** RN-0008, RN-0009, ADR-0010
- **out of scope:** the moment of the commit, where the enforcement asks instead of failing (`RN-0009`)

In CI, a diff that touches a watched path without the owning doc fails. The only
way out is a written reason in some commit message of the range, in the form
`Docs: none — <reason>`. A label with no reason is not an exception: it is the
ticked box.

This neither loosens nor contradicts `RN-0009`: there the enforcer is a hook, at
the moment there is a person to answer the question; here there is no person at
all, and the cost of silence is out-of-date documentation passing with the
authority of a green CI.

## RN-0032 — The v2 ownership file is strict: one `owned` list, a block per plugin, reading separated from policy

- **status:** draft
- **relates-to:** ADR-0020
- **out of scope:** the command to migrate from v1 to v2, and the content of the blocks each plugin declares under its own name

A valid ownership file declares `version` in every instance and, at the root, the
`plugins:` list with the name of every top-level block that is not the core's. A
top-level block whose name is not in `plugins:` is an error. Inside an `owned`
entry, the keys that say how the parser finds the item inside the file
(`collection`, `key`, `state-field`) are only read from inside a `format:` block —
never at the same level as the policy keys.

## RN-0033 — The identity of an item is a key opaque to the core

- **status:** draft
- **relates-to:** ADR-0021
- **out of scope:** ID shape, prefix, sequence and retirement — which remain plugin policy, the owning plugin's, not the core's

The core guarantees only that an item's key is not empty and is unique within the
file that declares it, and uses that key to pair the item before and after a
change. It never validates the shape of the key. `state-field`, when declared,
names where the item's state lives; when absent, the default is `status`,
case-insensitive.

## RN-0034 — The paths governed by all the ownership files of a repository are disjoint

- **status:** draft
- **relates-to:** ADR-0023
- **out of scope:** what `include:` grants in authority — nothing, by decision; and the pruning of files outside the base in a hook, which is an optimization and not a coverage rule

Resolved against their own bases, the `owned[].path` of all the ownership files of
a repository form a disjoint set: none equals another, and none is a directory
prefix of another. A collision is an error that names the two files and the path,
whether it occurs inside a file, between sibling files or between a file and
another that includes it.

## RN-0035 — Resolving the root ownership file never chooses between ambiguous candidates

- **status:** draft
- **relates-to:** ADR-0024
- **out of scope:** the resolution of included files, which are not candidates and follow the composition rule (RN-0034)

The root ownership file is found by candidate order — explicit,
`./.ownership.yml`, `./docs/.ownership.yml` —, and the absence of any candidate is
valid silence. Finding more than one candidate at the same time is an error that
names both; the system never picks one on its own.

## RN-0036 — The doc→doc trigger requires a type declared in ownership and an instance declared in the document

- **status:** draft
- **relates-to:** ADR-0022, RN-0008, RN-0009
- **out of scope:** the code→doc trigger (`watches`), which RN-0008 and RN-0009 already cover

A document is only reminded as derived from another when the ownership file
declares the type of the derivation (`derives-from: source, field`) and the
instance declares, in its own frontmatter, the exact target through the named
field. A derivation without both halves generates no reminder.

## RN-0037 — Owner coverage reaches the whole repository, and only `ignore` removes a path from it

- **status:** draft
- **relates-to:** ADR-0020, RN-0016, RN-0021
- **out of scope:** what `generated[].path` counts as covered on its own, without entering `owned` — it already satisfies coverage by being generated

Every path in the repository has an owner entry that covers it, except what an
`ignore:` entry explicitly removes from coverage. A path with no owner and no
`ignore` fails.

## RN-0038 — No check depends on the language of a document's prose

- **status:** active
- **relates-to:** ADR-0032, ADR-0034
- **out of scope:** the machine vocabulary a check reads — frontmatter keys, state names, IDs, the fixed markers `human` and `Docs: none —` — which is structure and is the same in every language

A check reads the structure of a document — frontmatter, IDs, table columns
through `field-map`, fixed markers — and never its headings or prose. A corpus
written entirely in another language produces exactly the findings the same
corpus would produce in English.
