# Living-docs on the core: implementation plan

> **For whoever executes:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to execute this plan task by task. The steps use checkboxes (`- [ ]`) for tracking.

**Goal:** make `@esliph/living-docs` read the v2 schema through the
`@esliph/ownership` library, hand the core the rules that are already its own, and rename
the ones that stay to `living-docs/name`, without losing a single test case.

**Architecture:** the core gets two small changes (plugin block at the top
of the root and the v1 error) and exports what living-docs imports. Living-docs
comes to depend on `file:../ownership`, resolved from the source code with the
`development` condition. The `src/config/ownership.ts` layer stops parsing YAML
and becomes an adapter of the `living-docs:` block over `resolveOwnership`. The rules
the core already implements leave living-docs; the corresponding hooks leave in
the same commit in which the `ownership` plugin becomes installable. Finally, the
rename swaps `CI-n`/`HK-n` for the names and the living documents follow along.

**Tech Stack:** Node ≥ 24 with no build step, `node --test`, TypeScript 5.9
(`tsc --noEmit`), npm workspaces with `file:` between packages, bash (hooks
wrapper), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-18-living-docs-on-the-core-design.md`.
The plan argues from it, and whoever executes reads both. The sections cited
as "§n" are the spec's.

## Global constraints

- **No v1→v2 migration in code.** No command, no double reading, no alias for the
  old name, no test converter (§1). A v1 test fixture is rewritten by
  hand in v2.
- **Every commit stays green** on `npm test`, `npm run typecheck`,
  `node --conditions=development packages/living-docs/src/cli/index.ts validate`
  and, from Task 3 on,
  `node --conditions=development packages/ownership/src/cli/index.ts validate`,
  all run from the checkout root (§8).
- **The rule comes before the code.** No code from Task 1 onward is written
  before the commit of Task 0.
- **You do not accept decisions.** ADRs and TDRs are born `draft`/`open`; promoting is a
  human act, and `HK-3` asks. A revoked requirement goes through `active → revoked`,
  which is also a human act.
- **An accepted ADR is not edited.** `ADR-0020` is `accepted`; the top-block rule
  refines it through a new ADR (§9). `HK-1` blocks the rest.
- **The historical record does not change.** Old ADRs, specs and plans keep
  `CI-n`, `HK-n`, `docs/.ownership.yml` and `version: 1` (§7).
- **Shipped text does not cite the internal trail.** `hooks/run-hook.sh`, skills,
  commands, templates, the catalog's `failsWhen` and `src/` strings stay without an
  artifact ID (`ADR-`, `RN-`, …), without `spec §n` and without `docs/superpowers/`.
  A code comment may cite. What enforces it: `test/distribution/internal-trail.test.ts`
  (living-docs) and `test/distribution/no-internal-trace.test.ts` (core).
- **`audience: external` text does not cite an artifact ID.** This applies to `README.md`,
  `CHANGELOG.md`, `docs/deprecations.md`, `docs/migrations/`, `docs/releases/`.
  `CI-n` and `HK-n` are not artifact IDs (§7) and may appear in the
  CHANGELOG map.
- **`last-reviewed` is not bumped** in the edited documents, unless
  `validate` demands it.
- **`git mv`, never copy and delete**, for `.ownership.yml` and for each file
  renamed in Task 5. The checkout lives in OneDrive: if a `git mv` fails with
  "Permission denied", pause the sync and repeat the same command.
- **Type-check is `npm run typecheck`**, never `tsc` directly.
- **Commit message** in English, `type(ID): subject`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **A change visible to whoever consumes it carries an entry in `CHANGELOG.md`** in the same
  commit (skill `release-historian`), or `Changelog: none — <reason>` in the
  message. The old → new map belongs to Task 6.
- **Hooks during execution.** `HK-4` (later, `ownership/watch-reminder`)
  reminds of the owning doc at each watched file; `HK-5` (later,
  `ownership/commit-guard`) asks at commit time. The owning doc travels in the task, or the
  message carries `Docs: none — <reason>`.

## Review Focus

Inputs that the spec implies and that no test of the spec itself exercises. Each
line has a test in the owning task.

1. **A consumer with a v1 `docs/.ownership.yml` runs `living-docs init` again.**
   Expected: `init` does not write `.ownership.yml` at the root (that would create two
   candidates and lock every read by ambiguity) and reports, under "not
   installed", that the existing file does not read as v2 and needs to be rewritten.
   Test in Task 3, step 3.11.
2. **A `living-docs:` block with a value that is not a map** (empty `living-docs:`,
   `true`, a list), at the top or in an entry. Expected: a load error that names
   the file and the block, per the rule accepted in `ADR-0020` ("x: {} declares the link;
   any value that is not a mapping is an error"). Test in Task 1, step 1.1.
3. **A decisions table without a `Status` column, or a requirement with a `###` heading.** The
   core's parser reads only `##` and does not require the state column; the old one required
   both columns and accepted `##` to `####`. Expected: a table without `Status` produces
   items without state, which `living-docs/frontmatter` (today `CI-1`) rejects
   as "item without status"; a `###` heading with an ID stops being an item. Test in Task 3,
   step 3.4.
4. **An unversioned local file** (`.worktrees/`, `.claude/`, `.superpowers/`)
   in the checkout of whoever runs `ownership validate`. The core scans the file
   system, not the git index. Expected: no finding for them — they stay in
   `ignore`. Test in Task 3, step 3.12: "this repository passes the core's
   checks", which runs on the real checkout, where `.worktrees/` and `.claude/`
   exist.
5. **The same defect reported by both plugins.** A duplicated item key is a
   finding of `ownership/declared-state` and also of `CI-2`. Expected, per the
   single-rule principle: each moved rule is reported only by the core. The ID duplicate remains
   in both because `CI-2` also covers sequence and citation and is not in the table
   of §6. The single-rule test (Task 3, step 3.14) pins this explicitly,
   so that the overlap is seen and not discovered.

## Open points that the plan resolves by default

The spec does not decide these points. The plan adopts the indicated default and Task 0
takes each one to the `decision-recorder` as part of the corresponding ADR, or as
a `DA` if it judges that it does not fit in the ADR.

- **A document is the entry with a `living-docs:` block without `id-prefix`**, not "the
  entry without `id-prefix`" (§5). `ADR-0020`, accepted, says that a path is only the
  plugin's if the entry carries its block. Without that, `packages/living-docs/`,
  `bin/` and `.github/` would become documents and enter the corpus of `CI-4`,
  `CI-8` and `CI-10`. It fits in the ADR "v1 abandoned".
- **The documentation corpus** (before: everything under the directory of
  `docs/.ownership.yml`) becomes the union of the paths of the entries with a
  `living-docs:` block, plus those in `generated[]`. With the file at the root, deriving from
  its directory would make the whole root documentation. The binary attachment is now
  enforced on any path of the corpus. `RN-0016` and `RN-0023` are revised in
  Task 0.
- **DA declares `states: [open, resolved, dropped]`**, and not `[open, resolved]`
  as the table in §4 abbreviates: it is today's machine (`STATUS_MACHINE`), and
  shrinking it would change findings.
- **`CI-1` "valid owner"** (frontmatter `owner` without `@`) does not exist in
  `ownership/declared-state`. It is ported there in Task 1 before leaving
  living-docs in Task 3, as §8 commands.
- **This repository's workflow changes in Task 3, not in 4.** Task 3 deletes
  `drift` and `changelog`; the workflow that calls them would break commit 3.
- **`init` in a consumer repository.** `ownership/owner-coverage` requires an owner
  for every file, and no `init` knows where the installer's code lives. The
  `init` seeds `ignore:` with `node_modules`, and reports under "not installed" that the
  rest of the repository needs to be declared. A freshly installed `ownership validate`
  fails until that is done. It fits in the ADR "hooks in two plugins" or
  becomes a `DA`.
- **The stage stops parameterizing the moved rules.** `ownership validate`
  runs the four tree rules at every stage, and `--base` runs the two diff rules
  together. In `production`, this turns on `ownership/watch-satisfied`, which before
  only `multi-team` turned on. `ADR-0012` is the one affected; same decision.
- **The CODEOWNERS utilities** (`parseCodeowners`, `loadCodeowners`,
  `ownersOf`) come to be imported from the core: `init` and two tests use them,
  and §5 takes `config/codeowners.ts` out of living-docs. The public API grows by these
  three names beyond the list in §3, by the same criterion ("only what living-docs
  imports").

## Baseline (measured on 2026-09-28, before any change)

| Measure | Value |
| --- | --- |
| `npm test --workspace packages/living-docs` | **551** tests: 549 pass, **2 fail** |
| `npm test --workspace packages/ownership` | **167** tests: 166 pass, **1 fails** |
| `living-docs validate` | **1 error**: `CI-3` in `ADR-0020` ("resolves DA-0006, but does not cite it in `relates-to`") |
| `living-docs validate` (pointers) | 1 generated artifact, 7 paths visible to the consumer, 14 code→doc links |
| `living-docs drift` | no violation |
| `living-docs changelog --base master` | no violation |
| `git hash-object docs/contracts/checks.gen.md` | `6d6030f810f62510db0c772145e24daaef3ab193` |
| `npm run typecheck` | clean |

The three test failures:

- `test/acceptance/spec-criteria.test.ts` "this repository passes its own
  checks": it is the same `CI-3` error as in `validate`.
- `test/distribution/lockfile.test.ts` of **both** packages: the test regenerates the
  lockfile only from `package.json`, and the registry has already published
  `@types/node@24.19.0`. It fails whenever a new version comes out within the range.
  It is a defect of the test, and Task 1 (core) and Task 2 (living-docs) fix it
  by regenerating from the existing lockfile.

**Human precondition.** The `CI-3` error in `ADR-0020` is not fixed by an
agent: `relates-to` is not in `mutable-fields`, and `HK-1` denies the edit. Task 0
starts by stopping and asking a person for the decision.

---

### Task 0: The rule before the code

A documentation commit. No file in `packages/` changes.

**Files:**
- Create (by the skills): `docs/decisions/adr/ADR-0028-plugin-block-at-the-top-of-the-root.md`, `docs/decisions/adr/ADR-0029-living-docs-built-on-v2.md`, `docs/decisions/adr/ADR-0030-core-hooks-in-the-ownership-plugin.md`, `docs/decisions/debt/TDR-0003-local-dependency-on-the-core.md`
- Modify (by the `requirements-keeper`): `docs/requirements/functional.md`, `docs/requirements/rules.md`
- Modify (by the `decision-recorder`, if it opens a `DA`): `docs/open-decisions.md`
- Modify: this plan (the "Baseline" table, if the measure changes)

**Interfaces:**
- Produces: the numbers `ADR-0028`, `ADR-0029`, `ADR-0030` and `TDR-0003`. The following
  tasks cite them in code comments and in commit messages.
  If the skill assigns other numbers, use the assigned ones and adjust the citations.

- [ ] **Step 0.1: Stop at the precondition**

Run:

```bash
npm ci
node packages/living-docs/src/cli/index.ts validate
```

Expected: the `CI-3` error in `ADR-0020`. Stop and ask the person how they want to
resolve it — for example, add `DA-0006` to the `relates-to` of `ADR-0020` by
hand, or another way out of their choosing. Do not edit the ADR. Resume when
`living-docs validate` exits with 0.

- [ ] **Step 0.2: Confirm the baseline**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
node packages/living-docs/src/cli/index.ts changelog --base master
git hash-object docs/contracts/checks.gen.md
```

Expected: the "Baseline" table, minus the `spec-criteria` failure
(resolved in step 0.1). If any other number diverges, record the new value in the table
with the reason, before proceeding.

- [ ] **Step 0.3: Open the three ADRs (`/adr`, skill `decision-recorder`)**

Each is born `draft`. The minimum content of each one, for the skill to write:

1. **Plugin block at the top of the root.** Context: v1 has global living-docs
   configuration outside an entry (`stale-after-months`, `id-format`,
   `last-reviewed-bump-limit`), and `ADR-0020` only foresees a block inside `owned[]`.
   Decision: the root file accepts top-level keys whose name is in `plugins:`,
   passed opaquely to the plugin in `pluginBlocks`; in a child file it is an error; the
   value follows the rule of `ADR-0020` (a map, `{}` for empty). Discarded alternatives:
   repeating the configuration in each entry (~20 copies, families with
   different ID formats); a config file of the plugin's own (the "one
   file per plugin" that the research discarded). `relates-to: [ADR-0020]`.
   It refines `ADR-0020` without editing it.
2. **Living-docs is born on v2.** Decision: no migration command, no
   double reading, no alias; this repository's file is rewritten by hand, and
   whoever cloned follows the CHANGELOG. It diverges from §10 of the core's spec, which asked for
   a command. Consequences to record: the document discriminator is the
   `living-docs:` block present without `id-prefix` (section "Open points"), and the corpus
   is the union of the paths with that block. `relates-to: [ADR-0020, ADR-0025]`.
3. **Core hooks in the `ownership` plugin.** Decision: living-docs declares
   `dependencies: ["ownership"]` and stops registering the hooks that the core takes
   over. The skill evaluates whether this reopens `ADR-0012` with a new decision (§9) —
   including the two open points on stage and on consumer `init` listed
   above. `relates-to: [ADR-0019, ADR-0026]`.

The `decision-adversary` skill may be called by the `decision-recorder`; let it
follow its own flow. If it concludes that some open point is a gap and not a
decision, it opens a `DA` (`/open-decision`) and the plan **stops** at that point.

- [ ] **Step 0.4: Record the debt (`/debt`)**

`TDR-0003`, `open`. Shortcut: `@esliph/ownership` as `file:../ownership`. Cost:
in the marketplace cache `../ownership` does not exist, the living-docs `npm ci`
fails and all living-docs hooks fail open; the `--invoke-ownership` default
(`npx ownership`) does not work outside this repository.
Observable `pay-when`: `@esliph/ownership` published on npm. Payment: the
dependency becomes a semver range from the registry, living-docs'
`plugin-cache.test.ts` goes back to requiring the hook, and `--invoke-ownership` starts working outside
here.

- [ ] **Step 0.5: Revise the requirements (skill `requirements-keeper`)**

Ask the skill to revise, against §4 to §7 of this spec, the items below. The text is
its own; the list of what each one needs to come to say is this:

| Item | What changes |
| --- | --- |
| `RF-0006` | `living-docs drift` ceases to exist; drift belongs to the core. Proposal: `revoked` (human act). |
| `RF-0008` | `living-docs changelog` ceases to exist. Proposal: `revoked`. |
| `RF-0009` | `REL` is declared as an `owned` entry with `living-docs.id-prefix: REL`; `consumer-visible-paths` no longer exists. |
| `RF-0011` | `validate --base` of living-docs no longer charges for the doc of the watched path; what remains is the claim by open decision. |
| `RF-0012` | `init` declares the documents in `owned` with a `living-docs:` block, not in `documents:`. |
| `RF-0013` | the installed workflow runs both CLIs; `--invoke-ownership` comes in. |
| `RN-0001` | the ownership file lives at the root (`.ownership.yml`). |
| `RN-0013` | the trigger is the `watches` rules marked `consumer-visible: true`. |
| `RN-0016` | coverage of the whole repository belongs to the core; living-docs covers only the corpus. |
| `RN-0023` | "under the documentation root" becomes "on a path of the corpus". |
| `RN-0030`, `RN-0031` | "prefix declared in `artifacts:`" becomes "prefix declared in `living-docs.id-prefix`". |

Revoking requires a human act: `HK-3` asks, and the answer belongs to the person.

- [ ] **Step 0.6: Validate and commit**

```bash
node packages/living-docs/src/cli/index.ts validate
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

Expected: `validate` exits with 0; the tests are those of the baseline, with the
two lockfile failures and no other.

```bash
git add docs/
git commit -m "$(cat <<'EOF'
docs(ADR-0028): the rule before the code of living-docs on the core

Opens ADR-0028, ADR-0029 and ADR-0030 as draft, records TDR-0003 and revises
the requirements that adopting the core invalidates.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1: Core — top-level block, v1 error and public API

Everything in `packages/ownership`. Living-docs does not change.

**Files:**
- Modify: `packages/ownership/src/schema/types.ts`, `packages/ownership/src/schema/parse.ts:131-174,200-272`
- Modify: `packages/ownership/src/resolve/hierarchy.ts:34-44,279-289`
- Modify: `packages/ownership/src/checks/declared-state.ts`
- Create: `packages/ownership/src/checks/catalog.ts`
- Modify: `packages/ownership/src/index.ts`
- Modify: `packages/ownership/test/helpers/config.ts`, `packages/ownership/test/schema/parse.test.ts`, `packages/ownership/test/resolve/hierarchy.test.ts`, `packages/ownership/test/checks/declared-state.test.ts`, `packages/ownership/test/distribution/lockfile.test.ts`
- Create: `packages/ownership/test/checks/catalog.test.ts`, `packages/ownership/test/distribution/public-api.test.ts`
- Modify: `CHANGELOG.md` (entry under `[Unreleased]`)

**Interfaces:**
- Produces: `RootFile.pluginBlocks: Record<string, Record<string, unknown>>` and
  `ResolvedConfig.pluginBlocks: Record<string, Record<string, unknown>>`.
- Produces: `OwnedRuleRaw.pluginBlocks` and `ResolvedOwnedRule.pluginBlocks` come to
  have values that are guaranteed maps (`Record<string, Record<string, unknown>>`).
- Produces, exported from `@esliph/ownership`: `parseItemsTable`,
  `parseItemsSections`, `normalizeFieldKey`, `isEmptyValue`, `type DocItem`,
  `parseCodeowners`, `loadCodeowners`, `ownersOf`, `type Codeowners`,
  `type CodeownersEntry`, `CORE_CHECK_CATALOG`, `type CatalogEntry`, besides what
  it already exported (`findTransitions`, `coreChecks`, `diffChecks`, `OwnershipError`,
  `resolveOwnership`, `findOwnedRule`, …).
- `CatalogEntry = { id: string; name: string; command: string; failsWhen: string }`.

- [ ] **Step 1.1: Parser tests (red)**

Add to `packages/ownership/test/schema/parse.test.ts`. The file already defines
`ROOT` (root options); define the two constants below next to it if they do not
yet exist under that name:

```ts
const ROOT_OPTS = { isRoot: true, pluginNames: [] }
const CHILD_OPTS = { isRoot: false, pluginNames: ['living-docs'] }

test('the root accepts a top-level block whose name is listed in plugins, and passes it on opaque', () => {
  const parsed = parseOwnershipFile(
    'version: 2\nplugins: [living-docs]\nliving-docs:\n  stale-after-months: 6\nowned: []\n',
    '.ownership.yml',
    ROOT_OPTS,
  ) as RootFile

  assert.deepEqual(parsed.pluginBlocks, { 'living-docs': { 'stale-after-months': 6 } })
})

test('without a top-level block, the root pluginBlocks is empty', () => {
  const parsed = parseOwnershipFile('version: 2\nplugins: [living-docs]\nowned: []\n', '.ownership.yml', ROOT_OPTS) as RootFile

  assert.deepEqual(parsed.pluginBlocks, {})
})

test('a top-level block in a child file is an error, even with the name listed in the root', () => {
  assert.throws(
    () => parseOwnershipFile('version: 2\nliving-docs:\n  stale-after-months: 6\nowned: []\n', 'pkg/.ownership.yml', CHILD_OPTS),
    /pkg\/\.ownership\.yml.*living-docs.*exclusive to the root file/,
  )
})

test('a plugin block that is not a map is an error, at the top and in the entry', () => {
  assert.throws(
    () => parseOwnershipFile('version: 2\nplugins: [living-docs]\nliving-docs: true\nowned: []\n', '.ownership.yml', ROOT_OPTS),
    /\.ownership\.yml\.living-docs.*must be a map/,
  )
  assert.throws(
    () =>
      parseOwnershipFile(
        "version: 2\nplugins: [living-docs]\nowned:\n  - path: a.md\n    owner: '@x'\n    living-docs:\n",
        '.ownership.yml',
        ROOT_OPTS,
      ),
    /owned\[0\]\.living-docs.*must be a map/,
  )
})

test('a plugin named after a core key is an error', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nplugins: [owned]\nowned: []\n', '.ownership.yml', ROOT_OPTS), /plugins.*"owned".*core key/)
})
```

And replace the assertion of the v1 test that already exists (line 28) with:

```ts
assert.throws(() => parseOwnershipFile('version: 1\nartifacts: []\n', 'docs/.ownership.yml', ROOT), /schema v1.*not read.*rewrite/)
```

If `RootFile` is not yet imported at the top of the file, add it to the
`import type` from `../../src/schema/parse.ts`.

- [ ] **Step 1.2: See the red**

```bash
cd packages/ownership && node --test test/schema/parse.test.ts; cd ../..
```

Expected: the six new or changed tests fail (`pluginBlocks` undefined,
"unknown key" in place of the new messages, and the old v1 message).

- [ ] **Step 1.3: Implement in the parser**

In `packages/ownership/src/schema/types.ts`, change the type of `pluginBlocks` in
`OwnedRuleRaw` and add the field to `RootFile`:

```ts
  /** By plugin name declared in `plugins:`. Always a map; the content is opaque to the core. */
  pluginBlocks: Record<string, Record<string, unknown>>
```

```ts
export interface RootFile extends ParsedFile {
  plugins: string[]
  /** Top-level blocks, by plugin name — only the root has them (ADR-0028). */
  pluginBlocks: Record<string, Record<string, unknown>>
}
```

In `packages/ownership/src/schema/parse.ts`:

1. Add, after `assertKnownKeys`:

```ts
/**
 * The value of a plugin block is always a map: `x: {}` declares the link without
 * configuration, and any other value is a load error (ADR-0020).
 */
function asPluginBlock(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new OwnershipError(`${where}: a plugin block must be a map — use \`{}\` to declare the link without configuration.`)
  }

  return value as Record<string, unknown>
}
```

2. In `parseOwned`, replace the loop that builds `pluginBlocks` with:

```ts
  const pluginBlocks: Record<string, Record<string, unknown>> = {}

  for (const name of pluginNames) {
    if (item[name] !== undefined) {
      pluginBlocks[name] = asPluginBlock(item[name], `${where}.${name}`)
    }
  }
```

   Note that `item[name]` is `null` when the YAML carries `living-docs:` with no value —
   `null !== undefined`, so it falls into `asPluginBlock` and becomes an error, as the test
   asks.

3. Replace the stretch of `parseOwnershipFile` that goes from
   `assertKnownKeys(root, opts.isRoot ? ROOT_KEYS : CHILD_KEYS, …)` to
   `pluginNames = plugins` (lines 248–253) with:

```ts
  if (opts.isRoot) {
    plugins = asStringList(root.plugins, `${file}.plugins`)

    for (const name of plugins) {
      if (ROOT_KEYS.has(name)) {
        throw new OwnershipError(`${file}.plugins: "${name}" is a core key and cannot name a plugin.`)
      }
    }
    pluginNames = plugins
    // Top-level block: only the root, and only with a name listed in `plugins:` (ADR-0028).
    assertKnownKeys(root, new Set([...ROOT_KEYS, ...plugins]), file)
  } else {
    for (const key of Object.keys(root)) {
      if (opts.pluginNames.includes(key)) {
        throw new OwnershipError(`${file}: top-level plugin block "${key}" is exclusive to the root file.`)
      }
    }
    assertKnownKeys(root, CHILD_KEYS, file, ' `plugins` is exclusive to the root file.')
  }
