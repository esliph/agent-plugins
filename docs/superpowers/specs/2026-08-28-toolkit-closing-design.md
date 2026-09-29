# Toolkit closing - specification

The seven phases of the `LIVING-DOCUMENTATION-TOOLKIT.md` spec are implemented:
the skills, the agents, the hooks, the checks and the commands exist, with tests.
This spec neither replaces nor repeats them. It points out **what the original
spec asks for and the code does not deliver**, **what it wrote as a rule without
allocating any piece to it**, and **what only shows up when the toolkit is
installed in a repository that is not itself**.

Each gap has a citable ID - `L-n` - and its origin named in the original spec. A
new piece gets an ID in the same numbering as the toolkit (`CI-9`, `CI-10`,
`HK-8`), because a piece without an ID cannot be enforced and this document turns
into a wish list.

**Mandatory input for whoever plans**: `LIVING-DOCUMENTATION-TOOLKIT.md`
(the spec that rules), `LIVING-DOCUMENTATION.md` (the research), and
`docs/superpowers/plans/BACKLOG-phases-3-7.md` (what each phase found). None of
their content is copied here.

---

## 1. The ten gaps

| ID | Gap | Origin in the original spec | Evidence |
| --- | --- | --- | --- |
| `L-1` | `init` does not install the enforcement | §5, `SK-0` - "Owner of: … the installation of `HK-*` and `CI-*`"; step 4 | `src/cli/init.ts` does not mention `workflow`, `.github` or `.claude`; `templates/` has no workflow template; `RF-0003` crystallized "installs only the **frame**" |
| `L-2` | The plugin has no installation path | §10, phases; `SK-0` step 4 | There is no `marketplace.json`; this repository's `.claude/` only has `scheduled_tasks.lock`; the seven hooks never ran in a session - only by payload in `test/hooks/` |
| `L-3` | Acceptance criterion 4 has no mechanism, requirement or test | §12, criterion 4; §5, `SK-3` rule 1 and `SK-4` rule 5 | There is no business rule for it in `docs/requirements/rules.md`; no hook prevents implementing with an open decision; `test/acceptance/spec-criteria.test.ts` covers 1, 2, 3, 5, 6, 7 and 8 |
| `L-4` | Acceptance criteria 9 and 10 have no proof | §12, criteria 9 and 10 | 9 is half covered in `test/docs/agent-contract.test.ts` (index, not content); the "error → line" half of the loop has no record. 10 has no test |
| `L-5` | Bulk bump of `last-reviewed` is not detected | §2, rule 3; §13 | Every other anti-requirement in §13 has a piece; this one does not |
| `L-6` | The artifact's `trigger` and the owning skill's `description` are not compared | §11 - "say the same thing … if they diverge, the document declares a trigger that nothing fires" | `test/plugin/authoring.test.ts` validates the `description`; `CI-1` validates the `trigger`; nothing crosses the two |
| `L-7` | `--stage multi-team` does not exist, and the skill tells you to choose it | §9, mapping by stage; §5, `SK-0` step 2 | `src/cli/init.ts` declares `solo`, `small-team` and `production`; `plugin/skills/living-docs-bootstrap/SKILL.md` step 2 says to determine among four, including "multiple teams" |
| `L-8` | Two rules written without a check: ID in the commit message, and the time budget | §11, language and commits; §9 - "run in minutes, on the PR" | `src/git/diff.ts` already exposes `commitMessages`, used only for the exception label; `RNF-0001` covers the hook ceiling, and no requirement covers the check's |
| `L-9` | The enforcement is not watched by `watches` | §3, mechanism 1 | `.github/workflows/` is neither in `watches` nor in `consumer-visible-paths` of `docs/.ownership.yml` |
| `L-10` | The written form of the ID belongs to the toolkit, not to the project | §8, citation syntax; §5, `SK-0` step 1; §12, criterion 1 | `src/docs/schema.ts` and `src/ids/citations.ts` require a hyphen and three to four digits. The real consumer writes `RF001`, `RNF001`, `RN009` and `DA001` - 97 rules, already cited that way in its tests |

`L-10` only exists because a real consumer was looked at. It is the gap that
blocks all the others: without it resolved, `L-1` and `L-2` deliver an
enforcement that fails the consumer 97 times on the first run.

---

## 2. Scope

