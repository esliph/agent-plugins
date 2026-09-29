# Living Documentation Toolkit — Phase 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tie code to documentation at the cheapest point — deliver **Phase 3** of the spec: the `watches` field stops being decorative, `HK-4` reminds the owning doc after a watched path is edited, `HK-5` asks before a `git commit` that carries code without the doc, and `SK-6` `working-agreements-keeper` becomes the owner of `CONTRIBUTING.md`, `docs/definition-of-done.md` and the agent contract.

**Predecessor:** `docs/superpowers/plans/2026-08-24-living-docs-toolkit-phase-2.md` (`DA-0001` + Phase 2) and, before it, `docs/superpowers/plans/2026-08-24-living-docs-toolkit-core.md` (Phases 0–1). The Global Constraints of both apply here in full and are not repeated line by line. The input for this phase is `docs/superpowers/plans/BACKLOG-phases-3-7.md`, section "Phase 3".

**Architecture:**

Three things of different natures, in this order because each one consumes the previous one.

1. **`watches` becomes engine.** Today the field is read and validated by `src/config/ownership.ts` and **no rule fills it in** — it exists in the type and does not exist in the world. Phase 3 introduces `src/config/watches.ts`, a module with a single question: _given a set of paths, which docs do they require, and which of those docs do they not touch_. `HK-4` asks this question with one path; `HK-5` asks it with the whole git index; `CI-7`, in Phase 7, will ask it with the PR diff. None of the three learns any project path: the whole answer comes from `docs/.ownership.yml`.

2. **Two new hooks, and both are the first of their kind.** `HK-4` is the first `PostToolUse` — the output is not `permissionDecision`, it is `additionalContext`, and that is why `src/hooks/lib/io.ts` gains a second formatter. `HK-5` is the first `PreToolUse` with a `Bash` matcher: it does not receive `file_path`, it receives `command`, and to know what is in the commit it must ask git — which brings `src/git/staged.ts`, the first module of the toolkit that runs a subprocess. Both obey the same rule: **they never deny**. `HK-4` informs, `HK-5` asks. A reminder that blocks is uninstalled at the first legitimate shortcut, and then no reminder is left.

3. **`SK-6` closes the loop in the document people read.** The Definition of Done is mechanism 1 written where it is consulted ("the update of the owning doc fits in the same PR"), and it is what Phase 7 will turn into `CI-7`. The agent contract (`CLAUDE.md`) is born in this phase and is born **an index and policy, not content** — the test that guards it exists because the alternative is for it to rot like any other duplicated document.

**Tech Stack:** the same — Node 24 with native type-stripping (imports with the `.ts` extension), `node:test`, TypeScript 5.9 only as a type-checker (`erasableSyntaxOnly`), `yaml`, `picomatch`, `git` (new consumer, already present in the image), Docker + Compose as the only runtime.

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` — §3 (`watches` in `.ownership.yml`), §5 (`SK-6`), §7 (`HK-4`, `HK-5`, non-functional requirements of the hooks), §10 (Phase 3 and the `small-team` stage), §11 (authoring conventions), §12 (acceptance criteria 5 and 9).

## Global Constraints

Those of the previous plans apply — no `node`/`npm`/`npx` on the host (Docker only), no build step, imports with `.ts`, hook with timeout ≤ 5 s and fail-open and zero network, hook never judges intent, identifiers in English and prose in pt-BR, commit message citing the affected ID, ID never recycled, one artifact one owner, no absolute container path in `src/` or `test/`. Added to them:

- **The enforcement of mechanism 1 never denies.** `HK-4` only emits `additionalContext`; `HK-5` only emits `permissionDecision: "ask"`. The word `deny` does not appear in `src/hooks/hk4-*.ts` nor in `src/hooks/hk5-*.ts`, and there is a test that fails the regression (spec §7; `RN-0009`).
- **No project path enters `src/`.** Every code glob and every doc path comes from `watches` in `.ownership.yml`. A literal `'src/domain/**'` or `'CHANGELOG.md'` inside `src/` is grounds to fail the step — its place is `docs/.ownership.yml` (of this repository) or `templates/ownership.yml` (of the consumers).
- **Fail-open covers git too.** `git` missing, empty index, repository without `.git`, `dubious ownership`, timeout: all result in silently letting it pass. `HK-5` never asks "just in case".
- **`git` is read, never written.** The toolkit does not `add`, `commit`, `stash` or `checkout` on anyone's behalf. `src/git/staged.ts` runs exactly one read command.
- **Scope locked in Phase 3:** `src/config/watches.ts`, `src/git/staged.ts`, `HK-4`, `HK-5`, `SK-6` + `CONTRIBUTING.md` + `docs/definition-of-done.md` + agent contract, and what the `small-team` stage of `init` now installs. **Out of this plan:** `SK-1`, `SK-2`, `SK-5`, `SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-6`, `HK-7`, `CI-4`–`CI-8`, `CM-4`, `CM-5`, `CM-7`, `src/git/diff.ts`, `CheckContext.today`. Do not implement anything from that list, not even "just the skeleton".
- **Phase 3 gets no command and no check.** Spec §10 defines no command for `SK-6`: the skill is selected by the `description`. And no new `CI-*` enters here — the `CHECKS` of `src/checks/registry.ts` stays at three checks. Do not invent `CM-8` or `CI-9`.
- **Criterion 5 closes by half, and this is said out loud.** "Given a PR that changes a watched path without touching the owning doc, when a commit is attempted, then `HK-5` asks and lists the pending ones" — this is Phase 3. "**and** the CI flags it through `watches`" is `CI-7`, Phase 7. The README says which half is delivered; no test is written to pretend the other one.
- **Everything runs in the container.** `docker compose exec toolkit npm test`, `docker compose exec toolkit npm run typecheck`, `./bin/living-docs validate`. No direct `node` command on the host (`RNF-0002`).

---

## File structure

New (`+`) and changed (`~`). What does not appear here does not change.

```
+ src/config/watches.ts                 # "which docs does this set of paths require" — HK-4, HK-5 and, in Phase 7, CI-7
+ src/git/staged.ts                     # the git index, with fail-open and an injectable runner
+ src/hooks/hk4-watch-reminder.ts       # HK-4 — PostToolUse, additionalContext
+ src/hooks/hk5-commit-guard.ts         # HK-5 — PreToolUse/Bash, ask

~ src/hooks/lib/io.ts                   # contextOutput(): the output that is not a permission decision
~ src/cli/init.ts                       # small-team installs the working agreements; notInstalled shrinks

+ templates/contributing.md             # seed of CONTRIBUTING.md
+ templates/definition-of-done.md       # seed of docs/definition-of-done.md
+ templates/agent-contract.md           # seed of CLAUDE.md (or AGENTS.md, if it already exists)
~ templates/CODEOWNERS                  # owner of the working agreements
~ templates/ownership.yml               # `watches` stays empty, but with a commented example: init does not invent links

+ plugin/skills/working-agreements-keeper/SKILL.md   # SK-6
~ plugin/hooks/hooks.json               # + PostToolUse (Edit|Write) and + PreToolUse (Bash)
~ plugin/.claude-plugin/plugin.json     # description: Phases 0–3

+ test/config/watches.test.ts
+ test/git/staged.test.ts
+ test/hooks/hk4-watch-reminder.test.ts
+ test/hooks/hk5-commit-guard.test.ts
+ test/docs/agent-contract.test.ts
~ test/cli/init.test.ts                 # RF-0004
~ test/plugin/manifest.test.ts          # three hook groups, not one
~ test/plugin/authoring.test.ts         # SK-6-specific assertions
~ test/acceptance/spec-criteria.test.ts # criterion 5

+ CONTRIBUTING.md                       # dogfooding of SK-6
+ CLAUDE.md                             # dogfooding of SK-6 — index and policy, never content
+ docs/definition-of-done.md            # dogfooding of SK-6
~ docs/requirements/rules.md            # + RN-0008, RN-0009, RN-0010
~ docs/requirements/functional.md       # + RF-0004
~ docs/.ownership.yml                   # `watches` filled in — the dogfooding of mechanism 1
~ docs/open-decisions.md                # + DA-0002 (artifact without an ID family)
~ CODEOWNERS  README.md
```

**Why these files and not others.** `watches.ts` lives in `src/config/` because it answers a question about configuration, not about a document — `src/docs/` reads an artifact, `src/config/` reads the map. `staged.ts` lives in `src/git/` alone because Phase 6 will put `diff.ts` next to it: they are the same family (what git knows and the file system does not), and separating them now avoids a `src/git.ts` that grows until nobody can read it. The two hooks are independent files because that is how `hooks.json` invokes them — one process per hook.

---

### Task 1: The Phase 3 requirements, in `draft`

**Objective:** write the rule **before** the code, which is the rule the toolkit itself imposes (`SK-4`, rule 1; acceptance criterion 4). They are born in `draft`; promotion to `active` is a human act and happens in Task 9, after the tests already cite them — `CI-3` demands a citation for an `active` requirement, and an `active` requirement without coverage fails the repository itself.

**Files:**

- Modify: `docs/requirements/rules.md` (adds `RN-0008`, `RN-0009`, `RN-0010` at the end; updates `last-reviewed`)
- Modify: `docs/requirements/functional.md` (adds `RF-0004`; updates `last-reviewed`)

**Interfaces:**

- Consumes: the section format of `templates/requirements.md`, already in use in Phases 0–2.
- Produces: the IDs `RN-0008`, `RN-0009`, `RN-0010` and `RF-0004`, cited by the tests of Tasks 2 to 9. No other new ID is born in this phase.

**Requirements:**

- All four are born `status: draft`. **Do not promote.** `HK-3` returns `ask`, and the answer is not the agent's.
- The ID comes in sequence: the last ones used are `RN-0007` and `RF-0003`. Check `docs/ids-retired.txt` first (it is empty; check anyway — it is the habit the rule protects).
- Each requirement carries `out of scope`, which is the field that prevents silent widening.
- None of them describes what the code does. They describe what the system **must** be.

- [ ] **Step 1: Add the three business rules**

At the end of `docs/requirements/rules.md`, after `RN-0007`:

```markdown
## RN-0008 — Watched path and owning doc travel in the same commit

- **status:** draft
- **relates-to:** RN-0001
- **out of scope:** which path requires which doc, which is project configuration and lives in `watches`

A code path declared in `watches` has an owning document, and the change to
both fits in the same commit. Documentation that waits for a second PR is
documentation that does not happen: whoever would postpone it already has the
context in their head now, and will not later.

When the change really does not affect the doc, deciding that is up to a
person, at the moment the enforcement asks — not the agent, and not silence.

## RN-0009 — The enforcement of the code→doc link reminds and asks, never denies

- **status:** draft
- **relates-to:** RN-0008
- **out of scope:** the freezing of an immutable item (`RN-0006`), which denies for another reason

What links code to a document informs (`additionalContext`) or asks
(`ask`). It never blocks. A legitimate shortcut exists and must be possible: the
enforcement that prevents an honest commit is turned off on the first day, and an
enforcement that is turned off protects nothing.

This does not loosen `RN-0006`: a frozen item is still `deny`. The difference is
what is protected — there, a history that is not rewritten; here, a habit that is
taught.

