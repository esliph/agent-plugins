# Reader boundary — specification

Traceability by ID remains valid among artifacts, tests, code
and commit messages. This spec draws the boundary with **whoever reads from the outside** — the
README visitor, whoever reads the CHANGELOG to decide whether to upgrade, whoever follows a
migration guide. For that reader, `ADR-0003` or `RNF-0006` is noise: they have no
way to know what the ID means, and a link to the artifact drops them inside an internal
decision document.

It does not repeat what the owning artifacts say. The rule in force is in
`docs/requirements/`, the decision in `docs/decisions/adr/`, the way of working in
`CONTRIBUTING.md` and the criterion of done in `docs/definition-of-done.md`.

**Mandatory input for whoever is going to plan:**
`docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §8 (the
uniform citation) and §5, `SK-7`, rule 5 (the migration guide pointing to the ADR) —
the two passages that this delivery does **not** amend; `ADR-0008` (`documents:`),
`ADR-0006` (`consumer-visible`), `RN-0007` and `RN-0013`;
`docs/contracts/versioning-policy.md` (what a public identifier is); and
`RN-0010`/`RN-0020` (what the agent contract may say).

---

## 1. What the requester decided

| #     | Choice                                                                                                                           | Accepted consequence                                                                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E-1` | It is a **toolkit rule**, not a cleanup of this repository                                                                       | Skill, templates and `init` change together. An already installed repository only gains the verification if it marks the documents by hand                      |
| `E-2` | The rule is verified by a **CI check** (`CI-11`), with error severity and **no exception label**                                | The public contract grows: a new check and a new key in `.ownership.yml`. The fix is always to rewrite — there is no way to declare "this ID may stay"         |
| `E-3` | The mark is **one key per entry**, `audience: external`, in `documents:` and in `artifacts:`                                     | Without the key, the document is internal and is not verified. There is no parallel list of paths to diverge from `documents:`                                  |
| `E-4` | **The IDs of the public interface remain citable** — `CI-n`, `HK-n`, `SK-n`, `CM-n`, `EXIT-n`                                    | Whoever reads from the outside still sees IDs, but only those that the CLI output already shows them and that the versioning policy promises not to redefine    |
| `E-5` | **The toolkit spec is not amended.** `ADR-0017` records that it holds inward, and that the boundary with whoever reads from the outside is its own | The spec keeps saying "uniform in code, test, doc and commit message" and "pointing to the ADR that decided it". Whoever reads only the spec does not see the boundary without the ADR |
| `E-6` | **An ID in the path of a link counts**, even if it does not appear in the rendered text                                          | The README cannot link an ADR by file name. It is the "ID with link" alternative that `ADR-0017` discards, applied consistently                                 |

`E-4` and `E-3` together are what makes the rule cheap: the boundary comes out of the
configuration that already exists, and §2 explains why.

---

## 2. The invariant: the check knows no prefix

**Internal is the prefix declared in `artifacts:`.**

`CI-11` carries no list of prefixes. It reads `config.artifacts[].idPrefix` and only
that. The public identifiers are not artifact families — nobody declares
`CI` in `artifacts:` —, so they are left out without any exception needing to be
written. A project that declares a new prefix gains the boundary in the same
commit, and a project at the `solo` stage that has not yet declared `RN` is not charged
for a stray `RN-0001`: it is the same boundary that `CI-2` already uses (`RN-0007`, out of
scope).

This keeps true the rule of §3 of the toolkit spec — hooks and checks know no
path — extended to prefix.

---

## 3. The fourteen changes

| ID     | Change                                                                  | File                                                                                           |
| ------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `M-1`  | `ADR-0017`, the reader boundary, is born                                | `docs/decisions/adr/`                                                                          |
| `M-2`  | `RN-0030`, the rule, is born                                            | `docs/requirements/rules.md`                                                                   |
| `M-3`  | `RF-0015`, what `init` marks, is born                                   | `docs/requirements/functional.md`                                                              |
| `M-4`  | The term _External document_ is born                                    | `docs/glossary.md`                                                                             |
| `M-5`  | The parser accepts `audience`                                           | `src/config/ownership.ts`                                                                      |
| `M-6`  | `CI-11` is born                                                         | `src/checks/ci11-external-audience.ts`, `src/checks/registry.ts`                               |
| `M-7`  | The public contract records the check and the key                       | `src/checks/catalog.ts`, `docs/contracts/checks.gen.md`, `docs/contracts/versioning-policy.md` |
| `M-8`  | Tests lock down the parser and the check                                | `test/config/ownership.test.ts`, `test/checks/ci11-external-audience.test.ts`                  |
| `M-9`  | `init` marks the historical trail as external, and warns when it cannot | `src/cli/init.ts`, `test/cli/init.test.ts`                                                     |
| `M-10` | The skill and the migration template stop asking for the ADR's ID       | `plugin/skills/release-historian/SKILL.md`, `templates/migration.md`                           |
| `M-11` | The agent contract gains the policy                                     | `CLAUDE.md`, `templates/agent-contract.md`                                                     |
| `M-12` | This repository rewrites in running text what cites an ID               | `README.md`, `CHANGELOG.md`, `docs/deprecations.md`                                            |
| `M-13` | The `## [Unreleased]` entry records the visible change                  | `CHANGELOG.md`                                                                                 |
| `M-14` | This repository marks its own external documents                        | `docs/.ownership.yml`                                                                          |

