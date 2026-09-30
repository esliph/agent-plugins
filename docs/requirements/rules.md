---
title: Business rules
owner: '@esliph/engineering'
trigger: >
  Before implementing any behavior of this family, and on every new or changed
  rule.
last-reviewed: 2026-09-18
---

# Business rules

Each requirement is a section with a citable ID. The ID is never recycled, and it
is what makes the blast radius computable by `grep`. Format: `templates/requirements.md`.

## RN-0041 — Every plugin in the marketplace has a distributed directory and the minimum governance

- **status:** draft
- **relates-to:** ADR-0036
- **out of scope:** what a plugin's own workflow verifies; the content of its README and CHANGELOG, which their owners judge

The marketplace manifest and every plugin manifest parse as JSON. Every plugin
listed in the marketplace has a `source` inside the repository that exists and
contains `.claude-plugin/plugin.json`, whose `name` is the entry's name and whose
`version` equals the entry's when the entry declares one. The directory above the
source is the plugin's project, and it holds `README.md`, `CHANGELOG.md` and
`.ownership.yml`.
