# Reader boundary — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A document or artifact declared `audience: external` stops citing artifact IDs, and `CI-11` enforces this in `living-docs validate`.

**Architecture:** `.ownership.yml` gains the `audience` key (closed vocabulary, default `internal`) in `documents:` and `artifacts:`. `CI-11` reads only `config.artifacts[].idPrefix` to know what is internal: no list of prefixes in the check. The `init` of `production` marks the historical trail as external and warns (without rewriting) when the entry already exists without the mark. Skill, templates, agent contract and the prose of this repository follow.

**Tech Stack:** Node >= 24 running TypeScript directly (no build), `node:test`, `yaml`, `tsc --noEmit`, Prettier.

**Spec:** `docs/superpowers/specs/2026-09-10-reader-boundary-design.md` (rules over this plan). Mandatory input, cited by it: `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §8 and §5 (`SK-7`, rule 5), `ADR-0008`, `ADR-0006`, `RN-0007`, `RN-0013`, `docs/contracts/versioning-policy.md`, `RN-0010`/`RN-0020`.

## Global Constraints

- Run on the host's `node`: `npm ci` before anything; `npm test`, `npm run typecheck`, `node src/cli/index.ts …`.
- Work on an isolated branch (superpowers:using-git-worktrees; `.worktrees/` is already ignored). The comparison base is `master`.
- Prose in Portuguese with full accents; identifiers, keys and file names in English/neutral.
- Commit message in Portuguese, `type(ID): subject`, ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. A commit that changes an artifact file cites an ID declared in it (`CI-9`).
- A watched path changed without the owning doc in the same commit carries the line `Docs: none — <reason>` in the message body. The exact text is in each task.
- `ADR-0017`, `RN-0030` and `RF-0015` are born `status: draft`. Promoting is a human act (`HK-3`); do not promote anything.
- `docs/contracts/checks.gen.md` is never edited by hand (`HK-2`). Regenerate **through the Bash tool** (PowerShell's `>` writes UTF-16): `node src/tools/gen-checks.ts > docs/contracts/checks.gen.md`.
- `CI-11` has severity `error` and **has no exception label**. The check **knows no prefix**: internal is what is in `config.artifacts[].idPrefix`.
- A document with frontmatter whose body changes in the commit gets `last-reviewed: 2026-09-15`. Never update the date without changing the body (`CI-9`).
- Every new `CHANGELOG.md` entry is written **without an artifact ID** (`ADR-`, `DA-`, `TDR-`, `RF-`, `RNF-`, `RN-`, `REL-`). `CI-n`, `HK-n`, `SK-n`, `CM-n` and `EXIT-n` may appear.
- `CLAUDE.md` stays at 60 lines at most (`test/docs/agent-contract.test.ts`) and does not repeat a sentence of `RN-0030` (`CI-7`, threshold of 12 words).
- Format whatever you touch: `npx prettier --write <files>`. `templates/`, `docs/contracts/checks.gen.md` and `docs/superpowers/plans/` are ignored by Prettier on purpose.

## Deviations from the spec, decided by whoever asked

1. **`M-4`:** the term _External document_ is born `status: active`, not `draft`. The term lifecycle in the toolkit spec (§4) has no `draft`, and `test/docs/language-and-intent.test.ts` only accepts `active|banned|renamed`.
2. **`M-13`:** the `## [Unreleased]` entry does not come in a commit at the end. Each visible change carries its line in its own commit (Tasks 2, 3, 4 and 5). The final content is what `M-13` asks for.
3. **Definition of Done:** the verification of the last line goes from `CI-1` to `CI-10` to `CI-1` to `CI-11` (Task 3).
4. **`M-7`:** the `audience` key enters `versioning-policy.md` together with the parser (Task 2), and not together with the check.
5. **Extra tests**, cheap and that lock in against regression: a case of broken frontmatter in `CI-11` and the assertions of the skill, of the migration template, of the agent contract and of the marking of this repository.

## Out of scope (the spec §5, plus what came up while reading)

- Amending the toolkit spec or the Constitution.
- Marking `docs/contracts/` as external.
- Verifying the README of whoever installs, the CLI output or the commit messages.
- Fixing `RF-0010`.
- The step name in `.github/workflows/wrapper-docker.yml` ("CI-1 to CI-4, CI-7, CI-8 and CI-10"), which also no longer lists everything.

## File map

| File                                                     | Task | Responsibility                                                            |
| -------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| `docs/decisions/adr/ADR-0017-reader-boundary.md`         | 1    | Create: the decision                                                      |
| `docs/requirements/rules.md`                             | 1    | Add `RN-0030`                                                             |
| `docs/requirements/functional.md`                        | 1    | Add `RF-0015`                                                             |
| `docs/glossary.md`                                       | 1    | Add the term _External document_                                          |
| `src/config/ownership.ts`                                | 2    | `AUDIENCES`, `Audience`, `parseAudience`, field in `ArtifactRule`/`DocumentRule` |
| `test/config/ownership.test.ts`                          | 2    | Parser tests                                                              |
| `test/docs/schema.test.ts`                               | 2    | The `ArtifactRule` literal gains `audience`                               |
| `docs/contracts/versioning-policy.md`                    | 2    | The `audience` key becomes public                                         |
| `src/checks/ci11-external-audience.ts`                   | 3    | Create: the check                                                         |
| `test/checks/ci11-external-audience.test.ts`             | 3    | Create: the boundary cases                                                |
| `src/checks/registry.ts`, `test/checks/registry.test.ts` | 3    | `CI-11` in `validateChecks()`                                             |
| `src/checks/catalog.ts`, `docs/contracts/checks.gen.md`  | 3    | The check's public contract                                               |
| `docs/definition-of-done.md`                             | 3    | `CI-1` to `CI-11`                                                         |
| `src/cli/init.ts`, `test/cli/init.test.ts`               | 4    | The `init` marks and warns                                                |
| `plugin/skills/release-historian/SKILL.md`               | 5    | The migration guide stops asking for the ID                               |
| `templates/migration.md`, `templates/agent-contract.md`  | 5    | Same, and the policy                                                      |
| `CLAUDE.md`                                              | 5    | The policy                                                                |
| `test/plugin/authoring.test.ts`, `test/docs/agent-contract.test.ts` | 5 | Assertions                                                          |
| `README.md`, `docs/deprecations.md`                      | 6    | Prose without IDs                                                         |
| `CHANGELOG.md`                                           | 2–6  | New entries (2–5) and prose without IDs (6)                               |
| `docs/.ownership.yml`, `test/docs/release-history.test.ts` | 7  | Marking of this repository                                                |

---

### Task 1: The decision and the rule (`M-1`, `M-2`, `M-3`, `M-4`)

**Files:**
- Create: `docs/decisions/adr/ADR-0017-reader-boundary.md`
- Modify: `docs/requirements/rules.md` (end of file, after `RN-0029`; `last-reviewed`)
- Modify: `docs/requirements/functional.md` (end of file, after `RF-0014`; `last-reviewed`)
- Modify: `docs/glossary.md` (last row of the table; `last-reviewed`)

**Interfaces:**
- Consumes: nothing.
- Produces: the IDs `ADR-0017`, `RN-0030`, `RF-0015`, which the following tasks cite in tests, in finding messages and in commits. The key name, `audience`, with the values `internal` and `external`.

- [ ] **Step 1: Create the ADR**

Create `docs/decisions/adr/ADR-0017-reader-boundary.md` with exactly:

```markdown
---
id: ADR-0017
title: 'Reader boundary: artifact ID is internal trail'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-15
relates-to: [RN-0030, RF-0015, RN-0013, RN-0007]
supersedes: null
superseded-by: null
---

# ADR-0017 — Reader boundary: artifact ID is internal trail

## Context

The toolkit spec orders items to be cited by ID uniformly — in code, tests,
documents and commit messages — and orders the migration guide to point to the ADR
that decided the break. Neither passage distinguishes who is reading.

Inside the repository, this is what makes traceability navigable: `RN-0007`
demands that every citation resolve, and whoever maintains the code follows the ID
to the artifact. Outside it, the same ID is noise. Whoever reads the README to
decide whether to install, the CHANGELOG to decide whether to update, or a
migration guide to get across a break has no way to know what `RNF-0006` means —
and, for whoever installs the package or the plugin, `docs/` may not even be at
hand. The result is documents written for outsiders carrying references that only
resolve from the inside.

`RN-0013` already drew a similar boundary for the CHANGELOG: the entry is aimed at
whoever consumes, and what only makes sense to whoever wrote the code does not
belong in it. An artifact ID is exactly that.

## Alternatives considered

- **Keep the citation uniform.** Discarded: it is the problem. The outside text
  keeps depending on an internal document to make sense.
- **Allow the ID as long as it comes with a link to the artifact.** Discarded: the
  link resolves, but it takes the visitor to an internal decision document,
  written for whoever maintains the repository, and the outside text comes to
  depend on the inside one to make sense. For the same reason, an ID in the path
  of a link counts as a citation, even when it does not appear in the rendered
  text.
- **Human-only verification, in the skill's checklist.** Discarded: the text in
  question is precisely what skill and agent write on their own, and the uniform
  citation is the habit they learned. The ID comes back without anyone seeing it.
- **A top-level `external-docs:` list**, on the model of `consumer-visible-paths`.
  Discarded: it is a second list of paths to diverge from `documents:`, and the
  repository has already needed a test just to keep two such lists from
  drifting.
- **Reuse `role`.** Discarded: the vocabulary of `role` is closed and holds "one
  role, one document" (`ADR-0008`); it does not mark CHANGELOG, migration guides
  and README at the same time.

## Decision

A document or artifact declared `audience: external` does not cite artifact IDs.
The link between it and the artifact keeps existing, and lives on the inside: in
the artifact itself, while it is still editable, or in the commit message that
wrote the outside text. The identifiers of the public interface — `CI-n`,
`HK-n`, `SK-n`, `CM-n`, `EXIT-n` — remain citable: they are the ones the CLI
output already shows to outsiders, and the ones the versioning policy promises
not to redefine.

The mark is one key per entry, in `documents:` and in `artifacts:`; without it,
the document is internal. Internal is the prefix declared in `artifacts:`, and
only that: the verification carries no list of prefixes, so a project that
declares a new family gets the boundary in the same commit, and a project that has
not yet declared a family is not charged for a stray ID of it — the same boundary
that `RN-0007` already uses. `CI-11` fails with error severity and without an
exception label: the fix is always to rewrite, in running text, what the item
decides or demands.

**This ADR does not amend the toolkit spec, and the reason is one of substance.**
The uniform citation remains valid in everything that is internal — artifact,
test, code, commit message —, which is almost everything. The boundary is a cut on
the outside, not a reversal of the rule; amending the spec to say "uniform,
except…" would trade a simple rule for a rule with an exception in the place
where it is most read.

## Consequences

### What is gained

Whoever reads from the outside receives text that stands on its own. The boundary
comes out of the configuration that already exists — `artifacts:` says what is
internal, and the public interface stays out without any written exception — and
it is verified in CI, not remembered in a checklist.

### What is accepted as lost

**Whoever reads from the outside and wants the why loses the shortcut.** The path
goes from the inside to the outside, not the other way around.

**The link between migration guide and ADR comes to live in the commit message.**
An accepted ADR is frozen by `HK-1` and cannot gain the citation to a guide
written after it; the commit that creates the guide cites the ADR. The
verification of this link was human and remains human — enforcement is not lost,
but the link becomes less visible.

**An already installed repository is not verified** until it marks its own
documents by hand: the `init` warns, and does not rewrite the line.

**The toolkit spec keeps stating uniformity.** Whoever reads only the spec does
not see the boundary without going through this ADR.

**The README and the CHANGELOG of this repository are rewritten** in running text
where they cited IDs.
```

- [ ] **Step 2: Add `RN-0030` to the end of `docs/requirements/rules.md`**

Replace `last-reviewed: 2026-08-27` with `last-reviewed: 2026-09-15` in the frontmatter and add, after the last paragraph of `RN-0029`, a blank line and:

```markdown
## RN-0030 — A document for outsiders does not cite artifact IDs

- **status:** draft
- **relates-to:** ADR-0017, RN-0013
- **out of scope:** the identifiers of the public interface, which the versioning policy declares; the frontmatter, which is a machine contract and belongs to `CI-1`; and the fenced code block, which is an example

The body of a document or artifact declared `audience: external` contains no
citation of a prefix declared in `artifacts:` — neither in prose, nor between
backticks, nor in the path of a link. Whoever reads from the outside has no way to
resolve the ID, and a link to the artifact takes them to a document written for
whoever maintains the repository.

The link that the ID would carry is not lost: it exists and lives on the inside,
in the artifact itself or in the commit message. Every citation of a declared
prefix counts — the one that resolves, the retired one and the one that does not
resolve —, because the rule is about what the reader sees, and not about the item
existing.
```

- [ ] **Step 3: Add `RF-0015` to the end of `docs/requirements/functional.md`**

Replace `last-reviewed: 2026-08-27` with `last-reviewed: 2026-09-15` and add, after the last paragraph of `RF-0014`, a blank line and:

```markdown
## RF-0015 — `init` marks as external what is written for outsiders

- **status:** draft
- **relates-to:** RF-0009, RF-0012, RN-0030
- **out of scope:** the `README.md` of whoever installs, which the `init` does not declare as documentation and does not start declaring because of this

At the `production` stage onward, a new installation declares `CHANGELOG.md`,
`docs/deprecations.md`, `docs/migrations/` and the `REL` artifact with
`audience: external`. It is the historical trail, and it is written for whoever
consumes.

In a repository that already declares these entries without the mark, the `init`
does not rewrite the line: it reports, among what it did not install, each entry
declared without the mark, saying that marking it is what turns verification on
for it. It is the same policy as when it adds to `.ownership.yml` and to
CODEOWNERS: what is already written belongs to whoever wrote it.
```

- [ ] **Step 4: Add the term to the glossary**

In `docs/glossary.md`, replace `last-reviewed: 2026-08-27` with `last-reviewed: 2026-09-15` and add this row right after the row of `Payment trigger` (the last one in the table):

```markdown
| External document | Document or artifact declared `audience: external`, written for whoever reads the repository without taking part in it | `audience` | `consumer-visible` path — which is **code** whose change demands a CHANGELOG entry, and not a document | ADR-0017, RN-0030 | active |
```

`active`, and not `draft`: it is deviation 1 of this plan.

- [ ] **Step 5: Format**

Run: `npx prettier --write docs/decisions/adr/ADR-0017-reader-boundary.md docs/requirements/rules.md docs/requirements/functional.md docs/glossary.md`
Expected: the four listed files. The glossary table is realigned.

- [ ] **Step 6: Verify**

Run: `npm test && node src/cli/index.ts validate`
Expected: all tests pass, including `RN-0011` (glossary) and `RN-0010` (agent contract); `living-docs: no violation found.` If `CI-2` reports a citation that does not resolve, the ID typed in `relates-to` is wrong.

- [ ] **Step 7: Commit**