### `M-1` — the decision

`ADR-0017 — Reader boundary: artifact ID is internal trail`.
`relates-to: [RN-0030, RF-0015, RN-0013, RN-0007]`, `supersedes: null`.

**Context.** The toolkit spec commands citing by ID in a uniform way and commands the
migration guide to point to the ADR. Neither passage distinguishes who reads. The
result is documents written for those who come from the outside carrying IDs that only
resolve inside the repository — and, for whoever installs the package or the plugin,
`docs/` may not even be at hand.

**Alternatives to record as considered and discarded:**

- **Keep the uniform citation.** It is the problem.
- **Allow the ID as long as it comes with a link to the artifact.** The visitor lands in an
  internal decision document, and the outside text comes to depend on the inside one
  to make sense.
- **Human-only verification**, in the skill's checklist. It is precisely the text that
  skill and agent write on their own, and the ID comes back without anyone seeing it.
- **A top-level list `external-docs:`**, like `consumer-visible-paths`. It is a
  second list of paths that diverges from `documents:` — the repository has already
  needed a test just to keep two such lists from drifting
  (`test/docs/release-history.test.ts`).
- **Reuse `role`.** The vocabulary is closed and "one role, one
  document" holds: it does not mark CHANGELOG, migrations and README at the same time.

**Decision.** A document or artifact declared `audience: external` does not cite an artifact
ID. The link between it and the artifact continues to exist, and lives on the inside
— in the artifact itself, when it is still editable, or in the commit message.
The identifiers of the public interface remain citable.

The ADR must say, in its text, **why the spec is not amended** (`E-5`): the
uniform citation remains valid for everything that is internal, which is almost everything; the
boundary is a cut, not a reversal.

**What is accepted as lost:**

- **Whoever reads from the outside and wants the why loses the shortcut.** The path goes from the inside
  to the outside, not the other way around.
- **The migration guide -> ADR link comes to live in the commit message.** An
  accepted ADR is frozen by `HK-1` and cannot gain the citation to the guide written
  after it; the commit that creates the guide cites the ADR. The verification was human and
  remains human — enforcement is not lost, but the link becomes less visible.
- **An already installed repository is not verified** until it marks the documents by hand.
- **The spec keeps asserting uniformity** (`E-5`).
- **This repository's README and CHANGELOG are rewritten** (`M-12`).

It is born `draft`.

### `M-2` — the rule

`RN-0030 — A document for whoever comes from the outside does not cite an artifact ID`.
`relates-to: ADR-0017, RN-0013`.

**Out of scope:** the identifiers of the public interface, which the versioning
policy declares; the frontmatter, which is a machine contract and belongs to `CI-1`; and
fenced code blocks, which are examples.

The statement says that the body of a document or artifact declared
`audience: external` contains no citation of a prefix declared in `artifacts:` — in
prose, between backticks or in the path of a link —, and says why: whoever reads from the outside
does not resolve the ID, and the link that the ID would carry exists and lives on the
inside.

It is born `draft`.

### `M-3` — `init`

`RF-0015 — init marks as external what is written for whoever comes from the outside`.
`relates-to: RF-0009, RF-0012, RN-0030`. `RF-0009` and `RF-0012` are not
rewritten.

From the `production` stage onward, a new installation declares `CHANGELOG.md`,
`docs/deprecations.md`, `docs/migrations/` and the `REL` artifact with
`audience: external`.

In a repository that already declares these entries without the key, `init` **does not
rewrite the line** — same policy as `declareDocuments`, `declareArtifacts` and
`declareCodeowners`. It reports, in `notInstalled`, each declared entry without
the mark, saying that marking is what turns `CI-11` on for it.

