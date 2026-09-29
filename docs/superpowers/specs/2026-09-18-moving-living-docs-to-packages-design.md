# Moving living-docs to packages — design

Moves `@esliph/living-docs` from the repository root to `packages/living-docs/`,
next to `packages/ownership/`, without changing what it does. It is the first of the
two slices of the migration that `docs/superpowers/specs/2026-09-17-ownership-core-design.md`
§12 reserves for a spec of its own; the second, which adopts the core, comes after this one.

**Nothing here is an accepted decision.** The decisions this spec requires to be
recorded are in section 10, to be opened as `draft` and promoted by a human act.

## 1. Scope and boundary

The core spec describes the living-docs migration as a single piece of work: move,
rename checks, adjust the glossary, migrate the ownership file to v2 and
start depending on `@esliph/ownership`. Here it is split into two slices, for one
reason: they are two kinds of risk. Moving is mechanical and the proof is "nothing
changed except the path"; adopting the core changes the schema, public names and the split of the hooks, and
the proof is different. Mixing the two would leave a review unable to tell whether a
test changed its result because of the path or because of the logic.

**This spec: the physical slice.** living-docs comes to live in `packages/living-docs/`,
with the plugin and the package being the same directory, its own lockfile and a proof
that the plugin works when copied to the marketplace cache without the rest of the
repository.

**The invariant that governs everything:** living-docs stays what it is. Same
check IDs (`CI-n`) and hook IDs (`HK-n`), same hook names, same subcommands,
`version: 1` schema of the `.ownership.yml`, same `LIVING_DOCS_*` variables, same
output. A test that changes **result**, and not only path, is a defect of the
migration, not a consequence of it.

**Out of scope for this spec** is in section 12.

## 2. Final layout

```
esliph/
  .claude-plugin/marketplace.json     # living-docs: source ./packages/living-docs
  package.json + package-lock.json    # private root: workspaces and shared tooling
  eslint.config.mjs, .prettierrc, .prettierignore
  CLAUDE.md, CONTRIBUTING.md, README.md, CHANGELOG.md, CODEOWNERS
  docs/  bin/  Dockerfile  compose.yaml  .github/
  packages/
    ownership/                        # unchanged
    living-docs/
      .claude-plugin/plugin.json
      hooks/{hooks.json, run-hook.sh}
      commands/  skills/  agents/     # what used to be plugin/*
      src/  test/  templates/
      package.json + package-lock.json + tsconfig.json
```

The plugin directory becomes the package directory. That is what makes `src/`, `templates/` and the
lockfile fall **inside** what the cache copies — today `plugin/hooks/run-hook.sh`
climbs two levels up to a root that the cache does not bring, and the hooks fail open
in silence on a remote installation (`docs/superpowers/research/2026-09-16-artifact-ownership-core.md`,
findings 2 to 4; inferred from the documentation, and the proof in section 9 turns it into fact).

Each piece goes through `git mv`, to preserve per-file history: `src/`, `test/`
and `templates/` whole, and `plugin/{commands,skills,agents,hooks,.claude-plugin}`
to the package root. `plugin/` ceases to exist.

## 3. Roots and paths

`RNF-0003` still holds, and the migration exercises it for real: until now, the toolkit and
the validated repository were the same directory in this project, and three things depended on
that coincidence without anyone having written it down.

**`toolkitRoot()` does not change.** It climbs two levels from `src/core/`, and that
is still the package root. Only the comment that lists `plugin/` among what
lives there stops mentioning it. `templatesDir()` remains correct.

**`run-hook.sh` climbs one level, not two** — the same as `packages/ownership/hooks/run-hook.sh`
already does, and the header comment explains why. `REPO_ROOT` keeps coming from
`CLAUDE_PROJECT_DIR`.

**The only code that really changes** is `CI-10`: `loadSkillDescriptions` builds
`join(root, 'plugin', 'skills')` and starts building `join(root, 'skills')`, and the
message that tells the reader to check `plugin/skills/` follows. Those are the only two
occurrences of `plugin/` in `src/` code.

**The tests that assume the coincidence.** Fifteen test files call `toolkitRoot()`, and several of them use it to read the real repository — `docs/`,
`CLAUDE.md`, `CHANGELOG.md`, the `.ownership.yml`, and the `runValidate` of `CI-10` against
the checkout. After the change that root is the package, and none of that is there. The tests
start deriving the checkout root separately, through a test helper
(`checkoutRoot()`, two levels above `toolkitRoot()`), and keep `toolkitRoot()`
only for what belongs to the toolkit (`src/`, `templates/`, `skills/`, `hooks/`). I do not use
`repoRoot()` for this: it reads `process.cwd()`, and `npm test --workspace` runs with the
working directory in the package.

## 4. The repository root

**The root `package.json`** stops being `@esliph/living-docs`: it becomes `esliph`,
private, `type: module`, `engines.node >=24`, with `workspaces: ["packages/*"]` and only the
shared tooling (eslint, prettier and their plugins, `typescript` — which
`typescript-eslint` requires as a peer). `picomatch`, `yaml`, `bin` and the `@types/*` go down
to the package.

