# Artifact ownership core — implementation plan

> **For whoever executes:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to execute this plan task by task. The steps use checkboxes (`- [ ]`) for tracking.

**Goal:** extract the artifact ownership mechanism from `@esliph/living-docs`
and publish it as `@esliph/ownership` — a new package in `packages/ownership`,
plugin and library at the same time — covering contract, v2 schema, composition,
item identity, triggers (code→doc and doc→doc), the hooks and checks that the
spec assigns to the core, and distribution (build only at publication, execution without
build in development).

**Architecture:** self-contained TypeScript package (it imports nothing from `src/` of
`@esliph/living-docs` — the migration that makes `living-docs` depend on it is its own
spec, later than this one). It runs without a build in the checkout (Node 24 reads `.ts` directly,
by type-stripping) and gets `dist/` only in `prepack`, when published or when
another plugin installs it via npm. The root repository becomes an npm workspace so that the
`development` condition of `exports` resolves the package through the symlink in
development.

**Tech Stack:** Node ≥ 24, TypeScript with no build step, `node --test`, `yaml`,
`picomatch`. No new dependency beyond those `@esliph/living-docs` already uses.

**Spec:** `docs/superpowers/specs/2026-09-17-ownership-core-design.md` — the
plan argues from it; whoever executes reads both.

## Global constraints

- **Node ≥ 24, no build step in the checkout.** `RNF-0002`. The package runs `.ts`
  directly; `dist/` only exists inside the tarball, generated in `prepack`.
- **`@esliph/ownership` does not import from `src/` of `@esliph/living-docs`.** This is what
  makes the package publishable and installable by a second consumer without dragging in
  the first. Shared utilities are ported (copied and adapted), not
  imported — the duplication is the deliberate price of two independent packages.
- **The core knows no ID format, prefix, padding, or freezing.**
  That is `id-format`/`append-only`/`mutable-fields` and it stays in `@esliph/living-docs`.
  An item's key is opaque: a non-empty string, unique in the file, with no required
  form.
- **The core does not invent state semantics.** `states` is the project's vocabulary; the core
  only compares against the declared list, never against a machine embedded by prefix.
- **Every path in an entry is relative to the base of the file that declares it.** The
  base is the file's directory plus the `basePath`, which only goes down; the base of the
  **root** is the repository root, whether it lives in `.ownership.yml` or in
  `docs/.ownership.yml` — this is what keeps `docs/.ownership.yml` from reading `src/**`
  as `docs/src/**`. `owned[].path`, `owned[].derives-from.source`,
  `watches[].code`, `generated[].path`, `ignore[]` and `include[]` never escape
  the base; `watches[].doc` may, because it is the only one that is never an edited path
  (spec §5).
- **Governed paths are disjoint.** No resolved `owned[].path` is equal
  to another or contains another, whether they come from the same file or from different files.
  There is no cascade, no merge between levels and no more specific path
  winning over a less specific one: a collision is a load error.
- **The rule comes before the code, and the commit cites the rule.** Task 1 records
  the decisions and requirements that the following tasks implement; every commit
  follows `type(ID): subject` (`CONTRIBUTING.md`), with the ID of the rule that the task
  implements. The IDs only exist after Task 1 — the messages below use the
  markers from the Task 1, Step 5 table (e.g. `<RN-schema>`), which whoever
  executes swaps for the real ID.
- **Type-check is `npm run typecheck`**, never `tsc` directly: `tsc` is only on the
  PATH inside an npm script.
- **`version:` is required in every file, and `plugins:` is exclusive to the root.**
  A divergent version between two files is an error; an included file that declares `plugins:` is an error.
- **Every top-level and entry key is strictly validated.** Only
  blocks whose name is in `plugins:` (e.g. `living-docs:`) are ignored by the
  core — and only inside an `owned[]` entry, never at the root of the file.
- **Failing open is a hook policy, never a check policy.** Every hook in this package
  follows the pattern already established in `@esliph/living-docs`: a read error,
  missing configuration or invalid parse makes the hook return `allow`/silence,
  never block the edit.
- **A check and hook identifier is `ownership/descriptive-name`**, not numbered.
- **Every finding (`Finding`) has `ruleId`, `file`, `line` (0 if there is no line),
  `severity`, `message` and `fix`** — the same shape that `@esliph/living-docs` already
  uses, so that the output formatter (`report.ts`, ported in Task 20) serves
  both.

---

## File structure

```
esliph/
  package.json                        # gains "workspaces": ["packages/*"]
  docs/.ownership.yml                 # stays v1 — the migration is its own spec; do not touch
  .claude-plugin/marketplace.json     # does NOT change — see Task 2, "Outside the marketplace"
  .github/workflows/living-docs.yml   # gains the test steps for the new package
  CHANGELOG.md                        # does NOT change — nothing reaches the consumer (Task 22)
  docs/decisions/adr/                 # 8 new ADRs (Task 1)
  docs/open-decisions.md              # 1 new DA: which transitions require a person (Task 1)
  docs/requirements/                  # core rules and the revised RNF-0002 (Task 1)
  packages/
    ownership/                        # @esliph/ownership — plugin AND library
      package.json
      package-lock.json               # installable in isolation, outside the workspace
      tsconfig.json
      tsconfig.build.json             # only for the prepack
      .claude-plugin/plugin.json
      hooks/{hooks.json,run-hook.sh}
      src/
        index.ts                      # public API of the library
        core/
          files.ts                    # tree scan (ported from src/core/files.ts)
          frontmatter.ts              # frontmatter parse (ported from src/frontmatter/parse.ts)
          exec.ts                     # GitRunner + CommandRunner (ported from src/git/*, src/exec/command.ts)
          exception-label.ts          # `<Label>: none — <reason>` (ported from src/checks/exception-label.ts)
          codeowners.ts               # CODEOWNERS parse (ported from src/config/codeowners.ts)
        schema/
          types.ts                    # v2 schema types
          item.ts                     # opaque key: parseItemsTable / parseItemsSections
          parse.ts                    # parseOwnershipFile — strict, with plugin passthrough
        resolve/
          candidates.ts               # root file resolution (candidate order)
          hierarchy.ts                # base, include, disjointness, cycle, pruning
          explain.ts                  # which rule covers, and from which file
        lifecycle/
          transitions.ts              # pairs before/after by key (the hook waits for the DA)
        triggers/
          watches.ts                  # watchesFor / pendingDocs (unified consumer-visible)
          derives.ts                  # derives-from resolution
        checks/
          types.ts                    # Check / CheckContext / Finding
          generated-drift.ts          # ownership/generated-drift
          declared-state.ts           # ownership/declared-state
          owner-coverage.ts           # ownership/owner-coverage
          watch-satisfied.ts          # ownership/watch-satisfied
          consumer-change-logged.ts   # ownership/consumer-change-logged
          derivation-resolves.ts      # ownership/derivation-resolves
          registry.ts
        hooks/
          lib/paths.ts                # toRepoPath (ported from src/hooks/lib/paths.ts)
          lib/io.ts                   # readPayload/emit/askOutput/... (ported, own env vars)
          generated-guard.ts          # ownership/generated-guard
          watch-reminder.ts           # ownership/watch-reminder
          commit-guard.ts             # ownership/commit-guard
          derivation-reminder.ts      # ownership/derivation-reminder
        cli/
          index.ts                   # `ownership validate|explain`
          validate.ts
          explain.ts
          report.ts                  # formatFindings (ported from src/cli/report.ts)
      test/                          # mirrors src/
```

---

### Task 1: Record decisions, the open decision and the requirements

Not code. Spec §11 lists eight decisions that it requires to be opened as
`draft`, for human promotion — `CLAUDE.md`: "You do not accept decisions. A skill
writes `draft`/`open`; promoting is a human act." A `draft` ADR does not block
implementation (the repository itself already has `ADR-0002`, `ADR-0012` and `ADR-0015`
as `draft` with code implemented on top of them) — only an *Open Decision* (`DA`)
blocks. The eight are not a gap: the spec already decided the merits. One thing the spec
did not decide — which transitions require a person — and that becomes a `DA` (Step 3).

**Files:**
- Create: eight files in `docs/decisions/adr/ADR-00NN-<slug>.md` (the exact
  number is assigned by the `decision-recorder` skill at execution time —
  today the next free one is `ADR-0019`; check `docs/ids-retired.txt` and the
  directory before assuming that).
- Modify: `docs/open-decisions.md` (one new row).
- Modify: `docs/requirements/rules.md`, `functional.md`, `non-functional.md`.

- [ ] **Step 1: Read `docs/.ownership.yml` and `docs/decisions/adr/` to confirm the next free ID**

  ```bash
  ls docs/decisions/adr | sort | tail -5
  cat docs/ids-retired.txt
  ```

- [ ] **Step 2: Open the eight draft ADRs, one command per decision**

  Run `/adr <subject>` eight times, one per row of the spec §11 table. For
  each one, cite the corresponding spec section in `## Context` (the ADR itself
  may cite the spec — what cannot is what the toolkit *ships*, `RN-0031`; an
  ADR in this repository is not a deliverable, it is the repository governing itself).

  1. `/adr ownership core boundary: owner, lifecycle and trigger stay in the core; ID family and freezing stay in living-docs (spec §1)` — in `## Consequences`, record that this reopens `ADR-0002` (single engine, today `draft`) because the engine splits in two.
  2. `/adr v2 schema of the ownership file: single owned list, blocks by plugin name, plugins: as an allowlist, format: separate from governance, end of consumer-visible-paths as a duplicated list (spec §2)`
  3. `/adr item identity in the core: opaque key per collection (per-file/table/sections), configurable state-field, no ID regex (spec §3)`
  4. `/adr doc-to-doc trigger: derives-from declared by type in the ownership file and by instance in the document's frontmatter (spec §4)`
  5. `/adr composition across ownership files: base per file with basePath only going down, disjoint governed paths, explicit include without granting authority, confinement by the trigger criterion (spec §5)`
  6. `/adr ownership file resolution: candidate order, ambiguity is an error naming both (spec §8)`
  7. `/adr distributing the core as a package in packages/, build only in prepack, execution without build in the checkout via the development condition of exports (spec §7)` — in `## Consequences`, record that this supersedes the half of `ADR-0015` that said "no build step" without qualification (now "no build step in the checkout, with a build in the prepack"), reopens `ADR-0012` (hooks as a single piece — they become two plugins with their own hooks) and requires a new ADR about the project name, because `ADR-0014` (`@esliph/living-docs`) described a one-package repository.
  8. `/adr named identifier for check and hook: plugin/descriptive-name replaces CI-n/HK-n numbering for whatever is new (spec §6)`

- [ ] **Step 3: Open the decision the spec did not make — which transitions require a person**

  Spec §1 says the core "asks when the transition requires a person", and the
  v2 schema has nowhere to declare **which** transitions require it. In
  `@esliph/living-docs` this is a fixed list by ID prefix, which the core
  does not have. Asking on every transition would be inventing the rule — and, with both
  plugins installed, it would ask on every state change that a skill
  writes. `CLAUDE.md`: "if the rule does not exist, open a `DA` and stop".

  ```
  /open-decision the ownership core does not know which state transitions require a human act: the v2 schema declares `states` and does not declare transitions; options — a `human-transitions` list per path, marked terminal states, or asking on every transition
  ```

  In the blocking column, the DA claims `packages/ownership/src/hooks/promotion-guard.ts`.
  Task 17 builds only the mechanism (finding the transition) and **stops** before
  wiring the hook.

- [ ] **Step 4: Record the requirements the code will implement**

  The rule comes before the code. Through the `requirements-keeper` skill, as `draft`:

  - one rule per core responsibility that does not yet have an equivalent
    rule: strict v2 schema, item identity, composition across
    files (base and disjointness), root file resolution, doc→doc trigger, owner
    coverage over the whole repository with `ignore`;
  - one functional requirement for `ownership validate [--base]` and another for
    `ownership explain <path>`;
  - the revision of `RNF-0002`: today it says "no build step", and Task 21
    adds a build in `prepack`. The new wording is "no build step in the
    checkout; the published package is compiled in the `prepack`". If the skill
    concludes that the change replaces the rule instead of refining it, it opens a
    new requirement and marks the old one — the form is the skill's, not this plan's.

  Rules that already exist and remain in force (single owner, human promotion,
  generated is not edited, watched travels with the doc, CHANGELOG required) do not get a
  copy: the tasks cite them by their current ID.

- [ ] **Step 5: Note the assigned IDs**

  ```bash
  git status --short docs/decisions/adr/ docs/open-decisions.md docs/requirements/
  ```

  Fill in this table at the start of Task 2's execution (PR comment or
  execution note). The commit messages and the
  `// Source rule:` comments of the following tasks use the markers on the left:

  | Marker              | What it is                                                 |
  | ------------------- | ---------------------------------------------------------- |
  | `<ADR-boundary>`    | decision 1                                                 |
  | `<ADR-schema>`      | decision 2                                                 |
  | `<ADR-identity>`    | decision 3                                                 |
  | `<ADR-derivation>`  | decision 4                                                 |
  | `<ADR-composition>` | decision 5                                                 |
  | `<ADR-resolution>`  | decision 6                                                 |
  | `<ADR-distribution>`| decision 7                                                 |
  | `<ADR-named>`       | decision 8                                                 |
  | `<DA-promotion>`    | the open decision from Step 3                              |
  | `<RN-schema>`       | v2 schema rule                                             |
  | `<RN-identity>`     | item identity rule                                         |
  | `<RN-composition>`  | composition across files rule                                       |
  | `<RN-resolution>`   | root file resolution rule                                  |
  | `<RN-derivation>`   | doc→doc trigger rule                                       |
  | `<RN-coverage>`     | owner coverage rule with `ignore`                          |
  | `<RF-validate>`     | `ownership validate` requirement                           |
  | `<RF-explain>`      | `ownership explain` requirement                            |
  | `<RNF-build>`       | revised `RNF-0002` (or whatever replaces it)               |

  Ported checks and hooks also cite the rule that already exists: `RN-0001`
  (owner), `RN-0005` (promotion), `RN-0008`/`RN-0009` (watched), `RN-0012`
  (generated), `RN-0013` (CHANGELOG), `RN-0016`/`RN-0021` (coverage).

- [ ] **Step 6: Validate**

  ```bash
  node src/cli/index.ts validate
  ```

  0 errors expected. The new ADRs cite each other and the decisions they reopen in `relates-to` and `supersedes` —
  `CI-2` and `CI-3` check that every citation
  resolves.

- [ ] **Step 7: Commit — one per artifact, citing the ID**

  `RN-0028`: a commit that changes an artifact cites the affected ID. One commit per ADR,
  one for the DA and one per requirement:

  ```bash
  git add docs/decisions/adr/ADR-00NN-<slug>.md
  git commit -m "docs(ADR-00NN): opens in draft <decision subject>"
  # … repeat for each ADR, for the DA and for each requirement
  ```

---

### Task 2: Scaffold of the `@esliph/ownership` package

**Files:**
- Create: `packages/ownership/package.json`
- Create: `packages/ownership/tsconfig.json`
- Create: `packages/ownership/.gitignore`
- Create: `packages/ownership/src/index.ts` (empty for now — a real placeholder,
  not a comment: an `export {}` that Task 20 replaces with the public API)
- Create: `packages/ownership/test/smoke.test.ts`
- Modify: `package.json:1-19` (root) — adds `workspaces`
- Modify: `.github/workflows/living-docs.yml`

**Interfaces:**
- Produces: the directory layout that every following task uses. No task
  after this one creates `packages/ownership/` — they only add files inside it.

- [ ] **Step 1: Create `packages/ownership/package.json`**

  ```json
  {
    "name": "@esliph/ownership",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "engines": {
      "node": ">=24"
    },
    "exports": {
      ".": {
        "development": "./src/index.ts",
        "default": "./dist/index.js"
      }
    },
    "files": ["dist"],
    "bin": {
      "ownership": "./dist/cli/index.js"
    },
    "scripts": {
      "test": "node --test \"test/**/*.test.ts\"",
      "typecheck": "tsc --noEmit",
      "prepack": "tsc -p tsconfig.build.json"
    },
    "dependencies": {
      "picomatch": "^4.0.2",
      "yaml": "^2.6.0"
    },
    "devDependencies": {
      "@types/node": "^24.0.0",
      "@types/picomatch": "^3.0.1",
      "typescript": "^5.9.0"
    }
  }
  ```

  `private: true` for now — actually publishing is a decision for whoever accepts the
  distribution ADR from Task 1, not something this scaffold decides on its own.
  `bin` points to `dist/`, which does not exist in the checkout: that is what makes
  `npm pack` (Task 21) real proof, and not theater. In development
  the command runs directly: `node packages/ownership/src/cli/index.ts …` — the same
  pattern that `bin/living-docs` already uses for `src/cli/index.ts` at the root.

- [ ] **Step 2: Create `packages/ownership/tsconfig.json`**

  Same options as the root `tsconfig.json` (same TypeScript version, same
  target), with `include` restricted to the package itself:

  ```json
  {
    "compilerOptions": {
      "target": "ES2023",
      "lib": ["ES2023"],
      "module": "nodenext",
      "moduleResolution": "nodenext",
      "allowImportingTsExtensions": true,
      "noEmit": true,
      "erasableSyntaxOnly": true,
      "verbatimModuleSyntax": true,
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "skipLibCheck": true,
      "types": ["node"]
    },
    "include": ["src/**/*.ts", "test/**/*.ts"]
  }
  ```

- [ ] **Step 3: Create `packages/ownership/tsconfig.build.json`**

  Only for the `prepack` (Task 21 comes back to this file). For now, the minimum that
  compiles `src/` to `dist/` without emitting the tests:

  ```json
  {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "noEmit": false,
      "outDir": "dist",
      "declaration": true,
      "rewriteRelativeImportExtensions": true
    },
    "include": ["src/**/*.ts"]
  }
  ```

  `rewriteRelativeImportExtensions` (TypeScript ≥ 5.7) rewrites, on emit,
  the relative imports that end in `.ts` to `.js` — this is what lets the
  source code write `from './x.ts'` (required by `verbatimModuleSyntax` +
  `allowImportingTsExtensions`, inherited from `tsconfig.json`) and the emitted `dist/`
  point to a real `.js`. If the installed TypeScript version
  (`package.json`, Task 2) does not have this flag, the `prepack` (Task 21) fails
  early and clearly — not silently with broken imports in the
  tarball.

- [ ] **Step 4: Create `packages/ownership/.gitignore`**

  ```
  dist/
  node_modules/
  ```

- [ ] **Step 5: Create the `src/index.ts` placeholder and the smoke test**

  `packages/ownership/src/index.ts`:

  ```typescript
  export {}
  ```

  `packages/ownership/test/smoke.test.ts`:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'

  test('the package loads without an import error', async () => {
    const mod = await import('../src/index.ts')

    assert.equal(typeof mod, 'object')
  })
  ```

- [ ] **Step 6: Run the smoke test**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts"
  ```

  Expected: PASS (1 test).