**In** - `L-1`, `L-2`, `L-3`, `L-5`, `L-6`, `L-7`, `L-8`, `L-9` and `L-10`.
The entry criterion is corollary 4 of §1 of the original spec: each In item
becomes a requirement with an ID and a piece that verifies it. An item that does
not become a piece does not get in.

**Out, and why:**

| Out | Reason |
| --- | --- |
| `L-4` - acceptance criteria 9 and 10 | They are human verification by nature. "An agent erred for lack of context" is not machine-observable, and "no document volume metric" is the absence of a thing. §11 of the original spec already admits a checklist item verifiable only by people, stated explicitly - that is how the two stay: a line in the Definition of Done, marked human, and not a check that pretends to measure |
| Quality Attribute Scenarios / NFR budget, and Domain model / invariants (layer 3 of the research) | The original spec placed them neither in "In" nor in "Out". They are scope extension, not an implementation hole, and they enter through the same extension point as C4 and runbooks: an entry in `docs/.ownership.yml` and an owning skill |
| Test strategy and Onboarding path (layer 7 of the research) | Same reason. The style guide, which was in the same table of the research, was absorbed by `SK-6`; these two were not, and they stay out until someone asks |
| Layers 4 and 6 entirely, event catalog, long RFC, feature spec | The "Scope" section of the original spec already refuses them in writing. This spec does not reopen that |

---

## 3. Identity and written form of an ID (`L-10`)

### The problem

§8 of the original spec fixes a citation syntax and justifies it: "a single
form, because it is the one `CI-2` and `CI-3` recognize by `grep`". The real
requirement behind that is **one form per project** - it is the `grep` that needs
determinism, not the universe. What the implementation did was encode the
toolkit's form in two places and treat it as universal.

This collides head-on with two things the same spec demands: step 1 of `SK-0`
("adopt what exists … **never** create a parallel one") and acceptance criterion
1 ("no pre-existing artifact was duplicated or overwritten"). A repository with
97 rules numbered another way has no way of being adopted without being
rewritten, and rewriting is what the criterion forbids.

### The decision

Separate **identity** from **written form**. Today `canonicalId` plays both
roles; from now on it plays only one.

- **Canonical key** - internal, invariant, never displayed. It remains what
  compares, what detects duplicates and what closes a bidirectional pair. No
  check changes logic.
- **Written form** - declared by the project in `docs/.ownership.yml`, with the
  current format as the default. It is what the parser recognizes when reading,
  and what the toolkit prints when suggesting a new ID.

```yaml
id-format:
  separator: '' # default: "-"
  padding: 3 # default: 4
```

With this, `RN009` and `RN-0009` are the same item, each project chooses its own
form, and no file of the consumer is touched for it to be adopted.

### Why it is cheap

Everything already funnels through `canonicalId`. The change touches
`src/docs/schema.ts` (the reading pattern and the canonical form),
`src/ids/citations.ts` (the citation pattern, which already declares itself
coupled to the first by a comment) and the only leak of the format outside them,
in `src/checks/ci2-ids.ts`, where the sequence-gap message builds the ID by hand.
The rule this spec fixes here, and which the plan must respect: **no check goes
back to building an ID by concatenation** - the one who writes an ID is a single
function.

### What `SK-0` gains

The inventory now **reports the detected form**, instead of adopting it
silently. `living-docs init --dry-run` in a repository whose IDs are not in the
default format says which form it found and how many items it read in that form,
and whoever installs confirms. Silent adoption of a format is the same class of
error as silent adoption of a path, and `SK-0` already refuses the latter.

**New requirement** (the `requirements-keeper` allocates the ID): the written
form of the ID is declared by the project, and the identity of an item does not
depend on it.

---

## 4. `init` installs the enforcement (`L-1`, `L-2`, `L-7`)

### The problem

`SK-0` declares as its own the "installation of `HK-*` and `CI-*`", and step 4
says to install in the order of the phases. `init` installs none of that. `RF-0003`
crystallized the deviation by saying it "installs only the frame". The result is
a consumer repository with documents and no check running - which is exactly the
"promise" that corollary 4 of §1 refuses. And the plugin, which brings the seven
hooks, has no installation path at all: there is no marketplace manifest, and
this repository never registered its own plugin.

### The decision

`init` now writes, besides the frame, the two enforcement pieces:

| Piece | What it is | Rule |
| --- | --- | --- |
| CI workflow | A parameterized template that runs `validate`, and `validate --base`, `drift` and `changelog` when there is a base | **Does not impose Docker.** `RNF-0002` is a rule of this toolkit, not of the consumer: the installed workflow runs the way the consumer's other CI runs, and the template receives the invocation mode |
| Plugin registration | The entry that hooks the seven hooks into the session, plus the marketplace manifest at the toolkit root | Installed by **merging** |