**The package `package.json`** is `@esliph/living-docs`, `private: true`, with `bin`,
`dependencies` (`picomatch`, `yaml`) and `devDependencies` (`typescript`, `@types/node`,
`@types/picomatch`), in the same design as `packages/ownership`. It declares what it uses
on its own: workspace hoisting would let a forgotten dependency there go
unnoticed in the checkout and break only in the cache.

**Lockfiles.** The package's is generated outside the workspace, like the one for `ownership` — it is
what Node requires to install a dependency inside the copied plugin. The root's is
regenerated with the two workspaces.

**Commands.** The root `npm test` and `npm run typecheck` fan out to the two
packages (`--workspaces --if-present`), so the commands that `CLAUDE.md`,
`CONTRIBUTING.md` and the Definition of Done state today stay the same. The CLI becomes
`node packages/living-docs/src/cli/index.ts …`, always from the root, which is
the validated repository. The root `tsconfig.json` goes away; the package's is the same as the one for
`ownership`. `lint` and `format` stay at the root and cover both packages.

## 5. The `docs/.ownership.yml`, still v1

The file stays where it is and remains at `version: 1`. Only the paths are rewritten, one
for one, to point to the package:

- `watches[].code`: `src/checks/**` becomes `packages/living-docs/src/checks/**`, and the
  same for `src/hooks/**`, `src/cli/**`, `src/core/**`, `src/checks/catalog.ts`,
  `src/config/ownership.ts`, `plugin/skills/**` (→ `packages/living-docs/skills/**`)
  and `templates/**` (→ `packages/living-docs/templates/**`). Those for `.github/workflows/**`
  and `bin/**` do not change: they live at the root.
- `generated[].command`: `node packages/living-docs/src/tools/gen-checks.ts`. The
  `path` of the generated file, `docs/contracts/checks.gen.md`, does not change.
- `cited-by` of the `RF`, `RNF` and `RN` families: `packages/living-docs/test/**` and
  `packages/living-docs/src/**`, **and not** `packages/*/test/**`. The wildcard would start
  counting the `ownership` tests and would change the result of `CI-3`; extending the
  coverage is a matter for the next spec.
- What is today `plugin/**` visible to the consumer can no longer be a single wildcard:
  the whole package now includes `src/` and `test/`, which are not public surface.
  It becomes the explicit list `packages/living-docs/{.claude-plugin,hooks,commands,skills,agents}/**`
  — and `packages/living-docs/templates/**`, which stays visible through what `init`
  writes for whoever installs.
  `consumer-visible-paths` receives the same list, and the test that stops the two copies
  from diverging still holds.

`docs/superpowers/` and the other `documents:` do not change. `CODEOWNERS` does not need
to change: it mirrors `owner` of paths in `docs/` and at the root, and none of them moves.

## 6. CI, Docker and the wrapper

**`living-docs.yml`.** The separate test and typecheck steps for `ownership` go away,
because the root `npm test` and `npm run typecheck` already cover them. `validate`, `drift`
and `changelog` only change the CLI path.

**Containerized path** (`RNF-0006`, optional):

- `compose.yaml`: `LIVING_DOCS_TOOLKIT_ROOT` points to
  `/opt/living-docs/packages/living-docs`. The volume still mounts the root at
  `/opt/living-docs`.
- `bin/living-docs` calls the CLI through the new path.
- `bin/dev` does not change. `npm ci` stays at the root, and the workspace hoisting keeps the
  `node_modules/yaml` that its bootstrap looks for.
- `wrapper-docker.yml`: the `paths` filter gains the `package.json` and lockfiles of the
  packages. The move touches `bin/` and `compose.yaml`, so the workflow runs in this PR
  and really exercises the containerized path.

## 7. Living documents, marketplace and CHANGELOG

`CLAUDE.md`, `CONTRIBUTING.md` and `README.md` swap the paths they cite. The ADRs and
the specs that cite `plugin/hooks/run-hook.sh` or `src/cli/index.ts` stay as
they are: they are a record of what was true when they were written, and `CI-8` only judges the
markdown links, not the text between backticks. The new ADR in section 10 documents the
change.

`marketplace.json` swaps `source: ./plugin` for `./packages/living-docs`, without touching
the version. `ownership` **stays out of the marketplace** until the remote installation
proof.

`CHANGELOG.md` gains the entry. `init` does not write a CLI path — `--invoke` is a
parameter of whoever installs —, so no file already seeded breaks, but whoever clones the
toolkit and invokes it through the old path now needs the new one. It is a public contract
(`docs/contracts/versioning-policy.md`).

## 8. Execution

A structural `git mv` first, the repairs afterwards, each commit green in
`npm test`, `typecheck`, `validate` and `drift`. No copying into the new package and
deleting the old one at the end: it would lose the history and leave two living-docs alive.

