# esliph agent plugins

A marketplace of plugins for coding agents, maintained by esliph. Each plugin
lives in its own package under `packages/` and is listed in
`.claude-plugin/marketplace.json`, which Claude Code reads to install it.

## Plugins

| Plugin                                          | What it does                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [`living-docs`](packages/living-docs/README.md) | Keeps a repository's decisions, open decisions, technical debt, requirements and version history alive, with an owner, a trigger and checks. |
| [`ownership`](packages/ownership/README.md)     | Declares the owner, the lifecycle and the code→doc link of each path in a repository. `living-docs` is built on it; it also runs on its own. |

## Installation

In Claude Code:

```text
/plugin marketplace add esliph/agent-plugins
/plugin install ownership@esliph
/plugin install living-docs@esliph
```

The plugins' hooks run on the machine's Node (24 or greater). Each plugin's README
describes its own setup and commands.

## Development

```bash
npm ci
npm test
npm run typecheck
```

The repository is an npm workspace: `npm ci` at the root installs every package.
This repository keeps its own documentation with `living-docs` — the documents
live in `docs/`, and `.ownership.yml` declares whose each one is. To contribute,
see `CONTRIBUTING.md`.

### Optional: without Node on the host

There is a second execution path, optional, for whoever prefers a predictable
environment to installing Node. `bin/dev` receives a command and runs it inside
the container, bringing it up when needed:

```bash
bin/dev npm test
bin/dev node --conditions=development packages/living-docs/src/cli/index.ts validate
bin/living-docs validate     # the same, through the CLI wrapper
```

The default remains the host: the bind mount is noticeably slower, and the
plugins' hooks always run on the machine's `node` — on a machine with no Node, the
plugins block nothing.
