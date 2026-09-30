---
title: Business rules
owner: '@esliph/engineering'
trigger: >
  Before implementing any behavior of this family, and on every new or changed
  rule.
last-reviewed: 2026-09-18
---

# Business rules

Each requirement is a section with a citable ID. The ID is never recycled, and it
is what makes the blast radius computable by `grep`. Format: `templates/requirements.md`.

## RN-0001 — Every artifact has exactly one declared owner

- **status:** active
- **relates-to:** ADR-0002
- **out of scope:** who reviews the artifact; this is about ownership, not review

A living-documentation artifact belongs to one and only one owner, declared in
`.ownership.yml`, at the repository root, and mirrored in CODEOWNERS. Two owners for the same path
is guaranteed divergence; zero owners makes the artifact an orphan and not enforceable.

## RN-0002 — `trigger` names an observable event, never a cadence

- **status:** active
- **out of scope:** the wording of the trigger; what is required is its nature. No check judges the wording: the check only requires `trigger` to be present and non-empty, and the nature of the event is judged by the agent and the reviewer

The `trigger` field declares **when** the artifact must be updated, and the answer
is always an event someone can observe happening. A calendar date
("quarterly", "every sprint") describes an intention to review, not a need to
change — and it is what turns a document into a ritual.

## RN-0003 — An ID identifies one item, forever

- **status:** active
- **out of scope:** the format of the ID, which is a machine contract and not a business rule

An ID never identifies two items, and is never reused after the item stops
existing. `ADR-001` and `ADR-0001` are the same ID: re-padding does not create a
new item. Without this, an old citation comes to point to something else
silently, which is worse than pointing to nothing.

## RN-0004 — A frozen item only changes in the allowlist fields

- **status:** active
- **relates-to:** RN-0006
- **out of scope:** who decides to freeze; that is the state machine

An item in a terminal state accepts change only in the fields `.ownership.yml`
declares mutable — typically `status`, `superseded-by` and `last-reviewed`. It is
this allowlist that allows superseding an ADR without violating its immutability.

## RN-0005 — Promoting a state is a human act

- **status:** active
- **out of scope:** creating the item, which is an agent act

No agent on its own promotes an item to a state that means acceptance
(`draft → accepted`, `open → resolved`, `draft → active`, `active → revoked`). The
most a skill writes is `draft`/`open`. Accepting is deciding, and deciding is not
the agent's.

## RN-0006 — A terminal state does not allow editing the body

- **status:** active
- **relates-to:** TDR-0001
- **out of scope:** freezing per section inside a collection file, which TDR-0001 records as debt

An item that reached the terminal state is not corrected: the history is the
asset. An accepted ADR that turned out to be wrong gets `superseded`, and the new
decision explains the error.

## RN-0007 — Every citation resolves, or CI fails

- **status:** active
- **out of scope:** a citation to a prefix not declared in `.ownership.yml`, which is ignored on purpose to allow installation in phases

A `<PREFIX>-<number>` reference to a known prefix points to an existing,
non-retired item. A dangling citation is worse than no citation: it asserts a
traceability that does not exist.

## RN-0008 — The watched path and the owning doc travel in the same commit

- **status:** active
- **relates-to:** RN-0001
- **out of scope:** which path requires which doc, which is project configuration and lives in `watches`

A code path declared in `watches` has an owning document, and the change to both
fits in the same commit. Documentation that waits for a second PR is
documentation that does not happen: whoever would postpone it has the context in
their head now, and will not later.

When the change really does not affect the doc, deciding that is up to a person,
at the moment the enforcement asks — not the agent, and not silence.

## RN-0009 — The enforcement of the code→doc link reminds and asks, and never denies

- **status:** active
- **relates-to:** RN-0008
- **out of scope:** the freezing of an immutable item (`RN-0006`), which denies for another reason

What links code to a document informs (`additionalContext`) or asks (`ask`). It
never blocks. A legitimate shortcut exists and has to be possible: enforcement
that prevents an honest commit is switched off on day one, and switched-off
enforcement protects nothing.

This does not loosen `RN-0006`: a frozen item is still `deny`. The difference is
what is being protected — there, a history that is not rewritten; here, a habit
that is being taught.

## RN-0010 — The agent contract is index and policy, not content

- **status:** active
- **out of scope:** automatic detection of textual duplication, which is `living-docs/agent-contract-duplication` and arrives in Phase 7

The document that guides agents (`CLAUDE.md`, `AGENTS.md`) points to where the
truth lives and declares what to never do. Every factual claim lives in the owning
artifact and is linked from there.

