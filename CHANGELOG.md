# Changelog

This file is aimed at whoever **consumes** `living-docs`. Single test: if an
entry only makes sense to whoever wrote the code, it does not belong here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

An entry is born in the PR that causes the change, not on the eve of the release.

## [Unreleased]

### Added

- `ownership` plugin in the marketplace: owner, lifecycle, generated artifact and
  the code→doc link, with hooks of its own.
- `living-docs init --invoke-ownership <command>`: how the core's CLI is called
  in the installed workflow (default `npx ownership`, which only works after the
  core is published on npm).
- The root ownership file accepts, at the top, a configuration block per plugin
  listed in `plugins:`; in an included file, it is an error.
- A frontmatter `owner` without `@` becomes a finding of `ownership validate`.
- `validate`, `drift` and `changelog` now report how long the set of checks took
  and what the declared ceiling is. The measurement does not change the exit code.
- `CI-9` (`living-docs validate --base <ref>`): fails the diff that only changes
  the review date of several documents, and the one that changes an artifact file
  without any commit message citing an ID declared in it.
- `CI-10` (`living-docs validate`): the `trigger` of a document and the
  `description` of the skill declared as its owner must speak of the same event.
  An owning skill that does not exist in the toolkit root produces a warning, not
  a failure.
- `last-reviewed-bump-limit` in `docs/.ownership.yml`: how many documents with a
  bare date bump fail. Default 3, floor 2.
- `id-format` in `docs/.ownership.yml`: a project declares how its IDs are written
  (`separator`, `padding`). When absent, the form remains
  `<PREFIX>-<4 digits>`.
- `living-docs init --id-separator <s> --id-padding <n>`: declares the written
  form of the project's IDs. `--dry-run` reports the form the repository already
  uses, without changing any file.
- `living-docs init` now installs the stage's CI workflow at
  `.github/workflows/living-docs.yml`, with the invocation command coming from
  `--invoke` (default `npx living-docs`). The installed workflow does not mention
  Docker, and a workflow that already exists is kept.
- `.claude-plugin/marketplace.json`: the `living-docs` plugin now has an
  installation path.
- `living-docs init --marketplace <owner/repo>` registers the plugin in the
  repository's `.claude/settings.json`, by merge — hooks and plugins that were
  already there are preserved. Without the option, the registration is not written
  and `init` says what was missing.
- `living-docs init --stage multi-team`: the multiple-teams stage now exists and
  installs Phase 7 — the `validate --base <ref>` step in the workflow, in addition
  to everything `production` installs.
- `HK-8`: editing a path claimed by an open decision now asks, naming the
  decision, the gap and the owning skill. The field is optional — the `Blocks`
  column (canonical `blocks`) in the list of open decisions.
- `HK-6`: at the start of the session, the inventory reaches the context —
  declared and absent artifacts and documents, open decisions, debts with their
  trigger met and expired documents. It is context injection, never a block.
- `AG-1` `docs-divergence-auditor` and the `/docs-audit` command: audit of
  code→documentation divergence in a given scope, in an isolated context, with
  neither `Edit` nor `Write`.
- `documents:` in `docs/.ownership.yml`: declares a document with an owner and no
  ID family (`CONTRIBUTING.md`, the Definition of Done, the agent contract,
  `CHANGELOG.md`) with `path`, `owner`, an optional `skill` and an optional `role`
  (`agent-contract`, `definition-of-done`). The key is optional: configuration
  written in earlier versions remains valid.
- `living-docs changelog --base <ref>` subcommand: fails when the branch diff
  touches a path declared in `consumer-visible-paths` and the entry under
  `## [Unreleased]` does not travel with it (`CI-6`).
- Exception label `Changelog: none — <reason>` in the commit message, for a change
  that is really not visible to whoever consumes. Without a reason, it does not
  count.
- `HK-7` hook: a new shortcut marker (`TODO`, `FIXME`, type or lint suppression,
  ignored test) without a `TDR-nnnn` nearby generates a reminder. Never a block.
- `living-docs init --stage production` now installs `CHANGELOG.md`,
  `docs/deprecations.md`, `docs/releases/` and `docs/migrations/`, and declares
  the `REL` artifact in `docs/.ownership.yml`.
- ID prefix `REL` for a release note, with the states `draft` and `published`.
  Once published, it is frozen by `HK-1`.
- `release-historian` skill and `/release [version]` command, owners of
  `CHANGELOG.md`, of release notes, of deprecations and of migration guides.
