---
description: Records, unifies or bans a term of the project's controlled glossary
argument-hint: '[term]'
---

Use the `glossary-management` skill to record, unify or ban this term in the
project's glossary: $ARGUMENTS

The glossary lives at the path `glossary` names in `.kanon/config.yml`. When
that file belongs to another tool, follow the format it already has and add
nothing the owner of the file would not.

Ask before banning a term: a banned term turns every criterion that uses it
into a lint error. With no argument, read the glossary back and point out terms
that share a meaning and terms no criterion uses.
