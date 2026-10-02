# Changelog

This file is aimed at whoever **consumes** the `kanon` plugin. Single test: if
an entry only makes sense to whoever wrote the code, it does not belong here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

An entry is born in the PR that causes the change, not on the eve of the release.

## [Unreleased]

### Added

- `kanon` plugin in the marketplace: the foundation of Spec-Driven Development
  with EARS as the native format of acceptance criteria.
- `/kanon:init` creates the configuration, a constitution and a glossary, and
  overwrites nothing; a project that already has a glossary or a constitution
  points to it instead of getting a second one.
- `/kanon:capability` registers a capability and its ID prefix, splits one that
  reached its last ID, and allocates the next requirement ID with
  `/kanon:capability next <CAP>`. Each capability counts its own requirement
  IDs, from `001` to `999`.
- `/kanon:ears-lint` checks the specs without asking a model anything: the six
  EARS patterns, one system and one response per criterion, the ID format,
  duplicates, removed IDs, forbidden words and glossary terms. It warns when a
  capability nears its limit.
- `/kanon:ears-convert` and `/kanon:ears-explain` turn free text into EARS
  criteria and explain a pattern.
- `/kanon:constitution` and `/kanon:glossary` create and evolve the project's
  principles and its controlled vocabulary.
- Two skills, loaded when the work calls for them: writing acceptance criteria
  in EARS, and keeping the glossary.
- `/kanon:change` opens a change, syncs it and drops it. A change is a folder
  `changes/<date>-<slug>/` with a proposal and one delta per capability, in the
  sections `ADDED`, `MODIFIED` and `REMOVED`. Syncing merges the deltas into the
  current specs requirement by requirement, leaves everything else in a spec as
  it was, and archives the folder; dropping retires the IDs the change
  allocated and archives it.
- `/kanon:status` lists the open changes, with what each one adds, modifies and
  removes per capability and how many errors and warnings it has.
- Seven lint rules for changes: `kanon/change-shape`, `kanon/delta-shape`,
  `kanon/delta-target`, `kanon/delta-added`, `kanon/delta-duplicate`,
  `kanon/delta-supersedes` and `kanon/delta-conflict`.

### Changed

- `/kanon:ears-lint` also checks every open change under `changes/`, and a path
  under `changes/` is read as a delta. A project with an open change that
  breaks a rule now fails the lint; archived changes are never checked.
