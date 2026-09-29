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

## RF-0001 — `validate` fails the build when there is an error, and only then

- **status:** active
- **out of scope:** the format of the output

`living-docs validate` exits with code 1 if any check produced a finding of
`error` severity, and 0 otherwise. A warning does not fail the build — an ignored
warning is the beginning of the dead wiki, and that is why almost nothing is a
warning.

## RF-0002 — `init` is idempotent and adopts what already exists

- **status:** active
- **out of scope:** migrating the content of the adopted artifact to another format

Running `living-docs init` twice does not duplicate a file, does not rewrite
existing content and does not renumber an ID. Finding an equivalent artifact under
another path, it adopts it in `.ownership.yml` instead of creating a parallel one.

## RF-0003 — `init` installs the stage's set, and says what it did not install

- **status:** active
- **out of scope:** choosing the stage, which is human judgment

`living-docs init --stage <stage>` installs only the frame the stage asks for, and
explicitly lists what was left out.

## RF-0004 — `init --stage small-team` installs the working agreements

- **status:** active
- **relates-to:** RF-0002
- **out of scope:** filling in `watches`, which requires knowing the project's code and is a human act

At the `small-team` stage, `living-docs init` creates `CONTRIBUTING.md`, the
Definition of Done and the agent contract. Finding `AGENTS.md`, it adopts it as the
contract instead of creating a parallel `CLAUDE.md`; finding any of them already
written, it keeps the content intact.

What the command does **not** do is invent `watches`: a code→doc link that nobody
recognizes is noise that teaches people to ignore the reminder.

## RF-0005 — `init --stage small-team` installs the language and intent frame

- **status:** active
- **relates-to:** RF-0004
- **out of scope:** the real content of the terms and principles — the seed is the format, not the vocabulary of this or any other project

At the `small-team` stage, `living-docs init` creates `docs/glossary.md`,
`docs/charter/constitution.md` and `docs/charter/vision.md` from the templates,
with the same idempotence and the same adoption policy as the other artifacts: it
does not recreate what exists, it does not rewrite user content.

## RF-0006 — `living-docs drift` compares the generated artifact with the generator output

- **status:** active
- **relates-to:** ADR-0005
- **out of scope:** generating the artifact — `drift` compares, never writes

For each entry of `generated[]` in `.ownership.yml`, `living-docs drift` runs
`command`, compares the standard output with the file at `path` and exits with code
1 if there is a difference, if the generator fails, or if the declared file does not
exist. With no entry declared, it says so and exits with 0.

`living-docs validate` does not run this comparison; when there is a declared
generated artifact, it points to the subcommand that does.

**Proposed revocation.** With living-docs built on the core (`ADR-0029`,
`ADR-0030`), the comparison becomes the job of `ownership validate`, and
`living-docs drift` ceases to exist. This requirement describes a command that is
going away, and the revocation (`active → revoked`) is a human act.

## RF-0007 — `init --stage production` installs the contracts frame

- **status:** active
- **relates-to:** RF-0005
- **out of scope:** declaring the generator — `generated[]` is born empty, with a
  commented example, for the same reason `watches` is born empty (`RF-0004`)

At the `production` stage, `living-docs init` creates, in addition to everything
`small-team` creates, `docs/contracts/errors.md` and
`docs/contracts/versioning-policy.md` from the templates, with the same idempotence
and the same adoption policy as the other artifacts.

From `RF-0009` on, `production` also installs the Phase 6 historical-trail frame —
the list of what the stage asks for and does not install is empty.

## RF-0008 — `living-docs changelog --base <ref>` enforces the CHANGELOG entry

- **status:** active
- **relates-to:** ADR-0006
- **out of scope:** writing the entry — the command enforces, never drafts

`living-docs changelog --base <ref>` compares `<ref>...HEAD`, and fails with code 1
when some changed path matches `consumer-visible-paths` and the same diff carries
neither the doc marked `consumer-visible: true` in `watches` with at least one item
under `## [Unreleased]`, nor the exception label with a reason in some commit
message of the range.

With no `consumer-visible-paths` declared, it says so and exits with 0. Without
`--base`, it exits with 2 — the diff base is not guessed. `living-docs validate`
does not make this comparison; when there is a declared `consumer-visible-paths`,
it points to the subcommand that does.

**Proposed revocation.** With living-docs built on the core (`ADR-0029`,
`ADR-0030`), the enforcement becomes the job of `ownership validate --base`, which
reads the `watches` rules marked `consumer-visible: true`, and `living-docs
changelog` ceases to exist; so does `consumer-visible-paths`. This requirement
describes a command that is going away, and the revocation (`active → revoked`) is
a human act.

## RF-0009 — `init --stage production` installs the historical-trail frame

- **status:** active
- **relates-to:** RF-0007
- **out of scope:** declaring `watches` rules with `consumer-visible: true`,
  which are born empty with a commented example for the same reason `watches` and
  `generated[]` are born empty (`RF-0004`)

