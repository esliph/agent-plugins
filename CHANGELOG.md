# Changelog

This file is aimed at whoever installs plugins from this marketplace. Each
plugin keeps its own changelog in its directory under `plugins/`.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

An entry is born in the PR that causes the change, not on the eve of the release.

## [Unreleased]

### Changed

- Each plugin now lives in its own directory under `plugins/`, and the
  marketplace installs it from that directory's `plugin/` folder. Installing by
  name (`/plugin install living-docs@esliph`) does not change.
