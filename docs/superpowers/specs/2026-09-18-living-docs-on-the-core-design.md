# Living-docs on the core — design

Second slice of the living-docs migration. The first
(`docs/superpowers/specs/2026-09-18-moving-living-docs-to-packages-design.md`)
moved the package to `packages/living-docs/` without changing what it does. This
one makes living-docs **adopt** `@esliph/ownership`: read the v2 schema through
the core's library, hand over to the core the rules that belong to it, and rename
the ones that stay.

**Nothing here is an accepted decision.** The decisions this spec requires to be
recorded are in section 9, to be opened as `draft` and promoted by a human act.

## 1. Scope and boundary

The previous spec (§12) listed what was left for later. This spec covers two
blocks, A and B, and leaves a third, C, for another one:

- **A. Core adoption.** Schema v2, a single `owned`, blocks per plugin, end of
  `consumer-visible-paths`, citation coverage extended to `ownership` and the
  glossary.
- **B. Split and renaming.** Each rule runs in one plugin only, and the
  living-docs rules stop being `CI-n`/`HK-n` and become `living-docs/name`.
- **C (out).** Publishing `@esliph/ownership` on npm and the return of the remote
  installation of living-docs.

**Living-docs is born again on top of the core.** There is no v1→v2 migration
command, neither public nor internal, no dual reading, no alias for the old name.
This repository's file is rewritten by hand in v2, and whoever cloned the toolkit
rewrites theirs, guided by the CHANGELOG. Today only the author uses the plugin,
and nothing has been released (`CHANGELOG.md` only has `[Unreleased]`). This
diverges from the core's spec (§10), which asked for a migration command, and the
divergence becomes a recorded decision (section 9).

**Out of this spec** is in section 10.

## 2. Dependency

`packages/living-docs/package.json` gains:

```json
"dependencies": { "@esliph/ownership": "file:../ownership" }
```

npm (11.x, `install-links=false`) resolves this by symlink. In the checkout,
living-docs imports the core's `src/*.ts` with `--conditions=development`, the
same condition the core's `dev-resolution.test.ts` already proves. **No `dist/`
exists in the checkout**, so no old code runs silently.

The condition is turned on everywhere that runs living-docs in the checkout:

- `hooks/run-hook.sh` exports `NODE_OPTIONS=--conditions=development`;
- the package's `test` and `typecheck` scripts; in `typecheck`, through the
  `customConditions: ["development"]` option of `tsconfig.json`;
- the documented invocation of the CLI (`CLAUDE.md`, `CONTRIBUTING.md`, README and
  CI).

**The cost, recorded as debt.** In the marketplace cache, `../ownership` points to
a directory that does not exist. living-docs' `npm ci` fails, and without
`node_modules` every living-docs hook fails open. The remote installation of
living-docs stays broken until the publication. This becomes a `TDR` (`/debt`)
with an observable payment trigger: `@esliph/ownership` published on npm, at which
point the dependency becomes a semver range from the registry.

Consequences for the tests of the previous slice:

- `test/distribution/lockfile.test.ts` regenerates the lockfile in a temporary
  directory that reproduces `packages/living-docs` and `packages/ownership` side
  by side, so that `../ownership` resolves.
- `test/distribution/plugin-cache.test.ts` keeps the control (without
  dependencies, the hook stays silent) and the `100755` mode of the wrapper. The
  assertion that the hook answers from the cache becomes `todo`, with the reason
  spelled out. The code comment cites the TDR.

## 3. Changes in the core

Two, small and isolated in `packages/ownership`.

**Plugin block at the top of the root.** v1 has living-docs configuration outside
any entry: `stale-after-months` (used here), `id-format` and
`last-reviewed-bump-limit`. v2 only accepted a plugin block inside an `owned[]`
entry. It now also accepts, **only in the root file**, top-level keys whose name
is in `plugins:`, passed on opaque in `RootFile.pluginBlocks` and
`ResolvedConfig.pluginBlocks`. In a child file it is an error, for the same reason
that `plugins:` is exclusive to the root.

The alternatives were discarded. Repeating the configuration in every entry would
make ~20 copies of a global value and would open up families with different ID
formats. A configuration file of living-docs' own would be the "one file per
plugin" that the research had already discarded.

**v1 error.** The error stops saying "the migration does not have its own command
yet". It now says that the v1 schema is not read and that the file must be written
in v2.

**Public API.** It grows only in what living-docs imports: `parseItemsTable`,
`parseItemsSections`, `DocItem`, `findTransitions` (already exported), the core's
check registry (for the generated contract, section 6) and the root's
`pluginBlocks`.

## 4. This repository's `.ownership.yml`

`docs/.ownership.yml` goes by `git mv` to **`.ownership.yml`, at the root**. The
file governs `packages/**`, `.github/**`, `bin/**` and `CLAUDE.md`, not just
`docs/`, and the core's spec (§7) already designed it there. Every text that cites
`docs/.ownership.yml` now cites `.ownership.yml`.

