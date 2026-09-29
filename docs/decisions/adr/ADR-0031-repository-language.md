---
id: ADR-0031
title: Repository language
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-29
relates-to: [RN-0010]
supersedes: null
superseded-by: null
---

# ADR-0031 — Repository language

## Context

The repository is written in Portuguese — docs, decisions, requirements,
comments, test names and commit messages — while identifiers, file names and
IDs are English. The toolkit it builds is meant to be installed by teams that
do not read Portuguese, and every contributor or agent working here has to
switch languages between the code and the text that explains it.

## Alternatives considered

1. **Keep Portuguese prose.** Discarded: it keeps the repository closed to
   contributors who do not read Portuguese, and it keeps the toolkit's own
   shipped text in a language its consumers may not share.
2. **Bilingual text.** Discarded: two copies of every rule drift apart, and
   the older copy wins by repetition.
3. **English for everything versioned from now on.** Chosen.

## Decision

All versioned text in this repository is English: documents, decisions,
requirements, comments, test names, assertion messages, workflow step names
and commit messages. This replaces the language section of `CONTRIBUTING.md`,
which asked for prose and commits in Portuguese. No check enforces it; review
does.

## Consequences

### What we gain

One language between the code and the text that explains it, and a repository
readable by anyone who installs the toolkit.

### What we accept to lose

`git log` before this decision is in Portuguese and is not rewritten, so the
history reads in two languages.