The rule that governs both is the one `init` already practices with `CODEOWNERS`
and with the requirement artifacts: **merge, never overwrite**. A consumer with
its own hooks registered and with per-directory workflows keeps everything it
has; the toolkit adds what is missing and nothing more. Running twice does not
duplicate an entry - the idempotence of `SK-0` holds for the enforcement just as
it does for the document.

`--stage multi-team` comes to exist, and now with content: it is the stage that
installs Phase 7. The argument that refused it - "it would install the same set
of files as `production`" - falls together with `L-1`, because from here on a
stage installs enforcement, and enforcement is files. `SK-0` stops telling you to
choose a value that the CLI rejects.

**New requirements**: `init` installs the stage's enforcement, merging with what
already exists; and the installed enforcement set is that of the stage's phases,
no more and no less.

---

## 5. Behavior without a rule stops being just prose (`L-3`)

### The problem

Acceptance criterion 4 says: behavior without a written rule becomes an open
decision, **and the implementation does not happen**. The first half is a skill's
job and is written. The second has no piece: no hook, no check and no test. It is
the toolkit's central promise - the one the research calls the artifact that most
avoids rework - and it is the only one in §12 sustained only by goodwill.

### The decision

The semantic part ("is this a gap?") stays in `SK-3`, where §1 says it should
stay. What is added is the deterministic piece, and it exists because an open
decision already knows what it blocks - the real consumer writes that by hand, as
an impact field, today.

An open decision gains a field that names **the paths it blocks**. Two pieces
come out of it:

| Piece | Event | Decision | What it does |
| --- | --- | --- | --- |
| `HK-8` | `PreToolUse` / `Edit\|Write` | `ask` | Editing a path claimed by an open decision asks, naming the decision, what it blocks and the owning skill |
| - | `CI-7`, diff half | error | A diff that touches a path claimed by an open decision fails, with the same written way out that the other halves of `CI-7` already accept |

`HK-8` **asks, does not deny**. Denying would require the hook to judge whether
that edit is the implementation of the missing rule or something else entirely
on the same path - and a hook that judges is in the wrong place (§1, corollary
1). The field is optional: an open decision without a declared path remains
valid, and blocks nothing. What the spec refuses is the opposite - declaring the
path and not being reminded.

**New requirement**: a path claimed by an open decision is reminded at edit time
and enforced in the diff, and the way out is the written reason.

Plus the acceptance test for criterion 4, which does not exist today. The Phase
0 plan went as far as labeling the `HK-3` test as being it; the test is correct
and the label was wrong - criterion 4 was never covered.

---

## 6. The rules written without a check (`L-5`, `L-6`, `L-8`)

Three rules that the original spec wrote and allocated no piece to. By corollary
4 of §1, either they get a check, or they should leave the spec. They get a check.

### `CI-9` - commit discipline

Runs in the group that already receives the diff by injection (`validate
--base`), for the same reason as `CI-6` and the second half of `CI-7`: it needs
the diff, and `validate` without a base does not have it. Two halves:

1. **Bulk bump of `last-reviewed`** (§2 rule 3, §13). Fails when several
   documents have the review date changed in the same commit without any other
   change in the body. A document truly reviewed changes in more than the date;
   twenty documents that only changed the date are mechanism 4 being switched off
   while pretending to comply with it. The threshold is written and configurable,
   like that of `ADR-0009`.
2. **Commit that changes an artifact without citing the affected ID** (§11). It
   is what makes `git log` navigable by rule. `src/git/diff.ts` already delivers
   the messages; today they only serve for the exception label.

It does not go into `CI-2`: the ID lint runs without a diff and needs to keep
doing so.

### `CI-10` - the trigger and the routing say the same thing

Runs in `validate`. The `trigger:` of an artifact and the `description:` of the
owning skill declared in `docs/.ownership.yml` need to speak of the same event.
§11 is explicit about the cost of their diverging: "the document declares a
trigger that nothing fires" - mechanism 2 and skill routing stop meeting.

It is the only check that crosses the two roots of `ADR-0003`: the artifact lives
in the validated repository and the skill lives in the toolkit. When the declared
owning skill does not exist at the toolkit root, the check **warns and moves
on** - a repository can declare its own skill, and failing for that would be the
check demanding that every owner belong to the plugin.