- Error code `BASE-UNRESOLVED`: `changelog` without `--base`, with a base that
  does not resolve, or in a shallow clone.
- `living-docs init` declares in `documents:` every document it installs, with an
  owner, an owning skill and — for the agent contract and the Definition of Done —
  the `role` that `CI-7` uses to find them. A repository that moves up a stage
  receives only the entries that are missing; without an anchor in the file, the
  command says what is missing instead of rewriting.
- The TDR template carries the machine payment trigger (`pay-when`) as a
  commented example.
- `CI-4` (staleness), `CI-7` (ownership coverage) and `CI-8` (links) now run in
  `living-docs validate`. `CI-4` is the only one that produces a warning: a
  warning is reported and does not change the exit code.
- `living-docs validate --base <ref>` turns on the half of `CI-7` that reads the
  branch diff: a watched path changed without the owning doc fails, and the
  written way out is `Docs: none — <reason>` in a commit message of the range.
- `bin/dev`: an optional entry point that runs any maintenance command inside the
  repository's container, bringing it up and installing the dependencies when
  needed — `bin/dev npm test`, `bin/dev node src/cli/index.ts validate`, or
  `bin/dev` alone for a shell. It requires the Docker daemon; the path of record
  remains the host's Node, and the hooks never enter the container.

- `audience` in `documents:` and in `artifacts:` of `docs/.ownership.yml`:
  declares who reads the document. It accepts `internal` and `external`; when
  absent, `internal` holds, and no `.ownership.yml` already written changes
  meaning.
- `CI-11` (`living-docs validate`): a document or artifact declared
  `audience: external` cannot cite an artifact ID — in prose, between backticks or
  in the path of a link. The frontmatter and fenced code blocks are left out, and
  the identifiers of the public interface (`CI-n`, `HK-n`, `SK-n`, `CM-n`,
  `EXIT-n`) remain citable. There is no exception label: the fix is to rewrite in
  running text.
- `living-docs init --stage production` now declares `CHANGELOG.md`,
  `docs/deprecations.md`, `docs/migrations/` and the release notes with
  `audience: external`. In a repository that already declares those entries
  without the mark, `init` does not rewrite the line: it warns, among what it did
  not install, that marking it is what turns `CI-11` on for it.

### Changed

- The repository is now `esliph/agent-plugins`, a marketplace that will also host
  plugins beyond documentation. Add it with
  `/plugin marketplace add esliph/agent-plugins`; the old `esliph/living-docs`
  address still redirects. Each plugin now has its own README under `packages/`.
- Renaming of the identifiers of checks and hooks: the number gives way to the
  name, and the prefix says whose rule it is. The complete map:

  | Old                          | New                                      |
  | ---------------------------- | ---------------------------------------- |
  | `CI-1`                       | `living-docs/frontmatter`                |
  | `CI-2`                       | `living-docs/id-integrity`               |
  | `CI-3`                       | `living-docs/citation-coverage`          |
  | `CI-4`                       | `living-docs/staleness`                  |
  | `CI-5`                       | `ownership/generated-drift`              |
  | `CI-6`                       | `ownership/consumer-change-logged`       |
  | `CI-7` (agent contract)      | `living-docs/agent-contract-duplication` |
  | `CI-7` (Definition of Done)  | `living-docs/done-verifiable`            |
  | `CI-7` (open decision)       | `living-docs/open-decision-claim`        |
  | `CI-8`                       | `living-docs/links`                      |
  | `CI-9`                       | `living-docs/commit-discipline`          |
  | `CI-10`                      | `living-docs/trigger-routing`            |
  | `CI-11`                      | `living-docs/external-audience`          |
  | `HK-1`                       | `living-docs/append-only`                |
  | `HK-2`                       | `ownership/generated-guard`              |
  | `HK-3`                       | `living-docs/state-promotion`            |
  | `HK-4`                       | `ownership/watch-reminder`               |
  | `HK-5`                       | `ownership/commit-guard`                 |
  | `HK-6`                       | `living-docs/session-inventory`          |
  | `HK-7`                       | `living-docs/shortcut-debt`              |
  | `HK-8`                       | `living-docs/open-decision-guard`        |

  Whoever cites one of these identifiers in their own Definition of Done needs to
  swap it for the new name — the number is no longer recognized as a verification.
