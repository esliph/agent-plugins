# Phase 5 of the living documentation toolkit — generated contracts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `SK-5` contract-keeper, `HK-2` (blocks editing a generated
artifact) and `CI-5` (regenerating produces diff ≠ 0) — Phase 5 of the spec (§10), which
closes acceptance criterion 6 (§12) and opens the `production` stage.

**Architecture:** Three new engine pieces, all small.
`src/exec/command.ts` brings an injectable `CommandRunner` — the sibling of Phase 3's
`GitRunner`, with one deliberate difference: it does **not** fail open, because a
generator that does not run is a finding, not silence. `src/checks/ci5-contract-drift.ts`
runs the command of each `generated[]` entry and compares the **standard output**
with the file on disk. `src/hooks/hk2-generated-artifact.ts` is the fifth hook,
in the same mold as `HK-1`. `CI-5` does **not** go into `living-docs validate`: it
runs in a subcommand of its own, `living-docs drift` — it is the only check that runs
a command declared by the repository being validated, and the only one that can be slow
(`ADR-0005`).

The dogfooding is real: this repository gets a truly generated contract,
`docs/contracts/checks.gen.md`, produced from
`src/checks/registry.ts`. Without it the phase would have no proof at all — the backlog
already warned about that.

**Tech Stack:** TypeScript (Node ≥ 24, run only in a container —
`RNF-0002`), `node:test`, `node:child_process` (`execSync`), Claude Code plugin
(`SKILL.md`, `hooks.json`).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §2 (generated marker), §3 (layout
of `docs/contracts/`, `generated[]`), §5 (`SK-5`), §7 (`HK-2`), §9 (`CI-5`),
§10 (Phase 5), §12 (criterion 6) —
`docs/superpowers/plans/BACKLOG-phases-3-7.md` (section "Phase 5") carries the
survey that this plan resolves.

## Global Constraints

- Nothing runs on the host except Docker — every command via
  `docker compose exec toolkit …` or `./bin/living-docs` (`RNF-0002`).
- Identifiers, file names and IDs in English/neutral; prose in
  Portuguese (spec §11).
- An ID is never recycled — check `docs/ids-retired.txt` before taking a new
  number (spec §2). The free numbers in this phase: `ADR-0005`, `RF-0006`,
  `RF-0007`, `RN-0012`.
- Every requirement section is born `status: draft`; every new ADR is born
  `status: draft`. Promoting is a human act (`RN-0005`) — `HK-3` intercepts, and the
  answer is not yours.
- The commit message cites the affected ID, format `type(ID): subject`
  (`CONTRIBUTING.md`).
- A hook fails open within 5 s, no network (`RNF-0001`). `CI-5` does **not** fail
  open: a check is the enforcement that survives an absent agent, and a broken generator
  has to show up.
- `docs/contracts/errors.md` and `docs/contracts/versioning-policy.md` do **not**
  go into `artifacts:` in `.ownership.yml` — the same treatment that
  `CONTRIBUTING.md`, the DoD, the glossary and the charter already get (`ADR-0004`).
  `DA-0002` stays open; no task in this plan resolves it.
- `init` **does not invent a generator**, for the same reason it does not invent `watches`
  (`RF-0004`): an empty frame teaches people to ignore the mechanism.
- A generator is **deterministic**: no date, no machine path, no counter in the
  output. A generator that prints "generated on `<today>`" produces drift on
  every run and switches `CI-5` off on the second day.

### `HK-5` will ask — read before committing any task

`docs/.ownership.yml` has had `watches` filled in since Phase 3. Three entries
hit the commits in this plan:

| Watched path       | Owner doc required in the same commit                                                | Affected tasks |
| ------------------ | ------------------------------------------------------------------------------------ | -------------- |
| `src/hooks/**`     | `docs/requirements/rules.md`                                                         | 2              |
| `src/checks/**`    | `docs/requirements/rules.md` (+ `docs/contracts/checks.gen.md` from Task 4 on)       | 3, 4           |
| `src/cli/**`       | `docs/requirements/functional.md`                                                    | 3, 5           |
| `plugin/skills/**` | `CONTRIBUTING.md`                                                                    | 7              |

`HK-5` **asks** (`ask`), never denies (`RN-0009`) — but the question arrives, and
answering in the dark is the habit the hook exists not to teach. Each affected task
carries an **`HK-5`** block saying what to answer and why. In Tasks 2,
3, 4 and 5 the answer is the same: the owner doc traveled in Task 1, with the rule that
that code implements — it is the order that `CONTRIBUTING.md` §"The cycle" demands.
In Task 7 it is "yes, it is together".

### `HK-2` will deny — and that is how you know it works

From Task 4 on, `docs/contracts/checks.gen.md` is declared in
`generated[]`. **Do not use `Edit` or `Write` on that file at any moment** —
`HK-2` denies, and that denial is acceptance criterion 6 happening. Every time
the file needs to change, the way is to regenerate:

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
```

The redirect happens **inside** the container on purpose: the host shell
would rewrite the file's encoding on Windows, and one extra CR would become
contract drift.

---

## Spec coverage

| Piece                                                               | Task |
| ------------------------------------------------------------------- | ---- |
| `ADR-0005` — generator contract (stdout) and where `CI-5` runs      | 1    |
| `HK-2` (`PreToolUse`/`Edit\|Write`, `deny`)                         | 2    |
| `CI-5` (contract drift) + `CommandRunner`                           | 3    |
| `living-docs drift` + pointer in `validate`                         | 3    |
| Real generator + `docs/contracts/checks.gen.md` + `generated[]`     | 4    |
| `init --stage production` + contract templates                      | 5    |
| `docs/contracts/errors.md`, `versioning-policy.md` (of this repo)   | 6    |
| `SK-5` contract-keeper                                              | 7    |
| Acceptance criterion 6 + indexes (README, `CLAUDE.md`, DoD, workflow) | 8  |
| Human promotion                                                     | 9    |

**Acceptance criterion 6 of spec §12** — "given a generated contract, when someone
edits it by hand, then `HK-2` denies — and, if it gets through outside the agent, `CI-5` fails"
— is closed **entirely** by this phase, unlike criterion 5 (which Phase 3
closed by half). Both halves exist here: the hook in Task 2, the check in
Task 3, and the test that exercises both in Task 8.

No new command (`CM-n`): spec §10 gives `SK-5` no command. The skill is
selected by its `description`, like `requirements-keeper` and
`working-agreements-keeper`.

---

### Task 1: The rule before the code — `ADR-0005`, `RF-0006`, `RF-0007`, `RN-0012`

**Goal:** Before any code, record the decision that the backlog
left open (the generator contract and where `CI-5` runs) and the three
requirements that the rest of the plan implements — in `draft`, for human promotion
in Task 9.

**Files:**

- Create: `docs/decisions/adr/ADR-0005-generator-contract-and-where-ci5-runs.md`
- Modify: `docs/requirements/functional.md` (`RF-0006`, `RF-0007`)
- Modify: `docs/requirements/rules.md` (`RN-0012`)

**Interfaces:**

- Produces: the IDs `ADR-0005`, `RF-0006`, `RF-0007`, `RN-0012`, cited by the
  code and by the tests of Tasks 2–8.

**Requirements:**

- All four are born in the machine's initial state (`draft`) — promotion is
  Task 9, and it is human (`RN-0005`).
- `ADR-0005` does not resolve `DA-0002` and does not mention it as resolved.
- `relates-to` of `ADR-0005` is born already filled in: `accepted` freezes the file,
  and `relates-to` is not in `mutable-fields` — an accepted ADR with
  `relates-to: []` can only be fixed by superseding.

- [ ] **Step 1: Write `ADR-0005` in `draft`**

Create `docs/decisions/adr/ADR-0005-generator-contract-and-where-ci5-runs.md`:

```markdown
---
id: ADR-0005
title: The generator prints to standard output, and CI-5 runs in a subcommand of its own
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-25
relates-to: [RF-0006, RN-0012]
supersedes: null
superseded-by: null
---

# ADR-0005 — The generator prints to standard output, and CI-5 runs in a subcommand of its own

## Context

Phase 5 (spec §10) delivers `CI-5`: "regenerating the contract produces diff ≠ 0"
(§9). `.ownership.yml` has declared the shape of the configuration since Phase 0 —
`generated: [{ path, command }]` — but never said **what `command` does**, and
`generated` has been empty in every repository until today.

Two questions were left open, and both change the engine:

1. Does the command **write the file** or **print the content**? It is the contract
   that every consuming project will have to fulfill.
2. Does `CI-5` run inside `living-docs validate`, together with `CI-1`–`CI-3`, or
   in a separate subcommand? `CI-5` is the first check that runs a subprocess —
   and the command it runs comes from the **validated** repository, not from the toolkit.

## Alternatives considered

**The generator writes the file and `CI-5` compares with `git diff --exit-code`.**
This is how most generators on the market work (OpenAPI, protobuf, ORM).
Rejected: the check would **rewrite the file it is checking**, which
erases the evidence at the very instant it reports it — whoever reads the failure in
CI can no longer see the old content. Besides, it ties `CI-5` to `git`
(clean tree, `safe.directory`, initialized repository), and a check that
depends on the state of the tree is not reproducible locally.

**`CI-5` inside `validate`, together with the others.** It is harder to
forget, and spec §9 lists the eight checks side by side. Rejected in this phase:
`validate` today only **reads** files, and `runValidate` is called in-process by the
test suite. Starting to run an arbitrary command declared by the
target repository changes the nature of the command — an agent that validates a
freshly cloned repository would start running its code without asking anyone —
and makes the suite depend on the environment.

**`CI-5` only when a flag asks for it (`validate --generated`).** Rejected: a
flag nobody types is a check that never runs, with the aggravating factor of looking
installed.

**The generator prints to standard output and writes nothing; `CI-5` compares the output
with the file on disk; `CI-5` runs in `living-docs drift`. Chosen.**

## Decision

1. `generated[].command` **prints the artifact's expected content to standard output
   and writes no file at all.** `CI-5` captures that output and compares it
   with the versioned file.
2. The comparison normalizes `\r\n` to `\n` and trims the trailing line breaks.
   CR comes from the checkout, not from the generator; one extra trailing line break is
   a shell redirect. Any other difference is drift.
3. `CI-5` is **not** in the list of `living-docs validate`. It runs in
   `living-docs drift`, the only subcommand that runs a command from the
   validated repository.
4. `validate` does not stay silent about it: when `generated[]` is not
   empty, it prints a line saying that contract drift is checked by
   `living-docs drift`. It is a pointer, not a finding — it does not change the exit code.
5. A generator that fails (exit ≠ 0, timeout) and a declared artifact that is missing
   are findings of `error` severity, not silence. `CI-5` does not fail open: that
   is the policy of the **hooks** (`RNF-0001`), and a check that goes quiet when the
   generator breaks lies with the authority of one that passed.

## Consequences

### What is gained

- `CI-5` is a pure function of (command, file) → findings: no git, no
  tree mutation, testable with a fake executor.
- `validate` remains what it always was — reading — and remains callable
  in-process by the suite with no side effect.
- The generator contract is a sentence that fits in a template: "print the content,
  do not write the file".

### What is accepted as lost

- Market generators that only write files need a wrapper that
  generates into a temporary directory and prints the result. It is extra work for
  whoever installs, and it is stated in the comment of `templates/ownership.yml`.
- A project may never run `living-docs drift` and not notice. The mitigation is
  social and not automatic: this repository's workflow runs it, the Definition of
  Done names `CI-5`, and `validate` points to the subcommand when there is something to check.
- `CI-5` runs a command declared by the validated repository. It remains
  third-party code execution — what changes is that it happens in a command
  that the person typed on purpose, not as a side effect of `validate`.
