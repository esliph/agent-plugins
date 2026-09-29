# Toolkit internal trail — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The text the toolkit delivers to whoever installs it — `init` seeds, templates, plugin and `src/` strings — stops citing ADRs, RNs and sections of the toolkit spec, and a distribution test locks that in.

**Architecture:** The decision (`ADR-0018`) and the rule (`RN-0031`) are born. A new test, `test/distribution/internal-trail.test.ts`, reads the set of internal prefixes from `loadOwnership(toolkitRoot()).artifacts` — no list of prefixes in the test — and sweeps three surfaces: what `init` seeds at each stage (plus raw `templates/**`), every file under `plugin/`, and only the string literals of `src/**/*.ts` (read through the TypeScript AST; comments are left out and keep citing). The test is born red and each following task turns one surface green. The ID removed from a message goes into a code comment right above the string.

**Tech Stack:** Node >= 24 running TypeScript directly (no build), `node:test`, `typescript` (already a devDependency; used by the test through `ts.createSourceFile`), Prettier, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-15-toolkit-internal-trail-design.md` (it rules over this plan). Input it cites: `docs/superpowers/specs/2026-09-10-reader-boundary-design.md`; `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §8 and §11; `RF-0002`, `RF-0003`, `RF-0005`; commit `9b79aea`; `RN-0010`/`RN-0020`.

## Global Constraints

- Run on the host's `node`: `npm ci` before anything; `npm test`, `npm run typecheck`, `node src/cli/index.ts …`.
- Work on an isolated branch (superpowers:using-git-worktrees; `.worktrees/` is already ignored). The comparison base is `master`.
- Precondition (spec): the reader boundary plan has been executed. Confirm with `ls docs/decisions/adr/ADR-0017-reader-boundary.md src/checks/ci11-external-audience.ts` — both exist.
- Prose in Portuguese with full accents; identifiers, keys and file names in English/neutral.
- Commit message in Portuguese, `type(ID): subject`, ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. A commit that changes an artifact file cites an ID declared in it (`CI-9`).
- A watched path changed without the owning doc carries the line `Docs: none — <reason>` in the message body. The exact text is in each task. `HK-5` asks before the commit: the answer is to go ahead, because the reason is written. In Tasks 3 to 6, `HK-5` also points at `CHANGELOG.md` (the paths are `consumer-visible`): the entry goes in once, in Task 7, and `CI-6` checks it against the whole diff versus `master`.
- `ADR-0018` and `RN-0031` are born `status: draft`. Promoting is a human act (`HK-3`); do not promote anything.
- **No fill-in placeholder leaves the seeds**: "Replace with a real principle…", "Example term", `EXAMPLE-CODE`, the Vision questions, `RN-nnnn`, `DA-nnnn`, `ADR-nnnn`. They are the structure of the seed (`RF-0003`, commit `9b79aea`).
- **Do not touch the documents of this repository** besides `docs/decisions/adr/ADR-0018-…`, `docs/requirements/rules.md`, `CLAUDE.md` and `CHANGELOG.md`. The `docs/.ownership.yml` here, `docs/contracts/` and `docs/deprecations.md` keep citing: here the trail is internal.
- **Do not amend the toolkit spec** nor touch code comments that already exist or old commit messages.
- A new check, hook or CLI message **keeps** `CI-n`, `HK-n`, `SK-n`, `EXIT-n`, "owner skill: …", skill names and commands. Only the citation of an `artifacts:` prefix and of `spec §n` / the `docs/superpowers/` path goes away.
- The ID or section removed from a string goes into a `// Source rule: …` comment on the line immediately above it, with the same indentation (`E-5`). Never inside the string.
- `CHECK_CATALOG` does not change: `docs/contracts/checks.gen.md` is not regenerated. If some description changes by mistake, regenerate **through the Bash tool**: `node src/tools/gen-checks.ts > docs/contracts/checks.gen.md` (never by hand — `HK-2`).
- A document with frontmatter whose body changes in the commit gets `last-reviewed: 2026-09-16`. Never update the date without changing the body (`CI-9`).
- The `CHANGELOG.md` entry is written **without an artifact ID** (`CI-11`).
- `CLAUDE.md` stays at 60 lines at most, **measured by `split('\n').length`** (`test/docs/agent-contract.test.ts`), and does not repeat a 12-word sentence of an artifact with an owner skill (`CI-7`).
- `npm run lint:check` **already fails on `master`**: 20 `@typescript-eslint/no-base-to-string` errors in code this plan does not touch (`String(raw)` and the like). Fixing them is not in scope. The bar is not to add errors: `npx eslint src test --quiet` stays at 20.
- Format what you touch outside `templates/`: `npx prettier --write <files>`. `templates/`, `docs/contracts/checks.gen.md` and `docs/superpowers/plans/` are ignored by Prettier on purpose.
- The `diff` blocks of this plan show exact lines: `-` goes out, `+` comes in, and the content starts at the second character (the indentation comes after the sign). Lines without a sign are context and do not change. Apply them with the Edit tool, using the `-` lines (and the context) as `old_string`.

## Deviations from the spec, decided while reading the code

1. **Surfaces the spec did not list, but the `M-3` test fails** — and so they come in:
   - `templates/release-note.md` carries `id: REL-0001` in the frontmatter. It becomes `id: {{ID}}`, like `adr.md` and `tdr.md` (Task 3).
   - `templates/ownership.yml` uses `RN-0009` as an example of the written form of an ID. It becomes prose (Task 3).
   - `plugin/agents/decision-adversary.md` (`spec §4`) and `plugin/hooks/run-hook.sh` (the spec path and `ADR-0003` in a shell comment, which ships with the plugin) (Task 4).
   - `src/checks/ci11-external-audience.ts` (`RN-0030`, `ADR-0017`, written by the reader boundary) and the hooks `hk1`, `hk3`, `hk4` and `hk5`, which cite the spec path (Tasks 5 and 6).
   - `src/cli/init.ts:571` (`DA-0003` in the `notInstalled` warning), with the adjustment of `test/cli/init-enforcement.test.ts:105`, which matched the ID (Task 6).
2. **The guidance that leaves the seeds goes into the skill in the same commit** (Task 3), and not together with `M-7`. It is a change of place: splitting it into two commits would leave a gap in which the guidance is nowhere. Task 4 keeps the rest of `M-7`.
3. **`M-8` in two tasks**: checks (Task 5) and hooks, CLI and configuration (Task 6). Case 3 of the test turns green at the end of Task 6.
4. **`test/checks/ci7-ownership-coverage.test.ts`** matched `achado.fix` against `RN-0008`, `RN-0016` and `RN-0017` to tell which fix was given. It now matches the text of the fix (Task 5).
5. **Roadmap narration that the human sweep caught in the same text** is rewritten along with it: "In Phase 7" in `templates/ownership.yml` (already in the spec), "when Phase 6 exists" and "Phase 6" in `contract-keeper`, "`CI-7` in Phase 7; until then, human" in `working-agreements-keeper`, "via `SK-6` when it exists" in `living-docs-bootstrap`, "spec SK-2, rule 3" in `glossary-keeper` and "(spec\n§13)" broken across two lines in `docs-divergence-auditor` — which the per-line pattern of the test does not catch.
6. **`templates/changelog.md` keeps one sentence for the reader**: what the file records and that the format is Keep a Changelog. The writing rule ("Single test…", "The entry is born in the PR…") goes out, since it is external `G`. The criterion of spec `§1` — what serves the reader stays — decides the sentence that is left.
7. **The final verification search** looks for `ADR-[0-9]`, `DA-[0-9]`, `RN-[0-9]` etc., and not `ADR-`, `DA-`, `RN-`: the placeholders `RN-nnnn`, `DA-nnnn` and `ADR-nnnn` of the seeds stay by order of the spec itself and would make the literal search never come back empty.
8. **`M-9` fits in three lines, not four**: `CLAUDE.md` measures 57 today by `split('\n').length`, and the ceiling is 60.

## Out of scope (spec §5, plus what came up while reading)

- Migrating an already-installed repository; `init` neither rewrites nor warns.
- The documents of this repository, the toolkit spec, existing code comments, old commit messages.
- Creating a `CI-n` check or changing the public contract.
- Locking with a test the `B` band, external `G` prose and roadmap narration.
- "Mechanism 1" in the comments of `templates/ownership.yml` and of the hooks: toolkit vocabulary, but not a citation; it stays.
- The code comments that already cite `RNF-0001`, `RN-0012` etc. — a comment is internal trail and keeps citing.

## File map

| File | Task | Responsibility |
| --- | --- | --- |
| `docs/decisions/adr/ADR-0018-toolkit-internal-trail.md` | 1 | Create: the decision |
| `docs/requirements/rules.md` | 1 | Add `RN-0031` |
| `test/distribution/internal-trail.test.ts` | 2 | Create: the detector and the three cases |
| `templates/ownership.yml`, `templates/workflow.yml`, `templates/ids-retired.txt`, `templates/tdr.md`, `templates/release-note.md` | 3 | Comments without trail; `id: {{ID}}` |
| `templates/constitution.md`, `vision.md`, `glossary.md`, `contributing.md`, `errors.md`, `versioning-policy.md`, `deprecations.md`, `requirements.md`, `changelog.md` | 3 | No seed band, no closing comment, no external writing rule |
| `src/cli/init.ts` (`documentsBlock`, `releasesBlock`) | 3 | Comments of the seeded `.ownership.yml` without trail |
| `plugin/skills/{charter,glossary,contract,working-agreements,requirements}-keeper/SKILL.md` | 3 | Receive the guidance that left the seeds |
| `plugin/skills/*/SKILL.md`, `plugin/agents/*.md`, `plugin/hooks/run-hook.sh` | 4 | No trail; template-comment checklist |
| `src/checks/ci1` … `ci11`, `test/checks/ci7-ownership-coverage.test.ts` | 5 | Check messages without trail |
| `src/hooks/hk1` … `hk8`, `src/cli/index.ts`, `src/cli/init.ts:571`, `src/config/ownership.ts`, `test/cli/init-enforcement.test.ts` | 6 | Hook, CLI and configuration messages without trail |
| `CLAUDE.md`, `CHANGELOG.md` | 7 | The policy and the entry; final verification |