```bash
git add docs/decisions/adr/ADR-0017-reader-boundary.md docs/requirements/rules.md docs/requirements/functional.md docs/glossary.md
git commit -F - <<'EOF'
docs(ADR-0017): records the reader boundary and the rules it asks for

Born here: the decision that text written for outsiders does not cite artifact
IDs, the rule RN-0030 that makes it verifiable, the RF-0015 that says what
the init marks, and the term "External document". Everything is born draft, except the term,
which follows the term lifecycle of the toolkit spec.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: `audience` in `.ownership.yml` (`M-5`, `M-8` parser, `M-7` policy)

**Files:**
- Modify: `src/config/ownership.ts`
- Modify: `test/config/ownership.test.ts` (append at the end)
- Modify: `test/docs/schema.test.ts:20-34` (the `rule` function)
- Modify: `docs/contracts/versioning-policy.md` (section "What is public"; `last-reviewed`)
- Modify: `CHANGELOG.md` (end of `### Added` in `## [Unreleased]`)

**Interfaces:**
- Consumes: no code.
- Produces, exported from `src/config/ownership.ts`:
  - `export const AUDIENCES = ['internal', 'external'] as const`
  - `export type Audience = (typeof AUDIENCES)[number]`
  - `ArtifactRule.audience: Audience`
  - `DocumentRule.audience: Audience`
  - Absent → `'internal'`. Value outside the vocabulary → `OwnershipError` whose message contains `Valid: internal, external`.

- [ ] **Step 1: Write the failing tests**

Append to the end of `test/config/ownership.test.ts`:

```ts
const COM_AUDIENCE = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
  - id-prefix: REL
    path: docs/releases/
    owner: "@team"
    skill: release-historian
    audience: external
documents:
  - path: CONTRIBUTING.md
    owner: "@team"
  - path: CHANGELOG.md
    owner: "@team"
    skill: release-historian
    audience: external
`

test('ADR-0017: absent audience is internal — no .ownership.yml written before changes meaning', () => {
  const config = parseOwnership(COM_AUDIENCE)

  assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'ADR')?.audience, 'internal')
  assert.equal(config.documents.find(document => document.path === 'CONTRIBUTING.md')?.audience, 'internal')
  assert.ok(parseOwnership(VALID).artifacts.every(artifact => artifact.audience === 'internal'))
})

test('ADR-0017: audience external is read in artifacts: and in documents:', () => {
  const config = parseOwnership(COM_AUDIENCE)

  assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')
  assert.equal(config.documents.find(document => document.path === 'CHANGELOG.md')?.audience, 'external')
})

test('ADR-0017: audience outside the vocabulary is an error and names the valid ones', () => {
  // The REL artifact is the only one followed by `documents:`; CHANGELOG is the last line of the YAML.
  const noArtefato = COM_AUDIENCE.replace('audience: external\ndocuments:', 'audience: public\ndocuments:')
  const noDocumento = COM_AUDIENCE.replace(/audience: external\n$/, 'audience: public\n')

  assert.notEqual(noDocumento, COM_AUDIENCE, 'the document replace must match')
  assert.notEqual(noArtefato, COM_AUDIENCE, 'the artifact replace must match')
  for (const source of [noDocumento, noArtefato]) {
    assert.throws(
      () => parseOwnership(source),
      (err: unknown) => err instanceof OwnershipError && /audience "public"/.test(err.message) && /internal, external/.test(err.message),
    )
  }
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `node --test test/config/ownership.test.ts`
Expected: FAIL in the three new tests (`audience` is `undefined`, and the invalid value does not throw).

- [ ] **Step 3: Implement in the parser**

In `src/config/ownership.ts`, right after `export type Collection = 'per-file' | 'table' | 'sections'`, add:

```ts
/**
 * Who reads a document or artifact (`ADR-0017`).
 *
 * Closed vocabulary, in the same design as `DOCUMENT_ROLES`: it is what lets
 * `CI-11` find the text written for outsiders without knowing any
 * path. When absent, it is `internal` — no `.ownership.yml` written before changes
 * meaning.
 */
export const AUDIENCES = ['internal', 'external'] as const
export type Audience = (typeof AUDIENCES)[number]
```

In `interface ArtifactRule`, after `states: string[] | null`:

```ts
  /** Who reads this artifact (`ADR-0017`). `external` turns `CI-11` on for it. */
  audience: Audience
```

In `interface DocumentRule`, after `role: DocumentRole | null`:

```ts
  /** Who reads this document (`ADR-0017`). `external` turns `CI-11` on for it. */
  audience: Audience
```

Right after the `requireString` function, add:

```ts
function parseAudience(raw: unknown, where: string): Audience {
  if (raw === undefined) {
    return 'internal'
  }
  if (!AUDIENCES.includes(raw as Audience)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.audience "${String(raw)}" unknown. Valid: ${AUDIENCES.join(', ')}.`)
  }

  return raw as Audience
}
```

In the `return` of `parseArtifact`, after `states,`:

```ts
    audience: parseAudience(item.audience, where),
```

In the `return` of `parseDocument`, after `role: role === undefined ? null : (role as DocumentRole),`:

```ts
    audience: parseAudience(item.audience, where),
```

- [ ] **Step 4: Adjust the `ArtifactRule` literal in `test/docs/schema.test.ts`**

In the `rule` function, after `states: null,`:

```ts
    audience: 'internal',
```

- [ ] **Step 5: Run and watch it pass**

Run: `node --test test/config/ownership.test.ts test/docs/schema.test.ts && npm run typecheck`
Expected: PASS and `tsc` without errors.

- [ ] **Step 6: Make the key public in the versioning policy**

In `docs/contracts/versioning-policy.md`, replace `last-reviewed: 2026-08-25` with `last-reviewed: 2026-09-15` and add, right after the item that ends in `` `docs/.ownership.yml` (`ADR-0006`). `` in the section `## What is public`:

```markdown
- The `audience` key of `documents:` and of `artifacts:` in
  `docs/.ownership.yml`, and the two values it accepts: `internal`, which is the
  default, and `external`, which marks text written for those who read from the
  outside (`ADR-0017`).
```

- [ ] **Step 7: CHANGELOG entry**

In `CHANGELOG.md`, add to the end of the `### Added` list of `## [Unreleased]`, right before the `### Changed` line, with a blank line before the heading:

```markdown
- `audience` in `documents:` and in `artifacts:` of `docs/.ownership.yml`:
  declares who reads the document. It accepts `internal` and `external`; when absent, it is
  `internal`, and no `.ownership.yml` already written changes meaning.
```

- [ ] **Step 8: Format and verify**

Run: `npx prettier --write src/config/ownership.ts test/config/ownership.test.ts test/docs/schema.test.ts docs/contracts/versioning-policy.md CHANGELOG.md && npm test && node src/cli/index.ts validate`
Expected: all tests pass; `no violation found`.

- [ ] **Step 9: Commit**

```bash
git add src/config/ownership.ts test/config/ownership.test.ts test/docs/schema.test.ts docs/contracts/versioning-policy.md CHANGELOG.md
git commit -F - <<'EOF'
feat(ADR-0017): .ownership.yml accepts audience in documents: and artifacts:

Closed vocabulary, internal or external, with internal as the default: no
.ownership.yml written before changes meaning. The key enters the versioning
policy as public interface.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: `CI-11` — external audience (`M-6`, `M-8` check, `M-7` catalog)

**Files:**
- Create: `src/checks/ci11-external-audience.ts`
- Create: `test/checks/ci11-external-audience.test.ts`
- Modify: `src/checks/registry.ts` (import and `validateChecks`)
- Modify: `test/checks/registry.test.ts:28-54`
- Modify: `src/checks/catalog.ts` (new entry at the end)
- Regenerate: `docs/contracts/checks.gen.md`
- Modify: `docs/definition-of-done.md:30` (and `last-reviewed`)
- Modify: `CHANGELOG.md` (end of `### Added`)

