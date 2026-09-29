# Execution on the host's Node — specification

The toolkit runs today inside a container: `bin/living-docs` and
`plugin/hooks/run-hook.sh` are `docker exec` bridges, CI runs six steps through
`docker compose run`, and `RNF-0002` forbids `node`, `npm` and `npx` outside the
container. This spec describes the migration to the **host's** Node and npm, and
the final state in which no living document mentions Docker.

It does not repeat what the owning artifacts say. The current rule is in
`docs/requirements/`, the decision in `docs/decisions/adr/`, the way of working in
`CONTRIBUTING.md` and the done criterion in `docs/definition-of-done.md`.

**Mandatory input for whoever plans:**
`docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` (§7, the
hook's 5 s ceiling; §9, the CI budget), `ADR-0001` (the decision this migration
supersedes) and `ADR-0003` (the two roots, which **remain in force**).

---

## 1. What the requester decided

Three choices were made before this spec and are not reopened here:

| #     | Choice                                                              | Accepted consequence                                                                                                                                                       |
| ----- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E-1` | `compose.yaml`, `Dockerfile` and `bin/living-docs` stay **intact**  | `bin/living-docs` keeps requiring Docker while no document, test or CI step invokes it — it becomes an orphan wrapper (`M-11`)                                             |
| `E-2` | Removing Docker covers only the **living documents**                | Old ADRs, `docs/superpowers/plans/`, `research/` and the `CHANGELOG` keep their mentions: they narrate the past, and the trail is what the toolkit exists to protect      |
| `E-3` | `RNF-0002` is **rewritten in place**, keeping the ID                | An old commit that cites `RNF-0002` now points to a rule with the opposite meaning. It is a real loss, chosen in exchange for zero mentions of Docker in the requirements document |

`E-3` is the only one of the three that goes against the repository's own habit —
the `RNF` vocabulary has `revoked`, and `CI-3` rule 3 exists precisely so that a
revoked rule points to whoever replaced it. It is recorded here because the
alternative (revoking `RNF-0002` and creating `RNF-0006`) was considered and
discarded, and whoever reads the diff a year from now deserves to know there was
a choice.

---

## 2. The eleven changes

| ID     | Change                                                                                 | File                                                                                        |
| ------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `M-1`  | The hook wrapper calls `node` directly, deriving the toolkit root from its own path    | `plugin/hooks/run-hook.sh`                                                                  |
| `M-2`  | CI swaps `docker compose` for `actions/setup-node` and `npm ci`                        | `.github/workflows/living-docs.yml`                                                         |
| `M-3`  | `ADR-0015` is born and supersedes `ADR-0001`                                           | `docs/decisions/adr/`                                                                       |
| `M-4`  | `RNF-0002` now states execution on the host                                            | `docs/requirements/non-functional.md`                                                       |
| `M-5`  | Principle 6 is amended; the Constitution goes to `version: 2`                          | `docs/charter/constitution.md`                                                              |
| `M-6`  | The generator command stops being an absolute container path                           | `docs/.ownership.yml`                                                                       |
| `M-7`  | The prose becomes host-first                                                           | `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `docs/definition-of-done.md`, `.gitattributes` |
| `M-8`  | The tests that assert the container now assert the host                                | `test/core/roots.test.ts`, `test/plugin/manifest.test.ts`                                   |
| `M-9`  | The fixtures and messages that cite Docker are replaced                                | `test/checks/ci7-ownership-coverage.test.ts`, `test/cli/init-enforcement.test.ts`           |
| `M-10` | The `## [Unreleased]` entry records the visible change                                 | `CHANGELOG.md`                                                                              |
| `M-11` | The orphan wrapper becomes debt with an observable trigger                             | `docs/decisions/debt/`                                                                      |

### `M-1` — the hook wrapper

The wrapper's contract does not change: 5 s ceiling, empty output and `exit 0` on
any error (`RNF-0001`, spec §7). What changes is who executes. The toolkit root
comes from the script's own path — `plugin/hooks/run-hook.sh` is two levels below
it —, and the root of the validated repository comes from `CLAUDE_PROJECT_DIR`.
The two remain distinct, which is what `ADR-0003` demands.

