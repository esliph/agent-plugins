---
description: Runs the deterministic lint of EARS criteria, requirement IDs and glossary terms
argument-hint: '[spec paths]'
---

Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" lint` from the repository
root and show its findings as they came — same order, same wording, nothing
softened and nothing left out.

Spec paths to restrict the run to, if any: $ARGUMENTS

Pass each path as its own quoted argument, so that a path with a space stays
one path. With no path, every spec of the project is checked.

Each line is `file:line  rule  severity  message`. An error fails the run; a
warning does not. Exit code 2 means the lint could not run: say what it reported
and stop, instead of guessing what the findings would have been.

Fix nothing unless asked. When asked, fix the criterion and never the rule: a
finding is not silenced by editing the configuration, the glossary or a registry
so that it stops matching.
