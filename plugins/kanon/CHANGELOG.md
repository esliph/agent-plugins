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
