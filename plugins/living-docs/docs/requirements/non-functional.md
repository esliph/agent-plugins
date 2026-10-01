---
title: Non-functional requirements
owner: '@esliph/engineering'
trigger: >
  Before implementing any behavior of this family, and on every new or changed
  rule.
last-reviewed: 2026-09-30
---

# Non-functional requirements

Each requirement is a section with a citable ID. Format: `templates/requirements.md`.

## RNF-0001 — A hook fails open, within 5 seconds, with no network

- **status:** active
- **out of scope:** CI, which fails closed on purpose

Any error in the execution of a hook — unreadable configuration, missing
dependency, timeout — results in letting it through. The enforcement that survives
a broken hook is CI; a broken hook that blocks the work is removed by the user on
day one, and then there is no enforcement at all.

## RNF-0002 — The toolkit runs on the host's Node, with no build step in the checkout

- **status:** active
- **relates-to:** ADR-0015, ADR-0025, ADR-0039
- **out of scope:** `git`; the optional containerized path of `RNF-0006`, which is an alternative and not a requirement; how the toolkit reaches the repository of whoever consumes it (`DA-0003`); the published package, which is compiled on `prepack` (`ADR-0025`) and is not what runs from the checkout; and the hooks, which run `node` directly and never the command runner

Node 24 or greater with the npm that comes with it, and a POSIX shell with
`awk` to run the command runner vendored at the repository root (`./spur`), are
the only toolchain required of whoever works on the toolkit — on Windows, Git
Bash or WSL provides the shell. `../../spur install`, run from the plugin
project (`plugins/living-docs/`), installs the dependencies with `npm ci` —
after the core's project (`plugins/ownership/`) while the toolkit depends on it
by path; `node` runs the TypeScript source straight from the checkout, with no
compiled artifact in the middle. The package published on npm is compiled on
`prepack` — that compilation exists only inside the tarball and never reaches a
development checkout.

## RNF-0003 — The toolkit root and the validated repository root are independent

- **status:** active
- **relates-to:** ADR-0003
- **out of scope:** the toolkit's distribution mechanism, which ADR-0003 deliberately does not decide

Discovering where the toolkit is and discovering which repository to validate are
two distinct questions, with answers that may coincide and must not be confused.

## RNF-0004 — The result of a check depends neither on the clock nor on the machine

- **status:** active
- **relates-to:** ADR-0007
- **out of scope:** the value of `stale-after-months`, which is project configuration

Given the same tree, the same configuration and the same date, two runs of a check
produce the same result. The date comes in by value, from the caller; no check and
no hook reads the clock from the inside.

Without this, the only possible test for what depends on time is the one that
passes today and fails in six months — and a test that fails by itself is a test
that gets deleted.

## RNF-0005 — The set of checks fits within a declared and measured time ceiling

- **status:** draft
- **out of scope:** the time of each check in isolation, and the image build time

The spec demands that the checks run "in minutes, on the PR". The ceiling belongs to
the **set**, not to each check — it is the set that runs on the PR —, is declared
in the code and is **measured** on every run, never estimated. A budget nobody
measures is an intention, and the first slow run discovers it in production.

## RNF-0006 — There is a containerized execution path, optional and in parity with the host

- **status:** active
- **relates-to:** ADR-0016
- **out of scope:** the hooks, which always run on the host (`RNF-0001`)

Whoever does not want to install Node on the host can run any toolkit maintenance
command inside a container, described in the plugin project (`plugins/living-docs/`:
`compose.yaml` and `bin/dev`). The set of commands that works through that path
is the same that works on the host, and that is so because the entry point knows
no command at all: it passes on what it received. A list of supported commands
does not exist, and what does not exist does not diverge.

The path of record remains the host (`RNF-0002`): it is the one CI reproduces on
every PR and the one the Definition of Done measures.
