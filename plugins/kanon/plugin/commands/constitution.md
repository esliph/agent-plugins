---
description: Creates or evolves the project's constitution — the principles it does not negotiate
argument-hint: '[principle to add or change]'
---

Create or evolve the constitution of this project: $ARGUMENTS

The constitution lives at the path `constitution` names in `.kanon/config.yml`.
Read it before proposing anything; when the configuration does not exist, the
foundation comes first.

- A principle is an article: a numbered heading that states it affirmatively,
  and a short paragraph that says what it rules out.
- Adding, changing or removing a principle is the person's decision. Show the
  article as it would read and ask before writing it.
- A principle that nothing can check is an intention. Say, for each article,
  what verifies it — a lint rule, a review, a test — or say that nothing does.
- The article that says every acceptance criterion follows EARS and uses
  glossary terms is what the lint enforces. Changing it changes what the lint
  means; say so before touching it.

With no argument, read the constitution back and point out any article that
contradicts another or that nothing verifies.
