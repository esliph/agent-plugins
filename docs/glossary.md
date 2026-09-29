---
title: Glossary
owner: '@esliph/engineering'
trigger: >
  A new domain term in code, a spec or a conversation; a term with two
  meanings; a concept rename.
last-reviewed: 2026-09-15
---

# Glossary

Vocabulary of the toolkit itself — its domain is living documentation, and the
words below are the single truth for that domain within this repository.

| Term | Definition | Name in code | Do not confuse with | Source | Status |
| --- | --- | --- | --- | --- | --- |
| Artifact | An `owned` entry with `living-docs.id-prefix`: a living-documentation document with an owner, a trigger, standard frontmatter and a lifecycle | `ArtifactRule`, `ArtifactDoc` | "Document" — which has an owner and has **no** ID family or lifecycle (`ADR-0008`) | RN-0001 | active |
| Owner | The person or team that answers for an artifact, declared in `owner:` and mirrored in CODEOWNERS | `owner` | "Author" — who wrote the text, not necessarily who answers for it afterwards | RN-0001 | active |
| Watched path | A glob in `watches` whose change requires the owning doc in the same commit | `WatchRule.code` | "Monitored file" by an external observability tool — it is not that | RN-0008 | active |
| Trigger | An observable event that requires updating an artifact; never a calendar date | `trigger` | "Review deadline" — a cadence is the anti-requirement that `living-docs/frontmatter` used to fail | RN-0002 | active |
| Frozen item | An item in a terminal state whose body no longer accepts edits, except the allowlist fields | `FROZEN_STATUSES`, `mutableFields` | "Archived" — suggests it no longer holds; a frozen item remains the current truth | RN-0006 | active |
| Gap | Behavior with no written rule; becomes a `DA-nnnn` and stops the implementation until it is decided | `DA-nnnn` | "Bug" — a gap is the absence of a rule, not an error in running code | decision-recorder (SK-3) | active |
| Term | A glossary entry, identified by name — a single meaning, never a numbered ID | row of the table in `docs/glossary.md` | "Requirement" (`RN`/`RF`/`RNF`) — the term names a concept, the requirement asserts a rule about it | ADR-0004, RN-0011 | active |
| Document | An `owned` entry with a `living-docs:` block and no `id-prefix`: a file with a declared owner and no ID family | `DocumentRule`, `DocumentDoc` | "Artifact" — which has an ID, a state and freezing; and "any file", which has no owner at all | ADR-0008, RN-0016 | active |
| Payment trigger | An observable condition in the repository that makes a debt due, declared in `pay-when` | `PayWhen`, `duePayments` | "Deadline" — a debt does not expire on the calendar, it expires when the condition appears | ADR-0007, RN-0019 | active |
| External document | A document or artifact declared `audience: external`, written for whoever reads the repository without taking part in it | `audience` | A `consumer-visible` path — which is **code** whose change requires a CHANGELOG entry, and not a document | ADR-0017, RN-0030 | active |