## RN-0010 — The agent contract is an index and policy, not content

- **status:** draft
- **out of scope:** the automatic detection of textual duplication, which is `CI-7` and arrives in Phase 7

The document that guides agents (`CLAUDE.md`, `AGENTS.md`) points to where the truth
lives and declares what to never do. Every factual claim lives in the owning
artifact and is linked from there.

Content copied into it rots like any duplicate — with the
aggravating factor of being read in every session, which makes the old version win over the new
one by repetition.
```

- [ ] **Step 2: Add the functional requirement**

At the end of `docs/requirements/functional.md`:

```markdown
## RF-0004 — `init --stage small-team` installs the working agreements

- **status:** draft
- **relates-to:** RF-0002
- **out of scope:** filling in `watches`, which requires knowing the project's code and is a human act

In the `small-team` stage, `living-docs init` creates `CONTRIBUTING.md`, the Definition
of Done and the agent contract. On finding `AGENTS.md`, it adopts it as the contract
instead of creating a parallel `CLAUDE.md`; on finding any of them already written,
it keeps the content intact.

What the command does **not** do is invent `watches`: a code→doc link that
nobody recognizes is noise that teaches people to ignore the reminder.
```

- [ ] **Step 3: Update `last-reviewed` of the two files**

In `docs/requirements/rules.md` and `docs/requirements/functional.md`, the frontmatter field becomes `last-reviewed: 2026-08-25`. Do not touch `docs/requirements/non-functional.md` — it did not change, and a `last-reviewed` bump without a change is anti-requirement no. 8 of spec §13.

- [ ] **Step 4: Run the checks**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: green tests and `exit=0`. The new requirements are in `draft`, so `CI-3` does not yet demand a citation for them. If `CI-1` complains about `status`, check that the value is exactly `draft`.

- [ ] **Step 5: Commit**

```bash
git add docs/requirements
git commit -m "docs(RN-0008..RN-0010, RF-0004): Phase 3 requirements in draft"
```

---

### Task 2: `src/config/watches.ts` — which docs does this set of paths require

**Objective:** the missing engine piece. One question, three consumers (`HK-4`, `HK-5` and, in Phase 7, `CI-7`), zero embedded paths.

**Files:**

- Create: `src/config/watches.ts`
- Test: `test/config/watches.test.ts`

**Interfaces:**

- Consumes: `OwnershipConfig`, `WatchRule` and `findArtifactRule` from `src/config/ownership.ts` (already exist, unchanged); `picomatch`.
- Produces, for Tasks 4, 5 and 9:
  - `interface WatchMatch { doc: string; reason: string | null; consumerVisible: boolean; matched: string[]; skill: string | null; owner: string | null }`
  - `watchesFor(config: OwnershipConfig, paths: readonly string[]): WatchMatch[]`
  - `pendingDocs(config: OwnershipConfig, paths: readonly string[]): WatchMatch[]`
  - `coversDoc(doc: string, paths: readonly string[]): boolean`

**Requirements:**

- Groups by **doc**, not by rule: two `watches` entries that point to the same doc produce a single requirement, with the paths added together.
- `skill` and `owner` come from `findArtifactRule` when the doc is a declared artifact, and are `null` when it is not. **This is not an error:** `CONTRIBUTING.md` is a legitimate owning doc and has no ID family — it is the gap that Task 9 records as `DA-0002`.
- Normalizes `\` to `/` and removes `./` before matching. The `file_path` of a hook arrives in the host's format, which on Windows uses a backslash.
- A doc declared as a directory (`docs/requirements/`) is covered by any file inside it; declared as a file, only by equality.
- `watches: []` returns `[]`, always. It is the state of Phases 0–2 and cannot become an exception in the code.

- [ ] **Step 1: Write the failing test**

`test/config/watches.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseOwnership } from '../../src/config/ownership.ts'
import { coversDoc, pendingDocs, watchesFor } from '../../src/config/watches.ts'

const CONFIG = parseOwnership(`
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "new behavior requires a rule with an ID before the code"
  - code: "src/**/errors/**"
    doc: docs/contracts/errors.md
  - code: "src/domain/order/**"
    doc: docs/requirements/rules.md
    reason: "another reason, same doc"
`)

const SEM_WATCHES = parseOwnership(`
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
`)

test('RN-0008: watched path names the owning doc, who maintains it and why', () => {
  const matches = watchesFor(CONFIG, ['src/domain/refund.ts'])
  assert.equal(matches.length, 1)
  assert.equal(matches[0]?.doc, 'docs/requirements/rules.md')
  assert.equal(matches[0]?.skill, 'requirements-keeper')
  assert.equal(matches[0]?.owner, '@team')
  assert.match(String(matches[0]?.reason), /rule with an ID before the code/)
  assert.deepEqual(matches[0]?.matched, ['src/domain/refund.ts'])
})

test('RN-0008: path outside watches requires no doc at all', () => {
  assert.deepEqual(watchesFor(CONFIG, ['README.md', 'test/helpers/tmp.ts']), [])
})

test('doc without a declared artifact is required all the same, just without a skill', () => {
  const [match] = watchesFor(CONFIG, ['src/api/errors/not-found.ts'])
  assert.equal(match?.doc, 'docs/contracts/errors.md')
  assert.equal(match?.skill, null)
  assert.equal(match?.owner, null)
})

test('two rules for the same doc become a single requirement, with the paths added together', () => {
  const matches = watchesFor(CONFIG, ['src/domain/order/item.ts', 'src/domain/refund.ts'])
  assert.equal(matches.length, 1)
  assert.deepEqual(matches[0]?.matched, ['src/domain/order/item.ts', 'src/domain/refund.ts'])
})

test('RN-0008: the doc touched in the same set leaves the list of pending ones', () => {
  const paths = ['src/domain/refund.ts', 'docs/requirements/rules.md']
  assert.equal(watchesFor(CONFIG, paths).length, 1)
  assert.deepEqual(pendingDocs(CONFIG, paths), [])
})

test('RN-0008: without the doc, the pending item remains', () => {
  const pending = pendingDocs(CONFIG, ['src/domain/refund.ts'])
  assert.equal(pending.length, 1)
  assert.equal(pending[0]?.doc, 'docs/requirements/rules.md')
})

test('doc declared as a directory is covered by any file inside it', () => {
  assert.equal(coversDoc('docs/requirements/', ['docs/requirements/rules.md']), true)
  assert.equal(coversDoc('docs/requirements/', ['docs/glossary.md']), false)
  assert.equal(coversDoc('docs/requirements/rules.md', ['docs/requirements/rules.md']), true)
  assert.equal(coversDoc('docs/requirements/rules.md', ['docs/requirements/']), false)
})

test('path in host format is normalized before matching', () => {
  assert.equal(watchesFor(CONFIG, ['src\\domain\\refund.ts']).length, 1)
  assert.equal(watchesFor(CONFIG, ['./src/domain/refund.ts']).length, 1)
})