**Interfaces:**
- Consumes: `Audience` and `ArtifactRule.audience`/`DocumentRule.audience` (Task 2); `CheckContext`, `Finding`, `Check` from `src/core/types.ts`; `stripFences(source: string): string` from `src/docs/markdown.ts`; `findCitations(source: string, format: IdFormat): Citation[]` from `src/ids/citations.ts`; `parseId(value: unknown, format: IdFormat): { prefix: string; number: number } | null` from `src/docs/schema.ts`; `Frontmatter` (with `endLine: number`, 1-indexed, the line of the closing `---`) from `src/frontmatter/parse.ts`.
- Produces, exported from `src/checks/ci11-external-audience.ts`:
  - `export const ci11ExternalAudience: Check` with `id: 'CI-11'` and `name: 'external audience'`
  - `export interface ExternalText { file: string; source: string; frontmatter: Frontmatter | null }`
  - `export function externalTexts(context: CheckContext): ExternalText[]`
  - `export function bodyOf(source: string, frontmatter: Frontmatter | null): string`

- [ ] **Step 1: Write the check tests**

Create `test/checks/ci11-external-audience.test.ts`:

````ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci11ExternalAudience } from '../../src/checks/ci11-external-audience.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import type { Finding } from '../../src/core/types.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

// ADR, RN and REL are internal because they are declared. TDR, on purpose, is not
// declared: it is the case of the project that has not installed the family yet.
const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    collection: sections
  - id-prefix: REL
    path: docs/releases/
    owner: "@team"
    skill: release-historian
    audience: external
documents:
  - path: CHANGELOG.md
    owner: "@team"
    skill: release-historian
    audience: external
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
`

function findingsFor(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []

  withTempRepo(files, root => {
    const config = parseOwnership(OWNERSHIP)

    findings = ci11ExternalAudience.run({
      root,
      config,
      docs: collectArtifacts(root, config),
      documents: collectDocuments(root, config),
      today: '2026-09-15',
    })
  })

  return findings
}

const changelog = (...entries: string[]): string => ['# Changelog', '', '## [Unreleased]', '', ...entries, ''].join('\n')

const releaseNote = (frontmatterExtra: string[], body: string[]): string =>
  [
    '---',
    'id: REL-0001',
    'title: v1.0.0',
    'status: draft',
    'owner: "@team"',
    'trigger: Never. Frozen once published.',
    ...frontmatterExtra,
    'last-reviewed: 2026-09-15',
    '---',
    '',
    ...body,
    '',
  ].join('\n')

test('RN-0030: artifact ID in prose, in an external document, fails on the right line', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- The rule RN-0001 starts to apply.') })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'CI-11')
  assert.equal(findings[0]?.severity, 'error')
  assert.equal(findings[0]?.file, 'CHANGELOG.md')
  assert.equal(findings[0]?.line, 5)
  assert.match(findings[0]?.message ?? '', /RN-0001/)
})

test('RN-0030: ID between backticks fails — inline markup does not hide what the reader sees', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- Decided in `ADR-0003`.') })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0003/)
})

test('RN-0030: ID only in the path of a link fails, even outside the rendered text', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- See [the decision](docs/decisions/adr/ADR-0003-two-roots.md).') })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0003/)
})

test('RN-0030: ID inside a fenced code block passes — it is an example', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('```text', 'RN-0001', '```') }), [])
})

test('RN-0030: ID only in the frontmatter of an external artifact passes — it is a machine contract', () => {
  const nota = releaseNote(['relates-to: [ADR-0003]'], ['# v1.0.0', '', 'Nothing changes for whoever uses it.'])

  assert.deepEqual(findingsFor({ 'docs/releases/REL-0001-v1.md': nota }), [])
})

test('RN-0030: public interface identifier cited in an external document passes', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('- `CI-11` fails, `HK-6` warns, and the exit code is `EXIT-2`.') }), [])
})

test('RN-0030: the same ID in an internal document passes', () => {
  assert.deepEqual(findingsFor({ 'CONTRIBUTING.md': '# How to contribute\n\nThe rule RN-0001 and the `ADR-0003`.\n' }), [])
})

test('RN-0030: ID of a prefix not declared in artifacts: passes — the check knows no prefix', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('- Pays off `TDR-0001` and follows ISO-8601.') }), [])
})

test('RN-0030: in a document with frontmatter, the reported line is the file line', () => {
  const nota = releaseNote([], ['# v1.0.0', '', 'Fixes what RN-0001 required.'])
  const findings = findingsFor({ 'docs/releases/REL-0001-v1.md': nota })

  // 8 lines of frontmatter, one blank, the title, another blank: line 12.
  assert.equal(findings.length, 1, 'the frontmatter id: REL-0001 must not become a finding')
  assert.equal(findings[0]?.file, 'docs/releases/REL-0001-v1.md')
  assert.equal(findings[0]?.line, 12)
})

test('RN-0030: artifact with broken frontmatter is skipped — CI-1 already fails', () => {
  const quebrada = ['---', 'id: [REL-0001', 'title: v1.0.0', '---', '', 'Fixes RN-0001.', ''].join('\n')

  assert.deepEqual(findingsFor({ 'docs/releases/REL-0001-v1.md': quebrada }), [])
})
````

Line count of case 9, which is what locks `bodyOf`: `---` (1), `id` (2), `title` (3), `status` (4), `owner` (5), `trigger` (6), `last-reviewed` (7), `---` (8), blank (9), `# v1.0.0` (10), blank (11), the sentence (12).

- [ ] **Step 2: Update the registry test**

In `test/checks/registry.test.ts`, in the `esperado` object, after `'CI-10': 'living-docs validate',`:

```ts
    'CI-11': 'living-docs validate',
```

And replace the last assertion with:

```ts
  assert.deepEqual(semDiff, ['CI-1', 'CI-2', 'CI-3', 'CI-4', 'CI-7', 'CI-8', 'CI-9', 'CI-10', 'CI-11'])
```

- [ ] **Step 3: Run and watch it fail**

Run: `node --test test/checks/ci11-external-audience.test.ts test/checks/registry.test.ts`
Expected: FAIL. The first file, with `ERR_MODULE_NOT_FOUND` for `ci11-external-audience.ts`; the registry, because `CI-11` is neither in the catalog nor in `validateChecks()`.

- [ ] **Step 4: Implement the check**

Create `src/checks/ci11-external-audience.ts`:

```ts
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { stripFences } from '../docs/markdown.ts'
import { parseId } from '../docs/schema.ts'
import type { Frontmatter } from '../frontmatter/parse.ts'
import { findCitations } from '../ids/citations.ts'

const RULE = 'CI-11'

export interface ExternalText {
  file: string
  source: string
  frontmatter: Frontmatter | null
}

/**
 * The text that outsiders read: documents and artifacts declared
 * `audience: external` (`ADR-0017`).
 *
 * An artifact with broken frontmatter is left out: `CI-1` already fails, and reading the
 * broken block as body would produce a second finding about the `id:` itself.
 */
export function externalTexts(context: CheckContext): ExternalText[] {
  const texts: ExternalText[] = []

  for (const doc of context.docs) {
    if (doc.rule.audience !== 'external' || doc.syntaxError !== null) {
      continue
    }
    texts.push({ file: doc.file, source: doc.source, frontmatter: doc.frontmatter })
  }

  for (const document of context.documents) {
    if (document.rule.audience !== 'external') {
      continue
    }
    texts.push({ file: document.file, source: document.source, frontmatter: document.frontmatter })
  }

  return texts
}

/**
 * The text with the frontmatter erased **line by line**: the count stays, and
 * the finding's line is the file's line. The frontmatter is a machine contract and belongs to
 * `CI-1` (`RN-0030`).
 */
export function bodyOf(source: string, frontmatter: Frontmatter | null): string {
  const lines = source.replace(/^﻿/, '').replace(/\r\n/g, '\n').split('\n')

  if (frontmatter === null) {
    return lines.join('\n')
  }

  return lines.map((line, index) => (index < frontmatter.endLine ? '' : line)).join('\n')
}

/**
 * `CI-11` — external audience. Source rule: `RN-0030`.
 *
 * It carries no list of prefixes: internal is what `artifacts:` declares, and only
 * that. `CI-n`, `HK-n` and `EXIT-n` are not an artifact family — nobody
 * declares them there —, so they stay out without any exception needing to be
 * written; and a project that has not declared `RN` yet is not charged for a stray
 * `RN-0001`, the same boundary as `CI-2` (`RN-0007`).
 *
 * `stripFences`, and not `stripCode`: the ID between backticks is exactly what is
 * being looked for, and the example inside a fence remains an example. The ID in the
 * path of a link is caught effortlessly, because the scan is of the raw text.
 *
 * It counts any citation of a declared prefix — the one that resolves, the retired one and the
 * one that does not resolve —: the rule is about what the reader sees. No exception
 * label (`ADR-0017`).
 */
export const ci11ExternalAudience: Check = {
  id: RULE,
  name: 'external audience',
  run(context: CheckContext): Finding[] {
    const format = context.config.idFormat
    const internal = new Set(context.config.artifacts.map(artifact => artifact.idPrefix))
    const findings: Finding[] = []

    for (const text of externalTexts(context)) {
      for (const citation of findCitations(stripFences(bodyOf(text.source, text.frontmatter)), format)) {
        const parsed = parseId(citation.id, format)

        if (parsed === null || !internal.has(parsed.prefix)) {
          continue
        }

        findings.push({
          ruleId: RULE,
          file: text.file,
          line: citation.line,
          severity: 'error',
          message:
            `\`${citation.id}\` is an artifact ID, and \`${text.file}\` is read by outsiders ` +
            '(`audience: external`): that reader has no way to resolve the ID.',
          fix:
            'Write in running text what the item decides or demands, without pointing to it. The link still exists ' +
            'and lives on the inside — in the artifact itself or in the commit message (`RN-0030`, `ADR-0017`). ' +
            'There is no exception label.',
        })
      }
    }

    return findings
  },
}
```

- [ ] **Step 5: Register in `validate`**

In `src/checks/registry.ts`, after `import { ci10TriggerRouting } from './ci10-trigger-routing.ts'`:

```ts
import { ci11ExternalAudience } from './ci11-external-audience.ts'
```

And in `validateChecks`:

```ts
  return [ci1Structure, ci2Ids, ci3Traceability, ci4Staleness, ci7OwnershipCoverage(diff), ci8Links, ci9CommitDiscipline(diff), ci10TriggerRouting(), ci11ExternalAudience]
```

- [ ] **Step 6: Catalog**

In `src/checks/catalog.ts`, after the `CI-10` entry (before the final `])`):

```ts
  {
    id: 'CI-11',
    name: 'external audience',
    command: 'living-docs validate',
    failsWhen:
      'A document or artifact declared `audience: external` cites, outside the frontmatter and a fenced code block, an ID whose prefix is declared in `artifacts:` — in prose, between backticks or in the path of a link.',
  },
```

- [ ] **Step 7: Run and watch it pass**

Run: `node --test test/checks/ci11-external-audience.test.ts test/checks/registry.test.ts && npm run typecheck`
Expected: PASS in the 10 cases and in the 5 registry tests; `tsc` without errors.

- [ ] **Step 8: Regenerate the contract (Bash tool, never Edit/Write)**

Run: `node src/tools/gen-checks.ts > docs/contracts/checks.gen.md && node src/cli/index.ts drift`
Expected: `git diff docs/contracts/checks.gen.md` shows only the new `CI-11` line; `drift` says `no violation found`.

- [ ] **Step 9: Definition of Done**

In `docs/definition-of-done.md`, replace `last-reviewed: 2026-09-01` with `last-reviewed: 2026-09-15` and, on the `npm test` line, replace `` `CI-1` to `CI-10` `` with `` `CI-1` to `CI-11` ``.

- [ ] **Step 10: CHANGELOG entry**

In `CHANGELOG.md`, add to the end of `### Added` (right after the `audience` entry of Task 2):

```markdown
- `CI-11` (`living-docs validate`): a document or artifact declared
  `audience: external` cannot cite an artifact ID — in prose, between backticks or
  in the path of a link. The frontmatter and fenced code blocks stay
  out, and the identifiers of the public interface (`CI-n`, `HK-n`, `SK-n`,
  `CM-n`, `EXIT-n`) remain citable. There is no exception label: the fix is to
  rewrite in running text.
```

- [ ] **Step 11: Format and verify everything**

Run: `npx prettier --write src/checks/ci11-external-audience.ts src/checks/registry.ts src/checks/catalog.ts test/checks/ci11-external-audience.test.ts test/checks/registry.test.ts docs/definition-of-done.md CHANGELOG.md && npm test && npm run typecheck && node src/cli/index.ts validate && node src/cli/index.ts drift`
Expected: everything passes. `validate` stays clean, because nothing in this repository is marked `external` yet. If Prettier breaks the `validateChecks` line, that is fine.

- [ ] **Step 12: Commit**

```bash
git add src/checks/ci11-external-audience.ts test/checks/ci11-external-audience.test.ts src/checks/registry.ts test/checks/registry.test.ts src/checks/catalog.ts docs/contracts/checks.gen.md docs/definition-of-done.md CHANGELOG.md
git commit -F - <<'EOF'
feat(RN-0030): CI-11 fails on artifact ID in an external document

The check reads only the prefixes declared in artifacts: — no list of its own —,
ignores frontmatter and fenced blocks, counts backticks and link paths, and has no
exception label. It enters validate after CI-10, in the catalog and in the
generated contract; the Definition of Done now names CI-1 to CI-11.

Docs: none — the RN-0030 that this check verifies was born in the decision commit, before the code.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: The `init` marks the historical trail and warns (`M-9`)

**Files:**
- Modify: `src/cli/init.ts` (import; `DocumentSeed` and the three lists; `documentSeeds`; `documentEntry`; `documentsBlock`; `releasesBlock`; `runInit`; new function `reportUnmarkedExternal`)
- Modify: `test/cli/init.test.ts` (append at the end)
- Modify: `CHANGELOG.md` (end of `### Added`)

**Interfaces:**
- Consumes: `type Audience` and `ArtifactRule.audience`/`DocumentRule.audience` from `src/config/ownership.ts` (Task 2). In `test/cli/init.test.ts` there already exist `PRODUCTION`, `SMALL_TEAM`, `loadOwnership`, `runValidate`, `readFileSync`, `writeFileSync`, `join`, `withTempRepo` and `OWNERSHIP_PATH`.
- Produces: `DocumentSeed.audience: Audience` (internal to the module). The `InitResult.notInstalled` items for an entry without the mark contain the path (or `the REL artifact`), `audience: external` and `CI-11`.

- [ ] **Step 1: Write the failing tests**

Append to the end of `test/cli/init.test.ts`:

```ts
test('RF-0015: production declares the historical trail as external, and only it', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)
    const config = loadOwnership(root)
    const byPath = new Map(config.documents.map(document => [document.path, document]))

    for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
      assert.equal(byPath.get(path)?.audience, 'external', `${path} is written for whoever consumes`)
    }
    assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')

    for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md', 'CONTRIBUTING.md', 'docs/.ownership.yml']) {
      assert.equal(byPath.get(path)?.audience, 'internal', `${path} is not marked by the init`)
    }
    assert.ok(
      config.artifacts.filter(artifact => artifact.idPrefix !== 'REL').every(artifact => artifact.audience === 'internal'),
      'only REL is born external',
    )

    assert.deepEqual(result.notInstalled, [])
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0015: small-team declares nothing as external', () => {
  withTempRepo({}, root => {
    runInit(root, SMALL_TEAM)
    const config = loadOwnership(root)

    assert.ok(config.documents.every(document => document.audience === 'internal'))
    assert.ok(config.artifacts.every(artifact => artifact.audience === 'internal'))
  })
})

test('RF-0015: an entry already declared without the mark becomes a warning, and .ownership.yml is not rewritten', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    // The repository installed by an earlier version: the same entries, without the key.
    const file = join(root, OWNERSHIP_PATH)
    const semMarca = readFileSync(file, 'utf8').replace(/^ {4}audience: external\r?\n/gm, '')

    writeFileSync(file, semMarca, 'utf8')
    assert.ok(loadOwnership(root).documents.every(document => document.audience === 'internal'), 'the scenario must be without the mark')

    const changelogAntes = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
    const result = runInit(root, PRODUCTION)

    assert.equal(readFileSync(file, 'utf8'), semMarca, 'the init does not rewrite an already declared line')
    assert.equal(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), changelogAntes)

    for (const alvo of [/CHANGELOG\.md/, /docs\/deprecations\.md/, /docs\/migrations\//, /REL/]) {
      assert.ok(
        result.notInstalled.some(item => alvo.test(item) && /audience: external/.test(item) && /CI-11/.test(item)),
        `expected a warning for ${alvo} — ${JSON.stringify(result.notInstalled)}`,
      )
    }
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `node --test test/cli/init.test.ts`
Expected: FAIL in the three new tests (`audience` comes out `internal` everywhere, and no warning appears). The 60+ existing tests keep passing.

- [ ] **Step 3: The seeds gain `audience`**

In `src/cli/init.ts`, replace the type import from `../config/ownership.ts` with:

```ts
import type { Audience, DocumentRole, OwnershipConfig } from '../config/ownership.ts'
```

Replace `interface DocumentSeed` and the three lists with:

```ts
interface DocumentSeed {
  path: string
  skill: string | null
  role: DocumentRole | null
  /** `external` for what is written for outsiders (`RF-0015`). */
  audience: Audience
}

/** Declared at every stage: both are born already in `solo`. */
const BASE_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: OWNERSHIP_PATH, skill: 'living-docs-bootstrap', role: null, audience: 'internal' },
  { path: RETIRED_IDS_PATH, skill: 'living-docs-bootstrap', role: null, audience: 'internal' },
])

const SMALL_TEAM_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'CONTRIBUTING.md', skill: 'working-agreements-keeper', role: null, audience: 'internal' },
  { path: 'docs/definition-of-done.md', skill: 'working-agreements-keeper', role: 'definition-of-done', audience: 'internal' },
  { path: 'docs/glossary.md', skill: 'glossary-keeper', role: null, audience: 'internal' },
  { path: 'docs/charter/', skill: 'charter-keeper', role: null, audience: 'internal' },
])

/**
 * The historical trail is born external: it is written for whoever consumes (`RF-0015`).
 * The contracts are not — they cite their own sources, and marking them is a decision for whoever
 * maintains them.
 */
const PRODUCTION_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'docs/contracts/errors.md', skill: 'contract-keeper', role: null, audience: 'internal' },
  { path: 'docs/contracts/versioning-policy.md', skill: 'contract-keeper', role: null, audience: 'internal' },
  { path: 'CHANGELOG.md', skill: 'release-historian', role: null, audience: 'external' },
  { path: 'docs/deprecations.md', skill: 'release-historian', role: null, audience: 'external' },
  { path: 'docs/migrations/', skill: 'release-historian', role: null, audience: 'external' },
])
```

In `documentSeeds`, the agent contract seed becomes:

```ts
    { path: agentContractPath(root), skill: 'working-agreements-keeper', role: 'agent-contract', audience: 'internal' },
```

- [ ] **Step 4: Write the key into the YAML**

In `documentEntry`, before the `return`:

```ts
  if (seed.audience === 'external') {
    lines.push('    audience: external')
  }
```

In `documentsBlock`, after the line ``'# `role` is a closed vocabulary: agent-contract, definition-of-done.',``:

```ts
    '# `audience` says who reads: absent is internal; external turns on CI-11, which fails artifact IDs in the text.',
```

In `releasesBlock`, the array becomes:

```ts
    [
      '  - id-prefix: REL',
      `    path: ${path}`,
      `    owner: "${owner}"`,
      '    skill: release-historian',
      '    # The release note is read by whoever consumes: CI-11 demands that it not cite artifact IDs.',
      '    audience: external',
      '    # A published release note is frozen by HK-1 (spec §5, SK-7, rule 4).',
      '    append-only: true',
      '    mutable-fields: [status, last-reviewed]',
    ].join('\n') +
```

- [ ] **Step 5: Warn, without rewriting**

In `runInit`, replace the final block:

```ts
  if (existing !== null) {
    declareDocuments(root, options, result, existing)
  }
```

with:

```ts
  if (existing !== null) {
    declareDocuments(root, options, result, existing)
    reportUnmarkedExternal(root, options.stage, result, existing)
  }
```

And add, right after the `declareDocuments` function:

```ts
/**
 * Reports the already declared entry that this stage would mark as external and that
 * is not marked (`RF-0015`).
 *
 * It does not rewrite the line: same policy as `declareDocuments`,
 * `declareArtifacts` and `declareCodeowners`. The entry belongs to whoever wrote it, and
 * marking it turns `CI-11` on over a text that perhaps still cites IDs — the decision belongs to
 * whoever answers for it.
 */
function reportUnmarkedExternal(root: string, stage: Stage, result: InitResult, existing: OwnershipConfig): void {
  for (const seed of documentSeeds(root, stage)) {
    if (seed.audience !== 'external') {
      continue
    }
    const declared = existing.documents.find(document => document.path === seed.path)

    if (declared !== undefined && declared.audience !== 'external') {
      result.notInstalled.push(unmarkedExternal(`\`${seed.path}\` in documents:`))
    }
  }

  const rel = existing.artifacts.find(artifact => artifact.idPrefix === 'REL')

  if (reaches(stage, 6) && rel !== undefined && rel.audience !== 'external') {
    result.notInstalled.push(unmarkedExternal('the REL artifact in artifacts:'))
  }
}

function unmarkedExternal(what: string): string {
  return (
    `audience: external for ${what}, in ${OWNERSHIP_PATH} — the entry was already declared without the mark, ` +
    'and the init does not rewrite an already written line; marking it is what turns CI-11 on for it'
  )
}
```

- [ ] **Step 6: Run and watch it pass**

Run: `node --test test/cli/init.test.ts test/cli/init-enforcement.test.ts test/acceptance/consumer-repo.test.ts && npm run typecheck`
Expected: PASS in everything, including `RF-0009: production leaves nothing of spec §10 out` (a new installation warns about nothing) and the consumer acceptance (a second run in a repository written by this version does not warn either).

- [ ] **Step 7: CHANGELOG entry**

In `CHANGELOG.md`, add to the end of `### Added`:

```markdown
- `living-docs init --stage production` now declares `CHANGELOG.md`,
  `docs/deprecations.md`, `docs/migrations/` and the release notes with
  `audience: external`. In a repository that already declares these entries without the
  mark, the `init` does not rewrite the line: it warns, among what it did not install, that
  marking it is what turns `CI-11` on for it.
```

- [ ] **Step 8: Format and verify**

Run: `npx prettier --write src/cli/init.ts test/cli/init.test.ts CHANGELOG.md && npm test && node src/cli/index.ts validate`
Expected: everything passes.

- [ ] **Step 9: Commit**

```bash
git add src/cli/init.ts test/cli/init.test.ts CHANGELOG.md
git commit -F - <<'EOF'
feat(RF-0015): production init marks the historical trail as external

CHANGELOG, deprecations, migrations and the REL artifact are born audience: external.
In an .ownership.yml that already declares these entries without the mark, the init warns
in notInstalled and does not rewrite the line.

Docs: none — the RF-0015 that this behavior fulfills was born in the decision commit, before the code.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Skill, templates and agent contract (`M-10`, `M-11`)

**Files:**
- Modify: `plugin/skills/release-historian/SKILL.md` (step 5 of the Procedure; Checklist)
- Modify: `templates/migration.md` (the comment of `## Why`)
- Modify: `templates/agent-contract.md` (end of the `## Policy` section)
- Modify: `CLAUDE.md` (section `## Policy`)
- Modify: `test/plugin/authoring.test.ts` (append at the end)
- Modify: `test/docs/agent-contract.test.ts` (append at the end)
- Modify: `CHANGELOG.md` (end of `### Changed`)

