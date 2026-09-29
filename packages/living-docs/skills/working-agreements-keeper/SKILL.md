---
name: working-agreements-keeper
description: >
  Use when an agent or a person went wrong for lack of context — "nobody told
  me it was like this", "that wasn't written down anywhere", "I thought I could
  just run it", "how do you do this here?", "when is this done?" — and whenever
  the work process changes: a new command, a new mandatory step, a commit rule,
  a policy about what an agent may or may not do alone. Also when the agent
  contract (CLAUDE.md/AGENTS.md) is repeating content that belongs to another
  document.
---

# working-agreements-keeper — owner of how we work here

## Overview

Three artifacts answer "how do we work in this repository": `CONTRIBUTING.md`
(the process), `docs/definition-of-done.md` (when it is finished) and the agent
contract (`CLAUDE.md` or `AGENTS.md` — index and policy).

The second trigger of this skill is the best in the catalog: **every time
someone goes wrong for lack of context**, a line is missing in one of these
three. That is what makes the document self-correcting instead of decorative.

Paths and owners come from `.ownership.yml` and from `CODEOWNERS`; do not
assume them.

## What you own

| Artifact                     | What it is                                                         |
| ---------------------------- | ------------------------------------------------------------------ |
| `CONTRIBUTING.md`            | The process: environment, cycle, language, where the truth lives   |
| `docs/definition-of-done.md` | The list of what must be done, with the verification of each item  |
| `CLAUDE.md` / `AGENTS.md`    | Agent contract: index and policy, never content                    |

The seeds are in `templates/contributing.md`,
`templates/definition-of-done.md` and `templates/agent-contract.md`. Do not
reproduce their content here.

## When to use / when not to

**Use** when the process changes, and when an error from lack of context
happens — the fix is a new line, and it takes one of two forms: _where the
truth is_ or _what to never do_.

**Do not use** to record a business rule (that is `requirements-keeper`), a
technical decision (that is `decision-recorder`) or what the linter already
catches — tool configuration is not a document.

**The cost of using it needlessly:** every line added is read in every
session. A list that grows without end is read by nobody, and "if nobody reads
it, it is not alive".

## Procedure

1. **Read `.ownership.yml`** and confirm which of the three artifacts exist and
   where. If none exists, run `/docs-setup` with the `small-team` stage.
2. **Classify what you have in hand**: process → `CONTRIBUTING.md`; done
   condition → Definition of Done; policy or index for the agent → agent
   contract.
3. **Look for the line that already covers this.** A repeated error is usually
   an existing line badly placed, not a missing line.
4. **Write a line, not a paragraph.** Form: _where the truth is_ ("the rule for
   X lives in `docs/requirements/rules.md`") or _what to never do_ ("never
   promote a decision without human review").
5. **A new DoD item names its verification**: a `CI-n`, an `HK-n`, or
   explicitly the marker `human`. An item with no verification does not go in.
6. **In the agent contract, link — do not copy.** If the sentence you were about
   to write is a factual claim, it belongs to the owning artifact; what stays
   here is the link.
7. **If the process change altered the code→doc link**, update `watches` in
   `.ownership.yml`: it is what `ownership/watch-reminder` and
   `ownership/commit-guard` read.
8. **The agent contract does not repeat text from an owning artifact, and that is
   now verified.** `living-docs/agent-contract-duplication` compares sentence by
   sentence (a floor of twelve words) against the artifacts that have an owning
   skill. When it flags something, the fix is to delete the sentence and leave
   the pointer — never touch the threshold.
9. **A new document is declared in both places:** `documents:` in
   `.ownership.yml` (with the owning skill, and the `role` when it is the agent
   contract or the Definition of Done) and a line in CODEOWNERS.
10. **The seed is not content.** On the first write over what `init` seeded,
    whatever is not true in this project goes — deleting what is left is part of
    the work.

## Boundaries

| Yours                                                | Not yours                                           |
| ---------------------------------------------------- | --------------------------------------------------- |
| How we work, and when something is finished          | The business rule that CONTRIBUTING references      |
| Turning an error from lack of context into a new line | Duplicating the content of another artifact        |
| The policy on what an agent may do alone             | Accepting the decision itself (a human act, `living-docs/state-promotion`) |
| The DoD item and the verification that covers it     | Writing the check that verifies (that is `CI-n`, in the engine) |

## Checklist

- [ ] Each factual claim in the agent contract is a link to the owning artifact, not a copy — verification: human; `living-docs/agent-contract-duplication` catches the word-for-word copy.
- [ ] Every new DoD item names what verifies it: the identifier of a check or a hook, or the marker `human` — verification: human.
- [ ] The watched path the change created is in `watches`, with an owning doc — verification: `ownership/watch-reminder` and `ownership/commit-guard`.
- [ ] None of the three artifacts gained content that belongs in `docs/requirements/` or `docs/decisions/` — verification: human.
- [ ] The `trigger` of the changed artifact still names an event, not a cadence — verification: human.
- [ ] The change came from an observed error or a real process change, not from a wish to document — verification: human.
- [ ] `last-reviewed` was updated only on the files that really changed — verification: human (a mass bump switches review off while pretending to perform it).
- [ ] No sentence in the agent contract repeats an owning artifact — verification: `living-docs/agent-contract-duplication`.
- [ ] Each new Definition of Done item names what verifies it — verification: `living-docs/done-verifiable`.