```

4. Replace the final `return` with:

```ts
  if (!opts.isRoot) {
    return parsed
  }

  const pluginBlocks: Record<string, Record<string, unknown>> = {}

  for (const name of plugins ?? []) {
    if (root[name] !== undefined) {
      pluginBlocks[name] = asPluginBlock(root[name], `${file}.${name}`)
    }
  }

  return { ...parsed, plugins: plugins ?? [], pluginBlocks }
```

5. Replace the v1 message (lines 239–242) with:

```ts
    throw new OwnershipError(
      `${file}: schema v1 — this file is not read. The core reads only v2 (an \`owned\` list, blocks per plugin); ` +
        'rewrite the file as v2.',
    )
```

   Update the comment above it: the reason remains the same ("an unknown
   key would hide the real reason").

- [ ] **Step 1.4: See the parser green**

```bash
cd packages/ownership && node --test test/schema/parse.test.ts; cd ../..
```

Expected: all pass. If any old test in `parse.test.ts` breaks because
of the new order of the checks (plugins before keys), the message it
expects has moved place, not content: adjust the regex, never the behavior.
The exception is a test that asserts that a null block (`sdd:` with no value) is accepted: it
contradicts the accepted `ADR-0020`. Change the assertion to an error and say so in the
commit message.

- [ ] **Step 1.5: `ResolvedConfig.pluginBlocks` (red, then green)**

In `packages/ownership/test/resolve/hierarchy.test.ts`, add:

```ts
test('the root top-level blocks arrive in ResolvedConfig.pluginBlocks', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nplugins: [living-docs]\nliving-docs:\n  stale-after-months: 3\nowned: []\n' }, root => {
    assert.deepEqual(resolveOwnership(root)?.pluginBlocks, { 'living-docs': { 'stale-after-months': 3 } })
  })
})
```

Run `cd packages/ownership && node --test test/resolve/hierarchy.test.ts; cd ../..`:
it fails (`undefined`). In `packages/ownership/src/resolve/hierarchy.ts`, add
to `ResolvedConfig`:

```ts
  /** Top-level blocks of the root file, by plugin name — opaque to the core. */
  pluginBlocks: Record<string, Record<string, unknown>>
```

and, in the object returned by `resolveOwnership`, `pluginBlocks: root.pluginBlocks,`
right after `plugins: root.plugins,`. Also change the type of `pluginBlocks`
in `ResolvedOwnedRule` to `Record<string, Record<string, unknown>>`.

In `packages/ownership/test/helpers/config.ts`, add `pluginBlocks: {},`
to the object returned by `buildConfig`.

Run again: it passes.

- [ ] **Step 1.6: Port "owner without @" to `ownership/declared-state` (red)**

§6 sends the "valid owner" of `CI-1` to the core, and the core does not cover it.
Add to `packages/ownership/test/checks/declared-state.test.ts`, in the same
style as the neighboring tests (which use `withTempRepo` and `buildConfig`):

```ts
test('per-file: a frontmatter owner without @ is a finding, on the line of the field', () => {
  withTempRepo({ 'docs/adr/ADR-0001.md': '---\nstatus: draft\nowner: time\n---\n' }, root => {
    const config = buildConfig({ owned: [{ path: 'docs/adr/', owner: '@x', states: ['draft'] }] })
    const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-28' })

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.line, 3)
    assert.match(findings[0]?.message ?? '', /owner.*"time".*@/)
  })
})

test('per-file: an owner with @, or absent, is not a finding — absence belongs to whoever enforces the frontmatter', () => {
  withTempRepo({ 'docs/adr/ADR-0001.md': "---\nstatus: draft\nowner: '@time'\n---\n", 'docs/adr/ADR-0002.md': '---\nstatus: draft\n---\n' }, root => {
    const config = buildConfig({ owned: [{ path: 'docs/adr/', owner: '@x', states: ['draft'] }] })

    assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-28' }), [])
  })
})
```

Run `cd packages/ownership && node --test test/checks/declared-state.test.ts; cd ../..`:
the first one fails.

- [ ] **Step 1.7: Implement the "owner without @"**

In `packages/ownership/src/checks/declared-state.ts`, extend `Observed` and
`observe`:

```ts
interface Observed {
  states: { state: string; line: number }[]
  duplicates: DocItem[]
  /** Frontmatter `owner` that does not start with `@`, only in per-file. */
  badOwner: { value: string; line: number } | null
}

const NOTHING: Observed = { states: [], duplicates: [], badOwner: null }
```

In the `per-file` branch, after obtaining `frontmatter`, replace the `return` with:

```ts
    const value = frontmatter?.data[rule.format.stateField]
    const owner = frontmatter?.data.owner
    const badOwner = typeof owner === 'string' && owner !== '' && !owner.startsWith('@') ? { value: owner, line: frontmatter?.lines.owner ?? 0 } : null

    return {
      states: typeof value === 'string' && value !== '' ? [{ state: value, line: frontmatter?.lines[rule.format.stateField] ?? 0 }] : [],
      duplicates: [],
      badOwner,
    }
```

In the collection branch, add `badOwner: null` to the returned object. In `run`,
right after the `duplicates` loop:

```ts
          if (observed.badOwner !== null) {
            findings.push(
              error(
                file,
                observed.badOwner.line,
                `\`owner\` "${observed.badOwner.value}" must start with @ and mirror CODEOWNERS.`,
                'Use a person or team handle, e.g. "@platform-team".',
              ),
            )
          }
```

This runs before the `if (rule.states === null) continue`, on purpose: the owner
matters even on a path without a lifecycle. Run the test: it passes.

- [ ] **Step 1.8: Core catalog (red, then green)**

Create `packages/ownership/test/checks/catalog.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CORE_CHECK_CATALOG } from '../../src/checks/catalog.ts'
import { coreChecks, diffChecks } from '../../src/checks/registry.ts'

const NO_DIFF = { base: '', changed: [], messages: [] }

test('the catalog covers exactly the registered checks, with id, name and command', () => {
  const tree = coreChecks(() => '').map(check => `${check.id}|${check.name}|ownership validate`)
  const diff = diffChecks(NO_DIFF).map(check => `${check.id}|${check.name}|ownership validate --base <ref>`)
  const catalog = CORE_CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}|${entry.command}`)

  assert.deepEqual(catalog.sort(), [...tree, ...diff].sort())
  for (const entry of CORE_CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} must say when it fails`)
  }
})
```

Run: it fails (module does not exist). Create `packages/ownership/src/checks/catalog.ts`:

```ts
/**
 * The public contract of the core's checks. `living-docs` prints it alongside its
 * own in `docs/contracts/checks.gen.md`. Only types and data, on purpose: a
 * generator does not need to pull in YAML or git to list what exists.
 */
export interface CatalogEntry {
  id: string
  name: string
  command: string
  failsWhen: string
}

export const CORE_CHECK_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: 'ownership/declared-state',
    name: 'declared state',
    command: 'ownership validate',
    failsWhen:
      'The state of a file or item (the `state-field` field, `status` by default) is outside the `states` declared for the path; the same key appears twice in one file; or the frontmatter `owner` does not start with `@`.',
  },
  {
    id: 'ownership/generated-drift',
    name: 'generated drift',
    command: 'ownership validate',
    failsWhen: 'The output of the command declared in `generated[]` differs from the versioned file; the command fails; or the declared file does not exist.',
  },
  {
    id: 'ownership/owner-coverage',
    name: 'owner coverage',
    command: 'ownership validate',
    failsWhen:
      'A repository file is covered by neither `owned[]` nor `ignore`; an `owned[]` path does not exist or has no line in CODEOWNERS; CODEOWNERS does not exist; or the `doc` of a `watches` rule does not exist or has no entry in `owned[]`.',
  },
  {
    id: 'ownership/derivation-resolves',
    name: 'derivation resolves',
    command: 'ownership validate',
    failsWhen: 'A document that derives from a source does not declare the derivation field, or the field points outside the source or to a file that does not exist.',
  },
  {
    id: 'ownership/watch-satisfied',
    name: 'watch satisfied',
    command: 'ownership validate --base <ref>',
    failsWhen:
      'The diff between the base and `HEAD` touches a `watches` path and the `doc` of the rule is not in the same diff, with no `Docs: none — <reason>` in any commit message.',
  },
  {
    id: 'ownership/consumer-change-logged',
    name: 'consumer change logged',
    command: 'ownership validate --base <ref>',
    failsWhen:
      'The diff touches a `watches` path marked `consumer-visible: true` and the `doc` of the rule is not in the same diff with an item under `## [Unreleased]`, with no `Changelog: none — <reason>` in any commit message.',
  },
])
```

Run: it passes. Check the name of each check in `src/checks/*.ts` (`name: '…'`) if
the test reports a difference; the catalog follows the registry, never the other way around.

- [ ] **Step 1.9: Public API (red, then green)**

Create `packages/ownership/test/distribution/public-api.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../../src/index.ts'

test('the public API exposes what living-docs imports', () => {
  for (const name of [
    'resolveOwnership',
    'findOwnedRule',
    'findTransitions',
    'coreChecks',
    'diffChecks',
    'OwnershipError',
    'parseItemsTable',
    'parseItemsSections',
    'normalizeFieldKey',
    'isEmptyValue',
    'parseCodeowners',
    'loadCodeowners',
    'ownersOf',
    'CORE_CHECK_CATALOG',
  ]) {
    assert.ok(name in api, `${name} should be exported`)
  }
})
```

Run: it fails. Add to `packages/ownership/src/index.ts`:

```ts
export { parseItemsTable, parseItemsSections, normalizeFieldKey, isEmptyValue } from './schema/item.ts'
export type { DocItem } from './schema/item.ts'
export { parseCodeowners, loadCodeowners, ownersOf } from './core/codeowners.ts'
export type { Codeowners, CodeownersEntry } from './core/codeowners.ts'
export { CORE_CHECK_CATALOG } from './checks/catalog.ts'
export type { CatalogEntry } from './checks/catalog.ts'
```

Run: it passes.

- [ ] **Step 1.10: Lockfile regenerated from the lockfile**

In `packages/ownership/test/distribution/lockfile.test.ts`, right after the
`copyFileSync` of `package.json`, add:

```ts
    // The lockfile goes in together: without it npm resolves the newest version of each
    // range, and the test would fail at every registry publication, with
    // package.json untouched. With it, npm only changes what package.json asks for.
    copyFileSync(join(PACKAGE_ROOT, 'package-lock.json'), join(isolated, 'package-lock.json'))
```

Run `cd packages/ownership && node --test test/distribution/lockfile.test.ts; cd ../..`:
it passes, without regenerating the versioned lockfile.

- [ ] **Step 1.11: Suite, typecheck, CHANGELOG, commit**

```bash
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
```

Expected: core with **177** tests (167 + 10: five of parse, one of hierarchy,
two of `declared-state`, one of catalog, one of API; the v1 one changes without adding),
all passing. Living-docs as in the baseline (only its lockfile
failure). `typecheck` clean; if living-docs complains about `pluginBlocks`, it is because
some test of its own builds a `ResolvedConfig` by hand — today none does.

Ask the `release-historian` for the entry under `## [Unreleased]` of `CHANGELOG.md`, without an
artifact ID:

- `Added`: "the root ownership file accepts, at the top, a configuration
  block per plugin listed in `plugins:`; in an included file, it is an error";
  "a frontmatter `owner` without `@` becomes a finding of `ownership validate`".
- `Changed`: "the v1 schema error says the file needs to be rewritten as
  v2"; "a plugin block that is not a map becomes a load error".

```bash
git add packages/ownership CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat(ADR-0028): plugin block at the top of the root and core API for living-docs

Implements ADR-0028 and the block type rule of ADR-0020. The frontmatter
owner without @ becomes ownership/declared-state's (§6 of the spec).
The lockfile test regenerates from the lockfile and stops depending on the
registry's latest publication.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `file:../ownership` dependency and `development` condition

Living-docs comes to depend on the core, but does not import anything from it yet. The
commit proves that resolution works everywhere that runs living-docs.

**Files:**
- Modify: `packages/living-docs/package.json`, `packages/living-docs/package-lock.json`, `packages/living-docs/tsconfig.json`, `package-lock.json` (root)
- Modify: `packages/living-docs/hooks/run-hook.sh`
- Modify: `packages/living-docs/test/distribution/lockfile.test.ts`, `packages/living-docs/test/distribution/plugin-cache.test.ts`
- Create: `packages/living-docs/test/distribution/dev-resolution.test.ts`
- Modify: `.github/workflows/living-docs.yml`, `.github/workflows/wrapper-docker.yml`, `bin/living-docs`
- Modify (skill `working-agreements-keeper`): `CLAUDE.md`, `CONTRIBUTING.md`
- Modify: `README.md`
- Modify (skill `release-historian`): `CHANGELOG.md`

**Interfaces:**
- Consumes: `@esliph/ownership` with `exports["."].development = "./src/index.ts"` (already exists).
- Produces: the invocation convention `node --conditions=development packages/<package>/src/cli/index.ts …`, which every following task uses.

- [ ] **Step 2.1: Resolution test (red)**

Create `packages/living-docs/test/distribution/dev-resolution.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { toolkitRoot } from '../../src/core/roots.ts'

test('RNF-0002: from the living-docs package, @esliph/ownership resolves from the source code, without dist', { timeout: 30_000 }, () => {
  const script = 'import("@esliph/ownership").then(m => { if (typeof m.resolveOwnership !== "function") throw new Error("did not resolve from source"); console.log(import.meta.resolve("@esliph/ownership")) })'
  const result = spawnSync('node', ['--conditions=development', '--input-type=module', '-e', script], { cwd: toolkitRoot(), encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /packages\/ownership\/src\/index\.ts/)
})

test('RNF-0002: the test runner itself loads @esliph/ownership through the development condition', async () => {
  // Without the condition, resolution falls to `default` (dist/), which does not exist in the
  // checkout: this import only passes if the `node --test` worker inherited the flag.
  const core = await import('@esliph/ownership')

  assert.equal(typeof core.resolveOwnership, 'function')
})
```

Run `cd packages/living-docs && npm test -- --test-name-pattern="RNF-0002: the test runner itself"; cd ../..`.
Expected: the second test **fails** with `ERR_MODULE_NOT_FOUND` pointing to
`dist/index.js`. The first one passes by accident, because the root workspace already makes
the symlink of `node_modules/@esliph/ownership` and it passes the flag on its
own; it stays as a regression guard of resolution through the package.

If the `npm test` of step 2.7 shows that the `node --test` workers do **not**
inherit `--conditions` (the second test stays red with the new script),
change the script to `"test": "node --test --test-isolation=none \"test/**/*.test.ts\""`
preceded by `--conditions=development`, and record the change in the commit
message. Do not use inline `NODE_OPTIONS` in the script: npm runs scripts in `cmd` on
Windows.

- [ ] **Step 2.2: Declare the dependency and the condition**

`packages/living-docs/package.json`, `dependencies` block and scripts:

```json
  "scripts": {
    "test": "node --conditions=development --test \"test/**/*.test.ts\"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@esliph/ownership": "file:../ownership",
    "picomatch": "^4.0.2",
    "yaml": "^2.6.0"
  },
```

`packages/living-docs/tsconfig.json`, in `compilerOptions`:

```json
    "customConditions": ["development"],
```

`packages/living-docs/hooks/run-hook.sh`: replace the `OUTPUT` line with:

```bash
# The `development` condition resolves @esliph/ownership from the sibling package's src/:
# in the checkout there is no dist/, and that is what keeps old code from running
# silently. Outside the checkout (marketplace cache) ../ownership does not exist,
# and the hook fails open — TDR-0003.
OUTPUT="$(printf '%s' "$INPUT" | LIVING_DOCS_REPO_ROOT="$REPO_ROOT" \
  NODE_OPTIONS="--conditions=development" \
  timeout 5 node "${TOOLKIT_ROOT}/src/hooks/${HOOK}.ts" 2>/dev/null)"
```

- [ ] **Step 2.3: Install and regenerate the lockfiles**

```bash
npm install
git diff --stat package-lock.json
```

Expected: the root `package-lock.json` gains the edge
`packages/living-docs → @esliph/ownership` (the package is already a workspace; nothing new is
downloaded). The package's lockfile is regenerated outside the workspace, with the two
packages side by side for `../ownership` to resolve:

```bash
TMP="$(mktemp -d)"
mkdir -p "$TMP/packages/living-docs" "$TMP/packages/ownership"
cp packages/living-docs/package.json packages/living-docs/package-lock.json "$TMP/packages/living-docs/"
cp packages/ownership/package.json "$TMP/packages/ownership/"
(cd "$TMP/packages/living-docs" && npm install --package-lock-only --ignore-scripts)
cp "$TMP/packages/living-docs/package-lock.json" packages/living-docs/package-lock.json
rm -rf "$TMP"
git diff packages/living-docs/package-lock.json | head -40
```

Expected: `node_modules/@esliph/ownership` enters with `"resolved": "../ownership", "link": true`
and the `../ownership` entry with its dependencies. No version of
`@types/node`, `yaml` or `picomatch` changes (the existing lockfile was copied
along).

- [ ] **Step 2.4: Adjust the lockfile test**

Replace the body of `packages/living-docs/test/distribution/lockfile.test.ts`
from `const PACKAGE_ROOT` on with:

```ts
const PACKAGE_ROOT = toolkitRoot()
const CORE_ROOT = join(PACKAGE_ROOT, '..', 'ownership')

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

