---
id: ADR-0011
title: The identity of an ID and its written form are different things
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-28
relates-to: [RN-0003, RN-0024]
supersedes: null
superseded-by: null
---

# ADR-0011 — The identity of an ID and its written form are different things

## Context

Spec §8 fixes a citation syntax — `<PREFIX>-<number>` — and justifies it: "a
single form, because it is the one `CI-2` and `CI-3` recognize by `grep`". The
real requirement behind it is **one form per project**: it is the `grep` that
needs determinism, not the universe. The implementation encoded the toolkit's
form in `src/docs/schema.ts` and `src/ids/citations.ts` and treated it as
universal.

This collides with two demands of the same spec: step 1 of `SK-0` ("adopt what
exists … **never** create a parallel one") and acceptance criterion 1 ("no
pre-existing artifact was duplicated or overwritten"). A repository with 97
rules numbered `RN001` cannot be adopted without being rewritten, and rewriting
is what the criterion forbids.

## Alternatives considered

1. **Renumbering the consumer.** Discarded, and it is a written anti-requirement:
   it is overwriting what pre-exists, in a diff of 97 rules nobody reviews.
2. **Accepting both forms everywhere** (`RN009` and `RN-0009` always valid).
   Discarded: it kills the `grep` determinism spec §8 asks for, and makes the
   repository itself accept two spellings of the same item side by side.
3. **A table of aliases per ID.** Discarded: per-item configuration is the
   opposite of a single extension point, and rots at the first new rule.
4. **Separating identity from written form.** Chosen.

## Decision

**The canonical key is internal and invariant; the written form is declared by
the project.**

- **Canonical key** — `<PREFIX>-<4 digits>`, produced by `canonicalId`, **never
  displayed**. It is what compares, detects duplicates, closes a bidirectional
  pair and resolves a citation. No check changes logic.
- **Written form** — `id-format: { separator, padding }` in
  `docs/.ownership.yml`, with `separator: "-"` and `padding: 4` as the default.
  It is what the parser recognizes when reading and what the toolkit prints when
  suggesting a new ID.
- **Reading accepts the declared padding and one digit fewer.** With `padding: 4`
  that is 3 or 4 digits, which is exactly what the toolkit already did —
  `ADR-001` and `ADR-0001` are the same item (`RN-0003`), and re-padding never
  created a new item.
- **Whoever writes an ID is a single function**: `writeId`. No check goes back to
  assembling an ID by concatenation — the sequence-gap message of `CI-2` was the
  only leak and now calls it.
- **Adopting a format is not silent.** The inventory reports the detected form
  and how many items it read in it; declaring is the act of whoever installs.

## Consequences

### What we gain

A real repository is adopted without any file of it being touched, which is
criterion 1 of the original spec holding for the world and not only for an empty
repository. And the format stops being written in five places: there is now one
source and one function that prints it.

### What we accept to lose

**A project has one form, not several.** A repository that today mixes `RN001`
and `RN-0001` has to choose one — and that is the same determinism demand spec §8
always made, now applied to the project instead of the universe.

**Reading is one digit wider than writing.** `RN09` is read as `RN009` in a
project with `padding: 3`. It is deliberate and it is the rule that already
existed: identity does not depend on leading zeros.

**The separator is a closed vocabulary** (`-`, `_`, `.`, `:` or empty). An
arbitrary separator would become a regular-expression pattern coming from
configuration, which is a surface this toolkit does not want.