Content copied into it rots like any duplicate — with the aggravating factor of
being read in every session, which makes the old version beat the new one by
repetition.

## RN-0011 — A glossary term has a single meaning, identified by name

- **status:** active
- **relates-to:** ADR-0004
- **out of scope:** the declaration of `docs/glossary.md` in `artifacts:` in `.ownership.yml` — left open by `DA-0002` (`ADR-0004` does not resolve it)

A glossary term is identified by its name — not by a numbered ID of the
`<PREFIX>-<number>` kind — and covers exactly one meaning. Two things with the
same name are not the same entry: two terms are created, and one of them is
`banned`, pointing to the replacement. A divergence between the name in the code
and the term is a bug to fix in the code, not a second term in the glossary.

## RN-0012 — A generated artifact is not edited: the source is changed

- **status:** active
- **relates-to:** ADR-0005
- **out of scope:** what the source of each generated artifact is, which is
  project configuration and lives in `generated[].command`

An artifact declared in `generated[]`, or carrying the marker
`generated: do not edit`, only changes by running the generator. A hand edit
survives until the next run and lies until then — with the aggravating factor of
looking like a truth signed by a tool.

What is written by hand is the policy around the contract — versioning,
deprecation, the error catalog —, never the contract.

## RN-0013 — A consumer-visible change travels with a CHANGELOG entry

- **status:** active
- **relates-to:** ADR-0006
- **out of scope:** the format of the entry, which is Keep a Changelog and lives in
  the template, not in this rule

A change that touches a path of a `watches` rule marked
`consumer-visible: true` carries, in the
same diff, the entry under `## [Unreleased]` of the doc marked
`consumer-visible: true` — or a written reason, in the form
`Changelog: none — <reason>`, in some commit message of the range. A label with no
reason is not an exception: it is the ticked box.

The entry is aimed at whoever consumes the software. Single test: if it only makes
sense to whoever wrote the code, it does not belong in the CHANGELOG — and a
CHANGELOG derived from `git log` is the document that narrates the code, which
spec §13 refuses.

## RN-0014 — A conscious shortcut becomes recorded debt, and the reminder never blocks

- **status:** active
- **relates-to:** RN-0013
- **out of scope:** Markdown files, where `TODO` and `FIXME` are prose about the
  marker and not the marker

A new shortcut marker — `TODO`, `FIXME`, `HACK`, `XXX`, a type or lint
suppression, an ignored test — without a `TDR-nnnn` within two lines of distance
generates a reminder, with the path to record the debt. Never a block: a
legitimate shortcut exists, and a hook that forbids it teaches people to hide it
under another name.

What is charged is the recording of the shortcut with an observable payment
trigger, not the absence of the shortcut.

## RN-0015 — A deprecation without the four things is not a deprecation

- **status:** active
- **relates-to:** RN-0013
- **out of scope:** the period between announcement and removal, which is the
  project's versioning policy and lives in `docs/contracts/versioning-policy.md`

A deprecation entry records four things: the announcement date, the removal
version or date, the replacement, and the link to the migration guide. If any is
missing, it is not a deprecation — it is an announced compatibility break, and it
goes through an ADR.

Announcing a removal without a place for the migration guide is the deprecation
nobody can follow.

## RN-0016 — A document without a declared owner does not pass

- **status:** active
- **relates-to:** ADR-0008, RN-0001
- **out of scope:** who the owner is, which belongs to the project and lives in `.ownership.yml` and CODEOWNERS

Every file in the repository has an entry in `.ownership.yml` — in `owned` or in
`generated:` — **and** a line in CODEOWNERS; the coverage of the whole repository
is the core's, and living-docs charges the same of the documentation corpus, the
union of the paths with a `living-docs:` block and those of `generated[]`. Both
places, not one: `.ownership.yml` says which skill answers, CODEOWNERS says who
reviews, and a document with an owner in only one place is a document whose owner
disappears at the first doubt.

Artifact and document are not the same thing. An artifact has an ID family,
lifecycle and freezing; a document has an owner, and maybe a skill. Both have an
owner, and that is what this rule charges. What distinguishes them is the
`living-docs:` block of the entry: with `id-prefix` it is an artifact, without it
it is a document.

## RN-0017 — A Definition of Done item without a named verification is not an item

- **status:** active
- **relates-to:** RN-0016
- **out of scope:** whether the named verification is good enough, which is human judgment

Each box of the Definition of Done names what verifies it: a check ID, a hook ID,
or the fixed marker `human`. An item with no verification is an
intention, and an intention is not a definition of done.

