---
id: ADR-0032
title: The toolkit does not choose the language of consumer documents
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [ADR-0031, RN-0002, RN-0017]
supersedes: null
superseded-by: null
---

# ADR-0032 — The toolkit does not choose the language of consumer documents

## Context

Some checks read prose: `living-docs/frontmatter` rejects a `trigger` that
contains cadence vocabulary from a Portuguese and English word list,
`living-docs/trigger-routing` counts word roots shared between a `trigger` and
a skill `description`, and `living-docs/done-verifiable` accepts the
Portuguese `humana` as the human-verification marker. Each of these ties the
result of a check to the language the consumer writes in.

## Alternatives considered

1. **Word lists per language.** Discarded: every new language is a code change,
   and a list in two languages already misses the third.
2. **A `language:` setting and bundled translations of seeds and messages.**
   Discarded: it makes the toolkit own a decision that belongs to the team, and
   every translation is one more copy to keep in step.
3. **Checks read structure only; document content follows the session.**
   Chosen.

## Decision

Plugin output — CLI, hooks, check messages — is English. The content of a
consumer's documents follows the language of the user's session; the plugins
say nothing about it, and that silence is the decision. No skill carries an
instruction about which language to write in.

Checks read only structure: frontmatter, IDs, table keys through `field-map`,
and fixed markers such as `human` and `Docs: none —`. They never read headings
or prose. A seed written by `living-docs init` without an agent stays in
English until a keeper skill replaces it with real content; that is the
accepted degraded path.

## Consequences

### What we gain

A consumer can keep the whole corpus in any language without a check failing
because of that language, and no check needs a word list to be maintained.

### What we accept to lose

Checks can no longer judge wording: a `trigger` written as a calendar cadence
passes. Judging wording belongs to the agent and the reviewer.
