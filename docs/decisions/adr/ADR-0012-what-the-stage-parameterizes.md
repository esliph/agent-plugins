---
id: ADR-0012
title: The stage parameterizes the workflow checks; the hooks come in as a single piece
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-28
relates-to: [RF-0013, RN-0025]
supersedes: null
superseded-by: null
---

# ADR-0012 — The stage parameterizes the workflow checks; the hooks come in as a single piece

## Context

`SK-0` declares as its own "the installation of `HK-*` and `CI-*`" and step 4
says to install **in the order of the phases**. The rule that comes out of this
is "the installed set of enforcement is that of the stage's phases, neither more
nor less".

The `CI-*` fit that rule: each is a workflow step, and a step is either included
or not. The `HK-*` do not fit: they reach the consumer through a plugin, and a
plugin registers the whole `hooks.json`. There is no such thing as "half a
plugin".

## Alternatives considered

1. **One plugin per phase.** Discarded: seven plugins for seven hooks multiplies
   the installation path by seven and turns "installing the toolkit" into a
   procedure. The duplicate anti-requirement applies to installation pieces too.
2. **Rewriting the plugin's `hooks.json` at `init` time.** Discarded: `init`
   would start editing a file of the **toolkit** to configure the **consumer**,
   which is exactly the confusion of roots that `ADR-0003` closed.
3. **Registering the hooks one by one in the consumer's `.claude/settings.json`.**
   Discarded: it duplicates the plugin's `hooks.json` in a second place, and the
   two copies diverge at the first new hook.
4. **Staging the checks and accepting the hooks as a single piece.** Chosen.

## Decision

**The stage parameterizes the CI workflow. The plugin registration is
indivisible.**

- `solo` and `small-team` install the `validate` step.
- `production` adds `drift` (`CI-5`) and `changelog --base` (`CI-6`).
- `multi-team` adds `validate --base` — the half of `CI-7` that reads the diff,
  and `CI-9`.
- The plugin registration turns on **all** the hooks, at any stage. What stages a
  hook is not the installer: it is the configuration it reads. `HK-2` without
  `generated[]`, `HK-4` and `HK-5` without `watches`, `HK-8` without an open
  decision with a claimed path — all stay silent.
- `HK-6` and `HK-7` speak at any stage, and that is accepted: both return
  `additionalContext` and neither blocks anything.

## Consequences

### What we gain

`--stage multi-team` starts to exist with content — enforcement is a file, and
from here on a stage installs enforcement. `SK-0` stops telling people to choose
a value that the CLI rejects.

### What we accept to lose

**A `solo` project receives seven hooks and uses two.** The cost is zero as long
as the silence is real, and that is why the silence is tested: each hook has a
test proving it stays quiet without its configuration. The day a hook speaks
without configuration, this decision is what is wrong — not the test.