**Out of scope:** the `README.md` of whoever installs. `init` does not declare the repository
root as documentation (`src/docs/corpus.ts`), and does not start declaring it
because of this.

It is born `draft`.

### `M-4` — the term

A new row in the table, `status: draft`:

- **Term:** External document.
- **Definition:** a document or artifact declared `audience: external`, written
  for whoever reads the repository without taking part in it.
- **Name in the code:** `audience`.
- **Do not confuse with:** `consumer-visible` path — which is **code** whose
  change requires an entry in the CHANGELOG, and not a document.
- **Source:** `ADR-0017`, `RN-0030`.

The listed confusion is real: both names speak of "who consumes", and one of them is
about code, the other about text.

### `M-5` — the parser

`ArtifactRule` and `DocumentRule` gain `audience: Audience`, with
`AUDIENCES = ['internal', 'external'] as const` as a closed vocabulary, in the
same design as `DOCUMENT_ROLES`.

- When absent, `internal` applies. No `.ownership.yml` written before changes
  meaning.
- A value outside the vocabulary is an `OwnershipError`, with the list of accepted ones — the
  same form as the `role` message.

### `M-6` — the check

`CI-11`, name `external audience`. It enters `validateChecks()`, after
`CI-10`: it is a tree-state check and does not need a diff.

**What it reads.** The entries of `context.documents` and of `context.docs` whose rule
has `audience: 'external'`.

**How it reads.**

1. The frontmatter lines are erased **preserving the count**, so that the
   reported line is the file's. The frontmatter comes from the `parseFrontmatter` that
   the collection already ran.
2. An artifact with `syntaxError` in the frontmatter is skipped: `CI-1` already fails it, and reading
   the broken frontmatter as body would produce a duplicate finding about the `id:`.
3. `stripFences` removes the fenced block and **keeps** inline code — it is
   exactly the function that exists for whoever looks for an ID written between backticks.
4. `findCitations(text, config.idFormat)` finds the citations; each one goes through
   `parseId`, and counts when the prefix is in the set of `artifacts:`.

It counts **any** citation of a declared prefix: the one that resolves, the retired one and the
one that does not resolve. The rule is about what the reader sees, not about the ID existing.

**Finding.** Severity `error`, with file and line. The message names the ID and says
that the file is read by whoever comes from the outside; the fix says to write in running
text what the item decides or requires, and that the link stays in the artifact or in the
commit message.

**No exception label** (`E-2`).

### `M-7` — the public contract

- **`CHECK_CATALOG`** gains `CI-11`, command `living-docs validate`, with the "fails
  when" saying: a document or artifact declared `audience: external` cites, outside the
  frontmatter and fenced code blocks, an ID whose prefix is declared
  in `artifacts:` — in prose, between backticks or in the path of a link.
- **`docs/contracts/checks.gen.md`** is regenerated by `node src/tools/gen-checks.ts`.
  Editing by hand is blocked by `HK-2`, and `CI-5` compares.
- **`versioning-policy.md`**, in "What is public", gains the `audience` key of
  `documents:` and `artifacts:` and the two values it accepts, next to
  `consumer-visible`.

### `M-8` — the tests

Written before the code. They cite `RN-0030` (check) and `ADR-0017` (parser).

`test/checks/ci11-external-audience.test.ts`, with one case per boundary:

1. Artifact ID in prose, in an external document — fails, on the right line.
2. ID between backticks — fails.
3. ID only in the path of a link — fails.
4. ID inside a fenced block — passes.
5. ID only in the frontmatter of an external artifact (`id: REL-0001`) — passes.
6. `CI-11`, `HK-6` or `EXIT-2` cited in an external document — passes.
7. The same ID in an `internal` document — passes.
8. ID of a prefix not declared in `artifacts:` — passes.
9. Correct reported line in a document with frontmatter.

`test/config/ownership.test.ts`: missing key becomes `internal`; `external` is
read; an invalid value throws `OwnershipError`.

### `M-9` — `init`

- `DocumentSeed` gains `audience`; the three historical-trail entries in
  `PRODUCTION_DOCUMENTS` are born `external`.
- `documentEntry` writes `audience: external` when applicable; `releasesBlock`
  writes the key in the `REL` artifact.
- The comment that `documentsBlock` writes above `documents:` explains what
  `audience` does, in one line.
- On a stage upgrade, an already declared entry without the mark becomes a warning in
  `notInstalled` (`M-3`).

