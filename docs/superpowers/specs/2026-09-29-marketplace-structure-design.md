# Marketplace structure — design

The repository is `esliph/agent-plugins`, a marketplace meant to host plugins of
any kind: Node, Python, or skills in plain Markdown. Its structure still assumes
one toolchain and one plugin. The root is an npm workspace. The container and
`bin/` exist only for living-docs. The single CI workflow runs `npm ci` for
everything. The root `docs/` is, in substance, living-docs' product
documentation. This spec turns each plugin into a self-contained project, leaves
the root with the marketplace and the policy shared by every plugin, and keeps
one ID space across the repository.

**Nothing here is an accepted decision.** The decisions this spec requires are
listed in section 2, to be opened as `draft` and promoted by a human act.

## 1. Scope and boundary

In scope:

- The physical layout of the repository: root, `plugins/<name>/`, and the
  distributed directory of each plugin.
- The toolchain at the root and in each plugin.
- The CI workflows.
- Where each existing documentation artifact lives, and the rule change in
  living-docs that allows it.
- The two agent contracts (`CLAUDE.md`) and the minimum governance of a plugin.

Out of scope:

- Publishing `@esliph/ownership` on npm. The `file:` dependency of living-docs
  on the core stays provisional (`TDR-0003`); this spec only moves its path.
- Any new plugin. The design has to admit one without touching the root, and
  section 7 shows how. Adding one is separate work.
- Changing what any check or hook verifies, except the one rule in section 2.3.

## 2. Decisions to open

All are born `draft`; promotion is human.

### 2.1 DA-0009 — the structure is bound to one toolchain and one plugin

The gap: a plugin that is not Node, or not about documentation, has no place of
its own. Its code would fall into the npm workspace, its CI into a workflow that
runs `npm ci`, and its requirements into living-docs' requirement files.
Resolved by ADR-0036.

### 2.2 ADR-0036 — marketplace structure (root)

- Each plugin is a project under `plugins/<name>/`. What is distributed is
  `plugins/<name>/plugin/`, and that is the `source` in `marketplace.json`.
  Tests, documentation, toolchain and container stay outside the distributed
  directory.
- The root has no language toolchain. It keeps only language-neutral
  configuration: `.editorconfig`, `.gitattributes`, `.prettierrc`.
- CI: one workflow per plugin, filtered by `plugins/<name>/**`, plus
  `marketplace.yml`, which always runs and holds the global checks.
- The minimum governance of a plugin: `plugin/.claude-plugin/plugin.json`, a
  `README.md` (`audience: external`), a `CHANGELOG.md` and a `.ownership.yml`.
  `docs/` exists only when the plugin has something to record.
- One ID space across the repository. The documents of each project live in its
  own `docs/`.

### 2.3 ADR-0037 — an ID prefix may be declared in several ownership entries (living-docs)

Today `adaptConfig` (`packages/living-docs/src/config/ownership.ts`) fails when
an `id-prefix` appears in more than one `owned` entry, and when a `role` appears
in more than one document. The decision:

- The same `id-prefix` may appear in several `owned` entries, one per project.
  All entries of a prefix share a single contiguous sequence, checked across the
  repository. `living-docs/id-integrity` already collects declarations
  globally, so the sequence check needs no change.
- A new ID takes the next free number in the repository, whichever entry it is
  written in.
- `role` stays unique. The `CLAUDE.md` of a plugin is a plain document, with no
  `role`. The agent-contract duplication check keeps applying to the root
  contract only.
- Requirement: a new `RN-0040`, "An ID prefix may be declared in several
  ownership entries, and its sequence is one per repository", with tests citing
  it.

### 2.4 ADR-0038 — one-time relocation of frozen artifacts (root)

