# English-only repository — design

Every piece of text versioned in this repository moves to English and is kept
in English from now on. At the same time, the toolkit stops having any opinion
about the language of the documents it produces in a consumer's repository:
those follow the language of the user's session, and nothing in the plugins
controls it.

This is the first document written under the new rule, so it is in English.

**Nothing here is an accepted decision.** The decisions this spec requires are
listed in section 2, to be opened as `draft` and promoted by a human act.

## 1. Scope and boundary

In scope:

- **This repository's own text.** Docs, ADRs, TDRs, requirements, charter,
  glossary, releases, contracts, `docs/superpowers/`, `CLAUDE.md`,
  `CONTRIBUTING.md`, README, `CODEOWNERS`, `.ownership.yml` comments, source
  comments, test names and assertion messages, `bin/`, `.github/workflows`,
  and commit messages from this migration on.
- **What the plugins ship.** Skills (body and `description`), commands, agents,
  seeds under `templates/`, CLI/hook/check messages, manifests and shipped
  READMEs.
- **Language-dependent behavior.** Every check that reads prose in a specific
  language stops doing so.

Out of scope:

- **Git history.** Old commit messages stay in Portuguese. Nothing is rewritten.
- **A language guard.** No test or check enforces "English only". Review does.
- **A language setting.** No `language:` key, no bundled translations, no
  instruction in any skill about which language to write in.

Success means: no Portuguese text in the repository except one deliberate test
fixture (section 4), `npm test`, `npm run typecheck` and the full
`living-docs check` green, and a consumer can keep their whole corpus in any
language without any check failing because of that language.

## 2. Decisions to record (phase 1)

All written in English, opened as `draft`, promoted by a human.

- **ADR-0031 — Repository language.** All versioned text in this repository is
  English. Replaces the "Language" section of `CONTRIBUTING.md` (today: prose
  and commits in Portuguese). Declared cost: `git log` before the migration is
  in Portuguese, so the history reads in two languages.
- **ADR-0032 — The toolkit does not choose the language of consumer
  documents.** Plugin output (CLI, hooks, checks) is English. Document content
  follows the user's session; the plugin says nothing about it, and that
  silence is the decision. Checks read only structure — frontmatter, IDs,
  table keys through `field-map`, and fixed markers such as `human` and
  `Docs: none —` — never headings or prose.
- **ADR-0033 — One-time editorial migration of frozen artifacts.** Accepted
  ADRs, TDRs, published RELs and `docs/superpowers/` specs and plans may be
  translated once: same ID, same decision, same meaning, slugs renamed to
  English. Valid only for the phase 4 commits, which cite ADR-0033. It does not
  repeat. Phase 1 confirms how `living-docs/append-only` reacts to those
  commits; if passing them requires code, the ADR records exactly what, and the
  guard is never bypassed ad hoc.
- **ADR-0034 — Retire the lexical trigger threshold.** Supersedes ADR-0013 in
  full. ADR-0013 holds two thresholds; only the mass `last-reviewed` bump limit
  survives, and ADR-0034 restates it so ADR-0013 can be `superseded` cleanly
  (an accepted ADR is not edited).

Requirements:

- **RN-0029** (the trigger and the owning skill's `description` talk about the
  same event) → `revoked`, `revoked-by: ADR-0034`.
- **RN-0002** (`trigger` names an observable event, never a cadence) stays
  `active`. What changes is enforcement: no check judges the wording anymore;
  the check only requires `trigger` to be present and non-empty, and that test
  is what cites RN-0002.
- **RN-0017** (Definition of Done item names its verification): "the word that
  marks human verification" becomes the fixed marker `human`.
- **New RN — No check depends on the language of a document's prose.** Cited by
  the acceptance test in section 4.
- **New RN — A missing canonical table column points to `field-map`.** Cited by
  the test of that error message (section 4).

## 3. Approach and phases

One branch, five phases, each with its own commits and green tests at the end.
The order puts rules before behavior, behavior before shipped text, and shipped
text before the corpus, so a failure is attributable to one layer.

1. **Decisions** — section 2.
2. **Behavior** — section 4, TDD.
3. **What the plugins ship** — section 5.
4. **This repository's corpus** — section 6, the ADR-0033 commits.
5. **Internal code and closing** — section 7.

## 4. Behavior (phase 2)

Every change starts with a failing test that cites the rule governing it.