It is the Definition of Done that gives authority to enforcement: an item nobody
verifies is an item no check has a way to charge.

## RN-0018 — An expired document warns; a debt with its trigger met fails

- **status:** active
- **relates-to:** ADR-0007, RN-0002
- **out of scope:** the value of `stale-after-months`, which is project configuration

`last-reviewed` past the project's limit generates a **warning** and does not fail
the build: the fix is to read the document, and a red build pushes toward the mass
bump that switches the mechanism off while pretending to perform it.

An `open` debt whose payment trigger has already happened **fails**, and keeps
failing until the debt is paid or reclassified. Both things are human acts.

An item in a frozen state does not expire. There is nothing to review in an item
whose body is not edited, and warning about it would teach precisely the bump the
rule refuses.

## RN-0019 — An `open` debt declares the payment trigger in a verifiable way

- **status:** active
- **relates-to:** ADR-0007, RN-0018
- **out of scope:** the prose wording of the trigger, which stays in the body, is for people to read, and is what explains the why

An `open` debt declares `pay-when` with a pattern and the paths where it is looked
for. A trigger that only exists in prose is not verifiable, and a non-verifiable
trigger is an orphan `TODO` with a number — the very thing recorded debt existed to
not be.

The pattern names a condition in the repository, not a date. A debt does not
expire on the calendar: it expires when the condition that made it acceptable
stops holding.

## RN-0020 — The agent contract does not repeat text from an owning artifact, and the threshold is written

- **status:** active
- **relates-to:** RN-0010, ADR-0009
- **out of scope:** duplication by paraphrase, which no check detects and whose refusal is human

A sentence of twelve words or more from the agent contract that reappears, word
for word, in an artifact with an owning skill is a duplicate and fails. The fix is
to delete the sentence and leave the pointer to the owning artifact.

Below the threshold it is shared vocabulary, not copied content. The agent
contract talks about the same things the owning artifacts talk about — that is its
job — and a check that failed shared vocabulary would be switched off on day one,
leaving the rule with no enforcement at all.

## RN-0021 — A watched path without an owning doc fails in CI, and the way out is the written reason

- **status:** active
- **relates-to:** RN-0008, RN-0009, ADR-0010
- **out of scope:** the moment of the commit, where the enforcement asks instead of failing (`RN-0009`)

In CI, a diff that touches a watched path without the owning doc fails. The only
way out is a written reason in some commit message of the range, in the form
`Docs: none — <reason>`. A label with no reason is not an exception: it is the
ticked box.

This neither loosens nor contradicts `RN-0009`: there the enforcer is a hook, at
the moment there is a person to answer the question; here there is no person at
all, and the cost of silence is out-of-date documentation passing with the
authority of a green CI.

## RN-0022 — The session start delivers the inventory, and never blocks

- **status:** active
- **relates-to:** RN-0009
- **out of scope:** what to do with the inventory, which is the judgment of whoever receives it

At the start of a session, what is present and absent, the open decisions, the
debts with their trigger met and the expired documents reach the context without
anyone needing to look for them. It is context injection, never a permission
decision.

And it is short by obligation: an inventory nobody reads is the dead wiki arriving
from the other side, with the aggravating factor of costing context in every
session.

## RN-0023 — A broken link and a binary attachment in a corpus path fail

- **status:** active
- **relates-to:** RN-0016
- **out of scope:** an anchor inside the file (`#section`), which the enforcement does not resolve — and says it does not resolve

A relative link that does not resolve to an existing file or directory, a
`[[wikilink]]` with no destination, and a file in binary format in a corpus path
fail. A broken link is worse than no link: it asserts a connection that does not
exist. A binary attachment cannot be read in a diff or reviewed in a PR.

Code is not a link: what is inside a fenced block or inline markup is an example,
and charging for an example teaches people not to write examples.

## RN-0024 — The written form of an ID belongs to the project; identity does not depend on it

- **status:** draft
- **relates-to:** ADR-0011, RN-0003
- **out of scope:** which form a project should choose, which is its own decision

A project declares how its IDs are written — separator and number of digits — and
it is that form the toolkit recognizes when reading and prints when suggesting a
new ID. The identity of the item does not depend on the form: `RN009` and
`RN-0009` are the same item, for the same reason `ADR-001` and `ADR-0001` always
were.

Whoever writes an ID is a single function. No check assembles an ID by
concatenation — a format assembled by hand in two places is the guarantee that one
of them will diverge.

## RN-0025 — The installed enforcement is that of the stage's phases

