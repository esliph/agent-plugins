# Living Documentation Toolkit — DA-0001 + Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `DA-0001` — separate the toolkit root from the validated repository root, so the toolkit can be installed in a project that is not this one — and deliver **Phase 2** of the spec: `SK-4` requirements-keeper (requirements with stable IDs) and `CI-3` traceability (closed bidirectional pairs, an `active` `RN` covered by a citation).

**Predecessor:** `docs/superpowers/plans/2026-08-24-living-docs-toolkit-core.md` (Phases 0–1), implemented in commits `5462dd5`…`4b3468f`. This plan **continues** that one: the Global Constraints there apply here in full and are not repeated line by line.

**Architecture:**

Two changes of different nature, in this order because the second inherits from the first.

1. **`DA-0001` is a packaging problem, not an engine problem.** The engine is already parameterized by root: `runInit(root, …)`, `runValidate(root)` and `decideHk1/3(payload, { root, … })` receive the repository as an argument, and `init.ts` resolves `templates/` by `import.meta.dirname` — that is, it already reads the toolkit from where the toolkit is. The coupling lives in three places and only in them: the `?? '/app'` defaults (`src/hooks/lib/io.ts`, `src/cli/index.ts`, two tests), the `compose.yaml` that mounts a single path, and the `bin/living-docs` and `plugin/hooks/run-hook.sh` wrappers that pin `/app` for both things. The fix is a single module — `src/core/roots.ts` — with **two** functions (`toolkitRoot()`, `repoRoot()`) and a container layout that separates `/opt/living-docs` (toolkit source) from `/workspace` (validated repository). In dogfooding, the same checkout is mounted at both paths: the separation is now truly exercised in every test, instead of being agreed on only on paper.

2. **Phase 2 introduces the third form of collection.** Phases 0–1 know two: `per-file` (ADR, TDR — one file per item, own frontmatter) and `table` (Open Decisions — rows in a table). Requirements are the third one in the spec's granularity rule §3 — _long but living body, sections with an ID_ —, so `collection: sections` enters. So that `CI-3` can ask "which ADR does this `resolved` DA point to?" without learning a column name in Portuguese, `TableItem` becomes `DocItem` with `fields` (all columns/fields of the item) and `.ownership.yml` gains `field-map`: the mapping canonical name → real name remains the **only** project-specific file. `CI-3` is also the first check that reads **outside** `docs/` — covering an `RN` by test requires scanning `cited-by` —, and so it is the first consumer of `picomatch`, declared in Phase 0 and unused until now.

**Tech Stack:** the same — Node 24 with native type-stripping, `node:test`, TypeScript 5.9 only as a type-checker (`erasableSyntaxOnly`), `yaml`, `picomatch` (now used), Docker + Compose as the only runtime.

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §3 (layout, granularity, `.ownership.yml`), §4 (requirement lifecycle), §5 (`SK-4`), §8 (traceability graph), §9 (`CI-3`), §10 (Phase 2 and maturity stages), §11 (authoring conventions).

## Global Constraints

Those of the Phases 0–1 plan apply — no Node on the host, no build step, imports with `.ts`, hooks with timeout ≤ 5 s / fail open / zero network, a hook never judges, language (identifiers in English, prose in pt-BR), commit citing the affected ID, IDs never recycled, one artifact one owner. To them are added:

- **Two roots, never one.** After Task 2, no file in `src/` or `test/` contains the literal `/app`, `/workspace` or `/opt/living-docs`. An absolute container path exists only in `Dockerfile`, `compose.yaml`, `bin/living-docs`, `plugin/hooks/run-hook.sh` and `.github/workflows/living-docs.yml`. A test fails the regression.
- **`LIVING_DOCS_ROOT` ceases to exist.** It is replaced by `LIVING_DOCS_REPO_ROOT` (validated repository) and `LIVING_DOCS_TOOLKIT_ROOT` (toolkit source, for testing only — in normal use the toolkit finds itself). It is a deliberate compatibility break, declared in `ADR-0003`: keeping an alias that means "both things" preserves exactly the ambiguity `DA-0001` exists to kill.
- **No check learns a path or a field name.** Everything that is project-specific goes into `docs/.ownership.yml`. An `if` with `'Resolved-by'` inside `src/checks/` is a reason to fail the step.
- **`CI-3` fails, it does not warn.** Spec §9 authorizes a warning only for `CI-4`. A `CI-3` finding is `severity: 'error'`.
- **Scope locked to `DA-0001` + Phase 2:** `ADR-0003`, the two roots, `collection: sections`, `SK-4`, `CI-3`, `living-docs init --stage`. **Out of this plan:** `SK-1`, `SK-2`, `SK-5`, `SK-6`, `SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-4`–`HK-7`, `CI-4`–`CI-8`, `CM-4`, `CM-5`, `CM-7`. Do not implement anything from that list, not even "just the skeleton".
- **Phase 2 gets no command.** Spec §10 does not define `/requirement`: `SK-4` is selected by the `description`. Do not invent `CM-8`.

---

## File structure

New (`+`) and changed (`~`). What does not appear here does not change.

```
+ src/core/roots.ts                    # toolkitRoot() and repoRoot() — the decision of ADR-0003
+ src/docs/item.ts                     # DocItem: id, status, line, fields — common to table and sections
+ src/docs/sections.ts                 # collection: sections (requirements)
+ src/checks/ci3-traceability.ts       # CI-3
+ src/ids/coverage.ts                  # scan of citations in the cited-by paths (picomatch)

~ src/config/ownership.ts              # collection 'sections', field-map
~ src/docs/table.ts                    # TableItem -> DocItem with fields
~ src/docs/collect.ts                  # collects sections; unified items
~ src/docs/schema.ts                   # RF/RNF/RN in the state machine, revoked frozen, human promotions
~ src/checks/ci1-structure.ts          # container = any collection; status of a section item
~ src/checks/ci2-ids.ts                # IDs declared in sections enter the lint
~ src/checks/registry.ts               # + ci3Traceability
~ src/cli/index.ts                     # repoRoot(); --stage flag on init
~ src/cli/init.ts                      # templatesDir(); requirements frame per stage
~ src/hooks/lib/io.ts                  # hookEnv() uses repoRoot()
~ src/hooks/hk3-state-promotion.ts     # promotion inside a sections collection

+ templates/requirements.md            # seed parameterized by prefix (RF/RNF/RN)
~ templates/ownership.yml              # requirements block per stage
~ templates/CODEOWNERS                 # owner of the requirements

+ plugin/skills/requirements-keeper/SKILL.md   # SK-4

+ test/core/roots.test.ts
+ test/docs/sections.test.ts
+ test/ids/coverage.test.ts
+ test/checks/ci3-traceability.test.ts
+ test/acceptance/consumer-repo.test.ts        # DA-0001 verified by test
~ test/plugin/authoring.test.ts                # runs over all skills, not just one
~ test/**                                      # no embedded '/app'

~ Dockerfile  compose.yaml  bin/living-docs  plugin/hooks/run-hook.sh
~ .github/workflows/living-docs.yml

+ docs/decisions/adr/ADR-0003-*.md             # the decision of DA-0001
+ docs/decisions/debt/TDR-0001-*.md            # what ADR-0003 and Phase 2 accept owing
+ docs/requirements/{rules,functional,non-functional}.md   # Phase 2 dogfooding
~ docs/.ownership.yml  CODEOWNERS  docs/open-decisions.md  README.md
+ docs/superpowers/plans/BACKLOG-phases-3-7.md  # what is left for the next plan
```

---

### Task 1: `ADR-0003` — decide `DA-0001`

**Objective:** record the decision to separate the roots **before** implementing it, and close the `DA-0001` that blocks the subject today. It is the rule the toolkit itself imposes (`SK-3`, rule 1: while the item is in Open Decisions, it has no rule and must not be implemented).

**Requirements:**

- The ADR is born `draft`. **Promotion to `accepted` is a human act** — `HK-3` will ask, and the answer is not the agent's. If the executor of this plan is an agent, it stops at `draft` and asks for acceptance; only then does it proceed to Task 2.
- The ADR declares at least two alternatives with the real reason for discarding them, and the "what we accept to lose" section filled in.
- `DA-0001` only becomes `resolved` **after** the ADR is `accepted`, and points to the ADR; the ADR points back in `relates-to`.

- [ ] **Step 1: Write the ADR from `templates/adr.md`**

`docs/decisions/adr/ADR-0003-two-roots-toolkit-and-repository.md`:

```markdown
---
id: ADR-0003
title: The toolkit root and the validated repository root are distinct
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-24
relates-to: [DA-0001, ADR-0002]
supersedes: null
superseded-by: null
---

# ADR-0003 — The toolkit root and the validated repository root are distinct

## Context

Phases 0–1 fixed `LIVING_DOCS_ROOT=/app` as the single root: the same path
serves to find `docs/.ownership.yml` and to run `src/hooks/*.ts`. This
works because this repository validates itself, and it works for nothing
else — a consumer project does not have `src/hooks/` inside it. `DA-0001`
recorded the gap.

The engine is already ready for the separation: `runInit`, `runValidate` and
`decideHk1/3` receive the repository root as an argument, and `init.ts` resolves
`templates/` by `import.meta.dirname`. What confuses the two things are the
`?? '/app'` defaults, the single-volume `compose.yaml` and the two bash wrappers.

## Alternatives considered

**One root, with the toolkit copied into the consumer project.** Discarded:
it turns every toolkit update into a manual merge in the repository of whoever
uses it, and produces N diverging copies of the engine — the same disease the toolkit
exists to fight, applied to itself.

**One root, with the toolkit published on npm and installed as a dependency.**
Discarded in this phase: it contradicts `ADR-0001` ("nothing runs on the host besides Docker"),
since `npm install` in the consumer project requires a toolchain on the host. It remains
the natural path when `ADR-0001` is superseded.

**`LIVING_DOCS_ROOT` kept as an alias of `LIVING_DOCS_REPO_ROOT`.** Discarded:
the ambiguous name is the cause of the problem. An alias that resolves to "the right root in
most cases" reintroduces the confusion exactly where it is most expensive —
a hook reading the toolkit's `.ownership.yml` instead of the validated
project's `.ownership.yml` blocks or allows an edit by the wrong rule, silently.

## Decision

The toolkit comes to know **two** independent roots: its own, derived
from `import.meta.dirname` (`toolkitRoot()`), and that of the validated repository, coming from
`LIVING_DOCS_REPO_ROOT` or from the working directory (`repoRoot()`). In the container,
the toolkit source lives in `/opt/living-docs` and the validated repository is mounted
at `/workspace`. `LIVING_DOCS_ROOT` is removed.

## Consequences

### What we gain

- The toolkit is installable in any project: `LIVING_DOCS_TARGET=/path/to/project docker compose up -d`.
- The separation is exercised in every test of the repository itself, because
  dogfooding mounts the same checkout at both paths — instead of being agreed on
  only on paper and breaking at the first consumer.
- Hooks and CLI stop embedding an absolute path; the only source of paths is
  `src/core/roots.ts`.

### What we accept to lose

- **Compatibility break.** `LIVING_DOCS_ROOT` is no longer read. Whoever
  has a script pointing to it needs to rename it. It is cheap now (version
  `0.1.0`, a single consumer: this repository) and expensive later.
- **One more volume in `compose.yaml`** and one more path to explain in the
  README. The reading cost goes up a little for everyone, including for whoever
  only does dogfooding and will never install the toolkit anywhere else.
- **Distribution remains the repository checkout**, not a versioned
  package. A consumer still needs to clone this repository and point
  `LIVING_DOCS_TARGET`. Publishing an image or package is a future decision, and this ADR
  does not make it.
```

- [ ] **Step 2: Run the checks with the new ADR**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate; echo "exit=$?"
```

Expected: `exit=0`. `CI-2` accepts `ADR-0003` because the sequence is contiguous; the citation to `DA-0001` resolves.

- [ ] **Step 3: STOP and ask for acceptance**

State in one sentence which decision is missing and whose it is. Do **not** edit `status: draft` to `accepted` on your own: `HK-3` returns `ask` and the answer is human (spec §4). After it is accepted by a person:

- [ ] **Step 4: Close `DA-0001`**

In `docs/open-decisions.md`, the `DA-0001` row becomes:

```markdown
| DA-0001 | Separating the toolkit root from the validated repository root, to allow installation in another project | resolved | ADR-0003 | 2026-08-24 |
```

It is also a human promotion (`open → resolved`): `HK-3` asks.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr docs/open-decisions.md
git commit -m "docs(ADR-0003): two roots, toolkit and validated repository (closes DA-0001)"
```

---

### Task 2: `src/core/roots.ts` — the two roots in the engine

**Objective:** a single place that answers "where is the toolkit" and "where is the validated repository", and no container path embedded in code.

**Requirements:**

- `toolkitRoot()` resolves itself by `import.meta.dirname`; the environment variable exists only for testing.
- `repoRoot()` **never** derives from the toolkit. Without `LIVING_DOCS_REPO_ROOT`, it is `process.cwd()`.
- No `'/app'` default is left. A test fails the regression.
- Zero observable behavior change for dogfooding: `npm test` stays green without touching `compose.yaml` (Task 3 is what changes the layout).

- [ ] **Step 1: Write `src/core/roots.ts`**

```typescript
import { join, resolve } from 'node:path'

/**
 * Root of the **toolkit**: where `src/`, `templates/` and `plugin/` live.
 *
 * Derived from the file itself — the toolkit always knows where it is and
 * therefore needs no configuration to find itself. `LIVING_DOCS_TOOLKIT_ROOT`
 * exists for the test that mounts an artificial layout, not for normal use.
 *
 * Source rule: ADR-0003.
 */
export function toolkitRoot(): string {
  const override = process.env.LIVING_DOCS_TOOLKIT_ROOT
  return resolve(override ?? join(import.meta.dirname, '..', '..'))
}

/**
 * Root of the **validated repository**: where `docs/.ownership.yml` and the
 * artifacts live. Never derived from the toolkit — it is the other side of ADR-0003.
 */
export function repoRoot(): string {
  return resolve(process.env.LIVING_DOCS_REPO_ROOT ?? process.cwd())
}

/** Directory of the templates that `living-docs init` writes. Always the toolkit's. */
export function templatesDir(): string {
  return join(toolkitRoot(), 'templates')
}
```

- [ ] **Step 2: Test — `test/core/roots.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot, templatesDir, toolkitRoot } from '../../src/core/roots.ts'

test('toolkitRoot points to the toolkit checkout', () => {
  assert.ok(existsSync(join(toolkitRoot(), 'package.json')))
  assert.ok(existsSync(join(templatesDir(), 'adr.md')))
})

test('repoRoot honors LIVING_DOCS_REPO_ROOT and does not move toolkitRoot', () => {
  const antes = toolkitRoot()
  const anterior = process.env.LIVING_DOCS_REPO_ROOT
  process.env.LIVING_DOCS_REPO_ROOT = '/tmp/other-project'
  try {
    assert.equal(repoRoot(), '/tmp/other-project')
    assert.equal(toolkitRoot(), antes, 'the toolkit root must not follow the repository root (ADR-0003)')
  } finally {
    if (anterior === undefined) delete process.env.LIVING_DOCS_REPO_ROOT
    else process.env.LIVING_DOCS_REPO_ROOT = anterior
  }
})

test('no absolute container path is embedded in src/ or test/', () => {
  const proibidos = ['/app', '/workspace', '/opt/living-docs']
  const ofensas: string[] = []

  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(toolkitRoot(), dir))) {
      const relative = `${dir}/${entry}`
      if (statSync(join(toolkitRoot(), relative)).isDirectory()) {
        walk(relative)
        continue
      }
      if (!entry.endsWith('.ts')) continue
      const source = readFileSync(join(toolkitRoot(), relative), 'utf8')
      for (const proibido of proibidos) {
        if (source.includes(`'${proibido}`) || source.includes(`"${proibido}`)) {
          ofensas.push(`${relative}: ${proibido}`)
        }
      }
    }
  }

  walk('src')
  walk('test')
  assert.deepEqual(ofensas, [], 'a container path may only appear in Dockerfile, compose and wrappers (ADR-0003)')
})
```

> Note: this test is self-referential — it contains the literals it forbids, inside the `proibidos` array. Write them assembled (`'/' + 'app'`) or keep the quote check as above, which only matches **quoted** occurrences inside a code string. If the test fails itself, the array is the first thing to look at.

- [ ] **Step 3: Replace the defaults in `src/hooks/lib/io.ts`**

```typescript
import { repoRoot } from '../../core/roots.ts'

