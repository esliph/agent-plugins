---
name: glossary-keeper
description: >
  Use when a new domain term shows up in code, a spec or a conversation, when
  the same word is being used for two different things, when someone asks "does
  this already have a name?", "what term do we use for this?", "is this a
  synonym of something that already exists?", "why does the code call it X and
  the requirement call it Y?" — or when a concept is renamed and the old name
  keeps showing up in the code.
---

# glossary-keeper — owner of the domain vocabulary

## Overview

The glossary is the single source of names for a concept. A term is identified
by its **name**, never by a numbered ID — a divergence between the name in the
code and the term is a bug, not a synonym.

The path is `docs/glossary.md` — read `.ownership.yml` anyway, because other
artifacts may have moved.

## What you own

| Artifact           | What it is                                                                        | Shape                          |
| ------------------ | --------------------------------------------------------------------------------- | ------------------------------ |
| `docs/glossary.md` | The single name of each domain concept, with definition, name in code and source | Single file, table, mutable    |

Row format: `templates/glossary.md`. Do not reproduce it here.

## When to use / when not to

**Use** on every new domain term, every name ambiguity, and every concept
rename.

**Do not use** to name an implementation detail with no business meaning
(variable name, internal class name) — that is not domain, it is a code choice.

**The cost of using it needlessly:** a term added for a stylistic choice
inflates the table that `requirements-keeper` consults before naming any new
requirement — and a table nobody can read in full stops being the single source
of names.

## Procedure

1. **Search before creating.** A `grep` for the term and for likely synonyms in
   `docs/glossary.md`. An almost-identical term is a sign that the word already
   exists under another name — not that it needs a second entry.
2. **One meaning per term, no exceptions.** If the same word covers two
   concepts, two terms — one of them `status: banned`, pointing to the
   replacement in the `Do not confuse with` column.
3. **A divergence between the name in the code and the term is a bug.** Propose
   the rename in the code; do not add a second row to the glossary to
   accommodate the habit of whoever wrote it.
4. **Every definition points to its source** — the `RN`/`ADR` that originates
   it. Without a source, the entry is born `status: draft` until one exists.
5. **Fill in "Do not confuse with"** whenever there is a real risk of
   confusion — it is what prevents the next repeated question.
6. **Name by the term, not by an ID**, in any citation — the glossary has no
   `<PREFIX>-<number>` syntax.
7. **Run `living-docs validate`** before finishing — knowing that it does not
   verify the terms: duplication and source are your check, not CI's.
8. **Cite the term (by name) in the commit message.**
9. **The seed is not content.** On the first write over what `init` seeded,
   the "Example term" row goes and the real vocabulary comes in.

## Boundaries

| Yours                                                 | Not yours                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Naming a domain concept, with a single meaning        | Deciding the business rule about that concept (→ `requirements-keeper`)  |
| Detecting two terms for the same thing and banning one | Accepting the rename of an accepted term (that is the term owner's, a human act) |
| Proposing the rename in the code when it diverges from the term | Doing the rename — that belongs to the agent working in the code |
| Pointing to the row format                            | Duplicating the table here                                               |

## Checklist

- [ ] The term does not already exist under another name — verification: human
- [ ] One meaning per term; a divergence became `banned` + replacement, not a second row — verification: human
- [ ] "Name in code" filled in, and no unresolved divergence from the term — verification: human
- [ ] "Source" points to a real `RN`/`ADR`, or the entry was born `draft` — verification: human
- [ ] No term received a numbered ID — verification: human
- [ ] "Do not confuse with" filled in where there was a real risk of confusion — verification: human
