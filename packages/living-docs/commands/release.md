---
description: Prepares a version — derives the release note from the CHANGELOG and moves the Unreleased entries.
argument-hint: '[version]'
---

Invoke the `release-historian` skill to prepare version `$ARGUMENTS`.

The release note is **derived** from `CHANGELOG.md`, never written anew: the
entries under `## [Unreleased]` become the version's section, and the note
keeps the frame — highlights, what needs the attention of whoever upgrades,
announced deprecations.

It is born `status: draft`. Publishing is a human act: `living-docs/state-promotion` intercepts the promotion
and the answer is not yours. After `published`, `living-docs/append-only` freezes the file.