export function hookEnv(): HookEnv {
  const root = repoRoot()
  const host = process.env.LIVING_DOCS_HOST_ROOT
  return { root, hostRoots: host ? [root, host] : [root] }
}
```

`LIVING_DOCS_HOST_ROOT` does **not** change name: it always meant "the path prefix on the host side", which is not ambiguous.

- [ ] **Step 4: Replace in `src/cli/index.ts` and `src/cli/init.ts`**

In `index.ts`: `const root = repoRoot();` in place of `process.env.LIVING_DOCS_ROOT ?? process.cwd()`.
In `init.ts`: `const TEMPLATES_DIR = templatesDir();` — functionally the same, but a name now exists for the decision.

- [ ] **Step 5: Replace in the tests that pinned `'/app'`**

`test/plugin/authoring.test.ts` and `test/acceptance/spec-criteria.test.ts` use `process.env.LIVING_DOCS_ROOT ?? '/app'` with two different meanings:

- in `authoring.test.ts` the root is the **toolkit's** (it reads `plugin/skills/**`) → `toolkitRoot()`;
- in `spec-criteria.test.ts`, in the test "this repository passes its own checks", the root is the **validated repository's** → `repoRoot()`.

That is the proof that the two things were one only by accident: the same literal served two roles.

- [ ] **Step 6: Verify**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: green. The Step 2 test fails if anyone reintroduces `'/app'`.

- [ ] **Step 7: Commit**

```bash
git add src test
git commit -m "refactor(ADR-0003): src/core/roots.ts separates the toolkit root from the repository root"
```

---

### Task 3: Container, wrappers and CI with the two roots

**Objective:** the layout that makes `ADR-0003` real: `/opt/living-docs` is the toolkit, `/workspace` is the validated repository, and a consumer changes only one variable.

**Requirements:**

- `docker compose up -d` with no variable keeps doing dogfooding: the same checkout at both paths.
- `LIVING_DOCS_TARGET=/path docker compose up -d` validates another project, without editing any file.
- The wrappers keep **failing open** (hooks) and with a useful message (CLI).
- `npm test`/`typecheck` run on the toolkit; `validate` runs on the validated repository.

- [ ] **Step 1: `Dockerfile`**

```dockerfile
FROM node:24-alpine

RUN apk add --no-cache git bash

# The toolkit source lives here. The validated repository is mounted at /workspace —
# they are distinct things by ADR-0003, even when they point to the same checkout.
WORKDIR /opt/living-docs
RUN mkdir -p /opt/living-docs/node_modules /workspace \
 && chown -R node:node /opt/living-docs /workspace

USER node
ENV LIVING_DOCS_TOOLKIT_ROOT=/opt/living-docs \
    LIVING_DOCS_REPO_ROOT=/workspace
CMD ["sleep", "infinity"]
```

- [ ] **Step 2: `compose.yaml`**

```yaml
services:
  toolkit:
    build: .
    container_name: living-docs-toolkit
    working_dir: /opt/living-docs
    user: node
    init: true
    volumes:
      # The toolkit source, with no build step (ADR-0001).
      - .:/opt/living-docs
      # The validated repository. Without LIVING_DOCS_TARGET, it is this same checkout:
      # dogfooding through both paths, with the separation truly exercised.
      - ${LIVING_DOCS_TARGET:-.}:/workspace
      - node_modules:/opt/living-docs/node_modules
    environment:
      LIVING_DOCS_TOOLKIT_ROOT: /opt/living-docs
      LIVING_DOCS_REPO_ROOT: /workspace
    command: ['sleep', 'infinity']

volumes:
  node_modules:
```

- [ ] **Step 3: `bin/living-docs`**

```bash
#!/usr/bin/env bash
# Host -> container bridge. The host does not run Node: all work happens inside
# `living-docs-toolkit`. The toolkit source is at /opt/living-docs and the
# validated repository at /workspace — distinct roots by ADR-0003.
set -euo pipefail

CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"

if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "living-docs: the container '$CONTAINER' is not running. Start it with: docker compose up -d" >&2
  echo "             to validate another project: LIVING_DOCS_TARGET=/path docker compose up -d" >&2
  exit 2
fi

exec docker exec -i -w /workspace "$CONTAINER" node /opt/living-docs/src/cli/index.ts "$@"
```

- [ ] **Step 4: `plugin/hooks/run-hook.sh`**

```bash
#!/usr/bin/env bash
# Host -> container bridge for the living-documentation hooks.
#
# Fails open by contract (LIVING-DOCUMENTATION-TOOLKIT.md §7): container down,
# timeout or execution error result in empty output and exit 0. A broken hook
# must not block the work.
#
# The hook reads the `.ownership.yml` of the **validated repository** (/workspace) and runs
# the code of the **toolkit** (/opt/living-docs). ADR-0003.

HOOK="${1:-}"
CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"
HOST_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | timeout 5 docker exec -i \
  -e LIVING_DOCS_REPO_ROOT=/workspace \
  -e LIVING_DOCS_HOST_ROOT="$HOST_ROOT" \
  "$CONTAINER" node "/opt/living-docs/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
```

- [ ] **Step 5: `.github/workflows/living-docs.yml`**

The `validate` step now runs with the working directory in the validated repository:

```yaml
- name: CI-1, CI-2 and CI-3 — living documentation
  run: >
    docker compose run --rm -w /workspace toolkit
    node /opt/living-docs/src/cli/index.ts validate
```

The `npm ci`, `npm test` and `npm run typecheck` steps stay as they are: the service's `working_dir` is already `/opt/living-docs`.

- [ ] **Step 6: Verify both modes**

```bash
docker compose down && docker compose up -d --build
docker compose exec toolkit npm ci
docker compose exec toolkit npm test
./bin/living-docs validate; echo "exit=$?"

# installation in another project — the proof of DA-0001
mkdir -p /tmp/foreign-project
LIVING_DOCS_TARGET=/tmp/foreign-project docker compose up -d
./bin/living-docs init --owner @someone
./bin/living-docs validate; echo "exit=$?"
ls /tmp/foreign-project/docs
git status --porcelain            # nothing new in the toolkit checkout
docker compose down && docker compose up -d   # back to dogfooding
```

Expected: in the foreign project, `init` creates the frame **there** and `validate` exits `0`; `git status` in the toolkit comes out clean.

- [ ] **Step 7: Commit**

```bash
git add Dockerfile compose.yaml bin plugin/hooks .github
git commit -m "feat(ADR-0003): container with /opt/living-docs and /workspace separated"
```

---

### Task 4: Acceptance — a real consumer repository

**Objective:** turn `DA-0001` from "written agreement" into a verified invariant. Without this test, the separation rots again at the first shortcut.

**Requirements:**

- The test runs with the validated repository in a temporary directory, **outside** the toolkit checkout.
- It proves the three things the consumer needs: `init` writes there, `validate` reads there, and the hooks decide by the configuration there.
- It proves the negative that matters: **nothing** is written inside the toolkit.

- [ ] **Step 1: `test/acceptance/consumer-repo.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { runInit } from '../../src/cli/init.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OPTIONS = { owner: '@consumer', dryRun: false, stage: 'solo' as const }

test('DA-0001: init writes to the validated repository, never to the toolkit', () => {
  const antes = readdirSync(toolkitRoot()).sort()

  withTempRepo({ 'README.md': '# foreign project\n' }, root => {
    assert.notEqual(root, toolkitRoot())

    const result = runInit(root, OPTIONS)
    assert.ok(result.created.includes('docs/.ownership.yml'))
    assert.ok(existsSync(join(root, 'docs/.ownership.yml')))
    assert.ok(existsSync(join(root, 'docs/open-decisions.md')))

    // the templates came from the toolkit, and the toolkit did not gain any file
    assert.ok(readFileSync(join(root, 'docs/.ownership.yml'), 'utf8').includes('@consumer'))
    assert.deepEqual(readdirSync(toolkitRoot()).sort(), antes)
  })
})

test('DA-0001: validate runs against the configuration of the validated repository', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    assert.equal(runValidate(root).exitCode, 0)

    // a violation planted there shows up there, with the path relative to that repo
    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
    writeFileSync(
      join(root, 'docs/decisions/adr/ADR-0001-x.md'),
      [
        '---',
        'id: ADR-0001',
        'title: X',
        'status: draft',
        'owner: "@consumer"',
        'trigger: review quarterly',
        'last-reviewed: 2026-08-24',
        '---',
        '',
        'body',
      ].join('\n'),
      'utf8',
    )

    const result = runValidate(root)
    assert.equal(result.exitCode, 1)
    assert.ok(result.findings.some(f => f.file === 'docs/decisions/adr/ADR-0001-x.md'))
  })
})

test('DA-0001: the hook decides by the configuration of the validated repository', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const file = 'docs/decisions/adr/ADR-0001-frozen.md'
    mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true })
    writeFileSync(
      join(root, file),
      [
        '---',
        'id: ADR-0001',
        'title: Frozen',
        'status: accepted',
        'owner: "@consumer"',
        'trigger: Never.',
        'last-reviewed: 2026-08-24',
        '---',
        '',
        'original body',
      ].join('\n'),
      'utf8',
    )

    const decision = decideHk1(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: file,
          old_string: 'original body',
          new_string: 'other',
        },
      },
      { root, hostRoots: [root] },
    )
    assert.equal(decision.action, 'deny')
  })
})
```

> `stage` enters `InitOptions` in Task 11. Until then, write the test without that field and add it when the flag exists — or implement Task 11 before this one. The suggested order keeps Task 4 as the `DA-0001` milestone; adjust the `OPTIONS` object at the moment the flag is born.

- [ ] **Step 2: Verify and commit**

```bash
docker compose exec toolkit npm test
git add test/acceptance/consumer-repo.test.ts
git commit -m "test(DA-0001): consumer repository separated from the toolkit checkout"
```

---

### Task 5: `DocItem` — collection item with fields, and `field-map`

**Objective:** give `CI-3` access to what an item declares (the "Resolved-by" column of a DA, the `relates-to` of a section) **without** any check learning the real field name. The real name is project-specific and therefore lives in `.ownership.yml`, together with the paths.

**Requirements:**

- `parseItemTable` now returns all the columns of the item, keyed by the normalized header.
- `ArtifactRule` gains `fieldMap: Record<string, string>` — canonical → real.
- `fieldOf(rule, item, 'resolved-by')` returns the value, or `null` for an empty cell and for the empty markers (`—`, `-`, `n/a`).
- Compatibility: `hk3-state-promotion.ts` and `ci1-structure.ts` keep working without semantic change (they use `id`, `status`, `line`).

- [ ] **Step 1: `src/docs/item.ts`**

```typescript
/**
 * An item inside a collection artifact — a table row (Open
 * Decisions) or a section with an ID (requirements). Both have the same shape so
 * that a check and a hook do not need to know which of the two they are reading.
 */
export interface DocItem {
  id: string
  status: string
  /** 1-indexed line in the whole file. */
  line: number
  /** Everything the item declares, by normalized key. */
  fields: Record<string, string>
}

/** Comparable key: lowercase, no space at the ends, no trailing `:`. */
export function normalizeKey(key: string): string {
  return key.trim().replace(/:$/, '').trim().toLowerCase()
}

/** "Empty" markers used in a markdown table. */
const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'null', 'none'])