```

- [ ] **Step 2: Add `RF-0006` and `RF-0007` in `draft`**

At the end of `docs/requirements/functional.md`, after `RF-0005`:

```markdown
## RF-0006 — `living-docs drift` compares the generated artifact with the generator's output

- **status:** draft
- **relates-to:** ADR-0005
- **out of scope:** generating the artifact — `drift` compares, never writes

For each `generated[]` entry in `.ownership.yml`, `living-docs drift`
runs `command`, compares the standard output with the file at `path` and exits with
code 1 if there is a difference, if the generator fails, or if the declared file
does not exist. With no entry declared, it says so and exits with 0.

`living-docs validate` does not run this comparison; when a generated artifact
is declared, it points to the subcommand that does.

## RF-0007 — `init --stage production` installs the contracts frame

- **status:** draft
- **relates-to:** RF-0005
- **out of scope:** declaring the generator — `generated[]` is born empty, with a
  commented example, for the same reason `watches` is born empty (`RF-0004`)

In the `production` stage, `living-docs init` creates, besides everything that
`small-team` creates, `docs/contracts/errors.md` and
`docs/contracts/versioning-policy.md` from the templates, with the same
idempotence and the same adoption policy as the other artifacts.

The stage declares what it does not install yet: Phase 6 of spec §10 belongs to
`production` and does not exist in this version.
```

- [ ] **Step 3: Add `RN-0012` in `draft`**

At the end of `docs/requirements/rules.md`, after `RN-0011`:

```markdown
## RN-0012 — A generated artifact is not edited: change the source

- **status:** draft
- **relates-to:** ADR-0005
- **out of scope:** what the source of each generated artifact is, which is
  project configuration and lives in `generated[].command`

An artifact declared in `generated[]`, or one that carries the marker
`generated: do not edit`, only changes by running the generator. A hand edit
survives until the next run and lies until then — with the aggravating factor of looking
like truth signed by a tool.

What is written by hand is the policy around the contract — versioning,
deprecation, error catalog —, never the contract.
```

- [ ] **Step 4: Run validate and confirm that `draft` passes clean**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "exit=$?"
```

Expected: `exit=0`. It is `draft` that buys this: `RF-0006`, `RF-0007` and
`RN-0012` are not yet `active`, so rule 7 of `CI-3` (coverage by
citation) does not charge them, and no test mentions them until Tasks 2–5.
`ADR-0005` passes because rule 6 (`accepted` without `relates-to`) only looks at an
accepted item.

`CI-2` **is** exercised, and that is what matters to check: `ADR-0005` closes the sequence
of the `ADR` prefix (0001–0005), `RF-0006`/`RF-0007` close the `RF` one, `RN-0012` the
`RN` one; and the citations to `RF-0006`, `RN-0012` and `ADR-0005` must resolve.
Mentions such as `CI-5`, `HK-2` or `SK-5` are ignored: the citation pattern requires
3 or 4 digits (`src/ids/citations.ts`).

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0005-generator-contract-and-where-ci5-runs.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0005, RF-0006, RF-0007, RN-0012): the Phase 5 rule in draft"
```

---

### Task 2: `HK-2` — deny editing a generated artifact

**Goal:** Implement `RN-0012` at the cheapest point: the hook that denies the
edit at the instant it is attempted, naming the source and the
generator's command.

**Files:**

- Create: `src/hooks/hk2-generated-artifact.ts`
- Create: `test/hooks/hk2-generated-artifact.test.ts`
- Modify: `plugin/hooks/hooks.json`
- Modify: `test/plugin/manifest.test.ts`

**Interfaces:**

- Consumes: `loadOwnership`, `GeneratedRule` (`src/config/ownership.ts`);
  `toRepoPath` (`src/hooks/lib/paths.ts`); `denyOutput`, `emit`, `hookEnv`,
  `readPayload`, `HookEnv`, `HookPayload` (`src/hooks/lib/io.ts`).
- Produces:
  - `export type Hk2Decision = { action: 'allow' } | { action: 'deny'; reason: string }`
  - `export function decideHk2(payload: HookPayload, env: HookEnv): Hk2Decision`
  - `export function findGeneratedRule(rules: readonly GeneratedRule[], repoPath: string): GeneratedRule | null`

**Requirements:**

- It denies through **two** independent routes: the path is in `generated[]`, or the
  file carries the marker `generated: do not edit` (spec §2). The second route
  exists because, without it, it would be enough not to declare the artifact in order to edit it.
- It denies even when the file **does not exist**, if the path is declared:
  creating a generated artifact by hand is exactly what the rule forbids. `HK-1`
  allows creating a new item because there the item is born from people; here, from a generator.
- It fails open (`RNF-0001`): unreadable configuration, path outside the
  repository, payload without `file_path` → `allow`.
- The message names the originating rule, the owning artifact, the generator's command and
  the skill (spec §7).

- [ ] **Step 1: Write the failing test**

Create `test/hooks/hk2-generated-artifact.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideHk2 } from '../../src/hooks/hk2-generated-artifact.ts'
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { HookEnv } from '../../src/hooks/lib/io.ts'
import type { Hk2Decision } from '../../src/hooks/hk2-generated-artifact.ts'

/** Typed narrowing: without this, `decision.reason` does not exist for TypeScript. */
function assertDeny(decision: Hk2Decision): asserts decision is { action: 'deny'; reason: string } {
  assert.equal(decision.action, 'deny')
}

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/openapi.gen.yaml
    command: "node tools/gen-openapi.js"
`

const GENERATED = 'docs/contracts/openapi.gen.yaml'

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): Hk2Decision {
  let decision: Hk2Decision = { action: 'allow' }
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, root => {
    const env: HookEnv = { root, hostRoots: [root] }
    decision = decideHk2({ tool_name: 'Edit', tool_input: toolInput }, env)
  })
  return decision
}

test('RN-0012: denies editing an artifact declared in generated[] — acceptance criterion 6', () => {
  const decision = decide({ [GENERATED]: 'openapi: 3.1.0\n' }, { file_path: GENERATED, old_string: '3.1.0', new_string: '3.0.0' })
  assertDeny(decision)
  assert.match(decision.reason, /node tools\/gen-openapi\.js/, 'the message must name the generator command')
  assert.match(decision.reason, /contract-keeper/, 'the message must name the owning skill')
  assert.match(decision.reason, /openapi\.gen\.yaml/)
})

test('RN-0012: denies hand-creating the generated artifact that does not exist yet', () => {
  const decision = decide({}, { file_path: GENERATED, content: 'openapi: 3.1.0\n' })
  assertDeny(decision)
})

test('RN-0012: the marker holds on its own — file not declared, but self-declared as generated', () => {
  const file = 'docs/contracts/errors.gen.md'
  const decision = decide({ [file]: '<!-- generated: do not edit -->\n\n# Errors\n' }, { file_path: file, old_string: '# Errors', new_string: '# Errors!' })
  assertDeny(decision)
  assert.match(decision.reason, /generated\[\]/, 'the message must ask for the missing declaration')
})

test('the marker only counts at the top of the file — prose about the subject does not freeze a doc', () => {
  const file = 'docs/requirements/rules.md'
  const body = `${'line of prose\n'.repeat(400)}the marker \`generated: do not edit\` is from spec §2\n`
  const decision = decide({ [file]: body }, { file_path: file, content: 'something else' })
  assert.equal(decision.action, 'allow')
})

test('an ordinary path passes — HK-2 only knows what is generated', () => {
  assert.equal(decide({ 'src/index.ts': 'x' }, { file_path: 'src/index.ts', content: 'y' }).action, 'allow')
})

test('RNF-0001: fails open — unreadable .ownership.yml allows', () => {
  let decision: Hk2Decision = { action: 'deny', reason: 'should not' }
  withTempRepo({ [GENERATED]: 'openapi: 3.1.0\n' }, root => {
    decision = decideHk2(
      {
        tool_name: 'Write',
        tool_input: { file_path: GENERATED, content: 'x' },
      },
      { root, hostRoots: [root] },
    )
  })
  assert.equal(decision.action, 'allow')
})

test('payload without file_path allows', () => {
  assert.equal(decide({ [GENERATED]: 'x' }, { content: 'y' }).action, 'allow')
})

test('accepts an absolute host file_path', () => {
  let decision: Hk2Decision = { action: 'allow' }
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, [GENERATED]: 'openapi: 3.1.0\n' }, root => {
    decision = decideHk2(
      {
        tool_name: 'Write',
        tool_input: {
          file_path: `${root}/${GENERATED}`,
          content: 'x',
        },
      },
      { root, hostRoots: [root] },
    )
  })
  assert.equal(decision.action, 'deny')
})

test('a directory declared in generated[] covers what is inside it', () => {
  const config = CONFIG.replace('path: docs/contracts/openapi.gen.yaml', 'path: docs/contracts/gen/')
  let decision: Hk2Decision = { action: 'allow' }
  withTempRepo({ [OWNERSHIP_PATH]: config }, root => {
    decision = decideHk2(
      {
        tool_name: 'Write',
        tool_input: {
          file_path: 'docs/contracts/gen/schema.json',
          content: '{}',
        },
      },
      { root, hostRoots: [root] },
    )
  })
  assert.equal(decision.action, 'deny')
})
```

And, in `test/plugin/manifest.test.ts`, update the two tests that count hooks.
Replace the `esperado` object and the final count:

```typescript
const esperado: Record<string, string[]> = {
  'PreToolUse:Edit|Write': ['hk1-append-only', 'hk2-generated-artifact', 'hk3-state-promotion'],
  'PreToolUse:Bash': ['hk5-commit-guard'],
  'PostToolUse:Edit|Write': ['hk4-watch-reminder'],
}
```

```typescript
assert.equal(vistos, 5, 'the scan should see the five hooks of Phases 1, 3 and 5')
```

Also rename the title of the first one: `'hooks.json registers the five hooks on the
events and matchers of spec §7'`.

- [ ] **Step 2: Run and confirm it fails**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0012|marker|HK-2|hooks"
```

Expected: FAIL — `src/hooks/hk2-generated-artifact.ts` does not exist (import
error in the new test file) and `hooks.json` still registers four hooks.

- [ ] **Step 3: Write `src/hooks/hk2-generated-artifact.ts`**

```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): denies editing a generated artifact.
 *
 * Originating rule: LIVING-DOCUMENTATION-TOOLKIT.md §5 (SK-5, rule 1) — "if it
 * can be generated, do not write it". The path comes from `generated[]` in
 * docs/.ownership.yml, or from the marker that the file itself carries (§2).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadOwnership } from '../config/ownership.ts'
