# How to contribute

This repository is a marketplace of Claude Code plugins, and the first consumer
of each one: what a plugin requires of a project, this repository fulfils.

## The environment

Each plugin is a project under `plugins/<name>/`, with its own toolchain. The
root has none. Every plugin with code needs Node 24 or greater with its npm, and
a POSIX shell with `awk` to run `./spur` — on Windows, Git Bash or WSL. Every
command is a task of `./spur`, the runner vendored at the root: `./spur --list`
shows the root's tasks, and `../../spur --list` from a plugin project shows that
plugin's. Dependencies come in with `./spur install`:

```bash
./spur install
./spur plugins
./spur validate
./spur check
```

A command that fails with `ERR_MODULE_NOT_FOUND` is a command run before
`./spur install` — it is not the environment that is wrong.

## Adding a plugin

A plugin is a project under `plugins/<name>/`, and what is installed is its
`plugin/` directory. The minimum:

- `plugins/<name>/plugin/.claude-plugin/plugin.json`, and what the plugin ships
  (`skills/`, `commands/`, `agents/`, `hooks/`) beside it, inside `plugin/`;
- `plugins/<name>/README.md` for whoever installs, `CHANGELOG.md`, and
  `.ownership.yml` declaring the project's paths relative to its directory;
- one entry in `.claude-plugin/marketplace.json` with
  `source: ./plugins/<name>/plugin`, one `include:` line in the root
  `.ownership.yml`, one line in `CODEOWNERS`, one row in the root `README.md`
  and one `Added` entry in the root `CHANGELOG.md` — a new plugin is a change
  for whoever installs from the marketplace.

A plugin with code adds its own toolchain in the project (a `package.json`, a
`pyproject.toml`) and a `.github/workflows/plugin-<name>.yml`. Tests,
documentation and toolchain stay outside `plugin/`.

A plugin with commands of its own keeps them in a `Spurfile` in its project,
each task calling its tools directly; its workflow runs them through
`../../spur`. Which tasks it has is the plugin's call. The root `Spurfile` knows
two names and requires neither: `./spur install` runs the plugin's `install`,
and `./spur plugins` runs its `check` — everything that must pass before a
change to it is done. A plugin with no `Spurfile`, or without one of those
tasks, is skipped with a notice. The root `Spurfile` lists the plugin in
`PLUGINS`, after any plugin it depends on. An existing plugin's `Spurfile` is
the model.

Its documents live in `plugins/<name>/docs/`.

## The cycle

1. **The rule before the code.** New behavior starts with a requirement in the
   plugin's `docs/requirements/`. If the rule does not exist and nobody knows
   what it is, the implementation **stops** and the question is asked —
   inventing the rule is the error this repository exists to avoid.
2. **A test before the implementation.** Its name says the behavior it proves,
   without citing a requirement ID.
3. **Minimal implementation.** What has no requirement is not scope.
4. **A commit in the form `type(scope): subject`.**
5. **Done is `./spur check` passing**: every plugin's checks and the
   repository's own `ownership validate`.
6. **A change visible to whoever uses a plugin** travels with an entry in that
   plugin's `CHANGELOG.md`. When the change really is not visible, write the
   reason in the commit message — `Changelog: none — <reason>`. A label with no
   reason does not count: it is the ticked box.

## Where the truth lives

| Question                         | Artifact                                |
| -------------------------------- | --------------------------------------- |
| What a plugin must do            | `plugins/<name>/docs/requirements/`     |
| Why a plugin was built this way  | `docs/superpowers/specs/`               |
| Who owns each path               | `.ownership.yml` and `CODEOWNERS`       |
| What changed for whoever uses it | `CHANGELOG.md`, here and in each plugin |
| How to use a plugin              | `plugins/<name>/README.md`              |

None of these answers is copied anywhere else. A duplicate rots, and the old
version beats the new one by repetition.

## Language

Everything versioned here is English: prose, comments, test names and
commit messages. Commit messages use the form `type(scope): subject`.

## When an agent goes wrong for lack of context

That is not an accident, it is a symptom: a line is missing in some document. The
fix is to add that line — in `CLAUDE.md` if it is policy or an index, in the
owning artifact if it is a rule.
