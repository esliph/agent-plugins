---
name: ears-writing
description: This skill should be used when the user asks to "write an acceptance criterion", "write this requirement in EARS", "convert this to EARS", "which EARS pattern is this", "is this a WHEN or an IF", "review these EARS criteria", when a story or a bug report has to become acceptance criteria, when the lint reports an EARS pattern or shape error, or when choosing the words a project forbids in its criteria.
---

# Writing acceptance criteria in EARS

EARS — the Easy Approach to Requirements Syntax — gives every criterion one of
six sentence shapes. The shape is what makes a criterion checkable: a script can
tell whether it names a system, a trigger and a response, and a person can tell
what test would prove it. The criterion is the rule; the test is the proof.

## Boundary

**Territory** — decides how an acceptance criterion is worded: which pattern it
takes, where one criterion ends and the next begins, and which wordings are
refused. Proposes the vague words a project forbids in its criteria.

**Outside the boundary** — what the system should do, which is the person's
intent; which words are terms of the project's vocabulary and what they mean;
which ID a requirement gets; whether a criterion passes the lint, which a script
decides; which test proves a criterion; which words enter the forbidden list,
which the person decides.

**What I do not need to know** — the stack, the framework or the architecture.
A criterion that needs any of them to be written is describing the
implementation.

**Edge contract** — receives free text: a request, a story, a bug report, an
existing criterion. Delivers criteria, one sentence each, with the pattern named
and every gap marked `[NEEDS CLARIFICATION]` with its question.

## The six patterns

The keywords are canonical, in uppercase English. Everything else is written in
the language of the project.

| Pattern    | Shape                                                                           | Use it for                                    |
| ---------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| Ubiquitous | `THE <system> SHALL <response>`                                                 | What holds always, with no condition          |
| Event      | `WHEN <trigger>, THE <system> SHALL <response>`                                 | A response to something that happens          |
| State      | `WHILE <state>, THE <system> SHALL <response>`                                  | What holds for as long as a state lasts       |
| Unwanted   | `IF <condition>, THEN THE <system> SHALL <response>`                            | The response to an error, a fault or a misuse |
| Optional   | `WHERE <feature>, THE <system> SHALL <response>`                                | What holds only where a feature is present    |
| Complex    | More than one clause, in the order `WHERE`, `WHILE`, then `WHEN` or `IF … THEN` | One response that needs more than one clause  |

The labels are the short forms of the names EARS is usually taught with:
Event-driven, State-driven, Unwanted behaviour and Optional feature.

For an example of each pattern, the pattern it is confused with and the mistake
most often made with it, read `references/patterns.md`.

## The rules of one criterion

1. **One sentence, one system, one response.** Exactly one `SHALL`. A response
   joined to another by "and SHALL" is two requirements, each with its own ID.
   Dropping the second `SHALL` does not make two responses one: two verbs are
   one response only when they cannot be accepted, tested or changed apart.
   "Reject the coupon and show why" is one refusal; "issue the receipt and
   update the stock" is two requirements.
2. **`THE <system>` names who responds.** The system is a term of the project's
   vocabulary, written the same way every time.
3. **At most one of each clause.** One `WHEN` or one `IF … THEN`, never both; at
   most one `WHILE` and one `WHERE`. A precondition is a `WHILE`, not a second
   `WHEN`. Several states that must all hold go inside one `WHILE`, joined in
   the body.
4. **The response is observable.** Someone outside the system can see it happen:
   a message, a state, a value, a refusal. `SHALL validate the coupon` says
   nothing a test can watch; `SHALL reject the coupon and show "Coupon expired"`
   does.
5. **The response has its number.** A limit, a duration or a quantity is written
   with its value and unit. A criterion without the number is waiting for
   someone to guess it.
6. **A domain term is marked.** Write a term of the vocabulary as `[[term]]`,
   so that the lint can check it exists. The system after `THE` is checked
   without a mark. Do not mark ordinary words.
7. **A literal message goes in double quotes or backticks.** What is inside them
   is not read for keywords. Text in single quotes is.
8. **No implementation.** A table, an endpoint, a library or a class name in a
   criterion is a design decision that leaked. Say what is observed, not how it
   is produced.

## Working from free text

1. Read the project's vocabulary first — its path is `glossary` in
   `.kanon/config.yml` — and use its terms as written. A word that should be a
   term and is not there is marked in the criterion and reported as missing; it
   is not defined here.
2. Find the behaviors. Each thing the system does in response to something is a
   candidate criterion. A paragraph usually holds several.
3. For each one, ask what starts it. Nothing: Ubiquitous. Something happening:
   Event. Something lasting: State. Something going wrong: Unwanted. A feature
   being there: Optional.
4. Write the response as what an observer sees.
5. For each success, write its failures. An Event criterion almost always has
   Unwanted siblings: the input is invalid, a dependency is down, the
   permission is denied, the time runs out. A story with no `IF … THEN` has not
   specified failure — say so, do not invent the failures silently.
6. Mark what the text does not say with `[NEEDS CLARIFICATION]` and the
   question. Never fill a gap with a plausible value: the plausible value
   becomes the rule.
7. Keep the count proportional. Three to eight criteria per story is the usual
   range; a one-line fix is one criterion. Past eight, propose splitting the
   story.

## Wordings to refuse

- **EARS-washing.** A vague sentence with the keywords put on: "WHEN needed, THE
  system SHALL respond appropriately". The shape is right and nothing is
  checkable. The test: can two people write the same test from it?
- **`WHEN` for an error.** "WHEN the payment fails" reads as an ordinary event
  and hides that it is a failure path. Errors, faults and misuse are `IF … THEN`.
- **"SHALL … and SHALL …".** Two responses under one ID; when one changes, the
  ID no longer means one thing.
- **The hidden system.** "The coupon SHALL be rejected" does not say who
  rejects. Passive voice removes the system the pattern requires.
- **The vague word.** "Fast", "user-friendly", "as appropriate", "etc.",
  "normally". Each one is a decision postponed to whoever implements.
- **The implementation.** "SHALL store the token in Redis". The criterion would
  be false after a refactoring that changed nothing observable.

## Proposing the forbidden words of a project

A project keeps a list of words and phrases no criterion may use, under
`forbidden-words` in `.kanon/config.yml`; the lint flags them as whole words, in
any letter case. The list starts empty, and choosing it is part of setting the
project up.

Propose the list in the language the project writes its criteria in — a list in
another language matches nothing. Start from the vague-word families: speed and
ease with no measure, open-ended lists, hedges, and adverbs of frequency. Show
the proposal and write only what the person keeps. Do not propose a word that is
a legitimate term of the project's domain; when in doubt, ask.

## Additional resources

- **`references/patterns.md`** — each pattern with examples, its usual
  confusion and its usual mistake; criteria with the body in another language.
