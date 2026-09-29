# living-docs

A **living-documentation** toolkit and Claude Code plugin. It keeps the
documentation of a repository — decisions (ADRs), open decisions, technical debt,
requirements, glossary, principles, contracts and version history — with a
**declared owner**, a **trigger** (when each document needs to change) and
**automatic verification**, so that it does not rot for lack of someone
responsible or of the right moment to update.

It is built on the [`ownership`](../ownership/README.md) plugin, which it depends
on for the owner, the lifecycle and the code→doc link of each path.

## How it works

One file per repository, `.ownership.yml`, says whose each document is and what
triggers its update. On top of that, two layers of verification:

- **Local git hooks** (through the Claude Code plugin): they remind, ask or block
  at the moment of the edit and of the commit.
- **CI checks**: they run in the pipeline in seconds and keep holding even for
  edits made straight from the browser, with nobody around.

The toolkit runs on the host's Node: `npm ci` once at the repository root, and
`node --conditions=development packages/living-docs/src/cli/index.ts` from then
on. There is no build step between editing and running.

## Prerequisites

- Node 24 or greater, with npm.
- Claude Code, to use the plugin part (skills, commands and hooks).

## Installation and first use

From the root of this repository:

```bash
npm ci                                          # installs the dependencies
node --conditions=development packages/living-docs/src/cli/index.ts init --stage solo         # creates the initial structure of folders and files
node --conditions=development packages/living-docs/src/cli/index.ts validate                  # verifies the repository's documentation
```

Without `LIVING_DOCS_REPO_ROOT`, the CLI validates the **working directory** —
running from the root of this checkout, it validates the repository itself: the
toolkit uses itself as a test.

Available commands:

| Command                                                                                     | What it does                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --conditions=development packages/living-docs/src/cli/index.ts init --stage <stage>`  | Creates the stage's initial structure and declares in `.ownership.yml` what it created.                                                                                                                                                                                                             |
| `node --conditions=development packages/living-docs/src/cli/index.ts validate`              | Verifies frontmatter, unique IDs, traceability between documents, expired documents and links.                                                                                                                                                                                                      |
| `node --conditions=development packages/living-docs/src/cli/index.ts validate --base <ref>` | In addition to the above, compares with the branch diff: a path claimed by an open decision, and commits that do not cite the affected ID.                                                                                                                                                          |
| `node --conditions=development packages/ownership/src/cli/index.ts validate [--base <ref>]` | Verifies the owner of every file, the declared state, whether the generated document is up to date and the code→doc link; with `--base`, compares with the branch diff: code that changed without the owning document, and a change visible to whoever consumes without an entry in `CHANGELOG.md`. |

Options of `init`: `--owner <@team>` sets the owner declared in the documents
created; `--dry-run` shows what would be created without writing; `--id-separator`
and `--id-padding` adjust the written form of IDs to what the repository already
uses; `--invoke` sets the command that runs the CLI in your pipeline.

## Maturity stages

`init` installs only the set each stage asks for, and each stage includes the
previous ones:

| Stage        | Adds                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `solo`       | Decisions (ADRs), open decisions and technical debt.                                                                                                                             |
| `small-team` | Requirements (functional, non-functional and business rules), working agreements (`CONTRIBUTING.md`, definition of done), glossary and principles.                               |
| `production` | Contracts (error catalog and versioning policy) and version history (`CHANGELOG.md`, release notes, deprecations and migration guides).                                          |
| `multi-team` | The CI verification that compares with the branch diff — document and code that need to change together, and a change visible to whoever consumes with no record in the history. |

Every document created is declared in `.ownership.yml`: a document with no owner
fails the verification.

## Validating another project

The toolkit's source and the validated repository are independent roots, and
neither is deduced from the other: the first comes from the path of the code
itself, the second from the working directory or from `LIVING_DOCS_REPO_ROOT`.

```bash
LIVING_DOCS_REPO_ROOT=/path/to/project node --conditions=development packages/living-docs/src/cli/index.ts init --stage small-team --owner @team
LIVING_DOCS_REPO_ROOT=/path/to/project node --conditions=development packages/living-docs/src/cli/index.ts validate
```

## The Claude Code plugin

This directory is, at the same time, the CLI package and the plugin: it brings
skills, commands and hooks, and the code the hooks run.

**Skills and commands:**

| Command                           | Skill                                                                                   | Role                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `/adr`, `/open-decision`, `/debt` | `decision-recorder`                                                                     | Records decisions, open decisions and technical debt.                 |
| `/docs-setup`                     | `living-docs-bootstrap`                                                                 | Prepares `.ownership.yml` and the structure.                          |
| `/term`                           | `glossary-keeper`                                                                       | Maintains the domain vocabulary.                                      |
| `/release`                        | `release-historian`                                                                     | Maintains `CHANGELOG.md`, release notes, deprecations and migrations. |
| `/docs-audit`                     | `docs-divergence-auditor`                                                               | Points out what a diff should have updated and did not.               |
| —                                 | `requirements-keeper`, `working-agreements-keeper`, `charter-keeper`, `contract-keeper` | Selected by description, with no command of their own.                |

**Hooks:** they block the editing of a document that was already accepted; they
require a person's approval to promote the state of a decision; they ask before
an edit to a path that an open decision has claimed; they remind you
when a new shortcut (`TODO`, `FIXME`, a type or lint suppression, an ignored test)
is left with no debt record nearby; and, at the start of the session, they inject
an inventory of what is declared and absent, of the open decisions, of the debts
with their trigger met and of the expired documents. The reminder after editing
watched code and the question before a commit that carries code without its
owning document come from the `ownership` plugin. The hooks that remind and ask
never block; when the toolkit cannot run, no hook blocks anything — the layer
that survives that is CI.

**Agents** (isolated context, no permission to edit): one tries to refute an ADR,
an amendment of principles or a debt record before human approval; the other
receives a scope and answers what that diff failed to update, pointing to the
owning document of each finding.

## What is left out

Layers deliberately not covered: C4/ERD/threat model, runbooks/SLO/postmortems,
event catalog, long RFCs and per-feature feature specs. The path to add them is
the same extension point: an entry in `.ownership.yml` and an owning skill.