import type { GeneratedRule } from '../config/ownership.ts'
import { toRepoPath } from './lib/paths.ts'
import { denyOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type Hk2Decision = { action: 'allow' } | { action: 'deny'; reason: string }

const ALLOW: Hk2Decision = { action: 'allow' }

/**
 * Marker from spec §2. Only the top of the file counts: further down, the same sentence is
 * prose **about** the marker — like this very line.
 */
const MARKER = /generated:\s*do not edit/i
const MARKER_WINDOW = 4096

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** `generated[]` rule that covers this path; a directory covers what is inside it. */
export function findGeneratedRule(rules: readonly GeneratedRule[], repoPath: string): GeneratedRule | null {
  const target = normalize(repoPath)
  for (const rule of rules) {
    const declared = normalize(rule.path)
    if (declared.endsWith('/') ? target.startsWith(declared) : target === declared) return rule
  }
  return null
}

export function decideHk2(payload: HookPayload, env: HookEnv): Hk2Decision {
  const filePath = payload.tool_input?.file_path
  if (typeof filePath !== 'string') return ALLOW

  const repoPath = toRepoPath(filePath, env.hostRoots)
  if (repoPath === null) return ALLOW

  let config
  try {
    config = loadOwnership(env.root)
  } catch {
    return ALLOW // fails open (RNF-0001)
  }

  // A declared path denies even with the file absent: hand-creating what a
  // generator produces is exactly what RN-0012 forbids.
  const rule = findGeneratedRule(config.generated, repoPath)
  if (rule) {
    return {
      action: 'deny',
      reason:
        `HK-2 blocked: \`${repoPath}\` is a generated artifact, declared in \`generated[]\` in docs/.ownership.yml. ` +
        'Originating rule: LIVING-DOCUMENTATION-TOOLKIT.md §5 (SK-5, rule 1) — if it can be generated, it is not written; ' +
        'a hand edit lives until the next run of the generator and lies until then. ' +
        `Valid path: change the annotated source and run \`${rule.command} > ${rule.path}\`. ` +
        'Owning skill: contract-keeper; `living-docs drift` (CI-5) checks the drift in the PR.',
    }
  }

  let head: string
  try {
    head = readFileSync(join(env.root, repoPath), 'utf8').slice(0, MARKER_WINDOW)
  } catch {
    return ALLOW // a file that does not exist carries no marker
  }
  if (!MARKER.test(head)) return ALLOW

  return {
    action: 'deny',
    reason:
      `HK-2 blocked: \`${repoPath}\` opens with the marker \`generated: do not edit\` (spec §2). ` +
      'Originating rule: LIVING-DOCUMENTATION-TOOLKIT.md §5 (SK-5, rule 1) — what is generated changes through the source, not through the file. ' +
      'Valid path: change the annotated source and run the generator. ' +
      'This file is not in `generated[]` in docs/.ownership.yml — declare it there, with the generator command, ' +
      'so that `CI-5` (`living-docs drift`) also covers it. Owning skill: contract-keeper.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()
  if (!payload) return // fails open
  const decision = decideHk2(payload, hookEnv())
  emit(decision.action === 'deny' ? denyOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('hk2-generated-artifact.ts')) {
  main().catch(() => process.exit(0)) // fails open, always
}
```

- [ ] **Step 4: Register the hook in `plugin/hooks/hooks.json`**

In the `PreToolUse` / `Edit|Write` group, between `hk1-append-only` and
`hk3-state-promotion`:

```json
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk2-generated-artifact",
            "shell": "bash",
            "async": false
          },
```

`run-hook.sh` **does not change**: it receives the hook name as an argument and invokes
one file per hook. Do not "improve" the wrapper for free — it is where the fail-open lives.

- [ ] **Step 5: Run and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

- [ ] **Step 6: Commit**

**`HK-5`:** this commit touches `src/hooks/**`, which `watches` links to
`docs/requirements/rules.md`. The hook will ask. The answer is **yes, go
ahead**: the owner doc traveled in the previous commit (Task 1), with the very
`RN-0012` that this hook implements — the order that `CONTRIBUTING.md` §"The cycle"
demands. Say this to the person answering; do not answer for them.

```bash
git add src/hooks/hk2-generated-artifact.ts test/hooks/hk2-generated-artifact.test.ts plugin/hooks/hooks.json test/plugin/manifest.test.ts
git commit -m "feat(HK-2, RN-0012): deny editing a generated artifact"
```

---

### Task 3: `CI-5` and `living-docs drift`

**Goal:** Implement `RF-0006` — the injectable executor, the check that compares
the generator's output with the file on disk, and the subcommand that runs it.

**Files:**

- Create: `src/exec/command.ts`
- Create: `src/checks/ci5-contract-drift.ts`
- Create: `src/cli/drift.ts`
- Create: `test/checks/ci5-contract-drift.test.ts`
- Create: `test/cli/drift.test.ts`
- Modify: `src/checks/registry.ts`
- Modify: `src/cli/validate.ts`
- Modify: `src/cli/index.ts`

**Interfaces:**

- Consumes: `loadOwnership`, `OwnershipConfig` (`src/config/ownership.ts`);
  `Check`, `CheckContext`, `Finding` (`src/core/types.ts`); `formatFindings`
  (`src/cli/report.ts`).
- Produces:
  - `export type CommandRunner = (command: string, cwd: string) => string`
  - `export const runCommand: CommandRunner`
  - `export function ci5ContractDrift(exec: CommandRunner): Check`
  - `export function firstDifferentLine(actual: string, expected: string): number`
  - `export function driftChecks(exec?: CommandRunner): readonly Check[]`
  - `export interface DriftResult { findings: Finding[]; checked: number; exitCode: number }`
  - `export function runDrift(root: string, exec?: CommandRunner): DriftResult`
  - `ValidateResult` gains the field `generated: number`.

**Requirements:**

- `src/core/types.ts` **does not change**. The executor is a dependency of the check, not of the
  context: `ci5ContractDrift` is a factory that receives it by closure. Without that,
  `CheckContext` would gain a field that three of the four checks ignore — and the
  tests of `CI-1`/`CI-2`/`CI-3`, which build the context by hand, would break
  for no reason.
- `CI-5` does not fail open: a generator that breaks, a missing artifact and a
  content difference are the three findings, all `error`.
- The comparison normalizes `\r\n` and the trailing line breaks, and nothing else.
- `runDrift` passes `docs: []`: `CI-5` reads no artifact at all.

- [ ] **Step 1: Write the failing tests**

Create `test/checks/ci5-contract-drift.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci5ContractDrift, firstDifferentLine } from '../../src/checks/ci5-contract-drift.ts'
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'
import type { CommandRunner } from '../../src/exec/command.ts'
import type { Finding } from '../../src/core/types.ts'

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/checks.gen.md
    command: "node tools/gen.js"
`

const GENERATED = 'docs/contracts/checks.gen.md'
const CONTENT = '<!-- generated: do not edit -->\n\n| ID |\n| --- |\n| CI-1 |\n'

function run(files: Record<string, string>, exec: CommandRunner): Finding[] {
  let findings: Finding[] = []
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, root => {
    const config = parseOwnership(CONFIG)
    findings = ci5ContractDrift(exec).run({ root, config, docs: [] })
  })
  return findings
}

test('RF-0006: a file equal to the generator output produces no finding', () => {
  const findings = run({ [GENERATED]: CONTENT }, () => CONTENT)
  assert.deepEqual(findings, [])
})

test('RF-0006: a content difference is an error, and the finding points to the first divergent line', () => {
  const findings = run({ [GENERATED]: CONTENT }, () => CONTENT.replace('CI-1', 'CI-9'))
  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'CI-5')
  assert.equal(findings[0]?.severity, 'error')
  assert.equal(findings[0]?.file, GENERATED)
  assert.equal(findings[0]?.line, 5, 'the table line that changed')
  assert.match(findings[0]?.fix ?? '', /node tools\/gen\.js/)
})

test('RF-0006: checkout CR and an extra trailing line break are not contract drift', () => {
  const findings = run({ [GENERATED]: CONTENT.replaceAll('\n', '\r\n') + '\n' }, () => CONTENT)
  assert.deepEqual(findings, [])
})

test('RF-0006: a generator that fails is an error — CI-5 does not go quiet like a hook', () => {
  const findings = run({ [GENERATED]: CONTENT }, () => {
    throw new Error('gen.js: Cannot find module')
  })
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /Cannot find module/)
})

test('RF-0006: a declared and missing artifact is an error, not silence', () => {
  const findings = run({}, () => CONTENT)
  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /missing/i)
})

test('firstDifferentLine returns 0 when there is no divergence', () => {
  assert.equal(firstDifferentLine('a\nb\n', 'a\nb\n'), 0)
  assert.equal(firstDifferentLine('a\nb\n', 'a\nc\n'), 2)
  assert.equal(firstDifferentLine('a\n', 'a\nb\n'), 2, 'an extra line in the output is also a divergence')
})
```

Create `test/cli/drift.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runDrift } from '../../src/cli/drift.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { OWNERSHIP_PATH, OwnershipError } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const BASE = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
`

const WITH_GENERATED = `${BASE}generated:
  - path: docs/contracts/checks.gen.md
    command: "node tools/gen.js"
`

test('RF-0006: with no generated artifact declared, drift exits with 0 and says it checked nothing', () => {
  withTempRepo({ [OWNERSHIP_PATH]: BASE }, root => {
    const result = runDrift(root, () => '')
    assert.deepEqual(result.findings, [])
    assert.equal(result.checked, 0)
    assert.equal(result.exitCode, 0)
  })
})

test('RF-0006: drift leads to exit 1', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: WITH_GENERATED,
      'docs/contracts/checks.gen.md': 'old\n',
    },
    root => {
      const result = runDrift(root, () => 'new\n')
      assert.equal(result.checked, 1)
      assert.equal(result.exitCode, 1)
      assert.equal(result.findings[0]?.ruleId, 'CI-5')
    },
  )
})

test('RF-0006: validate does not run the generator, and counts what it left for drift', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: WITH_GENERATED,
      'docs/contracts/checks.gen.md': 'anything\n',
    },
    root => {
      const result = runValidate(root)
      assert.equal(result.generated, 1, 'validate needs to know there is something to check elsewhere')
      assert.equal(
        result.findings.some(finding => finding.ruleId === 'CI-5'),
        false,
        'CI-5 does not run in validate (ADR-0005)',
      )
      assert.equal(result.exitCode, 0)
    },
  )
})

test('missing .ownership.yml propagates OwnershipError', () => {
  withTempRepo({ 'README.md': '' }, root => {
    assert.throws(() => runDrift(root, () => ''), OwnershipError)
  })
})
```

- [ ] **Step 2: Run and confirm they fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0006|firstDifferentLine"
```

Expected: FAIL — `src/exec/command.ts`, `src/checks/ci5-contract-drift.ts` and
`src/cli/drift.ts` do not exist.

- [ ] **Step 3: Create `src/exec/command.ts`**

```typescript
import { execSync } from 'node:child_process'

/**
 * Injectable command executor for the validated repository: the test proves `CI-5`
 * without depending on a real generator on the machine.
 *
 * Sibling of `GitRunner` (src/git/staged.ts) with one deliberate difference: this one
 * does **not** fail open. Failing open is hook policy (`RNF-0001`), where the
 * cost of silence is one fewer question; here the cost is a contract lying
 * with the authority of a check that passed. `CI-5` handles the error.
 */
export type CommandRunner = (command: string, cwd: string) => string

/** Ceiling for a generator. Generous: `CI-5` runs in the PR, not inside a hook. */
export const TIMEOUT_MS = 60_000

export const runCommand: CommandRunner = (command, cwd) =>
  execSync(command, {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    // stderr captured, not inherited: it becomes the finding's message.
    stdio: ['ignore', 'pipe', 'pipe'],
  })
```

- [ ] **Step 4: Create `src/checks/ci5-contract-drift.ts`**

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { CommandRunner } from '../exec/command.ts'

const RULE = 'CI-5'

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

/**
 * `\r\n` becomes `\n` because the CR comes from the checkout, not from the generator; the
 * trailing line breaks are trimmed because an extra `\n` is a shell redirect.
 * Any other difference is contract drift (ADR-0005).
 */
function normalize(source: string): string {
  return source.replace(/\r\n/g, '\n').replace(/\n+$/, '\n')
}

/** First 1-indexed line where the two texts diverge; 0 if they do not diverge. */
export function firstDifferentLine(actual: string, expected: string): number {
  const a = normalize(actual).split('\n')
  const b = normalize(expected).split('\n')
  const limit = Math.max(a.length, b.length)
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) return i + 1
  }
  return 0
}

/** The first useful line of the generator's error: stderr if there is any, message if not. */
function reasonOf(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr
  const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))
  return text.split('\n')[0] ?? text
}

/**
 * `CI-5` — contract drift. Receives the executor by injection, and not through
 * `CheckContext`: the command is a dependency of this check, not of the context that the
 * other three share (ADR-0005).
 */
export function ci5ContractDrift(exec: CommandRunner): Check {
  return {
    id: RULE,
    name: 'contract drift',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      for (const rule of context.config.generated) {
        let expected: string
        try {
          expected = exec(rule.command, context.root)
        } catch (err) {
          findings.push(
            error(
              rule.path,
              0,
              `The generator failed: \`${rule.command}\` — ${reasonOf(err)}`,
              'A generator that does not run leaves the contract without a source. Fix the command declared in ' +
                '`generated[].command` in docs/.ownership.yml (owning skill: contract-keeper).',
            ),
          )
          continue
        }

        let actual: string
        try {
          actual = readFileSync(join(context.root, rule.path), 'utf8')
        } catch {
          findings.push(
            error(
              rule.path,
              0,
              'Generated artifact declared in `generated[]` and missing from the repository.',
              `Generate it and version the result: \`${rule.command} > ${rule.path}\` (spec §3).`,
            ),
          )
          continue
        }

        const line = firstDifferentLine(actual, expected)
        if (line !== 0) {
          findings.push(
            error(
              rule.path,
              line,
              'The generated artifact diverges from the generator output — the contract on disk is not what the source produces.',
              `Regenerate: \`${rule.command} > ${rule.path}\`. Never edit the file by hand ` + '(`HK-2` blocks; originating rule: spec §5, SK-5, rule 1).',
            ),
          )
        }
      }

      return findings
    },
  }
}
```

- [ ] **Step 5: Extend `src/checks/registry.ts`**

Replace the whole file:

```typescript
import type { Check } from '../core/types.ts'
import { ci1Structure } from './ci1-structure.ts'
import { ci2Ids } from './ci2-ids.ts'
import { ci3Traceability } from './ci3-traceability.ts'
import { ci5ContractDrift } from './ci5-contract-drift.ts'
import { runCommand } from '../exec/command.ts'
import type { CommandRunner } from '../exec/command.ts'