test('RNF-0002: the package-lock.json of the package is up to date with package.json', { timeout: 120_000 }, () => {
  // The two packages side by side, as in the checkout: without the sibling, `file:../ownership`
  // does not resolve. The lockfile goes in together so npm only changes what package.json asks for.
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))
  const pkg = join(isolated, 'packages', 'living-docs')
  const core = join(isolated, 'packages', 'ownership')

  try {
    mkdirSync(pkg, { recursive: true })
    mkdirSync(core, { recursive: true })
    copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(pkg, 'package.json'))
    copyFileSync(join(PACKAGE_ROOT, 'package-lock.json'), join(pkg, 'package-lock.json'))
    copyFileSync(join(CORE_ROOT, 'package.json'), join(core, 'package.json'))
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: pkg, encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(
      packagesOf(join(pkg, 'package-lock.json')),
      packagesOf(join(PACKAGE_ROOT, 'package-lock.json')),
      'Lockfile out of date. Regenerate it in a temporary directory with packages/living-docs and packages/ownership side by side (see step 2.3 of the 2026-09-28 plan).',
    )
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
})
```

Add `mkdirSync` to the `import` from `node:fs`.

The assertion message is test text, not shipped; citing the plan is
allowed.

- [ ] **Step 2.5: Marketplace cache with the assertion as `todo`**

In `packages/living-docs/test/distribution/plugin-cache.test.ts`, split the
test "copied alone to the cache…" in two: the control remains a test, and the
hook's response becomes `test.todo`.

```ts
test('RNF-0002: copied alone to the cache, without dependencies the hook goes quiet and exits with 0', { timeout: 60_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('without the Git for Windows bash: CI (ubuntu) runs this proof')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'living-docs-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'living-docs-project-'))

  try {
    assert.ok(copyVersioned(cache) > 50, 'copy too empty: the cache did not receive the plugin')
    assert.equal(existsSync(join(cache, 'node_modules')), false)
    mkdirSync(join(project, 'docs'), { recursive: true })
    writeFileSync(join(project, 'docs/.ownership.yml'), OWNERSHIP, 'utf8')

    const semDependencias = runHook(bash, cache, project)

    assert.equal(semDependencias.status, 0, 'fails open: exit 0 even when broken')
    assert.equal(semDependencias.stdout.trim(), '', 'without node_modules the hook should go quiet')
  } finally {
    rmSync(cache, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})

// TDR-0003: in the marketplace cache `file:../ownership` points to a
// directory that does not exist, `npm ci` fails and the hook can only fail open.
// The proof that it responds comes back when @esliph/ownership is on npm and the
// dependency is a semver range from the registry.
test.todo('RNF-0002: copied alone to the cache, the plugin installs and the hook responds from there — waits for the core to be published on npm')
```

The `OWNERSHIP` and the hook name (`hk4-watch-reminder`) stay as they are in this
task: the control does not depend on the file's content. Task 3 moves them to
v2 and Task 4 swaps the hook.

- [ ] **Step 2.6: Documented invocation**

Add `--conditions=development` right after `node` in every invocation of
`packages/living-docs/src/cli/index.ts` outside the historical record:

- `.github/workflows/living-docs.yml` (the four `run: node packages/living-docs/…` lines);
- `.github/workflows/wrapper-docker.yml:43`;
- `bin/living-docs:6` (comment) and `bin/living-docs:8`;
- `README.md` (lines 20, 32, 33, 43–47, 76, 77, 137 of the baseline);
- `CONTRIBUTING.md:24,25,40` and `CLAUDE.md:20`, by the `working-agreements-keeper`.

Check that nothing was left out:

```bash
git grep -n "node packages/living-docs/src/cli/index.ts" -- . ':!docs/superpowers' ':!docs/decisions' ':!CHANGELOG.md'
```

Expected: no lines. The two occurrences in `CHANGELOG.md` are old entries
and stay.

If `packages/living-docs/test/plugin/wrapper-docker.test.ts` asserts the exact
line of `bin/living-docs` or of the workflow, update the expected string, not the
assertion.

- [ ] **Step 2.7: Suite, validate, CHANGELOG, commit**

```bash
npm ci
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node --conditions=development packages/living-docs/src/cli/index.ts validate
```

Expected: living-docs with **554** tests (551 + the two of dev-resolution + the
`todo` born from splitting the cache test), **0 failures**, 1 `todo`. Core with 177, 0
failures. `validate` exits with 0.

`CHANGELOG.md`, `Changed`, no ID: "the CLI invocation in the checkout becomes
`node --conditions=development packages/living-docs/src/cli/index.ts`, because the
toolkit now depends on the ownership core through the source code"; `Known issues`
(or `Changed`, if the section does not exist): "installed through the marketplace, the
`living-docs` plugin does not install its dependencies until the core is published on npm; the
hooks fail open and do not respond".

```bash
git add packages/living-docs package-lock.json .github bin README.md CONTRIBUTING.md CLAUDE.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
build(TDR-0003): living-docs depends on @esliph/ownership through the source code

file:../ownership with the development condition in the test, in the type-check, in
the hooks wrapper and in the documented invocation. The cache test keeps the
control and the wrapper mode; the hook's response becomes a todo until the
core is published.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Adopting the core and splitting the checks

The big commit (§8, item 3). Living-docs comes to read v2 through the adapter, the
`.ownership.yml` goes to the root in v2, and the rules the core already has leave
living-docs. `HK-2`, `HK-4` and `HK-5` remain registered, reading v2 through the
adapter; they leave in Task 4. `init` comes to seed v2, because an
`init` that seeded v1 would produce a repository that its own `validate` does not read.

**Files:**
- Create: `packages/living-docs/test/helpers/ownership.ts`, `packages/living-docs/test/distribution/single-rule.test.ts`
- Rewrite: `packages/living-docs/src/config/ownership.ts`, `packages/living-docs/test/config/ownership.test.ts`
- Move + rewrite: `docs/.ownership.yml` → `.ownership.yml`
- Modify: `CODEOWNERS`, `.github/workflows/living-docs.yml`, `docs/contracts/checks.gen.md` (regenerated)
- Modify (`src/`): `core/types.ts`, `docs/collect.ts`, `docs/corpus.ts`, `docs/schema.ts`, `docs/blocked.ts`, `checks/registry.ts`, `checks/catalog.ts`, `checks/ci1-structure.ts`, `checks/ci2-ids.ts`, `checks/ci3-traceability.ts`, `checks/ci4-staleness.ts`, `checks/ci7-ownership-coverage.ts`, `checks/ci8-links.ts`, `checks/ci9-commit-discipline.ts`, `checks/ci10-trigger-routing.ts`, `checks/ci11-external-audience.ts`, `config/watches.ts`, `cli/index.ts`, `cli/validate.ts`, `cli/init.ts`, `hooks/hk1-append-only.ts`, `hooks/hk2-generated-artifact.ts`, `hooks/hk3-state-promotion.ts`, `hooks/hk4-watch-reminder.ts`, `hooks/hk5-commit-guard.ts`, `hooks/hk6-session-inventory.ts`, `hooks/hk8-open-decision-guard.ts`, `tools/gen-checks.ts`
- Modify (templates): `templates/ownership.yml`, `templates/CODEOWNERS`, `templates/workflow.yml`
- Delete (`src/`): `checks/ci5-contract-drift.ts`, `checks/ci6-changelog-required.ts`, `cli/drift.ts`, `cli/changelog.ts`, `config/codeowners.ts`, `docs/table.ts`, `docs/sections.ts`, `docs/item.ts`
- Delete (`test/`): `checks/ci5-contract-drift.test.ts`, `checks/ci6-changelog-required.test.ts`, `cli/drift.test.ts`, `cli/changelog.test.ts`, `config/codeowners.test.ts`, `docs/table.test.ts`, `docs/sections.test.ts`
- Modify (`test/`): the whole list of step 3.12
- Modify (core, ports): `packages/ownership/test/hooks/generated-guard.test.ts`, `packages/ownership/test/hooks/watch-reminder.test.ts`, `packages/ownership/test/hooks/commit-guard.test.ts`, `packages/ownership/test/checks/generated-drift.test.ts`, `packages/ownership/test/checks/consumer-change-logged.test.ts`, `packages/ownership/test/core/exception-label.test.ts`, `packages/ownership/test/core/codeowners.test.ts`, `packages/ownership/test/core/exec.test.ts`, `packages/ownership/test/cli/validate.test.ts`, `packages/ownership/test/schema/item.test.ts`, `packages/ownership/src/cli/index.ts` (the `GitError`), and the rest of the core's `src/` only if a port turns red
- Modify (skill `release-historian`): `CHANGELOG.md`

**Interfaces:**
- Consumes (from `@esliph/ownership`): `resolveOwnership`, `OwnershipError`,
  `findTransitions`, `parseItemsTable`, `parseItemsSections`,
  `normalizeFieldKey`, `isEmptyValue`, `parseCodeowners`, `loadCodeowners`,
  `ownersOf`, `coreChecks`, `diffChecks`, `CORE_CHECK_CATALOG`, and the types
  `ResolvedConfig`, `ResolvedOwnedRule`, `DocItem` (`{ key, state, line, fields }`).
- Produces, in `packages/living-docs/src/config/ownership.ts`:
  - `PLUGIN = 'living-docs'`
  - `loadLivingDocsConfig(root: string): LivingDocsConfig` (throws `OwnershipError`)
  - `adaptConfig(core: ResolvedConfig): LivingDocsConfig`
  - `interface LivingDocsConfig { rootFile: string; staleAfterMonths: number; lastReviewedBumpLimit: number; idFormat: IdFormat; artifacts: ArtifactRule[]; documents: DocumentRule[]; generated: GeneratedRule[]; watches: WatchRule[]; core: ResolvedConfig }`
  - `ArtifactRule` and `DocumentRule` with today's fields, plus `core: ResolvedOwnedRule`; `ArtifactRule.states` comes from the core's `rule.states`.
  - `fieldOf`, `findArtifactRule`, `findDocumentRule`, `documentWithRole`, `AUDIENCES`, `DOCUMENT_ROLES`, `DEFAULT_BUMP_LIMIT` with today's signatures (swapping `OwnershipConfig` for `LivingDocsConfig`), and `OwnershipError` re-exported.
  - Gone: `OWNERSHIP_PATH`, `parseOwnership`, `loadOwnership`, `OwnershipConfig`, the local `OwnershipError` class.
- Produces, in `packages/living-docs/src/core/types.ts`: `interface DiffFacts { base: string; changed: string[]; messages: string[] }` (moved from `ci6-changelog-required.ts`); `CheckContext.config: LivingDocsConfig`.
- Produces, in `packages/living-docs/test/helpers/ownership.ts`: `OWNERSHIP_FILE = '.ownership.yml'`, `configFrom(yaml: string): LivingDocsConfig`.
- Gone from `src/docs/schema.ts`: `STATUS_MACHINE`, `statesFor`. `FROZEN_STATUSES`, `HUMAN_PROMOTIONS` and the rest remain.
- `src/checks/registry.ts` loses `driftChecks` and `changelogChecks`.
- `src/docs/corpus.ts` loses `docsRoot`; `declaredPaths(config)` and `documentationFiles(root, config)` remain, over `LivingDocsConfig`.

- [ ] **Step 3.1: Test helper**

Create `packages/living-docs/test/helpers/ownership.ts`:

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import type { LivingDocsConfig } from '../../src/config/ownership.ts'

/** Where fixtures write the ownership file: the root, as `init` seeds it. */
export const OWNERSHIP_FILE = '.ownership.yml'

/**
 * The configuration the adapter reads from this v2 YAML. For pure-function tests
 * that do not need the repository: the file lives in a throwaway directory and
 * disappears before the return. Whoever needs the repository files uses
 * `withTempRepo` with `OWNERSHIP_FILE` and `loadLivingDocsConfig(root)`.
 */
export function configFrom(yaml: string): LivingDocsConfig {
  const root = mkdtempSync(join(tmpdir(), 'living-docs-config-'))

  try {
    writeFileSync(join(root, OWNERSHIP_FILE), yaml, 'utf8')

    return loadLivingDocsConfig(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}
```

- [ ] **Step 3.2: Adapter tests (red)**

Replace the entire content of `packages/living-docs/test/config/ownership.test.ts`
with:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OwnershipError, documentWithRole, fieldOf, findArtifactRule, findDocumentRule, loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { checkoutRoot } from '../helpers/checkout.ts'
import { configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const HEAD = 'version: 2\nplugins: [living-docs]\n'

const ADR = `
  - path: docs/decisions/adr/
    owner: '@time'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]
`

const DA = `
  - path: docs/open-decisions.md
    owner: '@product'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map: { resolved-by: 'Resolved by' }
`

function yaml(owned: string, top = ''): string {
  return `${HEAD}${top}owned:${owned}`
}

test('ADR-0029: an entry with living-docs.id-prefix is an artifact, with the block fields and the core ones', () => {
  const config = configFrom(yaml(ADR + DA))
  const adr = config.artifacts.find(rule => rule.idPrefix === 'ADR')
  const da = config.artifacts.find(rule => rule.idPrefix === 'DA')

  assert.equal(adr?.path, 'docs/decisions/adr/')
  assert.equal(adr?.owner, '@time')
  assert.equal(adr?.skill, 'decision-recorder')
  assert.equal(adr?.appendOnly, true)
  assert.deepEqual(adr?.mutableFields, ['status', 'superseded-by', 'last-reviewed'])
  assert.deepEqual(adr?.states, ['draft', 'accepted', 'superseded'])
  assert.equal(adr?.collection, 'per-file')
  assert.equal(adr?.audience, 'internal')
  assert.equal(da?.collection, 'table')
  assert.deepEqual(da?.fieldMap, { 'resolved-by': 'resolved by' })
  assert.equal(da?.core.format.key, 'ID')
})

test('ADR-0029: an entry with a living-docs block without id-prefix is a document; without a block, it is not living-docs\'s', () => {
  const config = configFrom(
    yaml(`${ADR}
  - path: CLAUDE.md
    owner: '@time'
    skill: working-agreements-keeper
    living-docs: { role: agent-contract }
  - path: README.md
    owner: '@time'
    living-docs: { audience: external }
  - path: src/
    owner: '@time'
`),
  )

  assert.deepEqual(
    config.documents.map(document => [document.path, document.skill, document.role, document.audience]),
    [
      ['CLAUDE.md', 'working-agreements-keeper', 'agent-contract', 'internal'],
      ['README.md', null, null, 'external'],
    ],
  )
  assert.equal(findDocumentRule(config, 'src/a.ts'), null)
  assert.equal(findArtifactRule(config, 'src/a.ts'), null)
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md')
})

test('ADR-0028: the top-level block carries stale-after-months, id-format and last-reviewed-bump-limit; when absent, the defaults apply', () => {
  const declared = configFrom(
    yaml(ADR, "living-docs:\n  stale-after-months: 3\n  id-format: { separator: '_', padding: 3 }\n  last-reviewed-bump-limit: 5\n"),
  )
  const defaults = configFrom(yaml(ADR))

  assert.equal(declared.staleAfterMonths, 3)
  assert.deepEqual(declared.idFormat, { separator: '_', padding: 3 })
  assert.equal(declared.lastReviewedBumpLimit, 5)
  assert.equal(defaults.staleAfterMonths, 6)
  assert.deepEqual(defaults.idFormat, DEFAULT_ID_FORMAT)
  assert.equal(defaults.lastReviewedBumpLimit, 3)
})

test('an unknown key in the top-level block is an error', () => {
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  stale-after: 3\n')), /\.ownership\.yml\.living-docs.*unknown key "stale-after"/)
})

test('an unknown key in the entry block is an error that names the entry', () => {
  const extra = ADR.replace('append-only: true', 'append-only: true\n      apend-only: true')

  assert.throws(() => configFrom(yaml(extra)), /entry "docs\/decisions\/adr\/".*unknown key "apend-only"/)
})

test('an artifact key in a document is an error, and the message says why', () => {
  assert.throws(
    () => configFrom(yaml(`${ADR}\n  - path: CLAUDE.md\n    owner: '@time'\n    living-docs: { append-only: true }\n`)),
    /unknown key "append-only".*only apply with `id-prefix`/,
  )
})

test('id-prefix out of shape, duplicated, or an artifact without skill are errors', () => {
  assert.throws(() => configFrom(yaml(ADR.replace('id-prefix: ADR', 'id-prefix: adr'))), /id-prefix "adr".*2 to 4 uppercase letters/)
  assert.throws(() => configFrom(yaml(ADR + ADR.replace('docs/decisions/adr/', 'docs/adr2/'))), /id-prefix "ADR" declared twice/)
  assert.throws(() => configFrom(yaml(ADR.replace('    skill: decision-recorder\n', ''))), /an artifact needs a `skill`/)
})

test('a role declared in two documents is an error, and an unknown role too', () => {
  const doc = (path: string, role: string) => `\n  - path: ${path}\n    owner: '@time'\n    living-docs: { role: ${role} }\n`

  assert.throws(() => configFrom(yaml(ADR + doc('A.md', 'agent-contract') + doc('B.md', 'agent-contract'))), /role "agent-contract" declared in two documents/)
  assert.throws(() => configFrom(yaml(ADR + doc('A.md', 'manual'))), /unknown role "manual"/)
})

test('id-format and last-reviewed-bump-limit out of range are errors', () => {
  assert.throws(() => configFrom(yaml(ADR, "living-docs:\n  id-format: { separator: '/' }\n")), /separator "\/" is not accepted/)
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  id-format: { padding: 9 }\n')), /padding "9" must be an integer between 2 and 6/)
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  last-reviewed-bump-limit: 1\n')), /last-reviewed-bump-limit "1".*greater than or equal to 2/)
})

test('with no artifact at all, the error teaches how to declare the plugin and the block', () => {
  assert.throws(() => configFrom("version: 2\nowned:\n  - path: a.md\n    owner: '@time'\n"), /no `owned` entry carries `living-docs\.id-prefix`.*plugins: \[living-docs\]/)
})

test('without an ownership file, an OwnershipError that points to init', () => {
  withTempRepo({}, root => {
    assert.throws(() => loadLivingDocsConfig(root), (err: unknown) => err instanceof OwnershipError && /living-docs init/.test(err.message))
  })
})

test('ADR-0029: a v1 file is not read — the core error rises as it is', () => {
  withTempRepo({ '.ownership.yml': 'version: 1\nartifacts: []\n' }, root => {
    assert.throws(() => loadLivingDocsConfig(root), (err: unknown) => err instanceof OwnershipError && /schema v1/.test(err.message))
  })
})

test('fieldOf translates the canonical field through the field-map and treats empty as absent', () => {
  const config = configFrom(yaml(DA))
  const rule = config.artifacts[0]!
  const item = { key: 'DA-0001', state: 'resolved', line: 3, fields: { 'resolved by': 'ADR-0001', gap: '—' } }

  assert.equal(fieldOf(rule, item, 'resolved-by'), 'ADR-0001')
  assert.equal(fieldOf(rule, item, 'gap'), null)
})

test('this repository: the root .ownership.yml declares states for every family, and the document of each role', () => {
  const config = loadLivingDocsConfig(checkoutRoot())

  assert.equal(config.rootFile, '.ownership.yml')
  assert.deepEqual(config.artifacts.map(rule => rule.idPrefix).sort(), ['ADR', 'DA', 'REL', 'RF', 'RN', 'RNF', 'TDR'])
  for (const rule of config.artifacts) {
    assert.ok(rule.states !== null && rule.states.length > 0, `${rule.idPrefix} must declare states`)
  }
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md')
  assert.equal(documentWithRole(config, 'definition-of-done')?.path, 'docs/definition-of-done.md')
})
```

There are 14 tests. Run
`cd packages/living-docs && node --conditions=development --test test/config/ownership.test.ts; cd ../..`:
it fails on import (`loadLivingDocsConfig` does not exist).

- [ ] **Step 3.3: The adapter (green)**

Replace the entire content of `packages/living-docs/src/config/ownership.ts`
with:

```ts
import { OwnershipError, isEmptyValue, normalizeFieldKey, resolveOwnership } from '@esliph/ownership'
import type { DocItem, ResolvedConfig, ResolvedOwnedRule } from '@esliph/ownership'
import { DEFAULT_ID_FORMAT, PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

export { OwnershipError }

/**
 * The name of this plugin's block in the ownership file. A path is
 * living-docs's if, and only if, the `owned` entry that covers it carries this
 * block (ADR-0020); with `id-prefix` it is an artifact, without it it is a document (ADR-0029).
 */
export const PLUGIN = 'living-docs'

export type Collection = 'per-file' | 'table' | 'sections'

/**
 * Who reads a document or artifact (`ADR-0017`). When absent, `internal` applies.
 */
export const AUDIENCES = ['internal', 'external'] as const
export type Audience = (typeof AUDIENCES)[number]

/**
 * Roles the toolkit recognizes in a document (`ADR-0008`). A closed
 * vocabulary: it is what allows finding the agent contract and the Definition of Done
 * without knowing any path.
 */
export const DOCUMENT_ROLES = ['agent-contract', 'definition-of-done'] as const
export type DocumentRole = (typeof DOCUMENT_ROLES)[number]

export interface ArtifactRule {
  idPrefix: string
  path: string
  owner: string
  skill: string
  appendOnly: boolean
  mutableFields: string[]
  citedBy: string[]
  collection: Collection
  /** Canonical -> real name of the field in this project. E.g.: { 'resolved-by': 'resolved by' }. */
  fieldMap: Record<string, string>
  /** `states` of the entry, which belongs to the core; `null` when the entry does not declare. */
  states: string[] | null
  audience: Audience
  /** The entry as resolved by the core — it is what `findTransitions` receives. */
  core: ResolvedOwnedRule
}

/** A document with an owner and no ID family (`ADR-0008`). */
export interface DocumentRule {
  path: string
  owner: string
  /** Owning skill, when there is one. `null` is information, not an error. */
  skill: string | null
  role: DocumentRole | null
  audience: Audience
  core: ResolvedOwnedRule
}

export interface GeneratedRule {
  path: string
  command: string
}

export interface WatchRule {
  code: string
  doc: string
  reason: string | null
  consumerVisible: boolean
}

export interface LivingDocsConfig {
  /** The root ownership file, relative to the repository (e.g.: `.ownership.yml`). */
  rootFile: string
  staleAfterMonths: number
  /** How many documents with a dry date bump fail (`ADR-0013`, `RN-0027`). */
  lastReviewedBumpLimit: number
  /** The written form of this project's IDs (`ADR-0011`). Never the identity. */
  idFormat: IdFormat
  artifacts: ArtifactRule[]
  documents: DocumentRule[]
  generated: GeneratedRule[]
  watches: WatchRule[]
  /** The whole configuration, as the core resolved it. */
  core: ResolvedConfig
}

const ID_PREFIX = /^[A-Z]{2,4}$/
const TOP_KEYS: ReadonlySet<string> = new Set(['stale-after-months', 'id-format', 'last-reviewed-bump-limit'])
const ARTIFACT_KEYS: ReadonlySet<string> = new Set(['id-prefix', 'append-only', 'mutable-fields', 'cited-by', 'field-map', 'audience'])
const DOCUMENT_KEYS: ReadonlySet<string> = new Set(['role', 'audience'])
const DEFAULT_STALE_AFTER_MONTHS = 6

/**
 * The mass-bump threshold (`ADR-0013`). Floor 2, not 1: a document that was really
 * reviewed updates the date, and a threshold of 1 would fail the mechanism working.
 */
export const DEFAULT_BUMP_LIMIT = 3

function fail(where: string, message: string): never {
  throw new OwnershipError(`${where}: ${message}`)
}

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(where, 'must be a map.')
  }

  return value as Record<string, unknown>
}

function asStringList(value: unknown, where: string): string[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    fail(where, 'must be a list of strings.')
  }

  return value as string[]
}

function assertKnown(block: Record<string, unknown>, allowed: ReadonlySet<string>, where: string, hint = ''): void {
  for (const key of Object.keys(block)) {
    if (!allowed.has(key)) {
      fail(where, `unknown key "${key}".${hint}`)
    }
  }
}

function parseIdFormat(raw: unknown, where: string): IdFormat {
  if (raw === undefined || raw === null) {
    return DEFAULT_ID_FORMAT
  }
  const item = asRecord(raw, `${where}.id-format`)
  const separator = item.separator ?? DEFAULT_ID_FORMAT.separator

  if (typeof separator !== 'string' || !SEPARATORS_ALLOWED.includes(separator)) {
    // Source rule: ADR-0011.
    fail(where, `id-format.separator "${String(separator)}" is not accepted. Valid: ${SEPARATORS_ALLOWED.map(value => `"${value}"`).join(', ')}.`)
  }

  const padding = item.padding ?? DEFAULT_ID_FORMAT.padding

  if (typeof padding !== 'number' || !Number.isInteger(padding) || padding < PADDING_RANGE.min || padding > PADDING_RANGE.max) {
    // Source rule: ADR-0011.
    fail(where, `id-format.padding "${String(padding)}" must be an integer between ${PADDING_RANGE.min} and ${PADDING_RANGE.max}.`)
  }

  return { separator, padding }
}

function parseBumpLimit(raw: unknown, where: string): number {
  if (raw === undefined || raw === null) {
    return DEFAULT_BUMP_LIMIT
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 2) {
    // Source rule: ADR-0013.
    fail(where, `last-reviewed-bump-limit "${String(raw)}" must be an integer greater than or equal to 2 (a threshold of 1 would fail the legitimate review of a single document).`)
  }

  return raw
}

function parseAudience(raw: unknown, where: string): Audience {
  if (raw === undefined) {
    return 'internal'
  }
  if (!AUDIENCES.includes(raw as Audience)) {
    fail(where, `unknown audience "${String(raw)}". Valid: ${AUDIENCES.join(', ')}.`)
  }

  return raw as Audience
}

function whereOf(rule: ResolvedOwnedRule): string {
  return `${rule.origin}: entry "${rule.path}", block ${PLUGIN}`
}

function toArtifact(rule: ResolvedOwnedRule, block: Record<string, unknown>): ArtifactRule {
  const where = whereOf(rule)

  assertKnown(block, ARTIFACT_KEYS, where)

  const idPrefix = block['id-prefix']

  if (typeof idPrefix !== 'string' || !ID_PREFIX.test(idPrefix)) {
    fail(where, `id-prefix "${String(idPrefix)}" must be 2 to 4 uppercase letters (e.g. ADR, DA, TDR).`)
  }
  if (rule.skill === null) {
    fail(where, 'an artifact needs a `skill` in its entry — the owning skill is the one that writes its items.')
  }

  const fieldMap: Record<string, string> = {}
  const fieldMapRaw = block['field-map']

  if (fieldMapRaw !== undefined && fieldMapRaw !== null) {
    for (const [canonical, real] of Object.entries(asRecord(fieldMapRaw, `${where}.field-map`))) {
      if (typeof real !== 'string' || real.trim() === '') {
        fail(where, `field-map.${canonical} must be a non-empty string.`)
      }
      fieldMap[normalizeFieldKey(canonical)] = normalizeFieldKey(real)
    }
  }

  return {
    idPrefix,
    path: rule.path,
    owner: rule.owner,
    skill: rule.skill,
    appendOnly: block['append-only'] === true,
    mutableFields: asStringList(block['mutable-fields'], `${where}.mutable-fields`),
    citedBy: asStringList(block['cited-by'], `${where}.cited-by`),
    collection: rule.format.collection,
    fieldMap,
    states: rule.states,
    audience: parseAudience(block.audience, where),
    core: rule,
  }
}

function toDocument(rule: ResolvedOwnedRule, block: Record<string, unknown>): DocumentRule {
  const where = whereOf(rule)

  assertKnown(block, DOCUMENT_KEYS, where, ' Artifact keys only apply with `id-prefix`.')

  const role = block.role

  if (role !== undefined && !DOCUMENT_ROLES.includes(role as DocumentRole)) {
    fail(where, `unknown role "${String(role)}". Valid: ${DOCUMENT_ROLES.join(', ')}.`)
  }

  return {
    path: rule.path,
    owner: rule.owner,
    skill: rule.skill,
    role: role === undefined ? null : (role as DocumentRole),
    audience: parseAudience(block.audience, where),
    core: rule,
  }
}

/** The living-docs configuration over the one the core resolved. A pure function. */
export function adaptConfig(core: ResolvedConfig): LivingDocsConfig {
  const top = core.pluginBlocks[PLUGIN] ?? {}
  const topWhere = `${core.rootFile}.${PLUGIN}`

  assertKnown(top, TOP_KEYS, topWhere)

  const artifacts: ArtifactRule[] = []
  const documents: DocumentRule[] = []

  for (const rule of core.owned) {
    const block = rule.pluginBlocks[PLUGIN]

    if (block === undefined) {
      continue
    }
    if (block['id-prefix'] !== undefined) {
      artifacts.push(toArtifact(rule, block))
    } else {
      documents.push(toDocument(rule, block))
    }
  }

  if (artifacts.length === 0) {
    fail(
      core.rootFile,
      `no \`owned\` entry carries \`${PLUGIN}.id-prefix\` — with no declared artifact nothing is enforceable. ` +
        `Declare \`plugins: [${PLUGIN}]\` at the root and the \`${PLUGIN}:\` block in the entries.`,
    )
  }

  const prefixes = new Set<string>()

  for (const artifact of artifacts) {
    if (prefixes.has(artifact.idPrefix)) {
      fail(core.rootFile, `id-prefix "${artifact.idPrefix}" declared twice. One artifact, one owner.`)
    }
    prefixes.add(artifact.idPrefix)
  }

  const roles = new Set<string>()

  for (const document of documents) {
    if (document.role === null) {
      continue
    }
    if (roles.has(document.role)) {
      fail(core.rootFile, `role "${document.role}" declared in two documents. One role, one document.`)
    }
    roles.add(document.role)
  }

  const stale = top['stale-after-months']

  return {
    rootFile: core.rootFile,
    staleAfterMonths: typeof stale === 'number' ? stale : DEFAULT_STALE_AFTER_MONTHS,
    lastReviewedBumpLimit: parseBumpLimit(top['last-reviewed-bump-limit'], topWhere),
    idFormat: parseIdFormat(top['id-format'], topWhere),
    artifacts,
    documents,
    generated: core.generated.map(rule => ({ path: rule.path, command: rule.command })),
    watches: core.watches.map(rule => ({ code: rule.code, doc: rule.doc, reason: rule.reason, consumerVisible: rule.consumerVisible })),
    core,
  }
}

