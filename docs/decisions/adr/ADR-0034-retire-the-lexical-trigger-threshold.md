---
id: ADR-0034
title: Retire the lexical trigger threshold
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0032, RN-0027, RN-0029]
supersedes: [ADR-0013]
superseded-by: null
revokes: [RN-0029]
---

# ADR-0034 — Retire the lexical trigger threshold

## Context

ADR-0013 holds two thresholds. The first — a branch diff in which three or
more documents change only `last-reviewed` fails — reads structure. The
second — a document's `trigger` and its owning skill's `description` must
share at least two word roots — reads prose, and only works when both are
written in the same language. Under ADR-0032 no check reads prose, so the
second threshold goes, and an accepted-or-draft ADR is not edited: it is
superseded.

## Alternatives considered

1. **Keep the root threshold and translate the skill descriptions.** Discarded:
   a consumer writing in any other language fails it by construction.
2. **Semantic similarity between trigger and description.** Discarded for the
   reason ADR-0009 gave: a number nobody can explain in a PR is guessing.
3. **Supersede ADR-0013 in full and restate the part that survives.** Chosen.

## Decision

**Mass `last-reviewed` bump: three documents.** Restated from ADR-0013
unchanged. A branch diff in which **three or more** documents change **only**
the `last-reviewed` line, and nothing else in their body, fails. The number is
configurable as `last-reviewed-bump-limit` in the ownership file. The unit is
the branch diff, not the commit, and there is no escape label.

**Trigger similarity: retired.** `living-docs/trigger-routing` no longer
compares a `trigger` with a skill `description`. It keeps only its structural
part: a document with a `trigger` whose declared owning skill does not exist
in the toolkit root produces a warning, never a failure. The `trigger` of a
collection item is still not examined.

RN-0029 is revoked by this decision.

## Consequences

### What we gain

A check result that no longer depends on the language of the `trigger` or of
the skill `description`.

### What we accept to lose

A document whose `trigger` and owning skill talk about different events is no
longer caught by any check; the mismatch is left to the agent and the
reviewer.
