# Changelog

This file is aimed at whoever **consumes** the `ownership` plugin. Single test:
if an entry only makes sense to whoever wrote the code, it does not belong here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

An entry is born in the PR that causes the change, not on the eve of the release.

## [Unreleased]

### Added

- `ownership` plugin in the marketplace: owner, lifecycle, generated artifact and
  the code→doc link, with hooks of its own.
- The root ownership file accepts, at the top, a configuration block per plugin
  listed in `plugins:`; in an included file, it is an error.
- A frontmatter `owner` without `@` becomes a finding of `ownership validate`.

### Changed

- The v1 schema error of `ownership` says the file needs to be rewritten as v2.
- A plugin block that is not a map is now a load error.

### Removed

- `consumer-visible-paths`: the `consumer-visible: true` mark on the `watches`
  rules is the list.

### Fixed

- An ownership file value that is a map or a list where a single value was
  expected is now shown as written in the error message, instead of
  `[object Object]`.