**Top:**

```yaml
version: 2
plugins: [living-docs]
living-docs:
  stale-after-months: 6
```

**`artifacts` and `documents` become a single `owned`.** The specific keys go down
to `living-docs:`, and the reading ones go down to `format:`.

| Entry                  | Core                                                                                      | `living-docs:` block                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| ADR, TDR, REL          | `states` declared in the file                                                             | `id-prefix`, `append-only`, `mutable-fields`, `audience` |
| DA                     | `states: [open, resolved]`, `format: { collection: table, key: ID, state-field: Status }` | `id-prefix`, `field-map`                                 |
| RF, RNF, RN            | `format: { collection: sections, key: first-token }`                                      | `id-prefix`, `cited-by`                                  |
| documents without family | `path`, `owner`, `skill` when there is one                                              | `role`, `audience`                                       |

- **States.** Today they come embedded in the code, by prefix (`statesFor`). Here
  they become declared per entry, because `states` belongs to the core and the
  state vocabulary belongs to the project.
- **Citation coverage.** The `cited-by` of RF and RNF now includes
  `packages/ownership/test/**`, and the one of RN also `packages/ownership/src/**`.
- **The overlap goes away.** The two entries for `docs/superpowers/research/…`
  disappear, because `docs/superpowers/` already covers them with the same `owner`
  and no skill. v2 refuses overlap.

**Coverage over the whole repository.** `ownership/owner-coverage` requires every
file to have an `owned` entry or be in `ignore`. v1 only charged from ownership
outward. The file gains:

- `owned` entries without a skill for `packages/living-docs/`,
  `packages/ownership/`, `bin/`, `.github/`, `.claude-plugin/`, the loose files at
  the root and whatever in `docs/` still has no owner;
- `ignore: ['node_modules/**', '**/node_modules/**']`;
- the matching line in `CODEOWNERS` for each new entry.

The exact list comes out of the first `ownership validate` during implementation.

**`generated`** does not change. **`watches`** stay the same, and
`consumer-visible: true` becomes the single list of paths visible to the consumer:
`consumer-visible-paths` ceases to exist, and the test that kept the two copies in
sync goes away with it. `ownership`, which had no link at all, gains the mirror of
living-docs' links:

- `packages/ownership/src/{checks,hooks}/**` → `docs/requirements/rules.md`;
- `packages/ownership/src/cli/**` and `packages/ownership/{.claude-plugin,hooks}/**`
  → `CHANGELOG.md`, with `consumer-visible: true`.

**`derives-from` stays out.** The plans here have no frontmatter and live in the
same `docs/superpowers/` as the specs. Wiring up derivation is SDD's work.

**`init` template.** `templates/ownership.yml` now seeds exactly this shape, with
the values of the chosen `--stage`, and `init` writes `.ownership.yml` at the root
of whoever installs.

## 5. Inside living-docs

**The config layer changes owner.** `src/config/ownership.ts` stops parsing YAML
and becomes the adapter of the `living-docs:` block:

```ts
loadLivingDocsConfig(root): LivingDocsConfig
// = the core's resolveOwnership(...)  +  strict validation of the living-docs blocks
```

- It calls `resolveOwnership`, which finds the file by the order of candidates and
  validates the schema, the disjointness and the bases. `OwnershipError` bubbles
  up as is.
- It validates the top block (`stale-after-months`, `id-format`,
  `last-reviewed-bump-limit`) and that of each entry (`id-prefix`, `append-only`,
  `mutable-fields`, `cited-by`, `field-map`, `audience`, `role`) with today's
  rigor: an unknown key is an error.
- **The discriminator changes.** An artifact is the `owned` entry with
  `living-docs.id-prefix`, and a document is the entry without it. `ArtifactRule`
  and `DocumentRule` survive as types, built from `ResolvedOwnedRule`, so that the
  checks that stay change little.
- `OWNERSHIP_PATH` goes away. Whoever needed the path uses `config.rootFile`.

**What leaves living-docs because the core already has it:**

- **Item parsing.** `docs/table.ts`, `docs/sections.ts` and `docs/item.ts` go
  away, and the core's `parseItemsTable`/`parseItemsSections` come in, which read
  by `format`. The ID form leaves the parser: living-docs applies `id-format` on
  the opaque key it receives, and that is its policy.
- **States by prefix.** `statesFor` goes away. The states come from `rule.states`.
- **`config/watches.ts` and `config/codeowners.ts`.** Only the rules that go to
  the core used them (section 6).

**What stays, on purpose:** `git/`, `exec/` and `frontmatter/`. The core has
ported copies of them, but swapping them for an import is cleanup that does not
change results and would bloat a diff that is already large. It stays out of this
spec (section 10).