At the `production` stage, `living-docs init` creates, in addition to everything it
already created, `CHANGELOG.md`, `docs/deprecations.md`, `docs/releases/` and
`docs/migrations/` from the templates, and declares `REL` as an `owned` entry with
`living-docs.id-prefix: REL` — with the same idempotence and the same adoption
policy as the other artifacts.

The list of what the stage asks for and does not install is empty: `production`
covers Phases 5 and 6 of spec §10, and both exist.

## RF-0010 — `validate` runs the tree-state checks, and a warning does not fail

- **status:** active
- **relates-to:** ADR-0007, ADR-0008
- **out of scope:** the half that depends on the diff (`living-docs/open-decision-claim`), which comes in through `--base` and is `RF-0011`

One `validate` run executes all the checks that are content with the state of the
tree — today `living-docs/frontmatter`, `living-docs/id-integrity`,
`living-docs/citation-coverage`, `living-docs/staleness`,
`living-docs/agent-contract-duplication`, `living-docs/done-verifiable` and
`living-docs/links` — and reports the findings of the seven together. A finding of
`error` leads to exit code 1; a `warning` finding is reported and does **not**
change the exit code.

When there is something `validate` does not verify — a generated artifact, a
CHANGELOG entry, the branch diff —, it prints the pointer to the command that
verifies it. A check that does not run and does not warn that it did not run is
faked coverage.

## RF-0011 — `validate --base <ref>` enforces the owning doc of the watched path that changed

- **status:** active
- **relates-to:** ADR-0010, RN-0021
- **out of scope:** the CHANGELOG entry, which is `ownership/consumer-change-logged` and has a command of its own

With `--base <ref>`, `living-docs validate` adds the verification that depends on
the diff and that remains its own: a path claimed by an open decision and changed
between the base and `HEAD` fails. The enforcement of the owning doc of the watched
path that changed becomes the job of `ownership validate --base`, and living-docs
stops doing it. Without `--base`, the diff verification does not run and the command
says it did not run.

The base is not guessed. Without it, the command does not pick one on its own:
picking wrong would produce a finding about a change that is not this branch's.

## RF-0012 — `init` declares every document it installs

- **status:** active
- **relates-to:** ADR-0008, RN-0016
- **out of scope:** the `watches` link, the generator and the `consumer-visible: true` rules, which `init` still does not invent (`RF-0004`)

Every document `init` writes that has no ID family is declared in `owned`, with an
owner, the `living-docs:` block without `id-prefix` and — when there is one — the
owning skill. An `init` that creates a document without declaring it delivers, on
its first run, a repository that fails its own `ownership/owner-coverage`.

This holds at every stage: an owner is not a function of maturity. What changes
with the stage is **which** documents exist.

## RF-0013 — `init` installs the stage's enforcement, merging with what already exists

- **status:** draft
- **relates-to:** ADR-0012, ADR-0030
- **out of scope:** the way the CLI is invoked inside the workflow, which is a parameter of whoever installs (`DA-0003`); and `.claude/settings.json` and the installed workflow, which are not documentation and therefore do not enter `documents:`

In addition to the frame, `living-docs init` writes the two pieces of enforcement:
the stage's CI workflow and the plugin registration that turns the hooks on in the
session. Both come in by **merge**: a repository with workflows of its own and hooks
already registered keeps everything it has, and the toolkit adds what is missing and
nothing more. Running twice does not duplicate an entry — idempotence holds for
enforcement just as it holds for the document.

The installed workflow runs both CLIs, the `ownership` one and the living-docs one.
`--invoke-ownership` says how to call the first, and the default is `npx ownership`.

A repository with documents and no check running is the promise this toolkit
refuses: enforcement is what makes the rule hold.

## RF-0014 — The inventory reports the written form of IDs, and does not adopt it silently

- **status:** draft
- **relates-to:** ADR-0011, RN-0024
- **out of scope:** converting IDs from one form to another, which is rewriting what pre-exists

`living-docs init --dry-run` in a repository whose IDs are not in the default form
reports which form it found and how many items it read in that form. Declaring the
form is the act of whoever installs, not of the inventory: silent adoption of a
format is the same class of error as silent adoption of a path, and `SK-0` already
refuses the latter.

## RF-0015 — `init` marks as external what is written for readers from the outside

- **status:** draft
- **relates-to:** RF-0009, RF-0012, RN-0030
- **out of scope:** the `README.md` of whoever installs, which `init` does not declare as documentation and does not start declaring because of this

From the `production` stage on, a new installation declares `CHANGELOG.md`,
`docs/deprecations.md`, `docs/migrations/` and the `REL` artifact with
`audience: external`. It is the historical trail, and it is written for whoever
consumes.

In a repository that already declares these entries without the mark, `init` does
not rewrite the line: it reports, among what it did not install, each entry declared
without the mark, saying that marking it is what turns the verification on for it.
It is the same policy as when it adds to `.ownership.yml` and to CODEOWNERS: what is
already written belongs to whoever wrote it.

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
