<!-- generated: do not edit -->
<!-- source: src/checks/catalog.ts (CHECK_CATALOG) and the core catalog (CORE_CHECK_CATALOG) — regenerate: run this file with node --conditions=development -->

# Checks contract

The identifiers below are public and stable: they appear in the CLI output, are
cited by the Definition of Done of whoever uses the toolkit, and do not change
meaning (`docs/contracts/versioning-policy.md`). Each rule runs in a single plugin.

## living-docs

| ID | Check | Fails when | Command |
| --- | --- | --- | --- |
| living-docs/frontmatter | structure lint | Frontmatter missing or invalid; empty required field; `id` outside the format or the territory of the artifact; `status` in an artifact with no declared `states`; collection item without `status`; `trigger` missing or empty; `last-reviewed` outside the ISO format. | `living-docs validate` |
| living-docs/id-integrity | ID lint | Duplicate ID, out of sequence, or reused from `docs/ids-retired.txt`; citation that does not resolve to an existing item. | `living-docs validate` |
| living-docs/citation-coverage | traceability | Open bidirectional pair; `active` requirement with no citation in the `cited-by` paths; `accepted` ADR without `relates-to`; `resolved` open decision without the ADR that closed it. | `living-docs validate` |
| living-docs/staleness | staleness | An `open` debt does not declare a verifiable `pay-when`, or the declared trigger has already happened in the repository. `last-reviewed` beyond `stale-after-months` produces a warning, not a failure — and an item in a frozen state does not expire. | `living-docs validate` |
| living-docs/agent-contract-duplication | agent contract duplication | The agent contract repeats, word for word, a sentence from an artifact or document with an owning skill, above the toolkit word floor. | `living-docs validate` |
| living-docs/done-verifiable | done verifiable | A Definition of Done item does not name what verifies it — the identifier of a check or hook, or the fixed marker `human`. | `living-docs validate` |
| living-docs/open-decision-claim | open decision claim | The diff between the base and `HEAD` touches a path claimed by an open decision, with no `Docs: none — <reason>` in any commit message. | `living-docs validate --base <ref>` |
| living-docs/links | links | Relative internal link that does not resolve to an existing file or directory; `[[wikilink]]` with no target in the corpus; binary-format file in the documentation. A link inside a code block or inline markup does not count. | `living-docs validate` |
| living-docs/commit-discipline | commit discipline | With `--base <ref>`: the diff changes only the review date of `last-reviewed-bump-limit` documents or more, with no other change in the body of any of them; or it changes an artifact file and no commit message in the diff cites one of the IDs declared in it. | `living-docs validate` |
| living-docs/trigger-routing | trigger routing | Never fails. Warns when a document with a `trigger` declares an owning skill that the toolkit root does not have; the `trigger` of a collection item is not examined. | `living-docs validate` |
| living-docs/external-audience | external audience | A document or artifact declared `audience: external` cites, outside the frontmatter and fenced code blocks, an ID whose prefix has a declared family (`id-prefix`) — in prose, in backticks or in a link path. | `living-docs validate` |

## ownership

| ID | Check | Fails when | Command |
| --- | --- | --- | --- |
| ownership/declared-state | declared state | The state of a file or item (the `state-field` field, `status` by default) is outside the `states` declared for the path; the same key appears twice in one file; or the frontmatter `owner` does not start with `@`. | `ownership validate` |
| ownership/generated-drift | generated drift | The output of the command declared in `generated[]` differs from the versioned file; the command fails; or the declared file does not exist. | `ownership validate` |
| ownership/owner-coverage | owner coverage | A repository file is covered by neither `owned[]` nor `ignore`; an `owned[]` path does not exist or has no line in CODEOWNERS; CODEOWNERS does not exist; or the `doc` of a `watches` rule does not exist or has no entry in `owned[]`. | `ownership validate` |
| ownership/derivation-resolves | derivation resolves | A document that derives from a source does not declare the derivation field, or the field points outside the source or to a file that does not exist. | `ownership validate` |
| ownership/watch-satisfied | watch satisfied | The diff between the base and `HEAD` touches a `watches` path and the `doc` of the rule is not in the same diff, with no `Docs: none — <reason>` in any commit message. | `ownership validate --base <ref>` |
| ownership/consumer-change-logged | consumer change logged | The diff touches a `watches` path marked `consumer-visible: true` and the `doc` of the rule is not in the same diff with an item under `## [Unreleased]`, with no `Changelog: none — <reason>` in any commit message. | `ownership validate --base <ref>` |
