---
description: Lists the open changes, what each does to each capability, and what the lint sees in it
---

Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" status` from the repository
root and show its output as it came — same order, same wording, nothing left
out.

Each open change is one line with its ID and its count of errors and warnings,
followed by one line per capability it touches, with how many requirements it
adds, modifies and removes. An archived change is not listed.

The command is a view: it writes nothing, and it exits 0 even when a change has
errors. To read the findings themselves, run `/kanon:ears-lint`. Exit code 2
means it could not run: say what it reported and stop.