/** Checks that `living-docs validate` runs, in order. None of them runs anything. */
export const CHECKS: readonly Check[] = [ci1Structure, ci2Ids, ci3Traceability]

/**
 * Checks that `living-docs drift` runs: the ones that run the command declared by the
 * validated repository (ADR-0005). The executor comes in by injection so that the
 * test does not need a real generator.
 */
export function driftChecks(exec: CommandRunner = runCommand): readonly Check[] {
  return [ci5ContractDrift(exec)]
}
```

- [ ] **Step 6: Create `src/cli/drift.ts`**

```typescript
import { loadOwnership } from '../config/ownership.ts'
import { driftChecks } from '../checks/registry.ts'
import { runCommand } from '../exec/command.ts'
import type { CommandRunner } from '../exec/command.ts'
import type { Finding } from '../core/types.ts'

export interface DriftResult {
  findings: Finding[]
  /** How many generated artifacts were compared. Zero means "nothing declared". */
  checked: number
  exitCode: number
}

export function runDrift(root: string, exec: CommandRunner = runCommand): DriftResult {
  const config = loadOwnership(root)
  // `docs: []` on purpose: CI-5 reads no artifact at all — it compares the generated
  // file with the generator's output.
  const context = { root, config, docs: [] }

  const findings = driftChecks(exec).flatMap(check => check.run(context))

  return {
    findings,
    checked: config.generated.length,
    exitCode: findings.some(finding => finding.severity === 'error') ? 1 : 0,
  }
}
```

- [ ] **Step 7: Make `validate` count what it left for `drift`**

In `src/cli/validate.ts`, add the field to the interface and to the return:

```typescript
export interface ValidateResult {
  findings: Finding[]
  errors: number
  warnings: number
  exitCode: number
  /** Declared generated artifacts — checked by `living-docs drift`, not here (ADR-0005). */
  generated: number
}
```

```typescript
return {
  findings,
  errors,
  warnings: findings.length - errors,
  exitCode: errors > 0 ? 1 : 0,
  generated: config.generated.length,
}
```

- [ ] **Step 8: Wire the subcommand in `src/cli/index.ts`**

Add the import:

```typescript
import { runDrift } from './drift.ts'
```

Replace the `USAGE`:

```typescript
const USAGE = `living-docs <command>

  validate    Runs the living documentation checks (CI-1, CI-2, CI-3)
  drift       Compares each generated artifact with the generator output (CI-5)
  init        Creates the living documentation frame (owning skill: living-docs-bootstrap)

Options for init:
  --owner <@handle>   Default owner of the created artifacts
  --stage <stage>     Minimum set to install: solo (default), small-team or production
  --dry-run           Shows what it would do, without writing
`
```

In the `validate` block, after writing the findings:

```typescript
if (command === 'validate') {
  const result = runValidate(root)
  process.stdout.write(`${formatFindings(result.findings)}\n`)
  // A pointer, not a finding: validate runs no generator at all (ADR-0005), and
  // staying quiet about it would be pretending to a coverage it does not have.
  if (result.generated > 0) {
    process.stdout.write(
      `living-docs: ${result.generated} generated artifact(s) declared — contract drift is checked by \`living-docs drift\` (CI-5).\n`,
    )
  }
  return result.exitCode
}
```

And, right after that block and **inside the same `try`** — it is what translates
`OwnershipError` into exit 2, and `drift` carries the same exit codes as
`validate` —, the new subcommand:

```typescript
if (command === 'drift') {
  const result = runDrift(root)
  if (result.checked === 0) {
    process.stdout.write('living-docs: no generated artifact declared in `generated[]` — nothing to compare.\n')
    return 0
  }
  process.stdout.write(`${formatFindings(result.findings)}\n`)
  return result.exitCode
}
```

- [ ] **Step 9: Run and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "exit=$?"
```

Expected: PASS, and `drift` saying `no generated artifact declared` with
`exit=0` — this repository has not declared any yet. It is Task 4 that changes that.

- [ ] **Step 10: Commit**

**`HK-5`:** this commit touches `src/checks/**` and `src/cli/**`, which `watches` links
to `docs/requirements/rules.md` and `docs/requirements/functional.md`. The hook will
ask about both. The answer is **yes, go ahead**: both docs traveled
in Task 1, with `RF-0006` and `RN-0012`. Say this; do not answer for whoever decides.

```bash
git add src/exec/command.ts src/checks/ci5-contract-drift.ts src/checks/registry.ts src/cli/drift.ts src/cli/validate.ts src/cli/index.ts test/checks/ci5-contract-drift.test.ts test/cli/drift.test.ts
git commit -m "feat(CI-5, RF-0006): living-docs drift compares the generated contract with the generator output"
```

---

### Task 4: This repository's generated contract

**Goal:** Give `CI-5` a real target. This repository had no generated contract
at all — without one, the whole phase would be left without proof. The contract is the most
stable thing the toolkit publishes: the check IDs, what makes each one fail, and
by which command each one runs.

**Files:**

- Create: `src/tools/gen-checks.ts`
- Create: `docs/contracts/checks.gen.md` (**by the generator, never by the editor**)
- Create: `test/checks/registry.test.ts`
- Create: `test/contracts/drift.test.ts`
- Modify: `src/checks/registry.ts`
- Modify: `docs/.ownership.yml`

**Interfaces:**

- Consumes: `CHECKS`, `driftChecks` (Task 3).
- Produces: `export interface CatalogEntry { id: string; name: string; command: string; failsWhen: string }`
  and `export const CHECK_CATALOG: readonly CatalogEntry[]` in
  `src/checks/registry.ts` — the annotated source of the contract.

**Requirements:**

- The catalog is the **only** source of the generated file, and a test ties catalog and
  registry together: same IDs, same names, not one more.
- Deterministic output: no date, no machine path, no count that changes on its own.
- `docs/contracts/checks.gen.md` is born and changes **only** through the command line.
  `HK-2` denies `Edit`/`Write` on that path as soon as Step 3 declares the entry
  in `generated[]` — and that denial is the correct behavior, not an
  obstacle to work around.

- [ ] **Step 1: Write the failing tests**

Create `test/checks/registry.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECKS, CHECK_CATALOG, driftChecks } from '../../src/checks/registry.ts'

test('RF-0006: the catalog covers exactly the checks that exist, with the same names', () => {
  const reais = [...CHECKS, ...driftChecks(() => '')].map(check => `${check.id}|${check.name}`)
  const catalogados = CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}`)
  assert.deepEqual(catalogados, reais, 'catalog and registry diverged — the generated contract would lie')
})

test('RF-0006: every catalog item says when it fails and by which command it runs', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} has no written failure condition`)
    assert.match(entry.command, /^living-docs (validate|drift)$/, `${entry.id} with a strange command`)
  }
})

test('ADR-0005: only CI-5 runs outside validate', () => {
  for (const entry of CHECK_CATALOG) {
    const esperado = entry.id === 'CI-5' ? 'living-docs drift' : 'living-docs validate'
    assert.equal(entry.command, esperado, `${entry.id} in the wrong command`)
  }
})
```

Create `test/contracts/drift.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runDrift } from '../../src/cli/drift.ts'
import { repoRoot } from '../../src/core/roots.ts'

const ROOT = repoRoot()
const GENERATED = 'docs/contracts/checks.gen.md'

test('RF-0006: this repository\'s generated contract has not drifted — dogfooding with the real generator', () => {
  const result = runDrift(ROOT)
  assert.ok(result.checked >= 1, 'this repository must declare at least one generated artifact')
  assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2))
  assert.equal(result.exitCode, 0)
})

test('RN-0012: the generated artifact declares itself generated, and does not pretend to be an editable artifact', () => {
  const source = readFileSync(join(ROOT, GENERATED), 'utf8')
  assert.match(source.split('\n')[0] ?? '', /generated: do not edit/, 'the marker opens the file (spec §2)')
  assert.doesNotMatch(source, /^---$/m, 'a generated artifact has no editable frontmatter (spec §2)')
  assert.match(source, /src\/checks\/registry\.ts/, 'the file must name its own source')
})
```

- [ ] **Step 2: Run and confirm they fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="catalog|generated contract|RN-0012: the generated artifact|ADR-0005: only"
```

Expected: FAIL — `CHECK_CATALOG` does not exist, `docs/contracts/checks.gen.md`
does not exist, and `runDrift` finds `checked === 0`.

- [ ] **Step 3: Add the catalog to `src/checks/registry.ts`**

At the end of the file, after `driftChecks`:

```typescript
export interface CatalogEntry {
  id: string
  name: string
  /** The CLI command that runs this check. */
  command: string
  /** The failure condition — the "Fails when" column of spec §9. */
  failsWhen: string
}

/**
 * The public contract of the checks: this is what a consuming project cites in
 * its Definition of Done, and it is the annotated source of `docs/contracts/checks.gen.md`
 * (`CI-5`). To change the contract, change here and regenerate — never the other way around.
 */
export const CHECK_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: 'CI-1',
    name: 'structure lint',
    command: 'living-docs validate',
    failsWhen: 'Missing or invalid frontmatter; `status` outside the state machine; `owner` empty or without `@`; `trigger` missing or describing a cadence.',
  },
  {
    id: 'CI-2',
    name: 'ID lint',
    command: 'living-docs validate',
    failsWhen: 'Duplicate ID, out of sequence, or reused from `docs/ids-retired.txt`; a citation that does not resolve to an existing item.',
  },
  {
    id: 'CI-3',
    name: 'traceability',
    command: 'living-docs validate',
    failsWhen:
      'Open bidirectional pair; `active` requirement without a citation in the `cited-by` paths; `accepted` ADR without `relates-to`; `resolved` open decision without the ADR that closed it.',
  },
  {
    id: 'CI-5',
    name: 'contract drift',
    command: 'living-docs drift',
    failsWhen: 'The generator output differs from the versioned artifact; the generator fails; or the artifact declared in `generated[]` does not exist.',
  },
])
```

- [ ] **Step 4: Create `src/tools/gen-checks.ts`**

```typescript
#!/usr/bin/env node
/**
 * Generator of the checks' public contract (SK-5).
 *
 * Prints the expected content of `docs/contracts/checks.gen.md` to standard output
 * and **writes no file at all** — it is the generator contract that `ADR-0005`
 * fixes, and it is what lets `CI-5` compare without rewriting what it is checking.
 *
 * The output is deterministic: no date, no machine path, no count.
 * A generator that prints "generated on <today>" produces drift on every
 * run and switches `CI-5` off on the second day.
 */
