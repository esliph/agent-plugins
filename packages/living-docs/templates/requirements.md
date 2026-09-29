---
title: {{TITLE}}
owner: "{{OWNER}}"
trigger: >
  Before implementing any behavior of this family, and on every new or changed
  rule.
last-reviewed: {{TODAY}}
---

# {{TITLE}}

Each requirement is a section with a citable ID. The ID is never recycled, and
it is what makes the blast radius computable by `grep`.

Format of a section:

```
## {{PREFIX}}-nnnn — Affirmative title of the rule

- **status:** draft
- **relates-to:** ADR-nnnn
- **out of scope:** what this rule deliberately does not cover

The statement, in one or two sentences. What **must** be — never what the code does.
```

The `nnnn` above is literal on purpose: the example must not become a real
requirement or a dangling citation. Replace it with the next free number,
checked against `docs/ids-retired.txt`.
