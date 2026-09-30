---
id: ADR-0006
title: Where CI-6 gets the diff from, what counts as an exception label, and where it runs
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-26
relates-to: [RF-0008, RN-0013]
supersedes: null
superseded-by: null
---

# ADR-0006 — Where CI-6 gets the diff from, what counts as an exception label, and where it runs

## Context

Phase 6 (spec §10) delivers `CI-6`: "diff touches `consumer-visible-paths` with
no entry in `Unreleased` and no exception label" (§9). It is the first check that
is not content with the state of the tree — it needs to know **what changed**
relative to something. Three questions were left without a written answer, and
all three change the engine:

1. **Where does the diff come from?** `git diff` against what, and what happens
   outside a CI, where there is no "PR base".
2. **What is the "exception label"?** Spec §5 (`SK-7`, rule 2) mentions it as a
   legitimate way out and **does not define the format**. Without a format,
   `CI-6` either has no escape — and then an internal change on a public path
   blocks the PR — or has an escape nobody can trigger.
3. **Where does `CI-6` run?** `validate` receives no base, and inventing one
   would be guessing.

## Alternatives considered

### Where the diff comes from

**The working tree (`git status`) or the index (`git diff --cached`).**
Discarded: it is what `HK-5` already does, and at the right point — before the
commit. A CI check that looks at the working tree looks at a clean tree and sees
nothing.

**`git diff <base>..HEAD` (two dots).** Discarded: it shows the difference
between the two states, so everything that entered the base after the branch left
it appears as if the branch had changed it. A PR would be charged for a file it
did not touch.

**`git diff <base>...HEAD` (three dots), with the base received as an argument.
Chosen.** Three dots starts from the _merge-base_: it is exactly "what this
branch changed". The base comes from `--base <ref>` because no default is
honest — `origin/main` does not exist in every repository, and a wrong default
produces a check that fails the whole PR or fails nothing.

### The exception label

**A PR label (GitHub, GitLab).** Discarded: it requires network, and the toolkit
has no network in any hook (`RNF-0001`); worse, it requires a specific provider,
and the toolkit knows no provider. A label also **dies with the PR**: six months
later nobody knows why that change had no entry.

**A versioned exception file (`.changelog-skip`).** Discarded: a file that has to
be created and deleted on every PR becomes forgotten litter in the tree, and the
forgetting turns the check off silently.

**A line in the commit message, in the form `Changelog: none — <reason>`.
Chosen.** It is in version control, travels with the change forever, is readable
through `git log` with no network or provider, and is the same _trailer_ form the
repository itself already uses for commit attribution. The reason is
**mandatory**: a label with no reason is a ticked box, and a ticked box is the
beginning of the dead wiki.

### Where `CI-6` runs

**Inside `living-docs validate`, with an optional `--base`.** Discarded:
`validate` is the reading of the tree and is called in-process by the test suite;
a flag that changes the nature of the command makes the command lie about what it
verified when the flag is absent.

**Together with `living-docs drift`.** Discarded: `drift` means generated
contract drift (`ADR-0005`). Pushing `CI-6` there would force `drift` to carry a
`--base` it does not use.

**A subcommand of its own, `living-docs changelog --base <ref>`. Chosen.**

## Decision

1. **The diff comes from `git diff --name-only -z <base>...HEAD`**, three dots,
   with `-c safe.directory=*` for the same reason as `src/git/staged.ts`: the
   hook and the check run in the container with a different uid from the owner of
   the mounted checkout (`ADR-0003`). `-z` because a path with an accent comes
   out escaped without it, and an escaped path matches no glob.
2. **The messages come from `git log --format=%B%x00 <base>..HEAD`**, two dots:
   here the question is "which commits did this branch add", and not "what is the
   content difference".
3. **`src/git/diff.ts` does not fail open.** A git error becomes a `GitError`, and
   the caller decides. It is the inverse of `src/git/staged.ts` on purpose: there
   the caller is a hook, and the cost of failing closed is blocking the work;
   here the caller is a check, and the cost of failing open is a broken contract
   passing with the authority of a green CI.
4. **The exception label is `Changelog: none — <reason>`** in any commit of the
   range. The accepted separator is an em dash, hyphen or colon; the reason is
   mandatory and non-empty. `Changelog: none` alone does **not** count, and the
   check's message says so.
5. **The trigger of `CI-6` is `consumer-visible-paths`** (spec §9). **The target
   doc comes from `watches`**, from the rules marked `consumer-visible: true` —
   the toolkit does not know the path `CHANGELOG.md` and will not come to know it
   (spec §3: "hooks and checks know no path: they read from here"). Declaring
   `consumer-visible-paths` with no rule marked is a configuration error, and
   `CI-6` reports it as a finding instead of staying quiet.
6. **The entry must be in the same diff.** It is not enough for
   `## [Unreleased]` to be filled in: the target doc has to be among the paths
   that changed **and** the section has to have at least one item. Without that,
   the entry an earlier PR left there would satisfy every following PR — it is
   the same reason as `RN-0008`.
7. **`CI-6` runs in `living-docs changelog --base <ref>`.** Without `--base`, the
   command does not guess: it says what is missing and exits with 2. `validate`
   prints a pointer to the subcommand when `consumer-visible-paths` is not empty,
   for the same reason it already points to `drift`.

## Consequences

### What we gain

- `CI-6` is a pure function of (diff, configuration, file) → findings: no git
  inside the check, testable with hand-written diff facts.
- The escape exists, is in the history and carries the reason. Whoever audits six
  months later reads `git log` and knows why there was no entry.
- `validate` remains reading, remains callable in-process, and remains running
  nothing.

### What we accept to lose

- Whoever runs the check has to know the base. In CI that is a provider variable;
  locally it is `git merge-base` by hand. It is the price of not guessing.
- `actions/checkout` needs `fetch-depth: 0` so that the base exists in the clone.
  A shallow clone makes the command exit with 2 instead of lying — it is the
  right behavior, but it is an installation gotcha, and it is written in the
  workflow.
- `consumer-visible-paths` and the `watches` rules marked
  `consumer-visible: true` are two lists that have to agree. They are two
  different moments (the reminder on edit and the barrier on the PR) and a
  project may legitimately want one without the other; in this repository, a
  dogfooding test enforces the equality of the two instead of letting them
  drift.
