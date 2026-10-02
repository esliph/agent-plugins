---
description: Converts free text into EARS acceptance criteria, without writing them to the specs
argument-hint: '<text, or a path to a file with it>'
---

Use the `ears-writing` skill to convert this into EARS acceptance criteria:
$ARGUMENTS

- One criterion per behavior. A sentence that holds two responses becomes two
  criteria.
- Name the pattern of each criterion beside it.
- Where the text does not say what a criterion needs — the trigger, the system,
  the threshold, what happens on failure — write `[NEEDS CLARIFICATION]` with
  the question, instead of inventing the answer.
- Before answering, check each criterion against the rules the lint applies:
  the keywords in uppercase English, one system, at most one trigger, exactly
  one `SHALL`, no forbidden word, and the system and every marked term in the
  glossary. Say which terms would have to enter the glossary first.

The output is a proposal in the conversation. Allocate no ID and write nothing
to `specs/`.
