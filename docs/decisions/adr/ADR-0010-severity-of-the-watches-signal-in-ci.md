---
id: ADR-0010
title: How severely CI flags a watched path with no owning doc, and what the written way out is
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-27
relates-to: [RN-0008, RN-0009, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0010 — How severely CI flags a watched path with no owning doc, and what the written way out is

## Context

Acceptance criterion 5 of spec §12 has two halves: "`HK-5` asks and lists the
pending ones; **and** CI flags through `watches`". Phase 3 delivered the first
and wrote in the README that the second did not exist. `CI-7` is the second.

Three sentences written in different phases do not fit together without a
decision:

- spec §9: "`CI-4` is the only one authorized to merely warn — the others fail,
  because an ignored warning is the beginning of the dead wiki."
- `RN-0009`: "What links code to a document informs or asks. It never blocks."
- spec §12, criterion 5: CI "flags" — a word that serves both.

## Alternatives considered

1. **Warning.** Discarded. The hook half is already the gentle path; if both
   halves warn, mechanism 1 has no barrier at all, and spec §9 says exactly what
   happens to an ignored warning.
2. **Error with no way out.** Discarded. It contradicts `RN-0009` head on and,
   worse, leaves no honest path for the change that really does not affect the
   doc — which exists, and whose denial is what makes someone switch enforcement
   off.
3. **Error with an exception label carrying a written reason.** Chosen.
4. **Not implementing the CI half.** Discarded: criterion 5 would never close,
   and the README sentence would become permanent.

## Decision

**Error, with a written way out: `Docs: none — <reason>`.**

- The diff half of `CI-7` is `severity: 'error'`.
- The only way out is the label `Docs: none — <reason>` in some commit message of
  the range, with a separator and a non-empty reason. A label with no reason is
  not an exception: it is the ticked box.
- That half only runs with `living-docs validate --base <ref>`. Without `--base`,
  `validate` prints the pointer saying it did not run — the same honesty
  `validate` already has about `drift` and `changelog`.
- The label applies to the whole range of the diff, not per document.

**`RN-0009` remains true within its scope.** Its vocabulary is that of hooks —
`additionalContext` and `ask` —, and what it protects is the moment of the
commit, where there is a person to answer. In CI there is none: `RNF-0001`
already said, in "out of scope", that "CI fails closed on purpose". And the
precedent has been in the repository since Phase 6: the rule
`src/cli/** → CHANGELOG.md` is a `watches` entry, and `CI-6` already fails by it
with an escape label (`ADR-0006`). This decision gives the general case the form
the particular case already had.

## Consequences

### What we gain

Criterion 5 closes entirely. Mechanism 1 gets both ends the spec drew: the cheap
question at commit time, and the barrier that survives a disabled hook, a stopped
container and a commit made by hand.

### What we accept to lose

One more thing for whoever writes a commit message to remember, and one more
label to explain in `CONTRIBUTING.md`. Two labels (`Changelog: none` and
`Docs: none`) are the beginning of a family of labels, and a family of labels
becomes bureaucracy; the next addition needs an ADR of its own, precisely for
that reason.

**The label is global to the range.** One reason releases all the pending docs of
the PR, not one by one. Per-document granularity would require a bigger syntax
(`Docs: none (CHANGELOG.md) — <reason>`), and a bigger syntax goes unused: the
cost of getting the syntax right becomes greater than that of updating the doc,
and then whoever writes does the wrong thing out of ergonomics.

`Docs: none — <reason>` also silences the watched path that **should** have
carried the doc. That is the same risk `ADR-0006` accepted for the `CHANGELOG`,
and the defense is the same: the reason stays in the history, with the name of
whoever wrote it.
