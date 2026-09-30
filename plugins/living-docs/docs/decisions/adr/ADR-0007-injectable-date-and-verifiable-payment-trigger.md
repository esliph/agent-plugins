---
id: ADR-0007
title: The toolkit's date source, and how a payment trigger becomes verifiable
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-27
relates-to: [TDR-0001, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0007 — The toolkit's date source, and how a payment trigger becomes verifiable

## Context

Phase 7 delivers `CI-4`: "`last-reviewed` past `stale-after-months` (warning);
TDR with an overdue payment trigger (failure)" (spec §9). Both halves ask for
something the toolkit does not have.

The first asks for **today**. No check so far needed to know the date: `CI-1`
validates it as a format, and nothing else. A check that reads the clock inside
itself is a check whose test passes today and fails in six months, and whose
failure says nothing about the code.

The second asks for a **payment trigger that a machine can evaluate**. Spec §5
(`SK-3`, rule 5) already demands that it be observable — "when volume passes X",
"on the first PR that touches this module" —, but demands it of whoever writes,
in prose. Prose is not evaluated. Today `TDR-0001` says "on the first PR that
revokes a requirement", and no tool can decide whether that happened. Without a
verifiable form, acceptance criterion 7 of spec §12 does not close: there is no
way to "fail until the debt is paid".

## Alternatives considered

**For the date:**

1. **`new Date()` inside the check.** Discarded. The test would have two
   outcomes: either it freezes the process clock — and `node --test` has no such
   feature without a new dependency, which `ADR-0001` does not want —, or it
   passes today and breaks in the future, which is the same as not testing.
2. **A reference date in `.ownership.yml`.** Discarded. It is a calendar cadence
   inside the configuration file: someone would bump it to silence the check,
   which is the anti-requirement of spec §13 moved elsewhere.
3. **`CheckContext.today`, filled in by the caller.** Chosen.

**For the trigger:**

1. **Prose only, as today.** Discarded: not verifiable, and criterion 7 asks for
   failure, not careful reading.
2. **A due date (`due: 2027-01-01`).** Discarded for two reasons. It is the
   calendar cadence that spec §13 refuses; and it is false: debt does not expire
   on the calendar, it expires when the condition that made it acceptable stops
   holding.
3. **A glob of paths evaluated on the diff (`pay-when-paths`).** Discarded as the
   only form. The trigger of `TDR-0001` is a **state** ("a revoked requirement
   exists"), not a path touched; a trigger that only knows how to look at the
   diff forgets the condition on the next PR, and the debt becomes invisible
   again.
4. **Pattern + paths, evaluated on the state of the tree.** Chosen: it covers the
   state, and covers "the PR that touches this module" from the side that
   survives the merge — what was left written in the tree.

## Decision

**The date comes in by value, and the payment trigger has a machine form in
addition to the prose.**

1. `src/core/dates.ts` is the toolkit's only date source: `todayIso()`,
   `asIsoDate()` and `monthsBetween()`. Whoever calls the clock is the CLI and
   the hook, once, at the edge.
2. `CheckContext.today` carries today in ISO (`YYYY-MM-DD`). No check reads the
   clock.
3. A debt declares, in the frontmatter:

   ```yaml
   pay-when:
     pattern: '^- \*\*status:\*\* revoked'
     paths: ['docs/requirements/**']
   ```

   `pattern` is a regular expression matched **line by line** in the files that
   match `paths`, and goes in **single quotes**: in YAML, single quotes do not
   process `\`, and a pattern in double quotes would require escaping each
   backslash twice — which is how the wrong pattern gets written without anyone
   noticing. The debt's own file is excluded from the scan: a TDR that quotes its
   own trigger is not an occurrence of it.

4. **A debt family is one that declares `paid` in the state machine** (spec §4),
   not the `TDR` prefix. A project that names its family something else is still
   covered, because what answers is `states`, not the name.
5. An `open` debt without a verifiable `pay-when` — absent, incomplete, or with a
   pattern that does not compile — is an **error** of `CI-4`. A trigger that is
   not verifiable is an orphan `TODO` with a number.
6. `last-reviewed` past `stale-after-months` is a **warning**, never an error:
   the fix is to read the document, and a red build pushes toward the mass bump
   that spec §13 refuses.
7. **An item in a frozen state does not expire.** There is nothing to review in
   an item whose body is not edited, and warning about it would only teach
   people to bump `last-reviewed` of an accepted ADR — exactly the
   anti-requirement.

## Consequences

### What we gain

`CI-4` testable deterministically; acceptance criterion 7 closes; `HK-6` gets
the same two functions without duplicating logic; and the payment trigger stops
being a promise from whoever wrote it and becomes a condition someone can see
happening.

### What we accept to lose

The trigger now has **two forms** — the prose, for people, and the pattern, for
machines — and they can diverge. No check verifies that the pattern is the same
trigger the prose describes; whoever keeps the two coherent is the
`decision-recorder`, and that is human verification.

A legacy TDR without `pay-when` fails on the first `validate` after this phase.
It is a conscious break: the alternative was to accept debt without a verifiable
trigger, and then the mechanism would not exist.

`monthsBetween` counts calendar months, not days: a document reviewed on January
31 "is a month old" on February 28. Day precision changes no decision that this
warning provokes.