- The checks and hooks of `living-docs` are now identified by name
  (`living-docs/frontmatter`, …) instead of by number; the complete map is in the
  renaming entry of this version. The old `CI-7` becomes three checks:
  `living-docs/agent-contract-duplication`, `living-docs/done-verifiable` and
  `living-docs/open-decision-claim`.
- The `living-docs` plugin now depends on the `ownership` plugin, and stops
  registering the hooks for generated artifact, watched-path reminder and commit
  guard — they live in `ownership`.
- The installed workflow runs `ownership validate` and `living-docs validate`, and,
  on a PR, both with `--base`.
- `living-docs init --marketplace` enables both plugins.
- The invocation of the CLI in the checkout is now
  `node --conditions=development packages/living-docs/src/cli/index.ts`, because
  the toolkit now depends on the ownership core through the source code.
- Installed through the marketplace, the `living-docs` plugin does not install its
  dependencies until the core is published on npm; the hooks fail open and do not
  answer.
- The v1 schema error of `ownership` says the file needs to be rewritten as v2.
- A plugin block that is not a map is now a load error.
- The toolkit now lives in `packages/living-docs/`, and that directory is at the
  same time the package and the Claude Code plugin. Whoever invokes the CLI from a
  clone now calls it through `node packages/living-docs/src/cli/index.ts`, always
  from the root of the checkout. The plugin now carries, in its own directory, the
  code and the dependencies the hooks run. Files already seeded by `init` do not
  change, because the command of the installed workflow comes from `--invoke`.
- The toolkit now runs on the host's Node: the plugin's hooks invoke `node`
  directly, and this repository's CI workflow installs Node and npm instead of
  building an image. Whoever clones needs Node 24 or greater and an `npm ci`
  before the first command; in exchange, the hooks stop going quiet when the
  container is not up. `compose.yaml`, `Dockerfile` and `./bin/living-docs`
  remain in the repository, now as the optional execution path described above.
- The package name is now `@esliph/living-docs` and the repository's Docker
  container is now called `esliph-living-docs` (it was `living-docs-toolkit` in
  both). Whoever brings the environment up with `docker compose` or invokes
  `./bin/living-docs` without `LIVING_DOCS_CONTAINER` defined now talks to the
  container by the new name; the `living-docs` command itself does not change.
- `CI-7` gains a sixth class of finding: with `--base <ref>`, a diff that touches
  a path claimed by an open decision fails. The way out remains
  `Docs: none — <reason>`.
- `living-docs validate` now requires that every document under the documentation
  root have an entry in `docs/.ownership.yml` and a line in CODEOWNERS (`CI-7`). A
  repository installed by an earlier version needs to run `living-docs init` again,
  or declare the documents by hand, to keep passing.
- `living-docs validate` now requires that every `open` debt declare a verifiable
  payment trigger — `pay-when` with `pattern` and `paths` (`CI-4`). A repository
  installed by an earlier version has to declare the `pay-when` of the debts that
  are already open, or reclassify them, to keep passing.
- `living-docs validate` now requires that every link between documents resolve —
  relative or wikilink — and that there be no binary attachment under the
  documentation root (`CI-8`).
  A repository installed by an earlier version needs to fix its broken links and
  take the binaries out of `docs/` to keep passing.
- `living-docs validate` now points to `living-docs changelog` when the repository
  declares `consumer-visible-paths` — a pointer, not a finding: the exit code does
  not change.
- The "not installed" list of `--stage production` is now empty: the stage now
  covers Phases 5 and 6 of the spec in full.
- The repository's workflow now runs `CI-6` on a pull request, and
  `actions/checkout` now requires `fetch-depth: 0` — a shallow clone does not
  contain the diff base.
- The `CODEOWNERS` written by `init` now covers `docs/ids-retired.txt`.
- `docs/contracts/checks.gen.md` now lists eight checks, ordered by ID.
- `bin/living-docs` no longer requires the container to be up already and no
  longer exits with code 2 when it is not: it now delegates to `bin/dev`, which
  brings the container up before running. What is invoked did not change; what
  happens with a stopped environment did.

- The `release-historian` skill and the migration guide template no longer ask
  the guide to point to the decision by its ID: the guide says, in running text,
  why the break was decided, and the commit that creates it cites the decision. The
  agent contract seeded by `init` gains the same policy.

