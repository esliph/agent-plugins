---
title: Product Vision
owner: '@esliph/engineering'
trigger: >
  A change of product strategy — never as a side effect of another task.
last-reviewed: 2026-08-25
---

# Product Vision

**What problem:** Documentation that drifts from the code and rots in silence —
decisions, requirements and technical debts become tribal knowledge that
evaporates when whoever remembers leaves the team.

**For whom:** Whoever maintains a repository alone or in a small team and
needs "why was it done this way" and "what have we not decided yet" to
survive the turnover of whoever remembers — without depending on a parallel wiki
that nobody updates.

**Success metric:** `living-docs validate` runs in minutes on the PR and fails
before merging; every `active` `RN` is cited by at least one test (`CI-3`
with no finding); no accepted ADR was rewritten retroactively.