---

### Task 1: The decision and the rule (`M-1`, `M-2`)

**Files:**
- Create: `docs/decisions/adr/ADR-0018-toolkit-internal-trail.md`
- Modify: `docs/requirements/rules.md` (end of file, after `RN-0030`; `last-reviewed`)

**Interfaces:**
- Consumes: nothing.
- Produces: the IDs `ADR-0018` and `RN-0031`, cited by the Task 2 test, by the code comments of Tasks 5 and 6 and by the commit messages.

- [ ] **Step 1: Create the ADR**

Create `docs/decisions/adr/ADR-0018-toolkit-internal-trail.md` with exactly:

```markdown
---
id: ADR-0018
title: 'What the toolkit delivers does not cite its own internal trail'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-16
relates-to: [RN-0031, ADR-0017]
supersedes: null
superseded-by: null
---

# ADR-0018 — What the toolkit delivers does not cite its own internal trail

## Context

The toolkit writes text that goes on to live in the repository and the session
of whoever installs it: the files `init` seeds, the comments of `.ownership.yml`
and of the workflow, the text of the plugin skills and the check and hook
messages. That text cites ADRs, RNs and sections of the toolkit spec — a trail
that only resolves inside the toolkit repository. For whoever installs it, the
citation does not exist or, worse, resolves to an item of theirs with another
meaning: the installer's `ADR-0008` is their own eighth decision. And `validate`
passes without saying anything, because `CI-2` does not read YAML comments or
check output.

The seeds, besides, carry fill-in instructions — the band saying the file was
created by `init`, the comment naming the owner skill — that stay in the
document after it is filled in and come to be read by someone who will never
write in it.

`ADR-0017` drew the reader boundary for the documents of a repository. This
decision draws its sibling: what crosses from the toolkit to whoever installs it.

## Alternatives considered

- **Keep it.** Discarded: it is the problem.
- **Qualify the citation** ("`RN-0019` of the toolkit"). Discarded: it still does
  not resolve for the reader.
- **Link the toolkit repository.** Discarded: there is no stable address while
  `DA-0003` is open, and the link throws the reader into an internal decision
  document — the reason `ADR-0017` discards "ID with a link".
- **Centralize the messages in a catalog** and verify only the catalog.
  Discarded: it refactors seventeen files and moves the message away from the
  code that produces it.
- **A generic `CI-n` check**, switched on by a key in `.ownership.yml`. Discarded:
  it grows the public contract for a problem only the toolkit has — only whoever
  distributes text to other repositories has it, and today only the toolkit
  distributes.
- **Human-only verification.** Discarded: it is text that agents and skills write
  on their own, and uniform citation is the habit they learned; the ID comes back
  without anyone seeing it.

## Decision

The text the toolkit delivers to whoever installs it cites neither an artifact
nor a section of the toolkit spec. The identifiers of the public interface, the
skill names and the commands stay citable: they exist in the installer's
environment.

The format of a document lives in the template; the rule for writing it lives in
the skill. Guidance that only serves whoever writes does not stay in a
collection document or in an external document — in it, whoever writes is not
whoever reads.

The trail keeps existing on the inside: in the code comment next to the string
that lost the citation, and in the commit message. The verification is a toolkit
test, which reads the internal prefixes from the toolkit's own `.ownership.yml`,
and not a check that the installer receives.

**This ADR does not amend the toolkit spec.** Uniform citation stays in force
inside the toolkit repository — artifact, test, code, commit. What changes is
what crosses to whoever installs; amending the spec to say "uniform, except…"
would trade a simple rule for a rule with an exception in the place where it is
most read.

## Consequences

### What is gained

Whoever installs receives seeds, skills and messages that stand on their own, and
the filled-in document carries no instruction for anyone. The rule the toolkit
imposes on the installer's external documents is not born broken by the toolkit
itself, and a new family declared in the toolkit comes to be watched in the same
commit.

### What is accepted as lost

**Whoever installs and works without an agent receives the seed without fill-in
instructions.** The instruction lives in the skill.

**An already-installed repository keeps the old text.** `init` does not rewrite
it and does not start warning.

**The test may fail a `src/` string that is not output** — a regex, a piece of
data. Today none matches.

**Whoever maintains the toolkit reads the why of a message in the comment next
to it**, not in the message.

**The toolkit spec keeps asserting uniformity.** Whoever reads only the spec does
not see the carve-out without going through this ADR.
```

- [ ] **Step 2: Add the rule**

In `docs/requirements/rules.md`, replace `last-reviewed: 2026-09-15` with `last-reviewed: 2026-09-16` and add to the end of the file, after the last paragraph of `RN-0030` (with a blank line before):

```markdown
## RN-0031 — What the toolkit delivers to whoever installs it does not cite the toolkit's internal trail

- **status:** draft
- **relates-to:** ADR-0018, RN-0030
- **out of scope:** code comments and commit messages; the documents of the toolkit's own repository; the installer's project IDs that a message shows; the identifiers of the public interface, skill names and commands

The files `init` seeds, the templates, the plugin text and the output of the CLI
and of the hooks do not cite a prefix declared in the toolkit's `artifacts:`, a
section of the toolkit spec or the path of an internal document of it. Whoever
installs cannot resolve the citation — or resolves it to an item of their own,
with another meaning.
```

- [ ] **Step 3: Format**

Run: `npx prettier --write docs/decisions/adr/ADR-0018-toolkit-internal-trail.md docs/requirements/rules.md`
Expected: both files listed, no error.

- [ ] **Step 4: Verify**

Run: `npm test && node src/cli/index.ts validate`
Expected: all tests pass (including `RN-0010` of `test/docs/agent-contract.test.ts`, which reads the titles of `rules.md`); `living-docs: no violations found.` If `CI-2` flags a citation that does not resolve, the ID typed in `relates-to` is wrong.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0018-toolkit-internal-trail.md docs/requirements/rules.md
git commit -F - <<'EOF'
docs(ADR-0018): records that what the toolkit delivers does not cite its own internal trail

The decision is born that seeds, templates, plugin and CLI and hook messages
do not cite artifacts or sections of the toolkit spec, together with rule
RN-0031, which makes it verifiable by a toolkit test. Both are born draft.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: The distribution test, red (`M-3`)

**Files:**
- Create: `test/distribution/internal-trail.test.ts`

**Interfaces:**
- Consumes: `runInit(root: string, options: InitOptions): InitResult` and `STAGES` from `src/cli/init.ts`; `loadOwnership(root: string): OwnershipConfig` from `src/config/ownership.ts` (uses `.artifacts[].idPrefix` and `.idFormat`); `toolkitRoot(): string` from `src/core/roots.ts`; `DEFAULT_ID_FORMAT` and `parseId(value, format): { prefix; number } | null` from `src/docs/schema.ts`; `findCitations(source, format): { id; line }[]` from `src/ids/citations.ts`; `withTempRepo(files, fn)` from `test/helpers/tmp.ts`.
- Produces: four tests with stable names, which the following tasks run through `--test-name-pattern`:
  - `RN-0031: the detector …` (green from the start)
  - `RN-0031: what init seeds …` (green in Task 3)
  - `RN-0031: the plugin text …` (green in Task 4)
  - `RN-0031: code strings …` (green in Task 6)

`package.json` already runs `node --test "test/**/*.test.ts"`: the new directory comes in without configuration.

- [ ] **Step 1: Write the test**

Create `test/distribution/internal-trail.test.ts` with exactly:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'
import { runInit, STAGES } from '../../src/cli/init.ts'
import { loadOwnership } from '../../src/config/ownership.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { DEFAULT_ID_FORMAT, parseId } from '../../src/docs/schema.ts'
import { findCitations } from '../../src/ids/citations.ts'
import { withTempRepo } from '../helpers/tmp.ts'

/**
 * RN-0031: what the toolkit delivers to whoever installs it — the files `init`
 * seeds, the templates, the plugin text and the strings of the code — does not
 * cite the toolkit's internal trail (ADR-0018).
 *
 * Internal trail is a prefix declared in `artifacts:` of the toolkit's
 * `.ownership.yml`, plus `spec §<n>` and the `docs/superpowers/` path. No list
 * of prefixes lives here: `CI-n`, `HK-n`, `SK-n`, `CM-n` and `EXIT-n` stay out
 * because nobody declares them as an artifact family — the same design as CI-11.
 */
const ROOT = toolkitRoot()
const CONFIG = loadOwnership(ROOT)
const INTERNAL = new Set(CONFIG.artifacts.map(artifact => artifact.idPrefix))

interface Trail {
  file: string
  line: number
  excerpt: string
}

/** The occurrences of internal trail in `text`, with a 1-indexed line. */
function trailIn(file: string, text: string): Trail[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const found: Trail[] = []

  for (const citation of findCitations(text, CONFIG.idFormat)) {
    const parsed = parseId(citation.id, CONFIG.idFormat)

    if (parsed !== null && INTERNAL.has(parsed.prefix)) {
      found.push({ file, line: citation.line, excerpt: citation.id })
    }
  }
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/spec §\d+|docs\/superpowers\//g)) {
      found.push({ file, line: index + 1, excerpt: match[0] })
    }
  })

  return found
}

function report(found: readonly Trail[]): string {
  return found.map(trail => `${trail.file}:${trail.line} — ${trail.excerpt}`).join('\n')
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)],
  )
}

function toolkitPath(absolute: string): string {
  return relative(ROOT, absolute).split(sep).join('/')
}

test('RN-0031: the detector finds the internal trail and leaves the public interface and the placeholder', () => {
  const text = [
    'Source rule: ADR-0011 and spec §3, in docs/superpowers/research/x.md.',
    'CI-7 fails, HK-2 blocks, SK-7 and EXIT-2 are public.',
    '| Term | Source | RN-nnnn |',
  ].join('\n')

  assert.deepEqual(
    trailIn('x', text).map(trail => `${trail.line}:${trail.excerpt}`),
    ['1:ADR-0011', '1:spec §3', '1:docs/superpowers/'],
  )
  assert.ok(INTERNAL.has('ADR') && INTERNAL.has('RN'), 'the set comes from the toolkit .ownership.yml')
})