/**
 * Finds the ownership file through the core's order of candidates, validates the
 * schema, the disjunction and the bases (the core), and then the `living-docs:` block
 * with the usual rigor: an unknown key is an error. `OwnershipError` rises as it is.
 */
export function loadLivingDocsConfig(root: string): LivingDocsConfig {
  const core = resolveOwnership(root)

  if (core === null) {
    throw new OwnershipError(`no ownership file found in ${root}. Run \`living-docs init\` (owning skill: living-docs-bootstrap).`)
  }

  return adaptConfig(core)
}

/**
 * The value of a canonical field of the item, respecting the artifact's `field-map`.
 * Returns null for an empty cell — absent and empty are the same thing here.
 */
export function fieldOf(rule: ArtifactRule, item: DocItem, canonical: string): string | null {
  const key = rule.fieldMap[normalizeFieldKey(canonical)] ?? normalizeFieldKey(canonical)
  const value = item.fields[key]

  if (value === undefined || isEmptyValue(value)) {
    return null
  }

  return value.trim()
}

function normalizePath(repoPath: string): string {
  return repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Does the declared path cover this path? A directory by prefix, a file by equality. */
function covers(declared: string, repoPath: string): boolean {
  const target = declared.replace(/\\/g, '/')

  return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target
}

/** The artifact rule that owns a path relative to the repository root, or null. */
export function findArtifactRule(config: LivingDocsConfig, repoPath: string): ArtifactRule | null {
  const normalized = normalizePath(repoPath)

  return config.artifacts.find(artifact => covers(artifact.path, normalized)) ?? null
}

/** The document that owns a relative path, or null. Same semantics as `findArtifactRule`. */
export function findDocumentRule(config: LivingDocsConfig, repoPath: string): DocumentRule | null {
  const normalized = normalizePath(repoPath)

  return config.documents.find(document => covers(document.path, normalized)) ?? null
}

/** The document the project declared with this role, or null. */
export function documentWithRole(config: LivingDocsConfig, role: DocumentRole): DocumentRule | null {
  return config.documents.find(document => document.role === role) ?? null
}
```

Run the test file of step 3.2. Expected: the first 13 pass; the
last one (dogfooding) fails because the root `.ownership.yml` does not exist yet —
it stays red until step 3.10.

- [ ] **Step 3.4: Items through the core's parsers**

1. In `packages/living-docs/src/docs/collect.ts`, replace the imports of
   `./table.ts`, `./sections.ts` and `./item.ts` with
   `import { parseItemsSections, parseItemsTable } from '@esliph/ownership'` and
   `import type { DocItem } from '@esliph/ownership'`; replace
   `OwnershipConfig` with `LivingDocsConfig`; add `parseId` to the import from
   `./schema.ts`; and replace `parseItems` with:

```ts
/**
 * The items of a collection artifact, read by the core according to the entry's
 * `format`. The shape of the ID is living-docs policy, not the parser's: the key
 * arrives opaque and only what is an ID in the shape declared by the project becomes an item
 * (`ADR-0011`). A heading without an ID, and a table row without an ID, are not items.
 */
function parseItems(rule: ArtifactRule, source: string, body: string | null, bodyStart: number, format: IdFormat): DocItem[] {
  const text = body ?? source
  const start = body === null ? 1 : bodyStart
  const { format: read } = rule.core
  const items =
    read.collection === 'table'
      ? parseItemsTable(text, start, { key: read.key!, stateField: read.stateField })
      : read.collection === 'sections'
        ? parseItemsSections(text, start, { keyMode: read.keyMode!, stateField: read.stateField })
        : []

  return items.filter(item => parseId(item.key, format) !== null)
}
```

2. Delete `packages/living-docs/src/docs/table.ts`, `sections.ts`, `item.ts` and
   the tests `test/docs/table.test.ts`, `test/docs/sections.test.ts` with
   `git rm`. Before deleting, check each case against the table
   "Comparison of the removed tests" at the end of this plan.

3. Replace `item.id` with `item.key` and `item.status` with `item.state` throughout
   `src/`:

```bash
git grep -n "item\.id\b\|item\.status\b" -- packages/living-docs/src
```

   Expected before the swap: `ci1-structure.ts`, `ci2-ids.ts`, `ci3-traceability.ts`,
   `ci4-staleness.ts`, `ci9-commit-discipline.ts`, `docs/blocked.ts`,
   `hooks/hk6-session-inventory.ts` (`hk3` is rewritten in step 3.9). In
   `ci3-traceability.ts` the assembled object keeps the keys `id` and
   `status` that the rest of the check reads: only the right-hand side changes
   (`id: item.key`, `status: item.state`). In `ci4-staleness.ts:125`, the check
   `item.status !== null` becomes `item.state !== ''`.

4. In `docs/blocked.ts` and wherever else `normalizeKey`/`isEmptyValue` came from
   `docs/item.ts`, import `normalizeFieldKey`/`isEmptyValue` from
   `@esliph/ownership`.

5. Add to `packages/living-docs/test/docs/collect.test.ts` the two tests
   of Review Focus 3:

```ts
test('collection table without a Status column: the items arrive without a state, and the one who complains is the structure check', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: '@time'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
`,
      // The `note` row is not an ID: the core returns it as an opaque key, and it is
      // living-docs's ID-shape filter that removes it.
      'docs/open-decisions.md': '| ID | Gap |\n| --- | --- |\n| DA-0001 | x |\n| note | y |\n',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))

      assert.deepEqual(
        docs[0]?.items.map(item => [item.key, item.state]),
        [['DA-0001', '']],
      )
    },
  )
})

test('a requirement under a ### heading is not an item — only ## declares a requirement', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/requirements/rules.md
    owner: '@time'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
`,
      'docs/requirements/rules.md': '## RN-0001 — Rule\n\n- **status:** active\n\n### RN-0002 — Sub\n\n- **status:** active\n\n## Context\n',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))

      assert.deepEqual(
        docs[0]?.items.map(item => item.key),
        ['RN-0001'],
      )
    },
  )
})
```

   Import `OWNERSHIP_FILE` from `../helpers/ownership.ts` and `loadLivingDocsConfig`
   from `../../src/config/ownership.ts` at the top of the file.

- [ ] **Step 3.5: States come from the entry**

In `packages/living-docs/src/docs/schema.ts`, delete `STATUS_MACHINE` and
`statesFor` (and the `import type { ArtifactRule }`, which becomes unused). Replace each
use:

- `src/checks/ci1-structure.ts`: `const states = statesFor(doc.rule)` →
  `const states = doc.rule.states`;
- `src/checks/ci4-staleness.ts:155`: `statesFor(doc.rule)?.includes(DEBT_STATE)` →
  `doc.rule.states?.includes(DEBT_STATE)`;
- `src/hooks/hk6-session-inventory.ts:49`: likewise with `DECISION_STATE`.

In `test/docs/schema.test.ts`, delete the three tests that read the built-in machine
(`'the state machine of spec §4 is encoded'`,
`'the three requirement families share the draft → active → revoked cycle'`,
`'statesFor prefers the states declared in .ownership.yml'`). The last test of
step 3.2 is the substitute: states are now a declaration of the project.

- [ ] **Step 3.6: The corpus without an ownership directory**

Replace `packages/living-docs/src/docs/corpus.ts` with:

```ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { LivingDocsConfig } from '../config/ownership.ts'
import { listFiles } from '../core/files.ts'

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Every path that is living-docs's: artifacts, documents and generated ones. */
export function declaredPaths(config: LivingDocsConfig): string[] {
  return [...config.artifacts.map(artifact => artifact.path), ...config.documents.map(document => document.path), ...config.generated.map(generated => generated.path)].map(
    normalize,
  )
}

/**
 * The documentation corpus: everything that lives on a living-docs path and exists.
 *
 * It used to be "everything under the ownership file's directory, plus what is declared
 * outside it". With the file at the root, that directory would be the whole repository. The
 * corpus becomes what the entries with a `living-docs:` block declare, which is
 * what the project said is documentation (ADR-0029). It is the set that the link
 * check sweeps and where a binary attachment fails.
 */
export function documentationFiles(root: string, config: LivingDocsConfig): string[] {
  const files = new Set<string>()

  for (const declared of declaredPaths(config)) {
    if (declared.endsWith('/')) {
      for (const file of listFiles(root, [`${declared}**`])) {
        files.add(file)
      }
      continue
    }
    if (existsSync(join(root, declared))) {
      files.add(declared)
    }
  }

  return [...files].sort()
}
```

In `src/checks/ci8-links.ts`: remove `docsRoot` from the import, delete
`const prefix = …` and the `if (!file.startsWith(prefix)) continue` from the loop over
binaries, and change the message to
`` `Binary attachment in the documentation: \`.${extension}\` is not read in a diff nor reviewed in a PR.` ``.

In `test/docs/corpus.test.ts`: delete the test `'docsRoot derives from the location…'`
and rewrite `'documentationFiles = everything under the root + what is declared outside it and exists'`
as `'documentationFiles = what the living-docs paths declare and exists; the rest of the repository does not enter'`,
with a v2 fixture that has a file under `src/` covered by an entry **without**
a `living-docs:` block and asserts that it is not in the result.

In `test/checks/ci8-links.test.ts`, rename
`'RN-0023: a binary outside the documentation root is not CI-8's business'` to
`'RN-0023: a binary outside the corpus is not CI-8's business'` and adjust the fixture:
the binary lives on a path without a `living-docs:` block.

- [ ] **Step 3.7: Compare and port to the core, before deleting**

For each row of the table "Comparison of the removed tests" (end of the plan)
marked **port**, add the test to the indicated core file, run it, and
only then proceed. The tests to port, in the style of the neighbors in each file
(`env`, `CONFIG`, `withTempRepo`, `buildConfig` already defined in them):

`packages/ownership/test/hooks/generated-guard.test.ts`:

```ts
test('the marker only counts on the first line — prose about it, or a marker on line 20, does not freeze the file', () => {
  const corpo = ['# Title', ...Array.from({ length: 18 }, () => 'line'), 'generated: do not edit', 'end'].join('\n')

  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': corpo, 'y.md': 'This text talks about generated: do not edit.\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'y.md' } }, env(root)).action, 'allow')
  })
})

test('a payload without file_path allows', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: {} }, env(root)).action, 'allow')
  })
})

test('an absolute host file_path under the root is translated and denied when generated', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out.md\n    command: gen\n' }, root => {
    const absolute = `${root.replace(/\\/g, '/')}/out.md`

    assert.equal(decideGeneratedGuard({ tool_input: { file_path: absolute } }, env(root)).action, 'deny')
  })
})

test('generated[] requires an exact path — a declared directory does not cover what is inside it', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out/\n    command: gen\n', 'out/a.md': 'body\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'out/a.md' } }, env(root)).action, 'allow')
  })
})
```

`packages/ownership/test/hooks/watch-reminder.test.ts`:

```ts
test('the reminder names the doc, the reason and the owning skill, and carries no permission decision', () => {
  const config = "version: 2\nowned:\n  - path: docs/requirements/rules.md\n    owner: '@time'\n    skill: requirements-keeper\nwatches:\n  - code: 'src/**'\n    doc: docs/requirements/rules.md\n    reason: rule before the code\n"

  withTempRepo({ '.ownership.yml': config }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/a.ts' } }, env(root))

    assert.equal(decision.action, 'remind')
    assert.ok(decision.action === 'remind')
    assert.match(decision.context, /docs\/requirements\/rules\.md/)
    assert.match(decision.context, /rule before the code/)
    assert.match(decision.context, /requirements-keeper/)
    assert.doesNotMatch(decision.context, /permissionDecision/)
  })
})

test('an owning doc without a declared skill is still reminded, and the message points to CODEOWNERS', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root))

    assert.ok(decision.action === 'remind')
    assert.match(decision.context, /No skill declared/)
  })
})

test('a payload without file_path is silence', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideWatchReminder({ tool_input: {} }, env(root)).action, 'silent')
  })
})
```

`packages/ownership/test/hooks/commit-guard.test.ts`:

```ts
test('the message teaches the two legitimate ways out: update the doc, or a human decision', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

    assert.ok(decision.action === 'ask')
    assert.match(decision.reason, /update the doc/i)
    assert.match(decision.reason, /human decision/i)
  })
})

test('a command that is not git commit passes without consulting git', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    let consultado = false
    const spy = () => {
      consultado = true

      return ''
    }

    for (const command of ['git status', 'npm test', 'git add -A', 'echo "git commit"']) {
      assert.equal(decideCommitGuard({ tool_name: 'Bash', tool_input: { command } }, env(root), spy).action, 'allow', command)
    }
    assert.equal(consultado, false)
  })
})

test('an empty index passes', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => '').action, 'allow')
  })
})
```

`packages/ownership/test/checks/generated-drift.test.ts`:

```ts
test('a checkout CR and an extra trailing break are not drift', () => {
  withTempRepo({ 'out.md': 'a\r\nb\r\n\n\n' }, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })

    assert.deepEqual(ownershipGeneratedDrift(() => 'a\nb\n').run({ root, config, today: '2026-09-28' }), [])
  })
})
```

`packages/ownership/test/checks/consumer-change-logged.test.ts`:

```ts
test('an item under Unreleased written with * counts as an entry', () => {
  withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n* something new\n' }, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })

    assert.deepEqual(
      ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-28' }),
      [],
    )
  })
})

test('a declared doc, in the diff and missing from the repository, is a finding, not silence', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-28' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /missing/)
  })
})
```

`packages/ownership/test/core/exception-label.test.ts`:

```ts
test('accepts em dash, en dash, hyphen and colon as a separator', () => {
  for (const separator of ['—', '–', '-', ':']) {
    assert.equal(exceptionReasonFor('Changelog', [`Changelog: none ${separator} test only`]), 'test only', separator)
  }
})
```

`packages/ownership/test/core/codeowners.test.ts` — the four tests of
`packages/living-docs/test/config/codeowners.test.ts`, copied as they are (the
`CODEOWNERS` constant along with them), changing only the import to
`import { loadCodeowners, ownersOf, parseCodeowners } from '../../src/core/codeowners.ts'`
and `import { withTempRepo } from '../helpers/tmp.ts'`. The first comment of the
constant comes to cite `.ownership.yml`.

`packages/ownership/test/core/exec.test.ts` (import `GitError` along with it):

```ts
test('changedPaths with a base that does not resolve throws GitError — the check does not invent an empty diff', () => {
  assert.throws(
    () =>
      changedPaths('/repo', 'does-not-exist', () => {
        throw new Error('fatal: bad revision')
      }),
    GitError,
  )
})
```

`packages/ownership/test/cli/validate.test.ts` — living-docs used to exit with 2 and
teach `fetch-depth` when the base did not resolve; the core's CLI today lets
`GitError` escape as an exception:

```ts
test('a base that does not resolve: exits with 2 and says the clone must contain the base', { timeout: 30_000 }, () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    spawnSync('git', ['init', '-q'], { cwd: root })
    const cli = join(import.meta.dirname, '..', '..', 'src', 'cli', 'index.ts')
    const run = spawnSync('node', [cli, 'validate', '--base', 'does-not-exist'], { cwd: root, encoding: 'utf8', env: { ...process.env, OWNERSHIP_REPO_ROOT: root } })

    assert.equal(run.status, 2, run.stderr)
    assert.match(run.stderr, /fetch-depth/)
  })
})
```

(import `spawnSync` from `node:child_process`, `join` from `node:path` and
`withTempRepo` from `../helpers/tmp.ts` if the file does not have them yet). This one
stays red. In `packages/ownership/src/cli/index.ts`, import `GitError` from
`../core/exec.ts` and add to the `catch`, after the `OwnershipError` branch:

```ts
    if (err instanceof GitError) {
      process.stderr.write(`ownership: ${err.message}\n` + '           the clone must contain the base (in CI: `actions/checkout` with `fetch-depth: 0`).\n')

      return 2
    }
```

`packages/ownership/test/schema/item.test.ts`:

```ts
test('parseItemsTable stops reading at the first line that is not part of the table', () => {
  const items = parseItemsTable('| ID | Status |\n| --- | --- |\n| A-1 | open |\n\n| A-2 | open |\n', 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['A-1'],
  )
})

test('parseItemsTable brings all columns into the item, by the normalized key', () => {
  const items = parseItemsTable('| ID | Status | Resolved by: |\n| --- | --- | --- |\n| A-1 | open | B-2 |\n', 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(items[0]?.fields, { id: 'A-1', status: 'open', 'resolved by': 'B-2' })
})

test('parseItemsSections: the line is shifted by startLine, and a section without a state returns an empty state', () => {
  const items = parseItemsSections('## RN-0001 — Rule\n\nText.\n', 10, { keyMode: 'first-token', stateField: 'status' })

  assert.equal(items[0]?.line, 10)
  assert.equal(items[0]?.state, '')
})
```

Run `npm test --workspace packages/ownership`. Expected: **200** tests (177 +
23 ports), all passing. A port that stays red is behavior the
core does not have: implement in the core's `src/` the minimum that makes it pass, and
record it in the comparison table of the PR.

- [ ] **Step 3.8: Take out of living-docs what went to the core**

1. Delete with `git rm`: `src/checks/ci5-contract-drift.ts`,
   `src/checks/ci6-changelog-required.ts`, `src/cli/drift.ts`,
   `src/cli/changelog.ts`, `src/config/codeowners.ts`, and the tests
   `test/checks/ci5-contract-drift.test.ts`,
   `test/checks/ci6-changelog-required.test.ts`, `test/cli/drift.test.ts`,
   `test/cli/changelog.test.ts`, `test/config/codeowners.test.ts`.

2. In `src/core/types.ts`, replace the import of `OwnershipConfig` with
   `LivingDocsConfig` (and `config: LivingDocsConfig` in `CheckContext`), and
   add:

```ts
/** Facts of the branch diff, delivered by injection to whoever reads them (`ADR-0006`). */
export interface DiffFacts {
  base: string
  changed: string[]
  messages: string[]
}
```

   In `src/checks/ci9-commit-discipline.ts` and `src/checks/ci7-ownership-coverage.ts`,
   import `DiffFacts` from `../core/types.ts`.

3. `src/checks/registry.ts`: delete `driftChecks`, `changelogChecks`, `NO_DIFF`
   and the imports of `ci5`, `ci6`, `runCommand`, `CommandRunner`. `validateChecks`
   stays the same. Update the comment of `validateChecks` (without `CI-5`/`CI-6`).

