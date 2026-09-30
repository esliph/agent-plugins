---
title: Functional requirements
owner: '@esliph/engineering'
trigger: >
  Before implementing any behavior of this family, and on every new or changed
  rule.
last-reviewed: 2026-09-18
---

# Functional requirements

Each requirement is a section with a citable ID. Format: `templates/requirements.md`.

## RF-0016 — `ownership validate [--base]` verifies owner, lifecycle, trigger and generated

- **status:** draft
- **relates-to:** ADR-0019, RN-0032, RN-0034, RN-0035, RN-0037
- **out of scope:** the checks of ID family, freezing, staleness and citation, which remain in `living-docs validate`

The `ownership validate` command verifies the owner, lifecycle, trigger and
generated artifact of the whole repository. With `--base <ref>`, it restricts the
watch verification (`watches`) to the paths that changed since the given ref,
without restricting owner coverage, which never prunes.

## RF-0017 — `ownership explain <path>` answers which file and which entry cover a path

- **status:** draft
- **relates-to:** ADR-0019, ADR-0023, RN-0034
- **out of scope:** explaining coverage of ID family or freezing — questions for living-docs, not for the core

For a given path, `ownership explain <path>` answers which `owned` entry covers it
and which ownership file it comes from. When no entry covers the path, it answers
which ownership file has a base that contains it — the same question that is left
to answer when owner coverage fails.