import { CHECK_CATALOG } from '../checks/registry.ts'

const HEADER = `<!-- generated: do not edit -->
<!-- source: src/checks/registry.ts (CHECK_CATALOG) — regenerate: node /opt/living-docs/src/tools/gen-checks.ts -->

# Checks contract

The IDs below are public and stable: they appear in the CLI output, are cited
by the Definition of Done of whoever uses the toolkit, and do not change meaning
(\`docs/contracts/versioning-policy.md\`).

| ID | Check | Fails when | Command |
| --- | --- | --- | --- |
`

/** A `|` in a cell would break the table — escaping is the generator's job, not the writer's. */
function cell(value: string): string {
  return value.replaceAll('|', '\\|')
}

const rows = CHECK_CATALOG.map(entry => `| ${cell(entry.id)} | ${cell(entry.name)} | ${cell(entry.failsWhen)} | \`${cell(entry.command)}\` |`).join('\n')

process.stdout.write(`${HEADER}${rows}\n`)
```

- [ ] **Step 5: Declare the generated artifact in `docs/.ownership.yml`**

Replace the line `generated: []` with:

```yaml
generated:
  # The command PRINTS the expected content to standard output and writes no file
  # at all: a check that rewrites what it is checking erases the evidence at the
  # very instant it reports it (ADR-0005). HK-2 blocks editing `path` by
  # hand; CI-5 (`living-docs drift`) compares.
  - path: docs/contracts/checks.gen.md
    command: node /opt/living-docs/src/tools/gen-checks.ts
```

And add, in the `watches` block, right after the existing `src/checks/**` entry:

```yaml
- code: 'src/checks/**'
  doc: docs/contracts/checks.gen.md
  reason: 'the public contract of the checks derives from the registry — regenerating is part of the change, and editing by hand is blocked by HK-2'
```

Two entries with the same `code` are legitimate: `watchesFor` groups by **doc**,
not by glob, and from here on every commit that touches `src/checks/**` is reminded
of both docs. It is mechanism 1 doing exactly what it should.

- [ ] **Step 6: Generate the file — through the command line, never through the editor**

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
```

Check the result with `git diff --stat` and read the file. Expected — four
table rows, `CI-1` to `CI-3` in `living-docs validate` and `CI-5` in
`living-docs drift`, preceded by the marker and by the source comment:

```
<!-- generated: do not edit -->
<!-- source: src/checks/registry.ts (CHECK_CATALOG) — regenerate: node /opt/living-docs/src/tools/gen-checks.ts -->

# Checks contract
...
| ID | Check | Fails when | Command |
| --- | --- | --- | --- |
| CI-1 | structure lint | ... | `living-docs validate` |
```

If you feel the urge to "tidy" a line of the file: that urge is the
symptom that `HK-2` exists to intercept. Fix `CHECK_CATALOG` and regenerate.

- [ ] **Step 7: Run everything and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Expected: PASS; `validate=0` with the new pointer line (`1 generated
artifact(s) declared`); `drift=0` with `no violation found`.

- [ ] **Step 8: Prove that `CI-5` really catches drift (and undo)**

It is worth a minute: it is the half of criterion 6 that no unit test observes in
the field.

```bash
docker compose exec -w /workspace toolkit sh -c 'printf "| CI-9 | made up |\n" >> docs/contracts/checks.gen.md'
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
git checkout -- docs/contracts/checks.gen.md
```

Expected: `drift=1`, with the finding pointing at `docs/contracts/checks.gen.md` and the
added line, and the `fix` telling you to regenerate. After the `git checkout`, run
`drift` again and confirm `drift=0`.

- [ ] **Step 9: Commit**

**`HK-5`:** this commit touches `src/checks/**`, linked to **two** docs:
`docs/contracts/checks.gen.md` (which is in the commit ✓) and
`docs/requirements/rules.md` (which is not). The answer is **yes, go ahead**:
`RN-0012` traveled in Task 1. The hook listing both and one of them already being resolved
is the correct behavior — it lists the pending one, not the resolved one.

```bash
git add src/tools/gen-checks.ts src/checks/registry.ts docs/.ownership.yml docs/contracts/checks.gen.md test/checks/registry.test.ts test/contracts/drift.test.ts
git commit -m "feat(CI-5, RF-0006): generated contract of the checks, with drift dogfooding"
```

---

### Task 5: `init --stage production` installs the contracts frame

**Goal:** Implement `RF-0007` — the stage that spec §10 maps to
Phases 5 and 6, installing what Phase 5 delivers and **saying** that Phase 6 is missing.

**Files:**

- Create: `templates/errors.md`
- Create: `templates/versioning-policy.md`
- Modify: `templates/CODEOWNERS`
- Modify: `templates/ownership.yml`
- Modify: `src/cli/init.ts`
- Modify: `test/cli/init.test.ts`

**Interfaces:**

- Consumes: `template()`, `writeIfAbsent()`, `InitOptions`, `InitResult`,
  `STAGES`, `Stage` already existing in `src/cli/init.ts`.
- Produces: `Stage` now includes `'production'`; `docs/contracts/errors.md` and
  `docs/contracts/versioning-policy.md` in the validated repository.

**Requirements:**

- Idempotent: a second run neither recreates nor rewrites (same contract as
  `WORKING_AGREEMENTS` and `LANGUAGE_AND_INTENT`).
- `production` installs **everything** that `small-team` installs, plus the contracts —
  the existing conditions use `stage !== 'solo'` and remain valid.
- `NOT_INSTALLED['production']` names Phase 6. A stage that promises the complete set
  without delivering is a dead wiki being born at the factory; an honest stage
  says what is missing, as `small-team` did before Phase 4.
- `init` **does not invent a generator**: `generated:` is still born empty, with a
  commented example.
- The comment about `generated` goes **after** the `generated: []` line in the
  template. It is not taste: `declareRequirements` anchors on the `\ngenerated:` line
  to insert the requirements block when going up a stage, and a comment
  above the anchor would be separated from the key it explains.

- [ ] **Step 1: Write the failing tests**

Add to the end of `test/cli/init.test.ts`:

```typescript
const PRODUCTION = {
  owner: '@team',
  dryRun: false,
  stage: 'production' as const,
}
const CONTRACT_FILES = ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md']

test('RF-0007: production installs the contracts frame, and everything small-team installs', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)
    for (const path of CONTRACT_FILES) {
      assert.ok(existsSync(join(root, path)), `${path} should exist`)
      assert.ok(result.created.includes(path), `${path} should be listed as created`)
    }
    // The stage is cumulative: nothing from small-team may have gone missing.
    for (const path of ['CONTRIBUTING.md', 'docs/glossary.md', 'docs/requirements/rules.md']) {
      assert.ok(existsSync(join(root, path)), `${path} belongs to production too`)
    }
    assert.match(readFileSync(join(root, 'docs/contracts/errors.md'), 'utf8'), /@team/)
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0007: small-team installs no contract at all', () => {
  withTempRepo({}, root => {
    runInit(root, SMALL_TEAM)
    for (const path of CONTRACT_FILES) {
      assert.equal(existsSync(join(root, path)), false, `${path} does not belong to the small-team stage`)
    }
  })
})

test('RF-0007: production says that Phase 6 does not come along yet', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)
    assert.ok(
      result.notInstalled.some(item => /Phase 6/.test(item)),
      `what was left out must be named — ${JSON.stringify(result.notInstalled)}`,
    )
  })
})

test('RF-0007: init does not invent a generator — `generated[]` is born empty', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)
    assert.deepEqual(loadOwnership(root).generated, [])
    // ...and the commented example must be there, otherwise nobody discovers the format.
    assert.match(readFileSync(join(root, OWNERSHIP_PATH), 'utf8'), /#\s+- path: docs\/contracts\/openapi\.gen\.yaml/)
  })
})

test('RF-0007: an already written contract is not rewritten on the second run', () => {
  withTempRepo({ 'docs/contracts/errors.md': '# their way\n' }, root => {
    runInit(root, PRODUCTION)
    const segunda = runInit(root, PRODUCTION)
    assert.equal(readFileSync(join(root, 'docs/contracts/errors.md'), 'utf8'), '# their way\n')
    assert.ok(segunda.skipped.includes('docs/contracts/errors.md'))
    assert.deepEqual(segunda.created, [])
  })
})

test('RF-0007: the seeded CODEOWNERS gives the contracts an owner', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)
    assert.match(readFileSync(join(root, 'CODEOWNERS'), 'utf8'), /docs\/contracts\/\s+@team/)
  })
})
```

- [ ] **Step 2: Run and confirm they fail**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0007"
```

Expected: FAIL on the six tests, with `TypeError` — `node --test` erases the types
and runs, so `NOT_INSTALLED['production']` is `undefined` and
`[...NOT_INSTALLED[options.stage]]` in `runInit` breaks on the first line.
`docker compose exec toolkit npm run typecheck` flags the same thing beforehand:
`'production'` does not belong to `Stage`.

- [ ] **Step 3: Create `templates/errors.md`**

```markdown
---
title: Error catalog
owner: '{{OWNER}}'
trigger: >
  A new error code; a code that changes status; a change in what a code
  means to whoever consumes the public interface.
last-reviewed: { { TODAY } }
---

# Error catalog

> Seed created by `living-docs init`. A code, once published, **never
> changes meaning**: it gets `deprecated` and a replacement. A deprecation without
> a replacement is not a deprecation, it is a compatibility break — and it goes through
> the versioning policy and an ADR. Replace the example with the real
> codes; deleting what is left over is part of the work.

| Code         | Meaning                                                        | When it occurs                      | Transport                  | Public | Status |
| ------------ | -------------------------------------------------------------- | ----------------------------------- | -------------------------- | ------ | ------ |
| EXAMPLE-CODE | Replace with the stable meaning, not the displayable message   | The observable condition that fires it | HTTP 400 / exit 2 / event | yes    | active |

<!-- The code is stable and immutable in meaning; the displayable message is not
part of the contract. Owning skill: contract-keeper. -->
```

- [ ] **Step 4: Create `templates/versioning-policy.md`**

```markdown
---
title: Versioning policy
owner: '{{OWNER}}'
trigger: >
  A public interface change; a decision to deprecate something published; a change
  to the policy itself.
last-reviewed: { { TODAY } }
---

# Versioning policy

> Seed created by `living-docs init`. It is the policy **around** the contract,
> not the contract: what is generated is not written here. Replace whatever is not
> true in this project.

## What is public

List here, explicitly, what consumers can depend on: paths, error
codes, formats, stable IDs. What is not on this list can change without notice — and
that is what prevents the silent widening of the contract.

## What never changes meaning

A published identifier (error code, rule ID, field name) is neither reused nor
redefined. Correcting the meaning of a published code breaks silently whoever
was already handling it.

## How to deprecate

A deprecation requires four things: the announcement date, the removal version or date,
a replacement, and the migration guide. If any is missing, it is not a deprecation.

## Who decides

A compatibility-breaking change goes through an ADR — the decision and what is accepted
to be lost are recorded, not left in the head of whoever was in the room.

<!-- Owning skill: contract-keeper. -->
```

- [ ] **Step 5: Extend `templates/CODEOWNERS`**

Replace the last line to interleave the new variable:

```
{{REQUIREMENTS_CODEOWNERS}}{{AGREEMENTS_CODEOWNERS}}{{CONTRACTS_CODEOWNERS}}docs/.ownership.yml    {{OWNER}}
```

- [ ] **Step 6: Extend `templates/ownership.yml`**

Replace the line `generated: []` with the block below (the key stays in the same
position; the comment comes **after**, for the reason noted in "Requirements"):

```yaml
generated: []
# Generated artifact: HK-2 blocks editing it by hand, and CI-5 (`living-docs drift`)
# compares the versioned file with the generator output.
#
# The `command` PRINTS the expected content to standard output and does NOT write any
# file — a check that rewrites what it is checking erases the evidence at the same
# instant it reports it. A generator that only knows how to write a file gets a
# wrapper: generate into a temporary directory and print the result.
#
# init does not invent a generator, for the same reason it does not invent `watches`.
# Declare yours. Example:
#
# generated:
#   - path: docs/contracts/openapi.gen.yaml
#     command: "node tools/gen-openapi.js"
```

- [ ] **Step 7: Extend `src/cli/init.ts`**

Replace the list of stages:

```typescript
export const STAGES = ['solo', 'small-team', 'production'] as const
```

After the declaration of `LANGUAGE_AND_INTENT` (line ~57), add:

```typescript
/** Contracts (SK-5), installed from the `production` stage on (spec §10, Phase 5). */
const CONTRACTS: readonly { path: string; template: string }[] = Object.freeze([
  { path: 'docs/contracts/errors.md', template: 'errors.md' },
  {
    path: 'docs/contracts/versioning-policy.md',
    template: 'versioning-policy.md',
  },
])
```

Replace the constant `NOT_INSTALLED`:

```typescript
/**
 * What this stage asks for and this version does not deliver yet. `solo` and `small-team`
 * come out empty: Phases 0–4 are complete. `production` covers Phases 5 and 6
 * in spec §10, and 6 does not exist here.
 */
