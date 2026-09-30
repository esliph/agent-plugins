---
title: Definition of Done
owner: '@esliph/engineering'
trigger: >
  When an item becomes required to consider work done, or stops being — and
  every time something was called done while missing a step from this list.
last-reviewed: 2026-09-15
---

# Definition of Done

A change is done when all the boxes below are ticked. Each item says **what
verifies it**: a check, a hook, or a person. An item nobody verifies does not
belong on this list — it becomes an intention, and an intention is not a definition.

- [ ] The new behavior has a requirement with an ID, written **before** the code — verification: `living-docs/frontmatter` (structure) and human (the order).
- [ ] Every `active` rule is cited by at least one test — verification: `living-docs/citation-coverage`.
- [ ] Every cited ID resolves to an existing, non-retired item — verification: `living-docs/id-integrity`.
- [ ] The decision that was not obvious became an ADR, and the gap that appeared became a `DA-nnnn` — verification: human (`living-docs/state-promotion` intercepts the acceptance).
- [ ] The conscious shortcut became a `TDR-nnnn` with an observable payment trigger — verification: `living-docs/shortcut-debt` reminds; recording it is human.
- [ ] The owning doc of every watched path touched by the change is in the same commit — verification: `ownership/watch-reminder` reminds, `ownership/commit-guard` asks.
- [ ] No frozen item had its body edited — verification: `living-docs/append-only`.
- [ ] No generated artifact was edited by hand, and the regenerated contract is in the same commit — verification: `ownership/generated-guard` (blocks) and `ownership/generated-drift` (`ownership validate`).
- [ ] The consumer-visible change carried the entry under `## [Unreleased]`, or the reason written in the commit — verification: `ownership/consumer-change-logged` (`ownership validate --base <ref>`).
- [ ] The commit message cites the affected ID — verification: `living-docs/commit-discipline` (`living-docs validate --base <ref>`).
- [ ] Every new document was declared in `.ownership.yml` and in CODEOWNERS — verification: `ownership/owner-coverage`.
- [ ] No internal link was left broken, and no binary attachment entered under `docs/` — verification: `living-docs/links`.
- [ ] The recorded debt declares `pay-when`, and no debt with its trigger met stays `open` — verification: `living-docs/staleness`.
- [ ] The watched path that changed carried the owning doc, or the reason written in the commit — verification: `ownership/commit-guard` asks, `ownership/watch-satisfied` fails (`ownership validate --base <ref>`).
- [ ] Each changed plugin's workflow (`plugin-<name>.yml`: tests, type-check, lint) and `marketplace.yml` (manifests, `ownership validate [--base <ref>]`, `living-docs validate [--base <ref>]`) pass — verification: the checks of the core and of living-docs (`ownership/owner-coverage`, `living-docs/frontmatter`, …), run by those workflows.
- [ ] No agent and no person went wrong for lack of context that would have fit in an existing artifact — and, when they did, the owning artifact gained the missing line — verification: human (spec §12, criterion 9).
- [ ] No document-volume metric was used as a quality signal: neither page counts, nor coverage, nor "documenting what was done" — verification: human (spec §12, criterion 10).

## What this list is not

It is not a code-review checklist, and it does not measure volume: nothing here
asks for "documenting what was done". What it asks is that the **rule** and the
**decision** exist where someone will find them later.
