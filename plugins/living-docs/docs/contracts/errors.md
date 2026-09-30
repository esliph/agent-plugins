---
title: Error catalog
owner: '@esliph/engineering'
trigger: >
  A new exit code or one with a changed meaning; a new failure class in the
  command line; a change in what a code means to whoever consumes the CLI.
last-reviewed: 2026-08-25
---

# Error catalog

What a consumer of `living-docs` observes when something goes wrong. The code is
stable and immutable in meaning; the displayable message is not part of the
contract and can change at any moment.

The check IDs (`CI-n`) are **not** here: they are generated from the registry and
live in `docs/contracts/checks.gen.md`. A code in two places is a code that has
already diverged.

| Code | Meaning | When it occurs | Transport | Public | Status |
| --- | --- | --- | --- | --- | --- |
| EXIT-0 | Nothing to fix | `validate` with no finding of `error` severity; `drift` with no drift; `init` that ran; `changelog` with no finding | exit 0 | yes | active |
| EXIT-1 | The repository violates a living-documentation rule | `validate` with at least one `error` finding, or `drift` with drift, a broken generator or a missing generated artifact; or `changelog` with a consumer-visible change carrying neither an entry nor an exception label | exit 1 | yes | active |
| EXIT-2 | The command could not even start | `docs/.ownership.yml` missing or invalid; unknown command; unknown `--stage`; no argument | exit 2 | yes | active |
| OWNERSHIP-INVALID | The ownership map is not readable as configuration | Invalid YAML, `version` other than 1, empty `artifacts`, `id-prefix` outside 2–4 capitals, `owner` without `@` | exit 2, stderr message starting with `living-docs:` | yes | active |
| BASE-UNRESOLVED | The PR diff could not be read | `changelog` without `--base`, with a base that does not resolve, or in a shallow clone that does not contain the base | exit 2, stderr message starting with `living-docs:` | yes | active |
| UNKNOWN-COMMAND | The subcommand does not exist in this version | Any word that is not `validate`, `drift`, `changelog` or `init` | exit 2, stderr message + usage | yes | active |

`EXIT-1` and `EXIT-2` are distinct on purpose: the first is the repository
failing, the second is the tool having nothing to do. A CI script that confuses
them treats broken configuration as wrong documentation, and sends people to fix
the wrong place.

<!-- Owning skill: contract-keeper. -->