test("RN-0031: what init seeds, at every stage, and the raw templates do not cite the toolkit's internal trail", () => {
  const found: Trail[] = []
  const comments: string[] = []
  let scanned = 0

  for (const stage of STAGES) {
    withTempRepo({}, root => {
      const result = runInit(root, {
        owner: '@time',
        dryRun: false,
        stage,
        idFormat: DEFAULT_ID_FORMAT,
        invoke: 'npx living-docs',
        marketplace: 'time/living-docs',
      })

      for (const entry of result.created) {
        // `created` brings directories (`docs/decisions/adr/`) and the settings
        // line with an explanatory suffix after the path.
        const path = entry.split(' ')[0] ?? entry
        const absolute = join(root, path)

        if (!existsSync(absolute) || statSync(absolute).isDirectory()) {
          continue
        }
        const source = readFileSync(absolute, 'utf8')

        scanned++
        found.push(...trailIn(`[${stage}] ${path}`, source))
        // No stage seeds a per-file artifact: everything init writes is a
        // collection document or an external document, and neither keeps a
        // comment for whoever writes.
        if (path.endsWith('.md') && source.includes('<!--')) {
          comments.push(`[${stage}] ${path}`)
        }
      }
    })
  }

  // The templates init does not seed (adr, tdr, migration, release-note) are
  // only covered by this raw sweep.
  for (const absolute of filesUnder(join(ROOT, 'templates'))) {
    scanned++
    found.push(...trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))
  }

  assert.ok(scanned > 20, `sweep too empty: ${scanned} file(s)`)
  assert.deepEqual(comments, [], `seed with an HTML comment:\n${comments.join('\n')}`)
  assert.equal(found.length, 0, `toolkit internal trail in what init delivers:\n${report(found)}`)
})

test("RN-0031: the plugin text does not cite the toolkit's internal trail", () => {
  const files = filesUnder(join(ROOT, 'plugin'))
  const found = files.flatMap(absolute => trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))

  assert.ok(files.length > 10, `sweep too empty: ${files.length} file(s)`)
  assert.equal(found.length, 0, `toolkit internal trail in the plugin:\n${report(found)}`)
})

