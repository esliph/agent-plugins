---
description: Opens a change, syncs its deltas into the current specs, or drops it
argument-hint: 'open <description> | sync <id> | drop <id>'
---

Open, sync or drop a change: $ARGUMENTS

A change is a folder `changes/<id>/` holding a `proposal.md` and one delta per
capability it touches, at `changes/<id>/specs/<name>/spec.md` — the path of the
spec it changes. Its ID is the date it was opened and a slug, and never changes.
A delta has three sections and nothing else at that level: `## ADDED`,
`## MODIFIED` with the whole requirement as it will read, and `## REMOVED` with
the heading of the requirement and a `Reason:` line.

Run every command below from the repository root, show its output as it came,
and never commit: the person reads the result and commits it.

## open

1. From the description, propose a slug: lowercase words joined by hyphens,
   short enough to say aloud. Confirm it with the person before creating
   anything — the ID is the name of the folder and never changes.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" change open <slug>`. It
   creates the folder with a `proposal.md` and prints the ID, or refuses and
   says why.
3. Say where the deltas go. Each new requirement gets its ID from
   `/kanon:capability next <CAP>`, never typed from memory.

## sync

Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" change sync <id>`. It checks
the change first: with an error it prints the findings and writes nothing. With
none, it applies every delta to the current specs, records each removed ID as
used for good, and moves the folder to `changes/archive/`.

When it refuses, fix the delta and never the rule: a finding is not silenced by
editing a registry, the glossary or the configuration.

## drop

Dropping has no way back: every ID the change allocated is recorded as used for
good and is never given to another requirement. Ask before running it, saying
which change will be dropped.

On a yes, run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" change drop <id>`.
It lists each ID it retired and each one it skipped, with the reason, and moves
the folder to `changes/archive/`. The current specs are not touched.

A change that only ever lived in a branch that was never merged needs no drop:
deleting the branch is enough.
