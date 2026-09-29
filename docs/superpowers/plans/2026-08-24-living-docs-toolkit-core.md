# Living Documentation Toolkit — Core (Phases 0–1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core of the living documentation toolkit — the machine contract (frontmatter + `.ownership.yml`), the `CI-1`/`CI-2` checks, the `SK-0` bootstrap, the `SK-3` skill with its commands, and the `HK-1`/`HK-3` hooks — as a Node.js package that is both a CLI and a Claude Code plugin, developed and run entirely inside a Docker container.

**Architecture:** A single Node 24 package in TypeScript **with no build step** — Node 24 strips types natively, so `src/**/*.ts` runs directly, which gives the hooks a startup of ~150 ms. A shared validation engine (`src/config`, `src/frontmatter`, `src/docs`, `src/ids`) is consumed by two front-ends: the CLI (`src/cli/`, used in CI, where there is no agent) and the hooks (`src/hooks/`, used by the agent). No rule is written twice — it is corollary 4 of the spec ("every CI check mirrors a rule written in a skill") applied to the code itself. The host does not run Node: a long-running container (`living-docs-toolkit`) keeps the repository mounted at `/app`, and thin `bash` wrappers do `docker exec` into it.

**Tech Stack:** Node 24 (native type-stripping, `node:test`, `node:assert/strict`), TypeScript 5.9 in `erasableSyntaxOnly` mode only as a type-checker, `yaml` (frontmatter and config parsing), `picomatch` (globs for `watches`/`cited-by`), Docker + Docker Compose (the only runtime; no `node`/`npm`/`npx` on the host).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` (conceptual context in `LIVING-DOCUMENTATION.md`)

## Global Constraints

These apply to **every** task; each task's requirements include them implicitly.

- **No `node`, `npm`, `npx` or toolchain binary command runs on the host.** Every command in this plan is `docker compose ...`. If a step seems to require Node on the host, it is wrong — the path is `docker compose exec toolkit <command>`.
- **No build step.** No `dist/`, no `tsc` emitting. `tsc --noEmit` is a type-checker only. TypeScript restricted to erasable syntax (`erasableSyntaxOnly`): **no `enum`, no `namespace`, no decorators, no `parameter properties`**. Use `const` objects + union types in place of `enum`.
- **Imports carry the `.ts` extension** (`import { x } from './y.ts'`) — a requirement of the Node loader.
- **Non-functional requirements of the hooks** (spec §7): timeout ≤ 5 s, **fail open** (any error → exit 0 and let it through), **zero network**, and every blocking message names _the source rule, the owning artifact and the valid path_ to do what was intended.
- **A hook never judges** (spec §1, corollary 1). If a hook would need to decide something semantic, it becomes `additionalContext`, never `deny`.
- **Language** (spec §11): identifiers, file names, YAML/JSON keys and IDs in English/neutral; document prose and user-facing messages in **pt-BR**, with correct accents.
- **A commit message that changes an artifact cites the affected ID.**
- **IDs are never recycled** (spec §2). Retired IDs go to `docs/ids-retired.txt`.
- **One artifact, one owner** (spec §1, corollary 3).
- **Scope locked to Phases 0–1** (spec §10): `docs/.ownership.yml`, standard frontmatter, `CI-1`, `CI-2`, CODEOWNERS, `SK-0`, `SK-3`, `HK-1`, `HK-3`, `CM-1`–`CM-3`, `CM-6`. **Outside this plan:** `SK-1`, `SK-2`, `SK-4`–`SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-4`–`HK-7`, `CI-3`–`CI-8`, `CM-4`, `CM-5`, `CM-7`. Do not implement anything from that second list, not even "just the skeleton".

---

## File structure

Each file has one responsibility. The split follows the "semantic vs. mechanical rule" boundary: `src/docs/` and `src/checks/` know what an artifact **is**; `src/cli/` and `src/hooks/` only translate between that and a front-end.

```
Dockerfile                          # single dev/test/CI image (Task 1)
compose.yaml                        # long-running `toolkit` service (Task 1)
package.json  tsconfig.json         # Task 1
.dockerignore  .gitignore           # Task 1

bin/living-docs                     # bash wrapper: host → docker exec → CLI (Task 7)

src/core/types.ts                   # Finding, Severity, Check, CheckContext (Task 5)
src/frontmatter/parse.ts            # YAML block → { data, lines, endLine, body } (Task 2)
src/config/ownership.ts             # .ownership.yml → typed OwnershipConfig (Task 3)
src/docs/schema.ts                  # state machine, required fields, cadence (Task 4)
src/docs/table.ts                   # artifact items in a table (Open Decisions) (Task 4)
src/docs/collect.ts                 # config + FS → ArtifactDoc[] (Task 4)
src/checks/ci1-structure.ts         # CI-1 structure lint (Task 5)
src/checks/ci2-ids.ts               # CI-2 ID lint (Task 6)
src/checks/registry.ts              # ordered list of checks (Task 6)
src/ids/citations.ts                # citation regex, retired IDs (Task 6)
src/cli/index.ts                    # subcommand dispatch (Task 7)
src/cli/validate.ts                 # runs checks, formats, sets exit code (Task 7)
src/cli/init.ts                     # SK-0: idempotent bootstrap (Task 8)
src/cli/report.ts                   # Finding → text formatting (Task 7)
src/hooks/lib/io.ts                 # hook protocol stdin/stdout, fail-open (Task 9)
src/hooks/lib/paths.ts              # host path → repo path (Task 9)
src/hooks/lib/edit.ts               # projects tool_input onto the file; diffs fields (Task 9)
src/hooks/hk1-append-only.ts        # HK-1 (Task 10)
src/hooks/hk3-state-promotion.ts    # HK-3 (Task 11)

templates/ownership.yml             # seed of .ownership.yml (Task 8)
templates/adr.md  templates/tdr.md  # (Task 8)
templates/open-decisions.md         # (Task 8)
templates/CODEOWNERS                # (Task 8)

plugin/.claude-plugin/plugin.json   # plugin manifest (Task 12)
plugin/hooks/hooks.json             # HK-1/HK-3 registration (Task 12)
plugin/hooks/run-hook.sh            # fail-open bash wrapper (Task 12)
plugin/skills/decision-recorder/SKILL.md   # SK-3 (Task 13)
plugin/commands/adr.md              # CM-1 (Task 13)
plugin/commands/open-decision.md    # CM-2 (Task 13)
plugin/commands/debt.md             # CM-3 (Task 13)
plugin/commands/docs-setup.md       # CM-6 (Task 13)

test/helpers/tmp.ts                 # temporary repository for tests (Task 3)
test/**/**.test.ts                  # mirrors src/
.github/workflows/living-docs.yml   # CI running on the same image (Task 14)
docs/.ownership.yml  CODEOWNERS     # dogfooding: the toolkit obeys itself (Task 14)
```

---

### Task 1: Docker environment and package skeleton

Nothing runs without this, and the rest of the plan assumes that `docker compose exec toolkit npm test` works. The container is **long-running** (`sleep infinity`) on purpose: the hooks of Tasks 10–12 depend on `docker exec`, which responds in ~160 ms, whereas `docker compose run` would pay the cost of creating a container on every invocation.

**Files:**

- Create: `Dockerfile`
- Create: `compose.yaml`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.dockerignore`
- Create: `.gitignore`
- Test: `test/smoke.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: the command `docker compose exec toolkit npm test` (used by every following task) and `docker compose exec toolkit npm run typecheck`. Container named `living-docs-toolkit`, repository mounted at `/app`, `node_modules` in a named volume.

- [ ] **Step 1: Create the Dockerfile**

`node_modules` lives in a named volume (the host has no Node and should not see that folder). The `mkdir`+`chown` before `USER node` is what makes the named volume come up with the right owner — without it, the `npm install` of Step 4 fails with `EACCES`.

```dockerfile
FROM node:24-alpine

RUN apk add --no-cache git bash

WORKDIR /app
RUN mkdir -p /app/node_modules && chown -R node:node /app

USER node
ENV LIVING_DOCS_ROOT=/app
CMD ["sleep", "infinity"]
```

- [ ] **Step 2: Create compose.yaml**

```yaml
services:
  toolkit:
    build: .
    container_name: living-docs-toolkit
    working_dir: /app
    user: node
    init: true
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    environment:
      LIVING_DOCS_ROOT: /app
    command: ['sleep', 'infinity']

volumes:
  node_modules:
```

- [ ] **Step 3: Create package.json, tsconfig.json and the ignores**

`"type": "module"` and the `.ts` extensions in imports are required by the Node 24 loader. `erasableSyntaxOnly` is what guarantees at type-check time that no `enum` slipped through (which Node would refuse to run).

`package.json`:

```json
{
  "name": "living-docs-toolkit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "bin": { "living-docs": "./src/cli/index.ts" },
  "scripts": {
    "test": "node --test 'test/**/*.test.ts'",
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

`tsconfig.json`:

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

`.dockerignore`:

```
node_modules
.git
```

`.gitignore`:

```
node_modules/
```

- [ ] **Step 4: Bring up the container and install the dependencies**

```bash
docker compose up -d --build
docker compose exec toolkit npm install
```

Expected: container `living-docs-toolkit` in `running` state (confirm with `docker compose ps`) and `package-lock.json` created at the repository root.

- [ ] **Step 5: Write the smoke test**

It exists to prove that the pipeline `docker compose exec → node --test → .ts file with types` closes end to end. It is the only test in the plan that does not test a spec rule.

`test/smoke.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('the runtime executes TypeScript without a build step', () => {
  const value: { ok: boolean } = { ok: true }
  assert.equal(value.ok, true)
})

test('the repository is mounted at /app', () => {
  assert.equal(process.env.LIVING_DOCS_ROOT, '/app')
})
```

- [ ] **Step 6: Run the tests and the type-check**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: `pass 2`, `fail 0`; type-check with no output (success).

- [ ] **Step 7: Commit**

```bash
git add Dockerfile compose.yaml package.json package-lock.json tsconfig.json .dockerignore .gitignore test/smoke.test.ts
git commit -m "chore: Docker environment and Node package skeleton without a build step"
```

---

### Task 2: Frontmatter parser

It is the central piece of spec §2: without it, every hook and every check would become an ad hoc parser. It needs to return **the line number of each field**, because spec §9 requires the output of the checks to name file and line.

**Files:**

- Create: `src/frontmatter/parse.ts`
- Test: `test/frontmatter/parse.test.ts`

**Interfaces:**

- Consumes: nothing besides `yaml`.
- Produces:
  - `interface Frontmatter { data: Record<string, unknown>; lines: Record<string, number>; endLine: number; body: string; bodyStartLine: number; }`
  - `function parseFrontmatter(source: string): Frontmatter | null` — `null` when there is no valid frontmatter block.
  - `class FrontmatterSyntaxError extends Error { readonly line: number }` — thrown when the block exists but the YAML is invalid.
  - `lines` maps **top-level key → 1-indexed line** in the whole file (not in the block).

- [ ] **Step 1: Write the failing test**

`test/frontmatter/parse.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFrontmatter, FrontmatterSyntaxError } from '../../src/frontmatter/parse.ts'

const DOC = ['---', 'id: ADR-0042', 'title: Event queue', 'status: accepted', 'relates-to: [RN-014, DA-0007]', '---', '', '## Context', 'text', ''].join(
  '\n',
)

test('extracts the data from the YAML block', () => {
  const fm = parseFrontmatter(DOC)
  assert.ok(fm)
  assert.equal(fm.data.id, 'ADR-0042')
  assert.equal(fm.data.status, 'accepted')
  assert.deepEqual(fm.data['relates-to'], ['RN-014', 'DA-0007'])
})

test('maps each top-level key to its 1-indexed line in the file', () => {
  const fm = parseFrontmatter(DOC)
  assert.ok(fm)
  assert.equal(fm.lines.id, 2)
  assert.equal(fm.lines.status, 4)
  assert.equal(fm.lines['relates-to'], 5)
})

test('marks the end of the block and returns the body separately', () => {
  const fm = parseFrontmatter(DOC)
  assert.ok(fm)
  assert.equal(fm.endLine, 6)
  assert.equal(fm.bodyStartLine, 7)
  assert.match(fm.body, /## Context/)
  assert.doesNotMatch(fm.body, /ADR-0042/)
})

test('returns null when the file does not open with ---', () => {
  assert.equal(parseFrontmatter('# Just a title\n'), null)
})

test('returns null when the block never closes', () => {
  assert.equal(parseFrontmatter('---\nid: ADR-1\nno closing\n'), null)
})

test('accepts CRLF and BOM', () => {
  const fm = parseFrontmatter('﻿---\r\nid: ADR-1\r\n---\r\nbody\r\n')
  assert.ok(fm)
  assert.equal(fm.data.id, 'ADR-1')
  assert.equal(fm.lines.id, 2)
})

test('throws FrontmatterSyntaxError with the line when the YAML is invalid', () => {
  const bad = '---\nid: ADR-1\n  : invalid\n---\nbody\n'
  assert.throws(
    () => parseFrontmatter(bad),
    (err: unknown) => err instanceof FrontmatterSyntaxError && err.line >= 1,
  )
})

test('an empty block produces empty data, not an error', () => {
  const fm = parseFrontmatter('---\n---\nbody\n')
  assert.ok(fm)
  assert.deepEqual(fm.data, {})
  assert.equal(fm.endLine, 2)
})
```

- [ ] **Step 2: Run the test to see it fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `Cannot find module '/app/src/frontmatter/parse.ts'`.

- [ ] **Step 3: Implement**

`src/frontmatter/parse.ts`:

```typescript
import YAML from 'yaml'

export interface Frontmatter {
  /** Top-level keys of the YAML block, already parsed. */
  data: Record<string, unknown>
  /** Top-level key → 1-indexed line in the whole file. */
  lines: Record<string, number>
  /** 1-indexed line of the `---` that closes the block. */
  endLine: number
  /** Everything after the block, without the separator. */
  body: string
  /** 1-indexed line where the body starts. */
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

  if (lines.length === 0 || !DELIMITER.test(lines[0] ?? '')) return null

  let endIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (DELIMITER.test(lines[i] ?? '')) {
      endIndex = i
      break
    }
  }
  if (endIndex === -1) return null

  const block = lines.slice(1, endIndex).join('\n')

  let data: Record<string, unknown>
  try {
    data = (YAML.parse(block) ?? {}) as Record<string, unknown>
  } catch (err) {
    const at = err instanceof YAML.YAMLParseError ? (err.linePos?.[0]?.line ?? 1) : 1
    throw new FrontmatterSyntaxError(
      err instanceof Error ? err.message : 'Invalid YAML',
      at + 1, // +1 because the block starts on line 2 of the file
    )
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

- [ ] **Step 4: Run the test to see it pass**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```

Expected: `pass 10`, `fail 0`; type-check clean.

- [ ] **Step 5: Commit**

```bash
git add src/frontmatter/parse.ts test/frontmatter/parse.test.ts
git commit -m "feat: frontmatter parser with per-field line tracking"
```

---

### Task 3: Loader for `docs/.ownership.yml`

It is the "single extension point" of spec §3: hooks and checks know no path at all, they read from here. The loader normalizes the kebab-case keys of the YAML to the camelCase of TypeScript and **validates on entry** — an invalid `.ownership.yml` must produce an error that names the field, not an `undefined` that blows up three modules later.

The `states:` field is a deliberate extension over the spec's example: it lets a project declare the state machine of a prefix the toolkit does not know yet (phases 2+ add `RN`, `RF`, `RNF`) without changing code.

**Files:**

- Create: `src/config/ownership.ts`
- Create: `test/helpers/tmp.ts`
- Test: `test/config/ownership.test.ts`

**Interfaces:**

- Consumes: nothing from the previous modules.
- Produces:
  - `type Collection = 'per-file' | 'table'`
  - `interface ArtifactRule { idPrefix: string; path: string; owner: string; skill: string; appendOnly: boolean; mutableFields: string[]; citedBy: string[]; collection: Collection; states: string[] | null }`
  - `interface GeneratedRule { path: string; command: string }`
  - `interface WatchRule { code: string; doc: string; reason: string | null; consumerVisible: boolean }`
  - `interface OwnershipConfig { version: number; staleAfterMonths: number; artifacts: ArtifactRule[]; generated: GeneratedRule[]; watches: WatchRule[]; consumerVisiblePaths: string[] }`
  - `function parseOwnership(source: string): OwnershipConfig`
  - `function loadOwnership(root: string): OwnershipConfig`
  - `function findArtifactRule(config: OwnershipConfig, repoPath: string): ArtifactRule | null` — matches a repo-relative path to the owning rule; used by `HK-1`/`HK-3`.
  - `class OwnershipError extends Error`
  - `const OWNERSHIP_PATH = 'docs/.ownership.yml'`
- Also produces: `withTempRepo(files, fn)` in `test/helpers/tmp.ts`, used by every following task that touches the filesystem.

- [ ] **Step 1: Write the temporary repository helper**

It is not production code and so has no test of its own; the following tasks exercise it.

`test/helpers/tmp.ts`:

```typescript
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

/** Creates a disposable repository with the given files and removes it at the end. */
export function withTempRepo(files: Record<string, string>, fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'living-docs-'))
  try {
    for (const [relative, content] of Object.entries(files)) {
      const absolute = join(root, relative)
      mkdirSync(dirname(absolute), { recursive: true })
      writeFileSync(absolute, content, 'utf8')
    }
    fn(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}
```

- [ ] **Step 2: Write the failing test**

`test/config/ownership.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseOwnership, loadOwnership, findArtifactRule, OwnershipError, OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const VALID = `
version: 1
stale-after-months: 6

artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team-platform"
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, superseded-by, last-reviewed]
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table

generated:
  - path: docs/contracts/openapi.gen.yaml
    command: npm run gen:openapi

watches:
  - code: "src/domain/**"
    doc: "docs/requirements/"
    reason: "new behavior requires a rule with an ID before the code"
  - code: "src/**"
    doc: "CHANGELOG.md"
    consumer-visible: true

consumer-visible-paths: ["src/api/**"]
`

test('normalizes YAML kebab-case into typed camelCase', () => {
  const config = parseOwnership(VALID)
  assert.equal(config.version, 1)
  assert.equal(config.staleAfterMonths, 6)
  assert.equal(config.artifacts.length, 2)

  const adr = config.artifacts[0]
  assert.ok(adr)
  assert.equal(adr.idPrefix, 'ADR')
  assert.equal(adr.path, 'docs/decisions/adr/')
  assert.equal(adr.owner, '@team-platform')
  assert.equal(adr.appendOnly, true)
  assert.deepEqual(adr.mutableFields, ['status', 'superseded-by', 'last-reviewed'])
  assert.equal(adr.collection, 'per-file')
  assert.equal(adr.states, null)
})

test('applies the defaults of collection, append-only and cited-by', () => {
  const config = parseOwnership(VALID)
  const da = config.artifacts[1]
  assert.ok(da)
  assert.equal(da.collection, 'table')
  assert.equal(da.appendOnly, false)
  assert.deepEqual(da.mutableFields, [])
  assert.deepEqual(da.citedBy, [])
})

test('reads watches and consumer-visible-paths', () => {
  const config = parseOwnership(VALID)
  assert.equal(config.watches.length, 2)
  assert.equal(config.watches[0]?.reason, 'new behavior requires a rule with an ID before the code')
  assert.equal(config.watches[0]?.consumerVisible, false)
  assert.equal(config.watches[1]?.consumerVisible, true)
  assert.deepEqual(config.consumerVisiblePaths, ['src/api/**'])
  assert.equal(config.generated[0]?.command, 'npm run gen:openapi')
})

test('rejects a version other than 1, naming the field', () => {
  assert.throws(
    () => parseOwnership('version: 2\nartifacts: []\n'),
    (err: unknown) => err instanceof OwnershipError && /version/.test(err.message),
  )
})

test('rejects empty artifacts', () => {
  assert.throws(
    () => parseOwnership('version: 1\nartifacts: []\n'),
    (err: unknown) => err instanceof OwnershipError && /artifacts/.test(err.message),
  )
})

test('rejects an id-prefix outside the format', () => {
  const bad = 'version: 1\nartifacts:\n  - id-prefix: adr\n    path: docs/a/\n    owner: "@x"\n    skill: s\n'
  assert.throws(
    () => parseOwnership(bad),
    (err: unknown) => err instanceof OwnershipError && /id-prefix/.test(err.message),
  )
})

test('rejects a duplicated id-prefix — one artifact, one owner', () => {
  const dup = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/a/
    owner: "@x"
    skill: s
  - id-prefix: ADR
    path: docs/b/
    owner: "@y"
    skill: s
`
  assert.throws(
    () => parseOwnership(dup),
    (err: unknown) => err instanceof OwnershipError && /ADR/.test(err.message),
  )
})

