---
id: ADR-0005
title: The generator prints to standard output, and CI-5 runs in a subcommand of its own
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-25
relates-to: [RF-0006, RN-0012]
supersedes: null
superseded-by: null
---

# ADR-0005 — The generator prints to standard output, and CI-5 runs in a subcommand of its own

## Context

Phase 5 (spec §10) delivers `CI-5`: "regenerating the contract produces a diff ≠ 0"
(§9). `.ownership.yml` has declared the shape of the configuration since Phase 0 —
`generated: [{ path, command }]` — but never said **what `command` does**, and
`generated` is empty in every repository to this day.

Two questions were left open, and both change the engine:

1. Does the command **write the file** or **print the content**? It is the
   contract every consumer project will have to fulfil.
2. Does `CI-5` run inside `living-docs validate`, together with `CI-1`–`CI-3`, or
   in a separate subcommand? `CI-5` is the first check that runs a subprocess —
   and the command it runs comes from the **validated** repository, not from the
   toolkit.

## Alternatives considered

**The generator writes the file and `CI-5` compares with `git diff --exit-code`.**
It is how most generators on the market work (OpenAPI, protobuf, ORM).
Discarded: the check would **rewrite the file it is checking**, which erases the
evidence at the very moment it reports it — whoever reads the failure in CI can
no longer see the old content. In addition, it ties `CI-5` to `git` (clean tree,
`safe.directory`, initialized repository), and a check that depends on the state
of the tree is not reproducible locally.

**`CI-5` inside `validate`, together with the others.** It is harder to forget,
and spec §9 lists the eight checks side by side. Discarded in this phase:
`validate` today only **reads** files, and `runValidate` is called in-process by
the test suite. Starting to run an arbitrary command declared by the target
repository changes the nature of the command — an agent validating a freshly
cloned repository would start running its code without asking anyone — and makes
the suite depend on the environment.

**`CI-5` only when a flag asks for it (`validate --generated`).** Discarded: a
flag nobody types is a check that never runs, with the aggravating factor of
looking installed.

**The generator prints to standard output and writes nothing; `CI-5` compares the
output with the file on disk; `CI-5` runs in `living-docs drift`. Chosen.**

## Decision

1. `generated[].command` **prints the expected content of the artifact to
   standard output and writes no file at all.** `CI-5` captures that output and
   compares it with the versioned file.
2. The comparison normalizes `\r\n` to `\n` and trims trailing line breaks.
   CR comes from the checkout, not from the generator; an extra trailing break
   is shell redirection. Any other difference is drift.
3. `CI-5` is **not** in the list of `living-docs validate`. It runs in
   `living-docs drift`, the only subcommand that runs a command from the
   validated repository.
4. `validate` does not stay silent about it: when `generated[]` is not empty, it
   prints a line saying that contract drift is verified by `living-docs drift`.
   It is a pointer, not a finding — it does not change the exit code.
5. A generator that fails (exit ≠ 0, timeout) and a declared and missing artifact
   are findings of `error` severity, not silence. `CI-5` does not fail open: that
   is the policy of the **hooks** (`RNF-0001`), and a check that goes quiet when
   the generator breaks lies with the authority of one that passed.

## Consequences

### What we gain

- `CI-5` is a pure function of (command, file) → findings: no git, no tree
  mutation, testable with a fake executor.
- `validate` remains what it always was — reading — and remains callable
  in-process by the suite with no side effect.
- The generator contract is a sentence that fits in a template: "print the
  content, do not write the file".

### What we accept to lose

- Market generators that only write files need a wrapper that generates into a
  temporary directory and prints the result. It is extra work for whoever
  installs, and it is stated in the comment of `templates/ownership.yml`.
- A project may never run `living-docs drift` and not notice. The mitigation is
  social and not automatic: this repository's workflow runs it, the Definition
  of Done names `CI-5`, and `validate` points to the subcommand when there is
  something to check.
- `CI-5` runs a command declared by the validated repository. It is still
  execution of third-party code — what changes is that it happens in a command
  the person typed on purpose, not as a side effect of `validate`.