- [ ] **Step 7: Install the isolated package's dependencies, to generate its own lockfile**

  Before adding the package to the root workspace — so that the lockfile
  reflects a self-contained install, which is what spec §7 requires ("each one
  self-contained with its own `package.json` and lockfile") and what the plugin distribution
  mechanism needs when `packages/ownership` is copied alone
  into a consumer's cache:

  ```bash
  cd packages/ownership && npm install --package-lock-only
  ```

  Check that `packages/ownership/package-lock.json` was created.

  After Step 8 this command stops working: inside a workspace, npm
  goes up to the root and writes the lockfile there. Regenerating the package's lockfile
  becomes copying `package.json` to a temporary directory, running
  `npm install --package-lock-only` there and bringing the result back. The test
  in Task 21 (`lockfile.test.ts`) does exactly that and fails when the
  versioned lockfile diverges — without it, the lockfile the consumer uses
  would silently go stale with every new dependency.

- [ ] **Step 8: Add `workspaces` to the root `package.json`**

  In `package.json:1-19`, after `"engines"`:

  ```json
    "workspaces": ["packages/*"],
  ```

  Run `npm install` at the root and check that `node_modules/@esliph/ownership`
  became a symlink to `packages/ownership` (`ls -la node_modules/@esliph/`).
  This is what makes the `development` condition of `exports` (Task 21) resolve
  through the source code, not through a `dist` that does not exist yet.

- [ ] **Step 9: Outside the marketplace — do not register the plugin yet**

  No change to `.claude-plugin/marketplace.json`. The hooks import
  `yaml` and `picomatch`, and nothing installs those dependencies in the copy of the plugin
  that goes to the installer's cache: registered now, the plugin would fail on
  import and, because it fails open, would stay silent with no one noticing. Registering
  waits for the remote install proof from spec §9, which this plan does not close
  (final section).

- [ ] **Step 10: Add the new package's test to the CI workflow**

  In `.github/workflows/living-docs.yml`, after the existing "Tests" step
  (which keeps running the `@esliph/living-docs` tests at the root):

  ```yaml
        - name: Tests — @esliph/ownership
          run: npm test --workspace packages/ownership

        - name: Type-check — @esliph/ownership
          run: npm run typecheck --workspace packages/ownership
  ```

  This is the only CI step that this plan adds for the new package:
  `ownership validate` against `docs/.ownership.yml` of this very repository does
  not run yet, because that file stays at `version: 1` until the migration
  spec — running the new CLI against a schema it rejects would fail
  CI by design, not by bug.

- [ ] **Step 11: Run the whole root suite to confirm nothing broke**

  ```bash
  npm test && npm run typecheck
  ```

- [ ] **Step 12: Commit**

  ```bash
  git add package.json package-lock.json packages/ownership .github/workflows/living-docs.yml
  git commit -m "feat(<ADR-distribution>): scaffold of the @esliph/ownership package"
  ```

---

### Task 3: Ported utilities

Five small modules, copied and adapted from `@esliph/living-docs` (the core
does not import from there — global rule). None of them knows `.ownership.yml`; they are the base
that the following tasks use.

**Files:**
- Create: `packages/ownership/src/core/files.ts`
- Create: `packages/ownership/src/core/frontmatter.ts`
- Create: `packages/ownership/src/core/exec.ts`
- Create: `packages/ownership/src/core/exception-label.ts`
- Create: `packages/ownership/src/core/codeowners.ts`
- Test: `packages/ownership/test/core/files.test.ts`
- Test: `packages/ownership/test/core/frontmatter.test.ts`
- Test: `packages/ownership/test/core/exec.test.ts`
- Test: `packages/ownership/test/core/exception-label.test.ts`
- Test: `packages/ownership/test/core/codeowners.test.ts`

**Interfaces:**
- Produces: `listFiles(root, globs?)`, `readTextFile(root, file)`,
  `forgetTree(root?)`; `parseFrontmatter(source)`; `type GitRunner`,
  `stagedPaths(root, run?)`, `changedPaths(root, base, run?)`,
  `commitMessages(root, base, run?)`, `type CommandRunner`, `runCommand`;
  `exceptionReasonFor(label, messages)`; `type Codeowners`, `loadCodeowners(root)`,
  `ownersOf(codeowners, repoPath)`.

- [ ] **Step 1: Port `core/files.ts`**

  Copy of `src/core/files.ts` from `@esliph/living-docs`, with no change in
  behavior — the scan and memoization algorithm is not specific to
  living documentation. Adjust only the top comment to remove the citation to
  `CI-4`/`CI-7`/`CI-8` (which do not exist here) and speak generically of "whoever
  needs the tree".

  ```typescript
  import { readFileSync, readdirSync, statSync } from 'node:fs'
  import { join } from 'node:path'
  import picomatch from 'picomatch'

  export const SKIP_DIRS: ReadonlySet<string> = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.cache'])
  export const MAX_BYTES = 512 * 1024

  function walk(root: string, relative: string, out: string[]): void {
    let entries: string[]

    try {
      entries = readdirSync(join(root, relative))
    } catch {
      return
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) {
        continue
      }
      const path = relative === '' ? entry : `${relative}/${entry}`
      let isDirectory: boolean

      try {
        isDirectory = statSync(join(root, path)).isDirectory()
      } catch {
        continue
      }
      if (isDirectory) {
        walk(root, path, out)
      } else {
        out.push(path)
      }
    }
  }

  const TREES = new Map<string, string[]>()

  export function forgetTree(root?: string): void {
    if (root === undefined) {
      TREES.clear()
    } else {
      TREES.delete(root)
    }
  }

  function treeOf(root: string): string[] {
    const known = TREES.get(root)

    if (known !== undefined) {
      return known
    }

    const files: string[] = []

    walk(root, '', files)
    TREES.set(root, files)

    return files
  }

  export function listFiles(root: string, globs?: readonly string[]): string[] {
    const files = treeOf(root)

    if (globs === undefined) {
      return [...files]
    }
    if (globs.length === 0) {
      return []
    }

    const matches = picomatch([...globs], { dot: true })

    return files.filter(file => matches(file))
  }

  export function isProbablyText(content: string): boolean {
    return content.indexOf(String.fromCharCode(0)) === -1
  }

  export function readTextFile(root: string, file: string): string | null {
    try {
      if (statSync(join(root, file)).size > MAX_BYTES) {
        return null
      }
      const content = readFileSync(join(root, file), 'utf8')

      return isProbablyText(content) ? content : null
    } catch {
      return null
    }
  }
  ```

- [ ] **Step 2: Test for `files.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { forgetTree, listFiles, readTextFile } from '../../src/core/files.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('listFiles without globs returns everything, with globs it filters', () => {
    withTempRepo({ 'a.md': 'x', 'docs/b.md': 'y', 'node_modules/c.md': 'z' }, root => {
      forgetTree(root)
      assert.deepEqual(listFiles(root).sort(), ['a.md', 'docs/b.md'])
      assert.deepEqual(listFiles(root, ['docs/**']), ['docs/b.md'])
      assert.deepEqual(listFiles(root, []), [])
    })
  })

  test('readTextFile returns null for a missing file', () => {
    withTempRepo({}, root => {
      assert.equal(readTextFile(root, 'nope.md'), null)
    })
  })
  ```

  Create `packages/ownership/test/helpers/tmp.ts`, a copy of `test/helpers/tmp.ts`
  (`withTempRepo`) with no change — same shape, `mkdtempSync`/`rmSync`.

- [ ] **Step 3: Port `core/frontmatter.ts`**

  Copy of `src/frontmatter/parse.ts`, with no change in behavior — YAML
  frontmatter parsing is not specific to living documentation:

  ```typescript
  import YAML from 'yaml'

  export interface Frontmatter {
    data: Record<string, unknown>
    lines: Record<string, number>
    endLine: number
    body: string
    bodyStartLine: number
  }

  export class FrontmatterSyntaxError extends Error {
    readonly line: number

    constructor(message: string, line: number) {
      super(message)
      this.name = 'FrontmatterSyntaxError'
      this.line = line
    }
  }

  const DELIMITER = /^---\s*$/
  const TOP_LEVEL_KEY = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:/

  export function parseFrontmatter(source: string): Frontmatter | null {
    const text = source.replace(/^﻿/, '').replace(/\r\n/g, '\n')
    const lines = text.split('\n')

    if (lines.length === 0 || !DELIMITER.test(lines[0] ?? '')) {
      return null
    }

    let endIndex = -1

    for (let i = 1; i < lines.length; i++) {
      if (DELIMITER.test(lines[i] ?? '')) {
        endIndex = i
        break
      }
    }
    if (endIndex === -1) {
      return null
    }

    const block = lines.slice(1, endIndex).join('\n')
    let data: Record<string, unknown>

    try {
      data = (YAML.parse(block) ?? {}) as Record<string, unknown>
    } catch (err) {
      const at = err instanceof YAML.YAMLParseError ? (err.linePos?.[0]?.line ?? 1) : 1

      throw new FrontmatterSyntaxError(err instanceof Error ? err.message : 'invalid YAML', at + 1)
    }

    const keyLines: Record<string, number> = {}

    for (let i = 1; i < endIndex; i++) {
      const match = TOP_LEVEL_KEY.exec(lines[i] ?? '')

      if (match?.[1] !== undefined && keyLines[match[1]] === undefined) {
        keyLines[match[1]] = i + 1
      }
    }

    return {
      data,
      lines: keyLines,
      endLine: endIndex + 1,
      body: lines.slice(endIndex + 1).join('\n'),
      bodyStartLine: endIndex + 2,
    }
  }
  ```

- [ ] **Step 4: Test for `frontmatter.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { parseFrontmatter } from '../../src/core/frontmatter.ts'

  test('parseFrontmatter reads top-level keys and lines', () => {
    const result = parseFrontmatter('---\nowner: "@x"\nstatus: draft\n---\nbody\n')

    assert.equal(result?.data.owner, '@x')
    assert.equal(result?.data.status, 'draft')
    assert.equal(result?.lines.status, 3)
    assert.equal(result?.body, 'body\n')
  })

  test('without an opening delimiter, it returns null', () => {
    assert.equal(parseFrontmatter('# title\n'), null)
  })
  ```

- [ ] **Step 5: Port `core/exec.ts`**

  Merges `src/git/staged.ts`, `src/git/diff.ts` (only what the core's
  checks/hooks use: `stagedPaths`, `changedPaths`, `commitMessages` — `changedLines`
  stays in `@esliph/living-docs`, which is the one that has `CI-9`/bulk bump) and
  `src/exec/command.ts`, into a single module:

  ```typescript
  import { execFileSync, execSync } from 'node:child_process'

  export type GitRunner = (args: readonly string[], cwd: string) => string

  const STAGED_TIMEOUT_MS = 3_000
  const DIFF_TIMEOUT_MS = 10_000

  const runGitStaged: GitRunner = (args, cwd) =>
    execFileSync('git', [...args], { cwd, encoding: 'utf8', timeout: STAGED_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'ignore'] })

  const runGitDiff: GitRunner = (args, cwd) =>
    execFileSync('git', [...args], {
      cwd,
      encoding: 'utf8',
      timeout: DIFF_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

  function reasonOf(err: unknown): string {
    const stderr = (err as { stderr?: unknown }).stderr
    const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))

    return text.split('\n')[0] ?? text
  }

  export class GitError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'GitError'
    }
  }

  const NUL = String.fromCharCode(0)

  /** Fails open: the caller is a hook, and an empty list means "I don't know". */
  export function stagedPaths(root: string, run: GitRunner = runGitStaged): string[] {
    let output: string

    try {
      output = run(['-c', 'safe.directory=*', 'diff', '--cached', '--name-only', '-z'], root)
    } catch {
      return []
    }

    return output
      .split(NUL)
      .map(path => path.trim().replace(/\\/g, '/'))
      .filter(path => path !== '')
  }

  function git(args: readonly string[], root: string, run: GitRunner, what: string): string {
    try {
      return run(['-c', 'safe.directory=*', ...args], root)
    } catch (err) {
      throw new GitError(`${what} failed: ${reasonOf(err)}`)
    }
  }

  /** The error propagates: the caller is a check, and silence costs a broken contract with green CI. */
  export function changedPaths(root: string, base: string, run: GitRunner = runGitDiff): string[] {
    const output = git(['diff', '--name-only', '-z', `${base}...HEAD`], root, run, `git diff ${base}...HEAD`)

    return output
      .split(NUL)
      .map(path => path.trim().replace(/\\/g, '/'))
      .filter(path => path !== '')
  }

  export function commitMessages(root: string, base: string, run: GitRunner = runGitDiff): string[] {
    const output = git(['log', '--format=%B%x00', `${base}..HEAD`], root, run, `git log ${base}..HEAD`)

    return output
      .split(NUL)
      .map(message => message.trim())
      .filter(message => message !== '')
  }

  export type CommandRunner = (command: string, cwd: string) => string

  export const COMMAND_TIMEOUT_MS = 60_000

  export const runCommand: CommandRunner = (command, cwd) =>
    execSync(command, { cwd, encoding: 'utf8', timeout: COMMAND_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  ```

- [ ] **Step 6: Test for `exec.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { changedPaths, commitMessages, stagedPaths, runCommand } from '../../src/core/exec.ts'

  test('stagedPaths fails open: a runner that throws returns an empty list', () => {
    assert.deepEqual(
      stagedPaths('/repo', () => {
        throw new Error('no git')
      }),
      [],
    )
  })

  test('changedPaths parses NUL-separated output', () => {
    assert.deepEqual(
      changedPaths('/repo', 'main', () => 'a.md\0b/c.md\0'),
      ['a.md', 'b/c.md'],
    )
  })

  test('commitMessages splits by NUL and trims whitespace', () => {
    assert.deepEqual(
      commitMessages('/repo', 'main', () => ' msg one \0msg two\n\nbody\0'),
      ['msg one', 'msg two\n\nbody'],
    )
  })

  test('runCommand executes and returns stdout', () => {
    assert.equal(runCommand('node -e "process.stdout.write(String(1+1))"', process.cwd()), '2')
  })
  ```

- [ ] **Step 7: Port `core/exception-label.ts`**

  Exact copy of `src/checks/exception-label.ts` — it is already generic by
  `label`, with nothing specific to `@esliph/living-docs`:

  ```typescript
  export function exceptionReasonFor(label: string, messages: readonly string[]): string | null {
    const pattern = new RegExp(`^[ \\t]*${label}:[ \\t]*none[ \\t]*[—–:-][ \\t]*(\\S.*)$`, 'im')

    for (const message of messages) {
      const reason = pattern.exec(message)?.[1]?.trim()

      if (reason) {
        return reason
      }
    }

    return null
  }
  ```

- [ ] **Step 8: Test for `exception-label.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { exceptionReasonFor } from '../../src/core/exception-label.ts'

  test('recognizes the label with a reason and returns the reason', () => {
    assert.equal(exceptionReasonFor('Docs', ['fix: x', 'Docs: none — affects no doc at all']), 'affects no doc at all')
  })

  test('a label without a reason does not count', () => {
    assert.equal(exceptionReasonFor('Docs', ['Docs: none —']), null)
  })

  test('without the label, it returns null', () => {
    assert.equal(exceptionReasonFor('Docs', ['fix: x']), null)
  })
  ```

- [ ] **Step 9: Port `core/codeowners.ts`**

  Copy of `src/config/codeowners.ts`, with no change:

  ```typescript
  import { readFileSync } from 'node:fs'
  import { join } from 'node:path'
  import picomatch from 'picomatch'

  export const CODEOWNERS_PATHS: readonly string[] = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']

  export interface CodeownersEntry {
    pattern: string
    owners: string[]
    line: number
  }

  export interface Codeowners {
    file: string
    entries: CodeownersEntry[]
  }

  export function parseCodeowners(source: string): CodeownersEntry[] {
    const entries: CodeownersEntry[] = []
    const lines = source.replace(/\r\n/g, '\n').split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] ?? '').trim()

      if (line === '' || line.startsWith('#')) {
        continue
      }

      const [pattern, ...rest] = line.split(/\s+/)

      if (pattern === undefined) {
        continue
      }

      entries.push({ pattern, owners: rest.filter(owner => owner.startsWith('@')), line: i + 1 })
    }

    return entries
  }

  export function loadCodeowners(root: string): Codeowners | null {
    for (const candidate of CODEOWNERS_PATHS) {
      let source: string

      try {
        source = readFileSync(join(root, candidate), 'utf8')
      } catch {
        continue
      }

      return { file: candidate, entries: parseCodeowners(source) }
    }

    return null
  }

  function matcherFor(pattern: string): (repoPath: string) => boolean {
    const clean = pattern.replace(/\\/g, '/').replace(/^\//, '')

    if (clean === '*' || clean === '**') {
      return () => true
    }
    if (clean.endsWith('/')) {
      return repoPath => repoPath.startsWith(clean)
    }
    if (clean.includes('*')) {
      const isMatch = picomatch([clean, `${clean}/**`])

      return repoPath => isMatch(repoPath)
    }

    return repoPath => repoPath === clean || repoPath.startsWith(`${clean}/`)
  }

  export function ownersOf(codeowners: Codeowners, repoPath: string): string[] | null {
    const target = repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
    let owners: string[] | null = null

    for (const entry of codeowners.entries) {
      if (entry.owners.length === 0) {
        continue
      }
      if (matcherFor(entry.pattern)(target)) {
        owners = entry.owners
      }
    }

    return owners
  }
  ```

- [ ] **Step 10: Test for `codeowners.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownersOf, parseCodeowners } from '../../src/core/codeowners.ts'

  test('the last matching rule wins', () => {
    const entries = parseCodeowners('docs/ @a\ndocs/x.md @b\n')
    const codeowners = { file: 'CODEOWNERS', entries }

    assert.deepEqual(ownersOf(codeowners, 'docs/x.md'), ['@b'])
    assert.deepEqual(ownersOf(codeowners, 'docs/y.md'), ['@a'])
    assert.equal(ownersOf(codeowners, 'other.md'), null)
  })
  ```

- [ ] **Step 11: Run the package suite**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

  Expected: all tests pass, `tsc` with no errors.

- [ ] **Step 12: Commit**

  ```bash
  git add packages/ownership/src/core packages/ownership/test
  git commit -m "feat(<ADR-boundary>): ports reading utilities (files, frontmatter, exec, exception-label, codeowners)"
  ```

---

### Task 4: Types and parser of the v2 schema

Source rule: `<RN-schema>`; spec §2 and the "v2 schema" ADR from Task 1. This is the core of the
package — everything else reads the result of this parser.

**Files:**
- Create: `packages/ownership/src/schema/types.ts`
- Create: `packages/ownership/src/schema/parse.ts`
- Test: `packages/ownership/test/schema/parse.test.ts`

**Interfaces:**
- Consumes: nothing (it is the base).
- Produces: `type Collection`, `type SectionKeyMode`, `interface FormatBlock`,
  `interface DerivesFrom`, `interface OwnedRuleRaw`, `interface GeneratedRuleRaw`,
  `interface WatchRuleRaw`, `interface ParsedFile`, `interface RootFile`,
  `class OwnershipError`, `parseOwnershipFile(source, file, opts): ParsedFile | RootFile`.

- [ ] **Step 1: Write the failing tests first**

  `packages/ownership/test/schema/parse.test.ts`:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { OwnershipError, parseOwnershipFile } from '../../src/schema/parse.ts'

  const ROOT = { isRoot: true, pluginNames: [] }
  const CHILD = (pluginNames: string[] = []) => ({ isRoot: false, pluginNames })

  test('root requires version: 2', () => {
    assert.throws(() => parseOwnershipFile('owned: []\n', '.ownership.yml', ROOT), /version.*2/)
  })

  test('root accepts version: 2 and an empty plugins: by default', () => {
    const parsed = parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT) as { plugins: string[] }

    assert.deepEqual(parsed.plugins, [])
  })

  test('child file requires version and refuses plugins', () => {
    assert.throws(() => parseOwnershipFile('owned: []\n', 'packages/api/.ownership.yml', CHILD()), /version/)
    assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nplugins: [x]\n', 'packages/api/.ownership.yml', CHILD()), /exclusive to the root file/)
  })

  test('an unknown top-level key is an error', () => {
    assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nfoo: 1\n', '.ownership.yml', ROOT), /"foo"/)
  })

  test('version 1 is refused loudly, saying the schema changed', () => {
    assert.throws(() => parseOwnershipFile('version: 1\nartifacts: []\n', 'docs/.ownership.yml', ROOT), /schema v1/)
  })

  test('owned, generated and watches that are not a list are an error, not an empty list', () => {
    assert.throws(() => parseOwnershipFile('version: 2\nowned: {}\n', '.ownership.yml', ROOT), /owned.*list/)
    assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nwatches: x\n', '.ownership.yml', ROOT), /watches.*list/)
  })

  test('owned requires an owner starting with @', () => {
    const source = 'version: 2\nowned:\n  - path: docs/x/\n    owner: no-at-sign\n'

    assert.throws(() => parseOwnershipFile(source, '.ownership.yml', ROOT), /@/)
  })

  test('missing owner is an error — there is nowhere to inherit from', () => {
    assert.throws(() => parseOwnershipFile('version: 2\nowned:\n  - path: ./\n    skill: other\n', 'packages/api/.ownership.yml', CHILD()), /owner/)
  })

  test('per-file accepts format only for state-field; key is an error', () => {
    const ok = 'version: 2\nowned:\n  - path: docs/adr/\n    owner: "@a"\n    format:\n      collection: per-file\n      state-field: State\n'
    const parsed = parseOwnershipFile(ok, '.ownership.yml', ROOT) as { owned: { format: { collection: string; stateField: string } }[] }

    assert.equal(parsed.owned[0]?.format.collection, 'per-file')
    assert.equal(parsed.owned[0]?.format.stateField, 'state')

    const bad = 'version: 2\nowned:\n  - path: docs/adr/\n    owner: "@a"\n    format:\n      collection: per-file\n      key: ID\n'

    assert.throws(() => parseOwnershipFile(bad, '.ownership.yml', ROOT), /"key"/)
  })

  test('owned per-file does not declare format', () => {
    const source = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    skill: decision-recorder\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { collection: string } }[] }

    assert.equal(parsed.owned[0]?.format.collection, 'per-file')
  })

  test('owned with format: table requires key naming the column', () => {
    const source = 'version: 2\nowned:\n  - path: docs/open-decisions.md\n    owner: "@a"\n    format:\n      collection: table\n'

    assert.throws(() => parseOwnershipFile(source, '.ownership.yml', ROOT), /format: needs the `key` field/)
  })

  test('owned with format: sections accepts key: first-token (default) or heading', () => {
    const source =
      'version: 2\nowned:\n  - path: docs/requirements/rules.md\n    owner: "@a"\n    format:\n      collection: sections\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { keyMode: string | null } }[] }

    assert.equal(parsed.owned[0]?.format.keyMode, 'first-token')
  })

  test('state-field is optional, defaults to "status", normalized', () => {
    const source =
      'version: 2\nowned:\n  - path: docs/open-decisions.md\n    owner: "@a"\n    format:\n      collection: table\n      key: ID\n      state-field: State\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { stateField: string } }[] }

    assert.equal(parsed.owned[0]?.format.stateField, 'state')
  })

  test('derives-from requires source and field', () => {
    const source =
      'version: 2\nowned:\n  - path: docs/superpowers/plans/\n    owner: "@a"\n    derives-from:\n      source: docs/superpowers/specs/\n      field: spec\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { derivesFrom: { source: string; field: string } | null }[] }

    assert.deepEqual(parsed.owned[0]?.derivesFrom, { source: 'docs/superpowers/specs/', field: 'spec' })
  })

  test('a plugin block passes through opaque when the name is in plugins:, and fails when it is not', () => {
    const withBlock = 'version: 2\nplugins: [living-docs]\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    living-docs:\n      id-prefix: ADR\n'
    const parsed = parseOwnershipFile(withBlock, '.ownership.yml', ROOT) as { owned: { pluginBlocks: Record<string, unknown> }[] }

    assert.deepEqual(parsed.owned[0]?.pluginBlocks, { 'living-docs': { 'id-prefix': 'ADR' } })

    const withoutDeclared = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    living-docs:\n      id-prefix: ADR\n'

    assert.throws(() => parseOwnershipFile(withoutDeclared, '.ownership.yml', ROOT), /"living-docs"/)
  })

  test('generated and watches are strict on an unknown key', () => {
    assert.throws(
      () => parseOwnershipFile('version: 2\nowned: []\ngenerated:\n  - path: a.md\n    command: x\n    extra: 1\n', '.ownership.yml', ROOT),
      /"extra"/,
    )
    assert.throws(
      () => parseOwnershipFile('version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: a.md\n    extra: 1\n', '.ownership.yml', ROOT),
      /"extra"/,
    )
  })

  test('watches reads optional consumer-visible and reason', () => {
    const source = 'version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: CHANGELOG.md\n    consumer-visible: true\n    reason: "x"\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { watches: { consumerVisible: boolean; reason: string | null }[] }

    assert.equal(parsed.watches[0]?.consumerVisible, true)
    assert.equal(parsed.watches[0]?.reason, 'x')
  })

  test('ignore and include are lists of strings', () => {
    const source = 'version: 2\nowned: []\nignore: ["node_modules/**"]\ninclude: ["packages/api/"]\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { ignore: string[]; include: string[] }

    assert.deepEqual(parsed.ignore, ['node_modules/**'])
    assert.deepEqual(parsed.include, ['packages/api/'])
  })

  test('the file dir is derived from its own path', () => {
    const rootParsed = parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT)
    const childParsed = parseOwnershipFile('version: 2\nowned: []\n', 'packages/api/.ownership.yml', CHILD())

    assert.equal(rootParsed.dir, '')
    assert.equal(childParsed.dir, 'packages/api')
  })

  test('basePath is normalized, and only goes down', () => {
    const parsed = parseOwnershipFile('version: 2\nbasePath: packages/api/\nowned: []\n', 'ownership.api.yml', ROOT) as { basePath: string | null }

    assert.equal(parsed.basePath, 'packages/api')
    assert.equal((parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT) as { basePath: string | null }).basePath, null)

    for (const bad of ['../web', '/abs', 'packages/*', 'packages/../../web']) {
      assert.throws(() => parseOwnershipFile(`version: 2\nbasePath: ${bad}\nowned: []\n`, '.ownership.yml', ROOT), /basePath/)
    }
  })

  test('invalid YAML is an OwnershipError', () => {
    assert.throws(() => parseOwnershipFile('version: [2\n', '.ownership.yml', ROOT), OwnershipError)
  })
  ```

- [ ] **Step 2: Run and confirm they fail**

  ```bash
  cd packages/ownership && node --test test/schema/parse.test.ts
  ```

  Expected: FAIL — `Cannot find module '../../src/schema/parse.ts'`.

- [ ] **Step 3: Write `schema/types.ts`**

  ```typescript
  export type Collection = 'per-file' | 'table' | 'sections'
  export type SectionKeyMode = 'first-token' | 'heading'

  export interface FormatBlock {
    collection: Collection
    /** Column name, when `collection` is `table`. Null in the other two cases. */
    key: string | null
    /** Only when `collection` is `sections`. */
    keyMode: SectionKeyMode | null
    /** Normalized (lowercase, no surrounding whitespace). Default `'status'`. */
    stateField: string
  }

  export interface DerivesFrom {
    source: string
    field: string
  }

  export interface OwnedRuleRaw {
    path: string
    /** Required: no cascade, no entry inherits an owner from another file (spec §5). */
    owner: string
    skill: string | null
    /** The project's vocabulary; `null` when the path declares no lifecycle. */
    states: string[] | null
    format: FormatBlock
    /** Whether the file wrote `format:` — the parser's default is not a declaration. */
    formatDeclared: boolean
    derivesFrom: DerivesFrom | null
    /** By plugin name declared in `plugins:`. Content opaque to the core. */
    pluginBlocks: Record<string, unknown>
  }

  export interface GeneratedRuleRaw {
    path: string
    command: string
  }

  export interface WatchRuleRaw {
    code: string
    doc: string
    reason: string | null
    consumerVisible: boolean
  }

  export interface ParsedFile {
    /** Path of this ownership file, relative to the repository root. */
    file: string
    /** Directory of this file, relative to the root. `''` for the repository root. */
    dir: string
    version: 2
    /** Shifts the base into the file's directory; `null` when the base is the directory itself. */
    basePath: string | null
    owned: OwnedRuleRaw[]
    generated: GeneratedRuleRaw[]
    watches: WatchRuleRaw[]
    ignore: string[]
    include: string[]
  }

  export interface RootFile extends ParsedFile {
    plugins: string[]
  }

  export class OwnershipError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'OwnershipError'
    }
  }
  ```

- [ ] **Step 4: Write `schema/parse.ts`**

  ```typescript
  import { posix } from 'node:path'
  import YAML from 'yaml'
  import { OwnershipError } from './types.ts'
  import type { DerivesFrom, FormatBlock, GeneratedRuleRaw, OwnedRuleRaw, ParsedFile, RootFile, WatchRuleRaw } from './types.ts'

  export { OwnershipError } from './types.ts'
  export type { Collection, DerivesFrom, FormatBlock, GeneratedRuleRaw, OwnedRuleRaw, ParsedFile, RootFile, SectionKeyMode, WatchRuleRaw } from './types.ts'

  export interface ParseOptions {
    isRoot: boolean
    /** Plugin names valid as a block inside `owned[]` — they come from `plugins:` at the root. */
    pluginNames: readonly string[]
  }

  function asRecord(value: unknown, where: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new OwnershipError(`${where}: must be a map.`)
    }

    return value as Record<string, unknown>
  }

  function asStringList(value: unknown, where: string): string[] {
    if (value === undefined || value === null) {
      return []
    }
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
      throw new OwnershipError(`${where}: must be a list of strings.`)
    }

    return value as string[]
  }

  /** Absent is an empty list; present and not a list is an error — it never silently becomes `[]`. */
  function asList(value: unknown, where: string): unknown[] {
    if (value === undefined || value === null) {
      return []
    }
    if (!Array.isArray(value)) {
      throw new OwnershipError(`${where}: must be a list.`)
    }

    return value
  }

  function requireString(source: Record<string, unknown>, key: string, where: string): string {
    const value = source[key]

    if (typeof value !== 'string' || value.trim() === '') {
      throw new OwnershipError(`${where}: needs the \`${key}\` field, non-empty.`)
    }

    return value
  }

  function normalizeKey(key: string): string {
    return key.trim().toLowerCase()
  }

  function dirOf(file: string): string {
    const dir = posix.dirname(file.replace(/\\/g, '/'))

    return dir === '.' ? '' : dir
  }

  function assertKnownKeys(item: Record<string, unknown>, allowed: ReadonlySet<string>, where: string, hint = ''): void {
    for (const key of Object.keys(item)) {
      if (!allowed.has(key)) {
        throw new OwnershipError(`${where}: unknown key "${key}".${hint}`)
      }
    }
  }

  function parseFormat(raw: unknown, where: string): FormatBlock {
    if (raw === undefined) {
      return { collection: 'per-file', key: null, keyMode: null, stateField: 'status' }
    }

    const item = asRecord(raw, `${where}.format`)
    const stateFieldRaw = item['state-field'] ?? 'status'

    if (typeof stateFieldRaw !== 'string' || stateFieldRaw.trim() === '') {
      throw new OwnershipError(`${where}.format.state-field: must be a non-empty string.`)
    }
    const stateField = normalizeKey(stateFieldRaw)

    // per-file has no key to locate (the identity is the file), but the
    // state still lives in a frontmatter field, and that field is configurable
    // (spec §3, `state-field`). The block exists only for that: `key` is an error.
    if (item.collection === 'per-file') {
      assertKnownKeys(item, new Set(['collection', 'state-field']), `${where}.format`, ' In per-file the identity is the file.')

      return { collection: 'per-file', key: null, keyMode: null, stateField }
    }
    if (item.collection === 'table') {
      assertKnownKeys(item, new Set(['collection', 'key', 'state-field']), `${where}.format`)
      const key = requireString(item, 'key', `${where}.format`)

      return { collection: 'table', key, keyMode: null, stateField }
    }
    if (item.collection === 'sections') {
      assertKnownKeys(item, new Set(['collection', 'key', 'state-field']), `${where}.format`)
      const keyMode = item.key ?? 'first-token'

      if (keyMode !== 'first-token' && keyMode !== 'heading') {
        throw new OwnershipError(`${where}.format.key: must be "first-token" or "heading" (received: ${String(keyMode)}).`)
      }

      return { collection: 'sections', key: null, keyMode, stateField }
    }

    throw new OwnershipError(`${where}.format.collection: must be "per-file", "table" or "sections".`)
  }

  function parseDerivesFrom(raw: unknown, where: string): DerivesFrom | null {
    if (raw === undefined) {
      return null
    }
    const item = asRecord(raw, `${where}.derives-from`)

    assertKnownKeys(item, new Set(['source', 'field']), `${where}.derives-from`)

    return {
      source: requireString(item, 'source', `${where}.derives-from`),
      field: requireString(item, 'field', `${where}.derives-from`),
    }
  }

  const OWNED_CORE_KEYS = new Set(['path', 'owner', 'skill', 'states', 'format', 'derives-from'])

  function parseOwned(raw: unknown, index: number, file: string, pluginNames: readonly string[]): OwnedRuleRaw {
    const where = `${file}: owned[${index}]`
    const item = asRecord(raw, where)

    for (const key of Object.keys(item)) {
      if (OWNED_CORE_KEYS.has(key) || pluginNames.includes(key)) {
        continue
      }
      throw new OwnershipError(`${where}: unknown key "${key}". If it belongs to a plugin, declare it in \`plugins:\` at the root.`)
    }

    const ownerRaw = item.owner

    if (typeof ownerRaw !== 'string' || !ownerRaw.startsWith('@')) {
      throw new OwnershipError(`${where}.owner "${String(ownerRaw)}" must be a string starting with @. Every entry declares its own owner.`)
    }

    const owner = ownerRaw

    const skill = item.skill

    if (skill !== undefined && (typeof skill !== 'string' || skill.trim() === '')) {
      throw new OwnershipError(`${where}.skill: must be a non-empty string, or be absent.`)
    }

    const pluginBlocks: Record<string, unknown> = {}

    for (const name of pluginNames) {
      if (item[name] !== undefined) {
        pluginBlocks[name] = item[name]
      }
    }

    return {
      path: requireString(item, 'path', where),
      owner,
      skill: skill === undefined ? null : skill,
      states: item.states === undefined ? null : asStringList(item.states, `${where}.states`),
      format: parseFormat(item.format, where),
      formatDeclared: item.format !== undefined,
      derivesFrom: parseDerivesFrom(item['derives-from'], where),
      pluginBlocks,
    }
  }

  function parseGenerated(raw: unknown, index: number, file: string): GeneratedRuleRaw {
    const where = `${file}: generated[${index}]`
    const item = asRecord(raw, where)

    assertKnownKeys(item, new Set(['path', 'command']), where)

    return { path: requireString(item, 'path', where), command: requireString(item, 'command', where) }
  }

  function parseWatch(raw: unknown, index: number, file: string): WatchRuleRaw {
    const where = `${file}: watches[${index}]`
    const item = asRecord(raw, where)

    assertKnownKeys(item, new Set(['code', 'doc', 'reason', 'consumer-visible']), where)
    const reason = item.reason

    return {
      code: requireString(item, 'code', where),
      doc: requireString(item, 'doc', where),
      reason: typeof reason === 'string' ? reason : null,
      consumerVisible: item['consumer-visible'] === true,
    }
  }

  const ROOT_KEYS = new Set(['version', 'plugins', 'basePath', 'owned', 'generated', 'watches', 'ignore', 'include'])
  const CHILD_KEYS = new Set(['version', 'basePath', 'owned', 'generated', 'watches', 'ignore', 'include'])

  /** It only goes down: no `..`, no glob, no absolute path — that is what keeps pruning correct without opening the file (spec §5). */
  function parseBasePath(value: unknown, file: string): string | null {
    if (value === undefined || value === null) {
      return null
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new OwnershipError(`${file}: \`basePath\` must be a non-empty string.`)
    }

    const normalized = value.replace(/\\/g, '/').replace(/\/$/, '')

    if (normalized.startsWith('/') || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../') || normalized.includes('*')) {
      throw new OwnershipError(`${file}: \`basePath\` "${value}" must point inside the file's directory — no \`..\`, no glob and no absolute path.`)
    }

    return normalized
  }

  export function parseOwnershipFile(source: string, file: string, opts: ParseOptions): ParsedFile | RootFile {
    let raw: unknown

    try {
      raw = YAML.parse(source)
    } catch (err) {
      throw new OwnershipError(`${file}: invalid YAML — ${err instanceof Error ? err.message : String(err)}`)
    }

    const root = asRecord(raw, file)

    let pluginNames = opts.pluginNames
    let plugins: string[] | undefined

    // The version comes before the key check, and applies to every file, not just
    // the root: a v1 file has `artifacts`/`documents`, and "unknown key"
    // would hide the real reason.
    if (root.version === 1) {
      throw new OwnershipError(
        `${file}: schema v1 — the core only reads v2 (\`owned\` list, blocks per plugin). ` +
          'Migrate the file before using `ownership`; the migration does not yet have its own command.',
      )
    }
    if (root.version !== 2) {
      throw new OwnershipError(`${file}: the \`version\` field must be 2 (received: ${String(root.version)}).`)
    }

    assertKnownKeys(root, opts.isRoot ? ROOT_KEYS : CHILD_KEYS, file, opts.isRoot ? '' : ' `plugins` is exclusive to the root file.')

    if (opts.isRoot) {
      plugins = asStringList(root.plugins, `${file}.plugins`)
      pluginNames = plugins
    }

    const ownedRaw = asList(root.owned, `${file}.owned`)
    const generatedRaw = asList(root.generated, `${file}.generated`)
    const watchesRaw = asList(root.watches, `${file}.watches`)

    const parsed: ParsedFile = {
      file,
      dir: dirOf(file),
      version: 2,
      basePath: parseBasePath(root.basePath, file),
      owned: ownedRaw.map((entry, i) => parseOwned(entry, i, file, pluginNames)),
      generated: generatedRaw.map((entry, i) => parseGenerated(entry, i, file)),
      watches: watchesRaw.map((entry, i) => parseWatch(entry, i, file)),
      ignore: asStringList(root.ignore, `${file}.ignore`),
      include: asStringList(root.include, `${file}.include`),
    }

    return opts.isRoot ? { ...parsed, plugins: plugins ?? [] } : parsed
  }
  ```

- [ ] **Step 5: Run the tests**

  ```bash
  cd packages/ownership && node --test test/schema/parse.test.ts
  ```

  Expected: PASS on all.

- [ ] **Step 6: Type-check**

  ```bash
  cd packages/ownership && npm run typecheck
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add packages/ownership/src/schema/types.ts packages/ownership/src/schema/parse.ts packages/ownership/test/schema/parse.test.ts
  git commit -m "feat(<RN-schema>): strict parser of the v2 schema"
  ```

---

### Task 5: Opaque item identity

Source rule: `<RN-identity>`; spec §3. Generalizes `src/docs/table.ts` and `src/docs/sections.ts`
from `@esliph/living-docs`, removing the dependency on `IdFormat`/ID regex: the
key becomes whatever `format.key` (Task 4) says to read, with no required form.

**Two implementation decisions that this plan makes:**

- **A duplicate key does not throw.** The parser returns all the items and
  `findDuplicateKeys` points out the repetitions. Whoever decides what to do is the
  caller: the `ownership/declared-state` check (Task 12) turns it into a finding —
  spec §3 says the core guarantees a unique key, and a check's guarantee is a finding,
  not an exception that takes down the whole `validate`; the hook ignores it, by failing open.
- **In `sections`, an item is a level-2 heading (`##`).** Today's parser accepts
  `##` to `####` because it filters by the ID regex. Without that filter, every
  subheading (`### Example` inside a rule) would become an item — and a
  duplicate item. The three requirements files of this repository only use `##` for
  items. A configurable level is left for when a consumer asks.

