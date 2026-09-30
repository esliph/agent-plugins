---
name: done-check
description: >
  Runs locally, in order, the verification sequence that CI will demand before a
  change counts as done, and reports which step failed and why. The commands are
  read from CONTRIBUTING.md at run time — this skill does not carry a copy.
disable-model-invocation: true
---

# done-check

Run on this machine what the Definition of Done measures on the host, so a
failure shows up here and not on the PR.

## Where the commands come from

The sequence lives in `CONTRIBUTING.md`, section **The environment**, in its
first `bash` block. Read it from there on every run and execute exactly what it
says, in the order it says. Do not keep a list of your own, do not rely on a
previous run, and do not "improve" a command — if the file changed, the new
version is the rule. The container path described further down that section
(`bin/dev`) is not the execution of record; do not use it unless the user asks.

If the section or the block is not there, stop and say so. Do not reconstruct
the sequence from memory, from CI workflows or from `package.json`: a missing
rule is reported, not invented.

## Before running

1. Say which branch you are on and whether the working tree has uncommitted
   changes. The checks that compare against a base look at commits, so work
   that is not committed may not be judged by them — the user should know
   that before trusting a green result.
2. If a command in the block references a git ref (for example a `--base`),
   check that the ref resolves (`git rev-parse --verify <ref>`). If it does not,
   stop and ask whether to fetch it — do not fetch on your own.

## Running

- Use the Bash tool. The block is POSIX shell (`&&`, subshells with `cd`), which
  Windows PowerShell 5.1 does not parse.
- Run from the repository root, one line of the block per call, top to bottom.
- The order is load-bearing: a later line depends on an earlier one having
  succeeded (dependencies installed, the core built before what depends on it).
  So **stop at the first failure.** Running the rest would only produce noise
  caused by the first break.
- Allow long timeouts for the lines that install dependencies and run tests.
- `ERR_MODULE_NOT_FOUND` has a known meaning described right below the block in
  `CONTRIBUTING.md` — read that note and pass it on instead of diagnosing it
  yourself.

## What you do not do

- You do not fix anything. No edit, no `--fix`, no lint autoformat, no commit.
  The output of this skill is a diagnosis; the correction is a separate request.
- You do not skip a failing line to "see if the rest passes", and you do not
  retry a failing line hoping it goes green.
- You do not declare the change done. Part of the Definition of Done
  (`docs/definition-of-done.md`) is verified by a person, not by a command; a
  green run covers only the items a check verifies.

## Report

Answer in the user's language. Keep it short:

1. One line per command that ran: ✅ or ❌ and the command as written in
   `CONTRIBUTING.md`. List the ones not run because of an earlier failure as
   "not run".
2. For the failure, the relevant excerpt of the output — the failing check or
   test name and its message, not the whole log.
3. When a failing check names a rule (for example `living-docs/commit-discipline`
   or `ownership/owner-coverage`), point to the matching line in
   `docs/definition-of-done.md` so the user sees which item is not met. Read the
   line from the file; do not paraphrase it from memory.
4. End with one verdict: **all checks passed** — and a reminder that the
   human-verified items of the Definition of Done are still open — or
   **stopped at step N**.