test('without `watches`, nothing is required — it is the state of Phases 0 to 2', () => {
  assert.deepEqual(watchesFor(SEM_WATCHES, ['src/domain/refund.ts']), [])
  assert.deepEqual(pendingDocs(SEM_WATCHES, ['src/domain/refund.ts']), [])
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/config/watches.test.ts
```

Expected: FAIL — `Cannot find module '.../src/config/watches.ts'`.

- [ ] **Step 3: Write `src/config/watches.ts`**

```typescript
import picomatch from 'picomatch'
import { findArtifactRule } from './ownership.ts'
import type { OwnershipConfig } from './ownership.ts'

export interface WatchMatch {
  /** Required owning doc, normalized. */
  doc: string
  /** Why the link exists. The text is the project's; the toolkit only carries it. */
  reason: string | null
  /** `consumer-visible: true` in any of the rules that point to this doc (CI-6, Phase 6). */
  consumerVisible: boolean
  /** Paths of the set that triggered the requirement, without repetition and in the order they came. */
  matched: string[]
  /** Skill that owns the doc, when the doc is a declared artifact; null when it is not. */
  skill: string | null
  owner: string | null
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/**
 * Is the doc covered by any of these paths? A doc declared as a directory is
 * covered by what is inside it; declared as a file, only by equality.
 */
export function coversDoc(doc: string, paths: readonly string[]): boolean {
  const target = normalize(doc)
  return paths.some(path => {
    const candidate = normalize(path)
    return target.endsWith('/') ? candidate.startsWith(target) : candidate === target
  })
}

/**
 * Which docs this set of paths requires, grouped by doc.
 *
 * It is the only question `watches` answers, and it is asked by `HK-4` (with one
 * path), by `HK-5` (with the whole index) and, in Phase 7, by `CI-7` (with the
 * diff). None of them knows a project path: everything comes from `.ownership.yml`.
 */
export function watchesFor(config: OwnershipConfig, paths: readonly string[]): WatchMatch[] {
  const normalized = paths.map(normalize)
  const byDoc = new Map<string, WatchMatch>()

  for (const watch of config.watches) {
    const matches = picomatch(watch.code)
    const hits = normalized.filter(path => matches(path))
    if (hits.length === 0) continue

    const doc = normalize(watch.doc)
    const existing = byDoc.get(doc)
    if (existing) {
      existing.reason = existing.reason ?? watch.reason
      existing.consumerVisible = existing.consumerVisible || watch.consumerVisible
      for (const hit of hits) if (!existing.matched.includes(hit)) existing.matched.push(hit)
      continue
    }

    // A doc that is not a declared artifact is still an owning doc: whoever answers
    // for it is CODEOWNERS. The absence of a skill is information, not an error.
    const rule = findArtifactRule(config, doc)
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

/** Docs that these paths require and that they do not touch — mechanism 1 (spec §7). */
export function pendingDocs(config: OwnershipConfig, paths: readonly string[]): WatchMatch[] {
  return watchesFor(config, paths).filter(match => !coversDoc(match.doc, paths))
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
docker compose exec toolkit node --test test/config/watches.test.ts
docker compose exec toolkit npm run typecheck
```

Expected: PASS on the ten tests; clean type-check.

- [ ] **Step 5: Commit**

```bash
git add src/config/watches.ts test/config/watches.test.ts
git commit -m "feat(RN-0008): watches answers which docs a set of paths requires"
```

---

### Task 3: `src/git/staged.ts` — the git index, with fail-open

**Objective:** `HK-5` needs to know what is in the commit before it exists. It is the only source of that information, and it is the first time the toolkit runs a subprocess.

**Files:**

- Create: `src/git/staged.ts`
- Test: `test/git/staged.test.ts`

**Interfaces:**

- Consumes: `node:child_process`.
- Produces, for Task 5:
  - `type GitRunner = (args: readonly string[], cwd: string) => string`
  - `stagedPaths(root: string, run?: GitRunner): string[]`

**Requirements:**

- One command, a read one: `git -c safe.directory=* diff --cached --name-only -z`.
  - `-z` separates by NUL byte: without it, git **escapes and wraps in quotes** a path with an accent or space, and the path stops matching the globs of `watches`.
  - `-c safe.directory=*` exists because the hook runs inside the container, with a uid different from the owner of the mounted checkout; without it git refuses the repository with `dubious ownership` and the hook goes silent precisely when it should speak.
- Timeout of 3 s — the budget of the whole hook is 5 s (spec §7), and there is still the reading of `.ownership.yml`.
- **Any** error returns `[]`. No `.git`, no `git` in the PATH, timeout, exit ≠ 0: empty list. `HK-5` translates an empty list into "let it pass".
- The runner is injectable so that the test does not depend on a real repository — and there is a test with a real repository anyway, because the format of git's output is the half that a fake does not prove.

- [ ] **Step 1: Write the failing test**

`test/git/staged.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { stagedPaths } from '../../src/git/staged.ts'
import type { GitRunner } from '../../src/git/staged.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const NUL = String.fromCharCode(0)

test('RN-0008: returns the paths of the index, without an empty entry', () => {
  const fake: GitRunner = () => `src/domain/a.ts${NUL}docs/requirements/rules.md${NUL}`
  assert.deepEqual(stagedPaths('/any', fake), ['src/domain/a.ts', 'docs/requirements/rules.md'])
})

test('empty index returns an empty list', () => {
  assert.deepEqual(
    stagedPaths('/any', () => ''),
    [],
  )
})

test('RNF-0001: a git error does not block the work — returns an empty list', () => {
  const explode: GitRunner = () => {
    throw new Error('fatal: not a git repository')
  }
  assert.deepEqual(stagedPaths('/any', explode), [])
})

test('the command executed is a read one, and only one', () => {
  const seen: string[][] = []
  const spy: GitRunner = args => {
    seen.push([...args])
    return ''
  }
  stagedPaths('/any', spy)
  assert.equal(seen.length, 1)
  assert.deepEqual(
    seen[0]?.filter(arg => ['add', 'commit', 'checkout', 'stash', 'reset'].includes(arg)),
    [],
  )
  assert.ok(seen[0]?.includes('--cached'))
  assert.ok(seen[0]?.includes('-z'))
})

test('reads the index of a real repository', () => {
  withTempRepo({ 'src/a.ts': 'export const a = 1;\n' }, root => {
    const git = (...args: string[]): void => {
      execFileSync('git', args, { cwd: root, stdio: 'ignore' })
    }
    try {
      git('init', '-q')
    } catch {
      return // no git in the environment: nothing to prove here
    }
    git('-c', 'user.email=test@example.dev', '-c', 'user.name=Test', 'commit', '-q', '-m', 'seed', '--allow-empty')
    git('add', 'src/a.ts')

    assert.deepEqual(stagedPaths(root), ['src/a.ts'])
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/git/staged.test.ts
```

Expected: FAIL — `Cannot find module '.../src/git/staged.ts'`.

- [ ] **Step 3: Write `src/git/staged.ts`**

```typescript
import { execFileSync } from 'node:child_process'

/** Git executor, injectable: the test does not need a repository to prove the rest. */
export type GitRunner = (args: readonly string[], cwd: string) => string

/** Local ceiling; the budget of the whole hook is 5 s (spec §7). */
const TIMEOUT_MS = 3_000

const runGit: GitRunner = (args, cwd) =>
  execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    stdio: ['ignore', 'pipe', 'ignore'],
  })

/**
 * Paths in the index, relative to the repository root and always with `/`.
 *
 * `-z` because git wraps in quotes and escapes a path with an accent or space, and an
 * escaped path matches no glob. `safe.directory=*` because the hook runs
 * in the container with a uid different from the owner of the mounted checkout (`ADR-0003`), and without
 * it git refuses the repository.
 *
 * Fail-open (`RNF-0001`): no error rises from here. An empty list means "I
 * don't know", and the caller treats "I don't know" as "let it pass".
 */
export function stagedPaths(root: string, run: GitRunner = runGit): string[] {
  let output: string
  try {
    output = run(['-c', 'safe.directory=*', 'diff', '--cached', '--name-only', '-z'], root)
  } catch {
    return []
  }

  return output
    .split(String.fromCharCode(0))
    .map(path => path.trim().replace(/\\/g, '/'))
    .filter(path => path !== '')
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
docker compose exec toolkit node --test test/git/staged.test.ts
docker compose exec toolkit npm run typecheck
```

Expected: PASS on the five tests. If the real-repository one fails on `git commit --allow-empty`, confirm that the image's `git` is ≥ 2.35 (`docker compose exec toolkit git --version`) — below that `-c safe.directory=*` is not recognized, and the fix is the `Dockerfile`, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/git/staged.ts test/git/staged.test.ts
git commit -m "feat(RN-0008): stagedPaths reads the git index with fail-open"
```

---

### Task 4: `HK-4` — remind the owning doc after editing a watched path

**Objective:** the toolkit's first `PostToolUse`. It decides nothing: it injects context at the moment the information is useful, which is right after the edit and not on the eve of the commit.

**Files:**

- Create: `src/hooks/hk4-watch-reminder.ts`
- Modify: `src/hooks/lib/io.ts` (adds `contextOutput`)
- Test: `test/hooks/hk4-watch-reminder.test.ts`

**Interfaces:**

- Consumes: `watchesFor`, `coversDoc`, `WatchMatch` (Task 2); `toRepoPath` from `src/hooks/lib/paths.ts`; `loadOwnership`; `HookEnv`/`HookPayload`/`emit`/`readPayload`/`hookEnv` from `src/hooks/lib/io.ts`.
- Produces:
  - `contextOutput(event: 'PostToolUse' | 'SessionStart', context: string): string` in `src/hooks/lib/io.ts` — `HK-6` will reuse it in Phase 7.
  - `type Hk4Decision = { action: 'silent' } | { action: 'remind'; context: string }`
  - `decideHk4(payload: HookPayload, env: HookEnv): Hk4Decision`

**Requirements:**

- The output is `hookSpecificOutput.additionalContext`. **No** `permissionDecision` comes out of this hook (`RN-0009`).
- Editing the owning doc itself does not generate a reminder — reminding someone to do what they just did is the beginning of the noise that teaches people to ignore hooks.
- The message names: the edited path, the owning doc, the declared reason, the owning skill (when it exists) and the originating rule. And it says, in so many words, that it is not a block.
- Fail-open: no `file_path`, outside the repository, `.ownership.yml` unreadable or absent → `silent`.

- [ ] **Step 1: Write the failing test**

`test/hooks/hk4-watch-reminder.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideHk4 } from '../../src/hooks/hk4-watch-reminder.ts'
import type { Hk4Decision } from '../../src/hooks/hk4-watch-reminder.ts'
import { contextOutput } from '../../src/hooks/lib/io.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "new behavior requires a rule with an ID before the code"
  - code: "plugin/skills/**"
    doc: CONTRIBUTING.md
    reason: "a new skill changes how we work here"
`

function assertRemind(decision: Hk4Decision): asserts decision is { action: 'remind'; context: string } {
  assert.equal(decision.action, 'remind')
}

function decide(filePath: string, config: string | null = CONFIG): Hk4Decision {
  let decision: Hk4Decision = { action: 'silent' }
  const files = config === null ? {} : { [OWNERSHIP_PATH]: config }
  withTempRepo(files, root => {
    decision = decideHk4({ tool_name: 'Edit', tool_input: { file_path: filePath } }, { root, hostRoots: [root] })
  })
  return decision
}

test('RN-0008: editing a watched path reminds the owning doc, with reason and skill', () => {
  const decision = decide('src/domain/refund.ts')
  assertRemind(decision)
  assert.match(decision.context, /docs\/requirements\/rules\.md/)
  assert.match(decision.context, /rule with an ID before the code/)
  assert.match(decision.context, /requirements-keeper/)
  assert.match(decision.context, /HK-4/)
})

test('RN-0009: HK-4 reminds and does not block — the output carries no permission decision', () => {
  const decision = decide('src/domain/refund.ts')
  assertRemind(decision)
  assert.match(decision.context, /not a block|reminder/i)

  const emitted = JSON.parse(contextOutput('PostToolUse', decision.context)) as {
    hookSpecificOutput: Record<string, unknown>
  }
  assert.equal(emitted.hookSpecificOutput.hookEventName, 'PostToolUse')
  assert.equal(typeof emitted.hookSpecificOutput.additionalContext, 'string')
  assert.equal('permissionDecision' in emitted.hookSpecificOutput, false)
})

test('owning doc without a declared skill is still reminded', () => {
  const decision = decide('plugin/skills/new/SKILL.md')
  assertRemind(decision)
  assert.match(decision.context, /CONTRIBUTING\.md/)
})

test('editing the owning doc itself does not generate a reminder', () => {
  assert.equal(decide('docs/requirements/rules.md').action, 'silent')
})

test('path outside watches is silence', () => {
  assert.equal(decide('README.md').action, 'silent')
})

test('RNF-0001: without readable configuration, silence', () => {
  assert.equal(decide('src/domain/refund.ts', null).action, 'silent')
})

test('payload without file_path is silence', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG }, root => {
    const decision = decideHk4({ tool_name: 'Edit', tool_input: {} }, { root, hostRoots: [root] })
    assert.equal(decision.action, 'silent')
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/hooks/hk4-watch-reminder.test.ts
```

Expected: FAIL — `Cannot find module '.../src/hooks/hk4-watch-reminder.ts'`.

- [ ] **Step 3: Add `contextOutput` to `src/hooks/lib/io.ts`**

After `askOutput`, before `emit`:

```typescript
/**
 * Hook output that does **not** decide permission: it injects context and hands
 * control back. It is the form of HK-4 (PostToolUse) and, in Phase 7, of HK-6 (SessionStart).
 * There is no variant with `permissionDecision` here on purpose — mechanism 1
 * reminds and asks, never denies (spec §7).
 */
export function contextOutput(event: 'PostToolUse' | 'SessionStart', context: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  })
}
```

- [ ] **Step 4: Write `src/hooks/hk4-watch-reminder.ts`**

```typescript
#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write): reminds the owning doc after editing a watched path.
 *
 * Originating rule: LIVING-DOCUMENTATION-TOOLKIT.md §7 — mechanism 1 at the moment
 * when the information is still useful. Reminder, never a block: the output is
 * `additionalContext`, and this file does not know the word `deny`.
 */
import { loadOwnership } from '../config/ownership.ts'
import { coversDoc, watchesFor } from '../config/watches.ts'
import type { WatchMatch } from '../config/watches.ts'
import { toRepoPath } from './lib/paths.ts'
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type Hk4Decision = { action: 'silent' } | { action: 'remind'; context: string }

const SILENT: Hk4Decision = { action: 'silent' }

function describe(match: WatchMatch): string {
  const parts = [`- \`${match.doc}\``]
  if (match.owner !== null) parts.push(`(owner: ${match.owner})`)
  if (match.reason !== null) parts.push(`— ${match.reason}`)
  parts.push(match.skill !== null ? `Owning skill: ${match.skill}.` : 'No skill declared for this doc — the owner is in CODEOWNERS.')
  return parts.join(' ')
}

export function decideHk4(payload: HookPayload, env: HookEnv): Hk4Decision {
  const filePath = payload.tool_input?.file_path
  if (typeof filePath !== 'string') return SILENT

  const repoPath = toRepoPath(filePath, env.hostRoots)
  if (repoPath === null) return SILENT

  let config
  try {
    config = loadOwnership(env.root)
  } catch {
    return SILENT // fail-open
  }

  // Whoever just edited the owning doc does not need to be reminded of it.
  const pending = watchesFor(config, [repoPath]).filter(match => !coversDoc(match.doc, [repoPath]))
  if (pending.length === 0) return SILENT

  return {
    action: 'remind',
    context:
      `HK-4: \`${repoPath}\` is a watched path in \`docs/.ownership.yml\` (\`watches\`). ` +
      'Originating rule: LIVING-DOCUMENTATION-TOOLKIT.md §7 — updating the owning doc fits in the same PR; ' +
      'if it does not fit, it does not happen.\n' +
      `Owning doc to update:\n${pending.map(describe).join('\n')}\n` +
      'This is a reminder, not a block: if the change really does not affect the doc, carry on.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()
  if (!payload) return // fail-open
  const decision = decideHk4(payload, hookEnv())
  emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null)
}

if (process.argv[1]?.endsWith('hk4-watch-reminder.ts')) {
  main().catch(() => process.exit(0)) // fail-open, always
}
```

- [ ] **Step 5: Run and watch it pass**

```bash
docker compose exec toolkit node --test test/hooks/hk4-watch-reminder.test.ts
docker compose exec toolkit npm run typecheck
```

Expected: PASS on the seven tests.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/hk4-watch-reminder.ts src/hooks/lib/io.ts test/hooks/hk4-watch-reminder.test.ts
git commit -m "feat(RN-0008, RN-0009): HK-4 reminds the owning doc of a watched path"
```

---

### Task 5: `HK-5` — ask before the commit that carries code without the doc

**Objective:** mechanism 1 at the cheapest possible point. It is the first hook with a `Bash` matcher: there is no `file_path` in the payload, and the truth about what goes in the commit is in the git index.

**Files:**

- Create: `src/hooks/hk5-commit-guard.ts`
- Test: `test/hooks/hk5-commit-guard.test.ts`

**Interfaces:**

- Consumes: `pendingDocs`, `WatchMatch` (Task 2); `stagedPaths`, `GitRunner` (Task 3); `askOutput`/`emit`/`hookEnv`/`readPayload` from `src/hooks/lib/io.ts`.
- Produces:
  - `isGitCommit(command: string): boolean`
  - `type Hk5Decision = { action: 'allow' } | { action: 'ask'; reason: string }`
  - `decideHk5(payload: HookPayload, env: HookEnv, run?: GitRunner): Hk5Decision`

**Requirements:**

- It only acts when `tool_name` is `Bash` **and** the command is a `git commit`. `git status`, `npm test`, `git log` pass without touching the disk.
- The recognition of `git commit` is syntactic and deliberately simple: `git` at the start of the command or after `;`, `&&`, `||`, with `commit` further on. A hook that interprets intent is in the wrong place (spec §7). It prefers asking too much to asking too little — the output is `ask`, and one extra question costs a keypress.
- Empty index → `allow`. It is the same path as "git unavailable", and it is what fail-open demands.
- The message lists **each** pending doc with the paths that required it, names the owning skill and gives the two legitimate ways out: update the doc now, or decide — as a person — that the change does not affect it.
- This hook does **not** run `git add` nor anything that writes. It asks and exits.

- [ ] **Step 1: Write the failing test**

`test/hooks/hk5-commit-guard.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideHk5, isGitCommit } from '../../src/hooks/hk5-commit-guard.ts'
import type { Hk5Decision } from '../../src/hooks/hk5-commit-guard.ts'
import type { GitRunner } from '../../src/git/staged.ts'
import { askOutput } from '../../src/hooks/lib/io.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const NUL = String.fromCharCode(0)

const CONFIG = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "new behavior requires a rule with an ID before the code"
`

const staged =
  (...paths: string[]): GitRunner =>
  () =>
    paths.map(path => `${path}${NUL}`).join('')

function assertAsk(decision: Hk5Decision): asserts decision is { action: 'ask'; reason: string } {
  assert.equal(decision.action, 'ask')
}

function decide(command: string, run: GitRunner, config: string | null = CONFIG): Hk5Decision {
  let decision: Hk5Decision = { action: 'allow' }
  const files = config === null ? {} : { [OWNERSHIP_PATH]: config }
  withTempRepo(files, root => {
    decision = decideHk5({ tool_name: 'Bash', tool_input: { command } }, { root, hostRoots: [root] }, run)
  })
  return decision
}

test('RN-0008: staged touches a watched path without the owning doc — asks and lists the pending ones', () => {
  const decision = decide('git commit -m "feat: partial refund"', staged('src/domain/refund.ts'))
  assertAsk(decision)
  assert.match(decision.reason, /docs\/requirements\/rules\.md/)
  assert.match(decision.reason, /src\/domain\/refund\.ts/)
  assert.match(decision.reason, /requirements-keeper/)
  assert.match(decision.reason, /HK-5/)
})

test('RN-0008: staged that carries the owning doc passes', () => {
  const run = staged('src/domain/refund.ts', 'docs/requirements/rules.md')
  assert.equal(decide('git commit -m "feat: partial refund"', run).action, 'allow')
})

test('RN-0009: HK-5 asks, never denies', () => {
  const decision = decide('git commit -m "x"', staged('src/domain/refund.ts'))
  assertAsk(decision)
  const emitted = JSON.parse(askOutput(decision.reason)) as {
    hookSpecificOutput: { permissionDecision: string }
  }
  assert.equal(emitted.hookSpecificOutput.permissionDecision, 'ask')
})

test('the message teaches the two legitimate ways out', () => {
  const decision = decide('git commit -m "x"', staged('src/domain/refund.ts'))
  assertAsk(decision)
  assert.match(decision.reason, /update the doc/i)
  assert.match(decision.reason, /human decision|a person/i)
})

test('command that is not git commit passes without consulting git', () => {
  let consultado = false
  const spy: GitRunner = () => {
    consultado = true
    return ''
  }
  for (const command of ['git status', 'npm test', 'git add -A', 'echo "git commit"']) {
    assert.equal(decide(command, spy).action, 'allow', command)
  }
  assert.equal(consultado, false)
})

test('recognizes git commit in a chain and with options', () => {
  assert.equal(isGitCommit('git commit'), true)
  assert.equal(isGitCommit('git add -A && git commit -m "x"'), true)
  assert.equal(isGitCommit('git -c user.name=Test commit --amend'), true)
  assert.equal(isGitCommit('git status'), false)
  assert.equal(isGitCommit('npm run commitlint'), false)
})

test('RNF-0001: git unavailable — passes', () => {
  const explode: GitRunner = () => {
    throw new Error('fatal: not a git repository')
  }
  assert.equal(decide('git commit -m "x"', explode).action, 'allow')
})

test('RNF-0001: without .ownership.yml — passes', () => {
  assert.equal(decide('git commit -m "x"', staged('src/domain/refund.ts'), null).action, 'allow')
})

test('empty index — passes', () => {
  assert.equal(decide('git commit -m "x"', () => '').action, 'allow')
})

test('tool_name other than Bash is not this hook\'s business', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG }, root => {
    const decision = decideHk5(
      { tool_name: 'Edit', tool_input: { command: 'git commit -m "x"' } },
      { root, hostRoots: [root] },
      staged('src/domain/refund.ts'),
    )
    assert.equal(decision.action, 'allow')
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/hooks/hk5-commit-guard.test.ts
```

Expected: FAIL — `Cannot find module '.../src/hooks/hk5-commit-guard.ts'`.

- [ ] **Step 3: Write `src/hooks/hk5-commit-guard.ts`**

```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Bash): asks when the staged changes touch a watched path and do not carry the
 * owning doc.
 *
 * Originating rule: LIVING-DOCUMENTATION-TOOLKIT.md §7 — mechanism 1 at the
 * cheapest possible point. It returns `ask`, never `deny`: a commit without the doc can
 * be legitimate, and deciding that is up to a person.
 */
import { loadOwnership } from '../config/ownership.ts'
import { pendingDocs } from '../config/watches.ts'
import type { WatchMatch } from '../config/watches.ts'
import { stagedPaths } from '../git/staged.ts'
import type { GitRunner } from '../git/staged.ts'
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type Hk5Decision = { action: 'allow' } | { action: 'ask'; reason: string }

const ALLOW: Hk5Decision = { action: 'allow' }

/**
 * `git … commit` at the start of the command or after a separator.
 *
 * Syntactic recognition, on purpose: a hook that interprets intent is in the
 * wrong place (spec §7). It errs on the side of asking too much — the output
 * is `ask`, and one extra question costs a keypress.
 */
const GIT_COMMIT = /(?:^|[;&|]\s*)git\b[^;&|]*\bcommit\b/

export function isGitCommit(command: string): boolean {
  return GIT_COMMIT.test(command.trim())
}

function describe(match: WatchMatch): string {
  const parts = [`- \`${match.doc}\``]
  if (match.owner !== null) parts.push(`(owner: ${match.owner})`)
  parts.push(`— required by: ${match.matched.join(', ')}`)
  if (match.reason !== null) parts.push(`Reason: ${match.reason}`)
  if (match.skill !== null) parts.push(`Owning skill: ${match.skill}.`)
  return parts.join(' ')
}

export function decideHk5(payload: HookPayload, env: HookEnv, run?: GitRunner): Hk5Decision {
  if (payload.tool_name !== undefined && payload.tool_name !== 'Bash') return ALLOW

  const command = payload.tool_input?.command
  if (typeof command !== 'string' || !isGitCommit(command)) return ALLOW

  let config
  try {
    config = loadOwnership(env.root)
  } catch {
    return ALLOW // fail-open
  }

  // An empty list means "I don't know": empty index, no git, or repository refused.
  const staged = stagedPaths(env.root, run)
  if (staged.length === 0) return ALLOW

  const pending = pendingDocs(config, staged)
  if (pending.length === 0) return ALLOW

  return {
    action: 'ask',
    reason:
      'HK-5: this commit carries code from a watched path without the owning doc. ' +
      'Originating rule: LIVING-DOCUMENTATION-TOOLKIT.md §7 — if updating the documentation does not fit in the ' +
      'PR that changed the code, it does not happen.\n' +
      `Pending:\n${pending.map(describe).join('\n')}\n` +
      'Valid path: update the doc now (owning skill above) and redo the `git add`. ' +
      'If the change really does not affect the doc, that is a human decision — say that this is the case and carry on.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()
  if (!payload) return // fail-open
  const decision = decideHk5(payload, hookEnv())
  emit(decision.action === 'ask' ? askOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('hk5-commit-guard.ts')) {
  main().catch(() => process.exit(0)) // fail-open, always
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
docker compose exec toolkit node --test test/hooks/hk5-commit-guard.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: PASS on the whole suite.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/hk5-commit-guard.ts test/hooks/hk5-commit-guard.test.ts
git commit -m "feat(RN-0008, RN-0009): HK-5 asks on the commit that carries code without the doc"
```

---

### Task 6: Register `HK-4` and `HK-5` in the plugin

**Objective:** the two hooks exist and nobody calls them. This task connects the wires — and it is the first time `hooks.json` declares more than one event.

**Files:**

- Modify: `plugin/hooks/hooks.json`
- Test: `test/plugin/manifest.test.ts:32-47` (the test that today asserts "one group, two hooks") and `test/plugin/manifest.test.ts:60-70` (the one that sweeps only `PreToolUse`)

**Interfaces:**

- Consumes: `plugin/hooks/run-hook.sh`, **unchanged**. The wrapper passes the raw payload and receives the name of the hook as an argument; each hook knows which event it belongs to. Verified in Step 1.
- Produces: nothing for later tasks beyond the working plugin.

**Requirements:**

- `PreToolUse` now has **two** groups: `Edit|Write` (with `HK-1` and `HK-3`) and `Bash` (with `HK-5`). `PostToolUse` gains an `Edit|Write` group (with `HK-4`).
- Every command stays relocatable (`${CLAUDE_PLUGIN_ROOT}`) and synchronous (`"async": false`) — a reminder that arrives after the next tool is not a reminder.
- The test that sweeps "every referenced hook exists" now sweeps **all** events, not only `PreToolUse`. It is the same reason the skills test is a sweep and not a list: the next event enters without anyone remembering to add it here.

- [ ] **Step 1: Check the wrapper's contract before touching anything**

`run-hook.sh` does `docker exec … node /opt/living-docs/src/hooks/${HOOK}.ts` with the raw payload on stdin, and prints the container's stdout when it is not empty. That serves `PostToolUse` and `PreToolUse/Bash` with no change at all: what distinguishes the event is the invoked file.

Confirm by reading `plugin/hooks/run-hook.sh` and record in the commit that nothing changed there. Do **not** "improve" the wrapper in this task: it is the place where fail-open lives, and touching it without need is pure risk.

- [ ] **Step 2: Update the manifest test**

In `test/plugin/manifest.test.ts`, replace the test `'hooks.json registers HK-1 and HK-3 in PreToolUse with the Edit|Write matcher'` with:

```typescript
test('hooks.json registers the four hooks in the events and matchers of spec §7', () => {
  const config = readJson('plugin/hooks/hooks.json')
  const hooks = config.hooks as Record<string, { matcher: string; hooks: { command: string }[] }[]>

  const grupos = new Map(
    Object.entries(hooks).flatMap(([evento, lista]) => lista.map(grupo => [`${evento}:${grupo.matcher}`, grupo.hooks.map(hook => hook.command)] as const)),
  )

  const esperado: Record<string, string[]> = {
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk3-state-promotion'],
    'PreToolUse:Bash': ['hk5-commit-guard'],
    'PostToolUse:Edit|Write': ['hk4-watch-reminder'],
  }

  assert.deepEqual([...grupos.keys()].sort(), Object.keys(esperado).sort())
  for (const [chave, nomes] of Object.entries(esperado)) {
    const comandos = grupos.get(chave) ?? []
    assert.equal(comandos.length, nomes.length, `${chave}: ${comandos.length} hooks`)
    for (const nome of nomes) {
      assert.ok(
        comandos.some(comando => comando.includes(nome)),
        `${chave} should invoke ${nome}`,
      )
    }
    for (const comando of comandos) {
      assert.ok(comando.includes('${CLAUDE_PLUGIN_ROOT}'), 'the command must be relocatable')
    }
  }
})
```

And the test `'every referenced hook exists in the repository'` now sweeps all events:

```typescript
test('every referenced hook exists in the repository', () => {
  const config = readJson('plugin/hooks/hooks.json')
  const hooks = config.hooks as Record<string, { hooks: { command: string }[] }[]>
  let vistos = 0

  for (const grupos of Object.values(hooks)) {
    for (const grupo of grupos) {
      for (const hook of grupo.hooks) {
        const name = hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? ''
        assert.ok(existsSync(join(ROOT, 'src/hooks', `${name}.ts`)), `src/hooks/${name}.ts should exist`)
        vistos += 1
      }
    }
  }

  assert.equal(vistos, 4, 'the sweep should see the four hooks of Phases 1 and 3')
})
```

- [ ] **Step 3: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/plugin/manifest.test.ts
```

Expected: FAIL — the current `hooks.json` only has `PreToolUse:Edit|Write`.

- [ ] **Step 4: Write `plugin/hooks/hooks.json`**

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
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk5-commit-guard",
            "shell": "bash",
            "async": false
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk4-watch-reminder",
            "shell": "bash",
            "async": false
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Run and watch it pass**

```bash
docker compose exec toolkit npm test
```

Expected: PASS.

- [ ] **Step 6: Check the two hooks by hand, through the real contract**

With the container up, feed each hook a payload as Claude Code delivers it:

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/checks/ci1-structure.ts"}}' \
  | docker compose exec -T -e LIVING_DOCS_REPO_ROOT=/workspace toolkit \
    node /opt/living-docs/src/hooks/hk4-watch-reminder.ts

echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m test"}}' \
  | docker compose exec -T -e LIVING_DOCS_REPO_ROOT=/workspace toolkit \
    node /opt/living-docs/src/hooks/hk5-commit-guard.ts
```

Expected **in this task**: empty output from both — `watches` of this repository is still `[]`, and a hook with nothing to say stays quiet. Task 9 repeats these two commands with `watches` filled in and expects JSON. If anything comes out now, something is reading paths from somewhere other than `.ownership.yml`.

- [ ] **Step 7: Commit**

```bash
git add plugin/hooks/hooks.json test/plugin/manifest.test.ts
git commit -m "feat(RN-0008): plugin registers HK-4 (PostToolUse) and HK-5 (PreToolUse/Bash)"
```

---

### Task 7: `SK-6` `working-agreements-keeper` and the three artifacts it governs

**Objective:** give an owner to "how we work here". The Definition of Done is mechanism 1 written where it is read, and it is the source of `CI-7` in Phase 7; the agent contract is born an index, not content.

**Files:**

- Create: `plugin/skills/working-agreements-keeper/SKILL.md`
- Create: `CONTRIBUTING.md`, `docs/definition-of-done.md`, `CLAUDE.md`
- Create: `test/docs/agent-contract.test.ts`
- Modify: `CODEOWNERS`
- Modify: `test/plugin/authoring.test.ts` (`SK-6`-specific assertions)

**Interfaces:**

- Consumes: the authoring conventions of spec §11, already verified by `test/plugin/authoring.test.ts` over **all** skills — the new skill enters the sweep on the day it is born.
- Produces: the name `working-agreements-keeper`, cited by `watches`/CODEOWNERS in Task 9 and by the templates in Task 8.

**Requirements:**

- The skill obeys the existing sweep: sections in the order `Overview` → `What you own` → `When to use / when not to` → `Procedure` → `Boundaries` → `Checklist`; `description` with more than 120 characters, containing "Use" and written in terms of **symptom** ("an agent got it wrong for lack of context", "this was not written anywhere"); checklist with at least 6 boxes, each naming `CI-n`, `HK-n` or human verification.
- The skill does **not** copy the content of the artifacts it governs. It points to `templates/`.
- `CLAUDE.md` is an index and policy: it fits on one screen, links the owning artifacts and does not repeat the statement of any requirement (`RN-0010`).
- The DoD has one line per verifiable item, and each line names **what** verifies it — an existing check, a hook, or "human". An item without a named verification does not go in.

- [ ] **Step 1: Write the agent contract test**

`test/docs/agent-contract.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const ROOT = toolkitRoot()
const CONTRATO = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')

test('RN-0010: the agent contract points to the owning artifacts', () => {
  const alvos = ['LIVING-DOCUMENTATION-TOOLKIT.md', 'docs/.ownership.yml', 'CONTRIBUTING.md', 'docs/definition-of-done.md', 'docs/requirements/']
  for (const alvo of alvos) {
    assert.ok(CONTRATO.includes(alvo), `the contract should point to ${alvo}`)
  }
})

test('RN-0010: the contract copies the statement of no requirement', () => {
  const titulos = ['rules.md', 'functional.md', 'non-functional.md'].flatMap(arquivo =>
    [...readFileSync(join(ROOT, 'docs/requirements', arquivo), 'utf8').matchAll(/^## (R[NF]F?-\d{4} — .+)$/gm)].map(match => match[1] ?? ''),
  )

  assert.ok(titulos.length >= 11, `expected the requirements of Phases 0 to 3, found ${titulos.length}`)
  for (const titulo of titulos) {
    assert.equal(CONTRATO.includes(titulo), false, `the contract copies the requirement "${titulo}"`)
  }
})

test('RN-0010: the contract is an index, not a manual — it fits on one screen', () => {
  const linhas = CONTRATO.split('\n').length
  assert.ok(linhas <= 60, `contract with ${linhas} lines: an index that does not fit on one screen becomes a manual`)
})

test('the Definition of Done names the verification of each item', () => {
  const dod = readFileSync(join(ROOT, 'docs/definition-of-done.md'), 'utf8')
  const itens = dod.split('\n').filter(linha => linha.trim().startsWith('- [ ]'))
  assert.ok(itens.length >= 6, `DoD with only ${itens.length} items`)
  for (const item of itens) {
    assert.match(item, /CI-\d|HK-\d|human/i, `item without a named verification — ${item}`)
  }
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/docs/agent-contract.test.ts
```

Expected: FAIL — `ENOENT` on `CLAUDE.md`.

- [ ] **Step 3: Write `docs/definition-of-done.md`**

```markdown
---
title: Definition of Done
owner: '@esliph/engineering'
trigger: >
  When an item becomes required to consider work done, or stops being — and every
  time something was declared done missing a step from this list.
last-reviewed: 2026-08-25
---

# Definition of Done

A change is done when all the boxes below are checked. Each item
says **what verifies it**: a check, a hook, or a person. An item that nobody
verifies does not belong on this list — it becomes intention, and intention is not a definition.

- [ ] The new behavior has a requirement with an ID, written **before** the code — verification: `CI-1` (structure) and human (the order).
- [ ] Every `active` rule is cited by at least one test — verification: `CI-3`.
- [ ] Every cited ID resolves to an existing, non-retired item — verification: `CI-2`.
- [ ] The decision that was not obvious became an ADR, and the gap that appeared became `DA-nnnn` — verification: human (`HK-3` intercepts the acceptance).
- [ ] The conscious shortcut became `TDR-nnnn` with an observable payment trigger — verification: human.
- [ ] The owning doc of every watched path touched by the change is in the same commit — verification: `HK-4` reminds, `HK-5` asks.
- [ ] No frozen item had its body edited — verification: `HK-1`.
- [ ] The commit message cites the affected ID — verification: human.
- [ ] `npm test`, `npm run typecheck` and `living-docs validate` pass in the container — verification: `CI-1`, `CI-2` and `CI-3`, run by the repository's workflow.

## What this list is not

It is not a code review checklist, and it does not measure volume: nothing here asks to "document
what was done". What it asks is that the **rule** and the **decision** exist where
someone will find them later.
```

- [ ] **Step 4: Write `CONTRIBUTING.md`**

````markdown
---
title: How to contribute here
owner: '@esliph/engineering'
trigger: >
  When how we work here changes — and every time a person or an agent
  got it wrong for lack of context that would fit on this page.
last-reviewed: 2026-08-25
---

# How to contribute

This repository is the living documentation toolkit and is also its first
consumer. Everything it requires of a project, it fulfills itself.

## The environment

Nothing runs on the host besides Docker (`RNF-0002`). The container is the only supported
way to run anything:

```bash
docker compose up -d
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```
````

If a command asks for `node`, `npm` or `npx` outside the container, it is wrong —
not the environment.

## The cycle

1. **The rule before the code.** New behavior starts with a requirement with an
   ID in `docs/requirements/`. If the rule does not exist and nobody knows what it is, the
   result is a `DA-nnnn` in `docs/open-decisions.md` and the implementation
   **stops** — inventing the rule is the mistake this repository exists to avoid.
2. **Test before implementation**, citing the ID of the requirement it covers. It is
   the citation that `CI-3` looks for; a test without an ID leaves the rule uncovered.
3. **Minimal implementation.** What has no requirement is not scope.
4. **Commit citing the affected ID** — it is what makes `git log` navigable by rule.
5. **The Definition of Done** (`docs/definition-of-done.md`) says when it is finished.

## Where the truth lives

| Question                     | Artifact                             |
| ---------------------------- | ------------------------------------ |
| What the toolkit must be     | `LIVING-DOCUMENTATION-TOOLKIT.md`    |
| What the rule for X is       | `docs/requirements/`                 |
| Why it was done this way     | `docs/decisions/adr/`                |
| What is not yet decided      | `docs/open-decisions.md`             |
| What we accepted owing       | `docs/decisions/debt/`               |
| Who owns each path           | `docs/.ownership.yml` and `CODEOWNERS` |
| When it is done              | `docs/definition-of-done.md`         |

None of these answers is copied elsewhere. A duplicate rots, and the
old version wins over the new one by repetition.

## Language

Identifiers, file names and IDs in English/neutral; prose in Portuguese.
Commit message in Portuguese, in the format `type(ID): subject`.

## When an agent gets it wrong for lack of context

That is not an accident, it is a symptom: a line is missing in some document. The fix is
to add that line — in `CLAUDE.md` if it is policy or index, in the owning
artifact if it is a rule. The skill `working-agreements-keeper` owns this loop.

````

- [ ] **Step 5: Write `CLAUDE.md`**

Maximum 60 lines — the test in Step 1 fails above that.

```markdown
# Agent contract — living-docs-toolkit

Index and policy. **No factual claim lives here**: each one lives in the
owning artifact and is read from there (`RN-0010`).

## Before touching anything

- The toolkit's spec is `LIVING-DOCUMENTATION-TOOLKIT.md`. It rules.
- The ownership map is `docs/.ownership.yml`. No document path is
  guessed: it is read from there.
- How we work here: `CONTRIBUTING.md`. When something is done:
  `docs/definition-of-done.md`.

## Policy

- **Nothing runs on the host besides Docker.** Every command goes through
  `docker compose exec toolkit …` or `./bin/living-docs`.
- **The rule comes before the code.** What the system must do is in
  `docs/requirements/`; if the rule does not exist, open a `DA` (`/open-decision`)
  and stop. Do not invent the rule that is missing.
- **You do not accept decisions.** A skill writes `draft`/`open`; promoting is a
  human act — `HK-3` asks, and the answer is not yours.
- **You do not fix a frozen item.** An accepted ADR gets `superseded` and a new
  ADR — `HK-1` blocks the rest.
- **Document and code travel together.** A path watched in `watches` has an owning
  doc; `HK-4` reminds after the edit and `HK-5` asks before the commit.
- **A conscious shortcut becomes a `TDR`** (`/debt`) with an observable payment
  trigger — it does not become an orphan `TODO`.

## Commands

`/adr`, `/open-decision`, `/debt`, `/docs-setup`. The skills
`decision-recorder`, `requirements-keeper`, `working-agreements-keeper` and
`living-docs-bootstrap` are selected by their `description`; there is no need to
invoke them by name.

## What to never do

- Write a document that narrates the code.
- Create a documentation artifact outside `docs/` or outside version control.
- Bump `last-reviewed` in bulk.
- Copy the content of any artifact above into here.
````

- [ ] **Step 6: Write `plugin/skills/working-agreements-keeper/SKILL.md`**

```markdown
---
name: working-agreements-keeper
description: >
  Use when an agent or a person got it wrong for lack of context — "nobody told
  me it was like this", "this was not written anywhere", "I thought I could
  run it directly", "how do you do this here?", "when is this
  done?" — and whenever the work process changes: a new command, a new
  mandatory step, a commit rule, a policy on what an agent may or may not
  do on its own. Also when the agent contract (CLAUDE.md/AGENTS.md)
  is repeating content that belongs to another document.
---

# working-agreements-keeper — owner of how we work here

## Overview

Three artifacts answer "how do we work in this repository": `CONTRIBUTING.md`
(the process), `docs/definition-of-done.md` (when it is finished) and the agent
contract (`CLAUDE.md` or `AGENTS.md` — index and policy).

The second trigger of this skill is the best in the catalog: **every time someone gets it wrong
for lack of context**, a line is missing in one of these three. That is what makes the
document self-correcting instead of decorative.

Paths and owners come from `docs/.ownership.yml` and from `CODEOWNERS`; do not assume.

## What you own

| Artifact                     | What it is                                                         |
| ---------------------------- | ------------------------------------------------------------------ |
| `CONTRIBUTING.md`            | The process: environment, cycle, language, where the truth lives   |
| `docs/definition-of-done.md` | The list of what must be done, with the verification of each item  |
| `CLAUDE.md` / `AGENTS.md`    | Agent contract: index and policy, never content                    |

The seeds are in `templates/contributing.md`,
`templates/definition-of-done.md` and `templates/agent-contract.md`. Do not reproduce
their content here.

## When to use / when not to

**Use** when the process changes, and when an error for lack of context
happens — the fix is a new line, and it has one of two forms: _where
the truth lives_ or _what to never do_.

**Do not use** to record a business rule (that is `requirements-keeper`), a technical
decision (that is `decision-recorder`) or what the linter already catches — tool
configuration is not a document.

**The cost of using it for nothing:** every added line is read in every session. A
list that grows without stopping is read by nobody, and "if nobody reads it, it is not alive".

## Procedure

1. **Read `docs/.ownership.yml`** and confirm which of the three artifacts exist and
   where. If none exists, run `/docs-setup` with the `small-team` stage.
2. **Classify what you have in hand**: process → `CONTRIBUTING.md`;
   done condition → Definition of Done; policy or index for the agent →
   agent contract.
3. **Look for the line that already covers this.** A repeated error is usually
   an existing line badly placed, not a missing line.
4. **Write a line, not a paragraph.** Form: _where the truth lives_ ("the
   rule for X lives in `docs/requirements/rules.md`") or _what to never do_
   ("never run `npm` outside the container").
5. **A new DoD item names its verification**: a `CI-n`, a `HK-n`, or
   explicitly "human". An item without a verification does not go in.
6. **In the agent contract, link — do not copy.** If the sentence you were about to write
   is a factual claim, it belongs to the owning artifact; here goes the link.
7. **If the process change altered the code→doc link**, update `watches`
   in `.ownership.yml`: it is what `HK-4` and `HK-5` read.

## Boundaries

| It is yours                                          | It is not yours                                     |
| ---------------------------------------------------- | --------------------------------------------------- |
| How we work, and when something is done              | The business rule that CONTRIBUTING references      |
| Turning an error for lack of context into a new line | Duplicating content from another artifact           |
| The policy on what an agent may do on its own        | Accepting the decision itself (it is a human act, `HK-3`) |
| The DoD item and the verification that covers it     | Writing the check that verifies (it is `CI-n`, in the engine) |

## Checklist

- [ ] Each factual claim in the agent contract is a link to the owning artifact, not a copy — verification: `CI-7` in Phase 7; until then, human.
- [ ] Every new DoD item names what verifies it: `CI-n`, `HK-n`, or an explicit "human" — verification: human.
- [ ] The watched path that the change created is in `watches`, with an owning doc — verification: `HK-4` and `HK-5`.
- [ ] None of the three artifacts gained content that belongs to `docs/requirements/` or to `docs/decisions/` — verification: human.
- [ ] The `trigger` of the changed artifact still names an event, not a cadence — verification: `CI-1`.
- [ ] The change was born from an observed error or a real process change, not from a wish to document — verification: human.
- [ ] `last-reviewed` was updated only in the files that really changed — verification: human (a bulk bump is an anti-requirement of spec §13).
```

- [ ] **Step 7: Add the `SK-6` assertions to `test/plugin/authoring.test.ts`**

At the end of the file, in the same style as the ones that already exist for `decision-recorder` and `requirements-keeper`:

```typescript
test('working-agreements-keeper: the description names the error for lack of context', () => {
  const description = String(parseFrontmatter(skillSource('working-agreements-keeper'))?.data.description ?? '')
  assert.match(description, /Use when/i)
  for (const sintoma of ['lack of context', 'was not written', 'done']) {
    assert.ok(description.toLowerCase().includes(sintoma), `the description should contain the symptom "${sintoma}"`)
  }
})

test('working-agreements-keeper does not duplicate the content of the agreements it governs', () => {
  const source = skillSource('working-agreements-keeper')
  assert.match(source, /templates\/definition-of-done\.md/, 'it must point to the template, not copy it')
  assert.doesNotMatch(source, /^- \[ \] `npm test`/m, 'the skill must not contain the DoD')
})
```

- [ ] **Step 8: Update `CODEOWNERS`**

```
# Mirrors the `owner` field of docs/.ownership.yml. One artifact, one owner.
docs/decisions/adr/    @esliph/engineering
docs/open-decisions.md    @esliph/engineering
docs/decisions/debt/    @esliph/engineering
docs/requirements/    @esliph/engineering
CONTRIBUTING.md    @esliph/engineering
docs/definition-of-done.md    @esliph/engineering
CLAUDE.md    @esliph/engineering
docs/.ownership.yml    @esliph/engineering
```

- [ ] **Step 9: Run everything**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: PASS and `exit=0`. The sweep of `test/plugin/authoring.test.ts` now runs over four skills; if it complains about a section out of order or a checklist item without a verification, the error is in the `SKILL.md`, not in the test.

- [ ] **Step 10: Commit**

```bash
git add plugin/skills/working-agreements-keeper CONTRIBUTING.md CLAUDE.md docs/definition-of-done.md CODEOWNERS test/docs/agent-contract.test.ts test/plugin/authoring.test.ts
git commit -m "feat(SK-6, RN-0010): working-agreements-keeper, DoD and agent contract"
```

---

### Task 8: `init --stage small-team` installs the working agreements

**Objective:** what this repository just gained by hand, a consumer gains by command. And `init` stops promising Phase 3 as "not installed".

**Files:**

- Create: `templates/contributing.md`, `templates/definition-of-done.md`, `templates/agent-contract.md`
- Modify: `templates/CODEOWNERS`, `templates/ownership.yml`
- Modify: `src/cli/init.ts`
- Test: `test/cli/init.test.ts`

**Interfaces:**

- Consumes: `template()`, `writeIfAbsent()`, `InitResult` and `Stage` from `src/cli/init.ts` (already exist).
- Produces: nothing for later tasks; it is a leaf.

**Requirements:**

- The `solo` stage still installs none of this. The table in spec §10 puts Phase 3 in "small team / real product".
- An existing `AGENTS.md` is **adopted** (goes into `result.adopted`, and no `CLAUDE.md` is born beside it). Any of the three already written is kept intact — `RF-0002` still holds.
- `NOT_INSTALLED['small-team']` loses the Phase 3 line and keeps the Phase 4 one. Honestly promising what is missing is `RF-0003`.
- `templates/ownership.yml` now carries `watches` **commented with an example and truly empty**: `init` does not invent links. A guessed `watches` teaches people to ignore the reminder on the first day.
- The templates are seeds parameterized by `{{OWNER}}` and `{{TODAY}}` — not literal copies of this repository's files, which talk about the toolkit.

- [ ] **Step 1: Write the failing tests**

Add to `test/cli/init.test.ts`:

```typescript
test('RF-0004: small-team installs the working agreements', () => {
  withTempRepo({}, root => {
    const result = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
    })
    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md']) {
      assert.ok(existsSync(join(root, path)), `${path} should exist`)
      assert.ok(result.created.includes(path), `${path} should be listed as created`)
    }
    assert.match(readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8'), /@team/)
  })
})

test('RF-0004: solo installs no working agreement at all', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo' })
    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md']) {
      assert.equal(existsSync(join(root, path)), false, `${path} should not exist in the solo stage`)
    }
  })
})

test('RF-0004: an existing AGENTS.md is adopted; no parallel CLAUDE.md is born', () => {
  withTempRepo({ 'AGENTS.md': '# old contract\n' }, root => {
    const result = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
    })
    assert.equal(existsSync(join(root, 'CLAUDE.md')), false)
    assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), '# old contract\n')
    assert.ok(result.adopted.some(entry => entry.path === 'AGENTS.md'))
  })
})

test('RF-0004: an agreement already written is not rewritten on the second run', () => {
  withTempRepo({ 'CONTRIBUTING.md': '# their own way\n' }, root => {
    const options = {
      owner: '@team',
      dryRun: false,
      stage: 'small-team' as const,
    }
    runInit(root, options)
    const segunda = runInit(root, options)
    assert.equal(readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8'), '# their own way\n')
    assert.ok(segunda.skipped.includes('CONTRIBUTING.md'))
    assert.deepEqual(segunda.created, [])
  })
})

test('RF-0003: small-team no longer promises Phase 3 as pending', () => {
  withTempRepo({}, root => {
    const result = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
    })
    assert.equal(
      result.notInstalled.some(item => /Phase 3/.test(item)),
      false,
    )
    assert.ok(result.notInstalled.some(item => /Phase 4/.test(item)))
  })
})

test('init does not invent `watches` — the code→doc link is a human act', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'small-team' })
    const config = loadOwnership(root)
    assert.deepEqual(config.watches, [])
  })
})
```

If `loadOwnership`, `readFileSync` or `existsSync` are not yet imported in the file, add the imports.

- [ ] **Step 2: Run and watch it fail**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts
```

Expected: FAIL — `CONTRIBUTING.md should exist`.

- [ ] **Step 3: Write the three templates**

`templates/definition-of-done.md`:

```markdown
---
title: Definition of Done
owner: '{{OWNER}}'
trigger: >
  When an item becomes required to consider work done, or stops being — and every
  time something was declared done missing a step from this list.
last-reviewed: { { TODAY } }
---

# Definition of Done

A change is done when all the boxes below are checked. Each item
says **what verifies it**: a check, a hook, or a person. An item that nobody
verifies does not belong on this list.

- [ ] The new behavior has a requirement with an ID, written before the code — verification: `CI-1` and human.
- [ ] Every `active` rule is cited by at least one test — verification: `CI-3`.
- [ ] Every cited ID resolves to an existing, non-retired item — verification: `CI-2`.
- [ ] The decision that was not obvious became an ADR; the gap became `DA-nnnn` — verification: human (`HK-3` intercepts the acceptance).
- [ ] The conscious shortcut became `TDR-nnnn` with an observable payment trigger — verification: human.
- [ ] The owning doc of every watched path touched is in the same commit — verification: `HK-4` and `HK-5`.
- [ ] No frozen item had its body edited — verification: `HK-1`.
- [ ] The commit message cites the affected ID — verification: human.

Add here the steps of your project (build, lint, deploy), **each one with the
verification that covers it**. An item without a verification becomes intention, and intention is not a
definition of done.
```

`templates/contributing.md`:

```markdown
---
title: How to contribute here
owner: '{{OWNER}}'
trigger: >
  When how we work here changes — and every time a person or an agent
  got it wrong for lack of context that would fit on this page.
last-reviewed: { { TODAY } }
---

# How to contribute

> Seed created by `living-docs init`. Replace whatever is not true in this
> project; deleting what is left over is part of the work.

## The cycle

1. **The rule before the code.** New behavior starts with a requirement with an
   ID in `docs/requirements/`. If the rule does not exist and nobody knows what it is, the
   result is a `DA-nnnn` in `docs/open-decisions.md` and the implementation stops.
2. **Test citing the ID** of the requirement it covers — it is the citation that `CI-3`
   looks for.
3. **Minimal implementation.** What has no requirement is not scope.
4. **Commit citing the affected ID.**
5. **The Definition of Done** (`docs/definition-of-done.md`) says when it is finished.

## Where the truth lives

| Question                     | Artifact                             |
| ---------------------------- | ------------------------------------ |
| What the rule for X is       | `docs/requirements/`                 |
| Why it was done this way     | `docs/decisions/adr/`                |
| What is not yet decided      | `docs/open-decisions.md`             |
| What we accepted owing       | `docs/decisions/debt/`               |
| Who owns each path           | `docs/.ownership.yml` and `CODEOWNERS` |
| When it is done              | `docs/definition-of-done.md`         |

None of these answers is copied elsewhere.

## When someone gets it wrong for lack of context

A line is missing in one of these documents. The fix is to add it — in the
agent contract if it is policy or index, in the owning artifact if it is a rule.
```

`templates/agent-contract.md`:

```markdown
# Agent contract

Index and policy. **No factual claim lives here**: each one lives in the
owning artifact and is read from there.

## Before touching anything

- The ownership map is `docs/.ownership.yml`. No document path is
  guessed: it is read from there.
- How we work here: `CONTRIBUTING.md`. When something is done:
  `docs/definition-of-done.md`.

## Policy

- **The rule comes before the code.** What the system must do is in
  `docs/requirements/`; if the rule does not exist, open a `DA` (`/open-decision`)
  and stop. Do not invent the rule that is missing.
- **You do not accept decisions.** A skill writes `draft`/`open`; promoting is a
  human act — `HK-3` asks.
- **You do not fix a frozen item.** An accepted ADR gets `superseded` and a new
  ADR — `HK-1` blocks the rest.
- **Document and code travel together.** A path watched in `watches` has an owning
  doc; `HK-4` reminds and `HK-5` asks.
- **A conscious shortcut becomes a `TDR`** (`/debt`) with an observable payment trigger.

## What to never do

- Write a document that narrates the code.
- Create a documentation artifact outside version control.
- Bump `last-reviewed` in bulk.
- Copy the content of any artifact above into here.
```

- [ ] **Step 4: Update `templates/CODEOWNERS` and `templates/ownership.yml`**

`templates/CODEOWNERS` — add the marker before the last line:

```
# Mirrors the `owner` field of docs/.ownership.yml. One artifact, one owner.
{{ADR_PATH}}    {{OWNER}}
{{DA_PATH}}    {{OWNER}}
{{TDR_PATH}}    {{OWNER}}
{{REQUIREMENTS_CODEOWNERS}}{{AGREEMENTS_CODEOWNERS}}docs/.ownership.yml    {{OWNER}}
```

`templates/ownership.yml` — replace the `watches` block:

```yaml
generated: []

# Mechanism 1: code → owning doc. HK-4 reminds after the edit, HK-5 asks
# before the commit, and in Phase 7 CI-7 verifies. Fill in with the paths of YOUR
# code — init does not invent links, because a link that nobody recognizes
# teaches people to ignore the reminder. Example:
#
# watches:
#   - code: "src/domain/**"
#     doc: docs/requirements/rules.md
#     reason: "new behavior requires a rule with an ID before the code"
watches: []

consumer-visible-paths: []
```

- [ ] **Step 5: Change `src/cli/init.ts`**

After `REQUIREMENT_CITED_BY`, add:

```typescript
/** Working agreements (SK-6), installed from the `small-team` stage on (spec §10). */
const WORKING_AGREEMENTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'CONTRIBUTING.md', template: 'contributing.md' },
  {
    path: 'docs/definition-of-done.md',
    template: 'definition-of-done.md',
  },
])
```

Replace `NOT_INSTALLED` with:

```typescript
/** What this stage asks for and Phase 4 is the one that will deliver (spec §10). */
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': ['SK-1, SK-2, AG-2 (Phase 4) — not implemented in this version'],
})
```

Inside `runInit`, in the `if (options.stage !== 'solo')` block, **after** writing the requirement files:

```typescript
for (const agreement of WORKING_AGREEMENTS) {
  writeIfAbsent(root, agreement.path, template(agreement.template, values), options, result)
}

// The agent contract may already exist under another name. Adopt, never duplicate
// (RF-0002): two contracts is the guarantee that one of them is wrong.
if (existsSync(join(root, 'AGENTS.md'))) {
  result.adopted.push({ idPrefix: 'agent contract', path: 'AGENTS.md' })
} else {
  writeIfAbsent(root, 'CLAUDE.md', template('agent-contract.md', values), options, result)
}
```

And, in `values`, add the new key:

```typescript
    AGREEMENTS_CODEOWNERS:
      options.stage === 'solo'
        ? ''
        : `CONTRIBUTING.md    ${options.owner}\ndocs/definition-of-done.md    ${options.owner}\nCLAUDE.md    ${options.owner}\n`,
```

- [ ] **Step 6: Run and watch it pass**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: PASS. If an old `init` test breaks because of `notInstalled`, it was asserting that Phase 3 did not exist — update the assertion, that is the point of the task.

- [ ] **Step 7: Check the command end to end in a throwaway repository**

```bash
docker compose exec toolkit sh -c 'rm -rf /tmp/demo && mkdir -p /tmp/demo && cd /tmp/demo && \
  LIVING_DOCS_REPO_ROOT=/tmp/demo node /opt/living-docs/src/cli/index.ts init --stage small-team --owner @team && \
  ls -1 && cat docs/.ownership.yml | tail -20'
```

Expected: `CONTRIBUTING.md`, `CLAUDE.md`, `docs/` in the listing; `watches: []` with the comment block above it; the line `not installed  SK-1, SK-2, AG-2 (Phase 4)…` in the output, and **no** mention of Phase 3.

- [ ] **Step 8: Commit**

```bash
git add templates src/cli/init.ts test/cli/init.test.ts
git commit -m "feat(RF-0004): init --stage small-team installs the working agreements"
```

---

### Task 9: Dogfooding — `watches` filled in, `DA-0002`, criterion 5 and the human promotion

**Objective:** the phase is only delivered when the repository itself lives under it. Here `watches` stops being `[]`, acceptance criterion 5 gets a test, the gap the phase discovered becomes `DA-0002`, and the requirements of Task 1 are promoted — by a person.

**Files:**

- Modify: `docs/.ownership.yml` (fills in `watches`)
- Modify: `docs/open-decisions.md` (adds `DA-0002`)
- Modify: `test/acceptance/spec-criteria.test.ts` (criterion 5)
- Modify: `README.md`, `plugin/.claude-plugin/plugin.json`
- Modify: `docs/requirements/rules.md`, `docs/requirements/functional.md` (promotion `draft → active`)

**Interfaces:**

- Consumes: everything that Tasks 2 to 8 produced.
- Produces: the repository validating itself with Phase 3 active.

**Requirements:**

- Each `watch` of this repository points to a doc that **exists** and has a written reason. A link without a reason is noise — the `reason` is what appears in the hook's message.
- `DA-0002` is born `open` and is **not** resolved here. Resolving requires an ADR, and the ADR requires the decision, which belongs to Phase 7 (`CI-7`).
- The promotion of the four requirements to `active` is the **last** step, and it is human. `CI-3` demands a citation for an `active` requirement; the citations have existed since Tasks 2 to 8.
- The README says which half of criterion 5 is delivered. Do not write that the CI flags through `watches`: it does not flag yet.

- [ ] **Step 1: Fill in `watches` in `docs/.ownership.yml`**

Replace the `watches: []` block:

```yaml
# Mechanism 1: code → owning doc. HK-4 reminds after the edit, HK-5 asks
# before the commit. In Phase 7, CI-7 reads from here too.
watches:
  - code: 'src/checks/**'
    doc: docs/requirements/rules.md
    reason: 'a check is an executable rule — the RN comes first, and it is what the check verifies'

  - code: 'src/hooks/**'
    doc: docs/requirements/rules.md
    reason: 'a hook blocks or asks on behalf of a rule; without a cited RN, the block has no origin'

  - code: 'src/cli/**'
    doc: docs/requirements/functional.md
    reason: 'what the command does observably is an RF, not an implementation detail'

  - code: 'src/core/**'
    doc: docs/requirements/non-functional.md
    reason: 'the two roots are a property of the system (ADR-0003), not command behavior'

  - code: 'plugin/skills/**'
    doc: CONTRIBUTING.md
    reason: 'a new or changed skill changes how we work here'
```

- [ ] **Step 2: Open `DA-0002`**

Task 2 discovered the gap: `CONTRIBUTING.md`, the DoD and the agent contract are legitimate owning docs and **do not fit in `artifacts:`**, which requires an `id-prefix` of 2 to 4 uppercase letters. Today this only costs one line less in the hook's message; in Phase 7, `CI-7` will want to require an owner for every artifact and will stumble on this.

Add the line in `docs/open-decisions.md`:

```markdown
| DA-0002 | How to declare in `.ownership.yml` an artifact without an ID family (CONTRIBUTING, Definition of Done, agent contract), so that `CI-7` requires an owner without inventing a prefix | open | — | 2026-08-25 |
```

**Do not resolve it.** While it is open, the subject has no rule — and it is `CI-7`, in Phase 7, that will need it.

- [ ] **Step 3: Write the test of acceptance criterion 5**

In `test/acceptance/spec-criteria.test.ts`, add at the end (and import `decideHk4`, `decideHk5` and `GitRunner`):

```typescript
const NUL = String.fromCharCode(0)

const WATCHED_CONFIG = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "new behavior requires a rule with an ID before the code"
`

test('criterion 5: changing a watched path without touching the owning doc is reminded and asked about', () => {
  withTempRepo({ [OWNERSHIP_PATH]: WATCHED_CONFIG }, root => {
    const env = { root, hostRoots: [root] }

    // Half 1 — right after the edit, HK-4 reminds.
    const lembrete = decideHk4(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'src/domain/refund.ts' },
      },
      env,
    )
    assert.equal(lembrete.action, 'remind')

    // Half 2 — at commit time, HK-5 lists the pending ones and asks.
    const staged: GitRunner = () => `src/domain/refund.ts${NUL}`
    const pergunta = decideHk5(
      {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "feat: refund"' },
      },
      env,
      staged,
    )
    assert.equal(pergunta.action, 'ask')
    assert.match(pergunta.action === 'ask' ? pergunta.reason : '', /docs\/requirements\/rules\.md/)

    // And with the doc in the same commit, the way is clear.
    const comDoc: GitRunner = () => `src/domain/refund.ts${NUL}docs/requirements/rules.md${NUL}`
    const livre = decideHk5(
      {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "feat: refund"' },
      },
      env,
      comDoc,
    )
    assert.equal(livre.action, 'allow')
  })
})
```

- [ ] **Step 4: Run everything, including the repository itself**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: PASS and `exit=0`. The requirements of Task 1 are still in `draft`, so `CI-3` does not demand them.

- [ ] **Step 5: Check the hooks with the real `watches`**

Repeat the two commands of Step 6 of Task 6. Now they **must** produce JSON:

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/checks/ci1-structure.ts"}}' \
  | docker compose exec -T -e LIVING_DOCS_REPO_ROOT=/workspace toolkit \
    node /opt/living-docs/src/hooks/hk4-watch-reminder.ts
```

Expected: JSON with `"hookEventName":"PostToolUse"`, `additionalContext` citing `docs/requirements/rules.md` and `requirements-keeper`, and **without** `permissionDecision`.

```bash
docker compose exec -w /workspace toolkit git add -N . >/dev/null 2>&1 || true
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m test"}}' \
  | docker compose exec -T -e LIVING_DOCS_REPO_ROOT=/workspace toolkit \
    node /opt/living-docs/src/hooks/hk5-commit-guard.ts
```

Expected: either JSON with `"permissionDecision":"ask"` listing the pending docs, or empty output if the index is clean. If `deny` comes out in either of the two, stop: it is a violation of `RN-0009` and the code needs to go back to Task 4/5.

- [ ] **Step 6: Update the README and the plugin description**

In `README.md`, three passages:

1. The opening paragraph becomes `Phases 0–3`, citing `HK-4`/`HK-5` and `SK-6`.
2. The section "The Claude Code plugin" gains the two new lines:

```markdown
`plugin/` brings the skills `decision-recorder` (`/adr`, `/open-decision`, `/debt`),
`living-docs-bootstrap` (`/docs-setup`), `requirements-keeper` and
`working-agreements-keeper` (the last two without a command: they are selected by the
`description`), and the hooks `HK-1` (blocks editing a frozen item), `HK-3`
(state promotion requires a human act), `HK-4` (reminds the owning doc after
editing a watched path) and `HK-5` (asks before the commit that carries code without
the doc). `HK-4` and `HK-5` never deny: they remind and ask.
```

3. The section "What is left out" loses `HK-4`, `HK-5` and `SK-6`, and gains the honesty about criterion 5:

```markdown
`SK-1`, `SK-2`, `SK-5`, `SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-6`, `HK-7`,
`CI-4`–`CI-8`, `CM-4`, `CM-5`, `CM-7` — Phases 4 to 7 of the spec.

Of acceptance criterion 5 of spec §12, Phase 3 delivers the hook half: the commit
that carries a watched path without the owning doc is asked about. The other half — "and the CI
flags it through `watches`" — is `CI-7`, Phase 7.
```

In `plugin/.claude-plugin/plugin.json`, the description becomes:

```json
  "description": "Living documentation: ADR, Open Decisions, Debt Register, requirements with stable IDs and working agreements — with owner, trigger and enforcement. Phases 0–3.",
```

- [ ] **Step 7: Commit of the dogfooding**

```bash
git add docs/.ownership.yml docs/open-decisions.md test/acceptance/spec-criteria.test.ts README.md plugin/.claude-plugin/plugin.json
git commit -m "feat(DA-0002, RN-0008): watches filled in and criterion 5 covered by a test"
```

> From here on, `HK-5` starts asking on the commits of this repository that touch `src/**` without the owning doc. It is the mechanism working. Answer honestly: if the change has a rule, update `docs/requirements/`; if it does not, that is a person's decision.

- [ ] **Step 8: STOP and ask for the promotion of the requirements**

The four requirements of Task 1 are in `draft` and are already cited by a test. Promoting them is `draft → active`: a human act (`RN-0005`), and `HK-3` returns `ask`.

Say in one sentence what is being asked — "`RN-0008`, `RN-0009`, `RN-0010` and `RF-0004` are written, implemented and covered by a test; they only need to be accepted" — and **wait**. Do not edit `status:` on your own.

After a person accepts, change `- **status:** draft` to `- **status:** active` in the four sections and run:

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: `exit=0`. If `CI-3` flags an `active` requirement without a citation, the ID does not appear in any file under `test/**` (or `src/**`, for `RN`) — add the citation to the test that already covers the behavior, instead of creating a test just to satisfy the check.

- [ ] **Step 9: Final commit**

```bash
git add docs/requirements
git commit -m "docs(RN-0008..RN-0010, RF-0004): Phase 3 requirements promoted by a human act"
```

---

## Spec coverage

| Piece of the spec                              | Where       | State at the end of the plan                                                             |
| ---------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `SK-6` `working-agreements-keeper`             | Task 7      | Delivered, with the three artifacts and the seed for consumers (Task 8)                  |
| `HK-4` `PostToolUse` / `additionalContext`     | Tasks 4 and 6 | Delivered                                                                              |
| `HK-5` `PreToolUse` / `Bash` / `ask`           | Tasks 5 and 6 | Delivered                                                                              |
| `watches` stops being `[]`                     | Tasks 2 and 9 | Delivered, with an engine reusable by `CI-7`                                           |
| Executable Definition of Done, source of `CI-7` | Task 7     | Written; the check that reads it is Phase 7                                              |
| Acceptance criterion 5                         | Task 9      | Hook half delivered and tested; the CI half is `CI-7`, Phase 7 (declared in the README)  |
| Acceptance criterion 9                         | Tasks 7 and 9 | The agent contract exists and is an index; the automatic verification of duplication is `CI-7` |
| `small-team` stage of spec §10                 | Task 8      | Now installs Phases 2 **and** 3; Phase 4 remains declared as not installed               |

## What this plan deliberately does not do

- **Does not create `CI-7`.** It needs textual duplication detection, which is the only check in the spec with a real risk of false positives — and the backlog asks for an ADR on the threshold before implementing it.
- **Does not create `src/git/diff.ts`.** `HK-5` needs the index, not the diff against the PR base. The diff is `CI-6` (Phase 6) and brings with it the question "where does the base come from outside the CI", which is a decision by ADR.
- **Does not touch `consumer-visible-paths` nor `consumer-visible: true`.** Both only have a consumer from `CI-6` on.
- **Does not resolve `DA-0002`.** It is born here because the phase discovered it; resolving it is Phase 7 work, with an ADR.
- **Does not pay `TDR-0001`.** The payment trigger is still "the first PR that revokes a requirement", and this is not it.

## Next plan

`docs/superpowers/plans/BACKLOG-phases-3-7.md`, section "Phase 4" — `SK-2`
glossary-keeper (`CM-4` `/term`), `SK-1` charter-keeper and `AG-2`
decision-adversary. Two dependencies to verify before planning: the `banned`/`renamed`
term states in the state machine of `src/docs/schema.ts`, and the
format of `agents/` in a Claude Code plugin — `AG-2` is the toolkit's first agent.