The similarity threshold follows the precedent of `ADR-0009`, and for the same
reason: textual comparison is the only place in the toolkit with real risk of a
false positive, and the threshold needs to be written so it can be discussed.

### What changes publicly

`CI-9` and `CI-10` enter the check catalog, and the catalog is a generated
contract, visible to whoever consumes it. The consequence is the toolkit itself
demanding a CHANGELOG entry and contract drift from itself - which is the
mechanism working, not an obstacle to work around.

---

## 7. The enforcement is watched, and fits in the time (`L-9`, `L-8`)

**The enforcement enters `watches`.** The CI workflow is what makes every rule of
this repository count, and changing it today triggers neither a reminder nor a
demand for a CHANGELOG entry. It now has a watched owning doc and counts as
visible to whoever consumes - because it is literally what the consumer installs.

**The time budget becomes a requirement.** §9 demands that the checks run "in
minutes, on the PR" and nothing measures it. `RNF-0001` covers the 5-second
ceiling of the hook and says nothing about the check. The three candidates to
blow it are known: `CI-5` runs a subprocess, `CI-7` compares sentence to
sentence, `CI-8` scans the whole corpus.

**New requirement**: the set of checks has a declared, measured time ceiling, and
the ceiling belongs to the set - not to each check - because it is the set that
runs on the PR.

---

## 8. The consumer's adoption

The consumer is the repository that motivated the research. What it has today,
and which the installation needs to cross without breaking anything:

| What exists there | What that demands |
| --- | --- |
| 97 rules and 15 functional requirements in a single file, with IDs without a hyphen, already cited that way in the tests | `L-10` resolved. Without it, nothing else in this section happens |
| Two open decisions in sections, with context, alternatives, recommendation and status in prose | The section-based collection collector already exists; the field map of `docs/.ownership.yml` covers the naming difference. The status in prose needs to become machine state - it is a human act, not an automatic conversion |
| `docs/adr/` empty | Already in `init`'s adoption list. It is born adopted, not recreated |
| Its own hooks already registered in the session | The merge of §4. No hook of the consumer is lost |
| Per-directory CI, with path filter and without Docker | The parameterized workflow of §4 |
| `docs/architecture/` and `docs/domains/` - layer 4 | See below |
| No `CODEOWNERS` | `init` already writes it |

### Layer 4 and the extension point

Architecture documentation is outside the scope of the original spec, and falls
into the corpus of `CI-7` and `CI-8` on the first day - because the corpus is
everything that lives under the documentation root, and not a list of known
types.

The treatment this spec fixes: they enter declared with **an owner and no
skill**, which is the category this repository already uses for the plans, for
the spec and for the README. They gain an owner, a verified link and review
enforcement; they do not gain a keeper, a state machine or an ID family.

It is the extension point being truly exercised for the first time, and the test
is binary: **if adopting layer 4 requires touching any check, the extension point
was not what the spec said it was**. That result is a deliverable of the plan,
whichever it is.

---

## 9. The new pieces, gathered

| Piece | Type | What it resolves |
| --- | --- | --- |
| `id-format` in the ownership map | Configuration | `L-10` |
| Written form separated from the canonical key | Engine | `L-10` |
| Report of the detected form in the inventory | `SK-0` | `L-10` |
| Parameterized workflow template | Template | `L-1` |
| Plugin registration and marketplace manifest | Template + toolkit root | `L-2` |
| Merge of the enforcement in `init` | CLI | `L-1`, `L-2` |
| `--stage multi-team` | CLI + `SK-0` | `L-7` |
| Blocked-paths field in the open decision | Machine contract | `L-3` |
| `HK-8` | Hook (`ask`) | `L-3` |
| Blocked-path finding in `CI-7` | Check | `L-3` |
| `CI-9` | Check (diff group) | `L-5`, `L-8` |
| `CI-10` | Check (`validate`) | `L-6` |
| `.github/workflows/` in `watches` | Ownership map | `L-9` |
| Time ceiling of the set of checks | Non-functional requirement | `L-8` |

No requirement ID is pre-allocated here. A requirement without a number is not
citable, and citing a number that does not exist fails in `CI-2` - whoever
numbers is the `requirements-keeper`, in the plan, before the code.

---

## 10. Acceptance criteria

1. **Given** a repository whose IDs do not use the default form, **when** the
   inventory runs, **then** it reports the detected form and how many items it
   read in it, and **no** file of the repository is changed for it to be
   adopted.
