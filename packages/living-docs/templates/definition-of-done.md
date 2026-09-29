---
title: Definition of Done
owner: "{{OWNER}}"
trigger: >
  When an item becomes required to consider work done, or stops being — and
  every time something was called done while missing a step from this list.
last-reviewed: {{TODAY}}
---

# Definition of Done

A change is done when all the boxes below are ticked. Each item says **what
verifies it**: a check, a hook, or a person. An item nobody verifies does not
belong on this list.

- [ ] The new behavior has a requirement with an ID, written before the code — verification: `living-docs/frontmatter` and human.
- [ ] Every `active` rule is cited by at least one test — verification: `living-docs/citation-coverage`.
- [ ] Every cited ID resolves to an existing, non-retired item — verification: `living-docs/id-integrity`.
- [ ] The decision that was not obvious became an ADR; the gap became a `DA-nnnn` — verification: human (`living-docs/state-promotion` intercepts the acceptance).
- [ ] The conscious shortcut became a `TDR-nnnn` with an observable payment trigger — verification: `living-docs/shortcut-debt` reminds; recording it is human.
- [ ] The owning doc of every watched path touched is in the same commit — verification: `ownership/watch-reminder` and `ownership/commit-guard`.
- [ ] No frozen item had its body edited — verification: `living-docs/append-only`.
- [ ] No generated artifact was edited by hand — verification: `ownership/generated-guard` and `ownership/generated-drift` (`ownership validate`).
- [ ] The consumer-visible change carried the entry under `## [Unreleased]`, or the reason written in the commit — verification: `ownership/consumer-change-logged` (`ownership validate --base <ref>`).
- [ ] The commit message cites the affected ID — verification: human.

Add your project's steps here (build, lint, deploy), **each one with the
verification that covers it**. An item with no verification becomes an
intention, and an intention is not a definition of done.