**Interfaces:**
- Consumes: `CI-11` exists and runs in `validate` (Task 3).
- Produces: no code symbol.

- [ ] **Step 1: Write the failing tests**

Append to the end of `test/plugin/authoring.test.ts`:

```ts
test('RN-0030: release-historian does not ask the migration guide to point to the ADR by ID', () => {
  const source = skillSource('release-historian')

  assert.doesNotMatch(source, /pointing to the ADR/, 'the guide is read by outsiders: the why goes in running text')
  assert.match(source, /commit that creates the guide cites the ADR/, 'the link comes to live in the commit')
  assert.match(source, /CI-11/, 'the checklist names who verifies')
})

test('RN-0030: the migration template asks for the why in running text, not the ADR ID', () => {
  const template = readFileSync(join(ROOT, 'templates/migration.md'), 'utf8')

  assert.doesNotMatch(template, /The ADR that decided\./)
  assert.match(template, /commit that creates the guide cites the ADR/)
})
```

Append to the end of `test/docs/agent-contract.test.ts`:

```ts
test('RN-0030: the agent contract and its template say that text for outsiders carries no ID, and who enforces it', () => {
  const template = readFileSync(join(ROOT, 'templates/agent-contract.md'), 'utf8')

  for (const [nome, fonte] of [
    ['CLAUDE.md', CONTRATO],
    ['templates/agent-contract.md', template],
  ] as const) {
    assert.match(fonte, /readers on the outside/, `${nome} without the reader boundary policy`)
    assert.match(fonte, /CI-11/, `${nome} without naming who enforces it`)
  }
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `node --test test/plugin/authoring.test.ts test/docs/agent-contract.test.ts`
Expected: FAIL in the three new tests.

- [ ] **Step 3: The skill**

In `plugin/skills/release-historian/SKILL.md`, replace step 5:

```markdown
5. **Migration guide for each breaking change**, in
   `docs/migrations/`, pointing to the ADR that decided it. A break without an ADR is a decision
   without a why — the path is `/adr` first.
```

with:

```markdown
5. **Migration guide for each breaking change**, in
   `docs/migrations/`. The guide says, in running text, why the break was
   decided — without the ADR ID, because whoever reads it is on the outside —, and the
   commit that creates the guide cites the ADR. A break without an ADR is a decision without a why — the
   path is `/adr` first.
```

In the Checklist, replace the line:

```markdown
- [ ] Every breaking change has a migration guide pointing to the ADR — verification: human.
```

with these two:

```markdown
- [ ] Every breaking change has a migration guide that says in running text why it was decided, and the commit that creates it cites the ADR — verification: human.
- [ ] No external document cites an artifact ID — verification: `CI-11`.
```

- [ ] **Step 4: The migration template**

In `templates/migration.md`, replace:

```markdown
<!-- The ADR that decided. Migration without a recorded decision is a break without a why. -->
```

with:

```markdown
<!-- In running text, what was decided and why — without the ADR ID: whoever reads this guide is on the outside. The commit that creates the guide cites the ADR. Migration without a recorded decision is a break without a why. -->
```

- [ ] **Step 5: The agent contract**

In `CLAUDE.md`, add right after the policy item that starts with `- **A change visible to whoever consumes travels with an entry in` and ends in `the format of the label is in the contract.`:

```markdown
- **Text for readers on the outside carries no artifact ID.** What is marked
  `audience: external` explains in running text; the link stays in the artifact or
  in the commit — `CI-11` enforces it.
```

In `templates/agent-contract.md`, add the same item as the last one of the `## Policy` section, right after `- **A conscious shortcut becomes a \`TDR\`** (\`/debt\`) with an observable payment trigger.`.

Run: `wc -l CLAUDE.md`
Expected: at most 60.

- [ ] **Step 6: Run and watch it pass**

Run: `node --test test/plugin/authoring.test.ts test/docs/agent-contract.test.ts test/docs/maintenance.test.ts`
Expected: PASS, including `RN-0020: the agent contract remains an index — no sentence copied from an owning artifact`.

- [ ] **Step 7: CHANGELOG entry**

In `CHANGELOG.md`, add to the end of the `### Changed` list of `## [Unreleased]`, right before the `### Fixed` line, with a blank line before the heading:

```markdown
- The `release-historian` skill and the migration guide template stop asking
  the guide to point to the decision by ID: the guide says, in running text, why the
  break was decided, and the commit that creates it cites the decision. The agent contract
  seeded by the `init` gains the same policy.
```

- [ ] **Step 8: Format and verify**

Run: `npx prettier --write plugin/skills/release-historian/SKILL.md CLAUDE.md test/plugin/authoring.test.ts test/docs/agent-contract.test.ts CHANGELOG.md && npm test && node src/cli/index.ts validate`
Expected: everything passes (`templates/` is ignored by Prettier on purpose). `CI-7` and `CI-10` remain clean.

- [ ] **Step 9: Commit**

```bash
git add plugin/skills/release-historian/SKILL.md templates/migration.md templates/agent-contract.md CLAUDE.md test/plugin/authoring.test.ts test/docs/agent-contract.test.ts CHANGELOG.md
git commit -F - <<'EOF'
docs(ADR-0017): skill, migration template and agent contract stop asking for the ADR ID

The migration guide explains in running text why the break was decided, and
the commit that creates it cites the ADR. The agent contract, here and in the template,
gains the policy, worded without repeating RN-0030.

Docs: none — the skill changes the text it writes for outsiders, and not how one works in this repository.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: The prose of this repository (`M-12`)

**Files:**
- Modify: `README.md` (lines 71–73 and 130–132)
- Modify: `CHANGELOG.md` (lines 13–15, 90–91, 100–101, 106, 159–160 — the numbers may have moved with Tasks 2–5; find them by the text)
- Modify: `docs/deprecations.md:12-15` (and `last-reviewed`)

**Interfaces:**
- Consumes: the CHANGELOG entries of Tasks 2–5, which were already born without IDs.
- Produces: README, CHANGELOG and deprecations without citation of an `artifacts:` prefix, a precondition of Task 7.

- [ ] **Step 1: Record the starting state**

Run: `grep -nE "\b(ADR|DA|TDR|RF|RNF|RN|REL)-[0-9]{3,4}\b" README.md CHANGELOG.md docs/deprecations.md`
Expected: exactly the 8 occurrences of the `M-12` table in the spec (README 2, CHANGELOG 5 lines, deprecations 1). If another one shows up, it came from an earlier Task: rewrite it too.

- [ ] **Step 2: README**

Replace:

```markdown
The toolkit source and the validated repository are independent roots
(`ADR-0003`): the first comes from the path of the code itself, the second from the
working directory or from `LIVING_DOCS_REPO_ROOT`.
```

with:

```markdown
The toolkit source and the validated repository are independent roots, and
neither is deduced from the other: the first comes from the path of the code itself, the
second from the working directory or from `LIVING_DOCS_REPO_ROOT`.
```

Replace:

```markdown
There is a second execution path, for whoever prefers a predictable environment to
installing Node (`RNF-0006`). `bin/dev` takes a command and runs it inside the
container, bringing it up when needed:
```

with:

```markdown
There is a second, optional execution path, for whoever prefers a predictable
environment to installing Node. `bin/dev` takes a command and runs it inside the
container, bringing it up when needed:
```

If `README.md` opens with frontmatter, update its `last-reviewed` to `2026-09-15`.

- [ ] **Step 3: CHANGELOG**

Five replacements, all inside `## [Unreleased]`:

(a) Replace:

```markdown
  took and what the declared ceiling is (`RNF-0005`). The measurement does not change the exit
  code.
```

with:

```markdown
  took and what the declared ceiling is. The measurement does not change the exit code.
```

(b) Replace:

```markdown
  or `bin/dev` alone for a shell. It requires the Docker daemon; the
  registration path remains the host's Node (`RNF-0006`, `ADR-0016`).
```

with:

```markdown
  or `bin/dev` alone for a shell. It requires the Docker daemon; the
  registration path remains the host's Node, and the hooks never enter the container.
```

(c) Replace:

```markdown
  remain in the repository, now as the optional execution path described
  above — recorded in `ADR-0015` and `ADR-0016`.
```

with:

```markdown
  remain in the repository, now as the optional execution path described
  above.
```

(d) Replace:

```markdown
  new one; the `living-docs` command itself does not change. Recorded in `ADR-0014`.
```

with:

```markdown
  new one; the `living-docs` command itself does not change.
```

(e) Replace:

```markdown
- The `CI-7` messages about a broken `watches` link now cite
  `RN-0008`, the rule that actually governs the code→doc link.
```

with:

```markdown
- The `CI-7` messages about a broken `watches` link now point to
  the rule that actually governs the code→doc link: watched path and owning
  document travel in the same commit.
```

`TDR-nnnn` (around line 63) is not a citation — `nnnn` does not match the pattern — and stays.

- [ ] **Step 4: Deprecations**

In `docs/deprecations.md`, replace `last-reviewed: 2026-08-26` with `last-reviewed: 2026-09-15` and replace:

```markdown
A deprecation records four things, without exception: the date of the announcement, the
version or date of removal, the replacement, and the link to the migration guide
(`RN-0015`). Missing any one of them, it is not a deprecation — it is a break in
compatibility, and it goes through an ADR.
```

with:

```markdown
A deprecation records four things, without exception: the date of the announcement, the
version or date of removal, the replacement, and the link to the migration guide.
Missing any one of them, it is not a deprecation — it is a break in compatibility, and it goes
through an ADR.
```

- [ ] **Step 5: Verify that nothing is left**

Run: `grep -nE "\b(ADR|DA|TDR|RF|RNF|RN|REL)-[0-9]{3,4}\b" README.md CHANGELOG.md docs/deprecations.md; ls docs/migrations docs/releases`
Expected: the `grep` prints nothing; the two directories only have `.gitkeep`.

- [ ] **Step 6: Format and verify**

Run: `npx prettier --write README.md CHANGELOG.md docs/deprecations.md && npm test && node src/cli/index.ts validate`
Expected: everything passes, including `RN-0013` and `RN-0015` in `test/docs/release-history.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add README.md CHANGELOG.md docs/deprecations.md
git commit -F - <<'EOF'
docs(RN-0030): README, CHANGELOG and deprecations say in running text what they cited by ID

Each occurrence now says what the item says, without pointing to it. All the
rewritten CHANGELOG entries are in Unreleased: no published
version section changes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 7: This repository marks its own external documents (`M-14`) and final verification

**Files:**
- Modify: `docs/.ownership.yml` (artifact `REL`; entries `CHANGELOG.md`, `docs/deprecations.md`, `docs/migrations/`, `README.md`; comment of `documents:`)
- Modify: `test/docs/release-history.test.ts` (append at the end)

**Interfaces:**
- Consumes: everything from Tasks 2–6. `config` is already `loadOwnership(ROOT)` at the top of `test/docs/release-history.test.ts`.
- Produces: `CI-11` turned on over this repository.

- [ ] **Step 1: Write the failing test**

Append to the end of `test/docs/release-history.test.ts`:

```ts
test('RN-0030: this repository marks as external what it writes for outsiders', () => {
  for (const path of ['README.md', 'CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
    assert.equal(config.documents.find(document => document.path === path)?.audience, 'external', `${path} should be marked`)
  }
  assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')

  // docs/contracts/ stays out: it cites its own sources, and marking it is a decision of its own.
  for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md']) {
    assert.equal(config.documents.find(document => document.path === path)?.audience, 'internal', `${path} is not marked by this delivery`)
  }
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `node --test test/docs/release-history.test.ts`
Expected: FAIL: `README.md should be marked`.

- [ ] **Step 3: Mark**

In `docs/.ownership.yml`:

In the `REL` artifact, right after `    skill: release-historian`:

```yaml
    # Read by whoever consumes: CI-11 demands that it not cite artifact IDs (ADR-0017).
    audience: external
```

In the comment above `documents:`, after the line `# CI-4 enforces the review and CI-7 enforces the owner; CI-1, CI-2 and HK-1 do not read from here.`:

```yaml
# `audience: external` marks what is written for those who read from the outside; CI-11 demands
# that this text not cite artifact IDs (ADR-0017).
```

In the entries `CHANGELOG.md`, `docs/deprecations.md` and `docs/migrations/` (the three with `skill: release-historian`) and in the `README.md` entry (the last of `documents:`), add as the last key of the entry:

```yaml
    audience: external
```

- [ ] **Step 4: Run and watch it pass**

Run: `node --test test/docs/release-history.test.ts && node src/cli/index.ts validate`
Expected: PASS; `no violation found`. If `CI-11` reports a line, Task 6 let an occurrence slip: rewrite the prose, **never** remove the mark.

- [ ] **Step 5: Prove that the check is on (and undo)**

Run (Bash tool): `printf '\nSee RN-0030.\n' >> README.md; node src/cli/index.ts validate; echo "exit=$?"; git checkout -- README.md`
Expected: a `CI-11` finding in `README.md` on the last line, naming `RN-0030`, and `exit=` different from 0. After the `checkout`, `git diff README.md` is empty.

- [ ] **Step 6: Commit**

```bash
git add docs/.ownership.yml test/docs/release-history.test.ts
git commit -F - <<'EOF'
chore(RN-0030): marks README, CHANGELOG, deprecations, migrations and release notes as external

It is the last change of the reader boundary: marking before rewriting the prose
would fail validate itself. CI-11 now applies to this repository.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 7: Final verification (spec §4)**

Run:

```bash
npm test
npm run typecheck
npm run lint:check
node src/cli/index.ts validate
node src/cli/index.ts validate --base master
node src/cli/index.ts drift
node src/cli/index.ts changelog --base master
```

Expected: all with exit code 0. `validate --base master` does not report `CI-7` (each watched path traveled with the owning doc or with `Docs: none — <reason>`) nor `CI-9` (the commit that touched `ADR-0017`, `rules.md` and `functional.md` cites IDs declared in them). `changelog --base master` finds the entries in `## [Unreleased]`. If any fails, stop and diagnose (superpowers:systematic-debugging); do not amend an already made commit unless necessary.

---

## Spec coverage

| Spec change | Task |
| --- | --- |
| `M-1` ADR-0017 | 1 |
| `M-2` RN-0030 | 1 |
| `M-3` RF-0015 | 1 |
| `M-4` term (born `active`, deviation 1) | 1 |
| `M-5` parser | 2 |
| `M-6` CI-11 | 3 |
| `M-7` catalog, `checks.gen.md` (3), `versioning-policy.md` (2) | 2, 3 |
| `M-8` parser tests (2) and check tests, cases 1–9 and one more (3) | 2, 3 |
| `M-9` init | 4 |
| `M-10` skill and migration template | 5 |
| `M-11` `CLAUDE.md` and `templates/agent-contract.md` | 5 |
| `M-12` prose | 6 |
| `M-13` CHANGELOG, per commit (deviation 2) | 2, 3, 4, 5 |
| `M-14` marking | 7 |
| §4 final verification | 7 |
