---
id: ADR-0016
title: Optional containerized execution path, parity by delegation
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-01
relates-to: [ADR-0015, ADR-0003, RNF-0006]
supersedes: null
superseded-by: null
---

# ADR-0016 — Optional containerized execution path, parity by delegation

## Context

`ADR-0015` moved execution to the host's `node` and, in doing so, left
`Dockerfile`, `compose.yaml` and `bin/living-docs` in the repository with no
document, test or CI step invoking them — a conscious shortcut, recorded in
`TDR-0002`. The payment trigger of that debt is verifiable: when the wrapper is
taught or run again, it has to either work, or go.

There is a reason for it to work again. A machine with no Node, or with a Node
older than 24, is exactly the case `ADR-0001` bought and `ADR-0015` declared
lost. A predictable and portable environment for **maintenance** — running the
tests, the type-check, the CLI — is a real convenience for whoever develops, and
the repository already carries everything it requires.

What cannot come back is local enforcement depending on the state of a daemon.
That is the core of `ADR-0015`, and it is what decides the design.

## Alternatives considered

- **Superseding `ADR-0015` and making the container the path of record again.**
  Discarded: it would reopen `ADR-0001` through the back door, and `ADR-0001`
  remains superseded for the reasons `ADR-0015` recorded — a hook with a 5 s
  ceiling that fails open cannot depend on a daemon, or local enforcement
  silently disappears.
- **A pair of wrappers, bash and PowerShell, with the same logic written twice.**
  Discarded: two copies of a logic diverge, and the divergence shows up on the
  machine of whoever is least able to diagnose it. `git` is already required by
  the toolkit, and Git for Windows brings bash along — on Windows it is invoked
  through Git Bash, through WSL, or with `bash bin/dev …` from PowerShell.
- **Exercising the Docker path on every PR.** Discarded: it would give CI back
  the image build that `ADR-0015` took away, charging minutes on every PR to
  verify an optional path. The path filter costs zero on the ordinary PR and
  covers what can actually break.
- **Generalizing `bin/living-docs` instead of creating `bin/dev`.** Discarded:
  the CLI wrapper has a public contract — invoking it runs the CLI — and turning
  it into a generic executor would break that contract to save one file.

## Decision

There is a second execution path, **optional**: `bin/dev` runs any maintenance
command inside the container, and `bin/living-docs` becomes a one-line delegation
to it.

**This ADR does not supersede `ADR-0015`, and the reason is one of substance, not
of form.** The core of that decision is that local enforcement cannot depend on
the state of a daemon. The hooks **never** enter the container:
`plugin/hooks/run-hook.sh` keeps invoking `node` on the host, without touching
Docker. As long as that is true, that core stays intact, and this path is an
addition, not a reversal. Recording this as a supersession would say that
`ADR-0015` stopped holding — and it holds, entirely.

Parity between the two paths is not kept by discipline: `bin/dev` has no
subcommand, no table of supported commands, does not validate `argv` and
translates nothing. A list of commands that work in Docker cannot diverge from
the host's list because that list is not written anywhere. A new maintenance
command starts working on both paths in the same commit that creates it.

`ADR-0003` is not touched. The two roots remain distinct and remain coming from
the same sources: inside the container they arrive through an environment
variable of `compose.yaml`, never through the working directory.

## Consequences

### What we gain

A machine with no Node, or with an old Node, can run the tests, the type-check
and the CLI again — which was precisely what `ADR-0015` declared lost — without
local enforcement coming to depend on a daemon. `TDR-0002` is paid by repair: the
dead file works again instead of going.

### What we accept to lose

**The Docker daemon becomes a dependency of whoever chooses this path**, and the
first invocation builds an image, which is not fast.

**I/O on a bind mount of a Windows path is slow**, and this repository lives in
OneDrive, which aggravates it. `bin/dev npm test` is noticeably slower than `npm
test` on the host. That does not invalidate the path; it invalidates the idea
that it be the default, and it is one more reason for the documentation to teach
the host first.

**One more public execution path to maintain**, with CI coverage deliberately
partial: the workflow that exercises it fires on a path filter, so a break caused
by something outside the watched list only shows up the next time someone touches
that list.