Tests in `test/cli/init.test.ts`, citing `RF-0015`: a new installation at
`production` declares the four external entries; `small-team` declares
none; a repository with `CHANGELOG.md` already declared without the key receives the warning
and the file is not rewritten.

### `M-10` — the skill and the template

`release-historian`:

- **Step 5:** the migration guide says, in running text, why the break was
  decided; the commit that creates it cites the ADR. "A break without an ADR is a decision without a why"
  remains valid.
- **Checklist:** the migration guide line changes to the form above, and
  "no external document cites an artifact ID — verification: `CI-11`" is added.

`templates/migration.md`: the comment "The ADR that decided" becomes the same
instruction.

`plugin/skills/**` is watched by `CONTRIBUTING.md`, and `HK-5` asks. The way out is
`Docs: none — <reason>` in the commit: nothing changes in how work is done in this
repository.

### `M-11` — the agent contract

One line in the policy section of `CLAUDE.md` and of `templates/agent-contract.md`,
saying that text for whoever reads from the outside carries no artifact ID and that `CI-11`
enforces it.

The sentence is deliberately worded differently from the statement of `RN-0030`: `CI-7`
fails a contract that repeats a sentence from an owning artifact (`RN-0020`). `CLAUDE.md` has
49 lines today, and the ceiling in `test/docs/agent-contract.test.ts` is 60.

### `M-12` — this repository's prose

Each occurrence becomes running text that says what the item says, without pointing to it:

| File                   | Line  | ID                     |
| ---------------------- | ----- | ---------------------- |
| `README.md`            | 72    | `ADR-0003`             |
| `README.md`            | 131   | `RNF-0006`             |
| `CHANGELOG.md`         | 14    | `RNF-0005`             |
| `CHANGELOG.md`         | 91    | `RNF-0006`, `ADR-0016` |
| `CHANGELOG.md`         | 101   | `ADR-0015`, `ADR-0016` |
| `CHANGELOG.md`         | 106   | `ADR-0014`             |
| `CHANGELOG.md`         | 160   | `RN-0008`              |
| `docs/deprecations.md` | 14    | `RN-0015`              |

The `CHANGELOG.md` entries are all in `## [Unreleased]`: no published version
section is being rewritten.

`CHANGELOG.md:63` carries `TDR-nnnn`, which is not a citation — `nnnn` does not match the
pattern — and stays.

### `M-13` — the `CHANGELOG`

`src/checks/catalog.ts`, `src/config/ownership.ts`, `src/cli/**`, `plugin/**` and
`templates/**` are `consumer-visible-paths`; `CI-6` enforces the entry. It records,
without any artifact ID:

- **Added:** `CI-11`; the `audience` key and the default value; `init` at
  `production` declaring the historical trail as external, and warning instead of
  rewriting.
- **Changed:** the `release-historian` skill and the migration template stop
  asking the guide to point to the ADR by ID.

### `M-14` — this repository's marking

`audience: external` on `README.md`, `CHANGELOG.md`, `docs/deprecations.md`,
`docs/migrations/` and on the `REL` artifact.

It is the last change in the repository: marking before `M-12` and `M-13` would fail
`validate` itself.

---

## 4. Order of application

Each step only asserts what is already true when it runs.

1. `M-1`, `M-2`, `M-3`, `M-4` — the rule and the decision come before the code.
2. `M-8` (parser) and `M-5`.
3. `M-8` (check), `M-6` and `M-7`.
4. `M-9`.
5. `M-10` and `M-11`.
6. `M-12` and `M-13`.
7. `M-14`.

**Final verification:** `npm test`, `npm run typecheck`,
`node src/cli/index.ts validate` (with `CI-11` on over the repository
itself), `node src/cli/index.ts drift` and
`node src/cli/index.ts changelog --base master`.

---

## 5. What this spec does not do

- **It does not amend the toolkit spec** (`E-5`), and does not touch the Constitution — the rule
  does not become a principle.
- **It does not mark `docs/contracts/` as external.** The error catalog and the
  versioning policy are read by whoever consumes, but they cite ADR and RN as the source of
  their own clauses, and `init` also seeds them. Marking them is a decision of its own,
  with the cost of rewriting them.
- **It does not verify the README of whoever installs.** `init` does not declare it (`M-3`).
- **It does not verify the CLI output or the commit messages.** Whoever reads the output of
  a check is whoever maintains the repository, and the commit is the place where the link
  comes to live.
- **It does not fix `RF-0010`**, whose list of "today's checks" was already
  out of date before this delivery.
- **It promotes nothing.** `ADR-0017`, `RN-0030`, `RF-0015` and the glossary term
  are born `draft`.