const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
  production: ['Phase 6 — CHANGELOG, release notes, deprecations and migration guides (SK-7, CI-6, HK-7)'],
})
```

In the `values` object inside `runInit`, add the new key after
`AGREEMENTS_CODEOWNERS`:

```typescript
    CONTRACTS_CODEOWNERS:
      options.stage === 'production' ? `docs/contracts/    ${options.owner}\n` : '',
```

And, right after the loop `for (const agreement of LANGUAGE_AND_INTENT) { ... }`,
inside the `if (options.stage !== 'solo') { ... }`:

```typescript
if (options.stage === 'production') {
  for (const contract of CONTRACTS) {
    writeIfAbsent(root, contract.path, template(contract.template, values), options, result)
  }
}
```

- [ ] **Step 8: Run and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts --help
```

Expected: PASS on the whole suite, and `--help` listing `drift` and the three
stages. If `'RF-0003: small-team leaves nothing out in this version'` fails,
someone put Phase 6 on the wrong list — `small-team` stays empty.

- [ ] **Step 9: Commit**

**`HK-5`:** this commit touches `src/cli/**`, linked to
`docs/requirements/functional.md`. The answer is **yes, go ahead**:
`RF-0007` traveled in Task 1.

```bash
git add templates/errors.md templates/versioning-policy.md templates/CODEOWNERS templates/ownership.yml src/cli/init.ts test/cli/init.test.ts
git commit -m "feat(RF-0007): init --stage production installs the contracts frame"
```

---

### Task 6: Dogfooding — this repository's written contracts

**Goal:** Run the real `init --stage production` against this repository
to prove Task 5 end to end, and then replace the seed with the toolkit's
**real** error catalog and versioning policy.

**Files:**

- Create: `docs/contracts/errors.md` (real content, not the seed)
- Create: `docs/contracts/versioning-policy.md` (real content)
- Create: `test/docs/contracts.test.ts`
- Modify: `CODEOWNERS`

**Interfaces:**

- Consumes: `src/cli/index.ts` (the real exit codes), `src/checks/registry.ts`
  (the IDs), `docs/contracts/checks.gen.md` (Task 4).
- Produces: the two artifacts that the skill in Task 7 declares it owns.

**Requirements:**

- No error code narrates code: each one is what a consumer observes
  (an exit code, a failure class), not an internal function.
- The two files do **not** go into `artifacts:` — `ADR-0004` already decided that
  treatment for an artifact without an ID family, and `DA-0002` stays open.
- **This** repository's `CODEOWNERS` is not rewritten by `init` — it already
  exists, and `writeIfAbsent` skips it. The owner line goes in by hand, otherwise
  principle 1 of the Constitution is born violated.
- `errors.md` does not repeat the table of `checks.gen.md`: the check IDs live there,
  and duplicating them here would be a second source of truth for the same thing.

- [ ] **Step 1: Run `init --stage production` against this repository (dry-run first)**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts init --owner @esliph/engineering --stage production --dry-run
```

Expected: `created docs/contracts/errors.md` and
`created docs/contracts/versioning-policy.md`; everything else as `kept`
(`CODEOWNERS` included — hence Step 6); and the line
`not installed  Phase 6 — …`.

- [ ] **Step 2: Run for real**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts init --owner @esliph/engineering --stage production
```

Confirm that the two files were born with the seed's content and `@esliph/engineering` in
place of `{{OWNER}}`.

- [ ] **Step 3: Write `test/docs/contracts.test.ts`**

The test comes before the real content, and the seed is what makes it fail: it brings
**one** example row, and the test demands four real codes.

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const ROOT = toolkitRoot()

/** Rows of a markdown table, without the header or the separator. */
function rows(source: string, header: string): string[][] {
  const start = source.indexOf(header)
  assert.ok(start !== -1, `table not found — expected the header ${header}`)
  return source
    .slice(start)
    .split('\n')
    .filter(line => line.trim().startsWith('|'))
    .slice(2)
    .map(line =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cell => cell.trim()),
    )
}

const errors = (): string => readFileSync(join(ROOT, 'docs/contracts/errors.md'), 'utf8')

test('the error catalog lists real codes, each with a meaning, a trigger and a status', () => {
  const entries = rows(errors(), '| Code |')
  assert.ok(entries.length >= 4, `expected at least 4 codes, found ${entries.length}`)

  const codigos = entries.map(row => row[0])
  assert.equal(new Set(codigos).size, codigos.length, 'there is a duplicate code — one code, one meaning')

  for (const row of entries) {
    assert.notEqual(row[1] ?? '', '', `code "${row[0]}" without a meaning`)
    assert.notEqual(row[2] ?? '', '', `code "${row[0]}" without "when it occurs"`)
    const status = row[row.length - 1] ?? ''
    assert.match(status, /^(active|deprecated|removed)/, `status "${status}" outside the lifecycle (spec §4)`)
  }
})

test('the error catalog does not duplicate the checks table — it is generated and lives in another file', () => {
  assert.doesNotMatch(errors(), /\bCI-1\b.*\bstructure lint\b/, 'the check IDs live in docs/contracts/checks.gen.md')
  assert.match(errors(), /checks\.gen\.md/, 'and this file must point there')
})

test('the versioning policy answers what is public, what does not change and how to deprecate', () => {
  const source = readFileSync(join(ROOT, 'docs/contracts/versioning-policy.md'), 'utf8')
  for (const secao of ['## What is public', '## What never changes meaning', '## How to deprecate']) {
    assert.ok(source.includes(secao), `policy without the section "${secao}"`)
  }
})

test('RN-0001: the contracts have an owner in CODEOWNERS, like every artifact', () => {
  const codeowners = readFileSync(join(ROOT, 'CODEOWNERS'), 'utf8')
  assert.match(codeowners, /^docs\/contracts\/\s+@\S+$/m)
})
```

The three section titles are compared by `includes`, letter by letter: they
must match **exactly** those of the template (Task 5, Step 4) and those of the
real content (Step 6). A one-letter difference makes the test fail
for the wrong reason.

- [ ] **Step 4: Run and confirm it fails**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="error catalog|versioning policy|RN-0001: the contracts"
```

Expected: of the four tests, **three fail** — `expected at least 4 codes,
found 1`; the no-duplication one (the seed does not point to `checks.gen.md`); and the
CODEOWNERS one (`init` did not rewrite the existing file). The policy one already
passes: the seed brings the three sections, and that is how it should be — it keeps
the format, not the content.

- [ ] **Step 5: Replace `docs/contracts/errors.md` with the real catalog**

```markdown
---
title: Error catalog
owner: '@esliph/engineering'
trigger: >
  A new or changed-meaning exit code; a new failure class on the
  command line; a change in what a code means to whoever consumes the CLI.
last-reviewed: 2026-08-25
---

# Error catalog

What a consumer of `living-docs` observes when something goes wrong. The code is
stable and immutable in meaning; the displayable message is not part of the contract
and can change at any time.

The check IDs (`CI-n`) are **not** here: they are generated from the
registry and live in `docs/contracts/checks.gen.md`. A code in two places is
a code that has already diverged.

| Code              | Meaning                                               | When it occurs                                                                                                   | Transport                                               | Public | Status |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------ | ------ |
| EXIT-0            | Nothing to fix                                        | `validate` with no finding of `error` severity; `drift` with no drift; `init` that ran                           | exit 0                                                  | yes    | active |
| EXIT-1            | The repository violates a living documentation rule   | `validate` with at least one `error` finding, or `drift` with drift, a broken generator or a missing generated artifact | exit 1                                            | yes    | active |
| EXIT-2            | The command could not even start                      | `docs/.ownership.yml` missing or invalid; unknown command; unknown `--stage`; no arguments                       | exit 2                                                  | yes    | active |
| OWNERSHIP-INVALID | The ownership map is not readable as configuration    | Invalid YAML, `version` other than 1, empty `artifacts`, `id-prefix` outside 2–4 capitals, `owner` without `@`   | exit 2, message on stderr starting with `living-docs:`  | yes    | active |
| UNKNOWN-COMMAND   | The subcommand does not exist in this version         | Any word that is not `validate`, `drift` or `init`                                                               | exit 2, message on stderr + usage                       | yes    | active |

`EXIT-1` and `EXIT-2` are distinct on purpose: the first is the repository
failing, the second is the tool having nothing to do. A CI script that
confuses them treats broken configuration as wrong documentation, and sends people
to fix the wrong place.

<!-- Owning skill: contract-keeper. -->
```

- [ ] **Step 6: Replace `docs/contracts/versioning-policy.md` with the real policy**

```markdown
---
title: Versioning policy
owner: '@esliph/engineering'
trigger: >
  A change to the public interface of the CLI, of the checks or of `.ownership.yml`;
  a decision to deprecate something published; a change to the policy itself.
last-reviewed: 2026-08-25
---

# Versioning policy

The policy around the contract. The contract itself — the table of checks — is
generated (`docs/contracts/checks.gen.md`) and is not written by hand.

## What is public

- The IDs of the checks (`CI-n`), hooks (`HK-n`), skills (`SK-n`) and
  commands (`CM-n`), and what each one means.
- The CLI subcommands (`validate`, `drift`, `init`), their options, and the
  exit codes of `docs/contracts/errors.md`.
- The schema of `docs/.ownership.yml` with `version: 1`: the key names and what
  each one requires.
- The generator contract: `generated[].command` prints to standard output and does not
  write a file (`ADR-0005`).

What is not on this list can change without notice — the structure of `src/`, the
text of the messages, the exact format of the output of `validate`.

## What never changes meaning

A published identifier is neither reused nor redefined. `CI-4` never
starts measuring something else; `EXIT-2` never becomes "validation failed". When the
meaning needs to change, the old identifier gets `deprecated` and a
replacement is born beside it — it is the same rule that `docs/ids-retired.txt` imposes on
artifacts, applied to the interface.

## How to deprecate

Four things, no exception: the announcement date, the removal version or date,
a replacement, and the link to the migration guide. If any is missing, it is not a
deprecation — it is a compatibility break, and it goes through an ADR.

While Phase 6 does not exist, this repository has no `CHANGELOG.md` nor
`docs/migrations/`: a real deprecation here **blocks** until
Phase 6 lands, and that is deliberate — announcing a removal with no place for the migration
guide is the deprecation that nobody can follow.

## Who decides

A compatibility-breaking change goes through an ADR, with the alternatives and what is
accepted to be lost. Accepting is a human act (`RN-0005`).

<!-- Owning skill: contract-keeper. -->
```

