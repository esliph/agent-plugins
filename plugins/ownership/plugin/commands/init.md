---
description: Create the ownership file of this repository and settle, with you, who owns each path
argument-hint: '[--owner <@owner> | --from-codeowners] [--ownership <path>]'
allowed-tools: Bash(node:*), Read, Edit, Glob, Grep
---

# Initialize the ownership file

You are setting up the ownership file of this repository with the person you are
working with. The file says who owns each path; **only a human can name an
owner**. Arguments given to this command: `$ARGUMENTS`

The CLI of this plugin is run as:

```bash
node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" <command> [options]
```

It needs Node 24 or later and runs in the repository root. If it fails with
`ERR_MODULE_NOT_FOUND`, the plugin's dependency is not installed: run
`npm ci --omit=dev --ignore-scripts` in `${CLAUDE_PLUGIN_ROOT}` and try again.

## 1. Choose the mode — the human chooses

`init` has three modes. Never pick one on your own, and never infer an owner
from the Git history, from file contents or from a guess.

| Mode         | Option              | What it writes                                                           |
| ------------ | ------------------- | ------------------------------------------------------------------------ |
| Skeleton     | none                | No entry: a commented model for each file and directory of the root.     |
| Single owner | `--owner <@owner>`  | One entry for each file and directory of the root, all with that owner.  |
| CODEOWNERS   | `--from-codeowners` | Entries derived from the CODEOWNERS, so both files agree from the start. |

- If the arguments already name a mode, use it and skip the question.
- Otherwise, check whether the repository has a CODEOWNERS (`.github/CODEOWNERS`,
  `CODEOWNERS` or `docs/CODEOWNERS`) and ask which mode to use. When there is a
  CODEOWNERS, offer `--from-codeowners` first and say why. For the single-owner
  mode, ask who the owner is.
- If the person is unsure, run the mode they are considering with `--stdout`:
  it prints the file and writes nothing.

## 2. Create the file — only through the CLI

```bash
node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" init [--owner <@owner> | --from-codeowners] [--ownership <path>]
```

- This command is the only way the file is created. Never write the initial
  file yourself, and never edit it before the command has run.
- It refuses to run when an ownership file already exists, and it has no option
  to overwrite. If it refuses, show the message and stop: starting over means
  the person deletes the existing file themselves.
- Show its output as it is. It says how many entries were written, how many
  repository files have no owner and which paths were left out.

## 3. Split the paths that still have no owner — propose, ask, then edit

Do this when the output says repository files have no owner (always in skeleton
mode), or when the person wants to divide what a single owner received.

1. Read the file that was created and list the files and directories of the root
   and, where it helps, one level below them.
2. Propose a split into `owned` entries. Paths are literal — no `*`, no `**`, no
   negation — and they are disjoint: no entry repeats another, and no entry
   contains another. A directory whose parts have different owners is replaced
   by its children, one entry each. A part of a directory that needs no owner
   goes in `ignore`, not in `owned`.
3. Ask who owns **each** proposed path. Never fill in an owner the person did
   not give you, and do not reuse one owner for a path they did not assign it to.
4. Show the entries you are about to write and wait for an explicit yes. Only
   then edit the ownership file.
5. Files listed in the commented `generated:` block carry the
   `generated: do not edit` marker. Ask for the command that prints each one
   before uncommenting its entry; without a command, leave it commented.

## 4. Leave the CODEOWNERS alone

Never create or change the CODEOWNERS. When the repository has one, tell the
person which of the paths being declared would fail `ownership/codeowners-match`:
a path no CODEOWNERS line matches, or a path whose effective line — the last one
that matches it — does not list the declared owner. To see what the CODEOWNERS
says about a path:

```bash
node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" explain <path>
```

Changing the CODEOWNERS is the person's decision and their edit.

## 5. Finish by validating

```bash
node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts" validate --check ownership/owner-coverage --check ownership/codeowners-match
```

Show the result as it is. Exit code 1 with findings is the expected state while
paths are still without an owner: the check fails on purpose until every
repository file is declared. Do not run the other check here — it executes the
repository's generator commands.
