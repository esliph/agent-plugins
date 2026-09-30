# Agent contract — esliph agent plugins

Index and policy for every plugin in this marketplace. **No factual claim lives
here**: each one lives in the owning artifact and is read from there (`RN-0010`).
A plugin's toolchain and commands are in `plugins/<name>/CLAUDE.md`, when it has
one.

## Before touching anything

- The ownership map is `.ownership.yml` and the files it includes, one per
  plugin project under `plugins/<name>/`. No document path is guessed: it is
  read from there.
- How we work here: `CONTRIBUTING.md`. When something is done:
  `docs/definition-of-done.md`.
- What the marketplace must do is in `docs/requirements/`; what a plugin must do
  is in its own `docs/requirements/`. The ID space is one for the whole
  repository (`ADR-0037`).

## Policy

- **The rule comes before the code.** What the system must do is in a
  `docs/requirements/`; if the rule does not exist, open a `DA`
  (`/open-decision`) and stop. Do not invent the rule that is missing.
- **You do not accept decisions.** A skill writes `draft`/`open`; promoting is a
  human act — `living-docs/state-promotion` asks, and the answer is not yours.
- **You do not fix a frozen item.** An accepted ADR gets `superseded` and a new
  ADR — `living-docs/append-only` blocks the rest.
- **You do not edit a generated artifact.** What is in `generated[]` (or carries
  the marker) changes through the source and the generator —
  `ownership/generated-guard` denies and `ownership/generated-drift` enforces.
- **Document and code travel together.** A path watched in `watches` has an
  owning doc; `ownership/watch-reminder` reminds after the edit and
  `ownership/commit-guard` asks before the commit.
- **A conscious shortcut becomes a `TDR`** (`/debt`) with an observable payment
  trigger — it does not become an orphan `TODO`.
- **A change visible to whoever consumes travels with an entry in the
  `CHANGELOG.md` of the plugin it changes** — or with the reason written in the
  commit. `ownership/consumer-change-logged` enforces it; the format of the label
  is in the contract.
- **Text for readers on the outside carries no artifact ID.** What is marked
  `audience: external` explains in running text; the link stays in the artifact
  or in the commit — `living-docs/external-audience` enforces it.
- **What a plugin ships does not point inside this repository.** A seed, a skill
  and a CLI or hook message stay free of the ID and of the spec section from
  here; the why goes into the code comment — the distribution test enforces it.
- **Every document has a declared owner.** An ownership file says which skill
  answers; CODEOWNERS, who reviews — `ownership/owner-coverage` enforces both.

## What to never do

- Write a document that narrates the code.
- Create a documentation artifact outside a `docs/` or outside version control.
- Bump `last-reviewed` in bulk.
- Copy the content of any artifact above into here.
