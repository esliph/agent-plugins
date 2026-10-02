---
name: glossary-management
description: This skill should be used when the user asks to "add a term to the spec glossary", "define this term for the acceptance criteria", "what does the spec call this", "are these two spec terms the same thing", "ban this term from the criteria", "rename this domain term in the specs", or when acceptance criteria use the same word for two different things or two words for the same thing, or the EARS lint reports a system name or a marked term that is not in the glossary named in `.kanon/config.yml`.
---

# Keeping the controlled glossary

The glossary is where the real ambiguity of a specification lives. "Valid
coupon" and "active user" read as clear until two people implement them. A
criterion in a perfect sentence shape still means nothing if its words do not —
so the vocabulary is controlled: each term has one meaning, and the lint checks
that a criterion uses terms that exist.

## Boundary

**Territory** — decides when a word becomes a term, how a term is defined and
when two terms are unified. Proposes when a term is banned and what replaces
it.

**Outside the boundary** — how an acceptance criterion is worded; what the
system should do; the format and the upkeep of a glossary another tool or team
already owns, which are followed as found; whether a term is banned, which the
person decides.

**What I do not need to know** — how a concept is named in the code. The
glossary names the domain; a code name that differs is information for the row,
never the reason for the term.

**Edge contract** — receives a word, a pair of words or a lint finding about a
missing term. Delivers the rows to add or change, each with its definition and
status, and the list of criteria the change touches.

## Where the glossary is

Read the path from `glossary` in `.kanon/config.yml`. It is a Markdown table
with a `Term` column. A row whose `Status` column says `banned` is a banned
term. Every other column belongs to the project: keep the columns the table
already has, and do not add one.

## What the lint does with it

Three checks, and nothing else:

- The system of a criterion — the text between `THE` and `SHALL` — must be a
  term that is not banned.
- Every word a criterion marks as `[[term]]` must be a term that is not banned.
- A banned term is an error wherever it appears in a criterion, marked or not,
  **including inside a longer term**.

Terms are compared as whole words, in any letter case. Write the term in the
glossary in the form criteria use.

## When a word becomes a term

Add a term when the word carries a decision:

- It names the **system** of a criterion. Every system is a term, and it is
  recorded before the first criterion that names it.
- It has a **boundary someone could get wrong**: "expired", "active",
  "eligible", "valid". If two people could disagree about a case, it needs a
  definition.
- It is a **noun of the domain** the team uses as if everyone knew it.

Do not add ordinary words. Apart from a system, do not add a term no criterion
uses yet: a glossary that lists everything is read by no one.

## Writing the definition

A definition lets someone decide a case. Write it so that, given a concrete
example, the answer is yes or no.

- State the boundary, with its values: "A coupon is **expired** from 00:00 of
  the day after its end date, in the store's time zone."
- Say what the term is not, when a neighbor exists: "Not the same as _revoked_,
  which is an act of the store."
- Do not define a term with itself, or with another undefined term.
- Do not describe the implementation. The definition survives a rewrite.

When the definition cannot be written because the decision was never made, stop
and ask. A guessed boundary in the glossary becomes the rule for every criterion
that uses the term.

## Before banning a word

A ban is checked by the lint against every criterion, so it is proposed and the
person decides. Before proposing one:

1. List the criteria that use the word. Each one fails the lint once the word is
   banned.
2. Check that the word does not occur inside any term that stays. Banning
   `coupon` makes `[[expired coupon]]` an error too. When a term that stays
   contains the word, do not ban it: leave the bare word unbanned and rely on
   criteria marking the precise term.
3. Say what replaces it. The definition of a banned row says what to write
   instead.

After the person confirms, change the row's status to `banned`. Rewriting the
criteria that used the word keeps their IDs: the wording changed, the intent did
not.

## Two words, one meaning

Keep one and propose banning the other. Keep the word the people of the domain
use, not the one the code uses.

## One word, two meanings

Split it. Give each meaning its own term, with a qualifier that tells them
apart. The qualified terms contain the bare word, so the bare word is not
banned: record in its row that it is ambiguous and which two terms replace it.
Check every criterion that used it: each one meant one of the two, and saying
which is a question for the person when the text does not settle it.

## Renaming and deprecating

A term is never deleted, and its row is never rewritten to mean something else.
To rename, add the new term and propose banning the old one, pointing to the
new — unless the new name contains the old word, in which case the old row
stays unbanned and says which term to prefer. To retire a concept the system no
longer has, propose banning the term and say so in its definition. The banned
row is what stops the old word from coming back.

## When the lint reports a missing term

The finding is one of three things, and the fix differs:

- **A typo or a variant** of an existing term. The criterion is what is wrong.
- **A real term not recorded yet.** Define it and add the row.
- **Not a term at all.** The mark in the criterion is what is wrong.

Never add a row only to silence the finding. A term with a definition nobody
thought about is worse than the error.