**Files:**
- Create: `packages/ownership/src/schema/item.ts`
- Test: `packages/ownership/test/schema/item.test.ts`

**Interfaces:**
- Consumes: `FormatBlock` (Task 4).
- Produces: `interface DocItem { key: string; state: string; line: number; fields: Record<string, string> }`,
  `normalizeFieldKey(key: string): string`, `isEmptyValue(value: string): boolean`,
  `parseItemsTable(source: string, startLine: number, format: Pick<FormatBlock, 'key' | 'stateField'>): DocItem[]`,
  `parseItemsSections(source: string, startLine: number, format: Pick<FormatBlock, 'keyMode' | 'stateField'>): DocItem[]`,
  `findDuplicateKeys(items: readonly DocItem[]): DocItem[]`.

- [ ] **Step 1: Write the failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { findDuplicateKeys, parseItemsSections, parseItemsTable } from '../../src/schema/item.ts'

  test('parseItemsTable reads by the column named in format.key, opaque key', () => {
    const source = ['| ID | Gap | Status |', '| --- | ------ | ------ |', '| DA-01 | x | open |', '| T-9 | y | resolved |'].join('\n')
    const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['DA-01', 'T-9'],
    )
    assert.equal(items[0]?.state, 'open')
    assert.equal(items[0]?.fields.gap, 'x')
  })

  test('parseItemsTable: an empty cell or an empty marker does not become an item', () => {
    const source = ['| ID | Status |', '| --- | ------ |', '| - | open |', '| DA-01 | open |'].join('\n')
    const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['DA-01'],
    )
  })

  test('parseItemsTable without the declared column returns an empty list', () => {
    const source = ['| Name | Status |', '| ---- | ------ |', '| x | open |'].join('\n')

    assert.deepEqual(parseItemsTable(source, 1, { key: 'ID', stateField: 'status' }), [])
  })

  test('parseItemsTable returns the duplicate key, and findDuplicateKeys points out the repetition', () => {
    const source = ['| ID | Status |', '| --- | ------ |', '| DA-01 | open |', '| DA-01 | resolved |'].join('\n')
    const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

    assert.equal(items.length, 2)
    assert.deepEqual(
      findDuplicateKeys(items).map(item => item.line),
      [4],
    )
  })

  test('parseItemsSections, keyMode first-token: the first token is the key, the rest is the title', () => {
    const source = '## RN-0001 — Rule title\n\n- **status:** active\n- **relates-to:** ADR-0002\n\nBody.\n'
    const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

    assert.equal(items[0]?.key, 'RN-0001')
    assert.equal(items[0]?.fields.title, 'Rule title')
    assert.equal(items[0]?.state, 'active')
    assert.equal(items[0]?.fields['relates-to'], 'ADR-0002')
  })

  test('parseItemsSections, keyMode heading: the whole heading line is the key', () => {
    const source = '## Context\n\nText.\n\n## Decision\n\nOther text.\n'
    const items = parseItemsSections(source, 1, { keyMode: 'heading', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['Context', 'Decision'],
    )
  })

  test('parseItemsSections skips a fenced code block', () => {
    const source = '```\n## RN-9999 — format example\n```\n\n## RN-0001 — real\n\n- **status:** active\n'
    const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['RN-0001'],
    )
  })

  test('parseItemsSections: a duplicate key shows up in findDuplicateKeys', () => {
    const source = '## X — one\n\n- **status:** active\n\n## X — two\n\n- **status:** active\n'

    assert.equal(findDuplicateKeys(parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })).length, 1)
  })

  test('parseItemsSections: only a level-2 heading is an item; a subheading is body', () => {
    const source = '## RN-0001 — a\n\n### Example\n\n## RN-0002 — b\n\n### Example\n'
    const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['RN-0001', 'RN-0002'],
    )
  })

  test('a custom state-field is read instead of status', () => {
    const source = '## X — one\n\n- **state:** open\n'
    const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'state' })

    assert.equal(items[0]?.state, 'open')
  })
  ```

- [ ] **Step 2: Run and confirm they fail**

  ```bash
  cd packages/ownership && node --test test/schema/item.test.ts
  ```

- [ ] **Step 3: Write `schema/item.ts`**

  ```typescript
  import type { FormatBlock } from './types.ts'

  export interface DocItem {
    key: string
    state: string
    /** 1-indexed line in the whole file. */
    line: number
    fields: Record<string, string>
  }

  export function normalizeFieldKey(key: string): string {
    return key.trim().replace(/:$/, '').trim().toLowerCase()
  }

  const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'null', 'none', 'nothing'])

  export function isEmptyValue(value: string): boolean {
    return EMPTY.has(value.trim().toLowerCase())
  }

  /** Each occurrence after the first of an already-seen key. It does not throw: the caller decides (spec §3). */
  export function findDuplicateKeys(items: readonly DocItem[]): DocItem[] {
    const seen = new Set<string>()
    const duplicates: DocItem[] = []

    for (const item of items) {
      if (seen.has(item.key)) {
        duplicates.push(item)
      }
      seen.add(item.key)
    }

    return duplicates
  }

  function cells(row: string): string[] {
    const trimmed = row.trim()

    if (!trimmed.startsWith('|')) {
      return []
    }

    return trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim())
  }

  function isSeparator(row: string): boolean {
    const parts = cells(row)

    return parts.length > 0 && parts.every(cell => /^:?-{3,}:?$/.test(cell))
  }

  export function parseItemsTable(source: string, startLine: number, format: Pick<FormatBlock, 'key' | 'stateField'>): DocItem[] {
    const keyName = normalizeFieldKey(format.key ?? '')
    const lines = source.replace(/\r\n/g, '\n').split('\n')

    for (let i = 0; i < lines.length; i++) {
      const header = cells(lines[i] ?? '')
      const keyColumn = header.findIndex(cell => normalizeFieldKey(cell) === keyName)

      if (keyColumn === -1) {
        continue
      }
      if (!isSeparator(lines[i + 1] ?? '')) {
        continue
      }

      const stateColumn = header.findIndex(cell => normalizeFieldKey(cell) === format.stateField)
      const items: DocItem[] = []

      for (let j = i + 2; j < lines.length; j++) {
        const row = cells(lines[j] ?? '')

        if (row.length === 0) {
          break
        }
        const key = (row[keyColumn] ?? '').trim()

        if (key === '' || isEmptyValue(key)) {
          continue
        }

        const fields: Record<string, string> = {}

        for (let c = 0; c < header.length; c++) {
          const fieldKey = normalizeFieldKey(header[c] ?? '')

          if (fieldKey !== '') {
            fields[fieldKey] = (row[c] ?? '').trim()
          }
        }

        items.push({ key, state: stateColumn === -1 ? '' : (row[stateColumn] ?? '').trim(), line: startLine + j, fields })
      }

      return items
    }

    return []
  }

  /** Only `##`: a subheading is the item's body, not an item (see the decision at the top of the task). */
  const SECTION_HEADING = /^##\s+(.*)$/
  /** The first token is the key; the rest, without the optional dash, is the title. */
  const FIRST_TOKEN = /^(\S+)(?:\s+(?:[—–-]\s*)?(.*))?$/
  const FIELD = /^[-*]\s+\*\*([^*]+?)\*\*\s*:?\s*(.*)$/
  const FENCE = /^(?:```|~~~)/

  export function parseItemsSections(source: string, startLine: number, format: Pick<FormatBlock, 'keyMode' | 'stateField'>): DocItem[] {
    const lines = source.replace(/\r\n/g, '\n').split('\n')
    const items: DocItem[] = []
    let inFence = false

    for (let i = 0; i < lines.length; i++) {
      const trimmed = (lines[i] ?? '').trim()

      if (FENCE.test(trimmed)) {
        inFence = !inFence
        continue
      }
      if (inFence) {
        continue
      }

      const heading = SECTION_HEADING.exec(trimmed)

      if (!heading?.[1]) {
        continue
      }

      const headingText = heading[1].trim()
      let key: string
      let title: string | undefined

      if (format.keyMode === 'heading') {
        key = headingText
      } else {
        const match = FIRST_TOKEN.exec(headingText)

        key = match?.[1] ?? headingText
        title = match?.[2]?.trim()
      }
      if (key === '') {
        continue
      }

      const fields: Record<string, string> = {}

      if (title) {
        fields.title = title
      }

      for (let j = i + 1; j < lines.length; j++) {
        const line = (lines[j] ?? '').trim()

        if (line === '') {
          continue
        }
        if (SECTION_HEADING.test(line) || line.startsWith('#') || FENCE.test(line)) {
          break
        }
        const field = FIELD.exec(line)

        if (!field?.[1]) {
          break
        }
        fields[normalizeFieldKey(field[1])] = (field[2] ?? '').trim()
      }

      items.push({ key, state: fields[format.stateField] ?? '', line: startLine + i, fields })
    }

    return items
  }
  ```

- [ ] **Step 4: Run the tests**

  ```bash
  cd packages/ownership && node --test test/schema/item.test.ts && npm run typecheck
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ownership/src/schema/item.ts packages/ownership/test/schema/item.test.ts
  git commit -m "feat(<RN-identity>): opaque item identity — key by format.key, no ID regex"
  ```

---

### Task 6: Root file resolution

Source rule: `<RN-resolution>`; spec §8 and the "file resolution" ADR from Task 1.

**Files:**
- Create: `packages/ownership/src/resolve/candidates.ts`
- Test: `packages/ownership/test/resolve/candidates.test.ts`

**Interfaces:**
- Consumes: `OwnershipError` (Task 4).
- Produces: `interface LocateOptions { explicitPath?: string | null; env?: Record<string, string | undefined> }`,
  `locateRootFile(root: string, opts?: LocateOptions): string | null`.

- [ ] **Step 1: Write the failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { locateRootFile } from '../../src/resolve/candidates.ts'
  import { OwnershipError } from '../../src/schema/types.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('with no candidate at all, it returns null (silence)', () => {
    withTempRepo({}, root => {
      assert.equal(locateRootFile(root), null)
    })
  })

  test('finds ./.ownership.yml', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
      assert.equal(locateRootFile(root), '.ownership.yml')
    })
  })

  test('finds ./docs/.ownership.yml when the first does not exist', () => {
    withTempRepo({ 'docs/.ownership.yml': 'version: 2\nowned: []\n' }, root => {
      assert.equal(locateRootFile(root), 'docs/.ownership.yml')
    })
  })

  test('both candidates present is an error that names both', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'docs/.ownership.yml': 'version: 2\nowned: []\n' }, root => {
      assert.throws(() => locateRootFile(root), (err: unknown) => {
        assert.ok(err instanceof OwnershipError)
        assert.match(err.message, /\.ownership\.yml/)
        assert.match(err.message, /docs\/\.ownership\.yml/)

        return true
      })
    })
  })

  test('explicit --ownership beats everything, even without existing among the default candidates', () => {
    withTempRepo({ 'custom/o.yml': 'version: 2\nowned: []\n' }, root => {
      assert.equal(locateRootFile(root, { explicitPath: 'custom/o.yml' }), 'custom/o.yml')
    })
  })

  test('an explicit --ownership that does not exist is an error', () => {
    withTempRepo({}, root => {
      assert.throws(() => locateRootFile(root, { explicitPath: 'nope.yml' }), OwnershipError)
    })
  })

  test('the OWNERSHIP_CONFIG environment variable has the same priority as the explicit one', () => {
    withTempRepo({ 'custom/o.yml': 'version: 2\nowned: []\n' }, root => {
      assert.equal(locateRootFile(root, { env: { OWNERSHIP_CONFIG: 'custom/o.yml' } }), 'custom/o.yml')
    })
  })
  ```

- [ ] **Step 2: Run and confirm they fail**

  ```bash
  cd packages/ownership && node --test test/resolve/candidates.test.ts
  ```

- [ ] **Step 3: Write `resolve/candidates.ts`**

  ```typescript
  import { existsSync } from 'node:fs'
  import { join } from 'node:path'
  import { OwnershipError } from '../schema/types.ts'

  export interface LocateOptions {
    /** Comes from `--ownership <path>` in the CLI. */
    explicitPath?: string | null
    env?: Record<string, string | undefined>
  }

  /** Candidate order when nothing is explicit (spec §8). */
  const CANDIDATES: readonly string[] = ['.ownership.yml', 'docs/.ownership.yml']

  /**
   * The root ownership file, or `null` — a repository without the toolkit, and this
   * is not an error. Two candidates present is an error that names both and never
   * chooses: a freshly migrated file living alongside a forgotten one would silently
   * validate against the forgotten one.
   */
  export function locateRootFile(root: string, opts: LocateOptions = {}): string | null {
    const explicit = opts.explicitPath ?? opts.env?.OWNERSHIP_CONFIG ?? null

    if (explicit !== null) {
      if (!existsSync(join(root, explicit))) {
        throw new OwnershipError(`${explicit}: not found — explicitly indicated and does not exist in the repository.`)
      }

      return explicit
    }

    const found = CANDIDATES.filter(candidate => existsSync(join(root, candidate)))

    if (found.length > 1) {
      throw new OwnershipError(
        `More than one ownership file found: ${found.join(', ')}. ` +
          'The ambiguity does not resolve itself — delete one of the two, or point to the right one with `--ownership <path>`.',
      )
    }

    return found[0] ?? null
  }
  ```

- [ ] **Step 4: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/resolve/candidates.test.ts && npm run typecheck
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ownership/src/resolve/candidates.ts packages/ownership/test/resolve/candidates.test.ts
  git commit -m "feat(<RN-resolution>): root file resolution by candidate order"
  ```

---

### Task 7: Composition — base, include, disjointness, cycle, pruning

Source rule: spec §5, `<ADR-composition>` and `<RN-composition>`. It resolves the
tree of ownership files into a single `ResolvedConfig`, which every
trigger/check/hook task consumes from here on.

**What the spec fixes and this task implements:**

- **Base of each file.** It is the file's directory plus the `basePath`, which only
  goes down. The base of the root is the repository root, wherever the root file lives.
- **Confinement by the trigger criterion.** `owned[].path`,
  `derives-from.source`, `generated[].path`, `watches[].code`, `ignore[]` and
  `include[]` resolve inside the base; `watches[].doc` may point anywhere
  in the repository, because nothing fires from editing it.
- **Disjointness.** No resolved `owned[].path` is equal to another or a directory
  prefix of another, whether they come from the same file or from different files. A collision
  is an error that names both files and the path. `generated[].path` is only checked
  against another `generated[].path`; `watches` overlap freely.
- **`version` in every file, `plugins` only at the root.** A divergent version between
  two files is an error that names both.
- **Accumulation.** `owned`, `watches`, `generated` and `ignore` concatenate. There is no
  merge inside an entry, and that is why `owner` is required in all of them.
- **Pruning.** `resolveOwnership(root, { onlyFor })` only reads an included file whose
  directory is an ancestor of some path in `onlyFor` — string comparison, without
  opening the file. Hooks pass `onlyFor`; `validate` and `explain` do not prune.

**Implementation decisions that this plan makes** (they are not in the spec letter for
letter; they stay here so whoever reviews can disagree):

- **Pruning compares the file's directory, not the base.** Since `basePath` only
  goes down, the base is always a descendant of the directory, so a directory that reaches
  no path in `onlyFor` guarantees that the base does not reach one either. This is what
  allows pruning without opening the file to read its `basePath`.
- **Collision is detected by a pairwise scan.** There are dozens of entries, not
  thousands; a sorted index would save comparisons and cost the error message,
  which needs to name both sides.
- **`origin` is the file, not the file and the line.** The path already identifies the
  entry unambiguously — it is the disjointness key —, and tracking the line would force
  the parser to swap `YAML.parse` for `parseDocument` and to carry a position in every
  entry, a cost the message does not pay for.
- **File name found by a directory include:** `.ownership.yml`,
  `ownership.yml`, or `ownership.<subject>.yml` (with or without a leading dot, and
  `.yaml`).
- **A file included twice is an error**, with its own message — distinct from a
  cycle, which is a file included by a descendant of itself.

**Files:**
- Create: `packages/ownership/src/resolve/hierarchy.ts`
- Test: `packages/ownership/test/resolve/hierarchy.test.ts`

**Interfaces:**
- Consumes: `parseOwnershipFile`, `RootFile`, `ParsedFile`, `OwnedRuleRaw`,
  `GeneratedRuleRaw`, `WatchRuleRaw`, `OwnershipError` (Task 4);
  `locateRootFile` (Task 6).
- Produces:
  ```typescript
  interface ResolvedOwnedRule {
    path: string
    owner: string
    skill: string | null
    states: string[] | null
    format: FormatBlock
    derivesFrom: DerivesFrom | null
    pluginBlocks: Record<string, unknown>
    /** Ownership file that declared this entry. */
    origin: string
  }
  interface ResolvedGeneratedRule { path: string; command: string; origin: string }
  interface ResolvedWatchRule { code: string; doc: string; reason: string | null; consumerVisible: boolean; origin: string }
  /** Each file read and its base — this is what lets `explain` say who should govern a path with no owner. */
  interface ResolvedFile { file: string; base: string }
  interface ResolvedConfig {
    version: 2
    plugins: string[]
    owned: ResolvedOwnedRule[]
    generated: ResolvedGeneratedRule[]
    watches: ResolvedWatchRule[]
    ignore: string[]
    files: ResolvedFile[]
    rootDir: string
    rootFile: string
  }
  interface ResolveOptions { explicitPath?: string | null; env?: Record<string, string | undefined>; onlyFor?: readonly string[] }
  function resolveOwnership(repoRoot: string, opts?: ResolveOptions): ResolvedConfig | null
  function findOwnedRule(config: ResolvedConfig, repoPath: string): ResolvedOwnedRule | null
  function findGeneratedRule(config: ResolvedConfig, repoPath: string): ResolvedGeneratedRule | null
  ```
  Tasks 8–20 consume exactly these names and types.

