---
name: decision-recorder
description: >
  Use when someone asks "why was this done this way?", when you are about to
  make a decision that is costly to reverse (choosing a library, a data format,
  a module boundary, a protocol), when you run into a gap — behavior with no
  written rule, "I don't know what to do in this case", "is this documented?",
  "what is the rule for X?" — or when you deliberately accept a shortcut,
  hack, TODO or technical debt that someone will pay off later. Also to
  supersede an old decision that turned out to be wrong.
---

# decision-recorder — owner of ADRs, Open Decisions and the Debt Register

## Overview

Three artifacts, one single state machine:

```
gap found ──> DA-nnn (open)
                 │
                 └─ decided ──> ADR-nnn (draft ──human act──> accepted)
                                   │
                                   └─ accepts a deliberate loss ──> TDR-nnn
```

This skill decides **where a piece of knowledge lives** and **which ID it
gets**. It does not decide the merits: it lays out the alternatives and the
trade-off, writes `draft`/`open`, and stops.

The paths, owners and prefixes come from `.ownership.yml` — read it first,
never assume a path.

## What you own

| Artifact            | What it is                                             | Shape                                         |
| ------------------- | ------------------------------------------------------ | --------------------------------------------- |
| ADR                 | Why this and not that, and what is accepted as a loss  | One file per decision, numbered, append-only  |
| Open Decisions (DA) | What has **not** been decided yet                      | Single file, table, mutable                   |
| TDR                 | Debt taken on purpose, with a payment trigger          | One file per debt                             |

Templates: `templates/adr.md` and `templates/tdr.md`. Do not rewrite the format here.

## When to use / when not to

**Use** for: a decision that is costly to reverse; a gap that blocks
implementation; a deliberate shortcut.

**Do not use** for: a trivial decision that is cheap to reverse (the cost of an
ADR is real — it enters everyone's reading forever); recording what the code
already says; narrating an implementation. An ADR per variable-name choice is
exactly the "twenty four-hundred-line documents" that kills documentation.

**Never** use it to make the decision. That is not yours.

## Procedure

1. **Read `.ownership.yml`** and find the path, the owner and the prefix of
   each artifact. If the file does not exist, stop and run `/docs-setup`.
2. **Classify** what is in front of you:
   - what to do is known and it is expensive to reverse → **ADR**;
   - it is not known → **DA**, and **stop the implementation**;
   - it is known, and the worse option was chosen on purpose → **TDR**.
3. **Search before creating.** A `grep` for the topic in the existing
   artifacts. If an ADR about it already exists, the way is to supersede, not
   to write a second one.
4. **Take the next free ID** of the prefix, also checking `docs/ids-retired.txt`.
   Never recycle. Never skip.
5. **Write from the template.** In an ADR, demand of yourself the **alternatives
   considered** with the real reason for each discard, and the section **what we
   accept to lose** — an ADR with no declared negative consequence is
   propaganda.
6. **In a TDR, demand an observable payment trigger.** "When volume passes
   10k events/day" or "on the first PR that touches this module" pass. "When
   there is time" is not a trigger: refuse and ask for the condition.
   - **Every debt is born with the payment trigger in both forms:** the prose,
     under `## Payment trigger`, which explains the why; and `pay-when` in the
     frontmatter, with `pattern` (a regex in single quotes) and `paths` (where
     to look for it), which is what `living-docs/staleness` evaluates. If you
     cannot write the second, the trigger is not observable — and then the debt
     is not ready to be recorded. Do not invent a pattern that matches nothing
     just to make the check pass: that is the ticked box.
7. **Close both sides of the reference.** A resolved DA points to the ADR that
   closed it; the ADR points back in `relates-to`. Superseding fills
   `supersedes` in the new one and `superseded-by` in the old one.
8. **Before asking for acceptance of an important ADR or TDR**, consider running
   the `decision-adversary` agent on the proposal — it tries to refute with a
   fixed checklist, and the verdict helps decide whether an alternative
   considered or a consequence is missing before spending the acceptor's time.
9. **Stop at `draft`/`open`.** Say which decision is missing and whose it is. If
   you try to promote, `living-docs/state-promotion` will ask — and the answer
   is not yours.
10. **Run `living-docs validate`** before finishing.
11. **Cite the ID in the commit message.**

## Boundaries

| Yours                                                 | Not yours                            |
| ----------------------------------------------------- | ------------------------------------ |
| Recording why this and not that, and what is lost     | Making the decision                  |
| Turning a gap into a blocking item with an ID         | Implementing the missing rule        |
| Recording the debt with a payment trigger             | Paying the debt                      |
| Proposing to supersede a wrong ADR                    | Editing an accepted ADR              |
| Pointing to the template format                       | Duplicating the artifact's content here |

## Checklist

- [ ] The right artifact for the nature of the item (ADR / DA / TDR) — verification: human
- [ ] Complete frontmatter — `living-docs/frontmatter`
- [ ] The `trigger` names an event and not a cadence — verification: human
- [ ] Sequential ID, not recycled, checked against `docs/ids-retired.txt` — `living-docs/id-integrity`
- [ ] Every citation to another ID resolves — `living-docs/id-integrity`
- [ ] `status` is `draft` or `open`; promotion left to a person — `living-docs/state-promotion`
- [ ] No accepted ADR was edited; the path used was superseding — `living-docs/append-only`
- [ ] The ADR declares alternatives considered and what we accept to lose — verification: human
- [ ] The TDR has an observable payment trigger, not a vague date — verification: human
- [ ] The implementation did **not** move ahead while there was an open DA about it — verification: human
- [ ] For a weighty decision, `decision-adversary` was considered before asking for acceptance — verification: human
- [ ] Every `open` debt declares a verifiable `pay-when` — verification: `living-docs/staleness`.
- [ ] No template comment survived filling in the ADR or the TDR — verification: human
