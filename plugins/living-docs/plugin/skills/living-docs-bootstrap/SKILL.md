---
name: living-docs-bootstrap
description: >
  Use when someone says "we have no documentation at all", "where do I record
  this?", "this project has no ADR", "I want to start documenting properly",
  "install the living documentation toolkit here", "where is .ownership.yml?",
  when a command or hook complains that `.ownership.yml` does not exist, or
  when the project changes maturity stage (became a team, went to production,
  became multiple teams) and the current frame gets too small. Also when
  documentation exists scattered under another name (`adr/`, `rfc/`,
  `requirements.md`, an exported wiki) and someone wants to bring it inside
  the enforcement without duplicating it.
---

# living-docs-bootstrap — owner of the frame and the enforcement

## Overview

This skill assembles the **frame**: the ownership map, the directories, the
templates and the installation of `HK-*`/`CI-*`. It does not write the content
of any artifact — whoever writes ADR, DA and TDR is `decision-recorder`.

The **mechanical** work (creating the files, adopting a pre-existing path,
filling `.ownership.yml` from the template) belongs to the CLI:
`living-docs init [--owner @handle] [--dry-run]`. Do not reproduce here the
format of `.ownership.yml` or the content of the templates — they live in
`templates/ownership.yml`, `templates/open-decisions.md`, `templates/CODEOWNERS`
and `templates/ids-retired.txt`, and `init` is the only thing that writes them.
What is yours is the **judgment**: what already exists, which stage, what stays
out.

Running twice must not duplicate a file, rewrite content or renumber an ID.
After the first run, the paths come from `.ownership.yml` — not from a new
scan.

## What you own

| Artifact                      | What it is                                                                  | Shape                                                                            |
| ----------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `.ownership.yml`              | The only project-specific file: paths, owners, prefixes, `watches`          | Single file, mutable                                                             |
| The directory structure       | Where each artifact lives                                                   | Directories + `.gitkeep`                                                         |
| `docs/ids-retired.txt`        | Register of retired IDs, which never come back                              | Single file, append-only                                                         |
| `CODEOWNERS`                  | The owner of each doc path, mirroring `owner:`                              | Single file                                                                      |
| Installation of `HK-*` and `CI-*` | The enforcement of the stage's phases                                   | Workflow in `.github/workflows/` + plugin registration in `.claude/settings.json` |

## When to use / when not to

**Use** to: assemble the frame in a project that has none; adopt documentation
that already exists under another name; reinstall when the maturity stage
changes.

**Do not use** to: write the content of an artifact (→ `decision-recorder` and
the other owning skills); create a phase artifact the stage does not ask for —
installing too much is the fastest path to "twenty four-hundred-line
documents"; "organize" existing documentation by moving files around without
recording the adoption.

**Never** use it to create an artifact parallel to one that already exists. A
duplicate is the most expensive anti-pattern on the list: two owners for the
same truth is guaranteed divergence.

## Procedure

1. **Take inventory before creating.** Scan the repository for artifacts that
   already exist under another name or path (`decisions/`, `adr/`, `rfc/`,
   `requirements.md`, `spec/`, an exported wiki). Run
   `living-docs init --dry-run` and read the `adopted` lines — if something you
   saw in the repository does not show up there, it is you who decides to adopt
   it, recording the real path in `.ownership.yml`. **Never** create a
   parallel one.

   Read the `format` line too: when the repository writes IDs another way
   (no separator, or a different number of zeros), the inventory says which
   form it found and how many occurrences it read in it. **Confirm with the
   repository owner** and declare it with `--id-separator` and `--id-padding` —
   never renumber what already exists to fit the toolkit's pattern.

2. **Determine the stage** — `solo` (prototype), `small-team` (small team),
   `production` (production with users) or `multi-team` (multiple teams) — and
   derive the **minimum** set of phases. The four names are the ones
   `living-docs init --stage` accepts. Do not install what the stage does not
   ask for, and say out loud which stage you concluded and why.
3. **Run `living-docs init --owner <@handle>`** to write the frame. It creates
   only what is missing and keeps what exists. Then **review by hand** the
   generated `.ownership.yml`: the owners must be the real owners, and the
   `watches` (code → owning doc) must reflect the real structure of the code —
   the template knows nothing about that.
   - **`documents:`** declares what has an owner and no ID family
     (`CONTRIBUTING.md`, the Definition of Done, the agent contract, the
     glossary, the charter, the CHANGELOG, and whatever else the project has).
     `artifacts:` still requires `id-prefix`; `living-docs/frontmatter`,
     `living-docs/id-integrity` and `living-docs/append-only` do not read
     `documents:`, while `living-docs/staleness` and
     `living-docs/agent-contract-duplication` do.
4. **Install in the order of the phases.** Frontmatter +
   `living-docs/frontmatter` first: without a machine contract nothing else is
   enforceable. Only then `living-docs/id-integrity`, the hooks and the owning
   skills.
5. **Register the index in the agent contract** (`AGENTS.md`/`CLAUDE.md`, via
   `working-agreements-keeper`): which artifact answers what and which skill
   owns it. Only the index — no copied content.
6. **Confirm idempotence**: run `living-docs init` a second time and check that
   nothing was created, nothing was rewritten and no path was re-adopted.
7. **Run `living-docs validate`** and do not deliver with an open finding.
8. **Deliver in a single PR**, with the trigger matrix filled in (each installed
   artifact, its `trigger` and its owning skill) and the **explicit list of what
   was left out and why** — what was left out without justification comes back
   as a surprise.
9. **Cite in the commit message** the IDs of the installed pieces
   (`living-docs/frontmatter`, `living-docs/append-only`, …).

## Boundaries

| Yours                                                 | Not yours                                             |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Deciding the stage and the minimum set of phases      | Writing the content of an artifact                    |
| Adopting what already exists, recording the real path | Moving or renaming existing documentation for aesthetics |
| Filling in real owners and `watches` in `.ownership.yml` | Reproducing the `.ownership.yml` format in this skill |
| Installing `HK-*`/`CI-*` in the order of the phases   | Installing a phase the stage does not ask for         |
| Pointing `living-docs init` at the mechanical work    | Reimplementing `init` in prose                        |
| Listing what was left out and why                     | Deciding that what was left out never comes in        |

## Checklist

- [ ] The repository was inventoried and no pre-existing artifact was duplicated or overwritten — verification: human
- [ ] Every adopted path is declared in `.ownership.yml`, and no artifact has two owners — `living-docs/frontmatter`
- [ ] Every collected artifact has complete frontmatter — `living-docs/frontmatter`
- [ ] The declared owners mirror `CODEOWNERS` — verification: human
- [ ] Every `trigger` names an observable event, never a cadence — verification: human
- [ ] `docs/ids-retired.txt` exists and no ID was recycled or renumbered — `living-docs/id-integrity`
- [ ] The written form of the IDs was confirmed with the repository owner, and no pre-existing ID was rewritten — verification: human
- [ ] The installed hooks are those of the stage's phases, and fail open — `living-docs/append-only`, `living-docs/state-promotion`
- [ ] `living-docs init` run twice did not create, rewrite or re-adopt anything — verification: human
- [ ] `living-docs validate` passes with no finding — `living-docs/frontmatter`, `living-docs/id-integrity`
- [ ] The PR carries the trigger matrix and the list of what was left out and why — verification: human
