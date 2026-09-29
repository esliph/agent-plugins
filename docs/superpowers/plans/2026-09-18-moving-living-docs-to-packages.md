# Moving living-docs to packages (physical slice): implementation plan

> **For whoever executes:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to execute this plan task by task. The steps use checkboxes (`- [ ]`) for tracking.

**Goal:** move `@esliph/living-docs` from the repository root to
`packages/living-docs/`, with the package and the plugin in the same directory,
without changing what it does. Prove that the plugin works when copied on its own
into the marketplace cache.

**Architecture:** first a structural `git mv`, then the repairs. The root becomes a
private npm workspace (`esliph`) that only holds the shared tooling. The package
declares its own dependencies and has its own lockfile, generated outside the
workspace. Toolkit and checkout stop coinciding: the tests that read the real
repository now find it through `checkoutRoot()`, and `toolkitRoot()` keeps only
what belongs to the toolkit.

**Tech Stack:** Node >= 24 with no build step, `node --test`, npm workspaces,
bash (hook wrapper), GitHub Actions, Docker Compose (optional path).

**Spec:** `docs/superpowers/specs/2026-09-18-moving-living-docs-to-packages-design.md`.
The plan argues from it, and whoever executes reads both.

## Global constraints

- **The invariant:** same check IDs (`CI-n`) and hook IDs (`HK-n`), same hook
  names, same subcommands, `.ownership.yml` at `version: 1`, same
  `LIVING_DOCS_*` variables, same output. **A test whose result changes, and not
  just its path, is a defect of the migration.** If that happens, stop and
  investigate before adjusting the test.
- **`git mv`, never copy and delete.** It is what preserves the per-file history.
- **Every commit stays green** on `npm test`, `npm run typecheck`,
  `node packages/living-docs/src/cli/index.ts validate` and
  `node packages/living-docs/src/cli/index.ts drift`, all run from the checkout
  root.
- **`toolkitRoot()` and `src/core/roots.ts` do not change behavior.** Only the
  comment changes.
- **Shipped text does not cite the internal trail.** `hooks/run-hook.sh`, skills,
  commands, templates and string messages in `src/` stay free of artifact IDs
  (`ADR-`, `RN-`, ...), of `spec §n` and of `docs/superpowers/`. A code comment
  may cite. What enforces it is `test/distribution/internal-trail.test.ts`.
- **`audience: external` text does not cite an artifact ID.** This applies to
  `README.md` and `CHANGELOG.md`, and what enforces it is `CI-11`.
- **`last-reviewed` is not bumped** in the edited documents, unless `validate`
  demands it.
- **Commit message** in Portuguese, `type(ID): subject`, ending with
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Frozen ADRs and old plans/specs are not edited**, even when they cite
  `plugin/...` or `src/cli/index.ts`. They are a historical record, and `HK-1`
  blocks the ADRs.
- **Type-check is `npm run typecheck`**, never `tsc` directly.
- **Hooks during execution:** `HK-4` will remind you of the owning document at
  every watched file edited, and `HK-5` will ask at commit time. That is expected.
  In the Task 1 commit the answer is the label `Docs: none — …`; in the others,
  the owning document travels in the task itself or in Task 3.

## Baseline (measured on 2026-09-18, before the first `git mv`)

| Measure | Value |
| --- | --- |
| `npm test` (living-docs, root) | **548** tests, 548 pass |
| `npm test --workspace packages/ownership` | **167** tests, all passing after `npm ci`; without it, `dev-resolution` fails because of a missing symlink in `node_modules` |
| `validate` | no violation, 1 generated artifact, 7 paths visible to the consumer, 14 code→doc links |
| `drift` | no violation |
| `git hash-object docs/contracts/checks.gen.md` | `6d6030f810f62510db0c772145e24daaef3ab193` |
| `npm run lint:check` | **28 errors and 915 warnings**, all pre-existing: 7 in `packages/ownership/`, 21 in `src/` and `test/` |

The spec asks for a green `lint:check`. The lint **is already not green** before
the change, and fixing those errors would change code, which is out of scope for
this slice. This plan's criterion is different: **no new errors**, that is, the
same 28 errors in the same files (now under `packages/living-docs/`). The
divergence goes into the PR description (Task 6).

## File map

**Moved by `git mv`:**

| From | To |
| --- | --- |
| `src/` | `packages/living-docs/src/` |
| `test/` | `packages/living-docs/test/` |
| `templates/` | `packages/living-docs/templates/` |
| `plugin/.claude-plugin/` | `packages/living-docs/.claude-plugin/` |
| `plugin/hooks/` | `packages/living-docs/hooks/` |
| `plugin/commands/` | `packages/living-docs/commands/` |
| `plugin/skills/` | `packages/living-docs/skills/` |
| `plugin/agents/` | `packages/living-docs/agents/` |
| `tsconfig.json` | `packages/living-docs/tsconfig.json` |

**Created:** `packages/living-docs/package.json`, `packages/living-docs/package-lock.json`,
`packages/living-docs/test/helpers/checkout.ts`,
`packages/living-docs/test/distribution/plugin-cache.test.ts`,
`packages/living-docs/test/distribution/lockfile.test.ts`, and the draft ADR for the
project name.