export function isEmptyValue(value: string): boolean {
  return EMPTY.has(value.trim().toLowerCase())
}
```

- [ ] **Step 2: `src/docs/table.ts` returns `DocItem`**

Replace `TableItem` with `DocItem` and fill `fields` with **all** the columns:

```typescript
const items: DocItem[] = []
for (let j = i + 2; j < lines.length; j++) {
  const row = cells(lines[j] ?? '')
  if (row.length === 0) break
  const id = row[idColumn] ?? ''
  if (!parseId(id)) continue

  const fields: Record<string, string> = {}
  for (let c = 0; c < header.length; c++) {
    const key = normalizeKey(header[c] ?? '')
    if (key !== '') fields[key] = (row[c] ?? '').trim()
  }

  items.push({
    id,
    status: row[statusColumn] ?? '',
    line: startLine + j,
    fields,
  })
}
```

Keep `export type { DocItem as TableItem }`? **No.** Rename the usages: an alias is a second source of truth for the same type.

- [ ] **Step 3: `field-map` in `src/config/ownership.ts`**

In `ArtifactRule`, add:

```typescript
/** Canonical -> real name of the field in this project. E.g.: { 'resolved-by': 'resolved-by' }. */
fieldMap: Record<string, string>
```

In `parseArtifact`:

```typescript
const fieldMapRaw = item['field-map']
const fieldMap: Record<string, string> = {}
if (fieldMapRaw !== undefined && fieldMapRaw !== null) {
  for (const [canonical, real] of Object.entries(asRecord(fieldMapRaw, `${where}.field-map`))) {
    if (typeof real !== 'string' || real.trim() === '') {
      throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.field-map.${canonical} must be a non-empty string.`)
    }
    fieldMap[normalizeKey(canonical)] = normalizeKey(real)
  }
}
```

And the reading, in the same file (it is config, not a check):

```typescript
/**
 * Value of a canonical field of the item, honoring the artifact's `field-map`.
 * Returns null for an empty cell — `CI-3` treats "empty" and "absent" the same.
 */
export function fieldOf(rule: ArtifactRule, item: DocItem, canonical: string): string | null {
  const key = rule.fieldMap[normalizeKey(canonical)] ?? normalizeKey(canonical)
  const value = item.fields[key]
  if (value === undefined || isEmptyValue(value)) return null
  return value.trim()
}
```

- [ ] **Step 4: Declare the mapping in `.ownership.yml` and in the template**

In `docs/.ownership.yml` and `templates/ownership.yml`, in the `DA` artifact:

```yaml
- id-prefix: DA
  path: { { DA_PATH } }
  owner: '{{OWNER}}'
  skill: decision-recorder
  collection: table
  # The table is read by people, in their own language; the check asks by the
  # canonical name. The mapping lives here because it is the only
  # project-specific thing (spec §3).
  field-map:
    resolved-by: 'Resolved-by'
```

- [ ] **Step 5: Tests — `test/docs/table.test.ts` and `test/config/ownership.test.ts`**

Add:

```typescript
test('the item carries all the columns, normalized', () => {
  const items = parseItemTable(['| ID | Gap | Status | Resolved-by |', '| --- | --- | --- | --- |', '| DA-0001 | X | resolved | ADR-0007 |'].join('\n'), 1)
  assert.equal(items[0]?.fields['resolved-by'], 'ADR-0007')
  assert.equal(items[0]?.fields['gap'], 'X')
})

test('fieldOf translates the canonical name through the field-map and treats empty as absent', () => {
  const config = parseOwnership(/* ... with field-map: { resolved-by: "Resolved-by" } ... */)
  const rule = config.artifacts[0]!
  assert.equal(
    fieldOf(
      rule,
      {
        id: 'DA-0001',
        status: 'resolved',
        line: 1,
        fields: { 'resolved-by': 'ADR-0007' },
      },
      'resolved-by',
    ),
    'ADR-0007',
  )
  assert.equal(
    fieldOf(
      rule,
      {
        id: 'DA-0002',
        status: 'open',
        line: 2,
        fields: { 'resolved-by': '—' },
      },
      'resolved-by',
    ),
    null,
  )
})
```

- [ ] **Step 6: Verify and commit**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
git add src test docs/.ownership.yml templates
git commit -m "refactor: DocItem with fields and field-map in .ownership.yml"
```

---

### Task 6: `collection: sections` — requirements as sections with an ID

**Objective:** the third form of granularity in spec §3 — _long but living body, sections with an ID_. One file per requirement family (`RF`, `RNF`, `RN`), one section per requirement.

**Requirements:**

- A section is a heading `## <ID> — <title>` followed by a list of bold metadata. Everything after that, up to the next heading, is body.
- A requirement without `status` is a `CI-1` finding, not a parser error: the parser returns `status: ''`.
- The parser has no opinion about which fields exist — it returns what is written.
- `CI-1`, `CI-2` and `HK-3` now see section items the same way they see table rows.

- [ ] **Step 1: `src/docs/sections.ts`**

```typescript
import { parseId } from './schema.ts'
import { normalizeKey } from './item.ts'
import type { DocItem } from './item.ts'

const HEADING = /^#{2,4}\s+([A-Z]{2,4}-\d{3,4})\s*(?:[—–-]\s*(.*))?$/
const FIELD = /^[-*]\s+\*\*([^*]+?)\*\*\s*:?\s*(.*)$/

/**
 * Items of an artifact kept as sections with an ID (spec §3 — requirements).
 * `startLine` is the 1-indexed line where `source` starts in the file.
 *
 * Recognized format:
 *
 *     ## RN-0001 — Rule title
 *
 *     - **status:** active
 *     - **relates-to:** ADR-0002
 *
 *     Statement.
 */
export function parseItemSections(source: string, startLine: number): DocItem[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const items: DocItem[] = []

  for (let i = 0; i < lines.length; i++) {
    const heading = HEADING.exec((lines[i] ?? '').trim())
    if (!heading?.[1] || !parseId(heading[1])) continue

    const fields: Record<string, string> = {}
    if (heading[2] !== undefined && heading[2].trim() !== '') {
      fields.title = heading[2].trim()
    }

    for (let j = i + 1; j < lines.length; j++) {
      const line = (lines[j] ?? '').trim()
      if (line === '') continue
      if (HEADING.test(line) || line.startsWith('#')) break
      const field = FIELD.exec(line)
      if (!field?.[1]) break
      fields[normalizeKey(field[1])] = (field[2] ?? '').trim()
    }

    items.push({
      id: heading[1],
      status: fields.status ?? '',
      line: startLine + i,
      fields,
    })
  }

  return items
}
```

- [ ] **Step 2: Test — `test/docs/sections.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseItemSections } from '../../src/docs/sections.ts'

const SOURCE = [
  '# Business rules',
  '',
  '## RN-0001 — Every artifact has exactly one owner',
  '',
  '- **status:** active',
  '- **relates-to:** ADR-0002',
  '',
  'Statement of the rule.',
  '',
  '## RN-0002 — Revoked rule',
  '',
  '- **status:** revoked',
  '- **revoked-by:** RN-0001',
  '',
].join('\n')

test('reads id, title, status and fields of each section', () => {
  const items = parseItemSections(SOURCE, 1)
  assert.equal(items.length, 2)
  assert.equal(items[0]?.id, 'RN-0001')
  assert.equal(items[0]?.status, 'active')
  assert.equal(items[0]?.fields.title, 'Every artifact has exactly one owner')
  assert.equal(items[0]?.fields['relates-to'], 'ADR-0002')
  assert.equal(items[1]?.fields['revoked-by'], 'RN-0001')
})

test('the line points at the section heading, shifted by startLine', () => {
  assert.equal(parseItemSections(SOURCE, 10)[0]?.line, 12)
})

test('a section without status returns an empty status — CI-1 is the one that complains', () => {
  const items = parseItemSections('## RN-0009 — No metadata\n\nBody.\n', 1)
  assert.equal(items[0]?.status, '')
})

test('a heading that does not start with an ID is ignored', () => {
  assert.deepEqual(parseItemSections('## Introduction\n\n- **status:** active\n', 1), [])
})
```

- [ ] **Step 3: `collection: 'sections'` in `src/config/ownership.ts`**

```typescript
export type Collection = 'per-file' | 'table' | 'sections'
```

and the validation:

```typescript
const collectionRaw = item.collection ?? 'per-file'
if (collectionRaw !== 'per-file' && collectionRaw !== 'table' && collectionRaw !== 'sections') {
  throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.collection must be "per-file", "table" or "sections".`)
}
```

- [ ] **Step 4: `src/docs/collect.ts`**

The parser choice becomes a function, and `items` stops being table-only:

```typescript
function parseItems(rule: ArtifactRule, source: string, body: string | null, bodyStart: number): DocItem[] {
  const text = body ?? source
  const start = body === null ? 1 : bodyStart
  if (rule.collection === 'table') return parseItemTable(text, start)
  if (rule.collection === 'sections') return parseItemSections(text, start)
  return []
}
```

and in `readDoc`:

```typescript
const items = parseItems(rule, source, frontmatter ? frontmatter.body : null, frontmatter ? frontmatter.bodyStartLine : 1)
```

- [ ] **Step 5: `CI-1` — a container is any collection**

In `src/checks/ci1-structure.ts`, replace the two occurrences:

```typescript
const isContainer = doc.rule.collection !== 'per-file'
```

The final block that validates an item's `status` (`if (isContainer && states)`) now covers sections with no other change. Add, in the same loop, the "item without status" case:

```typescript
if (item.status === '') {
  findings.push(
    error(doc.file, item.line, `Item ${item.id} does not declare \`status\`.`, `Add \`- **status:** ${states[0]}\` right below the heading (spec §4).`),
  )
  continue
}
```

- [ ] **Step 6: `CI-2` — IDs declared in a section enter the lint**

In `collectDeclarations`, the condition becomes `doc.rule.collection !== 'per-file'`. Without this, a duplicated `RN` would slip through and a recycled ID would come back through the back door.

- [ ] **Step 7: `HK-3` — promotion inside a sections collection**

In `findPromotion`, generalize the table branch:

```typescript
if (rule.collection !== 'per-file') {
  const parse = (source: string): DocItem[] => (rule.collection === 'table' ? parseItemTable(source, 1) : parseItemSections(source, 1))
  const previous = new Map(parse(before).map(item => [item.id, item.status]))
  for (const item of parse(after)) {
    const from = previous.get(item.id)
    if (from !== undefined && isHumanPromotion(from, item.status)) {
      return { id: item.id, from, to: item.status }
    }
  }
  return null
}
```

- [ ] **Step 8: Verify and commit**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
git add src test
git commit -m "feat(SK-4): sections collection for requirements with an ID"
```

---

### Task 7: State machine of the requirements, and the debt it creates

**Objective:** `RF`/`RNF`/`RN` with the `draft → active → revoked` cycle of spec §4, human promotion on both jumps, and the honest record of what is left owed.

**Requirements:**

- `STATUS_MACHINE` gains the three prefixes.
- `HUMAN_PROMOTIONS` gains `draft → active` and `active → revoked` (spec §4: "who promotes: human").
- `revoked` enters `FROZEN_STATUSES` — it is a terminal state, and no terminal state allows editing the body.
- **The hole is declared, not hidden:** `HK-1` freezes per file, reading `status` from the frontmatter. A revoked requirement lives in a **section** inside a living file, so `HK-1` does not freeze it. That becomes `TDR-0001` with an observable payment trigger — not a `TODO` comment.

- [ ] **Step 1: `src/docs/schema.ts`**

```typescript
export const STATUS_MACHINE: Readonly<Record<string, readonly string[]>> = Object.freeze({
  ADR: ['draft', 'accepted', 'superseded'],
  DA: ['open', 'resolved', 'dropped'],
  TDR: ['open', 'paid', 'accepted-permanently'],
  RF: ['draft', 'active', 'revoked'],
  RNF: ['draft', 'active', 'revoked'],
  RN: ['draft', 'active', 'revoked'],
})

export const FROZEN_STATUSES: ReadonlySet<string> = new Set(['accepted', 'superseded', 'deprecated', 'published', 'paid', 'revoked'])

export const HUMAN_PROMOTIONS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'draft', to: 'accepted' },
  { from: 'open', to: 'resolved' },
  { from: 'draft', to: 'active' },
  { from: 'active', to: 'revoked' },
])
```

- [ ] **Step 2: Test — the promotion of a requirement also asks**

In `test/hooks/hk3-state-promotion.test.ts`, add a case with a `collection: sections` artifact promoting `RN-0001` from `draft` to `active`, and expect `action: 'ask'`.

- [ ] **Step 3: `TDR-0001` — what `HK-1` still does not freeze**

`docs/decisions/debt/TDR-0001-per-section-freezing.md`:

```markdown
---
id: TDR-0001
title: HK-1 does not freeze a revoked section inside a collection file
status: open
owner: '@esliph/engineering'
trigger: >
  Never. Immutable while the debt exists; paying it marks it as paid.
last-reviewed: 2026-08-24
relates-to: [RN-0006]
---

# TDR-0001 — HK-1 does not freeze a revoked section inside a collection file

## The shortcut

`HK-1` decides per file: it reads `status` from the frontmatter and compares it
with `FROZEN_STATUSES`. A `revoked` requirement is a **section** inside
`docs/requirements/rules.md`, a file that stays alive because other sections
change. Result: `status: revoked` is a terminal state by spec §4, but nothing
stops an agent from rewriting the body of that section.

## Why it was accepted

Freezing per section requires `HK-1` to project the edit, diff **per item** and
know which item was touched — more work than the whole of Phase 2, to protect a
case that today has zero occurrences (no revoked requirement exists yet).
`CI-3` closes half of the hole: a revocation without a bidirectional pair fails in CI.

## Payment trigger

On the first PR that **revokes** a requirement — that is, that changes any section
to `status: revoked`. From then on there is a frozen body to protect, and the
cost of not protecting it becomes real.

## Cost of continuing to owe

A revoked requirement can be rewritten retroactively without any hook complaining,
and the only defense becomes human review of the diff — exactly the defense
that mechanism 5 exists to avoid depending on.
```

- [ ] **Step 4: Verify and commit**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate; echo "exit=$?"
git add src test docs/decisions/debt
git commit -m "feat(SK-4): requirement lifecycle; TDR-0001 records per-section freezing"
```

> `TDR-0001` cites `RN-0006`, which only exists after Task 12. Write the TDR **together** with the dogfooding of Task 12, or leave `relates-to: []` here and close the reference there — `CI-2` fails a citation that does not resolve, and that failure is the correct behavior.

---

### Task 8: `src/ids/coverage.ts` — who cites each ID, outside `docs/`

**Objective:** answer "is this `RN` cited by any test?" — the half of mechanism 3 that no previous check reached, because they all read only the artifacts.

**Requirements:**

- Scan driven by the `cited-by` of `.ownership.yml`. Without `cited-by`, it scans nothing.
- One scan per distinct **set** of globs, not one per artifact: `["test/**","src/**"]` declared in three artifacts walks the tree once.
- Ignores `.git/`, `node_modules/` and large or binary files. A check that hangs on a large repository does not run on the PR, and spec §9 requires it to run in minutes.
- Zero opinion about what is "sufficient citation": it returns the sites, and `CI-3` is the one that judges.

- [ ] **Step 1: `src/ids/coverage.ts`**

```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import { findCitations } from './citations.ts'

/** Directories that never contain a citation written by people. */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.cache'])

/** Above this, it is data, not text — and reading costs more than it is worth. */
const MAX_BYTES = 512 * 1024

export interface CitationSite {
  /** Path relative to the repository root, always with `/`. */
  file: string
  /** 1-indexed line. */
  line: number
}

/** The NUL byte is the cheap signal of "this is binary data, not text". */
function isProbablyText(content: string): boolean {
  return content.indexOf(String.fromCharCode(0)) === -1
}

function walk(root: string, relative: string, out: string[]): void {
  let entries: string[]
  try {
    entries = readdirSync(join(root, relative))
  } catch {
    return
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const path = relative === '' ? entry : `${relative}/${entry}`
    let isDirectory: boolean
    try {
      isDirectory = statSync(join(root, path)).isDirectory()
    } catch {
      continue
    }
    if (isDirectory) walk(root, path, out)
    else out.push(path)
  }
}

/**
 * Where each ID appears, restricted to the paths of `globs`.
 * Key: the ID exactly as written in the text — canonicalization is up to whoever compares.
 */
export function scanCitations(root: string, globs: readonly string[]): Map<string, CitationSite[]> {
  const sites = new Map<string, CitationSite[]>()
  if (globs.length === 0) return sites

  const matches = picomatch([...globs])
  const files: string[] = []
  walk(root, '', files)

  for (const file of files) {
    if (!matches(file)) continue

    let content: string
    try {
      if (statSync(join(root, file)).size > MAX_BYTES) continue
      content = readFileSync(join(root, file), 'utf8')
    } catch {
      continue
    }
    if (!isProbablyText(content)) continue

    for (const citation of findCitations(content)) {
      const list = sites.get(citation.id) ?? []
      list.push({ file, line: citation.line })
      sites.set(citation.id, list)
    }
  }

  return sites
}
```

- [ ] **Step 2: Test — `test/ids/coverage.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanCitations } from '../../src/ids/coverage.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('finds citations only in the declared paths', () => {
  withTempRepo(
    {
      'test/rule.test.ts': "// covers RN-0001\ntest('RN-0001', () => {});\n",
      'src/app.ts': 'export const x = 1; // RN-0002\n',
      'notes.md': 'RN-0003 mentioned out of scope\n',
    },
    root => {
      const sites = scanCitations(root, ['test/**', 'src/**'])
      assert.equal(sites.get('RN-0001')?.length, 2)
      assert.equal(sites.get('RN-0002')?.[0]?.file, 'src/app.ts')
      assert.equal(sites.has('RN-0003'), false)
    },
  )
})