- **status:** draft
- **relates-to:** ADR-0012, RF-0013
- **out of scope:** which phases each stage asks for, which is spec §10

The set of checks the installed workflow runs is that of the stage's phases,
neither more nor less. A stage that installs an empty frame is the dead wiki being
born at the factory; a stage that installs the check of a phase the project does
not have is enforcement that fails for something nobody asked for.

The hooks are a single piece, and what stages them is the configuration they read:
a hook without its configuration stays quiet.

## RN-0026 — A path claimed by an open decision is reminded on edit and charged on the diff

- **status:** draft
- **relates-to:** ADR-0010, RN-0009
- **out of scope:** judging whether an edit is the implementation of the missing rule — a hook that judges is in the wrong place

An open decision can name the paths it blocks. When it does, editing one of them
**asks**, naming the decision, what it blocks and the owning skill; and the diff
that carries them **fails**, with the written reason as the only way out.

The field is optional: an open decision with no declared path remains valid and
blocks nothing. What is not accepted is the reverse — declaring the path and not
being reminded.

## RN-0027 — A mass bump of `last-reviewed` fails

- **status:** draft
- **relates-to:** ADR-0013
- **out of scope:** updating the date of a document that really changed, which is the mechanism working

A diff in which several documents change the review date and nothing else in the
body fails, naming the anti-requirement. A document really reviewed changes in
more than the date; twenty documents that only changed the date are the review
mechanism being switched off while pretending to perform it.

The threshold is written and configurable, and there is no exception label: the
label would be the ticked box the anti-requirement describes.

## RN-0028 — A commit that changes an artifact cites the affected ID

- **status:** draft
- **out of scope:** the format of the commit message, which is a working agreement and not a rule of the toolkit

When the diff changes an artifact file, some commit message of the same diff cites
at least one of the IDs declared in that file. It is what makes `git log`
navigable by rule: without the citation, the history answers "what changed" and
never "because of which rule".

## RN-0029 — The artifact's trigger and the owning skill's `description` speak of the same event

- **status:** revoked
- **revoked-by:** ADR-0034
- **relates-to:** ADR-0013, RN-0010
- **out of scope:** the `trigger` of an item inside a collection, which belongs to the item and not to the artifact

The `trigger` field of a document and the `description` of the skill declared as
its owner describe the same event. If they diverge, the document declares a
trigger that nothing fires: the trigger mechanism and the skill routing stop
meeting, and the document comes to depend on someone remembering it.

When the declared owning skill does not exist in the toolkit root, the result is a
warning and not a failure — a project may declare a skill of its own, and failing
on that would be demanding that every owner come from the plugin.

## RN-0030 — A document for readers from the outside does not cite an artifact ID

- **status:** draft
- **relates-to:** ADR-0017, RN-0013
- **out of scope:** the identifiers of the public interface, which the versioning policy declares; the frontmatter, which is a machine contract and belongs to `living-docs/frontmatter`; and the fenced code block, which is an example

The body of a document or artifact declared `audience: external` contains no
citation to a prefix declared in `living-docs.id-prefix` — neither in prose, nor
between backticks, nor in the path of a link. A reader from the outside has no way
to resolve the ID, and a link to the artifact takes them to a document written for
whoever maintains the repository.

The link the ID would carry is not lost: it exists and lives on the inside, in the
artifact itself or in the commit message. Every citation to a declared prefix
counts — the one that resolves, the retired one and the one that does not resolve
—, because the rule is about what the reader sees, and not about whether the item
exists.

## RN-0031 — What the toolkit delivers to whoever installs does not cite the toolkit's internal trail

- **status:** draft
- **relates-to:** ADR-0018, RN-0030
- **out of scope:** code comments and commit messages; the documents of the toolkit's own repository; the IDs of the installer's project that a message shows; the identifiers of the public interface, skill names and commands

The files `init` seeds, the templates, the plugin's text and the output of the CLI
and of the hooks do not cite a prefix declared in the toolkit's
`living-docs.id-prefix`, a section of the toolkit's spec or a path of an internal
document of it. Whoever installs does not resolve the citation — or resolves it to
an item of their own, with another meaning.

## RN-0032 — The v2 ownership file is strict: one `owned` list, a block per plugin, reading separated from policy

- **status:** draft
- **relates-to:** ADR-0020
- **out of scope:** the command to migrate from v1 to v2, and the content of the blocks each plugin declares under its own name

A valid ownership file declares `version` in every instance and, at the root, the
`plugins:` list with the name of every top-level block that is not the core's. A
top-level block whose name is not in `plugins:` is an error. Inside an `owned`
entry, the keys that say how the parser finds the item inside the file
(`collection`, `key`, `state-field`) are only read from inside a `format:` block —
never at the same level as the policy keys.

