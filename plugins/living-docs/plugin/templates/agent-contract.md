# Agent contract

Index and policy. **No factual claim lives here**: each one lives in the
owning artifact and is read from there.

## Before touching anything

- The ownership map is `.ownership.yml`. No document path is guessed: it is
  read from there.
- How we work here: `CONTRIBUTING.md`. When something is done:
  `docs/definition-of-done.md`.

## Policy

- **The rule comes before the code.** What the system must do is in
  `docs/requirements/`; if the rule does not exist, open a `DA`
  (`/open-decision`) and stop. Do not invent the rule that is missing.
- **You do not accept decisions.** A skill writes `draft`/`open`; promoting is a
  human act — `living-docs/state-promotion` asks.
- **You do not fix a frozen item.** An accepted ADR gets `superseded` and a new
  ADR — `living-docs/append-only` blocks the rest.
- **Document and code travel together.** A path watched in `watches` has an
  owning doc; `ownership/watch-reminder` reminds and `ownership/commit-guard`
  asks.
- **A conscious shortcut becomes a `TDR`** (`/debt`) with an observable payment
  trigger.
- **Text for readers on the outside carries no artifact ID.** What is marked
  `audience: external` explains in running text; the link stays in the artifact
  or in the commit — `living-docs/external-audience` enforces it.

## What to never do

- Write a document that narrates the code.
- Create a documentation artifact outside version control.
- Bump `last-reviewed` in bulk.
- Copy the content of any artifact above into here.
