---
id: ADR-0033
title: One-time editorial migration of frozen artifacts
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0031, RN-0006]
supersedes: null
superseded-by: null
---

# ADR-0033 — One-time editorial migration of frozen artifacts

## Context

ADR-0031 moves every versioned text to English. Accepted and superseded ADRs
and paid TDRs are frozen: their body does not change, and
`living-docs/append-only` denies an edit to it. Translating them in place is
exactly the edit the guard exists to stop. Leaving them in Portuguese keeps
the decision history — the part of the corpus most often read to understand
why — in a language the rest of the repository no longer uses.

The project's own `.claude/settings.json` enables only the `ownership` plugin,
so the `living-docs` hooks are not active in a session on this repository; the
guard was probed directly, and the migration does not rely on it being
switched off.

## Alternatives considered

1. **Leave frozen artifacts in Portuguese.** Discarded: the history of
   decisions is the asset, and a history nobody reads is not one.
2. **Supersede every frozen ADR with an English copy.** Discarded: it doubles
   the ADR count with decisions that decide nothing new, and every citation
   would have to choose between two IDs for one decision.
3. **Relax the guard in code for translations.** Discarded: a permanent
   exception for "translation" is an exception anyone can claim.
4. **One-time translation under this ADR, same ID and meaning.** Chosen.

## Decision

Accepted ADRs, paid TDRs, published RELs and `docs/superpowers/` specs and
plans may be translated to English **once**: same ID, same decision, same
meaning, same frontmatter values except prose fields, same `last-reviewed`,
slug renamed to English. This is valid only for the commits of the English
migration, each of which cites ADR-0033 and lists the IDs it touches. It does
not repeat: a later correction of a frozen artifact follows the normal path —
a new item that supersedes it.

**How the commits pass the guard.** The probe of `living-docs/append-only`
showed: an in-place write to a frozen file is denied; a write to a path that
does not exist yet is allowed, because the guard treats it as a new item. The
migration therefore writes each translated frozen file at its new English slug
and removes the Portuguese path with `git rm` in the same commit. No code
changes, and the guard is not disabled at any point.

## Consequences

### What we gain

The whole decision history reads in one language, under the IDs every citation
already uses.

### What we accept to lose

Git does not follow a translated file across the rename (the content differs
too much for rename detection), so `git log --follow` on a frozen artifact
stops at the migration commit; the Portuguese original is the parent of that
commit. A reviewer has to trust the translation against the original, per
family commit.