## RN-0033 — The identity of an item is a key opaque to the core

- **status:** draft
- **relates-to:** ADR-0021
- **out of scope:** ID shape, prefix, sequence and retirement — which remain plugin policy, the owning plugin's, not the core's

The core guarantees only that an item's key is not empty and is unique within the
file that declares it, and uses that key to pair the item before and after a
change. It never validates the shape of the key. `state-field`, when declared,
names where the item's state lives; when absent, the default is `status`,
case-insensitive.

## RN-0034 — The paths governed by all the ownership files of a repository are disjoint

- **status:** draft
- **relates-to:** ADR-0023
- **out of scope:** what `include:` grants in authority — nothing, by decision; and the pruning of files outside the base in a hook, which is an optimization and not a coverage rule

Resolved against their own bases, the `owned[].path` of all the ownership files of
a repository form a disjoint set: none equals another, and none is a directory
prefix of another. A collision is an error that names the two files and the path,
whether it occurs inside a file, between sibling files or between a file and
another that includes it.

## RN-0035 — Resolving the root ownership file never chooses between ambiguous candidates

- **status:** draft
- **relates-to:** ADR-0024
- **out of scope:** the resolution of included files, which are not candidates and follow the composition rule (RN-0034)

The root ownership file is found by candidate order — explicit,
`./.ownership.yml`, `./docs/.ownership.yml` —, and the absence of any candidate is
valid silence. Finding more than one candidate at the same time is an error that
names both; the system never picks one on its own.

## RN-0036 — The doc→doc trigger requires a type declared in ownership and an instance declared in the document

- **status:** draft
- **relates-to:** ADR-0022, RN-0008, RN-0009
- **out of scope:** the code→doc trigger (`watches`), which RN-0008 and RN-0009 already cover

A document is only reminded as derived from another when the ownership file
declares the type of the derivation (`derives-from: source, field`) and the
instance declares, in its own frontmatter, the exact target through the named
field. A derivation without both halves generates no reminder.

## RN-0037 — Owner coverage reaches the whole repository, and only `ignore` removes a path from it

- **status:** draft
- **relates-to:** ADR-0020, RN-0016, RN-0021
- **out of scope:** what `generated[].path` counts as covered on its own, without entering `owned` — it already satisfies coverage by being generated

Every path in the repository has an owner entry that covers it, except what an
`ignore:` entry explicitly removes from coverage. A path with no owner and no
`ignore` fails.

## RN-0038 — No check depends on the language of a document's prose

- **status:** active
- **relates-to:** ADR-0032, ADR-0034
- **out of scope:** the machine vocabulary a check reads — frontmatter keys, state names, IDs, the fixed markers `human` and `Docs: none —` — which is structure and is the same in every language

A check reads the structure of a document — frontmatter, IDs, table columns
through `field-map`, fixed markers — and never its headings or prose. A corpus
written entirely in another language produces exactly the findings the same
corpus would produce in English.

## RN-0039 — A missing canonical table column points to `field-map`

- **status:** active
- **relates-to:** ADR-0032, RN-0038
- **out of scope:** a column that exists and is empty, which is reported as an empty value

When a check needs a canonical field of a collection item and the item has no
such column or bullet, the finding says the field is missing and tells how to
declare the project's own name for it under `field-map` in the ownership file.

## RN-0040 — An ID prefix may be declared in several ownership entries, and its sequence is one per repository

- **status:** active
- **relates-to:** ADR-0037, ADR-0011
- **out of scope:** `role`, which stays unique across the repository

The same `id-prefix` may appear in more than one `owned` entry, in the root
ownership file or in the files it includes. Every item of the prefix, whichever
entry declares it, shares one sequence: a number is taken once in the repository,
the sequence has no gap across all entries together, and a new item takes the
next free number of the whole repository.

## RN-0041 — Every plugin in the marketplace has a distributed directory and the minimum governance

- **status:** draft
- **relates-to:** ADR-0036
- **out of scope:** what a plugin's own workflow verifies; the content of its README and CHANGELOG, which their owners judge

The marketplace manifest and every plugin manifest parse as JSON. Every plugin
listed in the marketplace has a `source` inside the repository that exists and
contains `.claude-plugin/plugin.json`, whose `name` is the entry's name and whose
`version` equals the entry's when the entry declares one. The directory above the
source is the plugin's project, and it holds `README.md`, `CHANGELOG.md` and
`.ownership.yml`.
