---
description: Registers a capability and its ID prefix, splits one that grew too large, or allocates its next requirement ID
argument-hint: '<CAP> <name> [--split-from <CAP>] | next <CAP>'
---

Register or split a capability, or allocate its next requirement ID: $ARGUMENTS

A capability is an area of the system with its own sequence of requirement IDs.
Its prefix is two to five uppercase letters, unique in the project and never
renamed; its name is lowercase, with hyphens, and becomes the directory of its
spec.

## Registering or splitting

1. Run `node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" capability add <CAP> <name>`
   from the repository root. It writes the registry file and an empty spec, or
   refuses and says why. The registry is never written or edited by hand — the counter in it is what keeps two requirements from getting the same ID.
2. To split a capability — it reached the last ID, or it holds too many
   requirements to be one area — add `--split-from <CAP>`. The new capability
   takes the new requirements under its own prefix; the existing ones keep their
   IDs and stay where they are. Moving a requirement never renumbers it.
3. Show the output as it came.

When the person gives only a description of the area, propose a prefix and a
name and ask before registering: a prefix is forever.

## Allocating the next ID

When a requirement is about to be written and needs its ID, run
`node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" id next <CAP>` from the repository
root, once per requirement, and use the ID it prints. Show its warning or its
refusal as it came: a warning means the capability is near its last ID, and a
refusal means it has to be split first.

Never type an ID from memory, and never take the last one in the spec and add
one: the counter is the only source of an ID, and it counts the IDs of removed
requirements too.
