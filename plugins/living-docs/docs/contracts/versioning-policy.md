---
title: Versioning policy
owner: '@esliph/engineering'
trigger: >
  A change to the public interface of the CLI, of the checks or of
  `.ownership.yml`; a decision to deprecate something published; a change to the
  policy itself.
last-reviewed: 2026-09-15
---

# Versioning policy

The policy around the contract. The contract itself — the table of checks — is
generated (`docs/contracts/checks.gen.md`) and is not written by hand.

## What is public

- The IDs of the checks (`CI-n`), of the hooks (`HK-n`), of the skills (`SK-n`)
  and of the commands (`CM-n`), and what each one means.
- The subcommands of the CLI (`validate`, `drift`, `changelog`, `init`), their
  options, and the exit codes in `docs/contracts/errors.md`.
- The schema of `docs/.ownership.yml` with `version: 1`: the names of the keys and
  what each one requires.
- The generator contract: `generated[].command` prints to standard output and does
  not write a file (`ADR-0005`).
- The exception label `Changelog: none — <reason>` and the keys
  `consumer-visible-paths` and `watches[].consumer-visible` of
  `docs/.ownership.yml` (`ADR-0006`).
- The `audience` key of `documents:` and of `artifacts:` in
  `docs/.ownership.yml`, and the two values it accepts: `internal`, which is the
  default, and `external`, which marks text written for readers from the outside
  (`ADR-0017`).

What is not on this list can change without notice — the structure of `src/`, the
text of the messages, the exact format of the output of `validate`.

## What never changes meaning

A published identifier is neither reused nor redefined. `living-docs/staleness` never
starts measuring something else; `EXIT-2` never becomes "validation failed". When
the meaning has to change, the old identifier gets `deprecated` and a replacement
is born beside it — it is the same rule that `docs/ids-retired.txt` imposes on
artifacts, applied to the interface.

## How to deprecate

Four things, without exception: the announcement date, the removal version or
date, a replacement, and the link to the migration guide. If any is missing, it
is not a deprecation — it is a compatibility break, and it goes through an ADR.

The trail is complete: `CHANGELOG.md` records the announcement,
`docs/deprecations.md` keeps the four required things, `docs/migrations/`
receives the guide, and `docs/releases/` the note of the version that removed it.
Owning skill: `release-historian`.

## Who decides

A compatibility-breaking change goes through an ADR, with the alternatives and
what we accept to lose. Accepting is a human act (`RN-0005`).

<!-- Owning skill: contract-keeper. -->