test('rejects an owner that does not start with @', () => {
  const bad = 'version: 1\nartifacts:\n  - id-prefix: ADR\n    path: docs/a/\n    owner: platform\n    skill: s\n'
  assert.throws(
    () => parseOwnership(bad),
    (err: unknown) => err instanceof OwnershipError && /owner/.test(err.message),
  )
})

test('accepts states declared by the project', () => {
  const src =
    'version: 1\nartifacts:\n  - id-prefix: RN\n    path: docs/requirements/\n    owner: "@product"\n    skill: requirements-keeper\n    states: [draft, active, revoked]\n'
  assert.deepEqual(parseOwnership(src).artifacts[0]?.states, ['draft', 'active', 'revoked'])
})

test('loadOwnership reads from disk and errors with the path when absent', () => {
  withTempRepo({ [OWNERSHIP_PATH]: VALID }, root => {
    assert.equal(loadOwnership(root).artifacts.length, 2)
  })
  withTempRepo({ 'README.md': '' }, root => {
    assert.throws(
      () => loadOwnership(root),
      (err: unknown) => err instanceof OwnershipError && err.message.includes(OWNERSHIP_PATH),
    )
  })
})

test('findArtifactRule matches a file inside a directory and an exact file', () => {
  const config = parseOwnership(VALID)
  assert.equal(findArtifactRule(config, 'docs/decisions/adr/ADR-0001-x.md')?.idPrefix, 'ADR')
  assert.equal(findArtifactRule(config, 'docs/open-decisions.md')?.idPrefix, 'DA')
  assert.equal(findArtifactRule(config, 'src/index.ts'), null)
})
```

- [ ] **Step 3: Run the test to see it fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `Cannot find module '/app/src/config/ownership.ts'`.

- [ ] **Step 4: Implement**

`src/config/ownership.ts`:

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import YAML from 'yaml'

export const OWNERSHIP_PATH = 'docs/.ownership.yml'

export type Collection = 'per-file' | 'table'

export interface ArtifactRule {
  idPrefix: string
  path: string
  owner: string
  skill: string
  appendOnly: boolean
  mutableFields: string[]
  citedBy: string[]
  collection: Collection
  /** State machine declared by the project; null uses the one built into src/docs/schema.ts. */
  states: string[] | null
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

export interface OwnershipConfig {
  version: number
  staleAfterMonths: number
  artifacts: ArtifactRule[]
  generated: GeneratedRule[]
  watches: WatchRule[]
  consumerVisiblePaths: string[]
}

export class OwnershipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OwnershipError'
  }
}

const ID_PREFIX = /^[A-Z]{2,4}$/

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where} must be a map.`)
  }
  return value as Record<string, unknown>
}

function asStringList(value: unknown, where: string): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where} must be a list of strings.`)
  }
  return value as string[]
}

function requireString(source: Record<string, unknown>, key: string, where: string): string {
  const value = source[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where} needs the non-empty field \`${key}\`.`)
  }
  return value
}

function parseArtifact(raw: unknown, index: number): ArtifactRule {
  const where = `artifacts[${index}]`
  const item = asRecord(raw, where)

  const idPrefix = requireString(item, 'id-prefix', where)
  if (!ID_PREFIX.test(idPrefix)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.id-prefix "${idPrefix}" must be 2 to 4 uppercase letters (e.g. ADR, DA, TDR).`)
  }

  const owner = requireString(item, 'owner', where)
  if (!owner.startsWith('@')) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.owner "${owner}" must start with @ and mirror CODEOWNERS.`)
  }

  const collectionRaw = item.collection ?? 'per-file'
  if (collectionRaw !== 'per-file' && collectionRaw !== 'table') {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.collection must be "per-file" or "table".`)
  }

  const states = item.states === undefined ? null : asStringList(item.states, `${where}.states`)

  return {
    idPrefix,
    path: requireString(item, 'path', where),
    owner,
    skill: requireString(item, 'skill', where),
    appendOnly: item['append-only'] === true,
    mutableFields: asStringList(item['mutable-fields'], `${where}.mutable-fields`),
    citedBy: asStringList(item['cited-by'], `${where}.cited-by`),
    collection: collectionRaw,
    states,
  }
}

export function parseOwnership(source: string): OwnershipConfig {
  let raw: unknown
  try {
    raw = YAML.parse(source)
  } catch (err) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: invalid YAML — ${err instanceof Error ? err.message : String(err)}`)
  }

  const root = asRecord(raw, 'root')

  if (root.version !== 1) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: field \`version\` must be 1 (received: ${String(root.version)}).`)
  }

  const artifactsRaw = root.artifacts
  if (!Array.isArray(artifactsRaw) || artifactsRaw.length === 0) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: \`artifacts\` must list at least one artifact — with no declared owner nothing is enforceable.`)
  }

  const artifacts = artifactsRaw.map(parseArtifact)

  const seen = new Set<string>()
  for (const artifact of artifacts) {
    if (seen.has(artifact.idPrefix)) {
      throw new OwnershipError(`${OWNERSHIP_PATH}: id-prefix "${artifact.idPrefix}" declared twice. One artifact, one owner.`)
    }
    seen.add(artifact.idPrefix)
  }

  const generatedRaw = Array.isArray(root.generated) ? root.generated : []
  const generated: GeneratedRule[] = generatedRaw.map((item, index) => {
    const entry = asRecord(item, `generated[${index}]`)
    return {
      path: requireString(entry, 'path', `generated[${index}]`),
      command: requireString(entry, 'command', `generated[${index}]`),
    }
  })

  const watchesRaw = Array.isArray(root.watches) ? root.watches : []
  const watches: WatchRule[] = watchesRaw.map((item, index) => {
    const entry = asRecord(item, `watches[${index}]`)
    const reason = entry.reason
    return {
      code: requireString(entry, 'code', `watches[${index}]`),
      doc: requireString(entry, 'doc', `watches[${index}]`),
      reason: typeof reason === 'string' ? reason : null,
      consumerVisible: entry['consumer-visible'] === true,
    }
  })

  const staleAfterMonths = root['stale-after-months']

  return {
    version: 1,
    staleAfterMonths: typeof staleAfterMonths === 'number' ? staleAfterMonths : 6,
    artifacts,
    generated,
    watches,
    consumerVisiblePaths: asStringList(root['consumer-visible-paths'], 'consumer-visible-paths'),
  }
}

export function loadOwnership(root: string): OwnershipConfig {
  const file = join(root, OWNERSHIP_PATH)
  let source: string
  try {
    source = readFileSync(file, 'utf8')
  } catch {
    throw new OwnershipError(`${OWNERSHIP_PATH} not found in ${root}. Run \`living-docs init\` (owning skill: living-docs-bootstrap).`)
  }
  return parseOwnership(source)
}

/** Owning rule of a path relative to the repository root, or null. */
export function findArtifactRule(config: OwnershipConfig, repoPath: string): ArtifactRule | null {
  const normalized = repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
  for (const artifact of config.artifacts) {
    const target = artifact.path.replace(/\\/g, '/')
    if (target.endsWith('/') ? normalized.startsWith(target) : normalized === target) {
      return artifact
    }
  }
  return null
}
```

- [ ] **Step 5: Run the test to see it pass**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```

Expected: all tests passing; type-check clean.

- [ ] **Step 6: Commit**

```bash
git add src/config/ownership.ts test/config/ownership.test.ts test/helpers/tmp.ts
git commit -m "feat: validated loader for docs/.ownership.yml"
```

---

### Task 4: Artifact schema, item tables and collector

Three files, one responsibility: **what a living documentation artifact is**. `schema.ts` holds the constants that the spec fixes (§2 and §4); `table.ts` handles the case of the "single file with a table" artifact (§3 — Open Decisions), where the IDs live in rows and not in frontmatter; `collect.ts` turns config + filesystem into the list the checks consume. They stay together because they change together: adding an artifact to the spec touches all three.

**Files:**

- Create: `src/docs/schema.ts`
- Create: `src/docs/table.ts`
- Create: `src/docs/collect.ts`
- Test: `test/docs/schema.test.ts`
- Test: `test/docs/table.test.ts`
- Test: `test/docs/collect.test.ts`

**Interfaces:**

- Consumes: `parseFrontmatter`, `Frontmatter`, `FrontmatterSyntaxError` (Task 2); `OwnershipConfig`, `ArtifactRule` (Task 3).
- Produces:
  - `const REQUIRED_FIELDS: readonly string[]` — `['id','title','status','owner','trigger','last-reviewed']`
  - `const CONTAINER_REQUIRED_FIELDS: readonly string[]` — for `collection: 'table'`: `['title','owner','trigger','last-reviewed']`
  - `const MUTABLE_FIELDS_DEFAULT: readonly string[]` — `['status','superseded-by','last-reviewed']`
  - `const STATUS_MACHINE: Readonly<Record<string, readonly string[]>>`
  - `const FROZEN_STATUSES: ReadonlySet<string>`
  - `const HUMAN_PROMOTIONS: readonly { from: string; to: string }[]`
  - `function statesFor(rule: ArtifactRule): readonly string[] | null`
  - `function findCadence(trigger: string): string | null`
  - `function isIsoDate(value: unknown): boolean`
  - `function parseId(value: unknown): { prefix: string; number: number } | null`
  - `interface TableItem { id: string; status: string; line: number }`
  - `function parseItemTable(source: string, startLine: number): TableItem[]`
  - `interface ArtifactDoc { file: string; rule: ArtifactRule; source: string; frontmatter: Frontmatter | null; syntaxError: FrontmatterSyntaxError | null; items: TableItem[] }`
  - `function collectArtifacts(root: string, config: OwnershipConfig): ArtifactDoc[]`

- [ ] **Step 1: Write the failing tests**

`test/docs/schema.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STATUS_MACHINE, FROZEN_STATUSES, HUMAN_PROMOTIONS, REQUIRED_FIELDS, statesFor, findCadence, isIsoDate, parseId } from '../../src/docs/schema.ts'
import type { ArtifactRule } from '../../src/config/ownership.ts'

function rule(overrides: Partial<ArtifactRule> = {}): ArtifactRule {
  return {
    idPrefix: 'ADR',
    path: 'docs/decisions/adr/',
    owner: '@team',
    skill: 'decision-recorder',
    appendOnly: true,
    mutableFields: ['status', 'superseded-by', 'last-reviewed'],
    citedBy: [],
    collection: 'per-file',
    states: null,
    ...overrides,
  }
}

test('the state machine of spec §4 is encoded', () => {
  assert.deepEqual(STATUS_MACHINE.ADR, ['draft', 'accepted', 'superseded'])
  assert.deepEqual(STATUS_MACHINE.DA, ['open', 'resolved', 'dropped'])
  assert.deepEqual(STATUS_MACHINE.TDR, ['open', 'paid', 'accepted-permanently'])
})

test('the frozen states include the five of the spec §7 skeleton', () => {
  for (const status of ['accepted', 'superseded', 'deprecated', 'published', 'paid']) {
    assert.ok(FROZEN_STATUSES.has(status), `${status} should be frozen`)
  }
  assert.equal(FROZEN_STATUSES.has('draft'), false)
  assert.equal(FROZEN_STATUSES.has('open'), false)
})

test('the promotions that require a human act are exactly draft→accepted and open→resolved', () => {
  assert.deepEqual(HUMAN_PROMOTIONS, [
    { from: 'draft', to: 'accepted' },
    { from: 'open', to: 'resolved' },
  ])
})

test('REQUIRED_FIELDS reflects the frontmatter of spec §2', () => {
  assert.deepEqual(REQUIRED_FIELDS, ['id', 'title', 'status', 'owner', 'trigger', 'last-reviewed'])
})

test('statesFor prefers the states declared in .ownership.yml', () => {
  assert.deepEqual(statesFor(rule()), ['draft', 'accepted', 'superseded'])
  assert.deepEqual(statesFor(rule({ states: ['a', 'b'] })), ['a', 'b'])
  assert.equal(statesFor(rule({ idPrefix: 'XX', states: null })), null)
})

test('findCadence rejects the cadence vocabulary of spec §2', () => {
  const rejected = [
    'review quarterly',
    'Monthly',
    'annually',
    'periodically',
    'review on every release',
    'quarterly review',
    'every sprint',
    'every 3 months',
    'every 2 weeks',
  ]
  for (const trigger of rejected) {
    assert.ok(findCadence(trigger) !== null, `should reject: ${trigger}`)
  }
})

test('findCadence accepts triggers that name an observable event', () => {
  const accepted = [
    'in the same PR that changes `src/domain/billing`',
    'when a new error code is added',
    'when an agent errs for lack of context',
    'Never. Immutable once accepted; a new decision supersedes it.',
  ]
  for (const trigger of accepted) {
    assert.equal(findCadence(trigger), null, `should not reject: ${trigger}`)
  }
})

test('isIsoDate accepts an ISO string and a Date, rejects the rest', () => {
  assert.equal(isIsoDate('2026-08-21'), true)
  assert.equal(isIsoDate(new Date('2026-08-21')), true)
  assert.equal(isIsoDate('21/08/2026'), false)
  assert.equal(isIsoDate('2026-13-01'), false)
  assert.equal(isIsoDate(undefined), false)
})

test('parseId splits prefix and number', () => {
  assert.deepEqual(parseId('ADR-0042'), { prefix: 'ADR', number: 42 })
  assert.deepEqual(parseId('DA-007'), { prefix: 'DA', number: 7 })
  assert.equal(parseId('adr-1'), null)
  assert.equal(parseId(42), null)
})
```

`test/docs/table.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseItemTable } from '../../src/docs/table.ts'

const BODY = [
  '# Open Decisions',
  '',
  'Known gaps that block implementation.',
  '',
  '| ID | Gap | Status | Resolved by |',
  '| --- | --- | --- | --- |',
  '| DA-0001 | How to charge a partial refund | open | — |',
  '| DA-0002 | Time zone of the monthly closing | resolved | ADR-0007 |',
  '',
  'Another paragraph.',
].join('\n')

test('extracts id, status and line of each item', () => {
  const items = parseItemTable(BODY, 10)
  assert.equal(items.length, 2)
  assert.deepEqual(items[0], { id: 'DA-0001', status: 'open', line: 16 })
  assert.deepEqual(items[1], { id: 'DA-0002', status: 'resolved', line: 17 })
})

test('stops reading at the end of the table', () => {
  const items = parseItemTable(BODY, 1)
  assert.equal(items.length, 2)
})

test('returns an empty list when there is no table with ID and Status columns', () => {
  assert.deepEqual(parseItemTable('| Term | Definition |\n| --- | --- |\n| x | y |\n', 1), [])
  assert.deepEqual(parseItemTable('no table at all', 1), [])
})

test('ignores rows whose first cell is not an ID', () => {
  const source = '| ID | Status |\n| --- | --- |\n| DA-0001 | open |\n| total | 1 |\n'
  const items = parseItemTable(source, 1)
  assert.equal(items.length, 1)
  assert.equal(items[0]?.id, 'DA-0001')
})
```

`test/docs/collect.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`

const ADR = [
  '---',
  'id: ADR-0001',
  'title: First decision',
  'status: accepted',
  'owner: "@team"',
  'trigger: Never. Immutable once accepted.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '## Context',
].join('\n')

const OPEN_DECISIONS = [
  '---',
  'title: Open Decisions',
  'owner: "@product"',
  'trigger: Whenever someone ran into a gap.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '| ID | Gap | Status | Resolved by |',
  '| --- | --- | --- | --- |',
  '| DA-0001 | Partial refund | open | — |',
].join('\n')