- [ ] **Step 7: Give the contracts an owner in this repository's `CODEOWNERS`**

Add the line after `docs/charter/`, following the spacing that the
file already uses (four spaces):

```
docs/contracts/    @esliph/engineering
```

One owner for the whole directory, as `docs/requirements/` and `docs/charter/`
already are: whoever answers for the contract answers for the policy around it — and
for the generated file, which nobody edits but somebody needs to answer for.

- [ ] **Step 8: Run everything and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Expected: PASS, `validate=0`, `drift=0`. `docs/contracts/errors.md` and
`versioning-policy.md` do not go into `context.docs` (they are not in `artifacts:`),
so no check of `CI-1`–`CI-3` touches them — what covers them is
`test/docs/contracts.test.ts`, and only it. It is the same loss that `ADR-0004`
recorded for the glossary and the charter.

- [ ] **Step 9: Commit**

```bash
git add docs/contracts/errors.md docs/contracts/versioning-policy.md CODEOWNERS test/docs/contracts.test.ts
git commit -m "feat(RN-0012): error catalog and versioning policy of this repository"
```

---

### Task 7: `SK-5` contract-keeper

**Goal:** Write the skill that owns the pipeline that generates the contract and the two
hand-written artifacts around it.

**Files:**

- Create: `plugin/skills/contract-keeper/SKILL.md`
- Modify: `test/plugin/authoring.test.ts`
- Modify: `CONTRIBUTING.md`

**Interfaces:**

- Consumes: `templates/errors.md`, `templates/versioning-policy.md` (Task 5);
  the real `docs/contracts/` (Tasks 4 and 6).
- Produces: nothing consumed by another task — a skill is a leaf.

**Requirements:**

- `description` > 120 characters, containing "Use" and the symptoms of the trigger in
  spec §5 (public interface changed, new error code, versioning
  policy).
- Sections in the exact order of spec §11 — `test/plugin/authoring.test.ts` scans
  every directory of `plugin/skills/` automatically, so the new skill is
  born inside the conventions or the suite fails it.
- Checklist with ≥6 items, each naming `CI-n`, `HK-n` or "human".
- It does not duplicate the format of the artifacts: it points to `templates/errors.md`
  and `templates/versioning-policy.md`.
- `CONTRIBUTING.md` travels in **this** commit: `watches` links `plugin/skills/**`
  to it, and a new skill is exactly "how we work here changed".

- [ ] **Step 1: Write the failing test**

Add to `test/plugin/authoring.test.ts`:

```typescript
test('contract-keeper: the description names public interface, new error and versioning', () => {
  const description = String(parseFrontmatter(skillSource('contract-keeper'))?.data.description ?? '')
  assert.match(description, /Use when/i)
  for (const sintoma of ['contract', 'error', 'generat']) {
    assert.ok(description.toLowerCase().includes(sintoma), `the description should contain the symptom "${sintoma}"`)
  }
})

test('contract-keeper does not duplicate the content of the artifacts it governs', () => {
  const source = skillSource('contract-keeper')
  assert.match(source, /templates\/errors\.md/, 'it must point to the template, not copy it')
  assert.match(source, /templates\/versioning-policy\.md/, 'both templates, because there are two artifacts')
  assert.doesNotMatch(source, /^\| EXIT-\d/m, 'the skill must not contain this repository\'s catalog')
  assert.doesNotMatch(source, /^## What is public/m, 'nor this repository\'s policy')
})
```

- [ ] **Step 2: Run and confirm it fails**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="contract-keeper"
```

Expected: FAIL — `plugin/skills/contract-keeper/SKILL.md` does not exist. Besides the
two tests above, the four tests generated by the scan (`frontmatter`,
`description`, `sections`, `checklist`) also flag the absence as soon as the
directory is born empty or incomplete.

- [ ] **Step 3: Write `plugin/skills/contract-keeper/SKILL.md`**

```markdown
---
name: contract-keeper
description: >
  Use when the public interface changes — endpoint, payload, output format,
  exit code, field name —, when a new error code appears, or when someone asks
  "is this public?", "can I change this field?", "what does this error mean?",
  "who depends on this?", "can I edit this generated file?", "why did CI
  complain about the contract?". Also when something published has to be
  deprecated, or when deciding what a consumer can or cannot assume to be
  stable.
---

# contract-keeper — owner of the public contract

## Overview

The contract has two halves, and they are written in opposite ways. The
**generated** half is never written: it comes out of an annotated source, and editing it by hand is
blocked by `HK-2`. The **written** half is the policy around it —
versioning, deprecation, error catalog —, and no generator produces that.

Confusing the two is the expensive mistake: a hand-edited contract lives until the next
run of the generator and lies until then, with the authority of a file that looks
official.

The paths come from `docs/.ownership.yml` (`generated[]` and the owner of
`docs/contracts/`); do not assume.

## What you own

| Artifact                              | What it is                                                                      | Shape                                |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| The _pipeline_ that generates the contract | The annotated source + the command declared in `generated[].command`      | Code, not a document                 |
| The generated artifact (`*.gen.*`)    | The contract itself                                                             | Generated; never edited by hand (`HK-2`) |
| `docs/contracts/errors.md`            | Error catalog: code, meaning, when it occurs, transport, whether it is public   | Single file, table, mutable          |
| `docs/contracts/versioning-policy.md` | What is public, what never changes meaning, how to deprecate                    | Single file, sections                |

The seeds are in `templates/errors.md` and
`templates/versioning-policy.md`. Do not reproduce their content here.

## When to use / when not to

**Use** on every public interface change, on every new error code, and on
every change to the versioning policy.

**Do not use** to document internal behavior: what a consumer cannot observe
is not contract, it is implementation — and implementation does not become a
document (spec §13). A business rule is `requirements-keeper`; the "why" of the
change is `decision-recorder`.

**The cost of using it for nothing:** a field declared public can no longer change without
deprecation. Each line of the contract is a commitment that someone will collect on —
publishing what did not need to be public is debt that nobody recorded.

## Procedure

1. **Find out whether the artifact is generated.** Check `generated[]` in
   `docs/.ownership.yml` and look for the marker `generated: do not edit` at the top
   of the file. If it is generated, **stop thinking about editing it**.
2. **To change what is generated, change the annotated source** and run the command
   declared in `generated[].command`. The command prints to standard output and does not
   write a file (`ADR-0005`) — redirect it yourself to the `path`.
3. **Run `living-docs drift`** and confirm exit 0. It is `CI-5`, and it is what
   survives someone editing through the browser.
4. **A new generated artifact goes into `generated[]`** with the command that produces it.
   Without the declaration, `HK-2` only catches it by the marker and `CI-5` does not see it.
5. **A new error code goes into the catalog** with code, meaning (not the
   displayable message), when it occurs, transport, whether it is public and status.
6. **A published code never changes meaning**: it gets `deprecated` and a
   pointed-to replacement. Without a replacement it is not a deprecation — it is a break of
   compatibility, and it goes through the versioning policy and an ADR
   (`decision-recorder`).
7. **Name things by the glossary** (`glossary-keeper`), not by the habit of whoever
   wrote the endpoint.
8. **A consumer-visible change generates a CHANGELOG entry** — when
   Phase 6 (`release-historian`, `CI-6`) exists. Until then, that is human
   verification, and the versioning policy says what to do.
9. **Cite the affected ID in the commit message.**

## Boundaries

| Yours                                                         | Not yours                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| The pipeline that generates the contract, and the annotated source | Editing the generated file — `HK-2` denies, and it is right |
| The policy around it: versioning, deprecation, stability     | The contract itself, when it can be generated               |
| The error catalog: code, meaning, status                      | The displayable message, which is not contract              |
| Declaring what is public                                      | Deciding to break compatibility (it is an ADR, and a human act) |
| Requiring a replacement before deprecating                    | Writing the migration guide (it is `release-historian`, Phase 6) |

## Checklist

- [ ] No generated artifact was edited by hand — verification: `HK-2` (blocks) and `CI-5` (`living-docs drift`)
- [ ] The generated artifact in the commit is the current output of the generator — verification: `CI-5`
- [ ] Every generated artifact is declared in `generated[]`, with the command that produces it — verification: human
- [ ] The generator prints to standard output and does not write a file — verification: human (`ADR-0005`)
- [ ] Every new error code has a meaning, trigger, transport and status — verification: human
- [ ] No published code changed meaning; what changed got `deprecated` + a replacement — verification: human
- [ ] The compatibility-breaking change has an ADR — verification: human (`HK-3` intercepts the acceptance)
- [ ] What became public was foreseen in the policy, and did not silently widen the contract — verification: human
```

- [ ] **Step 4: Point to the contracts in `CONTRIBUTING.md`**

In the table `## Where the truth lives`, add a row immediately before
`| When it is done |`:

```markdown
| What is public, and what each error means | `docs/contracts/` |
```

Only the pointer. No error code is copied here (`RN-0010`).

- [ ] **Step 5: Run and confirm it passes**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Expected: PASS, including the four tests that the scan generates for the new
skill. If `'contract-keeper: the spec §11 sections are present and in order'`
fails, the title of some section is different from expected — the fixed list is
in `test/plugin/authoring.test.ts`.

- [ ] **Step 6: Commit**

**`HK-5`:** this commit touches `plugin/skills/**`, which `watches` links to
`CONTRIBUTING.md` — and it is in the `git add` below. The answer to the hook is "yes,
it is together".

```bash
git add plugin/skills/contract-keeper CONTRIBUTING.md test/plugin/authoring.test.ts
git commit -m "feat(SK-5): contract-keeper, owner of the public contract"
```

---

### Task 8: Acceptance criterion 6, and the indexes

**Goal:** Prove criterion 6 of spec §12 in a single test that exercises the
two halves, and update everything that indexes the toolkit — without copying content into
any of them.

**Files:**

- Modify: `test/acceptance/spec-criteria.test.ts`
- Modify: `docs/definition-of-done.md`
- Modify: `templates/definition-of-done.md`
- Modify: `.github/workflows/living-docs.yml`
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `plugin/.claude-plugin/plugin.json`
- Modify: `docs/superpowers/plans/BACKLOG-phases-3-7.md`

**Interfaces:**

- Consumes: `decideHk2` (Task 2), `runDrift` (Task 3).
- Produces: nothing.

**Requirements:**

- The criterion 6 test exercises **both** halves in a single scenario, as the
  criterion 5 test does for `HK-4`/`HK-5`.
- No index gains content: `CLAUDE.md` and `README.md` point
  (`RN-0010`).
