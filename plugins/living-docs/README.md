# living-docs

Documentation that does not rot. Every document in the repository — decisions,
open questions, technical debt, requirements, glossary, principles, contracts
and changelog — gets a declared owner, a trigger that says when it must be
revised, and checks that fail when it falls behind the code.

Built on [`ownership`](../ownership/README.md), which it requires.

## Install

```text
/plugin marketplace add esliph/agent-plugins
/plugin install ownership@esliph
/plugin install living-docs@esliph
```

Requires Node 24 or later on the machine.

> **Current limitation.** `living-docs` depends on the `ownership` package,
> which is not on npm yet. Installed from the marketplace, the skills, commands
> and agents load, but the hooks cannot and stay silent. The hooks and the CLI
> run in full from a checkout of this repository — see [In CI](#in-ci).

## Get started

In a Claude Code session, at the root of your project:

```text
/docs-setup @your-team
```

It takes stock of the documentation that already exists (an `adr/` folder, a
`requirements.md`, an exported wiki), adopts it instead of creating a parallel
copy, and writes `.ownership.yml`, the folders, `CODEOWNERS` and the CI
workflow for the stage you choose.

## Stages

Install only what the project needs today; each stage includes the previous one.

| Stage        | Adds                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `solo`       | Decision records (ADRs), open decisions and technical debt.                                                                     |
| `small-team` | Requirements (functional, non-functional, business rules), `CONTRIBUTING.md`, definition of done, glossary and principles.      |
| `production` | Error catalog, versioning policy, `CHANGELOG.md`, release notes, deprecations and migration guides.                             |
| `multi-team` | CI checks on the branch diff: code that changed without its document, and a consumer-visible change missing from the changelog. |

## Commands

| Command          | What it does                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `/docs-setup`    | Creates or updates the documentation frame; run it again when the project moves to another stage. |
| `/adr`           | Records an architecture decision as a draft, or supersedes an accepted one.                       |
| `/open-decision` | Records a question nobody has answered yet, and stops the implementation that depends on it.      |
| `/debt`          | Records a shortcut taken on purpose, with an observable trigger for paying it.                    |
| `/term`          | Adds or updates a glossary term.                                                                  |
| `/release`       | Moves the `## [Unreleased]` entries of the changelog into a version and derives its release note. |
| `/docs-audit`    | Lists what a change should have updated in the documentation and did not.                         |

Requirements, working agreements, principles and contracts have skills of their
own too. Claude picks them from the conversation — there is no command to
remember.

Two agents review without editing anything: one tries to refute a decision,
a principle change or a debt record before you approve it; the other reads a
diff and points to each document it left behind.

## In the session

| When                                                                       | The hook                                                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A session starts                                                           | Summarizes open decisions, debts whose trigger has been met, overdue documents and missing ones. |
| You edit an accepted decision or a published release note                  | Blocks it: a frozen record is superseded by a new one, never rewritten.                          |
| A decision's status is promoted (for example, `draft` to `accepted`)       | Asks you: accepting is a human call.                                                             |
| You edit a path that an open decision has put on hold                      | Asks before the edit.                                                                            |
| You leave a `TODO`, `FIXME`, a lint or type suppression, or a skipped test | Reminds you to record it as debt.                                                                |

Only frozen records are blocked. When the toolkit cannot run, every hook stays
silent — CI is the layer that still holds.

## In CI

`/docs-setup` installs `.github/workflows/living-docs.yml` once and never
rewrites it. At every stage it runs:

```bash
ownership validate     # owners, declared states, generated files
living-docs validate   # frontmatter, unique IDs, links between documents, overdue documents
```

From `multi-team` on, both also run with `--base <ref>` against the pull
request diff: code that changed without its document, a consumer-visible change
missing from the changelog, a path held by an open decision, and a commit that
touches a record without citing its ID.

Until the packages are on npm, run the CLI from a checkout of this repository
and point it at your project:

```bash
(cd plugins/ownership && npm ci)
cd plugins/living-docs && npm ci
LIVING_DOCS_REPO_ROOT=/path/to/project \
  node --conditions=development plugin/src/cli/index.ts validate
```

The same form runs `init`, the command behind `/docs-setup`:

| Option                           | Effect                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `--stage <stage>`                | `solo` (default), `small-team`, `production` or `multi-team`.                                  |
| `--owner <@team>`                | Owner written in the documents it creates.                                                     |
| `--id-separator`, `--id-padding` | How IDs are written (default: a dash and four digits), to match what the project already uses. |
| `--invoke`, `--invoke-ownership` | How the installed workflow calls each CLI (default `npx living-docs` and `npx ownership`).     |
| `--marketplace <owner/repo>`     | Also registers the plugin in the project's `.claude/settings.json`.                            |
| `--dry-run`                      | Shows what it would create, without writing.                                                   |

## Not covered

Architecture diagrams, threat models, runbooks, SLOs, postmortems, event
catalogs, long RFCs and per-feature specs. To add one, declare its path in
`.ownership.yml` and give it an owning skill.