test('collects artifacts by directory and by single file', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0001-first.md': ADR,
      'docs/open-decisions.md': OPEN_DECISIONS,
      'README.md': '# out of scope',
    },
    root => {
      const docs = collectArtifacts(root, parseOwnership(CONFIG))
      const files = docs.map(doc => doc.file).sort()
      assert.deepEqual(files, ['docs/decisions/adr/ADR-0001-first.md', 'docs/open-decisions.md'])

      const adr = docs.find(doc => doc.rule.idPrefix === 'ADR')
      assert.equal(adr?.frontmatter?.data.id, 'ADR-0001')
      assert.deepEqual(adr?.items, [])

      const da = docs.find(doc => doc.rule.idPrefix === 'DA')
      assert.equal(da?.items.length, 1)
      assert.equal(da?.items[0]?.id, 'DA-0001')
      assert.equal(da?.items[0]?.line, 10)
    },
  )
})

test('ignores generated artifacts and non-markdown files', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0001-x.md': ADR,
      'docs/decisions/adr/index.gen.md': '# generated',
      'docs/decisions/adr/note.txt': 'nothing',
      'docs/open-decisions.md': OPEN_DECISIONS,
    },
    root => {
      const files = collectArtifacts(root, parseOwnership(CONFIG)).map(doc => doc.file)
      assert.equal(files.includes('docs/decisions/adr/index.gen.md'), false)
      assert.equal(files.includes('docs/decisions/adr/note.txt'), false)
    },
  )
})

test('a path declared but absent on disk does not break the collection', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG }, root => {
    assert.deepEqual(collectArtifacts(root, parseOwnership(CONFIG)), [])
  })
})

test('invalid frontmatter becomes syntaxError, not an exception', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0002-broken.md': '---\nid: ADR-0002\n  : bad\n---\nbody\n',
    },
    root => {
      const docs = collectArtifacts(root, parseOwnership(CONFIG))
      assert.equal(docs.length, 1)
      assert.equal(docs[0]?.frontmatter, null)
      assert.ok(docs[0]?.syntaxError)
    },
  )
})
```

- [ ] **Step 2: Run the tests to see them fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `src/docs/*.ts` modules do not exist.

- [ ] **Step 3: Implement `src/docs/schema.ts`**

```typescript
import type { ArtifactRule } from '../config/ownership.ts'

/** Required fields of an individual artifact (spec §2). */
export const REQUIRED_FIELDS: readonly string[] = ['id', 'title', 'status', 'owner', 'trigger', 'last-reviewed']

/** Required fields of the container file of a table collection. */
export const CONTAINER_REQUIRED_FIELDS: readonly string[] = ['title', 'owner', 'trigger', 'last-reviewed']

/** Default allowlist of frozen-item mutation (spec §2 and §7). */
export const MUTABLE_FIELDS_DEFAULT: readonly string[] = ['status', 'superseded-by', 'last-reviewed']

/** State machine per prefix (spec §4). Prefixes from phases 2+ come from `states` in .ownership.yml. */
export const STATUS_MACHINE: Readonly<Record<string, readonly string[]>> = Object.freeze({
  ADR: ['draft', 'accepted', 'superseded'],
  DA: ['open', 'resolved', 'dropped'],
  TDR: ['open', 'paid', 'accepted-permanently'],
})

/** "No terminal state allows editing the body" (spec §4). */
export const FROZEN_STATUSES: ReadonlySet<string> = new Set(['accepted', 'superseded', 'deprecated', 'published', 'paid'])

/** "No agent promotes state on its own" (spec §4); it is the trigger of HK-3. */
export const HUMAN_PROMOTIONS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'draft', to: 'accepted' },
  { from: 'open', to: 'resolved' },
])

export function statesFor(rule: ArtifactRule): readonly string[] | null {
  if (rule.states !== null) return rule.states
  return STATUS_MACHINE[rule.idPrefix] ?? null
}

/**
 * Cadence vocabulary forbidden in `trigger` (spec §2 and anti-requirement §13).
 * A valid trigger names an observable event, not a calendar date.
 */
const CADENCE_PATTERNS: readonly RegExp[] = [
  /\b(?:bi|semi)?(?:monthly|quarterly)\b/i,
  /\bon a monthly basis\b/i,
  /\bon a weekly basis\b/i,
  /\bon a daily basis\b/i,
  /\bannual(?:ly)?\b/i,
  /\bperiodic(?:ally)?\b/i,
  /\bcadence\b/i,
  /\bon a recurring basis\b/i,
  /\bquarterly\b/i,
  /\bmonthly\b/i,
  /\bweekly\b/i,
  /\bdaily\b/i,
  /\bannually\b/i,
  /\bperiodically\b/i,
  /\bevery\s+\w+/i,
  /\bsprint\b/i,
  /\bevery\s+(?:month|year|week|sprint)\b/i,
]

/** Returns the excerpt that characterizes cadence, or null. */
export function findCadence(trigger: string): string | null {
  for (const pattern of CADENCE_PATTERNS) {
    const match = pattern.exec(trigger)
    if (match) return match[0]
  }
  return null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const ID = /^([A-Z]{2,4})-(\d{3,4})$/

export function parseId(value: unknown): { prefix: string; number: number } | null {
  if (typeof value !== 'string') return null
  const match = ID.exec(value)
  if (!match?.[1] || !match[2]) return null
  return { prefix: match[1], number: Number.parseInt(match[2], 10) }
}
```

- [ ] **Step 4: Implement `src/docs/table.ts`**

```typescript
const ID_CELL = /^[A-Z]{2,4}-\d{3,4}$/

export interface TableItem {
  id: string
  status: string
  /** 1-indexed line in the whole file. */
  line: number
}

function cells(row: string): string[] {
  const trimmed = row.trim()
  if (!trimmed.startsWith('|')) return []
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

/**
 * Items of an artifact kept as a table (spec §3 — Open Decisions).
 * `startLine` is the 1-indexed line where `source` starts in the file.
 */
export function parseItemTable(source: string, startLine: number): TableItem[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const header = cells(lines[i] ?? '')
    const idColumn = header.findIndex(cell => cell.toLowerCase() === 'id')
    const statusColumn = header.findIndex(cell => cell.toLowerCase() === 'status')
    if (idColumn === -1 || statusColumn === -1) continue
    if (!isSeparator(lines[i + 1] ?? '')) continue

    const items: TableItem[] = []
    for (let j = i + 2; j < lines.length; j++) {
      const row = cells(lines[j] ?? '')
      if (row.length === 0) break
      const id = row[idColumn] ?? ''
      if (!ID_CELL.test(id)) continue
      items.push({
        id,
        status: row[statusColumn] ?? '',
        line: startLine + j,
      })
    }
    return items
  }

  return []
}
```

- [ ] **Step 5: Implement `src/docs/collect.ts`**

```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ArtifactRule, OwnershipConfig } from '../config/ownership.ts'
import { parseFrontmatter, FrontmatterSyntaxError } from '../frontmatter/parse.ts'
import type { Frontmatter } from '../frontmatter/parse.ts'
import { parseItemTable } from './table.ts'
import type { TableItem } from './table.ts'

export interface ArtifactDoc {
  /** Path relative to the repository root, always with `/`. */
  file: string
  rule: ArtifactRule
  source: string
  frontmatter: Frontmatter | null
  syntaxError: FrontmatterSyntaxError | null
  /** Table items when `rule.collection === 'table'`; empty otherwise. */
  items: TableItem[]
}

function listMarkdown(root: string, relativeDir: string): string[] {
  const absolute = join(root, relativeDir)
  let entries: string[]
  try {
    entries = readdirSync(absolute)
  } catch {
    return []
  }

  const found: string[] = []
  for (const entry of entries) {
    const relative = `${relativeDir.replace(/\/$/, '')}/${entry}`
    if (statSync(join(root, relative)).isDirectory()) {
      found.push(...listMarkdown(root, `${relative}/`))
    } else if (entry.endsWith('.md') && !entry.includes('.gen.')) {
      found.push(relative)
    }
  }
  return found
}

function readDoc(root: string, file: string, rule: ArtifactRule): ArtifactDoc | null {
  let source: string
  try {
    source = readFileSync(join(root, file), 'utf8')
  } catch {
    return null
  }

  let frontmatter: Frontmatter | null = null
  let syntaxError: FrontmatterSyntaxError | null = null
  try {
    frontmatter = parseFrontmatter(source)
  } catch (err) {
    if (!(err instanceof FrontmatterSyntaxError)) throw err
    syntaxError = err
  }

  const items =
    rule.collection === 'table' && frontmatter
      ? parseItemTable(frontmatter.body, frontmatter.bodyStartLine)
      : rule.collection === 'table'
        ? parseItemTable(source, 1)
        : []

  return { file, rule, source, frontmatter, syntaxError, items }
}

export function collectArtifacts(root: string, config: OwnershipConfig): ArtifactDoc[] {
  const docs: ArtifactDoc[] = []

  for (const rule of config.artifacts) {
    const target = rule.path.replace(/\\/g, '/')
    const files = target.endsWith('/') ? listMarkdown(root, target) : [target]
    for (const file of files) {
      const doc = readDoc(root, file, rule)
      if (doc) docs.push(doc)
    }
  }

  return docs
}
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```

Expected: all passing; type-check clean.

- [ ] **Step 7: Commit**

```bash
git add src/docs test/docs
git commit -m "feat: artifact schema, item table parser and collector"
```

---

### Task 5: `CI-1` — structure lint

The first check of Phase 0: "without a machine contract, nothing else is enforceable" (spec §10). It fails when the frontmatter is missing/invalid, `status` falls outside the state machine, `owner` is empty, or `trigger` is missing **or describes cadence**.

Every finding names file, line and the fix — a requirement of spec §9 ("the output names the file, the line and the fix").

**Files:**

- Create: `src/core/types.ts`
- Create: `src/checks/ci1-structure.ts`
- Test: `test/checks/ci1-structure.test.ts`

**Interfaces:**

- Consumes: `ArtifactDoc`, `collectArtifacts` (Task 4); all of `schema.ts` (Task 4); `OwnershipConfig` (Task 3).
- Produces:
  - `type Severity = 'error' | 'warning'`
  - `interface Finding { ruleId: string; file: string; line: number; severity: Severity; message: string; fix: string }`
  - `interface CheckContext { root: string; config: OwnershipConfig; docs: ArtifactDoc[] }`
  - `interface Check { id: string; name: string; run(context: CheckContext): Finding[] }`
  - `const ci1Structure: Check` (`id: 'CI-1'`)

- [ ] **Step 1: Write the failing test**

`test/checks/ci1-structure.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci1Structure } from '../../src/checks/ci1-structure.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { Finding } from '../../src/core/types.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`

function adr(fields: Record<string, string>, body = '\n## Context\n'): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`)
  return ['---', ...lines, '---', body].join('\n')
}

const GOOD_ADR = adr({
  id: 'ADR-0001',
  title: 'Event queue',
  status: 'accepted',
  owner: '"@team"',
  trigger: 'Never. Immutable once accepted; a new decision supersedes it.',
  'last-reviewed': '2026-08-21',
})

const GOOD_DA = [
  '---',
  'title: Open Decisions',
  'owner: "@product"',
  'trigger: Whenever someone ran into a gap.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '| ID | Gap | Status |',
  '| --- | --- | --- |',
  '| DA-0001 | Partial refund | open |',
].join('\n')

function run(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, root => {
    const config = parseOwnership(CONFIG)
    findings = ci1Structure.run({
      root,
      config,
      docs: collectArtifacts(root, config),
    })
  })
  return findings
}

test('well-formed artifacts produce no finding', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-queue.md': GOOD_ADR,
      'docs/open-decisions.md': GOOD_DA,
    }),
    [],
  )
})

test('missing frontmatter fails on line 1', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': '# No frontmatter\n',
  })
  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'CI-1')
  assert.equal(findings[0]?.line, 1)
  assert.equal(findings[0]?.severity, 'error')
  assert.match(findings[0]?.message ?? '', /frontmatter/i)
})

test('invalid YAML in the block fails without bringing the check down', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': '---\nid: ADR-0001\n  : bad\n---\n',
  })
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /YAML|invalid/i)
})

test('each missing required field becomes a finding', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      status: 'draft',
    }),
  })
  const missing = findings.filter(f => /required/i.test(f.message)).map(f => f.message)
  for (const field of ['title', 'owner', 'trigger', 'last-reviewed']) {
    assert.ok(
      missing.some(m => m.includes(field)),
      `should report ${field}`,
    )
  }
})

test('status outside the state machine fails on the field line', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'approved',
      owner: '"@team"',
      trigger: 'Never.',
      'last-reviewed': '2026-08-21',
    }),
  })
  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.line, 4)
  assert.match(findings[0]?.message ?? '', /status/)
  assert.match(findings[0]?.fix ?? '', /draft.*accepted.*superseded/)
})

test('trigger with cadence fails naming the field and the term — acceptance criterion 3', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'review quarterly',
      'last-reviewed': '2026-08-21',
    }),
  })
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /trigger/)
  assert.match(findings[0]?.message ?? '', /quarterly/i)
  assert.equal(findings[0]?.line, 6)
})

test('owner without @ and last-reviewed outside ISO fail', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: 'team',
      trigger: 'Never.',
      'last-reviewed': '21/08/2026',
    }),
  })
  assert.equal(findings.length, 2)
  assert.ok(findings.some(f => /owner/.test(f.message)))
  assert.ok(findings.some(f => /last-reviewed/.test(f.message)))
})

test('an id that does not match the artifact prefix fails', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'TDR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'Never.',
      'last-reviewed': '2026-08-21',
    }),
  })
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR/)
})

test('table collection: the container does not require an id, but each item requires a valid status', () => {
  const bad = GOOD_DA.replace('| DA-0001 | Partial refund | open |', '| DA-0001 | Partial refund | pending |')
  const findings = run({ 'docs/open-decisions.md': bad })
  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.line, 10)
  assert.match(findings[0]?.message ?? '', /DA-0001/)
  assert.match(findings[0]?.fix ?? '', /open.*resolved.*dropped/)
})

test('a prefix without a declared state machine fails asking for `states`', () => {
  const config = `
version: 1
artifacts:
  - id-prefix: XX
    path: docs/x/
    owner: "@team"
    skill: s
`
  let findings: Finding[] = []
  withTempRepo(
    {
      [OWNERSHIP_PATH]: config,
      'docs/x/XX-0001-a.md': adr({
        id: 'XX-0001',
        title: 'x',
        status: 'draft',
        owner: '"@team"',
        trigger: 'Never.',
        'last-reviewed': '2026-08-21',
      }),
    },
    root => {
      const parsed = parseOwnership(config)
      findings = ci1Structure.run({
        root,
        config: parsed,
        docs: collectArtifacts(root, parsed),
      })
    },
  )
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.fix ?? '', /states/)
})
```

- [ ] **Step 2: Run the test to see it fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `Cannot find module '/app/src/checks/ci1-structure.ts'`.

- [ ] **Step 3: Implement `src/core/types.ts`**

```typescript
import type { OwnershipConfig } from '../config/ownership.ts'
import type { ArtifactDoc } from '../docs/collect.ts'

export type Severity = 'error' | 'warning'

export interface Finding {
  /** ID of the check that produced the finding, e.g. 'CI-1'. */
  ruleId: string
  /** Path relative to the repository root. */
  file: string
  /** 1-indexed line; 0 when the finding has no line. */
  line: number
  severity: Severity
  /** What is wrong. */
  message: string
  /** The valid path to fix it. */
  fix: string
}

export interface CheckContext {
  root: string
  config: OwnershipConfig
  docs: ArtifactDoc[]
}

export interface Check {
  id: string
  name: string
  run(context: CheckContext): Finding[]
}
```

- [ ] **Step 4: Implement `src/checks/ci1-structure.ts`**

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { ArtifactDoc } from '../docs/collect.ts'
import { REQUIRED_FIELDS, CONTAINER_REQUIRED_FIELDS, findCadence, isIsoDate, parseId, statesFor } from '../docs/schema.ts'

const RULE = 'CI-1'

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

function checkDoc(doc: ArtifactDoc): Finding[] {
  const findings: Finding[] = []

  if (doc.syntaxError) {
    return [
      error(
        doc.file,
        doc.syntaxError.line,
        `Frontmatter with invalid YAML: ${doc.syntaxError.message}`,
        'Fix the YAML block between the `---` at the top of the file.',
      ),
    ]
  }

  const frontmatter = doc.frontmatter
  if (!frontmatter) {
    return [
      error(
        doc.file,
        1,
        'Frontmatter missing — every living documentation artifact opens with the standard YAML block.',
        'Add `id`, `title`, `status`, `owner`, `trigger` and `last-reviewed` between `---` at the top (spec §2).',
      ),
    ]
  }

  const { data, lines } = frontmatter
  const lineOf = (field: string): number => lines[field] ?? 1
  const isContainer = doc.rule.collection === 'table'
  const required = isContainer ? CONTAINER_REQUIRED_FIELDS : REQUIRED_FIELDS

  for (const field of required) {
    if (!isFilled(data[field])) {
      findings.push(
        error(
          doc.file,
          frontmatter.endLine,
          `Required field \`${field}\` missing or empty.`,
          `Fill in \`${field}\` in the frontmatter (owning skill: ${doc.rule.skill}).`,
        ),
      )
    }
  }

  if (!isContainer && isFilled(data.id)) {
    const parsed = parseId(data.id)
    if (!parsed) {
      findings.push(
        error(doc.file, lineOf('id'), `\`id\` "${String(data.id)}" outside the format <PREFIX>-<number>.`, `Use ${doc.rule.idPrefix}-0001 (spec §8).`),
      )
    } else if (parsed.prefix !== doc.rule.idPrefix) {
      findings.push(
        error(
          doc.file,
          lineOf('id'),
          `\`id\` uses the prefix ${parsed.prefix}, but ${doc.rule.path} is the territory of ${doc.rule.idPrefix}.`,
          `Rename to ${doc.rule.idPrefix}-... or move the file to the owning artifact.`,
        ),
      )
    }
  }

  const states = statesFor(doc.rule)
  if (!isContainer && isFilled(data.status)) {
    if (!states) {
      findings.push(
        error(
          doc.file,
          lineOf('status'),
          `Prefix ${doc.rule.idPrefix} has no declared state machine.`,
          `Declare \`states:\` for this artifact in docs/.ownership.yml.`,
        ),
      )
    } else if (!states.includes(String(data.status))) {
      findings.push(
        error(
          doc.file,
          lineOf('status'),
          `\`status\` "${String(data.status)}" outside the state machine of ${doc.rule.idPrefix}.`,
          `Valid states: ${states.join(' → ')} (spec §4).`,
        ),
      )
    }
  }

  if (isFilled(data.owner) && !String(data.owner).startsWith('@')) {
    findings.push(
      error(
        doc.file,
        lineOf('owner'),
        `\`owner\` "${String(data.owner)}" must start with @ and mirror CODEOWNERS.`,
        'Use the handle of a person or team, e.g. "@team-platform".',
      ),
    )
  }

  if (isFilled(data.trigger)) {
    const cadence = findCadence(String(data.trigger))
    if (cadence) {
      findings.push(
        error(
          doc.file,
          lineOf('trigger'),
          `\`trigger\` describes cadence ("${cadence}") instead of an observable event.`,
          'Name the event: "in the same PR that changes src/domain/billing", "when a new error code is added" (spec §2, mechanism 2).',
        ),
      )
    }
  }

  if (isFilled(data['last-reviewed']) && !isIsoDate(data['last-reviewed'])) {
    findings.push(
      error(
        doc.file,
        lineOf('last-reviewed'),
        `\`last-reviewed\` "${String(data['last-reviewed'])}" is not an ISO date.`,
        'Use YYYY-MM-DD, and only touch this field if you actually reviewed the document (spec §2).',
      ),
    )
  }

  if (isContainer && states) {
    for (const item of doc.items) {
      if (!states.includes(item.status)) {
        findings.push(
          error(
            doc.file,
            item.line,
            `Item ${item.id} with status "${item.status}" outside the state machine of ${doc.rule.idPrefix}.`,
            `Valid states: ${states.join(' → ')} (spec §4).`,
          ),
        )
      }
    }
  }

  return findings
}

