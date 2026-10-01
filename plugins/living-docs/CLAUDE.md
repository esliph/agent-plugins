# Agent contract — living-docs plugin

What holds when working in `plugins/living-docs/`. The policy for every plugin is
the root `CLAUDE.md`; this file adds the toolchain, the commands and where this
plugin's truth lives. **No factual claim lives here** (`RN-0010`).

## Before touching anything

- The toolkit's spec is
  `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md`, at the
  repository root. It rules.
- This project's ownership map is `.ownership.yml`, in this directory.
- Requirements: `docs/requirements/`. Decisions: `docs/decisions/` and
  `docs/open-decisions.md`. Domain vocabulary: `docs/glossary.md`. Inviolable
  principles and product vision: `docs/charter/`.

## Toolchain

It runs on the host's `node` (`RNF-0002`). Every command is a task of this
project's `Spurfile`, run by the runner vendored at the repository root
(`ADR-0039`); `../../spur --list` shows them. `install` installs the core's
dependencies first, while living-docs depends on it by path (`TDR-0003`):

```bash
../../spur install
../../spur check        # tests, type-check, lint
```

The validated repository is the checkout root: from there,
`node --conditions=development plugins/living-docs/plugin/src/cli/index.ts validate`
(or set `LIVING_DOCS_REPO_ROOT`, `RNF-0003`). The optional container path is
`bin/dev` (`RNF-0006`).

## Commands

`/adr`, `/open-decision`, `/debt`, `/docs-setup`, `/term`, `/release`,
`/docs-audit`. The skills `decision-recorder`, `requirements-keeper`,
`working-agreements-keeper`, `glossary-keeper`, `charter-keeper`,
`contract-keeper` and `release-historian` are selected by their `description`;
there is no need to invoke them by name.