- The seeds `living-docs init` writes and the comments of the installed
  `docs/.ownership.yml` and workflow no longer cite internal decisions of the
  toolkit or carry filling-in instructions; what helped to read the document became
  prose, and the guidance for whoever writes moved to the skills. The messages of
  the checks, of the hooks and of the CLI and the text of the skills no longer cite
  internal rules of the toolkit. A repository already installed keeps the old text.
- The ownership file now lives at the root (`.ownership.yml`) and is read in the v2
  schema: an `owned` list, with the `living-docs:` block in each living-documentation
  entry and at the top for global configuration. The v1 schema is not read, and
  there is no migration command — rewrite the file following
  `templates/ownership.yml`.
- `living-docs init` seeds v2 at the root, and does not write a new file when one
  already exists.
- `living-docs validate` no longer verifies the owner of each document, CODEOWNERS,
  the `watches` link, the frontmatter `owner` and the `status` outside the declared
  states — all of that belongs to `ownership validate`.
- Every message of the CLI, the hooks and the checks, and every seed written by
  `living-docs init`, is now in English. The content of your documents stays in
  whatever language you write it in: no check reads headings or prose, and the
  toolkit has no language setting.
- `living-docs/done-verifiable` accepts only the fixed marker `human` for a
  Definition of Done item verified by a person.
- The seeded open-decisions table uses the canonical column names
  (`Resolved-by`, `Blocks`, `Gap`), so a new ownership file needs no
  `field-map`. A table without a canonical column now says so and points to
  `field-map`. An existing open-decisions table whose columns are named in
  another language must keep or declare its `field-map`, including `blocks`:
  the `Blocks` column is optional, so a missing one is not reported and the
  paths it lists stop being guarded.

### Removed

- `living-docs drift` and `living-docs changelog`: generated-artifact drift and
  the CHANGELOG entry are now verified by `ownership validate` (`--base <ref>` for
  the diff).
- `consumer-visible-paths`: the `consumer-visible: true` mark on the `watches`
  rules is the list.
- `living-docs/frontmatter` no longer rejects a `trigger` worded as a calendar
  cadence; it only requires `trigger` to be present and non-empty.
- `living-docs/trigger-routing` no longer compares the words of a `trigger`
  with the owning skill's description; it only warns when the owning skill
  does not exist.
- Table cells reading `nenhum` or `nenhuma` are no longer treated as empty;
  use `—`, `-` or `n/a`.

### Fixed

- `bin/dev` works again through Git Bash on Windows: the shell was rewriting the
  container's working directory as a host path, and `docker exec` failed without
  running the command. Inside the container, `git` now accepts the mounted
  checkout — before, everything that queried it (tests included) failed with
  "dubious ownership". The image needs to be rebuilt once
  (`docker compose up -d --build`).
- The templates that `living-docs init` seeds again carry the placeholders
  `{{ID}}`, `{{TITLE}}` and `{{TODAY}}` in the form `init` substitutes. A code
  formatter had rewritten them as `{ { ID } }` — YAML reads them as a map, and the
  freshly installed repository was born with an invalid `last-reviewed`, failing
  its own `CI-1` on the first run. `templates/` and the generated contract now stay
  out of the formatter.
- `living-docs --help` now lists `multi-team` among the stages of `--stage`; the
  CLI already accepted it.
- `living-docs init` now recognizes `docs/decisoes-em-aberto.md` among the paths it
  adopts for the `DA` family when they already exist.
- `living-docs init` in a repository that already has `AGENTS.md` now writes the
  CODEOWNERS line of the adopted contract, and not that of a `CLAUDE.md` that does
  not exist there. Before, the freshly installed repository failed its own `CI-7`
  on the first run: the contract was left without anyone to review it.
- `CI-7` no longer flags a Definition of Done item with no verification when the
  item is an **example of the format** inside a fenced code block. Documentation
  that teaches its own format does not fail for teaching it.
- The `CI-7` messages about a broken `watches` link now point to the rule that
  actually governs the code→doc link: a watched path and its owning document travel
  in the same commit.
- `living-docs validate` and the session-start inventory (`HK-6`) now scan the
  repository tree once per run, and not once per question. A large repository with
  many `open` debts felt this at the hook's 5-second ceiling.
- `living-docs init` in a repository that moves up a stage now appends to the
  existing `CODEOWNERS` the lines of the new stage. Before, it left it frozen in
  the form of the previous stage, and the freshly installed documents were born
  with nobody to review them — which `CI-7` now fails. A line that is already there
  is not rewritten.
