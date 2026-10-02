---
title: Non-functional requirements
owner: '@esliph/engineering'
trigger: >
  Before implementing any behavior of this family, and on every new or changed
  rule.
last-reviewed: 2026-10-02
---

# Non-functional requirements

Each requirement is a section with a citable ID. Format: `templates/requirements.md`.

## RNF-0007 — Every artifact kanon writes is versioned text, readable without the plugin

- **status:** active
- **out of scope:** the traceability matrix of a later slice, which is generated and still plain text

What kanon writes in a project is Markdown, or YAML for the configuration, kept
in the project's repository. Nothing kanon needs lives in a database, a cache or
a binary file, and a person without the plugin installed can read every
requirement, registry and principle.

## RNF-0008 — kanon runs on the host's Node as copied, and depends on no other plugin

- **status:** active
- **out of scope:** `git`; the workflow templates of a later slice; YAML outside the shape of the configuration and of a registry, which is refused with its line instead of read

kanon runs on Node 24 or greater, with no build step and no dependency to
install: the plugin directory copied alone, with nothing beside it, is a working
command line. It neither requires nor reads any other plugin of this
marketplace; a project that has one of them is served by pointing kanon's paths
at the existing files.