test("RN-0031: code strings do not cite the toolkit's internal trail — a comment may", () => {
  const files = filesUnder(join(ROOT, 'src')).filter(absolute => absolute.endsWith('.ts'))
  const found: Trail[] = []

  for (const absolute of files) {
    const file = toolkitPath(absolute)
    const source = ts.createSourceFile(absolute, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true)

    const visit = (node: ts.Node): void => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line

        for (const trail of trailIn(file, node.text)) {
          found.push({ ...trail, line: start + trail.line })
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(source)
  }

  assert.ok(files.length > 20, `sweep too empty: ${files.length} file(s)`)
  assert.equal(found.length, 0, `toolkit internal trail in a src/ string:\n${report(found)}`)
})
```

- [ ] **Step 2: Run and see it fail for the right reasons**

Run: `node --test --test-reporter=tap test/distribution/internal-trail.test.ts 2>&1 | grep -E "^(not ok|ok) |^# (pass|fail)"`
Expected:

```
ok 1 - RN-0031: the detector finds the internal trail and leaves the public interface and the placeholder
not ok 2 - RN-0031: what init seeds, at every stage, and the raw templates do not cite the toolkit's internal trail
not ok 3 - RN-0031: the plugin text does not cite the toolkit's internal trail
not ok 4 - RN-0031: code strings do not cite the toolkit's internal trail — a comment may
# pass 1
# fail 3
```

Run: `node --test test/distribution/internal-trail.test.ts 2>&1 | grep -oE "seed with an HTML comment|\[production\] docs/deprecations\.md|plugin/skills/glossary-keeper/SKILL\.md:17 — ADR-0004|src/checks/ci1-structure\.ts:45 — spec §2" | sort -u`
Expected, the four lines: `[production] docs/deprecations.md`, `plugin/skills/glossary-keeper/SKILL.md:17 — ADR-0004`, `seed with an HTML comment` and `src/checks/ci1-structure.ts:45 — spec §2`. Case 2 fails first on the HTML-comment lock: in `production` and `multi-team` it lists nine paths (`docs/requirements/functional.md`, `non-functional.md`, `rules.md`, `docs/glossary.md`, `docs/charter/constitution.md`, `vision.md`, `docs/contracts/errors.md`, `versioning-policy.md`, `docs/deprecations.md`). If case 1 fails, the detector is wrong: stop and fix it before going on.

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npx eslint test/distribution && npx prettier --check test/distribution`
Expected: typecheck without error; ESLint only with the `no-floating-promises` warnings on the `test(...)` calls, the same as the other tests in the repository; Prettier `All matched files use Prettier code style!`.

- [ ] **Step 4: Commit**

```bash
git add test/distribution/internal-trail.test.ts
git commit -F - <<'EOF'
test(RN-0031): locks the toolkit internal trail in what it delivers

The test reads the internal prefixes from the toolkit's .ownership.yml and
sweeps three surfaces: what init seeds at each stage (and the raw templates),
the plugin, and the string literals of src/. It is born red on all three; each
one turns green in the commit that cleans it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: The seeds, the templates and the comments `init` assembles (`M-4`, `M-5`, `M-6`, and the guidance of `M-7`)

**Files:**
- Modify: `templates/ownership.yml`, `templates/workflow.yml`, `templates/ids-retired.txt`, `templates/tdr.md`, `templates/release-note.md`
- Modify: `templates/constitution.md`, `templates/vision.md`, `templates/glossary.md`, `templates/contributing.md`, `templates/errors.md`, `templates/versioning-policy.md`, `templates/deprecations.md`, `templates/requirements.md`, `templates/changelog.md`
- Modify: `src/cli/init.ts` (`documentsBlock`, `releasesBlock`)
- Modify: `plugin/skills/charter-keeper/SKILL.md`, `plugin/skills/glossary-keeper/SKILL.md`, `plugin/skills/contract-keeper/SKILL.md`, `plugin/skills/working-agreements-keeper/SKILL.md`, `plugin/skills/requirements-keeper/SKILL.md`

**Interfaces:**
- Consumes: the `RN-0031: what init seeds …` test from Task 2.
- Produces: `templates/release-note.md` with `id: {{ID}}` (whoever fills it in swaps the placeholder, as already happens in `adr.md`). No code signature changes.

**The criterion for each sentence** (spec `§1`): what serves whoever **reads** the document stays as prose with no toolkit or skill name; what serves only whoever **writes** goes out — and, before it goes out, we confirm that the owner skill already says it. The table below is that confirmation:

| Sentence that leaves the seed | Where the skill already says it, or what goes into it in this commit |
| --- | --- |
| constitution: format `— verified by`; a principle without enforcement is a slogan; refusal | `charter-keeper`, Procedure step 2 (already says it) |
| constitution, glossary, contributing, errors, versioning-policy: "Replace the example…; deleting what is left is part of the work" | Goes in: new step in `charter-keeper`, `glossary-keeper`, `contract-keeper` and `working-agreements-keeper` |
| vision: "if the change alters none of the three, it is not a Vision change" | `charter-keeper`, step 1 (already says it) |
| glossary: a single meaning; two terms and a `banned` | `glossary-keeper`, step 2 (already says it) |
| glossary: "Terms go in as rows above" | `glossary-keeper`, "Row format: `templates/glossary.md`" (already says it) |
| errors: a published code never changes meaning; with no replacement it is a break, goes through policy and ADR | `contract-keeper`, step 6 (already says it) |
| versioning-policy: what is generated is not written here | `contract-keeper`, Overview (already says it) |
| deprecations: the four things; if one is missing it is a break | `release-historian`, step 4 (already says it) |
| changelog: single test; the entry is born in the PR; Keep a Changelog | `release-historian`, steps 2 and 3 and the table (already says it) |
| requirements: "Sections go in below" | Goes in: `requirements-keeper`, step 5 |
| `Owner skill: …` comments | `docs/.ownership.yml` declares it (`skill:`) |

- [ ] **Step 1: `templates/ownership.yml`**

```diff
 # The only file specific to this project. Hooks and checks know no
-# path — they read from here. Source rule: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §3.
+# path — they read from here.
 version: 1
 stale-after-months: 6

-# The written form of an ID in this project (ADR-0011). Identity does NOT depend
-# on it: `RN009` and `RN-0009` are the same item. Change this to adopt a
-# repository whose IDs are already written another way — never renumber the
-# repository to fit the pattern.
+# The written form of an ID in this project. Identity does NOT depend on it: the
+# same prefix with the same number is the same item, with or without a
+# separator and with any number of leading zeros. Change this to adopt a
+# repository whose IDs are already written another way — never renumber the
+# repository to fit the pattern.
```

```diff
     # The table is read by people, in Portuguese; the check asks for the
     # canonical name. The mapping lives here because it is the only thing specific to the
-    # project (spec §3).
+    # project.
```

```diff
 # Mechanism 1: code → owning doc. HK-4 reminds after the edit, HK-5 asks
-# before the commit. In Phase 7, CI-7 reads from here too. Fill it in with the paths of
-# YOUR code — init does not invent a link, because a link nobody recognizes
-# teaches people to ignore the reminder. Example:
+# before the commit, and CI-7 reads from here too. Fill it in with the paths of
+# YOUR code — init does not invent a link, because a link nobody recognizes
+# teaches people to ignore the reminder. Example:
```

The comments of `generated` and `consumer-visible-paths` do not change.

- [ ] **Step 2: `templates/workflow.yml`, `templates/ids-retired.txt`, `templates/tdr.md`, `templates/release-note.md`**

`templates/workflow.yml`:

```diff
 # Living-documentation enforcement, installed by `living-docs init`.
 #
-# The invocation mode is a parameter of whoever installs (`--invoke`): how the toolkit
-# reaches this CI is an open decision — `DA-0003` in the toolkit repository —, and
-# fixing an answer here would turn the toolkit's choice into a rule of the
-# consumer.
+# The invocation mode is a parameter of whoever installs: `--invoke` chooses how the CLI
+# is called in this CI.
 #
 # This file is yours: `init` only creates it when it does not exist, and never
 # rewrites it.
```

`templates/ids-retired.txt` ends up with exactly:

```
# Retired IDs. They are never recycled.
# One ID per line.
```

`templates/tdr.md`:

```diff
-# Payment trigger in machine form (RN-0019, ADR-0007). Uncomment and
+# Payment trigger in machine form. Uncomment and
```

`templates/release-note.md`:

```diff
 ---
-id: REL-0001
+id: {{ID}}
 title: v0.0.0
```

The `<!-- … -->` comments of `adr.md`, `tdr.md`, `release-note.md` and `migration.md` stay: they are `F`, and they disappear when filled in.

- [ ] **Step 3: The charter seeds**

`templates/constitution.md` — the body, after the frontmatter, ends up with exactly:

```markdown
# Constitution

What is inviolable in this project. Each principle names what verifies it: a
hook, a lint, a test, a review or a check.

## Principles

1. Replace with a real principle of this project — verified by <name it here>.

## Amendment log

- {{TODAY}} — v1 — Initial creation — human.
```

`templates/vision.md` — the body, after the frontmatter, ends up with exactly:

```markdown
# Product Vision

Three questions, and only them: what problem this product solves, for whom, and
how we know it has been solved.

**What problem:** replace with the real problem this product solves.

**For whom:** replace with who feels this problem.

**Success metric:** replace with the metric that proves the problem was solved.
```

The frontmatter of both does not change. Each file ends with a line break after the last line shown.

- [ ] **Step 4: Glossary, contributing and requirements**

`templates/glossary.md` — the body, after the frontmatter:

```markdown
# Glossary

Each term has a single meaning. A `banned` term is not used: the "Do not
confuse with" column points to the replacement.

| Term | Definition | Name in code | Do not confuse with | Source | Status |
| --- | --- | --- | --- | --- | --- |
| Example term | Replace with the real definition | `nameInCode` | What looks like a synonym but is not | RN-nnnn | active |
```

`templates/contributing.md` — delete the two lines of the band and the blank line that follows them:

```diff
 # How we contribute

-> Seed created by `living-docs init`. Replace what is not true in this
-> project; deleting what is left is part of the work.
-
 ## The cycle
```

`templates/requirements.md` — delete the closing comment and the blank line before it. The file now ends in:

```markdown
The `nnnn` above is literal on purpose: the example must not become a real
requirement or a dangling citation. Replace it with the next free number,
checked against `docs/ids-retired.txt`.
```

- [ ] **Step 5: Contracts**

`templates/errors.md` — the body, after the frontmatter:

```markdown
# Error catalog

A code, once published, never changes meaning: when it goes out of use, it
gets `deprecated` and a replacement. The code is the contract; the displayable
message is not part of it.

| Code | Meaning | When it occurs | Transport | Public | Status |
| --- | --- | --- | --- | --- | --- |
| EXAMPLE-CODE | Replace with the stable meaning, not the displayable message | The observable condition that triggers it | HTTP 400 / exit 2 / event | yes | active |
```

`templates/versioning-policy.md`:

```diff
 # Versioning policy

-> Seed created by `living-docs init`. It is the policy **around** the contract,
-> not the contract: what is generated is not written here. Replace what is not
-> true in this project.
+This is the policy **around** the public contract, not the contract: what is
+generated lives in the generated artifact.

 ## What is public
```

and, at the end of the file, delete the blank line and the closing comment:

```diff
 A compatibility-breaking change goes through an ADR — the decision and what we
 accept to lose are recorded, not left in the head of whoever was in the room.
-
-<!-- Owner skill: contract-keeper. -->
```

- [ ] **Step 6: Historical trail (external documents)**

`templates/deprecations.md` — the body, after the frontmatter:

```markdown
# Deprecations

| What | Announced on | Removed in | Replacement | Migration guide | Status |
| --- | --- | --- | --- | --- | --- |
```

`templates/changelog.md` ends up with exactly (deviation 6):

```markdown
# Changelog

What changes for whoever uses this project, version by version. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security
```

`templates/open-decisions.md`, `templates/definition-of-done.md` and `templates/agent-contract.md` do not change: their prose is for whoever reads the internal document, and the identifiers are `D`.

- [ ] **Step 7: The comments `init` assembles**

In `src/cli/init.ts`, `documentsBlock`:

```diff
   return [
-    '# Document with an owner and NO ID family (ADR-0008, which resolves DA-0002).',
+    // Source rule: ADR-0008, which resolves DA-0002.
+    '# Document with an owner and NO ID family.',
     '# CI-4 enforces the review and CI-7 enforces the owner; CI-1, CI-2 and HK-1 do not read from here.',
```

In `releasesBlock`:

```diff
       '    audience: external',
-      '    # A published release note is frozen by HK-1 (spec §5, SK-7, rule 4).',
+      // Source rule: spec §5, SK-7, rule 4.
+      '    # A published release note is frozen by HK-1.',
       '    append-only: true',
```

- [ ] **Step 8: The writer's guidance goes into the skills**

`plugin/skills/charter-keeper/SKILL.md`, after step 6 of the Procedure:

```diff
 6. **Stop after writing the amendment.** Accepting is a human act — do not change
    the published body on your own.
+7. **The seed is not content.** On the first write over what `init`
+   seeded, replace the example with the real one and delete what is left.
```

`plugin/skills/glossary-keeper/SKILL.md`, after step 8:

```diff
 8. **Cite the term (by name) in the commit message.**
+9. **The seed is not content.** On the first write over what `init`
+   seeded, the "Example term" row goes out and the real vocabulary comes in.
```

`plugin/skills/contract-keeper/SKILL.md`, after step 9:

```diff
 9. **Cite the affected ID in the commit message.**
+10. **The seed is not content.** On the first write over what `init`
+    seeded, `EXAMPLE-CODE` goes out, and so does anything in the versioning
+    policy that is not true for this project.
```

`plugin/skills/working-agreements-keeper/SKILL.md`, after step 9:

```diff
    agent or the Definition of Done) and a line in CODEOWNERS.
+10. **The seed is not content.** On the first write over what `init`
+    seeded, whatever is not true in this project goes out — deleting what is left
+    is part of the work.
```

`plugin/skills/requirements-keeper/SKILL.md`, step 5:

```diff
 5. **Take the next free ID** of the prefix, checking `docs/ids-retired.txt`.
-   Never recycle, never skip.
+   Never recycle, never skip. The new section goes at the end of the file, after
+   the ones that already exist.
```

- [ ] **Step 9: Run the case and see it pass**

Run: `node --test --test-name-pattern="what init seeds" test/distribution/internal-trail.test.ts`
Expected: PASS (`# pass 1`, `# fail 0`). If it fails, the message lists `file:line — excerpt`: fix the excerpt, never the test.

- [ ] **Step 10: Nothing else broke**

Run: `npx prettier --write src/cli/init.ts plugin/skills/charter-keeper/SKILL.md plugin/skills/glossary-keeper/SKILL.md plugin/skills/contract-keeper/SKILL.md plugin/skills/working-agreements-keeper/SKILL.md plugin/skills/requirements-keeper/SKILL.md && npm run typecheck && node --test "test/cli/**/*.test.ts" "test/acceptance/**/*.test.ts" "test/plugin/**/*.test.ts" "test/config/**/*.test.ts" "test/docs/**/*.test.ts"`
Expected: typecheck clean; all PASS. `test/plugin/authoring.test.ts` stays green (sections in order, checklist with verification). `test/cli/init.test.ts` (`RN-0019`, the commented-out `pay-when` in `tdr.md`) stays green.

- [ ] **Step 11: Commit**

```bash
git add templates src/cli/init.ts plugin/skills/charter-keeper/SKILL.md plugin/skills/glossary-keeper/SKILL.md plugin/skills/contract-keeper/SKILL.md plugin/skills/working-agreements-keeper/SKILL.md plugin/skills/requirements-keeper/SKILL.md
git commit -F - <<'EOF'
docs(RN-0031): init seeds lose the toolkit trail and the writer's instruction

The .ownership.yml, the workflow, the retired IDs and the templates stop
citing ADRs, DAs, RNs and sections of the toolkit spec. The Markdown seeds
lose the seed band and the owner-skill comment; what served the reader became
prose, and what served only the writer moved to the owner skill in the same
commit. The release note is now born with id: {{ID}}, like ADR and TDR.

Docs: none — RN-0031, which this change fulfills, was born in the decision commit; what changes in CONTRIBUTING is only the fill-in guidance, which lives in the skill.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: The plugin (`M-7`)

**Files:**
- Modify: `plugin/skills/charter-keeper/SKILL.md`, `plugin/skills/contract-keeper/SKILL.md`, `plugin/skills/glossary-keeper/SKILL.md`, `plugin/skills/living-docs-bootstrap/SKILL.md`, `plugin/skills/release-historian/SKILL.md`, `plugin/skills/requirements-keeper/SKILL.md`, `plugin/skills/working-agreements-keeper/SKILL.md`, `plugin/skills/decision-recorder/SKILL.md`
- Modify: `plugin/agents/decision-adversary.md`, `plugin/agents/docs-divergence-auditor.md`, `plugin/hooks/run-hook.sh`

**Interfaces:**
- Consumes: the `RN-0031: the plugin text …` test from Task 2.
- Produces: no code. The references to `templates/…` stay: the agent reads the template at the root of the installed toolkit.

The Markdown table lines shown below are the ones from before Prettier; after Step 9 it realigns the columns.

- [ ] **Step 1: `charter-keeper`**

```diff
-strategy. Neither has a numbered ID family (`ADR-0004`) —
-a change in them is rare enough not to need one.
+strategy. Neither has a numbered ID family — a change in them is rare
+enough not to need one.
```

- [ ] **Step 2: `contract-keeper`**

```diff
 **Do not use** to document internal behavior: what a consumer cannot
 observe is not contract, it is implementation — and implementation does not become
-a document (spec §13). A business rule is `requirements-keeper`; the "why" of the
-change is `decision-recorder`.
+a document. A business rule is `requirements-keeper`; the "why" of the change is
+`decision-recorder`.
```

```diff
 2. **To change what is generated, change the annotated source** and run the command
    declared in `generated[].command`. The command prints to standard output and does not
-   write a file (`ADR-0005`) — redirect it yourself to the `path`.
+   write a file — redirect it yourself to the `path`.
```

```diff
-8. **A change visible to the consumer generates a CHANGELOG entry** — when
-   Phase 6 (`release-historian`, `CI-6`) exists. Until then, this is human
-   verification, and the versioning policy says what to do.
+8. **A change visible to the consumer generates a CHANGELOG entry** — the entry
+   belongs to `release-historian`, and `CI-6` enforces it on the paths the project
+   declares in `consumer-visible-paths`.
```

```diff
-| Require a replacement before deprecating                      | Write the migration guide (it is `release-historian`, Phase 6) |
+| Require a replacement before deprecating                      | Write the migration guide (it is `release-historian`) |
```

```diff
-- [ ] The generator prints to standard output and does not write a file — verification: human (`ADR-0005`)
+- [ ] The generator prints to standard output and does not write a file — verification: human
```

- [ ] **Step 3: `glossary-keeper`** (seven citations)

```diff
 The glossary is the single source of names for a concept. A term is identified
-by its **name**, never by a numbered ID (`ADR-0004`, `RN-0011`) — a divergence
-between the name in the code and the term is a bug, not a synonym.
+by its **name**, never by a numbered ID — a divergence between the name in the
+code and the term is a bug, not a synonym.
```

```diff
 4. **Every definition points to its source** — the `RN`/`ADR` that originates it. Without a source,
-   the entry is born `status: draft` until one exists (spec SK-2, rule 3).
+   the entry is born `status: draft` until one exists.
```

```diff
 6. **Name by the term, not by ID**, in any citation — the glossary has no
-   `<PREFIX>-<number>` syntax (`ADR-0004`, `RN-0011`).
-7. **Run `living-docs validate`** before finishing — knowing that today it does not
-   sweep `docs/glossary.md` (`DA-0002` open; `ADR-0004` explains
-   why). The duplicate and source verification is yours, not the CI's.
+   `<PREFIX>-<number>` syntax.
+7. **Run `living-docs validate`** before finishing — knowing that it does not
+   verify the terms: duplicates and source are your verification, not the CI's.
```

```diff
-- [ ] No term gained a numbered ID — human verification (`RN-0011`)
+- [ ] No term gained a numbered ID — human verification
```

- [ ] **Step 4: `living-docs-bootstrap`** (five citations)

```diff
    Also read the `format` line: when the repository writes IDs another
-   way (`RN001` instead of `RN-0009`), the inventory says which form it found and
-   how many occurrences it read in it. **Confirm with whoever owns the repository** and
-   declare it with `--id-separator` and `--id-padding` — never renumber what already
-   exists to fit the toolkit's pattern (`ADR-0011`, `RF-0014`).
+   way (without a separator, or with another number of zeros), the inventory says
+   which form it found and how many occurrences it read in it. **Confirm with
+   whoever owns the repository** and declare it with `--id-separator` and
+   `--id-padding` — never renumber what already exists to fit the toolkit's
+   pattern.
```

```diff
    `production` (production with users) or `multi-team` (multiple teams) — and
-   derive the **minimum** set of phases (spec §10). The four names are the ones
+   derive the **minimum** set of phases. The four names are the ones
```

```diff
      requiring `id-prefix`; `CI-1`, `CI-2` and `HK-1` do not read `documents:`, and `CI-4` and
-     `CI-7` do (`ADR-0008`).
+     `CI-7` do.
```

```diff
-5. **Register the index in the agent contract** (`AGENTS.md`/`CLAUDE.md`, via
-   `SK-6` when it exists): which artifact answers what and which skill owns it.
+5. **Register the index in the agent contract** (`AGENTS.md`/`CLAUDE.md`, via
+   `working-agreements-keeper`): which artifact answers what and which skill owns it.
```

- [ ] **Step 5: `release-historian`** (two citations and the checklist item)

```diff
 The expensive mistake here has a name: deriving the CHANGELOG from `git log`. The result is
-the document that narrates the code — exactly what spec §13 refuses — and it
-rots fast, because nobody outside can use it to decide whether
-to update.
+the document that narrates the code, and it rots fast, because nobody outside
+can use it to decide whether to update.
```

```diff
-- [ ] Every registered deprecation has the four things — verification: human (`RN-0015`).
+- [ ] Every registered deprecation has the four things — verification: human.
```

and, right after the migration-guide item of the Checklist:

```diff
 - [ ] Every compatibility break has a migration guide that says in running text why it was decided, and the commit that creates it cites the ADR — verification: human.
+- [ ] No template comment survived the filling in of the release note or the migration guide — verification: human.
```

- [ ] **Step 6: `requirements-keeper`, `working-agreements-keeper`, `decision-recorder`**

`requirements-keeper`:

```diff
 **Do not use** to describe what the code already does. That is not a requirement, it is
-narration — and code narration is anti-requirement no. 4 of spec §13.
+narration — and a document that narrates the code ages with every commit that changes
+the code.
```

`working-agreements-keeper`:

```diff
 8. **The agent contract does not repeat text of an owning artifact, and that is now
-   verified.** `CI-7` compares sentence by sentence (twelve-word floor,
-   `ADR-0009`) against the artifacts with an owner skill. When it flags, the fix is to
+   verified.** `CI-7` compares sentence by sentence (twelve-word floor) against
+   the artifacts with an owner skill. When it flags, the fix is to
    delete the sentence and leave the pointer — never touch the threshold.
```

```diff
-- [ ] Every factual claim of the agent contract is a link to the owning artifact, not a copy — verification: `CI-7` in Phase 7; until then, human.
+- [ ] Every factual claim of the agent contract is a link to the owning artifact, not a copy — verification: human; `CI-7` catches the word-for-word copy.
```

```diff
-- [ ] `last-reviewed` was updated only in the files that really changed — verification: human (a bulk bump is an anti-requirement of spec §13).
+- [ ] `last-reviewed` was updated only in the files that really changed — verification: human (a bulk bump switches the review off while pretending to fulfill it).
```

`decision-recorder`, at the end of the Checklist:

```diff
 - [ ] Every `open` debt declares a verifiable `pay-when` — verification: `CI-4`.
+- [ ] No template comment survived the filling in of the ADR or the TDR — human verification
```

- [ ] **Step 7: The agents**

`plugin/agents/decision-adversary.md`:

```diff
-- Does not decide whether the proposal is accepted. That is a human act in every case
-  (spec §4).
+- Does not decide whether the proposal is accepted. That is a human act in every case.
```

`plugin/agents/docs-divergence-auditor.md`:

```diff
 - Does not count documents, does not measure documentation coverage, does not suggest creating a
-  new document to narrate code. All three are anti-requirements (spec
-  §13).
+  new document to narrate code. None of the three produces documentation that
+  anyone uses.
```

- [ ] **Step 8: `plugin/hooks/run-hook.sh`**

```diff
-# Fail-open by contract (docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7):
+# Fail-open by contract:
 # a missing node, a missing dependency, a timeout or an execution error result in an
 # empty output and exit 0. A broken hook must not block the work.
 #
-# Two roots, and they are not confused (ADR-0003): the **toolkit** code comes out
+# Two roots, and they are not confused: the **toolkit** code comes out
```

Do not change anything else in the script: `test/plugin/manifest.test.ts` and `test/plugin/wrapper-docker.test.ts` read its code.

- [ ] **Step 9: Format, run the case and see it pass**

Run: `npx prettier --write "plugin/skills/**/SKILL.md" plugin/agents/decision-adversary.md plugin/agents/docs-divergence-auditor.md && node --test --test-name-pattern="plugin text" test/distribution/internal-trail.test.ts && node --test "test/plugin/**/*.test.ts"`
Expected: PASS on both. If the case still flags something, the message says `file:line — excerpt`: rewrite in running text what the item says, without citing.

- [ ] **Step 10: Commit**

```bash
git add plugin
git commit -F - <<'EOF'
docs(RN-0031): skills, agents and the hook wrapper stop citing the toolkit trail

The citations of ADRs, RNs, DAs and sections of the toolkit spec become
running text that says what the item says, and the roadmap narration (phases
that "will exist") goes away. decision-recorder and release-historian gain a
checklist item that no template comment survives the filling in.

Docs: none — RN-0031, which this rewrite fulfills, was born in the decision commit; how we work in this repository does not change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: The check messages (`M-8`, first half)

**Files:**
- Modify: `src/checks/ci1-structure.ts`, `ci2-ids.ts`, `ci3-traceability.ts`, `ci4-staleness.ts`, `ci5-contract-drift.ts`, `ci6-changelog-required.ts`, `ci7-ownership-coverage.ts`, `ci8-links.ts`, `ci9-commit-discipline.ts`, `ci10-trigger-routing.ts`, `ci11-external-audience.ts`
- Modify: `test/checks/ci7-ownership-coverage.test.ts:103-127`

**Interfaces:**
- Consumes: the `RN-0031: code strings …` test from Task 2.
- Produces: no signature changes. `Finding.message` and `Finding.fix` keep carrying `CI-n`, `HK-n` and "owner skill: …". `CHECK_CATALOG` (`src/checks/catalog.ts`) does not change.

- [ ] **Step 1: Adjust the `CI-7` test that matched an ID**

In `test/checks/ci7-ownership-coverage.test.ts`:

```diff
     assert.ok(achado)
-    // The rule cited is the code→doc link one, not the Definition of Done one.
-    assert.match(achado.fix, /RN-0008/)
-    assert.doesNotMatch(achado.fix, /RN-0017/)
+    // The fix given is the code→doc link one, not the Definition of Done one.
+    assert.match(achado.fix, /nobody can update/)
+    assert.doesNotMatch(achado.fix, /intent is not a definition of done/)
   })
```

```diff
     assert.ok(achado)
-    assert.match(achado.fix, /RN-0016/)
-    assert.match(achado.fix, /RN-0008/)
-    assert.doesNotMatch(achado.fix, /RN-0017/)
+    assert.match(achado.fix, /only enforceable if the doc has an owner/)
+    assert.doesNotMatch(achado.fix, /intent is not a definition of done/)
   })
```

Run: `node --test test/checks/ci7-ownership-coverage.test.ts`
Expected: PASS — both sentences already exist in today's fixes; the test passes before and after the rewrite.

- [ ] **Step 2: `ci1-structure.ts`**

```diff
         'Missing frontmatter — every living-documentation artifact opens with the standard YAML block.',
-        'Add `id`, `title`, `status`, `owner`, `trigger` and `last-reviewed` between `---` at the top (spec §2).',
+        // Source rule: spec §2.
+        'Add `id`, `title`, `status`, `owner`, `trigger` and `last-reviewed` between `---` at the top.',
```

```diff
-          `Use ${writeId(doc.rule.idPrefix, 1, format)} (spec §8).`,
+          // Source rule: spec §8.
+          `Use ${writeId(doc.rule.idPrefix, 1, format)}.`,
```

Both occurrences of `Valid states` — the frontmatter one and the collection-item one:

```diff
           `\`status\` "${String(data.status)}" outside the state machine of ${doc.rule.idPrefix}.`,
-          `Valid states: ${states.join(' → ')} (spec §4).`,
+          // Source rule: spec §4.
+          `Valid states: ${states.join(' → ')}.`,
```

```diff
             `Item ${item.id} with status "${item.status}" outside the state machine of ${doc.rule.idPrefix}.`,
-            `Valid states: ${states.join(' → ')} (spec §4).`,
+            // Source rule: spec §4.
+            `Valid states: ${states.join(' → ')}.`,
```

```diff
-          'Name the event: "in the same PR that changes src/domain/billing", "when a new error code is added" (spec §2, mechanism 2).',
+          // Source rule: spec §2, mechanism 2.
+          'Name the event: "in the same PR that changes src/domain/billing", "when a new error code is added".',
```

```diff
-        'Use YYYY-MM-DD, and only touch this field if you really reviewed the document (spec §2).',
+        // Source rule: spec §2.
+        'Use YYYY-MM-DD, and only touch this field if you really reviewed the document.',
```

```diff
       if (item.status === '') {
         findings.push(
-          error(doc.file, item.line, `Item ${item.id} does not declare \`status\`.`, `Add \`- **status:** ${states[0]}\` right below the title (spec §4).`),
+          // Source rule: spec §4.
+          error(doc.file, item.line, `Item ${item.id} does not declare \`status\`.`, `Add \`- **status:** ${states[0]}\` right below the title.`),
         )
```

- [ ] **Step 3: `ci2-ids.ts` and `ci3-traceability.ts`**

`ci2-ids.ts`:

```diff
-            'Use the next free number; retired IDs never come back (spec §2).',
+            // Source rule: spec §2.
+            'Use the next free number; retired IDs never come back.',
```

`ci3-traceability.ts`:

```diff
-                  'Cite an existing ID, or remove the field (spec §8).',
+                  // Source rule: spec §8.
+                  'Cite an existing ID, or remove the field.',
```

```diff
-                  `Add \`${side.to}: ${entry.id}\` in ${target.file}:${target.line} — the pair closes on both sides (spec §8).`,
+                  // Source rule: spec §8.
+                  `Add \`${side.to}: ${entry.id}\` in ${target.file}:${target.line} — the pair closes on both sides.`,
```

```diff
-            'A removed rule is revoked, not deleted — point to the ID that replaced it (spec §5, SK-4).',
+            // Source rule: spec §5, SK-4.
+            'A removed rule is revoked, not deleted — point to the ID that replaced it.',
```

```diff
-              'Every closed open decision points to the ADR that closed it (spec §5, SK-3, rule 7).',
+              // Source rule: spec §5, SK-3, rule 7.
+              'Every closed open decision points to the ADR that closed it.',
```

```diff
-                `Add ${entry.id} to \`relates-to\` — CI-3 verifies both sides (spec §5, SK-3, rule 7).`,
+                // Source rule: spec §5, SK-3, rule 7.
+                `Add ${entry.id} to \`relates-to\` — CI-3 verifies both sides.`,
```

```diff
-            'An accepted ADR cites at least one requirement, open decision or principle — a decision that links to nothing is a sign of missing context (spec §8).',
+            // Source rule: spec §8.
+            'An accepted ADR cites at least one requirement, open decision or principle — a decision that links to nothing is a sign of missing context.',
```

```diff
-            `Cite ${entry.id} in the test that covers it — traceability closes on both sides (spec §5, SK-4, rule 6).`,
+            // Source rule: spec §5, SK-4, rule 6.
+            `Cite ${entry.id} in the test that covers it — traceability closes on both sides.`,
```

- [ ] **Step 4: `ci4-staleness.ts` and `ci5-contract-drift.ts`**

`ci4-staleness.ts` — the sentence that relied on the spec becomes what it said:

```diff
+          // Source rule: spec §13 (a bump without reading is an anti-requirement).
           `Reread the document and, if it is still true, update \`last-reviewed\`${
             stale.skill === null ? '' : ` (owner skill: ${stale.skill})`
-          }. A bump without reading, or a bulk bump, is an anti-requirement of spec §13: it switches the mechanism off while pretending to fulfill it.`,
+          }. A bump without reading, or a bulk bump, switches the review mechanism off while pretending to fulfill it.`,
```

```diff
           'Declare `pay-when` with `pattern` (regex, in single quotes) and `paths` (globs where to look for it) — ' +
-            'a condition someone can point to happening (`RN-0019`, `ADR-0007`; owner skill: decision-recorder). ' +
+            // Source rule: RN-0019, ADR-0007.
+            'a condition someone can point to happening (owner skill: decision-recorder). ' +
```

```diff
-          'Pay the debt, or reclassify it (`paid`, `accepted-permanently`) — both are a human act ' +
-            '(`RN-0005`, and `HK-3` intercepts). While it stays `open` with the trigger met, the CI fails ' +
-            '(spec §12, criterion 7).',
+          // Source rule: RN-0005; spec §12, criterion 7.
+          'Pay the debt, or reclassify it (`paid`, `accepted-permanently`) — both are a human act, ' +
+            'and `HK-3` intercepts. While it stays `open` with the trigger met, the CI fails.',
```

`ci5-contract-drift.ts`:

```diff
-              `Generate it and version the result: \`${rule.command} > ${rule.path}\` (spec §3).`,
+              // Source rule: spec §3.
+              `Generate it and version the result: \`${rule.command} > ${rule.path}\`.`,
```

```diff
-              `Regenerate: \`${rule.command} > ${rule.path}\`. Never edit the file by hand ` + '(`HK-2` blocks; source rule: spec §5, SK-5, rule 1).',
+              // Source rule: spec §5, SK-5, rule 1.
+              `Regenerate: \`${rule.command} > ${rule.path}\`. Never edit the file by hand ` + '(`HK-2` blocks).',
```

- [ ] **Step 5: `ci6-changelog-required.ts` and `ci7-ownership-coverage.ts`**

`ci6-changelog-required.ts`:

```diff
               `Add the entry under \`## [Unreleased]\` of \`${target}\`, aimed at whoever consumes — or write the reason ` +
-                'in the commit message, in the form `Changelog: none — <reason>` (RN-0013; owner skill: release-historian).',
+                // Source rule: RN-0013.
+                'in the commit message, in the form `Changelog: none — <reason>` (owner skill: release-historian).',
```

```diff
-                'path is `Changelog: none — <reason>` (RN-0013).',
+                // Source rule: RN-0013.
+                'path is `Changelog: none — <reason>`.',
```

`ci7-ownership-coverage.ts`:

```diff
             'Create `CODEOWNERS` at the root (or in `.github/`), mirroring the `owner` field of each entry of ' +
-              '`docs/.ownership.yml` (`RN-0016`; `living-docs init` writes it).',
+              // Source rule: RN-0016.
+              '`docs/.ownership.yml` (`living-docs init` writes it).',
```

```diff
               'Declare it in `artifacts:` (if it has an ID family and a lifecycle), in `documents:` (if it has an owner and ' +
-                'no IDs) or in `generated:` (if it is generated) — `RN-0016`, `ADR-0008`. A document without an owner is the ' +
-                'anti-requirement of spec §13.',
+                // Source rule: RN-0016, ADR-0008; a document without an owner is an anti-requirement of spec §13.
+                'no IDs) or in `generated:` (if it is generated). A document without an owner is a document nobody maintains.',
```

```diff
               'Create the document, or fix the `doc` of the rule. A link that points to nothing makes `HK-4` and `HK-5` ' +
-                'ask for a document that nobody can update (`RN-0008`).',
+                // Source rule: RN-0008.
+                'ask for a document that nobody can update.',
```

```diff
-              `Declare \`${doc}\` in \`artifacts:\` or \`documents:\` — the code→doc link is only enforceable if the doc ` + 'has an owner (`RN-0016`, `RN-0008`).',
+              // Source rule: RN-0016, RN-0008.
+              `Declare \`${doc}\` in \`artifacts:\` or \`documents:\` — the code→doc link is only enforceable if the doc ` + 'has an owner.',
```

The sentence that depended on the ID (`changing it is a new ADR-0009`) says what the ID said: the threshold belongs to the toolkit, not to the project.

```diff
                 'Delete the sentence and leave the pointer to the owning artifact. The agent contract is an index and policy, ' +
-                  'not content (`RN-0010`, `RN-0020`; owner skill: working-agreements-keeper) — and the threshold is not ' +
-                  'lowered: changing it is a new `ADR-0009`.',
+                  // Source rule: RN-0010, RN-0020; the threshold is the one of ADR-0009.
+                  'not content (owner skill: working-agreements-keeper). The threshold belongs to the toolkit, not to this project: ' +
+                  'it is not lowered here.',
```

```diff
-                  'An item nobody verifies is intent, and intent is not a definition of done (`RN-0017`).',
+                  // Source rule: RN-0017.
+                  'An item nobody verifies is intent, and intent is not a definition of done.',
```

```diff
+              // Source rule: RN-0021, ADR-0010.
               `Update \`${pending.doc}\`${
                 pending.skill === null ? '' : ` (owner skill: ${pending.skill})`
-              } in the same PR — or write the reason in a commit message, in the form \`Docs: none — <reason>\` ` + '(`RN-0021`, `ADR-0010`).',
+              } in the same PR — or write the reason in a commit message, in the form \`Docs: none — <reason>\`.`,
```

```diff
+              // Source rule: RN-0026, ADR-0010.
               `Resolve ${claim.id} before implementing (owner skill: ${claim.skill}) — while the decision is ` +
                 'open there is no rule, and the way out is the ID, not the code. If this change is not the implementation of the ' +