export const ci1Structure: Check = {
  id: RULE,
  name: 'structure lint',
  run(context: CheckContext): Finding[] {
    return context.docs.flatMap(checkDoc)
  },
}
```

- [ ] **Step 5: Run the test to see it pass**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```

Expected: all passing; type-check clean.

- [ ] **Step 6: Commit**

```bash
git add src/core/types.ts src/checks/ci1-structure.ts test/checks/ci1-structure.test.ts
git commit -m "feat: CI-1 structure lint with rejection of cadence triggers"
```

---

### Task 6: `CI-2` — ID lint, citations and check registry

Materializes mechanism 3 (ID traceability) in the part that is purely syntactic: duplicate ID, out-of-sequence ID, ID recycled from `docs/ids-retired.txt`, and a citation that does not resolve.

Important scope decision: `CI-2` **only validates citations of prefixes declared in `.ownership.yml`**. A citation to `RN-014` in a repository that has not yet installed Phase 2 is ignored, not an error — this is what allows installing the toolkit in phases without false positives.

**Files:**

- Create: `src/ids/citations.ts`
- Create: `src/checks/ci2-ids.ts`
- Create: `src/checks/registry.ts`
- Test: `test/ids/citations.test.ts`
- Test: `test/checks/ci2-ids.test.ts`

**Interfaces:**

- Consumes: `Check`, `CheckContext`, `Finding` (Task 5); `ArtifactDoc` (Task 4); `parseId` (Task 4).
- Produces:
  - `const RETIRED_IDS_PATH = 'docs/ids-retired.txt'`
  - `interface Citation { id: string; line: number }`
  - `function findCitations(source: string): Citation[]`
  - `function loadRetiredIds(root: string): Set<string>`
  - `const ci2Ids: Check` (`id: 'CI-2'`)
  - `const CHECKS: readonly Check[]` in `registry.ts` — the ordered list the CLI runs.

- [ ] **Step 1: Write the failing tests**

`test/ids/citations.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findCitations, loadRetiredIds, RETIRED_IDS_PATH } from '../../src/ids/citations.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('finds citations with a 1-indexed line', () => {
  const source = ['# Title', '', 'Supersedes ADR-0031 and closes DA-0007.', 'Cites TDR-003 as well.'].join('\n')
  assert.deepEqual(findCitations(source), [
    { id: 'ADR-0031', line: 3 },
    { id: 'DA-0007', line: 3 },
    { id: 'TDR-003', line: 4 },
  ])
})

test('ignores what is not citation syntax', () => {
  assert.deepEqual(findCitations('UTF-8 and ISO-8601 and adr-0001 and ADR-12'), [])
})

test('loadRetiredIds reads the registry ignoring comments and blank lines', () => {
  withTempRepo({ [RETIRED_IDS_PATH]: '# retired\nADR-0002\n\nDA-0005\n' }, root => {
    const retired = loadRetiredIds(root)
    assert.equal(retired.has('ADR-0002'), true)
    assert.equal(retired.has('DA-0005'), true)
    assert.equal(retired.size, 2)
  })
})

test('absence of the registry returns an empty set', () => {
  withTempRepo({ 'README.md': '' }, root => {
    assert.equal(loadRetiredIds(root).size, 0)
  })
})
```

`test/checks/ci2-ids.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci2Ids } from '../../src/checks/ci2-ids.ts'
import { CHECKS } from '../../src/checks/registry.ts'
import { collectArtifacts } from '../../src/docs/collect.ts'
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { RETIRED_IDS_PATH } from '../../src/ids/citations.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { Finding } from '../../src/core/types.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`

function adr(id: string, body = ''): string {
  return ['---', `id: ${id}`, 'title: Decision', 'status: draft', 'owner: "@team"', 'trigger: Never.', 'last-reviewed: 2026-08-21', '---', '', body].join('\n')
}

function openDecisions(rows: string[]): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@product"',
    'trigger: Whenever someone ran into a gap.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '| ID | Gap | Status | Resolved by |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n')
}

function run(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, root => {
    const config = parseOwnership(CONFIG)
    findings = ci2Ids.run({
      root,
      config,
      docs: collectArtifacts(root, config),
    })
  })
  return findings
}

test('an intact sequence and citations that resolve produce no finding', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Closes DA-0001.'),
      'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002'),
      'docs/open-decisions.md': openDecisions(['| DA-0001 | Gap | resolved | ADR-0001 |']),
    }),
    [],
  )
})

test('duplicate ID fails naming both files', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0001-b.md': adr('ADR-0001'),
    'docs/open-decisions.md': openDecisions([]),
  })
  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'CI-2')
  assert.match(findings[0]?.message ?? '', /ADR-0001/)
  assert.match(findings[0]?.message ?? '', /ADR-0001-a\.md/)
})

test('an ID present in ids-retired.txt reappearing fails', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'ADR-0001\n',
  })
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /recycled|retired/i)
})

test('a gap in the sequence fails pointing at the retired registry', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003'),
    'docs/open-decisions.md': openDecisions([]),
  })
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0002/)
  assert.equal(findings[0]?.file, RETIRED_IDS_PATH)
})

test('a gap explained by ids-retired.txt does not fail', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
      'docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003'),
      'docs/open-decisions.md': openDecisions([]),
      [RETIRED_IDS_PATH]: 'ADR-0002\n',
    }),
    [],
  )
})

test('a citation that does not resolve fails on the citation line', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Supersedes ADR-0099.'),
    'docs/open-decisions.md': openDecisions([]),
  })
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0099/)
  assert.equal(findings[0]?.file, 'docs/decisions/adr/ADR-0001-a.md')
})

test('a citation to a retired ID fails', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'See DA-0001.'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'DA-0001\n',
  })
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /DA-0001/)
  assert.match(findings[0]?.message ?? '', /retired/i)
})

test('a citation of an undeclared prefix is ignored — installation in phases', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Implements RN-014 and RF-002.'),
      'docs/open-decisions.md': openDecisions([]),
    }),
    [],
  )
})

test('the registry exposes CI-1 and CI-2 in that order', () => {
  assert.deepEqual(
    CHECKS.map(check => check.id),
    ['CI-1', 'CI-2'],
  )
})
```

- [ ] **Step 2: Run the tests to see them fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — modules `src/ids/citations.ts` and `src/checks/ci2-ids.ts` do not exist.

- [ ] **Step 3: Implement `src/ids/citations.ts`**

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const RETIRED_IDS_PATH = 'docs/ids-retired.txt'

/** Single citation syntax (spec §8): <PREFIX>-<number>. */
const CITATION = /\b([A-Z]{2,4})-(\d{3,4})\b/g

export interface Citation {
  id: string
  /** 1-indexed line within `source`. */
  line: number
}

export function findCitations(source: string): Citation[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const citations: Citation[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    for (const match of line.matchAll(CITATION)) {
      citations.push({ id: match[0], line: i + 1 })
    }
  }

  return citations
}

/** Retired IDs — they can never reappear (spec §2). */
export function loadRetiredIds(root: string): Set<string> {
  let source: string
  try {
    source = readFileSync(join(root, RETIRED_IDS_PATH), 'utf8')
  } catch {
    return new Set()
  }

  const retired = new Set<string>()
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    retired.add(line)
  }
  return retired
}
```

- [ ] **Step 4: Implement `src/checks/ci2-ids.ts`**

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { parseId } from '../docs/schema.ts'
import { findCitations, loadRetiredIds, RETIRED_IDS_PATH } from '../ids/citations.ts'

const RULE = 'CI-2'

interface Declaration {
  id: string
  file: string
  line: number
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function collectDeclarations(context: CheckContext): Declaration[] {
  const declarations: Declaration[] = []

  for (const doc of context.docs) {
    if (doc.rule.collection === 'table') {
      for (const item of doc.items) {
        declarations.push({
          id: item.id,
          file: doc.file,
          line: item.line,
        })
      }
      continue
    }
    const id = doc.frontmatter?.data.id
    if (typeof id === 'string' && parseId(id)) {
      declarations.push({
        id,
        file: doc.file,
        line: doc.frontmatter?.lines.id ?? 1,
      })
    }
  }

  return declarations
}

export const ci2Ids: Check = {
  id: RULE,
  name: 'ID lint',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const retired = loadRetiredIds(context.root)
    const declarations = collectDeclarations(context)

    const byId = new Map<string, Declaration>()
    for (const declaration of declarations) {
      const previous = byId.get(declaration.id)
      if (previous) {
        findings.push(
          error(
            declaration.file,
            declaration.line,
            `ID ${declaration.id} duplicated — already declared in ${previous.file}:${previous.line}.`,
            'An ID identifies a single item. Pick the next free number in the sequence.',
          ),
        )
        continue
      }
      byId.set(declaration.id, declaration)

      if (retired.has(declaration.id)) {
        findings.push(
          error(
            declaration.file,
            declaration.line,
            `ID ${declaration.id} is in ${RETIRED_IDS_PATH} and cannot be recycled.`,
            'Use the next free number; retired IDs never come back (spec §2).',
          ),
        )
      }
    }

    // Contiguous sequence per prefix, counting the retired ones.
    const known = new Set(context.config.artifacts.map(artifact => artifact.idPrefix))
    const numbersByPrefix = new Map<string, Set<number>>()
    for (const id of [...byId.keys(), ...retired]) {
      const parsed = parseId(id)
      if (!parsed || !known.has(parsed.prefix)) continue
      const numbers = numbersByPrefix.get(parsed.prefix) ?? new Set<number>()
      numbers.add(parsed.number)
      numbersByPrefix.set(parsed.prefix, numbers)
    }

    for (const [prefix, numbers] of numbersByPrefix) {
      const highest = Math.max(...numbers)
      for (let n = 1; n <= highest; n++) {
        if (numbers.has(n)) continue
        const missing = `${prefix}-${String(n).padStart(4, '0')}`
        findings.push(
          error(
            RETIRED_IDS_PATH,
            0,
            `The ${prefix} sequence has a gap: ${missing} neither exists nor is retired.`,
            `If the item was removed, record \`${missing}\` in ${RETIRED_IDS_PATH}; otherwise, renumber without skipping.`,
          ),
        )
      }
    }

    // Citations must resolve to an existing, non-retired ID.
    for (const doc of context.docs) {
      const declaredHere = new Set(declarations.filter(declaration => declaration.file === doc.file).map(d => d.id))
      for (const citation of findCitations(doc.source)) {
        const parsed = parseId(citation.id)
        if (!parsed || !known.has(parsed.prefix)) continue
        if (declaredHere.has(citation.id)) continue
        if (byId.has(citation.id) && !retired.has(citation.id)) continue

        findings.push(
          error(
            doc.file,
            citation.line,
            retired.has(citation.id)
              ? `Citation of ${citation.id}, which is retired.`
              : `Citation of ${citation.id}, which does not resolve to any existing artifact.`,
            `Cite an existing ID or create the artifact (owning skill: ${doc.rule.skill}).`,
          ),
        )
      }
    }

    return findings
  },
}
```

- [ ] **Step 5: Implement `src/checks/registry.ts`**

```typescript
import type { Check } from '../core/types.ts'
import { ci1Structure } from './ci1-structure.ts'
import { ci2Ids } from './ci2-ids.ts'

/** Checks of Phases 0–1, in the order the CLI runs them. */
export const CHECKS: readonly Check[] = [ci1Structure, ci2Ids]
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```

Expected: all passing; type-check clean.

- [ ] **Step 7: Commit**

```bash
git add src/ids src/checks/ci2-ids.ts src/checks/registry.ts test/ids test/checks/ci2-ids.test.ts
git commit -m "feat: CI-2 ID lint with sequence, retired IDs and citations"
```

---

### Task 7: CLI `living-docs validate` and the host wrapper

It is the enforcement that "survives someone editing through the browser" (spec §1): it runs in CI, with no agent present. The `bin/living-docs` wrapper exists because the host has no Node — it only forwards arguments and stdin into the already-running container.

**Files:**

- Create: `src/cli/report.ts`
- Create: `src/cli/validate.ts`
- Create: `src/cli/index.ts`
- Create: `bin/living-docs`
- Test: `test/cli/report.test.ts`
- Test: `test/cli/validate.test.ts`

**Interfaces:**

- Consumes: `CHECKS` (Task 6); `loadOwnership`, `OwnershipError` (Task 3); `collectArtifacts` (Task 4); `Finding` (Task 5).
- Produces:
  - `function formatFindings(findings: readonly Finding[]): string`
  - `interface ValidateResult { findings: Finding[]; errors: number; warnings: number; exitCode: number }`
  - `function runValidate(root: string): ValidateResult` — `exitCode` 0 with no errors, 1 with at least one `severity: 'error'`.
  - Executable `src/cli/index.ts` with the subcommands `validate` (this task) and `init` (Task 8); exit 2 for invalid usage or missing `.ownership.yml`.

- [ ] **Step 1: Write the failing tests**

`test/cli/report.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatFindings } from '../../src/cli/report.ts'
import type { Finding } from '../../src/core/types.ts'

const FINDING: Finding = {
  ruleId: 'CI-1',
  file: 'docs/decisions/adr/ADR-0001-x.md',
  line: 6,
  severity: 'error',
  message: '`trigger` describes cadence ("quarterly").',
  fix: 'Name the observable event.',
}

test('names file, line, rule and fix', () => {
  const output = formatFindings([FINDING])
  assert.match(output, /docs\/decisions\/adr\/ADR-0001-x\.md:6/)
  assert.match(output, /CI-1/)
  assert.match(output, /error/)
  assert.match(output, /quarterly/)
  assert.match(output, /Name the observable event\./)
})

test('omits the line when it is 0', () => {
  const output = formatFindings([{ ...FINDING, line: 0 }])
  assert.match(output, /ADR-0001-x\.md\s/)
  assert.doesNotMatch(output, /ADR-0001-x\.md:0/)
})

test('summarizes the count by severity', () => {
  const output = formatFindings([FINDING, { ...FINDING, severity: 'warning' }])
  assert.match(output, /1 error/)
  assert.match(output, /1 warning/)
})