- [ ] **Step 1: Write the failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { findOwnedRule, resolveOwnership } from '../../src/resolve/hierarchy.ts'
  import { OwnershipError } from '../../src/schema/types.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const BASE = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    skill: decision-recorder\n'
  const CHILD = 'version: 2\nowned:\n  - path: docs/\n    owner: "@b"\n'

  test('without an ownership file, resolveOwnership returns null', () => {
    withTempRepo({}, root => {
      assert.equal(resolveOwnership(root), null)
    })
  })

  test('single file: the resolved entry points to its own file as origin', () => {
    withTempRepo({ '.ownership.yml': BASE }, root => {
      const config = resolveOwnership(root)

      assert.equal(config?.owned[0]?.path, 'docs/decisions/adr/')
      assert.equal(config?.owned[0]?.origin, '.ownership.yml')
    })
  })

  test('the root base is the repository root even when it lives in docs/', () => {
    withTempRepo({ 'docs/.ownership.yml': 'version: 2\nowned:\n  - path: CLAUDE.md\n    owner: "@a"\n' }, root => {
      assert.equal(resolveOwnership(root)?.owned[0]?.path, 'CLAUDE.md')
    })
  })

  test('a directory include finds the single ownership file inside it', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n    owner: "@b"\n',
      },
      root => {
        const rule = findOwnedRule(resolveOwnership(root)!, 'packages/api/docs/x.md')

        assert.equal(rule?.owner, '@b')
        assert.equal(rule?.origin, 'packages/api/.ownership.yml')
      },
    )
  })

  test('an explicit file include works when there is more than one in the directory', () => {
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': CHILD }, root => {
      assert.equal(resolveOwnership(root)?.owned.length, 2)
    })
  })

  test('a directory include with more than one ownership file is ambiguous', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\n',
        'packages/api/ownership.extra.yml': 'version: 2\nowned: []\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /ambiguous/)
      },
    )
  })

  test('an include pointing to a file that does not exist is an OwnershipError', () => {
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n` }, root => {
      assert.throws(() => resolveOwnership(root), OwnershipError)
    })
  })

  test('a nested include is read', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\ninclude: [sub/]\n',
        'packages/api/sub/.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n    owner: "@c"\n',
      },
      root => {
        assert.equal(findOwnedRule(resolveOwnership(root)!, 'packages/api/sub/docs/x.md')?.owner, '@c')
      },
    )
  })

  test('an include cycle is an error', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned: []\ninclude: [.ownership.yml]\n' },
      root => {
        assert.throws(() => resolveOwnership(root), /Include cycle/)
      },
    )
  })

  test('the same file included by two is an error, and is not confused with a cycle', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [ownership.a.yml, ownership.b.yml]\n`,
        'ownership.a.yml': 'version: 2\nowned: []\ninclude: [ownership.shared.yml]\n',
        'ownership.b.yml': 'version: 2\nowned: []\ninclude: [ownership.shared.yml]\n',
        'ownership.shared.yml': 'version: 2\nowned: []\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /included only once/)
      },
    )
  })

  test('a path declared outside the base of the file that declares it is an error', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: ../web/docs/\n    owner: "@b"\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /outside the base/)
      },
    )
  })

  test('an include that leaves the base is also an error', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'version: 2\nowned: []\ninclude: [../web/]\n' },
      root => {
        assert.throws(() => resolveOwnership(root), /outside the base/)
      },
    )
  })

  test('derives-from.source outside the base is an error — otherwise pruning kills the reminder', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml':
          'version: 2\nowned:\n  - path: plans/\n    owner: "@b"\n    derives-from:\n      source: ../../docs/specs/\n      field: spec\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /outside the base/)
      },
    )
  })

  test('watches[].doc may leave the base; watches[].code may not', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: src/**\n    doc: ../../CHANGELOG.md\n',
      },
      root => {
        const watch = resolveOwnership(root)!.watches[0]

        assert.equal(watch?.code, 'packages/api/src/**')
        assert.equal(watch?.doc, 'CHANGELOG.md')
      },
    )
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: ../../src/**\n    doc: CHANGELOG.md\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /outside the base/)
      },
    )
  })

  test('basePath shifts the base inward', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [ownership.api.yml]\n`,
        'ownership.api.yml': 'version: 2\nbasePath: packages/api\nowned:\n  - path: docs/\n    owner: "@b"\n',
      },
      root => {
        assert.equal(findOwnedRule(resolveOwnership(root)!, 'packages/api/docs/x.md')?.owner, '@b')
      },
    )
  })

  test('a basePath that goes up is an error', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'version: 2\nbasePath: ../web\nowned: []\n' },
      root => {
        assert.throws(() => resolveOwnership(root), OwnershipError)
      },
    )
  })

  test('the same path declared twice in the same file is a collision', () => {
    withTempRepo({ '.ownership.yml': `${BASE}  - path: docs/decisions/adr/\n    owner: "@b"\n` }, root => {
      assert.throws(() => resolveOwnership(root), /collides/)
    })
  })

  test('a path contained in another is a collision, even across different files', () => {
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': CHILD }, root => {
      assert.throws(() => resolveOwnership(root), /collides/)
    })
  })

  test('sibling paths do not collide', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned:\n  - path: docs/specs/\n    owner: "@b"\n' },
      root => {
        assert.equal(resolveOwnership(root)?.owned.length, 2)
      },
    )
  })

  test('a generated path inside a governed path is not a collision; two generators for the same file are', () => {
    withTempRepo({ '.ownership.yml': `${BASE}generated:\n  - path: docs/decisions/adr/index.gen.md\n    command: gen\n` }, root => {
      assert.equal(resolveOwnership(root)?.generated.length, 1)
    })
    withTempRepo({ '.ownership.yml': `${BASE}generated:\n  - path: x.gen.md\n    command: a\n  - path: x.gen.md\n    command: b\n` }, root => {
      assert.throws(() => resolveOwnership(root), /collides/)
    })
  })

  test('two watches for the same code coexist', () => {
    withTempRepo({ '.ownership.yml': `${BASE}watches:\n  - code: src/**\n    doc: a.md\n  - code: src/**\n    doc: b.md\n` }, root => {
      assert.equal(resolveOwnership(root)?.watches.length, 2)
    })
  })

  test('an included file without version is an error, and with a divergent version too', () => {
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'owned: []\n' }, root => {
      assert.throws(() => resolveOwnership(root), OwnershipError)
    })
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 3\nowned: []\n' }, root => {
      assert.throws(() => resolveOwnership(root), /version/)
    })
  })

  test('an entry without owner is an error — there is nowhere to inherit from', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n' }, root => {
      assert.throws(() => resolveOwnership(root), OwnershipError)
    })
  })

  test('watches, generated and ignore accumulate across files', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\nwatches:\n  - code: src/**\n    doc: docs/decisions/adr/\nignore: ["node_modules/**"]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: src/**\n    doc: ../../docs/decisions/adr/\nignore: ["dist/**"]\n',
      },
      root => {
        const config = resolveOwnership(root)!

        assert.equal(config.watches.length, 2)
        assert.deepEqual(config.ignore, ['node_modules/**', 'packages/api/dist/**'])
      },
    )
  })

  test('pruning: a file whose directory reaches no path is not read', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'this is not valid YAML: [\n' },
      root => {
        assert.doesNotThrow(() => resolveOwnership(root, { onlyFor: ['packages/web/x.ts'] }))
        assert.throws(() => resolveOwnership(root, { onlyFor: ['packages/api/x.ts'] }), OwnershipError)
      },
    )
  })

  test('findOwnedRule finds the single rule that covers, and null when none does', () => {
    withTempRepo({ '.ownership.yml': BASE }, root => {
      const config = resolveOwnership(root)!

      assert.equal(findOwnedRule(config, 'docs/decisions/adr/ADR-0001-x.md')?.owner, '@a')
      assert.equal(findOwnedRule(config, 'src/index.ts'), null)
    })
  })
  ```

- [ ] **Step 2: Run and confirm they fail**

  ```bash
  cd packages/ownership && node --test test/resolve/hierarchy.test.ts
  ```

- [ ] **Step 3: Write `resolve/hierarchy.ts`**

  ```typescript
  import { readFileSync, readdirSync, statSync } from 'node:fs'
  import { join, posix } from 'node:path'
  import { locateRootFile } from './candidates.ts'
  import { parseOwnershipFile } from '../schema/parse.ts'
  import { OwnershipError } from '../schema/types.ts'
  import type { DerivesFrom, FormatBlock, GeneratedRuleRaw, ParsedFile, RootFile, WatchRuleRaw } from '../schema/types.ts'

  export interface ResolvedOwnedRule {
    path: string
    owner: string
    skill: string | null
    states: string[] | null
    format: FormatBlock
    derivesFrom: DerivesFrom | null
    pluginBlocks: Record<string, unknown>
    /** Ownership file that declared this entry. */
    origin: string
  }

  export interface ResolvedGeneratedRule extends GeneratedRuleRaw {
    origin: string
  }

  export interface ResolvedWatchRule extends WatchRuleRaw {
    origin: string
  }

  /** Each file read and its base — this is what lets `explain` say who should govern a path with no owner. */
  export interface ResolvedFile {
    file: string
    base: string
  }

  export interface ResolvedConfig {
    version: 2
    plugins: string[]
    owned: ResolvedOwnedRule[]
    generated: ResolvedGeneratedRule[]
    watches: ResolvedWatchRule[]
    ignore: string[]
    files: ResolvedFile[]
    rootDir: string
    rootFile: string
  }

  export interface ResolveOptions {
    explicitPath?: string | null
    env?: Record<string, string | undefined>
    /** Pruning: only reads included files whose directory is an ancestor of one of these paths. */
    onlyFor?: readonly string[]
  }

  function joinRel(base: string, entry: string): string {
    const combined = base === '' ? entry : `${base}/${entry}`
    const normalized = posix.normalize(combined.replace(/\\/g, '/'))

    return entry.endsWith('/') && !normalized.endsWith('/') ? `${normalized}/` : normalized
  }

  function withinBase(base: string, resolvedPath: string): boolean {
    if (resolvedPath === '..' || resolvedPath.startsWith('../')) {
      return false
    }

    return base === '' || resolvedPath === base || resolvedPath === `${base}/` || resolvedPath.startsWith(`${base}/`)
  }

  /** The file's directory plus the `basePath` — which the parser already guaranteed neither goes up nor has a glob. */
  function baseOf(file: ParsedFile): string {
    const base = file.basePath === null ? file.dir : joinRel(file.dir, file.basePath)

    return base.replace(/\/$/, '')
  }

  /**
   * `watches[].doc` is left out: it is the only field that is never an edited path, and it is
   * what lets a package point to the root CHANGELOG (spec §5).
   */
  function assertConfinement(file: ParsedFile, base: string): void {
    const declared: string[] = [
      ...file.owned.flatMap(rule => (rule.derivesFrom === null ? [rule.path] : [rule.path, rule.derivesFrom.source])),
      ...file.generated.map(rule => rule.path),
      ...file.watches.map(rule => rule.code),
      ...file.ignore,
      ...file.include,
    ]

    for (const entry of declared) {
      const resolved = joinRel(base, entry)

      if (!withinBase(base, resolved)) {
        throw new OwnershipError(
          `${file.file}: "${entry}" resolves to "${resolved}", outside the base of the file ("${base || '.'}"). ` +
            'A path that can be edited never escapes the base of whoever declares it.',
        )
      }
    }
  }

  const OWNERSHIP_FILE_NAME = /^\.?ownership(?:\.[^/.]+)?\.ya?ml$/

  function listOwnershipFilesIn(repoRoot: string, dir: string): string[] {
    let entries: string[]

    try {
      entries = readdirSync(join(repoRoot, dir))
    } catch {
      return []
    }

    return entries.filter(entry => OWNERSHIP_FILE_NAME.test(entry) && statSync(join(repoRoot, dir, entry)).isFile()).map(entry => joinRel(dir, entry))
  }

  function dirOf(file: string): string {
    const dir = posix.dirname(file)

    return dir === '.' ? '' : dir
  }

  function isAncestorOfAny(dir: string, paths: readonly string[] | undefined): boolean {
    if (paths === undefined || dir === '') {
      return true
    }

    return paths.some(path => path.replace(/\\/g, '/').startsWith(`${dir}/`))
  }

  function readOwnershipFile(repoRoot: string, file: string, referencedBy: string): string {
    try {
      return readFileSync(join(repoRoot, file), 'utf8')
    } catch {
      throw new OwnershipError(`${referencedBy}: include points to "${file}", which does not exist or cannot be read.`)
    }
  }

  function collectTree(repoRoot: string, root: RootFile, onlyFor: readonly string[] | undefined): ParsedFile[] {
    const files: ParsedFile[] = [root]
    const seen = new Set<string>([root.file])

    function walk(file: ParsedFile, base: string, ancestors: readonly string[]): void {
      for (const entry of file.include) {
        const target = joinRel(base, entry)
        // Pruning by directory: since `basePath` only goes down, the included file's base is
        // a descendant of it, and a directory that does not reach also does not reach through it.
        const targetDir = entry.endsWith('/') ? target.replace(/\/$/, '') : dirOf(target)

        if (!isAncestorOfAny(targetDir, onlyFor)) {
          continue
        }

        let includedFile: string

        if (entry.endsWith('/')) {
          const candidates = listOwnershipFilesIn(repoRoot, target)

          if (candidates.length === 0) {
            throw new OwnershipError(`${file.file}: include "${entry}" has no ownership file inside.`)
          }
          if (candidates.length > 1) {
            throw new OwnershipError(`${file.file}: include "${entry}" is ambiguous — ${candidates.join(', ')}. Name the file explicitly.`)
          }
          includedFile = candidates[0]!
        } else {
          includedFile = target
        }

        if (ancestors.includes(includedFile)) {
          throw new OwnershipError(`Include cycle: ${[...ancestors, includedFile].join(' → ')}.`)
        }
        if (seen.has(includedFile)) {
          throw new OwnershipError(`${file.file}: "${includedFile}" has already been included by another file. An ownership file is included only once.`)
        }
        seen.add(includedFile)

        const parsed = parseOwnershipFile(readOwnershipFile(repoRoot, includedFile, file.file), includedFile, { isRoot: false, pluginNames: root.plugins }) as ParsedFile

        if (parsed.version !== root.version) {
          throw new OwnershipError(`${includedFile}: version ${parsed.version} diverges from ${root.file} (version ${root.version}). One repository, one schema.`)
        }

        const childBase = baseOf(parsed)

        assertConfinement(parsed, childBase)
        files.push(parsed)
        walk(parsed, childBase, [...ancestors, includedFile])
      }
    }

    walk(root, baseOf(root), [root.file])

    return files
  }

  /** Directory containment: `docs/` contains `docs/adr/x.md`; two files only collide if they are the same. */
  function collides(a: string, b: string): boolean {
    if (a === b) {
      return true
    }

    return (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b))
  }

  interface Declared {
    path: string
    file: string
  }

  function assertDisjoint(declared: readonly Declared[], what: string): void {
    for (let i = 0; i < declared.length; i += 1) {
      for (let j = i + 1; j < declared.length; j += 1) {
        const a = declared[i]!
        const b = declared[j]!

        if (collides(a.path, b.path)) {
          throw new OwnershipError(
            `${what}: "${a.path}" (${a.file}) collides with "${b.path}" (${b.file}). ` + 'A path is governed by a single declaration — none contains another.',
          )
        }
      }
    }
  }

  function collectOwned(files: readonly ParsedFile[]): ResolvedOwnedRule[] {
    const resolved: ResolvedOwnedRule[] = []

    for (const file of files) {
      const base = baseOf(file)

      for (const rule of file.owned) {
        resolved.push({
          path: joinRel(base, rule.path),
          owner: rule.owner,
          skill: rule.skill,
          states: rule.states,
          format: rule.format,
          derivesFrom: rule.derivesFrom === null ? null : { ...rule.derivesFrom, source: joinRel(base, rule.derivesFrom.source) },
          pluginBlocks: rule.pluginBlocks,
          origin: file.file,
        })
      }
    }

    assertDisjoint(
      resolved.map(rule => ({ path: rule.path, file: rule.origin })),
      'owned',
    )

    return resolved
  }

  export function resolveOwnership(repoRoot: string, opts: ResolveOptions = {}): ResolvedConfig | null {
    const rootFile = locateRootFile(repoRoot, opts)

    if (rootFile === null) {
      return null
    }

    const parsedRoot = parseOwnershipFile(readFileSync(join(repoRoot, rootFile), 'utf8'), rootFile, { isRoot: true, pluginNames: [] }) as RootFile
    // The root's base is the repository root, wherever the file lives (spec §5).
    const root: RootFile = { ...parsedRoot, dir: '' }
    const rootBase = baseOf(root)

    assertConfinement(root, rootBase)
    const files = collectTree(repoRoot, root, opts.onlyFor)

    const generated: ResolvedGeneratedRule[] = files.flatMap(file =>
      file.generated.map(rule => ({ ...rule, path: joinRel(baseOf(file), rule.path), origin: file.file })),
    )
    const watches: ResolvedWatchRule[] = files.flatMap(file =>
      file.watches.map(rule => ({ ...rule, code: joinRel(baseOf(file), rule.code), doc: joinRel(baseOf(file), rule.doc), origin: file.file })),
    )
    const ignore = files.flatMap(file => file.ignore.map(entry => joinRel(baseOf(file), entry)))

    assertDisjoint(
      generated.map(rule => ({ path: rule.path, file: rule.origin })),
      'generated',
    )

    return {
      version: 2,
      plugins: root.plugins,
      owned: collectOwned(files),
      generated,
      watches,
      ignore,
      files: files.map(file => ({ file: file.file, base: baseOf(file) })),
      rootDir: repoRoot,
      rootFile,
    }
  }

  function normalize(repoPath: string): string {
    return repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
  }

  function covers(declared: string, repoPath: string): boolean {
    const target = declared.replace(/\\/g, '/')

    return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target
  }

  /** The `owned[]` rule that governs this path — disjointness guarantees there is only one. */
  export function findOwnedRule(config: ResolvedConfig, repoPath: string): ResolvedOwnedRule | null {
    const target = normalize(repoPath)

    return config.owned.find(rule => covers(rule.path, target)) ?? null
  }

  export function findGeneratedRule(config: ResolvedConfig, repoPath: string): ResolvedGeneratedRule | null {
    const target = normalize(repoPath)

    return config.generated.find(rule => normalize(rule.path) === target) ?? null
  }
  ```

- [ ] **Step 4: Run the tests**

  ```bash
  cd packages/ownership && node --test test/resolve/hierarchy.test.ts
  ```

- [ ] **Step 5: Type-check and the whole package suite**

  ```bash
  cd packages/ownership && npm run typecheck && node --test "test/**/*.test.ts"
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add packages/ownership/src/resolve/hierarchy.ts packages/ownership/test/resolve/hierarchy.test.ts
  git commit -m "feat(<RN-composition>): composition — base, include, disjointness, cycle, pruning"
  ```

---

### Task 8: `ownership explain <path>`

Source rule: `<RF-explain>` and spec §5 ("unauditable governance is worse than
absent governance"). Task 7 already delivers `origin` per entry and `files` with the
base of each file read — this task only formats. With disjointness, the hard question
stops being "which rule won" and becomes "why does this path have no
owner": the answer is the file whose base contains it, which is where the entry that
is missing should be written.

**Files:**
- Create: `packages/ownership/src/resolve/explain.ts`
- Test: `packages/ownership/test/resolve/explain.test.ts`

**Interfaces:**
- Consumes: `ResolvedConfig`, `ResolvedOwnedRule`, `findOwnedRule` (Task 7).
- Produces: `explainPath(config: ResolvedConfig, repoPath: string): string`.

- [ ] **Step 1: Write the failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { explainPath } from '../../src/resolve/explain.ts'
  import { resolveOwnership } from '../../src/resolve/hierarchy.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('with no rule covering the path, it says so and points to where the entry would fit', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
      const text = explainPath(resolveOwnership(root)!, 'x.md')

      assert.match(text, /no rule/)
      assert.match(text, /would fit in \.ownership\.yml/)
    })
  })

  test('the file pointed to is the one with the deepest base that contains the path', () => {
    withTempRepo(
      {
        '.ownership.yml': 'version: 2\ninclude: [packages/api/]\nowned: []\n',
        'packages/api/.ownership.yml': 'version: 2\nowned: []\n',
      },
      root => {
        assert.match(explainPath(resolveOwnership(root)!, 'packages/api/x.md'), /would fit in packages\/api\/\.ownership\.yml/)
      },
    )
  })

  test('shows the rule that covers and the file that declared it', () => {
    withTempRepo(
      {
        '.ownership.yml': 'version: 2\ninclude: [packages/api/]\nowned: []\n',
        'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: ./\n    owner: "@a"\n    skill: other\n',
      },
      root => {
        const text = explainPath(resolveOwnership(root)!, 'packages/api/x.md')

        assert.match(text, /declared in: packages\/api\/\.ownership\.yml/)
        assert.match(text, /owner: @a/)
        assert.match(text, /skill: other/)
        assert.match(text, /states: —/)
      },
    )
  })
  ```

- [ ] **Step 2: Run and confirm they fail**

  ```bash
  cd packages/ownership && node --test test/resolve/explain.test.ts
  ```

- [ ] **Step 3: Write `resolve/explain.ts`**

  ```typescript
  import { findOwnedRule } from './hierarchy.ts'
  import type { ResolvedConfig } from './hierarchy.ts'

  /** The file with the deepest base that contains the path — where the missing entry should be written. */
  function fileResponsibleFor(config: ResolvedConfig, repoPath: string): string | null {
    let best: { file: string; base: string } | null = null

    for (const candidate of config.files) {
      const covers = candidate.base === '' || repoPath.startsWith(`${candidate.base}/`)

      if (covers && (best === null || candidate.base.length > best.base.length)) {
        best = candidate
      }
    }

    return best === null ? null : best.file
  }

  export function explainPath(config: ResolvedConfig, repoPath: string): string {
    const rule = findOwnedRule(config, repoPath)

    if (rule === null) {
      const responsible = fileResponsibleFor(config, repoPath)

      return responsible === null
        ? `${repoPath}: no ownership rule covers this path, and no ownership file has a base that contains it.`
        : `${repoPath}: no ownership rule covers this path. The entry would fit in ${responsible}.`
    }

    const lines = [
      `${repoPath}`,
      `  declared in: ${rule.origin}`,
      `  rule: ${rule.path}`,
      `  owner: ${rule.owner}`,
      `  skill: ${rule.skill ?? '—'}`,
      `  states: ${rule.states ? rule.states.join(', ') : '—'}`,
      `  format: ${rule.format.collection}${rule.format.key ? ` (key: ${rule.format.key})` : ''}${rule.format.keyMode ? ` (key: ${rule.format.keyMode})` : ''}`,
      `  derives-from: ${rule.derivesFrom ? `${rule.derivesFrom.source} → ${rule.derivesFrom.field}` : '—'}`,
    ]

    for (const name of Object.keys(rule.pluginBlocks)) {
      lines.push(`  plugin ${name}: declared`)
    }

    return lines.join('\n')
  }
  ```

