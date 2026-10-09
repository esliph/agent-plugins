# Esliph Agent Plugins

Claude Code plugins maintained by esliph.

| Plugin                                         | Use it to                                                                                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ownership`](plugins/ownership/README.md)     | Declare, in one file, who owns each path of a repository, which files are generated, and which document must change when a piece of code changes — and have it checked. |

## Install

```text
/plugin marketplace add esliph/agent-plugins
/plugin install ownership@esliph
```

`ownership` runs its hooks on the machine's `node` (24 or later). Without Node, the hooks stay silent and
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
See [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.
