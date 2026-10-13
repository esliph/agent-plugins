# The `ownership` Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `plugins/ownership/` from its requirements specification: the ownership file loader, the three core checks, the `validate`/`explain`/`init` CLI, the `generated-guard` hook, the `/ownership:init` slash command, the published JSON Schema and the library surface — then make the repository pass its own `ownership validate`.

**Architecture:** One package, `@esliph/ownership`, in `plugins/ownership/plugin/`, run from TypeScript by Node's type stripping. The loader parses each ownership file with `yaml` into a raw file with key paths and lines, follows includes depth-first, confines paths to each file's base, checks the relations between every declared path while inserting them into a trie keyed by path segment, and returns a deeply frozen configuration. Checks take a `CheckContext` (configuration, the repository files enumerated once by Git, CODEOWNERS on demand, `jobs`) and return `Finding[]`, which the CLI sorts and formats.

**Tech Stack:** Node ≥ 24 (type stripping, `node:test`, `node:util.parseArgs`), TypeScript 5.9 (type-check only, `tsc` emits `dist/` only at pack time), `yaml` (only runtime dependency), `ajv` (dev only, schema test), ESLint + Prettier, the vendored `./spur` runner, Git.

**Spec:** `docs/superpowers/specs/2026-10-09-ownership-plugin-design.md` (the design) and, once Task 1 lands, `plugins/ownership/docs/requirements/ownership.md` (the requirements). The Portuguese original of the requirements is `C:\Users\conta\Downloads\ownership-especificacao.md`; it is the input of Task 1 and is never versioned.

**Departures from the design**, each one measured or forced while the plan was written:

- *Deleted tracked files.* The design subtracts `git ls-files -z --deleted` from the listing. Task 5 subtracts `git diff-files -z --name-only --diff-filter=D --relative` instead. Both name the tracked files missing from the work tree; on Windows, with 100,000 files, the first takes about 2.5 s and the second about 0.1 s, and only the second keeps `validate --check ownership/owner-coverage` inside its 2 s budget there (0.7 s against 3.0 s).
- *Paths `init` cannot declare.* The design leaves out of the entries the paths that differ only in case. Task 16 leaves out, the same way, a path that is not literal (`app/[slug]/`), because an entry for it would be a load error and the file `init` writes must load.
- *The `coverage` line of `explain`.* The design shows five fixed blocks. Task 15 prints those five and, only when the path is not plainly covered, a sixth `coverage` line that says why.
- *Order of the last tasks.* The slash command (Task 20) comes before the distribution tests (Task 21), which check that it ships.

## Global Constraints

- Node `>=24` in every `package.json` `engines`; CI on Node `24`.
- Runtime dependency: `yaml` only. `ajv` is a dev dependency.
- Everything versioned is English: prose, comments, test names, commit messages.
- Requirement IDs (`REQ-*`) appear only inside `plugins/ownership/docs/requirements/ownership.md`. Tests, code, comments and commit messages do not cite them.
- Commits use `type(scope): subject` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Files under `plugins/ownership/plugin/` (what is shipped) mention no `REQ-` ID, no `docs/` path of this repository and no path of this repository; the only exception is the schema URL `https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json`.
- Code is erasable TypeScript only (`erasableSyntaxOnly`): no `enum`, no parameter properties, no `namespace`. Relative imports carry the `.ts` extension.
- Prettier style (root `.prettierrc`): single quotes, no semicolons, `printWidth` 160, `arrowParens: avoid`. Run `../../spur format` before each commit in `plugins/ownership/`.
- All path comparisons are case-sensitive, except the hook's comparison of an absolute path's root prefix.
- JSON Schema URL: `https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json`.
- Owner comparison against CODEOWNERS is case-insensitive.
- Every core finding has `severity: 'error'`.
- Commands are run from `plugins/ownership/` unless a step says otherwise; on Windows, run them in Git Bash. The `git add` of a commit step names its paths from the repository root, hence its `-C ../..`.

## Review Focus

1. **Files checked out with CRLF** (Windows, `core.autocrlf=true`): a `CODEOWNERS` or an ownership file with `\r\n` line ends must parse to the same owners and paths as with `\n` — an owner read as `@team\r` would fail every `codeowners-match`. Pinned in Task 9 (CODEOWNERS) and Task 4 (ownership file).
2. **Hook payload paths from Windows**: backslashes, a drive letter whose case differs from `CLAUDE_PROJECT_DIR`, and a `Write` that creates a file inside a directory that does not exist yet (no real path for the file nor its parent) must still be judged by the payload path, not dropped. Pinned in Task 19.
3. **An empty or comment-only ownership file**, and a top-level key with no value (`owned:`), must give a load error that names the file and the key, never a crash or a silent pass. Pinned in Task 4.
4. **A generator with large output or that writes to stderr while succeeding**: a multi-megabyte stdout is compared byte for byte without a buffer limit, and stderr noise with exit 0 is not a failure. Pinned in Task 12.
5. **An `owned` entry that resolves to the repository root itself** (`path: ./` in the root file): a load error that says so, instead of a rule nothing can match or contain. Pinned in Task 7.

---

### Task 1: Version the requirements specification in English

**Files:**
- Create: `plugins/ownership/docs/requirements/ownership.md`

**Interfaces:**
- Consumes: `C:\Users\conta\Downloads\ownership-especificacao.md` (986 lines, Portuguese).
- Produces: the requirements every later task implements. Later tasks cite behavior, never the IDs.

- [ ] **Step 1: Translate the whole document**

Translate `C:\Users\conta\Downloads\ownership-especificacao.md` into English, section by section, into `plugins/ownership/docs/requirements/ownership.md`. Rules:

- Keep every heading level, every `REQ-*` ID, every table, every code block and every "**Por quê:**" paragraph (as "**Why:**"). Keep the section numbers (`§9.6` stays `§9.6`).
- Code blocks and the CLI output examples are already English; copy them unchanged.
- Fixed vocabulary: arquivo de ownership → ownership file; arquivo raiz → root file; arquivo incluído → included file; arquivo do repositório → repository file; base → base; entrada `owned` → `owned` entry; artefato gerado → generated artifact; bloco de plugin → plugin block (bloco global → global block, bloco de entrada → entry block); biblioteca compartilhada de domínio → shared domain library; achado → finding; erro de carga → load error; linha efetiva → effective line; marcador → marker; poda → pruning; núcleo → core; plugin de domínio → domain plugin; "silêncio válido" → "valid silence"; "nunca escolhe sozinho" → "never chooses on its own".
- The title becomes `# The \`ownership\` plugin — requirements specification`.

- [ ] **Step 2: Fold in the amendments**

Add these sentences, verbatim, as the last bullet of the requirement named (create the bullet list if the requirement has only prose):

- **REQ-SCH-10:** `The schema is published at \`https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json\`; that is the \`<url>\` of the comment.`
- **REQ-OWN-03:** `The declared owner is looked up in the effective line without regard to case: \`@Team\` and \`@team\` are the same owner.`
- **REQ-PLG-03:** `The function is \`entriesForPlugin(config, name)\`, and each item is \`{ path, owner, skill, source, entry, global? }\`.`
- **REQ-API-04:** `The signature is \`ownersOf(codeowners, path)\`, where \`codeowners\` is the result of \`loadCodeowners\` or \`parseCodeowners\`, or \`null\`. It returns \`{ kind: 'no-codeowners' }\`, \`{ kind: 'unmatched' }\` or \`{ kind: 'matched', owners, line }\`. A line whose pattern uses syntax GitHub does not support (\`!\`, \`[ ]\`) is dropped, as GitHub drops it.`
- **REQ-INIT-01:** `With \`--stdout\`, the file goes to stdout and the summary to stderr.`
- **REQ-INIT-02:** `The target path is added to the repository files before the entries are derived, so the ownership file is born covered.`
- **REQ-HK-03:** `The extra host root comes from the \`OWNERSHIP_HOST_ROOT\` environment variable.`

- [ ] **Step 3: Check the translation is complete**

Run: `grep -c '^### REQ-\|^#### REQ-' plugins/ownership/docs/requirements/ownership.md` (from the repository root)
Expected: `65` — the same count as `grep -c '^### REQ-\|^#### REQ-' /c/Users/conta/Downloads/ownership-especificacao.md`. Then run `grep -n '[ãçõáéíóúâêô]' plugins/ownership/docs/requirements/ownership.md`; expected: no output (no Portuguese left).

If the two counts differ, find the missing heading and translate it before going on.

- [ ] **Step 4: Commit**

```bash
git -C ../.. add plugins/ownership/docs/requirements/ownership.md
git commit -m "docs(ownership): version the requirements specification in English

Translates the requirements of the rebuilt plugin and folds in the rules
the original left open: the schema URL, the case-insensitive owner lookup
in CODEOWNERS, the names and shapes of entriesForPlugin and ownersOf,
init --stdout writing the summary to stderr, the init target counted as
a repository file, and OWNERSHIP_HOST_ROOT as the hook's extra root.

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Project scaffolding and the load error type

**Files:**
- Create: `plugins/ownership/.gitignore`
- Create: `plugins/ownership/package.json`
- Create: `plugins/ownership/tsconfig.json`
- Create: `plugins/ownership/tsconfig.build.json`
- Create: `plugins/ownership/eslint.config.mjs`
- Create: `plugins/ownership/Spurfile`
- Create: `plugins/ownership/plugin/package.json`
- Create: `plugins/ownership/plugin/.claude-plugin/plugin.json`
- Create: `plugins/ownership/plugin/src/errors.ts`
- Create: `plugins/ownership/test/helpers/roots.ts`
- Create: `plugins/ownership/test/helpers/repo.ts`
- Create: `plugins/ownership/test/helpers/cli.ts`
- Test: `plugins/ownership/test/errors.test.ts`

**Interfaces:**
- Produces:
  - `interface Issue { file: string; keyPath?: string; line?: number; message: string; fix?: string }`
  - `formatIssue(issue: Issue): string` — `file[:line]: message`, then `\n  → fix` when there is a fix.
  - `class OwnershipError extends Error { readonly issues: readonly Issue[] }` — `message` is every issue formatted, joined by `\n`.
  - Test helpers: `PROJECT_ROOT`, `PLUGIN_ROOT` (`test/helpers/roots.ts`); `tempRepo(t, files, options?)`, `git(root, ...args)`, `writeFile(root, path, content)` (`test/helpers/repo.ts`); `CLI`, `runCli(args, { cwd, env?, input? })` (`test/helpers/cli.ts`).

- [ ] **Step 1: Write the project files**

`plugins/ownership/.gitignore`:

```gitignore
plugin/dist/
node_modules/
*.tgz
```

`plugins/ownership/package.json`:

```json
{
  "name": "@esliph/ownership-project",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "devDependencies": {
    "@esliph/ownership": "file:./plugin",
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.0.0",
    "ajv": "^8.17.1",
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

`plugins/ownership/tsconfig.json`:

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
  "include": ["plugin/src/**/*.ts", "test/**/*.ts"]
}
```

`plugins/ownership/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "rootDir": "plugin/src",
    "outDir": "plugin/dist",
    "declaration": true,
    "rewriteRelativeImportExtensions": true
  },
  "include": ["plugin/src/**/*.ts"]
}
```

`plugins/ownership/eslint.config.mjs`:

```js
// @ts-check
import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['eslint.config.mjs', 'plugin/dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      quotes: ['warn', 'single'],
      semi: ['warn', 'never'],
      curly: 'warn',
      eqeqeq: 'off',
      'no-trailing-spaces': 'warn',
      'prefer-const': 'off',
      camelcase: 'warn',
      'prettier/prettier': ['off', { endOfLine: 'auto' }],
      'no-constant-condition': 'warn',
      'no-empty': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'padding-line-between-statements': [
        'warn',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
      ],
    },
  },
)
```

`plugins/ownership/Spurfile` (indent task bodies with two spaces; the file must have LF line ends):

```sh
# Commands of the ownership plugin project. The runner is the one vendored at
# the repository root: `../../spur <task>` from here, or
# `./spur -C plugins/ownership <task>` from the root.

install: ## install the development dependencies from the lockfile
  npm ci

## Arguments are Node test-runner options. They go before the file pattern,
## because Node ignores the options that come after it:
##   ../../spur test --test-name-pattern coverage
test: ## run the tests
  node --test "$@" "test/**/*.test.ts"

typecheck: ## type-check without emitting
  npx --no-install tsc --noEmit

lint: ## lint, fixing what ESLint can fix
  npx --no-install eslint . --fix

lint-check: ## lint without fixing
  npx --no-install eslint .

format: ## format with Prettier
  npx --no-install prettier --ignore-path ../../.prettierignore --write .

format-check: ## check the formatting without writing
  npx --no-install prettier --ignore-path ../../.prettierignore --check .

## Builds a repository of 100,000 files first, which is slow, so it stays out
## of `check`; CI runs it on its own.
perf: ## run the performance test
  node --test "test/**/*.perf.ts"

check: ## tests, type-check, lint and formatting, in that order
  spur test
  spur typecheck
  spur lint-check
  spur format-check
```

`plugins/ownership/plugin/package.json`:

```json
{
  "name": "@esliph/ownership",
  "version": "0.1.0",
  "description": "Who owns each path of a repository and which files are generated, checked in the agent session and in CI.",
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
  "files": ["dist", "ownership.schema.json"],
  "bin": {
    "ownership": "./dist/cli/index.js"
  },
  "scripts": {
    "prepack": "tsc -p ../tsconfig.build.json"
  },
  "dependencies": {
    "yaml": "^2.9.1"
  }
}
```

`plugins/ownership/plugin/.claude-plugin/plugin.json`:

```json
{
  "name": "ownership",
  "version": "0.1.0",
  "description": "Who owns each path of a repository and which files are generated, checked in the agent session and in CI."
}
```

- [ ] **Step 2: Install and create the lockfiles**

Run (from `plugins/ownership/`):

```bash
rm -rf node_modules
npm install
(cd plugin && npm install --package-lock-only --ignore-scripts)
```

Expected: `plugins/ownership/package-lock.json` and `plugins/ownership/plugin/package-lock.json` exist; `node_modules/@esliph/ownership` links to `plugin/`; `node_modules/yaml` exists.

- [ ] **Step 3: Write the test helpers**

`plugins/ownership/test/helpers/roots.ts`:

```ts
import { join } from 'node:path'

/** The ownership project: toolchain, tests and documentation. */
export const PROJECT_ROOT = join(import.meta.dirname, '..', '..')

/** The distributed directory: what the marketplace cache copies and `npm pack` packs. */
export const PLUGIN_ROOT = join(PROJECT_ROOT, 'plugin')
```

`plugins/ownership/test/helpers/repo.ts`:

```ts
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { TestContext } from 'node:test'

export interface RepoOptions {
  /** Run `git init` (default true). */
  git?: boolean
  /** Run `git add -A` after writing the files (default false). */
  add?: boolean
  /** Content of a root `CODEOWNERS`. */
  codeowners?: string
}

export function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

export function writeFile(root: string, path: string, content: string | Buffer): void {
  const absolute = join(root, path)

  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, content)
}

/** A disposable repository holding `files`, removed when the test ends. */
export function tempRepo(t: TestContext, files: Record<string, string>, options: RepoOptions = {}): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'ownership-')))

  t.after(() => rmSync(root, { recursive: true, force: true }))

  if (options.git !== false) {
    git(root, 'init', '-q')
    git(root, 'config', 'core.autocrlf', 'false')
    git(root, 'config', 'user.email', 'test@example.com')
    git(root, 'config', 'user.name', 'Test')
  }

  const all = options.codeowners === undefined ? files : { ...files, CODEOWNERS: options.codeowners }

  for (const [path, content] of Object.entries(all)) {
    writeFile(root, path, content)
  }

  if (options.add === true) {
    git(root, 'add', '-A')
  }

  return root
}
```

`plugins/ownership/test/helpers/cli.ts`:

```ts
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

import { PLUGIN_ROOT } from './roots.ts'

export const CLI = join(PLUGIN_ROOT, 'src', 'cli', 'index.ts')

export interface CliResult {
  status: number | null
  stdout: string
  stderr: string
}

/** Runs the CLI from its TypeScript source, as the plugin does, with no ownership variable inherited. */
export function runCli(args: readonly string[], options: { cwd: string; env?: NodeJS.ProcessEnv; input?: string }): CliResult {
  const env: NodeJS.ProcessEnv = { ...process.env }

  delete env.OWNERSHIP_REPO_ROOT
  delete env.OWNERSHIP_CONFIG
  Object.assign(env, options.env)

  const result = spawnSync(process.execPath, [CLI, ...args], { cwd: options.cwd, env, input: options.input, encoding: 'utf8' })

  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}
```

- [ ] **Step 4: Write the failing test**

`plugins/ownership/test/errors.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError, formatIssue } from '../plugin/src/errors.ts'

test('an issue is formatted as file, line, message and fix', () => {
  assert.equal(
    formatIssue({ file: '.ownership.yml', line: 4, message: 'owned[0].owner must start with "@"; got team', fix: 'write the owner as @user or @org/team' }),
    '.ownership.yml:4: owned[0].owner must start with "@"; got team\n  → write the owner as @user or @org/team',
  )
})

test('an issue without line or fix shows only the file and the message', () => {
  assert.equal(formatIssue({ file: 'a.yml', message: 'broken' }), 'a.yml: broken')
})

test('the error message lists every issue and the issues are frozen', () => {
  const error = new OwnershipError([
    { file: 'a.yml', line: 1, message: 'first' },
    { file: 'b.yml', message: 'second', fix: 'do this' },
  ])

  assert.equal(error.name, 'OwnershipError')
  assert.equal(error.message, 'a.yml:1: first\nb.yml: second\n  → do this')
  assert.equal(error.issues.length, 2)
  assert.ok(Object.isFrozen(error.issues))
  assert.ok(Object.isFrozen(error.issues[0]))
  assert.ok(error instanceof Error)
})
```

- [ ] **Step 5: Run it to see it fail**

Run: `node --test test/errors.test.ts`
Expected: FAIL — `Cannot find module '.../plugin/src/errors.ts'`.

- [ ] **Step 6: Write the implementation**

`plugins/ownership/plugin/src/errors.ts`:

```ts
/** One problem found while loading the ownership files or the CODEOWNERS. */
export interface Issue {
  file: string
  keyPath?: string
  line?: number
  message: string
  fix?: string
}

export function formatIssue(issue: Issue): string {
  const where = issue.line === undefined ? issue.file : `${issue.file}:${issue.line}`
  const head = `${where}: ${issue.message}`

  return issue.fix === undefined ? head : `${head}\n  → ${issue.fix}`
}

/**
 * Every load error. It is never a finding: the CLI turns it into exit code 2
 * and the hook stays silent on it.
 */
export class OwnershipError extends Error {
  readonly issues: readonly Issue[]

  constructor(issues: readonly Issue[]) {
    super(issues.map(formatIssue).join('\n'))
    this.name = 'OwnershipError'
    this.issues = Object.freeze(issues.map(issue => Object.freeze({ ...issue })))
  }
}
```

- [ ] **Step 7: Run the checks**

Run: `node --test test/errors.test.ts`
Expected: PASS (3 tests).

Run: `../../spur format && ../../spur check`
Expected: every step passes (the test glob finds only `test/errors.test.ts`).

- [ ] **Step 8: Commit**

```bash
git -C ../.. add plugins/ownership/.gitignore plugins/ownership/package.json plugins/ownership/package-lock.json plugins/ownership/tsconfig.json plugins/ownership/tsconfig.build.json plugins/ownership/eslint.config.mjs plugins/ownership/Spurfile plugins/ownership/plugin/package.json plugins/ownership/plugin/package-lock.json plugins/ownership/plugin/.claude-plugin/plugin.json plugins/ownership/plugin/src/errors.ts plugins/ownership/test
git commit -m "chore(ownership): scaffold the plugin project and its load error

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Path normalization, literal paths and containment

**Files:**
- Create: `plugins/ownership/plugin/src/paths/paths.ts`
- Test: `plugins/ownership/test/paths/paths.test.ts`

**Interfaces:**
- Produces:
  - `normalizePath(path: string): string` — NFC, no `.` or empty segment, keeps the trailing `/` of a directory; `'./'` → `''`.
  - `toPosix(path: string): string` — backslashes become `/`.
  - `literalProblem(path: string): string | null` — why a declared path is not literal (`*`, `?`, `[`, `!`, leading `/`), or `null`.
  - `type Resolved = { ok: true; path: string } | { ok: false; resolved: string }`
  - `resolveUnder(base: string, path: string): Resolved` — `base` is `''` or ends with `/`; `..` is resolved; escaping `base` gives `ok: false` with the resolved path.
  - `contains(outer: string, inner: string): boolean` — `outer` is a directory path and a strict ancestor of `inner`.
  - `segmentsOf(path: string): string[]`
  - `dirOf(path: string): string` — `''` or the parent directory with a trailing `/`.
  - `caseCollisions(paths: readonly string[]): string[][]` — groups of distinct paths that differ only in case.

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/paths/paths.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { caseCollisions, contains, dirOf, literalProblem, normalizePath, resolveUnder, segmentsOf, toPosix } from '../../plugin/src/paths/paths.ts'

test('normalization drops ./ and empty segments and keeps the directory slash', () => {
  assert.equal(normalizePath('./docs//adr/'), 'docs/adr/')
  assert.equal(normalizePath('docs/./a.md'), 'docs/a.md')
  assert.equal(normalizePath('./'), '')
  assert.equal(normalizePath('a/../b'), 'a/../b')
})

test('normalization turns a decomposed name into NFC', () => {
  const decomposed = 'cafe\u0301.md'

  assert.equal(normalizePath(decomposed), 'caf\u00e9.md')
})

test('backslashes become forward slashes', () => {
  assert.equal(toPosix('docs\\adr\\x.md'), 'docs/adr/x.md')
})

test('a literal path has no glob, no negation and no leading slash', () => {
  assert.equal(literalProblem('docs/adr/'), null)
  assert.match(literalProblem('docs/*.md') ?? '', /contains "\*"/)
  assert.match(literalProblem('docs/?.md') ?? '', /contains "\?"/)
  assert.match(literalProblem('docs/[ab].md') ?? '', /contains "\["/)
  assert.match(literalProblem('!docs/') ?? '', /contains "!"/)
  assert.match(literalProblem('/docs/') ?? '', /starts with "\/"/)
})

test('a path resolves against the base and may not escape it', () => {
  assert.deepEqual(resolveUnder('', 'docs/'), { ok: true, path: 'docs/' })
  assert.deepEqual(resolveUnder('plugins/x/', 'src/a.ts'), { ok: true, path: 'plugins/x/src/a.ts' })
  assert.deepEqual(resolveUnder('plugins/x/', '../x/a.ts'), { ok: true, path: 'plugins/x/a.ts' })
  assert.deepEqual(resolveUnder('plugins/x/', '../y/a.ts'), { ok: false, resolved: 'plugins/y/a.ts' })
  assert.deepEqual(resolveUnder('', '../a.ts'), { ok: false, resolved: '../a.ts' })
  assert.deepEqual(resolveUnder('plugins/x/', './'), { ok: true, path: 'plugins/x/' })
  assert.deepEqual(resolveUnder('', './'), { ok: true, path: '' })
})

test('only a directory contains, and never itself', () => {
  assert.equal(contains('docs/', 'docs/adr/x.md'), true)
  assert.equal(contains('docs/', 'docs/'), false)
  assert.equal(contains('docs', 'docs/x.md'), false)
  assert.equal(contains('docs/', 'docsx/a.md'), false)
})

test('segments and parent directory', () => {
  assert.deepEqual(segmentsOf('docs/adr/'), ['docs', 'adr'])
  assert.deepEqual(segmentsOf(''), [])
  assert.equal(dirOf('plugins/x/.ownership.yml'), 'plugins/x/')
  assert.equal(dirOf('.ownership.yml'), '')
})

test('paths that differ only in case are grouped', () => {
  assert.deepEqual(caseCollisions(['Docs/', 'docs/', 'src/', 'DOCS/', 'src/']), [['Docs/', 'docs/', 'DOCS/']])
  assert.deepEqual(caseCollisions(['a', 'b']), [])
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/paths/paths.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`plugins/ownership/plugin/src/paths/paths.ts`:

```ts
import { posix } from 'node:path'

/** NFC, no `.` or empty segment; the trailing `/` of a directory stays. `..` is left for resolveUnder. */
export function normalizePath(path: string): string {
  const nfc = path.normalize('NFC')
  const joined = nfc
    .split('/')
    .filter(segment => segment !== '' && segment !== '.')
    .join('/')

  return nfc.endsWith('/') && joined !== '' ? `${joined}/` : joined
}

export function toPosix(path: string): string {
  return path.replace(/\\/g, '/')
}

const NOT_LITERAL = /[*?[!]/

/** Why a declared path is not a literal path relative to its base, or null when it is one. */
export function literalProblem(path: string): string | null {
  if (path.startsWith('/')) {
    return 'starts with "/"; paths are relative to the base of the file'
  }

  const found = NOT_LITERAL.exec(path)

  return found === null ? null : `contains "${found[0]}"; paths are literal, without glob or negation`
}

export type Resolved = { ok: true; path: string } | { ok: false; resolved: string }

/** Resolves `path` against `base` (`''` or a directory with a trailing `/`). Leaving the base is reported with the resolved path. */
export function resolveUnder(base: string, path: string): Resolved {
  let joined = posix.normalize(`${base}${normalizePath(path)}`)

  if (joined === '.' || joined === './') {
    joined = ''
  }

  if (path.endsWith('/') && joined !== '' && !joined.endsWith('/')) {
    joined = `${joined}/`
  }

  const escapes = joined === '..' || joined.startsWith('../') || !joined.startsWith(base)

  return escapes ? { ok: false, resolved: joined } : { ok: true, path: joined }
}

/** True when `outer` is a directory path and a strict ancestor of `inner`. */
export function contains(outer: string, inner: string): boolean {
  return outer.endsWith('/') && inner !== outer && inner.startsWith(outer)
}

export function segmentsOf(path: string): string[] {
  return path.split('/').filter(segment => segment !== '')
}

/** The parent directory with a trailing `/`, or `''` at the repository root. */
export function dirOf(path: string): string {
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path
  const slash = trimmed.lastIndexOf('/')

  return slash === -1 ? '' : trimmed.slice(0, slash + 1)
}

/** Groups of distinct paths that differ only in case, in order of first appearance. */
export function caseCollisions(paths: readonly string[]): string[][] {
  const groups = new Map<string, string[]>()

  for (const path of paths) {
    const key = path.toLowerCase()
    const group = groups.get(key) ?? []

    if (!group.includes(path)) {
      group.push(path)
    }

    groups.set(key, group)
  }

  return [...groups.values()].filter(group => group.length > 1)
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node --test test/paths/paths.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/paths plugins/ownership/test/paths
git commit -m "feat(ownership): normalize, confine and compare declared paths

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Parse one ownership file

**Files:**
- Create: `plugins/ownership/plugin/src/schema/types.ts`
- Create: `plugins/ownership/plugin/src/schema/parse.ts`
- Test: `plugins/ownership/test/schema/parse.test.ts`

**Interfaces:**
- Consumes: `OwnershipError` (`errors.ts`), `literalProblem` (`paths/paths.ts`).
- Produces (`schema/types.ts`):
  - `interface Origin { file: string; keyPath: string; line?: number }` — `keyPath` is `owned[3]`, `generated[0]`, `ignore[2]`, `include[0]` or `basePath`; `line` is the line of the entry (1-based).
  - `type PluginBlock = Readonly<Record<string, unknown>>`, `type PluginBlocks = Readonly<Record<string, PluginBlock>>`
  - `interface RawOwned { path: string; owner: string; skill?: string; plugins: PluginBlocks; origin: Origin }`
  - `interface RawGenerated { path: string; command: string; origin: Origin }`
  - `interface RawPath { path: string; origin: Origin }`
  - `interface RawFile { file: string; basePath?: RawPath; plugins: PluginBlocks; owned: RawOwned[]; generated: RawGenerated[]; ignore: RawPath[]; include: RawPath[] }`
- Produces (`schema/parse.ts`):
  - `parseOwnershipFile(text: string, file: string, options: { isRoot: boolean }): RawFile` — throws `OwnershipError` with one issue, the first error found, in this order: YAML syntax or duplicate key; `version`; top keys; entries (`owned`, `generated`, `ignore`, `include`, `basePath` shapes); plugin blocks; literal paths.
  - `SUPPORTED_VERSIONS: readonly number[]` (`[1]`), `PLUGIN_NAME: RegExp` (`/^[a-z][a-z0-9-]*$/`).

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/schema/parse.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { parseOwnershipFile } from '../../plugin/src/schema/parse.ts'

const FILE = '.ownership.yml'

function loadError(text: string, isRoot = true): OwnershipError {
  try {
    parseOwnershipFile(text, FILE, { isRoot })
  } catch (error) {
    assert.ok(error instanceof OwnershipError, `expected an OwnershipError, got ${String(error)}`)

    return error
  }
  assert.fail('expected a load error')
}

const FULL = [
  'version: 1',
  'basePath: sub/',
  'plugins:',
  '  plugin-example: {}',
  '  another-plugin:',
  '    prop1: Test',
  'owned:',
  '  - path: docs/',
  "    owner: '@team-docs'",
  '    skill: docs-keeper',
  '    plugins:',
  '      plugin-example:',
  '        prop2: Test 2',
  '      another-plugin: {}',
  '  - path: src/a.ts',
  "    owner: '@team-src'",
  'generated:',
  '  - path: docs/api.md',
  '    command: node gen.mjs',
  'ignore:',
  '  - docs/vendor/',
  'include:',
  '  - plugins/x/',
  '',
].join('\n')

test('a complete file is read with key paths, lines and separate plugin blocks', () => {
  assert.deepEqual(parseOwnershipFile(FULL, FILE, { isRoot: true }), {
    file: FILE,
    basePath: { path: 'sub/', origin: { file: FILE, keyPath: 'basePath', line: 2 } },
    plugins: { 'plugin-example': {}, 'another-plugin': { prop1: 'Test' } },
    owned: [
      {
        path: 'docs/',
        owner: '@team-docs',
        skill: 'docs-keeper',
        plugins: { 'plugin-example': { prop2: 'Test 2' }, 'another-plugin': {} },
        origin: { file: FILE, keyPath: 'owned[0]', line: 8 },
      },
      { path: 'src/a.ts', owner: '@team-src', plugins: {}, origin: { file: FILE, keyPath: 'owned[1]', line: 15 } },
    ],
    generated: [{ path: 'docs/api.md', command: 'node gen.mjs', origin: { file: FILE, keyPath: 'generated[0]', line: 18 } }],
    ignore: [{ path: 'docs/vendor/', origin: { file: FILE, keyPath: 'ignore[0]', line: 21 } }],
    include: [{ path: 'plugins/x/', origin: { file: FILE, keyPath: 'include[0]', line: 23 } }],
  })
})

test('a file with CRLF line ends reads the same as with LF', () => {
  assert.deepEqual(parseOwnershipFile(FULL.replace(/\n/g, '\r\n'), FILE, { isRoot: true }), parseOwnershipFile(FULL, FILE, { isRoot: true }))
})

test('invalid YAML names the file and repeats the parser message', () => {
  const error = loadError('version: 1\nowned: [a\n')

  assert.match(error.message, /^\.ownership\.yml:\d+: invalid YAML: /)
})

test('a duplicate key is an error, never "the last one wins"', () => {
  const error = loadError("version: 1\nowned:\n  - path: a\n    path: b\n    owner: '@t'\n")

  assert.equal(error.message, '.ownership.yml:4: duplicate key "path"; each key appears once in a map\n  → remove or rename one of the two keys')
})

test('an empty or comment-only file is missing its version', () => {
  for (const text of ['', '# only a comment\n']) {
    assert.equal(loadError(text).issues[0]?.message, 'version is missing; supported versions: 1')
  }
})

test('an unsupported version names the received value and the supported versions', () => {
  assert.equal(loadError('version: 2\n').issues[0]?.message, 'version 2 is not supported; supported versions: 1')
  assert.equal(loadError("version: '1'\n").issues[0]?.message, "version '1' is not supported; supported versions: 1")
})

test('the version is checked before the keys', () => {
  assert.equal(loadError('foo: 1\nversion: 3\n').issues[0]?.keyPath, 'version')
})

test('an unknown top-level key is named', () => {
  const issue = loadError('version: 1\nwatches: []\n').issues[0]

  assert.equal(issue?.message, 'unknown top-level key "watches"; the keys are version, plugins, basePath, owned, generated, ignore, include')
  assert.equal(issue?.line, 2)
})

test('plugins is forbidden in an included file', () => {
  assert.equal(loadError('version: 1\nplugins:\n  x: {}\n', false).issues[0]?.message, 'plugins is only allowed in the root ownership file')
})

test('a top-level list key with no value is an error that names the key', () => {
  assert.equal(loadError('version: 1\nowned:\n').issues[0]?.message, 'owned must be a list; got (empty)')
})

test('an unknown key in an owned entry suggests a plugin block', () => {
  const issue = loadError("version: 1\nowned:\n  - path: docs/\n    owner: '@t'\n    id-prefix: ADR\n").issues[0]

  assert.equal(issue?.keyPath, 'owned[0].id-prefix')
  assert.equal(issue?.message, 'owned[0] has an unknown key "id-prefix"')
  assert.equal(issue?.fix, 'if it configures a plugin, move it under owned[0].plugins.<name>; otherwise remove it')
})

test('an owner without @ names the key path and the line', () => {
  const issue = loadError('version: 1\nowned:\n  - path: docs/\n    owner: team\n').issues[0]

  assert.equal(issue?.keyPath, 'owned[0].owner')
  assert.equal(issue?.line, 4)
  assert.equal(issue?.message, 'owned[0].owner must start with "@"; got team')
})

test('a value is shown as written, never as [object Object]', () => {
  const issue = loadError('version: 1\nowned:\n  - path: docs/\n    owner: {a: 1}\n').issues[0]

  assert.equal(issue?.message, 'owned[0].owner must be a non-empty string; got {a: 1}')
})

test('a missing owner is named', () => {
  assert.equal(loadError('version: 1\nowned:\n  - path: docs/\n').issues[0]?.message, 'owned[0].owner is missing')
})

test('a generated path ending in / is an error', () => {
  assert.equal(
    loadError('version: 1\ngenerated:\n  - path: out/\n    command: gen\n').issues[0]?.message,
    'generated[0].path out/ ends with "/"; a generated path is a file',
  )
})

test('a generated entry needs its command and has no other key', () => {
  assert.equal(loadError('version: 1\ngenerated:\n  - path: out.md\n').issues[0]?.message, 'generated[0].command is missing')
  assert.equal(
    loadError('version: 1\ngenerated:\n  - path: out.md\n    command: gen\n    owner: x\n').issues[0]?.message,
    'generated[0] has an unknown key "owner"; a generated entry has only path and command',
  )
})

test('a plugin block that is not a map suggests {}', () => {
  const issue = loadError("version: 1\nowned:\n  - path: docs/\n    owner: '@t'\n    plugins:\n      living-docs: true\n").issues[0]

  assert.equal(issue?.keyPath, 'owned[0].plugins.living-docs')
  assert.equal(issue?.message, 'owned[0].plugins.living-docs must be a map; got true')
  assert.equal(issue?.fix, 'use "living-docs: {}" to declare the link without configuration')
})

test('a plugin name outside the pattern is an error, at the root and in an entry', () => {
  assert.equal(loadError('version: 1\nplugins:\n  Living_Docs: {}\n').issues[0]?.message, 'plugin name "Living_Docs" must match ^[a-z][a-z0-9-]*$')
  assert.equal(loadError('version: 1\nplugins:\n  x: []\n').issues[0]?.message, 'plugins.x must be a map; got []')
})

test('declared paths are literal', () => {
  assert.equal(
    loadError("version: 1\nowned:\n  - path: docs/*.md\n    owner: '@t'\n").issues[0]?.message,
    'owned[0].path docs/*.md contains "*"; paths are literal, without glob or negation',
  )
  assert.equal(loadError('version: 1\nignore:\n  - /vendor/\n').issues[0]?.message, 'ignore[0] /vendor/ starts with "/"; paths are relative to the base of the file')
})

test('a file stops at its first error', () => {
  assert.equal(loadError('version: 1\nowned:\n  - path: docs/*\n    owner: team\n').issues.length, 1)
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/schema/parse.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the types**

`plugins/ownership/plugin/src/schema/types.ts`:

```ts
/** Where a declaration was written: the file, the key path of the entry and its line. */
export interface Origin {
  file: string
  keyPath: string
  line?: number
}

/** The content of a plugin block: opaque to the core, it belongs to the plugin. */
export type PluginBlock = Readonly<Record<string, unknown>>

export type PluginBlocks = Readonly<Record<string, PluginBlock>>

export interface RawOwned {
  path: string
  owner: string
  skill?: string
  plugins: PluginBlocks
  origin: Origin
}

export interface RawGenerated {
  path: string
  command: string
  origin: Origin
}

export interface RawPath {
  path: string
  origin: Origin
}

/** One ownership file as written, paths still relative to its base. */
export interface RawFile {
  file: string
  basePath?: RawPath
  plugins: PluginBlocks
  owned: RawOwned[]
  generated: RawGenerated[]
  ignore: RawPath[]
  include: RawPath[]
}
```

- [ ] **Step 4: Write the parser**

`plugins/ownership/plugin/src/schema/parse.ts`:

```ts
import { isMap, isNode, isScalar, isSeq, LineCounter, parseDocument } from 'yaml'
import type { Pair, YAMLMap } from 'yaml'

import { OwnershipError } from '../errors.ts'
import { literalProblem } from '../paths/paths.ts'
import type { Origin, PluginBlock, PluginBlocks, RawFile, RawGenerated, RawOwned, RawPath } from './types.ts'

export const SUPPORTED_VERSIONS: readonly number[] = [1]
export const PLUGIN_NAME = /^[a-z][a-z0-9-]*$/

const TOP_KEYS = ['version', 'plugins', 'basePath', 'owned', 'generated', 'ignore', 'include']
const OWNED_KEYS = ['path', 'owner', 'skill', 'plugins']
const GENERATED_KEYS = ['path', 'command']

class FileReader {
  readonly file: string
  readonly text: string
  readonly lines: LineCounter

  constructor(file: string, text: string, lines: LineCounter) {
    this.file = file
    this.text = text
    this.lines = lines
  }

  line(node: unknown): number | undefined {
    return isNode(node) && node.range ? this.lines.linePos(node.range[0]).line : undefined
  }

  /** The value as written in the file, on one line, so a map shows as `{a: 1}` and never as `[object Object]`. */
  shown(node: unknown): string {
    if (!isNode(node) || !node.range) {
      return '(empty)'
    }

    const source = this.text
      .slice(node.range[0], node.range[1])
      .replace(/\s+/g, ' ')
      .trim()

    return source === '' ? '(empty)' : source
  }

  keyOf(pair: Pair<unknown, unknown>): string {
    return isScalar(pair.key) ? String(pair.key.value) : this.shown(pair.key)
  }

  fail(keyPath: string, node: unknown, message: string, fix?: string): never {
    const line = this.line(node)

    throw new OwnershipError([{ file: this.file, keyPath, ...(line === undefined ? {} : { line }), message, ...(fix === undefined ? {} : { fix }) }])
  }
}

function stringOf(node: unknown): string | undefined {
  return isScalar(node) && typeof node.value === 'string' ? node.value : undefined
}

function syntaxError(text: string, file: string, lines: LineCounter, error: { code: string; message: string; pos: [number, number] }): OwnershipError {
  const line = lines.linePos(error.pos[0]).line

  if (error.code === 'DUPLICATE_KEY') {
    const key = text.slice(error.pos[0]).split(/[:\r\n]/)[0]?.trim() ?? ''

    return new OwnershipError([{ file, line, message: `duplicate key "${key}"; each key appears once in a map`, fix: 'remove or rename one of the two keys' }])
  }

  return new OwnershipError([{ file, line, message: `invalid YAML: ${error.message}`, fix: 'correct the YAML syntax' }])
}

function topMap(reader: FileReader, top: unknown): YAMLMap<unknown, unknown> {
  const missing = `version is missing; supported versions: ${SUPPORTED_VERSIONS.join(', ')}`

  if (top === null || top === undefined || (isScalar(top) && top.value === null)) {
    reader.fail('version', top, missing, 'add "version: 1" at the top of the file')
  }

  if (!isMap(top)) {
    reader.fail('', top, `the file must be a map of keys; got ${reader.shown(top)}`, 'start the file with "version: 1"')
  }

  const pair = top.items.find(item => reader.keyOf(item) === 'version')

  if (pair === undefined) {
    reader.fail('version', top, missing, 'add "version: 1" at the top of the file')
  }

  const value = isScalar(pair.value) ? pair.value.value : undefined

  if (typeof value !== 'number' || !SUPPORTED_VERSIONS.includes(value)) {
    reader.fail(
      'version',
      pair.value ?? pair.key,
      `version ${reader.shown(pair.value)} is not supported; supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
      'declare "version: 1"',
    )
  }

  return top
}

function sequence(reader: FileReader, top: YAMLMap<unknown, unknown>, key: string): unknown[] {
  const node = top.get(key, true)

  if (node === undefined) {
    return []
  }

  if (!isSeq(node)) {
    reader.fail(key, node, `${key} must be a list; got ${reader.shown(node)}`, `write ${key} as a YAML list, one "- " item per line`)
  }

  return node.items
}

function requiredString(reader: FileReader, map: YAMLMap<unknown, unknown>, keyPath: string, key: string): string {
  const node = map.get(key, true)

  if (node === undefined) {
    reader.fail(`${keyPath}.${key}`, map, `${keyPath}.${key} is missing`, `add ${key} to the entry`)
  }

  const value = stringOf(node)

  if (value === undefined || value === '') {
    reader.fail(`${keyPath}.${key}`, node, `${keyPath}.${key} must be a non-empty string; got ${reader.shown(node)}`, `write ${key} as text`)
  }

  return value
}

function closedKeys(reader: FileReader, map: YAMLMap<unknown, unknown>, keyPath: string, allowed: readonly string[], fix: (key: string) => [string, string]): void {
  for (const pair of map.items) {
    const key = reader.keyOf(pair)

    if (!allowed.includes(key)) {
      const [message, suggestion] = fix(key)

      reader.fail(`${keyPath}.${key}`, pair.key, message, suggestion)
    }
  }
}

function pluginBlocks(reader: FileReader, node: unknown, keyPath: string): PluginBlocks {
  if (node === undefined) {
    return {}
  }

  if (!isMap(node)) {
    reader.fail(keyPath, node, `${keyPath} must be a map of plugin name to block; got ${reader.shown(node)}`, `write each plugin as "<name>: {}" under ${keyPath}`)
  }

  const blocks: Record<string, PluginBlock> = {}

  for (const pair of node.items) {
    const name = reader.keyOf(pair)
    const blockPath = `${keyPath}.${name}`

    if (!PLUGIN_NAME.test(name)) {
      reader.fail(blockPath, pair.key, `plugin name "${name}" must match ^[a-z][a-z0-9-]*$`, 'use lowercase letters, digits and "-", starting with a letter')
    }

    if (!isMap(pair.value)) {
      reader.fail(blockPath, pair.value ?? pair.key, `${blockPath} must be a map; got ${reader.shown(pair.value)}`, `use "${name}: {}" to declare the link without configuration`)
    }

    blocks[name] = pair.value.toJSON() as PluginBlock
  }

  return blocks
}

interface PendingOwned {
  path: string
  pathNode: unknown
  owner: string
  skill?: string
  pluginsNode: unknown
  origin: Origin
}

function readOwned(reader: FileReader, node: unknown, index: number): PendingOwned {
  const keyPath = `owned[${index}]`

  if (!isMap(node)) {
    reader.fail(keyPath, node, `${keyPath} must be a map with path and owner; got ${reader.shown(node)}`, 'write the entry as "- path: <path>" with "owner: <@owner>" below it')
  }

  closedKeys(reader, node, keyPath, OWNED_KEYS, key => [
    `${keyPath} has an unknown key "${key}"`,
    `if it configures a plugin, move it under ${keyPath}.plugins.<name>; otherwise remove it`,
  ])

  const path = requiredString(reader, node, keyPath, 'path')
  const owner = requiredString(reader, node, keyPath, 'owner')

  if (!owner.startsWith('@')) {
    const ownerNode = node.get('owner', true)

    reader.fail(`${keyPath}.owner`, ownerNode, `${keyPath}.owner must start with "@"; got ${reader.shown(ownerNode)}`, 'write the owner as @user or @org/team')
  }

  const skill = node.get('skill', true) === undefined ? undefined : requiredString(reader, node, keyPath, 'skill')
  const line = reader.line(node)

  return {
    path,
    pathNode: node.get('path', true),
    owner,
    ...(skill === undefined ? {} : { skill }),
    pluginsNode: node.get('plugins', true),
    origin: { file: reader.file, keyPath, ...(line === undefined ? {} : { line }) },
  }
}

function readGenerated(reader: FileReader, node: unknown, index: number): RawGenerated & { pathNode: unknown } {
  const keyPath = `generated[${index}]`

  if (!isMap(node)) {
    reader.fail(keyPath, node, `${keyPath} must be a map with path and command; got ${reader.shown(node)}`, 'write the entry as "- path: <file>" with "command: <command>" below it')
  }

  closedKeys(reader, node, keyPath, GENERATED_KEYS, key => [`${keyPath} has an unknown key "${key}"; a generated entry has only path and command`, 'remove the key'])

  const path = requiredString(reader, node, keyPath, 'path')
  const pathNode = node.get('path', true)

  if (path.endsWith('/')) {
    reader.fail(`${keyPath}.path`, pathNode, `${keyPath}.path ${reader.shown(pathNode)} ends with "/"; a generated path is a file`, 'name the generated file, not its directory')
  }

  const command = requiredString(reader, node, keyPath, 'command')
  const line = reader.line(node)

  return { path, pathNode, command, origin: { file: reader.file, keyPath, ...(line === undefined ? {} : { line }) } }
}

function readPaths(reader: FileReader, nodes: unknown[], key: 'ignore' | 'include'): (RawPath & { pathNode: unknown })[] {
  return nodes.map((node, index) => {
    const keyPath = `${key}[${index}]`
    const value = stringOf(node)

    if (value === undefined || value === '') {
      reader.fail(keyPath, node, `${keyPath} must be a non-empty string; got ${reader.shown(node)}`, 'write the path as text')
    }

    const line = reader.line(node)

    return { path: value, pathNode: node, origin: { file: reader.file, keyPath, ...(line === undefined ? {} : { line }) } }
  })
}

/** Reads one ownership file. Throws an OwnershipError with the first error found. */
export function parseOwnershipFile(text: string, file: string, options: { isRoot: boolean }): RawFile {
  const lines = new LineCounter()
  const doc = parseDocument(text, { lineCounter: lines, prettyErrors: false })
  const syntax = doc.errors[0]

  if (syntax !== undefined) {
    throw syntaxError(text, file, lines, syntax)
  }

  const reader = new FileReader(file, text, lines)
  const top = topMap(reader, doc.contents)

  for (const pair of top.items) {
    const key = reader.keyOf(pair)

    if (!TOP_KEYS.includes(key)) {
      reader.fail(key, pair.key, `unknown top-level key "${key}"; the keys are ${TOP_KEYS.join(', ')}`, 'remove the key or correct its name')
    }

    if (key === 'plugins' && !options.isRoot) {
      reader.fail('plugins', pair.key, 'plugins is only allowed in the root ownership file', 'move this block to the plugins of the root ownership file')
    }
  }

  const baseNode = top.get('basePath', true)
  const baseValue = stringOf(baseNode)

  if (baseNode !== undefined && baseValue === undefined) {
    reader.fail('basePath', baseNode, `basePath must be a string; got ${reader.shown(baseNode)}`, 'write basePath as a directory path')
  }

  const owned = sequence(reader, top, 'owned').map((node, index) => readOwned(reader, node, index))
  const generated = sequence(reader, top, 'generated').map((node, index) => readGenerated(reader, node, index))
  const ignore = readPaths(reader, sequence(reader, top, 'ignore'), 'ignore')
  const include = readPaths(reader, sequence(reader, top, 'include'), 'include')

  const rootPlugins = pluginBlocks(reader, top.get('plugins', true), 'plugins')
  const entryPlugins = owned.map(entry => pluginBlocks(reader, entry.pluginsNode, `${entry.origin.keyPath}.plugins`))

  const literal = (keyPath: string, node: unknown, path: string): void => {
    const problem = literalProblem(path)

    if (problem !== null) {
      reader.fail(keyPath, node, `${keyPath} ${reader.shown(node)} ${problem}`, 'write the literal path of the file or directory')
    }
  }

  owned.forEach(entry => literal(`${entry.origin.keyPath}.path`, entry.pathNode, entry.path))
  generated.forEach(entry => literal(`${entry.origin.keyPath}.path`, entry.pathNode, entry.path))
  ignore.forEach(entry => literal(entry.origin.keyPath, entry.pathNode, entry.path))

  const baseLine = reader.line(baseNode)

  return {
    file,
    ...(baseValue === undefined ? {} : { basePath: { path: baseValue, origin: { file, keyPath: 'basePath', ...(baseLine === undefined ? {} : { line: baseLine }) } } }),
    plugins: rootPlugins,
    owned: owned.map(
      (entry, index): RawOwned => ({
        path: entry.path,
        owner: entry.owner,
        ...(entry.skill === undefined ? {} : { skill: entry.skill }),
        plugins: entryPlugins[index] ?? {},
        origin: entry.origin,
      }),
    ),
    generated: generated.map(({ path, command, origin }) => ({ path, command, origin })),
    ignore: ignore.map(({ path, origin }) => ({ path, origin })),
    include: include.map(({ path, origin }) => ({ path, origin })),
  }
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `node --test test/schema/parse.test.ts`
Expected: PASS (20 tests). If the duplicate-key test fails on the line or the key, print `doc.errors[0]` for that input and adjust `syntaxError` so the key is read from `error.pos[0]` — the `yaml` package points `pos` at the repeated key.

- [ ] **Step 6: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/schema plugins/ownership/test/schema
git commit -m "feat(ownership): parse an ownership file with key paths and lines

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Enumerate the repository files

**Files:**
- Create: `plugins/ownership/plugin/src/repo/repo.ts`
- Test: `plugins/ownership/test/repo/repo.test.ts`

**Interfaces:**
- Produces:
  - `isInsideWorkTree(root: string): boolean`
  - `listRepoFiles(root: string): ReadonlySet<string>` — sorted, NFC, repository-relative with `/`; tracked plus untracked that no `.gitignore` excludes, minus tracked files deleted from the work tree; a submodule, a symbolic link and an untracked nested repository are one entry each, without a trailing `/`. One `git ls-files` for the listing, one `git diff-files` for the tracked files missing from the work tree.

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/repo/repo.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

import { isInsideWorkTree, listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { git, tempRepo, writeFile } from '../helpers/repo.ts'

test('a directory outside Git is not a work tree', t => {
  assert.equal(isInsideWorkTree(tempRepo(t, {}, { git: false })), false)
  assert.equal(isInsideWorkTree(tempRepo(t, {})), true)
})

test('tracked and untracked files enter; what a .gitignore excludes does not', t => {
  const root = tempRepo(t, { '.gitignore': 'build/\n*.log\n', 'src/a.ts': '', 'build/out.js': '', 'debug.log': '', 'docs/x.md': '' }, { add: true })

  writeFile(root, 'new.ts', '')
  writeFile(root, 'other.log', '')

  assert.deepEqual([...listRepoFiles(root)], ['.gitignore', 'docs/x.md', 'new.ts', 'src/a.ts'])
})

test('a tracked file that a .gitignore would exclude enters; a tracked file deleted from the work tree does not', t => {
  const root = tempRepo(t, { '.gitignore': '*.log\n', 'keep.log': '', 'gone.txt': '' })

  git(root, 'add', '-f', 'keep.log', 'gone.txt', '.gitignore')
  rmSync(join(root, 'gone.txt'))

  assert.deepEqual([...listRepoFiles(root)], ['.gitignore', 'keep.log'])
})

test('local excludes do not count: only the .gitignore files do', t => {
  const root = tempRepo(t, { 'a.txt': '', 'secret.txt': '' })

  writeFile(root, '.git/info/exclude', 'secret.txt\n')

  assert.deepEqual([...listRepoFiles(root)], ['a.txt', 'secret.txt'])
})

test('an untracked nested repository is one entry at its path without the slash', t => {
  const root = tempRepo(t, { 'a.txt': '' })
  const nested = join(root, 'vendor', 'lib')

  writeFile(root, 'vendor/lib/x.txt', '')
  git(nested, 'init', '-q')

  assert.deepEqual([...listRepoFiles(root)], ['a.txt', 'vendor/lib'])
})

test('a symbolic link is one entry at the path of the link', t => {
  if (process.platform === 'win32') {
    t.skip('Git for Windows does not keep symbolic links by default; CI (ubuntu) runs this proof')

    return
  }

  const root = tempRepo(t, { 'target/a.txt': '' })

  try {
    symlinkSync(join(root, 'target'), join(root, 'link'), 'dir')
  } catch {
    t.skip('this machine cannot create symbolic links')

    return
  }

  assert.deepEqual([...listRepoFiles(root)], ['link', 'target/a.txt'])
})

test('names with spaces and accents come back unquoted and in NFC', t => {
  const root = tempRepo(t, { 'sp ace/café.md': '' })

  assert.deepEqual([...listRepoFiles(root)], ['sp ace/café.md'])
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/repo/repo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`plugins/ownership/plugin/src/repo/repo.ts`:

```ts
import { execFileSync } from 'node:child_process'

const MAX_BUFFER = 1024 * 1024 * 1024

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: MAX_BUFFER, stdio: ['ignore', 'pipe', 'pipe'] })
}

function entries(output: string): string[] {
  return output
    .split('\0')
    .filter(entry => entry !== '')
    .map(entry => (entry.endsWith('/') ? entry.slice(0, -1) : entry).normalize('NFC'))
}

export function isInsideWorkTree(root: string): boolean {
  try {
    return git(root, ['rev-parse', '--is-inside-work-tree']).trim() === 'true'
  } catch {
    return false
  }
}

/**
 * The repository files: tracked, plus untracked that no .gitignore excludes,
 * present in the work tree. Only the .gitignore files count — not
 * .git/info/exclude nor core.excludesFile — so the same commit gives the same
 * list on every machine. Git already lists a submodule, a symbolic link and an
 * untracked nested repository as one entry, so no file is stat'ed here.
 *
 * The tracked files missing from the work tree come from `diff-files`, not
 * from `ls-files --deleted`: both name the same files, but `diff-files` reads
 * the work tree in parallel, and on Windows that is a tenth of a second
 * against several for a hundred thousand files.
 */
export function listRepoFiles(root: string): ReadonlySet<string> {
  const listed = entries(git(root, ['-c', 'core.quotePath=false', 'ls-files', '-z', '--cached', '--others', '--exclude-per-directory=.gitignore']))
  const deleted = new Set(entries(git(root, ['diff-files', '-z', '--name-only', '--diff-filter=D', '--relative'])))

  return new Set([...new Set(listed.filter(entry => !deleted.has(entry)))].sort())
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node --test test/repo/repo.test.ts`
Expected: PASS (7 tests; the symbolic-link test may report SKIP on Windows without the privilege).

- [ ] **Step 5: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/repo plugins/ownership/test/repo
git commit -m "feat(ownership): enumerate the repository files once through Git

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The path index and the relations between declared paths

**Files:**
- Create: `plugins/ownership/plugin/src/resolve/types.ts`
- Create: `plugins/ownership/plugin/src/resolve/trie.ts`
- Create: `plugins/ownership/plugin/src/resolve/split.ts`
- Create: `plugins/ownership/plugin/src/resolve/relations.ts`
- Test: `plugins/ownership/test/resolve/relations.test.ts`
- Test: `plugins/ownership/test/resolve/split.test.ts`

**Interfaces:**
- Consumes: `Issue` (`errors.ts`), `Origin`, `PluginBlocks` (`schema/types.ts`), `segmentsOf` (`paths/paths.ts`).
- Produces (`resolve/types.ts`):
  - `type RuleOrigin = Origin`
  - `interface OwnedRule { readonly kind: 'owned'; readonly path: string; readonly owner: string; readonly skill?: string; readonly plugins: PluginBlocks; readonly origin: RuleOrigin }`
  - `interface GeneratedRule { readonly kind: 'generated'; readonly path: string; readonly command: string; readonly origin: RuleOrigin }`
  - `interface IgnoreRule { readonly kind: 'ignore'; readonly path: string; readonly origin: RuleOrigin }`
  - `type Rule = OwnedRule | GeneratedRule | IgnoreRule`
  - `interface TrieNode { readonly children: Readonly<Record<string, TrieNode>>; readonly owned?: OwnedRule; readonly generated?: GeneratedRule; readonly ignore?: IgnoreRule }`
  - `interface OwnershipFileInfo { readonly path: string; readonly base: string; readonly includedBy?: string }`
  - `interface ResolvedOwnership { readonly root: string; readonly rootFile: string; readonly files: readonly OwnershipFileInfo[]; readonly plugins: PluginBlocks; readonly owned: readonly OwnedRule[]; readonly generated: readonly GeneratedRule[]; readonly ignore: readonly IgnoreRule[]; readonly index: TrieNode }`
  - `interface ResolveOptions { repoFiles?: ReadonlySet<string>; prune?: readonly string[]; ownership?: string }`
- Produces (`resolve/trie.ts`): `interface MutableTrieNode`, `newNode()`, `descend(root, path): { node, ancestors }`, `descendants(node): TrieNode[]`, `nodeAt(index: TrieNode, path: string): TrieNode | null`, `coveringOwned(index: TrieNode, path: string): OwnedRule | null`, `coveringIgnore(index: TrieNode, path: string): IgnoreRule | null` — a directory rule covers every path below it and the directory path itself; a file rule covers only that file; time grows with the depth of the path.
- Produces (`resolve/split.ts`): `splitSuggestion(outer: string, inner: string, repoFiles: ReadonlySet<string>, isIgnored: (path: string) => boolean): string[]`
- Produces (`resolve/relations.ts`): `interface DeclaredRules { owned: readonly OwnedRule[]; generated: readonly GeneratedRule[]; ignore: readonly IgnoreRule[] }`, `buildIndex(rules: DeclaredRules, repoFiles?: ReadonlySet<string>): { index: MutableTrieNode; issues: Issue[] }` — every relation error, sorted by file, line, message.

- [ ] **Step 1: Write the failing tests**

`plugins/ownership/test/resolve/split.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { splitSuggestion } from '../../plugin/src/resolve/split.ts'

const FILES = new Set(['docs/README.md', 'docs/adr/1.md', 'docs/api/index.md', 'docs/api/v1/y.md', 'docs/api/v2/z.md', 'docs/vendor/x.js', 'src/a.ts'])

test('each level from the outer to the inner path lists its other children, directories with a slash', () => {
  assert.deepEqual(splitSuggestion('docs/', 'docs/api/v1/', FILES, () => false), ['docs/README.md', 'docs/adr/', 'docs/api/index.md', 'docs/api/v2/', 'docs/vendor/'])
})

test('a child under an ignore is left out', () => {
  assert.deepEqual(
    splitSuggestion('docs/', 'docs/api/v1/', FILES, path => path.startsWith('docs/vendor/')),
    ['docs/README.md', 'docs/adr/', 'docs/api/index.md', 'docs/api/v2/'],
  )
})

test('an inner file is skipped by its name', () => {
  assert.deepEqual(splitSuggestion('docs/', 'docs/README.md', FILES, () => false), ['docs/adr/', 'docs/api/', 'docs/vendor/'])
})
```

`plugins/ownership/test/resolve/relations.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildIndex } from '../../plugin/src/resolve/relations.ts'
import { coveringIgnore, coveringOwned } from '../../plugin/src/resolve/trie.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule } from '../../plugin/src/resolve/types.ts'

const ROOT = '.ownership.yml'

function owned(index: number, path: string, line: number, file = ROOT): OwnedRule {
  return { kind: 'owned', path, owner: '@t', plugins: {}, origin: { file, keyPath: `owned[${index}]`, line } }
}

function generated(index: number, path: string, line: number, file = ROOT): GeneratedRule {
  return { kind: 'generated', path, command: 'gen', origin: { file, keyPath: `generated[${index}]`, line } }
}

function ignore(index: number, path: string, line: number, file = ROOT): IgnoreRule {
  return { kind: 'ignore', path, origin: { file, keyPath: `ignore[${index}]`, line } }
}

test('disjoint paths load, and the index answers who covers a path', () => {
  const docs = owned(0, 'docs/', 3)
  const readme = owned(1, 'README.md', 5)
  const vendor = ignore(0, 'docs/vendor/', 8)
  const { index, issues } = buildIndex({ owned: [docs, readme], generated: [], ignore: [vendor] })

  assert.deepEqual(issues, [])
  assert.equal(coveringOwned(index, 'docs/adr/1.md'), docs)
  assert.equal(coveringOwned(index, 'docs/'), docs)
  assert.equal(coveringOwned(index, 'docs'), null)
  assert.equal(coveringOwned(index, 'README.md'), readme)
  assert.equal(coveringOwned(index, 'README.md/x'), null)
  assert.equal(coveringOwned(index, 'src/a.ts'), null)
  assert.equal(coveringIgnore(index, 'docs/vendor/a.js'), vendor)
  assert.equal(coveringIgnore(index, 'docs/a.md'), null)
})

test('two equal owned paths are an error on the second one', () => {
  const { issues } = buildIndex({ owned: [owned(0, 'docs/', 3), owned(1, 'docs/', 5)], generated: [], ignore: [] })

  assert.deepEqual(issues, [
    {
      file: ROOT,
      keyPath: 'owned[1].path',
      line: 5,
      message: 'owned[1].path "docs/" repeats owned[0].path; owned paths must be disjoint.',
      fix: 'remove one of the two entries',
    },
  ])
})

test('containment is one error on the outer path, in either order of declaration', () => {
  const expected = [
    {
      file: ROOT,
      keyPath: 'owned[0].path',
      line: 3,
      message: 'owned[0].path "docs/" contains owned[1].path "docs/adr/"; owned paths must be disjoint.',
      fix: 'split "docs/" into entries that leave out "docs/adr/"',
    },
  ]

  assert.deepEqual(buildIndex({ owned: [owned(0, 'docs/', 3), owned(1, 'docs/adr/', 5)], generated: [], ignore: [] }).issues, expected)
  assert.deepEqual(buildIndex({ owned: [owned(1, 'docs/adr/', 5), owned(0, 'docs/', 3)], generated: [], ignore: [] }).issues, expected)
})

test('with the repository files, containment suggests the entries that replace the outer path', () => {
  const files = new Set(['docs/README.md', 'docs/guides/x.md', 'docs/adr/0001.md', 'docs/api/v1/y.md'])
  const { issues } = buildIndex({ owned: [owned(0, 'docs/', 3), owned(1, 'docs/adr/', 5)], generated: [], ignore: [] }, files)

  assert.equal(issues[0]?.fix, 'replace "docs/" with: docs/README.md, docs/api/, docs/guides/ (keep docs/adr/)')
})

test('the suggestion is truncated at 20 children', () => {
  const files = new Set([...Array.from({ length: 25 }, (_, i) => `docs/f${String(i).padStart(2, '0')}.md`), 'docs/adr/x.md'])
  const { issues } = buildIndex({ owned: [owned(0, 'docs/', 3), owned(1, 'docs/adr/', 5)], generated: [], ignore: [] }, files)
  const shown = Array.from({ length: 20 }, (_, i) => `docs/f${String(i).padStart(2, '0')}.md`).join(', ')

  assert.equal(issues[0]?.fix, `replace "docs/" with: ${shown} and 5 more (keep docs/adr/)`)
})

test('a relation across files names the other file', () => {
  const { issues } = buildIndex({ owned: [owned(0, 'plugins/', 3), owned(0, 'plugins/x/', 2, 'plugins/x/.ownership.yml')], generated: [], ignore: [] })

  assert.equal(issues[0]?.message, 'owned[0].path "plugins/" contains owned[0].path "plugins/x/" (plugins/x/.ownership.yml:2); owned paths must be disjoint.')
})

test('ignore paths are disjoint among themselves', () => {
  const { issues } = buildIndex({ owned: [], generated: [], ignore: [ignore(0, 'vendor/', 2), ignore(1, 'vendor/lib/', 3)] })

  assert.deepEqual(
    issues.map(issue => issue.message),
    ['ignore[0] "vendor/" contains ignore[1] "vendor/lib/"; ignore paths must be disjoint.'],
  )
})

test('a generated path is distinct and inside an owned path', () => {
  const { issues } = buildIndex({
    owned: [owned(0, 'docs/', 2), owned(1, 'api.md', 4)],
    generated: [generated(0, 'docs/a.md', 6), generated(1, 'api.md', 8), generated(2, 'docs/a.md', 10), generated(3, 'out.md', 12)],
    ignore: [],
  })

  assert.deepEqual(
    issues.map(issue => issue.message),
    [
      'generated[2].path "docs/a.md" repeats generated[0].path; a file is generated by one command.',
      'generated[3].path "out.md" is not inside any owned path; a generated file needs an owner.',
    ],
  )
  assert.equal(issues[1]?.fix, 'declare "out.md" in owned[], or move it inside an existing owned entry')
})

test('an ignore neither equals nor contains an owned or generated path, but may sit inside an owned directory', () => {
  const { issues } = buildIndex({
    owned: [owned(0, 'src/', 2), owned(1, 'lib/a.ts', 4)],
    generated: [generated(0, 'src/gen/out.ts', 6)],
    ignore: [ignore(0, 'src/vendor/', 8), ignore(1, 'lib/a.ts', 9), ignore(2, 'src/gen/', 10)],
  })

  assert.deepEqual(
    issues.map(issue => issue.message),
    [
      'ignore[1] "lib/a.ts" equals owned[1].path; a path cannot be declared and ignored.',
      'ignore[2] "src/gen/" contains generated[0].path "src/gen/out.ts"; a path cannot be declared and ignored.',
    ],
  )
})

test('paths that differ only in case are an error naming both, across kinds', () => {
  const { issues } = buildIndex({ owned: [owned(0, 'Docs/', 2)], generated: [], ignore: [ignore(0, 'docs/', 5)] })

  assert.equal(issues[0]?.message, 'ignore[0] "docs/" and owned[0].path "Docs/" differ only in case')
  assert.equal(issues[0]?.fix, 'use the same case in both: on GitHub they are two different paths')
})

test('every relation error is collected in one run, sorted by file and line', () => {
  const { issues } = buildIndex({
    owned: [owned(0, 'a/', 2), owned(1, 'a/b/', 4), owned(0, 'x/', 9, 'other.yml'), owned(1, 'x/', 11, 'other.yml')],
    generated: [generated(0, 'z.md', 6)],
    ignore: [],
  })

  assert.deepEqual(
    issues.map(issue => `${issue.file}:${issue.line}`),
    ['.ownership.yml:2', '.ownership.yml:6', 'other.yml:11'],
  )
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/resolve/split.test.ts test/resolve/relations.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the types**

`plugins/ownership/plugin/src/resolve/types.ts`:

```ts
import type { Origin, PluginBlocks } from '../schema/types.ts'

export type RuleOrigin = Origin

export interface OwnedRule {
  readonly kind: 'owned'
  readonly path: string
  readonly owner: string
  readonly skill?: string
  readonly plugins: PluginBlocks
  readonly origin: RuleOrigin
}

export interface GeneratedRule {
  readonly kind: 'generated'
  readonly path: string
  readonly command: string
  readonly origin: RuleOrigin
}

export interface IgnoreRule {
  readonly kind: 'ignore'
  readonly path: string
  readonly origin: RuleOrigin
}

export type Rule = OwnedRule | GeneratedRule | IgnoreRule

/** One path segment. A node holds at most one rule of each kind. */
export interface TrieNode {
  readonly children: Readonly<Record<string, TrieNode>>
  readonly owned?: OwnedRule
  readonly generated?: GeneratedRule
  readonly ignore?: IgnoreRule
}

export interface OwnershipFileInfo {
  readonly path: string
  /** `''` for the repository root, otherwise a directory with a trailing `/`. */
  readonly base: string
  readonly includedBy?: string
}

/** Every ownership file of the repository, composed and checked. Deeply frozen. */
export interface ResolvedOwnership {
  readonly root: string
  readonly rootFile: string
  readonly files: readonly OwnershipFileInfo[]
  readonly plugins: PluginBlocks
  readonly owned: readonly OwnedRule[]
  readonly generated: readonly GeneratedRule[]
  readonly ignore: readonly IgnoreRule[]
  readonly index: TrieNode
}

export interface ResolveOptions {
  /** The repository files; when given, a containment error suggests the split. */
  repoFiles?: ReadonlySet<string>
  /** Follow only the includes whose directory is an ancestor of one of these paths. */
  prune?: readonly string[]
  /** An explicit root ownership file, relative to the repository root. */
  ownership?: string
}
```

- [ ] **Step 4: Write the trie**

`plugins/ownership/plugin/src/resolve/trie.ts`:

```ts
import { segmentsOf } from '../paths/paths.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, TrieNode } from './types.ts'

export interface MutableTrieNode {
  children: Record<string, MutableTrieNode>
  owned?: OwnedRule
  generated?: GeneratedRule
  ignore?: IgnoreRule
}

export function newNode(): MutableTrieNode {
  return { children: Object.create(null) as Record<string, MutableTrieNode> }
}

/** The node of `path`, created when missing, and the nodes above it, root first. */
export function descend(root: MutableTrieNode, path: string): { node: MutableTrieNode; ancestors: MutableTrieNode[] } {
  const ancestors: MutableTrieNode[] = []
  let node = root

  for (const segment of segmentsOf(path)) {
    ancestors.push(node)

    let child = node.children[segment]

    if (child === undefined) {
      child = newNode()
      node.children[segment] = child
    }

    node = child
  }

  return { node, ancestors }
}

/** Every node strictly below `node`. */
export function descendants(node: TrieNode): TrieNode[] {
  const found: TrieNode[] = []
  const stack = Object.values(node.children)

  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    found.push(next)
    stack.push(...Object.values(next.children))
  }

  return found
}

export function nodeAt(index: TrieNode, path: string): TrieNode | null {
  let node: TrieNode | undefined = index

  for (const segment of segmentsOf(path)) {
    node = node.children[segment]

    if (node === undefined) {
      return null
    }
  }

  return node
}

/**
 * The rule that covers `path`: a directory rule met on the way down, or the
 * rule of the path itself. A file rule covers only that file. The walk is one
 * step per segment, whatever the number of declared entries.
 */
function covering<R extends OwnedRule | IgnoreRule>(index: TrieNode, path: string, pick: (node: TrieNode) => R | undefined): R | null {
  const segments = segmentsOf(path)
  const isDirectory = path.endsWith('/')
  let node: TrieNode = index

  for (let i = 0; i < segments.length; i++) {
    const child: TrieNode | undefined = node.children[segments[i] ?? '']

    if (child === undefined) {
      return null
    }

    node = child

    const rule = pick(node)

    if (rule !== undefined) {
      const last = i === segments.length - 1
      const matches = rule.path.endsWith('/') ? !last || isDirectory : last && !isDirectory

      if (matches) {
        return rule
      }
    }
  }

  return null
}

export function coveringOwned(index: TrieNode, path: string): OwnedRule | null {
  return covering(index, path, node => node.owned)
}

export function coveringIgnore(index: TrieNode, path: string): IgnoreRule | null {
  return covering(index, path, node => node.ignore)
}
```

- [ ] **Step 5: Write the split suggestion**

`plugins/ownership/plugin/src/resolve/split.ts`:

```ts
import { segmentsOf } from '../paths/paths.ts'

/**
 * The paths that replace `outer` so that it stops containing `inner`: level by
 * level, from `outer` down to `inner`, every child of the level except the one
 * that leads to `inner`, directories with a trailing `/`. A child that an
 * ignore leaves out is not listed. Sorted.
 */
export function splitSuggestion(outer: string, inner: string, repoFiles: ReadonlySet<string>, isIgnored: (path: string) => boolean): string[] {
  const rest = segmentsOf(inner.slice(outer.length))
  const levels: { dir: string; skip: string }[] = []
  let dir = outer

  rest.forEach((segment, i) => {
    const leadsToFile = i === rest.length - 1 && !inner.endsWith('/')

    levels.push({ dir, skip: leadsToFile ? segment : `${segment}/` })
    dir = `${dir}${segment}/`
  })

  const children = new Set<string>()

  for (const file of repoFiles) {
    for (const level of levels) {
      if (!file.startsWith(level.dir)) {
        break
      }

      const tail = file.slice(level.dir.length)
      const slash = tail.indexOf('/')
      const child = slash === -1 ? tail : tail.slice(0, slash + 1)

      if (child !== level.skip) {
        children.add(`${level.dir}${child}`)
      }
    }
  }

  return [...children].filter(child => !isIgnored(child)).sort()
}
```

- [ ] **Step 6: Write the relations**

`plugins/ownership/plugin/src/resolve/relations.ts`:

```ts
import type { Issue } from '../errors.ts'
import { splitSuggestion } from './split.ts'
import { coveringIgnore, coveringOwned, descend, descendants, newNode, nodeAt } from './trie.ts'
import type { MutableTrieNode } from './trie.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, Rule } from './types.ts'

export interface DeclaredRules {
  owned: readonly OwnedRule[]
  generated: readonly GeneratedRule[]
  ignore: readonly IgnoreRule[]
}

const SUGGESTION_LIMIT = 20

function label(rule: Rule): string {
  return rule.kind === 'ignore' ? rule.origin.keyPath : `${rule.origin.keyPath}.path`
}

function location(rule: Rule): string {
  return rule.origin.line === undefined ? rule.origin.file : `${rule.origin.file}:${rule.origin.line}`
}

/** Where `other` was declared, said only when it is another file than the one of `rule`. */
function elsewhere(rule: Rule, other: Rule): string {
  return rule.origin.file === other.origin.file ? '' : ` (${location(other)})`
}

function issueAt(rule: Rule, message: string, fix: string): Issue {
  return { file: rule.origin.file, keyPath: label(rule), ...(rule.origin.line === undefined ? {} : { line: rule.origin.line }), message, fix }
}

function compareIssues(a: Issue, b: Issue): number {
  if (a.file !== b.file) {
    return a.file < b.file ? -1 : 1
  }

  if (a.line !== b.line) {
    return (a.line ?? 0) - (b.line ?? 0)
  }

  return a.message < b.message ? -1 : a.message > b.message ? 1 : 0
}

function replaceWith(outer: string, inner: string, children: readonly string[]): string {
  if (children.length === 0) {
    return `remove "${outer}": no other file is under it besides "${inner}"`
  }

  const shown = children.slice(0, SUGGESTION_LIMIT).join(', ')
  const more = children.length > SUGGESTION_LIMIT ? ` and ${children.length - SUGGESTION_LIMIT} more` : ''

  return `replace "${outer}" with: ${shown}${more} (keep ${inner})`
}

function caseIssues(rules: DeclaredRules): Issue[] {
  const issues: Issue[] = []
  const seen = new Map<string, Rule>()

  for (const rule of [...rules.owned, ...rules.generated, ...rules.ignore]) {
    const key = rule.path.toLowerCase()
    const first = seen.get(key)

    if (first === undefined) {
      seen.set(key, rule)
    } else if (first.path !== rule.path) {
      issues.push(
        issueAt(
          rule,
          `${label(rule)} "${rule.path}" and ${label(first)} "${first.path}"${elsewhere(rule, first)} differ only in case`,
          'use the same case in both: on GitHub they are two different paths',
        ),
      )
    }
  }

  return issues
}

/**
 * Inserts every declared path into the index and collects every broken
 * relation: owned paths disjoint, ignore paths disjoint, generated paths
 * distinct and each inside an owned path, no ignore equal to or containing an
 * owned or generated path, no two paths that differ only in case.
 */
export function buildIndex(rules: DeclaredRules, repoFiles?: ReadonlySet<string>): { index: MutableTrieNode; issues: Issue[] } {
  const index = newNode()
  const issues = caseIssues(rules)
  const containments: [OwnedRule, OwnedRule][] = []

  for (const rule of rules.owned) {
    const { node, ancestors } = descend(index, rule.path)

    for (const ancestor of ancestors) {
      if (ancestor.owned?.path.endsWith('/')) {
        containments.push([ancestor.owned, rule])
      }
    }

    if (node.owned !== undefined) {
      issues.push(issueAt(rule, `${label(rule)} "${rule.path}" repeats ${label(node.owned)}${elsewhere(rule, node.owned)}; owned paths must be disjoint.`, 'remove one of the two entries'))
      continue
    }

    if (rule.path.endsWith('/')) {
      for (const below of descendants(node)) {
        if (below.owned !== undefined) {
          containments.push([rule, below.owned])
        }
      }
    }

    node.owned = rule
  }

  for (const rule of rules.ignore) {
    const { node, ancestors } = descend(index, rule.path)

    for (const ancestor of ancestors) {
      if (ancestor.ignore?.path.endsWith('/')) {
        const outer = ancestor.ignore

        issues.push(
          issueAt(
            outer,
            `${label(outer)} "${outer.path}" contains ${label(rule)} "${rule.path}"${elsewhere(outer, rule)}; ignore paths must be disjoint.`,
            `remove ${label(rule)}: "${outer.path}" already leaves it out`,
          ),
        )
      }
    }

    if (node.ignore !== undefined) {
      issues.push(issueAt(rule, `${label(rule)} "${rule.path}" repeats ${label(node.ignore)}${elsewhere(rule, node.ignore)}; ignore paths must be disjoint.`, 'remove one of the two entries'))
      continue
    }

    if (rule.path.endsWith('/')) {
      for (const below of descendants(node)) {
        if (below.ignore !== undefined) {
          issues.push(
            issueAt(
              rule,
              `${label(rule)} "${rule.path}" contains ${label(below.ignore)} "${below.ignore.path}"${elsewhere(rule, below.ignore)}; ignore paths must be disjoint.`,
              `remove ${label(below.ignore)}: "${rule.path}" already leaves it out`,
            ),
          )
        }
      }
    }

    node.ignore = rule
  }

  for (const rule of rules.generated) {
    const { node } = descend(index, rule.path)

    if (node.generated !== undefined) {
      issues.push(
        issueAt(rule, `${label(rule)} "${rule.path}" repeats ${label(node.generated)}${elsewhere(rule, node.generated)}; a file is generated by one command.`, 'remove one of the two entries'),
      )
      continue
    }

    node.generated = rule
  }

  for (const rule of rules.generated) {
    if (coveringOwned(index, rule.path) === null) {
      issues.push(
        issueAt(
          rule,
          `${label(rule)} "${rule.path}" is not inside any owned path; a generated file needs an owner.`,
          `declare "${rule.path}" in owned[], or move it inside an existing owned entry`,
        ),
      )
    }
  }

  for (const rule of rules.ignore) {
    const node = nodeAt(index, rule.path)

    if (node === null) {
      continue
    }

    for (const clash of [node.owned, node.generated]) {
      if (clash !== undefined) {
        issues.push(issueAt(rule, `${label(rule)} "${rule.path}" equals ${label(clash)}${elsewhere(rule, clash)}; a path cannot be declared and ignored.`, 'remove one of the two declarations'))
      }
    }

    if (rule.path.endsWith('/')) {
      for (const below of descendants(node)) {
        for (const clash of [below.owned, below.generated]) {
          if (clash !== undefined) {
            issues.push(
              issueAt(
                rule,
                `${label(rule)} "${rule.path}" contains ${label(clash)} "${clash.path}"${elsewhere(rule, clash)}; a path cannot be declared and ignored.`,
                'remove one of the two declarations',
              ),
            )
          }
        }
      }
    }
  }

  for (const [outer, inner] of containments) {
    const children = repoFiles === undefined ? null : splitSuggestion(outer.path, inner.path, repoFiles, path => coveringIgnore(index, path) !== null)

    issues.push(
      issueAt(
        outer,
        `${label(outer)} "${outer.path}" contains ${label(inner)} "${inner.path}"${elsewhere(outer, inner)}; owned paths must be disjoint.`,
        children === null ? `split "${outer.path}" into entries that leave out "${inner.path}"` : replaceWith(outer.path, inner.path, children),
      ),
    )
  }

  return { index, issues: issues.sort(compareIssues) }
}
```

- [ ] **Step 7: Run them to see them pass**

Run: `node --test test/resolve/split.test.ts test/resolve/relations.test.ts`
Expected: PASS (3 + 11 tests).

- [ ] **Step 8: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/resolve plugins/ownership/test/resolve
git commit -m "feat(ownership): index the declared paths and check their relations

Every broken relation between owned, generated and ignore paths is
collected in one run; an owned containment suggests the entries that
replace the outer path.

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Find the root file, follow includes and confine paths to each base

**Files:**
- Create: `plugins/ownership/plugin/src/resolve/load.ts`
- Test: `plugins/ownership/test/resolve/load.test.ts`

**Interfaces:**
- Consumes: `parseOwnershipFile` (`schema/parse.ts`), `RawFile`, `RawPath`, `Origin` (`schema/types.ts`), `dirOf`, `literalProblem`, `normalizePath`, `resolveUnder`, `toPosix` (`paths/paths.ts`), `OwnershipError`.
- Produces:
  - `ROOT_CANDIDATES: readonly ['.ownership.yml', 'docs/.ownership.yml']`
  - `findRootFile(root: string, explicit?: string): string | null` — `explicit` must exist; otherwise the candidates in order; two present is an `OwnershipError` naming both; none is `null`. Returns the repository-relative path (`/`).
  - `interface LoadedFile { path: string; base: string; raw: RawFile; includedBy?: string }` — `raw` holds paths already resolved against `base` (repository-relative).
  - `loadFiles(root: string, rootFile: string, prune?: readonly string[]): LoadedFile[]` — depth-first, root first; throws `OwnershipError` at the first error.

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/resolve/load.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { findRootFile, loadFiles } from '../../plugin/src/resolve/load.ts'
import { tempRepo } from '../helpers/repo.ts'

function errorOf(fn: () => unknown): OwnershipError {
  try {
    fn()
  } catch (error) {
    assert.ok(error instanceof OwnershipError, `expected an OwnershipError, got ${String(error)}`)

    return error
  }
  assert.fail('expected a load error')
}

const V1 = 'version: 1\n'

test('the root file is the explicit one, then .ownership.yml, then docs/.ownership.yml', t => {
  assert.equal(findRootFile(tempRepo(t, {}, { git: false })), null)
  assert.equal(findRootFile(tempRepo(t, { '.ownership.yml': V1 }, { git: false })), '.ownership.yml')
  assert.equal(findRootFile(tempRepo(t, { 'docs/.ownership.yml': V1 }, { git: false })), 'docs/.ownership.yml')
  assert.equal(findRootFile(tempRepo(t, { '.ownership.yml': V1, 'config/own.yml': V1 }, { git: false }), 'config/own.yml'), 'config/own.yml')
})

test('two root candidates are an error that names both; the system never picks one', t => {
  const root = tempRepo(t, { '.ownership.yml': V1, 'docs/.ownership.yml': V1 }, { git: false })

  assert.equal(
    errorOf(() => findRootFile(root)).message,
    '.ownership.yml: two root ownership files: .ownership.yml and docs/.ownership.yml; the root is one file\n  → merge them into one, or point --ownership at the one to use',
  )
})

test('an explicit root file that does not exist is an error', t => {
  assert.match(errorOf(() => findRootFile(tempRepo(t, {}, { git: false }), 'missing.yml')).message, /the ownership file missing\.yml does not exist/)
})

test('the base of the root is the repository root, whichever candidate won', t => {
  const root = tempRepo(t, { 'docs/.ownership.yml': "version: 1\nowned:\n  - path: src/\n    owner: '@a'\n" }, { git: false })

  assert.deepEqual(
    loadFiles(root, 'docs/.ownership.yml').map(file => [file.path, file.base, file.raw.owned.map(entry => entry.path)]),
    [['docs/.ownership.yml', '', ['src/']]],
  )
})

test('an included file resolves its paths against its directory plus basePath', t => {
  const root = tempRepo(
    t,
    {
      '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n  - plugins/y/.ownership.yml\n',
      'plugins/x/.ownership.yml': "version: 1\nowned:\n  - path: src/\n    owner: '@x'\n",
      'plugins/y/.ownership.yml': "version: 1\nbasePath: sub\nowned:\n  - path: a.ts\n    owner: '@y'\nignore:\n  - vendor/\n",
    },
    { git: false },
  )

  assert.deepEqual(
    loadFiles(root, '.ownership.yml').map(file => [file.path, file.base, file.includedBy ?? null, file.raw.owned.map(entry => entry.path), file.raw.ignore.map(entry => entry.path)]),
    [
      ['.ownership.yml', '', null, [], []],
      ['plugins/x/.ownership.yml', 'plugins/x/', '.ownership.yml', ['plugins/x/src/'], []],
      ['plugins/y/.ownership.yml', 'plugins/y/sub/', '.ownership.yml', ['plugins/y/sub/a.ts'], ['plugins/y/sub/vendor/']],
    ],
  )
})

test('basePath only descends', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - x/.ownership.yml\n', 'x/.ownership.yml': 'version: 1\nbasePath: ../y\n' }, { git: false })

  assert.equal(
    errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]?.message,
    'basePath "../y" must only descend from the directory of the file: no "..", no glob, no absolute path',
  )
})

test('a path that escapes its base shows the resolved path and the base', t => {
  const root = tempRepo(
    t,
    { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/.ownership.yml': "version: 1\nowned:\n  - path: ../y/a.ts\n    owner: '@x'\n" },
    { git: false },
  )

  assert.equal(
    errorOf(() => loadFiles(root, '.ownership.yml')).message,
    'plugins/x/.ownership.yml:3: owned[0].path "../y/a.ts" resolves to "plugins/y/a.ts", outside the base "plugins/x/" of plugins/x/.ownership.yml\n  → declare the path in an ownership file whose base contains it',
  )
})

test('an owned entry that resolves to the repository root is an error', t => {
  const root = tempRepo(t, { '.ownership.yml': "version: 1\nowned:\n  - path: ./\n    owner: '@a'\n" }, { git: false })

  assert.equal(
    errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]?.message,
    'owned[0].path "./" resolves to the repository root; an entry names a file or a directory inside it',
  )
})

test('a directory include needs exactly one ownership file', t => {
  const none = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/README.md': '' }, { git: false })
  const two = tempRepo(
    t,
    { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/ownership.yml': V1, 'plugins/x/.ownership.a.yml': V1 },
    { git: false },
  )

  assert.equal(errorOf(() => loadFiles(none, '.ownership.yml')).issues[0]?.message, 'include[0] names the directory plugins/x/, which holds no ownership file')
  assert.equal(
    errorOf(() => loadFiles(two, '.ownership.yml')).issues[0]?.message,
    'include[0] names the directory plugins/x/, which holds 2 ownership files: .ownership.a.yml, ownership.yml',
  )
})

test('a missing included file names who included it', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/own.yml\n' }, { git: false })
  const issue = errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]

  assert.equal(issue?.file, '.ownership.yml')
  assert.equal(issue?.line, 3)
  assert.equal(issue?.message, 'include[0] names plugins/x/own.yml, which does not exist')
})

test('an include cycle shows the chain', t => {
  const root = tempRepo(
    t,
    {
      '.ownership.yml': 'version: 1\ninclude:\n  - a/.ownership.yml\n',
      'a/.ownership.yml': 'version: 1\ninclude:\n  - .ownership.b.yml\n',
      'a/.ownership.b.yml': 'version: 1\ninclude:\n  - .ownership.yml\n',
    },
    { git: false },
  )
  const issue = errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]

  assert.equal(issue?.file, 'a/.ownership.b.yml')
  assert.equal(issue?.message, 'include cycle: .ownership.yml → a/.ownership.yml → a/.ownership.b.yml → a/.ownership.yml')
})

test('a file included twice names both includers', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - a/.ownership.yml\n  - a/\n', 'a/.ownership.yml': V1 }, { git: false })

  assert.equal(
    errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]?.message,
    'a/.ownership.yml is included twice: by .ownership.yml:3 and by .ownership.yml:4',
  )
})

test('pruning follows only the includes whose directory is an ancestor of a pruned path', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/.ownership.yml': 'version: 2\n' }, { git: false })

  assert.deepEqual(
    loadFiles(root, '.ownership.yml', ['src/a.ts']).map(file => file.path),
    ['.ownership.yml'],
  )
  assert.match(errorOf(() => loadFiles(root, '.ownership.yml', ['plugins/x/a.ts'])).message, /version 2 is not supported/)
})

test('plugins in an included file is an error that names that file', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - x/\n', 'x/.ownership.yml': 'version: 1\nplugins:\n  a: {}\n' }, { git: false })

  assert.equal(errorOf(() => loadFiles(root, '.ownership.yml')).issues[0]?.file, 'x/.ownership.yml')
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/resolve/load.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`plugins/ownership/plugin/src/resolve/load.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

import { OwnershipError } from '../errors.ts'
import { dirOf, literalProblem, normalizePath, resolveUnder, toPosix } from '../paths/paths.ts'
import { parseOwnershipFile } from '../schema/parse.ts'
import type { Origin, RawFile, RawPath } from '../schema/types.ts'

export const ROOT_CANDIDATES = ['.ownership.yml', 'docs/.ownership.yml'] as const

const INCLUDE_NAME = /^(?:ownership\.yml|\.ownership\.yml|\.ownership\.[^/]+\.ya?ml)$/

export interface LoadedFile {
  path: string
  base: string
  /** Paths already resolved against `base`, relative to the repository root. */
  raw: RawFile
  includedBy?: string
}

function errorAt(origin: Origin, keyPath: string, message: string, fix?: string): OwnershipError {
  return new OwnershipError([
    { file: origin.file, keyPath, ...(origin.line === undefined ? {} : { line: origin.line }), message, ...(fix === undefined ? {} : { fix }) },
  ])
}

function location(origin: Origin): string {
  return origin.line === undefined ? origin.file : `${origin.file}:${origin.line}`
}

function displayPath(root: string, absolute: string): string {
  const relativePath = relative(root, absolute)

  return relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath) ? toPosix(absolute) : toPosix(relativePath)
}

/** The root ownership file, relative to the repository root, or null when the repository has none. */
export function findRootFile(root: string, explicit?: string): string | null {
  if (explicit !== undefined && explicit !== '') {
    const absolute = resolve(root, explicit)

    if (!existsSync(absolute)) {
      throw new OwnershipError([{ file: explicit, message: `the ownership file ${explicit} does not exist`, fix: 'correct the path given by --ownership or OWNERSHIP_CONFIG' }])
    }

    return displayPath(root, absolute)
  }

  const present = ROOT_CANDIDATES.filter(candidate => existsSync(resolve(root, candidate)))

  if (present.length > 1) {
    throw new OwnershipError([
      {
        file: present[0] ?? ROOT_CANDIDATES[0],
        message: `two root ownership files: ${present.join(' and ')}; the root is one file`,
        fix: 'merge them into one, or point --ownership at the one to use',
      },
    ])
  }

  return present[0] ?? null
}

function baseOf(file: string, raw: RawFile): string {
  const dir = dirOf(file)

  if (raw.basePath === undefined) {
    return dir
  }

  const declared = raw.basePath.path
  const posix = toPosix(declared)
  const escapes = /(^|\/)\.\.(\/|$)/.test(posix) || /^[A-Za-z]:/.test(posix) || literalProblem(posix) !== null

  if (escapes) {
    throw errorAt(
      raw.basePath.origin,
      'basePath',
      `basePath "${declared}" must only descend from the directory of the file: no "..", no glob, no absolute path`,
      'write basePath as a directory below the directory of the file',
    )
  }

  return `${dir}${normalizePath(`${posix}/`)}`
}

function confine(raw: RawFile, base: string): RawFile {
  const place = (keyPath: string, origin: Origin, path: string, mayBeRoot: boolean): string => {
    const resolved = resolveUnder(base, path)

    if (!resolved.ok) {
      throw errorAt(
        origin,
        keyPath,
        `${keyPath} "${path}" resolves to "${resolved.resolved}", outside the base "${base === '' ? './' : base}" of ${raw.file}`,
        'declare the path in an ownership file whose base contains it',
      )
    }

    if (resolved.path === '' && !mayBeRoot) {
      throw errorAt(
        origin,
        keyPath,
        `${keyPath} "${path}" resolves to the repository root; an entry names a file or a directory inside it`,
        'declare the files and directories of the root one by one',
      )
    }

    return resolved.path
  }

  return {
    ...raw,
    owned: raw.owned.map(entry => ({ ...entry, path: place(`${entry.origin.keyPath}.path`, entry.origin, entry.path, false) })),
    generated: raw.generated.map(entry => ({ ...entry, path: place(`${entry.origin.keyPath}.path`, entry.origin, entry.path, false) })),
    ignore: raw.ignore.map(entry => ({ ...entry, path: place(entry.origin.keyPath, entry.origin, entry.path, false) })),
    include: raw.include.map(entry => ({ ...entry, path: place(entry.origin.keyPath, entry.origin, entry.path, true) })),
  }
}

function includeTarget(root: string, item: RawPath): string {
  const keyPath = item.origin.keyPath

  if (item.path !== '' && !item.path.endsWith('/')) {
    return item.path
  }

  let names: string[]

  try {
    names = readdirSync(resolve(root, item.path))
  } catch {
    throw errorAt(item.origin, keyPath, `${keyPath} names the directory ${item.path || './'}, which does not exist`, 'correct the include path')
  }

  const found = names.filter(name => INCLUDE_NAME.test(name)).sort()

  if (found.length === 0) {
    throw errorAt(item.origin, keyPath, `${keyPath} names the directory ${item.path || './'}, which holds no ownership file`, `add .ownership.yml to it, or name the file to include`)
  }

  if (found.length > 1) {
    throw errorAt(item.origin, keyPath, `${keyPath} names the directory ${item.path || './'}, which holds ${found.length} ownership files: ${found.join(', ')}`, 'name the file to include')
  }

  return `${item.path}${found[0] ?? ''}`
}

function read(root: string, file: string, includer: Origin | undefined): string {
  try {
    return readFileSync(resolve(root, file), 'utf8')
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'does not exist' : 'cannot be read'

    if (includer === undefined) {
      throw new OwnershipError([{ file, message: `the ownership file ${reason}` }])
    }

    throw errorAt(includer, includer.keyPath, `${includer.keyPath} names ${file}, which ${reason}`, 'correct the include path, or create the file')
  }
}

/**
 * Reads the root file and every file it includes, depth-first. A file is read
 * once in the whole repository. With `prune`, only the includes whose
 * directory is an ancestor of a pruned path are followed — safe because a base
 * only descends.
 */
export function loadFiles(root: string, rootFile: string, prune?: readonly string[]): LoadedFile[] {
  const loaded: LoadedFile[] = []
  const includers = new Map<string, Origin>()

  const visit = (file: string, includer: Origin | undefined, chain: readonly string[]): void => {
    const raw = parseOwnershipFile(read(root, file, includer), file, { isRoot: includer === undefined })
    const base = includer === undefined ? '' : baseOf(file, raw)
    const confined = confine(raw, base)

    loaded.push({ path: file, base, raw: confined, ...(includer === undefined ? {} : { includedBy: includer.file }) })

    for (const item of confined.include) {
      const target = includeTarget(root, item)

      if (prune !== undefined && !prune.some(path => path.startsWith(dirOf(target)))) {
        continue
      }

      if (chain.includes(target)) {
        throw errorAt(item.origin, item.origin.keyPath, `include cycle: ${[...chain, target].join(' → ')}`, 'remove one of the includes of the cycle')
      }

      const previous = includers.get(target)

      if (previous !== undefined) {
        throw errorAt(item.origin, item.origin.keyPath, `${target} is included twice: by ${location(previous)} and by ${location(item.origin)}`, 'include it once')
      }

      includers.set(target, item.origin)
      visit(target, item.origin, [...chain, target])
    }
  }

  visit(rootFile, undefined, [rootFile])

  return loaded
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node --test test/resolve/load.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/resolve/load.ts plugins/ownership/test/resolve/load.test.ts
git commit -m "feat(ownership): find the root file, follow includes and confine paths

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Resolve the ownership configuration and look rules up

**Files:**
- Create: `plugins/ownership/plugin/src/resolve/resolve.ts`
- Create: `plugins/ownership/plugin/src/resolve/lookup.ts`
- Test: `plugins/ownership/test/resolve/resolve.test.ts`

**Interfaces:**
- Consumes: `findRootFile`, `loadFiles` (Task 7), `buildIndex` (Task 6), `coveringOwned`, `coveringIgnore`, `nodeAt` (Task 6), `isInsideWorkTree` (Task 5), `normalizePath`, `toPosix`, the types of `resolve/types.ts`.
- Produces:
  - `resolveOwnership(root: string, options?: ResolveOptions): ResolvedOwnership | null` — `null` without a root file; `OwnershipError` outside a Git work tree, on any load error, and with every relation error at once. `options.ownership` wins over `OWNERSHIP_CONFIG`. The result is deeply frozen.
  - `findOwnedRule(config: ResolvedOwnership, path: string): OwnedRule | null`
  - `findGeneratedRule(config: ResolvedOwnership, path: string): GeneratedRule | null` — exact file only.
  - `findIgnoreRule(config: ResolvedOwnership, path: string): IgnoreRule | null`
  - `deepestOwnershipFile(config: ResolvedOwnership, path: string): string | null` — the ownership file with the deepest base containing `path`.
  - Every lookup normalizes `path` first (backslashes, `./`, NFC).

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/resolve/resolve.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { deepestOwnershipFile, findGeneratedRule, findIgnoreRule, findOwnedRule } from '../../plugin/src/resolve/lookup.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'
import { tempRepo } from '../helpers/repo.ts'

const ROOT_FILE = [
  'version: 1',
  'plugins:',
  '  docs-kit:',
  '    lang: en',
  'owned:',
  '  - path: README.md',
  "    owner: '@root'",
  '    plugins:',
  '      docs-kit: {}',
  'include:',
  '  - plugins/x/',
  '',
].join('\n')

const PLUGIN_FILE = [
  'version: 1',
  'owned:',
  '  - path: src/',
  "    owner: '@x'",
  '    skill: x-keeper',
  'generated:',
  '  - path: src/gen.ts',
  '    command: node gen.mjs',
  'ignore:',
  '  - src/vendor/',
  '',
].join('\n')

test('a repository without an ownership file resolves to null', t => {
  assert.equal(resolveOwnership(tempRepo(t, { 'a.txt': '' })), null)
})

test('an ownership file outside a Git work tree is a load error', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\n' }, { git: false })

  assert.throws(
    () => resolveOwnership(root),
    (error: unknown) => error instanceof OwnershipError && /is not inside a Git work tree/.test(error.message),
  )
})

test('the files are composed into one frozen configuration with separate plugin blocks', t => {
  const root = tempRepo(t, { '.ownership.yml': ROOT_FILE, 'plugins/x/.ownership.yml': PLUGIN_FILE })
  const config = resolveOwnership(root)

  assert.ok(config !== null)
  assert.equal(config.rootFile, '.ownership.yml')
  assert.deepEqual(config.files, [
    { path: '.ownership.yml', base: '' },
    { path: 'plugins/x/.ownership.yml', base: 'plugins/x/', includedBy: '.ownership.yml' },
  ])
  assert.deepEqual(config.plugins, { 'docs-kit': { lang: 'en' } })
  assert.deepEqual(
    config.owned.map(rule => [rule.path, rule.owner, rule.skill ?? null, rule.plugins, rule.origin.file]),
    [
      ['README.md', '@root', null, { 'docs-kit': {} }, '.ownership.yml'],
      ['plugins/x/src/', '@x', 'x-keeper', {}, 'plugins/x/.ownership.yml'],
    ],
  )
  assert.deepEqual(
    config.generated.map(rule => [rule.path, rule.command]),
    [['plugins/x/src/gen.ts', 'node gen.mjs']],
  )
  assert.deepEqual(
    config.ignore.map(rule => rule.path),
    ['plugins/x/src/vendor/'],
  )

  for (const value of [config, config.owned, config.owned[0], config.owned[0]?.plugins, config.plugins['docs-kit'], config.index, config.index.children, config.files]) {
    assert.ok(Object.isFrozen(value))
  }
})

test('lookups walk the index and normalize the path they receive', t => {
  const root = tempRepo(t, { '.ownership.yml': ROOT_FILE, 'plugins/x/.ownership.yml': PLUGIN_FILE })
  const config = resolveOwnership(root)

  assert.ok(config !== null)
  assert.equal(findOwnedRule(config, 'plugins/x/src/a.ts')?.owner, '@x')
  assert.equal(findOwnedRule(config, 'plugins\\x\\src\\a.ts')?.owner, '@x')
  assert.equal(findOwnedRule(config, './README.md')?.owner, '@root')
  assert.equal(findOwnedRule(config, 'other.md'), null)
  assert.equal(findGeneratedRule(config, 'plugins/x/src/gen.ts')?.command, 'node gen.mjs')
  assert.equal(findGeneratedRule(config, 'plugins/x/src/'), null)
  assert.equal(findIgnoreRule(config, 'plugins/x/src/vendor/lib.js')?.path, 'plugins/x/src/vendor/')
  assert.equal(deepestOwnershipFile(config, 'plugins/x/src/a.ts'), 'plugins/x/.ownership.yml')
  assert.equal(deepestOwnershipFile(config, 'docs/a.md'), '.ownership.yml')
})

test('a declared path in NFD matches the same name in NFC', t => {
  const root = tempRepo(t, { '.ownership.yml': "version: 1\nowned:\n  - path: café.md\n    owner: '@a'\n" })
  const config = resolveOwnership(root)

  assert.ok(config !== null)
  assert.equal(findOwnedRule(config, 'café.md')?.owner, '@a')
})

test('every relation error comes in one load error, with the split suggestion when the files are known', t => {
  const root = tempRepo(t, {
    '.ownership.yml': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n  - path: docs/adr/\n    owner: '@b'\ngenerated:\n  - path: out.md\n    command: gen\n",
    'docs/README.md': '',
    'docs/adr/1.md': '',
  })

  assert.throws(
    () => resolveOwnership(root, { repoFiles: listRepoFiles(root) }),
    (error: unknown) =>
      error instanceof OwnershipError &&
      error.issues.length === 2 &&
      error.issues[0]?.fix === 'replace "docs/" with: docs/README.md (keep docs/adr/)' &&
      /out\.md" is not inside any owned path/.test(error.issues[1]?.message ?? ''),
  )
})

test('pruning skips the includes that cannot hold the paths in question', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/.ownership.yml': 'version: 2\n' })

  assert.ok(resolveOwnership(root, { prune: ['src/a.ts'] }) !== null)
  assert.throws(() => resolveOwnership(root), OwnershipError)
})

test('an explicit root file wins, from the option or from OWNERSHIP_CONFIG, and its base is the repository root', t => {
  const root = tempRepo(t, { 'config/own.yml': "version: 1\nowned:\n  - path: README.md\n    owner: '@a'\n" })

  assert.equal(resolveOwnership(root, { ownership: 'config/own.yml' })?.owned[0]?.path, 'README.md')

  process.env.OWNERSHIP_CONFIG = 'config/own.yml'

  try {
    assert.equal(resolveOwnership(root)?.rootFile, 'config/own.yml')
  } finally {
    delete process.env.OWNERSHIP_CONFIG
  }
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/resolve/resolve.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the lookups**

`plugins/ownership/plugin/src/resolve/lookup.ts`:

```ts
import { normalizePath, toPosix } from '../paths/paths.ts'
import { coveringIgnore, coveringOwned, nodeAt } from './trie.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, OwnershipFileInfo, ResolvedOwnership } from './types.ts'

function clean(path: string): string {
  return normalizePath(toPosix(path))
}

/** The owned rule that covers `path` — a file, or a directory when it ends with `/` — or null. */
export function findOwnedRule(config: ResolvedOwnership, path: string): OwnedRule | null {
  return coveringOwned(config.index, clean(path))
}

/** The generated rule declared for exactly this file, or null. */
export function findGeneratedRule(config: ResolvedOwnership, path: string): GeneratedRule | null {
  const target = clean(path)

  if (target === '' || target.endsWith('/')) {
    return null
  }

  return nodeAt(config.index, target)?.generated ?? null
}

export function findIgnoreRule(config: ResolvedOwnership, path: string): IgnoreRule | null {
  return coveringIgnore(config.index, clean(path))
}

/** The ownership file with the deepest base that contains `path`: where a missing entry for it belongs. */
export function deepestOwnershipFile(config: ResolvedOwnership, path: string): string | null {
  const target = clean(path)
  let best: OwnershipFileInfo | null = null

  for (const file of config.files) {
    if (target.startsWith(file.base) && (best === null || file.base.length > best.base.length)) {
      best = file
    }
  }

  return best?.path ?? null
}
```

- [ ] **Step 4: Write the resolution**

`plugins/ownership/plugin/src/resolve/resolve.ts`:

```ts
import { resolve } from 'node:path'

import { OwnershipError } from '../errors.ts'
import { toPosix } from '../paths/paths.ts'
import { isInsideWorkTree } from '../repo/repo.ts'
import { findRootFile, loadFiles } from './load.ts'
import { buildIndex } from './relations.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, ResolveOptions, ResolvedOwnership } from './types.ts'

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)

    for (const key of Reflect.ownKeys(value)) {
      deepFreeze((value as Record<PropertyKey, unknown>)[key])
    }
  }

  return value
}

/**
 * Reads every ownership file of the repository at `root` and checks it. Null
 * when the repository has no ownership file; an OwnershipError for anything
 * wrong in the files, with every broken relation between paths at once.
 */
export function resolveOwnership(root: string, options: ResolveOptions = {}): ResolvedOwnership | null {
  const absoluteRoot = resolve(root)
  const rootFile = findRootFile(absoluteRoot, options.ownership ?? process.env.OWNERSHIP_CONFIG)

  if (rootFile === null) {
    return null
  }

  if (!isInsideWorkTree(absoluteRoot)) {
    throw new OwnershipError([
      {
        file: rootFile,
        message: `${toPosix(absoluteRoot)} is not inside a Git work tree; the ownership files need one`,
        fix: 'run git init, or point OWNERSHIP_REPO_ROOT at the repository',
      },
    ])
  }

  const files = loadFiles(absoluteRoot, rootFile, options.prune)
  const owned: OwnedRule[] = files.flatMap(file =>
    file.raw.owned.map(entry => ({
      kind: 'owned' as const,
      path: entry.path,
      owner: entry.owner,
      ...(entry.skill === undefined ? {} : { skill: entry.skill }),
      plugins: entry.plugins,
      origin: entry.origin,
    })),
  )
  const generated: GeneratedRule[] = files.flatMap(file =>
    file.raw.generated.map(entry => ({ kind: 'generated' as const, path: entry.path, command: entry.command, origin: entry.origin })),
  )
  const ignore: IgnoreRule[] = files.flatMap(file => file.raw.ignore.map(entry => ({ kind: 'ignore' as const, path: entry.path, origin: entry.origin })))
  const { index, issues } = buildIndex({ owned, generated, ignore }, options.repoFiles)

  if (issues.length > 0) {
    throw new OwnershipError(issues)
  }

  return deepFreeze({
    root: absoluteRoot,
    rootFile,
    files: files.map(file => ({ path: file.path, base: file.base, ...(file.includedBy === undefined ? {} : { includedBy: file.includedBy }) })),
    plugins: files[0]?.raw.plugins ?? {},
    owned,
    generated,
    ignore,
    index,
  })
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `node --test test/resolve/resolve.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/resolve plugins/ownership/test/resolve/resolve.test.ts
git commit -m "feat(ownership): resolve the composed configuration and look rules up

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: CODEOWNERS — location, parser, matcher and effective owner

**Files:**
- Create: `plugins/ownership/plugin/src/codeowners/types.ts`
- Create: `plugins/ownership/plugin/src/codeowners/match.ts`
- Create: `plugins/ownership/plugin/src/codeowners/parse.ts`
- Create: `plugins/ownership/plugin/src/codeowners/locate.ts`
- Test: `plugins/ownership/test/codeowners/codeowners.test.ts`

**Interfaces:**
- Consumes: `normalizePath`, `toPosix` (`paths/paths.ts`), `OwnershipError`.
- Produces:
  - `interface CodeownersLine { readonly pattern: string; readonly owners: readonly string[]; readonly line: number; readonly regex: RegExp; readonly dirOnly: boolean }`
  - `interface Codeowners { readonly file: string; readonly lines: readonly CodeownersLine[] }`
  - `type OwnersResult = { readonly kind: 'no-codeowners' } | { readonly kind: 'unmatched' } | { readonly kind: 'matched'; readonly owners: readonly string[]; readonly line: number }`
  - `compilePattern(pattern: string): { regex: RegExp; dirOnly: boolean }`, `lineMatches(line, path): boolean` (`match.ts`)
  - `ownersOf(codeowners: Codeowners | null, path: string): OwnersResult` — the last matching line wins; a path ending in `/` is evaluated as a directory.
  - `parseCodeowners(text: string, file?: string): Codeowners` — `file` defaults to `'CODEOWNERS'`.
  - `CODEOWNERS_LOCATIONS`, `findCodeowners(root: string): string | null`, `loadCodeowners(root: string): Codeowners | null` — more than one present is an `OwnershipError` naming them.

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/codeowners/codeowners.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { findCodeowners, loadCodeowners } from '../../plugin/src/codeowners/locate.ts'
import { ownersOf } from '../../plugin/src/codeowners/match.ts'
import { parseCodeowners } from '../../plugin/src/codeowners/parse.ts'
import { tempRepo } from '../helpers/repo.ts'

test('each line keeps its pattern, owners and line number; comments and blank lines are skipped', () => {
  const parsed = parseCodeowners('# owners\n\ndocs/ @team @lead # the docs\n*.js @js\nvendor/\n', 'CODEOWNERS')

  assert.equal(parsed.file, 'CODEOWNERS')
  assert.deepEqual(
    parsed.lines.map(line => [line.pattern, line.owners, line.line]),
    [
      ['docs/', ['@team', '@lead'], 3],
      ['*.js', ['@js'], 4],
      ['vendor/', [], 5],
    ],
  )
})

test('a CODEOWNERS with CRLF line ends gives the same owners, without a carriage return', () => {
  const parsed = parseCodeowners('docs/ @team\r\nsrc/ @dev @lead\r\n')

  assert.deepEqual(
    parsed.lines.map(line => [line.pattern, line.owners]),
    [
      ['docs/', ['@team']],
      ['src/', ['@dev', '@lead']],
    ],
  )
})

test('a line with syntax GitHub does not support is dropped, as GitHub drops it', () => {
  const parsed = parseCodeowners('!docs/ @a\n[ab].md @b\nsrc/ @c\n')

  assert.deepEqual(
    parsed.lines.map(line => line.pattern),
    ['src/'],
  )
})

const MATCHES: [string, string, boolean][] = [
  ['*', 'a/b.js', true],
  ['*', 'docs/', true],
  ['*.js', 'a/b.js', true],
  ['*.js', 'b.ts', false],
  ['docs/*', 'docs/a.md', true],
  ['docs/*', 'docs/x/a.md', false],
  ['/docs/', 'docs/a/b.md', true],
  ['/docs/', 'docs/', true],
  ['/docs/', 'docs', false],
  ['apps/', 'x/apps/a.js', true],
  ['apps/', 'apps', false],
  ['docs', 'x/docs/a', true],
  ['**/logs', 'a/b/logs/x', true],
  ['**/logs', 'logs', true],
  ['docs/**', 'docs/a/b', true],
  ['docs/**', 'docs/', false],
  ['docs/**/*.md', 'docs/x/y/a.md', true],
  ['docs/**/*.md', 'docs/', false],
  ['a/**/b', 'a/b', true],
  ['a/**/b', 'a/x/y/b', true],
  ['build/logs/', 'x/build/logs/a', false],
  ['plugins/ownership/', 'plugins/ownership/', true],
  ['plugins/ownership/', 'plugins/', false],
  ['a?c', 'abc', true],
  ['a?c', 'a/c', false],
  ['docs/a.md', 'docs/a.md', true],
]

for (const [pattern, path, expected] of MATCHES) {
  test(`pattern ${pattern} ${expected ? 'matches' : 'does not match'} ${path}`, () => {
    assert.equal(ownersOf(parseCodeowners(`${pattern} @x\n`), path).kind, expected ? 'matched' : 'unmatched')
  })
}

test('the last matching line wins', () => {
  assert.deepEqual(ownersOf(parseCodeowners('docs/ @team\ndocs/ @other\n'), 'docs/a.md'), { kind: 'matched', owners: ['@other'], line: 2 })
})

test('a pattern without owners unsets the owner', () => {
  assert.deepEqual(ownersOf(parseCodeowners('* @all\nvendor/\n'), 'vendor/x.js'), { kind: 'matched', owners: [], line: 2 })
})

test('no CODEOWNERS is told apart from a path no line matches', () => {
  assert.deepEqual(ownersOf(null, 'docs/a.md'), { kind: 'no-codeowners' })
  assert.deepEqual(ownersOf(parseCodeowners('src/ @a\n'), 'docs/a.md'), { kind: 'unmatched' })
})

test('the CODEOWNERS is found where GitHub looks for it', t => {
  assert.equal(findCodeowners(tempRepo(t, {}, { git: false })), null)
  assert.equal(loadCodeowners(tempRepo(t, {}, { git: false })), null)

  const loaded = loadCodeowners(tempRepo(t, { '.github/CODEOWNERS': 'docs/ @team\n' }, { git: false }))

  assert.equal(loaded?.file, '.github/CODEOWNERS')
  assert.equal(loaded?.lines.length, 1)
})

test('more than one CODEOWNERS is an error naming them', t => {
  const root = tempRepo(t, { CODEOWNERS: '* @a\n', 'docs/CODEOWNERS': '* @b\n' }, { git: false })

  assert.throws(
    () => loadCodeowners(root),
    (error: unknown) => error instanceof OwnershipError && error.message.startsWith('CODEOWNERS: more than one CODEOWNERS: CODEOWNERS, docs/CODEOWNERS'),
  )
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/codeowners/codeowners.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the types and the matcher**

`plugins/ownership/plugin/src/codeowners/types.ts`:

```ts
export interface CodeownersLine {
  readonly pattern: string
  /** Empty when the line has a pattern and no owner: on GitHub, that unsets the owner. */
  readonly owners: readonly string[]
  readonly line: number
  readonly regex: RegExp
  readonly dirOnly: boolean
}

export interface Codeowners {
  readonly file: string
  readonly lines: readonly CodeownersLine[]
}

export type OwnersResult =
  | { readonly kind: 'no-codeowners' }
  | { readonly kind: 'unmatched' }
  | { readonly kind: 'matched'; readonly owners: readonly string[]; readonly line: number }
```

`plugins/ownership/plugin/src/codeowners/match.ts`:

```ts
import { normalizePath, toPosix } from '../paths/paths.ts'
import type { Codeowners, CodeownersLine, OwnersResult } from './types.ts'

/**
 * Compiles a CODEOWNERS pattern with GitHub's semantics: a `/` at the start
 * or in the middle anchors it at the root, a pattern without one matches at
 * any level, a trailing `/` means a directory, `*` and `?` do not cross `/`,
 * `**` works at the start, in the middle and at the end, and a pattern that
 * matches a directory matches everything under it — except when its last
 * segment is a wildcard, as in `docs/*`, which GitHub stops at direct children.
 * Group 1 of the expression is the part under the matched directory.
 */
export function compilePattern(pattern: string): { regex: RegExp; dirOnly: boolean } {
  let body = pattern
  const dirOnly = body.endsWith('/')

  if (dirOnly) {
    body = body.slice(0, -1)
  }

  const anchored = body.includes('/')

  if (body.startsWith('/')) {
    body = body.slice(1)
  }

  const segments = body.split('/')
  let source = ''

  segments.forEach((segment, i) => {
    const last = i === segments.length - 1

    if (segment === '**') {
      source += last ? '.*' : '(?:[^/]+/)*'

      return
    }

    source += segment
      .replace(/[.+^${}()|\\]/g, '\\$&')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')

    if (!last) {
      source += '/'
    }
  })

  const lastSegment = segments[segments.length - 1]
  const descendants = lastSegment !== '*' && lastSegment !== '**'

  return { regex: new RegExp(`^${anchored ? '' : '(?:[^/]+/)*'}${source}${descendants ? '(/.*)?' : ''}$`), dirOnly }
}

/** Whether a line matches `path`; a path ending in `/` is a directory. */
export function lineMatches(line: Pick<CodeownersLine, 'regex' | 'dirOnly'>, path: string): boolean {
  const isDirectory = path.endsWith('/')
  const match = line.regex.exec(isDirectory ? path.slice(0, -1) : path)

  if (match === null) {
    return false
  }

  return !line.dirOnly || isDirectory || match[1] !== undefined
}

/** The owners the CODEOWNERS assigns to `path`, as GitHub decides them: the last matching line wins. */
export function ownersOf(codeowners: Codeowners | null, path: string): OwnersResult {
  if (codeowners === null) {
    return { kind: 'no-codeowners' }
  }

  const target = normalizePath(toPosix(path))

  for (let i = codeowners.lines.length - 1; i >= 0; i--) {
    const line = codeowners.lines[i]

    if (line !== undefined && lineMatches(line, target)) {
      return { kind: 'matched', owners: line.owners, line: line.line }
    }
  }

  return { kind: 'unmatched' }
}
```

- [ ] **Step 4: Write the parser and the location**

`plugins/ownership/plugin/src/codeowners/parse.ts`:

```ts
import { compilePattern } from './match.ts'
import type { Codeowners, CodeownersLine } from './types.ts'

/**
 * Reads a CODEOWNERS text: per line, the pattern, the owners and the line
 * number. A line whose pattern uses syntax GitHub does not support (`!`,
 * `[ ]`) is dropped, as GitHub drops it.
 */
export function parseCodeowners(text: string, file = 'CODEOWNERS'): Codeowners {
  const lines: CodeownersLine[] = []

  text.split(/\r?\n/).forEach((raw, index) => {
    const content = raw.trim()

    if (content === '' || content.startsWith('#')) {
      return
    }

    const [first = '', ...rest] = content.split(/\s+/)
    const pattern = first.replace(/^\\#/, '#')

    if (pattern.startsWith('!') || /[[\]]/.test(pattern)) {
      return
    }

    const owners: string[] = []

    for (const token of rest) {
      if (token.startsWith('#')) {
        break
      }

      owners.push(token)
    }

    lines.push({ pattern, owners, line: index + 1, ...compilePattern(pattern) })
  })

  return { file, lines }
}
```

`plugins/ownership/plugin/src/codeowners/locate.ts`:

```ts
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { OwnershipError } from '../errors.ts'
import { parseCodeowners } from './parse.ts'
import type { Codeowners } from './types.ts'

/** Where GitHub looks for the CODEOWNERS. */
export const CODEOWNERS_LOCATIONS = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'] as const

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/** The CODEOWNERS of the repository, or null. GitHub would silently use the first of several; here that is an error. */
export function findCodeowners(root: string): string | null {
  const present = CODEOWNERS_LOCATIONS.filter(location => isFile(join(root, location)))

  if (present.length > 1) {
    throw new OwnershipError([
      {
        file: present[0] ?? CODEOWNERS_LOCATIONS[1],
        message: `more than one CODEOWNERS: ${present.join(', ')}; GitHub reads only the first and ignores the others`,
        fix: 'keep one CODEOWNERS and remove the others',
      },
    ])
  }

  return present[0] ?? null
}

export function loadCodeowners(root: string): Codeowners | null {
  const file = findCodeowners(root)

  return file === null ? null : parseCodeowners(readFileSync(join(root, file), 'utf8'), file)
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `node --test test/codeowners/codeowners.test.ts`
Expected: PASS (34 tests: 26 from the pattern table plus 8).

- [ ] **Step 6: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/codeowners plugins/ownership/test/codeowners
git commit -m "feat(ownership): read CODEOWNERS and evaluate the effective owner as GitHub does

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The marker, the check framework and `ownership/owner-coverage`

**Files:**
- Create: `plugins/ownership/plugin/src/generated/marker.ts`
- Create: `plugins/ownership/plugin/src/checks/types.ts`
- Create: `plugins/ownership/plugin/src/checks/run.ts`
- Create: `plugins/ownership/plugin/src/checks/owner-coverage.ts`
- Create: `plugins/ownership/plugin/src/checks/core.ts`
- Create: `plugins/ownership/test/helpers/check.ts`
- Test: `plugins/ownership/test/generated/marker.test.ts`
- Test: `plugins/ownership/test/checks/run.test.ts`
- Test: `plugins/ownership/test/checks/owner-coverage.test.ts`
- Test: `plugins/ownership/test/checks/core.test.ts`

**Interfaces:**
- Consumes: `ResolvedOwnership`, `OwnedRule` (Task 6), `findOwnedRule`, `findIgnoreRule`, `deepestOwnershipFile` (Task 8), `Codeowners`, `loadCodeowners` (Task 9), `resolveOwnership`, `listRepoFiles`.
- Produces:
  - `isGeneratedByMarker(content: string | Uint8Array): boolean`, `readHead(path: string): Buffer | null`, `HEAD_BYTES` (`generated/marker.ts`)
  - `type Severity = 'error' | 'warning'`
  - `interface Finding { file: string; line?: number; column?: number; checkId: string; severity: Severity; message: string; fix?: string }`
  - `interface CheckContext { readonly root: string; readonly config: ResolvedOwnership; readonly repoFiles: ReadonlySet<string>; readonly jobs: number; codeowners(): Codeowners | null }`
  - `interface Check { readonly id: string; readonly name: string; readonly failsWhen: string; run(ctx: CheckContext): Promise<Finding[]> }`
  - `finding(fields: Finding): Finding` — drops the optional fields left `undefined`.
  - `compareFindings(a, b): number`, `runChecks(checks: readonly Check[], ctx: CheckContext): Promise<Finding[]>`, `createCheckContext(config, repoFiles, jobs): CheckContext` (`checks/run.ts`)
  - `ownerCoverage: Check` (`checks/owner-coverage.ts`)
  - `interface CatalogEntry { readonly id: string; readonly name: string; readonly command: string; readonly failsWhen: string }`, `coreChecks: readonly Check[]`, `coreCheckCatalog: readonly CatalogEntry[]` (`checks/core.ts`)
  - Test helper `runCheck(check: Check, root: string, jobs?: number): Promise<Finding[]>` (`test/helpers/check.ts`).

- [ ] **Step 1: Write the failing tests**

`plugins/ownership/test/generated/marker.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { isGeneratedByMarker, readHead } from '../../plugin/src/generated/marker.ts'
import { tempRepo, writeFile } from '../helpers/repo.ts'

test('the marker counts on the first line, in any case', () => {
  assert.equal(isGeneratedByMarker('<!-- generated: do not edit -->\nbody\n'), true)
  assert.equal(isGeneratedByMarker('// GENERATED: DO NOT EDIT\n'), true)
  assert.equal(isGeneratedByMarker(new TextEncoder().encode('# Generated: Do Not Edit')), true)
})

test('the marker on another line, or beyond the first 512 bytes, does not count', () => {
  assert.equal(isGeneratedByMarker('# Title\ngenerated: do not edit\n'), false)
  assert.equal(isGeneratedByMarker(`${'x'.repeat(600)} generated: do not edit\n`), false)
  assert.equal(isGeneratedByMarker(''), false)
})

test('the head of a regular file is read; a directory or a missing file has none', t => {
  const root = tempRepo(t, {}, { git: false })

  writeFile(root, 'a.md', `generated: do not edit\n${'y'.repeat(2000)}`)
  mkdirSync(join(root, 'dir'))

  assert.equal(readHead(join(root, 'a.md'))?.length, 512)
  assert.equal(readHead(join(root, 'dir')), null)
  assert.equal(readHead(join(root, 'missing.md')), null)
})
```

`plugins/ownership/test/helpers/check.ts`:

```ts
import assert from 'node:assert/strict'

import { createCheckContext } from '../../plugin/src/checks/run.ts'
import type { Check, Finding } from '../../plugin/src/checks/types.ts'
import { listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'

/** Resolves the repository at `root` as the CLI does and runs one check over it. */
export async function runCheck(check: Check, root: string, jobs = 2): Promise<Finding[]> {
  const repoFiles = listRepoFiles(root)
  const config = resolveOwnership(root, { repoFiles })

  assert.ok(config !== null, 'the repository has no ownership file')

  return check.run(createCheckContext(config, repoFiles, jobs))
}
```

`plugins/ownership/test/checks/run.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

import { compareFindings, createCheckContext, runChecks } from '../../plugin/src/checks/run.ts'
import type { Check, Finding } from '../../plugin/src/checks/types.ts'
import { finding } from '../../plugin/src/checks/types.ts'
import { listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'
import { tempRepo } from '../helpers/repo.ts'

const f = (file: string, line: number | undefined, checkId: string, message: string): Finding => finding({ file, line, checkId, severity: 'error', message })

test('a finding keeps only the fields it has', () => {
  assert.deepEqual(Object.keys(f('a', undefined, 'x/y', 'm')), ['file', 'checkId', 'severity', 'message'])
})

test('findings are ordered by file, line (none first), check and message', () => {
  const sorted = [f('b', 1, 'a/a', 'm'), f('a', 2, 'a/a', 'm'), f('a', undefined, 'a/b', 'm'), f('a', 2, 'a/a', 'l'), f('a', 1, 'b/b', 'm')].sort(compareFindings)

  assert.deepEqual(
    sorted.map(item => `${item.file}:${item.line ?? '-'}:${item.checkId}:${item.message}`),
    ['a:-:a/b:m', 'a:1:b/b:m', 'a:2:a/a:l', 'a:2:a/a:m', 'b:1:a/a:m'],
  )
})

test('the runner sorts after every check has run, whatever the order of the checks', async t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\n' })
  const repoFiles = listRepoFiles(root)
  const config = resolveOwnership(root, { repoFiles })

  assert.ok(config !== null)

  const one: Check = { id: 'x/one', name: 'One', failsWhen: '-', run: () => Promise.resolve([f('z', 1, 'x/one', 'm')]) }
  const two: Check = { id: 'x/two', name: 'Two', failsWhen: '-', run: () => Promise.resolve([f('a', 1, 'x/two', 'm')]) }
  const ctx = createCheckContext(config, repoFiles, 1)

  assert.deepEqual(await runChecks([one, two], ctx), await runChecks([two, one], ctx))
  assert.equal((await runChecks([one, two], ctx))[0]?.file, 'a')
})

test('the CODEOWNERS is loaded once, on demand', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\n' }, { codeowners: '* @a\n' })
  const repoFiles = listRepoFiles(root)
  const config = resolveOwnership(root, { repoFiles })

  assert.ok(config !== null)

  const ctx = createCheckContext(config, repoFiles, 1)
  const first = ctx.codeowners()

  rmSync(join(root, 'CODEOWNERS'))

  assert.equal(ctx.codeowners(), first)
  assert.equal(first?.lines.length, 1)
})
```

`plugins/ownership/test/checks/owner-coverage.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { ownerCoverage } from '../../plugin/src/checks/owner-coverage.ts'
import { runCheck } from '../helpers/check.ts'
import { git, tempRepo, writeFile } from '../helpers/repo.ts'

const own = (...entries: [string, string][]): string =>
  ['version: 1', 'owned:', ...entries.flatMap(([path, owner]) => [`  - path: ${path}`, `    owner: '${owner}'`]), ''].join('\n')

test('a repository where every file has an owner passes', async t => {
  const root = tempRepo(t, { '.ownership.yml': own(['.ownership.yml', '@a'], ['src/', '@b']), 'src/a.ts': '', 'src/b/c.ts': '' })

  assert.deepEqual(await runCheck(ownerCoverage, root), [])
})

test('a file with no owned entry nor ignore is a finding whose fix names the ownership file with the deepest base', async t => {
  const root = tempRepo(t, {
    '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\ninclude:\n  - plugins/x/\n",
    'plugins/x/.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@x'\n",
    'plugins/x/src/a.ts': '',
    'README.md': '',
  })

  assert.deepEqual(await runCheck(ownerCoverage, root), [
    {
      file: 'README.md',
      checkId: 'ownership/owner-coverage',
      severity: 'error',
      message: 'no owned entry covers this file',
      fix: 'declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
    },
    {
      file: 'plugins/x/src/a.ts',
      checkId: 'ownership/owner-coverage',
      severity: 'error',
      message: 'no owned entry covers this file',
      fix: 'declare it in owned[] of plugins/x/.ownership.yml, or leave it out with ignore[]',
    },
  ])
})

test('an ignored file needs no owner, and a file a .gitignore excludes is not a repository file', async t => {
  const root = tempRepo(t, {
    '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n  - path: .gitignore\n    owner: '@a'\nignore:\n  - vendor/\n",
    '.gitignore': 'node_modules/\n',
    'vendor/lib.js': '',
    'node_modules/x/index.js': '',
  })

  assert.deepEqual(await runCheck(ownerCoverage, root), [])
})

test('an owned path that matches no file is a finding on its entry', async t => {
  const root = tempRepo(t, { '.ownership.yml': own(['.ownership.yml', '@a'], ['gone.md', '@a'], ['empty/', '@a']) })

  assert.deepEqual(
    (await runCheck(ownerCoverage, root)).map(item => [item.file, item.line, item.message]),
    [
      ['.ownership.yml', 5, 'owned[1].path "gone.md" does not exist in the repository'],
      ['.ownership.yml', 7, 'owned[2].path "empty/" does not exist in the repository'],
    ],
  )
})

test('an owned directory whose files are all ignored is told apart from a missing path', async t => {
  const root = tempRepo(t, {
    '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n  - path: src/\n    owner: '@a'\nignore:\n  - src/vendor/\n",
    'src/vendor/lib.js': '',
  })
  const findings = await runCheck(ownerCoverage, root)

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.message, 'owned[1].path "src/": all its files are ignored')
  assert.equal(findings[0]?.fix, 'remove the entry, or the ignore that leaves its files out')
})

test('an untracked nested repository counts as one file at its path', async t => {
  const root = tempRepo(t, { '.ownership.yml': own(['.ownership.yml', '@a']) })

  writeFile(root, 'vendor/lib/x.js', '')
  git(join(root, 'vendor', 'lib'), 'init', '-q')

  assert.deepEqual(
    (await runCheck(ownerCoverage, root)).map(item => item.file),
    ['vendor/lib'],
  )
})
```

`plugins/ownership/test/checks/core.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { coreCheckCatalog, coreChecks } from '../../plugin/src/checks/core.ts'

test('the public catalog lists the core checks with their command', () => {
  assert.deepEqual(
    coreCheckCatalog.map(entry => [entry.id, entry.command]),
    [['ownership/owner-coverage', 'ownership validate --check ownership/owner-coverage']],
  )
  assert.deepEqual(
    coreChecks.map(check => check.id),
    coreCheckCatalog.map(entry => entry.id),
  )
  assert.ok(coreCheckCatalog.every(entry => entry.name !== '' && entry.failsWhen !== ''))
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/generated/marker.test.ts test/checks/run.test.ts test/checks/owner-coverage.test.ts test/checks/core.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the marker**

`plugins/ownership/plugin/src/generated/marker.ts`:

```ts
import { closeSync, lstatSync, openSync, readSync } from 'node:fs'

const MARKER = 'generated: do not edit'

export const HEAD_BYTES = 512

/** True when the first line, within the first 512 bytes, carries `generated: do not edit`, in any case. */
export function isGeneratedByMarker(content: string | Uint8Array): boolean {
  const bytes = typeof content === 'string' ? Buffer.from(content.slice(0, HEAD_BYTES), 'utf8') : Buffer.from(content.buffer, content.byteOffset, content.byteLength)
  const head = bytes.subarray(0, HEAD_BYTES).toString('utf8')
  const newline = head.indexOf('\n')

  return (newline === -1 ? head : head.slice(0, newline)).toLowerCase().includes(MARKER)
}

/** The first 512 bytes of a regular file; null for a missing file, a directory, a symbolic link or a submodule. */
export function readHead(path: string): Buffer | null {
  try {
    if (!lstatSync(path).isFile()) {
      return null
    }

    const fd = openSync(path, 'r')

    try {
      const buffer = Buffer.alloc(HEAD_BYTES)

      return buffer.subarray(0, readSync(fd, buffer, 0, HEAD_BYTES, 0))
    } finally {
      closeSync(fd)
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Write the check framework**

`plugins/ownership/plugin/src/checks/types.ts`:

```ts
import type { Codeowners } from '../codeowners/types.ts'
import type { ResolvedOwnership } from '../resolve/types.ts'

export type Severity = 'error' | 'warning'

/** What every check returns and what the CLI prints. Renaming or removing a field breaks consumers. */
export interface Finding {
  file: string
  line?: number
  column?: number
  checkId: string
  severity: Severity
  message: string
  fix?: string
}

export interface CheckContext {
  readonly root: string
  readonly config: ResolvedOwnership
  /** The repository files, enumerated once per run. */
  readonly repoFiles: ReadonlySet<string>
  /** How many generators may run at the same time. */
  readonly jobs: number
  /** The CODEOWNERS, loaded on the first call. */
  codeowners(): Codeowners | null
}

export interface Check {
  readonly id: string
  readonly name: string
  readonly failsWhen: string
  run(ctx: CheckContext): Promise<Finding[]>
}

/** A finding without the optional fields left undefined, so it serializes to exactly its fields. */
export function finding(fields: Finding): Finding {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as unknown as Finding
}
```

`plugins/ownership/plugin/src/checks/run.ts`:

```ts
import { loadCodeowners } from '../codeowners/locate.ts'
import type { Codeowners } from '../codeowners/types.ts'
import type { ResolvedOwnership } from '../resolve/types.ts'
import type { Check, CheckContext, Finding } from './types.ts'

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** By file, then line (a finding without a line first), then check, then message. */
export function compareFindings(a: Finding, b: Finding): number {
  if (a.file !== b.file) {
    return compareText(a.file, b.file)
  }

  if (a.line !== b.line) {
    if (a.line === undefined) {
      return -1
    }

    if (b.line === undefined) {
      return 1
    }

    return a.line - b.line
  }

  return compareText(a.checkId, b.checkId) || compareText(a.message, b.message)
}

/** Runs the checks and sorts what they found once every check is done, so the order never depends on timing. */
export async function runChecks(checks: readonly Check[], ctx: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = []

  for (const check of checks) {
    findings.push(...(await check.run(ctx)))
  }

  return findings.sort(compareFindings)
}

export function createCheckContext(config: ResolvedOwnership, repoFiles: ReadonlySet<string>, jobs: number): CheckContext {
  let loaded = false
  let codeowners: Codeowners | null = null

  return {
    root: config.root,
    config,
    repoFiles,
    jobs,
    codeowners() {
      if (!loaded) {
        codeowners = loadCodeowners(config.root)
        loaded = true
      }

      return codeowners
    },
  }
}
```

- [ ] **Step 5: Write `ownership/owner-coverage` and the catalog**

`plugins/ownership/plugin/src/checks/owner-coverage.ts`:

```ts
import { deepestOwnershipFile, findIgnoreRule, findOwnedRule } from '../resolve/lookup.ts'
import type { OwnedRule } from '../resolve/types.ts'
import type { Check, CheckContext, Finding } from './types.ts'
import { finding } from './types.ts'

const ID = 'ownership/owner-coverage'

function coverage(ctx: CheckContext): Finding[] {
  const findings: Finding[] = []
  const covered = new Map<OwnedRule, number>()
  const existing = new Map<OwnedRule, number>()

  for (const file of ctx.repoFiles) {
    const rule = findOwnedRule(ctx.config, file)

    if (rule !== null) {
      existing.set(rule, (existing.get(rule) ?? 0) + 1)
    }

    if (findIgnoreRule(ctx.config, file) !== null) {
      continue
    }

    if (rule === null) {
      findings.push(
        finding({
          file,
          checkId: ID,
          severity: 'error',
          message: 'no owned entry covers this file',
          fix: `declare it in owned[] of ${deepestOwnershipFile(ctx.config, file) ?? ctx.config.rootFile}, or leave it out with ignore[]`,
        }),
      )
      continue
    }

    covered.set(rule, (covered.get(rule) ?? 0) + 1)
  }

  for (const rule of ctx.config.owned) {
    if ((covered.get(rule) ?? 0) > 0) {
      continue
    }

    const missing = (existing.get(rule) ?? 0) === 0

    findings.push(
      finding({
        file: rule.origin.file,
        line: rule.origin.line,
        checkId: ID,
        severity: 'error',
        message: missing ? `${rule.origin.keyPath}.path "${rule.path}" does not exist in the repository` : `${rule.origin.keyPath}.path "${rule.path}": all its files are ignored`,
        fix: missing ? 'correct the path, or remove the entry' : 'remove the entry, or the ignore that leaves its files out',
      }),
    )
  }

  return findings
}

/** One pass over the repository files against the index: no file is read or stat'ed. */
export const ownerCoverage: Check = {
  id: ID,
  name: 'Owner coverage',
  failsWhen: 'a repository file has no owned entry nor ignore; an owned path does not exist, or all its files are ignored',
  run: ctx => Promise.resolve(coverage(ctx)),
}
```

`plugins/ownership/plugin/src/checks/core.ts`:

```ts
import { ownerCoverage } from './owner-coverage.ts'
import type { Check } from './types.ts'

export interface CatalogEntry {
  readonly id: string
  readonly name: string
  readonly command: string
  readonly failsWhen: string
}

/** The checks of the core, in the order of the public catalog. */
export const coreChecks: readonly Check[] = Object.freeze([ownerCoverage])

export const coreCheckCatalog: readonly CatalogEntry[] = Object.freeze(
  coreChecks.map(check => Object.freeze({ id: check.id, name: check.name, command: `ownership validate --check ${check.id}`, failsWhen: check.failsWhen })),
)
```

- [ ] **Step 6: Run them to see them pass**

Run: `node --test test/generated/marker.test.ts test/checks/run.test.ts test/checks/owner-coverage.test.ts test/checks/core.test.ts`
Expected: PASS (3 + 4 + 6 + 1 tests).

- [ ] **Step 7: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/generated plugins/ownership/plugin/src/checks plugins/ownership/test/generated plugins/ownership/test/checks plugins/ownership/test/helpers/check.ts
git commit -m "feat(ownership): the check framework and the owner coverage check

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: `ownership/codeowners-match`

**Files:**
- Create: `plugins/ownership/plugin/src/checks/codeowners-match.ts`
- Modify: `plugins/ownership/plugin/src/checks/core.ts`
- Modify: `plugins/ownership/test/checks/core.test.ts`
- Test: `plugins/ownership/test/checks/codeowners-match.test.ts`

**Interfaces:**
- Consumes: `ownersOf` (Task 9), `Check`, `CheckContext`, `finding` (Task 10), `runCheck` test helper.
- Produces: `codeownersMatch: Check` with `id: 'ownership/codeowners-match'`; `coreChecks` becomes `[ownerCoverage, codeownersMatch]`.

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/checks/codeowners-match.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { codeownersMatch } from '../../plugin/src/checks/codeowners-match.ts'
import { OwnershipError } from '../../plugin/src/errors.ts'
import { runCheck } from '../helpers/check.ts'
import { tempRepo } from '../helpers/repo.ts'

const OWNERSHIP = "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@team'\n  - path: docs/\n    owner: '@Team'\n"
const FILES = { '.ownership.yml': OWNERSHIP, 'docs/a.md': '' }

test('a repository without CODEOWNERS has nothing to check', async t => {
  assert.deepEqual(await runCheck(codeownersMatch, tempRepo(t, FILES)), [])
})

test('the declared owner on the effective line passes, without regard to case and among other owners', async t => {
  assert.deepEqual(await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '.ownership.yml @team\n/docs/ @lead @team\n' })), [])
})

test('a declared path with no effective line is a finding on its entry', async t => {
  const findings = await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '.ownership.yml @team\n' }))

  assert.deepEqual(findings, [
    {
      file: '.ownership.yml',
      line: 5,
      checkId: 'ownership/codeowners-match',
      severity: 'error',
      message: 'owned[1].path "docs/" has no matching line in CODEOWNERS',
      fix: 'add "/docs/ @Team" to CODEOWNERS',
    },
  ])
})

test('a declared owner missing from the effective line names the line and its owners', async t => {
  const findings = await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '* @team\ndocs/ @team\ndocs/ @other @lead\n' }))

  assert.deepEqual(
    findings.map(item => [item.line, item.message, item.fix]),
    [[5, 'owned[1].owner "@Team" is not on CODEOWNERS line 3, which assigns @other @lead', 'add @Team to CODEOWNERS line 3, or correct the owner']],
  )
})

test('a line with a pattern and no owner leaves the path with no owner', async t => {
  const findings = await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '* @team\ndocs/\n' }))

  assert.equal(findings[0]?.message, 'owned[1].owner "@Team" is not on CODEOWNERS line 2, which assigns no owner')
})

test('a directory is evaluated by its declared path, not file by file', async t => {
  const findings = await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '.ownership.yml @team\ndocs/**/*.md @team\n' }))

  assert.equal(findings[0]?.message, 'owned[1].path "docs/" has no matching line in CODEOWNERS')
})

test('more than one CODEOWNERS is a load error', async t => {
  const root = tempRepo(t, { ...FILES, '.github/CODEOWNERS': '* @team\n' }, { codeowners: '* @team\n' })

  await assert.rejects(runCheck(codeownersMatch, root), OwnershipError)
})
```

In `plugins/ownership/test/checks/core.test.ts`, replace the first `assert.deepEqual` with:

```ts
  assert.deepEqual(
    coreCheckCatalog.map(entry => [entry.id, entry.command]),
    [
      ['ownership/owner-coverage', 'ownership validate --check ownership/owner-coverage'],
      ['ownership/codeowners-match', 'ownership validate --check ownership/codeowners-match'],
    ],
  )
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/checks/codeowners-match.test.ts test/checks/core.test.ts`
Expected: FAIL — module not found, and the catalog has one entry.

- [ ] **Step 3: Write the check**

`plugins/ownership/plugin/src/checks/codeowners-match.ts`:

```ts
import { ownersOf } from '../codeowners/match.ts'
import type { Check, CheckContext, Finding } from './types.ts'
import { finding } from './types.ts'

const ID = 'ownership/codeowners-match'

/**
 * One evaluation per declared path, by the path itself: a directory entry is
 * checked as `docs/`, never file by file, so the cost follows the number of
 * entries. Only inclusion is required — the line may list other owners.
 */
function agreement(ctx: CheckContext): Finding[] {
  const codeowners = ctx.codeowners()

  if (codeowners === null) {
    return []
  }

  const findings: Finding[] = []

  for (const rule of ctx.config.owned) {
    const result = ownersOf(codeowners, rule.path)
    const where = { file: rule.origin.file, line: rule.origin.line, checkId: ID, severity: 'error' as const }

    if (result.kind === 'unmatched') {
      findings.push(
        finding({
          ...where,
          message: `${rule.origin.keyPath}.path "${rule.path}" has no matching line in ${codeowners.file}`,
          fix: `add "/${rule.path} ${rule.owner}" to ${codeowners.file}`,
        }),
      )
    } else if (result.kind === 'matched' && !result.owners.some(owner => owner.toLowerCase() === rule.owner.toLowerCase())) {
      const assigned = result.owners.length === 0 ? 'no owner' : result.owners.join(' ')

      findings.push(
        finding({
          ...where,
          message: `${rule.origin.keyPath}.owner "${rule.owner}" is not on ${codeowners.file} line ${result.line}, which assigns ${assigned}`,
          fix: `add ${rule.owner} to ${codeowners.file} line ${result.line}, or correct the owner`,
        }),
      )
    }
  }

  return findings
}

export const codeownersMatch: Check = {
  id: ID,
  name: 'CODEOWNERS agreement',
  failsWhen: 'an owned path has no effective line in CODEOWNERS; the declared owner is not on its effective line',
  run: ctx => Promise.resolve(agreement(ctx)),
}
```

In `plugins/ownership/plugin/src/checks/core.ts`, add the import and the check:

```ts
import { codeownersMatch } from './codeowners-match.ts'
import { ownerCoverage } from './owner-coverage.ts'
```

```ts
export const coreChecks: readonly Check[] = Object.freeze([ownerCoverage, codeownersMatch])
```

- [ ] **Step 4: Run them to see them pass**

Run: `node --test test/checks/codeowners-match.test.ts test/checks/core.test.ts`
Expected: PASS (7 + 1 tests).

- [ ] **Step 5: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/checks plugins/ownership/test/checks
git commit -m "feat(ownership): check that CODEOWNERS agrees with the declared owners

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: `ownership/generated-drift`

**Files:**
- Create: `plugins/ownership/plugin/src/checks/pool.ts`
- Create: `plugins/ownership/plugin/src/checks/generated-drift.ts`
- Modify: `plugins/ownership/plugin/src/checks/core.ts`
- Modify: `plugins/ownership/test/checks/core.test.ts`
- Test: `plugins/ownership/test/checks/pool.test.ts`
- Test: `plugins/ownership/test/checks/generated-drift.test.ts`

**Interfaces:**
- Consumes: `isGeneratedByMarker`, `readHead` (Task 10), `findGeneratedRule`, `findIgnoreRule`, `deepestOwnershipFile` (Task 8), `finding`, `Check`, `CheckContext` (Task 10).
- Produces:
  - `runPool<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]>` — results in the order of `items`.
  - `firstDifferentLine(expected: Buffer, actual: Buffer): number | null`
  - `generatedDrift: Check` with `id: 'ownership/generated-drift'`; `coreChecks` becomes `[ownerCoverage, codeownersMatch, generatedDrift]`.

- [ ] **Step 1: Write the failing tests**

`plugins/ownership/test/checks/pool.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as sleep } from 'node:timers/promises'

import { runPool } from '../../plugin/src/checks/pool.ts'

test('no more than the limit runs at once, and results keep the order of the items', async () => {
  let running = 0
  let peak = 0
  const results = await runPool([30, 10, 20, 5, 15], 2, async delay => {
    running += 1
    peak = Math.max(peak, running)
    await sleep(delay)
    running -= 1

    return delay * 2
  })

  assert.equal(peak, 2)
  assert.deepEqual(results, [60, 20, 40, 10, 30])
})

test('an empty list gives an empty result', async () => {
  assert.deepEqual(await runPool([], 4, () => Promise.resolve(1)), [])
})
```

`plugins/ownership/test/checks/generated-drift.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { firstDifferentLine, generatedDrift } from '../../plugin/src/checks/generated-drift.ts'
import { runCheck } from '../helpers/check.ts'
import { tempRepo } from '../helpers/repo.ts'

const TOOLS = {
  'tools/ok.mjs': "process.stdout.write('one\\ntwo\\n')\n",
  'tools/fail.mjs': "console.error('boom: cannot read input')\nprocess.exit(3)\n",
  'tools/fail-stdout.mjs': "console.log('only stdout here')\nprocess.exit(1)\n",
  'tools/noisy.mjs': "console.error('warning: deprecated option')\nprocess.stdout.write('one\\ntwo\\n')\n",
  'tools/big.mjs': "process.stdout.write('line\\n'.repeat(600000))\n",
}

/** An ownership file owning everything, with these generated entries; the first entry is on line 10, the second on line 12. */
function ownership(generated: [string, string][], extra: string[] = []): string {
  const lines = ['version: 1', 'owned:', '  - path: .ownership.yml', "    owner: '@a'", '  - path: out/', "    owner: '@a'", '  - path: tools/', "    owner: '@a'"]

  if (generated.length > 0) {
    lines.push('generated:', ...generated.flatMap(([path, command]) => [`  - path: ${path}`, `    command: ${command}`]))
  }

  return [...lines, ...extra, ''].join('\n')
}

test('the first different line is counted from 1', () => {
  assert.equal(firstDifferentLine(Buffer.from('a\nb\n'), Buffer.from('a\nb\n')), null)
  assert.equal(firstDifferentLine(Buffer.from('a\nb\n'), Buffer.from('a\nB\n')), 2)
  assert.equal(firstDifferentLine(Buffer.from('a\nb\n'), Buffer.from('a\nb\nc\n')), 3)
  assert.equal(firstDifferentLine(Buffer.from('x'), Buffer.from('')), 1)
})

test('a file equal to the output of its command passes', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/a.md', 'node tools/ok.mjs']]), 'out/a.md': 'one\ntwo\n' })

  assert.deepEqual(await runCheck(generatedDrift, root), [])
})

test('a different file is a finding at its first different line, fixed by running the command', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/a.md', 'node tools/ok.mjs']]), 'out/a.md': 'one\nTWO\n' })

  assert.deepEqual(await runCheck(generatedDrift, root), [
    {
      file: 'out/a.md',
      line: 2,
      checkId: 'ownership/generated-drift',
      severity: 'error',
      message: 'differs from the output of "node tools/ok.mjs" from this line on',
      fix: 'node tools/ok.mjs > out/a.md',
    },
  ])
})

test('a missing declared file is a finding on the generated entry', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/missing.md', 'node tools/ok.mjs']]), 'out/keep.md': '' })

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line, item.message, item.fix]),
    [['.ownership.yml', 10, 'generated[0].path "out/missing.md" does not exist', 'node tools/ok.mjs > out/missing.md']],
  )
})

test('a failing command shows the first line of stderr, or of stdout when stderr is empty', async t => {
  const root = tempRepo(t, {
    ...TOOLS,
    '.ownership.yml': ownership([
      ['out/a.md', 'node tools/fail.mjs'],
      ['out/b.md', 'node tools/fail-stdout.mjs'],
    ]),
    'out/a.md': '',
    'out/b.md': '',
  })

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.line, item.message]),
    [
      [10, 'generated[0].command "node tools/fail.mjs" failed with exit code 3: boom: cannot read input'],
      [12, 'generated[1].command "node tools/fail-stdout.mjs" failed with exit code 1: only stdout here'],
    ],
  )
})

test('stderr output from a command that succeeds is not a failure', async t => {
  const root = tempRepo(t, { ...TOOLS, '.ownership.yml': ownership([['out/a.md', 'node tools/noisy.mjs']]), 'out/a.md': 'one\ntwo\n' })

  assert.deepEqual(await runCheck(generatedDrift, root), [])
})

test('a multi-megabyte output is compared byte for byte', async t => {
  const equal = 'line\n'.repeat(600000)
  const changed = `${'line\n'.repeat(399999)}LINE\n${'line\n'.repeat(200000)}`
  const root = tempRepo(t, {
    ...TOOLS,
    '.ownership.yml': ownership([
      ['out/equal.md', 'node tools/big.mjs'],
      ['out/changed.md', 'node tools/big.mjs'],
    ]),
    'out/equal.md': equal,
    'out/changed.md': changed,
  })

  assert.deepEqual(
    (await runCheck(generatedDrift, root)).map(item => [item.file, item.line]),
    [['out/changed.md', 400000]],
  )
})

test('a file with the marker outside generated[] is a finding; under an ignore or declared, it is not', async t => {
  const root = tempRepo(t, {
    ...TOOLS,
    '.ownership.yml': ownership([['out/a.md', 'node tools/marked.mjs']], ['ignore:', '  - out/vendor/']),
    'tools/marked.mjs': "// writes a file that says it is generated\nprocess.stdout.write('<!-- generated: do not edit -->\\n')\n",
    'out/a.md': '<!-- generated: do not edit -->\n',
    'out/stray.md': '<!-- GENERATED: DO NOT EDIT -->\nhand-written\n',
    'out/vendor/lib.md': 'generated: do not edit\n',
  })

  assert.deepEqual(await runCheck(generatedDrift, root), [
    {
      file: 'out/stray.md',
      line: 1,
      checkId: 'ownership/generated-drift',
      severity: 'error',
      message: 'carries the "generated: do not edit" marker but is not declared in generated[]',
      fix: 'declare it in generated[] of .ownership.yml with the command that produces it',
    },
  ])
})

test('the findings do not depend on how many generators run at once', async t => {
  const root = tempRepo(t, {
    ...TOOLS,
    '.ownership.yml': ownership([
      ['out/a.md', 'node tools/ok.mjs'],
      ['out/b.md', 'node tools/fail.mjs'],
      ['out/c.md', 'node tools/ok.mjs'],
    ]),
    'out/a.md': 'x\n',
    'out/b.md': '',
    'out/c.md': 'one\ntwo\n',
  })

  assert.deepEqual(await runCheck(generatedDrift, root, 1), await runCheck(generatedDrift, root, 4))
})
```

In `plugins/ownership/test/checks/core.test.ts`, replace the catalog expectation with:

```ts
  assert.deepEqual(
    coreCheckCatalog.map(entry => [entry.id, entry.command]),
    [
      ['ownership/owner-coverage', 'ownership validate --check ownership/owner-coverage'],
      ['ownership/codeowners-match', 'ownership validate --check ownership/codeowners-match'],
      ['ownership/generated-drift', 'ownership validate --check ownership/generated-drift'],
    ],
  )
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/checks/pool.test.ts test/checks/generated-drift.test.ts test/checks/core.test.ts`
Expected: FAIL — modules not found, and the catalog has two entries.

- [ ] **Step 3: Write the pool**

`plugins/ownership/plugin/src/checks/pool.ts`:

```ts
/** Runs `task` over `items` with at most `limit` running at once. The results keep the order of `items`. */
export async function runPool<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next

      next += 1
      results[index] = await task(items[index] as T)
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker()))

  return results
}
```

- [ ] **Step 4: Write the check**

`plugins/ownership/plugin/src/checks/generated-drift.ts`:

```ts
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { isGeneratedByMarker, readHead } from '../generated/marker.ts'
import { deepestOwnershipFile, findGeneratedRule, findIgnoreRule } from '../resolve/lookup.ts'
import type { GeneratedRule } from '../resolve/types.ts'
import { runPool } from './pool.ts'
import type { Check, CheckContext, Finding } from './types.ts'
import { finding } from './types.ts'

const ID = 'ownership/generated-drift'

interface CommandResult {
  code: number | null
  stdout: Buffer
  stderr: Buffer
  error?: Error
}

/** Runs a generator through the shell at the repository root. The output is streamed, so its size has no limit. */
function runCommand(command: string, cwd: string): Promise<CommandResult> {
  return new Promise(resolve => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const child = spawn(command, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', error => resolve({ code: null, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr), error }))
    child.on('close', code => resolve({ code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) }))
  })
}

function firstLine(output: Buffer): string {
  return (
    output
      .toString('utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(line => line !== '') ?? ''
  )
}

/** The 1-based line of the first byte where the two contents differ, or null when they are equal. */
export function firstDifferentLine(expected: Buffer, actual: Buffer): number | null {
  const shorter = Math.min(expected.length, actual.length)
  let at = 0

  while (at < shorter && expected[at] === actual[at]) {
    at += 1
  }

  if (at === shorter && expected.length === actual.length) {
    return null
  }

  let line = 1

  for (let i = 0; i < at; i++) {
    if (expected[i] === 0x0a) {
      line += 1
    }
  }

  return line
}

async function checkGenerated(ctx: CheckContext, rule: GeneratedRule): Promise<Finding[]> {
  const fix = `${rule.command} > ${rule.path}`
  const where = { file: rule.origin.file, line: rule.origin.line, checkId: ID, severity: 'error' as const }
  const absolute = join(ctx.root, rule.path)

  if (!existsSync(absolute)) {
    return [finding({ ...where, message: `${rule.origin.keyPath}.path "${rule.path}" does not exist`, fix })]
  }

  const result = await runCommand(rule.command, ctx.root)

  if (result.error !== undefined || result.code !== 0) {
    const detail = firstLine(result.stderr) || firstLine(result.stdout) || result.error?.message || 'no output'
    const exit = result.code === null ? '' : ` with exit code ${result.code}`

    return [finding({ ...where, message: `${rule.origin.keyPath}.command "${rule.command}" failed${exit}: ${detail}`, fix })]
  }

  const line = firstDifferentLine(readFileSync(absolute), result.stdout)

  return line === null ? [] : [finding({ file: rule.path, line, checkId: ID, severity: 'error', message: `differs from the output of "${rule.command}" from this line on`, fix })]
}

/** Files outside generated[] and ignore that still say they are generated. Links and submodules are not read. */
function markerFindings(ctx: CheckContext): Finding[] {
  const findings: Finding[] = []

  for (const file of ctx.repoFiles) {
    if (findGeneratedRule(ctx.config, file) !== null || findIgnoreRule(ctx.config, file) !== null) {
      continue
    }

    const head = readHead(join(ctx.root, file))

    if (head !== null && isGeneratedByMarker(head)) {
      findings.push(
        finding({
          file,
          line: 1,
          checkId: ID,
          severity: 'error',
          message: 'carries the "generated: do not edit" marker but is not declared in generated[]',
          fix: `declare it in generated[] of ${deepestOwnershipFile(ctx.config, file) ?? ctx.config.rootFile} with the command that produces it`,
        }),
      )
    }
  }

  return findings
}

export const generatedDrift: Check = {
  id: ID,
  name: 'Generated drift',
  failsWhen: 'a generated file differs from the output of its command; the command fails; the declared file is missing; a file carries the generated marker outside generated[]',
  async run(ctx) {
    const declared = await runPool(ctx.config.generated, ctx.jobs, rule => checkGenerated(ctx, rule))

    return [...declared.flat(), ...markerFindings(ctx)]
  },
}
```

In `plugins/ownership/plugin/src/checks/core.ts`, add the import and the check:

```ts
import { codeownersMatch } from './codeowners-match.ts'
import { generatedDrift } from './generated-drift.ts'
import { ownerCoverage } from './owner-coverage.ts'
```

```ts
export const coreChecks: readonly Check[] = Object.freeze([ownerCoverage, codeownersMatch, generatedDrift])
```

- [ ] **Step 5: Run them to see them pass**

Run: `node --test test/checks/pool.test.ts test/checks/generated-drift.test.ts test/checks/core.test.ts`
Expected: PASS (2 + 9 + 1 tests).

- [ ] **Step 6: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/checks plugins/ownership/test/checks
git commit -m "feat(ownership): check generated files against their generators and the marker

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: `explainPath` and `entriesForPlugin`

**Files:**
- Create: `plugins/ownership/plugin/src/resolve/explain.ts`
- Create: `plugins/ownership/plugin/src/resolve/plugins.ts`
- Test: `plugins/ownership/test/resolve/explain.test.ts`
- Test: `plugins/ownership/test/resolve/plugins.test.ts`

**Interfaces:**
- Consumes: lookups (Task 8), `ownersOf`, `Codeowners`, `OwnersResult` (Task 9), `isGeneratedByMarker`, `readHead` (Task 10), `PLUGIN_NAME` (Task 4), `PluginBlock` (Task 4).
- Produces:
  - `type GeneratedOrigin = { readonly source: 'declared'; readonly rule: GeneratedRule } | { readonly source: 'marker' }`
  - `type Coverage = { readonly kind: 'covered' } | { readonly kind: 'ignored' } | { readonly kind: 'uncovered'; readonly file: string | null } | { readonly kind: 'gitignored' }`
  - `interface PathExplanation { readonly path: string; readonly owned: OwnedRule | null; readonly generated: GeneratedOrigin | null; readonly ignore: IgnoreRule | null; readonly coverage: Coverage; readonly codeowners: OwnersResult }`
  - `interface ExplainContext { readonly repoFiles: ReadonlySet<string>; readonly codeowners: Codeowners | null }`
  - `explainPath(config: ResolvedOwnership, path: string, ctx: ExplainContext): PathExplanation`
  - `interface PluginEntry { readonly path: string; readonly owner: string; readonly skill?: string; readonly source: string; readonly entry: PluginBlock; readonly global?: PluginBlock }`
  - `entriesForPlugin(config: ResolvedOwnership, name: string): PluginEntry[]` — a name outside the pattern is an `OwnershipError`.

- [ ] **Step 1: Write the failing tests**

`plugins/ownership/test/resolve/explain.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { loadCodeowners } from '../../plugin/src/codeowners/locate.ts'
import { listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { explainPath } from '../../plugin/src/resolve/explain.ts'
import type { PathExplanation } from '../../plugin/src/resolve/explain.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'
import { tempRepo } from '../helpers/repo.ts'

const OWNERSHIP = [
  'version: 1',
  'owned:',
  '  - path: .ownership.yml',
  "    owner: '@team'",
  '  - path: src/',
  "    owner: '@team'",
  '    skill: src-keeper',
  '    plugins:',
  '      docs-kit:',
  '        id-prefix: ADR',
  '  - path: .gitignore',
  "    owner: '@team'",
  'generated:',
  '  - path: src/gen.ts',
  '    command: node gen.mjs',
  'ignore:',
  '  - src/vendor/',
  '',
].join('\n')

function explain(root: string, path: string): PathExplanation {
  const repoFiles = listRepoFiles(root)
  const config = resolveOwnership(root, { repoFiles })

  assert.ok(config !== null)

  return explainPath(config, path, { repoFiles, codeowners: loadCodeowners(root) })
}

function repo(t: Parameters<typeof tempRepo>[0], codeowners?: string): string {
  return tempRepo(
    t,
    {
      '.ownership.yml': OWNERSHIP,
      '.gitignore': 'dist/\n',
      'src/a.ts': '',
      'src/gen.ts': '',
      'src/marked.ts': '// generated: do not edit\n',
      'src/vendor/lib.js': '',
      'dist/out.js': '',
      'README.md': '',
    },
    codeowners === undefined ? {} : { codeowners },
  )
}

test('a covered file shows its owned entry and the CODEOWNERS line', t => {
  const explanation = explain(repo(t, '* @team @lead\n'), 'src/a.ts')

  assert.equal(explanation.path, 'src/a.ts')
  assert.equal(explanation.owned?.path, 'src/')
  assert.deepEqual(explanation.owned?.plugins, { 'docs-kit': { 'id-prefix': 'ADR' } })
  assert.equal(explanation.generated, null)
  assert.equal(explanation.ignore, null)
  assert.deepEqual(explanation.coverage, { kind: 'covered' })
  assert.deepEqual(explanation.codeowners, { kind: 'matched', owners: ['@team', '@lead'], line: 1 })
})

test('a generated file shows where it is declared, its command and the owned entry that covers it', t => {
  const explanation = explain(repo(t), 'src/gen.ts')

  assert.equal(explanation.generated?.source, 'declared')
  assert.equal(explanation.generated?.source === 'declared' ? explanation.generated.rule.command : null, 'node gen.mjs')
  assert.equal(explanation.owned?.path, 'src/')
})

test('a file with the marker outside generated[] says the marker is the origin', t => {
  assert.deepEqual(explain(repo(t), 'src/marked.ts').generated, { source: 'marker' })
})

test('a file under an ignore inside an owned directory shows both rules and is outside coverage', t => {
  const explanation = explain(repo(t), 'src/vendor/lib.js')

  assert.equal(explanation.owned?.path, 'src/')
  assert.equal(explanation.ignore?.path, 'src/vendor/')
  assert.deepEqual(explanation.coverage, { kind: 'ignored' })
})

test('an uncovered path names the ownership file where its entry belongs', t => {
  assert.deepEqual(explain(repo(t), 'README.md').coverage, { kind: 'uncovered', file: '.ownership.yml' })
  assert.deepEqual(explain(repo(t), 'planned/new.md').coverage, { kind: 'uncovered', file: '.ownership.yml' })
})

test('a path a .gitignore excludes is said so and its coverage is not evaluated', t => {
  assert.deepEqual(explain(repo(t), 'dist/out.js').coverage, { kind: 'gitignored' })
})

test('without CODEOWNERS, the explanation says so', t => {
  assert.deepEqual(explain(repo(t), 'src/a.ts').codeowners, { kind: 'no-codeowners' })
})

test('a directory path is evaluated as a directory', t => {
  const explanation = explain(repo(t, 'src/ @team\n'), 'src/')

  assert.equal(explanation.owned?.path, 'src/')
  assert.deepEqual(explanation.coverage, { kind: 'covered' })
  assert.deepEqual(explanation.codeowners, { kind: 'matched', owners: ['@team'], line: 1 })
})
```

`plugins/ownership/test/resolve/plugins.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { entriesForPlugin } from '../../plugin/src/resolve/plugins.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'
import { tempRepo } from '../helpers/repo.ts'

const OWNERSHIP = [
  'version: 1',
  'plugins:',
  '  docs-kit:',
  '    lang: en',
  '    strict: true',
  'owned:',
  '  - path: docs/',
  "    owner: '@docs'",
  '    skill: docs-keeper',
  '    plugins:',
  '      docs-kit:',
  '        strict: false',
  '      sdd-kit: {}',
  '  - path: src/',
  "    owner: '@src'",
  '    plugins:',
  '      sdd-kit:',
  '        level: 2',
  '  - path: README.md',
  "    owner: '@docs'",
  '',
].join('\n')

function config(t: Parameters<typeof tempRepo>[0]) {
  const resolved = resolveOwnership(tempRepo(t, { '.ownership.yml': OWNERSHIP }))

  assert.ok(resolved !== null)

  return resolved
}

test('the entries of a plugin carry the entry block and the global block, never merged', t => {
  assert.deepEqual(entriesForPlugin(config(t), 'docs-kit'), [
    { path: 'docs/', owner: '@docs', skill: 'docs-keeper', source: '.ownership.yml', entry: { strict: false }, global: { lang: 'en', strict: true } },
  ])
})

test('a plugin without a global block has no global field', t => {
  assert.deepEqual(
    entriesForPlugin(config(t), 'sdd-kit').map(item => [item.path, item.entry, 'global' in item]),
    [
      ['docs/', {}, false],
      ['src/', { level: 2 }, false],
    ],
  )
})

test('a valid name with no entry gives an empty list; an invalid name is a load error', t => {
  assert.deepEqual(entriesForPlugin(config(t), 'docs-kti'), [])
  assert.throws(() => entriesForPlugin(config(t), 'Docs_Kit'), OwnershipError)
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/resolve/explain.test.ts test/resolve/plugins.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `explainPath`**

`plugins/ownership/plugin/src/resolve/explain.ts`:

```ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { ownersOf } from '../codeowners/match.ts'
import type { Codeowners, OwnersResult } from '../codeowners/types.ts'
import { isGeneratedByMarker, readHead } from '../generated/marker.ts'
import { normalizePath, toPosix } from '../paths/paths.ts'
import { deepestOwnershipFile, findGeneratedRule, findIgnoreRule, findOwnedRule } from './lookup.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, ResolvedOwnership } from './types.ts'

export type GeneratedOrigin = { readonly source: 'declared'; readonly rule: GeneratedRule } | { readonly source: 'marker' }

export type Coverage =
  | { readonly kind: 'covered' }
  | { readonly kind: 'ignored' }
  | { readonly kind: 'uncovered'; readonly file: string | null }
  | { readonly kind: 'gitignored' }

export interface PathExplanation {
  readonly path: string
  readonly owned: OwnedRule | null
  readonly generated: GeneratedOrigin | null
  readonly ignore: IgnoreRule | null
  readonly coverage: Coverage
  readonly codeowners: OwnersResult
}

export interface ExplainContext {
  readonly repoFiles: ReadonlySet<string>
  readonly codeowners: Codeowners | null
}

function inRepository(path: string, repoFiles: ReadonlySet<string>): boolean {
  if (!path.endsWith('/')) {
    return repoFiles.has(path)
  }

  for (const file of repoFiles) {
    if (file.startsWith(path)) {
      return true
    }
  }

  return false
}

/** Every rule that reaches `path`, its coverage and its CODEOWNERS line, as data for the CLI to format. */
export function explainPath(config: ResolvedOwnership, path: string, ctx: ExplainContext): PathExplanation {
  const target = normalizePath(toPosix(path))
  const owned = findOwnedRule(config, target)
  const ignore = findIgnoreRule(config, target)
  const declared = findGeneratedRule(config, target)
  const head = declared === null && !target.endsWith('/') ? readHead(join(config.root, target)) : null
  const generated: GeneratedOrigin | null = declared !== null ? { source: 'declared', rule: declared } : head !== null && isGeneratedByMarker(head) ? { source: 'marker' } : null
  const gitignored = existsSync(join(config.root, target)) && !inRepository(target, ctx.repoFiles)

  let coverage: Coverage

  if (gitignored) {
    coverage = { kind: 'gitignored' }
  } else if (ignore !== null) {
    coverage = { kind: 'ignored' }
  } else if (owned !== null) {
    coverage = { kind: 'covered' }
  } else {
    coverage = { kind: 'uncovered', file: deepestOwnershipFile(config, target) }
  }

  return { path: target, owned, generated, ignore, coverage, codeowners: ownersOf(ctx.codeowners, target) }
}
```

- [ ] **Step 4: Write `entriesForPlugin`**

`plugins/ownership/plugin/src/resolve/plugins.ts`:

```ts
import { OwnershipError } from '../errors.ts'
import { PLUGIN_NAME } from '../schema/parse.ts'
import type { PluginBlock } from '../schema/types.ts'
import type { ResolvedOwnership } from './types.ts'

export interface PluginEntry {
  readonly path: string
  readonly owner: string
  readonly skill?: string
  /** The ownership file that declares the entry. */
  readonly source: string
  readonly entry: PluginBlock
  /** The global block of the plugin, when the root configures one. Never merged with `entry`. */
  readonly global?: PluginBlock
}

/**
 * The owned entries that link the plugin `name`. The core has no registry of
 * plugin names, so a valid name with no entry gives an empty list — it cannot
 * tell a plugin with no paths from a misspelled name.
 */
export function entriesForPlugin(config: ResolvedOwnership, name: string): PluginEntry[] {
  if (!PLUGIN_NAME.test(name)) {
    throw new OwnershipError([{ file: config.rootFile, message: `plugin name "${name}" must match ^[a-z][a-z0-9-]*$`, fix: 'pass the name of the plugin as written under plugins' }])
  }

  const global = Object.hasOwn(config.plugins, name) ? config.plugins[name] : undefined

  return config.owned
    .filter(rule => Object.hasOwn(rule.plugins, name))
    .map(rule => ({
      path: rule.path,
      owner: rule.owner,
      ...(rule.skill === undefined ? {} : { skill: rule.skill }),
      source: rule.origin.file,
      entry: rule.plugins[name] ?? {},
      ...(global === undefined ? {} : { global }),
    }))
}
```

- [ ] **Step 5: Run them to see them pass**

Run: `node --test test/resolve/explain.test.ts test/resolve/plugins.test.ts`
Expected: PASS (8 + 3 tests).

- [ ] **Step 6: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/resolve plugins/ownership/test/resolve
git commit -m "feat(ownership): explain a path and filter the entries of a plugin

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: The CLI and `ownership validate`

**Files:**
- Create: `plugins/ownership/plugin/src/cli/index.ts`
- Create: `plugins/ownership/plugin/src/cli/main.ts`
- Create: `plugins/ownership/plugin/src/cli/usage.ts`
- Create: `plugins/ownership/plugin/src/cli/format.ts`
- Create: `plugins/ownership/plugin/src/cli/validate.ts`
- Test: `plugins/ownership/test/cli/main.test.ts`
- Test: `plugins/ownership/test/cli/validate.test.ts`

**Interfaces:**
- Consumes: `coreChecks` (Task 12), `runChecks`, `createCheckContext` (Task 10), `resolveOwnership` (Task 8), `isInsideWorkTree`, `listRepoFiles` (Task 5), `OwnershipError`, `Finding`.
- Produces:
  - `interface Io { readonly cwd: string; readonly env: NodeJS.ProcessEnv; stdout(text: string): void; stderr(text: string): void }`, `main(argv: readonly string[], io: Io): Promise<number>` (`cli/main.ts`) — Tasks 15 and 17 add the `explain` and `init` cases to its `switch`.
  - `USAGE: string`, `class UsageError extends Error` (`cli/usage.ts`)
  - `type Format = 'text' | 'json' | 'github'`, `interface PluginUsage { readonly name: string; readonly entries: number; readonly globalConfig: boolean }`, `pluginSummary(config): PluginUsage[]`, `formatReport(format, findings, plugins): string` (`cli/format.ts`)
  - `validateCommand(args: readonly string[], root: string, io: Io): Promise<number>` (`cli/validate.ts`)
  - Exit codes: 0 no error finding (or no ownership file, or `--help`); 1 an error finding; 2 load error, unknown command or option, invalid value, missing argument, no command.

- [ ] **Step 1: Write the failing tests**

`plugins/ownership/test/cli/main.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { runCli } from '../helpers/cli.ts'
import { tempRepo } from '../helpers/repo.ts'

test('no command prints the usage on stderr and exits 2', t => {
  const result = runCli([], { cwd: tempRepo(t, {}) })

  assert.equal(result.status, 2)
  assert.match(result.stderr, /^Usage: ownership <command>/)
})

test('--help prints the usage, listing validate, explain and init, and exits 0', t => {
  for (const flag of ['--help', '-h']) {
    const result = runCli([flag], { cwd: tempRepo(t, {}) })

    assert.equal(result.status, 0)
    assert.match(result.stdout, /^ {2}validate /m)
    assert.match(result.stdout, /^ {2}explain /m)
    assert.match(result.stdout, /^ {2}init /m)
  }
})

test('an unknown command or option exits 2 with a message on stderr', t => {
  const root = tempRepo(t, {})
  const command = runCli(['frobnicate'], { cwd: root })
  const option = runCli(['validate', '--base', 'origin/main'], { cwd: root })

  assert.equal(command.status, 2)
  assert.match(command.stderr, /^ownership: unknown command "frobnicate"/)
  assert.equal(option.status, 2)
  assert.match(option.stderr, /^ownership: Unknown option '--base'/)
})
```

`plugins/ownership/test/cli/validate.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { runCli } from '../helpers/cli.ts'
import { tempRepo } from '../helpers/repo.ts'

const WITH_PLUGINS = [
  'version: 1',
  'plugins:',
  '  docs-kit:',
  '    lang: en',
  '  other-kit: {}',
  'owned:',
  '  - path: .ownership.yml',
  "    owner: '@a'",
  '  - path: docs/',
  "    owner: '@a'",
  '    plugins:',
  '      docs-kit: {}',
  '  - path: gone.md',
  "    owner: '@a'",
  '',
].join('\n')

const FILES = { '.ownership.yml': WITH_PLUGINS, 'docs/a.md': '', 'README.md': '' }

const PLUGIN_BLOCK = ['ownership: plugins in use:', '  docs-kit   1 entry  global config', '  other-kit  0 entries  global config']

test('a repository without an ownership file has nothing to validate', t => {
  const root = tempRepo(t, { 'a.txt': '' })
  const text = runCli(['validate'], { cwd: root })
  const json = runCli(['validate', '--format', 'json'], { cwd: root })

  assert.equal(text.status, 0)
  assert.equal(text.stdout, 'ownership: no ownership file found; nothing to validate.\n')
  assert.equal(json.status, 0)
  assert.deepEqual(JSON.parse(json.stdout), { findings: [], plugins: [], errors: 0, warnings: 0 })
})

test('a clean repository prints the final line and exits 0', t => {
  const root = tempRepo(t, { '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n" })
  const result = runCli(['validate'], { cwd: root })

  assert.equal(result.status, 0)
  assert.equal(result.stdout, 'ownership: no violations found.\n')
})

test('text output: findings, the plugins block and the counts, exit 1', t => {
  const result = runCli(['validate'], { cwd: tempRepo(t, FILES) })

  assert.equal(result.status, 1)
  assert.equal(
    result.stdout,
    [
      '.ownership.yml:13  ownership/owner-coverage  error  owned[2].path "gone.md" does not exist in the repository',
      '  → correct the path, or remove the entry',
      'README.md  ownership/owner-coverage  error  no owned entry covers this file',
      '  → declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
      ...PLUGIN_BLOCK,
      'ownership: 2 errors, 0 warnings.',
      '',
    ].join('\n'),
  )
})

test('json output: one object with the findings, the plugins and the counts', t => {
  const result = runCli(['validate', '--format', 'json'], { cwd: tempRepo(t, FILES) })

  assert.equal(result.status, 1)
  assert.deepEqual(JSON.parse(result.stdout), {
    findings: [
      {
        file: '.ownership.yml',
        line: 13,
        checkId: 'ownership/owner-coverage',
        severity: 'error',
        message: 'owned[2].path "gone.md" does not exist in the repository',
        fix: 'correct the path, or remove the entry',
      },
      {
        file: 'README.md',
        checkId: 'ownership/owner-coverage',
        severity: 'error',
        message: 'no owned entry covers this file',
        fix: 'declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
      },
    ],
    plugins: [
      { name: 'docs-kit', entries: 1, globalConfig: true },
      { name: 'other-kit', entries: 0, globalConfig: true },
    ],
    errors: 2,
    warnings: 0,
  })
})

test('github output: workflow commands, then the plugins block and the counts as in text', t => {
  const result = runCli(['validate', '--format', 'github'], { cwd: tempRepo(t, FILES) })

  assert.equal(result.status, 1)
  assert.equal(
    result.stdout,
    [
      '::error file=.ownership.yml,line=13,title=ownership/owner-coverage::owned[2].path "gone.md" does not exist in the repository → correct the path, or remove the entry',
      '::error file=README.md,title=ownership/owner-coverage::no owned entry covers this file → declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
      ...PLUGIN_BLOCK,
      'ownership: 2 errors, 0 warnings.',
      '',
    ].join('\n'),
  )
})

test('github output escapes %, CR and LF', t => {
  const root = tempRepo(t, { '.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n  - path: 100%.md\n    owner: '@a'\n" })
  const result = runCli(['validate', '--format', 'github'], { cwd: root })

  assert.match(result.stdout, /owned\[1\]\.path "100%25\.md" does not exist/)
})

test('--check runs only the named checks, over the whole repository, and keeps the plugins block', t => {
  const root = tempRepo(t, FILES, { codeowners: 'docs/ @other\n' })
  const all = runCli(['validate'], { cwd: root })
  const coverage = runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root })

  assert.match(all.stdout, /ownership\/codeowners-match/)
  assert.doesNotMatch(coverage.stdout, /ownership\/codeowners-match/)
  assert.match(coverage.stdout, /ownership: plugins in use:/)
  assert.match(coverage.stdout, /CODEOWNERS {2}ownership\/owner-coverage/)
})

test('an unknown check, a bad format or a bad --jobs exits 2', t => {
  const root = tempRepo(t, FILES)
  const check = runCli(['validate', '--check', 'ownership/nope'], { cwd: root })

  assert.equal(check.status, 2)
  assert.equal(
    check.stderr,
    'ownership: unknown check "ownership/nope"; the checks are ownership/owner-coverage, ownership/codeowners-match, ownership/generated-drift\n',
  )

  for (const args of [
    ['--format', 'xml'],
    ['--jobs', '0'],
    ['--jobs', 'two'],
    ['--jobs'],
  ]) {
    const result = runCli(['validate', ...args], { cwd: root })

    assert.equal(result.status, 2, args.join(' '))
    assert.match(result.stderr, /^ownership: /)
    assert.equal(result.stdout, '')
  }
})

test('a load error exits 2 with the message on stderr and nothing on stdout', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 2\n' })

  for (const format of ['text', 'json', 'github']) {
    const result = runCli(['validate', '--format', format], { cwd: root })

    assert.equal(result.status, 2)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /^\.ownership\.yml:1: version 2 is not supported; supported versions: 1/)
  }
})

test('an ownership file outside a Git work tree exits 2', t => {
  const result = runCli(['validate'], { cwd: tempRepo(t, { '.ownership.yml': 'version: 1\n' }, { git: false }) })

  assert.equal(result.status, 2)
  assert.match(result.stderr, /is not inside a Git work tree/)
})

test('OWNERSHIP_REPO_ROOT points at another repository, and --ownership at another root file', t => {
  const target = tempRepo(t, { 'config/own.yml': "version: 1\nowned:\n  - path: config/\n    owner: '@a'\n" })
  const elsewhere = tempRepo(t, {}, { git: false })

  mkdirSync(join(elsewhere, 'sub'))

  const result = runCli(['validate', '--ownership', 'config/own.yml'], { cwd: join(elsewhere, 'sub'), env: { OWNERSHIP_REPO_ROOT: target } })

  assert.equal(result.stderr, '')
  assert.equal(result.status, 0)
  assert.equal(result.stdout, 'ownership: no violations found.\n')
})

test('the output is the same whatever --jobs is', t => {
  const generators = Array.from({ length: 6 }, (_, i) => `  - path: out/${i}.md\n    command: node gen.mjs ${i}\n`).join('')
  const root = tempRepo(t, {
    '.ownership.yml': `version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@a'\n  - path: out/\n    owner: '@a'\n  - path: gen.mjs\n    owner: '@a'\ngenerated:\n${generators}`,
    'gen.mjs': "const n = Number(process.argv[2])\nif (n % 3 === 0) { console.error('fail ' + n); process.exit(1) }\nprocess.stdout.write('v' + n + '\\n')\n",
    ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`out/${i}.md`, i % 2 === 0 ? 'stale\n' : `v${i}\n`])),
  })

  assert.equal(runCli(['validate', '--jobs', '1'], { cwd: root }).stdout, runCli(['validate', '--jobs', '4'], { cwd: root }).stdout)
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/cli/main.test.ts test/cli/validate.test.ts`
Expected: FAIL — `Cannot find module '.../plugin/src/cli/index.ts'` in every spawned run (status 1, not the expected code).

- [ ] **Step 3: Write the usage and the entry point**

`plugins/ownership/plugin/src/cli/usage.ts`:

```ts
export const USAGE = `Usage: ownership <command> [options]

Commands:
  validate [--check <id>]... [--format text|json|github] [--jobs <n>] [--ownership <path>]
      Run the checks over the whole repository.
  explain <path> [--ownership <path>]
      Show every rule that reaches a path and where it was declared.
  init [--owner <@x> | --from-codeowners] [--stdout] [--ownership <path>]
      Create the root ownership file.

The commands run on the current directory; OWNERSHIP_REPO_ROOT points at another repository.
`

/** A wrong command line: the CLI prints the message and exits 2. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UsageError'
  }
}
```

`plugins/ownership/plugin/src/cli/main.ts`:

```ts
import { resolve } from 'node:path'

import { OwnershipError } from '../errors.ts'
import { USAGE, UsageError } from './usage.ts'
import { validateCommand } from './validate.ts'

export interface Io {
  readonly cwd: string
  readonly env: NodeJS.ProcessEnv
  stdout(text: string): void
  stderr(text: string): void
}

function isParseArgsError(error: unknown): error is Error {
  const code = (error as NodeJS.ErrnoException | undefined)?.code

  return error instanceof Error && typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS_')
}

/** Runs one command and returns the exit code: 0 clean, 1 an error finding, 2 anything that kept the command from running. */
export async function main(argv: readonly string[], io: Io): Promise<number> {
  const [command, ...args] = argv

  if (command === undefined) {
    io.stderr(USAGE)

    return 2
  }

  if (command === '-h' || command === '--help') {
    io.stdout(USAGE)

    return 0
  }

  const root = resolve(io.cwd, io.env.OWNERSHIP_REPO_ROOT ?? '.')

  try {
    switch (command) {
      case 'validate':
        return await validateCommand(args, root, io)
      default:
        io.stderr(`ownership: unknown command "${command}"\n\n${USAGE}`)

        return 2
    }
  } catch (error) {
    if (error instanceof OwnershipError) {
      io.stderr(`${error.message}\n`)

      return 2
    }

    if (error instanceof UsageError || isParseArgsError(error)) {
      io.stderr(`ownership: ${error.message}\n`)

      return 2
    }

    throw error
  }
}
```

`plugins/ownership/plugin/src/cli/index.ts`:

```ts
#!/usr/bin/env node
import { main } from './main.ts'

process.exitCode = await main(process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  stdout: text => process.stdout.write(text),
  stderr: text => process.stderr.write(text),
})
```

- [ ] **Step 4: Write the formats**

`plugins/ownership/plugin/src/cli/format.ts`:

```ts
import type { Finding } from '../checks/types.ts'
import type { ResolvedOwnership } from '../resolve/types.ts'

export type Format = 'text' | 'json' | 'github'

export interface PluginUsage {
  readonly name: string
  readonly entries: number
  readonly globalConfig: boolean
}

/**
 * Every plugin name in the root and in the entries. The core does not know
 * which plugins exist, so it cannot flag a misspelled name; listing every
 * name in use is what makes one visible.
 */
export function pluginSummary(config: ResolvedOwnership): PluginUsage[] {
  const names = new Set([...Object.keys(config.plugins), ...config.owned.flatMap(rule => Object.keys(rule.plugins))])

  return [...names].sort().map(name => ({
    name,
    entries: config.owned.filter(rule => Object.hasOwn(rule.plugins, name)).length,
    globalConfig: Object.hasOwn(config.plugins, name),
  }))
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function counts(findings: readonly Finding[]): { errors: number; warnings: number } {
  const errors = findings.filter(item => item.severity === 'error').length

  return { errors, warnings: findings.length - errors }
}

function pluginBlock(plugins: readonly PluginUsage[]): string[] {
  if (plugins.length === 0) {
    return []
  }

  const nameWidth = Math.max(...plugins.map(plugin => plugin.name.length))
  const countWidth = Math.max(...plugins.map(plugin => String(plugin.entries).length))

  return [
    'ownership: plugins in use:',
    ...plugins.map(plugin => {
      const count = `${String(plugin.entries).padStart(countWidth)} ${plugin.entries === 1 ? 'entry' : 'entries'}`

      return `  ${plugin.name.padEnd(nameWidth)}  ${count}${plugin.globalConfig ? '  global config' : ''}`
    }),
  ]
}

function finalLine(findings: readonly Finding[]): string {
  if (findings.length === 0) {
    return 'ownership: no violations found.'
  }

  const { errors, warnings } = counts(findings)

  return `ownership: ${plural(errors, 'error', 'errors')}, ${plural(warnings, 'warning', 'warnings')}.`
}

function textFinding(item: Finding): string {
  const where = item.line === undefined ? item.file : `${item.file}:${item.line}`
  const head = `${where}  ${item.checkId}  ${item.severity}  ${item.message}`

  return item.fix === undefined ? head : `${head}\n  → ${item.fix}`
}

function escapeData(text: string): string {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

function escapeProperty(text: string): string {
  return escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C')
}

function githubFinding(item: Finding): string {
  const properties = [
    `file=${escapeProperty(item.file)}`,
    ...(item.line === undefined ? [] : [`line=${item.line}`]),
    ...(item.column === undefined ? [] : [`col=${item.column}`]),
    `title=${escapeProperty(item.checkId)}`,
  ]
  const text = item.fix === undefined ? item.message : `${item.message} → ${item.fix}`

  return `::${item.severity} ${properties.join(',')}::${escapeData(text)}`
}

/** The validate report: findings, then the plugins block, then the final line. The json format is one object. */
export function formatReport(format: Format, findings: readonly Finding[], plugins: readonly PluginUsage[]): string {
  if (format === 'json') {
    return `${JSON.stringify({ findings, plugins, ...counts(findings) }, null, 2)}\n`
  }

  const lines = [...findings.map(format === 'github' ? githubFinding : textFinding), ...pluginBlock(plugins), finalLine(findings)]

  return `${lines.join('\n')}\n`
}
```

- [ ] **Step 5: Write `validate`**

`plugins/ownership/plugin/src/cli/validate.ts`:

```ts
import { availableParallelism } from 'node:os'
import { parseArgs } from 'node:util'

import { coreChecks } from '../checks/core.ts'
import { createCheckContext, runChecks } from '../checks/run.ts'
import type { Check } from '../checks/types.ts'
import { isInsideWorkTree, listRepoFiles } from '../repo/repo.ts'
import { resolveOwnership } from '../resolve/resolve.ts'
import { formatReport, pluginSummary } from './format.ts'
import type { Format } from './format.ts'
import type { Io } from './main.ts'
import { USAGE, UsageError } from './usage.ts'

const FORMATS: readonly Format[] = ['text', 'json', 'github']

function parseFormat(value: string | undefined): Format {
  if (value === undefined) {
    return 'text'
  }

  const format = FORMATS.find(candidate => candidate === value)

  if (format === undefined) {
    throw new UsageError(`--format must be text, json or github; got "${value}"`)
  }

  return format
}

function parseJobs(value: string | undefined): number {
  if (value === undefined) {
    return availableParallelism()
  }

  if (!/^[1-9]\d*$/.test(value)) {
    throw new UsageError(`--jobs must be a positive integer; got "${value}"`)
  }

  return Number(value)
}

function selectChecks(ids: readonly string[] | undefined): readonly Check[] {
  if (ids === undefined) {
    return coreChecks
  }

  for (const id of ids) {
    if (!coreChecks.some(check => check.id === id)) {
      throw new UsageError(`unknown check "${id}"; the checks are ${coreChecks.map(check => check.id).join(', ')}`)
    }
  }

  return coreChecks.filter(check => ids.includes(check.id))
}

/** `--check` narrows which checks run, never the scope: every run covers the whole repository. */
export async function validateCommand(args: readonly string[], root: string, io: Io): Promise<number> {
  const { values } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      check: { type: 'string', multiple: true },
      format: { type: 'string' },
      jobs: { type: 'string' },
      ownership: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (values.help === true) {
    io.stdout(USAGE)

    return 0
  }

  const format = parseFormat(values.format)
  const jobs = parseJobs(values.jobs)
  const checks = selectChecks(values.check)
  const repoFiles = isInsideWorkTree(root) ? listRepoFiles(root) : new Set<string>()
  const config = resolveOwnership(root, { repoFiles, ...(values.ownership === undefined ? {} : { ownership: values.ownership }) })

  if (config === null) {
    io.stdout(format === 'json' ? formatReport('json', [], []) : 'ownership: no ownership file found; nothing to validate.\n')

    return 0
  }

  const findings = await runChecks(checks, createCheckContext(config, repoFiles, jobs))

  io.stdout(formatReport(format, findings, pluginSummary(config)))

  return findings.some(item => item.severity === 'error') ? 1 : 0
}
```

- [ ] **Step 6: Run them to see them pass**

Run: `node --test test/cli/main.test.ts test/cli/validate.test.ts`
Expected: PASS (3 + 12 tests).

- [ ] **Step 7: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/cli plugins/ownership/test/cli
git commit -m "feat(ownership): the CLI and ownership validate, in text, json and github formats

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: `ownership explain`

**Files:**
- Create: `plugins/ownership/plugin/src/cli/explain.ts`
- Modify: `plugins/ownership/plugin/src/cli/main.ts`
- Test: `plugins/ownership/test/cli/explain.test.ts`

**Interfaces:**
- Consumes: `explainPath`, `PathExplanation` (Task 13), `loadCodeowners` (Task 9), `resolveOwnership` (Task 8), `isInsideWorkTree`, `listRepoFiles` (Task 5), `normalizePath`, `toPosix` (Task 3), `RuleOrigin` (Task 6), `Io`, `USAGE`, `UsageError` (Task 14), the `runCli` and `tempRepo` test helpers (Task 2).
- Produces:
  - `formatExplanation(explanation: PathExplanation): string` — the fixed blocks `path`, `owned`, `generated`, `ignore`, `CODEOWNERS`, one per line, labels padded to 11 columns, `—` for what the path does not have; one `plugin <name>: <json>` line per plugin block of the entry, sorted by name; a last `coverage` line only when the path is not plainly covered (ignored, uncovered, excluded by a `.gitignore`).
  - `explainCommand(args: readonly string[], root: string, io: Io): number` — exit 0; a `UsageError` for a missing path, more than one path, the repository root itself or a path outside the repository; without an ownership file it prints `ownership: no ownership file found; nothing to explain.` and returns 0.
  - `main` gains the `explain` case.
- The path may be relative to the repository root, absolute, or start with `./`. A path that is a directory on disk is explained as a directory even without the trailing `/`.

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/cli/explain.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { runCli } from '../helpers/cli.ts'
import { tempRepo } from '../helpers/repo.ts'

const OWNERSHIP = [
  'version: 1',
  'owned:',
  '  - path: .ownership.yml',
  "    owner: '@team'",
  '  - path: src/',
  "    owner: '@team'",
  '    skill: src-keeper',
  '    plugins:',
  '      sdd-kit: {}',
  '      docs-kit:',
  '        id-prefix: ADR',
  '  - path: .gitignore',
  "    owner: '@Lead'",
  'generated:',
  '  - path: src/gen.ts',
  '    command: node gen.mjs',
  'ignore:',
  '  - src/vendor/',
  '',
].join('\n')

const FILES = {
  '.ownership.yml': OWNERSHIP,
  '.gitignore': 'dist/\n',
  'src/a.ts': '',
  'src/gen.ts': '',
  'src/marked.ts': '// generated: do not edit\n',
  'src/vendor/lib.js': '',
  'dist/out.js': '',
  'README.md': '',
}

const SRC_ENTRY = [
  'owned      src/  owner @team  skill src-keeper  (.ownership.yml:5)',
  '           plugin docs-kit: {"id-prefix":"ADR"}',
  '           plugin sdd-kit: {}',
]

function explain(root: string, ...args: string[]): string {
  const result = runCli(['explain', ...args], { cwd: root })

  assert.equal(result.stderr, '')
  assert.equal(result.status, 0)

  return result.stdout
}

test('a covered file shows every block, with — for what it does not have', t => {
  const root = tempRepo(t, FILES, { codeowners: '* @other\nsrc/ @team @lead\n' })

  assert.equal(
    explain(root, 'src/a.ts'),
    ['path       src/a.ts', ...SRC_ENTRY, 'generated  —', 'ignore     —', 'CODEOWNERS line 2: @team @lead — declared owner listed', ''].join('\n'),
  )
})

test('an entry without a skill shows —, and a declared owner missing from the line is said', t => {
  const root = tempRepo(t, FILES, { codeowners: '* @other\n' })

  assert.equal(
    explain(root, '.gitignore'),
    [
      'path       .gitignore',
      'owned      .gitignore  owner @Lead  skill —  (.ownership.yml:12)',
      'generated  —',
      'ignore     —',
      'CODEOWNERS line 1: @other — declared owner @Lead not listed',
      '',
    ].join('\n'),
  )
})

test('the declared owner is looked up on the CODEOWNERS line without regard to case', t => {
  assert.match(explain(tempRepo(t, FILES, { codeowners: '.gitignore @lead\n' }), '.gitignore'), /^CODEOWNERS line 1: @lead — declared owner listed$/m)
})

test('a line with a pattern and no owner, and a path no line matches, are told apart', t => {
  const root = tempRepo(t, FILES, { codeowners: 'src/\n' })

  assert.match(explain(root, 'src/a.ts'), /^CODEOWNERS line 1: no owner — declared owner @team not listed$/m)
  assert.match(explain(root, 'README.md'), /^CODEOWNERS no line matches this path$/m)
})

test('a declared generated file shows its command, its origin and the owned entry that covers it', t => {
  assert.equal(
    explain(tempRepo(t, FILES), 'src/gen.ts'),
    [
      'path       src/gen.ts',
      ...SRC_ENTRY,
      'generated  generated[]  command node gen.mjs  (.ownership.yml:15)',
      'ignore     —',
      'CODEOWNERS the repository has no CODEOWNERS',
      '',
    ].join('\n'),
  )
})

test('a file with the marker outside generated[] says the marker is the origin', t => {
  assert.match(explain(tempRepo(t, FILES), 'src/marked.ts'), /^generated {2}marker "generated: do not edit" on its first line; not declared in generated\[\]$/m)
})

test('a file under an ignore inside an owned directory shows both rules and is outside coverage', t => {
  assert.equal(
    explain(tempRepo(t, FILES), 'src/vendor/lib.js'),
    [
      'path       src/vendor/lib.js',
      ...SRC_ENTRY,
      'generated  —',
      'ignore     src/vendor/  (.ownership.yml:18)',
      'CODEOWNERS the repository has no CODEOWNERS',
      'coverage   outside coverage: the ignore leaves it out of src/',
      '',
    ].join('\n'),
  )
})

test('an uncovered path names the ownership file where its entry belongs', t => {
  const root = tempRepo(t, {
    ...FILES,
    '.ownership.yml': `${OWNERSHIP}include:\n  - plugins/x/\n`,
    'plugins/x/.ownership.yml': "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@x'\n",
    'plugins/x/a.ts': '',
  })

  assert.equal(
    explain(root, 'README.md'),
    [
      'path       README.md',
      'owned      —',
      'generated  —',
      'ignore     —',
      'CODEOWNERS the repository has no CODEOWNERS',
      'coverage   not covered: its entry belongs in owned[] of .ownership.yml',
      '',
    ].join('\n'),
  )
  assert.match(explain(root, 'plugins/x/a.ts'), /^coverage {3}not covered: its entry belongs in owned\[\] of plugins\/x\/\.ownership\.yml$/m)
  assert.match(explain(root, 'plugins/x/planned/new.ts'), /^coverage {3}not covered: its entry belongs in owned\[\] of plugins\/x\/\.ownership\.yml$/m)
})

test('a path a .gitignore excludes is said so, and its coverage is not evaluated', t => {
  assert.match(explain(tempRepo(t, FILES), 'dist/out.js'), /^coverage {3}not a repository file: a \.gitignore excludes it, so coverage is not evaluated$/m)
})

test('a directory is explained as a directory, with or without the trailing slash', t => {
  const root = tempRepo(t, FILES, { codeowners: 'src/ @team\n' })
  const expected = ['path       src/', ...SRC_ENTRY, 'generated  —', 'ignore     —', 'CODEOWNERS line 1: @team — declared owner listed', ''].join('\n')

  assert.equal(explain(root, 'src/'), expected)
  assert.equal(explain(root, 'src'), expected)
})

test('the path may be absolute or start with ./', t => {
  const root = tempRepo(t, FILES)
  const expected = explain(root, 'src/a.ts')

  assert.equal(explain(root, join(root, 'src', 'a.ts')), expected)
  assert.equal(explain(root, './src/a.ts'), expected)
})

test('a missing path, an extra path or a path outside the repository exits 2', t => {
  const root = tempRepo(t, FILES)
  const cases: [string[], RegExp][] = [
    [[], /^ownership: explain needs a path/],
    [['a.ts', 'b.ts'], /^ownership: explain takes one path; got 2/],
    [['../elsewhere.ts'], /^ownership: "\.\.\/elsewhere\.ts" is outside the repository/],
    [['.'], /^ownership: "\." is the repository itself/],
  ]

  for (const [args, message] of cases) {
    const result = runCli(['explain', ...args], { cwd: root })

    assert.equal(result.status, 2, args.join(' '))
    assert.equal(result.stdout, '')
    assert.match(result.stderr, message)
  }
})

test('a repository without an ownership file has nothing to explain, and a load error exits 2', t => {
  const none = runCli(['explain', 'a.txt'], { cwd: tempRepo(t, { 'a.txt': '' }) })
  const broken = runCli(['explain', 'a.txt'], { cwd: tempRepo(t, { '.ownership.yml': 'version: 2\n', 'a.txt': '' }) })

  assert.equal(none.status, 0)
  assert.equal(none.stdout, 'ownership: no ownership file found; nothing to explain.\n')
  assert.equal(broken.status, 2)
  assert.equal(broken.stdout, '')
  assert.match(broken.stderr, /version 2 is not supported/)
})

test('explain never prunes: an error in an include that cannot hold the path still shows', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\ninclude:\n  - plugins/x/\n', 'plugins/x/.ownership.yml': 'version: 2\n', 'README.md': '' })
  const result = runCli(['explain', 'README.md'], { cwd: root })

  assert.equal(result.status, 2)
  assert.match(result.stderr, /^plugins\/x\/\.ownership\.yml:1: version 2 is not supported/)
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/cli/explain.test.ts`
Expected: FAIL — every run exits 2 with `ownership: unknown command "explain"`.

- [ ] **Step 3: Write the command**

`plugins/ownership/plugin/src/cli/explain.ts`:

```ts
import { statSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { loadCodeowners } from '../codeowners/locate.ts'
import { normalizePath, toPosix } from '../paths/paths.ts'
import { isInsideWorkTree, listRepoFiles } from '../repo/repo.ts'
import { explainPath } from '../resolve/explain.ts'
import type { PathExplanation } from '../resolve/explain.ts'
import { resolveOwnership } from '../resolve/resolve.ts'
import type { RuleOrigin } from '../resolve/types.ts'
import type { Io } from './main.ts'
import { USAGE, UsageError } from './usage.ts'

const LABEL_WIDTH = 11
const NONE = '—'

function row(label: string, text: string): string {
  return `${label.padEnd(LABEL_WIDTH)}${text}`
}

function at(origin: RuleOrigin): string {
  return origin.line === undefined ? `(${origin.file})` : `(${origin.file}:${origin.line})`
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/** The path as the repository names it: relative to the root, with `/`, and a trailing `/` when it is a directory. */
function repositoryPath(root: string, given: string): string {
  const absolute = resolve(root, given)
  const fromRoot = relative(root, absolute)

  if (fromRoot === '') {
    throw new UsageError(`"${given}" is the repository itself; explain takes a file or a directory inside it`)
  }

  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    throw new UsageError(`"${given}" is outside the repository`)
  }

  const path = normalizePath(toPosix(fromRoot))

  return /[\\/]$/.test(given) || isDirectory(absolute) ? `${path}/` : path
}

function codeownersText(explanation: PathExplanation): string {
  const result = explanation.codeowners

  if (result.kind === 'no-codeowners') {
    return 'the repository has no CODEOWNERS'
  }

  if (result.kind === 'unmatched') {
    return 'no line matches this path'
  }

  const assigned = `line ${result.line}: ${result.owners.length === 0 ? 'no owner' : result.owners.join(' ')}`
  const owner = explanation.owned?.owner

  if (owner === undefined) {
    return assigned
  }

  const listed = result.owners.some(candidate => candidate.toLowerCase() === owner.toLowerCase())

  return `${assigned} ${NONE} declared owner ${listed ? 'listed' : `${owner} not listed`}`
}

function coverageText(explanation: PathExplanation): string | null {
  const coverage = explanation.coverage

  switch (coverage.kind) {
    case 'covered':
      return null
    case 'ignored':
      return explanation.owned === null
        ? 'outside coverage: an ignore leaves it out'
        : `outside coverage: the ignore leaves it out of ${explanation.owned.path}`
    case 'gitignored':
      return 'not a repository file: a .gitignore excludes it, so coverage is not evaluated'
    case 'uncovered':
      return coverage.file === null
        ? 'not covered: no ownership file has a base that contains it'
        : `not covered: its entry belongs in owned[] of ${coverage.file}`
  }
}

/** The fixed blocks of an explanation, one per line, with `—` for what the path does not have. */
export function formatExplanation(explanation: PathExplanation): string {
  const lines = [row('path', explanation.path)]
  const { owned, generated, ignore } = explanation

  if (owned === null) {
    lines.push(row('owned', NONE))
  } else {
    lines.push(row('owned', `${owned.path}  owner ${owned.owner}  skill ${owned.skill ?? NONE}  ${at(owned.origin)}`))

    for (const name of Object.keys(owned.plugins).sort()) {
      lines.push(row('', `plugin ${name}: ${JSON.stringify(owned.plugins[name])}`))
    }
  }

  if (generated === null) {
    lines.push(row('generated', NONE))
  } else if (generated.source === 'declared') {
    lines.push(row('generated', `generated[]  command ${generated.rule.command}  ${at(generated.rule.origin)}`))
  } else {
    lines.push(row('generated', 'marker "generated: do not edit" on its first line; not declared in generated[]'))
  }

  lines.push(row('ignore', ignore === null ? NONE : `${ignore.path}  ${at(ignore.origin)}`))
  lines.push(row('CODEOWNERS', codeownersText(explanation)))

  const coverage = coverageText(explanation)

  if (coverage !== null) {
    lines.push(row('coverage', coverage))
  }

  return `${lines.join('\n')}\n`
}

/** Like validate, explain reads every ownership file: it never prunes. */
export function explainCommand(args: readonly string[], root: string, io: Io): number {
  const { values, positionals } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: true,
    options: {
      ownership: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (values.help === true) {
    io.stdout(USAGE)

    return 0
  }

  const [given, ...extra] = positionals

  if (given === undefined || given === '') {
    throw new UsageError('explain needs a path: ownership explain <path>')
  }

  if (extra.length > 0) {
    throw new UsageError(`explain takes one path; got ${positionals.length}`)
  }

  const path = repositoryPath(root, given)
  const repoFiles = isInsideWorkTree(root) ? listRepoFiles(root) : new Set<string>()
  const config = resolveOwnership(root, { repoFiles, ...(values.ownership === undefined ? {} : { ownership: values.ownership }) })

  if (config === null) {
    io.stdout('ownership: no ownership file found; nothing to explain.\n')

    return 0
  }

  io.stdout(formatExplanation(explainPath(config, path, { repoFiles, codeowners: loadCodeowners(root) })))

  return 0
}
```

- [ ] **Step 4: Add the command to the CLI**

In `plugins/ownership/plugin/src/cli/main.ts`, add the import after the one of `OwnershipError`:

```ts
import { explainCommand } from './explain.ts'
```

and the case after `validate`:

```ts
      case 'validate':
        return await validateCommand(args, root, io)
      case 'explain':
        return explainCommand(args, root, io)
```

- [ ] **Step 5: Run it to see it pass**

Run: `node --test test/cli/explain.test.ts test/cli/main.test.ts`
Expected: PASS (14 + 3 tests).

- [ ] **Step 6: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/cli plugins/ownership/test/cli/explain.test.ts
git commit -m "feat(ownership): ownership explain shows every rule that reaches a path

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Derive and render the initial ownership file

**Files:**
- Create: `plugins/ownership/plugin/src/init/derive.ts`
- Create: `plugins/ownership/plugin/src/init/render.ts`
- Test: `plugins/ownership/test/init/derive.test.ts`
- Test: `plugins/ownership/test/init/render.test.ts`

**Interfaces:**
- Consumes: `ownersOf`, `Codeowners`, `OwnersResult`, `parseCodeowners` (Task 9), `isGeneratedByMarker`, `readHead` (Task 10), `caseCollisions`, `literalProblem` (Task 3), `parseOwnershipFile` (Task 4, in the tests).
- Produces (`init/derive.ts`):
  - `type InitMode = { readonly kind: 'skeleton' } | { readonly kind: 'owner'; readonly owner: string } | { readonly kind: 'codeowners'; readonly codeowners: Codeowners }`
  - `interface InitEntry { readonly path: string; readonly owner: string; readonly note?: string }`
  - `interface LeftOut { readonly path: string; readonly owner: string; readonly reason: string }` — a path that would be an entry but that an ownership file cannot declare: it differs from another only in case, or it is not literal (`app/[slug]/`).
  - `interface InitPlan { readonly mode: 'skeleton' | 'owner' | 'codeowners'; readonly entries: readonly InitEntry[]; readonly leftOut: readonly LeftOut[]; readonly templates: readonly string[]; readonly unowned: number }`
  - `rootChildren(repoFiles: Iterable<string>): string[]`
  - `deriveInit(repoFiles: ReadonlySet<string>, mode: InitMode): InitPlan` — pure: it reads no file.
  - `markerFiles(root: string, repoFiles: Iterable<string>): string[]` — sorted.
- Produces (`init/render.ts`):
  - `SCHEMA_URL: string`
  - `renderOwnershipFile(plan: InitPlan, markers: readonly string[]): string` — written line by line, never by the `yaml` serializer.

- [ ] **Step 1: Write the failing tests**

`plugins/ownership/test/init/derive.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseCodeowners } from '../../plugin/src/codeowners/parse.ts'
import { deriveInit, markerFiles, rootChildren } from '../../plugin/src/init/derive.ts'
import { tempRepo } from '../helpers/repo.ts'

const FILES = new Set(['.ownership.yml', 'README.md', 'docs/a.md', 'docs/adr/1.md', 'src/a.ts', 'src/lib/b.ts'])

function fromCodeowners(files: string[], codeowners: string) {
  return deriveInit(new Set(files), { kind: 'codeowners', codeowners: parseCodeowners(codeowners) })
}

test('the root children are the first level, directories with a slash, sorted', () => {
  assert.deepEqual(rootChildren(FILES), ['.ownership.yml', 'README.md', 'docs/', 'src/'])
  assert.deepEqual(rootChildren([]), [])
})

test('skeleton mode writes no entry: a model per root child, and every file is still without an owner', () => {
  assert.deepEqual(deriveInit(FILES, { kind: 'skeleton' }), {
    mode: 'skeleton',
    entries: [],
    leftOut: [],
    templates: ['.ownership.yml', 'README.md', 'docs/', 'src/'],
    unowned: 6,
  })
})

test('single-owner mode gives every root child to that owner', () => {
  assert.deepEqual(deriveInit(FILES, { kind: 'owner', owner: '@me' }), {
    mode: 'owner',
    entries: [
      { path: '.ownership.yml', owner: '@me' },
      { path: 'README.md', owner: '@me' },
      { path: 'docs/', owner: '@me' },
      { path: 'src/', owner: '@me' },
    ],
    leftOut: [],
    templates: [],
    unowned: 0,
  })
})

test('a root child whose files all have the same owners, and that has them itself, is one entry', () => {
  const plan = fromCodeowners(['docs/a.md', 'docs/adr/1.md', 'src/a.ts'], 'docs/ @docs\nsrc/ @dev\n')

  assert.deepEqual(plan.entries, [
    { path: 'docs/', owner: '@docs' },
    { path: 'src/', owner: '@dev' },
  ])
  assert.equal(plan.unowned, 0)
})

test('a directory with mixed owners is split into the smallest disjoint cover', () => {
  const plan = fromCodeowners(['docs/a.md', 'docs/adr/1.md', 'docs/adr/2.md', 'docs/api/v1/x.md'], 'docs/ @docs\ndocs/adr/ @arch\n')

  assert.deepEqual(plan.entries, [
    { path: 'docs/a.md', owner: '@docs' },
    { path: 'docs/adr/', owner: '@arch' },
    { path: 'docs/api/', owner: '@docs' },
  ])
})

test('a directory whose files are covered by a line that does not match the directory itself is split', () => {
  const plan = fromCodeowners(['docs/a.md', 'docs/x/b.md'], 'docs/**/*.md @docs\n')

  assert.deepEqual(
    plan.entries.map(entry => entry.path),
    ['docs/a.md', 'docs/x/b.md'],
  )
})

test('the owner is the first of the effective line, and the others go in a note with the line number', () => {
  const plan = fromCodeowners(['src/a.ts'], '# owners\n\nsrc/ @a @b @c\n')

  assert.deepEqual(plan.entries, [{ path: 'src/', owner: '@a', note: 'CODEOWNERS line 3 also lists @b @c' }])
})

test('owner sets are compared without regard to case or order', () => {
  const plan = fromCodeowners(['src/a.ts', 'src/b.md'], 'src/ @A @b\n*.md @B @a\n')

  assert.deepEqual(
    plan.entries.map(entry => entry.path),
    ['src/'],
  )
})

test('a file with no effective line, or on a line without owners, gets no entry and is counted', () => {
  const plan = fromCodeowners(['a.md', 'vendor/x.js', 'vendor/y.js', 'src/a.ts'], '* @all\nvendor/\nsrc/ @dev\n')

  assert.deepEqual(
    plan.entries.map(entry => entry.path),
    ['a.md', 'src/'],
  )
  assert.equal(plan.unowned, 2)
  assert.equal(fromCodeowners(['a.md', 'b.md'], 'a.md @a\n').unowned, 1)
})

test('paths that differ only in case are left out, in every mode that writes entries', () => {
  const files = new Set(['Docs/a.md', 'docs/b.md', 'src/a.ts'])
  const expected = [
    { path: 'Docs/', owner: '@me', reason: 'differs from another path only in case' },
    { path: 'docs/', owner: '@me', reason: 'differs from another path only in case' },
  ]
  const owner = deriveInit(files, { kind: 'owner', owner: '@me' })
  const codeowners = deriveInit(files, { kind: 'codeowners', codeowners: parseCodeowners('* @me\n') })

  assert.deepEqual(owner.leftOut, expected)
  assert.deepEqual(owner.entries, [{ path: 'src/', owner: '@me' }])
  assert.equal(owner.unowned, 2)
  assert.deepEqual(codeowners.leftOut, expected)
  assert.equal(codeowners.unowned, 2)
})

test('a path an ownership file cannot declare is left out with the reason', () => {
  const plan = fromCodeowners(['app/[slug]/page.tsx', 'app/layout.tsx'], '* @routes\napp/layout.tsx @web\n')

  assert.deepEqual(plan.entries, [{ path: 'app/layout.tsx', owner: '@web' }])
  assert.deepEqual(plan.leftOut, [{ path: 'app/[slug]/', owner: '@routes', reason: 'contains "["; paths are literal, without glob or negation' }])
  assert.equal(plan.unowned, 1)
})

test('the same files and the same mode give the same plan, whatever the order of the files', () => {
  const shuffled = new Set([...FILES].reverse())
  const mode = { kind: 'codeowners', codeowners: parseCodeowners('docs/ @docs\n* @all\n') } as const

  assert.deepEqual(deriveInit(shuffled, mode), deriveInit(FILES, mode))
})

test('the files whose first line carries the marker are found, sorted; a missing file is not one', t => {
  const root = tempRepo(
    t,
    { 'b.md': '<!-- generated: do not edit -->\n', 'a/x.ts': '// GENERATED: DO NOT EDIT\n', 'c.md': '# Title\ngenerated: do not edit\n' },
    { git: false },
  )

  assert.deepEqual(markerFiles(root, ['b.md', 'c.md', 'a/x.ts', 'missing.md']), ['a/x.ts', 'b.md'])
})
```

`plugins/ownership/test/init/render.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseCodeowners } from '../../plugin/src/codeowners/parse.ts'
import { deriveInit } from '../../plugin/src/init/derive.ts'
import type { InitPlan } from '../../plugin/src/init/derive.ts'
import { renderOwnershipFile, SCHEMA_URL } from '../../plugin/src/init/render.ts'
import { parseOwnershipFile } from '../../plugin/src/schema/parse.ts'

const HEADER = `# yaml-language-server: $schema=${SCHEMA_URL}\nversion: 1\n`
const FILES = new Set(['.ownership.yml', 'README.md', 'docs/a.md', 'src/a.ts'])

function load(text: string) {
  return parseOwnershipFile(text, '.ownership.yml', { isRoot: true })
}

test('the schema comment carries the published URL', () => {
  assert.equal(SCHEMA_URL, 'https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json')
})

test('skeleton mode: the schema comment, the version and a commented model per root child', () => {
  assert.equal(
    renderOwnershipFile(deriveInit(FILES, { kind: 'skeleton' }), []),
    [
      `# yaml-language-server: $schema=${SCHEMA_URL}`,
      'version: 1',
      '',
      '# No entry was written: only you can name the owner of each path. Uncomment',
      '# the entries, give each one its owner, and split a directory into its',
      '# children when its parts have different owners.',
      '# owned:',
      '#   - path: .ownership.yml',
      '#     owner: "@owner"',
      '#   - path: README.md',
      '#     owner: "@owner"',
      '#   - path: docs/',
      '#     owner: "@owner"',
      '#   - path: src/',
      '#     owner: "@owner"',
      '',
    ].join('\n'),
  )
})

test('single-owner mode: one entry per root child, owners in double quotes', () => {
  assert.equal(
    renderOwnershipFile(deriveInit(FILES, { kind: 'owner', owner: '@me' }), []),
    [
      `# yaml-language-server: $schema=${SCHEMA_URL}`,
      'version: 1',
      '',
      'owned:',
      '  - path: .ownership.yml',
      '    owner: "@me"',
      '  - path: README.md',
      '    owner: "@me"',
      '  - path: docs/',
      '    owner: "@me"',
      '  - path: src/',
      '    owner: "@me"',
      '',
    ].join('\n'),
  )
})

test('CODEOWNERS mode: the other owners of the line are a comment above the entry', () => {
  const plan = deriveInit(new Set(['docs/a.md', 'src/a.ts']), { kind: 'codeowners', codeowners: parseCodeowners('docs/ @docs\nsrc/ @a @b\n') })

  assert.equal(
    renderOwnershipFile(plan, []),
    `${HEADER}\nowned:\n  - path: docs/\n    owner: "@docs"\n  # CODEOWNERS line 2 also lists @b\n  - path: src/\n    owner: "@a"\n`,
  )
})

test('paths left out and files with the marker are written as comments', () => {
  const plan = deriveInit(new Set(['Docs/a.md', 'docs/b.md', 'src/gen.ts']), { kind: 'owner', owner: '@me' })

  assert.equal(
    renderOwnershipFile(plan, ['src/gen.ts']),
    [
      `# yaml-language-server: $schema=${SCHEMA_URL}`,
      'version: 1',
      '',
      'owned:',
      '  - path: src/',
      '    owner: "@me"',
      '',
      '# Left out, and so without an owner: an ownership file cannot declare these',
      '# paths as they are.',
      '#   differs from another path only in case:',
      '#   - path: Docs/',
      '#     owner: "@me"',
      '#   differs from another path only in case:',
      '#   - path: docs/',
      '#     owner: "@me"',
      '',
      '# These files carry the "generated: do not edit" marker. Uncomment the block',
      '# and give each one the command that prints its content.',
      '# generated:',
      '#   - path: src/gen.ts',
      '#     command: <command that prints this file>',
      '',
    ].join('\n'),
  )
})

test('the file never seeds ignore, plugins or include, and has no generated key of its own', () => {
  const text = renderOwnershipFile(deriveInit(FILES, { kind: 'owner', owner: '@me' }), ['src/a.ts'])

  assert.doesNotMatch(text, /^(?:ignore|plugins|include|generated):/m)
})

test('the result of every mode loads without a load error and gives back the same entries', () => {
  const plans: InitPlan[] = [
    deriveInit(FILES, { kind: 'skeleton' }),
    deriveInit(FILES, { kind: 'owner', owner: '@me' }),
    deriveInit(FILES, { kind: 'codeowners', codeowners: parseCodeowners('* @all @lead\ndocs/ @docs\n') }),
    deriveInit(FILES, { kind: 'codeowners', codeowners: parseCodeowners('nothing/ @x\n') }),
    deriveInit(new Set(['Docs/a.md', 'docs/b.md']), { kind: 'owner', owner: '@me' }),
  ]

  for (const plan of plans) {
    const loaded = load(renderOwnershipFile(plan, ['docs/a.md']))

    assert.deepEqual(
      loaded.owned.map(entry => [entry.path, entry.owner]),
      plan.entries.map(entry => [entry.path, entry.owner]),
    )
    assert.deepEqual(loaded.generated, [])
  }
})

test('a path YAML would read as something else, or cut short, is written in double quotes', () => {
  const names = ['my file #1.md', '123', '1.5', 'true', 'Null', '@scope/', '- dash', 'key: value', '.5', 'ação/', "it's", '-x', '~', '{a}', 'tab\there']
  const plan = deriveInit(new Set(names.map(name => (name.endsWith('/') ? `${name}x.md` : name))), { kind: 'owner', owner: '@me' })

  assert.deepEqual(plan.leftOut, [])
  assert.deepEqual(
    load(renderOwnershipFile(plan, []))
      .owned.map(entry => entry.path)
      .sort(),
    [...names].sort(),
  )
})

test('the same plan renders to the same bytes', () => {
  const plan = deriveInit(FILES, { kind: 'owner', owner: '@me' })

  assert.equal(renderOwnershipFile(plan, ['b', 'a']), renderOwnershipFile(plan, ['b', 'a']))
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/init/derive.test.ts test/init/render.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the derivation**

`plugins/ownership/plugin/src/init/derive.ts`:

```ts
import { join } from 'node:path'

import { ownersOf } from '../codeowners/match.ts'
import type { Codeowners, OwnersResult } from '../codeowners/types.ts'
import { isGeneratedByMarker, readHead } from '../generated/marker.ts'
import { caseCollisions, literalProblem } from '../paths/paths.ts'

export type InitMode =
  { readonly kind: 'skeleton' } | { readonly kind: 'owner'; readonly owner: string } | { readonly kind: 'codeowners'; readonly codeowners: Codeowners }

export interface InitEntry {
  readonly path: string
  readonly owner: string
  /** A comment written above the entry. */
  readonly note?: string
}

/** A path that would be an entry, but that an ownership file cannot declare as it is. */
export interface LeftOut {
  readonly path: string
  readonly owner: string
  readonly reason: string
}

export interface InitPlan {
  readonly mode: InitMode['kind']
  readonly entries: readonly InitEntry[]
  readonly leftOut: readonly LeftOut[]
  /** The root children, written as a commented model in skeleton mode; empty in the other modes. */
  readonly templates: readonly string[]
  /** How many repository files no entry covers. */
  readonly unowned: number
}

/** The first level of the repository files, directories with a trailing `/`, sorted. */
export function rootChildren(repoFiles: Iterable<string>): string[] {
  const children = new Set<string>()

  for (const file of repoFiles) {
    const slash = file.indexOf('/')

    children.add(slash === -1 ? file : file.slice(0, slash + 1))
  }

  return [...children].sort()
}

interface TreeNode {
  readonly path: string
  /** Null for a file. */
  readonly children: Map<string, TreeNode> | null
}

function buildTree(repoFiles: Iterable<string>): TreeNode {
  const root: TreeNode = { path: '', children: new Map() }

  for (const file of repoFiles) {
    const segments = file.split('/')
    let node = root

    segments.forEach((segment, i) => {
      const isFile = i === segments.length - 1
      let child = node.children?.get(segment)

      if (child === undefined) {
        child = { path: `${node.path}${segment}${isFile ? '' : '/'}`, children: isFile ? null : new Map() }
        node.children?.set(segment, child)
      }

      node = child
    })
  }

  return root
}

function sortedChildren(node: TreeNode): TreeNode[] {
  return [...(node.children?.values() ?? [])].sort((a, b) => (a.path < b.path ? -1 : 1))
}

const NO_OWNER = ''

/** The owner set of a CODEOWNERS answer as one comparable text; no line and a line without owners are both "no owner". */
function ownerKey(result: OwnersResult): string {
  return result.kind === 'matched' ? [...new Set(result.owners.map(owner => owner.toLowerCase()))].sort().join(' ') : NO_OWNER
}

/**
 * The smallest disjoint cover the CODEOWNERS allows. A node becomes an entry
 * when every repository file under it has the same owners and the node's own
 * path gets those owners too; otherwise its children are tried. The second
 * condition matters because a line such as `docs/**\/*.md @x` gives every file
 * of `docs/` to `@x` without matching `docs/` itself.
 */
function fromCodeowners(repoFiles: Iterable<string>, codeowners: Codeowners): InitEntry[] {
  const keys = new Map<TreeNode, string | null>()

  const keyOf = (node: TreeNode): string | null => {
    const known = keys.get(node)

    if (known !== undefined) {
      return known
    }

    let key: string | null

    if (node.children === null) {
      key = ownerKey(ownersOf(codeowners, node.path))
    } else {
      const below = new Set([...node.children.values()].map(keyOf))
      const [only] = below

      key = below.size === 1 && only !== undefined ? only : null
    }

    keys.set(node, key)

    return key
  }

  const entries: InitEntry[] = []

  const visit = (node: TreeNode): void => {
    const key = keyOf(node)
    const own = ownersOf(codeowners, node.path)
    const [owner, ...others] = own.kind === 'matched' ? own.owners : []

    if (key !== null && key !== NO_OWNER && own.kind === 'matched' && owner !== undefined && ownerKey(own) === key) {
      entries.push({ path: node.path, owner, ...(others.length === 0 ? {} : { note: `CODEOWNERS line ${own.line} also lists ${others.join(' ')}` }) })

      return
    }

    sortedChildren(node).forEach(visit)
  }

  sortedChildren(buildTree(repoFiles)).forEach(visit)

  return entries
}

function countUnowned(repoFiles: Iterable<string>, entries: readonly InitEntry[]): number {
  const declared = new Set(entries.map(entry => entry.path))
  let unowned = 0

  for (const file of repoFiles) {
    let covered = declared.has(file)

    for (let slash = file.indexOf('/'); !covered && slash !== -1; slash = file.indexOf('/', slash + 1)) {
      covered = declared.has(file.slice(0, slash + 1))
    }

    if (!covered) {
      unowned += 1
    }
  }

  return unowned
}

/**
 * What `ownership init` writes for these repository files. An entry never
 * gets an owner nobody named: it comes from the mode, or there is no entry.
 */
export function deriveInit(repoFiles: ReadonlySet<string>, mode: InitMode): InitPlan {
  if (mode.kind === 'skeleton') {
    return { mode: 'skeleton', entries: [], leftOut: [], templates: rootChildren(repoFiles), unowned: repoFiles.size }
  }

  const candidates =
    mode.kind === 'owner' ? rootChildren(repoFiles).map((path): InitEntry => ({ path, owner: mode.owner })) : fromCodeowners(repoFiles, mode.codeowners)
  const collisions = new Set(caseCollisions(candidates.map(entry => entry.path)).flat())
  const entries: InitEntry[] = []
  const leftOut: LeftOut[] = []

  for (const entry of candidates) {
    const reason = collisions.has(entry.path) ? 'differs from another path only in case' : literalProblem(entry.path)

    if (reason === null) {
      entries.push(entry)
    } else {
      leftOut.push({ path: entry.path, owner: entry.owner, reason })
    }
  }

  return { mode: mode.kind, entries, leftOut, templates: [], unowned: countUnowned(repoFiles, entries) }
}

/** The repository files whose first line says they are generated. */
export function markerFiles(root: string, repoFiles: Iterable<string>): string[] {
  const found: string[] = []

  for (const file of repoFiles) {
    const head = readHead(join(root, file))

    if (head !== null && isGeneratedByMarker(head)) {
      found.push(file)
    }
  }

  return found.sort()
}
```

- [ ] **Step 4: Write the rendering**

`plugins/ownership/plugin/src/init/render.ts`:

```ts
import type { InitPlan } from './derive.ts'

export const SCHEMA_URL = 'https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json'

const PLAIN = /^[A-Za-z_][A-Za-z0-9_./-]*$|^\.[A-Za-z_][A-Za-z0-9_./-]*$/
const RESERVED = /^(?:true|false|null)$/i

/** A YAML scalar that reads back as this exact text: plain when that is safe, in double quotes otherwise. */
function scalar(text: string): string {
  return PLAIN.test(text) && !RESERVED.test(text) ? text : JSON.stringify(text)
}

function entryLines(path: string, owner: string): string[] {
  return [`  - path: ${scalar(path)}`, `    owner: ${JSON.stringify(owner)}`]
}

function commented(lines: readonly string[]): string[] {
  return lines.map(line => `# ${line}`)
}

/**
 * The text of the root ownership file. It is written by hand, line by line,
 * and not by a YAML serializer, so the same plan gives the same bytes on every
 * machine and in every version of the dependencies.
 */
export function renderOwnershipFile(plan: InitPlan, markers: readonly string[]): string {
  const lines = [`# yaml-language-server: $schema=${SCHEMA_URL}`, 'version: 1', '']

  if (plan.mode === 'skeleton') {
    lines.push(
      '# No entry was written: only you can name the owner of each path. Uncomment',
      '# the entries, give each one its owner, and split a directory into its',
      '# children when its parts have different owners.',
      ...commented(['owned:', ...plan.templates.flatMap(path => entryLines(path, '@owner'))]),
    )
  } else if (plan.entries.length === 0) {
    lines.push('# No entry could be derived. Declare each path with its owner under "owned:".')
  } else {
    lines.push('owned:')

    for (const entry of plan.entries) {
      if (entry.note !== undefined) {
        lines.push(`  # ${entry.note}`)
      }

      lines.push(...entryLines(entry.path, entry.owner))
    }
  }

  if (plan.leftOut.length > 0) {
    lines.push('', '# Left out, and so without an owner: an ownership file cannot declare these', '# paths as they are.')

    for (const item of plan.leftOut) {
      lines.push(`#   ${item.reason}:`, ...commented(entryLines(item.path, item.owner)))
    }
  }

  if (markers.length > 0) {
    lines.push(
      '',
      '# These files carry the "generated: do not edit" marker. Uncomment the block',
      '# and give each one the command that prints its content.',
      ...commented(['generated:', ...markers.flatMap(path => [`  - path: ${scalar(path)}`, '    command: <command that prints this file>'])]),
    )
  }

  return `${lines.join('\n')}\n`
}
```

- [ ] **Step 5: Run them to see them pass**

Run: `node --test test/init/derive.test.ts test/init/render.test.ts`
Expected: PASS (13 + 9 tests).

- [ ] **Step 6: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/init plugins/ownership/test/init
git commit -m "feat(ownership): derive and render the initial ownership file

Three modes — a skeleton, a single owner, the CODEOWNERS — give a plan,
and the plan is written line by line so the same tree gives the same
bytes.

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: `ownership init`

**Files:**
- Create: `plugins/ownership/plugin/src/cli/init.ts`
- Modify: `plugins/ownership/plugin/src/cli/main.ts`
- Test: `plugins/ownership/test/cli/init.test.ts`

**Interfaces:**
- Consumes: `deriveInit`, `markerFiles`, `InitMode`, `InitPlan`, `renderOwnershipFile`, `SCHEMA_URL` (Task 16), `CODEOWNERS_LOCATIONS`, `findCodeowners`, `loadCodeowners` (Task 9), `ROOT_CANDIDATES` (Task 7), `isInsideWorkTree`, `listRepoFiles` (Task 5), `normalizePath`, `toPosix` (Task 3), `Io`, `USAGE`, `UsageError` (Task 14).
- Produces:
  - `initCommand(args: readonly string[], root: string, io: Io): number` — 0 on success; every refusal is a `UsageError` or an `OwnershipError`, which `main` turns into exit 2. Never 1.
  - `main` gains the `init` case.
- The checks run in this order, and the first that fails is the one reported: inside a Git work tree; the target inside the repository and not a directory; neither the target nor a root candidate exists; `--owner` and `--from-codeowners` not together; `--owner` starts with `@`; `--from-codeowners` has a CODEOWNERS.
- The target path is added to the repository files before the entries are derived.
- With `--stdout`, the file goes to stdout, the summary to stderr, and nothing is written. Otherwise the summary goes to stdout.

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/cli/init.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SCHEMA_URL } from '../../plugin/src/init/render.ts'
import { runCli } from '../helpers/cli.ts'
import { tempRepo } from '../helpers/repo.ts'

const HEADER = `# yaml-language-server: $schema=${SCHEMA_URL}\nversion: 1\n`
const FILES = { 'README.md': '', 'docs/a.md': '', 'src/a.ts': '', 'src/lib/b.ts': '' }

function read(root: string, path = '.ownership.yml'): string {
  return readFileSync(join(root, path), 'utf8')
}

test('without an option, init writes the skeleton and says validate fails on purpose', t => {
  const root = tempRepo(t, FILES)
  const result = runCli(['init'], { cwd: root })

  assert.equal(result.stderr, '')
  assert.equal(result.status, 0)
  assert.equal(
    result.stdout,
    [
      'ownership: wrote .ownership.yml with 0 entries.',
      'ownership: 5 repository files have no owner.',
      'ownership: declare every path in owned[]; "ownership validate" fails on purpose until every file has an owner.',
      'ownership: next step: ownership validate',
      '',
    ].join('\n'),
  )
  assert.match(read(root), /^# owned:\n# {3}- path: \.ownership\.yml\n# {5}owner: "@owner"\n# {3}- path: README\.md\n/m)
  assert.equal(runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root }).status, 1)
})

test('skeleton mode never switches to the CODEOWNERS on its own; it mentions --from-codeowners', t => {
  const root = tempRepo(t, FILES, { codeowners: '* @all\n' })
  const result = runCli(['init'], { cwd: root })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /^ownership: wrote \.ownership\.yml with 0 entries\.$/m)
  assert.match(result.stdout, /^ownership: this repository has a CODEOWNERS; "ownership init --from-codeowners" derives the entries from it\.$/m)
})

test('--owner gives every root child to that owner, the new file included, and coverage passes', t => {
  const root = tempRepo(t, FILES)
  const result = runCli(['init', '--owner', '@me'], { cwd: root })

  assert.equal(result.status, 0)
  assert.equal(
    result.stdout,
    ['ownership: wrote .ownership.yml with 4 entries.', 'ownership: every repository file has an owner.', 'ownership: next step: ownership validate', ''].join(
      '\n',
    ),
  )
  assert.equal(
    read(root),
    `${HEADER}\nowned:\n  - path: .ownership.yml\n    owner: "@me"\n  - path: README.md\n    owner: "@me"\n  - path: docs/\n    owner: "@me"\n  - path: src/\n    owner: "@me"\n`,
  )

  const validate = runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root })

  assert.equal(validate.stdout, 'ownership: no violations found.\n')
  assert.equal(validate.status, 0)
})

test('--from-codeowners derives entries that pass codeowners-match by construction, and counts the files left without an owner', t => {
  const root = tempRepo(t, FILES, { codeowners: '.ownership.yml @docs\nCODEOWNERS @docs\ndocs/ @docs @lead\nsrc/ @dev\nsrc/lib/ @lib\n' })
  const result = runCli(['init', '--from-codeowners'], { cwd: root })

  assert.equal(result.status, 0)
  assert.equal(
    result.stdout,
    [
      'ownership: wrote .ownership.yml with 5 entries.',
      'ownership: 1 repository file has no owner.',
      'ownership: declare every path in owned[]; "ownership validate" fails on purpose until every file has an owner.',
      'ownership: next step: ownership validate',
      '',
    ].join('\n'),
  )
  assert.equal(
    read(root),
    [
      `# yaml-language-server: $schema=${SCHEMA_URL}`,
      'version: 1',
      '',
      'owned:',
      '  - path: .ownership.yml',
      '    owner: "@docs"',
      '  - path: CODEOWNERS',
      '    owner: "@docs"',
      '  # CODEOWNERS line 3 also lists @lead',
      '  - path: docs/',
      '    owner: "@docs"',
      '  - path: src/a.ts',
      '    owner: "@dev"',
      '  - path: src/lib/',
      '    owner: "@lib"',
      '',
    ].join('\n'),
  )
  assert.equal(runCli(['validate', '--check', 'ownership/codeowners-match'], { cwd: root }).stdout, 'ownership: no violations found.\n')
  assert.match(runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root }).stdout, /^README\.md {2}ownership\/owner-coverage/m)
})

test('--stdout prints the file, sends the summary to stderr and writes nothing', t => {
  const root = tempRepo(t, FILES)
  const printed = runCli(['init', '--owner', '@me', '--stdout'], { cwd: root })

  assert.equal(printed.status, 0)
  assert.equal(existsSync(join(root, '.ownership.yml')), false)
  assert.equal(
    printed.stderr,
    [
      'ownership: printed .ownership.yml with 4 entries; nothing was written.',
      'ownership: every repository file has an owner.',
      'ownership: next step: ownership validate',
      '',
    ].join('\n'),
  )

  runCli(['init', '--owner', '@me'], { cwd: root })

  assert.equal(printed.stdout, read(root))
})

test('the same tree and the same options give the same file, byte for byte', t => {
  const codeowners = 'docs/ @docs\n* @all\n'
  const one = runCli(['init', '--from-codeowners', '--stdout'], { cwd: tempRepo(t, FILES, { codeowners }) })
  const two = runCli(['init', '--from-codeowners', '--stdout'], { cwd: tempRepo(t, FILES, { codeowners, add: true }) })

  assert.equal(one.status, 0)
  assert.equal(one.stdout, two.stdout)
})

test('--ownership creates the file elsewhere in the repository, and that file is covered too', t => {
  const root = tempRepo(t, FILES)
  const result = runCli(['init', '--owner', '@me', '--ownership', 'config/own.yml'], { cwd: root })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /^ownership: wrote config\/own\.yml with 4 entries\.$/m)
  assert.match(read(root, 'config/own.yml'), /^ {2}- path: config\/\n {4}owner: "@me"$/m)
  assert.equal(runCli(['validate', '--ownership', 'config/own.yml', '--check', 'ownership/owner-coverage'], { cwd: root }).status, 0)
})

test('files with the marker go into a commented generated block, and the file still loads', t => {
  const root = tempRepo(t, { 'src/gen.ts': '// generated: do not edit\n', 'src/a.ts': '' })

  assert.equal(runCli(['init', '--owner', '@me'], { cwd: root }).status, 0)
  assert.match(read(root), /^# generated:\n# {3}- path: src\/gen\.ts\n# {5}command: <command that prints this file>$/m)
  assert.equal(runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root }).status, 0)
})

test('paths that differ only in case are left out, listed, and the file still loads', t => {
  const root = tempRepo(t, { 'Docs/a.md': '', 'docs/b.md': '', 'src/a.ts': '' })

  if (existsSync(join(root, 'Docs', 'b.md'))) {
    t.skip('this file system does not tell Docs/ from docs/; CI (ubuntu) runs this proof')

    return
  }

  const result = runCli(['init', '--owner', '@me'], { cwd: root })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /^ownership: left out 2 paths an ownership file cannot declare: Docs\/, docs\/$/m)
  assert.match(result.stdout, /^ownership: 2 repository files have no owner\.$/m)
  assert.equal(runCli(['validate', '--check', 'ownership/owner-coverage'], { cwd: root }).status, 1)
})

test('init never overwrites: the target or any root candidate already there is an error that names it', t => {
  const cases: [Record<string, string>, string[], string][] = [
    [{ '.ownership.yml': 'version: 1\n' }, [], 'ownership: .ownership.yml already exists; ownership init never overwrites an ownership file\n'],
    [{ 'docs/.ownership.yml': 'version: 1\n' }, [], 'ownership: docs/.ownership.yml already exists; ownership init never overwrites an ownership file\n'],
    [
      { '.ownership.yml': 'keep me\n' },
      ['--ownership', 'config/own.yml'],
      'ownership: .ownership.yml already exists; ownership init never overwrites an ownership file\n',
    ],
    [
      { 'config/own.yml': 'keep me\n' },
      ['--ownership', 'config/own.yml', '--stdout'],
      'ownership: config/own.yml already exists; ownership init never overwrites an ownership file\n',
    ],
  ]

  for (const [files, args, message] of cases) {
    const root = tempRepo(t, files)
    const before = Object.entries(files).map(([path]) => read(root, path))
    const result = runCli(['init', '--owner', '@me', ...args], { cwd: root })

    assert.equal(result.status, 2)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr, message)
    assert.deepEqual(
      Object.entries(files).map(([path]) => read(root, path)),
      before,
    )
  }
})

test('every other refusal exits 2, never 1, and creates nothing', t => {
  const root = tempRepo(t, FILES)
  const cases: [string[], RegExp][] = [
    [['--owner', '@me', '--from-codeowners'], /^ownership: --owner and --from-codeowners cannot be used together; pick one mode\n$/],
    [['--owner', 'me'], /^ownership: --owner must start with "@"; got "me"\n$/],
    [
      ['--from-codeowners'],
      /^ownership: --from-codeowners needs a CODEOWNERS, and the repository has none in \.github\/CODEOWNERS, CODEOWNERS, docs\/CODEOWNERS\n$/,
    ],
    [['--ownership', '../own.yml'], /^ownership: --ownership "\.\.\/own\.yml" is outside the repository; the root ownership file lives inside it\n$/],
    [['--ownership', 'docs'], /^ownership: --ownership "docs" is a directory; name the file to create\n$/],
    [['--force'], /^ownership: Unknown option '--force'/],
    [['--owner'], /^ownership: /],
  ]

  for (const [args, message] of cases) {
    const result = runCli(['init', ...args], { cwd: root })

    assert.equal(result.status, 2, args.join(' '))
    assert.equal(result.stdout, '')
    assert.match(result.stderr, message)
    assert.equal(existsSync(join(root, '.ownership.yml')), false)
  }
})

test('outside a Git work tree, init exits 2', t => {
  const result = runCli(['init', '--owner', '@me'], { cwd: tempRepo(t, FILES, { git: false }) })

  assert.equal(result.status, 2)
  assert.match(result.stderr, /is not inside a Git work tree; ownership init needs one\n$/)
})

test('more than one CODEOWNERS refuses --from-codeowners but not the skeleton', t => {
  const root = tempRepo(t, { ...FILES, '.github/CODEOWNERS': '* @a\n' }, { codeowners: '* @b\n' })
  const derived = runCli(['init', '--from-codeowners'], { cwd: root })

  assert.equal(derived.status, 2)
  assert.match(derived.stderr, /more than one CODEOWNERS: \.github\/CODEOWNERS, CODEOWNERS/)
  assert.equal(runCli(['init'], { cwd: root }).status, 0)
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/cli/init.test.ts`
Expected: FAIL — every run exits 2 with `ownership: unknown command "init"`.

- [ ] **Step 3: Write the command**

`plugins/ownership/plugin/src/cli/init.ts`:

```ts
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { CODEOWNERS_LOCATIONS, findCodeowners, loadCodeowners } from '../codeowners/locate.ts'
import { deriveInit, markerFiles } from '../init/derive.ts'
import type { InitMode, InitPlan } from '../init/derive.ts'
import { renderOwnershipFile } from '../init/render.ts'
import { normalizePath, toPosix } from '../paths/paths.ts'
import { isInsideWorkTree, listRepoFiles } from '../repo/repo.ts'
import { ROOT_CANDIDATES } from '../resolve/load.ts'
import type { Io } from './main.ts'
import { USAGE, UsageError } from './usage.ts'

const DEFAULT_TARGET = ROOT_CANDIDATES[0]

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/** The target as the repository names it. It lives inside the repository, and it is a file. */
function targetPath(root: string, given: string): string {
  const absolute = resolve(root, given)
  const fromRoot = relative(root, absolute)

  if (fromRoot === '' || fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    throw new UsageError(`--ownership "${given}" is outside the repository; the root ownership file lives inside it`)
  }

  if (/[\\/]$/.test(given) || isDirectory(absolute)) {
    throw new UsageError(`--ownership "${given}" is a directory; name the file to create`)
  }

  return normalizePath(toPosix(fromRoot))
}

/** For the hint of skeleton mode only: two CODEOWNERS are for `validate` to report, not a reason to refuse a skeleton. */
function hasCodeowners(root: string): boolean {
  try {
    return findCodeowners(root) !== null
  } catch {
    return true
  }
}

function summary(target: string, plan: InitPlan, written: boolean, codeownersHint: boolean): string {
  const entries = plural(plan.entries.length, 'entry', 'entries')
  const lines = [written ? `ownership: wrote ${target} with ${entries}.` : `ownership: printed ${target} with ${entries}; nothing was written.`]

  if (plan.leftOut.length > 0) {
    lines.push(
      `ownership: left out ${plural(plan.leftOut.length, 'path', 'paths')} an ownership file cannot declare: ${plan.leftOut.map(item => item.path).join(', ')}`,
    )
  }

  lines.push(
    plan.unowned === 0
      ? 'ownership: every repository file has an owner.'
      : `ownership: ${plural(plan.unowned, 'repository file has', 'repository files have')} no owner.`,
  )

  if (plan.mode === 'skeleton' || plan.unowned > 0) {
    lines.push('ownership: declare every path in owned[]; "ownership validate" fails on purpose until every file has an owner.')
  }

  if (codeownersHint) {
    lines.push('ownership: this repository has a CODEOWNERS; "ownership init --from-codeowners" derives the entries from it.')
  }

  lines.push('ownership: next step: ownership validate')

  return `${lines.join('\n')}\n`
}

/**
 * Creates the root ownership file and never overwrites one: an owner already
 * written down is a decision, and starting over is a deletion somebody makes
 * by hand. It produces no finding, so it exits 0 or 2 and never 1.
 */
export function initCommand(args: readonly string[], root: string, io: Io): number {
  const { values } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      owner: { type: 'string' },
      'from-codeowners': { type: 'boolean' },
      stdout: { type: 'boolean' },
      ownership: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (values.help === true) {
    io.stdout(USAGE)

    return 0
  }

  if (!isInsideWorkTree(root)) {
    throw new UsageError(`${toPosix(root)} is not inside a Git work tree; ownership init needs one`)
  }

  const target = targetPath(root, values.ownership ?? DEFAULT_TARGET)
  const existing = [...new Set([target, ...ROOT_CANDIDATES])].filter(candidate => existsSync(resolve(root, candidate)))

  if (existing.length > 0) {
    throw new UsageError(`${existing.join(' and ')} already ${existing.length === 1 ? 'exists' : 'exist'}; ownership init never overwrites an ownership file`)
  }

  if (values.owner !== undefined && values['from-codeowners'] === true) {
    throw new UsageError('--owner and --from-codeowners cannot be used together; pick one mode')
  }

  if (values.owner !== undefined && !values.owner.startsWith('@')) {
    throw new UsageError(`--owner must start with "@"; got "${values.owner}"`)
  }

  let mode: InitMode = { kind: 'skeleton' }

  if (values.owner !== undefined) {
    mode = { kind: 'owner', owner: values.owner }
  } else if (values['from-codeowners'] === true) {
    const codeowners = loadCodeowners(root)

    if (codeowners === null) {
      throw new UsageError(`--from-codeowners needs a CODEOWNERS, and the repository has none in ${CODEOWNERS_LOCATIONS.join(', ')}`)
    }

    mode = { kind: 'codeowners', codeowners }
  }

  // The file about to be created counts as a repository file, so it is born with an owner.
  const repoFiles = new Set([...listRepoFiles(root), target].sort())
  const plan = deriveInit(repoFiles, mode)
  const text = renderOwnershipFile(plan, markerFiles(root, repoFiles))
  const report = summary(target, plan, values.stdout !== true, mode.kind === 'skeleton' && hasCodeowners(root))

  if (values.stdout === true) {
    io.stdout(text)
    io.stderr(report)

    return 0
  }

  mkdirSync(dirname(resolve(root, target)), { recursive: true })
  writeFileSync(resolve(root, target), text, { flag: 'wx' })
  io.stdout(report)

  return 0
}
```

- [ ] **Step 4: Add the command to the CLI**

In `plugins/ownership/plugin/src/cli/main.ts`, add the import after the one of `explainCommand`:

```ts
import { initCommand } from './init.ts'
```

and the case after `explain`:

```ts
      case 'explain':
        return explainCommand(args, root, io)
      case 'init':
        return initCommand(args, root, io)
```

- [ ] **Step 5: Run it to see it pass**

Run: `node --test test/cli/init.test.ts test/cli/main.test.ts`
Expected: PASS (13 + 3 tests). On a file system that does not tell `Docs/` from `docs/` (Windows, macOS), the case test reports SKIP.

- [ ] **Step 6: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/cli plugins/ownership/test/cli/init.test.ts
git commit -m "feat(ownership): ownership init creates the root ownership file

It never overwrites one, never picks an owner nobody named, and counts
the file it creates as a repository file, so that file is born covered.

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: The JSON Schema and its corpus

**Files:**
- Create: `plugins/ownership/plugin/ownership.schema.json`
- Test: `plugins/ownership/test/schema/json-schema.test.ts`

**Interfaces:**
- Consumes: `parseOwnershipFile` (Task 4), `SCHEMA_URL` (Task 16), `PLUGIN_ROOT` (Task 2), `ajv` and `yaml` from `node_modules`.
- Produces: `ownership.schema.json`, draft 2020-12, with `$id` equal to `SCHEMA_URL`. It is written by hand. The test runs one corpus of ownership files through the schema and through the loader, and both must give the same verdict on each one: that is what keeps the two in agreement when either changes.
- The schema describes a root file, so it allows `plugins`. What depends on more than one file or on the repository — relations between paths, includes, the base, `plugins` in an included file — stays with the loader, and the corpus holds no such case.

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/schema/json-schema.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Ajv2020 } from 'ajv/dist/2020.js'
import { parse } from 'yaml'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { SCHEMA_URL } from '../../plugin/src/init/render.ts'
import { parseOwnershipFile } from '../../plugin/src/schema/parse.ts'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const schema = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'ownership.schema.json'), 'utf8')) as Record<string, unknown>
const validate = new Ajv2020({ allErrors: true }).compile(schema)

/** Ownership files a root file may be, and the same files broken in one way the schema can express. */
const VALID: Record<string, string> = {
  'only the version': 'version: 1\n',
  'every key': [
    'version: 1',
    'basePath: sub/',
    'plugins:',
    '  docs-kit: {}',
    '  other-kit:',
    '    anything: [1, { goes: true }]',
    'owned:',
    '  - path: docs/',
    "    owner: '@org/team'",
    '    skill: docs-keeper',
    '    plugins:',
    '      docs-kit:',
    '        id-prefix: ADR',
    '      other-kit: {}',
    '  - path: src/a b.ts',
    "    owner: '@me'",
    'generated:',
    '  - path: docs/api.md',
    '    command: node gen.mjs',
    'ignore:',
    '  - docs/vendor/',
    'include:',
    '  - plugins/x/',
    '  - plugins/y/.ownership.yml',
    '',
  ].join('\n'),
  'empty lists': 'version: 1\nowned: []\ngenerated: []\nignore: []\ninclude: []\nplugins: {}\n',
  'a path with dots, dashes and accents': "version: 1\nowned:\n  - path: ./docs/ação-1.md\n    owner: '@a'\n",
}

const INVALID: Record<string, string> = {
  'an empty file': '',
  'a list at the top': '- version: 1\n',
  'no version': 'owned: []\n',
  'version 2': 'version: 2\n',
  'version as text': "version: '1'\n",
  'an unknown top-level key': 'version: 1\nwatches: []\n',
  'a $schema key': 'version: 1\n$schema: https://example.com/schema.json\n',
  'owned that is not a list': 'version: 1\nowned:\n  path: docs/\n',
  'owned with no value': 'version: 1\nowned:\n',
  'an owned entry that is not a map': 'version: 1\nowned:\n  - docs/\n',
  'an owned entry without path': "version: 1\nowned:\n  - owner: '@a'\n",
  'an owned entry without owner': 'version: 1\nowned:\n  - path: docs/\n',
  'an owner without @': 'version: 1\nowned:\n  - path: docs/\n    owner: team\n',
  'an owner that is not text': 'version: 1\nowned:\n  - path: docs/\n    owner: 12\n',
  'an empty path': "version: 1\nowned:\n  - path: ''\n    owner: '@a'\n",
  'an empty skill': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    skill: ''\n",
  'an unknown key in an owned entry': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    states: [draft]\n",
  'a glob in an owned path': "version: 1\nowned:\n  - path: docs/*.md\n    owner: '@a'\n",
  'a question mark in an owned path': "version: 1\nowned:\n  - path: docs/?.md\n    owner: '@a'\n",
  'a bracket in an owned path': "version: 1\nowned:\n  - path: 'docs/[ab].md'\n    owner: '@a'\n",
  'a negation in an owned path': "version: 1\nowned:\n  - path: '!docs/'\n    owner: '@a'\n",
  'a leading slash in an owned path': "version: 1\nowned:\n  - path: /docs/\n    owner: '@a'\n",
  'a generated path that is a directory': 'version: 1\ngenerated:\n  - path: out/\n    command: gen\n',
  'a generated entry without command': 'version: 1\ngenerated:\n  - path: out.md\n',
  'a generated entry with an empty command': "version: 1\ngenerated:\n  - path: out.md\n    command: ''\n",
  'an unknown key in a generated entry': "version: 1\ngenerated:\n  - path: out.md\n    command: gen\n    owner: '@a'\n",
  'a glob in a generated path': 'version: 1\ngenerated:\n  - path: out/*.md\n    command: gen\n',
  'a glob in ignore': "version: 1\nignore:\n  - '**/node_modules/'\n",
  'an ignore item that is not text': 'version: 1\nignore:\n  - 12\n',
  'an empty include item': "version: 1\ninclude:\n  - ''\n",
  'basePath that is not text': 'version: 1\nbasePath: [sub]\n',
  'plugins as a list': 'version: 1\nplugins: [docs-kit]\n',
  'a plugin name outside the pattern': 'version: 1\nplugins:\n  Docs_Kit: {}\n',
  'a global plugin block that is not a map': 'version: 1\nplugins:\n  docs-kit: true\n',
  'an entry plugin block that is null': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    plugins:\n      docs-kit:\n",
  'an entry plugin block that is a list': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    plugins:\n      docs-kit: []\n",
  'an entry plugin name outside the pattern': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    plugins:\n      2fast: {}\n",
}

function loads(text: string): boolean {
  try {
    parseOwnershipFile(text, '.ownership.yml', { isRoot: true })

    return true
  } catch (error) {
    assert.ok(error instanceof OwnershipError, `expected a load error, got ${String(error)}`)

    return false
  }
}

test('the schema is draft 2020-12 and is published at the URL the init comment points at', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
  assert.equal(schema.$id, SCHEMA_URL)
})

test('every object of the core is closed, and a plugin block is any object', () => {
  const defs = schema.$defs as Record<string, Record<string, unknown>>

  assert.equal(schema.additionalProperties, false)
  assert.equal(defs.owned?.additionalProperties, false)
  assert.equal(defs.generated?.additionalProperties, false)
  assert.deepEqual(defs.pluginBlocks?.propertyNames, { pattern: '^[a-z][a-z0-9-]*$' })
  assert.deepEqual(defs.pluginBlocks?.additionalProperties, { type: 'object' })
})

for (const [name, text] of Object.entries(VALID)) {
  test(`the schema and the loader both accept ${name}`, () => {
    assert.equal(validate(parse(text)), true, JSON.stringify(validate.errors))
    assert.equal(loads(text), true)
  })
}

for (const [name, text] of Object.entries(INVALID)) {
  test(`the schema and the loader both reject ${name}`, () => {
    assert.equal(validate(parse(text)), false)
    assert.equal(loads(text), false)
  })
}

test('the package ships the schema', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package.json'), 'utf8')) as { files: string[] }

  assert.ok(manifest.files.includes('ownership.schema.json'))
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/schema/json-schema.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../plugin/ownership.schema.json'`.

- [ ] **Step 3: Write the schema**

`plugins/ownership/plugin/ownership.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json",
  "title": "Ownership file",
  "description": "Who owns each path of a repository and which files are generated. What depends on more than one file or on the repository - how declared paths relate, includes, the base of each file - is checked by `ownership validate`, not by this schema.",
  "type": "object",
  "additionalProperties": false,
  "required": ["version"],
  "properties": {
    "version": {
      "description": "The schema version. This release supports 1.",
      "const": 1
    },
    "plugins": {
      "description": "Global configuration per plugin. Root file only. It links no path: only an entry of `owned` does.",
      "$ref": "#/$defs/pluginBlocks"
    },
    "basePath": {
      "description": "A directory below the directory of this file; the paths of the file are relative to it. Ignored in the root file, whose base is the repository root.",
      "type": "string"
    },
    "owned": {
      "description": "The owner of each path. Paths are disjoint: none repeats or contains another.",
      "type": "array",
      "items": { "$ref": "#/$defs/owned" }
    },
    "generated": {
      "description": "Files produced by a command. Each one sits under an `owned` entry.",
      "type": "array",
      "items": { "$ref": "#/$defs/generated" }
    },
    "ignore": {
      "description": "Paths left out of owner coverage.",
      "type": "array",
      "items": { "$ref": "#/$defs/path" }
    },
    "include": {
      "description": "Other ownership files to read: a file, or a directory (trailing `/`) that holds exactly one.",
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    }
  },
  "$defs": {
    "path": {
      "description": "A literal path relative to the base of the file: no glob, no negation, no leading `/`. A trailing `/` means a directory.",
      "type": "string",
      "pattern": "^(?!/)[^*?\\[!]+$"
    },
    "filePath": {
      "description": "A literal path of a file relative to the base of the file: no glob, no negation, no leading or trailing `/`.",
      "type": "string",
      "pattern": "^(?!/)[^*?\\[!]*[^*?\\[!/]$"
    },
    "pluginBlocks": {
      "description": "Plugin name to block. The content of a block belongs to the plugin.",
      "type": "object",
      "propertyNames": { "pattern": "^[a-z][a-z0-9-]*$" },
      "additionalProperties": { "type": "object" }
    },
    "owned": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path", "owner"],
      "properties": {
        "path": { "$ref": "#/$defs/path" },
        "owner": {
          "description": "A user or a team, as in CODEOWNERS: `@user` or `@org/team`.",
          "type": "string",
          "pattern": "^@"
        },
        "skill": {
          "description": "The skill that answers for the path.",
          "type": "string",
          "minLength": 1
        },
        "plugins": {
          "description": "The plugins this path belongs to. `name: {}` links the path without configuration.",
          "$ref": "#/$defs/pluginBlocks"
        }
      }
    },
    "generated": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path", "command"],
      "properties": {
        "path": { "$ref": "#/$defs/filePath" },
        "command": {
          "description": "Run at the repository root; what it prints must equal the file.",
          "type": "string",
          "minLength": 1
        }
      }
    }
  }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node --test test/schema/json-schema.test.ts`
Expected: PASS (44 tests: 4 valid and 37 invalid files of the corpus, plus 3). When a case fails on one side only, the schema and the loader disagree: correct the one that departs from the requirements, never the corpus.

- [ ] **Step 5: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/ownership.schema.json plugins/ownership/test/schema/json-schema.test.ts
git commit -m "feat(ownership): publish a JSON Schema of the ownership file

A corpus of valid and invalid files goes through the schema and through
the loader, and both must agree on each one.

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: The `generated-guard` hook

**Files:**
- Create: `plugins/ownership/plugin/src/hooks/paths.ts`
- Create: `plugins/ownership/plugin/src/hooks/io.ts`
- Create: `plugins/ownership/plugin/src/hooks/generated-guard.ts`
- Create: `plugins/ownership/plugin/src/hooks/main.ts`
- Create: `plugins/ownership/plugin/hooks/hooks.json`
- Create: `plugins/ownership/plugin/hooks/run-hook.sh` (mode `100755`)
- Create: `plugins/ownership/test/helpers/hook.ts`
- Test: `plugins/ownership/test/hooks/paths.test.ts`
- Test: `plugins/ownership/test/hooks/generated-guard.test.ts`
- Test: `plugins/ownership/test/hooks/run-hook.test.ts`

**Interfaces:**
- Consumes: `resolveOwnership` with `prune` (Task 8), `findGeneratedRule`, `deepestOwnershipFile` (Task 8), `isGeneratedByMarker`, `readHead` (Task 10), `normalizePath`, `toPosix` (Task 3).
- Produces:
  - `toRepoPath(filePath: string, roots: readonly string[]): string | null` (`hooks/paths.ts`) — repository-relative with `/` and NFC, or `null` outside every root; backslashes normalized; the root prefix compared without regard to case; a relative path is taken as already relative to the repository.
  - `readStdin(): Promise<string>`, `denyOutput(reason: string): string` (`hooks/io.ts`)
  - `interface HookEnv { readonly root: string; readonly hostRoot?: string }`, `type Decision = { readonly action: 'allow' } | { readonly action: 'deny'; readonly reason: string }`, `decideGeneratedGuard(payload: unknown, env: HookEnv): Decision` (`hooks/generated-guard.ts`) — never throws: anything that keeps it from judging allows.
  - `hooks/main.ts` — the entry point: `node src/hooks/main.ts generated-guard`, payload on stdin, the repository in `CLAUDE_PROJECT_DIR`, the extra root in `OWNERSHIP_HOST_ROOT`; it ends itself after 5 s and always exits 0.
  - `hooks/run-hook.sh <hook>` — silent and exit 0 without node, on a timeout, on any error, and for any output that is not JSON.
  - Test helpers `bashExecutable(): string | null` and `runHook(bash, hook, payload, { project, input?, env?, pluginRoot? })` (`test/helpers/hook.ts`); Task 21 reuses them with `pluginRoot`.

- [ ] **Step 1: Write the test helper and the failing tests**

`plugins/ownership/test/helpers/hook.ts`:

```ts
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, sep } from 'node:path'

import { PLUGIN_ROOT } from './roots.ts'

/**
 * The bash that runs the hooks, by its full path so that a test can empty the
 * PATH. On Windows, the `bash` on PATH may be the WSL one; the host runs hooks
 * with the Git for Windows one.
 */
export function bashExecutable(): string | null {
  if (process.platform !== 'win32') {
    return existsSync('/bin/bash') ? '/bin/bash' : 'bash'
  }

  const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')

  return existsSync(candidate) ? candidate : null
}

export interface HookRun {
  status: number | null
  stdout: string
  stderr: string
}

export interface HookOptions {
  /** The session's project directory. */
  project: string
  /** Raw text for stdin instead of the payload as JSON. */
  input?: string
  env?: NodeJS.ProcessEnv
  /** The plugin directory to run the wrapper from (default: the one of this project). */
  pluginRoot?: string
}

/** Runs the hooks wrapper as the host does: through bash, with the payload on stdin. */
export function runHook(bash: string, hook: string, payload: unknown, options: HookOptions): HookRun {
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: options.project }

  delete env.OWNERSHIP_HOST_ROOT
  delete env.OWNERSHIP_CONFIG
  delete env.NODE_OPTIONS
  Object.assign(env, options.env)

  const script = join(options.pluginRoot ?? PLUGIN_ROOT, 'hooks', 'run-hook.sh')
    .split(sep)
    .join('/')
  const result = spawnSync(bash, [script, hook], { cwd: options.project, env, input: options.input ?? JSON.stringify(payload), encoding: 'utf8' })

  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}
```

`plugins/ownership/test/hooks/paths.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { toRepoPath } from '../../plugin/src/hooks/paths.ts'

test('an absolute path under the root becomes relative to it', () => {
  assert.equal(toRepoPath('/work/proj/docs/a.md', ['/work/proj']), 'docs/a.md')
  assert.equal(toRepoPath('/work/proj/docs/a.md', ['/work/proj/']), 'docs/a.md')
  assert.equal(toRepoPath('/work/proj/docs/../src//a.ts', ['/work/proj']), 'src/a.ts')
})

test('backslashes are normalized and the drive letter may differ in case', () => {
  assert.equal(toRepoPath('C:\\Users\\Dan\\proj\\docs\\a.md', ['C:\\Users\\Dan\\proj']), 'docs/a.md')
  assert.equal(toRepoPath('c:\\users\\dan\\proj\\docs\\a.md', ['C:\\Users\\Dan\\proj']), 'docs/a.md')
  assert.equal(toRepoPath('c:/Users/Dan/proj/docs/a.md', ['C:\\Users\\Dan\\proj\\']), 'docs/a.md')
})

test('only the root prefix ignores case: the path inside the repository keeps its own', () => {
  assert.equal(toRepoPath('/WORK/Proj/Docs/A.md', ['/work/proj']), 'Docs/A.md')
})

test('a second root is accepted, in the order given', () => {
  assert.equal(toRepoPath('/host/proj/out.md', ['/workspace', '/host/proj']), 'out.md')
})

test('a path outside every root, or the root itself, is no repository path', () => {
  assert.equal(toRepoPath('/work/other/a.md', ['/work/proj']), null)
  assert.equal(toRepoPath('/work/proj-two/a.md', ['/work/proj']), null)
  assert.equal(toRepoPath('/work/proj/../other/a.md', ['/work/proj']), null)
  assert.equal(toRepoPath('/work/proj', ['/work/proj']), null)
  assert.equal(toRepoPath('D:\\proj\\a.md', ['C:\\proj']), null)
})

test('a relative path is already relative to the repository, unless it leaves it', () => {
  assert.equal(toRepoPath('docs\\a.md', ['/work/proj']), 'docs/a.md')
  assert.equal(toRepoPath('./docs/a.md', ['/work/proj']), 'docs/a.md')
  assert.equal(toRepoPath('../a.md', ['/work/proj']), null)
  assert.equal(toRepoPath('docs/../../a.md', ['/work/proj']), null)
})

test('a decomposed name comes back in NFC', () => {
  assert.equal(toRepoPath('/work/proj/cafe\u0301.md', ['/work/proj']), 'caf\u00e9.md')
})
```

`plugins/ownership/test/hooks/generated-guard.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

import { decideGeneratedGuard } from '../../plugin/src/hooks/generated-guard.ts'
import type { Decision } from '../../plugin/src/hooks/generated-guard.ts'
import { tempRepo } from '../helpers/repo.ts'

const OWNERSHIP = [
  'version: 1',
  'owned:',
  '  - path: .ownership.yml',
  "    owner: '@a'",
  '  - path: docs/',
  "    owner: '@a'",
  'generated:',
  '  - path: docs/api.md',
  '    command: node tools/gen.mjs',
  '',
].join('\n')

const FILES = { '.ownership.yml': OWNERSHIP, 'docs/api.md': 'api\n', 'docs/guide.md': '# Guide\n', 'docs/marked.md': '<!-- GENERATED: DO NOT EDIT -->\nbody\n' }

const DECLARED =
  'docs/api.md is a generated file, declared in .ownership.yml:8: do not edit it by hand. Change what it is generated from and run: node tools/gen.mjs > docs/api.md'

function decide(root: string, tool: string, input: Record<string, unknown>, hostRoot?: string): Decision {
  return decideGeneratedGuard({ tool_name: tool, tool_input: input }, hostRoot === undefined ? { root } : { root, hostRoot })
}

function reasonOf(decision: Decision): string {
  assert.equal(decision.action, 'deny')

  return decision.action === 'deny' ? decision.reason : ''
}

test('a file declared in generated[] is denied, naming where it is declared and its command', t => {
  const root = tempRepo(t, FILES)

  assert.equal(reasonOf(decide(root, 'Edit', { file_path: join(root, 'docs', 'api.md') })), DECLARED)
})

test('every file tool is judged, by file_path or by notebook_path', t => {
  const root = tempRepo(t, FILES)

  for (const tool of ['Edit', 'Write', 'MultiEdit']) {
    assert.equal(decide(root, tool, { file_path: join(root, 'docs', 'api.md') }).action, 'deny', tool)
  }

  assert.equal(decide(root, 'NotebookEdit', { notebook_path: join(root, 'docs', 'api.md') }).action, 'deny')
})

test('a declared file is denied even before it exists', t => {
  const root = tempRepo(t, { '.ownership.yml': OWNERSHIP, 'docs/guide.md': '' })

  assert.equal(reasonOf(decide(root, 'Write', { file_path: join(root, 'docs', 'api.md'), content: 'x' })), DECLARED)
})

test('a file whose first line carries the marker is denied, asking to declare it', t => {
  const root = tempRepo(t, FILES)

  assert.equal(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'docs', 'marked.md') })),
    'docs/marked.md carries the "generated: do not edit" marker on its first line: do not edit it by hand. Declare it in generated[] of .ownership.yml with the command that produces it.',
  )
})

test('an ordinary file is allowed', t => {
  const root = tempRepo(t, FILES)

  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'docs', 'guide.md') }), { action: 'allow' })
  assert.deepEqual(decide(root, 'Write', { file_path: join(root, 'docs', 'new.md'), content: '# New\n' }), { action: 'allow' })
})

test('a Write whose content carries the marker is denied, whether or not the file exists', t => {
  const root = tempRepo(t, FILES)
  const content = '<!-- generated: do not edit -->\nbody\n'

  assert.equal(
    reasonOf(decide(root, 'Write', { file_path: join(root, 'docs', 'new.md'), content })),
    'The content for docs/new.md carries the "generated: do not edit" marker: a generated file is not written by hand. Declare docs/new.md in generated[] of .ownership.yml and produce it with: <command> > docs/new.md',
  )
  assert.equal(decide(root, 'Write', { file_path: join(root, 'docs', 'guide.md'), content }).action, 'deny')
})

test('a Write into a directory that does not exist yet is still judged by the payload path', t => {
  const root = tempRepo(t, FILES)
  const file = join(root, 'not', 'yet', 'there', 'out.md')

  assert.match(reasonOf(decide(root, 'Write', { file_path: file, content: 'generated: do not edit\n' })), /^The content for not\/yet\/there\/out\.md carries/)
  assert.deepEqual(decide(root, 'Write', { file_path: file, content: 'plain\n' }), { action: 'allow' })
})

test('a Write of a declared file gets the message that names the command, marker or not', t => {
  const root = tempRepo(t, FILES)

  assert.equal(reasonOf(decide(root, 'Write', { file_path: join(root, 'docs', 'api.md'), content: 'generated: do not edit\n' })), DECLARED)
})

test('an Edit that introduces the marker into a file without it is not judged by its new text', t => {
  const root = tempRepo(t, FILES)

  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'docs', 'guide.md'), old_string: '# Guide', new_string: 'generated: do not edit' }), {
    action: 'allow',
  })
})

test('the payload path may be relative, use backslashes or come under the host root', t => {
  const root = tempRepo(t, FILES)

  assert.equal(decide(root, 'Edit', { file_path: 'docs/api.md' }).action, 'deny')
  assert.equal(decide(root, 'Edit', { file_path: 'docs\\api.md' }).action, 'deny')
  assert.equal(decide(root, 'Edit', { file_path: '/host/checkout/docs/api.md' }, '/host/checkout').action, 'deny')
  assert.equal(decide(root, 'Edit', { file_path: 'C:\\Host\\Checkout\\docs\\api.md' }, 'c:\\host\\checkout').action, 'deny')
})

test('a path outside the roots, or a payload without a path, is allowed', t => {
  const root = tempRepo(t, FILES)

  assert.deepEqual(decide(root, 'Edit', { file_path: '/somewhere/else/docs/api.md' }), { action: 'allow' })
  assert.deepEqual(decide(root, 'Edit', { file_path: '/host/checkout/docs/api.md' }), { action: 'allow' })
  assert.deepEqual(decide(root, 'Edit', {}), { action: 'allow' })
  assert.deepEqual(decide(root, 'Edit', { file_path: 12 }), { action: 'allow' })
  assert.deepEqual(decideGeneratedGuard(null, { root }), { action: 'allow' })
  assert.deepEqual(decideGeneratedGuard('text', { root }), { action: 'allow' })
  assert.deepEqual(decideGeneratedGuard({ tool_name: 'Edit', tool_input: [] }, { root }), { action: 'allow' })
})

test('a link to a generated file is denied: the path behind the link is judged too', t => {
  const root = tempRepo(t, FILES)

  try {
    symlinkSync(join(root, 'docs', 'api.md'), join(root, 'docs', 'alias.md'), 'file')
    symlinkSync(join(root, 'docs', 'marked.md'), join(root, 'docs', 'alias-marked.md'), 'file')
  } catch {
    t.skip('this machine cannot create symbolic links; CI (ubuntu) runs this proof')

    return
  }

  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'docs', 'alias.md') })),
    /^docs\/alias\.md is a generated file, declared in \.ownership\.yml:8/,
  )
  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'docs', 'alias-marked.md') })),
    /^docs\/alias-marked\.md carries the "generated: do not edit" marker/,
  )
})

test('a path through a linked directory is judged by where it really is', t => {
  const root = tempRepo(t, FILES)

  // A junction needs no privilege on Windows; elsewhere this is an ordinary directory link.
  symlinkSync(join(root, 'docs'), join(root, 'manual'), process.platform === 'win32' ? 'junction' : 'dir')

  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'manual', 'api.md') })),
    /^manual\/api\.md is a generated file, declared in \.ownership\.yml:8/,
  )
  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'manual', 'marked.md') })),
    /^manual\/marked\.md carries the "generated: do not edit" marker/,
  )
  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'manual', 'guide.md') }), { action: 'allow' })
})

test('a link that leads outside the repository is judged by the payload path alone', t => {
  const root = tempRepo(t, FILES)
  const outside = tempRepo(t, { 'marked.md': 'generated: do not edit\n' }, { git: false })

  try {
    symlinkSync(join(outside, 'marked.md'), join(root, 'docs', 'out-link.md'), 'file')
  } catch {
    t.skip('this machine cannot create symbolic links; CI (ubuntu) runs this proof')

    return
  }

  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'docs', 'out-link.md') }), { action: 'allow' })
})

test('without an ownership file, or with one that does not load, the guard is silent', t => {
  const none = tempRepo(t, { 'docs/marked.md': 'generated: do not edit\n' })
  const broken = tempRepo(t, { '.ownership.yml': 'version: 2\n', 'docs/marked.md': 'generated: do not edit\n' })
  const noGit = tempRepo(t, FILES, { git: false })

  assert.deepEqual(decide(none, 'Edit', { file_path: join(none, 'docs', 'marked.md') }), { action: 'allow' })
  assert.deepEqual(decide(broken, 'Edit', { file_path: join(broken, 'docs', 'marked.md') }), { action: 'allow' })
  assert.deepEqual(decide(noGit, 'Edit', { file_path: join(noGit, 'docs', 'api.md') }), { action: 'allow' })
})

test('only the includes that can hold the path are read: a broken one elsewhere does not silence the guard', t => {
  const root = tempRepo(t, {
    ...FILES,
    '.ownership.yml': `${OWNERSHIP}include:\n  - plugins/x/\n  - plugins/y/\n`,
    'plugins/x/.ownership.yml': 'version: 2\n',
    'plugins/y/.ownership.yml': "version: 1\nowned:\n  - path: out/\n    owner: '@y'\ngenerated:\n  - path: out/gen.md\n    command: make gen\n",
  })

  assert.equal(decide(root, 'Edit', { file_path: join(root, 'docs', 'api.md') }).action, 'deny')
  assert.equal(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'plugins', 'y', 'out', 'gen.md') })),
    'plugins/y/out/gen.md is a generated file, declared in plugins/y/.ownership.yml:6: do not edit it by hand. Change what it is generated from and run: make gen > plugins/y/out/gen.md',
  )
  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'plugins', 'x', 'a.md') }), { action: 'allow' })
  assert.equal(existsSync(join(root, 'plugins', 'x', '.ownership.yml')), true)
})

test('a marker file inside an included base is to be declared in that ownership file', t => {
  const root = tempRepo(t, {
    '.ownership.yml': 'version: 1\ninclude:\n  - plugins/y/\n',
    'plugins/y/.ownership.yml': 'version: 1\n',
    'plugins/y/gen.md': 'generated: do not edit\n',
  })

  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'plugins', 'y', 'gen.md') })),
    /Declare it in generated\[\] of plugins\/y\/\.ownership\.yml /,
  )
})
```

`plugins/ownership/test/hooks/run-hook.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { bashExecutable, runHook } from '../helpers/hook.ts'
import { tempRepo } from '../helpers/repo.ts'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const OWNERSHIP = "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\ngenerated:\n  - path: docs/api.md\n    command: node tools/gen.mjs\n"
const FILES = { '.ownership.yml': OWNERSHIP, 'docs/api.md': 'api\n', 'docs/guide.md': '# Guide\n' }

const bash = bashExecutable()
const skip = bash === null ? 'no Git for Windows bash on this machine; CI (ubuntu) runs this proof' : false

function edit(root: string, file: string): unknown {
  return { tool_name: 'Edit', tool_input: { file_path: join(root, ...file.split('/')) } }
}

test('the hook is registered before every file tool, through the wrapper', () => {
  const hooks = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'hooks', 'hooks.json'), 'utf8')) as {
    hooks: Record<string, { matcher: string; hooks: { type: string; command: string }[] }[]>
  }

  assert.deepEqual(Object.keys(hooks.hooks), ['PreToolUse'])
  assert.equal(hooks.hooks.PreToolUse?.length, 1)
  assert.equal(hooks.hooks.PreToolUse?.[0]?.matcher, 'Edit|Write|MultiEdit|NotebookEdit')
  assert.deepEqual(
    hooks.hooks.PreToolUse?.[0]?.hooks.map(hook => [hook.type, hook.command]),
    [['command', '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh" generated-guard']],
  )
})

test('editing a generated file prints one deny decision and exits 0', { skip }, t => {
  const root = tempRepo(t, FILES)
  const run = runHook(bash ?? '', 'generated-guard', edit(root, 'docs/api.md'), { project: root })

  assert.equal(run.status, 0, run.stderr)
  assert.deepEqual(JSON.parse(run.stdout), {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'docs/api.md is a generated file, declared in .ownership.yml:6: do not edit it by hand. Change what it is generated from and run: node tools/gen.mjs > docs/api.md',
    },
  })
})

test('a payload path under the host root is judged against the project directory', { skip }, t => {
  const root = tempRepo(t, FILES)
  // A root in the form of the platform: on Windows, bash rewrites a POSIX-looking value before node sees it.
  const hostRoot = process.platform === 'win32' ? 'C:\\Host\\Checkout' : '/host/checkout'
  const payload = {
    tool_name: 'Edit',
    tool_input: { file_path: process.platform === 'win32' ? 'c:\\host\\checkout\\docs\\api.md' : '/host/checkout/docs/api.md' },
  }

  assert.equal(runHook(bash ?? '', 'generated-guard', payload, { project: root }).stdout, '')
  assert.match(runHook(bash ?? '', 'generated-guard', payload, { project: root, env: { OWNERSHIP_HOST_ROOT: hostRoot } }).stdout, /"permissionDecision":"deny"/)
})

test('the hook is silent and exits 0 whenever it has nothing to deny or cannot judge', { skip }, t => {
  const root = tempRepo(t, FILES)
  const broken = tempRepo(t, { ...FILES, '.ownership.yml': 'version: 2\n' })
  const empty = tempRepo(t, { 'docs/api.md': '' })
  const runs = [
    runHook(bash ?? '', 'generated-guard', edit(root, 'docs/guide.md'), { project: root }),
    runHook(bash ?? '', 'generated-guard', edit(broken, 'docs/api.md'), { project: broken }),
    runHook(bash ?? '', 'generated-guard', edit(empty, 'docs/api.md'), { project: empty }),
    runHook(bash ?? '', 'generated-guard', null, { project: root, input: 'this is not JSON' }),
    runHook(bash ?? '', 'generated-guard', null, { project: root, input: '' }),
    runHook(bash ?? '', 'no-such-hook', edit(root, 'docs/api.md'), { project: root }),
    runHook(bash ?? '', '', edit(root, 'docs/api.md'), { project: root }),
  ]

  for (const run of runs) {
    assert.equal(run.status, 0)
    assert.equal(run.stdout, '')
  }
})

test('without node on the PATH, the wrapper is silent and exits 0', { skip }, t => {
  const root = tempRepo(t, FILES)
  const run = runHook(bash ?? '', 'generated-guard', edit(root, 'docs/api.md'), { project: root, env: { PATH: '/nonexistent', Path: '/nonexistent' } })

  assert.equal(run.status, 0)
  assert.equal(run.stdout, '')
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/hooks/paths.test.ts test/hooks/generated-guard.test.ts test/hooks/run-hook.test.ts`
Expected: FAIL — modules not found, and `ENOENT` for `hooks/hooks.json`.

- [ ] **Step 3: Write the path conversion and the payload io**

`plugins/ownership/plugin/src/hooks/paths.ts`:

```ts
import { posix } from 'node:path'

import { normalizePath, toPosix } from '../paths/paths.ts'

function clean(path: string): string {
  const normalized = posix.normalize(toPosix(path))

  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:\//.test(path)
}

/**
 * A path from a tool payload as the repository names it, or null when it is
 * outside every root. The root prefix is compared without regard to case,
 * because it comes from the operating system — a drive letter may arrive as
 * `c:` or `C:` — while the part inside the repository keeps its case.
 */
export function toRepoPath(filePath: string, roots: readonly string[]): string | null {
  const path = clean(filePath)

  if (!isAbsolutePath(path)) {
    return path === '.' || path === '..' || path.startsWith('../') ? null : normalizePath(path)
  }

  for (const root of roots) {
    const prefix = `${clean(root)}/`

    if (path.length > prefix.length && path.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase()) {
      return normalizePath(path.slice(prefix.length))
    }
  }

  return null
}
```

`plugins/ownership/plugin/src/hooks/io.ts`:

```ts
/** Everything the host wrote to stdin. */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }

  return Buffer.concat(chunks).toString('utf8')
}

/** The answer that makes the host refuse the tool call and show the reason to the agent. */
export function denyOutput(reason: string): string {
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } })
}
```

- [ ] **Step 4: Write the guard and its entry point**

`plugins/ownership/plugin/src/hooks/generated-guard.ts`:

```ts
import { realpathSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import { isGeneratedByMarker, readHead } from '../generated/marker.ts'
import { deepestOwnershipFile, findGeneratedRule } from '../resolve/lookup.ts'
import { resolveOwnership } from '../resolve/resolve.ts'
import { toRepoPath } from './paths.ts'

export interface HookEnv {
  /** The repository judged: the project directory of the session. */
  readonly root: string
  /** Another root the payload paths may start with, for a session that sees the repository under a different path. */
  readonly hostRoot?: string
}

export type Decision = { readonly action: 'allow' } | { readonly action: 'deny'; readonly reason: string }

const ALLOW: Decision = { action: 'allow' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Where `absolute` really is, links followed. A file about to be created has
 * no real path, nor may its directory: the nearest ancestor that exists is
 * resolved and the rest of the path is put back.
 */
function realPathOf(absolute: string): string | null {
  const rest: string[] = []
  let current = absolute

  for (;;) {
    try {
      return join(realpathSync.native(current), ...rest)
    } catch {
      const parent = dirname(current)

      if (parent === current) {
        return null
      }

      rest.unshift(basename(current))
      current = parent
    }
  }
}

function judge(payload: unknown, env: HookEnv): Decision {
  const input = isRecord(payload) && isRecord(payload.tool_input) ? payload.tool_input : null
  const given = input === null ? undefined : (input.file_path ?? input.notebook_path)

  if (input === null || typeof given !== 'string' || given === '') {
    return ALLOW
  }

  const roots = env.hostRoot === undefined || env.hostRoot === '' ? [env.root] : [env.root, env.hostRoot]
  const path = toRepoPath(given, roots)

  if (path === null || path === '') {
    return ALLOW
  }

  // A link to a generated file must not be a way around the guard, so the path
  // behind the link is judged too. A real path outside the roots is not.
  const real = realPathOf(join(env.root, path))
  const realRoot = realPathOf(env.root)
  const realPath = real === null ? null : toRepoPath(real, realRoot === null ? roots : [realRoot, ...roots])
  const paths = realPath === null || realPath === '' || realPath === path ? [path] : [path, realPath]
  const config = resolveOwnership(env.root, { prune: paths })

  if (config === null) {
    return ALLOW
  }

  for (const candidate of paths) {
    const rule = findGeneratedRule(config, candidate)

    if (rule !== null) {
      const origin = rule.origin.line === undefined ? rule.origin.file : `${rule.origin.file}:${rule.origin.line}`

      return {
        action: 'deny',
        reason: `${path} is a generated file, declared in ${origin}: do not edit it by hand. Change what it is generated from and run: ${rule.command} > ${rule.path}`,
      }
    }
  }

  const ownershipFile = deepestOwnershipFile(config, path) ?? config.rootFile
  const head = real === null || realPath === null ? null : readHead(real)

  if (head !== null && isGeneratedByMarker(head)) {
    return {
      action: 'deny',
      reason: `${path} carries the "generated: do not edit" marker on its first line: do not edit it by hand. Declare it in generated[] of ${ownershipFile} with the command that produces it.`,
    }
  }

  if (isRecord(payload) && payload.tool_name === 'Write' && typeof input.content === 'string' && isGeneratedByMarker(input.content)) {
    return {
      action: 'deny',
      reason: `The content for ${path} carries the "generated: do not edit" marker: a generated file is not written by hand. Declare ${path} in generated[] of ${ownershipFile} and produce it with: <command> > ${path}`,
    }
  }

  return ALLOW
}

/**
 * Whether a file tool may touch the path of its payload. Anything that keeps
 * the question from being answered — no ownership file, a load error, a
 * payload it cannot read — allows: the guard never blocks work by a defect of
 * its own.
 */
export function decideGeneratedGuard(payload: unknown, env: HookEnv): Decision {
  try {
    return judge(payload, env)
  } catch {
    return ALLOW
  }
}
```

`plugins/ownership/plugin/src/hooks/main.ts`:

```ts
import { decideGeneratedGuard } from './generated-guard.ts'
import { denyOutput, readStdin } from './io.ts'

// The process ends itself after the budget: not every machine has a `timeout`
// command for the wrapper to use. The timer alone does not keep it alive.
setTimeout(() => process.exit(0), 5000).unref()

try {
  if (process.argv[2] === 'generated-guard') {
    const payload: unknown = JSON.parse(await readStdin())
    const hostRoot = process.env.OWNERSHIP_HOST_ROOT
    const decision = decideGeneratedGuard(payload, { root: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), ...(hostRoot === undefined ? {} : { hostRoot }) })

    if (decision.action === 'deny') {
      process.stdout.write(`${denyOutput(decision.reason)}\n`)
    }
  }
} catch {
  // Silence: a hook never gets in the way because of a defect of its own.
}

process.exitCode = 0
```

- [ ] **Step 5: Register the hook and write the wrapper**

`plugins/ownership/plugin/hooks/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit",
        "hooks": [{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" generated-guard", "shell": "bash", "async": false }]
      }
    ]
  }
}
```

`plugins/ownership/plugin/hooks/run-hook.sh` (LF line ends):

```bash
#!/usr/bin/env bash
# Runs one hook of this plugin on the machine's node.
#
# It fails open: without node, without the dependencies, on a timeout or on
# any error, it prints nothing and exits 0. A hook never blocks work because of
# a defect of its own.

HOOK="${1:-}"

[ -n "$HOOK" ] || exit 0
command -v node >/dev/null 2>&1 || exit 0

# hooks/ and src/ sit side by side in the plugin directory.
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT="$(cat)"

# `timeout` is not on every machine (macOS has none); the hook also ends itself
# after the same five seconds.
if command -v timeout >/dev/null 2>&1; then
  OUTPUT="$(printf '%s' "$INPUT" | timeout 5 node "$PLUGIN_ROOT/src/hooks/main.ts" "$HOOK" 2>/dev/null)"
  STATUS=$?
else
  OUTPUT="$(printf '%s' "$INPUT" | node "$PLUGIN_ROOT/src/hooks/main.ts" "$HOOK" 2>/dev/null)"
  STATUS=$?
fi

[ "$STATUS" -eq 0 ] || exit 0
[ -n "$OUTPUT" ] || exit 0

# Whatever is not one JSON value is dropped: the host would read it as a broken answer.
if printf '%s' "$OUTPUT" | node -e 'JSON.parse(require("node:fs").readFileSync(0, "utf8"))' >/dev/null 2>&1; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
```

Then make it executable, in the work tree and in the index — on Windows the file system keeps no such bit, so only the index does:

```bash
chmod +x plugin/hooks/run-hook.sh
git add plugin/hooks/run-hook.sh
git update-index --chmod=+x plugin/hooks/run-hook.sh
git ls-files -s plugin/hooks/run-hook.sh
```

Expected: the last command prints a line that starts with `100755`.

- [ ] **Step 6: Run them to see them pass**

Run: `node --test test/hooks/paths.test.ts test/hooks/generated-guard.test.ts test/hooks/run-hook.test.ts`
Expected: PASS (7 + 17 + 5 tests). The two tests that create a symbolic link to a file report SKIP on a machine that cannot create one (Windows without the privilege); the test of the linked directory runs everywhere. The `run-hook` tests report SKIP only on a Windows machine without Git for Windows' bash.

- [ ] **Step 7: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/hooks plugins/ownership/plugin/hooks plugins/ownership/test/hooks plugins/ownership/test/helpers/hook.ts
git commit -m "feat(ownership): refuse a hand edit of a generated file in the session

The generated-guard hook runs before Edit, Write, MultiEdit and
NotebookEdit. It denies a file declared in generated[], a file whose
first line carries the marker, and a Write whose content carries it. It
judges the path behind a link too, and stays silent whenever it cannot
judge.

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: The `/ownership:init` slash command

**Files:**
- Create: `plugins/ownership/plugin/commands/init.md`
- Test: `plugins/ownership/test/distribution/command.test.ts`

**Interfaces:**
- Consumes: the CLI (`init`, `explain`, `validate`) as built by Tasks 14, 15 and 17; `PLUGIN_ROOT` (Task 2).
- Produces: `commands/init.md`. The host names a command after the plugin and the file: `ownership` + `init.md` is `/ownership:init`. The text is a script for the agent, and it is shipped: it cites no requirement ID and no path of this repository (Task 21 enforces it).
- The test pins what the command must not lose: the file is created only by `ownership init`, the mode and every owner are the human's choice, the CODEOWNERS is never touched, and it ends with the two checks that run no generator.

- [ ] **Step 1: Write the failing test**

`plugins/ownership/test/distribution/command.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from 'yaml'

import { PLUGIN_ROOT } from '../helpers/roots.ts'

const text = readFileSync(join(PLUGIN_ROOT, 'commands', 'init.md'), 'utf8')
const CLI = 'node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts"'

test('the command file is commands/init.md, so the host names it /ownership:init', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf8')) as { name: string }

  assert.equal(manifest.name, 'ownership')
})

test('the frontmatter describes the command and lets it run the CLI and edit the file', () => {
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(text)

  assert.ok(frontmatter !== null, 'the command starts with a frontmatter block')

  const meta = parse(frontmatter[1] ?? '') as Record<string, unknown>

  assert.equal(typeof meta.description, 'string')
  assert.notEqual(meta.description, '')
  assert.match(String(meta['allowed-tools']), /Bash\(node:\*\)/)
  assert.match(String(meta['allowed-tools']), /\bEdit\b/)
})

test('the file is created only by running the init of the CLI', () => {
  assert.ok(text.includes(`${CLI} init [--owner <@owner> | --from-codeowners] [--ownership <path>]`))
  assert.match(text, /only way the file is created/)
})

test('the command ends with the two checks that run no generator', () => {
  assert.ok(text.includes(`${CLI} validate --check ownership/owner-coverage --check ownership/codeowners-match`))
  assert.doesNotMatch(text, /--check ownership\/generated-drift/)
})

test('the script keeps the decisions with the human', () => {
  for (const rule of [
    /Never pick one on your own/,
    /Never fill in an owner/,
    /wait for an explicit yes/,
    /Never create or change the CODEOWNERS/,
    /--from-codeowners` first/,
  ]) {
    assert.match(text, rule)
  }
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/distribution/command.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../plugin/commands/init.md'`.

- [ ] **Step 3: Write the command**

`plugins/ownership/plugin/commands/init.md`:

````markdown
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
````

- [ ] **Step 4: Run it to see it pass**

Run: `node --test test/distribution/command.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/commands plugins/ownership/test/distribution/command.test.ts
git commit -m "feat(ownership): the /ownership:init command conducts the initialization

It creates the file only by running ownership init, asks the mode and
the owner of each path, and never touches the CODEOWNERS.

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: The public surface and the distribution tests

**Files:**
- Create: `plugins/ownership/plugin/src/index.ts`
- Create: `plugins/ownership/test/helpers/surface.ts`
- Test: `plugins/ownership/test/distribution/public-api.test.ts`
- Test: `plugins/ownership/test/distribution/packaging.test.ts`
- Test: `plugins/ownership/test/distribution/plugin-cache.test.ts`
- Test: `plugins/ownership/test/distribution/no-internal-trace.test.ts`

**Interfaces:**
- Consumes: everything built so far; `bashExecutable`, `runHook` (Task 19); `runCli`, `tempRepo`, `PROJECT_ROOT`, `PLUGIN_ROOT` (Task 2); `SCHEMA_URL` (Task 16).
- Produces:
  - `plugin/src/index.ts`, the package entry. Its run-time names, exactly: `OwnershipError`, `coreCheckCatalog`, `coreChecks`, `entriesForPlugin`, `explainPath`, `findGeneratedRule`, `findOwnedRule`, `isGeneratedByMarker`, `loadCodeowners`, `ownersOf`, `parseCodeowners`, `resolveOwnership`. It also exports the types of the resolved configuration, of the checks, of CODEOWNERS and of the errors.
  - `PUBLIC_NAMES` (`test/helpers/surface.ts`) — that list, sorted, shared by the tests that pin it on the source, under the `development` condition and on the compiled package.
- The packaging and the plugin-cache tests download `yaml` from the npm registry: they need the network.
- The plugin-cache and the trace tests take the files of `plugin/` from Git — tracked ones and new ones no `.gitignore` excludes — so they see a file of this task before it is committed.

- [ ] **Step 1: Write the failing tests**

`plugins/ownership/test/helpers/surface.ts`:

```ts
/** Every name the package exports at run time, sorted. Types are not listed: they do not exist at run time. */
export const PUBLIC_NAMES = [
  'OwnershipError',
  'coreCheckCatalog',
  'coreChecks',
  'entriesForPlugin',
  'explainPath',
  'findGeneratedRule',
  'findOwnedRule',
  'isGeneratedByMarker',
  'loadCodeowners',
  'ownersOf',
  'parseCodeowners',
  'resolveOwnership',
] as const
```

`plugins/ownership/test/distribution/public-api.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

import * as surface from '../../plugin/src/index.ts'
import type { Check, CheckContext, Finding, OwnersResult, PathExplanation, PluginEntry, ResolvedOwnership, Severity } from '../../plugin/src/index.ts'
import { tempRepo } from '../helpers/repo.ts'
import { PROJECT_ROOT } from '../helpers/roots.ts'
import { PUBLIC_NAMES } from '../helpers/surface.ts'

test('the package exports exactly its public names', () => {
  assert.deepEqual(Object.keys(surface).sort(), [...PUBLIC_NAMES])
})

test('the public catalog carries the three core checks: id, name, command and when each fails', () => {
  assert.deepEqual(
    surface.coreCheckCatalog.map(entry => [entry.id, entry.command]),
    [
      ['ownership/owner-coverage', 'ownership validate --check ownership/owner-coverage'],
      ['ownership/codeowners-match', 'ownership validate --check ownership/codeowners-match'],
      ['ownership/generated-drift', 'ownership validate --check ownership/generated-drift'],
    ],
  )
  assert.ok(surface.coreCheckCatalog.every(entry => entry.name !== '' && entry.failsWhen !== ''))
  assert.ok(Object.isFrozen(surface.coreCheckCatalog) && Object.isFrozen(surface.coreChecks))
})

test('a domain plugin can do its work with the public names alone', async t => {
  const root = tempRepo(
    t,
    {
      '.ownership.yml': "version: 1\nplugins:\n  docs-kit:\n    lang: en\nowned:\n  - path: docs/\n    owner: '@Docs'\n    plugins:\n      docs-kit: {}\n",
      'docs/a.md': '<!-- generated: do not edit -->\n',
    },
    { codeowners: 'docs/ @docs\n' },
  )
  const config: ResolvedOwnership | null = surface.resolveOwnership(root, { prune: ['docs/a.md'] })

  assert.ok(config !== null)

  const entries: PluginEntry[] = surface.entriesForPlugin(config, 'docs-kit')
  const owners: OwnersResult = surface.ownersOf(surface.loadCodeowners(root), 'docs/a.md')
  const explanation: PathExplanation = surface.explainPath(config, 'docs/a.md', {
    repoFiles: new Set(['docs/a.md']),
    codeowners: surface.parseCodeowners('docs/ @docs\n'),
  })
  const severity: Severity = 'warning'
  const own: Check = {
    id: 'docs-kit/example',
    name: 'Example',
    failsWhen: 'always',
    run: (ctx: CheckContext): Promise<Finding[]> => Promise.resolve([{ file: ctx.config.rootFile, checkId: 'docs-kit/example', severity, message: 'example' }]),
  }

  assert.deepEqual(entries, [{ path: 'docs/', owner: '@Docs', source: '.ownership.yml', entry: {}, global: { lang: 'en' } }])
  assert.deepEqual(owners, { kind: 'matched', owners: ['@docs'], line: 1 })
  assert.equal(surface.findOwnedRule(config, 'docs/a.md')?.owner, '@Docs')
  assert.equal(surface.findGeneratedRule(config, 'docs/a.md'), null)
  assert.deepEqual(explanation.generated, { source: 'marker' })
  assert.equal(surface.isGeneratedByMarker('generated: do not edit\n'), true)
  assert.equal((await own.run({ root, config, repoFiles: new Set(), jobs: 1, codeowners: () => null }))[0]?.severity, 'warning')
  assert.throws(() => surface.entriesForPlugin(config, 'Bad_Name'), surface.OwnershipError)
})

test('with the development condition, the package name resolves to the TypeScript source, with no build', { timeout: 60_000 }, () => {
  const script = 'import("@esliph/ownership").then(m => console.log(JSON.stringify(Object.keys(m).sort())))'
  const result = spawnSync(process.execPath, ['--conditions=development', '--input-type=module', '-e', script], { cwd: PROJECT_ROOT, encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), [...PUBLIC_NAMES])
})
```

`plugins/ownership/test/distribution/packaging.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PLUGIN_ROOT } from '../helpers/roots.ts'
import { PUBLIC_NAMES } from '../helpers/surface.ts'

function npm(command: string, cwd: string): { status: number | null; stdout: string; stderr: string } {
  // `npm` is a .cmd on Windows, which only a shell can start.
  const result = spawnSync(`npm ${command}`, { cwd, encoding: 'utf8', shell: true })

  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

test('the packed package installs, exports its public names from the compiled code and runs its bin', { timeout: 300_000 }, () => {
  const pack = npm('pack --json', PLUGIN_ROOT)

  assert.equal(pack.status, 0, pack.stderr)

  const [packed] = JSON.parse(pack.stdout) as { filename: string; files: { path: string }[] }[]

  assert.ok(packed !== undefined)

  const tarball = join(PLUGIN_ROOT, packed.filename)
  const consumer = mkdtempSync(join(tmpdir(), 'ownership-pack-'))

  try {
    const shipped = packed.files.map(file => file.path)

    assert.ok(shipped.includes('ownership.schema.json'))
    assert.ok(shipped.includes('dist/index.js') && shipped.includes('dist/index.d.ts') && shipped.includes('dist/cli/index.js'))
    assert.deepEqual(
      shipped.filter(path => path.startsWith('src/') || path.startsWith('hooks/') || path.startsWith('commands/')),
      [],
      'the npm package carries the compiled code only',
    )

    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }))

    const install = npm(`install ${JSON.stringify(tarball)} --no-audit --no-fund`, consumer)

    assert.equal(install.status, 0, install.stderr)

    const names = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', 'import("@esliph/ownership").then(m => console.log(JSON.stringify(Object.keys(m).sort())))'],
      {
        cwd: consumer,
        encoding: 'utf8',
      },
    )

    assert.equal(names.status, 0, names.stderr)
    assert.deepEqual(JSON.parse(names.stdout), [...PUBLIC_NAMES])

    const manifest = JSON.parse(readFileSync(join(consumer, 'node_modules', '@esliph', 'ownership', 'package.json'), 'utf8')) as { bin: Record<string, string> }
    const bin = spawnSync(process.execPath, [join(consumer, 'node_modules', '@esliph', 'ownership', manifest.bin.ownership ?? ''), '--help'], {
      cwd: consumer,
      encoding: 'utf8',
    })

    assert.equal(bin.status, 0, bin.stderr)
    assert.match(bin.stdout, /^Usage: ownership <command>/)
  } finally {
    rmSync(consumer, { recursive: true, force: true })
    rmSync(tarball, { force: true })
    rmSync(join(PLUGIN_ROOT, 'dist'), { recursive: true, force: true })
  }

  assert.equal(existsSync(join(PLUGIN_ROOT, 'dist')), false, 'the compiled code exists only while packing')
})
```

`plugins/ownership/test/distribution/plugin-cache.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { runCli } from '../helpers/cli.ts'
import { bashExecutable, runHook } from '../helpers/hook.ts'
import { tempRepo } from '../helpers/repo.ts'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const OWNERSHIP = "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\ngenerated:\n  - path: docs/api.md\n    command: node tools/gen.mjs\n"

/** What Git would hand over of the distributed directory: tracked files and new ones no .gitignore excludes. */
function distributedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.'], { cwd: PLUGIN_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(file => file !== '')
}

test('the hooks wrapper is versioned as executable', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PLUGIN_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('the distributed directory carries the plugin and nothing of the project around it', () => {
  const files = distributedFiles()

  for (const needed of [
    '.claude-plugin/plugin.json',
    'hooks/hooks.json',
    'hooks/run-hook.sh',
    'commands/init.md',
    'ownership.schema.json',
    'package.json',
    'package-lock.json',
    'src/index.ts',
  ]) {
    assert.ok(files.includes(needed), `${needed} is missing from the distributed directory`)
  }

  assert.deepEqual(
    files.filter(file => /^(?:test|docs|dist|node_modules)\//.test(file) || /\.test\.ts$/.test(file)),
    [],
  )
})

test('copied alone into the plugin cache, the plugin installs from its lockfile and the hook and the CLI answer from there', { timeout: 300_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('no Git for Windows bash on this machine; CI (ubuntu) runs this proof')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'ownership-cache-'))
  const project = tempRepo(t, { '.ownership.yml': OWNERSHIP, 'docs/api.md': 'api\n' })
  const payload = { tool_name: 'Edit', tool_input: { file_path: join(project, 'docs', 'api.md') } }

  t.after(() => rmSync(cache, { recursive: true, force: true }))

  for (const file of distributedFiles()) {
    mkdirSync(dirname(join(cache, file)), { recursive: true })
    copyFileSync(join(PLUGIN_ROOT, file), join(cache, file))
  }

  assert.equal(existsSync(join(cache, 'node_modules')), false)

  // Control: without its dependency the hook cannot run and, by contract, stays silent.
  const before = runHook(bash, 'generated-guard', payload, { project, pluginRoot: cache })

  assert.equal(before.status, 0)
  assert.equal(before.stdout, '')

  const install = spawnSync('npm ci --ignore-scripts --omit=dev --no-audit --no-fund', { cwd: cache, encoding: 'utf8', shell: true })

  assert.equal(install.status, 0, install.stderr)

  const after = runHook(bash, 'generated-guard', payload, { project, pluginRoot: cache })

  assert.equal(after.status, 0, after.stderr)
  assert.equal((JSON.parse(after.stdout) as { hookSpecificOutput: { permissionDecision: string } }).hookSpecificOutput.permissionDecision, 'deny')

  const cli = spawnSync(process.execPath, [join(cache, 'src', 'cli', 'index.ts'), 'explain', 'docs/api.md'], { cwd: project, encoding: 'utf8' })

  assert.equal(cli.status, 0, cli.stderr)
  assert.equal(cli.stdout, runCli(['explain', 'docs/api.md'], { cwd: project }).stdout)
})
```

`plugins/ownership/test/distribution/no-internal-trace.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SCHEMA_URL } from '../../plugin/src/init/render.ts'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

/** What a shipped file must not say: it would send whoever installs the plugin to a place they do not have. */
const TRACES: [string, RegExp][] = [
  ['a requirement ID', /\bREQ-[A-Z]+-\d+/],
  ['a section of the specification', /§\s*\d/],
  ['a document of this repository', /\bdocs\/(?:requirements|superpowers)\b/],
  ['a path of this repository', /\bplugins\/ownership\b/],
]

function shippedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.'], { cwd: PLUGIN_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(file => file !== '' && file !== 'package-lock.json')
}

test('nothing the plugin ships points inside the repository that develops it', () => {
  const files = shippedFiles()
  const found: string[] = []

  assert.ok(files.length > 30, `scan too empty: ${files.length} files`)

  for (const file of files) {
    readFileSync(join(PLUGIN_ROOT, file), 'utf8')
      .split('\n')
      .forEach((line, index) => {
        // The address the schema is published at is the one path of this repository a shipped file may carry.
        const text = line.replaceAll(SCHEMA_URL, '')

        for (const [what, pattern] of TRACES) {
          if (pattern.test(text)) {
            found.push(`${file}:${index + 1}: ${what}: ${line.trim()}`)
          }
        }
      })
  }

  assert.deepEqual(found, [])
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test "test/distribution/*.test.ts"`
Expected: `public-api.test.ts` FAILS with `Cannot find module '.../plugin/src/index.ts'`; `packaging.test.ts` FAILS while packing (`tsc` finds no `index.ts` to emit `dist/index.js` from, so the file list lacks it); `plugin-cache.test.ts` FAILS on `src/index.ts is missing from the distributed directory`. The other tests of the directory pass already.

- [ ] **Step 3: Write the public surface**

`plugins/ownership/plugin/src/index.ts`:

```ts
// The public surface. Renaming or removing a name here breaks whoever builds on this package.

export { resolveOwnership } from './resolve/resolve.ts'
export { findGeneratedRule, findOwnedRule } from './resolve/lookup.ts'
export { explainPath } from './resolve/explain.ts'
export { entriesForPlugin } from './resolve/plugins.ts'
export type { GeneratedRule, IgnoreRule, OwnedRule, OwnershipFileInfo, ResolvedOwnership, ResolveOptions, Rule, RuleOrigin, TrieNode } from './resolve/types.ts'
export type { Coverage, ExplainContext, GeneratedOrigin, PathExplanation } from './resolve/explain.ts'
export type { PluginEntry } from './resolve/plugins.ts'
export type { PluginBlock, PluginBlocks } from './schema/types.ts'

export { coreCheckCatalog, coreChecks } from './checks/core.ts'
export type { CatalogEntry } from './checks/core.ts'
export type { Check, CheckContext, Finding, Severity } from './checks/types.ts'

export { loadCodeowners } from './codeowners/locate.ts'
export { ownersOf } from './codeowners/match.ts'
export { parseCodeowners } from './codeowners/parse.ts'
export type { Codeowners, CodeownersLine, OwnersResult } from './codeowners/types.ts'

export { isGeneratedByMarker } from './generated/marker.ts'

export { OwnershipError } from './errors.ts'
export type { Issue } from './errors.ts'
```

- [ ] **Step 4: Run them to see them pass**

Run: `node --test "test/distribution/*.test.ts"`
Expected: PASS (14 tests in the five files, `command.test.ts` of Task 20 included). If `no-internal-trace.test.ts` fails, it names the file and the line: reword that comment or message so that it explains the reason in its own words.

Run: `git status --short plugin/` (from `plugins/ownership/`)
Expected: no `plugin/dist/` and no `.tgz` — the packaging test removes what it builds.

- [ ] **Step 5: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/plugin/src/index.ts plugins/ownership/test/distribution plugins/ownership/test/helpers/surface.ts
git commit -m "feat(ownership): the public surface of the package, and proof that it ships

The package exports exactly the names other plugins build on. Tests pack
it, install the tarball, import those names from the compiled code and
run the bin; copy the plugin directory alone, install it from its
lockfile and run the hook from there; and check that nothing shipped
points inside the repository that develops it.

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: Performance and language independence

**Files:**
- Test: `plugins/ownership/test/perf/owner-coverage.perf.ts`
- Test: `plugins/ownership/test/cli/language.test.ts`

**Interfaces:**
- Consumes: the CLI; `runCli`, `git`, `tempRepo` (Task 2). The `perf` task of the `Spurfile` (Task 2) runs `test/**/*.perf.ts`; the `test` task does not, because its glob is `*.test.ts`.
- Produces: no code. Two properties of the whole are pinned: `validate --check ownership/owner-coverage` on 100,000 files inside 2 s, and the same findings for the same structure whatever language the files are written in.
- Building the fixture takes about a minute; the measured runs take under a second each. The budget is checked on the fastest of three runs.

- [ ] **Step 1: Write the performance test**

`plugins/ownership/test/perf/owner-coverage.perf.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { runCli } from '../helpers/cli.ts'
import { git, tempRepo } from '../helpers/repo.ts'

const TOP = 20
const SUB = 50
const PER_DIRECTORY = 100
const FILES = TOP * SUB * PER_DIRECTORY
const BUDGET_MS = 2000

const name = (prefix: string, index: number): string => `${prefix}-${String(index).padStart(2, '0')}`

/** 100,000 empty files, half of them tracked and half new: the listing has to merge the index with a walk of the tree. */
function populate(root: string): void {
  const fill = (from: number, to: number): void => {
    for (let top = 0; top < TOP; top++) {
      for (let sub = from; sub < to; sub++) {
        const dir = join(root, name('pkg', top), name('mod', sub))

        mkdirSync(dir, { recursive: true })

        for (let file = 0; file < PER_DIRECTORY; file++) {
          writeFileSync(join(dir, `file-${file}.ts`), '')
        }
      }
    }
  }

  fill(0, SUB / 2)
  git(root, 'add', '-A')
  fill(SUB / 2, SUB)
}

test(`owner coverage of a repository of ${FILES} files takes less than ${BUDGET_MS} ms`, { timeout: 900_000 }, t => {
  const entries = Array.from({ length: TOP }, (_, top) => `  - path: ${name('pkg', top)}/\n    owner: '@team-${top}'\n`).join('')
  const root = tempRepo(t, { '.ownership.yml': `version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@root'\n${entries}`, 'stray.ts': '' })

  populate(root)

  const args = ['validate', '--check', 'ownership/owner-coverage']
  const expected = [
    'stray.ts  ownership/owner-coverage  error  no owned entry covers this file',
    '  → declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
    'ownership: 1 error, 0 warnings.',
    '',
  ].join('\n')

  // The first run warms the file system cache and proves the check saw every file: the one without an owner is the only finding.
  const warmUp = runCli(args, { cwd: root })

  assert.equal(warmUp.stderr, '')
  assert.equal(warmUp.stdout, expected)

  // The best of three: the budget is about the work the check does, not about a busy machine.
  const times = Array.from({ length: 3 }, () => {
    const start = performance.now()
    const result = runCli(args, { cwd: root })

    assert.equal(result.status, 1)
    assert.equal(result.stdout, expected)

    return performance.now() - start
  })

  t.diagnostic(`runs: ${times.map(time => `${Math.round(time)} ms`).join(', ')}`)
  assert.ok(Math.min(...times) < BUDGET_MS, `the fastest of three runs took ${Math.round(Math.min(...times))} ms`)
})
```

- [ ] **Step 2: Run it**

Run: `../../spur perf`
Expected: PASS (1 test), with a line such as `runs: 693 ms, 758 ms, 763 ms`.

If the budget is missed, measure before changing anything — in the fixture (print `root` and comment out the `t.after` of `tempRepo` to keep it), time each Git call of `listRepoFiles` on its own:

```bash
time git -c core.quotePath=false ls-files -z --cached --others --exclude-per-directory=.gitignore > /dev/null
time git diff-files -z --name-only --diff-filter=D --relative > /dev/null
```

The two together are most of the run. The check itself must stay one pass over the files against the index, with no file read and no `stat`.

- [ ] **Step 3: Write the language test**

`plugins/ownership/test/cli/language.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { runCli } from '../helpers/cli.ts'
import { tempRepo } from '../helpers/repo.ts'

/** The same structure twice: once written in English, once in Portuguese and Japanese. */
const ENGLISH = {
  '.ownership.yml': [
    '# Who owns what in this repository.',
    'version: 1',
    'owned:',
    '  # The documentation team.',
    '  - path: docs/',
    "    owner: '@docs'",
    '  - path: missing/',
    "    owner: '@docs'",
    'generated:',
    '  - path: docs/api.md',
    '    command: node gen.mjs',
    '',
  ].join('\n'),
  CODEOWNERS: '# Reviewers of the documentation\ndocs/ @other\n',
  'docs/guide.md': '# Guide\n\nThis file is generated: do not edit it, said the prose on line three.\n',
  'docs/api.md': '# The API\n',
  'docs/marked.md': '<!-- generated: do not edit -->\n# A generated page\n',
  'README.md': '# Read me\n\nNobody owns this file yet.\n',
}

const OTHER = {
  '.ownership.yml': ENGLISH['.ownership.yml']
    .replace('# Who owns what in this repository.', '# Quem é dono de quê neste repositório.')
    .replace('# The documentation team.', '# ドキュメントチーム。'),
  CODEOWNERS: '# Revisores da documentação\ndocs/ @other\n',
  'docs/guide.md': '# Guia\n\nEste arquivo é gerado: não edite, dizia a prosa na linha três.\n',
  'docs/api.md': '# A API\n',
  'docs/marked.md': '<!-- generated: do not edit -->\n# 生成されたページ\n',
  'README.md': '# Leia-me\n\nNinguém é dono deste arquivo ainda.\n',
}

test('a repository written in another language gives exactly the same findings', t => {
  const english = runCli(['validate', '--format', 'json'], { cwd: tempRepo(t, ENGLISH) })
  const other = runCli(['validate', '--format', 'json'], { cwd: tempRepo(t, OTHER) })
  const findings = (JSON.parse(english.stdout) as { findings: { checkId: string }[] }).findings

  assert.equal(english.status, 1)
  assert.equal(other.stdout, english.stdout)
  assert.deepEqual([...new Set(findings.map(item => item.checkId))].sort(), [
    'ownership/codeowners-match',
    'ownership/generated-drift',
    'ownership/owner-coverage',
  ])
})
```

- [ ] **Step 4: Run it**

Run: `node --test test/cli/language.test.ts`
Expected: PASS (1 test). It passes at once: no check reads prose. It is here so that a check that starts to does not go unnoticed.

- [ ] **Step 5: Commit**

```bash
../../spur format && ../../spur check
git -C ../.. add plugins/ownership/test/perf plugins/ownership/test/cli/language.test.ts
git commit -m "test(ownership): pin the coverage budget and language independence

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: README, CHANGELOG and the marketplace entry

**Files:**
- Create: `plugins/ownership/README.md`
- Create: `plugins/ownership/CHANGELOG.md`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `README.md` (the plugin table)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the behavior of every earlier task. Both READMEs and both CHANGELOGs are for whoever installs: they explain in running text and cite no requirement ID.
- Produces: the plugin listed in the marketplace with `source: ./plugins/ownership/plugin`.
- Commands of this task run from the repository root.

- [ ] **Step 1: Write the plugin README**

`plugins/ownership/README.md`:

````markdown
# ownership

One file, `.ownership.yml`, says who owns each path of a repository and which
files are generated by a command. This plugin checks those promises in two
places: in the Claude Code session, where it refuses a hand edit of a generated
file, and in CI, where `ownership validate` fails when a file has no owner, when
the `CODEOWNERS` disagrees, or when a generated file drifted from its generator.

It works on its own, and it is also a library other plugins build on.

## Install

```text
/plugin marketplace add esliph/agent-plugins
/plugin install ownership@esliph
```

It needs Node 24 or later and Git on the machine. In a repository without an
ownership file the plugin does nothing; without Node, its hook stays silent and
blocks nothing.

## Start

In a Claude Code session, run `/ownership:init`. It asks how you want to start,
creates the file and helps you divide the repository among its owners — it
proposes the paths, and you name the owner of each one.

From a terminal, `ownership init` creates the same file:

| Command                            | Writes                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `ownership init`                   | No entry: a commented model for each file and directory of the root.    |
| `ownership init --owner @you`      | One entry for each file and directory of the root, all with that owner. |
| `ownership init --from-codeowners` | Entries derived from the `CODEOWNERS`, so the two files agree.          |

`--stdout` prints the file instead of writing it, and `--ownership <path>`
creates it somewhere else in the repository. `init` never overwrites an
ownership file: to start over, delete the file yourself.

The skeleton, and any start that leaves files without an owner, makes
`ownership validate` fail on purpose. Nobody has said yet who owns those files,
and that is the decision this plugin exists to make explicit.

## The ownership file

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json
version: 1

owned:
  - path: docs/
    owner: '@acme/docs'
    skill: docs-keeper
  - path: src/
    owner: '@acme/platform'
  - path: README.md
    owner: '@acme/docs'

generated:
  - path: docs/api.md
    command: node tools/gen-api.mjs

ignore:
  - src/vendor/

include:
  - packages/billing/
```

| Key         | Declares                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `version`   | The schema version. Always `1`.                                                                                                                                                            |
| `owned`     | The owner of each path: `path`, `owner` (starting with `@`) and, optionally, the `skill` that answers for it and a `plugins` map.                                                          |
| `generated` | Files produced by a command: `path` and `command`. The command runs at the repository root and prints the file. Each generated file sits under an `owned` entry, which gives it its owner. |
| `ignore`    | Paths that need no owner.                                                                                                                                                                  |
| `include`   | Other ownership files to read: a file, or a directory (trailing `/`) that holds exactly one.                                                                                               |
| `basePath`  | In an included file, a directory below it that its paths are relative to.                                                                                                                  |
| `plugins`   | In the root file only: configuration for the plugins built on this one.                                                                                                                    |

The root file is `.ownership.yml` or `docs/.ownership.yml`. Having both is an
error; so is anything else ambiguous. The plugin never picks one for you.

### Paths are literal and disjoint

A path is written as it is, relative to the directory of its file: no `*`, no
`**`, no negation, no leading `/`. A trailing `/` means a directory, and `docs/`
is the directory `docs` at that place — never "any directory named `docs`".

No `owned` path repeats or contains another, so the question "which entry
covers this file" has one answer, whatever the order of the file. A directory
whose parts have different owners is declared part by part; when two entries
collide, the error lists the entries that would replace the outer one. A part of
an owned directory that needs no owner goes in `ignore`.

Paths are case-sensitive, as they are on GitHub, even on a file system that is
not. Two declared paths that differ only in case are an error.

### What counts as a file of the repository

Every file Git tracks, plus every new file that no `.gitignore` excludes. What a
`.gitignore` excludes — installed dependencies, build output — needs neither an
owner nor an `ignore`. A submodule counts as one file, and a symbolic link as
the link itself.

### Editor support

The comment on the first line gives editors that speak the YAML language server
completion and validation. It is a comment because the keys of the file are a
closed list: a `$schema` key would be an error.

### Monorepos

`include` reads another ownership file, usually one per package. Its paths are
relative to its own directory, and they cannot reach outside it. An included
file is read once, and the paths of all the files together obey the same rules
as the paths of one.

## Blocks for other plugins

A plugin built on this one is configured under its name:

```yaml
version: 1

plugins:
  docs-kit:
    language: en

owned:
  - path: docs/
    owner: '@acme/docs'
    plugins:
      docs-kit:
        id-prefix: ADR
```

- A path belongs to a plugin when, and only when, the `owned` entry that covers
  it has a block under the plugin's name. `docs-kit: {}` links the path without
  configuring anything.
- The block under `plugins` at the top of the root file is that plugin's global
  configuration. It links no path.
- **Plugin names are not checked.** This plugin does not know which plugins
  exist, so a misspelled name is not an error: it is a plugin that never sees
  the path. `ownership validate` ends with every plugin name in use and how many
  entries each one has; that list is where a typo shows.

  ```text
  ownership: plugins in use:
    docs-kit   12 entries  global config
    docs-kti    1 entry
  ```

- **The global block and the block of an entry are never merged.** A plugin
  receives the two separately and decides which one wins; its own documentation
  says how.
- What goes inside a block is the plugin's business. A wrong key inside it shows
  only when that plugin runs.

## In the session

One hook runs before `Edit`, `Write`, `MultiEdit` and `NotebookEdit`:

| When                                                                         | The hook                                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| The file is declared in `generated`                                          | Denies the edit, naming where it is declared and its command.        |
| The first line of the file carries `generated: do not edit`                  | Denies the edit and asks for the file to be declared in `generated`. |
| A `Write` whose content starts with a line carrying `generated: do not edit` | Denies it: a generated file is not written by hand.                  |

The marker is matched in any case, on the first line of the file. A symbolic
link to a generated file is refused like the file itself.

The hook does not see a file written through the shell, nor a marker that an
edit adds to a file that did not have one. `ownership validate` catches both
later.

Whenever it cannot judge — no Node, no ownership file, an ownership file with an
error, anything unexpected — the hook stays silent. It never blocks work because
of a defect of its own.

## In CI

```bash
ownership validate
```

`validate` always covers the whole repository.

| Check                        | Fails when                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ownership/owner-coverage`   | A file of the repository has neither an `owned` entry nor an `ignore`; an `owned` path does not exist, or all its files are ignored.                                       |
| `ownership/codeowners-match` | The repository has a `CODEOWNERS` and an `owned` path has no matching line in it, or the line that decides — the last one that matches — does not list the declared owner. |
| `ownership/generated-drift`  | A generated file differs from what its command prints; the command fails; the file is missing; a file carries the `generated: do not edit` marker without being declared.  |

A `CODEOWNERS` is optional: without one, `ownership/codeowners-match` has
nothing to check. With one, the declared owner must be on the line GitHub would
use, compared without regard to case; the line may list other owners too.

| Option                        | Effect                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `--check <id>`                | Runs only that check; repeat it for more. The scope is still the whole repository.              |
| `--format text\|json\|github` | `json` prints one object; `github` prints annotations that show on the lines of a pull request. |
| `--jobs <n>`                  | How many generator commands run at the same time. The default is the number of CPUs.            |
| `--ownership <path>`          | Uses this root ownership file. The `OWNERSHIP_CONFIG` variable does the same.                   |

Exit codes: `0` when no check fails, `1` when one does, `2` when the command
could not run — an ownership file with an error, an unknown option.

**Generators run in parallel.** The commands of `generated` run at the same
time. Generators that share state on disk — a cache, a temporary directory —
must be independent of each other, or run with `--jobs 1`.

`ownership/owner-coverage` alone reads no file and runs no command, so it fits a
pre-commit hook:

```bash
ownership validate --check ownership/owner-coverage
```

In a GitHub workflow:

```yaml
- run: ownership validate --format github
```

The commands run on the current directory; `OWNERSHIP_REPO_ROOT` points them at
another repository.

The package is not on npm yet. Until it is, run the CLI from a checkout of this
repository, after `./spur install`:

```bash
node plugins/ownership/plugin/src/cli/index.ts validate
```

## Asking about one path

```bash
ownership explain docs/adr/0001.md
```

```text
path       docs/adr/0001.md
owned      docs/adr/  owner @acme/docs  skill —  (.ownership.yml:12)
           plugin docs-kit: {"id-prefix":"ADR"}
generated  —
ignore     —
CODEOWNERS line 4: @acme/docs @lead — declared owner listed
```

It shows every rule that reaches the path and where each one was written. For a
path nothing covers, it names the ownership file where the missing entry
belongs.

## As a library

Other plugins import the package instead of reading the file themselves:

| Export                                                                        | Use                                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `resolveOwnership(root, options?)`                                            | Every ownership file of the repository, read and checked. `null` when there is none. |
| `findOwnedRule(config, path)`, `findGeneratedRule(config, path)`              | The rule that covers a path.                                                         |
| `explainPath(config, path, context)`                                          | What `ownership explain` shows, as data.                                             |
| `entriesForPlugin(config, name)`                                              | The `owned` entries linked to a plugin, each with its own block and the global one.  |
| `loadCodeowners(root)`, `parseCodeowners(text)`, `ownersOf(codeowners, path)` | The owners the `CODEOWNERS` gives a path, decided as GitHub decides them.            |
| `isGeneratedByMarker(content)`                                                | Whether a content carries the generated marker.                                      |
| `coreChecks`, `coreCheckCatalog`                                              | The three checks and their public description.                                       |
| `OwnershipError`                                                              | Every error found while reading the files, with the file, the key and the line.      |

The types `Check`, `CheckContext`, `Finding` and `Severity` let a plugin write
checks of its own in the same shape. The fields of `Finding` — `file`, `line`,
`column`, `checkId`, `severity`, `message`, `fix` — are what `--format json`
prints, and they do not change name.

## Working on this plugin

The project is `plugins/ownership/`; what is installed is its `plugin/`
directory. From the project directory:

```bash
../../spur install   # dependencies, from the lockfile
../../spur check     # tests, type-check, lint and formatting
../../spur perf      # the performance test, on a repository of 100,000 files
../../spur --list    # every task
```

The code runs straight from TypeScript, on Node's type stripping; `plugin/dist/`
exists only while the package is being packed and is never committed. What the
plugin must do is written in `docs/requirements/ownership.md`.
````

- [ ] **Step 2: Write the plugin CHANGELOG**

`plugins/ownership/CHANGELOG.md`:

```markdown
# Changelog

This file is aimed at whoever **uses** the `ownership` plugin. Single test: if
an entry only makes sense to whoever wrote the code, it does not belong here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

An entry is born in the change that causes it, not on the eve of the release.

## [Unreleased]

### Added

- The ownership file, `version: 1`: `owned` (the owner of each path, with an
  optional skill), `generated` (files produced by a command), `ignore`,
  `include` and `basePath`. Paths are literal, case-sensitive and disjoint.
- `ownership validate`, with three checks over the whole repository:
  `ownership/owner-coverage`, `ownership/codeowners-match` and
  `ownership/generated-drift`. `--check` selects checks, `--format` prints
  `text`, `json` or `github` annotations, and `--jobs` sets how many generators
  run at the same time.
- `ownership explain <path>`: every rule that reaches a path and where it was
  declared.
- `ownership init` and the `/ownership:init` command: create the root ownership
  file as a skeleton, for a single owner, or derived from the `CODEOWNERS`.
- A session hook that refuses a hand edit of a generated file, declared or
  marked with `generated: do not edit` on its first line.
- `plugins` blocks: configuration that other plugins read, at the top of the
  root file and in each `owned` entry.
- A JSON Schema for the ownership file, for completion and validation in the
  editor.
- The package as a library for other plugins: the resolved configuration, the
  checks, the `CODEOWNERS` evaluation and the generated marker.
```

- [ ] **Step 3: Add the plugin to the marketplace**

Replace `.claude-plugin/marketplace.json` with:

```json
{
  "name": "esliph",
  "description": "",
  "owner": {
    "name": "Dan Ruan",
    "email": "danrsaquetti@gmail.com"
  },
  "plugins": [
    {
      "name": "ownership",
      "description": "Who owns each path of a repository and which files are generated, checked in the agent session and in CI.",
      "version": "0.1.0",
      "source": "./plugins/ownership/plugin"
    }
  ]
}
```

- [ ] **Step 4: Rewrite the row of the root README**

In `README.md`, replace the table under the first paragraph (header, separator and the `ownership` row) with:

```markdown
| Plugin                                     | Use it to                                                                                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ownership`](plugins/ownership/README.md) | Declare, in one file, who owns each path of a repository and which files are generated — and have it checked in the Claude Code session and in CI. |
```

The old row promised a link between code and documents that this plugin no longer has.

- [ ] **Step 5: Add the entry to the root CHANGELOG**

Append to `CHANGELOG.md`, under `## [Unreleased]`:

```markdown
### Added

- The `ownership` plugin: one file says who owns each path of a repository and
  which files are generated, and the plugin checks it in the Claude Code session
  and in CI. Its own changelog is in `plugins/ownership/CHANGELOG.md`.
```

- [ ] **Step 6: Check what was written**

Run:

```bash
node -e "
const m = JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json', 'utf8'))
const p = JSON.parse(require('fs').readFileSync(m.plugins[0].source + '/.claude-plugin/plugin.json', 'utf8'))
if (m.plugins.length !== 1 || p.name !== m.plugins[0].name || p.version !== m.plugins[0].version) throw new Error('marketplace and plugin manifest disagree')
console.log('marketplace ok:', p.name, p.version)
"
grep -nE 'REQ-[A-Z]+-[0-9]+|§' plugins/ownership/README.md plugins/ownership/CHANGELOG.md README.md CHANGELOG.md
(cd plugins/ownership && ../../spur format && ../../spur check)
```

Expected: `marketplace ok: ownership 0.1.0`; no output from `grep`; the check passes (Prettier may realign the tables of the plugin README — that is the formatting to commit).

Then try the examples of the README against the CLI, in a scratch repository, and correct the README wherever the output differs:

```bash
tmp=$(mktemp -d) && git -C "$tmp" init -q && mkdir -p "$tmp/docs/adr" && touch "$tmp/docs/adr/0001.md"
cli="$PWD/plugins/ownership/plugin/src/cli/index.ts"
(cd "$tmp" && node "$cli" init --owner @acme/docs && node "$cli" explain docs/adr/0001.md && node "$cli" validate; echo "exit $?")
rm -rf "$tmp"
```

Expected: `init` reports 2 entries, `explain` prints the five blocks with `CODEOWNERS the repository has no CODEOWNERS`, and `validate` ends with `ownership: no violations found.` and `exit 0`.

- [ ] **Step 7: Commit**

```bash
git add plugins/ownership/README.md plugins/ownership/CHANGELOG.md .claude-plugin/marketplace.json README.md CHANGELOG.md
git commit -m "docs(ownership): document the plugin and list it in the marketplace

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24: The root `Spurfile` and CI

**Files:**
- Create: `Spurfile`
- Create: `.github/workflows/plugin-ownership.yml`

**Interfaces:**
- Consumes: the plugin `Spurfile` (Task 2) and the CLI. The vendored `./spur` runs a task of the `Spurfile` of the current directory; `./spur -C <dir> <task>` runs one of another directory; inside a task, `spur` is the runner itself.
- Produces: the root tasks `install`, `plugins`, `validate` and `check`, and one workflow on Node 24 that runs the plugin's `check`, its `perf` and the repository's `validate`.
- A `Spurfile` is verified by running its tasks, not by a test. Its task bodies are indented with two spaces and the file has LF line ends.
- Commands of this task run from the repository root, in Git Bash on Windows.

- [ ] **Step 1: Write the root Spurfile**

`Spurfile`:

```sh
# The repository's commands. Each plugin with a toolchain owns its commands in
# plugins/<name>/Spurfile; this file only delegates to them. The order is
# load-bearing — a plugin comes after the ones it depends on — so it is written
# here and never taken from a glob.
PLUGINS="ownership"

# Runs one task in every plugin that has it, in order. A plugin owes the root
# nothing: one with no Spurfile, or with a Spurfile that lacks the task, is
# skipped with a notice. The Spurfile is checked here, before delegating,
# because spur searches the parent directories for one and would find this
# file. A name in PLUGINS that is not a directory is a mistake in this file and
# fails. `set -e` stops at the first plugin that fails, with its exit code.
each() {
  for plugin in $PLUGINS; do
    if [ ! -d "plugins/$plugin" ]; then
      echo "plugins/$plugin: listed in PLUGINS, but it does not exist" >&2
      exit 1
    fi
    if [ ! -f "plugins/$plugin/Spurfile" ]; then
      echo "$plugin: no Spurfile, skipped '$1'" >&2
      continue
    fi
    names=$(spur -C "plugins/$plugin" --names)
    if ! printf '%s\n' "$names" | grep -qxF -- "$1"; then
      echo "$plugin: no task '$1', skipped" >&2
      continue
    fi
    spur -C "plugins/$plugin" "$1"
  done
}

install: ## run `install` in every plugin that has it, in order
  each install

plugins: ## run `check` in every plugin that has it, in order
  each check

## The ownership plugin checks the repository that develops it. Arguments go
## to its CLI:
##   ./spur validate --check ownership/owner-coverage
validate: ## validate who owns each path of this repository
  node plugins/ownership/plugin/src/cli/index.ts validate "$@"

## What has to pass before a change is done, in that order.
check: ## install, every plugin's checks and the repository's validation
  spur install
  spur plugins
  spur validate
```

- [ ] **Step 2: Run every task**

Run: `./spur --list`
Expected: the four tasks — `install`, `plugins`, `validate`, `check` — each with its description.

Run: `./spur validate`
Expected: `ownership: no ownership file found; nothing to validate.` and exit 0 — the repository has no ownership file until Task 25.

Run: `./spur validate --format json`
Expected: a JSON object with empty `findings` and `plugins` and zero `errors` and `warnings`, which shows that arguments reach the CLI.

Run: `./spur check`
Expected: `npm ci` in `plugins/ownership/`, then the plugin's tests, type-check, lint and formatting, then the validation; exit 0.

- [ ] **Step 3: Write the workflow**

`.github/workflows/plugin-ownership.yml`:

```yaml
name: plugin-ownership

# No path filter: the last step checks that every file of the repository has
# an owner, and a file added anywhere can break that.
on:
  push:
    branches: [master]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          # The floor is `engines.node` in the plugin's package.json.
          node-version: '24'
          cache: npm
          cache-dependency-path: plugins/ownership/package-lock.json

      - name: Install dependencies
        run: ./spur install

      - name: Tests, type-check, lint and formatting
        run: ./spur plugins

      - name: Performance
        run: ./spur -C plugins/ownership perf

      - name: Validate this repository
        run: ./spur validate --format github
```

- [ ] **Step 4: Check the workflow parses**

Run: `(cd plugins/ownership && npx --no-install prettier --check ../../.github/workflows/plugin-ownership.yml)`
Expected: `All matched files use Prettier code style!` — Prettier parses the YAML to check it, so a syntax error would show here. Every `run:` of the workflow is a command Step 2 already ran, except `perf`, which Task 22 ran.

- [ ] **Step 5: Commit**

```bash
git add Spurfile .github/workflows/plugin-ownership.yml
git commit -m "ci: run the ownership plugin's checks and validate this repository with it

Changelog: none — the toolchain of this repository is not visible to whoever installs a plugin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 25: Dogfooding — this repository passes its own `ownership validate`

**Files:**
- Modify: `CODEOWNERS`
- Create: `.ownership.yml`
- Create: `plugins/ownership/.ownership.yml`

**Interfaces:**
- Consumes: `ownership init --from-codeowners` (Task 17), `./spur validate` (Task 24).
- Produces: the root ownership file, which includes the plugin project's own. Done when `./spur validate` prints `ownership: no violations found.`
- `init` writes entries only; it creates no `include`. The `plugins/ownership/` entry it derives is replaced by hand with the include, and the project declares its own paths.
- Commands of this task run from the repository root.

- [ ] **Step 1: Remove the CODEOWNERS lines of paths that no longer exist**

`CODEOWNERS` becomes:

```text
# Mirrors the `owner` field of the ownership files. One path, one owner.
# Each plugin project is covered as a whole; its own .ownership.yml details it.

docs/superpowers/ @esliph/engineering
CONTRIBUTING.md @esliph/engineering
CLAUDE.md @esliph/engineering
CHANGELOG.md @esliph/engineering
README.md @esliph/engineering
.ownership.yml @esliph/engineering
plugins/ownership/ @esliph/engineering
.github/ @esliph/engineering
.claude-plugin/ @esliph/engineering
CODEOWNERS @esliph/engineering
.editorconfig @esliph/engineering
.gitattributes @esliph/engineering
.gitignore @esliph/engineering
.prettierignore @esliph/engineering
.prettierrc @esliph/engineering
spur @esliph/engineering
Spurfile @esliph/engineering
```

Five lines went away: `docs/decisions/adr/`, `docs/open-decisions.md`, `docs/requirements/`, `docs/definition-of-done.md` and `docs/ids-retired.txt`. `docs/superpowers/` stays: it holds the design and this plan.

- [ ] **Step 2: Create the root ownership file from the CODEOWNERS**

Run: `node plugins/ownership/plugin/src/cli/index.ts init --from-codeowners`

Expected:

```text
ownership: wrote .ownership.yml with 17 entries.
ownership: every repository file has an owner.
ownership: next step: ownership validate
```

If it reports files without an owner, a file exists that no CODEOWNERS line matches: `./spur validate --check ownership/owner-coverage` names it. Add its line to `CODEOWNERS`, delete `.ownership.yml` and run `init` again.

Run: `./spur validate`
Expected: `ownership: no violations found.` — the repository is covered with `plugins/ownership/` as one entry.

- [ ] **Step 3: Replace the plugin's entry with an include**

In `.ownership.yml`, remove the two lines of the `plugins/ownership/` entry and add the `include:` block at the end. The file becomes:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json
version: 1

owned:
  - path: .claude-plugin/
    owner: "@esliph/engineering"
  - path: .editorconfig
    owner: "@esliph/engineering"
  - path: .gitattributes
    owner: "@esliph/engineering"
  - path: .github/
    owner: "@esliph/engineering"
  - path: .gitignore
    owner: "@esliph/engineering"
  - path: .ownership.yml
    owner: "@esliph/engineering"
  - path: .prettierignore
    owner: "@esliph/engineering"
  - path: .prettierrc
    owner: "@esliph/engineering"
  - path: CHANGELOG.md
    owner: "@esliph/engineering"
  - path: CLAUDE.md
    owner: "@esliph/engineering"
  - path: CODEOWNERS
    owner: "@esliph/engineering"
  - path: CONTRIBUTING.md
    owner: "@esliph/engineering"
  - path: README.md
    owner: "@esliph/engineering"
  - path: Spurfile
    owner: "@esliph/engineering"
  - path: docs/superpowers/
    owner: "@esliph/engineering"
  - path: spur
    owner: "@esliph/engineering"

# Each plugin project declares its own paths, relative to its directory.
include:
  - plugins/ownership/
```

Run: `./spur validate`
Expected: exit 2, with

```text
.ownership.yml:40: include[0] names the directory plugins/ownership/, which holds no ownership file
  → add .ownership.yml to it, or name the file to include
```

- [ ] **Step 4: Declare the paths of the plugin project**

`plugins/ownership/.ownership.yml`:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json
# The paths of the ownership plugin project, relative to this directory. The
# root ownership file includes this one.
version: 1

owned:
  # What the plugin must do, and what is told to whoever installs it.
  - path: docs/
    owner: '@esliph/engineering'
  - path: README.md
    owner: '@esliph/engineering'
  - path: CHANGELOG.md
    owner: '@esliph/engineering'
  - path: .ownership.yml
    owner: '@esliph/engineering'

  # What is installed, and its tests.
  - path: plugin/
    owner: '@esliph/engineering'
  - path: test/
    owner: '@esliph/engineering'

  # The toolchain of the project.
  - path: .gitignore
    owner: '@esliph/engineering'
  - path: Spurfile
    owner: '@esliph/engineering'
  - path: eslint.config.mjs
    owner: '@esliph/engineering'
  - path: package.json
    owner: '@esliph/engineering'
  - path: package-lock.json
    owner: '@esliph/engineering'
  - path: tsconfig.json
    owner: '@esliph/engineering'
  - path: tsconfig.build.json
    owner: '@esliph/engineering'
```

- [ ] **Step 5: Validate**

Run: `./spur validate`
Expected: `ownership: no violations found.` and exit 0. All three checks ran: every file has an owner, every declared path has its owner on the CODEOWNERS line that decides, and no file carries the generated marker.

Run: `node plugins/ownership/plugin/src/cli/index.ts explain plugins/ownership/plugin/src/index.ts`
Expected:

```text
path       plugins/ownership/plugin/src/index.ts
owned      plugins/ownership/plugin/  owner @esliph/engineering  skill —  (plugins/ownership/.ownership.yml:18)
generated  —
ignore     —
CODEOWNERS line 10: @esliph/engineering — declared owner listed
```

Then see the check catch a file nobody owns:

```bash
touch stray.txt && ./spur validate; echo "exit $?"; rm stray.txt
```

Expected: `stray.txt  ownership/owner-coverage  error  no owned entry covers this file`, `ownership: 1 error, 0 warnings.` and `exit 1`.

Run: `./spur check`
Expected: exit 0. The plugin's formatter now reads `plugins/ownership/.ownership.yml` too; if it reformats the file, that is the formatting to commit.

- [ ] **Step 6: Commit**

```bash
git add CODEOWNERS .ownership.yml plugins/ownership/.ownership.yml
git commit -m "chore: declare who owns each path of this repository

The root ownership file comes from ownership init --from-codeowners; the
ownership plugin project declares its own paths in a file the root
includes. CODEOWNERS loses the lines of paths that no longer exist.

Changelog: none — who owns the paths of this repository is not visible to whoever installs a plugin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 26: `CLAUDE.md` and `CONTRIBUTING.md` without the references that died

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes: what exists after Task 25 — the `ownership` plugin, its two checks of ownership, its guard and its drift check, `./spur check`.
- Produces: the two documents pointing only at things that exist. No policy is added. What goes away is what named a mechanism that is gone: artifact IDs, the definition of done, open decisions, frozen decision records, code-to-document watches and their hooks, recorded debt, review dates, the audience mark and the skill that kept these documents.
- Commands of this task run from the repository root.

- [ ] **Step 1: See the dead references**

Run: `grep -nE 'RN-|RNF-|ADR-|DA-|TDR|last-reviewed|watches|watch-reminder|commit-guard|definition-of-done|open-decision|/debt|working-agreements|audience: external|consumer-change-logged|living-documentation' CLAUDE.md CONTRIBUTING.md`
Expected: more than twenty lines.

- [ ] **Step 2: Rewrite `CLAUDE.md`**

`CLAUDE.md`:

```markdown
# Agent contract — esliph agent plugins

Index and policy for every plugin in this marketplace. **No factual claim lives
here**: each one lives in the artifact that owns it and is read from there. A
plugin's toolchain and commands are in its `Spurfile` and its `README.md`.

## Before touching anything

- Who owns each path is in `.ownership.yml` and the files it includes, one per
  plugin project under `plugins/<name>/`. No path is guessed: it is read from
  there.
- How we work here: `CONTRIBUTING.md`.
- What a plugin must do is in its own `docs/requirements/`.

## Policy

- **The rule comes before the code.** What a plugin must do is in its
  `docs/requirements/`; if the rule does not exist, stop and ask. Do not invent
  the rule that is missing.
- **You do not edit a generated artifact.** What is in `generated[]` (or carries
  the marker) changes through the source and the generator —
  `ownership/generated-guard` denies and `ownership/generated-drift` enforces.
- **A change visible to whoever consumes travels with an entry in the
  `CHANGELOG.md` of the plugin it changes** — or with the reason written in the
  commit, as `Changelog: none — <reason>`.
- **Text for readers on the outside carries no requirement ID.** A README and a
  CHANGELOG explain in running text; the ID stays in the requirements.
- **What a plugin ships does not point inside this repository.** A skill, a
  command and a CLI or hook message stay free of requirement IDs and of paths
  from here; the why goes into the code comment — the distribution test
  enforces it.
- **Every file has a declared owner.** An ownership file says who owns it;
  CODEOWNERS, who reviews — `ownership/owner-coverage` and
  `ownership/codeowners-match` enforce both.
- **Tests and commits cite no requirement ID.** A test name says the behavior
  it proves; a commit message uses `type(scope): subject`.

## What to never do

- Write a document that narrates the code.
- Create a documentation artifact outside a `docs/` or outside version control.
- Copy the content of any artifact above into here.
```

- [ ] **Step 3: Rewrite `CONTRIBUTING.md`**

`CONTRIBUTING.md` (the front matter goes away: who owns the file is in `.ownership.yml`, and nothing reads a review date any more):

````markdown
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
````

- [ ] **Step 4: Check nothing dead is left and every path named exists**

Run the `grep` of Step 1 again.
Expected: no output.

Run:

```bash
for path in .ownership.yml CODEOWNERS CONTRIBUTING.md CHANGELOG.md Spurfile spur .claude-plugin/marketplace.json docs/superpowers/specs plugins/ownership/docs/requirements plugins/ownership/README.md plugins/ownership/CHANGELOG.md plugins/ownership/Spurfile; do
  [ -e "$path" ] || echo "missing: $path"
done
```

Expected: no output — every artifact the two documents send a reader to is there.

- [ ] **Step 5: The whole branch, one last time**

Run: `./spur check`
Expected: exit 0 — dependencies, the plugin's tests, type-check, lint and formatting, and `ownership: no violations found.` for the repository.

Run: `./spur -C plugins/ownership perf`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md CONTRIBUTING.md
git commit -m "docs: point the agent contract and the contributing guide at what exists

Changelog: none — how this repository is developed is not visible to whoever installs a plugin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