test('with no findings, reports that everything is fine', () => {
  assert.match(formatFindings([]), /no violations/i)
})
```

`test/cli/validate.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runValidate } from '../../src/cli/validate.ts'
import { OWNERSHIP_PATH, OwnershipError } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
`

const GOOD = [
  '---',
  'id: ADR-0001',
  'title: Event queue',
  'status: draft',
  'owner: "@team"',
  'trigger: Never. Immutable once accepted.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '## Context',
].join('\n')

test('a conforming repository exits with 0', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, 'docs/decisions/adr/ADR-0001-a.md': GOOD }, root => {
    const result = runValidate(root)
    assert.deepEqual(result.findings, [])
    assert.equal(result.exitCode, 0)
  })
})

test('an error from any check leads to exit 1', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0001-a.md': GOOD.replace('status: draft', 'status: approved'),
    },
    root => {
      const result = runValidate(root)
      assert.equal(result.errors, 1)
      assert.equal(result.exitCode, 1)
      assert.equal(result.findings[0]?.ruleId, 'CI-1')
    },
  )
})

test('runs all the checks in the registry, not just the first', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0001-a.md': GOOD,
      'docs/decisions/adr/ADR-0003-c.md': GOOD.replace('ADR-0001', 'ADR-0003'),
    },
    root => {
      const result = runValidate(root)
      assert.ok(result.findings.some(finding => finding.ruleId === 'CI-2'))
    },
  )
})

test('a missing .ownership.yml propagates OwnershipError', () => {
  withTempRepo({ 'README.md': '' }, root => {
    assert.throws(() => runValidate(root), OwnershipError)
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `Cannot find module '/app/src/cli/report.ts'`.

- [ ] **Step 3: Implement `src/cli/report.ts`**

```typescript
import type { Finding } from '../core/types.ts'

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function formatFindings(findings: readonly Finding[]): string {
  if (findings.length === 0) {
    return 'living-docs: no violations found.'
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
  lines.push(`living-docs: ${plural(errors, 'error', 'errors')}, ${plural(warnings, 'warning', 'warnings')}.`)

  return lines.join('\n')
}
```

- [ ] **Step 4: Implement `src/cli/validate.ts`**

```typescript
import { loadOwnership } from '../config/ownership.ts'
import { collectArtifacts } from '../docs/collect.ts'
import { CHECKS } from '../checks/registry.ts'
import type { Finding } from '../core/types.ts'

export interface ValidateResult {
  findings: Finding[]
  errors: number
  warnings: number
  exitCode: number
}

export function runValidate(root: string): ValidateResult {
  const config = loadOwnership(root)
  const docs = collectArtifacts(root, config)
  const context = { root, config, docs }

  const findings = CHECKS.flatMap(check => check.run(context))
  const errors = findings.filter(finding => finding.severity === 'error').length

  return {
    findings,
    errors,
    warnings: findings.length - errors,
    exitCode: errors > 0 ? 1 : 0,
  }
}
```

- [ ] **Step 5: Implement `src/cli/index.ts`**

The `init` subcommand is implemented in Task 8; until then it is already routed and answers with a "not implemented" error, which keeps this file stable between the two tasks.

```typescript
#!/usr/bin/env node
import { runValidate } from './validate.ts'
import { formatFindings } from './report.ts'
import { OwnershipError } from '../config/ownership.ts'

const USAGE = `living-docs <command>

  validate    Runs the living documentation checks (CI-1, CI-2)
  init        Creates the living documentation frame (owning skill: living-docs-bootstrap)

Options of init:
  --owner <@handle>   Default owner of the created artifacts
  --dry-run           Shows what it would do, without writing
`

function main(argv: readonly string[]): number {
  const root = process.env.LIVING_DOCS_ROOT ?? process.cwd()
  const command = argv[0]

  if (command === undefined || command === '--help' || command === '-h') {
    process.stdout.write(USAGE)
    return command === undefined ? 2 : 0
  }

  try {
    if (command === 'validate') {
      const result = runValidate(root)
      process.stdout.write(`${formatFindings(result.findings)}\n`)
      return result.exitCode
    }

    if (command === 'init') {
      process.stderr.write('living-docs: `init` not implemented yet.\n')
      return 2
    }
  } catch (err) {
    if (err instanceof OwnershipError) {
      process.stderr.write(`living-docs: ${err.message}\n`)
      return 2
    }
    throw err
  }

  process.stderr.write(`living-docs: unknown command "${command}".\n\n${USAGE}`)
  return 2
}

process.exitCode = main(process.argv.slice(2))
```

- [ ] **Step 6: Write the `bin/living-docs` wrapper**

It exits with 2 (and not 0) when the container is down: the CLI is enforcement, and enforcement that fails silently is worse than no enforcement. It is the **hooks** that fail open (Task 12) — the asymmetry is deliberate.

```bash
#!/usr/bin/env bash
# Host → container bridge. The host does not run Node: all the work happens
# inside `living-docs-toolkit`, with the repository mounted at /app.
set -euo pipefail

CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"

if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "living-docs: the container '$CONTAINER' is not running. Bring it up with: docker compose up -d" >&2
  exit 2
fi

exec docker exec -i -e LIVING_DOCS_ROOT=/app "$CONTAINER" node /app/src/cli/index.ts "$@"
```

Make it executable:

```bash
chmod +x bin/living-docs
```

- [ ] **Step 7: Run the tests and exercise the CLI end to end**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs --help
./bin/living-docs validate; echo "exit=$?"
```

Expected: tests passing; `--help` printing the usage; `validate` exiting with `exit=2` and the message that `docs/.ownership.yml` was not found (the repository has not been initialized yet — that is Task 8).

- [ ] **Step 8: Commit**

```bash
git add src/cli bin/living-docs test/cli
git commit -m "feat: CLI living-docs validate and bash bridge to the container"
```

---

### Task 8: `SK-0` — templates and `living-docs init`

The bootstrap of spec §5. The rule that defines this task is the first of the `SK-0` procedure: **take inventory before creating** — if `docs/adr/` or `adr/` already exists, the toolkit adopts that path in `.ownership.yml` instead of creating a parallel one. "Duplication is the most expensive anti-pattern on the list."

Idempotence is a requirement of the spec: running twice does not duplicate a file, does not rewrite existing content, does not renumber an ID.

**Files:**

- Create: `templates/ownership.yml`
- Create: `templates/open-decisions.md`
- Create: `templates/ids-retired.txt`
- Create: `templates/adr.md`
- Create: `templates/tdr.md`
- Create: `templates/CODEOWNERS`
- Create: `src/cli/init.ts`
- Modify: `src/cli/index.ts` (route of the `init` subcommand)
- Test: `test/cli/init.test.ts`

**Interfaces:**

- Consumes: `OWNERSHIP_PATH` (Task 3); `RETIRED_IDS_PATH` (Task 6).
- Produces:
  - `interface InitOptions { owner: string; dryRun: boolean }`
  - `interface InitResult { created: string[]; skipped: string[]; adopted: { idPrefix: string; path: string }[] }`
  - `function runInit(root: string, options: InitOptions): InitResult`
  - `const DEFAULT_PATHS: Readonly<Record<'ADR' | 'DA' | 'TDR', string>>`

- [ ] **Step 1: Write the templates**

`templates/ownership.yml` (the `{{...}}` are replaced by `runInit`):

```yaml
# The only file specific to this project. Hooks and checks know no
# path at all — they read from here. Source rule: LIVING-DOCUMENTATION-TOOLKIT.md §3.
version: 1
stale-after-months: 6

artifacts:
  - id-prefix: ADR
    path: { { ADR_PATH } }
    owner: '{{OWNER}}'
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, superseded-by, last-reviewed]

  - id-prefix: DA
    path: { { DA_PATH } }
    owner: '{{OWNER}}'
    skill: decision-recorder
    collection: table

  - id-prefix: TDR
    path: { { TDR_PATH } }
    owner: '{{OWNER}}'
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, last-reviewed]

generated: []

# Phases 3+ fill in `watches` (code → owning doc). Empty in Phases 0–1.
watches: []

consumer-visible-paths: []
```

`templates/open-decisions.md`:

```markdown
---
title: Open Decisions
owner: '{{OWNER}}'
trigger: >
  Whenever someone ran into a gap — behavior with no written rule.
last-reviewed: { { TODAY } }
---

# Open Decisions

What has **not** been decided yet. While an item is here, it has no rule
and **must not be implemented** — the output is the ID, not the code.

| ID  | Gap | Status | Resolved by | Opened on |
| --- | --- | ------ | ----------- | --------- |
```

`templates/ids-retired.txt`:

```
# Retired IDs. They are never recycled (LIVING-DOCUMENTATION-TOOLKIT.md §2).
# One ID per line.
```

`templates/adr.md`:

```markdown
---
id: { { ID } }
title: { { TITLE } }
status: draft
owner: '{{OWNER}}'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: { { TODAY } }
relates-to: []
supersedes: null
superseded-by: null
---

# {{ID}} — {{TITLE}}

## Context

<!-- What force created the need for the decision. Without narrating the code. -->

## Alternatives considered

<!-- At least two, with the real reason each one was discarded. -->

## Decision

<!-- What was decided, in one affirmative sentence. -->

## Consequences

### What is gained

### What we accept losing

<!-- Mandatory. An ADR with no declared negative consequence is propaganda. -->
```

`templates/tdr.md`:

```markdown
---
id: { { ID } }
title: { { TITLE } }
status: open
owner: '{{OWNER}}'
trigger: >
  When the payment trigger below is met.
last-reviewed: { { TODAY } }
relates-to: []
---

# {{ID}} — {{TITLE}}

## The shortcut

<!-- What was done, deliberately, below the standard. -->

## Why it was accepted

## Payment trigger

<!-- It must be observable: "when the volume passes X", "in the first PR
     that touches this module". "When there is time" is not a trigger. -->

## Cost of continuing to owe
```

`templates/CODEOWNERS`:

```
# Mirrors the `owner` field of docs/.ownership.yml. One artifact, one owner.
{{ADR_PATH}}    {{OWNER}}
{{DA_PATH}}    {{OWNER}}
{{TDR_PATH}}    {{OWNER}}
docs/.ownership.yml    {{OWNER}}
```

- [ ] **Step 2: Write the failing test**

`test/cli/init.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInit } from '../../src/cli/init.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { RETIRED_IDS_PATH } from '../../src/ids/citations.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OPTIONS = { owner: '@team-platform', dryRun: false }

test('creates the frame of phases 0–1 in an empty repository — acceptance criterion 1', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    const result = runInit(root, OPTIONS)

    for (const path of [OWNERSHIP_PATH, RETIRED_IDS_PATH, 'docs/open-decisions.md', 'CODEOWNERS']) {
      assert.ok(existsSync(join(root, path)), `${path} should exist`)
      assert.ok(result.created.includes(path))
    }
    assert.ok(existsSync(join(root, 'docs/decisions/adr')))
    assert.ok(existsSync(join(root, 'docs/decisions/debt')))

    const config = readFileSync(join(root, OWNERSHIP_PATH), 'utf8')
    assert.match(config, /@team-platform/)
    assert.doesNotMatch(config, /\{\{/)
  })
})

test('the freshly initialized repository passes its own validate', () => {
  withTempRepo({ 'README.md': '' }, root => {
    runInit(root, OPTIONS)
    const result = runValidate(root)
    assert.deepEqual(result.findings, [])
    assert.equal(result.exitCode, 0)
  })
})

test('is idempotent: the second run neither recreates nor rewrites anything', () => {
  withTempRepo({ 'README.md': '' }, root => {
    runInit(root, OPTIONS)
    writeFileSync(join(root, 'docs/open-decisions.md'), 'USER CONTENT\n', 'utf8')

    const second = runInit(root, OPTIONS)
    assert.deepEqual(second.created, [])
    assert.deepEqual(second.adopted, [], 'the second run reads the paths from .ownership.yml, it does not re-adopt')
    assert.ok(second.skipped.includes('docs/open-decisions.md'))
    assert.equal(readFileSync(join(root, 'docs/open-decisions.md'), 'utf8'), 'USER CONTENT\n')
  })
})

test('adopts a preexisting ADR directory instead of creating a parallel one', () => {
  withTempRepo({ 'docs/adr/0001-old.md': '# old\n' }, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.adopted.some(entry => entry.idPrefix === 'ADR' && entry.path === 'docs/adr/'))
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false)
    assert.match(readFileSync(join(root, OWNERSHIP_PATH), 'utf8'), /path: docs\/adr\//)
  })
})

test('adopts a preexisting open decisions file under another name', () => {
  withTempRepo({ 'docs/pending-decisions.md': '# open\n', 'README.md': '' }, root => {
    const result = runInit(root, OPTIONS)
    assert.ok(result.adopted.some(entry => entry.path === 'docs/pending-decisions.md'))
  })
})

test('dry-run writes nothing but reports what it would do', () => {
  withTempRepo({ 'README.md': '' }, root => {
    const result = runInit(root, { owner: '@team', dryRun: true })
    assert.ok(result.created.includes(OWNERSHIP_PATH))
    assert.equal(existsSync(join(root, OWNERSHIP_PATH)), false)
  })
})
```

- [ ] **Step 3: Run the test to see it fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `Cannot find module '/app/src/cli/init.ts'`.

- [ ] **Step 4: Implement `src/cli/init.ts`**

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { OWNERSHIP_PATH, loadOwnership } from '../config/ownership.ts'
import type { OwnershipConfig } from '../config/ownership.ts'
import { RETIRED_IDS_PATH } from '../ids/citations.ts'

const TEMPLATES_DIR = join(import.meta.dirname, '..', '..', 'templates')

export const DEFAULT_PATHS: Readonly<Record<'ADR' | 'DA' | 'TDR', string>> = Object.freeze({
  ADR: 'docs/decisions/adr/',
  DA: 'docs/open-decisions.md',
  TDR: 'docs/decisions/debt/',
})

/**
 * Paths where an equivalent artifact may already exist under another name.
 * Adopt what exists; never create a parallel one (spec §5, SK-0 step 1).
 */
const ADOPTION_CANDIDATES: Readonly<Record<'ADR' | 'DA' | 'TDR', readonly string[]>> = Object.freeze({
  ADR: ['docs/adr/', 'adr/', 'doc/adr/', 'docs/architecture/decisions/'],
  DA: ['docs/pending-decisions.md', 'docs/open-questions.md', 'docs/decision-backlog.md'],
  TDR: ['docs/debt/', 'docs/tech-debt/', 'docs/debts/'],
})

export interface InitOptions {
  owner: string
  dryRun: boolean
}

export interface InitResult {
  created: string[]
  skipped: string[]
  adopted: { idPrefix: string; path: string }[]
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function template(name: string, values: Record<string, string>): string {
  let source = readFileSync(join(TEMPLATES_DIR, name), 'utf8')
  for (const [key, value] of Object.entries(values)) {
    source = source.replaceAll(`{{${key}}}`, value)
  }
  return source
}

/**
 * Idempotence (spec §5): if `.ownership.yml` already exists, the paths come from it —
 * a second run must not reinterpret the structure that the first one created.
 */
function resolvePath(root: string, kind: 'ADR' | 'DA' | 'TDR', existing: OwnershipConfig | null, result: InitResult): string {
  const declared = existing?.artifacts.find(artifact => artifact.idPrefix === kind)
  if (declared) return declared.path

  for (const candidate of ADOPTION_CANDIDATES[kind]) {
    if (existsSync(join(root, candidate))) {
      result.adopted.push({ idPrefix: kind, path: candidate })
      return candidate
    }
  }
  return DEFAULT_PATHS[kind]
}

function writeIfAbsent(root: string, relative: string, content: string, options: InitOptions, result: InitResult): void {
  if (existsSync(join(root, relative))) {
    result.skipped.push(relative)
    return
  }
  result.created.push(relative)
  if (options.dryRun) return

  const absolute = join(root, relative)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, content, 'utf8')
}

function ensureDirectory(root: string, relative: string, options: InitOptions, result: InitResult): void {
  if (existsSync(join(root, relative))) {
    result.skipped.push(relative)
    return
  }
  result.created.push(relative)
  if (options.dryRun) return

  mkdirSync(join(root, relative), { recursive: true })
  writeFileSync(join(root, relative, '.gitkeep'), '', 'utf8')
}

export function runInit(root: string, options: InitOptions): InitResult {
  const result: InitResult = { created: [], skipped: [], adopted: [] }

  let existing: OwnershipConfig | null = null
  try {
    existing = loadOwnership(root)
  } catch {
    existing = null // first run, or unreadable configuration
  }

  const adrPath = resolvePath(root, 'ADR', existing, result)
  const daPath = resolvePath(root, 'DA', existing, result)
  const tdrPath = resolvePath(root, 'TDR', existing, result)

  const values = {
    OWNER: options.owner,
    TODAY: today(),
    ADR_PATH: adrPath,
    DA_PATH: daPath,
    TDR_PATH: tdrPath,
  }

  writeIfAbsent(root, OWNERSHIP_PATH, template('ownership.yml', values), options, result)
  writeIfAbsent(root, RETIRED_IDS_PATH, template('ids-retired.txt', values), options, result)
  writeIfAbsent(root, daPath, template('open-decisions.md', values), options, result)
  writeIfAbsent(root, 'CODEOWNERS', template('CODEOWNERS', values), options, result)
  ensureDirectory(root, adrPath, options, result)
  ensureDirectory(root, tdrPath, options, result)

  return result
}
```

- [ ] **Step 5: Wire the `init` subcommand into the CLI**

In `src/cli/index.ts`, add the import and replace the `if (command === 'init')` block with:

```typescript
if (command === 'init') {
  const ownerIndex = argv.indexOf('--owner')
  const owner = ownerIndex === -1 ? '@owners' : (argv[ownerIndex + 1] ?? '@owners')
  const result = runInit(root, { owner, dryRun: argv.includes('--dry-run') })

  for (const entry of result.adopted) {
    process.stdout.write(`adopted   ${entry.path}  (${entry.idPrefix} — already existed; no parallel created)\n`)
  }
  for (const path of result.created) process.stdout.write(`created   ${path}\n`)
  for (const path of result.skipped) process.stdout.write(`kept      ${path}\n`)
  if (result.created.length === 0) process.stdout.write('living-docs: nothing to create; the frame already exists.\n')
  return 0
}
```

And the import at the top:

```typescript
import { runInit } from './init.ts'
```

- [ ] **Step 6: Run the tests and exercise `init` end to end**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs init --dry-run --owner "@esliph/engineering"
```

Expected: tests passing; `--dry-run` listing the files it would create, without writing any.

- [ ] **Step 7: Commit**

```bash
git add templates src/cli/init.ts src/cli/index.ts test/cli/init.test.ts
git commit -m "feat: SK-0 idempotent living-docs init with adoption of existing artifacts"
```

---

### Task 9: Hooks library — protocol, paths and edit projection

Three utilities that `HK-1` and `HK-3` share. The subtlest is `applyToolInput`: instead of trying to guess the intent of an `Edit` from `old_string`/`new_string`, it **projects the edit onto the current content in memory** and compares the two documents. This keeps the hooks strictly mechanical — they compare frontmatter, they do not interpret intent (spec §1, corollary 1).

`toRepoPath` exists because the agent runs on the host and sends host paths (`/mnt/c/.../repo/docs/...`), while the hook runs in the container and sees `/app/docs/...`.

**Files:**

- Create: `src/hooks/lib/paths.ts`
- Create: `src/hooks/lib/io.ts`
- Create: `src/hooks/lib/edit.ts`
- Test: `test/hooks/lib/paths.test.ts`
- Test: `test/hooks/lib/edit.test.ts`

**Interfaces:**

- Consumes: `parseFrontmatter` (Task 2).
- Produces:
  - `function toRepoPath(filePath: string, roots: readonly string[]): string | null`
  - `interface HookEnv { root: string; hostRoots: readonly string[] }`
  - `function hookEnv(): HookEnv` — reads `LIVING_DOCS_ROOT` and `LIVING_DOCS_HOST_ROOT`
  - `interface HookPayload { tool_name?: string; tool_input?: Record<string, unknown> }`
  - `function readPayload(): Promise<HookPayload | null>`
  - `function denyOutput(reason: string): string`
  - `function askOutput(reason: string): string`
  - `function emit(output: string | null): void`
  - `function applyToolInput(current: string, toolInput: Record<string, unknown>): string | null`
  - `interface DocumentDiff { changedFields: string[]; bodyChanged: boolean }`
  - `function diffDocument(before: string, after: string): DocumentDiff`

- [ ] **Step 1: Write the failing tests**

`test/hooks/lib/paths.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toRepoPath } from '../../../src/hooks/lib/paths.ts'

const ROOTS = ['/app', '/mnt/c/Users/dev/repo']

test('converts a host path into a repository path', () => {
  assert.equal(toRepoPath('/mnt/c/Users/dev/repo/docs/a.md', ROOTS), 'docs/a.md')
})

test('converts a container path', () => {
  assert.equal(toRepoPath('/app/docs/a.md', ROOTS), 'docs/a.md')
})

test('normalizes Windows separators and ./', () => {
  assert.equal(toRepoPath('C:\\Users\\dev\\repo\\docs\\a.md', ['C:/Users/dev/repo']), 'docs/a.md')
  assert.equal(toRepoPath('./docs/a.md', ROOTS), 'docs/a.md')
})

test('a relative path passes straight through', () => {
  assert.equal(toRepoPath('docs/a.md', ROOTS), 'docs/a.md')
})

test('an absolute path outside any root returns null', () => {
  assert.equal(toRepoPath('/etc/passwd', ROOTS), null)
})

test('the root itself is not a file inside it', () => {
  assert.equal(toRepoPath('/app', ROOTS), null)
})
```

`test/hooks/lib/edit.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyToolInput, diffDocument } from '../../../src/hooks/lib/edit.ts'

const DOC = ['---', 'id: ADR-0001', 'status: accepted', 'superseded-by: null', '---', '', '## Context', 'original text'].join('\n')

test('Write returns the whole content', () => {
  assert.equal(applyToolInput(DOC, { content: 'new' }), 'new')
})

test('Edit projects the replacement onto the current content', () => {
  const result = applyToolInput(DOC, {
    old_string: 'original text',
    new_string: 'new text',
  })
  assert.match(result ?? '', /new text/)
  assert.doesNotMatch(result ?? '', /original text/)
})

test('Edit with replace_all replaces every occurrence', () => {
  const result = applyToolInput('a a a', {
    old_string: 'a',
    new_string: 'b',
    replace_all: true,
  })
  assert.equal(result, 'b b b')
})

test('Edit whose old_string does not exist returns null — it cannot be predicted', () => {
  assert.equal(applyToolInput(DOC, { old_string: 'nonexistent', new_string: 'x' }), null)
})

test('tool_input with neither content nor old_string returns null', () => {
  assert.equal(applyToolInput(DOC, {}), null)
})

test('diffDocument isolates changed fields from a changed body', () => {
  const after = DOC.replace('status: accepted', 'status: superseded').replace('superseded-by: null', 'superseded-by: ADR-0002')
  assert.deepEqual(diffDocument(DOC, after), {
    changedFields: ['status', 'superseded-by'],
    bodyChanged: false,
  })
})

test('diffDocument detects a body change', () => {
  const after = DOC.replace('original text', 'tampered text')
  const diff = diffDocument(DOC, after)
  assert.deepEqual(diff.changedFields, [])
  assert.equal(diff.bodyChanged, true)
})

test('an added or removed field counts as a changed field', () => {
  const added = DOC.replace('status: accepted', 'status: accepted\nlast-reviewed: 2026-08-24')
  assert.deepEqual(diffDocument(DOC, added).changedFields, ['last-reviewed'])
  const removed = DOC.replace('superseded-by: null\n', '')
  assert.deepEqual(diffDocument(DOC, removed).changedFields, ['superseded-by'])
})

test('a whitespace-only difference at the end of the body does not count', () => {
  assert.equal(diffDocument(DOC, `${DOC}\n\n`).bodyChanged, false)
})

test('losing the frontmatter counts as a changed body', () => {
  assert.equal(diffDocument(DOC, '# no frontmatter').bodyChanged, true)
})
```

- [ ] **Step 2: Run the tests to see them fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — modules `src/hooks/lib/*.ts` do not exist.

- [ ] **Step 3: Implement `src/hooks/lib/paths.ts`**

```typescript
function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

/**
 * Path relative to the repository root, or null if the file is outside it.
 * `roots` carries the container root and the host root, in that order of preference.
 */
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

- [ ] **Step 4: Implement `src/hooks/lib/io.ts`**

```typescript
export interface HookEnv {
  /** Repository root inside the container. */
  root: string
  /** Roots recognized in `file_path`: the container's and the host's. */
  hostRoots: readonly string[]
}

export interface HookPayload {
  tool_name?: string
  tool_input?: Record<string, unknown>
}

export function hookEnv(): HookEnv {
  const root = process.env.LIVING_DOCS_ROOT ?? '/app'
  const host = process.env.LIVING_DOCS_HOST_ROOT
  return { root, hostRoots: host ? [root, host] : [root] }
}

export async function readPayload(): Promise<HookPayload | null> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)

  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (parsed === null || typeof parsed !== 'object') return null
    return parsed as HookPayload
  } catch {
    return null
  }
}