**`HK-3` stays in living-docs.** It now uses the core's `findTransitions` to pair
before and after, and keeps the fixed list, by prefix, of transitions that require
people. Taking it out before `DA-0004` would erase the guard, since the core's
`promotion-guard` waits for that decision.

## 6. Rule split

Each rule runs once, in one plugin only. The ones leaving living-docs are already
implemented in the core:

| Leaves living-docs                                                                    | Who takes over                     |
| ------------------------------------------------------------------------------------- | ---------------------------------- |
| `CI-5` (generated drift)                                                              | `ownership/generated-drift`        |
| `CI-6` (changelog required)                                                           | `ownership/consumer-change-logged` |
| `CI-1`, part: valid `owner` and `status` within `states`                              | `ownership/declared-state`         |
| `CI-7`, part: entry in ownership, CODEOWNERS, `watches[].doc` existing and with an owner | `ownership/owner-coverage`      |
| `CI-7`, part: watched path changed without the owning doc                             | `ownership/watch-satisfied`        |
| `HK-2` (generated artifact)                                                           | `ownership/generated-guard`        |
| `HK-4` (watched reminder)                                                             | `ownership/watch-reminder`         |
| `HK-5` (commit guard)                                                                 | `ownership/commit-guard`           |

What remains of `CI-1` is the complete frontmatter and the `trigger` that is not
a cadence. What remains of `CI-7` is the agent contract repeating a sentence, the
Definition of Done without verification and the path claimed by an open decision.

**CLIs.**

- `living-docs` loses `drift` and `changelog` and keeps `validate [--base]`, which
  runs only its own rules, and `init`.
- `.github/workflows/living-docs.yml` runs `ownership validate`,
  `ownership validate --base …`, `living-docs validate` and
  `living-docs validate --base …`, through the paths
  `node packages/<package>/src/cli/index.ts`.
- `init` seeds both CLIs in the workflow of whoever installs. `--invoke` remains
  living-docs', and `--invoke-ownership` comes in, with default `npx ownership`.
  While the package is not on npm, that default does not work outside here, and
  this goes into the same TDR of section 2.

**Plugins and marketplace.**

- `.claude-plugin/marketplace.json` gains the `ownership` plugin
  (`source: ./packages/ownership`, version equal to that of its `plugin.json`).
- living-docs' `plugin.json` gains `dependencies: ["ownership"]`.
- living-docs' `hooks.json` loses the three entries that went to the core.
- The `ownership` plugin works alone in the cache: it runs `.ts` from its own
  directory, outside `node_modules`, and its dependencies (`yaml`, `picomatch`)
  come from npm. It gains its own `plugin-cache.test.ts`, a mirror of living-docs',
  and this one passes for real.
- This project's settings now enable `ownership@esliph` next to
  `living-docs@esliph`.

**Generated contract.** `docs/contracts/checks.gen.md` now lists the rules of both
plugins, one section per plugin. `gen-checks.ts` imports the core's check
registry. The Definition of Done now cites the names of both.

## 7. Renaming

Mechanical: same findings, and only the identifier changes.

| Today                | Name                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `CI-1` (what remains) | `living-docs/frontmatter`                                                                                 |
| `CI-2`               | `living-docs/id-integrity`                                                                                 |
| `CI-3`               | `living-docs/citation-coverage`                                                                            |
| `CI-4`               | `living-docs/staleness`                                                                                    |
| `CI-7` (what remains) | `living-docs/agent-contract-duplication`, `living-docs/done-verifiable`, `living-docs/open-decision-claim` |
| `CI-8`               | `living-docs/links`                                                                                        |
| `CI-9`               | `living-docs/commit-discipline`                                                                            |
| `CI-10`              | `living-docs/trigger-routing`                                                                              |
| `CI-11`              | `living-docs/external-audience`                                                                            |
| `HK-1`               | `living-docs/append-only`                                                                                  |
| `HK-3`               | `living-docs/state-promotion`                                                                              |
| `HK-6`               | `living-docs/session-inventory`                                                                            |
| `HK-7`               | `living-docs/shortcut-debt`                                                                                |
| `HK-8`               | `living-docs/open-decision-guard`                                                                          |

**The rest of `CI-7` becomes three names.** They are three rules unrelated to each
other. The core's spec split ownership coverage precisely because "check seven
failed" never said which part failed. A single name would repeat the defect, now
with a name.

**What accompanies the renaming:**

- **Files.** By `git mv`, without the numeric prefix: `hk1-append-only.ts` →
  `append-only.ts`, `ci2-ids.ts` → `id-integrity.ts`, and so on. The `run-hook.sh`
  argument in `hooks.json` becomes the name.
- **Shipped text.** CLI and hook messages, skills and commands swap the numbered
  citation for the new name, or stop citing a rule.
