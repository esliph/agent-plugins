---
id: TDR-0001
title: HK-1 does not freeze a revoked section inside a collection file
status: open
owner: '@esliph/engineering'
trigger: >
  Never. Immutable while the debt exists; paying it marks it as paid.
last-reviewed: 2026-08-24
relates-to: [RN-0006]
# Single quotes: in YAML, single quotes do not process `\`, and the pattern is a regex.
pay-when:
  pattern: '^- \*\*status:\*\* revoked'
  paths: ['docs/requirements/**']
---

# TDR-0001 — HK-1 does not freeze a revoked section inside a collection file

## The shortcut

`HK-1` decides per file: it reads `status` from the frontmatter and compares it
with `FROZEN_STATUSES`. A revoked requirement is a **section** inside
`docs/requirements/rules.md`, a file that stays alive because other sections
change. Result: `revoked` is a terminal state by spec §4, but nothing stops an
agent from rewriting the body of that section.

## Why it was accepted

Freezing per section requires `HK-1` to project the edit, diff **per item** and
know which item was touched — more work than the whole of Phase 2, to protect a
case that today has zero occurrences (no revoked requirement exists yet). `CI-3`
closes half of the hole: a revocation without a bidirectional pair fails in CI.

## Payment trigger

On the first PR that **revokes** a requirement — that is, that changes any section
to `status: revoked`. From then on there is a frozen body to protect, and the cost
of not protecting it becomes real.

## Cost of continuing to owe

A revoked requirement can be rewritten retroactively without any hook complaining,
and the only defense becomes human review of the diff — exactly the defense that
mechanism 5 exists to avoid depending on.