function output(decision: 'deny' | 'ask', reason: string): string {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  })
}

export function denyOutput(reason: string): string {
  return output('deny', reason)
}

export function askOutput(reason: string): string {
  return output('ask', reason)
}

/** Emits the decision; `null` means "let it through silently". */
export function emit(value: string | null): void {
  if (value !== null) process.stdout.write(`${value}\n`)
}
```

- [ ] **Step 5: Implement `src/hooks/lib/edit.ts`**

```typescript
import { parseFrontmatter } from '../../frontmatter/parse.ts'

/** Content the file would have after this `tool_input`, or null if it cannot be predicted. */
export function applyToolInput(current: string, toolInput: Record<string, unknown>): string | null {
  const content = toolInput.content
  if (typeof content === 'string') return content

  const oldString = toolInput.old_string
  const newString = toolInput.new_string
  if (typeof oldString !== 'string' || typeof newString !== 'string') return null
  if (!current.includes(oldString)) return null

  return toolInput.replace_all === true ? current.replaceAll(oldString, newString) : current.replace(oldString, newString)
}

export interface DocumentDiff {
  /** Frontmatter keys added, removed or with a different value, in alphabetical order. */
  changedFields: string[]
  bodyChanged: boolean
}

function safeParse(source: string): {
  data: Record<string, unknown>
  body: string
} {
  try {
    const frontmatter = parseFrontmatter(source)
    if (!frontmatter) return { data: {}, body: source }
    return { data: frontmatter.data, body: frontmatter.body }
  } catch {
    return { data: {}, body: source }
  }
}

export function diffDocument(before: string, after: string): DocumentDiff {
  const from = safeParse(before)
  const to = safeParse(after)

  const keys = new Set([...Object.keys(from.data), ...Object.keys(to.data)])
  const changedFields: string[] = []
  for (const key of keys) {
    if (JSON.stringify(from.data[key]) !== JSON.stringify(to.data[key])) changedFields.push(key)
  }

  return {
    changedFields: changedFields.sort(),
    bodyChanged: from.body.trimEnd() !== to.body.trimEnd(),
  }
}
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```

Expected: all passing; type-check clean.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/lib test/hooks/lib
git commit -m "feat: hooks library — protocol, path mapping and edit projection"
```

---

### Task 10: `HK-1` — blocking edits of a frozen append-only item

The most important hook of the toolkit, and acceptance criterion 2 of the spec: an `accepted` ADR is not corrected — it gets `superseded`. The `mutable-fields` allowlist is what allows superseding **without** violating immutability.

Every output is a `deny` with a message that names the source rule, the owning artifact and the valid path. Fail open on anything unexpected: unreadable config, nonexistent file, non-projectable edit — everything returns `allow`.

**Files:**

- Create: `src/hooks/hk1-append-only.ts`
- Test: `test/hooks/hk1-append-only.test.ts`

**Interfaces:**

- Consumes: `HookEnv`, `HookPayload`, `readPayload`, `denyOutput`, `emit`, `hookEnv` (Task 9); `applyToolInput`, `diffDocument` (Task 9); `toRepoPath` (Task 9); `loadOwnership`, `findArtifactRule` (Task 3); `FROZEN_STATUSES`, `MUTABLE_FIELDS_DEFAULT` (Task 4); `parseFrontmatter` (Task 2).
- Produces:
  - `type HookDecision = { action: 'allow' } | { action: 'deny'; reason: string }`
  - `function decideHk1(payload: HookPayload, env: HookEnv): HookDecision`

- [ ] **Step 1: Write the failing test**

`test/hooks/hk1-append-only.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { HookEnv } from '../../src/hooks/lib/io.ts'
import type { HookDecision } from '../../src/hooks/hk1-append-only.ts'

/** Typed narrowing: without this, `decision.reason` does not exist for TypeScript. */
function assertDeny(decision: HookDecision): asserts decision is { action: 'deny'; reason: string } {
  assert.equal(decision.action, 'deny')
}

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, superseded-by, last-reviewed]
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`

function adr(status: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Event queue',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Never.',
    'last-reviewed: 2026-08-21',
    'superseded-by: null',
    '---',
    '',
    '## Context',
    'original text',
  ].join('\n')
}

const FILE = 'docs/decisions/adr/ADR-0001-queue.md'

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): HookDecision {
  let decision: HookDecision = { action: 'allow' }
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, root => {
    const env: HookEnv = { root, hostRoots: [root] }
    decision = decideHk1({ tool_name: 'Edit', tool_input: toolInput }, env)
  })
  return decision
}

test('denies changing the body of an accepted ADR — acceptance criterion 2', () => {
  const decision = decide(
    { [FILE]: adr('accepted') },
    {
      file_path: FILE,
      old_string: 'original text',
      new_string: 'corrected text',
    },
  )
  assertDeny(decision)
  assert.match(decision.reason, /superseded|supersed/i)
  assert.match(decision.reason, /decision-recorder/)
  assert.match(decision.reason, /ADR-0001-queue\.md/)
})

test('allows changing only status + superseded-by — this is how one supersedes', () => {
  const after = adr('superseded').replace('superseded-by: null', 'superseded-by: ADR-0002')
  const decision = decide({ [FILE]: adr('accepted') }, { file_path: FILE, content: after })
  assert.equal(decision.action, 'allow')
})

test('denies changing a field outside the allowlist even without touching the body', () => {
  const after = adr('accepted').replace('title: Event queue', 'title: Another title')
  const decision = decide({ [FILE]: adr('accepted') }, { file_path: FILE, content: after })
  assertDeny(decision)
  assert.match(decision.reason, /title/)
})

test('allows editing an ADR in draft — draft is not a frozen state', () => {
  const decision = decide(
    { [FILE]: adr('draft') },
    {
      file_path: FILE,
      old_string: 'original text',
      new_string: 'new text',
    },
  )
  assert.equal(decision.action, 'allow')
})

test('allows creating a new item — a nonexistent file always passes', () => {
  const decision = decide(
    {},
    {
      file_path: 'docs/decisions/adr/ADR-0002-new.md',
      content: adr('draft'),
    },
  )
  assert.equal(decision.action, 'allow')
})

test('ignores a path outside any append-only artifact', () => {
  assert.equal(decide({ 'src/index.ts': 'x' }, { file_path: 'src/index.ts', content: 'y' }).action, 'allow')
  assert.equal(decide({ 'docs/open-decisions.md': 'x' }, { file_path: 'docs/open-decisions.md', content: 'y' }).action, 'allow')
})

test('fail open: a missing .ownership.yml allows', () => {
  let decision: HookDecision = { action: 'deny', reason: 'should not' }
  withTempRepo({ [FILE]: adr('accepted') }, root => {
    decision = decideHk1(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: FILE,
          old_string: 'original text',
          new_string: 'x',
        },
      },
      { root, hostRoots: [root] },
    )
  })
  assert.equal(decision.action, 'allow')
})

test('fail open: a non-projectable edit allows', () => {
  const decision = decide(
    { [FILE]: adr('accepted') },
    {
      file_path: FILE,
      old_string: 'excerpt that does not exist',
      new_string: 'x',
    },
  )
  assert.equal(decision.action, 'allow')
})

test('a payload without file_path allows', () => {
  assert.equal(decide({ [FILE]: adr('accepted') }, { content: 'x' }).action, 'allow')
})

test('accepts an absolute host file_path', () => {
  let decision: HookDecision = { action: 'allow' }
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, [FILE]: adr('accepted') }, root => {
    decision = decideHk1(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: `${root}/${FILE}`,
          old_string: 'original text',
          new_string: 'x',
        },
      },
      { root, hostRoots: [root] },
    )
  })
  assert.equal(decision.action, 'deny')
})
```

- [ ] **Step 2: Run the test to see it fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `Cannot find module '/app/src/hooks/hk1-append-only.ts'`.

- [ ] **Step 3: Implement**

`src/hooks/hk1-append-only.ts`:

```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): denies changes to a frozen append-only item.
 *
 * Source rule: LIVING-DOCUMENTATION-TOOLKIT.md §4 — "no terminal state
 * allows editing the body". The field allowlist comes from docs/.ownership.yml.
 */
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { findArtifactRule, loadOwnership } from '../config/ownership.ts'
import { parseFrontmatter } from '../frontmatter/parse.ts'
import { FROZEN_STATUSES, MUTABLE_FIELDS_DEFAULT } from '../docs/schema.ts'
import { applyToolInput, diffDocument } from './lib/edit.ts'
import { toRepoPath } from './lib/paths.ts'
import { denyOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type HookDecision = { action: 'allow' } | { action: 'deny'; reason: string }

const ALLOW: HookDecision = { action: 'allow' }

export function decideHk1(payload: HookPayload, env: HookEnv): HookDecision {
  const toolInput = payload.tool_input
  if (!toolInput) return ALLOW

  const filePath = toolInput.file_path
  if (typeof filePath !== 'string') return ALLOW

  const repoPath = toRepoPath(filePath, env.hostRoots)
  if (repoPath === null) return ALLOW

  let rule
  try {
    rule = findArtifactRule(loadOwnership(env.root), repoPath)
  } catch {
    return ALLOW // fail open: without a readable configuration, do not block the work
  }
  if (!rule || !rule.appendOnly) return ALLOW

  let current: string
  try {
    current = readFileSync(join(env.root, repoPath), 'utf8')
  } catch {
    return ALLOW // creating a new item is always allowed
  }

  let status: unknown
  try {
    status = parseFrontmatter(current)?.data.status
  } catch {
    return ALLOW
  }
  if (typeof status !== 'string' || !FROZEN_STATUSES.has(status)) return ALLOW

  const next = applyToolInput(current, toolInput)
  if (next === null) return ALLOW // the result cannot be predicted

  const mutable = rule.mutableFields.length > 0 ? rule.mutableFields : MUTABLE_FIELDS_DEFAULT
  const diff = diffDocument(current, next)
  const forbidden = diff.changedFields.filter(field => !mutable.includes(field))

  if (!diff.bodyChanged && forbidden.length === 0) return ALLOW

  const what = diff.bodyChanged ? 'the body of the document' : `the field ${forbidden.map(field => `\`${field}\``).join(', ')}`

  return {
    action: 'deny',
    reason:
      `HK-1 blocked: \`${basename(repoPath)}\` is in a frozen state (\`${status}\`) and you tried to change ${what}. ` +
      'Source rule: LIVING-DOCUMENTATION-TOOLKIT.md §4 — no terminal state allows editing the body; ' +
      'an accepted item that turned out to be wrong is not corrected, the history of decisions is the asset. ' +
      `Valid path: create a new item with \`supersedes: ${String(parseFrontmatter(current)?.data.id ?? '')}\` and ` +
      `mark this one as \`status: superseded\` + \`superseded-by:\` (fields released here: ${mutable.join(', ')}). ` +
      `Owning artifact: ${rule.path} (${rule.owner}); owning skill: ${rule.skill}.`,
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()
  if (!payload) return // fail open
  const decision = decideHk1(payload, hookEnv())
  emit(decision.action === 'deny' ? denyOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('hk1-append-only.ts')) {
  main().catch(() => process.exit(0)) // fail open, always
}
```

- [ ] **Step 4: Run the test to see it pass**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```

Expected: all passing; type-check clean.

- [ ] **Step 5: Verify the real behavior of the executable via stdin**

```bash
docker compose exec -T toolkit sh -c 'echo "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"/app/nonexistent.md\",\"content\":\"x\"}}" | node /app/src/hooks/hk1-append-only.ts; echo "exit=$?"'
```

Expected: no output (allow) and `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/hk1-append-only.ts test/hooks/hk1-append-only.test.ts
git commit -m "feat: HK-1 blocks edits of a frozen append-only item"
```

---

### Task 11: `HK-3` — state promotion requires a human act

"No agent promotes state on its own" (spec §4). The hook returns `ask`, not `deny`: promoting is legitimate, it just is not an agent's act. It covers the two cases of the spec — `draft → accepted` in the frontmatter of a one-item-per-file artifact, and `open → resolved` in a table row.

**Files:**

- Create: `src/hooks/hk3-state-promotion.ts`
- Test: `test/hooks/hk3-state-promotion.test.ts`

**Interfaces:**

- Consumes: same modules as `HK-1`; additionally `HUMAN_PROMOTIONS` and `parseItemTable` (Task 4).
- Produces:
  - `type Hk3Decision = { action: 'allow' } | { action: 'ask'; reason: string }`
  - `function decideHk3(payload: HookPayload, env: HookEnv): Hk3Decision`

- [ ] **Step 1: Write the failing test**

`test/hooks/hk3-state-promotion.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideHk3 } from '../../src/hooks/hk3-state-promotion.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { Hk3Decision } from '../../src/hooks/hk3-state-promotion.ts'

function assertAsk(decision: Hk3Decision): asserts decision is { action: 'ask'; reason: string } {
  assert.equal(decision.action, 'ask')
}

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`

const ADR_FILE = 'docs/decisions/adr/ADR-0001-queue.md'

function adr(status: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Event queue',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Never.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '## Context',
  ].join('\n')
}

function openDecisions(status: string, resolvedBy: string): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@product"',
    'trigger: Whenever someone ran into a gap.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '| ID | Gap | Status | Resolved by |',
    '| --- | --- | --- | --- |',
    `| DA-0001 | Partial refund | ${status} | ${resolvedBy} |`,
  ].join('\n')
}

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): Hk3Decision {
  let decision: Hk3Decision = { action: 'allow' }
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, root => {
    decision = decideHk3({ tool_name: 'Edit', tool_input: toolInput }, { root, hostRoots: [root] })
  })
  return decision
}

test('asks when promoting an ADR from draft to accepted', () => {
  const decision = decide(
    { [ADR_FILE]: adr('draft') },
    {
      file_path: ADR_FILE,
      old_string: 'status: draft',
      new_string: 'status: accepted',
    },
  )
  assertAsk(decision)
  assert.match(decision.reason, /ADR-0001/)
  assert.match(decision.reason, /human/i)
  assert.match(decision.reason, /decision-recorder/)
})

