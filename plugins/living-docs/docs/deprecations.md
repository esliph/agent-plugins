---
title: Deprecations
owner: '@esliph/engineering'
trigger: >
  When something published is announced for removal, and when an announced
  deprecation is actually removed.
last-reviewed: 2026-09-15
---

# Deprecations

A deprecation records four things, without exception: the announcement date, the
removal version or date, the replacement, and the link to the migration guide.
If any is missing, it is not a deprecation — it is a compatibility break, and it
goes through an ADR.

What is public, and therefore can be deprecated, is in
`docs/contracts/versioning-policy.md`.

| What | Announced on | Removed in | Replacement | Migration guide | Status |
| ---- | ------------ | ---------- | ----------- | --------------- | ------ |

No deprecation announced so far. The empty table is information: nothing that is
public has changed meaning since the first version.

<!-- Owning skill: release-historian. -->