2. **Given** a project with the written form declared, **when** the checks run,
   **then** identity, duplicate, bidirectional pair and citation work as
   before - and no check builds an ID by concatenation.
3. **Given** a repository without enforcement, **when** `init` runs, **then** a
   CI workflow and a plugin registration exist; **and when** it runs again,
   **then** nothing is duplicated.
4. **Given** a repository with its own hooks and workflows, **when** `init`
   runs, **then** all of them are still there, and the toolkit's was added.
5. **Given** the multiple-teams stage, **when** `init` runs, **then** the
   Phase 7 enforcement is installed - and the skill no longer tells you to
   choose a value that the CLI rejects.
6. **Given** an open decision that declares the paths it blocks, **when** an
   agent edits one of them, **then** it is asked, with the decision named; **and
   when** the diff carries them, **then** CI fails, and the only way out is the
   written reason.
7. **Given** a commit that only changes the review date of several documents,
   **when** CI runs, **then** it fails naming the anti-requirement.
8. **Given** a commit that changes an artifact without citing the affected ID,
   **when** CI runs, **then** it fails naming the artifact.
9. **Given** an artifact whose trigger does not speak of the same event as the
   `description` of the owning skill, **when** CI runs, **then** it fails naming
   both; **and given** that the owning skill does not exist at the toolkit root,
   **then** it warns and moves on.
10. **Given** the complete set of checks, **when** it runs on the PR, **then**
    it fits in the declared ceiling, and the ceiling is measured - not
    estimated.
11. **Given** a change to the CI workflow, **when** one is about to commit,
    **then** the owning doc is enforced and the CHANGELOG entry is required.
12. **Given** the real consumer, **when** the toolkit is installed in it,
    **then** the 97 rules, the open decisions and the empty ADR directory are
    **adopted** - no pre-existing file rewritten -, the architecture
    documentation enters with an owner and no skill **without any check
    changing**, and `validate` runs in its CI.

---

## 11. Anti-requirements

The closing fails if it produces any of these:

- **Renumbering the consumer to fit the toolkit.** It is overwriting what
  pre-exists, and criterion 1 of the original spec forbids it. If the written
  form cannot be declared, the gap goes back to the table - it is not resolved
  with a 97-rule diff.
- **A hook that judges.** `HK-8` asks. A hook that decided whether an edit is
  "the implementation of the missing rule" is in the wrong place.
- **A check that measures volume.** Neither `CI-9` nor `CI-10` counts documents,
  lines or coverage. They count divergence between things that should agree.
- **A stage that installs an empty frame.** `multi-team` only exists because it
  now has enforcement behind it. A label without content is the dead wiki being
  born out of the factory.
- **Enforcement that overwrites the consumer's.** Installing by erasing what
  already exists is the duplicate of step 1 of `SK-0` seen from the other side.
- **Imposing Docker on whoever installs.** It is a rule of this toolkit, and not
  of whoever uses it.
- **Pre-allocating a requirement ID in this spec.** Whoever numbers is the owning
  skill.
- **Inventing `CI-11` to measure what only a human verifies.** Acceptance
  criterion 9 and 10 stay as a line marked human in the Definition of Done. A
  check that pretended to measure them would be worse than its absence.

---

## 12. Dependencies, for whoever plans

The order is not taste - each item uses what the previous one installed:

1. **`L-10` first, and alone.** It is Phase 0 of the original spec: ID identity
   is the part that should change the least, and that is why it changes before
   everything else, with the whole repository as a safety net. Nothing else in
   this spec can be proven against the real consumer until it closes.
2. **`L-1`, `L-2` and `L-7` together.** They are the same delivery seen from
   three angles: `init` starts installing enforcement, the plugin gets a way to
   be installed, and the stage that was missing gets content.
3. **`L-3`.** Depends on the open decision's machine contract gaining the new
   field, and the field needs to be declared before `HK-8` and the finding in
   `CI-7` exist.
4. **`L-5`, `L-6` and `L-8` in any order among themselves.** `CI-9` enters the
   group that already receives the diff; `CI-10` enters `validate`; the time
   ceiling is measured after both exist, otherwise the measure is born stale.
5. **`L-9` together with the first item that touches the workflow**, which is 2.
6. **The consumer's adoption last**, because it is the proof - not the
   experiment. It is the only item whose result can invalidate a decision of this
   spec, and that is why it comes after everything is standing, and not before.