test('asks when resolving a DA in the table', () => {
  const decision = decide(
    { 'docs/open-decisions.md': openDecisions('open', '—') },
    {
      file_path: 'docs/open-decisions.md',
      content: openDecisions('resolved', 'ADR-0002'),
    },
  )
  assertAsk(decision)
  assert.match(decision.reason, /DA-0001/)
})

test('allows writing draft — it is the most a skill writes', () => {
  const decision = decide({}, { file_path: ADR_FILE, content: adr('draft') })
  assert.equal(decision.action, 'allow')
})

test('allows changes that are not a human promotion', () => {
  const decision = decide(
    { [ADR_FILE]: adr('accepted') },
    {
      file_path: ADR_FILE,
      old_string: 'status: accepted',
      new_string: 'status: superseded',
    },
  )
  assert.equal(decision.action, 'allow')
})

test('allows adding a new open row to the table', () => {
  const before = openDecisions('open', '—')
  const after = `${before}\n| DA-0002 | Another gap | open | — |`
  assert.equal(decide({ 'docs/open-decisions.md': before }, { file_path: 'docs/open-decisions.md', content: after }).action, 'allow')
})

test('fail open: without configuration, allows', () => {
  let decision: Hk3Decision = { action: 'ask', reason: 'should not' }
  withTempRepo({ [ADR_FILE]: adr('draft') }, root => {
    decision = decideHk3(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: ADR_FILE,
          old_string: 'status: draft',
          new_string: 'status: accepted',
        },
      },
      { root, hostRoots: [root] },
    )
  })
  assert.equal(decision.action, 'allow')
})
```

- [ ] **Step 2: Run the test to see it fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `Cannot find module '/app/src/hooks/hk3-state-promotion.ts'`.

- [ ] **Step 3: Implement**

`src/hooks/hk3-state-promotion.ts`:

```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): intercepts a state promotion that requires a human act.
 *
 * Source rule: LIVING-DOCUMENTATION-TOOLKIT.md §4 — "no agent promotes
 * state on its own". Returns `ask`, never `deny`: promoting is legitimate, it just is not
 * an agent's act.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findArtifactRule, loadOwnership } from '../config/ownership.ts'
import type { ArtifactRule } from '../config/ownership.ts'
import { parseFrontmatter } from '../frontmatter/parse.ts'
import { HUMAN_PROMOTIONS } from '../docs/schema.ts'
import { parseItemTable } from '../docs/table.ts'
import { applyToolInput } from './lib/edit.ts'
import { toRepoPath } from './lib/paths.ts'
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type Hk3Decision = { action: 'allow' } | { action: 'ask'; reason: string }

const ALLOW: Hk3Decision = { action: 'allow' }

interface Promotion {
  id: string
  from: string
  to: string
}

function isHumanPromotion(from: string, to: string): boolean {
  return HUMAN_PROMOTIONS.some(promotion => promotion.from === from && promotion.to === to)
}

function statusOf(source: string): { id: string; status: string } | null {
  try {
    const frontmatter = parseFrontmatter(source)
    const id = frontmatter?.data.id
    const status = frontmatter?.data.status
    if (typeof id !== 'string' || typeof status !== 'string') return null
    return { id, status }
  } catch {
    return null
  }
}

function findPromotion(before: string, after: string, rule: ArtifactRule): Promotion | null {
  if (rule.collection === 'table') {
    const previous = new Map(parseItemTable(before, 1).map(item => [item.id, item.status]))
    for (const item of parseItemTable(after, 1)) {
      const from = previous.get(item.id)
      if (from !== undefined && isHumanPromotion(from, item.status)) {
        return { id: item.id, from, to: item.status }
      }
    }
    return null
  }

  const from = statusOf(before)
  const to = statusOf(after)
  if (!from || !to) return null
  return isHumanPromotion(from.status, to.status) ? { id: to.id, from: from.status, to: to.status } : null
}

export function decideHk3(payload: HookPayload, env: HookEnv): Hk3Decision {
  const toolInput = payload.tool_input
  if (!toolInput) return ALLOW

  const filePath = toolInput.file_path
  if (typeof filePath !== 'string') return ALLOW

  const repoPath = toRepoPath(filePath, env.hostRoots)
  if (repoPath === null) return ALLOW

  let rule
  try {
    rule = findArtifactRule(loadOwnership(env.root), repoPath)
  } catch {
    return ALLOW // fail open
  }
  if (!rule) return ALLOW

  let current: string
  try {
    current = readFileSync(join(env.root, repoPath), 'utf8')
  } catch {
    return ALLOW // a new file is born in draft/open; nothing to promote
  }

  const next = applyToolInput(current, toolInput)
  if (next === null) return ALLOW

  const promotion = findPromotion(current, next, rule)
  if (!promotion) return ALLOW

  return {
    action: 'ask',
    reason:
      `HK-3: this edit promotes ${promotion.id} from \`${promotion.from}\` to \`${promotion.to}\`. ` +
      'Source rule: LIVING-DOCUMENTATION-TOOLKIT.md §4 — no agent promotes state on its own; ' +
      'the most a skill writes is `draft`/`open`, and acceptance is a human act. ' +
      `Confirm whether the decision was really made by a person. Owning artifact: ${rule.path} (${rule.owner}); ` +
      `owning skill: ${rule.skill}.`,
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()
  if (!payload) return
  const decision = decideHk3(payload, hookEnv())
  emit(decision.action === 'ask' ? askOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('hk3-state-promotion.ts')) {
  main().catch(() => process.exit(0))
}
```

- [ ] **Step 4: Run the test to see it pass**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```

Expected: all passing; type-check clean.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/hk3-state-promotion.ts test/hooks/hk3-state-promotion.test.ts
git commit -m "feat: HK-3 intercepts state promotion that requires a human act"
```

---

### Task 12: Claude Code plugin — manifest, hook registration and fail-open bridge

Packages `HK-1` and `HK-3` as a plugin. `run-hook.sh` is the point where the "fail open" requirement of spec §7 becomes code: **any** failure — container down, timeout, execution error — results in empty output and exit 0, letting the tool through. A broken hook cannot block the work.

`timeout 5` in the wrapper honors the 5 s ceiling of the spec, with a huge margin: `docker exec` on this container responds in ~160 ms.

**Files:**

- Create: `plugin/.claude-plugin/plugin.json`
- Create: `plugin/hooks/hooks.json`
- Create: `plugin/hooks/run-hook.sh`
- Test: `test/plugin/manifest.test.ts`

**Interfaces:**

- Consumes: the executables `src/hooks/hk1-append-only.ts` and `src/hooks/hk3-state-promotion.ts` (Tasks 10–11).
- Produces: an installable plugin directory; `run-hook.sh <hook-name>` as the only entry point from the host to the hooks.

- [ ] **Step 1: Write the failing test**

`test/plugin/manifest.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.env.LIVING_DOCS_ROOT ?? '/app'

function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, relative), 'utf8')) as Record<string, unknown>
}

test('the plugin manifest declares name, version and description', () => {
  const manifest = readJson('plugin/.claude-plugin/plugin.json')
  assert.equal(manifest.name, 'living-docs')
  assert.equal(typeof manifest.version, 'string')
  assert.equal(typeof manifest.description, 'string')
})

test('hooks.json registers HK-1 and HK-3 in PreToolUse with matcher Edit|Write', () => {
  const config = readJson('plugin/hooks/hooks.json')
  const hooks = config.hooks as Record<string, unknown[]>
  const preToolUse = hooks.PreToolUse as {
    matcher: string
    hooks: { command: string }[]
  }[]

  assert.equal(preToolUse.length, 1)
  assert.equal(preToolUse[0]?.matcher, 'Edit|Write')

  const commands = (preToolUse[0]?.hooks ?? []).map(hook => hook.command)
  assert.equal(commands.length, 2)
  assert.ok(commands.some(command => command.includes('hk1-append-only')))
  assert.ok(commands.some(command => command.includes('hk3-state-promotion')))
  for (const command of commands) {
    assert.ok(command.includes('${CLAUDE_PLUGIN_ROOT}'), 'the command must be relocatable')
  }
})

test('the wrapper exists, is executable and fails open', () => {
  const wrapper = join(ROOT, 'plugin/hooks/run-hook.sh')
  assert.ok(existsSync(wrapper))
  assert.ok((statSync(wrapper).mode & 0o111) !== 0, 'run-hook.sh must be executable')

  const source = readFileSync(wrapper, 'utf8')
  assert.match(source, /timeout 5/, 'it must respect the 5s ceiling of spec §7')
  assert.match(source, /exit 0/, 'it must fail open')
  assert.doesNotMatch(source, /set -e\b/, 'set -e would kill the fail-open')
})

test('every referenced hook exists in the repository', () => {
  const config = readJson('plugin/hooks/hooks.json')
  const hooks = config.hooks as Record<string, { hooks: { command: string }[] }[]>
  for (const group of hooks.PreToolUse ?? []) {
    for (const hook of group.hooks) {
      const name = hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? ''
      assert.ok(existsSync(join(ROOT, 'src/hooks', `${name}.ts`)), `src/hooks/${name}.ts should exist`)
    }
  }
})
```

- [ ] **Step 2: Run the test to see it fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `ENOENT` at `plugin/.claude-plugin/plugin.json`.

- [ ] **Step 3: Write the manifest**

`plugin/.claude-plugin/plugin.json`:

```json
{
  "name": "living-docs",
  "version": "0.1.0",
  "description": "Living documentation: ADR, Open Decisions and Debt Register with owner, trigger and enforcement. Phases 0–1.",
  "keywords": ["adr", "documentation", "decisions", "living-docs"]
}
```

- [ ] **Step 4: Write the hook registration**

`plugin/hooks/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk1-append-only",
            "shell": "bash",
            "async": false
          },
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk3-state-promotion",
            "shell": "bash",
            "async": false
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Write the fail-open wrapper**

Note the absence of `set -e`: here it would be a bug, not a good practice — it would abort before the `exit 0` and Claude Code would interpret the output as a hook failure.

`plugin/hooks/run-hook.sh`:

```bash
#!/usr/bin/env bash
# Host → container bridge for the living documentation hooks.
#
# Fail open by contract (LIVING-DOCUMENTATION-TOOLKIT.md §7): container down,
# timeout or execution error result in empty output and exit 0. A broken hook
# cannot block the work.

HOOK="${1:-}"
CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"
HOST_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | timeout 5 docker exec -i \
  -e LIVING_DOCS_ROOT=/app \
  -e LIVING_DOCS_HOST_ROOT="$HOST_ROOT" \
  "$CONTAINER" node "/app/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
```

Make it executable:

```bash
chmod +x plugin/hooks/run-hook.sh
```

- [ ] **Step 6: Run the tests and exercise the wrapper for real**

```bash
docker compose exec toolkit npm test
```

Then, on the host, prove both paths — the blocking one and the fail-open one:

```bash
# 1. Create a frozen ADR for the test
mkdir -p docs/decisions/adr
cat > docs/decisions/adr/ADR-9999-test.md <<'EOF'
---
id: ADR-9999
title: Temporary test
status: accepted
owner: "@team"
trigger: Never.
last-reviewed: 2026-08-24
---

original body
EOF

# 2. HK-1 must block (requires docs/.ownership.yml present — if Task 8 has not
#    been run in this repository yet, run `./bin/living-docs init` first)
export CLAUDE_PROJECT_DIR="$PWD"
echo '{"tool_name":"Edit","tool_input":{"file_path":"'"$PWD"'/docs/decisions/adr/ADR-9999-test.md","old_string":"original body","new_string":"changed body"}}' \
  | ./plugin/hooks/run-hook.sh hk1-append-only

# 3. Fail open: a nonexistent container returns empty and exit 0
echo '{}' | LIVING_DOCS_CONTAINER=does-not-exist ./plugin/hooks/run-hook.sh hk1-append-only; echo "exit=$?"

# 4. Clean up
rm docs/decisions/adr/ADR-9999-test.md
```

Expected: step 2 prints the JSON with `"permissionDecision":"deny"`; step 3 prints nothing and `exit=0`.

- [ ] **Step 7: Commit**

```bash
git add plugin test/plugin/manifest.test.ts
git commit -m "feat: Claude Code plugin with HK-1 and HK-3 via a fail-open bridge"
```

---

### Task 13: `SK-3` `decision-recorder` and the commands `CM-1`–`CM-3`, `CM-6`

The most important skill of the toolkit (spec §5): ADR and Open Decisions capture the only information that is **not** reconstructible from the code. It follows the authoring conventions of spec §11 — sections in fixed order, `description` written in symptom language (it is what makes routing happen), and a final checklist where each item corresponds to an invariant verified by `CI-*` or explicitly marked as human verification.

The commands are thin shortcuts: they **contain no logic of their own** (spec §1), they only invoke the skill.

**Files:**

- Create: `plugin/skills/decision-recorder/SKILL.md`
- Create: `plugin/commands/adr.md`
- Create: `plugin/commands/open-decision.md`
- Create: `plugin/commands/debt.md`
- Create: `plugin/commands/docs-setup.md`
- Test: `test/plugin/authoring.test.ts`

**Interfaces:**

- Consumes: `templates/adr.md`, `templates/tdr.md` (Task 8); the CLI `living-docs init` (Task 8).
- Produces: the skill `decision-recorder` and four commands; no code API.

- [ ] **Step 1: Write the failing test**

The test is the enforcement of the authoring conventions — without it, "§11" is a promise.

`test/plugin/authoring.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontmatter } from '../../src/frontmatter/parse.ts'

const ROOT = process.env.LIVING_DOCS_ROOT ?? '/app'
const SKILL = readFileSync(join(ROOT, 'plugin/skills/decision-recorder/SKILL.md'), 'utf8')

test('the skill has frontmatter with name and description', () => {
  const frontmatter = parseFrontmatter(SKILL)
  assert.ok(frontmatter)
  assert.equal(frontmatter.data.name, 'decision-recorder')
  assert.equal(typeof frontmatter.data.description, 'string')
})

test('the description is written in symptom language, not category language', () => {
  const description = String(parseFrontmatter(SKILL)?.data.description ?? '')
  assert.ok(description.length > 120, 'description too short to be found when it matters')
  assert.match(description, /Use when/i)
  for (const symptom of ['why', 'gap', 'debt']) {
    assert.ok(description.toLowerCase().includes(symptom), `the description should contain the symptom "${symptom}"`)
  }
})

test('the sections of spec §11 are present and in order', () => {
  const sections = ['## Overview', '## What you own', '## When to use / when not', '## Procedure', '## Boundaries', '## Checklist']
  let cursor = -1
  for (const section of sections) {
    const at = SKILL.indexOf(section)
    assert.ok(at !== -1, `missing section: ${section}`)
    assert.ok(at > cursor, `section out of order: ${section}`)
    cursor = at
  }
})

test('the checklist has tickable boxes and each one names its verification', () => {
  const checklist = SKILL.slice(SKILL.indexOf('## Checklist'))
  const items = checklist.split('\n').filter(line => line.trim().startsWith('- [ ]'))
  assert.ok(items.length >= 6, `checklist with only ${items.length} items`)
  for (const item of items) {
    assert.match(item, /CI-\d|HK-\d|human/i, `item without a named verification: ${item}`)
  }
})

test('the skill does not duplicate the content of the artifacts it governs', () => {
  assert.doesNotMatch(SKILL, /^## Context$/m, 'the skill must not contain the ADR template')
  assert.match(SKILL, /templates\/adr\.md/, 'it must point to the template, not copy it')
})

test('the four commands exist, have a description and contain no logic of their own', () => {
  const expected = ['adr.md', 'open-decision.md', 'debt.md', 'docs-setup.md']
  const found = readdirSync(join(ROOT, 'plugin/commands')).sort()
  assert.deepEqual(found, expected.sort())

  for (const name of expected) {
    const source = readFileSync(join(ROOT, 'plugin/commands', name), 'utf8')
    const frontmatter = parseFrontmatter(source)
    assert.ok(frontmatter, `${name} without frontmatter`)
    assert.equal(typeof frontmatter.data.description, 'string')
    assert.ok(source.split('\n').length < 25, `${name} is too long for a thin shortcut`)
    assert.match(source, /decision-recorder|living-docs-bootstrap/, `${name} must point to the skill it triggers`)
  }
})
```

- [ ] **Step 2: Run the test to see it fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `ENOENT` at `plugin/skills/decision-recorder/SKILL.md`.

- [ ] **Step 3: Write the skill**

`plugin/skills/decision-recorder/SKILL.md`:

```markdown
---
name: decision-recorder
description: >
  Use when someone asks "why was this done this way?", when you are about to
  make a decision that is costly to reverse (choosing a library, data format,
  module boundary, protocol), when you run into a gap — behavior
  with no written rule, "I don't know what to do in this case", "is this documented?",
  "what is the rule for X?" — or when you deliberately accept a shortcut, hack,
  TODO or technical debt that someone will pay later. Also for superseding an old
  decision that turned out to be wrong.
---

# decision-recorder — owner of ADR, Open Decisions and Debt Register

## Overview

Three artifacts, a single state machine:
```

gap found ──> DA-nnn (open)
│
└─ decided ──> ADR-nnn (draft ──human act──> accepted)
│
└─ accepts deliberate loss ──> TDR-nnn