-                'missing rule, write the reason in a commit message, in the form `Docs: none — <reason>` ' +
-                '(`RN-0026`, `ADR-0010`).',
+                'missing rule, write the reason in a commit message, in the form `Docs: none — <reason>`.',
```

- [ ] **Step 6: `ci8-links.ts`, `ci9-commit-discipline.ts`, `ci10-trigger-routing.ts`, `ci11-external-audience.ts`**

`ci8-links.ts`:

```diff
           'Keep the source as text (Mermaid in a code block, SVG, or the `.puml`/`.dot` that generates it) and ' +
-            'keep the binary out of the versioned documentation (spec §13, `RN-0023`).',
+            // Source rule: spec §13, RN-0023.
+            'keep the binary out of the versioned documentation.',
```

```diff
                 'Point to an existing document by file name, or swap it for a relative link. ' +
-                  'A wikilink with no target asserts a link that does not exist (`RN-0023`).',
+                  // Source rule: RN-0023.
+                  'A wikilink with no target asserts a link that does not exist.',
```

```diff
               'Fix the path, or remove the link. The anchor (`#section`) is not verified — only the file —, ' +
-                'so a link with an anchor only fails when the file does not exist (`RN-0023`).',
+                // Source rule: RN-0023.
+                'so a link with an anchor only fails when the file does not exist.',
```

`ci9-commit-discipline.ts`:

```diff
               'being switched off while pretending to fulfill it. Revert the date of those not reviewed, or review them ' +