test('without globs, it scans nothing', () => {
  withTempRepo({ 'src/a.ts': 'RN-0001\n' }, root => {
    assert.equal(scanCitations(root, []).size, 0)
  })
})

test('ignores node_modules', () => {
  withTempRepo({ 'node_modules/package/index.js': 'RN-0001\n' }, root => {
    assert.equal(scanCitations(root, ['**/*.js']).size, 0)
  })
})
```

- [ ] **Step 3: Verify and commit**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
git add src/ids/coverage.ts test/ids/coverage.test.ts
git commit -m "feat(CI-3): scan of citations in the cited-by paths"
```

---

### Task 9: `CI-3` — traceability

**Objective:** the check that keeps the graph of spec §8 intact. It fails when a bidirectional pair is left open, when an `active` `RN` is cited by no one, when an `accepted` ADR is not linked to anything, and when a `resolved` DA does not say what resolved it.

**Requirements (spec §8 and §9), one per rule:**

| #   | Fails when                                                                      | Message names                     |
| --- | ------------------------------------------------------------------------------- | --------------------------------- |
| 1   | `A` declares `supersedes: B` and `B` does not declare `superseded-by: A` (and vice versa) | both files and both lines |
| 2   | `A` declares `revokes: B` and `B` does not declare `revoked-by: A` (and vice versa)       | idem                              |
| 3   | item with a terminal revocation `status` (`revoked`) without `revoked-by`            | the missing field                 |
| 4   | `resolved` DA without `resolved-by`, or pointing to an ID that does not exist                 | the ID that does not resolve              |
| 5   | `resolved` DA whose ADR does not cite it back in `relates-to`                      | the ADR and the field                   |
| 6   | `accepted` ADR without `relates-to` filled in                                      | the ADR                             |
| 7   | `active` item of an artifact with `cited-by` with no citation in those paths  | the globs where it looked         |

- Rule 7 only runs for an artifact that **declares** `cited-by`. An artifact without `cited-by` is not charged — installing in phases remains possible.
- A citation **inside the artifact's own file** does not count as coverage: the `RN` must be cited from outside.
- Every ID comparison goes through `canonicalId` — `RN-014` and `RN-0014` are the same ID (`CI-2` already established this).
- No `if` with a field name in Portuguese: everything via `fieldOf`.

- [ ] **Step 1: `src/checks/ci3-traceability.ts`**

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { ArtifactRule } from '../config/ownership.ts'
import { fieldOf } from '../config/ownership.ts'
import type { DocItem } from '../docs/item.ts'
import { canonicalId, parseId } from '../docs/schema.ts'
import { findCitations } from '../ids/citations.ts'
import { scanCitations } from '../ids/coverage.ts'

const RULE = 'CI-3'

/** Pairs that must close on both sides (spec §8). */
const PAIRS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'supersedes', to: 'superseded-by' },
  { from: 'revokes', to: 'revoked-by' },
])

interface Entry {
  id: string
  file: string
  line: number
  status: string
  rule: ArtifactRule
  /** Reading of a canonical field, be it frontmatter or a collection item. */
  read(canonical: string): string | null
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

/** Canonical IDs cited inside a value, whatever its form. */
function idsIn(value: string | null): string[] {
  if (value === null) return []
  return findCitations(value)
    .map(citation => parseId(citation.id))
    .filter((parsed): parsed is { prefix: string; number: number } => parsed !== null)
    .map(canonicalId)
}

function entriesOf(context: CheckContext): Entry[] {
  const entries: Entry[] = []

  for (const doc of context.docs) {
    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data
      const id = data?.id
      if (typeof id !== 'string' || !parseId(id)) continue
      entries.push({
        id,
        file: doc.file,
        line: doc.frontmatter?.lines.id ?? 1,
        status: typeof data?.status === 'string' ? data.status : '',
        rule: doc.rule,
        read: canonical => {
          const value = data?.[canonical]
          if (value === undefined || value === null) return null
          const text = Array.isArray(value) ? value.join(', ') : String(value)
          return text.trim() === '' || text === 'null' ? null : text
        },
      })
      continue
    }

    for (const item of doc.items) {
      entries.push({
        id: item.id,
        file: doc.file,
        line: item.line,
        status: item.status,
        rule: doc.rule,
        read: canonical => fieldOf(doc.rule, item, canonical),
      })
    }
  }

  return entries
}

export const ci3Traceability: Check = {
  id: RULE,
  name: 'traceability',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const entries = entriesOf(context)
    const byId = new Map(entries.map(entry => [canonicalId(parseId(entry.id)!), entry]))

    // 1 and 2 — bidirectional pairs.
    for (const entry of entries) {
      for (const pair of PAIRS) {
        for (const side of [pair, { from: pair.to, to: pair.from }]) {
          for (const targetId of idsIn(entry.read(side.from))) {
            const target = byId.get(targetId)
            if (!target) {
              findings.push(
                error(
                  entry.file,
                  entry.line,
                  `${entry.id} declares \`${side.from}: ${targetId}\`, which does not exist.`,
                  'Cite an existing ID, or remove the field (spec §8).',
                ),
              )
              continue
            }
            const back = idsIn(target.read(side.to))
            if (!back.includes(canonicalId(parseId(entry.id)!))) {
              findings.push(
                error(
                  target.file,
                  target.line,
                  `Open pair: ${entry.id} declares \`${side.from}: ${target.id}\`, but ${target.id} does not declare \`${side.to}: ${entry.id}\`.`,
                  `Add \`${side.to}: ${entry.id}\` in ${target.file}:${target.line} — the pair closes on both sides (spec §8).`,
                ),
              )
            }
          }
        }
      }

      // 3 — revocation without whoever revoked.
      if (entry.status === 'revoked' && entry.read('revoked-by') === null) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} is \`revoked\` without declaring \`revoked-by\`.`,
            'A removed rule is revoked, not deleted — point to the ID that replaced it (spec §5, SK-4).',
          ),
        )
      }

      // 4 and 5 — a resolved DA points to the ADR, and the ADR points back.
      if (entry.status === 'resolved') {
        const resolvers = idsIn(entry.read('resolved-by'))
        if (resolvers.length === 0) {
          findings.push(
            error(
              entry.file,
              entry.line,
              `${entry.id} is \`resolved\` without saying what resolved it.`,
              'Every closed open decision points to the ADR that closed it (spec §5, SK-3, rule 7).',
            ),
          )
        }
        for (const resolverId of resolvers) {
          const resolver = byId.get(resolverId)
          if (!resolver) {
            findings.push(error(entry.file, entry.line, `${entry.id} points to ${resolverId}, which does not exist.`, 'Create the ADR or fix the reference.'))
            continue
          }
          if (!idsIn(resolver.read('relates-to')).includes(canonicalId(parseId(entry.id)!))) {
            findings.push(
              error(
                resolver.file,
                resolver.line,
                `${resolver.id} resolves ${entry.id}, but does not cite it in \`relates-to\`.`,
                `Add ${entry.id} to \`relates-to\` — CI-3 checks both sides (spec §5, SK-3, rule 7).`,
              ),
            )
          }
        }
      }

      // 6 — accepted ADR without a link.
      if (entry.status === 'accepted' && idsIn(entry.read('relates-to')).length === 0) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} is \`accepted\` without \`relates-to\`.`,
            'An accepted ADR cites at least one requirement, open decision or principle — a decision that links to nothing is a sign of missing context (spec §8).',
          ),
        )
      }
    }

    // 7 — coverage by citation, one scan per distinct set of globs.
    const scans = new Map<string, Map<string, { file: string; line: number }[]>>()
    for (const entry of entries) {
      if (entry.status !== 'active' || entry.rule.citedBy.length === 0) continue

      const key = entry.rule.citedBy.join('0000')
      let sites = scans.get(key)
      if (!sites) {
        sites = scanCitations(context.root, entry.rule.citedBy)
        scans.set(key, sites)
      }

      const canonical = canonicalId(parseId(entry.id)!)
      const found = [...sites.entries()].some(([id, places]) => {
        const parsed = parseId(id)
        return parsed !== null && canonicalId(parsed) === canonical && places.some(place => place.file !== entry.file)
      })

      if (!found) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} is \`active\` and is not cited in any of ${entry.rule.citedBy.join(', ')}.`,
            `Cite ${entry.id} in the test that covers it — traceability closes on both sides (spec §5, SK-4, rule 6).`,
          ),
        )
      }
    }

    return findings
  },
}
```

- [ ] **Step 2: Register in `src/checks/registry.ts`**

```typescript
export const CHECKS: readonly Check[] = [ci1Structure, ci2Ids, ci3Traceability]
```

- [ ] **Step 3: Test — `test/checks/ci3-traceability.test.ts`**

One case per rule of the requirements table, each building a temporary repository with a minimal `docs/.ownership.yml` and running `runValidate(root)` — or `ci3Traceability.run(context)` directly, if you prefer to isolate. The mandatory cases:

```typescript
test('an open supersedes/superseded-by pair fails naming both sides', …);
test('a pair closed on both sides passes', …);
test('a resolved DA without resolved-by fails', …);
test('a resolved DA whose ADR does not cite it back fails, and the finding points to the ADR', …);
test('an accepted ADR without relates-to fails', …);
test('an active RN without a citation in cited-by fails naming the globs', …);
test('an active RN cited by a test passes', …);
test('an active RN in an artifact without cited-by is not charged', …);
test('a citation inside the artifact\'s own file does not count as coverage', …);
test('RN-014 and RN-0014 are the same ID for coverage purposes', …);
test('a revoked RN without revoked-by fails', …);
test('every CI-3 finding is an error, never a warning', …);
```

- [ ] **Step 4: Verify and commit**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
./bin/living-docs validate; echo "exit=$?"
git add src test
git commit -m "feat(CI-3): traceability — bidirectional pairs and RN coverage by citation"
```