```

This skill decides **where a piece of knowledge lives** and **which ID it
gets**. It does not decide the merit: it raises the alternatives and the trade-off,
writes `draft`/`open`, and stops.

The paths, owners and prefixes come from `docs/.ownership.yml` — read it first,
never assume a path.

## What you own

| Artifact | What it is | Form |
| --- | --- | --- |
| ADR | Why this and not that, and what is accepted as lost | One file per decision, numbered, append-only |
| Open Decisions (DA) | What has **not** been decided yet | Single file, table, mutable |
| TDR | Debt taken on deliberately, with a payment trigger | One file per debt |

Templates: `templates/adr.md` and `templates/tdr.md`. Do not rewrite the format here.

## When to use / when not

**Use** for: a decision that is costly to reverse; a gap that blocks implementation;
a deliberate shortcut.

**Do not use** for: a trivial decision that is cheap to reverse (the cost of an ADR is
real — it goes into everyone's reading forever); recording what the code
already says; narrating an implementation. One ADR per variable-name choice is
exactly the "twenty documents of four hundred lines" that kills documentation.

**Never** use it to make the decision. That is not yours.

## Procedure

1. **Read `docs/.ownership.yml`** and find out the path, the owner and the prefix of
   each artifact. If the file does not exist, stop and run `/docs-setup`.
2. **Classify** what is in front of you:
   - it is known what to do and it is costly to reverse → **ADR**;
   - it is not known → **DA** and **stop the implementation**;
   - it is known, the worse option was chosen on purpose → **TDR**.
3. **Search before creating.** A `grep` for the topic in the existing artifacts. If
   an ADR on it already exists, the path is to supersede, not to write a second one.
4. **Take the next free ID** of the prefix, also checking `docs/ids-retired.txt`.
   Never recycle. Never skip.
5. **Write from the template.** In the ADR, demand of yourself the **alternatives
   considered** with the real reason for each discard, and the section **what we
   accept losing** — an ADR with no declared negative consequence is propaganda.
6. **In the TDR, demand an observable payment trigger.** "When the volume passes
   10k events/day" or "in the first PR that touches this module" pass. "When there
   is time" is not a trigger: refuse and ask for the condition.
7. **Close both sides of the reference.** A resolved DA points to the ADR that closed it;
   the ADR points back in `relates-to`. Superseding fills in `supersedes` on the
   new one and `superseded-by` on the old one.
8. **Stop at `draft`/`open`.** Say which decision is missing and whose it is. If
   you try to promote, `HK-3` will ask — and the answer is not yours.
9. **Run `living-docs validate`** before finishing.
10. **Cite the ID in the commit message.**

## Boundaries

| It is yours | It is not yours |
| --- | --- |
| Recording why this and not that, and what is lost | Making the decision |
| Turning a gap into a blocking item with an ID | Implementing the missing rule |
| Recording the debt with a payment trigger | Paying the debt |
| Proposing to supersede a wrong ADR | Editing an accepted ADR |
| Pointing to the template format | Duplicating the artifact content here |

## Checklist

- [ ] The right artifact for the nature of the item (ADR / DA / TDR) — human verification
- [ ] Complete frontmatter, with `trigger` naming an event and not a cadence — `CI-1`
- [ ] Sequential ID, not recycled, checked against `docs/ids-retired.txt` — `CI-2`
- [ ] Every citation of another ID resolves — `CI-2`
- [ ] `status` is `draft` or `open`; promotion left to a person — `HK-3`
- [ ] No accepted ADR was edited; the path used was to supersede — `HK-1`
- [ ] ADR declares alternatives considered and what we accept losing — human verification
- [ ] TDR has an observable payment trigger, not a vague date — human verification
- [ ] The implementation did **not** move forward while there was an open DA about it — human verification
```

- [ ] **Step 4: Write the commands**

`plugin/commands/adr.md`:

```markdown
---
description: Records an architectural decision (ADR) as draft, or supersedes an existing one
argument-hint: '[subject of the decision]'
---

Use the skill `decision-recorder` to record an ADR about: $ARGUMENTS

If an ADR on that subject already exists, the path is to supersede — never edit the accepted one.
Stop at `status: draft`; acceptance is a human act.
```

`plugin/commands/open-decision.md`:

```markdown
---
description: Records a gap (Open Decision) and stops the implementation until it is decided
argument-hint: '[the gap found]'
---

Use the skill `decision-recorder` to record an Open Decision about: $ARGUMENTS

The output is the ID, not the code. While the item is open, it has no rule
and **must not be implemented** — do not invent the rule silently.
```

`plugin/commands/debt.md`:

```markdown
---
description: Records a technical debt taken on deliberately, with a payment trigger
argument-hint: '[the shortcut taken]'
---

Use the skill `decision-recorder` to record a TDR about: $ARGUMENTS

Demand an observable payment trigger. "When there is time" is not a trigger.
```

`plugin/commands/docs-setup.md`:

```markdown
---
description: Creates or updates the living documentation frame of the repository
argument-hint: '[default owner, e.g. @team-platform]'
---

Use the skill `living-docs-bootstrap` (CLI: `living-docs init`) to set up the
living documentation frame of this repository, with default owner: $ARGUMENTS

Take inventory before creating: adopt what already exists under another name; never create a parallel one.
```

- [ ] **Step 5: Run the tests to see them pass**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```

Expected: all passing; type-check clean.

- [ ] **Step 6: Commit**

```bash
git add plugin/skills plugin/commands test/plugin/authoring.test.ts
git commit -m "feat: SK-3 decision-recorder and commands CM-1..CM-3, CM-6"
```

---

### Task 14: Dogfooding — the toolkit obeys the very rule it imposes

"The toolkit obeys the very rule it imposes" (spec §5). This task closes the loop: it initializes the living documentation of **this** repository, records in ADRs the architecture decisions the plan took, turns on CI, and verifies the acceptance criteria of spec §12 end to end.

**Files:**

- Create: `docs/.ownership.yml` (via `living-docs init`)
- Create: `docs/open-decisions.md`, `docs/ids-retired.txt`, `CODEOWNERS` (via `init`)
- Create: `docs/decisions/adr/ADR-0001-runtime-in-a-container-without-build.md`
- Create: `docs/decisions/adr/ADR-0002-single-engine-for-cli-and-hooks.md`
- Create: `.github/workflows/living-docs.yml`
- Create: `README.md`
- Test: `test/acceptance/spec-criteria.test.ts`

**Interfaces:**

- Consumes: everything from Tasks 1–13.
- Produces: a self-validated repository; no new API.

- [ ] **Step 1: Write the failing acceptance criteria test**

It covers criteria 1, 2, 3, 4 and 6 of spec §12 that fall within Phases 0–1. Criteria 5, 7, 8, 9 depend on `HK-5`, `CI-4`, `HK-6` and `SK-6` — all outside this plan.

`test/acceptance/spec-criteria.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { runInit } from '../../src/cli/init.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts'
import { decideHk3 } from '../../src/hooks/hk3-state-promotion.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const ROOT = process.env.LIVING_DOCS_ROOT ?? '/app'
const OPTIONS = { owner: '@team', dryRun: false }

function seedAdr(root: string, status: string): string {
  const file = 'docs/decisions/adr/ADR-0001-test.md'
  const content = [
    '---',
    'id: ADR-0001',
    'title: Test decision',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Never. Immutable once accepted.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    'original body',
  ].join('\n')
  mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
  writeFileSync(join(root, file), content, 'utf8')
  return file
}

test('criterion 1: SK-0 in a repository without living documentation duplicates nothing', () => {
  withTempRepo({ 'docs/adr/0001-preexisting.md': '# old\n' }, root => {
    const result = runInit(root, OPTIONS)
    assert.ok(result.adopted.some(entry => entry.path === 'docs/adr/'))
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false)
    assert.equal(readFileSync(join(root, 'docs/adr/0001-preexisting.md'), 'utf8'), '# old\n')
  })
})

test('criterion 2: HK-1 denies changing the body of an accepted ADR and allows superseding', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = seedAdr(root, 'accepted')
    const env = { root, hostRoots: [root] }

    const denied = decideHk1(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: file,
          old_string: 'original body',
          new_string: 'new body',
        },
      },
      env,
    )
    assert.equal(denied.action, 'deny')

    const current = readFileSync(join(root, file), 'utf8')
    const superseded = current
      .replace('status: accepted', 'status: superseded')
      .replace('last-reviewed: 2026-08-24', 'last-reviewed: 2026-08-24\nsuperseded-by: ADR-0002')
    const allowed = decideHk1(
      {
        tool_name: 'Write',
        tool_input: { file_path: file, content: superseded },
      },
      env,
    )
    assert.equal(allowed.action, 'allow')
  })
})

test('criterion 3: a trigger with cadence fails in CI naming the field', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = seedAdr(root, 'draft')
    writeFileSync(
      join(root, file),
      readFileSync(join(root, file), 'utf8').replace('trigger: Never. Immutable once accepted.', 'trigger: review quarterly'),
      'utf8',
    )

    const result = runValidate(root)
    assert.equal(result.exitCode, 1)
    const finding = result.findings.find(f => f.ruleId === 'CI-1' && /trigger/.test(f.message))
    assert.ok(finding, 'CI-1 should report the trigger field')
    assert.match(finding.message, /quarterly/i)
  })
})

test('criterion 4: promoting a decision requires a human act — HK-3 asks', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = seedAdr(root, 'draft')
    const decision = decideHk3(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: file,
          old_string: 'status: draft',
          new_string: 'status: accepted',
        },
      },
      { root, hostRoots: [root] },
    )
    assert.equal(decision.action, 'ask')
  })
})

test('this repository passes its own checks', () => {
  assert.ok(existsSync(join(ROOT, OWNERSHIP_PATH)), 'run `living-docs init` first')
  const result = runValidate(ROOT)
  assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2))
  assert.equal(result.exitCode, 0)
})
```

- [ ] **Step 2: Run the test to see it fail**

```bash
docker compose exec toolkit npm test
```

Expected: FAIL — `docs/.ownership.yml` does not exist yet in this repository.

- [ ] **Step 3: Initialize the living documentation of this repository**

```bash
./bin/living-docs init --owner "@esliph/engineering"
./bin/living-docs validate
```

Expected: `init` creating `docs/.ownership.yml`, `docs/ids-retired.txt`, `docs/open-decisions.md`, `CODEOWNERS`, `docs/decisions/adr/` and `docs/decisions/debt/`; `validate` with no violations.

- [ ] **Step 4: Record the two architecture decisions as ADRs**

The plan took two decisions that are costly to reverse. They need to exist as ADRs — if the toolkit does not record its own, it is propaganda.

`docs/decisions/adr/ADR-0001-runtime-in-a-container-without-build.md`:

```markdown
---
id: ADR-0001
title: Runtime in a Docker container, TypeScript without a build step
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-24
relates-to: []
supersedes: null
superseded-by: null
---

# ADR-0001 — Runtime in a Docker container, TypeScript without a build step

## Context

The development host does not have Node installed and should not start having it: the
premise of the project is that nothing beyond Docker is required of whoever clones the
repository. At the same time, the hooks run on every `Edit`/`Write` of the agent and
have a ceiling of 5 s (LIVING-DOCUMENTATION-TOOLKIT.md §7), which rules out any
solution that creates a container per invocation.

## Alternatives considered

- **`docker compose run --rm` per invocation** — discarded: it pays the creation of a
  container on every hook, and the cost grows with the size of the image.
- **TypeScript compiled to `dist/`** — discarded: it requires a build before any
  execution, and a stale `dist/` makes the hook silently run old code. The error
  would be invisible precisely in the component that cannot fail
  invisibly.
- **Plain JavaScript with JSDoc** — discarded: the interfaces between the modules
  (`Finding`, `ArtifactRule`, `HookDecision`) are the contract that keeps CLI and
  hooks in sync; verifying it by comment is more fragile.

## Decision

A long-running container (`living-docs-toolkit`) with the repository mounted at
`/app`; thin bash wrappers (`bin/living-docs`, `plugin/hooks/run-hook.sh`)
do `docker exec` into it. The code is TypeScript executed
directly by the native type-stripping of Node 24, with `tsc --noEmit` as the
type-checker. Measured: `docker exec` responds in ~160 ms.

## Consequences

### What is gained

Zero toolchain on the host; no build step between editing and running; no
possibility of a compiled artifact diverging from the source.

### What we accept losing

The container has to be up — when it is not, the CLI exits with code 2 and the
hooks fail open, which means that **the agent's enforcement silently disappears
while the container is stopped**. It is a real loss, mitigated
only by CI, which runs the same code without depending on the state of anyone's
machine. In addition, we are restricted to erasable TypeScript syntax: no `enum`,
no `namespace`, no decorators.
```

`docs/decisions/adr/ADR-0002-single-engine-for-cli-and-hooks.md`:

```markdown
---
id: ADR-0002
title: A single validation engine for CLI and hooks
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-24
relates-to: [ADR-0001]
supersedes: null
superseded-by: null
---

# ADR-0002 — A single validation engine for CLI and hooks

## Context

The toolkit needs to hold in two contexts with opposite demands: in CI, with no
agent present, where enforcement needs to fail closed; and during editing
by the agent, where it needs to fail open and respond in milliseconds. The
natural temptation is to write two implementations.

## Alternatives considered

- **Two independent implementations** — discarded: it violates corollary 4 of the
  spec ("every CI check mirrors a rule written in a skill") at the root. Two
  implementations of the same rule diverge, and the divergence shows up exactly
  when someone trusts one of them.
- **Hooks calling the CLI as a subprocess** — discarded: it adds a process
  per hook and forces serializing the decision into text to reinterpret it.

## Decision

`src/config`, `src/frontmatter`, `src/docs` and `src/ids` form a single engine.
`src/cli/` and `src/hooks/` are thin front-ends over it: no rule is written
twice. The asymmetry between the contexts is isolated in two lines — the CLI
exits with 1 on error, the hook wrapper always exits with 0.

## Consequences

### What is gained

One rule, one place. A new check is a file in `src/checks/` plus a line
in the registry, and it starts to hold in both contexts.

### What we accept losing

The hooks carry more code than they would need to (`loadOwnership` parses the
whole `.ownership.yml` to answer about one file), and changes in the engine
affect CI and hooks simultaneously — there is no way to evolve one without revalidating the other.
```

- [ ] **Step 5: Turn on CI**

It runs on the **same image** as development — this is what guarantees that "it passed here" means "it passes there".

`.github/workflows/living-docs.yml`:

```yaml
name: living-docs

on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build the image
        run: docker compose build

      - name: Install dependencies
        run: docker compose run --rm toolkit npm ci

      - name: Tests
        run: docker compose run --rm toolkit npm test

      - name: Type-check
        run: docker compose run --rm toolkit npm run typecheck

      - name: CI-1 and CI-2 — living documentation
        run: docker compose run --rm toolkit node /app/src/cli/index.ts validate
```

- [ ] **Step 6: Write the README**

`README.md`:

````markdown
# living-docs-toolkit

Living documentation with owner, trigger and enforcement — Phases 0–1 of the spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions and Debt Register, the
checks `CI-1`/`CI-2`, and the hooks `HK-1`/`HK-3`.

**Nothing runs on the host besides Docker.**

## Usage

```bash
docker compose up -d          # brings up the working container
./bin/living-docs init        # creates the frame (SK-0)
./bin/living-docs validate    # runs CI-1 and CI-2
```
````

Development:

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

## Claude Code plugin

`plugin/` brings the skill `decision-recorder` (`/adr`, `/open-decision`, `/debt`,
`/docs-setup`) and the hooks `HK-1` (blocks editing a frozen item) and `HK-3`
(state promotion requires a human act). The hooks fail open: with the container
stopped, they block nothing — the enforcement that survives this is CI.

## What is out

`SK-1`, `SK-2`, `SK-4`–`SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-4`–`HK-7`,
`CI-3`–`CI-8`, `CM-4`, `CM-5`, `CM-7` — Phases 2 to 7 of the spec.

````

- [ ] **Step 7: Run everything and check the criteria**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate; echo "exit=$?"
````

Expected: all tests passing, including the five acceptance criteria; `validate` with `exit=0`.

- [ ] **Step 8: Commit**

```bash
git add docs CODEOWNERS .github README.md test/acceptance
git commit -m "feat: toolkit dogfooding in its own repository (ADR-0001, ADR-0002)"
```

---

## Spec coverage and what was left out

| Spec piece                                 | Where                                     | Status                                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §2 Standardized frontmatter                | Tasks 2, 4, 5                             | Implemented                                                                                                                                                               |
| §3 Layout, granularity, `.ownership.yml`   | Tasks 3, 4, 8                             | Implemented                                                                                                                                                               |
| §4 Lifecycle (ADR/DA/TDR)                  | Task 4 (`STATUS_MACHINE`), 10, 11         | Implemented                                                                                                                                                               |
| §5 `SK-0` living-docs-bootstrap            | Task 8 (`init`) + Task 13 (`/docs-setup`) | Implemented                                                                                                                                                               |
| §5 `SK-3` decision-recorder                | Task 13                                   | Implemented                                                                                                                                                               |
| §7 `HK-1`, `HK-3`                          | Tasks 10, 11, 12                          | Implemented                                                                                                                                                               |
| §8 Traceability by ID (citations)          | Task 6                                    | Covered — `CI-2` (citation resolves) here; bidirectional pairs and `RN` coverage closed by `CI-3` in `docs/superpowers/plans/2026-08-24-living-docs-toolkit-phase-2.md`   |
| §9 `CI-1`, `CI-2`                          | Tasks 5, 6                                | Implemented                                                                                                                                                               |
| §10 `CM-1`, `CM-2`, `CM-3`, `CM-6`         | Task 13                                   | Implemented                                                                                                                                                               |
| §11 Authoring conventions                  | Task 13 (with enforcement test)           | Implemented                                                                                                                                                               |
| §12 Acceptance criteria 1, 2, 3            | Task 14                                   | Verified by test                                                                                                                                                          |

**Deliberately outside this plan** (Phases 2–7 of spec §10, to be covered by their
own plans): `SK-1` charter-keeper, `SK-2` glossary-keeper, `SK-4`
requirements-keeper, `SK-5` contract-keeper, `SK-6` working-agreements-keeper,
`SK-7` release-historian, `AG-1` docs-divergence-auditor, `AG-2`
decision-adversary, `HK-2` (generated artifact), `HK-4`–`HK-7`, `CI-3`
(traceability), `CI-4` (staleness), `CI-5` (contract drift), `CI-6` (changelog),
`CI-7` (ownership coverage), `CI-8` (links), `CM-4` `/term`, `CM-5`
`/docs-audit`, `CM-7` `/release`.

Acceptance criteria §12 that are **not** verifiable in Phases 0–1, because they
depend on pieces outside the scope or on judgment that a unit test cannot
reach: 4 (result of an agent procedure — `SK-3` opens `DA-nnn` and stops; the
skill declares the invariant, the unit test does not assert it), 5 (`HK-5`), 6
(`HK-2`/`CI-5`), 7 (`CI-4`), 8 (`HK-6`), 9 (`SK-6`), 10 (continuous human
judgment).