1. **Move and the minimum to be green.** `git mv`, the `package.json` files and the
   `tsconfig.json`, `run-hook.sh`, `CI-10`, the `checkoutRoot()` helper and the tests
   that depend on it, and the paths in `docs/.ownership.yml` — the tests validate the
   real repository, so the file has to follow. It is big, and it is mechanical: the
   review reads "what changed path".
2. **Root, CI, Docker and wrapper**, section 6.
3. **Living documents, marketplace and CHANGELOG**, section 7.
4. **The cache proof and the lockfile test**, section 9.
5. **The ADR on the project name**, `draft`.

**The exception label.** Commit 1 carries `Docs: none — <reason>` (`ADR-0010`). Without it
`CI-7` would see the moved files as a watched path changed without the owning doc,
and moving a file does not change what the code does. The cost is known: the label releases
half of the `CI-7` diff for the whole PR, not only for that commit. Accepted because
the remaining commits of this migration do not introduce a new rule, and because the alternative —
editing `rules.md` with nothing to say, only to satisfy the check — is the shortcut that the
label exists to make explicit.

## 9. Proof

**The definition of done is that nothing changed except the path:**

- `npm test` passes, with the same number of living-docs tests passing as before the
  change. The starting count is recorded in the plan, before the first `git mv`.
- `validate` reports what it reports today: no violation, one generated artifact,
  seven consumer-visible paths, fourteen code→doc links.
- `drift` green, with `docs/contracts/checks.gen.md` byte-for-byte identical.
- `typecheck` and `lint:check` green in both packages.
- `wrapper-docker.yml` green on the PR.

**New proofs.** A hook fails open and in silence, and that is what makes a naive proof
pass in a vacuum: "no error" is exactly what a broken hook also produces.

1. **Cache simulation (mandatory, runs in CI).** The test copies only the versioned
   files of `packages/living-docs/` to a temporary directory — without the rest
   of the repository, as the cache does —, runs `npm ci` with only the package's lockfile
   and executes `hooks/run-hook.sh` from there, with a fixture repository in
   `CLAUDE_PROJECT_DIR`. It **asserts non-empty output** from a hook that produces output (the
   watched reminder, for example); empty output is a failure, never a success. It also asserts
   that the wrapper enters as executable in the git index (`100755`), which is the
   mode that reaches whoever installs.
2. **Lockfile up to date**, a mirror of the test that `ownership` already has.
3. **Real remote installation**: install the marketplace from a remote repository and
   watch a hook run from the cache. It is a manual step, with the evidence — command, version
   and hook output — recorded in the PR. It is not a gate: it requires a push and does not run in CI. It is
   what turns the inferred finding into fact, and living-docs is the first plugin that
   can pass it alone, because it does not yet depend on another.

What is deliberately not proven here: composition of two plugins, `ownership`
installed from the cache, and the two CLIs reading the same file. None of that exists before the
next spec.

## 10. Decisions to record

As `draft`, for human promotion. The layout is already covered by `ADR-0025`, and
`RNF-0002` does not change: it speaks of the host's Node and of the checkout, and that still holds.

| Decision to open | About                                                                  | Effect                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| project name | the root becomes `esliph`, private; the package stays `@esliph/living-docs` | supersedes the accepted decision on the name, without editing it. It is the new decision that `ADR-0025` already anticipates when it says the repository comes to have more than one package |

## 11. Accepted consequences

- **The first commit is big.** Moving `src/`, `test/` and `templates/` and repairing
  what the tests require does not fit into smaller green pieces; the review is by path,
  not by logic, and `git mv` preserves what one wants to read.
- **The `Docs: none` label turns off half of `CI-7` for the whole PR**, as
  section 8 explains.
- **`ownership` is left without `watches` and without citation coverage in `.ownership.yml`
  v1.** It is already so today; the v2 of the next spec is what resolves it, with a single list
  governing the two packages.
- **The frozen ADRs are left with paths that no longer exist.** It is a historical record,
  and rewriting them would falsify what was decided when they were written.

## 12. Out of scope for this spec

All of this is the next spec, on a living-docs that already lives in `packages/`:

- **Adopt the core**: schema v2, the v1→v2 migration command, the single `owned`, the
  per-plugin blocks and the removal of the duplicated list of visible paths.
- **Rename the checks and hooks** from `CI-n`/`HK-n` to `living-docs/descriptive-name`,
  and split them with the core: which rules run in which plugin, only once.
- **The dependency** `@esliph/living-docs` → `@esliph/ownership`, in `package.json` and
  in `dependencies` of `plugin.json`, and the installation proof with both pieces.
- **Extend the citation coverage** to the `ownership` tests.
- **Adjust the glossary** (`Artifact` and `Document` discriminated by
  `living-docs.id-prefix`, not by the list).
- **Wire up the `promotion-guard`**, which waits for the resolution of `DA-0004`, and **register
  `ownership` in the marketplace**, after the remote proof.
- **The SDD plugin.**