- The DoD gains an item **with a named verification** — an item without verification does not
  go in (the DoD's own rule).

- [ ] **Step 1: Write the criterion 6 test**

In `test/acceptance/spec-criteria.test.ts`, add the two imports to the import block
at the top, next to those of `decideHk1`…`decideHk5`:

```typescript
import { decideHk2 } from '../../src/hooks/hk2-generated-artifact.ts'
import { runDrift } from '../../src/cli/drift.ts'
```

And the scenario at the end of the file:

```typescript
const GENERATED_CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/api.gen.md
    command: "node tools/gen.js"
`

test('criterion 6: HK-2 denies editing the generated contract, and CI-5 fails if it gets through outside', () => {
  const GERADO = 'docs/contracts/api.gen.md'
  const VERDADE = '<!-- generated: do not edit -->\n\n# API\n\n- GET /orders\n'

  withTempRepo({ [OWNERSHIP_PATH]: GENERATED_CONFIG, [GERADO]: VERDADE }, root => {
    const env = { root, hostRoots: [root] }

    // Half 1 — through the agent, HK-2 denies and teaches the right path.
    const negado = decideHk2(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: GERADO,
          old_string: 'GET',
          new_string: 'POST',
        },
      },
      env,
    )
    assert.equal(negado.action, 'deny')
    assert.match(negado.action === 'deny' ? negado.reason : '', /node tools\/gen\.js/)
    // Half 2 — edited outside the agent, CI-5 fails.
    writeFileSync(join(root, GERADO), VERDADE.replace('GET', 'POST'), 'utf8')
    const derivou = runDrift(root, () => VERDADE)
    assert.equal(derivou.exitCode, 1)
    assert.equal(derivou.findings[0]?.ruleId, 'CI-5')

    // And with the file equal to the generator output, the path is clear.
    writeFileSync(join(root, GERADO), VERDADE, 'utf8')
    assert.equal(runDrift(root, () => VERDADE).exitCode, 0)
  })
})
```

- [ ] **Step 2: Run and confirm it passes**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="criterion 6"
```

Expected: PASS on the first try — the code of Tasks 2 and 3 already exists. It is an
acceptance test, not a TDD test: it confirms that the two pieces, written
separately, close the spec's scenario.

- [ ] **Step 3: Add the item to this repository's Definition of Done**

In `docs/definition-of-done.md`, add after the `HK-1` item:

```markdown
- [ ] No generated artifact was edited by hand, and the regenerated contract is in the same commit — verification: `HK-2` (blocks) and `CI-5` (`living-docs drift`).
```

And replace the last item, so that it names the four commands that the workflow
runs:

```markdown
- [ ] `npm test`, `npm run typecheck`, `living-docs validate` and `living-docs drift` pass in the container — verification: `CI-1`, `CI-2`, `CI-3` and `CI-5`, run by the repository workflow.
```

- [ ] **Step 4: Add the same item to the DoD template**

In `templates/definition-of-done.md`, after the `HK-1` item:

```markdown
- [ ] No generated artifact was edited by hand — verification: `HK-2` and `CI-5` (`living-docs drift`).
```

The item is vacuously true in a project with no generated artifact, and that is fine:
it is born together with the first declared `generated[]`, without anyone having to remember
to come back here.

- [ ] **Step 5: Run `drift` in CI**

In `.github/workflows/living-docs.yml`, after the `validate` step:

```yaml
- name: CI-5 — generated contract drift
  run: >
    docker compose run --rm -w /workspace toolkit
    node /opt/living-docs/src/cli/index.ts drift
```

It is the step that stops `ADR-0005` from becoming a promise: a check that only runs when
someone remembers is not enforcement.

- [ ] **Step 6: Update `README.md`**

Replace the whole opening paragraph with:

```markdown
Living documentation with an owner, a trigger and enforcement — Phases 0–5 of the spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions, Debt Register and
requirements with a stable ID; the checks `CI-1`/`CI-2`/`CI-3`/`CI-5`; the hooks
`HK-1`/`HK-2`/`HK-3`/`HK-4`/`HK-5`; the working agreements (`SK-6`); the
domain vocabulary and the inviolable principles (`SK-2`, `SK-1`); and the
public contract, with the generated half that nobody edits by hand (`SK-5`).
```

In the usage block, after the `validate` line:

```bash
./bin/living-docs drift                 # runs CI-5: does the generated contract still match the generator?
```

In the stages section, add at the end of the paragraph:

```markdown
`production` adds the contracts frame (error catalog and versioning
policy) and says that Phase 6 does not come along yet.
```

In the plugin section, add:

```markdown
`contract-keeper` (`SK-5`) owns the public contract, and `HK-2` denies editing a
generated artifact by hand, pointing to the source and the generator's command.
```

In "What is left out", replace the list and the criterion 5 paragraph:

```markdown
`SK-7`, `AG-1`, `HK-6`, `HK-7`, `CI-4`, `CI-6`, `CI-7`, `CI-8`, `CM-5`, `CM-7`
— Phases 6 and 7 of the spec. What is missing and in what order:
`docs/superpowers/plans/BACKLOG-phases-3-7.md`.

Of acceptance criterion 5 of spec §12, Phase 3 delivers the hook half: the commit
that carries a watched path without the owner doc is asked about. The other half — "and CI
signals it through `watches`" — is `CI-7`, Phase 7. Criterion 6 is closed entirely:
`HK-2` denies the edit and `CI-5` (`living-docs drift`) catches whoever got through outside.
```

- [ ] **Step 7: Update `CLAUDE.md`**

Two lines, index and policy only. In the `## Policy` section, after the line
"You do not fix a frozen item":

```markdown
- **You do not edit a generated artifact.** What is in `generated[]` (or carries
  the marker) changes through the source and the generator — `HK-2` denies and `CI-5` enforces.
```

And in the `## Commands` section, add `contract-keeper` to the list of skills
selected by `description`.

- [ ] **Step 8: Update `plugin/.claude-plugin/plugin.json`**

In the `description`, replace "Phases 0–4" with "Phases 0–5" and add "generated public
contract" to the enumeration. `version` does not change: the versioning policy
that Task 6 wrote does not tie the plugin version to the rollout phase.

- [ ] **Step 9: Update the backlog**

In `docs/superpowers/plans/BACKLOG-phases-3-7.md`:

1. Add a state block at the top, in the format of the previous ones: Phase 5
   is **implemented**, the plan is this file, `ADR-0005` is `accepted` and
   `RF-0006`/`RF-0007`/`RN-0012` are `active`, promoted by a human act
   (write this **after** Task 9; if it does not happen, write the real
   state).
2. Mark the "Phase 5" section as **IMPLEMENTED** and add "What the
   planning found", with at least: (a) the chosen dogfooding target and
   why; (b) the generator contract through stdout and the reason (a check that rewrites
   erases the evidence); (c) `CI-5` outside `validate`, and the pointer that avoids
   silence.
3. In the "Phase 6" section, record the inheritance: `src/exec/command.ts` exists and is the
   mold for `src/git/diff.ts` (injectable runner) — but with the contract
   inverted, because `CI-6` is a check and not a hook; and `docs/contracts/errors.md`
   already points to the CHANGELOG that does not exist yet.
4. In "Inherited debts and open decisions", update the note about
   `--stage production`: it now exists, with `notInstalled` naming
   Phase 6; whoever executes Phase 6 empties that list.
5. In "Suggested order from here", strike out Phase 5 and promote Phase 6 to the next
   step.

- [ ] **Step 10: Run everything and commit**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

```bash
git add test/acceptance/spec-criteria.test.ts docs/definition-of-done.md templates/definition-of-done.md .github/workflows/living-docs.yml README.md CLAUDE.md plugin/.claude-plugin/plugin.json docs/superpowers/plans/BACKLOG-phases-3-7.md
git commit -m "docs(CI-5, HK-2): acceptance criterion 6 closed, and the Phase 5 indexes"
```

---

### Task 9: Human promotion

**Goal:** Take `ADR-0005` to `accepted` and `RF-0006`, `RF-0007`, `RN-0012` to
`active`. **This is not yours.** The skill writes `draft`; promoting is a human act
(`RN-0005`), and `HK-3` intercepts with `ask`.

**Files:**

- Modify: `docs/decisions/adr/ADR-0005-generator-contract-and-where-ci5-runs.md`
- Modify: `docs/requirements/functional.md`
- Modify: `docs/requirements/rules.md`

**Interfaces:**

- Consumes: the IDs of Task 1 and the citations planted by Tasks 2–8.
- Produces: the four items in their final state, enforceable by `CI-3`.

**Requirements:**

- Before proposing the promotion, check that each item **already** has someone citing it:
  `RF-0006` in `test/checks/ci5-contract-drift.test.ts`,
  `test/cli/drift.test.ts`, `test/checks/registry.test.ts` and
  `test/contracts/drift.test.ts`; `RF-0007` in `test/cli/init.test.ts`;
  `RN-0012` in `test/hooks/hk2-generated-artifact.test.ts` and
  `test/contracts/drift.test.ts`. Without a citation, promoting to `active` makes
  `CI-3` (rule 7) fail on the spot.
- `ADR-0005` was already born with `relates-to` filled in (Task 1). After
  `accepted` the file freezes and `relates-to` is not in `mutable-fields`:
  fixing it would require superseding.
- `last-reviewed` only changes in a file that was actually reviewed. A bulk bump is
  an anti-requirement of spec §13.

- [ ] **Step 1: Confirm that the citations exist**

```bash
docker compose exec toolkit sh -c 'grep -rn "RF-0006\|RF-0007\|RN-0012" test/ src/ | grep -v "^docs/"'
```

Expected: at least one occurrence of each, in a **different** file from the
requirement. A citation inside the artifact itself covers nothing (`CI-3`, rule 7).

- [ ] **Step 2: Propose the promotion — and leave the answer to whoever decides**

Edit the four states: `status: draft` → `status: accepted` in `ADR-0005`;
`- **status:** draft` → `- **status:** active` in `RF-0006`, `RF-0007` and
`RN-0012`.

`HK-3` will intercept each of those edits with `ask`. **The answer is not
yours.** Present what the person needs in order to decide — what the ADR decides, what
is accepted as lost, and that the requirements already have coverage — and wait.

If the person refuses any of them, that is a legitimate outcome: the item
stays `draft`, Phase 5 stays delivered, and the backlog records the real
state. Do not force it, do not work around it, and do not "advance" the promotion because the plan
ends here.

- [ ] **Step 3: Run everything and confirm the final state passes**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Expected: PASS, `validate=0`, `drift=0`. If `CI-3` flags `RF-0006 is active
and is not cited`, Step 1 lied — the citation is in the file itself, or in a
path outside `cited-by`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/adr/ADR-0005-generator-contract-and-where-ci5-runs.md docs/requirements/functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0005, RF-0006, RF-0007, RN-0012): promotion by human act"
```

If the promotion did not happen, do not invent the commit: go back to Task 8, Step 9, and
write in the backlog the real state ("`ADR-0005` remains `draft`").

---

## What this phase deliberately does not do

- **It does not resolve `DA-0002`.** `docs/contracts/errors.md` and
  `versioning-policy.md` fall into the same category as `CONTRIBUTING.md`, the
  DoD, the glossary and the charter: an artifact with an owner and no ID family, outside
  `artifacts:`. `ADR-0004` already decided that treatment; `DA-0002` stays
  open, a precondition of `CI-7` (Phase 7).
- **It does not create `CM-7` (`/release`) nor touch the CHANGELOG.** That is Phase 6. The versioning
  policy points at the gap on purpose, instead of pretending that the migration
  guide exists.
- **It does not pay `TDR-0001`.** `HK-1` keeps freezing by file, not by
  section. The payment trigger remains the first PR that revokes a
  requirement.
- **It does not create `CI-9` to measure the error catalog.** The verification of "a published
  code does not change meaning" belongs to the skill and to the dogfooding test —
  measuring that automatically would require comparing against the previous published
  version, which is `CI-6` (Phase 6) and depends on the diff.
- **It does not change `run-hook.sh` nor `src/core/types.ts`.** The wrapper already dispatches by
  hook name, and the command executor is a dependency of the check, not of the
  context. Touching both would be a free improvement to code that works.
