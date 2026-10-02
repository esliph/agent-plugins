# Esliph Agent Plugins

Claude Code plugins maintained by esliph.

| Plugin                                         | Use it to                                                                                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ownership`](plugins/ownership/README.md)     | Declare, in one file, who owns each path of a repository, which files are generated, and which document must change when a piece of code changes — and have it checked. |
| [`living-docs`](plugins/living-docs/README.md) | Keep decisions, open questions, technical debt, requirements, glossary and changelog up to date, each with an owner and a moment to be revised. Built on `ownership`.   |
| [`kanon`](plugins/kanon/README.md)             | Write acceptance criteria in EARS, each requirement with a stable ID and terms from a controlled glossary, and have them linted by a script. Works on its own.          |

## Install

```text
/plugin marketplace add esliph/agent-plugins
/plugin install ownership@esliph
/plugin install living-docs@esliph
```

`ownership` works on its own; `living-docs` requires it. Both run their hooks on
the machine's `node` (24 or later). Without Node, the hooks stay silent and
block nothing.

Each plugin's README covers its setup, commands and checks.

## Contributing

Each plugin is a project under `plugins/<name>/`, with its own toolchain and
tests; its README says how to work on it. From the root, for every plugin at
once:

```bash
./spur install
./spur plugins
```

`./spur` is the command runner committed at the root; it needs a POSIX shell
with `awk` (on Windows, Git Bash or WSL), and `./spur --list` shows every task.
`install` installs `ownership` first, since `living-docs` depends on it by path.

The repository keeps its own documentation with `living-docs` under `docs/`.
See [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.
