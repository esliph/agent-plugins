---
title: How to contribute here
owner: '@esliph/engineering'
trigger: >
  When how we work here changes — and every time a person or an agent went
  wrong for lack of context that would have fit on this page.
last-reviewed: 2026-08-27
---

# How to contribute

This repository is the living-documentation toolkit and is also its first
consumer. Everything it requires of a project, it fulfils.

## The environment

Each plugin is a project under `plugins/<name>/`, with its own toolchain. The
root has none. For the two current plugins, Node 24 or greater with its npm, and
a POSIX shell with `awk` to run `./spur` — on Windows, Git Bash or WSL
(`RNF-0002`). Every command is a task of `./spur`, the runner vendored at the
root (`ADR-0039`): `./spur --list` shows the root's tasks, and `../../spur --list`
from a plugin project shows that plugin's. Dependencies come in with
`./spur install`, which installs the core first while living-docs depends on it
by path:

```bash
./spur install
./spur plugins
./spur validate
./spur validate origin/master
./spur marketplace
```

A command that fails with `ERR_MODULE_NOT_FOUND` is a command run before
`./spur install` — it is not the environment that is wrong.

### Optional: running living-docs through the container

Whoever does not want to install Node on the machine has a second path (`RNF-0006`,
`ADR-0016`). From `plugins/living-docs/`, `bin/dev` runs any maintenance command
inside the container, and brings the container up by itself when it is not up:

```bash
bin/dev ../../spur test
bin/dev ../../spur typecheck
bin/dev node --conditions=development plugin/src/cli/index.ts validate
bin/living-docs validate     # the same, through the CLI wrapper
bin/dev                      # a shell inside the container
```

It requires the Docker daemon, and the first invocation builds the image. On
Windows, invoke it through Git Bash, through WSL, or with `bash bin/dev …` from
PowerShell.

Two things this path is **not**. It is not the execution of record: what CI
reproduces on every PR and what the Definition of Done measures remains the host.
And it does not cover the hooks, which always run on the host (`RNF-0001`) — on a
machine with no Node, local enforcement does not exist, and that is the same loss
`ADR-0015` already declared.

## Adding a plugin

A plugin is a project under `plugins/<name>/`, and what is installed is its
`plugin/` directory (`ADR-0036`). The minimum (`RN-0041`):

- `plugins/<name>/plugin/.claude-plugin/plugin.json`, and what the plugin ships
  (`skills/`, `commands/`, `agents/`, `hooks/`) beside it, inside `plugin/`;
- `plugins/<name>/README.md` for whoever installs, `CHANGELOG.md`, and
  `.ownership.yml` declaring the project's paths relative to its directory;
- one entry in `.claude-plugin/marketplace.json` with
  `source: ./plugins/<name>/plugin`, one `include:` line in the root
  `.ownership.yml`, one line in `CODEOWNERS`, one row in the root `README.md`
  and one `Added` entry in the root `CHANGELOG.md` — a new plugin is a change
  for whoever installs from the marketplace.

A plugin in plain Markdown needs no workflow: `marketplace.yml` covers it. A
plugin with code adds its own toolchain in the project (a `package.json`, a
`pyproject.toml`) and a `.github/workflows/plugin-<name>.yml` filtered by
`plugins/<name>/**`. Tests, documentation and toolchain stay outside `plugin/`.

A plugin with a toolchain has a `Spurfile` in its project with the tasks
`install`, `test`, `typecheck`, `lint`, `lint-check`, `format`, `format-check`
and `check` — the last running `test`, `typecheck` and `lint-check`, in that
order — each calling its tools directly; its workflow runs them through
`../../spur`. The root `Spurfile` lists the plugin in `PLUGINS`, after any
plugin it depends on. An existing plugin's `Spurfile` is the model.

Its documents live in `plugins/<name>/docs/`, under the repository's single ID
space: take the next free number across every project (`RN-0040`).

## The cycle

1. **The rule before the code.** New behavior starts with a requirement with an
   ID in `docs/requirements/`. If the rule does not exist and nobody knows what
   it is, the result is a `DA-nnnn` in `docs/open-decisions.md` and the
   implementation **stops** — inventing the rule is the error this repository
   exists to avoid.
2. **A test before the implementation**, citing the ID of the requirement it
   covers. It is the citation that `living-docs/citation-coverage` looks for; a test without an ID leaves the rule uncovered.
3. **Minimal implementation.** What has no requirement is not scope.
4. **A commit citing the affected ID** — it is what makes `git log` navigable by rule.
5. **The Definition of Done** (`docs/definition-of-done.md`) says when it is finished.
6. **When the change really does not affect the owning doc**, write the reason in
   the commit message — `Docs: none — <reason>` —, and CI accepts it. A label with
   no reason does not count: it is the ticked box. The same format holds for the
   CHANGELOG, with `Changelog: none — <reason>`.

## Where the truth lives

| Question                                   | Artifact                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| What the toolkit must be                   | `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` |
| What is the rule for X                     | `docs/requirements/`                                                   |
| Why was it done this way                   | `docs/decisions/adr/`                                                  |
| What has not been decided yet              | `docs/open-decisions.md`                                               |
| What we accepted to owe                    | `docs/decisions/debt/`                                                 |
| Who owns each path                         | `.ownership.yml` and `CODEOWNERS`                                      |
| What is the domain vocabulary              | `docs/glossary.md`                                                     |
| What is inviolable, and the product vision | `docs/charter/`                                                        |
| What is public, and what each error means  | `docs/contracts/`                                                      |
| What changed for whoever uses it           | `CHANGELOG.md` and `docs/releases/`                                    |
| When it is done                            | `docs/definition-of-done.md`                                           |
| Who answers for each document with no ID   | `.ownership.yml` (entry with a `living-docs:` block)                   |

None of these answers is copied anywhere else. A duplicate rots, and the old
version beats the new one by repetition.

## Language

Everything versioned here is English: prose, comments, test names and
commit messages. Commit messages use the form `type(ID): subject`.

## When an agent goes wrong for lack of context

That is not an accident, it is a symptom: a line is missing in some document. The
fix is to add that line — in `CLAUDE.md` if it is policy or an index, in the
owning artifact if it is a rule. The `working-agreements-keeper` skill owns that
loop.