4. `src/checks/ci1-structure.ts` — what `ownership/declared-state`
   covers leaves:
   - delete the `else if (!states.includes(String(data.status)))` block (per-file
   status outside `states`), keeping the `if (!states)` ("no state machine
   declared"), whose fix now says
   `'Declare \`states:\` in the entry of this artifact in the ownership file.'`;
   - delete the whole block of the `owner` without `@`;
   - in the loop over collection items, delete the `if (!states.includes(item.state))`;
     only "item without `status`" remains.

   In `test/checks/ci1-structure.test.ts`: delete
   `'status outside the state machine fails on the field line'`; in
   `'owner without @ and last-reviewed outside ISO fail'` remove the owner half and
   rename it to `'last-reviewed outside ISO fails'`; in
   `'table collection: the container does not require an id, but each item requires a valid status'`
   remove the "status outside the machine" half and rename it to
   `'table collection: the container does not require an id, but each item requires a status'`.

5. `src/checks/ci7-ownership-coverage.ts` — classes 3, 4 and 6 remain:
   - delete the imports of `loadCodeowners`, `ownersOf`, `pendingDocs`,
     `documentationFiles`, `existsSync`, `join`, `findArtifactRule`,
     `findDocumentRule`, `OWNERSHIP_PATH`;
   - delete `isDeclared`, the block of the missing CODEOWNERS, the loop "1 — every
     document in the corpus has an owner", the loop "2 — every watches link", and the
     `pendingDocs` loop inside "5"; the `if (diff !== null && docsExceptionReason(diff.messages) === null)`
     stays, wrapping only the `claimsFor` loop (renumber comments 3, 4, 5);
   - rewrite the header comment: three classes (a contract repeating the
     owning artifact, a DoD item without verification, a path claimed by an
     open decision in the diff); owner coverage and the `watches` link
     went to the core (`ownership/owner-coverage` and
     `ownership/watch-satisfied`).

   In `test/checks/ci7-ownership-coverage.test.ts`, delete:
   `'RN-0016: a document under the root without an entry in .ownership.yml fails, naming the file'`,
   `'RN-0016: a missing CODEOWNERS is one finding, not one per file'`,
   `'RN-0008 (config): a watches link that points to a nonexistent doc or one without an owner fails'`,
   `'criterion 5, half 2: a diff that carries a watched path without the owning doc fails'`,
   `'criterion 5, half 2: with the doc in the same diff, or with the reason written, it passes'`,
   `'without a diff, the diff half does not run'`.
   Rename `'RN-0016: a repository with everything declared in both places passes'`
   to `'a repository with none of the three classes passes'` and adjust the fixture.

6. `src/cli/validate.ts`: `loadOwnership` → `loadLivingDocsConfig`; remove
   `consumerVisible` from `ValidateResult` and from the returned object. `src/cli/index.ts`:
   delete the `drift` and `changelog` branches and the imports of `runDrift`/`runChangelog`;
   import `OwnershipError` from `../config/ownership.ts` (the re-export); replace the
   `USAGE` with

```ts
const USAGE = `living-docs <command>

  validate    Runs the living-documentation checks over the tree
  init        Creates the living-documentation scaffold (owning skill: living-docs-bootstrap)

init options:
  --owner <@handle>   Default owner of the artifacts created
  --stage <stage>     Minimum set to install: solo (default), small-team, production or multi-team
  --id-separator <s>  ID separator: "-" (default), "_", ".", ":" or "" (empty)
  --id-padding <n>    ID digits: 4 (default), between 2 and 6
  --invoke <command>  How the CLI is called in the installer's CI (default: npx living-docs)
  --marketplace <o/r>  Marketplace repository of the plugin; without it the hooks are not registered
  --dry-run           Shows what it would do, without writing

validate options:
  --base <ref>        Diff base — turns on the checks that read the branch diff

Owner, lifecycle, generated artifact, code→doc link and CHANGELOG entry
are verified by \`ownership validate [--base <ref>]\`.
`
```

   and, in the `validate` branch, replace the three pointers (`generated`,
   `consumerVisible`, `watched`) with a single one:

```ts
      // A pointer, not a finding: generated artifact and code→doc link belong to the
      // core now, and staying quiet about it would be pretending to cover it.
      if (result.generated > 0 || result.watched > 0) {
        process.stdout.write(
          `living-docs: ${result.generated} generated artifact(s) and ${result.watched} declared code→doc link(s) — ` +
            'verified by `ownership validate` (with `--base <ref>` for the diff).\n',
        )
      }
```

   The empty `--base` message loses the `(CI-7)` at the end.

   In `test/cli/validate.test.ts`, delete
   `'RF-0011: with --base, CI-7 charges for the owning doc of the watched path that changed'`
   (it goes to the core; see the comparison).

7. `test/checks/budget.test.ts`: delete the imports and the calls of `runDrift` and
   `runChangelog`; the first test measures only `runValidate`, and the second asserts the
   `elapsedMs` of `runValidate` only. The count does not change.

8. `test/docs/release-history.test.ts`:
   - delete `'ADR-0006: the two lists of the mechanism agree, and a test prevents them from drifting'`
     (the second list ceased to exist, §4);
   - rewrite `'RN-0013: this repository declares what is visible to the consumer'`
     to assert that `config.watches.filter(w => w.consumerVisible)` is not empty
     and covers `bin/**` and `packages/living-docs/src/cli/**`;
   - replace the import of `unreleasedEntries` with a local function in the test
     file itself, with the same body as the homonymous function in
     `packages/ownership/src/checks/consumer-change-logged.ts` (which is not
     exported).

9. `test/contracts/drift.test.ts`: the first test stops using `runDrift` and
   comes to run the core's check against the checkout:

```ts
import { coreChecks, resolveOwnership } from '@esliph/ownership'

test('RF-0006: the generated contract of this repository has not drifted — dogfooding with the real generator', () => {
  const config = resolveOwnership(ROOT)

  assert.ok(config !== null && config.generated.length >= 1, 'this repository must declare at least one generated artifact')
  const drift = coreChecks().find(check => check.id === 'ownership/generated-drift')!
  const findings = drift.run({ root: ROOT, config, today: '2026-09-28' })

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})
```

   The second test comes to assert the source with
   `/src\/checks\/catalog\.ts/` **and** `/core catalog/` (the new header of
   step 3.13).

10. `test/checks/registry.test.ts`: remove `driftChecks`/`changelogChecks` from the
    import and from the `reais` list; remove `'CI-5'` and `'CI-6'` from the command map; the
    command regex becomes `/^living-docs validate$/`.

- [ ] **Step 3.9: Hooks reading v2**

1. `hk1-append-only.ts`, `hk2-generated-artifact.ts`, `hk4-watch-reminder.ts`,
   `hk5-commit-guard.ts`, `hk6-session-inventory.ts`, `hk8-open-decision-guard.ts`:
   `loadOwnership` → `loadLivingDocsConfig`; `GeneratedRule` keeps coming from
   `../config/ownership.ts`. In `hk6-session-inventory.ts:95`, the cited source
   comes to be `` `source: \`${config.rootFile}\`` `` (`config` is already in
   scope; if it is not, pass it).

2. `src/config/watches.ts`: `OwnershipConfig` → `LivingDocsConfig`. The rest does not
   change — this file leaves in Task 4, together with the hooks that use it.

3. Rewrite `findPromotion` in `src/hooks/hk3-state-promotion.ts` over the core's
   `findTransitions` (§5). Imports: remove `parseItemTable`,
   `parseItemSections`, `DocItem`, `DEFAULT_ID_FORMAT`, `IdFormat`; add
   `import { findTransitions } from '@esliph/ownership'`; `loadOwnership` →
   `loadLivingDocsConfig`. The body:

```ts
/**
 * The first transition of this edit that requires people. The before/after pairing is
 * the core's (`findTransitions`); the list of transitions that require a human act is
 * living-docs's, fixed, until `DA-0004` decides how the core declares it.
 */
function findPromotion(before: string, after: string, rule: ArtifactRule, repoPath: string): Promotion | null {
  for (const transition of findTransitions(before, after, rule.core, repoPath)) {
    if (!isHumanPromotion(transition.from, transition.to)) {
      continue
    }
    // In per-file the core's key is the path; the message names the ID.
    const id = rule.collection === 'per-file' ? (statusOf(after)?.id ?? transition.key) : transition.key

    return { id, from: transition.from, to: transition.to }
  }

  return null
}
```

   and the call becomes `findPromotion(current, next, rule, repoPath)`. `statusOf`
   stays (it reads the frontmatter `id`).

   The tests of `test/hooks/hk3-state-promotion.test.ts` do not change their assertions:
   only the fixture (step 3.12). If any changes result, stop: it is a defect
   of the pairing, not of the test.

- [ ] **Step 3.10: v2 `.ownership.yml` at the root and CODEOWNERS**

```bash
git mv docs/.ownership.yml .ownership.yml
```

Replace the content of `.ownership.yml` with:

```yaml
# Owner, lifecycle and trigger of each path in this repository. Hooks and
# checks know no path: they read from here. The core (`ownership`) reads the
# schema; the `living-docs:` block belongs to the living-documentation plugin,
# opaque to the core. Origin of the rule: ADR-0020, ADR-0028 and ADR-0029.
version: 2
plugins: [living-docs]

living-docs:
  stale-after-months: 6

owned:
  # --- Artifacts: an entry with `living-docs.id-prefix`. ID family and lifecycle.
  - path: docs/decisions/adr/
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]

  - path: docs/open-decisions.md
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      # The table is read by people, in plain language; the check asks by the
      # canonical name. The mapping lives here because it is specific to the project.
      field-map:
        resolved-by: 'Resolved by'
        blocks: 'Blocks'
        gap: 'Gap'

  - path: docs/decisions/debt/
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [open, paid, accepted-permanently]
    living-docs:
      id-prefix: TDR
      append-only: true
      mutable-fields: [status, last-reviewed]

  - path: docs/requirements/functional.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RF
      cited-by: ['packages/living-docs/test/**', 'packages/ownership/test/**']

  - path: docs/requirements/non-functional.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RNF
      cited-by: ['packages/living-docs/test/**', 'packages/ownership/test/**']

  - path: docs/requirements/rules.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RN
      cited-by: ['packages/living-docs/test/**', 'packages/living-docs/src/**', 'packages/ownership/test/**', 'packages/ownership/src/**']

  - path: docs/releases/
    owner: '@esliph/engineering'
    skill: release-historian
    states: [draft, published]
    living-docs:
      id-prefix: REL
      # Read by whoever consumes: the text does not cite an artifact ID (ADR-0017).
      audience: external
      # A published release note is frozen: that is why REL has an ID family
      # and CHANGELOG.md does not.
      append-only: true
      mutable-fields: [status, last-reviewed]

  # --- Documents: a `living-docs:` block without `id-prefix` (ADR-0008, ADR-0029).
  # `role` is a closed vocabulary; `audience: external` marks the text for whoever
  # comes from outside, which does not cite an artifact ID.
  - path: .ownership.yml
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
    living-docs: {}
  - path: docs/ids-retired.txt
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
    living-docs: {}
  - path: CONTRIBUTING.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    living-docs: {}
  - path: docs/definition-of-done.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
  - path: CLAUDE.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    living-docs: { role: agent-contract }
  - path: docs/glossary.md
    owner: '@esliph/engineering'
    skill: glossary-keeper
    living-docs: {}
  - path: docs/charter/
    owner: '@esliph/engineering'
    skill: charter-keeper
    living-docs: {}
  - path: docs/contracts/errors.md
    owner: '@esliph/engineering'
    skill: contract-keeper
    living-docs: {}
  - path: docs/contracts/versioning-policy.md
    owner: '@esliph/engineering'
    skill: contract-keeper
    living-docs: {}
  # Generated: the generated-file guard blocks editing it by hand, and
  # `ownership/generated-drift` compares it with the generator's output.
  - path: docs/contracts/checks.gen.md
    owner: '@esliph/engineering'
    living-docs: {}
  - path: CHANGELOG.md
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }
  - path: docs/deprecations.md
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }
  - path: docs/migrations/
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }
  # No owning skill, and that is information: plan, spec and README have an owner and have no
  # keeper. They stay out of the duplication corpus of the agent contract (ADR-0009).
  - path: docs/superpowers/
    owner: '@esliph/engineering'
    living-docs: {}
  - path: README.md
    owner: '@esliph/engineering'
    living-docs: { audience: external }

  # --- Owner only: outside living documentation. `ownership/owner-coverage` requires an
  # owner for every file of the repository, not only for the documentation.
  - path: packages/living-docs/
    owner: '@esliph/engineering'
  - path: packages/ownership/
    owner: '@esliph/engineering'
  - path: bin/
    owner: '@esliph/engineering'
  - path: .github/
    owner: '@esliph/engineering'
  - path: .claude-plugin/
    owner: '@esliph/engineering'
  - path: CODEOWNERS
    owner: '@esliph/engineering'
  - path: package.json
    owner: '@esliph/engineering'
  - path: package-lock.json
    owner: '@esliph/engineering'
  - path: .gitattributes
    owner: '@esliph/engineering'
  - path: .gitignore
    owner: '@esliph/engineering'
  - path: .prettierignore
    owner: '@esliph/engineering'
  - path: .prettierrc
    owner: '@esliph/engineering'
  - path: .dockerignore
    owner: '@esliph/engineering'
  - path: Dockerfile
    owner: '@esliph/engineering'
  - path: compose.yaml
    owner: '@esliph/engineering'
  - path: eslint.config.mjs
    owner: '@esliph/engineering'

# The core scans the file system, not the git index: what exists only in the
# checkout of whoever runs it (worktrees, local session state) stays out.
ignore:
  - 'node_modules/**'
  - '**/node_modules/**'
  - '.worktrees/**'
  - '.claude/**'
  - '.superpowers/**'

generated:
  # The command PRINTS the expected content and writes no file: a check
  # that rewrites what it is checking erases the evidence at the very moment
  # it reports it (ADR-0005).
  - path: docs/contracts/checks.gen.md
    command: node --conditions=development packages/living-docs/src/tools/gen-checks.ts

# Code → owning doc. The reminder on edit, the question at commit and the enforcement on the
# PR diff read from here. `consumer-visible: true` is the only list of paths
# visible to whoever consumes (ADR-0020).
watches:
  - code: 'packages/living-docs/src/checks/**'
    doc: docs/requirements/rules.md
    reason: 'a check is an executable rule — the RN comes first, and it is what the check verifies'

  - code: 'packages/living-docs/src/checks/catalog.ts'
    doc: docs/contracts/checks.gen.md
    reason: 'the public contract of the checks derives from the catalog — regenerating is part of the change, and editing by hand is blocked. Owning skill: contract-keeper'

  - code: 'packages/living-docs/src/hooks/**'
    doc: docs/requirements/rules.md
    reason: 'a hook blocks or asks on behalf of a rule; with no RN cited, the block has no origin'

  - code: 'packages/ownership/src/{checks,hooks}/**'
    doc: docs/requirements/rules.md
    reason: 'a check and a hook of the core are an executable rule like those of living-docs'

  - code: 'packages/living-docs/src/cli/**'
    doc: docs/requirements/functional.md
    reason: 'what the command does that is observable is an RF, not an implementation detail'

  - code: 'packages/living-docs/src/core/**'
    doc: docs/requirements/non-functional.md
    reason: 'the two roots are a property of the system (ADR-0003), not command behavior'

  - code: 'packages/living-docs/skills/**'
    doc: CONTRIBUTING.md
    reason: 'a new or changed skill changes how we work here'

  - code: '.github/workflows/**'
    doc: docs/definition-of-done.md
    reason: "the last line of the Definition of Done names what the workflow runs — changing the workflow changes what 'done' means"

  - code: '.github/workflows/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'the enforcement is literally what the consumer installs'

  - code: 'packages/living-docs/src/cli/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'subcommand, option and exit code are public contract (docs/contracts/versioning-policy.md)'

  - code: 'packages/living-docs/src/checks/catalog.ts'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'the identifiers of the checks are public and do not change meaning'

  - code: 'packages/living-docs/src/config/ownership.ts'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'the living-docs block of the ownership file is the contract of whoever installs'

  - code: 'packages/living-docs/{.claude-plugin,hooks,commands,skills,agents}/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'skill, hook and command identifiers are public'

  - code: 'packages/living-docs/templates/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'it is what `init` writes in the repository of whoever installs'

  - code: 'packages/ownership/src/cli/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'subcommand, option and exit code of the core are public contract'

  - code: 'packages/ownership/{.claude-plugin,hooks}/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'the core plugin is what whoever installs receives in the session'

  - code: 'bin/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'the wrapper is a public entry point of the toolkit — changing how it is invoked changes what whoever consumes uses'
```

Rewrite the `CODEOWNERS`:

```
# Mirrors the `owner` field of .ownership.yml. One path, one owner.

docs/decisions/adr/ @esliph/engineering
docs/open-decisions.md @esliph/engineering
docs/decisions/debt/ @esliph/engineering
docs/requirements/ @esliph/engineering
CONTRIBUTING.md @esliph/engineering
docs/definition-of-done.md @esliph/engineering
CLAUDE.md @esliph/engineering
docs/glossary.md @esliph/engineering
docs/charter/ @esliph/engineering
docs/contracts/ @esliph/engineering
CHANGELOG.md @esliph/engineering
docs/deprecations.md @esliph/engineering
docs/releases/ @esliph/engineering
docs/migrations/ @esliph/engineering
.ownership.yml @esliph/engineering
docs/ids-retired.txt @esliph/engineering
docs/superpowers/ @esliph/engineering
README.md @esliph/engineering
packages/living-docs/ @esliph/engineering
packages/ownership/ @esliph/engineering
bin/ @esliph/engineering
.github/ @esliph/engineering
.claude-plugin/ @esliph/engineering
CODEOWNERS @esliph/engineering
package.json @esliph/engineering
package-lock.json @esliph/engineering
.gitattributes @esliph/engineering
.gitignore @esliph/engineering
.prettierignore @esliph/engineering
.prettierrc @esliph/engineering
.dockerignore @esliph/engineering
Dockerfile @esliph/engineering
compose.yaml @esliph/engineering
eslint.config.mjs @esliph/engineering
```

Run the first `ownership validate` (§4: "the exact list comes out of it"):

```bash
node --conditions=development packages/ownership/src/cli/index.ts validate
```

Expected: no findings. Every `ownership/owner-coverage` finding here is a
versioned or local file that the list above forgot: add the entry (and
the CODEOWNERS line), or the pattern in `ignore` if the file is not versioned.
An `ownership/declared-state` finding is an item with a state outside `states`: stop and
investigate, because `CI-1` would have reported it before.

- [ ] **Step 3.11: `init` seeds v2**

`packages/living-docs/templates/ownership.yml` — replace with:

```yaml
# Owner, lifecycle and trigger of each path in this repository. Hooks and
# checks know no path — they read from here. The ownership core reads the
# schema; the `living-docs:` block belongs to living documentation.
version: 2
plugins: [living-docs]

living-docs:
  stale-after-months: 6
  # The written form of an ID in this project. Identity does NOT depend on it: the
  # same prefix with the same number is the same item, with or without a separator and with
  # any number of leading zeros. Change this to adopt a repository whose IDs are
  # already written another way — never renumber the repository to fit the
  # default.
  id-format:
    separator: "{{ID_SEPARATOR}}"
    padding: {{ID_PADDING}}

owned:
  # Artifact: an entry with `living-docs.id-prefix`. ID family and lifecycle.
  - path: {{ADR_PATH}}
    owner: "{{OWNER}}"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]

  - path: {{DA_PATH}}
    owner: "{{OWNER}}"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      # The table is read by people, in plain language; the check asks by the
      # canonical name. The mapping lives here because it is specific to the project.
      field-map:
        resolved-by: "Resolved by"
        blocks: "Blocks"
        gap: "Gap"

  - path: {{TDR_PATH}}
    owner: "{{OWNER}}"
    skill: decision-recorder
    states: [open, paid, accepted-permanently]
    living-docs:
      id-prefix: TDR
      append-only: true
      mutable-fields: [status, last-reviewed]
{{REQUIREMENTS_BLOCK}}{{RELEASES_BLOCK}}
{{DOCUMENTS_BLOCK}}
  # What `init` creates that is not documentation: it has an owner and no block.
  - path: CODEOWNERS
    owner: "{{OWNER}}"
  - path: .github/workflows/living-docs.yml
    owner: "{{OWNER}}"

# `ownership validate` requires an owner for EVERY file of the repository, not only for
# the documentation. Declare your code under `owned` (without a `living-docs:` block) or
# take it out of governance here. `init` does not invent these paths. Example:
#
# owned:
#   - path: src/
#     owner: "@time"
ignore: ["node_modules/**", "**/node_modules/**"]

generated: []
# Generated artifact: editing by hand is denied, and `ownership validate` compares the
# versioned file with the generator's output.
#
# The `command` PRINTS the expected content to standard output and does NOT write any
# file — a check that rewrites what it is checking erases the evidence at the very moment
# it reports it. A generator that only knows how to write files gets a
# wrapper: generate into a temporary directory and print the result.
#
# `init` does not invent a generator, for the same reason it does not invent `watches`.
# Declare yours. Example:
#
# generated:
#   - path: docs/contracts/openapi.gen.yaml
#     command: "node tools/gen-openapi.js"

# Code → owning doc: reminded after the edit, asked before the commit and
# enforced on the PR diff. Fill in with the paths of YOUR code — `init` does not
# invent a link, because a link nobody recognizes teaches people to ignore the
# reminder. The rule that points at CHANGELOG with `consumer-visible: true` says which
# paths are visible to whoever consumes. Example:
#
# watches:
#   - code: "src/domain/**"
#     doc: docs/requirements/rules.md
#     reason: "new behavior requires a rule with an ID before the code"
#   - code: "src/api/**"
#     doc: CHANGELOG.md
#     consumer-visible: true
#     reason: "a change visible to the consumer is born with the entry in the same PR"
watches: []
```

`packages/living-docs/templates/CODEOWNERS`: the first line comes to cite
`.ownership.yml`, the line `docs/.ownership.yml    {{OWNER}}` becomes
`.ownership.yml    {{OWNER}}`, and, before `{{RETIRED_CODEOWNERS}}`, come in
`CODEOWNERS    {{OWNER}}` and `.github/workflows/living-docs.yml    {{OWNER}}`.

`packages/living-docs/templates/workflow.yml`: the name of the fixed step comes to be
`Living documentation — state of the tree`. The `drift` and `changelog` steps leave
`workflowSteps` (below); Task 4 puts the core's in their place.

`packages/living-docs/src/cli/init.ts`:

1. Imports: `loadLivingDocsConfig` and the types `Audience`, `DocumentRole`,
   `LivingDocsConfig` from `../config/ownership.ts`; `parseCodeowners` from
   `@esliph/ownership`. `OWNERSHIP_PATH` goes away.
2. Add, near `WORKFLOW_PATH`:

```ts
/** Where `init` writes the ownership file: the root of whoever installs. */
export const OWNERSHIP_FILE = '.ownership.yml'

/** The candidates the core reads, in its order. Only one may exist. */
const OWNERSHIP_CANDIDATES: readonly string[] = [OWNERSHIP_FILE, 'docs/.ownership.yml']
```

   and replace `OWNERSHIP_PATH` with `OWNERSHIP_FILE` in `BASE_DOCUMENTS`.
3. `documentEntry`:

```ts
function documentEntry(seed: DocumentSeed, owner: string): string {
  const lines = [`  - path: ${seed.path}`, `    owner: "${owner}"`]
  const block: string[] = []

  if (seed.skill !== null) {
    lines.push(`    skill: ${seed.skill}`)
  }
  if (seed.role !== null) {
    block.push(`role: ${seed.role}`)
  }
  if (seed.audience === 'external') {
    block.push('audience: external')
  }
  lines.push(`    living-docs: {${block.length === 0 ? '' : ` ${block.join(', ')} `}}`)

  return lines.join('\n')
}
```

4. `documentsBlock` returns only the comments and the entries, without the
   `documents:` key:

```ts
function documentsBlock(root: string, owner: string, stage: Stage): string {
  const entries = documentSeeds(root, stage).map(seed => documentEntry(seed, owner))

  return [
    // Source rule: ADR-0008 and ADR-0029.
    '  # Document: a `living-docs:` block without `id-prefix`. It has an owner and no ID family.',
    '  # `role` is a closed vocabulary: agent-contract, definition-of-done.',
    '  # `audience` says who reads: absent is internal; external rejects an artifact ID in the text.',
    ...entries,
  ].join('\n')
}
```

5. `requirementsBlock`, for each `kind`:

```ts
    return [
      `  - path: ${paths[kind]}`,
      `    owner: "${owner}"`,
      '    skill: requirements-keeper',
      '    states: [draft, active, revoked]',
      '    format: { collection: sections, key: first-token }',
      `    living-docs: { id-prefix: ${kind}, cited-by: [${citedBy}] }`,
    ].join('\n')
```

6. `releasesBlock`:

```ts
  return (
    '\n' +
    [
      `  - path: ${path}`,
      `    owner: "${owner}"`,
      '    skill: release-historian',
      '    states: [draft, published]',
      '    # A release note is read by whoever consumes it: the text cites no artifact ID.',
      // Source rule: spec §5, SK-7, rule 4.
      '    # A published release note is frozen.',
      '    living-docs: { id-prefix: REL, audience: external, append-only: true, mutable-fields: [status, last-reviewed] }',
    ].join('\n') +
    '\n'
  )
```

7. In `runInit`, replace the reading of `existing` with (Review Focus 1):

```ts
  // Does an ownership file already exist? Then the paths come from it, and
  // init does not write another next to it: two candidates lock every read by
  // ambiguity. A file that does not read as v2 is reported, never overwritten.
  const existingFile = OWNERSHIP_CANDIDATES.find(candidate => existsSync(join(root, candidate))) ?? null
  let existing: LivingDocsConfig | null = null

  if (existingFile !== null) {
    try {
      existing = loadLivingDocsConfig(root)
    } catch (err) {
      result.notInstalled.push(
        `${existingFile} — the file exists and does not read as v2 (${err instanceof Error ? err.message : String(err)}); ` +
          'rewrite it as v2 by hand, guided by the CHANGELOG. init neither overwrites it nor creates another next to it',
      )
    }
  }
```

   and the writing of the file with:

```ts
  if (existingFile === null) {
    writeIfAbsent(root, OWNERSHIP_FILE, template('ownership.yml', values), options, result)
  } else {
    result.skipped.push(existingFile)
  }
```

8. `declareArtifacts(root, options, result, block, what, file)` and
   `declareDocuments(root, options, result, existing)` come to edit
   `existing.rootFile` (new `file` parameter in the first, `existing.rootFile` in the
   second) with a single anchor, `\nowned:\n`: the entries go in right after
   it. Without the anchor, today's behavior (report and do not guess).

```ts
const OWNED_ANCHOR = '\nowned:\n'

