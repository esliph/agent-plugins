---
id: ADR-0001
title: Runtime in a Docker container, TypeScript with no build step
status: superseded
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-24
relates-to: [RNF-0002, RNF-0003]
supersedes: null
superseded-by: ADR-0015
---

# ADR-0001 — Runtime in a Docker container, TypeScript with no build step

## Context

The development host has no Node installed and must not get one: the premise of
the project is that nothing beyond Docker is required of whoever clones the
repository. At the same time, the hooks run on every `Edit`/`Write` by the agent
and have a 5 s ceiling (docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7), which rules out any
solution that creates a container per invocation.

## Alternatives considered

- **`docker compose run --rm` per invocation** — discarded: it pays for creating
  a container on every hook, and the cost grows with the size of the image.
- **TypeScript compiled to `dist/`** — discarded: it requires a build before any
  execution, and a stale `dist/` makes the hook run old code silently. The error
  would be invisible in precisely the component that cannot fail invisibly.
- **Plain JavaScript with JSDoc** — discarded: the interfaces between modules
  (`Finding`, `ArtifactRule`, `HookDecision`) are the contract that keeps the CLI
  and the hooks in sync; verifying it through comments is more fragile.

## Decision

One long-running container (`living-docs-toolkit`) with the repository mounted at
`/app`; thin bash wrappers (`bin/living-docs`, `plugin/hooks/run-hook.sh`)
do `docker exec` into it. The code is TypeScript executed directly through
Node 24's native type-stripping, with `tsc --noEmit` as the type checker.
Measured: `docker exec` answers in ~160 ms.

## Consequences

### What we gain

Zero toolchain on the host; no build step between editing and running; no
possibility of a compiled artifact diverging from the source.

### What we accept to lose

The container has to be up — when it is not, the CLI exits with code 2 and the
hooks fail open, which means that **the agent's enforcement silently disappears
while the container is stopped**. It is a real loss, mitigated only by CI, which
runs the same code without depending on anyone's machine state. In addition, we
are restricted to erasable TypeScript syntax: no `enum`, no `namespace`, no
decorators.