| Check / hook | Today | After |
| --- | --- | --- |
| `living-docs/trigger-routing` | requires ≥2 shared word roots between `trigger` and the owning skill's `description` | keeps only the structural part: the declared owning skill exists in the toolkit (warning when it does not, as today). `ROOT_FLOOR`, `ROOT_LENGTH`, `SHARED_ROOTS_FLOOR`, `rootsOf` and `sharedRoots` are removed |
| `living-docs/frontmatter` | fails a `trigger` containing cadence vocabulary (Portuguese and English word list) | only requires `trigger` present and non-empty. `CADENCE_PATTERNS` and `findCadence` are removed |
| `living-docs/done-verifiable` | accepts `humana?` or `human` | accepts only `human`, case-insensitive |
| collection checks reading table columns | fail when a canonical column is missing | same failure; the message also says to declare the column in `field-map` in `.ownership.yml` |
| `catalog.ts` (`failsWhen`) | describes the old conditions | describes the new ones; `docs/contracts/checks.gen.md` is regenerated by its generator, never edited |

Checks reviewed and left as they are, because they are already
language-independent: `agent-contract-duplication` (compares sentences of the
corpus with each other), `shortcut-debt` (syntax markers such as `TODO`,
`@ts-ignore`), `open-decision-claim` (fixed label `Docs: none —`).

**Proof of language independence.** An acceptance test runs the checks over a
fixture corpus written entirely in Portuguese — headings, prose, triggers, and
table columns mapped through `field-map` — and expects no failure caused by
language. This fixture is the only non-English text in the repository, and it
exists to prove the rule.

## 5. What the plugins ship (phase 3)

- Translate to English: `SKILL.md` (body and `description`), `commands/`,
  `agents/`, `templates/`, CLI/hook/check messages in `living-docs` and
  `ownership`, manifests, shipped READMEs.
- **No language instruction in any skill.** The keeper skills already replace
  the seed with real content on first write ("the seed is not content"), and
  the agent writes that content in the session's language. An English seed
  lives only until then. `living-docs init` stays deterministic; run without an
  agent, it leaves English seeds, which is the accepted degraded path.
- Skill selection stays semantic: an English `description` still selects the
  skill for a user writing in another language.
- Distribution tests assert the English text. RN-0031 (shipped text does not
  cite the toolkit's internal trail) is unchanged.

## 6. This repository's corpus (phase 4)

What is translated: everything listed in section 1 under "this repository's own
text", except code, which is phase 5.

Rules:

- **Translation, not rewriting.** IDs, frontmatter, states, dates and section
  order do not change. No decision is "improved" on the way.
- **`last-reviewed` does not change.** Translating is not reviewing. The body
  changes and the date does not, so `commit-discipline` sees no mass bump.
- **Slugs renamed to English** with `git mv`
  (`ADR-0013-os-dois-limiares-do-fechamento.md` →
  `ADR-0013-the-two-closing-thresholds.md`), and every link fixed.
  `living-docs/links` is the verifier.
- **Glossary terms become English**, preferring the term already used in code
  (`owner`, `trigger`, `debt`); a new term only where none exists.
- **Commits grouped by family** (ADR, TDR, RN/RF/RNF, DA, REL, plain documents),
  each body listing the IDs it touches and citing ADR-0033, so
  `commit-discipline` finds a cited ID for every changed artifact.
- **Open decisions table** gets canonical English column names; this
  repository's `field-map` becomes unnecessary and is removed in phase 5.
- **`CHANGELOG.md` gets an entry**, in English and without artifact IDs
  (`audience: external`): messages and seeds are now English; cadence wording
  and lexical trigger similarity are no longer enforced; `done-verifiable`
  accepts only `human`; the toolkit imposes no language on documents.

## 7. Internal code and closing (phase 5)

- Comments, JSDoc, `describe`/`it` names and assertion messages in English
  across both packages, `bin/` and `.github/workflows`.
- Remove `field-map` from this repository's `.ownership.yml`.
- Final verification: `npm ci`, `npm test`, `npm run typecheck`, and the full
  `living-docs check` over this repository, all green. A one-off search for
  accented characters confirms the only non-English text left is the section 4
  fixture. It is not kept as a guard.
- Commit messages from here on: English, `type(ID): subject`.

## 8. Risks

- **The `append-only` guard blocks phase 4 inside the session.** Mitigation:
  ADR-0033 is accepted by a human before phase 4 starts, and records how the
  commits pass.
- **A broken link after the slug renames.** Mitigation: `living-docs/links`
  runs after every phase 4 commit.
- **Meaning drift during translation of rules and decisions.** Mitigation:
  translation is reviewed per family commit, and structure (IDs, fields,
  section order) is diffable against the original.
- **Removing cadence detection lets a calendar trigger through.** Accepted:
  judging wording belongs to the agent and the reviewer, not to a word list in
  one or two languages.