- **Living documents.** `CLAUDE.md`, `CONTRIBUTING.md`, Definition of Done and
  glossary go through the owning skills. The requirements that cite `CI-n` in the
  text go through the `requirements-keeper`.
- **The historical record does not change.** Accepted ADRs, old specs and plans
  keep the old names.
- **The old → new map lives in the `CHANGELOG.md` entry**, which is where whoever
  had `CI-7` in their own Definition of Done will look. `CI-n` is not an artifact
  ID, and the external audience rule does not charge for it.

**Glossary.** **Artifact** and **Document** are now told apart by
`living-docs.id-prefix`, and no longer by the list the entry is in.

## 8. Execution and proof

Each commit stays green on `npm test`, `npm run typecheck`,
`ownership validate` (from commit 3 on) and `living-docs validate`.

0. **The rule before the code.** The ADRs and the TDR of section 9, and the
   `requirements-keeper` reviewing the requirements that the following commits
   invalidate.
1. **Core.** Top block, v1 error and public API (section 3).
2. **Dependency.** `file:../ownership`, `development` condition, adjusted
   `lockfile.test.ts` and living-docs' `plugin-cache.test.ts` with the assertion
   as `todo` (section 2).
3. **Adoption and split of the checks.** The config adapter, the v2
   `.ownership.yml` at the root, the CODEOWNERS and the removal of the checks that
   went to the core (sections 4 to 6). The hooks `HK-2`, `HK-4` and `HK-5` start
   reading v2 through the adapter and remain registered. It is the big commit.
4. **Plugins, hooks and CI.** Marketplace, `dependencies`, the removal of `HK-2`,
   `HK-4` and `HK-5` together with their entries in `hooks.json`,
   `ownership`'s `plugin-cache.test.ts`, workflow with both CLIs, `init` with
   `--invoke-ownership` and the project's settings. The hooks leave in the same
   commit in which the plugin that takes them over becomes installable, and the
   repository is not left a single commit without the guards.
5. **Renaming** (section 7).
6. **Living documents.** `CLAUDE.md`, `CONTRIBUTING.md`, Definition of Done,
   glossary, README and CHANGELOG with the old → new map.

**Starting line.** Recorded in the plan before commit 2: the findings of
`validate`, `drift` and `changelog`, the test counts of both packages and the hash
of `docs/contracts/checks.gen.md`.

**No test case is lost.** Before deleting the tests of `CI-5`, `CI-6`, `HK-2`,
`HK-4`, `HK-5` and of the parts of `CI-1` and `CI-7`, each case is checked against
the core's tests. What the core does not cover is ported there before the removal,
and the PR description carries the table of that comparison.

**Single rule.** A new test assembles a fixture repository with one violation of
each moved rule: `ownership validate` reports it and `living-docs validate` stays
silent. A second test does the reverse for the rules that stayed. A third asserts
that the `hooks.json` of the two plugins have no hook in common.

**Cache.** `ownership`'s `plugin-cache.test.ts` passes for real. living-docs' one
stays `todo`, tied to the TDR.

**Renaming.** Same findings before and after, with the ID swapped. The
`checks.gen.md` changes hash on purpose, and the new content is checked.

**Counts.** The test counts will change: tests leave with the moved rules, and
those of single rule and of cache come in. The plan records the expected delta per
commit, and an unexplained difference is a defect.

## 9. Decisions to record

As `draft`, for human promotion.

| Decision to open        | About                                                                               | Effect                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| plugin block at the top | the root accepts blocks whose name is listed in `plugins:`, opaque to the core      | refines `ADR-0020` without editing it                                                      |
| v1 abandoned            | living-docs is born on v2; there is no migration command nor dual reading           | diverges from §10 of the core's spec                                                       |
| hooks in two plugins    | living-docs depends on the `ownership` plugin and stops registering the core's hooks | the `decision-recorder` assesses whether to reopen `ADR-0012` (hooks as a single piece) with a new decision |

| Debt to record                  | Payment trigger                                                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file:../ownership` dependency  | `@esliph/ownership` published on npm: the dependency becomes a semver range, living-docs' `plugin-cache.test.ts` goes back to requiring the hook, and the `--invoke-ownership` default starts working outside here |

The renaming is already covered by `ADR-0026` (named identifier), and the rule
boundary, by `ADR-0019`.

## 10. Out of this spec

- **Publishing on npm** and the return of the remote installation of living-docs
  (slice C).
- **The core's `promotion-guard`**, which waits for `DA-0004`. Until then, `HK-3`,
  already as `living-docs/state-promotion`, remains the guard.
- **Swapping the ported copies** of `git/`, `exec/` and `frontmatter/` for an
  import from the core.
- **`derives-from` in this repository** and the **SDD plugin**.
- **Composition across files** in this repository. The file remains a single root,
  with no `include` and no `basePath`.