function insertAfterOwned(source: string, entries: string): string | null {
  return source.includes(OWNED_ANCHOR) ? source.replace(OWNED_ANCHOR, `${OWNED_ANCHOR}${entries.replace(/^\n+/, '').replace(/\n*$/, '\n')}`) : null
}
```

   In `declareArtifacts`, `source.replace(anchor, …)` becomes
   `insertAfterOwned(source, block)`, and the missing-anchor message comes to
   say "`owned:` anchor not found". In `declareDocuments`, the two anchor branches
   become one: `insertAfterOwned(source, entries)`, and the missing-anchor
   message loses the `(CI-7)`. `unmarkedExternal` and the messages that cite
   `OWNERSHIP_PATH` come to cite `existing.rootFile` — receive it as a
   parameter where the function does not have `existing`.
9. `workflowSteps`: delete the `phases.includes(5)` and `phases.includes(6)` branches.

The `init` tests (`test/cli/init.test.ts`, `test/cli/init-enforcement.test.ts`,
`test/acceptance/consumer-repo.test.ts`, `test/acceptance/spec-criteria.test.ts`)
change in form, not in intent: where they asserted `artifacts:`/`documents:`/
`version: 1`/`docs/.ownership.yml`/`consumer-visible-paths`, they come to assert the
corresponding v2 entry in `.ownership.yml`, and where they asserted the workflow's
`drift`/`changelog` steps, they come to assert that those are not there.
Add to `test/cli/init.test.ts` the test of Review Focus 1:

```ts
test('an existing v1 ownership file: init does not create another at the root, and says it needs to be rewritten', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 1\nartifacts: []\n' }, root => {
    const result = runInit(root, { owner: '@time', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', marketplace: null })

    assert.equal(existsSync(join(root, '.ownership.yml')), false)
    assert.ok(result.skipped.includes('docs/.ownership.yml'))
    assert.ok(result.notInstalled.some(item => /docs\/\.ownership\.yml.*does not read as v2.*rewrite/.test(item)))
  })
})
```

   (import `existsSync`, `join` and `DEFAULT_ID_FORMAT` if the file does not
   import them yet).

- [ ] **Step 3.12: Rewrite the test fixtures in v2**

Every v1 fixture becomes v2 by hand, per the table below. Do not write a converter.

| v1 | v2 |
| --- | --- |
| `version: 1` | `version: 2` and `plugins: [living-docs]` |
| `stale-after-months`, `id-format`, `last-reviewed-bump-limit` at the top | the same keys under `living-docs:` at the top |
| `artifacts:` and `documents:` | a single list, `owned:` |
| `id-prefix`, `append-only`, `mutable-fields`, `cited-by`, `field-map`, `audience` of the artifact | under the entry's `living-docs:` |
| `role`, `audience` of the document | under the entry's `living-docs:`; a document with neither carries `living-docs: {}` |
| `path`, `owner`, `skill` | stay in the entry |
| declared `states:` | stays in the entry |
| `states` absent in an artifact | `states:` from the table below, by prefix |
| `collection: table` | `format: { collection: table, key: ID, state-field: Status }` |
| `collection: sections` | `format: { collection: sections, key: first-token }` |
| `consumer-visible-paths: [...]` | goes away; the `consumer-visible: true` mark on the `watches` rules is already the list |
| path `docs/.ownership.yml` in the fixture | `OWNERSHIP_FILE` (`.ownership.yml`), from `../helpers/ownership.ts` |
| `parseOwnership(yaml)` | `configFrom(yaml)`, or `loadLivingDocsConfig(root)` inside `withTempRepo` |
| `loadOwnership(root)` | `loadLivingDocsConfig(root)` |
| `OWNERSHIP_PATH` | `OWNERSHIP_FILE` |

States by prefix (the machine that `statesFor` embedded):

| Prefix | `states` |
| --- | --- |
| `ADR` | `[draft, accepted, superseded]` |
| `DA` | `[open, resolved, dropped]` |
| `TDR` | `[open, paid, accepted-permanently]` |
| `RF`, `RNF`, `RN` | `[draft, active, revoked]` |
| `REL` | `[draft, published]` |

Files to rewrite (all in `packages/living-docs/test/`):
`acceptance/consumer-repo.test.ts`, `acceptance/id-format.test.ts`,
`acceptance/spec-criteria.test.ts`, `checks/ci1-structure.test.ts`,
`checks/ci2-ids.test.ts`, `checks/ci3-traceability.test.ts`,
`checks/ci4-staleness.test.ts`, `checks/ci7-ownership-coverage.test.ts`,
`checks/ci8-links.test.ts`, `checks/ci9-commit-discipline.test.ts`,
`checks/ci10-trigger-routing.test.ts`, `checks/ci11-external-audience.test.ts`,
`cli/init.test.ts`, `cli/init-enforcement.test.ts`, `cli/validate.test.ts`,
`config/watches.test.ts`, `core/files.test.ts`, `distribution/internal-trail.test.ts`,
`distribution/plugin-cache.test.ts`, `docs/agent-contract.test.ts`,
`docs/blocked.test.ts`, `docs/collect.test.ts`, `docs/corpus.test.ts`,
`docs/maintenance.test.ts`, `docs/release-history.test.ts`, `docs/schema.test.ts`,
`helpers/checkout.ts` (only the comment), `hooks/hk1-append-only.test.ts`,
`hooks/hk2-generated-artifact.test.ts`, `hooks/hk3-state-promotion.test.ts`,
`hooks/hk4-watch-reminder.test.ts`, `hooks/hk5-commit-guard.test.ts`,
`hooks/hk6-session-inventory.test.ts`, `hooks/hk8-open-decision-guard.test.ts`,
`plugin/manifest.test.ts`, `plugin/wrapper-docker.test.ts`,
`contracts/drift.test.ts`, `checks/budget.test.ts`, `checks/registry.test.ts`.

Special cases:

- `test/docs/maintenance.test.ts` and `test/cli/init.test.ts` import
  `loadCodeowners`/`ownersOf`/`parseCodeowners` from `@esliph/ownership`.
- `test/plugin/manifest.test.ts`: in `SKILL_REFERENCES`, the checkout entry
  comes to read `.ownership.yml`.
- `test/plugin/wrapper-docker.test.ts`, `'RNF-0006: …'`: rename it to
  `'RNF-0006: .ownership.yml covers bin/dev in watches, marked visible to the consumer'`;
  replace `loadOwnership(ROOT)` with `loadLivingDocsConfig(ROOT)` and the two
  assertions on `config.consumerVisiblePaths` with
  `picomatch(config.watches.filter(w => w.consumerVisible).map(w => w.code))`.
- `test/distribution/plugin-cache.test.ts`: the fixture's `OWNERSHIP` becomes v2,
  written to the project's `.ownership.yml` (the `mkdirSync` of `docs/` goes away).
- `test/acceptance/spec-criteria.test.ts`:
  - `'criterion 6: HK-2 denies editing the generated contract, and CI-5 fails if it gets through another way'`:
    the `runDrift` half comes to run
    `coreChecks().find(c => c.id === 'ownership/generated-drift')!` over
    `resolveOwnership(root)!` (as in step 3.8, item 9). The `HK-2` half
    stays.
  - `'Phase 6 mechanism: a change visible to the consumer is enforced, and the written reason releases it'`:
    `runChangelog` becomes
    `diffChecks({ base, changed, messages }).find(c => c.id === 'ownership/consumer-change-logged')!`
    over `resolveOwnership(root)!`, with the same `changed` and `messages` that the
    test's `GitRunner` returned.
  - `'criterion 5, half 2: CI signals through \`watches\`, and the written reason releases it'`:
    likewise with `ownership/watch-satisfied`.
  - The others only change fixture.
  - Add, right after `'this repository passes its own checks'`
    (Review Focus 4):

```ts
test('this repository passes the core checks — including with what only exists in the local checkout', () => {
  const root = checkoutRoot()
  const config = resolveOwnership(root)

  assert.ok(config !== null, 'the checkout declares the ownership file at the root')
  const findings = coreChecks().flatMap(check => check.run({ root, config, today: '2026-09-28' }))

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})
```

    with `import { coreChecks, diffChecks, resolveOwnership } from '@esliph/ownership'`
    at the top. `coreChecks()` with no argument uses the real executor, and runs the
    real generator — it is the same dogfooding as `contracts/drift.test.ts`.

Run, after each group of files:

```bash
cd packages/living-docs && node --conditions=development --test <files of the group>; cd ../..
```

A test that changes **result**, and not only fixture, is a defect of the adoption:
stop and investigate before touching the assertion. The expected exceptions are only
those listed in steps 3.4, 3.5, 3.6 and 3.8.

- [ ] **Step 3.13: Generated contract with the two plugins**

`packages/living-docs/src/checks/catalog.ts`: delete the `CI-5` and
`CI-6` entries, and replace the `failsWhen` of `CI-1` and of `CI-7` with:

```ts
    failsWhen:
      'Frontmatter missing or invalid; empty required field; `id` outside the format or the territory of the artifact; `status` in an artifact with no declared `states`; collection item without `status`; `trigger` missing or describing a cadence; `last-reviewed` outside the ISO format.',
```

```ts
    failsWhen:
      'Agent contract repeating a sentence of an owning artifact; Definition of Done item without a named verification; and, with `--base <ref>`, a path claimed by an open decision — released by `Docs: none — <reason>`.',
```

Update the file's header comment: the core catalog lives in
`@esliph/ownership` (`CORE_CHECK_CATALOG`).

Replace `packages/living-docs/src/tools/gen-checks.ts` from the
`import` on with:

```ts
import { CORE_CHECK_CATALOG } from '@esliph/ownership'
import type { CatalogEntry } from '@esliph/ownership'
import { CHECK_CATALOG } from '../checks/catalog.ts'

const HEADER = `<!-- generated: do not edit -->
<!-- source: src/checks/catalog.ts (CHECK_CATALOG) and the core catalog (CORE_CHECK_CATALOG) — regenerate: run this file with node --conditions=development -->

# Checks contract

The identifiers below are public and stable: they appear in the CLI output, are
cited by the Definition of Done of whoever uses the toolkit, and do not change
meaning (\`docs/contracts/versioning-policy.md\`). Each rule runs in a single plugin.
`

/** `|` in a cell would break the table — escaping is the generator's job, not the writer's. */
function cell(value: string): string {
  return value.replaceAll('|', '\\|')
}

function section(plugin: string, catalog: readonly CatalogEntry[]): string {
  const rows = catalog.map(entry => `| ${cell(entry.id)} | ${cell(entry.name)} | ${cell(entry.failsWhen)} | \`${cell(entry.command)}\` |`)

  return [`## ${plugin}`, '', '| ID | Check | Fails when | Command |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

process.stdout.write(`${HEADER}\n${section('living-docs', CHECK_CATALOG)}\n\n${section('ownership', CORE_CHECK_CATALOG)}\n`)
```

Keep the block comment at the top of the file, adding that the output
covers the two plugins. `CHECK_CATALOG` and `CORE_CHECK_CATALOG` have the same shape
(`id`, `name`, `command`, `failsWhen`); if `typecheck` complains about the living-docs
type, type `section` with `readonly { id: string; name: string; command: string; failsWhen: string }[]`.

Regenerate through the sanctioned route (redirection in Bash — the generated-file guard denies
Edit/Write on the file, and that is expected):

```bash
node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
git diff --stat docs/contracts/checks.gen.md
```

Expected: without `CI-5`/`CI-6`, with the `## ownership` section of six rows.

- [ ] **Step 3.14: Single rule (§8)**

Create `packages/living-docs/test/distribution/single-rule.test.ts`. The expected IDs
on the living-docs side are today's; Task 5 swaps them for the
names.

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coreChecks, diffChecks, resolveOwnership } from '@esliph/ownership'
import type { Finding as CoreFinding } from '@esliph/ownership'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { validateChecks } from '../../src/checks/registry.ts'
import type { Finding } from '../../src/core/types.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const TODAY = '2026-09-28'

function coreFindings(root: string, diff: { base: string; changed: string[]; messages: string[] }): CoreFinding[] {
  const config = resolveOwnership(root)!
  const context = { root, config, today: TODAY }

  return [...coreChecks(() => 'generator output\n'), ...diffChecks(diff)].flatMap(check => check.run(context))
}

function livingDocsFindings(root: string, diff: { base: string; changed: string[]; messages: string[] }): Finding[] {
  const config = loadLivingDocsConfig(root)
  const context = { root, config, docs: collectArtifacts(root, config), documents: collectDocuments(root, config), today: TODAY }

  return validateChecks({ ...diff, edits: [] }).flatMap(check => check.run(context))
}

const BASE_OWNED = `version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: '@time'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: docs/definition-of-done.md
    owner: '@time'
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
  - path: CHANGELOG.md
    owner: '@time'
    living-docs: { audience: external }
  - path: .ownership.yml
    owner: '@time'
    living-docs: {}
  - path: CODEOWNERS
    owner: '@time'
  - path: out.md
    owner: '@time'
`

const ADR_OK = "---\nid: ADR-0001\ntitle: Decision\nstatus: draft\nowner: '@time'\ntrigger: Never.\nlast-reviewed: 2026-09-01\nrelates-to: []\n---\n\n# ADR-0001\n"

test('each moved rule is reported by the core, and living-docs stays quiet about it', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `${BASE_OWNED}generated:
  - path: out.md
    command: gen
watches:
  - code: 'src/**'
    doc: CHANGELOG.md
    consumer-visible: true
`,
      CODEOWNERS: 'docs/ @time\nCHANGELOG.md @time\n.ownership.yml @time\nCODEOWNERS @time\nout.md @time\n',
      // declared-state: status outside states; owner without @.
      'docs/decisions/adr/ADR-0001-a.md': ADR_OK.replace('status: draft', 'status: approved').replace("owner: '@time'", 'owner: time'),
      'docs/definition-of-done.md': "---\ntitle: DoD\nowner: '@time'\ntrigger: When what counts as done changes.\nlast-reviewed: 2026-09-01\n---\n\n- [ ] Something — verification: human.\n",
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
      // generated-drift: differs from the generator's output.
      'out.md': 'edited by hand\n',
      // owner-coverage: a file without an owner.
      'solto.txt': 'x\n',
      'src/a.ts': 'export {}\n',
    },
    root => {
      // watch-satisfied and consumer-change-logged: the diff touches src/ without the CHANGELOG.
      const diff = { base: 'main', changed: ['src/a.ts'], messages: ['feat: x'] }
      const core = new Set(coreFindings(root, diff).map(finding => finding.ruleId))

      for (const rule of ['ownership/declared-state', 'ownership/generated-drift', 'ownership/owner-coverage', 'ownership/watch-satisfied', 'ownership/consumer-change-logged']) {
        assert.ok(core.has(rule), `${rule} should report the planted violation`)
      }

      // Living-docs may find other things in this fixture (it is not an
      // exemplary repository); it may not find anything where the moved violations
      // were planted. Lines 4 and 5 of the ADR are `status` and `owner`.
      const living = livingDocsFindings(root, diff)
      const plantados = new Set(['out.md', 'solto.txt', 'src/a.ts', 'CHANGELOG.md'])

      assert.deepEqual(
        living.filter(finding => plantados.has(finding.file)),
        [],
        'living-docs may not report what belongs to the core',
      )
      assert.deepEqual(
        living.filter(finding => finding.file === 'docs/decisions/adr/ADR-0001-a.md' && (finding.line === 4 || finding.line === 5)),
        [],
        'status outside states and owner without @ belong to ownership/declared-state',
      )
    },
  )
})

test('each rule that stayed is reported by living-docs, and the core stays quiet about it', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `${BASE_OWNED}`,
      CODEOWNERS: 'docs/ @time\nCHANGELOG.md @time\n.ownership.yml @time\nCODEOWNERS @time\nout.md @time\n',
      'out.md': 'x\n',
      // frontmatter: a trigger with a cadence.
      'docs/decisions/adr/ADR-0001-a.md': ADR_OK.replace('trigger: Never.', 'trigger: Review monthly.'),
      // done-verifiable: an item without a named verification.
      'docs/definition-of-done.md': "---\ntitle: DoD\nowner: '@time'\ntrigger: When what counts as done changes.\nlast-reviewed: 2026-09-01\n---\n\n- [ ] Something with no one to verify it.\n",
      // external-audience and links: an artifact ID and a broken link in external text.
      'CHANGELOG.md': '# Changelog\n\nSee ADR-0001 and [this](does-not-exist.md).\n',
    },
    root => {
      const diff = { base: 'main', changed: [], messages: [] }
      const living = new Set(livingDocsFindings(root, diff).map(finding => finding.ruleId))

      for (const rule of ['CI-1', 'CI-7', 'CI-8', 'CI-11']) {
        assert.ok(living.has(rule), `${rule} should report the planted violation`)
      }
      assert.deepEqual(
        coreFindings(root, diff).map(finding => finding.ruleId),
        [],
        'the core may not report what belongs to living-docs',
      )
    },
  )
})
```

The list of rules that stayed, in the second test, is the one that a small fixture
triggers without git (`CI-1`, `CI-7`, `CI-8`, `CI-11`). `CI-2`, `CI-3`, `CI-4`,
`CI-9` and `CI-10` each already have their own test that proves that only that rule reports
what it plants; adding them here proves nothing new about the split.

Run:

```bash
cd packages/living-docs && node --conditions=development --test test/distribution/single-rule.test.ts; cd ../..
```

Expected: it passes. If the first test reports a leak, the living-docs check
that still reports the moved rule is the one that step 3.8 forgot to prune. If the
second reports a core finding, the fixture has a file without an owner: fix the
fixture, not the check.

- [ ] **Step 3.15: This repository's workflow**

Replace the check steps of `.github/workflows/living-docs.yml` (everything
after `Type-check`) with:

```yaml
      - name: Owner, lifecycle and generated artifact
        run: node --conditions=development packages/ownership/src/cli/index.ts validate

      - name: Living documentation — state of the tree
        run: node --conditions=development packages/living-docs/src/cli/index.ts validate

      # The diff only exists with a base. On `push` there is no base, and inventing one
      # would produce a finding about a change that is not this branch's.
      - name: Code→doc link and CHANGELOG entry on the PR diff
        if: github.event_name == 'pull_request'
        run: node --conditions=development packages/ownership/src/cli/index.ts validate --base ${{ github.event.pull_request.base.sha }}

      - name: Living documentation on the PR diff
        if: github.event_name == 'pull_request'
        run: node --conditions=development packages/living-docs/src/cli/index.ts validate --base ${{ github.event.pull_request.base.sha }}
```

And the `fetch-depth` comment comes to say "the diff half compares
`<base>...HEAD`; a shallow clone does not have the base".

- [ ] **Step 3.16: Whole suite, validates, CHANGELOG, commit**

```bash
npm ci
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
git hash-object docs/contracts/checks.gen.md
```

Expected:

- **Core: 200** tests, 0 failures.
- **Living-docs: 493** tests, 0 failures, 1 `todo`. The count, from the 554 of
  Task 2:

  | Movement | Δ |
  | --- | --- |
  | `test/config/ownership.test.ts` rewritten (28 → 14) | −14 |
  | deleted: `ci5` (6), `ci6` (10), `cli/drift` (4), `cli/changelog` (4), `config/codeowners` (4), `docs/table` (6), `docs/sections` (6) | −40 |
  | `docs/schema.test.ts` (embedded machine) | −3 |
  | `ci1-structure` (status outside states) | −1 |
  | `ci7-ownership-coverage` (the moved halves) | −6 |
  | `docs/release-history` (the two lists) | −1 |
  | `cli/validate` (link in the diff) | −1 |
  | `docs/corpus` (`docsRoot`) | −1 |
  | `docs/collect` (Review Focus 3) | +2 |
  | `cli/init` (Review Focus 1) | +1 |
  | `acceptance/spec-criteria` (Review Focus 4) | +1 |
  | `distribution/single-rule` | +2 |
  | **Total** | **−61** |

  554 − 61 = **493**. If the measured number is different, each difference needs a
  written explanation in the commit; an unexplained difference is a defect (§8).
- `ownership validate` and `living-docs validate` exit with 0.
- The hash of `checks.gen.md` changed (on purpose: `CI-5`/`CI-6` left and the core
  section came in). Check the content with `git diff`.

`CHANGELOG.md` (skill `release-historian`), without an artifact ID:

- `Changed`: "the ownership file comes to live at the root (`.ownership.yml`) and
  to be read in the v2 schema: an `owned` list, with the `living-docs:` block in each
  living-documentation entry and at the top for global configuration. The v1 schema
  is not read, and there is no migration command — rewrite the file following
  `templates/ownership.yml`"; "`living-docs init` seeds v2 at the root, and does not
  write a new file when one already exists".
- `Removed`: "`living-docs drift` and `living-docs changelog`: generated-artifact
  drift and the CHANGELOG entry come to be verified by
  `ownership validate` (`--base <ref>` for the diff)"; "`consumer-visible-paths`:
  the `consumer-visible: true` mark on the `watches` rules is the list".
- `Changed`: "`living-docs validate` stops verifying the owner of each
  document, CODEOWNERS, the `watches` link, the frontmatter `owner` and the
  `status` outside the declared states — all of that belongs to `ownership validate`".

```bash
git add -A packages .ownership.yml docs/.ownership.yml CODEOWNERS .github docs/contracts/checks.gen.md CHANGELOG.md
git status --short
git commit -m "$(cat <<'EOF'
feat(ADR-0029): living-docs reads v2 through the core and hands it the core's rules

.ownership.yml goes to the root in v2. src/config/ownership.ts becomes the
adapter of the living-docs block over resolveOwnership. CI-5, CI-6, drift,
changelog, the part of CI-1 and CI-7 that the core already has, and the item
parsers leave living-docs. HK-3 pairs through findTransitions. The cases the
core did not cover were ported before the removal.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Plugins, hooks and CI

The living-docs hooks that the core takes over leave **in the same commit** in which the
`ownership` plugin becomes installable (§8, item 4): no commit is left without
the guards.

**Files:**
- Modify: `.claude-plugin/marketplace.json`, `packages/living-docs/.claude-plugin/plugin.json`, `packages/living-docs/hooks/hooks.json`
- Delete: `packages/living-docs/src/hooks/hk2-generated-artifact.ts`, `hk4-watch-reminder.ts`, `hk5-commit-guard.ts`, `packages/living-docs/src/config/watches.ts`, and the tests `test/hooks/hk2-generated-artifact.test.ts`, `test/hooks/hk4-watch-reminder.test.ts`, `test/hooks/hk5-commit-guard.test.ts`, `test/config/watches.test.ts`
- Create: `packages/ownership/test/distribution/plugin-cache.test.ts`
- Modify: `packages/living-docs/test/plugin/manifest.test.ts`, `packages/living-docs/test/acceptance/spec-criteria.test.ts`, `packages/living-docs/test/distribution/plugin-cache.test.ts`
- Modify: `packages/living-docs/src/cli/index.ts`, `packages/living-docs/src/cli/init.ts`, `packages/living-docs/templates/workflow.yml`, `packages/living-docs/src/config/claude-settings.ts`, `packages/living-docs/test/cli/init-enforcement.test.ts`, `packages/living-docs/test/config/claude-settings.test.ts`
- Modify (skill `release-historian`): `CHANGELOG.md`

**Interfaces:**
- Produces: `InitOptions.invokeOwnership: string` (default `'npx ownership'`) and the
  placeholder `{{INVOKE_OWNERSHIP}}` in the workflow template.
