---
name: release-historian
description: >
  Use when something changes for whoever consumes this software — endpoint,
  command-line option, output format, observable behavior —, when it is time to
  publish a version, when someone asks "what changed in version X?", "does this
  break whoever already uses it?", "when will this be removed?", "how do I
  migrate?", "does this need a CHANGELOG entry?", or when CI complains that the
  entry is missing. Also when announcing or concluding a deprecation, and when
  writing the migration guide for a compatibility-breaking change.
---

# release-historian — owner of the historical trail

## Overview

Four artifacts, one audience: whoever is on the outside. `CHANGELOG.md` says
what changed, the release note gives the frame of a version,
`docs/deprecations.md` warns what is going away, and `docs/migrations/` teaches
how to cross over.

The expensive mistake here has a name: deriving the CHANGELOG from `git log`.
The result is the document that narrates the code, and it rots fast, because
nobody on the outside can use it to decide whether to upgrade.

The paths come from `.ownership.yml`; do not assume them. The `watches` rule
marked `consumer-visible: true` says what is consumer-visible in this project
and where the entry lives.

## What you own

| Artifact               | What it is                          | Shape                                                            |
| ---------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `CHANGELOG.md`         | What changed, for whoever consumes  | Single file, Keep a Changelog, `Unreleased` at the top           |
| `docs/releases/`       | The frame of each published version | One file per version, `REL-nnnn`, frozen once published          |
| `docs/deprecations.md` | What was announced for removal      | Single file, table, mutable                                      |
| `docs/migrations/`     | How to cross each break             | One file per migration                                           |

The seeds are in `templates/changelog.md`, `templates/release-note.md`,
`templates/deprecations.md` and `templates/migration.md`. Do not reproduce their
content here.

## When to use / when not to

**Use** when the diff touches a path of a `watches` rule with
`consumer-visible: true`; when a version is going to be published; when
something published is announced for removal; when a change breaks
compatibility.

**Do not use** to record an internal change. Refactoring, file renames, a new
test and a message tweak get no entry — the way out there is the
`Changelog: none — <reason>` label, and the reason is mandatory.

**The cost of using it needlessly** is the entry nobody can read: a CHANGELOG
with thirty lines of internal detail hides the one line that mattered, and the
consumer stops reading. `ownership/consumer-change-logged` enforces that the
entry exists; that it is readable is human.

## Procedure

1. **Find out what is consumer-visible in this project.** Read the `watches`
   rules with `consumer-visible: true` in `.ownership.yml`. If there are none,
   the project has not declared the boundary yet: that is the first
   conversation, and it is a human one.
2. **Write the entry in the PR that causes the change**, under
   `## [Unreleased]`, in the right subsection (`Added`, `Changed`,
   `Deprecated`, `Removed`, `Fixed`, `Security`). One sentence, from the point
   of view of whoever uses it.
3. **Apply the single test:** if the entry only makes sense to whoever wrote the
   code, delete it and use `Changelog: none — <reason>` in the commit message.
4. **A deprecation requires four things** — announcement date, removal version
   or date, replacement, link to the migration guide. If any is missing,
   **stop** and bring up the gap: do not record a half deprecation.
5. **A migration guide per compatibility-breaking change**, in
   `docs/migrations/`. The guide says, in running text, why the break was
   decided — without the ADR's ID, because whoever reads it is on the outside —
   and the commit that creates the guide cites the ADR. A break with no ADR is
   a decision with no why — the way is `/adr` first.
6. **The release note is derived from the CHANGELOG**, not written anew: move
   the entries from `Unreleased` to the version's section, and write only the
   frame.
7. **It is born `draft`.** Publishing is a human act —
   `living-docs/state-promotion` intercepts, and the answer is not yours. After
   `published`, `living-docs/append-only` freezes the file.

## Boundaries

| Yours                                    | Not yours                                                            |
| ---------------------------------------- | -------------------------------------------------------------------- |
| The CHANGELOG entry and its subsection   | Deciding what is public (that is `contract-keeper`)                  |
| The release note and its freezing        | Promoting to `published` (that is human)                             |
| The deprecations table                   | The versioning policy (that is `contract-keeper`)                    |
| The migration guide                      | The ADR that decided the break (that is `decision-recorder`)         |
| Refusing an incomplete deprecation       | Blocking the change that has no entry (`ownership/consumer-change-logged` fails, you do not deny) |
| Pointing to `Changelog: none` as the way out | Writing the reason in place of whoever decided                   |

## Checklist

- [ ] The entry was born in the PR that caused the change, not afterwards — verification: `ownership/consumer-change-logged`.
- [ ] The doc marked `consumer-visible: true` traveled in the same diff — verification: `ownership/consumer-change-logged` (and `ownership/commit-guard` asks beforehand).
- [ ] The entry is readable by whoever consumes, and does not narrate the code — verification: human.
- [ ] When there is no entry, there is a `Changelog: none — <reason>` with a written reason — verification: `ownership/consumer-change-logged`.
- [ ] Every recorded deprecation has the four things — verification: human.
- [ ] Every compatibility break has a migration guide that says in running text why it was decided, and the commit that creates it cites the ADR — verification: human.
- [ ] No template comment survived filling in the release note or the migration guide — verification: human.
- [ ] No external document cites an artifact ID — verification: `living-docs/external-audience`.
- [ ] The release note was born `draft` and was promoted by a person — verification: `living-docs/state-promotion`.
- [ ] No published release note had its body edited — verification: `living-docs/append-only`.
- [ ] No new shortcut was left without a `TDR-nnnn` — verification: `living-docs/shortcut-debt` reminds; recording it is human.