- [ ] **Step 4: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/resolve/explain.test.ts && npm run typecheck
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ownership/src/resolve/explain.ts packages/ownership/test/resolve/explain.test.ts
  git commit -m "feat(<RF-explain>): ownership explain — provenance per property"
  ```

---

### Task 9: Unified code→doc trigger (`watches`)

Source rule: `RN-0008`; spec §2 ("`consumer-visible-paths` ceases to exist") and §7
(mechanism 1). Ports `src/config/watches.ts` from `@esliph/living-docs`, swapping
`OwnershipConfig`/`findArtifactRule` (v1) for `ResolvedConfig`/`findOwnedRule`
(Task 7) — with no separate list of consumer-visible paths: the set
**is** the `watches` rules marked `consumer-visible: true`.

**Files:**
- Create: `packages/ownership/src/triggers/watches.ts`
- Test: `packages/ownership/test/triggers/watches.test.ts`

**Interfaces:**
- Consumes: `ResolvedConfig`, `findOwnedRule` (Task 7).
- Produces: `interface WatchMatch { doc: string; reason: string | null; consumerVisible: boolean; matched: string[]; skill: string | null; owner: string | null }`,
  `coversDoc(doc: string, paths: readonly string[]): boolean`,
  `watchesFor(config: ResolvedConfig, paths: readonly string[]): WatchMatch[]`,
  `pendingDocs(config: ResolvedConfig, paths: readonly string[]): WatchMatch[]`.

- [ ] **Step 1: Write a test `ResolvedConfig` builder**

  Tasks 9 to 15 need a minimal `ResolvedConfig` without going through the
  whole YAML parser. Create `packages/ownership/test/helpers/config.ts`:

  ```typescript
  import type { ResolvedConfig, ResolvedOwnedRule, ResolvedGeneratedRule, ResolvedWatchRule } from '../../src/resolve/hierarchy.ts'

  function owned(partial: Partial<ResolvedOwnedRule> & { path: string; owner: string }): ResolvedOwnedRule {
    return {
      skill: null,
      states: null,
      format: { collection: 'per-file', key: null, keyMode: null, stateField: 'status' },
      derivesFrom: null,
      pluginBlocks: {},
      origin: '.ownership.yml',
      ...partial,
    }
  }

  function watch(partial: Partial<ResolvedWatchRule> & { code: string; doc: string }): ResolvedWatchRule {
    return { reason: null, consumerVisible: false, origin: '.ownership.yml', ...partial }
  }

  function generated(partial: Partial<ResolvedGeneratedRule> & { path: string; command: string }): ResolvedGeneratedRule {
    return { origin: '.ownership.yml', ...partial }
  }

  export function buildConfig(partial: {
    owned?: Parameters<typeof owned>[0][]
    watches?: Parameters<typeof watch>[0][]
    generated?: Parameters<typeof generated>[0][]
    ignore?: string[]
  }): ResolvedConfig {
    return {
      version: 2,
      plugins: [],
      owned: (partial.owned ?? []).map(owned),
      watches: (partial.watches ?? []).map(watch),
      generated: (partial.generated ?? []).map(generated),
      ignore: partial.ignore ?? [],
      files: [{ file: '.ownership.yml', base: '' }],
      rootDir: '/repo',
      rootFile: '.ownership.yml',
    }
  }
  ```

- [ ] **Step 2: Write the failing tests**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { coversDoc, pendingDocs, watchesFor } from '../../src/triggers/watches.ts'
  import { buildConfig } from '../helpers/config.ts'

  test('watchesFor groups by doc and accumulates the paths that matched', () => {
    const config = buildConfig({
      owned: [{ path: 'docs/requirements/rules.md', owner: '@a', skill: 'requirements-keeper' }],
      watches: [
        { code: 'src/checks/**', doc: 'docs/requirements/rules.md', reason: 'x' },
        { code: 'src/hooks/**', doc: 'docs/requirements/rules.md', reason: null },
      ],
    })

    const matches = watchesFor(config, ['src/checks/a.ts', 'src/hooks/b.ts', 'src/other.ts'])

    assert.equal(matches.length, 1)
    assert.equal(matches[0]?.doc, 'docs/requirements/rules.md')
    assert.deepEqual(matches[0]?.matched, ['src/checks/a.ts', 'src/hooks/b.ts'])
    assert.equal(matches[0]?.reason, 'x')
    assert.equal(matches[0]?.skill, 'requirements-keeper')
    assert.equal(matches[0]?.owner, '@a')
  })

  test('consumerVisible is true if ANY rule that points to the doc carries the mark', () => {
    const config = buildConfig({
      watches: [
        { code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true },
        { code: 'plugin/**', doc: 'CHANGELOG.md', consumerVisible: false },
      ],
    })

    assert.equal(watchesFor(config, ['src/cli/a.ts', 'plugin/b.md'])[0]?.consumerVisible, true)
  })

  test('a doc with no declared owned is still an owned doc — skill and owner stay null', () => {
    const config = buildConfig({ watches: [{ code: 'src/**', doc: 'README.md' }] })
    const matches = watchesFor(config, ['src/a.ts'])

    assert.equal(matches[0]?.skill, null)
    assert.equal(matches[0]?.owner, null)
  })

  test('coversDoc: directory by prefix, file by equality', () => {
    assert.equal(coversDoc('docs/', ['docs/x.md']), true)
    assert.equal(coversDoc('docs/x.md', ['docs/x.md']), true)
    assert.equal(coversDoc('docs/x.md', ['docs/y.md']), false)
  })

  test('pendingDocs removes what was already touched in the same set of paths', () => {
    const config = buildConfig({ watches: [{ code: 'src/**', doc: 'docs/x.md', reason: 'r' }] })

    assert.equal(pendingDocs(config, ['src/a.ts']).length, 1)
    assert.equal(pendingDocs(config, ['src/a.ts', 'docs/x.md']).length, 0)
  })
  ```

- [ ] **Step 3: Confirm they fail**

  ```bash
  cd packages/ownership && node --test test/triggers/watches.test.ts
  ```

- [ ] **Step 4: Write `triggers/watches.ts`**

  ```typescript
  import picomatch from 'picomatch'
  import { findOwnedRule } from '../resolve/hierarchy.ts'
  import type { ResolvedConfig } from '../resolve/hierarchy.ts'

  export interface WatchMatch {
    doc: string
    reason: string | null
    consumerVisible: boolean
    matched: string[]
    skill: string | null
    owner: string | null
  }

  function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '')
  }

  export function coversDoc(doc: string, paths: readonly string[]): boolean {
    const target = normalize(doc)

    return paths.some(path => {
      const candidate = normalize(path)

      return target.endsWith('/') ? candidate.startsWith(target) : candidate === target
    })
  }

  export function watchesFor(config: ResolvedConfig, paths: readonly string[]): WatchMatch[] {
    const normalized = paths.map(normalize)
    const byDoc = new Map<string, WatchMatch>()

    for (const watch of config.watches) {
      const matches = picomatch(watch.code)
      const hits = normalized.filter(path => matches(path))

      if (hits.length === 0) {
        continue
      }

      const doc = normalize(watch.doc)
      const existing = byDoc.get(doc)

      if (existing) {
        existing.reason = existing.reason ?? watch.reason
        existing.consumerVisible = existing.consumerVisible || watch.consumerVisible
        for (const hit of hits) {
          if (!existing.matched.includes(hit)) {
            existing.matched.push(hit)
          }
        }
        continue
      }

      const rule = findOwnedRule(config, doc)

      byDoc.set(doc, {
        doc,
        reason: watch.reason,
        consumerVisible: watch.consumerVisible,
        matched: [...hits],
        skill: rule?.skill ?? null,
        owner: rule?.owner ?? null,
      })
    }

    return [...byDoc.values()]
  }

  export function pendingDocs(config: ResolvedConfig, paths: readonly string[]): WatchMatch[] {
    return watchesFor(config, paths).filter(match => !coversDoc(match.doc, paths))
  }
  ```

- [ ] **Step 5: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/triggers/watches.test.ts && npm run typecheck
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add packages/ownership/src/triggers/watches.ts packages/ownership/test/triggers/watches.test.ts packages/ownership/test/helpers/config.ts
  git commit -m "feat(RN-0008): unified code→doc trigger, with no duplicated consumer-visible list"
  ```

---

### Task 10: Doc→doc trigger (`derives-from`) — resolution

Source rule: `<RN-derivation>`; spec §4. Type in `.ownership.yml` (Task 4: `derivesFrom` in
`OwnedRuleRaw`), instance in the document's frontmatter. This task reads the
real instances on disk and decides whether each one resolves — it is the basis of both the
`ownership/derivation-resolves` check (Task 15) and the
`ownership/derivation-reminder` hook (Task 19).

**Files:**
- Create: `packages/ownership/src/triggers/derives.ts`
- Test: `packages/ownership/test/triggers/derives.test.ts`

**Interfaces:**
- Consumes: `listFiles`, `readTextFile` (Task 3), `parseFrontmatter`
  (Task 3), `ResolvedOwnedRule` (Task 7).
- Produces:
  ```typescript
  interface DerivationInstance { file: string; field: string | null; line: number }
  interface DerivationProblem { file: string; line: number; reason: 'campo-ausente' | 'fora-da-fonte' | 'alvo-inexistente'; field: string | null }
  function instancesOf(root: string, rule: ResolvedOwnedRule): DerivationInstance[]
  function problemsFor(root: string, rule: ResolvedOwnedRule): DerivationProblem[]
  function derivedFilesOf(root: string, rule: ResolvedOwnedRule, editedTarget: string): string[]
  ```

- [ ] **Step 1: Write the failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { derivedFilesOf, instancesOf, problemsFor } from '../../src/triggers/derives.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const RULE = {
    path: 'docs/plans/',
    owner: '@a',
    skill: null,
    states: null,
    format: { collection: 'per-file' as const, key: null, keyMode: null, stateField: 'status' },
    derivesFrom: { source: 'docs/specs/', field: 'spec' },
    pluginBlocks: {},
    origin: 'x',
  }

  test('instancesOf reads the declared frontmatter field of each file under the path', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      const [instance] = instancesOf(root, RULE)

      assert.equal(instance?.file, 'docs/plans/a.md')
      assert.equal(instance?.field, 'docs/specs/s1.md')
    })
  })

  test('problemsFor: a missing field is a finding', () => {
    withTempRepo({ 'docs/plans/a.md': '---\ntitle: no spec\n---\n' }, root => {
      forgetTree(root)
      assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['campo-ausente'])
    })
  })

  test('problemsFor: a field outside source is a finding', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/other-thing/x.md\n---\n' }, root => {
      forgetTree(root)
      assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['fora-da-fonte'])
    })
  })

  test('problemsFor: a target that does not exist is a finding', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/does-not-exist.md\n---\n' }, root => {
      forgetTree(root)
      assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['alvo-inexistente'])
    })
  })

  test('problemsFor: a correct field is not a finding', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      assert.deepEqual(problemsFor(root, RULE), [])
    })
  })

  test('derivedFilesOf finds only the files that point to the exact edited target', () => {
    withTempRepo(
      {
        'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n',
        'docs/plans/b.md': '---\nspec: docs/specs/s2.md\n---\n',
        'docs/specs/s1.md': '# s1\n',
        'docs/specs/s2.md': '# s2\n',
      },
      root => {
        forgetTree(root)
        assert.deepEqual(derivedFilesOf(root, RULE, 'docs/specs/s1.md'), ['docs/plans/a.md'])
      },
    )
  })
  ```

- [ ] **Step 2: Confirm they fail**

  ```bash
  cd packages/ownership && node --test test/triggers/derives.test.ts
  ```

- [ ] **Step 3: Write `triggers/derives.ts`**

  ```typescript
  import { listFiles, readTextFile } from '../core/files.ts'
  import { parseFrontmatter } from '../core/frontmatter.ts'
  import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'

  export interface DerivationInstance {
    file: string
    field: string | null
    line: number
  }

  function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '')
  }

  function filesUnder(root: string, rulePath: string): string[] {
    if (rulePath.endsWith('/')) {
      return listFiles(root, [`${rulePath}**/*.md`])
    }

    return listFiles(root, [rulePath])
  }

  export function instancesOf(root: string, rule: ResolvedOwnedRule): DerivationInstance[] {
    if (rule.derivesFrom === null) {
      return []
    }

    const instances: DerivationInstance[] = []

    for (const file of filesUnder(root, rule.path)) {
      const content = readTextFile(root, file)

      if (content === null) {
        continue
      }

      let frontmatter

      try {
        frontmatter = parseFrontmatter(content)
      } catch {
        frontmatter = null
      }

      const value = frontmatter?.data[rule.derivesFrom.field]

      instances.push({
        file,
        field: typeof value === 'string' ? normalize(value) : null,
        line: frontmatter?.lines[rule.derivesFrom.field] ?? 0,
      })
    }

    return instances
  }

  export interface DerivationProblem {
    file: string
    line: number
    reason: 'campo-ausente' | 'fora-da-fonte' | 'alvo-inexistente'
    field: string | null
  }

  export function problemsFor(root: string, rule: ResolvedOwnedRule): DerivationProblem[] {
    if (rule.derivesFrom === null) {
      return []
    }

    const problems: DerivationProblem[] = []

    for (const instance of instancesOf(root, rule)) {
      if (instance.field === null) {
        problems.push({ file: instance.file, line: instance.line, reason: 'campo-ausente', field: null })
        continue
      }
      if (!instance.field.startsWith(rule.derivesFrom.source)) {
        problems.push({ file: instance.file, line: instance.line, reason: 'fora-da-fonte', field: instance.field })
        continue
      }
      if (readTextFile(root, instance.field) === null) {
        problems.push({ file: instance.file, line: instance.line, reason: 'alvo-inexistente', field: instance.field })
      }
    }

    return problems
  }

  /** Only the files governed by `rule` whose field points exactly to `editedTarget` — precision, not noise (spec §4). */
  export function derivedFilesOf(root: string, rule: ResolvedOwnedRule, editedTarget: string): string[] {
    if (rule.derivesFrom === null) {
      return []
    }

    const target = normalize(editedTarget)

    return instancesOf(root, rule)
      .filter(instance => instance.field === target)
      .map(instance => instance.file)
  }
  ```

- [ ] **Step 4: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/triggers/derives.test.ts && npm run typecheck
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ownership/src/triggers/derives.ts packages/ownership/test/triggers/derives.test.ts
  git commit -m "feat(<RN-derivation>): resolution of the doc→doc trigger (derives-from)"
  ```

---

### Task 11: Check types and `ownership/generated-drift`