-              '(`RN-0027`, `ADR-0013`; the threshold is `last-reviewed-bump-limit` in `.ownership.yml`).',
+              // Source rule: RN-0027, ADR-0013.
+              '(the threshold is `last-reviewed-bump-limit` in `.ownership.yml`).',
```

```diff
               'citation that makes `git log` navigable by rule: without it the history answers "what changed" and ' +
-              `never "because of which rule" (\`RN-0028\`; owner skill: ${doc.rule.skill}).`,
+              // Source rule: RN-0028.
+              `never "because of which rule" (owner skill: ${doc.rule.skill}).`,
```

`ci10-trigger-routing.ts`:

```diff
               `If \`${routed.skill}\` is a skill of this project, there is nothing to do. If it was meant to be the toolkit's, ` +
-              'check the name in `plugin/skills/` (`RN-0029`).',
+              // Source rule: RN-0029.
+              'check the name in `plugin/skills/`.',
```

```diff
             'must be talking about the same thing, otherwise the document declares a trigger that nothing fires ' +
-            `(\`RN-0029\`, \`ADR-0013\`; owner skill: ${routed.skill}).`,
+            // Source rule: RN-0029, ADR-0013.
+            `(owner skill: ${routed.skill}).`,
```

`ci11-external-audience.ts`:

```diff
             'Write in running text what the item decides or requires, without pointing at it. The link keeps existing ' +