It follows the mold of `ADR-0033`. Accepted ADRs and paid TDRs move to their
project's `docs/` **once**: same ID, same body, same frontmatter, same
`last-reviewed`. Only the path changes. Each commit writes the new path and
removes the old one with `git rm` in the same commit. The commit cites
`ADR-0038` and lists the IDs it moves. The `living-docs/append-only` guard is
never disabled; the probe recorded in `ADR-0033` showed that a write to a new
path passes it. This is valid only for the commits of this migration.

### 2.5 RN-0041 — minimum governance of a plugin (root)

Every plugin listed in `marketplace.json` has a `source` that exists and
contains `.claude-plugin/plugin.json`, and a project directory with
`README.md`, `CHANGELOG.md` and `.ownership.yml`. `marketplace.yml` verifies
this.

### 2.6 Requirements whose text changes

These are mutable, so they are edited in place:

- `RNF-0002`: `npm ci` and the `node` invocation are run from the plugin
  project (`plugins/living-docs/`), not from the checkout root.
- `RNF-0006`: the container path is living-docs', and it lives in
  `plugins/living-docs/`.
- `RN-0031`: what is delivered is the plugin's distributed directory.

Accepted ADRs that describe the old layout (`ADR-0016`, `ADR-0025`, `ADR-0027`,
among others) do not change. `ADR-0036` names what moved.

## 3. Layout

```
esliph/
├── .claude-plugin/marketplace.json   source: ./plugins/<name>/plugin
├── .github/workflows/
│   ├── marketplace.yml
│   ├── plugin-ownership.yml
│   └── plugin-living-docs.yml
├── README.md  CLAUDE.md  CONTRIBUTING.md  CHANGELOG.md  CODEOWNERS
├── .ownership.yml                    root: docs/, .github/, .claude-plugin/, root files
├── .editorconfig  .gitattributes  .gitignore  .prettierrc  .prettierignore
├── docs/                             marketplace decisions and requirements, superpowers/
└── plugins/
    ├── ownership/
    │   ├── plugin/                   .claude-plugin/, hooks/, src/, package.json (runtime)
    │   ├── test/
    │   ├── docs/
    │   ├── package.json  package-lock.json  tsconfig.json  eslint.config.mjs
    │   └── README.md  CHANGELOG.md  .ownership.yml
    └── living-docs/
        ├── plugin/                   .claude-plugin/, skills/, agents/, commands/, hooks/, src/, templates/, package.json (runtime)
        ├── test/
        ├── docs/
        ├── Dockerfile  compose.yaml  .dockerignore  bin/
        ├── package.json  package-lock.json  tsconfig.json  eslint.config.mjs
        └── README.md  CHANGELOG.md  CLAUDE.md  .ownership.yml
```

### 3.1 The two `package.json` of a Node plugin

- `plugin/package.json` has `name`, `type`, `engines` and the runtime
  `dependencies`. It is what a hook needs when it runs from the installer's
  plugin cache.
- `plugins/<name>/package.json` is private and holds `devDependencies`, the
  `test`, `typecheck` and `lint` scripts and the lockfile. Tests import from
  `../plugin/src/`.

The runtime dependencies have to be installable from the project root, so
`npm ci` there is enough to run both the tests and the hooks from the checkout.
The implementation plan picks the mechanism: a `file:./plugin` dependency or
the runtime dependencies repeated as dev dependencies. It has to be covered by
the existing `test/distribution/lockfile.test.ts`.

### 3.2 Hooks

`run-hook.sh` derives the plugin root one level above `hooks/`. That is now
`plugin/`, and the derivation does not change. The sibling-core resolution under
the `development` condition moves from `../ownership` to
`../../ownership/plugin`. It is still provisional (`TDR-0003`), and outside the
checkout it fails open as today (`RNF-0001`).

### 3.3 Agent contracts

- Root `CLAUDE.md`: the policy that holds for every plugin. The rule comes
  before the code; the agent does not promote; frozen and generated items are
  not edited; document and code travel together; consumer-visible changes carry
  a changelog entry; text for outside readers carries no artifact ID. It names
  no toolchain.
