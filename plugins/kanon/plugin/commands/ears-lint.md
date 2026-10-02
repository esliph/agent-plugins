---
description: Runs the deterministic lint of EARS criteria, requirement IDs, glossary terms and open changes
argument-hint: '[spec or delta paths]'
---

Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" lint` from the repository
root and show its findings as they came — same order, same wording, nothing
softened and nothing left out.

Paths to restrict the run to, if any: $ARGUMENTS

Pass each path as its own quoted argument, so that a path with a space stays
one path. With no path, every spec of the project and every open change under
`changes/` is checked; an archived change never is. A path under `changes/` is
read as a delta.

Each line is `file:line  rule  severity  message`. An error fails the run; a
warning does not. Exit code 2 means the lint could not run: say what it reported
and stop, instead of guessing what the findings would have been.

Fix nothing unless asked. When asked, fix the criterion or the delta and never
the rule: a finding is not silenced by editing the configuration, the glossary
or a registry so that it stops matching.