-            'and lives on the inside — in the artifact itself or in the commit message (`RN-0030`, `ADR-0017`). ' +
+            // Source rule: RN-0030, ADR-0017.
+            'and lives on the inside — in the artifact itself or in the commit message. ' +
             'There is no exception label.',
```

- [ ] **Step 7: Format and verify what is left**

Run: `npx prettier --write src/checks test/checks/ci7-ownership-coverage.test.ts && npm run typecheck && node --test "test/checks/**/*.test.ts" "test/acceptance/**/*.test.ts"`
Expected: typecheck clean; all PASS.

Run: `node --test --test-name-pattern="code strings" test/distribution/internal-trail.test.ts 2>&1 | grep -oE "src/[a-z0-9/-]+\.ts" | sort -u`
Expected: no path under `src/checks/`. Exactly `src/cli/index.ts`, `src/cli/init.ts`, `src/config/ownership.ts` and the eight `src/hooks/hk1-append-only.ts` … `src/hooks/hk8-open-decision-guard.ts` are left — which Task 6 cleans.

Run: `node src/tools/gen-checks.ts | diff - docs/contracts/checks.gen.md && echo "catalog intact"`
Expected: `catalog intact` (the `CHECK_CATALOG` descriptions did not change).

- [ ] **Step 8: Commit**

```bash
git add src/checks test/checks/ci7-ownership-coverage.test.ts
git commit -F - <<'EOF'
fix(RN-0031): check messages stop citing the toolkit trail

The fix of each finding loses the parenthesis with RN, ADR and toolkit spec
section, which does not resolve for whoever installs; CI-n, HK-n and the owner
skill stay. The sentence that relied on the ID says what it said, and the
removed ID went into a comment above the string. The CI-7 test now tells the
fixes apart by their text.

Docs: none — RN-0031, which this rewrite fulfills, was born in the decision commit; no check rule changed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: The hook, CLI and configuration messages (`M-8`, second half)

**Files:**
- Modify: `src/hooks/hk1-append-only.ts`, `hk2-generated-artifact.ts`, `hk3-state-promotion.ts`, `hk4-watch-reminder.ts`, `hk5-commit-guard.ts`, `hk6-session-inventory.ts`, `hk7-shortcut-debt.ts`, `hk8-open-decision-guard.ts`
- Modify: `src/cli/index.ts`, `src/cli/init.ts` (`declarePlugin`), `src/config/ownership.ts`
- Modify: `test/cli/init-enforcement.test.ts:105`

**Interfaces:**
- Consumes: the `RN-0031: code strings …` test from Task 2.
- Produces: no signature, exit code or output format changes. `HookDecision.reason`/`context` keep starting with `HK-n` and naming the owner skill.

- [ ] **Step 1: Adjust the test that matched `DA-0003`**

In `test/cli/init-enforcement.test.ts`:

```diff
     assert.equal(existsSync(join(root, '.claude/settings.json')), false)
-    assert.ok(result.notInstalled.some(linha => linha.includes('DA-0003')))
+    assert.ok(result.notInstalled.some(linha => linha.includes('--marketplace <owner/repo>') && linha.includes('is not guessed')))
   })
```

Run: `node --test test/cli/init-enforcement.test.ts`
Expected: PASS — both phrases are already in today's line.

- [ ] **Step 2: The hooks**

`hk1-append-only.ts`:

```diff
-      'Source rule: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §4 — no terminal state allows editing the body; ' +
+      // Source rule: spec §4.
+      'No terminal state allows editing the body; ' +
```

`hk2-generated-artifact.ts`:

```diff
-        'Source rule: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §5 (SK-5, rule 1) — if it can be generated, it is not written; ' +
+        // Source rule: spec §5, SK-5, rule 1.
+        'If it can be generated, it is not written: ' +
```

```diff
-      `HK-2 blocked: \`${repoPath}\` opens with the marker \`generated: do not edit\` (spec §2). ` +
-      'Source rule: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §5 (SK-5, rule 1) — what is generated changes through the source, not through the file. ' +
+      // Source rule: spec §2 (the marker) and spec §5, SK-5, rule 1.
+      `HK-2 blocked: \`${repoPath}\` opens with the marker \`generated: do not edit\`. ` +
+      'What is generated changes through the source, not through the file. ' +
```

`hk3-state-promotion.ts`:

```diff
-      'Source rule: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §4 — no agent promotes a state on its own; ' +
+      // Source rule: spec §4.
+      'No agent promotes a state on its own: ' +
```

`hk4-watch-reminder.ts`:

```diff
-      'Source rule: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 — the update of the owning doc fits in the same PR; ' +
+      // Source rule: spec §7.
+      'The update of the owning doc fits in the same PR; ' +
```

`hk5-commit-guard.ts`:

```diff
-      'Source rule: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 — if the documentation update does not fit in the ' +
+      // Source rule: spec §7.
+      'If the documentation update does not fit in the ' +
```

`hk6-session-inventory.ts`:

```diff
       lines.push(
+        // Source rule: spec §12, criterion 7.
         `Debt with a met payment trigger (${vencidas.length}): ${shorten(
           vencidas.map(payment => `${payment.id} — ${payment.evidence}`),
-        )}. \`living-docs validate\` fails until it is paid or reclassified (spec §12, criterion 7).`,
+        )}. \`living-docs validate\` fails until it is paid or reclassified.`,
       )