`timeout 5`, `exit 0` and the absence of `set -e` are verified by
`test/plugin/manifest.test.ts` and cannot be lost in the rewrite: they are what
keeps a broken hook from stalling the work.

### `M-2` — CI

The four CLI steps now invoke `node src/cli/index.ts` with the working
directory at the checkout root. `fetch-depth: 0` stays: `CI-6` compares
`<base>...HEAD` and a shallow clone does not have the base (`ADR-0006`). The
condition `if: github.event_name == 'pull_request'` on the steps that read the
diff stays for the reason recorded in `ADR-0010`.

### `M-3` — the decision

`ADR-0015`, `status: draft` — promoting is a human act, and `HK-3` intercepts.
It declares `supersedes: ADR-0001` and `relates-to: [RNF-0002, RNF-0003]`.
`ADR-0001` receives `status: superseded` and `superseded-by: ADR-0015`: both are
mutable fields declared in `docs/.ownership.yml`, so `HK-1` allows it and the
body stays intact. `CI-3` closes the pair from both sides.

The ADR must say what is **gained** — local enforcement stops vanishing when the
container is stopped, which was the loss declared in `ADR-0001` — and what is
**lost**: the host now needs Node ≥ 24, and a machine with an older Node can no
longer run the toolkit without installing anything.

The non-Docker half of `ADR-0001` **survives**: TypeScript with no build step,
executed by native type-stripping, with `tsc --noEmit` as the type-checker. The
new ADR must say this explicitly, otherwise the supersession looks like it also
revokes what was not revoked.

### `M-4` — the rule

`RNF-0002` keeps the ID and changes its statement. The new text declares Node ≥ 24
and npm as the only toolchain required, and names `git` as out of scope — the
`out of scope` of the current text already exempted `git`, and that has not
changed.

`CI-3` rule 7 requires that an `active` requirement be cited by at least one test
in `test/**`. The citation exists today in `test/plugin/manifest.test.ts` and must
keep existing after `M-8`.

### `M-5` — the principle