Source rule: `RN-0012`; spec §6 (check table — "drift of generated... core,
whole"). Ports `src/core/types.ts` (`Check`/`CheckContext`/`Finding`) and
`src/checks/ci5-contract-drift.ts` from `@esliph/living-docs`, swapping
`OwnershipConfig` for `ResolvedConfig` and `context.config.generated` (v1) for
`ResolvedGeneratedRule[]` (Task 7).

**Files:**
- Create: `packages/ownership/src/checks/types.ts`
- Create: `packages/ownership/src/checks/generated-drift.ts`
- Test: `packages/ownership/test/checks/generated-drift.test.ts`

**Interfaces:**
- Consumes: `ResolvedConfig` (Task 7), `CommandRunner` (Task 3).
- Produces: `type Severity`, `interface Finding`, `interface CheckContext { root: string; config: ResolvedConfig; today: string }`,
  `interface Check { id: string; name: string; run(context: CheckContext): Finding[] }`,
  `ownershipGeneratedDrift(exec: CommandRunner): Check`.

- [ ] **Step 1: Write `checks/types.ts`**

  (It has no test of its own — only types, the same as the ones `@esliph/living-docs` already
  uses, with `config: ResolvedConfig` in place of `OwnershipConfig`.)

  ```typescript
  import type { ResolvedConfig } from '../resolve/hierarchy.ts'

  export type Severity = 'error' | 'warning'

  export interface Finding {
    ruleId: string
    file: string
    line: number
    severity: Severity
    message: string
    fix: string
  }

  export interface CheckContext {
    root: string
    config: ResolvedConfig
    today: string
  }

  export interface Check {
    id: string
    name: string
    run(context: CheckContext): Finding[]
  }
  ```

- [ ] **Step 2: Write the `generated-drift` failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipGeneratedDrift } from '../../src/checks/generated-drift.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('with no generated declared, no finding', () => {
    withTempRepo({}, root => {
      const findings = ownershipGeneratedDrift(() => '').run({ root, config: buildConfig({}), today: '2026-09-17' })

      assert.deepEqual(findings, [])
    })
  })

  test('a missing artifact is a finding', () => {
    withTempRepo({}, root => {
      const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
      const findings = ownershipGeneratedDrift(() => 'x').run({ root, config, today: '2026-09-17' })

      assert.equal(findings.length, 1)
      assert.match(findings[0]!.message, /missing/)
    })
  })

  test('a divergence between the generator and the file is a finding, with the right line', () => {
    withTempRepo({ 'out.md': 'a\nb\nc\n' }, root => {
      const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
      const findings = ownershipGeneratedDrift(() => 'a\nX\nc\n').run({ root, config, today: '2026-09-17' })

      assert.equal(findings[0]?.line, 2)
    })
  })

  test('a generator that fails is a finding, without blocking the check', () => {
    withTempRepo({ 'out.md': 'x' }, root => {
      const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
      const findings = ownershipGeneratedDrift(() => {
        throw new Error('boom')
      }).run({ root, config, today: '2026-09-17' })

      assert.match(findings[0]!.message, /failed/)
    })
  })

  test('equal, no finding', () => {
    withTempRepo({ 'out.md': 'a\nb\n' }, root => {
      const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })

      assert.deepEqual(ownershipGeneratedDrift(() => 'a\nb\n').run({ root, config, today: '2026-09-17' }), [])
    })
  })
  ```

- [ ] **Step 3: Confirm they fail**

  ```bash
  cd packages/ownership && node --test test/checks/generated-drift.test.ts
  ```

- [ ] **Step 4: Write `checks/generated-drift.ts`**

  ```typescript
  import { readFileSync } from 'node:fs'
  import { join } from 'node:path'
  import type { CommandRunner } from '../core/exec.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  const RULE = 'ownership/generated-drift'

  function normalize(source: string): string {
    return source.replace(/\r\n/g, '\n').replace(/\n+$/, '\n')
  }

  export function firstDifferentLine(actual: string, expected: string): number {
    const a = normalize(actual).split('\n')
    const b = normalize(expected).split('\n')
    const limit = Math.max(a.length, b.length)

    for (let i = 0; i < limit; i++) {
      if (a[i] !== b[i]) {
        return i + 1
      }
    }

    return 0
  }

  function error(file: string, line: number, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line, severity: 'error', message, fix }
  }

  function reasonOf(err: unknown): string {
    const stderr = (err as { stderr?: unknown }).stderr
    const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))

    return text.split('\n')[0] ?? text
  }

  export function ownershipGeneratedDrift(exec: CommandRunner): Check {
    return {
      id: RULE,
      name: 'generated drift',
      run(context: CheckContext): Finding[] {
        const findings: Finding[] = []

        for (const rule of context.config.generated) {
          let expected: string

          try {
            expected = exec(rule.command, context.root)
          } catch (err) {
            findings.push(
              error(rule.path, 0, `The generator failed: \`${rule.command}\` — ${reasonOf(err)}`, `Fix the command declared in \`generated[].command\` (${rule.origin}).`),
            )
            continue
          }

          let actual: string

          try {
            actual = readFileSync(join(context.root, rule.path), 'utf8')
          } catch {
            findings.push(error(rule.path, 0, 'Generated artifact declared and missing from the repository.', `Generate it and version the result: \`${rule.command} > ${rule.path}\`.`))
            continue
          }

          const line = firstDifferentLine(actual, expected)

          if (line !== 0) {
            findings.push(error(rule.path, line, 'The generated artifact diverges from the generator output.', `Regenerate: \`${rule.command} > ${rule.path}\`. Do not edit the file by hand.`))
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Step 5: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/checks/generated-drift.test.ts && npm run typecheck
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add packages/ownership/src/checks/types.ts packages/ownership/src/checks/generated-drift.ts packages/ownership/test/checks/generated-drift.test.ts
  git commit -m "feat(RN-0012): ownership/generated-drift check"
  ```

---

### Task 12: `ownership/declared-state` check

Source rule: spec §1 ("Lifecycle... The core finds the items... It does not know
what the states mean") and §6 (table — "valid owner, status within
`states`" → `ownership/declared-state`).

**Implementation decision:** the validity of `owner` (`@handle`) is already required
by the Task 4 parser, which throws `OwnershipError` — an `.ownership.yml` with a
malformed `owner` never becomes a `ResolvedConfig`, so it never reaches
this check. This check covers only the second half: the state of each item, under
each path that declares `states`, must be in the declared list. A path
without `states` is not validated — the core does not invent vocabulary.

It also covers the identity guarantee from spec §3: in `table` and `sections`,
a repeated key within the file is a finding (Task 5 points it out, this check
reports it), with or without `states` declared. Rules cited: `<RN-identity>` and
`RN-0001`.

**Files:**
- Create: `packages/ownership/src/checks/declared-state.ts`
- Test: `packages/ownership/test/checks/declared-state.test.ts`

**Interfaces:**
- Consumes: `listFiles`, `readTextFile` (Task 3), `parseFrontmatter` (Task 3),
  `parseItemsTable`, `parseItemsSections` (Task 5), `Check`/`CheckContext`/`Finding` (Task 11).
- Produces: `ownershipDeclaredState(): Check`.

- [ ] **Step 1: Write the failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipDeclaredState } from '../../src/checks/declared-state.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('per-file: a status outside the declared states is a finding', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: invented\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft', 'accepted', 'superseded'] }] })
      const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

      assert.equal(findings.length, 1)
      assert.match(findings[0]!.message, /invented/)
    })
  })

  test('per-file: a status within the declared states is not a finding', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: draft\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft', 'accepted'] }] })

      assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }), [])
    })
  })

  test('with no states declared, no validation — the core does not invent vocabulary', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: anything\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a' }] })

      assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }), [])
    })
  })

  test('table: an item with a status outside the states is a finding, with the right line', () => {
    const content = '| ID | Status |\n| --- | ------ |\n| DA-01 | invented |\n'

    withTempRepo({ 'docs/open-decisions.md': content }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [{ path: 'docs/open-decisions.md', owner: '@a', states: ['open', 'resolved'], format: { collection: 'table', key: 'ID', keyMode: null, stateField: 'status' } }],
      })
      const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

      assert.equal(findings[0]?.line, 3)
    })
  })

  test('sections: an item with a status outside the states is a finding', () => {
    const content = '## RN-0001 — x\n\n- **status:** invented\n'

    withTempRepo({ 'docs/requirements/rules.md': content }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [
          { path: 'docs/requirements/rules.md', owner: '@a', states: ['draft', 'active'], format: { collection: 'sections', key: null, keyMode: 'first-token', stateField: 'status' } },
        ],
      })

      assert.equal(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }).length, 1)
    })
  })

  test('a duplicate key is a finding, even with no states declared', () => {
    const content = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-01 | open |\n'

    withTempRepo({ 'docs/open-decisions.md': content }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [{ path: 'docs/open-decisions.md', owner: '@a', format: { collection: 'table', key: 'ID', keyMode: null, stateField: 'status' } }],
      })
      const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 4)
      assert.match(findings[0]!.message, /DA-01/)
    })
  })

  test('a custom state-field is read instead of status', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': '---\nstate: invented\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft'], format: { collection: 'per-file', key: null, keyMode: null, stateField: 'state' } }],
      })

      assert.equal(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }).length, 1)
    })
  })
  ```

- [ ] **Step 2: Confirm they fail**

  ```bash
  cd packages/ownership && node --test test/checks/declared-state.test.ts
  ```

- [ ] **Step 3: Write `checks/declared-state.ts`**

  ```typescript
  import { listFiles, readTextFile } from '../core/files.ts'
  import { parseFrontmatter } from '../core/frontmatter.ts'
  import { findDuplicateKeys, parseItemsSections, parseItemsTable } from '../schema/item.ts'
  import type { DocItem } from '../schema/item.ts'
  import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  const RULE = 'ownership/declared-state'

  function error(file: string, line: number, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line, severity: 'error', message, fix }
  }

  function filesUnder(root: string, rulePath: string): string[] {
    return rulePath.endsWith('/') ? listFiles(root, [`${rulePath}**/*.md`]) : listFiles(root, [rulePath])
  }

  interface Observed {
    states: { state: string; line: number }[]
    duplicates: DocItem[]
  }

  const NOTHING: Observed = { states: [], duplicates: [] }

  function observe(root: string, rule: ResolvedOwnedRule, file: string): Observed {
    const content = readTextFile(root, file)

    if (content === null) {
      return NOTHING
    }

    if (rule.format.collection === 'per-file') {
      let frontmatter

      try {
        frontmatter = parseFrontmatter(content)
      } catch {
        return NOTHING
      }
      const value = frontmatter?.data[rule.format.stateField]

      return typeof value === 'string' && value !== '' ? { states: [{ state: value, line: frontmatter?.lines[rule.format.stateField] ?? 0 }], duplicates: [] } : NOTHING
    }

    const items =
      rule.format.collection === 'table'
        ? parseItemsTable(content, 1, { key: rule.format.key!, stateField: rule.format.stateField })
        : parseItemsSections(content, 1, { keyMode: rule.format.keyMode!, stateField: rule.format.stateField })

    return {
      states: items.filter(item => item.state !== '').map(item => ({ state: item.state, line: item.line })),
      duplicates: findDuplicateKeys(items),
    }
  }

  export function ownershipDeclaredState(): Check {
    return {
      id: RULE,
      name: 'declared state',
      run(context: CheckContext): Finding[] {
        const findings: Finding[] = []

        for (const rule of context.config.owned) {
          for (const file of filesUnder(context.root, rule.path)) {
            const observed = observe(context.root, rule, file)

            for (const duplicate of observed.duplicates) {
              findings.push(
                error(
                  file,
                  duplicate.line,
                  `The key "${duplicate.key}" appears more than once in this file — the key identifies the item within the file.`,
                  'Give this item a key of its own, or merge the two entries.',
                ),
              )
            }
            if (rule.states === null) {
              continue
            }
            for (const { state, line } of observed.states) {
              if (!rule.states.includes(state)) {
                findings.push(
                  error(
                    file,
                    line,
                    `"${state}" is not among the states declared for \`${rule.path}\`: ${rule.states.join(', ')}.`,
                    `Use one of the declared states, or add "${state}" to \`states\` in \`owned[]\` (${rule.origin}), if it is legitimate.`,
                  ),
                )
              }
            }
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Step 4: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/checks/declared-state.test.ts && npm run typecheck
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ownership/src/checks/declared-state.ts packages/ownership/test/checks/declared-state.test.ts
  git commit -m "feat(<RN-identity>): ownership/declared-state check"
  ```

---

### Task 13: `ownership/owner-coverage` check

Source rule: spec §1 ("owner coverage against CODEOWNERS"), §2
("`ignore:` takes paths out of governance"), §5 ("the included ownership file
is itself a governed path") and §6 — ownership coverage
is split, and goes to the core: an entry in the ownership, a line in CODEOWNERS and
`watches` with an existing `doc` that has an owner. Rules cited: `<RN-coverage>`,
`RN-0001`, `RN-0016`, `RN-0021`.

The check looks in both directions:

- **From the repository to the ownership.** Every file the scan sees
  (`listFiles` already skips `.git`, `node_modules`, `dist`…) needs a rule in
  `owned[]` that covers it, unless it matches `ignore[]`. This is why
  `ignore` exists: without it, coverage would demand an owner for `vendor/` and for
  a generated directory. The ownership files themselves come in here with no special case
  — they are files like the others.
- **From the ownership outward.** Each `owned[]` entry exists on disk and has a
  line in CODEOWNERS; each `watches[].doc` exists and has a rule in `owned[]`.

Unlike `CI-7` of `@esliph/living-docs`, there is no "documentation
root": the core governs the whole repository, and `ignore` is the only
way to take something out of governance.

**Files:**
- Create: `packages/ownership/src/checks/owner-coverage.ts`
- Test: `packages/ownership/test/checks/owner-coverage.test.ts`

**Interfaces:**
- Consumes: `listFiles` (Task 3), `loadCodeowners`, `ownersOf` (Task 3),
  `findOwnedRule` (Task 7), `Check`/`CheckContext`/`Finding` (Task 11).
- Produces: `ownershipOwnerCoverage(): Check`.

- [ ] **Step 1: Write the failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipOwnerCoverage } from '../../src/checks/owner-coverage.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const today = '2026-09-17'

  test('missing CODEOWNERS is a finding', () => {
    withTempRepo({ 'docs/x.md': 'x' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }] })

      assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /CODEOWNERS missing/.test(f.message)))
    })
  })

  test('a declared path that does not exist in the repository is a finding', () => {
    withTempRepo({ CODEOWNERS: 'docs/x.md @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }], ignore: ['CODEOWNERS'] })

      assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /does not exist/.test(f.message)))
    })
  })

  test('an existing path with no line in CODEOWNERS is a finding', () => {
    withTempRepo({ 'docs/x.md': 'x', CODEOWNERS: 'docs/y.md @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }], ignore: ['CODEOWNERS'] })

      assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /has no line/.test(f.message)))
    })
  })

  test('a file with no rule in owned[] is a finding; one that matches ignore is not', () => {
    withTempRepo({ 'src/a.ts': 'x', 'vendor/lib.js': 'x', CODEOWNERS: '* @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ ignore: ['vendor/**', 'CODEOWNERS'] })
      const findings = ownershipOwnerCoverage().run({ root, config, today })

      assert.deepEqual(
        findings.map(f => f.file),
        ['src/a.ts'],
      )
    })
  })

  test('the ownership file itself needs an owner like any other', () => {
    withTempRepo({ '.ownership.yml': 'x', CODEOWNERS: '* @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ ignore: ['CODEOWNERS'] })

      assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => f.file === '.ownership.yml'))
    })
  })

  test('watches with a nonexistent doc or with no rule in owned[] is a finding', () => {
    withTempRepo({ 'src/a.ts': 'x', 'README.md': 'x', CODEOWNERS: '* @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [{ path: 'src/', owner: '@a' }],
        watches: [
          { code: 'src/**', doc: 'docs/does-not-exist.md' },
          { code: 'src/**', doc: 'README.md' },
        ],
        ignore: ['CODEOWNERS', 'README.md'],
      })
      const messages = ownershipOwnerCoverage()
        .run({ root, config, today })
        .map(f => f.message)

      assert.ok(messages.some(m => /docs\/does-not-exist\.md.*does not exist/.test(m)))
      assert.ok(messages.some(m => /README\.md.*no rule/.test(m)))
    })
  })

  test('everything covered: no finding', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': 'x', CODEOWNERS: 'docs/decisions/adr/ @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a' }], ignore: ['CODEOWNERS'] })

      assert.deepEqual(ownershipOwnerCoverage().run({ root, config, today }), [])
    })
  })
  ```

- [ ] **Step 2: Confirm they fail**

  ```bash
  cd packages/ownership && node --test test/checks/owner-coverage.test.ts
  ```

- [ ] **Step 3: Write `checks/owner-coverage.ts`**

  ```typescript
  import { existsSync } from 'node:fs'
  import { join } from 'node:path'
  import picomatch from 'picomatch'
  import { loadCodeowners, ownersOf } from '../core/codeowners.ts'
  import { listFiles } from '../core/files.ts'
  import { findOwnedRule } from '../resolve/hierarchy.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  const RULE = 'ownership/owner-coverage'

  function error(file: string, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
  }

  export function ownershipOwnerCoverage(): Check {
    return {
      id: RULE,
      name: 'owner coverage',
      run(context: CheckContext): Finding[] {
        const findings: Finding[] = []
        const { config, root } = context
        const codeowners = loadCodeowners(root)

        if (codeowners === null) {
          findings.push(
            error(config.rootFile, 'CODEOWNERS missing: no governed path has a declared owner on the reviewer side.', 'Create `CODEOWNERS` at the root (or in `.github/`), mirroring the `owner` of each `owned[]` entry.'),
          )
        }

        // From the repository to the ownership: every file has a rule, or is in `ignore`.
        const ignored = config.ignore.length === 0 ? () => false : picomatch(config.ignore, { dot: true })

        for (const file of listFiles(root).sort()) {
          if (!ignored(file) && findOwnedRule(config, file) === null) {
            findings.push(error(file, `"${file}" is covered by no \`owned[]\` rule nor by \`ignore\`.`, 'Declare an owner for the path in `owned[]`, or take it out of governance in `ignore`.'))
          }
        }

        // From the ownership outward: the entry exists and CODEOWNERS covers it.
        for (const rule of config.owned) {
          if (!existsSync(join(root, rule.path))) {
            findings.push(error(rule.path, `"${rule.path}" is declared in \`owned[]\` (${rule.origin}) and does not exist in the repository.`, 'Create the path, or fix the entry.'))
            continue
          }
          if (codeowners !== null && ownersOf(codeowners, rule.path) === null) {
            findings.push(error(rule.path, `"${rule.path}" has no line in \`${codeowners.file}\`.`, `Add \`${rule.path}    ${rule.owner}\` to \`${codeowners.file}\`.`))
          }
        }

        // The doc of a `watches` must exist and have an owner — otherwise the reminder points to nothing.
        const docs = new Map(config.watches.map(watch => [watch.doc, watch.origin]))

        for (const [doc, origin] of docs) {
          if (!existsSync(join(root, doc))) {
            findings.push(error(doc, `"${doc}" is the doc of \`watches\` (${origin}) and does not exist in the repository.`, 'Create the document, or fix `watches[].doc`.'))
          } else if (findOwnedRule(config, doc) === null) {
            findings.push(error(doc, `"${doc}" is the doc of \`watches\` (${origin}) and has no rule in \`owned[]\`.`, 'Declare the document\'s owner in `owned[]`.'))
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Step 4: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/checks/owner-coverage.test.ts && npm run typecheck
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ownership/src/checks/owner-coverage.ts packages/ownership/test/checks/owner-coverage.test.ts
  git commit -m "feat(<RN-coverage>): ownership/owner-coverage check"
  ```

---

### Task 14: Checks `ownership/watch-satisfied` and `ownership/consumer-change-logged`

Source rule: `RN-0021` and `RN-0013`; spec §6 ("watched changed without the owning doc... go to the
core", "change visible to whoever consumes... core, whole") and §2 (end of
`consumer-visible-paths` as a separate list — the targets and the globs come
directly from `watches[].consumer-visible`). Both receive the diff by
injection, as `CI-6`/`CI-7` already did in `@esliph/living-docs` — the diff is not
part of the shared `CheckContext`.

**Files:**
- Create: `packages/ownership/src/checks/watch-satisfied.ts`
- Create: `packages/ownership/src/checks/consumer-change-logged.ts`
- Test: `packages/ownership/test/checks/watch-satisfied.test.ts`
- Test: `packages/ownership/test/checks/consumer-change-logged.test.ts`

**Interfaces:**
- Consumes: `pendingDocs` (Task 9), `exceptionReasonFor` (Task 3),
  `Check`/`CheckContext`/`Finding` (Task 11).
- Produces: `interface DiffFacts { base: string; changed: readonly string[]; messages: readonly string[] }`,
  `ownershipWatchSatisfied(diff: DiffFacts): Check`,
  `ownershipConsumerChangeLogged(diff: DiffFacts): Check`.

- [ ] **Step 1: Write the `watch-satisfied` failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipWatchSatisfied } from '../../src/checks/watch-satisfied.ts'
  import { buildConfig } from '../helpers/config.ts'

  const config = buildConfig({ watches: [{ code: 'src/checks/**', doc: 'docs/requirements/rules.md', reason: 'x' }] })

  test('diff touches the watched code without the owning doc: finding', () => {
    const diff = { base: 'main', changed: ['src/checks/a.ts'], messages: [] }
    const findings = ownershipWatchSatisfied(diff).run({ root: '/repo', config, today: '2026-09-17' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /rules\.md/)
  })

  test('diff brings both: no finding', () => {
    const diff = { base: 'main', changed: ['src/checks/a.ts', 'docs/requirements/rules.md'], messages: [] }

    assert.deepEqual(ownershipWatchSatisfied(diff).run({ root: '/repo', config, today: '2026-09-17' }), [])
  })

  test('Docs: none — reason in the commit message releases it', () => {
    const diff = { base: 'main', changed: ['src/checks/a.ts'], messages: ['fix: x', 'Docs: none — affects nothing'] }

    assert.deepEqual(ownershipWatchSatisfied(diff).run({ root: '/repo', config, today: '2026-09-17' }), [])
  })
  ```

- [ ] **Step 2: Write `checks/watch-satisfied.ts`**

  ```typescript
  import { exceptionReasonFor } from '../core/exception-label.ts'
  import { pendingDocs } from '../triggers/watches.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  export interface DiffFacts {
    base: string
    changed: readonly string[]
    messages: readonly string[]
  }

  const RULE = 'ownership/watch-satisfied'

  function error(file: string, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
  }

  export function ownershipWatchSatisfied(diff: DiffFacts): Check {
    return {
      id: RULE,
      name: 'watch satisfied',
      run(context: CheckContext): Finding[] {
        if (exceptionReasonFor('Docs', diff.messages) !== null) {
          return []
        }

        return pendingDocs(context.config, diff.changed).map(pending => {
          const trigger = pending.matched.slice(0, 5).join(', ') + (pending.matched.length > 5 ? `, … (+${pending.matched.length - 5})` : '')

          return error(
            pending.doc,
            `The diff \`${diff.base}...HEAD\` touches a watched path (${trigger}) and \`${pending.doc}\` is not among the changed paths.`,
            `Update \`${pending.doc}\`${pending.skill === null ? '' : ` (owning skill: ${pending.skill})`} in the same PR — or write \`Docs: none — <reason>\` in a commit message.`,
          )
        })
      },
    }
  }
  ```

- [ ] **Step 3: Run the `watch-satisfied` tests**

  ```bash
  cd packages/ownership && node --test test/checks/watch-satisfied.test.ts
  ```

- [ ] **Step 4: Write the `consumer-change-logged` failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipConsumerChangeLogged } from '../../src/checks/consumer-change-logged.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('without consumer-visible watches, no finding even with a large diff', () => {
    const config = buildConfig({})

    assert.deepEqual(
      ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: [] }).run({ root: '/repo', config, today: '2026-09-17' }),
      [],
    )
  })

  test('diff touches a consumer-visible path and the changelog did not come along: finding', () => {
    withTempRepo({}, root => {
      const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
      const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: [] }).run({ root, config, today: '2026-09-17' })

      assert.equal(findings.length, 1)
    })
  })

  test('changelog came along but with no item in Unreleased: finding', () => {
    withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n' }, root => {
      const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
      const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({
        root,
        config,
        today: '2026-09-17',
      })

      assert.equal(findings.length, 1)
    })
  })

  test('changelog came along with an item in Unreleased: no finding', () => {
    withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n- x\n' }, root => {
      const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })

      assert.deepEqual(
        ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-17' }),
        [],
      )
    })
  })

  test('each visible doc is only charged for the paths of its own rule', () => {
    withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n- x\n' }, root => {
      const config = buildConfig({
        watches: [
          { code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true },
          { code: 'plugin/**', doc: 'docs/plugin-changes.md', consumerVisible: true },
        ],
      })
      const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({
        root,
        config,
        today: '2026-09-17',
      })

      assert.deepEqual(findings, [])
    })
  })

  test('Changelog: none — reason releases it', () => {
    withTempRepo({}, root => {
      const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
      const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: ['Changelog: none — internal'] }).run({
        root,
        config,
        today: '2026-09-17',
      })

      assert.deepEqual(findings, [])
    })
  })
  ```

- [ ] **Step 5: Write `checks/consumer-change-logged.ts`**

  ```typescript
  import { readFileSync } from 'node:fs'
  import { join } from 'node:path'
  import picomatch from 'picomatch'
  import { exceptionReasonFor } from '../core/exception-label.ts'
  import type { Check, CheckContext, Finding } from './types.ts'
  import type { DiffFacts } from './watch-satisfied.ts'

  const RULE = 'ownership/consumer-change-logged'

  function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '')
  }

  function error(file: string, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
  }

  function unreleasedEntries(source: string): string[] {
    const lines = source.replace(/\r\n/g, '\n').split('\n')
    const start = lines.findIndex(line => /^##\s+\[?unreleased\]?/i.test(line.trim()))

    if (start === -1) {
      return []
    }

    const entries: string[] = []

    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i] ?? ''

      if (/^##\s/.test(line)) {
        break
      }
      if (/^\s*[-*]\s+\S/.test(line)) {
        entries.push(line.trim())
      }
    }

    return entries
  }

  export function ownershipConsumerChangeLogged(diff: DiffFacts): Check {
    return {
      id: RULE,
      name: 'consumer change logged',
      run(context: CheckContext): Finding[] {
        const visible = context.config.watches.filter(watch => watch.consumerVisible)

        if (visible.length === 0) {
          return []
        }

        const changed = diff.changed.map(normalize)
        // Each doc is only charged for the paths of the rules that point to it:
        // touching `src/cli/**` cannot demand the doc of another visible rule.
        const hitsByDoc = new Map<string, string[]>()

        for (const watch of visible) {
          const matches = picomatch(watch.code)
          const doc = normalize(watch.doc)
          const hits = changed.filter(path => matches(path))

          if (hits.length > 0) {
            hitsByDoc.set(doc, [...new Set([...(hitsByDoc.get(doc) ?? []), ...hits])])
          }
        }

        if (hitsByDoc.size === 0) {
          return []
        }
        if (exceptionReasonFor('Changelog', diff.messages) !== null) {
          return []
        }

        const findings: Finding[] = []

        for (const [target, hits] of hitsByDoc) {
          const trigger = hits.slice(0, 5).join(', ') + (hits.length > 5 ? `, … (+${hits.length - 5})` : '')

          if (!changed.includes(target)) {
            findings.push(
              error(
                target,
                `The diff \`${diff.base}...HEAD\` touches a consumer-visible path (${trigger}) and \`${target}\` is not among the changed paths.`,
                `Add the entry under \`## [Unreleased]\` of \`${target}\` — or write \`Changelog: none — <reason>\` in the commit message.`,
              ),
            )
            continue
          }

          let source: string

          try {
            source = readFileSync(join(context.root, target), 'utf8')
          } catch {
            findings.push(error(target, `\`${target}\` is declared as a visible-change doc and is missing from the repository.`, `Create \`${target}\` in the Keep a Changelog format.`))
            continue
          }

          if (unreleasedEntries(source).length === 0) {
            findings.push(
              error(
                target,
                `The diff touches a consumer-visible path (${trigger}) and \`## [Unreleased]\` of \`${target}\` has no items.`,
                'Write the entry under the right subsection (Added, Changed, Deprecated, Removed, Fixed, Security).',
              ),
            )
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Step 6: Run all the task's tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/checks/watch-satisfied.test.ts test/checks/consumer-change-logged.test.ts && npm run typecheck
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add packages/ownership/src/checks/watch-satisfied.ts packages/ownership/src/checks/consumer-change-logged.ts packages/ownership/test/checks/watch-satisfied.test.ts packages/ownership/test/checks/consumer-change-logged.test.ts
  git commit -m "feat(RN-0021): ownership/watch-satisfied and ownership/consumer-change-logged checks"
  ```

---

### Task 15: `ownership/derivation-resolves` check and the check registry

Source rule: `<RN-derivation>`; spec §4 and §6 ("declared derivation resolves" →
`ownership/derivation-resolves`).

**Files:**
- Create: `packages/ownership/src/checks/derivation-resolves.ts`
- Create: `packages/ownership/src/checks/registry.ts`
- Test: `packages/ownership/test/checks/derivation-resolves.test.ts`
- Test: `packages/ownership/test/checks/registry.test.ts`

**Interfaces:**
- Consumes: `problemsFor` (Task 10), all the `ownership*` checks from Tasks
  11–14, `CommandRunner`/`runCommand` (Task 3).
- Produces: `ownershipDerivationResolves(): Check`,
  `coreChecks(exec?: CommandRunner): readonly Check[]`,
  `diffChecks(diff: DiffFacts): readonly Check[]`.

- [ ] **Step 1: Write the `derivation-resolves` failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipDerivationResolves } from '../../src/checks/derivation-resolves.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('missing field, outside the source and nonexistent target become distinct findings', () => {
    withTempRepo(
      {
        'docs/plans/a.md': '---\ntitle: no spec\n---\n',
        'docs/plans/b.md': '---\nspec: docs/other/x.md\n---\n',
        'docs/plans/c.md': '---\nspec: docs/specs/does-not-exist.md\n---\n',
      },
      root => {
        forgetTree(root)
        const config = buildConfig({
          owned: [{ path: 'docs/plans/', owner: '@a', derivesFrom: { source: 'docs/specs/', field: 'spec' } }],
        })
        const findings = ownershipDerivationResolves().run({ root, config, today: '2026-09-17' })

        assert.equal(findings.length, 3)
      },
    )
  })

  test('a derivation that resolves generates no finding', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/plans/', owner: '@a', derivesFrom: { source: 'docs/specs/', field: 'spec' } }] })

      assert.deepEqual(ownershipDerivationResolves().run({ root, config, today: '2026-09-17' }), [])
    })
  })

  test('a path without derives-from is not examined', () => {
    withTempRepo({ 'docs/plans/a.md': '---\ntitle: x\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/plans/', owner: '@a' }] })

      assert.deepEqual(ownershipDerivationResolves().run({ root, config, today: '2026-09-17' }), [])
    })
  })
  ```

- [ ] **Step 2: Write `checks/derivation-resolves.ts`**

  ```typescript
  import { problemsFor } from '../triggers/derives.ts'
  import type { DerivationProblem } from '../triggers/derives.ts'
  import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  const RULE = 'ownership/derivation-resolves'

  function messageFor(rule: ResolvedOwnedRule, problem: DerivationProblem): string {
    const source = rule.derivesFrom!.source
    const field = rule.derivesFrom!.field

    if (problem.reason === 'campo-ausente') {
      return `${problem.file} derives from \`${source}\` (declared in \`owned[]\`, ${rule.origin}) and does not declare the \`${field}\` field in the frontmatter.`
    }
    if (problem.reason === 'fora-da-fonte') {
      return `${problem.file}: the \`${field}\` field points to "${problem.field}", outside \`${source}\`.`
    }

    return `${problem.file}: the \`${field}\` field points to "${problem.field}", which does not exist in the repository.`
  }

  export function ownershipDerivationResolves(): Check {
    return {
      id: RULE,
      name: 'derivation resolves',
      run(context: CheckContext): Finding[] {
        const findings: Finding[] = []

        for (const rule of context.config.owned) {
          if (rule.derivesFrom === null) {
            continue
          }
          for (const problem of problemsFor(context.root, rule)) {
            findings.push({
              ruleId: RULE,
              file: problem.file,
              line: problem.line,
              severity: 'error',
              message: messageFor(rule, problem),
              fix: `Declare \`${rule.derivesFrom.field}: <path under ${rule.derivesFrom.source}>\` in the frontmatter of ${problem.file}, pointing to a file that exists.`,
            })
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Step 3: Run the `derivation-resolves` tests**

  ```bash
  cd packages/ownership && node --test test/checks/derivation-resolves.test.ts
  ```

- [ ] **Step 4: Write the `registry.ts` failing test first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { coreChecks, diffChecks } from '../../src/checks/registry.ts'

  test('coreChecks returns the four checks that do not depend on a diff', () => {
    const ids = coreChecks(() => '').map(check => check.id)

    assert.deepEqual(ids.sort(), ['ownership/declared-state', 'ownership/derivation-resolves', 'ownership/generated-drift', 'ownership/owner-coverage'].sort())
  })

  test('diffChecks returns the two that depend on a diff', () => {
    const ids = diffChecks({ base: 'main', changed: [], messages: [] }).map(check => check.id)

    assert.deepEqual(ids.sort(), ['ownership/consumer-change-logged', 'ownership/watch-satisfied'].sort())
  })
  ```

- [ ] **Step 5: Write `checks/registry.ts`**

  ```typescript
  import type { CommandRunner } from '../core/exec.ts'
  import { runCommand } from '../core/exec.ts'
  import type { Check } from './types.ts'
  import { ownershipGeneratedDrift } from './generated-drift.ts'
  import { ownershipDeclaredState } from './declared-state.ts'
  import { ownershipOwnerCoverage } from './owner-coverage.ts'
  import { ownershipDerivationResolves } from './derivation-resolves.ts'
  import { ownershipWatchSatisfied } from './watch-satisfied.ts'
  import type { DiffFacts } from './watch-satisfied.ts'
  import { ownershipConsumerChangeLogged } from './consumer-change-logged.ts'

  export type { DiffFacts }

  /** Checks that do not need the branch diff — they run whenever `ownership validate` runs. */
  export function coreChecks(exec: CommandRunner = runCommand): readonly Check[] {
    return [ownershipDeclaredState(), ownershipGeneratedDrift(exec), ownershipOwnerCoverage(), ownershipDerivationResolves()]
  }

  /** Checks that need the diff — they only run with `ownership validate --base <ref>`. */
  export function diffChecks(diff: DiffFacts): readonly Check[] {
    return [ownershipWatchSatisfied(diff), ownershipConsumerChangeLogged(diff)]
  }
  ```

- [ ] **Step 6: Run the whole package suite and the type-check**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add packages/ownership/src/checks/derivation-resolves.ts packages/ownership/src/checks/registry.ts packages/ownership/test/checks/derivation-resolves.test.ts packages/ownership/test/checks/registry.test.ts
  git commit -m "feat(<RN-derivation>): ownership/derivation-resolves check and the check registry"
  ```

---

### Task 16: Hook infrastructure and `ownership/generated-guard`

Source rule: `RN-0012`; spec §6 ("generated artifact (hook)" → `ownership/generated-guard`).
Ports `src/hooks/lib/{paths,io,edit}.ts` and `src/hooks/hk2-generated-artifact.ts`
from `@esliph/living-docs`. Two new environment variables of this
plugin's own — `OWNERSHIP_REPO_ROOT`/`OWNERSHIP_HOST_ROOT` —, distinct from
`LIVING_DOCS_REPO_ROOT`/`LIVING_DOCS_HOST_ROOT`: the two plugins may be
installed at the same time, and each reads the repository it considers its own through the variable
that is its own.

**Files:**
- Create: `packages/ownership/src/hooks/lib/paths.ts`
- Create: `packages/ownership/src/hooks/lib/io.ts`
- Create: `packages/ownership/src/hooks/generated-guard.ts`
- Test: `packages/ownership/test/hooks/lib/paths.test.ts`
- Test: `packages/ownership/test/hooks/lib/io.test.ts`
- Test: `packages/ownership/test/hooks/generated-guard.test.ts`

**Interfaces:**
- Consumes: `resolveOwnership`, `findGeneratedRule` (Task 7).
- Produces: `toRepoPath(filePath, roots): string | null`,
  `interface HookEnv { root: string; hostRoots: readonly string[] }`,
  `interface HookPayload { tool_name?: string; tool_input?: Record<string, unknown> }`,
  `hookEnv(): HookEnv`, `readPayload(): Promise<HookPayload | null>`,
  `denyOutput`, `askOutput`, `contextOutput`, `emit`,
  `decideGeneratedGuard(payload, env): { action: 'allow' } | { action: 'deny'; reason: string }`.

- [ ] **Step 1: Port `hooks/lib/paths.ts`**

  Exact copy of `src/hooks/lib/paths.ts` — it is already generic:

  ```typescript
  function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+$/, '')
  }

  export function toRepoPath(filePath: string, roots: readonly string[]): string | null {
    const normalized = normalize(filePath)
    const isAbsolute = normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)

    if (!isAbsolute) {
      return normalized.replace(/^\.\//, '')
    }

    for (const root of roots) {
      const prefix = `${normalize(root)}/`

      if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
        return normalized.slice(prefix.length)
      }
    }

    return null
  }
  ```

- [ ] **Step 2: Test for `paths.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { toRepoPath } from '../../../src/hooks/lib/paths.ts'

  test('a relative path passes straight through', () => {
    assert.equal(toRepoPath('./src/a.ts', ['/repo']), 'src/a.ts')
  })
  test('an absolute path under one of the roots becomes relative', () => {
    assert.equal(toRepoPath('/repo/src/a.ts', ['/repo']), 'src/a.ts')
  })

  test('an absolute path outside every root returns null', () => {
    assert.equal(toRepoPath('/other/src/a.ts', ['/repo']), null)
  })
  ```

- [ ] **Step 3: Port `hooks/lib/io.ts`, with its own environment variables**

  ```typescript
  import { resolve } from 'node:path'

  export interface HookEnv {
    root: string
    hostRoots: readonly string[]
  }

  export interface HookPayload {
    tool_name?: string
    tool_input?: Record<string, unknown>
  }

  export function hookEnv(): HookEnv {
    const root = resolve(process.env.OWNERSHIP_REPO_ROOT ?? process.cwd())
    const host = process.env.OWNERSHIP_HOST_ROOT

    return { root, hostRoots: host ? [root, host] : [root] }
  }

  export async function readPayload(): Promise<HookPayload | null> {
    const chunks: Buffer[] = []

    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer)
    }

    try {
      const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))

      if (parsed === null || typeof parsed !== 'object') {
        return null
      }

      return parsed
    } catch {
      return null
    }
  }

  function output(decision: 'deny' | 'ask', reason: string): string {
    return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } })
  }

  export function denyOutput(reason: string): string {
    return output('deny', reason)
  }

  export function askOutput(reason: string): string {
    return output('ask', reason)
  }

  export function contextOutput(event: 'PostToolUse' | 'SessionStart', context: string): string {
    return JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } })
  }

  export function emit(value: string | null): void {
    if (value !== null) {
      process.stdout.write(`${value}\n`)
    }
  }
  ```

- [ ] **Step 4: Test for `io.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { askOutput, contextOutput, denyOutput } from '../../../src/hooks/lib/io.ts'

  test('denyOutput and askOutput carry hookEventName PreToolUse and the reason', () => {
    assert.match(denyOutput('x'), /"permissionDecision":"deny"/)
    assert.match(askOutput('y'), /"permissionDecision":"ask"/)
  })

  test('contextOutput does not decide permission', () => {
    const parsed = JSON.parse(contextOutput('PostToolUse', 'z')) as { hookSpecificOutput: Record<string, unknown> }

    assert.equal(parsed.hookSpecificOutput.additionalContext, 'z')
    assert.equal('permissionDecision' in parsed.hookSpecificOutput, false)
  })
  ```

- [ ] **Step 5: Do not port `hooks/lib/edit.ts` yet**

  `applyToolInput` only serves the `promotion-guard` to simulate the edit before
  it happens, and that hook waits for the open decision (Task 17). Ported now,
  it would be code with no caller. It comes along with the task that wires the hook.

- [ ] **Step 6: Write the `generated-guard` failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { decideGeneratedGuard } from '../../src/hooks/generated-guard.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const env = (root: string) => ({ root, hostRoots: [root] })

  test('a path declared in generated[] is denied, even if the file does not exist yet', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out.md\n    command: gen\n' }, root => {
      const decision = decideGeneratedGuard({ tool_input: { file_path: 'out.md' } }, env(root))

      assert.equal(decision.action, 'deny')
    })
  })

  test('a file with the marker on the first line is denied', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': 'generated: do not edit\nbody\n' }, root => {
      const decision = decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root))

      assert.equal(decision.action, 'deny')
    })
  })

  test('an ordinary file is allowed', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': 'ordinary body\n' }, root => {
      assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
    })
  })

  test('without .ownership.yml, fails open', () => {
    withTempRepo({}, root => {
      assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
    })
  })
  ```

- [ ] **Step 7: Confirm they fail**

  ```bash
  cd packages/ownership && node --test test/hooks/generated-guard.test.ts
  ```

- [ ] **Step 8: Write `hooks/generated-guard.ts`**

  ```typescript
  #!/usr/bin/env node
  import { readFileSync } from 'node:fs'
  import { join } from 'node:path'
  import { findGeneratedRule, resolveOwnership } from '../resolve/hierarchy.ts'
  import { toRepoPath } from './lib/paths.ts'
  import { denyOutput, emit, hookEnv, readPayload } from './lib/io.ts'
  import type { HookEnv, HookPayload } from './lib/io.ts'

  export type GeneratedGuardDecision = { action: 'allow' } | { action: 'deny'; reason: string }

  const ALLOW: GeneratedGuardDecision = { action: 'allow' }
  const MARKER = /generated:\s*do not edit/i
  const MARKER_WINDOW = 512

  export function decideGeneratedGuard(payload: HookPayload, env: HookEnv): GeneratedGuardDecision {
    const filePath = payload.tool_input?.file_path

    if (typeof filePath !== 'string') {
      return ALLOW
    }

    const repoPath = toRepoPath(filePath, env.hostRoots)

    if (repoPath === null) {
      return ALLOW
    }

    let config

    try {
      config = resolveOwnership(env.root, { onlyFor: [repoPath] })
    } catch {
      return ALLOW
    }
    if (config === null) {
      return ALLOW
    }

    const rule = findGeneratedRule(config, repoPath)

    if (rule) {
      return {
        action: 'deny',
        reason:
          `ownership/generated-guard blocked: \`${repoPath}\` is a generated artifact, declared in \`generated[]\` (${rule.origin}). ` +
          `Change the annotated source and run \`${rule.command} > ${rule.path}\`. ` +
          '`ownership validate` (ownership/generated-drift) checks the drift.',
      }
    }

    let firstLine: string

    try {
      const window = readFileSync(join(env.root, repoPath), 'utf8').slice(0, MARKER_WINDOW)

      firstLine = window.split('\n')[0] ?? ''
    } catch {
      return ALLOW
    }
    if (!MARKER.test(firstLine)) {
      return ALLOW
    }

    return {
      action: 'deny',
      reason:
        `ownership/generated-guard blocked: \`${repoPath}\` opens with the \`generated: do not edit\` marker. ` +
        'Change the source and run the generator. This file is not in `generated[]` — declare it there, with the generator command, ' +
        'so that `ownership/generated-drift` also covers it.',
    }
  }

  async function main(): Promise<void> {
    const payload = await readPayload()

    if (!payload) {
      return
    }
    const decision = decideGeneratedGuard(payload, hookEnv())

    emit(decision.action === 'deny' ? denyOutput(decision.reason) : null)
  }

  if (process.argv[1]?.endsWith('generated-guard.ts')) {
    main().catch(() => process.exit(0))
  }
  ```

- [ ] **Step 9: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test "test/hooks/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Step 10: Commit**

  ```bash
  git add packages/ownership/src/hooks packages/ownership/test/hooks
  git commit -m "feat(RN-0012): hook infrastructure and ownership/generated-guard"
  ```

---

### Task 17: State transition mechanism — the `promotion-guard` waits for the DA

Source rule: `RN-0005` and spec §1 ("the core finds the items, pairs before and
after by key and asks when the transition requires a person").

**This task stops halfway, on purpose.** The spec fixes the mechanism — finding
the items, pairing before and after by key, detecting the transition — and does not fix
**which** transitions require a person: the v2 schema declares `states` and does not
declare transitions. That gap is the `<DA-promotion>` opened in Task 1.
Asking on every transition would be inventing the rule, and with both plugins
installed it would ask on every state change that a skill writes.

So this task delivers only `findTransitions`, pure and tested, which any
answer to the DA will use. The `ownership/promotion-guard` hook — the file
`src/hooks/promotion-guard.ts`, the entry in `hooks.json` and the line in the
CHANGELOG — is **not** written in this plan. When a person resolves the DA, the
resolution says what the hook asks, and the wiring becomes its own task.

**Files:**
- Create: `packages/ownership/src/lifecycle/transitions.ts`
- Test: `packages/ownership/test/lifecycle/transitions.test.ts`

**Interfaces:**
- Consumes: `ResolvedOwnedRule` (Task 7), `parseItemsTable`,
  `parseItemsSections` (Task 5), `parseFrontmatter` (Task 3).
- Produces: `interface Transition { key: string; from: string; to: string }`,
  `findTransitions(before: string, after: string, rule: ResolvedOwnedRule, repoPath: string): Transition[]`.

- [ ] **Step 1: Write the failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { findTransitions } from '../../src/lifecycle/transitions.ts'
  import type { ResolvedOwnedRule } from '../../src/resolve/hierarchy.ts'

  function rule(format: ResolvedOwnedRule['format']): ResolvedOwnedRule {
    return {
      path: 'docs/x/',
      owner: '@a',
      skill: null,
      states: ['draft', 'accepted', 'open', 'resolved'],
      format,
      derivesFrom: null,
      pluginBlocks: {},
      origin: 'o',
    }
  }

  const PER_FILE = rule({ collection: 'per-file', key: null, keyMode: null, stateField: 'status' })
  const TABLE = rule({ collection: 'table', key: 'ID', keyMode: null, stateField: 'status' })

  test('per-file: a status change in the frontmatter is a transition, with the file as the key', () => {
    assert.deepEqual(findTransitions('---\nstatus: draft\n---\nbody\n', '---\nstatus: accepted\n---\nbody\n', PER_FILE, 'docs/x/a.md'), [
      { key: 'docs/x/a.md', from: 'draft', to: 'accepted' },
    ])
  })

  test('per-file: editing the body without changing the status is not a transition', () => {
    assert.deepEqual(findTransitions('---\nstatus: draft\n---\nbody\n', '---\nstatus: draft\n---\nother\n', PER_FILE, 'docs/x/a.md'), [])
  })

  test('per-file: a custom state-field is the field read', () => {
    const custom = rule({ collection: 'per-file', key: null, keyMode: null, stateField: 'state' })

    assert.equal(findTransitions('---\nstate: draft\n---\n', '---\nstate: accepted\n---\n', custom, 'a.md').length, 1)
  })

  test('table: pairs by key and returns each item that changed', () => {
    const before = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-02 | open |\n'
    const after = '| ID | Status |\n| --- | ------ |\n| DA-02 | resolved |\n| DA-01 | resolved |\n'

    assert.deepEqual(
      findTransitions(before, after, TABLE, 'docs/open.md').map(t => t.key),
      ['DA-02', 'DA-01'],
    )
  })

  test('a new item is not a transition — there is no before to pair with', () => {
    const before = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n'
    const after = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-02 | resolved |\n'

    assert.deepEqual(findTransitions(before, after, TABLE, 'docs/open.md'), [])
  })
  ```

