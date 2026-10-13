# Changelog

This file is aimed at whoever **uses** the `ownership` plugin. Single test: if
an entry only makes sense to whoever wrote the code, it does not belong here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

An entry is born in the change that causes it, not on the eve of the release.

## [Unreleased]

### Added

- The ownership file, `version: 1`: `owned` (the owner of each path, with an
  optional skill), `generated` (files produced by a command), `ignore`,
  `include` and `basePath`. Paths are literal, case-sensitive and disjoint.
- `ownership validate`, with three checks over the whole repository:
  `ownership/owner-coverage`, `ownership/codeowners-match` and
  `ownership/generated-drift`. `--check` selects checks, `--format` prints
  `text`, `json` or `github` annotations, and `--jobs` sets how many generators
  run at the same time.
- `ownership explain <path>`: every rule that reaches a path and where it was
  declared.
- `ownership init` and the `/ownership:init` command: create the root ownership
  file as a skeleton, for a single owner, or derived from the `CODEOWNERS`.
- A session hook that refuses a hand edit of a generated file, declared or
  marked with `generated: do not edit` on its first line.
- `plugins` blocks: configuration that other plugins read, at the top of the
  root file and in each `owned` entry.
- A JSON Schema for the ownership file, for completion and validation in the
  editor.
- The package as a library for other plugins: the resolved configuration, the
  checks, the `CODEOWNERS` evaluation and the generated marker.

### Fixed

- `ownership validate` no longer crashes with a stack trace when a path in
  `generated` names a directory: the check reports that the path is a directory
  and not a file.
- A generated file that exists but cannot be read, for lack of permission or
  any other read error, is reported by `ownership validate` as a finding that
  gives the reason, instead of crashing the command.
- `ownership explain` treats a submodule, a nested repository and a symbolic
  link to a directory as the single file the repository lists, so it shows the
  `owned` entry that declares it instead of calling the path excluded.
- A YAML alias now works wherever the value it stands for would: a whole plugin
  block, a whole `plugins` map, an `owned` or `generated` entry, or a single
  value such as an owner.
