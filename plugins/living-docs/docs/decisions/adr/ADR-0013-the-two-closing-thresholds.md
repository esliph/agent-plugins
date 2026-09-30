---
id: ADR-0013
title: The two closing thresholds — mass bump and trigger similarity
status: superseded
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-28
relates-to: [RN-0027, RN-0029]
supersedes: null
superseded-by: ADR-0034
---

# ADR-0013 — The two closing thresholds — mass bump and trigger similarity

## Context

`CI-9` and `CI-10` are the first two checks after `CI-7` to compare things with
no binary answer: "several documents" is not a number, and "say the same thing"
is not an equality. `ADR-0009` already set the precedent for this kind of piece —
the threshold has to be **written** so it can be discussed inside a PR, and the
fix for a false positive is a new ADR, never a local exception.

## Alternatives considered

1. **No threshold: any `last-reviewed` change fails.** Discarded: reviewing a
   document and updating the date is the mechanism working.
2. **Statistical similarity for `trigger` × `description`.** Discarded for the
   same reason as `ADR-0009`: a number nobody explains in the PR is guessing.
3. **Comparing by sentence equality.** Discarded: `trigger` and `description` are
   written for different readers — one for whoever maintains the document, the
   other for the skill index. Requiring equality would be requiring a copy, which
   is the anti-requirement of `RN-0010` coming in through the back door.
4. **Two written numbers, calibrated against this repository.** Chosen.

## Decision

**Mass bump: three documents.** A diff in which **three or more** documents
change **only** the `last-reviewed` line, and nothing else in their body, fails.
The number is configurable as `last-reviewed-bump-limit` in `.ownership.yml`.

- **The unit is the branch diff, not the commit.** It is the unit CI has, and
  splitting the bump into three commits does not make it a real review.
- **There is no escape label.** The escape is the very anti-requirement of spec
  §13. Whoever really reviewed changed more than the date; whoever did not review
  should not mark that they did.

**Trigger similarity: two shared roots.** The `trigger` of an artifact and the
`description` of the owning skill must share **at least two** word roots. A root
is a word of five letters or more, normalized as in `ADR-0009` (lowercase, no
markup, no punctuation), truncated to six characters — the truncation is what
makes "changed" find "change" without the toolkit learning the grammar of a
language.

- **Calibration:** against the twelve pairs of this repository. The tightest pair
  is `docs/contracts/errors.md` × `contract-keeper`, with three roots (the
  Portuguese roots of "code", "output" and "meaning"); the loosest is
  `CONTRIBUTING.md` × `working-agreements-keeper`, with seven. The floor is two,
  and the margin of one is deliberate: a pair that is born at the floor is a pair
  that any rewrite breaks.
- **A collection item does not enter.** Only the **document's** trigger is
  compared: the `trigger` of an ADR is "Never. Immutable once accepted", which
  belongs to the item and not to the artifact.
- **An owning skill missing from the toolkit root warns and moves on.** It is the
  only exception to "only `CI-4` warns" in spec §9, and it exists because a
  project may declare a skill of its own — failing on that would be the check
  demanding that every owner come from the plugin.

## Consequences

### What we gain

Two rules that the spec wrote and never allocated to any piece start to have
enforcement, and the two numbers that sustain them are written where numbers are
discussed: in an ADR, with the calibration corpus named.

### What we accept to lose

**The two numbers are chosen, not derived.** Three documents and two roots are a
calibration against one project. The first time either of them fails a legitimate
case, the way is a new ADR with the concrete case attached — not an exception
inside the check, and not lowering the number silently.

**A complete paraphrase passes `CI-10`.** A `trigger` rewritten with whole
synonyms shares no root and fails even while saying the same thing; a `trigger`
that shares two roots by chance passes while saying something else. It is the
price of a comparison that fits in one sentence of an error message.