- Produces: `CORE_PLUGIN_REF = 'ownership@living-docs'` in
  `src/config/claude-settings.ts` (the suffix is the `MARKETPLACE_NAME` that already exists).
- The living-docs `hooks.json` is left with five hooks: `hk1-append-only`,
  `hk3-state-promotion`, `hk8-open-decision-guard` (PreToolUse `Edit|Write`),
  `hk7-shortcut-debt` (PostToolUse `Edit|Write`), `hk6-session-inventory`
  (SessionStart). The PreToolUse `Bash` group goes away.
- `src/git/staged.ts` stays (§5: `git/` stays on purpose), even without `HK-5`.

- [ ] **Step 4.1: Test of hooks without overlap (red)**

In `packages/living-docs/test/plugin/manifest.test.ts`:

1. In the test `'hooks.json registers the eight hooks…'`, rename it to
   `'hooks.json registers the five living-docs hooks on the events and matchers of spec §7'`
   and replace `esperado` with:

```ts
  const esperado: Record<string, string[]> = {
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk3-state-promotion', 'hk8-open-decision-guard'],
    'PostToolUse:Edit|Write': ['hk7-shortcut-debt'],
    // SessionStart has no matcher: the event is not a tool event (spec §7).
    SessionStart: ['hk6-session-inventory'],
  }
```

2. In `'every referenced hook exists in the repository'`, `assert.equal(vistos, 8, …)`
   becomes `assert.equal(vistos, 5, 'the sweep should see the five hooks')`.

3. Add:

```ts
function hookNames(pluginRoot: string): string[] {
  const config = JSON.parse(readFileSync(join(pluginRoot, 'hooks/hooks.json'), 'utf8')) as { hooks: Record<string, { hooks: { command: string }[] }[]> }

  return Object.values(config.hooks).flatMap(grupos => grupos.flatMap(grupo => grupo.hooks.map(hook => hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? '')))
}

test('the two plugins register no hook in common — each guard runs in a single plugin', () => {
  const living = hookNames(ROOT)
  const core = hookNames(join(ROOT, '..', 'ownership'))

  assert.ok(core.length >= 3, 'the sweep should see the core hooks')
  assert.deepEqual(
    living.filter(name => core.includes(name)),
    [],
  )
  for (const assumido of ['generated', 'watch-reminder', 'commit-guard']) {
    assert.ok(!living.some(name => name.includes(assumido)), `living-docs may no longer register the ${assumido} hook: it belongs to the core`)
  }
})

test('living-docs declares the ownership plugin as a dependency, and the marketplace publishes both', () => {
  const manifest = readJson('.claude-plugin/plugin.json')
  const marketplace = JSON.parse(readFileSync(join(CHECKOUT, '.claude-plugin/marketplace.json'), 'utf8')) as { plugins: { name: string; source: string; version: string }[] }
  const core = JSON.parse(readFileSync(join(ROOT, '..', 'ownership', '.claude-plugin/plugin.json'), 'utf8')) as { version: string }

  assert.deepEqual(manifest.dependencies, ['ownership'])
  assert.deepEqual(
    marketplace.plugins.map(plugin => plugin.name).sort(),
    ['living-docs', 'ownership'],
  )
  const entry = marketplace.plugins.find(plugin => plugin.name === 'ownership')!

  assert.equal(entry.source, './packages/ownership')
  assert.equal(entry.version, core.version)
})
```

Run `cd packages/living-docs && npm test -- --test-name-pattern="hooks|dependency"; cd ../..`:
the four fail.

- [ ] **Step 4.2: Manifests and marketplace**

`.claude-plugin/marketplace.json`, in `plugins`, after `living-docs`:

```json
    {
      "name": "ownership",
      "description": "Owner, lifecycle and trigger of each path: the core that living documentation uses, and that runs on its own.",
      "version": "0.1.0",
      "source": "./packages/ownership"
    }
```

and the `living-docs` description comes to say "five hooks" in place of "eight
hooks".

`packages/living-docs/.claude-plugin/plugin.json`: add
`"dependencies": ["ownership"]`.

`packages/living-docs/hooks/hooks.json`: delete the entries of
`hk2-generated-artifact`, `hk4-watch-reminder` and the whole PreToolUse `Bash`
group (it only had `hk5-commit-guard`).

- [ ] **Step 4.3: Delete the taken-over hooks**

Before deleting, check each case against the table "Comparison of the removed
tests" (the ports already came in with Task 3).

```bash
git rm packages/living-docs/src/hooks/hk2-generated-artifact.ts packages/living-docs/src/hooks/hk4-watch-reminder.ts packages/living-docs/src/hooks/hk5-commit-guard.ts packages/living-docs/src/config/watches.ts
git rm packages/living-docs/test/hooks/hk2-generated-artifact.test.ts packages/living-docs/test/hooks/hk4-watch-reminder.test.ts packages/living-docs/test/hooks/hk5-commit-guard.test.ts packages/living-docs/test/config/watches.test.ts
git grep -n "hk2-generated-artifact\|hk4-watch-reminder\|hk5-commit-guard\|config/watches" -- packages/living-docs
```

Expected from the last command: only `test/acceptance/spec-criteria.test.ts`
(step 4.4) and `test/distribution/plugin-cache.test.ts` (step 4.5).

- [ ] **Step 4.4: Acceptance criteria without the taken-over hooks**

In `packages/living-docs/test/acceptance/spec-criteria.test.ts`:

- delete the imports of `decideHk2`, `decideHk4`, `decideHk5`;
- delete `'criterion 5: changing a watched path without touching the owning doc is reminded and asked about'`
  (entirely a hook matter; the core proves the reminder and the question in
  `watch-reminder.test.ts` and `commit-guard.test.ts`, see the comparison);
- in `'criterion 6: …'`, delete the `HK-2` half and rename it to
  `'criterion 6: the generated contract edited from outside fails in the core'`.

- [ ] **Step 4.5: Cache of the two plugins**

In `packages/living-docs/test/distribution/plugin-cache.test.ts`, the control's
hook comes to be `hk1-append-only` (`hk4` no longer exists), with the
payload `{ tool_name: 'Edit', tool_input: { file_path: 'docs/decisions/adr/ADR-0001.md' } }`.
The control keeps asserting silence and `exit 0`.

Create `packages/ownership/test/distribution/plugin-cache.test.ts`, a mirror of the
living-docs original, which here **really passes** (§6):

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'

/**
 * Simulation of the marketplace cache: Claude Code copies only the plugin's
 * directory, installs dependencies from the lockfile that is in it and runs the
 * hooks from there. The core depends on no sibling package, and that is why it
 * works alone in the cache.
 */
const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

const OWNERSHIP = [
  'version: 2',
  'owned:',
  '  - path: docs/requirements/rules.md',
  "    owner: '@time'",
  'watches:',
  "  - code: 'src/domain/**'",
  '    doc: docs/requirements/rules.md',
  "    reason: 'new behavior requires a rule before the code'",
  '',
].join('\n')

const PAYLOAD = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'src/domain/refund.ts' } })

/** On Windows, the `bash` on the PATH may be WSL's; Claude Code uses Git for Windows'. */
function bashExecutable(): string | null {
  if (process.platform !== 'win32') {
    return 'bash'
  }
  const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')

  return existsSync(candidate) ? candidate : null
}

function copyVersioned(to: string): number {
  const files = execFileSync('git', ['ls-files', '-z', '--', '.'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(file => file !== '')

  for (const file of files) {
    mkdirSync(dirname(join(to, file)), { recursive: true })
    copyFileSync(join(PACKAGE_ROOT, file), join(to, file))
  }

  return files.length
}

function runHook(bash: string, cache: string, project: string): { status: number | null; stdout: string; stderr: string } {
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: project }

  delete env.OWNERSHIP_REPO_ROOT
  delete env.NODE_OPTIONS

  const script = join(cache, 'hooks', 'run-hook.sh').split(sep).join('/')
  const run = spawnSync(bash, [script, 'watch-reminder'], { cwd: project, env, input: PAYLOAD, encoding: 'utf8' })

  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

test('the core hooks wrapper reaches whoever installs as an executable', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('copied alone to the cache, the core plugin installs and the hook responds from there', { timeout: 180_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('without the Git for Windows bash: CI (ubuntu) runs this proof')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'ownership-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'ownership-project-'))

  try {
    assert.ok(copyVersioned(cache) > 30, 'copy too empty: the cache did not receive the plugin')
    assert.equal(existsSync(join(cache, 'node_modules')), false)
    writeFileSync(join(project, '.ownership.yml'), OWNERSHIP, 'utf8')

    // Control: without dependencies the hook breaks and, by contract, goes quiet.
    const semDependencias = runHook(bash, cache, project)

    assert.equal(semDependencias.status, 0, 'fails open: exit 0 even when broken')
    assert.equal(semDependencias.stdout.trim(), '', 'without node_modules the hook should go quiet')

    const install = spawnSync('npm', ['ci', '--ignore-scripts'], { cwd: cache, encoding: 'utf8', shell: true })

    assert.equal(install.status, 0, install.stderr)

    const run = runHook(bash, cache, project)

    assert.equal(run.status, 0, run.stderr)
    assert.notEqual(run.stdout.trim(), '', 'empty output is what a broken hook also produces: it is not success')

    const output = JSON.parse(run.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } }

    assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse')
    assert.match(output.hookSpecificOutput.additionalContext, /docs\/requirements\/rules\.md/)
  } finally {
    rmSync(cache, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})
```

`--ignore-scripts` on `npm ci`: the core's `prepack` compiles `dist/`, and the cache
runs `.ts` directly — no lifecycle script is needed. If the output of the
core's hook has a shape other than `hookSpecificOutput.additionalContext`,
read `packages/ownership/src/hooks/lib/io.ts` and adjust the assertion to the real shape;
what the test proves is that the hook responded from the cache.

Run `cd packages/ownership && node --test test/distribution/plugin-cache.test.ts; cd ../..`:
it passes (on Windows without the Git bash, the second one is `skip`).

- [ ] **Step 4.6: `init` with the two CLIs and the core's registration**

1. `packages/living-docs/templates/workflow.yml`: before the fixed step of
   living-docs, add

```yaml
      - name: Owner, lifecycle and generated artifact
        run: {{INVOKE_OWNERSHIP}} validate

```

   and the header comment comes to say that `--invoke` and
   `--invoke-ownership` choose how each CLI is called.

2. `src/cli/init.ts`: `InitOptions` gains

```ts
  /** How the core CLI is called in the CI of whoever installs. Default `npx ownership` (TDR-0003). */
  invokeOwnership: string
```

   `values` gains `INVOKE_OWNERSHIP: options.invokeOwnership`, and
   `workflowSteps(stage, invoke)` becomes `workflowSteps(stage, invoke, invokeOwnership)`,
   with the phase 6 branch back, now over the core:

```ts
  if (phases.includes(6)) {
    steps.push(
      [
        '',
        '      - name: Code→doc link and CHANGELOG entry on the PR diff',
        "        if: github.event_name == 'pull_request'",
        `        run: ${invokeOwnership} validate --base \${{ github.event.pull_request.base.sha }}`,
      ].join('\n'),
    )
  }
```

   The phase 7 branch (`${invoke} validate --base …`) stays, with the name
   `Living documentation on the PR diff`.

3. `src/cli/index.ts`: right after the `--invoke` block,

```ts
      const invokeOwnershipIndex = argv.indexOf('--invoke-ownership')
      const invokeOwnership = invokeOwnershipIndex === -1 ? 'npx ownership' : (argv[invokeOwnershipIndex + 1] ?? '')

      if (invokeOwnership.trim() === '') {
        process.stderr.write('living-docs: `--invoke-ownership` needs the command that runs the core CLI in your CI — it is not guessed.\n')

        return 2
      }
```

   pass `invokeOwnership` to `runInit`, and add to the `USAGE`, after
   `--invoke`:
   `  --invoke-ownership <command>  How the core CLI is called in CI (default: npx ownership)`.

   Every `runInit(root, { … })` in the tests gains `invokeOwnership: 'npx ownership'`.

4. `src/config/claude-settings.ts`:

```ts
/** The core plugin: living-docs depends on it, and the owner guards live there. */
export const CORE_PLUGIN_REF = `ownership@${MARKETPLACE_NAME}`
```

   and, in `mergeSettings`, after the `PLUGIN_REF` block, the same block for
   `CORE_PLUGIN_REF`.

5. Tests, in `test/cli/init-enforcement.test.ts`:

```ts
test('RF-0013: the seeded workflow runs the two CLIs, each through its own invocation command', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'production', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'pnpm ownership', marketplace: null })
    const workflow = readFileSync(join(root, WORKFLOW_PATH), 'utf8')

    assert.match(workflow, /run: pnpm ownership validate\n/)
    assert.match(workflow, /run: pnpm ownership validate --base /)
    assert.match(workflow, /run: npx living-docs validate\n/)
    assert.doesNotMatch(workflow, /drift|changelog/)
  })
})
```

   (import whatever is missing), and in `test/config/claude-settings.test.ts`, in the test
   that asserts what `mergeSettings` adds to an empty file, add the
   assertion `enabledPlugins["ownership@living-docs"] === true`.

- [ ] **Step 4.7: Enable the core plugin in the session (human)**

No versioned file in this repository enables a plugin (`.claude/` is not
versioned). Ask the person to enable `ownership@esliph` alongside
`living-docs@esliph` in their Claude Code settings, before the commit
of this step — that is what keeps the generated, reminder and commit guards active
when the living-docs hooks leave. Do not proceed without confirmation.

- [ ] **Step 4.8: Suite, validates, CHANGELOG, commit**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail|skipped)"
npm run typecheck
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
```

Expected:

- **Core: 202** (200 + the two of cache), 0 failures.
- **Living-docs: 459**, 0 failures, 1 `todo`: 493 − 10 (`hk2`) − 7 (`hk4`) − 10
  (`hk5`) − 9 (`config/watches`) − 1 (criterion 5) + 2 (manifest) + 1
  (workflow with the two CLIs). `claude-settings.test.ts` gains an assertion, not a
  test.

`CHANGELOG.md`, no ID:

- `Added`: "`ownership` plugin in the marketplace: owner, lifecycle, generated
  artifact and code→doc link, with its own hooks"; "`living-docs init
  --invoke-ownership <command>`: how the core CLI is called in the installed
  workflow (default `npx ownership`, which only works after the core is
  published on npm)".
- `Changed`: "the `living-docs` plugin comes to depend on the `ownership` plugin, and
  stops registering the hooks for generated artifact, watched-path reminder
  and commit guard — they live in `ownership`"; "the installed workflow runs
  `ownership validate` and `living-docs validate`, and, on a PR, both with `--base`";
  "`living-docs init --marketplace` enables both plugins".

```bash
git add -A packages .claude-plugin CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat(ADR-0030): core hooks in the ownership plugin, and living-docs depends on it

The marketplace publishes the ownership plugin. Living-docs declares the
dependency and stops registering HK-2, HK-4 and HK-5 in the same commit. init
seeds the two CLIs, with --invoke-ownership. The core plugin proves that it
responds from the cache.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Renaming

Mechanical (§7): same findings, only the identifier changes. The only part that is not
text substitution is splitting the rest of `CI-7` into three checks.

**Files:**
- Move (`git mv`), in `packages/living-docs/`:

  | From | To |
  | --- | --- |
  | `src/checks/ci1-structure.ts` | `src/checks/frontmatter.ts` |
  | `src/checks/ci2-ids.ts` | `src/checks/id-integrity.ts` |
  | `src/checks/ci3-traceability.ts` | `src/checks/citation-coverage.ts` |
  | `src/checks/ci4-staleness.ts` | `src/checks/staleness.ts` |
  | `src/checks/ci7-ownership-coverage.ts` | `src/checks/agent-contract-duplication.ts` |
  | `src/checks/ci8-links.ts` | `src/checks/links.ts` |
  | `src/checks/ci9-commit-discipline.ts` | `src/checks/commit-discipline.ts` |
  | `src/checks/ci10-trigger-routing.ts` | `src/checks/trigger-routing.ts` |
  | `src/checks/ci11-external-audience.ts` | `src/checks/external-audience.ts` |
  | `src/hooks/hk1-append-only.ts` | `src/hooks/append-only.ts` |
  | `src/hooks/hk3-state-promotion.ts` | `src/hooks/state-promotion.ts` |
  | `src/hooks/hk6-session-inventory.ts` | `src/hooks/session-inventory.ts` |
  | `src/hooks/hk7-shortcut-debt.ts` | `src/hooks/shortcut-debt.ts` |
  | `src/hooks/hk8-open-decision-guard.ts` | `src/hooks/open-decision-guard.ts` |

  and the `.test.ts` of each one, from `test/checks/` and `test/hooks/`, the same way.
- Create: `src/checks/done-verifiable.ts`, `src/checks/open-decision-claim.ts`, `test/checks/done-verifiable.test.ts`, `test/checks/open-decision-claim.test.ts`
- Modify: every versioned file of `packages/living-docs/` that cites the old names (step 5.2 finds them)
- Modify: `docs/contracts/checks.gen.md` (regenerated)
- Modify (skill `release-historian`): `CHANGELOG.md`

**Interfaces:**
- Identifier map (the source of truth for this task and for the CHANGELOG):

  | Old | New | Export |
  | --- | --- | --- |
  | `CI-1` | `living-docs/frontmatter` | `livingDocsFrontmatter` |
  | `CI-2` | `living-docs/id-integrity` | `livingDocsIdIntegrity` |
  | `CI-3` | `living-docs/citation-coverage` | `livingDocsCitationCoverage` |
  | `CI-4` | `living-docs/staleness` | `livingDocsStaleness` |
  | `CI-7` (contract) | `living-docs/agent-contract-duplication` | `livingDocsAgentContractDuplication` |
  | `CI-7` (DoD) | `living-docs/done-verifiable` | `livingDocsDoneVerifiable` |
  | `CI-7` (open decision) | `living-docs/open-decision-claim` | `livingDocsOpenDecisionClaim(diff)` |
  | `CI-8` | `living-docs/links` | `livingDocsLinks` |
  | `CI-9` | `living-docs/commit-discipline` | `livingDocsCommitDiscipline(facts)` |
  | `CI-10` | `living-docs/trigger-routing` | `livingDocsTriggerRouting()` |
  | `CI-11` | `living-docs/external-audience` | `livingDocsExternalAudience` |
  | `HK-1` | `living-docs/append-only` | `decideAppendOnly` |
  | `HK-3` | `living-docs/state-promotion` | `decideStatePromotion` |
  | `HK-6` | `living-docs/session-inventory` | `decideSessionInventory` |
  | `HK-7` | `living-docs/shortcut-debt` | `decideShortcutDebt` |
  | `HK-8` | `living-docs/open-decision-guard` | `decideOpenDecisionGuard` |
  | `CI-5` | `ownership/generated-drift` | — (core) |
  | `CI-6` | `ownership/consumer-change-logged` | — (core) |
  | `HK-2` | `ownership/generated-guard` | — (core) |
  | `HK-4` | `ownership/watch-reminder` | — (core) |
  | `HK-5` | `ownership/commit-guard` | — (core) |

  The decision types follow the export: `Hk1Decision` → `AppendOnlyDecision`,
  `Hk3Decision` → `StatePromotionDecision`, `Hk6Decision` →
  `SessionInventoryDecision`, `Hk7Decision` → `ShortcutDebtDecision`,
  `Hk8Decision` → `OpenDecisionGuardDecision`.
- `validateChecks(diff)` returns, in this order: frontmatter, id-integrity,
  citation-coverage, staleness, agent-contract-duplication, done-verifiable,
  open-decision-claim(diff), links, commit-discipline(diff), trigger-routing(),
  external-audience.

- [ ] **Step 5.1: Move the files**

```bash
cd packages/living-docs
for pair in \
  "checks/ci1-structure:checks/frontmatter" "checks/ci2-ids:checks/id-integrity" \
  "checks/ci3-traceability:checks/citation-coverage" "checks/ci4-staleness:checks/staleness" \
  "checks/ci7-ownership-coverage:checks/agent-contract-duplication" "checks/ci8-links:checks/links" \
  "checks/ci9-commit-discipline:checks/commit-discipline" "checks/ci10-trigger-routing:checks/trigger-routing" \
  "checks/ci11-external-audience:checks/external-audience" "hooks/hk1-append-only:hooks/append-only" \
  "hooks/hk3-state-promotion:hooks/state-promotion" "hooks/hk6-session-inventory:hooks/session-inventory" \
  "hooks/hk7-shortcut-debt:hooks/shortcut-debt" "hooks/hk8-open-decision-guard:hooks/open-decision-guard"; do
  from="${pair%%:*}"; to="${pair##*:}"
  git mv "src/$from.ts" "src/$to.ts"
  git mv "test/$from.test.ts" "test/$to.test.ts"
done
cd ../..
```

- [ ] **Step 5.2: Replace the identifiers**

The longest patterns first, so that `CI-1` does not eat `CI-10`. Only in
versioned files of `packages/living-docs/` (the historical record in
`docs/` does not change, §7; the living documents belong to Task 6):

```bash
FILES=$(git ls-files packages/living-docs | grep -v 'package-lock.json$')
sed -i -E \
  -e 's#\bci10-trigger-routing\b#trigger-routing#g; s#\bci11-external-audience\b#external-audience#g' \
  -e 's#\bci1-structure\b#frontmatter#g; s#\bci2-ids\b#id-integrity#g; s#\bci3-traceability\b#citation-coverage#g' \
  -e 's#\bci4-staleness\b#staleness#g; s#\bci8-links\b#links#g; s#\bci9-commit-discipline\b#commit-discipline#g' \
  -e 's#\bhk1-append-only\b#append-only#g; s#\bhk3-state-promotion\b#state-promotion#g; s#\bhk6-session-inventory\b#session-inventory#g' \
  -e 's#\bhk7-shortcut-debt\b#shortcut-debt#g; s#\bhk8-open-decision-guard\b#open-decision-guard#g' \
  -e 's#\bci10TriggerRouting\b#livingDocsTriggerRouting#g; s#\bci11ExternalAudience\b#livingDocsExternalAudience#g' \
  -e 's#\bci1Structure\b#livingDocsFrontmatter#g; s#\bci2Ids\b#livingDocsIdIntegrity#g; s#\bci3Traceability\b#livingDocsCitationCoverage#g' \
  -e 's#\bci4Staleness\b#livingDocsStaleness#g; s#\bci8Links\b#livingDocsLinks#g; s#\bci9CommitDiscipline\b#livingDocsCommitDiscipline#g' \
  -e 's#\bdecideHk1\b#decideAppendOnly#g; s#\bdecideHk3\b#decideStatePromotion#g; s#\bdecideHk6\b#decideSessionInventory#g' \
  -e 's#\bdecideHk7\b#decideShortcutDebt#g; s#\bdecideHk8\b#decideOpenDecisionGuard#g' \
  -e 's#\bHk1Decision\b#AppendOnlyDecision#g; s#\bHk3Decision\b#StatePromotionDecision#g; s#\bHk6Decision\b#SessionInventoryDecision#g' \
  -e 's#\bHk7Decision\b#ShortcutDebtDecision#g; s#\bHk8Decision\b#OpenDecisionGuardDecision#g' \
  -e 's#\bCI-10\b#living-docs/trigger-routing#g; s#\bCI-11\b#living-docs/external-audience#g' \
  -e 's#\bCI-1\b#living-docs/frontmatter#g; s#\bCI-2\b#living-docs/id-integrity#g; s#\bCI-3\b#living-docs/citation-coverage#g' \
  -e 's#\bCI-4\b#living-docs/staleness#g; s#\bCI-8\b#living-docs/links#g; s#\bCI-9\b#living-docs/commit-discipline#g' \
  -e 's#\bCI-5\b#ownership/generated-drift#g; s#\bCI-6\b#ownership/consumer-change-logged#g' \
  -e 's#\bHK-1\b#living-docs/append-only#g; s#\bHK-2\b#ownership/generated-guard#g; s#\bHK-3\b#living-docs/state-promotion#g' \
  -e 's#\bHK-4\b#ownership/watch-reminder#g; s#\bHK-5\b#ownership/commit-guard#g; s#\bHK-6\b#living-docs/session-inventory#g' \
  -e 's#\bHK-7\b#living-docs/shortcut-debt#g; s#\bHK-8\b#living-docs/open-decision-guard#g' \
  $FILES