- [ ] **Step 2: Confirm they fail**

  ```bash
  cd packages/ownership && node --test test/lifecycle/transitions.test.ts
  ```

- [ ] **Step 3: Write `lifecycle/transitions.ts`**

  ```typescript
  import { parseFrontmatter } from '../core/frontmatter.ts'
  import { parseItemsSections, parseItemsTable } from '../schema/item.ts'
  import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'

  export interface Transition {
    key: string
    from: string
    to: string
  }

  function frontmatterState(source: string, field: string): string | null {
    let frontmatter

    try {
      frontmatter = parseFrontmatter(source)
    } catch {
      return null
    }
    const value = frontmatter?.data[field]

    return typeof value === 'string' && value !== '' ? value : null
  }

  /**
   * Every state change of an item that exists before and after, paired by
   * key. It does not decide whether the change requires a person: that is not this module's job.
   */
  export function findTransitions(before: string, after: string, rule: ResolvedOwnedRule, repoPath: string): Transition[] {
    const { format } = rule

    if (format.collection === 'per-file') {
      const from = frontmatterState(before, format.stateField)
      const to = frontmatterState(after, format.stateField)

      return from !== null && to !== null && from !== to ? [{ key: repoPath, from, to }] : []
    }

    const parse = (source: string) =>
      format.collection === 'table'
        ? parseItemsTable(source, 1, { key: format.key!, stateField: format.stateField })
        : parseItemsSections(source, 1, { keyMode: format.keyMode!, stateField: format.stateField })

    const previous = new Map(parse(before).map(item => [item.key, item.state]))
    const transitions: Transition[] = []

    for (const item of parse(after)) {
      const from = previous.get(item.key)

      if (from !== undefined && from !== '' && item.state !== '' && from !== item.state) {
        transitions.push({ key: item.key, from, to: item.state })
      }
    }

    return transitions
  }
  ```

- [ ] **Step 4: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/lifecycle/transitions.test.ts && npm run typecheck
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ownership/src/lifecycle packages/ownership/test/lifecycle
  git commit -m "feat(RN-0005): state transition mechanism for the promotion-guard, without wiring the hook"
  ```

- [ ] **Step 6: STOP here as far as the hook is concerned**

  Do not create `src/hooks/promotion-guard.ts`. Check the state of `<DA-promotion>`
  in `docs/open-decisions.md`: if it is still `open`, go on to Task 18. If a
  person has already resolved it, the resolution defines the rule, and wiring the hook is a new
  task — written from the resolution, not from this plan.

---

### Task 18: Hooks `ownership/watch-reminder` and `ownership/commit-guard`

Source rule: `RN-0008` and `RN-0009`; spec §6 ("watched reminder" and "commit guard" →
core). Ports `hk4-watch-reminder.ts` and `hk5-commit-guard.ts`, using the
unified `watchesFor`/`pendingDocs` from Task 9.

**Files:**
- Create: `packages/ownership/src/hooks/watch-reminder.ts`
- Create: `packages/ownership/src/hooks/commit-guard.ts`
- Test: `packages/ownership/test/hooks/watch-reminder.test.ts`
- Test: `packages/ownership/test/hooks/commit-guard.test.ts`

**Interfaces:**
- Consumes: `resolveOwnership` (Task 7), `coversDoc`, `watchesFor`,
  `pendingDocs`, `WatchMatch` (Task 9), `stagedPaths`, `GitRunner`
  (Task 3), `contextOutput`, `askOutput`, `emit`, `hookEnv`, `readPayload`
  (Task 16).
- Produces: `decideWatchReminder(payload, env): { action: 'silent' } | { action: 'remind'; context: string }`,
  `isGitCommit(command: string): boolean`,
  `decideCommitGuard(payload, env, run?): { action: 'allow' } | { action: 'ask'; reason: string }`.

- [ ] **Step 1: Write the `watch-reminder` failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { decideWatchReminder } from '../../src/hooks/watch-reminder.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const env = (root: string) => ({ root, hostRoots: [root] })
  const CONFIG = 'version: 2\nowned: []\nwatches:\n  - code: "src/checks/**"\n    doc: docs/requirements/rules.md\n    reason: x\n'

  test('editing a watched path reminds of the owning doc', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root))

      assert.equal(decision.action, 'remind')
    })
  })

  test('editing the owning doc itself does not remind of itself', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideWatchReminder({ tool_input: { file_path: 'docs/requirements/rules.md' } }, env(root))

      assert.equal(decision.action, 'silent')
    })
  })

  test('an unwatched path, silence', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      assert.equal(decideWatchReminder({ tool_input: { file_path: 'src/other.ts' } }, env(root)).action, 'silent')
    })
  })

  test('without an ownership file, the hook keeps quiet (fails open)', () => {
    withTempRepo({}, root => {
      assert.equal(decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root)).action, 'silent')
    })
  })
  ```

- [ ] **Step 2: Write `hooks/watch-reminder.ts`**

  ```typescript
  #!/usr/bin/env node
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { coversDoc, watchesFor } from '../triggers/watches.ts'
  import type { WatchMatch } from '../triggers/watches.ts'
  import { toRepoPath } from './lib/paths.ts'
  import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
  import type { HookEnv, HookPayload } from './lib/io.ts'

  export type WatchReminderDecision = { action: 'silent' } | { action: 'remind'; context: string }

  const SILENT: WatchReminderDecision = { action: 'silent' }

  function describe(match: WatchMatch): string {
    const parts = [`- \`${match.doc}\``]

    if (match.owner !== null) {
      parts.push(`(owner: ${match.owner})`)
    }
    if (match.reason !== null) {
      parts.push(`— ${match.reason}`)
    }
    parts.push(match.skill !== null ? `Owning skill: ${match.skill}.` : 'No skill declared — the owner is in CODEOWNERS.')

    return parts.join(' ')
  }

  export function decideWatchReminder(payload: HookPayload, env: HookEnv): WatchReminderDecision {
    const filePath = payload.tool_input?.file_path

    if (typeof filePath !== 'string') {
      return SILENT
    }

    const repoPath = toRepoPath(filePath, env.hostRoots)

    if (repoPath === null) {
      return SILENT
    }

    let config

    try {
      config = resolveOwnership(env.root, { onlyFor: [repoPath] })
    } catch {
      return SILENT
    }
    if (config === null) {
      return SILENT
    }

    const pending = watchesFor(config, [repoPath]).filter(match => !coversDoc(match.doc, [repoPath]))

    if (pending.length === 0) {
      return SILENT
    }

    return {
      action: 'remind',
      context:
        `ownership/watch-reminder: \`${repoPath}\` is a watched path in \`watches\`. ` +
        'Updating the owning doc belongs in the same PR; if it does not fit there, it does not happen.\n' +
        `Owning doc to update:\n${pending.map(describe).join('\n')}\n` +
        'This is a reminder, not a block: if the change really does not affect the doc, carry on.',
    }
  }

  async function main(): Promise<void> {
    const payload = await readPayload()

    if (!payload) {
      return
    }
    const decision = decideWatchReminder(payload, hookEnv())

    emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null)
  }

  if (process.argv[1]?.endsWith('watch-reminder.ts')) {
    main().catch(() => process.exit(0))
  }
  ```

- [ ] **Step 3: Run the `watch-reminder` tests**

  ```bash
  cd packages/ownership && node --test test/hooks/watch-reminder.test.ts
  ```

- [ ] **Step 4: Write the `commit-guard` failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { decideCommitGuard, isGitCommit } from '../../src/hooks/commit-guard.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const env = (root: string) => ({ root, hostRoots: [root] })
  const CONFIG = 'version: 2\nowned: []\nwatches:\n  - code: "src/checks/**"\n    doc: docs/requirements/rules.md\n    reason: x\n'

  test('isGitCommit recognizes "git commit" at the start and after a separator', () => {
    assert.equal(isGitCommit('git commit -m "x"'), true)
    assert.equal(isGitCommit('npm test && git commit -m "x"'), true)
    assert.equal(isGitCommit('git status'), false)
  })

  test('not Bash, allow', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      assert.equal(decideCommitGuard({ tool_name: 'Edit', tool_input: { command: 'git commit -m x' } }, env(root)).action, 'allow')
    })
  })

  test('staged touches a watched path without the doc: asks', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

      assert.equal(decision.action, 'ask')
    })
  })

  test('staged brings both: allow', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideCommitGuard(
        { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } },
        env(root),
        () => 'src/checks/a.ts\0docs/requirements/rules.md\0',
      )

      assert.equal(decision.action, 'allow')
    })
  })

  test('git runner fails (no git): fails open, allow', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => {
        throw new Error('no git')
      })

      assert.equal(decision.action, 'allow')
    })
  })

  test('without an ownership file, the hook keeps quiet (fails open)', () => {
    withTempRepo({}, root => {
      const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

      assert.equal(decision.action, 'allow')
    })
  })
  ```

- [ ] **Step 5: Write `hooks/commit-guard.ts`**

  ```typescript
  #!/usr/bin/env node
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { pendingDocs } from '../triggers/watches.ts'
  import type { WatchMatch } from '../triggers/watches.ts'
  import { stagedPaths } from '../core/exec.ts'
  import type { GitRunner } from '../core/exec.ts'
  import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts'
  import type { HookEnv, HookPayload } from './lib/io.ts'

  export type CommitGuardDecision = { action: 'allow' } | { action: 'ask'; reason: string }

  const ALLOW: CommitGuardDecision = { action: 'allow' }
  const GIT_COMMIT = /(?:^|[;&|]\s*)git\b[^;&|]*\bcommit\b/

  export function isGitCommit(command: string): boolean {
    return GIT_COMMIT.test(command.trim())
  }

  function describe(match: WatchMatch): string {
    const parts = [`- \`${match.doc}\``]

    if (match.owner !== null) {
      parts.push(`(owner: ${match.owner})`)
    }
    parts.push(`— required by: ${match.matched.join(', ')}`)
    if (match.reason !== null) {
      parts.push(`Reason: ${match.reason}`)
    }
    if (match.skill !== null) {
      parts.push(`Owning skill: ${match.skill}.`)
    }

    return parts.join(' ')
  }

  export function decideCommitGuard(payload: HookPayload, env: HookEnv, run?: GitRunner): CommitGuardDecision {
    if (payload.tool_name !== undefined && payload.tool_name !== 'Bash') {
      return ALLOW
    }

    const command = payload.tool_input?.command

    if (typeof command !== 'string' || !isGitCommit(command)) {
      return ALLOW
    }

    // The staged paths come before the configuration: they are what decides what
    // pruning stops reading.
    const staged = stagedPaths(env.root, run)

    if (staged.length === 0) {
      return ALLOW
    }

    let config

    try {
      config = resolveOwnership(env.root, { onlyFor: staged })
    } catch {
      return ALLOW
    }
    if (config === null) {
      return ALLOW
    }

    const pending = pendingDocs(config, staged)

    if (pending.length === 0) {
      return ALLOW
    }

    return {
      action: 'ask',
      reason:
        'ownership/commit-guard: this commit carries code from a watched path without the owning doc. ' +
        'If the update does not fit in this PR, it does not happen.\n' +
        `Pending:\n${pending.map(describe).join('\n')}\n` +
        'Update the doc now and redo the `git add` — or, if the change really does not affect the doc, say it is a human decision and carry on.',
    }
  }

  async function main(): Promise<void> {
    const payload = await readPayload()

    if (!payload) {
      return
    }
    const decision = decideCommitGuard(payload, hookEnv())

    emit(decision.action === 'ask' ? askOutput(decision.reason) : null)
  }

  if (process.argv[1]?.endsWith('commit-guard.ts')) {
    main().catch(() => process.exit(0))
  }
  ```

- [ ] **Step 6: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/hooks/watch-reminder.test.ts test/hooks/commit-guard.test.ts && npm run typecheck
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add packages/ownership/src/hooks/watch-reminder.ts packages/ownership/src/hooks/commit-guard.ts packages/ownership/test/hooks/watch-reminder.test.ts packages/ownership/test/hooks/commit-guard.test.ts
  git commit -m "feat(RN-0009): ownership/watch-reminder and ownership/commit-guard hooks"
  ```

---

### Task 19: `ownership/derivation-reminder` hook

Source rule: `<RN-derivation>`; spec §4 and §6 ("new — derivation reminder" → core). It is the
only new hook, with no equivalent in `@esliph/living-docs`: editing the source of
a derivation reminds only of the documents that **actually** point to the edited
file — not the whole directory (`derivedFilesOf`, Task 10, already does the
precision).

**Files:**
- Create: `packages/ownership/src/hooks/derivation-reminder.ts`
- Test: `packages/ownership/test/hooks/derivation-reminder.test.ts`

**Interfaces:**
- Consumes: `resolveOwnership` (Task 7), `derivedFilesOf` (Task 10),
  `toRepoPath`, `contextOutput`, `emit`, `hookEnv`, `readPayload` (Task 16).
- Produces: `decideDerivationReminder(payload, env): { action: 'silent' } | { action: 'remind'; context: string }`.

