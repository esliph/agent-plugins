---
id: ADR-0015
title: Execution on the host's Node, TypeScript with no build step
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-01
relates-to: [RNF-0002, RNF-0003]
supersedes: ADR-0001
superseded-by: null
---

# ADR-0015 — Execution on the host's Node, TypeScript with no build step

## Context

`ADR-0001` decided on the container starting from a premise about the machine of
whoever develops: that it has no Node and must not get one. The premise stopped
holding, and the loss that ADR declared and accepted started to be charged every
day: with the container stopped, the CLI exits with code 2 and the hooks fail
open, so **local enforcement silently disappears** — in exactly the component
whose failure has to be visible.

Node 24 is the same runtime the container carried. Bringing it to the host does
not change what runs; it changes only who hosts it.

## Alternatives considered

- **Keeping the container and detecting when it is stopped.** Discarded: the hook
  has a 5 s ceiling and fails open by contract (`RNF-0001`); a warning emitted
  from inside a path that has to stay quiet on error either becomes noise on
  every invocation, or does not show up precisely when it matters.
- **Publishing the toolkit on npm and installing it as a dependency of the
  repository itself.** Discarded in this decision: that is `DA-0003`, and it is
  about how the toolkit reaches a **consumer** repository. Resolving local
  execution does not require resolving it, and mixing the two stalls the one that
  is already mature.
- **Compiling TypeScript to `dist/` now that there is no container.** Discarded
  for the same reason as `ADR-0001`, which still holds: a stale `dist/` makes the
  hook run old code silently.

## Decision

The toolkit runs on the host's `node`, version 24 or greater, with dependencies
installed by `npm ci`. `plugin/hooks/run-hook.sh` invokes `node` directly,
deriving the toolkit root from the path of the script itself; the workflow
installs Node with `actions/setup-node` and runs `node src/cli/index.ts`.

**The non-Docker half of `ADR-0001` survives intact and is now carried by this
decision:** the code remains TypeScript executed directly through native
type-stripping, with no build step, with `tsc --noEmit` as the type checker — and
we remain restricted to erasable TypeScript syntax: no `enum`, no `namespace`, no
decorators.

`ADR-0003` is not touched. The two roots remain distinct and remain coming from
the same sources: `import.meta.dirname` for the toolkit's, the working directory
for the validated repository's.

## Consequences

### What we gain

Local enforcement stops depending on the state of a daemon: there is no longer a
window in which the hooks go quiet because someone did not bring up the
container. The CI image build goes away and so does the layer of indirection
between editing and running — the command the documentation teaches is the
command that runs.

### What we accept to lose

**The host now needs Node ≥ 24.** A machine with an older Node, or with no Node,
can no longer run the toolkit without installing anything — which was precisely
what `ADR-0001` bought. Whoever clones onto such a machine finds out from the
error of `node`, not from a message of ours.

We also lose the reproducibility the image gave: the exact version of the runtime
becomes the responsibility of each machine, and a patch difference between
someone's host and the CI's `ubuntu-latest` becomes a class of divergence that
did not exist before.

`compose.yaml`, `Dockerfile` and `bin/living-docs` stay in the repository with no
document, test or CI step that invokes them. It is a conscious shortcut, recorded
in `TDR-0002`.