git grep -n "\bCI-[0-9]\+\b\|\bHK-[0-9]\+\b\|ci7OwnershipCoverage\|ci7-ownership-coverage" -- packages/living-docs
```

Expected from the last command: only the occurrences of `CI-7` (and of
`ci7OwnershipCoverage`), which step 5.3 resolves by hand, and those of the Definition of
Done vocabulary in `agent-contract-duplication.ts` (the regex `(?:CI|HK|AG|SK)-\d+`
has no literal digit and is not touched).

Read the diff of one skill and one command before proceeding: `sed` on prose can
produce a strange sentence ("the `living-docs/links` fails…"). A strange sentence in
shipped text is rewritten by hand, or stops citing the rule (§7).

- [ ] **Step 5.3: Split `CI-7` in three**

In `src/checks/agent-contract-duplication.ts` (the old `ci7`):

1. Create `src/checks/done-verifiable.ts` with `DOD_ITEM`, `VERIFICATION`,
   `dodItemsWithoutVerification` (moved from here) and:

```ts
const RULE = 'living-docs/done-verifiable'

/**
 * `living-docs/done-verifiable` — a Definition of Done item without a named
 * verification (`RN-0017`). One of the three pieces of the old ownership
 * coverage check: separate names because "check seven failed" never said which
 * part failed (§7 of the 2026-09-18 spec).
 */
export const livingDocsDoneVerifiable: Check = {
  id: RULE,
  name: 'done verifiable',
  run(context: CheckContext): Finding[] {
    // the block "4 — Definition of Done item without a named verification", moved
    // as it is, with a local `error()` using RULE
  },
}
```

   The body of `run` is block "4" of the old check, copied unchanged, with
   `const findings: Finding[] = []` before and `return findings` after. The
   `error` and `normalizePath` functions are copied too (they are two lines
   each; do not share a module because of them).

2. Create `src/checks/open-decision-claim.ts` with `docsExceptionReason` (moved
   from here) and:

```ts
const RULE = 'living-docs/open-decision-claim'

/**
 * `living-docs/open-decision-claim` — the diff touches a path claimed by an
 * open decision (`RN-0026`). It only runs with the diff (`ADR-0010`), and the label
 * `Docs: none — <reason>` releases it.
 */
export function livingDocsOpenDecisionClaim(diff: DiffFacts | null = null): Check {
  return {
    id: RULE,
    name: 'open decision claim',
    run(context: CheckContext): Finding[] {
      // the diff block of the old check (`if (diff !== null && docsExceptionReason(…) === null)`
      // with the `claimsFor` loop), moved as it is
    },
  }
}
```

   Same rule: the body is the diff block of the old check, copied unchanged.

3. What remains in `agent-contract-duplication.ts` is block "3" (a contract
   repeating an owning artifact), `WORD_FLOOR`, `Duplication`, `duplicatedSentences`,
   exported as `export const livingDocsAgentContractDuplication: Check` with
   `id: 'living-docs/agent-contract-duplication'` and
   `name: 'agent contract duplication'`. It stops being a function with `diff`.

4. `src/checks/registry.ts`: the three in place of the old one, in the order of the
   "Interfaces" section.

5. `src/checks/catalog.ts`: the `CI-7` entry (`sed` does not touch it, on
   purpose) becomes three:

```ts
  {
    id: 'living-docs/agent-contract-duplication',
    name: 'agent contract duplication',
    command: 'living-docs validate',
    failsWhen: 'The agent contract repeats, word for word, a sentence from an artifact or document with an owning skill, above the toolkit word floor.',
  },
  {
    id: 'living-docs/done-verifiable',
    name: 'done verifiable',
    command: 'living-docs validate',
    failsWhen: 'A Definition of Done item does not name what verifies it — the identifier of a check or hook, or the human-verification marker.',
  },
  {
    id: 'living-docs/open-decision-claim',
    name: 'open decision claim',
    command: 'living-docs validate --base <ref>',
    failsWhen: 'The diff between the base and `HEAD` touches a path claimed by an open decision, with no `Docs: none — <reason>` in any commit message.',
  },
```

   Keep the catalog sorted by ID (the test `'the catalog is read by people:
   it stays sorted by ID'` enforces it).

6. The `VERIFICATION` regex of `done-verifiable.ts` comes to accept the names, without
   ceasing to accept the numbered ones — this repository's Definition of Done only
   changes in Task 6:

```ts
/**
 * Verification vocabulary of a Definition of Done item (`RN-0017`): the
 * identifier of a check or hook (`plugin/name`), that of an agent or skill, or the
 * word that marks human verification — in Portuguese or in English. The
 * numbered `CI-n`/`HK-n` leave in Task 6 of the 2026-09-28 plan, together with the
 * Definition of Done that still cites them.
 */
const VERIFICATION = /\b(?:CI|HK|AG|SK)-\d+\b|\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|\bhumana?\b|\bhuman\b/i
```

7. Split `test/checks/agent-contract-duplication.test.ts` (the old `ci7`
   test) the same way: the DoD tests (`RN-0017: …`,
   `dodItemsWithoutVerification …`) go to `test/checks/done-verifiable.test.ts`;
   those about open decisions (`RN-0026: …`) and `'ADR-0010: a label without a reason is not
   an exception'` go to `test/checks/open-decision-claim.test.ts`; those about
   duplication stay. Each one imports the new check, and the `ruleId` assertion
   goes to the name of its own check. The test `'a repository with none of the three
   classes passes'` stays in `agent-contract-duplication.test.ts`, running the
   three checks.

- [ ] **Step 5.4: See the green and regenerate the contract**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
git diff docs/contracts/checks.gen.md
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
```

Expected: the **same count** as Task 4 in both packages (the renaming neither
creates nor deletes a test; the split of `ci7` only moves tests between files), 0 failures.
The `checks.gen.md` changes hash on purpose: check that each row is the old one
with the ID swapped, and that the three rows of the old `CI-7` add up to its
`failsWhen`. Both `validate` commands exit with 0.

A test that changes **result** here is a defect: the renaming does not change a finding.

`CHANGELOG.md`, `Changed`, without an artifact ID: "the checks and hooks of
`living-docs` come to be identified by name (`living-docs/frontmatter`, …)
instead of by number; the complete map is in the renaming entry of this version".
(The map is written in Task 6.)

```bash
git add -A packages docs/contracts/checks.gen.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
refactor(ADR-0026): living-docs checks and hooks come to have a name

CI-n and HK-n become living-docs/name; the rest of CI-7 becomes three checks
(agent-contract-duplication, done-verifiable, open-decision-claim). The same
findings, with the identifier swapped.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Living documents

Each document goes through the owning skill (§7). No old ADR, spec or plan is
edited.

**Files:**
- Modify (`working-agreements-keeper`): `CLAUDE.md`, `CONTRIBUTING.md`, `docs/definition-of-done.md`
- Modify (`glossary-keeper`): `docs/glossary.md`
- Modify (`requirements-keeper`): `docs/requirements/*.md`, where the text cites `CI-n`/`HK-n`
- Modify (`contract-keeper`): `docs/contracts/errors.md`, `docs/contracts/versioning-policy.md`, if they cite `CI-n`/`HK-n`
- Modify (`living-docs-bootstrap`): `.ownership.yml` (only comments that cite `CI-n`/`HK-n`)
- Modify: `README.md`
- Modify (`release-historian`): `CHANGELOG.md`
- Modify: `packages/living-docs/src/checks/done-verifiable.ts` (the regex), `packages/living-docs/test/checks/done-verifiable.test.ts`

- [ ] **Step 6.1: Find what cites the old names**

```bash
git grep -n "\bCI-[0-9]\+\b\|\bHK-[0-9]\+\b\|docs/\.ownership\.yml\|living-docs drift\|living-docs changelog\|consumer-visible-paths" -- \
  CLAUDE.md CONTRIBUTING.md README.md CHANGELOG.md .ownership.yml docs/definition-of-done.md docs/glossary.md docs/contracts docs/charter docs/requirements docs/deprecations.md docs/migrations
```

Each line goes to the skill that owns the file (the `.ownership.yml` one), with the map
of Task 5. The `CHANGELOG.md` lines that are old entries stay as
they are: the CHANGELOG is a record, and the new entry (step 6.3) is what explains.

- [ ] **Step 6.2: What each document comes to say**

- `CLAUDE.md`: each `HK-n`/`CI-n` by the new name (`HK-1` →
  `living-docs/append-only`, `HK-2` → `ownership/generated-guard`, `HK-3` →
  `living-docs/state-promotion`, `HK-4` → `ownership/watch-reminder`, `HK-5` →
  `ownership/commit-guard`, `CI-5` → `ownership/generated-drift`, `CI-6` →
  `ownership/consumer-change-logged`, `CI-7` on the line "Every document has a declared
  owner" → `ownership/owner-coverage`, `CI-11` →
  `living-docs/external-audience`); `docs/.ownership.yml` → `.ownership.yml`; the
  "Commands" section remains without `drift`/`changelog` (it never cited them).
- `docs/definition-of-done.md`: each item names the new check or hook that
  verifies it, and the last line lists what the workflow runs:
  `ownership validate [--base <ref>]` and `living-docs validate [--base <ref>]`
  (instead of `drift` and `changelog`). The item "Every new document was declared…"
  comes to cite `.ownership.yml` and `ownership/owner-coverage`.
- `CONTRIBUTING.md`: the local verification commands (the two `validate`, with
  `--conditions=development`) and the new names where it cites a rule.
- `docs/glossary.md`: **Artifact** is the `owned` entry with
  `living-docs.id-prefix`; **Document** is the entry with a `living-docs:` block and
  without `id-prefix` (§7). Neither is defined any longer by the list it lives in.
- `README.md`: the command table loses `drift` and `changelog` and gains
  `node --conditions=development packages/ownership/src/cli/index.ts validate [--base <ref>]`;
  `docs/.ownership.yml` → `.ownership.yml`; no artifact ID (it is
  `audience: external`).
- Requirements: the text that cites `CI-n`/`HK-n` moves to the name, through the
  `requirements-keeper` (§7). State does not change here.

- [ ] **Step 6.3: The map in the CHANGELOG**

Ask the `release-historian`, under `## [Unreleased]`, `Changed`, for a renaming
entry with the complete old → new map (the 21 rows of the "Interfaces" table of
Task 5, without the export column), and the sentence: "whoever cites one of
these identifiers in their own Definition of Done needs to swap it for the new
name — the number is no longer recognized as verification". `CI-n` and `HK-n` are not
artifact IDs, and the external-audience check does not enforce them (§7).

- [ ] **Step 6.4: The Definition of Done stops accepting a number**

With the Definition of Done already on the new names, the regex of
`packages/living-docs/src/checks/done-verifiable.ts` loses `CI|HK`:

```ts
const VERIFICATION = /\b(?:AG|SK)-\d+\b|\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|\bhumana?\b|\bhuman\b/i
```

and the comment loses the sentence about Task 6. In
`test/checks/done-verifiable.test.ts`, in the test
`'dodItemsWithoutVerification accepts a check ID, a hook ID and the human marker'`,
add the assertion that `'- [ ] Something — verification: \`CI-3\`.'` is an item
without verification (no alias for the old name, §1).

- [ ] **Step 6.5: Final verification and commit**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
git grep -n "\bCI-[0-9]\+\b\|\bHK-[0-9]\+\b" -- CLAUDE.md CONTRIBUTING.md README.md docs/definition-of-done.md docs/glossary.md docs/requirements docs/contracts packages
```

Expected: the counts of Task 5, 0 failures; both `validate` commands exit with 0; the
`git grep` finds nothing (`CHANGELOG.md` and the historical record are left out of the
search on purpose).

```bash
git add CLAUDE.md CONTRIBUTING.md README.md CHANGELOG.md .ownership.yml docs packages/living-docs
git commit -m "$(cat <<'EOF'
docs(ADR-0026): living documents with the new names and the map in the CHANGELOG

CLAUDE.md, CONTRIBUTING.md, Definition of Done, glossary, README and
requirements move to the names; the CHANGELOG carries the old → new map. The
Definition of Done stops accepting CI-n/HK-n as verification.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

The PR description carries the table "Comparison of the removed tests" below,
filled in with what actually happened (§8).

---

## Comparison of the removed tests

Each case deleted from living-docs and where it is now proven. "Port" are
the tests of step 3.7. No row is left without a destination.

### Task 3

| Removed case (living-docs) | Destination |
| --- | --- |
| `ci5`: an equal file is not a finding | core `generated-drift`: "equal, no finding" |
| `ci5`: the difference points to the first line | core `generated-drift`: "divergence … with the right line" |
| `ci5`: CR and trailing break are not drift | **port** → `generated-drift`: "a checkout CR and an extra trailing break are not drift" |
| `ci5`: a generator that fails is an error | core `generated-drift`: "a generator that fails is a finding" |
| `ci5`: a missing artifact is an error | core `generated-drift`: "a missing artifact is a finding" |
| `ci5`: `firstDifferentLine` returns 0 without divergence | core `generated-drift`: "equal, no finding" (the 0 is what the check reads as equal) |
| `ci6`: the entry must travel in the same diff | core `consumer-change-logged`: "the changelog did not come along" |
| `ci6`: an entry in the diff and Unreleased filled in approves | core: "the changelog came along with an item under Unreleased" |
| `ci6`: an empty Unreleased does not count | core: "the changelog came along but without an item under Unreleased" |
| `ci6`: a label with a reason releases; without a reason, it does not | core: "Changelog: none — reason releases" + `exception-label`: "a label without a reason does not count" |
| `ci6`: a path outside the trigger does not fire | core: "each visible doc is only enforced by the paths of its own rule" |
| `ci6`: an empty trigger goes quiet | core: "without consumer-visible watches, no finding" |
| `ci6`: a trigger without a marked doc is a configuration error | **ceases to exist**: there is no second list (§4, `ADR-0020`) |
| `ci6`: a missing target doc is a finding | **port** → `consumer-change-logged`: "a declared doc, in the diff and missing…" |
| `ci6`: `unreleasedEntries` reads `-` and `*` | **port** → `consumer-change-logged`: "an item under Unreleased written with * counts" |
| `ci6`: `exceptionReason` accepts separators | **port** → `exception-label`: "accepts em dash, en dash, hyphen and colon" |
| `cli/drift`: with no generated declared, exits 0 | core `generated-drift`: "with no generated declared, no finding" |
| `cli/drift`: drift leads to exit 1 | core `cli/validate`: "with an error finding, exitCode 1" |
| `cli/drift`: validate counts what it left for drift | **ceases to exist**: the new pointer of `living-docs validate` points to `ownership validate` (step 3.8, item 6) |
| `cli/drift`: a missing `.ownership.yml` propagates an error | core `cli/validate`: "without an ownership file, installed: false" (the core treats absence as "nothing to validate", and living-docs keeps throwing — `test/cli/validate.test.ts`) |
| `cli/changelog`: fails without the entry | core `consumer-change-logged` (likewise above) |
| `cli/changelog`: with the entry, exits 0 | core `consumer-change-logged` |
| `cli/changelog`: without a trigger, nothing to check | core: "without consumer-visible watches" |
| `cli/changelog`: a base that does not resolve becomes `GitError` | **port** → `exec`: "changedPaths with a base that does not resolve throws GitError" and `cli/validate`: "a base that does not resolve: exits with 2…" |
| `config/codeowners` (4 cases) | **port** → `core/codeowners.test.ts`, the four as they are |
| `config/ownership` (28 cases of the v1 parser) | the new `config/ownership.test.ts` (step 3.2) for the `living-docs:` block; the core's parser (`schema/parse.test.ts`) for `version`, `owner` with `@`, empty `skill`, `collection`. When deleting, check case by case; a rule without a destination comes back as an adapter test |
| `docs/table`: extracts id, status and line | core `schema/item`: "parseItemsTable reads by the named column" |
| `docs/table`: stops at the end of the table | **port** → `item`: "stops reading at the first line that is not part of the table" |
| `docs/table`: without ID and Status columns, an empty list | **changes behavior** (Review Focus 3): without `Status` there are items without a state → `collect.test`: "collection table without a Status column…" |
| `docs/table`: ignores a row whose key is not an ID | `collect.test`: the `note` row of the same fixture (the filter is living-docs's) |
| `docs/table`: the item carries all the columns | **port** → `item`: "brings all columns into the item" |
| `docs/table`: the project's written form (`RN-0024`) | `acceptance/id-format.test.ts` (the shape filter is living-docs's) |
| `docs/sections`: reads id, title, status, fields | core `item`: "keyMode first-token: the first token is the key" |
| `docs/sections`: line shifted by `startLine` | **port** → `item`: "the line is shifted by startLine…" |
| `docs/sections`: a section without status, empty status | **port** → the same test above |
| `docs/sections`: a heading without an ID is ignored | `collect.test`: "a requirement under a ### heading…" (the `## Context` of the fixture) |
| `docs/sections`: an example in a code block | core `item`: "parseItemsSections skips a fenced code block" |
| `docs/sections`: the project's written form | `acceptance/id-format.test.ts` |
| `docs/schema`: encoded state machine (2 cases) and `statesFor` | **ceases to exist** in the code: `config/ownership.test.ts`, "this repository … declares states for every family" |
| `ci1`: status outside the machine | core `declared-state`: "per-file: status outside the declared states" |
| `ci1`: owner without `@` (half) | core `declared-state`: "per-file: a frontmatter owner without @" (Task 1) |
| `ci1`: item with a status outside the machine (half) | core `declared-state`: "table/sections: an item with a status outside the states" |
| `ci7`: a document without an entry, named | core `owner-coverage`: "a file without a rule in owned[] is a finding" |
| `ci7`: a missing CODEOWNERS, a single finding | core `owner-coverage`: "a missing CODEOWNERS is a finding" |
| `ci7`: `watches` with a nonexistent doc or one without an owner | core `owner-coverage`: "watches with a nonexistent doc or without a rule" |
| `ci7`: a diff with a watched path without the doc fails | core `watch-satisfied`: "the diff touches the watched code without the owning doc" |
| `ci7`: with the doc, or with the reason, passes | core `watch-satisfied`: "the diff brings both" and "Docs: none — reason … releases" |
| `ci7`: without a diff, the diff half does not run | core `cli/validate`: "without --base, the diff checks do not run" |
| `release-history`: the two lists agree | **ceases to exist** (§4) |
| `cli/validate`: with `--base`, the watched link | core `watch-satisfied` (likewise) |
| `docs/corpus`: `docsRoot` derives from the file | **ceases to exist**: the corpus is what the entries declare (step 3.6) |

### Task 4

| Removed case (living-docs) | Destination |
| --- | --- |
| `hk2`: denies editing a declared generated file | core `generated-guard`: "a path declared in generated[] is denied" |
| `hk2`: denies creating a generated file that does not exist yet | core: "… even if the file does not exist yet" |
| `hk2`: the marker holds on its own | core: "a file with the marker on the first line is denied" |
| `hk2`: the marker only on the first line | **ported** in Task 3 → "the marker only counts on the first line…" |
| `hk2`: a marker on line ~20 is allowed | **ported** → the same test |
| `hk2`: a common path passes | core: "a common file is allowed" |
| `hk2`: an unreadable configuration allows | core: "without .ownership.yml, fails open" |
| `hk2`: a payload without `file_path` | **ported** → "a payload without file_path allows" |
| `hk2`: an absolute host `file_path` | **ported** → "an absolute host file_path under the root…" |
| `hk2`: a directory in `generated[]` does not cover | **ported** → "generated[] requires an exact path…" |
| `hk4`: reminds with reason and skill | **ported** → "the reminder names the doc, the reason and the owning skill…" |
| `hk4`: reminds and does not block | **ported** → the same test (without `permissionDecision`) |
| `hk4`: a doc without a skill is still reminded | **ported** → "an owning doc without a declared skill is still reminded" |
| `hk4`: editing the doc itself does not remind | core `watch-reminder`: "editing the owning doc itself does not remind of itself" |
| `hk4`: outside `watches`, silence | core: "an unwatched path, silence" |
| `hk4`: without configuration, silence | core: "without an ownership file, the hook goes quiet" |
| `hk4`: a payload without `file_path` | **ported** → "a payload without file_path is silence" |
| `hk5`: asks and lists the pending ones | core `commit-guard`: "staged touches a watched path without the doc: asks" |
| `hk5`: staged with the doc passes | core: "staged brings both: allow" |
| `hk5`: asks, never denies | core: the type `CommitGuardDecision` has no `deny` (checked by `typecheck`) |
| `hk5`: the message teaches the two ways out | **ported** → "the message teaches the two legitimate ways out…" |
| `hk5`: a command that is not commit does not consult git | **ported** → "a command that is not git commit passes without consulting git" |
| `hk5`: a chained `git commit` and with options | core: the two tests of `isGitCommit` |
| `hk5`: git unavailable passes | core: "git runner fails (no git): fails open" |
| `hk5`: without `.ownership.yml` passes | core: "without an ownership file, the hook goes quiet" |
| `hk5`: an empty index passes | **ported** → "an empty index passes" |
| `hk5`: `tool_name` other than Bash | core: "not Bash, allow" |
| `config/watches` (9 cases) | core `triggers/watches.test.ts` (groups by doc, `consumerVisible`, doc without owned, `coversDoc`, `pendingDocs`); "a host-format path is normalized" and "without `watches`, nothing is required" — check in the core's file when deleting, and port if missing |
| `spec-criteria`: criterion 5 (reminded and asked) | core `watch-reminder` and `commit-guard` (rows above) |
| `spec-criteria`: criterion 6, the `HK-2` half | core `generated-guard`: "a path declared in generated[] is denied" |

## Out of this plan

- Publication of `@esliph/ownership` on npm and the return of remote installation of
  living-docs (§10, slice C); `TDR-0003` is the trigger.
- The core's `promotion-guard`, which waits for `DA-0004`. Until then,
  `living-docs/state-promotion` is the guard.
- Swapping the copies of `git/`, `exec/` and `frontmatter/` for an import from the core.
- `derives-from` in this repository, the SDD plugin, and composition across files
  (`include`, `basePath`).
- The `ADR-0020` warning for a plugin listed in `plugins:` with no entry
  carrying its block.
- The divergence between `MARKETPLACE_NAME = 'living-docs'` in
  `src/config/claude-settings.ts` and the real marketplace name (`esliph`) predates
  this plan and is not fixed here.


