# Esliph Agent Plugins

Claude Code plugins maintained by esliph.

| Plugin                                          | Use it to                                                                                                                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ownership`](plugins/ownership/README.md)     | Declare, in one file, who owns each path of a repository, which files are generated, and which document must change when a piece of code changes — and have it checked. |
| [`living-docs`](plugins/living-docs/README.md) | Keep decisions, open questions, technical debt, requirements, glossary and changelog up to date, each with an owner and a moment to be revised. Built on `ownership`.   |

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

```bash
npm ci
npm test
npm run typecheck
```

The repository is an npm workspace, and it keeps its own documentation with
`living-docs` under `docs/`. See [`CONTRIBUTING.md`](CONTRIBUTING.md) before
opening a pull request.