Principle 6 of the Constitution states what is no longer true. The amendment is a
deliberate act (the document's `trigger` says so), so: new text, `version: 2`,
and a line in the amendment log dated 2026-09-01. `test/docs/language-and-intent.test.ts`
requires that every principle contain "verified by" — the rewritten principle
must name what verifies it, not just assert it.

### `M-6` — the generator command

`generated[].command` points today to `/opt/living-docs/src/tools/gen-checks.ts`.
`runCommand` executes with `cwd` at the root of the validated repository, so a
relative path resolves. The generator's output does not contain the command, so
`CI-5` does not flag drift — but `node src/cli/index.ts drift` must be run to
prove this, not presumed.

### `M-7` — the prose

`CLAUDE.md` has two verified constraints: at most 60 lines
(`test/docs/agent-contract.test.ts`) — today it is 52 — and no literal copy of a
requirement's title. The policy bullet must state the rule without repeating the
statement of `RNF-0002`; `CI-7` also rejects a sentence duplicated between the
agent contract and the owning artifact, with the threshold from `ADR-0009`.

`docs/definition-of-done.md`: the second-to-last item says the five commands "pass
in the container". `test/docs/agent-contract.test.ts` requires that every item in
the list name the verification (`CI-\d`, `HK-\d` or human) — the rewrite preserves
that.

`docs/.ownership.yml`: the `reason` of the `bin/living-docs` watch describes the
wrapper as "the host→container bridge". It now describes it without asserting the
mechanism.

### `M-8` and `M-9` — the tests

Three tests assert the container and must change what they assert, not vanish:

- `test/core/roots.test.ts`, "the container declares the two roots": reads
  `LIVING_DOCS_TOOLKIT_ROOT` and `LIVING_DOCS_REPO_ROOT` from the environment,
  which only existed because `compose.yaml` injected them. It now asserts what
  remains true and is the heart of `ADR-0003`: `toolkitRoot()` derives from
  `import.meta.dirname`, `repoRoot()` falls back to the working directory, and
  moving one does not move the other.
- `test/core/roots.test.ts`, "no absolute container path in `src/` or
  `test/`": **stays**. It is still `ADR-0003`'s guard against an embedded path.
- `test/plugin/manifest.test.ts`, the wrapper test: now requires `node` and
  forbids `docker`, keeping the three fail-open assertions.
- `test/plugin/manifest.test.ts`, the CRLF test: **stays**. `run-hook.sh` runs
  in bash and a CR in the shebang still breaks the interpreter; only the comment
  that attributes the reason to `ADR-0001` changes.

`test/checks/ci7-ownership-coverage.test.ts` uses the phrase "Nothing runs on the
host except Docker." as a fixture of a short phrase that is **not** a duplicate
(`ADR-0009`). The phrase is arbitrary: it is swapped for another short one, and
the assertion does not change meaning.

`test/cli/init-enforcement.test.ts` asserts that the installed workflow does not
mention Docker. The assertion remains correct and gains value: now not even this
repository's workflow mentions it. Only the error message, which attributes the
rule to `RNF-0002`, needs to be rewritten.

### `M-10` — the CHANGELOG

`.github/workflows/**` and `plugin/**` are in `consumer-visible-paths`, and `CI-6`
rejects a diff that touches them without an entry in `## [Unreleased]`. It goes in
`### Changed`, written for whoever **consumes** the toolkit — the file's test is
the one declared in its own header.

### `M-11` — the debt

`E-1` leaves `bin/living-docs` as a `docker exec` bridge with no document,
test or CI step that invokes it. This is a conscious shortcut, and the
repository's policy says a conscious shortcut becomes a `TDR` with an
**observable** payment trigger — `CI-4` rejects a `pay-when` that nobody can
verify.

Proposed trigger: when someone invokes `bin/living-docs` and it fails because the
container is absent. The `TDR` is born `open`.

---

## 3. What this migration does **not** do

- **It does not touch `src/`.** `toolkitRoot()` and `repoRoot()` are already
  independent of the container. `ADR-0003` comes out intact, with no supersession.
- **It does not delete `Dockerfile`, `compose.yaml`, `.dockerignore` or `bin/living-docs`.**
  `.dockerignore` was not on the `E-1` list, but it serves the `Dockerfile` that
  stayed: deleting it would break the build that remained.
- **It does not rewrite historical record.** `docs/superpowers/plans/`, `research/`,
  the previous ADRs and the old `CHANGELOG` entries stay as they are
  (`E-2`).
- **It does not revoke the non-Docker half of `ADR-0001`** — TypeScript with no
  build step remains the decision in force, now carried by `ADR-0015`.
- **It does not publish a package or an image.** How the toolkit reaches a
  consumer's CI remains `DA-0003`, open.

---

## 4. Step zero: the dependencies do not exist on the host

`compose.yaml` mounts `node_modules` as a **named volume**, and that is why
`node_modules/` in the checkout is empty. Measured on 2026-09-01: `node
src/cli/index.ts validate` on the host exits with
`ERR_MODULE_NOT_FOUND: Cannot find package 'yaml'`.

`npm ci` on the host is therefore a prerequisite of **every** verification in this
spec — not an environment detail. Whoever plans must put it before the first step
that executes anything, and whoever executes cannot conclude that a change failed
before having run it.

`.gitignore` already ignores `node_modules/`; nothing to change there.

---

## 5. How to prove it is done

The five commands run on the host — after the `npm ci` from §4 —, and it is their
execution, not reading the diff, that closes the migration:

```
npm test
npm run typecheck
node src/cli/index.ts validate --base origin/master
node src/cli/index.ts drift
node src/cli/index.ts changelog --base origin/master
```

Besides them, two proofs that no check makes on its own:

1. **No living document mentions Docker.** A sweep for `docker` and
   `container` in `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`,
   `docs/definition-of-done.md`, `docs/.ownership.yml`,
   `docs/requirements/`, `docs/charter/` and `.gitattributes`. The occurrences of
   "container" in `src/` that name the _container file of a collection_ are
   another word and stay.
2. **A hook really runs.** `M-1` rewrites the path that no test
   executes end to end — `test/hooks/` exercises the decisions by payload,
   not the wrapper. The proof is a session in which `HK-4` or `HK-6` really
   responds, with Docker stopped.