- `plugins/<name>/CLAUDE.md` is optional. It holds the plugin's commands and
  toolchain. Claude Code loads it when working in that directory.
  `plugins/living-docs/CLAUDE.md` receives the `npm ci`, `npm test` and `node …`
  lines that the root contract has today.

### 3.4 Ownership files

The root `.ownership.yml` keeps `version`, `plugins: [living-docs]`, the
`living-docs:` top block, `ignore`, and the entries for the root paths. Each
plugin's `.ownership.yml` declares its own paths, relative to its directory
(`ADR-0023`). Paths are disjoint across files. `watches[].doc` is free of the
base, so a plugin's watch can point at its own `CHANGELOG.md`, and
`ownership/consumer-change-logged` reads the target from there with no code
change.

## 4. CI

### 4.1 `plugin-<name>.yml`

- Triggered on push and pull request with `paths: plugins/<name>/**` and its
  own workflow file. `plugin-living-docs.yml` also watches `plugins/ownership/**`
  while the `file:` dependency exists.
- Sets up the plugin's toolchain with `working-directory: plugins/<name>`. For
  both current plugins that means `setup-node` 24, `npm ci`, `npm test`,
  `npm run typecheck` and `npm run lint:check`. Lint does not run in CI today;
  it starts here.
- `plugin-living-docs.yml` has a second job for the container path. It is
  filtered by the plugin's `Dockerfile`, `compose.yaml`, `.dockerignore`, `bin/`
  and manifests, and it replaces `wrapper-docker.yml` (`RNF-0006` parity). Its
  step names drop the numbered `CI-n` identifiers.

### 4.2 `marketplace.yml`

It runs on every push and pull request:

1. **Manifests.** `marketplace.json` and every `plugin.json` parse. Every
   `source` exists. `RN-0041` holds. If `claude plugin validate` runs in CI
   without authentication, it does this; if not, a small script in
   `.github/scripts/` does. The plan settles which one.
2. **Governance of the whole repository.** `npm ci` in `plugins/ownership` and
   in `plugins/living-docs`, then `ownership validate` and `living-docs validate`
   with the repository root as the validated root (`LIVING_DOCS_REPO_ROOT`,
   `RNF-0003`). With `--base` on pull requests, as today.

The global checks stay here because composition resolves the whole repository
at once: ID uniqueness, links across projects and owner coverage only make sense
globally.

## 5. Where each artifact goes

The rule: an artifact goes to the project whose code it governs. For
requirements, the criterion is verifiable: the project whose tests cite the
item. An item cited by both plugins goes to `ownership`, because living-docs
depends on it and not the other way around. What governs the repository as a
whole stays at the root.

| Artifact                  | Root `docs/`                                               | `plugins/ownership/docs/`   | `plugins/living-docs/docs/`                                                                                    |
| ------------------------- | ---------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| ADR                       | 0014, 0027, 0031, 0033, 0035; new 0036, 0038               | 0019–0026, 0028, 0030       | 0001–0013, 0015–0018, 0029, 0032, 0034; new 0037                                                               |
| TDR                       | —                                                          | —                           | 0001, 0002, 0003                                                                                               |
| DA (`open-decisions.md`)  | 0008; new 0009                                             | 0004, 0005, 0006, 0007      | 0001, 0002, 0003                                                                                               |
| RF (`functional.md`)      | —                                                          | 0016, 0017                  | 0001–0015                                                                                                      |
| RNF (`non-functional.md`) | —                                                          | —                           | 0001–0006                                                                                                      |
| RN (`rules.md`)           | new 0041                                                   | 0001, 0002, 0021, 0032–0038 | 0003–0020, 0022–0031, 0039; new 0040                                                                           |
| Documents                 | `definition-of-done.md`, `ids-retired.txt`, `superpowers/` | —                           | `charter/`, `glossary.md`, `contracts/` (incl. `checks.gen.md`), `deprecations.md`, `migrations/`, `releases/` |

Notes:

- `docs/ids-retired.txt` stays at the root. Its path is fixed in the code and it
  serves the single ID space.
- `checks.gen.md` goes with living-docs, whose generator produces it, and it
  keeps the `ownership` section it has today.
- The root `CHANGELOG.md` is split. `ownership` entries go to
  `plugins/ownership/CHANGELOG.md`, the rest to
  `plugins/living-docs/CHANGELOG.md`. The root starts a new one for the
  marketplace, whose first entry is this restructuring.
- A project creates a requirement file only when it has an item for it. The
  root gets only `rules.md`.

## 6. Migration order

Each step is one or more commits with every workflow green. Code keeps its
current location until step 3.

1. **Decisions.** DA-0009, ADR-0036, ADR-0037 and ADR-0038 as `draft`. A human
   promotes ADR-0036 and ADR-0038 before step 3, and ADR-0037 before step 2.
2. **Shared prefix rule** (ADR-0037, RN-0040). Change `adaptConfig` and the
   prefix lookup in `init`, with tests. The layout is still the old one.
3. **Move `ownership`** to `plugins/ownership/{plugin,test}`. Two
   `package.json`, its own workflow, `source` updated, `CODEOWNERS` and
   `.ownership.yml` paths updated.
4. **Move `living-docs`** the same way, together with `Dockerfile`,
   `compose.yaml`, `.dockerignore` and `bin/`. Adjust `run-hook.sh`, the `file:`
   path, `generated[].command` and `wrapper-docker.yml` (folded into
   `plugin-living-docs.yml`).
5. **Strip the root toolchain.** Remove the root `package.json`, lockfile and
   `eslint.config.mjs`; add `.editorconfig`. Add `marketplace.yml` and remove
   `living-docs.yml`.
6. **Redistribute the corpus** per section 5, following ADR-0038 for frozen
   items. Write each plugin's `.ownership.yml`, move `cited-by` globs and
   `watches` into the owning file, and split `CHANGELOG.md`.
7. **Agent contracts and contributing.** Rewrite the root `CLAUDE.md`, write
   `plugins/living-docs/CLAUDE.md`, add "Adding a plugin" to `CONTRIBUTING.md`,
   and update the last line of `docs/definition-of-done.md` to name the new
   workflows. Edit `RNF-0002`, `RNF-0006` and `RN-0031`.

## 7. Adding a plugin afterwards

A skills-only plugin is `plugins/<name>/plugin/.claude-plugin/plugin.json`,
`plugins/<name>/plugin/skills/…`, `README.md`, `CHANGELOG.md`,
`.ownership.yml`, one entry in `marketplace.json` and one row in the root
README. It needs no workflow: `marketplace.yml` covers it. A Python plugin adds
its own `pyproject.toml` in the project and a `plugin-<name>.yml` with
`setup-python`. No root file other than `marketplace.json` and `README.md`
changes.

## 8. Verification

- The distribution tests (`plugin-cache`, `dev-resolution`, `lockfile`,
  `internal-trail`, `stale-names`) point at `plugin/`.
- A new test per Node plugin: the distributed directory contains no `test/`,
  `docs/`, development lockfile or container files.
- The three workflows pass. `living-docs validate` against the root reports no
  new finding after step 6.
- Smoke test: `/plugin marketplace add ./` from a local checkout, install both
  plugins, and confirm that a living-docs hook runs from the plugin cache and
  fails open without the core published.

## 9. Risks to settle in the plan

- **`cited-by` and the file base.** `ADR-0023` confines path fields to the file's
  base, except `watches[].doc`. If `cited-by` is confined too, a requirement in
  `plugins/ownership/docs/` cannot name living-docs tests as citers. Section 5
  avoids needing it, but the plan checks before step 6.
- **Runtime dependencies from the project root** (section 3.1): the mechanism
  must keep a single lockfile per project and pass `lockfile.test.ts`.
- **`claude plugin validate` in CI** (section 4.2): whether it needs
  authentication decides between the CLI and a script.