> When turning `CI-3` on in this repository, rule 6 does **not** fire: `ADR-0001` and `ADR-0002` are in `status: draft` — no ADR here has been accepted by a person to this day. That is luck, not slack. `ADR-0001` has `relates-to: []`, and the day someone accepts it, it starts violating rule 6 **while frozen**, with `relates-to` outside `mutable-fields` — a dead end that is only solved by superseding the ADR itself. That is why Task 12, Step 1 fills in `relates-to` **before** any acceptance, and not after.

---

### Task 10: `SK-4` `requirements-keeper`

**Objective:** the skill that owns `docs/requirements/`, written according to the conventions of spec §11, with a `description` in symptom language.

**Requirements:**

- Sections in the order of spec §11, a checklist with one box per invariant, each box naming `CI-n`, `HK-n` or "verification: human".
- It does **not** duplicate the requirement format — it points to `templates/requirements.md`.
- It gets **no** command: spec §10 does not define `/requirement`.
- The authoring test now runs over **all** the plugin's skills, not over a fixed list.

- [ ] **Step 1: `plugin/skills/requirements-keeper/SKILL.md`**

```markdown
---
name: requirements-keeper
description: >
  Use before implementing any behavior, and whenever someone asks
  "what is the rule for this?", "what should the system do when…",
  "is this specified?", "is this case covered?", "can it round?",
  "what if the value is negative?" — or when a business rule changes, is
  revoked, or needs an ID to be cited by a test, commit or ADR.
  Also when an existing requirement is ambiguous and someone is about
  to decide on their own what it meant.
---

# requirements-keeper — owner of the requirements with a stable ID

## Overview

Requirements say what the system **must** be. Three families, one file each:
`RF` (functional), `RNF` (non-functional) and `RN` (business rules). Each
requirement is a section with a citable ID, and it is the ID that makes the blast radius of
a change computable by `grep`.

Paths, owners and prefixes come from `docs/.ownership.yml` — read it first,
never assume a path.

## What you own

| Artifact   | What it is                                                              | Form                                |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------- |
| `RF-nnnn`  | Behavior the system must have                                           | Section with ID in `functional.md`  |
| `RNF-nnnn` | Property the system must exhibit (latency, cost, operation)             | Section with ID in `non-functional.md` |
| `RN-nnnn`  | Business rule — the truth of the domain, independent of screen and route | Section with ID in `rules.md`       |

Section format: `templates/requirements.md`. Do not reproduce it here.

## When to use / when not to

**Use** before implementing behavior, and for every new or changed rule.

**Do not use** to describe what the code already does. That is not a requirement, it is
narration — and narrating code is anti-requirement no. 4 of spec §13.

**Never** invent the rule that is missing. Behavior without a written rule is a gap:
the path is `decision-recorder` (`/open-decision`), which opens a `DA-nnnn` and
**stops** the implementation.

## Procedure

1. **Read `docs/.ownership.yml`** and find the path, owner and prefix of each
   family. If it does not exist, stop and run `/docs-setup`.
2. **Do not look at the code, and that is deliberate.** The spec says what must be;
   justifying the rule by what the code does today inverts the relation and erases the gap.
3. **Classify**: observable behavior → `RF`; quality property →
   `RNF`; truth of the domain → `RN`. When in doubt between `RF` and `RN`, ask whether the
   rule would survive a complete rewrite of the interface: if so, it is `RN`.
4. **Search before creating.** An almost identical requirement is a sign that the right thing is
   to edit the existing one or revoke it, not to add a second.
5. **Take the next free ID** of the prefix, checking `docs/ids-retired.txt`.
   Never recycle, never skip.
6. **Name by the glossary**, when it exists. A term from the writer's habit
   is how two rules come to talk about different things with the same word.
7. **Fill in "out of scope"** wherever there is ambiguity. It is that field that
   prevents the silent widening of the requirement.
8. **Write `status: draft`.** Promoting to `active` is a human act — `HK-3`
   asks.
9. **A removed rule is `revoked`, never deleted**, with `revoked-by` pointing to the
   rule that replaced it — and the replacement declaring `revokes` back.
10. **Ask for the test that cites the ID.** Every `active` `RN` needs at least one
    citation in the `cited-by` paths, or `CI-3` fails. You do not write the
    test; you say which ID it needs to cite.
11. **Run `living-docs validate`** before finishing.
12. **Cite the ID in the commit message.**

## Boundaries

| Yours                                            | Not yours                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Saying what the system must do, with a citable ID | Saying how to implement                                         |
| Flagging ambiguity and delimiting what is out of scope | Resolving the ambiguity on your own (→ `decision-recorder`) |
| Revoking a rule pointing to the replacement      | Deleting a rule                                                  |
| Requiring that a test citing the rule exist      | Writing the test                                                 |
| Refusing a requirement without an ID             | Promoting to `active` — that is human                            |

## Checklist

- [ ] The right family (`RF` / `RNF` / `RN`) for the nature of the item — verification: human
- [ ] Sequential ID, not recycled, checked against `docs/ids-retired.txt` — `CI-2`
- [ ] `status` is `draft`; the promotion was left to a person — `HK-3`
- [ ] File frontmatter with an event `trigger`, not a cadence one — `CI-1`
- [ ] `status` of each section within the state machine — `CI-1`
- [ ] Every citation to another ID resolves — `CI-2`
- [ ] A revoked requirement points to the replacement, and it points back — `CI-3`
- [ ] Every `active` `RN` is cited by at least one test — `CI-3`
- [ ] "Out of scope" filled in where there was ambiguity — verification: human
- [ ] No rule was invented to unblock implementation — verification: human
```

- [ ] **Step 2: Generalize `test/plugin/authoring.test.ts`**

Replace the `SKILL` constant with a scan of `plugin/skills/*/SKILL.md`, and run the structure assertions (frontmatter, section order, checklist with a named verification) for **each** skill found, via `describe`/loop. Keep the `decision-recorder`-specific assertions (symptoms of the `description`, "does not duplicate the template") in its block, and add the equivalents for `requirements-keeper`:

```typescript
test('requirements-keeper: the description speaks in symptoms, not in categories', () => {
  const description = String(parseFrontmatter(skillSource('requirements-keeper'))?.data.description ?? '')
  assert.ok(description.length > 120)
  for (const sintoma of ['what is the rule', 'what should the system do', 'specified']) {
    assert.ok(description.toLowerCase().includes(sintoma), `description without the symptom "${sintoma}"`)
  }
})

test('requirements-keeper does not duplicate the requirement format', () => {
  const source = skillSource('requirements-keeper')
  assert.match(source, /templates\/requirements\.md/)
  assert.doesNotMatch(source, /^- \*\*status:\*\*/m, 'the skill must not contain the requirement template')
})
```

The assert that `plugin/commands` has exactly four files **stays as it is**: Phase 2 adds no command, and the test is what guarantees that.

- [ ] **Step 3: Verify and commit**

```bash
docker compose exec toolkit npm test
git add plugin test/plugin
git commit -m "feat(SK-4): requirements-keeper skill and authoring test over all skills"
```

---

### Task 11: `living-docs init --stage` — the frame per maturity stage

**Objective:** `SK-0` step 2 of the spec — "determine the stage and derive the minimum set; do not install what the stage does not ask for". Until now only one set existed; with Phase 2 done, two now exist.

**Requirements:**

- `--stage solo` (default) installs what Phases 0–1 installed. Nothing changes for whoever already ran it.
- `--stage small-team` adds the requirements frame: the three files, the three entries in `.ownership.yml` (with `cited-by`), and the CODEOWNERS lines.
- Idempotence preserved: running twice does not duplicate, does not rewrite, does not renumber. Running `solo` after `small-team` removes **nothing**.
- An unknown stage is an error with a message that lists the valid ones.
- Honesty: `small-team` prints what does **not** exist yet (Phases 3 and 4), instead of pretending it installed the whole stage.

- [ ] **Step 1: `templates/requirements.md`**

```markdown
---
title: { { TITLE } }
owner: '{{OWNER}}'
trigger: >
  Before implementing any behavior of this family, and on every new
  or changed rule.
last-reviewed: { { TODAY } }
---

# {{TITLE}}

Each requirement is a section with a citable ID. The ID is never recycled, and it is what
makes the blast radius computable by `grep`.

Format of a section:
```

## {{PREFIX}}-0001 — Affirmative title of the rule

- **status:** draft
- **relates-to:** ADR-0001
- **out of scope:** what this rule deliberately does not cover

The statement, in one or two sentences. What **must** be — never what the code does.

```

<!-- Sections go in below. Owning skill: requirements-keeper. -->
```

A single template, parameterized by `{{PREFIX}}`/`{{TITLE}}`, for the three files: three almost identical templates are three places to diverge.

- [ ] **Step 2: `templates/ownership.yml` gains the conditional block**

Add `{{REQUIREMENTS_BLOCK}}` right after the `TDR` artifact, and nothing else. For `--stage solo` the substitution is the empty string; for `small-team`:

```yaml
- id-prefix: RF
  path: docs/requirements/functional.md
  owner: '{{OWNER}}'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**']

- id-prefix: RNF
  path: docs/requirements/non-functional.md
  owner: '{{OWNER}}'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**']

- id-prefix: RN
  path: docs/requirements/rules.md
  owner: '{{OWNER}}'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**', 'src/**']
```

- [ ] **Step 3: `src/cli/init.ts`**

```typescript
export const STAGES = ['solo', 'small-team'] as const
export type Stage = (typeof STAGES)[number]

export interface InitOptions {
  owner: string
  dryRun: boolean
  stage: Stage
}
```

