---
id: ADR-0004
title: A glossary term is identified by its name, not by a numbered ID
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-25
relates-to: [DA-0002, RN-0011]
supersedes: null
superseded-by: null
---

# ADR-0004 — A glossary term is identified by its name, not by a numbered ID

## Context

Phase 4 (spec §10) delivers `SK-2` (`docs/glossary.md`) and `SK-1`
(`docs/charter/constitution.md`, `docs/charter/vision.md`). The three are
artifacts with an owner, but none has a numbered ID family like `ADR`,
`DA`, `TDR`, `RF`, `RNF` or `RN` — the same category as `CONTRIBUTING.md`, the
Definition of Done and the agent contract, which Phase 3 already handled
without declaring them in `artifacts:` in `.ownership.yml` (`DA-0002`, still
open).

`docs/.ownership.yml` today requires an `id-prefix` of 2 to 4 capital letters
for every entry of `artifacts:` (`src/config/ownership.ts`). Without a prefix,
an artifact does not get on the list — and without getting on, `CI-1`/`CI-2`/`CI-3`
(`src/docs/collect.ts` scans only `config.artifacts`) do not process it.

The spec gives the glossary term a state machine (`active → renamed(to
X) | banned`, §4) but never gives it a citation syntax: the traceability graph
(§8) shows "Glossary <──names── RN, contract, code" — the glossary is **cited
by name**, and never appears on the side that resolves a `<PREFIX>-<number>`
citation (§8, `CI-2`). The entry format the spec defines (§5, `SK-2`) —
`Term | Definition | Name in code | Do not confuse with
| Source` — has no ID column either.

## Alternatives considered

**Invent a prefix (`TRM` for term, `CST` for a Constitution principle) and
declare `docs/glossary.md`/`docs/charter/constitution.md` in `artifacts:`.**
Discarded: it would create a second form of identity for something the spec
already identifies along another axis (the name). A `TRM-0001` that nobody
cites — because the real citation is `Invoice`, not the number — is decoration
that `CI-2` would validate and no document would ever write.

**Resolve `DA-0002` now**, generalizing `artifacts:` to accept an entry with no
`id-prefix` (an "index" artifact, with no numbered items). Discarded in this
phase: `DA-0002` was opened with the real requirement that motivates it in
mind — `CI-7` (ownership coverage, Phase 7) requiring an owner for every
artifact without inventing a prefix. Resolving it now, from a single case (the
glossary), risks a wrong generalization — designed for what Phase 4 needs, not
for what `CI-7` will need later.

**Keep `docs/glossary.md`, `docs/charter/constitution.md` and
`docs/charter/vision.md` out of `artifacts:`**, with the same treatment that
`CONTRIBUTING.md` and the Definition of Done have received since Phase 3: owner
via CODEOWNERS, frontmatter in the container format (`title`, `owner`,
`trigger`, `last-reviewed`), but with no `CI-1`/`CI-2`/`CI-3` processing them.
**Chosen.**

## Decision

A glossary term is identified by its name — a string unique within
`docs/glossary.md` — never by a numbered ID of the `<PREFIX>-<number>` kind.
`docs/glossary.md`, `docs/charter/constitution.md` and `docs/charter/vision.md`
do not enter `artifacts:` in `.ownership.yml` in this phase. `DA-0002` stays
open, not resolved by this ADR.

## Consequences

### What we gain

- No change to `src/config/ownership.ts`, `src/docs/schema.ts` or
  `src/docs/table.ts` — the Phase 0–3 engine does not need to learn anything new.
- The same treatment for the five artifacts with no ID family
  (`CONTRIBUTING.md`, DoD, agent contract, glossary, Constitution/Vision)
  — one pattern, not one per artifact.
- `DA-0002` stays exactly in the scope Phase 3 left it in: a precondition of
  `CI-7`, Phase 7 — not a problem resolved in a hurry to unblock Phase 4.

### What we accept to lose

- `CI-1` does not validate the frontmatter structure of any of the three files —
  the same gap that already exists for `CONTRIBUTING.md` and the DoD.
- If `watches` ever points to `docs/glossary.md` or
  `docs/charter/constitution.md`, `HK-4`/`HK-5` remind about the owning doc but
  without naming the skill (`findArtifactRule` finds no rule — `skill: null`).
- The check "one term, one meaning" and "every principle has a named
  enforcement" has no generic CI check: it stays entirely with the skill
  (`glossary-keeper`, `charter-keeper`) and, in this repository, with a
  dogfooding test — it is not a mechanism a consumer project inherits for free.
