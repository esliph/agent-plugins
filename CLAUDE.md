# Agent contract — esliph agent plugins

Index and policy for every plugin in this marketplace. **No factual claim lives
here**: each one lives in the artifact that owns it and is read from there. A
plugin's toolchain and commands are in its `Spurfile` and its `README.md`.

## Before touching anything

- Who owns each path is in `.ownership.yml` and the files it includes, one per
  plugin project under `plugins/<name>/`. No path is guessed: it is read from
  there.
- How we work here: `CONTRIBUTING.md`.
- What a plugin must do is in its own `docs/requirements/`.

## Policy

- **The rule comes before the code.** What a plugin must do is in its
  `docs/requirements/`; if the rule does not exist, stop and ask. Do not invent
  the rule that is missing.
- **You do not edit a generated artifact.** What is in `generated[]` (or carries
  the marker) changes through the source and the generator —
  `ownership/generated-guard` denies and `ownership/generated-drift` enforces.
- **A change visible to whoever consumes travels with an entry in the
  `CHANGELOG.md` of the plugin it changes** — or with the reason written in the
  commit, as `Changelog: none — <reason>`.
- **Text for readers on the outside carries no requirement ID.** A README and a
  CHANGELOG explain in running text; the ID stays in the requirements.
- **What a plugin ships does not point inside this repository.** A skill, a
  command and a CLI or hook message stay free of requirement IDs and of paths
  from here; the why goes into the code comment — the distribution test
  enforces it.
- **Every file has a declared owner.** An ownership file says who owns it;
  CODEOWNERS, who reviews — `ownership/owner-coverage` and
  `ownership/codeowners-match` enforce both.
- **Tests and commits cite no requirement ID.** A test name says the behavior
  it proves; a commit message uses `type(scope): subject`.

## What to never do

- Write a document that narrates the code.
- Create a documentation artifact outside a `docs/` or outside version control.
- Copy the content of any artifact above into here.