**Modified:** `package.json`, `package-lock.json`, `.prettierignore`,
`.claude-plugin/marketplace.json`, `docs/.ownership.yml`, `hooks/run-hook.sh`,
`src/core/roots.ts` (comment), `src/checks/ci10-trigger-routing.ts`, 13 test
files, `.github/workflows/living-docs.yml`, `.github/workflows/wrapper-docker.yml`,
`compose.yaml`, `Dockerfile`, `bin/living-docs`, `bin/dev` (comment only),
`CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `CHANGELOG.md`.

In Tasks 1 to 5, every path inside the package appears in full from the checkout
root (`packages/living-docs/...`).

---

### Task 1: The move and the minimum to get green

A big, mechanical commit. The review reads "what changed path". The
`marketplace.json` goes in here, and not in Task 3 as spec §8 suggests, because
`test/plugin/manifest.test.ts` asserts that the marketplace source exists and has
a manifest: without changing it along with the move, the commit does not go green.

**Files:**
- Move: everything in the "Moved by `git mv`" table
- Create: `packages/living-docs/package.json`, `packages/living-docs/package-lock.json`, `packages/living-docs/test/helpers/checkout.ts`
- Modify: `package.json`, `package-lock.json`, `.prettierignore`, `.claude-plugin/marketplace.json`, `docs/.ownership.yml`
- Modify: `packages/living-docs/hooks/run-hook.sh`, `packages/living-docs/src/core/roots.ts:3-5`, `packages/living-docs/src/checks/ci10-trigger-routing.ts:51,180`
- Modify (tests): `budget`, `ci10-trigger-routing`, `spec-criteria`, `contracts/drift`, `docs/maintenance`, `docs/agent-contract`, `docs/contracts`, `docs/language-and-intent`, `docs/release-history`, `distribution/internal-trail`, `plugin/authoring`, `plugin/manifest`, `plugin/wrapper-docker`

**Interfaces:**
- Produces: `checkoutRoot(): string` in `packages/living-docs/test/helpers/checkout.ts`, which returns `resolve(join(toolkitRoot(), '..', '..'))`. Tasks 2 and 4 import from here.
- Produces: the package layout. Plugin root = package root = `toolkitRoot()`.

- [ ] **Step 1: Confirm the baseline**

Run from the checkout root:

```bash
npm ci
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
node src/cli/index.ts validate
node src/cli/index.ts drift
git hash-object docs/contracts/checks.gen.md
npm run lint:check 2>&1 | tail -2
```

Expected: the values in the "Baseline" table. If any diverges, stop and report
before moving anything.

- [ ] **Step 2: Move with `git mv`**

```bash
mkdir -p packages/living-docs
git mv src packages/living-docs/src
git mv test packages/living-docs/test
git mv templates packages/living-docs/templates
git mv plugin/.claude-plugin packages/living-docs/.claude-plugin
git mv plugin/hooks packages/living-docs/hooks
git mv plugin/commands packages/living-docs/commands
git mv plugin/skills packages/living-docs/skills
git mv plugin/agents packages/living-docs/agents
git mv tsconfig.json packages/living-docs/tsconfig.json
git ls-files plugin            # expected: no lines
rmdir plugin 2>/dev/null || true
git ls-files -s packages/living-docs/hooks/run-hook.sh   # expected: starts with 100755
```

The checkout lives in OneDrive. If a `git mv` fails with "Permission denied",
pause OneDrive sync and repeat the same command. Do not copy by hand.

The moved `tsconfig.json` is already identical to the one in `packages/ownership/tsconfig.json`.
Check with `diff packages/living-docs/tsconfig.json packages/ownership/tsconfig.json`
(expected: no difference).

- [ ] **Step 3: See the red**

```bash
cd packages/living-docs && node --test "test/**/*.test.ts" 2>&1 | grep -E "^ℹ (tests|pass|fail)"; cd ../..
```

Expected: failures in `manifest`, `authoring`, `internal-trail`, `ci10-trigger-routing`,
`budget`, `wrapper-docker`, `release-history`, `agent-contract`, `contracts`,
`language-and-intent`, `maintenance`, `drift` and `spec-criteria`, all because of
path (`ENOENT`, `plugin/…`, or `docs/` looked up inside the package). No failure
should be a logic one. The dependencies resolve because the root `node_modules`
still exists.

- [ ] **Step 4: Root `package.json`**

Replace the contents of `package.json` with:

```json
{
  "name": "esliph",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "workspaces": ["packages/*"],
  "scripts": {
    "test": "npm test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "eslint . --fix",
    "lint:check": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "eslint": "^10.9.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.6",
    "globals": "^17.12.0",
    "prettier": "^3.9.6",
    "typescript": "^5.9.0",
    "typescript-eslint": "^8.69.0"
  }
}
```

`typescript` stays at the root because `typescript-eslint` requires it as a peer,
and also in the package because the package declares what it uses.

- [ ] **Step 5: Package `package.json`**

Create `packages/living-docs/package.json`:

```json
{
  "name": "@esliph/living-docs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "bin": {
    "living-docs": "./src/cli/index.ts"
  },
  "scripts": {
    "test": "node --test \"test/**/*.test.ts\"",
    "typecheck": "tsc --noEmit"
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

`test/distribution/internal-trail.test.ts` imports `typescript` and
`test/plugin/wrapper-docker.test.ts` imports `picomatch`. Both are declared
above. The workspace hoist would hide a forgotten dependency in the checkout,
and it would only break in the cache.

- [ ] **Step 6: Lockfiles**

The package lockfile is generated **outside** the workspace, like the one in `ownership`:

```bash
tmp="$(mktemp -d)"
cp packages/living-docs/package.json "$tmp/"
(cd "$tmp" && npm install --package-lock-only --ignore-scripts)
cp "$tmp/package-lock.json" packages/living-docs/package-lock.json
rm -rf "$tmp"
```

Then the root one, with both workspaces:

```bash
npm install
npm ci
```

Expected: `npm ci` with no error. `grep -n '"packages/living-docs"' package-lock.json`
finds the workspace entry, and `head -4 package-lock.json` shows `"name": "esliph"`.

- [ ] **Step 7: `hooks/run-hook.sh` goes up one level**

In `packages/living-docs/hooks/run-hook.sh`, replace the comment block about the
two roots and the `TOOLKIT_ROOT` line:

```bash
# Two roots, and they are not confused: the **toolkit** code comes from
# the path of this script, one level above it — hooks/ and src/ live side by
# side at the plugin root, which is the directory the marketplace cache copies
# whole. The `.ownership.yml` that is read is the one of the **validated repository**, which comes from
# CLAUDE_PROJECT_DIR.

HOOK="${1:-}"
TOOLKIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
```

The rest of the file does not change. This text is shipped to whoever installs,
so it cannot cite an artifact ID or `spec §n`. Check that the mode is still
`100755` (`git ls-files -s packages/living-docs/hooks/run-hook.sh`) and that the
file did not gain a `\r`.

- [ ] **Step 8: `roots.ts` (comment) and `CI-10` (code)**

In `packages/living-docs/src/core/roots.ts`, only the first line of the JSDoc of
`toolkitRoot`:

```ts
/**
 * **Toolkit** root: where `src/`, `templates/` and the plugin (`skills/`,
 * `hooks/`, `commands/`, `agents/`, `.claude-plugin/`) live.
```

In `packages/living-docs/src/checks/ci10-trigger-routing.ts`, line 51:

```ts
  const dir = join(root, 'skills')
```

and, in the `fix` message (line 180):

```ts
              'check the name in `skills/`, at the toolkit root.',
```

- [ ] **Step 9: `checkoutRoot()` helper**

Create `packages/living-docs/test/helpers/checkout.ts`:

```ts
import { join, resolve } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

/**
 * Root of this repository's checkout: where `docs/`, `CLAUDE.md`,
 * `CHANGELOG.md`, `bin/`, `.claude-plugin/marketplace.json` and the
 * `docs/.ownership.yml` that the dogfooding tests read live.
 *
 * It is not `toolkitRoot()`: since the toolkit lives in `packages/living-docs/`,
 * toolkit and validated repository no longer coincide in this project (RNF-0003).
 * And it is not `repoRoot()`: that one reads the working directory, and `npm test --workspaces`
 * runs with the cwd in the package. The package sits two levels below the checkout.
 */
export function checkoutRoot(): string {
  return resolve(join(toolkitRoot(), '..', '..'))
}
```

Deriving from `toolkitRoot()` is what keeps the containerized path coherent: there,
`LIVING_DOCS_TOOLKIT_ROOT` points to the package inside the mounted checkout.

- [ ] **Step 10: Tests that read the whole checkout go through `checkoutRoot()`**

In each file below, all under `packages/living-docs/test/`, swap the root import
and the constant. Nothing else changes in the file.

`docs/contracts.test.ts`, `docs/language-and-intent.test.ts`, `docs/release-history.test.ts`:

```ts
// remove: import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
```

`acceptance/spec-criteria.test.ts`, `contracts/drift.test.ts`, `docs/maintenance.test.ts`:

```ts
// remove: import { repoRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
```

`plugin/wrapper-docker.test.ts` reads `bin/` and `docs/.ownership.yml`, both from the checkout:

```ts
// remove: import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
```

- [ ] **Step 11: Tests that mix the two roots**

`packages/living-docs/test/checks/budget.test.ts`: the set of checks runs
against the checkout, and the simulated diff must keep touching a path visible
to the consumer.

```ts
// replace the toolkitRoot import with:
import { checkoutRoot } from '../helpers/checkout.ts'
```

```ts
  // in both tests:
  const root = checkoutRoot()
```

```ts
  return `packages/living-docs/src/cli/index.ts${NUL}CHANGELOG.md${NUL}`
```

`packages/living-docs/test/checks/ci10-trigger-routing.test.ts`: the skills come from
the toolkit (line 182, **does not change**), and `validate` runs against the checkout (line 190).

```ts
import { checkoutRoot } from '../helpers/checkout.ts'
```

```ts
  const findings = runValidate(checkoutRoot()).findings.filter(f => f.ruleId === 'CI-10')
```

`packages/living-docs/test/docs/agent-contract.test.ts`: `CLAUDE.md` and `docs/` come
from the checkout, and the template comes from the toolkit.

```ts
import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
```

```ts
  // line 54:
  const template = readFileSync(join(toolkitRoot(), 'templates/agent-contract.md'), 'utf8')
```

`packages/living-docs/test/distribution/internal-trail.test.ts`: the set of
internal prefixes comes from the checkout's `.ownership.yml`, and the scanned text belongs to the toolkit.

```ts
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = toolkitRoot()
const CONFIG = loadOwnership(checkoutRoot())
```

In the test `RN-0031: plugin text does not cite the toolkit's internal trail`, the
scan now covers the five public directories at the plugin root:

```ts
/** The plugin text that the marketplace cache delivers — `src/` and `test/` have their own scan or none. */
const PLUGIN_DIRS = ['.claude-plugin', 'hooks', 'commands', 'skills', 'agents'] as const

test('RN-0031: plugin text does not cite the toolkit internal trail', () => {
  const files = PLUGIN_DIRS.flatMap(dir => filesUnder(join(ROOT, dir)))
  const found = files.flatMap(absolute => trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))

  assert.ok(files.length > 10, `scan too empty: ${files.length} file(s)`)
  assert.equal(found.length, 0, `toolkit internal trail in the plugin:\n${report(found)}`)
})
```

- [ ] **Step 12: Plugin tests (`authoring` and `manifest`)**

`packages/living-docs/test/plugin/authoring.test.ts`: `ROOT` stays
`toolkitRoot()`. Change the four occurrences of `'plugin/skills'` to `'skills'`
and of `'plugin/commands'` to `'commands'` (lines 14, 20, 105 and 110). Line 227
(`templates/migration.md`) does not change.

`packages/living-docs/test/plugin/manifest.test.ts`: `ROOT` stays
`toolkitRoot()`. Add the checkout root:

```ts
import { join, resolve } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = toolkitRoot()
const CHECKOUT = checkoutRoot()
```

Change the paths relative to the toolkit:

| Before | After |
| --- | --- |
| `'plugin/.claude-plugin/plugin.json'` | `'.claude-plugin/plugin.json'` |
| `'plugin/hooks/hooks.json'` | `'hooks/hooks.json'` |
| `'plugin/hooks/run-hook.sh'` | `'hooks/run-hook.sh'` |
| `'plugin/commands'` and `` `plugin/commands/${name}` `` | `'commands'` and `` `commands/${name}` `` |
| `'plugin/skills'` and `` `plugin/skills/${name}/SKILL.md` `` | `'skills'` and `` `skills/${name}/SKILL.md` `` |
| `'plugin/agents'`, `'plugin/agents/docs-divergence-auditor.md'` | `'agents'`, `'agents/docs-divergence-auditor.md'` |
| `'plugin/skills/decision-recorder/SKILL.md'` | `'skills/decision-recorder/SKILL.md'` |
| test name `every referenced skill exists in plugin/skills/` | `every referenced skill exists in skills/` |
| messages `` `plugin/agents: …` `` | `` `agents: …` `` |

The `git ls-files -s -- hooks/run-hook.sh` with `cwd: ROOT` remains valid, because
the path is relative to the cwd.

`SKILL_REFERENCES` reads a file from the checkout (`docs/.ownership.yml`). Give each
entry its own root:

```ts
const SKILL_REFERENCES: readonly { root: string; file: string; pattern: RegExp }[] = [
  ...readdirSync(join(ROOT, 'commands')).map(name => ({
    root: ROOT,
    file: `commands/${name}`,
    pattern: /skill\s+`([a-z][a-z0-9-]*)`/g,
  })),
  { root: ROOT, file: 'src/cli/index.ts', pattern: /skill dona:\s*([a-z][a-z0-9-]*)/g },
  { root: ROOT, file: 'src/config/ownership.ts', pattern: /skill dona:\s*([a-z][a-z0-9-]*)/g },
  { root: ROOT, file: 'templates/ownership.yml', pattern: /^\s*skill:\s*([a-z][a-z0-9-]*)\s*$/gm },
  { root: CHECKOUT, file: 'docs/.ownership.yml', pattern: /^\s*skill:\s*([a-z][a-z0-9-]*)\s*$/gm },
]

function referencedSkills(): Map<string, string[]> {
  const found = new Map<string, string[]>()

  for (const { root, file, pattern } of SKILL_REFERENCES) {
    const source = readFileSync(join(root, file), 'utf8')
    // … the rest of the loop does not change
```

The CR test mixes the two roots:

```ts
test('RNF-0002: no executable script carries CR — the wrapper runs in bash', () => {
  const scripts = [
    { label: 'bin/dev', path: join(CHECKOUT, 'bin/dev') },
    { label: 'bin/living-docs', path: join(CHECKOUT, 'bin/living-docs') },
    { label: 'hooks/run-hook.sh', path: join(ROOT, 'hooks/run-hook.sh') },
  ]

  for (const { label, path } of scripts) {
    const source = readFileSync(path, 'utf8')

    assert.equal(source.includes('\r'), false, `${label} with CRLF: the shebang breaks with "bad interpreter"`)
  }
})
```

The marketplace test reads from the checkout and asserts that the source **is** the package directory:

```ts
test('the marketplace manifest points to this repository plugin', () => {
  const marketplace = JSON.parse(readFileSync(join(CHECKOUT, '.claude-plugin/marketplace.json'), 'utf8')) as Record<string, unknown>
  const plugins = marketplace.plugins as { name: string; source: string; version: string }[]

  // The marketplace identifies who distributes; the plugin, what gets installed. Both
  // with the same name gave `living-docs@living-docs` in the install command.
  assert.equal(marketplace.name, 'esliph')
  assert.equal(plugins.length, 1)
  assert.equal(plugins[0]?.name, 'living-docs')
  assert.equal(plugins[0]?.source, './packages/living-docs')
  // The plugin directory is the package one: it is what puts src/, templates/ and the
  // lockfile inside what the cache copies.
  assert.equal(resolve(CHECKOUT, plugins[0]?.source ?? ''), ROOT)
  assert.ok(existsSync(join(ROOT, '.claude-plugin/plugin.json')), 'the source must have a manifest')

  const plugin = readJson('.claude-plugin/plugin.json')

  assert.equal(plugins[0]?.version, plugin.version, 'two versions is the guarantee that one is wrong')
})
```

`test/hooks/hk4-watch-reminder.test.ts` **does not change**: the `plugin/skills/**` there
is a temporary-repository fixture, not a path of this checkout.

- [ ] **Step 13: `marketplace.json` and `.prettierignore`**

In `.claude-plugin/marketplace.json`, only the source changes:

```json
      "source": "./packages/living-docs"
```

In `.prettierignore`, the line `templates/` becomes `packages/living-docs/templates/`.

- [ ] **Step 14: `docs/.ownership.yml`, paths one to one**

It stays at `version: 1`. Only paths change, and the comments that cite them.

`cited-by`:

```yaml
  - id-prefix: RF
    …
    cited-by: ['packages/living-docs/test/**']

  - id-prefix: RNF
    …
    cited-by: ['packages/living-docs/test/**']

  - id-prefix: RN
    …
    cited-by: ['packages/living-docs/test/**', 'packages/living-docs/src/**']
```

Do not use `packages/*/test/**`: the wildcard would start counting the `ownership` tests
and change the result of `CI-3`.

`generated`:

```yaml
  - path: docs/contracts/checks.gen.md
    command: node packages/living-docs/src/tools/gen-checks.ts
```

`watches`: the `code` entries become, in the same order and with the same `doc`,
`reason` and `consumer-visible` as today:

| `code` before | `code` after |
| --- | --- |
| `src/checks/**` | `packages/living-docs/src/checks/**` |
| `src/checks/catalog.ts` (both rules) | `packages/living-docs/src/checks/catalog.ts` |
| `src/hooks/**` | `packages/living-docs/src/hooks/**` |
| `src/cli/**` (both rules) | `packages/living-docs/src/cli/**` |
| `src/core/**` | `packages/living-docs/src/core/**` |
| `plugin/skills/**` | `packages/living-docs/skills/**` |
| `src/config/ownership.ts` | `packages/living-docs/src/config/ownership.ts` |
| `plugin/**` | `packages/living-docs/{.claude-plugin,hooks,commands,skills,agents}/**` |
| `templates/**` | `packages/living-docs/templates/**` |
| `.github/workflows/**`, `bin/**` | do not change |

`plugin/**` becomes a brace glob, and not five entries. That way the number of
links stays 14 and the number of visible paths stays 7. The whole package
cannot be the wildcard, because `src/` and `test/` are not public surface. picomatch
expands the brace and matches `.claude-plugin/` even without `dot: true`
(verified on 2026-09-18). The old `plugin/**` did not match
`plugin/.claude-plugin/plugin.json`, so the manifest now counts as
visible to the consumer. It is the list that spec §5 fixes.

In the comment above the `consumer-visible` rules, replace
`test/docs/release-history.test.ts` with `packages/living-docs/test/docs/release-history.test.ts`.

`consumer-visible-paths`:

```yaml
consumer-visible-paths:
  - 'packages/living-docs/src/cli/**'
  - 'packages/living-docs/src/checks/catalog.ts'
  - 'packages/living-docs/src/config/ownership.ts'
  - 'packages/living-docs/{.claude-plugin,hooks,commands,skills,agents}/**'
  - 'packages/living-docs/templates/**'
  - 'bin/**'
  - '.github/workflows/**'
```

`documents:`, `artifacts[].path` and `docs/superpowers/` do not change. `CODEOWNERS`
does not change either.

- [ ] **Step 15: Cover the new glob in an existing test**

In `packages/living-docs/test/docs/release-history.test.ts`, add to the test
`RN-0013: this repository declares what is visible to the consumer` (without creating a
new test, so the count does not change):

```ts
import picomatch from 'picomatch'
```

```ts
test('RN-0013: this repository declares what is visible to the consumer', () => {
  assert.ok(config.consumerVisiblePaths.length > 0, 'consumer-visible-paths empty: CI-6 would be installed and inert')

  // The package is the plugin, but only the plugin surface is public: the list is
  // explicit, and a wildcard over the whole package would pull in src/ and test/.
  const visivel = picomatch(config.consumerVisiblePaths)

  for (const path of [
    'packages/living-docs/.claude-plugin/plugin.json',
    'packages/living-docs/hooks/run-hook.sh',
    'packages/living-docs/commands/adr.md',
    'packages/living-docs/skills/decision-recorder/SKILL.md',
    'packages/living-docs/agents/decision-adversary.md',
    'packages/living-docs/templates/adr.md',
    'packages/living-docs/src/cli/index.ts',
  ]) {
    assert.ok(visivel(path), `${path} should be visible to the consumer`)
  }
  for (const path of ['packages/living-docs/src/core/roots.ts', 'packages/living-docs/test/smoke.test.ts', 'packages/living-docs/package.json']) {
    assert.equal(visivel(path), false, `${path} is not public surface`)
  }
})
```

- [ ] **Step 16: See the green, with the same count**

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
git hash-object docs/contracts/checks.gen.md
npm run lint:check 2>&1 | tail -2
```

Expected:
- two `npm test` blocks: living-docs with **548 tests, 548 pass**; ownership
  with **167, 167 pass**;
- `typecheck` with no error in both packages;
- `validate` with the four baseline lines, identical (no
  violation, 1 generated, 7 paths, 14 links);
- `drift` with no violation and hash `6d6030f810f62510db0c772145e24daaef3ab193`;
- lint with **28 errors**, the same files as before, now under `packages/living-docs/`.

If the count drops, some test file stopped matching the glob: check with
`git status` that nothing was left outside `packages/living-docs/test/`. If a test
changed **result**, that is a defect of the migration: stop and investigate.

- [ ] **Step 17: Commit**

```bash
git add -A
git status --short | grep -v '^R ' | head -40   # review: only the modified/created ones listed above
git commit -F - <<'EOF'
refactor(ADR-0025): move living-docs to packages/living-docs

git mv of src/, test/, templates/ and the contents of plugin/ to the package
root: the plugin directory becomes the package one. The root becomes the private
workspace `esliph`, and the package declares its own dependencies with its own
lockfile. run-hook.sh goes up one level, CI-10 reads skills/ from the toolkit root, the
dogfooding tests find the checkout through checkoutRoot() (RNF-0003) and
docs/.ownership.yml rewrites the paths one to one.

Docs: none — moving files does not change what the code does; the watched paths changed place, not rule.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

`HK-5` will ask about a watched path without the owning document. The answer
for this commit is the label above (spec §8, `ADR-0010`).

---

### Task 2: Root, CI, Docker and wrapper

**Files:**
- Modify: `packages/living-docs/test/plugin/wrapper-docker.test.ts` (CLI assertion)
- Modify: `bin/living-docs`, `bin/dev` (comments only), `compose.yaml`, `Dockerfile`
- Modify: `.github/workflows/living-docs.yml`, `.github/workflows/wrapper-docker.yml`

**Interfaces:**
- Consumes: `checkoutRoot()` (Task 1), already used in `wrapper-docker.test.ts`.
- Produces: the CLI invoked from outside as `node packages/living-docs/src/cli/index.ts`. Tasks 3 and 6 use this path.

- [ ] **Step 1: Failing test**

In `packages/living-docs/test/plugin/wrapper-docker.test.ts`, in the test
`RNF-0006: bin/living-docs delegates to bin/dev, with no container logic of its own`:

```ts
  assert.match(wrapper, /node\s+packages\/living-docs\/src\/cli\/index\.ts/, 'and it is it, not bin/dev, that knows the CLI')
```

Do not change the assertion about `bin/dev` (`doesNotMatch(/src\/cli\/index\.ts/)`), which
remains valid.

- [ ] **Step 2: See it fail**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "✖|^ℹ (tests|fail)"
```

Expected: 1 failure, `RNF-0006: bin/living-docs delegates to bin/dev…`.

- [ ] **Step 3: `bin/living-docs`**

```bash
#!/usr/bin/env bash
# Runs the toolkit CLI through the optional containerized path (RNF-0006).
# Delegation, not implementation: all the conversation with the daemon lives in bin/dev, and
# a second place that had it would be a second place to diverge (ADR-0016).
#
# On the host, the equivalent command is `node packages/living-docs/src/cli/index.ts …`,
# run from the checkout root, and it is the one CI reproduces on every PR (RNF-0002).
exec "$(dirname "${BASH_SOURCE[0]}")/dev" node packages/living-docs/src/cli/index.ts "$@"
```

Edit with the edit tool, without recreating the file, so the `100755` mode is
kept. Check with `git ls-files -s bin/living-docs`.

- [ ] **Step 4: `bin/dev`, only the comments that became false**

Line 10: `plugin/hooks/run-hook.sh invokes node directly.` becomes
`packages/living-docs/hooks/run-hook.sh invokes node directly.`

Lines 14-16, the comment above `ROOT=`:

```bash
# One level above bin/ — the same derivation that
# packages/living-docs/hooks/run-hook.sh does to find the plugin root
# (ADR-0003: the root comes from the path of the file itself, never from the
# working directory of whoever called).
```

No line of `bin/dev` code changes. `npm ci` stays at the root, and the workspace
hoist keeps the `node_modules/yaml` that the bootstrap looks for.

- [ ] **Step 5: `compose.yaml` and `Dockerfile`**

`compose.yaml`, in `environment`:

```yaml
      LIVING_DOCS_TOOLKIT_ROOT: /opt/living-docs/packages/living-docs
```

The volume keeps mounting the checkout at `/opt/living-docs`.

`Dockerfile`: the `ENV` says the same, so that a `docker run` without compose does not
point the toolkit at the checkout root (spec §6 only mentions compose, but leaving
the two divergent would be the trap):

```dockerfile
ENV LIVING_DOCS_TOOLKIT_ROOT=/opt/living-docs/packages/living-docs \
    LIVING_DOCS_REPO_ROOT=/workspace
```

- [ ] **Step 6: `.github/workflows/living-docs.yml`**

Remove the steps `Tests — @esliph/ownership` and `Type-check — @esliph/ownership`,
because the root `npm test` and `npm run typecheck` already do the fan-out. Replace
`node src/cli/index.ts` with `node packages/living-docs/src/cli/index.ts` in the four
steps (`validate`, `validate --base`, `drift`, `changelog`). The rest does not change.

- [ ] **Step 7: `.github/workflows/wrapper-docker.yml`**

In the `&wrapper-paths` anchor, after `'package-lock.json'`:

```yaml
      - 'packages/*/package.json'
      - 'packages/*/package-lock.json'
```

In the last step:

```yaml
        run: bin/dev node packages/living-docs/src/cli/index.ts validate
```

- [ ] **Step 8: See the green**

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
```

Expected: 548/548 and 167/167, and `validate` and `drift` equal to the baseline.
If Docker is available, also run `bin/dev npm test` and
`bin/living-docs validate`. The PR's CI runs both anyway, and
Task 6 requires the green result.

- [ ] **Step 9: Commit**

```bash
git add bin/living-docs bin/dev compose.yaml Dockerfile .github/workflows/living-docs.yml .github/workflows/wrapper-docker.yml packages/living-docs/test/plugin/wrapper-docker.test.ts
git commit -F - <<'EOF'
ci(RNF-0006): CI, compose and wrapper point to packages/living-docs

The main workflow loses the separate ownership steps (the root npm test and
typecheck do the fan-out) and calls the CLI by the new path. The compose file and
the image point LIVING_DOCS_TOOLKIT_ROOT at the package, and bin/living-docs
invokes the CLI from there. The wrapper-docker now runs when the package
manifests change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

The `CHANGELOG.md` entry that `bin/**` and `.github/workflows/**` demand travels in
Task 3, in the same PR. `CI-6` judges the PR, not the commit. The Definition
of Done line about the workflow does not change, because the commands it runs are the same.

---

### Task 3: Living documents and CHANGELOG

**Files:**
- Modify: `CLAUDE.md:19`, `CONTRIBUTING.md:24-25,40`, `README.md:20,32-33,43-47,76-77,82,136`, `CHANGELOG.md` (`[Unreleased]` section → `### Changed`)

**Interfaces:**
- Consumes: the CLI path from Task 2.

- [ ] **Step 1: `CLAUDE.md`**

In the execution policy line, replace `` `node src/cli/index.ts …` `` with
`` `node packages/living-docs/src/cli/index.ts …` ``. `npm ci`, `npm test` and
`npm run typecheck` stay the same, and now run both packages.

- [ ] **Step 2: `CONTRIBUTING.md`**

In the two command blocks, `node src/cli/index.ts` becomes
`node packages/living-docs/src/cli/index.ts` (lines 24, 25 and 40). Do not write
anything new that matches the `pay-when` of `TDR-0002` beyond what already exists; it is
`paid`, but there is no reason to touch it there.

- [ ] **Step 3: `README.md`** (`audience: external`: no artifact ID)

- Line 20: `` `node src/cli/index.ts` `` → `` `node packages/living-docs/src/cli/index.ts` ``.
- Lines 32-33, 43-47, 76-77 and 136: the same, in each occurrence.
- Line 82: `` `plugin/` brings skills, commands and hooks. `` becomes:

```markdown
`packages/living-docs/` is, at the same time, the CLI package and the plugin: it brings
skills, commands and hooks, and the code that the hooks execute.
```

Then realign the command table:

```bash
npx prettier --write README.md
git diff --stat README.md
```

- [ ] **Step 4: `CHANGELOG.md`** (`audience: external`: no artifact ID)

In `## [Unreleased]`, at the top of the `### Changed` section that already exists:

```markdown
- The toolkit now lives in `packages/living-docs/`, and that directory is at the same
  time the package and the Claude Code plugin. Whoever invokes the CLI from a clone now
  calls it through `node packages/living-docs/src/cli/index.ts`, always from the checkout
  root. The plugin now brings, in its own directory, the code and the
  dependencies that the hooks execute. Files already seeded by `init` do not
  change, because the installed workflow command comes from `--invoke`.
```

- [ ] **Step 5: What is left out, on purpose**

These files also cite paths that cease to exist. **Do not edit them in this
task.** They go as a pending item in the PR description (Task 6):

- `docs/charter/constitution.md:22` cites `test/plugin/manifest.test.ts`. Changing
  the Constitution text is an amendment: it goes through the `charter-keeper`, with an amendment log,
  and the acceptance is human.
- `docs/requirements/{functional,non-functional,rules}.md` cite
  `templates/requirements.md` as the format. Spec §7 does not list them, and editing an
  artifact requires a commit that cites an ID declared in each file (`CI-9`).
- ADRs and old specs/plans are a historical record (spec §7) and are not edited.

- [ ] **Step 6: See the green**

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
node packages/living-docs/src/cli/index.ts changelog --base master
npx prettier --check CLAUDE.md CONTRIBUTING.md README.md CHANGELOG.md
```

Expected: 548/548 and 167/167; `validate` with no violation (`CI-11` confirms that
`README.md` and `CHANGELOG.md` do not cite an ID); `drift` with no violation; `changelog`
with no violation, because the entry covers the visible paths of Tasks 1 and 2;
prettier with no difference.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md CONTRIBUTING.md README.md CHANGELOG.md
git commit -F - <<'EOF'
docs(RNF-0002): CLI and plugin path in the living documents, and CHANGELOG entry

CLAUDE.md, CONTRIBUTING.md and README.md now invoke the CLI through
packages/living-docs/src/cli/index.ts, and the README describes the package as a plugin.
The CHANGELOG records the path change, which is public contract for whoever clones
the toolkit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Cache proof and up-to-date lockfile

A hook fails open and in silence, and that makes a naive proof pass in a vacuum.
That is why the cache test runs the **same** hook twice: without dependencies, the
output must come out empty (that is the control); after `npm ci`, the output must come
out filled. If both come out empty, the test fails.

**Files:**
- Create: `packages/living-docs/test/distribution/plugin-cache.test.ts`
- Create: `packages/living-docs/test/distribution/lockfile.test.ts`

**Interfaces:**
- Consumes: `toolkitRoot()` from `packages/living-docs/src/core/roots.ts`, the Task 1 layout and the `hooks/run-hook.sh` that goes up one level.

- [ ] **Step 1: Lockfile test**

Create `packages/living-docs/test/distribution/lockfile.test.ts`, a mirror of the
`ownership` test:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const PACKAGE_ROOT = toolkitRoot()

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

test('RNF-0002: the package package-lock.json is up to date with package.json', { timeout: 120_000 }, () => {
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))

  try {
    copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(isolated, 'package.json'))
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: isolated, encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(
      packagesOf(join(isolated, 'package-lock.json')),
      packagesOf(join(PACKAGE_ROOT, 'package-lock.json')),
      'Outdated lockfile. Regenerate it outside the workspace: copy package.json to a temporary directory, run `npm install --package-lock-only` and bring the package-lock.json back.',
    )
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: Prove that the lockfile test discriminates**

In `packages/living-docs/package.json`, temporarily replace `"yaml": "^2.6.0"`
with `"yaml": "^2.5.0"` and run:

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "✖|^ℹ (tests|fail)"
```

Expected: FAIL in `the package package-lock.json is up to date`. Undo with
`git checkout packages/living-docs/package.json` and run again: expected PASS.

- [ ] **Step 3: Cache test**

Create `packages/living-docs/test/distribution/plugin-cache.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

/**
 * Simulation of the marketplace cache: Claude Code copies only the plugin
 * directory, installs dependencies from the lockfile that is in it and runs the
 * hooks from there. Nothing else from the checkout arrives (findings 2 to 4 of the ownership
 * core research).
 */
const PACKAGE_ROOT = toolkitRoot()

/** Minimal validated repository: one `watches` rule that HK-4 reminds about. */
const OWNERSHIP = [
  'version: 1',
  'artifacts:',
  '  - id-prefix: RN',
  '    path: docs/requirements/rules.md',
  "    owner: '@team'",
  '    skill: requirements-keeper',
  '    collection: sections',
  'watches:',
  "  - code: 'src/domain/**'",
  '    doc: docs/requirements/rules.md',
  "    reason: 'new behavior demands a rule before the code'",
  '',
].join('\n')

const PAYLOAD = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'src/domain/refund.ts' } })