- `resolvePath` gains the three new prefixes, with `ADOPTION_CANDIDATES` for requirements that already exist under another name: `docs/requisitos.md`, `docs/requirements.md`, `spec/`, `docs/spec/`. **Adopt, never create in parallel** — it is step 1 of `SK-0` and the most expensive anti-pattern on the list.
- The requirements block is only rendered when `stage === 'small-team'`.
- `InitResult` gains `stage: Stage` and `notInstalled: string[]`, so the CLI prints what was left out.

- [ ] **Step 4: `src/cli/index.ts`**

```typescript
const stageIndex = argv.indexOf('--stage')
const stage = stageIndex === -1 ? 'solo' : (argv[stageIndex + 1] ?? '')
if (stageIndex !== -1 && !STAGES.includes(stage as Stage)) {
  process.stderr.write(`living-docs: unknown stage "${stage}". Valid: ${STAGES.join(', ')}.\n`)
  return 2
}
```

And, at the end, the honest list:

```typescript
for (const item of result.notInstalled) {
  process.stdout.write(`not installed  ${item}\n`)
}
```

with `notInstalled` carrying, for `small-team`, something like `SK-6 + DoD + HK-4/HK-5 (Phase 3) — not implemented in this version` and `SK-1, SK-2, AG-2 (Phase 4) — not implemented in this version`. Update the `USAGE`.

- [ ] **Step 5: Tests — `test/cli/init.test.ts`**

```typescript
test('--stage solo does not create requirements', …);
test('--stage small-team creates the three files and the three entries in .ownership.yml', …);
test('--stage small-team is idempotent: the second run neither rewrites nor duplicates', …);
test('solo after small-team does not remove the requirements already created', …);
test('adopts a pre-existing docs/requisitos.md instead of creating a parallel one', …);
test('the result lists what was not installed, instead of pretending the full stage', …);
```

- [ ] **Step 6: Verify and commit**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
git add src test templates
git commit -m "feat(SK-0): living-docs init --stage installs the requirements frame"
```

---

### Task 12: Phase 2 dogfooding — real requirements, cited by tests

**Objective:** the toolkit obeys the very rule it imposes. Without this, `CI-3` is implemented and has never been exercised against real content — and Phase 2 is left with the same failure that spec §13 calls a dead wiki.

**Requirements:**

- The requirements describe **what the toolkit must be**, not what the code does. A requirement that can only be understood by reading `src/` is code narration and must be refused (spec §13).
- Every `active` `RN` gets a citation in at least one test. The citation goes in the **test name** or in a comment on the assertion line — the place where someone who broke the rule will read.
- No ADR is edited: `ADR-0001` and `ADR-0002` are in `draft`, so adding `relates-to` is legitimate. Once accepted, it would not be.

- [ ] **Step 1: Fill in `relates-to` of the existing ADRs — before any acceptance**

Is `ADR-0001` `accepted`? No: today it is `draft`, and that is why this step is possible. `CI-3` rule 6 requires `relates-to` filled in on an `accepted` ADR — and `accepted` is frozen, with `relates-to` **outside** `mutable-fields`. That is: an accepted ADR with `relates-to: []` is a dead end that is only solved by superseding.

Therefore, while still in `draft`, `ADR-0001` comes to cite the requirements it decides:

```yaml
relates-to: [RNF-0002, RNF-0003]
```

and `ADR-0003` comes to also cite `RNF-0003`. Record this in the procedure of `decision-recorder` if it is not yet obvious in the skill: **filling in `relates-to` is a precondition of acceptance, not a consequence of it.**

- [ ] **Step 2: `docs/.ownership.yml` — the three requirement artifacts and the `field-map`**

```yaml
- id-prefix: RF
  path: docs/requirements/functional.md
  owner: '@esliph/engineering'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**']

- id-prefix: RNF
  path: docs/requirements/non-functional.md
  owner: '@esliph/engineering'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**']

- id-prefix: RN
  path: docs/requirements/rules.md
  owner: '@esliph/engineering'
  skill: requirements-keeper
  collection: sections
  cited-by: ['test/**', 'src/**']
```

And the `field-map` of `DA` (Task 5, Step 4), if it has not gone in yet.

- [ ] **Step 3: `CODEOWNERS`**

```
docs/requirements/    @esliph/engineering
```

- [ ] **Step 4: `docs/requirements/rules.md` — the toolkit's business rules**

Frontmatter from `templates/requirements.md`, and the sections:

```markdown
## RN-0001 — Every artifact has exactly one declared owner

- **status:** draft
- **relates-to:** ADR-0002
- **out of scope:** who reviews the artifact; this is about ownership, not review

A living-documentation artifact belongs to one and only one owner, declared in
`docs/.ownership.yml` and mirrored in CODEOWNERS. Two owners for the same path
is guaranteed divergence; zero owners makes the artifact an orphan and unenforceable.

## RN-0002 — `trigger` names an observable event, never a cadence

- **status:** draft
- **out of scope:** the wording of the trigger; what is required is its nature

The `trigger` field declares **when** the artifact must be updated, and the answer
is always an event someone can observe happening. A calendar date
("quarterly", "every sprint") describes an intention to review, not a need for
change — and it is what turns a document into a ritual.

## RN-0003 — An ID identifies one item, forever

- **status:** draft
- **out of scope:** the format of the ID, which is a machine contract and not a business rule

An ID never identifies two items, and is never reused after the item
ceases to exist. `ADR-001` and `ADR-0001` are the same ID: re-padding does not create a
new item. Without this, an old citation comes to point to something else
silently, which is worse than pointing to nothing.

## RN-0004 — A frozen item only changes in the allowlist fields

- **status:** draft
- **relates-to:** RN-0006
- **out of scope:** who decides to freeze; that is the state machine

An item in a terminal state accepts change only in the fields that `.ownership.yml`
declares mutable — typically `status`, `superseded-by` and `last-reviewed`. It is
this allowlist that allows superseding an ADR without violating its immutability.

## RN-0005 — State promotion is a human act

- **status:** draft
- **out of scope:** the creation of the item, which is an agent act

No agent promotes an item on its own to a state that means acceptance
(`draft → accepted`, `open → resolved`, `draft → active`, `active → revoked`). The
most a skill writes is `draft`/`open`. Accepting is deciding, and deciding is
not the agent's.

## RN-0006 — A terminal state does not allow editing the body

- **status:** draft
- **relates-to:** TDR-0001
- **out of scope:** per-section freezing inside a collection file, which TDR-0001 records as debt

An item that reached the terminal state is not corrected: history is the asset. An
accepted ADR that turned out to be wrong gets `superseded`, and the new decision explains the
error.

## RN-0007 — Every citation resolves, or the CI fails

- **status:** draft
- **out of scope:** a citation to a prefix not declared in `.ownership.yml`, which is ignored on purpose to allow installation in phases

A `<PREFIX>-<number>` reference to a known prefix points to an existing
and non-retired item. A dangling citation is worse than no citation:
it asserts a traceability that does not exist.
```

- [ ] **Step 5: `docs/requirements/non-functional.md`**

```markdown
## RNF-0001 — A hook fails open, within 5 seconds, without network

- **status:** draft
- **out of scope:** the CI, which fails closed on purpose

Any error in running a hook — unreadable configuration, container down,
timeout — results in letting it pass. The enforcement that survives a broken
hook is the CI; a broken hook that blocks the work is removed by the user on the
first day, and then there is no enforcement at all.

## RNF-0002 — Nothing runs on the host besides Docker

- **status:** draft
- **relates-to:** ADR-0001
- **out of scope:** Docker itself and `git`

No `node`, `npm` or `npx` command is run outside the container. The host
lends only the daemon.

## RNF-0003 — The toolkit root and the validated repository root are independent

- **status:** draft
- **relates-to:** ADR-0003
- **out of scope:** the toolkit's distribution mechanism, which ADR-0003 deliberately does not decide

Discovering where the toolkit is and discovering which repository to validate are two
distinct questions, with answers that may coincide and must not be confused.
```

- [ ] **Step 6: `docs/requirements/functional.md`**

```markdown
## RF-0001 — `validate` fails the build when there is an error, and only then

- **status:** draft
- **out of scope:** the output format

`living-docs validate` exits with code 1 if any check produced a finding of
`error` severity, and 0 otherwise. A warning does not fail the build — an ignored
warning is the beginning of the dead wiki, and that is why almost nothing is a warning.

## RF-0002 — `init` is idempotent and adopts what already exists

- **status:** draft
- **out of scope:** migrating the content of the adopted artifact to another format

Running `living-docs init` twice does not duplicate a file, does not rewrite existing
content and does not renumber an ID. On finding an equivalent artifact under another path,
it adopts it in `.ownership.yml` instead of creating a parallel one.

## RF-0003 — `init` installs the stage's set, and says what it did not install

- **status:** draft
- **out of scope:** choosing the stage, which is a human judgment

