# Internal trail of the toolkit — specification

The toolkit writes text that comes to live in the repository and in the session of
whoever installs it: the files that `init` seeds, the comments of `.ownership.yml`
and of the workflow, the text of the plugin skills, and the check and hook
messages. Today that text cites ADRs, RNs and sections of the toolkit spec — a
trail that only resolves inside the toolkit repository. For whoever installs it,
`ADR-0008` does not exist or, worse, is decision 8 of **theirs**, and `validate`
passes without saying anything.

This spec takes the internal trail out of what the toolkit ships and takes out of
the seeds what only serves whoever writes. The documentation is maintained and
read by agents, but it serves humans too, and text the reader does not use is
noise.

It does not repeat what the owning artifacts say. The rule in force is in
`docs/requirements/`, the decision in `docs/decisions/adr/`, the way of working in
`CONTRIBUTING.md` and the criterion for done in `docs/definition-of-done.md`.

**Precondition:** the plan `docs/superpowers/plans/2026-09-15-reader-boundary.md`
executed — `ADR-0017`, `RN-0030` and `CI-11` exist, `templates/migration.md` and
`templates/agent-contract.md` were already rewritten by it, and `CHANGELOG.md` is
marked `audience: external`.

**Mandatory input for whoever plans:**
`docs/superpowers/specs/2026-09-10-reader-boundary-design.md` (the sibling
boundary, and the design this one repeats); the toolkit spec
`docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §8 (the
uniform citation) and §11 (skill authoring conventions); `RF-0002` (`init` does not
rewrite), `RF-0003` and commit `9b79aea` (the seed placeholders); `RF-0005` (the
seed is the format); `RN-0010`/`RN-0020` (what the agent contract may say).

---

## 1. What the requester decided

### The classification of the noise

| Type | What it is                                                                    | Example today                                             | Destination                                         |
| ---- | ----------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `A`  | Citation of an artifact or section of the toolkit spec                        | `ADR-0011`, `spec §3`, `docs/superpowers/…`               | Always goes out                                     |
| `B`  | Seed banner — instruction to whoever fills it in, naming the toolkit or the skill | `> Seed created by living-docs init…`                 | Leaves the file; the writing rule lives in the skill |
| `C`  | Repeated ownership                                                            | `<!-- Owning skill: charter-keeper. -->`                  | Goes out; `.ownership.yml` already declares it      |
| `D`  | Identifier of the public interface                                            | "verification: `CI-3`", `HK-8`, skill name, command       | Stays                                               |
| `E`  | Explanation useful to whoever installs, written in the toolkit's voice        | the `command` of `generated` prints and does not write    | Stays, rewritten without citing the toolkit         |
| `F`  | Per-section comment in a per-file artifact template                           | `<!-- At least two, with the real reason for the discard… -->` | Stays; disappears when filled in              |
| `G`  | Rendered prose that explains the rule of the document itself                  | introduction of Open Decisions; "Single test…" of the CHANGELOG | Stays in an internal document; goes out of an external document |
| —    | Fixed comment in a collection document                                        | `<!-- Sections enter below. -->`                          | Goes out                                            |

The criterion for `F`, `G` and the collection comment is a single one: **does the
text serve whoever reads the document, or whoever writes in it?** What serves
whoever reads stays. What serves whoever writes stays only while it is consumed by
the filling in — and never in a document whose reader is not the one who writes.

### The choices

| #     | Choice                                                                                                                 | Accepted consequence                                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `E-1` | **Three surfaces in one delivery**: seeded files, plugin text, CLI and hook output                                     | The delivery is bigger, but the rule is not born broken by the toolkit itself                                                            |
| `E-2` | **A spec of its own, executed after the reader boundary**                                                              | This spec rewrites lines that the boundary just wrote, if the sweep catches them                                                         |
| `E-3` | **The rule is enforced by a toolkit test**, not by a `CI-n` check nor by a message catalog                             | Whoever installs does not get the verification — the problem only exists for whoever distributes text, and today only the toolkit distributes |
| `E-4` | **The format lives in the template; the writing rule lives in the skill**                                              | Whoever installs and works without an agent receives the seed without filling-in instructions                                            |
| `E-5` | **The trail removed from a message goes to a code comment next to the string**                                         | Whoever maintains the toolkit reads the why in the comment, not in the message; `grep RN-0019` in the toolkit still finds the code that applies the rule |
| `E-6` | **The toolkit spec is not amended.** `ADR-0018` records that the uniform citation holds inside the toolkit repository  | Whoever reads only the spec does not see the carve-out without the ADR                                                                   |

---

## 2. The invariant: the test knows no prefix

**Internal trail is the prefix declared in `artifacts:` of the toolkit's
`.ownership.yml`**, plus the two patterns that point to the spec: `spec §<n>` and
the path `docs/superpowers/`.

The test reads the prefixes from `loadOwnership(toolkitRoot()).artifacts[].idPrefix` —
the same design as `CI-11`. `CI-n`, `HK-n`, `SK-n`, `CM-n` and `EXIT-n` are not
artifact families and stay out with no written exception. A new family declared in
the toolkit is watched in the same commit.

---

## 3. The ten changes

| ID     | Change                                                                         | File                                                                                                 |
| ------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `M-1`  | `ADR-0018` is born, the decision                                               | `docs/decisions/adr/`                                                                                |
| `M-2`  | `RN-0031` is born, the rule                                                    | `docs/requirements/rules.md`                                                                         |
| `M-3`  | The test locks the three surfaces                                              | `test/distribution/internal-trail.test.ts`                                                           |
| `M-4`  | The comments of the non-Markdown templates lose the trail                      | `templates/ownership.yml`, `templates/workflow.yml`, `templates/ids-retired.txt`, `templates/tdr.md` |
| `M-5`  | The comments that `init` assembles lose the trail                              | `src/cli/init.ts`                                                                                    |
| `M-6`  | The Markdown seeds lose banner, repeated ownership and guidance for whoever writes | `templates/*.md`                                                                                 |
| `M-7`  | The plugin loses the trail and receives the guidance that left the seeds       | `plugin/skills/*/SKILL.md`                                                                           |
| `M-8`  | The check, hook and CLI messages lose the trail                                | `src/checks/**`, `src/hooks/**`, `src/cli/**`, `src/config/ownership.ts`                             |
| `M-9`  | This repository's agent contract gains the policy                              | `CLAUDE.md`                                                                                          |
| `M-10` | The `## [Unreleased]` entry records the visible change                         | `CHANGELOG.md`                                                                                       |

### `M-1` — the decision

`ADR-0018 — What the toolkit ships does not cite its own internal trail`.
`relates-to: [RN-0031, ADR-0017]`, `supersedes: null`.

**Context.** The toolkit writes files, comments, skill text and messages that live
in the repository and in the session of whoever installs. That text cites ADRs,
RNs and sections of the toolkit spec, which for whoever installs do not exist or
resolve to an item of theirs with another meaning — and `validate` passes, because
`CI-2` does not read YAML comments nor check output. The seeds, moreover, carry
filling-in instructions that stay in the document after it is filled in.

**Alternatives to record as considered and discarded:**

- **Keep it.** It is the problem.
- **Qualify the citation** ("`RN-0019` of the toolkit"). It still does not resolve
  for whoever reads.
- **Link the toolkit repository.** There is no stable address while `DA-0003` is
  open, and the link throws the reader into an internal decision document — the
  reason `ADR-0017` discards "ID with link".
- **Centralize the messages in a catalog** and verify only the catalog. It
  refactors seventeen files and moves the message away from the code that produces
  it.
- **A generic `CI-n` check**, wired by key in `.ownership.yml`. It grows the public
  contract for a problem that only the toolkit has.
- **Human-only verification.** It is text that agents and skills write on their
  own; the ID comes back without anyone seeing it.

**Decision.** The text the toolkit delivers to whoever installs does not cite an
artifact or a section of the toolkit spec. The identifiers of the public interface,
the skill names and the commands remain citable: they exist in the environment of
whoever installs. The format of a document lives in the template and the rule for
writing it lives in the skill; guidance that only serves whoever writes does not
stay in a collection document nor in an external document. The trail continues to
exist on the inside — code comment and commit message.

The ADR says, in its text, **why the toolkit spec is not amended** (`E-6`): the
uniform citation continues to hold inside the toolkit repository; what changes is
what crosses over to whoever installs.

**What is accepted as lost:**

- **Whoever installs and works without an agent receives the seed without
  filling-in instructions** (`E-4`).
- **An already-installed repository keeps the old text.** `init` does not rewrite
  (`RF-0002`) and does not start warning.
- **The test may fail a `src/` string that is not output** — a regex, a piece of
  data. Today none matches.
- **Whoever maintains the toolkit reads the why of a message in the comment next to
  it**, not in the message (`E-5`).
- **The toolkit spec keeps asserting the uniformity** (`E-6`).

Born `draft`.

### `M-2` — the rule

`RN-0031 — What the toolkit ships to whoever installs does not cite the toolkit's internal trail`.
`relates-to: ADR-0018, RN-0030`.

**Out of scope:** code comment and commit message; the documents of the toolkit
repository itself; the IDs of the project of whoever installs that a message shows
("`ADR-0001` duplicated"); the identifiers of the public interface, the skill names
and the commands.

The statement says that the files `init` seeds, the templates, the plugin text and
the CLI and hook output do not cite a prefix declared in `artifacts:` of the
toolkit, a section of the toolkit spec, nor a path of an internal document of it —
and says why: whoever installs does not resolve the citation, or resolves it to an
item of theirs with another meaning.

Born `draft`.

### `M-3` — the test

`test/distribution/internal-trail.test.ts`. Written before the changes `M-4` to
`M-8`, and red until them. It cites `RN-0031`.

**The reading of a citation** is a function of the test itself:
`findCitations(text, config.idFormat)` in `src/ids/citations.ts`, each citation
passed through `parseId` (`src/docs/schema.ts`) and counted when the prefix is in
the set read from `loadOwnership(toolkitRoot()).artifacts`; the occurrences of
`/spec §\d/` and of `docs/superpowers/` are added. The finding states file, line
and the excerpt.

**One case per surface**, so that each step of `§4` turns one green:

1. **Seeded files.** For each value of `STAGES` (`solo`, `small-team`,
   `production`, `multi-team`), `runInit` runs inside `withTempRepo`
   (`test/helpers/tmp.ts`) and the test sweeps every file of `result.created`.
   Separately, it sweeps `templates/**` raw — which is what covers `adr.md`,
   `tdr.md`, `migration.md` and `release-note.md`, which `init` does not seed. The
   `RN-nnnn` placeholders do not match the pattern and stay.
2. **Plugin.** Every text file under `plugin/`, by directory sweep — the same
   design as `test/plugin/authoring.test.ts`.
3. **Code.** Each `.ts` under `src/` goes through `ts.createSourceFile` (TypeScript
   is already a development dependency), and the test reads only `StringLiteral`,
   `NoSubstitutionTemplateLiteral` and the text of `TemplateHead`, `TemplateMiddle`
   and `TemplateTail`. Comments are not read: they are internal trail and keep
   citing.

**The HTML comment lock.** In the same case 1: no `.md` of `result.created`, in any
stage, contains `<!--`. No stage seeds a per-file artifact — the ADR, TDR,
migration and release directories are born with only `.gitkeep` —, so everything
`init` seeds is a collection document or an external document, and the lock
enforces type `C` and the collection comment at once. Today it fails nine files.

**Stays out of the test**, with human verification: the `B` banner, the `G` prose
of an external document, and script narration ("In Phase 7…"). There is no generic
pattern that detects them without locking sentences.

### `M-4` — the non-Markdown templates

Today, an `init --stage production` in an empty repository writes into
`.ownership.yml` and the workflow: the path of the toolkit spec, `ADR-0011`,
`ADR-0008` and `DA-0002`, `spec §3`, `spec §5, SK-7, rule 4`, "In Phase 7" and
`DA-0003`.

- **`templates/ownership.yml`**
  - The header loses "Source rule: …§3" and keeps that this is the only
    project-specific file and that hooks and checks read from here.
  - `id-format` loses `(ADR-0011)` and keeps the explanation of the written form.
  - The `field-map` comment loses `(spec §3)`.
  - The `watches` comment swaps "In Phase 7, CI-7 reads from here too" for what is
    true today: `CI-7` also reads from here.
  - The comments of `generated` and of `consumer-visible-paths` stay (`D`, `E`).
- **`templates/workflow.yml`** loses the paragraph about the toolkit's open decision
  and keeps: `--invoke` chooses how the CLI is called, and the file belongs to
  whoever installs.
- **`templates/ids-retired.txt`** loses the spec path: "Retired IDs. Never
  recycled." and "One ID per line."
- **`templates/tdr.md`** — the `pay-when` comment in the frontmatter loses
  `(RN-0019, ADR-0007)` and keeps the instruction, which is `F`: it disappears when
  the trigger is filled in.

### `M-5` — `init`

- `documentsBlock` loses `(ADR-0008, which resolves DA-0002)`. The line that the
  reader boundary adds, about `audience`, cites only `CI-11` and stays.
- `releasesBlock` loses `(spec §5, SK-7, rule 4)`.
- The removed citations go to a TypeScript comment above each line (`E-5`).

### `M-6` — the Markdown seeds

No filling-in placeholder goes out — "Replace with a real principle…", "Example
term", `EXAMPLE-CODE`, the Vision questions. They are the structure of the seed
(`RF-0003`, commit `9b79aea`).

| Template                                                                                                                 | What changes                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `constitution.md`, `vision.md`, `glossary.md`, `contributing.md`, `errors.md`, `versioning-policy.md`                    | The `B` banner ceases to exist as a block. Each sentence goes through the criterion of `§1`: the one that serves whoever reads becomes prose of the document, without the name of a toolkit or skill; the one that serves whoever writes goes out |
| `constitution.md`, `vision.md`, `glossary.md`, `errors.md`, `versioning-policy.md`, `deprecations.md`, `requirements.md` | The final comment (`C`, and the collection one) goes out. What it carried for whoever reads becomes prose — "the displayable message is not part of the contract", in `errors.md`               |
| `changelog.md`, `deprecations.md`                                                                                        | The introduction with a drafting rule (`G` external) goes out                                                                                                                                    |
| `requirements.md`, `open-decisions.md`, `definition-of-done.md`, `contributing.md`                                       | The internal `G` prose and the `D` identifiers stay                                                                                                                                              |
| `adr.md`, `release-note.md`                                                                                              | The `F` comments stay                                                                                                                                                                            |

**Before taking a sentence away from whoever writes**, confirm that the owning
skill already says it; if it does not, it enters the skill in `M-7`. Nothing that
today guides the filling in is lost — it changes place.

`agent-contract.md` and `migration.md` only change if the `M-3` sweep catches them
after the reader boundary.

### `M-7` — the plugin

- The 21 citations of the internal trail in seven skills (seven only in
  `glossary-keeper`; none in `decision-recorder` nor in the commands) become
  running text that says what the item says.
- The references to `templates/…` stay: the agent reads the template at the root of
  the installed toolkit.
- `charter-keeper`, `glossary-keeper`, `working-agreements-keeper`,
  `contract-keeper`, `requirements-keeper` and `release-historian` receive the
  writing guidance that left the seeds in `M-6`, only what is still missing.
- `decision-recorder` and `release-historian` gain in the checklist: no template
  comment survives the filling in — verification: human.
- What `test/plugin/authoring.test.ts` already enforces continues to hold: the §11
  sections in order, and every checklist item names its verification.

### `M-8` — the messages

Today, about 60 string lines in seventeen files: `src/checks/ci1` to `ci10`
(`catalog.ts` does not cite), `src/hooks/hk2`, `hk6`, `hk7` and `hk8`,
`src/cli/index.ts`, `src/cli/init.ts` (`M-5`) and `src/config/ownership.ts`. The
exact list is the one that case 3 of `M-3` fails.

- **Trail parenthesis** — "(spec §4)", "(`RN-0013`; owning skill:
  release-historian)": the citation to the toolkit goes out; "owning skill", `CI-n`
  and `HK-n` stay. The removed ID goes to a comment above the string (`E-5`).
- **Sentence that leans on the ID** — "changing it is a new `ADR-0009`", "spec §13
  anti-requirement": becomes what the ID said, in the language of whoever installs.
  In the first example: the threshold belongs to the toolkit, not to the project.
- **The `validate` budget line** shows the ceiling without `RNF-0005`.
- **`CHECK_CATALOG`** does not cite today. If any description changes,
  `docs/contracts/checks.gen.md` is regenerated by `node src/tools/gen-checks.ts` —
  editing by hand is blocked by `HK-2`.

The `assert`s in `test/` that match IDs look at the fixtures' IDs (`ADR-0001`,
`DA-0001`), not at the trail parenthesis; the rewrite should not require a test
change beyond `M-3`. A test that breaks is read before being adjusted.

### `M-9` — the agent contract

One line in the policy section of `CLAUDE.md`, saying that text the toolkit
delivers to whoever installs does not carry the toolkit's internal trail, and that
the distribution test enforces it.

- **It does not go into `templates/agent-contract.md`**: it is the policy of whoever
  maintains the toolkit, not of whoever installs it.
- The sentence is worded differently from the statement of `RN-0031` (`RN-0020`).
- `CLAUDE.md` has 53 lines today; the reader boundary adds three, and the ceiling of
  `test/docs/agent-contract.test.ts` is 60. The item fits in up to four lines — the
  plan measures before writing.

### `M-10` — the `CHANGELOG`

`src/cli/**`, `src/config/ownership.ts`, `plugin/**` and `templates/**` are
`consumer-visible-paths`; `CI-6` enforces the entry, and `CI-11` enforces that it
does not cite an artifact ID.

- **Changed:** the `init` seeds and the comments of `.ownership.yml` and of the
  workflow no longer cite internal decisions of the toolkit and no longer carry
  filling-in instructions; the check and hook messages and the skill text no longer
  cite internal rules of the toolkit.

---

## 4. Order of application

Each step only asserts what is already true when it runs.

1. `M-1` and `M-2` — the rule and the decision come before the code.
2. `M-3` — the test, with the three cases red.
3. `M-4`, `M-5` and `M-6` — case 1 turns green.
4. `M-7` — case 2 turns green.
5. `M-8` — case 3 turns green.
6. `M-9` and `M-10`.

**The commit reminders.** `src/checks/**` and `src/hooks/**` are watched by
`docs/requirements/rules.md`, `src/cli/**` by `functional.md` and
`plugin/skills/**` by `CONTRIBUTING.md`: `HK-5` asks. Outside step 1, the way out is
`Docs: none — <reason>` in the commit — the rule was already written, and nothing
changes in how we work in this repository beyond `M-9`.

**Final verification:** `npm test`, `npm run typecheck`,
`node src/cli/index.ts validate`, `node src/cli/index.ts drift`,
`node src/cli/index.ts changelog --base master` — and the proof that motivated this
spec, repeated: `init --stage production` and `--stage multi-team` in a temporary
directory, with the search for `ADR-`, `DA-`, `RN-`, `spec §`, `docs/superpowers`,
`Seed created` and `Owning skill` coming back empty.

---

## 5. What this spec does not do

- **It does not migrate an already-installed repository.** `init` does not rewrite
  and does not warn.
- **It does not touch the documents of this repository.** The `Owning skill`
  comments in `docs/contracts/` and in `docs/deprecations.md` stay: here the trail
  is internal.
- **It does not amend the toolkit spec** (`E-6`), and does not touch code comments
  nor commit messages.
- **It does not create a `CI-n` check** nor change the public contract: no key, no
  exit code, no output format changes.
- **It does not lock by test** the `B` banner, the external `G` prose nor script
  narration (`M-3`).
- **It does not promote anything.** `ADR-0018` and `RN-0031` are born `draft`.
