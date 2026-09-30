---
title: How to contribute here
owner: "{{OWNER}}"
trigger: >
  When how we work here changes — and every time a person or an agent went
  wrong for lack of context that would have fit on this page.
last-reviewed: {{TODAY}}
---

# How to contribute

## The cycle

1. **The rule before the code.** New behavior starts with a requirement with an
   ID in `docs/requirements/`. If the rule does not exist and nobody knows what
   it is, the result is a `DA-nnnn` in `docs/open-decisions.md` and the
   implementation stops.
2. **A test citing the ID** of the requirement it covers — it is the citation
   that `living-docs/citation-coverage` looks for.
3. **Minimal implementation.** What has no requirement is not scope.
4. **A commit citing the affected ID.**
5. **The Definition of Done** (`docs/definition-of-done.md`) says when it is
   finished.

## Where the truth lives

| Question | Artifact |
| --- | --- |
| What is the rule for X | `docs/requirements/` |
| Why was it done this way | `docs/decisions/adr/` |
| What has not been decided yet | `docs/open-decisions.md` |
| What we accepted to owe | `docs/decisions/debt/` |
| Who owns each path | `.ownership.yml` and `CODEOWNERS` |
| When it is done | `docs/definition-of-done.md` |

None of these answers is copied anywhere else.

## When someone goes wrong for lack of context

A line is missing in one of these documents. The fix is to add it — in the
agent contract if it is policy or an index, in the owning artifact if it is a
rule.
