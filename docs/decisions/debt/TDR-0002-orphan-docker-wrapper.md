---
id: TDR-0002
title: bin/living-docs still requires Docker with nobody to invoke it
status: paid
owner: '@esliph/engineering'
trigger: >
  When the payment trigger below is met.
last-reviewed: 2026-09-01
relates-to: [ADR-0015, RNF-0002]
# Single quotes: in YAML, single quotes do not process `\`, and the pattern is a regex.
pay-when:
  pattern: 'bin/living-docs'
  paths:
    - CONTRIBUTING.md
    - README.md
    - docs/definition-of-done.md
    - '.github/workflows/**'
---

# TDR-0002 — bin/living-docs still requires Docker with nobody to invoke it

## The shortcut

The migration to the host's Node took away every invoker of `bin/living-docs`: no
living document teaches it, no test runs it, no CI step calls it. The file stays in
the repository, stays a `docker exec` bridge to a container nobody brings up
anymore, and stays declared in `consumer-visible-paths` — that is, it is still
treated as a public contract.

`Dockerfile`, `compose.yaml` and `.dockerignore` stay for the same reason: the
build that is left needs them.

## Why it was accepted

Deleting them along with the migration would mix two changes with different risks:
the one that swaps who executes, verifiable by running the five commands, and the
one that removes an execution path someone may be using without having said so.
The first is the scope of this delivery; the second asks for a release and a
deprecation line.

While the wrapper is invoked by nothing, the cost of the delay is a dead file —
cheap, and visible to whoever opens it.

## Payment trigger

When `bin/living-docs` is taught or run again: a mention in `CONTRIBUTING.md`,
`README.md`, `docs/definition-of-done.md` or in any workflow. It is the verifiable
form of "someone tried to use it": from then on it stops being a dead file and
becomes an execution path — and an execution path that fails for a missing
container needs to either work, or go.

## Cost of continuing to owe

A public execution path that fails with a Docker message in a repository whose
whole documentation says Docker is not needed. Whoever stumbles on it has no way to
know whether the wrong one is the wrapper or the documentation — and `RNF-0002`
says it is the wrapper.
