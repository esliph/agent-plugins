# The `ownership` Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `plugins/ownership/` from its requirements specification: the ownership file loader, the three core checks, the `validate`/`explain`/`init` CLI, the `generated-guard` hook, the `/ownership:init` slash command, the published JSON Schema and the library surface — then make the repository pass its own `ownership validate`.

**Architecture:** One package, `@esliph/ownership`, in `plugins/ownership/plugin/`, run from TypeScript by Node's type stripping. The loader parses each ownership file with `yaml` into a raw file with key paths and lines, follows includes depth-first, confines paths to each file's base, checks the relations between every declared path while inserting them into a trie keyed by path segment, and returns a deeply frozen configuration. Checks take a `CheckContext` (configuration, the repository files enumerated once by Git, CODEOWNERS on demand, `jobs`) and return `Finding[]`, which the CLI sorts and formats.

**Tech Stack:** Node ≥ 24 (type stripping, `node:test`, `node:util.parseArgs`), TypeScript 5.9 (type-check only, `tsc` emits `dist/` only at pack time), `yaml` (only runtime dependency), `ajv` (dev only, schema test), ESLint + Prettier, the vendored `./spur` runner, Git.

**Spec:** `docs/superpowers/specs/2026-10-09-ownership-plugin-design.md` (the design) and, once Task 1 lands, `plugins/ownership/docs/requirements/ownership.md` (the requirements). The Portuguese original of the requirements is `C:\Users\conta\Downloads\ownership-especificacao.md`; it is the input of Task 1 and is never versioned.

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
- Commands are run from `plugins/ownership/` unless a step says otherwise; on Windows, run them in Git Bash.

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
git add plugins/ownership/docs/requirements/ownership.md
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
git add plugins/ownership/.gitignore plugins/ownership/package.json plugins/ownership/package-lock.json plugins/ownership/tsconfig.json plugins/ownership/tsconfig.build.json plugins/ownership/eslint.config.mjs plugins/ownership/Spurfile plugins/ownership/plugin/package.json plugins/ownership/plugin/package-lock.json plugins/ownership/plugin/.claude-plugin/plugin.json plugins/ownership/plugin/src/errors.ts plugins/ownership/test
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
git add plugins/ownership/plugin/src/paths plugins/ownership/test/paths
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
git add plugins/ownership/plugin/src/schema plugins/ownership/test/schema
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
  - `listRepoFiles(root: string): ReadonlySet<string>` — sorted, NFC, repository-relative with `/`; tracked plus untracked that no `.gitignore` excludes, minus tracked files deleted from the work tree; a submodule, a symbolic link and an untracked nested repository are one entry each, without a trailing `/`. One `git ls-files` for the listing, one for the deleted files.

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
 */
export function listRepoFiles(root: string): ReadonlySet<string> {
  const listed = entries(git(root, ['-c', 'core.quotePath=false', 'ls-files', '-z', '--cached', '--others', '--exclude-per-directory=.gitignore']))
  const deleted = new Set(entries(git(root, ['-c', 'core.quotePath=false', 'ls-files', '-z', '--deleted'])))

  return new Set([...new Set(listed.filter(entry => !deleted.has(entry)))].sort())
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node --test test/repo/repo.test.ts`
Expected: PASS (7 tests; the symbolic-link test may report SKIP on Windows without the privilege).

- [ ] **Step 5: Commit**

```bash
../../spur format && ../../spur check
git add plugins/ownership/plugin/src/repo plugins/ownership/test/repo
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
git add plugins/ownership/plugin/src/resolve plugins/ownership/test/resolve
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
git add plugins/ownership/plugin/src/resolve/load.ts plugins/ownership/test/resolve/load.test.ts
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
git add plugins/ownership/plugin/src/resolve plugins/ownership/test/resolve/resolve.test.ts
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
git add plugins/ownership/plugin/src/codeowners plugins/ownership/test/codeowners
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
git add plugins/ownership/plugin/src/generated plugins/ownership/plugin/src/checks plugins/ownership/test/generated plugins/ownership/test/checks plugins/ownership/test/helpers/check.ts
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
git add plugins/ownership/plugin/src/checks plugins/ownership/test/checks
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
    'tools/marked.mjs': "process.stdout.write('<!-- generated: do not edit -->\\n')\n",
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
git add plugins/ownership/plugin/src/checks plugins/ownership/test/checks
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
git add plugins/ownership/plugin/src/resolve plugins/ownership/test/resolve
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
  assert.match(coverage.stdout, /CODEOWNERS  ownership\/owner-coverage/)
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
git add plugins/ownership/plugin/src/cli plugins/ownership/test/cli
git commit -m "feat(ownership): the CLI and ownership validate, in text, json and github formats

Changelog: none — the plugin is not published yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Not written yet

This plan stops at Task 14. The tasks still to write, in order: 15 `ownership explain`; 16 init derivation and rendering; 17 `ownership init`; 18 the JSON Schema and its corpus test; 19 the `generated-guard` hook; 20 the public surface and the distribution tests; 21 the `/ownership:init` slash command; 22 the performance test; 23 README, CHANGELOG and the marketplace entry; 24 the root `Spurfile` and CI; 25 dogfooding; 26 `CLAUDE.md` and `CONTRIBUTING.md`.