/**
 * On Windows, the `bash` in the PATH may be the WSL one, which does not see `C:\…`. Claude
 * Code runs hooks in the Git for Windows bash, and that is the one used here.
 */
function bashExecutable(): string | null {
  if (process.platform !== 'win32') {
    return 'bash'
  }
  const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')

  return existsSync(candidate) ? candidate : null
}

/** Copies only what git versions in the package, as the cache does with the plugin. */
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
  const env = { ...process.env, CLAUDE_PROJECT_DIR: project }

  // Nothing from the checkout environment may help the hook find itself.
  delete env.LIVING_DOCS_TOOLKIT_ROOT
  delete env.LIVING_DOCS_REPO_ROOT

  // Absolute path with `/`: bash's `dirname` does not understand `\`. The cwd is the
  // project, as in Claude Code, and not the cache: a wrapper that found itself through the
  // cwd would fail here.
  const script = join(cache, 'hooks', 'run-hook.sh').split(sep).join('/')
  const run = spawnSync(bash, [script, 'hk4-watch-reminder'], { cwd: project, env, input: PAYLOAD, encoding: 'utf8' })

  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

test('RNF-0002: the hook wrapper reaches whoever installs as executable', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('RNF-0002: copied alone into the cache, the plugin installs and the hook answers from there', { timeout: 180_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('no Git for Windows bash: CI (ubuntu) runs this proof')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'living-docs-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'living-docs-project-'))

  try {
    assert.ok(copyVersioned(cache) > 50, 'copy too empty: the cache did not receive the plugin')
    assert.equal(existsSync(join(cache, 'node_modules')), false)
    mkdirSync(join(project, 'docs'), { recursive: true })
    writeFileSync(join(project, 'docs/.ownership.yml'), OWNERSHIP, 'utf8')

    // Control: without dependencies the hook breaks and, by contract, goes silent. If
    // this does not come out empty, the assertion below proves nothing.
    const semDependencias = runHook(bash, cache, project)

    assert.equal(semDependencias.status, 0, 'fails open: exit 0 even when broken')
    assert.equal(semDependencias.stdout.trim(), '', 'without node_modules the hook should go silent')

    const install = spawnSync('npm', ['ci'], { cwd: cache, encoding: 'utf8', shell: true })

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

`test/distribution/internal-trail.test.ts` only scans `src/` strings, so the
comment that cites the research fails nothing.

- [ ] **Step 4: Run and see it pass**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "✖|# SKIP|^ℹ (tests|pass|fail|skipped)"
```

Expected: **551** tests, 551 pass (548 + 3 new), and **0 skipped** on a machine
with Git for Windows. A `skipped` here means the proof did not run: find out
why before moving on.

- [ ] **Step 5: Prove that the cache test discriminates**

In `packages/living-docs/hooks/run-hook.sh`, temporarily replace `/..` with
`/../..` on the `TOOLKIT_ROOT` line (the old error) and run:

```bash
cd packages/living-docs && node --test test/distribution/plugin-cache.test.ts; cd ../..
```

Expected: FAIL in `copied alone into the cache…`, with the message
`empty output is what a broken hook also produces`. Undo with
`git checkout packages/living-docs/hooks/run-hook.sh`, run again and see PASS.

- [ ] **Step 6: Full suite**

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
```

Expected: living-docs 551/551, ownership 167/167, and `typecheck`, `validate` and
`drift` green.

- [ ] **Step 7: Commit**

```bash
git add packages/living-docs/test/distribution/plugin-cache.test.ts packages/living-docs/test/distribution/lockfile.test.ts
git commit -F - <<'EOF'
test(RNF-0002): plugin cache proof and up-to-date package lockfile

Copies only the versioned files of the package into a temporary directory, runs
the hook without dependencies (control: empty output), installs with npm ci from the
package lockfile and demands non-empty output from the same hook, with the cwd in the project
and not in the cache. It also asserts the 100755 mode of the wrapper in the index and that the
package lockfile is up to date with package.json.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Project-name ADR (`draft`)

**Files:**
- Create: `docs/decisions/adr/ADR-00NN-root-project-name-esliph.md`, through `/adr`

- [ ] **Step 1: Open through `/adr`**

Invoke the `/adr` command (skill `decision-recorder`). It is what checks the
next free ID (today the highest is `ADR-0026`; also check `docs/ids-retired.txt`)
and writes the file from `packages/living-docs/templates/adr.md`. Pass
this content:

- **title:** `Project name — esliph root, @esliph/living-docs package`
- **status:** `draft`. Promotion is human, and `HK-3` asks.
- **relates-to:** `[ADR-0014, ADR-0025, RNF-0002]`
- **supersedes:** `ADR-0014`. `ADR-0014` **is not edited**: its `superseded-by` and
  `status` change only when someone accepts this ADR.
- **Context:** `ADR-0014` made `@esliph/living-docs` the name of the project and of the
  package at the same time, when the repository had a single package. `ADR-0025`
  put `packages/ownership` beside it, and the physical slice of the migration moves
  living-docs to `packages/living-docs`. The root stops being a package and becomes
  the workspace that gathers the two. An npm package name is unique per
  `package.json`, and the root and the package cannot have the same name.
- **Alternatives considered:**
  - The root stays `@esliph/living-docs`, and the package gets another name.
    Discarded: the package name is what the consumer installs and cites, and renaming it
    would break a public contract just to accommodate a root that is not published.
  - The root without a `name`. Discarded: npm accepts it, but the lockfile and the workspace
    error messages would show an anonymous project, and the marketplace is already
    called `esliph`.
  - The root `@esliph/monorepo` or `@esliph/root`. Discarded: a scope suggests
    publishing, and the root is `private: true`, never published.
- **Decision:** the repository root becomes `esliph`, private, unscoped, the
  same name as the marketplace. `@esliph/living-docs` remains the name of the
  toolkit package, now in `packages/living-docs/`. The container
  `esliph-living-docs` and the `living-docs` command do not change.
- **Consequences, what is gained:** one name for what is distributed
  (`esliph`, the marketplace and the workspace) and one for each thing that is installed
  (`@esliph/living-docs`, `@esliph/ownership`), with no overlap.
- **Consequences, what is accepted as lost:** `ADR-0014` and the earlier plans
  describe the root as `@esliph/living-docs`. They stay as a record, and whoever reads them
  needs to know that this identity moved to `packages/living-docs/`.

- [ ] **Step 2: Validate**

```bash
node packages/living-docs/src/cli/index.ts validate
```

Expected: no violation. The new ADR is an artifact with an owner, valid frontmatter and a
unique ID. A coherence violation may appear between the `supersedes` of this draft and
the `superseded-by: null` of `ADR-0014`. In that case, **do not edit `ADR-0014`**:
set `supersedes` back to `null`, write in the Context that the decision supersedes
`ADR-0014` once accepted, and report the situation. Linking the two is part of the
promotion, which is human.

- [ ] **Step 3: Commit**

Replace `ADR-00NN` with the ID that `/adr` assigned:

```bash
git add docs/decisions/adr/
git commit -F - <<'EOF'
docs(ADR-00NN): project name — esliph root, @esliph/living-docs package (draft)

Records, for human promotion, the decision that supersedes ADR-0014: the root becomes
the private workspace `esliph`, and @esliph/living-docs remains the package name
in packages/living-docs/.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Final verification and remote install proof

Produces no commit. Produces the PR evidence.

- [ ] **Step 1: Done criterion (spec §9)**

From the checkout root, starting from a clean `npm ci`:

```bash
npm ci
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail|skipped)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts validate --base master
node packages/living-docs/src/cli/index.ts drift
node packages/living-docs/src/cli/index.ts changelog --base master
git hash-object docs/contracts/checks.gen.md
npm run lint:check 2>&1 | tail -2
npx prettier --check .
git ls-files plugin src test templates   # expected: no lines
```

Expected:
- living-docs with 551 tests (the 548 from the baseline plus the 3 new ones), 0 failures and 0
  skipped; ownership with 167/167;
- `validate` with no violation, 1 generated, 7 visible paths and 14 links;
- `validate --base master` with no error: the `Docs: none` of Task 1 covers the half
  of `CI-7` that reads the diff;
- `drift` green and the hash `6d6030f810f62510db0c772145e24daaef3ab193`;
- `changelog --base master` green;
- lint with the same 28 baseline errors;
- `prettier --check` with no new file out of format.

Use the skill `superpowers:verification-before-completion` before declaring
done.

- [ ] **Step 2: Real remote install (manual, not a gate)**

It requires a push, so ask before pushing. Then:

1. Record `claude --version`.
2. In a Claude Code session **outside** this checkout, add the marketplace
   through GitHub (`esliph/living-docs`, on the branch `ref/marketplace-monorepo`) with
   `/plugin marketplace add`, in the ref syntax that the recorded version accepts
   (check in `/plugin` or in the plugin documentation), and install
   `living-docs@esliph`.
3. List the cache at `~/.claude/plugins/cache/esliph/living-docs/0.1.0/` and record
   that `src/`, `hooks/run-hook.sh`, `package-lock.json` and `node_modules/` are
   there.
4. In a scratch project with the `docs/.ownership.yml` from the cache test
   (Task 4), ask Claude Code to edit `src/domain/refund.ts` and
   record the `HK-4` reminder that appears after the edit.
5. Paste the command, the version and the hook output into the PR description.

If the hook does not appear, that does not block the merge (spec §9), but it is a finding:
record in the PR what the cache contained.

- [ ] **Step 3: PR description**

Besides the evidence from Step 2, the description carries:

- the baseline and the final line (counts, `validate`, hash of the generated file);
- that the `Docs: none` of the first commit releases the diff half of `CI-7` for the
  whole PR (spec §8 and §11);
- that `lint:check` already had 28 errors before the change and continues with the same
  28, so the "green lint" criterion of spec §9 is not met because of a prior
  debt;
- the pending items from Task 3, Step 5: `constitution.md:22` (amendment through
  `charter-keeper`) and the `Format: templates/requirements.md` of the three requirements
  documents;
- the `wrapper-docker.yml` green on the PR, which runs because `bin/` and `compose.yaml`
  changed;
- that `.claude-plugin/` now counts as visible to the consumer (Task 1,
  Step 14).
