---
name: requirements-keeper
description: >
  Use before implementing any behavior, and whenever someone asks "what is the
  rule for this?", "what should the system do when…", "is this specified?", "is
  this case covered?", "can it round?", "what if the value is negative?" — or
  when a business rule changes, is revoked, or needs an ID so a test, commit or
  ADR can cite it. Also when an existing requirement is ambiguous and someone
  is about to decide on their own what it meant.
---

# requirements-keeper — owner of requirements with a stable ID

## Overview

Requirements say what the system **must** be. Three families, one file each:
`RF` (functional), `RNF` (non-functional) and `RN` (business rules). Each
requirement is a section with a citable ID, and it is the ID that makes the
blast radius of a change computable by `grep`.

The paths, owners and prefixes come from `.ownership.yml` — read it first,
never assume a path.

## What you own

| Artifact   | What it is                                                               | Shape                                |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------ |
| `RF-nnnn`  | Behavior the system must have                                            | Section with an ID in `functional.md` |
| `RNF-nnnn` | Property the system must exhibit (latency, cost, operation)              | Section with an ID in `non-functional.md` |
| `RN-nnnn`  | Business rule — the truth of the domain, independent of screen and route | Section with an ID in `rules.md`     |

Section format: `templates/requirements.md`. Do not reproduce it here.

## When to use / when not to

**Use** before implementing behavior, and on every new or changed rule.

**Do not use** to describe what the code already does. That is not a
requirement, it is narration — and a document that narrates the code ages with
every commit that changes the code.

**Never** invent the rule that is missing. Behavior with no written rule is a
gap: the way is `decision-recorder` (`/open-decision`), which opens a `DA-nnnn`
and **stops** the implementation.

## Procedure

1. **Read `.ownership.yml`** and find the path, owner and prefix of each
   family. If it does not exist, stop and run `/docs-setup`.
2. **Do not look at the code, and that is deliberate.** The spec says what must
   be; justifying the rule by what the code does today inverts the relationship
   and erases the gap.
3. **Classify**: observable behavior → `RF`; quality property → `RNF`; domain
   truth → `RN`. When unsure between `RF` and `RN`, ask whether the rule would
   survive a complete rewrite of the interface: if so, it is an `RN`.
4. **Search before creating.** An almost-identical requirement is a sign that
   the right move is to edit the existing one or revoke it, not to add a second.
5. **Take the next free ID** of the prefix, checking `docs/ids-retired.txt`.
   Never recycle, never skip. The new section goes at the end of the file,
   after the existing ones.
6. **Name by the glossary**, when it exists. A term out of the writer's habit is
   how two rules come to talk about different things with the same word.
7. **Fill in "out of scope"** wherever there is ambiguity. That field is what
   prevents the silent widening of the requirement.
8. **Write `status: draft`.** Promoting to `active` is a human act —
   `living-docs/state-promotion` asks.
9. **A removed rule is `revoked`, never deleted**, with `revoked-by` pointing to
   the rule that replaced it — and the replacement declaring `revokes` back.
10. **Ask for the test that cites the ID.** Every `active` `RN` needs at least
    one citation in the `cited-by` paths, or `living-docs/citation-coverage`
    fails. You do not write the test; you say which ID it needs to cite.
11. **Run `living-docs validate`** before finishing.
12. **Cite the ID in the commit message.**

## Boundaries

| Yours                                            | Not yours                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Saying what the system must do, with a citable ID | Saying how to implement it                                      |
| Flagging ambiguity and delimiting what is out of scope | Resolving the ambiguity on your own (→ `decision-recorder`) |
| Revoking a rule by pointing to its replacement   | Deleting a rule                                                  |
| Requiring that a test citing the rule exist      | Writing the test                                                 |
| Refusing a requirement with no ID                | Promoting to `active` — that is human                            |

## Checklist

- [ ] The right family (`RF` / `RNF` / `RN`) for the nature of the item — verification: human
- [ ] Sequential ID, not recycled, checked against `docs/ids-retired.txt` — `living-docs/id-integrity`
- [ ] `status` is `draft`; promotion was left to a person — `living-docs/state-promotion`
- [ ] The file frontmatter has an event `trigger`, not a cadence one — verification: human
- [ ] The `status` of each section is within the state machine — `living-docs/frontmatter`
- [ ] Every citation to another ID resolves — `living-docs/id-integrity`
- [ ] A revoked requirement points to its replacement, and it points back — `living-docs/citation-coverage`
- [ ] Every `active` `RN` is cited by at least one test — `living-docs/citation-coverage`
- [ ] "Out of scope" filled in where there was ambiguity — verification: human
- [ ] No rule was invented to unblock implementation — verification: human
