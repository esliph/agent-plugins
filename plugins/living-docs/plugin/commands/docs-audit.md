---
description: Audits the divergence between code and documentation in a scope — what the diff should have updated and did not.
argument-hint: '[scope: diff ref, path, or staged]'
---

Invoke the `docs-divergence-auditor` agent with the scope: $ARGUMENTS

With no scope, use what is in the index (`git diff --cached --name-only`) and
say so on the first line of the report.

The agent points and stops: it has neither `Edit` nor `Write`. Each finding
names the owning artifact that should change — the fix belongs to whoever owns
it, through the owning skill that `.ownership.yml` declares.

Behavior with no written rule does not become code: it becomes a `DA-nnnn`
(`/open-decision`) and the implementation stops.
