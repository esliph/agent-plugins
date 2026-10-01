---
id: ADR-0039
title: spur, vendored and pinned to a tag, is the repository's command runner
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-30
relates-to: [ADR-0036, RNF-0002, TDR-0003, ADR-0016]
supersedes: null
superseded-by: null
---

# ADR-0039 — spur, vendored and pinned to a tag, is the repository's command runner

## Context

The commands of this repository live in places that must agree by hand: the
first `bash` block of `CONTRIBUTING.md`, which the local Definition of Done run
executes line by line; the `scripts` of each plugin's project `package.json`;
the `run:` lines of the workflows; and the container path (`bin/dev npm test`).
A command changed in one place and not in the others is found by CI, or not at
all. `ADR-0036` gave each plugin its own toolchain and left the root with none,
so there is no root place where a command could be defined once.

## Alternatives considered

1. **npm scripts.** Discarded: they exist only for a Node plugin and there is no
   root `package.json` (`ADR-0036`), so the root commands would stay in prose.
   Extra arguments land after the script's own, where `node --test` ignores
   options that follow the file pattern.
2. **make.** Discarded: a build system used as a task runner — the timestamp
   graph is dead weight, each recipe line runs in its own shell, and there is no
   argument passthrough.
3. **just or Task.** Discarded: a binary per platform to install on every
   machine, CI runner and container image, for features (parameters, a
   dependency graph) these commands do not need.
4. **spur, vendored.** Chosen: one POSIX `sh` script that needs only `sh` and
   `awk`, committed at the root, so whoever clones runs `./spur <task>` with
   nothing to install; it passes arguments verbatim as `"$@"` and has no
   dependency graph.

## Decision

- `./spur` at the root is the spur runner, copied from its repository at a tag
  and never edited by hand. Updating it is replacing the file with the one from
  another tag, in its own commit. The pinned tag must tell a task of one
  Spurfile from a task of the same name in another: the delegation below
  depends on it, and v0.3.0 did not.
- Each plugin with a toolchain owns its commands in `plugins/<name>/Spurfile`,
  calling its tools directly. The root `Spurfile` owns no tool call of a plugin:
  it delegates (`spur -C plugins/<name> <task>`), in an order written in its
  preamble, because spur has no `include`.
- Every caller runs tasks: people, the agent's local Definition of Done run, the
  workflows and the container path.
- The runner and the Spurfiles only centralize commands: no test checks them.
  Running the tasks, locally and in CI, is what exercises them.
- This replaces one clause of `ADR-0036`: the private project `package.json` no
  longer holds the scripts. It keeps the development dependencies and the
  development lockfile. `ADR-0036` is not edited.
- The hooks never go through the runner: a hook calls `node` (or `npx`)
  directly, on every tool call, where a shell layer would only add latency and
  a way to fail.

## Consequences

### What we gain

One definition per command. `./spur --list` answers what can be run, from the
root or from a plugin project, and CI runs exactly what a person runs. A plugin
that is not Node gets the same interface as the ones that are.

### What we accept to lose

A POSIX shell with `awk` joins the contributor's toolchain — on Windows, Git
Bash or WSL; `./spur` does not run from PowerShell. spur has no dependency
graph, so a task can run twice: the root `install` installs the core, and
living-docs' `install` installs it again because it depends on it by path
(`TDR-0003`). A runner in the repository is one more file to keep current.
