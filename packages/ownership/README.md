# ownership

The owner, the lifecycle and the trigger of each path in a repository. It is the
core that [`living-docs`](../living-docs/README.md) is built on, and it also runs
on its own, in a repository that does not use living documentation.

## How it works

One file at the repository root, `.ownership.yml` (or `docs/.ownership.yml`),
declares:

- **`owned`**: who owns each path, which states an item under it may be in, and
  which skill answers for it. Every file of the repository is covered by an
  entry or by `ignore`, and every owned path has a line in `CODEOWNERS`.
- **`generated`**: files produced by a command. They change through the command,
  never by hand, and the versioned copy has to match what the command prints.
- **`watches`**: code paths linked to the document that describes them. When the
  code changes, the document is expected to change with it; a rule marked
  `consumer-visible: true` points to the changelog and expects a new item under
  `## [Unreleased]`.
- **`include`**: other ownership files, for a subdirectory that declares its
  own paths.

A plugin built on top of the core, such as `living-docs`, adds its own block to
the file under its name, listed in `plugins:`.

## Checks

```bash
node --conditions=development packages/ownership/src/cli/index.ts validate [--base <ref>]
node --conditions=development packages/ownership/src/cli/index.ts explain <path>
```

`validate` fails, with exit code 1, when:

- a file has no owner, an owned path does not exist or `CODEOWNERS` is missing
  one (`ownership/owner-coverage`);
- the state of an item is outside the states declared for its path
  (`ownership/declared-state`);
- a generated file differs from the output of its command
  (`ownership/generated-drift`);
- a document that derives from a source does not point to it
  (`ownership/derivation-resolves`).

With `--base <ref>`, it also compares with the branch diff: code that changed
without its owning document (`ownership/watch-satisfied`), and a change visible to
whoever consumes without an entry under `## [Unreleased]` in `CHANGELOG.md`
(`ownership/consumer-change-logged`). A commit message may waive either one with a
written reason.

`explain` shows the rule that applies to a path and where each property came
from. Without `OWNERSHIP_REPO_ROOT`, both commands work on the current directory.

## The Claude Code plugin

**Hooks:** they deny a hand edit of a generated file; after an edit to watched
code, they remind you of the owning document; after an edit to a source that
documents derive from, they remind you of those documents; and, before a commit
that carries watched code without its owning document, they ask. When the core
cannot run, no hook blocks anything.