`living-docs init --stage <stage>` installs only the frame the stage asks for,
and explicitly lists what was left out.
```

- [ ] **Step 7: Cite the IDs in the tests that already cover them**

One citation per rule, in the test name — that is where whoever broke the rule reads:

| ID                   | File                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| `RN-0001`            | `test/config/ownership.test.ts` (two owners for the same prefix is an error) |
| `RN-0002`            | `test/checks/ci1-structure.test.ts` (cadence rejected)                   |
| `RN-0003`, `RN-0007` | `test/checks/ci2-ids.test.ts` (duplicate, retired, dangling citation)    |
| `RN-0004`, `RN-0006` | `test/hooks/hk1-append-only.test.ts`                                     |
| `RN-0005`            | `test/hooks/hk3-state-promotion.test.ts`                                 |
| `RNF-0001`           | `test/hooks/lib/*.test.ts` and the unreadable-configuration case in `hk1` |
| `RNF-0003`           | `test/core/roots.test.ts` and `test/acceptance/consumer-repo.test.ts`    |
| `RF-0001`            | `test/cli/validate.test.ts`                                              |
| `RF-0002`            | `test/cli/init.test.ts`                                                  |
| `RF-0003`            | `test/cli/init.test.ts` (`--stage` cases)                                |

Example:

```typescript
test('RN-0002: a trigger with a cadence is rejected naming the field', () => { … });
```

- [ ] **Step 8: STOP — promotion to `active` is human**

The requirements are born `draft`. While they are `draft`, `CI-3` rule 7 does **not**
charge them (it only looks at `active`), and the repository passes. Ask a
person for the promotion; `HK-3` will ask. Once promoted, `validate` starts requiring the
citation of each one — and that is where Step 7 proves itself.

- [ ] **Step 9: Verify**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate; echo "exit=$?"
```

Expected: `exit=0` with the requirements in `draft`; and `exit=0` also after they are promoted, because Step 7 closed the coverage. If any `active` `RN` reports a missing citation, **the right thing is to add the citation**, not to relax `cited-by`.

- [ ] **Step 10: Commit**

```bash
git add docs CODEOWNERS test
git commit -m "docs(RN-0001..RN-0007, RNF-0001..RNF-0003, RF-0001..RF-0003): toolkit requirements cited by tests"
```

---

### Task 13: Closing — README, spec coverage and the backlog

**Objective:** leave the repository telling the truth about what it is now, and the next plan with input instead of archaeology.

- [ ] **Step 1: `README.md`**

Rewrite the affected sections:

````markdown
## Usage

```bash
docker compose up -d                    # dogfooding: validates this very repository
./bin/living-docs init --stage solo     # creates the frame (SK-0)
./bin/living-docs validate              # runs CI-1, CI-2 and CI-3
```
````

To validate **another** project — the toolkit source and the validated repository are
distinct roots (`ADR-0003`):

```bash
LIVING_DOCS_TARGET=/path/to/project docker compose up -d
./bin/living-docs init --stage small-team --owner @team
./bin/living-docs validate
```

Development:

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

## Claude Code plugin

`plugin/` brings the skills `decision-recorder` (`/adr`, `/open-decision`, `/debt`),
`living-docs-bootstrap` (`/docs-setup`) and `requirements-keeper` (no command: it is
selected by the `description`), and the hooks `HK-1` (blocks editing a frozen
item) and `HK-3` (state promotion requires a human act). The hooks fail
open: with the container stopped, they block nothing — the enforcement that
survives that is the CI.

## What is out

`SK-1`, `SK-2`, `SK-5`–`SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-4`–`HK-7`,
`CI-4`–`CI-8`, `CM-4`, `CM-5`, `CM-7` — Phases 3 to 7 of the spec. What is missing and in
what order: `docs/superpowers/plans/BACKLOG-phases-3-7.md`.

````

The **"Limitations of this phase"** section of the current README — the one that describes the single root — goes out entirely: it stopped being true with `ADR-0003`. Leaving an expired limitation in the README is the same disease `AG-1` looks for ("lying doc").

- [ ] **Step 2: Update the coverage table of the Phases 0–1 plan**

In `docs/superpowers/plans/2026-08-24-living-docs-toolkit-core.md`, the §8 row said "Partial — bidirectional pairs are `CI-3`, Phase 2". Mark it as covered by this plan, with the link. An old plan that keeps declaring an already-resolved pending item is the same lie, in another file.

- [ ] **Step 3: Write `docs/superpowers/plans/BACKLOG-phases-3-7.md`**

The content is in the final section of this plan ("What is left for the next plan"). Copy it to the file, which is the input of whoever writes the next plan.

- [ ] **Step 4: Run everything**

```bash
docker compose down && docker compose up -d --build
docker compose exec toolkit npm ci
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate; echo "exit=$?"

LIVING_DOCS_TARGET=/tmp/foreign-project docker compose up -d
./bin/living-docs init --stage small-team --owner @someone
./bin/living-docs validate; echo "exit=$?"
docker compose down && docker compose up -d
````

Expected: everything green; `exit=0` in both repositories; no new file in the toolkit checkout after the test with the foreign project.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/plans
git commit -m "docs: README and spec coverage after ADR-0003 and Phase 2; backlog of Phases 3-7"
```

---

## Spec coverage and what was left out

| Spec piece                                                       | Where                                                  | Status                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| §3 `collection: sections` (granularity "sections with an ID")    | Task 6                                                 | Implemented                                                                       |
| §3 `.ownership.yml` as the only extension point (`field-map`)    | Task 5                                                 | Implemented                                                                       |
| §4 Requirement lifecycle (`draft → active → revoked`)            | Task 7                                                 | Implemented                                                                       |
| §4 "No agent promotes state on its own" for requirements         | Task 7 (`HUMAN_PROMOTIONS`), Task 6 (`HK-3` in sections) | Implemented                                                                     |
| §4 "No terminal state allows editing the body"                   | Task 7                                                 | **Partial** — per file, not per section; `TDR-0001`                               |
| §5 `SK-4` requirements-keeper                                    | Task 10                                                | Implemented                                                                       |
| §8 Pairs closed on both sides                                    | Task 9 (`CI-3` rules 1–5)                              | Implemented                                                                       |
| §8 Every `active` `RN` cited in `cited-by`                       | Tasks 8, 9 (rule 7)                                    | Implemented                                                                       |
| §8 `accepted` ADR cites at least one item                        | Task 9 (rule 6)                                        | Implemented                                                                       |
| §9 `CI-3` traceability                                           | Task 9                                                 | Implemented                                                                       |
| §10 Phase 2                                                      | Tasks 5–12                                             | Implemented                                                                       |
| §10 Maturity stages (`SK-0` step 2)                              | Task 11                                                | **Partial** — `solo` and `small-team`; `production` and `multi-team` require Phases 5–7 |
| §11 Authoring conventions for `SK-4`                             | Task 10 (with a test over all skills)                  | Implemented                                                                       |
| §12 Acceptance criterion 4 (behavior without a rule → `DA` and stops) | `SK-4` procedure 2 and boundaries                 | Declared in the skill; remains not assertable by a unit test                      |
| — `DA-0001` (single toolkit/repo root)                           | Tasks 1–4                                              | Resolved by `ADR-0003`, verified by test                                          |

**Deliberately out of this plan**, each with its own plan: `SK-1`
charter-keeper, `SK-2` glossary-keeper, `SK-5` contract-keeper, `SK-6`
working-agreements-keeper, `SK-7` release-historian, `AG-1`
docs-divergence-auditor, `AG-2` decision-adversary, `HK-2` (generated artifact),
`HK-4` (owning doc reminder), `HK-5` (`git commit` with a pending doc), `HK-6`
(inventory at `SessionStart`), `HK-7` (shortcut without a TDR), `CI-4` staleness, `CI-5`
contract drift, `CI-6` changelog required, `CI-7` ownership coverage, `CI-8`
links, `CM-4` `/term`, `CM-5` `/docs-audit`, `CM-7` `/release`.

## What is left for the next plan

This is the input of `docs/superpowers/plans/BACKLOG-phases-3-7.md` (Task 13, Step 3).

### Phase 3 — tie doc to the PR (mechanism 1)

`SK-6` working-agreements-keeper (`CONTRIBUTING.md`, `docs/definition-of-done.md`,
`CLAUDE.md`), `HK-4` (`PostToolUse` → injects the doc that owns the watched path) and
`HK-5` (`PreToolUse` on `git commit` → asks when the staged set touches a watched path
without the owning doc).

**Depends on:** `watches` ceasing to be `[]` in `.ownership.yml` — today the field is
read and validated, and no rule fills it. It is the first work of the phase.
**Engine piece that is missing:** a `src/config/watches.ts` that answers "which docs
this set of paths requires", used by both hooks and, in Phase 7, by `CI-7`.
**Known risk:** `HK-5` intercepts `Bash`, not `Edit|Write` — it is the first
hook with a different matcher, and the current `run-hook.sh` passes the raw payload without
distinguishing the event. Check the `PreToolUse` contract for `Bash` first.
**Acceptance criterion of spec §12 that the phase closes:** no. 5.

### Phase 4 — language and intent

`SK-2` glossary-keeper (`docs/glossary.md`, `CM-4` `/term`), `SK-1` charter-keeper
(`docs/charter/constitution.md`, `vision.md`) and `AG-2` decision-adversary.

**Depends on:** `collection: table` for the glossary (already exists) and on a
`banned`/`renamed` state in the state machine — spec §4 defines them for a term.
**Engine piece that is missing:** none large; it is mostly skill authoring.
`AG-2` is the first agent, so it is also the first time the plugin declares
`agents/` — check the format before planning.
**Note:** the Constitution requires "every principle has a named enforcement".
That is a skill rule, not a check — resist inventing `CI-9` to measure it.

### Phase 5 — generated contracts

`SK-5` contract-keeper, `HK-2` (blocks editing a generated artifact) and `CI-5`
(regenerating produces diff ≠ 0).

**Depends on:** `generated[]` in `.ownership.yml` ceasing to be `[]`, and on a real
generator existing. **This repository has no generated contract at all** — the
dogfooding of the phase needs to invent a real target (for example, generating the
checks table of the README from `src/checks/registry.ts`) or the phase is left without proof.
**Engine piece that is missing:** `CI-5` needs to **run** the generator's command
inside the container and compare the output — it is the first check that runs a subprocess,
and the first that may be slow. It is worth deciding by ADR whether it runs in `validate`
or in a separate subcommand.
**Acceptance criterion of spec §12 that the phase closes:** no. 6.

### Phase 6 — historical trail

`SK-7` release-historian (`CHANGELOG.md`, `docs/releases/`, `docs/deprecations.md`,
`docs/migrations/`), `CI-6` (changelog required) and `HK-7` (new shortcut without a TDR).

**Depends on:** `consumer-visible-paths` filled in, and on `CI-6` being able to read the
**diff** — it is the first check that is not content with the state of the tree.
Decide by ADR where the diff comes from (`git diff` against the PR base) and how this
behaves outside CI.
**Engine piece that is missing:** `src/git/diff.ts`, and the exception label that spec
§5 (`SK-7`, rule 2) mentions without defining the format — that is a `DA` to open.
**Note:** `HK-7` is `additionalContext`, never `deny` — a legitimate shortcut
cannot be blocked (spec §7).

### Phase 7 — continuous maintenance

`AG-1` docs-divergence-auditor (`CM-5` `/docs-audit`), `HK-6` (inventory at
`SessionStart`), `CI-4` (staleness — the **only** check authorized to just warn),
`CI-7` (ownership coverage) and `CI-8` (links).

**Depends on:** everything above; it is the phase that closes acceptance criteria 7 and 8 of
spec §12.
**Engine piece that is missing:** `CI-4` needs "today" — and the toolkit today has
no injectable date source, which makes the check impossible to test
deterministically. Plan a `CheckContext.today` **before** writing
`CI-4`. `CI-8` needs a relative-link resolver and the rule "binary attachment
under `docs/` fails" (spec §13).
**Note:** `CI-7` includes "agent contract repeating text from an owning
artifact" — textual duplication detection, which is the only check in the spec with a real
risk of false positives. An ADR on the threshold is worthwhile before implementing.

### Inherited debts and open decisions

- **`TDR-0001`** — `HK-1` does not freeze a revoked section inside a collection
  file. Payment trigger: the first PR that revokes a requirement.
- **`ADR-0001` and `ADR-0002` remain `draft`.** No ADR in this repository has been
  accepted by a person so far. While they are in `draft`, `CI-3` rule 6
  does not charge them; when accepting them, `relates-to` must already be filled in, because
  `accepted` is frozen and `relates-to` is not in `mutable-fields`.
- **Toolkit distribution.** `ADR-0003` decides the two roots and does **not** decide
  how the toolkit reaches a consumer project (clone? published image? package?).
  It is worth opening a `DA` at the first real consumer.
- **`--stage production` and `--stage multi-team`** do not exist because the phases
  they would install do not exist. Add each stage together with its phase, not
  before: a stage that installs an empty frame is the "dead wiki" being born at the factory.