```

`hk7-shortcut-debt.ts`:

```diff
-      'Source rule: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 and `RN-0014` — a conscious shortcut becomes `TDR-nnnn` ' +
+      // Source rule: spec §7 and RN-0014.
+      'A conscious shortcut becomes `TDR-nnnn` ' +
```

`hk8-open-decision-guard.ts`:

```diff
-      'Source rule: `RN-0026` and acceptance criterion 4 of spec §12 — behavior with no written rule becomes ' +
+      // Source rule: RN-0026 and acceptance criterion 4 of spec §12.
+      'Behavior with no written rule becomes ' +
```

- [ ] **Step 3: `src/cli/index.ts`**

```diff
 function reportElapsed(elapsedMs: number): void {
-  process.stdout.write(`living-docs: check set in ${formatElapsed(elapsedMs)} ` + `(declared ceiling: ${formatElapsed(CHECK_BUDGET_MS)} — RNF-0005).\n`)
+  // Source rule: RNF-0005.
+  process.stdout.write(`living-docs: check set in ${formatElapsed(elapsedMs)} ` + `(declared ceiling: ${formatElapsed(CHECK_BUDGET_MS)}).\n`)
   if (elapsedMs > CHECK_BUDGET_MS) {
-    process.stderr.write('living-docs: the set exceeded the declared ceiling. Measure what got slow before raising the number ' + '(RNF-0005).\n')
+    process.stderr.write('living-docs: the set exceeded the declared ceiling. Measure what got slow before raising the number.\n')
   }
```

```diff
-        process.stderr.write('living-docs: `--base` needs a ref — the diff base is not guessed (CI-7, ADR-0010).\n')
+        // Source rule: ADR-0010.
+        process.stderr.write('living-docs: `--base` needs a ref — the diff base is not guessed (CI-7).\n')
```

```diff
-        process.stderr.write('living-docs: `changelog` needs `--base <ref>` — the diff base is not guessed (CI-6, ADR-0006).\n')
+        // Source rule: ADR-0006.
+        process.stderr.write('living-docs: `changelog` needs `--base <ref>` — the diff base is not guessed (CI-6).\n')
```

```diff
+        // Source rule: ADR-0011.
         process.stderr.write(
           `living-docs: invalid ID form. --id-separator accepts ${SEPARATORS_ALLOWED.map(s => `"${s}"`).join(', ')} ` +
-            `and --id-padding an integer between ${PADDING_RANGE.min} and ${PADDING_RANGE.max} (ADR-0011).\n`,
+            `and --id-padding an integer between ${PADDING_RANGE.min} and ${PADDING_RANGE.max}.\n`,
         )
```

```diff
-        process.stderr.write('living-docs: `--invoke` needs the command that runs the CLI in your CI — it is not guessed (DA-0003).\n')
+        // Source rule: DA-0003.
+        process.stderr.write('living-docs: `--invoke` needs the command that runs the CLI in your CI — it is not guessed.\n')
```

```diff
             `          To adopt it: --id-separator "${format.separator}" --id-padding ${format.padding}. ` +
-            'No file was changed (RF-0014).\n',
+            // Source rule: RF-0014.
+            'No file was changed.\n',
```

- [ ] **Step 4: `src/cli/init.ts` (`declarePlugin`) and `src/config/ownership.ts`**

`src/cli/init.ts`:

```diff
     result.notInstalled.push(
+      // Source rule: DA-0003.
       `plugin registration in ${SETTINGS_PATH} — without \`--marketplace <owner/repo>\` the source is not ` +
-        'guessed (`DA-0003`); the hooks do not start in the session until it is declared',
+        'guessed; the hooks do not start in the session until it is declared',
     )
```

`src/config/ownership.ts`:

```diff
     throw new OwnershipError(
+      // Source rule: ADR-0011.
       `${OWNERSHIP_PATH}: id-format.separator "${String(separator)}" is not accepted. ` +
-        `Valid: ${SEPARATORS_ALLOWED.map(value => `"${value}"`).join(', ')} (ADR-0011).`,
+        `Valid: ${SEPARATORS_ALLOWED.map(value => `"${value}"`).join(', ')}.`,
     )
```

```diff
     throw new OwnershipError(
-      `${OWNERSHIP_PATH}: id-format.padding "${String(padding)}" must be an integer between ` + `${PADDING_RANGE.min} and ${PADDING_RANGE.max} (ADR-0011).`,
+      // Source rule: ADR-0011.
+      `${OWNERSHIP_PATH}: id-format.padding "${String(padding)}" must be an integer between ` + `${PADDING_RANGE.min} and ${PADDING_RANGE.max}.`,
     )
```

```diff
     throw new OwnershipError(
+      // Source rule: ADR-0013.
       `${OWNERSHIP_PATH}: last-reviewed-bump-limit "${String(raw)}" must be an integer greater than or equal to 2 ` +
-        '(a threshold of 1 would fail the legitimate review of a single document — ADR-0013).',
+        '(a threshold of 1 would fail the legitimate review of a single document).',
     )
```

- [ ] **Step 5: Format and see the case pass**

Run: `npx prettier --write src/hooks src/cli/index.ts src/cli/init.ts src/config/ownership.ts test/cli/init-enforcement.test.ts && node --test --test-name-pattern="code strings" test/distribution/internal-trail.test.ts`
Expected: PASS. If a line is left over, the message says `file:line — excerpt`; apply the same pattern (the citation leaves the string, goes to `// Source rule: …` above).

- [ ] **Step 6: The whole suite**

Run: `npm test && npm run typecheck && npx eslint src test --quiet 2>&1 | tail -1`
Expected: `npm test` and typecheck PASS; ESLint ends at `✖ 20 problems (20 errors, 0 warnings)` — the same 20 `no-base-to-string` errors `master` already has, none new (see Global Constraints). The tests pass including the four cases of `test/distribution/internal-trail.test.ts`. The `assert.match` calls in `test/hooks/` match `HK-n`, skill names, paths and fixture IDs — none matched the removed citation. A test that breaks is read before being adjusted: if it enforces a sentence that should still be in the message, it is the message that is wrong.

- [ ] **Step 7: Commit**

```bash
git add src/hooks src/cli/index.ts src/cli/init.ts src/config/ownership.ts test/cli/init-enforcement.test.ts
git commit -F - <<'EOF'
fix(RN-0031): hooks, CLI and configuration stop citing the toolkit trail

The messages of the eight hooks lose the toolkit spec path and the IDs; the
why is still said, in running text. The CLI output and the .ownership.yml
errors lose the toolkit's ADR, DA, RF and RNF, and the budget line shows the
ceiling without citing the rule. The IDs went into comments above the
strings. No exit code or output format changes.

Docs: none — RN-0031, which this rewrite fulfills, was born in the decision commit; no command changed observable behavior beyond the text.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 7: The agent contract, the CHANGELOG and the final verification (`M-9`, `M-10`, spec `§4`)

**Files:**
- Modify: `CLAUDE.md` (section `## Policy`)
- Modify: `CHANGELOG.md` (end of `### Changed` under `## [Unreleased]`, right before `### Fixed`)

**Interfaces:**
- Consumes: all the previous tasks.
- Produces: no code.

- [ ] **Step 1: Measure the contract before writing**

Run: `node -e "console.log(require('fs').readFileSync('CLAUDE.md','utf8').split('\n').length)"`
Expected: `57`. The ceiling is 60: the new line fits in **three** lines. If the number is different, recompute and keep the total <= 60.

- [ ] **Step 2: The policy**

In `CLAUDE.md`, right after the item that starts with `- **Text for readers on the outside carries no artifact ID.**` (three lines), add:

```markdown
- **What the toolkit ships does not point inside itself.** A seed, a skill and a
  CLI or hook message stay free of the ID and of the spec section from here; the
  why goes into the code comment — the distribution test enforces it.
```

It does not go into `templates/agent-contract.md`: it is the policy of whoever maintains the toolkit.

- [ ] **Step 3: The CHANGELOG entry**

In `CHANGELOG.md`, as the last item of `### Changed` under `## [Unreleased]` (the blank line before `### Fixed` stays):

```markdown
- The seeds that `living-docs init` writes and the comments of the installed
  `docs/.ownership.yml` and workflow stop citing internal toolkit decisions and
  carrying fill-in instructions; what helped read the document became prose, and
  the writer's guidance moved to the skills. The messages of the checks, hooks
  and CLI and the text of the skills stop citing internal toolkit rules. An
  already-installed repository keeps the old text.
```

- [ ] **Step 4: Format and verify**

Run: `npx prettier --write CLAUDE.md CHANGELOG.md && npm test && node src/cli/index.ts validate`
Expected: PASS on everything, including `RN-0010: the contract is an index, not a manual — it fits on one screen` (60 lines or fewer); `living-docs: no violations found.` If `CI-7` flags a repeated sentence in the contract, rewrite the new line in other words — never touch the threshold. If `CI-11` flags the CHANGELOG, the entry cited an ID: rewrite it in running text.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -F - <<'EOF'
docs(RN-0031): the agent contract gains the policy and the CHANGELOG records the change

CLAUDE.md now says that what the toolkit ships does not carry its internal
trail, and who enforces it. The Unreleased entry tells whoever installs what
changes in the seeds, the plugin and the messages, without citing artifact IDs.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 6: Final verification (spec §4)**

Run:

```bash
npm test
npm run typecheck
npx eslint src test --quiet 2>&1 | tail -1
node src/cli/index.ts validate
node src/cli/index.ts validate --base master
node src/cli/index.ts drift
node src/cli/index.ts changelog --base master
```

Expected: all with exit code 0, except ESLint, which ends at `✖ 20 problems (20 errors, 0 warnings)` — the 20 errors `master` already has, none new. `validate --base master` does not flag `CI-7` (each watched path traveled with the owning doc or with `Docs: none — <reason>`) nor `CI-9` (the commit that touched `ADR-0018` and `rules.md` cites IDs declared in them). `changelog --base master` finds the entry under `## [Unreleased]`.

- [ ] **Step 7: The proof that motivated the spec, repeated**

Run (Bash tool):

```bash
for stage in production multi-team; do
  D="$(mktemp -d)"
  LIVING_DOCS_REPO_ROOT="$D" node src/cli/index.ts init --stage "$stage" --owner @time --marketplace time/living-docs > /dev/null
  grep -rnE 'ADR-[0-9]|DA-[0-9]|TDR-[0-9]|RF-[0-9]|RNF-[0-9]|RN-[0-9]|REL-[0-9]|spec §|docs/superpowers|Seed created|Owner skill' "$D"
  echo "$stage: grep exit=$?"
  rm -rf "$D"
done
```

Expected: no `grep` line and, for both stages, `grep exit=1`. The search uses `-[0-9]` and not `-` alone (deviation 7): the placeholders `RN-nnnn`, `DA-nnnn` and `ADR-nnnn` stay by order of the spec.

If any step fails, stop and diagnose (superpowers:systematic-debugging); do not amend a commit already made without need.

---

## Spec coverage

| Spec change | Task |
| --- | --- |
| `M-1` ADR-0018 | 1 |
| `M-2` RN-0031 | 1 |
| `M-3` the test, the three surfaces and the HTML-comment lock | 2 |
| `M-4` non-Markdown templates (`ownership.yml`, `workflow.yml`, `ids-retired.txt`, `tdr.md`), plus `release-note.md` (deviation 1) | 3 |
| `M-5` `documentsBlock` and `releasesBlock` | 3 |
| `M-6` Markdown seeds | 3 |
| `M-7` guidance that left the seeds (deviation 2) | 3 |
| `M-7` the 21 citations of the seven skills, agents and `run-hook.sh` (deviation 1), template-comment checklist | 4 |
| `M-8` checks, `ci11` and the `CI-7` test (deviations 1, 3 and 4) | 5 |
| `M-8` hooks, CLI, `init` and configuration, and the `init-enforcement` test (deviations 1 and 3) | 6 |
| `M-9` `CLAUDE.md` (three lines, deviation 8) | 7 |
| `M-10` `CHANGELOG.md` | 7 |
| §4 final verification and the `init` proof (deviation 7) | 7 |
