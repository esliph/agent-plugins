---
id: ADR-0008
title: How a document with no ID family gets a declared owner
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-27
relates-to: [DA-0002, RN-0001]
supersedes: null
superseded-by: null
---

# ADR-0008 — How a document with no ID family gets a declared owner

## Context

`DA-0002` has been open since Phase 3 and asks: how to declare in
`.ownership.yml` an artifact **with no ID family**, so that `CI-7` can require an
owner without inventing a prefix. The list grew with each phase —
`CONTRIBUTING.md`, the Definition of Done, the agent contract,
`docs/glossary.md`, `docs/charter/`, `docs/contracts/errors.md`,
`docs/contracts/versioning-policy.md`, `CHANGELOG.md`, `docs/deprecations.md` —
and Phases 4, 5 and 6 inherited it without resolving it, because none of them
needed to.

`CI-7` does need it. "Artifact with no entry in CODEOWNERS or in
`.ownership.yml`" (spec §9) is not verifiable while these documents cannot be
declared there. The symptom is cheap to recognize: `parseArtifact` requires an
`id-prefix` of 2 to 4 capitals in every entry of `artifacts:`, and none of these
documents has one.

There is a second thing `CI-7` needs that nobody had noticed: it needs to know
**which** document is the agent contract (to require that it not repeat text
from an owning artifact, spec §5, `SK-6`, rule 1) and **which** is the
Definition of Done (because it is the source of `CI-7`, rule 3 of the same
section). The toolkit does not know `CLAUDE.md` or `docs/definition-of-done.md`
and cannot come to know them (spec §3).

## Alternatives considered

1. **An optional `id-prefix` in `artifacts:`.** Discarded. Every consumer of
   `ArtifactRule` — `CI-1` (state machine by prefix), `CI-2` (numbering and
   sequence), `HK-1` (freezing), `HK-3` (promotion) — would start handling a null
   prefix, and each would gain an `if` to say "this is not my business". The
   cost would fall precisely on Phase 0, the most delicate part and the one that
   should change least.
2. **Inventing prefixes: `CTB`, `DOD`, `GLO`, `CHG`.** Discarded. An ID nobody
   cites is decorative numbering, and `CI-2` would start requiring a sequence
   for a family of a single item. Worse: it would invite citing `CTB-0001`
   instead of `CONTRIBUTING.md`, swapping a path anyone understands for a code
   that requires a lookup.
3. **Only CODEOWNERS.** Discarded. The toolkit's map would stop knowing the
   document: `CI-7` would have no way to say which skill owns it, `CI-4` would
   have no way to demand review, and the `role` that `CI-7` needs would have no
   place at all.
4. **A new key, `documents:`.** Chosen.

## Decision

**`documents:` declares a document with an owner and no ID family.**

```yaml
documents:
  - path: CONTRIBUTING.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
  - path: CLAUDE.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/superpowers/
    owner: '@esliph/engineering'
```

- `path` and `owner` are mandatory; `owner` starts with `@` and mirrors
  CODEOWNERS, like `artifacts:`.
- `skill` is **optional**. Its absence is information, not an error: a document
  can have an owner and no owning skill — as is the case of a plan, a spec, a
  README.
- `role` is optional and has a closed vocabulary: `agent-contract` and
  `definition-of-done`. It is what lets `CI-7` find those two documents without
  knowing any path. A role can be declared only once.
- A `path` ending in `/` is a directory and covers what is inside it; without `/`
  it is a file and covers by equality. Same semantics as `artifacts:`.
- **`CI-1`, `CI-2`, `HK-1` and `HK-3` do not read `documents:`.** `CI-4` and
  `CI-7` do. `artifacts:` keeps requiring `id-prefix`.

## Consequences

### What we gain

`DA-0002` closes. `CI-7` can now require an owner for every document without
inventing a prefix. The distinction between **artifact** (has an ID family,
lifecycle and freezing) and **document** (has an owner, and maybe a skill)
becomes explicit in the file that is the toolkit's extension point, instead of
living in the head of whoever read the earlier phases.

### What we accept to lose

A document declared in `documents:` does **not** have its frontmatter validated
by `CI-1`: a `trigger` with a cadence inside `CONTRIBUTING.md` passes. Extending
`CI-1` to `documents:` is a separate decision, and it is not free — `CHANGELOG.md`
has no frontmatter by a Phase 6 decision, and a naive `CI-1` would start failing
it. This phase leaves that out and writes that it did.

`role` is a closed vocabulary: a project that needs a new role waits for a
toolkit version. It is deliberate — an open role would be configuration the
toolkit does not know how to use.

Two keys can now declare the same path (`artifacts:` and `documents:`). The
parser refuses a duplicate within `documents:`, but does not cross the two lists;
`CI-7` treats either as "declared", so the effect of a mistake here is silence,
not an error.
