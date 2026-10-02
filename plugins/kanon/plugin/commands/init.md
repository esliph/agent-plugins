---
description: Creates the kanon foundation in this repository — configuration, constitution and glossary
argument-hint: '[--glossary <path>] [--constitution <path>]'
---

Create the foundation of this repository: $ARGUMENTS

1. Look first for a glossary or a constitution the project already keeps, under
   any name. When one exists, pass its path with `--glossary <path>` or
   `--constitution <path>`: the project points to it and never gets a second one.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" init` with those options,
   from the repository root, and show its output as it came: each line says
   whether a file was `created`, `kept` or `pointed` to. Nothing is overwritten.
3. The forbidden list in `.kanon/config.yml` starts empty, and the command line
   never fills it. Propose the vague words this project should forbid in its
   acceptance criteria, in the language the criteria will be written in, and
   write to `forbidden-words` the ones the person keeps.
4. Offer one short pointer line for the project's `CLAUDE.md` or `AGENTS.md`,
   saying that acceptance criteria follow EARS and where the specs live. Append
   it only on a yes, and never rewrite anything else in that file.

The first capability is not part of the foundation: it is registered when the
first requirement needs an ID.