- [ ] **Step 1: Write the failing tests first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { decideDerivationReminder } from '../../src/hooks/derivation-reminder.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const env = (root: string) => ({ root, hostRoots: [root] })
  const CONFIG = 'version: 2\nowned:\n  - path: docs/plans/\n    owner: "@a"\n    derives-from:\n      source: docs/specs/\n      field: spec\n'

  test('editing the source reminds only of the document that points exactly to it', () => {
    withTempRepo(
      {
        '.ownership.yml': CONFIG,
        'docs/specs/s1.md': '# s1\n',
        'docs/specs/s2.md': '# s2\n',
        'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n',
        'docs/plans/b.md': '---\nspec: docs/specs/s2.md\n---\n',
      },
      root => {
        forgetTree(root)
        const decision = decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root))

        assert.equal(decision.action, 'remind')
        if (decision.action === 'remind') {
          assert.match(decision.context, /docs\/plans\/a\.md/)
          assert.doesNotMatch(decision.context, /docs\/plans\/b\.md/)
        }
      },
    )
  })

  test('editing a document that is the source of no derivation: silence', () => {
    withTempRepo({ '.ownership.yml': CONFIG, 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n' }, root => {
      forgetTree(root)
      assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/plans/a.md' } }, env(root)).action, 'silent')
    })
  })

  test('with no document pointing to the edited source: silence', () => {
    withTempRepo({ '.ownership.yml': CONFIG, 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root)).action, 'silent')
    })
  })

  test('without an ownership file, the hook keeps quiet (fails open)', () => {
    withTempRepo({ 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root)).action, 'silent')
    })
  })
  ```

- [ ] **Step 2: Confirm they fail**

  ```bash
  cd packages/ownership && node --test test/hooks/derivation-reminder.test.ts
  ```

- [ ] **Step 3: Write `hooks/derivation-reminder.ts`**

  ```typescript
  #!/usr/bin/env node
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { derivedFilesOf } from '../triggers/derives.ts'
  import { toRepoPath } from './lib/paths.ts'
  import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
  import type { HookEnv, HookPayload } from './lib/io.ts'

  export type DerivationReminderDecision = { action: 'silent' } | { action: 'remind'; context: string }

  const SILENT: DerivationReminderDecision = { action: 'silent' }

  export function decideDerivationReminder(payload: HookPayload, env: HookEnv): DerivationReminderDecision {
    const filePath = payload.tool_input?.file_path

    if (typeof filePath !== 'string') {
      return SILENT
    }

    const repoPath = toRepoPath(filePath, env.hostRoots)

    if (repoPath === null) {
      return SILENT
    }

    let config

    try {
      config = resolveOwnership(env.root, { onlyFor: [repoPath] })
    } catch {
      return SILENT
    }
    if (config === null) {
      return SILENT
    }

    const reminders: string[] = []

    for (const rule of config.owned) {
      if (rule.derivesFrom === null || !repoPath.startsWith(rule.derivesFrom.source)) {
        continue
      }

      for (const derived of derivedFilesOf(env.root, rule, repoPath)) {
        reminders.push(`- \`${derived}\` (declares \`${rule.derivesFrom.field}: ${repoPath}\`, under \`${rule.path}\`${rule.skill === null ? '' : `, owning skill: ${rule.skill}`})`)
      }
    }

    if (reminders.length === 0) {
      return SILENT
    }

    return {
      action: 'remind',
      context:
        `ownership/derivation-reminder: \`${repoPath}\` is a derivation source — the documents below declare that they derive from it:\n` +
        `${reminders.join('\n')}\n` +
        'Check that they still describe what the source says now. This is a reminder, not a block.',
    }
  }

  async function main(): Promise<void> {
    const payload = await readPayload()

    if (!payload) {
      return
    }
    const decision = decideDerivationReminder(payload, hookEnv())

    emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null)
  }

  if (process.argv[1]?.endsWith('derivation-reminder.ts')) {
    main().catch(() => process.exit(0))
  }
  ```

- [ ] **Step 4: Run the tests and the type-check**

  ```bash
  cd packages/ownership && node --test test/hooks/derivation-reminder.test.ts && npm run typecheck
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ownership/src/hooks/derivation-reminder.ts packages/ownership/test/hooks/derivation-reminder.test.ts
  git commit -m "feat(<RN-derivation>): ownership/derivation-reminder hook"
  ```

---

### Task 20: CLI, public API and plugin wiring

Source rule: `<RF-validate>`; spec §7 ("`ownership validate` covers owner, lifecycle,
trigger and generated"). It closes the package: `ownership validate [--base <ref>]`,
`ownership explain <path>`, the public API in `src/index.ts`, and the files
that make it an installable plugin (`plugin.json`, `hooks.json`,
`run-hook.sh`).

**Files:**
- Create: `packages/ownership/src/cli/report.ts`
- Create: `packages/ownership/src/cli/validate.ts`
- Create: `packages/ownership/src/cli/explain.ts`
- Create: `packages/ownership/src/cli/index.ts`
- Modify: `packages/ownership/src/index.ts` (public API — replaces the `export {}` from Task 2)
- Create: `packages/ownership/.claude-plugin/plugin.json`
- Create: `packages/ownership/hooks/hooks.json`
- Create: `packages/ownership/hooks/run-hook.sh`
- Test: `packages/ownership/test/cli/validate.test.ts`
- Test: `packages/ownership/test/cli/explain.test.ts`
- Test: `packages/ownership/test/cli/report.test.ts`

**Interfaces:**
- Consumes: `resolveOwnership` (Task 7), `explainPath` (Task 8),
  `coreChecks`/`diffChecks` (Task 15), `changedPaths`/`commitMessages`
  (Task 3), `forgetTree` (Task 3), `OwnershipError` (Task 4).
- Produces: `formatFindings(findings): string`,
  `interface ValidateResult { findings: Finding[]; errors: number; warnings: number; exitCode: number; installed: boolean }`,
  `runValidate(root, base?, run?): ValidateResult`, `runExplain(root, target): string`.

- [ ] **Step 1: Write the `report.ts` failing test first**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { formatFindings } from '../../src/cli/report.ts'

  test('with no findings, a single message', () => {
    assert.equal(formatFindings([]), 'ownership: no violations found.')
  })

  test('with findings, lists location, rule, severity, message and fix, with the total at the end', () => {
    const text = formatFindings([{ ruleId: 'ownership/x', file: 'a.md', line: 3, severity: 'error', message: 'm', fix: 'f' }])

    assert.match(text, /a\.md:3/)
    assert.match(text, /ownership\/x/)
    assert.match(text, /1 error/)
  })
  ```

- [ ] **Step 2: Write `cli/report.ts`**

  ```typescript
  import type { Finding } from '../checks/types.ts'

  function plural(count: number, singular: string, pluralForm: string): string {
    return `${count} ${count === 1 ? singular : pluralForm}`
  }

  export function formatFindings(findings: readonly Finding[]): string {
    if (findings.length === 0) {
      return 'ownership: no violations found.'
    }

    const lines: string[] = []

    for (const finding of findings) {
      const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file

      lines.push(`${location}  ${finding.ruleId}  ${finding.severity}  ${finding.message}`)
      lines.push(`  → ${finding.fix}`)
    }

    const errors = findings.filter(finding => finding.severity === 'error').length
    const warnings = findings.length - errors

    lines.push('')
    lines.push(`ownership: ${plural(errors, 'error', 'errors')}, ${plural(warnings, 'warning', 'warnings')}.`)

    return lines.join('\n')
  }
  ```

- [ ] **Step 3: Write the `validate.ts` and `explain.ts` failing tests first**

  ```typescript
  // test/cli/validate.test.ts
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { runValidate } from '../../src/cli/validate.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('without an ownership file, installed: false and exitCode 0', () => {
    withTempRepo({}, root => {
      const result = runValidate(root)

      assert.equal(result.installed, false)
      assert.equal(result.exitCode, 0)
    })
  })

  test('with an error finding, exitCode 1', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/x.md\n    owner: "@a"\n' }, root => {
      const result = runValidate(root)

      assert.equal(result.exitCode, 1) // ownership/owner-coverage: CODEOWNERS missing and nonexistent path
      assert.ok(result.errors > 0)
    })
  })

  test('without --base, the diff checks do not run', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: docs/x.md\n' }, root => {
      const result = runValidate(root)

      assert.ok(!result.findings.some(f => f.ruleId === 'ownership/watch-satisfied'))
    })
  })
  ```

  ```typescript
  // test/cli/explain.test.ts
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { runExplain } from '../../src/cli/explain.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('without an ownership file, says so', () => {
    withTempRepo({}, root => {
      assert.match(runExplain(root, 'x.md'), /no ownership file/)
    })
  })

  test('with a file, delegates to explainPath', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/x.md\n    owner: "@a"\n' }, root => {
      assert.match(runExplain(root, 'docs/x.md'), /@a/)
    })
  })
  ```

- [ ] **Step 4: Confirm they fail**

  ```bash
  cd packages/ownership && node --test test/cli/report.test.ts test/cli/validate.test.ts test/cli/explain.test.ts
  ```

- [ ] **Step 5: Write `cli/validate.ts`**

  ```typescript
  import { changedPaths, commitMessages } from '../core/exec.ts'
  import type { GitRunner } from '../core/exec.ts'
  import { forgetTree } from '../core/files.ts'
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { coreChecks, diffChecks } from '../checks/registry.ts'
  import type { Finding } from '../checks/types.ts'

  export interface ValidateResult {
    findings: Finding[]
    errors: number
    warnings: number
    exitCode: number
    /** `false` when there is no ownership file — a repository without the toolkit. */
    installed: boolean
  }

  function todayIso(): string {
    return new Date().toISOString().slice(0, 10)
  }

  export function runValidate(root: string, base: string | null = null, run?: GitRunner): ValidateResult {
    forgetTree(root)
    const config = resolveOwnership(root)

    if (config === null) {
      return { findings: [], errors: 0, warnings: 0, exitCode: 0, installed: false }
    }

    const context = { root, config, today: todayIso() }
    const checks = [...coreChecks()]

    if (base !== null) {
      checks.push(...diffChecks({ base, changed: changedPaths(root, base, run), messages: commitMessages(root, base, run) }))
    }

    const findings = checks.flatMap(check => check.run(context))
    const errors = findings.filter(finding => finding.severity === 'error').length

    return { findings, errors, warnings: findings.length - errors, exitCode: errors > 0 ? 1 : 0, installed: true }
  }
  ```

- [ ] **Step 6: Write `cli/explain.ts`**

  ```typescript
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { explainPath } from '../resolve/explain.ts'

  export function runExplain(root: string, target: string): string {
    const config = resolveOwnership(root)

    if (config === null) {
      return 'ownership: no ownership file found in this repository.'
    }

    return explainPath(config, target)
  }
  ```

- [ ] **Step 7: Run the tests**

  ```bash
  cd packages/ownership && node --test test/cli/report.test.ts test/cli/validate.test.ts test/cli/explain.test.ts
  ```

- [ ] **Step 8: Write `cli/index.ts`**

  ```typescript
  #!/usr/bin/env node
  import { resolve } from 'node:path'
  import { runValidate } from './validate.ts'
  import { runExplain } from './explain.ts'
  import { formatFindings } from './report.ts'
  import { OwnershipError } from '../schema/types.ts'

  const USAGE = `ownership <command>

    validate [--base <ref>]   Runs the owner, lifecycle, trigger and generated checks
    explain <path>            Shows the resolved rule and where each property came from

  validate options:
    --base <ref>   Diff base — enables the checks that depend on the branch diff
  `

  function repoRoot(): string {
    return resolve(process.env.OWNERSHIP_REPO_ROOT ?? process.cwd())
  }

  function main(argv: readonly string[]): number {
    const root = repoRoot()
    const command = argv[0]

    if (command === undefined || command === '--help' || command === '-h') {
      process.stdout.write(USAGE)

      return command === undefined ? 2 : 0
    }

    try {
      if (command === 'validate') {
        const baseIndex = argv.indexOf('--base')
        const base = baseIndex === -1 ? null : (argv[baseIndex + 1] ?? '')

        if (baseIndex !== -1 && base === '') {
          process.stderr.write('ownership: `--base` needs a ref.\n')

          return 2
        }

        const result = runValidate(root, base)

        if (!result.installed) {
          process.stdout.write('ownership: no ownership file found — nothing to validate.\n')

          return 0
        }
        process.stdout.write(`${formatFindings(result.findings)}\n`)

        return result.exitCode
      }

      if (command === 'explain') {
        const target = argv[1]

        if (target === undefined) {
          process.stderr.write('ownership: `explain` needs a path.\n')

          return 2
        }
        process.stdout.write(`${runExplain(root, target)}\n`)

        return 0
      }
    } catch (err) {
      if (err instanceof OwnershipError) {
        process.stderr.write(`ownership: ${err.message}\n`)

        return 2
      }
      throw err
    }

    process.stderr.write(`ownership: unknown command "${command}".\n\n${USAGE}`)

    return 2
  }

  process.exitCode = main(process.argv.slice(2))
  ```

- [ ] **Step 9: Test the CLI manually**

  ```bash
  cd packages/ownership && node src/cli/index.ts --help
  echo 'version: 2
  owned:
    - path: README.md
      owner: "@a"' > /tmp/o.yml
  mkdir -p /tmp/ownership-manual && cp /tmp/o.yml /tmp/ownership-manual/.ownership.yml && touch /tmp/ownership-manual/README.md
  OWNERSHIP_REPO_ROOT=/tmp/ownership-manual node src/cli/index.ts validate
  OWNERSHIP_REPO_ROOT=/tmp/ownership-manual node src/cli/index.ts explain README.md
  rm -rf /tmp/ownership-manual /tmp/o.yml
  ```

  Expected: `validate` reports 2 errors — the missing CODEOWNERS and the
  `.ownership.yml` itself with no rule in `owned[]` (it is a governed file like
  any other); `explain` shows `owner: @a`.

- [ ] **Step 10: Write the public API in `src/index.ts`**

  ```typescript
  export { resolveOwnership, findOwnedRule, findGeneratedRule } from './resolve/hierarchy.ts'
  export type { ResolvedConfig, ResolvedOwnedRule, ResolvedGeneratedRule, ResolvedWatchRule, ResolveOptions } from './resolve/hierarchy.ts'
  export { explainPath } from './resolve/explain.ts'
  export { findTransitions } from './lifecycle/transitions.ts'
  export type { Transition } from './lifecycle/transitions.ts'
  export { coreChecks, diffChecks } from './checks/registry.ts'
  export type { DiffFacts } from './checks/registry.ts'
  export type { Check, CheckContext, Finding, Severity } from './checks/types.ts'
  export { OwnershipError } from './schema/types.ts'
  export type { Collection, DerivesFrom, FormatBlock, SectionKeyMode } from './schema/types.ts'
  ```

- [ ] **Step 11: Create `.claude-plugin/plugin.json`**

  ```json
  {
    "name": "ownership",
    "version": "0.1.0",
    "description": "Artifact ownership core: owner, lifecycle and the code→doc and doc→doc triggers."
  }
  ```

- [ ] **Step 12: Create `hooks/hooks.json`**

  ```json
  {
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "Edit|Write",
          "hooks": [
            { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" generated-guard", "shell": "bash", "async": false }
          ]
        },
        {
          "matcher": "Bash",
          "hooks": [{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" commit-guard", "shell": "bash", "async": false }]
        }
      ],
      "PostToolUse": [
        {
          "matcher": "Edit|Write",
          "hooks": [
            { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" watch-reminder", "shell": "bash", "async": false },
            { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" derivation-reminder", "shell": "bash", "async": false }
          ]
        }
      ]
    }
  }
  ```

- [ ] **Step 13: Create `hooks/run-hook.sh`**

  ```bash
  #!/usr/bin/env bash
  # Wrapper for the ownership core hooks: runs on the host's node.
  # Fails open by contract — missing node, timeout or execution error
  # result in empty output and exit 0.
  #
  # TOOLKIT_ROOT is the root of THIS plugin (one level above hooks/, because
  # hooks/ and src/ live side by side in packages/ownership/). REPO_ROOT is the
  # repository this plugin judges, coming from CLAUDE_PROJECT_DIR.

  HOOK="${1:-}"
  TOOLKIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  REPO_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

  [ -n "$HOOK" ] || exit 0

  INPUT="$(cat)"

  OUTPUT="$(printf '%s' "$INPUT" | OWNERSHIP_REPO_ROOT="$REPO_ROOT" \
    timeout 5 node "${TOOLKIT_ROOT}/src/hooks/${HOOK}.ts" 2>/dev/null)"

  if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
    printf '%s\n' "$OUTPUT"
  fi

  exit 0
  ```

  Give it execute permission:

  ```bash
  chmod +x packages/ownership/hooks/run-hook.sh
  ```

- [ ] **Step 14: Run the whole package suite and the type-check**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Step 15: Commit**

  ```bash
  git add packages/ownership/src/cli packages/ownership/src/index.ts packages/ownership/.claude-plugin packages/ownership/hooks packages/ownership/test/cli
  git commit -m "feat(<RF-validate>): CLI (validate, explain), public API and plugin wiring"
  ```

---

### Task 21: Distribution — build in prepack and packaging proof

Source rule: `<RNF-build>`; spec §7 ("build only at publication") and §9 ("packaging —
`npm pack`, install the tarball in a temporary directory, import and assert
that it works. Closes the gap of the `development` condition."). This is the proof that
closes the gap the spec names: without it, `exports.development` and `files:
["dist"]` are assertion, not observed fact.

**Files:**
- Modify: `packages/ownership/.gitignore` (adds `*.tgz`)
- Test: `packages/ownership/test/distribution/packaging.test.ts`
- Test: `packages/ownership/test/distribution/dev-resolution.test.ts`
- Test: `packages/ownership/test/distribution/lockfile.test.ts`
- Test: `packages/ownership/test/distribution/no-internal-trace.test.ts`

**Interfaces:**
- Consumes: everything the package already exposes (Tasks 2–20) — this task does not
  add production code, it only proves that the packaged result works.

- [ ] **Step 1: Add `*.tgz` to the package's `.gitignore`**

  `packages/ownership/.gitignore`:

  ```
  dist/
  node_modules/
  *.tgz
  ```

- [ ] **Step 2: Write the packaging test**

  `packages/ownership/test/distribution/packaging.test.ts`:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { spawnSync } from 'node:child_process'
  import { mkdtempSync, rmSync } from 'node:fs'
  import { tmpdir } from 'node:os'
  import { join } from 'node:path'

  const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

  test('npm pack produces an installable tarball whose dist really runs', { timeout: 120_000 }, () => {
    const packResult = spawnSync('npm', ['pack', '--json'], { cwd: PACKAGE_ROOT, encoding: 'utf8', shell: true })

    assert.equal(packResult.status, 0, packResult.stderr)
    const [{ filename }] = JSON.parse(packResult.stdout) as { filename: string }[]
    const tarball = join(PACKAGE_ROOT, filename)
    const installDir = mkdtempSync(join(tmpdir(), 'ownership-pack-'))

    try {
      const install = spawnSync('npm', ['install', tarball, '--no-save'], { cwd: installDir, encoding: 'utf8', shell: true })

      assert.equal(install.status, 0, install.stderr)

      const run = spawnSync('node', ['node_modules/@esliph/ownership/dist/cli/index.js', '--help'], { cwd: installDir, encoding: 'utf8' })

      assert.equal(run.status, 0, run.stderr)
      assert.match(run.stdout, /ownership <command>/)
    } finally {
      rmSync(installDir, { recursive: true, force: true })
      rmSync(tarball, { force: true })
    }
  })
  ```

- [ ] **Step 3: Run the packaging test**

  ```bash
  cd packages/ownership && node --test test/distribution/packaging.test.ts
  ```

  If it fails on "Cannot find module dist/cli/index.js", check the `prepack` in
  `package.json` (Task 2) and the `tsconfig.build.json` — `npm pack` runs
  `prepack` on its own, before packing.

  If it fails because the `bin` in `package.json` does not match the generated path,
  adjust `tsconfig.build.json` to preserve the directory structure
  (`outDir: "dist"` already does that, but check that `dist/cli/index.js` really exists
  after the `prepack`: `cd packages/ownership && npm run prepack --if-present && ls dist/cli/`).

- [ ] **Step 4: Write the development resolution test**

  `packages/ownership/test/distribution/dev-resolution.test.ts`:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { spawnSync } from 'node:child_process'
  import { join } from 'node:path'

  const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..')

  test('with the development condition, @esliph/ownership resolves from the source code, without dist', { timeout: 30_000 }, () => {
    const script = 'import("@esliph/ownership").then(m => { if (typeof m.resolveOwnership !== "function") throw new Error("did not resolve from the source"); console.log("ok") })'
    const result = spawnSync('node', ['--input-type=module', '-e', script], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '--conditions=development' },
    })

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /ok/)
  })
  ```

  This test depends on the root `workspaces` (Task 2, Step 8) having already created
  the `node_modules/@esliph/ownership → packages/ownership` symlink. If the
  symlink does not exist, run `npm install` at the repository root first.

- [ ] **Step 5: Run the development resolution test**

  ```bash
  cd packages/ownership && node --test test/distribution/dev-resolution.test.ts
  ```

- [ ] **Step 6: Write the own-lockfile test**

  `packages/ownership/test/distribution/lockfile.test.ts`. Inside the
  workspace, `npm install` in the package writes the root lockfile, and the package's own
  would go stale without warning. The test regenerates the lockfile outside the workspace and compares:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { spawnSync } from 'node:child_process'
  import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
  import { tmpdir } from 'node:os'
  import { join } from 'node:path'

  const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

  function packagesOf(lockfile: string): unknown {
    return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
  }

  test("the package's package-lock.json is up to date with package.json", { timeout: 120_000 }, () => {
    const isolated = mkdtempSync(join(tmpdir(), 'ownership-lock-'))

    try {
      copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(isolated, 'package.json'))
      const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: isolated, encoding: 'utf8', shell: true })

      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(
        packagesOf(join(isolated, 'package-lock.json')),
        packagesOf(join(PACKAGE_ROOT, 'package-lock.json')),
        'Lockfile out of date. Regenerate it outside the workspace: copy package.json to a temporary directory, run `npm install --package-lock-only` and bring the package-lock.json back.',
      )
    } finally {
      rmSync(isolated, { recursive: true, force: true })
    }
  })
  ```

- [ ] **Step 7: Write the internal trail test**

  `packages/ownership/test/distribution/no-internal-trace.test.ts`. The
  `CLAUDE.md` says that what the toolkit ships does not point inside itself, and the
  root distribution test only scans the `src/` of `living-docs`. This one covers the
  new package: outside of comments, no artifact ID of this repository and no
  spec section:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { readFileSync, readdirSync } from 'node:fs'
  import { join, relative } from 'node:path'

  const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')
  const TRACE = /\b(?:ADR|RNF|RN|RF|DA|TDR|REL)-\d{4}\b|\bspec §/
  const COMMENT = /^\s*(?:\/\/|\/\*|\*|#)/

  function shipped(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const path = join(dir, entry.name)

      return entry.isDirectory() ? shipped(path) : /\.(?:ts|sh|json)$/.test(entry.name) ? [path] : []
    })
  }

  test('code, hooks and plugin manifest do not cite the internal trail outside of comments', () => {
    const found: string[] = []

    for (const file of [...shipped(join(PACKAGE_ROOT, 'src')), ...shipped(join(PACKAGE_ROOT, 'hooks'))]) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (!COMMENT.test(line) && TRACE.test(line)) {
            found.push(`${relative(PACKAGE_ROOT, file)}:${index + 1}: ${line.trim()}`)
          }
        })
    }

    assert.deepEqual(found, [])
  })
  ```

- [ ] **Step 8: Run the whole package suite and the type-check**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Step 9: Confirm that no `dist/` or `.tgz` was committed by mistake**

  ```bash
  git status --short packages/ownership
  ```

  Expected: only the four test files and the `.gitignore` — `dist/` and `*.tgz`
  do not appear.

- [ ] **Step 10: Commit**

  ```bash
  git add packages/ownership/.gitignore packages/ownership/test/distribution
  git commit -m "test(<RNF-build>): packaging, lockfile and development resolution proof"
  ```

---

### Task 22: Final review — and why there is no CHANGELOG entry

Source rule: `RN-0013` — a change visible to whoever consumes travels with the
`CHANGELOG.md` entry, **or with the reason written in the commit**.

Nothing in this plan reaches whoever consumes: `@esliph/ownership` is `private`, does not
go to npm, and the plugin stays outside the marketplace until the remote install
proof (Task 2, Step 9). An entry now would announce a plugin that no one
can install — and `CHANGELOG.md` is `audience: external`. The entry is born in the
task that registers the plugin in the marketplace; here, the reason is written in the
commit that closes the plan.

**Files:**
- No new files; only verification and the closing commit, if there is anything
  to commit.

**Interfaces:**
- Consumes: nothing — last task of the plan.

- [ ] **Step 1: Confirm that nothing visible to the consumer changed**

  ```bash
  git diff --name-only master...HEAD -- .claude-plugin/ plugin/ src/cli/ templates/
  ```

  Expected: empty output. If anything shows up, the plan went out of scope — stop and
  find out why before going on.

- [ ] **Step 2: Run the `@esliph/living-docs` suite at the root**

  ```bash
  npm test && npm run typecheck && node src/cli/index.ts validate
  ```

  Expected: everything passes — `docs/.ownership.yml` stays at `version: 1` and
  `@esliph/living-docs` was not touched by this plan.

- [ ] **Step 3: Run the whole `@esliph/ownership` suite**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Step 4: Check the `git status` of the whole tree**

  ```bash
  git status --short
  ```

  Nothing beyond what the 22 tasks touched should appear — no `dist/`, no
  `.tgz`, no lockfile from a forgotten `npm install` in the wrong directory.

- [ ] **Step 5: Record the reason for the absent entry**

  If there is anything left to commit, the commit carries the label. If there is not, add
  the label to the body of the PR description — the CHANGELOG check reads the commit
  messages, so prefer an empty commit to leaving the reason only in the PR:

  ```bash
  git commit --allow-empty -m "chore(<ADR-distribution>): closes the ownership core plan" -m "Changelog: none — the package is private and the plugin stays outside the marketplace until the remote install proof; nothing reaches whoever consumes."
  ```

---

## After this plan

In order:

1. **Wire the `promotion-guard`**, when a person resolves the
   `<DA-promotion>`. The resolution says which transitions ask; the task ports
   `applyToolInput`, writes the hook on top of `findTransitions` (Task 17) and
   adds it to `hooks.json`.
2. **Migration of `@esliph/living-docs`** — its own spec (spec §12): renames
   the checks (`CI-n` → `living-docs/descriptive-name`), adjusts the glossary
   (`Artifact`/`Document` discriminated by `living-docs.id-prefix`, not by the
   list), moves `docs/.ownership.yml` to the v2 schema and makes
   `@esliph/living-docs` depend on `@esliph/ownership` as a library. This is
   where the core gains the real consumer that the spec requires before the second.
3. **Register the plugin in the marketplace**, with the CHANGELOG entry, after the
   remote install proof.
4. **SDD plugin** — its own spec, after the migration.

## What the spec asks for and this plan does not close, by decision

Saying this here is worth more than leaving the gap implicit.

- **v1→v2 migration command (spec §10) and the proof against the 23 real entries
  (spec §9).** The spec puts them in this spec, and §12 puts "moving the file" in the
  migration spec. This plan reads §12 as owning the subject: the migration only has a
  consumer when `living-docs` starts using the core, and a command with no
  consumer goes stale with no one exercising it. What stays here is the other half
  of §10 — the core refuses v1 loudly (Task 4). The message cannot yet
  name the command, because it does not exist; when it exists, the message changes with
  it. **If whoever reviews reads the spec the other way, this is the decision to
  reverse.**
- **`ownership/promotion-guard`.** Only the mechanism is delivered; the hook waits for the
  `<DA-promotion>` (Task 17).
- **Real remote installation** ("install the marketplace from a remote
  repository and watch the hooks run from the cache"). It requires solving how the plugin's
  dependencies reach the cache — and that is why the plugin stays outside
  the marketplace until then (Task 2, Step 9).
- **Single rule** ("the two CLIs do not report the same thing twice").
  It presupposes both CLIs reading the same file, which only happens after the
  migration: today `docs/.ownership.yml` is at `version: 1`, and
  `ownership validate` refuses to read it.
